import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import {
  affiliateSettingsSchema,
  payoutAccountInputSchema,
  payoutRequestSchema,
  type AffiliateSettings,
  type PayoutAccountInput,
  type SessionUser,
} from '@little-coder/engine';
import type { Request } from 'express';
import { z } from 'zod';
import { CurrentUser, Public, Roles } from '../auth/decorators.js';
import { clientIp } from '../common/rate-limit.js';
import { periodQuerySchema, resolvePeriod, type PeriodQuery } from '../reports/period.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { mailConfig } from '../mail/mail.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { AffiliateService } from './affiliate.service.js';

const pageQuery = z.object({ page: z.coerce.number().int().min(1).max(10_000).default(1) });
const codeParam = z.string().trim().min(1).max(20);

/** Orang tua: kode & link, anggota, analisis, saldo, rekening, pencairan (D-063). Tidak ada di area anak. */
@Roles('parent')
@Controller('parent/affiliate')
export class ParentAffiliateController {
  constructor(private readonly affiliate: AffiliateService) {}

  @Get()
  overview(@CurrentUser() user: SessionUser) {
    return this.affiliate.overview(user.id, mailConfig().appUrl);
  }

  @Get('members')
  members(
    @CurrentUser() user: SessionUser,
    @Query(new ZodPipe(pageQuery)) q: z.infer<typeof pageQuery>,
  ) {
    return this.affiliate.members(user.id, q.page);
  }

  @Get('analytics')
  analytics(@CurrentUser() user: SessionUser) {
    return this.affiliate.analytics(user.id);
  }

  @Get('ledger')
  ledger(
    @CurrentUser() user: SessionUser,
    @Query(new ZodPipe(pageQuery)) q: z.infer<typeof pageQuery>,
  ) {
    return this.affiliate.ledger(user.id, q.page);
  }

  @Get('payouts')
  payouts(@CurrentUser() user: SessionUser) {
    return this.affiliate.payouts(user.id);
  }

  @Post('account/code')
  @HttpCode(200)
  accountCode(@CurrentUser() user: SessionUser) {
    return this.affiliate.requestAccountCode(user.id);
  }

  @Put('account')
  saveAccount(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(payoutAccountInputSchema)) body: PayoutAccountInput,
  ) {
    return this.affiliate.saveAccount(user.id, body);
  }

  @Post('payouts')
  requestPayout(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(payoutRequestSchema)) body: z.infer<typeof payoutRequestSchema>,
  ) {
    return this.affiliate.requestPayout(user.id, body.amount);
  }

  @Post('payouts/:id/cancel')
  @HttpCode(200)
  cancelPayout(@CurrentUser() user: SessionUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.affiliate.cancelPayout(user.id, id);
  }
}

/** Publik: cek kode referal di form daftar & hitung klik link (tanpa data pengunjung). */
@Controller('referral')
export class PublicReferralController {
  constructor(private readonly affiliate: AffiliateService) {}

  @Public()
  @Get(':code')
  async preview(@Param('code', new ZodPipe(codeParam)) code: string, @Req() req: Request) {
    const key = `ref:${clientIp(req)}`;
    this.affiliate.lookupLimiter.check(key);
    this.affiliate.lookupLimiter.fail(key);
    return this.affiliate.preview(code);
  }

  @Public()
  @Post(':code/click')
  @HttpCode(204)
  async click(@Param('code', new ZodPipe(codeParam)) code: string, @Req() req: Request) {
    await this.affiliate.recordClick(code, clientIp(req));
  }
}

const adjustSchema = z.strictObject({
  amount: z.number().int().min(-100_000_000).max(100_000_000),
  note: z.string().trim().min(3).max(200),
});
const voidSchema = z.strictObject({ note: z.string().trim().min(3).max(200) });
const paidSchema = z.strictObject({
  transferRef: z.string().trim().max(80).nullable().default(null),
});
const rejectSchema = z.strictObject({ reason: z.string().trim().min(3).max(200) });
const reviewSchema = z.strictObject({
  approved: z.boolean(),
  note: z.string().trim().max(200).nullable().default(null),
});
const listQuery = z.object({
  status: z
    .string()
    .regex(/^[a-z_]+$/)
    .optional(),
});
const affiliatesQuery = pageQuery.extend({ q: z.string().trim().max(80).optional() });

/** Admin: pengaturan, afiliator & tanda kecurigaan, koreksi saldo, verifikasi rekening, antrean pencairan. */
@Roles('admin')
@Controller('admin/affiliate')
export class AdminAffiliateController {
  constructor(
    private readonly affiliate: AffiliateService,
    private readonly settings: SettingsService,
  ) {}

  @Get()
  overview() {
    return this.affiliate.adminOverview();
  }

  /** Tanpa query = sepanjang waktu; `days` / `year` (+ `month`) = periode filter ringkasan admin (D-100). */
  @Get('analytics')
  analytics(@Query(new ZodPipe(periodQuerySchema)) q: PeriodQuery) {
    const hasPeriod = q.days !== undefined || q.year !== undefined;
    return this.affiliate.adminAnalytics(new Date(), hasPeriod ? resolvePeriod(q) : undefined);
  }

  @Get('settings')
  getSettings() {
    return this.settings.get('affiliate');
  }

  @Put('settings')
  putSettings(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(affiliateSettingsSchema)) body: AffiliateSettings,
  ) {
    return this.settings.set('affiliate', body, user.id);
  }

  @Get('affiliates')
  affiliates(@Query(new ZodPipe(affiliatesQuery)) q: z.infer<typeof affiliatesQuery>) {
    return this.affiliate.adminAffiliates(q.page, q.q);
  }

  @Get('affiliates/:id')
  affiliateDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.affiliate.adminAffiliate(id);
  }

  @Post('affiliates/:id/adjust')
  adjust(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(adjustSchema)) body: z.infer<typeof adjustSchema>,
  ) {
    return this.affiliate.adjust(id, body.amount, body.note, user.id);
  }

  @Post('ledger/:id/void')
  @HttpCode(200)
  voidEntry(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(voidSchema)) body: z.infer<typeof voidSchema>,
  ) {
    return this.affiliate.voidEntry(id, body.note, user.id);
  }

  @Get('payouts')
  payouts(@Query(new ZodPipe(listQuery)) q: z.infer<typeof listQuery>) {
    return this.affiliate.adminPayouts(q.status);
  }

  @Get('payouts/:id/account')
  revealAccount(@Param('id', ParseUUIDPipe) id: string) {
    return this.affiliate.revealPayoutAccount(id);
  }

  @Post('payouts/:id/paid')
  @HttpCode(200)
  markPaid(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(paidSchema)) body: z.infer<typeof paidSchema>,
  ) {
    return this.affiliate.markPaid(id, user.id, body.transferRef || null);
  }

  @Post('payouts/:id/reject')
  @HttpCode(200)
  reject(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(rejectSchema)) body: z.infer<typeof rejectSchema>,
  ) {
    return this.affiliate.rejectPayout(id, user.id, body.reason);
  }

  @Get('accounts')
  accounts(@Query(new ZodPipe(listQuery)) q: z.infer<typeof listQuery>) {
    return this.affiliate.adminAccounts(q.status);
  }

  @Post('accounts/:parentId/review')
  @HttpCode(200)
  review(
    @CurrentUser() user: SessionUser,
    @Param('parentId', ParseUUIDPipe) parentId: string,
    @Body(new ZodPipe(reviewSchema)) body: z.infer<typeof reviewSchema>,
  ) {
    return this.affiliate.reviewAccount(parentId, body.approved, user.id, body.note);
  }
}
