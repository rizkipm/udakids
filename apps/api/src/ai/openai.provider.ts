import { AI_STYLE_GUIDE, type AiImageSettings } from '@little-coder/engine';

const API = 'https://api.openai.com/v1';
/** Awalan prompt yang sama untuk semua gambar → OpenAI memakai cache prompt (input lebih murah). */
const PROMPT_CACHE_KEY = 'udakids-image-v1';

export type ImageResult = {
  mime: string;
  data: Buffer;
  /** Token teks (mode responses) — untuk biaya & laporan cache. */
  usage?: { input: number; cached: number; output: number };
};

export type ImageProvider = {
  generate(input: {
    prompt: string;
    /** Panduan gaya (ilustrasi atau foto realistis, D-088). Bawaan: ilustrasi. */
    styleGuide?: string;
    settings: AiImageSettings;
    reference?: { mime: string; data: Buffer };
  }): Promise<ImageResult>;
  /** Uji kunci tanpa biaya (membaca info model). */
  test(model: string): Promise<string>;
};

/** Pesan error dari OpenAI, dipotong dan tanpa kunci apa pun (`sk-…` disensor). */
export function safeError(status: number, body: string): string {
  let message = body;
  try {
    message = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? body;
  } catch {
    /* bukan JSON */
  }
  const clean = message.replace(/sk-[A-Za-z0-9_-]{6,}/g, 'sk-…').slice(0, 240);
  return `OpenAI ${status}: ${clean}`;
}

type ResponsesOutput = {
  output?: { type?: string; result?: string | null }[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
  };
};

/**
 * OpenAI untuk AI Gambar (D-068). Dua cara:
 * - `responses`: model teks (mis. gpt-5.6-luna) + alat `image_generation` yang dipaksa (`tool_choice`), jadi
 *   tidak ada balasan teks panjang; bisa memakai gambar referensi karakter (Momo) agar konsisten.
 * - `images`: Images API langsung dengan model gambar.
 * Kunci hanya di server dan tidak pernah dicatat. `store: false` — permintaan tidak disimpan di OpenAI.
 */
export class OpenAiImages implements ImageProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  private async post(path: string, body: unknown) {
    const res = await this.fetchFn(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    });
    const text = await res.text();
    if (!res.ok) throw new OpenAiError(res.status, safeError(res.status, text));
    return JSON.parse(text) as unknown;
  }

  async generate({
    prompt,
    settings: s,
    reference,
    styleGuide = AI_STYLE_GUIDE,
  }: {
    prompt: string;
    /** Panduan gaya (ilustrasi atau foto realistis, D-088). */
    styleGuide?: string;
    settings: AiImageSettings;
    reference?: { mime: string; data: Buffer };
  }): Promise<ImageResult> {
    if (s.mode === 'images') {
      if (reference) throw new Error('Gambar referensi hanya bisa di mode responses');
      const json = (await this.post('/images/generations', {
        model: s.imageModel,
        prompt: `${styleGuide}\n\n${prompt}`,
        size: s.size,
        quality: s.quality,
        background: s.background,
        output_format: 'webp',
        output_compression: s.compression,
        n: 1,
      })) as { data?: { b64_json?: string }[] };
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) throw new Error('OpenAI: respons tanpa gambar');
      return { mime: 'image/webp', data: Buffer.from(b64, 'base64') };
    }

    const tool = {
      type: 'image_generation',
      model: s.imageModel,
      quality: s.quality,
      size: s.size,
      background: s.background,
      output_format: 'webp',
      output_compression: s.compression,
    };
    const body = (withModel: boolean) => ({
      model: s.textModel,
      instructions: styleGuide,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            ...(reference
              ? [
                  {
                    type: 'input_image',
                    image_url: `data:${reference.mime};base64,${reference.data.toString('base64')}`,
                  },
                ]
              : []),
          ],
        },
      ],
      tools: [withModel ? tool : { ...tool, model: undefined }],
      tool_choice: { type: 'image_generation' },
      store: false,
      prompt_cache_key: PROMPT_CACHE_KEY,
    });
    let json: ResponsesOutput;
    try {
      json = (await this.post('/responses', body(true))) as ResponsesOutput;
    } catch (err) {
      // Akun/model tertentu tidak menerima `model` di alat gambar: ulang sekali tanpa itu.
      if (!(err instanceof OpenAiError && err.status === 400 && /model/i.test(err.message)))
        throw err;
      json = (await this.post('/responses', body(false))) as ResponsesOutput;
    }
    const b64 = json.output?.find((o) => o.type === 'image_generation_call' && o.result)?.result;
    if (!b64)
      throw new Error('OpenAI: respons tanpa gambar (alat image_generation tidak dipanggil)');
    return {
      mime: 'image/webp',
      data: Buffer.from(b64, 'base64'),
      usage: {
        input: json.usage?.input_tokens ?? 0,
        cached: json.usage?.input_tokens_details?.cached_tokens ?? 0,
        output: json.usage?.output_tokens ?? 0,
      },
    };
  }

  async test(model: string) {
    const res = await this.fetchFn(`${API}/models/${encodeURIComponent(model)}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new OpenAiError(res.status, safeError(res.status, await res.text()));
    return `Kunci aktif, model ${model} tersedia`;
  }
}

export class OpenAiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const IMAGE_PROVIDER = Symbol('IMAGE_PROVIDER');
export type ImageProviderFactory = (apiKey: string) => ImageProvider;
