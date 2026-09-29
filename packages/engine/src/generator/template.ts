import { z } from 'zod';
import { OBJECTS } from './assets.js';
import { FAMILIES, FAMILY_NAMES, Reject, type FamilyName } from './families/index.js';
import { allVisuals, type Choice, type Item, type ItemCore } from './item.js';
import { createRng } from './rng.js';

export const DOMAINS = ['math', 'literasi', 'sains', 'logika', 'spasial'] as const;
export const GRADES = ['prek', 'tk', 'sd1', 'sd2', 'sd12', 'sd34'] as const;
export const GRADE_LABEL: Record<(typeof GRADES)[number], string> = {
  prek: 'Pra-TK',
  tk: 'Kindergarten (TK)',
  sd1: 'Kelas 1',
  sd2: 'Kelas 2',
  sd12: 'Grade 1-2 (Kategori A)',
  sd34: 'Grade 3-4 (Kategori B)',
};

export const skillIdSchema = z
  .string()
  .regex(/^[a-z]+(\.[a-z0-9-]+)+$/, 'format id: domain.bagian-bagian');

export const skillTemplateSchema = z
  .strictObject({
    id: skillIdSchema,
    version: z.number().int().positive(),
    domain: z.enum(DOMAINS),
    grade: z.enum(GRADES),
    /** Kode kategori di katalog (A, B, ... Z, AA). */
    category: z.string().regex(/^[A-Z]{1,2}$/),
    order: z.number().int().positive(),
    title: z.string().min(3).max(80),
    tier: z.enum(['basic', 'intermediate', 'advanced']),
    status: z.enum(['active', 'draft']).default('active'),
    tags: z.record(z.string(), z.string()).default({}),
    family: z.enum(FAMILY_NAMES as [FamilyName, ...FamilyName[]]),
    params: z.record(z.string(), z.unknown()).default({}),
    /** Override params untuk band kesulitan 0 (mudah), 1, 2 — dipakai Skor Jago. */
    bands: z.array(z.record(z.string(), z.unknown())).length(3).optional(),
  })
  .superRefine((t, ctx) => {
    const family = FAMILIES[t.family];
    for (let band = 0; band < 3; band++) {
      const r = family.params.safeParse({ ...t.params, ...(t.bands?.[band] ?? {}) });
      if (!r.success) {
        for (const issue of r.error.issues) {
          ctx.addIssue({
            code: 'custom',
            path: ['params', ...issue.path.map(String)],
            message: `band ${band}: ${issue.message}`,
          });
        }
        return;
      }
    }
  });

export type SkillTemplate = z.infer<typeof skillTemplateSchema>;

export const catalogSchema = z.strictObject({
  domain: z.enum(DOMAINS),
  grade: z.enum(GRADES),
  title: z.string().min(3),
  categories: z
    .array(
      z.strictObject({
        code: z.string().regex(/^[A-Z]{1,2}$/),
        title: z.string().min(3),
        /** Materi singkat untuk dibacakan ke anak sebelum bermain (D-026). */
        intro: z.string().trim().min(10).max(300).optional(),
        /** 1–3 hal penting ("Ingat!") dari topik ini. */
        tips: z.array(z.string().trim().min(3).max(120)).min(1).max(3).optional(),
      }),
    )
    .min(1),
});
export type Catalog = z.infer<typeof catalogSchema>;

export const MAX_ATTEMPTS = 100;
export const MAX_PROMPT_LENGTH = 160;

export class GeneratorError extends Error {}

/** Huruf kapital di awal kalimat (bilangan dalam kata sering mengawali kalimat). */
export const sentenceCase = (text: string) =>
  text.replace(/(^|[.!?]\s+)([a-z])/g, (_, pre: string, c: string) => pre + c.toUpperCase());

/** Buat satu soal dari template (deterministik untuk seed + band yang sama). */
export function generateItem(template: SkillTemplate, opts: { seed: number; band: number }): Item {
  const band = Math.max(0, Math.min(2, Math.trunc(opts.band)));
  const family = FAMILIES[template.family];
  const params = family.params.parse({ ...template.params, ...(template.bands?.[band] ?? {}) });
  const rng = createRng(`${template.id}@${template.version}#${opts.seed}/${band}`);
  let lastReason = '';
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const ctx = { seed: opts.seed, band, templateId: template.id };
      const core = (family.generate as (p: unknown, r: typeof rng, c: typeof ctx) => ItemCore)(
        params,
        rng,
        ctx,
      );
      const problems = itemProblems(core);
      if (problems.length > 0) throw new Reject(problems.join('; '));
      return {
        ...core,
        prompt: sentenceCase(core.prompt),
        ...(core.say && { say: sentenceCase(core.say) }),
        reteach: { ...core.reteach, say: sentenceCase(core.reteach.say) },
        skillId: template.id,
        version: template.version,
        seed: opts.seed,
        band,
      };
    } catch (err) {
      if (!(err instanceof Reject)) throw err;
      lastReason = err.message;
    }
  }
  throw new GeneratorError(
    `${template.id}: gagal membuat soal setelah ${MAX_ATTEMPTS} percobaan (${lastReason})`,
  );
}

const visualKey = (c: Choice) => JSON.stringify(c.visual);

/** Aturan kualitas soal (PRD A7 no. 7 + A10). Kosong = soal baik. */
export function itemProblems(item: ItemCore): string[] {
  const out: string[] = [];
  const it = item.interaction;
  const checkChoices = (choices: Choice[], label: string, allowSameVisual = false) => {
    const ids = new Set(choices.map((c) => c.id));
    if (ids.size !== choices.length) out.push(`${label}: id pilihan kembar`);
    if (!allowSameVisual && new Set(choices.map(visualKey)).size !== choices.length)
      out.push(`${label}: gambar pilihan kembar`);
    return ids;
  };
  switch (it.type) {
    case 'pick-one': {
      // Gambar kembar boleh (mis. "mana yang berbeda"), asal tidak ada yang identik dengan jawaban.
      const ids = checkChoices(it.choices, 'pick-one', true);
      if (!ids.has(it.answer)) out.push('jawaban tidak ada di pilihan');
      if (it.choices.length < 2) out.push('pilihan kurang dari 2');
      const answer = it.choices.find((c) => c.id === it.answer);
      if (answer && it.choices.some((c) => c !== answer && visualKey(c) === visualKey(answer))) {
        out.push('pengecoh sama dengan jawaban');
      }
      break;
    }
    case 'tap-all': {
      const ids = checkChoices(it.choices, 'tap-all', true);
      if (it.answer.length === 0) out.push('tap-all tanpa jawaban');
      if (it.answer.length === it.choices.length) out.push('tap-all: semua pilihan benar');
      if (it.answer.some((a) => !ids.has(a))) out.push('jawaban tap-all tidak ada di pilihan');
      break;
    }
    case 'order': {
      const ids = checkChoices(it.choices, 'order');
      if (it.answer.length !== it.choices.length || it.answer.some((a) => !ids.has(a)))
        out.push('urutan jawaban tidak cocok');
      break;
    }
    case 'group':
    case 'match': {
      const groups = it.type === 'group' ? it.groups : it.right;
      const items = it.type === 'group' ? it.items : it.left;
      const gIds = checkChoices(groups, 'kelompok');
      const iIds = checkChoices(items, 'benda', true);
      if (Object.keys(it.answer).length !== items.length)
        out.push('tidak semua benda punya kelompok');
      for (const [k, v] of Object.entries(it.answer)) {
        if (!iIds.has(k) || !gIds.has(v)) out.push(`pasangan ${k}→${v} tidak valid`);
      }
      break;
    }
    case 'build':
      if (it.target < 1 || it.target > it.max) out.push('target build di luar batas');
      break;
    case 'number-line':
      if (it.answer < it.min || it.answer > it.max) out.push('jawaban di luar garis bilangan');
      break;
    case 'number-input':
      if (!Number.isFinite(it.answer)) out.push('jawaban isian bukan angka');
      break;
  }
  if (item.prompt.length > MAX_PROMPT_LENGTH)
    out.push(`kalimat soal > ${MAX_PROMPT_LENGTH} karakter`);
  for (const v of allVisuals(item)) {
    const ids =
      v.kind === 'objects' || v.kind === 'object'
        ? [v.object]
        : v.kind === 'scene'
          ? [v.subject, v.reference]
          : v.kind === 'mixed'
            ? v.parts.map((x) => x.object)
            : [];
    for (const id of ids) if (!(id in OBJECTS)) out.push(`gambar "${id}" tidak ada`);
    if ((v.kind === 'objects' || v.kind === 'dots') && v.count < 0) out.push('jumlah negatif');
    if (v.kind === 'frame' && v.filled > v.size) out.push('bingkai terlalu penuh');
    if (v.kind === 'fraction' && (v.den <= 0 || v.num < 0)) out.push('pecahan tidak valid');
    if (v.kind === 'bar-chart' && v.labels.length !== v.values.length)
      out.push('diagram: label ≠ nilai');
    if (v.kind === 'table' && v.rows.some((r) => r.length !== v.headers.length))
      out.push('tabel: kolom tidak sama');
  }
  return out;
}

export const TEMPLATE_SAMPLE_SIZE = 200;

/** PRD A7 no. 7 — hasilkan N soal (seed tetap) dan kumpulkan masalahnya. */
export function validateTemplate(template: SkillTemplate, n = TEMPLATE_SAMPLE_SIZE): string[] {
  const problems = new Set<string>();
  for (let i = 0; i < n; i++) {
    try {
      generateItem(template, { seed: i, band: i % 3 });
    } catch (err) {
      problems.add((err as Error).message);
      if (problems.size >= 5) break;
    }
  }
  return [...problems];
}
