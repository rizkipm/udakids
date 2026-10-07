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
    const mock = skills.find(isMockSkill)!;

    it(`${book}: ada tepat satu mock, 25 soal 9/8/8, mudah → sulit, tanpa kembar`, () => {
      expect(skills.filter(isMockSkill)).toHaveLength(1);
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
    const mock = load('english/tkosn').find(isMockSkill)!;
    expect(mockConfigOf(mock).questions).toBe(25);
  });
});

describe('Mock Test khusus anak berpaket', () => {
  it('mock tidak termasuk level gratis; level biasa 1–3 tetap gratis', async () => {
    const { needsPurchase } = await import('../src/index.js');
    const free = { paywall: true, freeLevels: 3, all: false, books: [] as string[] };
    const node = { domain: 'math', grade: 'tkosn', order: 1 };
    expect(needsPurchase(free, node)).toBe(false);
    expect(needsPurchase(free, { ...node, family: 'mock' })).toBe(true);
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
});
