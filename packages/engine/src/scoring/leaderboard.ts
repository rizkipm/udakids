/**
 * Peringkat rata-rata (D-042): rata-rata skor semua ronde yang dikerjakan (0–100, dibulatkan 2 desimal);
 * bila rata-rata sama, total waktu lebih cepat di atas; bila masih sama, lebih banyak ronde di atas.
 * Posisi berurutan (1, 2, 3, …) — tidak ada posisi kembar.
 */
export type AverageRow = { rounds: number; scoreSum: number; timeMs: number };
export type Ranked<T> = T & { average: number; position: number };

/** Rata-rata 2 desimal, mis. 87.53. */
export const average2 = (scoreSum: number, rounds: number) =>
  rounds > 0 ? Math.round((scoreSum / rounds) * 100) / 100 : 0;

/** Format Indonesia: 87,53. */
export const formatAverage = (n: number) =>
  n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function rankByAverage<T extends AverageRow>(rows: readonly T[]): Ranked<T>[] {
  return rows
    .filter((r) => r.rounds > 0)
    .map((r) => ({ ...r, average: average2(r.scoreSum, r.rounds) }))
    .sort((a, b) => b.average - a.average || a.timeMs - b.timeMs || b.rounds - a.rounds)
    .map((r, i) => ({ ...r, position: i + 1 }));
}

/** Jumlah teratas yang ditampilkan sebagai "papan pengumuman" (detail bisa dibuka). */
export const LEADERBOARD_TOP = 25;
