import { z } from 'zod';
import type { Choice } from '../item.js';
import { visualSchema } from '../visual-schema.js';
import { createRng } from '../rng.js';
import { defineFamily } from './common.js';

const card = z.strictObject({
  visual: visualSchema,
  /** Diucapkan saat kartu diketuk. */
  say: z.string().max(200).optional(),
});

const matchItem = z.strictObject({
  prompt: z.string().min(1).max(500),
  say: z.string().max(240).optional(),
  stimulus: z.array(visualSchema).max(4).default([]),
  /** Pasangan benar kiri → kanan; kolom kanan diacak saat soal dibuat. */
  pairs: z
    .array(z.strictObject({ left: card, right: card }))
    .min(2)
    .max(5),
  reteach: z.string().max(400).default('Yuk kita pasangkan lagi satu per satu.'),
});

export type MatchItem = z.infer<typeof matchItem>;

/**
 * "Tarik garis" (D-069): bank soal pasangkan kiri–kanan, mis. benda ↔ bangun datar, angka ↔ kumpulan
 * benda. Anak mengetuk kartu kiri lalu kartu kanan (tanpa drag). Soal dipilih seperti `manual`.
 */
export const matchPairs = defineFamily({
  description: 'Pasangkan kiri dan kanan (tarik garis) — bank soal buatan admin.',
  params: z.strictObject({ items: z.array(matchItem).min(1).max(200) }),
  generate(p, rng, ctx) {
    // Sama seperti `manual`: urutan tetap per skill, seed berurutan dalam satu ronde tidak mengulang soal.
    const deck = createRng(`${ctx.templateId}#order`).shuffle(p.items.map((_, i) => i));
    const it = p.items[deck[((ctx.seed % deck.length) + deck.length) % deck.length]!]!;
    const left: Choice[] = it.pairs.map((pair, i) => ({
      id: `l${i}`,
      visual: pair.left.visual,
      ...(pair.left.say && { say: pair.left.say }),
    }));
    const right: Choice[] = rng.shuffle(
      it.pairs.map((pair, i) => ({
        id: `r${i}`,
        visual: pair.right.visual,
        ...(pair.right.say && { say: pair.right.say }),
      })),
    );
    return {
      prompt: it.prompt,
      ...(it.say && { say: it.say }),
      stimulus: it.stimulus,
      interaction: {
        type: 'match',
        left,
        right,
        answer: Object.fromEntries(it.pairs.map((_, i) => [`l${i}`, `r${i}`])),
      },
      reteach: { say: it.reteach },
    };
  },
});
