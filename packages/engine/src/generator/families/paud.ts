import { z } from 'zod';
import { COLORS, SAY_COLOR, type Color } from '../assets.js';
import type { Choice, Visual } from '../item.js';
import { BINGO_LINES } from '../play-g4.js';
import { numberWord } from '../words.js';
import { between, defineFamily, range, reject } from './common.js';

/**
 * Game berhitung PAUD (D-108): versi sendiri yang berwarna — tanpa teks yang harus dibaca (semua dibacakan Momo),
 * tanpa batas waktu, maks. 4 jenis kartu.
 */

const THEME_SAY = {
  aquarium: { noun: 'ikan', where: 'di akuarium' },
  snake: { noun: 'ruas badan ular', where: '' },
  snow: { noun: 'bola salju', where: '' },
} as const;

/** 3 pilihan angka: jawaban dan dua tetangganya (tidak kurang dari 0). */
function numberChoices(n: number, rng: { shuffle<T>(xs: readonly T[]): T[] }): Choice[] {
  const set = new Set([n]);
  for (const d of [1, -1, 2, -2]) if (set.size < 3 && n + d >= 0) set.add(n + d);
  return rng.shuffle([...set]).map((v) => ({
    id: `n${v}`,
    visual: { kind: 'numeral', value: v } as Visual,
    say: numberWord(v),
  }));
}

export const countGame = defineFamily({
  description:
    'Hitung & ketuk (PAUD): ketuk ikan di akuarium / ruas ular / bola salju satu per satu sambil berhitung, lalu pilih angkanya.',
  params: z.strictObject({
    theme: z.enum(['aquarium', 'snake', 'snow']).default('aquarium'),
    n: range(1, 20).default([1, 5]),
  }),
  generate(p, rng) {
    const n = between(rng, p.n);
    if (n < 1) reject('minimal satu benda');
    const choices = numberChoices(n, rng);
    const { noun, where } = THEME_SAY[p.theme];
    const say = `Ada berapa ${noun}${where ? ` ${where}` : ''}? Ketuk satu per satu sambil berhitung, lalu pilih angkanya.`;
    return {
      prompt: say,
      say,
      stimulus: [],
      interaction: { type: 'count', theme: p.theme, n, choices, answer: `n${n}` },
      reteach: {
        say: `Hitung pelan-pelan sambil menyentuh satu per satu. Ada ${numberWord(n)} ${noun}.`,
      },
    };
  },
});

export const cakeGame = defineFamily({
  description:
    'Kue ulang tahun Momo (PAUD): pasang lilin sebanyak angka yang disebut, lalu tiup lilinnya.',
  params: z.strictObject({
    target: range(1, 10).default([1, 5]),
    /** Lilin di persediaan melebihi target. */
    extra: z.number().int().min(1).max(5).default(3),
    /** Tampilkan angkanya (selain dibacakan). */
    showNumber: z.boolean().default(true),
  }),
  generate(p, rng) {
    const target = between(rng, p.target);
    const say = `Momo berulang tahun! Pasang ${numberWord(target)} lilin di kue, lalu tekan Selesai.`;
    return {
      prompt: say,
      say,
      stimulus: p.showNumber ? [{ kind: 'numeral', value: target }] : [],
      interaction: {
        type: 'build',
        style: 'cake',
        target,
        unit: 'object',
        object: 'lilin',
        max: target + p.extra,
      },
      reteach: {
        say: `Hitung lilinnya sambil memasang: satu, dua, sampai ${numberWord(target)}.`,
      },
    };
  },
});

/** Pola manik: huruf = warna ke-n dari palet. */
const PATTERNS = ['AB', 'AAB', 'ABB', 'ABC', 'AABB', 'ABCD'] as const;

export const beadsGame = defineFamily({
  description:
    'Kalung manik pola (PAUD): lihat pola manik berwarna (AB, AAB, ABC, …), lalu ketuk manik berikutnya.',
  params: z.strictObject({
    patterns: z.array(z.enum(PATTERNS)).min(1).default(['AB', 'AAB', 'ABB']),
    /** Banyak ulangan pola yang sudah terpasang. */
    repeats: z.number().int().min(2).max(3).default(2),
  }),
  generate(p, rng) {
    const pattern = rng.pick(p.patterns);
    const kinds = [...new Set(pattern)].length;
    const colors = rng.sample(COLORS, kinds) as Color[];
    const id = (c: Color) => `b-${c}`;
    const unit = [...pattern].map((ch) => colors[ch.charCodeAt(0) - 65]!);
    const shown = Array.from({ length: p.repeats }, () => unit).flat();
    // Palet = warna pola + satu pengecoh (maks. 4 jenis kartu).
    const decoy = COLORS.filter((c) => !colors.includes(c));
    const palette = rng.shuffle([...colors, ...(kinds < 4 ? [rng.pick(decoy)] : [])]);
    const choices = palette.map((c) => ({
      id: id(c),
      visual: { kind: 'shape', shape: 'lingkaran', color: c, size: 'm' } as Visual,
      say: SAY_COLOR[c],
    }));
    const say = 'Lihat pola manik di kalung. Ketuk manik berikutnya untuk melanjutkan polanya.';
    return {
      prompt: say,
      say,
      stimulus: [],
      interaction: { type: 'beads', shown: shown.map(id), answer: unit.map(id), choices },
      reteach: {
        say: `Polanya: ${unit.map((c) => SAY_COLOR[c]).join(', ')}. Lalu diulang lagi dari awal.`,
      },
    };
  },
});

export const numberBingo = defineFamily({
  description:
    'Bingo angka (PAUD): Momo menyebut angka, ketuk angkanya (0–10 / 0–20) atau menara balok yang banyaknya pas, sampai satu garis.',
  params: z.strictObject({
    mode: z.enum(['number', 'count']).default('number'),
    range: range(0, 20).default([0, 10]),
  }),
  generate(p, rng) {
    const [lo, hi] = p.range;
    if (hi - lo + 1 < 9) reject('perlu minimal 9 bilangan berbeda');
    if (p.mode === 'count' && (lo < 1 || hi > 10)) reject('menara balok 1–10');
    const values = rng.sample(
      Array.from({ length: hi - lo + 1 }, (_, i) => lo + i),
      9,
    );
    const line = rng.pick(BINGO_LINES);
    const cells = values.map((v, i) => ({
      id: `s${i}`,
      value: v,
      visual: (p.mode === 'count'
        ? { kind: 'tens', tens: 0, ones: v }
        : { kind: 'numeral', value: v }) as Visual,
      say: numberWord(v),
    }));
    const order = rng.shuffle([0, 1, 2]);
    const calls = order.map((k, j) => {
      const v = values[line[k]!]!;
      const say =
        p.mode === 'count'
          ? `Cari menara dengan ${numberWord(v)} balok.`
          : `Cari angka ${numberWord(v)}.`;
      // Anak PAUD belum membaca: soal hanya dibacakan, teksnya tidak menuliskan angkanya.
      return { id: `p${j}`, text: '', say, answer: `s${line[k]}` };
    });
    const say =
      p.mode === 'count'
        ? 'Bingo balok! Dengarkan Momo, lalu ketuk menara balok yang banyaknya pas.'
        : 'Bingo angka! Dengarkan angka dari Momo, lalu ketuk angkanya di kartu.';
    return {
      prompt: say,
      say,
      stimulus: [],
      interaction: { type: 'bingo', cells, calls },
      reteach: {
        say:
          p.mode === 'count'
            ? 'Hitung balok di setiap menara satu per satu, lalu cocokkan dengan angka dari Momo.'
            : 'Dengarkan angkanya baik-baik, lalu cari bentuk angka itu di kartu.',
      },
    };
  },
});
