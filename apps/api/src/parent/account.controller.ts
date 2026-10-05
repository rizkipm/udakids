import { Body, Controller, Get, HttpCode, Patch, Post, Req } from '@nestjs/common';
import {
  emailChangeConfirmSchema,
  emailChangeRequestSchema,
  parentProfileSchema,
  passwordChangeSchema,
  type SessionUser,
} from '@little-coder/engine';
import type { Request } from 'express';
import type { z } from 'zod';
import { AuthService } from '../auth/auth.service.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { clientIp } from '../common/rate-limit.js';
import { ZodPipe } from '../common/zod.pipe.js';

/** "Akun saya" orang tua (D-064): profil, ganti password, ganti email (dengan kode ke email baru). */
@Roles('parent')
@Controller('parent/account')
export class ParentAccountController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  get(@CurrentUser() user: SessionUser) {
    return this.auth.parentAccount(user.id);
  }

  @Patch()
  update(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(parentProfileSchema)) body: z.infer<typeof parentProfileSchema>,
  ) {
    return this.auth.updateParentProfile(user.id, body.name);
  }

  /** Mengembalikan token baru (token lama & perangkat lain tidak berlaku lagi). */
  @Post('password')
  @HttpCode(200)
  password(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(passwordChangeSchema)) body: z.infer<typeof passwordChangeSchema>,
    @Req() req: Request,
  ) {
    return this.auth.changeParentPassword(
      user.id,
      body.currentPassword,
      body.password,
      clientIp(req),
    );
  }

  @Post('email')
  @HttpCode(200)
  email(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(emailChangeRequestSchema)) body: z.infer<typeof emailChangeRequestSchema>,
    @Req() req: Request,
  ) {
    return this.auth.requestEmailChange(user.id, body.email, body.currentPassword, clientIp(req));
  }

  @Post('email/verify')
  @HttpCode(200)
  emailVerify(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(emailChangeConfirmSchema)) body: z.infer<typeof emailChangeConfirmSchema>,
    @Req() req: Request,
  ) {
    return this.auth.confirmEmailChange(user.id, body.code, clientIp(req));
  }
}
