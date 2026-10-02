import {
  BadRequestException,
  ForbiddenException,
  Body,
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
  classCreateSchema,
  classRosterSchema,
  classUpdateSchema,
  MOMO_COLORS,
  PIN_LENGTH,
  PIN_PICTURES,
  type SessionUser,
} from '@little-coder/engine';
import { randomInt } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { uniqueEntryCode } from '../common/codes.js';
import { hashSecret, pinSecret, randomToken } from '../common/crypto.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { children, classes, parentContacts, staffUsers } from '../db/schema.js';

/** Sandi gambar acak untuk kartu masuk yang dicetak fasilitator (3 gambar berbeda). */
function randomPin(): string[] {
  const pool = [...PIN_PICTURES] as string[];
  return Array.from({ length: PIN_LENGTH }, () => pool.splice(randomInt(pool.length), 1)[0]!);
}

/** Kelas workshop. Admin melihat semua kelas; fasilitator hanya kelasnya sendiri (PRD A12). */
@Roles('admin', 'facilitator')
@Controller('classes')
export class ClassesController {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(user: SessionUser) {
    return user.role === 'admin' ? undefined : eq(classes.facilitatorId, user.id);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.db
      .select({
        id: classes.id,
        code: classes.code,
        eventName: classes.eventName,
        world: classes.world,
        frozen: classes.frozen,
        closedAt: classes.closedAt,
        createdAt: classes.createdAt,
        facilitatorName: staffUsers.name,
      })
      .from(classes)
      .leftJoin(staffUsers, eq(classes.facilitatorId, staffUsers.id))
      .where(this.scope(user))
      .orderBy(desc(classes.createdAt));
  }

  @Post()
  async create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(classCreateSchema)) body: z.infer<typeof classCreateSchema>,
  ) {
    const facilitatorId =
      user.role === 'admin' && body.facilitatorId ? body.facilitatorId : user.id;
    const code = await uniqueEntryCode(this.db);
    const [row] = await this.db
      .insert(classes)
      .values({ code, eventName: body.eventName, world: body.world, facilitatorId })
      .returning();
    return row;
  }

  private async own(user: SessionUser, id: string) {
    const scope = this.scope(user);
    const [row] = await this.db
      .select()
      .from(classes)
      .where(scope ? and(eq(classes.id, id), scope) : eq(classes.id, id));
    if (!row) throw new NotFoundException('Kelas tidak ditemukan');
    return row;
  }

  /** Daftar siswa kelas (nama panggilan + warna saja). */
  @Get(':id/students')
  async students(@CurrentUser() user: SessionUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.own(user, id);
    return this.db
      .select({
        id: children.id,
        nickname: children.nickname,
        momoColor: children.momoColor,
        viaParent: sql<boolean>`${children.parentId} is not null`,
        lastActiveAt: children.lastActiveAt,
        /** Total soal dijawab & ronde (D-045). */
        answered: sql<number>`(select coalesce(sum(m.answered), 0)::int from skill_mastery m where m.child_id = ${children.id})`,
        rounds: sql<number>`(select count(*)::int from events e where e.child_id = ${children.id} and e.type = 'quiz_result')`,
      })
      .from(children)
      .where(and(eq(children.classId, id), eq(children.active, true)))
      .orderBy(children.nickname);
  }

  /**
   * Daftarkan banyak siswa sekaligus (D-025). Setiap siswa mendapat warna Momo & sandi gambar acak,
   * dikembalikan SEKALI untuk dicetak sebagai kartu masuk (kode kelas + nama + 3 gambar).
   * Nama yang sudah ada di kelas dilewati.
   */
  @Post(':id/roster')
  async roster(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(classRosterSchema)) body: z.infer<typeof classRosterSchema>,
  ) {
    const cls = await this.own(user, id);
    if (cls.closedAt) throw new BadRequestException('Kelas sudah ditutup');
    const existing = await this.db
      .select({ nickname: children.nickname })
      .from(children)
      .where(and(eq(children.classId, id), eq(children.active, true)));
    const taken = new Set(existing.map((e) => e.nickname.toLowerCase()));
    const created: { id: string; nickname: string; momoColor: string; pin: string[] }[] = [];
    const skipped: string[] = [];
    await this.db.transaction(async (tx) => {
      for (const nickname of body.nicknames) {
        if (taken.has(nickname.toLowerCase())) {
          skipped.push(nickname);
          continue;
        }
        taken.add(nickname.toLowerCase());
        const pin = randomPin();
        const momoColor = MOMO_COLORS[randomInt(MOMO_COLORS.length)]!;
        const [row] = await tx
          .insert(children)
          .values({
            classId: id,
            nickname,
            momoColor,
            picturePinHash: await hashSecret(pinSecret(pin)),
            reportToken: randomToken(),
          })
          .returning({ id: children.id });
        await tx
          .insert(parentContacts)
          .values({ childId: row!.id, contact: null, consentAt: new Date() });
        created.push({ id: row!.id, nickname, momoColor, pin });
      }
    });
    return { code: cls.code, eventName: cls.eventName, created, skipped };
  }

  /** Buat sandi gambar baru untuk siswa kelas yang lupa (dikembalikan untuk dicetak ulang). */
  @Post(':id/students/:childId/pin')
  async resetPin(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('childId', ParseUUIDPipe) childId: string,
  ) {
    const cls = await this.own(user, id);
    // Anak milik akun orang tua: sandi gambarnya hanya diatur orang tua (atau admin) — audit L4.
    const [target] = await this.db
      .select({ parentId: children.parentId })
      .from(children)
      .where(and(eq(children.id, childId), eq(children.classId, id)));
    if (!target) throw new NotFoundException('Siswa tidak ditemukan');
    if (target.parentId && user.role !== 'admin')
      throw new ForbiddenException(
        'Sandi gambar anak ini diatur orang tuanya. Minta orang tua menggantinya di area Orang Tua.',
      );
    const pin = randomPin();
    const [row] = await this.db
      .update(children)
      .set({
        picturePinHash: await hashSecret(pinSecret(pin)),
        failedPinAttempts: 0,
        pinLockedUntil: null,
        pinLockCount: 0,
      })
      .where(and(eq(children.id, childId), eq(children.classId, id)))
      .returning({ id: children.id, nickname: children.nickname, momoColor: children.momoColor });
    if (!row) throw new NotFoundException('Siswa tidak ditemukan');
    return { code: cls.code, eventName: cls.eventName, ...row, pin };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(classUpdateSchema)) body: z.infer<typeof classUpdateSchema>,
  ) {
    const scope = this.scope(user);
    const [row] = await this.db
      .update(classes)
      .set({
        ...(body.frozen !== undefined && { frozen: body.frozen }),
        ...(body.eventName && { eventName: body.eventName }),
        ...(body.closed !== undefined && { closedAt: body.closed ? new Date() : null }),
      })
      .where(scope ? and(eq(classes.id, id), scope) : eq(classes.id, id))
      .returning();
    if (!row) throw new NotFoundException('Kelas tidak ditemukan');
    return row;
  }
}
