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
  if (!Number.isInteger(n) || n < 0 || n > 9999) return String(n);
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
  const th = Math.floor(n / 1000);
  const rest = n % 1000;
  return `${th === 1 ? 'seribu' : `${numberWord(th)} ribu`}${rest ? ` ${numberWord(rest)}` : ''}`;
}

/** Bilangan bulat termasuk negatif: −3 → "negatif tiga" (D-078, lompat kodok bilangan bulat). */
export const signedWord = (n: number) => (n < 0 ? `negatif ${numberWord(-n)}` : numberWord(n));

/** 1 → "pertama", 2 → "kedua", ... */
export function ordinalWord(n: number): string {
  return n === 1 ? 'pertama' : `ke${numberWord(n)}`;
}

export const rupiahWord = (value: number) => `${numberWord(value)} rupiah`;
