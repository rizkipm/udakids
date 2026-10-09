/**
 * Claude menyaring foto stok sebelum tampil ke anak (D-095): cocok dengan benda/adegan pelajaran, pantas untuk
 * anak 5–12 tahun, dan tanpa tulisan/angka/logo yang menonjol (foto tidak boleh memuat jawaban soal).
 */
import Anthropic from '@anthropic-ai/sdk';

export type ScreenVerdict = {
  ok: boolean;
  reason: string;
  usage: { input: number; cachedRead: number; cacheWrite: number; output: number };
};

export interface PhotoScreener {
  check(imageUrl: string, label: string, labelEn?: string): Promise<ScreenVerdict>;
}

const SYSTEM = [
  'You review stock photos for a learning app for Indonesian children aged 5-12.',
  'A photo is shown inside a lesson next to an Indonesian caption. Approve it only if ALL are true:',
  '1. match: the main subject clearly shows what the caption describes (the specific object, part, or scene),',
  '   so a child would recognise it. A generic or loosely related photo does not match.',
  '2. childSafe: appropriate for young children in a conservative culture: no violence, injury, blood, weapons,',
  '   alcohol, smoking, romance, swimwear or revealing clothing, scary or disturbing content.',
  '3. noText: no prominent readable text, numbers, brand names or logos.',
  'Reply with the JSON verdict only. Keep "reason" to one short Indonesian sentence.',
].join('\n');

const SCHEMA = {
  type: 'object',
  properties: {
    match: { type: 'boolean' },
    childSafe: { type: 'boolean' },
    noText: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['match', 'childSafe', 'noText', 'reason'],
  additionalProperties: false,
} as const;

export class ClaudePhotoScreener implements PhotoScreener {
  private readonly client: Anthropic;
  constructor(
    apiKey: string,
    private readonly model: string,
    client?: Anthropic,
  ) {
    this.client = client ?? new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
  }

  async check(imageUrl: string, label: string, labelEn?: string): Promise<ScreenVerdict> {
    const res = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: 2000,
      // Tugas klasifikasi singkat: effort rendah. Bila Claude menolak, server mencoba model cadangan.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: imageUrl } },
            {
              type: 'text',
              text: `Caption (Indonesian): "${label}"${labelEn ? `\nIn English: "${labelEn}"` : ''}`,
            },
          ],
        },
      ],
    });
    const u = res.usage;
    const usage = {
      input: u.input_tokens,
      cachedRead: u.cache_read_input_tokens ?? 0,
      cacheWrite: u.cache_creation_input_tokens ?? 0,
      output: u.output_tokens,
    };
    if (res.stop_reason === 'refusal') return { ok: false, reason: 'Claude menolak foto', usage };
    const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    try {
      const v = JSON.parse(text) as {
        match?: boolean;
        childSafe?: boolean;
        noText?: boolean;
        reason?: string;
      };
      return {
        ok: v.match === true && v.childSafe === true && v.noText === true,
        reason: String(v.reason ?? '').slice(0, 200),
        usage,
      };
    } catch {
      return { ok: false, reason: 'Jawaban Claude bukan JSON', usage };
    }
  }
}
