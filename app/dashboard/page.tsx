'use client';

import { useEffect, useState } from 'react';
import { useVault } from '@/components/providers/VaultProvider';
// 👇 LA CORRECTION EST ICI (On a enlevé les accolades { } autour de VaultGuard)
import VaultGuard from '@/components/vault/VaultGuard'; 
import { supabase } from '@/lib/supabase';
import { decrypt } from '@/lib/crypto';
import { Plus, Search, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const { masterKey, isLocked, isLoading: isVaultLoading, unlock } = useVault();
  
  // États pour les données
  const [passwords, setPasswords] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [visiblePasswordId, setVisiblePasswordId] = useState<string | null>(null);

  // Ce code se lance dès que la masterKey est dispo (grâce au cache ou à la saisie)
  useEffect(() => {
    if (masterKey) {
      fetchPasswords();
    }
  }, [masterKey]);

  const fetchPasswords = async () => {
    if (!masterKey) return;
    
    setLoadingData(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('passwords')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const decryptedData = data.map((item) => {
        try {
          return {
            ...item,
            password: decrypt(item.encrypted_password, masterKey),
            username: decrypt(item.encrypted_username, masterKey),
            site: item.website || 'Site inconnu'
          };
        } catch (err) {
          console.error("Erreur déchiffrement:", item.id);
          return null;
        }
      }).filter(Boolean);

      setPasswords(decryptedData);
      
    } catch (error) {
      console.error('Erreur fetch:', error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoadingData(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié !');
  };

  if (isVaultLoading || isLocked) {
    return <VaultGuard onUnlock={unlock} />;
  }

  if (loadingData && passwords.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Mon Coffre
          </h1>
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            onClick={() => toast.info("Bientôt disponible")}
          >
            <Plus size={20} />
            <span className="hidden md:inline">Nouveau</span>
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid gap-4">
          {passwords.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-900/50 rounded-lg border border-gray-800">
              <p>Aucun mot de passe enregistré.</p>
            </div>
          ) : (
            passwords
              .filter(p => p.site.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((entry) => (
              <div key={entry.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between hover:border-gray-700 transition-colors">
                
                <div className="flex-1 min-w-0 mr-4">
                  <h3 className="font-semibold text-lg truncate">{entry.site}</h3>
                  <p className="text-gray-400 text-sm truncate">{entry.username}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-gray-800 rounded px-3 py-1.5 mr-2">
                    <span className="font-mono mr-2">
                      {visiblePasswordId === entry.id ? entry.password : '••••••••'}
                    </span>
                    <button 
                      onClick={() => setVisiblePasswordId(visiblePasswordId === entry.id ? null : entry.id)}
                      className="text-gray-400 hover:text-white"
                    >
                      {visiblePasswordId === entry.id ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <button 
                    onClick={() => copyToClipboard(entry.password)}
                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                  >
                    <Copy size={20} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}