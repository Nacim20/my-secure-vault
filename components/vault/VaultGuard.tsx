'use client';

import { useState } from 'react';
import { Lock, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { MIN_MASTER_KEY_LENGTH } from '@/components/providers/VaultProvider';

interface VaultGuardProps {
  onUnlock: (key: string) => Promise<boolean>;
  onSetup: (key: string) => Promise<boolean>;
  /** Vrai quand le compte n'a pas encore de clé maître : on la crée au lieu de la saisir. */
  requiresSetup: boolean;
}

export default function VaultGuard({ onUnlock, onSetup, requiresSetup }: VaultGuardProps) {
  const [key, setKey] = useState('');
  const [confirmKey, setConfirmKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    if (requiresSetup) {
      if (key.length < MIN_MASTER_KEY_LENGTH) {
        toast.error(`La clé maître doit faire au moins ${MIN_MASTER_KEY_LENGTH} caractères`);
        return;
      }
      if (key !== confirmKey) {
        toast.error('Les deux clés ne correspondent pas');
        return;
      }
    }

    setIsLoading(true);
    setIsError(false);

    try {
      // Création de la clé maître (premier accès) ou déverrouillage
      const success = requiresSetup ? await onSetup(key) : await onUnlock(key);
      
      if (!success) {
        setIsError(true);
        toast.error("Clé Maître incorrecte", {
          description: "Vérifiez votre saisie et réessayez."
        });
        // Petite vibration visuelle en cas d'erreur
        const input = document.getElementById('master-key-input');
        input?.classList.add('animate-shake');
        setTimeout(() => input?.classList.remove('animate-shake'), 500);
      } else {
        toast.success(requiresSetup ? "Clé maître créée" : "Coffre déverrouillé");
      }
    } catch {
      setIsError(true);
      toast.error("Erreur technique lors du déverrouillage");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white p-4 relative overflow-hidden">
      
      {/* Fond d'ambiance subtil */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gray-900 mb-6 border-2 ${isError ? 'border-red-500/50 text-red-500' : 'border-gray-800 text-blue-500'} shadow-2xl transition-all duration-300`}>
            {isLoading ? (
              <Loader2 size={40} className="animate-spin" />
            ) : (
              <Lock size={40} />
            )}
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            {requiresSetup ? 'Créez votre clé maître' : 'Coffre Verrouillé'}
          </h1>
          <p className="text-gray-400 text-lg">
            {requiresSetup
              ? `Au moins ${MIN_MASTER_KEY_LENGTH} caractères. Elle ne peut pas être récupérée : si vous la perdez, vos données sont perdues.`
              : 'Entrez votre Clé pour accéder à vos données sécurisées.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500 ${isError ? 'from-red-500 to-orange-500 opacity-50' : ''}`}></div>
            <input
              id="master-key-input"
              type="password"
              autoComplete={requiresSetup ? "new-password" : "off"}
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                if (isError) setIsError(false);
              }}
              className={`relative w-full bg-gray-900 border-2 ${isError ? 'border-red-500/50 text-red-100 placeholder-red-300/30' : 'border-gray-800 focus:border-blue-500/50 text-white placeholder-gray-600'} rounded-xl px-6 py-4 text-xl outline-none transition-all duration-200`}
              placeholder="••••••••••••••••"
              autoFocus
            />
          </div>

          {requiresSetup && (
            <input
              type="password"
              value={confirmKey}
              onChange={(e) => setConfirmKey(e.target.value)}
              className="w-full bg-gray-900 border-2 border-gray-800 focus:border-blue-500/50 text-white placeholder-gray-600 rounded-xl px-6 py-4 text-xl outline-none transition-all duration-200"
              placeholder="Confirmez la clé"
              aria-label="Confirmez la clé maître"
            />
          )}

          <button
            type="submit"
            disabled={isLoading || !key || (requiresSetup && !confirmKey)}
            className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] shadow-lg shadow-blue-900/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>Vérification...</span>
              </>
            ) : (
              <>
                <span>{requiresSetup ? 'Créer mon coffre' : 'Déverrouiller le coffre'}</span>
                <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-12 flex items-center justify-center gap-2 text-sm text-gray-500">
          <ShieldCheck size={16} className="text-green-500" />
          <p>Chiffrement côté client • Votre clé reste sur cet appareil</p>
        </div>
      </div>
    </div>
  );
}