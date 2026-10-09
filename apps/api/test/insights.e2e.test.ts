import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { jakartaWeekStart } from '../src/reports/insights.controller.js';
import { monthsEnding, resolvePeriod } from '../src/reports/period.js';
import { dbAvailable, startApp } from './e2e-setup.js';

const URL =
  process.env.DATABASE_URL_TEST_INSIGHTS ??
  'postgres://littlecoder:littlecoder@localhost:5432/littlecoder_test_insights';
const hasDb = await dbAvailable(URL);
if (!hasDb) console.warn(`[insights e2e] dilewati: Postgres test tidak tersedia di ${URL}`);

describe('periode', () => {
  const now = new Date('2026-10-09T05:00:00Z'); // Jumat 9 Okt 2026, 12.00 WIB
  it('n hari terakhir: pembanding = n hari sebelumnya', () => {
    expect(resolvePeriod({ days: 7 }, now)).toMatchObject({
      kind: 'days',
      from: '2026-10-03',
      to: '2026-10-09',
      prevFrom: '2026-09-26',
      prevTo: '2026-10-02',
      days: 7,
      bucket: 'day',
    });
  });
  it('bulan berjalan dibanding bulan lalu s.d. tanggal yang sama; bulan selesai dibanding sebulan penuh', () => {
    expect(resolvePeriod({ year: 2026, month: 10 }, now)).toMatchObject({
      from: '2026-10-01',
      to: '2026-10-09',
      prevFrom: '2026-09-01',
      prevTo: '2026-09-09',
    });
    expect(resolvePeriod({ year: 2026, month: 3 }, now)).toMatchObject({
      to: '2026-03-31',
      prevFrom: '2026-02-01',
      prevTo: '2026-02-28',
    });
    expect(resolvePeriod({ year: 2026, month: 1 }, now)).toMatchObject({
      prevFrom: '2025-12-01',
      prevTo: '2025-12-31',
    });
  });
  it('tahun: per bulan; tahun berjalan dibanding tahun lalu s.d. tanggal yang sama', () => {
    expect(resolvePeriod({ year: 2026 }, now)).toMatchObject({
      kind: 'year',
      from: '2026-01-01',
      to: '2026-10-09',
      prevFrom: '2025-01-01',
      prevTo: '2025-10-09',
      bucket: 'month',
    });
    expect(resolvePeriod({ year: 2025 }, now)).toMatchObject({ to: '2025-12-31', days: 365 });
    expect(monthsEnding('2026-02-15')).toHaveLength(12);
    expect(monthsEnding('2026-02-15')[0]).toBe('2025-03');
  });
  it('Senin minggu ini dalam WIB', () => {
    expect(jakartaWeekStart(new Date('2026-10-09T05:00:00Z'))).toBe('2026-10-05'); // Jumat
    expect(jakartaWeekStart(new Date('2026-10-04T18:00:00Z'))).toBe('2026-10-05'); // Senin 01.00 WIB
    expect(jakartaWeekStart(new Date('2026-10-04T16:00:00Z'))).toBe('2026-09-28'); // Minggu 23.00 WIB
  });
});

describe.skipIf(!hasDb)('ringkasan admin /admin/insights (D-039, D-099)', () => {
  let ctx: Awaited<ReturnType<typeof startApp>>;
  let skillId: string;

  const round = (childId: string, score: number, daysAgo: number, durationMs = 60_000) =>
    ctx.pool.query(
      `insert into events (id, child_id, type, payload, ts)
       values ($1, $2, 'quiz_result', $3, now() - make_interval(days => $4))`,
      [randomUUID(), childId, JSON.stringify({ skillId, score, durationMs }), daysAgo],
    );

  beforeAll(async () => {
    ctx = await startApp(URL);
    skillId = (
      await ctx.pool.query(
        "select id from skills where domain = 'math' and status = 'active' order by id limit 1",
      )
    ).rows[0].id;
    const a = await ctx.newChild('Alya');
    const b = await ctx.newChild('Raka');
    const c = await ctx.newChild('Dimas');
    // Alya: bermain di periode lalu & periode ini (kembali). Raka: hanya periode lalu. Dimas: baru.
    await round(a.id, 90, 1);
    await round(a.id, 40, 2, 5 * 3600_000); // tab ditinggal 5 jam → dihitung 30 menit
    await round(a.id, 80, 10);
    await round(b.id, 100, 10);
    await round(c.id, 75, 0);
    await ctx.pool.query('update children set active = false where id = $1', [b.id]);
    await ctx.pool.query('update children set last_active_at = now() where id = $1', [b.id]);

    const parent = await ctx.pool.query(
      `insert into parents (email, password_hash, name, family_code, consent_at, email_verified_at)
       values ('ibu@example.com', 'x', 'Ibu Sari', 'FAM123', now(), now()) returning id`,
    );
    await ctx.pool.query(
      `insert into orders (number, parent_id, package_snapshot, method_snapshot, price_normal,
         discount, unique_code, amount, status, expires_at, proof_at, reviewed_at)
       values ('LC-1', $1, '{"name":"Akses Semua"}', '{}', 50000, 0, 111, 50111, 'paid',
         now() + interval '1 day', now() - interval '2 hours', now()),
       ('LC-2', $1, '{"name":"Akses Semua"}', '{}', 50000, 0, 222, 50222, 'awaiting_review',
         now() + interval '1 day', now() - interval '5 hours', null)`,
      [parent.rows[0].id],
    );
  }, 60_000);
  afterAll(async () => {
    await ctx?.close();
  });

  it('angka agregat, seri harian, tren bulanan, corong, retensi, sebaran skor & jam belajar', async () => {
    const r = await ctx
      .http()
      .get('/admin/insights?days=7')
      .set(ctx.auth(ctx.adminToken))
      .expect(200);
    const d = r.body;
    // Anak nonaktif tidak dihitung sebagai aktif (sebelumnya bisa > 100% dari jumlah anak).
    expect(d.users.active7).toBeLessThanOrEqual(d.users.children);
    expect(d.learning).toMatchObject({ rounds: 3, learners: 2, passRate: 67 });
    expect(d.learning.minutes).toBe(32); // 1 + 30 (dibatasi) + 1
    expect(d.learning.retention).toMatchObject({ prev: 2, returned: 1, fresh: 1, rate: 50 });
    expect(d.learning.scoreBands).toHaveLength(10);
    expect(d.learning.scoreBands[9]).toBe(1);
    expect(d.learning.scoreBands[4]).toBe(1);
    expect(d.learning.heatmap).toHaveLength(7);
    expect(d.learning.heatmap.flat().reduce((a: number, n: number) => a + n, 0)).toBe(3);
    expect(d.learning.domains[0]).toMatchObject({ domain: 'math', rounds: 3, learners: 2 });

    expect(d.series).toHaveLength(7);
    const total = (k: string) =>
      d.series.reduce((a: number, x: Record<string, number>) => a + (x[k] ?? 0), 0);
    expect(total('rounds')).toBe(3);
    expect(total('passed')).toBe(2);
    expect(total('revenue')).toBe(50_111);
    expect(total('newParents')).toBe(1);
    expect(total('newChildren')).toBe(3);

    expect(d.months).toHaveLength(12);
    expect(d.months.at(-1)).toMatchObject({ revenue: 50_111, paid: 1, newParents: 1 });
    expect(d.months.reduce((a: number, m: { rounds: number }) => a + m.rounds, 0)).toBe(5);

    expect(d.funnel).toMatchObject({
      registered: 1,
      verified: 1,
      withChild: 0,
      active: 0,
      paying: 1,
    });
    expect(d.sales).toMatchObject({ revenue: 50_111, paid: 1, payingFamilies: 1, payingRate: 100 });
    expect(d.sales).toMatchObject({ revenuePrev: 0, uniqueCode: 111, queue: { review: 1 } });
    expect(d.period).toMatchObject({ kind: 'days', days: 7, bucket: 'day' });
    expect(d.learning).toMatchObject({ roundsPrev: 2, learnersPrev: 2 });
    expect(d.sales.review).toMatchObject({ reviewed: 1, medianHours: 2, oldestPendingHours: 5 });
    // Kohort: tiap anak masuk kohort minggu ronde pertamanya; minggu ke-0 = seluruh kohort.
    const cohorts = d.learning.cohorts as { week: string; size: number; active: number[] }[];
    expect(cohorts.reduce((a, c) => a + c.size, 0)).toBe(3);
    for (const c of cohorts) expect(c.active[0]).toBe(c.size);
    // Alya mulai 10 hari lalu dan kembali pekan ini → muncul lagi di minggu sesudahnya.
    expect(cohorts.some((c) => c.active.slice(1).some((n) => n > 0))).toBe(true);
  });

  it('filter bulan & tahun: seri per hari untuk bulan, per bulan untuk tahun', async () => {
    const get = (qs: string) =>
      ctx.http().get(`/admin/insights?${qs}`).set(ctx.auth(ctx.adminToken)).expect(200);
    const today = new Date(Date.now() + 7 * 3600_000).toISOString();
    const y = Number(today.slice(0, 4));
    const m = Number(today.slice(5, 7));
    const month = (await get(`year=${y}&month=${m}`)).body;
    expect(month.period).toMatchObject({ kind: 'month', bucket: 'day' });
    expect(month.series).toHaveLength(Number(today.slice(8, 10)));
    expect(month.sales.revenue).toBe(50_111);
    const year = (await get(`year=${y}`)).body;
    expect(year.period).toMatchObject({ kind: 'year', bucket: 'month' });
    expect(year.series).toHaveLength(m);
    expect(year.learning.rounds).toBeGreaterThanOrEqual(3);
    expect(year.firstYear).toBe(y);
    // Tahun yang belum ada datanya: kosong, tanpa error.
    const empty = (await get(`year=${y - 3}`)).body;
    expect(empty.series).toHaveLength(12);
    expect(empty).toMatchObject({ sales: { revenue: 0 }, learning: { rounds: 0 } });
    await ctx
      .http()
      .get('/admin/insights?month=13&year=2026')
      .set(ctx.auth(ctx.adminToken))
      .expect(400);
  });

  it('afiliasi per periode, komisi setahun, laporan skill per periode', async () => {
    const as = ctx.auth(ctx.adminToken);
    const all = (await ctx.http().get('/admin/affiliate/analytics').set(as).expect(200)).body;
    expect(all.period).toBeNull();
    expect(all.months).toHaveLength(12);
    const p = (await ctx.http().get('/admin/affiliate/analytics?days=7').set(as).expect(200)).body;
    expect(p.period).toMatchObject({ kind: 'days', days: 7 });
    expect(p).toMatchObject({ costPeriod: 0, revenue: { period: 0 } });
    expect(p.months[0]).toHaveProperty('revenue');

    const year = new Date().getUTCFullYear();
    await ctx
      .http()
      .post('/admin/finance/owners')
      .set(as)
      .send({ name: 'Owner A', percentBp: 2_500 })
      .expect(201);
    const day = `${year}-01-15`;
    await ctx
      .http()
      .post('/admin/finance/cash')
      .set(as)
      .send({ date: day, type: 'in', category: 'Workshop', amount: 400_000 })
      .expect(201);
    const cy = (
      await ctx.http().get(`/admin/finance/commission-year?year=${year}`).set(as).expect(200)
    ).body;
    expect(cy.months).toHaveLength(12);
    expect(cy.months[0]).toMatchObject({ month: `${year}-01`, income: 400_000, net: 400_000 });
    expect(cy.months[0].shares[0]).toMatchObject({ ownerName: 'Owner A', amount: 100_000 });

    const skills = await ctx.http().get('/admin/reports/skills?days=7').set(as).expect(200);
    expect(Array.isArray(skills.body)).toBe(true);
  });
});
