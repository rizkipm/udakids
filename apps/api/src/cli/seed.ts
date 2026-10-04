/**
 * pnpm db:seed (dev) / node dist/cli/seed.js (server) — isi database dari content/ (katalog, skill Pustaka, level) dan buat admin pertama.
 * Aman dijalankan berulang: skill/level yang sudah ada TIDAK ditimpa (bisa sudah diedit admin),
 * kecuali dengan --force. Skill diperbarui bila `version` di content/ lebih tinggi (D-055). Admin dibuat dari ADMIN_EMAIL / ADMIN_PASSWORD bila belum ada admin.
 */
import '../common/env.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  catalogSchema,
  dialogFileSchema,
  emailSchema,
  levelSchema,
  skillTemplateSchema,
} from '@little-coder/engine';
import { and, eq, isNull, notInArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { contentDir, DEFAULT_DATABASE_URL } from '../common/config.js';
import { hashSecret } from '../common/crypto.js';
import * as schema from '../db/schema.js';

const force = process.argv.includes('--force');

function jsonFiles(dir: string): { path: string; data: unknown }[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => join(e.parentPath, e.name))
    .map((path) => ({ path, data: JSON.parse(readFileSync(path, 'utf8')) }));
}

export async function seed(
  db: ReturnType<typeof drizzle<typeof schema>>,
  opts: { force?: boolean; log?: (m: string) => void } = {},
) {
  const log = opts.log ?? console.log;
  // Gagal di awal (sebelum menulis apa pun) bila admin pertama tidak bisa dibuat dengan aman di produksi.
  const [existingAdmin] = await db
    .select({ id: schema.staffUsers.id })
    .from(schema.staffUsers)
    .where(eq(schema.staffUsers.role, 'admin'));
  if (!existingAdmin && !process.env.ADMIN_PASSWORD && process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_PASSWORD wajib diisi untuk membuat admin pertama di produksi');
  }
  const root = contentDir();
  const skillFiles = jsonFiles(join(root, 'skills'));
  const isCatalog = (p: string) => p.split(/[\\/]/).pop()!.startsWith('_');

  for (const f of skillFiles.filter((f) => isCatalog(f.path))) {
    const c = catalogSchema.parse(f.data);
    const values = {
      domain: c.domain,
      grade: c.grade,
      title: c.title,
      categories: c.categories,
      updatedAt: new Date(),
    };
    await db
      .insert(schema.skillCatalogs)
      .values(values)
      .onConflictDoUpdate({
        target: [schema.skillCatalogs.domain, schema.skillCatalogs.grade],
        set: values,
        // Katalog yang pernah disunting admin tidak ditimpa, kecuali --force.
        ...(opts.force ? {} : { setWhere: isNull(schema.skillCatalogs.updatedBy) }),
      });
  }

  let added = 0;
  for (const f of skillFiles.filter((f) => !isCatalog(f.path))) {
    const t = skillTemplateSchema.parse(f.data);
    const row = {
      id: t.id,
      version: t.version,
      domain: t.domain,
      grade: t.grade,
      category: t.category,
      order: t.order,
      title: t.title,
      status: t.status,
      template: t,
      updatedAt: new Date(),
    };
    const q = db.insert(schema.skills).values(row);
    // Skill yang sudah ada hanya diperbarui bila `version` di content/ lebih tinggi (D-055) — suntingan
    // admin dengan versi sama/lebih tinggi tidak ditimpa. --force menimpa semuanya.
    const res = await (
      opts.force
        ? q.onConflictDoUpdate({ target: schema.skills.id, set: row })
        : q.onConflictDoUpdate({
            target: schema.skills.id,
            set: row,
            setWhere: sql`${schema.skills.version} < excluded.version`,
          })
    ).returning({ id: schema.skills.id });
    added += res.length;
  }
  log(`skill: ${added} ditambahkan/diperbarui dari ${skillFiles.length} file`);

  // Skill bawaan yang sudah tidak ada di folder konten (mis. id berubah saat buku disusun ulang, D-023)
  // dijadikan draft agar hilang dari katalog. Skill yang pernah diedit admin (updatedBy terisi) dibiarkan.
  const contentIds = skillFiles
    .filter((f) => !isCatalog(f.path))
    .map((f) => (f.data as { id: string }).id);
  const stale = await db
    .update(schema.skills)
    .set({ status: 'draft', updatedAt: new Date() })
    .where(
      and(
        notInArray(schema.skills.id, contentIds),
        isNull(schema.skills.updatedBy),
        eq(schema.skills.status, 'active'),
      ),
    )
    .returning({ id: schema.skills.id });
  if (stale.length > 0) log(`skill: ${stale.length} skill lama tidak ada di konten → draft`);

  let levelsAdded = 0;
  for (const f of jsonFiles(join(root, 'levels'))) {
    const level = levelSchema.parse(f.data);
    const row = {
      id: level.id,
      version: level.version,
      tier: level.tier,
      world: level.world,
      index: level.index,
      data: f.data as object,
      updatedAt: new Date(),
    };
    const q = db.insert(schema.levels).values(row);
    const res = await (
      opts.force
        ? q.onConflictDoUpdate({ target: schema.levels.id, set: row })
        : q.onConflictDoNothing()
    ).returning({ id: schema.levels.id });
    levelsAdded += res.length;
  }
  log(`level: ${levelsAdded} ditambahkan/diperbarui`);

  // Dialog Momo per bahasa (content/dialog/momo.<locale>.json → tabel dialogs, D-030).
  let dialogsAdded = 0;
  const dialogDir = join(root, 'dialog');
  for (const f of existsSync(dialogDir) ? readdirSync(dialogDir) : []) {
    const m = /^momo\.([a-z]{2})\.json$/.exec(f);
    if (!m) continue;
    const data = dialogFileSchema.parse(JSON.parse(readFileSync(join(dialogDir, f), 'utf8')));
    const locale = m[1]!;
    const [cur] = await db.select().from(schema.dialogs).where(eq(schema.dialogs.locale, locale));
    if (!cur || opts.force) {
      const row = { locale, data: data as object, updatedAt: new Date() };
      await db
        .insert(schema.dialogs)
        .values(row)
        .onConflictDoUpdate({ target: schema.dialogs.locale, set: row });
      dialogsAdded++;
      continue;
    }
    // Sudah ada: tambahkan HANYA kunci baru (mis. kalimat suara Momo D-035); suntingan admin tetap.
    const existing = dialogFileSchema.parse(cur.data);
    const missing = Object.entries(data.lines).filter(([k]) => !(k in existing.lines));
    if (missing.length === 0) continue;
    await db
      .update(schema.dialogs)
      .set({
        data: { ...existing, lines: { ...existing.lines, ...Object.fromEntries(missing) } },
        updatedAt: new Date(),
      })
      .where(eq(schema.dialogs.locale, locale));
    dialogsAdded++;
  }
  log(`dialog: ${dialogsAdded} ditambahkan/diperbarui`);

  // Dirapikan & divalidasi sama seperti login (trim + huruf kecil + format), audit L1.
  const email = emailSchema.parse(process.env.ADMIN_EMAIL ?? 'admin@littlecoder.local');
  const [admin] = await db
    .select()
    .from(schema.staffUsers)
    .where(eq(schema.staffUsers.role, 'admin'));
  if (!admin) {
    const password = process.env.ADMIN_PASSWORD ?? 'admin12345';
    await db
      .insert(schema.staffUsers)
      .values({ email, name: 'Admin', role: 'admin', passwordHash: await hashSecret(password) });
    log(
      `admin dibuat: ${email}${process.env.ADMIN_PASSWORD ? '' : ` / ${password} (ganti segera!)`}`,
    );
  }
}

/** Jalankan seed ke DATABASE_URL (dipakai `pnpm db:seed` dan `node dist/cli/seed.js`). */
export function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL });
  return seed(drizzle(pool, { schema }), { force })
    .then(() => pool.end())
    .catch(async (err: unknown) => {
      console.error(err);
      await pool.end();
      process.exit(1);
    });
}

if (require.main === module) void main();
