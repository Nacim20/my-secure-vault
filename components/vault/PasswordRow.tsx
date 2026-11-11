'use client';
import { useState } from 'react';
import type { DecryptedVaultItem } from '@/types';
import { decrypt } from '@/lib/crypto';
import { copySecret } from '@/lib/clipboard';
import { Eye, EyeOff, Copy, Trash2, Shield, Globe, KeyRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Props {
  item: DecryptedVaultItem;
  vaultKey: CryptoKey;
  onDelete: (id: string) => void;
}

export default function PasswordRow({ item, vaultKey, onDelete }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Le mot de passe n'est déchiffré qu'au moment où on en a besoin (affichage ou copie).
  const [plainPassword, setPlainPassword] = useState<string | null>(null);

  const getPlainPassword = async (): Promise<string | null> => {
    if (plainPassword) return plainPassword;
    const plain = await decrypt(item.encrypted_password, vaultKey);
    if (plain) setPlainPassword(plain);
    return plain;
  };

  const handleToggleVisible = async () => {
    if (isVisible) {
      setIsVisible(false);
      setPlainPassword(null); // on ne garde pas le clair en mémoire une fois masqué
      return;
    }
    if (await getPlainPassword()) setIsVisible(true);
    else toast.error("Impossible de déchiffrer cet élément");
  };

  const handleCopy = async () => {
    const plain = await getPlainPassword();
    if (!plain) {
      toast.error("Impossible de déchiffrer cet élément");
      return;
    }
    await copySecret(plain);
    if (!isVisible) setPlainPassword(null);
    setIsCopied(true);
    toast.success("Mot de passe copié", { description: "Le presse-papiers sera vidé dans 30 secondes." });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDelete = async () => {
    // Petit toast de confirmation stylé
    toast('Voulez-vous supprimer ce mot de passe ?', {
      action: {
        label: 'Supprimer',
        onClick: async () => {
          await supabase.from('vault_items').delete().eq('id', item.id);
          onDelete(item.id);
          toast.error("Mot de passe supprimé");
        },
      },
    });
  };

  return (
    <div className="group relative bg-gray-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 hover:bg-gray-800/60 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:border-blue-500/30">
      
      {/* Décoration : Petit point lumineux sur le côté */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"></div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Partie Gauche : Icone + Info */}
        <div className="flex items-center gap-4 w-full md:w-auto overflow-hidden">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform duration-300 shrink-0">
             {/* On change l'icône selon le contenu */}
             {item.website_url ? <Globe size={22} /> : <KeyRound size={22} />}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-lg truncate group-hover:text-blue-200 transition-colors">
              {item.title}
            </h3>
            <p className="text-sm text-gray-400 truncate flex items-center gap-1">
              <span className="opacity-50">User:</span> {item.username}
            </p>
          </div>
        </div>

        {/* Partie Droite : Actions & MDP */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3 bg-black/20 p-2 rounded-xl border border-white/5 md:bg-transparent md:border-0 md:p-0">
          
          <div className="font-mono text-sm px-3 py-1.5 rounded-lg bg-black/40 text-gray-300 min-w-[120px] text-center select-all">
            {isVisible && plainPassword ? plainPassword : '••••••••••••'}
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={handleToggleVisible}
              className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition"
            >
              {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            <button 
              onClick={handleCopy}
              className={`p-2 hover:bg-white/10 rounded-lg transition ${isCopied ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}
            >
              {isCopied ? <Shield size={18} /> : <Copy size={18} />}
            </button>

            <button 
              onClick={handleDelete}
              className="p-2 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 transition"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}