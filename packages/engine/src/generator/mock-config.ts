import { z } from 'zod';

/** Konfigurasi Mock Test olimpiade (D-072), dipakai family `mock` dan penilaian di `scoring/mock`. */
export const MOCK_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type MockDifficulty = (typeof MOCK_DIFFICULTIES)[number];

const perDifficulty = <T extends z.ZodType>(t: T) =>
  z.strictObject({ easy: t, medium: t, hard: t });
const levelRange = z
  .tuple([z.number().int().min(1).max(20), z.number().int().min(1).max(20)])
  .refine(([a, b]) => a <= b, 'rentang terbalik');

/** Poin EMC (Eduversal Mathematics Competition): mudah +8/−2, sedang +20/−5, sulit +40/−10, kosong 0. */
export const EMC_POINTS = {
  easy: { right: 8, wrong: -2 },
  medium: { right: 20, wrong: -5 },
  hard: { right: 40, wrong: -10 },
} as const;

export const mockConfigSchema = z
  .strictObject({
    /** Banyak soal (lomba TK: 25). */
    questions: z.number().int().min(5).max(50).default(25),
    /** Banyak soal per tingkat; jumlahnya harus = `questions`. */
    plan: perDifficulty(z.number().int().min(0).max(50)).default({ easy: 9, medium: 8, hard: 8 }),
    /** Level sumber per tingkat (level 1–3 mudah, 4–7 sedang, 8–10 sulit). */
    levels: perDifficulty(levelRange).default({ easy: [1, 3], medium: [4, 7], hard: [8, 10] }),
    points: perDifficulty(
      z.strictObject({
        right: z.number().int().min(1).max(100),
        wrong: z.number().int().min(-100).max(0),
      }),
    ).default(EMC_POINTS),
    /** Acuan lama lomba (menit) — hanya informasi, BUKAN batas waktu. */
    referenceMinutes: z.number().int().min(5).max(240).default(60),
    /** Nama aturan penilaian untuk ditampilkan. */
    rule: z.string().trim().min(2).max(80).default('Penilaian gaya EMC (Eduversal)'),
    /**
     * Kode materi sumber soal (D-074), mis. materi KMSI saja. Tanpa ini: semua materi di buku (D-072).
     */
    categories: z
      .array(z.string().regex(/^[A-Z]{1,2}$/))
      .min(1)
      .optional(),
    /**
     * KKM lomba dalam poin (D-074), mis. KMSI Level A 40 dari 80, Level 1–4 72 dari 120. Bila diisi, mock "lulus"
     * bila poin ≥ KKM (bukan skor ≥ 70) dan hasil menampilkan lolos/belum lolos KKM.
     */
    passPoints: z.number().int().min(1).max(5000).optional(),
  })
  .refine((c) => c.plan.easy + c.plan.medium + c.plan.hard === c.questions, {
    message: 'jumlah soal per tingkat harus sama dengan questions',
    path: ['plan'],
  })
  .refine(
    (c) =>
      c.passPoints === undefined ||
      c.passPoints <=
        c.plan.easy * c.points.easy.right +
          c.plan.medium * c.points.medium.right +
          c.plan.hard * c.points.hard.right,
    { message: 'KKM melebihi poin maksimal', path: ['passPoints'] },
  );

/** Penilaian KMSI (D-074): benar 4, salah 0, kosong 0 untuk semua tingkat. */
export const KMSI_POINTS = {
  easy: { right: 4, wrong: 0 },
  medium: { right: 4, wrong: 0 },
  hard: { right: 4, wrong: 0 },
} as const;
export type MockConfig = z.infer<typeof mockConfigSchema>;
