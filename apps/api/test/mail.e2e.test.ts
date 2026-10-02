import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MailTransport } from '../src/mail/mail.service.js';
import { orderCreated, verifyEmail } from '../src/mail/templates.js';
import { dbAvailable, startApp } from './e2e-setup.js';

const URL =
  process.env.DATABASE_URL_TEST_MAIL ??
  'postgres://littlecoder:littlecoder@localhost:5432/littlecoder_test_mail';
const hasDb = await dbAvailable(URL);
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

type Sent = Parameters<MailTransport['send']>[0];

/** Email & verifikasi pendaftaran (D-044) dengan pengirim palsu (tidak ada email sungguhan). */
describe.skipIf(!hasDb)('email: verifikasi pendaftaran & notifikasi transaksi', () => {
  let ctx: Awaited<ReturnType<typeof startApp>>;
  const outbox: Sent[] = [];
  const fake: MailTransport = {
    async send(msg) {
      outbox.push(msg);
    },
  };
  const email = 'baru@contoh.id';
  const password = 'rahasia123';
  /** Tunggu sampai antrean terkirim lewat pengirim palsu. */
  const flushed = async () => {
    const { MailService } = await import('../src/mail/mail.service.js');
    await ctx.app.get(MailService).flush();
  };
  const codeFrom = (m: Sent) => /\b(\d{6})\b/.exec(m.subject)![1]!;
  const lastTo = (to: string) => outbox.filter((m) => m.to === to).at(-1)!;

  beforeAll(async () => {
    process.env.EMAIL_VERIFICATION = 'on';
    ctx = await startApp(URL, { mail: fake });
  }, 120_000);
  afterAll(async () => {
    process.env.EMAIL_VERIFICATION = 'off';
    await ctx?.close();
  });

  it('daftar → belum ada token, kode dikirim; login ditolak sebelum verifikasi', async () => {
    const { http } = ctx;
    const r = await http()
      .post('/auth/parent/register')
      .send({ name: 'Ibu <b>Baru</b>', email, password, consent: true })
      .expect(201);
    expect(r.body).toEqual({ verificationRequired: true, email });
    expect(r.body.token).toBeUndefined();
    await flushed();
    const m = lastTo(email);
    expect(m.subject).toMatch(/^\d{6} adalah kode verifikasi/);
    expect(m.html).toContain('Momo From Udakids');
    expect(m.text).toContain('Momo From Udakids');
    // Nama dari pengguna di-escape di HTML.
    expect(m.html).toContain('Ibu &lt;b&gt;Baru&lt;/b&gt;');
    expect(m.html).not.toContain('<b>Baru</b>');
    // Kode tidak disimpan polos di DB.
    const code = codeFrom(m);
    const rows = await ctx.pool.query('select code_hash from email_verifications');
    expect(JSON.stringify(rows.rows)).not.toContain(code);
    const login = await http().post('/auth/parent/login').send({ email, password }).expect(403);
    expect(login.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('kirim ulang: jawaban selalu sama, ada jeda 60 detik', async () => {
    const { http } = ctx;
    const before = outbox.length;
    const a = await http().post('/auth/parent/resend').send({ email }).expect(200);
    const b = await http()
      .post('/auth/parent/resend')
      .send({ email: 'tidakada@contoh.id' })
      .expect(200);
    expect(a.body).toEqual(b.body);
    await flushed();
    // Masih dalam jeda → tidak ada kode baru.
    expect(outbox.length).toBe(before);
  });

  it('kode keliru mengurangi sisa percobaan; kode benar → masuk + email sambutan', async () => {
    const { http } = ctx;
    const code = codeFrom(lastTo(email));
    const wrong = code === '000000' ? '111111' : '000000';
    const bad = await http().post('/auth/parent/verify').send({ email, code: wrong }).expect(400);
    expect(bad.body.attemptsLeft).toBe(4);
    await http().post('/auth/parent/verify').send({ email, code: '12ab56' }).expect(400);
    const ok = await http().post('/auth/parent/verify').send({ email, code }).expect(200);
    expect(ok.body.token).toBeTruthy();
    expect(ok.body.familyCode).toMatch(/^[A-Z0-9]{6}$/);
    await flushed();
    expect(lastTo(email).subject).toMatch(/Selamat datang/i);
    // Kode tidak bisa dipakai lagi; login kini berhasil.
    await http().post('/auth/parent/verify').send({ email, code }).expect(409);
    await http().post('/auth/parent/login').send({ email, password }).expect(200);
    // Email terdaftar & terverifikasi → tidak bisa daftar lagi.
    await http()
      .post('/auth/parent/register')
      .send({ name: 'Lagi', email, password, consent: true })
      .expect(409);
  });

  it('kode kedaluwarsa / terlalu banyak percobaan → harus minta kode baru', async () => {
    const { http, pool } = ctx;
    const e2 = 'kedua@contoh.id';
    await http()
      .post('/auth/parent/register')
      .send({ name: 'Ayah Dua', email: e2, password, consent: true })
      .expect(201);
    await flushed();
    const code = codeFrom(lastTo(e2));
    await pool.query("update email_verifications set expires_at = now() - interval '1 minute'");
    const r = await http().post('/auth/parent/verify').send({ email: e2, code }).expect(400);
    expect(r.body.expired).toBe(true);
    // Lewati jeda kirim ulang, lalu kode baru berlaku.
    await pool.query("update email_verifications set created_at = now() - interval '2 minutes'");
    await http().post('/auth/parent/resend').send({ email: e2 }).expect(200);
    await flushed();
    const fresh = codeFrom(lastTo(e2));
    await pool.query('update email_verifications set attempts = 5 where consumed_at is null');
    const many = await http()
      .post('/auth/parent/verify')
      .send({ email: e2, code: fresh })
      .expect(400);
    expect(many.body.expired).toBe(true);
  });

  it('transaksi: email ke orang tua + direksi; isi email dihapus setelah terkirim', async () => {
    const { http, auth, adminToken, pool } = ctx;
    const token = (await http().post('/auth/parent/login').send({ email, password }).expect(200))
      .body.token as string;
    const pkg = await http()
      .post('/admin/packages')
      .set(auth(adminToken))
      .send({ name: 'Semua buku 30 hari', scope: 'all', durationDays: 30, price: 50_000 })
      .expect(201);
    const m = await http()
      .post('/admin/payment-methods')
      .set(auth(adminToken))
      .send({ kind: 'bank', provider: 'BCA', accountNumber: '1234567890', accountName: 'Udakids' })
      .expect(201);
    const order = await http()
      .post('/parent/orders')
      .set(auth(token))
      .send({ packageId: pkg.body.id, methodId: m.body.id })
      .expect(201);
    await http()
      .put(`/parent/orders/${order.body.id}/proof`)
      .set(auth(token))
      .set('Content-Type', 'image/png')
      .send(PNG)
      .expect(200);
    await http().post(`/admin/orders/${order.body.id}/approve`).set(auth(adminToken)).expect(200);
    await flushed();
    const director = 'udacodingofficial@gmail.com';
    const kinds = (
      await pool.query<{ kind: string; to_email: string; status: string; html: string | null }>(
        "select kind, to_email, status, html from email_outbox where kind like 'order_%' or kind like 'director_%'",
      )
    ).rows;
    for (const k of ['order_created', 'order_proof', 'order_paid'])
      expect(kinds.some((r) => r.kind === k && r.to_email === email)).toBe(true);
    for (const k of ['director_created', 'director_proof', 'director_paid'])
      expect(kinds.some((r) => r.kind === k && r.to_email === director)).toBe(true);
    expect(kinds.every((r) => r.status === 'sent' && r.html === null)).toBe(true);
    const paidMail = outbox.filter((x) => x.to === email).at(-1)!;
    expect(paidMail.html).toContain('Momo From Udakids');
    expect(outbox.some((x) => x.to === director)).toBe(true);
  });

  it('admin: ringkasan tanpa isi email, email uji, verifikasi manual', async () => {
    const { http, auth, adminToken, pool } = ctx;
    const o = await http().get('/admin/mail').set(auth(adminToken)).expect(200);
    expect(o.body.configured).toBe(true);
    expect(o.body.recent[0]).not.toHaveProperty('html');
    // Kode verifikasi tidak terlihat oleh admin maupun tersimpan setelah terkirim.
    expect(JSON.stringify(o.body)).not.toMatch(/\b\d{6} adalah kode/);
    const subj = await pool.query("select subject from email_outbox where kind = 'verify'");
    expect(subj.rows.every((r: { subject: string }) => r.subject.startsWith('••••••'))).toBe(true);
    await http().get('/admin/mail').expect(401);
    const t = await http()
      .post('/admin/mail/test')
      .set(auth(adminToken))
      .send({ to: 'uji@contoh.id' })
      .expect(200);
    expect(t.body.to).toBe('uji@contoh.id');
    expect(lastTo('uji@contoh.id').html).toContain('Momo From Udakids');
    const [p] = (
      await pool.query<{ id: string }>("select id from parents where email = 'kedua@contoh.id'")
    ).rows;
    await http().post(`/admin/mail/parents/${p!.id}/verify`).set(auth(adminToken)).expect(200);
    await http()
      .post('/auth/parent/login')
      .send({ email: 'kedua@contoh.id', password })
      .expect(200);
  });

  it('pengirim gagal → dicoba ulang, lalu bisa dikirim ulang admin', async () => {
    const { http, auth, adminToken, pool } = ctx;
    const orig = fake.send;
    fake.send = async () => {
      throw new Error('SMTP down');
    };
    await http().post('/admin/mail/test').set(auth(adminToken)).send({ to: 'x@contoh.id' });
    fake.send = orig;
    const [row] = (
      await pool.query<{ id: string; status: string }>(
        "select id, status from email_outbox where to_email = 'x@contoh.id'",
      )
    ).rows;
    expect(row!.status).toBe('retry');
    await http().post(`/admin/mail/outbox/${row!.id}/retry`).set(auth(adminToken)).expect(200);
    await flushed();
    expect(lastTo('x@contoh.id')).toBeTruthy();
  });

  it('notifikasi admin (D-045): pendaftaran & transaksi terbaru; hanya admin', async () => {
    const { http, auth, adminToken } = ctx;
    const res = await http().get('/admin/notifications').set(auth(adminToken)).expect(200);
    const items = res.body.items as {
      kind: string;
      title: string;
      status: string | null;
      amount: number | null;
      at: string;
    }[];
    const kinds = new Set(items.map((n) => n.kind));
    for (const k of ['parent', 'order_created', 'order_proof']) expect(kinds.has(k)).toBe(true);
    expect(items.find((n) => n.kind === 'order_created')!.amount).toBeGreaterThan(50_000);
    // Terbaru di atas.
    const times = items.map((n) => n.at);
    expect([...times].sort().reverse()).toEqual(times);
    // Bukan admin → ditolak.
    const parent = (await http().post('/auth/parent/login').send({ email, password }).expect(200))
      .body.token as string;
    await http().get('/admin/notifications').set(auth(parent)).expect(403);
    await http().get('/admin/notifications').expect(401);
  });

  it('template: escape & footer', () => {
    const ctxMail = { appUrl: 'https://udakids.id', brand: 'Udakids' };
    const v = verifyEmail(ctxMail, { name: '<script>x</script>', code: '123456', minutes: 15 });
    expect(v.html).not.toContain('<script>x');
    expect(v.html).toContain('123456');
    const o = orderCreated(ctxMail, {
      number: 'INV-1',
      parentName: 'A & B',
      parentEmail: 'a@b.id',
      packageName: 'Paket "Hebat"',
      priceNormal: 50_000,
      discount: 0,
      uniqueCode: 123,
      amount: 50_123,
      method: { provider: 'BCA', accountNumber: '1', accountName: 'Udakids' },
      expiresAt: new Date('2026-10-02T03:00:00Z'),
      orderId: '00000000-0000-0000-0000-000000000000',
    });
    expect(o.html).toContain('A &amp; B');
    expect(o.html).toContain('Momo From Udakids');
    expect(o.text).toContain('50.123');
  });
});
