import { Global, Module, type OnApplicationShutdown, Inject } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DEFAULT_DATABASE_URL } from '../common/config.js';
import * as schema from './schema.js';

export const PG_POOL = Symbol('PG_POOL');
export const DB = Symbol('DB');
export type Db = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      // Pool terhubung secara lazy, jadi API tetap bisa start walau Postgres belum jalan.
      useFactory: () =>
        new Pool({
          connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
        }),
    },
    { provide: DB, inject: [PG_POOL], useFactory: (pool: Pool): Db => drizzle(pool, { schema }) },
  ],
  exports: [PG_POOL, DB],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
