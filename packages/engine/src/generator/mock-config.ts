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
  })
  .refine((c) => c.plan.easy + c.plan.medium + c.plan.hard === c.questions, {
    message: 'jumlah soal per tingkat harus sama dengan questions',
    path: ['plan'],
  });
export type MockConfig = z.infer<typeof mockConfigSchema>;
