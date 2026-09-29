import type { GridMoveLevel } from '../levels/schema.js';
import type { Cond, Dir, Instr, Program } from '../program/types.js';

/** PRD A5: batas aman langkah per eksekusi. */
export const MAX_STEPS = 200;

export type Pos = { x: number; y: number };
export type GridEvent = 'bump' | 'collect' | 'goal';
/**
 * Menunjuk instruksi yang sedang jalan, untuk menyorot kalimat di Buku Catatan.
 * `[i]` = instruksi ke-i; `[i, j]` = isi ke-j dari `repeat` ke-i;
 * `[i, 0, j]` / `[i, 1, j]` = isi ke-j cabang `then` / `else` dari `if` ke-i.
 */
export type InstrPath = number[];

export type TraceStep = {
  step: number;
  pos: Pos;
  facing: Dir;
  event?: GridEvent;
  instrPath: InstrPath;
};

export type GridState = {
  pos: Pos;
  facing: Dir;
  /** Bintang yang sudah diambil, sebagai kunci "x,y", terurut. */
  collected: string[];
};

export type RunResult = 'goal' | 'bump' | 'incomplete';

export type Trace = {
  steps: TraceStep[];
  result: RunResult;
  final: GridState;
  /** Instruksi penyebab tabrakan (untuk berkedip pelan). */
  bumpPath?: InstrPath;
  /** true bila eksekusi dihentikan karena melewati `MAX_STEPS`. */
  limitReached: boolean;
};

const DELTA: Record<Dir, Pos> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const TURN_LEFT: Record<Dir, Dir> = { up: 'left', left: 'down', down: 'right', right: 'up' };
const TURN_RIGHT: Record<Dir, Dir> = { up: 'right', right: 'down', down: 'left', left: 'up' };

const key = (x: number, y: number) => `${x},${y}`;

export function initialState(level: GridMoveLevel): GridState {
  return { pos: { x: level.start.x, y: level.start.y }, facing: level.start.facing, collected: [] };
}

/** Kunci state untuk solver: posisi + arah hadap + bintang yang diambil. */
export const stateKey = (s: GridState) =>
  `${s.pos.x},${s.pos.y},${s.facing}|${s.collected.join(';')}`;

class Halt {
  constructor(readonly result: 'goal' | 'bump') {}
}

/** Jalankan program dari state awal level. */
export function run(level: GridMoveLevel, program: Program): Trace {
  return execute(level, program, initialState(level));
}

/**
 * Jalankan program dari state tertentu (dipakai solver untuk makro).
 * Eksekusi berhenti saat Momo sampai tujuan, menabrak, atau melewati `maxSteps`.
 */
export function execute(
  level: GridMoveLevel,
  program: Program,
  from: GridState,
  maxSteps = MAX_STEPS,
): Trace {
  const { grid, goal } = level;
  const walls = new Set(grid.walls.map(([x, y]) => key(x, y)));
  const puddles = new Set(grid.puddles.map(([x, y]) => key(x, y)));
  const starCells = new Set(grid.stars.map(([x, y]) => key(x, y)));

  let pos = { ...from.pos };
  let facing = from.facing;
  const collected = new Set(from.collected);
  const steps: TraceStep[] = [];
  let bumpPath: InstrPath | undefined;
  let limitReached = false;

  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < grid.w && y < grid.h;
  const blocked = (x: number, y: number) => !inside(x, y) || walls.has(key(x, y));
  const ahead = (): Pos => ({ x: pos.x + DELTA[facing].x, y: pos.y + DELTA[facing].y });

  const record = (path: InstrPath, event?: GridEvent) => {
    steps.push({
      step: steps.length + 1,
      pos: { ...pos },
      facing,
      instrPath: path,
      ...(event && { event }),
    });
  };

  const tick = () => {
    if (steps.length >= maxSteps) {
      limitReached = true;
      throw new Halt('bump'); // ditangani sebagai 'incomplete' di bawah
    }
  };

  const arrived = () =>
    pos.x === goal.x &&
    pos.y === goal.y &&
    (!goal.collectAll || grid.stars.every(([x, y]) => collected.has(key(x, y))));

  const collectHere = (path: InstrPath): boolean => {
    const k = key(pos.x, pos.y);
    if (starCells.has(k) && !collected.has(k)) {
      collected.add(k);
      record(path, 'collect');
      return true;
    }
    return false;
  };

  /** Catat posisi baru: ambil bintang (bila ada), lalu cek tujuan. */
  const land = (path: InstrPath) => {
    const gotStar = collectHere(path);
    if (arrived()) {
      record(path, 'goal');
      throw new Halt('goal');
    }
    if (!gotStar) record(path);
  };

  const bump = (path: InstrPath) => {
    bumpPath = path;
    record(path, 'bump');
    throw new Halt('bump');
  };

  const step1 = (dir: Dir, path: InstrPath) => {
    tick();
    facing = dir;
    const next = { x: pos.x + DELTA[dir].x, y: pos.y + DELTA[dir].y };
    if (blocked(next.x, next.y) || puddles.has(key(next.x, next.y))) bump(path);
    pos = next;
    land(path);
  };

  const sense = (cond: Cond): boolean => {
    const a = ahead();
    let value: boolean;
    switch (cond.sensor) {
      case 'wall-ahead':
        value = blocked(a.x, a.y);
        break;
      case 'puddle-ahead':
        value = inside(a.x, a.y) && puddles.has(key(a.x, a.y));
        break;
      case 'star-here': {
        const k = key(pos.x, pos.y);
        value = starCells.has(k) && !collected.has(k);
        break;
      }
    }
    return cond.negate ? !value : value;
  };

  const exec = (instr: Instr, path: InstrPath) => {
    switch (instr.op) {
      case 'move':
        for (let i = 0; i < (instr.n ?? 1); i++) step1(instr.dir, path);
        return;
      case 'forward':
        for (let i = 0; i < (instr.n ?? 1); i++) step1(facing, path);
        return;
      case 'turn':
        tick();
        facing = instr.dir === 'left' ? TURN_LEFT[facing] : TURN_RIGHT[facing];
        record(path);
        return;
      case 'jump': {
        // Lompat 2 kotak ke arah hadap; kotak tengah boleh genangan, tidak boleh dinding.
        tick();
        const mid = ahead();
        const target = { x: mid.x + DELTA[facing].x, y: mid.y + DELTA[facing].y };
        if (
          blocked(mid.x, mid.y) ||
          blocked(target.x, target.y) ||
          puddles.has(key(target.x, target.y))
        ) {
          bump(path);
        }
        pos = target;
        land(path);
        return;
      }
      case 'pick':
        tick();
        land(path);
        return;
      case 'drop':
      case 'paint':
      case 'card':
        tick();
        record(path);
        return;
      case 'repeat':
        for (let r = 0; r < instr.n; r++) {
          instr.body.forEach((child, j) => exec(child, [...path, j]));
        }
        return;
      case 'if': {
        const branch = sense(instr.cond) ? 0 : 1;
        const body = branch === 0 ? instr.then : (instr.else ?? []);
        body.forEach((child, j) => exec(child, [...path, branch, j]));
        return;
      }
    }
  };

  let result: RunResult = 'incomplete';
  try {
    program.forEach((instr, i) => exec(instr, [i]));
  } catch (err) {
    if (!(err instanceof Halt)) throw err;
    result = limitReached ? 'incomplete' : err.result;
  }

  return {
    steps,
    result,
    final: { pos, facing, collected: [...collected].sort() },
    ...(bumpPath && { bumpPath }),
    limitReached,
  };
}
