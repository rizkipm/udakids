import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import {
  commissionBase,
  commissionFor,
  isReferralCode,
  maskName,
  memberStatus,
  normalizeReferralCode,
  payoutBlock,
  payoutNameMatches,
  REFERRAL_ALPHABET,
  REFERRAL_LENGTH,
  summarizeLedger,
  type AffiliateSettings,
  type PayoutAccountInput,
  type PayoutBlock,
} from '@little-coder/engine';
import { and, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { hashSecret, randomCode, verifySecret } from '../common/crypto.js';
import { RateLimiter } from '../common/rate-limit.js';
import { open, seal, type Sealed } from '../common/secret-box.js';
import { DB, type Db } from '../db/db.module.js';
import {
  actionCodes,
  affiliateAccounts,
  affiliateClickDays,
  affiliateLedger,
  affiliatePayouts,
  cashEntries,
  children,
  commissionPayouts,
  parents,
} from '../db/schema.js';
import { jakartaDate } from '../common/dates.js';
import { MailService } from '../mail/mail.service.js';
import {
  affiliateAccountReviewed,
  affiliateActionCode,
  affiliatePayoutPaid,
  affiliatePayoutRejected,
  affiliatePayoutRequested,
} from '../mail/templates.js';
import { SettingsService } from '../settings/settings.service.js';
import { findReferrer, fingerprint } from './referral.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

const CODE_TTL_MIN = 15;
const CODE_MAX_ATTEMPTS = 5;
const CODE_RESEND_MS = 60_000;
const PAGE = 20;
const ACCOUNT_PURPOSE = 'payout_account';

const BLOCK_MESSAGE: Record<PayoutBlock, string> = {
  disabled: 'Program afiliasi sedang tidak aktif',
  no_account: 'Simpan rekening pencairan dulu',
  account_unverified: 'Rekening pencairan masih menunggu verifikasi admin',
  cooldown: 'Rekening baru diubah. Pencairan bisa diajukan setelah masa jeda selesai',
  open_request: 'Masih ada pengajuan pencairan yang sedang diproses',
  below_minimum: 'Jumlah pencairan di bawah minimal',
  over_balance: 'Saldo yang bisa dicairkan tidak cukup',
};

/** Tanda kecurigaan untuk admin (bukan hukuman otomatis). */
export type AffiliateFlag = 'shared_account' | 'same_ip_referee' | 'name_mismatch' | 'ip_cluster';

/**
 * Afiliasi orang tua (D-063): kode & link, klik, bonus ajak teman (tertahan sampai teman aktif), komisi langganan
 * 1 tingkat (tertahan `holdDays`), saldo dari buku besar, rekening terenkripsi, pencairan manual oleh admin.
 * Semua perubahan saldo di dalam transaksi; indeks unik di database mencegah catatan ganda.
 */
@Injectable()
export class AffiliateService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Affiliate');
  private timer?: ReturnType<typeof setInterval>;
  /** Satu klik per IP per kode per hari. */
  private readonly clickSeen = new Map<string, string>();
  readonly lookupLimiter = new RateLimiter(60, 10 * 60_000);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: SettingsService,
    private readonly mail: MailService,
  ) {}

  onModuleInit() {
    if (process.env.MAIL_WORKER === 'off') return;
    this.timer = setInterval(
      () => void this.release().catch((err: unknown) => this.log.warn(String(err))),
      60 * 60_000,
    );
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // ---------------------------------------------------------------- kode & klik

  /** Kode referal milik akun; dibuat saat pertama kali dibutuhkan (hanya akun terverifikasi). */
  async ensureCode(parentId: string): Promise<string> {
    const [row] = await this.db
      .select({ code: parents.referralCode, verified: parents.emailVerifiedAt })
      .from(parents)
      .where(eq(parents.id, parentId));
    if (!row) throw new NotFoundException('Akun tidak ditemukan');
    if (row.code) return row.code;
    if (!row.verified) throw new BadRequestException('Verifikasi email dulu untuk ikut afiliasi');
    for (let i = 0; i < 8; i++) {
      const code = randomCode(REFERRAL_LENGTH, REFERRAL_ALPHABET);
      const [set] = await this.db
        .update(parents)
        .set({ referralCode: code })
        .where(and(eq(parents.id, parentId), isNull(parents.referralCode)))
        .returning({ code: parents.referralCode })
        .catch(() => [] as { code: string | null }[]); // kode kembar (sangat jarang) → coba lagi
      if (set?.code) return set.code;
      const [again] = await this.db
        .select({ code: parents.referralCode })
        .from(parents)
        .where(eq(parents.id, parentId));
      if (again?.code) return again.code;
    }
    throw new ConflictException('Kode referal belum bisa dibuat. Coba lagi.');
  }

  /** Cek kode di form daftar: hanya nama tersamar pemiliknya (tidak membocorkan email). */
  async preview(raw: string) {
    const s = await this.settings.get('affiliate');
    if (!s.enabled || !isReferralCode(raw)) return { valid: false as const };
    const owner = await findReferrer(this.db, raw);
    return owner
      ? { valid: true as const, code: normalizeReferralCode(raw), name: maskName(owner.name) }
      : { valid: false as const };
  }

  /** Hitung klik link referal (angka harian saja). */
  async recordClick(raw: string, ip: string, now = new Date()) {
    if (!isReferralCode(raw)) return;
    const code = normalizeReferralCode(raw);
    const day = jakartaDate(now);
    const seenKey = `${fingerprint('ip', ip)}:${code}`;
    if (this.clickSeen.get(seenKey) === day) return;
    if (this.clickSeen.size > 50_000) this.clickSeen.clear();
    this.clickSeen.set(seenKey, day);
    const [owner] = await this.db
      .select({ id: parents.id })
      .from(parents)
      .where(and(eq(parents.referralCode, code), eq(parents.active, true)));
    if (!owner) return;
    await this.db
      .insert(affiliateClickDays)
      .values({ parentId: owner.id, day, clicks: 1 })
      .onConflictDoUpdate({
        target: [affiliateClickDays.parentId, affiliateClickDays.day],
        set: { clicks: sql`${affiliateClickDays.clicks} + 1` },
      });
  }

  // ---------------------------------------------------------------- komisi & pelepasan saldo

  /**
   * Komisi langganan 1 tingkat — dipanggil DI DALAM transaksi persetujuan pesanan, jadi komisi dan status
   * "dibayar" selalu tercatat bersama. Satu pesanan = satu komisi (indeks unik).
   */
  async recordCommission(
    tx: Tx,
    order: { id: string; parentId: string; amount: number; uniqueCode: number },
    s: AffiliateSettings,
    now = new Date(),
  ) {
    if (!s.enabled || s.commissionBp <= 0) return;
    const [buyer] = await tx
      .select({ referredBy: parents.referredBy })
      .from(parents)
      .where(eq(parents.id, order.parentId));
    if (!buyer?.referredBy || buyer.referredBy === order.parentId) return;
    const base = commissionBase(order);
    const amount = commissionFor(base, s.commissionBp);
    if (amount <= 0) return;
    await tx
      .insert(affiliateLedger)
      .values({
        parentId: buyer.referredBy,
        type: 'commission',
        state: s.holdDays > 0 ? 'pending' : 'available',
        amount,
        baseAmount: base,
        rateBp: s.commissionBp,
        refereeId: order.parentId,
        orderId: order.id,
        availableAt: new Date(now.getTime() + s.holdDays * 86_400_000),
        note: s.holdDays > 0 ? `Tertahan ${s.holdDays} hari` : null,
      })
      .onConflictDoNothing();
  }

  /**
   * Lepaskan saldo tertahan: komisi yang masa tahannya habis; bonus yang temannya sudah aktif (email terverifikasi
   * + anaknya main ≥ N ronde). Bonus yang lewat batas waktu tanpa syarat terpenuhi → gugur.
   */
  async release(now = new Date(), parentId?: string) {
    const s = await this.settings.get('affiliate');
    const mine = parentId ? sql`and parent_id = ${parentId}` : sql``;
    await this.db.execute(sql`
      update affiliate_ledger set state = 'available', note = null, updated_at = ${now}
      where type = 'commission' and state = 'pending' and available_at <= ${now} ${mine}`);
    await this.db.execute(sql`
      update affiliate_ledger l set state = 'available', note = null, updated_at = ${now}
      from parents r
      where l.type = 'signup_bonus' and l.state = 'pending' and r.id = l.referee_id
        ${parentId ? sql`and l.parent_id = ${parentId}` : sql``}
        and r.email_verified_at is not null and r.active
        and (
          select count(*) from events e join children c on c.id = e.child_id
          where c.parent_id = r.id and e.type = 'quiz_result'
            and e.ts >= r.created_at and e.ts <= l.available_at
        ) >= ${s.qualifyRounds}`);
    await this.db.execute(sql`
      update affiliate_ledger set state = 'void', updated_at = ${now},
        note = ${`Gugur: teman belum aktif dalam ${s.qualifyDays} hari`}
      where type = 'signup_bonus' and state = 'pending' and available_at <= ${now} ${mine}`);
  }

  // ---------------------------------------------------------------- data orang tua

  private async ledgerTotals(parentId: string) {
    const rows = await this.db
      .select({
        type: affiliateLedger.type,
        state: affiliateLedger.state,
        amount: sql<number>`sum(${affiliateLedger.amount})::int`,
      })
      .from(affiliateLedger)
      .where(eq(affiliateLedger.parentId, parentId))
      .groupBy(affiliateLedger.type, affiliateLedger.state);
    const s = summarizeLedger(rows.map((r) => ({ ...r, amount: Number(r.amount) })));
    const [paid] = await this.db
      .select({ n: sql<number>`coalesce(sum(${affiliatePayouts.amount}), 0)::int` })
      .from(affiliatePayouts)
      .where(and(eq(affiliatePayouts.parentId, parentId), eq(affiliatePayouts.status, 'paid')));
    return { ...s, paid: Number(paid?.n ?? 0) };
  }

  private async memberCounts(parentId: string) {
    const res = await this.db.execute(sql`
      select
        count(*)::int as signups,
        count(*) filter (where p.email_verified_at is not null)::int as verified,
        count(*) filter (where exists (
          select 1 from affiliate_ledger l where l.referee_id = p.id and l.type = 'signup_bonus'
            and l.parent_id = ${parentId} and l.state = 'available'))::int as active,
        count(*) filter (where exists (
          select 1 from orders o where o.parent_id = p.id and o.status = 'paid'))::int as subscribers
      from parents p where p.referred_by = ${parentId}`);
    const r = res.rows[0] ?? {};
    const [clicks] = await this.db
      .select({ n: sql<number>`coalesce(sum(${affiliateClickDays.clicks}), 0)::int` })
      .from(affiliateClickDays)
      .where(eq(affiliateClickDays.parentId, parentId));
    return {
      clicks: Number(clicks?.n ?? 0),
      signups: Number(r.signups ?? 0),
      verified: Number(r.verified ?? 0),
      active: Number(r.active ?? 0),
      subscribers: Number(r.subscribers ?? 0),
    };
  }

  /** Saldo tertahan berikutnya yang akan cair (komisi) dan bonus yang menunggu teman aktif. */
  private async nextRelease(parentId: string) {
    const res = await this.db.execute(sql`
      select available_at as at, sum(amount)::int as amount from affiliate_ledger
      where parent_id = ${parentId} and state = 'pending' and type = 'commission'
      group by available_at order by available_at limit 1`);
    const r = res.rows[0];
    const [bonus] = await this.db
      .select({
        n: sql<number>`count(*)::int`,
        amount: sql<number>`coalesce(sum(${affiliateLedger.amount}), 0)::int`,
      })
      .from(affiliateLedger)
      .where(
        and(
          eq(affiliateLedger.parentId, parentId),
          eq(affiliateLedger.type, 'signup_bonus'),
          eq(affiliateLedger.state, 'pending'),
        ),
      );
    return {
      commission: r ? { at: r.at as string, amount: Number(r.amount) } : null,
      bonusWaiting: { count: Number(bonus?.n ?? 0), amount: Number(bonus?.amount ?? 0) },
    };
  }

  async overview(parentId: string, appUrl: string) {
    const code = await this.ensureCode(parentId);
    await this.release(new Date(), parentId);
    const [s, balance, counts, account, open, recent, upcoming] = await Promise.all([
      this.settings.get('affiliate'),
      this.ledgerTotals(parentId),
      this.memberCounts(parentId),
      this.account(parentId),
      this.openPayout(parentId),
      this.ledger(parentId, 1, 8),
      this.nextRelease(parentId),
    ]);
    return {
      enabled: s.enabled,
      code,
      link: `${appUrl.replace(/\/$/, '')}/r/${code}`,
      rules: {
        signupBonus: s.signupBonus,
        commissionBp: s.commissionBp,
        minPayout: s.minPayout,
        holdDays: s.holdDays,
        qualifyRounds: s.qualifyRounds,
        qualifyDays: s.qualifyDays,
        accountCooldownDays: s.accountCooldownDays,
      },
      providers: s.providers,
      balance,
      counts,
      account,
      openPayout: open,
      recent: recent.items,
      upcoming,
    };
  }

  /** Anggota langsung (1 tingkat) — nama disamarkan, tanpa email & tanpa data anak (UU PDP). */
  async members(parentId: string, page = 1) {
    const offset = (Math.max(1, page) - 1) * PAGE;
    const res = await this.db.execute(sql`
      select p.id, p.name, p.referred_at, p.created_at, p.email_verified_at is not null as verified,
        (select count(*) from orders o where o.parent_id = p.id and o.status = 'paid')::int as paid_orders,
        exists (select 1 from affiliate_ledger l where l.referee_id = p.id and l.parent_id = ${parentId}
          and l.type = 'signup_bonus' and l.state = 'available') as qualified,
        (select coalesce(sum(l.amount), 0) from affiliate_ledger l where l.referee_id = p.id
          and l.parent_id = ${parentId} and l.state <> 'void'
          and l.type in ('signup_bonus', 'commission'))::int as earned,
        (select count(*) from parents q where q.referred_by = p.id)::int as sub_members
      from parents p where p.referred_by = ${parentId}
      order by p.referred_at desc nulls last
      limit ${PAGE} offset ${offset}`);
    const [{ n } = { n: 0 }] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(parents)
      .where(eq(parents.referredBy, parentId));
    return {
      page,
      pageSize: PAGE,
      total: Number(n),
      items: res.rows.map((r) => ({
        name: maskName(String(r.name)),
        joinedAt: (r.referred_at ?? r.created_at) as string,
        status: memberStatus({
          emailVerified: Boolean(r.verified),
          qualified: Boolean(r.qualified),
          paidOrders: Number(r.paid_orders),
        }),
        paidOrders: Number(r.paid_orders),
        earned: Number(r.earned),
        /** Pohon visual: jumlah anggota mereka sendiri (tanpa komisi bertingkat). */
        subMembers: Number(r.sub_members),
      })),
    };
  }

  /** 12 bulan terakhir (WIB): klik, daftar, berlangganan pertama, dan pendapatan. */
  async analytics(parentId: string, now = new Date()) {
    const months: string[] = [];
    const d = new Date(`${jakartaDate(now).slice(0, 7)}-01T00:00:00Z`);
    for (let i = 11; i >= 0; i--) {
      const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
      months.push(m.toISOString().slice(0, 7));
    }
    const since = `${months[0]}-01`;
    const wib = (col: string) => sql.raw(`to_char(${col} at time zone 'Asia/Jakarta', 'YYYY-MM')`);
    const [clicks, signups, subs, earn] = await Promise.all([
      this.db
        .execute(sql`select substr(day, 1, 7) as m, sum(clicks)::int as n from affiliate_click_days
        where parent_id = ${parentId} and day >= ${since} group by 1`),
      this.db.execute(sql`select ${wib('referred_at')} as m, count(*)::int as n from parents
        where referred_by = ${parentId} and referred_at >= ${since}::date group by 1`),
      this.db.execute(sql`select ${wib('first_paid')} as m, count(*)::int as n from (
          select min(o.reviewed_at) as first_paid from orders o join parents p on p.id = o.parent_id
          where p.referred_by = ${parentId} and o.status = 'paid' group by o.parent_id) x
        where first_paid >= ${since}::date group by 1`),
      this.db
        .execute(sql`select ${wib('created_at')} as m, sum(amount)::int as n from affiliate_ledger
        where parent_id = ${parentId} and state <> 'void' and type in ('signup_bonus', 'commission')
          and created_at >= ${since}::date group by 1`),
    ]);
    const map = (rows: Record<string, unknown>[]) =>
      new Map(rows.map((r) => [String(r.m), Number(r.n)]));
    const [c, sgn, sb, e] = [clicks, signups, subs, earn].map((r) => map(r.rows));
    return {
      months: months.map((m) => ({
        month: m,
        clicks: c!.get(m) ?? 0,
        signups: sgn!.get(m) ?? 0,
        subscribers: sb!.get(m) ?? 0,
        earned: e!.get(m) ?? 0,
      })),
    };
  }

  async ledger(parentId: string, page = 1, size = PAGE) {
    const rows = await this.db
      .select({
        id: affiliateLedger.id,
        type: affiliateLedger.type,
        state: affiliateLedger.state,
        amount: affiliateLedger.amount,
        baseAmount: affiliateLedger.baseAmount,
        rateBp: affiliateLedger.rateBp,
        availableAt: affiliateLedger.availableAt,
        note: affiliateLedger.note,
        createdAt: affiliateLedger.createdAt,
        refereeName: parents.name,
      })
      .from(affiliateLedger)
      .leftJoin(parents, eq(parents.id, affiliateLedger.refereeId))
      .where(eq(affiliateLedger.parentId, parentId))
      .orderBy(desc(affiliateLedger.createdAt))
      .limit(size)
      .offset((Math.max(1, page) - 1) * size);
    const [{ n } = { n: 0 }] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(affiliateLedger)
      .where(eq(affiliateLedger.parentId, parentId));
    return {
      page,
      pageSize: size,
      total: Number(n),
      items: rows.map(({ refereeName, ...r }) => ({
        ...r,
        member: refereeName ? maskName(refereeName) : null,
      })),
    };
  }

  // ---------------------------------------------------------------- rekening pencairan

  async account(parentId: string) {
    const [a] = await this.db
      .select()
      .from(affiliateAccounts)
      .where(eq(affiliateAccounts.parentId, parentId));
    if (!a) return null;
    return {
      providerId: a.providerId,
      providerName: a.providerName,
      kind: a.kind,
      last4: a.accountLast4,
      holderName: a.holderName,
      nameMatch: a.nameMatch,
      status: a.status as 'pending' | 'verified' | 'rejected',
      reviewNote: a.reviewNote,
      changedAt: a.changedAt,
    };
  }

  /** Kirim kode 6 angka ke email akun untuk menyimpan/mengubah rekening. */
  async requestAccountCode(parentId: string) {
    const [p] = await this.db
      .select({ name: parents.name, email: parents.email, verified: parents.emailVerifiedAt })
      .from(parents)
      .where(eq(parents.id, parentId));
    if (!p?.verified) throw new BadRequestException('Verifikasi email dulu');
    const [last] = await this.db
      .select({ createdAt: actionCodes.createdAt })
      .from(actionCodes)
      .where(and(eq(actionCodes.parentId, parentId), eq(actionCodes.purpose, ACCOUNT_PURPOSE)))
      .orderBy(desc(actionCodes.createdAt))
      .limit(1);
    if (last && Date.now() - last.createdAt.getTime() < CODE_RESEND_MS)
      return { sent: false, cooldownSeconds: CODE_RESEND_MS / 1000 };
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.db
      .update(actionCodes)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(actionCodes.parentId, parentId),
          eq(actionCodes.purpose, ACCOUNT_PURPOSE),
          isNull(actionCodes.consumedAt),
        ),
      );
    await this.db.insert(actionCodes).values({
      parentId,
      purpose: ACCOUNT_PURPOSE,
      codeHash: await hashSecret(`${ACCOUNT_PURPOSE}:${parentId}:${code}`),
      expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60_000),
    });
    await this.mail.enqueue(
      p.email,
      affiliateActionCode(this.mail.ctx(), { name: p.name, code, minutes: CODE_TTL_MIN }),
      { kind: 'affiliate_code', refId: parentId },
    );
    return { sent: true, cooldownSeconds: CODE_RESEND_MS / 1000 };
  }

  private async consumeCode(parentId: string, code: string) {
    const [v] = await this.db
      .select()
      .from(actionCodes)
      .where(
        and(
          eq(actionCodes.parentId, parentId),
          eq(actionCodes.purpose, ACCOUNT_PURPOSE),
          isNull(actionCodes.consumedAt),
        ),
      )
      .orderBy(desc(actionCodes.createdAt))
      .limit(1);
    if (!v || v.expiresAt.getTime() < Date.now() || v.attempts >= CODE_MAX_ATTEMPTS)
      throw new BadRequestException('Kode sudah kedaluwarsa. Kirim kode baru, ya.');
    if (!(await verifySecret(`${ACCOUNT_PURPOSE}:${parentId}:${code}`, v.codeHash))) {
      await this.db
        .update(actionCodes)
        .set({ attempts: v.attempts + 1 })
        .where(eq(actionCodes.id, v.id));
      throw new BadRequestException('Kode belum cocok. Periksa lagi email Anda.');
    }
    await this.db
      .update(actionCodes)
      .set({ consumedAt: new Date() })
      .where(eq(actionCodes.id, v.id));
  }

  /**
   * Simpan rekening: nama pemilik harus cocok dengan nama akun → langsung terverifikasi; tidak cocok atau nomornya
   * sudah dipakai akun lain → menunggu verifikasi admin. Mengubah rekening memulai masa jeda pencairan.
   */
  async saveAccount(parentId: string, input: PayoutAccountInput, now = new Date()) {
    const s = await this.settings.get('affiliate');
    const provider = s.providers.find((p) => p.id === input.providerId);
    if (!provider) throw new BadRequestException('Bank / e-wallet tidak tersedia');
    if (await this.openPayout(parentId))
      throw new ConflictException('Rekening tidak bisa diubah selama ada pencairan yang diproses');
    await this.consumeCode(parentId, input.code);
    const [p] = await this.db
      .select({ name: parents.name })
      .from(parents)
      .where(eq(parents.id, parentId));
    const hash = fingerprint('account', `${provider.id}:${input.accountNumber}`);
    const [shared] = await this.db
      .select({ id: affiliateAccounts.parentId })
      .from(affiliateAccounts)
      .where(and(eq(affiliateAccounts.accountHash, hash), ne(affiliateAccounts.parentId, parentId)))
      .limit(1);
    const nameMatch = payoutNameMatches(p?.name ?? '', input.holderName);
    const status = nameMatch && !shared ? 'verified' : 'pending';
    const values = {
      providerId: provider.id,
      providerName: provider.name,
      kind: provider.kind,
      accountSealed: seal(input.accountNumber, now),
      accountLast4: input.accountNumber.slice(-4),
      accountHash: hash,
      holderName: input.holderName,
      nameMatch,
      status,
      reviewNote: shared
        ? 'Nomor ini sudah dipakai akun lain — perlu verifikasi admin'
        : nameMatch
          ? null
          : 'Nama pemilik rekening berbeda dengan nama akun — perlu verifikasi admin',
      verifiedBy: null,
      verifiedAt: status === 'verified' ? now : null,
      changedAt: now,
    };
    await this.db
      .insert(affiliateAccounts)
      .values({ parentId, ...values })
      .onConflictDoUpdate({ target: affiliateAccounts.parentId, set: values });
    return this.account(parentId);
  }

  // ---------------------------------------------------------------- pencairan (orang tua)

  private async openPayout(parentId: string) {
    const [row] = await this.db
      .select({
        id: affiliatePayouts.id,
        number: affiliatePayouts.number,
        amount: affiliatePayouts.amount,
        requestedAt: affiliatePayouts.requestedAt,
      })
      .from(affiliatePayouts)
      .where(
        and(eq(affiliatePayouts.parentId, parentId), eq(affiliatePayouts.status, 'requested')),
      );
    return row ?? null;
  }

  async payouts(parentId: string) {
    return this.db
      .select({
        id: affiliatePayouts.id,
        number: affiliatePayouts.number,
        amount: affiliatePayouts.amount,
        providerName: affiliatePayouts.providerName,
        last4: affiliatePayouts.accountLast4,
        status: affiliatePayouts.status,
        note: affiliatePayouts.note,
        transferRef: affiliatePayouts.transferRef,
        requestedAt: affiliatePayouts.requestedAt,
        paidAt: affiliatePayouts.paidAt,
      })
      .from(affiliatePayouts)
      .where(eq(affiliatePayouts.parentId, parentId))
      .orderBy(desc(affiliatePayouts.requestedAt))
      .limit(50);
  }

  /** Ajukan pencairan: baris akun dikunci, saldo dihitung ulang di dalam transaksi, lalu dikurangi. */
  async requestPayout(parentId: string, amount: number, now = new Date()) {
    await this.release(now, parentId);
    const s = await this.settings.get('affiliate');
    const payout = await this.db.transaction(async (tx) => {
      const [p] = await tx
        .select({ id: parents.id, name: parents.name })
        .from(parents)
        .where(eq(parents.id, parentId))
        .for('update');
      if (!p) throw new NotFoundException('Akun tidak ditemukan');
      const [{ available } = { available: 0 }] = await tx
        .select({ available: sql<number>`coalesce(sum(${affiliateLedger.amount}), 0)::int` })
        .from(affiliateLedger)
        .where(and(eq(affiliateLedger.parentId, parentId), eq(affiliateLedger.state, 'available')));
      const [acc] = await tx
        .select()
        .from(affiliateAccounts)
        .where(eq(affiliateAccounts.parentId, parentId));
      const [open] = await tx
        .select({ id: affiliatePayouts.id })
        .from(affiliatePayouts)
        .where(
          and(eq(affiliatePayouts.parentId, parentId), eq(affiliatePayouts.status, 'requested')),
        );
      const block = payoutBlock({
        settings: s,
        available: Number(available),
        amount,
        account: acc ? { verified: acc.status === 'verified', changedAt: acc.changedAt } : null,
        openRequest: !!open,
        now,
      });
      if (block) throw new BadRequestException({ message: BLOCK_MESSAGE[block], reason: block });
      const number = `AF-${jakartaDate(now).replace(/-/g, '').slice(2)}-${randomCode(4, REFERRAL_ALPHABET)}`;
      const [row] = await tx
        .insert(affiliatePayouts)
        .values({
          number,
          parentId,
          amount,
          providerName: acc!.providerName,
          kind: acc!.kind,
          accountSealed: acc!.accountSealed,
          accountLast4: acc!.accountLast4,
          holderName: acc!.holderName,
          status: 'requested',
          requestedAt: now,
        })
        .returning();
      await tx.insert(affiliateLedger).values({
        parentId,
        type: 'payout',
        state: 'available',
        amount: -amount,
        payoutId: row!.id,
        note: `Pencairan ${number}`,
      });
      return { ...row!, name: p.name };
    });
    await this.mail.notifyDirector(
      affiliatePayoutRequested(this.mail.ctx(), {
        number: payout.number,
        name: payout.name,
        amount: payout.amount,
        provider: payout.providerName,
        last4: payout.accountLast4,
        holderName: payout.holderName,
      }),
      { kind: 'affiliate_payout', refId: payout.id },
    );
    return { id: payout.id, number: payout.number, amount: payout.amount, status: payout.status };
  }

  /** Orang tua membatalkan pengajuan yang belum diproses → saldo kembali. */
  async cancelPayout(parentId: string, id: string) {
    return this.closePayout(id, {
      status: 'cancelled',
      parentId,
      note: 'Dibatalkan oleh pemilik akun',
    });
  }

  private async closePayout(
    id: string,
    o: { status: 'cancelled' | 'rejected'; parentId?: string; adminId?: string; note: string },
  ) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(affiliatePayouts)
        .where(eq(affiliatePayouts.id, id))
        .for('update');
      if (!row || (o.parentId && row.parentId !== o.parentId))
        throw new NotFoundException('Pengajuan tidak ditemukan');
      if (row.status !== 'requested') throw new ConflictException('Pengajuan ini sudah diproses');
      const [done] = await tx
        .update(affiliatePayouts)
        .set({
          status: o.status,
          note: o.note,
          reviewedBy: o.adminId ?? null,
          reviewedAt: new Date(),
        })
        .where(eq(affiliatePayouts.id, id))
        .returning();
      await tx
        .insert(affiliateLedger)
        .values({
          parentId: row.parentId,
          type: 'payout_return',
          state: 'available',
          amount: row.amount,
          payoutId: row.id,
          note: `${o.status === 'cancelled' ? 'Pembatalan' : 'Penolakan'} ${row.number}`,
          createdBy: o.adminId ?? null,
        })
        .onConflictDoNothing();
      return done!;
    });
  }

  // ---------------------------------------------------------------- admin

  async adminOverview() {
    const res = await this.db.execute(sql`
      select
        coalesce(sum(amount) filter (where state = 'available'), 0)::int as available,
        coalesce(sum(amount) filter (where state = 'pending'), 0)::int as pending,
        coalesce(sum(amount) filter (where state <> 'void' and type in ('signup_bonus','commission')), 0)::int as earned
      from affiliate_ledger`);
    const pay = await this.db.execute(sql`
      select
        count(*) filter (where status = 'requested')::int as requested,
        coalesce(sum(amount) filter (where status = 'requested'), 0)::int as requested_amount,
        coalesce(sum(amount) filter (where status = 'paid'), 0)::int as paid
      from affiliate_payouts`);
    const ref = await this.db.execute(sql`
      select count(*) filter (where referred_by is not null)::int as referred,
        count(distinct referred_by)::int as affiliates
      from parents`);
    const [acc] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(affiliateAccounts)
      .where(eq(affiliateAccounts.status, 'pending'));
    const r = res.rows[0] ?? {};
    const p = pay.rows[0] ?? {};
    const f = ref.rows[0] ?? {};
    return {
      available: Number(r.available ?? 0),
      pending: Number(r.pending ?? 0),
      earned: Number(r.earned ?? 0),
      payoutRequests: Number(p.requested ?? 0),
      payoutRequestedAmount: Number(p.requested_amount ?? 0),
      paid: Number(p.paid ?? 0),
      referred: Number(f.referred ?? 0),
      affiliates: Number(f.affiliates ?? 0),
      accountsPending: Number(acc?.n ?? 0),
    };
  }

  /**
   * Insight admin: tren 12 bulan (WIB), corong konversi, afiliator teratas, dan biaya program dibanding pendapatan
   * dari anggota referal.
   */
  async adminAnalytics(now = new Date()) {
    const months: string[] = [];
    const d = new Date(`${jakartaDate(now).slice(0, 7)}-01T00:00:00Z`);
    for (let i = 11; i >= 0; i--)
      months.push(
        new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)).toISOString().slice(0, 7),
      );
    const since = `${months[0]}-01`;
    const monthStart = `${months[11]}-01`;
    const wib = (col: string) => sql.raw(`to_char(${col} at time zone 'Asia/Jakarta', 'YYYY-MM')`);
    const [signups, subs, earn, paid, revenue, funnel, top, flagged, cost] = await Promise.all([
      this.db.execute(sql`select ${wib('referred_at')} as m, count(*)::int as n from parents
        where referred_by is not null and referred_at >= ${since}::date group by 1`),
      this.db.execute(sql`select ${wib('first_paid')} as m, count(*)::int as n from (
          select min(o.reviewed_at) as first_paid from orders o join parents p on p.id = o.parent_id
          where p.referred_by is not null and o.status = 'paid' group by o.parent_id) x
        where first_paid >= ${since}::date group by 1`),
      this.db.execute(sql`select ${wib('created_at')} as m,
          coalesce(sum(amount) filter (where type = 'commission'), 0)::int as commission,
          coalesce(sum(amount) filter (where type = 'signup_bonus'), 0)::int as bonus
        from affiliate_ledger where state <> 'void' and type in ('signup_bonus','commission')
          and created_at >= ${since}::date group by 1`),
      this.db
        .execute(sql`select ${wib('paid_at')} as m, sum(amount)::int as n from affiliate_payouts
        where status = 'paid' and paid_at >= ${since}::date group by 1`),
      this.db.execute(sql`
        select coalesce(sum(o.amount - o.unique_code), 0)::int as revenue,
          coalesce(sum(o.amount - o.unique_code) filter (
            where to_char(o.reviewed_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD') >= ${monthStart}), 0)::int as revenue_month
        from orders o join parents p on p.id = o.parent_id
        where p.referred_by is not null and o.status = 'paid'`),
      this.db.execute(sql`
        select (select coalesce(sum(clicks), 0) from affiliate_click_days)::int as clicks,
          count(*)::int as signups,
          count(*) filter (where p.email_verified_at is not null)::int as verified,
          count(*) filter (where exists (select 1 from affiliate_ledger l where l.referee_id = p.id
            and l.type = 'signup_bonus' and l.state = 'available'))::int as active,
          count(*) filter (where exists (select 1 from orders o
            where o.parent_id = p.id and o.status = 'paid'))::int as subscribers
        from parents p where p.referred_by is not null`),
      this.db.execute(sql`
        select p.id, p.name, p.referral_code,
          (select count(*) from parents m where m.referred_by = p.id)::int as members,
          (select count(*) from parents m where m.referred_by = p.id
            and exists (select 1 from orders o where o.parent_id = m.id and o.status = 'paid'))::int as subscribers,
          coalesce(sum(l.amount), 0)::int as earned
        from parents p join affiliate_ledger l on l.parent_id = p.id
        where l.state <> 'void' and l.type in ('signup_bonus','commission')
        group by p.id order by earned desc limit 5`),
      this.db.execute(sql`select distinct parent_id from affiliate_accounts a
        where a.name_match = false or exists (select 1 from affiliate_accounts b
          where b.account_hash = a.account_hash and b.parent_id <> a.parent_id)`),
      this.db.execute(sql`select coalesce(sum(amount), 0)::int as n from affiliate_ledger
        where state <> 'void' and type in ('signup_bonus','commission')`),
    ]);
    const map = (rows: Record<string, unknown>[], key = 'n') =>
      new Map(rows.map((r) => [String(r.m), Number(r[key])]));
    const sg = map(signups.rows);
    const sb = map(subs.rows);
    const cm = map(earn.rows, 'commission');
    const bn = map(earn.rows, 'bonus');
    const pd = map(paid.rows);
    const f = funnel.rows[0] ?? {};
    const rv = revenue.rows[0] ?? {};
    return {
      months: months.map((m) => ({
        month: m,
        signups: sg.get(m) ?? 0,
        subscribers: sb.get(m) ?? 0,
        commission: cm.get(m) ?? 0,
        bonus: bn.get(m) ?? 0,
        paid: pd.get(m) ?? 0,
      })),
      funnel: {
        clicks: Number(f.clicks ?? 0),
        signups: Number(f.signups ?? 0),
        verified: Number(f.verified ?? 0),
        active: Number(f.active ?? 0),
        subscribers: Number(f.subscribers ?? 0),
      },
      revenue: { total: Number(rv.revenue ?? 0), month: Number(rv.revenue_month ?? 0) },
      cost: Number(cost.rows[0]?.n ?? 0),
      flaggedAccounts: flagged.rows.length,
      top: top.rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        code: r.referral_code as string | null,
        members: Number(r.members),
        subscribers: Number(r.subscribers),
        earned: Number(r.earned),
      })),
    };
  }

  /** Tanda kecurigaan per akun (untuk ditinjau admin; tidak menghukum otomatis). */
  async flagsFor(parentIds: string[]): Promise<Map<string, AffiliateFlag[]>> {
    const out = new Map<string, AffiliateFlag[]>(parentIds.map((id) => [id, []]));
    if (parentIds.length === 0) return out;
    const add = (id: string, f: AffiliateFlag) => {
      const cur = out.get(id);
      if (cur && !cur.includes(f)) cur.push(f);
    };
    const ids = sql.join(
      parentIds.map((x) => sql`${x}::uuid`),
      sql`, `,
    );
    const shared = await this.db.execute(sql`
      select a.parent_id from affiliate_accounts a
      where a.parent_id in (${ids})
        and exists (select 1 from affiliate_accounts b where b.account_hash = a.account_hash and b.parent_id <> a.parent_id)`);
    for (const r of shared.rows) add(String(r.parent_id), 'shared_account');
    const mismatch = await this.db
      .select({ id: affiliateAccounts.parentId })
      .from(affiliateAccounts)
      .where(
        and(inArray(affiliateAccounts.parentId, parentIds), eq(affiliateAccounts.nameMatch, false)),
      );
    for (const r of mismatch) add(r.id, 'name_mismatch');
    const sameIp = await this.db.execute(sql`
      select distinct r.id from parents r join parents m on m.referred_by = r.id
      where r.id in (${ids}) and r.signup_ip_hash is not null
        and m.signup_ip_hash = r.signup_ip_hash`);
    for (const r of sameIp.rows) add(String(r.id), 'same_ip_referee');
    const cluster = await this.db.execute(sql`
      select referred_by as id from parents
      where referred_by in (${ids}) and signup_ip_hash is not null
      group by referred_by, signup_ip_hash having count(*) >= 3`);
    for (const r of cluster.rows) add(String(r.id), 'ip_cluster');
    return out;
  }

  async adminAffiliates(page = 1, q?: string) {
    const offset = (Math.max(1, page) - 1) * PAGE;
    const search = q
      ? sql`and (p.name ilike ${`%${q}%`} or p.email ilike ${`%${q}%`} or p.referral_code = ${normalizeReferralCode(q)})`
      : sql``;
    const res = await this.db.execute(sql`
      select p.id, p.name, p.email, p.referral_code, p.created_at,
        (select count(*) from parents m where m.referred_by = p.id)::int as members,
        (select count(*) from parents m where m.referred_by = p.id
          and exists (select 1 from orders o where o.parent_id = m.id and o.status = 'paid'))::int as subscribers,
        (select coalesce(sum(amount), 0) from affiliate_ledger l where l.parent_id = p.id and l.state = 'available')::int as available,
        (select coalesce(sum(amount), 0) from affiliate_ledger l where l.parent_id = p.id and l.state = 'pending')::int as pending,
        (select coalesce(sum(amount), 0) from affiliate_ledger l where l.parent_id = p.id and l.state <> 'void'
          and l.type in ('signup_bonus','commission'))::int as earned
      from parents p
      where (p.referral_code is not null or exists (select 1 from affiliate_ledger l where l.parent_id = p.id)) ${search}
      order by earned desc, members desc, p.created_at desc
      limit ${PAGE} offset ${offset}`);
    const ids = res.rows.map((r) => String(r.id));
    const flags = await this.flagsFor(ids);
    return {
      page,
      pageSize: PAGE,
      items: res.rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        email: String(r.email),
        code: r.referral_code as string | null,
        members: Number(r.members),
        subscribers: Number(r.subscribers),
        available: Number(r.available),
        pending: Number(r.pending),
        earned: Number(r.earned),
        flags: flags.get(String(r.id)) ?? [],
      })),
    };
  }

  async adminAffiliate(parentId: string) {
    const [p] = await this.db
      .select({
        id: parents.id,
        name: parents.name,
        email: parents.email,
        code: parents.referralCode,
      })
      .from(parents)
      .where(eq(parents.id, parentId));
    if (!p) throw new NotFoundException('Akun tidak ditemukan');
    await this.release(new Date(), parentId);
    const [balance, counts, account, ledger, members, flags] = await Promise.all([
      this.ledgerTotals(parentId),
      this.memberCounts(parentId),
      this.account(parentId),
      this.ledger(parentId, 1, 100),
      this.members(parentId, 1),
      this.flagsFor([parentId]),
    ]);
    return {
      ...p,
      balance,
      counts,
      account,
      ledger: ledger.items,
      members,
      flags: flags.get(parentId) ?? [],
    };
  }

  /** Koreksi saldo oleh admin (selalu baris baru beserta alasan; tidak mengubah catatan lama). */
  async adjust(parentId: string, amount: number, note: string, adminId: string) {
    if (!Number.isInteger(amount) || amount === 0)
      throw new BadRequestException('Jumlah tidak valid');
    const [row] = await this.db
      .insert(affiliateLedger)
      .values({
        parentId,
        type: 'adjustment',
        state: 'available',
        amount,
        note,
        createdBy: adminId,
      })
      .returning();
    return row;
  }

  /** Gugurkan bonus/komisi yang masih tertahan (mis. akun palsu, pembayaran ditarik). */
  async voidEntry(id: string, note: string, adminId: string) {
    const [row] = await this.db
      .update(affiliateLedger)
      .set({ state: 'void', note, createdBy: adminId, updatedAt: new Date() })
      .where(
        and(
          eq(affiliateLedger.id, id),
          eq(affiliateLedger.state, 'pending'),
          inArray(affiliateLedger.type, ['signup_bonus', 'commission']),
        ),
      )
      .returning();
    if (!row)
      throw new BadRequestException('Hanya bonus/komisi yang masih tertahan yang bisa digugurkan');
    return row;
  }

  async adminPayouts(status?: string) {
    const rows = await this.db
      .select({
        id: affiliatePayouts.id,
        number: affiliatePayouts.number,
        parentId: affiliatePayouts.parentId,
        name: parents.name,
        email: parents.email,
        amount: affiliatePayouts.amount,
        providerName: affiliatePayouts.providerName,
        kind: affiliatePayouts.kind,
        last4: affiliatePayouts.accountLast4,
        holderName: affiliatePayouts.holderName,
        status: affiliatePayouts.status,
        note: affiliatePayouts.note,
        transferRef: affiliatePayouts.transferRef,
        requestedAt: affiliatePayouts.requestedAt,
        paidAt: affiliatePayouts.paidAt,
      })
      .from(affiliatePayouts)
      .innerJoin(parents, eq(parents.id, affiliatePayouts.parentId))
      .where(status ? eq(affiliatePayouts.status, status) : undefined)
      .orderBy(desc(affiliatePayouts.requestedAt))
      .limit(100);
    const flags = await this.flagsFor([...new Set(rows.map((r) => r.parentId))]);
    return rows.map((r) => ({ ...r, flags: flags.get(r.parentId) ?? [] }));
  }

  /** Nomor rekening utuh untuk admin yang akan mentransfer (hanya untuk pengajuan yang masih terbuka). */
  async revealPayoutAccount(id: string) {
    const [row] = await this.db
      .select({ sealed: affiliatePayouts.accountSealed, status: affiliatePayouts.status })
      .from(affiliatePayouts)
      .where(eq(affiliatePayouts.id, id));
    if (!row) throw new NotFoundException('Pengajuan tidak ditemukan');
    if (row.status !== 'requested') throw new ConflictException('Pengajuan ini sudah diproses');
    const number = open(row.sealed as Sealed);
    if (!number)
      throw new ConflictException('Nomor rekening tidak bisa dibuka (kunci server berganti)');
    return { accountNumber: number };
  }

  /** Tandai sudah ditransfer: pengeluaran "Komisi afiliasi" masuk buku kas otomatis (laba owner ikut benar). */
  async markPaid(id: string, adminId: string, transferRef: string | null, now = new Date()) {
    const month = jakartaDate(now).slice(0, 7);
    const [closed] = await this.db
      .select({ id: commissionPayouts.id })
      .from(commissionPayouts)
      .where(eq(commissionPayouts.month, month))
      .limit(1);
    if (closed) throw new ConflictException(`Buku kas ${month} sudah ditutup`);
    const row = await this.db.transaction(async (tx) => {
      const [p] = await tx
        .select()
        .from(affiliatePayouts)
        .where(eq(affiliatePayouts.id, id))
        .for('update');
      if (!p) throw new NotFoundException('Pengajuan tidak ditemukan');
      if (p.status !== 'requested') throw new ConflictException('Pengajuan ini sudah diproses');
      const [cash] = await tx
        .insert(cashEntries)
        .values({
          date: jakartaDate(now),
          type: 'out',
          category: 'Komisi afiliasi',
          amount: p.amount,
          description: `${p.number} · ${p.providerName} •••• ${p.accountLast4}`,
          createdBy: adminId,
        })
        .returning({ id: cashEntries.id });
      const [done] = await tx
        .update(affiliatePayouts)
        .set({
          status: 'paid',
          transferRef,
          reviewedBy: adminId,
          reviewedAt: now,
          paidAt: now,
          cashEntryId: cash!.id,
        })
        .where(eq(affiliatePayouts.id, id))
        .returning();
      return done!;
    });
    await this.notifyPayout(row, 'paid');
    return row;
  }

  async rejectPayout(id: string, adminId: string, reason: string) {
    const row = await this.closePayout(id, { status: 'rejected', adminId, note: reason });
    await this.notifyPayout(row, 'rejected');
    return row;
  }

  private async notifyPayout(row: typeof affiliatePayouts.$inferSelect, ev: 'paid' | 'rejected') {
    const [p] = await this.db
      .select({ name: parents.name, email: parents.email })
      .from(parents)
      .where(eq(parents.id, row.parentId));
    if (!p) return;
    const base = {
      number: row.number,
      name: p.name,
      amount: row.amount,
      provider: row.providerName,
      last4: row.accountLast4,
      holderName: row.holderName,
    };
    const mail =
      ev === 'paid'
        ? affiliatePayoutPaid(this.mail.ctx(), { ...base, transferRef: row.transferRef })
        : affiliatePayoutRejected(this.mail.ctx(), { ...base, reason: row.note ?? '-' });
    await this.mail.enqueue(p.email, mail, { kind: `affiliate_${ev}`, refId: row.id });
  }

  async adminAccounts(status?: string) {
    const rows = await this.db
      .select({
        parentId: affiliateAccounts.parentId,
        name: parents.name,
        email: parents.email,
        providerName: affiliateAccounts.providerName,
        kind: affiliateAccounts.kind,
        last4: affiliateAccounts.accountLast4,
        holderName: affiliateAccounts.holderName,
        nameMatch: affiliateAccounts.nameMatch,
        status: affiliateAccounts.status,
        reviewNote: affiliateAccounts.reviewNote,
        changedAt: affiliateAccounts.changedAt,
      })
      .from(affiliateAccounts)
      .innerJoin(parents, eq(parents.id, affiliateAccounts.parentId))
      .where(status ? eq(affiliateAccounts.status, status) : undefined)
      .orderBy(desc(affiliateAccounts.changedAt))
      .limit(100);
    const flags = await this.flagsFor(rows.map((r) => r.parentId));
    return rows.map((r) => ({ ...r, flags: flags.get(r.parentId) ?? [] }));
  }

  async reviewAccount(parentId: string, approved: boolean, adminId: string, note: string | null) {
    const [row] = await this.db
      .update(affiliateAccounts)
      .set({
        status: approved ? 'verified' : 'rejected',
        reviewNote: note,
        verifiedBy: adminId,
        verifiedAt: approved ? new Date() : null,
      })
      .where(eq(affiliateAccounts.parentId, parentId))
      .returning();
    if (!row) throw new NotFoundException('Rekening tidak ditemukan');
    const [p] = await this.db
      .select({ name: parents.name, email: parents.email })
      .from(parents)
      .where(eq(parents.id, parentId));
    if (p)
      await this.mail.enqueue(
        p.email,
        affiliateAccountReviewed(this.mail.ctx(), {
          name: p.name,
          provider: row.providerName,
          last4: row.accountLast4,
          approved,
          reason: note,
        }),
        { kind: 'affiliate_account', refId: parentId },
      );
    return row;
  }

  // ---------------------------------------------------------------- batas anak (D-063)

  /** Jumlah anak aktif milik akun (dipakai bersama kunci baris akun di dalam transaksi). */
  static async activeChildren(tx: Tx | Db, parentId: string) {
    const [{ n } = { n: 0 }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(children)
      .where(and(eq(children.parentId, parentId), eq(children.active, true)));
    return Number(n);
  }
}

// Dipakai controller untuk menampilkan pesan yang sama dengan validasi server.
export { BLOCK_MESSAGE };
