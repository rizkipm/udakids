import type { Rng } from './rng.js';

/**
 * Logika murni permainan worksheet (D-075): labirin, cari kata, kartu pasangan (memori), dan tangkap.
 * Web hanya menggambar dan mengirim ketukan; penilaian dihitung ulang di sini dari daftar ketukan, sama
 * seperti sambung titik (D-068). Tidak ada batas waktu dan tidak ada "nyawa".
 */

// ------------------------------------------------------------ labirin

/** Dinding sel (bit): utara, timur, selatan, barat. */
export const WALL = { N: 1, E: 2, S: 4, W: 8 } as const;

export type MazeGrid = {
  cols: number;
  rows: number;
  /** Dinding per sel (bitmask `WALL`), indeks = baris × cols + kolom. */
  walls: number[];
  start: number;
  goal: number;
};

const DIRS = [
  { bit: WALL.N, back: WALL.S, dr: -1, dc: 0 },
  { bit: WALL.E, back: WALL.W, dr: 0, dc: 1 },
  { bit: WALL.S, back: WALL.N, dr: 1, dc: 0 },
  { bit: WALL.W, back: WALL.E, dr: 0, dc: -1 },
] as const;

/** Labirin sempurna (tepat satu jalan antara dua sel) dengan penelusuran mundur ber-seed. */
export function carveMaze(rng: Rng, cols: number, rows: number): number[] {
  const walls = Array.from({ length: cols * rows }, () => 15);
  const first = rng.int(0, cols * rows - 1);
  const seen = new Set<number>([first]);
  const stack = [first];
  while (stack.length) {
    const cell = stack[stack.length - 1]!;
    const r = Math.floor(cell / cols);
    const c = cell % cols;
    const open = DIRS.filter((d) => {
      const nr = r + d.dr;
      const nc = c + d.dc;
      return nr >= 0 && nr < rows && nc >= 0 && nc < cols && !seen.has(nr * cols + nc);
    });
    if (!open.length) {
      stack.pop();
      continue;
    }
    const d = rng.pick(open);
    const next = (r + d.dr) * cols + (c + d.dc);
    walls[cell]! &= ~d.bit;
    walls[next]! &= ~d.back;
    seen.add(next);
    stack.push(next);
  }
  return walls;
}

/** Tetangga yang bisa dilalui (tanpa dinding). */
export function mazeNeighbors(
  m: Pick<MazeGrid, 'cols' | 'rows' | 'walls'>,
  cell: number,
): number[] {
  const r = Math.floor(cell / m.cols);
  const c = cell % m.cols;
  const out: number[] = [];
  for (const d of DIRS) {
    if (m.walls[cell]! & d.bit) continue;
    const nr = r + d.dr;
    const nc = c + d.dc;
    if (nr >= 0 && nr < m.rows && nc >= 0 && nc < m.cols) out.push(nr * m.cols + nc);
  }
  return out;
}

/** Jalan terpendek (BFS) dari `from` ke `to`, termasuk kedua ujung; `[]` bila tidak tersambung. */
export function mazePath(m: Pick<MazeGrid, 'cols' | 'rows' | 'walls'>, from: number, to: number) {
  const prev = new Map<number, number>([[from, -1]]);
  const queue = [from];
  while (queue.length) {
    const cell = queue.shift()!;
    if (cell === to) break;
    for (const n of mazeNeighbors(m, cell)) {
      if (prev.has(n)) continue;
      prev.set(n, cell);
      queue.push(n);
    }
  }
  if (!prev.has(to)) return [];
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0]!)!);
  return path;
}

/**
 * Langkah anak: dari `from` ke sel yang diketuk, lurus sebaris/sekolom tanpa menembus dinding (boleh
 * beberapa kotak sekaligus). Mengembalikan sel-sel yang dilewati (tanpa `from`), atau `null` bila tidak bisa.
 */
export function mazeMove(
  m: Pick<MazeGrid, 'cols' | 'rows' | 'walls'>,
  from: number,
  to: number,
): number[] | null {
  if (from === to || to < 0 || to >= m.cols * m.rows) return null;
  const fr = Math.floor(from / m.cols);
  const fc = from % m.cols;
  const tr = Math.floor(to / m.cols);
  const tc = to % m.cols;
  if (fr !== tr && fc !== tc) return null;
  const d = DIRS.find((x) => Math.sign(tr - fr) === x.dr && Math.sign(tc - fc) === x.dc)!;
  const out: number[] = [];
  let cell = from;
  while (cell !== to) {
    if (m.walls[cell]! & d.bit) return null;
    cell += d.dr * m.cols + d.dc;
    out.push(cell);
  }
  return out;
}

/** Ketukan anak ("c12") diputar ulang: posisi akhir, langkah keliru (menabrak dinding), dan jejak. */
export function mazeReplay(m: MazeGrid, taps: readonly string[]) {
  let pos = m.start;
  let slips = 0;
  const trail = [m.start];
  for (const tap of taps) {
    if (pos === m.goal) break;
    const to = Number(tap.replace(/^c/, ''));
    const step = Number.isInteger(to) ? mazeMove(m, pos, to) : null;
    if (!step) {
      slips++;
      continue;
    }
    trail.push(...step);
    pos = to;
    // Melewati pintu keluar di tengah langkah: berhenti di pintu.
    const at = step.indexOf(m.goal);
    if (at >= 0) {
      trail.length -= step.length - at - 1;
      pos = m.goal;
    }
  }
  return { pos, slips, trail, done: pos === m.goal };
}

/** Sel buntu (tiga dinding), selain awal & akhir — tempat huruf/angka pengecoh. */
export const mazeDeadEnds = (m: MazeGrid) =>
  m.walls
    .map((w, i) => ({ i, open: 4 - [1, 2, 4, 8].filter((b) => w & b).length }))
    .filter((x) => x.open === 1 && x.i !== m.start && x.i !== m.goal)
    .map((x) => x.i);

// ------------------------------------------------------------ cari kata

export type WordPlacement = { text: string; cells: number[] };

/** Arah kata: mendatar (kiri → kanan) dan menurun (atas → bawah) saja — cocok untuk PAUD. */
const WORD_DIRS = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
] as const;

const cellsOf = (cols: number, r: number, c: number, len: number, d: (typeof WORD_DIRS)[number]) =>
  Array.from({ length: len }, (_, k) => (r + d.dr * k) * cols + (c + d.dc * k));

/** Huruf pengisi: tanpa huruf yang jarang dipakai anak (Q, X) agar kotak terasa akrab. */
const FILL = 'ABCDEFGHIJKLMNOPRSTUWYZ';

/**
 * Taruh kata-kata di kotak huruf (boleh berbagi huruf yang sama), lalu isi sisanya. Ditolak (`null`) bila
 * ada kata yang tidak muat atau ada kata yang muncul lebih dari sekali.
 */
export function buildWordSearch(
  rng: Rng,
  cols: number,
  rows: number,
  words: readonly string[],
): { letters: string; placed: WordPlacement[] } | null {
  const grid: (string | null)[] = Array.from({ length: cols * rows }, () => null);
  const placed: WordPlacement[] = [];
  for (const word of words) {
    const spots: number[][] = [];
    for (const d of rng.shuffle(WORD_DIRS)) {
      const maxR = rows - (d.dr ? word.length : 1);
      const maxC = cols - (d.dc ? word.length : 1);
      for (let r = 0; r <= maxR; r++)
        for (let c = 0; c <= maxC; c++) {
          const cells = cellsOf(cols, r, c, word.length, d);
          if (cells.every((cell, k) => grid[cell] === null || grid[cell] === word[k]))
            spots.push(cells);
        }
    }
    if (!spots.length) return null;
    const cells = rng.pick(spots);
    cells.forEach((cell, k) => (grid[cell] = word[k]!));
    placed.push({ text: word, cells });
  }
  const letters = grid.map((x) => x ?? FILL[rng.int(0, FILL.length - 1)]!).join('');
  for (const w of placed) if (countWord(letters, cols, rows, w.text) !== 1) return null;
  return { letters, placed };
}

/** Berapa kali kata muncul (mendatar/menurun) di kotak huruf. */
export function countWord(letters: string, cols: number, rows: number, word: string): number {
  let n = 0;
  for (const d of WORD_DIRS)
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (r + d.dr * (word.length - 1) >= rows || c + d.dc * (word.length - 1) >= cols) continue;
        const cells = cellsOf(cols, r, c, word.length, d);
        if (cells.every((cell, k) => letters[cell] === word[k])) n++;
      }
  return n;
}

export type WordGrid = { letters: string; cols: number; rows: number };
export type WordSearchState = { found: string[]; sel: number[] };

/** Letak kata `text` bila terbaca dari sel `start` ke arah `d` (mendatar/menurun), atau `null`. */
function readFrom(g: WordGrid, start: number, d: (typeof WORD_DIRS)[number], text: string) {
  const r = Math.floor(start / g.cols);
  const c = start % g.cols;
  if (r + d.dr * (text.length - 1) >= g.rows || c + d.dc * (text.length - 1) >= g.cols) return null;
  const cells = cellsOf(g.cols, r, c, text.length, d);
  return cells.every((cell, k) => g.letters[cell] === text[k]) ? cells : null;
}

/** Kata yang belum ketemu dan cocok dengan pilihan `sel` (awal sebuah kata yang terbaca di kotak). */
function candidates(
  g: WordGrid,
  words: readonly string[],
  found: readonly string[],
  sel: number[],
) {
  if (!sel.length) return [];
  const out: { text: string; cells: number[] }[] = [];
  for (const text of words) {
    if (found.includes(text)) continue;
    for (const d of WORD_DIRS) {
      const cells = readFrom(g, sel[0]!, d, text);
      if (cells && sel.every((s, k) => cells[k] === s)) out.push({ text, cells });
    }
  }
  return out;
}

/**
 * Satu ketukan cari kata (dipakai web DAN penilaian, sehingga hasilnya sama). Anak mengetuk huruf satu per
 * satu dari huruf pertama kata, ke kanan atau ke bawah. Huruf yang tidak melanjutkan kata mana pun = slip
 * (pilihan diulang; bila huruf itu awal kata lain, langsung jadi awal pilihan baru). Ketukan ganda diabaikan.
 * Dihitung dari huruf di kotak (bukan letak kata), jadi lomba tidak perlu mengirim letak kata.
 */
export function wordSearchStep(
  g: WordGrid,
  words: readonly string[],
  s: WordSearchState,
  cell: number,
): WordSearchState & {
  slip: boolean;
  ignored: boolean;
  /** Kata yang baru ketemu dan letaknya. */
  completed?: { text: string; cells: number[] };
} {
  if (s.sel.length && s.sel[s.sel.length - 1] === cell) return { ...s, slip: false, ignored: true };
  let sel = [...s.sel, cell];
  let slip = false;
  if (!candidates(g, words, s.found, sel).length) {
    slip = true;
    sel = candidates(g, words, s.found, [cell]).length ? [cell] : [];
  }
  const done = candidates(g, words, s.found, sel).find((w) => w.cells.length === sel.length);
  if (done)
    return { found: [...s.found, done.text], sel: [], slip, ignored: false, completed: done };
  return { found: s.found, sel, slip, ignored: false };
}

/** Ketukan cari kata ("c12") diputar ulang dengan `wordSearchStep`. */
export function wordSearchReplay(g: WordGrid, words: readonly string[], taps: readonly string[]) {
  let s: WordSearchState = { found: [], sel: [] };
  let slips = 0;
  for (const tap of taps) {
    const cell = Number(tap.replace(/^c/, ''));
    if (!Number.isInteger(cell) || cell < 0 || cell >= g.cols * g.rows) {
      slips++;
      continue;
    }
    const r = wordSearchStep(g, words, s, cell);
    if (r.slip) slips++;
    s = { found: r.found, sel: r.sel };
  }
  return { ...s, slips, done: words.every((w) => s.found.includes(w)) };
}

// ------------------------------------------------------------ kartu pasangan

/**
 * Kartu dibalik dua-dua. Pasangan sama → tetap terbuka; beda → ditutup lagi (dihitung meleset). Mengetuk
 * kartu yang sudah terbuka diabaikan.
 */
export function memoryReplay(
  cards: readonly { id: string; pair: string }[],
  flips: readonly string[],
) {
  const pairOf = new Map(cards.map((c) => [c.id, c.pair]));
  const matched = new Set<string>();
  const seen = new Set<string>();
  let open: string[] = [];
  let misses = 0;
  // Kekeliruan sungguhan (D-078): pasangan kartu pertama sudah pernah terlihat, tetapi yang dibuka kartu lain.
  // Meleset karena belum pernah melihat pasangannya adalah bagian wajar dari permainan memori.
  let errors = 0;
  for (const id of flips) {
    if (!pairOf.has(id) || matched.has(id) || open.includes(id)) continue;
    open.push(id);
    if (open.length < 2) {
      seen.add(id);
      continue;
    }
    const [a, b] = open as [string, string];
    if (pairOf.get(a) === pairOf.get(b)) {
      matched.add(a);
      matched.add(b);
    } else {
      misses++;
      // Keliru bila pasangan kartu pertama sudah diketahui letaknya, atau kartu kedua sudah pernah terlihat (jadi
      // sudah diketahui bukan pasangannya).
      const mateKnown = [...seen].some((x) => x !== a && pairOf.get(x) === pairOf.get(a));
      if (mateKnown || seen.has(b)) errors++;
    }
    seen.add(b);
    open = [];
  }
  return { matched: [...matched], open, misses, errors, done: matched.size === cards.length };
}

// ------------------------------------------------------------ tangkap

/** Ketukan permainan tangkap: yang benar tertangkap; ketukan lain = meleset (benda tetap lewat). */
export function catchReplay(answer: readonly string[], taps: readonly string[]) {
  const caught = new Set<string>();
  let slips = 0;
  for (const id of taps) {
    if (answer.includes(id)) caught.add(id);
    else slips++;
  }
  return { caught: [...caught], slips, done: caught.size === answer.length };
}
