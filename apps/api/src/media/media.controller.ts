import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { SessionUser } from '@little-coder/engine';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { CurrentUser, Public, Roles } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import {
  bannerInputSchema,
  galleryInputSchema,
  galleryUpdateSchema,
  MEDIA_MAX_BYTES,
  pageQuerySchema,
  reorderSchema,
  sniffImageType,
  type BannerInput,
  type GalleryInput,
  type GalleryUpdate,
} from './media.schema.js';
import { MediaStore } from './media.store.js';

const publicPlacement = z.object({ placement: z.enum(['landing']).default('landing') });
type Page = z.infer<typeof pageQuerySchema>;

/**
 * Banner & galeri (D-042).
 * - Publik: gambar (`/media/:id`), banner landing, galeri landing.
 * - Orang tua: banner dasbor orang tua. Admin: banner dasbor admin + kelola semuanya.
 */
@Controller()
export class MediaController {
  private readonly store: MediaStore;

  constructor(@Inject(DB) db: Db) {
    this.store = new MediaStore(db);
  }

  // ------------------------------------------------------------ publik

  @Public()
  @Get('media/:id')
  async image(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const img = await this.store.image(id);
    res
      .setHeader('Content-Type', img.mime)
      .setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      .setHeader('X-Content-Type-Options', 'nosniff')
      .setHeader('Content-Disposition', 'inline')
      .setHeader('Cross-Origin-Resource-Policy', 'same-site')
      .send(img.data);
  }

  @Public()
  @Get('public/banners')
  publicBanners(@Query(new ZodPipe(publicPlacement)) q: z.infer<typeof publicPlacement>) {
    return this.store.liveBanners(q.placement);
  }

  @Public()
  @Get('public/gallery')
  publicGallery(@Query(new ZodPipe(pageQuerySchema)) q: Page) {
    return this.store.publicGallery(q.page, Math.min(q.pageSize, 24));
  }

  // ------------------------------------------------------------ dasbor

  @Roles('parent')
  @Get('parent/banners')
  parentBanners() {
    return this.store.liveBanners('parent');
  }

  @Roles('admin')
  @Get('admin/banners/live')
  adminLiveBanners() {
    return this.store.liveBanners('admin');
  }

  // ------------------------------------------------------------ admin: gambar

  /** Unggah gambar: badan = file mentah JPG/PNG/WEBP (maks 3 MB), jenis dicek dari isinya. */
  @Roles('admin')
  @Post('admin/media')
  async upload(@CurrentUser() user: SessionUser, @Req() req: Request) {
    const body = req.body as unknown;
    if (!Buffer.isBuffer(body))
      throw new UnsupportedMediaTypeException('Gambar harus berupa JPG, PNG, atau WEBP');
    if (body.length === 0) throw new BadRequestException('Pilih gambar dulu');
    if (body.length > MEDIA_MAX_BYTES) throw new BadRequestException('Ukuran gambar maksimal 3 MB');
    const mime = sniffImageType(body);
    if (!mime) throw new BadRequestException('Gambar harus berupa JPG, PNG, atau WEBP');
    return this.store.saveImage(body, mime, user.id);
  }

  /** Buang unggahan yang batal dipakai (hanya bila tidak dipakai banner/galeri). */
  @Roles('admin')
  @Delete('admin/media/:id')
  async dropImage(@Param('id', ParseUUIDPipe) id: string) {
    await this.store.dropIfUnused([id]);
    return { ok: true };
  }

  // ------------------------------------------------------------ admin: banner

  @Roles('admin')
  @Get('admin/banners')
  banners() {
    return this.store.listBanners();
  }

  @Roles('admin')
  @Post('admin/banners')
  createBanner(@Body(new ZodPipe(bannerInputSchema)) body: BannerInput) {
    return this.store.createBanner(body);
  }

  @Roles('admin')
  @Post('admin/banners/reorder')
  @HttpCode(200)
  reorder(@Body(new ZodPipe(reorderSchema)) body: z.infer<typeof reorderSchema>) {
    return this.store.reorderBanners(body.ids);
  }

  @Roles('admin')
  @Put('admin/banners/:id')
  updateBanner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(bannerInputSchema)) body: BannerInput,
  ) {
    return this.store.updateBanner(id, body);
  }

  @Roles('admin')
  @Delete('admin/banners/:id')
  deleteBanner(@Param('id', ParseUUIDPipe) id: string) {
    return this.store.deleteBanner(id);
  }

  // ------------------------------------------------------------ admin: galeri

  @Roles('admin')
  @Get('admin/gallery')
  gallery(@Query(new ZodPipe(pageQuerySchema)) q: Page) {
    return this.store.adminGallery(q.page, q.pageSize);
  }

  @Roles('admin')
  @Post('admin/gallery')
  createGallery(@Body(new ZodPipe(galleryInputSchema)) body: GalleryInput) {
    return this.store.createGallery(body);
  }

  @Roles('admin')
  @Put('admin/gallery/:id')
  updateGallery(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(galleryUpdateSchema)) body: GalleryUpdate,
  ) {
    return this.store.updateGallery(id, body);
  }

  @Roles('admin')
  @Delete('admin/gallery/:id')
  deleteGallery(@Param('id', ParseUUIDPipe) id: string) {
    return this.store.deleteGallery(id);
  }
}
