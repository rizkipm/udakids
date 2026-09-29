import { z } from 'zod';
import { COUNTABLE_OBJECTS, NAMES } from '../assets.js';
import { evalBool, evalNumber, exprVariables } from '../expr.js';
import type { Choice, Visual } from '../item.js';
import { numberWord } from '../words.js';
import { countWords, defineFamily, noun, numberChoices, objectIdSchema, reject } from './common.js';

const exprSchema = z.string().min(1).max(80);
const distractorSchema = z.union([
  exprSchema,
  z.strictObject({ expr: exprSchema, tag: z.string().min(1) }),
]);

const PRESENTATIONS = [
  'pictures',
  'cubes',
  'put-together',
  'train-words',
  'train-sentence',
  'sentence',
  'model-match',
  'model-show',
  'word-problem',
] as const;

/**
 * PRD A10 — template penjumlahan/pengurangan: `vars` (rentang), `constraint`, `answer`, `distractors`
 * sebagai ekspresi kecil yang dievaluasi evaluator aman (tanpa eval).
 */
export const arith = defineFamily({
  description:
    'Penjumlahan / pengurangan dengan gambar, kubus, kalimat, model, atau soal cerita (PRD A10).',
  params: z
    .strictObject({
      op: z.enum(['+', '-']).default('+'),
      vars: z
        .record(
          z.string().regex(/^[a-z]$/),
          z.tuple([z.number().int().min(0), z.number().int().min(0)]),
        )
        .default({ a: [1, 4], b: [1, 4] }),
      constraint: exprSchema.optional(),
      answer: exprSchema.default('a + b'),
      distractors: z.array(distractorSchema).default([]),
      presentation: z.enum(PRESENTATIONS).default('pictures'),
      objects: z.array(objectIdSchema).min(1).optional(),
      hidePictures: z.boolean().default(false),
      choices: z.number().int().min(2).max(5).default(3),
    })
    .superRefine((p, ctx) => {
      const known = new Set(Object.keys(p.vars));
      for (const src of [
        p.constraint,
        p.answer,
        ...p.distractors.map((d) => (typeof d === 'string' ? d : d.expr)),
      ]) {
        if (!src) continue;
        try {
          for (const v of exprVariables(src)) {
            if (!known.has(v))
              ctx.addIssue({
                code: 'custom',
                message: `ekspresi "${src}" memakai variabel tak dikenal "${v}"`,
              });
          }
        } catch (err) {
          ctx.addIssue({
            code: 'custom',
            message: `ekspresi "${src}" tidak valid: ${(err as Error).message}`,
          });
        }
      }
      if (!known.has('a') || !known.has('b'))
        ctx.addIssue({ code: 'custom', message: 'vars harus berisi a dan b' });
    }),
  generate(p, rng) {
    const vars: Record<string, number> = {};
    for (const [name, [lo, hi]] of Object.entries(p.vars)) vars[name] = rng.int(lo, hi);
    if (p.constraint && !evalBool(p.constraint, vars)) reject('constraint');
    const a = vars.a!;
    const b = vars.b!;
    const answer = evalNumber(p.answer, vars);
    if (!Number.isInteger(answer) || answer < 0) reject('jawaban bukan bilangan cacah');
    const plus = p.op === '+';
    const object = rng.pick(p.objects ?? COUNTABLE_OBJECTS);
    const what = noun(object);
    const tagged = p.distractors.map((d) =>
      typeof d === 'string'
        ? { value: evalNumber(d, vars), tag: d }
        : { value: evalNumber(d.expr, vars), tag: d.tag },
    );
    const numeric = () =>
      numberChoices(rng, answer, {
        count: p.choices,
        min: 0,
        max: Math.max(answer + 2, a + b + 1),
        tagged,
      });

    const pictures: Visual[] = plus
      ? [
          {
            kind: 'row',
            items: [
              { kind: 'objects', object, count: a, layout: 'row' },
              { kind: 'objects', object, count: b, layout: 'row' },
            ],
          },
        ]
      : [{ kind: 'objects', object, count: a, layout: 'row', crossed: b }];
    const train = (x: number, y: number, separated = false): Visual =>
      plus
        ? { kind: 'cubes', counts: [x, y], colors: ['merah', 'biru'], separated }
        : { kind: 'cubes', counts: [x], colors: ['merah'], crossed: y };
    const equation = (result?: number): Visual => ({
      kind: 'equation',
      left: a,
      op: p.op,
      right: b,
      ...(result !== undefined && { result }),
    });
    const opWord = plus ? 'tambah' : 'kurang';
    const sentenceSay = `${numberWord(a)} ${opWord} ${numberWord(b)} sama dengan berapa?`;
    const reteach = plus
      ? {
          say: `Hitung semuanya: ${countWords(answer)}. Jadi ${numberWord(a)} ${opWord} ${numberWord(b)} sama dengan ${numberWord(answer)}.`,
          show: [
            {
              kind: 'cubes',
              counts: [a, b],
              colors: ['merah', 'biru'],
              countAlong: true,
            } as Visual,
          ],
        }
      : {
          say: `Ada ${numberWord(a)}, diambil ${numberWord(b)}. Hitung yang tersisa: ${countWords(answer)}. Tinggal ${numberWord(answer)}.`,
          show: [
            {
              kind: 'cubes',
              counts: [a],
              colors: ['merah'],
              crossed: b,
              countAlong: true,
            } as Visual,
          ],
        };
    const pick = (prompt: string, stimulus: Visual[], say?: string) => ({
      prompt,
      ...(say && { say }),
      stimulus,
      interaction: { type: 'pick-one' as const, choices: numeric(), answer: `n${answer}` },
      reteach,
    });

    switch (p.presentation) {
      case 'pictures':
        return plus
          ? pick(
              `Ada ${a} ${what} dan ${b} ${what} lagi. Semuanya ada berapa?`,
              pictures,
              `Ada ${numberWord(a)} ${what} dan ${numberWord(b)} ${what} lagi. Semuanya ada berapa?`,
            )
          : pick(
              `Ada ${a} ${what}. ${b} pergi. Tinggal berapa?`,
              pictures,
              `Ada ${numberWord(a)} ${what}. ${numberWord(b)} pergi. Tinggal berapa?`,
            );
      case 'cubes':
        return plus
          ? pick(
              'Berapa kubus semuanya?',
              [train(a, b)],
              `${numberWord(a)} kubus merah dan ${numberWord(b)} kubus biru. Berapa semuanya?`,
            )
          : pick(
              'Berapa kubus yang tersisa?',
              [train(a, b)],
              `Ada ${numberWord(a)} kubus. ${numberWord(b)} dicoret. Tinggal berapa?`,
            );
      case 'put-together':
        return plus
          ? pick(
              `Gabungkan ${a} kubus dan ${b} kubus. Jadi berapa?`,
              [train(a, b, true)],
              `Gabungkan ${numberWord(a)} kubus dan ${numberWord(b)} kubus. Jadi berapa?`,
            )
          : pick(
              `Ambil ${b} dari ${a} kubus. Tinggal berapa?`,
              [train(a, b)],
              `Ambil ${numberWord(b)} dari ${numberWord(a)} kubus. Tinggal berapa?`,
            );
      case 'train-words':
        return plus
          ? pick(
              `Kereta kubus: ${a} merah dan ${b} biru. Semuanya berapa?`,
              [train(a, b)],
              `Kereta kubus ini punya ${numberWord(a)} kubus merah dan ${numberWord(b)} kubus biru. Semuanya berapa?`,
            )
          : pick(
              `Kereta ${a} kubus. ${b} dilepas. Tinggal berapa?`,
              [train(a, b)],
              `Kereta ${numberWord(a)} kubus. ${numberWord(b)} kubus dilepas. Tinggal berapa?`,
            );
      case 'train-sentence':
        return pick('Berapa hasilnya?', [train(a, b), equation()], sentenceSay);
      case 'sentence':
        return pick('Berapa hasilnya?', [...pictures, equation()], sentenceSay);
      case 'model-match': {
        const models = [
          [a, b],
          [a + 1, b],
          [a, b + 1],
          [a - 1, b],
          [a, b - 1],
        ].filter(([x, y]) => x! >= 1 && y! >= (plus ? 1 : 0) && (plus || y! <= x!));
        const unique = [...new Map(models.map((m) => [m.join('-'), m])).values()];
        const chosen = [unique[0]!, ...rng.shuffle(unique.slice(1)).slice(0, p.choices - 1)];
        if (chosen.length < p.choices) reject('model pengecoh kurang');
        const choices: Choice[] = rng.shuffle(
          chosen.map(([x, y], i) => ({
            id: `m${x}-${y}`,
            visual: train(x!, y!),
            ...(i > 0 && { tag: 'model-lain' }),
          })),
        );
        return {
          prompt: 'Gambar mana yang cocok?',
          say: `${numberWord(a)} ${opWord} ${numberWord(b)} sama dengan ${numberWord(answer)}. Gambar mana yang cocok?`,
          stimulus: [equation(answer)],
          interaction: { type: 'pick-one', choices, answer: `m${a}-${b}` },
          reteach,
        };
      }
      case 'model-show': {
        const sentences = [
          [a, b],
          [a + 1, b],
          [a, b + 1],
          [a - 1, b],
        ].filter(
          ([x, y]) =>
            x! >= (plus ? 1 : 0) &&
            y! >= (plus ? 1 : 0) &&
            (plus || y! <= x!) &&
            !(plus && x === b && y === a && a !== b),
        );
        const unique = [...new Map(sentences.map((m) => [m.join('-'), m])).values()];
        const chosen = [unique[0]!, ...rng.shuffle(unique.slice(1)).slice(0, p.choices - 1)];
        if (chosen.length < p.choices) reject('kalimat pengecoh kurang');
        const choices: Choice[] = rng.shuffle(
          chosen.map(([x, y], i) => ({
            id: `e${x}-${y}`,
            visual: {
              kind: 'equation',
              left: x!,
              op: p.op,
              right: y!,
              result: plus ? x! + y! : x! - y!,
            } as Visual,
            ...(i > 0 && { tag: 'kalimat-lain' }),
          })),
        );
        return {
          prompt: 'Kalimat mana yang cocok dengan gambar?',
          stimulus: [train(a, b)],
          interaction: { type: 'pick-one', choices, answer: `e${a}-${b}` },
          reteach,
        };
      }
      case 'word-problem': {
        const name = rng.pick(NAMES);
        const stim = p.hidePictures ? [] : pictures;
        return plus
          ? pick(
              `${name} punya ${a} ${what}. Ibu memberi ${b} lagi. Sekarang ${name} punya berapa ${what}?`,
              stim,
              `${name} punya ${numberWord(a)} ${what}. Ibu memberi ${numberWord(b)} lagi. Sekarang ${name} punya berapa ${what}?`,
            )
          : pick(
              `${name} punya ${a} ${what}. ${b} diberikan ke teman. Tinggal berapa?`,
              stim,
              `${name} punya ${numberWord(a)} ${what}. ${numberWord(b)} diberikan ke teman. Tinggal berapa ${what}?`,
            );
      }
    }
  },
});
