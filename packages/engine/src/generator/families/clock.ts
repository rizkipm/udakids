import { z } from 'zod';
import type { Choice, Visual } from '../item.js';
import { numberWord } from '../words.js';
import { defineFamily, reject } from './common.js';

const pad = (n: number) => String(n).padStart(2, '0');
export const timeText = (h: number, m: number) => `${pad(h)}.${pad(m)}`;
/** "pukul tiga", "pukul setengah empat" (cara menyebut jam dalam Bahasa Indonesia). */
export const timeWords = (h: number, m: number) =>
  m === 0
    ? `pukul ${numberWord(h)}`
    : m === 30
      ? `pukul setengah ${numberWord((h % 12) + 1)}`
      : `pukul ${numberWord(h)} lewat ${numberWord(m)} menit`;

export const clockFamily = defineFamily({
  description:
    'Membaca jam analog: cocokkan jam analog dengan waktu (tepat / setengah / per 5 menit).',
  params: z.strictObject({
    mode: z.enum(['read', 'match']).default('read'),
    minutes: z.array(z.number().int().min(0).max(55)).min(1).default([0]),
    choices: z.number().int().min(2).max(4).default(3),
  }),
  generate(p, rng) {
    const h = rng.int(1, 12);
    const m = rng.pick(p.minutes);
    const key = (hh: number, mm: number) => `t${hh}-${mm}`;
    // Pengecoh: jarum jam & menit tertukar, jam ±1, menit lain.
    const cands: [number, number, string][] = [
      [(h % 12) + 1, m, 'jam-lebih-satu'],
      [h === 1 ? 12 : h - 1, m, 'jam-kurang-satu'],
      [m === 0 ? 12 : Math.round(m / 5) || 12, (h % 12) * 5, 'jarum-tertukar'],
      [h, m === 0 ? 30 : 0, 'menit-lain'],
    ];
    const seen = new Set([key(h, m)]);
    const wrong = rng.shuffle(cands).filter(([hh, mm]) => {
      if (hh < 1 || hh > 12 || mm < 0 || mm > 59 || seen.has(key(hh, mm))) return false;
      seen.add(key(hh, mm));
      return true;
    });
    if (wrong.length < p.choices - 1) reject('pengecoh jam kurang');
    const visual = (hh: number, mm: number, analog: boolean): Visual =>
      analog ? { kind: 'clock', hour: hh, minute: mm } : { kind: 'digital', hour: hh, minute: mm };
    const choices: Choice[] = rng.shuffle([
      { id: key(h, m), visual: visual(h, m, p.mode === 'match'), say: timeWords(h, m) },
      ...wrong.slice(0, p.choices - 1).map(([hh, mm, tag]) => ({
        id: key(hh, mm),
        visual: visual(hh, mm, p.mode === 'match'),
        say: timeWords(hh, mm),
        tag,
      })),
    ]);
    return {
      prompt:
        p.mode === 'read'
          ? 'Jam ini menunjukkan pukul berapa?'
          : `Jam mana yang menunjukkan pukul ${timeText(h, m)}?`,
      stimulus: [visual(h, m, p.mode === 'read')],
      interaction: { type: 'pick-one', choices, answer: key(h, m), arrangement: 'row' },
      reteach: {
        say: `Jarum pendek menunjuk jam, jarum panjang menunjuk menit. Ini ${timeWords(h, m)} (${timeText(h, m)}).`,
        show: [{ kind: 'clock', hour: h, minute: m }],
      },
    };
  },
});
