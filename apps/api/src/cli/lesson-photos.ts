/**
 * Buat foto realistis untuk simulasi pelajaran SD (`peraga`, D-093) lewat AI Gambar, lalu setujui otomatis:
 *   pnpm lesson:photos -- math sd1 sains sd1 --dry-run   hitung foto yang belum ada + perkiraan biaya
 *   pnpm lesson:photos -- math sd1 sains sd1              buat & setujui
 *   node dist/cli/lesson-photos.js math sd1 …             (server)
 * Memakai layanan yang sama dengan Admin → AI Gambar (kunci admin terenkripsi, batas biaya harian/bulanan, audit,
 * sidik jari): foto yang sudah ada dipakai ulang tanpa biaya. Foto baru langsung disetujui (keputusan pemilik
 * produk, D-093) lewat `setStatus` — tercatat di audit dan tetap bisa ditolak admin. Subjek yang pernah DITOLAK
 * admin tidak disetujui ulang (tetap menunggu review).
 */
import '../common/env.js';
import {
  catalogSchema,
  peragaPhotos,
  type AiImageRequest,
  type PeragaPhoto,
} from '@little-coder/engine';
import { and, eq, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AiImageService } from '../ai/ai-image.service.js';
import { DEFAULT_DATABASE_URL } from '../common/config.js';
import * as schema from '../db/schema.js';
import { aiUsage, skillCatalogs, staffUsers } from '../db/schema.js';
import { MailService } from '../mail/mail.service.js';
import { SettingsService } from '../settings/settings.service.js';

/** Permintaan AI Gambar untuk satu foto simulasi (gaya foto realistis). */
export const peragaPhotoRequest = (f: PeragaPhoto): AiImageRequest => ({
  kind: /\b(anak|orang|keluarga|guru|petani|sedang)\b/i.test(f.label) ? 'scene' : 'object',
  subject: f.id,
  label: f.label,
  ...(f.en && { labelEn: f.en }),
  variant: 1,
  withMomo: false,
  style: 'foto',
});

async function main(books: [string, string][], dryRun: boolean) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL });
  try {
    const db = drizzle(pool, { schema });
    const photos = new Map<string, PeragaPhoto>();
    for (const [domain, grade] of books) {
      const [row] = await db
        .select()
        .from(skillCatalogs)
        .where(and(eq(skillCatalogs.domain, domain), eq(skillCatalogs.grade, grade)));
      if (!row)
        throw new Error(`Buku ${domain}/${grade} tidak ada di database (jalankan seed dulu)`);
      const cat = catalogSchema.parse({
        domain,
        grade,
        title: row.title,
        categories: row.categories,
      });
      for (const c of cat.categories)
        for (const s of c.lesson?.layar ?? [])
          if (s.peraga) for (const f of peragaPhotos(s.peraga)) photos.set(f.id, f);
    }
    const [admin] = await db.select().from(staffUsers).where(eq(staffUsers.role, 'admin')).limit(1);
    if (!admin) throw new Error('Belum ada akun admin');
    const ai = new AiImageService(db, new SettingsService(db), new MailService(db), null);
    const status = await ai.overview();
    console.log(
      `${photos.size} foto simulasi di ${books.map((b) => b.join('/')).join(', ')}. ` +
        `Perkiraan biaya per foto baru US$${status.estimate.toFixed(3)}.`,
    );
    if (dryRun) return;
    let made = 0;
    let reused = 0;
    let approved = 0;
    let cost = 0;
    let failed = 0;
    for (const f of photos.values()) {
      try {
        const res = await ai.generate(peragaPhotoRequest(f), admin.id);
        if (res.reused) reused++;
        else made++;
        cost += res.costUsd;
        if (res.image.status === 'review') {
          // Hormati penolakan admin: subjek yang pernah ditolak tidak disetujui otomatis.
          const [rejected] = await db
            .select({ id: aiUsage.id })
            .from(aiUsage)
            .where(and(eq(aiUsage.action, 'review-rejected'), like(aiUsage.detail, `%:${f.id}`)))
            .limit(1);
          if (!rejected) {
            await ai.setStatus(res.image.id, 'approved', admin.id);
            approved++;
          }
        }
        console.log(`${res.reused ? 'ada   ' : 'dibuat'} ${f.id}`);
      } catch (err) {
        failed++;
        console.warn(`gagal  ${f.id}: ${(err as Error).message.slice(0, 160)}`);
        // Batas biaya / kuota tercapai: berhenti, jalankan lagi nanti (yang sudah ada dilewati).
        if (/batas|limit|429|dinonaktifkan/i.test((err as Error).message)) break;
      }
    }
    console.log(
      `Selesai: ${made} foto baru, ${reused} sudah ada, ${approved} disetujui otomatis, ${failed} gagal, ` +
        `biaya ±US$${cost.toFixed(2)}.`,
    );
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2).filter((x) => x !== '--');
  const dryRun = args.includes('--dry-run');
  const words = args.filter((a) => !a.startsWith('--'));
  const books: [string, string][] = [];
  for (let i = 0; i + 1 < words.length; i += 2) books.push([words[i]!, words[i + 1]!]);
  if (!books.length) {
    console.error('Pakai: pnpm lesson:photos -- <domain> <grade> [<domain> <grade> …] [--dry-run]');
    process.exit(1);
  }
  main(books, dryRun).catch((err: unknown) => {
    console.error((err as Error).message);
    process.exit(1);
  });
}
