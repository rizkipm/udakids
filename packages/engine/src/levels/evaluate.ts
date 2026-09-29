import { run, type InstrPath, type Trace } from '../interpreter/grid.js';
import { cardCount, programCardIds } from '../program/program.js';
import type { Program } from '../program/types.js';
import type {
  ClassifyLevel,
  GridMoveLevel,
  Level,
  NumberLevel,
  PatternLevel,
  PredictLevel,
  SequenceCardsLevel,
} from './schema.js';

/** Sama dengan `result` di event `program_run` (PRD A11). */
export type Outcome = 'goal' | 'bump' | 'incomplete' | 'wrong';

export type Evaluation = {
  outcome: Outcome;
  solved: boolean;
  /** Jumlah kartu yang dipakai (untuk bintang 3 pada puzzle "hemat"). */
  cardsUsed: number;
  /** Instruksi yang perlu disorot saat bantuan tingkat 1 (bila bisa ditentukan). */
  faultyPath?: InstrPath;
  /** Grid saja: jejak untuk animasi dan penyorotan Buku Catatan. */
  trace?: Trace;
  /** Classify saja: benda yang belum berada di kelompok yang tepat. */
  misplaced?: string[];
};

/** Jawaban anak per jenis puzzle. */
export type Answer =
  | { type: 'grid-move'; program: Program }
  | { type: 'sequence-cards'; program: Program }
  | { type: 'pattern'; program: Program }
  | { type: 'classify'; assignment: Record<string, string> }
  | { type: 'number'; value: number }
  | { type: 'predict'; choice: string };

/** Puzzle yang punya konsep "hemat langkah" (bintang 3 = kartu ≤ optimalSteps). */
export const hasEfficiency = (level: Level) => level.type === 'grid-move';

export function evaluateGrid(level: GridMoveLevel, program: Program): Evaluation {
  const trace = run(level, program);
  const cardsUsed = cardCount(program);
  if (trace.result === 'goal') return { outcome: 'goal', solved: true, cardsUsed, trace };
  if (trace.result === 'bump') {
    return {
      outcome: 'bump',
      solved: false,
      cardsUsed,
      trace,
      ...(trace.bumpPath && { faultyPath: trace.bumpPath }),
    };
  }
  // Tidak sampai: sorot instruksi terakhir yang dijalankan (atau yang pertama bila program kosong).
  const last = trace.steps.at(-1)?.instrPath;
  return {
    outcome: 'incomplete',
    solved: false,
    cardsUsed,
    trace,
    ...(program.length > 0 && { faultyPath: last ? [last[0]!] : [program.length - 1] }),
  };
}

/** Panjang awalan terpanjang `ids` yang cocok dengan salah satu kandidat. */
function longestPrefix(ids: readonly string[], candidates: readonly (readonly string[])[]): number {
  let best = 0;
  for (const c of candidates) {
    let n = 0;
    while (n < ids.length && n < c.length && ids[n] === c[n]) n++;
    best = Math.max(best, n);
  }
  return best;
}

function evaluateOrdered(
  ids: string[],
  candidates: readonly (readonly string[])[],
  cardsUsed: number,
): Evaluation {
  const exact = candidates.some(
    (c) => c.length === ids.length && c.every((id, i) => ids[i] === id),
  );
  if (exact) return { outcome: 'goal', solved: true, cardsUsed };
  const prefix = longestPrefix(ids, candidates);
  // Awalan benar tapi belum lengkap → "incomplete"; ada kartu yang keliru → sorot kartu itu.
  if (prefix === ids.length) return { outcome: 'incomplete', solved: false, cardsUsed };
  return { outcome: 'wrong', solved: false, cardsUsed, faultyPath: [prefix] };
}

export function evaluateSequence(level: SequenceCardsLevel, program: Program): Evaluation {
  const ids = programCardIds(program);
  return evaluateOrdered(ids, level.validOrders, ids.length);
}

export function evaluatePattern(level: PatternLevel, program: Program): Evaluation {
  const ids = programCardIds(program);
  return evaluateOrdered(ids, level.answers, ids.length);
}

export function evaluateClassify(
  level: ClassifyLevel,
  assignment: Record<string, string>,
): Evaluation {
  const misplaced = level.items.filter((i) => assignment[i.id] !== i.group).map((i) => i.id);
  const solved = misplaced.length === 0;
  const placed = Object.keys(assignment).length;
  return {
    outcome: solved ? 'goal' : placed < level.items.length ? 'incomplete' : 'wrong',
    solved,
    cardsUsed: placed,
    ...(!solved && { misplaced }),
  };
}

export function evaluateNumber(level: NumberLevel, value: number): Evaluation {
  const solved = value === level.answer;
  return { outcome: solved ? 'goal' : 'wrong', solved, cardsUsed: 1 };
}

/**
 * Tebak – coba – ceritakan: tebakan yang meleset tidak dianggap salah di UI;
 * hasil `wrong` hanya dipakai untuk bintang 3 (benar pada tebakan pertama) dan analisis.
 */
export function evaluatePredict(level: PredictLevel, choice: string): Evaluation {
  const solved = choice === level.outcome;
  return { outcome: solved ? 'goal' : 'wrong', solved, cardsUsed: 1 };
}

export function evaluate(level: Level, answer: Answer): Evaluation {
  if (level.type !== answer.type) {
    throw new Error(`jawaban ${answer.type} tidak cocok untuk level ${level.type}`);
  }
  switch (answer.type) {
    case 'grid-move':
      return evaluateGrid(level as GridMoveLevel, answer.program);
    case 'sequence-cards':
      return evaluateSequence(level as SequenceCardsLevel, answer.program);
    case 'pattern':
      return evaluatePattern(level as PatternLevel, answer.program);
    case 'classify':
      return evaluateClassify(level as ClassifyLevel, answer.assignment);
    case 'number':
      return evaluateNumber(level as NumberLevel, answer.value);
    case 'predict':
      return evaluatePredict(level as PredictLevel, answer.choice);
  }
}
