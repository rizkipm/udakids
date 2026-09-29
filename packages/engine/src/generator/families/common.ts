import { z } from 'zod';
import {
  COUNTABLE_OBJECTS,
  OBJECTS,
  OBJECT_IDS,
  COLORS,
  SHAPE_IDS,
  type ObjectId,
} from '../assets.js';
import type { Choice, ItemCore, Layout, Visual } from '../item.js';
import type { Rng } from '../rng.js';
import { numberWord } from '../words.js';

/** Sampel ditolak — generator akan mencoba lagi (rejection sampling, maks 100×). */
export type GenerateContext = { seed: number; band: number; templateId: string };

export class Reject extends Error {}
export const reject = (why: string): never => {
  throw new Reject(why);
};

export type Family<S extends z.ZodType = z.ZodType> = {
  /** Penjelasan singkat untuk admin. */
  description: string;
  params: S;
  /** `ctx.seed` = nomor soal dalam ronde (seed); dipakai untuk memilih soal bank tanpa pengulangan. */
  generate(params: z.infer<S>, rng: Rng, ctx: GenerateContext): ItemCore;
};

export const defineFamily = <S extends z.ZodType>(f: Family<S>): Family<S> => f;

export const range = (min = 0, max = 100) =>
  z
    .tuple([z.number().int().min(min).max(max), z.number().int().min(min).max(max)])
    .refine(([a, b]) => a <= b, 'rentang terbalik');

export const objectIdSchema = z.enum(OBJECT_IDS as [ObjectId, ...ObjectId[]]);
export const colorSchema = z.enum(COLORS);
export const shapeIdSchema = z.enum(
  SHAPE_IDS as [(typeof SHAPE_IDS)[number], ...(typeof SHAPE_IDS)[number][]],
);
export const layoutSchema = z.enum(['row', 'rows', 'scatter', 'ring', 'grid']);

export const between = (rng: Rng, [a, b]: readonly [number, number]) => rng.int(a, b);

export const noun = (id: ObjectId) => OBJECTS[id].say;

export const pickObject = (rng: Rng, pool?: readonly ObjectId[]) =>
  rng.pick(pool ?? COUNTABLE_OBJECTS);

/** "satu, dua, tiga" */
export const countWords = (n: number, from = 1) =>
  Array.from({ length: Math.max(0, n - from + 1) }, (_, i) => numberWord(from + i)).join(', ');

export const numeralChoice = (value: number, tag?: string, spoken = false): Choice => ({
  id: `n${value}`,
  visual: { kind: 'numeral', value },
  ...(spoken && { say: numberWord(value) }),
  ...(tag && { tag }),
});

const nearTag = (v: number, answer: number) =>
  v === answer + 1 ? 'lebih-satu' : v === answer - 1 ? 'kurang-satu' : 'lain';

/**
 * Pilihan angka: jawaban + pengecoh. Pengecoh bertag didahulukan (miskonsepsi umum), sisanya
 * angka terdekat dalam [min, max]. Pengecoh yang sama dengan jawaban atau di luar batas dibuang.
 */
export function numberChoices(
  rng: Rng,
  answer: number,
  opts: { count: number; min: number; max: number; tagged?: { value: number; tag: string }[] },
): Choice[] {
  const pool = new Map<number, string>();
  const ok = (v: number) => Number.isInteger(v) && v >= opts.min && v <= opts.max && v !== answer;
  for (const t of opts.tagged ?? [])
    if (ok(t.value) && !pool.has(t.value)) pool.set(t.value, t.tag);
  const rest = rng
    .shuffle(Array.from({ length: opts.max - opts.min + 1 }, (_, i) => opts.min + i))
    .filter((v) => ok(v) && !pool.has(v))
    .sort((x, y) => Math.abs(x - answer) - Math.abs(y - answer));
  for (const v of rest) {
    if (pool.size >= opts.count - 1) break;
    pool.set(v, nearTag(v, answer));
  }
  if (pool.size < opts.count - 1) reject('pengecoh angka tidak cukup');
  const distractors = [...pool].slice(0, opts.count - 1).map(([v, tag]) => numeralChoice(v, tag));
  return rng.shuffle([numeralChoice(answer), ...distractors]);
}

export const COUNT_VISUALS = ['objects', 'dots', 'shapes', 'cubes', 'frame', 'stickers'] as const;
export type CountVisual = (typeof COUNT_VISUALS)[number];

export const frameSizeFor = (max: number): 5 | 10 | 20 => (max <= 5 ? 5 : max <= 10 ? 10 : 20);

/** Gambar sekumpulan n benda sesuai jenis tampilan. */
export function countVisual(
  rng: Rng,
  kind: CountVisual,
  n: number,
  opts: { layout: Layout; object: ObjectId; frameMax: number; countAlong?: boolean },
): { visual: Visual; noun: string } {
  const along = opts.countAlong ? { countAlong: true } : {};
  switch (kind) {
    case 'objects':
      return {
        visual: { kind: 'objects', object: opts.object, count: n, layout: opts.layout, ...along },
        noun: noun(opts.object),
      };
    case 'stickers':
      return {
        visual: { kind: 'objects', object: 'stiker', count: n, layout: opts.layout, ...along },
        noun: 'stiker',
      };
    case 'dots':
      return { visual: { kind: 'dots', count: n, layout: opts.layout, ...along }, noun: 'titik' };
    case 'shapes': {
      const shape = rng.pick(SHAPE_IDS);
      const items = Array.from({ length: n }, () => ({ shape, color: rng.pick(COLORS) }));
      return { visual: { kind: 'shapes', items, layout: opts.layout, ...along }, noun: 'bentuk' };
    }
    case 'cubes':
      return {
        visual: { kind: 'cubes', counts: [n], colors: [rng.pick(COLORS)], ...along },
        noun: 'kubus',
      };
    case 'frame':
      return {
        visual: { kind: 'frame', filled: n, size: frameSizeFor(opts.frameMax), ...along },
        noun: 'titik',
      };
  }
}

/** Ubah visual menjadi versi "hitung bareng" untuk reteach. */
export function withCountAlong(v: Visual): Visual {
  return 'countAlong' in v ||
    v.kind === 'objects' ||
    v.kind === 'dots' ||
    v.kind === 'cubes' ||
    v.kind === 'frame' ||
    v.kind === 'shapes'
    ? ({ ...v, countAlong: true } as Visual)
    : v;
}

export const yesNoChoices = (): Choice[] => [
  { id: 'ya', visual: { kind: 'yesno', value: true }, say: 'ya' },
  { id: 'tidak', visual: { kind: 'yesno', value: false }, say: 'tidak', tag: 'ya-tidak-terbalik' },
];

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
