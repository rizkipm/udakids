import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MailTransport } from '../src/mail/mail.service.js';
import { dbAvailable, startApp } from './e2e-setup.js';

const URL =
  process.env.DATABASE_URL_TEST_AFF ??
  'postgres://littlecoder:littlecoder@localhost:5432/littlecoder_test_aff';
const hasDb = await dbAvailable(URL);
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** Email terkirim (palsu) — untuk membaca kode verifikasi rekening. */
const sent: { to: string; subject: string; text: string }[] = [];
const fakeMail: MailTransport = {
  send: async (m) => {
    sent.push({ to: m.to, subject: m.subject, text: m.text });
  },
};

describe.skipIf(!hasDb)('afiliasi orang tua (D-063)', () => {
  let ctx: Awaited<ReturnType<typeof startApp>>;
  let methodId = '';
  let packageId = '';
  const pin = ['kucing', 'apel', 'bola'];
  const A = { token: '', id: '', code: '' };
  const B = { token: '', id: '', childId: '' };

  const register = async (name: string, email: string, referralCode?: string) => {
    const r = await ctx
      .http()
      .post('/auth/parent/register')
      .send({ name, email, password: 'rahasia123', consent: true, referralCode })
      .expect(201);
    return { token: r.body.token as string, id: r.body.user.id as string };
  };
  const get = (path: string, token: string) => ctx.http().get(path).set(ctx.auth(token));
  const post = (path: string, token: string) => ctx.http().post(path).set(ctx.auth(token));
  const buy = async (token: string) => {
    const order = await post('/parent/orders', token).send({ packageId, methodId }).expect(201);
    await ctx
      .http()
      .put(`/parent/orders/${order.body.id}/proof`)
      .set(ctx.auth(token))
      .set('Content-Type', 'image/png')
      .send(PNG)
      .expect(200);
    await post(`/admin/orders/${order.body.id}/approve`, ctx.adminToken).expect(200);
    return order.body as { id: string; amount: number; uniqueCode: number };
  };
  const ledger = async (parentId: string) =>
    (
      await ctx.pool.query(
        'select type, state, amount, base_amount, rate_bp from affiliate_ledger where parent_id = $1 order by created_at',
        [parentId],
      )
    ).rows as {
      type: string;
      state: string;
      amount: number;
      base_amount: number | null;
      rate_bp: number | null;
    }[];
  const accountCode = async (token: string, email: string) => {
    await post('/parent/affiliate/account/code', token).expect(200);
    for (let i = 0; i < 50; i++) {
      const m = sent.filter((x) => x.to === email && /rekening pencairan/.test(x.subject)).at(-1);
      if (m) return m.subject.slice(0, 6);
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error('kode tidak terkirim');
  };

  beforeAll(async () => {
    ctx = await startApp(URL, { paywall: true, mail: fakeMail });
    const { http, auth, adminToken } = ctx;
    methodId = (
      await http()
        .post('/admin/payment-methods')
        .set(auth(adminToken))
        .send({
          kind: 'bank',
          provider: 'BCA',
          accountNumber: '1234567890',
          accountName: 'Udakids',
        })
        .expect(201)
    ).body.id;
    packageId = (
      await http()
        .post('/admin/packages')
        .set(auth(adminToken))
        .send({ name: 'Semua buku 30 hari', scope: 'all', durationDays: 30, price: 10_000 })
        .expect(201)
    ).body.id;
    Object.assign(A, await register('Rizki Syaputra', 'rizki@contoh.id'));
  }, 120_000);

  afterAll(async () => {
    await ctx?.close();
  });

  it('kode & link referal; cek kode hanya menampilkan nama tersamar; klik dihitung sekali per hari', async () => {
    const ov = await get('/parent/affiliate', A.token).expect(200);
    A.code = ov.body.code;
    expect(A.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(ov.body.link).toMatch(new RegExp(`/r/${A.code}$`));
    expect(ov.body.rules).toMatchObject({
      signupBonus: 3500,
      commissionBp: 3300,
      minPayout: 15_000,
    });
    // Kode tetap sama setiap dibuka.
    expect((await get('/parent/affiliate', A.token).expect(200)).body.code).toBe(A.code);

    const pv = await ctx.http().get(`/referral/${A.code.toLowerCase()}`).expect(200);
    expect(pv.body).toEqual({ valid: true, code: A.code, name: 'Ri*** Sy***' });
    expect(JSON.stringify(pv.body)).not.toMatch(/@/);
    expect((await ctx.http().get('/referral/ZZZZZZ').expect(200)).body).toEqual({ valid: false });

    await ctx.http().post(`/referral/${A.code}/click`).expect(204);
    await ctx.http().post(`/referral/${A.code}/click`).expect(204);
    const after = await get('/parent/affiliate', A.token).expect(200);
    expect(after.body.counts.clicks).toBe(1);
  });

  it('teman daftar pakai kode → bonus Rp3.500 TERTAHAN; cair setelah anaknya main 3 ronde', async () => {
    Object.assign(
      B,
      await register(
        'Budi Santoso',
        'budi@contoh.id',
        ` ${A.code.slice(0, 3)}-${A.code.slice(3)} `,
      ),
    );
    const referred = await ctx.pool.query('select referred_by from parents where id = $1', [B.id]);
    expect(referred.rows[0].referred_by).toBe(A.id);
    expect(await ledger(A.id)).toEqual([
      { type: 'signup_bonus', state: 'pending', amount: 3500, base_amount: null, rate_bp: null },
    ]);
    let ov = await get('/parent/affiliate', A.token).expect(200);
    expect(ov.body.balance).toMatchObject({ available: 0, pending: 3500 });

    // Kode tak dikenal tidak menggagalkan pendaftaran.
    const C = await register('Citra Lestari', 'citra@contoh.id', 'ZZZZZZ');
    expect(
      (await ctx.pool.query('select referred_by from parents where id = $1', [C.id])).rows[0]
        .referred_by,
    ).toBeNull();

    B.childId = (
      await post('/parent/children', B.token)
        .send({ nickname: 'Dodi', momoColor: 'hijau', pin })
        .expect(201)
    ).body.id;
    for (let i = 0; i < 3; i++)
      await ctx.pool.query(
        `insert into events (id, child_id, type, payload, ts) values ($1, $2, 'quiz_result', '{}'::jsonb, now())`,
        [randomUUID(), B.childId],
      );
    ov = await get('/parent/affiliate', A.token).expect(200);
    expect(ov.body.balance).toMatchObject({ available: 3500, pending: 0 });
    expect(ov.body.counts).toMatchObject({ signups: 1, verified: 1, active: 1, subscribers: 0 });
  });

  it('teman berlangganan → komisi 33% dari harga paket (tanpa kode unik), tertahan 7 hari lalu cair', async () => {
    const order = await buy(B.token);
    expect(order.amount).toBe(10_000 + order.uniqueCode);
    const c = (await ledger(A.id)).find((e) => e.type === 'commission')!;
    expect(c).toMatchObject({ state: 'pending', amount: 3300, base_amount: 10_000, rate_bp: 3300 });
    // Komisi hanya sekali per pesanan walau persetujuan diulang.
    await post(`/admin/orders/${order.id}/approve`, ctx.adminToken).expect(409);
    expect((await ledger(A.id)).filter((e) => e.type === 'commission')).toHaveLength(1);

    await ctx.pool.query(
      "update affiliate_ledger set available_at = now() - interval '1 minute' where type = 'commission'",
    );
    const ov = await get('/parent/affiliate', A.token).expect(200);
    expect(ov.body.balance).toMatchObject({ available: 6800, pending: 0, earned: 6800 });
    expect(ov.body.counts.subscribers).toBe(1);
  });

  it('anggota & analisis: nama tersamar, tanpa email/data anak; pohon menghitung anggota tingkat 2', async () => {
    await register(
      'Dewi Anggraini',
      'dewi@contoh.id',
      (await get('/parent/affiliate', B.token).expect(200)).body.code,
    );
    const m = await get('/parent/affiliate/members', A.token).expect(200);
    expect(m.body.total).toBe(1);
    expect(m.body.items[0]).toMatchObject({
      name: 'Bu*** Sa***',
      status: 'subscribed',
      paidOrders: 1,
      earned: 6800,
      subMembers: 1,
    });
    const raw = JSON.stringify(m.body);
    expect(raw).not.toMatch(/@|budi|Dodi/i);
    // Komisi tetap 1 tingkat: A tidak mendapat apa pun dari anggota B.
    expect((await ledger(A.id)).filter((e) => e.type === 'signup_bonus')).toHaveLength(1);

    const an = await get('/parent/affiliate/analytics', A.token).expect(200);
    expect(an.body.months).toHaveLength(12);
    const now = an.body.months.at(-1);
    expect(now).toMatchObject({ clicks: 1, signups: 1, subscribers: 1, earned: 6800 });
  });

  it('pencairan: minimal 15.000, wajib rekening terverifikasi via kode email, jeda setelah ganti rekening', async () => {
    let r = await post('/parent/affiliate/payouts', A.token).send({ amount: 15_000 }).expect(400);
    expect(r.body.reason).toBe('no_account');
    const code = await accountCode(A.token, 'rizki@contoh.id');
    await ctx
      .http()
      .put('/parent/affiliate/account')
      .set(ctx.auth(A.token))
      .send({
        providerId: 'bca',
        accountNumber: '111-222-3333',
        holderName: 'RIZKI SYAPUTRA',
        code: '000000',
      })
      .expect(400);
    const acc = await ctx
      .http()
      .put('/parent/affiliate/account')
      .set(ctx.auth(A.token))
      .send({
        providerId: 'bca',
        accountNumber: '111-222-3333',
        holderName: 'RIZKI SYAPUTRA',
        code,
      })
      .expect(200);
    expect(acc.body).toMatchObject({ status: 'verified', nameMatch: true, last4: '3333' });
    expect(JSON.stringify(acc.body)).not.toContain('1112223333');
    const stored = await ctx.pool.query(
      'select account_sealed::text as s from affiliate_accounts where parent_id = $1',
      [A.id],
    );
    expect(stored.rows[0].s).not.toContain('1112223333');

    r = await post('/parent/affiliate/payouts', A.token).send({ amount: 15_000 }).expect(400);
    expect(r.body.reason).toBe('cooldown');
    await ctx.pool.query("update affiliate_accounts set changed_at = now() - interval '4 days'");
    r = await post('/parent/affiliate/payouts', A.token).send({ amount: 15_000 }).expect(400);
    expect(r.body.reason).toBe('over_balance');

    await post(`/admin/affiliate/affiliates/${A.id}/adjust`, ctx.adminToken)
      .send({ amount: 10_000, note: 'Bonus promo bulan ini' })
      .expect(201);
    r = await post('/parent/affiliate/payouts', A.token).send({ amount: 14_999 }).expect(400);
    expect(r.body.reason).toBe('below_minimum');
    const p = await post('/parent/affiliate/payouts', A.token).send({ amount: 15_000 }).expect(201);
    expect(p.body).toMatchObject({ amount: 15_000, status: 'requested' });
    r = await post('/parent/affiliate/payouts', A.token).send({ amount: 15_000 }).expect(400);
    expect(r.body.reason).toBe('open_request');
    const ov = await get('/parent/affiliate', A.token).expect(200);
    expect(ov.body.balance.available).toBe(1800);
    expect(ov.body.openPayout).toMatchObject({ amount: 15_000 });
    // Rekening tidak bisa diganti selama ada pengajuan.
    await ctx
      .http()
      .put('/parent/affiliate/account')
      .set(ctx.auth(A.token))
      .send({
        providerId: 'bri',
        accountNumber: '9999999999',
        holderName: 'Rizki Syaputra',
        code: '123456',
      })
      .expect(409);
    // Direksi diberi tahu.
    expect(sent.some((m) => /Pengajuan pencairan/.test(m.subject))).toBe(true);
  });

  it('admin: lihat nomor rekening utuh, tandai sudah ditransfer → buku kas "Komisi afiliasi"', async () => {
    const list = await get('/admin/affiliate/payouts?status=requested', ctx.adminToken).expect(200);
    expect(list.body).toHaveLength(1);
    const p = list.body[0];
    expect(p).toMatchObject({ name: 'Rizki Syaputra', amount: 15_000, last4: '3333' });
    const acc = await get(`/admin/affiliate/payouts/${p.id}/account`, ctx.adminToken).expect(200);
    expect(acc.body.accountNumber).toBe('1112223333');
    // Bukan admin tidak boleh.
    await get(`/admin/affiliate/payouts/${p.id}/account`, A.token).expect(403);

    await post(`/admin/affiliate/payouts/${p.id}/paid`, ctx.adminToken)
      .send({ transferRef: 'TRX-001' })
      .expect(200);
    await post(`/admin/affiliate/payouts/${p.id}/paid`, ctx.adminToken).send({}).expect(409);
    const cash = await ctx.pool.query(
      "select type, amount from cash_entries where category = 'Komisi afiliasi'",
    );
    expect(cash.rows).toEqual([{ type: 'out', amount: 15_000 }]);
    const mine = await get('/parent/affiliate/payouts', A.token).expect(200);
    expect(mine.body[0]).toMatchObject({ status: 'paid', transferRef: 'TRX-001' });
    const ov = await get('/parent/affiliate', A.token).expect(200);
    expect(ov.body.balance).toMatchObject({ available: 1800, paid: 15_000 });
    expect(sent.some((m) => m.to === 'rizki@contoh.id' && /sudah ditransfer/.test(m.subject))).toBe(
      true,
    );
  });

  it('admin menolak / orang tua membatalkan → saldo kembali utuh', async () => {
    await post(`/admin/affiliate/affiliates/${A.id}/adjust`, ctx.adminToken)
      .send({ amount: 20_000, note: 'Uji tolak' })
      .expect(201);
    const p1 = await post('/parent/affiliate/payouts', A.token)
      .send({ amount: 20_000 })
      .expect(201);
    await post(`/admin/affiliate/payouts/${p1.body.id}/reject`, ctx.adminToken)
      .send({ reason: 'Nama rekening perlu dicek ulang' })
      .expect(200);
    let ov = await get('/parent/affiliate', A.token).expect(200);
    expect(ov.body.balance.available).toBe(21_800);
    const p2 = await post('/parent/affiliate/payouts', A.token)
      .send({ amount: 15_000 })
      .expect(201);
    await post(`/parent/affiliate/payouts/${p2.body.id}/cancel`, A.token).expect(200);
    await post(`/parent/affiliate/payouts/${p2.body.id}/cancel`, A.token).expect(409);
    ov = await get('/parent/affiliate', A.token).expect(200);
    expect(ov.body.balance.available).toBe(21_800);
  });

  it('nama rekening beda / nomor dipakai akun lain → menunggu admin + tanda kecurigaan', async () => {
    const code = await accountCode(B.token, 'budi@contoh.id');
    const acc = await ctx
      .http()
      .put('/parent/affiliate/account')
      .set(ctx.auth(B.token))
      .send({ providerId: 'bca', accountNumber: '1112223333', holderName: 'Rizki Syaputra', code })
      .expect(200);
    expect(acc.body).toMatchObject({ status: 'pending', nameMatch: false });
    const pending = await get('/admin/affiliate/accounts?status=pending', ctx.adminToken).expect(
      200,
    );
    const row = pending.body.find((x: { name: string }) => x.name === 'Budi Santoso');
    expect(row.flags).toEqual(expect.arrayContaining(['shared_account', 'name_mismatch']));
    await post(`/admin/affiliate/accounts/${B.id}/review`, ctx.adminToken)
      .send({ approved: false, note: 'Rekening milik orang lain' })
      .expect(200);
    expect((await get('/parent/affiliate', B.token).expect(200)).body.account.status).toBe(
      'rejected',
    );
  });

  it('admin mengubah persen: komisi baru memakai persen baru, komisi lama tidak berubah', async () => {
    const s = (await get('/admin/affiliate/settings', ctx.adminToken).expect(200)).body;
    await ctx
      .http()
      .put('/admin/affiliate/settings')
      .set(ctx.auth(ctx.adminToken))
      .send({ ...s, commissionBp: 5000 })
      .expect(200);
    await buy(B.token);
    const commissions = (await ledger(A.id)).filter((e) => e.type === 'commission');
    expect(commissions.map((c) => [c.amount, c.rate_bp])).toEqual([
      [3300, 3300],
      [5000, 5000],
    ]);
    await ctx
      .http()
      .put('/admin/affiliate/settings')
      .set(ctx.auth(ctx.adminToken))
      .send({ ...s, commissionBp: 120_000 })
      .expect(400);
  });

  it('insight admin: tren 12 bulan, corong, afiliator teratas, biaya vs pendapatan dari referal', async () => {
    const a = await get('/admin/affiliate/analytics', ctx.adminToken).expect(200);
    expect(a.body.months).toHaveLength(12);
    expect(a.body.funnel).toMatchObject({ clicks: 1, signups: 2, subscribers: 1 });
    // Dua pesanan Rp10.000 dari anggota referal (tanpa kode unik).
    expect(a.body.revenue.total).toBe(20_000);
    expect(a.body.cost).toBeGreaterThan(0);
    expect(a.body.top[0]).toMatchObject({ name: 'Rizki Syaputra', members: 1, subscribers: 1 });
    expect(a.body.flaggedAccounts).toBeGreaterThanOrEqual(1);
    await get('/admin/affiliate/analytics', A.token).expect(403);
    const ov = await get('/parent/affiliate', A.token).expect(200);
    expect(ov.body.upcoming).toMatchObject({ bonusWaiting: { count: 0, amount: 0 } });
    expect(ov.body.upcoming.commission).toMatchObject({ amount: 5000 });
  });

  it('batas 7 anak per akun orang tua', async () => {
    const P = await register('Eka Putri', 'eka@contoh.id');
    for (let i = 1; i <= 7; i++)
      await post('/parent/children', P.token)
        .send({
          nickname: ['Ana', 'Bima', 'Caca', 'Dina', 'Elang', 'Fafa', 'Gita'][i - 1],
          momoColor: 'biru',
          pin,
        })
        .expect(201);
    const r = await post('/parent/children', P.token)
      .send({ nickname: 'Hana', momoColor: 'biru', pin })
      .expect(400);
    expect(r.body).toMatchObject({ reason: 'child_limit' });
    expect(r.body.message).toMatch(/maksimal 7 anak/);
    // Menautkan anak yang daftar sendiri juga dibatasi.
    const kid = await ctx.newChild('Mandiri');
    await post('/parent/children/claim', P.token)
      .send({ familyCode: kid.familyCode, pin })
      .expect(400);
  });
});
