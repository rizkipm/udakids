/**
 * pnpm db:restore <file> [--yes] — pulihkan cadangan `db:backup` ke DATABASE_URL (mis. server baru).
 * MENIMPA isi database tujuan (--clean). Setelah itu jalankan `pnpm db:migrate` (migrasi yang lebih baru)
 * lalu `pnpm db:seed` (menambah konten baru dari content/ tanpa menimpa suntingan admin).
 */
import '../src/common/env.js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { databaseUrl, pgTool, run, safeUrl } from './pg-tools.js';

async function main() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!arg) throw new Error('Pakai: pnpm db:restore <file.dump> [--yes]');
  // pnpm --filter menjalankan skrip di apps/api; path relatif dibaca dari folder asal perintah.
  const file = resolve(process.env.INIT_CWD ?? process.cwd(), arg);
  if (!existsSync(file)) throw new Error(`File tidak ditemukan: ${file}`);
  const url = databaseUrl();
  if (!process.argv.includes('--yes')) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ok = await rl.question(
      `Isi ${safeUrl(url)} akan DITIMPA oleh ${file}. Ketik "ya" untuk lanjut: `,
    );
    rl.close();
    if (ok.trim().toLowerCase() !== 'ya') return console.log('Dibatalkan.');
  }
  run(pgTool('pg_restore'), [
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
    '--single-transaction',
    `--dbname=${url}`,
    file,
  ]);
  console.log('Pulih. Lanjutkan: pnpm db:migrate && pnpm db:seed');
}

main().catch((e: unknown) => {
  console.error((e as Error).message);
  process.exit(1);
});
