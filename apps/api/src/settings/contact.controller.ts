import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  adminWhatsappHref,
  contactSettingsSchema,
  type ContactSettings,
  type SessionUser,
} from '@little-coder/engine';
import { CurrentUser, Public, Roles } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { SettingsService } from './settings.service.js';

/** Tombol WhatsApp admin untuk landing, area orang tua, dan admin/guru (D-064). Tanpa login. */
@Controller('public/contact')
export class PublicContactController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get()
  async get() {
    const c = await this.settings.get('contact');
    // Link grup hanya untuk email; yang publik cukup tombol admin.
    return { adminWhatsapp: adminWhatsappHref(c) };
  }
}

/** Admin: atur nomor/link WhatsApp admin, pesan pembuka, dan link grup orang tua (D-064). */
@Roles('admin')
@Controller('admin/contact')
export class AdminContactController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.get('contact');
  }

  @Put()
  put(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(contactSettingsSchema)) body: ContactSettings,
  ) {
    return this.settings.set('contact', body, user.id);
  }
}
