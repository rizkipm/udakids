import { z } from 'zod';
import { OBJECTS, type ObjectId } from '../assets.js';
import type { Choice, Visual } from '../item.js';
import { BINGO_LINES, guessBudget, linesCounts, stackSolution } from '../play-g4.js';
import { numberWord, rupiahWord } from '../words.js';
import { between, defineFamily, objectIdSchema, range, reject } from './common.js';

/**
 * Game Kelas 4 (D-096): Tebak Angka Momo, Diagram Ajaib, Penyihir Hitung, Tumpuk Angka, Garis Perkalian, dan
 * Bingo Rupiah. Versi sendiri (bukan salinan platform lain), tanpa hitung mundur, nyawa, atau streak.
 */

/** 12.500 (titik ribuan, tanpa Intl agar sama di semua perangkat). */
export const dotted = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const rp = (n: number) => `Rp${dotted(n)}`;

// ------------------------------------------------------------ Tebak Angka Momo

export const guessGame = defineFamily({
  description:
    'Tebak Angka Momo: tebak bilangan rahasia dengan petunjuk lebih besar/lebih kecil (bilangan utuh atau per nilai tempat).',
  params: z.strictObject({
    range: range(0, 999999).default([1, 100]),
    /** `digit`: petunjuk per nilai tempat; rentang harus penuh (mis. 1000–9999). */
    hint: z.enum(['number', 'digit']).default('number'),
  }),
  generate(p, rng) {
    const [min, max] = p.range;
    if (max - min < 9) reject('rentang terlalu sempit');
    const digits = String(max).length;
    if (p.hint === 'digit' && (min !== 10 ** (digits - 1) || max !== 10 ** digits - 1))
      reject('mode nilai tempat butuh rentang penuh');
    const secret = rng.int(min, max);
    const maxGuesses = guessBudget(min, max, p.hint);
    const prompt =
      p.hint === 'digit'
        ? `Momo menyimpan bilangan rahasia ${digits} angka. Tebak! Momo memberi petunjuk untuk setiap nilai tempat.`
        : `Momo menyimpan bilangan rahasia dari ${dotted(min)} sampai ${dotted(max)}. Tebak bilangannya!`;
    const say =
      p.hint === 'digit'
        ? `Momo menyimpan bilangan rahasia ${numberWord(digits)} angka. Putar setiap angka, lalu tekan Tebak. Momo memberi petunjuk untuk setiap nilai tempat.`
        : `Momo menyimpan bilangan rahasia dari ${numberWord(min)} sampai ${numberWord(max)}. Putar angkanya, lalu tekan Tebak.`;
    return {
      prompt,
      say,
      stimulus: [],
      interaction: { type: 'guess', min, max, secret, hint: p.hint, digits, maxGuesses },
      reteach: {
        say:
          p.hint === 'digit'
            ? 'Lihat petunjuk setiap nilai tempat. Angka yang sudah tepat jangan diubah. Kalau Momo bilang lebih besar, naikkan angkanya; kalau lebih kecil, turunkan.'
            : 'Mulailah dari tengah rentang. Kalau Momo bilang lebih besar, tebak di atasnya; kalau lebih kecil, tebak di bawahnya.',
      },
    };
  },
});

// ------------------------------------------------------------ Diagram Ajaib

export const chartGame = defineFamily({
  description:
    'Diagram Ajaib: atur tinggi batang diagram sesuai tabel data (satu kotak bisa bernilai 1, 2, 5, 10, …).',
  params: z.strictObject({
    title: z.string().trim().min(3).max(60).default('Buah kesukaan teman sekelas'),
    unit: z.string().trim().min(1).max(14).default('anak'),
    scale: z.number().int().min(1).max(1000).default(1),
    /** Tinggi batang dalam kotak. */
    steps: range(0, 10).default([1, 8]),
    items: z
      .array(
        z.strictObject({
          label: z.string().trim().min(1).max(14),
          object: objectIdSchema.optional(),
        }),
      )
      .min(3)
      .max(5)
      .default([
        { label: 'apel', object: 'apel' },
        { label: 'pisang', object: 'pisang' },
        { label: 'jeruk', object: 'jeruk' },
        { label: 'mangga', object: 'mangga' },
      ]),
  }),
  generate(p, rng) {
    const values = p.items.map(() => between(rng, p.steps) * p.scale);
    if (new Set(values).size < Math.min(3, values.length)) reject('nilai batang terlalu mirip');
    const bars = p.items.map((it, i) => ({
      id: `b${i}`,
      label: it.label,
      value: values[i]!,
      visual: (it.object
        ? { kind: 'object', object: it.object }
        : { kind: 'word', text: it.label }) as Visual,
      say: it.label,
    }));
    const unitSay = p.scale === 1 ? '' : ` Satu kotak bernilai ${numberWord(p.scale)}.`;
    const first = bars[0]!;
    return {
      prompt: `${p.title}. Buat diagram batang sesuai tabel.${p.scale === 1 ? '' : ` Satu kotak = ${dotted(p.scale)} ${p.unit}.`}`,
      say: `${p.title}. Atur tinggi setiap batang sesuai tabel, lalu tekan Selesai.${unitSay}`,
      stimulus: [],
      interaction: {
        type: 'chart',
        title: p.title,
        unit: p.unit,
        scale: p.scale,
        steps: Math.max(...values.map((v) => v / p.scale), 5),
        bars,
      },
      reteach: {
        say: `Baca tabelnya satu per satu. ${first.label} ada ${numberWord(first.value)} ${p.unit}${p.scale === 1 ? '' : `, karena satu kotak ${numberWord(p.scale)}, batangnya ${numberWord(first.value / p.scale)} kotak`}.`,
      },
    };
  },
});

// ------------------------------------------------------------ Penyihir Hitung

const OP_SAY = { '×': 'kali', ':': 'dibagi' } as const;

export const magicGame = defineFamily({
  description:
    'Penyihir Hitung: rangkaian fakta perkalian/pembagian; setiap beberapa jawaban tepat satu bintang mantra menyala.',
  params: z.strictObject({
    op: z.enum(['×', ':', 'campur']).default('×'),
    /** Tabel perkalian yang dipakai (faktor pertama / pembagi). */
    tables: z.array(z.number().int().min(1).max(12)).min(1).max(12).default([2, 3, 4, 5]),
    factor: range(0, 12).default([1, 10]),
    count: z.number().int().min(3).max(10).default(6),
    starEvery: z.number().int().min(1).max(5).default(3),
  }),
  generate(p, rng) {
    const facts: { id: string; text: string; say: string; answer: string; choices: Choice[] }[] =
      [];
    const seen = new Set<string>();
    for (let tries = 0; facts.length < p.count && tries < 200; tries++) {
      const t = rng.pick(p.tables);
      const f = between(rng, p.factor);
      const op = p.op === 'campur' ? rng.pick(['×', ':'] as const) : p.op;
      if (op === ':' && t === 0) continue;
      const [a, b, ans] = op === '×' ? [t, f, t * f] : [t * f, t, f];
      const key = `${a}${op}${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const id = `f${facts.length}`;
      const wrong = new Set<number>();
      for (const d of [ans + b, ans - b, ans + 1, ans - 1, ans + 10, ans + 2, a + b])
        if (d >= 0 && d !== ans && wrong.size < 3) wrong.add(d);
      const values = rng.shuffle([ans, ...wrong]);
      const choices = values.map((v, k) => ({
        id: `c${k}`,
        visual: { kind: 'numeral', value: v } as Visual,
        say: numberWord(v),
      }));
      facts.push({
        id,
        text: `${a} ${op} ${b} = …`,
        say: `${numberWord(a)} ${OP_SAY[op]} ${numberWord(b)}`,
        answer: choices[values.indexOf(ans)]!.id,
        choices,
      });
    }
    if (facts.length < p.count) reject('fakta tidak cukup');
    return {
      prompt: 'Penyihir Momo butuh mantra! Jawab setiap soal hitung untuk menyalakan bintang.',
      say: 'Penyihir Momo butuh mantra. Ketuk jawaban yang tepat untuk setiap soal hitung.',
      stimulus: [],
      interaction: { type: 'magic', facts, starEvery: p.starEvery },
      reteach: {
        say: 'Ingat fakta perkalian. Pembagian adalah kebalikan perkalian: kalau tiga kali empat dua belas, maka dua belas dibagi tiga sama dengan empat.',
      },
    };
  },
});

// ------------------------------------------------------------ Tumpuk Angka

export const stackGame = defineFamily({
  description:
    'Tumpuk Angka: pilih balok bilangan (masing-masing sekali) sampai jumlah atau hasil kalinya sama dengan target.',
  params: z.strictObject({
    op: z.enum(['+', '×']).default('+'),
    values: range(1, 100000).default([10, 99]),
    /** Kelipatan nilai balok (mis. 100). */
    step: z.number().int().min(1).max(10000).default(1),
    /** Banyak balok di jawaban. */
    pick: range(2, 4).default([2, 3]),
    blocks: z.number().int().min(4).max(8).default(6),
  }),
  generate(p, rng) {
    const pool: number[] = [];
    for (let v = Math.ceil(p.values[0] / p.step) * p.step; v <= p.values[1]; v += p.step)
      pool.push(v);
    if (pool.length < p.blocks) reject('nilai balok terlalu sedikit');
    const values = rng.sample(pool, p.blocks);
    const k = between(rng, p.pick);
    const solution = values.slice(0, k);
    const target = solution.reduce(
      (acc, v) => (p.op === '+' ? acc + v : acc * v),
      p.op === '+' ? 0 : 1,
    );
    if (target > 1_000_000) reject('target terlalu besar');
    const blocks = rng.shuffle(values).map((v, i) => ({
      id: `k${i}`,
      value: v,
      visual: { kind: 'word', text: dotted(v) } as Visual,
      say: numberWord(v),
    }));
    if (!stackSolution(p.op, blocks, target, 4)) reject('tidak ada tumpukan ≤ 4 balok');
    const what = p.op === '+' ? 'jumlahnya' : 'hasil kalinya';
    return {
      prompt: `Tumpuk balok angka sampai ${what} ${dotted(target)}.`,
      say: `Tumpuk balok angka sampai ${what} ${numberWord(target)}. Ketuk balok, lalu tekan Selesai.`,
      stimulus: [],
      interaction: { type: 'stack', op: p.op, target, blocks, maxBlocks: 4 },
      reteach: {
        say:
          p.op === '+'
            ? `Targetnya ${numberWord(target)}. Pilih satu balok besar dulu, lalu cari sisanya: target dikurangi balok itu.`
            : `Targetnya ${numberWord(target)}. Cari balok yang membagi habis target, lalu cari pasangannya.`,
      },
    };
  },
});

// ------------------------------------------------------------ Garis Perkalian

export const linesGame = defineFamily({
  description:
    'Garis Perkalian: a × b digambar sebagai garis berpotongan; hitung titik potong ratusan, puluhan, dan satuan.',
  params: z.strictObject({
    a: range(1, 99).default([11, 23]),
    b: range(1, 99).default([11, 23]),
  }),
  generate(p, rng) {
    const a = between(rng, p.a);
    const b = between(rng, p.b);
    const zeroDigit = (n: number) => n >= 10 && (n % 10 === 0 || Math.floor(n / 10) === 0);
    if (zeroDigit(a) || zeroDigit(b)) reject('angka nol tidak punya garis');
    if (a < 10 && b < 10) reject('minimal satu bilangan dua angka');
    const c = linesCounts(a, b);
    if (c.ratusan > 9 || c.puluhan > 9 || c.satuan > 9) reject('ada kelompok ≥ 10 (menyimpan)');
    return {
      prompt: `Hitung ${a} × ${b} dengan garis. Isi banyak titik potong ratusan, puluhan, dan satuan.`,
      say: `Hitung ${numberWord(a)} kali ${numberWord(b)} dengan garis. Hitung titik potong di setiap kelompok, lalu tekan Selesai.`,
      stimulus: [],
      interaction: { type: 'lines', a, b },
      reteach: {
        say: `Ratusan ${numberWord(c.ratusan)}, puluhan ${numberWord(c.puluhan)}, satuan ${numberWord(c.satuan)}. Jadi ${numberWord(a)} kali ${numberWord(b)} sama dengan ${numberWord(a * b)}.`,
      },
    };
  },
});

// ------------------------------------------------------------ Bingo Rupiah

const SHOP_OBJECTS: ObjectId[] = [
  'buku',
  'pensil',
  'penggaris',
  'penghapus',
  'krayon',
  'roti-lapis',
  'es-krim',
  'tas',
];
const PAY_NOTES = [5000, 10000, 20000, 50000, 100000];
const BINGO_TIPS = {
  jumlah: 'Jumlah: tambahkan harga semua barang.',
  kembalian: 'Kembalian: uang yang dibayar dikurangi harga.',
  kali: 'Beberapa barang sama: kalikan harga satu barang dengan banyaknya.',
} as const;

export const bingoGame = defineFamily({
  description:
    'Bingo Rupiah: kartu 3×3 nominal Rupiah; dengarkan soal belanja (jumlah, kembalian, harga beberapa barang) lalu ketuk nominal yang pas.',
  params: z.strictObject({
    kinds: z
      .array(z.enum(['jumlah', 'kembalian', 'kali']))
      .min(1)
      .default(['jumlah', 'kembalian', 'kali']),
    price: range(100, 100000).default([1000, 9000]),
    step: z.number().int().min(100).max(10000).default(500),
    objects: z.array(objectIdSchema).min(2).default(SHOP_OBJECTS),
  }),
  generate(p, rng) {
    const prices: number[] = [];
    for (let v = Math.ceil(p.price[0] / p.step) * p.step; v <= p.price[1]; v += p.step)
      prices.push(v);
    if (prices.length < 3) reject('rentang harga terlalu sempit');
    const noun = (o: ObjectId) => OBJECTS[o].say;
    const calls: { id: string; text: string; say: string; value: number }[] = [];
    const used = new Set<number>();
    for (let tries = 0; calls.length < 3 && tries < 60; tries++) {
      const kind = rng.pick(p.kinds);
      const [o1, o2] = rng.sample(p.objects, 2) as [ObjectId, ObjectId];
      const x = rng.pick(prices);
      let text: string;
      let say: string;
      let value: number;
      if (kind === 'jumlah') {
        const y = rng.pick(prices);
        value = x + y;
        text = `${noun(o1)} ${rp(x)} dan ${noun(o2)} ${rp(y)}. Berapa jumlahnya?`;
        say = `Momo membeli ${noun(o1)} ${rupiahWord(x)} dan ${noun(o2)} ${rupiahWord(y)}. Berapa jumlahnya?`;
      } else if (kind === 'kembalian') {
        const pay = PAY_NOTES.find((n) => n > x);
        if (!pay) continue;
        value = pay - x;
        text = `Harga ${noun(o1)} ${rp(x)}, dibayar ${rp(pay)}. Berapa kembaliannya?`;
        say = `Harga ${noun(o1)} ${rupiahWord(x)}. Momo membayar ${rupiahWord(pay)}. Berapa kembaliannya?`;
      } else {
        const n = rng.int(2, 4);
        value = n * x;
        text = `${n} ${noun(o1)}, masing-masing ${rp(x)}. Berapa harga semuanya?`;
        say = `Momo membeli ${numberWord(n)} ${noun(o1)}, masing-masing ${rupiahWord(x)}. Berapa harga semuanya?`;
      }
      if (used.has(value)) continue;
      used.add(value);
      calls.push({ id: `p${calls.length}`, text, say, value });
    }
    if (calls.length < 3) reject('panggilan tidak cukup');
    // Sel lain: nominal dekat jawaban (selisih 500/1.000) supaya anak benar-benar menghitung.
    const others = new Set<number>();
    for (let tries = 0; others.size < 6 && tries < 200; tries++) {
      const base = rng.pick(calls).value;
      const v = base + rng.pick([-2, -1, 1, 2]) * p.step;
      if (v > 0 && !used.has(v)) others.add(v);
    }
    if (others.size < 6) reject('nominal pengecoh tidak cukup');
    const line = rng.pick(BINGO_LINES);
    const rest = rng.shuffle([...others]);
    const values: number[] = [];
    for (let i = 0, r = 0; i < 9; i++) {
      const k = line.indexOf(i as never);
      values.push(k >= 0 ? calls[k]!.value : rest[r++]!);
    }
    const cells = values.map((v, i) => ({
      id: `s${i}`,
      value: v,
      visual: { kind: 'word', text: rp(v) } as Visual,
      say: rupiahWord(v),
    }));
    const order = rng.shuffle([0, 1, 2]);
    return {
      prompt:
        'Bingo Rupiah! Dengarkan soal belanja, lalu ketuk uang yang pas. Lengkapi satu garis.',
      say: 'Bingo Rupiah. Dengarkan soal belanja, lalu ketuk uang yang pas di kartu.',
      stimulus: [],
      interaction: {
        type: 'bingo',
        cells,
        calls: order.map((k) => ({
          id: calls[k]!.id,
          text: calls[k]!.text,
          say: calls[k]!.say,
          answer: `s${line[k]}`,
        })),
      },
      reteach: {
        say: p.kinds
          .map((k) => BINGO_TIPS[k])
          .filter((x, i, a) => a.indexOf(x) === i)
          .join(' '),
      },
    };
  },
});
