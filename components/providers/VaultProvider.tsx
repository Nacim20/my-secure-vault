'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { verifyMasterKey, generateVerifier } from '@/lib/crypto';
import { useRouter } from 'next/navigation';

interface VaultContextType {
  masterKey: string | null;
  isLocked: boolean;
  isLoading: boolean;
  requiresSetup: boolean;
  unlock: (key: string) => Promise<boolean>;
  setup: (key: string) => Promise<boolean>;
  lock: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [masterKey, setMasterKey] = useState<string | null>(null);
  const [requiresSetup, setRequiresSetup] = useState(false);
  const [verifier, setVerifier] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Nettoyage complet
  const resetState = () => {
    setMasterKey(null);
    setVerifier(null);
    setRequiresSetup(false);
    setIsLoading(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('vault_master_key');
      sessionStorage.removeItem('vault_verifier'); // On nettoie aussi le cache du verifier
    }
  };

  const loadProfile = async (userId: string) => {
    try {
      // 1. D'abord, on regarde si on a le verifier en cache (C'est ça qui répare le bug du refresh)
      const cachedVerifier = sessionStorage.getItem('vault_verifier');
      if (cachedVerifier) {
        console.log("⚡ Cache: Verifier restauré instantanément");
        setVerifier(cachedVerifier);
      }

      // 2. On lance quand même la requête pour être à jour, mais on n'attend pas forcément
      const { data, error } = await supabase
        .from('profiles')
        .select('key_verifier')
        .eq('id', userId)
        .single();

      if (error || !data || !data.key_verifier) {
        // Si vraiment on a rien trouvé nulle part
        if (!cachedVerifier) {
          setRequiresSetup(true);
          setVerifier(null);
        }
      } else {
        // Mise à jour du cache avec la version fraîche
        setVerifier(data.key_verifier);
        sessionStorage.setItem('vault_verifier', data.key_verifier); 
        setRequiresSetup(false);

        // Tentative de déverrouillage automatique (si la clé est aussi en cache)
        const savedKey = sessionStorage.getItem('vault_master_key');
        if (savedKey) {
            if (verifyMasterKey(savedKey, data.key_verifier)) {
                setMasterKey(savedKey);
            } else {
                sessionStorage.removeItem('vault_master_key');
            }
        }
      }
    } catch (e) {
      console.error("Erreur chargement:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Sécurité : Si dans 2s c'est pas chargé, on arrête le spinner
    const safetyTimer = setTimeout(() => {
      if (mounted) setIsLoading((l) => (l ? false : l));
    }, 2000);

    const init = async () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          resetState();
        }
      });
      return subscription;
    };

    const subPromise = init();
    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subPromise.then(sub => sub?.unsubscribe());
    };
  }, []);

  // 👇 LA FONCTION UNLOCK CORRIGÉE
  const unlock = async (key: string): Promise<boolean> => {
    // On cherche le verifier partout : dans l'état, ou dans le cache
    let currentVerifier = verifier || sessionStorage.getItem('vault_verifier');

    // Si toujours pas là, on tente un dernier appel désespéré à la DB
    if (!currentVerifier) {
        console.log("⚠️ Récupération d'urgence du verifier...");
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('key_verifier')
                .eq('id', user.id)
                .single();
            if (data?.key_verifier) {
                currentVerifier = data.key_verifier;
                setVerifier(data.key_verifier);
                sessionStorage.setItem('vault_verifier', data.key_verifier);
            }
        }
    }

    if (!currentVerifier) {
        console.error("❌ Echec: Impossible de vérifier la clé (Verifier manquant)");
        return false;
    }

    try {
      if (verifyMasterKey(key, currentVerifier)) {
        setMasterKey(key);
        sessionStorage.setItem('vault_master_key', key);
        return true;
      }
    } catch (e) { console.error(e); }
    
    return false;
  };

  const setup = async (key: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    try {
      const newVerifier = generateVerifier(key);
      const { error } = await supabase.from('profiles').upsert({ id: user.id, key_verifier: newVerifier });
      if (!error) {
        setVerifier(newVerifier);
        sessionStorage.setItem('vault_verifier', newVerifier); // On cache direct
        setMasterKey(key);
        sessionStorage.setItem('vault_master_key', key);
        setRequiresSetup(false);
        return true;
      }
    } catch (e) { console.error(e); }
    return false;
  };

  const lock = () => {
    setMasterKey(null);
    sessionStorage.removeItem('vault_master_key');
    // On garde le verifier en cache pour pouvoir déverrouiller vite !
    router.refresh();
  };

  return (
    <VaultContext.Provider value={{ masterKey, isLocked: !masterKey, isLoading, requiresSetup, unlock, setup, lock }}>
      {children}
    </VaultContext.Provider>
  );
}

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) throw new Error("useVault must be used within VaultProvider");
  return context;
};