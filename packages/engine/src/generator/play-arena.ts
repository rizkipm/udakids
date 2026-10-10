/**
 * Arena game Momo (D-115): logika murni game baru per jenjang — ronde bertema (balap, dadu, tendang, hoki,
 * balon), gelembung berurutan, papan angka kembang api, ular/balok nilai tempat, bersihkan papan, atur jam, dan
 * pizza pecahan. Web hanya menggambar dan mengirim ketukan; penilaian dihitung ulang di sini.
 */

export type QuestTheme = 'race' | 'boat' | 'dice' | 'domino' | 'kick' | 'hockey' | 'balloon';

/** Bagian bilangan untuk ular/balok nilai tempat. */
export const TENS_PLACES = ['ribu', 'ratus', 'puluh', 'satu'] as const;
export type TensPlace = (typeof TENS_PLACES)[number];
export const PLACE_VALUE: Record<TensPlace, number> = {
  ribu: 1000,
  ratus: 100,
  puluh: 10,
  satu: 1,
};
/** Paling banyak 9 per bagian, jadi susunannya tunggal (seperti nilai tempat). */
export const TENS_MAX = 9;

/** Ronde: ketukan `"<id ronde>:<id pilihan>"`, berurutan (sama dengan Penyihir Hitung). */
export function questReplay(
  rounds: readonly { id: string; answer: string }[],
  taps: readonly string[],
) {
  let k = 0;
  let slips = 0;
  for (const tap of taps) {
    if (k >= rounds.length) break;
    const r = rounds[k]!;
    if (tap === `${r.id}:${r.answer}`) k++;
    else slips++;
  }
  return { solved: k, slips, done: k === rounds.length };
}

/** Gelembung/batu: ketuk berurutan; ketukan lain = keliru (gelembung yang sudah pecah diabaikan). */
export function bubblesReplay(answer: readonly string[], taps: readonly string[]) {
  let k = 0;
  let slips = 0;
  for (const tap of taps) {
    if (k >= answer.length) break;
    if (tap === answer[k]) k++;
    else if (!answer.slice(0, k).includes(tap)) slips++;
  }
  return { popped: k, slips, done: k === answer.length };
}

/** Papan angka mode "semua": setiap sasaran sekali, urutan bebas; sel lain = keliru. */
export function gridTargetsReplay(targets: readonly string[], taps: readonly string[]) {
  const found = new Set<string>();
  let slips = 0;
  for (const tap of taps) {
    if (targets.includes(tap)) found.add(tap);
    else slips++;
  }
  return { found: [...found], slips, done: found.size === targets.length };
}

export const clearPair = (op: '+' | '×', a: number, b: number) => (op === '+' ? a + b : a * b);

/**
 * Bersihkan papan: dua ketukan = satu pasangan. Pasangan yang hasilnya `target` hilang dari papan; pasangan lain
 * = keliru (pilihannya dilepas). Ketuk kotak yang sama dua kali = batal memilih; kotak yang sudah hilang diabaikan.
 */
export function clearReplay(
  it: { op: '+' | '×'; target: number; tiles: readonly { id: string; value: number }[] },
  taps: readonly string[],
) {
  const value = new Map(it.tiles.map((t) => [t.id, t.value]));
  const cleared = new Set<string>();
  let pending: string | undefined;
  let slips = 0;
  for (const tap of taps) {
    if (!value.has(tap) || cleared.has(tap)) continue;
    if (pending === undefined) {
      pending = tap;
      continue;
    }
    if (pending === tap) {
      pending = undefined;
      continue;
    }
    if (clearPair(it.op, value.get(pending)!, value.get(tap)!) === it.target) {
      cleared.add(pending);
      cleared.add(tap);
    } else slips++;
    pending = undefined;
  }
  return {
    cleared: [...cleared],
    pending,
    slips,
    done: cleared.size === it.tiles.length,
  };
}

/** Nilai susunan ular/balok, atau `undefined` bila ada bagian di luar 0–9 / bukan bagian soal. */
export function tensValue(
  places: readonly TensPlace[],
  value: Record<string, string>,
): number | undefined {
  let total = 0;
  for (const [k, v] of Object.entries(value)) {
    if (!places.includes(k as TensPlace)) return undefined;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > TENS_MAX) return undefined;
    total += n * PLACE_VALUE[k as TensPlace];
  }
  return total;
}

/** "7:05" → menit sejak pukul 12.00 (0–719), atau `undefined`. Jam 1–12. */
export function clockMinutes(v: string): number | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 1 || h > 12 || min > 59) return undefined;
  return (h % 12) * 60 + min;
}
export const clockValue = (hour: number, minute: number) =>
  `${((hour + 11) % 12) + 1}:${String(minute).padStart(2, '0')}`;

/** Potongan yang diwarnai (id `w<pizza>s<potong>`), unik dan ada di papan. */
export function pizzaCount(
  it: { wholes: number; parts: number },
  value: readonly string[],
): number | undefined {
  const seen = new Set<string>();
  for (const id of value) {
    const m = /^w(\d+)s(\d+)$/.exec(id);
    if (!m || Number(m[1]) >= it.wholes || Number(m[2]) >= it.parts || seen.has(id))
      return undefined;
    seen.add(id);
  }
  return seen.size;
}

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

/** Bulatkan ke kelipatan `unit` terdekat (setengah dibulatkan ke atas, seperti di buku SD). */
export const roundTo = (n: number, unit: number) => Math.floor(n / unit + 0.5) * unit;

/** Urutan ketukan yang membersihkan papan (untuk "lihat jawaban" & uji). */
export function clearSolution(it: {
  op: '+' | '×';
  target: number;
  tiles: readonly { id: string; value: number }[];
}): string[] {
  const left = [...it.tiles];
  const out: string[] = [];
  while (left.length) {
    const a = left.shift()!;
    const k = left.findIndex((b) => clearPair(it.op, a.value, b.value) === it.target);
    if (k < 0) return out;
    out.push(a.id, left[k]!.id);
    left.splice(k, 1);
  }
  return out;
}

/** Susunan nilai tempat `target` (maks. 9 per bagian). */
export const tensParts = (target: number, places: readonly TensPlace[]) =>
  Object.fromEntries(
    places.map((pl) => [pl, String(Math.floor(target / PLACE_VALUE[pl]) % 10)]),
  ) as Record<string, string>;
