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
  /**
   * Penulis prompt (D-092): `claude` = Claude menyusun deskripsi gambar yang detail dari kata kamus, lalu
   * OpenAI menggambarnya; `none` = prompt bawaan. Claude tidak membuat gambar (hanya teks).
   */
  // Bawaan: Claude (D-092, permintaan pemilik produk). Tanpa kunci Claude, prompt bawaan tetap dipakai.
  promptWriter: z.enum(['none', 'claude']).default('claude'),
  claudeModel: z
    .string()
    .trim()
    .regex(/^claude-[a-z0-9-]{2,60}$/, 'nama model Claude, mis. claude-opus-5-5')
    .default('claude-opus-5-5'),
  /** Batas biaya yang ditegakkan UdaKids sendiri (bukan hanya peringatan di OpenAI). */
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
    /** Harga Claude per 1 juta token (penulis prompt, D-092). Default: Claude Opus 5.5. */
    claudeInputPer1M: usd.default(4),
    claudeCachedInputPer1M: usd.default(0.2),
    claudeOutputPer1M: usd.default(20),
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
  promptWriter: 'claude',
  claudeModel: 'claude-opus-5-5',
  dailyLimitUsd: 5,
  monthlyLimitUsd: 50,
  price: {
    imageLow: 0.006,
    imageMedium: 0.011,
    imageHigh: 0.036,
    textInputPer1M: 0.25,
    textCachedInputPer1M: 0.025,
    textOutputPer1M: 2,
    claudeInputPer1M: 4,
    claudeCachedInputPer1M: 0.2,
    claudeOutputPer1M: 20,
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
  /** Gaya gambar (D-088): `ilustrasi` (bawaan, vektor ramah anak) atau `foto` (foto realistis, simulasi). */
  style: z.enum(['ilustrasi', 'foto']).default('ilustrasi'),
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
  // Penulis prompt Claude: ±2.000 token masuk, ±1.500 keluar (termasuk berpikir), D-092.
  const claude =
    s.promptWriter === 'claude'
      ? (2000 * s.price.claudeInputPer1M + 1500 * s.price.claudeOutputPer1M) / 1e6
      : 0;
  return Math.round((per + text + claude) * 1e5) / 1e5;
}

/** Biaya Claude dari pemakaian token yang dilaporkan API (penulis prompt, D-092). */
export function claudeCost(
  s: AiImageSettings,
  u: { input: number; cachedRead: number; cacheWrite: number; output: number },
): number {
  return (
    (u.input * s.price.claudeInputPer1M +
      u.cacheWrite * s.price.claudeInputPer1M * 1.25 +
      u.cachedRead * s.price.claudeCachedInputPer1M +
      u.output * s.price.claudeOutputPer1M) /
    1e6
  );
}

/**
 * Instruksi sistem untuk Claude sebagai penulis prompt gambar (D-092). Tetap (tidak berubah per permintaan)
 * supaya bisa di-cache; data permintaan dikirim terpisah sebagai JSON. Hanya kata kamus & catatan admin yang
 * dikirim — tidak pernah data anak.
 */
export const CLAUDE_PROMPT_WRITER_SYSTEM = [
  'You write image-generation prompts for UdaKids, a learning app for Indonesian children aged 3 to 14.',
  'You receive one JSON request (kind, style, Indonesian label, optional English label, theme, note, variant)',
  'and the style guide the image model will also receive. Write ONE prompt in English, 60 to 140 words,',
  'that describes exactly what to show: the subject, its typical real-world appearance in Indonesia',
  '(shape, colour, material, size cues), pose or viewpoint, framing, lighting, and background.',
  'For style "foto": a natural realistic photograph; for style "ilustrasi": a friendly flat vector illustration.',
  'Make the subject instantly recognisable to a young child and keep the frame uncluttered.',
  'Hard rules: no letters, numbers, words, logos or watermarks in the image; nothing scary, violent or unsafe;',
  'people are fictional, modestly dressed, friendly; never name or imitate real or famous people or',
  'copyrighted characters; do not add objects that could be confused with the subject.',
  'If the label is ambiguous, choose the meaning a child would learn in an Indonesian classroom.',
  'Return only the JSON object with the prompt.',
].join(' ');

/** Isi pesan untuk Claude: permintaan (data, bukan instruksi) + panduan gaya yang dipakai model gambar. */
export const claudePromptWriterInput = (r: AiImageRequest, styleGuide: string) =>
  JSON.stringify({
    request: {
      kind: r.kind,
      style: r.style,
      label: r.label,
      ...(r.labelEn && { labelEn: r.labelEn }),
      ...(r.theme && { theme: r.theme }),
      ...(r.note && { note: r.note }),
      variant: r.variant,
      withMomo: r.withMomo,
    },
    styleGuide,
    basePrompt: composeImagePrompt(r),
  });

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

/** Versi gaya gambar UdaKids. Naikkan bila panduan gaya berubah (sidik jari ikut berubah). */
export const AI_STYLE_VERSION = 'udakids-v1';

/**
 * Panduan gaya tetap (awalan prompt yang sama untuk SEMUA gambar → prompt caching OpenAI aktif, dan
 * hasilnya konsisten). Tanpa teks/angka di gambar: tulisan digambar aplikasi.
 */
export const AI_STYLE_GUIDE = [
  'You create one illustration asset for UdaKids, a learning app for Indonesian children aged 3 to 8.',
  'Style: friendly flat vector illustration, thick clean dark outline, soft bright colors, gentle shading,',
  'rounded shapes, centered subject, generous empty margin, plain transparent or pure white background.',
  'Rules: absolutely no letters, numbers, words, logos, watermarks or brand marks anywhere in the image;',
  'not scary, no violence, no weapons; do not imitate real people or copyrighted characters;',
  'children shown are diverse, modestly dressed, cheerful; prefer Indonesian everyday objects and culture.',
  'Draw exactly what is requested once, nothing else in the frame.',
].join(' ');

/**
 * Panduan gaya FOTO realistis (D-088) untuk simulasi "benda nyata, bukan kartun". Tetap aman untuk anak: anak
 * rekaan (bukan orang sungguhan), berpakaian sopan, tanpa teks/logo, latar polos agar bendanya jelas.
 */
export const AI_PHOTO_STYLE_GUIDE = [
  'You create one realistic photograph asset for UdaKids, a learning app for Indonesian children aged 3 to 8.',
  'Style: natural realistic photo, soft even studio lighting, true-to-life colors and textures, sharp focus,',
  'centered subject, generous empty margin, plain light background. Not a cartoon, not an illustration, not 3D render.',
  'Rules: absolutely no letters, numbers, words, logos, watermarks or brand marks anywhere in the image;',
  'not scary, no blood, no injuries, no violence; any person shown is a fictional Indonesian child or adult,',
  'never a real or famous person, modestly dressed in plain clothes, friendly natural expression.',
  'Photograph exactly what is requested once, nothing else in the frame.',
].join(' ');

/** Panduan gaya untuk satu permintaan. */
export const aiStyleGuideFor = (r: Pick<AiImageRequest, 'style'>) =>
  r.style === 'foto' ? AI_PHOTO_STYLE_GUIDE : AI_STYLE_GUIDE;

/** Susun prompt dari data kamus (bukan teks bebas). */
export function composeImagePrompt(r: AiImageRequest): string {
  const subject = r.labelEn ? `${r.label} (${r.labelEn})` : r.label;
  if (r.style === 'foto') {
    const photo =
      r.kind === 'scene'
        ? [`A realistic photo for a lesson: ${subject}.`, 'Simple uncluttered setting.']
        : r.kind === 'character'
          ? [
              `A realistic full-body photo: ${subject}, front view, standing straight, arms slightly away from the body.`,
            ]
          : [`A realistic close-up photo of ${subject}, whole subject visible.`];
    if (r.theme) photo.push(`Theme: ${r.theme}.`);
    if (r.note) photo.push(`Note: ${r.note.replace(/[\r\n]+/g, ' ')}.`);
    if (r.variant > 1) photo.push(`Variation ${r.variant}: a different but equally clear example.`);
    return photo.join(' ');
  }
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
