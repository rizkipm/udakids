import { z } from 'zod';
import type { Choice, Visual } from '../item.js';
import { numberWord, ordinalWord } from '../words.js';
import {
  between,
  COUNT_VISUALS,
  countVisual,
  countWords,
  defineFamily,
  frameSizeFor,
  layoutSchema,
  noun,
  numberChoices,
  numeralChoice,
  objectIdSchema,
  pickObject,
  range,
  reject,
  withCountAlong,
} from './common.js';
import { COUNTABLE_OBJECTS } from '../assets.js';

const choiceCount = z.number().int().min(2).max(5).default(3);

export const numeralTapAll = defineFamily({
  description: 'Ketuk semua angka tertentu (mengenal lambang bilangan).',
  params: z.strictObject({
    values: range(0, 20).default([1, 3]),
    tiles: range(2, 8).default([3, 5]),
  }),
  generate(p, rng) {
    const target = between(rng, p.values);
    const k = between(rng, p.tiles);
    const others = Array.from({ length: k }, () => between(rng, p.values)).filter(
      (v) => v !== target,
    );
    const hits = rng.int(1, Math.max(1, Math.floor(k / 2)));
    const values = rng.shuffle(
      [...Array.from({ length: hits }, () => target), ...others].slice(0, k),
    );
    if (values.every((v) => v === target)) reject('butuh angka target dan angka lain');
    const choices: Choice[] = values.map((value, i) => ({
      id: `t${i}`,
      visual: { kind: 'numeral', value },
    }));
    return {
      prompt: `Ketuk semua angka ${target}.`,
      say: `Ketuk semua angka ${numberWord(target)}.`,
      stimulus: [],
      interaction: {
        type: 'tap-all',
        choices,
        answer: choices
          .filter((c) => c.visual.kind === 'numeral' && c.visual.value === target)
          .map((c) => c.id),
      },
      reteach: {
        say: `Ini angka ${numberWord(target)}. Cari yang bentuknya sama persis, ya.`,
        show: [{ kind: 'numeral', value: target }],
      },
    };
  },
});

export const numeralListen = defineFamily({
  description: 'Dengar sebuah bilangan, lalu ketuk angkanya.',
  params: z.strictObject({ values: range(0, 20).default([1, 3]), choices: choiceCount }),
  generate(p, rng) {
    const n = between(rng, p.values);
    return {
      prompt: 'Ketuk angka yang kamu dengar.',
      say: `Ketuk angka ${numberWord(n)}.`,
      stimulus: [],
      interaction: {
        type: 'pick-one',
        choices: numberChoices(rng, n, {
          count: p.choices,
          min: p.values[0],
          max: Math.max(p.values[1], p.values[0] + p.choices - 1),
        }),
        answer: `n${n}`,
      },
      reteach: {
        say: `${numberWord(n)} ditulis seperti ini.`,
        show: [{ kind: 'numeral', value: n }],
      },
    };
  },
});

export const count = defineFamily({
  description: 'Hitung benda / titik / kubus / bingkai, lalu ketuk angkanya.',
  params: z.strictObject({
    range: range(0, 20).default([1, 3]),
    visual: z.enum(COUNT_VISUALS).default('objects'),
    layout: layoutSchema.default('row'),
    countAlong: z.boolean().default(false),
    objects: z.array(objectIdSchema).min(1).optional(),
    choices: choiceCount,
  }),
  generate(p, rng) {
    const n = between(rng, p.range);
    const object = pickObject(rng, p.objects);
    const { visual, noun: what } = countVisual(rng, p.visual, n, {
      layout: p.layout,
      object,
      frameMax: p.range[1],
      countAlong: p.countAlong,
    });
    const min = Math.max(p.range[0] === 0 ? 0 : 1, 0);
    return {
      prompt: `Ada berapa ${what}?`,
      stimulus: [visual],
      interaction: {
        type: 'pick-one',
        choices: numberChoices(rng, n, {
          count: p.choices,
          min,
          max: Math.max(p.range[1], p.choices),
        }),
        answer: `n${n}`,
      },
      reteach: {
        say: `Yuk hitung bareng: ${countWords(n)}. Ada ${numberWord(n)} ${what}.`,
        show: [withCountAlong(visual)],
      },
    };
  },
});

export const build = defineFamily({
  description: 'Tunjukkan bilangan dengan menaruh kubus / titik di bingkai / stiker.',
  params: z.strictObject({
    range: range(1, 20).default([1, 3]),
    unit: z.enum(['cube', 'frame', 'sticker', 'object']).default('cube'),
    objects: z.array(objectIdSchema).min(1).optional(),
  }),
  generate(p, rng) {
    const n = between(rng, p.range);
    const object = p.unit === 'object' ? pickObject(rng, p.objects) : undefined;
    const what =
      p.unit === 'cube'
        ? 'kubus'
        : p.unit === 'frame'
          ? 'titik'
          : p.unit === 'sticker'
            ? 'stiker'
            : noun(object!);
    const frameSize = frameSizeFor(p.range[1]);
    return {
      prompt: `Taruh ${n} ${what}.`,
      say: `Taruh ${numberWord(n)} ${what}. Ketuk satu per satu, ya.`,
      stimulus: [{ kind: 'numeral', value: n }],
      interaction: {
        type: 'build',
        target: n,
        unit: p.unit,
        ...(object && { object }),
        max: p.unit === 'frame' ? frameSize : p.range[1] + 3,
        ...(p.unit === 'frame' && { frameSize }),
      },
      reteach: {
        say: `Taruh satu per satu sambil menghitung: ${countWords(n)}. Berhenti di ${numberWord(n)}.`,
      },
    };
  },
});

export const represent = defineFamily({
  description: 'Lihat angka, pilih kelompok gambar yang jumlahnya sama.',
  params: z.strictObject({
    range: range(1, 20).default([1, 3]),
    visual: z.enum(['objects', 'dots', 'shapes', 'cubes', 'frame']).default('objects'),
    layout: layoutSchema.default('row'),
    choices: choiceCount,
  }),
  generate(p, rng) {
    const n = between(rng, p.range);
    const object = pickObject(rng);
    const max = p.range[1] + 1;
    const counts = numberChoices(rng, n, { count: p.choices, min: 1, max }).map((c) =>
      c.visual.kind === 'numeral' ? { value: c.visual.value, tag: c.tag } : reject('tak terduga'),
    );
    const choices: Choice[] = counts.map(({ value, tag }) => ({
      id: `g${value}`,
      visual: countVisual(rng, p.visual, value, { layout: p.layout, object, frameMax: max }).visual,
      ...(tag && { tag }),
    }));
    return {
      prompt: `Mana yang ada ${n}?`,
      say: `Mana yang jumlahnya ${numberWord(n)}?`,
      stimulus: [{ kind: 'numeral', value: n }],
      interaction: { type: 'pick-one', choices, answer: `g${n}` },
      reteach: {
        say: `Hitung setiap kelompok. Kita cari yang sampai ${numberWord(n)}: ${countWords(n)}.`,
      },
    };
  },
});

export const numberOrder = defineFamily({
  description: 'Susun angka dari yang paling kecil.',
  params: z.strictObject({
    max: z.number().int().min(3).max(100).default(5),
    length: range(2, 6).default([3, 4]),
    consecutive: z.boolean().default(true),
  }),
  generate(p, rng) {
    const len = between(rng, p.length);
    if (len > p.max) reject('panjang > max');
    let values: number[];
    if (p.consecutive) {
      const start = rng.int(1, p.max - len + 1);
      values = Array.from({ length: len }, (_, i) => start + i);
    } else {
      values = rng
        .sample(
          Array.from({ length: p.max }, (_, i) => i + 1),
          len,
        )
        .sort((a, b) => a - b);
    }
    const choices = rng.shuffle(values.map((v) => numeralChoice(v)));
    if (choices.every((c, i) => c.id === `n${values[i]}`)) reject('sudah terurut');
    return {
      prompt: 'Susun angka dari yang paling kecil.',
      stimulus: [],
      interaction: { type: 'order', choices, answer: values.map((v) => `n${v}`) },
      reteach: {
        say: `Kita hitung: ${values.map(numberWord).join(', ')}. Yang paling kecil di depan.`,
        show: [
          { kind: 'row', items: values.map((value) => ({ kind: 'numeral', value }) as Visual) },
        ],
      },
    };
  },
});

export const numberNext = defineFamily({
  description: 'Angka berapa berikutnya / yang hilang dalam urutan membilang.',
  params: z.strictObject({
    max: z.number().int().min(3).max(100).default(5),
    length: range(3, 8).default([3, 4]),
    mode: z.enum(['next', 'missing']).default('next'),
    choices: choiceCount,
  }),
  generate(p, rng) {
    const len = between(rng, p.length);
    if (len > p.max) reject('panjang > max');
    const start = rng.int(1, p.max - len + 1);
    const values = Array.from({ length: len }, (_, i) => start + i);
    const blank = p.mode === 'next' ? len - 1 : rng.int(1, len - 1);
    const answer = values[blank]!;
    const shown: Visual[] = values.map((value, i) =>
      i === blank ? { kind: 'blank' } : { kind: 'numeral', value },
    );
    const spoken = values.map((v, i) => (i === blank ? 'berapa' : numberWord(v))).join(', ');
    return {
      prompt: p.mode === 'next' ? 'Angka berapa yang berikutnya?' : 'Angka berapa yang hilang?',
      say: `${spoken}?`,
      stimulus: [{ kind: 'row', items: shown }],
      interaction: {
        type: 'pick-one',
        choices: numberChoices(rng, answer, { count: p.choices, min: 1, max: p.max + 1 }),
        answer: `n${answer}`,
      },
      reteach: {
        say: `Kita hitung bareng: ${values.map(numberWord).join(', ')}. Jadi angkanya ${numberWord(answer)}.`,
        show: [
          { kind: 'row', items: values.map((value) => ({ kind: 'numeral', value }) as Visual) },
        ],
      },
    };
  },
});

export const numberLine = defineFamily({
  description: 'Momo maju di garis bilangan; ketuk tempat Momo berhenti.',
  params: z.strictObject({
    max: z.number().int().min(5).max(20).default(20),
    start: range(0, 20).default([0, 10]),
    steps: range(1, 10).default([1, 5]),
  }),
  generate(p, rng) {
    const a = between(rng, p.start);
    const b = between(rng, p.steps);
    if (a + b > p.max) reject('melewati garis');
    return {
      prompt: `Momo di angka ${a}. Maju ${b} langkah. Momo sampai di angka berapa?`,
      say: `Momo di angka ${numberWord(a)}. Maju ${numberWord(b)} langkah. Momo sampai di angka berapa?`,
      stimulus: [],
      interaction: { type: 'number-line', min: 0, max: p.max, start: a, answer: a + b },
      reteach: {
        say: `Mulai dari ${numberWord(a)}, hitung maju: ${countWords(a + b, a + 1)}. Momo sampai di ${numberWord(a + b)}.`,
      },
    };
  },
});

export const ordinal = defineFamily({
  description: 'Urutan ke- (pertama, kedua, ...) dari kiri.',
  params: z.strictObject({
    length: z.number().int().min(3).max(10).default(5),
    maxOrdinal: z.number().int().min(1).max(10).default(5),
  }),
  generate(p, rng) {
    const pos = rng.int(1, Math.min(p.maxOrdinal, p.length));
    const objects = Array.from({ length: p.length }, () => rng.pick(COUNTABLE_OBJECTS));
    const choices: Choice[] = objects.map((object, i) => ({
      id: `p${i + 1}`,
      visual: { kind: 'object', object },
      ...(i + 1 !== pos && {
        tag: i + 1 === pos - 1 ? 'kurang-satu' : i + 1 === pos + 1 ? 'lebih-satu' : 'lain',
      }),
    }));
    const word = ordinalWord(pos);
    return {
      prompt: `Ketuk benda yang ${word} dari kiri.`,
      stimulus: [],
      interaction: { type: 'pick-one', choices, answer: `p${pos}`, arrangement: 'row' },
      reteach: {
        say: `Hitung dari kiri: ${Array.from({ length: pos }, (_, i) => ordinalWord(i + 1)).join(', ')}. Ini yang ${word}: ${noun(objects[pos - 1]!)}.`,
      },
    };
  },
});

export const oneMoreLess = defineFamily({
  description: 'Satu lebih banyak / satu lebih sedikit dengan gambar.',
  params: z.strictObject({
    range: range(1, 20).default([1, 4]),
    mode: z.enum(['more', 'less']).default('more'),
    choices: choiceCount,
  }),
  generate(p, rng) {
    const n = between(rng, p.range);
    if (p.mode === 'less' && n < 2) reject('butuh minimal 2 untuk dikurangi');
    const object = pickObject(rng);
    const what = noun(object);
    const answer = p.mode === 'more' ? n + 1 : n - 1;
    const visual: Visual = { kind: 'objects', object, count: n, layout: 'row' };
    return {
      prompt:
        p.mode === 'more'
          ? `Ada ${n} ${what}. Satu lagi datang. Jadi ada berapa?`
          : `Ada ${n} ${what}. Satu pergi. Tinggal berapa?`,
      say:
        p.mode === 'more'
          ? `Ada ${numberWord(n)} ${what}. Satu lagi datang. Jadi ada berapa?`
          : `Ada ${numberWord(n)} ${what}. Satu pergi. Tinggal berapa?`,
      stimulus: [visual],
      interaction: {
        type: 'pick-one',
        choices: numberChoices(rng, answer, {
          count: p.choices,
          min: 1,
          max: p.range[1] + 2,
          tagged: [{ value: n, tag: 'tidak-berubah' }],
        }),
        answer: `n${answer}`,
      },
      reteach: {
        say:
          p.mode === 'more'
            ? `Satu lebih banyak dari ${numberWord(n)} adalah ${numberWord(answer)}. Hitung: ${countWords(answer)}.`
            : `Satu lebih sedikit dari ${numberWord(n)} adalah ${numberWord(answer)}. Hitung: ${countWords(answer)}.`,
        show: [{ kind: 'objects', object, count: answer, layout: 'row', countAlong: true }],
      },
    };
  },
});

export const compareNumbers = defineFamily({
  description: 'Mana angka yang lebih besar / terbesar / lebih kecil / terkecil.',
  params: z.strictObject({
    max: z.number().int().min(3).max(100).default(10),
    mode: z.enum(['larger', 'largest', 'smaller', 'smallest']).default('larger'),
  }),
  generate(p, rng) {
    const k = p.mode === 'larger' || p.mode === 'smaller' ? 2 : 3;
    const values = rng.sample(
      Array.from({ length: p.max }, (_, i) => i + 1),
      k,
    );
    const big = p.mode === 'larger' || p.mode === 'largest';
    const answer = big ? Math.max(...values) : Math.min(...values);
    const word = {
      larger: 'lebih besar',
      largest: 'paling besar',
      smaller: 'lebih kecil',
      smallest: 'paling kecil',
    }[p.mode];
    return {
      prompt: `Mana angka yang ${word}?`,
      stimulus: [],
      interaction: {
        type: 'pick-one',
        choices: values.map((v) => numeralChoice(v, v === answer ? undefined : 'terbalik', true)),
        answer: `n${answer}`,
        arrangement: 'row',
      },
      reteach: {
        say: big
          ? `Saat membilang, angka yang disebut belakangan lebih besar. ${numberWord(answer)} paling akhir, jadi paling besar.`
          : `Saat membilang, angka yang disebut duluan lebih kecil. ${numberWord(answer)} paling awal, jadi paling kecil.`,
        show: [
          {
            kind: 'row',
            items: [...values]
              .sort((a, b) => a - b)
              .map((value) => ({ kind: 'numeral', value }) as Visual),
          },
        ],
      },
    };
  },
});
