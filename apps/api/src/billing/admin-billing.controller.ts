import {
  Body,
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
  Res,
} from '@nestjs/common';
import {
  billingSettingsSchema,
  ORDER_STATUSES,
  orderRejectSchema,
  packageInputSchema,
  paymentMethodInputSchema,
  type BillingSettings,
  type PackageInput,
  type PaymentMethodInput,
  type SessionUser,
} from '@little-coder/engine';
import { eq, sql } from 'drizzle-orm';
import type { Response } from 'express';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { orders, packages, paymentMethods } from '../db/schema.js';
import { SettingsService } from '../settings/settings.service.js';
import { BillingService, packageView } from './billing.service.js';

const toRow = (p: PackageInput) => ({
  ...p,
  books: p.scope === 'all' ? [] : p.books,
  discountValue: p.discountType === 'none' ? 0 : p.discountValue,
  discountStartsAt: p.discountStartsAt ? new Date(p.discountStartsAt) : null,
  discountEndsAt: p.discountEndsAt ? new Date(p.discountEndsAt) : null,
  updatedAt: new Date(),
});

/** Admin: paket & harga/diskon, rekening tujuan, verifikasi transfer, pengaturan billing (D-036). */
@Roles('admin')
@Controller('admin')
export class AdminBillingController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly billing: BillingService,
    private readonly settings: SettingsService,
  ) {}

  @Get('billing/settings')
  getSettings() {
    return this.settings.get('billing');
  }

  @Put('billing/settings')
  saveSettings(
    @Body(new ZodPipe(billingSettingsSchema)) body: BillingSettings,
    @CurrentUser() user: SessionUser,
  ) {
    return this.settings.set('billing', body, user.id);
  }

  // ------------------------------------------------------------ paket

  @Get('packages')
  async packages() {
    const rows = await this.db.select().from(packages).orderBy(packages.sort, packages.price);
    const counts = await this.db
      .select({
        id: orders.packageId,
        paid: sql<number>`count(*) filter (where ${orders.status} = 'paid')::int`,
      })
      .from(orders)
      .groupBy(orders.packageId);
    const paid = new Map(counts.map((c) => [c.id, c.paid]));
    return rows.map((p) => ({ ...packageView(p), sold: paid.get(p.id) ?? 0 }));
  }

  @Post('packages')
  async createPackage(@Body(new ZodPipe(packageInputSchema)) body: PackageInput) {
    const [row] = await this.db.insert(packages).values(toRow(body)).returning();
    return packageView(row!);
  }

  @Put('packages/:id')
  async updatePackage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(packageInputSchema)) body: PackageInput,
  ) {
    const [row] = await this.db
      .update(packages)
      .set(toRow(body))
      .where(eq(packages.id, id))
      .returning();
    if (!row) throw new NotFoundException('Paket tidak ditemukan');
    return packageView(row);
  }

  /** Paket yang sudah pernah dipesan hanya dinonaktifkan (riwayat tetap utuh). */
  @Delete('packages/:id')
  async deletePackage(@Param('id', ParseUUIDPipe) id: string) {
    const [used] = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.packageId, id))
      .limit(1);
    if (used) {
      await this.db.update(packages).set({ active: false }).where(eq(packages.id, id));
      return { deleted: false, deactivated: true };
    }
    await this.db.delete(packages).where(eq(packages.id, id));
    return { deleted: true, deactivated: false };
  }

  // ------------------------------------------------------------ rekening / e-wallet

  @Get('payment-methods')
  methods() {
    return this.db
      .select()
      .from(paymentMethods)
      .orderBy(paymentMethods.sort, paymentMethods.provider);
  }

  @Post('payment-methods')
  async createMethod(@Body(new ZodPipe(paymentMethodInputSchema)) body: PaymentMethodInput) {
    const [row] = await this.db.insert(paymentMethods).values(body).returning();
    return row;
  }

  @Put('payment-methods/:id')
  async updateMethod(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(paymentMethodInputSchema)) body: PaymentMethodInput,
  ) {
    const [row] = await this.db
      .update(paymentMethods)
      .set(body)
      .where(eq(paymentMethods.id, id))
      .returning();
    if (!row) throw new NotFoundException('Metode pembayaran tidak ditemukan');
    return row;
  }

  /** Pesanan menyimpan salinan rekening, jadi metode bisa dihapus tanpa merusak riwayat. */
  @Delete('payment-methods/:id')
  async deleteMethod(@Param('id', ParseUUIDPipe) id: string) {
    await this.db.delete(paymentMethods).where(eq(paymentMethods.id, id));
    return { deleted: true };
  }

  // ------------------------------------------------------------ transaksi

  @Get('orders')
  orders(@Query('status', new ZodPipe(z.enum(ORDER_STATUSES).optional())) status?: string) {
    return this.billing.adminOrders(status);
  }

  @Get('orders/pending-count')
  async pending() {
    return { count: await this.billing.pendingCount() };
  }

  @Get('orders/:id/proof')
  async proof(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const p = await this.billing.proof(id);
    res
      .setHeader('Content-Type', p.mime)
      .setHeader('Cache-Control', 'private, no-store')
      .send(p.data);
  }

  @Post('orders/:id/approve')
  @HttpCode(200)
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.billing.approve(id, user.id);
  }

  @Post('orders/:id/reject')
  @HttpCode(200)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(orderRejectSchema)) body: z.infer<typeof orderRejectSchema>,
    @CurrentUser() user: SessionUser,
  ) {
    return this.billing.reject(id, user.id, body.reason);
  }
}
