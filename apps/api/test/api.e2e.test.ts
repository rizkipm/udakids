import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { initialJago, type JagoState } from '@little-coder/engine';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { readdirSync } from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as schema from '../src/db/schema.js';
import { seed } from '../scripts/seed.js';

/** Jumlah skill di content/ (seed), agar test tidak rapuh saat konten bertambah. */
const SKILL_COUNT = readdirSync(join(import.meta.dirname, '..', '..', '..', 'content', 'skills'), {
  recursive: true,
})
  .map(String)
  .filter((f) => f.endsWith('.json') && !f.split(/[\\/]/).pop()!.startsWith('_')).length;

const TEST_URL =
  process.env.DATABASE_URL_TEST ??
  'postgres://littlecoder:littlecoder@localhost:5432/littlecoder_test';

async function dbAvailable() {
  const pool = new Pool({ connectionString: TEST_URL, connectionTimeoutMillis: 1500 });
  try {
    await pool.query('select 1');
    return true;
  } catch {
    return false;
  } finally {
    await pool.end();
  }
}

const available = await dbAvailable();
if (!available) console.warn(`[api e2e] dilewati: Postgres test tidak tersedia di ${TEST_URL}`);

describe.skipIf(!available)('API end-to-end (Postgres)', () => {
  let app: INestApplication;
  let pool: Pool;
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  let adminToken = '';

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL;
    pool = new Pool({ connectionString: TEST_URL });
    const db = drizzle(pool, { schema });
    await pool.query(
      'drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;',
    );
    await migrate(db, { migrationsFolder: join(import.meta.dirname, '..', 'drizzle') });
    await seed(db, { log: () => {} });
    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    const res = await http()
      .post('/auth/staff/login')
      .send({ email: 'admin@littlecoder.local', password: 'admin12345' })
      .expect(200);
    adminToken = res.body.token;
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await pool?.end();
  });

  describe('data dari database (D-030)', () => {
    it('buku publik untuk landing: dari DB, tanpa login, jumlah level = skill aktif', async () => {
      const res = await http().get('/public/books').expect(200);
      expect(res.body.totalLevels).toBe(SKILL_COUNT);
      expect(res.body.books.map((b: { title: string }) => b.title)).toEqual([
        'Matematika Pra-TK',
        'Math Kindergarten (TK)',
        'Math Grade 1-2',
        'Math Grade 3-4',
        'Sains Grade 1-2',
        'Sains Grade 3-4',
      ]);
      expect(res.body.books[0]).toMatchObject({ topics: 25, levels: 250 });
      expect(JSON.stringify(res.body)).not.toMatch(/email|nickname|password/i);
    });

    it('dialog Momo disimpan di tabel dialogs dan dipakai validasi level', async () => {
      const { rows } = await pool.query("select data from dialogs where locale = 'id'");
      expect(Object.keys(rows[0].data.lines).length).toBeGreaterThan(0);
      await pool.query(
        "update dialogs set data = jsonb_set(data, '{lines}', '{}') where locale = 'id'",
      );
      const level = JSON.parse(
        (await import('node:fs')).readFileSync(
          join(
            import.meta.dirname,
            '..',
            '..',
            '..',
            'content',
            'levels',
            'basic',
            'world-1',
            'w1-l04.json',
          ),
          'utf8',
        ),
      );
      const res = await http()
        .post('/admin/levels/validate')
        .set(auth(adminToken))
        .send(level)
        .expect(201);
      // Tanpa kalimat di DB, rujukan dialog level ikut dilaporkan → bukti dialog dibaca dari DB.
      expect(JSON.stringify(res.body)).toMatch(/dialog|audioKey|kalimat/i);
      await pool.query("update dialogs set data = $1 where locale = 'id'", [rows[0].data]);
      const ok = await http()
        .post('/admin/levels/validate')
        .set(auth(adminToken))
        .send(level)
        .expect(201);
      expect(ok.body.errors).toEqual([]);
    });
  });

  describe('auth staf & peran', () => {
    it('password salah → 401; endpoint tanpa token → 401; health publik', async () => {
      await http()
        .post('/auth/staff/login')
        .send({ email: 'admin@littlecoder.local', password: 'salah-sekali' })
        .expect(401);
      await http().get('/admin/skills').expect(401);
      await http().get('/admin/skills').set(auth('token-palsu')).expect(401);
      await http().get('/health').expect(200);
    });

    it('admin membuat fasilitator; fasilitator tidak bisa ke /admin tapi bisa kelas miliknya', async () => {
      await http()
        .post('/admin/staff')
        .set(auth(adminToken))
        .send({
          email: 'kakak@cleo.id',
          name: 'Kak Rani',
          role: 'facilitator',
          password: 'rahasia123',
        })
        .expect(201);
      await http()
        .post('/admin/staff')
        .set(auth(adminToken))
        .send({ email: 'kakak@cleo.id', name: 'X', role: 'facilitator', password: 'rahasia123' })
        .expect(409);
      const login = await http()
        .post('/auth/staff/login')
        .send({ email: 'KAKAK@cleo.id', password: 'rahasia123' })
        .expect(200);
      const fac = login.body.token;
      expect(login.body.user.role).toBe('facilitator');
      await http().get('/admin/staff').set(auth(fac)).expect(403);
      const cls = await http()
        .post('/classes')
        .set(auth(fac))
        .send({ eventName: 'Workshop Batam' })
        .expect(201);
      expect(cls.body.code).toMatch(/^[A-Z2-9]{6}$/);
      const mine = await http().get('/classes').set(auth(fac)).expect(200);
      expect(mine.body).toHaveLength(1);
      await http()
        .post('/classes')
        .set(auth(adminToken))
        .send({ eventName: 'Kelas admin' })
        .expect(201);
      expect((await http().get('/classes').set(auth(fac))).body).toHaveLength(1);
      expect((await http().get('/classes').set(auth(adminToken))).body).toHaveLength(2);
    });

    it('tidak bisa menonaktifkan admin terakhir / diri sendiri', async () => {
      const staff = await http().get('/admin/staff').set(auth(adminToken)).expect(200);
      const admin = staff.body.find((s: { role: string }) => s.role === 'admin');
      await http()
        .patch(`/admin/staff/${admin.id}`)
        .set(auth(adminToken))
        .send({ active: false })
        .expect(400);
    });
  });

  describe('orang tua, anak, sandi gambar', () => {
    let parentToken = '';
    let familyCode = '';
    let childId = '';
    let childToken = '';
    const pin = ['kucing', 'apel', 'bola'];

    it('pendaftaran wajib persetujuan', async () => {
      const bad = await http()
        .post('/auth/parent/register')
        .send({ name: 'Ibu Alya', email: 'ibu@alya.id', password: 'rahasia123', consent: false })
        .expect(400);
      expect(JSON.stringify(bad.body)).toMatch(/persetujuan/);
      const res = await http()
        .post('/auth/parent/register')
        .send({ name: 'Ibu Alya', email: 'ibu@alya.id', password: 'rahasia123', consent: true })
        .expect(201);
      parentToken = res.body.token;
      familyCode = res.body.familyCode;
      expect(familyCode).toMatch(/^[A-Z2-9]{6}$/);
      await http()
        .post('/auth/parent/register')
        .send({ name: 'X', email: 'ibu@alya.id', password: 'rahasia123', consent: true })
        .expect(409);
      await http()
        .post('/auth/parent/login')
        .send({ email: 'ibu@alya.id', password: 'rahasia123' })
        .expect(200);
    });

    it('menambah anak: hanya nama panggilan + warna + sandi gambar; data lain ditolak', async () => {
      await http()
        .post('/parent/children')
        .set(auth(parentToken))
        .send({ nickname: 'Alya', momoColor: 'ungu', pin, birthday: '2020-01-01' })
        .expect(400);
      await http()
        .post('/parent/children')
        .set(auth(parentToken))
        .send({ nickname: 'Alya', momoColor: 'ungu', pin: ['kucing'] })
        .expect(400);
      const res = await http()
        .post('/parent/children')
        .set(auth(parentToken))
        .send({ nickname: 'Alya', momoColor: 'ungu', pin })
        .expect(201);
      childId = res.body.id;
      expect(Object.keys(res.body).sort()).toEqual([
        'classCode',
        'classId',
        'className',
        'createdAt',
        'id',
        'lastActiveAt',
        'momoColor',
        'nickname',
      ]);
      const fam = await http().get(`/auth/family/${familyCode.toLowerCase()}`).expect(200);
      expect(fam.body).toEqual([{ id: childId, nickname: 'Alya', momoColor: 'ungu' }]);
      await http().get('/auth/family/ZZZZZZ').expect(404);
    });

    it('sandi gambar salah 5× → terkunci sebentar; benar → token anak', async () => {
      for (let i = 0; i < 4; i++) {
        const r = await http()
          .post('/auth/child/login')
          .send({ familyCode, childId, pin: ['bola', 'apel', 'kucing'] })
          .expect(401);
        expect(r.body.attemptsLeft).toBe(4 - i);
      }
      await http()
        .post('/auth/child/login')
        .send({ familyCode, childId, pin: ['bola', 'apel', 'kucing'] })
        .expect(401);
      await http().post('/auth/child/login').send({ familyCode, childId, pin }).expect(429);
      await pool.query('update children set pin_locked_until = null where id = $1', [childId]);
      const ok = await http()
        .post('/auth/child/login')
        .send({ familyCode, childId, pin })
        .expect(200);
      childToken = ok.body.token;
      expect(ok.body.user).toMatchObject({ id: childId, role: 'child', name: 'Alya' });
      await http()
        .post('/auth/child/login')
        .send({ familyCode: 'ABCDEF', childId, pin })
        .expect(404);
    });

    it('anak: katalog 170 skill, tidak bisa ke area orang tua/admin', async () => {
      const cat = await http().get('/catalog').set(auth(childToken)).expect(200);
      expect(cat.body.skills).toHaveLength(SKILL_COUNT);
      expect(
        cat.body.catalogs.find((c: { grade: string }) => c.grade === 'prek').categories,
      ).toHaveLength(25);
      expect(
        cat.body.catalogs.find(
          (c: { grade: string; domain: string }) => c.grade === 'sd34' && c.domain === 'sains',
        ).categories,
      ).toHaveLength(10);
      await http().get('/parent/children').set(auth(childToken)).expect(403);
      await http().get('/admin/skills').set(auth(childToken)).expect(403);
      await http().get('/levels').set(auth(childToken)).expect(200);
    });

    it('sync latihan idempoten per event.id; Skor Jago digabung (ts terbaru, tahap max)', async () => {
      const skillId = 'math.prek.b3.hitung-gambar-sampai-3';
      const answers = [
        { id: randomUUID(), skillId, correct: true, band: 0, ts: Date.now() },
        {
          id: randomUUID(),
          skillId,
          correct: false,
          band: 0,
          chosenDistractor: 'lebih-satu',
          ts: Date.now(),
        },
      ];
      const state: JagoState = { ...initialJago(), score: 24, visibleStage: 0, ts: Date.now() };
      const first = await http()
        .post('/practice/sync')
        .set(auth(childToken))
        .send({ answers, states: [{ skillId, state }] })
        .expect(200);
      expect(first.body).toMatchObject({ accepted: 2, duplicates: 0 });
      const again = await http()
        .post('/practice/sync')
        .set(auth(childToken))
        .send({ answers, states: [{ skillId, state }] })
        .expect(200);
      expect(again.body).toMatchObject({ accepted: 0, duplicates: 2 });
      const [row] = (
        await pool.query('select answered, correct from skill_mastery where child_id = $1', [
          childId,
        ])
      ).rows;
      expect(row).toEqual({ answered: 2, correct: 1 });

      // State lama (ts lebih kecil) tidak menimpa, tapi tahap terlihat tetap max.
      const older: JagoState = { ...initialJago(), score: 70, visibleStage: 2, ts: 1 };
      const merged = await http()
        .post('/practice/sync')
        .set(auth(childToken))
        .send({ answers: [], states: [{ skillId, state: older }] })
        .expect(200);
      expect(merged.body.states[skillId]).toMatchObject({ score: 24, visibleStage: 2 });
      await http()
        .post('/practice/sync')
        .set(auth(childToken))
        .send({ answers: [{ ...answers[0], id: 'bukan-uuid' }], states: [] })
        .expect(400);
    });

    it('hasil ronde level: idempoten, skor terbaik & lulus tidak turun, muncul di laporan', async () => {
      const skillId = 'math.prek.a1.kenali-angka-1-sampai-2';
      const r1 = { id: randomUUID(), skillId, correct: 6, total: 10, ts: Date.now() - 2000 };
      const first = await http()
        .post('/practice/sync')
        .set(auth(childToken))
        .send({ answers: [], states: [], quizzes: [r1] })
        .expect(200);
      expect(first.body.quizzes[skillId]).toMatchObject({ best: 60, passed: false, attempts: 1 });
      await http()
        .post('/practice/sync')
        .set(auth(childToken))
        .send({ answers: [], states: [], quizzes: [r1] })
        .expect(200);
      const r2 = { id: randomUUID(), skillId, correct: 8, total: 10, ts: Date.now() - 1000 };
      const r3 = { id: randomUUID(), skillId, correct: 3, total: 10, ts: Date.now() };
      const after = await http()
        .post('/practice/sync')
        .set(auth(childToken))
        .send({ answers: [], states: [], quizzes: [r2, r3] })
        .expect(200);
      expect(after.body.quizzes[skillId]).toMatchObject({
        best: 80,
        last: 30,
        passed: true,
        attempts: 3,
      });
      const state = await http().get('/practice/state').set(auth(childToken)).expect(200);
      expect(state.body.quizzes[skillId].passed).toBe(true);
    });

    it('kunci level dicek di server: level terkunci ditolak; urutan lulus dalam satu kiriman diterima', async () => {
      const a2 = 'math.prek.a2.kenali-angka-sampai-3';
      const a3 = 'math.prek.a3.pilih-angka-yang-kamu-dengar-sampai-2';
      const now = Date.now();
      const locked = { id: randomUUID(), skillId: a3, correct: 10, total: 10, ts: now };
      const res = await http()
        .post('/practice/sync')
        .set(auth(childToken))
        .send({ answers: [], states: [], quizzes: [locked] })
        .expect(200);
      expect(res.body.rejectedQuizzes).toEqual([locked.id]);
      expect(res.body.quizzes[a3]).toBeUndefined();
      const fake = {
        id: randomUUID(),
        skillId: 'math.prek.zz9.tidak-ada',
        correct: 10,
        total: 10,
        ts: now,
      };
      const unknown = await http()
        .post('/practice/sync')
        .set(auth(childToken))
        .send({ answers: [], states: [], quizzes: [fake] })
        .expect(200);
      expect(unknown.body.rejectedQuizzes).toEqual([fake.id]);
      // Lulus Level 2 lalu Level 3 dalam satu kiriman (urut waktu): keduanya sah.
      const batch = await http()
        .post('/practice/sync')
        .set(auth(childToken))
        .send({
          answers: [],
          states: [],
          quizzes: [
            { id: randomUUID(), skillId: a3, correct: 7, total: 10, ts: now + 2 },
            { id: randomUUID(), skillId: a2, correct: 9, total: 10, ts: now + 1 },
          ],
        })
        .expect(200);
      expect(batch.body.rejectedQuizzes).toEqual([]);
      expect(batch.body.quizzes[a3]).toMatchObject({ best: 70, passed: true });
      // Bersihkan agar test berikutnya (total skor, riwayat) tetap sama.
      await pool.query('delete from quiz_results where skill_id = any($1)', [[a2, a3]]);
      await pool.query(
        "delete from events where type = 'quiz_result' and payload->>'skillId' = any($1)",
        [[a2, a3]],
      );
    });

    it('profil anak: total skor, waktu, riwayat, peringkat global + papan peringkat (D-024)', async () => {
      const noClass = await http().get('/practice/profile').set(auth(childToken)).expect(200);
      expect(noClass.body).toMatchObject({
        nickname: 'Alya',
        totalPoints: 80,
        passedLevels: 1,
        played: 3,
        rank: { position: 1, of: 1 },
        className: null,
        highest: { book: 'Matematika Pra-TK', level: 1 },
      });
      expect(noClass.body.history).toHaveLength(3);
      expect(noClass.body.history[0]).toMatchObject({
        title: 'Bilangan sampai 3 — Level 1 — Kenali angka 1 sampai 2',
        score: 30,
        passed: false,
      });

      const cls = await http()
        .post('/classes')
        .set(auth(adminToken))
        .send({ eventName: 'Workshop Minggu' })
        .expect(201);
      await http()
        .patch(`/parent/children/${childId}`)
        .set(auth(parentToken))
        .send({ classCode: 'ZZZZZZ' })
        .expect(400);
      const joined = await http()
        .patch(`/parent/children/${childId}`)
        .set(auth(parentToken))
        .send({ classCode: cls.body.code })
        .expect(200);
      expect(joined.body).toMatchObject({ className: 'Workshop Minggu', classCode: cls.body.code });

      // Saudara di kelas yang sama dengan skor lebih tinggi.
      const sib = await http()
        .post('/parent/children')
        .set(auth(parentToken))
        .send({ nickname: 'Raka', momoColor: 'biru', pin, classCode: cls.body.code })
        .expect(201);
      const sibLogin = await http()
        .post('/auth/child/login')
        .send({ familyCode, childId: sib.body.id, pin })
        .expect(200);
      await http()
        .post('/practice/sync')
        .set(auth(sibLogin.body.token))
        .send({
          answers: [],
          states: [],
          quizzes: [
            {
              id: randomUUID(),
              skillId: 'math.prek.a1.kenali-angka-1-sampai-2',
              correct: 10,
              total: 10,
              ts: Date.now(),
              durationMs: 95_000,
            },
          ],
        })
        .expect(200);
      const ranked = await http().get('/practice/profile').set(auth(childToken)).expect(200);
      expect(ranked.body).toMatchObject({
        rank: { position: 2, of: 2 },
        className: 'Workshop Minggu',
      });
      const sibProfile = await http()
        .get('/practice/profile')
        .set(auth(sibLogin.body.token))
        .expect(200);
      expect(sibProfile.body).toMatchObject({ rank: { position: 1, of: 2 }, totalTimeMs: 95_000 });
      expect(sibProfile.body.history[0]).toMatchObject({ durationMs: 95_000, score: 100 });

      const board = await http().get('/practice/leaderboard').set(auth(childToken)).expect(200);
      expect(board.body.total).toBe(2);
      expect(board.body.rows[0]).toMatchObject({
        position: 1,
        nickname: 'Raka',
        momoColor: 'biru',
        points: 100,
        passed: 1,
        timeMs: 95_000,
        highest: { book: 'Matematika Pra-TK', level: 1 },
        me: false,
      });
      expect(board.body.me).toMatchObject({ position: 2, nickname: 'Alya', me: true });
      // Hanya nama panggilan & warna: tanpa id anak, email, atau data orang tua.
      expect(Object.keys(board.body.rows[0]).sort()).toEqual(
        ['highest', 'me', 'momoColor', 'nickname', 'passed', 'points', 'position', 'timeMs'].sort(),
      );
      await http().delete(`/parent/children/${sib.body.id}`).set(auth(parentToken)).expect(200);
    });

    it('laporan orang tua: penguasaan per kategori + rekomendasi; anak orang lain tidak bisa diakses', async () => {
      const rep = await http()
        .get(`/parent/children/${childId}/report`)
        .set(auth(parentToken))
        .expect(200);
      expect(rep.body.totals).toMatchObject({ answered: 2, correct: 1, skills: SKILL_COUNT });
      expect(rep.body.week.answered).toBe(2);
      expect(
        rep.body.areas.find((a: { grade: string }) => a.grade === 'prek').categories,
      ).toHaveLength(25);
      expect(rep.body.recommendations).toHaveLength(3);
      expect(rep.body.recommendations[0].id).toBe('math.prek.b3.hitung-gambar-sampai-3');
      const prek = rep.body.areas.find((a: { grade: string }) => a.grade === 'prek');
      expect(
        prek.categories[0].skills.find(
          (k: { id: string }) => k.id === 'math.prek.a1.kenali-angka-1-sampai-2',
        ).level,
      ).toMatchObject({ best: 80, passed: true });

      const other = await http()
        .post('/auth/parent/register')
        .send({ name: 'Ayah Raka', email: 'ayah@raka.id', password: 'rahasia123', consent: true })
        .expect(201);
      await http()
        .get(`/parent/children/${childId}/report`)
        .set(auth(other.body.token))
        .expect(404);
      await http().delete(`/parent/children/${childId}`).set(auth(other.body.token)).expect(404);
    });

    it('admin: laporan ringkas, statistik skill (pengecoh), daftar anak, reset sandi gambar', async () => {
      const ov = await http().get('/admin/reports/overview').set(auth(adminToken)).expect(200);
      expect(ov.body).toMatchObject({
        parents: 2,
        children: 1,
        skills: SKILL_COUNT,
        answersWeek: 2,
      });
      const stats = await http().get('/admin/reports/skills').set(auth(adminToken)).expect(200);
      const s = stats.body.find(
        (x: { id: string }) => x.id === 'math.prek.b3.hitung-gambar-sampai-3',
      );
      expect(s).toMatchObject({
        answered: 2,
        accuracy: 50,
        learners: 1,
        topDistractors: [{ tag: 'lebih-satu', count: 1 }],
      });
      const kids = await http().get('/admin/children').set(auth(adminToken)).expect(200);
      expect(kids.body[0]).toMatchObject({
        nickname: 'Alya',
        parentEmail: 'ibu@alya.id',
        answered: 2,
      });
      await http()
        .post(`/admin/children/${childId}/pin`)
        .set(auth(adminToken))
        .send({ pin: ['kue', 'kue', 'kue'] })
        .expect(201);
      await http()
        .post('/auth/child/login')
        .send({ familyCode, childId, pin: ['kue', 'kue', 'kue'] })
        .expect(200);
      const parents = await http().get('/admin/parents').set(auth(adminToken)).expect(200);
      expect(
        parents.body.find((p: { email: string }) => p.email === 'ibu@alya.id').children,
      ).toHaveLength(1);
    });

    it('orang tua menghapus profil anak (hak hapus data)', async () => {
      await http().delete(`/parent/children/${childId}`).set(auth(parentToken)).expect(200);
      expect((await pool.query('select count(*)::int as n from skill_mastery')).rows[0].n).toBe(0);
      expect((await http().get('/parent/children').set(auth(parentToken))).body).toEqual([]);
    });
  });

  describe('registrasi kelas (D-025)', () => {
    let classId = '';
    let code = '';
    it('fasilitator mendaftarkan siswa sekaligus → kartu masuk; nama kembar dilewati', async () => {
      const cls = await http()
        .post('/classes')
        .set(auth(adminToken))
        .send({ eventName: 'Kelas Pelangi' })
        .expect(201);
      classId = cls.body.id;
      code = cls.body.code;
      const roster = await http()
        .post(`/classes/${classId}/roster`)
        .set(auth(adminToken))
        .send({ nicknames: ['Bima', 'Citra', 'bima'] })
        .expect(201);
      expect(roster.body.created.map((c: { nickname: string }) => c.nickname)).toEqual([
        'Bima',
        'Citra',
      ]);
      expect(roster.body.skipped).toEqual(['bima']);
      const bima = roster.body.created[0];
      expect(new Set(bima.pin).size).toBe(3);
      await http()
        .post(`/classes/${classId}/roster`)
        .set(auth(adminToken))
        .send({ nicknames: ['B1ma!'] })
        .expect(400);

      // Masuk dengan KODE KELAS di layar anak yang sama.
      const profiles = await http().get(`/auth/family/${code}`).expect(200);
      expect(profiles.body.map((p: { nickname: string }) => p.nickname)).toEqual(['Bima', 'Citra']);
      await http()
        .post('/auth/child/login')
        .send({ familyCode: code, childId: bima.id, pin: bima.pin })
        .expect(200);
      const students = await http()
        .get(`/classes/${classId}/students`)
        .set(auth(adminToken))
        .expect(200);
      expect(students.body).toHaveLength(2);

      const reset = await http()
        .post(`/classes/${classId}/students/${bima.id}/pin`)
        .set(auth(adminToken))
        .expect(201);
      await http()
        .post('/auth/child/login')
        .send({ familyCode: code, childId: bima.id, pin: reset.body.pin })
        .expect(200);
    });

    it('siswa gabung sendiri dengan kode kelas; kelas ditutup → tidak bisa', async () => {
      expect((await http().get(`/auth/class/${code}`).expect(200)).body).toEqual({
        code,
        eventName: 'Kelas Pelangi',
      });
      const pin = ['ikan', 'kue', 'bola'];
      const joined = await http()
        .post('/auth/class/join')
        .send({ classCode: code, nickname: 'Dewi', momoColor: 'hijau', pin })
        .expect(201);
      expect(joined.body.user).toMatchObject({ role: 'child', name: 'Dewi' });
      await http().get('/practice/state').set(auth(joined.body.token)).expect(200);
      await http()
        .post('/auth/class/join')
        .send({ classCode: code, nickname: 'dewi', momoColor: 'biru', pin })
        .expect(409);
      await http()
        .post('/auth/class/join')
        .send({ classCode: code, nickname: 'Eko', momoColor: 'biru', pin, email: 'x@y.id' })
        .expect(400);
      await http()
        .patch(`/classes/${classId}`)
        .set(auth(adminToken))
        .send({ closed: true })
        .expect(200);
      await http()
        .post('/auth/class/join')
        .send({ classCode: code, nickname: 'Eko', momoColor: 'biru', pin })
        .expect(404);
      await http().get(`/auth/family/${code}`).expect(404);
    });
  });

  describe('admin: skill & soal', () => {
    const base = {
      id: 'math.prek.a3.soal-manual-uji',
      version: 1,
      domain: 'math',
      grade: 'prek',
      category: 'A',
      order: 3,
      title: 'Soal manual uji',
      tier: 'basic',
      family: 'manual',
      params: {
        items: [
          {
            prompt: 'Mana yang kucing?',
            choices: [
              { visual: { kind: 'object', object: 'kucing' } },
              { visual: { kind: 'object', object: 'bebek' } },
            ],
            answer: 0,
          },
        ],
      },
    };

    it('membuat soal manual, menolak template rusak, versi naik saat diubah', async () => {
      await http()
        .post('/admin/skills')
        .set(auth(adminToken))
        .send({ ...base, category: 'ZZ' })
        .expect(400);
      await http()
        .post('/admin/skills')
        .set(auth(adminToken))
        .send({ ...base, params: { items: [] } })
        .expect(400);
      const bad = await http()
        .post('/admin/skills')
        .set(auth(adminToken))
        .send({
          ...base,
          id: 'math.prek.a4.mustahil',
          order: 4,
          family: 'arith',
          params: { constraint: 'a + b > 100' },
        })
        .expect(400);
      expect(JSON.stringify(bad.body)).toMatch(/gagal membuat soal/);
      await http().post('/admin/skills').set(auth(adminToken)).send(base).expect(201);
      await http().post('/admin/skills').set(auth(adminToken)).send(base).expect(409);
      const same = await http()
        .put(`/admin/skills/${base.id}`)
        .set(auth(adminToken))
        .send(base)
        .expect(200);
      expect(same.body.version).toBe(1);
      const changed = await http()
        .put(`/admin/skills/${base.id}`)
        .set(auth(adminToken))
        .send({ ...base, title: 'Soal manual uji 2' })
        .expect(200);
      expect(changed.body.version).toBe(2);
      await http().delete(`/admin/skills/${base.id}`).set(auth(adminToken)).expect(400);
      await http()
        .patch(`/admin/skills/${base.id}/status`)
        .set(auth(adminToken))
        .send({ status: 'draft' })
        .expect(200);
      await http().delete(`/admin/skills/${base.id}`).set(auth(adminToken)).expect(200);
    });

    it('katalog: tidak bisa menghapus kategori yang masih dipakai', async () => {
      await http()
        .put('/admin/catalogs/math/prek')
        .set(auth(adminToken))
        .send({
          domain: 'math',
          grade: 'prek',
          title: 'Matematika Pra-TK',
          categories: [{ code: 'A', title: 'Bilangan sampai 3' }],
        })
        .expect(400);
    });
  });

  describe('admin: level', () => {
    it('validasi solver sebelum simpan; versi naik saat diubah', async () => {
      const list = await http().get('/admin/levels').set(auth(adminToken)).expect(200);
      const w2 = list.body.find((l: { id: string }) => l.id === 'w2-l07');
      const v = await http()
        .post('/admin/levels/validate')
        .set(auth(adminToken))
        .send(w2.data)
        .expect(201);
      expect(v.body).toMatchObject({ errors: [], optimalSteps: 8 });
      const blocked = {
        ...w2.data,
        grid: {
          ...w2.data.grid,
          walls: [
            [3, 4],
            [4, 1],
            [3, 3],
            [3, 2],
            [3, 1],
            [3, 0],
          ],
        },
      };
      const bad = await http()
        .put('/admin/levels/w2-l07')
        .set(auth(adminToken))
        .send(blocked)
        .expect(400);
      expect(JSON.stringify(bad.body)).toMatch(/tidak bisa diselesaikan/);
      const unchanged = await http()
        .put('/admin/levels/w2-l07')
        .set(auth(adminToken))
        .send(w2.data)
        .expect(200);
      expect(unchanged.body.version).toBe(1);
      const ok = await http()
        .put('/admin/levels/w2-l07')
        .set(auth(adminToken))
        .send({ ...w2.data, maxCards: 9 })
        .expect(200);
      expect(ok.body.version).toBe(2);
    });
  });
});
