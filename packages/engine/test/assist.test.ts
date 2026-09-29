import { describe, expect, it } from 'vitest';
import { assistAfterFailure, evaluate, firstStep, skipAheadTarget } from '../src/index.js';
import { gridLevel, level } from './helpers.js';

const lvl = gridLevel();
const bumped = evaluate(lvl, { type: 'grid-move', program: [{ op: 'move', dir: 'up' }] });

describe('bantuan bertahap (PRD A8)', () => {
  it('gagal 1× → belum ada bantuan', () => {
    expect(assistAfterFailure(lvl, 1, bumped)).toBeNull();
  });

  it('gagal 2× → sorot instruksi yang keliru', () => {
    expect(assistAfterFailure(lvl, 2, bumped)).toEqual({
      hintLevel: 1,
      kind: 'highlight',
      path: [0],
    });
  });

  it('sorotan tanpa path bila tidak bisa ditentukan', () => {
    const empty = evaluate(lvl, { type: 'grid-move', program: [] });
    expect(assistAfterFailure(lvl, 2, empty)).toEqual({ hintLevel: 1, kind: 'highlight' });
  });

  it('gagal 3× → Momo mencontohkan langkah pertama solusi', () => {
    expect(assistAfterFailure(lvl, 3, bumped)).toEqual({
      hintLevel: 2,
      kind: 'demo-first-step',
      instr: { op: 'move', dir: 'right' },
    });
  });

  it('gagal 4× → tidak mengulang bantuan; 5× → tawarkan varian lebih mudah', () => {
    expect(assistAfterFailure(lvl, 4, bumped)).toBeNull();
    expect(assistAfterFailure(lvl, 5, bumped)).toEqual({
      hintLevel: 3,
      kind: 'offer-easier-variant',
    });
  });
});

describe('firstStep', () => {
  it('sequence-cards & pattern: kartu pertama jawaban', () => {
    expect(
      firstStep(level({ type: 'sequence-cards', cards: ['a', 'b'], validOrders: [['b', 'a']] })),
    ).toEqual({ op: 'card', id: 'b' });
    expect(
      firstStep(
        level({
          type: 'pattern',
          sequence: ['a', 'b', null],
          choices: ['a', 'b'],
          answers: [['a']],
        }),
      ),
    ).toEqual({ op: 'card', id: 'a' });
  });

  it('classify dan level tak terselesaikan: tidak ada contoh', () => {
    expect(
      firstStep(
        level({
          type: 'classify',
          groups: ['x', 'y'],
          items: [
            { id: 'a', group: 'x' },
            { id: 'b', group: 'y' },
          ],
        }),
      ),
    ).toBeUndefined();
    expect(firstStep(gridLevel({ maxCards: 1 }))).toBeUndefined();
  });

  it('demo tanpa instr bila tidak ada contoh', () => {
    const cls = level({ type: 'number', mode: 'count', answer: 1, choices: [1, 2] });
    expect(assistAfterFailure(cls, 3, evaluate(cls, { type: 'number', value: 2 }))).toEqual({
      hintLevel: 2,
      kind: 'demo-first-step',
    });
  });
});

describe('lompat maju (PRD A8)', () => {
  const world = Array.from({ length: 10 }, (_, i) => ({
    id: `w2-l${String(i + 1).padStart(2, '0')}`,
    index: i + 1,
    role: i === 8 ? ('challenge' as const) : ('practice' as const),
  }));
  const done = (n: number, stars: 0 | 1 | 2 | 3 = 3, hintsUsed = 0) => ({
    levelId: `w2-l0${n}`,
    stars,
    hintsUsed,
  });

  it('3 level berturut-turut bintang 3 tanpa petunjuk → tawarkan challenge', () => {
    expect(skipAheadTarget([done(1), done(2), done(3)], world)).toBe('w2-l09');
  });

  it('kurang dari 3 level → tidak', () => {
    expect(skipAheadTarget([done(1), done(2)], world)).toBeNull();
  });

  it('ada bintang < 3 atau petunjuk di 3 terakhir → tidak', () => {
    expect(skipAheadTarget([done(1), done(2, 2), done(3)], world)).toBeNull();
    expect(skipAheadTarget([done(1), done(2), done(3, 3, 1)], world)).toBeNull();
  });

  it('challenge sudah dimainkan atau sudah terlewati → tidak', () => {
    const played = { levelId: 'w2-l09', stars: 3 as const, hintsUsed: 0 };
    expect(skipAheadTarget([done(1), done(2), played], world)).toBeNull();
    const after = { levelId: 'w2-l10', stars: 3 as const, hintsUsed: 0 };
    expect(skipAheadTarget([done(1), done(2), after], world)).toBeNull();
  });

  it('dunia tanpa level challenge → tidak', () => {
    const noChallenge = world.map((l) => ({ ...l, role: 'practice' as const }));
    expect(skipAheadTarget([done(1), done(2), done(3)], noChallenge)).toBeNull();
  });

  it('level yang tidak dikenal dianggap indeks 0', () => {
    const unknown = { levelId: 'w9-l01', stars: 3 as const, hintsUsed: 0 };
    expect(skipAheadTarget([unknown, unknown, unknown], world)).toBe('w2-l09');
  });
});
