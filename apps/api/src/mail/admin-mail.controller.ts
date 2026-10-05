import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { emailSchema, type SessionUser } from '@little-coder/engine';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { AuthService } from '../auth/auth.service.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { staffUsers } from '../db/schema.js';
import { MailService } from './mail.service.js';
import { testEmail } from './templates.js';

/** Admin: status pengiriman email, email uji, kirim ulang, verifikasi manual orang tua (D-044). */
@Roles('admin')
@Controller('admin/mail')
export class AdminMailController {
  constructor(
    private readonly mail: MailService,
    @Inject(DB) private readonly db: Db,
    private readonly auth: AuthService,
  ) {}

  @Get()
  overview() {
    return this.mail.overview();
  }

  /** Kirim email uji ke alamat tertentu (bawaan: email admin yang login). */
  @Post('test')
  @HttpCode(200)
  async test(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(z.strictObject({ to: emailSchema.optional() }))) body: { to?: string },
  ) {
    let to = body.to;
    if (!to) {
      const [me] = await this.db
        .select({ email: staffUsers.email })
        .from(staffUsers)
        .where(eq(staffUsers.id, user.id));
      to = me?.email;
    }
    if (!to) throw new NotFoundException('Alamat tujuan tidak ditemukan');
    const [id] = await this.mail.enqueue(to, testEmail(this.mail.ctx(), { to }), { kind: 'test' });
    await this.mail.flush();
    return { id, to, configured: this.mail.ready };
  }

  @Post('outbox/:id/retry')
  @HttpCode(200)
  async retry(@Param('id', ParseUUIDPipe) id: string) {
    if (!(await this.mail.retry(id))) throw new NotFoundException('Email tidak bisa dikirim ulang');
    return { ok: true };
  }

  /**
   * Tandai email orang tua terverifikasi (mis. orang tua tidak menerima email) + buat password sementara
   * acak (D-064). Email ke orang tua berisi info verifikasi + password sementara; admin juga menerima
   * password itu sekali untuk disalin. Orang tua diminta segera mengganti password setelah masuk.
   */
  @Post('parents/:id/verify')
  @HttpCode(200)
  async verifyParent(@Param('id', ParseUUIDPipe) id: string) {
    const res = await this.auth.adminVerifyParent(id);
    void this.mail.flush();
    return { ...res, changed: true };
  }
}
