import { isChirpModel, type VoiceLang, type VoiceSettings } from '@little-coder/engine';

/** Penyedia text-to-speech. Kunci API hanya di server — browser anak tidak pernah memanggilnya. */
export type TtsProvider = {
  readonly name: string;
  synthesize(
    text: string,
    settings: VoiceSettings,
    lang?: VoiceLang,
  ): Promise<{ mime: string; data: Buffer }>;
};

export const TTS_PROVIDER = Symbol('TTS_PROVIDER');

/**
 * Isi permintaan `text:synthesize` (D-087). Chirp 3 HD: suara dipilih lewat nama lengkap
 * (`id-ID-Chirp3-HD-Leda`) tanpa `modelName` dan tanpa `prompt` (Google menolak arahan gaya untuk Chirp).
 * Gemini-TTS: nama suara pendek + `modelName` + arahan gaya di `input.prompt`.
 */
export function ttsRequestBody(text: string, s: VoiceSettings, lang: VoiceLang) {
  const audioConfig = { audioEncoding: 'MP3', speakingRate: s.rate };
  if (isChirpModel(s.model))
    return {
      input: { text },
      voice: { languageCode: lang, name: `${lang}-Chirp3-HD-${s.voice}` },
      audioConfig,
    };
  return {
    input: { text, ...(s.style && { prompt: s.style }) },
    voice: { languageCode: lang, name: s.voice, modelName: s.model },
    audioConfig,
  };
}

/**
 * Google Cloud Text-to-Speech: Chirp 3 HD (bawaan) atau Gemini-TTS. Memakai Google Cloud — bukan
 * kunci Google AI Studio, yang syaratnya melarang aplikasi untuk pengguna di bawah 18 tahun (D-035).
 */
export class GoogleCloudTts implements TtsProvider {
  readonly name = 'google-cloud-tts';
  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async synthesize(text: string, s: VoiceSettings, lang: VoiceLang = 'id-ID') {
    const res = await this.fetchFn('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify(ttsRequestBody(text, s, lang)),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`TTS ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { audioContent?: string };
    if (!json.audioContent) throw new Error('TTS: respons tanpa audio');
    return { mime: 'audio/mpeg', data: Buffer.from(json.audioContent, 'base64') };
  }
}

/** Penyedia dari .env: `GOOGLE_TTS_API_KEY` kosong → tanpa suara Momo (aplikasi memakai suara browser). */
export function ttsFromEnv(): TtsProvider | null {
  const key = process.env.GOOGLE_TTS_API_KEY?.trim();
  return key ? new GoogleCloudTts(key) : null;
}
