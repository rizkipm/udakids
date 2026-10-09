import { describe, expect, it } from 'vitest';
import {
  bingoReplay,
  checkAnswer,
  fromDigits,
  gameMistakes,
  generateItem,
  guessBudget,
  guessHints,
  guessReplay,
  guessSolution,
  isRetryGame,
  linesCounts,
  magicReplay,
  skillTemplateSchema,
  stackSolution,
  stackValue,
  TAP_GAMES,
  type GuessGame,
  type Interaction,
} from '../src/index.js';

/** 6 game Kelas 4 (D-096): penilaian dihitung ulang dari ketukan, tanpa batas waktu. */
const guess = (over: Partial<GuessGame> = {}): GuessGame & { type: 'guess' } => ({
  type: 'guess',
  min: 1,
  max: 100,
  secret: 37,
  hint: 'number',
  digits: 3,
  maxGuesses: guessBudget(1, 100, 'number'),
  ...over,
});

describe('Tebak Angka Momo', () => {
  it('petunjuk bilangan utuh & per nilai tempat', () => {
    expect(guessHints(guess(), 50)).toEqual(['turun']);
    expect(guessHints(guess(), 37)).toEqual(['tepat']);
    const d = guess({ min: 1000, max: 9999, secret: 4725, hint: 'digit', digits: 4 });
    expect(guessHints(d, 5715)).toEqual(['turun', 'tepat', 'naik', 'tepat']);
    expect(fromDigits([4, 7, 2, 5])).toBe(4725);
  });

  it('tebakan mengikuti petunjuk tidak dihitung keliru; mengabaikan petunjuk dihitung', () => {
    const g = guess();
    expect(guessReplay(g, ['50', '25', '37'])).toMatchObject({ slips: 0, done: true });
    // 60 > 50 padahal Momo sudah bilang lebih kecil.
    expect(guessReplay(g, ['50', '60', '37'])).toMatchObject({ slips: 1, done: true });
    expect(guessReplay(g, ['abc', '0', '37'])).toMatchObject({ slips: 2, done: true });
    expect(guessReplay(g, ['37', '99']).done).toBe(true);
    // Melebihi batas tebakan.
    const many = Array.from({ length: 9 }, (_, i) => String(i + 1)).concat('37');
    expect(guessReplay(g, many).slips).toBeGreaterThan(0);
    const d = guess({ min: 1000, max: 9999, secret: 4725, hint: 'digit', digits: 4 });
    expect(guessReplay(d, ['5715', '6725']).slips).toBe(1);
    expect(guessReplay(d, guessSolution(d)).done).toBe(true);
  });

  it('jawaban contoh selalu menemukan rahasia dalam batas', () => {
    for (const secret of [1, 50, 100, 77])
      expect(guessSolution(guess({ secret })).at(-1)).toBe(String(secret));
    const d = guess({ min: 100, max: 999, secret: 905, hint: 'digit', digits: 3 });
    expect(guessSolution(d).length).toBeLessThanOrEqual(d.maxGuesses);
    expect(TAP_GAMES.has('guess')).toBe(true);
    expect(checkAnswer({ interaction: guess() }, ['50', '60', '70', '37'])).toMatchObject({
      correct: false,
      mistakes: 2,
    });
    expect(checkAnswer({ interaction: guess() }, ['50', '25', '37']).points).toBe(10);
  });
});

describe('Penyihir Hitung & Bingo Rupiah', () => {
  const facts = [
    { id: 'f0', answer: 'c1', choices: [{ id: 'c0' }, { id: 'c1' }] },
    { id: 'f1', answer: 'c0', choices: [{ id: 'c0' }, { id: 'c1' }] },
  ];
  it('ketukan keliru dihitung; selesai bila semua fakta terjawab', () => {
    expect(magicReplay(facts, ['f0:c1', 'f1:c0'])).toEqual({ solved: 2, slips: 0, done: true });
    expect(magicReplay(facts, ['f0:c0', 'f0:c1', 'f1:c0', 'x'])).toMatchObject({
      slips: 1,
      done: true,
    });
    const calls = [{ answer: 's0' }, { answer: 's4' }, { answer: 's8' }];
    expect(bingoReplay(calls, ['s0', 's1', 's4', 's8'])).toEqual({
      marked: 3,
      slips: 1,
      done: true,
    });
    expect(bingoReplay(calls, ['s0', 's8', 's8']).done).toBe(false);
  });
});

describe('Tumpuk Angka, Garis Perkalian, Diagram Ajaib', () => {
  const blocks = [
    { id: 'a', value: 4 },
    { id: 'b', value: 6 },
    { id: 'c', value: 3 },
  ];
  it('tumpukan: tiap balok sekali; jumlah atau hasil kali', () => {
    expect(stackValue('+', blocks, ['a', 'b'])).toBe(10);
    expect(stackValue('×', blocks, ['a', 'c'])).toBe(12);
    expect(stackValue('+', blocks, ['a', 'a'])).toBeUndefined();
    expect(stackValue('+', blocks, ['z'])).toBeUndefined();
    expect(stackValue('+', blocks, [])).toBeUndefined();
    expect(stackSolution('+', blocks, 13, 3)).toEqual(['a', 'b', 'c']);
    expect(stackSolution('+', blocks, 100, 3)).toBeUndefined();
  });

  it('garis perkalian: titik potong per nilai tempat', () => {
    expect(linesCounts(12, 13)).toEqual({ ratusan: 1, puluhan: 5, satuan: 6 });
    expect(linesCounts(3, 21)).toEqual({ ratusan: 0, puluhan: 6, satuan: 3 });
  });

  it('game tombol Selesai: jawaban keliru diterima sebagai salah (boleh dibetulkan sekali)', () => {
    const chart: Interaction = {
      type: 'chart',
      title: 'Uji',
      unit: 'anak',
      scale: 2,
      steps: 5,
      bars: [
        { id: 'b0', label: 'a', value: 4, visual: { kind: 'word', text: 'a' } },
        { id: 'b1', label: 'b', value: 6, visual: { kind: 'word', text: 'b' } },
        { id: 'b2', label: 'c', value: 2, visual: { kind: 'word', text: 'c' } },
      ],
    };
    expect(isRetryGame(chart)).toBe(true);
    expect(checkAnswer({ interaction: chart }, { b0: '4', b1: '6', b2: '2' }).correct).toBe(true);
    expect(checkAnswer({ interaction: chart }, { b0: '4', b1: '6' }).correct).toBe(false);
    expect(checkAnswer({ interaction: chart }, ['4']).correct).toBe(false);
    const lines: Interaction = { type: 'lines', a: 12, b: 13 };
    expect(
      checkAnswer({ interaction: lines }, { ratusan: '1', puluhan: '5', satuan: '6' }).correct,
    ).toBe(true);
    expect(
      checkAnswer({ interaction: lines }, { ratusan: '1', puluhan: '6', satuan: '6' }).correct,
    ).toBe(false);
    expect(checkAnswer({ interaction: lines }, 'x').correct).toBe(false);
    const stack: Interaction = {
      type: 'stack',
      op: '+',
      target: 10,
      maxBlocks: 2,
      blocks: blocks.map((b) => ({ ...b, visual: { kind: 'word', text: String(b.value) } })),
    };
    expect(checkAnswer({ interaction: stack }, ['a', 'b']).correct).toBe(true);
    expect(checkAnswer({ interaction: stack }, ['a', 'c']).correct).toBe(false);
    expect(gameMistakes(stack, ['a'])).toBeUndefined();
  });

  it('generator menolak konfigurasi yang tidak bisa dimainkan', () => {
    const t = (family: string, params: unknown) =>
      skillTemplateSchema.parse({
        id: `uji.${family}`,
        version: 1,
        domain: 'math',
        grade: 'sd4',
        category: 'GM',
        order: 1,
        title: 'Uji',
        tier: 'advanced',
        family,
        params,
      });
    expect(() =>
      generateItem(t('guess-game', { range: [1000, 5000], hint: 'digit' }), { seed: 1, band: 0 }),
    ).toThrow();
    expect(() =>
      generateItem(t('lines-game', { a: [10, 10], b: [11, 11] }), { seed: 1, band: 0 }),
    ).toThrow();
    expect(() =>
      generateItem(t('stack-game', { values: [1, 3], blocks: 6 }), { seed: 1, band: 0 }),
    ).toThrow();
  });
});
