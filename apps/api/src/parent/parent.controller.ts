import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  childClaimSchema,
  childProfileSchema,
  childUpdateSchema,
  type SessionUser,
  parseMomoLook,
} from '@little-coder/engine';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { hashSecret, pinSecret, randomToken } from '../common/crypto.js';
import { forgetAccount } from '../auth/auth.guard.js';
import { AuthService } from '../auth/auth.service.js';
import { RateLimiter } from '../common/rate-limit.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { children, classes } from '../db/schema.js';
import { ReportsService } from '../reports/reports.service.js';

const publicChild = {
  id: children.id,
  nickname: children.nickname,
  momoColor: children.momoColor,
  momoLook: children.momoLook,
  lastActiveAt: children.lastActiveAt,
  createdAt: children.createdAt,
  classId: children.classId,
};

@Roles('parent')
@Controller('parent/children')
export class ParentController {
  /** 10 percobaan tautkan anak yang gagal per 15 menit per orang tua. */
  private readonly claimLimiter = new RateLimiter(10, 15 * 60_000);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly reports: ReportsService,
    private readonly auth: AuthService,
  ) {}

  private async own(user: SessionUser, id: string) {
    const [row] = await this.db
      .select(publicChild)
      .from(children)
      .where(and(eq(children.id, id), eq(children.parentId, user.id), eq(children.active, true)));
    if (!row) throw new NotFoundException('Anak tidak ditemukan');
    return row;
  }

  /** Kode kelas workshop → id kelas (kelas yang sudah ditutup tidak menerima anggota). */
  private async classIdFor(code: string | null | undefined): Promise<string | null | undefined> {
    if (code === undefined) return undefined;
    if (code === null) return null;
    const [cls] = await this.db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.code, code), isNull(classes.closedAt)));
    if (!cls)
      throw new BadRequestException({
        message: 'Kode kelas tidak ditemukan',
        issues: [
          { path: 'classCode', message: 'Kode kelas tidak ditemukan atau kelas sudah ditutup' },
        ],
      });
    return cls.id;
  }

  /** Tambahkan nama & kode kelas ke profil anak. */
  private async withClass<T extends { classId: string | null }>(rows: T[]) {
    const ids = [...new Set(rows.map((r) => r.classId).filter((x): x is string => !!x))];
    const list = ids.length
      ? await this.db
          .select({ id: classes.id, code: classes.code, eventName: classes.eventName })
          .from(classes)
          .where(inArray(classes.id, ids))
      : [];
    const byId = new Map(list.map((c) => [c.id, c]));
    return rows.map((r) => ({
      ...r,
      ...('momoLook' in r && { momoLook: parseMomoLook((r as { momoLook: unknown }).momoLook) }),
      className: r.classId ? (byId.get(r.classId)?.eventName ?? null) : null,
      classCode: r.classId ? (byId.get(r.classId)?.code ?? null) : null,
    }));
  }

  @Get()
  async list(@CurrentUser() user: SessionUser) {
    const rows = await this.db
      .select(publicChild)
      .from(children)
      .where(and(eq(children.parentId, user.id), eq(children.active, true)))
      .orderBy(children.createdAt);
    return this.withClass(rows);
  }

  @Post()
  async create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(childProfileSchema)) body: z.infer<typeof childProfileSchema>,
  ) {
    const [row] = await this.db
      .insert(children)
      .values({
        parentId: user.id,
        nickname: body.nickname,
        momoColor: body.momoColor,
        momoLook: body.momoLook ?? null,
        picturePinHash: await hashSecret(pinSecret(body.pin)),
        reportToken: randomToken(),
        classId: (await this.classIdFor(body.classCode)) ?? null,
      })
      .returning(publicChild);
    return (await this.withClass([row!]))[0];
  }

  /**
   * Tautkan anak yang daftar sendiri (D-037): kode keluarga anak + sandi gambarnya membuktikan anak itu
   * ada di dekat orang tua. Setelah ditautkan, paket keluarga berlaku dan laporan muncul di dasbor.
   * Kode milik anak tetap bisa dipakai untuk masuk.
   */
  @Post('claim')
  async claim(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(childClaimSchema)) body: z.infer<typeof childClaimSchema>,
  ) {
    const key = `claim:${user.id}`;
    const codeKey = `claim-code:${body.familyCode}`;
    this.claimLimiter.check(key);
    this.claimLimiter.check(codeKey);
    const [row] = await this.db
      .select()
      .from(children)
      .where(and(eq(children.selfCode, body.familyCode), eq(children.active, true)));
    // Percobaan gagal juga dihitung di kunci sandi gambar anak (bertingkat), bukan hanya per akun.
    if (!row || !(await this.auth.checkPin(row, body.pin))) {
      this.claimLimiter.fail(key);
      this.claimLimiter.fail(codeKey);
      throw new NotFoundException('Kode atau sandi gambar anak tidak cocok');
    }
    if (row.parentId && row.parentId !== user.id)
      throw new BadRequestException('Anak ini sudah tertaut ke akun orang tua lain');
    const [child] = await this.db
      .update(children)
      .set({ parentId: user.id })
      .where(eq(children.id, row.id))
      .returning(publicChild);
    this.claimLimiter.reset(key);
    this.claimLimiter.reset(codeKey);
    return (await this.withClass([child!]))[0];
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(childUpdateSchema)) body: z.infer<typeof childUpdateSchema>,
  ) {
    await this.own(user, id);
    const classId = await this.classIdFor(body.classCode);
    const [row] = await this.db
      .update(children)
      .set({
        ...(classId !== undefined && { classId }),
        ...(body.nickname && { nickname: body.nickname }),
        ...(body.momoColor && { momoColor: body.momoColor }),
        ...(body.momoLook !== undefined && { momoLook: body.momoLook }),
        ...(body.pin && {
          picturePinHash: await hashSecret(pinSecret(body.pin)),
          failedPinAttempts: 0,
          pinLockedUntil: null,
        }),
      })
      .where(eq(children.id, id))
      .returning(publicChild);
    return (await this.withClass([row!]))[0];
  }

  /** Menghapus profil anak beserta seluruh progresnya (hak hapus data, UU PDP). */
  @Delete(':id')
  async remove(@CurrentUser() user: SessionUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.own(user, id);
    await this.db.delete(children).where(eq(children.id, id));
    forgetAccount(id);
    return { ok: true };
  }

  @Get(':id/report')
  async report(@CurrentUser() user: SessionUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.own(user, id);
    return this.reports.childReport(id);
  }
}
