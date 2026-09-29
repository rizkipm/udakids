import { execute, initialState, stateKey, type GridState } from '../interpreter/grid.js';
import type { GridMoveLevel } from '../levels/schema.js';
import { cardCount, gridCardToInstr, makeRepeat } from '../program/program.js';
import type { Instr, Program } from '../program/types.js';

export type SolveOptions = {
  /** Izinkan `repeat` (default: bila palette berisi kartu 'repeat'). */
  allowRepeat?: boolean;
  /** Batas kartu (default: `level.maxCards`). */
  maxCards?: number;
  /** Nilai n terbesar untuk `repeat` (default 10 — angka satu–sepuluh). */
  maxRepeatN?: number;
  /** Panjang isi `repeat` terbesar (default 4). */
  maxBodyLen?: number;
};

export type Solution = { program: Program; cards: number };

/** Instruksi primitif yang bisa dibentuk dari palette (tanpa 'repeat'). */
export function primitivesOf(level: GridMoveLevel): Instr[] {
  return level.palette.flatMap((c) => (c === 'repeat' ? [] : [gridCardToInstr(c)]));
}

function sequences(items: Instr[], maxLen: number): Instr[][] {
  const out: Instr[][] = [];
  let layer: Instr[][] = [[]];
  for (let len = 1; len <= maxLen; len++) {
    layer = layer.flatMap((seq) => items.map((i) => [...seq, i]));
    out.push(...layer);
  }
  return out;
}

/**
 * Makro = satu langkah di tingkat atas program: instruksi primitif, atau `repeat(n, isi datar)`.
 * Karena interpreter deterministik, efek makro hanya bergantung pada state, sehingga pencarian
 * bisa dilakukan di atas state (bukan di atas semua kemungkinan program).
 */
function macros(
  level: GridMoveLevel,
  maxCards: number,
  opts: Required<Omit<SolveOptions, 'maxCards'>>,
) {
  const prims = primitivesOf(level);
  const list: { program: Program; cost: number }[] = prims.map((p) => ({
    program: [p],
    cost: cardCount([p]),
  }));
  if (opts.allowRepeat && maxCards >= 2) {
    for (const body of sequences(prims, Math.min(opts.maxBodyLen, maxCards - 1))) {
      for (let n = 2; n <= opts.maxRepeatN; n++) {
        const instr = makeRepeat(n, body);
        list.push({ program: [instr], cost: cardCount([instr]) });
      }
    }
  }
  return list.filter((m) => m.cost <= maxCards);
}

/**
 * Cari program dengan jumlah kartu paling sedikit yang membawa Momo ke tujuan.
 * Tanpa `repeat` ini BFS murni; dengan `repeat` ini pencarian biaya-seragam (Dijkstra) atas state
 * dengan makro sebagai sisi. Mengembalikan `null` bila tidak ada solusi dalam `maxCards`.
 */
export function solveGrid(level: GridMoveLevel, options: SolveOptions = {}): Solution | null {
  const maxCards = options.maxCards ?? level.maxCards;
  const opts = {
    allowRepeat: options.allowRepeat ?? level.palette.includes('repeat'),
    maxRepeatN: options.maxRepeatN ?? 10,
    maxBodyLen: options.maxBodyLen ?? 4,
  };
  const edges = macros(level, maxCards, opts);

  const start = initialState(level);
  const best = new Map<string, number>([[stateKey(start), 0]]);
  // buckets[c] = state yang dicapai dengan biaya tepat c.
  const buckets: { state: GridState; program: Program }[][] = [[{ state: start, program: [] }]];
  let found: Solution | null = null;

  for (let cost = 0; cost <= maxCards; cost++) {
    if (found && cost >= found.cards) break;
    for (const node of buckets[cost] ?? []) {
      if (best.get(stateKey(node.state)) !== cost) continue; // sudah ada jalur lebih murah
      for (const edge of edges) {
        const next = cost + edge.cost;
        if (next > maxCards || (found && next >= found.cards)) continue;
        const trace = execute(level, edge.program, node.state);
        if (trace.limitReached || trace.result === 'bump') continue;
        const program = [...node.program, ...edge.program];
        if (trace.result === 'goal') {
          found = { program, cards: next };
          continue;
        }
        const k = stateKey(trace.final);
        if ((best.get(k) ?? Infinity) <= next) continue;
        best.set(k, next);
        (buckets[next] ??= []).push({ state: trace.final, program });
      }
    }
  }
  return found;
}

export type GridAnalysis = {
  solvable: boolean;
  /** Jumlah kartu solusi terpendek (dasar bintang 3 untuk `optimalSteps: "auto"`). */
  optimalSteps?: number;
  solution?: Solution;
  /** Solusi tanpa `repeat` dalam `maxCards` (null bila tidak ada). */
  flatSolution: Solution | null;
  /** PRD A7 no. 4: level ber-skill `loop` yang bisa diselesaikan tanpa `repeat`. */
  shortcut: boolean;
};

export const LOOP_SKILL = 'loop';

export function analyzeGridLevel(level: GridMoveLevel, options: SolveOptions = {}): GridAnalysis {
  const flatSolution = solveGrid(level, { ...options, allowRepeat: false });
  const withRepeat = level.palette.includes('repeat') || options.allowRepeat;
  const solution = withRepeat ? solveGrid(level, { ...options, allowRepeat: true }) : flatSolution;
  const shortcut = level.skills.includes(LOOP_SKILL) && flatSolution !== null;
  return {
    solvable: solution !== null,
    ...(solution && { optimalSteps: solution.cards, solution }),
    flatSolution,
    shortcut,
  };
}
