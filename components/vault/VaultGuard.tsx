'use client';

import { useState } from 'react';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// On définit ici le "contrat" : ce composant attend une fonction onUnlock
interface VaultGuardProps {
  onUnlock: (key: string) => Promise<boolean>;
}

export default function VaultGuard({ onUnlock }: VaultGuardProps) {
  const [key, setKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setIsLoading(true);
    setIsError(false);

    try {
      // On appelle la fonction fournie par le parent (Dashboard)
      const success = await onUnlock(key);
      
      if (!success) {
        setIsError(true);
        toast.error("Clé Maître incorrecte");
        // Petite animation de vibration en CSS pourrait être ajoutée ici
      } else {
        toast.success("Coffre déverrouillé");
      }
    } catch (err) {
      setIsError(true);
      toast.error("Erreur lors du déverrouillage");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-900 mb-6 border-2 ${isError ? 'border-red-500 text-red-500' : 'border-blue-500 text-blue-500'} transition-colors duration-300`}>
            <Lock size={40} />
          </div>
          <h1 className="text-3xl font-bold mb-2">Coffre Verrouillé</h1>
          <p className="text-gray-400">Entrez votre Clé Maître pour déchiffrer vos données.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                if (isError) setIsError(false);
              }}
              className={`w-full bg-gray-900 border ${isError ? 'border-red-500 focus:border-red-500' : 'border-gray-800 focus:border-blue-500'} rounded-xl px-5 py-4 text-lg outline-none transition-all placeholder:text-gray-600`}
              placeholder="Votre Clé Maître..."
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !key}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>Vérification...</span>
              </>
            ) : (
              <>
                <span>Déverrouiller</span>
                <ArrowRight size={24} />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Cette clé ne quitte jamais votre navigateur.
          <br />Elle sert uniquement à déchiffrer vos données localement.
        </p>
      </div>
    </div>
  );
}