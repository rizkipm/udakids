import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  catalogSchema,
  chanceFavorable,
  chanceOutcomes,
  chanceReplay,
  chanceSolution,
  checkAnswer,
  coordReplay,
  coordSolution,
  evalNumber,
  generateItem,
  generateMockRound,
  isMockSkill,
  itemKey,
  lessonPhotos,
  lessonSchema,
  mockConfigOf,
  mockConfigSchema,
  mockMaxPoints,
  mockPointsRange,
  peragaSchema,
  skillTemplateSchema,
  usesGameFamily,
  visualSchema,
  type SkillTemplate,
} from '../src/index.js';

const BOOK = new URL('../../../content/skills/math/sd34/', import.meta.url);
const skills: SkillTemplate[] = readdirSync(BOOK)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => skillTemplateSchema.parse(JSON.parse(readFileSync(new URL(f, BOOK), 'utf8'))));
const catalog = catalogSchema.parse(
  JSON.parse(readFileSync(new URL('_catalog.json', BOOK), 'utf8')),
);
const TOPICS = ['EA', 'EB', 'EC', 'ED', 'EE', 'EF', 'EG', 'EH'];
const GROUP = 'EMC · Eduversal Mathematics Competition — Penyisihan Kelas 3–4 (soal versi 2022)';

describe('evaluator: sqrt & pow (D-101)', () => {
  it('menghitung akar dan pangkat kecil', () => {
    expect(evalNumber('sqrt(a * a + b * b)', { a: 5, b: 12 })).toBe(13);
    expect(evalNumber('pow(2, 8)', {})).toBe(256);
    expect(evalNumber('pow(3, 0)', {})).toBe(1);
  });
  it('pangkat di luar 0–12 dan akar negatif bukan bilangan', () => {
    expect(evalNumber('pow(2, 13)', {})).toBeNaN();
    expect(evalNumber('pow(2, 1.5)', {})).toBeNaN();
    expect(evalNumber('sqrt(0 - 4)', {})).toBeNaN();
  });
});

describe('visual figure (D-101)', () => {
  it('menerima bidang koordinat dengan bangun, titik, siku-siku, dan label', () => {
    const r = visualSchema.safeParse({
      kind: 'figure',
      axes: { xMin: -3, xMax: 6, yMin: -2, yMax: 5 },
      shapes: [
        {
          t: 'poly',
          pts: [
            [0, 0],
            [4, 0],
            [4, 3],
          ],
          fill: 'shade',
        },
        { t: 'seg', a: [0, 0], b: [4, 0], text: '4 cm', ticks: 1 },
        { t: 'point', at: [4, 3], name: 'C', coord: true, pos: 'ne' },
        { t: 'right', at: [4, 0], a: [0, 0], b: [4, 3] },
        { t: 'circle', c: [1, 1], r: 1, center: true },
        { t: 'label', at: [2, 2], text: '12 cm²' },
      ],
    });
    expect(r.success).toBe(true);
  });
  it('menolak sumbu terbalik, bidang terlalu lebar, dan bangun kosong', () => {
    const base = { kind: 'figure', shapes: [{ t: 'point', at: [0, 0] }] };
    expect(
      visualSchema.safeParse({ ...base, axes: { xMin: 3, xMax: 1, yMin: 0, yMax: 2 } }).success,
    ).toBe(false);
    expect(
      visualSchema.safeParse({ ...base, axes: { xMin: -20, xMax: 20, yMin: 0, yMax: 2 } }).success,
    ).toBe(false);
    expect(visualSchema.safeParse({ kind: 'figure', shapes: [] }).success).toBe(false);
  });
});

describe('Harta Karun Koordinat (D-101)', () => {
  const steps = [
    { x: 1, y: 2 },
    { x: -3, y: 0 },
  ];
  it('langkah berurutan; ketukan di titik lain = kekeliruan', () => {
    expect(coordReplay(steps, coordSolution(steps))).toEqual({ found: 2, slips: 0, done: true });
    expect(coordReplay(steps, ['2,1', '1,2', '-3,0'])).toEqual({ found: 2, slips: 1, done: true });
    expect(coordReplay(steps, ['-3,0'])).toEqual({ found: 0, slips: 1, done: false });
  });
  it('kekeliruan ke-2 mengakhiri soal sebagai belum tepat', () => {
    const item = generateItem(
      skills.find((s) => s.category === 'EB' && s.order === 11)!,
      { seed: 3, band: 0 },
    );
    expect(item.interaction.type).toBe('coord');
    const it = item.interaction as Extract<typeof item.interaction, { type: 'coord' }>;
    expect(checkAnswer(item, coordSolution(it.steps)).correct).toBe(true);
    const off = `${it.xMax + 1},${it.yMax + 1}`;
    expect(checkAnswer(item, [off, ...coordSolution(it.steps)]).points).toBe(5);
    expect(checkAnswer(item, [off, off, ...coordSolution(it.steps)]).correct).toBe(false);
  });
});

describe('Eksperimen Peluang (D-101)', () => {
  it('ruang sampel: dadu 6, dua dadu 36, n koin 2ⁿ, kantong = pasangan tak berurutan', () => {
    expect(chanceOutcomes('die')).toHaveLength(6);
    expect(chanceOutcomes('dice2')).toHaveLength(36);
    expect(chanceOutcomes('coins3')).toHaveLength(8);
    expect(chanceOutcomes('coins4')).toHaveLength(16);
    expect(chanceOutcomes('bag', { merah: 2, hitam: 2 })).toHaveLength(6);
  });
  it('kejadian dihitung dengan evaluator aman', () => {
    expect(chanceFavorable(chanceOutcomes('dice2'), 's == 7')).toHaveLength(6);
    expect(chanceFavorable(chanceOutcomes('coins4'), 'h == 3 || g == 3')).toHaveLength(8);
    expect(
      chanceFavorable(chanceOutcomes('bag', { merah: 2, hitam: 2 }), 'merah == 1'),
    ).toHaveLength(4);
  });
  it('tahap 1 ketuk hasil yang cocok, tahap 2 pilih peluang; ketukan ulang tidak dihitung', () => {
    const ans = ['a', 'b'];
    expect(chanceReplay(ans, 'f1', chanceSolution(ans, 'f1'))).toMatchObject({
      done: true,
      slips: 0,
    });
    expect(chanceReplay(ans, 'f1', ['a', 'a', 'x', 'b', 'p:f1'])).toMatchObject({
      done: true,
      slips: 1,
    });
    expect(chanceReplay(ans, 'f1', ['a', 'p:f1'])).toMatchObject({ done: false, slips: 1 });
    expect(chanceReplay(ans, 'f1', ['a', 'b', 'p:f2'])).toMatchObject({ done: false, slips: 1 });
  });
});

describe('Buku EMC Kelas 3–4 (math/sd34, D-101)', () => {
  const emc = catalog.categories.filter((c) => c.group === GROUP);

  it('8 materi kisi-kisi × 11 level (10 soal + 1 game), game GE 10 level, 3 mock', () => {
    expect(emc.map((c) => c.code)).toEqual([...TOPICS, 'GE', 'EY']);
    for (const code of TOPICS) {
      const lv = skills.filter((s) => s.category === code).sort((a, b) => a.order - b.order);
      expect(lv.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      expect(usesGameFamily(lv[10]!)).toBe(true);
      expect(lv.slice(0, 10).some(usesGameFamily)).toBe(false);
    }
    const ge = skills.filter((s) => s.category === 'GE');
    expect(ge).toHaveLength(10);
    expect(ge.every(usesGameFamily)).toBe(true);
    // 10 level game = 10 jenis game berbeda (D-078).
    const kind = (s: SkillTemplate) =>
      s.family === 'mix'
        ? (s.params as { parts: { family: string }[] }).parts[0]!.family
        : s.family;
    expect(new Set(ge.map(kind)).size).toBe(10);
    expect(skills.filter((s) => s.category === 'EY' && isMockSkill(s))).toHaveLength(3);
  });

  it('game level 11 berbeda jenis di setiap materi', () => {
    const kind = (s: SkillTemplate) =>
      s.family === 'mix'
        ? (s.params as { parts: { family: string }[] }).parts[0]!.family
        : s.family;
    const games = TOPICS.map((c) => kind(skills.find((s) => s.category === c && s.order === 11)!));
    expect(new Set(games).size).toBe(8);
  });

  it('setiap materi punya pelajaran infografis + simulasi, foto dengan cadangan SVG', () => {
    for (const code of TOPICS) {
      const c = emc.find((x) => x.code === code)!;
      const lesson = lessonSchema.parse(c.lesson);
      expect(lesson.layar.map((l) => l.jenis)).toEqual([
        'infografis',
        'peraga',
        'baca',
        'coba',
        'ingat',
      ]);
      expect(peragaSchema.safeParse(lesson.layar[1]!.peraga).success).toBe(true);
      expect(lessonPhotos(lesson).length).toBeGreaterThanOrEqual(2);
      expect(c.intro && c.tips?.length).toBeTruthy();
    }
  });

  it('kisi-kisi mock: 40 nomor (30 PG + 10 isian), 10/10/20, poin maks 1080', () => {
    for (const mock of skills.filter((s) => s.category === 'EY')) {
      const c = mockConfigOf(mock);
      expect(c.questions).toBe(40);
      expect(c.plan).toEqual({ easy: 10, medium: 10, hard: 20 });
      expect(c.slots).toHaveLength(40);
      expect(c.slots!.slice(0, 30).every((s) => s.form === 'choice')).toBe(true);
      expect(c.slots!.slice(30).every((s) => s.form === 'input')).toBe(true);
      expect(mockMaxPoints(c)).toBe(1080);
      expect(mockPointsRange(c)).toEqual([-270, 1080]);
      expect(c.referenceMinutes).toBe(120);
      // Sebaran topik persis kisi-kisi EMC 2022.
      const per = Object.fromEntries(
        TOPICS.map((t) => [t, c.slots!.filter((s) => s.category === t).length]),
      );
      expect(per).toEqual({ EA: 8, EB: 8, EC: 7, ED: 5, EE: 4, EF: 3, EG: 3, EH: 2 });
    }
  });

  it('Mock 1, 2, 3: urutan nomor & bentuk sesuai kisi-kisi, soal berbeda, jawaban benar diterima', () => {
    const mocks = skills.filter((s) => s.category === 'EY').sort((a, b) => a.order - b.order);
    const rounds = mocks.map((m, i) => generateMockRound(m, skills, { seed: 100 + i }));
    for (const [i, round] of rounds.entries()) {
      const slots = mockConfigOf(mocks[i]!).slots!;
      expect(round).toHaveLength(40);
      round.forEach((q, n) => {
        expect(q.category).toBe(slots[n]!.category);
        expect(q.difficulty).toBe(slots[n]!.difficulty);
        expect(q.item.skillId).toBe(
          skills.find((s) => s.category === slots[n]!.category && s.order === slots[n]!.levels[0])!
            .id,
        );
        expect(q.item.interaction.type).toBe(
          slots[n]!.form === 'input' ? 'number-input' : 'pick-one',
        );
        const it = q.item.interaction as { answer: string | number };
        expect(checkAnswer(q.item, it.answer).correct).toBe(true);
      });
      expect(new Set(round.map((q) => itemKey(q.item))).size).toBe(40);
    }
    const a = new Set(rounds[0]!.map((q) => itemKey(q.item)));
    expect(rounds[1]!.filter((q) => a.has(itemKey(q.item))).length).toBeLessThan(10);
  });

  it('anak tanpa paket: nomor dari level berbayar memakai level gratis tertinggi di materi yang sama', () => {
    const mock = skills.find((s) => s.category === 'EY' && s.order === 1)!;
    const free = skills.map((s) => (s.order > 5 && !isMockSkill(s) ? { ...s, stub: true } : s));
    const round = generateMockRound(mock, free, { seed: 7 });
    const slots = mockConfigOf(mock).slots!;
    expect(round).toHaveLength(40);
    round.forEach((q, n) => {
      const src = skills.find((s) => s.id === q.item.skillId)!;
      expect(src.category).toBe(slots[n]!.category);
      expect(src.order).toBeLessThanOrEqual(5);
    });
  });

  it('kisi-kisi yang tidak cocok dengan plan ditolak', () => {
    const c = mockConfigOf(skills.find((s) => s.category === 'EY')!);
    expect(mockConfigSchema.safeParse({ ...c, slots: c.slots!.slice(1) }).success).toBe(false);
    const swapped = c.slots!.map((s, i) => (i === 0 ? { ...s, difficulty: 'hard' as const } : s));
    expect(mockConfigSchema.safeParse({ ...c, slots: swapped }).success).toBe(false);
  });
});
