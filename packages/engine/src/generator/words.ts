// Bilangan dan urutan dalam Bahasa Indonesia untuk suara (TTS) dan teks.
const UNITS = [
  'nol',
  'satu',
  'dua',
  'tiga',
  'empat',
  'lima',
  'enam',
  'tujuh',
  'delapan',
  'sembilan',
];

export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999_999) return String(n);
  if (n < 10) return UNITS[n]!;
  if (n === 10) return 'sepuluh';
  if (n === 11) return 'sebelas';
  if (n < 20) return `${UNITS[n - 10]} belas`;
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    return `${UNITS[t]} puluh${u ? ` ${UNITS[u]}` : ''}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return `${h === 1 ? 'seratus' : `${UNITS[h]} ratus`}${rest ? ` ${numberWord(rest)}` : ''}`;
  }
  if (n < 1_000_000) {
    const th = Math.floor(n / 1000);
    const rest = n % 1000;
    return `${th === 1 ? 'seribu' : `${numberWord(th)} ribu`}${rest ? ` ${numberWord(rest)}` : ''}`;
  }
  // Kelas 4 (D-096): sampai ratusan juta.
  const m = Math.floor(n / 1_000_000);
  const rest = n % 1_000_000;
  return `${numberWord(m)} juta${rest ? ` ${numberWord(rest)}` : ''}`;
}

const DIGIT_WORDS = new Map(UNITS.map((w, i) => [w, i]));

/**
 * Kebalikan `numberWord` (D-096): "empat ribu tujuh ratus dua puluh lima" → 4725; `undefined` bila bukan kata
 * bilangan yang ditulis persis seperti `numberWord` (dipakai daftar suara yang boleh dibuat server).
 */
export function parseNumberWord(text: string): number | undefined {
  const words = text.trim().toLowerCase().split(/\s+/);
  let total = 0;
  let small = 0;
  let last = 0;
  for (const w of words) {
    const d = DIGIT_WORDS.get(w);
    if (d !== undefined) {
      small += d;
      last = d;
    } else if (w === 'sepuluh') small += 10;
    else if (w === 'sebelas') small += 11;
    else if (w === 'belas') small += 10;
    else if (w === 'puluh') small += last * 9;
    else if (w === 'seratus') small += 100;
    else if (w === 'ratus') small += last * 99;
    else if (w === 'seribu') total += 1000;
    else if (w === 'ribu') {
      total += small * 1000;
      small = 0;
    } else if (w === 'juta') {
      total += small * 1_000_000;
      small = 0;
    } else return undefined;
  }
  const n = total + small;
  return numberWord(n) === words.join(' ') ? n : undefined;
}

/** Bilangan bulat termasuk negatif: −3 → "negatif tiga" (D-078, lompat kodok bilangan bulat). */
export const signedWord = (n: number) => (n < 0 ? `negatif ${numberWord(-n)}` : numberWord(n));

/** 1 → "pertama", 2 → "kedua", ... */
export function ordinalWord(n: number): string {
  return n === 1 ? 'pertama' : `ke${numberWord(n)}`;
}

export const rupiahWord = (value: number) => `${numberWord(value)} rupiah`;
