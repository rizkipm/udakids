import { z } from 'zod';
import {
  COUNTABLE_OBJECTS,
  POSITION_REFERENCES,
  POSITION_SUBJECTS,
  type ObjectId,
} from '../assets.js';
import type { Choice, Relation } from '../item.js';
import { defineFamily, noun } from './common.js';

const REL_WORD: Record<Relation, string> = {
  'in-front': 'di depan',
  behind: 'di belakang',
  inside: 'di dalam',
  outside: 'di luar',
  above: 'di atas',
  below: 'di bawah',
  beside: 'di samping',
};

const SCENE_MODES = {
  'front-behind': ['in-front', 'behind'],
  'inside-outside': ['inside', 'outside'],
  'above-below': ['above', 'below'],
  beside: ['beside', 'above', 'in-front'],
} as const satisfies Record<string, readonly Relation[]>;

const LINE_MODES = {
  'left-right': { n: 2, words: ['kiri', 'kanan'], arrangement: 'row' },
  'left-middle-right': { n: 3, words: ['kiri', 'tengah', 'kanan'], arrangement: 'row' },
  'top-bottom': { n: 2, words: ['atas', 'bawah'], arrangement: 'column' },
  'top-middle-bottom': { n: 3, words: ['atas', 'tengah', 'bawah'], arrangement: 'column' },
} as const;

export const position = defineFamily({
  description: 'Kata posisi: depan/belakang, dalam/luar, atas/bawah, samping, kiri/tengah/kanan.',
  params: z.strictObject({
    mode: z
      .enum([
        'front-behind',
        'inside-outside',
        'above-below',
        'beside',
        'left-right',
        'left-middle-right',
        'top-bottom',
        'top-middle-bottom',
      ])
      .default('front-behind'),
  }),
  generate(p, rng) {
    if (p.mode in LINE_MODES) {
      const cfg = LINE_MODES[p.mode as keyof typeof LINE_MODES];
      const objects = rng.sample(COUNTABLE_OBJECTS, cfg.n);
      const at = rng.int(0, cfg.n - 1);
      const word = cfg.words[at]!;
      const choices: Choice[] = objects.map((object, i) => ({
        id: `p${i}`,
        visual: { kind: 'object', object },
        say: noun(object),
        ...(i !== at && { tag: 'posisi-lain' }),
      }));
      const phrase =
        word === 'tengah'
          ? 'di tengah'
          : cfg.arrangement === 'row'
            ? `di sebelah ${word}`
            : `paling ${word}`;
      return {
        prompt: `Ketuk benda yang ${phrase}.`,
        stimulus: [],
        interaction: { type: 'pick-one', choices, answer: `p${at}`, arrangement: cfg.arrangement },
        reteach: {
          say:
            cfg.arrangement === 'row'
              ? `Kanan itu sisi tangan yang kamu pakai bersalaman. ${noun(objects[at]!)} ada ${phrase}.`
              : `${noun(objects[at]!)} ada ${phrase}.`,
        },
      };
    }
    const relations = SCENE_MODES[p.mode as keyof typeof SCENE_MODES];
    const reference: ObjectId =
      p.mode === 'inside-outside' ? 'kotak' : rng.pick(POSITION_REFERENCES);
    const subject = rng.pick(POSITION_SUBJECTS);
    const target = p.mode === 'beside' ? 'beside' : rng.pick(relations);
    const choices: Choice[] = rng.shuffle(
      relations.map((relation) => ({
        id: `r-${relation}`,
        visual: { kind: 'scene', relation, subject, reference } as const,
        ...(relation !== target && { tag: `terbalik-${relation}` }),
      })),
    );
    return {
      prompt: `Mana ${noun(subject)} yang ${REL_WORD[target]} ${noun(reference)}?`,
      stimulus: [],
      interaction: { type: 'pick-one', choices, answer: `r-${target}`, arrangement: 'row' },
      reteach: {
        say: `Lihat ${noun(subject)}nya. ${noun(subject)} ${REL_WORD[target]} ${noun(reference)} seperti ini.`,
        show: [{ kind: 'scene', relation: target, subject, reference }],
      },
    };
  },
});
