import { describe, expect, it } from 'vitest';
import { levelSchema } from '../src/index.js';
import { levelInput } from './helpers.js';

const grid = (over: Record<string, unknown> = {}, gridOver: Record<string, unknown> = {}) =>
  levelInput({
    id: 'w2-l01',
    world: 2,
    type: 'grid-move',
    grid: { w: 3, h: 3, ...gridOver },
    start: { x: 0, y: 0, facing: 'right' },
    goal: { x: 2, y: 0 },
    palette: ['up', 'down', 'left', 'right'],
    maxCards: 5,
    ...over,
  });

/** Pesan-pesan masalah; [] bila valid. */
const problems = (data: unknown) => {
  const r = levelSchema.safeParse(data);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('grid-move', () => {
  it('valid + default terisi', () => {
    const lvl = levelSchema.parse(grid());
    expect(lvl.type === 'grid-move' && lvl.stars).toEqual({
      optimalSteps: 'auto',
      hintsAllowedFor2Stars: 0,
    });
  });

  it('Basic menolak belok relatif (PRD A17)', () => {
    expect(problems(grid({ palette: ['forward', 'turn-left', 'up'] })).join()).toMatch(
      /belok relatif/,
    );
  });

  it('Intermediate boleh belok relatif', () => {
    expect(
      problems(grid({ tier: 'intermediate', palette: ['forward', 'turn-left', 'turn-right'] })),
    ).toEqual([]);
  });

  it('Basic maksimal 4 jenis kartu', () => {
    expect(problems(grid({ palette: ['up', 'down', 'left', 'right', 'jump'] })).join()).toMatch(
      /maksimal 4/,
    );
  });

  it('palette duplikat', () => {
    expect(problems(grid({ palette: ['up', 'up'] })).join()).toMatch(/duplikat/);
  });

  it('posisi di luar grid atau di atas dinding', () => {
    const out = problems(
      grid(
        { start: { x: 5, y: 0, facing: 'up' }, goal: { x: 1, y: 1 } },
        {
          walls: [
            [9, 9],
            [1, 1],
          ],
          stars: [
            [7, 7],
            [1, 1],
          ],
          puddles: [[4, 4]],
        },
      ),
    );
    expect(out).toEqual(
      expect.arrayContaining([
        'grid.walls.0: di luar grid',
        'grid.stars.0: di luar grid',
        'grid.stars.1: bintang di atas dinding',
        'grid.puddles.0: di luar grid',
        'start: di luar grid',
        'goal: tujuan di atas dinding',
      ]),
    );
  });

  it('start di dinding, goal di luar, goal = start', () => {
    expect(problems(grid({}, { walls: [[0, 0]] }))).toContain('start: start di atas dinding');
    expect(problems(grid({ goal: { x: 3, y: 0 } }))).toContain('goal: di luar grid');
    expect(problems(grid({ goal: { x: 0, y: 0 } }))).toContain('goal: tujuan sama dengan start');
  });

  it('grid lebih dari 8×8 ditolak; field tak dikenal ditolak', () => {
    expect(problems(grid({}, { w: 9 })).length).toBeGreaterThan(0);
    expect(problems(grid({ warna: 'merah' })).length).toBeGreaterThan(0);
  });
});

describe('sequence-cards', () => {
  const seq = (over: Record<string, unknown>) =>
    levelInput({
      type: 'sequence-cards',
      cards: ['a', 'b', 'c'],
      validOrders: [['a', 'b', 'c']],
      ...over,
    });

  it('valid', () => expect(problems(seq({}))).toEqual([]));

  it('urutan harus memakai setiap kartu tepat sekali', () => {
    expect(problems(seq({ validOrders: [['a', 'b']] }))).toContain(
      'validOrders.0: harus memakai setiap kartu di `cards` tepat satu kali',
    );
  });

  it('duplikat kartu / urutan, pengecoh di cards', () => {
    const out = problems(
      seq({
        cards: ['a', 'a', 'b'],
        validOrders: [
          ['a', 'a', 'b'],
          ['a', 'a', 'b'],
        ],
        distractors: ['b'],
      }),
    );
    expect(out).toEqual(
      expect.arrayContaining([
        'cards: kartu duplikat',
        'validOrders: urutan duplikat',
        'distractors.0: pengecoh tidak boleh ada di `cards`',
      ]),
    );
  });
});

describe('pattern', () => {
  const pat = (over: Record<string, unknown>) =>
    levelInput({
      type: 'pattern',
      sequence: ['a', 'b', 'a', null],
      choices: ['a', 'b'],
      answers: [['b']],
      ...over,
    });

  it('valid', () => expect(problems(pat({}))).toEqual([]));

  it('tanpa kotak kosong, isian salah jumlah / di luar pilihan, pilihan duplikat', () => {
    expect(problems(pat({ sequence: ['a', 'b', 'a'] }))).toContain(
      'sequence: harus ada minimal satu kotak kosong (null)',
    );
    expect(problems(pat({ answers: [['b', 'a']] }))).toContain('answers.0: harus berisi 1 isian');
    expect(problems(pat({ answers: [['c']] }))).toContain(
      'answers.0: isian harus ada di `choices`',
    );
    expect(problems(pat({ choices: ['a', 'a', 'b'] }))).toContain('choices: pilihan duplikat');
  });

  it('Basic maksimal 4 pilihan', () => {
    expect(problems(pat({ choices: ['a', 'b', 'c', 'd', 'e'] })).join()).toMatch(/maksimal 4/);
  });
});

describe('classify', () => {
  const cls = (over: Record<string, unknown>) =>
    levelInput({
      type: 'classify',
      groups: ['x', 'y'],
      items: [
        { id: 'a', group: 'x' },
        { id: 'b', group: 'y' },
      ],
      ...over,
    });

  it('valid', () => expect(problems(cls({}))).toEqual([]));

  it('kelompok tak dikenal, kosong, atau duplikat; benda duplikat', () => {
    const out = problems(
      cls({
        groups: ['x', 'x', 'z'],
        items: [
          { id: 'a', group: 'x' },
          { id: 'a', group: 'q' },
        ],
      }),
    );
    expect(out).toEqual(
      expect.arrayContaining([
        'groups: kelompok duplikat',
        'items: id benda duplikat',
        'items.1.group: kelompok tidak dikenal',
        'groups.2: kelompok tanpa benda',
      ]),
    );
  });
});

describe('number & predict', () => {
  it('number: jawaban di pilihan, tanpa duplikat, Basic ≤ 4', () => {
    const num = (over: Record<string, unknown>) =>
      levelInput({ type: 'number', mode: 'count', answer: 3, choices: [2, 3], ...over });
    expect(problems(num({}))).toEqual([]);
    expect(problems(num({ choices: [1, 2] }))).toContain('choices: jawaban harus ada di pilihan');
    expect(problems(num({ choices: [3, 3] }))).toContain('choices: pilihan duplikat');
    expect(problems(num({ choices: [1, 2, 3, 4, 5] })).join()).toMatch(/maksimal 4/);
  });

  it('predict: hasil harus salah satu pilihan', () => {
    const pre = (over: Record<string, unknown>) =>
      levelInput({ type: 'predict', options: ['a', 'b'], outcome: 'a', ...over });
    expect(problems(pre({}))).toEqual([]);
    expect(problems(pre({ outcome: 'c' }))).toContain('outcome: hasil harus salah satu pilihan');
    expect(problems(pre({ options: ['a', 'a'] }))).toContain('options: pilihan duplikat');
  });
});
