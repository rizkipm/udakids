import { sniffProofType } from '@little-coder/engine';
import { z } from 'zod';

/** Gambar banner/galeri (D-042): hanya foto raster — tanpa SVG/GIF/HTML. */
export const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];
export const MEDIA_MAX_BYTES = 3 * 1024 * 1024;

/** Jenis gambar dari isi file (magic bytes), bukan dari header/nama file. */
export function sniffImageType(bytes: Uint8Array): MediaType | undefined {
  const t = sniffProofType(bytes);
  return t && t !== 'application/pdf' ? t : undefined;
}

export const BANNER_TONES = ['grape', 'sun', 'coral', 'sky', 'leaf', 'teal'] as const;
export const BANNER_PLACEMENTS = ['landing', 'parent', 'admin'] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];

/**
 * Tautan tombol banner: path internal ("/play", "/orang-tua#harga") atau URL https.
 * Ditolak: javascript:, data:, http:, "//host" (protocol-relative), backslash, spasi/kontrol.
 */
export function isSafeCtaUrl(v: string): boolean {
  if (v === '') return true;
  // eslint-disable-next-line no-control-regex
  if (/[\s\\\u0000-\u001f\u007f]/.test(v)) return false;
  if (v.startsWith('/')) return !v.startsWith('//');
  if (!v.startsWith('https://')) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password;
  } catch {
    return false;
  }
}

const isoDate = z.iso.datetime({ offset: true }).nullable().default(null);
const text = (max: number) => z.string().trim().max(max);

export const bannerInputSchema = z
  .strictObject({
    title: text(80).min(1, 'Judul wajib diisi'),
    subtitle: text(200).default(''),
    ctaLabel: text(30).default(''),
    ctaUrl: text(500)
      .default('')
      .refine(isSafeCtaUrl, 'Tautan harus diawali "/" (halaman di aplikasi ini) atau "https://"'),
    imageId: z.uuid().nullable().default(null),
    tone: z.enum(BANNER_TONES).default('grape'),
    placements: z
      .array(z.enum(BANNER_PLACEMENTS))
      .min(1, 'Pilih minimal satu tempat tampil')
      .max(BANNER_PLACEMENTS.length)
      .refine((a) => new Set(a).size === a.length, 'Tempat tampil tidak boleh dobel'),
    startsAt: isoDate,
    endsAt: isoDate,
    active: z.boolean().default(true),
    sort: z.number().int().min(0).max(9999).default(0),
  })
  .refine((b) => (b.ctaLabel === '') === (b.ctaUrl === ''), {
    message: 'Isi label tombol dan tautannya sekaligus (atau kosongkan keduanya)',
    path: ['ctaUrl'],
  })
  .refine((b) => !b.startsAt || !b.endsAt || new Date(b.endsAt) > new Date(b.startsAt), {
    message: 'Waktu selesai harus setelah waktu mulai',
    path: ['endsAt'],
  });
export type BannerInput = z.infer<typeof bannerInputSchema>;

export const reorderSchema = z.strictObject({
  ids: z
    .array(z.uuid())
    .min(1)
    .max(500)
    .refine((a) => new Set(a).size === a.length, 'Urutan tidak boleh dobel'),
});

/** Tanggal kalender YYYY-MM-DD yang benar-benar ada. */
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'Tanggal tidak valid');

export const galleryInputSchema = z.strictObject({
  title: text(80).min(1, 'Judul wajib diisi'),
  caption: text(300).default(''),
  eventDate: calendarDate.nullable().default(null),
  imageId: z.uuid(),
  active: z.boolean().default(true),
  sort: z.number().int().min(0).max(9999).default(0),
});
export type GalleryInput = z.infer<typeof galleryInputSchema>;

/** Ubah item galeri: gambar tetap (unggah ulang = item baru). */
export const galleryUpdateSchema = galleryInputSchema.omit({ imageId: true });
export type GalleryUpdate = z.infer<typeof galleryUpdateSchema>;

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});
