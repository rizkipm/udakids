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
  return { errors, skills, catalogs };
}
