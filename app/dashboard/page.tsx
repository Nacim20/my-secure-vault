'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useVault } from '@/components/providers/VaultProvider';
import { toast } from 'sonner';

// Composants
import VaultGuard from '@/components/vault/VaultGuard';
import PasswordRow from '@/components/vault/PasswordRow';
import AddPasswordForm from '@/components/vault/AddPasswordForm';

// Icones
import { ShieldCheck, Lock, LogOut, KeyRound, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const { lock, masterKey, isLocked, isLoading: isVaultLoading, unlock } = useVault();
  const router = useRouter();
  
  // Note: Dans ton ancien code tu utilisais 'vault_items', je l'ai remis.
  // Si tu as migré vers la table 'passwords' entre temps, change juste le nom ici.
  const [items, setItems] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('vault_items') // Remis comme sur ta capture
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setItems(data);
    } catch (error) {
      console.error('Erreur fetch:', error);
      // On ne met pas de toast erreur ici pour éviter le spam si c'est juste vide
    } finally {
      setLoadingData(false);
    }
  };

  // On charge les données uniquement si on a la masterKey
  useEffect(() => {
    if (masterKey) {
      fetchData();
    }
  }, [masterKey]);

  const handleLogout = async () => {
    lock(); // On verrouille le provider
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    // 1. Double confirmation pour éviter les accidents
    const confirm1 = confirm("⚠️ ATTENTION !\n\nVous êtes sur le point de supprimer définitivement votre compte et TOUS vos mots de passe.\n\nCette action est irréversible. Voulez-vous continuer ?");
    if (!confirm1) return;

    const confirm2 = confirm("Dernière chance : Êtes-vous vraiment sûr de vouloir tout effacer ?");
    if (!confirm2) return;

    const toastId = toast.loading("Suppression du compte en cours...");

    try {
      // Appel de la fonction SQL RPC (comme dans ton ancien code)
      const { error } = await supabase.rpc('delete_user_account');
      
      if (error) throw error;

      // Nettoyage complet
      toast.dismiss(toastId);
      toast.success("Compte supprimé avec succès. Au revoir !");
      
      lock(); // Vide la master key
      await supabase.auth.signOut(); // Déconnecte
      sessionStorage.clear(); // Vide le stockage
      router.push('/'); // Retour accueil

    } catch (error: any) {
      console.error(error);
      toast.error("Erreur lors de la suppression", { description: error.message });
    }
  };

  // Si le coffre charge ou est verrouillé, on affiche le Gardien
  if (isVaultLoading || isLocked) {
    return <VaultGuard onUnlock={unlock} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      
      {/* FOND D'AMBIANCE */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-600/10 rounded-full blur-[120px] opacity-60" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto p-6 md:p-10 pb-20"> {/* pb-20 pour l'espace en bas */}
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-white pb-2">
              Mon Coffre
            </h1>
            <div className="flex items-center gap-2 mt-1 text-green-400/90 bg-green-500/10 px-4 py-1.5 rounded-full w-fit text-sm font-medium border border-green-500/20 backdrop-blur-md">
              <ShieldCheck size={16} />
              <span>Coffre déchiffré & sécurisé</span>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={lock}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-gray-800/40 hover:bg-gray-700/60 border border-white/5 rounded-xl text-gray-300 hover:text-white transition backdrop-blur-sm shadow-lg"
            >
              <Lock size={18} />
              <span>Verrouiller</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center px-5 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 hover:text-red-300 transition backdrop-blur-sm shadow-lg"
              title="Se déconnecter"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* CONTENU PRINCIPAL */}
        <div className="flex flex-col gap-6 mb-20">
          {/* Formulaire d'ajout qui existait dans ton ancien code */}
          <AddPasswordForm masterKey={masterKey!} onSuccess={fetchData} />

          <div className="space-y-4">
            {loadingData ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500 animate-pulse">
                <ShieldCheck size={48} className="mb-4 opacity-20" />
                <p>Déchiffrement des données en cours...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-500 border border-dashed border-gray-800 rounded-3xl bg-gray-900/20 backdrop-blur-sm">
                <div className="bg-gray-800/50 p-6 rounded-full mb-4 border border-white/5">
                  <KeyRound size={40} className="opacity-50" />
                </div>
                <h3 className="text-xl font-medium text-gray-300 mb-2">C'est vide ici !</h3>
                <p className="max-w-md text-center text-sm opacity-60">
                  Votre coffre est sécurisé, mais il ne contient rien. Ajoutez votre premier mot de passe ci-dessus.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {items.map((item) => (
                  <PasswordRow 
                    key={item.id} 
                    item={item} 
                    masterKey={masterKey!} 
                    onDelete={(id) => setItems(prev => prev.filter(i => i.id !== id))} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ZONE DE DANGER */}
        <div className="border-t border-red-500/20 pt-10 mt-10">
          <h3 className="text-red-400 font-bold text-lg mb-4 flex items-center gap-2">
            <AlertTriangle size={20} /> Zone de danger
          </h3>
          <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-gray-300 font-medium">Supprimer mon compte</p>
              <p className="text-gray-500 text-sm mt-1">
                Une fois votre compte supprimé, toutes vos données seront effacées définitivement. 
                Il est impossible de revenir en arrière.
              </p>
            </div>
            <button 
              onClick={handleDeleteAccount}
              className="whitespace-nowrap px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-lg shadow-red-900/20"
            >
              Supprimer mon compte
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-10 text-center text-gray-600 text-xs py-4">
          <p>SecureVault • Chiffrement Zero-Knowledge • Vos clés ne quittent jamais cet appareil</p>
        </div>

      </div>
    </div>
  );
}