import { z } from 'zod';

/**
 * PRD A9 — Skor Jago: perkiraan penguasaan per skill yang TIDAK menghukum anak.
 * Anak hanya melihat tahap tanaman (`visibleStage`, tidak pernah turun); angka untuk sistem/orang tua.
 */
export const jagoStateSchema = z.strictObject({
  score: z.number().min(0).max(100),
  visibleStage: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  challengeCorrect: z.number().int().min(0).max(3),
  jagoAt: z.number().optional(),
  nextReviewAt: z.number().optional(),
  /** Jumlah ulangan yang sudah lulus setelah Jago (0 → +7 hari, 1 → +30 hari, 2 → selesai). */
  reviewsPassed: z.number().int().min(0).default(0),
  needsReview: z.boolean(),
  /** Waktu perubahan terakhir — konflik sinkronisasi: state dengan ts terbaru menang (A11). */
  ts: z.number().default(0),
});
export type JagoState = z.infer<typeof jagoStateSchema>;
export type Stage = JagoState['visibleStage'];

export const STAGE_NAMES = ['Benih', 'Tunas', 'Pohon', 'Berbuah'] as const;
export const CHALLENGE_THRESHOLD = 90;
export const CHALLENGE_NEEDED = 3;
const DAY = 24 * 60 * 60 * 1000;
export const REVIEW_INTERVALS = [7 * DAY, 30 * DAY] as const;
export const REVIEW_FAIL_SCORE = 85;
/** Jumlah soal dalam satu sesi ulangan. */
export const REVIEW_ITEMS = 3;

export const initialJago = (): JagoState => ({
  score: 0,
  visibleStage: 0,
  challengeCorrect: 0,
  reviewsPassed: 0,
  needsReview: false,
  ts: 0,
});

/** 0 Benih (<30) · 1 Tunas (30–59) · 2 Pohon (60–99) · 3 Berbuah (100). */
export function stageOf(score: number): Stage {
  if (score >= 100) return 3;
  if (score >= 60) return 2;
  if (score >= 30) return 1;
  return 0;
}

const STAGE_FLOOR: Record<Stage, number> = { 0: 0, 1: 30, 2: 60, 3: 100 };

/** Band kesulitan dari skor: <40 → 0, <75 → 1, selain itu 2. */
export const bandOf = (score: number) => (score < 40 ? 0 : score < 75 ? 1 : 2);

/** Band untuk soal berikutnya: setelah jawaban salah, turunkan satu band (soal lebih mudah). */
export const nextBand = (state: JagoState, lastCorrect: boolean | undefined) =>
  lastCorrect === false ? Math.max(0, bandOf(state.score) - 1) : bandOf(state.score);

export const isChallengeMode = (s: JagoState) => s.score >= CHALLENGE_THRESHOLD && s.score < 100;

export type JagoUpdate = {
  state: JagoState;
  /** true → tampilkan penjelasan Momo (reteach) sebelum soal berikutnya. */
  reteach: boolean;
  /** true → skill baru saja mencapai Jago (keping + stiker). */
  becameJago: boolean;
  /** true → tahap tanaman naik (animasi tumbuh). */
  grew: boolean;
};

const withStage = (prev: JagoState, next: JagoState): JagoState => ({
  ...next,
  visibleStage: Math.max(prev.visibleStage, stageOf(next.score)) as Stage,
});

/** Terapkan satu jawaban latihan biasa. */
export function answerJago(state: JagoState, correct: boolean, now: number): JagoUpdate {
  const done = (next: JagoState, reteach: boolean): JagoUpdate => {
    const s = withStage(state, { ...next, ts: now });
    return {
      state: s,
      reteach,
      becameJago: state.score < 100 && s.score >= 100,
      grew: s.visibleStage > state.visibleStage,
    };
  };

  // Sudah Jago: latihan tambahan tidak mengubah apa pun.
  if (state.score >= 100) return { state, reteach: !correct, becameJago: false, grew: false };

  if (isChallengeMode(state)) {
    // Mode tantangan: salah → reteach, challengeCorrect TIDAK di-reset, skor tidak turun.
    if (!correct) return done(state, true);
    const challengeCorrect = state.challengeCorrect + 1;
    if (challengeCorrect >= CHALLENGE_NEEDED) {
      return done(
        {
          ...state,
          score: 100,
          challengeCorrect: CHALLENGE_NEEDED,
          jagoAt: now,
          nextReviewAt: now + REVIEW_INTERVALS[0],
          reviewsPassed: 0,
          needsReview: false,
        },
        false,
      );
    }
    return done({ ...state, challengeCorrect }, false);
  }

  if (correct) {
    const gain = state.score < 40 ? 12 : state.score < 70 ? 8 : 5;
    return done({ ...state, score: Math.min(CHALLENGE_THRESHOLD, state.score + gain) }, false);
  }
  const floor = Math.max(0, STAGE_FLOOR[state.visibleStage] - 10);
  // Turun 4, tapi tidak di bawah (batas bawah tahap yang terlihat − 10) — dan batas itu tidak pernah menaikkan skor.
  return done({ ...state, score: Math.max(state.score - 4, Math.min(state.score, floor)) }, true);
}

export const isReviewDue = (s: JagoState, now: number) =>
  s.score >= 100 && s.nextReviewAt !== undefined && now >= s.nextReviewAt;

/**
 * Hasil sesi ulangan (REVIEW_ITEMS soal). Lulus → jadwal berikutnya (+30 hari, lalu selesai).
 * Gagal → "pohon perlu disiram": needsReview, skor 85, tahap tanaman tetap.
 */
export function applyReview(state: JagoState, passed: boolean, now: number): JagoState {
  if (passed) {
    const reviewsPassed = state.reviewsPassed + 1;
    const interval = REVIEW_INTERVALS[reviewsPassed];
    const { nextReviewAt: _drop, ...rest } = state;
    return {
      ...rest,
      reviewsPassed,
      ...(interval !== undefined && { nextReviewAt: now + interval }),
      ts: now,
    };
  }
  const { nextReviewAt: _drop, ...rest } = state;
  return {
    ...rest,
    score: REVIEW_FAIL_SCORE,
    challengeCorrect: 0,
    needsReview: true,
    reviewsPassed: 0,
    ts: now,
  };
}

/** Status untuk orang tua/fasilitator: score ≥ 80 "Bisa", 100 "Jago". */
export function parentStatus(s: JagoState): 'Jago' | 'Bisa' | 'Belajar' | 'Belum mulai' {
  if (s.score >= 100) return 'Jago';
  if (s.score >= 80) return 'Bisa';
  if (s.score > 0 || s.ts > 0) return 'Belajar';
  return 'Belum mulai';
}

/** Konflik sinkronisasi (A11): Skor Jago = state dengan ts terbaru; visibleStage = max. */
export function mergeJago(a: JagoState, b: JagoState): JagoState {
  const newer = b.ts >= a.ts ? b : a;
  return { ...newer, visibleStage: Math.max(a.visibleStage, b.visibleStage) as Stage };
}

/** Sesi: maksimal 10 soal untuk tier basic, 15 untuk lainnya; lalu ajak istirahat. */
export const sessionLength = (tier: 'basic' | 'intermediate' | 'advanced') =>
  tier === 'basic' ? 10 : 15;
