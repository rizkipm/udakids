import { TAP_GAMES, type Item } from '../generator/item.js';
import { generateItem, type SkillTemplate } from '../generator/template.js';
import type { LabLevelRef } from './lab.js';

/**
 * Bank soal lab (D-109): soal ASLI dari level topik (generator yang sama dengan latihan). Dipakai Uji di pos Lab
 * Buku, Uji penguasaan Materi Topik, dan Uji Jago. Tidak memengaruhi nilai/kunci level latihan.
 */

/** Seed yang dipakai bank soal lab (soal latihan memakai seed acak, jadi tetap bervariasi). */
const POOL_SEEDS = 40;

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** Kalimat jawaban benar soal pilihan (kosong untuk jenis lain). */
export function answerSay(item: Item): string {
  const ia = item.interaction;
  if (ia.type === 'pick-one') return ia.choices.find((c) => c.id === ia.answer)?.say ?? '';
  return '';
}

/** Soal cocok dengan kata saring: jawaban dulu, lalu pembahasan. */
export function matchesSaring(item: Item, saring: readonly string[]): boolean {
  const keys = saring.map((s) => s.toLowerCase());
  for (const t of [answerSay(item), item.reteach.say]) {
    const w = words(t);
    if (keys.some((k) => w.includes(k))) return true;
  }
  return false;
}

/** Kata saring pertama yang cocok dengan jawaban → indeks kelompoknya (untuk peta penguasaan). */
export function groupOf(item: Item, groups: readonly (readonly string[] | undefined)[]): number {
  for (const t of [answerSay(item), item.reteach.say, item.prompt]) {
    const w = words(t);
    const hits = groups
      .map((g, k) => (g && g.some((x) => w.includes(x.toLowerCase())) ? k : -1))
      .filter((k) => k >= 0);
    if (hits.length === 1) return hits[0]!;
  }
  return -1;
}

const skillFor = (skills: readonly SkillTemplate[], r: LabLevelRef) =>
  skills.find((k) => k.category === r.topik && k.order === r.level);

/** Soal lab: game ketuk panjang (labirin, cari kata, …) dilewati — Uji lab untuk memeriksa pemahaman. */
function make(skill: SkillTemplate, seed: number, games = false): Item | undefined {
  try {
    const it = generateItem(skill, { seed, band: 0 });
    return !games && TAP_GAMES.has(it.interaction.type) ? undefined : it;
  } catch {
    return undefined;
  }
}

const keyOf = (it: Item) => `${it.prompt}|${JSON.stringify(it.interaction)}`;

/**
 * Bank soal pos: soal dari level `refs`. Dengan `saring`, hanya soal pilihan yang jawabannya tentang tema pos;
 * tanpa saring, semua jenis soal (kecuali game panjang) ikut. Tanpa kembar.
 */
export function labQuizPool(
  skills: readonly SkillTemplate[],
  refs: readonly LabLevelRef[],
  saring?: readonly string[],
): Item[] {
  const out = new Map<string, Item>();
  for (const r of refs) {
    const skill = skillFor(skills, r);
    if (!skill || skill.family === 'mock') continue;
    for (let seed = 1; seed <= POOL_SEEDS; seed++) {
      const it = make(skill, seed);
      if (!it) continue;
      if (saring?.length) {
        if (it.interaction.type !== 'pick-one' || !matchesSaring(it, saring)) continue;
      }
      out.set(keyOf(it), it);
    }
  }
  return [...out.values()];
}

/** Ambil `n` soal dari bank, berganti setiap percobaan (`round`), tersebar merata. */
export function pickRound<T>(pool: readonly T[], n: number, round: number): T[] {
  if (pool.length <= n) return [...pool];
  const step = pool.length / n;
  const shift = (round * 3) % pool.length;
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    const at = (Math.floor(i * step) + shift) % pool.length;
    const x = pool[at]!;
    out.push(out.includes(x) ? pool[(at + 1) % pool.length]! : x);
  }
  return out;
}

/** Satu soal per rujukan level, seed berganti setiap percobaan. */
export function labExamItems(
  skills: readonly SkillTemplate[],
  refs: readonly LabLevelRef[],
  round: number,
): { item: Item; ref: LabLevelRef }[] {
  return refs.flatMap((ref, k) => {
    const skill = skillFor(skills, ref);
    const item = skill ? make(skill, 1 + ((round * 13 + k * 5) % 60)) : undefined;
    return item ? [{ item, ref }] : [];
  });
}

/** Uji penguasaan Materi Topik: soal dari setiap level topik (bergiliran), `n` soal. */
export function materiQuizItems(
  topicSkills: readonly SkillTemplate[],
  n: number,
  round: number,
): { item: Item; level: number }[] {
  const levels = topicSkills.filter((k) => k.family !== 'mock').sort((a, b) => a.order - b.order);
  if (levels.length === 0) return [];
  const build = (games: boolean) => {
    // Level yang dipakai bergeser setiap percobaan supaya semua level kebagian.
    const stride = Math.max(1, Math.floor(levels.length / n));
    return Array.from(
      { length: n },
      (_, i) => levels[(i * stride + round) % levels.length]!,
    ).flatMap((skill, i) => {
      const item = make(skill, 100 + round * 17 + i * 7, games);
      return item ? [{ item, level: skill.order }] : [];
    });
  };
  // Soal biasa dulu; topik yang levelnya hampir semua game ketuk memakai game-nya juga.
  const plain = build(false);
  return plain.length >= 4 ? plain : build(true);
}

/** Bintang penguasaan: ≥ 90 % = 3, ≥ 70 % = 2, ≥ 40 % = 1. */
export function labStars(right: number, total: number): number {
  if (!total) return 0;
  const p = right / total;
  return p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.4 ? 1 : 0;
}
