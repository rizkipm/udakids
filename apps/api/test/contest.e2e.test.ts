import { mazePath, maskIds, type AnswerValue, type ContestItem } from '@little-coder/engine';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dbAvailable, startApp } from './e2e-setup.js';

const URL =
  process.env.DATABASE_URL_TEST_CONTEST ??
  'postgres://littlecoder:littlecoder@localhost:5432/littlecoder_test_contest';
const available = await dbAvailable(URL);
if (!available) console.warn(`[contest e2e] dilewati: Postgres test tidak tersedia di ${URL}`);

/** Jawaban benar dalam bentuk id samaran (seperti yang dikirim perangkat). */
function rightAnswer(item: ContestItem): AnswerValue {
  const m = maskIds(item);
  const to = (s: string) => m.get(s)!;
  const it = item.interaction;
  switch (it.type) {
    case 'pick-one':
      return to(it.answer);
    case 'tap-all':
    case 'order':
      return it.answer.map(to);
    case 'group':
    case 'match':
      return Object.fromEntries(Object.entries(it.answer).map(([k, v]) => [to(k), to(v)]));
    case 'build':
      return it.target;
    case 'number-line':
    case 'number-input':
      return it.answer;
    case 'trace':
      return 0;
    case 'connect':
      return it.answer.map(to);
    case 'spell':
      return it.answer;
    case 'maze':
      return mazePath(it, it.start, it.goal)
        .slice(1)
        .map((c) => `c${c}`);
    case 'word-search':
      return it.words.flatMap((w) => w.cells.map((c) => `c${c}`));
    case 'memory':
    case 'catch':
      // Tidak dipakai di lomba (D-075).
      throw new Error(`${it.type} tidak dipakai di lomba`);
  }
}
/** Jawaban yang pasti keliru (id tak dikenal / angka mustahil). */
const wrongAnswer = (item: ContestItem): AnswerValue =>
  ['build', 'number-line', 'number-input'].includes(item.interaction.type) ? -999 : 'kzzzzzz';

describe.skipIf(!available)('lomba live (D-042) e2e', () => {
  let app: Awaited<ReturnType<typeof startApp>>;
  let contestId: string;
  const hour = 3600_000;
  const kids: Record<string, { token: string; id: string }> = {};

  beforeAll(async () => {
    app = await startApp(URL);
    for (const name of ['Alya', 'Raka', 'Dimas', 'Sari']) kids[name] = await app.newChild(name);
  }, 60_000);
  afterAll(async () => {
    await app?.close();
  });

  const as = (token: string) => app.auth(token);
  const items = async (childId: string) => {
    const r = await app.pool.query(
      'select e.id, e.items from contest_entries e where e.contest_id = $1 and e.child_id = $2',
      [contestId, childId],
    );
    return r.rows[0] as { id: string; items: ContestItem[] };
  };

  it('admin membuat lomba; validasi jadwal & buku', async () => {
    const { http, adminToken } = app;
    const base = {
      title: 'OSN MTK TK se-Indonesia',
      description: 'Lomba matematika TK',
      domain: 'math',
      grade: 'tk',
      questionCount: 10,
      startsAt: new Date(Date.now() + hour).toISOString(),
      endsAt: new Date(Date.now() + 3 * hour).toISOString(),
      durationMinutes: 60,
      winners: 3,
      published: true,
    };
    await http()
      .post('/admin/contests')
      .set(as(adminToken))
      .send({ ...base, endsAt: base.startsAt })
      .expect(400);
    await http()
      .post('/admin/contests')
      .set(as(adminToken))
      .send({ ...base, categories: ['XY'] })
      .expect(400);
    const r = await http().post('/admin/contests').set(as(adminToken)).send(base).expect(201);
    contestId = r.body.id;
    expect(r.body.phase).toBe('upcoming');
    // Anak tidak bisa memakai endpoint admin.
    await http().get('/admin/contests').set(as(kids.Alya!.token)).expect(403);
    const list = await http().get('/admin/contests').set(as(adminToken)).expect(200);
    expect(list.body.contests[0]).toMatchObject({ id: contestId, participants: 0 });
  });

  it('sebelum jadwal: tampil "akan datang", mulai ditolak', async () => {
    const { http } = app;
    const list = await http().get('/contests').set(as(kids.Alya!.token)).expect(200);
    expect(list.body.now).toBeTruthy();
    expect(list.body.contests[0]).toMatchObject({
      id: contestId,
      phase: 'upcoming',
      me: { status: 'none' },
    });
    await http().post(`/contests/${contestId}/start`).set(as(kids.Alya!.token)).expect(403);
    await http().get(`/contests/${contestId}/results`).set(as(kids.Alya!.token)).expect(403);
  });

  it('saat berlangsung: soal tanpa kunci; mulai dua kali → entri sama; hanya anak', async () => {
    const { http, pool, adminToken } = app;
    await pool.query(
      "update contests set starts_at = now() - interval '1 minute', ends_at = now() + interval '2 hours' where id = $1",
      [contestId],
    );
    const r = await http()
      .post(`/contests/${contestId}/start`)
      .set(as(kids.Alya!.token))
      .expect(200);
    expect(r.body.total).toBe(10);
    expect(r.body.items).toHaveLength(10);
    expect(r.body.answered).toEqual([]);
    expect(Date.parse(r.body.deadlineAt) - Date.parse(r.body.now)).toBeGreaterThan(59 * 60_000);
    const json = JSON.stringify(r.body);
    for (const k of ['"answer"', '"reteach"', '"tag"', '"skillId"', '"seed"', '"key"'])
      expect(json).not.toContain(k);

    const again = await http()
      .post(`/contests/${contestId}/start`)
      .set(as(kids.Alya!.token))
      .expect(200);
    expect(again.body.entryId).toBe(r.body.entryId);
    expect(again.body.items).toEqual(r.body.items);
    const n = await pool.query(
      'select count(*)::int as n from contest_entries where child_id = $1',
      [kids.Alya!.id],
    );
    expect(n.rows[0].n).toBe(1);

    // Orang tua / admin tidak bisa ikut.
    const parent = await http()
      .post('/auth/parent/register')
      .send({ name: 'Ibu Raka', email: 'ibu@raka.id', password: 'rahasia123', consent: true })
      .expect(201);
    await http().post(`/contests/${contestId}/start`).set(as(parent.body.token)).expect(403);
    await http().post(`/contests/${contestId}/start`).set(as(adminToken)).expect(403);
    await http()
      .post(`/contests/${contestId}/answer`)
      .set(as(parent.body.token))
      .send({ index: 0, value: 'x' })
      .expect(403);
    // Orang tua boleh melihat daftar (baca saja).
    await http().get('/contests').set(as(parent.body.token)).expect(200);
  });

  it('jawaban: sekali per soal, tanpa info benar/salah, dinilai di server', async () => {
    const { http } = app;
    const { items: full } = await items(kids.Alya!.id);
    const a = await http()
      .post(`/contests/${contestId}/answer`)
      .set(as(kids.Alya!.token))
      .send({ index: 0, value: rightAnswer(full[0]!) })
      .expect(200);
    expect(a.body).toEqual({ saved: true, answered: 1, total: 10 });
    expect(JSON.stringify(a.body)).not.toMatch(/correct|benar/i);
    await http()
      .post(`/contests/${contestId}/answer`)
      .set(as(kids.Alya!.token))
      .send({ index: 0, value: rightAnswer(full[0]!) })
      .expect(409);
    await http()
      .post(`/contests/${contestId}/answer`)
      .set(as(kids.Alya!.token))
      .send({ index: 10, value: 'x' })
      .expect(400);
    // Lanjutkan: daftar soal terjawab ikut dikirim.
    const resume = await http()
      .post(`/contests/${contestId}/start`)
      .set(as(kids.Alya!.token))
      .expect(200);
    expect(resume.body.answered).toEqual([0]);
    // Jawaban kedua sangat cepat → dicatat sebagai kejanggalan.
    await http()
      .post(`/contests/${contestId}/answer`)
      .set(as(kids.Alya!.token))
      .send({ index: 1, value: wrongAnswer(full[1]!) })
      .expect(200);
    const flags = await app.pool.query(
      'select flags, correct, answered from contest_entries where child_id = $1',
      [kids.Alya!.id],
    );
    expect(flags.rows[0]).toMatchObject({ correct: 1, answered: 2 });
    expect(flags.rows[0].flags.fast).toBeGreaterThanOrEqual(1);

    await http()
      .post(`/contests/${contestId}/event`)
      .set(as(kids.Alya!.token))
      .send({ type: 'hidden' })
      .expect(200);
    const f2 = await app.pool.query('select flags from contest_entries where child_id = $1', [
      kids.Alya!.id,
    ]);
    expect(f2.rows[0].flags.hidden).toBe(1);
  });

  it('setelah batas waktu peserta (+ toleransi) jawaban ditolak', async () => {
    const { http, pool } = app;
    await http().post(`/contests/${contestId}/start`).set(as(kids.Raka!.token)).expect(200);
    await pool.query(
      "update contest_entries set started_at = now() - interval '61 minutes', deadline_at = now() - interval '10 seconds' where child_id = $1",
      [kids.Raka!.id],
    );
    await http()
      .post(`/contests/${contestId}/answer`)
      .set(as(kids.Raka!.token))
      .send({ index: 0, value: 'x' })
      .expect(403);
    const d = await http().get(`/contests/${contestId}`).set(as(kids.Raka!.token)).expect(200);
    expect(d.body.me.status).toBe('done');
  });

  it('kirim jawaban mengunci entri', async () => {
    const { http } = app;
    await http().post(`/contests/${contestId}/start`).set(as(kids.Dimas!.token)).expect(200);
    const { items: full } = await items(kids.Dimas!.id);
    for (let i = 0; i < 3; i++)
      await http()
        .post(`/contests/${contestId}/answer`)
        .set(as(kids.Dimas!.token))
        .send({ index: i, value: rightAnswer(full[i]!) })
        .expect(200);
    const s = await http()
      .post(`/contests/${contestId}/submit`)
      .set(as(kids.Dimas!.token))
      .expect(200);
    expect(s.body.me.status).toBe('done');
    await http()
      .post(`/contests/${contestId}/answer`)
      .set(as(kids.Dimas!.token))
      .send({ index: 3, value: rightAnswer(full[3]!) })
      .expect(409);
  });

  it('setelah lomba selesai: pemenang otomatis (benar ↓, waktu ↑), diskualifikasi dikecualikan', async () => {
    const { http, pool, adminToken } = app;
    // Sari menjawab 4 soal dengan benar (tertinggi), lalu nanti didiskualifikasi admin.
    await http().post(`/contests/${contestId}/start`).set(as(kids.Sari!.token)).expect(200);
    const { items: full } = await items(kids.Sari!.id);
    for (let i = 0; i < 4; i++)
      await http()
        .post(`/contests/${contestId}/answer`)
        .set(as(kids.Sari!.token))
        .send({ index: i, value: rightAnswer(full[i]!) })
        .expect(200);
    // Atur waktu: Dimas 3 benar dalam 5 menit, Alya 1 benar, Raka 0; lalu lomba ditutup.
    await pool.query(
      `update contest_entries set started_at = now() - interval '30 minutes',
         submitted_at = now() - interval '25 minutes', deadline_at = now() + interval '30 minutes'
       where child_id = $1`,
      [kids.Dimas!.id],
    );
    await pool.query(
      "update contests set starts_at = now() - interval '3 hours', ends_at = now() - interval '1 second' where id = $1",
      [contestId],
    );

    // Sebelum diskualifikasi: Sari juara 1.
    let r = await http()
      .get(`/contests/${contestId}/results`)
      .set(as(kids.Dimas!.token))
      .expect(200);
    expect(r.body.winners.map((w: { nickname: string }) => w.nickname)).toEqual([
      'Sari',
      'Dimas',
      'Alya',
    ]);
    expect(r.body.winners[0]).toMatchObject({ position: 1, correct: 4, total: 10, score: 40 });
    expect(Object.keys(r.body.winners[0]).sort()).toEqual(
      ['correct', 'me', 'momoColor', 'nickname', 'position', 'score', 'timeMs', 'total'].sort(),
    );
    expect(r.body.me).toMatchObject({ nickname: 'Dimas', position: 2, me: true });
    expect(r.body.participants).toBe(4);

    // Admin mendiskualifikasi Sari (wajib alasan).
    const detail = await http().get(`/admin/contests/${contestId}`).set(as(adminToken)).expect(200);
    const sari = detail.body.entries.find((e: { nickname: string }) => e.nickname === 'Sari');
    expect(
      detail.body.entries.find((e: { nickname: string }) => e.nickname === 'Alya').flags.hidden,
    ).toBe(1);
    await http()
      .post(`/admin/contests/${contestId}/entries/${sari.id}/disqualify`)
      .set(as(adminToken))
      .send({ disqualified: true, reason: '' })
      .expect(400);
    await http()
      .post(`/admin/contests/${contestId}/entries/${sari.id}/disqualify`)
      .set(as(adminToken))
      .send({ disqualified: true, reason: 'dibantu orang dewasa' })
      .expect(200);

    r = await http().get(`/contests/${contestId}/results`).set(as(kids.Sari!.token)).expect(200);
    expect(r.body.winners.map((w: { nickname: string }) => w.nickname)).toEqual([
      'Dimas',
      'Alya',
      'Raka',
    ]);
    expect(r.body.me).toBeNull();

    const csv = await http()
      .get(`/admin/contests/${contestId}/results.csv`)
      .set(as(adminToken))
      .expect(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain('dibantu orang dewasa');

    // Setelah mulai: kolom jadwal terkunci, judul boleh diubah; tidak bisa dihapus.
    const c = detail.body.contest;
    const body = {
      title: 'OSN MTK TK 2026',
      description: c.description,
      domain: c.domain,
      grade: c.grade,
      categories: c.categories,
      questionCount: c.questionCount,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      durationMinutes: c.durationMinutes,
      winners: 5,
      published: true,
    };
    await http()
      .put(`/admin/contests/${contestId}`)
      .set(as(adminToken))
      .send({ ...body, questionCount: 20 })
      .expect(409);
    const up = await http().put(`/admin/contests/${contestId}`).set(as(adminToken)).send(body);
    expect(up.status).toBe(200);
    expect(up.body.title).toBe('OSN MTK TK 2026');
    await http().delete(`/admin/contests/${contestId}`).set(as(adminToken)).expect(409);
  });
});
