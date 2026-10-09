import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dbAvailable, startApp } from './e2e-setup.js';

/** Mock Test olimpiade (D-072): hasil dinilai dari poin gaya EMC dan masuk skor utama. */
const URL =
  process.env.DATABASE_URL_TEST_MOCK ??
  'postgres://littlecoder:littlecoder@localhost:5432/littlecoder_test_mock';
const up = await dbAvailable(URL);

const MOCK = 'math.tkosn.z1.mock-test-25-soal';

describe.skipIf(!up)('Mock Test olimpiade (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof startApp>>;
  let child: { token: string; id: string };
  const sync = (quiz: Record<string, unknown>) =>
    ctx
      .http()
      .post('/practice/sync')
      .set(ctx.auth(child.token))
      .send({
        answers: [],
        states: [],
        quizzes: [{ id: randomUUID(), ts: Date.now(), ...quiz }],
      })
      .expect(200);

  beforeAll(async () => {
    process.env.LEADERBOARD_CACHE_MS = '0';
    ctx = await startApp(URL);
    child = await ctx.newChild('Uji Mock');
  }, 120_000);
  afterAll(async () => {
    await ctx?.close();
  });

  it('katalog memuat mock test di ketiga buku TK (Olimpiade), dengan bagian OSN TK', async () => {
    const r = await ctx.http().get('/catalog').set(ctx.auth(child.token)).expect(200);
    const mocks = (r.body.skills as { id: string; family: string }[]).filter(
      (s) => s.family === 'mock',
    );
    // Tiga mock test per buku olimpiade TK (Mock test 1 memakai id lama agar riwayat tidak hilang),
    // ditambah tiga mock KMSI per buku olimpiade TK–SMP (D-074): 3 × 3 TK + 3 × 3 × 4 jenjang lain,
    // dan tiga mock KMSI Final Jatim per buku Matematika, Sains & English TK sampai SMP (D-080, D-084–D-086): 3 × 5 × 3,
    // ditambah tiga mock EMC Kelas 3–4 berkisi-kisi 40 soal (D-101).
    expect(mocks).toHaveLength(102);
    expect(mocks.map((s) => s.id)).toContain('math.tkosn.y1.kmsi-mock-test-1');
    expect(mocks.map((s) => s.id)).toContain(MOCK);
    expect(mocks.map((s) => s.id)).toContain('english.tkosn.z3.mock-test-3');
    const math = r.body.catalogs.find(
      (c: { domain: string; grade: string }) => c.domain === 'math' && c.grade === 'tkosn',
    );
    expect(math.categories[0].group).toMatch(/^OSN TK/);
    // Mock tetap paling akhir: Z (EMC), Y (KMSI Penyisihan), FY (KMSI Final Jatim, D-086).
    expect(math.categories.at(-3)).toMatchObject({ code: 'Z', standalone: true });
    expect(math.categories.at(-2)).toMatchObject({ code: 'Y', standalone: true });
    expect(math.categories.at(-1)).toMatchObject({ code: 'FY', standalone: true, mock: true });
  });

  it('hasil sah: skor dari poin (300/552 → 54), durasi tersimpan, masuk skor utama', async () => {
    const r = await sync({
      skillId: MOCK,
      correct: 15,
      total: 25,
      points: 300,
      durationMs: 900_000,
    });
    expect(r.body.rejectedQuizzes).toEqual([]);
    const row = (
      await ctx.pool.query(
        'select best, best_time_ms from quiz_results where child_id = $1 and skill_id = $2',
        [child.id, MOCK],
      )
    ).rows[0];
    expect(row).toEqual({ best: 54, best_time_ms: 900_000 });
    const profile = await ctx
      .http()
      .get('/practice/profile')
      .set(ctx.auth(child.token))
      .expect(200);
    expect(profile.body.totalPoints).toBeGreaterThanOrEqual(54);
  });

  it('poin negatif tetap disimpan sebagai skor 0, skor terbaik tidak turun', async () => {
    const r = await sync({ skillId: MOCK, correct: 0, total: 25, points: -100 });
    expect(r.body.rejectedQuizzes).toEqual([]);
    const row = (
      await ctx.pool.query(
        'select best, last from quiz_results where child_id = $1 and skill_id = $2',
        [child.id, MOCK],
      )
    ).rows[0];
    expect(row).toEqual({ best: 54, last: 0 });
  });

  it('ditolak: jumlah soal bukan 25, poin di luar batas, tanpa poin, atau poin di level biasa', async () => {
    for (const bad of [
      { skillId: MOCK, correct: 5, total: 10, points: 40 },
      { skillId: MOCK, correct: 25, total: 25, points: 600 },
      { skillId: MOCK, correct: 0, total: 25, points: -139 },
      { skillId: MOCK, correct: 20, total: 25 },
      {
        skillId: 'math.tkosn.a1.pilih-angka-yang-kamu-dengar-sampai-10',
        correct: 8,
        total: 10,
        points: 50,
      },
    ]) {
      const r = await sync(bad);
      expect(r.body.rejectedQuizzes, JSON.stringify(bad)).toHaveLength(1);
    }
  });

  it('papan peringkat mock test: percobaan terbaik, poin → waktu, tanpa id anak lain', async () => {
    const other = await ctx.newChild('Uji Mock Dua');
    await ctx
      .http()
      .post('/practice/sync')
      .set(ctx.auth(other.token))
      .send({
        answers: [],
        states: [],
        quizzes: [
          {
            id: randomUUID(),
            ts: Date.now(),
            skillId: MOCK,
            correct: 15,
            total: 25,
            points: 300,
            durationMs: 600_000,
          },
        ],
      })
      .expect(200);
    const list = await ctx.http().get('/leaderboard/mocks').set(ctx.auth(child.token)).expect(200);
    expect(list.body.mocks.find((m: { skillId: string }) => m.skillId === MOCK)).toMatchObject({
      domain: 'math',
      grade: 'tkosn',
      participants: 2,
    });
    const board = await ctx
      .http()
      .get(`/leaderboard/mock/${MOCK}`)
      .set(ctx.auth(child.token))
      .expect(200);
    expect(board.body).toMatchObject({ maxPoints: 552, questions: 25, total: 2 });
    // Poin sama (300) → waktu tercepat (10 menit) di atas; percobaan −100 tidak menggantikan yang terbaik.
    expect(
      board.body.top.map(
        (r: { nickname: string; position: number }) => `${r.position}:${r.nickname}`,
      ),
    ).toEqual(['1:Uji Mock Dua', '2:Uji Mock']);
    expect(board.body.me).toMatchObject({ points: 300, timeMs: 900_000, attempts: 2, isMe: true });
    expect(JSON.stringify(board.body)).not.toContain(other.id);
    await ctx
      .http()
      .get('/leaderboard/mock/math.tkosn.a1.tidak-ada')
      .set(ctx.auth(child.token))
      .expect(404);
    // Soal mock (25 per ronde) ikut dihitung sebagai soal dijawab di papan global.
    const global = await ctx
      .http()
      .get('/leaderboard?scope=global&mode=total')
      .set(ctx.auth(child.token))
      .expect(200);
    expect(global.body.me.questions).toBeGreaterThanOrEqual(50);
  });

  it('laporan mock: tersimpan per soal, hanya bisa dibaca anak itu sendiri', async () => {
    const review = Array.from({ length: 25 }, (_, i) => ({
      skillId: 'math.tkosn.a1.pilih-angka-yang-kamu-dengar-sampai-10',
      version: 1,
      seed: 1000 + i,
      band: i < 9 ? 0 : i < 17 ? 1 : 2,
      difficulty: i < 9 ? 'easy' : i < 17 ? 'medium' : 'hard',
      outcome: i < 20 ? 'right' : i < 23 ? 'wrong' : 'skip',
    }));
    const ok = await sync({
      skillId: MOCK,
      correct: 20,
      total: 25,
      points: 400,
      durationMs: 700_000,
      review,
    });
    expect(ok.body.rejectedQuizzes).toEqual([]);
    // Jumlah entri / jumlah benar tidak cocok → ditolak.
    const bad1 = await sync({
      skillId: MOCK,
      correct: 20,
      total: 25,
      points: 400,
      review: review.slice(0, 24),
    });
    expect(bad1.body.rejectedQuizzes).toHaveLength(1);
    const bad2 = await sync({ skillId: MOCK, correct: 19, total: 25, points: 400, review });
    expect(bad2.body.rejectedQuizzes).toHaveLength(1);

    const mine = await ctx
      .http()
      .get(`/practice/mock/${MOCK}/attempts`)
      .set(ctx.auth(child.token))
      .expect(200);
    const latest = mine.body[0];
    expect(latest).toMatchObject({ correct: 20, total: 25, points: 400, durationMs: 700_000 });
    expect(latest.review).toHaveLength(25);
    expect(latest.review[24]).toMatchObject({ outcome: 'skip', difficulty: 'hard' });

    // Anak lain hanya melihat laporannya sendiri.
    const other = await ctx.newChild('Uji Mock Tiga');
    const theirs = await ctx
      .http()
      .get(`/practice/mock/${MOCK}/attempts`)
      .set(ctx.auth(other.token))
      .expect(200);
    expect(theirs.body).toEqual([]);
    // Bukan anak (mis. admin) tidak bisa memakai endpoint anak.
    await ctx
      .http()
      .get(`/practice/mock/${MOCK}/attempts`)
      .set(ctx.auth(ctx.adminToken))
      .expect(403);
  });

  it('tanpa Premium: Mock test 1 hanya sekali, Mock 2–3 terkunci; Premium bebas mengulang', async () => {
    const billing = { paywall: true, freeLevels: 2, orderExpiryHours: 24, classFullAccess: true };
    await ctx
      .http()
      .put('/admin/billing/settings')
      .set(ctx.auth(ctx.adminToken))
      .send(billing)
      .expect(200);
    try {
      const free = await ctx.newChild('Uji Mock Gratis');
      const send = (skillId: string) =>
        ctx
          .http()
          .post('/practice/sync')
          .set(ctx.auth(free.token))
          .send({
            answers: [],
            states: [],
            quizzes: [
              { id: randomUUID(), ts: Date.now(), skillId, correct: 10, total: 25, points: 200 },
            ],
          })
          .expect(200);
      expect((await send(MOCK)).body.rejectedQuizzes).toEqual([]);
      expect((await send(MOCK)).body.rejectedQuizzes).toHaveLength(1);
      expect((await send('math.tkosn.z2.mock-test-2')).body.rejectedQuizzes).toHaveLength(1);
      // Katalog: Mock 2 dikirim tanpa isi (berbayar), Mock 1 tidak.
      const cat = await ctx.http().get('/catalog').set(ctx.auth(free.token)).expect(200);
      const byId = new Map(
        (cat.body.skills as { id: string; stub?: boolean }[]).map((s) => [s.id, s]),
      );
      expect(byId.get(MOCK)?.stub).toBeUndefined();
      expect(byId.get('math.tkosn.z2.mock-test-2')?.stub).toBe(true);
      // Premium: boleh mengulang dan membuka Mock 2.
      await ctx
        .http()
        .post('/admin/premium')
        .set(ctx.auth(ctx.adminToken))
        .send({ childId: free.id, durationDays: 30, note: 'uji' })
        .expect(201);
      expect((await send(MOCK)).body.rejectedQuizzes).toEqual([]);
      expect((await send('math.tkosn.z2.mock-test-2')).body.rejectedQuizzes).toEqual([]);
    } finally {
      await ctx
        .http()
        .put('/admin/billing/settings')
        .set(ctx.auth(ctx.adminToken))
        .send({ ...billing, paywall: false })
        .expect(200);
    }
  });

  it('papan landing: total, rata-rata & paling aktif per periode, tanpa login & tanpa id anak', async () => {
    const http = () => ctx.http();
    const total = await http().get('/leaderboard/public').expect(200);
    expect(total.body).toMatchObject({ board: 'total', period: 'all' });
    const active = await http().get('/leaderboard/public?board=active&period=day').expect(200);
    expect(active.body).toMatchObject({ board: 'active', period: 'day' });
    expect(active.body.top.length).toBeGreaterThan(0);
    // Soal mock (25 per ronde) ikut dihitung; urutan soal terbanyak dulu.
    const qs = active.body.top.map((r: { questions: number }) => r.questions);
    expect([...qs].sort((a: number, b: number) => b - a)).toEqual(qs);
    expect(qs[0]).toBeGreaterThanOrEqual(25);
    const avg = await http().get('/leaderboard/public?board=average&period=week').expect(200);
    expect(avg.body.top[0]).toHaveProperty('rating');
    expect(JSON.stringify(active.body)).not.toMatch(/childId|"id"/);
    await http().get('/leaderboard/public?board=active&period=year').expect(400);
  });
});
