import {
  langSegments,
  speechSegments,
  voiceLangFor,
  type Item,
  type VoiceLang,
} from '@little-coder/engine';
import { API_URL } from '../config/app';

/**
 * Suara Momo & soal. SEMUA kalimat memakai klip suara server Chirp 3 HD (D-091): kalimat Momo, soal,
 * pembahasan, kartu, pelajaran, dan teks antarmuka (`speak` → `/voice/say`). Suara bawaan browser TIDAK dipakai
 * sama sekali (D-106): di banyak perangkat suaranya English/Melayu dan tidak jelas. Bila klip tidak bisa diputar,
 * Momo diam dan layar soal menampilkan teksnya. Aman bila Audio tidak ada (mis. jsdom / browser lama): diam saja.
 */
let enabled = true;

export const setSpeechEnabled = (on: boolean) => {
  enabled = on;
  if (!on) stopSpeaking();
};

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

type SpeakOpts = {
  onEnd?: () => void;
  /** Lama: kecepatan suara browser. Diabaikan sejak D-106 (hanya Chirp). */
  rate?: number;
  /** Satu bahasa untuk seluruh teks. */
  lang?: VoiceLang;
  /** Tanpa `lang`: bahasa untuk kalimat yang bahasanya tak pasti (D-098). */
  baseLang?: VoiceLang;
};

/**
 * Ucapkan teks dengan suara Chirp dari server (D-091); memanggil `onEnd` saat selesai (atau segera bila suara
 * tidak tersedia). Konteks soal/pelajaran yang sedang tampil ikut dikirim supaya server bisa memastikan teksnya
 * berasal dari aplikasi.
 */
export function speak(text: string, opts: SpeakOpts = {}) {
  if (!enabled || !text) {
    opts.onEnd?.();
    return;
  }
  // Daftar suara belum dimuat (kalimat pertama di halaman, atau halaman di luar area anak): muat dulu, tunggu
  // sebentar, lalu putar suara server — bukan langsung suara browser (D-091).
  if (!manifest && canPlayAudio() && isOnline()) {
    const token = ++waitSeq;
    void Promise.race([loadVoice(), new Promise((r) => setTimeout(r, VOICE_WAIT_MS))]).then(() => {
      if (token === waitSeq) speakNow(text, opts);
    });
    return;
  }
  speakNow(text, opts);
}

/** Batas menunggu daftar suara dimuat sebelum kalimat pertama diucapkan. */
const VOICE_WAIT_MS = 1500;
let waitSeq = 0;
const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

function speakNow(text: string, opts: SpeakOpts) {
  if (!chirpOn()) {
    // Tanpa Chirp (server tanpa kunci suara / perangkat tanpa Audio): diam, layar menampilkan teksnya (D-106).
    reportTrouble(text);
    opts.onEnd?.();
    return;
  }
  // D-098: kalimat demi kalimat dengan suara sesuai bahasanya (teks campuran seperti "Hari ini kita belajar
  // Prepositions. We use …" tidak dibacakan satu suara), dan teks panjang dipecah agar tetap ≤ batas server.
  const parts = opts.lang
    ? speechSegments(text).map((t) => ({ text: t, lang: opts.lang! }))
    : langSegments(text, opts.baseLang);
  const token = ++chainSeq;
  const play = (k: number) => {
    if (token !== chainSeq) return;
    const p = parts[k];
    if (!p) return opts.onEnd?.();
    playClip(sayUrl(p.text, p.lang), p.text, () => play(k + 1), p.lang);
  };
  play(0);
}

/** Rangkaian kalimat yang sedang diputar; dinaikkan saat berhenti agar sisa rangkaian tidak lanjut. */
let chainSeq = 0;

export function stopSpeaking(keepChain = false) {
  waitSeq++;
  if (keepChain !== true) chainSeq++;
  stopAudio();
}

/** Perangkat bisa memutar klip suara (elemen Audio). */
export const speechAvailable = () => canPlayAudio();

/**
 * iOS/iPadOS (semua browser di iPhone/iPad) dan sebagian Android hanya mengizinkan suara setelah ada
 * ketukan pengguna. Suara soal pertama diputar otomatis (bukan dari ketukan) → diblokir dan soal tidak
 * terdengar. Pasang sekali: ketukan/tombol pertama "membuka kunci" audio klip.
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
  // Audio senyap di dalam ketukan = izin memutar klip suara untuk halaman ini.
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
 * kalimat soal tingkat Basic. Bila klip belum ada atau gagal → dicoba ulang sekali, lalu diam (D-106).
 */
type VoiceManifest = {
  enabled: boolean;
  rev: string;
  lines: Record<string, { text: string; clip: string | null }>;
};

const MANIFEST_KEY = 'lc.voice';
/**
 * Bila klip belum mulai terdengar dalam waktu ini, dicoba ulang sekali. Klip yang belum pernah dibuat perlu
 * dibuat server dulu (±1–3 detik), jadi waktunya cukup longgar (D-091).
 */
const CLIP_START_MS = 6000;
/** Percobaan kedua menunggu lebih lama (jaringan lambat). */
const CLIP_RETRY_MS = 12000;

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

function playClip(
  url: string,
  fallbackText: string,
  onEnd?: () => void,
  lang?: VoiceLang,
  retry = true,
) {
  // Klip berikutnya dalam rangkaian kalimat (D-098) tidak memutus rangkaiannya sendiri.
  stopSpeaking(true);
  const a = new Audio(url);
  audio = a;
  let started = false;
  let done = false;
  const fallback = (blocked = false) => {
    if (done || audio !== a) return;
    done = true;
    stopAudio();
    // D-098, D-106: hanya Chirp. Coba ulang sekali (klip baru bisa butuh waktu dibuat); bila tetap gagal, Momo diam
    // dan layar soal menampilkan teksnya — tanpa suara browser (yang di sebagian HP bersuara Melayu/English).
    if (blocked) {
      reportBlocked(fallbackText);
      onEnd?.();
    } else if (retry)
      playClip(`${url}${url.includes('?') ? '&' : '?'}r=1`, fallbackText, onEnd, lang, false);
    else {
      reportTrouble(fallbackText);
      onEnd?.();
    }
  };
  const timer = setTimeout(() => !started && fallback(), retry ? CLIP_START_MS : CLIP_RETRY_MS);
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
  void a.play()?.catch((e: unknown) => {
    clearTimeout(timer);
    // Browser menolak audio sebelum ada ketukan: minta anak mengetuk speaker, bukan ganti suara.
    fallback((e as { name?: string } | undefined)?.name === 'NotAllowedError');
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
  part: 'prompt' | 'reteach' | 'choice' = 'prompt',
  choiceId?: string,
) =>
  `${API_URL}/voice/item/${encodeURIComponent(item.skillId)}?seed=${item.seed}&band=${item.band}&part=${part}${choiceId ? `&c=${encodeURIComponent(choiceId)}` : ''}&v=${manifest?.rev ?? '0'}`;

/** Ucapkan kalimat soal Basic dengan suara Momo (Chirp). */
export function speakItem(
  item: { skillId: string; seed: number; band: number },
  text: string,
  part: 'prompt' | 'reteach' = 'prompt',
  opts: { onEnd?: () => void } = {},
) {
  // Bahasa mengikuti kalimatnya (D-098): penjelasan Indonesia di buku English tidak dibacakan suara English.
  const lang = voiceLangFor(item.skillId, part, text);
  // Buku English: per kalimat dengan suara sesuai bahasanya (soal/pembahasan sering campur Indonesia & English).
  if (enabled && chirpOn() && item.skillId.startsWith('english.')) {
    speak(text, { ...opts, baseLang: lang });
    return;
  }
  if (enabled && chirpOn()) {
    playClip(itemVoiceUrl(item, part), text, opts.onEnd, lang);
    return;
  }
  speak(text, { ...opts, lang });
}

/** Pelajaran di katalog (D-088): buku + kode topik; kalimatnya diminta lewat kunci `lessonVoiceLines`. */
export type LessonVoiceRef = { domain: string; grade: string; code: string };

/** URL suara Chirp untuk satu kalimat pelajaran (teks diambil server dari pelajaran, bukan dari perangkat). */
export const lessonVoiceUrl = (ref: LessonVoiceRef, key: string) =>
  `${API_URL}/voice/lesson/${ref.domain}/${ref.grade}/${ref.code}?k=${encodeURIComponent(key)}&v=${manifest?.rev ?? '0'}`;

/**
 * Ucapkan kalimat pelajaran dengan suara Chirp (D-088, D-091). Lewat `speak` dengan konteks pelajaran yang sedang
 * dibuka: server mengenali semua kalimat pelajaran manual maupun otomatis (D-090), jadi tidak bergantung pada
 * nomor layar. `ref`/`key` tetap diterima untuk pemanggil lama.
 */
export function speakLesson(
  _ref: LessonVoiceRef | undefined,
  _key: string | undefined,
  text: string,
  opts: { onEnd?: () => void } = {},
) {
  speak(text, opts);
}

/** Kartu semua mata pelajaran diucapkan suara Chirp dari server (D-091; English sejak D-062). */
const usesCardClips = (_skillId: string) => true;

/** Ucapkan kata pada kartu pilihan saat diketuk. */
export function speakChoice(
  item: { skillId: string; seed: number; band: number } | undefined,
  choice: { id: string; say?: string },
) {
  if (!choice.say) return;
  const lang = item ? voiceLangFor(item.skillId, 'choice', choice.say) : 'id-ID';
  // Soal lomba ('contest') tidak punya skill/seed di perangkat: lewat `speak` dengan konteks lomba.
  if (item && item.skillId !== 'contest' && usesCardClips(item.skillId) && enabled && chirpOn()) {
    playClip(itemVoiceUrl(item, 'choice', choice.id), choice.say, undefined, lang);
    return;
  }
  // Tanpa id soal (mis. pratinjau, lomba): lewat `speak` (Chirp dengan konteks).
  speak(choice.say, { lang, ...(lang === 'en-GB' && { rate: 0.8 }) });
}

/** Kartu bersuara di soal (pilihan, kelompok, pasangan). */
const voicedCards = (item: Partial<Pick<Item, 'interaction'>>) => {
  const it = item.interaction;
  if (!it) return [];
  const cards =
    it.type === 'pick-one' || it.type === 'tap-all' || it.type === 'order'
      ? it.choices
      : it.type === 'group'
        ? [...it.groups, ...it.items]
        : it.type === 'match'
          ? [...it.left, ...it.right]
          : it.type === 'sort'
            ? [...it.bins, ...it.items]
            : it.type === 'sum'
              ? it.tokens
              : it.type === 'crossword'
                ? it.letters
                : it.type === 'chart'
                  ? it.bars
                  : it.type === 'magic'
                    ? it.facts.flatMap((f) => f.choices)
                    : it.type === 'stack'
                      ? it.blocks
                      : it.type === 'bingo'
                        ? it.cells
                        : it.type === 'chance'
                          ? [...it.outcomes, ...it.fractions]
                          : it.type === 'coord'
                            ? it.steps.map((st) => ({
                                id: st.id,
                                visual: { kind: 'blank' as const },
                                say: st.say,
                              }))
                            : [];
  return cards.filter((c) => c.say);
};

/** Siapkan suara soal berikutnya di latar (server membuatnya bila belum ada; browser menyimpannya). */
export function prefetchItemVoice(
  item: { skillId: string; seed: number; band: number } & Partial<Pick<Item, 'interaction'>>,
) {
  if (!manifest?.enabled || typeof fetch === 'undefined') return;
  const get = (url: string) =>
    void fetch(url, { priority: 'low' } as RequestInit).catch(() => undefined);
  get(itemVoiceUrl(item));
  // Kartu juga disiapkan (maks. 6), supaya kata langsung terdengar saat diketuk.
  const cards = voicedCards(item);
  if (usesCardClips(item.skillId) && cards.length <= 6)
    for (const c of cards) get(itemVoiceUrl(item, 'choice', c.id));
}

// ---------------------------------------------------------------- semua teks lewat Chirp (D-091)

type ItemRef = { skillId: string; seed: number; band: number };
const itemStack: ItemRef[] = [];
const lessonStack: LessonVoiceRef[] = [];
type ContestRef = { entryId: string; index: number };
const contestStack: ContestRef[] = [];

const pushTo = <T>(stack: T[], ref: T) => {
  stack.push(ref);
  return () => {
    const i = stack.lastIndexOf(ref);
    if (i >= 0) stack.splice(i, 1);
  };
};

/** Soal yang sedang tampil (ItemPlayer): kalimat soal/kartu/game boleh dibuatkan suara. Kembalikan "lepas". */
export const pushVoiceItem = (ref: ItemRef) => pushTo(itemStack, ref);
/** Pelajaran yang sedang dibuka (D-090): kalimat pelajaran manual/otomatis boleh dibuatkan suara. */
export const pushVoiceLesson = (ref: LessonVoiceRef) => pushTo(lessonStack, ref);

/** Soal lomba live yang sedang tampil (tanpa skill/seed di perangkat): server mencocokkan dari soal peserta. */
export const pushVoiceContest = (ref: ContestRef) => pushTo(contestStack, ref);

/** URL klip Chirp untuk teks dari aplikasi + konteks yang sedang aktif. */
export function sayUrl(text: string, lang: VoiceLang = 'id-ID') {
  const item = itemStack.at(-1);
  const lesson = lessonStack.at(-1);
  const q = new URLSearchParams({ t: text.replace(/\s+/g, ' ').trim().slice(0, 600) });
  if (lang !== 'id-ID') q.set('l', lang);
  if (item) q.set('i', `${item.skillId}~${item.seed}~${item.band}`);
  if (lesson) q.set('s', `${lesson.domain}~${lesson.grade}~${lesson.code}`);
  const contest = contestStack.at(-1);
  if (contest) q.set('c', `${contest.entryId}~${contest.index}`);
  q.set('v', manifest?.rev ?? '0');
  return `${API_URL}/voice/say?${q.toString()}`;
}

/**
 * Pakai suara Chirp dari server? (D-098) Ya, kecuali server memang tanpa suara Chirp (`enabled: false`, mis.
 * pengembangan tanpa kunci) atau perangkat tidak bisa memutar audio — maka diam (D-106). Juga saat offline: klip
 * yang pernah diputar ada di cache browser.
 */
function chirpOn() {
  return manifest?.enabled !== false && canPlayAudio();
}
