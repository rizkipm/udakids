import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AiImageSettings } from '@little-coder/engine';
import type { ImageProvider } from '../src/ai/openai.provider.js';
import { safeError } from '../src/ai/openai.provider.js';
import type { PromptWriter } from '../src/ai/claude.provider.js';
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

/** Penulis prompt Claude palsu (D-092) — tidak ada panggilan Claude berbayar. */
const CLAUDE_KEY = 'sk-ant-api03-TESTKEY1234567890abcdCLDE';
const writes: { subject: string; style: string; guide: string; model: string; key: string }[] = [];
let claudeFails = false;
const fakeWriter = (key: string): PromptWriter => ({
  async write(r, styleGuide, model) {
    if (claudeFails) throw new Error(`Claude down ${key}`);
    writes.push({ subject: r.subject, style: r.style, guide: styleGuide, model, key });
    return {
      prompt: `A realistic photo of a ripe Indonesian ${r.label}, plain light background.`,
      usage: { input: 300, cachedRead: 1500, cacheWrite: 0, output: 900 },
    };
  },
  async test(model) {
    return `Berhasil: ${model}`;
  },
});

describe.skipIf(!up)('AI Gambar (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof startApp>>;
  const http = () => ctx.http();
  const admin = () => ctx.auth(ctx.adminToken);
  const apel = { kind: 'object', subject: 'apel', label: 'apel', labelEn: 'apple', theme: 'buah' };

  beforeAll(async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    ctx = await startApp(URL, { image: fakeFactory, promptWriter: fakeWriter });
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
    // Halaman admin menambah penanda muat ulang `r`; kunci lain tetap ditolak.
    await http().get('/admin/ai/images?status=review&r=3').set(admin()).expect(200);
    await http().get('/admin/ai/images?status=review&x=1').set(admin()).expect(400);
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

  it('Claude menulis prompt, OpenAI menggambar (D-092); gagal → prompt bawaan', async () => {
    // Kunci Claude: format sk-ant-, sandi admin wajib, tidak pernah dikirim balik.
    await http()
      .put('/admin/ai/claude-key')
      .set(admin())
      .send({ apiKey: KEY, password: 'admin12345' })
      .expect(400);
    await http()
      .put('/admin/ai/claude-key')
      .set(admin())
      .send({ apiKey: CLAUDE_KEY, password: 'keliru' })
      .expect(403);
    const k = await http()
      .put('/admin/ai/claude-key')
      .set(admin())
      .send({ apiKey: CLAUDE_KEY, password: 'admin12345' })
      .expect(200);
    expect(k.body).toMatchObject({ source: 'admin', last4: 'CLDE' });
    expect(JSON.stringify(k.body)).not.toContain('TESTKEY');
    expect((await http().post('/admin/ai/claude-key/test').set(admin()).expect(200)).body).toEqual({
      ok: true,
      message: 'Berhasil: claude-opus-5-5',
    });
    // Aktifkan penulis prompt Claude.
    const o = (await http().get('/admin/ai').set(admin()).expect(200)).body;
    // Bawaan: Claude menulis prompt (D-092).
    expect(o).toMatchObject({ claudeReady: true, settings: { promptWriter: 'claude' } });
    await http()
      .put('/admin/ai/settings')
      .set(admin())
      .send({ settings: { ...o.settings, promptWriter: 'claude' }, password: 'admin12345' })
      .expect(200);
    const foto = { kind: 'object', subject: 'foto-contoh-apel', label: 'apel', style: 'foto' };
    const made = await http().post('/admin/ai/images').set(admin()).send(foto).expect(200);
    expect(made.body.reused).toBe(false);
    expect(writes.at(-1)).toMatchObject({
      subject: 'foto-contoh-apel',
      style: 'foto',
      model: 'claude-opus-5-5',
      key: CLAUDE_KEY,
    });
    expect(writes.at(-1)!.guide).toMatch(/realistic photo/);
    // Permintaan yang sama: gambar diambil dari database — Claude & OpenAI tidak dipanggil lagi, tanpa biaya.
    const nWrites = writes.length;
    const nCalls = calls.length;
    const again = await http().post('/admin/ai/images').set(admin()).send(foto).expect(200);
    expect(again.body).toMatchObject({
      reused: true,
      costUsd: 0,
      image: { id: made.body.image.id },
    });
    expect([writes.length, calls.length]).toEqual([nWrites, nCalls]);
    // Gambar yang sudah ada sebelum Claude aktif juga dipakai ulang (penulis prompt tidak ikut sidik jari).
    const old = await http().post('/admin/ai/images').set(admin()).send(apel).expect(200);
    expect(old.body.reused).toBe(true);
    expect(writes.length).toBe(nWrites);
    // OpenAI menerima prompt tulisan Claude; prompt tersimpan untuk review admin.
    expect(calls.at(-1)!.prompt).toBe(
      'A realistic photo of a ripe Indonesian apel, plain light background.',
    );
    // Biaya Claude dicatat di audit "prompt" dan ikut dijumlahkan.
    const usage = await ctx.pool.query(
      "select model, cost_usd, cached_tokens from ai_usage where action = 'prompt' order by created_at desc limit 1",
    );
    expect(usage.rows[0]).toMatchObject({ model: 'claude-opus-5-5', cached_tokens: 1500 });
    expect(Number(usage.rows[0].cost_usd)).toBeGreaterThan(0);
    // Claude gagal → gambar tetap dibuat dengan prompt bawaan; kunci tidak bocor.
    claudeFails = true;
    await http()
      .post('/admin/ai/images')
      .set(admin())
      .send({ ...foto, subject: 'foto-contoh-bola', label: 'bola' })
      .expect(200);
    claudeFails = false;
    expect(calls.at(-1)!.prompt).toMatch(/realistic close-up photo of bola/);
    const fail = await ctx.pool.query(
      "select detail from ai_usage where action = 'prompt' and ok = false order by created_at desc limit 1",
    );
    expect(fail.rows[0].detail).not.toContain('TESTKEY');
    // Kembali ke prompt bawaan untuk test berikutnya.
    await http()
      .put('/admin/ai/settings')
      .set(admin())
      .send({ settings: { ...o.settings, promptWriter: 'none' }, password: 'admin12345' })
      .expect(200);
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
