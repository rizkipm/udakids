import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HealthController } from '../src/health/health.controller.js';
import { PG_POOL } from '../src/db/db.module.js';

async function createApp(query: () => Promise<unknown>) {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [{ provide: PG_POOL, useValue: { query } }],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('GET /health', () => {
  let app: INestApplication | undefined;
  afterEach(async () => app?.close());

  it('melaporkan db up saat query berhasil', async () => {
    app = await createApp(vi.fn().mockResolvedValue({ rows: [] }));
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
    expect(res.body.engine).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('tetap 200 dengan db down saat Postgres tidak tersedia', async () => {
    app = await createApp(vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'down' });
  });
});
