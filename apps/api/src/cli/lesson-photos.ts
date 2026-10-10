/**
 * Foto realistis untuk simulasi pelajaran SD (`peraga`, D-093):
 *   pnpm lesson:photos -- math sd1 sains sd1 --dry-run   hitung foto yang belum ada
 *   pnpm lesson:photos -- math sd1 sains sd1              Pexels dulu, yang tidak ketemu dibuat AI Gambar (D-117)
 *   pnpm lesson:photos -- math sd1 --max=20               coba sebagian dulu
 *   pnpm lesson:photos -- math sd1 --tanpa-ai             hanya Pexels (yang tidak ketemu tetap gambar cadangan)
 *   pnpm lesson:photos -- math sd1 --ai                   langsung AI Gambar untuk semua foto yang belum ada
 *   node dist/cli/lesson-photos.js math sd1 …             (server)
 * Bawaan (D-095): foto stok GRATIS dari Pexels (PEXELS_API_KEY). Tiap kandidat dilihat Claude (cocok dengan
 * label, pantas untuk anak, tanpa tulisan/logo); yang pertama lolos diunduh, disimpan di gudang `ai_images`
 * (model `pexels`, biaya 0, kredit fotografer di kolom prompt) dan langsung disetujui. Tidak ada yang lolos →
 * dibuat dengan AI Gambar (D-117); tanpa kunci AI Gambar / `--tanpa-ai` → tetap gambar cadangan SVG. Subjek yang
 * sudah punya foto disetujui dilewati; subjek yang fotonya pernah DITOLAK admin tidak dicari/dibuat ulang.
 * AI Gambar memakai layanan Admin → AI Gambar (batas biaya, audit, sidik jari); foto baru disetujui lewat
 * `setStatus`, kecuali subjek yang pernah ditolak admin.
 */
import '../common/env.js';
import {
  bookLabSchema,
  catalogSchema,
  labPhotos,
  lessonPhotos,
  lessonSchema,
  materiSchema,
  type AiImageRequest,
  type PeragaPhoto,
} from '@little-coder/engine';
import { createHash } from 'node:crypto';
import { claudeCost } from '@little-coder/engine';
import { and, eq, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AiImageService } from '../ai/ai-image.service.js';
import { DEFAULT_DATABASE_URL } from '../common/config.js';
import * as schema from '../db/schema.js';
import { open, type Sealed } from '../common/secret-box.js';
import { aiImages, aiUsage, appSettings, skillCatalogs, staffUsers } from '../db/schema.js';
import { CLAUDE_KEY_SETTING } from '../ai/ai-image.service.js';
import { ClaudePhotoScreener, type PhotoScreener } from '../photos/photo-screen.js';
import { PexelsClient, pexelsCredit, pexelsQueries, type PexelsPhoto } from '../photos/pexels.js';
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

/** Kunci Claude: `.env` (ANTHROPIC_API_KEY) lebih dulu, lalu kunci yang diisi admin (terenkripsi). */
async function loadClaudeKey(db: ReturnType<typeof drizzle<typeof schema>>) {
  const env = process.env.ANTHROPIC_API_KEY?.trim();
  if (env) return env;
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, CLAUDE_KEY_SETTING));
  return open((row?.value as Sealed | undefined) ?? null);
}

/** Paling banyak sekian kandidat yang dilihat Claude per foto (menjaga biaya). */
export const MAX_SCREENED = 6;

/**
 * Cari satu foto Pexels yang lolos penyaringan Claude (D-095): kata kunci English lebih dulu lalu dipersempit,
 * kandidat dilihat berurutan sampai ada yang cocok, pantas untuk anak, dan tanpa tulisan/logo.
 */
export async function findStockPhoto(
  f: PeragaPhoto,
  pexels: Pick<PexelsClient, 'search'>,
  screener: PhotoScreener,
  onVerdict: (v: Awaited<ReturnType<PhotoScreener['check']>>, p: PexelsPhoto) => Promise<void>,
): Promise<{ photo: PexelsPhoto; query: string } | null> {
  const seen = new Set<number>();
  for (const query of pexelsQueries(f.label, f.en)) {
    for (const photo of await pexels.search(query, 4)) {
      if (seen.has(photo.id)) continue;
      if (seen.size >= MAX_SCREENED) return null;
      seen.add(photo.id);
      const verdict = await screener.check(photo.small, f.label, f.en);
      await onVerdict(verdict, photo);
      if (verdict.ok) return { photo, query };
    }
  }
  return null;
}

async function main(
  books: [string, string][],
  dryRun: boolean,
  mode: 'pexels' | 'ai' | 'pexels-only',
  max = Infinity,
) {
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
      const parsed = catalogSchema.safeParse({
        domain,
        grade,
        title: row.title,
        categories: row.categories,
        ...(row.lab ? { lab: row.lab } : {}),
      });
      if (parsed.success) {
        // Foto simulasi `peraga` dan infografis (D-101), Materi Topik & Lab Buku (D-109).
        for (const c of parsed.data.categories) {
          if (c.lesson) for (const f of lessonPhotos(c.lesson)) photos.set(f.id, f);
          if (c.materi) for (const f of labPhotos(c.materi)) photos.set(f.id, f);
        }
        if (parsed.data.lab) for (const f of labPhotos(parsed.data.lab)) photos.set(f.id, f);
        continue;
      }
      // Katalog di DB tidak lolos skema (mis. pelajaran lama): ambil per bagian, lewati yang rusak.
      console.warn(
        `Peringatan: katalog ${domain}/${grade} di database tidak lolos skema; dibaca per bagian.`,
      );
      const take = (what: string, fn: () => PeragaPhoto[]) => {
        try {
          for (const f of fn()) photos.set(f.id, f);
        } catch {
          console.warn(`  dilewati: ${what}`);
        }
      };
      for (const raw of row.categories as { code: string; lesson?: unknown; materi?: unknown }[]) {
        if (raw.lesson)
          take(`${raw.code} pelajaran`, () => lessonPhotos(lessonSchema.parse(raw.lesson)));
        if (raw.materi) take(`${raw.code} materi`, () => labPhotos(materiSchema.parse(raw.materi)));
      }
      if (row.lab) take('Lab Buku', () => labPhotos(bookLabSchema.parse(row.lab)));
    }
    const [admin] = await db.select().from(staffUsers).where(eq(staffUsers.role, 'admin')).limit(1);
    if (!admin) throw new Error('Belum ada akun admin');
    const settings = new SettingsService(db);
    const s = await settings.get('ai_image');
    const have = await db
      .select({ subject: aiImages.subject, status: aiImages.status, model: aiImages.model })
      .from(aiImages);
    const approved = new Set(have.filter((h) => h.status === 'approved').map((h) => h.subject));
    // Foto yang belum punya gambar disetujui: hanya ini yang dicari di Pexels / dibuat AI.
    let aiTodo = [...photos.values()].filter((f) => !approved.has(f.id));
    if (mode !== 'ai') {
      const pexelsKey = process.env.PEXELS_API_KEY?.trim();
      if (!pexelsKey) throw new Error('PEXELS_API_KEY belum diisi di .env');
      const claudeKey = await loadClaudeKey(db);
      if (!claudeKey)
        throw new Error(
          'Kunci Claude belum ada (Admin → AI Gambar, atau ANTHROPIC_API_KEY di .env)',
        );
      const rejected = new Set(
        have.filter((h) => h.status === 'rejected' && h.model === 'pexels').map((h) => h.subject),
      );
      const missing = [...photos.values()].filter(
        (f) => !approved.has(f.id) && !rejected.has(f.id),
      );
      const todo = missing.slice(0, max);
      console.log(
        `${photos.size} foto simulasi di ${books.map((b) => b.join('/')).join(', ')}: ` +
          `${photos.size - missing.length} sudah ada/ditolak admin, ${missing.length} belum ada, ` +
          `${todo.length} dicari sekarang di Pexels (gratis; penyaringan Claude ±US$0,003 per kandidat).`,
      );
      if (dryRun && mode === 'pexels-only') return;
      const pexels = new PexelsClient(pexelsKey, fetch, undefined, (m) => console.log(m));
      const screener = new ClaudePhotoScreener(claudeKey, s.claudeModel);
      let found = 0;
      let missed = 0;
      let failed = 0;
      let usd = 0;
      const missedPhotos: PeragaPhoto[] = [];
      for (const f of dryRun ? [] : todo) {
        if (usd >= s.dailyLimitUsd) {
          console.warn(`Berhenti: biaya penyaringan mencapai batas harian US$${s.dailyLimitUsd}.`);
          break;
        }
        try {
          const hit = await findStockPhoto(f, pexels, screener, async (verdict, p) => {
            const cost = claudeCost(s, verdict.usage);
            usd += cost;
            await db.insert(aiUsage).values({
              action: 'photo-screen',
              ok: verdict.ok,
              model: s.claudeModel,
              costUsd: cost,
              inputTokens:
                verdict.usage.input + verdict.usage.cachedRead + verdict.usage.cacheWrite,
              cachedTokens: verdict.usage.cachedRead,
              outputTokens: verdict.usage.output,
              detail: `pexels#${p.id}:${f.id} ${verdict.reason}`.slice(0, 500),
              createdBy: admin.id,
            });
          });
          if (!hit) {
            missed++;
            missedPhotos.push(f);
            console.log(`kosong ${f.id} (tidak ada foto Pexels yang cocok)`);
            continue;
          }
          const file = await pexels.download(hit.photo.large);
          await db
            .insert(aiImages)
            .values({
              fingerprint: createHash('sha256')
                .update(`pexels|${f.id}|${hit.photo.id}`)
                .digest('hex'),
              kind: peragaPhotoRequest(f).kind,
              subject: f.id,
              label: f.label,
              labelEn: f.en ?? null,
              variant: 1,
              prompt: pexelsCredit(hit.photo, hit.query),
              model: 'pexels',
              quality: 'stok',
              size: `${hit.photo.width}x${hit.photo.height}`,
              status: 'approved',
              mime: file.mime,
              data: file.data,
              bytes: file.data.length,
              costUsd: 0,
              createdBy: admin.id,
              reviewedBy: admin.id,
              reviewedAt: new Date(),
            })
            .onConflictDoNothing();
          found++;
          console.log(`foto   ${f.id} ← Pexels #${hit.photo.id} (${hit.photo.photographer})`);
        } catch (err) {
          failed++;
          console.warn(`gagal  ${f.id}: ${(err as Error).message.slice(0, 160)}`);
          if (/ditolak|401|403/.test((err as Error).message)) break;
        }
      }
      if (!dryRun)
        console.log(
          `Pexels: ${found} foto disetujui, ${missed} tanpa foto cocok, ${failed} gagal, ` +
            `biaya penyaringan Claude ±US$${usd.toFixed(2)}.`,
        );
      if (mode === 'pexels-only') return;
      // Lanjut AI Gambar hanya untuk yang tidak ketemu di Pexels (dry-run: perkiraan untuk semua yang belum ada).
      aiTodo = dryRun ? todo : missedPhotos;
    }

    const ai = new AiImageService(db, settings, new MailService(db), null);
    const status = await ai.overview();
    if (mode === 'ai') aiTodo = aiTodo.slice(0, max);
    console.log(
      `AI Gambar: ${aiTodo.length} foto belum ada. ` +
        `Perkiraan biaya per foto baru US$${status.estimate.toFixed(3)} ` +
        `(±US$${(aiTodo.length * status.estimate).toFixed(2)}).`,
    );
    if (!status.ready) {
      console.warn(
        'Kunci AI Gambar belum ada (OPENAI_API_KEY di .env atau Admin → AI Gambar): ' +
          'foto yang belum ada tetap memakai gambar cadangan SVG.',
      );
      return;
    }
    if (dryRun) return;
    let made = 0;
    let reused = 0;
    let approvedNow = 0;
    let cost = 0;
    let failed = 0;
    let streak = 0;
    for (const f of aiTodo) {
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
            approvedNow++;
          }
        }
        console.log(`${res.reused ? 'ada   ' : 'dibuat'} ${f.id}`);
        streak = 0;
      } catch (err) {
        failed++;
        streak++;
        console.warn(`gagal  ${f.id}: ${(err as Error).message.slice(0, 160)}`);
        // Batas biaya / kuota tercapai: berhenti, jalankan lagi nanti (yang sudah ada dilewati).
        if (/batas|limit|429|dinonaktifkan/i.test((err as Error).message)) break;
        // Gagal beruntun (mis. pengaturan AI Gambar tidak didukung model): berhenti, perbaiki pengaturan dulu.
        if (streak >= 3) {
          console.warn('Berhenti: 3 foto gagal beruntun. Periksa pengaturan di Admin → AI Gambar.');
          break;
        }
      }
    }
    console.log(
      `AI Gambar: ${made} foto baru, ${reused} sudah ada, ${approvedNow} disetujui otomatis, ${failed} gagal, ` +
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
    console.error(
      'Pakai: pnpm lesson:photos -- <domain> <grade> [<domain> <grade> …] [--dry-run] [--ai | --tanpa-ai]',
    );
    process.exit(1);
  }
  const max = Number(args.find((a) => a.startsWith('--max='))?.slice(6)) || Infinity;
  const mode = args.includes('--ai')
    ? 'ai'
    : args.includes('--tanpa-ai')
      ? 'pexels-only'
      : 'pexels';
  main(books, dryRun, mode, max).catch((err: unknown) => {
    console.error((err as Error).message);
    process.exit(1);
  });
}
