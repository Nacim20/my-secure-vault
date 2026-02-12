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
  // On commence toujours en chargement pour éviter le "flash" de la page de login
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Fonction centrale de chargement
  const loadProfileAndKey = async (userId: string) => {
    try {
      // 1. Récupération du profil
      const { data, error } = await supabase
        .from('profiles')
        .select('key_verifier')
        .eq('id', userId)
        .single();

      if (error || !data || !data.key_verifier) {
        console.log("VaultProvider: Configuration requise (Pas de verifier trouvé)");
        setRequiresSetup(true);
        setVerifier(null);
        setMasterKey(null);
      } else {
        // 2. Profil trouvé
        setVerifier(data.key_verifier);
        setRequiresSetup(false);

        // 3. Tentative de restauration de la clé depuis la RAM du navigateur (SessionStorage)
        // Cela permet de survivre au rafraîchissement (F5)
        const savedKey = typeof window !== 'undefined' ? sessionStorage.getItem('vault_master_key') : null;
        
        if (savedKey) {
          try {
            const isValid = verifyMasterKey(savedKey, data.key_verifier);
            if (isValid) {
              console.log("VaultProvider: Clé restaurée depuis la session");
              setMasterKey(savedKey);
            } else {
              console.warn("VaultProvider: Clé en session invalide, nettoyage.");
              sessionStorage.removeItem('vault_master_key');
              setMasterKey(null);
            }
          } catch (err) {
            console.error("Erreur vérification clé stockée:", err);
            sessionStorage.removeItem('vault_master_key');
          }
        }
      }
    } catch (e) {
      console.error("Erreur critique chargement profil:", e);
    } finally {
      // C'est ICI qu'on dit à l'app "C'est bon, on sait qui tu es, on arrête de charger"
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      // On écoute les changements d'état (Login, Logout, Refresh)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          // Si l'utilisateur est connecté, on charge son coffre
          await loadProfileAndKey(session.user.id);
        } else {
          // Si pas d'utilisateur, on reset tout
          setMasterKey(null);
          setVerifier(null);
          setRequiresSetup(false);
          setIsLoading(false); // Important : arrêter le chargement même si on n'est pas connecté
        }
      });

      return subscription;
    };

    const subPromise = initialize();

    return () => {
      mounted = false;
      subPromise.then(sub => sub?.unsubscribe());
    };
  }, []);

  const unlock = async (key: string) => {
    if (!verifier) return false;
    try {
      const isValid = verifyMasterKey(key, verifier);
      if (isValid) {
        setMasterKey(key);
        sessionStorage.setItem('vault_master_key', key);
        return true;
      }
    } catch (e) {
      console.error("Erreur lors du déverrouillage:", e);
    }
    return false;
  };

  const setup = async (key: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    try {
      const newVerifier = generateVerifier(key);
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, key_verifier: newVerifier });

      if (!error) {
        setVerifier(newVerifier);
        setMasterKey(key);
        sessionStorage.setItem('vault_master_key', key);
        setRequiresSetup(false);
        return true;
      }
    } catch (e) {
      console.error("Erreur setup:", e);
    }
    return false;
  };

  const lock = () => {
    setMasterKey(null);
    sessionStorage.removeItem('vault_master_key');
    // On ne redirige pas forcément, on laisse le VaultGuard faire son travail d'affichage
    router.refresh(); 
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