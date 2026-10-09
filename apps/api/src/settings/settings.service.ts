import { Inject, Injectable } from '@nestjs/common';
import {
  affiliateSettingsSchema,
  aiImageSettingsSchema,
  billingSettingsSchema,
  contactSettingsSchema,
  DEFAULT_CONTACT_SETTINGS,
  DEFAULT_AFFILIATE_SETTINGS,
  DEFAULT_BILLING_SETTINGS,
  DEFAULT_VOICE_SETTINGS,
  DEFAULT_AI_IMAGE_SETTINGS,
  upgradeVoiceSettings,
  voiceSettingsSchema,
  type AiImageSettings,
  type AffiliateSettings,
  type BillingSettings,
  type ContactSettings,
  type VoiceSettings,
} from '@little-coder/engine';
import { eq } from 'drizzle-orm';
import type { z } from 'zod';
import { DB, type Db } from '../db/db.module.js';
import { appSettings } from '../db/schema.js';

const DEFS = {
  billing: { schema: billingSettingsSchema, defaults: DEFAULT_BILLING_SETTINGS },
  voice: { schema: voiceSettingsSchema, defaults: DEFAULT_VOICE_SETTINGS },
  affiliate: { schema: affiliateSettingsSchema, defaults: DEFAULT_AFFILIATE_SETTINGS },
  contact: { schema: contactSettingsSchema, defaults: DEFAULT_CONTACT_SETTINGS },
  ai_image: { schema: aiImageSettingsSchema, defaults: DEFAULT_AI_IMAGE_SETTINGS },
} as const;
type Key = keyof typeof DEFS;
type Value<K extends Key> = K extends 'billing'
  ? BillingSettings
  : K extends 'affiliate'
    ? AffiliateSettings
    : K extends 'contact'
      ? ContactSettings
      : K extends 'ai_image'
        ? AiImageSettings
        : VoiceSettings;

/** Pengaturan admin di tabel `app_settings` (D-036); nilai yang hilang/rusak → bawaan. */
@Injectable()
export class SettingsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async get<K extends Key>(key: K): Promise<Value<K>> {
    const def = DEFS[key];
    const [row] = await this.db.select().from(appSettings).where(eq(appSettings.key, key));
    const parsed = (def.schema as z.ZodType).safeParse({
      ...def.defaults,
      ...(row?.value as object),
    });
    const value = (parsed.success ? parsed.data : def.defaults) as Value<K>;
    // Gaya suara bawaan lama ("robot", pelan) → bawaan baru (D-087); suntingan admin tetap.
    return (key === 'voice' ? upgradeVoiceSettings(value as VoiceSettings) : value) as Value<K>;
  }

  async set<K extends Key>(key: K, value: Value<K>, userId: string | null): Promise<Value<K>> {
    await this.db
      .insert(appSettings)
      .values({ key, value, updatedBy: userId })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedBy: userId, updatedAt: new Date() },
      });
    return value;
  }
}
