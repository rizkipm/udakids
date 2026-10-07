import { z } from 'zod';
import { OBJECT_IDS, type ObjectId } from '../generator/assets.js';
import { LETTER_GLYPH_IDS } from '../generator/glyphs.js';

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

/** Satu huruf (a–z / A–Z). */
const letter = z.string().regex(/^[a-zA-Z]$/, 'satu huruf');

/** Kartu kata: dengan angka (P-MA-01) atau huruf depan (huruf vokal, D-075). */
export const lessonCardSchema = z
  .strictObject({
    angka: digit.optional(),
    huruf: letter.optional(),
    kata: z.string().trim().min(2).max(20),
    sukuKata: syllables,
    gambar: objectId,
  })
  .refine((c) => (c.angka === undefined) !== (c.huruf === undefined), {
    message: 'kartu butuh angka atau huruf (salah satu)',
  })
  .refine((c) => c.huruf === undefined || c.kata.toLowerCase().startsWith(c.huruf.toLowerCase()), {
    message: 'kata harus dimulai dengan hurufnya',
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
    /** Huruf yang tampil besar (kenalan, bunyi, coba, ingat), mis. ["a", "i"]. */
    huruf: z.array(letter).min(1).max(10).optional(),
    /** Untuk layar `kata` dengan satu kata. */
    sukuKata: syllables.optional(),
    /** Untuk layar `kata`: kartu angka-kata-gambar (1–5 kartu). */
    kartu: z.array(lessonCardSchema).min(1).max(5).optional(),
    /**
     * Untuk layar `coba` (tidak dinilai): `tebal` = tebalkan angka/huruf; `hitung` = ketuk benda satu per satu;
     * `cari` = ketuk semua huruf yang sama di antara huruf lain.
     */
    mode: z.enum(['tebal', 'hitung', 'cari']).optional(),
  })
  .superRefine((s, ctx) => {
    const need = (ok: boolean, message: string) => {
      if (!ok) ctx.addIssue({ code: 'custom', message: `${s.jenis}: ${message}` });
    };
    if (s.jenis === 'kata') need(!!s.sukuKata || !!s.kartu, 'butuh sukuKata atau kartu');
    if (s.jenis === 'coba') {
      need(!!s.mode, 'butuh mode (tebal/hitung/cari)');
      need(s.mode === 'cari' ? !!s.huruf : !!s.angka || !!s.huruf, 'butuh angka atau huruf');
      if (s.mode === 'tebal')
        need(
          (s.huruf ?? []).every((h) => (LETTER_GLYPH_IDS as readonly string[]).includes(h)),
          `huruf untuk ditebalkan hanya ${LETTER_GLYPH_IDS.join(' ')}`,
        );
      if (s.mode === 'hitung') {
        need(!!s.angka, 'mode hitung butuh angka');
        need(!!s.gambar?.length, 'mode hitung butuh gambar');
        need(!s.angka?.includes(0), 'mode hitung tidak bisa angka 0');
      }
    }
    if (s.jenis === 'kenalan') need(!!s.angka || !!s.huruf, 'butuh angka atau huruf');
    if (s.jenis === 'bunyi') {
      need(!!s.huruf, 'butuh huruf');
      need(!!s.gambar?.length, 'butuh gambar benda berawalan huruf itu');
    }
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
