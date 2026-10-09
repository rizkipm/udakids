import { evalBool, type Vars } from './expr.js';
import { numberWord, signedWord } from './words.js';

/**
 * Game EMC Kelas 3–4 (D-101): Harta Karun Koordinat dan Eksperimen Peluang. Fungsi murni & deterministik;
 * penilaian dihitung ulang dari ketukan anak (seperti game Kelas 4, D-096).
 */

// ------------------------------------------------------------ koordinat

/** "−3" dengan tanda minus tipografis (tampilan). */
export const signed = (n: number) => String(n).replace('-', '−');
/** "(3, −2)". */
export const coordLabel = (x: number, y: number) => `(${signed(x)}, ${signed(y)})`;
/** Diucapkan: "titik tiga, negatif dua". */
export const coordSay = (x: number, y: number) => `${signedWord(x)}, ${signedWord(y)}`;
/** Kunci ketukan titik kisi. */
export const coordKey = (x: number, y: number) => `${x},${y}`;

/**
 * Putar ulang ketukan Harta Karun Koordinat: setiap langkah satu titik target, berurutan. Ketukan pada titik
 * lain = kekeliruan (langkah tetap sama).
 */
export function coordReplay(
  steps: readonly { x: number; y: number }[],
  taps: readonly string[],
): { found: number; slips: number; done: boolean } {
  let found = 0;
  let slips = 0;
  for (const tap of taps) {
    if (found >= steps.length) break;
    const s = steps[found]!;
    if (tap === coordKey(s.x, s.y)) found++;
    else slips++;
  }
  return { found, slips, done: found === steps.length };
}

/** Jalan ketukan yang benar (untuk test & "lihat jawaban"). */
export const coordSolution = (steps: readonly { x: number; y: number }[]) =>
  steps.map((s) => coordKey(s.x, s.y));

// ------------------------------------------------------------ peluang

export const CHANCE_SPACES = ['die', 'dice2', 'coins2', 'coins3', 'coins4', 'bag'] as const;
export type ChanceSpace = (typeof CHANCE_SPACES)[number];

/** Satu hasil percobaan: id, teks kartu, ucapan, dan variabel untuk syarat kejadian. */
export type ChanceOutcome = {
  id: string;
  label: string;
  say: string;
  /** Mata dadu (die/dice2) untuk gambar dadu. */
  dice?: number[];
  vars: Record<string, number>;
};

/** Warna bola yang dikenal (nama variabel = nama warna). */
export const BALL_COLORS = ['merah', 'biru', 'hijau', 'kuning', 'hitam', 'putih'] as const;
export type BallColor = (typeof BALL_COLORS)[number];

/**
 * Ruang sampel (semua hasil yang mungkin), urut sistematis seperti tabel di papan tulis.
 * - `die`: satu dadu → variabel `a`.
 * - `dice2`: dua dadu (36 pasangan berurutan) → `a`, `b`, `s` = a + b.
 * - `coinsN`: N koin, A = angka, G = gambar → `h` = banyak A, `g` = banyak G, `c1`… = 1 bila koin ke-i A.
 * - `bag`: ambil 2 bola sekaligus tanpa pengembalian (pasangan tak berurutan) → variabel per warna.
 */
export function chanceOutcomes(
  space: ChanceSpace,
  bag?: Partial<Record<BallColor, number>>,
): ChanceOutcome[] {
  if (space === 'die')
    return [1, 2, 3, 4, 5, 6].map((a) => ({
      id: `d${a}`,
      label: String(a),
      say: numberWord(a),
      dice: [a],
      vars: { a },
    }));
  if (space === 'dice2') {
    const out: ChanceOutcome[] = [];
    for (let a = 1; a <= 6; a++)
      for (let b = 1; b <= 6; b++)
        out.push({
          id: `d${a}${b}`,
          label: `${a},${b}`,
          say: `${numberWord(a)} dan ${numberWord(b)}`,
          dice: [a, b],
          vars: { a, b, s: a + b },
        });
    return out;
  }
  if (space === 'bag') {
    const balls: { color: BallColor; n: number }[] = [];
    for (const color of BALL_COLORS)
      for (let n = 1; n <= (bag?.[color] ?? 0); n++) balls.push({ color, n });
    const out: ChanceOutcome[] = [];
    for (let i = 0; i < balls.length; i++)
      for (let j = i + 1; j < balls.length; j++) {
        const x = balls[i]!;
        const y = balls[j]!;
        const vars: Record<string, number> = Object.fromEntries(BALL_COLORS.map((c) => [c, 0]));
        vars[x.color]!++;
        vars[y.color]!++;
        const name = (b: { color: BallColor; n: number }) => `${b.color} ${b.n}`;
        out.push({
          id: `b${i}-${j}`,
          label: `${cap(name(x))} + ${cap(name(y))}`,
          say: `${name(x)} dan ${name(y)}`,
          vars,
        });
      }
    return out;
  }
  const n = Number(space.slice(5));
  const out: ChanceOutcome[] = [];
  for (let mask = 0; mask < 2 ** n; mask++) {
    const sides = Array.from({ length: n }, (_, i) => ((mask >> (n - 1 - i)) & 1 ? 'G' : 'A'));
    const vars: Record<string, number> = {
      h: sides.filter((x) => x === 'A').length,
      g: sides.filter((x) => x === 'G').length,
    };
    sides.forEach((x, i) => (vars[`c${i + 1}`] = x === 'A' ? 1 : 0));
    out.push({
      id: `c${sides.join('')}`,
      label: sides.join(''),
      say: sides.map((x) => (x === 'A' ? 'angka' : 'gambar')).join(', '),
      vars,
    });
  }
  return out;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Hasil yang memenuhi syarat kejadian (ekspresi aman, tanpa eval). */
export function chanceFavorable(outcomes: readonly ChanceOutcome[], test: string): string[] {
  return outcomes.filter((o) => evalBool(test, o.vars as Vars)).map((o) => o.id);
}

/**
 * Putar ulang ketukan Eksperimen Peluang: tahap 1 ketuk semua hasil yang memenuhi kejadian (hasil lain =
 * kekeliruan, ketukan ulang diabaikan), tahap 2 ketuk peluangnya (`p:<id>`; pilihan lain = kekeliruan).
 */
export function chanceReplay(
  answer: readonly string[],
  fraction: string,
  taps: readonly string[],
): { found: number; slips: number; picked: boolean; done: boolean } {
  const want = new Set(answer);
  const got = new Set<string>();
  let slips = 0;
  let picked = false;
  for (const tap of taps) {
    if (picked) break;
    if (tap.startsWith('p:')) {
      if (got.size < want.size) slips++;
      else if (tap === `p:${fraction}`) picked = true;
      else slips++;
    } else if (want.has(tap)) got.add(tap);
    else slips++;
  }
  return { found: got.size, slips, picked, done: picked };
}

export const chanceSolution = (answer: readonly string[], fraction: string) => [
  ...answer,
  `p:${fraction}`,
];
