'use client';

import { useState } from 'react'; // On a retiré useEffect
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const supabase = createClientComponentClient();

  // J'AI SUPPRIMÉ LE BLOC "useEffect" ICI QUI CAUSAIT L'ERREUR ABORT
  // C'est le middleware qui gère la protection maintenant.

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // --- INSCRIPTION ---
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        
        if (error) throw error;

        toast.success('Inscription réussie !', {
          description: '📧 Vérifiez vos emails pour confirmer votre compte.',
          duration: 8000,
        });
        setLoading(false); // On arrête le chargement pour qu'il puisse voir le message

      } else {
        // --- CONNEXION ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast.success("Connexion réussie");
        
        // C'est ici qu'on redirige proprement
        router.refresh(); 
        router.push('/dashboard'); // Utilise push au lieu de replace pour éviter les conflits
      }
    } catch (err: any) {
      toast.error('Erreur', {
        description: err.message || "Une erreur est survenue.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl ring-1 ring-white/5 animate-in fade-in zoom-in duration-500">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            SecureVault
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            {isSignUp ? "Créer un compte sécurisé" : "Accéder à votre coffre"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">EMAIL</label>
            <input
              type="email"
              required
              placeholder="votre@email.com"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition placeholder:text-gray-700"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">MOT DE PASSE</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition placeholder:text-gray-700"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="animate-spin" size={20} />}
            {loading 
              ? 'Traitement en cours...' 
              : (isSignUp ? "S'inscrire" : "Se connecter")
            }
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center text-sm text-gray-400">
          {isSignUp ? "Déjà un compte ? " : "Pas encore de compte ? "}
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors ml-1"
          >
            {isSignUp ? "Se connecter" : "Créer un compte"}
          </button>
        </div>
      </div>
    </div>
  );
}