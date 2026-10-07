import { describe, expect, it } from 'vitest';
import {
  EN_WORDS,
  KMSI_POINTS,
  PASS_SCORE,
  checkAnswer,
  enWordsOf,
  generateItem,
  generateMockRound,
  mockConfigSchema,
  mockPassScore,
  mockPassed,
  recordQuiz,
  scoreMock,
  skillTemplateSchema,
  type SkillTemplate,
} from '../src/index.js';

const kmsi = (
  questions: number,
  plan: { easy: number; medium: number; hard: number },
  passPoints: number,
) =>
  mockConfigSchema.parse({
    questions,
    plan,
    points: KMSI_POINTS,
    passPoints,
    categories: ['J', 'K'],
  });

describe('KMSI (D-074): penilaian benar 4, salah 0, kosong 0 + KKM', () => {
  it('Level A: 20 soal, maks 80, KKM 40 = 10 benar', () => {
    const c = kmsi(20, { easy: 7, medium: 7, hard: 6 }, 40);
    const answers = (right: number, wrong: number) =>
      Array.from({ length: 20 }, (_, i) => ({
        difficulty: (i < 7 ? 'easy' : i < 14 ? 'medium' : 'hard') as 'easy' | 'medium' | 'hard',
        outcome: (i < right ? 'right' : i < right + wrong ? 'wrong' : 'skip') as
          'right' | 'wrong' | 'skip',
      }));
    const ten = scoreMock(c, answers(10, 10));
    expect(ten.points).toBe(40);
    expect(ten.maxPoints).toBe(80);
    expect(mockPassed(c, ten.points)).toBe(true);
    expect(ten.score).toBeGreaterThanOrEqual(mockPassScore(c));
    const nine = scoreMock(c, answers(9, 11));
    expect(nine.points).toBe(36); // salah tidak mengurangi
    expect(mockPassed(c, nine.points)).toBe(false);
    expect(nine.score).toBeLessThan(mockPassScore(c));
  });

  it('Level 1–4: 30 soal, maks 120, KKM 72 = 18 benar (skor 60, di bawah batas lulus biasa)', () => {
    const c = kmsi(30, { easy: 10, medium: 10, hard: 10 }, 72);
    expect(mockPassScore(c)).toBe(60);
    expect(mockPassScore(c)).toBeLessThan(PASS_SCORE);
    for (let right = 0; right <= 30; right++) {
      const pts = right * 4;
      const score = Math.round((pts / 120) * 100);
      expect(score >= mockPassScore(c)).toBe(mockPassed(c, pts));
    }
  });

  it('recordQuiz memakai batas lulus KKM; tanpa batas tetap 70', () => {
    expect(recordQuiz(undefined, 60, 1, 1000, 60).passed).toBe(true);
    expect(recordQuiz(undefined, 60, 1, 1000).passed).toBe(false);
    expect(recordQuiz(undefined, 70, 1).passed).toBe(true);
  });

  it('KKM melebihi poin maksimal ditolak; mock lama tanpa KKM memakai batas biasa', () => {
    expect(() => kmsi(20, { easy: 7, medium: 7, hard: 6 }, 81)).toThrow(/KKM/);
    const emc = mockConfigSchema.parse({});
    expect(mockPassScore(emc)).toBe(PASS_SCORE);
    expect(emc.categories).toBeUndefined();
  });
});

describe('mock hanya dari materi yang disebut (categories)', () => {
  const lvl = (category: string, order: number): SkillTemplate =>
    skillTemplateSchema.parse({
      id: `math.tkosn.${category.toLowerCase()}${order}.uji`,
      version: 1,
      domain: 'math',
      grade: 'tkosn',
      category,
      order,
      title: 'Uji',
      tier: 'basic',
      family: 'number-order',
      params: { max: 20, length: [3, 4], consecutive: false },
    });
  const mock = skillTemplateSchema.parse({
    id: 'math.tkosn.y1.uji',
    version: 1,
    domain: 'math',
    grade: 'tkosn',
    category: 'Y',
    order: 1,
    title: 'Mock',
    tier: 'basic',
    family: 'mock',
    params: {
      questions: 20,
      plan: { easy: 7, medium: 7, hard: 6 },
      points: KMSI_POINTS,
      categories: ['J', 'K'],
      passPoints: 40,
    },
  });
  const book = ['A', 'J', 'K'].flatMap((c) => Array.from({ length: 10 }, (_, i) => lvl(c, i + 1)));

  it('soal hanya dari J dan K, bukan A', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const round = generateMockRound(mock, [...book, mock], { seed });
      expect(round).toHaveLength(20);
      expect(new Set(round.map((q) => q.category))).toEqual(new Set(['J', 'K']));
    }
  });
});

describe('susun huruf acak (spell-word, extra 0)', () => {
  const t = skillTemplateSchema.parse({
    id: 'english.tkosn.r1.uji',
    version: 1,
    domain: 'english',
    grade: 'tkosn',
    category: 'R',
    order: 1,
    title: 'Uji',
    tier: 'basic',
    family: 'spell-word',
    params: { items: [{ prompt: 'Susun.', word: 'TIGER', show: '_____', extra: 0 }] },
  });
  it('kartu = huruf kata itu saja, diacak, dan tidak pernah sudah urut', () => {
    for (let seed = 0; seed < 40; seed++) {
      const it = generateItem(t, { seed, band: 1 });
      const i = it.interaction;
      if (i.type !== 'spell') throw new Error(i.type);
      const letters = i.letters.map((c) => (c.visual as { text: string }).text);
      expect([...letters].sort().join('')).toBe('EGIRT');
      expect(letters.join('')).not.toBe('TIGER');
      expect(checkAnswer(it, ['T', 'I', 'G', 'E', 'R']).correct).toBe(true);
    }
  });
});

describe('English: topik transport (D-074)', () => {
  it('punya 10 kendaraan bergambar', () => {
    const tr = enWordsOf(['transport']);
    expect(tr).toHaveLength(10);
    expect(tr.map((x) => x.word)).toContain('helicopter');
  });
  it('tidak ikut mode "kelompokkan" topik lain (kereta juga mainan)', () => {
    const t = skillTemplateSchema.parse({
      id: 'english.tkosn.a7.uji',
      version: 1,
      domain: 'english',
      grade: 'tkosn',
      category: 'A',
      order: 7,
      title: 'Uji',
      tier: 'basic',
      family: 'english-word',
      params: { topics: ['toy'], mode: 'sort' },
    });
    const transportOnly = EN_WORDS.filter(
      (x) => x.topic === 'transport' && !EN_WORDS.some((y) => y !== x && y.word === x.word),
    );
    for (let seed = 0; seed < 60; seed++) {
      const it = generateItem(t, { seed, band: 1 });
      const said = JSON.stringify(it.interaction);
      for (const x of transportOnly) expect(said).not.toContain(`"${x.word}"`);
    }
  });
});
