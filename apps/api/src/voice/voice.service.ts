import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  dialogFileSchema,
  generateItem,
  isListeningItem,
  skillTemplateSchema,
  VOICE_LINE_KEYS,
  voiceItemText,
  voiceSettingsFor,
  type DialogFile,
  type VoiceItemPart,
  type VoiceLang,
  type VoiceProfile,
  type VoiceSettings,
} from '@little-coder/engine';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module.js';
import { appSettings, dialogs, skills, voiceClips } from '../db/schema.js';
import { open, seal, type Sealed } from '../common/secret-box.js';
import { SettingsService } from '../settings/settings.service.js';
import { GoogleCloudTts, TTS_PROVIDER, type TtsProvider } from './tts.provider.js';

/** Baris app_settings untuk API key suara yang diisi admin (terenkripsi). */
export const VOICE_KEY_SETTING = 'voice_key';

export const VOICE_LOCALE = 'id';
/** Batas pembuatan klip BARU per hari (melindungi biaya bila endpoint disalahgunakan). */
const dailyLimit = () => Number(process.env.TTS_DAILY_LIMIT ?? 3000);

export type VoiceLine = { text: string; clip: string | null };

/**
 * Suara Momo (D-035): klip MP3 dibuat sekali lewat penyedia TTS lalu disimpan di PostgreSQL
 * (`voice_clips`), sehingga ikut backup/restore dan dipakai ulang selamanya. Teks yang boleh dibuatkan
 * suara hanya: kalimat dialog Momo, dan kalimat soal Basic yang diturunkan ulang dari skill + seed —
 * tidak pernah teks bebas dari browser.
 */
@Injectable()
export class VoiceService {
  private readonly log = new Logger('Voice');
  private readonly inflight = new Map<string, Promise<string | null>>();
  private day = '';
  private madeToday = 0;

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: SettingsService,
    @Optional() @Inject(TTS_PROVIDER) private readonly fixed: TtsProvider | null,
  ) {}

  private adminKey?: { at: number; key: string | null; info: Sealed | null };

  /** API key yang diisi admin (terenkripsi di app_settings `voice_key`), cache 30 detik. */
  private async loadAdminKey() {
    if (this.adminKey && Date.now() - this.adminKey.at < 30_000) return this.adminKey;
    const [row] = await this.db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, VOICE_KEY_SETTING));
    const info = (row?.value as Sealed | undefined) ?? null;
    this.adminKey = { at: Date.now(), key: open(info), info };
    return this.adminKey;
  }

  /**
   * Penyedia suara (D-043): `.env` (GOOGLE_TTS_API_KEY) → API key yang diisi admin → tidak ada (aplikasi
   * memakai suara browser).
   */
  async provider(): Promise<TtsProvider | null> {
    if (this.fixed) return this.fixed;
    const { key } = await this.loadAdminKey();
    return key ? new GoogleCloudTts(key) : null;
  }

  async isReady() {
    return !!(await this.provider());
  }

  /** Info kunci untuk admin — TIDAK PERNAH berisi kunci itu sendiri. */
  async keyInfo() {
    if (this.fixed)
      return {
        source: process.env.GOOGLE_TTS_API_KEY?.trim() ? 'env' : 'server',
        last4: null,
        updatedAt: null,
      };
    const { key, info } = await this.loadAdminKey();
    if (key && info) return { source: 'admin', last4: info.last4, updatedAt: info.updatedAt };
    return { source: null, last4: null, updatedAt: null, unreadable: !!info && !key };
  }

  async setKey(apiKey: string, userId: string) {
    const value = seal(apiKey);
    await this.db
      .insert(appSettings)
      .values({ key: VOICE_KEY_SETTING, value, updatedBy: userId })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedBy: userId, updatedAt: new Date() },
      });
    this.adminKey = undefined;
  }

  async clearKey() {
    await this.db.delete(appSettings).where(eq(appSettings.key, VOICE_KEY_SETTING));
    this.adminKey = undefined;
  }

  /** Uji kunci: buat satu kalimat pendek (tidak disimpan). */
  async testKey(): Promise<{ ok: boolean; message: string }> {
    const provider = await this.provider();
    if (!provider) return { ok: false, message: 'Belum ada API key' };
    try {
      const out = await provider.synthesize('Halo, aku Momo.', await this.settings.get('voice'));
      return { ok: out.data.length > 0, message: `Berhasil (${out.data.length} byte audio)` };
    } catch (err) {
      return { ok: false, message: (err as Error).message.slice(0, 200) };
    }
  }

  /** Kunci klip. Bahasa hanya ikut dihitung bila bukan Indonesia, jadi klip lama tetap berlaku. */
  static keyOf(text: string, s: VoiceSettings, lang: VoiceLang = 'id-ID') {
    return createHash('sha256')
      .update(
        `${s.model}|${s.voice}|${s.style}|${s.rate}|${lang === 'id-ID' ? '' : `${lang}|`}${text}`,
      )
      .digest('hex');
  }

  /** Versi suara (berubah bila admin mengganti model/suara/gaya) — untuk memutus cache browser. */
  static revOf(s: VoiceSettings) {
    return VoiceService.keyOf('', s).slice(0, 10);
  }

  async dialog(): Promise<DialogFile> {
    const [row] = await this.db.select().from(dialogs).where(eq(dialogs.locale, VOICE_LOCALE));
    return dialogFileSchema.parse(row?.data ?? { lang: VOICE_LOCALE, lines: {} });
  }

  /** Klip yang sudah ada untuk daftar teks (kunci klip per teks). */
  private async existing(keys: string[]) {
    if (keys.length === 0) return new Set<string>();
    const rows = await this.db
      .select({ key: voiceClips.key })
      .from(voiceClips)
      .where(inArray(voiceClips.key, keys));
    return new Set(rows.map((r) => r.key));
  }

  /** Manifest kalimat suara Momo untuk perangkat anak: teks + kunci klip (bila sudah dibuat). */
  async lines() {
    const s = await this.settings.get('voice');
    const d = await this.dialog();
    const entries = VOICE_LINE_KEYS.filter((k) => d.lines[k]).map(
      (k) => [k, d.lines[k]!.text, VoiceService.keyOf(d.lines[k]!.text, s)] as const,
    );
    const have = s.enabled ? await this.existing(entries.map((e) => e[2])) : new Set<string>();
    return {
      enabled: s.enabled && (await this.isReady()),
      rev: VoiceService.revOf(s),
      lines: Object.fromEntries(
        entries.map(([k, text, key]) => [k, { text, clip: have.has(key) ? key : null }]),
      ) as Record<string, VoiceLine>,
    };
  }

  /** Sudah ada klip untuk teks ini (dengan pengaturan suara saat ini)? */
  async hasClip(text: string, profile: VoiceProfile = { lang: 'id-ID' }) {
    const lang = profile.lang;
    const s = voiceSettingsFor(await this.settings.get('voice'), profile);
    const [hit] = await this.db
      .select({ key: voiceClips.key })
      .from(voiceClips)
      .where(eq(voiceClips.key, VoiceService.keyOf(text, s, lang)));
    return !!hit;
  }

  async clip(key: string) {
    const [row] = await this.db.select().from(voiceClips).where(eq(voiceClips.key, key));
    return row;
  }

  /** Kunci klip untuk `text`; dibuat bila belum ada (null bila suara mati/penyedia tidak ada). */
  async ensure(
    text: string,
    s?: VoiceSettings,
    profile: VoiceProfile = { lang: 'id-ID' },
  ): Promise<string | null> {
    const lang = profile.lang;
    const settings = voiceSettingsFor(s ?? (await this.settings.get('voice')), profile);
    const key = VoiceService.keyOf(text, settings, lang);
    const [hit] = await this.db
      .select({ key: voiceClips.key })
      .from(voiceClips)
      .where(eq(voiceClips.key, key));
    if (hit) return key;
    if (!settings.enabled || !(await this.isReady())) return null;
    const running = this.inflight.get(key);
    if (running) return running;
    const job = this.make(key, text, settings, lang).finally(() => this.inflight.delete(key));
    this.inflight.set(key, job);
    return job;
  }

  private async make(
    key: string,
    text: string,
    s: VoiceSettings,
    lang: VoiceLang,
  ): Promise<string | null> {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.day) {
      // Hitungan harian dari database: tetap berlaku walau server di-restart (audit M5).
      const [row] = await this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(voiceClips)
        .where(sql`${voiceClips.createdAt} >= ${`${today}T00:00:00Z`}::timestamptz`);
      this.day = today;
      this.madeToday = row?.n ?? 0;
    }
    if (this.madeToday >= dailyLimit()) {
      this.log.warn(`batas harian ${dailyLimit()} klip baru tercapai`);
      return null;
    }
    this.madeToday++;
    try {
      const provider = await this.provider();
      if (!provider) return null;
      const out = await provider.synthesize(text, s, lang);
      await this.db
        .insert(voiceClips)
        .values({
          key,
          text,
          voice: `${s.model}/${s.voice}`,
          mime: out.mime,
          data: out.data,
          bytes: out.data.length,
        })
        .onConflictDoNothing();
      return key;
    } catch (err) {
      this.log.warn(`gagal membuat suara: ${(err as Error).message}`);
      return null;
    }
  }

  /** Buat semua klip kalimat Momo yang belum ada (admin / CLI `voice:generate`). */
  async generateLines(): Promise<{
    total: number;
    created: number;
    failed: number;
    skipped: number;
  }> {
    const s = await this.settings.get('voice');
    const d = await this.dialog();
    const texts = VOICE_LINE_KEYS.map((k) => d.lines[k]?.text).filter((x): x is string => !!x);
    const have = await this.existing(texts.map((t) => VoiceService.keyOf(t, s)));
    let created = 0;
    let failed = 0;
    for (const text of texts) {
      if (have.has(VoiceService.keyOf(text, s))) continue;
      if (await this.ensure(text, s)) created++;
      else failed++;
    }
    return { total: texts.length, created, failed, skipped: texts.length - created - failed };
  }

  /** Kalimat soal Basic (prompt/reteach) yang diturunkan ulang dari skill + seed + band. */
  async itemText(
    skillId: string,
    seed: number,
    band: number,
    part: VoiceItemPart,
    choiceId?: string,
  ) {
    const [row] = await this.db
      .select({ template: skills.template })
      .from(skills)
      .where(and(eq(skills.id, skillId), eq(skills.status, 'active')));
    if (!row) return undefined;
    const template = skillTemplateSchema.parse(row.template);
    // Mock test (D-072) tidak punya soal sendiri; soalnya membawa id level sumber.
    if (template.family === 'mock') return undefined;
    const item = generateItem(template, { seed, band });
    // Basic: kalimat soal & pembahasan. Kelas 1+: hanya kalimat soal "dengar" (dikte) — D-043.
    if (template.tier !== 'basic' && !(part === 'prompt' && isListeningItem(item)))
      return undefined;
    // Kartu pilihan hanya untuk buku English (kata Inggris diucapkan suara Momo, bukan suara perangkat) — D-062.
    if (part === 'choice' && template.domain !== 'english') return undefined;
    return voiceItemText(item, part, choiceId);
  }

  async stats() {
    const [row] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
        bytes: sql<number>`coalesce(sum(bytes), 0)::int`,
      })
      .from(voiceClips);
    return { clips: row?.count ?? 0, bytes: row?.bytes ?? 0, madeToday: this.madeToday };
  }
}
