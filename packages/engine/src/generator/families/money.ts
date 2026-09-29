import { z } from 'zod';
import { COINS, type CoinValue } from '../assets.js';
import type { Choice, Visual } from '../item.js';
import { numberWord, rupiahWord } from '../words.js';
import { between, countWords, defineFamily, numberChoices, range, reject } from './common.js';

const rp = (v: number) => `Rp${v.toLocaleString('id-ID')}`;
const coinSchema = z.literal([...COINS]) as z.ZodType<CoinValue>;

export const money = defineFamily({
  description: 'Kenali koin Rupiah dan hitung koin.',
  params: z.strictObject({
    mode: z.enum(['identify', 'count']).default('identify'),
    coins: z.array(coinSchema).min(1).default([100, 500]),
    tiles: range(3, 8).default([4, 6]),
    range: range(1, 10).default([1, 5]),
    choices: z.number().int().min(2).max(4).default(3),
  }),
  generate(p, rng) {
    if (p.mode === 'count') {
      const coin = p.coins[0]!;
      const n = between(rng, p.range);
      return {
        prompt: `Ada berapa koin ${rp(coin)}?`,
        say: `Ada berapa koin ${rupiahWord(coin)}?`,
        stimulus: [
          {
            kind: 'row',
            items: Array.from({ length: n }, () => ({ kind: 'coin', value: coin }) as Visual),
          },
        ],
        interaction: {
          type: 'pick-one',
          choices: numberChoices(rng, n, {
            count: p.choices,
            min: 1,
            max: Math.max(p.range[1] + 1, p.choices),
          }),
          answer: `n${n}`,
        },
        reteach: {
          say: `Tunjuk koinnya satu per satu: ${countWords(n)}. Ada ${numberWord(n)} koin.`,
        },
      };
    }
    if (p.coins.length < 2) reject('butuh minimal dua jenis koin');
    const target = rng.pick(p.coins);
    const values = Array.from({ length: between(rng, p.tiles) }, () => rng.pick(p.coins));
    if (!values.includes(target) || values.every((v) => v === target))
      reject('butuh target dan lainnya');
    const choices: Choice[] = values.map((value, i) => ({
      id: `c${i}`,
      visual: { kind: 'coin', value },
    }));
    return {
      prompt: `Ketuk semua koin ${rp(target)}.`,
      say: `Ketuk semua koin ${rupiahWord(target)}.`,
      stimulus: [],
      interaction: {
        type: 'tap-all',
        choices,
        answer: choices.filter((_, i) => values[i] === target).map((c) => c.id),
      },
      reteach: {
        say: `Koin ${rupiahWord(target)} bertuliskan angka ${target}. Cari angka itu di koinnya.`,
        show: [{ kind: 'coin', value: target }],
      },
    };
  },
});
