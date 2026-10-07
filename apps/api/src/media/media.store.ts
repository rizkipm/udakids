import { BadRequestException, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import type { Db } from '../db/db.module.js';
import { articles, banners, galleryItems, media } from '../db/schema.js';
import type {
  BannerInput,
  BannerPlacement,
  GalleryInput,
  GalleryUpdate,
  MediaType,
} from './media.schema.js';

type BannerRow = typeof banners.$inferSelect;
type GalleryRow = typeof galleryItems.$inferSelect;

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/** Bentuk banner untuk admin (lengkap). */
export const bannerView = (b: BannerRow) => ({
  id: b.id,
  title: b.title,
  subtitle: b.subtitle,
  ctaLabel: b.ctaLabel,
  ctaUrl: b.ctaUrl,
  imageId: b.imageId,
  tone: b.tone,
  placements: (Array.isArray(b.placements) ? b.placements : []) as BannerPlacement[],
  startsAt: iso(b.startsAt),
  endsAt: iso(b.endsAt),
  active: b.active,
  sort: b.sort,
  createdAt: b.createdAt.toISOString(),
});

/** Bentuk banner untuk ditampilkan (tanpa jadwal/status internal). */
const bannerPublic = (b: BannerRow) => ({
  id: b.id,
  title: b.title,
  subtitle: b.subtitle,
  ctaLabel: b.ctaLabel,
  ctaUrl: b.ctaUrl,
  imageId: b.imageId,
  tone: b.tone,
});

export const galleryView = (g: GalleryRow) => ({
  id: g.id,
  title: g.title,
  caption: g.caption,
  eventDate: g.eventDate,
  imageId: g.imageId,
  active: g.active,
  sort: g.sort,
  createdAt: g.createdAt.toISOString(),
});

const galleryPublic = (g: GalleryRow) => ({
  id: g.id,
  title: g.title,
  caption: g.caption,
  eventDate: g.eventDate,
  imageId: g.imageId,
});

const bannerRow = (b: BannerInput) => ({
  ...b,
  startsAt: b.startsAt ? new Date(b.startsAt) : null,
  endsAt: b.endsAt ? new Date(b.endsAt) : null,
});

/** Penyimpanan gambar, banner, dan galeri (D-042). */
export class MediaStore {
  constructor(private readonly db: Db) {}

  // ------------------------------------------------------------ gambar

  async saveImage(data: Buffer, mime: MediaType, createdBy: string | null) {
    await this.sweepOrphans();
    const [row] = await this.db
      .insert(media)
      .values({ mime, data, bytes: data.length, createdBy })
      .returning({ id: media.id, mime: media.mime, bytes: media.bytes });
    return row!;
  }

  async image(id: string) {
    const [row] = await this.db
      .select({ mime: media.mime, data: media.data })
      .from(media)
      .where(eq(media.id, id));
    if (!row) throw new NotFoundException('Gambar tidak ditemukan');
    return row;
  }

  private async assertImage(id: string | null) {
    if (!id) return;
    const [row] = await this.db.select({ id: media.id }).from(media).where(eq(media.id, id));
    if (!row) throw new BadRequestException('Gambar belum diunggah atau sudah dihapus');
  }

  /** Hapus gambar yang tidak lagi dipakai banner maupun galeri. */
  async dropIfUnused(ids: (string | null | undefined)[]) {
    const list = [...new Set(ids.filter((x): x is string => !!x))];
    if (!list.length) return;
    await this.db
      .delete(media)
      .where(
        and(
          inArray(media.id, list),
          sql`not exists (select 1 from ${banners} where ${banners.imageId} = ${media.id})`,
          sql`not exists (select 1 from ${galleryItems} where ${galleryItems.imageId} = ${media.id})`,
          sql`not exists (select 1 from ${articles} where ${articles.coverImageId} = ${media.id})`,
          sql`not exists (select 1 from ${articles} where ${articles.imageIds} ? ${media.id}::text)`,
        ),
      );
  }

  /** Unggahan yang tidak pernah dipasang (form dibatalkan) dibersihkan setelah 1 hari. */
  private async sweepOrphans() {
    await this.db
      .delete(media)
      .where(
        and(
          sql`${media.createdAt} < now() - interval '1 day'`,
          sql`not exists (select 1 from ${banners} where ${banners.imageId} = ${media.id})`,
          sql`not exists (select 1 from ${galleryItems} where ${galleryItems.imageId} = ${media.id})`,
          sql`not exists (select 1 from ${articles} where ${articles.coverImageId} = ${media.id})`,
          sql`not exists (select 1 from ${articles} where ${articles.imageIds} ? ${media.id}::text)`,
        ),
      );
  }

  // ------------------------------------------------------------ banner

  async listBanners() {
    const rows = await this.db
      .select()
      .from(banners)
      .orderBy(asc(banners.sort), desc(banners.createdAt));
    return rows.map(bannerView);
  }

  /** Banner aktif dalam jendela waktu untuk satu tempat tampil, urut `sort`. */
  async liveBanners(placement: BannerPlacement, now = new Date()) {
    const rows = await this.db
      .select()
      .from(banners)
      .where(
        and(
          eq(banners.active, true),
          sql`${banners.placements} @> ${JSON.stringify([placement])}::jsonb`,
          or(isNull(banners.startsAt), lte(banners.startsAt, now)),
          or(isNull(banners.endsAt), gt(banners.endsAt, now)),
        ),
      )
      .orderBy(asc(banners.sort), desc(banners.createdAt))
      .limit(12);
    return { items: rows.map(bannerPublic) };
  }

  async createBanner(input: BannerInput) {
    await this.assertImage(input.imageId);
    const [row] = await this.db.insert(banners).values(bannerRow(input)).returning();
    return bannerView(row!);
  }

  async updateBanner(id: string, input: BannerInput) {
    await this.assertImage(input.imageId);
    const [old] = await this.db
      .select({ imageId: banners.imageId })
      .from(banners)
      .where(eq(banners.id, id));
    if (!old) throw new NotFoundException('Banner tidak ditemukan');
    const [row] = await this.db
      .update(banners)
      .set(bannerRow(input))
      .where(eq(banners.id, id))
      .returning();
    if (old.imageId !== input.imageId) await this.dropIfUnused([old.imageId]);
    return bannerView(row!);
  }

  async deleteBanner(id: string) {
    const [row] = await this.db
      .delete(banners)
      .where(eq(banners.id, id))
      .returning({ imageId: banners.imageId });
    if (!row) throw new NotFoundException('Banner tidak ditemukan');
    await this.dropIfUnused([row.imageId]);
    return { ok: true };
  }

  /** Urutan baru: `ids[0]` tampil pertama. Banner yang tidak disebut tidak berubah. */
  async reorderBanners(ids: string[]) {
    await this.db.transaction(async (tx) => {
      for (const [i, id] of ids.entries())
        await tx.update(banners).set({ sort: i }).where(eq(banners.id, id));
    });
    return this.listBanners();
  }

  // ------------------------------------------------------------ galeri

  private async galleryPage(page: number, pageSize: number, onlyActive: boolean) {
    const where = onlyActive ? eq(galleryItems.active, true) : undefined;
    const [rows, [count]] = await Promise.all([
      this.db
        .select()
        .from(galleryItems)
        .where(where)
        .orderBy(
          sql`${galleryItems.eventDate} desc nulls last`,
          asc(galleryItems.sort),
          desc(galleryItems.createdAt),
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(galleryItems)
        .where(where),
    ]);
    return { rows, total: count?.n ?? 0, page, pageSize };
  }

  async adminGallery(page: number, pageSize: number) {
    const r = await this.galleryPage(page, pageSize, false);
    return { items: r.rows.map(galleryView), total: r.total, page, pageSize };
  }

  async publicGallery(page: number, pageSize: number) {
    const r = await this.galleryPage(page, pageSize, true);
    return { items: r.rows.map(galleryPublic), total: r.total, page, pageSize };
  }

  async createGallery(input: GalleryInput) {
    await this.assertImage(input.imageId);
    const [row] = await this.db.insert(galleryItems).values(input).returning();
    return galleryView(row!);
  }

  async updateGallery(id: string, input: GalleryUpdate) {
    const [row] = await this.db
      .update(galleryItems)
      .set(input)
      .where(eq(galleryItems.id, id))
      .returning();
    if (!row) throw new NotFoundException('Foto galeri tidak ditemukan');
    return galleryView(row);
  }

  async deleteGallery(id: string) {
    const [row] = await this.db
      .delete(galleryItems)
      .where(eq(galleryItems.id, id))
      .returning({ imageId: galleryItems.imageId });
    if (!row) throw new NotFoundException('Foto galeri tidak ditemukan');
    await this.dropIfUnused([row.imageId]);
    return { ok: true };
  }
}
