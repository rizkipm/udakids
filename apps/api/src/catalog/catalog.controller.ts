import { Controller, Get, Inject } from '@nestjs/common';
import { FREE_ACCESS, GRADES, needsPurchase, type SessionUser } from '@little-coder/engine';
import { eq } from 'drizzle-orm';
import { CurrentUser } from '../auth/decorators.js';
import { BillingService } from '../billing/billing.service.js';
import { DB, type Db } from '../db/db.module.js';
import { levels, skillCatalogs, skills } from '../db/schema.js';

/** Katalog Pustaka + level aktif, untuk semua pengguna yang login (anak memainkannya offline-first). */
@Controller()
export class CatalogController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly billing: BillingService,
  ) {}

  @Get('catalog')
  async catalog(@CurrentUser() user: SessionUser) {
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
    // Akses level berbayar (D-036): anak sesuai paket keluarganya; staf/orang tua melihat semua.
    const access = user.role === 'child' ? await this.billing.accessForChild(user.id) : FREE_ACCESS;
    return {
      catalogs: catalogs.map(({ domain, grade, title, categories }) => ({
        domain,
        grade,
        title,
        categories,
      })),
      // Level berbayar yang belum dibeli dikirim tanpa isi soal (judul & urutan saja), agar soalnya
      // tidak bisa dibuat di perangkat tanpa paket (audit M9).
      skills: rows.map((r) => {
        const tpl = r.template as {
          domain: string;
          grade: string;
          order: number;
          params?: unknown;
        };
        return needsPurchase(access, tpl)
          ? { ...tpl, params: {}, bands: undefined, stub: true }
          : tpl;
      }),
      access,
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
