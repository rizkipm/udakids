import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  dialogFileSchema,
  DOMAINS,
  GRADES,
  VOICE_ITEM_PARTS,
  VOICE_LINE_KEYS,
  voiceProfileOf,
  voiceLinesUpdateSchema,
  voiceSettingsSchema,
  skillIdSchema,
  type SessionUser,
  type VoiceSettings,
} from '@little-coder/engine';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { CurrentUser, Public, Roles } from '../auth/decorators.js';
import { clientIp, RateLimiter } from '../common/rate-limit.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { dialogs } from '../db/schema.js';
import { SettingsService } from '../settings/settings.service.js';
import { VOICE_LOCALE, VoiceService } from './voice.service.js';

const itemQuery = z.strictObject({
  seed: z.coerce
    .number()
    .int()
    .min(0)
    .max(2 ** 31),
  band: z.coerce.number().int().min(0).max(2),
  part: z.enum(VOICE_ITEM_PARTS).default('prompt'),
  /** Id kartu untuk `part=choice`. */
  c: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{1,40}$/)
    .optional(),
  v: z.string().max(20).optional(),
});

/** Kunci kalimat pelajaran (D-088), mis. "2", "3.b.mata", "3.k.makan-apel.ok". */
const lessonQuery = z.strictObject({
  k: z.string().regex(/^\d{1,2}(\.[a-z0-9-]{1,40}){0,3}$/),
  v: z.string().max(20).optional(),
});

/**
 * Suara untuk teks dari perangkat (D-091): teks + konteks soal (`i` = skillId~seed~band) dan/atau pelajaran
 * (`s` = domain~grade~kode). Server hanya membuat suara bila teks berasal dari aplikasi (`sayAllowed`).
 */
const sayQuery = z.strictObject({
  t: z.string().min(1).max(600),
  l: z.enum(['id-ID', 'en-GB']).default('id-ID'),
  i: z
    .string()
    .regex(/^[a-z0-9.-]{3,120}~\d{1,10}~[0-2]$/)
    .optional(),
  s: z
    .string()
    .regex(/^[a-z]{2,12}~[a-z0-9]{2,8}~[A-Z]{1,2}$/)
    .optional(),
  /** Soal lomba live: id peserta ~ nomor soal. */
  c: z
    .string()
    .regex(/^[0-9a-f-]{36}~\d{1,3}$/)
    .optional(),
  v: z.string().max(20).optional(),
});

function sendClip(res: Response, clip: { mime: string; data: Buffer }) {
  res
    .status(200)
    .setHeader('Content-Type', clip.mime)
    .setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    .send(clip.data);
}

/** Suara Momo untuk perangkat anak (tanpa login: elemen <audio> tidak bisa mengirim token). */
@Controller('voice')
export class VoiceController {
  /**
   * Semua suara anak (D-091): 2000 permintaan / 10 menit per IP (satu kelas sering berbagi IP Wi-Fi sekolah);
   * klip BARU (berbayar): 200 / 10 menit per IP, ditambah batas harian `TTS_DAILY_LIMIT`.
   */
  private readonly limiter = new RateLimiter(2000, 10 * 60_000);
  private readonly newClips = new RateLimiter(200, 10 * 60_000);
  private readonly log = new Logger('Voice');

  constructor(private readonly voice: VoiceService) {}

  @Public()
  @Get('lines')
  lines() {
    return this.voice.lines();
  }

  @Public()
  @Get('clip/:key')
  async clip(
    @Param('key', new ZodPipe(z.string().regex(/^[a-f0-9]{64}$/))) key: string,
    @Res() res: Response,
  ) {
    const clip = await this.voice.clip(key);
    if (!clip) throw new NotFoundException('Suara belum tersedia');
    sendClip(res, clip);
  }

  /**
   * Suara Chirp untuk kalimat pelajaran "Belajar dulu" & simulasi (D-088). Teks diambil server dari pelajaran di
   * katalog (bukan teks bebas dari perangkat), dengan batas yang sama seperti suara soal.
   */
  @Public()
  @Get('lesson/:domain/:grade/:code')
  async lesson(
    @Param('domain', new ZodPipe(z.enum(DOMAINS))) domain: (typeof DOMAINS)[number],
    @Param('grade', new ZodPipe(z.enum(GRADES))) grade: (typeof GRADES)[number],
    @Param('code', new ZodPipe(z.string().regex(/^[A-Z]{1,2}$/))) code: string,
    @Query(new ZodPipe(lessonQuery)) q: z.infer<typeof lessonQuery>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ipKey = `voice:${clientIp(req)}`;
    this.limiter.check(ipKey);
    this.limiter.fail(ipKey);
    const text = await this.voice.lessonText(domain, grade, code, q.k);
    if (!text) throw new NotFoundException('Kalimat pelajaran tidak ditemukan');
    // Profil suara mengikuti buku: jenjang (gaya & kecepatan) dan bahasa narasi.
    const profile = voiceProfileOf(`${domain}.${grade}.pelajaran`, 'prompt');
    if (!(await this.voice.hasClip(text, profile))) {
      this.newClips.check(ipKey);
      this.newClips.fail(ipKey);
    }
    const key = await this.voice.ensure(text, undefined, profile);
    const clip = key && (await this.voice.clip(key));
    if (!clip) throw new NotFoundException('Suara belum tersedia');
    sendClip(res, clip);
  }

  /** Semua kalimat lain di aplikasi (D-091): antarmuka, game, pelajaran otomatis, kartu, nama huruf/angka. */
  @Public()
  @Get('say')
  async say(
    @Query(new ZodPipe(sayQuery)) q: z.infer<typeof sayQuery>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ipKey = `voice:${clientIp(req)}`;
    this.limiter.check(ipKey);
    this.limiter.fail(ipKey);
    const [skillId, seed, band] = q.i?.split('~') ?? [];
    const item = skillId ? { skillId, seed: Number(seed), band: Number(band) } : undefined;
    const lesson = q.s?.split('~');
    const [entryId, at] = q.c?.split('~') ?? [];
    const contest = entryId ? { entryId, index: Number(at) } : undefined;
    if (!(await this.voice.sayAllowed(q.t, { item, lesson, contest }))) {
      this.log.warn(`teks suara ditolak (bukan teks aplikasi): ${q.t.slice(0, 80)}`);
      throw new NotFoundException('Teks ini tidak dibuatkan suara');
    }
    // Profil mengikuti konteks: buku soal/pelajaran (jenjang & bahasa), kata English (kartu), atau umum.
    const base = item?.skillId ?? (lesson ? `${lesson[0]}.${lesson[1]}.pelajaran` : undefined);
    const profile =
      q.l === 'en-GB'
        ? base?.startsWith('english.')
          ? voiceProfileOf(base, 'choice')
          : { lang: 'en-GB' as const }
        : base
          ? { ...voiceProfileOf(base, 'prompt'), lang: 'id-ID' as const }
          : undefined;
    if (!(await this.voice.hasClip(q.t, profile))) {
      this.newClips.check(ipKey);
      this.newClips.fail(ipKey);
    }
    const key = await this.voice.ensure(q.t, undefined, profile);
    const clip = key && (await this.voice.clip(key));
    if (!clip) throw new NotFoundException('Suara belum tersedia');
    sendClip(res, clip);
  }

  @Public()
  @Get('item/:skillId')
  async item(
    @Param('skillId', new ZodPipe(skillIdSchema)) skillId: string,
    @Query(new ZodPipe(itemQuery)) q: z.infer<typeof itemQuery>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ipKey = `voice:${clientIp(req)}`;
    this.limiter.check(ipKey);
    this.limiter.fail(ipKey);
    const text = await this.voice.itemText(skillId, q.seed, q.band, q.part, q.c);
    if (!text) throw new NotFoundException('Soal ini tidak memakai suara Momo');
    const profile = voiceProfileOf(skillId, q.part);
    if (!(await this.voice.hasClip(text, profile))) {
      this.newClips.check(ipKey);
      this.newClips.fail(ipKey);
    }
    const key = await this.voice.ensure(text, undefined, profile);
    const clip = key && (await this.voice.clip(key));
    if (!clip) throw new NotFoundException('Suara belum tersedia');
    sendClip(res, clip);
  }
}

/** Admin: pengaturan suara Momo, kalimat, pembuatan klip, dan pratinjau. */
@Roles('admin')
@Controller('admin/voice')
export class AdminVoiceController {
  constructor(
    private readonly voice: VoiceService,
    private readonly settings: SettingsService,
    @Inject(DB) private readonly db: Db,
  ) {}

  @Get()
  async overview() {
    const [settings, lines, stats] = await Promise.all([
      this.settings.get('voice'),
      this.voice.lines(),
      this.voice.stats(),
    ]);
    return {
      settings,
      providerReady: await this.voice.isReady(),
      key: await this.voice.keyInfo(),
      ...stats,
      rev: lines.rev,
      lines: lines.lines,
    };
  }

  @Put('settings')
  async saveSettings(
    @Body(new ZodPipe(voiceSettingsSchema)) body: VoiceSettings,
    @CurrentUser() user: SessionUser,
  ) {
    return this.settings.set('voice', body, user.id);
  }

  /** Ubah teks kalimat suara (disimpan di dialog database); klipnya dibuat ulang saat "Buat suara". */
  @Put('lines')
  async saveLines(
    @Body(new ZodPipe(voiceLinesUpdateSchema)) body: z.infer<typeof voiceLinesUpdateSchema>,
  ) {
    const d = await this.voice.dialog();
    const lines = { ...d.lines };
    for (const [k, text] of Object.entries(body.lines)) {
      if (!VOICE_LINE_KEYS.includes(k)) continue;
      lines[k] = { ...lines[k], text };
    }
    const data = dialogFileSchema.parse({ ...d, lines });
    await this.db
      .insert(dialogs)
      .values({ locale: VOICE_LOCALE, data, updatedAt: new Date() })
      .onConflictDoUpdate({ target: dialogs.locale, set: { data, updatedAt: new Date() } });
    return this.voice.lines();
  }

  /** Simpan API key suara (Google Cloud Text-to-Speech, model Gemini-TTS) — terenkripsi, tidak dikirim balik. */
  @Put('key')
  @HttpCode(200)
  async saveKey(
    @Body(
      new ZodPipe(
        z.strictObject({
          apiKey: z
            .string()
            .trim()
            .min(20, 'API key terlalu pendek')
            .max(200)
            .regex(/^[A-Za-z0-9_\-.]+$/, 'API key hanya huruf, angka, _ - .'),
        }),
      ),
    )
    body: { apiKey: string },
    @CurrentUser() user: SessionUser,
  ) {
    await this.voice.setKey(body.apiKey, user.id);
    return this.voice.keyInfo();
  }

  @Delete('key')
  async deleteKey() {
    await this.voice.clearKey();
    return this.voice.keyInfo();
  }

  @Post('key/test')
  @HttpCode(200)
  testKey() {
    return this.voice.testKey();
  }

  @Post('generate')
  @HttpCode(200)
  async generate() {
    if (!(await this.voice.isReady()))
      throw new ServiceUnavailableException('GOOGLE_TTS_API_KEY belum diisi di .env server');
    return this.voice.generateLines();
  }

  /** Dengarkan satu kalimat dengan pengaturan suara saat ini (disimpan ke cache juga). */
  @Post('preview')
  async preview(
    @Body(new ZodPipe(z.strictObject({ text: z.string().trim().min(1).max(300) })))
    body: { text: string },
    @Res() res: Response,
  ) {
    if (!(await this.voice.isReady()))
      throw new ServiceUnavailableException('GOOGLE_TTS_API_KEY belum diisi di .env server');
    const key = await this.voice.ensure(body.text);
    const clip = key && (await this.voice.clip(key));
    if (!clip) throw new ServiceUnavailableException('Suara gagal dibuat. Cek log API.');
    sendClip(res, clip);
  }
}
