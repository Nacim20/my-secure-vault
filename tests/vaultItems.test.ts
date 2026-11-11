import { describe, expect, it } from 'vitest';
import { createVerifier, encrypt } from '../lib/crypto';
import { decryptItem, encryptFields, isEncryptedField } from '../lib/vaultItems';
import type { VaultItem } from '../types';

const ITER = 1_000;

const baseRow = (over: Partial<VaultItem>): VaultItem => ({
  id: '1',
  user_id: 'u',
  title: '',
  username: '',
  encrypted_password: 'v2.x.y',
  website_url: '',
  category: 'general',
  created_at: '2026-01-01',
  ...over,
});

describe('chiffrement des champs d’un élément', () => {
  it('chiffre le titre, l’identifiant et l’URL, puis les relit', async () => {
    const { key } = await createVerifier('cle-maitre-de-test', ITER);
    const enc = await encryptFields(
      { title: 'Netflix', username: 'moi@mail.fr', website: 'https://netflix.com' },
      key
    );
    expect(isEncryptedField(enc.title)).toBe(true);
    expect(enc.title).not.toContain('Netflix');
    expect(enc.username).not.toContain('moi@mail.fr');
    expect(enc.website_url).not.toContain('netflix.com');

    const item = await decryptItem(baseRow(enc), key);
    expect(item).toMatchObject({ title: 'Netflix', username: 'moi@mail.fr', website_url: 'https://netflix.com' });
    expect(item.needsUpgrade).toBe(false);
  });

  it('laisse une URL vide vide', async () => {
    const { key } = await createVerifier('cle-maitre-de-test', ITER);
    const enc = await encryptFields({ title: 'A', username: 'b', website: '' }, key);
    expect(enc.website_url).toBe('');
    const item = await decryptItem(baseRow(enc), key);
    expect(item.website_url).toBe('');
    expect(item.needsUpgrade).toBe(false);
  });

  it('affiche un ancien élément en clair et le signale à mettre à jour', async () => {
    const { key } = await createVerifier('cle-maitre-de-test', ITER);
    const item = await decryptItem(
      baseRow({ title: 'Ancien site', username: 'vieux@mail.fr', website_url: 'https://ancien.fr' }),
      key
    );
    expect(item.title).toBe('Ancien site');
    expect(item.needsUpgrade).toBe(true);
  });

  it('n’écrase pas un champ chiffré qu’on ne sait pas lire (mauvaise clé)', async () => {
    const a = await createVerifier('cle-numero-un-ok', ITER);
    const b = await createVerifier('cle-numero-deux-ok', ITER);
    const row = baseRow({ title: await encrypt('Secret', a.key), username: await encrypt('u', a.key) });
    const item = await decryptItem(row, b.key);
    expect(item.title).toContain('illisible');
    expect(item.needsUpgrade).toBe(false); // jamais re-chiffré : on ne remplace pas une donnée par un message d'erreur
  });
});
