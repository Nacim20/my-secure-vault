-- Schéma de référence de SecureVault (Supabase / PostgreSQL).
-- À comparer avec votre projet : les noms de colonnes correspondent à types/index.ts.

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  key_verifier text not null            -- verifier de la clé maître (texte chiffré, non secret)
);

create table if not exists public.vault_items (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  title              text not null,
  username           text not null,
  encrypted_password text not null,     -- format v2.<iv>.<chiffré>
  website_url        text,
  category           text default 'general',
  created_at         timestamptz not null default now()
);

-- Row Level Security : chaque utilisateur n'accède qu'à ses propres lignes.
alter table public.profiles   enable row level security;
alter table public.vault_items enable row level security;

create policy "profiles: lecture de son profil"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles: création de son profil"
  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: mise à jour de son profil"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "vault_items: lecture"
  on public.vault_items for select using (auth.uid() = user_id);
create policy "vault_items: ajout"
  on public.vault_items for insert with check (auth.uid() = user_id);
create policy "vault_items: modification"
  on public.vault_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vault_items: suppression"
  on public.vault_items for delete using (auth.uid() = user_id);

-- Suppression du compte appelée par l'application (supabase.rpc('delete_user_account')).
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();  -- supprime en cascade profil et éléments
end;
$$;
revoke all on function public.delete_user_account() from public, anon;
grant execute on function public.delete_user_account() to authenticated;
