import { z } from 'zod';
import type { Choice, Visual } from '../item.js';
import { numberWord } from '../words.js';
import { between, defineFamily, numberChoices, range, reject } from './common.js';

/**
 * Jari tangan dan angka (P-MA-04, D-079): menunjukkan bilangan 1–10 dengan jari (6–10 = dua tangan).
 * Pengecoh dari kekeliruan umum: kurang satu / lebih satu jari, dan menghitung satu tangan saja.
 */

/** Tangan n jari: warna kulit acak (inklusif) dan, untuk 6–10, pembagian dua tangan acak (7 = 4 + 3 …). */
function handsFor(rng: { int(a: number, b: number): number }) {
  return (n: number): Visual => {
    const tone = rng.int(0, 2);
    if (n <= 5)
      return { kind: 'fingers', count: n, tone, ...(rng.int(0, 1) === 1 && { mirror: true }) };
    return { kind: 'fingers', count: n, tone, split: rng.int(Math.max(1, n - 5), 5) };
  };
}
const fingersSay = (n: number) => `${numberWord(n)} jari`;
const nearTag = (v: number, answer: number) =>
  v === answer - 1 ? 'kurang-satu' : v === answer + 1 ? 'lebih-satu' : 'lain';

/** Banyak jari lain di sekitar `n` (dalam [lo, hi]), dekat dulu agar perlu menghitung teliti. */
function others(
  rng: { shuffle<T>(x: readonly T[]): T[] },
  n: number,
  k: number,
  lo: number,
  hi: number,
) {
  const near = [n - 1, n + 1].filter((v) => v >= lo && v <= hi);
  const far = rng.shuffle(
    Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter(
      (v) => v !== n && !near.includes(v),
    ),
  );
  return [...rng.shuffle(near), ...far].slice(0, k);
}

export const fingersFamily = defineFamily({
  description:
    'Jari tangan dan angka: hitung jari, tunjukkan jari untuk angka, tarik garis jari ↔ angka, lebih banyak/sedikit, gabung dua tangan, ketuk semua.',
  params: z.strictObject({
    mode: z
      .enum(['count', 'show', 'match', 'more', 'fewer', 'combine', 'tap-all'])
      .default('count'),
    values: range(1, 10).default([1, 5]),
    choices: range(2, 4).default([3, 3]),
    /** match: banyak pasangan; tap-all: banyak tangan. */
    items: range(2, 8).default([3, 4]),
  }),
  generate(p, rng) {
    const hand = handsFor(rng);
    const handChoice = (v: number, id: string, tag?: string): Choice => ({
      id,
      visual: hand(v),
      say: fingersSay(v),
      ...(tag && { tag }),
    });
    const [lo, hi] = p.values;
    const n = between(rng, p.values);
    const k = between(rng, p.choices);
    switch (p.mode) {
      case 'show': {
        const wrong = others(rng, n, k - 1, lo, hi);
        if (wrong.length < k - 1) reject('rentang terlalu sempit');
        return {
          prompt: `Tunjukkan ${numberWord(n)} jari. Mana tangan yang benar?`,
          say: `Ini angka ${numberWord(n)}. Mana tangan yang menunjukkan ${numberWord(n)} jari?`,
          stimulus: [{ kind: 'numeral', value: n }],
          interaction: {
            type: 'pick-one',
            choices: rng.shuffle([
              handChoice(n, 'ans'),
              ...wrong.map((v, i) => handChoice(v, `h${i}`, nearTag(v, n))),
            ]),
            answer: 'ans',
          },
          reteach: {
            say: `Angka ${numberWord(n)}: angkat jarimu satu per satu sambil berhitung sampai ${numberWord(n)}.`,
            show: [hand(n)],
          },
        };
      }
      case 'match': {
        const m = Math.min(between(rng, p.items), hi - lo + 1);
        if (m < 2) reject('butuh dua pasangan');
        const values = rng.sample(
          Array.from({ length: hi - lo + 1 }, (_, i) => lo + i),
          m,
        );
        const left = values.map((v) => handChoice(v, `j${v}`));
        const right = rng.shuffle(
          values.map((v): Choice => ({
            id: `a${v}`,
            visual: { kind: 'numeral', value: v },
            say: numberWord(v),
          })),
        );
        return {
          prompt: 'Tarik garis dari jari ke angka yang sama.',
          say: 'Hitung jarinya, lalu pasangkan dengan angka yang sama. Ketuk tangan, lalu ketuk angkanya.',
          stimulus: [],
          interaction: {
            type: 'match',
            left,
            right,
            answer: Object.fromEntries(values.map((v) => [`j${v}`, `a${v}`])),
          },
          reteach: {
            say: 'Hitung jari satu per satu. Angka terakhir yang kamu sebut adalah banyaknya jari.',
          },
        };
      }
      case 'more':
      case 'fewer': {
        const pool = others(rng, n, 3, lo, hi);
        if (!pool.length) reject('rentang terlalu sempit');
        const other = rng.pick(pool);
        const answer = p.mode === 'more' ? Math.max(n, other) : Math.min(n, other);
        const word = p.mode === 'more' ? 'lebih banyak' : 'lebih sedikit';
        return {
          prompt: `Mana jarinya yang ${word}?`,
          say: `Lihat dua tangan ini. Mana jarinya yang ${word}?`,
          stimulus: [],
          interaction: {
            type: 'pick-one',
            choices: rng.shuffle([
              handChoice(answer, 'ans'),
              handChoice(
                answer === n ? other : n,
                'h0',
                p.mode === 'more' ? 'pilih-lebih-sedikit' : 'pilih-lebih-banyak',
              ),
            ]),
            answer: 'ans',
            arrangement: 'row',
          },
          reteach: {
            say: `Hitung jari setiap tangan. ${numberWord(n)} dan ${numberWord(other)}. Yang ${word} adalah ${numberWord(answer)} jari.`,
          },
        };
      }
      case 'combine': {
        if (n < 2) reject('butuh paling sedikit 2 jari');
        const a = rng.int(1, Math.min(5, n - 1));
        const b = n - a;
        if (b > 5) reject('satu tangan paling banyak 5 jari');
        return {
          prompt: `${a} jari dan ${b} jari. Semuanya berapa jari?`,
          say: `Tangan kiri ${numberWord(a)} jari, tangan kanan ${numberWord(b)} jari. Semuanya berapa jari?`,
          stimulus: [{ kind: 'row', items: [hand(a), hand(b)] }],
          interaction: {
            type: 'pick-one',
            choices: numberChoices(rng, n, {
              count: k,
              min: 1,
              max: 10,
              tagged: [
                { value: a, tag: 'satu-tangan' },
                { value: b, tag: 'satu-tangan' },
                { value: n - 1, tag: 'kurang-satu' },
              ],
            }).map((c) => ({ ...c, say: numberWord((c.visual as { value: number }).value) })),
            answer: `n${n}`,
          },
          reteach: {
            say: `Hitung terus dari tangan pertama ke tangan kedua: ${Array.from({ length: n }, (_, i) => numberWord(i + 1)).join(', ')}. Semuanya ${numberWord(n)} jari.`,
            show: [hand(n)],
          },
        };
      }
      case 'tap-all': {
        const total = between(rng, p.items);
        const hits = rng.int(1, Math.max(1, Math.floor(total / 2)));
        const pool = others(rng, n, 4, lo, hi);
        if (!pool.length) reject('butuh banyak jari lain');
        const values = rng.shuffle([
          ...Array.from({ length: hits }, () => n),
          ...Array.from({ length: total - hits }, (_, i) => pool[i % pool.length]!),
        ]);
        const choices = values.map((v, i) => handChoice(v, `t${i}`));
        return {
          prompt: `Ketuk semua tangan yang menunjukkan ${numberWord(n)} jari.`,
          say: `Ketuk semua tangan yang menunjukkan ${numberWord(n)} jari, lalu tekan Periksa.`,
          stimulus: [{ kind: 'numeral', value: n }],
          interaction: {
            type: 'tap-all',
            choices,
            answer: choices.filter((_, i) => values[i] === n).map((c) => c.id),
          },
          reteach: {
            say: `Cari tangan dengan ${numberWord(n)} jari. Hitung jarinya satu per satu.`,
            show: [hand(n)],
          },
        };
      }
      default: {
        const choices = numberChoices(rng, n, {
          count: k,
          min: lo === hi ? Math.max(1, lo - 2) : lo,
          max: Math.max(hi, lo + 2),
          tagged: [
            { value: n - 1, tag: 'kurang-satu' },
            { value: n + 1, tag: 'lebih-satu' },
            ...(n > 5 ? [{ value: 5, tag: 'satu-tangan' }] : []),
          ],
        }).map((c) => ({ ...c, say: numberWord((c.visual as { value: number }).value) }));
        return {
          prompt: 'Berapa jarinya? Ketuk angkanya.',
          say: 'Hitung jari yang diangkat. Ada berapa jari?',
          stimulus: [hand(n)],
          interaction: { type: 'pick-one', choices, answer: `n${n}` },
          reteach: {
            say: `Sentuh jari satu per satu sambil berhitung: ${Array.from({ length: n }, (_, i) => numberWord(i + 1)).join(', ')}. Jadi ${numberWord(n)} jari.`,
            show: [hand(n), { kind: 'numeral', value: n }],
          },
        };
      }
    }
  },
});
