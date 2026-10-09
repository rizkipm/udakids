import { BODY_PARTS, OBJECTS, SAY_COLOR, SENSES, SHAPES, SOLIDS } from '../generator/assets.js';
import { EN_NUMBERS, EN_WORDS } from '../generator/english-vocab.js';
import { ALPHABET, STROKE_NAMES } from '../generator/glyphs.js';
import { generateItem, type SkillTemplate } from '../generator/template.js';
import type { Item } from '../generator/item.js';
import { numberWord, ordinalWord, parseNumberWord } from '../generator/words.js';
import {
  cutLong,
  langSegments,
  SEGMENT_MAX,
  speechSegments,
  splitSentences,
} from './voice-split.js';
import { exampleAnswerSay } from './auto-lesson.js';
import type { Lesson } from './lesson.js';

/**
 * Daftar teks yang boleh dibuatkan suara Chirp (D-091). Semua suara aplikasi memakai suara server, tetapi
 * server TIDAK membuat suara untuk teks bebas dari perangkat: teks harus berasal dari aplikasi sendiri —
 * template i18n (dengan isian), teks katalog & dialog, kalimat soal (diturunkan ulang dari skill + seed),
 * kalimat pelajaran (termasuk pelajaran otomatis), atau kosakata aplikasi (angka, huruf, nama benda, warna).
 * Fungsi murni: server menyusun daftarnya, perangkat cukup mengirim teks + konteks soal/pelajaran.
 */

/** Template ber-isian: regex + banyak huruf tetap (bukan isian) di template itu. */
export type VoicePattern = { re: RegExp; literal: number };

export type VoiceAllowList = {
  exact: ReadonlySet<string>;
  patterns: readonly VoicePattern[];
  words: ReadonlySet<string>;
};

/** Batas panjang teks yang dibuatkan suara (sama dengan kalimat terpanjang di aplikasi). */
export const VOICE_TEXT_MAX = 600;

export const normalizeVoiceText = (t: string) => t.replace(/\s+/g, ' ').trim();
/** Tanda baca di akhir kalimat diabaikan saat mencocokkan (perangkat sering menambah "." saat menggabung teks). */
const TRAIL = /[\s.!?…,:;]+$/u;
const key = (t: string) => normalizeVoiceText(t).toLowerCase().replace(TRAIL, '');

/** Pecah per kalimat (. ! ? …), tanpa lookbehind supaya juga aman di browser lama. */
export function voiceSentences(text: string): string[] {
  return (normalizeVoiceText(text).match(/[^.!?…]+[.!?…]*/g) ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Kata-kata (huruf kecil, tanpa tanda baca) dari sebuah teks. */
export const voiceTokens = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}'’-]+/u)
    .map((w) => w.replace(/^[-'’]+|[-'’]+$/g, ''))
    .filter(Boolean);

/** Isian template (nama, angka, judul): huruf, angka, spasi, dan tanda baca ringan, maks 40 huruf. */
const SLOT = "[\\p{L}\\p{N} '’.,:;/()&+×÷=<>–—-]{0,40}";
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Template i18n → regex utuh (huruf besar/kecil diabaikan). `{nama}` = isian. */
export function voiceTemplateRegex(template: string): RegExp {
  const parts = normalizeVoiceText(template)
    .replace(TRAIL, '')
    .split(/\{\w+\}/);
  return new RegExp(`^${parts.map(escape).join(SLOT)}[.!?…,:;]*$`, 'iu');
}

/** Banyak huruf/angka tetap di template (di luar isian). */
const literalOf = (template: string) =>
  (template.replace(/\{\w+\}/g, '').match(/[\p{L}\p{N}]/gu) ?? []).length;

/** Template yang terlalu banyak isiannya (mis. "{name}", "{kind} {provider}") tidak dipakai. */
const MIN_LITERAL = 3;

function pattern(template: string): VoicePattern | undefined {
  const literal = literalOf(template);
  return literal >= MIN_LITERAL ? { re: voiceTemplateRegex(template), literal } : undefined;
}

/**
 * Cocok dengan template? Isian tidak boleh mendominasi kalimat: huruf tetap template ≥ 30% dari huruf kalimat
 * (atau ≥ 20 huruf), supaya "Halo, {name}" tidak bisa dipakai untuk mengucapkan kalimat bebas.
 */
function matchesPattern(p: VoicePattern, text: string): boolean {
  if (!p.re.test(text)) return false;
  const letters = (text.match(/[\p{L}\p{N}]/gu) ?? []).length;
  return p.literal >= 20 || p.literal >= letters * 0.3;
}

/**
 * Susun daftar dari teks utuh, template ber-isian, dan kosakata. Hanya `words` (kosakata aplikasi: angka, huruf,
 * nama benda) yang boleh dirangkai bebas — kata dari kalimat lain tidak, supaya tidak bisa menyusun kalimat bebas.
 */
export function buildVoiceAllowList(input: {
  texts?: Iterable<string>;
  templates?: Iterable<string>;
  words?: Iterable<string>;
}): VoiceAllowList {
  const exact = new Set<string>();
  const patterns: VoicePattern[] = [];
  const words = new Set<string>();
  const addText = (t: string) => {
    if (!t || typeof t !== 'string') return;
    exact.add(key(t));
    for (const s of voiceSentences(t)) exact.add(key(s));
    // Potongan yang dibacakan perangkat per bahasa/panjang (D-098).
    for (const base of ['id-ID', 'en-GB'] as const)
      for (const s of langSegments(t, base)) exact.add(key(s.text));
    for (const s of speechSegments(t)) exact.add(key(s));
    for (const s of splitSentences(t)) {
      for (const piece of cutLong(s, SEGMENT_MAX)) exact.add(key(piece));
      // Label pendek ("Contoh:", "Ingat:") yang dibacakan terpisah dari isinya.
      const m = /^([^:]{1,24}):\s+(.+)$/.exec(s);
      if (m && m[1]!.split(' ').length <= 3) {
        exact.add(key(`${m[1]}:`));
        exact.add(key(m[2]!));
      }
    }
  };
  for (const t of input.texts ?? []) addText(t);
  for (const tpl of input.templates ?? []) {
    if (!/\{\w+\}/.test(tpl)) {
      addText(tpl);
      continue;
    }
    const whole = pattern(tpl);
    if (whole) patterns.push(whole);
    // Template beberapa kalimat: setiap kalimat bisa diucapkan terpisah atau digabung dengan teks lain.
    for (const s of voiceSentences(tpl))
      if (/\{\w+\}/.test(s)) {
        const p = pattern(s);
        if (p) patterns.push(p);
      } else exact.add(key(s));
  }
  for (const w of input.words ?? []) for (const x of voiceTokens(w)) words.add(x);
  return { exact, patterns, words };
}

/** Nama panggilan / isian pendek tanpa kalimat (mis. "Aimar." sebelum "Ketuk tiga gambar sandimu"). */
const isShortName = (s: string) =>
  s.length <= 30 && /^[\p{L} '’-]+[.!?]?$/u.test(s) && voiceTokens(s).length <= 3;

/** Satu kalimat boleh diucapkan menurut salah satu daftar? */
function sentenceAllowed(s: string, lists: readonly VoiceAllowList[]): boolean {
  const k = key(s);
  if (!k) return true;
  for (const l of lists) {
    if (l.exact.has(k)) return true;
    if (l.patterns.some((p) => matchesPattern(p, normalizeVoiceText(s)))) return true;
  }
  // Label + teks (mis. "Ingat: " + tip topik, "Contoh 1: " + kalimat soal): periksa kedua bagiannya.
  const colon = s.indexOf(': ');
  if (colon > 0 && colon < s.length - 2)
    return (
      sentenceAllowed(s.slice(0, colon + 1), lists) && sentenceAllowed(s.slice(colon + 2), lists)
    );
  const tokens = voiceTokens(s);
  // Rangkaian kosakata aplikasi (mis. "huruf b besar", "tujuh, gajah", "satu dua tiga").
  if (
    tokens.length > 0 &&
    tokens.length <= 16 &&
    tokens.every((w) => lists.some((l) => l.words.has(w)))
  )
    return true;
  return isShortName(s);
}

/**
 * Teks boleh dibuatkan suara? Utuh cocok dengan salah satu daftar, atau setiap kalimatnya cocok (kalimat buatan
 * perangkat sering menggabungkan beberapa teks aplikasi: "Huruf b. Ketuk semua huruf b?").
 */
export function voiceTextAllowed(text: string, lists: readonly VoiceAllowList[]): boolean {
  const n = normalizeVoiceText(text);
  if (!n || n.length > VOICE_TEXT_MAX) return false;
  const k = n.toLowerCase();
  // Kata bilangan apa pun (mis. alat peraga Kelas 4 sampai jutaan, D-096) aman diucapkan.
  if (parseNumberWord(k.replace(/[.!?,]+$/, '')) !== undefined) return true;
  for (const l of lists) {
    if (l.exact.has(k)) return true;
    if (l.patterns.some((p) => matchesPattern(p, n))) return true;
  }
  // Juga dengan pemecah kalimat perangkat (D-098): rangkaian kalimat yang digabung per bahasa.
  return (
    voiceSentences(n).every((s) => sentenceAllowed(s, lists)) ||
    splitSentences(n).every((s) => sentenceAllowed(s, lists))
  );
}

/** Semua teks (string) di dalam sebuah objek: soal, pelajaran, katalog. */
export function collectTexts(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    if (value.length > 0 && value.length <= VOICE_TEXT_MAX) out.push(value);
  } else if (Array.isArray(value)) for (const v of value) collectTexts(v, out);
  else if (value && typeof value === 'object')
    for (const v of Object.values(value as Record<string, unknown>)) collectTexts(v, out);
  return out;
}

/** Teks yang boleh diucapkan untuk satu soal: semua kalimat & kartu di soal + kalimat jawaban video. */
export function itemVoiceTexts(item: Item): string[] {
  const out = collectTexts(item);
  out.push(exampleAnswerSay(item));
  return out;
}

/** Teks satu pelajaran (manual/otomatis) + soal contoh di videonya dan soal "coba". */
export function lessonVoiceTexts(lesson: Lesson, skills: readonly SkillTemplate[]): string[] {
  const out = collectTexts(lesson);
  const examples = lesson.layar.flatMap((s) => [
    ...(s.contoh ? [s.contoh] : []),
    ...(s.adegan ?? []).flatMap((a) => (a.contoh ? [a.contoh] : [])),
  ]);
  for (const ex of examples) {
    const skill = skills.find((k) => k.order === ex.level);
    if (!skill) continue;
    try {
      out.push(...itemVoiceTexts(generateItem(skill, { seed: ex.seed, band: 0 })));
    } catch {
      /* soal contoh yang tidak bisa dibuat tidak diucapkan */
    }
  }
  return out;
}

/** Kosakata aplikasi: angka, urutan, huruf, nama benda/bentuk/warna, alat indra, kata English. */
export function voiceVocabulary(): string[] {
  const out: string[] = [];
  for (let n = 0; n <= 1000; n++) out.push(numberWord(n));
  for (let n = 1; n <= 30; n++) out.push(ordinalWord(n));
  out.push(
    ...ALPHABET,
    'huruf',
    'besar',
    'kecil',
    'nol',
    'negatif',
    'minus',
    'rupiah',
    'ribu',
    'juta',
    // Alat peraga Kelas 4 (D-096): "sembilan puluh derajat", "tiga puluh tujuh perseratus".
    'derajat',
    'perseratus',
    'persepuluh',
    'koma',
    'kotak',
  );
  out.push(...Object.values(OBJECTS).map((o) => o.say));
  out.push(...Object.values(SHAPES).map((o) => o.say));
  out.push(...Object.values(SOLIDS).map((o) => o.say));
  out.push(...Object.values(SAY_COLOR));
  out.push(...Object.values(BODY_PARTS));
  out.push(...Object.values(SENSES).flatMap((s) => [s.say, s.indra, s.verb]));
  out.push(...Object.values(STROKE_NAMES));
  out.push(...EN_WORDS.flatMap((w) => [w.word, w.id]), ...EN_NUMBERS);
  return out;
}
