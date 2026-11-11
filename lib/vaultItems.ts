import { decrypt, encrypt } from '@/lib/crypto';
import type { DecryptedVaultItem, VaultItem } from '@/types';

/**
 * Le titre, l'identifiant et l'URL sont chiffrés comme le mot de passe : la base ne contient
 * que du texte chiffré. On réutilise les mêmes colonnes (pas de changement de schéma) :
 * un champ chiffré est reconnaissable à son format `v2.<iv>.<chiffré>`.
 */
const ENCRYPTED_FIELD = /^v2\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/;

export const isEncryptedField = (value: string | null | undefined): boolean =>
  !!value && ENCRYPTED_FIELD.test(value);

export interface PlainFields {
  title: string;
  username: string;
  website: string;
}

/** Chiffre les champs d'un élément (un champ vide reste vide). */
export async function encryptFields(fields: PlainFields, key: CryptoKey) {
  return {
    title: await encrypt(fields.title, key),
    username: await encrypt(fields.username, key),
    website_url: fields.website ? await encrypt(fields.website, key) : '',
  };
}

const UNREADABLE = '⚠ illisible';

/**
 * Déchiffre un élément de la base. Les anciens éléments dont les champs sont encore en clair
 * sont affichés tels quels et signalés par `needsUpgrade` pour être chiffrés ensuite.
 */
export async function decryptItem(row: VaultItem, key: CryptoKey): Promise<DecryptedVaultItem> {
  const readField = async (value: string | null | undefined): Promise<string> => {
    if (!value) return '';
    if (!isEncryptedField(value)) return value; // ancien élément, encore en clair
    return (await decrypt(value, key)) ?? UNREADABLE;
  };

  const needsUpgrade =
    !isEncryptedField(row.title) ||
    !isEncryptedField(row.username) ||
    (!!row.website_url && !isEncryptedField(row.website_url));

  return {
    id: row.id,
    encrypted_password: row.encrypted_password,
    category: row.category,
    created_at: row.created_at,
    title: await readField(row.title),
    username: await readField(row.username),
    website_url: await readField(row.website_url),
    needsUpgrade,
  };
}
