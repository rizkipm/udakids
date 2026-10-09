/**
 * Buat klip suara Momo (Chirp 3 HD) yang belum ada:
 *   pnpm voice:generate                         kalimat Momo (perintah & respons, D-035)
 *   pnpm voice:generate -- --all --dry-run      hitung semua kalimat aplikasi yang belum bersuara + jumlah huruf
 *   pnpm voice:generate -- --all [--max=5000] [--parallel=5] [--gap=2000]   buat lebih dulu (D-091): teks
 *                                               antarmuka anak + semua pelajaran (kuota Google ±200/menit)
 *   node dist/cli/voice.js [--all …]            (server)
 * Butuh API key suara (.env GOOGLE_TTS_API_KEY atau Admin → Suara Momo). Klip disimpan di PostgreSQL
 * (voice_clips) dan tidak dibuat ulang. Batas harian `TTS_DAILY_LIMIT` tetap berlaku (naikkan sementara bila perlu).
 */
import '../common/env.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DEFAULT_DATABASE_URL } from '../common/config.js';
import * as schema from '../db/schema.js';
import { SettingsService } from '../settings/settings.service.js';
import { ttsFromEnv } from '../voice/tts.provider.js';
import { VoiceService } from '../voice/voice.service.js';

const arg = (name: string) =>
  process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));

export async function generateVoice(url = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL) {
  const pool = new Pool({ connectionString: url });
  try {
    const db = drizzle(pool, { schema });
    // Kunci dari .env, atau (bila kosong) API key yang diisi admin di Admin → Suara Momo.
    const voice = new VoiceService(db, new SettingsService(db), ttsFromEnv());
    if (!(await voice.isReady()))
      throw new Error('API key suara belum ada (.env GOOGLE_TTS_API_KEY atau Admin → Suara Momo).');
    const lines = await voice.generateLines();
    if (!arg('all')) return lines;
    const max = arg('max')?.split('=')[1];
    const all = await voice.generateAll({
      dryRun: !!arg('dry-run'),
      ...(max && { max: Number(max) }),
      ...(arg('parallel') && { parallel: Number(arg('parallel')!.split('=')[1]) }),
      ...(arg('gap') && { gapMs: Number(arg('gap')!.split('=')[1]) }),
      onProgress: (n, total, _created, failed) =>
        console.log(`  ${n}/${total} dibuat, ${failed} menunggu dicoba lagi`),
    });
    console.log(
      `Semua kalimat aplikasi: ${all.total} kalimat, ${all.missing} belum bersuara (±${all.chars.toLocaleString('id-ID')} huruf)` +
        (arg('dry-run')
          ? ' — dry run, tidak ada yang dibuat.'
          : `, ${all.created} dibuat, ${all.failed} gagal.`),
    );
    return lines;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  generateVoice()
    .then((r) =>
      console.log(
        `Suara Momo: ${r.created} dibuat, ${r.skipped} sudah ada, ${r.failed} gagal (dari ${r.total} kalimat).`,
      ),
    )
    .catch((err: unknown) => {
      console.error((err as Error).message);
      process.exit(1);
    });
}
