import { z } from 'zod';
import { OBJECT_IDS, type ObjectId } from '../generator/assets.js';

/**
 * Pelajaran (Belajar) sebelum latihan, menempel di kategori katalog (D-068): 3–6 layar pendek, semua
 * dibacakan, tanpa nilai. Jenis layar tetap (rencana Studio Soal 2A) — tampilan & animasinya dibuat sekali
 * di web, konten cukup mengisi data.
 */
export const LESSON_SCREENS = [
  'kenalan',
  'bunyi',
  'kata',
  'gabung',
  'cerita',
  'coba',
  'ingat',
] as const;
export type LessonScreenKind = (typeof LESSON_SCREENS)[number];

const objectId = z.enum(OBJECT_IDS as [ObjectId, ...ObjectId[]]);
const digit = z.number().int().min(0).max(10);
/** Suku kata dipisah tanda hubung: "sa-tu", "de-la-pan". */
const syllables = z
  .string()
  .regex(/^[a-z]+(-[a-z]+)*$/, 'suku kata huruf kecil dipisah "-", mis. "sa-tu"');

export const lessonCardSchema = z.strictObject({
  angka: digit,
  kata: z.string().trim().min(2).max(20),
  sukuKata: syllables,
  gambar: objectId,
});
export type LessonCard = z.infer<typeof lessonCardSchema>;

export const lessonScreenSchema = z
  .strictObject({
    jenis: z.enum(LESSON_SCREENS),
    /** Teks di layar (≤ 120 huruf). */
    teks: z.string().trim().min(2).max(120),
    /** Kalimat yang dibacakan Momo. */
    suara: z.string().trim().min(2).max(400),
    gambar: z.array(objectId).max(6).optional(),
    /** Angka yang tampil besar (kenalan, coba, ingat). */
    angka: z.array(digit).min(1).max(11).optional(),
    huruf: z.string().trim().min(1).max(3).optional(),
    /** Untuk layar `kata` dengan satu kata. */
    sukuKata: syllables.optional(),
    /** Untuk layar `kata`: kartu angka-kata-gambar (1–5 kartu). */
    kartu: z.array(lessonCardSchema).min(1).max(5).optional(),
    /** Untuk layar `coba`: `tebal` = tebalkan angka (tidak dinilai); `hitung` = ketuk benda satu per satu. */
    mode: z.enum(['tebal', 'hitung']).optional(),
  })
  .superRefine((s, ctx) => {
    const need = (ok: boolean, message: string) => {
      if (!ok) ctx.addIssue({ code: 'custom', message: `${s.jenis}: ${message}` });
    };
    if (s.jenis === 'kata') need(!!s.sukuKata || !!s.kartu, 'butuh sukuKata atau kartu');
    if (s.jenis === 'coba') {
      need(!!s.mode, 'butuh mode (tebal/hitung)');
      need(!!s.angka, 'butuh angka');
      if (s.mode === 'hitung') {
        need(!!s.gambar?.length, 'mode hitung butuh gambar');
        need(!s.angka?.includes(0), 'mode hitung tidak bisa angka 0');
      }
    }
    if (s.jenis === 'kenalan') need(!!s.angka || !!s.huruf, 'butuh angka atau huruf');
  });
export type LessonScreen = z.infer<typeof lessonScreenSchema>;

export const lessonSchema = z
  .strictObject({
    /** Kode unit Menu Belajar, mis. "P-MA-01" (docs/blueprint/menu-belajar.csv). */
    kode: z.string().regex(/^[PK1]-[A-Z]{2}-\d{2}$/),
    version: z.number().int().positive(),
    judul: z.string().trim().min(3).max(60),
    layar: z.array(lessonScreenSchema).min(3).max(6),
  })
  .superRefine((l, ctx) => {
    if (l.layar.at(-1)?.jenis !== 'ingat')
      ctx.addIssue({ code: 'custom', path: ['layar'], message: 'layar terakhir harus "ingat"' });
  });
export type Lesson = z.infer<typeof lessonSchema>;
