import { z } from 'zod';
import type { Choice, Layout, Visual } from '../item.js';
import { numberWord } from '../words.js';
import { between, defineFamily, numberChoices, range, reject } from './common.js';

/**
 * Lihat sekilas 1 sampai 5 (P-MA-02, D-081): mengenali banyak benda tanpa menghitung satu per satu (subitizing).
 * Gambar titik/dadu/bingkai tampil sebentar (`peek`) lalu ditutup; anak boleh membukanya lagi kapan saja, jadi
 * tidak ada batas waktu menjawab.
 */

const LAYOUTS: Layout[] = ['row', 'scatter', 'ring', 'grid'];
/** Warna dadu bervariasi (titiknya tetap putih/gelap kontras). */
const DIE_COLORS = ['merah', 'biru', 'hijau', 'ungu', 'oranye', 'kuning'] as const;

export const subitizeFamily = defineFamily({
  description:
    'Lihat sekilas 1–5: titik (berbagai susunan), mata dadu, atau bingkai lima tampil sebentar lalu sebut banyaknya; lebih banyak; cocokkan; ketuk semua.',
  params: z.strictObject({
    mode: z.enum(['dots', 'die', 'frame', 'more', 'match', 'tap-all']).default('dots'),
    values: range(1, 5).default([1, 5]),
    choices: range(2, 4).default([3, 3]),
    /** Lama gambar tampil (ms) sebelum ditutup; 0 = tidak ditutup. */
    peek: z.number().int().min(0).max(5000).default(1800),
    items: range(2, 6).default([3, 4]),
  }),
  generate(p, rng) {
    const [lo, hi] = p.values;
    const n = between(rng, p.values);
    const k = between(rng, p.choices);
    const dots = (v: number): Visual => ({ kind: 'dots', count: v, layout: rng.pick(LAYOUTS) });
    const peek = p.peek > 0 ? { peek: p.peek } : {};
    const numerals = () =>
      numberChoices(rng, n, {
        count: k,
        min: Math.max(1, lo - 1),
        max: Math.min(6, Math.max(hi + 1, lo + 2)),
        tagged: [
          { value: n - 1, tag: 'kurang-satu' },
          { value: n + 1, tag: 'lebih-satu' },
        ],
      }).map((c) => ({ ...c, say: numberWord((c.visual as { value: number }).value) }));
    switch (p.mode) {
      case 'more': {
        const other = rng.pick(
          Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((v) => v !== n),
        );
        const big = Math.max(n, other);
        const card = (v: number, id: string, tag?: string): Choice => ({
          id,
          visual: dots(v),
          say: `${numberWord(v)} titik`,
          ...(tag && { tag }),
        });
        return {
          prompt: 'Lihat sekilas. Mana yang titiknya lebih banyak?',
          say: 'Lihat sekilas kartu titiknya. Mana yang titiknya lebih banyak?',
          stimulus: [],
          interaction: {
            type: 'pick-one',
            choices: rng.shuffle([
              card(big, 'ans'),
              card(Math.min(n, other), 'w0', 'pilih-lebih-sedikit'),
            ]),
            answer: 'ans',
            arrangement: 'row',
          },
          reteach: {
            say: `${numberWord(n)} dan ${numberWord(other)}. Yang lebih banyak ${numberWord(big)} titik.`,
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
        return {
          prompt: 'Cocokkan kartu titik dengan angkanya.',
          say: 'Lihat kartu titiknya, lalu pasangkan dengan angka yang sama. Ketuk kartu, lalu ketuk angkanya.',
          stimulus: [],
          interaction: {
            type: 'match',
            left: values.map((v) => ({
              id: `d${v}`,
              visual: dots(v),
              say: `${numberWord(v)} titik`,
            })),
            right: rng.shuffle(
              values.map((v): Choice => ({
                id: `a${v}`,
                visual: { kind: 'numeral', value: v },
                say: numberWord(v),
              })),
            ),
            answer: Object.fromEntries(values.map((v) => [`d${v}`, `a${v}`])),
          },
          reteach: {
            say: 'Lihat polanya: titik yang tersusun rapi bisa langsung dikenali tanpa menghitung satu per satu.',
          },
        };
      }
      case 'tap-all': {
        const total = between(rng, p.items);
        const hits = rng.int(1, Math.max(1, Math.floor(total / 2)));
        const others = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((v) => v !== n);
        if (!others.length) reject('butuh angka lain');
        const values = rng.shuffle([
          ...Array.from({ length: hits }, () => n),
          ...Array.from({ length: total - hits }, () => rng.pick(others)),
        ]);
        const choices = values.map((v, i): Choice => ({
          id: `t${i}`,
          visual: dots(v),
          say: `${numberWord(v)} titik`,
        }));
        return {
          prompt: `Ketuk semua kartu ${numberWord(n)} titik.`,
          say: `Ketuk semua kartu yang titiknya ${numberWord(n)}, lalu tekan Periksa.`,
          stimulus: [{ kind: 'numeral', value: n }],
          interaction: {
            type: 'tap-all',
            choices,
            answer: choices.filter((_, i) => values[i] === n).map((c) => c.id),
          },
          reteach: { say: `Cari kartu yang titiknya ${numberWord(n)}. Susunannya boleh berbeda.` },
        };
      }
      default: {
        const visual: Visual =
          p.mode === 'die'
            ? { kind: 'die', value: n, color: rng.pick(DIE_COLORS) }
            : p.mode === 'frame'
              ? { kind: 'frame', filled: n, size: 5 }
              : dots(n);
        const what = p.mode === 'die' ? 'mata dadu' : p.mode === 'frame' ? 'kotak terisi' : 'titik';
        return {
          prompt: `Lihat sekilas. Ada berapa ${what}?`,
          say: `Lihat sekilas, jangan dihitung satu per satu. Ada berapa ${what}?`,
          ...peek,
          stimulus: [visual],
          interaction: { type: 'pick-one', choices: numerals(), answer: `n${n}` },
          reteach: {
            say: `Ada ${numberWord(n)} ${what}. Lihat bentuknya, lalu ingat polanya.`,
            show: [visual],
          },
        };
      }
    }
  },
});
