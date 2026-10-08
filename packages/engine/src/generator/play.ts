import type { Rng } from './rng.js';

/**
 * Logika murni game seru (D-078): neraca/toko/truk (jumlah), lompat kodok, sortir keranjang, teka-teki silang,
 * dan puzzle susun. Web hanya menggambar dan mengirim ketukan; penilaian dihitung ulang di sini dari daftar
 * ketukan (fungsi `…Step` dipakai web DAN penilaian, jadi hasilnya sama). Tanpa batas waktu, tanpa nyawa.
 */

// ------------------------------------------------------------ jumlah (neraca, toko, truk)

/** Jumlah nilai token yang dipasang; `undefined` bila ada id token yang tidak dikenal. */
export function sumOf(
  tokens: readonly { id: string; value: number }[],
  ids: readonly string[],
): number | undefined {
  const value = new Map(tokens.map((t) => [t.id, t.value]));
  let total = 0;
  for (const id of ids) {
    const v = value.get(id);
    if (v === undefined) return undefined;
    total += v;
  }
  return total;
}

/**
 * Paling sedikit token untuk mencapai `amount` tepat (persediaan tiap nilai tak terbatas), atau `Infinity` bila
 * tidak bisa. Dipakai generator agar soal selalu bisa diselesaikan dalam batas `maxTokens`.
 */
export function fewestTokens(values: readonly number[], amount: number): number {
  if (amount < 0) return Infinity;
  const best = Array.from({ length: amount + 1 }, () => Infinity);
  best[0] = 0;
  for (let a = 1; a <= amount; a++)
    for (const v of values)
      if (v > 0 && v <= a && best[a - v]! + 1 < best[a]!) best[a] = best[a - v]! + 1;
  return best[amount]!;
}

// ------------------------------------------------------------ lompat

/** Satu ketukan lompat: maju bila batu itu tujuan berikutnya, selain itu slip (kodok tetap). */
export function hopStep(answer: readonly number[], landed: number, stone: number) {
  if (landed >= answer.length) return { landed, slip: false };
  return stone === answer[landed] ? { landed: landed + 1, slip: false } : { landed, slip: true };
}

/** Ketukan lompat ("7" atau 7) diputar ulang. */
export function hopReplay(answer: readonly number[], taps: readonly (string | number)[]) {
  let landed = 0;
  let slips = 0;
  for (const tap of taps) {
    if (landed >= answer.length) break;
    const r = hopStep(answer, landed, Number(tap));
    landed = r.landed;
    if (r.slip) slips++;
  }
  return { landed, slips, done: landed === answer.length };
}

// ------------------------------------------------------------ sortir keranjang

/** Benda datang berurutan; ketukan "benda>keranjang". Keranjang benar → masuk; lainnya slip (benda kembali). */
export function sortStep(
  items: readonly { id: string }[],
  answer: Readonly<Record<string, string>>,
  placed: number,
  bin: string,
) {
  const item = items[placed];
  if (!item) return { placed, slip: false };
  return answer[item.id] === bin ? { placed: placed + 1, slip: false } : { placed, slip: true };
}

export function sortReplay(
  items: readonly { id: string }[],
  answer: Readonly<Record<string, string>>,
  taps: readonly string[],
) {
  let placed = 0;
  let slips = 0;
  for (const tap of taps) {
    if (placed >= items.length) break;
    const [item, bin] = tap.split('>');
    // Ketukan untuk benda yang bukan giliran = slip (web tidak pernah mengirimnya).
    if (item !== items[placed]!.id || !bin) {
      slips++;
      continue;
    }
    const r = sortStep(items, answer, placed, bin);
    placed = r.placed;
    if (r.slip) slips++;
  }
  return { placed, slips, done: placed === items.length };
}

// ------------------------------------------------------------ teka-teki silang

export type CrosswordWord = { id: string; text: string; cells: number[]; dir: 'across' | 'down' };
export type CrosswordGrid = {
  cols: number;
  rows: number;
  words: CrosswordWord[];
  prefill: number[];
};

/** Huruf di setiap kotak (dari kata-kata); kotak kosong = ''. */
export function crosswordLetters(g: Pick<CrosswordGrid, 'cols' | 'rows' | 'words'>): string[] {
  const out = Array.from({ length: g.cols * g.rows }, () => '');
  for (const w of g.words) w.cells.forEach((c, k) => (out[c] = w.text[k]!));
  return out;
}

/**
 * Satu ketukan teka-teki silang ("kata:huruf"): huruf mengisi kotak kosong pertama kata itu (kotak silang yang
 * sudah terisi dilewati). Huruf yang bukan huruf kotak itu = slip. Mengembalikan kotak yang terisi.
 */
export function crosswordStep(
  g: Pick<CrosswordGrid, 'cols' | 'rows' | 'words'>,
  filled: ReadonlySet<number>,
  tap: string,
): { cell?: number; slip: boolean; ignored: boolean } {
  const [wordId, letter] = tap.split(':');
  const word = g.words.find((w) => w.id === wordId);
  if (!word || !letter) return { slip: true, ignored: false };
  const k = word.cells.findIndex((c) => !filled.has(c));
  if (k < 0) return { slip: false, ignored: true };
  return letter.toUpperCase() === word.text[k]
    ? { cell: word.cells[k]!, slip: false, ignored: false }
    : { slip: true, ignored: false };
}

export function crosswordReplay(g: CrosswordGrid, taps: readonly string[]) {
  const filled = new Set(g.prefill);
  const all = new Set(g.words.flatMap((w) => w.cells));
  let slips = 0;
  for (const tap of taps) {
    if (filled.size === all.size) break;
    const r = crosswordStep(g, filled, tap);
    if (r.slip) slips++;
    if (r.cell !== undefined) filled.add(r.cell);
  }
  return { filled: [...filled], slips, done: [...all].every((c) => filled.has(c)) };
}

/**
 * Susun kata-kata menjadi teka-teki silang kecil yang saling bersilang (ber-seed). Kata pertama mendatar; kata
 * berikutnya bersilang tegak lurus dengan kata yang sudah ada pada huruf yang sama, tanpa menempel sejajar
 * dengan kata lain. Kotak dipangkas ke ukuran terkecil. `null` bila tidak semua kata bisa disilangkan atau
 * ukurannya melebihi `maxCols` × `maxRows`.
 */
export function buildCrossword(
  rng: Rng,
  words: readonly string[],
  maxCols: number,
  maxRows: number,
): {
  cols: number;
  rows: number;
  placed: { text: string; cells: number[]; dir: 'across' | 'down' }[];
} | null {
  type Placed = { text: string; r: number; c: number; dir: 'across' | 'down' };
  const cellAt = new Map<string, string>();
  const key = (r: number, c: number) => `${r},${c}`;
  const placed: Placed[] = [];
  const cellsOf = (p: Placed) =>
    Array.from({ length: p.text.length }, (_, k) =>
      p.dir === 'across' ? [p.r, p.c + k] : [p.r + k, p.c],
    ) as [number, number][];
  const put = (p: Placed) => {
    placed.push(p);
    cellsOf(p).forEach(([r, c], k) => cellAt.set(key(r, c), p.text[k]!));
  };
  const fits = (p: Placed) => {
    const cells = cellsOf(p);
    const [dr, dc] = p.dir === 'across' ? [0, 1] : [1, 0];
    // Kotak sebelum awal dan sesudah akhir kata harus kosong.
    const [r0, c0] = cells[0]!;
    const [r1, c1] = cells.at(-1)!;
    if (cellAt.has(key(r0 - dr, c0 - dc)) || cellAt.has(key(r1 + dr, c1 + dc))) return false;
    let crossings = 0;
    for (const [i, [r, c]] of cells.entries()) {
      const have = cellAt.get(key(r, c));
      if (have !== undefined) {
        if (have !== p.text[i]) return false;
        crossings++;
        continue;
      }
      // Kotak baru tidak boleh menempel sejajar dengan huruf kata lain.
      const side =
        p.dir === 'across'
          ? [
              [r - 1, c],
              [r + 1, c],
            ]
          : [
              [r, c - 1],
              [r, c + 1],
            ];
      if (side.some(([a, b]) => cellAt.has(key(a!, b!)))) return false;
    }
    return crossings > 0;
  };
  const [first, ...rest] = rng.shuffle(words);
  if (!first) return null;
  put({ text: first, r: 0, c: 0, dir: 'across' });
  for (const text of rest) {
    const options: Placed[] = [];
    for (const p of placed) {
      const dir = p.dir === 'across' ? 'down' : 'across';
      cellsOf(p).forEach(([r, c], i) => {
        for (let k = 0; k < text.length; k++) {
          if (text[k] !== p.text[i]) continue;
          const cand: Placed =
            dir === 'down' ? { text, r: r - k, c, dir } : { text, r, c: c - k, dir };
          if (fits(cand)) options.push(cand);
        }
      });
    }
    if (!options.length) return null;
    put(rng.pick(options));
  }
  const all = placed.flatMap(cellsOf);
  const minR = Math.min(...all.map(([r]) => r));
  const minC = Math.min(...all.map(([, c]) => c));
  const rows = Math.max(...all.map(([r]) => r)) - minR + 1;
  const cols = Math.max(...all.map(([, c]) => c)) - minC + 1;
  if (cols > maxCols || rows > maxRows) return null;
  return {
    cols,
    rows,
    placed: placed.map((p) => ({
      text: p.text,
      dir: p.dir,
      cells: cellsOf(p).map(([r, c]) => (r - minR) * cols + (c - minC)),
    })),
  };
}

// ------------------------------------------------------------ puzzle susun

/** Ketukan "p<k>@<kotak>": benar bila kepingan k ke kotak k yang masih kosong; selain itu slip. */
export function jigsawStep(
  placed: ReadonlySet<number>,
  tap: string,
  total: number,
): { slip: boolean; slot?: number; ignored?: boolean } {
  const m = /^p(\d+)@(\d+)$/.exec(tap);
  if (!m) return { slip: true };
  const piece = Number(m[1]);
  const slot = Number(m[2]);
  if (piece >= total || slot >= total) return { slip: true };
  if (placed.has(piece)) return { slip: false, ignored: true };
  return piece === slot ? { slip: false, slot } : { slip: true };
}

export function jigsawReplay(
  g: { cols: number; rows: number; fixed: readonly number[] },
  taps: readonly string[],
) {
  const placed = new Set(g.fixed);
  const total = g.cols * g.rows;
  let slips = 0;
  for (const tap of taps) {
    if (placed.size === total) break;
    const r = jigsawStep(placed, tap, total);
    if (r.slip) slips++;
    if (r.slot !== undefined) placed.add(r.slot);
  }
  return { placed: [...placed], slips, done: placed.size === total };
}

// ------------------------------------------------------------ contoh jawaban benar (test & pratinjau admin)

/** Token paling sedikit untuk `amount` (id token berulang), atau `null` bila tidak bisa. */
export function sumSolution(
  tokens: readonly { id: string; value: number }[],
  amount: number,
): string[] | null {
  const best: (string[] | null)[] = Array.from({ length: amount + 1 }, () => null);
  best[0] = [];
  for (let a = 1; a <= amount; a++)
    for (const t of tokens) {
      const prev = t.value <= a ? best[a - t.value] : null;
      if (prev && (!best[a] || prev.length + 1 < best[a]!.length)) best[a] = [...prev, t.id];
    }
  return best[amount] ?? null;
}

/** Ketukan teka-teki silang tanpa slip: setiap kata, huruf yang belum terisi, berurutan. */
export function crosswordSolution(g: CrosswordGrid): string[] {
  const filled = new Set(g.prefill);
  const taps: string[] = [];
  for (const w of g.words)
    w.cells.forEach((c, k) => {
      if (filled.has(c)) return;
      filled.add(c);
      taps.push(`${w.id}:${w.text[k]}`);
    });
  return taps;
}

/** Ketukan puzzle tanpa slip. */
export const jigsawSolution = (g: { cols: number; rows: number; fixed: readonly number[] }) =>
  Array.from({ length: g.cols * g.rows }, (_, k) => k)
    .filter((k) => !g.fixed.includes(k))
    .map((k) => `p${k}@${k}`);

/** Ketukan sortir tanpa slip. */
export const sortSolution = (
  items: readonly { id: string }[],
  answer: Readonly<Record<string, string>>,
) => items.map((x) => `${x.id}>${answer[x.id]}`);
