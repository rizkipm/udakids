import { z } from 'zod';
import { COUNTABLE_OBJECTS, ENOUGH_PAIRS } from '../assets.js';
import type { Choice, Layout, Visual } from '../item.js';
import { numberWord } from '../words.js';
import { between, countWords, defineFamily, noun, range, reject, yesNoChoices } from './common.js';

const MODES = [
  'more',
  'fewer',
  'match',
  'count',
  'mixed',
  'more-fewer-same',
  'enough',
  'same-number',
  'equal-count',
] as const;

export const compareGroups = defineFamily({
  description: 'Bandingkan dua kelompok: lebih banyak, lebih sedikit, sama banyak, cukup.',
  params: z.strictObject({
    range: range(1, 20).default([1, 5]),
    mode: z.enum(MODES).default('more'),
  }),
  generate(p, rng) {
    const [x, y] = rng.sample(COUNTABLE_OBJECTS, 2) as [
      (typeof COUNTABLE_OBJECTS)[number],
      (typeof COUNTABLE_OBJECTS)[number],
    ];
    const n = () => between(rng, p.range);
    const different = () => {
      const a = n();
      const b = n();
      if (a === b) reject('jumlah sama');
      return [a, b] as const;
    };
    const group = (object: typeof x, count: number, layout: Layout): Visual => ({
      kind: 'objects',
      object,
      count,
      layout,
    });
    const explain = (a: number, b: number) =>
      `Kita hitung: ${noun(x)} ada ${numberWord(a)}, ${noun(y)} ada ${numberWord(b)}.`;

    switch (p.mode) {
      case 'more':
      case 'fewer':
      case 'match':
      case 'count': {
        const [a, b] = different();
        const askMore = p.mode === 'more' ? true : p.mode === 'fewer' ? false : rng.chance(0.5);
        const layout: Layout = p.mode === 'count' ? 'scatter' : 'row';
        const answer = (askMore ? a > b : a < b) ? 'a' : 'b';
        const choices: Choice[] = [
          { id: 'a', visual: group(x, a, layout), ...(answer !== 'a' && { tag: 'terbalik' }) },
          { id: 'b', visual: group(y, b, layout), ...(answer !== 'b' && { tag: 'terbalik' }) },
        ];
        return {
          prompt: askMore ? 'Mana yang lebih banyak?' : 'Mana yang lebih sedikit?',
          stimulus: [],
          interaction: {
            type: 'pick-one',
            choices,
            answer,
            arrangement: p.mode === 'match' ? 'column' : 'row',
          },
          reteach: {
            say: `${explain(a, b)} ${p.mode === 'match' ? 'Pasangkan satu-satu; yang tersisa lebih banyak.' : ''}`.trim(),
            show: [group(x, a, 'row'), group(y, b, 'row')],
          },
        };
      }
      case 'mixed': {
        const [a, b] = different();
        const askMore = rng.chance(0.5);
        const answer = (askMore ? a > b : a < b) ? 'a' : 'b';
        return {
          prompt: askMore
            ? `Lebih banyak ${noun(x)} atau ${noun(y)}?`
            : `Lebih sedikit ${noun(x)} atau ${noun(y)}?`,
          stimulus: [
            {
              kind: 'mixed',
              parts: rng.shuffle([
                { object: x, count: a },
                { object: y, count: b },
              ]),
            },
          ],
          interaction: {
            type: 'pick-one',
            arrangement: 'row',
            choices: [
              { id: 'a', visual: { kind: 'object', object: x }, say: noun(x) },
              { id: 'b', visual: { kind: 'object', object: y }, say: noun(y) },
            ],
            answer,
          },
          reteach: { say: explain(a, b), show: [group(x, a, 'row'), group(y, b, 'row')] },
        };
      }
      case 'more-fewer-same': {
        const a = n();
        const b = rng.chance(0.34) ? a : n();
        const answer = a > b ? 'lebih' : a < b ? 'kurang' : 'sama';
        const words: Record<string, string> = {
          lebih: 'lebih banyak',
          kurang: 'lebih sedikit',
          sama: 'sama banyak',
        };
        return {
          prompt: `Dibanding ${noun(y)}, ${noun(x)}nya lebih banyak, lebih sedikit, atau sama banyak?`,
          stimulus: [group(x, a, 'row'), group(y, b, 'row')],
          interaction: {
            type: 'pick-one',
            choices: ['lebih', 'kurang', 'sama'].map((id) => ({
              id,
              visual: { kind: 'word', text: words[id]! },
              say: words[id]!,
              ...(id !== answer && { tag: 'salah-banding' }),
            })),
            answer,
          },
          reteach: { say: explain(a, b), show: [group(x, a, 'row'), group(y, b, 'row')] },
        };
      }
      case 'enough': {
        const [need, give] = rng.pick(ENOUGH_PAIRS);
        const a = n();
        const b = rng.chance(0.5) ? a : n();
        const enough = b >= a;
        return {
          prompt: `Apakah ${noun(give)}nya cukup untuk semua ${noun(need)}?`,
          stimulus: [group(need, a, 'row'), group(give, b, 'row')],
          interaction: {
            type: 'pick-one',
            choices: yesNoChoices(),
            answer: enough ? 'ya' : 'tidak',
            arrangement: 'row',
          },
          reteach: {
            say: `Pasangkan satu ${noun(need)} dengan satu ${noun(give)}. ${enough ? 'Semua kebagian, jadi cukup.' : 'Ada yang tidak kebagian, jadi belum cukup.'}`,
            show: [group(need, a, 'row'), group(give, b, 'row')],
          },
        };
      }
      case 'same-number': {
        const a = n();
        const b = rng.chance(0.5) ? a : n();
        return {
          prompt: 'Apakah jumlahnya sama?',
          stimulus: [group(x, a, 'row'), group(y, b, 'row')],
          interaction: {
            type: 'pick-one',
            choices: yesNoChoices(),
            answer: a === b ? 'ya' : 'tidak',
            arrangement: 'row',
          },
          reteach: {
            say: `${explain(a, b)} ${a === b ? 'Jumlahnya sama.' : 'Jumlahnya tidak sama.'}`,
          },
        };
      }
      case 'equal-count': {
        const a = n();
        const counts = rng.shuffle([a, a + 1, Math.max(1, a - 1) === a ? a + 2 : a - 1]);
        if (new Set(counts).size !== 3) reject('jumlah pilihan kembar');
        return {
          prompt: 'Mana yang jumlahnya sama dengan ini?',
          stimulus: [group(x, a, 'row')],
          interaction: {
            type: 'pick-one',
            choices: counts.map((c) => ({
              id: `g${c}`,
              visual: { kind: 'dots', count: c, layout: 'row' } as Visual,
              ...(c !== a && { tag: c > a ? 'lebih-satu' : 'kurang-satu' }),
            })),
            answer: `g${a}`,
          },
          reteach: {
            say: `Ada ${numberWord(a)} ${noun(x)}: ${countWords(a)}. Cari titik yang juga ${numberWord(a)}.`,
          },
        };
      }
    }
  },
});
