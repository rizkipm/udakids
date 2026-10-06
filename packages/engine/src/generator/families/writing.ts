import { z } from 'zod';
import { COUNTABLE_OBJECTS } from '../assets.js';
import { DOT_COUNTS, DOT_PICTURES, dotShape, picturesWith } from '../dot-pictures.js';
import { glyphOf } from '../glyphs.js';
import type { Visual } from '../item.js';
import { numberWord } from '../words.js';
import { between, defineFamily, noun, pickObject, range, reject } from './common.js';

/**
 * Menulis dan bermain angka (D-068): menebalkan angka 0–10 mengikuti goresan bernomor, dan sambung titik
 * bernomor sampai gambar jadi. Keduanya baru "benar" setelah polanya selesai.
 */
export const numeralTrace = defineFamily({
  description:
    'Tebalkan angka 0–10 mengikuti goresan bernomor (bisa dengan gambar benda untuk dihitung).',
  params: z.strictObject({
    values: range(0, 10).default([1, 3]),
    guide: z.enum(['solid', 'dotted']).default('solid'),
    /** `name` = angkanya disebut; `count` = hitung bendanya dulu, lalu tebalkan angkanya. */
    ask: z.enum(['name', 'count']).default('name'),
    /** Tampilkan sekumpulan benda sebanyak angkanya (menghubungkan lambang dengan banyak benda). */
    showCount: z.boolean().default(true),
    tolerance: z.number().int().min(6).max(24).default(16),
    maxSlips: z.number().int().min(0).max(9).default(3),
  }),
  generate(p, rng) {
    const n = between(rng, p.values);
    if (p.ask === 'count' && n === 0) reject('hitung butuh paling sedikit 1 benda');
    const object = pickObject(rng, COUNTABLE_OBJECTS);
    const word = numberWord(n);
    const stimulus: Visual[] =
      p.showCount && n > 0
        ? [{ kind: 'objects', object, count: n, layout: n <= 5 ? 'row' : 'rows' }]
        : [];
    const counted = stimulus.length > 0;
    const prompt =
      p.ask === 'count'
        ? `Hitung ${noun(object)}nya, lalu tebalkan angkanya.`
        : counted
          ? `Ada ${n} ${noun(object)}. Tebalkan angka ${n}.`
          : `Tebalkan angka ${n}.`;
    const say =
      p.ask === 'count'
        ? `Hitung ${noun(object)}nya. Lalu tebalkan angkanya, mulai dari titik nomor satu.`
        : counted
          ? `Ada ${word} ${noun(object)}. Ayo tebalkan angka ${word}, mulai dari titik nomor satu.`
          : n === 0
            ? 'Ini angka nol. Nol artinya tidak ada. Ayo tebalkan, mulai dari titik nomor satu.'
            : `Ini angka ${word}. Ayo tebalkan, mulai dari titik nomor satu.`;
    const strokes = glyphOf(n).strokes.length;
    return {
      prompt,
      say,
      stimulus,
      interaction: {
        type: 'trace',
        glyph: glyphOf(n).id,
        guide: p.guide,
        tolerance: p.tolerance,
        maxSlips: p.maxSlips,
      },
      reteach: {
        say:
          `Angka ${word} punya ${strokes === 1 ? 'satu goresan' : 'dua goresan'}. ` +
          'Mulai dari titik nomor satu, lalu ikuti jalurnya pelan-pelan sampai ujung.',
        show: [{ kind: 'numeral', value: n }],
      },
    };
  },
});

export const connectDots = defineFamily({
  description: 'Sambung titik bernomor berurutan sampai gambarnya jadi.',
  params: z.strictObject({
    /** Banyak titik (dipilih dari jumlah yang punya gambar). */
    dots: range(DOT_COUNTS[0]!, DOT_COUNTS[DOT_COUNTS.length - 1]!).default([4, 6]),
    maxSlips: z.number().int().min(0).max(9).default(2),
  }),
  generate(p, rng) {
    const counts = DOT_COUNTS.filter((c) => c >= p.dots[0] && c <= p.dots[1]);
    if (counts.length === 0) reject('tidak ada gambar dengan jumlah titik ini');
    const n = rng.pick(counts);
    const picture = rng.pick(picturesWith(n));
    // Variasi: titik nomor 1 bisa di sudut mana saja, dan arah keliling bisa dibalik.
    const shape = dotShape(picture, n);
    const offset = rng.int(0, n - 1);
    const ring = rng.int(0, 1) === 1 ? [...shape].reverse() : shape;
    const ordered = Array.from({ length: n }, (_, i) => ring[(i + offset) % n]!);
    const dots = ordered.map((pt, i) => ({ id: `d${i + 1}`, label: i + 1, x: pt.x, y: pt.y }));
    return {
      prompt: `Sambung titik 1 sampai ${n}.`,
      say: `Sambungkan titiknya dari satu sampai ${numberWord(n)}. Gambar apa, ya, nanti?`,
      stimulus: [],
      interaction: {
        type: 'connect',
        picture,
        dots,
        answer: dots.map((d) => d.id),
        maxSlips: p.maxSlips,
      },
      reteach: {
        say:
          `Ketuk berurutan: satu, dua, tiga, sampai ${numberWord(n)}. ` +
          `Lihat, gambarnya ${DOT_PICTURES[picture].say}!`,
      },
    };
  },
});
