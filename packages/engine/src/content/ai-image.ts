import { z } from 'zod';

/**
 * AI Gambar di panel admin (D-068): gambar aset dibuat SEKALI lewat OpenAI, disimpan, lalu dipakai ulang.
 * Anak tidak pernah memicu AI. Pengaturan di app_settings `ai_image`; API key terpisah & terenkripsi.
 */
export const AI_IMAGE_KINDS = ['object', 'character', 'scene'] as const;
export type AiImageKind = (typeof AI_IMAGE_KINDS)[number];
export const AI_IMAGE_STATUSES = ['review', 'approved', 'rejected'] as const;
export type AiImageStatus = (typeof AI_IMAGE_STATUSES)[number];

const usd = z.number().min(0).max(10_000);
const model = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9.\-_]{1,60}$/, 'nama model huruf kecil, angka, . - _');

export const aiImageSettingsSchema = z.strictObject({
  /** Tombol darurat: false = semua pembuatan gambar ditolak. */
  enabled: z.boolean(),
  /**
   * `responses` = Responses API: `textModel` (mis. gpt-5.6-luna) memanggil alat `image_generation`; bisa
   * memakai gambar referensi karakter. `images` = Images API langsung dengan `imageModel`.
   */
  mode: z.enum(['responses', 'images']),
  textModel: model,
  /** Model gambar (Images API, dan model alat image_generation di mode responses). */
  imageModel: model,
  quality: z.enum(['low', 'medium', 'high']),
  size: z.enum(['1024x1024', '1024x1536', '1536x1024']),
  background: z.enum(['transparent', 'opaque', 'auto']),
  /** Kompresi WebP 0–100 (makin kecil makin hemat ruang). */
  compression: z.number().int().min(30).max(100),
  /** Batas biaya yang ditegakkan Udakids sendiri (bukan hanya peringatan di OpenAI). */
  dailyLimitUsd: usd,
  monthlyLimitUsd: usd,
  /** Tabel harga (perkiraan, ubah bila harga resmi berubah). */
  price: z.strictObject({
    imageLow: usd,
    imageMedium: usd,
    imageHigh: usd,
    /** Per 1 juta token teks (mode responses). */
    textInputPer1M: usd,
    textCachedInputPer1M: usd,
    textOutputPer1M: usd,
  }),
});
export type AiImageSettings = z.infer<typeof aiImageSettingsSchema>;

export const DEFAULT_AI_IMAGE_SETTINGS: AiImageSettings = {
  enabled: true,
  mode: 'responses',
  textModel: 'gpt-5.6-luna',
  imageModel: 'gpt-image-2',
  quality: 'low',
  size: '1024x1024',
  background: 'transparent',
  compression: 80,
  dailyLimitUsd: 5,
  monthlyLimitUsd: 50,
  price: {
    imageLow: 0.006,
    imageMedium: 0.011,
    imageHigh: 0.036,
    textInputPer1M: 0.25,
    textCachedInputPer1M: 0.025,
    textOutputPer1M: 2,
  },
};

/** Id kata/benda di Kamus Bergambar: huruf kecil, angka, tanda hubung (mis. "kupu-kupu"). */
export const aiSubjectSchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9-]{1,39}$/, 'id huruf kecil/angka/tanda hubung, 2–40 karakter');

/** Permintaan gambar dari admin. Prompt disusun server — admin hanya mengisi kata & catatan pendek. */
export const aiImageRequestSchema = z.strictObject({
  kind: z.enum(AI_IMAGE_KINDS),
  subject: aiSubjectSchema,
  /** Kata Indonesia yang digambar (mis. "apel"); untuk adegan: deskripsi singkat. */
  label: z.string().trim().min(2).max(80),
  labelEn: z.string().trim().max(60).optional(),
  theme: z.string().trim().max(40).optional(),
  /** Catatan gaya pendek, mis. "warna hijau", "tampak samping". */
  note: z.string().trim().max(120).optional(),
  /** Varian ke-n (1 = pertama). Varian baru = gambar baru; varian yang sama dipakai ulang. */
  variant: z.number().int().min(1).max(12).default(1),
  /** Sertakan Momo (karakter referensi yang sudah disetujui) — hanya mode responses. */
  withMomo: z.boolean().default(false),
});
export type AiImageRequest = z.infer<typeof aiImageRequestSchema>;

/** Perkiraan biaya satu gambar (USD) dari tabel harga. Token teks mode responses kecil dan ditambah. */
export function estimateImageCost(s: AiImageSettings): number {
  const per =
    s.quality === 'low'
      ? s.price.imageLow
      : s.quality === 'medium'
        ? s.price.imageMedium
        : s.price.imageHigh;
  // Ukuran persegi panjang sedikit lebih murah di daftar harga; pakai harga persegi (lebih aman).
  const text =
    s.mode === 'responses'
      ? (1500 * s.price.textInputPer1M + 300 * s.price.textOutputPer1M) / 1e6
      : 0;
  return Math.round((per + text) * 1e5) / 1e5;
}

/** Biaya sebenarnya dari pemakaian token teks yang dilaporkan API (mode responses). */
export function textCost(
  s: AiImageSettings,
  u: { input: number; cached: number; output: number },
): number {
  const fresh = Math.max(0, u.input - u.cached);
  return (
    (fresh * s.price.textInputPer1M +
      u.cached * s.price.textCachedInputPer1M +
      u.output * s.price.textOutputPer1M) /
    1e6
  );
}

/** Versi gaya gambar Udakids. Naikkan bila panduan gaya berubah (sidik jari ikut berubah). */
export const AI_STYLE_VERSION = 'udakids-v1';

/**
 * Panduan gaya tetap (awalan prompt yang sama untuk SEMUA gambar → prompt caching OpenAI aktif, dan
 * hasilnya konsisten). Tanpa teks/angka di gambar: tulisan digambar aplikasi.
 */
export const AI_STYLE_GUIDE = [
  'You create one illustration asset for Udakids, a learning app for Indonesian children aged 3 to 8.',
  'Style: friendly flat vector illustration, thick clean dark outline, soft bright colors, gentle shading,',
  'rounded shapes, centered subject, generous empty margin, plain transparent or pure white background.',
  'Rules: absolutely no letters, numbers, words, logos, watermarks or brand marks anywhere in the image;',
  'not scary, no violence, no weapons; do not imitate real people or copyrighted characters;',
  'children shown are diverse, modestly dressed, cheerful; prefer Indonesian everyday objects and culture.',
  'Draw exactly what is requested once, nothing else in the frame.',
].join(' ');

/** Susun prompt dari data kamus (bukan teks bebas). */
export function composeImagePrompt(r: AiImageRequest): string {
  const subject = r.labelEn ? `${r.label} (${r.labelEn})` : r.label;
  const parts =
    r.kind === 'character'
      ? [
          `Character reference sheet pose: ${subject}, full body, front view, neutral happy expression.`,
          'This exact design will be reused as the reference for every future image of this character.',
        ]
      : r.kind === 'scene'
        ? [
            `A simple scene for a lesson: ${subject}.`,
            'Keep the scene uncluttered with few objects.',
          ]
        : [`A single ${subject}, whole object visible, as a sticker-like icon.`];
  if (r.theme) parts.push(`Theme: ${r.theme}.`);
  if (r.note) parts.push(`Note: ${r.note.replace(/[\r\n]+/g, ' ')}.`);
  if (r.variant > 1) parts.push(`Variation ${r.variant}: a different but equally clear example.`);
  if (r.withMomo)
    parts.push(
      'Include Momo, the small friendly robot from the reference image, unchanged in shape and colors.',
    );
  return parts.join(' ');
}
