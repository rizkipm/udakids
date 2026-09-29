import {
  DOMAINS,
  GRADES,
  skillTemplateSchema,
  validateTemplate,
  type SkillTemplate,
} from '@little-coder/engine';

/** Metadata skill dalam bentuk form (semua string agar input tetap terkendali). */
export type SkillMeta = {
  id: string;
  title: string;
  domain: SkillTemplate['domain'];
  grade: SkillTemplate['grade'];
  category: string;
  order: string;
  tier: SkillTemplate['tier'];
  status: SkillTemplate['status'];
  tags: string;
};

export const TIERS = ['basic', 'intermediate', 'advanced'] as const;
export { DOMAINS, GRADES };

export function emptyMeta(): SkillMeta {
  return {
    id: '',
    title: '',
    domain: 'math',
    grade: 'prek',
    category: 'A',
    order: '1',
    tier: 'basic',
    status: 'draft',
    tags: '',
  };
}

export function metaFromTemplate(t: SkillTemplate): SkillMeta {
  return {
    id: t.id,
    title: t.title,
    domain: t.domain,
    grade: t.grade,
    category: t.category,
    order: String(t.order),
    tier: t.tier,
    status: t.status,
    tags: formatTags(t.tags),
  };
}

/** "merdeka=fondasi, sg=NEL" → { merdeka: 'fondasi', sg: 'NEL' } */
export function parseTags(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of text.split(/[,\n]/)) {
    const [k, ...rest] = part.split('=');
    const key = k?.trim();
    if (key) out[key] = rest.join('=').trim();
  }
  return out;
}

export const formatTags = (tags: Record<string, string>) =>
  Object.entries(tags)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

/** Usulan id: math.prek.a1.kenali-angka (mengikuti pola konten bawaan). */
export function suggestId(meta: SkillMeta): string {
  const slug = slugify(meta.title) || 'skill-baru';
  return `${meta.domain}.${meta.grade}.${meta.category.toLowerCase()}${meta.order || '1'}.${slug}`;
}

/** Rakit objek template dari form (belum divalidasi). */
export function buildTemplate(
  meta: SkillMeta,
  family: string,
  params: unknown,
  bands?: unknown,
  version = 1,
): Record<string, unknown> {
  return {
    id: meta.id.trim(),
    version,
    domain: meta.domain,
    grade: meta.grade,
    category: meta.category.trim(),
    order: Number(meta.order),
    title: meta.title.trim(),
    tier: meta.tier,
    status: meta.status,
    tags: parseTags(meta.tags),
    family,
    params,
    ...(bands !== undefined && { bands }),
  };
}

export type TemplateCheck = {
  template?: SkillTemplate;
  issues: { path: string; message: string }[];
};

/** Validasi di sisi klien: skema + `samples` soal hasil generator (server memakai 200). */
export function checkTemplate(candidate: unknown, samples = 50): TemplateCheck {
  const parsed = skillTemplateSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      issues: parsed.error.issues.map((i) => ({
        path: i.path.map(String).join('.'),
        message: i.message,
      })),
    };
  }
  let problems: string[];
  try {
    problems = validateTemplate(parsed.data, samples);
  } catch (err) {
    problems = [(err as Error).message];
  }
  return {
    template: parsed.data,
    issues: problems.map((message) => ({ path: 'generator', message })),
  };
}

/** Parse JSON dari textarea: nilai atau pesan galat. */
export function parseJson(text: string): { value?: unknown; error?: string } {
  if (!text.trim()) return { value: undefined };
  try {
    return { value: JSON.parse(text) as unknown };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
