import { isAudioOnlyItem } from '../content/voice.js';
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
export function itemFingerprint(
  item: Pick<Item, 'prompt' | 'stimulus' | 'interaction'> & { say?: string },
): string {
  // Soal "urutkan": urutan awal kartu adalah soalnya, jadi tidak diurutkan.
  const keepOrder = item.interaction.type === 'order';
  // Soal dengar (isinya hanya di suara, mis. "Dengarkan dua bunyi…", D-081): yang diucapkan ikut menentukan soal.
  const heard = item.say !== undefined && isAudioOnlyItem({ prompt: item.prompt, say: item.say });
  return canonical(
    { p: item.prompt, s: item.stimulus, i: item.interaction, ...(heard && { v: item.say }) },
    false,
    keepOrder,
  );
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
export const itemKey = (
  item: Pick<Item, 'prompt' | 'stimulus' | 'interaction'> & { say?: string },
) => cyrb53(itemFingerprint(item));

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

/**
 * Inti soal: kalimat + yang diucapkan (soal dengar) + gambar soal + jawaban benarnya. Dua soal dengan inti sama terasa "soal yang sama"
 * bagi anak walau pengecohnya berbeda (mis. "Kelinci makan apa?" → wortel), jadi tidak boleh kembar di satu
 * ronde selama bank soal masih punya pilihan lain.
 */
export function itemCoreKey(
  item: Pick<Item, 'prompt' | 'stimulus' | 'interaction'> & { say?: string },
): string {
  const i = item.interaction;
  if (i.type === 'pick-one' || i.type === 'tap-all') {
    const ans = new Set(Array.isArray(i.answer) ? i.answer : [i.answer]);
    const right = i.choices.filter((c) => ans.has(c.id)).map((c) => canonical(c.visual));
    return cyrb53(canonical({ p: item.prompt, v: item.say, s: item.stimulus, a: right.sort() }));
  }
  return itemKey(item);
}

/**
 * Kalimat + gambar soal saja: sebisa mungkin tidak terulang di satu ronde. Pada soal dengar, yang diucapkan
 * (`say`) adalah isi soalnya, jadi ikut dihitung.
 */
const promptKey = (item: Pick<Item, 'prompt' | 'stimulus'> & { say?: string }) =>
  cyrb53(canonical({ p: item.prompt, v: item.say, s: item.stimulus }));

export function generateRound(
  template: SkillTemplate,
  /** `avoid` = kunci soal (`itemKey`) yang sudah pernah keluar, urut paling lama → paling baru. */
  opts: { seed: number; avoid?: readonly string[]; length?: number },
): Item[] {
  const length = opts.length ?? QUIZ_LENGTH;
  // Urutan `avoid` = paling lama → paling baru; indeks lebih kecil = lebih pantas dipakai ulang.
  const age = new Map<string, number>();
  (opts.avoid ?? []).forEach((fp, i) => age.set(fp, i));
  const span = Math.max(1, opts.avoid?.length ?? 1);
  const usedKey = new Map<string, number>(); // soal identik → berapa kali sudah dipakai di ronde ini
  const usedCore = new Map<string, number>();
  const usedPrompt = new Map<string, number>();
  const round: Item[] = [];
  let lastKey = '';
  for (let i = 0; i < length; i++) {
    const band = quizBand(i);
    // Skor lebih kecil = lebih baik: soal identik ≫ inti kembar ≫ kalimat kembar > pernah keluar di ronde
    // lalu (yang paling lama lebih baik). Skor 0 = soal benar-benar baru, langsung dipakai. Inti kembar
    // tidak dilarang mutlak: pada soal perbandingan (3 vs 1, 3 vs 2) pengecohnya bagian dari soal.
    let best: { item: Item; score: number; key: string; core: string; prompt: string } | undefined;
    for (let attempt = 0; attempt < ROUND_ATTEMPTS && best?.score !== 0; attempt++) {
      const seed = (opts.seed + i * 7919 + attempt * 104_729) % 2_147_483_647;
      const item = generateItem(template, { seed, band });
      const key = itemKey(item);
      const core = itemCoreKey(item);
      const prompt = promptKey(item);
      const times = usedKey.get(key) ?? 0;
      const seenAt = age.get(key);
      const score =
        (times > 0 ? 10_000 * times + (key === lastKey ? 1_000_000 : 0) : 0) +
        100 * (usedCore.get(core) ?? 0) +
        10 * (usedPrompt.get(prompt) ?? 0) +
        (seenAt === undefined ? 0 : 1 + seenAt / span);
      if (!best || score < best.score) best = { item, score, key, core, prompt };
    }
    const pick = best!;
    lastKey = pick.key;
    for (const [m, k] of [
      [usedKey, pick.key],
      [usedCore, pick.core],
      [usedPrompt, pick.prompt],
    ] as const)
      m.set(k, (m.get(k) ?? 0) + 1);
    round.push(pick.item);
  }
  return round;
}
