const CLEAR_AFTER_MS = 30_000;
let clearTimer: ReturnType<typeof setTimeout> | undefined;

/** Copie un secret dans le presse-papiers et le vide automatiquement après 30 secondes. */
export async function copySecret(text: string, clearAfterMs: number = CLEAR_AFTER_MS): Promise<void> {
  await navigator.clipboard.writeText(text);
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    navigator.clipboard.writeText('').catch(() => {
      /* le navigateur peut refuser si la page n'est plus active : rien à faire */
    });
  }, clearAfterMs);
}
