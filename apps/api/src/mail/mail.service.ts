import {
  Inject,
  Injectable,
  Logger,
  Optional,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import { DB, type Db } from '../db/db.module.js';
import { emailOutbox } from '../db/schema.js';
import type { MailContent, MailContext } from './templates.js';
import { MOMO_LOGO_CID, MOMO_LOGO_PNG_BASE64 } from './logo.js';

/** Pengirim email. Di test diganti pengirim palsu lewat token ini. */
export type MailTransport = {
  send(msg: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void>;
};
export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

/** Konfigurasi dari .env (D-044). Password = App Password Gmail, hanya di server. */
export function mailConfig() {
  const user = process.env.SMTP_USER?.trim() ?? '';
  const port = Number(process.env.SMTP_PORT || 465);
  return {
    host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
    port,
    // 465 = TLS langsung; 587 = STARTTLS (secure false + requireTLS). SMTP_SECURE hanya bila perlu memaksa.
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE !== 'false' : port === 465,
    user,
    pass: (process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD ?? '').replace(/\s+/g, ''),
    from:
      process.env.MAIL_FROM?.trim() ||
      (user ? `Udakids <${user}>` : 'Udakids <no-reply@localhost>'),
    director: (process.env.MAIL_DIRECTOR ?? 'udacodingofficial@gmail.com')
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
    appUrl:
      process.env.APP_PUBLIC_URL?.trim() ||
      process.env.WEB_ORIGIN?.split(',')[0]?.trim() ||
      'http://localhost:6006',
    brand: process.env.MAIL_BRAND?.trim() || 'Udakids',
  };
}

/** SMTP (Gmail) via nodemailer; null bila SMTP_USER/SMTP_PASS kosong. */
export function smtpFromEnv(): MailTransport | null {
  const c = mailConfig();
  if (!c.user || !c.pass) return null;
  const tx = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: { user: c.user, pass: c.pass },
    requireTLS: !c.secure,
    tls: { minVersion: 'TLSv1.2' },
  });
  return {
    async send(msg) {
      await tx.sendMail({
        ...msg,
        // Logo Momo ditempel sebagai lampiran inline bila template memakainya.
        ...(msg.html.includes(`cid:${MOMO_LOGO_CID}`) && {
          attachments: [
            {
              filename: 'momo.png',
              content: Buffer.from(MOMO_LOGO_PNG_BASE64, 'base64'),
              contentType: 'image/png',
              cid: MOMO_LOGO_CID,
              contentDisposition: 'inline' as const,
            },
          ],
        }),
      });
    },
  };
}

/** Kode verifikasi (6 angka) tidak boleh terlihat di admin/riwayat. */
const maskCodes = (subject: string) => subject.replace(/\b\d{6}\b/g, '••••••');

/** Jeda percobaan ulang: 1 mnt, 5 mnt, 30 mnt, 2 jam, 12 jam → gagal. */
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3600_000, 12 * 3600_000];
const TICK_MS = Number(process.env.MAIL_TICK_MS ?? 15_000);
/** Maksimal email info materi baru per 24 jam (kuota Gmail ±500/hari dibagi dengan email penting). */
const NEWS_DAILY_CAP = Number(process.env.NEWS_DAILY_CAP ?? 400);

/**
 * Antrean email (D-044): `enqueue` menulis ke `email_outbox`, pekerja mengirim berkala dengan percobaan
 * ulang. Setelah terkirim, isi email dihapus (hanya metadata yang disimpan). Tanpa SMTP: di produksi email
 * tetap antre (status `waiting_smtp`); di dev isinya dicetak ke log agar alur verifikasi tetap bisa dicoba.
 */
@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Mail');
  private timer?: ReturnType<typeof setInterval>;
  private current: Promise<number> = Promise.resolve(0);
  private readonly transport: MailTransport | null;

  constructor(
    @Inject(DB) private readonly db: Db,
    @Optional() @Inject(MAIL_TRANSPORT) transport?: MailTransport | null,
  ) {
    this.transport = transport === undefined ? smtpFromEnv() : transport;
  }

  get ready() {
    return !!this.transport;
  }

  ctx(): MailContext {
    const c = mailConfig();
    return { appUrl: c.appUrl, brand: c.brand };
  }

  onModuleInit() {
    if (process.env.MAIL_WORKER === 'off') return;
    this.timer = setInterval(
      () => void this.flush().catch((err: unknown) => this.log.warn(String(err))),
      TICK_MS,
    );
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Masukkan ke antrean lalu coba kirim segera (tanpa menunggu). */
  async enqueue(to: string | string[], mail: MailContent, meta: { kind: string; refId?: string }) {
    const list = [
      ...new Set(
        (Array.isArray(to) ? to : [to]).map((x) => x.trim().toLowerCase()).filter(Boolean),
      ),
    ];
    if (list.length === 0) return [];
    const rows = await this.db
      .insert(emailOutbox)
      .values(
        list.map((toEmail) => ({
          toEmail,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          kind: meta.kind,
          refId: meta.refId ?? null,
        })),
      )
      .returning({ id: emailOutbox.id });
    void this.flush().catch((err: unknown) => this.log.warn(String(err)));
    return rows.map((r) => r.id);
  }

  /** Salinan untuk direksi (MAIL_DIRECTOR). */
  async notifyDirector(mail: MailContent, meta: { kind: string; refId?: string }) {
    return this.enqueue(mailConfig().director, mail, meta);
  }

  /** Kirim email yang jatuh tempo. Panggilan bersamaan diantrekan (satu per satu, tanpa kirim ganda). */
  flush(now?: Date): Promise<number> {
    const next = this.current.catch(() => 0).then(() => this.flushOnce(now));
    this.current = next;
    return next;
  }

  private async flushOnce(at?: Date): Promise<number> {
    let sent = 0;
    const now = at ?? new Date();
    const due = await this.db
      .select()
      .from(emailOutbox)
      .where(
        and(
          inArray(emailOutbox.status, ['queued', 'retry', 'waiting_smtp']),
          // Tanpa waktu eksplisit: pakai jam database (sama dengan default `next_attempt_at`), agar email yang
          // baru masuk tidak tertunda karena selisih milidetik antara jam Node dan jam Postgres.
          at ? lte(emailOutbox.nextAttemptAt, at) : sql`${emailOutbox.nextAttemptAt} <= now()`,
        ),
      )
      // Email penting (verifikasi, transaksi) didahulukan; info materi baru (D-053) belakangan.
      .orderBy(sql`(${emailOutbox.kind} = 'news')`, emailOutbox.createdAt)
      .limit(20);
    const from = mailConfig().from;
    // Batas harian info materi baru agar tidak melewati kuota Gmail (±500/hari, D-053).
    const since = new Date(now.getTime() - 24 * 3600_000);
    const [{ n: newsToday } = { n: 0 }] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(emailOutbox)
      .where(
        and(
          eq(emailOutbox.kind, 'news'),
          inArray(emailOutbox.status, ['sent', 'logged']),
          gte(emailOutbox.sentAt, since),
        ),
      );
    let newsBudget = NEWS_DAILY_CAP - Number(newsToday);
    for (const m of due) {
      if (m.kind === 'news' && this.transport) {
        if (newsBudget <= 0) {
          await this.db
            .update(emailOutbox)
            .set({ nextAttemptAt: new Date(now.getTime() + 3 * 3600_000) })
            .where(eq(emailOutbox.id, m.id));
          continue;
        }
        newsBudget--;
      }
      if (!this.transport) {
        if (process.env.NODE_ENV !== 'production' && m.status !== 'logged') {
          this.log.log(`[dev, tanpa SMTP] ke ${m.toEmail}: ${m.subject}\n${m.text ?? ''}`);
          await this.db
            .update(emailOutbox)
            .set({ status: 'logged', subject: maskCodes(m.subject), html: null, text: null })
            .where(eq(emailOutbox.id, m.id));
        } else if (m.status !== 'waiting_smtp') {
          await this.db
            .update(emailOutbox)
            .set({ status: 'waiting_smtp', nextAttemptAt: new Date(now.getTime() + 5 * 60_000) })
            .where(eq(emailOutbox.id, m.id));
        }
        continue;
      }
      try {
        await this.transport.send({
          from,
          to: m.toEmail,
          subject: m.subject,
          html: m.html ?? '',
          text: m.text ?? '',
        });
        await this.db
          .update(emailOutbox)
          .set({
            status: 'sent',
            sentAt: new Date(),
            subject: maskCodes(m.subject),
            html: null,
            text: null,
            lastError: null,
            attempts: m.attempts + 1,
          })
          .where(eq(emailOutbox.id, m.id));
        sent++;
      } catch (err) {
        const attempts = m.attempts + 1;
        const failed = attempts > BACKOFF_MS.length;
        const message = (err as Error).message?.slice(0, 300) ?? 'gagal';
        this.log.warn(`gagal kirim ke ${m.toEmail} (${attempts}×): ${message}`);
        await this.db
          .update(emailOutbox)
          .set({
            status: failed ? 'failed' : 'retry',
            attempts,
            lastError: message,
            nextAttemptAt: new Date(now.getTime() + (BACKOFF_MS[attempts - 1] ?? 0)),
          })
          .where(eq(emailOutbox.id, m.id));
      }
    }
    return sent;
  }

  /** Ringkasan untuk admin (tanpa isi email). */
  async overview() {
    const c = mailConfig();
    const counts = await this.db
      .select({ status: emailOutbox.status, n: sql<number>`count(*)::int` })
      .from(emailOutbox)
      .groupBy(emailOutbox.status);
    const recent = await this.db
      .select({
        id: emailOutbox.id,
        toEmail: emailOutbox.toEmail,
        subject: emailOutbox.subject,
        kind: emailOutbox.kind,
        status: emailOutbox.status,
        attempts: emailOutbox.attempts,
        lastError: emailOutbox.lastError,
        createdAt: emailOutbox.createdAt,
        sentAt: emailOutbox.sentAt,
      })
      .from(emailOutbox)
      .orderBy(desc(emailOutbox.createdAt))
      .limit(50);
    return {
      configured: this.ready,
      host: c.host,
      port: c.port,
      from: c.from,
      user: c.user ? c.user.replace(/^(.).*(@.*)$/, '$1•••$2') : null,
      director: c.director,
      appUrl: c.appUrl,
      counts: Object.fromEntries(counts.map((x) => [x.status, x.n])),
      recent: recent.map((r) => ({ ...r, subject: maskCodes(r.subject) })),
    };
  }

  /** Kirim ulang email gagal (isi masih ada karena belum terkirim). */
  async retry(id: string) {
    const [row] = await this.db
      .update(emailOutbox)
      .set({ status: 'queued', nextAttemptAt: new Date(), lastError: null })
      .where(
        and(
          eq(emailOutbox.id, id),
          inArray(emailOutbox.status, ['failed', 'retry', 'waiting_smtp']),
        ),
      )
      .returning({ id: emailOutbox.id });
    if (row) void this.flush().catch(() => 0);
    return !!row;
  }
}
