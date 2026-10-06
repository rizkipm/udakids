import { z } from 'zod';
import type { Choice } from '../item.js';
import { visualSchema } from '../visual-schema.js';
import { createRng } from '../rng.js';
import { defineFamily } from './common.js';

const manualItem = z
  .strictObject({
    prompt: z.string().min(1).max(500),
    say: z.string().max(240).optional(),
    stimulus: z.array(visualSchema).max(4).default([]),
    choices: z
      .array(
        z.strictObject({
          visual: visualSchema,
          say: z.string().max(200).optional(),
          tag: z.string().max(40).optional(),
        }),
      )
      .min(2)
      // Sampai 10 gambar untuk soal "silang semua" gaya lomba (D-070).
      .max(10),
    /** Indeks pilihan yang benar; array = "ketuk semua yang benar". */
    answer: z.union([z.number().int().min(0), z.array(z.number().int().min(0)).min(1)]),
    reteach: z.string().max(400).default('Yuk kita lihat lagi bersama.'),
    /** Rujukan ilmiah/kurikulum untuk fakta di soal (tidak ditampilkan ke anak). */
    source: z.string().max(300).optional(),
  })
  .superRefine((it, ctx) => {
    const idx = Array.isArray(it.answer) ? it.answer : [it.answer];
    if (idx.some((i) => i >= it.choices.length))
      ctx.addIssue({ code: 'custom', message: 'indeks jawaban di luar pilihan' });
    if (new Set(idx).size !== idx.length)
      ctx.addIssue({ code: 'custom', message: 'indeks jawaban ganda' });
    if (Array.isArray(it.answer) && it.answer.length === it.choices.length) {
      ctx.addIssue({ code: 'custom', message: 'tidak boleh semua pilihan benar' });
    }
  });

export type ManualItem = z.infer<typeof manualItem>;

/** Bank soal buatan admin: satu soal dipilih acak (ber-seed), urutan pilihan diacak. */
export const manual = defineFamily({
  description: 'Soal buatan admin (bank soal) — pilih satu, atau ketuk semua yang benar.',
  params: z.strictObject({ items: z.array(manualItem).min(1).max(200) }),
  generate(p, rng, ctx) {
    // Urutan tetap per skill, lalu soal ke-n = urutan[seed mod n]: seed berurutan dalam satu ronde
    // (seedBase + 0..9) tidak mengulang soal selama bank berisi ≥ 10 soal.
    const deck = createRng(`${ctx.templateId}#order`).shuffle(p.items.map((_, i) => i));
    const it = p.items[deck[((ctx.seed % deck.length) + deck.length) % deck.length]!]!;
    const order = rng.shuffle(it.choices.map((_, i) => i));
    const choices: Choice[] = order.map((i) => ({
      id: `c${i}`,
      visual: it.choices[i]!.visual,
      ...(it.choices[i]!.say && { say: it.choices[i]!.say }),
      ...(it.choices[i]!.tag && { tag: it.choices[i]!.tag }),
    }));
    return {
      prompt: it.prompt,
      ...(it.say && { say: it.say }),
      stimulus: it.stimulus,
      interaction: Array.isArray(it.answer)
        ? { type: 'tap-all', choices, answer: it.answer.map((i) => `c${i}`) }
        : { type: 'pick-one', choices, answer: `c${it.answer}` },
      reteach: { say: it.reteach },
    };
  },
});
