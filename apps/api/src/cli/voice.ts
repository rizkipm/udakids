/**
 * Buat semua klip suara Momo (perintah soal + respons jawaban, D-035) yang belum ada:
 *   pnpm voice:generate            (dev)
 *   node dist/cli/voice.js         (server)
 * Butuh GOOGLE_TTS_API_KEY di .env. Klip disimpan di PostgreSQL (voice_clips) dan tidak dibuat ulang.
 */
import '../common/env.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DEFAULT_DATABASE_URL } from '../common/config.js';
import * as schema from '../db/schema.js';
import { SettingsService } from '../settings/settings.service.js';
import { ttsFromEnv } from '../voice/tts.provider.js';
import { VoiceService } from '../voice/voice.service.js';

export async function generateVoice(url = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL) {
  const pool = new Pool({ connectionString: url });
  try {
    const db = drizzle(pool, { schema });
    // Kunci dari .env, atau (bila kosong) API key yang diisi admin di Admin → Suara Momo.
    const voice = new VoiceService(db, new SettingsService(db), ttsFromEnv());
    if (!(await voice.isReady()))
      throw new Error('API key suara belum ada (.env GOOGLE_TTS_API_KEY atau Admin → Suara Momo).');
    return await voice.generateLines();
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
