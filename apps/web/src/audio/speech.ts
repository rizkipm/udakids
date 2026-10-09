import { speechText, voiceLangOf, type Item, type VoiceLang } from '@little-coder/engine';
import { API_URL } from '../config/app';

/**
 * Suara Momo & soal. SEMUA kalimat memakai klip suara server Chirp 3 HD (D-091): kalimat Momo, soal,
 * pembahasan, kartu, pelajaran, dan teks antarmuka (`speak` → `/voice/say`). Suara browser (TTS id-ID) hanya
 * cadangan terakhir: offline untuk kalimat yang belum pernah diputar, server/kunci suara tidak ada, atau klip
 * gagal. Aman bila speechSynthesis/Audio tidak ada (mis. jsdom / browser lama): diam saja.
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

/**
 * Suara perempuan dulu (D-062): suara Momo perempuan, dan suara pria bawaan perangkat (mis. "Daniel" en-GB di
 * iPad/Mac) terlalu berat untuk anak. Nama suara dari Apple, Google, dan Microsoft.
 */
const FEMALE_VOICE =
  /\b(female|woman|samantha|karen|moira|tessa|serena|kate|martha|fiona|victoria|allison|ava|susan|zira|hazel|libby|sonia|maisie|emma|amy|joanna|kimberly|salli|olivia|stephanie|catherine|damayanti|gadis|google bahasa indonesia|google uk english female|google us english)\b/i;
const MALE_VOICE =
  /\b(male|man|daniel|arthur|oliver|fred|alex|tom|aaron|rishi|george|ryan|thomas|guy|david|mark|james|brian|matthew|ardi|andika|reed|rocko|eddy|grandpa)\b/i;
/** 0 = perempuan dikenal, 1 = tidak diketahui, 2 = pria dikenal. */
const genderRank = (v: SpeechSynthesisVoice) =>
  FEMALE_VOICE.test(v.name) && !/\bmale\b/i.test(v.name) ? 0 : MALE_VOICE.test(v.name) ? 2 : 1;
const voiceRank = (v: SpeechSynthesisVoice) => genderRank(v) * 2 + (v.localService ? 0 : 1);
const isGB = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase() === 'en-gb';

/**
 * Suara Indonesia, lalu Melayu yang mirip; untuk kata English: perempuan dulu, lalu British (D-059). Di setiap
 * bahasa dipilih suara perempuan lebih dulu (D-062). undefined = suara bawaan perangkat.
 */
function pickVoice(lang: VoiceLang = 'id-ID'): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) refreshVoices();
  const by = (f: (v: SpeechSynthesisVoice) => boolean) =>
    voices.filter(f).sort((a, b) => voiceRank(a) - voiceRank(b))[0];
  if (lang === 'en-GB')
    // Kata Inggris: suara perempuan lebih penting daripada aksen; di antara yang setara, British lebih dulu.
    return voices
      .filter((v) => v.lang.toLowerCase().startsWith('en'))
      .sort(
        (a, b) =>
          genderRank(a) - genderRank(b) ||
          Number(!isGB(a)) - Number(!isGB(b)) ||
          Number(!a.localService) - Number(!b.localService),
      )[0];
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

type SpeakOpts = { onEnd?: () => void; rate?: number; lang?: VoiceLang };

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
  if (serverVoiceOn()) {
    playClip(sayUrl(text, opts.lang ?? 'id-ID'), text, opts.onEnd, opts.lang);
    return;
  }
  browserSpeak(text, opts);
}

/** Suara browser (cadangan terakhir, D-091). */
function browserSpeak(text: string, opts: SpeakOpts = {}) {
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
  // Naskah ucapan (D-087): simbol, titik-titik, Rp, satuan → kata, sama seperti suara server.
  const chunks = speechChunks(speechText(text, opts.lang ?? 'id-ID'));
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
    const voice = attempt === 0 ? pickVoice(opts.lang) : undefined;
    const list = chunks.map((c, i) => {
      const u = new SpeechSynthesisUtterance(c);
      // Percobaan kedua: tanpa bahasa/suara khusus → suara bawaan perangkat (lebih baik daripada diam).
      if (attempt === 0) {
        u.lang = voice?.lang.replace('_', '-') ?? opts.lang ?? 'id-ID';
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
/**
 * Bila klip belum mulai terdengar dalam waktu ini, pakai suara browser. Klip yang belum pernah dibuat perlu
 * dibuat server dulu (±1–3 detik), jadi waktunya cukup longgar (D-091).
 */
const CLIP_START_MS = 6000;

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
  voices = [];
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

function playClip(url: string, fallbackText: string, onEnd?: () => void, lang?: VoiceLang) {
  stopSpeaking();
  const a = new Audio(url);
  audio = a;
  let started = false;
  let done = false;
  const fallback = () => {
    if (done || audio !== a) return;
    done = true;
    stopAudio();
    browserSpeak(fallbackText, { onEnd, lang });
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
  part: 'prompt' | 'reteach' | 'choice' = 'prompt',
  choiceId?: string,
) =>
  `${API_URL}/voice/item/${encodeURIComponent(item.skillId)}?seed=${item.seed}&band=${item.band}&part=${part}${choiceId ? `&c=${encodeURIComponent(choiceId)}` : ''}&v=${manifest?.rev ?? '0'}`;

/** Ucapkan kalimat soal Basic dengan suara Momo (cadangan: suara browser). */
export function speakItem(
  item: { skillId: string; seed: number; band: number },
  text: string,
  part: 'prompt' | 'reteach' = 'prompt',
  opts: { onEnd?: () => void } = {},
) {
  const lang = voiceLangOf(item.skillId, part);
  if (enabled && manifest?.enabled && canPlayAudio()) {
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
  const lang = item ? voiceLangOf(item.skillId, 'choice') : 'id-ID';
  // Soal lomba ('contest') tidak punya skill/seed di perangkat: lewat `speak` dengan konteks lomba.
  if (
    item &&
    item.skillId !== 'contest' &&
    usesCardClips(item.skillId) &&
    enabled &&
    manifest?.enabled &&
    canPlayAudio()
  ) {
    playClip(itemVoiceUrl(item, 'choice', choice.id), choice.say, undefined, lang);
    return;
  }
  // Tanpa id soal (mis. pratinjau): lewat `speak` (Chirp dengan konteks; cadangan suara perangkat lebih pelan).
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

/** Suara server bisa dipakai sekarang? (kunci suara aktif, perangkat bisa memutar audio, dan online). */
function serverVoiceOn() {
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  return !!manifest?.enabled && canPlayAudio() && online;
}
