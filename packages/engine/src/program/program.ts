import type { GridCard } from '../levels/schema.js';
import type { Instr, Program } from './types.js';

/**
 * Jumlah kartu yang dipakai program — dasar `maxCards` dan bintang 3.
 * `move`/`forward` dengan `n` dihitung n kartu (satu kartu panah = satu langkah), sehingga
 * "maju tiga" lewat suara tidak lebih hemat daripada tiga kartu. Blok `repeat`/`if` = 1 + isinya.
 */
export function cardCount(program: Program): number {
  let total = 0;
  for (const instr of program) {
    switch (instr.op) {
      case 'move':
      case 'forward':
        total += instr.n ?? 1;
        break;
      case 'repeat':
        total += 1 + cardCount(instr.body);
        break;
      case 'if':
        total += 1 + cardCount(instr.then) + cardCount(instr.else ?? []);
        break;
      default:
        total += 1;
    }
  }
  return total;
}

/** Apakah program memakai `repeat` di mana pun. */
export function usesRepeat(program: Program): boolean {
  return program.some(
    (i) => i.op === 'repeat' || (i.op === 'if' && (usesRepeat(i.then) || usesRepeat(i.else ?? []))),
  );
}

/** Kartu palette grid → instruksi. `repeat` bukan instruksi tunggal (lihat `makeRepeat`). */
export function gridCardToInstr(card: Exclude<GridCard, 'repeat'>): Instr {
  switch (card) {
    case 'up':
    case 'down':
    case 'left':
    case 'right':
      return { op: 'move', dir: card };
    case 'forward':
      return { op: 'forward' };
    case 'turn-left':
      return { op: 'turn', dir: 'left' };
    case 'turn-right':
      return { op: 'turn', dir: 'right' };
    case 'jump':
      return { op: 'jump' };
    case 'pick':
      return { op: 'pick' };
  }
}

export const makeRepeat = (n: number, body: Instr[]): Instr => ({ op: 'repeat', n, body });

/** Program dari daftar id kartu (puzzle susun urutan / pola). */
export const cardsProgram = (ids: readonly string[]): Program =>
  ids.map((id) => ({ op: 'card', id }));

/** Id kartu dari program `card` (instruksi lain diabaikan). */
export const programCardIds = (program: Program): string[] =>
  program.flatMap((i) => (i.op === 'card' ? [i.id] : []));

// ---- Edit Buku Catatan (immutable) ----

export const appendInstr = (program: Program, instr: Instr): Program => [...program, instr];

export const removeInstr = (program: Program, index: number): Program =>
  program.filter((_, i) => i !== index);

export const replaceInstr = (program: Program, index: number, instr: Instr): Program =>
  program.map((x, i) => (i === index ? instr : x));

export function swapInstr(program: Program, a: number, b: number): Program {
  if (a < 0 || b < 0 || a >= program.length || b >= program.length) return program;
  const next = [...program];
  [next[a], next[b]] = [next[b]!, next[a]!];
  return next;
}
