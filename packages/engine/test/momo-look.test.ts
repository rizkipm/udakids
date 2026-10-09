import { describe, expect, it } from 'vitest';
import {
  MOMO_ACCESSORIES,
  MOMO_EXTRAS,
  MOMO_MODELS,
  MOMO_PATTERNS,
  MOMO_TONES,
  momoHex,
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
    // Kode hex kini boleh (D-102), tapi tetap harus 6 digit.
    expect(momoLookSchema.safeParse({ gradient: '#ff00' }).success).toBe(false);
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

  it('D-102: model, pola, pernak-pernik, dan warna sendiri (kode hex)', () => {
    expect(MOMO_MODELS).toHaveLength(8);
    expect(MOMO_PATTERNS).toContain('bintang');
    expect(MOMO_EXTRAS).toContain('kacamata');
    expect(MOMO_ACCESSORIES).toEqual(expect.arrayContaining(['mahkota', 'bunga']));
    // D-104: gaya rambut pendek/keren & pernak-pernik baru, semua untuk semua anak.
    expect(MOMO_ACCESSORIES).toEqual(
      expect.arrayContaining(['rambut-cepak', 'rambut-jabrik', 'rambut-mohawk', 'topi-terbalik']),
    );
    expect(MOMO_EXTRAS).toEqual(expect.arrayContaining(['dasi', 'medali']));
    expect(momoLookSchema.safeParse({ accessory: 'rambut-mohawk', extra: 'dasi' }).success).toBe(
      true,
    );
    const full = momoLookSchema.parse({
      model: 'kucing',
      body: '#13C2C2',
      gradient: '#ff8800',
      pattern: 'hati',
      accessory: 'mahkota',
      accessoryColor: 'kuning',
      extra: 'syal',
      extraColor: '#00AA55',
    });
    // Kode hex dinormalisasi ke huruf kecil.
    expect(full).toMatchObject({ body: '#13c2c2', extraColor: '#00aa55', model: 'kucing' });
    // Hanya "#" + 6 hex: tidak bisa menyusupkan CSS/URL ke SVG.
    for (const bad of ['#fff', 'red', '#12345g', 'url(#x)', '#1234567', '13c2c2'])
      expect(momoLookSchema.safeParse({ body: bad }).success).toBe(false);
    expect(momoLookSchema.safeParse({ gradient: 'url(javascript:x)' }).success).toBe(false);
    expect(momoLookSchema.safeParse({ model: 'naga' }).success).toBe(false);
    expect(momoHex('toska')).toBe(MOMO_TONES.toska);
    expect(momoHex('#13c2c2')).toBe('#13c2c2');
    expect(momoHex('bukan')).toBeUndefined();
    expect(momoHex(null)).toBeUndefined();
    // Data lama tetap terbaca.
    expect(parseMomoLook({ gradient: 'toska', accessory: 'jilbab' })).toMatchObject({
      gradient: 'toska',
    });
  });
});
