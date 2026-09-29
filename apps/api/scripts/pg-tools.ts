import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DEFAULT_DATABASE_URL } from '../src/common/config.js';

/** Lokasi pg_dump / pg_restore: PG_BIN, lalu PATH, lalu Postgres.app (macOS). */
export function pgTool(name: 'pg_dump' | 'pg_restore' | 'psql'): string {
  const candidates = [
    process.env.PG_BIN && join(process.env.PG_BIN, name),
    '/Applications/Postgres.app/Contents/Versions/latest/bin/' + name,
  ].filter(Boolean) as string[];
  const onPath = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], {
    encoding: 'utf8',
  });
  if (onPath.status === 0) return onPath.stdout.trim().split('\n')[0]!;
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error(`${name} tidak ditemukan. Pasang PostgreSQL client atau set PG_BIN.`);
  return found;
}

export const databaseUrl = () => process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

/** URL tanpa password untuk dicetak ke layar. */
export const safeUrl = (url: string) => url.replace(/\/\/([^:/@]+):[^@]*@/, '//$1:***@');

export function run(cmd: string, args: string[]) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} gagal (kode ${r.status})`);
}
