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

  // Fonction pour tout remettre à zéro proprement
  const resetState = () => {
    setMasterKey(null);
    setVerifier(null);
    setRequiresSetup(false);
    setIsLoading(false);
    if (typeof window !== 'undefined') sessionStorage.removeItem('vault_master_key');
  };

  const loadProfile = async (userId: string) => {
    try {
      console.log("VaultProvider: Chargement du profil...");
      const { data, error } = await supabase
        .from('profiles')
        .select('key_verifier')
        .eq('id', userId)
        .single();

      if (error || !data || !data.key_verifier) {
        console.log("VaultProvider: Profil non configuré.");
        setRequiresSetup(true);
        setVerifier(null);
      } else {
        console.log("VaultProvider: Profil chargé.");
        setVerifier(data.key_verifier);
        setRequiresSetup(false);

        // Tentative de restauration de session (pour survivre au F5)
        const savedKey = sessionStorage.getItem('vault_master_key');
        if (savedKey) {
          try {
            if (verifyMasterKey(savedKey, data.key_verifier)) {
              console.log("VaultProvider: Clé restaurée depuis la session.");
              setMasterKey(savedKey);
            } else {
              sessionStorage.removeItem('vault_master_key');
            }
          } catch (e) {
            sessionStorage.removeItem('vault_master_key');
          }
        }
      }
    } catch (e) {
      console.error("Erreur chargement:", e);
    } finally {
      // LE PLUS IMPORTANT : Quoi qu'il arrive, on arrête le chargement
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // SÉCURITÉ ANTI-BOUCLE : Si dans 3 secondes rien n'est chargé, on force l'affichage
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setIsLoading((currentLoading) => {
          if (currentLoading) {
            console.warn("⚠️ Sécurité: Chargement forcé après timeout");
            return false;
          }
          return currentLoading;
        });
      }
    }, 3000);

    const init = async () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        
        console.log(`VaultAuth: Event ${event}`);

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

  const unlock = async (key: string) => {
    if (!verifier) return false;
    try {
      if (verifyMasterKey(key, verifier)) {
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