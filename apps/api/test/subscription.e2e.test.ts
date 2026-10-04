import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dbAvailable, startApp } from './e2e-setup.js';

const URL =
  process.env.DATABASE_URL_TEST_SUB ??
  'postgres://littlecoder:littlecoder@localhost:5432/littlecoder_test_sub';
const hasDb = await dbAvailable(URL);
const DAY = 86_400_000;
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Masa langganan (D-043): paket 30/90 hari dihitung tepat; setelah habis level berbayar terkunci lagi,
 * tetapi skor, riwayat, dan progres anak TIDAK hilang.
 */
describe.skipIf(!hasDb)('paket berlangganan: masa berlaku & kedaluwarsa', () => {
  let ctx: Awaited<ReturnType<typeof startApp>>;
  let parentToken = '';
  let childToken = '';
  let childId = '';
  let methodId = '';
  let ids: string[] = [];
  const pin = ['kucing', 'apel', 'bola'];

  const buy = async (durationDays: number) => {
    const { http, auth, adminToken } = ctx;
    const pkg = await http()
      .post('/admin/packages')
      .set(auth(adminToken))
      .send({ name: `Semua buku ${durationDays} hari`, scope: 'all', durationDays, price: 50_000 })
      .expect(201);
    const order = await http()
      .post('/parent/orders')
      .set(auth(parentToken))
      .send({ packageId: pkg.body.id, methodId })
      .expect(201);
    await http()
      .put(`/parent/orders/${order.body.id}/proof`)
      .set(auth(parentToken))
      .set('Content-Type', 'image/png')
      .send(PNG)
      .expect(200);
    await http().post(`/admin/orders/${order.body.id}/approve`).set(auth(adminToken)).expect(200);
    return pkg.body.id as string;
  };
  const quiz = (i: number, correct = 9) => ({
    id: randomUUID(),
    skillId: ids[i]!,
    correct,
    total: 10,
    ts: Date.now() + i,
    durationMs: 60_000,
  });

  beforeAll(async () => {
    ctx = await startApp(URL, { paywall: true });
    const { http, auth, adminToken } = ctx;
    const p = await http()
      .post('/auth/parent/register')
      .send({
        name: 'Ibu Langganan',
        email: 'langganan@contoh.id',
        password: 'rahasia123',
        consent: true,
      })
      .expect(201);
    parentToken = p.body.token;
    const c = await http()
      .post('/parent/children')
      .set(auth(parentToken))
      .send({ nickname: 'Tia', momoColor: 'ungu', pin })
      .expect(201);
    childId = c.body.id;
    childToken = (
      await http()
        .post('/auth/child/login')
        .send({ familyCode: p.body.familyCode, childId, pin })
        .expect(200)
    ).body.token;
    const m = await http()
      .post('/admin/payment-methods')
      .set(auth(adminToken))
      .send({
        kind: 'bank',
        provider: 'BCA',
        accountNumber: '1234567890',
        accountName: 'Cleo Kids',
      })
      .expect(201);
    methodId = m.body.id;
    ids = (
      await ctx.pool.query(
        `select id from skills where domain = 'math' and grade = 'prek' and category = 'A' and status = 'active' order by "order"`,
      )
    ).rows.map((r: { id: string }) => r.id);
  }, 120_000);

  afterAll(async () => {
    await ctx?.close();
  });

  it('paket 30 hari: akhir masa aktif tepat +30 hari; level 3+ terbuka selama aktif', async () => {
    const before = Date.now();
    await buy(30);
    const ov = await ctx.http().get('/parent/billing').set(ctx.auth(parentToken)).expect(200);
    const ends = Date.parse(ov.body.entitlements[0].endsAt);
    expect(ends - before).toBeGreaterThanOrEqual(30 * DAY - 5_000);
    expect(ends - before).toBeLessThanOrEqual(30 * DAY + 60_000);
    const res = await ctx
      .http()
      .post('/practice/sync')
      .set(ctx.auth(childToken))
      .send({ answers: [], states: [], quizzes: [quiz(0), quiz(1), quiz(2), quiz(3)] })
      .expect(200);
    expect(res.body.rejectedQuizzes).toEqual([]);
  });

  it('beli paket 90 hari lagi saat masih aktif → diperpanjang dari akhir yang berjalan? (paket berbeda: berdiri sendiri)', async () => {
    const pkg90 = await buy(90);
    const rows = (
      await ctx.pool.query(
        'select package_id, ends_at from entitlements where parent_id is not null order by created_at',
      )
    ).rows as { package_id: string; ends_at: Date }[];
    const e90 = rows.find((r) => r.package_id === pkg90)!;
    expect(e90.ends_at.getTime() - Date.now()).toBeGreaterThan(89 * DAY);
    expect(e90.ends_at.getTime() - Date.now()).toBeLessThan(91 * DAY);
  });

  it('masa aktif habis → level berbayar terkunci lagi, tetapi skor & riwayat tetap ada', async () => {
    const { http, auth, pool } = ctx;
    const profileBefore = (await http().get('/practice/profile').set(auth(childToken)).expect(200))
      .body;
    const resultsBefore = (
      await pool.query('select count(*) n from quiz_results where child_id = $1', [childId])
    ).rows[0].n;
    // Semua paket keluarga ini berakhir kemarin.
    await pool.query(
      "update entitlements set ends_at = now() - interval '1 day' where parent_id is not null",
    );

    const cat = await http().get('/catalog').set(auth(childToken)).expect(200);
    expect(cat.body.access.all).toBe(false);
    // Pesan anak "masa paket berakhir" (D-046); anak keluarga → tanpa noParent.
    expect(cat.body.access.expired).toBe(true);
    expect(cat.body.access.noParent).toBeUndefined();
    expect(cat.body.skills.find((s: { id: string }) => s.id === ids[4]).stub).toBe(true);
    // Level 5 (berbayar) ditolak; level 1 (gratis) tetap bisa.
    const sync = await http()
      .post('/practice/sync')
      .set(auth(childToken))
      .send({ answers: [], states: [], quizzes: [quiz(4), quiz(0, 10)] })
      .expect(200);
    expect(sync.body.rejectedQuizzes).toHaveLength(1);

    // Data lama tidak hilang: hasil level 3–4 dan riwayat tetap.
    const resultsAfter = (
      await pool.query('select count(*) n from quiz_results where child_id = $1', [childId])
    ).rows[0].n;
    expect(Number(resultsAfter)).toBe(Number(resultsBefore));
    const profileAfter = (await http().get('/practice/profile').set(auth(childToken)).expect(200))
      .body;
    expect(profileAfter.totalPoints).toBeGreaterThanOrEqual(profileBefore.totalPoints);
    expect(profileAfter.passedLevels).toBeGreaterThanOrEqual(profileBefore.passedLevels);
    expect(profileAfter.played).toBe(profileBefore.played + 1);

    const parent = await http().get('/parent/overview').set(auth(parentToken)).expect(200);
    expect(parent.body.children[0].plan.tier).toBe('free');
    expect(parent.body.children[0].insights.totals.passed).toBeGreaterThanOrEqual(4);
    // Riwayat paket tetap terlihat (sudah berakhir).
    const billing = await http().get('/parent/billing').set(auth(parentToken)).expect(200);
    expect(billing.body.entitlements.length).toBe(2);
    expect(billing.body.access.all).toBe(false);
  });

  it('beli lagi setelah habis → terbuka kembali, progres lama tetap', async () => {
    await buy(30);
    const cat = await ctx.http().get('/catalog').set(ctx.auth(childToken)).expect(200);
    expect(cat.body.access.all).toBe(true);
    const state = await ctx.http().get('/practice/state').set(ctx.auth(childToken)).expect(200);
    expect(state.body.quizzes[ids[3]!].passed).toBe(true);
  });

  it('anak daftar sendiri (tanpa orang tua) → access.noParent untuk pesan "minta orang tua daftar" (D-046)', async () => {
    const kid = await ctx.newChild('Mandiri');
    const cat = await ctx.http().get('/catalog').set(ctx.auth(kid.token)).expect(200);
    expect(cat.body.access).toMatchObject({ paywall: true, all: false, noParent: true });
    expect(cat.body.access.expired).toBeUndefined();
  });

  it('pengingat masa paket via email (D-054): H-5, H-3, H-1 sekali saja; tidak dikirim bila sudah diperpanjang', async () => {
    const { pool } = ctx;
    const { ExpiryReminderService } = await import('../src/billing/expiry-reminder.service.js');
    const svc = ctx.app.get(ExpiryReminderService);
    const [{ id: parentId }] = (
      await pool.query<{ id: string }>("select id from parents where email = 'langganan@contoh.id'")
    ).rows as [{ id: string }];
    await pool.query('delete from entitlements where parent_id = $1', [parentId]);
    const ins = await pool.query<{ id: string }>(
      `insert into entitlements (parent_id, name, scope, books, starts_at, ends_at)
       values ($1, 'Semua buku 30 hari', 'all', '[]', now() - interval '25 days', now() + interval '4 days 12 hours') returning id`,
      [parentId],
    );
    const entId = ins.rows[0]!.id;
    const kinds = async () =>
      (
        await pool.query<{ kind: string; subject: string; html: string | null }>(
          "select kind, subject, html from email_outbox where ref_id = $1 and kind like 'expiry_%' order by created_at",
          [entId],
        )
      ).rows;
    expect(await svc.run()).toBe(1);
    expect(await svc.run()).toBe(0); // tidak dobel
    let rows = await kinds();
    expect(rows.map((r) => r.kind)).toEqual(['expiry_5']);
    expect(rows[0]!.subject).toBe('Paket Semua buku 30 hari berakhir 5 hari lagi');
    // H-3 dan H-1.
    await pool.query(
      "update entitlements set ends_at = now() + interval '2 days 6 hours' where id = $1",
      [entId],
    );
    expect(await svc.run()).toBe(1);
    await pool.query(
      "update entitlements set ends_at = now() + interval '10 hours' where id = $1",
      [entId],
    );
    expect(await svc.run()).toBe(1);
    rows = await kinds();
    expect(rows.map((r) => r.kind)).toEqual(['expiry_5', 'expiry_3', 'expiry_1']);
    expect(rows[2]!.subject).toContain('berakhir besok');
    // H-4 bukan hari pengingat.
    await pool.query(
      "update entitlements set ends_at = now() + interval '3 days 12 hours' where id = $1",
      [entId],
    );
    expect(await svc.run()).toBe(0);
    // Sudah diperpanjang (paket lain lebih lama) → tidak diingatkan.
    await pool.query('delete from email_outbox where ref_id = $1', [entId]);
    await pool.query(
      "update entitlements set ends_at = now() + interval '4 days 12 hours' where id = $1",
      [entId],
    );
    await pool.query(
      `insert into entitlements (parent_id, name, scope, books, starts_at, ends_at)
       values ($1, 'Semua buku 90 hari', 'all', '[]', now(), now() + interval '90 days')`,
      [parentId],
    );
    expect(await svc.run()).toBe(0);
    await pool.query('delete from entitlements where parent_id = $1', [parentId]);
  });

  it('API key suara dari admin (D-043): terenkripsi, tidak pernah dikirim balik, kosong → suara browser', async () => {
    const { http, auth, adminToken, pool } = ctx;
    const key = 'AIzaSyDUMMYKEY_untuk_test_1234567890abcd';
    const before = await http().get('/admin/voice').set(auth(adminToken)).expect(200);
    expect(before.body).toMatchObject({ providerReady: false, key: { source: null } });
    expect((await http().get('/voice/lines')).body.enabled).toBe(false);
    await http().put('/admin/voice/key').set(auth(parentToken)).send({ apiKey: key }).expect(403);
    await http()
      .put('/admin/voice/key')
      .set(auth(adminToken))
      .send({ apiKey: 'pendek' })
      .expect(400);
    const saved = await http()
      .put('/admin/voice/key')
      .set(auth(adminToken))
      .send({ apiKey: key })
      .expect(200);
    expect(saved.body).toMatchObject({ source: 'admin', last4: 'abcd' });
    const after = await http().get('/admin/voice').set(auth(adminToken)).expect(200);
    expect(after.body.providerReady).toBe(true);
    expect(JSON.stringify(after.body)).not.toContain(key);
    const [row] = (await pool.query("select value from app_settings where key = 'voice_key'")).rows;
    expect(JSON.stringify(row.value)).not.toContain(key);
    expect((await http().get('/voice/lines')).body.enabled).toBe(true);
    await http().delete('/admin/voice/key').set(auth(adminToken)).expect(200);
    const gone = await http().get('/admin/voice').set(auth(adminToken)).expect(200);
    expect(gone.body).toMatchObject({ providerReady: false, key: { source: null } });
  });
});
