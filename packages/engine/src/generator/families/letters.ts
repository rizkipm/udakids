import { z } from 'zod';
import type { ObjectId } from '../assets.js';
import { ALPHABET, VOWELS, type Letter, type LetterGlyphId, type Vowel } from '../glyphs.js';
import type { Choice, Visual } from '../item.js';
import type { Rng } from '../rng.js';
import { defineFamily, range, reject } from './common.js';

/**
 * Huruf untuk PAUD: vokal a i u e o (D-075, unit P-BT-04 & P-BT-05) lalu konsonan b–z (D-083) — menebalkan
 * huruf, mengenali huruf, huruf depan kata bergambar, dan pecahkan balon huruf. Membaca lewat suku kata
 * (a-yam, bo-la). Semua kalimat dibacakan; pilihan maksimal 4.
 */

export type LetterWord = { word: string; syl: string; object: ObjectId };
export type VowelWord = LetterWord;

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

/**
 * Kata bergambar berawalan konsonan (D-083), dari gambar yang sudah ada. Huruf f, q, v belum punya gambar:
 * ditebalkan dan dikenali tanpa gambar.
 */
export const CONSONANT_WORDS: Record<Exclude<Letter, Vowel>, readonly LetterWord[]> = {
  b: [
    { word: 'bola', syl: 'bo-la', object: 'bola' },
    { word: 'buku', syl: 'bu-ku', object: 'buku' },
    { word: 'bebek', syl: 'be-bek', object: 'bebek' },
    { word: 'balon', syl: 'ba-lon', object: 'balon' },
  ],
  c: [
    { word: 'cangkir', syl: 'cang-kir', object: 'cangkir' },
    { word: 'cermin', syl: 'cer-min', object: 'cermin' },
    { word: 'ceri', syl: 'ce-ri', object: 'ceri' },
  ],
  d: [
    { word: 'dadu', syl: 'da-du', object: 'dadu' },
    { word: 'daun', syl: 'da-un', object: 'daun' },
  ],
  f: [],
  g: [
    { word: 'gajah', syl: 'ga-jah', object: 'gajah' },
    { word: 'gelas', syl: 'ge-las', object: 'gelas' },
    { word: 'gunung', syl: 'gu-nung', object: 'gunung' },
    { word: 'gurita', syl: 'gu-ri-ta', object: 'gurita' },
  ],
  h: [
    { word: 'hujan', syl: 'hu-jan', object: 'hujan' },
    { word: 'harimau', syl: 'ha-ri-mau', object: 'harimau' },
    { word: 'handuk', syl: 'han-duk', object: 'handuk' },
  ],
  j: [
    { word: 'jeruk', syl: 'je-ruk', object: 'jeruk' },
    { word: 'jagung', syl: 'ja-gung', object: 'jagung' },
    { word: 'jerapah', syl: 'je-ra-pah', object: 'jerapah' },
  ],
  k: [
    { word: 'kucing', syl: 'ku-cing', object: 'kucing' },
    { word: 'kuda', syl: 'ku-da', object: 'kuda' },
    { word: 'kapal', syl: 'ka-pal', object: 'kapal' },
    { word: 'kue', syl: 'ku-e', object: 'kue' },
  ],
  l: [
    { word: 'lebah', syl: 'le-bah', object: 'lebah' },
    { word: 'lilin', syl: 'li-lin', object: 'lilin' },
    { word: 'laut', syl: 'la-ut', object: 'laut' },
  ],
  m: [
    { word: 'mobil', syl: 'mo-bil', object: 'mobil' },
    { word: 'meja', syl: 'me-ja', object: 'meja' },
    { word: 'madu', syl: 'ma-du', object: 'madu' },
    { word: 'mangga', syl: 'mang-ga', object: 'mangga' },
  ],
  n: [
    { word: 'nanas', syl: 'na-nas', object: 'nanas' },
    { word: 'nenek', syl: 'ne-nek', object: 'nenek' },
  ],
  p: [
    { word: 'pisang', syl: 'pi-sang', object: 'pisang' },
    { word: 'pensil', syl: 'pen-sil', object: 'pensil' },
    { word: 'payung', syl: 'pa-yung', object: 'payung' },
    { word: 'pintu', syl: 'pin-tu', object: 'pintu' },
  ],
  q: [],
  r: [
    { word: 'rumah', syl: 'ru-mah', object: 'rumah' },
    { word: 'robot', syl: 'ro-bot', object: 'robot' },
    { word: 'roket', syl: 'ro-ket', object: 'roket' },
  ],
  s: [
    { word: 'sapi', syl: 'sa-pi', object: 'sapi' },
    { word: 'semut', syl: 'se-mut', object: 'semut' },
    { word: 'sepeda', syl: 'se-pe-da', object: 'sepeda' },
    { word: 'siput', syl: 'si-put', object: 'siput' },
  ],
  t: [
    { word: 'topi', syl: 'to-pi', object: 'topi' },
    { word: 'tomat', syl: 'to-mat', object: 'tomat' },
    { word: 'telur', syl: 'te-lur', object: 'telur' },
  ],
  v: [],
  w: [{ word: 'wortel', syl: 'wor-tel', object: 'wortel' }],
  x: [{ word: 'xilofon', syl: 'xi-lo-fon', object: 'xilofon' }],
  y: [{ word: 'yoyo', syl: 'yo-yo', object: 'yoyo' }],
  z: [{ word: 'zebra', syl: 'ze-bra', object: 'zebra' }],
};

/** Kata bergambar untuk setiap huruf a–z. */
export const LETTER_WORDS: Record<Letter, readonly LetterWord[]> = {
  ...VOWEL_WORDS,
  ...CONSONANT_WORDS,
};

/** Huruf pengecoh yang bentuknya mirip (sering tertukar). */
const LOOKALIKE: Record<Letter, string[]> = {
  a: ['o', 'd', 'e'],
  i: ['l', 'j', 't'],
  u: ['n', 'v', 'o'],
  e: ['c', 'a', 'o'],
  o: ['a', 'c', 'u'],
  b: ['d', 'p', 'h'],
  c: ['e', 'o', 'a'],
  d: ['b', 'p', 'q'],
  f: ['t', 'l', 'j'],
  g: ['q', 'y', 'p'],
  h: ['n', 'b', 'k'],
  j: ['i', 'g', 'y'],
  k: ['h', 'x', 'l'],
  l: ['i', 't', 'k'],
  m: ['n', 'w', 'u'],
  n: ['m', 'h', 'u'],
  p: ['q', 'b', 'd'],
  q: ['p', 'g', 'd'],
  r: ['n', 'v', 't'],
  s: ['z', 'c', 'e'],
  t: ['f', 'l', 'i'],
  v: ['w', 'y', 'u'],
  w: ['m', 'v', 'u'],
  x: ['k', 'y', 'z'],
  y: ['v', 'g', 'j'],
  z: ['s', 'x', 'n'],
};
/** Huruf yang sudah akrab untuk pengecoh terakhir. */
const FAMILIAR = ['b', 'm', 's', 't', 'n', 'k', 'p', 'd', 'l', 'a', 'i', 'u', 'e', 'o'];

const letterSchema = z.enum(ALPHABET);
const lettersParam = z.array(letterSchema).min(1).max(26);
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
const pictureChoice = (w: LetterWord, id: string, tag?: string): Choice => ({
  id,
  visual: { kind: 'object', object: w.object },
  say: w.word,
  ...(tag && { tag }),
});
/** "a-yam" → "a, yam. ayam" (dibacakan per suku kata). */
const sylSay = (w: LetterWord) => `${w.syl.split('-').join(', ')}. ${w.word}`;
const caseOf = (rng: Rng, c: z.infer<typeof caseSchema>) =>
  c === 'both' ? (rng.chance(0.5) ? 'upper' : 'lower') : c;
const shown = (v: Letter, c: 'upper' | 'lower') => (c === 'upper' ? v.toUpperCase() : v);

/** Pengecoh huruf: huruf lain di `pool` dulu, lalu huruf yang mirip, lalu huruf yang akrab. */
function letterDistractors(
  rng: Rng,
  target: Letter,
  pool: readonly string[],
  count: number,
): { text: string; tag: string }[] {
  const out: { text: string; tag: string }[] = [];
  const add = (xs: readonly string[], tag: string) => {
    for (const x of rng.shuffle(xs))
      if (out.length < count && x !== target && !out.some((o) => o.text === x))
        out.push({ text: x, tag });
  };
  add(pool, (VOWELS as readonly string[]).includes(target) ? 'vokal-lain' : 'huruf-lain');
  add(LOOKALIKE[target], 'bentuk-mirip');
  add(FAMILIAR, 'huruf-akrab');
  return out;
}

// ------------------------------------------------------------ tebalkan huruf

export const letterTrace = defineFamily({
  description: 'Tebalkan huruf a–z (kecil/besar) mengikuti goresan bernomor.',
  params: z.strictObject({
    letters: lettersParam.default(['a']),
    case: caseSchema.default('lower'),
    /** `mixed` = kadang garis tebal, kadang titik-titik (latihan berulang yang tidak monoton). */
    guide: z.enum(['solid', 'dotted', 'mixed']).default('solid'),
    /** Tampilkan gambar benda berawalan huruf itu (a → ayam); huruf tanpa gambar (f, q, v) tetap tanpa gambar. */
    picture: z.boolean().default(true),
    tolerance: z.number().int().min(6).max(24).default(16),
    maxSlips: z.number().int().min(0).max(9).default(3),
  }),
  generate(p, rng) {
    const v = rng.pick(p.letters);
    const c = caseOf(rng, p.case);
    const glyph = shown(v, c) as LetterGlyphId;
    const words = LETTER_WORDS[v];
    const w = p.picture && words.length ? rng.pick(words) : undefined;
    const name = letterSay(glyph);
    return {
      prompt: w ? `Tebalkan ${name}, seperti ${w.word}.` : `Tebalkan ${name}.`,
      say: w
        ? `Ini ${name}. ${v}, untuk ${sylSay(w)}. Ayo tebalkan, mulai dari titik nomor satu.`
        : `Ini ${name}. Ayo tebalkan, mulai dari titik nomor satu.`,
      stimulus: w ? [{ kind: 'object', object: w.object }] : [],
      interaction: {
        type: 'trace',
        glyph,
        guide: p.guide === 'mixed' ? (rng.chance(0.5) ? 'solid' : 'dotted') : p.guide,
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
    'Kenali huruf a–z: dengar lalu ketuk hurufnya, huruf depan gambar, gambar berawalan huruf, atau pasangan huruf besar-kecil.',
  params: z.strictObject({
    letters: lettersParam.default(['a', 'i']),
    /**
     * `listen` = dengar lalu ketuk huruf; `show` = ketuk huruf yang disebut & ditulis; `initial` = huruf depan
     * gambar; `picture` = gambar yang berawalan huruf; `case` = huruf kecil dari huruf besar.
     */
    mode: z.enum(['listen', 'show', 'initial', 'picture', 'case']).default('show'),
    /** Huruf yang boleh jadi pengecoh (yang sudah dikenal anak). */
    pool: z.array(letterSchema).max(10).default([]),
    case: caseSchema.default('lower'),
    choices: range(2, 4).default([3, 3]),
  }),
  generate(p, rng) {
    const v = rng.pick(p.letters);
    const k = rng.int(p.choices[0], p.choices[1]);
    const c = p.mode === 'case' ? 'lower' : caseOf(rng, p.case);
    switch (p.mode) {
      case 'picture': {
        if (!LETTER_WORDS[v].length) reject(`huruf ${v} belum punya gambar`);
        const w = rng.pick(LETTER_WORDS[v]);
        const others = (p.pool.length ? p.pool : VOWELS).filter((x) => x !== v);
        if (others.length === 0) reject('butuh huruf lain untuk gambar pengecoh');
        const wrong = rng
          .shuffle(others.flatMap((x) => LETTER_WORDS[x]))
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
        if (!LETTER_WORDS[v].length) reject(`huruf ${v} belum punya gambar`);
        const w = rng.pick(LETTER_WORDS[v]);
        const wrong = letterDistractors(rng, v, p.pool, k - 1).map((d, i) =>
          letterChoice(`l${i}`, shown(d.text as Letter, c), d.tag),
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
          letterChoice(`l${i}`, shown(d.text as Letter, c), d.tag),
        );
        const listen = p.mode === 'listen';
        const like = LETTER_WORDS[v].length ? rng.pick(LETTER_WORDS[v]) : undefined;
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
            say: like
              ? `Ini ${letterSay(target)}. ${v}, seperti ${sylSay(like)}.`
              : `Ini ${letterSay(target)}. Lihat bentuknya baik-baik.`,
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
    pool: z.array(letterSchema).max(10).default([]),
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
      ...Array.from({ length: k - hits }, (_, i) => shown(others[i % others.length] as Letter, c)),
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
