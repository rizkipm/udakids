import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dbAvailable, startApp } from './e2e-setup.js';

const URL =
  process.env.DATABASE_URL_TEST_LIVE ??
  'postgres://littlecoder:littlecoder@localhost:5432/littlecoder_test_live';

const hasDb = await dbAvailable(URL);

/** Siapa yang sedang bermain (D-103): admin melihat detail, landing publik hanya nama panggilan + materi. */
describe.skipIf(!hasDb)('sedang bermain (D-103)', () => {
  let ctx: Awaited<ReturnType<typeof startApp>>;
  let skillId: string;
  const answer = (childId: string, correct: boolean) =>
    ctx.pool.query(
      `insert into events (id, child_id, type, payload, ts) values ($1, $2, 'item_answer', $3, now())`,
      [randomUUID(), childId, JSON.stringify({ skillId, correct, band: 0 })],
    );

  beforeAll(async () => {
    ctx = await startApp(URL);
    skillId = (
      await ctx.pool.query(
        `select id from skills where domain = 'math' and grade = 'sd2' and status = 'active'
         order by category, "order" limit 1`,
      )
    ).rows[0].id;
    const alya = await ctx.newChild('Alya');
    const budi = await ctx.newChild('Budi');
    const sleepy = await ctx.newChild('Citra');
    // Budi siswa kelas sekolah: tampil di admin, tidak di landing.
    const cls = await ctx.pool.query(
      `insert into classes (code, event_name) values ('KLS123', 'Kelas Pelangi') returning id`,
    );
    await ctx.pool.query('update children set class_id = $1 where id = $2', [
      cls.rows[0].id,
      budi.id,
    ]);
    for (const k of [alya, budi]) {
      await answer(k.id, true);
      await answer(k.id, false);
    }
    // Citra terakhir aktif 30 menit lalu: tidak sedang bermain.
    await answer(sleepy.id, true);
    await ctx.pool.query(
      "update children set last_active_at = now() - interval '30 minutes' where id = $1",
      [sleepy.id],
    );
  }, 120_000);

  afterAll(async () => {
    await ctx?.close();
  });

  it('admin: anak aktif ≤ 10 menit dengan jenis akun, kelas, materi, dan jawaban hari ini', async () => {
    const res = await ctx.http().get('/admin/live').set(ctx.auth(ctx.adminToken)).expect(200);
    const items = res.body.items as Record<string, unknown>[];
    expect(items.map((i) => i.nickname).sort()).toEqual(['Alya', 'Budi']);
    const budi = items.find((i) => i.nickname === 'Budi')!;
    expect(budi).toMatchObject({
      type: 'self',
      class: { name: 'Kelas Pelangi', code: 'KLS123' },
      book: 'Matematika Kelas 2',
      level: 1,
      answeredToday: 2,
      correctToday: 1,
    });
    expect(typeof budi.topic).toBe('string');
    // Bukan admin → ditolak.
    const kid = await ctx.newChild('Dodi');
    await ctx.http().get('/admin/live').set(ctx.auth(kid.token)).expect(403);
  });

  it('landing publik: hanya nama panggilan, Momo, dan materi — tanpa id/waktu/kelas; anak kelas tidak tampil', async () => {
    const res = await ctx.http().get('/public/playing').expect(200);
    const list = res.body as Record<string, unknown>[];
    expect(list.map((x) => x.nickname)).toEqual(['Alya']);
    expect(Object.keys(list[0]!).sort()).toEqual([
      'book',
      'momoColor',
      'momoLook',
      'nickname',
      'topic',
    ]);
    expect(list[0]).toMatchObject({ book: 'Matematika Kelas 2', momoColor: 'biru' });
  });
});
