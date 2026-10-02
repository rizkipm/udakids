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
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { forgetAccount } from '../auth/auth.guard.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { parents, staffUsers } from '../db/schema.js';
import { MailService } from './mail.service.js';
import { testEmail } from './templates.js';

/** Admin: status pengiriman email, email uji, kirim ulang, verifikasi manual orang tua (D-044). */
@Roles('admin')
@Controller('admin/mail')
export class AdminMailController {
  constructor(
    private readonly mail: MailService,
    @Inject(DB) private readonly db: Db,
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

  /** Tandai email orang tua terverifikasi (mis. orang tua tidak menerima email). */
  @Post('parents/:id/verify')
  @HttpCode(200)
  async verifyParent(@Param('id', ParseUUIDPipe) id: string) {
    const [row] = await this.db
      .update(parents)
      .set({ emailVerifiedAt: new Date() })
      .where(and(eq(parents.id, id), isNull(parents.emailVerifiedAt)))
      .returning({ id: parents.id });
    forgetAccount(id);
    return { ok: true, changed: !!row };
  }
}
