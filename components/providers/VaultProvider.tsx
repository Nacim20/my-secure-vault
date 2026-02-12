'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
// On n'importe plus rien de complexe pour le test

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
  // On met des valeurs par défaut qui disent "TOUT EST OK"
  const [masterKey, setMasterKey] = useState<string | null>("CLE_DE_TEST");
  const [isLoading, setIsLoading] = useState(true); // On commence true...

  useEffect(() => {
    // ...et on passe à false après 1 petite seconde, sans aucune vérification
    const timer = setTimeout(() => {
      console.log("🔓 MODE DÉBUG : Vault déverrouillé automatiquement");
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Des fausses fonctions qui répondent toujours "OUI"
  const unlock = async (key: string) => {
    console.log("Unlock simulé");
    setMasterKey(key);
    return true;
  };

  const setup = async (key: string) => {
    console.log("Setup simulé");
    setMasterKey(key);
    return true;
  };

  const lock = () => {
    console.log("Lock simulé");
    setMasterKey(null);
  };

  return (
    <VaultContext.Provider value={{ 
      masterKey, // On envoie une fausse clé
      isLocked: false, // On dit que ce n'est jamais verrouillé
      isLoading, 
      requiresSetup: false, // On dit que tout est déjà configuré
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