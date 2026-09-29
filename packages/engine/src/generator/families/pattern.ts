import { z } from 'zod';
import {
  COLORS,
  COUNTABLE_OBJECTS,
  SAY_COLOR,
  SHAPES,
  SHAPE_IDS,
  SOLID_IDS,
  type Color,
  type ObjectId,
  type ShapeId,
} from '../assets.js';
import type { Choice, Visual } from '../item.js';
import { between, defineFamily, noun, range, reject } from './common.js';

type Attr = 'color' | 'size' | 'shape' | 'object';
const SIZE_SCALE = { s: 0.55, m: 0.8, l: 1.1 } as const;
const SIZE_WORD = { s: 'kecil', m: 'sedang', l: 'besar' } as const;

/** Kumpulan nilai untuk satu atribut + cara menggambarnya. */
function attrSpace(attr: Attr, rng: { pick<T>(xs: readonly T[]): T }) {
  const shape = rng.pick(SHAPE_IDS);
  const color = rng.pick(COLORS);
  const object = rng.pick(COUNTABLE_OBJECTS);
  switch (attr) {
    case 'color':
      return {
        values: [...COLORS] as string[],
        visual: (v: string): Visual => ({ kind: 'shape', shape, color: v as Color, size: 'm' }),
        say: (v: string) => SAY_COLOR[v as Color],
      };
    case 'size':
      return {
        values: ['s', 'm', 'l'],
        visual: (v: string): Visual => ({
          kind: 'object',
          object,
          scaleX: SIZE_SCALE[v as 's'],
          scaleY: SIZE_SCALE[v as 's'],
        }),
        say: (v: string) => SIZE_WORD[v as 's'],
      };
    case 'shape':
      return {
        values: [...SHAPE_IDS] as string[],
        visual: (v: string): Visual => ({ kind: 'shape', shape: v as ShapeId, color, size: 'm' }),
        say: (v: string) => SHAPES[v as ShapeId].say,
      };
    case 'object':
      return {
        values: [...COUNTABLE_OBJECTS] as string[],
        visual: (v: string): Visual => ({ kind: 'object', object: v as ObjectId }),
        say: (v: string) => noun(v as ObjectId),
      };
  }
}

const attrSchema = z.enum(['color', 'size', 'shape', 'object']);

export const pattern = defineFamily({
  description: 'Lanjutkan pola warna / ukuran / bentuk / benda.',
  params: z.strictObject({
    attribute: attrSchema.default('color'),
    units: z
      .array(z.enum(['AB', 'AAB', 'ABB', 'ABC', 'AABB']))
      .min(1)
      .default(['AB', 'AAB', 'ABB']),
    shown: range(4, 9).default([4, 6]),
    choices: z.number().int().min(2).max(4).default(3),
  }),
  generate(p, rng) {
    const space = attrSpace(p.attribute, rng);
    const unit = rng.pick(p.units);
    const letters = [...new Set(unit)];
    const values = rng.sample(space.values, letters.length);
    const valueOf = (i: number) => values[letters.indexOf(unit[i % unit.length]!)]!;
    const shown = Math.max(between(rng, p.shown), unit.length + 1);
    const answer = valueOf(shown);
    const others = rng.shuffle(space.values.filter((v) => v !== answer));
    // Utamakan pengecoh dari pola itu sendiri (kesalahan paling umum), lalu nilai lain.
    const inUnit = others.filter((v) => values.includes(v));
    const outside = others.filter((v) => !values.includes(v));
    const distractors = [...inUnit, ...outside].slice(0, p.choices - 1);
    if (distractors.length < p.choices - 1) reject('pengecoh kurang');
    const choices: Choice[] = rng.shuffle([
      { id: `v-${answer}`, visual: space.visual(answer), say: space.say(answer) },
      ...distractors.map((v) => ({
        id: `v-${v}`,
        visual: space.visual(v),
        say: space.say(v),
        tag: values.includes(v) ? 'salah-urutan-pola' : 'di-luar-pola',
      })),
    ]);
    const seq = Array.from({ length: shown }, (_, i) => valueOf(i));
    return {
      prompt: 'Apa yang berikutnya?',
      say: `${seq.map(space.say).join(', ')}, ... apa yang berikutnya?`,
      stimulus: [{ kind: 'row', items: [...seq.map(space.visual), { kind: 'blank' }] }],
      interaction: { type: 'pick-one', choices, answer: `v-${answer}`, arrangement: 'row' },
      reteach: {
        say: `Polanya berulang: ${Array.from({ length: unit.length }, (_, i) => space.say(valueOf(i))).join(', ')}. Jadi berikutnya ${space.say(answer)}.`,
        show: [
          {
            kind: 'row',
            items: Array.from({ length: shown + 1 }, (_, i) => space.visual(valueOf(i))),
          },
        ],
      },
    };
  },
});

export const sameDifferent = defineFamily({
  description: 'Mana yang berbeda / mana yang sama / ketuk dua yang sama.',
  params: z.strictObject({
    attribute: z.enum(['color', 'shape', 'object']).default('object'),
    mode: z.enum(['different', 'same', 'pair']).default('different'),
    count: range(3, 6).default([3, 4]),
  }),
  generate(p, rng) {
    const space = attrSpace(p.attribute, rng);
    const k = p.mode === 'pair' ? 4 : between(rng, p.count);
    if (p.mode === 'different') {
      const [base, odd] = rng.sample(space.values, 2) as [string, string];
      const oddAt = rng.int(0, k - 1);
      const choices: Choice[] = Array.from({ length: k }, (_, i) => ({
        id: `i${i}`,
        visual: space.visual(i === oddAt ? odd : base),
        ...(i !== oddAt && { tag: 'memilih-yang-sama' }),
      }));
      return {
        prompt: 'Mana yang berbeda?',
        stimulus: [],
        interaction: { type: 'pick-one', choices, answer: `i${oddAt}`, arrangement: 'row' },
        reteach: {
          say: `Semua ${space.say(base)}, hanya satu yang ${space.say(odd)}. Itu yang berbeda.`,
        },
      };
    }
    if (p.mode === 'same') {
      const vals = rng.sample(space.values, k);
      const target = vals[0]!;
      const choices: Choice[] = rng.shuffle(
        vals.map((v, i) => ({
          id: `i${i}`,
          visual: space.visual(v),
          ...(i > 0 && { tag: 'berbeda' }),
        })),
      );
      return {
        prompt: 'Mana yang sama dengan ini?',
        stimulus: [space.visual(target)],
        interaction: { type: 'pick-one', choices, answer: 'i0', arrangement: 'row' },
        reteach: { say: `Yang ini ${space.say(target)}. Cari yang juga ${space.say(target)}.` },
      };
    }
    const vals = rng.sample(space.values, 3);
    const tiles = rng.shuffle([vals[0]!, vals[0]!, vals[1]!, vals[2]!]);
    const choices: Choice[] = tiles.map((v, i) => ({ id: `i${i}`, visual: space.visual(v) }));
    return {
      prompt: 'Ketuk dua yang sama.',
      stimulus: [],
      interaction: {
        type: 'tap-all',
        choices,
        answer: tiles.flatMap((v, i) => (v === vals[0] ? [`i${i}`] : [])),
      },
      reteach: { say: `Ada dua yang ${space.say(vals[0]!)}. Itu pasangan yang sama.` },
    };
  },
});

export const sort = defineFamily({
  description:
    'Kelompokkan menurut warna / bentuk / bangun datar-ruang, atau ketuk semua warna tertentu.',
  params: z.strictObject({
    attribute: z.enum(['color', 'shape', 'flat-solid']).default('color'),
    mode: z.enum(['tap-all', 'group']).default('group'),
    items: range(3, 8).default([4, 6]),
    groups: z.number().int().min(2).max(3).default(2),
  }),
  generate(p, rng) {
    const k = between(rng, p.items);
    if (p.attribute === 'flat-solid') {
      const items: Choice[] = Array.from({ length: k }, (_, i) => {
        const solid = rng.chance(0.5);
        const color = rng.pick(COLORS);
        return solid
          ? { id: `i${i}`, visual: { kind: 'solid', solid: rng.pick(SOLID_IDS), color } as Visual }
          : {
              id: `i${i}`,
              visual: { kind: 'shape', shape: rng.pick(SHAPE_IDS), color, size: 'm' } as Visual,
            };
      });
      const kinds = new Set(items.map((c) => c.visual.kind));
      if (kinds.size < 2) reject('butuh datar dan ruang');
      return {
        prompt: 'Pisahkan bangun datar dan bangun ruang.',
        stimulus: [],
        interaction: {
          type: 'group',
          groups: [
            {
              id: 'datar',
              visual: { kind: 'shape', shape: 'persegi', color: 'kuning', size: 'm' },
              say: 'bangun datar',
            },
            {
              id: 'ruang',
              visual: { kind: 'solid', solid: 'kubus', color: 'kuning' },
              say: 'bangun ruang',
            },
          ],
          items,
          answer: Object.fromEntries(
            items.map((c) => [c.id, c.visual.kind === 'solid' ? 'ruang' : 'datar']),
          ),
        },
        reteach: {
          say: 'Bangun datar itu tipis seperti gambar di kertas. Bangun ruang bisa dipegang dan punya isi, seperti kubus.',
        },
      };
    }

    if (p.attribute === 'color') {
      const palette = rng.sample(COLORS, p.mode === 'group' ? p.groups : 3);
      const colors = Array.from({ length: k }, () => rng.pick(palette));
      if (palette.some((c) => !colors.includes(c))) reject('setiap warna harus muncul');
      const items: Choice[] = colors.map((color, i) => ({
        id: `i${i}`,
        visual: { kind: 'shape', shape: rng.pick(SHAPE_IDS), color, size: 'm' },
      }));
      if (p.mode === 'tap-all') {
        const target = palette[0]!;
        return {
          prompt: `Ketuk semua yang berwarna ${SAY_COLOR[target]}.`,
          stimulus: [],
          interaction: {
            type: 'tap-all',
            choices: items,
            answer: items.filter((_, i) => colors[i] === target).map((c) => c.id),
          },
          reteach: {
            say: `Cari warna ${SAY_COLOR[target]} saja. Bentuknya boleh berbeda.`,
            show: [{ kind: 'swatch', color: target }],
          },
        };
      }
      return {
        prompt: 'Kelompokkan menurut warnanya.',
        stimulus: [],
        interaction: {
          type: 'group',
          groups: palette.map((color) => ({
            id: `g-${color}`,
            visual: { kind: 'swatch', color },
            say: SAY_COLOR[color],
          })),
          items,
          answer: Object.fromEntries(items.map((c, i) => [c.id, `g-${colors[i]}`])),
        },
        reteach: { say: 'Lihat warnanya saja. Taruh yang warnanya sama di tempat yang sama.' },
      };
    }

    // shape
    const shapes = rng.sample(SHAPE_IDS, p.groups);
    const picked = Array.from({ length: k }, () => rng.pick(shapes));
    if (shapes.some((s) => !picked.includes(s))) reject('setiap bentuk harus muncul');
    const items: Choice[] = picked.map((shape, i) => ({
      id: `i${i}`,
      visual: {
        kind: 'shape',
        shape,
        color: rng.pick(COLORS),
        size: rng.pick(['s', 'm', 'l'] as const),
        rotate: rng.pick([0, 0, 15, 30]),
      },
    }));
    if (p.mode === 'tap-all') {
      const target = shapes[0]!;
      return {
        prompt: `Ketuk semua ${SHAPES[target].say}.`,
        stimulus: [],
        interaction: {
          type: 'tap-all',
          choices: items,
          answer: items.filter((_, i) => picked[i] === target).map((c) => c.id),
        },
        reteach: { say: `Cari bentuk ${SHAPES[target].say}. Warnanya boleh berbeda.` },
      };
    }
    return {
      prompt: 'Kelompokkan menurut bentuknya.',
      stimulus: [],
      interaction: {
        type: 'group',
        groups: shapes.map((shape) => ({
          id: `g-${shape}`,
          visual: { kind: 'shape', shape, color: 'ungu', size: 'm' },
          say: SHAPES[shape].say,
        })),
        items,
        answer: Object.fromEntries(items.map((c, i) => [c.id, `g-${picked[i]}`])),
      },
      reteach: { say: 'Lihat bentuknya saja, bukan warnanya.' },
    };
  },
});
