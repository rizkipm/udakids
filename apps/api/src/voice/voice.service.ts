import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  buildVoiceAllowList,
  collectTexts,
  exampleAnswerSay,
  numberWord,
  voiceProfileOf,
  dialogFileSchema,
  generateItem,
  itemVoiceTexts,
  lessonFor,
  lessonVoiceTexts,
  voiceTextAllowed,
  voiceVocabulary,
  type SkillTemplate,
  type VoiceAllowList,
  lessonSchema,
  lessonVoiceLines,
  skillTemplateSchema,
  speechText,
  VOICE_LINE_KEYS,
  voiceItemText,
  voiceSettingsFor,
  type DialogFile,
  type Item,
  type VoiceItemPart,
  type VoiceLang,
  type VoiceProfile,
  type VoiceSettings,
} from '@little-coder/engine';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module.js';
import {
  appSettings,
  contestEntries,
  dialogs,
  skillCatalogs,
  skills,
  voiceClips,
} from '../db/schema.js';
import { i18nDir } from '../common/config.js';
import { open, seal, type Sealed } from '../common/secret-box.js';
import { SettingsService } from '../settings/settings.service.js';
import { GoogleCloudTts, TTS_PROVIDER, type TtsProvider } from './tts.provider.js';

/** Baris app_settings untuk API key suara yang diisi admin (terenkripsi). */
export const VOICE_KEY_SETTING = 'voice_key';

export const VOICE_LOCALE = 'id';
/** Batas pembuatan klip BARU per hari (melindungi biaya bila endpoint disalahgunakan). */
/**
 * Batas pembuatan klip BARU per hari (melindungi biaya). D-091: semua suara memakai Chirp, jadi batas bawaan dinaikkan
 * ke 20.000 — batas 3.000 membuat suara jatuh ke suara browser setelah klip massal dibuat.
 */
const dailyLimit = () => Number(process.env.TTS_DAILY_LIMIT ?? 20000);

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

  /**
   * Kunci klip. Bahasa hanya ikut dihitung bila bukan Indonesia. Teks yang di-hash adalah naskah ucapan
   * (`speechText`, D-087), jadi perbaikan aturan baca otomatis membuat klip baru.
   */
  static keyOf(text: string, s: VoiceSettings, lang: VoiceLang = 'id-ID') {
    return createHash('sha256')
      .update(
        `${s.model}|${s.voice}|${s.style}|${s.rate}|${lang === 'id-ID' ? '' : `${lang}|`}${speechText(text, lang)}`,
      )
      .digest('hex');
  }

  /**
   * Profil suara untuk `/voice/say` (D-091): mengikuti buku soal/pelajaran yang sedang tampil (jenjang & bahasa);
   * kata English memakai profil kartu (lafal British). Dipakai juga saat membuat klip lebih dulu, supaya kuncinya sama.
   */
  static sayProfile(lang: VoiceLang, base?: string): VoiceProfile | undefined {
    if (lang === 'en-GB')
      return base?.startsWith('english.') ? voiceProfileOf(base, 'choice') : { lang: 'en-GB' };
    return base ? { ...voiceProfileOf(base, 'prompt'), lang: 'id-ID' } : undefined;
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
      // Yang dikirim ke mesin suara: naskah ucapan (simbol → kata, D-087); teks asli tetap disimpan.
      const out = await provider.synthesize(speechText(text, lang), s, lang);
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
    // D-091: semua jenjang & semua mata pelajaran memakai suara Chirp — kalimat soal, pembahasan, dan kartu.
    return voiceItemText(item, part, choiceId);
  }

  /** Kalimat pelajaran dari katalog (D-088): hanya teks yang ada di pelajaran topik itu. */
  async lessonText(domain: string, grade: string, code: string, key: string) {
    const [row] = await this.db
      .select({ categories: skillCatalogs.categories })
      .from(skillCatalogs)
      .where(and(eq(skillCatalogs.domain, domain), eq(skillCatalogs.grade, grade)));
    const cat = (row?.categories as { code: string; lesson?: unknown }[] | undefined)?.find(
      (c) => c.code === code,
    );
    const parsed = lessonSchema.safeParse(cat?.lesson);
    if (!parsed.success) return undefined;
    return lessonVoiceLines(parsed.data)[key];
  }

  // ------------------------------------------------------------ semua teks aplikasi (D-091)

  private globalList?: { at: number; list: VoiceAllowList };
  private readonly topicLists = new Map<string, { at: number; list: VoiceAllowList }>();
  private static readonly LIST_TTL = 10 * 60_000;

  /** Template i18n web (semua file `id/*.json`); kosong bila foldernya tidak ada (dicatat di log). */
  private i18nTemplates(): string[] {
    try {
      const dir = i18nDir();
      return readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .flatMap((f) => collectTexts(JSON.parse(readFileSync(join(dir, f), 'utf8'))));
    } catch (err) {
      this.log.warn(`teks i18n tidak terbaca (${(err as Error).message}); set I18N_DIR`);
      return [];
    }
  }

  /**
   * Daftar umum: template i18n, dialog Momo, teks katalog (judul, intro, tips, pelajaran manual), judul level,
   * dan kosakata aplikasi. Disusun ulang tiap 10 menit (suntingan admin ikut masuk).
   */
  async globalAllowList(): Promise<VoiceAllowList> {
    if (this.globalList && Date.now() - this.globalList.at < VoiceService.LIST_TTL)
      return this.globalList.list;
    const [catalogs, levels, dialog] = await Promise.all([
      this.db
        .select({ title: skillCatalogs.title, categories: skillCatalogs.categories })
        .from(skillCatalogs),
      this.db.select({ title: skills.title }).from(skills).where(eq(skills.status, 'active')),
      this.dialog(),
    ]);
    const texts = [
      ...collectTexts(catalogs),
      ...levels.flatMap((l) => [l.title, l.title.split('—').at(-1)!.trim()]),
      ...collectTexts(dialog.lines),
    ];
    const list = buildVoiceAllowList({
      texts,
      templates: this.i18nTemplates(),
      words: voiceVocabulary(),
    });
    this.globalList = { at: Date.now(), list };
    return list;
  }

  /** Teks satu soal (diturunkan ulang dari skill + seed + band). */
  async itemAllowList(skillId: string, seed: number, band: number) {
    const [row] = await this.db
      .select({ template: skills.template })
      .from(skills)
      .where(eq(skills.id, skillId));
    if (!row) return undefined;
    const template = skillTemplateSchema.parse(row.template);
    if (template.family === 'mock') return undefined;
    try {
      return buildVoiceAllowList({ texts: itemVoiceTexts(generateItem(template, { seed, band })) });
    } catch {
      return undefined;
    }
  }

  /** Teks pelajaran satu topik — manual atau otomatis (D-090) — termasuk soal contoh video. */
  async lessonAllowList(domain: string, grade: string, code: string) {
    const id = `${domain}/${grade}/${code}`;
    const hit = this.topicLists.get(id);
    if (hit && Date.now() - hit.at < VoiceService.LIST_TTL) return hit.list;
    const [cat] = await this.db
      .select({ categories: skillCatalogs.categories })
      .from(skillCatalogs)
      .where(and(eq(skillCatalogs.domain, domain), eq(skillCatalogs.grade, grade)));
    const category = (
      cat?.categories as
        { code: string; title: string; intro?: string; tips?: string[] }[] | undefined
    )?.find((c) => c.code === code);
    if (!category) return undefined;
    const rows = await this.db
      .select({ template: skills.template })
      .from(skills)
      .where(
        and(
          eq(skills.domain, domain),
          eq(skills.grade, grade),
          eq(skills.category, code),
          eq(skills.status, 'active'),
        ),
      );
    const levels: SkillTemplate[] = rows.flatMap((r) => {
      const p = skillTemplateSchema.safeParse(r.template);
      return p.success ? [p.data] : [];
    });
    const parsed = lessonSchema.safeParse((category as { lesson?: unknown }).lesson);
    const lesson = lessonFor(
      { ...category, ...(parsed.success && { lesson: parsed.data }) },
      levels,
    );
    const list = buildVoiceAllowList({ texts: lesson ? lessonVoiceTexts(lesson, levels) : [] });
    if (this.topicLists.size > 500) this.topicLists.clear();
    this.topicLists.set(id, { at: Date.now(), list });
    return list;
  }

  /**
   * Teks dari perangkat boleh dibuatkan suara? Hanya bila berasal dari aplikasi (daftar umum, soal yang sedang
   * tampil, atau pelajaran topik yang sedang dibuka) — tidak pernah teks bebas.
   */
  async sayAllowed(
    text: string,
    ctx: {
      item?: { skillId: string; seed: number; band: number };
      lesson?: string[];
      contest?: { entryId: string; index: number };
    },
  ) {
    const lists: VoiceAllowList[] = [await this.globalAllowList()];
    if (ctx.item) {
      const l = await this.itemAllowList(ctx.item.skillId, ctx.item.seed, ctx.item.band);
      if (l) lists.push(l);
    }
    if (ctx.lesson) {
      const [domain, grade, code] = ctx.lesson as [string, string, string];
      const l = await this.lessonAllowList(domain, grade, code);
      if (l) lists.push(l);
    }
    if (ctx.contest) {
      const [entry] = await this.db
        .select({ items: contestEntries.items })
        .from(contestEntries)
        .where(eq(contestEntries.id, ctx.contest.entryId));
      const it = (entry?.items as Item[] | undefined)?.[ctx.contest.index];
      if (it) lists.push(buildVoiceAllowList({ texts: itemVoiceTexts(it) }));
    }
    return voiceTextAllowed(text, lists);
  }

  /**
   * Kalimat yang PERSIS diucapkan aplikasi dan bisa dibuat lebih dulu (D-091): teks antarmuka anak tanpa isian,
   * "Dengarkan" di halaman topik, dan semua kalimat pelajaran (manual/otomatis: Video Momo + jawaban contoh,
   * layar, bacaan, titik jelajah). Soal tetap dibuat saat diputar (disiapkan lebih dulu oleh perangkat).
   */
  async pregenTexts(): Promise<{ text: string; profile?: VoiceProfile }[]> {
    const out = new Map<string, { text: string; profile?: VoiceProfile }>();
    const add = (text: string | undefined, profile?: VoiceProfile) => {
      const t = text?.trim();
      if (t && t.length <= 600) out.set(`${profile?.style ?? ''}|${t}`, { text: t, profile });
    };
    const dir = i18nDir();
    let tip = 'Ingat:';
    let wordRight = 'Tepat! {word}.';
    for (const f of ['play.json', 'contest.json', 'rank.json']) {
      try {
        const dict = JSON.parse(readFileSync(join(dir, f), 'utf8')) as Record<string, string>;
        if (f === 'play.json' && dict['topic.tip']) tip = dict['topic.tip'];
        if (f === 'play.json' && dict['peraga.wordRight']) wordRight = dict['peraga.wordRight'];
        for (const v of Object.values(dict)) if (!/\{\w+\}/.test(v)) add(v);
      } catch {
        /* folder i18n tidak ada: lewati */
      }
    }
    const catalogs = await this.db
      .select({
        domain: skillCatalogs.domain,
        grade: skillCatalogs.grade,
        categories: skillCatalogs.categories,
      })
      .from(skillCatalogs);
    const all = await this.db
      .select({ template: skills.template })
      .from(skills)
      .where(eq(skills.status, 'active'));
    const templates = all.flatMap((r) => {
      const p = skillTemplateSchema.safeParse(r.template);
      return p.success ? [p.data] : [];
    });
    for (const cat of catalogs) {
      const profile: VoiceProfile = {
        ...voiceProfileOf(`${cat.domain}.${cat.grade}.pelajaran`, 'prompt'),
        lang: 'id-ID',
      };
      for (const c of cat.categories as {
        code: string;
        title: string;
        intro?: string;
        tips?: string[];
        lesson?: unknown;
      }[]) {
        // Tombol "Dengarkan" di halaman topik (Topic.tsx: intro + "Ingat: tip").
        if (c.intro) add([c.intro, ...(c.tips ?? []).map((x) => `${tip} ${x}`)].join(' '));
        const levels = templates.filter(
          (t) => t.domain === cat.domain && t.grade === cat.grade && t.category === c.code,
        );
        const parsed = lessonSchema.safeParse(c.lesson);
        const lesson = lessonFor(
          {
            title: c.title,
            ...(c.intro && { intro: c.intro }),
            ...(c.tips && { tips: c.tips }),
            ...(parsed.success && { lesson: parsed.data }),
          },
          levels,
        );
        if (!lesson) continue;
        for (const screen of lesson.layar) {
          if (screen.jenis !== 'tonton') add(screen.suara, profile);
          for (const a of screen.adegan ?? []) {
            add(a.suara, profile);
            const skill = a.contoh && levels.find((k) => k.order === a.contoh!.level);
            if (skill)
              try {
                add(
                  exampleAnswerSay(generateItem(skill, { seed: a.contoh!.seed, band: 0 })),
                  profile,
                );
              } catch {
                /* contoh tidak bisa dibuat */
              }
          }
          for (const k of screen.kalimat ?? []) add(k.suara ?? k.teks, profile);
          for (const p of screen.titik ?? []) add(p.suara, profile);
          // Simulasi SD (D-093): semua kalimat yang dibacakan layar peraga.
          const pg = screen.peraga;
          if (pg) {
            const base = `${cat.domain}.${cat.grade}.pelajaran`;
            const en = VoiceService.sayProfile('en-GB', base);
            add(`${pg.aha} ${pg.tutup}`, profile);
            if (pg.tipe === 'jelajah') {
              add(pg.jelajahSuara, profile);
              for (const b of pg.bagian) {
                add(b.suara, profile);
                add(b.nama, profile);
              }
              for (const q of pg.tanya) {
                add(q.suara, profile);
                add(q.selesai, profile);
              }
            } else if (pg.tipe === 'proses') for (const t of pg.tahap) add(t.suara, profile);
            else if (pg.tipe === 'alat') {
              add(pg.pengantar, profile);
              for (const l of pg.langkah as { suara?: string; selesai?: string }[]) {
                add(l.suara, profile);
                add(l.selesai, profile);
              }
            } else {
              add(pg.pengantar, profile);
              for (const k of pg.kata) {
                add(k.en, en);
                add(k.id, profile);
                if (k.kalimat) add(k.kalimat, en);
                add(wordRight.replace('{word}', k.en), profile);
              }
            }
          }
        }
      }
    }
    // Angka yang diucapkan alat peraga & game (garis bilangan, blok puluhan, hitung): per jenjang (gaya/kecepatan).
    for (const [base, max] of [
      ['math.tk.pelajaran', 120],
      ['math.sd1.pelajaran', 1000],
    ] as const) {
      const p = VoiceService.sayProfile('id-ID', base);
      for (let n = 0; n <= max; n++) add(numberWord(n), p);
    }
    return [...out.values()];
  }

  /** Buat lebih dulu klip `pregenTexts` yang belum ada (CLI `voice:generate -- --all`). */
  async generateAll(
    opts: {
      dryRun?: boolean;
      max?: number;
      parallel?: number;
      gapMs?: number;
      retryWaitMs?: number;
      onProgress?: (done: number, total: number, created: number, failed: number) => void;
    } = {},
  ) {
    const s = await this.settings.get('voice');
    const list = await this.pregenTexts();
    const missing: typeof list = [];
    for (const x of list) if (!(await this.hasClip(x.text, x.profile))) missing.push(x);
    const chars = missing.reduce(
      (n, x) => n + speechText(x.text, x.profile?.lang ?? 'id-ID').length,
      0,
    );
    if (opts.dryRun)
      return { total: list.length, missing: missing.length, chars, created: 0, failed: 0 };
    let created = 0;
    let failed = 0;
    let todo = missing.slice(0, opts.max ?? missing.length);
    const total = todo.length;
    // Kuota Google Chirp 3 HD ±200 permintaan/menit per proyek: 5 klip tiap 2 detik (±150/menit). Yang gagal
    // (mis. 429 kuota) dicoba lagi setelah jeda 65 detik, maks. 3 putaran.
    const batch = Math.max(1, Math.min(10, opts.parallel ?? 5));
    const gapMs = opts.gapMs ?? 2000;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    for (let round = 0; round < 4 && todo.length; round++) {
      if (round > 0) await wait(opts.retryWaitMs ?? 65_000);
      const retry: typeof todo = [];
      for (let i = 0; i < todo.length; i += batch) {
        const started = Date.now();
        const part = todo.slice(i, i + batch);
        const done = await Promise.all(part.map((x) => this.ensure(x.text, s, x.profile)));
        done.forEach((k, j) => (k ? created++ : retry.push(part[j]!)));
        if (opts.onProgress && (created % 200 < batch || i + batch >= todo.length))
          opts.onProgress(created, total, created, retry.length);
        const left = gapMs - (Date.now() - started);
        if (left > 0) await wait(left);
      }
      todo = retry;
    }
    failed = todo.length;
    return { total: list.length, missing: missing.length, chars, created, failed };
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
