import { describe, expect, it } from 'vitest';
import {
  createVerifier,
  decrypt,
  deriveKey,
  encrypt,
  isV2Item,
  isV2Verifier,
  unlockWithVerifier,
} from '../lib/crypto';

// Peu d'itérations en test pour que la suite reste rapide (la valeur de production est 600 000).
const TEST_ITERATIONS = 1_000;

describe('chiffrement des éléments', () => {
  it('chiffre puis déchiffre un mot de passe', async () => {
    const { key } = await createVerifier('une-cle-maitre-solide', TEST_ITERATIONS);
    const payload = await encrypt('MonMotDePasse!123', key);
    expect(isV2Item(payload)).toBe(true);
    expect(payload).not.toContain('MonMotDePasse');
    expect(await decrypt(payload, key)).toBe('MonMotDePasse!123');
  });

  it('produit un résultat différent à chaque chiffrement (IV aléatoire)', async () => {
    const { key } = await createVerifier('une-cle-maitre-solide', TEST_ITERATIONS);
    expect(await encrypt('identique', key)).not.toBe(await encrypt('identique', key));
  });

  it('gère les caractères Unicode', async () => {
    const { key } = await createVerifier('une-cle-maitre-solide', TEST_ITERATIONS);
    const secret = 'mot🔐de-passé-日本語';
    expect(await decrypt(await encrypt(secret, key), key)).toBe(secret);
  });

  it('retourne null avec une mauvaise clé', async () => {
    const a = await createVerifier('cle-numero-un-ok', TEST_ITERATIONS);
    const b = await createVerifier('cle-numero-deux-ok', TEST_ITERATIONS);
    expect(await decrypt(await encrypt('secret', a.key), b.key)).toBeNull();
  });

  it('détecte une donnée modifiée (AES-GCM authentifié)', async () => {
    const { key } = await createVerifier('une-cle-maitre-solide', TEST_ITERATIONS);
    const [prefix, iv, cipher] = (await encrypt('secret', key)).split('.');
    const bytes = atob(cipher);
    const flipped = String.fromCharCode(bytes.charCodeAt(0) ^ 1) + bytes.slice(1);
    expect(await decrypt(`${prefix}.${iv}.${btoa(flipped)}`, key)).toBeNull();
  });

  it('refuse les formats invalides sans lever d’erreur', async () => {
    const { key } = await createVerifier('une-cle-maitre-solide', TEST_ITERATIONS);
    expect(await decrypt('n-importe-quoi', key)).toBeNull();
    expect(await decrypt('v2.', key)).toBeNull();
    expect(await decrypt('v2.%%%.%%%', key)).toBeNull();
  });

  it('refuse de chiffrer un texte vide', async () => {
    const { key } = await createVerifier('une-cle-maitre-solide', TEST_ITERATIONS);
    await expect(encrypt('', key)).rejects.toThrow();
  });
});

describe('verifier (vérification de la clé maître)', () => {
  it('accepte la bonne clé et retourne une clé utilisable', async () => {
    const { verifier, key } = await createVerifier('ma-cle-maitre-longue', TEST_ITERATIONS);
    expect(isV2Verifier(verifier)).toBe(true);
    const unlocked = await unlockWithVerifier('ma-cle-maitre-longue', verifier);
    expect(unlocked).not.toBeNull();
    // La clé retrouvée déchiffre ce qui a été chiffré avec la clé d'origine.
    expect(await decrypt(await encrypt('test', key), unlocked!)).toBe('test');
  });

  it('refuse une mauvaise clé', async () => {
    const { verifier } = await createVerifier('ma-cle-maitre-longue', TEST_ITERATIONS);
    expect(await unlockWithVerifier('mauvaise-cle-maitre', verifier)).toBeNull();
  });

  it('utilise un sel différent à chaque création', async () => {
    const a = await createVerifier('meme-cle-maitre-ok', TEST_ITERATIONS);
    const b = await createVerifier('meme-cle-maitre-ok', TEST_ITERATIONS);
    expect(a.verifier.split('.')[2]).not.toBe(b.verifier.split('.')[2]);
  });

  it('rejette un verifier invalide ou un nombre d’itérations aberrant', async () => {
    expect(await unlockWithVerifier('x', 'v1-ancien-format')).toBeNull();
    expect(await unlockWithVerifier('x', 'v2k.abc.AAAA.AAAA.AAAA')).toBeNull();
    expect(await unlockWithVerifier('x', 'v2k.999999999999.AAAA.AAAA.AAAA')).toBeNull();
  });
});

describe('dérivation de clé', () => {
  it('la clé dérivée n’est pas extractible', async () => {
    const key = await deriveKey('une-cle', new Uint8Array(16), TEST_ITERATIONS);
    expect(key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow();
  });
});
