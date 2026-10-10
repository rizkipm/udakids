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
  lastPlayedAt?: string | null;
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
    // Nilai peringkat (D-045) = (jumlah skor + 5×70) / (ronde + 5).
    expect(
      top.map((r) => [r.position, r.nickname, r.average, (r as Row & { rating: number }).rating]),
    ).toEqual([
      [1, 'Citra', 93.33, 78.75],
      [2, 'Budi', 90, 73.33],
      [3, 'Alya', 76.67, 72.5],
    ]);
    expect(top[0]).toMatchObject({ rounds: 3, timeMs: 70_000, passedLevels: 1, isMe: false });
    expect(Object.keys(top[0]!).sort()).toEqual(
      [
        'average',
        'bestTimeMs',
        'childId',
        'isMe',
        'lastPlayedAt',
        'momoColor',
        'momoLook',
        'nickname',
        'passedLevels',
        'points',
        'position',
        'questions',
        'rating',
        'rounds',
        'timeMs',
      ].sort(),
    );
    expect(res.body.rest).toMatchObject({ page: 1, total: 0, items: [] });
    // Kapan terakhir bermain (D-105): ronde terbaru anak itu.
    const last = Date.parse(top[0]!.lastPlayedAt as string);
    expect(Date.now() - last).toBeLessThan(5 * 60_000);
  });

  it('per buku: Math PAUD — rata-rata sama 90, tapi Alya 2 ronde di atas Budi 1 ronde (D-045)', async () => {
    const res = await get('/leaderboard?scope=math/prek').expect(200);
    expect(res.body.title).toBe('Math PAUD');
    expect((res.body.top as Row[]).map((r) => [r.nickname, r.average, r.rounds])).toEqual([
      ['Citra', 93.33, 3],
      ['Alya', 90, 2],
      ['Budi', 90, 1],
    ]);
    const sains = await get('/leaderboard?scope=sains/tk').expect(200);
    expect(sains.body.total).toBe(1);
    expect(sains.body.me).toMatchObject({ position: 1, average: 50, passedLevels: 1 });

    const scopes = await get('/leaderboard/scopes', kids.Budi!.token).expect(200);
    expect(scopes.body.scopes).toEqual([
      { key: 'global', title: 'Global', participants: 3 },
      { key: 'math/prek', domain: 'math', grade: 'prek', title: 'Math PAUD', participants: 3 },
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
      ['math/prek', 90, 2],
      ['sains/tk', 50, 1],
    ]);
    expect(res.body.books[0].totalLevels).toBeGreaterThan(0);
    expect(res.body.topics.length).toBeGreaterThan(0);
    expect(res.body.topics[0]).toMatchObject({ book: 'Math PAUD', rounds: expect.any(Number) });
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

  it('anak yang belum bermain tetap tampil di papan global (paling bawah), tidak di papan buku', async () => {
    const idle = await ctx.newChild('Zaki');
    const res = await get('/leaderboard').expect(200);
    expect(res.body).toMatchObject({ total: 4, played: 3 });
    const last = (res.body.top as Row[]).at(-1)!;
    expect(last).toMatchObject({
      position: 4,
      nickname: 'Zaki',
      rounds: 0,
      average: 0,
      lastPlayedAt: null,
    });
    const total = await get('/leaderboard?mode=total').expect(200);
    expect((total.body.top as Row[]).at(-1)).toMatchObject({ position: 4, nickname: 'Zaki' });
    const book = await get('/leaderboard?scope=math/prek').expect(200);
    expect((book.body.top as Row[]).some((r) => r.nickname === 'Zaki')).toBe(false);
    const pub = await ctx.http().get('/leaderboard/public').expect(200);
    expect(pub.body).toMatchObject({ participants: 4, played: 3 });
    // Landing publik ikut menampilkan kapan anak terakhir bermain (D-116); anak yang belum bermain: null.
    expect(pub.body.top[0].lastPlayedAt).toEqual(expect.any(String));
    expect(pub.body.top.at(-1)).toMatchObject({ nickname: 'Zaki', lastPlayedAt: null });
    const scopes = await get('/leaderboard/scopes').expect(200);
    expect(scopes.body.scopes[0]).toMatchObject({ key: 'global', participants: 4 });
    // Anak itu sendiri melihat posisinya di papan global.
    const own = await get('/leaderboard', idle.token).expect(200);
    expect(own.body.me).toMatchObject({ isMe: true, position: 4, rounds: 0 });
    await ctx.pool.query('update children set active = false where id = $1', [idle.id]);
  });

  it('lebih dari 25 peserta: 25 besar + daftar berhalaman; detail di luar 25 besar ditolak', async () => {
    // 30 anak tambahan, masing-masing 3 ronde dengan rata-rata menurun 99, 98, …, 70 (nilai peringkat
    // 80,88 … 70); Alya (72,5) jatuh di luar 25 besar.
    const extra: string[] = [];
    for (let i = 0; i < 30; i++) {
      const r = await ctx.pool.query(
        `insert into children (nickname, momo_color, report_token) values ($1, 'hijau', $2) returning id`,
        [`Anak${i + 1}`, randomUUID()],
      );
      extra.push(r.rows[0].id as string);
      for (let k = 0; k < 3; k++) await round(r.rows[0].id as string, mathSkill, 99 - i, 1000);
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

  it('Top 10 landing (D-045): tanpa login, tanpa id anak, dengan soal dijawab & level lulus', async () => {
    await ctx.pool.query(
      `insert into skill_mastery (child_id, skill_id, state, answered, correct)
       values ($1, $2, '{}'::jsonb, 30, 27) on conflict do nothing`,
      [kids.Budi!.id, mathSkill],
    );
    const res = await ctx.http().get('/leaderboard/public').expect(200);
    expect(res.body.top.length).toBeLessThanOrEqual(10);
    expect(res.body.top.map((r: { position: number }) => r.position)).toEqual(
      res.body.top.map((_: unknown, i: number) => i + 1),
    );
    for (const r of res.body.top) {
      expect(Object.keys(r).sort()).toEqual(
        [
          'average',
          'lastPlayedAt',
          'momoColor',
          'momoLook',
          'nickname',
          'rating',
          'passedLevels',
          'points',
          'position',
          'questions',
          'rounds',
          'timeMs',
        ].sort(),
      );
    }
    expect(res.body.top[0]).toMatchObject({ nickname: 'Budi', points: 170, questions: 30 });
    // Papan lain (D-073): rata-rata & paling aktif per periode, tetap tanpa id anak.
    for (const q of [
      'board=average&period=all',
      'board=average&period=week',
      'board=active&period=day',
    ]) {
      const b = await ctx.http().get(`/leaderboard/public?${q}`).expect(200);
      for (const r of b.body.top) expect(r).not.toHaveProperty('childId');
    }
    // "Paling aktif" tidak punya periode "semua": server memakai bulan ini.
    const all = await ctx.http().get('/leaderboard/public?board=active&period=all').expect(200);
    expect(all.body).toMatchObject({ board: 'active', period: 'month' });
    await ctx.http().get('/leaderboard/public?board=lain').expect(400);
    // Papan lengkap tetap butuh login; jumlah soal sama dengan laporan anak.
    await ctx.http().get('/leaderboard').expect(401);
    const board = await get('/leaderboard?mode=total').expect(200);
    expect(board.body.top[0]).toMatchObject({ nickname: 'Budi', questions: 30 });
  });

  it('Hias Momo (D-051): anak mengubah gradasi & aksesori; tampil di profil, layar masuk, dan peringkat', async () => {
    const kid = await ctx.newChild('Hiasan');
    const look = { gradient: 'toska', accessory: 'jilbab', accessoryColor: 'merahmuda' };
    const put = await ctx
      .http()
      .put('/auth/me/momo')
      .set(ctx.auth(kid.token))
      .send({ momoColor: 'ungu', momoLook: look })
      .expect(200);
    expect(put.body).toEqual({ momoColor: 'ungu', momoLook: look });
    const me = await ctx.http().get('/auth/me').set(ctx.auth(kid.token)).expect(200);
    expect(me.body).toMatchObject({ momoColor: 'ungu', momoLook: look });
    const fam = await ctx.http().get(`/auth/family/${kid.familyCode}`).expect(200);
    expect(fam.body[0]).toMatchObject({ nickname: 'Hiasan', momoLook: look });
    await round(kid.id, mathSkill, 100, 1000);
    const board = await get('/leaderboard', kid.token).expect(200);
    const mine = board.body.me ?? board.body.top.find((r: { isMe: boolean }) => r.isMe);
    expect(mine).toMatchObject({ momoLook: look });
    // Nilai asing ditolak; hanya anak yang bisa mengubah Momo-nya sendiri.
    await ctx
      .http()
      .put('/auth/me/momo')
      .set(ctx.auth(kid.token))
      .send({ momoColor: 'ungu', momoLook: { accessory: 'mahkota-emas' } })
      .expect(400);
    // D-102: model, pola, pernak-pernik, dan kode warna sendiri tersimpan (hex dinormalisasi).
    const custom = await ctx
      .http()
      .put('/auth/me/momo')
      .set(ctx.auth(kid.token))
      .send({
        momoColor: 'ungu',
        momoLook: {
          model: 'dino',
          body: '#13C2C2',
          gradient: '#ff8800',
          pattern: 'bintang',
          accessory: 'mahkota',
          extra: 'kacamata',
          extraColor: 'merah',
        },
      })
      .expect(200);
    expect(custom.body.momoLook).toMatchObject({ model: 'dino', body: '#13c2c2' });
    const again = await get('/leaderboard', kid.token).expect(200);
    const row = again.body.me ?? again.body.top.find((r: { isMe: boolean }) => r.isMe);
    expect(row.momoLook).toMatchObject({ model: 'dino', pattern: 'bintang', extra: 'kacamata' });
    // Kode warna hanya "#" + 6 hex — tidak bisa menyisipkan nilai lain ke SVG.
    for (const body of ['red', '#fff', 'url(#a)'])
      await ctx
        .http()
        .put('/auth/me/momo')
        .set(ctx.auth(kid.token))
        .send({ momoColor: 'ungu', momoLook: { body } })
        .expect(400);
    await ctx
      .http()
      .put('/auth/me/momo')
      .set(ctx.auth(ctx.adminToken))
      .send({ momoColor: 'ungu', momoLook: null })
      .expect(403);
    // Kembali polos.
    await ctx
      .http()
      .put('/auth/me/momo')
      .set(ctx.auth(kid.token))
      .send({ momoColor: 'biru', momoLook: null })
      .expect(200);
  });
});
