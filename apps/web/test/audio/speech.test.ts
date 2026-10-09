import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SPEECH_BLOCKED,
  SPEECH_TROUBLE,
  audioReady,
  installAudioUnlock,
  resetVoice,
  speak,
  speechChunks,
  stopSpeaking,
} from '../../src/audio/speech';

type U = {
  text: string;
  lang?: string;
  voice?: unknown;
  volume?: number;
  onstart?: () => void;
  onend?: () => void;
  onerror?: (e: { error: string }) => void;
};

const VOICE_OFF = { enabled: false, rev: 'r0', lines: {} };

/** Mesin suara palsu yang bisa diatur perilakunya per test. */
let spoken: U[];
let behave: (u: U, n: number) => void;
let synthState: { speaking: boolean; pending: boolean; paused: boolean };
let resumed: number;

beforeEach(() => {
  vi.useFakeTimers();
  spoken = [];
  resumed = 0;
  synthState = { speaking: false, pending: false, paused: false };
  behave = (u) => {
    u.onstart?.();
    u.onend?.();
  };
  vi.stubGlobal('speechSynthesis', {
    get speaking() {
      return synthState.speaking;
    },
    get pending() {
      return synthState.pending;
    },
    get paused() {
      return synthState.paused;
    },
    cancel: () => {},
    resume: () => {
      resumed++;
      synthState.paused = false;
    },
    getVoices: () => [],
    speak: (u: U) => {
      spoken.push(u);
      behave(u, spoken.length);
    },
  });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      constructor(readonly text: string) {}
    },
  );
  // Mesin suara browser (cadangan, D-091) diuji dengan suara server mati.
  resetVoice(VOICE_OFF);
});
afterEach(() => {
  stopSpeaking();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('suara perempuan lebih dulu (D-062)', () => {
  const voice = (name: string, lang: string, localService = true) => ({ name, lang, localService });
  const useVoices = (list: ReturnType<typeof voice>[]) => {
    (speechSynthesis as unknown as { getVoices: () => unknown[] }).getVoices = () => list;
    resetVoice(VOICE_OFF);
  };

  it('kata English memakai suara perempuan British, bukan "Daniel" yang berat', () => {
    useVoices([voice('Daniel', 'en-GB'), voice('Serena', 'en-GB'), voice('Samantha', 'en-US')]);
    speak('cat', { lang: 'en-GB' });
    expect((spoken[0]!.voice as { name: string }).name).toBe('Serena');
    expect(spoken[0]!.lang).toBe('en-GB');
  });

  it('tanpa suara perempuan British: suara perempuan English lain lebih dulu', () => {
    useVoices([voice('Daniel', 'en-GB'), voice('Arthur', 'en-GB'), voice('Samantha', 'en-US')]);
    speak('cat', { lang: 'en-GB' });
    // iPad bawaan: en-GB hanya Daniel/Arthur (pria), en-US punya Samantha (perempuan).
    expect((spoken[0]!.voice as { name: string }).name).toBe('Samantha');
    useVoices([
      voice('Google UK English Male', 'en-GB'),
      voice('Google UK English Female', 'en-GB'),
    ]);
    speak('dog', { lang: 'en-GB' });
    expect((spoken[1]!.voice as { name: string }).name).toBe('Google UK English Female');
  });

  it('narasi Indonesia memilih suara perempuan (Damayanti) daripada pria (Ardi)', () => {
    useVoices([voice('Microsoft Ardi', 'id-ID'), voice('Damayanti', 'id-ID')]);
    speak('Ketuk kata cat.');
    expect((spoken[0]!.voice as { name: string }).name).toBe('Damayanti');
  });
});

describe('suara soal lintas perangkat (D-046)', () => {
  it('teks panjang dipecah per kalimat (Chrome memotong ucapan > ±15 detik)', () => {
    expect(speechChunks('Halo. Apa kabar?')).toEqual(['Halo.', 'Apa kabar?']);
    const long = `${'kata '.repeat(60)}akhir.`;
    const parts = speechChunks(long);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.length <= 180)).toBe(true);
    expect(parts.join(' ').replace(/\s+/g, ' ')).toBe(long.trim());
  });

  it('bahasa Indonesia tidak tersedia → dicoba ulang dengan suara bawaan perangkat', () => {
    behave = (u, n) => {
      if (n === 1) u.onerror?.({ error: 'language-unavailable' });
      else {
        u.onstart?.();
        u.onend?.();
      }
    };
    const onEnd = vi.fn();
    speak('Dengarkan: tujuh belas', { onEnd });
    expect(spoken).toHaveLength(2);
    expect(spoken[0]!.lang).toBe('id-ID');
    expect(spoken[1]!.lang).toBeUndefined();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('ucapan tidak pernah mulai → coba ulang; tetap gagal → event bantuan + onEnd', () => {
    behave = () => {}; // diam: tidak ada onstart/onend
    const trouble = vi.fn();
    window.addEventListener(SPEECH_TROUBLE, trouble);
    const onEnd = vi.fn();
    speak('Tulis bilangan yang kamu dengar: dua puluh', { onEnd });
    expect(spoken).toHaveLength(1);
    vi.advanceTimersByTime(2000);
    expect(spoken).toHaveLength(2);
    vi.advanceTimersByTime(2000);
    expect(trouble).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
    window.removeEventListener(SPEECH_TROUBLE, trouble);
  });

  it('mesin suara sibuk → jeda singkat sebelum bicara; mesin "tertidur" → resume()', () => {
    synthState.speaking = true;
    synthState.paused = true;
    speak('Satu');
    expect(spoken).toHaveLength(0);
    synthState.speaking = false;
    vi.advanceTimersByTime(100);
    expect(spoken.map((u) => u.text)).toEqual(['Satu']);
    expect(resumed).toBe(1);
  });

  it('Chrome menolak suara sebelum ada ketukan (not-allowed) → event "ketuk speaker", tanpa coba ulang (D-047)', () => {
    behave = (u) => u.onerror?.({ error: 'not-allowed' });
    const blocked = vi.fn();
    const trouble = vi.fn();
    window.addEventListener(SPEECH_BLOCKED, blocked);
    window.addEventListener(SPEECH_TROUBLE, trouble);
    const onEnd = vi.fn();
    speak('Ketuk angka dua.', { onEnd });
    vi.advanceTimersByTime(5000);
    expect(spoken).toHaveLength(1);
    expect(blocked).toHaveBeenCalledTimes(1);
    expect(trouble).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledTimes(1);
    window.removeEventListener(SPEECH_BLOCKED, blocked);
    window.removeEventListener(SPEECH_TROUBLE, trouble);
  });

  it('browser tanpa speechSynthesis → event bantuan (layar soal menampilkan teks untuk dibacakan)', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    // `'speechSynthesis' in window` tetap true bila hanya di-undefined-kan: hapus propertinya.
    delete (window as unknown as Record<string, unknown>).speechSynthesis;
    const trouble = vi.fn();
    window.addEventListener(SPEECH_TROUBLE, trouble);
    const onEnd = vi.fn();
    speak('Halo', { onEnd });
    expect(trouble).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
    window.removeEventListener(SPEECH_TROUBLE, trouble);
  });

  it('iPhone/iPad: ketukan pertama membuka kunci suara (ucapan senyap), hanya sekali', () => {
    behave = () => {};
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
    installAudioUnlock();
    window.dispatchEvent(new Event('pointerdown'));
    window.dispatchEvent(new Event('pointerdown'));
    expect(spoken).toHaveLength(1);
    expect(spoken[0]!.volume).toBe(0);
    expect(audioReady()).toBe(true);
    // Klip audio (suara Momo) juga dibuka kuncinya dengan audio senyap.
    expect(audioPlays).toEqual([0]);
  });
});
