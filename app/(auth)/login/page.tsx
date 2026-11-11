'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Bascule entre Login et Inscription
  const router = useRouter();

  // 1. Redirection si déjà connecté
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/dashboard');
      }
    };
    checkSession();
  }, [router]);

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
            // C'est l'astuce pour rediriger l'utilisateur après le clic sur le lien email
            // window.location.origin détecte tout seul si c'est localhost ou vercel
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        
        if (error) throw error;

        // Message succès inscription
        toast.success('Compte créé avec succès !', {
          description: '📧 Un email de confirmation a été envoyé. Vérifiez votre boîte de réception (et vos spams) pour activer le compte.',
          duration: 8000, // On laisse le message longtemps pour qu'il soit lu
        });

      } else {
        // --- CONNEXION ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast.success("Connexion réussie");
        router.replace('/dashboard');
      }
    } catch (err) {
      // Gestion des erreurs (ex: email déjà pris, mot de passe faux)
      toast.error('Erreur', {
        description: err instanceof Error ? err.message : "Une erreur est survenue.",
      });
    } finally {
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
              autoComplete="email"
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
              autoComplete={isSignUp ? "new-password" : "current-password"}
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
              : (isSignUp ? "S'inscrire et recevoir le lien" : "Se connecter")
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