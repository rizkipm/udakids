import { PASS_SCORE } from './quiz.js';

/**
 * Peringkat rata-rata (D-042, disempurnakan D-045).
 *
 * Rata-rata murni tidak adil untuk dibandingkan: 1 ronde bernilai 100 akan mengalahkan 80 ronde bernilai
 * rata-rata 95. Karena itu urutan memakai **nilai peringkat** = rata-rata tertimbang (Bayesian average):
 * setiap anak dianggap sudah punya `RATING_PRIOR_ROUNDS` ronde "bayangan" bernilai `PASS_SCORE` (batas lulus),
 * lalu ronde aslinya menggeser nilai itu ke rata-rata sebenarnya. Makin banyak ronde, makin dekat ke
 * rata-rata asli (20 ronde → 80% bobot dari ronde asli).
 *
 * Sama → rata-rata asli lebih tinggi → total waktu lebih cepat → ronde lebih banyak. Posisi berurutan.
 */
export type AverageRow = { rounds: number; scoreSum: number; timeMs: number };
export type Ranked<T> = T & { average: number; rating: number; position: number };

/** Banyak ronde bayangan (D-045). */
export const RATING_PRIOR_ROUNDS = 5;
/** Nilai ronde bayangan = batas lulus. */
export const RATING_PRIOR_SCORE = PASS_SCORE;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Rata-rata 2 desimal, mis. 87.53. */
export const average2 = (scoreSum: number, rounds: number) =>
  rounds > 0 ? round2(scoreSum / rounds) : 0;

/** Nilai peringkat (rata-rata tertimbang) 2 desimal. */
export const rating2 = (scoreSum: number, rounds: number) =>
  rounds > 0
    ? round2((scoreSum + RATING_PRIOR_ROUNDS * RATING_PRIOR_SCORE) / (rounds + RATING_PRIOR_ROUNDS))
    : 0;

/** Format Indonesia: 87,53. */
export const formatAverage = (n: number) =>
  n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function rankByAverage<T extends AverageRow>(rows: readonly T[]): Ranked<T>[] {
  return rows
    .filter((r) => r.rounds > 0)
    .map((r) => ({
      ...r,
      average: average2(r.scoreSum, r.rounds),
      rating: rating2(r.scoreSum, r.rounds),
    }))
    .sort(
      (a, b) =>
        b.rating - a.rating || b.average - a.average || a.timeMs - b.timeMs || b.rounds - a.rounds,
    )
    .map((r, i) => ({ ...r, position: i + 1 }));
}

/** Jumlah teratas yang ditampilkan sebagai "papan pengumuman" (detail bisa dibuka). */
export const LEADERBOARD_TOP = 25;

/** Periode papan landing page (zona WIB). */
export const BOARD_PERIODS = ['all', 'month', 'week', 'day'] as const;
export type BoardPeriod = (typeof BOARD_PERIODS)[number];

export type ActivityRow = { questions: number; timeMs: number; nickname: string };

/**
 * Paling aktif (landing page): soal dijawab terbanyak di periode itu; sama → waktu bermain lebih lama → nama.
 * Anak tanpa soal di periode itu tidak masuk papan.
 */
export function rankByActivity<T extends ActivityRow>(
  rows: readonly T[],
): (T & { position: number })[] {
  return rows
    .filter((r) => r.questions > 0)
    .sort(
      (a, b) =>
        b.questions - a.questions ||
        b.timeMs - a.timeMs ||
        a.nickname.localeCompare(b.nickname, 'id'),
    )
    .map((r, i) => ({ ...r, position: i + 1 }));
}
