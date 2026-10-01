import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  itemVoiceUrl,
  loadVoice,
  resetVoice,
  speakItem,
  speakLine,
  stopSpeaking,
} from '../../src/audio/speech';

/** Audio palsu: mencatat URL yang diputar. */
const played: string[] = [];
class FakeAudio {
  onplaying: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly src: string) {}
  play() {
    played.push(this.src);
    this.onplaying?.();
    return Promise.resolve();
  }
  pause() {}
}

const spoken: string[] = [];
beforeEach(() => {
  played.length = 0;
  spoken.length = 0;
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('speechSynthesis', {
    cancel: () => {},
    getVoices: () => [],
    speak: (u: { text: string }) => spoken.push(u.text),
  });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      constructor(readonly text: string) {}
    },
  );
  resetVoice();
});
afterEach(() => {
  stopSpeaking();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const manifest = {
  enabled: true,
  rev: 'r1',
  lines: {
    vo_cmd_pick_one: { text: 'Pilih satu jawaban yang paling tepat, ya.', clip: 'a'.repeat(64) },
    vo_right_1: { text: 'Tepat!', clip: null },
  },
};

describe('suara Momo (D-035)', () => {
  it('kalimat dengan klip → putar klip Momo; tanpa klip → suara browser', () => {
    resetVoice(manifest);
    speakLine('vo_cmd_pick_one', 'cadangan');
    expect(played).toHaveLength(1);
    expect(played[0]).toMatch(new RegExp(`/voice/clip/${'a'.repeat(64)}$`));
    expect(spoken).toEqual([]);
    speakLine('vo_right_1', 'cadangan');
    expect(spoken).toEqual(['Tepat!']); // teks dari dialog (bisa disunting admin)
    speakLine('vo_tidak_ada', 'Teks cadangan');
    expect(spoken.at(-1)).toBe('Teks cadangan');
  });

  it('suara Momo mati / belum dimuat → semuanya suara browser', () => {
    speakLine('vo_cmd_pick_one', 'Pilih satu.');
    speakItem({ skillId: 'math.prek.a1.x', seed: 3, band: 0 }, 'Ketuk lingkaran.');
    expect(played).toEqual([]);
    expect(spoken).toEqual(['Pilih satu.', 'Ketuk lingkaran.']);
  });

  it('soal Basic: URL dari skill + seed + band (server menurunkan teksnya sendiri)', () => {
    resetVoice(manifest);
    const item = { skillId: 'math.prek.a1.kenali-angka', seed: 42, band: 1 };
    speakItem(item, 'Ketuk angka 1.');
    expect(played).toHaveLength(1);
    expect(played[0]).toMatch(
      /\/voice\/item\/math\.prek\.a1\.kenali-angka\?seed=42&band=1&part=prompt&v=r1$/,
    );
    expect(itemVoiceUrl(item, 'reteach')).toContain('part=reteach');
  });

  it('klip gagal diputar → jatuh ke suara browser', async () => {
    resetVoice(manifest);
    vi.stubGlobal(
      'Audio',
      class extends FakeAudio {
        override play() {
          return Promise.reject(new Error('blocked'));
        }
      },
    );
    speakLine('vo_cmd_pick_one', 'cadangan');
    await Promise.resolve();
    await Promise.resolve();
    expect(spoken).toEqual(['Pilih satu jawaban yang paling tepat, ya.']);
  });

  it('manifest dimuat dari /voice/lines dan disimpan untuk offline', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/json' } }),
    );
    await loadVoice('/api');
    expect(JSON.parse(localStorage.getItem('lc.voice')!).rev).toBe('r1');
    speakLine('vo_cmd_pick_one', 'x');
    expect(played).toHaveLength(1);
  });
});
