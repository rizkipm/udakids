import { numberWord } from '../generator/words.js';
import type { VoiceLang } from './voice.js';

/**
 * Naskah ucapan (D-087): teks soal ditulis untuk DIBACA (simbol, titik-titik, Rp12.500, 3/4, °C), tetapi
 * mesin suara membaca simbol dengan kaku, melewatinya, atau berhenti mendadak. Fungsi ini mengubah teks
 * tulis menjadi kalimat lisan seperti yang diucapkan guru: "10 + 9 = …" → "10 ditambah 9 sama dengan
 * titik-titik". Dipakai server (sebelum TTS & untuk kunci klip) dan suara cadangan browser. Murni &
 * deterministik; angka biasa dibiarkan sebagai angka (mesin suara membacanya dengan wajar).
 */

/** Bilangan cacah sampai 999.999.999 dalam kata ("dua belas ribu lima ratus"). */
export function bigNumberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999_999) return String(n);
  if (n < 10_000) return numberWord(n);
  const juta = Math.floor(n / 1_000_000);
  const ribu = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (juta) parts.push(`${juta === 1 ? 'satu' : bigNumberWord(juta)} juta`);
  if (ribu) parts.push(ribu === 1 ? 'seribu' : `${numberWord(ribu)} ribu`);
  if (rest) parts.push(numberWord(rest));
  return parts.join(' ');
}

const THOUSANDS = String.raw`\d{1,3}(?:\.\d{3})+(?!\d|,\d)`;
const toInt = (s: string) => Number(s.replace(/\./g, ''));
/** Operan: angka (boleh negatif/desimal, boleh diapit kurung), titik-titik, atau kotak kosong. */
const OPERAND = String.raw`(?:\(?[−-]?\d[\d.,]*\)?|…|\.\.\.|_{2,}|□|\?)`;
/** Sebelum satuan: angka atau titik-titik ("… cm"). */
const BEFORE_UNIT = String.raw`(\d|…|\.{3}|_{2,})`;
const MATH_WORDS =
  /ditambah|dikurangi|dikali|dibagi|sama dengan|kurang dari|lebih dari|atau|negatif|per|kuadrat|akar/g;

const UNITS: [RegExp, string][] = [
  [/°\s?C\b/g, ' derajat Celsius'],
  [/°\s?F\b/g, ' derajat Fahrenheit'],
  [/°\s?R\b/g, ' derajat Reamur'],
  [/°/g, ' derajat'],
  [/(\d|…)\s?km\/jam\b/g, '$1 kilometer per jam'],
  [/(\d)\s?m\/s²/g, '$1 meter per sekon kuadrat'],
  [/(\d)\s?m\/s\b/g, '$1 meter per sekon'],
  [/(\d)\s?kg\/m³/g, '$1 kilogram per meter kubik'],
  [/(\d)\s?g\/cm³/g, '$1 gram per sentimeter kubik'],
  [/(\d)\s?(km|cm|mm|dm|m)²/g, '$1 $2 persegi'],
  [/(\d)\s?(km|cm|mm|dm|m)³/g, '$1 $2 kubik'],
  [/(\d)\s?%/g, '$1 persen'],
];
/** Satuan singkat setelah angka → kata (hanya yang jelas maknanya). */
const UNIT_WORDS: Record<string, string> = {
  km: 'kilometer',
  cm: 'sentimeter',
  mm: 'milimeter',
  dm: 'desimeter',
  m: 'meter',
  kg: 'kilogram',
  g: 'gram',
  mL: 'mililiter',
  ml: 'mililiter',
  L: 'liter',
};

const SIGN_NAMES: Record<string, string> = {
  '<': 'kurang dari',
  '>': 'lebih dari',
  '=': 'sama dengan',
  '+': 'tambah',
  '×': 'kali',
};

function indonesian(text: string): string {
  let t = text;
  // Menyebut tanda: "tanda >" → "tanda lebih dari".
  t = t.replace(/\btanda\s([<>=+×])/g, (_, c: string) => `tanda ${SIGN_NAMES[c]}`);
  // Rupiah & ribuan bertitik: "Rp12.500" → "dua belas ribu lima ratus rupiah"; "12.500" → kata.
  t = t.replace(
    new RegExp(String.raw`Rp\s?(${THOUSANDS}|\d+)`, 'g'),
    (_, n: string) => `${bigNumberWord(toInt(n))} rupiah`,
  );
  t = t.replace(new RegExp(String.raw`(?<![\d.])${THOUSANDS}`, 'g'), (n) =>
    bigNumberWord(toInt(n)),
  );
  // Jam: "pukul 07.00" → "pukul tujuh", "09.30 WIB" → "sembilan tiga puluh WIB".
  const clock = (h: string, m: string) =>
    `${numberWord(Number(h))}${Number(m) ? ` ${numberWord(Number(m))}` : ''}`;
  t = t.replace(
    /\b(pukul|jam)\s(\d{1,2})[.:](\d{2})\b/gi,
    (_, w: string, h: string, m: string) => `${w} ${clock(h, m)}`,
  );
  // Desimal Indonesia memakai koma dan ribuan bertitik tiga digit, jadi "09.30" / "7.15" = jam.
  t = t.replace(/(?<![\d.,])([01]?\d|2[0-3])\.([0-5]\d)(?![\d.,])/g, (_, h: string, m: string) =>
    clock(h, m),
  );
  // Satuan.
  for (const [re, to] of UNITS) t = t.replace(re, to);
  t = t.replace(
    new RegExp(String.raw`${BEFORE_UNIT}\s?(km|cm|mm|dm|mL|ml|kg|m|g|L)\b(?![²³/])`, 'g'),
    (_, d: string, u: string) => `${d} ${UNIT_WORDS[u]}`,
  );
  // Bilangan negatif dalam kurung: "(−7)" → "−7".
  t = t.replace(/\(\s*([−-]\d[\d.,]*)\s*\)/g, '$1');
  // Pangkat, akar, pi.
  t = t.replace(/([\dA-Za-z])²/g, '$1 kuadrat').replace(/([\dA-Za-z])³/g, '$1 pangkat tiga');
  t = t.replace(/√\s?/g, 'akar ').replace(/π/g, ' pi ').replace(/α/g, ' alfa ');
  // Pecahan "3/4" → "3 per 4".
  t = t.replace(/(?<![\d/])(\d{1,4})\/(\d{1,4})(?![\d/])/g, '$1 per $2');
  // Rentang "1–5" → "1 sampai 5".
  t = t.replace(/(\d)\s?–\s?(\d)/g, '$1 sampai $2');
  // Operasi hitung di antara operan.
  const op = (sym: string, word: string) => {
    const re = new RegExp(String.raw`(${OPERAND})\s*${sym}\s*(?=${OPERAND})`, 'g');
    t = t.replace(re, `$1 ${word} `);
  };
  op('\\+', 'ditambah');
  op('×', 'dikali');
  op('÷', 'dibagi');
  op(' : ', 'dibagi');
  op('≤', 'kurang dari atau sama dengan');
  op('≥', 'lebih dari atau sama dengan');
  op('<', 'kurang dari');
  op('>', 'lebih dari');
  op('=', 'sama dengan');
  op(' [−-] ', 'dikurangi');
  // Sisa tanda di antara kata ("Pen + cil", "lalu − 2", "sudut > 90"), "+10", dan "= …" tanpa operan.
  t = t.replace(/\s=\s/g, ' sama dengan ').replace(/\s\+\s/g, ' ditambah ');
  t = t.replace(/\s[−]\s/g, ' dikurangi ').replace(/\s×\s/g, ' dikali ');
  t = t.replace(/\s>\s/g, ' lebih dari ').replace(/\s<\s/g, ' kurang dari ');
  t = t.replace(/(^|\s)\+(\d)/g, '$1tambah $2');
  // Garis miring antarkata: "He/She", "masuk/di dalam" → "atau".
  t = t.replace(/([A-Za-z])\s?\/\s?([A-Za-z])/g, '$1 atau $2');
  t = t.replace(/\s?\/\s?(\d)/g, ' per $1');
  t = t.replace(/(^|[\s(])[−-](\d)/g, '$1negatif $2');
  // Titik-titik dan kotak kosong.
  t = t.replace(/…|\.{3}|_{2,}/g, ' titik-titik ');
  t = t.replace(/□/g, ' kotak ');
  // Kurung berisi hitungan → tanpa kurung, dengan jeda ("(3 ditambah 4) dikali 2").
  t = t.replace(/\(([^()]*\d[^()]*)\)/g, (all, inner: string) =>
    /[A-Za-z]/.test(inner.replace(MATH_WORDS, '')) ? all : `${inner},`,
  );
  t = t.replace(/→/g, ', lalu ');
  // Singkatan umum.
  t = t.replace(/\bdll\./g, 'dan lain-lain').replace(/\bdsb\./g, 'dan sebagainya');
  t = t.replace(/\bmis\./g, 'misalnya').replace(/\byg\b/g, 'yang');
  return t;
}

function english(text: string): string {
  let t = text;
  const op = (sym: string, word: string) => {
    const re = new RegExp(String.raw`(${OPERAND})\s*${sym}\s*(?=${OPERAND})`, 'g');
    t = t.replace(re, `$1 ${word} `);
  };
  op('\\+', 'plus');
  op('×', 'times');
  op('=', 'equals');
  op(' [−-] ', 'minus');
  t = t.replace(/\s=\s/g, ' equals ');
  t = t.replace(/([A-Za-z])\s?\/\s?([A-Za-z])/g, '$1 or $2');
  t = t.replace(/…|\.{3}|_{2,}/g, ' blank ');
  return t;
}

/** Ubah teks tulis menjadi naskah ucapan untuk mesin suara (Indonesia atau English). */
export function speechText(text: string, lang: VoiceLang = 'id-ID'): string {
  let t = text.replace(/\r/g, '');
  // Baris baru: jadi jeda kalimat.
  t = t.replace(/([^.!?:;,])\s*\n+\s*/g, '$1. ').replace(/\s*\n+\s*/g, ' ');
  t = lang === 'id-ID' ? indonesian(t) : english(t);
  // Tanda kutip tidak diucapkan; isi kurung jadi sisipan berjeda ("slow (lambat)" → "slow, lambat,").
  t = t.replace(/["“”]/g, '');
  if (lang === 'id-ID') t = t.replace(/\s*\(([^()]{1,80})\)/g, ', $1,');
  // Rapikan spasi & tanda baca yang berdempet.
  t = t
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/,(\s*,)+/g, ',')
    .replace(/,\s*([.!?])/g, '$1')
    .replace(/([.!?])\s*,/g, '$1')
    .replace(/([!?])\./g, '$1')
    .replace(/:\s*,/g, ':')
    .trim();
  return t;
}
