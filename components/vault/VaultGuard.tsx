'use client';

import { useState } from 'react';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VaultGuardProps {
  onUnlock: (key: string) => Promise<boolean>;
}

// ON MET "export default" ICI POUR ÊTRE STANDARD
export default function VaultGuard({ onUnlock }: VaultGuardProps) {
  const [key, setKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setIsLoading(true);
    try {
      const success = await onUnlock(key);
      if (!success) toast.error("Clé incorrecte");
    } catch (err) {
      toast.error("Erreur");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-900 mb-6 border-2 border-blue-500 text-blue-500">
          <Lock size={40} />
        </div>
        <h1 className="text-3xl font-bold mb-2">Coffre Verrouillé</h1>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 text-lg outline-none focus:border-blue-500 transition-all"
            placeholder="Votre Clé Maître..."
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !key}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <><span className="mr-2">Déverrouiller</span><ArrowRight size={20} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}