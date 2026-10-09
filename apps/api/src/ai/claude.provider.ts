import Anthropic from '@anthropic-ai/sdk';
import {
  CLAUDE_PROMPT_WRITER_SYSTEM,
  claudePromptWriterInput,
  type AiImageRequest,
} from '@little-coder/engine';

/**
 * Claude sebagai penulis prompt gambar (D-092): menyusun deskripsi gambar yang detail dari kata kamus, lalu
 * OpenAI yang menggambar. Claude hanya menghasilkan teks (tidak membuat gambar). Dipanggil dari panel admin saja;
 * yang dikirim hanya kata kamus & catatan admin, tidak pernah data anak.
 */
export type PromptWriterResult = {
  prompt: string;
  usage: { input: number; cachedRead: number; cacheWrite: number; output: number };
};

export type PromptWriter = {
  write(r: AiImageRequest, styleGuide: string, model: string): Promise<PromptWriterResult>;
  /** Uji kunci tanpa biaya token (membaca info model). */
  test(model: string): Promise<string>;
};

/** Keluaran terstruktur: satu prompt bahasa Inggris. */
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: { prompt: { type: 'string' } },
  required: ['prompt'],
  additionalProperties: false,
} as const;

export class ClaudePromptWriter implements PromptWriter {
  private readonly client: Anthropic;
  constructor(apiKey: string, client?: Anthropic) {
    this.client = client ?? new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
  }

  async write(r: AiImageRequest, styleGuide: string, model: string): Promise<PromptWriterResult> {
    const res = await this.client.beta.messages.create({
      model,
      max_tokens: 4000,
      // Tugas pendek & sederhana: effort rendah. Bila Claude menolak (klasifikasi keamanan), server
      // menjalankan ulang di model cadangan yang direkomendasikan.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        { type: 'text', text: CLAUDE_PROMPT_WRITER_SYSTEM, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: claudePromptWriterInput(r, styleGuide) }],
    });
    if (res.stop_reason === 'refusal') throw new Error('Claude menolak permintaan ini');
    if (res.stop_reason === 'max_tokens') throw new Error('Jawaban Claude terpotong');
    const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    let prompt: string;
    try {
      prompt = String((JSON.parse(text) as { prompt?: unknown }).prompt ?? '').trim();
    } catch {
      throw new Error('Jawaban Claude bukan JSON yang valid');
    }
    if (prompt.length < 20) throw new Error('Prompt dari Claude terlalu pendek');
    const u = res.usage;
    return {
      prompt: prompt.slice(0, 2000),
      usage: {
        input: u.input_tokens,
        cachedRead: u.cache_read_input_tokens ?? 0,
        cacheWrite: u.cache_creation_input_tokens ?? 0,
        output: u.output_tokens,
      },
    };
  }

  async test(model: string) {
    const m = await this.client.models.retrieve(model);
    return `Berhasil: ${m.display_name ?? m.id}`;
  }
}

/** Pabrik penulis prompt (diganti palsu di test). */
export type PromptWriterFactory = (apiKey: string) => PromptWriter;
export const PROMPT_WRITER = Symbol('PROMPT_WRITER');

/** Pesan error Claude tanpa kunci (kunci `sk-ant-…` disensor). */
export const safeClaudeError = (err: unknown) =>
  ((err as Error).message ?? 'Claude gagal')
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, 'sk-ant-…')
    .slice(0, 240);
