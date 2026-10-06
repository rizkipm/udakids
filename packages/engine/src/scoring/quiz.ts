import { z } from 'zod';

/**
 * Ronde level (D-021): 10 soal dari mudah ke sulit; skor = persen benar; lulus bila skor ≥ 70
 * (≥ 7 dari 10). Lulus membuka level berikutnya di materi yang sama; lulus Level 1 membuka
 * materi berikutnya.
 */
export const QUIZ_LENGTH = 10;
export const PASS_SCORE = 70;

/** Band kesulitan per nomor soal: mudah → sulit di dalam satu ronde. */
export const QUIZ_BANDS = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2] as const;
export const quizBand = (index: number) => QUIZ_BANDS[Math.min(index, QUIZ_BANDS.length - 1)]!;

export const quizScore = (correct: number, total = QUIZ_LENGTH) =>
  total <= 0 ? 0 : Math.round((Math.max(0, Math.min(correct, total)) / total) * 100);
export const isPassed = (score: number) => score >= PASS_SCORE;
/** Jumlah benar minimal untuk lulus. */
export const correctNeeded = (total = QUIZ_LENGTH) => Math.ceil((PASS_SCORE / 100) * total);

export const quizResultSchema = z.strictObject({
  best: z.number().int().min(0).max(100),
  last: z.number().int().min(0).max(100),
  passed: z.boolean(),
  attempts: z.number().int().min(0),
  ts: z.number(),
  /** Lama pengerjaan (ms) ronde dengan skor terbaik; bila skor sama, yang tercepat (D-024). */
  bestTimeMs: z.number().int().min(0).optional(),
  /** Lama pengerjaan (ms) ronde terakhir. */
  lastTimeMs: z.number().int().min(0).optional(),
});
export type QuizResult = z.infer<typeof quizResultSchema>;

/** Catat hasil ronde baru; skor terbaik & status lulus tidak pernah turun. */
export function recordQuiz(
  prev: QuizResult | undefined,
  score: number,
  ts: number,
  timeMs?: number,
): QuizResult {
  const out: QuizResult = {
    best: Math.max(prev?.best ?? 0, score),
    last: score,
    passed: (prev?.passed ?? false) || isPassed(score),
    attempts: (prev?.attempts ?? 0) + 1,
    ts,
  };
  const bestTime = pickBestTime(prev?.best, prev?.bestTimeMs, score, timeMs);
  if (bestTime !== undefined) out.bestTimeMs = bestTime;
  if (timeMs !== undefined) out.lastTimeMs = timeMs;
  else if (prev?.lastTimeMs !== undefined) out.lastTimeMs = prev.lastTimeMs;
  return out;
}

/** Waktu milik skor terbaik: skor lebih tinggi menang; skor sama → waktu tercepat. */
function pickBestTime(
  aScore: number | undefined,
  aTime: number | undefined,
  bScore: number,
  bTime: number | undefined,
): number | undefined {
  if (aScore === undefined || bScore > aScore) return bTime ?? aTime;
  if (bScore < aScore) return aTime;
  if (aTime === undefined) return bTime;
  if (bTime === undefined) return aTime;
  return Math.min(aTime, bTime);
}

/** Gabung hasil dari dua perangkat: terbaik = max, lulus = OR, percobaan = max, `last` dari ts terbaru. */
export function mergeQuiz(a: QuizResult, b: QuizResult): QuizResult {
  const newer = b.ts >= a.ts ? b : a;
  const out: QuizResult = {
    best: Math.max(a.best, b.best),
    last: newer.last,
    passed: a.passed || b.passed,
    attempts: Math.max(a.attempts, b.attempts),
    ts: newer.ts,
  };
  const bestTime = pickBestTime(a.best, a.bestTimeMs, b.best, b.bestTimeMs);
  if (bestTime !== undefined) out.bestTimeMs = bestTime;
  const lastTime = newer.lastTimeMs ?? (newer === a ? b : a).lastTimeMs;
  if (lastTime !== undefined) out.lastTimeMs = lastTime;
  return out;
}

export type LevelStatus = 'locked' | 'open' | 'passed';

export type LevelNode = { id: string; category: string; order: number };

/**
 * Status tiap level dalam satu buku (katalog).
 * - Materi pertama selalu terbuka; materi berikutnya terbuka bila Level 1 materi sebelumnya lulus.
 * - Di dalam materi, Level 1 terbuka (bila materinya terbuka); level berikutnya terbuka bila
 *   level sebelumnya lulus.
 */
export function levelStatuses(
  categories: readonly string[],
  skills: readonly LevelNode[],
  results: Readonly<Record<string, QuizResult | undefined>>,
  /** Kode topik mandiri (D-068): terbuka sejak awal dan tidak mengunci topik sesudahnya. */
  standalone: ReadonlySet<string> = new Set(),
): Record<string, LevelStatus> {
  const out: Record<string, LevelStatus> = {};
  let categoryOpen = true;
  for (const code of categories) {
    const levels = skills.filter((s) => s.category === code).sort((a, b) => a.order - b.order);
    if (levels.length === 0) continue;
    const alone = standalone.has(code);
    let open = categoryOpen || alone;
    for (const lvl of levels) {
      const passed = results[lvl.id]?.passed === true;
      out[lvl.id] = passed ? 'passed' : open ? 'open' : 'locked';
      // Level yang lulus tetap bisa diulang; level berikutnya terbuka hanya bila ini lulus.
      open = open && passed;
    }
    if (!alone) categoryOpen = categoryOpen && results[levels[0]!.id]?.passed === true;
  }
  return out;
}

/**
 * Topik mandiri yang dilewati saat memilih "level berikutnya" (D-068): bila anak sudah pernah bermain di topik
 * biasa buku itu, ia tidak dialihkan ke topik tambahan — anak baru tetap mulai dari topik mandiri di depan.
 */
export function skippedStandalone(
  skills: readonly LevelNode[],
  results: Readonly<Record<string, QuizResult | undefined>>,
  standalone: ReadonlySet<string>,
): ReadonlySet<string> {
  const playedRegular = skills.some((s) => !standalone.has(s.category) && results[s.id]);
  return playedRegular ? standalone : new Set();
}

/** Kode topik mandiri di katalog (untuk `levelStatuses`). */
export const standaloneCodes = (
  categories: readonly { code: string; standalone?: boolean }[],
): ReadonlySet<string> => new Set(categories.filter((c) => c.standalone).map((c) => c.code));

/** Total skor = jumlah skor terbaik semua level yang pernah dimainkan. */
export const totalPoints = (results: Readonly<Record<string, QuizResult | undefined>>) =>
  Object.values(results).reduce((sum, r) => sum + (r?.best ?? 0), 0);

/** Banyak level yang sudah lulus. */
export const passedLevels = (results: Readonly<Record<string, QuizResult | undefined>>) =>
  Object.values(results).filter((r) => r?.passed).length;

/**
 * Peringkat gaya kompetisi (1, 2, 2, 4): posisi = 1 + banyak peserta dengan total lebih tinggi.
 * `totals` = total skor semua peserta (termasuk `mine`).
 */
export function rankOf(totals: readonly number[], mine: number): { position: number; of: number } {
  return { position: 1 + totals.filter((t) => t > mine).length, of: Math.max(totals.length, 1) };
}

/** Total waktu = jumlah waktu skor terbaik semua level yang pernah dimainkan (ms). */
export const totalTimeMs = (results: Readonly<Record<string, QuizResult | undefined>>) =>
  Object.values(results).reduce((sum, r) => sum + (r?.bestTimeMs ?? 0), 0);

/**
 * Papan peringkat (D-024): skor total tertinggi → level lulus terbanyak → waktu total tercepat.
 */
export type LeaderStats = { points: number; passed: number; timeMs: number };
export const compareLeaders = (a: LeaderStats, b: LeaderStats) =>
  b.points - a.points || b.passed - a.passed || a.timeMs - b.timeMs;

/** Urutkan & beri posisi gaya kompetisi: baris yang sama persis mendapat posisi yang sama. */
export function rankLeaders<T extends LeaderStats>(
  rows: readonly T[],
): (T & { position: number })[] {
  const sorted = [...rows].sort(compareLeaders);
  let position = 0;
  return sorted.map((row, i) => {
    if (i === 0 || compareLeaders(sorted[i - 1]!, row) !== 0) position = i + 1;
    return { ...row, position };
  });
}

/** "03:20" (menit:detik), atau "1:02:03" bila ≥ 1 jam. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** "3 menit 20 detik" — untuk dibacakan. */
export function durationWords(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [h && `${h} jam`, m && `${m} menit`, (s || total === 0) && `${s} detik`];
  return parts.filter(Boolean).join(' ');
}

/**
 * Durasi ringkas untuk kartu angka (dasbor): paling banyak dua satuan, mis. "2 jam 15 mnt", "15 mnt 56 dtk",
 * "56 dtk". Teks lengkap tetap memakai `durationWords` (pembaca layar, tooltip).
 */
export function durationShort(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return m ? `${h} jam ${m} mnt` : `${h} jam`;
  if (m) return s ? `${m} mnt ${s} dtk` : `${m} mnt`;
  return `${s} dtk`;
}
