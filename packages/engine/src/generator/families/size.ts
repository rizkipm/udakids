import { z } from 'zod';
import { CAPACITY_PAIRS, HEAVY_PAIRS, STRETCHABLE } from '../assets.js';
import type { Choice, Visual } from '../item.js';
import { defineFamily, noun } from './common.js';

type Attr = 'long' | 'tall' | 'wide' | 'heavy' | 'capacity';
const WORDS: Record<Attr, [string, string]> = {
  long: ['lebih panjang', 'lebih pendek'],
  tall: ['lebih tinggi', 'lebih pendek'],
  wide: ['lebih lebar', 'lebih sempit'],
  heavy: ['lebih berat', 'lebih ringan'],
  capacity: ['muat lebih banyak', 'muat lebih sedikit'],
};

export const sizeCompare = defineFamily({
  description: 'Bandingkan panjang, tinggi, lebar, berat, atau isi.',
  params: z.strictObject({
    attribute: z.enum(['long', 'tall', 'wide', 'heavy', 'capacity', 'mixed']).default('long'),
    ask: z.enum(['more', 'less', 'either']).default('either'),
  }),
  generate(p, rng) {
    const attr: Attr =
      p.attribute === 'mixed'
        ? rng.pick(['long', 'tall', 'wide', 'heavy', 'capacity'] as const)
        : p.attribute;
    const more = p.ask === 'either' ? rng.chance(0.5) : p.ask === 'more';
    const word = WORDS[attr][more ? 0 : 1];
    let big: Visual;
    let small: Visual;
    if (attr === 'heavy' || attr === 'capacity') {
      const [a, b] = rng.pick(attr === 'heavy' ? HEAVY_PAIRS : CAPACITY_PAIRS);
      big = { kind: 'object', object: a };
      small = { kind: 'object', object: b };
    } else {
      const object = rng.pick(STRETCHABLE[attr]);
      const k = rng.pick([0.45, 0.55, 0.65]);
      const scale = (s: number) =>
        attr === 'tall' ? { scaleX: 1, scaleY: s } : { scaleX: s, scaleY: 1 };
      big = { kind: 'object', object, ...scale(1) };
      small = { kind: 'object', object, ...scale(k) };
    }
    const answerVisual = more ? big : small;
    const choices: Choice[] = rng.shuffle([
      { id: 'a', visual: answerVisual },
      { id: 'b', visual: more ? small : big, tag: 'terbalik' },
    ]);
    const name = (v: Visual) => (v.kind === 'object' ? noun(v.object) : '');
    return {
      prompt: `Mana yang ${word}?`,
      stimulus: [],
      interaction: { type: 'pick-one', choices, answer: 'a', arrangement: 'row' },
      reteach: {
        say:
          attr === 'heavy' || attr === 'capacity'
            ? `${name(big)} ${WORDS[attr][0]} daripada ${name(small)}.`
            : `Letakkan berdampingan dan bandingkan ujungnya. Yang ini ${word}.`,
        show: [answerVisual],
      },
    };
  },
});
