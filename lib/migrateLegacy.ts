import { supabase } from '@/lib/supabase';
import { encrypt, isV2Item, legacyDecrypt } from '@/lib/crypto';

export interface MigrationResult {
  migrated: number;
  failed: number;
}

/**
 * Convertit les éléments chiffrés avec l'ancien format (v1, CryptoJS) vers le format v2.
 *
 * Elle est appelée à chaque déverrouillage et ne touche que les éléments encore en v1 :
 * si elle est interrompue en cours de route, elle reprend simplement à la prochaine ouverture.
 * La clé maître en clair n'est utilisée que pendant cet appel, puis oubliée.
 */
export async function migrateLegacyItems(
  passphrase: string,
  key: CryptoKey
): Promise<MigrationResult> {
  const { data, error } = await supabase.from('vault_items').select('id, encrypted_password');
  if (error) throw error;

  const legacyItems = (data ?? []).filter((item) => !isV2Item(item.encrypted_password));
  let migrated = 0;
  let failed = 0;

  for (const item of legacyItems) {
    const plain = await legacyDecrypt(item.encrypted_password, passphrase);
    if (!plain) {
      failed++;
      continue;
    }
    const { error: updateError } = await supabase
      .from('vault_items')
      .update({ encrypted_password: await encrypt(plain, key) })
      .eq('id', item.id);
    if (updateError) failed++;
    else migrated++;
  }

  return { migrated, failed };
}
