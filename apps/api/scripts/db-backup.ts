/**
 * pnpm db:backup [file] — cadangkan SELURUH database (skema + semua data: akun, anak, progres, skill yang
 * diedit admin, riwayat migrasi Drizzle) ke satu file format custom pg_dump.
 * Bawaan: backups/littlecoder-<tanggal>.dump (folder backups/ tidak masuk git; berisi data pribadi).
 */
import '../src/common/env.js';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { databaseUrl, pgTool, run, safeUrl } from './pg-tools.js';

const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
const root = resolve(__dirname, '..', '..', '..');
const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const file = arg
  ? resolve(process.env.INIT_CWD ?? process.cwd(), arg)
  : join(root, 'backups', `littlecoder-${stamp}.dump`);
mkdirSync(dirname(file), { recursive: true });
const url = databaseUrl();
console.log(`Mencadangkan ${safeUrl(url)} → ${file}`);
run(pgTool('pg_dump'), ['--format=custom', '--no-owner', '--no-privileges', `--file=${file}`, url]);
console.log('Selesai. Simpan file ini dengan aman: berisi data orang tua & anak (UU PDP).');
