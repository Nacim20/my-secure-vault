'use client';
import { useEffect, useState } from 'react';
import Link from "next/link";
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      // Vérifie s'il y a une session active dans le navigateur
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Déjà connecté ? Hop, direction le coffre !
        router.replace('/dashboard');
      } else {
        // Pas connecté ? On affiche la page d'accueil
        setIsChecking(false);
      }
    };
    
    checkSession();
  }, [router]);

  // Pendant qu'on vérifie, on affiche un écran de chargement vide ou une icône
  if (isChecking) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-white">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  // Si pas connecté, on affiche l'accueil normal
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-950 text-white text-center px-4">
      <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
        SecureVault
      </h1>
      <p className="text-xl text-gray-400 max-w-lg mb-8">
        Un gestionnaire de mots de passe à chiffrement côté client. 
        <br/>Vos données, votre clé, votre sécurité.
      </p>
      
      <div className="flex gap-4">
        <Link 
          href="/login" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold transition shadow-lg shadow-blue-900/20"
        >
          Se connecter / S&apos;inscrire
        </Link>
      </div>
    </div>
  );
}