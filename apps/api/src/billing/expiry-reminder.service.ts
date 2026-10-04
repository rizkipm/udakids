import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { and, eq, gt, inArray, isNotNull, sql } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module.js';
import { children, emailOutbox, entitlements, parents } from '../db/schema.js';
import { MailService } from '../mail/mail.service.js';
import { expiryReminder } from '../mail/templates.js';

/** Hari sebelum berakhir saat pengingat dikirim (D-054). */
export const EXPIRY_REMINDER_DAYS = [5, 3, 1] as const;
const DAY = 86_400_000;
const TICK_MS = Number(process.env.EXPIRY_TICK_MS ?? 60 * 60_000);

/**
 * Pengingat masa paket Premium lewat email (D-054): H-5, H-3, dan H-1 sebelum berakhir, sekali per hari
 * pengingat per hak akses (dicatat di email_outbox: kind `expiry_<n>`, refId = id hak akses). Email layanan
 * (bukan promosi) ke orang tua terverifikasi; tidak dikirim bila keluarga sudah punya paket lain yang aktif
 * lebih lama (sudah memperpanjang).
 */
@Injectable()
export class ExpiryReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Expiry');
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly mail: MailService,
  ) {}

  onModuleInit() {
    if (process.env.MAIL_WORKER === 'off') return;
    void this.run().catch((err: unknown) => this.log.warn(String(err)));
    this.timer = setInterval(
      () => void this.run().catch((err: unknown) => this.log.warn(String(err))),
      TICK_MS,
    );
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Sisa hari dibulatkan ke atas: berakhir 2,3 hari lagi → "3 hari lagi". */
  static daysLeft(endsAt: Date, now: Date) {
    return Math.ceil((endsAt.getTime() - now.getTime()) / DAY);
  }

  async run(now = new Date()): Promise<number> {
    const horizon = new Date(now.getTime() + (Math.max(...EXPIRY_REMINDER_DAYS) + 1) * DAY);
    const rows = await this.db
      .select({
        id: entitlements.id,
        name: entitlements.name,
        endsAt: entitlements.endsAt,
        parentId: entitlements.parentId,
        childId: entitlements.childId,
      })
      .from(entitlements)
      .where(
        and(
          isNotNull(entitlements.endsAt),
          gt(entitlements.endsAt, now),
          sql`${entitlements.endsAt} <= ${horizon}`,
        ),
      );
    let sent = 0;
    for (const e of rows) {
      const days = ExpiryReminderService.daysLeft(e.endsAt!, now);
      if (!(EXPIRY_REMINDER_DAYS as readonly number[]).includes(days)) continue;
      const kind = `expiry_${days}`;
      const [dupe] = await this.db
        .select({ id: emailOutbox.id })
        .from(emailOutbox)
        .where(and(eq(emailOutbox.kind, kind), eq(emailOutbox.refId, e.id)))
        .limit(1);
      if (dupe) continue;

      // Penerima: orang tua pemilik paket, atau orang tua dari anak yang diberi Premium khusus.
      let parentId = e.parentId;
      let childName: string | null = null;
      if (!parentId && e.childId) {
        const [c] = await this.db
          .select({ parentId: children.parentId, nickname: children.nickname })
          .from(children)
          .where(eq(children.id, e.childId));
        parentId = c?.parentId ?? null;
        childName = c?.nickname ?? null;
      }
      if (!parentId) continue;
      const [p] = await this.db
        .select({
          name: parents.name,
          email: parents.email,
          verified: parents.emailVerifiedAt,
          active: parents.active,
        })
        .from(parents)
        .where(eq(parents.id, parentId));
      if (!p?.verified || !p.active) continue;

      // Sudah diperpanjang (ada hak akses keluarga lain yang lebih lama/selamanya) → tidak perlu diingatkan.
      const owners = [parentId, ...(e.childId ? [e.childId] : [])];
      const [longer] = await this.db
        .select({ id: entitlements.id })
        .from(entitlements)
        .where(
          and(
            sql`${entitlements.id} <> ${e.id}`,
            sql`(${inArray(entitlements.parentId, [parentId])} or ${inArray(entitlements.childId, owners)})`,
            sql`(${entitlements.endsAt} is null or ${entitlements.endsAt} > ${e.endsAt})`,
          ),
        )
        .limit(1);
      if (longer) continue;

      await this.mail.enqueue(
        p.email,
        expiryReminder(this.mail.ctx(), {
          name: p.name,
          packageName: e.name,
          endsAt: e.endsAt!,
          daysLeft: days,
          childName,
        }),
        { kind, refId: e.id },
      );
      sent++;
    }
    if (sent) this.log.log(`pengingat masa paket: ${sent} email`);
    return sent;
  }
}
