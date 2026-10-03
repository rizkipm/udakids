import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { jwtSecret } from '../common/config.js';
import { DB, type Db } from '../db/db.module.js';
import { appSettings, parents, skillCatalogs, skills } from '../db/schema.js';
import { MailService } from '../mail/mail.service.js';
import { newContent, newsDirectorCopy, type NewsBook } from '../mail/templates.js';

const stateSchema = z.object({
  enabled: z.boolean().default(true),
  /** Skill dengan created_at > lastAt belum diumumkan. */
  lastAt: z.string().default(() => new Date().toISOString()),
  lastSentAt: z.string().nullable().default(null),
  lastRecipients: z.number().int().default(0),
  lastLevels: z.number().int().default(0),
});
export type NewsState = z.infer<typeof stateSchema>;

/** Tunggu sampai tidak ada skill baru selama ini (seed/admin selesai), lalu kirim satu email gabungan. */
export const NEWS_QUIET_MS = Number(process.env.NEWS_QUIET_MS ?? 30 * 60_000);
/** Paling sering satu email info materi baru per hari. */
export const NEWS_MIN_GAP_MS = Number(process.env.NEWS_MIN_GAP_MS ?? 24 * 3600_000);
const TICK_MS = Number(process.env.NEWS_TICK_MS ?? 5 * 60_000);

/** Token berhenti berlangganan (HMAC, tanpa kolom tambahan; tidak bisa ditebak). */
export const unsubscribeToken = (parentId: string) =>
  createHmac('sha256', jwtSecret()).update(`news:${parentId}`).digest('base64url').slice(0, 32);
export function validUnsubscribe(parentId: string, token: string) {
  const want = Buffer.from(unsubscribeToken(parentId));
  const got = Buffer.from(token);
  return want.length === got.length && timingSafeEqual(want, got);
}

/**
 * Info materi baru (D-053): setiap ada skill aktif baru, semua orang tua terverifikasi yang belum berhenti
 * berlangganan mendapat SATU email gabungan — dikirim setelah tidak ada skill baru selama 30 menit dan paling
 * sering sekali sehari, lewat antrean email (batas harian Gmail dijaga MailService).
 */
@Injectable()
export class NewsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('News');
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly mail: MailService,
  ) {}

  onModuleInit() {
    if (process.env.MAIL_WORKER === 'off' || process.env.NEWS_WORKER === 'off') return;
    this.timer = setInterval(
      () => void this.maybeSend().catch((err: unknown) => this.log.warn(String(err))),
      TICK_MS,
    );
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async state(): Promise<NewsState> {
    const [row] = await this.db.select().from(appSettings).where(eq(appSettings.key, 'news'));
    return stateSchema.parse(row?.value ?? {});
  }

  private async save(s: NewsState, userId: string | null = null) {
    await this.db
      .insert(appSettings)
      .values({ key: 'news', value: s, updatedBy: userId })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: s, updatedBy: userId, updatedAt: new Date() },
      });
  }

  async setEnabled(enabled: boolean, userId: string) {
    const s = await this.state();
    await this.save({ ...s, enabled }, userId);
    return this.overview();
  }

  /** Skill aktif yang belum diumumkan, dikelompokkan per buku. */
  async pending(s?: NewsState) {
    const st = s ?? (await this.state());
    const rows = await this.db
      .select({
        domain: skills.domain,
        grade: skills.grade,
        category: skills.category,
        createdAt: skills.createdAt,
      })
      .from(skills)
      // Bandingkan di Postgres (presisi mikrodetik), bukan Date JavaScript (milidetik).
      .where(
        and(eq(skills.status, 'active'), sql`${skills.createdAt} > ${st.lastAt}::timestamptz`),
      );
    const cats = await this.db.select().from(skillCatalogs);
    const byBook = new Map<string, { title: string; topics: Set<string>; levels: number }>();
    for (const r of rows) {
      const key = `${r.domain}/${r.grade}`;
      const cat = cats.find((c) => c.domain === r.domain && c.grade === r.grade);
      const topic =
        (cat?.categories as { code: string; title: string }[] | undefined)?.find(
          (c) => c.code === r.category,
        )?.title ?? r.category;
      const b = byBook.get(key) ?? { title: cat?.title ?? key, topics: new Set(), levels: 0 };
      b.topics.add(topic);
      b.levels++;
      byBook.set(key, b);
    }
    const books: NewsBook[] = [...byBook.values()].map((b) => ({
      title: b.title,
      topics: [...b.topics],
      levels: b.levels,
    }));
    const newest = rows.reduce((m, r) => Math.max(m, r.createdAt.getTime()), 0);
    // Batas berikutnya disimpan sebagai teks dari Postgres agar tidak kehilangan mikrodetik.
    const [mx] = rows.length
      ? await this.db
          .select({ t: sql<string>`max(${skills.createdAt})::text` })
          .from(skills)
          .where(
            and(eq(skills.status, 'active'), sql`${skills.createdAt} > ${st.lastAt}::timestamptz`),
          )
      : [];
    return {
      books,
      total: rows.length,
      newest: newest ? new Date(newest) : null,
      newestText: mx?.t ?? null,
    };
  }

  private recipientsQuery() {
    return this.db
      .select({ id: parents.id, name: parents.name, email: parents.email })
      .from(parents)
      .where(
        and(
          eq(parents.active, true),
          isNotNull(parents.emailVerifiedAt),
          isNull(parents.newsOptOutAt),
        ),
      );
  }

  /** Waktu kirim berikutnya (null = tidak ada yang menunggu). */
  nextSendAt(s: NewsState, newest: Date | null) {
    if (!newest) return null;
    const quiet = newest.getTime() + NEWS_QUIET_MS;
    const gap = s.lastSentAt ? new Date(s.lastSentAt).getTime() + NEWS_MIN_GAP_MS : 0;
    return new Date(Math.max(quiet, gap));
  }

  /** Dipanggil berkala; `force` = admin "kirim sekarang" (tetap butuh materi baru). */
  async maybeSend(now = new Date(), force = false) {
    const s = await this.state();
    if (!s.enabled && !force) return { sent: false as const, reason: 'nonaktif' };
    const p = await this.pending(s);
    if (p.total === 0) return { sent: false as const, reason: 'tidak ada materi baru' };
    const at = this.nextSendAt(s, p.newest)!;
    if (!force && at > now) return { sent: false as const, reason: 'menunggu', at };
    const base = this.mail.ctx().appUrl.replace(/\/$/, '');
    const list = await this.recipientsQuery();
    for (const r of list) {
      const url = `${base}/berhenti-langganan?p=${r.id}&t=${unsubscribeToken(r.id)}`;
      await this.mail.enqueue(
        r.email,
        newContent(this.mail.ctx(), {
          name: r.name,
          books: p.books,
          total: p.total,
          unsubscribeUrl: url,
        }),
        { kind: 'news', refId: r.id },
      );
    }
    await this.mail.notifyDirector(
      newsDirectorCopy(this.mail.ctx(), {
        books: p.books,
        total: p.total,
        recipients: list.length,
      }),
      { kind: 'director_news' },
    );
    await this.save({
      ...s,
      lastAt: p.newestText!,
      lastSentAt: now.toISOString(),
      lastRecipients: list.length,
      lastLevels: p.total,
    });
    this.log.log(`info materi baru: ${p.total} level → ${list.length} orang tua`);
    return { sent: true as const, recipients: list.length, levels: p.total };
  }

  async overview() {
    const s = await this.state();
    const p = await this.pending(s);
    const [count] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(parents)
      .where(
        and(
          eq(parents.active, true),
          isNotNull(parents.emailVerifiedAt),
          isNull(parents.newsOptOutAt),
        ),
      );
    const [out] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(parents)
      .where(isNotNull(parents.newsOptOutAt));
    return {
      enabled: s.enabled,
      lastSentAt: s.lastSentAt,
      lastRecipients: s.lastRecipients,
      lastLevels: s.lastLevels,
      pending: { total: p.total, books: p.books },
      nextSendAt: s.enabled ? (this.nextSendAt(s, p.newest)?.toISOString() ?? null) : null,
      subscribers: Number(count?.n ?? 0),
      unsubscribed: Number(out?.n ?? 0),
    };
  }

  async setSubscribed(parentId: string, subscribed: boolean) {
    await this.db
      .update(parents)
      .set({ newsOptOutAt: subscribed ? null : new Date() })
      .where(eq(parents.id, parentId));
    return { subscribed };
  }

  async subscribed(parentId: string) {
    const [r] = await this.db
      .select({ out: parents.newsOptOutAt })
      .from(parents)
      .where(eq(parents.id, parentId));
    return { subscribed: !r?.out };
  }
}
