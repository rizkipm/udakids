/**
 * Logika murni 6 game Kelas 4 (D-096). Web hanya menggambar dan mengirim ketukan/isian; penilaian dihitung ulang di
 * sini, jadi hasil di perangkat dan di server sama. Tanpa batas waktu, tanpa nyawa, tanpa streak.
 */

// ------------------------------------------------------------ Tebak Angka Momo

export type GuessGame = {
  min: number;
  max: number;
  secret: number;
  /** `number`: petunjuk lebih besar/kecil untuk bilangan utuh; `digit`: petunjuk per nilai tempat. */
  hint: 'number' | 'digit';
  digits: number;
  maxGuesses: number;
};

export type GuessHint = 'naik' | 'turun' | 'tepat';

/** Petunjuk satu tebakan: untuk bilangan utuh, atau per angka dari nilai tempat terbesar. */
export function guessHints(g: GuessGame, guess: number): GuessHint[] {
  const h = (a: number, b: number): GuessHint => (a === b ? 'tepat' : a < b ? 'naik' : 'turun');
  if (g.hint === 'number') return [h(guess, g.secret)];
  const ds = (n: number) => String(n).padStart(g.digits, '0').split('').map(Number);
  const a = ds(guess);
  const b = ds(g.secret);
  return a.map((x, i) => h(x, b[i]!));
}

/** Bilangan dari angka-angka per nilai tempat (ribuan, ratusan, …). */
export const fromDigits = (ds: readonly number[]) => ds.reduce((n, d) => n * 10 + d, 0);

/**
 * Putar ulang tebakan. Tebakan yang mengabaikan petunjuk sebelumnya (di luar rentang yang masih mungkin) atau
 * melebihi `maxGuesses` dihitung keliru. Rentang per angka dipakai untuk mode `digit`.
 */
export function guessReplay(g: GuessGame, guesses: readonly string[]) {
  let lo = g.min;
  let hi = g.max;
  const dlo = Array.from({ length: g.digits }, () => 0);
  const dhi = Array.from({ length: g.digits }, () => 9);
  let slips = 0;
  let done = false;
  let count = 0;
  for (const raw of guesses) {
    if (done) break;
    const n = Number(raw);
    count++;
    if (!Number.isInteger(n) || n < g.min || n > g.max) {
      slips++;
      continue;
    }
    if (count > g.maxGuesses) slips++;
    if (g.hint === 'number') {
      if (n < lo || n > hi) slips++;
      if (n === g.secret) done = true;
      else if (n < g.secret) lo = Math.max(lo, n + 1);
      else hi = Math.min(hi, n - 1);
    } else {
      const ds = String(n).padStart(g.digits, '0').split('').map(Number);
      if (ds.some((d, i) => d < dlo[i]! || d > dhi[i]!)) slips++;
      guessHints(g, n).forEach((h, i) => {
        if (h === 'tepat') dlo[i] = dhi[i] = ds[i]!;
        else if (h === 'naik') dlo[i] = Math.max(dlo[i]!, ds[i]! + 1);
        else dhi[i] = Math.min(dhi[i]!, ds[i]! - 1);
      });
      if (n === g.secret) done = true;
    }
  }
  return { slips, done, lo, hi, dlo, dhi };
}

/** Jumlah tebakan wajar: pencarian biner + 2 (mode bilangan) atau 6 (mode nilai tempat). */
export const guessBudget = (min: number, max: number, hint: 'number' | 'digit') =>
  hint === 'digit' ? 6 : Math.ceil(Math.log2(max - min + 1)) + 2;

/** Tebakan pencarian biner (jawaban contoh / admin "lihat jawaban"). */
export function guessSolution(g: GuessGame): string[] {
  const out: string[] = [];
  if (g.hint === 'number') {
    let lo = g.min;
    let hi = g.max;
    for (;;) {
      const m = Math.floor((lo + hi) / 2);
      out.push(String(m));
      if (m === g.secret) return out;
      if (m < g.secret) lo = m + 1;
      else hi = m - 1;
    }
  }
  const lo = Array.from({ length: g.digits }, () => 0);
  const hi = Array.from({ length: g.digits }, () => 9);
  // Angka pertama tidak boleh membuat bilangan di bawah `min` (mis. 4 angka → ribuan ≥ 1).
  lo[0] = Math.floor(g.min / 10 ** (g.digits - 1));
  hi[0] = Math.floor(g.max / 10 ** (g.digits - 1));
  // Mode nilai tempat hanya untuk rentang penuh (mis. 1000–9999), jadi setiap tebakan tengah selalu sah.
  for (let i = 0; i < 40; i++) {
    const ds = lo.map((l, k) => Math.floor((l + hi[k]!) / 2));
    const n = fromDigits(ds);
    out.push(String(n));
    if (n === g.secret) return out;
    guessHints(g, n).forEach((h, k) => {
      if (h === 'tepat') lo[k] = hi[k] = ds[k]!;
      else if (h === 'naik') lo[k] = ds[k]! + 1;
      else hi[k] = ds[k]! - 1;
    });
  }
  return out;
}

// ------------------------------------------------------------ Penyihir Hitung

export type MagicFact = { id: string; answer: string; choices: readonly { id: string }[] };

/** Ketukan `"<fakta>:<pilihan>"`: maju bila jawaban fakta yang sedang ditanya, selain itu keliru. */
export function magicReplay(facts: readonly MagicFact[], taps: readonly string[]) {
  let k = 0;
  let slips = 0;
  for (const tap of taps) {
    if (k >= facts.length) break;
    const f = facts[k]!;
    if (tap === `${f.id}:${f.answer}`) k++;
    else slips++;
  }
  return { solved: k, slips, done: k === facts.length };
}

// ------------------------------------------------------------ Tumpuk Angka

/** Hasil tumpukan (jumlah atau hasil kali); `undefined` bila ada balok tak dikenal atau dipakai dua kali. */
export function stackValue(
  op: '+' | '×',
  blocks: readonly { id: string; value: number }[],
  ids: readonly string[],
): number | undefined {
  if (new Set(ids).size !== ids.length) return undefined;
  const value = new Map(blocks.map((b) => [b.id, b.value]));
  let acc = op === '+' ? 0 : 1;
  for (const id of ids) {
    const v = value.get(id);
    if (v === undefined) return undefined;
    acc = op === '+' ? acc + v : acc * v;
  }
  return ids.length ? acc : undefined;
}

/** Cari tumpukan berukuran ≤ `max` yang hasilnya `target` (balok tiap id sekali). */
export function stackSolution(
  op: '+' | '×',
  blocks: readonly { id: string; value: number }[],
  target: number,
  max: number,
): string[] | undefined {
  const n = blocks.length;
  let best: string[] | undefined;
  for (let mask = 1; mask < 1 << n; mask++) {
    const ids = blocks.filter((_, i) => mask & (1 << i)).map((b) => b.id);
    if (ids.length > max || (best && ids.length >= best.length)) continue;
    if (stackValue(op, blocks, ids) === target) best = ids;
  }
  return best;
}

// ------------------------------------------------------------ Garis Perkalian

/**
 * Titik potong per nilai tempat untuk a × b (masing-masing ≤ 2 angka): ratusan = puluhan×puluhan, puluhan =
 * puluhan×satuan + satuan×puluhan, satuan = satuan×satuan. Generator memilih bilangan tanpa menyimpan (tiap
 * kelompok < 10), jadi hasil kali = ratusan, puluhan, satuan berjajar.
 */
export function linesCounts(a: number, b: number) {
  const [a1, a0] = [Math.floor(a / 10), a % 10];
  const [b1, b0] = [Math.floor(b / 10), b % 10];
  return { ratusan: a1 * b1, puluhan: a1 * b0 + a0 * b1, satuan: a0 * b0 };
}

// ------------------------------------------------------------ Bingo Rupiah

/** Garis bingo pada kartu 3×3 (indeks sel 0–8). */
export const BINGO_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** Ketukan sel: maju bila sel jawaban panggilan yang sedang dibacakan, selain itu keliru. */
export function bingoReplay(calls: readonly { answer: string }[], taps: readonly string[]) {
  let k = 0;
  let slips = 0;
  for (const tap of taps) {
    if (k >= calls.length) break;
    if (tap === calls[k]!.answer) k++;
    else slips++;
  }
  return { marked: k, slips, done: k === calls.length };
}
