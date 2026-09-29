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
import { childProfileSchema, childUpdateSchema, type SessionUser } from '@little-coder/engine';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { hashSecret, pinSecret, randomToken } from '../common/crypto.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { children, classes } from '../db/schema.js';
import { ReportsService } from '../reports/reports.service.js';

const publicChild = {
  id: children.id,
  nickname: children.nickname,
  momoColor: children.momoColor,
  lastActiveAt: children.lastActiveAt,
  createdAt: children.createdAt,
  classId: children.classId,
};

@Roles('parent')
@Controller('parent/children')
export class ParentController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly reports: ReportsService,
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
        picturePinHash: await hashSecret(pinSecret(body.pin)),
        reportToken: randomToken(),
        classId: (await this.classIdFor(body.classCode)) ?? null,
      })
      .returning(publicChild);
    return (await this.withClass([row!]))[0];
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
    return { ok: true };
  }

  @Get(':id/report')
  async report(@CurrentUser() user: SessionUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.own(user, id);
    return this.reports.childReport(id);
  }
}
