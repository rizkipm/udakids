import { Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common';
import {
  GRADES,
  isLabTopic,
  type BookLab,
  type Catalog,
  type SkillTemplate,
} from '@little-coder/engine';
import { and, eq } from 'drizzle-orm';
import { Roles } from '../auth/decorators.js';
import { DB, type Db } from '../db/db.module.js';
import { skillCatalogs, skills } from '../db/schema.js';

/** Admin: cakupan & pratinjau materi berformat lab (D-109). */
@Roles('admin')
@Controller('admin/lab')
export class AdminLabController {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Per buku: status Lab Buku dan status Materi Topik setiap topik. */
  @Get('coverage')
  async coverage() {
    const rows = await this.db.select().from(skillCatalogs);
    const rank = (g: string) => GRADES.indexOf(g as (typeof GRADES)[number]);
    rows.sort((x, y) => x.domain.localeCompare(y.domain) || rank(x.grade) - rank(y.grade));
    const books = rows.map((r) => {
      const lab = r.lab as BookLab | null;
      const topics = (r.categories as Catalog['categories']).filter(isLabTopic).map((c) => ({
        code: c.code,
        title: c.title,
        materi: c.materi ? { status: c.materi.status, judul: c.materi.judul } : null,
        labPos: lab?.pos.find((p) => p.topik.includes(c.code))?.judul ?? null,
      }));
      return {
        domain: r.domain,
        grade: r.grade,
        title: r.title,
        lab: lab ? { status: lab.status, judul: lab.judul, pos: lab.pos.length } : null,
        topics,
      };
    });
    const all = books.flatMap((b) => b.topics);
    return {
      totals: {
        books: books.length,
        bookLabs: books.filter((b) => b.lab?.status === 'aktif').length,
        topics: all.length,
        materiActive: all.filter((t) => t.materi?.status === 'aktif').length,
        materiDraft: all.filter((t) => t.materi?.status === 'draf').length,
      },
      books,
    };
  }

  /** Data pratinjau satu buku (Lab Buku) atau satu topik (Materi Topik), termasuk draf. */
  @Get('preview/:domain/:grade')
  preview(@Param('domain') domain: string, @Param('grade') grade: string) {
    return this.load(domain, grade);
  }

  @Get('preview/:domain/:grade/:code')
  async previewTopic(
    @Param('domain') domain: string,
    @Param('grade') grade: string,
    @Param('code') code: string,
  ) {
    const book = await this.load(domain, grade);
    const category = book.catalog.categories.find((c) => c.code === code);
    if (!category) throw new NotFoundException('Topik tidak ditemukan');
    return { ...book, category, skills: book.skills.filter((k) => k.category === code) };
  }

  private async load(domain: string, grade: string) {
    const [row] = await this.db
      .select()
      .from(skillCatalogs)
      .where(and(eq(skillCatalogs.domain, domain), eq(skillCatalogs.grade, grade)));
    if (!row) throw new NotFoundException('Buku tidak ditemukan');
    const list = await this.db
      .select({ template: skills.template })
      .from(skills)
      .where(and(eq(skills.domain, domain), eq(skills.grade, grade), eq(skills.status, 'active')))
      .orderBy(skills.category, skills.order);
    return {
      catalog: {
        domain: row.domain,
        grade: row.grade,
        title: row.title,
        categories: row.categories as Catalog['categories'],
        ...(row.lab ? { lab: row.lab as BookLab } : {}),
      },
      skills: list.map((r) => r.template as SkillTemplate),
    };
  }
}
