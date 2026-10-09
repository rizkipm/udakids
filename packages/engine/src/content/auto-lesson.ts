import type { Item, Visual } from '../generator/item.js';
import { generateItem, type SkillTemplate } from '../generator/template.js';
import { isMockSkill } from '../scoring/mock.js';
import type { Lesson, LessonExample, LessonScene, LessonScreen } from './lesson.js';

/**
 * Pelajaran otomatis (D-090): setiap topik punya penjelasan "Belajar dulu" walau belum ditulis manual.
 * Dibangun dari data topik itu sendiri — judul, intro, tips, dan contoh soal dari levelnya — jadi selalu sesuai
 * isi latihan dan ikut berubah bila admin menyunting topik. Fungsi murni & deterministik (seed tetap).
 *
 * Isi: Video Momo (pembuka → 2–3 contoh soal yang dikerjakan Momo: soal dibacakan, lalu jawabannya disorot dan
 * dijelaskan → tips → penutup), bacaan interaktif, coba satu soal tanpa nilai, dan layar "ingat".
 * Pelajaran manual yang belum punya video mendapat Video Momo otomatis di depannya.
 */

export type LessonTopic = {
  title: string;
  intro?: string;
  tips?: readonly string[];
  lesson?: Lesson;
};

const MAX_TEXT = 120;
const MAX_SAY = 400;

/** Potong di batas kata supaya muat (≤ n huruf). */
export function clip(text: string, n = MAX_TEXT): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > n * 0.6 ? cut.slice(0, at) : cut).replace(/[,;:.]$/, '')}…`;
}

/** Kalimat-kalimat pendek dari paragraf intro. */
export function sentences(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
}

/** Interaksi yang jawabannya bisa ditunjukkan di video (bukan game ketuk/telusur). */
const SHOWABLE = new Set(['pick-one', 'tap-all', 'number-input', 'order']);

/** Soal contoh yang jawabannya bisa disorot (bukan game ketuk/telusur): label video "Ini jawabannya". */
export const isShowableExample = (it: Item) => {
  const i = it.interaction;
  if (!SHOWABLE.has(i.type)) return false;
  if (i.type === 'pick-one' || i.type === 'tap-all') return i.choices.length <= 6;
  if (i.type === 'order') return i.choices.length <= 6 && i.style === undefined;
  return true;
};

/** Kalimat jawaban yang dibacakan Momo setelah soal contoh (sebelum penjelasan). */
export function exampleAnswerSay(it: Item): string {
  const i = it.interaction;
  const reteach = it.reteach.say ? ` ${it.reteach.say}` : '';
  switch (i.type) {
    case 'pick-one': {
      const c = i.choices.find((x) => x.id === i.answer);
      return clip(`Jawabannya ${c?.say ?? 'yang disorot'}.${reteach}`, MAX_SAY);
    }
    case 'tap-all': {
      const says = i.choices.filter((c) => i.answer.includes(c.id)).map((c) => c.say);
      const uniq = [...new Set(says)];
      return clip(`Jawabannya: ${uniq.join(', ')}.${reteach}`, MAX_SAY);
    }
    case 'order': {
      const by = new Map(i.choices.map((c) => [c.id, c.say]));
      return clip(`Urutannya: ${i.answer.map((id) => by.get(id)).join(', ')}.${reteach}`, MAX_SAY);
    }
    case 'number-input':
      return clip(`Jawabannya ${i.answer}${i.unit ? ` ${i.unit}` : ''}.${reteach}`, MAX_SAY);
    default:
      return clip(it.reteach.say || 'Ayo kita lihat jawabannya.', MAX_SAY);
  }
}

type Found = { example: LessonExample; item: Item };

/**
 * Contoh soal untuk video: dari level mudah ke sulit, level berbeda-beda. Utamakan soal yang jawabannya bisa
 * disorot (pilihan, ketuk semua, urutkan, isi angka); bila kurang, game/tebalkan tetap ditampilkan sebagai
 * "cara bermain" (papan aslinya, lalu penjelasan Momo).
 */
export function pickExamples(skills: readonly SkillTemplate[], want = 3): Found[] {
  const levels = [...skills].filter((s) => !isMockSkill(s)).sort((a, b) => a.order - b.order);
  if (!levels.length) return [];
  const n = levels.length;
  const order = [0, Math.floor(n / 3), Math.floor((2 * n) / 3), ...levels.keys()].filter(
    (v, i, a) => v < n && a.indexOf(v) === i,
  );
  const make = (skill: SkillTemplate, seed: number): Item | undefined => {
    try {
      return generateItem(skill, { seed, band: 0 });
    } catch {
      return undefined;
    }
  };
  const out: Found[] = [];
  const used = new Set<number>();
  for (const pass of [true, false])
    for (const idx of order) {
      if (out.length >= want) break;
      if (used.has(idx)) continue;
      const skill = levels[idx]!;
      for (let seed = 11; seed < 19; seed++) {
        const item = make(skill, seed);
        if (item && (!pass || isShowableExample(item))) {
          out.push({ example: { level: skill.order, seed }, item });
          used.add(idx);
          break;
        }
      }
    }
  // Urutkan kembali dari level mudah ke sulit.
  return out.sort((a, b) => a.example.level - b.example.level);
}

/** Gambar wakil sebuah soal: gambar soal pertama, atau gambar jawabannya. */
function pictureOf(it: Item): Visual | undefined {
  const v = it.stimulus.find((x) => x.kind !== 'text' && x.kind !== 'blank');
  if (v) return v;
  const i = it.interaction;
  if (i.type === 'pick-one') {
    const c = i.choices.find((x) => x.id === i.answer);
    if (c && c.visual.kind !== 'text') return c.visual;
  }
  return undefined;
}

/** Video Momo otomatis untuk sebuah topik. */
export function autoVideo(topic: LessonTopic, skills: readonly SkillTemplate[]): LessonScreen {
  const found = pickExamples(skills);
  const intro = topic.intro?.trim() || `Kita belajar ${topic.title}.`;
  const tips = (topic.tips ?? []).slice(0, 2);
  const pics = found.map((f) => pictureOf(f.item)).filter((v): v is Visual => !!v);
  const scenes: LessonScene[] = [
    {
      teks: clip(topic.title),
      suara: clip(`Halo, teman! Hari ini kita belajar ${topic.title}. ${intro}`, MAX_SAY),
      ...(pics[0] && { visual: [pics[0]] }),
      gerak: 'muncul',
    },
    ...found.map((f, k): LessonScene => ({
      teks: clip(`Contoh ${k + 1}: ${f.item.prompt}`),
      suara: clip(
        `${k === 0 ? 'Ayo lihat contoh soal. ' : 'Contoh berikutnya. '}${f.item.say ?? f.item.prompt}`,
        MAX_SAY,
      ),
      contoh: f.example,
    })),
    ...tips.map((tip, k): LessonScene => ({
      teks: clip(tip),
      suara: clip(`${k === 0 ? 'Ingat tipsnya. ' : ''}${tip}`, MAX_SAY),
      ...(pics[(k + 1) % Math.max(1, pics.length)] && {
        visual: [pics[(k + 1) % pics.length]!],
      }),
      gerak: k % 2 ? 'goyang' : 'zoom',
    })),
    {
      teks: 'Sekarang giliranmu. Ayo coba!',
      suara: 'Kamu sudah menonton sampai selesai. Hebat! Sekarang giliranmu mencoba.',
      gerak: 'denyut',
    },
  ];
  return {
    jenis: 'tonton',
    teks: clip(`Video Momo: ${topic.title}`),
    suara: 'Ayo tonton video Momo.',
    adegan: scenes.slice(0, 8),
  };
}

/** Pelajaran lengkap otomatis untuk topik tanpa pelajaran manual. */
export function autoLesson(topic: LessonTopic, skills: readonly SkillTemplate[]): Lesson {
  const video = autoVideo(topic, skills);
  const lines = [...sentences(topic.intro), ...(topic.tips ?? [])]
    .map((x) => clip(x))
    .filter((x, i, a) => a.indexOf(x) === i)
    .slice(0, 6);
  const found = pickExamples(skills, 1)[0];
  const screens: LessonScreen[] = [video];
  if (lines.length >= 2)
    screens.push({
      jenis: 'baca',
      teks: 'Ayo membaca. Ketuk kalimatnya untuk mendengar.',
      suara:
        'Ayo membaca bersama Momo. Ketuk kalimatnya untuk mendengar, atau tekan bacakan semua.',
      kalimat: lines.map((teks) => ({ teks })),
    });
  const firstLevel = [...skills]
    .filter((s) => !isMockSkill(s))
    .sort((a, b) => a.order - b.order)[0];
  if (firstLevel)
    screens.push({
      jenis: 'coba',
      mode: 'soal',
      teks: 'Ayo coba satu soal. Tidak dinilai, kok!',
      suara:
        'Sekarang coba satu soal. Tidak dinilai, jadi santai saja. Kalau keliru, Momo bantu menjelaskan.',
      contoh: { level: found?.example.level ?? firstLevel.order, seed: 23 },
    });
  const tips = topic.tips ?? [];
  screens.push({
    jenis: 'ingat',
    teks: clip(tips[0] ?? `Kita sudah belajar ${topic.title}.`),
    suara: clip(
      `Ingat, ya! ${tips.join(' ') || `Kita sudah belajar ${topic.title}.`} Kamu sudah belajar dengan teliti. Ayo latihan!`,
      MAX_SAY,
    ),
  });
  return { kode: 'K-XX-00', version: 1, judul: clip(topic.title, 60), layar: screens };
}

/**
 * Pelajaran yang ditampilkan untuk sebuah topik: manual bila ada (ditambah Video Momo otomatis di depan bila belum
 * punya video), atau otomatis. Topik Mock Test tidak punya pelajaran.
 */
export function lessonFor(
  topic: LessonTopic,
  skills: readonly SkillTemplate[],
): Lesson | undefined {
  const levels = skills.filter((s) => !isMockSkill(s));
  if (!levels.length) return undefined;
  const own = topic.lesson;
  if (!own) return autoLesson(topic, levels);
  if (own.layar.some((s) => s.jenis === 'tonton')) return own;
  return { ...own, layar: [autoVideo(topic, levels), ...own.layar] };
}
