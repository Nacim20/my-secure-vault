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

  const loadProfileAndKey = async (userId: string) => {
    try {
      // On récupère le profil
      const { data, error } = await supabase
        .from('profiles')
        .select('key_verifier')
        .eq('id', userId)
        .single();

      // LOGIQUE CORRIGÉE ICI :
      // Cas 1 : Pas de profil ou Erreur -> Setup requis
      // Cas 2 : Profil existe mais key_verifier est NULL -> Setup requis
      if (error || !data || !data.key_verifier) {
        console.log("Compte vierge détecté : Configuration requise");
        setRequiresSetup(true);
        setVerifier(null);
      } 
      // Cas 3 : Tout est bon, on a un verifier
      else {
        setVerifier(data.key_verifier);
        setRequiresSetup(false);

        // Tentative de récupération depuis sessionStorage (Confort)
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
      console.error("Erreur critique chargement profil:", e);
      setRequiresSetup(true); // Par sécurité, si ça plante, on propose le setup
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Vérification session initiale
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadProfileAndKey(session.user.id);
      } else {
        setIsLoading(false);
      }
    };

    initAuth();

    // Écoute temps réel (utile pour le retour du lien magique)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Si on vient de se connecter ou de cliquer sur le lien magique
        await loadProfileAndKey(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setMasterKey(null);
        setVerifier(null);
        setRequiresSetup(false);
        sessionStorage.removeItem('vault_master_key');
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const unlock = async (key: string) => {
    if (!verifier) return false;
    const isValid = verifyMasterKey(key, verifier);
    if (isValid) {
      setMasterKey(key);
      sessionStorage.setItem('vault_master_key', key);
      return true;
    }
    return false;
  };

  const setup = async (key: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const newVerifier = generateVerifier(key);
    
    // On force l'update même si la ligne existe déjà
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, key_verifier: newVerifier });

    if (!error) {
      setVerifier(newVerifier);
      setMasterKey(key);
      sessionStorage.setItem('vault_master_key', key);
      setRequiresSetup(false);
      return true;
    } else {
      console.error("Erreur setup DB:", error);
    }
    return false;
  };

  const lock = () => {
    setMasterKey(null);
    sessionStorage.removeItem('vault_master_key');
    router.push('/dashboard'); 
  };

  return (
    <VaultContext.Provider value={{ 
      masterKey, 
      isLocked: !masterKey, 
      isLoading,
      requiresSetup,
      unlock, 
      setup, 
      lock 
    }}>
      {children}
    </VaultContext.Provider>
  );
}

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) throw new Error("useVault must be used within VaultProvider");
  return context;
};