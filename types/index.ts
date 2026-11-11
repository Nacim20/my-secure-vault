export interface VaultItem {
  id: string;
  user_id: string;
  title: string;
  username: string;
  encrypted_password: string;
  website_url?: string;
  category: string;
  created_at: string;
}

/** Élément déchiffré, tel qu'il est affiché dans l'interface. */
export interface DecryptedVaultItem {
  id: string;
  title: string;
  username: string;
  website_url: string;
  category: string;
  created_at: string;
  /** Mot de passe, toujours chiffré : déchiffré seulement à l'affichage ou à la copie. */
  encrypted_password: string;
  /** Vrai si des champs étaient encore en clair dans la base (ancien format). */
  needsUpgrade: boolean;
}

export interface Profile {
  id: string;
  key_verifier: string;
}