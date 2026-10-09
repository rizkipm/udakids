import { describe, expect, it } from 'vitest';
import { DEFAULT_VOICE_SETTINGS } from '@little-coder/engine';
import { GoogleCloudTts, ttsRequestBody } from '../src/voice/tts.provider.js';

describe('Google Cloud TTS: Chirp 3 HD & Gemini-TTS (D-087)', () => {
  const s = { ...DEFAULT_VOICE_SETTINGS, voice: 'Leda', rate: 1 };

  it('bawaan Chirp 3 HD: nama suara lengkap, tanpa modelName & arahan gaya', () => {
    expect(DEFAULT_VOICE_SETTINGS.model).toBe('chirp3-hd');
    expect(ttsRequestBody('Halo.', s, 'id-ID')).toEqual({
      input: { text: 'Halo.' },
      voice: { languageCode: 'id-ID', name: 'id-ID-Chirp3-HD-Leda' },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1 },
    });
    expect(ttsRequestBody('cat', s, 'en-GB').voice.name).toBe('en-GB-Chirp3-HD-Leda');
  });

  it('Gemini-TTS: nama suara pendek + modelName + arahan gaya', () => {
    const g = { ...s, model: 'gemini-2.5-flash-tts', style: 'Ramah.' };
    expect(ttsRequestBody('Halo.', g, 'id-ID')).toEqual({
      input: { text: 'Halo.', prompt: 'Ramah.' },
      voice: { languageCode: 'id-ID', name: 'Leda', modelName: 'gemini-2.5-flash-tts' },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1 },
    });
  });

  it('memanggil endpoint dengan kunci di header, mengembalikan MP3', async () => {
    let seen: { url: string; key: string | null; body: unknown } | undefined;
    const fake = (async (url: string, init: RequestInit) => {
      seen = {
        url,
        key: new Headers(init.headers).get('x-goog-api-key'),
        body: JSON.parse(String(init.body)),
      };
      return new Response(JSON.stringify({ audioContent: Buffer.from('mp3').toString('base64') }));
    }) as unknown as typeof fetch;
    const out = await new GoogleCloudTts('AIza-test', fake).synthesize('Halo.', s);
    expect(out).toEqual({ mime: 'audio/mpeg', data: Buffer.from('mp3') });
    expect(seen?.url).toMatch(/texttospeech\.googleapis\.com\/v1\/text:synthesize$/);
    expect(seen?.key).toBe('AIza-test');
    expect(seen?.body).toMatchObject({ voice: { name: 'id-ID-Chirp3-HD-Leda' } });
  });
});
