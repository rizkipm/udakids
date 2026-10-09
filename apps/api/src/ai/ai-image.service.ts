import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AI_STYLE_GUIDE,
  AI_STYLE_VERSION,
  composeImagePrompt,
  aiStyleGuideFor,
  estimateImageCost,
  textCost,
  claudeCost,
  type AiImageRequest,
  type AiImageSettings,
  type AiImageStatus,
} from '@little-coder/engine';
import { and, desc, eq, gte, ne, sql, type SQL } from 'drizzle-orm';
import { open, seal, type Sealed } from '../common/secret-box.js';
import { verifySecret } from '../common/crypto.js';
import { DB, type Db } from '../db/db.module.js';
import { aiImages, aiUsage, appSettings, staffUsers } from '../db/schema.js';
import { MailService } from '../mail/mail.service.js';
import { aiNotice } from '../mail/templates.js';
import { SettingsService } from '../settings/settings.service.js';
import { IMAGE_PROVIDER, OpenAiImages, type ImageProviderFactory } from './openai.provider.js';
import {
  ClaudePromptWriter,
  PROMPT_WRITER,
  safeClaudeError,
  type PromptWriterFactory,
} from './claude.provider.js';

/** Baris app_settings untuk API key OpenAI (terenkripsi AES-256-GCM, D-043/D-068). */
export const AI_KEY_SETTING = 'ai_key';
/** Kunci Claude untuk penulis prompt (D-092), terenkripsi seperti kunci OpenAI. */
export const CLAUDE_KEY_SETTING = 'ai_claude_key';
const MOMO_SENTENCE =
  'Include Momo, the small friendly robot from the reference image, unchanged in shape and colors.';
/** Subjek karakter Momo — gambar referensinya dipakai ulang untuk semua adegan bersama Momo. */
export const MOMO_SUBJECT = 'momo';

const imageView = (r: typeof aiImages.$inferSelect) => ({
  id: r.id,
  kind: r.kind,
  subject: r.subject,
  label: r.label,
  labelEn: r.labelEn,
  theme: r.theme,
  variant: r.variant,
  model: r.model,
  quality: r.quality,
  size: r.size,
  status: r.status as AiImageStatus,
  bytes: r.bytes,
  costUsd: r.costUsd,
  createdAt: r.createdAt.toISOString(),
  reviewedAt: r.reviewedAt?.toISOString() ?? null,
});
export type AiImageView = ReturnType<typeof imageView>;

/** Awal hari & bulan di WIB (batas biaya mengikuti kalender Indonesia). */
const startOf = (unit: 'day' | 'month'): SQL =>
  sql`(date_trunc(${unit}, now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta')`;

/**
 * AI Gambar (D-068): gambar aset dibuat SEKALI di admin, disimpan di PostgreSQL, lalu dipakai ulang.
 * - Sidik jari permintaan → tidak pernah membayar dua kali untuk gambar yang sama.
 * - Batas biaya harian/bulanan ditegakkan di sini (bukan hanya di OpenAI).
 * - API key: hanya admin, tulis saja (yang tampil hanya 4 huruf terakhir), terenkripsi, butuh sandi admin,
 *   setiap penggantian dicatat di `ai_usage` dan dikirim ke email direksi.
 * - Prompt disusun server dari data kamus + panduan gaya; anak tidak pernah memicu AI.
 */
@Injectable()
export class AiImageService {
  private readonly log = new Logger('AiImage');
  private readonly inflight = new Map<string, Promise<unknown>>();
  private cachedKey?: { at: number; key: string | null; info: Sealed | null };

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: SettingsService,
    private readonly mail: MailService,
    @Optional() @Inject(IMAGE_PROVIDER) private readonly factory: ImageProviderFactory | null,
    @Optional()
    @Inject(PROMPT_WRITER)
    private readonly writerFactory: PromptWriterFactory | null = null,
  ) {}

  // ------------------------------------------------------------------ kunci Claude (D-092)

  private cachedClaude?: { at: number; key: string | null; info: Sealed | null };

  private async loadClaudeKey() {
    if (this.cachedClaude && Date.now() - this.cachedClaude.at < 30_000) return this.cachedClaude;
    const [row] = await this.db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, CLAUDE_KEY_SETTING));
    const info = (row?.value as Sealed | undefined) ?? null;
    this.cachedClaude = { at: Date.now(), key: open(info), info };
    return this.cachedClaude;
  }

  /** Kunci Claude aktif: `.env` (ANTHROPIC_API_KEY) lebih dulu, lalu kunci dari admin. */
  private async claudeKey(): Promise<string | null> {
    const env = process.env.ANTHROPIC_API_KEY?.trim();
    if (env) return env;
    return (await this.loadClaudeKey()).key;
  }

  private async promptWriter() {
    const key = await this.claudeKey();
    if (!key) return null;
    return this.writerFactory ? this.writerFactory(key) : new ClaudePromptWriter(key);
  }

  async claudeKeyInfo() {
    if (process.env.ANTHROPIC_API_KEY?.trim())
      return { source: 'env' as const, last4: null, updatedAt: null, unreadable: false };
    const { key, info } = await this.loadClaudeKey();
    if (key && info)
      return {
        source: 'admin' as const,
        last4: info.last4,
        updatedAt: info.updatedAt,
        unreadable: false,
      };
    return { source: null, last4: null, updatedAt: null, unreadable: !!info && !key };
  }

  async setClaudeKey(apiKey: string, userId: string) {
    const value = seal(apiKey);
    await this.db
      .insert(appSettings)
      .values({ key: CLAUDE_KEY_SETTING, value, updatedBy: userId })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedBy: userId, updatedAt: new Date() },
      });
    this.cachedClaude = undefined;
    await this.audit('claude-key-set', userId, { detail: `…${value.last4}` });
    await this.notify('kunci Claude diganti', userId, `Kunci baru berakhiran …${value.last4}.`);
  }

  async clearClaudeKey(userId: string) {
    await this.db.delete(appSettings).where(eq(appSettings.key, CLAUDE_KEY_SETTING));
    this.cachedClaude = undefined;
    await this.audit('claude-key-clear', userId);
    await this.notify(
      'kunci Claude dihapus',
      userId,
      'Prompt gambar kembali memakai prompt bawaan.',
    );
  }

  async testClaudeKey(): Promise<{ ok: boolean; message: string }> {
    const writer = await this.promptWriter();
    if (!writer) return { ok: false, message: 'Belum ada API key Claude' };
    const s = await this.settings.get('ai_image');
    try {
      return { ok: true, message: await writer.test(s.claudeModel) };
    } catch (err) {
      return { ok: false, message: safeClaudeError(err) };
    }
  }

  /**
   * Prompt gambar: ditulis Claude bila diaktifkan (D-092), selain itu prompt bawaan. Bila Claude gagal atau
   * menolak, prompt bawaan tetap dipakai (gambar tetap bisa dibuat) dan kegagalannya dicatat.
   */
  private async imagePrompt(r: AiImageRequest, s: AiImageSettings, userId: string) {
    const base = composeImagePrompt(r);
    if (s.promptWriter !== 'claude') return { prompt: base, claudeUsd: 0 };
    const writer = await this.promptWriter();
    if (!writer) return { prompt: base, claudeUsd: 0 };
    try {
      const out = await writer.write(r, aiStyleGuideFor(r), s.claudeModel);
      const usd = claudeCost(s, out.usage);
      await this.audit('prompt', userId, {
        model: s.claudeModel,
        costUsd: usd,
        inputTokens: out.usage.input + out.usage.cachedRead + out.usage.cacheWrite,
        cachedTokens: out.usage.cachedRead,
        outputTokens: out.usage.output,
        detail: `${r.kind}:${r.subject}#${r.variant}`,
      });
      return { prompt: r.withMomo ? `${out.prompt} ${MOMO_SENTENCE}` : out.prompt, claudeUsd: usd };
    } catch (err) {
      const message = safeClaudeError(err);
      this.log.warn(`prompt Claude ${r.subject} gagal, pakai prompt bawaan: ${message}`);
      await this.db.insert(aiUsage).values({
        action: 'prompt',
        ok: false,
        createdBy: userId,
        model: s.claudeModel,
        detail: message,
      });
      return { prompt: base, claudeUsd: 0 };
    }
  }

  // ------------------------------------------------------------------ kunci

  private async loadKey() {
    if (this.cachedKey && Date.now() - this.cachedKey.at < 30_000) return this.cachedKey;
    const [row] = await this.db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, AI_KEY_SETTING));
    const info = (row?.value as Sealed | undefined) ?? null;
    this.cachedKey = { at: Date.now(), key: open(info), info };
    return this.cachedKey;
  }

  /** Kunci aktif: `.env` (OPENAI_API_KEY) lebih dulu, lalu kunci dari admin. */
  private async apiKey(): Promise<string | null> {
    const env = process.env.OPENAI_API_KEY?.trim();
    if (env) return env;
    return (await this.loadKey()).key;
  }

  private async provider() {
    const key = await this.apiKey();
    if (!key) return null;
    return this.factory ? this.factory(key) : new OpenAiImages(key);
  }

  /** Info kunci untuk admin — TIDAK PERNAH berisi kunci itu sendiri. */
  async keyInfo() {
    if (process.env.OPENAI_API_KEY?.trim())
      return { source: 'env' as const, last4: null, updatedAt: null, unreadable: false };
    const { key, info } = await this.loadKey();
    if (key && info)
      return {
        source: 'admin' as const,
        last4: info.last4,
        updatedAt: info.updatedAt,
        unreadable: false,
      };
    return { source: null, last4: null, updatedAt: null, unreadable: !!info && !key };
  }

  /** Sandi admin wajib untuk tindakan sensitif (ganti kunci, ubah batas biaya). */
  async confirmPassword(userId: string, password: string) {
    const [u] = await this.db
      .select({ hash: staffUsers.passwordHash, role: staffUsers.role, active: staffUsers.active })
      .from(staffUsers)
      .where(eq(staffUsers.id, userId));
    if (!u || u.role !== 'admin' || !u.active || !(await verifySecret(password, u.hash)))
      throw new ForbiddenException('Sandi admin tidak cocok');
  }

  private async staffName(userId: string) {
    const [u] = await this.db
      .select({ name: staffUsers.name, email: staffUsers.email })
      .from(staffUsers)
      .where(eq(staffUsers.id, userId));
    return u ? `${u.name} (${u.email})` : 'admin';
  }

  private async audit(
    action: string,
    userId: string | null,
    extra: Partial<typeof aiUsage.$inferInsert> = {},
  ) {
    await this.db.insert(aiUsage).values({ action, ok: true, createdBy: userId, ...extra });
  }

  private async notify(title: string, userId: string, detail: string) {
    try {
      await this.mail.notifyDirector(
        aiNotice(this.mail.ctx(), { title, by: await this.staffName(userId), detail }),
        { kind: 'ai-notice' },
      );
    } catch (err) {
      this.log.warn(`email pemberitahuan AI gagal: ${(err as Error).message}`);
    }
  }

  async setKey(apiKey: string, userId: string) {
    const value = seal(apiKey);
    await this.db
      .insert(appSettings)
      .values({ key: AI_KEY_SETTING, value, updatedBy: userId })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedBy: userId, updatedAt: new Date() },
      });
    this.cachedKey = undefined;
    await this.audit('key-set', userId, { detail: `…${value.last4}` });
    await this.notify('kunci API diganti', userId, `Kunci baru berakhiran …${value.last4}.`);
  }

  async clearKey(userId: string) {
    await this.db.delete(appSettings).where(eq(appSettings.key, AI_KEY_SETTING));
    this.cachedKey = undefined;
    await this.audit('key-clear', userId);
    await this.notify('kunci API dihapus', userId, 'Pembuatan gambar AI tidak bisa dipakai lagi.');
  }

  async testKey(): Promise<{ ok: boolean; message: string }> {
    const provider = await this.provider();
    if (!provider) return { ok: false, message: 'Belum ada API key' };
    const s = await this.settings.get('ai_image');
    try {
      return {
        ok: true,
        message: await provider.test(s.mode === 'responses' ? s.textModel : s.imageModel),
      };
    } catch (err) {
      return { ok: false, message: (err as Error).message.slice(0, 240) };
    }
  }

  async saveSettings(next: AiImageSettings, userId: string) {
    const prev = await this.settings.get('ai_image');
    const saved = await this.settings.set('ai_image', next, userId);
    await this.audit('settings', userId, {
      detail: `mode=${next.mode} teks=${next.textModel} gambar=${next.imageModel} kualitas=${next.quality} batas=${next.dailyLimitUsd}/${next.monthlyLimitUsd} aktif=${next.enabled}`,
    });
    if (
      next.dailyLimitUsd > prev.dailyLimitUsd ||
      next.monthlyLimitUsd > prev.monthlyLimitUsd ||
      next.enabled !== prev.enabled
    )
      await this.notify(
        'pengaturan biaya diubah',
        userId,
        `Batas harian US$${next.dailyLimitUsd}, bulanan US$${next.monthlyLimitUsd}, aktif: ${next.enabled ? 'ya' : 'tidak'}.`,
      );
    return saved;
  }

  // ------------------------------------------------------------------ biaya

  async spent() {
    const sum = async (from: SQL) => {
      const [r] = await this.db
        .select({ usd: sql<number>`coalesce(sum(${aiUsage.costUsd}), 0)::float8` })
        .from(aiUsage)
        .where(gte(aiUsage.createdAt, from));
      return Number(r?.usd ?? 0);
    };
    const [today, month] = await Promise.all([sum(startOf('day')), sum(startOf('month'))]);
    return { today, month };
  }

  async overview() {
    const [settings, key, spent, counts, recent, momo] = await Promise.all([
      this.settings.get('ai_image'),
      this.keyInfo(),
      this.spent(),
      this.db
        .select({ status: aiImages.status, n: sql<number>`count(*)::int` })
        .from(aiImages)
        .groupBy(aiImages.status),
      this.db
        .select({
          action: aiUsage.action,
          model: aiUsage.model,
          costUsd: aiUsage.costUsd,
          ok: aiUsage.ok,
          detail: aiUsage.detail,
          inputTokens: aiUsage.inputTokens,
          cachedTokens: aiUsage.cachedTokens,
          outputTokens: aiUsage.outputTokens,
          createdAt: aiUsage.createdAt,
        })
        .from(aiUsage)
        .orderBy(desc(aiUsage.createdAt))
        .limit(20),
      this.momoReference(),
    ]);
    return {
      settings,
      key,
      ready: !!(await this.apiKey()),
      spent,
      estimate: estimateImageCost(settings),
      images: Object.fromEntries(counts.map((c) => [c.status, c.n])),
      momoReady: !!momo,
      // Penulis prompt Claude (D-092): info kunci (tanpa kunci itu sendiri) & siap dipakai.
      claudeKey: await this.claudeKeyInfo(),
      claudeReady: !!(await this.claudeKey()),
      styleGuide: AI_STYLE_GUIDE,
      recent: recent.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    };
  }

  private async assertBudget(s: AiImageSettings, estimate: number) {
    const { today, month } = await this.spent();
    if (today + estimate > s.dailyLimitUsd)
      throw new HttpException(
        `Batas biaya harian tercapai (US$${today.toFixed(3)} dari US$${s.dailyLimitUsd}).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    if (month + estimate > s.monthlyLimitUsd)
      throw new HttpException(
        `Batas biaya bulanan tercapai (US$${month.toFixed(3)} dari US$${s.monthlyLimitUsd}).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
  }

  // ------------------------------------------------------------------ gambar

  private async momoReference() {
    const [row] = await this.db
      .select({
        id: aiImages.id,
        mime: aiImages.mime,
        data: aiImages.data,
        fingerprint: aiImages.fingerprint,
      })
      .from(aiImages)
      .where(
        and(
          eq(aiImages.kind, 'character'),
          eq(aiImages.subject, MOMO_SUBJECT),
          eq(aiImages.status, 'approved'),
        ),
      )
      .orderBy(aiImages.variant)
      .limit(1);
    return row ?? null;
  }

  /**
   * Sidik jari: semua hal yang memengaruhi hasil gambar. Permintaan sama = gambar sama (dipakai ulang dari
   * database tanpa memanggil Claude maupun OpenAI). Penulis prompt (Claude/bawaan, D-092) sengaja TIDAK ikut,
   * supaya mengaktifkan Claude tidak membuat ulang gambar yang sudah ada.
   */
  static fingerprint(r: AiImageRequest, s: AiImageSettings, referenceFp: string | null) {
    const model = s.mode === 'responses' ? `${s.textModel}+${s.imageModel}` : s.imageModel;
    return createHash('sha256')
      .update(
        [
          AI_STYLE_VERSION,
          r.kind,
          r.subject,
          r.label,
          r.labelEn ?? '',
          r.theme ?? '',
          r.note ?? '',
          r.variant,
          // Gaya foto (D-088) ikut sidik jari; gaya ilustrasi tidak ditambahkan agar sidik jari lama tetap.
          ...(r.style === 'foto' ? ['foto'] : []),
          s.mode,
          model,
          s.quality,
          s.size,
          s.background,
          referenceFp ?? '',
        ].join('|'),
      )
      .digest('hex');
  }

  /**
   * Buat gambar — atau pakai yang sudah ada bila sidik jarinya sama. Gambar yang pernah ditolak dengan
   * permintaan yang sama dibuat ulang (menimpa baris itu).
   */
  async generate(r: AiImageRequest, userId: string) {
    const s = await this.settings.get('ai_image');
    if (!s.enabled) throw new ServiceUnavailableException('AI Gambar sedang dinonaktifkan admin');
    if (r.withMomo && s.mode !== 'responses')
      throw new BadRequestException('Gambar bersama Momo butuh mode responses');
    if (r.kind === 'character' && r.withMomo)
      throw new BadRequestException('Karakter referensi tidak memakai referensi lain');
    const ref = r.withMomo ? await this.momoReference() : null;
    if (r.withMomo && !ref)
      throw new BadRequestException('Buat dan setujui gambar karakter Momo (subjek "momo") dulu');

    const fp = AiImageService.fingerprint(r, s, ref?.fingerprint ?? null);
    const [existing] = await this.db.select().from(aiImages).where(eq(aiImages.fingerprint, fp));
    if (existing && existing.status !== 'rejected')
      return { reused: true, costUsd: 0, image: imageView(existing) };

    const running = this.inflight.get(fp);
    if (running) return running as ReturnType<AiImageService['create']>;
    const job = this.create(r, s, fp, ref, existing?.id ?? null, userId).finally(() =>
      this.inflight.delete(fp),
    );
    this.inflight.set(fp, job);
    return job;
  }

  private async create(
    r: AiImageRequest,
    s: AiImageSettings,
    fp: string,
    ref: { id: string; mime: string; data: Buffer } | null,
    replaceId: string | null,
    userId: string,
  ) {
    const provider = await this.provider();
    if (!provider) throw new ServiceUnavailableException('API key OpenAI belum diisi');
    const estimate = estimateImageCost(s);
    await this.assertBudget(s, estimate);
    const { prompt, claudeUsd } = await this.imagePrompt(r, s, userId);
    const model = s.mode === 'responses' ? `${s.textModel}+${s.imageModel}` : s.imageModel;
    let out;
    try {
      out = await provider.generate({
        prompt,
        styleGuide: aiStyleGuideFor(r),
        settings: s,
        ...(ref && { reference: { mime: ref.mime, data: ref.data } }),
      });
    } catch (err) {
      const message = (err as Error).message.slice(0, 240);
      await this.audit('generate', userId, { model, ok: false, detail: message });
      this.log.warn(`generate ${r.subject} gagal: ${message}`);
      throw new HttpException(`Gambar gagal dibuat: ${message}`, HttpStatus.BAD_GATEWAY);
    }
    const imagePrice =
      s.quality === 'low'
        ? s.price.imageLow
        : s.quality === 'medium'
          ? s.price.imageMedium
          : s.price.imageHigh;
    // Biaya prompt Claude dicatat di baris audit "prompt"; biaya gambar = gambar + teks OpenAI.
    const cost = imagePrice + (out.usage ? textCost(s, out.usage) : 0);
    const row = {
      fingerprint: fp,
      kind: r.kind,
      subject: r.subject,
      label: r.label,
      labelEn: r.labelEn ?? null,
      theme: r.theme ?? null,
      variant: r.variant,
      prompt,
      model,
      quality: s.quality,
      size: s.size,
      status: 'review',
      mime: out.mime,
      data: out.data,
      bytes: out.data.length,
      costUsd: cost,
      referenceId: ref?.id ?? null,
      createdBy: userId,
      createdAt: new Date(),
      reviewedBy: null,
      reviewedAt: null,
    };
    const [saved] = replaceId
      ? await this.db.update(aiImages).set(row).where(eq(aiImages.id, replaceId)).returning()
      : await this.db.insert(aiImages).values(row).returning();
    await this.audit('generate', userId, {
      model,
      imageId: saved!.id,
      costUsd: cost,
      inputTokens: out.usage?.input ?? null,
      cachedTokens: out.usage?.cached ?? null,
      outputTokens: out.usage?.output ?? null,
      detail: `${r.kind}:${r.subject}#${r.variant}`,
    });
    return { reused: false, costUsd: cost + claudeUsd, image: imageView(saved!) };
  }

  async list(q: { status?: AiImageStatus; subject?: string; page: number }) {
    const where = and(
      q.status ? eq(aiImages.status, q.status) : ne(aiImages.status, 'rejected'),
      q.subject ? eq(aiImages.subject, q.subject) : undefined,
    );
    const rows = await this.db
      .select()
      .from(aiImages)
      .where(where)
      .orderBy(desc(aiImages.createdAt))
      .limit(48)
      .offset(q.page * 48);
    return rows.map(imageView);
  }

  async setStatus(id: string, status: AiImageStatus, userId: string) {
    const [row] = await this.db
      .update(aiImages)
      .set({ status, reviewedBy: userId, reviewedAt: new Date() })
      .where(eq(aiImages.id, id))
      .returning();
    if (!row) throw new NotFoundException('Gambar tidak ditemukan');
    await this.audit(`review-${status}`, userId, {
      imageId: id,
      detail: `${row.kind}:${row.subject}`,
    });
    return imageView(row);
  }

  async file(id: string, opts: { approvedOnly: boolean }) {
    const [row] = await this.db
      .select({ mime: aiImages.mime, data: aiImages.data, status: aiImages.status })
      .from(aiImages)
      .where(eq(aiImages.id, id));
    if (!row || (opts.approvedOnly && row.status !== 'approved')) return null;
    return row;
  }

  /** Gambar disetujui untuk satu subjek (varian terkecil) — dipakai ulang oleh soal/pelajaran. */
  async approvedFor(subject: string) {
    const [row] = await this.db
      .select({ id: aiImages.id })
      .from(aiImages)
      .where(and(eq(aiImages.subject, subject), eq(aiImages.status, 'approved')))
      .orderBy(aiImages.variant, aiImages.createdAt)
      .limit(1);
    return row?.id ?? null;
  }
}
