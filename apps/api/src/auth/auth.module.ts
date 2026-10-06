import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { jwtSecret } from '../common/config.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { GoogleVerifier } from './google.js';
import { SettingsService } from '../settings/settings.service.js';

@Global()
@Module({
  imports: [JwtModule.registerAsync({ useFactory: () => ({ secret: jwtSecret() }) })],
  controllers: [AuthController],
  // SettingsService di sini (modul global) agar AuthService & semua controller memakai instance yang sama.
  providers: [
    AuthService,
    GoogleVerifier,
    SettingsService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService, SettingsService],
})
export class AuthModule {}
