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
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  articleImages,
  articleInputSchema,
  articleSlugSchema,
  parseYoutubeId,
  slugify,
  videoInputSchema,
  type ArticleInput,
  type SessionUser,
  type VideoInput,
} from '@little-coder/engine';
import { and, asc, count, desc, eq, inArray, like, ne } from 'drizzle-orm';
import { z } from 'zod';
import { CurrentUser, Public, Roles } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { articles, media, videos } from '../db/schema.js';
import { MediaStore } from '../media/media.store.js';

type VideoRow = typeof videos.$inferSelect;
type ArticleRow = typeof articles.$inferSelect;

const videoView = (v: VideoRow) => ({
  id: v.id,
  youtubeId: v.youtubeId,
  title: v.title,
  description: v.description,
  active: v.active,
  sort: v.sort,
  createdAt: v.createdAt.toISOString(),
});
const articleCard = (a: ArticleRow) => ({
  id: a.id,
  slug: a.slug,
  title: a.title,
  summary: a.summary,
  coverImageId: a.coverImageId,
  imageIds: a.imageIds ?? [],
  status: a.status as 'draft' | 'published',
  publishedAt: a.publishedAt?.toISOString() ?? null,
  updatedAt: a.updatedAt.toISOString(),
});
const listQuery = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(30).default(12),
});

/**
 * Konten landing page dari admin (D-073): video panduan YouTube & artikel/berita. Publik hanya melihat video aktif
 * dan artikel terbit; tulis/ubah/hapus khusus admin. Isi artikel teks biasa (tanpa HTML).
 */
@Controller()
export class SiteContentController {
  private readonly media: MediaStore;
  constructor(@Inject(DB) private readonly db: Db) {
    this.media = new MediaStore(db);
  }

  // ------------------------------------------------------------ video

  @Public()
  @Get('public/videos')
  async publicVideos() {
    const rows = await this.db
      .select()
      .from(videos)
      .where(eq(videos.active, true))
      .orderBy(asc(videos.sort), desc(videos.createdAt))
      .limit(24);
    return rows.map(({ id, youtubeId, title, description }) => ({
      id,
      youtubeId,
      title,
      description,
    }));
  }

  @Roles('admin')
  @Get('admin/videos')
  async adminVideos() {
    const rows = await this.db
      .select()
      .from(videos)
      .orderBy(asc(videos.sort), desc(videos.createdAt));
    return rows.map(videoView);
  }

  @Roles('admin')
  @Post('admin/videos')
  async createVideo(
    @Body(new ZodPipe(videoInputSchema)) body: VideoInput,
    @CurrentUser() user: SessionUser,
  ) {
    const [row] = await this.db
      .insert(videos)
      .values({
        youtubeId: parseYoutubeId(body.url)!,
        title: body.title,
        description: body.description,
        active: body.active,
        sort: body.sort,
        createdBy: user.id,
      })
      .returning();
    return videoView(row!);
  }

  @Roles('admin')
  @Put('admin/videos/:id')
  async updateVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(videoInputSchema)) body: VideoInput,
  ) {
    const [row] = await this.db
      .update(videos)
      .set({
        youtubeId: parseYoutubeId(body.url)!,
        title: body.title,
        description: body.description,
        active: body.active,
        sort: body.sort,
      })
      .where(eq(videos.id, id))
      .returning();
    if (!row) throw new NotFoundException('Video tidak ditemukan');
    return videoView(row);
  }

  @Roles('admin')
  @Delete('admin/videos/:id')
  async deleteVideo(@Param('id', ParseUUIDPipe) id: string) {
    await this.db.delete(videos).where(eq(videos.id, id));
    return { ok: true };
  }

  // ------------------------------------------------------------ artikel

  @Public()
  @Get('public/articles')
  async publicArticles(@Query(new ZodPipe(listQuery)) q: z.infer<typeof listQuery>) {
    const where = eq(articles.status, 'published');
    const [rows, [total]] = await Promise.all([
      this.db
        .select()
        .from(articles)
        .where(where)
        .orderBy(desc(articles.publishedAt))
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      this.db.select({ n: count() }).from(articles).where(where),
    ]);
    return {
      page: q.page,
      pageSize: q.pageSize,
      total: Number(total?.n ?? 0),
      items: rows.map(articleCard),
    };
  }

  @Public()
  @Get('public/articles/:slug')
  async publicArticle(@Param('slug', new ZodPipe(articleSlugSchema)) slug: string) {
    const [row] = await this.db
      .select()
      .from(articles)
      .where(and(eq(articles.slug, slug), eq(articles.status, 'published')));
    if (!row) throw new NotFoundException('Artikel tidak ditemukan');
    return { ...articleCard(row), body: row.body };
  }

  @Roles('admin')
  @Get('admin/articles')
  async adminArticles() {
    const rows = await this.db.select().from(articles).orderBy(desc(articles.updatedAt));
    return rows.map(articleCard);
  }

  @Roles('admin')
  @Get('admin/articles/:id')
  async adminArticle(@Param('id', ParseUUIDPipe) id: string) {
    const [row] = await this.db.select().from(articles).where(eq(articles.id, id));
    if (!row) throw new NotFoundException('Artikel tidak ditemukan');
    return { ...articleCard(row), body: row.body };
  }

  @Roles('admin')
  @Post('admin/articles')
  async createArticle(
    @Body(new ZodPipe(articleInputSchema)) body: ArticleInput,
    @CurrentUser() user: SessionUser,
  ) {
    const img = articleImages(body);
    await this.assertImages(img.imageIds);
    const slug = await this.uniqueSlug(body.slug || slugify(body.title));
    const [row] = await this.db
      .insert(articles)
      .values({
        slug,
        title: body.title,
        summary: body.summary,
        body: body.body,
        coverImageId: img.coverImageId,
        imageIds: img.imageIds,
        status: body.status,
        publishedAt: body.status === 'published' ? new Date() : null,
        createdBy: user.id,
      })
      .returning();
    return { ...articleCard(row!), body: row!.body };
  }

  @Roles('admin')
  @Put('admin/articles/:id')
  async updateArticle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(articleInputSchema)) body: ArticleInput,
  ) {
    const [old] = await this.db.select().from(articles).where(eq(articles.id, id));
    if (!old) throw new NotFoundException('Artikel tidak ditemukan');
    const img = articleImages(body);
    await this.assertImages(img.imageIds);
    const slug =
      body.slug && body.slug !== old.slug ? await this.uniqueSlug(body.slug, id) : old.slug;
    const [row] = await this.db
      .update(articles)
      .set({
        slug,
        title: body.title,
        summary: body.summary,
        body: body.body,
        coverImageId: img.coverImageId,
        imageIds: img.imageIds,
        status: body.status,
        // Tanggal terbit dipertahankan saat disunting; diisi saat pertama kali terbit.
        publishedAt:
          body.status === 'published' ? (old.publishedAt ?? new Date()) : old.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id))
      .returning();
    // Gambar yang dilepas dari artikel ini dihapus bila tidak dipakai di tempat lain.
    const kept = new Set(img.imageIds);
    await this.media.dropIfUnused(
      [old.coverImageId, ...(old.imageIds ?? [])].filter((x) => x && !kept.has(x)),
    );
    return { ...articleCard(row!), body: row!.body };
  }

  @Roles('admin')
  @Delete('admin/articles/:id')
  async deleteArticle(@Param('id', ParseUUIDPipe) id: string) {
    const [old] = await this.db.delete(articles).where(eq(articles.id, id)).returning();
    if (old) await this.media.dropIfUnused([old.coverImageId, ...(old.imageIds ?? [])]);
    return { ok: true };
  }

  private async assertImages(ids: readonly string[]) {
    if (!ids.length) return;
    const rows = await this.db
      .select({ id: media.id })
      .from(media)
      .where(inArray(media.id, [...ids]));
    if (rows.length !== ids.length)
      throw new BadRequestException('Ada gambar yang belum diunggah atau sudah dihapus');
  }

  /** "cara-daftar" sudah ada → "cara-daftar-2", dst. */
  private async uniqueSlug(base: string, exceptId?: string): Promise<string> {
    const rows = await this.db
      .select({ slug: articles.slug })
      .from(articles)
      .where(
        exceptId
          ? and(like(articles.slug, `${base}%`), ne(articles.id, exceptId))
          : like(articles.slug, `${base}%`),
      );
    const taken = new Set(rows.map((r) => r.slug));
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  }
}
