import type { InstrPath } from '../interpreter/grid.js';
import type { Evaluation } from '../levels/evaluate.js';
import type { Level } from '../levels/schema.js';
import { solveGrid } from '../solver/grid.js';
import type { Instr } from '../program/types.js';
import type { Stars } from '../scoring/stars.js';

/** Tingkat bantuan = `hintLevel` di event `hint_used` (PRD A11). */
export type Assist =
  | { hintLevel: 1; kind: 'highlight'; path?: InstrPath }
  | { hintLevel: 2; kind: 'demo-first-step'; instr?: Instr }
  | { hintLevel: 3; kind: 'offer-easier-variant' };

/** PRD A8: gagal 2× → sorot; 3× → contohkan langkah pertama; 5× → tawarkan varian lebih mudah. */
export const ASSIST_THRESHOLDS = { highlight: 2, demo: 3, easier: 5 } as const;

/** Instruksi pertama yang dicontohkan Momo. */
export function firstStep(level: Level): Instr | undefined {
  switch (level.type) {
    case 'grid-move':
      return solveGrid(level)?.program[0];
    case 'sequence-cards':
      return { op: 'card', id: level.validOrders[0]![0]! };
    case 'pattern':
      return { op: 'card', id: level.answers[0]![0]! };
    default:
      return undefined;
  }
}

/**
 * Bantuan yang baru terbuka setelah percobaan gagal ke-`failures`.
 * Hanya dipicu tepat pada ambang (2, 3, 5), supaya bantuan tidak diulang terus.
 */
export function assistAfterFailure(
  level: Level,
  failures: number,
  last: Evaluation,
): Assist | null {
  if (failures === ASSIST_THRESHOLDS.easier) return { hintLevel: 3, kind: 'offer-easier-variant' };
  if (failures === ASSIST_THRESHOLDS.demo) {
    const instr = firstStep(level);
    return { hintLevel: 2, kind: 'demo-first-step', ...(instr && { instr }) };
  }
  if (failures === ASSIST_THRESHOLDS.highlight) {
    return { hintLevel: 1, kind: 'highlight', ...(last.faultyPath && { path: last.faultyPath }) };
  }
  return null;
}

export type CompletionRecord = { levelId: string; stars: Stars; hintsUsed: number };

/**
 * PRD A8 — lompat maju: 3 level berturut-turut bintang 3 tanpa petunjuk → tawarkan level
 * `challenge` dunia itu. `recent` = penyelesaian level dunia ini, urut waktu.
 * Mengembalikan id level challenge, atau null.
 */
export function skipAheadTarget(
  recent: readonly CompletionRecord[],
  worldLevels: readonly Pick<Level, 'id' | 'role' | 'index'>[],
): string | null {
  if (recent.length < 3) return null;
  const streak = recent.slice(-3).every((r) => r.stars === 3 && r.hintsUsed === 0);
  if (!streak) return null;
  const challenge = worldLevels.find((l) => l.role === 'challenge');
  if (!challenge) return null;
  const done = new Set(recent.map((r) => r.levelId));
  if (done.has(challenge.id)) return null;
  // Tawarkan hanya bila anak belum melewati level challenge secara urutan.
  const lastIndex = Math.max(
    ...recent.map((r) => worldLevels.find((l) => l.id === r.levelId)?.index ?? 0),
  );
  return lastIndex < challenge.index ? challenge.id : null;
}
