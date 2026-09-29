import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import type { Level, SessionUser } from '@little-coder/engine';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { sameContent } from '../common/stable.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { levels } from '../db/schema.js';
import { ContentService } from './content.service.js';

const statusSchema = z.strictObject({ status: z.enum(['active', 'draft']) });

@Roles('admin')
@Controller('admin/levels')
export class AdminLevelsController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly content: ContentService,
  ) {}

  @Get()
  list() {
    return this.db.select().from(levels).orderBy(levels.tier, levels.world, levels.index);
  }

  /** Validasi tanpa menyimpan (untuk pratinjau editor). */
  @Post('validate')
  async validate(@Body() body: unknown) {
    return await this.content.validateLevel(body);
  }

  private async checked(body: unknown): Promise<Level> {
    const r = await this.content.validateLevel(body);
    if (r.errors.length || !r.level) {
      throw new BadRequestException({
        message: 'Level tidak valid',
        issues: r.errors.map((message) => ({ path: '', message })),
      });
    }
    return r.level;
  }

  @Post()
  async create(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    const level = await this.checked(body);
    const [exists] = await this.db
      .select({ id: levels.id })
      .from(levels)
      .where(eq(levels.id, level.id));
    if (exists) throw new ConflictException('Id level sudah dipakai');
    const data = { ...(body as object), version: 1 };
    await this.db.insert(levels).values({
      id: level.id,
      version: 1,
      tier: level.tier,
      world: level.world,
      index: level.index,
      data,
      updatedBy: user.id,
    });
    return data;
  }

  @Put(':id')
  async update(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() body: unknown) {
    const level = await this.checked(body);
    if (level.id !== id) throw new BadRequestException('Id level tidak boleh diubah');
    const [prev] = await this.db.select().from(levels).where(eq(levels.id, id));
    if (!prev) throw new NotFoundException('Level tidak ditemukan');
    // Level berubah → versi naik; bintang anak di versi lama tetap aman (PRD A11).
    const version = sameContent(prev.data, body) ? prev.version : prev.version + 1;
    const data = { ...(body as object), version };
    await this.db
      .update(levels)
      .set({
        version,
        tier: level.tier,
        world: level.world,
        index: level.index,
        data,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(levels.id, id));
    return data;
  }

  @Patch(':id/status')
  async status(
    @Param('id') id: string,
    @Body(new ZodPipe(statusSchema)) body: z.infer<typeof statusSchema>,
  ) {
    const [row] = await this.db
      .update(levels)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(levels.id, id))
      .returning();
    if (!row) throw new NotFoundException('Level tidak ditemukan');
    return row;
  }
}
