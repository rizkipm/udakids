import { describe, expect, it } from 'vitest';
import {
  analyzeGridLevel,
  cardCount,
  primitivesOf,
  run,
  solveGrid,
  usesRepeat,
} from '../src/index.js';
import { gridLevel } from './helpers.js';

describe('solveGrid — tanpa repeat (BFS)', () => {
  it('menemukan solusi terpendek dan solusinya benar-benar sampai', () => {
    const lvl = gridLevel({
      grid: {
        w: 5,
        h: 5,
        walls: [
          [2, 1],
          [2, 2],
        ],
      },
      start: { x: 0, y: 4, facing: 'up' },
      goal: { x: 4, y: 0 },
    });
    const sol = solveGrid(lvl);
    expect(sol?.cards).toBe(8);
    expect(run(lvl, sol!.program).result).toBe('goal');
  });

  it('memutar di sekitar dinding', () => {
    // Dinding vertikal x=1 di y=0..1 — harus turun dulu.
    const lvl = gridLevel({
      grid: {
        walls: [
          [1, 0],
          [1, 1],
        ],
      },
    });
    const sol = solveGrid(lvl);
    expect(sol?.cards).toBe(6);
    expect(run(lvl, sol!.program).result).toBe('goal');
  });

  it('null bila tujuan tertutup dinding', () => {
    const lvl = gridLevel({
      grid: {
        walls: [
          [1, 0],
          [1, 1],
          [1, 2],
        ],
      },
    });
    expect(solveGrid(lvl)).toBeNull();
  });

  it('null bila maxCards terlalu kecil', () => {
    expect(solveGrid(gridLevel({ maxCards: 1 }))).toBeNull();
  });

  it('menghormati palette (tanpa panah kanan tidak bisa ke kanan)', () => {
    expect(solveGrid(gridLevel({ palette: ['up', 'down', 'left'] }))).toBeNull();
  });

  it('collectAll memaksa mengambil bintang', () => {
    const lvl = gridLevel({ grid: { stars: [[1, 2]] }, goal: { collectAll: true } });
    const sol = solveGrid(lvl);
    expect(sol?.cards).toBe(6);
    expect(run(lvl, sol!.program).final.collected).toEqual(['1,2']);
  });

  it('forward/turn dan jump di palette Intermediate', () => {
    const lvl = gridLevel({
      tier: 'intermediate',
      palette: ['forward', 'turn-right', 'jump'],
      grid: { puddles: [[1, 0]] },
      goal: { x: 2, y: 0 },
    });
    expect(primitivesOf(lvl)).toHaveLength(3);
    expect(solveGrid(lvl)?.program).toEqual([{ op: 'jump' }]);
  });
});

describe('solveGrid — dengan repeat', () => {
  const corridor = (over = {}) =>
    gridLevel({
      tier: 'intermediate',
      grid: { w: 8, h: 2 },
      goal: { x: 7, y: 0 },
      palette: ['right', 'down', 'repeat'],
      skills: ['loop'],
      maxCards: 4,
      ...over,
    });

  it('memakai repeat untuk koridor panjang', () => {
    const sol = solveGrid(corridor());
    expect(sol?.cards).toBe(2);
    expect(usesRepeat(sol!.program)).toBe(true);
    expect(run(corridor(), sol!.program).result).toBe('goal');
  });

  it('allowRepeat: false → tidak ada solusi dalam 4 kartu', () => {
    expect(solveGrid(corridor(), { allowRepeat: false })).toBeNull();
  });

  it('menggabungkan repeat dengan langkah biasa', () => {
    const lvl = corridor({ grid: { w: 8, h: 2 }, goal: { x: 7, y: 1 } });
    const sol = solveGrid(lvl);
    expect(sol?.cards).toBe(3);
    expect(cardCount(sol!.program)).toBe(3);
    expect(run(lvl, sol!.program).result).toBe('goal');
  });

  it('opsi maxRepeatN & maxBodyLen membatasi pencarian', () => {
    expect(solveGrid(corridor(), { maxRepeatN: 2 })).toBeNull();
    expect(solveGrid(corridor(), { maxRepeatN: 2, maxBodyLen: 1 })).toBeNull();
    expect(solveGrid(corridor({ maxCards: 1 }))).toBeNull();
  });
});

describe('analyzeGridLevel', () => {
  it('level biasa: solvable + optimalSteps, bukan jalan pintas', () => {
    const a = analyzeGridLevel(gridLevel());
    expect(a).toMatchObject({ solvable: true, optimalSteps: 2, shortcut: false });
  });

  it('level tak terselesaikan', () => {
    const a = analyzeGridLevel(gridLevel({ maxCards: 1 }));
    expect(a.solvable).toBe(false);
    expect(a.optimalSteps).toBeUndefined();
  });

  it('deteksi jalan pintas: skill loop tapi bisa tanpa repeat', () => {
    const lvl = gridLevel({
      tier: 'intermediate',
      skills: ['loop'],
      palette: ['right', 'repeat'],
      maxCards: 4,
    });
    const a = analyzeGridLevel(lvl);
    expect(a.shortcut).toBe(true);
    expect(a.flatSolution?.cards).toBe(2);
  });

  it('level loop yang benar: tidak ada solusi datar', () => {
    const lvl = gridLevel({
      tier: 'intermediate',
      skills: ['loop'],
      palette: ['right', 'repeat'],
      grid: { w: 8, h: 2 },
      goal: { x: 7, y: 0 },
      maxCards: 3,
    });
    const a = analyzeGridLevel(lvl);
    expect(a).toMatchObject({
      solvable: true,
      optimalSteps: 2,
      shortcut: false,
      flatSolution: null,
    });
  });
});
