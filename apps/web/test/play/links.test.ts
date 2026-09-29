import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { linkToken, sha256 } from '../../src/play/links';

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');

describe('SHA-256 cadangan untuk http di jaringan lokal (iPad)', () => {
  it('identik dengan SHA-256 standar untuk berbagai panjang (termasuk batas blok 55/56/64)', () => {
    for (const text of [
      '',
      'abc',
      'a'.repeat(55),
      'a'.repeat(56),
      'a'.repeat(64),
      'Kenali angka — Level 1 ✓'.repeat(9),
    ]) {
      const bytes = new TextEncoder().encode(text);
      expect(hex(sha256(bytes))).toBe(createHash('sha256').update(bytes).digest('hex'));
    }
  });

  it('token sama walau crypto.subtle tidak ada (konteks tidak aman)', async () => {
    const withSubtle = await linkToken('anak-1', 'level', 'math.prek.a1.x');
    const spy = vi.spyOn(globalThis.crypto, 'subtle', 'get').mockReturnValue(undefined as never);
    const without = await linkToken('anak-1', 'level', 'math.prek.a1.x');
    spy.mockRestore();
    expect(without).toBe(withSubtle);
    expect(without).toMatch(/^[A-Za-z0-9_-]{16}$/);
  });
});
