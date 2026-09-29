/**
 * Suara Momo & soal. Rekaman (Howler, per audioKey) menyusul; sekarang cadangan TTS browser id-ID
 * (PRD A3). Aman bila speechSynthesis tidak ada (mis. jsdom / browser lama): diam saja.
 */
let enabled = true;

export const setSpeechEnabled = (on: boolean) => {
  enabled = on;
  if (!on) stopSpeaking();
};

function synth(): SpeechSynthesis | undefined {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : undefined;
}

function voiceId(): SpeechSynthesisVoice | undefined {
  const voices = synth()?.getVoices() ?? [];
  return voices.find((v) => v.lang === 'id-ID') ?? voices.find((v) => v.lang.startsWith('id'));
}

/** Ucapkan teks; memanggil `onEnd` saat selesai (atau segera bila suara tidak tersedia). */
export function speak(text: string, opts: { onEnd?: () => void; rate?: number } = {}) {
  const s = synth();
  if (!s || !enabled || !text) {
    opts.onEnd?.();
    return;
  }
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'id-ID';
  u.rate = opts.rate ?? 0.9;
  u.pitch = 1.1;
  const voice = voiceId();
  if (voice) u.voice = voice;
  if (opts.onEnd) {
    u.onend = () => opts.onEnd?.();
    u.onerror = () => opts.onEnd?.();
  }
  s.speak(u);
}

export function stopSpeaking() {
  synth()?.cancel();
}

export const speechAvailable = () => synth() !== undefined;
