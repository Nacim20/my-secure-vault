'use client';

import { useState, useEffect } from 'react'; // <--- N'oublie pas d'importer useEffect
import { useVault } from '@/components/providers/VaultProvider';

export default function VaultGuard({ children }: { children: React.ReactNode }) {
  const { isLocked, unlock, setup, requiresSetup, isLoading } = useVault();
  const [inputKey, setInputKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- NOUVEAU : Vide le champ quand le coffre se verrouille ---
  useEffect(() => {
    if (isLocked) {
      setInputKey('');
      setError('');
    }
  }, [isLocked]);
  // ------------------------------------------------------------

  // 1. Écran de chargement
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 2. Écran de configuration
  if (requiresSetup) {
    const handleSetup = async (e: React.FormEvent) => {
      e.preventDefault();
      if (inputKey.length < 6) {
        setError("La clé doit faire au moins 6 caractères.");
        return;
      }
      setLoading(true);
      const success = await setup(inputKey);
      setLoading(false);
      if (!success) setError("Erreur lors de la configuration.");
    };

    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 p-4">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <div className="mx-auto mb-6 bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center text-3xl">
            🆕
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Configuration du coffre</h2>
          <p className="text-gray-400 mb-6 text-sm">
            Créez votre **Master Key**. <br/><span className="text-red-400">Ne la perdez jamais.</span>
          </p>
          <form onSubmit={handleSetup} className="space-y-4">
            <input 
              type="password" 
              placeholder="Votre nouvelle Master Key" 
              className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:ring-2 ring-blue-500 outline-none"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              autoComplete="new-password" // <--- Empêche l'autofill agressif ici
              autoFocus
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition">
              {loading ? 'Création...' : 'Configurer le coffre'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Écran de verrouillage
  if (isLocked) {
    const handleUnlock = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      const success = await unlock(inputKey);
      if (!success) setError("Clé incorrecte.");
    };

    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 p-4">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <div className="mx-auto mb-6 bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center text-3xl">
            🔒
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Coffre Verrouillé</h2>
          <p className="text-gray-400 mb-6 text-sm">Entrez votre Master Key pour déchiffrer.</p>
          <form onSubmit={handleUnlock} className="space-y-4">
            <input 
              type="password" 
              placeholder="Master Key" 
              className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:ring-2 ring-blue-500 outline-none"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              autoComplete="off" // <--- Empêche le navigateur de pré-remplir
              autoFocus
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition">
              Déverrouiller
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}