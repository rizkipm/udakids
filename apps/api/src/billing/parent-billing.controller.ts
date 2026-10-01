import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import {
  orderCreateSchema,
  PROOF_MAX_BYTES,
  sniffProofType,
  type SessionUser,
} from '@little-coder/engine';
import type { Request, Response } from 'express';
import type { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { SettingsService } from '../settings/settings.service.js';
import { BillingService } from './billing.service.js';

/** Orang tua: paket, pesanan transfer manual, bukti transfer, riwayat (D-036). */
@Roles('parent')
@Controller('parent')
export class ParentBillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly settings: SettingsService,
  ) {}

  @Get('billing')
  async overview(@CurrentUser() user: SessionUser) {
    const [packages, methods, entitlements, access, s] = await Promise.all([
      this.billing.activePackages(),
      this.billing.activeMethods(),
      this.billing.entitlementsOf(user.id),
      this.billing.accessForParent(user.id),
      this.settings.get('billing'),
    ]);
    return {
      packages,
      methods,
      entitlements: entitlements.map((e) => ({
        id: e.id,
        name: e.name,
        scope: e.scope,
        books: e.books,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
      })),
      access,
      settings: {
        paywall: s.paywall,
        freeLevels: s.freeLevels,
        orderExpiryHours: s.orderExpiryHours,
      },
    };
  }

  @Get('orders')
  orders(@CurrentUser() user: SessionUser) {
    return this.billing.parentOrders(user.id);
  }

  @Post('orders')
  create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(orderCreateSchema)) body: z.infer<typeof orderCreateSchema>,
  ) {
    return this.billing.createOrder(user.id, body.packageId, body.methodId);
  }

  @Get('orders/:id')
  one(@CurrentUser() user: SessionUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.billing.ownOrder(user.id, id);
  }

  /** Unggah bukti transfer: badan = file JPG/PNG/WEBP/PDF (maks 2 MB), dicek dari isinya. */
  @Put('orders/:id/proof')
  async proof(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const body = req.body as unknown;
    if (!Buffer.isBuffer(body) || body.length === 0)
      throw new BadRequestException('Pilih foto/PDF bukti transfer (JPG, PNG, WEBP, atau PDF)');
    if (body.length > PROOF_MAX_BYTES) throw new BadRequestException('Ukuran file maksimal 2 MB');
    const mime = sniffProofType(body);
    if (!mime) throw new BadRequestException('File harus berupa foto (JPG/PNG/WEBP) atau PDF');
    return this.billing.saveProof(user.id, id, body, mime);
  }

  @Get('orders/:id/proof')
  async getProof(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const p = await this.billing.proof(id, user.id);
    res
      .setHeader('Content-Type', p.mime)
      .setHeader('Cache-Control', 'private, no-store')
      .send(p.data);
  }

  @Post('orders/:id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: SessionUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.billing.cancel(user.id, id);
  }
}
