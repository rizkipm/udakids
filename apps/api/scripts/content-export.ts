/**
 * pnpm content:export [--dry] — tulis konten dari DATABASE (katalog, skill Pustaka, level, dialog) ke
 * folder content/ agar suntingan admin ikut git dan terbawa ke server/database lain lewat `db:seed`.
 *
 * - Hanya file yang ISINYA berbeda yang ditulis; skill baru dari admin mendapat file baru.
 * - Skill bawaan yang sudah dijadikan draft oleh seed (tidak ada di content/, tidak pernah diedit admin)
 *   dilewati.
 * - Semua hasil divalidasi dengan skema engine sebelum ditulis.
 * Setelah itu jalankan `pnpm validate:content`, lalu commit folder content/.
 */
import '../src/common/env.js';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import {
  catalogSchema,
  dialogFileSchema,
  levelSchema,
  skillTemplateSchema,
} from '@little-coder/engine';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { contentDir } from '../src/common/config.js';
import { stableStringify } from '../src/common/stable.js';
import * as schema from '../src/db/schema.js';
import { databaseUrl, safeUrl } from './pg-tools.js';

const dry = process.argv.includes('--dry');
const root = contentDir();
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/, '');

function indexById(dir: string) {
  const map = new Map<string, { path: string; data: unknown }>();
  if (!existsSync(dir)) return map;
  for (const e of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!e.isFile() || !e.name.endsWith('.json') || e.name.startsWith('_')) continue;
    const path = join(e.parentPath, e.name);
    const data = JSON.parse(readFileSync(path, 'utf8')) as { id?: string };
    if (data.id) map.set(data.id, { path, data });
  }
  return map;
}

const write = (path: string, data: unknown) => {
  if (!dry) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  }
};

async function main() {
  const pool = new Pool({ connectionString: databaseUrl() });
  const db = drizzle(pool, { schema });
  const out = { catalogs: 0, skills: 0, newSkills: 0, levels: 0, dialogs: 0, skipped: 0 };
  try {
    for (const c of await db.select().from(schema.skillCatalogs)) {
      const cat = catalogSchema.parse({
        domain: c.domain,
        grade: c.grade,
        title: c.title,
        categories: c.categories,
      });
      const path = join(root, 'skills', c.domain, c.grade, '_catalog.json');
      const current = existsSync(path)
        ? catalogSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
        : undefined;
      if (!current || stableStringify(current) !== stableStringify(cat)) {
        write(path, cat);
        out.catalogs++;
      }
    }

    const files = indexById(join(root, 'skills'));
    for (const s of await db.select().from(schema.skills)) {
      const file = files.get(s.id);
      if (!file && s.status === 'draft' && !s.updatedBy) {
        out.skipped++;
        continue;
      }
      const t = skillTemplateSchema.parse(s.template);
      const current = file ? skillTemplateSchema.safeParse(file.data) : undefined;
      if (current?.success && stableStringify(current.data) === stableStringify(t)) continue;
      const path =
        file?.path ??
        join(
          root,
          'skills',
          t.domain,
          t.grade,
          `${t.category}${String(t.order).padStart(2, '0')}-${slug(t.title.split(' — ').at(-1) ?? t.id)}.json`,
        );
      write(path, t);
      if (file) out.skills++;
      else out.newSkills++;
    }

    const levelFiles = indexById(join(root, 'levels'));
    for (const l of await db.select().from(schema.levels)) {
      const data = levelSchema.parse(l.data);
      const file = levelFiles.get(l.id);
      if (file && stableStringify(file.data) === stableStringify(l.data)) continue;
      const path =
        file?.path ?? join(root, 'levels', data.tier, `world-${data.world}`, `${l.id}.json`);
      write(path, l.data);
      out.levels++;
    }

    for (const d of await db.select().from(schema.dialogs)) {
      const data = dialogFileSchema.parse(d.data);
      const path = join(root, 'dialog', `momo.${d.locale}.json`);
      const current = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined;
      if (current && stableStringify(current) === stableStringify(data)) continue;
      write(path, data);
      out.dialogs++;
    }
  } finally {
    await pool.end();
  }
  console.log(
    `${dry ? '[dry] ' : ''}Dari ${safeUrl(databaseUrl())} → ${relative(process.cwd(), root) || root}: ` +
      `${out.catalogs} katalog, ${out.skills} skill diperbarui, ${out.newSkills} skill baru, ` +
      `${out.levels} level, ${out.dialogs} dialog; ${out.skipped} skill draft bawaan dilewati.`,
  );
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
