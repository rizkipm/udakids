import type { Item } from '../generator/item.js';
import { generateItem, type SkillTemplate } from '../generator/template.js';
import { QUIZ_LENGTH, quizBand } from './quiz.js';

/**
 * Susun satu ronde level (D-028): 10 soal, band mudah → sulit sesuai `quizBand` (tetap di level yang
 * sama), TANPA soal kembar di dalam ronde, dan sebisa mungkin TIDAK mengulang soal dari ronde-ronde
 * sebelumnya (`avoid` = sidik jari soal yang sudah pernah keluar). Bila variasi soal di level itu memang
 * sedikit (mis. bank soal kecil), soal lama dipakai lagi, mulai dari yang paling lama tidak muncul.
 */
export const ROUND_ATTEMPTS = 40;
/** Banyak kunci soal terakhir yang diingat per skill (≈ 3 ronde). */
export const RECENT_PER_SKILL = 30;

/** Sidik jari soal: sama bila isi soal sama, walau urutan pilihan diacak berbeda. */
export function itemFingerprint(item: Pick<Item, 'prompt' | 'stimulus' | 'interaction'>): string {
  // Soal "urutkan": urutan awal kartu adalah soalnya, jadi tidak diurutkan.
  const keepOrder = item.interaction.type === 'order';
  return canonical({ p: item.prompt, s: item.stimulus, i: item.interaction }, false, keepOrder);
}

/** Hash 53-bit cyrb53 (deterministik, tanpa Web Crypto) → string base36 pendek. */
function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Kunci pendek soal (hash sidik jari) untuk disimpan sebagai riwayat di perangkat. */
export const itemKey = (item: Pick<Item, 'prompt' | 'stimulus' | 'interaction'>) =>
  cyrb53(itemFingerprint(item));

/** Riwayat baru: kunci ronde ini ditaruh paling belakang (terbaru), dibatasi `RECENT_PER_SKILL`. */
export function rememberRound(prev: readonly string[] | undefined, round: readonly string[]) {
  const set = new Set(round);
  return [...(prev ?? []).filter((k) => !set.has(k)), ...round].slice(-RECENT_PER_SKILL);
}

/**
 * JSON kanonik: kunci objek diurutkan; hanya daftar `choices` (pilihan jawaban yang posisinya diacak saat
 * tampil) yang diurutkan. Urutan lain tetap dihitung, mis. urutan awal kartu di soal "urutkan angka".
 */
function canonical(v: unknown, sortList = false, keepOrder = false): string {
  if (Array.isArray(v)) {
    const parts = v.map((x) => canonical(x, false, keepOrder));
    return `[${(sortList ? [...parts].sort() : parts).join(',')}]`;
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map(
        (k) => `${JSON.stringify(k)}:${canonical(o[k], k === 'choices' && !keepOrder, keepOrder)}`,
      )
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

export function generateRound(
  template: SkillTemplate,
  /** `avoid` = kunci soal (`itemKey`) yang sudah pernah keluar, urut paling lama → paling baru. */
  opts: { seed: number; avoid?: readonly string[]; length?: number },
): Item[] {
  const length = opts.length ?? QUIZ_LENGTH;
  // Urutan `avoid` = paling lama → paling baru; indeks lebih kecil = lebih pantas dipakai ulang.
  const age = new Map<string, number>();
  (opts.avoid ?? []).forEach((fp, i) => age.set(fp, i));
  const used = new Map<string, number>(); // kunci → berapa kali sudah dipakai di ronde ini
  const round: Item[] = [];
  let lastKey = '';
  for (let i = 0; i < length; i++) {
    const band = quizBand(i);
    let fresh: Item | undefined;
    let old: { item: Item; age: number } | undefined;
    // Cadangan terakhir (variasi habis): paling jarang di ronde ini, dan bukan soal yang barusan.
    let repeat: { item: Item; score: number } | undefined;
    for (let attempt = 0; attempt < ROUND_ATTEMPTS && !fresh; attempt++) {
      const seed = (opts.seed + i * 7919 + attempt * 104_729) % 2_147_483_647;
      const item = generateItem(template, { seed, band });
      const key = itemKey(item);
      const times = used.get(key) ?? 0;
      if (times > 0) {
        const score = times * 2 + (key === lastKey ? 100 : 0);
        if (!repeat || score < repeat.score) repeat = { item, score };
        continue;
      }
      const seenAt = age.get(key);
      if (seenAt === undefined) fresh = item;
      else if (!old || seenAt < old.age) old = { item, age: seenAt };
    }
    const pick = fresh ?? old?.item ?? repeat!.item;
    lastKey = itemKey(pick);
    used.set(lastKey, (used.get(lastKey) ?? 0) + 1);
    round.push(pick);
  }
  return round;
}
