import { Controller, Get, Inject, Sse, type MessageEvent } from '@nestjs/common';
import { DOMAINS, GRADES, MAX_CHILDREN_PER_PARENT, QUIZ_LENGTH } from '@little-coder/engine';
import { and, count, eq, gt, sql } from 'drizzle-orm';
import {
  distinctUntilChanged,
  from,
  interval,
  map,
  startWith,
  switchMap,
  type Observable,
} from 'rxjs';
import { Public } from '../auth/decorators.js';
import { BillingService } from '../billing/billing.service.js';
import { DB, type Db } from '../db/db.module.js';
import { SettingsService } from '../settings/settings.service.js';
import {
  children,
  events,
  parents,
  skillCatalogs,
  skillMastery,
  skills,
  staffUsers,
} from '../db/schema.js';

/** Anak dianggap "sedang belajar" bila aktif (sinkron/masuk) dalam 10 menit terakhir. */
export const ACTIVE_WINDOW_MS = 10 * 60_000;
/** Jeda kirim ulang statistik ke landing (SSE). */
export const STATS_TICK_MS = 10_000;

export type PublicStats = {
  books: number;
  totalLevels: number;
  /** Total soal latihan = level × 10 soal per ronde (soal diacak ulang setiap main). */
  totalQuestions: number;
  /** Total soal yang sudah dijawab semua anak (D-045). */
  answered: number;
  users: number;
  learners: number;
  activeNow: number;
  rounds: number;
  updatedAt: string;
};

/**
 * Data publik untuk halaman depan (tanpa login, D-030): daftar buku Pustaka dari database — judul,
 * jumlah topik & level aktif, dan beberapa judul topik. Tidak ada data anak/akun di sini.
 */
/**
 * Rujukan kurikulum per buku untuk landing, diturunkan dari kunci tag skill (bukan ditulis manual). `ixlRef` hanya
 * rujukan internal tim konten, jadi tidak pernah ditampilkan.
 */
const STANDARD_OF_TAG: Record<string, string> = {
  merdeka: 'merdeka',
  'fase-merdeka': 'merdeka',
  sg: 'singapore',
  cambridge: 'cambridge',
  osn: 'osn',
  'timss-kognitif': 'timss',
  ngss: 'ngss',
  ccss: 'ccss',
  cc: 'ccss',
  'common-core': 'ccss',
};
/** Buku bergaya olimpiade walau skillnya belum bertag `osn`. */
const OSN_GRADES = new Set(['tkosn', 'sd12', 'sd34', 'sd56', 'smp79']);
const STANDARD_ORDER = [
  'merdeka',
  'singapore',
  'cambridge',
  'timss',
  'osn',
  'ngss',
  'ccss',
] as const;

@Controller('public')
export class PublicController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly billing: BillingService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Info afiliasi & batas anak untuk landing (D-063): angka selalu mengikuti pengaturan admin. Tanpa data akun.
   */
  @Public()
  @Get('affiliate')
  async affiliate() {
    const s = await this.settings.get('affiliate');
    return {
      enabled: s.enabled,
      signupBonus: s.signupBonus,
      commissionBp: s.commissionBp,
      minPayout: s.minPayout,
      qualifyRounds: s.qualifyRounds,
      maxChildren: MAX_CHILDREN_PER_PARENT,
    };
  }

  /** Harga untuk landing (D-036/D-038): level gratis + paket aktif (harga normal & diskon). */
  @Public()
  @Get('pricing')
  async pricing() {
    const s = await this.settings.get('billing');
    const packages = s.paywall ? await this.billing.activePackages() : [];
    return {
      paywall: s.paywall,
      freeLevels: s.freeLevels,
      packages: packages.map(
        ({ id, name, description, scope, books, durationDays, pricing, discountEndsAt }) => ({
          id,
          name,
          description,
          scope,
          books,
          durationDays,
          pricing,
          discountEndsAt,
        }),
      ),
    };
  }

  private cache?: { at: number; value: PublicStats };

  /**
   * Statistik agregat untuk landing (D-033): jumlah buku, level, pengguna aktif (orang tua + anak + staf),
   * anak yang sedang belajar (aktif ≤10 menit), dan total ronde. Hanya angka — tanpa data pribadi.
   * Di-cache 5 detik agar banyak pengunjung tidak membebani database.
   */
  async stats(now = Date.now()): Promise<PublicStats> {
    if (this.cache && now - this.cache.at < 5_000) return this.cache.value;
    const [{ books, totalLevels }, [p], [c], [s], [a], [r], [ans]] = await Promise.all([
      this.books(),
      this.db.select({ n: count() }).from(parents).where(eq(parents.active, true)),
      this.db.select({ n: count() }).from(children).where(eq(children.active, true)),
      this.db.select({ n: count() }).from(staffUsers).where(eq(staffUsers.active, true)),
      this.db
        .select({ n: count() })
        .from(children)
        .where(
          and(
            eq(children.active, true),
            gt(children.lastActiveAt, new Date(now - ACTIVE_WINDOW_MS)),
          ),
        ),
      this.db.select({ n: count() }).from(events).where(eq(events.type, 'quiz_result')),
      this.db
        .select({ n: sql<number>`coalesce(sum(${skillMastery.answered}), 0)::int` })
        .from(skillMastery),
    ]);
    const learners = Number(c?.n ?? 0);
    const value: PublicStats = {
      books: books.length,
      totalLevels,
      totalQuestions: totalLevels * QUIZ_LENGTH,
      answered: Number(ans?.n ?? 0),
      users: Number(p?.n ?? 0) + learners + Number(s?.n ?? 0),
      learners,
      activeNow: Number(a?.n ?? 0),
      rounds: Number(r?.n ?? 0),
      updatedAt: new Date(now).toISOString(),
    };
    this.cache = { at: now, value };
    return value;
  }

  @Public()
  @Get('stats')
  getStats() {
    return this.stats();
  }

  /** Statistik realtime (Server-Sent Events): dikirim saat tersambung, lalu tiap ada perubahan (cek 10 dtk). */
  @Public()
  @Sse('stats/stream')
  statsStream(): Observable<MessageEvent> {
    return interval(STATS_TICK_MS).pipe(
      startWith(0),
      switchMap(() => from(this.stats())),
      map(({ updatedAt: _u, ...rest }) => rest),
      distinctUntilChanged((x, y) => JSON.stringify(x) === JSON.stringify(y)),
      map((data) => ({ data: { ...data, updatedAt: new Date().toISOString() } })),
    );
  }

  @Public()
  @Get('books')
  async books() {
    const catalogs = await this.db.select().from(skillCatalogs);
    const levelCounts = await this.db
      .select({ domain: skills.domain, grade: skills.grade, n: count() })
      .from(skills)
      .where(eq(skills.status, 'active'))
      .groupBy(skills.domain, skills.grade);
    const levels = new Map(levelCounts.map((r) => [`${r.domain}/${r.grade}`, Number(r.n)]));
    const tagRows = await this.db.execute(sql`
      select s.domain, s.grade, array_agg(distinct k.key) as keys
      from skills s, jsonb_object_keys(coalesce(s.template->'tags', '{}'::jsonb)) as k(key)
      where s.status = 'active'
      group by s.domain, s.grade`);
    const standards = new Map<string, string[]>();
    for (const r of tagRows.rows) {
      const found = new Set(
        (r.keys as string[]).map((key) => STANDARD_OF_TAG[key]).filter((x): x is string => !!x),
      );
      if (OSN_GRADES.has(String(r.grade))) found.add('osn');
      standards.set(
        `${String(r.domain)}/${String(r.grade)}`,
        STANDARD_ORDER.filter((x) => found.has(x)),
      );
    }
    const rank = (g: string) => GRADES.indexOf(g as (typeof GRADES)[number]);
    // Urutan mata pelajaran = DOMAINS (math, sains, english, ...), bukan abjad.
    const domainRank = (d: string) => DOMAINS.indexOf(d as (typeof DOMAINS)[number]);
    const books = catalogs
      .map((c) => {
        const cats = c.categories as { code: string; title: string }[];
        return {
          domain: c.domain,
          grade: c.grade,
          title: c.title,
          topics: cats.length,
          levels: levels.get(`${c.domain}/${c.grade}`) ?? 0,
          sampleTopics: cats.slice(0, 4).map((x) => x.title),
          standards: standards.get(`${c.domain}/${c.grade}`) ?? [],
        };
      })
      .filter((b) => b.levels > 0)
      .sort((a, b) => domainRank(a.domain) - domainRank(b.domain) || rank(a.grade) - rank(b.grade));
    return { books, totalLevels: books.reduce((a, b) => a + b.levels, 0) };
  }
}
