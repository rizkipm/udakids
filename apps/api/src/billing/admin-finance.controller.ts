import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  cashEntryInputSchema,
  commissionShares,
  monthSchema,
  monthSummary,
  ownerInputSchema,
  totalPercentBp,
  type CashEntryInput,
  type OwnerInput,
  type SessionUser,
} from '@little-coder/engine';
import { and, asc, desc, eq, gte, isNull, like, lt, ne } from 'drizzle-orm';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { cashEntries, commissionPayouts, owners } from '../db/schema.js';
import { jakartaDate } from './billing.service.js';

const thisMonth = () => jakartaDate(new Date()).slice(0, 7);
const yearSchema = z.coerce.number().int().min(2020).max(2100);

/** Admin: buku kas, owner & persen komisi, komisi bulanan dari laba bersih (D-036). */
@Roles('admin')
@Controller('admin/finance')
export class AdminFinanceController {
  constructor(@Inject(DB) private readonly db: Db) {}

  // ------------------------------------------------------------ buku kas

  @Get('cash')
  async cash(@Query('month', new ZodPipe(monthSchema.optional())) month?: string) {
    const m = month ?? thisMonth();
    const entries = await this.db
      .select()
      .from(cashEntries)
      .where(like(cashEntries.date, `${m}-%`))
      .orderBy(asc(cashEntries.date), asc(cashEntries.createdAt));
    return { month: m, summary: monthSummary(entries as never, m), entries };
  }

  /** Ringkasan 12 bulan dalam setahun (pemasukan, pengeluaran, laba bersih). */
  @Get('summary')
  async summary(@Query('year', new ZodPipe(yearSchema.optional())) year?: number) {
    const y = year ?? Number(thisMonth().slice(0, 4));
    const entries = await this.db
      .select({ date: cashEntries.date, type: cashEntries.type, amount: cashEntries.amount })
      .from(cashEntries)
      .where(and(gte(cashEntries.date, `${y}-01-01`), lt(cashEntries.date, `${y + 1}-01-01`)));
    const months = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
    const rows = months.map((m) => monthSummary(entries as never, m));
    return {
      year: y,
      months: rows,
      total: rows.reduce(
        (a, r) => ({
          income: a.income + r.income,
          expense: a.expense + r.expense,
          net: a.net + r.net,
        }),
        { income: 0, expense: 0, net: 0 },
      ),
    };
  }

  @Post('cash')
  async addCash(
    @Body(new ZodPipe(cashEntryInputSchema)) body: CashEntryInput,
    @CurrentUser() user: SessionUser,
  ) {
    await this.assertOpen(body.date.slice(0, 7));
    const [row] = await this.db
      .insert(cashEntries)
      .values({ ...body, createdBy: user.id })
      .returning();
    return row;
  }

  @Put('cash/:id')
  async updateCash(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(cashEntryInputSchema)) body: CashEntryInput,
  ) {
    const cur = await this.manualEntry(id);
    await this.assertOpen(cur.date.slice(0, 7));
    await this.assertOpen(body.date.slice(0, 7));
    const [row] = await this.db
      .update(cashEntries)
      .set(body)
      .where(eq(cashEntries.id, id))
      .returning();
    return row;
  }

  @Delete('cash/:id')
  async deleteCash(@Param('id', ParseUUIDPipe) id: string) {
    const cur = await this.manualEntry(id);
    await this.assertOpen(cur.date.slice(0, 7));
    await this.db.delete(cashEntries).where(eq(cashEntries.id, id));
    return { deleted: true };
  }

  /** Pemasukan dari pesanan dibuat otomatis dan tidak bisa diubah manual. */
  private async manualEntry(id: string) {
    const [row] = await this.db.select().from(cashEntries).where(eq(cashEntries.id, id));
    if (!row) throw new NotFoundException('Catatan kas tidak ditemukan');
    if (row.orderId)
      throw new BadRequestException(
        'Pemasukan dari pesanan dicatat otomatis dan tidak bisa diubah',
      );
    return row;
  }

  /** Bulan yang komisinya sudah ditutup terkunci agar laba bersihnya tidak berubah. */
  private async assertOpen(month: string) {
    const [closed] = await this.db
      .select({ id: commissionPayouts.id })
      .from(commissionPayouts)
      .where(eq(commissionPayouts.month, month))
      .limit(1);
    if (closed)
      throw new ConflictException(`Buku kas ${month} sudah ditutup (komisi sudah dihitung)`);
  }

  // ------------------------------------------------------------ owner

  @Get('owners')
  owners() {
    return this.db.select().from(owners).orderBy(asc(owners.createdAt));
  }

  @Post('owners')
  async addOwner(@Body(new ZodPipe(ownerInputSchema)) body: OwnerInput) {
    await this.assertPercent(body);
    const [row] = await this.db.insert(owners).values(body).returning();
    return row;
  }

  @Put('owners/:id')
  async updateOwner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(ownerInputSchema)) body: OwnerInput,
  ) {
    await this.assertPercent(body, id);
    const [row] = await this.db.update(owners).set(body).where(eq(owners.id, id)).returning();
    if (!row) throw new NotFoundException('Owner tidak ditemukan');
    return row;
  }

  @Delete('owners/:id')
  async deleteOwner(@Param('id', ParseUUIDPipe) id: string) {
    await this.db.delete(owners).where(eq(owners.id, id));
    return { deleted: true };
  }

  private async assertPercent(body: OwnerInput, id?: string) {
    const others = await this.db
      .select({ percentBp: owners.percentBp, active: owners.active })
      .from(owners)
      .where(id ? ne(owners.id, id) : undefined);
    const total = totalPercentBp([...others, body]);
    if (total > 10_000)
      throw new BadRequestException({
        message: `Total komisi owner aktif ${total / 100}% — maksimal 100%`,
        issues: [{ path: 'percentBp', message: 'total persen owner aktif melebihi 100%' }],
      });
  }

  // ------------------------------------------------------------ komisi

  /**
   * Komisi satu bulan: laba bersih (buku kas) × persen tiap owner. Bulan yang sudah ditutup memakai
   * angka yang dibekukan saat ditutup; bulan berjalan memakai persen owner saat ini (perkiraan).
   */
  @Get('commission')
  async commission(@Query('month', new ZodPipe(monthSchema.optional())) month?: string) {
    const m = month ?? thisMonth();
    const summary = await this.summaryOf(m);
    const payouts = await this.db
      .select()
      .from(commissionPayouts)
      .where(eq(commissionPayouts.month, m))
      .orderBy(desc(commissionPayouts.amount));
    if (payouts.length > 0) return { month: m, summary, closed: true, shares: payouts };
    const list = await this.db.select().from(owners).orderBy(asc(owners.createdAt));
    return {
      month: m,
      summary,
      closed: false,
      canClose: m < thisMonth(),
      shares: commissionShares(summary.net, list).map((s) => ({
        id: null,
        ownerId: s.owner.id,
        ownerName: s.owner.name,
        percentBp: s.owner.percentBp,
        net: summary.net,
        amount: s.amount,
        paidAt: null,
      })),
    };
  }

  /**
   * Komisi setahun per bulan (D-100): kas, laba bersih, dan bagian tiap owner. Bulan yang sudah ditutup memakai
   * angka beku; bulan lain dihitung dari persen owner saat ini (perkiraan).
   */
  @Get('commission-year')
  async commissionYear(@Query('year', new ZodPipe(yearSchema.optional())) year?: number) {
    const y = year ?? Number(thisMonth().slice(0, 4));
    const entries = await this.db
      .select({ date: cashEntries.date, type: cashEntries.type, amount: cashEntries.amount })
      .from(cashEntries)
      .where(and(gte(cashEntries.date, `${y}-01-01`), lt(cashEntries.date, `${y + 1}-01-01`)));
    const frozen = await this.db
      .select()
      .from(commissionPayouts)
      .where(like(commissionPayouts.month, `${y}-%`));
    const list = await this.db.select().from(owners).orderBy(asc(owners.createdAt));
    const now = thisMonth();
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = `${y}-${String(i + 1).padStart(2, '0')}`;
      const summary = monthSummary(entries as never, m);
      const closed = frozen.filter((f) => f.month === m);
      const shares =
        closed.length > 0
          ? closed.map((f) => ({
              ownerId: f.ownerId,
              ownerName: f.ownerName,
              percentBp: f.percentBp,
              amount: f.amount,
              paidAt: f.paidAt,
            }))
          : commissionShares(summary.net, list).map((s) => ({
              ownerId: s.owner.id,
              ownerName: s.owner.name,
              percentBp: s.owner.percentBp,
              amount: s.amount,
              paidAt: null,
            }));
      return { ...summary, closed: closed.length > 0, future: m > now, shares };
    });
    return { year: y, months };
  }

  private async summaryOf(m: string) {
    const entries = await this.db
      .select({ date: cashEntries.date, type: cashEntries.type, amount: cashEntries.amount })
      .from(cashEntries)
      .where(like(cashEntries.date, `${m}-%`));
    return monthSummary(entries as never, m);
  }

  /** Tutup bulan yang sudah lewat: bekukan laba bersih & komisi tiap owner. */
  @Post('commission/:month/close')
  async close(
    @Param('month', new ZodPipe(monthSchema)) month: string,
    @CurrentUser() user: SessionUser,
  ) {
    if (month >= thisMonth())
      throw new BadRequestException('Hanya bulan yang sudah lewat yang bisa ditutup');
    return this.db.transaction(async (tx) => {
      const [done] = await tx
        .select({ id: commissionPayouts.id })
        .from(commissionPayouts)
        .where(eq(commissionPayouts.month, month))
        .limit(1);
      if (done) throw new ConflictException('Bulan ini sudah ditutup');
      const list = await tx.select().from(owners).where(eq(owners.active, true));
      if (list.length === 0) throw new BadRequestException('Tambahkan owner terlebih dulu');
      const summary = await this.summaryOf(month);
      const rows = commissionShares(summary.net, list).map((s) => ({
        month,
        ownerId: s.owner.id,
        ownerName: s.owner.name,
        percentBp: s.owner.percentBp,
        net: summary.net,
        amount: s.amount,
        createdBy: user.id,
      }));
      return tx.insert(commissionPayouts).values(rows).returning();
    });
  }

  @Post('commission/payouts/:id/paid')
  @HttpCode(200)
  async markPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(z.strictObject({ paid: z.boolean() }))) body: { paid: boolean },
  ) {
    const [row] = await this.db
      .update(commissionPayouts)
      .set({ paidAt: body.paid ? new Date() : null })
      .where(
        and(eq(commissionPayouts.id, id), body.paid ? isNull(commissionPayouts.paidAt) : undefined),
      )
      .returning();
    if (!row) throw new NotFoundException('Komisi tidak ditemukan atau sudah ditandai dibayar');
    return row;
  }
}
