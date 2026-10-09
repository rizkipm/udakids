import { z } from 'zod';
import type { ObjectId } from '../assets.js';
import { STROKE_GLYPH_IDS, STROKE_NAMES, type StrokeGlyphId } from '../glyphs.js';
import type { Choice, Visual } from '../item.js';
import { between, defineFamily, range, reject } from './common.js';

/**
 * Garis pramenulis (P-BT-02 & P-BT-03, D-081): menebalkan garis tegak, mendatar, miring, tambah, pagar, tangga,
 * lengkung, lingkaran, zig-zag, gelombang, spiral — sebelum menulis huruf. Setiap garis punya benda di sekitar
 * anak yang bentuknya mirip (hujan turun = tegak, gunung = zig-zag, ombak = gelombang).
 */

const strokeSchema = z.enum(STROKE_GLYPH_IDS);

/** Benda yang bentuknya mirip garis itu (dibacakan: "seperti hujan yang turun"). */
export const STROKE_PICTURES: Partial<Record<StrokeGlyphId, { object: ObjectId; like: string }[]>> =
  {
    tegak: [
      { object: 'hujan', like: 'seperti hujan yang turun' },
      { object: 'pensil', like: 'seperti pensil yang berdiri' },
      { object: 'pohon', like: 'seperti batang pohon' },
    ],
    datar: [
      { object: 'penggaris', like: 'seperti penggaris di meja' },
      { object: 'meja', like: 'seperti papan meja' },
    ],
    tambah: [{ object: 'kado', like: 'seperti pita di kado' }],
    lengkung: [{ object: 'pelangi', like: 'seperti pelangi' }],
    lingkaran: [
      { object: 'bola', like: 'seperti bola' },
      { object: 'matahari', like: 'seperti matahari' },
    ],
    zigzag: [
      { object: 'gunung', like: 'seperti puncak gunung' },
      { object: 'petir', like: 'seperti petir' },
    ],
    gelombang: [
      { object: 'ombak', like: 'seperti ombak di laut' },
      { object: 'ular', like: 'seperti ular yang berjalan' },
    ],
    spiral: [{ object: 'siput', like: 'seperti rumah siput' }],
  };

const glyphVisual = (g: StrokeGlyphId): Visual => ({ kind: 'glyph', glyph: g });
const name = (g: StrokeGlyphId) => STROKE_NAMES[g];

export const strokeTrace = defineFamily({
  description:
    'Tebalkan garis pramenulis (tegak, mendatar, miring, tambah, pagar, tangga, lengkung, lingkaran, zig-zag, gelombang, spiral).',
  params: z.strictObject({
    strokes: z.array(strokeSchema).min(1).max(11).default(['tegak']),
    /** `mixed` = kadang garis tebal, kadang titik-titik (latihan berulang yang tidak monoton). */
    guide: z.enum(['solid', 'dotted', 'mixed']).default('solid'),
    /** Tampilkan benda yang bentuknya mirip. */
    picture: z.boolean().default(true),
    tolerance: z.number().int().min(6).max(24).default(18),
    maxSlips: z.number().int().min(0).max(9).default(3),
  }),
  generate(p, rng) {
    const g = rng.pick(p.strokes);
    const pics = STROKE_PICTURES[g] ?? [];
    const pic = p.picture && pics.length ? rng.pick(pics) : undefined;
    return {
      prompt: pic ? `Tebalkan ${name(g)}, ${pic.like}.` : `Tebalkan ${name(g)}.`,
      say: pic
        ? `Ini ${name(g)}, ${pic.like}. Ayo tebalkan, mulai dari titik nomor satu.`
        : `Ini ${name(g)}. Ayo tebalkan, mulai dari titik nomor satu.`,
      stimulus: pic ? [{ kind: 'object', object: pic.object }] : [],
      interaction: {
        type: 'trace',
        glyph: g,
        guide: p.guide === 'mixed' ? (rng.chance(0.5) ? 'solid' : 'dotted') : p.guide,
        tolerance: p.tolerance,
        maxSlips: p.maxSlips,
      },
      reteach: {
        say: `Mulai dari titik hijau nomor satu, lalu ikuti jalurnya pelan-pelan sampai ujung. Ini ${name(g)}.`,
        show: [glyphVisual(g)],
      },
    };
  },
});

export const strokeFind = defineFamily({
  description:
    'Kenali garis: mana garis yang disebut, atau benda ini bentuknya seperti garis apa (pilih gambar garis).',
  params: z.strictObject({
    strokes: z.array(strokeSchema).min(2).max(11).default(['tegak', 'datar', 'miring']),
    mode: z.enum(['name', 'picture']).default('name'),
    choices: range(2, 4).default([3, 3]),
  }),
  generate(p, rng) {
    const pool =
      p.mode === 'picture' ? p.strokes.filter((g) => STROKE_PICTURES[g]?.length) : p.strokes;
    if (!pool.length) reject('tidak ada garis bergambar');
    const g = rng.pick(pool);
    const k = Math.min(between(rng, p.choices), p.strokes.length);
    if (k < 2) reject('butuh paling sedikit dua garis');
    const wrong = rng.sample(
      p.strokes.filter((x) => x !== g),
      k - 1,
    );
    const choice = (x: StrokeGlyphId, id: string, tag?: string): Choice => ({
      id,
      visual: glyphVisual(x),
      say: name(x),
      ...(tag && { tag }),
    });
    const choices = rng.shuffle([
      choice(g, 'ans'),
      ...wrong.map((x, i) => choice(x, `g${i}`, `garis-${x}`)),
    ]);
    if (p.mode === 'picture') {
      const pic = rng.pick(STROKE_PICTURES[g]!);
      return {
        prompt: `Bentuknya seperti garis apa?`,
        say: `Lihat gambarnya. Bentuknya seperti garis apa? Ketuk garisnya.`,
        stimulus: [{ kind: 'object', object: pic.object }],
        interaction: { type: 'pick-one', choices, answer: 'ans' },
        reteach: { say: `Bentuknya ${pic.like}. Jadi ${name(g)}.`, show: [glyphVisual(g)] },
      };
    }
    return {
      prompt: `Mana ${name(g)}?`,
      say: `Ketuk ${name(g)}.`,
      stimulus: [],
      interaction: { type: 'pick-one', choices, answer: 'ans' },
      reteach: { say: `Ini ${name(g)}.`, show: [glyphVisual(g)] },
    };
  },
});
