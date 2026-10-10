import { z } from 'zod';
import { COUNTABLE_OBJECTS, type ObjectId } from '../assets.js';
import { buildWordSearch, carveMaze, mazeDeadEnds, mazePath } from '../games.js';
import { ALPHABET, VOWELS, type Letter } from '../glyphs.js';
import type { Choice, Visual } from '../item.js';
import { numberWord } from '../words.js';
import { between, defineFamily, range, reject } from './common.js';
import { LETTER_WORDS, letterSay, VOWEL_WORDS } from './letters.js';

/**
 * Game interaktif Worksheet PAUD (D-075): labirin, cari kata, kartu pasangan, dan tangkap — untuk berhitung
 * (angka 1–10) dan membaca (huruf vokal, kata bergambar). Tanpa batas waktu, tanpa nyawa; semua dibacakan.
 */

const vowelSchema = z.enum(VOWELS);
/** Huruf a–z untuk kartu pasangan & tangkap huruf (D-083). */
const letterSchema = z.enum(ALPHABET);
const caseSchema = z.enum(['lower', 'upper']);
const shown = (v: string, c: 'lower' | 'upper') => (c === 'upper' ? v.toUpperCase() : v);

// ------------------------------------------------------------ labirin

export const mazePathFamily = defineFamily({
  description: 'Labirin: bantu Momo keluar lewat huruf vokal berurutan atau angka 1, 2, 3, … .',
  params: z.strictObject({
    mode: z.enum(['vowels', 'numbers']).default('vowels'),
    /** Maks. 5 kolom: kotak tetap ≥ 64 px di layar HP. */
    cols: range(3, 5).default([4, 4]),
    rows: range(3, 6).default([4, 4]),
    /** Mode huruf: urutan huruf di jalan keluar. */
    letters: z.array(vowelSchema).min(2).max(5).default(['a', 'i', 'u', 'e', 'o']),
    case: caseSchema.default('upper'),
    /** Mode angka: banyak angka di jalan (1 sampai n). */
    count: range(2, 9).default([3, 5]),
    /** Huruf/angka pengecoh di jalan buntu. */
    decoys: range(0, 4).default([0, 2]),
    maxSlips: z.number().int().min(0).max(20).default(8),
  }),
  generate(p, rng) {
    const cols = between(rng, p.cols);
    const rows = between(rng, p.rows);
    const walls = carveMaze(rng, cols, rows);
    const start = rng.int(0, rows - 1) * cols;
    const goal = rng.int(0, rows - 1) * cols + cols - 1;
    const grid = { cols, rows, walls, start, goal };
    const path = mazePath(grid, start, goal);
    const labels =
      p.mode === 'vowels'
        ? p.letters.map((v) => ({ text: shown(v, p.case), say: v }))
        : Array.from({ length: between(rng, p.count) }, (_, i) => ({
            text: String(i + 1),
            say: numberWord(i + 1),
          }));
    const n = labels.length;
    if (path.length - 1 < n) reject('jalan keluar terlalu pendek');
    const marks: { cell: number; text: string; say: string; decoy?: boolean }[] = labels.map(
      (l, j) => ({ cell: path[Math.round(((j + 1) * (path.length - 1)) / n)]!, ...l }),
    );
    const pool =
      p.mode === 'vowels'
        ? ['b', 'm', 's', 'k', 't', 'n'].map((x) => ({ text: shown(x, p.case), say: x }))
        : Array.from({ length: 4 }, (_, i) => n + 1 + i)
            .filter((x) => x <= 10)
            .map((x) => ({ text: String(x), say: numberWord(x) }));
    const ends = rng.shuffle(mazeDeadEnds(grid).filter((c) => !path.includes(c)));
    const decoys = Math.min(between(rng, p.decoys), ends.length, pool.length);
    rng
      .shuffle(pool)
      .slice(0, decoys)
      .forEach((l, i) => marks.push({ cell: ends[i]!, ...l, decoy: true }));
    const list = labels.map((l) => l.text);
    const spoken = labels.map((l) => l.say);
    return {
      prompt:
        p.mode === 'vowels'
          ? `Bantu Momo keluar labirin lewat huruf ${list.join(', ')}.`
          : `Bantu Momo keluar labirin lewat angka 1 sampai ${n}.`,
      say:
        p.mode === 'vowels'
          ? `Bantu Momo keluar dari labirin. Lewati huruf ${spoken.slice(0, -1).join(', ')}, sampai ${spoken.at(-1)}. Ketuk kotak jalannya.`
          : `Bantu Momo keluar dari labirin. Lewati angka satu sampai ${numberWord(n)}. Ketuk kotak jalannya.`,
      stimulus: [],
      interaction: { type: 'maze', ...grid, marks, maxSlips: p.maxSlips },
      reteach: {
        say:
          p.mode === 'vowels'
            ? `Cari huruf ${spoken[0]} dulu, lalu ${spoken.slice(1).join(', lalu ')}. Kotak yang bergaris tebal adalah dinding.`
            : 'Cari angka satu dulu, lalu dua, lalu tiga. Kotak yang bergaris tebal adalah dinding.',
      },
    };
  },
});

// ------------------------------------------------------------ cari kata

type SearchWord = { text: string; visual: Visual; say: string };
const pic = (text: string, object: ObjectId, say = text.toLowerCase()): SearchWord => ({
  text,
  visual: { kind: 'object', object },
  say,
});
const vowelPics = (): SearchWord[] =>
  VOWELS.flatMap((v) => VOWEL_WORDS[v]).map((w) =>
    pic(w.word.toUpperCase(), w.object, w.syl.replace('-', ', ')),
  );

export const WORD_SEARCH_THEMES = {
  buah: [
    pic('APEL', 'apel'),
    pic('JERUK', 'jeruk'),
    pic('NANAS', 'nanas'),
    pic('PISANG', 'pisang'),
    pic('MANGGA', 'mangga'),
    pic('ANGGUR', 'anggur'),
  ],
  hewan: [
    pic('AYAM', 'ayam'),
    pic('IKAN', 'ikan'),
    pic('ULAR', 'ular'),
    pic('SAPI', 'sapi'),
    pic('KUDA', 'kuda'),
    pic('BEBEK', 'bebek'),
    pic('SEMUT', 'semut'),
    pic('GAJAH', 'gajah'),
    pic('SINGA', 'singa'),
    pic('UNTA', 'unta'),
  ],
  angka: [1, 2, 3, 4, 5, 6, 7].map((n) => ({
    text: numberWord(n).toUpperCase(),
    visual: { kind: 'numeral', value: n } as Visual,
    say: numberWord(n),
  })),
  vokal: vowelPics(),
} satisfies Record<string, SearchWord[]>;

export const wordSearchFamily = defineFamily({
  description: 'Cari kata bergambar di kotak huruf (mendatar/menurun), ketuk hurufnya berurutan.',
  params: z.strictObject({
    theme: z.enum(['buah', 'hewan', 'angka', 'vokal']).default('hewan'),
    /** Maks. 5×5: kotak huruf tetap ≥ 64 px di layar HP. */
    size: range(4, 5).default([5, 5]),
    words: range(1, 4).default([2, 3]),
    maxSlips: z.number().int().min(0).max(20).default(8),
  }),
  generate(p, rng) {
    const size = between(rng, p.size);
    const pool = WORD_SEARCH_THEMES[p.theme].filter((w) => w.text.length <= size);
    const k = Math.min(between(rng, p.words), pool.length);
    if (k < 1) reject('tidak ada kata yang muat');
    const picked = rng.sample(pool, k);
    const built = buildWordSearch(
      rng,
      size,
      size,
      picked.map((w) => w.text),
    );
    if (!built) reject('kata tidak muat di kotak');
    const words = built!.placed.map((pl, i) => ({ id: `w${i}`, ...picked[i]!, cells: pl.cells }));
    const names = picked.map((w) => w.text);
    const spoken = picked.map((w) => w.say);
    const join = (xs: string[]) =>
      xs.length === 1 ? xs[0]! : `${xs.slice(0, -1).join(', ')} dan ${xs.at(-1)}`;
    return {
      prompt: `Cari kata ${join(names)}.`,
      say: `Cari kata ${join(spoken)} di kotak huruf. Ketuk hurufnya berurutan, mulai dari huruf pertama.`,
      stimulus: [],
      interaction: {
        type: 'word-search',
        cols: size,
        rows: size,
        letters: built!.letters,
        words,
        maxSlips: p.maxSlips,
      },
      reteach: {
        say: `Cari huruf pertamanya dulu, ${letterSay(names[0]![0]!.toLowerCase())}. Lalu lihat ke kanan atau ke bawah.`,
      },
    };
  },
});

// ------------------------------------------------------------ kartu pasangan

export const memoryPairsFamily = defineFamily({
  description:
    'Kartu pasangan (memori): angka ↔ banyak benda, huruf besar ↔ huruf kecil, atau huruf ↔ gambar berawalan huruf itu.',
  params: z.strictObject({
    mode: z.enum(['numeral-count', 'letter-case', 'letter-picture']).default('numeral-count'),
    values: range(1, 10).default([1, 5]),
    letters: z.array(letterSchema).min(2).max(6).default(['a', 'i', 'u', 'e', 'o']),
    pairs: range(2, 6).default([3, 3]),
    maxSlips: z.number().int().min(0).max(30).default(10),
    /** Tampilan kartu tertutup (D-108): pintu monster lucu untuk game berhitung PAUD. */
    theme: z.enum(['monster']).optional(),
  }),
  generate(p, rng) {
    const want = between(rng, p.pairs);
    const cards: (Choice & { pair: string })[] = [];
    if (p.mode === 'numeral-count') {
      const span = p.values[1] - p.values[0] + 1;
      if (span < want) reject('rentang angka kurang untuk banyak pasangan');
      const values = rng.sample(
        Array.from({ length: span }, (_, i) => p.values[0] + i),
        want,
      );
      const objects = rng.sample(COUNTABLE_OBJECTS, want);
      values.forEach((n, j) => {
        cards.push({
          id: '',
          pair: `q${j}`,
          visual: { kind: 'numeral', value: n },
          say: numberWord(n),
        });
        cards.push({
          id: '',
          pair: `q${j}`,
          visual: {
            kind: 'objects',
            object: objects[j]!,
            count: n,
            layout: n <= 5 ? 'row' : 'rows',
          },
          say: numberWord(n),
        });
      });
    } else {
      if (p.letters.length < want) reject('huruf kurang untuk banyak pasangan');
      rng.sample(p.letters, want).forEach((v: Letter, j) => {
        cards.push({ id: '', pair: `q${j}`, visual: { kind: 'word', text: v }, say: letterSay(v) });
        if (p.mode === 'letter-case')
          cards.push({
            id: '',
            pair: `q${j}`,
            visual: { kind: 'word', text: v.toUpperCase() },
            say: letterSay(v.toUpperCase()),
          });
        else {
          if (!LETTER_WORDS[v].length) reject(`huruf ${v} belum punya gambar`);
          const w = rng.pick(LETTER_WORDS[v]);
          cards.push({
            id: '',
            pair: `q${j}`,
            visual: { kind: 'object', object: w.object },
            say: w.word,
          });
        }
      });
    }
    const shuffled = rng.shuffle(cards).map((c, i) => ({ ...c, id: `k${i}` }));
    const what =
      p.mode === 'numeral-count'
        ? 'angka dan banyak bendanya'
        : p.mode === 'letter-case'
          ? 'huruf besar dan huruf kecilnya'
          : 'huruf dan gambar yang dimulai dengan huruf itu';
    return {
      prompt: `Cari pasangan ${what}.`,
      say: `Buka kartunya dua-dua. Cari pasangan ${what}.`,
      stimulus: [],
      interaction: {
        type: 'memory',
        cards: shuffled,
        maxSlips: p.maxSlips,
        ...(p.theme && { theme: p.theme }),
      },
      reteach: {
        say: 'Ingat letak kartu yang sudah kamu buka. Kartu yang sama-sama cocok adalah pasangan.',
      },
    };
  },
});

// ------------------------------------------------------------ tangkap

export const catchItemsFamily = defineFamily({
  description:
    'Tangkap (ketuk) benda yang tepat saat melintas: angka, huruf, atau gambar berawalan huruf.',
  params: z.strictObject({
    mode: z.enum(['numeral', 'letter', 'initial']).default('numeral'),
    values: range(0, 10).default([1, 5]),
    letters: z.array(letterSchema).min(1).max(6).default(['a']),
    pool: z.array(letterSchema).max(8).default(['a', 'i', 'u', 'e', 'o']),
    case: caseSchema.default('lower'),
    items: range(4, 8).default([5, 6]),
    targets: range(1, 4).default([2, 3]),
    maxSlips: z.number().int().min(0).max(20).default(6),
  }),
  generate(p, rng) {
    const total = between(rng, p.items);
    const hits = Math.min(between(rng, p.targets), total - 1);
    let targetSay: string;
    let targetText: string;
    let right: Choice[];
    let wrong: Choice[];
    if (p.mode === 'numeral') {
      const t = between(rng, p.values);
      const others = Array.from(
        { length: p.values[1] - p.values[0] + 1 },
        (_, i) => p.values[0] + i,
      ).filter((x) => x !== t);
      if (!others.length) reject('butuh angka lain');
      targetText = `angka ${t}`;
      targetSay = `angka ${numberWord(t)}`;
      right = Array.from({ length: hits }, () => ({
        id: '',
        visual: { kind: 'numeral', value: t } as Visual,
        say: numberWord(t),
      }));
      wrong = Array.from({ length: total - hits }, () => {
        const x = rng.pick(others);
        return { id: '', visual: { kind: 'numeral', value: x } as Visual, say: numberWord(x) };
      });
    } else if (p.mode === 'letter') {
      const v = rng.pick(p.letters);
      const t = shown(v, p.case);
      // Pengisi b/m/s hanya bila bukan huruf yang dicari (huruf konsonan, D-083).
      const others = [...new Set([...p.pool, 'b', 'm', 's'])]
        .filter((x) => x !== v)
        .map((x) => shown(x, p.case));
      targetText = letterSay(t);
      targetSay = letterSay(t);
      right = Array.from({ length: hits }, () => ({
        id: '',
        visual: { kind: 'word', text: t } as Visual,
        say: letterSay(t),
      }));
      wrong = Array.from({ length: total - hits }, () => {
        const x = rng.pick(others);
        return { id: '', visual: { kind: 'word', text: x } as Visual, say: letterSay(x) };
      });
    } else {
      const v = rng.pick(p.letters);
      const mine = LETTER_WORDS[v];
      if (!mine.length) reject(`huruf ${v} belum punya gambar`);
      const rest = p.pool.filter((x) => x !== v).flatMap((x) => LETTER_WORDS[x]);
      if (!rest.length) reject('butuh gambar lain');
      targetText = `gambar berawalan huruf ${v}`;
      targetSay = `gambar yang dimulai dengan huruf ${v}`;
      right = rng.sample(mine, Math.min(hits, mine.length)).map((w) => ({
        id: '',
        visual: { kind: 'object', object: w.object } as Visual,
        say: w.word,
      }));
      wrong = rng.sample(rest, Math.min(total - right.length, rest.length)).map((w) => ({
        id: '',
        visual: { kind: 'object', object: w.object } as Visual,
        say: w.word,
      }));
    }
    const all = rng
      .shuffle([
        ...right.map((c) => ({ ...c, ok: true })),
        ...wrong.map((c) => ({ ...c, ok: false })),
      ])
      .map(({ ok, ...c }, i) => ({ c: { ...c, id: `c${i}` }, ok }));
    return {
      prompt: `Tangkap semua ${targetText}.`,
      say: `Tangkap semua ${targetSay}! Ketuk saat lewat, pelan-pelan saja.`,
      stimulus: [],
      interaction: {
        type: 'catch',
        choices: all.map((x) => x.c),
        answer: all.filter((x) => x.ok).map((x) => x.c.id),
        maxSlips: p.maxSlips,
      },
      reteach: {
        say: `Lihat baik-baik. Ketuk hanya ${targetSay}. Yang lain biarkan lewat.`,
      },
    };
  },
});
