import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  catalogSchema,
  skillTemplateSchema,
  validateTemplate,
  type SessionUser,
  type SkillTemplate,
} from '@little-coder/engine';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { sameContent } from '../common/stable.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { skillCatalogs, skills } from '../db/schema.js';

const statusSchema = z.strictObject({ status: z.enum(['active', 'draft']) });

@Roles('admin')
@Controller('admin')
export class AdminSkillsController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get('catalogs')
  catalogs() {
    return this.db.select().from(skillCatalogs).orderBy(skillCatalogs.domain, skillCatalogs.grade);
  }

  @Put('catalogs/:domain/:grade')
  async saveCatalog(
    @CurrentUser() user: SessionUser,
    @Param('domain') domain: string,
    @Param('grade') grade: string,
    @Body(new ZodPipe(catalogSchema)) body: z.infer<typeof catalogSchema>,
  ) {
    if (body.domain !== domain || body.grade !== grade)
      throw new BadRequestException('domain/grade tidak cocok dengan URL');
    const used = await this.db
      .selectDistinct({ category: skills.category })
      .from(skills)
      .where(and(eq(skills.domain, domain), eq(skills.grade, grade)));
    const missing = used
      .map((u) => u.category)
      .filter((c) => !body.categories.some((x) => x.code === c));
    if (missing.length)
      throw new BadRequestException(`Kategori masih dipakai skill: ${missing.join(', ')}`);
    const values = {
      domain,
      grade,
      title: body.title,
      categories: body.categories,
      updatedAt: new Date(),
      updatedBy: user.id,
    };
    await this.db
      .insert(skillCatalogs)
      .values(values)
      .onConflictDoUpdate({ target: [skillCatalogs.domain, skillCatalogs.grade], set: values });
    return values;
  }

  @Get('skills')
  list() {
    return this.db
      .select({
        id: skills.id,
        version: skills.version,
        domain: skills.domain,
        grade: skills.grade,
        category: skills.category,
        order: skills.order,
        title: skills.title,
        status: skills.status,
        template: skills.template,
        updatedAt: skills.updatedAt,
      })
      .from(skills)
      .orderBy(skills.domain, skills.grade, skills.category, skills.order);
  }

  @Get('skills/:id')
  async get(@Param('id') id: string) {
    const [row] = await this.db.select().from(skills).where(eq(skills.id, id));
    if (!row) throw new NotFoundException('Skill tidak ditemukan');
    return row;
  }

  /** Validasi lengkap sebelum disimpan: skema, katalog, dan 200 soal acak (PRD A7 no. 7). */
  private async check(t: SkillTemplate) {
    const [cat] = await this.db
      .select()
      .from(skillCatalogs)
      .where(and(eq(skillCatalogs.domain, t.domain), eq(skillCatalogs.grade, t.grade)));
    if (!cat) throw new BadRequestException(`Belum ada katalog ${t.domain}/${t.grade}`);
    if (!(cat.categories as { code: string }[]).some((c) => c.code === t.category)) {
      throw new BadRequestException(`Kategori ${t.category} tidak ada di katalog`);
    }
    const problems = validateTemplate(t);
    if (problems.length)
      throw new BadRequestException({
        message: 'Generator soal bermasalah',
        issues: problems.map((message) => ({ path: 'params', message })),
      });
  }

  @Post('skills')
  async create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(skillTemplateSchema)) t: SkillTemplate,
  ) {
    const [exists] = await this.db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.id, t.id));
    if (exists) throw new ConflictException('Id skill sudah dipakai');
    await this.check(t);
    const template = { ...t, version: 1 };
    await this.db.insert(skills).values(this.row(template, user));
    return template;
  }

  @Put('skills/:id')
  async update(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body(new ZodPipe(skillTemplateSchema)) t: SkillTemplate,
  ) {
    if (t.id !== id) throw new BadRequestException('Id skill tidak boleh diubah');
    const [prev] = await this.db.select().from(skills).where(eq(skills.id, id));
    if (!prev) throw new NotFoundException('Skill tidak ditemukan');
    await this.check(t);
    // Versi naik bila isi berubah, agar soal lama tetap bisa direproduksi.
    const version = sameContent(prev.template, t) ? prev.version : prev.version + 1;
    const template = { ...t, version };
    await this.db.update(skills).set(this.row(template, user)).where(eq(skills.id, id));
    return template;
  }

  @Patch('skills/:id/status')
  async status(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body(new ZodPipe(statusSchema)) body: z.infer<typeof statusSchema>,
  ) {
    const [prev] = await this.db.select().from(skills).where(eq(skills.id, id));
    if (!prev) throw new NotFoundException('Skill tidak ditemukan');
    const template = { ...(prev.template as SkillTemplate), status: body.status };
    await this.db
      .update(skills)
      .set({ status: body.status, template, updatedAt: new Date(), updatedBy: user.id })
      .where(eq(skills.id, id));
    return template;
  }

  /** Hanya skill berstatus draft yang boleh dihapus permanen. */
  @Delete('skills/:id')
  async remove(@Param('id') id: string) {
    const [prev] = await this.db.select().from(skills).where(eq(skills.id, id));
    if (!prev) throw new NotFoundException('Skill tidak ditemukan');
    if (prev.status !== 'draft')
      throw new BadRequestException('Nonaktifkan (draft) dulu sebelum menghapus');
    await this.db.delete(skills).where(eq(skills.id, id));
    return { ok: true };
  }

  private row(t: SkillTemplate, user: SessionUser) {
    return {
      id: t.id,
      version: t.version,
      domain: t.domain,
      grade: t.grade,
      category: t.category,
      order: t.order,
      title: t.title,
      status: t.status,
      template: t,
      updatedAt: new Date(),
      updatedBy: user.id,
    };
  }
}
