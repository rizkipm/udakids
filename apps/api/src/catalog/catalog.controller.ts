import { Controller, Get, Inject } from '@nestjs/common';
import { GRADES } from '@little-coder/engine';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module.js';
import { levels, skillCatalogs, skills } from '../db/schema.js';

/** Katalog Pustaka + level aktif, untuk semua pengguna yang login (anak memainkannya offline-first). */
@Controller()
export class CatalogController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get('catalog')
  async catalog() {
    const catalogs = await this.db
      .select()
      .from(skillCatalogs)
      .orderBy(skillCatalogs.domain, skillCatalogs.grade);
    const rows = await this.db
      .select({ template: skills.template })
      .from(skills)
      .where(eq(skills.status, 'active'))
      .orderBy(skills.domain, skills.grade, skills.category, skills.order);
    // Urut per mata pelajaran, lalu jenjang (Pra-TK → TK → Grade 1-2 → Grade 3-4), bukan abjad.
    const rank = (g: string) => GRADES.indexOf(g as (typeof GRADES)[number]);
    catalogs.sort((x, y) => x.domain.localeCompare(y.domain) || rank(x.grade) - rank(y.grade));
    return {
      catalogs: catalogs.map(({ domain, grade, title, categories }) => ({
        domain,
        grade,
        title,
        categories,
      })),
      skills: rows.map((r) => r.template),
    };
  }

  @Get('levels')
  async levels() {
    const rows = await this.db
      .select({ data: levels.data })
      .from(levels)
      .where(eq(levels.status, 'active'))
      .orderBy(levels.world, levels.index);
    return rows.map((r) => r.data);
  }
}
