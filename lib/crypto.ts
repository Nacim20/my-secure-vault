import CryptoJS from 'crypto-js';

// Cette phrase sert de témoin. Si on arrive à la déchiffrer, la clé est bonne.
const VERIFIER_PHRASE = "CORRECT-MASTER-KEY-VERIFIED";

/**
 * Chiffre une chaîne de caractères
 */
export const encrypt = (text: string, key: string): string => {
  if (!text || !key) throw new Error("Missing text or key for encryption");
  return CryptoJS.AES.encrypt(text, key).toString();
};

/**
 * Déchiffre une chaîne. Retourne null si la clé est mauvaise ou le texte corrompu.
 */
export const decrypt = (cipherText: string, key: string): string | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    
    // CryptoJS retourne une chaine vide si le déchiffrement échoue parfois
    if (!originalText) return null;
    return originalText;
  } catch (error) {
    return null;
  }
};

/**
 * Génère le token de vérification lors de la création du compte
 */
export const generateVerifier = (masterKey: string): string => {
  return encrypt(VERIFIER_PHRASE, masterKey);
};

/**
 * Vérifie si la clé entrée par l'utilisateur est la bonne
 */
export const verifyMasterKey = (inputKey: string, storedVerifier: string): boolean => {
  const decrypted = decrypt(storedVerifier, inputKey);
  return decrypted === VERIFIER_PHRASE;
};