import { lessonFor, pickExamples } from '../content/auto-lesson.js';
import { CONTOH_SEED, type LabLevelRef } from '../content/lab.js';
import { labQuizPool, materiQuizItems } from '../content/lab-quiz.js';
import { lessonScreenSchema } from '../content/lesson.js';
import { PERAGA_BOOKS } from '../content/peraga.js';
import type { ContentFile } from '../levels/validate.js';
import {
  catalogSchema,
  generateItem,
  skillTemplateSchema,
  validateTemplate,
  type Catalog,
  type SkillTemplate,
} from './template.js';

export type SkillValidationReport = {
  errors: string[];
  skills: SkillTemplate[];
  catalogs: Catalog[];
};

/** PRD A7 no. 7 — skema skill + katalog, id unik, kategori dikenal, 200 soal acak tanpa error. */
export function validateSkillContent(input: {
  catalogs: ContentFile[];
  skills: ContentFile[];
  sampleSize?: number;
}): SkillValidationReport {
  const errors: string[] = [];
  const catalogs: Catalog[] = [];
  for (const f of input.catalogs) {
    const r = catalogSchema.safeParse(f.data);
    if (!r.success)
      r.error.issues.forEach((i) => errors.push(`${f.path}: ${i.path.join('.')} — ${i.message}`));
    else catalogs.push(r.data);
  }
  const catalogFor = (s: SkillTemplate) =>
    catalogs.find((c) => c.domain === s.domain && c.grade === s.grade);

  const skills: SkillTemplate[] = [];
  const seen = new Map<string, string>();
  const orders = new Set<string>();
  for (const f of [...input.skills].sort((a, b) => a.path.localeCompare(b.path))) {
    const r = skillTemplateSchema.safeParse(f.data);
    if (!r.success) {
      r.error.issues.forEach((i) =>
        errors.push(`${f.path}: ${i.path.join('.') || '(root)'} — ${i.message}`),
      );
      continue;
    }
    const s = r.data;
    const prev = seen.get(s.id);
    if (prev) errors.push(`${f.path}: id "${s.id}" duplikat dengan ${prev}`);
    seen.set(s.id, f.path);
    const cat = catalogFor(s);
    if (!cat) errors.push(`${f.path}: tidak ada katalog untuk ${s.domain}/${s.grade}`);
    else if (!cat.categories.some((c) => c.code === s.category))
      errors.push(`${f.path}: kategori "${s.category}" tidak ada di katalog`);
    const orderKey = `${s.domain}/${s.grade}/${s.category}/${s.order}`;
    if (orders.has(orderKey))
      errors.push(`${f.path}: urutan ${s.category}.${s.order} dipakai dua kali`);
    orders.add(orderKey);
    for (const p of validateTemplate(s, input.sampleSize)) errors.push(`${f.path}: ${p}`);
    skills.push(s);
  }
  // D-090: setiap topik (kecuali Mock Test) punya penjelasan "Belajar dulu" dengan Video Momo dan ≥ 2 contoh
  // soal yang bisa dibuat; layar pelajaran (manual + otomatis) valid.
  for (const cat of catalogs)
    for (const c of cat.categories) {
      const own = skills.filter(
        (k) => k.domain === cat.domain && k.grade === cat.grade && k.category === c.code,
      );
      const lesson = lessonFor(c, own);
      if (!lesson) continue;
      const where = `${cat.domain}/${cat.grade}/${c.code}`;
      if (!lesson.layar.some((x) => x.jenis === 'tonton'))
        errors.push(`${where}: pelajaran tanpa Video Momo`);
      lesson.layar.forEach((x, i) => {
        const r = lessonScreenSchema.safeParse(x);
        if (!r.success) errors.push(`${where}: layar ${i + 1} — ${r.error.issues[0]?.message}`);
      });
      // D-093: buku SD tahap berjalan — setiap topik biasa punya pelajaran tersimpan dengan simulasi.
      if (
        PERAGA_BOOKS.includes(`${cat.domain}/${cat.grade}`) &&
        !/^(GM|GF|GN|GX)$/.test(c.code) &&
        !c.lesson?.layar.some((x) => x.jenis === 'peraga')
      )
        errors.push(`${where}: belum ada simulasi (peraga) — lihat docs/content/peraga-sd.md`);
      // Materi Topik (D-109): Contoh per level & Uji penguasaan dibuat dari level topik ini.
      if (c.materi) {
        const levels = own.filter((k) => k.family !== 'mock');
        if (levels.length === 0) errors.push(`${where}: materi tanpa level untuk contoh & uji`);
        for (const k of levels)
          try {
            generateItem(k, { seed: CONTOH_SEED, band: 0 });
          } catch {
            errors.push(`${where}: contoh level ${k.order} tidak bisa dibuat`);
          }
        if (levels.length && materiQuizItems(own, 8, 0).length < 4)
          errors.push(`${where}: uji penguasaan < 4 soal`);
      }
      const want = Math.min(2, own.filter((k) => k.family !== 'mock').length);
      if (pickExamples(own, want).length < want)
        errors.push(`${where}: contoh soal untuk video < ${want}`);
    }
  // Lab Buku (D-109): topik & level yang dirujuk ada di buku ini; setiap pos punya ≥ 4 soal Uji.
  for (const cat of catalogs) {
    if (!cat.lab) continue;
    const where = `${cat.domain}/${cat.grade} (lab)`;
    const book = skills.filter((k) => k.domain === cat.domain && k.grade === cat.grade);
    const codes = new Set(cat.categories.map((c) => c.code));
    const hasLevel = (r: LabLevelRef) =>
      book.some((k) => k.category === r.topik && k.order === r.level);
    for (const p of cat.lab.pos) {
      for (const t of p.topik)
        if (!codes.has(t)) errors.push(`${where}: pos ${p.id} → topik ${t} tidak ada`);
      for (const r of p.uji)
        if (!hasLevel(r))
          errors.push(`${where}: pos ${p.id} → level ${r.topik}.${r.level} tidak ada`);
      if (labQuizPool(book, p.uji, p.saring).length < 4)
        errors.push(`${where}: pos ${p.id} → bank soal Uji < 4`);
    }
    for (const r of cat.lab.ujian.soal)
      if (!hasLevel(r)) errors.push(`${where}: uji jago → level ${r.topik}.${r.level} tidak ada`);
  }
  return { errors, skills, catalogs };
}
