import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SPEECH_TROUBLE,
  audioReady,
  installAudioUnlock,
  pushVoiceItem,
  resetVoice,
  speak,
  speechAvailable,
  stopSpeaking,
} from '../../src/audio/speech';

/**
 * Hanya suara Chirp dari server (D-106): suara bawaan browser tidak pernah dipakai — tidak saat server tanpa
 * Chirp, tidak saat klip gagal, tidak juga untuk membuka kunci suara di iPhone/iPad.
 */
let browserSpoken: string[];

beforeEach(() => {
  vi.useFakeTimers();
  browserSpoken = [];
  vi.stubGlobal('speechSynthesis', {
    speaking: false,
    pending: false,
    paused: false,
    cancel: () => {},
    resume: () => {},
    getVoices: () => [],
    speak: (u: { text: string }) => browserSpoken.push(u.text),
  });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      constructor(readonly text: string) {}
    },
  );
});
afterEach(() => {
  stopSpeaking();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('tanpa suara bawaan browser (D-106)', () => {
  it('server tanpa Chirp → Momo diam + event bantuan (layar menampilkan teks), bukan suara browser', () => {
    resetVoice({ enabled: false, rev: 'r0', lines: {} });
    const trouble = vi.fn();
    window.addEventListener(SPEECH_TROUBLE, trouble);
    const onEnd = vi.fn();
    speak('Momo baru!', { onEnd });
    expect(browserSpoken).toEqual([]);
    expect(trouble).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
    window.removeEventListener(SPEECH_TROUBLE, trouble);
  });

  it('klip gagal dua kali → diam + event bantuan, tetap tanpa suara browser', () => {
    vi.useRealTimers();
    resetVoice({ enabled: true, rev: 'r1', lines: {} });
    const urls: string[] = [];
    vi.stubGlobal(
      'Audio',
      class {
        onerror: (() => void) | null = null;
        constructor(readonly src: string) {
          urls.push(src);
        }
        pause() {}
        play() {
          queueMicrotask(() => this.onerror?.());
          return Promise.resolve();
        }
      },
    );
    const trouble = vi.fn();
    window.addEventListener(SPEECH_TROUBLE, trouble);
    const onEnd = vi.fn();
    speak('Pilih pernak-pernik', { onEnd });
    return vi.waitFor(() => {
      expect(urls).toHaveLength(2);
      expect(urls[0]).toContain('/voice/say?');
      expect(trouble).toHaveBeenCalledTimes(1);
      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(browserSpoken).toEqual([]);
      window.removeEventListener(SPEECH_TROUBLE, trouble);
    });
  });

  it('kalimat Indonesia yang memuat "Momo" diminta dengan suara Indonesia, bukan British', () => {
    resetVoice({ enabled: true, rev: 'r1', lines: {} });
    const urls: string[] = [];
    vi.stubGlobal(
      'Audio',
      class {
        constructor(readonly src: string) {
          urls.push(src);
        }
        pause() {}
        play() {
          return new Promise(() => {});
        }
      },
    );
    speak('Momo baru!');
    expect(new URL(urls[0]!).searchParams.get('l')).toBeNull(); // null = id-ID
  });

  it('D-112: di soal buku non-English semua kalimat suara Indonesia; di buku English ditebak per kalimat', () => {
    resetVoice({ enabled: true, rev: 'r1', lines: {} });
    const urls: string[] = [];
    vi.stubGlobal(
      'Audio',
      class {
        constructor(readonly src: string) {
          urls.push(src);
        }
        pause() {}
        play() {
          return new Promise(() => {});
        }
      },
    );
    const langOf = (u: string) => new URL(u).searchParams.get('l') ?? 'id-ID';
    const release = pushVoiceItem({ skillId: 'math.prek.a1.hitung', seed: 1, band: 0 });
    speak('The main dancer wears no mask.');
    expect(langOf(urls.at(-1)!)).toBe('id-ID');
    release();
    const releaseEn = pushVoiceItem({ skillId: 'english.sd12.a1.x', seed: 1, band: 0 });
    speak('The main dancer wears no mask.');
    expect(langOf(urls.at(-1)!)).toBe('en-GB');
    releaseEn();
  });

  it('iPhone/iPad: ketukan pertama membuka kunci audio klip (senyap), sekali; tanpa ucapan browser', () => {
    Object.defineProperty(navigator, 'userActivation', {
      value: { hasBeenActive: false },
      configurable: true,
    });
    expect(audioReady()).toBe(false);
    const audioPlays: number[] = [];
    vi.stubGlobal(
      'Audio',
      class {
        volume = 1;
        play() {
          audioPlays.push(this.volume);
          return Promise.resolve();
        }
      },
    );
    expect(speechAvailable()).toBe(true);
    installAudioUnlock();
    window.dispatchEvent(new Event('pointerdown'));
    window.dispatchEvent(new Event('pointerdown'));
    expect(audioReady()).toBe(true);
    expect(audioPlays).toEqual([0]);
    expect(browserSpoken).toEqual([]);
  });
});
