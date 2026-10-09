import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exportCarry, importCarry } from '../src/cli/carry.js';
import { open, seal, type Sealed } from '../src/common/secret-box.js';
import * as schema from '../src/db/schema.js';
import { dbAvailable } from './e2e-setup.js';

const URL =
  process.env.DATABASE_URL_TEST_CARRY ??
  'postgres://littlecoder:littlecoder@localhost:5432/littlecoder_test_carry';
const hasDb = await dbAvailable(URL);

/** Bawa kunci API + pengaturan suara + klip dari laptop ke server tanpa diisi/dibayar dua kali (D-091). */
describe.skipIf(!hasDb)('carry: kunci API & klip suara', () => {
  const pool = new Pool({ connectionString: URL });
  const dir = mkdtempSync(join(tmpdir(), 'carry-'));
  const file = join(dir, 'carry.ndjson.gz');

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'uji-jwt-secret-minimal-32-karakter-panjang!!';
    await pool.query(
      'drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;',
    );
    await migrate(drizzle(pool, { schema }), {
      migrationsFolder: join(import.meta.dirname, '..', 'drizzle'),
    });
    await pool.query('insert into app_settings (key, value) values ($1, $2), ($3, $4), ($5, $6)', [
      'voice_key',
      JSON.stringify(seal('kunci-google-rahasia-ABCD')),
      'ai_claude_key',
      JSON.stringify(seal('kunci-claude-rahasia-WXYZ')),
      'voice',
      JSON.stringify({ enabled: true, model: 'chirp3-hd', voice: 'Leda', style: 'x', rate: 1 }),
    ]);
    await pool.query(
      "insert into ai_images (fingerprint, kind, subject, label, prompt, model, quality, size, status, mime, data, bytes) values ('fp-uji', 'object', 'apel', 'apel', 'p', 'm', 'low', '1024x1024', 'approved', 'image/png', $1, 2)",
      [Buffer.from([7, 8])],
    );
    for (let i = 0; i < 3; i++)
      await pool.query(
        "insert into voice_clips (key, text, voice, mime, data, bytes) values ($1, $2, 'chirp3-hd/Leda', 'audio/mpeg', $3, 3)",
        [String(i).repeat(64), `teks ${i}`, Buffer.from([1, 2, i])],
      );
  });
  afterAll(async () => {
    await pool.end();
    rmSync(dir, { recursive: true, force: true });
  });

  it('ekspor tidak memuat kunci terbaca; impor ke database kosong memulihkan kunci, pengaturan, dan klip', async () => {
    process.env.CARRY_PASSPHRASE = 'kata-sandi-sementara-uji';
    const out = await exportCarry(file, URL);
    expect(out).toMatchObject({ secrets: ['voice_key', 'ai_claude_key'], clips: 3, images: 1 });
    const { gunzipSync } = await import('node:zlib');
    const { readFileSync } = await import('node:fs');
    const raw = gunzipSync(readFileSync(file)).toString('utf8');
    expect(raw).not.toContain('kunci-google-rahasia');
    expect(raw).not.toContain('kunci-claude-rahasia');

    // "Server baru": tanpa kunci & klip.
    await pool.query('delete from app_settings; delete from voice_clips; delete from ai_images;');
    const r = await importCarry(file, URL);
    expect(r).toMatchObject({ added: 3, clips: 3, totalClips: 3, images: 1, imagesAdded: 1 });
    const img = await pool.query("select status, data from ai_images where fingerprint = 'fp-uji'");
    expect(img.rows[0].status).toBe('approved');
    expect([...img.rows[0].data]).toEqual([7, 8]);
    expect(r.secrets).toEqual(['voice_key (…ABCD)', 'ai_claude_key (…WXYZ)']);
    const keys = await pool.query('select key, value from app_settings order by key');
    const byKey = Object.fromEntries(keys.rows.map((x) => [x.key, x.value]));
    expect(open(byKey.voice_key as Sealed)).toBe('kunci-google-rahasia-ABCD');
    expect(open(byKey.ai_claude_key as Sealed)).toBe('kunci-claude-rahasia-WXYZ');
    expect(byKey.voice).toMatchObject({ model: 'chirp3-hd', voice: 'Leda' });
    const clip = await pool.query("select data from voice_clips where text = 'teks 2'");
    expect([...clip.rows[0].data]).toEqual([1, 2, 2]);

    // Impor ulang aman; kata sandi salah ditolak tanpa mengubah apa pun.
    expect(await importCarry(file, URL)).toMatchObject({ added: 0, imagesAdded: 0 });
    process.env.CARRY_PASSPHRASE = 'kata-sandi-yang-salah!!';
    await expect(importCarry(file, URL)).rejects.toThrow(/Kata sandi file salah/);
    delete process.env.CARRY_PASSPHRASE;
  });

  it('--images-only: hanya gambar, tanpa kata sandi; kunci, pengaturan, dan klip server tidak disentuh', async () => {
    delete process.env.CARRY_PASSPHRASE;
    const imgFile = join(dir, 'gambar.ndjson.gz');
    const out = await exportCarry(imgFile, URL, { imagesOnly: true });
    expect(out).toMatchObject({ secrets: [], settings: [], clips: 0, images: 1 });

    // Server punya kunci & klip sendiri; gambar belum ada.
    await pool.query(
      "delete from ai_images; update app_settings set value = '{\"x\":1}' where key = 'voice'",
    );
    const before = await pool.query('select key, value from app_settings order by key');
    const r = await importCarry(imgFile, URL);
    expect(r).toMatchObject({ secrets: [], settings: [], clips: 0, images: 1, imagesAdded: 1 });
    expect((await pool.query('select key, value from app_settings order by key')).rows).toEqual(
      before.rows,
    );
    expect((await pool.query('select count(*)::int n from voice_clips')).rows[0].n).toBe(3);
    // Gambar yang sudah ada di server tidak ditimpa.
    expect(await importCarry(imgFile, URL)).toMatchObject({ imagesAdded: 0 });
  });

  it('--since: hanya klip & gambar baru sejak tanggal itu, tanpa kunci', async () => {
    const f = join(dir, 'baru.ndjson.gz');
    await pool.query("update voice_clips set created_at = now() - interval '10 days'");
    await pool.query("update voice_clips set created_at = now() where text = 'teks 2'");
    const out = await exportCarry(f, URL, { since: new Date(Date.now() - 86_400_000) });
    expect(out).toMatchObject({ secrets: [], settings: [], clips: 1 });
  });
});
