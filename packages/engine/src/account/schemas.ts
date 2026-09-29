import { z } from 'zod';
import { COLORS, type ObjectId } from '../generator/assets.js';
import { jagoStateSchema } from '../scoring/jago.js';
import { skillIdSchema } from '../generator/template.js';

/**
 * Skema akun & sinkronisasi yang dipakai bersama web dan API (D-014..D-016).
 * Privasi (PRD A17): profil anak hanya nama panggilan + warna Momo + sandi gambar.
 */

/** 9 gambar untuk sandi gambar anak; sandi = 3 gambar berurutan. */
export const PIN_PICTURES = [
  'kucing',
  'apel',
  'bola',
  'bintang',
  'ikan',
  'bunga',
  'mobil',
  'balon',
  'kue',
] as const satisfies readonly ObjectId[];
export type PinPicture = (typeof PIN_PICTURES)[number];
export const PIN_LENGTH = 3;
export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MS = 60_000;

export const MOMO_COLORS = COLORS;
export const FAMILY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const FAMILY_CODE_LENGTH = 6;

const email = z.string().trim().toLowerCase().pipe(z.email('email tidak valid'));
const password = z.string().min(8, 'password minimal 8 karakter').max(128);

export const picturePinSchema = z
  .array(z.enum(PIN_PICTURES))
  .length(PIN_LENGTH, 'sandi gambar harus 3 gambar');
export const nicknameSchema = z
  .string()
  .trim()
  .min(1, 'nama panggilan wajib diisi')
  .max(20, 'nama panggilan maksimal 20 karakter')
  .regex(/^[\p{L} '.-]+$/u, 'nama panggilan hanya huruf');
export const familyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    new RegExp(`^[${FAMILY_CODE_ALPHABET}]{${FAMILY_CODE_LENGTH}}$`),
    'kode keluarga 6 karakter',
  );

export const staffLoginSchema = z.strictObject({ email, password: z.string().min(1).max(128) });
export const parentLoginSchema = staffLoginSchema;
export const parentRegisterSchema = z.strictObject({
  name: z.string().trim().min(1, 'nama wajib diisi').max(60),
  email,
  password,
  consent: z.literal(true, { error: 'persetujuan pengolahan data wajib dicentang' }),
});
/** `familyCode` boleh berisi kode keluarga ATAU kode kelas (D-025). */
export const childLoginSchema = z.strictObject({
  familyCode: familyCodeSchema,
  childId: z.uuid(),
  pin: picturePinSchema,
});
export const childProfileSchema = z.strictObject({
  nickname: nicknameSchema,
  momoColor: z.enum(MOMO_COLORS),
  pin: picturePinSchema,
  classCode: familyCodeSchema.optional(),
});
export const childUpdateSchema = childProfileSchema.partial().extend({
  /** Kode kelas workshop (peringkat dihitung per kelas, D-022); null = keluar dari kelas. */
  classCode: familyCodeSchema.nullable().optional(),
});

export const staffRoleSchema = z.enum(['admin', 'facilitator']);
export const staffCreateSchema = z.strictObject({
  email,
  name: z.string().trim().min(1).max(60),
  role: staffRoleSchema,
  password,
});
export const staffUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).max(60).optional(),
  role: staffRoleSchema.optional(),
  active: z.boolean().optional(),
  password: password.optional(),
});
export const activeToggleSchema = z.strictObject({ active: z.boolean() });
export const setPasswordSchema = z.strictObject({ password });
export const setPinSchema = z.strictObject({ pin: picturePinSchema });

export const classCreateSchema = z.strictObject({
  eventName: z.string().trim().min(1).max(80),
  world: z.number().int().min(1).max(10).optional(),
  facilitatorId: z.uuid().optional(),
});
export const classUpdateSchema = z.strictObject({
  frozen: z.boolean().optional(),
  closed: z.boolean().optional(),
  eventName: z.string().trim().min(1).max(80).optional(),
});

/** Siswa gabung sendiri ke kelas workshop dengan kode kelas (D-025). */
export const classJoinSchema = z.strictObject({
  classCode: familyCodeSchema,
  nickname: nicknameSchema,
  momoColor: z.enum(MOMO_COLORS),
  pin: picturePinSchema,
});
/** Fasilitator/admin mendaftarkan banyak siswa sekaligus (D-025). */
export const classRosterSchema = z.strictObject({
  nicknames: z.array(nicknameSchema).min(1).max(60),
});

/** Sinkronisasi latihan Pustaka dari perangkat anak (event item_answer + state Skor Jago). */
export const practiceSyncSchema = z.strictObject({
  answers: z
    .array(
      z.strictObject({
        id: z.uuid(),
        skillId: skillIdSchema,
        correct: z.boolean(),
        band: z.number().int().min(0).max(2),
        chosenDistractor: z.string().max(60).optional(),
        review: z.boolean().optional(),
        ts: z.number().int().positive(),
      }),
    )
    .max(500),
  states: z.array(z.strictObject({ skillId: skillIdSchema, state: jagoStateSchema })).max(500),
  /** Hasil ronde level (D-021), idempoten per id. */
  quizzes: z
    .array(
      z.strictObject({
        id: z.uuid(),
        skillId: skillIdSchema,
        correct: z.number().int().min(0).max(50),
        total: z.number().int().min(1).max(50),
        ts: z.number().int().positive(),
        /** Lama pengerjaan ronde (stopwatch tanpa batas, D-024); maks 6 jam. */
        durationMs: z
          .number()
          .int()
          .min(0)
          .max(6 * 3600_000)
          .optional(),
      }),
    )
    .max(200)
    .default([]),
});
export type PracticeSync = z.infer<typeof practiceSyncSchema>;

export type Role = 'admin' | 'facilitator' | 'parent' | 'child';
export type SessionUser = { id: string; role: Role; name: string };
