import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  itemVoiceUrl,
  loadVoice,
  pushVoiceContest,
  pushVoiceItem,
  pushVoiceLesson,
  resetVoice,
  sayUrl,
  speak,
  speakItem,
  speakLine,
  stopSpeaking,
} from '../../src/audio/speech';
import { SPEECH_TROUBLE } from '../../src/audio/speech';
import { langSegments, speechSegments } from '@little-coder/engine';

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
  it('kalimat dengan klip → putar klip Momo; tanpa klip → suara Chirp lewat /voice/say (D-091)', () => {
    resetVoice(manifest);
    speakLine('vo_cmd_pick_one', 'cadangan');
    expect(played).toHaveLength(1);
    expect(played[0]).toMatch(new RegExp(`/voice/clip/${'a'.repeat(64)}$`));
    expect(spoken).toEqual([]);
    speakLine('vo_right_1', 'cadangan');
    // Teks dari dialog (bisa disunting admin), dibuatkan suara server — bukan suara browser.
    expect(played.at(-1)).toContain('/voice/say?t=Tepat%21');
    speakLine('vo_tidak_ada', 'Teks cadangan');
    expect(played.at(-1)).toContain('/voice/say?t=Teks+cadangan');
    expect(spoken).toEqual([]);
  });

  it('semua teks lewat suara server dengan konteks soal/pelajaran/lomba yang sedang tampil (D-091)', () => {
    resetVoice(manifest);
    const pop = pushVoiceItem({ skillId: 'math.prek.a1.x', seed: 4, band: 1 });
    const popL = pushVoiceLesson({ domain: 'sains', grade: 'tk', code: 'B' });
    const popC = pushVoiceContest({
      entryId: '0'.repeat(8) + '-0000-0000-0000-' + '0'.repeat(12),
      index: 2,
    });
    speak('Ayo coba!');
    const url = new URL(played.at(-1)!, 'http://x');
    expect(url.pathname).toMatch(/\/voice\/say$/);
    expect(url.searchParams.get('t')).toBe('Ayo coba!');
    expect(url.searchParams.get('i')).toBe('math.prek.a1.x~4~1');
    expect(url.searchParams.get('s')).toBe('sains~tk~B');
    expect(url.searchParams.get('c')).toMatch(/~2$/);
    popC();
    popL();
    pop();
    expect(sayUrl('Halo')).not.toContain('&i=');
    expect(spoken).toEqual([]);
  });

  it('suara Momo dimatikan admin → Momo diam (layar menampilkan teks), tanpa suara browser (D-106)', () => {
    resetVoice({ enabled: false, rev: 'r0', lines: {} });
    const trouble = vi.fn();
    window.addEventListener(SPEECH_TROUBLE, trouble);
    speakLine('vo_cmd_pick_one', 'Pilih satu.');
    speakItem({ skillId: 'math.prek.a1.x', seed: 3, band: 0 }, 'Ketuk lingkaran.');
    expect(played).toEqual([]);
    expect(spoken).toEqual([]);
    expect(trouble).toHaveBeenCalledTimes(2);
    window.removeEventListener(SPEECH_TROUBLE, trouble);
  });

  it('daftar suara belum dimuat → dimuat dulu, lalu klip server (D-091)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => manifest })),
    );
    speak('Ayo mulai!');
    expect(played).toEqual([]);
    expect(spoken).toEqual([]);
    await vi.waitFor(() => expect(played.at(-1)).toContain('/voice/say?t=Ayo+mulai%21'));
    expect(spoken).toEqual([]);
  });

  it('daftar suara gagal dimuat (server mati) → tetap mencoba Chirp, tanpa suara browser (D-098)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    speak('Ayo mulai!');
    await vi.waitFor(() => expect(played).toHaveLength(1), { timeout: 3000 });
    expect(played[0]).toContain('/voice/say?t=Ayo+mulai%21');
    expect(spoken).toEqual([]);
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

  it('klip gagal → dicoba ulang sekali; tetap gagal → teks bantuan, tanpa suara browser (D-098)', async () => {
    resetVoice(manifest);
    const trouble = vi.fn();
    window.addEventListener('lc:speech-trouble', trouble);
    vi.stubGlobal(
      'Audio',
      class extends FakeAudio {
        override play() {
          played.push(this.src);
          return Promise.reject(new Error('network'));
        }
      },
    );
    const onEnd = vi.fn();
    speakLine('vo_cmd_pick_one', 'cadangan', { onEnd });
    await vi.waitFor(() => expect(onEnd).toHaveBeenCalled());
    expect(played).toHaveLength(2);
    expect(played[1]).toMatch(/[?&]r=1$/);
    expect(trouble).toHaveBeenCalledTimes(1);
    expect(spoken).toEqual([]);
    window.removeEventListener('lc:speech-trouble', trouble);
  });

  it('browser menolak audio sebelum ketukan → minta ketuk speaker, tanpa suara browser', async () => {
    resetVoice(manifest);
    const blocked = vi.fn();
    window.addEventListener('lc:speech-blocked', blocked);
    vi.stubGlobal(
      'Audio',
      class extends FakeAudio {
        override play() {
          return Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' }));
        }
      },
    );
    speakLine('vo_cmd_pick_one', 'cadangan');
    await vi.waitFor(() => expect(blocked).toHaveBeenCalled());
    expect(spoken).toEqual([]);
    window.removeEventListener('lc:speech-blocked', blocked);
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

  it('teks campuran dibacakan per kalimat dengan suara sesuai bahasanya (D-098)', async () => {
    resetVoice(manifest);
    const text =
      'Halo, teman! Hari ini kita belajar Prepositions. We use prepositions of time (in, on, at), place, and direction correctly. Ingat: at 7 a.m., on Monday, in July.';
    expect(langSegments(text)).toEqual([
      { text: 'Halo, teman! Hari ini kita belajar Prepositions.', lang: 'id-ID' },
      {
        text: 'We use prepositions of time (in, on, at), place, and direction correctly.',
        lang: 'en-GB',
      },
      { text: 'Ingat:', lang: 'id-ID' },
      { text: 'at 7 a.m., on Monday, in July.', lang: 'en-GB' },
    ]);
    const onEnd = vi.fn();
    vi.stubGlobal(
      'Audio',
      class extends FakeAudio {
        override play() {
          played.push(this.src);
          queueMicrotask(() => this.onended?.());
          return Promise.resolve();
        }
      },
    );
    speak(text, { onEnd });
    await vi.waitFor(() => expect(onEnd).toHaveBeenCalled());
    expect(played).toHaveLength(4);
    expect(played[1]).toContain('l=en-GB');
    expect(played[0]).not.toContain('l=en-GB');
    expect(spoken).toEqual([]);
  });

  it('teks panjang dipecah ≤ 400 huruf per klip', () => {
    const long = Array.from(
      { length: 12 },
      (_, i) => `Kalimat panjang nomor ${i + 1} untuk diuji pemecahannya.`,
    ).join(' ');
    const parts = speechSegments(long);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.length <= 400)).toBe(true);
    expect(parts.join(' ')).toBe(long);
  });
});
