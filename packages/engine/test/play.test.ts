import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildCrossword,
  checkAnswer,
  gameOver,
  isRetryGame,
  itemPoints,
  mazePath,
  roundPassed,
  roundScore,
  validRoundPoints,
  contestSafeTemplate,
  mockSources,
  createRng,
  crosswordLetters,
  crosswordReplay,
  crosswordSolution,
  fewestTokens,
  generateItem,
  hopReplay,
  jigsawReplay,
  jigsawSolution,
  skillTemplateSchema,
  sortReplay,
  sumOf,
  sumSolution,
  type Item,
} from '../src/index.js';

const tokens = [
  { id: 't1', value: 1 },
  { id: 't2', value: 2 },
  { id: 't5', value: 5 },
];

describe('game seru (D-078): penilaian dari ketukan', () => {
  it('jumlah token & token paling sedikit', () => {
    expect(sumOf(tokens, ['t5', 't2', 't2'])).toBe(9);
    expect(sumOf(tokens, ['t9'])).toBeUndefined();
    expect(fewestTokens([1, 2, 5], 9)).toBe(3);
    expect(fewestTokens([2], 3)).toBe(Infinity);
    expect(sumOf(tokens, sumSolution(tokens, 9)!)).toBe(9);
    expect(sumSolution([{ id: 'a', value: 2 }], 3)).toBeNull();
  });

  it('neraca: benar hanya bila tepat seimbang dan dalam batas token', () => {
    const sum = (target: number, given: number, maxTokens = 10) =>
      ({
        interaction: {
          type: 'sum',
          style: 'balance',
          target,
          given,
          tokens,
          show: { kind: 'numeral', value: target },
          maxTokens,
        },
      }) as Pick<Item, 'interaction'>;
    expect(checkAnswer(sum(7, 4), ['t2', 't1']).correct).toBe(true);
    expect(checkAnswer(sum(7, 4), ['t2']).correct).toBe(false);
    expect(checkAnswer(sum(7, 4), ['t5']).correct).toBe(false);
    expect(checkAnswer(sum(7, 0, 2), ['t5', 't1', 't1']).correct).toBe(false);
  });

  it('lompat: ketukan keliru dihitung, urutan harus lengkap', () => {
    expect(hopReplay([4, 5, 6], ['4', '5', '6'])).toMatchObject({ slips: 0, done: true });
    expect(hopReplay([4, 5, 6], ['6', '4', '5', '9', '6'])).toMatchObject({ slips: 2, done: true });
    expect(hopReplay([4, 5, 6], ['4', '5'])).toMatchObject({ done: false });
  });

  it('sortir: benda bergiliran, keranjang keliru = slip', () => {
    const items = [{ id: 'i0' }, { id: 'i1' }];
    const answer = { i0: 'b-a', i1: 'b-b' };
    expect(sortReplay(items, answer, ['i0>b-b', 'i0>b-a', 'i1>b-b'])).toMatchObject({
      slips: 1,
      done: true,
    });
    // Ketukan untuk benda yang bukan gilirannya tidak memasukkan apa pun.
    expect(sortReplay(items, answer, ['i1>b-b'])).toMatchObject({ placed: 0, slips: 1 });
  });

  it('teka-teki silang tersusun bersilang dan bisa diselesaikan', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = createRng(seed);
      const built = buildCrossword(rng, ['TRUK', 'BUS', 'KAPAL'], 7, 7);
      if (!built) continue;
      const words = built.placed.map((p, i) => ({ id: `w${i}`, ...p }));
      const grid = { cols: built.cols, rows: built.rows, words, prefill: [] };
      // Huruf di kotak silang sama untuk kedua kata.
      const letters = crosswordLetters(grid);
      for (const w of words) expect(w.cells.map((c) => letters[c]).join('')).toBe(w.text);
      expect(crosswordReplay(grid, crosswordSolution(grid))).toMatchObject({
        slips: 0,
        done: true,
      });
      // Huruf keliru = slip; kotak tidak terisi.
      const r = crosswordReplay(grid, [`w0:Z`]);
      expect(r).toMatchObject({ slips: 1, done: false, filled: [] });
    }
  });

  it('puzzle: kepingan ke kotak yang salah = slip; kepingan terpasang tidak dihitung ulang', () => {
    const g = { cols: 2, rows: 2, fixed: [0] };
    expect(jigsawReplay(g, jigsawSolution(g))).toMatchObject({ slips: 0, done: true });
    expect(jigsawReplay(g, ['p1@2', 'p1@1', 'p0@0', 'p2@2', 'p3@3'])).toMatchObject({
      slips: 1,
      done: true,
    });
    expect(jigsawReplay(g, ['p9@9'])).toMatchObject({ slips: 1, done: false });
  });

  it('level game dari JSON: soal deterministik per seed', () => {
    const t = skillTemplateSchema.parse({
      id: 'math.prek.gm1.kucing-lapar',
      version: 1,
      domain: 'math',
      grade: 'prek',
      category: 'GM',
      order: 1,
      title: 'Game seru — Level 1 — Kucing lapar',
      tier: 'basic',
      family: 'feed-game',
      params: { target: [1, 5] },
    });
    expect(generateItem(t, { seed: 3, band: 0 })).toEqual(generateItem(t, { seed: 3, band: 0 }));
  });
});

/** Jenis game dari soal yang dihasilkan (mekanik yang dirasakan anak, bukan nama family). */
function gameKind(it: Item): string {
  const i = it.interaction;
  switch (i.type) {
    case 'build':
    case 'sum':
      return 'isi';
    case 'catch':
    case 'tap-all':
      return 'tangkap';
    case 'jigsaw':
      return 'puzzle';
    case 'pick-one':
      return it.stimulus.some((v) => v.kind === 'puzzle') ? 'puzzle' : 'pilih';
    default:
      return i.type;
  }
}

describe('topik Game seru di content/ (D-078)', () => {
  const root = new URL('../../../content/skills/', import.meta.url);
  const files = readdirSync(root, { recursive: true })
    .map(String)
    // Topik game: GM di setiap buku, plus Game angka (B) & Game huruf (E) di Worksheet PAUD (D-075).
    .filter((f) => /(^|\/)GM\d\d-[^/]+\.json$/.test(f) || /^worksheet\/prek\/[BE]\d\d-/.test(f));
  const books = new Map<string, string[]>();
  for (const f of files) {
    const name = f.split('/').pop()!;
    const topic = `${f.split('/').slice(0, 2).join('/')}/${name.startsWith('GM') ? 'GM' : name[0]}`;
    books.set(topic, [...(books.get(topic) ?? []), f]);
  }

  it('semua topik game (26 buku + 2 topik Worksheet) berisi 10 level', () => {
    expect(books.size).toBeGreaterThanOrEqual(28);
    for (const list of books.values()) expect(list).toHaveLength(10);
  });

  it('setiap level satu jenis game, dan tidak ada jenis yang berulang dalam satu topik', () => {
    for (const [book, list] of books) {
      const kinds = list.map((f) => {
        const t = skillTemplateSchema.parse(JSON.parse(readFileSync(new URL(f, root), 'utf8')));
        const seen = new Set<string>();
        for (let seed = 0; seed < 30; seed++)
          seen.add(gameKind(generateItem(t, { seed, band: seed % 3 })));
        expect([...seen], `${f}: satu level satu jenis game`).toHaveLength(1);
        return [...seen][0]!;
      });
      expect(new Set(kinds).size, `${book}: ${kinds.join(', ')}`).toBe(10);
    }
  }, 60_000);
});

describe('level game tidak masuk mock test & lomba (D-078)', () => {
  const root = new URL('../../../content/skills/', import.meta.url);
  const books = ['math/tkosn', 'sains/sd12', 'english/sd34', 'math/smp79'];
  it('mockSources & contestSafeTemplate melewati topik game', () => {
    for (const b of books) {
      const book = readdirSync(new URL(`${b}/`, root))
        .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
        .map((f) =>
          skillTemplateSchema.parse(JSON.parse(readFileSync(new URL(`${b}/${f}`, root), 'utf8'))),
        );
      const mocks = book.filter((t) => t.family === 'mock');
      expect(mocks.length, b).toBeGreaterThan(0);
      expect(
        book.some((t) => t.category === 'GM'),
        b,
      ).toBe(true);
      for (const m of mocks) {
        const src = Object.values(mockSources(m, book)).flat();
        expect(src.length, m.id).toBeGreaterThan(0);
        expect(
          src.filter((t) => t.category === 'GM'),
          m.id,
        ).toEqual([]);
      }
      for (const t of book.filter((x) => x.category === 'GM'))
        expect(contestSafeTemplate(t), t.id).toBe(false);
    }
  });
});

describe('poin soal & ronde (D-078: salah diterima, dikurangi poin)', () => {
  it('poin soal: benar 10, keliru sekali 5, keliru dua kali 0 dan salah', () => {
    expect(itemPoints(true)).toBe(10);
    expect(itemPoints(true, 1)).toBe(5);
    expect(itemPoints(false, 0)).toBe(0);
    const items = [{ id: 'i0' }, { id: 'i1' }];
    const sort = {
      interaction: {
        type: 'sort',
        style: 'baskets',
        bins: [],
        items,
        answer: { i0: 'b-a', i1: 'b-b' },
        maxSlips: 9,
      },
    } as unknown as Pick<Item, 'interaction'>;
    expect(checkAnswer(sort, ['i0>b-a', 'i1>b-b'])).toMatchObject({ correct: true, points: 10 });
    expect(checkAnswer(sort, ['i0>b-b', 'i0>b-a', 'i1>b-b'])).toMatchObject({
      correct: true,
      points: 5,
      mistakes: 1,
    });
    // Keliru kedua mengakhiri soal (tidak dipaksa sampai benar) walau `maxSlips` konten lebih longgar.
    expect(checkAnswer(sort, ['i0>b-b', 'i0>b-b'])).toMatchObject({ correct: false, points: 0 });
    expect(gameOver(sort.interaction, ['i0>b-b', 'i0>b-b'])).toBe(true);
    expect(gameOver(sort.interaction, ['i0>b-b'])).toBe(false);
  });

  it('labirin: menabrak dinding sekali tidak dikurangi (menjelajah), berikutnya dikurangi', () => {
    const t = skillTemplateSchema.parse({
      id: 'worksheet.prek.z1.uji',
      version: 1,
      domain: 'worksheet',
      grade: 'prek',
      category: 'B',
      order: 1,
      title: 'Uji',
      tier: 'basic',
      family: 'maze-path',
      params: { mode: 'numbers', cols: [3, 3], rows: [3, 3] },
    });
    const it = generateItem(t, { seed: 1, band: 1 });
    const m = it.interaction as Extract<Item['interaction'], { type: 'maze' }>;
    const path = mazePath(m, m.start, m.goal)
      .slice(1)
      .map((c) => `c${c}`);
    const wall = `c${m.start}`;
    expect(checkAnswer(it, path)).toMatchObject({ points: 10 });
    expect(checkAnswer(it, [wall, ...path])).toMatchObject({ points: 10 });
    expect(checkAnswer(it, [wall, wall, ...path])).toMatchObject({ points: 5 });
    expect(checkAnswer(it, [wall, wall, wall, ...path])).toMatchObject({
      correct: false,
      points: 0,
    });
  });

  it('game tombol Selesai boleh dibetulkan; soal kuis biasa sekali jawab', () => {
    expect(isRetryGame({ type: 'sum' } as Item['interaction'])).toBe(true);
    expect(isRetryGame({ type: 'spell', style: 'train' } as Item['interaction'])).toBe(true);
    expect(isRetryGame({ type: 'spell' } as Item['interaction'])).toBe(false);
    expect(isRetryGame({ type: 'pick-one' } as Item['interaction'])).toBe(false);
  });

  it('skor ronde dari poin; gagal bila < 70 atau lebih dari 3 soal salah', () => {
    expect(roundScore(100)).toBe(100);
    expect(roundScore(75)).toBe(75);
    expect(roundPassed(70, 3)).toBe(true);
    expect(roundPassed(69, 0)).toBe(false);
    expect(roundPassed(80, 4)).toBe(false);
    // 10 soal benar tapi tiap soal sempat keliru → 50 poin → gagal.
    expect(roundPassed(roundScore(10 * 5), 0)).toBe(false);
    expect(validRoundPoints(75, 8, 10)).toBe(true);
    expect(validRoundPoints(85, 8, 10)).toBe(false);
    expect(validRoundPoints(35, 8, 10)).toBe(false);
  });
});
