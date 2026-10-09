import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import {
  AI_IMAGE_STATUSES,
  aiImageRequestSchema,
  aiImageSettingsSchema,
  aiSubjectSchema,
  type AiImageRequest,
  type AiImageSettings,
  type AiImageStatus,
  type SessionUser,
} from '@little-coder/engine';
import type { Response } from 'express';
import { z } from 'zod';
import { CurrentUser, Public, Roles } from '../auth/decorators.js';
import { RateLimiter } from '../common/rate-limit.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { AiImageService } from './ai-image.service.js';

const uuid = new ZodPipe(z.uuid());
const password = z.string().min(1, 'Isi sandi admin').max(200);

/** Kunci proyek OpenAI: `sk-…` (proyek/terbatas/admin), hanya karakter aman. */
const keyBody = z.strictObject({
  apiKey: z
    .string()
    .trim()
    .min(20, 'API key terlalu pendek')
    .max(300)
    .regex(/^sk-[A-Za-z0-9_-]+$/, 'API key OpenAI diawali "sk-" dan hanya huruf, angka, _ -'),
  password,
});
/** Kunci Claude: `sk-ant-…`, hanya karakter aman (D-092). */
const claudeKeyBody = z.strictObject({
  apiKey: z
    .string()
    .trim()
    .min(20, 'API key terlalu pendek')
    .max(300)
    .regex(
      /^sk-ant-[A-Za-z0-9_-]+$/,
      'API key Claude diawali "sk-ant-" dan hanya huruf, angka, _ -',
    ),
  password,
});
const settingsBody = z.strictObject({ settings: aiImageSettingsSchema, password });
const listQuery = z.strictObject({
  status: z.enum(AI_IMAGE_STATUSES).optional(),
  subject: aiSubjectSchema.optional(),
  page: z.coerce.number().int().min(0).max(1000).default(0),
  /** Penanda muat ulang dari halaman admin (memutus cache setelah gambar dibuat/disetujui); diabaikan. */
  r: z.coerce.number().int().min(0).optional(),
});

function sendImage(res: Response, img: { mime: string; data: Buffer }, cache: string) {
  res
    .status(200)
    .setHeader('Content-Type', img.mime)
    .setHeader('Cache-Control', cache)
    .setHeader('X-Content-Type-Options', 'nosniff')
    .send(img.data);
}

/** Admin → AI Gambar (D-068). Semua endpoint hanya admin; kunci tidak pernah dikirim balik. */
@Roles('admin')
@Controller('admin/ai')
export class AdminAiController {
  /** Pembuatan gambar: 30 / 10 menit per admin (di luar batas biaya). */
  private readonly generateLimit = new RateLimiter(30, 10 * 60_000);
  /** Konfirmasi sandi: 5 percobaan keliru / 15 menit per admin. */
  private readonly passwordLimit = new RateLimiter(5, 15 * 60_000);

  constructor(private readonly ai: AiImageService) {}

  private async confirm(user: SessionUser, pw: string) {
    const key = `ai-pw:${user.id}`;
    this.passwordLimit.check(key);
    try {
      await this.ai.confirmPassword(user.id, pw);
      this.passwordLimit.reset(key);
    } catch (err) {
      this.passwordLimit.fail(key);
      throw err;
    }
  }

  @Get()
  overview() {
    return this.ai.overview();
  }

  @Put('key')
  @HttpCode(200)
  async saveKey(
    @Body(new ZodPipe(keyBody)) body: z.infer<typeof keyBody>,
    @CurrentUser() user: SessionUser,
  ) {
    await this.confirm(user, body.password);
    await this.ai.setKey(body.apiKey, user.id);
    return this.ai.keyInfo();
  }

  /** Tombol darurat: hapus kunci tanpa sandi (lebih aman bila dicurigai bocor). */
  @Delete('key')
  async deleteKey(@CurrentUser() user: SessionUser) {
    await this.ai.clearKey(user.id);
    return this.ai.keyInfo();
  }

  @Post('key/test')
  @HttpCode(200)
  testKey() {
    return this.ai.testKey();
  }

  /** Kunci Claude untuk penulis prompt gambar (D-092): sandi admin wajib, sama seperti kunci OpenAI. */
  @Put('claude-key')
  @HttpCode(200)
  async saveClaudeKey(
    @Body(new ZodPipe(claudeKeyBody)) body: z.infer<typeof claudeKeyBody>,
    @CurrentUser() user: SessionUser,
  ) {
    await this.confirm(user, body.password);
    await this.ai.setClaudeKey(body.apiKey, user.id);
    return this.ai.claudeKeyInfo();
  }

  @Delete('claude-key')
  async deleteClaudeKey(@CurrentUser() user: SessionUser) {
    await this.ai.clearClaudeKey(user.id);
    return this.ai.claudeKeyInfo();
  }

  @Post('claude-key/test')
  @HttpCode(200)
  testClaudeKey() {
    return this.ai.testClaudeKey();
  }

  @Put('settings')
  async saveSettings(
    @Body(new ZodPipe(settingsBody)) body: { settings: AiImageSettings; password: string },
    @CurrentUser() user: SessionUser,
  ) {
    await this.confirm(user, body.password);
    return this.ai.saveSettings(body.settings, user.id);
  }

  @Post('images')
  @HttpCode(200)
  generate(
    @Body(new ZodPipe(aiImageRequestSchema)) body: AiImageRequest,
    @CurrentUser() user: SessionUser,
  ) {
    const key = `ai-gen:${user.id}`;
    this.generateLimit.check(key);
    this.generateLimit.fail(key);
    return this.ai.generate(body, user.id);
  }

  @Get('images')
  list(@Query(new ZodPipe(listQuery)) q: z.infer<typeof listQuery>) {
    return this.ai.list(q);
  }

  /** Pratinjau untuk admin (semua status). Diambil lewat fetch + token, bukan <img> publik. */
  @Get('images/:id/file')
  async file(@Param('id', uuid) id: string, @Res() res: Response) {
    const img = await this.ai.file(id, { approvedOnly: false });
    if (!img) throw new NotFoundException('Gambar tidak ditemukan');
    sendImage(res, img, 'private, no-store');
  }

  @Patch('images/:id')
  review(
    @Param('id', uuid) id: string,
    @Body(new ZodPipe(z.strictObject({ status: z.enum(AI_IMAGE_STATUSES) })))
    body: { status: AiImageStatus },
    @CurrentUser() user: SessionUser,
  ) {
    return this.ai.setStatus(id, body.status, user.id);
  }
}

/**
 * Gambar AI yang SUDAH DISETUJUI, untuk aplikasi (termasuk offline/PWA): file statis dengan cache permanen.
 * Gambar yang belum direview atau ditolak tidak pernah dilayani di sini.
 */
@Controller('pictures')
export class PicturesController {
  constructor(private readonly ai: AiImageService) {}

  @Public()
  @Get(':id')
  async picture(@Param('id', uuid) id: string, @Res() res: Response) {
    const img = await this.ai.file(id, { approvedOnly: true });
    if (!img) throw new NotFoundException('Gambar tidak ditemukan');
    sendImage(res, img, 'public, max-age=31536000, immutable');
  }

  /** Id gambar disetujui untuk satu kata (dipakai ulang semua soal/pelajaran). */
  @Public()
  @Get('subject/:subject')
  async bySubject(@Param('subject', new ZodPipe(aiSubjectSchema)) subject: string) {
    return { id: await this.ai.approvedFor(subject) };
  }
}
