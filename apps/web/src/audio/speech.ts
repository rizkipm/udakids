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

// Daftar suara dimuat asinkron di banyak browser (Chrome/Android): simpan & segarkan saat berubah.
let voices: SpeechSynthesisVoice[] = [];
function refreshVoices() {
  try {
    voices = synth()?.getVoices() ?? [];
  } catch {
    voices = [];
  }
}
refreshVoices();
synth()?.addEventListener?.('voiceschanged', refreshVoices);

/** Suara Indonesia (lokal dulu), lalu Melayu yang mirip; undefined = suara bawaan perangkat. */
function pickVoice(): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) refreshVoices();
  const by = (f: (v: SpeechSynthesisVoice) => boolean) =>
    voices.find((v) => f(v) && v.localService) ?? voices.find(f);
  return (
    by((v) => v.lang.replace('_', '-').toLowerCase() === 'id-id') ??
    by((v) => v.lang.toLowerCase().startsWith('id')) ??
    by((v) => v.lang.toLowerCase().startsWith('ms'))
  );
}

/**
 * Pecah teks panjang per kalimat (. ! ?, ≤ 180 huruf): Chrome memotong ucapan yang lebih dari ±15 detik.
 */
export function speechChunks(text: string, max = 180): string[] {
  // Tanpa lookbehind regex: tidak didukung Safari/iOS < 16.4 (akan merusak seluruh aplikasi).
  const parts = (
    text
      .replace(/\s+/g, ' ')
      .trim()
      .match(/[^.!?]+[.!?]*/g) ?? []
  ).map((p) => p.trim());
  const out: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    if (p.length <= max) {
      out.push(p);
      continue;
    }
    let rest = p;
    while (rest.length > max) {
      const cut = rest.lastIndexOf(' ', max);
      const at = cut > max / 2 ? cut : max;
      out.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}

/**
 * Pemberitahuan "suara tidak keluar" (mesin suara tidak ada / gagal walau sudah dicoba ulang), supaya
 * layar soal bisa menampilkan bantuan. Dikirim sebagai event `lc:speech-trouble` dengan teks yang gagal.
 */
export const SPEECH_TROUBLE = 'lc:speech-trouble';
/** Browser menolak suara karena belum ada ketukan di halaman ini (`not-allowed`). */
export const SPEECH_BLOCKED = 'lc:speech-blocked';
function reportBlocked(text: string) {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SPEECH_BLOCKED, { detail: { text } }));
}
function reportTrouble(text: string) {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SPEECH_TROUBLE, { detail: { text } }));
}

/** Referensi ucapan aktif: tanpa ini Chrome bisa membuangnya (GC) dan `onend` tidak pernah terpanggil. */
const keep: { list: SpeechSynthesisUtterance[] } = { list: [] };
let seq = 0;
/** Bila ucapan tidak mulai dalam waktu ini, coba ulang dengan suara bawaan perangkat. */
const START_TIMEOUT_MS = 1800;

/** Ucapkan teks; memanggil `onEnd` saat selesai (atau segera bila suara tidak tersedia). */
export function speak(text: string, opts: { onEnd?: () => void; rate?: number } = {}) {
  stopAudio();
  const s = synth();
  if (!enabled || !text) {
    opts.onEnd?.();
    return;
  }
  if (!s) {
    reportTrouble(text);
    opts.onEnd?.();
    return;
  }
  const token = ++seq;
  const busy = s.speaking || s.pending;
  s.cancel();
  const chunks = speechChunks(text);
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (token === seq) keep.list = [];
    opts.onEnd?.();
  };

  let attemptNo = 0;
  const start = (attempt: 0 | 1) => {
    if (token !== seq) return;
    const mine = ++attemptNo;
    const stale = () => token !== seq || mine !== attemptNo;
    let started = false;
    const voice = attempt === 0 ? pickVoice() : undefined;
    const list = chunks.map((c, i) => {
      const u = new SpeechSynthesisUtterance(c);
      // Percobaan kedua: tanpa bahasa/suara khusus → suara bawaan perangkat (lebih baik daripada diam).
      if (attempt === 0) {
        u.lang = voice?.lang.replace('_', '-') ?? 'id-ID';
        if (voice) u.voice = voice;
      }
      u.rate = opts.rate ?? 0.9;
      u.pitch = 1.1;
      u.onstart = () => {
        started = true;
      };
      u.onerror = (e) => {
        const err = (e as SpeechSynthesisErrorEvent).error;
        if (mine !== attemptNo) return; // ucapan percobaan lama yang dibatalkan
        if (token !== seq || err === 'interrupted' || err === 'canceled') return finish();
        // Belum ada ketukan di halaman ini: mencoba ulang percuma — minta anak mengetuk speaker.
        if (err === 'not-allowed') {
          reportBlocked(text);
          return finish();
        }
        if (!started && attempt === 0) {
          s.cancel();
          start(1);
        } else {
          reportTrouble(text);
          finish();
        }
      };
      if (i === chunks.length - 1) u.onend = finish;
      return u;
    });
    keep.list = list;
    // Chrome Android kadang "tertidur" (paused) setelah tab berpindah.
    if (s.paused) s.resume();
    for (const u of list) {
      if (stale()) break; // percobaan ini sudah diganti (mis. dicoba ulang tanpa suara Indonesia)
      s.speak(u);
    }
    setTimeout(() => {
      if (stale() || finished || started || s.speaking) return;
      if (attempt === 0) {
        s.cancel();
        start(1);
      } else {
        reportTrouble(text);
        finish();
      }
    }, START_TIMEOUT_MS);
  };

  // cancel() lalu speak() seketika kadang membuat ucapan baru hilang (Chrome): beri jeda singkat.
  if (busy) setTimeout(() => start(0), 80);
  else start(0);
}

export function stopSpeaking() {
  seq++;
  keep.list = [];
  synth()?.cancel();
  stopAudio();
}

export const speechAvailable = () => synth() !== undefined;

/**
 * iOS/iPadOS (semua browser di iPhone/iPad) dan sebagian Android hanya mengizinkan suara setelah ada
 * ketukan pengguna. Suara soal pertama diputar otomatis (bukan dari ketukan) → diblokir dan soal tidak
 * terdengar. Pasang sekali: ketukan/tombol pertama "membuka kunci" suara browser & audio klip.
 */
let unlocked = false;
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
export function installAudioUnlock() {
  if (typeof window === 'undefined' || unlocked) return;
  const events = ['pointerdown', 'touchend', 'keydown'] as const;
  const unlock = () => {
    for (const ev of events) window.removeEventListener(ev, unlock, true);
    unlockNow();
  };
  for (const ev of events) window.addEventListener(ev, unlock, { capture: true, passive: true });
}

/**
 * Buka kunci suara SEKARANG — harus dipanggil di dalam penanganan ketukan (mis. tombol "Mulai").
 * Aman dipanggil berkali-kali.
 */
export function unlockNow() {
  if (unlocked) return;
  unlocked = true;
  const s = synth();
  if (s) {
    try {
      if (s.paused) s.resume();
      // Ucapan kosong tanpa suara di dalam ketukan = izin suara untuk halaman ini.
      if (!s.speaking && !s.pending) {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        s.speak(u);
      }
    } catch {
      /* abaikan */
    }
  }
  if (canPlayAudio()) {
    try {
      const a = new Audio(SILENT_WAV);
      a.volume = 0;
      void a.play()?.catch(() => undefined);
    } catch {
      /* abaikan */
    }
  }
}

/**
 * Suara boleh diputar otomatis? Benar bila halaman ini sudah pernah diketuk. Saat soal dibuka langsung
 * lewat URL / dimuat ulang / aplikasi baru dibuka, browser menolak suara sampai ada ketukan (D-047).
 */
export function audioReady(): boolean {
  if (unlocked) return true;
  const ua =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
      : undefined;
  return ua?.hasBeenActive === true;
}

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
