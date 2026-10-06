import { z } from 'zod';
import type { Choice } from '../item.js';
import { visualSchema } from '../visual-schema.js';
import { createRng } from '../rng.js';
import { defineFamily, reject } from './common.js';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const spellItem = z
  .strictObject({
    prompt: z.string().min(1).max(500),
    say: z.string().max(240).optional(),
    stimulus: z.array(visualSchema).max(4).default([]),
    /** Kata yang dilengkapi, huruf kapital A–Z (mis. "PAUS"). */
    word: z.string().regex(/^[A-Z]{2,12}$/, 'kata huruf kapital A–Z, 2–12 huruf'),
    /**
     * Pola tampilan, panjang sama dengan `word`; "_" = kotak kosong (mis. "P___", "G_R_T_").
     * Default: huruf pertama tampil, lalu kosong–tampil berselang-seling.
     */
    show: z.string().optional(),
    /** Banyak kartu huruf pengecoh (default 2). */
    extra: z.number().int().min(1).max(4).default(2),
    reteach: z.string().max(400).optional(),
  })
  .superRefine((it, ctx) => {
    if (it.show === undefined) return;
    const bad = (message: string) => ctx.addIssue({ code: 'custom', message, path: ['show'] });
    if (it.show.length !== it.word.length) bad('panjang `show` harus sama dengan `word`');
    else if ([...it.show].some((c, i) => c !== '_' && c !== it.word[i]))
      bad('huruf di `show` harus sama dengan `word`');
    else if (!it.show.includes('_')) bad('`show` butuh minimal satu "_"');
  });

export type SpellItem = z.infer<typeof spellItem>;

/** Pola bawaan: huruf pertama tampil, lalu berselang-seling (G_R_T_). */
export const defaultShow = (word: string) =>
  [...word].map((c, i) => (i % 2 === 0 ? c : '_')).join('');

const letterChoice = (letter: string, i: number): Choice => ({
  id: `k${i}`,
  visual: { kind: 'word', text: letter },
  say: letter.toLowerCase(),
});

/**
 * Lengkapi nama dengan mengetuk huruf (D-070): bank soal, mis. gambar paus + "P _ _ _". Kartu huruf = huruf yang
 * hilang + pengecoh (huruf yang tidak ada di kata), diacak. Soal dipilih seperti `manual`.
 */
export const spellWord = defineFamily({
  description: 'Lengkapi nama: ketuk huruf yang hilang (bank soal).',
  params: z.strictObject({ items: z.array(spellItem).min(1).max(200) }),
  generate(p, rng, ctx) {
    const deck = createRng(`${ctx.templateId}#order`).shuffle(p.items.map((_, i) => i));
    const it = p.items[deck[((ctx.seed % deck.length) + deck.length) % deck.length]!]!;
    const show = it.show ?? defaultShow(it.word);
    if (!show.includes('_')) reject('tidak ada huruf yang hilang');
    const answer = [...it.word].filter((_, i) => show[i] === '_');
    const others = [...LETTERS].filter((c) => !it.word.includes(c));
    const letters = rng.shuffle([...answer, ...rng.sample(others, it.extra)]).map(letterChoice);
    const spaced = [...it.word.toLowerCase()].join(' ');
    return {
      prompt: it.prompt,
      ...(it.say && { say: it.say }),
      stimulus: it.stimulus,
      interaction: {
        type: 'spell',
        slots: [...show].map((c) => (c === '_' ? null : c)),
        letters,
        answer,
      },
      reteach: { say: it.reteach ?? `Namanya ${it.word.toLowerCase()}: ${spaced}.` },
    };
  },
});
