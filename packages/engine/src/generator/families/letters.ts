import { z } from 'zod';
import type { ObjectId } from '../assets.js';
import { VOWELS, type LetterGlyphId, type Vowel } from '../glyphs.js';
import type { Choice, Visual } from '../item.js';
import type { Rng } from '../rng.js';
import { defineFamily, range, reject } from './common.js';

/**
 * Huruf vokal a i u e o untuk PAUD (D-075, unit P-BT-04 & P-BT-05): menebalkan huruf, mengenali huruf,
 * huruf depan kata bergambar, dan pecahkan balon huruf. Membaca lewat suku kata (a-yam, i-kan). Semua
 * kalimat dibacakan; pilihan maksimal 4.
 */

export type VowelWord = { word: string; syl: string; object: ObjectId };

/** Kata bergambar berawalan huruf vokal (gambar dibuat sendiri, D-055/D-075). */
export const VOWEL_WORDS: Record<Vowel, readonly VowelWord[]> = {
  a: [
    { word: 'ayam', syl: 'a-yam', object: 'ayam' },
    { word: 'apel', syl: 'a-pel', object: 'apel' },
    { word: 'anggur', syl: 'ang-gur', object: 'anggur' },
    { word: 'awan', syl: 'a-wan', object: 'awan' },
    { word: 'api', syl: 'a-pi', object: 'api' },
    { word: 'ayah', syl: 'a-yah', object: 'ayah' },
    { word: 'anjing', syl: 'an-jing', object: 'anjing' },
  ],
  i: [
    { word: 'ikan', syl: 'i-kan', object: 'ikan' },
    { word: 'ibu', syl: 'i-bu', object: 'ibu' },
    { word: 'itik', syl: 'i-tik', object: 'itik' },
  ],
  u: [
    { word: 'ular', syl: 'u-lar', object: 'ular' },
    { word: 'ulat', syl: 'u-lat', object: 'ulat' },
    { word: 'udang', syl: 'u-dang', object: 'udang' },
    { word: 'unta', syl: 'un-ta', object: 'unta' },
  ],
  e: [
    { word: 'ember', syl: 'em-ber', object: 'ember' },
    { word: 'elang', syl: 'e-lang', object: 'elang' },
    { word: 'emas', syl: 'e-mas', object: 'emas' },
  ],
  o: [
    { word: 'obor', syl: 'o-bor', object: 'obor' },
    { word: 'obeng', syl: 'o-beng', object: 'obeng' },
    { word: 'ombak', syl: 'om-bak', object: 'ombak' },
  ],
};

/** Huruf pengecoh yang sering tertukar dengan vokal (bentuk mirip), lalu konsonan yang akrab. */
const LOOKALIKE: Record<Vowel, string[]> = {
  a: ['o', 'd', 'e'],
  i: ['l', 'j', 't'],
  u: ['n', 'v', 'o'],
  e: ['c', 'a', 'o'],
  o: ['a', 'c', 'u'],
};
const CONSONANTS = ['b', 'm', 's', 't', 'n', 'k', 'p', 'd', 'l'];

const vowelSchema = z.enum(VOWELS);
const lettersParam = z.array(vowelSchema).min(1).max(5);
const caseSchema = z.enum(['lower', 'upper', 'both']);

/** "a" → "huruf a"; huruf besar "A" → "huruf A besar". */
export const letterSay = (ch: string) =>
  ch === ch.toUpperCase() ? `huruf ${ch.toLowerCase()} besar` : `huruf ${ch}`;
const letterVisual = (text: string): Visual => ({ kind: 'word', text });
const letterChoice = (id: string, text: string, tag?: string): Choice => ({
  id,
  visual: letterVisual(text),
  say: letterSay(text),
  ...(tag && { tag }),
});
const pictureChoice = (w: VowelWord, id: string, tag?: string): Choice => ({
  id,
  visual: { kind: 'object', object: w.object },
  say: w.word,
  ...(tag && { tag }),
});
/** "a-yam" → "a, yam. ayam" (dibacakan per suku kata). */
const sylSay = (w: VowelWord) => `${w.syl.split('-').join(', ')}. ${w.word}`;
const caseOf = (rng: Rng, c: z.infer<typeof caseSchema>) =>
  c === 'both' ? (rng.chance(0.5) ? 'upper' : 'lower') : c;
const shown = (v: Vowel, c: 'upper' | 'lower') => (c === 'upper' ? v.toUpperCase() : v);

/** Pengecoh huruf: vokal lain di `pool` dulu, lalu huruf yang mirip, lalu konsonan. */
function letterDistractors(
  rng: Rng,
  target: Vowel,
  pool: readonly string[],
  count: number,
): { text: string; tag: string }[] {
  const out: { text: string; tag: string }[] = [];
  const add = (xs: readonly string[], tag: string) => {
    for (const x of rng.shuffle(xs))
      if (out.length < count && x !== target && !out.some((o) => o.text === x))
        out.push({ text: x, tag });
  };
  add(pool, 'vokal-lain');
  add(LOOKALIKE[target], 'bentuk-mirip');
  add(CONSONANTS, 'konsonan');
  return out;
}

// ------------------------------------------------------------ tebalkan huruf

export const letterTrace = defineFamily({
  description: 'Tebalkan huruf vokal a i u e o (kecil/besar) mengikuti goresan bernomor.',
  params: z.strictObject({
    letters: lettersParam.default(['a']),
    case: caseSchema.default('lower'),
    guide: z.enum(['solid', 'dotted']).default('solid'),
    /** Tampilkan gambar benda berawalan huruf itu (a → ayam). */
    picture: z.boolean().default(true),
    tolerance: z.number().int().min(6).max(24).default(16),
    maxSlips: z.number().int().min(0).max(9).default(3),
  }),
  generate(p, rng) {
    const v = rng.pick(p.letters);
    const c = caseOf(rng, p.case);
    const glyph = shown(v, c) as LetterGlyphId;
    const w = rng.pick(VOWEL_WORDS[v]);
    const name = letterSay(glyph);
    return {
      prompt: p.picture ? `Tebalkan ${name}. ${glyph} untuk ${w.word}.` : `Tebalkan ${name}.`,
      say: p.picture
        ? `Ini ${name}. ${v}, untuk ${sylSay(w)}. Ayo tebalkan, mulai dari titik nomor satu.`
        : `Ini ${name}. Ayo tebalkan, mulai dari titik nomor satu.`,
      stimulus: p.picture ? [{ kind: 'object', object: w.object }] : [],
      interaction: {
        type: 'trace',
        glyph,
        guide: p.guide,
        tolerance: p.tolerance,
        maxSlips: p.maxSlips,
      },
      reteach: {
        say: `Mulai dari titik nomor satu, lalu ikuti jalurnya pelan-pelan sampai ujung. Ini ${name}.`,
        show: [letterVisual(glyph)],
      },
    };
  },
});

// ------------------------------------------------------------ kenali huruf

export const letterFind = defineFamily({
  description:
    'Kenali huruf vokal: dengar lalu ketuk hurufnya, huruf depan gambar, gambar berawalan huruf, atau pasangan huruf besar-kecil.',
  params: z.strictObject({
    letters: lettersParam.default(['a', 'i']),
    /**
     * `listen` = dengar lalu ketuk huruf; `show` = ketuk huruf yang disebut & ditulis; `initial` = huruf depan
     * gambar; `picture` = gambar yang berawalan huruf; `case` = huruf kecil dari huruf besar.
     */
    mode: z.enum(['listen', 'show', 'initial', 'picture', 'case']).default('show'),
    /** Vokal yang boleh jadi pengecoh (yang sudah dikenal anak). */
    pool: z.array(vowelSchema).max(5).default([]),
    case: caseSchema.default('lower'),
    choices: range(2, 4).default([3, 3]),
  }),
  generate(p, rng) {
    const v = rng.pick(p.letters);
    const k = rng.int(p.choices[0], p.choices[1]);
    const c = p.mode === 'case' ? 'lower' : caseOf(rng, p.case);
    switch (p.mode) {
      case 'picture': {
        const w = rng.pick(VOWEL_WORDS[v]);
        const others = VOWELS.filter((x) => x !== v && (p.pool.length === 0 || p.pool.includes(x)));
        if (others.length === 0) reject('butuh vokal lain untuk gambar pengecoh');
        const wrong = rng
          .shuffle(others.flatMap((x) => VOWEL_WORDS[x]))
          .slice(0, k - 1)
          .map((x, i) => pictureChoice(x, `p${i}`, 'huruf-depan-lain'));
        if (wrong.length < k - 1) reject('gambar pengecoh kurang');
        const target = shown(v, c);
        return {
          prompt: `Mana yang dimulai dengan ${letterSay(target)}?`,
          say: `Mana gambar yang dimulai dengan ${letterSay(target)}? Dengarkan bunyi depannya.`,
          stimulus: [letterVisual(target)],
          interaction: {
            type: 'pick-one',
            choices: rng.shuffle([pictureChoice(w, 'ans'), ...wrong]),
            answer: 'ans',
          },
          reteach: {
            say: `${sylSay(w)}. Bunyi depannya ${v}. Jadi ${w.word} dimulai dengan huruf ${v}.`,
            show: [{ kind: 'object', object: w.object }, letterVisual(target)],
          },
        };
      }
      case 'initial': {
        const w = rng.pick(VOWEL_WORDS[v]);
        const wrong = letterDistractors(rng, v, p.pool, k - 1).map((d, i) =>
          letterChoice(`l${i}`, shown(d.text as Vowel, c), d.tag),
        );
        return {
          prompt: `Ini ${w.word}. Huruf depannya apa?`,
          say: `Ini ${sylSay(w)}. Huruf depannya apa?`,
          stimulus: [{ kind: 'object', object: w.object }],
          interaction: {
            type: 'pick-one',
            choices: rng.shuffle([letterChoice('ans', shown(v, c)), ...wrong]),
            answer: 'ans',
          },
          reteach: {
            say: `${sylSay(w)}. Dengar bunyi pertamanya: ${v}. Jadi huruf depannya ${v}.`,
            show: [{ kind: 'object', object: w.object }, letterVisual(shown(v, c))],
          },
        };
      }
      case 'case': {
        const wrong = letterDistractors(rng, v, p.pool, k - 1).map((d, i) =>
          letterChoice(`l${i}`, d.text, d.tag),
        );
        return {
          prompt: `Ini ${letterSay(v.toUpperCase())}. Mana huruf ${v} kecilnya?`,
          say: `Ini ${letterSay(v.toUpperCase())}. Mana huruf ${v} kecilnya?`,
          stimulus: [letterVisual(v.toUpperCase())],
          interaction: {
            type: 'pick-one',
            choices: rng.shuffle([letterChoice('ans', v), ...wrong]),
            answer: 'ans',
          },
          reteach: {
            say: `${v.toUpperCase()} besar dan ${v} kecil namanya sama: huruf ${v}. Bentuknya saja yang berbeda.`,
            show: [letterVisual(v.toUpperCase()), letterVisual(v)],
          },
        };
      }
      default: {
        const target = shown(v, c);
        const wrong = letterDistractors(rng, v, p.pool, k - 1).map((d, i) =>
          letterChoice(`l${i}`, shown(d.text as Vowel, c), d.tag),
        );
        const listen = p.mode === 'listen';
        return {
          prompt: listen ? 'Dengarkan, lalu ketuk hurufnya.' : `Ketuk ${letterSay(target)}.`,
          say: `Ketuk ${letterSay(target)}.`,
          stimulus: [],
          interaction: {
            type: 'pick-one',
            choices: rng.shuffle([letterChoice('ans', target), ...wrong]),
            answer: 'ans',
          },
          reteach: {
            say: `Ini ${letterSay(target)}. ${v}, seperti ${sylSay(rng.pick(VOWEL_WORDS[v]))}.`,
            show: [letterVisual(target)],
          },
        };
      }
    }
  },
});

// ------------------------------------------------------------ balon huruf

export const letterTapAll = defineFamily({
  description: 'Ketuk / pecahkan semua balon huruf tertentu (mencari huruf).',
  params: z.strictObject({
    letters: lettersParam.default(['a']),
    pool: z.array(vowelSchema).max(5).default([]),
    case: caseSchema.default('lower'),
    tiles: range(4, 8).default([5, 6]),
    style: z.enum(['cards', 'balloons']).default('balloons'),
  }),
  generate(p, rng) {
    const v = rng.pick(p.letters);
    const c = caseOf(rng, p.case);
    const k = rng.int(p.tiles[0], p.tiles[1]);
    const hits = rng.int(2, Math.max(2, Math.floor(k / 2)));
    const others = letterDistractors(rng, v, p.pool, 3).map((d) => d.text);
    const texts = rng.shuffle([
      ...Array.from({ length: hits }, () => shown(v, c)),
      ...Array.from({ length: k - hits }, (_, i) => shown(others[i % others.length] as Vowel, c)),
    ]);
    const choices: Choice[] = texts.map((text, i) => ({
      id: `t${i}`,
      visual: letterVisual(text),
      say: letterSay(text),
    }));
    const target = shown(v, c);
    const balloons = p.style === 'balloons';
    return {
      prompt: balloons
        ? `Pecahkan semua balon ${letterSay(target)}.`
        : `Ketuk semua ${letterSay(target)}.`,
      say: balloons
        ? `Pecahkan semua balon ${letterSay(target)}!`
        : `Ketuk semua ${letterSay(target)}.`,
      stimulus: [],
      interaction: {
        type: 'tap-all',
        ...(balloons && { style: 'balloons' as const }),
        choices,
        answer: choices
          .filter((ch) => ch.visual.kind === 'word' && ch.visual.text === target)
          .map((ch) => ch.id),
      },
      reteach: {
        say: `Ini ${letterSay(target)}. Cari yang bentuknya sama persis, ya.`,
        show: [letterVisual(target)],
      },
    };
  },
});
