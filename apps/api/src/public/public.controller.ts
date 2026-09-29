import { Controller, Get, Inject } from '@nestjs/common';
import { GRADES } from '@little-coder/engine';
import { count, eq } from 'drizzle-orm';
import { Public } from '../auth/decorators.js';
import { DB, type Db } from '../db/db.module.js';
import { skillCatalogs, skills } from '../db/schema.js';

/**
 * Data publik untuk halaman depan (tanpa login, D-030): daftar buku Pustaka dari database — judul,
 * jumlah topik & level aktif, dan beberapa judul topik. Tidak ada data anak/akun di sini.
 */
@Controller('public')
export class PublicController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Public()
  @Get('books')
  async books() {
    const catalogs = await this.db.select().from(skillCatalogs);
    const levelCounts = await this.db
      .select({ domain: skills.domain, grade: skills.grade, n: count() })
      .from(skills)
      .where(eq(skills.status, 'active'))
      .groupBy(skills.domain, skills.grade);
    const levels = new Map(levelCounts.map((r) => [`${r.domain}/${r.grade}`, Number(r.n)]));
    const rank = (g: string) => GRADES.indexOf(g as (typeof GRADES)[number]);
    const books = catalogs
      .map((c) => {
        const cats = c.categories as { code: string; title: string }[];
        return {
          domain: c.domain,
          grade: c.grade,
          title: c.title,
          topics: cats.length,
          levels: levels.get(`${c.domain}/${c.grade}`) ?? 0,
          sampleTopics: cats.slice(0, 4).map((x) => x.title),
        };
      })
      .filter((b) => b.levels > 0)
      .sort((a, b) => a.domain.localeCompare(b.domain) || rank(a.grade) - rank(b.grade));
    return { books, totalLevels: books.reduce((a, b) => a + b.levels, 0) };
  }
}
