import { z } from 'zod';

/**
 * Konten landing page dari admin (D-073): video panduan YouTube dan artikel/berita. Fungsi murni & aman: video
 * hanya disimpan sebagai id YouTube 11 karakter; isi artikel berupa teks biasa yang dipecah menjadi blok
 * (paragraf, subjudul "## ", daftar "- ") dan ditampilkan sebagai teks — tidak ada HTML dari admin.
 */
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** Ambil id video dari tautan YouTube (watch, youtu.be, shorts, embed, live) atau id langsung. */
export function parseYoutubeId(input: string): string | null {
  const raw = input.trim();
  if (YT_ID.test(raw)) return raw;
  // Tanpa global `URL` (engine murni, tanpa lib DOM/Node): pecah tautan dengan regex.
  const m = /^(?:https?:\/\/)?([^/?#]+)([^?#]*)(?:\?([^#]*))?/i.exec(raw);
  if (!m) return null;
  const host = m[1]!.toLowerCase().replace(/^(www\.|m\.|music\.)/, '');
  const pathname = m[2] || '/';
  const query = m[3] ?? '';
  let id: string | null = null;
  if (host === 'youtu.be') id = pathname.split('/')[1] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (pathname === '/watch') {
      const v = query.split('&').find((kv) => kv.startsWith('v='));
      id = v ? decodeURIComponent(v.slice(2)) : null;
    } else {
      const p = /^\/(?:shorts|embed|live|v)\/([^/?#]+)/.exec(pathname);
      id = p?.[1] ?? null;
    }
  }
  return id && YT_ID.test(id) ? id : null;
}

export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
/** Pemutar tanpa cookie pelacak (youtube-nocookie). */
export const youtubeEmbed = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;

export const videoInputSchema = z.strictObject({
  url: z
    .string()
    .trim()
    .min(5)
    .max(300)
    .refine((v) => parseYoutubeId(v) !== null, 'Tautan YouTube tidak dikenali'),
  title: z.string().trim().min(3, 'Judul minimal 3 huruf').max(120),
  description: z.string().trim().max(300).default(''),
  active: z.boolean().default(true),
  sort: z.number().int().min(0).max(9999).default(0),
});
export type VideoInput = z.infer<typeof videoInputSchema>;

/** "Cara Daftar Anak di Udakids!" → "cara-daftar-anak-di-udakids". */
export function slugify(title: string): string {
  const s = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return s || 'artikel';
}

export const articleSlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug huruf kecil/angka dipisah "-"')
  .max(80);

export const articleInputSchema = z.strictObject({
  title: z.string().trim().min(5, 'Judul minimal 5 huruf').max(140),
  /** Kosong → dibuat dari judul. */
  slug: z.union([articleSlugSchema, z.literal('')]).default(''),
  summary: z.string().trim().min(10, 'Ringkasan minimal 10 huruf').max(300),
  body: z.string().trim().min(20, 'Isi artikel minimal 20 huruf').max(20_000),
  coverImageId: z.uuid().nullable().default(null),
  /**
   * Semua gambar artikel berurutan, maks. 10 (D-076). Gambar pertama menjadi sampul; detail artikel menampilkan
   * slider bila lebih dari satu. Kosong → memakai `coverImageId` (klien lama).
   */
  imageIds: z.array(z.uuid()).max(10, 'Maksimal 10 gambar').default([]),
  status: z.enum(['draft', 'published']).default('draft'),
});

/** Daftar gambar final + sampul dari input artikel (tanpa duplikat, urutan dipertahankan). */
export function articleImages(input: { coverImageId: string | null; imageIds: readonly string[] }) {
  const images = [
    ...new Set(
      input.imageIds.length ? input.imageIds : input.coverImageId ? [input.coverImageId] : [],
    ),
  ];
  return { imageIds: images, coverImageId: images[0] ?? null };
}
export type ArticleInput = z.infer<typeof articleInputSchema>;

export type ArticleBlock =
  { type: 'h'; text: string } | { type: 'p'; text: string } | { type: 'ul'; items: string[] };

/**
 * Pecah isi artikel menjadi blok: baris "## " = subjudul, baris "- " / "* " berurutan = daftar, sisanya paragraf
 * (dipisah baris kosong; baris baru di dalam paragraf digabung).
 */
export function articleBlocks(body: string): ArticleBlock[] {
  const out: ArticleBlock[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) out.push({ type: 'p', text: para.join(' ') });
    if (list.length) out.push({ type: 'ul', items: list });
    para = [];
    list = [];
  };
  for (const raw of body.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const h = /^#{1,3}\s+(.+)$/.exec(line);
    if (h) {
      flush();
      out.push({ type: 'h', text: h[1]!.trim() });
      continue;
    }
    const li = /^[-*•]\s+(.+)$/.exec(line);
    if (li) {
      if (para.length) {
        out.push({ type: 'p', text: para.join(' ') });
        para = [];
      }
      list.push(li[1]!.trim());
      continue;
    }
    if (list.length) {
      out.push({ type: 'ul', items: list });
      list = [];
    }
    para.push(line);
  }
  flush();
  return out;
}
