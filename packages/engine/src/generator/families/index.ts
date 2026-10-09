import { arith } from './arith.js';
import type { Family } from './common.js';
import { compareGroups } from './compare.js';
import { exprFamily } from './expr.js';
import { factsFamily } from './facts.js';
import { clockFamily } from './clock.js';
import { z } from 'zod';
import { defineFamily } from './common.js';
import { manual } from './manual.js';
import { matchPairs } from './match.js';
import { spellWord } from './spell.js';
import { money } from './money.js';
import {
  build,
  compareNumbers,
  count,
  numberLine,
  numberNext,
  numberOrder,
  numeralListen,
  numeralTapAll,
  oneMoreLess,
  ordinal,
  represent,
} from './numbers.js';
import { pattern, sameDifferent, sort } from './pattern.js';
import { position } from './position.js';
import {
  realWorldShape,
  shapeName,
  shapeSides,
  shapeTap,
  solidDescribe,
  solidTrace,
} from './shapes.js';
import { sizeCompare } from './size.js';
import { connectDots, numeralTrace } from './writing.js';
import { letterFind, letterTapAll, letterTrace } from './letters.js';
import { dayTimeFamily } from './daytime.js';
import { fingersFamily } from './fingers.js';
import { queueFamily } from './queue.js';
import { soundFamily } from './sounds.js';
import { strokeFind, strokeTrace } from './strokes.js';
import { subitizeFamily } from './subitize.js';
import { senseTapFamily } from './senses.js';
import { catchItemsFamily, mazePathFamily, memoryPairsFamily, wordSearchFamily } from './games.js';
import { englishCount, englishPronoun, englishTalk, englishWord } from './english.js';
import { mockFamily } from './mock.js';
import {
  catchGame,
  crosswordGame,
  feedGame,
  hopGame,
  jigsawGame,
  labelGame,
  mazeGame,
  pairsGame,
  sortGame,
  sumGame,
  trainGame,
  wheelGame,
  wordHunt,
} from './fun.js';

const BASE_FAMILIES = {
  'numeral-tap-all': numeralTapAll,
  'numeral-listen': numeralListen,
  'numeral-trace': numeralTrace,
  'connect-dots': connectDots,
  'letter-trace': letterTrace,
  fingers: fingersFamily,
  queue: queueFamily,
  'day-time': dayTimeFamily,
  'stroke-trace': strokeTrace,
  'stroke-find': strokeFind,
  sound: soundFamily,
  subitize: subitizeFamily,
  'sense-tap': senseTapFamily,
  'letter-find': letterFind,
  'letter-tap-all': letterTapAll,
  'maze-path': mazePathFamily,
  'word-search': wordSearchFamily,
  'memory-pairs': memoryPairsFamily,
  'catch-items': catchItemsFamily,
  'english-word': englishWord,
  'english-count': englishCount,
  'english-pronoun': englishPronoun,
  'english-talk': englishTalk,
  count,
  build,
  represent,
  'number-order': numberOrder,
  'number-next': numberNext,
  'number-line': numberLine,
  ordinal,
  'one-more-less': oneMoreLess,
  'compare-numbers': compareNumbers,
  'compare-groups': compareGroups,
  pattern,
  'same-different': sameDifferent,
  sort,
  'shape-tap': shapeTap,
  'shape-name': shapeName,
  'shape-sides': shapeSides,
  'solid-describe': solidDescribe,
  'solid-trace': solidTrace,
  'real-world-shape': realWorldShape,
  position,
  'size-compare': sizeCompare,
  money,
  arith,
  expr: exprFamily,
  facts: factsFamily,
  clock: clockFamily,
  manual,
  'match-pairs': matchPairs,
  'spell-word': spellWord,
  // Game seru (D-078).
  'sum-game': sumGame,
  'hop-game': hopGame,
  'sort-game': sortGame,
  'crossword-game': crosswordGame,
  'jigsaw-game': jigsawGame,
  'pairs-game': pairsGame,
  'catch-game': catchGame,
  'train-game': trainGame,
  'label-game': labelGame,
  'wheel-game': wheelGame,
  'feed-game': feedGame,
  'maze-game': mazeGame,
  'word-hunt': wordHunt,
} satisfies Record<string, Family>;

type BaseName = keyof typeof BASE_FAMILIES;
const BASE_NAMES = Object.keys(BASE_FAMILIES) as BaseName[];

/**
 * Gabungan beberapa bentuk soal dalam satu level (mis. level ulangan/tantangan, atau beberapa skill IXL
 * digabung menjadi satu level). Setiap soal memilih satu bagian secara acak (berbobot).
 */
const mix = defineFamily({
  description: 'Gabungan beberapa bentuk soal dalam satu level (ulangan / tantangan).',
  params: z
    .strictObject({
      parts: z
        .array(
          z.strictObject({
            family: z.enum(BASE_NAMES as [BaseName, ...BaseName[]]),
            params: z.record(z.string(), z.unknown()).default({}),
            weight: z.number().positive().default(1),
          }),
        )
        .min(2)
        .max(12),
    })
    .superRefine((p, ctx) => {
      p.parts.forEach((part, i) => {
        const r = BASE_FAMILIES[part.family].params.safeParse(part.params);
        if (!r.success) {
          for (const issue of r.error.issues) {
            ctx.addIssue({
              code: 'custom',
              path: ['parts', i, 'params', ...issue.path.map(String)],
              message: `${part.family}: ${issue.message}`,
            });
          }
        }
      });
    }),
  generate(p, rng, ctx) {
    const total = p.parts.reduce((a, x) => a + x.weight, 0);
    let pickAt = rng.next() * total;
    const part = p.parts.find((x) => (pickAt -= x.weight) < 0) ?? p.parts[p.parts.length - 1]!;
    const family = BASE_FAMILIES[part.family] as Family;
    return family.generate(family.params.parse(part.params), rng, ctx);
  },
});

export const FAMILIES = { ...BASE_FAMILIES, mix, mock: mockFamily } satisfies Record<
  string,
  Family
>;

export type FamilyName = keyof typeof FAMILIES;
export const FAMILY_NAMES = Object.keys(FAMILIES) as FamilyName[];

export { Reject } from './common.js';
export type { ManualItem } from './manual.js';
export type { MatchItem } from './match.js';
export { formatId } from './expr.js';

/**
 * Family game (D-075 Worksheet, D-078 Game seru): level game tidak dipakai sebagai sumber soal mock test maupun
 * lomba live (soal lomba/mock harus berbentuk soal lembar lomba, dan sebagian game butuh kunci di perangkat).
 */
export const GAME_FAMILIES: ReadonlySet<string> = new Set([
  'maze-path',
  'word-search',
  'memory-pairs',
  'catch-items',
  'sum-game',
  'hop-game',
  'sort-game',
  'crossword-game',
  'jigsaw-game',
  'pairs-game',
  'catch-game',
  'train-game',
  'label-game',
  'wheel-game',
  'feed-game',
  'maze-game',
  'word-hunt',
]);

/** Level memakai family game (langsung atau sebagai bagian `mix`)? */
export function usesGameFamily(t: { family: string; params?: unknown }): boolean {
  if (GAME_FAMILIES.has(t.family)) return true;
  if (t.family !== 'mix') return false;
  const parts = (t.params as { parts?: { family: string }[] } | undefined)?.parts ?? [];
  return parts.some((p) => GAME_FAMILIES.has(p.family));
}
