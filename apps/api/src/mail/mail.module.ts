import { Global, Module } from '@nestjs/common';
import { MailService, MAIL_TRANSPORT, smtpFromEnv } from './mail.service.js';

/** Email (D-044) tersedia untuk semua modul (auth, billing, admin). */
@Global()
@Module({
  providers: [MailService, { provide: MAIL_TRANSPORT, useFactory: smtpFromEnv }],
  exports: [MailService],
})
export class MailModule {}
