import { z } from 'zod';
import type { Choice, Visual } from '../item.js';
import {
  BALL_COLORS,
  CHANCE_SPACES,
  chanceFavorable,
  chanceOutcomes,
  coordLabel,
  coordSay,
  signed,
  type BallColor,
  type ChanceSpace,
} from '../play-emc.js';
import { numberWord } from '../words.js';
import { defineFamily, range, reject } from './common.js';

/**
 * Game EMC Kelas 3–4 (D-101): Harta Karun Koordinat dan Eksperimen Peluang. Versi sendiri, tanpa hitung
 * mundur, nyawa, atau streak (PRD A14/A17). Kekeliruan ke-2 mengakhiri soal (game ketuk, D-078).
 */

// ------------------------------------------------------------ Harta Karun Koordinat

const NAMES = ['A', 'B', 'C', 'D', 'E'];
const dirX = (d: number) => (d > 0 ? 'kanan' : 'kiri');
const dirY = (d: number) => (d > 0 ? 'atas' : 'bawah');

export const coordGame = defineFamily({
  description:
    'Harta Karun Koordinat: tandai titik pada bidang koordinat — dari pasangan koordinat, geser dari titik lain, atau sudut ke-4 persegi panjang.',
  params: z.strictObject({
    x: range(-10, 10).default([0, 8]),
    y: range(-10, 10).default([0, 6]),
    /** `plot` = (x, y); `move` = geser dari titik sebelumnya; `rect` = sudut ke-4; `mix` = bergantian. */
    mode: z.enum(['plot', 'move', 'rect', 'mix']).default('plot'),
    steps: z.number().int().min(2).max(5).default(4),
  }),
  generate(p, rng) {
    const [xMin, xMax] = p.x;
    const [yMin, yMax] = p.y;
    if (xMax - xMin < 4 || yMax - yMin < 4) reject('bidang terlalu sempit');
    const used = new Set<string>();
    const key = (x: number, y: number) => `${x},${y}`;
    const free = () => {
      for (let t = 0; t < 50; t++) {
        const x = rng.int(xMin, xMax);
        const y = rng.int(yMin, yMax);
        if (!used.has(key(x, y))) return [x, y] as const;
      }
      return reject('titik habis');
    };
    const modes =
      p.mode === 'mix'
        ? Array.from({ length: p.steps }, (_, k) => (['plot', 'move', 'rect'] as const)[k % 3]!)
        : Array.from({ length: p.steps }, () => p.mode as 'plot' | 'move' | 'rect');
    const out: {
      id: string;
      text: string;
      say: string;
      x: number;
      y: number;
      name: string;
      marks: { x: number; y: number; name: string }[];
    }[] = [];
    modes.forEach((mode, k) => {
      const name = NAMES[k]!;
      const prev = out[k - 1];
      if (mode === 'move') {
        // Titik awal: titik sebelumnya, atau titik bantu M untuk langkah pertama.
        const from = prev
          ? { x: prev.x, y: prev.y, name: prev.name }
          : (() => {
              const [x, y] = free();
              return { x, y, name: 'M' };
            })();
        for (let t = 0; t < 60; t++) {
          const dx = rng.int(-4, 4);
          const dy = rng.int(-4, 4);
          const x = from.x + dx;
          const y = from.y + dy;
          if (!dx || !dy || x < xMin || x > xMax || y < yMin || y > yMax) continue;
          if (used.has(key(x, y)) || key(x, y) === key(from.x, from.y)) continue;
          used.add(key(x, y));
          const moveText = `geser ${Math.abs(dx)} ke ${dirX(dx)} dan ${Math.abs(dy)} ke ${dirY(dy)}`;
          out.push({
            id: `s${k}`,
            name,
            x,
            y,
            marks: prev ? [] : [from],
            text: `Dari titik ${from.name} ${coordLabel(from.x, from.y)}, ${moveText}. Tandai titik ${name}.`,
            say: `Dari titik ${from.name}, ${coordSay(from.x, from.y)}, geser ${numberWord(Math.abs(dx))} ke ${dirX(dx)} dan ${numberWord(Math.abs(dy))} ke ${dirY(dy)}. Tandai titik ${name}.`,
          });
          return;
        }
        reject('geser keluar bidang');
      }
      if (mode === 'rect') {
        for (let t = 0; t < 60; t++) {
          const x1 = rng.int(xMin, xMax - 2);
          const x2 = rng.int(x1 + 2, xMax);
          const y1 = rng.int(yMin, yMax - 2);
          const y2 = rng.int(y1 + 2, yMax);
          const corners = rng.shuffle([
            [x1, y1],
            [x2, y1],
            [x2, y2],
            [x1, y2],
          ] as const);
          const [tx, ty] = corners[3]!;
          if (used.has(key(tx, ty))) continue;
          used.add(key(tx, ty));
          const shown = ['K', 'L', 'M'].map((n, i) => ({
            x: corners[i]![0],
            y: corners[i]![1],
            name: n,
          }));
          out.push({
            id: `s${k}`,
            name,
            x: tx,
            y: ty,
            marks: shown,
            text: `Titik K, L, dan M adalah tiga sudut sebuah persegi panjang. Tandai sudut keempat sebagai titik ${name}.`,
            say: `Titik K, L, dan M adalah tiga sudut sebuah persegi panjang. Tandai sudut keempatnya sebagai titik ${name}.`,
          });
          return;
        }
        reject('persegi panjang tidak muat');
      }
      const [x, y] = free();
      used.add(key(x, y));
      out.push({
        id: `s${k}`,
        name,
        x,
        y,
        marks: [],
        text: `Tandai titik ${name} ${coordLabel(x, y)}.`,
        say: `Tandai titik ${name}, ${coordSay(x, y)}.`,
      });
    });
    const negative = xMin < 0 || yMin < 0;
    return {
      prompt: `Harta Karun Koordinat: tandai ${p.steps} titik harta di bidang koordinat.`,
      say: `Harta karun koordinat! Ketuk tempat titiknya, lalu tekan Pasang. Ingat, angka pertama untuk ke kanan atau ke kiri, angka kedua untuk ke atas atau ke bawah.`,
      stimulus: [],
      interaction: { type: 'coord', xMin, xMax, yMin, yMax, steps: out },
      reteach: {
        say: `Mulai dari titik nol. Angka pertama (x) menunjukkan langkah ke kanan${negative ? ' atau ke kiri bila negatif' : ''}, angka kedua (y) menunjukkan langkah ke atas${negative ? ' atau ke bawah bila negatif' : ''}. Contoh ${signed(2)} dan ${signed(-3)}: 2 ke kanan, 3 ke bawah.`,
      },
    };
  },
});

// ------------------------------------------------------------ Eksperimen Peluang

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const fracChoice = (num: number, den: number, tag?: string): Choice => ({
  id: `f${num}-${den}`,
  visual: { kind: 'fraction', num, den },
  say: `${numberWord(num)} per ${numberWord(den)}`,
  ...(tag && { tag }),
});

const SPACE_INTRO: Record<Exclude<ChanceSpace, 'bag'>, string> = {
  die: 'Sebuah dadu dilempar sekali.',
  dice2: 'Dua dadu dilempar bersamaan. Kartu "a,b" berarti dadu pertama a dan dadu kedua b.',
  coins2: 'Dua koin dilempar bersamaan (A = angka, G = gambar).',
  coins3: 'Tiga koin dilempar bersamaan (A = angka, G = gambar).',
  coins4: 'Empat koin dilempar bersamaan (A = angka, G = gambar).',
};

export const chanceGame = defineFamily({
  description:
    'Eksperimen Peluang: ketuk semua hasil percobaan (dadu, koin, atau bola) yang memenuhi kejadian, lalu pilih peluangnya.',
  params: z
    .strictObject({
      space: z.enum(CHANCE_SPACES),
      /** Isi kantong (space `bag`): banyak bola per warna, total 3–6; diambil 2 sekaligus. */
      bag: z.partialRecord(z.enum(BALL_COLORS), z.number().int().min(1).max(4)).optional(),
      /**
       * Kejadian: `text` melengkapi "Ketuk semua hasil yang …" (mis. "jumlah matanya 7"), `test` = syarat dengan
       * variabel ruang sampel (dadu: a, b, s; koin: h, g, c1…; kantong: nama warna).
       */
      events: z
        .array(
          z.strictObject({
            text: z.string().trim().min(3).max(60),
            say: z.string().trim().max(120).optional(),
            test: z.string().min(1).max(120),
          }),
        )
        .min(1)
        .max(12),
      /** Peluang ditulis paling sederhana (default) atau apa adanya (mis. 4/6). */
      simplify: z.boolean().default(true),
    })
    .superRefine((p, ctx) => {
      if (p.space === 'bag') {
        const total = Object.values(p.bag ?? {}).reduce((a, b) => a + (b ?? 0), 0);
        if (total < 3 || total > 6)
          ctx.addIssue({ code: 'custom', message: 'kantong berisi 3–6 bola' });
      } else if (p.bag) ctx.addIssue({ code: 'custom', message: '`bag` hanya untuk space bag' });
    }),
  generate(p, rng) {
    const outcomes = chanceOutcomes(p.space, p.bag as Partial<Record<BallColor, number>>);
    const ev = rng.pick(p.events);
    let answer: string[];
    try {
      answer = chanceFavorable(outcomes, ev.test);
    } catch (err) {
      throw new Error(`syarat "${ev.test}" tidak valid: ${(err as Error).message}`);
    }
    const n = outcomes.length;
    const f = answer.length;
    if (f === 0 || f === n) reject('kejadian tidak punya hasil / semua hasil');
    const g = p.simplify ? gcd(f, n) : 1;
    const right = fracChoice(f / g, n / g);
    const seen = new Set([f / n]);
    const pool: Choice[] = [];
    const add = (a: number, b: number, tag: string) => {
      if (a <= 0 || b <= 0 || a > b || seen.has(a / b)) return;
      seen.add(a / b);
      const h = p.simplify ? gcd(a, b) : 1;
      pool.push(fracChoice(a / h, b / h, tag));
    };
    add(n - f, n, 'kebalikan');
    add(f, n - f, 'banding-bukan-peluang');
    add(f + 1, n, 'lebih-satu');
    add(f - 1, n, 'kurang-satu');
    add(f, 2 * n, 'dua-kali-total');
    add(1, n, 'satu-hasil');
    if (pool.length < 3) reject('pengecoh peluang kurang');
    const fractions = rng.shuffle([right, ...pool.slice(0, 3)]);
    const bagIntro = () => {
      const parts = Object.entries(p.bag ?? {}).map(([c, k]) => `${k} bola ${c}`);
      return `Di dalam kantong ada ${parts.join(' dan ')}. Dua bola diambil sekaligus tanpa melihat.`;
    };
    const intro = p.space === 'bag' ? bagIntro() : SPACE_INTRO[p.space];
    const outcomeChoices: Choice[] = outcomes.map((o) => ({
      id: o.id,
      visual: o.dice
        ? o.dice.length === 1
          ? ({ kind: 'die', value: o.dice[0]! } as Visual)
          : ({
              kind: 'row',
              items: o.dice.map((v) => ({ kind: 'die', value: v }) as Visual),
            } as Visual)
        : ({ kind: 'text', text: o.label } as Visual),
      say: o.say,
    }));
    return {
      prompt: `${intro} Ketuk semua hasil yang ${ev.text}, lalu pilih peluangnya.`,
      say: `${intro.replace(/\(A = angka, G = gambar\)/, ', A artinya angka, G artinya gambar')} Ketuk semua hasil yang ${ev.say ?? ev.text}, lalu pilih peluangnya.`,
      stimulus: [],
      interaction: {
        type: 'chance',
        space: p.space,
        event: ev.text,
        eventSay: ev.say ?? ev.text,
        outcomes: outcomeChoices,
        answer,
        fractions,
        fraction: right.id,
      },
      reteach: {
        say: `Ada ${f} hasil yang ${ev.say ?? ev.text} dari ${n} hasil yang mungkin. Peluang = banyak hasil yang diharapkan : banyak semua hasil = ${f}/${n}${g > 1 ? ` = ${f / g}/${n / g}` : ''}.`,
      },
    };
  },
});
