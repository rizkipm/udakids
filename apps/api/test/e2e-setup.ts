import 'reflect-metadata';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import request from 'supertest';
import * as schema from '../src/db/schema.js';
import { seed } from '../scripts/seed.js';
import { configureApp } from '../src/common/app-setup.js';
import { TTS_PROVIDER } from '../src/voice/tts.provider.js';
import { MAIL_TRANSPORT, type MailTransport } from '../src/mail/mail.service.js';

/** Database test tersedia? (test e2e dilewati bila Postgres tidak jalan). */
export async function dbAvailable(url: string) {
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 1500 });
  try {
    await pool.query('select 1');
    return true;
  } catch {
    return false;
  } finally {
    await pool.end();
  }
}

/**
 * Siapkan API e2e di database test SENDIRI (`url`): kosongkan, migrasi, seed, lalu login admin.
 * Tiap file test memakai database berbeda agar bisa berjalan paralel.
 */
export async function startApp(
  url: string,
  opts: { paywall?: boolean; mail?: MailTransport | null } = {},
) {
  process.env.DATABASE_URL = url;
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  await pool.query(
    'drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;',
  );
  await migrate(db, { migrationsFolder: join(import.meta.dirname, '..', 'drizzle') });
  await seed(db, { log: () => {} });
  await pool.query("insert into app_settings (key, value) values ('billing', $1)", [
    JSON.stringify({
      paywall: opts.paywall ?? false,
      freeLevels: 2,
      orderExpiryHours: 24,
      classFullAccess: true,
    }),
  ]);
  const { AppModule } = await import('../src/app.module.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(TTS_PROVIDER)
    .useValue(null)
    .overrideProvider(MAIL_TRANSPORT)
    .useValue(opts.mail ?? null)
    .compile();
  const app: INestApplication = configureApp(
    moduleRef.createNestApplication<NestExpressApplication>(),
  );
  // Dengarkan di 127.0.0.1 dengan satu port tetap: supertest dengan server yang belum listen membuka port
  // acak per request (bisa di IPv6) lalu menyambung ke 127.0.0.1 — saat banyak proses test berjalan,
  // request bisa nyasar ke server test lain (data tercampur / 404 acak).
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const http = () => request(base.replace('[::1]', '127.0.0.1').replace('localhost', '127.0.0.1'));
  const login = await http()
    .post('/auth/staff/login')
    .send({ email: 'admin@littlecoder.local', password: 'admin12345' });
  const adminToken = login.body.token as string;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  /** Buat anak yang daftar sendiri dan kembalikan token + id-nya. */
  const newChild = async (nickname: string, pin = ['kucing', 'apel', 'bola']) => {
    const r = await http().post('/auth/child/register').send({ nickname, momoColor: 'biru', pin });
    return {
      token: r.body.token as string,
      id: r.body.user.id as string,
      familyCode: r.body.familyCode as string,
    };
  };
  return {
    app,
    pool,
    db,
    http,
    auth,
    adminToken,
    newChild,
    close: async () => {
      await app.close();
      await pool.end();
    },
  };
}
