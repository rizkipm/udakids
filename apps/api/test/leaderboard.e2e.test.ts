import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dbAvailable, startApp } from './e2e-setup.js';

const URL =
  process.env.DATABASE_URL_TEST_RANK ??
  'postgres://littlecoder:littlecoder@localhost:5432/littlecoder_test_rank';

const hasDb = await dbAvailable(URL);

type Row = {
  position: number;
  childId?: string;
  isMe: boolean;
  nickname: string;
  average: number;
  rounds: number;
  timeMs: number;
};

describe.skipIf(!hasDb)('papan peringkat rata-rata (D-042)', () => {
  let ctx: Awaited<ReturnType<typeof startApp>>;
  let mathSkill: string;
  let mathSkill2: string;
  let sainsSkill: string;
  const kids: Record<string, { token: string; id: string }> = {};

  const round = (childId: string, skillId: string, score: number, durationMs?: number) =>
    ctx.pool.query(
      `insert into events (id, child_id, type, payload, ts) values ($1, $2, 'quiz_result', $3, now())`,
      [
        randomUUID(),
        childId,
        JSON.stringify({
          skillId,
          correct: score / 10,
          total: 10,
          score,
          ...(durationMs !== undefined && { durationMs }),
        }),
      ],
    );
  const pass = (childId: string, skillId: string) =>
    ctx.pool.query(
      `insert into quiz_results (child_id, skill_id, best, last, passed, attempts)
       values ($1, $2, 100, 100, true, 1) on conflict do nothing`,
      [childId, skillId],
    );

  beforeAll(async () => {
    process.env.LEADERBOARD_CACHE_MS = '0';
    ctx = await startApp(URL);
    const pick = async (domain: string, grade: string, n: number) =>
      (
        await ctx.pool.query(
          `select id from skills where domain = $1 and grade = $2 and status = 'active'
           order by category, "order" limit $3`,
          [domain, grade, n],
        )
      ).rows.map((r: { id: string }) => r.id);
    [mathSkill, mathSkill2] = (await pick('math', 'prek', 2)) as [string, string];
    [sainsSkill] = (await pick('sains', 'tk', 1)) as [string];
    for (const name of ['Alya', 'Budi', 'Citra']) kids[name] = await ctx.newChild(name);
    // Alya: 100 + 80 = rata-rata 90, waktu 120 dtk. Budi: 90, waktu 50 dtk → Budi di atas Alya.
    await round(kids.Alya!.id, mathSkill, 100, 60_000);
    await round(kids.Alya!.id, mathSkill2, 80, 60_000);
    await round(kids.Budi!.id, mathSkill, 90, 50_000);
    // Citra: (100 + 90 + 90) / 3 = 93,33; ronde tanpa durationMs dihitung 0.
    await round(kids.Citra!.id, mathSkill, 100, 30_000);
    await round(kids.Citra!.id, mathSkill, 90);
    await round(kids.Citra!.id, mathSkill2, 90, 40_000);
    await pass(kids.Citra!.id, mathSkill);
    // Alya juga main Sains TK.
    await round(kids.Alya!.id, sainsSkill, 50, 10_000);
    await pass(kids.Alya!.id, sainsSkill);
  }, 120_000);

  afterAll(async () => {
    await ctx?.close();
  });

  const get = (path: string, token = kids.Alya!.token) => ctx.http().get(path).set(ctx.auth(token));

  it('global: rata-rata 2 desimal, sama → waktu tercepat; hanya 25 besar membawa id', async () => {
    const res = await get('/leaderboard').expect(200);
    expect(res.body).toMatchObject({ scope: 'global', total: 3, me: { isMe: true } });
    const top = res.body.top as Row[];
    // Global Alya: (100 + 80 + 50) / 3 = 76,67.
    expect(top.map((r) => [r.position, r.nickname, r.average])).toEqual([
      [1, 'Citra', 93.33],
      [2, 'Budi', 90],
      [3, 'Alya', 76.67],
    ]);
    expect(top[0]).toMatchObject({ rounds: 3, timeMs: 70_000, passedLevels: 1, isMe: false });
    expect(Object.keys(top[0]!).sort()).toEqual(
      [
        'average',
        'bestTimeMs',
        'childId',
        'isMe',
        'momoColor',
        'nickname',
        'passedLevels',
        'points',
        'position',
        'rounds',
        'timeMs',
      ].sort(),
    );
    expect(res.body.rest).toMatchObject({ page: 1, total: 0, items: [] });
  });

  it('per buku: Math Pra-TK — rata-rata sama 90, Budi lebih cepat; daftar lingkup', async () => {
    const res = await get('/leaderboard?scope=math/prek').expect(200);
    expect(res.body.title).toBe('Math Pra-TK');
    expect((res.body.top as Row[]).map((r) => [r.nickname, r.average, r.timeMs])).toEqual([
      ['Citra', 93.33, 70_000],
      ['Budi', 90, 50_000],
      ['Alya', 90, 120_000],
    ]);
    const sains = await get('/leaderboard?scope=sains/tk').expect(200);
    expect(sains.body.total).toBe(1);
    expect(sains.body.me).toMatchObject({ position: 1, average: 50, passedLevels: 1 });

    const scopes = await get('/leaderboard/scopes', kids.Budi!.token).expect(200);
    expect(scopes.body.scopes).toEqual([
      { key: 'global', title: 'Global', participants: 3 },
      { key: 'math/prek', domain: 'math', grade: 'prek', title: 'Math Pra-TK', participants: 3 },
      {
        key: 'sains/tk',
        domain: 'sains',
        grade: 'tk',
        title: 'Sains Kindergarten (TK)',
        participants: 1,
      },
    ]);
    await get('/leaderboard?scope=math/xx').expect(404);
    await get('/leaderboard?scope=../x').expect(400);
  });

  it('detail: buku + topik untuk 25 besar; staf juga boleh melihat papan', async () => {
    const res = await get(`/leaderboard/detail/${kids.Alya!.id}`, kids.Budi!.token).expect(200);
    expect(res.body).toMatchObject({ nickname: 'Alya', position: 3, isMe: false, rounds: 3 });
    expect(
      res.body.books.map((b: { key: string; position: number; average: number }) => [
        b.key,
        b.average,
        b.position,
      ]),
    ).toEqual([
      ['math/prek', 90, 3],
      ['sains/tk', 50, 1],
    ]);
    expect(res.body.books[0].totalLevels).toBeGreaterThan(0);
    expect(res.body.topics.length).toBeGreaterThan(0);
    expect(res.body.topics[0]).toMatchObject({ book: 'Math Pra-TK', rounds: expect.any(Number) });
    const scoped = await get(
      `/leaderboard/detail/${kids.Alya!.id}?scope=sains/tk`,
      kids.Budi!.token,
    ).expect(200);
    expect(scoped.body.topics).toHaveLength(1);
    expect(scoped.body.topics[0]).toMatchObject({ average: 50, passed: 1, rounds: 1 });
    // Budi tidak bermain Sains TK: bukan bagian papan itu.
    await get(`/leaderboard/detail/${kids.Budi!.id}?scope=sains/tk`).expect(403);
    const staff = await ctx.http().get('/leaderboard').set(ctx.auth(ctx.adminToken)).expect(200);
    expect(staff.body.me).toBeNull();
    await ctx.http().get('/leaderboard').expect(401);
  });

  it('lebih dari 25 peserta: 25 besar + daftar berhalaman; detail di luar 25 besar ditolak', async () => {
    // 30 anak tambahan dengan rata-rata menurun 99, 98, …, 70 (Citra 93,33 terselip di tengah).
    const extra: string[] = [];
    for (let i = 0; i < 30; i++) {
      const r = await ctx.pool.query(
        `insert into children (nickname, momo_color, report_token) values ($1, 'hijau', $2) returning id`,
        [`Anak${i + 1}`, randomUUID()],
      );
      extra.push(r.rows[0].id as string);
      await round(r.rows[0].id as string, mathSkill, 99 - i, 1000);
    }
    const res = await get('/leaderboard').expect(200);
    expect(res.body.total).toBe(33);
    expect(res.body.top).toHaveLength(25);
    expect((res.body.top as Row[]).every((r) => typeof r.childId === 'string')).toBe(true);
    expect(res.body.rest).toMatchObject({ page: 1, pageSize: 50, total: 8 });
    const items = res.body.rest.items as Row[];
    expect(items.map((r) => r.position)).toEqual([26, 27, 28, 29, 30, 31, 32, 33]);
    expect(items.some((r) => 'childId' in r && !r.isMe)).toBe(false);
    // Alya (76,67) di luar 25 besar: baris "me" tetap membawa id sendiri.
    expect(res.body.me).toMatchObject({ isMe: true, childId: kids.Alya!.id });
    expect(res.body.me.position).toBeGreaterThan(25);

    const page2 = await get('/leaderboard?page=2&pageSize=3').expect(200);
    expect((page2.body.rest.items as Row[]).map((r) => r.position)).toEqual([29, 30, 31]);

    const last = extra[29]!; // rata-rata 70 → paling bawah
    await get(`/leaderboard/detail/${last}`).expect(403);
    // Anak boleh melihat detail dirinya sendiri walau di luar 25 besar.
    const mine = await get(`/leaderboard/detail/${kids.Alya!.id}`).expect(200);
    expect(mine.body).toMatchObject({ isMe: true, position: res.body.me.position });
    const top1 = res.body.top[0] as Row;
    await get(`/leaderboard/detail/${top1.childId}`).expect(200);
    await get('/leaderboard/detail/not-a-uuid').expect(400);
  });

  it('anak nonaktif tidak masuk papan', async () => {
    await ctx.pool.query('update children set active = false where id = $1', [kids.Citra!.id]);
    const res = await get('/leaderboard?scope=math/prek').expect(200);
    expect((res.body.top as Row[]).some((r) => r.nickname === 'Citra')).toBe(false);
  });

  it('mode Total skor (D-043): jumlah skor terbaik → level lulus → waktu; mode rata-rata tetap', async () => {
    // Budi: skor terbaik 90 + 80 = 170 (belum lulus), waktu 70 dtk → teratas di Total skor.
    await ctx.pool.query(
      `insert into quiz_results (child_id, skill_id, best, last, passed, attempts, best_time_ms)
       values ($1, $2, 90, 90, true, 1, 30000), ($1, $3, 80, 80, true, 1, 40000)
       on conflict (child_id, skill_id) do update set best = excluded.best, best_time_ms = excluded.best_time_ms`,
      [kids.Budi!.id, mathSkill, mathSkill2],
    );
    const total = await ctx
      .http()
      .get('/leaderboard?scope=global&mode=total')
      .set(ctx.auth(kids.Alya!.token))
      .expect(200);
    expect(total.body.mode).toBe('total');
    expect(total.body.top[0]).toMatchObject({ nickname: 'Budi', points: 170, position: 1 });
    expect(total.body.top.map((r: { position: number }) => r.position)).toEqual(
      total.body.top.map((_: unknown, i: number) => i + 1),
    );
    const avg = await ctx
      .http()
      .get('/leaderboard?scope=global')
      .set(ctx.auth(kids.Alya!.token))
      .expect(200);
    expect(avg.body.mode).toBe('average');
    // Di mode rata-rata, Budi (90) tidak di posisi 1 — urutan rata-rata tidak berubah.
    expect(
      avg.body.top.find((r: { nickname: string }) => r.nickname === 'Budi').position,
    ).toBeGreaterThan(1);
    const detail = await ctx
      .http()
      .get(`/leaderboard/detail/${kids.Budi!.id}?scope=global&mode=total`)
      .set(ctx.auth(kids.Alya!.token))
      .expect(200);
    expect(detail.body).toMatchObject({ position: 1, points: 170 });
    await ctx
      .http()
      .get('/leaderboard?scope=global&mode=acak')
      .set(ctx.auth(kids.Alya!.token))
      .expect(400);
  });
});
