import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  catalogSchema,
  generateItem,
  initialJago,
  skillTemplateSchema,
  type JagoState,
} from '@little-coder/engine';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { readdirSync, readFileSync } from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as schema from '../src/db/schema.js';
import { seed } from '../scripts/seed.js';
import { mergeNewCategories } from '../src/cli/seed.js';
import { MAIL_TRANSPORT } from '../src/mail/mail.service.js';
import { TTS_PROVIDER } from '../src/voice/tts.provider.js';
import { configureApp } from '../src/common/app-setup.js';

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

/** Penyedia TTS palsu: tidak memanggil Google; mencatat teks yang dibuatkan suara. */
const ttsCalls: string[] = [];
const ttsLangs: string[] = [];
const ttsStyles: string[] = [];
const fakeTts = {
  name: 'fake',
  synthesize: async (text: string, s: { style: string }, lang = 'id-ID') => {
    ttsCalls.push(text);
    ttsLangs.push(lang);
    ttsStyles.push(s.style);
    return { mime: 'audio/mpeg', data: Buffer.from(`ID3-fake-${text}`) };
  },
};
/** PNG 1×1 minimal untuk bukti transfer. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const available = await dbAvailable();
if (!available) console.warn(`[api e2e] dilewati: Postgres test tidak tersedia di ${TEST_URL}`);

describe.skipIf(!available)('API end-to-end (Postgres)', () => {
  let app: INestApplication;
  let pool: Pool;
  let base = '';
  const http = () => request(base);
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
    // Test lama memakai level 3+ tanpa paket → kunci berbayar dimatikan; test billing menyalakannya.
    await pool.query("insert into app_settings (key, value) values ('billing', $1)", [
      JSON.stringify({
        paywall: false,
        freeLevels: 2,
        orderExpiryHours: 24,
        classFullAccess: true,
      }),
    ]);
    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TTS_PROVIDER)
      .useValue(fakeTts)
      .overrideProvider(MAIL_TRANSPORT)
      .useValue(null)
      .compile();
    app = configureApp(moduleRef.createNestApplication<NestExpressApplication>());
    // Port tetap di 127.0.0.1 (lihat e2e-setup.ts): mencegah request nyasar ke server test lain.
    await app.listen(0, '127.0.0.1');
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1').replace('localhost', '127.0.0.1');
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
      // Urut per mata pelajaran lalu jenjang (GRADES): buku per kelas (D-032) di samping buku gabungan lama.
      expect(res.body.books.map((b: { title: string }) => b.title)).toEqual([
        'Math PAUD',
        'Math Kindergarten (TK)',
        'Math TK (Olimpiade)',
        'Math Grade 1',
        'Math Grade 2',
        'Math Grade 1-2 (Olimpiade)',
        'Math Grade 3',
        'Math Grade 3-4 (Olimpiade)',
        'Math Grade 5-6 (Olimpiade)',
        'Math SMP Kelas 7-9 (Olimpiade)',
        'Sains Kindergarten (TK)',
        'Sains TK (Olimpiade)',
        'Sains Grade 1',
        'Sains Grade 2',
        'Sains Grade 1-2 (Olimpiade)',
        'Sains Grade 3',
        'Sains Grade 4',
        'Sains Grade 3-4 (Olimpiade)',
        'Sains Grade 5-6 (Olimpiade)',
        'Sains SMP Kelas 7-9 (Olimpiade)',
        'English PAUD',
        'English TK (Olimpiade)',
        'English Grade 1-2 (Olimpiade)',
        'English Grade 3-4 (Olimpiade)',
        'English Grade 5-6 (Olimpiade)',
        'English SMP Kelas 7-9 (Olimpiade)',
        'Worksheet PAUD',
      ]);
      // 25 topik materi + topik Game seru (D-078).
      expect(res.body.books[0]).toMatchObject({ topics: 26, levels: 260 });
      expect(JSON.stringify(res.body)).not.toMatch(/email|nickname|password/i);
      // Rujukan kurikulum dari tag skill (D-059); rujukan internal (ixlRef) tidak pernah tampil.
      const std = (title: string) =>
        res.body.books.find((b: { title: string }) => b.title === title).standards;
      expect(std('Math PAUD')).toEqual(['merdeka', 'singapore']);
      expect(std('Math Kindergarten (TK)')).toEqual(['merdeka', 'singapore']);
      expect(std('Sains SMP Kelas 7-9 (Olimpiade)')).toEqual(['merdeka', 'timss', 'osn']);
      expect(std('English PAUD')).toEqual(['singapore', 'cambridge']);
      expect(std('Math Grade 3')).toEqual(['merdeka', 'singapore', 'cambridge', 'osn']);
      expect(JSON.stringify(res.body)).not.toMatch(/ixl/i);
    });

    it('statistik publik: jumlah pengguna & ronde dari DB (angka saja), SSE mengirim event pertama', async () => {
      const res = await http().get('/public/stats').expect(200);
      const q = async (sql: string) => Number((await pool.query(sql)).rows[0].n);
      const users =
        (await q('select count(*) n from parents where active')) +
        (await q('select count(*) n from children where active')) +
        (await q('select count(*) n from staff_users where active'));
      expect(res.body).toMatchObject({
        books: 27,
        totalLevels: SKILL_COUNT,
        users,
        rounds: await q("select count(*) n from events where type = 'quiz_result'"),
        // Total soal latihan (level × 10) & soal dijawab (D-054).
        totalQuestions: SKILL_COUNT * 10,
        answered: await q('select coalesce(sum(answered), 0) n from skill_mastery'),
      });
      expect(Object.keys(res.body).sort()).toEqual(
        [
          'activeNow',
          'answered',
          'books',
          'learners',
          'rounds',
          'totalLevels',
          'totalQuestions',
          'updatedAt',
          'users',
        ].sort(),
      );
      const first = await new Promise<string>((resolve, reject) => {
        const req = http()
          .get('/public/stats/stream')
          .buffer(false)
          .parse((stream, cb) => {
            let buf = '';
            stream.on('data', (chunk: Buffer) => {
              buf += chunk.toString();
              if (!/data: .*\n/.test(buf)) return; // lewati baris kosong keep-alive
              resolve(buf.trimStart());
              (stream as unknown as { destroy: () => void }).destroy();
              cb(null, null);
            });
          });
        req.end((err) => err && !String(err).includes('aborted') && reject(err));
      });
      expect(first).toMatch(/^id: \d+\ndata: \{.*"users":\d+/);
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
        // Tampilan Momo (D-051): gradasi & aksesori robot, bukan data pribadi.
        'momoLook',
        'nickname',
      ]);
      const fam = await http().get(`/auth/family/${familyCode.toLowerCase()}`).expect(200);
      expect(fam.body).toEqual([
        { id: childId, nickname: 'Alya', momoColor: 'ungu', momoLook: null },
      ]);
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
        cat.body.catalogs.find(
          (c: { grade: string; domain: string }) => c.grade === 'prek' && c.domain === 'math',
        ).categories,
      ).toHaveLength(26);
      expect(
        cat.body.catalogs.find(
          (c: { grade: string; domain: string }) => c.grade === 'sd34' && c.domain === 'sains',
        ).categories,
        // 10 materi OSN + 7 materi KMSI (K–Q) + Game seru (GM, D-078) + Mock Test KMSI (Y), D-074.
      ).toHaveLength(19);
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
        highest: { book: 'Math PAUD', level: 1 },
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
        highest: { book: 'Math PAUD', level: 1 },
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
        rep.body.areas.find(
          (a: { grade: string; domain: string }) => a.grade === 'prek' && a.domain === 'math',
        ).categories,
      ).toHaveLength(26);
      expect(rep.body.recommendations).toHaveLength(3);
      expect(rep.body.recommendations[0].id).toBe('math.prek.b3.hitung-gambar-sampai-3');
      const prek = rep.body.areas.find(
        (a: { grade: string; domain: string }) => a.grade === 'prek' && a.domain === 'math',
      );
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
          title: 'Math PAUD',
          categories: [{ code: 'A', title: 'Bilangan sampai 3' }],
        })
        .expect(400);
    });

    it('katalog yang disunting admin tidak ditimpa db:seed (kecuali --force)', async () => {
      const cur = (await http().get('/admin/catalogs').set(auth(adminToken)).expect(200)).body.find(
        (c: { domain: string; grade: string }) => c.domain === 'math' && c.grade === 'prek',
      );
      await http()
        .put('/admin/catalogs/math/prek')
        .set(auth(adminToken))
        .send({
          domain: 'math',
          grade: 'prek',
          title: 'Math PAUD (uji)',
          categories: cur.categories,
        })
        .expect(200);
      const db = drizzle(pool, { schema });
      await seed(db, { log: () => {} });
      const title = async () =>
        (
          await pool.query(
            "select title from skill_catalogs where domain = 'math' and grade = 'prek'",
          )
        ).rows[0].title;
      expect(await title()).toBe('Math PAUD (uji)');
      await seed(db, { force: true, log: () => {} });
      expect(await title()).toBe('Math PAUD');
    }, 120_000); // seed 2×: ±2.700 skill

    it('katalog suntingan admin tetap mendapat materi BARU dari content (D-074), suntingan lama dipertahankan', async () => {
      const content = catalogSchema.parse(
        JSON.parse(
          readFileSync(
            join(
              import.meta.dirname,
              '..',
              '..',
              '..',
              'content',
              'skills',
              'math',
              'sd12',
              '_catalog.json',
            ),
            'utf8',
          ),
        ),
      );
      // Katalog lama yang disunting admin: materi OSN (judul lama "(OSN)") + mock KMSI dengan judul bagian lama
      // "Mock Test KMSI · …" tanpa tanda `mock` (sebelum D-076).
      const mockY = content.categories.find((c) => c.code === 'Y')!;
      const old = [
        ...content.categories
          .filter((c) => !c.group)
          .map((c, i) => (i === 0 ? { ...c, title: 'Bilangan (disunting admin)' } : c)),
        { ...mockY, mock: undefined, group: 'Mock Test KMSI · Simulasi penyisihan 30 soal' },
      ];
      // Langsung di DB: admin tidak boleh menghapus materi yang masih dipakai skill, jadi kondisi "katalog lama"
      // (sebelum materi baru ditambahkan ke content/) disiapkan tanpa API.
      await pool.query(
        `update skill_catalogs set title = 'Math Grade 1-2 (OSN)', categories = $1,
           updated_by = (select id from staff_users where role = 'admin' limit 1)
         where domain = 'math' and grade = 'sd12'`,
        [JSON.stringify(old)],
      );
      const db = drizzle(pool, { schema });
      await mergeNewCategories(db, content);
      const row = (
        await pool.query(
          "select title, categories, updated_by from skill_catalogs where domain = 'math' and grade = 'sd12'",
        )
      ).rows[0] as {
        title: string;
        categories: { code: string; title: string; group?: string; mock?: boolean }[];
        updated_by: string;
      };
      expect(row.title).toBe('Math Grade 1-2 (Olimpiade)');
      expect(row.updated_by).not.toBeNull();
      expect(row.categories[0]!.title).toBe('Bilangan (disunting admin)');
      expect(row.categories.map((c) => c.code)).toEqual(content.categories.map((c) => c.code));
      // Mock test pindah ke bagian lombanya (D-076), tetap di akhir.
      expect(row.categories.at(-1)).toMatchObject({ code: 'Y', mock: true, group: mockY.group });
      expect(row.categories.filter((c) => c.group?.startsWith('KMSI') && !c.mock)).toHaveLength(7);
    });

    it('Worksheet lama disunting admin → judul jadi PAUD, materi baru B–E ditambahkan (D-075)', async () => {
      const content = catalogSchema.parse(
        JSON.parse(
          readFileSync(
            join(
              import.meta.dirname,
              '..',
              '..',
              '..',
              'content',
              'skills',
              'worksheet',
              'prek',
              '_catalog.json',
            ),
            'utf8',
          ),
        ),
      );
      const a = {
        ...content.categories[0]!,
        title: 'Angka 1–10 (disunting admin)',
        group: undefined,
      };
      await pool.query(
        `update skill_catalogs set title = 'Worksheet Pra-TK', categories = $1,
           updated_by = (select id from staff_users where role = 'admin' limit 1)
         where domain = 'worksheet' and grade = 'prek'`,
        [JSON.stringify([a])],
      );
      await mergeNewCategories(drizzle(pool, { schema }), content);
      const row = (
        await pool.query(
          "select title, categories from skill_catalogs where domain = 'worksheet' and grade = 'prek'",
        )
      ).rows[0] as { title: string; categories: { code: string; title: string }[] };
      expect(row.title).toBe('Worksheet PAUD');
      expect(row.categories.map((c) => c.code)).toEqual(['A', 'B', 'C', 'D', 'E']);
      expect(row.categories[0]!.title).toBe('Angka 1–10 (disunting admin)');
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

  describe('daftar mandiri anak (D-037)', () => {
    const pin = ['bintang', 'ikan', 'bunga'];
    let code = '';
    let childId = '';

    it('anak daftar sendiri tanpa email → kode keluarga sendiri, bisa masuk lagi', async () => {
      await http()
        .post('/auth/child/register')
        .send({ nickname: 'Raka', momoColor: 'biru', pin, email: 'raka@contoh.id' })
        .expect(400);
      const res = await http()
        .post('/auth/child/register')
        .send({ nickname: 'Raka', momoColor: 'biru', pin })
        .expect(201);
      code = res.body.familyCode;
      childId = res.body.user.id;
      expect(code).toMatch(/^[A-Z2-9]{6}$/);
      const me = await http().get('/auth/me').set(auth(res.body.token)).expect(200);
      expect(me.body).toMatchObject({ role: 'child', selfCode: code, hasParent: false });
      const fam = await http().get(`/auth/family/${code}`).expect(200);
      expect(fam.body).toEqual([
        { id: childId, nickname: 'Raka', momoColor: 'biru', momoLook: null },
      ]);
      await http().post('/auth/child/login').send({ familyCode: code, childId, pin }).expect(200);
      const cols = (await pool.query('select * from children where id = $1', [childId])).rows[0];
      expect(cols.parent_id).toBeNull();
      expect(cols.class_id).toBeNull();
    });

    it('orang tua menautkan dengan kode + sandi gambar anak', async () => {
      const p = await http()
        .post('/auth/parent/register')
        .send({
          name: 'Ayah Raka',
          email: 'mandiri@raka.id',
          password: 'rahasia123',
          consent: true,
        })
        .expect(201);
      await http()
        .post('/parent/children/claim')
        .set(auth(p.body.token))
        .send({ familyCode: code, pin: ['kucing', 'apel', 'bola'] })
        .expect(404);
      const ok = await http()
        .post('/parent/children/claim')
        .set(auth(p.body.token))
        .send({ familyCode: code, pin })
        .expect(201);
      expect(ok.body).toMatchObject({ id: childId, nickname: 'Raka' });
      const list = await http().get('/parent/children').set(auth(p.body.token)).expect(200);
      expect(list.body.map((c: { id: string }) => c.id)).toEqual([childId]);
      // Kode milik anak tetap bisa dipakai masuk.
      await http().post('/auth/child/login').send({ familyCode: code, childId, pin }).expect(200);
      const other = await http()
        .post('/auth/parent/register')
        .send({ name: 'Lain', email: 'lain@raka.id', password: 'rahasia123', consent: true })
        .expect(201);
      await http()
        .post('/parent/children/claim')
        .set(auth(other.body.token))
        .send({ familyCode: code, pin })
        .expect(400);
    });
  });

  describe('paket, transfer manual, buku kas, komisi (D-036)', () => {
    let parentToken = '';
    let childToken = '';
    let packageId = '';
    let methodId = '';
    let orderId = '';
    const pin = ['mobil', 'balon', 'kue'];
    const book = 'math.prek.';
    const lvl = (n: number) => `math.prek.a${n}.`;
    let ids: string[] = [];

    beforeAll(async () => {
      const p = await http()
        .post('/auth/parent/register')
        .send({ name: 'Bunda Sari', email: 'bunda@sari.id', password: 'rahasia123', consent: true })
        .expect(201);
      parentToken = p.body.token;
      const c = await http()
        .post('/parent/children')
        .set(auth(parentToken))
        .send({ nickname: 'Sari', momoColor: 'hijau', pin })
        .expect(201);
      const login = await http()
        .post('/auth/child/login')
        .send({ familyCode: p.body.familyCode, childId: c.body.id, pin })
        .expect(200);
      childToken = login.body.token;
      ids = (
        await pool.query(
          "select id from skills where domain = 'math' and grade = 'prek' and category = 'A' order by \"order\"",
        )
      ).rows.map((r: { id: string }) => r.id);
      expect(ids[0]!.startsWith(lvl(1)) && ids[2]!.startsWith(book)).toBe(true);
    });

    it('admin mengatur paket (harga + diskon) dan rekening; orang tua melihat harga normal & diskon', async () => {
      await http()
        .post('/admin/packages')
        .set(auth(adminToken))
        .send({
          name: 'Diskon kebesaran',
          scope: 'all',
          durationDays: null,
          price: 35_000,
          discountType: 'percent',
          discountValue: 95,
        })
        .expect(400);
      const pkg = await http()
        .post('/admin/packages')
        .set(auth(adminToken))
        .send({
          name: 'Math PAUD selamanya',
          scope: 'books',
          books: [{ domain: 'math', grade: 'prek' }],
          durationDays: null,
          price: 35_000,
          discountType: 'percent',
          discountValue: 20,
        })
        .expect(201);
      packageId = pkg.body.id;
      expect(pkg.body.pricing).toEqual({
        normal: 35_000,
        discount: 7_000,
        final: 28_000,
        discountActive: true,
      });
      const m = await http()
        .post('/admin/payment-methods')
        .set(auth(adminToken))
        .send({
          kind: 'bank',
          provider: 'BCA',
          accountNumber: '123 456 7890',
          accountName: 'PT Cleo Kids',
        })
        .expect(201);
      methodId = m.body.id;
      await http().get('/admin/packages').set(auth(parentToken)).expect(403);
      const ov = await http().get('/parent/billing').set(auth(parentToken)).expect(200);
      expect(ov.body.packages[0]).toMatchObject({
        name: 'Math PAUD selamanya',
        pricing: { normal: 35_000, final: 28_000 },
      });
      expect(ov.body.methods[0]).toMatchObject({ provider: 'BCA', accountNumber: '123 456 7890' });
    });

    it('kunci berbayar: level 1–2 gratis, level 3 ditolak sebelum bayar', async () => {
      await http()
        .put('/admin/billing/settings')
        .set(auth(adminToken))
        .send({ paywall: true, freeLevels: 2, orderExpiryHours: 24, classFullAccess: true })
        .expect(200);
      const cat = await http().get('/catalog').set(auth(childToken)).expect(200);
      expect(cat.body.access).toEqual({ paywall: true, freeLevels: 2, all: false, books: [] });
      const now = Date.now();
      const quiz = (i: number, ts: number) => ({
        id: randomUUID(),
        skillId: ids[i]!,
        correct: 9,
        total: 10,
        ts,
      });
      const q3 = quiz(2, now + 3);
      const res = await http()
        .post('/practice/sync')
        .set(auth(childToken))
        .send({ answers: [], states: [], quizzes: [quiz(0, now + 1), quiz(1, now + 2), q3] })
        .expect(200);
      expect(res.body.rejectedQuizzes).toEqual([q3.id]);
    });

    it('pesanan: total = harga diskon + kode unik ganjil ≤ 499; pesanan sama dipakai ulang; maks 3 terbuka', async () => {
      const m2 = await http()
        .post('/admin/payment-methods')
        .set(auth(adminToken))
        .send({
          kind: 'ewallet',
          provider: 'GoPay',
          accountNumber: '0812 0000 1111',
          accountName: 'Cleo Kids',
        })
        .expect(201);
      const order = (method: string) =>
        http().post('/parent/orders').set(auth(parentToken)).send({ packageId, methodId: method });
      const a = await order(methodId).expect(201);
      // Klik "Beli" lagi untuk paket & rekening yang sama → pesanan yang sama (audit M4).
      const again = await order(methodId).expect(201);
      expect(again.body.id).toBe(a.body.id);
      const b = await order(m2.body.id).expect(201);
      for (const o of [a.body, b.body]) {
        expect(o.status).toBe('awaiting_payment');
        expect(o.uniqueCode).toBeGreaterThanOrEqual(1);
        expect(o.uniqueCode).toBeLessThanOrEqual(499);
        expect(o.amount).toBe(28_000 + o.uniqueCode);
        expect(o.amount % 2).toBe(1);
        expect(o).toMatchObject({ priceNormal: 35_000, discount: 7_000 });
      }
      expect(a.body.methodSnapshot).toMatchObject({ provider: 'BCA', accountName: 'PT Cleo Kids' });
      expect(a.body.amount).not.toBe(b.body.amount);
      orderId = a.body.id;
      await http().post(`/parent/orders/${b.body.id}/cancel`).set(auth(parentToken)).expect(200);
      await http().delete(`/admin/payment-methods/${m2.body.id}`).set(auth(adminToken)).expect(200);
    });

    it('unggah bukti: hanya gambar/PDF (dicek dari isi), lalu menunggu verifikasi', async () => {
      await http()
        .put(`/parent/orders/${orderId}/proof`)
        .set(auth(parentToken))
        .set('Content-Type', 'image/png')
        .send(Buffer.from('<html>bukan gambar</html>'))
        .expect(400);
      const ok = await http()
        .put(`/parent/orders/${orderId}/proof`)
        .set(auth(parentToken))
        .set('Content-Type', 'image/png')
        .send(PNG)
        .expect(200);
      expect(ok.body).toMatchObject({ status: 'awaiting_review', proofMime: 'image/png' });
      const list = await http()
        .get('/admin/orders?status=awaiting_review')
        .set(auth(adminToken))
        .expect(200);
      expect(list.body.map((o: { id: string }) => o.id)).toContain(orderId);
      const proof = await http()
        .get(`/admin/orders/${orderId}/proof`)
        .set(auth(adminToken))
        .expect(200);
      expect(proof.headers['content-type']).toMatch(/image\/png/);
      expect(
        (await http().get('/admin/orders/pending-count').set(auth(adminToken))).body.count,
      ).toBe(1);
    });

    it('admin setuju → lunas, hak akses aktif, pemasukan di buku kas; level 3 terbuka', async () => {
      const ok = await http()
        .post(`/admin/orders/${orderId}/approve`)
        .set(auth(adminToken))
        .expect(200);
      expect(ok.body.status).toBe('paid');
      await http().post(`/admin/orders/${orderId}/approve`).set(auth(adminToken)).expect(409);
      const ov = await http().get('/parent/billing').set(auth(parentToken)).expect(200);
      expect(ov.body.entitlements[0]).toMatchObject({
        name: 'Math PAUD selamanya',
        endsAt: null,
      });
      expect(ov.body.access.books).toEqual(['math/prek']);
      const hist = await http().get('/parent/orders').set(auth(parentToken)).expect(200);
      expect(hist.body.map((o: { status: string }) => o.status).sort()).toEqual([
        'cancelled',
        'paid',
      ]);
      const cash = await http().get('/admin/finance/cash').set(auth(adminToken)).expect(200);
      expect(
        cash.body.entries.filter((e: { orderId: string }) => e.orderId === orderId),
      ).toHaveLength(1);
      expect(cash.body.summary.income).toBe(ok.body.amount);
      const q3 = { id: randomUUID(), skillId: ids[2]!, correct: 9, total: 10, ts: Date.now() };
      const res = await http()
        .post('/practice/sync')
        .set(auth(childToken))
        .send({ answers: [], states: [], quizzes: [q3] })
        .expect(200);
      expect(res.body.rejectedQuizzes).toEqual([]);
    });

    it('harga publik untuk landing: level gratis + paket aktif tanpa login', async () => {
      const res = await http().get('/public/pricing').expect(200);
      expect(res.body).toMatchObject({ paywall: true, freeLevels: 2 });
      expect(res.body.packages[0]).toMatchObject({
        name: 'Math PAUD selamanya',
        pricing: { normal: 35_000, final: 28_000 },
      });
      expect(Object.keys(res.body.packages[0])).not.toContain('sold');
    });

    it('dasbor orang tua (D-038): ringkasan progres anak dari DB dalam satu panggilan', async () => {
      const res = await http().get('/parent/overview').set(auth(parentToken)).expect(200);
      expect(res.body.access.books).toEqual(['math/prek']);
      expect(res.body.children).toHaveLength(1);
      const kid = res.body.children[0];
      expect(kid).toMatchObject({ nickname: 'Sari', momoColor: 'hijau' });
      expect(kid.insights.totals).toMatchObject({ passed: 3, played: 3 });
      expect(kid.insights.week).toHaveLength(7);
      expect(kid.insights.weekRounds).toBe(3);
      expect(kid.insights.books[0]).toMatchObject({ domain: 'math', grade: 'prek', passed: 3 });
      expect(kid.insights.recent[0]).toMatchObject({ score: 90, passed: true });
      expect(kid.insights.next).toMatchObject({ level: 4, paid: false });
      await http().get('/parent/overview').set(auth(childToken)).expect(403);
    });

    it('buku kas + komisi owner: persen dinamis dari laba bersih; bulan ditutup terkunci', async () => {
      await http()
        .post('/admin/finance/owners')
        .set(auth(adminToken))
        .send({ name: 'Owner A', percentBp: 6_000 })
        .expect(201);
      await http()
        .post('/admin/finance/owners')
        .set(auth(adminToken))
        .send({ name: 'Owner B', percentBp: 5_000 })
        .expect(400);
      await http()
        .post('/admin/finance/owners')
        .set(auth(adminToken))
        .send({ name: 'Owner B', percentBp: 2_500 })
        .expect(201);
      // Bulan lalu: pemasukan 1.000.000, pengeluaran 400.000 → laba 600.000.
      const d = new Date();
      const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 15))
        .toISOString()
        .slice(0, 10);
      const month = prev.slice(0, 7);
      await http()
        .post('/admin/finance/cash')
        .set(auth(adminToken))
        .send({ date: prev, type: 'in', category: 'Workshop', amount: 1_000_000 })
        .expect(201);
      const exp = await http()
        .post('/admin/finance/cash')
        .set(auth(adminToken))
        .send({ date: prev, type: 'out', category: 'Server', amount: 400_000 })
        .expect(201);
      const live = await http()
        .get(`/admin/finance/commission?month=${month}`)
        .set(auth(adminToken))
        .expect(200);
      expect(live.body.summary.net).toBe(600_000);
      expect(live.body.shares.map((s: { amount: number }) => s.amount)).toEqual([360_000, 150_000]);
      await http()
        .post(`/admin/finance/commission/${new Date().toISOString().slice(0, 7)}/close`)
        .set(auth(adminToken))
        .expect(400);
      const closed = await http()
        .post(`/admin/finance/commission/${month}/close`)
        .set(auth(adminToken))
        .expect(201);
      expect(closed.body).toHaveLength(2);
      await http().delete(`/admin/finance/cash/${exp.body.id}`).set(auth(adminToken)).expect(409);
      const paid = await http()
        .post(`/admin/finance/commission/payouts/${closed.body[0].id}/paid`)
        .set(auth(adminToken))
        .send({ paid: true })
        .expect(200);
      expect(paid.body.paidAt).not.toBeNull();
      const year = await http()
        .get(`/admin/finance/summary?year=${month.slice(0, 4)}`)
        .set(auth(adminToken))
        .expect(200);
      expect(year.body.months.find((m: { month: string }) => m.month === month)).toMatchObject({
        net: 600_000,
      });
      // Kembalikan pengaturan agar test lain tidak terpengaruh.
      await pool.query(
        "update app_settings set value = jsonb_set(value, '{paywall}', 'false') where key = 'billing'",
      );
    });
  });

  describe('suara Momo (D-035)', () => {
    it('manifest kalimat → admin membuat klip sekali → klip di-cache selamanya', async () => {
      const before = await http().get('/voice/lines').expect(200);
      expect(before.body.enabled).toBe(true);
      expect(Object.keys(before.body.lines)).toHaveLength(44);
      expect(before.body.lines.vo_cmd_pick_one).toMatchObject({ clip: null });
      await http()
        .post('/admin/voice/generate')
        .set(auth(adminToken))
        .expect(200, { total: 44, created: 44, failed: 0, skipped: 0 });
      const calls = ttsCalls.length;
      await http()
        .post('/admin/voice/generate')
        .set(auth(adminToken))
        .expect(200, { total: 44, created: 0, failed: 0, skipped: 44 });
      expect(ttsCalls.length).toBe(calls); // tidak dibuat ulang
      const after = await http().get('/voice/lines').expect(200);
      const key = after.body.lines.vo_cmd_pick_one.clip;
      const clip = await http().get(`/voice/clip/${key}`).expect(200);
      expect(clip.headers['content-type']).toBe('audio/mpeg');
      expect(clip.headers['cache-control']).toMatch(/immutable/);
      await http()
        .get(`/voice/clip/${'0'.repeat(64)}`)
        .expect(404);
    });

    it('soal Basic dibuatkan suara on-demand; soal kelas 1+ tidak (hanya perintah)', async () => {
      const basic = await http()
        .get('/voice/item/math.prek.a1.kenali-angka-1-sampai-2?seed=5&band=0')
        .expect(200);
      expect(basic.headers['content-type']).toBe('audio/mpeg');
      const n = ttsCalls.length;
      await http()
        .get('/voice/item/math.prek.a1.kenali-angka-1-sampai-2?seed=5&band=0')
        .expect(200);
      expect(ttsCalls.length).toBe(n);
      const [g1] = (await pool.query("select id from skills where grade = 'sd1' limit 1")).rows;
      await http().get(`/voice/item/${g1.id}?seed=5&band=0`).expect(404);
    });

    it('English PAUD: narasi Bahasa Indonesia, kartu kata dengan suara English (D-062)', async () => {
      const [en] = (
        await pool.query(
          "select id, template from skills where domain = 'english' and grade = 'prek' order by id limit 1",
        )
      ).rows;
      // Narasi soal: Indonesia (id-ID) dengan arahan melafalkan kata Inggris dengan jelas.
      let n = ttsCalls.length;
      await http().get(`/voice/item/${en.id}?seed=7&band=0`).expect(200);
      expect(ttsCalls.length).toBe(n + 1);
      expect(ttsLangs.at(-1)).toBe('id-ID');
      expect(ttsStyles.at(-1)).toMatch(/British English/);
      // Kartu pilihan: kata English (en-GB) dari teks kartu di soal itu, dipilih dengan id kartu.
      const template = skillTemplateSchema.parse(en.template);
      const cardOf = (seed: number) =>
        (
          generateItem(template, { seed, band: 0 }).interaction as {
            choices?: { id: string; say?: string }[];
          }
        ).choices?.find((c) => c.say);
      const seed = Array.from({ length: 200 }, (_, k) => k).find((k) => cardOf(k))!;
      const card = cardOf(seed)!;
      n = ttsCalls.length;
      await http()
        .get(`/voice/item/${en.id}?seed=${seed}&band=0&part=choice&c=${card.id}`)
        .expect(200);
      expect(ttsCalls.at(-1)).toBe(card.say);
      expect(ttsLangs.at(-1)).toBe('en-GB');
      expect(ttsStyles.at(-1)).toMatch(/female/);
      // Kartu tanpa teks / id tidak ada → 404; kartu buku lain tidak dibuatkan suara.
      await http().get(`/voice/item/${en.id}?seed=7&band=0&part=choice&c=zz`).expect(404);
      await http()
        .get('/voice/item/math.prek.a1.kenali-angka-1-sampai-2?seed=5&band=0&part=choice&c=c0')
        .expect(404);
    });

    it('admin: ubah kalimat & pengaturan suara; bukan admin ditolak', async () => {
      await http()
        .put('/admin/voice/lines')
        .set(auth(adminToken))
        .send({ lines: { vo_right_1: 'Tepat sekali! Kamu teliti!' } })
        .expect(200);
      const lines = await http().get('/voice/lines').expect(200);
      expect(lines.body.lines.vo_right_1).toEqual({
        text: 'Tepat sekali! Kamu teliti!',
        clip: null,
      });
      const ov = await http().get('/admin/voice').set(auth(adminToken)).expect(200);
      expect(ov.body).toMatchObject({ providerReady: true, settings: { voice: 'Leda' } });
      await http()
        .put('/admin/voice/settings')
        .set(auth(adminToken))
        .send({ ...ov.body.settings, voice: 'Achird' })
        .expect(200);
      expect((await http().get('/voice/lines')).body.rev).not.toBe(lines.body.rev);
      await http().post('/admin/voice/generate').expect(401);
    });
  });

  describe('keamanan (audit D-040)', () => {
    const pin = ['kue', 'balon', 'mobil'];
    const wrong = ['kucing', 'kucing', 'kucing'];

    it('header keamanan; tanpa X-Powered-By; badan biner hanya di route bukti transfer', async () => {
      const res = await http().get('/health').expect(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-powered-by']).toBeUndefined();
      await http()
        .post('/auth/staff/login')
        .set('Content-Type', 'image/png')
        .send(Buffer.alloc(1000))
        .expect(415);
    });

    it('email: dirapikan & ketat; login tidak membedakan huruf besar/kecil; duplikat ditolak', async () => {
      await http()
        .post('/auth/parent/register')
        .send({ name: 'X', email: 'a@b', password: 'rahasia123', consent: true })
        .expect(400);
      await http()
        .post('/auth/parent/register')
        .send({
          name: 'X',
          email: `${'a'.repeat(250)}@x.id`,
          password: 'rahasia123',
          consent: true,
        })
        .expect(400);
      await http()
        .post('/auth/parent/register')
        .send({
          name: 'Kasus',
          email: '  Ibu.Kasus@Contoh.ID ',
          password: 'rahasia123',
          consent: true,
        })
        .expect(201);
      const [row] = (await pool.query("select email from parents where name = 'Kasus'")).rows;
      expect(row.email).toBe('ibu.kasus@contoh.id');
      await http()
        .post('/auth/parent/login')
        .send({ email: 'IBU.KASUS@contoh.id', password: 'rahasia123' })
        .expect(200);
      await http()
        .post('/auth/parent/register')
        .send({ name: 'Lagi', email: 'ibu.kasus@CONTOH.id', password: 'rahasia123', consent: true })
        .expect(409);
      await http()
        .post('/auth/parent/login')
        .send({ email: 'tidak.ada@contoh.id', password: 'rahasia123' })
        .expect(401);
    });

    it('token akun yang dinonaktifkan langsung ditolak; admin tidak bisa mengubah peran/status sendiri', async () => {
      await http()
        .post('/admin/staff')
        .set(auth(adminToken))
        .send({
          email: 'guru.audit@cleo.id',
          name: 'Guru Audit',
          role: 'facilitator',
          password: 'rahasia123',
        })
        .expect(201);
      const login = await http()
        .post('/auth/staff/login')
        .send({ email: 'guru.audit@cleo.id', password: 'rahasia123' })
        .expect(200);
      const fac = login.body.token;
      await http().get('/classes').set(auth(fac)).expect(200);
      await http()
        .patch(`/admin/staff/${login.body.user.id}`)
        .set(auth(adminToken))
        .send({ active: false })
        .expect(200);
      await http().get('/classes').set(auth(fac)).expect(401);
      const me = (await http().get('/auth/me').set(auth(adminToken))).body;
      await http()
        .patch(`/admin/staff/${me.id}`)
        .set(auth(adminToken))
        .send({ role: 'facilitator' })
        .expect(400);
    });

    it('sandi gambar: kunci bertingkat (1 → 5 menit); klaim orang tua ikut menghitung', async () => {
      const reg = await http()
        .post('/auth/child/register')
        .send({ nickname: 'Tegar', momoColor: 'biru', pin })
        .expect(201);
      const childId = reg.body.user.id;
      const familyCode = reg.body.familyCode;
      const tryLogin = (p: string[]) =>
        http().post('/auth/child/login').send({ familyCode, childId, pin: p });
      for (let i = 0; i < 5; i++) await tryLogin(wrong).expect(401);
      const first = await tryLogin(pin).expect(429);
      const firstMs = Date.parse(first.body.lockedUntil) - Date.now();
      expect(firstMs).toBeGreaterThan(30_000);
      expect(firstMs).toBeLessThanOrEqual(60_000);
      await pool.query(
        "update children set pin_locked_until = now() - interval '1 second' where id = $1",
        [childId],
      );
      // Percobaan klaim orang tua yang salah juga dihitung pada anak ini.
      const parent = await http()
        .post('/auth/parent/register')
        .send({
          name: 'Penebak',
          email: 'penebak@contoh.id',
          password: 'rahasia123',
          consent: true,
        })
        .expect(201);
      for (let i = 0; i < 5; i++)
        await http()
          .post('/parent/children/claim')
          .set(auth(parent.body.token))
          .send({ familyCode, pin: wrong })
          .expect(404);
      const second = await tryLogin(pin).expect(429);
      expect(Date.parse(second.body.lockedUntil) - Date.now()).toBeGreaterThan(4 * 60_000);
      await pool.query(
        "update children set pin_locked_until = now() - interval '1 second' where id = $1",
        [childId],
      );
      await tryLogin(pin).expect(200);
      const [c] = (await pool.query('select pin_lock_count from children where id = $1', [childId]))
        .rows;
      expect(c.pin_lock_count).toBe(0);
    });

    it('guru tidak bisa mengganti sandi gambar anak milik orang tua', async () => {
      await http()
        .post('/admin/staff')
        .set(auth(adminToken))
        .send({
          email: 'guru.dua@cleo.id',
          name: 'Guru Dua',
          role: 'facilitator',
          password: 'rahasia123',
        })
        .expect(201);
      const fac = (
        await http()
          .post('/auth/staff/login')
          .send({ email: 'guru.dua@cleo.id', password: 'rahasia123' })
      ).body.token;
      const cls = await http()
        .post('/classes')
        .set(auth(fac))
        .send({ eventName: 'Kelas Audit' })
        .expect(201);
      const parent = await http()
        .post('/auth/parent/register')
        .send({
          name: 'Bunda Audit',
          email: 'bunda.audit@contoh.id',
          password: 'rahasia123',
          consent: true,
        })
        .expect(201);
      const kid = await http()
        .post('/parent/children')
        .set(auth(parent.body.token))
        .send({ nickname: 'Nara', momoColor: 'ungu', pin, classCode: cls.body.code })
        .expect(201);
      await http()
        .post(`/classes/${cls.body.id}/students/${kid.body.id}/pin`)
        .set(auth(fac))
        .expect(403);
    });

    it('katalog: level berbayar yang belum dibeli dikirim tanpa isi soal', async () => {
      await pool.query(
        "update app_settings set value = jsonb_set(value, '{paywall}', 'true') where key = 'billing'",
      );
      const reg = await http()
        .post('/auth/child/register')
        .send({ nickname: 'Sinta', momoColor: 'hijau', pin })
        .expect(201);
      const cat = await http().get('/catalog').set(auth(reg.body.token)).expect(200);
      const lvl3 = cat.body.skills.find((s: { order: number }) => s.order === 3);
      const lvl1 = cat.body.skills.find((s: { order: number }) => s.order === 1);
      expect(lvl3).toMatchObject({ stub: true, params: {} });
      expect(lvl1.stub).toBeUndefined();
      await pool.query(
        "update app_settings set value = jsonb_set(value, '{paywall}', 'false') where key = 'billing'",
      );
    });

    it('poin ronde (D-078): skor dari poin soal; poin tidak masuk akal ditolak', async () => {
      const skillId = 'math.prek.a1.kenali-angka-1-sampai-2';
      const reg = await http()
        .post('/auth/child/register')
        .send({ nickname: 'Poin', momoColor: 'hijau', pin })
        .expect(201);
      const childToken = reg.body.token as string;
      // 8 soal benar, 3 di antaranya setelah keliru sekali (5 poin) → 65 poin → skor 65, belum lulus.
      const ok = {
        id: randomUUID(),
        skillId,
        correct: 8,
        total: 10,
        roundPoints: 65,
        ts: Date.now() + 10,
      };
      const res = await http()
        .post('/practice/sync')
        .set(auth(childToken))
        .send({ answers: [], states: [], quizzes: [ok] })
        .expect(200);
      expect(res.body.rejectedQuizzes ?? []).toEqual([]);
      expect(res.body.quizzes[skillId]).toMatchObject({ last: 65 });
      // 8 benar tidak mungkin 95 poin (maks. 80).
      const bad = {
        id: randomUUID(),
        skillId,
        correct: 8,
        total: 10,
        roundPoints: 95,
        ts: Date.now() + 20,
      };
      const rej = await http()
        .post('/practice/sync')
        .set(auth(childToken))
        .send({ answers: [], states: [], quizzes: [bad] })
        .expect(200);
      expect(rej.body.rejectedQuizzes).toEqual([bad.id]);
    });

    it('sync: state Skor Jago untuk skill yang tidak ada diabaikan', async () => {
      const reg = await http()
        .post('/auth/child/register')
        .send({ nickname: 'Bayu', momoColor: 'kuning', pin })
        .expect(201);
      await http()
        .post('/practice/sync')
        .set(auth(reg.body.token))
        .send({
          answers: [],
          states: [{ skillId: 'math.prek.zz9.tidak-ada', state: initialJago() }],
        })
        .expect(200);
      const rows = (
        await pool.query('select * from skill_mastery where child_id = $1', [reg.body.user.id])
      ).rows;
      expect(rows).toHaveLength(0);
    });
  });

  describe('Premium dari admin & direktori pengguna (D-041)', () => {
    const pin = ['ikan', 'bola', 'kue'];

    it('admin memberi Premium ke anak mandiri: semua level terbuka, tanpa pesanan & tanpa buku kas', async () => {
      await pool.query(
        "update app_settings set value = jsonb_set(value, '{paywall}', 'true') where key = 'billing'",
      );
      const reg = await http()
        .post('/auth/child/register')
        .send({ nickname: 'Gilang', momoColor: 'biru', pin })
        .expect(201);
      const childId = reg.body.user.id;
      const before = await http().get('/catalog').set(auth(reg.body.token)).expect(200);
      expect(before.body.access.all).toBe(false);
      const cash0 = Number((await pool.query('select count(*) n from cash_entries')).rows[0].n);
      const orders0 = Number((await pool.query('select count(*) n from orders')).rows[0].n);

      await http()
        .post('/admin/premium')
        .set(auth(reg.body.token))
        .send({ childId, durationDays: null })
        .expect(403);
      const grant = await http()
        .post('/admin/premium')
        .set(auth(adminToken))
        .send({ childId, durationDays: 30, note: 'Beasiswa' })
        .expect(201);
      expect(grant.body).toMatchObject({
        source: 'admin',
        scope: 'all',
        childId,
        note: 'Beasiswa',
        live: true,
      });

      const after = await http().get('/catalog').set(auth(reg.body.token)).expect(200);
      expect(after.body.access.all).toBe(true);
      expect(after.body.skills.some((x: { stub?: boolean }) => x.stub)).toBe(false);
      expect(Number((await pool.query('select count(*) n from cash_entries')).rows[0].n)).toBe(
        cash0,
      );
      expect(Number((await pool.query('select count(*) n from orders')).rows[0].n)).toBe(orders0);

      const list = await http()
        .get('/admin/directory/children?type=self&status=premium&search=gilang')
        .set(auth(adminToken))
        .expect(200);
      expect(list.body.total).toBe(1);
      expect(list.body.items[0]).toMatchObject({
        nickname: 'Gilang',
        type: 'self',
        plan: { tier: 'premium', source: 'admin' },
      });

      await http().delete(`/admin/premium/${grant.body.id}`).set(auth(adminToken)).expect(200);
      const revoked = await http().get('/catalog').set(auth(reg.body.token)).expect(200);
      expect(revoked.body.access.all).toBe(false);
      const free = await http()
        .get('/admin/directory/children?search=gilang')
        .set(auth(adminToken))
        .expect(200);
      expect(free.body.items[0].plan.tier).toBe('free');
      await pool.query(
        "update app_settings set value = jsonb_set(value, '{paywall}', 'false') where key = 'billing'",
      );
    });

    it('Premium per anak di keluarga: saudaranya tetap Free; Premium sekeluarga ditolak', async () => {
      const p = await http()
        .post('/auth/parent/register')
        .send({
          name: 'Keluarga Premium',
          email: 'premium@contoh.id',
          password: 'rahasia123',
          consent: true,
        })
        .expect(201);
      const ayu = await http()
        .post('/parent/children')
        .set(auth(p.body.token))
        .send({ nickname: 'Ayu', momoColor: 'ungu', pin })
        .expect(201);
      await http()
        .post('/parent/children')
        .set(auth(p.body.token))
        .send({ nickname: 'Bagas', momoColor: 'biru', pin })
        .expect(201);
      const fam = (
        await http().get('/admin/directory/families?search=premium@contoh').set(auth(adminToken))
      ).body;
      // Premium dari admin hanya per anak.
      await http()
        .post('/admin/premium')
        .set(auth(adminToken))
        .send({ parentId: fam.items[0].id, durationDays: null })
        .expect(400);
      await http()
        .post('/admin/premium')
        .set(auth(adminToken))
        .send({ childId: ayu.body.id, durationDays: null })
        .expect(201);
      await http()
        .post('/admin/premium')
        .set(auth(adminToken))
        .send({ childId: ayu.body.id, durationDays: 30 })
        .expect(400); // sudah selamanya
      const after = (
        await http()
          .get('/admin/directory/families?status=premium&search=premium@contoh')
          .set(auth(adminToken))
      ).body;
      expect(after.items[0]).toMatchObject({ premiumChildren: 1, plan: { tier: 'free' } });
      const byName = Object.fromEntries(
        after.items[0].children.map((c: { nickname: string; plan: { tier: string } }) => [
          c.nickname,
          c.plan.tier,
        ]),
      );
      expect(byName).toEqual({ Ayu: 'premium', Bagas: 'free' });
      const ov = await http().get('/parent/overview').set(auth(p.body.token)).expect(200);
      expect(
        Object.fromEntries(
          ov.body.children.map((c: { nickname: string; plan: { tier: string } }) => [
            c.nickname,
            c.plan.tier,
          ]),
        ),
      ).toEqual({ Ayu: 'premium', Bagas: 'free' });
      const [bought] = (
        await pool.query("select id from entitlements where source = 'purchase' limit 1")
      ).rows;
      if (bought)
        await http().delete(`/admin/premium/${bought.id}`).set(auth(adminToken)).expect(400);
      await http()
        .post('/admin/premium')
        .set(auth(adminToken))
        .send({ durationDays: null })
        .expect(400);
    });

    it('direktori: paging, ringkasan, dan filter', async () => {
      const page1 = await http()
        .get('/admin/directory/children?pageSize=10&page=1&sort=name')
        .set(auth(adminToken))
        .expect(200);
      expect(page1.body.items.length).toBeLessThanOrEqual(10);
      expect(page1.body.total).toBeGreaterThan(3);
      const names = page1.body.items.map((x: { nickname: string }) => x.nickname.toLowerCase());
      expect([...names].sort()).toEqual(names);
      await http().get('/admin/directory/children?pageSize=7').set(auth(adminToken)).expect(400);
      const sum = await http().get('/admin/directory/summary').set(auth(adminToken)).expect(200);
      expect(sum.body).toMatchObject({
        premiumSelf: expect.any(Number),
        selfChildren: expect.any(Number),
      });
      expect(sum.body.premiumChildren).toBeGreaterThanOrEqual(1);
      const inactive = await http()
        .get('/admin/directory/families?active=inactive')
        .set(auth(adminToken))
        .expect(200);
      expect(inactive.body.items.every((x: { active: boolean }) => !x.active)).toBe(true);
    });
  });
});
