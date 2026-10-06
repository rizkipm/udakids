import { z } from 'zod';
import {
  ALL_SHAPE_IDS,
  COLORS,
  REAL_WORLD_SHAPES,
  REAL_WORLD_SOLIDS,
  SHAPES,
  SHAPE_IDS,
  SOLIDS,
  SOLID_IDS,
  type ObjectId,
  type ShapeId,
  type SolidId,
} from '../assets.js';
import type { Choice, Visual } from '../item.js';
import { numberWord } from '../words.js';
import {
  between,
  countWords,
  defineFamily,
  noun,
  numberChoices,
  range,
  reject,
  capitalize,
} from './common.js';

const shapeIds = z.enum(ALL_SHAPE_IDS as [ShapeId, ...ShapeId[]]);
const solidIds = z.enum(SOLID_IDS as [SolidId, ...SolidId[]]);
const say = (id: string) => (id in SHAPES ? SHAPES[id as ShapeId].say : SOLIDS[id as SolidId].say);

const flatVisual = (rng: { pick<T>(xs: readonly T[]): T }, shape: ShapeId): Visual => {
  const color = rng.pick(COLORS);
  const size = rng.pick(['s', 'm', 'l'] as const);
  const rotate = rng.pick([0, 0, 0, 20, 45]);
  // Persegi diputar 45° terlihat seperti belah ketupat (D-069): cukup dimiringkan sedikit.
  return {
    kind: 'shape',
    shape,
    color,
    size,
    rotate: shape === 'persegi' && rotate === 45 ? 20 : rotate,
  };
};
const solidVisual = (rng: { pick<T>(xs: readonly T[]): T }, solid: SolidId): Visual => ({
  kind: 'solid',
  solid,
  color: rng.pick(COLORS),
});

export const shapeTap = defineFamily({
  description: 'Ketuk semua bentuk tertentu (bangun datar / ruang), atau semua bangun ruang.',
  params: z.strictObject({
    kind: z.enum(['flat', 'solid', 'solid-among-mixed']).default('flat'),
    targets: z
      .array(z.union([shapeIds, solidIds]))
      .min(1)
      .optional(),
    pool: z
      .array(z.union([shapeIds, solidIds]))
      .min(2)
      .optional(),
    tiles: range(3, 8).default([4, 6]),
  }),
  generate(p, rng) {
    const k = between(rng, p.tiles);
    if (p.kind === 'solid-among-mixed') {
      const tiles = Array.from({ length: k }, () => rng.chance(0.5));
      if (!tiles.includes(true) || !tiles.includes(false)) reject('butuh campuran');
      const choices: Choice[] = tiles.map((solid, i) => ({
        id: `i${i}`,
        visual: solid
          ? solidVisual(rng, rng.pick(SOLID_IDS))
          : flatVisual(rng, rng.pick(SHAPE_IDS)),
      }));
      return {
        prompt: 'Ketuk semua bangun ruang.',
        stimulus: [],
        interaction: {
          type: 'tap-all',
          choices,
          answer: choices.filter((c) => c.visual.kind === 'solid').map((c) => c.id),
        },
        reteach: {
          say: 'Bangun ruang bisa dipegang dan punya isi, seperti bola, kubus, dan tabung. Bangun datar tipis seperti gambar.',
        },
      };
    }
    const all = p.kind === 'flat' ? SHAPE_IDS : SOLID_IDS;
    const valid: readonly string[] = p.kind === 'flat' ? ALL_SHAPE_IDS : SOLID_IDS;
    const pool = (p.pool ?? all).filter((id) => valid.includes(id));
    const targets = (p.targets ?? pool).filter((id) => pool.includes(id));
    if (targets.length === 0 || pool.length < 2) reject('pool/target tidak cocok dengan jenis');
    const target = rng.pick(targets);
    const ids = Array.from({ length: k }, () => rng.pick(pool));
    if (!ids.includes(target) || ids.every((id) => id === target))
      reject('butuh target dan bukan target');
    const choices: Choice[] = ids.map((id, i) => ({
      id: `i${i}`,
      visual: p.kind === 'flat' ? flatVisual(rng, id as ShapeId) : solidVisual(rng, id as SolidId),
    }));
    const isTarget = (c: Choice) =>
      (c.visual.kind === 'shape' && c.visual.shape === target) ||
      (c.visual.kind === 'solid' && c.visual.solid === target);
    return {
      prompt: `Ketuk semua ${say(target)}.`,
      stimulus: [],
      interaction: { type: 'tap-all', choices, answer: choices.filter(isTarget).map((c) => c.id) },
      reteach: {
        say: `Ini ${say(target)}. Warna dan besarnya boleh berbeda, bentuknya tetap sama.`,
        show: [
          p.kind === 'flat'
            ? { kind: 'shape', shape: target as ShapeId, color: 'biru', size: 'm' }
            : { kind: 'solid', solid: target as SolidId, color: 'biru' },
        ],
      },
    };
  },
});

export const shapeName = defineFamily({
  description: 'Lihat bentuk, pilih namanya.',
  params: z.strictObject({
    kind: z.enum(['flat', 'solid']).default('flat'),
    pool: z
      .array(z.union([shapeIds, solidIds]))
      .min(2)
      .optional(),
    choices: z.number().int().min(2).max(4).default(3),
  }),
  generate(p, rng) {
    const all = p.kind === 'flat' ? SHAPE_IDS : SOLID_IDS;
    const valid: readonly string[] = p.kind === 'flat' ? ALL_SHAPE_IDS : SOLID_IDS;
    const pool = (p.pool ?? all).filter((id) => valid.includes(id));
    if (pool.length < p.choices) reject('pool kurang');
    const options = rng.sample(pool, p.choices);
    const target = options[0]!;
    const choices: Choice[] = rng.shuffle(
      options.map((id, i) => ({
        id: `w-${id}`,
        visual: { kind: 'word', text: say(id) } as Visual,
        say: say(id),
        ...(i > 0 && { tag: 'nama-lain' }),
      })),
    );
    return {
      prompt: 'Ini bentuk apa?',
      stimulus: [
        p.kind === 'flat'
          ? flatVisual(rng, target as ShapeId)
          : solidVisual(rng, target as SolidId),
      ],
      interaction: { type: 'pick-one', choices, answer: `w-${target}` },
      reteach: { say: `Ini namanya ${say(target)}.` },
    };
  },
});

export const shapeSides = defineFamily({
  description: 'Hitung sisi / sudut bangun datar.',
  params: z.strictObject({
    ask: z.enum(['sides', 'corners', 'either']).default('sides'),
    pool: z
      .array(shapeIds)
      .min(1)
      .default(['segitiga', 'persegi', 'persegi-panjang', 'segi-lima', 'segi-enam']),
    choices: z.number().int().min(2).max(4).default(3),
  }),
  generate(p, rng) {
    const shape = rng.pick(p.pool);
    const ask = p.ask === 'either' ? rng.pick(['sides', 'corners'] as const) : p.ask;
    const n = SHAPES[shape].sides;
    const what = ask === 'sides' ? 'sisi' : 'sudut';
    return {
      prompt: `Ada berapa ${what}?`,
      stimulus: [{ kind: 'shape', shape, color: rng.pick(COLORS), size: 'l' }],
      interaction: {
        type: 'pick-one',
        choices: numberChoices(rng, n, { count: p.choices, min: 0, max: 8 }),
        answer: `n${n}`,
      },
      reteach: {
        say:
          n === 0
            ? `${capitalize(SHAPES[shape].say)} tidak punya ${what}.`
            : `Hitung ${what}nya satu per satu: ${countWords(n)}. ${capitalize(SHAPES[shape].say)} punya ${numberWord(n)} ${what}.`,
      },
    };
  },
});

export const solidDescribe = defineFamily({
  description: 'Bangun ruang mana yang bisa menggelinding / ditumpuk.',
  params: z.strictObject({
    property: z.enum(['rolls', 'stacks', 'either']).default('either'),
    tiles: range(3, 5).default([4, 4]),
  }),
  generate(p, rng) {
    const prop = p.property === 'either' ? rng.pick(['rolls', 'stacks'] as const) : p.property;
    const solids = rng.sample(SOLID_IDS, between(rng, p.tiles));
    const yes = solids.filter((s) => SOLIDS[s][prop]);
    if (yes.length === 0 || yes.length === solids.length) reject('butuh ya dan tidak');
    const choices: Choice[] = solids.map((s) => ({
      id: `s-${s}`,
      visual: solidVisual(rng, s),
      say: SOLIDS[s].say,
    }));
    const word = prop === 'rolls' ? 'bisa menggelinding' : 'bisa ditumpuk';
    return {
      prompt: `Ketuk semua yang ${word}.`,
      stimulus: [],
      interaction: { type: 'tap-all', choices, answer: yes.map((s) => `s-${s}`) },
      reteach: {
        say:
          prop === 'rolls'
            ? 'Yang punya bagian melengkung bisa menggelinding, seperti bola, tabung, dan kerucut.'
            : 'Yang punya sisi datar di atas dan bawah bisa ditumpuk, seperti kubus, balok, dan tabung.',
      },
    };
  },
});

export const solidTrace = defineFamily({
  description: 'Kalau bangun ruang dicap, bentuk datar apa yang muncul?',
  params: z.strictObject({ choices: z.number().int().min(2).max(4).default(3) }),
  generate(p, rng) {
    const solid = rng.pick(SOLID_IDS.filter((s) => s !== 'bola'));
    const face = SOLIDS[solid].face as ShapeId;
    const others = rng.sample(
      SHAPE_IDS.filter((s) => s !== face),
      p.choices - 1,
    );
    const choices: Choice[] = rng.shuffle(
      [face, ...others].map((s) => ({
        id: `f-${s}`,
        visual: { kind: 'shape', shape: s, color: 'biru', size: 'm' } as Visual,
        say: SHAPES[s].say,
        ...(s !== face && { tag: 'bentuk-lain' }),
      })),
    );
    return {
      prompt: `Kalau ${SOLIDS[solid].say} dicap ke kertas, bentuknya seperti apa?`,
      stimulus: [{ kind: 'solid', solid, color: rng.pick(COLORS) }],
      interaction: { type: 'pick-one', choices, answer: `f-${face}`, arrangement: 'row' },
      reteach: {
        say: `Bagian bawah ${SOLIDS[solid].say} berbentuk ${SHAPES[face].say}. Itu yang tercetak.`,
      },
    };
  },
});

export const realWorldShape = defineFamily({
  description: 'Benda sehari-hari bentuknya seperti apa (datar / ruang).',
  params: z.strictObject({
    kind: z.enum(['flat', 'solid']).default('flat'),
    choices: z.number().int().min(2).max(4).default(3),
    /** Bangun datar yang boleh muncul (jawaban & pengecoh); default = bangun datar bawaan. */
    pool: z.array(shapeIds).min(2).optional(),
  }),
  generate(p, rng) {
    const all: readonly string[] = p.kind === 'flat' ? (p.pool ?? SHAPE_IDS) : SOLID_IDS;
    const map = (p.kind === 'flat' ? REAL_WORLD_SHAPES : REAL_WORLD_SOLIDS) as Partial<
      Record<ObjectId, string>
    >;
    const objects = (Object.keys(map) as ObjectId[]).filter((o) => all.includes(map[o]!));
    if (objects.length === 0) reject('tidak ada benda untuk pool ini');
    const object = rng.pick(objects);
    const target = map[object]!;
    const others = rng.sample(
      all.filter((s) => s !== target),
      p.choices - 1,
    );
    const choices: Choice[] = rng.shuffle(
      [target, ...others].map((s) => ({
        id: `s-${s}`,
        visual: (p.kind === 'flat'
          ? { kind: 'shape', shape: s as ShapeId, color: 'ungu', size: 'm' }
          : { kind: 'solid', solid: s as SolidId, color: 'ungu' }) as Visual,
        say: say(s),
        ...(s !== target && { tag: 'bentuk-lain' }),
      })),
    );
    return {
      prompt: `${capitalize(noun(object))} bentuknya seperti apa?`,
      stimulus: [{ kind: 'object', object }],
      interaction: { type: 'pick-one', choices, answer: `s-${target}`, arrangement: 'row' },
      reteach: { say: `${capitalize(noun(object))} bentuknya seperti ${say(target)}.` },
    };
  },
});
