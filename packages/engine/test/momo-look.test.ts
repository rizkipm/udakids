import { describe, expect, it } from 'vitest';
import {
  MOMO_ACCESSORIES,
  MOMO_TONES,
  childProfileSchema,
  momoLookSchema,
  momoStyleSchema,
  parseMomoLook,
} from '../src/index.js';

describe('tampilan Momo (D-051)', () => {
  it('gradasi & aksesori opsional; default polos tanpa aksesori', () => {
    expect(momoLookSchema.parse({})).toEqual({ accessory: 'none' });
    expect(
      momoLookSchema.parse({ gradient: 'toska', accessory: 'jilbab', accessoryColor: 'merahmuda' }),
    ).toMatchObject({ gradient: 'toska', accessory: 'jilbab' });
    expect(MOMO_ACCESSORIES).toEqual(
      expect.arrayContaining(['rambut-poni', 'topi', 'peci', 'jilbab', 'pita']),
    );
    expect(Object.keys(MOMO_TONES)).toHaveLength(12);
  });

  it('nilai asing ditolak; data rusak dari DB dibaca sebagai polos', () => {
    expect(momoLookSchema.safeParse({ accessory: 'mahkota-emas' }).success).toBe(false);
    expect(momoLookSchema.safeParse({ gradient: '#ff0000' }).success).toBe(false);
    expect(momoLookSchema.safeParse({ accessory: 'topi', nama: 'x' }).success).toBe(false);
    expect(parseMomoLook({ accessory: 'mahkota-emas' })).toBeNull();
    expect(parseMomoLook(null)).toBeNull();
    expect(parseMomoLook({ accessory: 'pita' })).toEqual({ accessory: 'pita' });
  });

  it('dipakai di profil anak & ubah Momo; warna utama tetap 6 warna lama', () => {
    expect(
      childProfileSchema.safeParse({
        nickname: 'Alya',
        momoColor: 'ungu',
        momoLook: { accessory: 'rambut-kuncir', gradient: 'merahmuda' },
        pin: ['kucing', 'apel', 'bola'],
      }).success,
    ).toBe(true);
    expect(momoStyleSchema.safeParse({ momoColor: 'merahmuda', momoLook: null }).success).toBe(
      false,
    );
    expect(momoStyleSchema.safeParse({ momoColor: 'biru', momoLook: null }).success).toBe(true);
  });
});
