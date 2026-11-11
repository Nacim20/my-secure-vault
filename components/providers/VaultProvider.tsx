'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  createVerifier,
  isV2Verifier,
  unlockWithVerifier,
  verifyLegacyPassphrase,
} from '@/lib/crypto';
import { migrateLegacyItems } from '@/lib/migrateLegacy';
import { withTimeout } from '@/lib/withTimeout';

export const MIN_MASTER_KEY_LENGTH = 12;

interface VaultContextType {
  /** Clé de chiffrement dérivée. Uniquement en mémoire : jamais écrite dans le navigateur. */
  vaultKey: CryptoKey | null;
  isLocked: boolean;
  isLoading: boolean;
  requiresSetup: boolean;
  unlock: (passphrase: string) => Promise<boolean>;
  setup: (passphrase: string) => Promise<boolean>;
  lock: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

// Le verifier n'est pas secret (c'est un texte chiffré) : on peut le mettre en cache
// pour éviter une requête à chaque déverrouillage. La clé maître, elle, n'est jamais stockée.
const VERIFIER_CACHE_KEY = 'vault_verifier';

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [requiresSetup, setRequiresSetup] = useState(false);
  const [verifier, setVerifier] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const resetState = useCallback(() => {
    setVaultKey(null);
    setVerifier(null);
    setRequiresSetup(false);
    setIsLoading(false);
    sessionStorage.removeItem(VERIFIER_CACHE_KEY);
    // Nettoyage d'une ancienne version qui stockait la clé maître : on s'assure qu'elle n'en reste rien.
    sessionStorage.removeItem('vault_master_key');
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      sessionStorage.removeItem('vault_master_key'); // ancienne version, voir resetState
      const cached = sessionStorage.getItem(VERIFIER_CACHE_KEY);
      if (cached) setVerifier(cached);

      const { data, error } = await supabase
        .from('profiles')
        .select('key_verifier')
        .eq('id', userId)
        .single();

      if (error || !data?.key_verifier) {
        if (!cached) {
          setRequiresSetup(true);
          setVerifier(null);
        }
      } else {
        setVerifier(data.key_verifier);
        sessionStorage.setItem(VERIFIER_CACHE_KEY, data.key_verifier);
        setRequiresSetup(false);
      }
    } catch (e) {
      console.error('Erreur de chargement du profil :', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Sécurité : si rien n'est chargé après 2 s, on arrête l'écran de chargement.
    const safetyTimer = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 2000);

    // IMPORTANT : ce callback ne doit ni être async ni attendre un appel Supabase.
    // Il s'exécute à l'intérieur d'un verrou de la bibliothèque d'authentification : attendre une
    // requête ici peut bloquer toutes les requêtes suivantes (chargement infini après un rechargement).
    // On déporte donc le travail avec setTimeout, comme le recommande la documentation Supabase.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
      setTimeout(() => {
        if (!mounted) return;
        if (session?.user) void loadProfile(session.user.id);
        else resetState();
      }, 0);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [loadProfile, resetState]);

  /** Retrouve le verifier : en mémoire, puis en cache, puis en base. */
  const getVerifier = async (): Promise<string | null> => {
    const known = verifier ?? sessionStorage.getItem(VERIFIER_CACHE_KEY);
    if (known) return known;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('key_verifier')
      .eq('id', user.id)
      .single();
    if (!data?.key_verifier) return null;
    setVerifier(data.key_verifier);
    sessionStorage.setItem(VERIFIER_CACHE_KEY, data.key_verifier);
    return data.key_verifier;
  };

  const saveVerifier = async (newVerifier: string, userId: string): Promise<boolean> => {
    const { error } = await supabase.from('profiles').upsert({ id: userId, key_verifier: newVerifier });
    if (error) return false;
    setVerifier(newVerifier);
    sessionStorage.setItem(VERIFIER_CACHE_KEY, newVerifier);
    setRequiresSetup(false);
    return true;
  };

  const unlock = async (passphrase: string): Promise<boolean> => {
    try {
      const currentVerifier = await getVerifier();
      if (!currentVerifier) return false;

      let key: CryptoKey | null = null;

      if (isV2Verifier(currentVerifier)) {
        key = await unlockWithVerifier(passphrase, currentVerifier);
      } else if (await verifyLegacyPassphrase(passphrase, currentVerifier)) {
        // Ancien compte : on passe au nouveau format. Le nouveau verifier est enregistré en premier,
        // puis les éléments sont convertis. Si ça s'interrompt, la suite se fait au prochain déverrouillage.
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return false;
        const created = await createVerifier(passphrase);
        if (!(await saveVerifier(created.verifier, user.id))) return false;
        key = created.key;
      }

      if (!key) return false;

      // Convertit les éventuels éléments encore dans l'ancien format (15 s maximum : si le réseau
      // est lent, la suite se fera au prochain déverrouillage plutôt que de bloquer l'écran).
      try {
        const { migrated, failed } = await withTimeout(
          migrateLegacyItems(passphrase, key),
          15_000,
          'Migration trop longue'
        );
        if (migrated > 0) toast.success(`${migrated} mot(s) de passe mis à jour vers le nouveau chiffrement`);
        if (failed > 0) toast.error(`${failed} élément(s) n'ont pas pu être convertis`);
      } catch (e) {
        console.error('Migration interrompue :', e);
      }

      setVaultKey(key);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const setup = async (passphrase: string): Promise<boolean> => {
    if (passphrase.length < MIN_MASTER_KEY_LENGTH) return false;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    try {
      const created = await createVerifier(passphrase);
      if (!(await saveVerifier(created.verifier, user.id))) return false;
      setVaultKey(created.key);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const lock = () => {
    setVaultKey(null);
    router.refresh();
  };

  return (
    <VaultContext.Provider
      value={{ vaultKey, isLocked: !vaultKey, isLoading, requiresSetup, unlock, setup, lock }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) throw new Error('useVault must be used within VaultProvider');
  return context;
};
