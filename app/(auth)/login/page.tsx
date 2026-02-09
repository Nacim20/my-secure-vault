'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

// On garde ça simple pour le debug : pas d'icônes, pas de toast complexes
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const supabase = createClientComponentClient();

  const handleAuth = async (e: React.FormEvent) => {
    // 1. On empêche le rechargement de la page
    e.preventDefault();
    
    // 2. On affiche dans la console que le clic a marché
    console.log("🟢 BOUTON CLIQUÉ ! Mode:", isSignUp ? "Inscription" : "Connexion");
    
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
        alert('✅ Inscription réussie ! Vérifiez vos emails.');

      } else {
        // --- CONNEXION ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        console.log("✅ Connexion réussie, redirection...");
        router.refresh();
        router.push('/dashboard'); 
      }
    } catch (err: any) {
      console.error("🔴 Erreur:", err);
      alert('❌ Erreur : ' + (err.message || "Problème inconnu"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl p-8">
        
        <h1 className="text-2xl font-bold text-white text-center mb-6">
          {isSignUp ? "Créer un compte" : "Connexion"}
        </h1>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-white text-sm">Email</label>
            <input
              type="email"
              required
              className="w-full p-3 rounded bg-black/50 text-white border border-gray-700"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="text-white text-sm">Mot de passe</label>
            <input
              type="password"
              required
              className="w-full p-3 rounded bg-black/50 text-white border border-gray-700"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            // J'ai retiré le "disabled" pour que tu puisses toujours cliquer
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition-colors"
          >
            {loading ? 'Chargement...' : (isSignUp ? "S'inscrire" : "Se connecter")}
          </button>
        </form>

        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-center text-blue-400 text-sm mt-4 hover:underline"
          type="button" // Important pour ne pas soumettre le formulaire
        >
          {isSignUp ? "J'ai déjà un compte" : "Créer un compte"}
        </button>
      </div>
    </div>
  );
}