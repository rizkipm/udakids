import { Controller, Get, Inject } from '@nestjs/common';
import { ENGINE_VERSION } from '@little-coder/engine';
import type { Pool } from 'pg';
import { Public } from '../auth/decorators.js';
import { PG_POOL } from '../db/db.module.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pick<Pool, 'query'>) {}

  @Public()
  @Get()
  async check() {
    let db: 'up' | 'down' = 'up';
    try {
      await this.pool.query('select 1');
    } catch {
      db = 'down';
    }
    return { status: 'ok', db, engine: ENGINE_VERSION };
  }
}
