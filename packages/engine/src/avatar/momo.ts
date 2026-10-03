import { z } from 'zod';

/**
 * Tampilan Momo (D-051): warna utama (`momoColor`, 6 warna lama) + gradasi ke warna kedua + aksesori.
 * Ini tampilan robot Momo — bukan data pribadi anak. Semua pilihan tersedia untuk semua anak, tanpa label
 * laki-laki/perempuan (tidak ada data gender atau agama yang disimpan, PRD A17).
 */

/** Palet warna gradasi dan aksesori: hex kontras cukup dengan garis gelap #2b2540. */
export const MOMO_TONES = {
  merah: '#ef6f6c',
  oranye: '#f79a4a',
  kuning: '#f7c948',
  hijau: '#46b97a',
  toska: '#2bb5a8',
  biru: '#4f8ff7',
  ungu: '#8a6cf0',
  merahmuda: '#f58fc0',
  cokelat: '#a8714a',
  abu: '#9aa3b5',
  hitam: '#3b3550',
  putih: '#fdfaf3',
} as const;
export type MomoTone = keyof typeof MOMO_TONES;
export const MOMO_TONE_IDS = Object.keys(MOMO_TONES) as [MomoTone, ...MomoTone[]];

export const MOMO_ACCESSORIES = [
  'none',
  'rambut-poni',
  'rambut-kuncir',
  'rambut-keriting',
  'topi',
  'peci',
  'jilbab',
  'pita',
] as const;
export type MomoAccessory = (typeof MOMO_ACCESSORIES)[number];

export const momoLookSchema = z.strictObject({
  /** Warna kedua gradasi badan; kosong = warna polos. */
  gradient: z.enum(MOMO_TONE_IDS).nullable().optional(),
  accessory: z.enum(MOMO_ACCESSORIES).default('none'),
  /** Warna aksesori; kosong = warna bawaan aksesori. */
  accessoryColor: z.enum(MOMO_TONE_IDS).nullable().optional(),
});
export type MomoLook = z.infer<typeof momoLookSchema>;

/** Warna bawaan tiap aksesori. */
export const ACCESSORY_DEFAULT_TONE: Record<MomoAccessory, MomoTone> = {
  none: 'hitam',
  'rambut-poni': 'hitam',
  'rambut-kuncir': 'cokelat',
  'rambut-keriting': 'hitam',
  topi: 'biru',
  peci: 'hitam',
  jilbab: 'merahmuda',
  pita: 'merah',
};

/** Data lama/rusak → tampilan polos (tidak pernah melempar error saat membaca dari DB). */
export function parseMomoLook(v: unknown): MomoLook | null {
  if (v == null) return null;
  const r = momoLookSchema.safeParse(v);
  return r.success ? r.data : null;
}
