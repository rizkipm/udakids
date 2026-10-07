import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';
import { Controller, Get, Inject, Req, Res } from '@nestjs/common';
import { FREE_ACCESS, GRADES, needsPurchase, type SessionUser } from '@little-coder/engine';
import { eq, sql } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth/decorators.js';
import { BillingService } from '../billing/billing.service.js';
import { DB, type Db } from '../db/db.module.js';
import { levels, skillCatalogs, skills } from '../db/schema.js';

const gzipAsync = promisify(gzip);

/** Katalog siap kirim: JSON, versi gzip, dan ETag-nya. */
type Packed = { json: string; gz: Buffer; etag: string };
/** Banyak varian katalog (per versi konten × akses) yang disimpan di memori. */
const PACK_CACHE_MAX = 16;

/** Katalog Pustaka + level aktif, untuk semua pengguna yang login (anak memainkannya offline-first). */
@Controller()
export class CatalogController {
  /**
   * Katalog berisi seluruh bank soal (puluhan MB). Dikemas sekali per versi konten + akses: dikompres gzip
   * (±10× lebih kecil) dan diberi ETag, sehingga perangkat yang katalognya belum berubah cukup menerima 304.
   */
  private readonly packs = new Map<string, Promise<Packed>>();

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly billing: BillingService,
  ) {}

  @Get('catalog')
  async catalog(
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const access = user.role === 'child' ? await this.billing.accessForChild(user.id) : FREE_ACCESS;
    const [v] = await this.db
      .execute<{ version: string }>(
        sql`
      select concat_ws('/',
        (select count(*) from ${skills} where ${skills.status} = 'active'),
        (select max(${skills.updatedAt}) from ${skills}),
        (select count(*) from ${skillCatalogs}),
        (select max(${skillCatalogs.updatedAt}) from ${skillCatalogs})) as version`,
      )
      .then((r) => r.rows);
    const key = `${v?.version ?? ''}|${JSON.stringify(access)}`;
    let pack = this.packs.get(key);
    if (!pack) {
      pack = this.build(access).then(async (body) => {
        const json = JSON.stringify(body);
        return {
          json,
          gz: await gzipAsync(json, { level: 6 }),
          etag: `"${createHash('sha1').update(json).digest('base64url')}"`,
        };
      });
      pack.catch(() => this.packs.delete(key));
      if (this.packs.size >= PACK_CACHE_MAX) this.packs.delete(this.packs.keys().next().value!);
      this.packs.set(key, pack);
    }
    const p = await pack;
    res.setHeader('ETag', p.etag);
    // Selalu periksa ulang ke server, tetapi boleh memakai salinan browser bila ETag sama (304).
    res.setHeader('Cache-Control', 'private, no-cache');
    res.setHeader('Vary', 'Accept-Encoding, Authorization');
    if (req.headers['if-none-match'] === p.etag) {
      res.status(304).end();
      return;
    }
    res.type('application/json; charset=utf-8');
    if (/\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''))) {
      res.setHeader('Content-Encoding', 'gzip');
      res.send(p.gz);
      return;
    }
    res.send(p.json);
  }

  private async build(access: Awaited<ReturnType<BillingService['accessForChild']>>) {
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
