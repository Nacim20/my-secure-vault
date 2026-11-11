/**
 * Chiffrement côté client (Web Crypto API, sans dépendance).
 *
 * - Dérivation de clé : PBKDF2-HMAC-SHA256, sel aléatoire, 600 000 itérations
 * - Chiffrement       : AES-256-GCM (authentifié), IV aléatoire de 96 bits par message
 * - La clé dérivée est un CryptoKey NON EXTRACTIBLE : le code JavaScript de la page
 *   ne peut pas la relire, seulement l'utiliser pour chiffrer/déchiffrer.
 *
 * Formats stockés (texte) :
 *   élément  : v2.<iv>.<chiffré+tag>                         (base64)
 *   verifier : v2k.<itérations>.<sel>.<iv>.<chiffré+tag>     (base64)
 *
 * Le verifier sert à vérifier la clé maître sans la stocker : on chiffre une phrase
 * connue, et on regarde si on sait la déchiffrer. Il contient aussi le sel de dérivation.
 */

export const KDF_ITERATIONS = 600_000;

const SALT_BYTES = 16;
const IV_BYTES = 12;
const VERIFIER_PHRASE = 'SECURE-VAULT-KEY-CHECK';
const ITEM_PREFIX = 'v2.';
const VERIFIER_PREFIX = 'v2k.';
// Garde-fou : on refuse un nombre d'itérations aberrant lu dans la base.
const MAX_ITERATIONS = 10_000_000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ---------- Utilitaires base64 ----------

const toB64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
};

const fromB64 = (b64: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const randomBytes = (length: number): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(new ArrayBuffer(length));
  crypto.getRandomValues(bytes);
  return bytes;
};

// ---------- Dérivation de clé ----------

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number = KDF_ITERATIONS
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // non extractible
    ['encrypt', 'decrypt']
  );
}

// ---------- Chiffrement d'un élément ----------

export async function encrypt(plainText: string, key: CryptoKey): Promise<string> {
  if (!plainText) throw new Error('Texte à chiffrer manquant');
  const iv = randomBytes(IV_BYTES);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainText)
  );
  return `${ITEM_PREFIX}${toB64(iv)}.${toB64(new Uint8Array(cipher))}`;
}

/** Retourne null si la clé est mauvaise, si les données ont été modifiées, ou si le format est invalide. */
export async function decrypt(payload: string, key: CryptoKey): Promise<string | null> {
  try {
    if (!isV2Item(payload)) return null;
    const [ivB64, cipherB64] = payload.slice(ITEM_PREFIX.length).split('.');
    if (!ivB64 || !cipherB64) return null;
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(ivB64) },
      key,
      fromB64(cipherB64)
    );
    return decoder.decode(plain);
  } catch {
    return null;
  }
}

export const isV2Item = (payload: string): boolean => payload.startsWith(ITEM_PREFIX);

// ---------- Verifier (vérification de la clé maître) ----------

export const isV2Verifier = (verifier: string): boolean => verifier.startsWith(VERIFIER_PREFIX);

/** Crée un nouveau verifier (avec un nouveau sel) et la clé dérivée correspondante. */
export async function createVerifier(
  passphrase: string,
  iterations: number = KDF_ITERATIONS
): Promise<{ verifier: string; key: CryptoKey }> {
  if (!passphrase) throw new Error('Clé maître manquante');
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(passphrase, salt, iterations);
  const sealed = await encrypt(VERIFIER_PHRASE, key); // "v2.<iv>.<chiffré>"
  const verifier = `${VERIFIER_PREFIX}${iterations}.${toB64(salt)}.${sealed.slice(ITEM_PREFIX.length)}`;
  return { verifier, key };
}

/** Retourne la clé dérivée si la clé maître est bonne, sinon null. */
export async function unlockWithVerifier(
  passphrase: string,
  verifier: string
): Promise<CryptoKey | null> {
  try {
    if (!isV2Verifier(verifier)) return null;
    const [iterStr, saltB64, ivB64, cipherB64] = verifier.slice(VERIFIER_PREFIX.length).split('.');
    const iterations = Number(iterStr);
    if (!Number.isInteger(iterations) || iterations < 1 || iterations > MAX_ITERATIONS) return null;
    if (!saltB64 || !ivB64 || !cipherB64) return null;

    const key = await deriveKey(passphrase, fromB64(saltB64), iterations);
    const phrase = await decrypt(`${ITEM_PREFIX}${ivB64}.${cipherB64}`, key);
    return phrase === VERIFIER_PHRASE ? key : null;
  } catch {
    return null;
  }
}

// ---------- Ancien format (v1, CryptoJS) : uniquement pour la migration ----------

const LEGACY_PHRASE = 'CORRECT-MASTER-KEY-VERIFIED';

/** Déchiffre un ancien élément v1. crypto-js n'est chargé qu'à la demande. */
export async function legacyDecrypt(cipherText: string, passphrase: string): Promise<string | null> {
  try {
    const { default: CryptoJS } = await import('crypto-js');
    const text = CryptoJS.AES.decrypt(cipherText, passphrase).toString(CryptoJS.enc.Utf8);
    return text || null;
  } catch {
    return null;
  }
}

export async function verifyLegacyPassphrase(passphrase: string, verifier: string): Promise<boolean> {
  return (await legacyDecrypt(verifier, passphrase)) === LEGACY_PHRASE;
}
