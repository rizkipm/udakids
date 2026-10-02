import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HealthController } from '../src/health/health.controller.js';
import { PG_POOL } from '../src/db/db.module.js';

let url = '';

async function createApp(query: () => Promise<unknown>) {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [{ provide: PG_POOL, useValue: { query } }],
  }).compile();
  const app = moduleRef.createNestApplication();
  // Port tetap di 127.0.0.1 agar request tidak nyasar ke server test lain (lihat e2e-setup.ts).
  await app.listen(0, '127.0.0.1');
  url = (await app.getUrl()).replace('[::1]', '127.0.0.1').replace('localhost', '127.0.0.1');
  return app;
}

describe('GET /health', () => {
  let app: INestApplication | undefined;
  afterEach(async () => app?.close());

  it('melaporkan db up saat query berhasil', async () => {
    app = await createApp(vi.fn().mockResolvedValue({ rows: [] }));
    const res = await request(url).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
    expect(res.body.engine).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('tetap 200 dengan db down saat Postgres tidak tersedia', async () => {
    app = await createApp(vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const res = await request(url).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'down' });
  });
});
