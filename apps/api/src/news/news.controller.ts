import { BadRequestException, Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import type { SessionUser } from '@little-coder/engine';
import { z } from 'zod';
import { CurrentUser, Public, Roles } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { NewsService, validUnsubscribe } from './news.service.js';

const toggle = z.strictObject({ subscribed: z.boolean() });
const enable = z.strictObject({ enabled: z.boolean() });
const unsub = z.strictObject({ p: z.uuid(), t: z.string().min(10).max(64) });

/** Info materi baru (D-053): admin, orang tua, dan tautan berhenti berlangganan. */
@Controller()
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Roles('admin')
  @Get('admin/news')
  overview() {
    return this.news.overview();
  }

  @Roles('admin')
  @Put('admin/news')
  setEnabled(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(enable)) body: z.infer<typeof enable>,
  ) {
    return this.news.setEnabled(body.enabled, user.id);
  }

  /** Kirim sekarang tanpa menunggu jeda 30 menit / sehari (tetap hanya bila ada materi baru). */
  @Roles('admin')
  @Post('admin/news/send-now')
  @HttpCode(200)
  async sendNow() {
    return this.news.maybeSend(new Date(), true);
  }

  @Roles('parent')
  @Get('parent/news')
  mine(@CurrentUser() user: SessionUser) {
    return this.news.subscribed(user.id);
  }

  @Roles('parent')
  @Put('parent/news')
  setMine(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(toggle)) body: z.infer<typeof toggle>,
  ) {
    return this.news.setSubscribed(user.id, body.subscribed);
  }

  /** Tautan di email: berhenti berlangganan tanpa login (token HMAC per orang tua). */
  @Public()
  @Post('public/news/unsubscribe')
  @HttpCode(200)
  async unsubscribe(@Body(new ZodPipe(unsub)) body: z.infer<typeof unsub>) {
    if (!validUnsubscribe(body.p, body.t)) throw new BadRequestException('Tautan tidak valid');
    await this.news.setSubscribed(body.p, false);
    return { ok: true };
  }
}
