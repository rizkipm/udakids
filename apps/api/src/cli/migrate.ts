/**
 * Terapkan migrasi SQL (apps/api/drizzle/) ke DATABASE_URL tanpa drizzle-kit — untuk server produksi:
 *   node dist/cli/migrate.js
 * Idempoten: migrasi yang sudah tercatat di drizzle.__drizzle_migrations dilewati.
 */
import '../common/env.js';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { DEFAULT_DATABASE_URL } from '../common/config.js';

export const MIGRATIONS_DIR = join(__dirname, '..', '..', 'drizzle');

export async function runMigrations(url = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL) {
  const pool = new Pool({ connectionString: url });
  try {
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_DIR });
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => console.log('Migrasi database selesai.'))
    .catch((err: unknown) => {
      console.error(err);
      process.exit(1);
    });
}
