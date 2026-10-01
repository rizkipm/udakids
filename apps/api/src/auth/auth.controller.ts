import { Body, Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import {
  childLoginSchema,
  childRegisterSchema,
  classJoinSchema,
  familyCodeSchema,
  parentLoginSchema,
  parentRegisterSchema,
  staffLoginSchema,
  type SessionUser,
} from '@little-coder/engine';
import type { Request } from 'express';
import type { z } from 'zod';
import { clientIp } from '../common/rate-limit.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { AuthService } from './auth.service.js';
import { CurrentUser, Public } from './decorators.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('staff/login')
  @HttpCode(200)
  staffLogin(
    @Body(new ZodPipe(staffLoginSchema)) body: z.infer<typeof staffLoginSchema>,
    @Req() req: Request,
  ) {
    return this.auth.staffLogin(body.email, body.password, clientIp(req));
  }

  @Public()
  @Post('parent/register')
  parentRegister(
    @Body(new ZodPipe(parentRegisterSchema)) body: z.infer<typeof parentRegisterSchema>,
    @Req() req: Request,
  ) {
    return this.auth.parentRegister(body, clientIp(req));
  }

  @Public()
  @Post('parent/login')
  @HttpCode(200)
  parentLogin(
    @Body(new ZodPipe(parentLoginSchema)) body: z.infer<typeof parentLoginSchema>,
    @Req() req: Request,
  ) {
    return this.auth.parentLogin(body.email, body.password, clientIp(req));
  }

  @Public()
  @Get('family/:code')
  family(@Param('code', new ZodPipe(familyCodeSchema)) code: string, @Req() req: Request) {
    return this.auth.familyProfiles(code, clientIp(req));
  }

  @Public()
  @Post('child/login')
  @HttpCode(200)
  childLogin(
    @Body(new ZodPipe(childLoginSchema)) body: z.infer<typeof childLoginSchema>,
    @Req() req: Request,
  ) {
    return this.auth.childLogin(body.familyCode, body.childId, body.pin, new Date(), clientIp(req));
  }

  /** Anak daftar sendiri tanpa orang tua (D-037). */
  @Public()
  @Post('child/register')
  childRegister(
    @Body(new ZodPipe(childRegisterSchema)) body: z.infer<typeof childRegisterSchema>,
    @Req() req: Request,
  ) {
    return this.auth.childRegister(body, clientIp(req));
  }

  @Public()
  @Get('class/:code')
  classInfo(@Param('code', new ZodPipe(familyCodeSchema)) code: string, @Req() req: Request) {
    return this.auth.classInfo(code, clientIp(req));
  }

  @Public()
  @Post('class/join')
  classJoin(
    @Body(new ZodPipe(classJoinSchema)) body: z.infer<typeof classJoinSchema>,
    @Req() req: Request,
  ) {
    return this.auth.classJoin(body, clientIp(req));
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser) {
    return this.auth.me(user);
  }
}
