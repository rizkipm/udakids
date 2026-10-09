import { z } from 'zod';
import {
  COINS,
  NOTES,
  OBJECTS,
  SHAPES,
  SENSES,
  SENSE_IDS,
  SOLIDS,
  SOLID_IDS,
  type ObjectId,
  type SenseId,
  type SolidId,
} from '../assets.js';
import { STROKE_GLYPH_IDS, STROKE_NAMES } from '../glyphs.js';
import { buildWordSearch, carveMaze, mazeDeadEnds, mazePath } from '../games.js';
import type { Choice, Visual } from '../item.js';
import { buildCrossword, fewestTokens } from '../play.js';
import { numberWord, rupiahWord, signedWord } from '../words.js';
import {
  between,
  colorSchema,
  defineFamily,
  objectIdSchema,
  range,
  reject,
  shapeIdSchema,
} from './common.js';
import { letterSay } from './letters.js';

/**
 * Game seru (D-078): permainan berlevel untuk setiap buku (PAUD sampai Kelas 2). Isi game (hewan, angka, huruf,
 * benda sains, …) ditulis di JSON lewat `spec` gambar, jadi satu family dipakai untuk banyak materi. Semua game
 * tanpa batas waktu dan tanpa nyawa; setiap kartu dibacakan saat diketuk.
 */

// ------------------------------------------------------------ gambar dari JSON

const coinSchema = z.union([z.literal(100), z.literal(200), z.literal(500), z.literal(1000)]);

/** Satu gambar di JSON: tepat satu dari object / shape / solid / numeral / word / coin / die. */
export const specSchema = z
  .strictObject({
    object: objectIdSchema.optional(),
    /** Dengan `object`: banyak benda (gambar berulang). */
    count: z.number().int().min(1).max(20).optional(),
    shape: shapeIdSchema.optional(),
    solid: z.enum(SOLID_IDS as [SolidId, ...SolidId[]]).optional(),
    color: colorSchema.optional(),
    numeral: z.number().int().min(0).max(1000).optional(),
    word: z.string().trim().min(1).max(14).optional(),
    coin: coinSchema.optional(),
    die: z.number().int().min(1).max(6).optional(),
    /** Garis/pola pramenulis (P-BT-02/03, D-081). */
    glyph: z.enum(STROKE_GLYPH_IDS).optional(),
    /** Uang kertas Rupiah (D-081). */
    note: z.literal([...NOTES]).optional(),
    /** Alat indra (D-089). */
    sense: z.enum(SENSE_IDS as [SenseId, ...SenseId[]]).optional(),
    /** Wajah anak; alat indra yang disorot, atau `semua` = tanpa sorotan (D-089). */
    face: z.union([z.enum(SENSE_IDS as [SenseId, ...SenseId[]]), z.literal('semua')]).optional(),
    /** Tangan dengan n jari terangkat (1–10), P-MA-04 (D-079). */
    fingers: z.number().int().min(1).max(10).optional(),
    /** Dengan `object`: ukuran relatif (besar–kecil, panjang–pendek), P-MA-10. */
    scale: z.number().min(0.4).max(1.6).optional(),
    /** Gambar posisi: `object` (subjek) di atas/bawah/dalam/… benda `of` (P-MA-08). */
    at: z.enum(['in-front', 'behind', 'inside', 'outside', 'above', 'below', 'beside']).optional(),
    of: objectIdSchema.optional(),
    /** Jam analog "07:30" (materi Waktu). */
    clock: z
      .string()
      .regex(/^([01]\d|2[0-3]):(00|15|30|45)$/)
      .optional(),
    /** Diucapkan saat kartu diketuk (default: nama gambar / angka / kata). */
    say: z.string().trim().min(1).max(60).optional(),
  })
  .refine(
    (s) =>
      [
        s.object,
        s.shape,
        s.solid,
        s.numeral,
        s.word,
        s.coin,
        s.die,
        s.clock,
        s.fingers,
        s.glyph,
        s.note,
        s.sense,
        s.face,
      ].filter((x) => x !== undefined).length === 1,
    'isi tepat satu: object, shape, solid, numeral, word, coin, die, clock, fingers, glyph, note, sense, atau face',
  )
  .refine(
    (s) => (s.at === undefined) === (s.of === undefined),
    'posisi butuh `at` dan `of` bersama',
  )
  .refine(
    (s) => (s.at === undefined && s.scale === undefined) || s.object !== undefined,
    '`at`/`scale` hanya untuk `object`',
  );
export type Spec = z.infer<typeof specSchema>;

export function specVisual(s: Spec): Visual {
  if (s.sense !== undefined) return { kind: 'sense', sense: s.sense };
  if (s.face !== undefined)
    return s.face === 'semua' ? { kind: 'face' } : { kind: 'face', sense: s.face };
  if (s.fingers !== undefined) return { kind: 'fingers', count: s.fingers };
  if (s.glyph !== undefined) return { kind: 'glyph', glyph: s.glyph };
  if (s.note !== undefined) return { kind: 'note', value: s.note };
  if (s.object !== undefined && s.at !== undefined)
    return { kind: 'scene', relation: s.at, subject: s.object, reference: s.of! };
  if (s.object !== undefined && s.scale !== undefined)
    return { kind: 'object', object: s.object, scaleX: s.scale, scaleY: s.scale };
  if (s.object !== undefined)
    return s.count !== undefined
      ? { kind: 'objects', object: s.object, count: s.count, layout: s.count <= 5 ? 'row' : 'rows' }
      : { kind: 'object', object: s.object, ...(s.color && { color: s.color }) };
  if (s.shape !== undefined)
    return { kind: 'shape', shape: s.shape, color: s.color ?? 'biru', size: 'm' };
  if (s.solid !== undefined) return { kind: 'solid', solid: s.solid, color: s.color ?? 'oranye' };
  if (s.numeral !== undefined) return { kind: 'numeral', value: s.numeral };
  if (s.coin !== undefined) return { kind: 'coin', value: s.coin };
  if (s.die !== undefined) return { kind: 'die', value: s.die };
  if (s.clock !== undefined) {
    const [hour, minute] = s.clock.split(':').map(Number) as [number, number];
    return { kind: 'clock', hour, minute };
  }
  return { kind: 'word', text: s.word! };
}

/** "jam tujuh", "jam tujuh lewat tiga puluh menit" (jam 1–12, seperti jam dinding). */
export function clockSay(clock: string): string {
  const [h, m] = clock.split(':').map(Number) as [number, number];
  const hour = numberWord(h % 12 === 0 ? 12 : h % 12);
  return m === 0 ? `jam ${hour}` : `jam ${hour} lewat ${numberWord(m)} menit`;
}

export function specSay(s: Spec): string {
  if (s.say) return s.say;
  if (s.sense !== undefined) return SENSES[s.sense].say;
  if (s.face !== undefined)
    return s.face === 'semua' ? 'wajah' : `${SENSES[s.face].say}, ${SENSES[s.face].indra}`;
  if (s.fingers !== undefined) return `${numberWord(s.fingers)} jari`;
  if (s.glyph !== undefined) return STROKE_NAMES[s.glyph];
  if (s.note !== undefined) return rupiahWord(s.note);
  if (s.object !== undefined)
    return s.count !== undefined
      ? `${numberWord(s.count)} ${OBJECTS[s.object].say}`
      : OBJECTS[s.object].say;
  if (s.shape !== undefined) return SHAPES[s.shape].say;
  if (s.solid !== undefined) return SOLIDS[s.solid].say;
  if (s.numeral !== undefined) return numberWord(s.numeral);
  if (s.coin !== undefined) return rupiahWord(s.coin);
  if (s.die !== undefined) return numberWord(s.die);
  if (s.clock !== undefined) return clockSay(s.clock);
  // Kata huruf besar semua (CAT, ONE) dibaca huruf kecil; kata bercampur (konsumen II, Mars) dibiarkan.
  return /^[A-Z]{2,}$/.test(s.word!) ? s.word!.toLowerCase() : s.word!;
}

const card = (id: string, s: Spec): Choice => ({ id, visual: specVisual(s), say: specSay(s) });

/** "a, b dan c" */
const join = (xs: readonly string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} dan ${xs.at(-1)}`;

/** Rp1.500 (titik ribuan, tanpa Intl agar sama di semua perangkat). */
export const rupiahText = (n: number) => `Rp${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/** Teks soal & suara dari JSON (opsional) — `{x}` diganti nilai soal. */
const textSchema = z.string().trim().min(3).max(160);
const fill = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));

const slipsSchema = (def: number) => z.number().int().min(0).max(30).default(def);

/** Rentang angka berurutan [a, b] dengan langkah `step`. */
const seq = (a: number, b: number, step = 1) =>
  Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step);

// ------------------------------------------------------------ neraca, toko, truk

export const sumGame = defineFamily({
  description:
    'Neraca seimbang, Toko Momo (bayar koin sampai pas), atau truk muatan: ketuk token sampai jumlahnya tepat.',
  params: z.strictObject({
    style: z.enum(['balance', 'shop', 'truck']).default('balance'),
    target: range(1, 100000).default([3, 6]),
    /** Kelipatan target (mis. 100 untuk harga). */
    step: z.number().int().min(1).max(1000).default(1),
    /** Nilai yang sudah ada di sisi anak (neraca: 4 + … = 7). */
    given: range(0, 1000).default([0, 0]),
    /** Nilai token (persediaan tak terbatas). */
    values: z.array(z.number().int().min(1).max(100000)).min(1).max(4).default([1]),
    maxTokens: z.number().int().min(1).max(12).default(10),
    /** Benda di sisi lawan (neraca/truk) atau barang belanja (toko). */
    objects: z.array(objectIdSchema).min(1).default(['apel']),
    /** Neraca/truk: tampilkan angka, bukan gambar benda. */
    showNumber: z.boolean().default(false),
  }),
  generate(p, rng) {
    const targets = seq(p.target[0], p.target[1]).filter((x) => x % p.step === 0);
    if (!targets.length) reject('tidak ada target kelipatan step');
    const target = rng.pick(targets);
    const given = Math.min(between(rng, p.given), target - 1);
    const need = target - given;
    if (fewestTokens(p.values, need) > p.maxTokens) reject('target tidak bisa dicapai');
    const object = rng.pick(p.objects);
    const noun = OBJECTS[object].say;
    const say = (v: number) => (p.style === 'shop' ? rupiahWord(v) : numberWord(v));
    const tokens = [...new Set(p.values)]
      .sort((a, b) => a - b)
      .map((v) => ({
        id: `t${v}`,
        value: v,
        visual: (p.style === 'shop'
          ? (COINS as readonly number[]).includes(v)
            ? { kind: 'coin', value: v }
            : { kind: 'word', text: rupiahText(v) }
          : { kind: 'numeral', value: v }) as Visual,
        say: say(v),
      }));
    let show: Visual;
    let prompt: string;
    let spoken: string;
    let reteach: string;
    if (p.style === 'shop') {
      show = {
        kind: 'row',
        items: [
          { kind: 'object', object },
          { kind: 'word', text: rupiahText(target) },
        ],
      };
      prompt = `Momo membeli ${noun} seharga ${rupiahText(target)}. Bayar dengan koin sampai uangnya pas.`;
      spoken = `Momo mau membeli ${noun}. Harganya ${rupiahWord(target)}. Ketuk koin sampai uangnya pas, lalu tekan Selesai.`;
      reteach = `Harganya ${rupiahWord(target)}. Jumlahkan koinmu satu per satu. Kalau kelebihan, ketuk koin di nampan untuk mengeluarkannya.`;
    } else if (p.style === 'truck') {
      show = p.showNumber
        ? { kind: 'numeral', value: target }
        : { kind: 'objects', object, count: target, layout: target <= 5 ? 'row' : 'rows' };
      prompt =
        given > 0
          ? `Truk sudah berisi ${given}. Isi sampai muatannya tepat ${target}.`
          : `Isi truk sampai muatannya tepat ${target}.`;
      spoken = `${given > 0 ? `Truk sudah berisi ${numberWord(given)}. ` : ''}Isi truk sampai muatannya tepat ${numberWord(target)}. Ketuk peti angka, lalu tekan Selesai.`;
      reteach = `Muatan harus tepat ${numberWord(target)}. Jumlahkan angka di peti: kalau kurang tambah, kalau lebih keluarkan.`;
    } else {
      show = p.showNumber
        ? { kind: 'numeral', value: target }
        : { kind: 'objects', object, count: target, layout: target <= 5 ? 'row' : 'rows' };
      const left = p.showNumber ? `${target}` : `${target} ${noun}`;
      prompt =
        given > 0
          ? `Kiri ${left}. Kanan sudah ${given}. Tambah beban sampai neraca seimbang.`
          : `Buat neraca seimbang. Kiri ada ${left}.`;
      spoken =
        given > 0
          ? `Neraca kiri ${numberWord(target)}. Kanan sudah ${numberWord(given)}. Tambah beban sampai seimbang, lalu tekan Selesai.`
          : `Di kiri ada ${numberWord(target)}${p.showNumber ? '' : ` ${noun}`}. Tambah beban di kanan sampai neraca seimbang, lalu tekan Selesai.`;
      reteach =
        given > 0
          ? `${numberWord(given)} ditambah ${numberWord(need)} sama dengan ${numberWord(target)}. Neraca seimbang kalau kedua sisi sama.`
          : `Neraca seimbang kalau kedua sisi sama: ${numberWord(target)} dan ${numberWord(target)}.`;
    }
    return {
      prompt,
      say: spoken,
      stimulus: [],
      interaction: {
        type: 'sum',
        style: p.style,
        target,
        given,
        tokens,
        show,
        maxTokens: p.maxTokens,
      },
      reteach: { say: reteach },
    };
  },
});

// ------------------------------------------------------------ lompat kodok / hitung langkah

export const hopGame = defineFamily({
  description:
    'Lompat kodok / hitung langkah: ketuk batu tempat mendarat satu per satu (membilang, tambah, kurang, loncat).',
  params: z.strictObject({
    style: z.enum(['frog', 'steps']).default('frog'),
    mode: z.enum(['count', 'add', 'sub', 'skip']).default('count'),
    /** Angka batu pertama dan terakhir di papan. */
    board: range(-100, 1000).default([0, 10]),
    /** Jarak antar batu (papan loncat 2/5/10). */
    boardStep: z.number().int().min(1).max(100).default(1),
    start: range(-100, 1000).default([0, 3]),
    /** Banyak lompatan. */
    hops: range(1, 10).default([2, 4]),
    /** Besar satu lompatan (mode skip). */
    step: z.number().int().min(1).max(100).default(1),
    maxSlips: slipsSchema(4),
    /**
     * Kalimat sendiri untuk tema non-kodok (D-084), mis. termometer: "Suhu air {start} °C, naik {step} °C tiap
     * menit. Ketuk suhunya {n} menit berikutnya." Isian: {start} {n} {step} {end} {list}; di `say`/`reteach`
     * angka dibacakan sebagai kata. Tanpa ini: kalimat kodok/langkah bawaan.
     */
    prompt: textSchema.optional(),
    say: textSchema.optional(),
    reteach: textSchema.optional(),
  }),
  generate(p, rng) {
    const stones = seq(p.board[0], p.board[1], p.boardStep);
    if (stones.length < 3 || stones.length > 21) reject('papan 3–21 batu');
    const step = p.mode === 'skip' ? p.step : p.boardStep;
    const dir = p.mode === 'sub' ? -1 : 1;
    const starts = stones.filter((x) => x >= p.start[0] && x <= p.start[1]);
    if (!starts.length) reject('awal tidak ada di papan');
    const start = rng.pick(starts);
    const n = between(rng, p.hops);
    const answer = Array.from({ length: n }, (_, i) => start + dir * (i + 1) * step);
    if (answer.some((x) => !stones.includes(x))) reject('lompatan keluar papan');
    const end = answer.at(-1)!;
    const who = p.style === 'frog' ? 'Kodok' : 'Momo';
    const move = p.style === 'frog' ? 'lompat' : 'melangkah';
    let prompt: string;
    let say: string;
    let stimulus: Visual[] = [];
    let reteach: string;
    const list = answer.map(numberWord).join(', ');
    if (p.mode === 'add' || p.mode === 'sub') {
      const op = p.mode === 'add' ? '+' : '-';
      const opSay = p.mode === 'add' ? 'tambah' : 'kurang';
      stimulus = [{ kind: 'equation', left: start, op, right: n }];
      prompt = `${start} ${op} ${n} = ? ${who} mulai di ${start}, ${move} ${p.mode === 'add' ? 'maju' : 'mundur'} ${n} kali.`;
      say = `${signedWord(start)} ${opSay} ${signedWord(n)}. ${who} mulai di ${signedWord(start)}. Ketuk ${n === 1 ? 'batunya' : `${signedWord(n)} batu`} ${p.mode === 'add' ? 'ke depan' : 'ke belakang'}, satu per satu.`;
      reteach = `Mulai dari ${signedWord(start)}, lalu hitung ${p.mode === 'add' ? 'maju' : 'mundur'}: ${list}. Jadi ${signedWord(start)} ${opSay} ${signedWord(n)} sama dengan ${signedWord(end)}.`;
    } else if (p.mode === 'skip') {
      prompt = `${who} ${move} ${step}-${step} mulai dari ${start}. Ketuk ${n} batu berikutnya.`;
      say = `${who} ${move} ${signedWord(step)}, ${signedWord(step)}, mulai dari ${signedWord(start)}. Ketuk ${signedWord(n)} batu berikutnya, satu per satu.`;
      reteach = `Loncat ${signedWord(step)}-${signedWord(step)} dari ${signedWord(start)}: ${list}.`;
    } else {
      prompt = `${who} di ${start}. ${who} ${move} ${n} kali. Ketuk batunya satu per satu.`;
      say = `${who} ada di ${signedWord(start)}. Hitung bersama: ${who.toLowerCase()} ${move} ${signedWord(n)} kali. Ketuk batunya satu per satu.`;
      reteach = `Hitung setiap ${move === 'lompat' ? 'lompatan' : 'langkah'}: ${list}. ${who} berhenti di ${signedWord(end)}.`;
    }
    if (p.prompt || p.say || p.reteach) {
      const nums = { start, n, step, end, list: answer.join(', ') };
      const words = {
        start: signedWord(start),
        n: signedWord(n),
        step: signedWord(step),
        end: signedWord(end),
        list: answer.map(signedWord).join(', '),
      };
      // Persamaan "start + n" hanya cocok untuk kodok berhitung; tema lain (n = menit/detik) tanpa persamaan.
      if (p.prompt) [prompt, stimulus] = [fill(p.prompt, nums), []];
      say = fill(p.say ?? p.prompt ?? say, p.say || p.prompt ? words : {});
      if (p.reteach) reteach = fill(p.reteach, words);
    }
    return {
      prompt,
      say,
      stimulus,
      interaction: { type: 'hop', style: p.style, stones, start, answer, maxSlips: p.maxSlips },
      reteach: { say: reteach },
    };
  },
});

// ------------------------------------------------------------ sortir keranjang

const binSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]{1,20}$/),
  /** Nama keranjang (dibacakan & ditulis kecil di bawahnya). */
  label: z.string().trim().min(2).max(30),
  icon: specSchema,
});

export const sortGame = defineFamily({
  description:
    'Sortir keranjang: benda datang satu per satu, ketuk keranjang yang tepat (2–3 keranjang).',
  params: z
    .strictObject({
      style: z.enum(['baskets', 'trucks']).default('baskets'),
      bins: z.array(binSchema).min(2).max(3),
      items: z.array(z.strictObject({ bin: z.string(), item: specSchema })).min(4),
      count: range(3, 10).default([4, 6]),
      prompt: textSchema.default('Masukkan setiap benda ke keranjang yang tepat.'),
      say: textSchema.optional(),
      reteach: textSchema.default('Lihat bendanya baik-baik, lalu pikirkan kelompoknya.'),
      maxSlips: slipsSchema(4),
    })
    .superRefine((p, ctx) => {
      const ids = new Set(p.bins.map((b) => b.id));
      p.items.forEach((x, i) => {
        if (!ids.has(x.bin))
          ctx.addIssue({
            code: 'custom',
            path: ['items', i, 'bin'],
            message: `keranjang "${x.bin}" tidak ada`,
          });
      });
    }),
  generate(p, rng) {
    const n = between(rng, p.count);
    // Setiap keranjang mendapat minimal satu benda.
    const first = p.bins.map((b) => rng.pick(p.items.filter((x) => x.bin === b.id)));
    if (first.some((x) => !x)) reject('ada keranjang tanpa benda');
    const rest = rng.sample(
      p.items.filter((x) => !first.includes(x)),
      Math.max(0, Math.min(n - first.length, p.items.length - first.length)),
    );
    const picked = rng.shuffle([...first, ...rest]);
    const items = picked.map((x, i) => card(`i${i}`, x.item));
    const bins = p.bins.map((b) => ({ ...card(`b-${b.id}`, b.icon), say: b.label }));
    const answer = Object.fromEntries(picked.map((x, i) => [`i${i}`, `b-${x.bin}`]));
    return {
      prompt: p.prompt,
      say: p.say ?? `${p.prompt} Ada keranjang ${join(p.bins.map((b) => b.label))}.`,
      stimulus: [],
      interaction: { type: 'sort', style: p.style, bins, items, answer, maxSlips: p.maxSlips },
      reteach: { say: p.reteach },
    };
  },
});

// ------------------------------------------------------------ teka-teki silang

type CrossWord = { text: string; spec: Spec };
const cw = (text: string, object: ObjectId): CrossWord => ({ text, spec: { object } });
const cwn = (text: string, n: number): CrossWord => ({
  text,
  spec: { numeral: n, say: text.toLowerCase() },
});
/** Kata English: gambar dibacakan dengan kata English-nya. */
const cwe = (text: string, object: ObjectId): CrossWord => ({
  text,
  spec: { object, say: text.toLowerCase() },
});

/** Tema teka-teki silang (kata & gambar buatan sendiri) dan tokoh di atas papan. */
export const CROSSWORD_THEMES = {
  transportasi: {
    mascot: 'traktor',
    words: [
      cw('TRUK', 'truk'),
      cw('BUS', 'bus'),
      cw('KAPAL', 'kapal'),
      cw('MOTOR', 'motor'),
      cw('MOBIL', 'mobil'),
      cw('KERETA', 'kereta'),
      cw('PERAHU', 'perahu'),
      cw('SEPEDA', 'sepeda'),
      cw('TRAKTOR', 'traktor'),
      cw('VAN', 'van'),
    ],
  },
  hewan: {
    mascot: 'kucing',
    words: [
      cw('AYAM', 'ayam'),
      cw('SAPI', 'sapi'),
      cw('KUDA', 'kuda'),
      cw('IKAN', 'ikan'),
      cw('BEBEK', 'bebek'),
      cw('KUCING', 'kucing'),
      cw('SEMUT', 'semut'),
      cw('ULAR', 'ular'),
      cw('SINGA', 'singa'),
      cw('GAJAH', 'gajah'),
      cw('KATAK', 'katak'),
      cw('LEBAH', 'lebah'),
    ],
  },
  laut: {
    mascot: 'paus',
    words: [
      cw('IKAN', 'ikan'),
      cw('HIU', 'hiu'),
      cw('PAUS', 'paus'),
      cw('PENYU', 'penyu'),
      cw('UDANG', 'udang'),
      cw('GURITA', 'gurita'),
      cw('KERANG', 'kerang'),
      cw('OMBAK', 'ombak'),
      cw('KAPAL', 'kapal'),
      cw('PERAHU', 'perahu'),
    ],
  },
  alam: {
    mascot: 'pohon',
    words: [
      cw('POHON', 'pohon'),
      cw('BUNGA', 'bunga'),
      cw('DAUN', 'daun'),
      cw('BATU', 'batu'),
      cw('AWAN', 'awan'),
      cw('HUJAN', 'hujan'),
      cw('GUNUNG', 'gunung'),
      cw('LAUT', 'laut'),
      cw('RUMPUT', 'rumput'),
      cw('PELANGI', 'pelangi'),
    ],
  },
  cuaca: {
    mascot: 'awan',
    words: [
      cw('HUJAN', 'hujan'),
      cw('AWAN', 'awan'),
      cw('ANGIN', 'angin'),
      cw('SALJU', 'salju'),
      cw('PETIR', 'petir'),
      cw('PELANGI', 'pelangi'),
      cw('PAYUNG', 'payung'),
    ],
  },
  angkasa: {
    mascot: 'astronot',
    words: [
      cw('BULAN', 'bulan'),
      cw('BINTANG', 'bintang'),
      cw('ROKET', 'roket'),
      cw('PLANET', 'planet'),
      cw('AWAN', 'awan'),
      cw('MATAHARI', 'matahari'),
    ],
  },
  buah: {
    mascot: 'apel',
    words: [
      cw('APEL', 'apel'),
      cw('JERUK', 'jeruk'),
      cw('NANAS', 'nanas'),
      cw('PISANG', 'pisang'),
      cw('MANGGA', 'mangga'),
      cw('ANGGUR', 'anggur'),
      cw('TOMAT', 'tomat'),
      cw('CERI', 'ceri'),
    ],
  },
  angka: {
    mascot: 'roket',
    words: [
      cwn('SATU', 1),
      cwn('DUA', 2),
      cwn('TIGA', 3),
      cwn('EMPAT', 4),
      cwn('LIMA', 5),
      cwn('ENAM', 6),
      cwn('TUJUH', 7),
      cwn('DELAPAN', 8),
      cwn('SEMBILAN', 9),
    ],
  },
  bilangan: {
    mascot: 'roket',
    words: [
      cwn('SEPULUH', 10),
      cwn('SEBELAS', 11),
      cwn('SERATUS', 100),
      cwn('SERIBU', 1000),
      cwn('ENAM', 6),
      cwn('LIMA', 5),
      cwn('TUJUH', 7),
      cwn('DELAPAN', 8),
      cwn('SEMBILAN', 9),
    ],
  },
  panas: {
    mascot: 'matahari',
    words: [
      cw('API', 'api'),
      cw('LILIN', 'lilin'),
      cw('KOMPOR', 'kompor'),
      cw('OBOR', 'obor'),
      cw('SALJU', 'salju'),
      cw('MATAHARI', 'matahari'),
      cw('IGLO', 'igloo'),
    ],
  },
  'en-animals': {
    mascot: 'kucing',
    words: [
      cwe('CAT', 'kucing'),
      cwe('DOG', 'anjing'),
      cwe('PIG', 'babi'),
      cwe('COW', 'sapi'),
      cwe('BEE', 'lebah'),
      cwe('FISH', 'ikan'),
      cwe('DUCK', 'bebek'),
      cwe('FROG', 'katak'),
      cwe('ANT', 'semut'),
      cwe('HEN', 'ayam'),
      cwe('FOX', 'rubah'),
    ],
  },
  'en-things': {
    mascot: 'truk',
    words: [
      cwe('SUN', 'matahari'),
      cwe('BUS', 'bus'),
      cwe('CAR', 'mobil'),
      cwe('BALL', 'bola'),
      cwe('CAKE', 'kue'),
      cwe('HAT', 'topi'),
      cwe('BOOK', 'buku'),
      cwe('KEY', 'kunci'),
      cwe('CUP', 'cangkir'),
      cwe('BED', 'ranjang'),
      cwe('EGG', 'telur'),
    ],
  },
  'en-numbers': {
    mascot: 'roket',
    words: [
      cwn('ONE', 1),
      cwn('TWO', 2),
      cwn('THREE', 3),
      cwn('FOUR', 4),
      cwn('FIVE', 5),
      cwn('SIX', 6),
      cwn('SEVEN', 7),
      cwn('EIGHT', 8),
      cwn('NINE', 9),
      cwn('TEN', 10),
    ],
  },
} as const satisfies Record<string, { mascot: ObjectId; words: readonly CrossWord[] }>;
export type CrosswordTheme = keyof typeof CROSSWORD_THEMES;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const crosswordGame = defineFamily({
  description:
    'Teka-teki silang bergambar bertema (transportasi, hewan, laut, alam, angkasa, angka, English): ketuk gambar, lalu hurufnya.',
  params: z.strictObject({
    theme: z
      .enum(Object.keys(CROSSWORD_THEMES) as [CrosswordTheme, ...CrosswordTheme[]])
      .default('hewan'),
    /** Kata sendiri (D-078): petunjuk boleh gambar, angka, atau kata (mis. "kucing" → CAT). Menggantikan tema. */
    custom: z
      .array(z.strictObject({ text: z.string().regex(/^[A-Z]{2,8}$/), clue: specSchema }))
      .default([]),
    /** Tokoh di atas papan untuk `custom`. */
    mascot: objectIdSchema.optional(),
    words: range(2, 4).default([2, 3]),
    maxLen: z.number().int().min(3).max(8).default(5),
    /** Kotak yang sudah terbuka: huruf pertama tiap kata, separuh huruf, atau tidak ada. */
    reveal: z.enum(['first', 'half', 'none']).default('first'),
    /** Kartu huruf pengecoh. */
    decoys: range(0, 3).default([0, 1]),
    /** English: kartu huruf dibacakan sebagai huruf (suara English). */
    lang: z.enum(['id', 'en']).default('id'),
    maxSlips: slipsSchema(8),
  }),
  generate(p, rng) {
    const theme = p.custom.length
      ? {
          mascot: p.mascot ?? CROSSWORD_THEMES[p.theme].mascot,
          words: p.custom.map((w) => ({ text: w.text, spec: w.clue })),
        }
      : CROSSWORD_THEMES[p.theme];
    const pool = theme.words.filter((w) => w.text.length <= p.maxLen);
    const k = Math.min(between(rng, p.words), pool.length);
    if (k < 2) reject('kata tema kurang');
    // Tidak setiap kumpulan kata bisa disilangkan: coba beberapa kumpulan sebelum menyerah.
    let picked: CrossWord[] = [];
    let built: ReturnType<typeof buildCrossword> = null;
    // Kartu huruf maks. 10: kumpulan kata dengan terlalu banyak huruf berbeda juga dicoba ulang.
    const letterCount = (xs: readonly CrossWord[]) => new Set(xs.flatMap((w) => [...w.text])).size;
    for (let tries = 0; tries < 60 && !built; tries++) {
      picked = rng.sample(pool, k);
      if (letterCount(picked) > 10) continue;
      built = buildCrossword(
        rng,
        picked.map((w) => w.text),
        7,
        7,
      );
    }
    if (!built) reject('kata tidak bisa disilangkan');
    const words = built!.placed.map((pl, i) => {
      const src = picked.find((w) => w.text === pl.text)!;
      return { id: `w${i}`, ...pl, visual: specVisual(src.spec), say: specSay(src.spec) };
    });
    const allCells = [...new Set(words.flatMap((w) => w.cells))];
    let prefill: number[] = [];
    if (p.reveal === 'first') prefill = [...new Set(words.map((w) => w.cells[0]!))];
    else if (p.reveal === 'half')
      prefill = [...new Set(words.flatMap((w) => w.cells.filter((_, j) => j % 2 === 0)))];
    if (prefill.length >= allCells.length) prefill = prefill.slice(0, allCells.length - 1);
    const needed = [...new Set(words.flatMap((w) => [...w.text]))];
    const decoys = rng.sample(
      [...ALPHABET].filter((ch) => !needed.includes(ch)),
      Math.max(0, Math.min(between(rng, p.decoys), 10 - needed.length)),
    );
    const tiles = rng.shuffle([...needed, ...decoys]);
    if (tiles.length > 10) reject('kartu huruf terlalu banyak');
    const letters: Choice[] = tiles.map((ch) => ({
      id: `l${ch}`,
      visual: { kind: 'word', text: ch },
      say: p.lang === 'en' ? ch : letterSay(ch.toLowerCase()),
    }));
    const names = words.map((w) => w.say);
    return {
      prompt: `Teka-teki silang: ${join(names)}. Ketuk gambarnya, lalu ketuk hurufnya.`,
      say: `Ayo isi teka-teki silang! Ada gambar ${join(names)}. Ketuk satu gambar, lalu ketuk hurufnya satu per satu.`,
      stimulus: [],
      interaction: {
        type: 'crossword',
        cols: built!.cols,
        rows: built!.rows,
        words,
        letters,
        prefill,
        maxSlips: p.maxSlips,
        mascot: theme.mascot,
      },
      reteach: {
        say: `Ucapkan nama gambarnya pelan-pelan, lalu cari hurufnya satu per satu. ${words[0]!.say}: ${[...words[0]!.text].join(', ')}.`,
      },
    };
  },
});

// ------------------------------------------------------------ puzzle

export const jigsawGame = defineFamily({
  description: 'Puzzle gambar: susun kepingan (build) atau pilih kepingan yang pas (pick).',
  params: z.strictObject({
    mode: z.enum(['build', 'pick']).default('build'),
    pictures: z.array(objectIdSchema).min(1),
    /** Nama gambar untuk kalimat (mis. English "cat"); default nama Indonesia. */
    names: z.record(z.string(), z.string().min(2).max(30)).default({}),
    cols: range(2, 3).default([2, 2]),
    rows: range(2, 3).default([2, 2]),
    /** build: kepingan yang sudah terpasang sejak awal. */
    fixed: range(0, 4).default([0, 1]),
    /** pick: banyak pilihan kepingan. */
    choices: z.number().int().min(2).max(4).default(3),
    maxSlips: slipsSchema(6),
  }),
  generate(p, rng) {
    const object = rng.pick(p.pictures);
    const noun = p.names[object] ?? OBJECTS[object].say;
    const cols = between(rng, p.cols);
    const rows = between(rng, p.rows);
    const total = cols * rows;
    const picture: Visual = { kind: 'object', object };
    if (p.mode === 'pick') {
      const index = rng.int(0, total - 1);
      const others = rng.sample(
        seq(0, total - 1).filter((x) => x !== index),
        Math.min(p.choices - 1, total - 1),
      );
      const choices = rng.shuffle([index, ...others]).map((k) => ({
        id: `k${k}`,
        visual: { kind: 'puzzle', picture, cols, rows, show: 'piece', index: k } as Visual,
        say: `kepingan ${noun}`,
      }));
      return {
        prompt: `Kepingan mana yang pas untuk gambar ${noun}?`,
        say: `Ada satu kepingan yang hilang dari gambar ${noun}. Kepingan mana yang pas?`,
        stimulus: [{ kind: 'puzzle', picture, cols, rows, show: 'holed', index }],
        interaction: { type: 'pick-one', choices, answer: `k${index}` },
        reteach: {
          say: 'Lihat garis dan warna di sekitar lubangnya. Kepingan yang pas menyambung gambarnya.',
        },
      };
    }
    const fixed = rng.sample(seq(0, total - 1), Math.min(between(rng, p.fixed), total - 2));
    let pieces = rng.shuffle(seq(0, total - 1));
    if (pieces.every((x, i) => x === i)) pieces = [...pieces.slice(1), pieces[0]!];
    return {
      prompt: `Susun puzzle gambar ${noun}.`,
      say: `Ayo susun puzzle gambar ${noun}! Ketuk satu kepingan, lalu ketuk tempatnya.`,
      stimulus: [],
      interaction: {
        type: 'jigsaw',
        picture,
        cols,
        rows,
        pieces: pieces.map((k) => `p${k}`),
        fixed,
        maxSlips: p.maxSlips,
      },
      reteach: {
        say: 'Mulai dari pojok. Cocokkan garis dan warnanya dengan kepingan di sebelahnya.',
      },
    };
  },
});

// ------------------------------------------------------------ kartu pasangan (data)

export const pairsGame = defineFamily({
  description:
    'Kartu pasangan dari daftar pasangan di JSON (hewan ↔ rumahnya, huruf ↔ gambar, rima, …).',
  params: z.strictObject({
    pairs: z.array(z.strictObject({ a: specSchema, b: specSchema })).min(2),
    count: range(2, 6).default([3, 4]),
    what: z.string().trim().min(3).max(60).default('kartu yang cocok'),
    reteach: textSchema.default(
      'Ingat letak kartu yang sudah kamu buka. Kartu yang cocok adalah pasangan.',
    ),
    maxSlips: slipsSchema(10),
  }),
  generate(p, rng) {
    const k = Math.min(between(rng, p.count), p.pairs.length);
    // Tidak boleh ada dua kartu kembar (mis. dua kartu "5"): pasangan jadi membingungkan.
    const seen = new Set<string>();
    const picked: (typeof p.pairs)[number][] = [];
    for (const x of rng.shuffle(p.pairs)) {
      const ka = JSON.stringify(specVisual(x.a));
      const kb = JSON.stringify(specVisual(x.b));
      if (seen.has(ka) || seen.has(kb)) continue;
      seen.add(ka).add(kb);
      picked.push(x);
      if (picked.length === k) break;
    }
    if (picked.length < 2) reject('pasangan unik kurang');
    const cards = picked.flatMap((x, j) => [
      { ...card('', x.a), pair: `q${j}` },
      { ...card('', x.b), pair: `q${j}` },
    ]);
    const shuffled = rng.shuffle(cards).map((c, i) => ({ ...c, id: `k${i}` }));
    return {
      prompt: `Cari pasangan ${p.what}.`,
      say: `Buka kartunya dua-dua. Cari pasangan ${p.what}.`,
      stimulus: [],
      interaction: { type: 'memory', cards: shuffled, maxSlips: p.maxSlips },
      reteach: { say: p.reteach },
    };
  },
});

// ------------------------------------------------------------ tangkap (data)

export const catchGame = defineFamily({
  description:
    'Tangkap benda yang tepat dari daftar JSON, dengan latar langit, luar angkasa, laut, atau kebun.',
  params: z.strictObject({
    targets: z.array(specSchema).min(1),
    decoys: z.array(specSchema).min(1),
    /** Kata benda untuk kalimat: "Tangkap semua {what}." */
    what: z.string().trim().min(3).max(60),
    scene: z.enum(['sky', 'space', 'sea', 'farm']).default('sky'),
    items: range(4, 8).default([5, 7]),
    hits: range(1, 4).default([2, 3]),
    reteach: textSchema.optional(),
    maxSlips: slipsSchema(5),
  }),
  generate(p, rng) {
    const total = between(rng, p.items);
    const hits = Math.min(between(rng, p.hits), total - 1, p.targets.length);
    const right = rng.sample(p.targets, hits);
    const wrong = Array.from({ length: total - hits }, () => rng.pick(p.decoys));
    const all = rng
      .shuffle([...right.map((s) => ({ s, ok: true })), ...wrong.map((s) => ({ s, ok: false }))])
      .map((x, i) => ({ c: card(`c${i}`, x.s), ok: x.ok }));
    return {
      prompt: `Tangkap semua ${p.what}.`,
      say: `Tangkap semua ${p.what}! Ketuk saat lewat, pelan-pelan saja.`,
      stimulus: [],
      interaction: {
        type: 'catch',
        choices: all.map((x) => x.c),
        answer: all.filter((x) => x.ok).map((x) => x.c.id),
        maxSlips: p.maxSlips,
        scene: p.scene,
      },
      reteach: { say: p.reteach ?? `Ketuk hanya ${p.what}. Yang lain biarkan lewat.` },
    };
  },
});

// ------------------------------------------------------------ kereta (angka/huruf yang hilang)

export const trainGame = defineFamily({
  description:
    'Kereta angka/huruf: isi gerbong yang hilang (urutan angka, loncat, mundur, alfabet, atau kata bergambar).',
  params: z.strictObject({
    mode: z.enum(['numbers', 'alphabet', 'word']).default('numbers'),
    /** numbers: angka gerbong pertama. */
    start: range(0, 1000).default([1, 5]),
    step: z.number().int().min(1).max(100).default(1),
    descending: z.boolean().default(false),
    length: range(3, 6).default([4, 5]),
    blanks: range(1, 3).default([1, 1]),
    decoys: range(1, 3).default([2, 2]),
    /** alphabet: huruf yang boleh dipakai (urutan alfabet). */
    letters: z
      .string()
      .regex(/^[A-Z]{3,26}$/)
      .default(ALPHABET),
    lowercase: z.boolean().default(false),
    /** word: kata bergambar (huruf besar). */
    words: z
      .array(
        z.strictObject({
          text: z.string().regex(/^[A-Z]{2,8}$/),
          object: objectIdSchema,
          say: z.string().optional(),
        }),
      )
      .default([]),
    lang: z.enum(['id', 'en']).default('id'),
  }),
  generate(p, rng) {
    const len = between(rng, p.length);
    let values: string[];
    let say: (v: string) => string;
    let stimulus: Visual[] = [];
    let what: string;
    let reteach: string;
    if (p.mode === 'numbers') {
      const start = between(rng, p.start);
      const nums = Array.from(
        { length: len },
        (_, i) => start + (p.descending ? -1 : 1) * i * p.step,
      );
      if (nums.some((x) => x < 0)) reject('angka negatif');
      values = nums.map(String);
      say = (v) => numberWord(Number(v));
      what = 'angka';
      reteach = `Baca keretanya dari depan: ${nums.map(numberWord).join(', ')}. ${p.descending ? 'Angkanya makin kecil' : 'Angkanya makin besar'}${p.step > 1 ? `, loncat ${numberWord(p.step)}` : ''}.`;
    } else if (p.mode === 'alphabet') {
      const at = rng.int(0, p.letters.length - len);
      if (at < 0) reject('huruf kurang');
      values = [...p.letters.slice(at, at + len)].map((c) => (p.lowercase ? c.toLowerCase() : c));
      say = (v) => (p.lang === 'en' ? v.toUpperCase() : letterSay(v));
      what = 'huruf';
      reteach = `Nyanyikan alfabetnya: ${values.join(', ')}.`;
    } else {
      const w = rng.pick(p.words.length ? p.words : reject('kata kosong'));
      values = [...w.text];
      say = (v) => (p.lang === 'en' ? v : letterSay(v.toLowerCase()));
      stimulus = [{ kind: 'object', object: w.object }];
      what = 'huruf';
      reteach = `Ucapkan pelan-pelan: ${w.say ?? w.text.toLowerCase()}. Hurufnya ${values.join(', ')}.`;
    }
    const n = Math.min(between(rng, p.blanks), values.length - 1);
    const hide = new Set(rng.sample(seq(0, values.length - 1), n));
    const slots = values.map((v, i) => (hide.has(i) ? null : v));
    const answer = values.filter((_, i) => hide.has(i));
    const pool =
      p.mode === 'numbers'
        ? seq(
            Math.max(0, Number(values[0]) - 5 * p.step),
            Number(values[0]) + (len + 5) * p.step,
            p.step,
          )
            .map(String)
            .filter((v) => !values.includes(v))
        : [...(p.mode === 'alphabet' ? p.letters : ALPHABET)]
            .map((c) => (p.lowercase ? c.toLowerCase() : c))
            .filter((v) => !answer.includes(v));
    const decoys = rng.sample(pool, Math.min(between(rng, p.decoys), pool.length));
    const letters = rng.shuffle([...answer, ...decoys]).map((v, i) => ({
      id: `t${i}`,
      visual: { kind: 'word', text: v } as Visual,
      say: say(v),
    }));
    return {
      prompt: `${what === 'angka' ? 'Angka' : 'Huruf'} apa yang hilang di gerbong kereta?`,
      say: `Tut tut! Ada gerbong yang kosong. ${what === 'angka' ? 'Angka' : 'Huruf'} apa yang hilang? Ketuk kartunya.`,
      stimulus,
      interaction: {
        type: 'spell',
        slots,
        letters,
        answer: answer.map((v) => v.toUpperCase()),
        style: 'train',
      },
      reteach: { say: reteach },
    };
  },
});

// ------------------------------------------------------------ tempel label

export const labelGame = defineFamily({
  description: 'Tempel kata ke gambarnya (kata Indonesia atau English).',
  params: z.strictObject({
    words: z
      .array(
        z.strictObject({
          word: z.string().trim().min(1).max(12),
          picture: specSchema,
          say: z.string().optional(),
        }),
      )
      .min(2),
    count: range(2, 4).default([2, 3]),
    lang: z.enum(['id', 'en']).default('id'),
  }),
  generate(p, rng) {
    const k = Math.min(between(rng, p.count), p.words.length);
    // Kata atau gambar kembar dalam satu soal membuat jawabannya ganda: lewati.
    const seen = new Set<string>();
    const picked: (typeof p.words)[number][] = [];
    for (const w of rng.shuffle(p.words)) {
      const kw = `w:${w.word.toUpperCase()}`;
      const kp = `p:${JSON.stringify(specVisual(w.picture))}`;
      if (seen.has(kw) || seen.has(kp)) continue;
      seen.add(kw).add(kp);
      picked.push(w);
      if (picked.length === k) break;
    }
    if (picked.length < 2) reject('kata unik kurang');
    const left = picked.map((w, i) => ({
      id: `w${i}`,
      // Satu huruf tetap seperti ditulis (huruf vokal kecil di PAUD); kata ditulis huruf besar.
      visual: { kind: 'word', text: w.word.length > 1 ? w.word.toUpperCase() : w.word } as Visual,
      say: w.say ?? w.word.toLowerCase(),
    }));
    const right = rng.shuffle(
      picked.map((w, i) => ({ ...card(`g${i}`, w.picture), say: specSay(w.picture) })),
    );
    const answer = Object.fromEntries(picked.map((_, i) => [`w${i}`, `g${i}`]));
    return {
      prompt: 'Tempelkan setiap kata ke gambarnya.',
      say: `Tempelkan kata ke gambarnya. Ketuk kata, lalu ketuk gambarnya. Ada kata ${join(left.map((x) => x.say))}.`,
      stimulus: [],
      interaction: { type: 'match', left, right, answer, style: 'labels' },
      reteach: {
        say: `Dengarkan katanya, lalu cari gambarnya. ${picked[0]!.say ?? picked[0]!.word.toLowerCase()} adalah gambar ${specSay(picked[0]!.picture)}.`,
      },
    };
  },
});

// ------------------------------------------------------------ bianglala / roket (urutkan)

export const wheelGame = defineFamily({
  description:
    'Bianglala/roket: urutkan angka (kecil → besar, loncat), hitung mundur, ukuran benda, atau kata bilangan English.',
  params: z.strictObject({
    style: z.enum(['ferris', 'rocket']).default('ferris'),
    mode: z.enum(['numbers', 'countdown', 'size', 'number-words', 'sequence']).default('numbers'),
    /** sequence: gambar berurutan (siklus hidup, ringan → berat, …); diambil dengan urutan tetap. */
    items: z.array(specSchema).default([]),
    prompt: textSchema.optional(),
    say: textSchema.optional(),
    values: range(0, 1000).default([1, 10]),
    step: z.number().int().min(1).max(100).default(1),
    /** numbers: angka berurutan (true) atau acak tetapi diurutkan (false). */
    consecutive: z.boolean().default(false),
    count: range(3, 6).default([4, 5]),
    /** size: benda dari terkecil ke terbesar. */
    sizes: z.array(objectIdSchema).default(['semut', 'kucing', 'sapi', 'gajah']),
  }),
  generate(p, rng) {
    const k = between(rng, p.count);
    let ordered: { visual: Visual; say: string }[];
    let prompt: string;
    let say: string;
    let reteach: string;
    if (p.mode === 'sequence') {
      if (p.items.length < 3 || p.items.length < Math.min(k, 3)) reject('urutan kurang');
      const n = Math.min(k, p.items.length);
      const idx = rng.sample(seq(0, p.items.length - 1), n).sort((a, b) => a - b);
      ordered = idx.map((i) => ({ visual: specVisual(p.items[i]!), say: specSay(p.items[i]!) }));
      prompt = p.prompt ?? 'Urutkan gambarnya dari yang pertama.';
      say = p.say ?? `${prompt} Ketuk satu per satu.`;
      reteach = `Urutannya: ${ordered.map((x) => x.say).join(', lalu ')}.`;
    } else if (p.mode === 'size') {
      if (p.sizes.length < k) reject('benda kurang');
      const idx = rng.sample(seq(0, p.sizes.length - 1), k).sort((a, b) => a - b);
      ordered = idx.map((i) => ({
        visual: { kind: 'object', object: p.sizes[i]! },
        say: OBJECTS[p.sizes[i]!].say,
      }));
      prompt = 'Urutkan dari yang paling kecil sampai paling besar.';
      say =
        'Naikkan ke bianglala dari yang paling kecil sampai yang paling besar. Ketuk satu per satu.';
      reteach = `Dari kecil ke besar: ${ordered.map((x) => x.say).join(', ')}.`;
    } else {
      const pool = seq(p.values[0], p.values[1], p.step);
      if (pool.length < k) reject('angka kurang');
      let nums: number[];
      if (p.mode === 'countdown' || p.consecutive) {
        const at = rng.int(0, pool.length - k);
        nums = pool.slice(at, at + k);
      } else nums = rng.sample(pool, k).sort((a, b) => a - b);
      if (p.mode === 'countdown') nums.reverse();
      const en = [
        'zero',
        'one',
        'two',
        'three',
        'four',
        'five',
        'six',
        'seven',
        'eight',
        'nine',
        'ten',
      ];
      ordered = nums.map((n) =>
        p.mode === 'number-words'
          ? {
              visual: { kind: 'word', text: (en[n] ?? reject('kata bilangan 0–10')).toUpperCase() },
              say: en[n]!,
            }
          : { visual: { kind: 'numeral', value: n }, say: numberWord(n) },
      );
      if (p.mode === 'countdown') {
        prompt = 'Hitung mundur supaya roket meluncur! Ketuk dari angka terbesar.';
        say = `Roket siap meluncur! Hitung mundur dari ${numberWord(nums[0]!)}. Ketuk angkanya dari yang terbesar.`;
        reteach = `Hitung mundur: ${nums.map(numberWord).join(', ')}. Meluncur!`;
      } else {
        prompt = 'Urutkan dari yang paling kecil.';
        say =
          p.mode === 'number-words'
            ? 'Naikkan kata bilangan ke bianglala dari yang paling kecil. Ketuk satu per satu.'
            : 'Naikkan angka ke bianglala dari yang paling kecil. Ketuk satu per satu.';
        reteach = `Dari kecil ke besar: ${ordered.map((x) => x.say).join(', ')}.`;
      }
    }
    const withIds = ordered.map((x, i) => ({ id: `o${i}`, ...x }));
    let shown = rng.shuffle(withIds);
    if (shown.every((x, i) => x.id === `o${i}`)) shown = [...shown.slice(1), shown[0]!];
    return {
      prompt,
      say,
      stimulus: [],
      interaction: {
        type: 'order',
        choices: shown,
        answer: withIds.map((x) => x.id),
        style: p.style,
      },
      reteach: { say: reteach },
    };
  },
});

// ------------------------------------------------------------ beri makan kucing

export const feedGame = defineFamily({
  description:
    'Beri makan hewan (kucing–ikan, kelinci–wortel, …): masukkan tepat n makanan ke mangkuk (membilang, tambah, satu lebih/kurang).',
  params: z.strictObject({
    mode: z.enum(['count', 'add', 'more', 'less']).default('count'),
    target: range(1, 20).default([1, 5]),
    /** add: bagian pertama. */
    first: range(1, 10).default([1, 3]),
    /** Hewan dan makanannya (dipilih acak per soal). */
    meals: z
      .array(z.strictObject({ eater: objectIdSchema, food: objectIdSchema }))
      .min(1)
      .default([{ eater: 'kucing', food: 'ikan' }]),
    /** Makanan di persediaan melebihi target. */
    extra: z.number().int().min(1).max(10).default(3),
  }),
  generate(p, rng) {
    const meal = rng.pick(p.meals);
    const who = OBJECTS[meal.eater].say;
    const Who = `${who[0]!.toUpperCase()}${who.slice(1)}`;
    const noun = OBJECTS[meal.food].say;
    let target: number;
    let prompt: string;
    let say: string;
    let reteach: string;
    let stimulus: Visual[] = [];
    if (p.mode === 'add') {
      const a = between(rng, p.first);
      const total = between(rng, p.target);
      const b = total - a;
      if (b < 1) reject('bagian kedua < 1');
      target = total;
      stimulus = [{ kind: 'equation', left: a, op: '+', right: b }];
      prompt = `${Who} makan ${a} ${noun}, lalu ${b} lagi. Beri semua ${noun}nya.`;
      say = `${Who} makan ${numberWord(a)} ${noun}, lalu ${numberWord(b)} lagi. Masukkan semua ${noun} ke mangkuk, lalu tekan Selesai.`;
      reteach = `${numberWord(a)} ditambah ${numberWord(b)} sama dengan ${numberWord(total)}.`;
    } else if (p.mode === 'more' || p.mode === 'less') {
      const n = between(rng, p.target);
      target = p.mode === 'more' ? n + 1 : n - 1;
      if (target < 1) reject('target < 1');
      stimulus = [{ kind: 'numeral', value: n }];
      const word = p.mode === 'more' ? 'satu lebih banyak dari' : 'satu lebih sedikit dari';
      prompt = `${Who} mau ${noun} ${word} ${n}.`;
      say = `${Who} mau ${noun} ${word} ${numberWord(n)}. Masukkan ke mangkuk, lalu tekan Selesai.`;
      reteach = `${word[0]!.toUpperCase()}${word.slice(1)} ${numberWord(n)} adalah ${numberWord(target)}.`;
    } else {
      target = between(rng, p.target);
      prompt = `${Who} lapar! Beri ${target} ${noun}.`;
      say = `${Who} lapar! Masukkan ${numberWord(target)} ${noun} ke mangkuk, lalu tekan Selesai.`;
      reteach = `Hitung sambil memasukkan: ${seq(1, target).map(numberWord).join(', ')}.`;
    }
    return {
      prompt,
      say,
      stimulus,
      interaction: {
        type: 'build',
        target,
        unit: 'object',
        object: meal.food,
        max: Math.min(20, target + p.extra),
        style: 'feed',
        eater: meal.eater,
      },
      reteach: { say: reteach },
    };
  },
});

// ------------------------------------------------------------ labirin bertema

export const mazeGame = defineFamily({
  description:
    'Labirin bertema (traktor, astronot, kucing, kodok): lewati urutan angka/huruf/gambar dari JSON sampai pintu keluar.',
  params: z.strictObject({
    walker: objectIdSchema.default('traktor'),
    goal: specSchema.default({ object: 'rumah' }),
    /** Urutan tanda di jalan keluar (diambil berurutan dari awal). */
    marks: z.array(specSchema).min(2).max(6),
    /** Banyak tanda yang dipakai (dari awal daftar). */
    use: range(2, 6).default([3, 4]),
    decoys: z.array(specSchema).default([]),
    decoyCount: range(0, 4).default([0, 2]),
    cols: range(3, 5).default([4, 4]),
    rows: range(3, 6).default([4, 4]),
    /** Kalimat soal: "{walker} pergi ke {goal} lewat {list}." */
    prompt: textSchema.optional(),
    maxSlips: slipsSchema(8),
  }),
  generate(p, rng) {
    const cols = between(rng, p.cols);
    const rows = between(rng, p.rows);
    const walls = carveMaze(rng, cols, rows);
    const start = rng.int(0, rows - 1) * cols;
    const goal = rng.int(0, rows - 1) * cols + cols - 1;
    const grid = { cols, rows, walls, start, goal };
    const path = mazePath(grid, start, goal);
    const use = Math.min(between(rng, p.use), p.marks.length);
    const seqMarks = p.marks.slice(0, use);
    if (path.length - 1 < use) reject('jalan keluar terlalu pendek');
    const asMark = (s: Spec) => ({
      text: s.numeral !== undefined ? String(s.numeral) : (s.word ?? ''),
      say: specSay(s),
      ...(s.numeral === undefined && s.word === undefined && { visual: specVisual(s) }),
    });
    const marks: { cell: number; text: string; say: string; decoy?: boolean; visual?: Visual }[] =
      seqMarks.map((s, j) => ({
        cell: path[Math.round(((j + 1) * (path.length - 1)) / use)]!,
        ...asMark(s),
      }));
    if (new Set(marks.map((m) => m.cell)).size !== marks.length) reject('tanda bertumpuk');
    const ends = rng.shuffle(mazeDeadEnds(grid).filter((c) => !path.includes(c)));
    const nDecoys = Math.min(between(rng, p.decoyCount), ends.length, p.decoys.length);
    rng
      .sample(p.decoys, nDecoys)
      .forEach((s, i) => marks.push({ cell: ends[i]!, ...asMark(s), decoy: true }));
    const walker = OBJECTS[p.walker].say;
    const goalSay = specSay(p.goal);
    const list = seqMarks.map(specSay);
    return {
      prompt: fill(p.prompt ?? 'Bantu {walker} ke {goal} lewat {list}.', {
        walker,
        goal: goalSay,
        list: list.join(', '),
      }),
      say: `Bantu ${walker} pergi ke ${goalSay}. Lewati ${list.slice(0, -1).join(', ')}${list.length > 1 ? ', lalu ' : ''}${list.at(-1)}. Ketuk kotak jalannya.`,
      stimulus: [],
      interaction: {
        type: 'maze',
        ...grid,
        marks,
        maxSlips: p.maxSlips,
        walker: p.walker,
        goalVisual: specVisual(p.goal),
      },
      reteach: {
        say: `Cari ${list[0]} dulu, lalu ${list.slice(1).join(', lalu ')}. Kotak bergaris tebal adalah dinding.`,
      },
    };
  },
});

// ------------------------------------------------------------ cari kata (data)

export const wordHunt = defineFamily({
  description: 'Cari kata bergambar dari daftar JSON (Indonesia atau English).',
  params: z.strictObject({
    words: z
      .array(z.strictObject({ text: z.string().regex(/^[A-Z]{2,5}$/), picture: specSchema }))
      .min(2),
    count: range(1, 4).default([2, 3]),
    size: range(4, 5).default([5, 5]),
    maxSlips: slipsSchema(8),
  }),
  generate(p, rng) {
    const size = between(rng, p.size);
    const pool = p.words.filter((w) => w.text.length <= size);
    const k = Math.min(between(rng, p.count), pool.length);
    if (k < 1) reject('kata tidak muat');
    const picked = rng.sample(pool, k);
    const built = buildWordSearch(
      rng,
      size,
      size,
      picked.map((w) => w.text),
    );
    if (!built) reject('kata tidak muat di kotak');
    const words = built!.placed.map((pl, i) => ({
      id: `w${i}`,
      text: pl.text,
      cells: pl.cells,
      visual: specVisual(picked[i]!.picture),
      say: picked[i]!.picture.say ?? picked[i]!.text.toLowerCase(),
    }));
    const names = words.map((w) => w.say);
    return {
      prompt: `Cari kata ${join(picked.map((w) => w.text))}.`,
      say: `Cari kata ${join(names)} di kotak huruf. Ketuk hurufnya berurutan, mulai dari huruf pertama.`,
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
        say: `Cari huruf pertamanya dulu, ${picked[0]!.text[0]}. Lalu lihat ke kanan atau ke bawah.`,
      },
    };
  },
});
