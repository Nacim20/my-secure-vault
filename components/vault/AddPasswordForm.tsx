'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { encrypt } from '@/lib/crypto';
import { Plus, X } from 'lucide-react';

interface Props {
  vaultKey: CryptoKey;
  onSuccess: () => void; // Pour dire au parent de rafraîchir la liste
}

export default function AddPasswordForm({ vaultKey, onSuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', username: '', password: '', website: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      // 🔐 CHIFFREMENT ICI (Côté Client)
      const encrypted = await encrypt(formData.password, vaultKey);

      const { error } = await supabase.from('vault_items').insert({
        user_id: user.id,
        title: formData.title,
        username: formData.username,
        website_url: formData.website,
        encrypted_password: encrypted, // On envoie uniquement la version chiffrée
      });

      if (error) throw error;

      // Reset
      setFormData({ title: '', username: '', password: '', website: '' });
      setIsOpen(false);
      onSuccess(); // Rafraîchir la liste
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="group w-full py-6 rounded-2xl border border-gray-800 bg-gray-900/30 hover:bg-gray-800/80 hover:border-blue-500/50 transition-all duration-300 flex flex-col items-center justify-center gap-3 shadow-lg hover:shadow-blue-500/10"
      >
        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform">
          <Plus size={24} />
        </div>
        <span className="font-medium text-gray-400 group-hover:text-white transition-colors">
          Ajouter un nouveau mot de passe
        </span>
      </button>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Nouvelle entrée</h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            placeholder="Nom du site (ex: Netflix)" 
            required
            className="bg-gray-950 border border-gray-800 p-3 rounded text-white focus:border-blue-500 outline-none"
            value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
          />
          <input 
            placeholder="Site Web (Optionnel)" 
            className="bg-gray-950 border border-gray-800 p-3 rounded text-white focus:border-blue-500 outline-none"
            value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            placeholder="Identifiant / Email" 
            required
            className="bg-gray-950 border border-gray-800 p-3 rounded text-white focus:border-blue-500 outline-none"
            value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}
          />
          <input 
            type="password"
            placeholder="Mot de passe" 
            required
            className="bg-gray-950 border border-gray-800 p-3 rounded text-white focus:border-blue-500 outline-none"
            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition"
        >
          {loading ? 'Chiffrement & Sauvegarde...' : 'Ajouter au coffre sécurisé'}
        </button>
      </form>
    </div>
  );
}