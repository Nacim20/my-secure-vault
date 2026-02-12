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
      const { data, error } = await supabase
        .from('profiles')
        .select('key_verifier')
        .eq('id', userId)
        .single();

      if (error || !data || !data.key_verifier) {
        setRequiresSetup(true);
        setVerifier(null);
      } else {
        setVerifier(data.key_verifier);
        setRequiresSetup(false);
        
        // Tentative de restauration (optionnel)
        const savedKey = sessionStorage.getItem('vault_master_key');
        if (savedKey && verifyMasterKey(savedKey, data.key_verifier)) {
             setMasterKey(savedKey);
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

    // Sécurité anti-boucle
    const safetyTimer = setTimeout(() => {
      if (mounted) setIsLoading(false);
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

  // 👇 C'EST ICI QUE LA MAGIE OPÈRE (La correction) 👇
  const unlock = async (key: string) => {
    let currentVerifier = verifier;

    // 1. Si on n'a pas le "verificateur" en mémoire (bug du refresh), on va le chercher de force
    if (!currentVerifier) {
        console.log("⚠️ Verifier manquant, récupération d'urgence...");
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('key_verifier')
                .eq('id', user.id)
                .single();
            
            if (data?.key_verifier) {
                currentVerifier = data.key_verifier;
                setVerifier(data.key_verifier); // On met à jour l'état pour la prochaine fois
                console.log("✅ Verifier récupéré !");
            }
        }
    }

    // 2. Si après ça on n'a toujours rien, c'est que le compte n'est pas configuré
    if (!currentVerifier) {
        console.error("❌ Impossible de déverrouiller : Aucun verifier trouvé.");
        return false;
    }

    // 3. Vérification classique
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