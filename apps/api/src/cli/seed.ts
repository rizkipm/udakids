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

type Catalog = ReturnType<typeof catalogSchema.parse>;
/**
 * Materi mock test: tanda `mock` (D-076) atau judul bagian lama "Mock Test …" (D-072/D-074). Kode Y/Z juga dipakai
 * materi biasa di buku lain, jadi tidak dikenali dari kodenya.
 */
const isMockSection = (x: { group?: string; mock?: boolean }) =>
  x.mock === true || x.group?.startsWith('Mock Test') === true;

/**
 * Katalog yang pernah disunting admin tidak ditimpa (D-055), tetapi materi BARU dari content/ (kode yang belum
 * ada di DB, mis. materi KMSI D-074) tetap ditambahkan agar levelnya terlihat anak. Suntingan admin pada materi
 * lama dipertahankan; mock test tetap di akhir dan ikut pindah ke bagian lombanya (D-076). Judul "(OSN)" → "(Olimpiade)" dan "Pra-TK" →
 * "PAUD" ikut diganti bila hanya itu bedanya dengan content/.
 */
/**
 * Penggantian judul bagian resmi (bukan suntingan admin): katalog yang pernah disunting admin tetap mendapat judul
 * bagian baru, supaya materi dan mock test satu lomba tidak terpecah ke dua bagian.
 */
export const GROUP_RENAMES: Readonly<Record<string, string>> = {
  // D-101: keterangan versi soal.
  'EMC · Eduversal Mathematics Competition — Penyisihan Kelas 3–4':
    'EMC · Eduversal Mathematics Competition — Penyisihan Kelas 3–4 (soal versi 2022)',
};

export async function mergeNewCategories(
  db: ReturnType<typeof drizzle<typeof schema>>,
  c: Catalog,
) {
  const [row] = await db
    .select({ title: schema.skillCatalogs.title, categories: schema.skillCatalogs.categories })
    .from(schema.skillCatalogs)
    .where(
      and(
        eq(schema.skillCatalogs.domain, c.domain),
        eq(schema.skillCatalogs.grade, c.grade),
        sql`${schema.skillCatalogs.updatedBy} is not null`,
      ),
    );
  if (!row) return;
  const stored = (row.categories as Catalog['categories']) ?? [];
  // Mock test pindah ke bagian lombanya (D-076): judul bagian & tanda `mock` mengikuti content/.
  let moved = false;
  // Pelajaran "Belajar dulu" (D-079): materi lama mendapat pelajaran dari content/ bila belum punya atau versinya
  // lebih lama. Isi materi lain yang disunting admin tidak disentuh.
  let lessons = 0;
  let renamedGroups = 0;
  const current = stored.map((x) => {
    const src = c.categories.find((y) => y.code === x.code);
    let out = x;
    const group = x.group && GROUP_RENAMES[x.group];
    if (group) {
      out = { ...out, group };
      renamedGroups++;
    }
    if (src?.lesson && (!x.lesson || x.lesson.version < src.lesson.version)) {
      out = { ...out, lesson: src.lesson };
      lessons++;
    }
    if (!src?.mock || !isMockSection(out) || (out.mock && out.group === src.group)) return out;
    moved = true;
    return { ...out, group: src.group, mock: true };
  });
  const have = new Set(current.map((x) => x.code));
  const added = c.categories.filter((x) => !have.has(x.code));
  // Penggantian nama resmi (bukan suntingan admin): "(OSN)" → "(Olimpiade)" (D-070), "Pra-TK" → "PAUD" (D-075).
  const renamed = row.title.replace('(OSN)', '(Olimpiade)').replace('Pra-TK', 'PAUD');
  const title = renamed === c.title ? c.title : row.title;
  if (added.length === 0 && !moved && lessons === 0 && renamedGroups === 0 && title === row.title)
    return;
  // Materi baru disisipkan di posisinya menurut content/ (setelah materi sebelumnya yang sudah ada), bukan di
  // akhir: bagian (group) & rantai kunci tetap seperti content/ (D-079).
  const all = [...current];
  for (const x of added) {
    const before = c.categories.slice(0, c.categories.indexOf(x)).map((y) => y.code);
    const at = Math.max(-1, ...before.map((code) => all.findIndex((y) => y.code === code)));
    all.splice(at + 1, 0, x);
  }
  const categories = [...all.filter((x) => !isMockSection(x)), ...all.filter(isMockSection)];
  // updatedBy tetap (masih dianggap suntingan admin), hanya isinya yang dilengkapi.
  await db
    .update(schema.skillCatalogs)
    .set({ title, categories, updatedAt: new Date() })
    .where(and(eq(schema.skillCatalogs.domain, c.domain), eq(schema.skillCatalogs.grade, c.grade)));
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
    if (!opts.force) await mergeNewCategories(db, c);
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
