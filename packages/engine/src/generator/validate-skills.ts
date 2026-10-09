import { lessonFor, pickExamples } from '../content/auto-lesson.js';
import { lessonScreenSchema } from '../content/lesson.js';
import type { ContentFile } from '../levels/validate.js';
import {
  catalogSchema,
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
      const want = Math.min(2, own.filter((k) => k.family !== 'mock').length);
      if (pickExamples(own, want).length < want)
        errors.push(`${where}: contoh soal untuk video < ${want}`);
    }
  return { errors, skills, catalogs };
}
