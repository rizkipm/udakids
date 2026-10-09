import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  Logger,
  Optional,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  accessFrom,
  adminWhatsappHref,
  entitlementEnd,
  FREE_ACCESS,
  OPEN_ORDER_STATUSES,
  pickUniqueCode,
  pricing,
  type Access,
  type OrderStatus,
} from '@little-coder/engine';
import { and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import { jakartaDate } from '../common/dates.js';
import { randomCode } from '../common/crypto.js';
import { DB, type Db } from '../db/db.module.js';
import {
  cashEntries,
  children,
  classes,
  emailOutbox,
  entitlements,
  orders,
  packages,
  parents,
  paymentMethods,
} from '../db/schema.js';
import { SettingsService } from '../settings/settings.service.js';
import { AffiliateService } from '../affiliate/affiliate.service.js';
import { MailService } from '../mail/mail.service.js';
import {
  directorNotice,
  orderCreated,
  orderFollowUp,
  orderPaid,
  orderRejected,
  proofReceived,
  type OrderMail,
} from '../mail/templates.js';

type PackageRow = typeof packages.$inferSelect;
/** Follow up pesanan belum dibayar (admin → email orang tua): status yang boleh & jeda minimal. */
export const FOLLOW_UP_STATUSES: readonly OrderStatus[] = ['awaiting_payment', 'expired'];
export const FOLLOW_UP_COOLDOWN_MS = 24 * 3600_000;
const FOLLOW_UP_KIND = 'order_followup';
/** Pesanan terbuka (menunggu bayar/verifikasi) maksimal per keluarga. */
export const MAX_OPEN_ORDERS = 3;
type Book = { domain: string; grade: string };

/** Tanggal kalender WIB (YYYY-MM-DD) untuk buku kas. */
export { jakartaDate } from '../common/dates.js';

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/** Paket dalam bentuk untuk tampilan: harga normal, potongan, harga akhir saat ini. */
export function packageView(p: PackageRow, now = new Date()) {
  const price = pricing(
    {
      price: p.price,
      discountType: p.discountType as 'none' | 'percent' | 'amount',
      discountValue: p.discountValue,
      discountStartsAt: iso(p.discountStartsAt),
      discountEndsAt: iso(p.discountEndsAt),
    },
    now,
  );
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    scope: p.scope as 'all' | 'books',
    books: p.books as Book[],
    durationDays: p.durationDays,
    price: p.price,
    discountType: p.discountType,
    discountValue: p.discountValue,
    discountStartsAt: iso(p.discountStartsAt),
    discountEndsAt: iso(p.discountEndsAt),
    active: p.active,
    sort: p.sort,
    pricing: price,
  };
}

/** Kolom pesanan tanpa isi bukti (bukti diambil lewat endpoint terpisah). */
export const orderColumns = {
  id: orders.id,
  number: orders.number,
  parentId: orders.parentId,
  packageId: orders.packageId,
  packageSnapshot: orders.packageSnapshot,
  methodSnapshot: orders.methodSnapshot,
  priceNormal: orders.priceNormal,
  discount: orders.discount,
  uniqueCode: orders.uniqueCode,
  amount: orders.amount,
  status: orders.status,
  expiresAt: orders.expiresAt,
  proofMime: orders.proofMime,
  proofAt: orders.proofAt,
  reviewedAt: orders.reviewedAt,
  note: orders.note,
  createdAt: orders.createdAt,
};

@Injectable()
export class BillingService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: SettingsService,
    @Optional() private readonly mail?: MailService,
    @Optional() private readonly affiliate?: AffiliateService,
  ) {}

  /**
   * Email transaksi (D-044): ke orang tua + salinan ke direksi (MAIL_DIRECTOR). Tidak pernah membatalkan
   * transaksi — kegagalan email hanya dicatat.
   */
  private async notify(ev: 'created' | 'proof' | 'paid' | 'rejected', orderId: string) {
    if (!this.mail) return;
    try {
      const data = await this.orderMail(orderId, ev === 'paid');
      if (!data) return;
      const ctx = this.mail.ctx();
      const forParent =
        ev === 'created'
          ? orderCreated(ctx, data)
          : ev === 'proof'
            ? proofReceived(ctx, data)
            : ev === 'paid'
              ? orderPaid(ctx, data)
              : orderRejected(ctx, data);
      await this.mail.enqueue(data.parentEmail, forParent, { kind: `order_${ev}`, refId: orderId });
      await this.mail.notifyDirector(directorNotice(ctx, ev, data), {
        kind: `director_${ev}`,
        refId: orderId,
      });
    } catch (err) {
      new Logger('Billing').warn(`email transaksi gagal diantrekan: ${(err as Error).message}`);
    }
  }

  /** Data email untuk satu pesanan (+ tanggal akhir akses bila sudah lunas). */
  private async orderMail(orderId: string, withEnd = false): Promise<OrderMail | null> {
    const [o] = await this.db
      .select({ order: orders, parentName: parents.name, parentEmail: parents.email })
      .from(orders)
      .innerJoin(parents, eq(parents.id, orders.parentId))
      .where(eq(orders.id, orderId));
    if (!o) return null;
    const [ent] = withEnd
      ? await this.db
          .select({ endsAt: entitlements.endsAt })
          .from(entitlements)
          .where(eq(entitlements.orderId, orderId))
      : [];
    const snap = o.order.packageSnapshot as { name: string };
    return {
      number: o.order.number,
      parentName: o.parentName,
      parentEmail: o.parentEmail,
      packageName: snap.name,
      priceNormal: o.order.priceNormal,
      discount: o.order.discount,
      uniqueCode: o.order.uniqueCode,
      amount: o.order.amount,
      method: o.order.methodSnapshot as OrderMail['method'],
      expiresAt: o.order.expiresAt,
      orderId: o.order.id,
      note: o.order.note,
      endsAt: ent?.endsAt ?? null,
    };
  }

  /** Riwayat follow up per pesanan, dari antrean email (tanpa kolom baru). */
  private followUpStats(orderId: string) {
    return this.db
      .select({
        n: sql<number>`count(*)::int`,
        last: sql<Date | null>`max(${emailOutbox.createdAt})`,
      })
      .from(emailOutbox)
      .where(and(eq(emailOutbox.kind, FOLLOW_UP_KIND), eq(emailOutbox.refId, orderId)));
  }

  /**
   * Admin: follow up pesanan yang belum dibayar (menunggu bayar / kedaluwarsa) lewat email ke orang tua,
   * berisi cara bayar atau ajakan memesan ulang, plus kontak admin & grup WhatsApp. Maksimal sekali per 24 jam.
   */
  async followUp(id: string, now = new Date()) {
    await this.expireStale(now);
    if (!this.mail) throw new ServiceUnavailableException('Layanan email tidak aktif');
    const [order] = await this.db.select(orderColumns).from(orders).where(eq(orders.id, id));
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');
    if (!FOLLOW_UP_STATUSES.includes(order.status as OrderStatus))
      throw new BadRequestException('Follow up hanya untuk pesanan yang belum dibayar');
    const [prev] = await this.followUpStats(id);
    const last = prev?.last ? new Date(prev.last) : null;
    if (last && now.getTime() - last.getTime() < FOLLOW_UP_COOLDOWN_MS)
      throw new ConflictException(
        'Pesanan ini sudah di-follow up dalam 24 jam terakhir. Beri waktu orang tua membalas dulu.',
      );
    const data = (await this.orderMail(id))!;
    const contact = await this.settings.get('contact');
    await this.mail.enqueue(
      data.parentEmail,
      orderFollowUp(this.mail.ctx(), data, {
        expired: order.status === 'expired',
        adminWhatsapp: adminWhatsappHref(contact) || undefined,
        group: contact.groupWhatsapp || undefined,
      }),
      { kind: FOLLOW_UP_KIND, refId: id },
    );
    const [after] = await this.followUpStats(id);
    return {
      sentTo: data.parentEmail,
      followUps: after?.n ?? 1,
      lastFollowUpAt: after?.last ? new Date(after.last).toISOString() : now.toISOString(),
    };
  }

  /** Pesanan menunggu bayar yang lewat batas waktu → kedaluwarsa. */
  async expireStale(now = new Date()) {
    await this.db
      .update(orders)
      .set({ status: 'expired' })
      .where(and(eq(orders.status, 'awaiting_payment'), lt(orders.expiresAt, now)));
  }

  async entitlementsOf(parentId: string) {
    return this.db
      .select()
      .from(entitlements)
      .where(eq(entitlements.parentId, parentId))
      .orderBy(desc(entitlements.createdAt));
  }

  async accessForParent(parentId: string, now = new Date()): Promise<Access> {
    const s = await this.settings.get('billing');
    if (!s.paywall) return { ...FREE_ACCESS, freeLevels: s.freeLevels };
    const rows = await this.entitlementsOf(parentId);
    return accessFrom(
      s,
      rows.map((e) => ({
        scope: e.scope as 'all' | 'books',
        books: e.books as Book[],
        endsAt: iso(e.endsAt),
      })),
      now,
    );
  }

  /** Akses level untuk anak yang login: dari paket keluarganya, atau kelas workshop yang buka. */
  async accessForChild(childId: string, now = new Date()): Promise<Access> {
    const s = await this.settings.get('billing');
    if (!s.paywall) return { ...FREE_ACCESS, freeLevels: s.freeLevels };
    const [row] = await this.db
      .select({
        parentId: children.parentId,
        classClosed: classes.closedAt,
        classId: children.classId,
      })
      .from(children)
      .leftJoin(classes, eq(children.classId, classes.id))
      .where(eq(children.id, childId));
    // Akses penuh kelas hanya untuk siswa yang didaftarkan lewat kelas (tanpa akun orang tua) — anak
    // keluarga yang sekadar memasukkan kode kelas tidak otomatis membuka level berbayar (audit L5).
    if (s.classFullAccess && row?.classId && row.classClosed === null && !row.parentId)
      return { paywall: true, freeLevels: s.freeLevels, all: true, books: [] };
    // Hak keluarga + Premium yang diberikan admin khusus untuk anak ini (D-041).
    const rows = await this.db
      .select()
      .from(entitlements)
      .where(
        row?.parentId
          ? or(eq(entitlements.parentId, row.parentId), eq(entitlements.childId, childId))
          : eq(entitlements.childId, childId),
      );
    const access = accessFrom(
      s,
      // Premium keluarga dari admin adalah data lama: sejak D-041 (revisi) dipecah menjadi Premium per anak lalu
      // diakhiri. Jangan dihitung lagi, supaya anak yang ditambahkan sesudahnya tidak diberi tahu "paket sudah
      // berakhir" padahal ia belum pernah Premium.
      rows
        .filter((e) => !(e.source === 'admin' && e.parentId && !e.childId))
        .map((e) => ({
          scope: e.scope as 'all' | 'books',
          books: e.books as Book[],
          endsAt: iso(e.endsAt),
        })),
      now,
    );
    // Anak tanpa akun orang tua: pesan "buka Premium" mengarahkan orang tua daftar & menautkan dulu.
    return row && !row.parentId ? { ...access, noParent: true } : access;
  }

  async createOrder(parentId: string, packageId: string, methodId: string, now = new Date()) {
    await this.expireStale(now);
    const [pkg] = await this.db
      .select()
      .from(packages)
      .where(and(eq(packages.id, packageId), eq(packages.active, true)));
    if (!pkg) throw new NotFoundException('Paket tidak ditemukan');
    const [method] = await this.db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.id, methodId), eq(paymentMethods.active, true)));
    if (!method) throw new NotFoundException('Metode pembayaran tidak ditemukan');
    const s = await this.settings.get('billing');
    const view = packageView(pkg, now);
    // Batasi pesanan terbuka per keluarga & pakai ulang pesanan yang sama (audit M4).
    const open = await this.db
      .select(orderColumns)
      .from(orders)
      .where(and(eq(orders.parentId, parentId), inArray(orders.status, [...OPEN_ORDER_STATUSES])));
    const same = open.find(
      (o) =>
        o.status === 'awaiting_payment' &&
        o.packageId === pkg.id &&
        (o.methodSnapshot as { accountNumber?: string }).accountNumber === method.accountNumber &&
        o.priceNormal === view.pricing.normal &&
        o.discount === view.pricing.discount,
    );
    if (same) return same;
    if (open.length >= MAX_OPEN_ORDERS)
      throw new ConflictException(
        'Masih ada pesanan yang belum selesai. Selesaikan atau batalkan dulu di Riwayat Transaksi.',
      );
    const created = await this.db.transaction(async (tx) => {
      // Satu pembuat pesanan pada satu waktu → kode unik tidak bentrok.
      await tx.execute(sql`select pg_advisory_xact_lock(7177001)`);
      const open = await tx
        .select({ amount: orders.amount })
        .from(orders)
        .where(inArray(orders.status, [...OPEN_ORDER_STATUSES]));
      const code = pickUniqueCode(
        view.pricing.final,
        open.map((o) => o.amount),
        () => randomInt(1_000_000) / 1_000_000,
      );
      if (code === undefined)
        throw new ConflictException('Sedang banyak pesanan. Coba lagi beberapa menit lagi.');
      const yymmdd = jakartaDate(now).slice(2).replace(/-/g, '');
      const [row] = await tx
        .insert(orders)
        .values({
          number: `LC-${yymmdd}-${randomCode(5, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789')}`,
          parentId,
          packageId: pkg.id,
          packageSnapshot: {
            name: pkg.name,
            scope: pkg.scope,
            books: pkg.books,
            durationDays: pkg.durationDays,
          },
          methodSnapshot: {
            kind: method.kind,
            provider: method.provider,
            accountNumber: method.accountNumber,
            accountName: method.accountName,
            instructions: method.instructions,
          },
          priceNormal: view.pricing.normal,
          discount: view.pricing.discount,
          uniqueCode: code,
          amount: view.pricing.final + code,
          status: 'awaiting_payment',
          expiresAt: new Date(now.getTime() + s.orderExpiryHours * 3600_000),
        })
        .returning(orderColumns);
      return row!;
    });
    await this.notify('created', created.id);
    return created;
  }

  async ownOrder(parentId: string, id: string) {
    const [row] = await this.db
      .select(orderColumns)
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.parentId, parentId)));
    if (!row) throw new NotFoundException('Pesanan tidak ditemukan');
    return row;
  }

  async saveProof(parentId: string, id: string, data: Buffer, mime: string, now = new Date()) {
    await this.expireStale(now);
    const order = await this.ownOrder(parentId, id);
    const can: OrderStatus[] = ['awaiting_payment', 'awaiting_review', 'rejected'];
    if (!can.includes(order.status as OrderStatus))
      throw new BadRequestException(
        order.status === 'expired'
          ? 'Pesanan sudah kedaluwarsa. Buat pesanan baru, ya.'
          : 'Pesanan ini tidak menunggu bukti transfer',
      );
    const [row] = await this.db
      .update(orders)
      .set({ proof: data, proofMime: mime, proofAt: now, status: 'awaiting_review', note: null })
      .where(eq(orders.id, id))
      .returning(orderColumns);
    await this.notify('proof', row!.id);
    return row!;
  }

  async proof(id: string, parentId?: string) {
    const [row] = await this.db
      .select({ proof: orders.proof, mime: orders.proofMime })
      .from(orders)
      .where(parentId ? and(eq(orders.id, id), eq(orders.parentId, parentId)) : eq(orders.id, id));
    if (!row?.proof || !row.mime) throw new NotFoundException('Bukti transfer belum diunggah');
    return { data: row.proof, mime: row.mime };
  }

  async cancel(parentId: string, id: string) {
    const order = await this.ownOrder(parentId, id);
    if (order.status !== 'awaiting_payment')
      throw new BadRequestException('Hanya pesanan yang belum dibayar yang bisa dibatalkan');
    const [row] = await this.db
      .update(orders)
      .set({ status: 'cancelled' })
      .where(eq(orders.id, id))
      .returning(orderColumns);
    return row!;
  }

  /**
   * Admin menyetujui pembayaran: pesanan lunas, hak akses dibuat (diperpanjang bila paket yang sama
   * masih aktif), dan pemasukan dicatat di buku kas. Idempoten terhadap klik ganda.
   */
  async approve(id: string, adminId: string, now = new Date()) {
    const affiliateRules = this.affiliate ? await this.settings.get('affiliate') : null;
    const paid = await this.db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for('update');
      if (!order) throw new NotFoundException('Pesanan tidak ditemukan');
      if (order.status === 'paid') throw new ConflictException('Pesanan ini sudah disetujui');
      if (order.status === 'cancelled')
        throw new BadRequestException('Pesanan yang dibatalkan tidak bisa disetujui');
      const snap = order.packageSnapshot as {
        name: string;
        scope: string;
        books: Book[];
        durationDays: number | null;
      };
      const [current] = order.packageId
        ? await tx
            .select({ endsAt: entitlements.endsAt })
            .from(entitlements)
            .where(
              and(
                eq(entitlements.parentId, order.parentId),
                eq(entitlements.packageId, order.packageId),
              ),
            )
            .orderBy(desc(entitlements.endsAt))
            .limit(1)
        : [];
      const endsAt = entitlementEnd(snap.durationDays, now, iso(current?.endsAt ?? null));
      await tx.insert(entitlements).values({
        parentId: order.parentId,
        orderId: order.id,
        packageId: order.packageId,
        name: snap.name,
        scope: snap.scope,
        books: snap.books,
        startsAt: now,
        endsAt: endsAt ? new Date(endsAt) : null,
      });
      await tx
        .insert(cashEntries)
        .values({
          date: jakartaDate(now),
          type: 'in',
          category: 'Penjualan paket',
          amount: order.amount,
          description: `${order.number} · ${snap.name}`,
          orderId: order.id,
          createdBy: adminId,
        })
        .onConflictDoNothing();
      // Komisi afiliasi 1 tingkat (D-063) tercatat di transaksi yang sama dengan status "dibayar".
      if (this.affiliate && affiliateRules)
        await this.affiliate.recordCommission(tx, order, affiliateRules, now);
      const [row] = await tx
        .update(orders)
        .set({ status: 'paid', reviewedBy: adminId, reviewedAt: now, note: null })
        .where(eq(orders.id, id))
        .returning(orderColumns);
      return row!;
    });
    await this.notify('paid', paid.id);
    return paid;
  }

  async reject(id: string, adminId: string, reason: string, now = new Date()) {
    const [order] = await this.db.select(orderColumns).from(orders).where(eq(orders.id, id));
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');
    if (order.status !== 'awaiting_review' && order.status !== 'awaiting_payment')
      throw new BadRequestException('Pesanan ini tidak sedang menunggu verifikasi');
    const [row] = await this.db
      .update(orders)
      .set({ status: 'rejected', reviewedBy: adminId, reviewedAt: now, note: reason })
      .where(eq(orders.id, id))
      .returning(orderColumns);
    await this.notify('rejected', row!.id);
    return row!;
  }

  async adminOrders(status?: string) {
    await this.expireStale();
    return this.db
      .select({
        ...orderColumns,
        parentName: parents.name,
        parentEmail: parents.email,
        followUps: sql<number>`(select count(*)::int from ${emailOutbox} f
          where f.kind = ${FOLLOW_UP_KIND} and f.ref_id = ${orders.id}::text)`,
        lastFollowUpAt: sql<string | null>`(select max(f.created_at) from ${emailOutbox} f
          where f.kind = ${FOLLOW_UP_KIND} and f.ref_id = ${orders.id}::text)`,
      })
      .from(orders)
      .innerJoin(parents, eq(orders.parentId, parents.id))
      .where(status ? eq(orders.status, status) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(500);
  }

  async parentOrders(parentId: string) {
    await this.expireStale();
    return this.db
      .select(orderColumns)
      .from(orders)
      .where(eq(orders.parentId, parentId))
      .orderBy(desc(orders.createdAt))
      .limit(200);
  }

  async activePackages(now = new Date()) {
    const rows = await this.db
      .select()
      .from(packages)
      .where(eq(packages.active, true))
      .orderBy(packages.sort, packages.price);
    return rows.map((p) => packageView(p, now));
  }

  async activeMethods() {
    return this.db
      .select({
        id: paymentMethods.id,
        kind: paymentMethods.kind,
        provider: paymentMethods.provider,
        accountNumber: paymentMethods.accountNumber,
        accountName: paymentMethods.accountName,
        instructions: paymentMethods.instructions,
      })
      .from(paymentMethods)
      .where(eq(paymentMethods.active, true))
      .orderBy(paymentMethods.sort, paymentMethods.provider);
  }

  /** Jumlah pesanan menunggu verifikasi (badge admin). */
  async pendingCount() {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(orders)
      .where(eq(orders.status, 'awaiting_review'));
    return row?.n ?? 0;
  }
}
