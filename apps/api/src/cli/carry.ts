/**
 * Bawa data dari database lokal ke server (D-091), supaya tidak diisi / dibayar dua kali:
 * - API key yang diisi admin (suara Google `voice_key`, AI Gambar `ai_key` & `ai_claude_key`);
 * - pengaturan suara (`voice`) — kunci klip dihitung dari pengaturan ini, jadi harus sama di server;
 * - semua klip suara Chirp (`voice_clips`);
 * - pengaturan AI Gambar (`ai_image`) dan gambar AI yang sudah dibuat (`ai_images`, mis. foto simulasi D-088) —
 *   pembuat/peninjau dikosongkan karena id admin di server berbeda.
 *
 *   CARRY_PASSPHRASE=… pnpm carry:export -- backups/carry.ndjson.gz     (lokal)
 *   CARRY_PASSPHRASE=… node dist/cli/carry.js import backups/carry.ndjson.gz   (server, di apps/api)
 *
 * API key di file TIDAK pernah dalam bentuk terbaca: dibuka dengan JWT_SECRET lokal, dikunci ulang dengan kata sandi
 * sementara (scrypt + AES-256-GCM), lalu di server dikunci lagi dengan JWT_SECRET server. File di `backups/` (tidak
 * masuk git); hapus setelah diimpor.
 */
import '../common/env.js';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createGunzip, createGzip } from 'node:zlib';
import { inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DEFAULT_DATABASE_URL } from '../common/config.js';
import { open, seal, type Sealed } from '../common/secret-box.js';
import * as schema from '../db/schema.js';
import { aiImages, appSettings, voiceClips } from '../db/schema.js';

/** Baris app_settings berisi API key terenkripsi (dibawa hanya bila ada). */
export const CARRY_SECRET_KEYS = ['voice_key', 'ai_key', 'ai_claude_key'] as const;
/** Pengaturan biasa yang ikut dibawa. */
export const CARRY_SETTING_KEYS = ['voice', 'ai_image'] as const;

type Locked = { salt: string; iv: string; tag: string; data: string };

function lock(plain: string, pass: string): Locked {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', scryptSync(pass, salt, 32), iv);
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return {
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: c.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  };
}

function unlock(l: Locked, pass: string): string {
  try {
    return unlockRaw(l, pass);
  } catch {
    throw new Error('Kata sandi file salah (CARRY_PASSPHRASE harus sama dengan saat ekspor).');
  }
}

function unlockRaw(l: Locked, pass: string): string {
  const d = createDecipheriv(
    'aes-256-gcm',
    scryptSync(pass, Buffer.from(l.salt, 'base64'), 32),
    Buffer.from(l.iv, 'base64'),
  );
  d.setAuthTag(Buffer.from(l.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(l.data, 'base64')), d.final()]).toString('utf8');
}

const passphrase = () => {
  const p = process.env.CARRY_PASSPHRASE ?? '';
  if (p.length < 12)
    throw new Error('Isi CARRY_PASSPHRASE (minimal 12 huruf) — kata sandi sementara file ini.');
  return p;
};

type Header = {
  type: 'header';
  v: 1;
  at: string;
  secrets: Record<string, Locked & { last4: string }>;
  settings: Record<string, unknown>;
};
type ImageLine = {
  type: 'image';
  row: Omit<typeof aiImages.$inferSelect, 'data' | 'createdBy' | 'reviewedBy'> & { data: string };
};
type ClipLine = {
  type: 'clip';
  key: string;
  text: string;
  voice: string;
  mime: string;
  data: string;
  bytes: number;
};

export async function exportCarry(
  file: string,
  url = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
) {
  const pass = passphrase();
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  try {
    const rows = await db
      .select()
      .from(appSettings)
      .where(inArray(appSettings.key, [...CARRY_SECRET_KEYS, ...CARRY_SETTING_KEYS]));
    const secrets: Header['secrets'] = {};
    const settings: Header['settings'] = {};
    for (const r of rows) {
      if ((CARRY_SECRET_KEYS as readonly string[]).includes(r.key)) {
        const plain = open(r.value as Sealed);
        if (!plain) throw new Error(`${r.key} tidak bisa dibuka dengan JWT_SECRET lokal`);
        secrets[r.key] = { ...lock(plain, pass), last4: plain.slice(-4) };
      } else settings[r.key] = r.value;
    }
    const out = createGzip();
    const done = new Promise<void>((resolve, reject) => {
      out.pipe(createWriteStream(file)).on('finish', resolve).on('error', reject);
    });
    const header: Header = {
      type: 'header',
      v: 1,
      at: new Date().toISOString(),
      secrets,
      settings,
    };
    out.write(JSON.stringify(header) + '\n');
    let clips = 0;
    let bytes = 0;
    // Per halaman supaya memori tetap kecil walau ribuan klip.
    for (let offset = 0; ; offset += 500) {
      const page = await db
        .select()
        .from(voiceClips)
        .orderBy(voiceClips.key)
        .limit(500)
        .offset(offset);
      if (page.length === 0) break;
      for (const c of page) {
        const line: ClipLine = {
          type: 'clip',
          key: c.key,
          text: c.text,
          voice: c.voice,
          mime: c.mime,
          data: Buffer.from(c.data).toString('base64'),
          bytes: c.bytes,
        };
        if (!out.write(JSON.stringify(line) + '\n')) await new Promise((r) => out.once('drain', r));
        clips++;
        bytes += c.bytes;
      }
    }
    let images = 0;
    for (let offset = 0; ; offset += 50) {
      const page = await db.select().from(aiImages).orderBy(aiImages.id).limit(50).offset(offset);
      if (page.length === 0) break;
      for (const { data, createdBy: _c, reviewedBy: _r, ...rest } of page) {
        const line: ImageLine = {
          type: 'image',
          row: { ...rest, data: Buffer.from(data).toString('base64') },
        };
        if (!out.write(JSON.stringify(line) + '\n')) await new Promise((r) => out.once('drain', r));
        images++;
        bytes += rest.bytes;
      }
    }
    out.end();
    await done;
    return { secrets: Object.keys(secrets), settings: Object.keys(settings), clips, images, bytes };
  } finally {
    await pool.end();
  }
}

export async function importCarry(
  file: string,
  url = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
) {
  const pass = passphrase();
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  try {
    const lines = createInterface({
      input: createReadStream(file).pipe(createGunzip()),
      crlfDelay: Infinity,
    });
    let header: Header | undefined;
    let batch: ClipLine[] = [];
    let added = 0;
    let seen = 0;
    let imagesSeen = 0;
    let imagesAdded = 0;
    const flush = async () => {
      if (batch.length === 0) return;
      const r = await db
        .insert(voiceClips)
        .values(
          batch.map((c) => ({
            key: c.key,
            text: c.text,
            voice: c.voice,
            mime: c.mime,
            data: Buffer.from(c.data, 'base64'),
            bytes: c.bytes,
          })),
        )
        .onConflictDoNothing()
        .returning({ key: voiceClips.key });
      added += r.length;
      batch = [];
    };
    for await (const raw of lines) {
      if (!raw.trim()) continue;
      const row = JSON.parse(raw) as Header | ClipLine | ImageLine;
      if (row.type === 'header') {
        header = row;
        // API key: dibuka dengan kata sandi sementara, dikunci dengan JWT_SECRET server.
        for (const [k, l] of Object.entries(row.secrets)) {
          const value = seal(unlock(l, pass));
          await db
            .insert(appSettings)
            .values({ key: k, value })
            .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
        }
        for (const [k, v] of Object.entries(row.settings))
          await db
            .insert(appSettings)
            .values({ key: k, value: v })
            .onConflictDoUpdate({
              target: appSettings.key,
              set: { value: v, updatedAt: new Date() },
            });
        continue;
      }
      if (!header) throw new Error('File tidak valid (header tidak ada)');
      if (row.type === 'image') {
        const { data, createdAt, reviewedAt, ...rest } = row.row;
        const r = await db
          .insert(aiImages)
          .values({
            ...rest,
            data: Buffer.from(data, 'base64'),
            createdAt: new Date(createdAt),
            reviewedAt: reviewedAt ? new Date(reviewedAt) : null,
          })
          .onConflictDoNothing()
          .returning({ id: aiImages.id });
        imagesSeen++;
        imagesAdded += r.length;
        continue;
      }
      seen++;
      batch.push(row);
      if (batch.length >= 200) await flush();
    }
    await flush();
    const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(voiceClips);
    return {
      secrets: Object.entries(header?.secrets ?? {}).map(([k, l]) => `${k} (…${l.last4})`),
      settings: Object.keys(header?.settings ?? {}),
      clips: seen,
      added,
      totalClips: n,
      images: imagesSeen,
      imagesAdded,
    };
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  const [cmd, file] = process.argv.slice(2).filter((a) => a !== '--');
  const run =
    cmd === 'export' && file
      ? exportCarry(file).then(
          (r) =>
            `Diekspor: kunci ${r.secrets.join(', ') || '-'}; pengaturan ${r.settings.join(', ') || '-'}; ` +
            `${r.clips} klip suara, ${r.images} gambar AI (${(r.bytes / 1e6).toFixed(1)} MB) → ${file}`,
        )
      : cmd === 'import' && file
        ? importCarry(file).then(
            (r) =>
              `Diimpor: kunci ${r.secrets.join(', ') || '-'}; pengaturan ${r.settings.join(', ') || '-'}; ` +
              `${r.added} dari ${r.clips} klip baru (total ${r.totalClips} klip di server); ` +
              `${r.imagesAdded} dari ${r.images} gambar AI baru.`,
          )
        : Promise.reject(new Error('Pakai: carry export <file> | carry import <file>'));
  run
    .then((msg) => console.log(msg))
    .catch((err: unknown) => {
      console.error((err as Error).message);
      process.exit(1);
    });
}
