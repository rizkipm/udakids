import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  activeToggleSchema,
  setPasswordSchema,
  setPinSchema,
  staffCreateSchema,
  staffUpdateSchema,
  type SessionUser,
  MAX_CHILDREN_PER_PARENT,
} from '@little-coder/engine';
import { and, count, eq, ne } from 'drizzle-orm';
import type { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { hashSecret, pinSecret } from '../common/crypto.js';
import { forgetAccount } from '../auth/auth.guard.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { children, parents, staffUsers } from '../db/schema.js';
import { AffiliateService } from '../affiliate/affiliate.service.js';
import { ReportsService } from '../reports/reports.service.js';

const staffPublic = {
  id: staffUsers.id,
  email: staffUsers.email,
  name: staffUsers.name,
  role: staffUsers.role,
  active: staffUsers.active,
  createdAt: staffUsers.createdAt,
};

@Roles('admin')
@Controller('admin')
export class AdminUsersController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly reports: ReportsService,
  ) {}

  @Get('staff')
  staff() {
    return this.db.select(staffPublic).from(staffUsers).orderBy(staffUsers.createdAt);
  }

  @Post('staff')
  async createStaff(@Body(new ZodPipe(staffCreateSchema)) body: z.infer<typeof staffCreateSchema>) {
    const [row] = await this.db
      .insert(staffUsers)
      .values({
        email: body.email,
        name: body.name,
        role: body.role,
        passwordHash: await hashSecret(body.password),
      })
      .onConflictDoNothing()
      .returning(staffPublic);
    // Unik tanpa membedakan huruf besar/kecil (indeks lower(email)); aman dari balapan permintaan.
    if (!row) throw new ConflictException('Email sudah dipakai');
    return row;
  }

  @Patch('staff/:id')
  async updateStaff(
    @CurrentUser() me: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(staffUpdateSchema)) body: z.infer<typeof staffUpdateSchema>,
  ) {
    const [prev] = await this.db.select().from(staffUsers).where(eq(staffUsers.id, id));
    if (!prev) throw new NotFoundException('Akun tidak ditemukan');
    // Akun sendiri: hanya nama & password; peran/status diubah oleh admin lain (audit H1).
    if (id === me.id && (body.role !== undefined || body.active !== undefined))
      throw new BadRequestException('Peran dan status akun sendiri diubah oleh admin lain');
    const demoting =
      prev.role === 'admin' && ((body.role && body.role !== 'admin') || body.active === false);
    if (demoting) {
      if (id === me.id)
        throw new BadRequestException('Tidak bisa menonaktifkan / menurunkan akun sendiri');
      const [others] = await this.db
        .select({ n: count() })
        .from(staffUsers)
        .where(
          and(eq(staffUsers.role, 'admin'), eq(staffUsers.active, true), ne(staffUsers.id, id)),
        );
      if (Number(others?.n ?? 0) === 0)
        throw new BadRequestException('Harus ada minimal satu admin aktif');
    }
    const [row] = await this.db
      .update(staffUsers)
      .set({
        ...(body.name && { name: body.name }),
        ...(body.role && { role: body.role }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.password && { passwordHash: await hashSecret(body.password) }),
      })
      .where(eq(staffUsers.id, id))
      .returning(staffPublic);
    forgetAccount(id);
    return row;
  }

  @Get('parents')
  async parentsList() {
    const rows = await this.db
      .select({
        id: parents.id,
        name: parents.name,
        email: parents.email,
        familyCode: parents.familyCode,
        active: parents.active,
        consentAt: parents.consentAt,
        createdAt: parents.createdAt,
      })
      .from(parents)
      .orderBy(parents.createdAt);
    const kids = await this.db
      .select({
        id: children.id,
        parentId: children.parentId,
        nickname: children.nickname,
        momoColor: children.momoColor,
        active: children.active,
        lastActiveAt: children.lastActiveAt,
      })
      .from(children);
    return rows.map((p) => ({ ...p, children: kids.filter((k) => k.parentId === p.id) }));
  }

  @Patch('parents/:id')
  async parentActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(activeToggleSchema)) body: z.infer<typeof activeToggleSchema>,
  ) {
    const [row] = await this.db
      .update(parents)
      .set({ active: body.active })
      .where(eq(parents.id, id))
      .returning({ id: parents.id, active: parents.active });
    if (!row) throw new NotFoundException('Orang tua tidak ditemukan');
    forgetAccount(id);
    return row;
  }

  @Post('parents/:id/password')
  async parentPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(setPasswordSchema)) body: z.infer<typeof setPasswordSchema>,
  ) {
    const [row] = await this.db
      .update(parents)
      .set({ passwordHash: await hashSecret(body.password) })
      .where(eq(parents.id, id))
      .returning({ id: parents.id });
    if (!row) throw new NotFoundException('Orang tua tidak ditemukan');
    return { ok: true };
  }

  @Get('children')
  childrenList() {
    return this.reports.childrenSummary();
  }

  @Get('children/:id/report')
  childReport(@Param('id', ParseUUIDPipe) id: string) {
    return this.reports.childReport(id);
  }

  @Patch('children/:id')
  async childActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(activeToggleSchema)) body: z.infer<typeof activeToggleSchema>,
  ) {
    if (body.active) {
      // Mengaktifkan kembali tidak boleh menembus batas 7 anak per akun orang tua (D-063).
      const [child] = await this.db
        .select({ parentId: children.parentId, active: children.active })
        .from(children)
        .where(eq(children.id, id));
      if (
        child?.parentId &&
        !child.active &&
        (await AffiliateService.activeChildren(this.db, child.parentId)) >= MAX_CHILDREN_PER_PARENT
      )
        throw new BadRequestException(
          `Akun orang tua anak ini sudah punya ${MAX_CHILDREN_PER_PARENT} anak aktif`,
        );
    }
    const [row] = await this.db
      .update(children)
      .set({ active: body.active })
      .where(eq(children.id, id))
      .returning({ id: children.id, active: children.active });
    if (!row) throw new NotFoundException('Anak tidak ditemukan');
    forgetAccount(id);
    return row;
  }

  @Post('children/:id/pin')
  async childPin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(setPinSchema)) body: z.infer<typeof setPinSchema>,
  ) {
    const [row] = await this.db
      .update(children)
      .set({
        picturePinHash: await hashSecret(pinSecret(body.pin)),
        failedPinAttempts: 0,
        pinLockedUntil: null,
      })
      .where(eq(children.id, id))
      .returning({ id: children.id });
    if (!row) throw new NotFoundException('Anak tidak ditemukan');
    return { ok: true };
  }

  @Get('reports/overview')
  overview() {
    return this.reports.overview();
  }

  @Get('reports/skills')
  skillStats() {
    return this.reports.skillStats();
  }
}
