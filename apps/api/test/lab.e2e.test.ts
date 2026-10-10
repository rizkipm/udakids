import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dbAvailable, startApp } from './e2e-setup.js';

/** Materi berformat lab (D-109): katalog memuat Lab Buku & Materi Topik aktif; progres lab tersinkron. */
const URL =
  process.env.DATABASE_URL_TEST_LAB ??
  'postgres://littlecoder:littlecoder@localhost:5432/littlecoder_test_lab';
const up = await dbAvailable(URL);

type Cat = {
  domain: string;
  grade: string;
  lab?: { status: string; pos: { id: string }[] };
  categories: { code: string; materi?: { status: string } }[];
};

describe.skipIf(!up)('Materi berformat lab (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof startApp>>;
  let child: { token: string; id: string };
  const sync = (labs: Record<string, unknown>[]) =>
    ctx
      .http()
      .post('/practice/sync')
      .set(ctx.auth(child.token))
      .send({ answers: [], states: [], quizzes: [], labs })
      .expect(200);

  beforeAll(async () => {
    ctx = await startApp(URL);
    child = await ctx.newChild('Uji Lab');
  }, 120_000);
  afterAll(async () => {
    await ctx?.close();
  });

  it('katalog anak memuat Lab Buku Sains TK dan Materi Topik aktif', async () => {
    const r = await ctx.http().get('/catalog').set(ctx.auth(child.token)).expect(200);
    const sains = (r.body.catalogs as Cat[]).find(
      (c) => c.domain === 'sains' && c.grade === 'tkosn',
    )!;
    expect(sains.lab?.status).toBe('aktif');
    expect(sains.lab!.pos.length).toBeGreaterThanOrEqual(5);
    expect(sains.categories.find((c) => c.code === 'J')?.materi?.status).toBe('aktif');
    const math = (r.body.catalogs as Cat[]).find(
      (c) => c.domain === 'math' && c.grade === 'tkosn',
    )!;
    expect(math.categories.find((c) => c.code === 'A')?.materi).toBeDefined();
  });

  it('materi draf hanya terlihat staf, tidak dikirim ke anak', async () => {
    await ctx.pool.query(
      `update skill_catalogs set categories = (
         select jsonb_agg(case when c->>'code' = 'J'
           then jsonb_set(c, '{materi,status}', '"draf"') else c end)
         from jsonb_array_elements(categories) c),
       updated_at = now()
       where domain = 'sains' and grade = 'tkosn'`,
    );
    const kid = await ctx.http().get('/catalog').set(ctx.auth(child.token)).expect(200);
    const kidJ = (kid.body.catalogs as Cat[])
      .find((c) => c.domain === 'sains' && c.grade === 'tkosn')!
      .categories.find((c) => c.code === 'J')!;
    expect(kidJ.materi).toBeUndefined();
    const staff = await ctx.http().get('/catalog').set(ctx.auth(ctx.adminToken)).expect(200);
    const staffJ = (staff.body.catalogs as Cat[])
      .find((c) => c.domain === 'sains' && c.grade === 'tkosn')!
      .categories.find((c) => c.code === 'J')!;
    expect(staffJ.materi?.status).toBe('draf');
  });

  it('progres lab idempoten per id, bintang tidak turun, dan kembali di state', async () => {
    const first = { id: randomUUID(), lab: 'sains/tkosn/J', part: 'uji', stars: 2, ts: Date.now() };
    await sync([
      first,
      { id: randomUUID(), lab: 'sains/tkosn', part: 'uji:tubuh', stars: 3, ts: Date.now() },
    ]);
    // Kirim ulang event yang sama + bintang lebih rendah: tetap 2.
    const r = await sync([first, { ...first, id: randomUUID(), stars: 1 }]);
    expect(r.body.labs['sains/tkosn/J'].uji).toBe(2);
    const higher = await sync([{ ...first, id: randomUUID(), stars: 3 }]);
    expect(higher.body.labs['sains/tkosn/J'].uji).toBe(3);
    const events = await ctx.pool.query(
      `select count(*)::int as n from events where child_id = $1 and type = 'lab_progress'`,
      [child.id],
    );
    expect(events.rows[0].n).toBe(4);
    const state = await ctx.http().get('/practice/state').set(ctx.auth(child.token)).expect(200);
    expect(state.body.labs).toEqual({
      'sains/tkosn/J': { uji: 3 },
      'sains/tkosn': { 'uji:tubuh': 3 },
    });
  });

  it('kunci lab & bagian yang tidak sah ditolak', async () => {
    await ctx
      .http()
      .post('/practice/sync')
      .set(ctx.auth(child.token))
      .send({
        answers: [],
        states: [],
        quizzes: [],
        labs: [{ id: randomUUID(), lab: 'DROP TABLE', part: 'uji', stars: 9, ts: Date.now() }],
      })
      .expect(400);
  });
});
