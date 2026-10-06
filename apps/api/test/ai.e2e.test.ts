import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AiImageSettings } from '@little-coder/engine';
import type { ImageProvider } from '../src/ai/openai.provider.js';
import { safeError } from '../src/ai/openai.provider.js';
import { dbAvailable, startApp } from './e2e-setup.js';

/** AI Gambar di admin (D-068) dengan penyedia palsu — tidak ada panggilan OpenAI berbayar. */
const URL =
  process.env.DATABASE_URL_TEST_AI ??
  'postgres://littlecoder:littlecoder@localhost:5432/littlecoder_test_ai';
const up = await dbAvailable(URL);

const WEBP = Buffer.from('RIFF0000WEBPVP8 fake-image');
const KEY = 'sk-proj-TESTKEY1234567890abcdefWXYZ';

const calls: { prompt: string; key: string; reference: boolean; settings: AiImageSettings }[] = [];
let failNext = false;
const fakeFactory = (key: string): ImageProvider => ({
  async generate({ prompt, settings, reference }) {
    if (failNext) {
      failNext = false;
      throw new Error(safeError(500, `{"error":{"message":"boom ${key}"}}`));
    }
    calls.push({ prompt, key, reference: !!reference, settings });
    return { mime: 'image/webp', data: WEBP, usage: { input: 1200, cached: 1000, output: 40 } };
  },
  async test(model) {
    return `ok ${model}`;
  },
});

describe.skipIf(!up)('AI Gambar (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof startApp>>;
  const http = () => ctx.http();
  const admin = () => ctx.auth(ctx.adminToken);
  const apel = { kind: 'object', subject: 'apel', label: 'apel', labelEn: 'apple', theme: 'buah' };

  beforeAll(async () => {
    delete process.env.OPENAI_API_KEY;
    ctx = await startApp(URL, { image: fakeFactory });
  }, 120_000);
  afterAll(async () => {
    await ctx?.close();
  });

  it('hanya admin; tanpa kunci → belum siap dan generate ditolak', async () => {
    const child = await ctx.newChild('Raka');
    await http().get('/admin/ai').set(ctx.auth(child.token)).expect(403);
    await http().get('/admin/ai').expect(401);
    const r = await http().get('/admin/ai').set(admin()).expect(200);
    expect(r.body).toMatchObject({ ready: false, key: { source: null } });
    expect(r.body.settings).toMatchObject({ mode: 'responses', textModel: 'gpt-5.6-luna' });
    await http().post('/admin/ai/images').set(admin()).send(apel).expect(503);
  });

  it('simpan kunci butuh sandi admin; kunci tidak pernah dikirim balik & tersimpan terenkripsi', async () => {
    await http()
      .put('/admin/ai/key')
      .set(admin())
      .send({ apiKey: KEY, password: 'keliru' })
      .expect(403);
    await http()
      .put('/admin/ai/key')
      .set(admin())
      .send({ apiKey: 'bukan-kunci', password: 'admin12345' })
      .expect(400);
    const r = await http()
      .put('/admin/ai/key')
      .set(admin())
      .send({ apiKey: KEY, password: 'admin12345' })
      .expect(200);
    expect(r.body).toEqual({
      source: 'admin',
      last4: 'WXYZ',
      updatedAt: expect.any(String),
      unreadable: false,
    });
    const o = await http().get('/admin/ai').set(admin()).expect(200);
    expect(JSON.stringify(o.body)).not.toContain(KEY);
    const row = await ctx.pool.query(
      "select value::text as v from app_settings where key = 'ai_key'",
    );
    expect(row.rows[0].v).not.toContain(KEY);
    const audit = await ctx.pool.query("select detail from ai_usage where action = 'key-set'");
    expect(audit.rows[0].detail).toBe('…WXYZ');
    expect((await http().post('/admin/ai/key/test').set(admin()).expect(200)).body).toEqual({
      ok: true,
      message: 'ok gpt-5.6-luna',
    });
  });

  it('generate sekali, permintaan sama dipakai ulang tanpa biaya', async () => {
    const a = await http().post('/admin/ai/images').set(admin()).send(apel).expect(200);
    expect(a.body).toMatchObject({ reused: false, image: { subject: 'apel', status: 'review' } });
    expect(a.body.costUsd).toBeGreaterThan(0.006);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.key).toBe(KEY);
    expect(calls[0]!.prompt).toContain('apel (apple)');
    const b = await http().post('/admin/ai/images').set(admin()).send(apel).expect(200);
    expect(b.body).toMatchObject({ reused: true, costUsd: 0, image: { id: a.body.image.id } });
    expect(calls).toHaveLength(1);
    // Varian baru = gambar baru.
    await http()
      .post('/admin/ai/images')
      .set(admin())
      .send({ ...apel, variant: 2 })
      .expect(200);
    expect(calls).toHaveLength(2);
    const usage = await ctx.pool.query(
      "select cached_tokens from ai_usage where action = 'generate' and ok",
    );
    expect(usage.rows[0].cached_tokens).toBe(1000);
  });

  it('gambar belum disetujui tidak dilayani publik; setelah disetujui dicache permanen', async () => {
    const [img] = (await http().get('/admin/ai/images?subject=apel').set(admin()).expect(200)).body;
    await http().get(`/pictures/${img.id}`).expect(404);
    const f = await http().get(`/admin/ai/images/${img.id}/file`).set(admin()).expect(200);
    expect(f.headers['cache-control']).toBe('private, no-store');
    await http()
      .patch(`/admin/ai/images/${img.id}`)
      .set(admin())
      .send({ status: 'approved' })
      .expect(200);
    const pub = await http().get(`/pictures/${img.id}`).expect(200);
    expect(pub.headers['content-type']).toBe('image/webp');
    expect(pub.headers['cache-control']).toContain('immutable');
    expect((await http().get('/pictures/subject/apel').expect(200)).body.id).toBeTruthy();
    await http().get('/pictures/subject/Apel%20X').expect(400);
  });

  it('gambar bersama Momo butuh karakter Momo disetujui; referensi ikut dikirim', async () => {
    const scene = { kind: 'scene', subject: 'momo-pasar', label: 'Momo di pasar', withMomo: true };
    await http().post('/admin/ai/images').set(admin()).send(scene).expect(400);
    const momo = await http()
      .post('/admin/ai/images')
      .set(admin())
      .send({ kind: 'character', subject: 'momo', label: 'Momo, robot kecil ungu' })
      .expect(200);
    await http()
      .patch(`/admin/ai/images/${momo.body.image.id}`)
      .set(admin())
      .send({ status: 'approved' })
      .expect(200);
    await http().post('/admin/ai/images').set(admin()).send(scene).expect(200);
    expect(calls.at(-1)!.reference).toBe(true);
  });

  it('gagal dari OpenAI: dicatat tanpa kunci, tidak bocor ke respons', async () => {
    failNext = true;
    const r = await http()
      .post('/admin/ai/images')
      .set(admin())
      .send({ ...apel, subject: 'jeruk', label: 'jeruk' })
      .expect(502);
    expect(JSON.stringify(r.body)).not.toContain(KEY);
    const rows = await ctx.pool.query('select detail from ai_usage where not ok');
    expect(rows.rows[0].detail).not.toContain(KEY);
    expect(rows.rows[0].detail).toContain('sk-…');
  });

  it('batas biaya harian ditegakkan; ubah pengaturan butuh sandi', async () => {
    const o = (await http().get('/admin/ai').set(admin()).expect(200)).body;
    await http()
      .put('/admin/ai/settings')
      .set(admin())
      .send({ settings: { ...o.settings, dailyLimitUsd: 0.001 }, password: 'keliru' })
      .expect(403);
    await http()
      .put('/admin/ai/settings')
      .set(admin())
      .send({ settings: { ...o.settings, dailyLimitUsd: 0.001 }, password: 'admin12345' })
      .expect(200);
    const r = await http()
      .post('/admin/ai/images')
      .set(admin())
      .send({ ...apel, subject: 'pisang', label: 'pisang' })
      .expect(429);
    expect(r.body.message).toMatch(/Batas biaya harian/);
  });

  it('tombol darurat: nonaktif & hapus kunci', async () => {
    const o = (await http().get('/admin/ai').set(admin()).expect(200)).body;
    await http()
      .put('/admin/ai/settings')
      .set(admin())
      .send({
        settings: { ...o.settings, enabled: false, dailyLimitUsd: 5 },
        password: 'admin12345',
      })
      .expect(200);
    await http()
      .post('/admin/ai/images')
      .set(admin())
      .send({ ...apel, subject: 'mangga', label: 'mangga' })
      .expect(503);
    const d = await http().delete('/admin/ai/key').set(admin()).expect(200);
    expect(d.body.source).toBeNull();
  });
});
