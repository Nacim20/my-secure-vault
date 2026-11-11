import CryptoJS from 'crypto-js';
import { describe, expect, it } from 'vitest';
import { legacyDecrypt, verifyLegacyPassphrase } from '../lib/crypto';

// Reproduit exactement l'ancien format (v1) pour vérifier que la migration saura le relire.
const oldEncrypt = (text: string, key: string) => CryptoJS.AES.encrypt(text, key).toString();

describe('compatibilité avec l’ancien format (v1)', () => {
  it('relit un ancien mot de passe chiffré', async () => {
    const old = oldEncrypt('ancien-mot-de-passe', 'ancienne-cle');
    expect(await legacyDecrypt(old, 'ancienne-cle')).toBe('ancien-mot-de-passe');
  });

  it('retourne null avec une mauvaise clé', async () => {
    const old = oldEncrypt('ancien-mot-de-passe', 'ancienne-cle');
    expect(await legacyDecrypt(old, 'autre-cle')).toBeNull();
  });

  it('vérifie l’ancien verifier', async () => {
    const verifier = oldEncrypt('CORRECT-MASTER-KEY-VERIFIED', 'ancienne-cle');
    expect(await verifyLegacyPassphrase('ancienne-cle', verifier)).toBe(true);
    expect(await verifyLegacyPassphrase('mauvaise', verifier)).toBe(false);
  });
});
