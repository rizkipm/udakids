import { API_URL } from '../config/app';

/**
 * Suara Momo & soal. Perintah soal & respons jawaban memakai klip suara Momo (D-035, di bawah);
 * selebihnya dan sebagai cadangan: TTS browser id-ID (PRD A3). Aman bila speechSynthesis/Audio tidak
 * ada (mis. jsdom / browser lama): diam saja.
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
  stopAudio();
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
  stopAudio();
}

export const speechAvailable = () => synth() !== undefined;

// ---------------------------------------------------------------- suara Momo (D-035)

/**
 * Suara Momo: klip MP3 yang dibuat sekali di server (Google Cloud TTS) lalu di-cache selamanya
 * (`Cache-Control: immutable`). Hanya PERINTAH soal & RESPONS jawaban (kunci dialog `vo_*`), serta
 * kalimat soal tingkat Basic. Bila klip belum ada, suara mati, atau offline → suara browser.
 */
type VoiceManifest = {
  enabled: boolean;
  rev: string;
  lines: Record<string, { text: string; clip: string | null }>;
};

const MANIFEST_KEY = 'lc.voice';
/** Bila klip belum mulai terdengar dalam waktu ini (mis. sedang dibuat), pakai suara browser. */
const CLIP_START_MS = 2500;

function readManifest(): VoiceManifest | undefined {
  try {
    const raw = localStorage.getItem(MANIFEST_KEY);
    return raw ? (JSON.parse(raw) as VoiceManifest) : undefined;
  } catch {
    return undefined;
  }
}

let manifest: VoiceManifest | undefined = readManifest();
let audio: HTMLAudioElement | undefined;
let loading: Promise<void> | undefined;

/** Muat daftar kalimat suara Momo (sekali per sesi; salinan disimpan untuk offline). */
export function loadVoice(base = API_URL): Promise<void> {
  loading ??= fetch(`${base}/voice/lines`)
    .then((r) => (r.ok ? (r.json() as Promise<VoiceManifest>) : undefined))
    .then((m) => {
      if (!m) return;
      manifest = m;
      try {
        localStorage.setItem(MANIFEST_KEY, JSON.stringify(m));
      } catch {
        /* abaikan */
      }
    })
    .catch(() => undefined);
  return loading;
}

/** Hanya untuk test. */
export function resetVoice(m?: VoiceManifest) {
  manifest = m;
  loading = undefined;
  audio = undefined;
}

const canPlayAudio = () => typeof Audio !== 'undefined';

function stopAudio() {
  if (!audio) return;
  audio.onended = null;
  audio.onerror = null;
  audio.pause();
  audio = undefined;
}

function playClip(url: string, fallbackText: string, onEnd?: () => void) {
  stopSpeaking();
  const a = new Audio(url);
  audio = a;
  let started = false;
  let done = false;
  const fallback = () => {
    if (done || audio !== a) return;
    done = true;
    stopAudio();
    speak(fallbackText, { onEnd });
  };
  const timer = setTimeout(() => !started && fallback(), CLIP_START_MS);
  a.onplaying = () => {
    started = true;
    clearTimeout(timer);
  };
  a.onended = () => {
    done = true;
    clearTimeout(timer);
    if (audio === a) audio = undefined;
    onEnd?.();
  };
  a.onerror = () => {
    clearTimeout(timer);
    fallback();
  };
  void a.play()?.catch(() => {
    clearTimeout(timer);
    fallback();
  });
}

/** Ucapkan kalimat Momo berdasarkan kunci dialog (`vo_cmd_pick_one`, `vo_right_1`, …). */
export function speakLine(key: string, fallbackText: string, opts: { onEnd?: () => void } = {}) {
  const line = manifest?.lines[key];
  const text = line?.text ?? fallbackText;
  if (enabled && manifest?.enabled && line?.clip && canPlayAudio()) {
    playClip(`${API_URL}/voice/clip/${line.clip}`, text, opts.onEnd);
    return;
  }
  speak(text, opts);
}

/** URL suara Momo untuk kalimat soal Basic (dibuat server dari skill + seed, lalu di-cache). */
export const itemVoiceUrl = (
  item: { skillId: string; seed: number; band: number },
  part: 'prompt' | 'reteach' = 'prompt',
) =>
  `${API_URL}/voice/item/${encodeURIComponent(item.skillId)}?seed=${item.seed}&band=${item.band}&part=${part}&v=${manifest?.rev ?? '0'}`;

/** Ucapkan kalimat soal Basic dengan suara Momo (cadangan: suara browser). */
export function speakItem(
  item: { skillId: string; seed: number; band: number },
  text: string,
  part: 'prompt' | 'reteach' = 'prompt',
  opts: { onEnd?: () => void } = {},
) {
  if (enabled && manifest?.enabled && canPlayAudio()) {
    playClip(itemVoiceUrl(item, part), text, opts.onEnd);
    return;
  }
  speak(text, opts);
}

/** Siapkan suara soal berikutnya di latar (server membuatnya bila belum ada; browser menyimpannya). */
export function prefetchItemVoice(item: { skillId: string; seed: number; band: number }) {
  if (!manifest?.enabled || typeof fetch === 'undefined') return;
  void fetch(itemVoiceUrl(item), { priority: 'low' } as RequestInit).catch(() => undefined);
}
