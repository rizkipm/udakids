import type { Item } from '../generator/item.js';
import { createRng } from '../generator/rng.js';
import { generateItem, type SkillTemplate } from '../generator/template.js';
import { usesGameFamily } from '../generator/families/index.js';
import { itemKey } from './round.js';
import { PASS_SCORE } from './quiz.js';
import {
  MOCK_DIFFICULTIES,
  mockConfigSchema,
  type MockConfig,
  type MockDifficulty,
} from '../generator/mock-config.js';

export * from '../generator/mock-config.js';

/**
 * Mock Test olimpiade (D-072): satu "level" khusus per buku olimpiade berisi soal sebanyak lomba asli (TK: 25),
 * menggabungkan semua materi di buku itu, mudah → sulit. Dinilai gaya EMC (Eduversal): benar +poin per tingkat
 * kesulitan, belum tepat dikurangi, dilewati 0. Waktu dicatat dengan stopwatch TANPA batas (D-024); acuan waktu
 * lomba hanya informasi. Skor 0–100 dari poin masuk skor utama seperti level biasa.
 */
export const isMockSkill = (t: Pick<SkillTemplate, 'family'>) => t.family === 'mock';
export const mockConfigOf = (t: SkillTemplate): MockConfig => mockConfigSchema.parse(t.params);

/**
 * Level sumber per tingkat: semua skill di buku yang sama (bukan mock, bukan game, bukan versi terkunci/stub).
 * Tanpa paket, level berbayar tidak dipakai; soal diambil dari level gratis (D-094).
 */
export function mockSources(
  mock: SkillTemplate,
  book: readonly (SkillTemplate & { stub?: boolean })[],
): Record<MockDifficulty, SkillTemplate[]> {
  const c = mockConfigOf(mock);
  const pool = book.filter(
    (s) =>
      s.domain === mock.domain &&
      s.grade === mock.grade &&
      !isMockSkill(s) &&
      // Level game (D-078) bukan soal lembar lomba.
      !usesGameFamily(s) &&
      !s.stub &&
      s.status === 'active' &&
      (!c.categories || c.categories.includes(s.category)),
  );
  const out = { easy: [], medium: [], hard: [] } as Record<MockDifficulty, SkillTemplate[]>;
  for (const d of MOCK_DIFFICULTIES) {
    const [a, b] = c.levels[d];
    out[d] = pool.filter((s) => s.order >= a && s.order <= b);
  }
  // Anak tanpa paket (D-094): level berbayar datang sebagai stub tanpa isi soal, jadi tingkat yang hanya berisi
  // level berbayar kosong. Mock test 1 gratis lalu disusun dari level gratis saja: urutan level yang ada dibagi
  // tiga (terendah = mudah, tengah = sedang, tertinggi = sulit).
  const lockedOut = MOCK_DIFFICULTIES.some((d) => {
    const [a, b] = c.levels[d];
    return (
      c.plan[d] > 0 &&
      out[d].length === 0 &&
      book.some(
        (s) =>
          s.stub &&
          s.domain === mock.domain &&
          s.grade === mock.grade &&
          !isMockSkill(s) &&
          s.order >= a &&
          s.order <= b,
      )
    );
  });
  if (lockedOut && pool.length) {
    const orders = [...new Set(pool.map((s) => s.order))].sort((x, y) => x - y);
    const third = Math.ceil(orders.length / 3);
    const easy = orders.slice(0, third);
    const hard = orders.slice(Math.max(0, orders.length - third));
    const mid = orders.slice(third, orders.length - third);
    const medium = mid.length ? mid : orders;
    const pick = (os: number[]) => pool.filter((s) => os.includes(s.order));
    return { easy: pick(easy), medium: pick(medium), hard: pick(hard) };
  }
  return out;
}

export const mockBand = (d: MockDifficulty) => MOCK_DIFFICULTIES.indexOf(d);

export type MockQuestion = { item: Item; difficulty: MockDifficulty; category: string };

/**
 * Susun soal mock test: urut mudah → sedang → sulit seperti lembar lomba, materi disebar bergiliran (acak per
 * ronde), tanpa soal kembar dan sebisa mungkin tanpa soal dari ronde sebelumnya (`avoid`). Soal tetap membawa
 * skillId/seed/band level sumbernya, jadi suara Momo & pemeriksaan jawaban sama seperti di level biasa.
 */
export function generateMockRound(
  mock: SkillTemplate,
  book: readonly (SkillTemplate & { stub?: boolean })[],
  opts: { seed: number; avoid?: readonly string[] },
): MockQuestion[] {
  const c = mockConfigOf(mock);
  const sources = mockSources(mock, book);
  const rng = createRng(`${mock.id}@${mock.version}#mock/${opts.seed}`);
  const avoid = new Set(opts.avoid ?? []);
  const used = new Set<string>();
  const out: MockQuestion[] = [];
  for (const d of MOCK_DIFFICULTIES) {
    const list = sources[d];
    if (c.plan[d] > 0 && list.length === 0)
      throw new Error(`${mock.id}: tidak ada level sumber untuk tingkat ${d}`);
    // Materi bergiliran: urutan kategori diacak, lalu level acak di dalam kategori.
    const cats = rng.shuffle([...new Set(list.map((s) => s.category))]);
    for (let k = 0; k < c.plan[d]; k++) {
      const cat = cats[k % cats.length]!;
      const inCat = list.filter((s) => s.category === cat);
      let pick: Item | undefined;
      let fallback: Item | undefined;
      for (let attempt = 0; attempt < 30 && !pick; attempt++) {
        const src = rng.pick(inCat);
        const seed = rng.int(1, 2_147_483_646);
        let item: Item;
        try {
          item = generateItem(src, { seed, band: mockBand(d) });
        } catch {
          continue;
        }
        const key = itemKey(item);
        if (used.has(key)) continue;
        fallback ??= item;
        if (!avoid.has(key)) pick = item;
      }
      const item = pick ?? fallback;
      if (!item) throw new Error(`${mock.id}: gagal membuat soal ${d} dari materi ${cat}`);
      used.add(itemKey(item));
      out.push({ item, difficulty: d, category: cat });
    }
  }
  return out;
}

export type MockOutcome = 'right' | 'wrong' | 'skip';

export type MockScore = {
  points: number;
  maxPoints: number;
  correct: number;
  wrong: number;
  skipped: number;
  /** Skor 0–100 untuk skor utama: poin (minimal 0) dibagi poin maksimal. */
  score: number;
  byDifficulty: Record<
    MockDifficulty,
    { right: number; wrong: number; skip: number; points: number }
  >;
};

/** Poin maksimal (semua benar) untuk satu konfigurasi. */
export const mockMaxPoints = (c: MockConfig) =>
  MOCK_DIFFICULTIES.reduce((sum, d) => sum + c.plan[d] * c.points[d].right, 0);

/** Skor 0–100 dari poin (poin negatif dihitung 0). */
export const mockScore100 = (c: MockConfig, points: number) => {
  const max = mockMaxPoints(c);
  return max <= 0 ? 0 : Math.round((Math.max(0, Math.min(points, max)) / max) * 100);
};

export function scoreMock(
  c: MockConfig,
  answers: readonly { difficulty: MockDifficulty; outcome: MockOutcome }[],
): MockScore {
  const by = Object.fromEntries(
    MOCK_DIFFICULTIES.map((d) => [d, { right: 0, wrong: 0, skip: 0, points: 0 }]),
  ) as MockScore['byDifficulty'];
  for (const a of answers) {
    const row = by[a.difficulty];
    row[a.outcome]++;
    if (a.outcome === 'right') row.points += c.points[a.difficulty].right;
    if (a.outcome === 'wrong') row.points += c.points[a.difficulty].wrong;
  }
  const points = MOCK_DIFFICULTIES.reduce((s, d) => s + by[d].points, 0);
  const sum = (k: 'right' | 'wrong' | 'skip') =>
    MOCK_DIFFICULTIES.reduce((s, d) => s + by[d][k], 0);
  return {
    points,
    maxPoints: mockMaxPoints(c),
    correct: sum('right'),
    wrong: sum('wrong'),
    skipped: sum('skip'),
    score: mockScore100(c, points),
    byDifficulty: by,
  };
}

/**
 * Batas lulus mock dalam skor 0–100 (D-074): KKM (poin) dikonversi ke skor; tanpa KKM = batas lulus biasa.
 * Poin KMSI berkelipatan 4, jadi poin ≥ KKM ⇔ skor ≥ batas ini.
 */
export const mockPassScore = (c: MockConfig) =>
  c.passPoints === undefined ? PASS_SCORE : mockScore100(c, c.passPoints);

/** Lolos KKM? (poin, bukan skor). Tanpa KKM: skor ≥ batas lulus biasa. */
export const mockPassed = (c: MockConfig, points: number) =>
  c.passPoints === undefined ? mockScore100(c, points) >= PASS_SCORE : points >= c.passPoints;

/** Batas poin yang mungkin untuk satu konfigurasi (dipakai server memeriksa kiriman perangkat). */
export const mockPointsRange = (c: MockConfig): [number, number] => [
  MOCK_DIFFICULTIES.reduce((s, d) => s + c.plan[d] * c.points[d].wrong, 0),
  mockMaxPoints(c),
];

export type MockBoardRow = { id: string; points: number; timeMs: number; nickname: string };

/**
 * Papan peringkat satu Mock Test (D-072), gaya olimpiade: percobaan terbaik tiap anak, urut poin tertinggi →
 * waktu tercepat. Poin & waktu sama → posisi sama (1, 2, 2, 4); urutan tampil lalu nama panggilan.
 * `byName` (KMSI Final, D-080): poin & waktu sama → abjad nama yang menentukan, jadi posisi selalu berbeda.
 */
export function rankMockBoard<T extends MockBoardRow>(
  rows: readonly T[],
  opts: { byName?: boolean } = {},
): (T & { position: number })[] {
  const sorted = [...rows].sort(
    (a, b) =>
      b.points - a.points || a.timeMs - b.timeMs || a.nickname.localeCompare(b.nickname, 'id'),
  );
  let position = 0;
  return sorted.map((r, i) => {
    const prev = sorted[i - 1];
    if (opts.byName || !prev || prev.points !== r.points || prev.timeMs !== r.timeMs)
      position = i + 1;
    return { ...r, position };
  });
}
