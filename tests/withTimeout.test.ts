import { describe, expect, it } from 'vitest';
import { withTimeout } from '../lib/withTimeout';

describe('withTimeout', () => {
  it('retourne la valeur si la promesse se termine à temps', async () => {
    expect(await withTimeout(Promise.resolve(42), 100)).toBe(42);
  });

  it('rejette si la promesse ne se termine jamais', async () => {
    await expect(withTimeout(new Promise(() => {}), 20, 'trop long')).rejects.toThrow('trop long');
  });

  it('propage l’erreur d’origine', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 100)).rejects.toThrow('boom');
  });
});
