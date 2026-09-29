import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  childLoginSchema,
  classJoinSchema,
  familyCodeSchema,
  parentLoginSchema,
  parentRegisterSchema,
  staffLoginSchema,
  type SessionUser,
} from '@little-coder/engine';
import type { z } from 'zod';
import { ZodPipe } from '../common/zod.pipe.js';
import { AuthService } from './auth.service.js';
import { CurrentUser, Public } from './decorators.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('staff/login')
  @HttpCode(200)
  staffLogin(@Body(new ZodPipe(staffLoginSchema)) body: z.infer<typeof staffLoginSchema>) {
    return this.auth.staffLogin(body.email, body.password);
  }

  @Public()
  @Post('parent/register')
  parentRegister(
    @Body(new ZodPipe(parentRegisterSchema)) body: z.infer<typeof parentRegisterSchema>,
  ) {
    return this.auth.parentRegister(body);
  }

  @Public()
  @Post('parent/login')
  @HttpCode(200)
  parentLogin(@Body(new ZodPipe(parentLoginSchema)) body: z.infer<typeof parentLoginSchema>) {
    return this.auth.parentLogin(body.email, body.password);
  }

  @Public()
  @Get('family/:code')
  family(@Param('code', new ZodPipe(familyCodeSchema)) code: string) {
    return this.auth.familyProfiles(code);
  }

  @Public()
  @Post('child/login')
  @HttpCode(200)
  childLogin(@Body(new ZodPipe(childLoginSchema)) body: z.infer<typeof childLoginSchema>) {
    return this.auth.childLogin(body.familyCode, body.childId, body.pin);
  }

  @Public()
  @Get('class/:code')
  classInfo(@Param('code', new ZodPipe(familyCodeSchema)) code: string) {
    return this.auth.classInfo(code);
  }

  @Public()
  @Post('class/join')
  classJoin(@Body(new ZodPipe(classJoinSchema)) body: z.infer<typeof classJoinSchema>) {
    return this.auth.classJoin(body);
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser) {
    return this.auth.me(user);
  }
}
