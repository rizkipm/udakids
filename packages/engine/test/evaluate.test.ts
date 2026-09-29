import { describe, expect, it } from 'vitest';
import { cardsProgram, evaluate, hasEfficiency } from '../src/index.js';
import { gridLevel, level } from './helpers.js';

const roti = level({
  type: 'sequence-cards',
  cards: ['ambil-piring', 'ambil-roti', 'oles-selai', 'siap-dimakan'],
  validOrders: [
    ['ambil-piring', 'ambil-roti', 'oles-selai', 'siap-dimakan'],
    ['ambil-roti', 'ambil-piring', 'oles-selai', 'siap-dimakan'],
  ],
  distractors: ['cuci-tangan'],
});

describe('sequence-cards', () => {
  it('menerima lebih dari satu urutan benar', () => {
    for (const order of [
      ['ambil-piring', 'ambil-roti', 'oles-selai', 'siap-dimakan'],
      ['ambil-roti', 'ambil-piring', 'oles-selai', 'siap-dimakan'],
    ]) {
      expect(
        evaluate(roti, { type: 'sequence-cards', program: cardsProgram(order) }),
      ).toMatchObject({
        outcome: 'goal',
        solved: true,
        cardsUsed: 4,
      });
    }
  });

  it('awalan benar tapi belum lengkap → incomplete', () => {
    const e = evaluate(roti, {
      type: 'sequence-cards',
      program: cardsProgram(['ambil-roti', 'ambil-piring']),
    });
    expect(e).toMatchObject({ outcome: 'incomplete', solved: false });
    expect(e.faultyPath).toBeUndefined();
  });

  it('kartu keliru → wrong + sorot kartu pertama yang menyimpang', () => {
    const e = evaluate(roti, {
      type: 'sequence-cards',
      program: cardsProgram(['ambil-piring', 'oles-selai', 'ambil-roti', 'siap-dimakan']),
    });
    expect(e).toMatchObject({ outcome: 'wrong', faultyPath: [1] });
  });

  it('kartu pengecoh di akhir → wrong dan tersorot', () => {
    const e = evaluate(roti, {
      type: 'sequence-cards',
      program: cardsProgram([
        'ambil-piring',
        'ambil-roti',
        'oles-selai',
        'siap-dimakan',
        'cuci-tangan',
      ]),
    });
    expect(e).toMatchObject({ outcome: 'wrong', faultyPath: [4] });
  });
});

describe('pattern', () => {
  const pola = level({
    type: 'pattern',
    sequence: ['merah', 'biru', 'merah', null, null],
    choices: ['merah', 'biru', 'kuning'],
    answers: [['biru', 'merah']],
  });

  it('isian benar', () => {
    expect(
      evaluate(pola, { type: 'pattern', program: cardsProgram(['biru', 'merah']) }).solved,
    ).toBe(true);
  });

  it('isian keliru', () => {
    expect(evaluate(pola, { type: 'pattern', program: cardsProgram(['kuning']) })).toMatchObject({
      outcome: 'wrong',
      faultyPath: [0],
    });
  });
});

describe('classify', () => {
  const kelompok = level({
    type: 'classify',
    groups: ['hidup', 'tak-hidup'],
    items: [
      { id: 'kucing', group: 'hidup' },
      { id: 'batu', group: 'tak-hidup' },
    ],
  });

  it('semua di kelompok yang tepat', () => {
    const e = evaluate(kelompok, {
      type: 'classify',
      assignment: { kucing: 'hidup', batu: 'tak-hidup' },
    });
    expect(e).toMatchObject({ outcome: 'goal', solved: true });
    expect(e.misplaced).toBeUndefined();
  });

  it('belum semua ditempatkan → incomplete', () => {
    expect(evaluate(kelompok, { type: 'classify', assignment: { kucing: 'hidup' } })).toMatchObject(
      {
        outcome: 'incomplete',
        misplaced: ['batu'],
      },
    );
  });

  it('salah tempat → wrong + daftar benda', () => {
    expect(
      evaluate(kelompok, {
        type: 'classify',
        assignment: { kucing: 'tak-hidup', batu: 'tak-hidup' },
      }),
    ).toMatchObject({ outcome: 'wrong', misplaced: ['kucing'] });
  });
});

describe('number & predict', () => {
  const hitung = level({
    type: 'number',
    mode: 'count',
    object: 'apel',
    answer: 3,
    choices: [2, 3, 4],
  });
  const tebak = level({
    type: 'predict',
    focus: 'science',
    options: ['tenggelam', 'terapung'],
    outcome: 'terapung',
  });

  it('number', () => {
    expect(evaluate(hitung, { type: 'number', value: 3 }).solved).toBe(true);
    expect(evaluate(hitung, { type: 'number', value: 4 }).outcome).toBe('wrong');
  });

  it('predict', () => {
    expect(evaluate(tebak, { type: 'predict', choice: 'terapung' }).solved).toBe(true);
    expect(evaluate(tebak, { type: 'predict', choice: 'tenggelam' }).outcome).toBe('wrong');
  });

  it('jawaban tipe lain ditolak', () => {
    expect(() => evaluate(hitung, { type: 'predict', choice: 'x' })).toThrow(/tidak cocok/);
  });
});

describe('grid-move', () => {
  const R = { op: 'move', dir: 'right' } as const;

  it('goal membawa trace dan jumlah kartu', () => {
    const e = evaluate(gridLevel(), { type: 'grid-move', program: [R, R] });
    expect(e).toMatchObject({ outcome: 'goal', solved: true, cardsUsed: 2 });
    expect(e.trace?.steps).toHaveLength(2);
  });

  it('bump → faultyPath = instruksi penyebab', () => {
    const e = evaluate(gridLevel(), { type: 'grid-move', program: [R, { op: 'move', dir: 'up' }] });
    expect(e).toMatchObject({ outcome: 'bump', faultyPath: [1] });
  });

  it('incomplete → sorot instruksi terakhir yang dijalankan', () => {
    const e = evaluate(gridLevel(), { type: 'grid-move', program: [{ op: 'move', dir: 'down' }] });
    expect(e).toMatchObject({ outcome: 'incomplete', faultyPath: [0] });
  });

  it('incomplete dari repeat → sorot blok tingkat atas', () => {
    const e = evaluate(gridLevel({ goal: { x: 2, y: 2 } }), {
      type: 'grid-move',
      program: [{ op: 'repeat', n: 2, body: [{ op: 'move', dir: 'down' }] }],
    });
    expect(e.faultyPath).toEqual([0]);
  });

  it('program tanpa langkah → faultyPath = instruksi terakhir; program kosong → tanpa sorotan', () => {
    const e = evaluate(gridLevel(), {
      type: 'grid-move',
      program: [{ op: 'if', cond: { sensor: 'wall-ahead' }, then: [R] }],
    });
    expect(e.faultyPath).toEqual([0]);
    expect(evaluate(gridLevel(), { type: 'grid-move', program: [] }).faultyPath).toBeUndefined();
  });

  it('hanya grid yang punya konsep hemat', () => {
    expect(hasEfficiency(gridLevel())).toBe(true);
    expect(
      hasEfficiency(level({ type: 'number', mode: 'count', answer: 1, choices: [1, 2] })),
    ).toBe(false);
  });
});
