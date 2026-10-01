import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  dialogFileSchema,
  generateItem,
  skillTemplateSchema,
  VOICE_LINE_KEYS,
  voiceItemText,
  type DialogFile,
  type VoiceItemPart,
  type VoiceSettings,
} from '@little-coder/engine';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module.js';
import { dialogs, skills, voiceClips } from '../db/schema.js';
import { SettingsService } from '../settings/settings.service.js';
import { TTS_PROVIDER, type TtsProvider } from './tts.provider.js';

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
    @Optional() @Inject(TTS_PROVIDER) private readonly provider: TtsProvider | null,
  ) {}

  get ready() {
    return !!this.provider;
  }

  static keyOf(text: string, s: VoiceSettings) {
    return createHash('sha256')
      .update(`${s.model}|${s.voice}|${s.style}|${s.rate}|${text}`)
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
      enabled: s.enabled && this.ready,
      rev: VoiceService.revOf(s),
      lines: Object.fromEntries(
        entries.map(([k, text, key]) => [k, { text, clip: have.has(key) ? key : null }]),
      ) as Record<string, VoiceLine>,
    };
  }

  /** Sudah ada klip untuk teks ini (dengan pengaturan suara saat ini)? */
  async hasClip(text: string) {
    const s = await this.settings.get('voice');
    const [hit] = await this.db
      .select({ key: voiceClips.key })
      .from(voiceClips)
      .where(eq(voiceClips.key, VoiceService.keyOf(text, s)));
    return !!hit;
  }

  async clip(key: string) {
    const [row] = await this.db.select().from(voiceClips).where(eq(voiceClips.key, key));
    return row;
  }

  /** Kunci klip untuk `text`; dibuat bila belum ada (null bila suara mati/penyedia tidak ada). */
  async ensure(text: string, s?: VoiceSettings): Promise<string | null> {
    const settings = s ?? (await this.settings.get('voice'));
    const key = VoiceService.keyOf(text, settings);
    const [hit] = await this.db
      .select({ key: voiceClips.key })
      .from(voiceClips)
      .where(eq(voiceClips.key, key));
    if (hit) return key;
    if (!settings.enabled || !this.provider) return null;
    const running = this.inflight.get(key);
    if (running) return running;
    const job = this.make(key, text, settings).finally(() => this.inflight.delete(key));
    this.inflight.set(key, job);
    return job;
  }

  private async make(key: string, text: string, s: VoiceSettings): Promise<string | null> {
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
      const out = await this.provider!.synthesize(text, s);
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
  async itemText(skillId: string, seed: number, band: number, part: VoiceItemPart) {
    const [row] = await this.db
      .select({ template: skills.template })
      .from(skills)
      .where(and(eq(skills.id, skillId), eq(skills.status, 'active')));
    if (!row) return undefined;
    const template = skillTemplateSchema.parse(row.template);
    if (template.tier !== 'basic') return undefined;
    return voiceItemText(generateItem(template, { seed, band }), part);
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
