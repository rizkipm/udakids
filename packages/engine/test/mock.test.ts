import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  checkAnswer,
  EMC_POINTS,
  generateMockRound,
  isMockSkill,
  itemKey,
  mockConfigOf,
  mockConfigSchema,
  mockMaxPoints,
  mockPointsRange,
  mockScore100,
  mockSources,
  scoreMock,
  skillTemplateSchema,
  validateTemplate,
  type AnswerValue,
  type Item,
  type SkillTemplate,
} from '../src/index.js';

const load = (dir: string): SkillTemplate[] => {
  const root = new URL(`../../../content/skills/${dir}/`, import.meta.url);
  return readdirSync(root)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => skillTemplateSchema.parse(JSON.parse(readFileSync(new URL(f, root), 'utf8'))));
};
const right = (item: Item): AnswerValue => {
  const it = item.interaction;
  switch (it.type) {
    case 'pick-one':
    case 'tap-all':
    case 'order':
    case 'group':
    case 'match':
    case 'number-line':
    case 'number-input':
      return it.answer;
    case 'build':
      return it.target;
    case 'trace':
      return 0;
    case 'connect':
      return it.answer;
    default:
      // Interaksi lain (mis. `spell`): kunci jawabannya ada di `answer`.
      return (it as { answer: AnswerValue }).answer;
  }
};

describe('Mock Test olimpiade TK (D-072)', () => {
  for (const book of ['math/tkosn', 'sains/tkosn', 'english/tkosn']) {
    const skills = load(book);
    // Mock olimpiade gaya EMC (kategori Z); mock KMSI (Y, D-074) diuji di bawah.
    const mock = skills.find((s) => isMockSkill(s) && s.category === 'Z')!;

    it(`${book}: 3 mock EMC (Z) + 3 mock KMSI (Y), 25 soal 9/8/8, mudah → sulit, tanpa kembar`, () => {
      expect(skills.filter((s) => isMockSkill(s) && s.category === 'Z')).toHaveLength(3);
      expect(skills.filter((s) => isMockSkill(s) && s.category === 'Y')).toHaveLength(3);
      expect(validateTemplate(mock)).toEqual([]);
      const round = generateMockRound(mock, skills, { seed: 42 });
      expect(round).toHaveLength(25);
      expect(round.map((q) => q.difficulty).join(',')).toBe(
        [...Array(9).fill('easy'), ...Array(8).fill('medium'), ...Array(8).fill('hard')].join(','),
      );
      expect(new Set(round.map((q) => itemKey(q.item))).size).toBe(25);
      // Soal membawa id level sumber (bukan id mock), dan jawaban benar diterima.
      for (const q of round) {
        expect(q.item.skillId).not.toBe(mock.id);
        expect(checkAnswer(q.item, right(q.item)).correct).toBe(true);
      }
      // Semua materi terwakili di soal mudah (materi disebar bergiliran).
      const cats = new Set(skills.filter((s) => !isMockSkill(s)).map((s) => s.category));
      const used = new Set(round.map((q) => q.category));
      expect(used.size).toBeGreaterThanOrEqual(Math.min(cats.size, 9));
    });

    it(`${book}: setiap kali dibuka soalnya berbeda; menghindari soal ronde sebelumnya`, () => {
      const a = generateMockRound(mock, skills, { seed: 1 });
      const b = generateMockRound(mock, skills, { seed: 2, avoid: a.map((q) => itemKey(q.item)) });
      const keysA = new Set(a.map((q) => itemKey(q.item)));
      const overlap = b.filter((q) => keysA.has(itemKey(q.item))).length;
      expect(overlap).toBeLessThanOrEqual(2);
      expect(generateMockRound(mock, skills, { seed: 1 }).map((q) => itemKey(q.item))).toEqual(
        a.map((q) => itemKey(q.item)),
      );
    });
  }

  it('level sumber: tanpa mock dan tanpa level terkunci (stub)', () => {
    const skills = load('math/tkosn');
    const mock = skills.find(isMockSkill)!;
    const stubbed = skills.map((s) => (s.order === 1 ? { ...s, stub: true } : s));
    const src = mockSources(mock, stubbed);
    expect(src.easy.every((s) => s.order >= 2 && s.order <= 3)).toBe(true);
    expect(src.medium.every((s) => s.order >= 4 && s.order <= 7)).toBe(true);
    expect(src.hard.every((s) => s.order >= 8 && s.order <= 10)).toBe(true);
    expect([...src.easy, ...src.medium, ...src.hard].some(isMockSkill)).toBe(false);
  });

  it('tanpa paket (D-094): level 6–10 berbayar (stub) → Mock 1 tetap 25 soal dari level 1–5', () => {
    for (const book of [
      'math/tkosn',
      'sains/tkosn',
      'english/tkosn',
      'math/sd12',
      'english/sd12',
    ]) {
      const skills = load(book);
      const free = skills.map((s) =>
        !isMockSkill(s) && s.order > 5 ? { ...s, params: {}, stub: true } : s,
      );
      for (const mock of skills.filter(isMockSkill)) {
        const src = mockSources(mock, free);
        expect(src.easy.every((s) => s.order <= 2)).toBe(true);
        expect(src.hard.every((s) => s.order >= 4 && s.order <= 5)).toBe(true);
        const round = generateMockRound(mock, free, { seed: 7 });
        expect(round).toHaveLength(mockConfigOf(mock).questions);
        for (const q of round) {
          expect(free.find((s) => s.id === q.item.skillId)?.order).toBeLessThanOrEqual(5);
          expect(checkAnswer(q.item, right(q.item)).correct).toBe(true);
        }
      }
    }
  });
});

describe('penilaian gaya EMC', () => {
  const c = mockConfigSchema.parse({});
  it('bawaan: 25 soal 9/8/8, poin EMC, maks 552, acuan 60 menit', () => {
    expect(c.points).toEqual(EMC_POINTS);
    expect(mockMaxPoints(c)).toBe(9 * 8 + 8 * 20 + 8 * 40);
    expect(mockPointsRange(c)).toEqual([-(9 * 2 + 8 * 5 + 8 * 10), 552]);
    expect(c.referenceMinutes).toBe(60);
    expect(mockConfigSchema.safeParse({ questions: 20 }).success).toBe(false);
  });

  it('benar +poin, belum tepat −poin, dilewati 0; skor 0–100 tidak pernah negatif', () => {
    const all = (outcome: 'right' | 'wrong' | 'skip') =>
      (['easy', 'medium', 'hard'] as const).flatMap((d) =>
        Array.from({ length: c.plan[d] }, () => ({ difficulty: d, outcome })),
      );
    expect(scoreMock(c, all('right'))).toMatchObject({ points: 552, score: 100, correct: 25 });
    expect(scoreMock(c, all('skip'))).toMatchObject({ points: 0, score: 0, skipped: 25 });
    expect(scoreMock(c, all('wrong'))).toMatchObject({ points: -138, score: 0, wrong: 25 });
    const mixed = scoreMock(c, [
      { difficulty: 'easy', outcome: 'right' },
      { difficulty: 'medium', outcome: 'wrong' },
      { difficulty: 'hard', outcome: 'right' },
      { difficulty: 'hard', outcome: 'skip' },
    ]);
    expect(mixed).toMatchObject({ points: 8 - 5 + 40, correct: 2, wrong: 1, skipped: 1 });
    expect(mixed.byDifficulty.hard).toEqual({ right: 1, wrong: 0, skip: 1, points: 40 });
    expect(mixed.score).toBe(Math.round((43 / 552) * 100));
    expect(mockScore100(c, 9999)).toBe(100);
  });

  it('konfigurasi dari template mock', () => {
    const book = load('english/tkosn');
    expect(mockConfigOf(book.find((s) => isMockSkill(s) && s.category === 'Z')!).questions).toBe(
      25,
    );
    // KMSI Level A (D-074): 20 soal, benar 4, KKM 40, hanya materi KMSI.
    const kmsi = mockConfigOf(book.find((s) => isMockSkill(s) && s.category === 'Y')!);
    expect(kmsi).toMatchObject({ questions: 20, passPoints: 40 });
    expect(kmsi.points.hard).toEqual({ right: 4, wrong: 0 });
    expect(kmsi.categories).toEqual(['L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S']);
  });
});

describe('Mock Test khusus anak berpaket', () => {
  it('Mock 1 gratis sekali, Mock 2–3 & mengulang khusus Premium', async () => {
    const { needsPurchase } = await import('../src/index.js');
    const free = { paywall: true, freeLevels: 3, all: false, books: [] as string[] };
    const node = { domain: 'math', grade: 'tkosn', order: 1 };
    expect(needsPurchase(free, node)).toBe(false);
    // Mock test 1 gratis; Mock test 2 & 3 khusus Premium.
    expect(needsPurchase(free, { ...node, family: 'mock' })).toBe(false);
    expect(needsPurchase(free, { ...node, order: 2, family: 'mock' })).toBe(true);
    expect(needsPurchase(free, { ...node, order: 3, family: 'mock' })).toBe(true);
    expect(needsPurchase({ ...free, books: ['math/tkosn'] }, { ...node, family: 'mock' })).toBe(
      false,
    );
    expect(needsPurchase({ ...free, paywall: false }, { ...node, family: 'mock' })).toBe(false);
  });
});

describe('papan peringkat mock test', () => {
  it('poin tertinggi → waktu tercepat; poin & waktu sama → posisi sama', async () => {
    const { rankMockBoard } = await import('../src/index.js');
    const rows = [
      { id: 'a', nickname: 'Ayu', points: 300, timeMs: 900_000 },
      { id: 'b', nickname: 'Budi', points: 420, timeMs: 1_500_000 },
      { id: 'c', nickname: 'Cici', points: 300, timeMs: 600_000 },
      { id: 'd', nickname: 'Dodi', points: 300, timeMs: 600_000 },
      { id: 'e', nickname: 'Eka', points: -20, timeMs: 100_000 },
    ];
    expect(rankMockBoard(rows).map((r) => `${r.id}${r.position}`)).toEqual([
      'b1',
      'c2',
      'd2',
      'a4',
      'e5',
    ]);
    expect(rankMockBoard([])).toEqual([]);
  });
  it('KMSI Final (D-080): poin & waktu sama → abjad nama, posisi tidak kembar', async () => {
    const { rankMockBoard } = await import('../src/index.js');
    const rows = [
      { id: 'd', nickname: 'Dodi', points: 88, timeMs: 600_000 },
      { id: 'b', nickname: 'Budi', points: 92, timeMs: 1_500_000 },
      { id: 'c', nickname: 'Cici', points: 88, timeMs: 600_000 },
      { id: 'a', nickname: 'Ayu', points: 88, timeMs: 900_000 },
    ];
    expect(rankMockBoard(rows, { byName: true }).map((r) => `${r.id}${r.position}`)).toEqual([
      'b1',
      'c2',
      'd3',
      'a4',
    ]);
  });
});

describe('mock test 1–3 tidak saling mengunci', () => {
  it('Mock 2 & 3 terbuka walau Mock 1 belum lulus', async () => {
    const { levelStatuses } = await import('../src/index.js');
    const nodes = [1, 2, 3].map((order) => ({
      id: `z${order}`,
      category: 'Z',
      order,
      family: 'mock',
    }));
    expect(levelStatuses(['Z'], nodes, {})).toEqual({ z1: 'open', z2: 'open', z3: 'open' });
    const normal = [1, 2].map((order) => ({ id: `a${order}`, category: 'A', order }));
    expect(levelStatuses(['A'], normal, {})).toEqual({ a1: 'open', a2: 'locked' });
  });
});

describe('paling aktif (landing page)', () => {
  it('soal terbanyak → waktu lebih lama; tanpa soal tidak masuk', async () => {
    const { rankByActivity } = await import('../src/index.js');
    const r = rankByActivity([
      { nickname: 'A', questions: 30, timeMs: 100 },
      { nickname: 'B', questions: 50, timeMs: 10 },
      { nickname: 'C', questions: 30, timeMs: 900 },
      { nickname: 'D', questions: 0, timeMs: 999 },
    ]);
    expect(r.map((x) => `${x.position}${x.nickname}`)).toEqual(['1B', '2C', '3A']);
  });
});
