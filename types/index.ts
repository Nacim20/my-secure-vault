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

export interface Profile {
  id: string;
  key_verifier: string;
}