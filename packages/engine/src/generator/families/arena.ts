import { z } from 'zod';
import type { Choice, QuestRound, Visual } from '../item.js';
import { TENS_PLACES, isPrime, roundTo, type TensPlace } from '../play-arena.js';
import type { Rng } from '../rng.js';
import { numberWord } from '../words.js';
import { between, defineFamily, range, reject } from './common.js';
import { dotted } from './kelas4.js';

/**
 * Arena game Momo (D-115): game baru per jenjang (PAUD–Kelas 4) — versi sendiri yang berwarna, tanpa hitung
 * mundur, nyawa, atau streak. Setiap kalimat yang diucapkan ikut di soal (dibacakan suara Momo dari server).
 */

const nw = numberWord;
const numeral = (v: number): Choice => ({
  id: `n${v}`,
  visual: { kind: 'numeral', value: v },
  say: nw(v),
});

/** Jawaban + pengecoh terdekat (≥ `min`), diacak. */
function nearChoices(rng: Rng, answer: number, count = 3, min = 0): Choice[] {
  const set = new Set([answer]);
  for (const d of rng.shuffle([1, -1, 2, -2, 3])) {
    if (set.size >= count) break;
    if (answer + d >= min) set.add(answer + d);
  }
  if (set.size < count) reject('pengecoh tidak cukup');
  return rng.shuffle([...set]).map(numeral);
}

/** n ronde unik berdasarkan kunci (mencoba ulang beberapa kali). */
function rounds(
  rng: Rng,
  n: number,
  make: (i: number) => Omit<QuestRound, 'id'> & { key: string },
): QuestRound[] {
  const out: QuestRound[] = [];
  const keys = new Set<string>();
  for (let tries = 0; out.length < n && tries < n * 30; tries++) {
    const { key, ...r } = make(out.length);
    if (keys.has(key)) continue;
    keys.add(key);
    out.push({ id: `r${out.length}`, ...r });
  }
  if (out.length < n) reject('ronde unik tidak cukup');
  return out;
}

const roundsParam = z.tuple([z.number().int().min(2), z.number().int().max(6)]).default([4, 4]);

const ruleSay = (text: string) =>
  text.replace(/\d+(\.\d{3})*/g, (d) => nw(Number(d.replace(/\./g, ''))));

// ------------------------------------------------------------ Balap angka (mobil / perahu)

const RACE_RULES = [
  'more',
  'less',
  'largest',
  'smallest',
  'greater',
  'lessThan',
  'even',
  'odd',
  'multiple',
  'prime',
  'factor',
] as const;

export const raceGame = defineFamily({
  description:
    'Balap angka: setiap ronde ketuk bilangan/kelompok yang memenuhi aturan (lebih banyak, genap, kelipatan, prima, …); mobil atau perahu Momo maju sampai garis finis.',
  params: z.strictObject({
    theme: z.enum(['race', 'boat']).default('race'),
    rule: z.enum(RACE_RULES),
    range: range(0, 1_000_000).default([1, 10]),
    /** Pembagi untuk `multiple` (kelipatan k). */
    k: z.array(z.number().int().min(2).max(20)).min(1).default([2]),
    rounds: roundsParam,
    /** PAUD/TK: pertanyaan hanya dibacakan, tidak ditulis. */
    textless: z.boolean().default(false),
  }),
  generate(p, rng) {
    const [lo, hi] = p.range;
    const pickWhere = (ok: (v: number) => boolean, avoid: Set<number>) => {
      for (let t = 0; t < 200; t++) {
        const v = rng.int(lo, hi);
        if (ok(v) && !avoid.has(v)) return v;
      }
      return reject('bilangan untuk aturan tidak ditemukan');
    };
    /** Satu jawaban yang memenuhi `ok`, dua pengecoh yang tidak. */
    const oneOf = (ok: (v: number) => boolean) => {
      const used = new Set<number>();
      const a = pickWhere(ok, used);
      used.add(a);
      const d1 = pickWhere((v) => !ok(v), used);
      used.add(d1);
      const d2 = pickWhere((v) => !ok(v), used);
      return { answer: a, values: rng.shuffle([a, d1, d2]) };
    };
    const list = rounds(rng, between(rng, p.rounds), () => {
      let text: string;
      let answer: number;
      let choices: Choice[];
      if (p.rule === 'more' || p.rule === 'less') {
        const a = rng.int(Math.max(1, lo), hi);
        let b = rng.int(Math.max(1, lo), hi);
        for (let t = 0; b === a && t < 50; t++) b = rng.int(Math.max(1, lo), hi);
        if (a === b) reject('dua kelompok sama banyak');
        answer = p.rule === 'more' ? Math.max(a, b) : Math.min(a, b);
        choices = rng.shuffle([a, b]).map((v) => ({
          id: `g${v}`,
          visual: { kind: 'dots', count: v, layout: 'scatter' } as Visual,
          say: nw(v),
        }));
        text = `Ketuk kelompok yang ${p.rule === 'more' ? 'lebih banyak' : 'lebih sedikit'}.`;
        return { key: `${a}-${b}`, text, say: text, answer: `g${answer}`, choices };
      }
      let r: { answer: number; values: number[] };
      switch (p.rule) {
        case 'largest':
        case 'smallest': {
          const vs = new Set<number>();
          while (vs.size < 3) vs.add(rng.int(lo, hi));
          const values = rng.shuffle([...vs]);
          r = {
            answer: p.rule === 'largest' ? Math.max(...values) : Math.min(...values),
            values,
          };
          text = `Ketuk bilangan yang paling ${p.rule === 'largest' ? 'besar' : 'kecil'}.`;
          break;
        }
        case 'greater':
        case 'lessThan': {
          const x = rng.int(lo + 2, hi - 2);
          r = oneOf((v) => (p.rule === 'greater' ? v > x : v < x));
          text = `Ketuk bilangan yang lebih ${p.rule === 'greater' ? 'besar' : 'kecil'} dari ${dotted(x)}.`;
          break;
        }
        case 'even':
        case 'odd':
          r = oneOf((v) => v % 2 === (p.rule === 'even' ? 0 : 1));
          text = `Ketuk bilangan ${p.rule === 'even' ? 'genap' : 'ganjil'}.`;
          break;
        case 'multiple': {
          const k = rng.pick(p.k);
          r = oneOf((v) => v % k === 0);
          text = `Ketuk kelipatan ${k}.`;
          break;
        }
        case 'prime':
          // Pengecoh ganjil bukan prima, supaya tidak cukup melihat genap/ganjil.
          r = oneOf(isPrime);
          if (r.values.some((v) => v !== r.answer && v % 2 === 0 && v > 2)) {
            const used = new Set([r.answer]);
            const odd = (v: number) => v % 2 === 1 && !isPrime(v) && v > 1;
            const d1 = pickWhere(odd, used);
            used.add(d1);
            r = { answer: r.answer, values: rng.shuffle([r.answer, d1, pickWhere(odd, used)]) };
          }
          text = 'Ketuk bilangan prima.';
          break;
        case 'factor': {
          const n = pickWhere((v) => v > 6 && !isPrime(v), new Set());
          const used = new Set([1, n]);
          const f = pickWhere((v) => v < n && n % v === 0, used);
          used.add(f);
          const notF = (v: number) => v < n && n % v !== 0;
          const d1 = pickWhere(notF, used);
          used.add(d1);
          r = { answer: f, values: rng.shuffle([f, d1, pickWhere(notF, used)]) };
          text = `Ketuk faktor dari ${dotted(n)}.`;
          break;
        }
      }
      choices = r.values.map(numeral);
      return {
        key: r.values.join(','),
        text,
        say: ruleSay(text),
        answer: `n${r.answer}`,
        choices,
      };
    }).map((r) => (p.textless ? { ...r, text: '' } : r));
    const say =
      p.theme === 'boat'
        ? 'Balap perahu! Ketuk jawaban yang tepat supaya perahu Momo sampai di garis finis.'
        : 'Balap mobil! Ketuk jawaban yang tepat supaya mobil Momo sampai di garis finis.';
    return {
      prompt: say,
      say,
      stimulus: [],
      interaction: { type: 'quest', theme: p.theme, rounds: list },
      reteach: { say: 'Dengarkan aturannya, lalu periksa setiap pilihan satu per satu.' },
    };
  },
});

// ------------------------------------------------------------ Dadu & domino

export const diceGame = defineFamily({
  description:
    'Lempar dadu / domino: lempar, hitung titiknya (jumlah atau hasil kali), lalu ketuk jawabannya; bidak Momo maju ke garis finis.',
  params: z.strictObject({
    theme: z.enum(['dice', 'domino']).default('dice'),
    dice: z.number().int().min(1).max(4).default(2),
    op: z.enum(['+', '×']).default('+'),
    /** Domino PAUD: jumlah titik paling banyak. */
    maxTotal: z.number().int().min(2).max(24).default(24),
    rounds: roundsParam,
    textless: z.boolean().default(false),
  }),
  generate(p, rng) {
    const n = p.theme === 'domino' ? 2 : p.dice;
    if (p.op === '×' && n !== 2) reject('hasil kali untuk dua dadu');
    const text =
      n === 1
        ? 'Ada berapa titik di dadu?'
        : p.op === '×'
          ? 'Berapa hasil kali titik kedua dadu?'
          : p.theme === 'domino'
            ? 'Berapa banyak titik di domino?'
            : 'Berapa jumlah titik semua dadu?';
    const list = rounds(rng, between(rng, p.rounds), () => {
      let dice: number[];
      let t = 0;
      do dice = Array.from({ length: n }, () => rng.int(1, 6));
      while (dice.reduce((a, b) => a + b, 0) > p.maxTotal && ++t < 100);
      const total = p.op === '×' ? dice[0]! * dice[1]! : dice.reduce((a, b) => a + b, 0);
      if (p.op === '+' && total > p.maxTotal) reject('titik terlalu banyak');
      return {
        key: [...dice].sort().join(','),
        text: p.textless ? '' : text,
        say: text,
        answer: `n${total}`,
        choices: nearChoices(rng, total, 3, 1),
        dice,
      };
    });
    const say =
      p.theme === 'domino'
        ? 'Kartu domino! Ketuk domino untuk membaliknya, hitung titiknya, lalu ketuk jawabannya.'
        : 'Lempar dadu! Ketuk dadunya, hitung titiknya, lalu ketuk jawabannya supaya bidak Momo maju.';
    return {
      prompt: say,
      say,
      stimulus: [],
      interaction: { type: 'quest', theme: p.theme, rounds: list },
      reteach: {
        say:
          p.op === '×'
            ? 'Kalikan banyak titik dadu pertama dengan dadu kedua.'
            : 'Hitung titik satu dadu, lalu lanjutkan menghitung titik dadu berikutnya.',
      },
    };
  },
});

// ------------------------------------------------------------ Tendang pembulatan

const UNIT_NAME: Record<number, string> = {
  10: 'puluhan',
  100: 'ratusan',
  1000: 'ribuan',
  10000: 'puluh ribuan',
};

export const kickGame = defineFamily({
  description:
    'Tendang pembulatan: bilangan di garis bilangan; tendang bola ke gawang kelipatan terdekat (puluhan, ratusan, ribuan).',
  params: z.strictObject({
    unit: z.union([z.literal(10), z.literal(100), z.literal(1000), z.literal(10000)]),
    range: range(1, 1_000_000).default([11, 99]),
    rounds: roundsParam,
  }),
  generate(p, rng) {
    const name = UNIT_NAME[p.unit]!;
    const list = rounds(rng, between(rng, p.rounds), () => {
      let v = rng.int(p.range[0], p.range[1]);
      if (v % p.unit === 0) v += rng.int(1, p.unit - 1);
      const lo = Math.floor(v / p.unit) * p.unit;
      const hi = lo + p.unit;
      const r = roundTo(v, p.unit);
      return {
        key: String(v),
        text: `Bulatkan ${dotted(v)} ke ${name} terdekat.`,
        say: `Bulatkan ${nw(v)} ke ${name} terdekat.`,
        answer: `n${r}`,
        choices: [numeral(lo), numeral(hi)],
        line: { lo, hi, value: v },
      };
    });
    const say = `Tendang penalti! Bulatkan bilangannya ke ${name} terdekat, lalu tendang bola ke gawang yang tepat.`;
    return {
      prompt: say,
      say,
      stimulus: [],
      interaction: { type: 'quest', theme: 'kick', rounds: list },
      reteach: {
        say: `Lihat angka di sebelah kanan tempat ${name}. Lima atau lebih dibulatkan ke atas, kurang dari lima ke bawah.`,
      },
    };
  },
});

// ------------------------------------------------------------ Hoki nilai tempat

const PLACE_NAME = [
  'satuan',
  'puluhan',
  'ratusan',
  'ribuan',
  'puluh ribuan',
  'ratus ribuan',
  'jutaan',
] as const;

export const hockeyGame = defineFamily({
  description:
    'Hoki nilai tempat: Momo menyebut nilai tempat (satuan, puluhan, …, jutaan); ketuk angka di tempat itu untuk menyodok keping ke gawang.',
  params: z.strictObject({
    digits: range(2, 7).default([3, 3]),
    rounds: roundsParam,
  }),
  generate(p, rng) {
    const list = rounds(rng, between(rng, p.rounds), (ri) => {
      const d = between(rng, p.digits);
      let n = 0;
      let places: number[] = [];
      // Tanya tempat yang angkanya tidak kembar, supaya tidak ada dua jawaban yang tampak sama.
      for (let t = 0; places.length === 0 && t < 50; t++) {
        n = rng.int(10 ** (d - 1), 10 ** d - 1);
        const ds = String(n);
        places = Array.from({ length: d }, (_, k) => k).filter(
          (k) => ds.split('').filter((c) => c === ds[d - 1 - k]).length === 1,
        );
      }
      if (places.length === 0) reject('angka kembar semua');
      const s = String(n);
      const k = rng.pick(places);
      const name = PLACE_NAME[k]!;
      return {
        key: `${n}`,
        text: `Ketuk angka di tempat ${name}.`,
        say: `${nw(n)}. Ketuk angka di tempat ${name}.`,
        answer: `r${ri}d${d - 1 - k}`,
        choices: s.split('').map((c, i) => ({
          // Id unik per ronde: suara kartu dicari lewat id (angka berbeda tiap ronde).
          id: `r${ri}d${i}`,
          visual: { kind: 'numeral', value: Number(c) } as Visual,
          say: nw(Number(c)),
        })),
        digits: s,
      };
    });
    const say = 'Hoki nilai tempat! Ketuk angka di tempat yang disebut Momo untuk mencetak gol.';
    return {
      prompt: say,
      say,
      stimulus: [],
      interaction: { type: 'quest', theme: 'hockey', rounds: list },
      reteach: {
        say: 'Mulai dari kanan: satuan, puluhan, ratusan, ribuan, puluh ribuan, ratus ribuan, jutaan.',
      },
    };
  },
});

// ------------------------------------------------------------ Pecahkan balon (mengurangi)

export const balloonGame = defineFamily({
  description:
    'Pecahkan balon: ada n balon, pecahkan k balon, lalu ketuk banyak balon yang tersisa (mengurangi dengan benda).',
  params: z.strictObject({
    n: range(2, 20).default([3, 5]),
    pop: range(1, 19).default([1, 3]),
    rounds: roundsParam,
    textless: z.boolean().default(false),
  }),
  generate(p, rng) {
    const list = rounds(rng, between(rng, p.rounds), () => {
      const n = between(rng, p.n);
      const k = Math.min(n - 1, between(rng, p.pop));
      if (k < 1) reject('minimal satu balon dipecahkan');
      const say = `Ada ${nw(n)} balon. Pecahkan ${nw(k)} balon, lalu ketuk banyak balon yang tersisa.`;
      return {
        key: `${n}-${k}`,
        text: p.textless ? '' : `${n} balon, pecahkan ${k}. Sisa berapa?`,
        say,
        answer: `n${n - k}`,
        choices: nearChoices(rng, n - k, 3, 0),
        balloons: { n, pop: k },
      };
    });
    const say =
      'Pecahkan balon! Dengarkan Momo, pecahkan balonnya, lalu hitung balon yang tersisa.';
    return {
      prompt: say,
      say,
      stimulus: [],
      interaction: { type: 'quest', theme: 'balloon', rounds: list },
      reteach: { say: 'Hitung balon yang masih melayang satu per satu.' },
    };
  },
});

// ------------------------------------------------------------ Gelembung / batu sungai

export const bubblesGame = defineFamily({
  description:
    'Gelembung angka / batu sungai: ketuk bilangan berurutan (loncat 1, 2, 5, 10, 100, …) mulai dari bilangan awal; bilangan lain adalah pengecoh.',
  params: z.strictObject({
    theme: z.enum(['bubble', 'stone']).default('bubble'),
    start: range(0, 1_000_000).default([1, 1]),
    step: z.array(z.number().int().min(1).max(10000)).min(1).default([1]),
    length: range(3, 10).default([5, 5]),
    decoys: range(0, 4).default([0, 0]),
    /** Loncat 2/5/10/…: mulai dari kelipatannya (false = mulai dari bilangan mana saja, mis. 7, 17, 27). */
    align: z.boolean().default(true),
  }),
  generate(p, rng) {
    const step = rng.pick(p.step);
    let start = between(rng, p.start);
    // Loncat 2/5/10/…: mulai dari kelipatannya supaya polanya mudah dikenali.
    if (p.align && step > 1 && p.start[0] !== p.start[1])
      start = Math.max(step, start - (start % step));
    const len = between(rng, p.length);
    const seq = Array.from({ length: len }, (_, i) => start + i * step);
    const decoys = new Set<number>();
    const want = between(rng, p.decoys);
    for (let t = 0; decoys.size < want && t < 200; t++) {
      const base = rng.pick(seq);
      const off = step === 1 ? rng.pick([len, len + 1, -1, -2]) : rng.int(1, step - 1);
      const v = step === 1 ? start + off : base + (rng.chance(0.5) ? off : -off);
      if (v >= 0 && !seq.includes(v)) decoys.add(v);
    }
    const bubbles = rng.shuffle([...seq, ...decoys]).map((v) => ({
      id: `b${v}`,
      visual: { kind: 'numeral', value: v } as Visual,
      say: nw(v),
    }));
    const what = p.theme === 'stone' ? 'Seberangi sungai! Injak batu' : 'Pecahkan gelembung';
    // Teks memakai angka (dibaca anak), suara memakai kata bilangan.
    const prompt = `${what} ${step === 1 ? 'berurutan' : `loncat ${dotted(step)}`} mulai dari ${dotted(start)}.`;
    const say = `${what} ${step === 1 ? 'berurutan' : `loncat ${nw(step)}`} mulai dari ${nw(start)}.`;
    return {
      prompt,
      say,
      stimulus: [],
      interaction: { type: 'bubbles', theme: p.theme, bubbles, answer: seq.map((v) => `b${v}`) },
      reteach: { say: `Urutannya ${seq.map(nw).join(', ')}.` },
    };
  },
});

// ------------------------------------------------------------ Papan angka kembang api

export const gridGame = defineFamily({
  description:
    'Papan angka: cari tempat bilangan yang disembunyikan (rumah angka / kembang api), atau ketuk semua kelipatan / bilangan prima di papan.',
  params: z.strictObject({
    theme: z.enum(['fireworks', 'house']).default('fireworks'),
    mode: z.enum(['find', 'multiples', 'primes']).default('find'),
    /** Sel pertama papan (diacak dalam rentang, dibulatkan ke awal baris). */
    start: range(0, 10000).default([1, 1]),
    count: z.number().int().min(10).max(30).default(20),
    cols: z.number().int().min(5).max(5).default(5),
    k: z.array(z.number().int().min(2).max(12)).min(1).default([5]),
    hidden: range(1, 4).default([3, 3]),
    textless: z.boolean().default(false),
  }),
  generate(p, rng) {
    let start = between(rng, p.start);
    start -= (start - p.start[0]) % p.cols;
    const cells = Array.from({ length: p.count }, (_, i) => start + i);
    const cell = (v: number) => `c${v}`;
    const what = p.theme === 'house' ? 'rumah' : 'kotak';
    if (p.mode === 'find') {
      const hidden = rng.sample(cells, between(rng, p.hidden));
      const calls = hidden.map((v, j) => ({
        id: `p${j}`,
        text: p.textless ? '' : `Di mana ${dotted(v)}?`,
        say: `Di mana ${what} angka ${nw(v)}?`,
        answer: cell(v),
      }));
      const say =
        p.theme === 'house'
          ? 'Rumah angka! Beberapa angka bersembunyi. Dengarkan Momo, lalu ketuk rumah angka itu.'
          : 'Kembang api angka! Dengarkan Momo, lalu ketuk kotak tempat angka yang bersembunyi.';
      return {
        prompt: say,
        say,
        stimulus: [],
        interaction: {
          type: 'grid',
          theme: p.theme,
          start,
          count: p.count,
          cols: p.cols,
          hidden,
          calls,
        },
        reteach: { say: 'Lihat angka sebelum dan sesudahnya, lalu hitung maju dari sana.' },
      };
    }
    const k = rng.pick(p.k);
    const ok = (v: number) => (p.mode === 'primes' ? isPrime(v) : v % k === 0);
    const targets = cells.filter(ok);
    if (targets.length < 3 || targets.length > 15) reject('sasaran papan 3–15');
    const prompt =
      p.mode === 'primes'
        ? 'Ketuk semua bilangan prima di papan.'
        : `Ketuk semua kelipatan ${k} di papan.`;
    const say =
      p.mode === 'primes'
        ? 'Kembang api prima! Ketuk semua bilangan prima di papan.'
        : `Kembang api kelipatan! Ketuk semua kelipatan ${nw(k)} di papan.`;
    return {
      prompt,
      say,
      stimulus: [],
      interaction: {
        type: 'grid',
        theme: p.theme,
        start,
        count: p.count,
        cols: p.cols,
        hidden: [],
        targets: targets.map(cell),
      },
      reteach: {
        say:
          p.mode === 'primes'
            ? 'Bilangan prima hanya habis dibagi satu dan dirinya sendiri. Satu bukan bilangan prima.'
            : `Kelipatan ${nw(k)}: ${targets.slice(0, 4).map(nw).join(', ')}, dan seterusnya.`,
      },
    };
  },
});

// ------------------------------------------------------------ Ular puluhan / balok nilai tempat

const PLACE_SAY: Record<TensPlace, string> = {
  ribu: 'ribuan',
  ratus: 'ratusan',
  puluh: 'puluhan',
  satu: 'satuan',
};

export const tensGame = defineFamily({
  description:
    'Ular puluhan / balok nilai tempat: susun bilangan dari ular 10 ruas + ruas satuan, atau balok ribuan, ratusan, puluhan, dan satuan.',
  params: z.strictObject({
    theme: z.enum(['snake', 'blocks']).default('snake'),
    target: range(1, 9999).default([11, 50]),
    places: z.array(z.enum(TENS_PLACES)).min(2).default(['puluh', 'satu']),
  }),
  generate(p, rng) {
    const places = TENS_PLACES.filter((x) => p.places.includes(x));
    const top = { ribu: 9999, ratus: 999, puluh: 99, satu: 9 }[places[0]!];
    const target = Math.min(top, between(rng, p.target));
    if (target < 1) reject('target minimal 1');
    const parts = places
      .map((pl) => ({
        pl,
        n: Math.floor(target / { ribu: 1000, ratus: 100, puluh: 10, satu: 1 }[pl]) % 10,
      }))
      .filter((x) => x.n > 0);
    const prompt =
      p.theme === 'snake'
        ? `Buat bilangan ${dotted(target)} dengan ular puluhan dan ruas satuan.`
        : `Susun balok untuk membuat bilangan ${dotted(target)}.`;
    const say =
      p.theme === 'snake'
        ? `Buat bilangan ${nw(target)} dengan ular sepuluh ruas dan ruas satuan.`
        : `Susun balok untuk membuat bilangan ${nw(target)}.`;
    return {
      prompt,
      say,
      stimulus: [],
      interaction: { type: 'tens', theme: p.theme, target, places },
      reteach: {
        say: `${nw(target)} adalah ${parts.map((x) => `${nw(x.n)} ${PLACE_SAY[x.pl]}`).join(', ')}.`,
      },
    };
  },
});

// ------------------------------------------------------------ Bersihkan papan

export const clearGame = defineFamily({
  description:
    'Bersihkan papan: ketuk dua kotak yang jumlahnya (atau hasil kalinya) sama dengan angka sasaran sampai papan kosong.',
  params: z.strictObject({
    theme: z.enum(['candy', 'stone']).default('candy'),
    op: z.enum(['+', '×']).default('+'),
    targets: z.array(z.number().int().min(2).max(1000)).min(1).default([10]),
    pairs: range(2, 6).default([4, 4]),
    /** Kelipatan nilai kotak (mis. 10 untuk "jumlahnya 100" dengan puluhan). */
    step: z.number().int().min(1).max(100).default(1),
  }),
  generate(p, rng) {
    const T = rng.pick(p.targets);
    const options: [number, number][] = [];
    if (p.op === '+') {
      for (let a = p.step; a <= T - p.step; a += p.step) if (a <= T - a) options.push([a, T - a]);
    } else {
      for (let a = 2; a * a <= T; a++) if (T % a === 0) options.push([a, T / a]);
    }
    if (options.length === 0) reject('tidak ada pasangan');
    const n = between(rng, p.pairs);
    // Pasangan berbeda dulu; bila kurang, boleh terulang.
    const chosen = [
      ...rng.shuffle(options),
      ...Array.from({ length: n }, () => rng.pick(options)),
    ].slice(0, n);
    const tiles = rng.shuffle(chosen.flat()).map((v, i) => ({
      id: `t${i}`,
      value: v,
      visual: { kind: 'numeral', value: v } as Visual,
      say: nw(v),
    }));
    const rel = p.op === '+' ? 'jumlahnya' : 'hasil kalinya';
    const where = p.theme === 'candy' ? 'permen' : 'batu';
    return {
      prompt: `Ketuk dua ${where} yang ${rel} ${dotted(T)}. Bersihkan semua ${where}!`,
      say: `Ketuk dua ${where} yang ${rel} ${nw(T)}. Bersihkan semua ${where}!`,
      stimulus: [],
      interaction: { type: 'clear', theme: p.theme, op: p.op, target: T, tiles },
      reteach: {
        say: `Contoh pasangannya: ${nw(chosen[0]![0])} dan ${nw(chosen[0]![1])}, ${rel} ${nw(T)}.`,
      },
    };
  },
});

// ------------------------------------------------------------ Atur jam

/** Cara membaca jam dalam Bahasa Indonesia (jam 1–12, atau 0–23 untuk `h24`). */
export function timeSay(hour: number, minute: number, h24 = false): string {
  const next = h24 ? (hour + 1) % 24 : (hour % 12) + 1;
  if (minute === 0) return `pukul ${nw(hour)} tepat`;
  if (h24) return `pukul ${nw(hour)} lewat ${nw(minute)} menit`;
  if (minute === 30) return `pukul setengah ${nw(next)}`;
  if (minute === 15) return `pukul ${nw(hour)} lewat seperempat`;
  if (minute === 45) return `pukul ${nw(next)} kurang seperempat`;
  return minute < 30
    ? `pukul ${nw(hour)} lewat ${nw(minute)} menit`
    : `pukul ${nw(next)} kurang ${nw(60 - minute)} menit`;
}

export const clockGame = defineFamily({
  description:
    'Atur jam: putar jarum jam analog ke waktu yang disebut Momo (jam tepat, setengah, seperempat, 5 menit, 1 menit; boleh format 24 jam).',
  params: z.strictObject({
    /** Ketelitian menit target: 60 = jam tepat, 30, 15, 5, 1. */
    minutes: z.union([z.literal(60), z.literal(30), z.literal(15), z.literal(5), z.literal(1)]),
    h24: z.boolean().default(false),
  }),
  generate(p, rng) {
    const hour = rng.int(1, 12);
    const minute = p.minutes === 60 ? 0 : rng.int(0, 60 / p.minutes - 1) * p.minutes;
    const pm = p.h24 && rng.chance(0.6);
    const shown = pm ? (hour % 12) + 12 : hour;
    const hh = String(shown).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    const say = `Atur jarum jam menjadi ${timeSay(shown, minute, p.h24)}.`;
    return {
      prompt: `Atur jarum jam menjadi pukul ${hh}.${mm}.`,
      say,
      stimulus: [],
      interaction: { type: 'clock', hour, minute, step: p.minutes },
      reteach: {
        say: `Jarum pendek menunjuk jam, jarum panjang menunjuk menit. ${capital(timeSay(shown, minute, p.h24))}.`,
      },
    };
  },
});
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ------------------------------------------------------------ Pizza / cokelat pecahan

export const fracSay = (whole: number, num: number, den: number) =>
  `${whole ? `${nw(whole)} ` : ''}${nw(num)} per ${nw(den)}`;

export const pizzaGame = defineFamily({
  description:
    'Pizza / cokelat pecahan: warnai potongan sesuai pecahan (biasa, senilai dengan potongan lebih kecil, atau bilangan campuran).',
  params: z.strictObject({
    theme: z.enum(['pizza', 'chocolate']).default('pizza'),
    mode: z.enum(['simple', 'equivalent', 'mixed']).default('simple'),
    dens: z.array(z.number().int().min(2).max(12)).min(1).default([2, 3, 4]),
    /** Pengali potongan untuk `equivalent` (mis. 1/2 di pizza 4 potong). */
    factors: z.array(z.number().int().min(2).max(4)).min(1).default([2]),
    wholes: z.number().int().min(2).max(3).default(2),
  }),
  generate(p, rng) {
    const den = rng.pick(p.dens);
    const num = rng.int(1, den - 1);
    const f = p.mode === 'equivalent' ? rng.pick(p.factors) : 1;
    const parts = den * f;
    if (parts > 12) reject('maks. 12 potong');
    const wholes = p.mode === 'mixed' ? p.wholes : 1;
    const whole = p.mode === 'mixed' ? rng.int(1, wholes - 1) : 0;
    const target = whole * parts + num * f;
    const noun = p.theme === 'pizza' ? 'pizza' : 'cokelat';
    const label = `${whole ? `${whole} ` : ''}${num}/${den}`;
    return {
      prompt: `Warnai ${label} ${noun}.`,
      say: `Warnai ${fracSay(whole, num, den)} ${noun}.`,
      stimulus: [],
      interaction: { type: 'pizza', theme: p.theme, wholes, parts, target, whole, num, den },
      reteach: {
        say:
          f > 1
            ? `Setiap potong ${noun} ini sama dengan satu per ${nw(parts)}. ${capital(fracSay(0, num, den))} sama dengan ${nw(num * f)} potong.`
            : `${capital(fracSay(whole, num, den))}: ${whole ? `${nw(whole)} ${noun} utuh, lalu ` : ''}warnai ${nw(num)} dari ${nw(den)} potong.`,
      },
    };
  },
});
