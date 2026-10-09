import { z } from 'zod';
import type { Choice, InteractionType, Item } from '../generator/item.js';
import { QUIZ_LENGTH } from '../scoring/quiz.js';

/**
 * Suara Momo (D-035): hanya PERINTAH soal dan RESPONS jawaban yang memakai suara Momo (file audio
 * yang dibuat sekali lalu di-cache). Kalimatnya ada di dialog (`content/dialog/momo.id.json`,
 * database `dialogs`) dengan kunci di bawah, jadi bisa disunting admin.
 *
 * - Kelas 1+: yang dibacakan hanya perintah per jenis interaksi, bukan seluruh soal.
 * - Basic (Pra-TK/TK): kalimat soal (mis. "Ketuk lingkaran.") dibacakan suara Momo yang dibuat saat
 *   pertama diputar, lalu disimpan (anak belum bisa membaca, PRD A14).
 */

export const COMMAND_KEYS = {
  'pick-one': 'vo_cmd_pick_one',
  'tap-all': 'vo_cmd_tap_all',
  order: 'vo_cmd_order',
  group: 'vo_cmd_group',
  match: 'vo_cmd_match',
  build: 'vo_cmd_build',
  'number-line': 'vo_cmd_number_line',
  'number-input': 'vo_cmd_number_input',
  trace: 'vo_cmd_trace',
  connect: 'vo_cmd_connect',
  spell: 'vo_cmd_spell',
  maze: 'vo_cmd_maze',
  'word-search': 'vo_cmd_word_search',
  memory: 'vo_cmd_memory',
  catch: 'vo_cmd_catch',
  sum: 'vo_cmd_sum',
  hop: 'vo_cmd_hop',
  sort: 'vo_cmd_sort',
  crossword: 'vo_cmd_crossword',
  jigsaw: 'vo_cmd_jigsaw',
} as const satisfies Record<InteractionType, string>;

export const RIGHT_KEYS = [
  'vo_right_1',
  'vo_right_2',
  'vo_right_3',
  'vo_right_4',
  'vo_right_5',
] as const;
export const WRONG_KEYS = ['vo_wrong_1', 'vo_wrong_2', 'vo_wrong_3'] as const;
/** Skor ronde 0, 10, …, 100. */
export const SCORE_KEYS = Array.from({ length: QUIZ_LENGTH + 1 }, (_, i) => `vo_score_${i * 10}`);
export const RESULT_KEYS = {
  passed: 'vo_passed',
  passedLast: 'vo_passed_last',
  retry: 'vo_retry',
  locked: 'vo_locked',
  paid: 'vo_paid',
} as const;

/** Semua kunci yang wajib ada di dialog (dicek validator konten). */
export const VOICE_LINE_KEYS: readonly string[] = [
  ...Object.values(COMMAND_KEYS),
  ...RIGHT_KEYS,
  ...WRONG_KEYS,
  ...SCORE_KEYS,
  ...Object.values(RESULT_KEYS),
];

export const commandKey = (item: Pick<Item, 'interaction'>) => COMMAND_KEYS[item.interaction.type];
export const scoreKey = (score: number) =>
  `vo_score_${Math.max(0, Math.min(100, Math.round(score / 10) * 10))}`;

/**
 * Soal "dengar" (dikte, mis. "Dengarkan, lalu tulis angkanya" + say "Tulis angka dua puluh tiga"): isi soalnya
 * hanya ada di kalimat yang diucapkan, jadi harus dibacakan lengkap di SEMUA jenjang (D-043).
 */
export const isListeningItem = (item: Pick<Item, 'prompt' | 'say'>) =>
  !!item.say && item.say.trim() !== item.prompt.trim();

/**
 * Soal yang isinya HANYA ada di suara (mis. "Ketuk angka yang kamu dengar." → diucapkan "Ketuk angka dua.").
 * Layar soal selalu menyediakan petunjuk tertulis untuk dibacakan orang dewasa (D-047), supaya anak tidak
 * buntu bila suara perangkat tidak keluar.
 */
export const isAudioOnlyItem = (item: Pick<Item, 'prompt' | 'say'>) =>
  isListeningItem(item) && /\b(dengar|hear|listen)/i.test(item.prompt);

/** Kalimat soal perlu dibacakan lengkap (Basic, atau soal dengar di jenjang mana pun)? */
export const speaksFullPrompt = (
  item: Pick<Item, 'prompt' | 'say'>,
  tier: 'basic' | 'intermediate' | 'advanced',
) => tier === 'basic' || isListeningItem(item);

/** Yang diucapkan saat soal muncul: kalimat soal (Basic / soal dengar) atau perintah (kelas 1+). */
export type SpokenPrompt = { kind: 'item'; text: string } | { kind: 'line'; key: string };
export function spokenPrompt(
  item: Item,
  tier: 'basic' | 'intermediate' | 'advanced',
): SpokenPrompt {
  return speaksFullPrompt(item, tier)
    ? { kind: 'item', text: item.say ?? item.prompt }
    : { kind: 'line', key: commandKey(item) };
}

/**
 * Bagian soal Basic yang boleh dibuatkan suara on-demand (server memeriksa ulang dari skill+seed).
 * `choice` = kata/huruf pada kartu pilihan (buku English, D-062), dipilih dengan id kartu.
 */
export const VOICE_ITEM_PARTS = ['prompt', 'reteach', 'choice'] as const;
export type VoiceItemPart = (typeof VOICE_ITEM_PARTS)[number];

/** Kartu pilihan/kelompok di soal, untuk mengambil teks `say` kartu tertentu. */
const itemCards = (item: Pick<Item, 'interaction'>): Choice[] => {
  const it = item.interaction;
  switch (it.type) {
    case 'pick-one':
    case 'tap-all':
    case 'order':
      return it.choices;
    case 'group':
      return [...it.groups, ...it.items];
    case 'match':
      return [...it.left, ...it.right];
    case 'catch':
      return it.choices;
    case 'memory':
      return it.cards;
    case 'sort':
      return [...it.bins, ...it.items];
    case 'sum':
      return it.tokens;
    case 'crossword':
      return it.letters;
    default:
      return [];
  }
};

export const voiceItemText = (
  item: Item,
  part: VoiceItemPart,
  choiceId?: string,
): string | undefined => {
  if (part === 'prompt') return item.say ?? item.prompt;
  if (part === 'reteach') return item.reteach.say;
  return itemCards(item).find((c) => c.id === choiceId)?.say;
};

/** Bahasa suara: Indonesia, atau British English untuk kata Inggris (Cambridge & Singapore). */
export type VoiceLang = 'id-ID' | 'en-GB';
/**
 * Profil suara satu bagian soal (D-062). Suara Momo (nama suara admin, mis. Leda) sama untuk semua; yang
 * berbeda hanya bahasa dan arahan gaya:
 * - English Pra-TK: narasi soal & penjelasan dalam Bahasa Indonesia (anak belum paham instruksi English),
 *   kata/huruf English di dalamnya dilafalkan jelas; kartu pilihan diucapkan dalam British English.
 * - Buku English jenjang lain (belum ada): seluruhnya British English (D-059).
 * - Buku lain: Indonesia dengan gaya admin.
 */
export type VoiceProfile = {
  lang: VoiceLang;
  style?: string;
  /** Selisih kecepatan dari pengaturan admin (mis. −0,05 untuk TK), dibatasi 0,7–1,2. */
  rateDelta?: number;
};

/**
 * Arahan gaya bicara (D-087). Model Gemini-TTS mengikuti peran di arahan: menyebut "robot" membuat suara
 * datar dan kaku, jadi arahan menggambarkan PEMBACA MANUSIA (kakak/guru) dengan intonasi wajar. Nama Momo
 * tetap dipakai di aplikasi, tetapi suaranya suara manusia yang ramah. Satu gaya per jenjang supaya soal
 * SMP tidak terdengar kekanak-kanakan.
 */
export const VOICE_STYLE_TK =
  'Bacakan seperti kakak pengasuh perempuan yang ramah sedang membacakan soal untuk anak TK. Suara manusia yang hangat dan ceria, bicara santai seperti mengobrol, intonasi naik-turun yang wajar, jeda singkat di setiap koma dan titik, sedikit lebih pelan dari bicara biasa. Pertanyaan diucapkan dengan nada bertanya. Jangan terdengar seperti robot, mesin, atau penyiar.';
export const VOICE_STYLE_SD =
  'Bacakan seperti guru SD perempuan yang ramah dan bersemangat. Suara manusia yang natural dan hangat, kecepatan bicara biasa, intonasi hidup, jeda wajar di koma dan titik, nada bertanya pada pertanyaan. Ucapkan angka dan istilah dengan jelas. Jangan terdengar seperti robot, mesin, atau penyiar berita.';
export const VOICE_STYLE_SMP =
  'Bacakan seperti guru SMP perempuan yang ramah dan tenang. Suara manusia yang natural, kecepatan bicara biasa, intonasi wajar seperti menjelaskan di kelas, jeda wajar di koma dan titik. Ucapkan angka, satuan, dan istilah dengan jelas. Jangan terdengar seperti robot, mesin, atau kekanak-kanakan.';

export type VoiceStage = 'tk' | 'sd' | 'smp';
/** Jenjang dari id skill (`domain.grade.…`): PAUD/TK, SD, atau SMP. */
export const voiceStageOf = (skillId: string): VoiceStage => {
  const grade = skillId.split('.')[1] ?? '';
  if (grade === 'smp79') return 'smp';
  if (grade === 'prek' || grade === 'tk' || grade === 'tkosn') return 'tk';
  return 'sd';
};
const STAGE_STYLE: Record<VoiceStage, string> = {
  tk: VOICE_STYLE_TK,
  sd: VOICE_STYLE_SD,
  smp: VOICE_STYLE_SMP,
};
const stageRate = (stage: VoiceStage) => (stage === 'tk' ? -0.05 : 0);

/** Narasi Indonesia dengan kata English yang dilafalkan jelas (English Pra-TK). */
export const ID_EN_VOICE_STYLE =
  'Bacakan seperti guru TK perempuan yang ramah: suara manusia yang hangat dan ceria, bicara santai dalam Bahasa Indonesia dengan intonasi wajar dan jeda singkat di koma dan titik. Kata, huruf, dan kalimat bahasa Inggris di dalamnya ucapkan dengan lafal British English yang jelas; huruf Inggris disebut dengan nama hurufnya dalam bahasa Inggris. Jangan terdengar seperti robot atau mesin, dan jangan pernah terdengar marah atau kecewa.';
/** Kata/huruf English pada kartu pilihan: satu kata, sangat jelas. */
export const ENGLISH_WORD_STYLE =
  'Say this English word or letter once, slowly and very clearly, in a warm, bright and friendly female voice, like a kind kindergarten teacher speaking to a 4-year-old. Use clear British English pronunciation. Do not add any other words.';
/** Arahan gaya untuk soal yang seluruhnya English (buku English di atas Pra-TK). */
export const ENGLISH_VOICE_STYLE =
  'Read this like a friendly, warm female English teacher talking to her pupils: a natural human voice, conversational pace, lively intonation, short pauses at commas and full stops, a rising tone on questions. Use clear British English pronunciation. Never sound robotic, mechanical, or like a news reader, and never sound disappointed. If a sentence is in Indonesian (written in brackets), say that sentence in natural Indonesian.';

export const voiceProfileOf = (skillId: string, part: VoiceItemPart = 'prompt'): VoiceProfile => {
  const stage = voiceStageOf(skillId);
  const rateDelta = stageRate(stage);
  // Buku selain English: Bahasa Indonesia dengan gaya per jenjang (D-087).
  if (!skillId.startsWith('english.'))
    return { lang: 'id-ID', style: STAGE_STYLE[stage], rateDelta };
  if (part === 'choice') return { lang: 'en-GB', style: ENGLISH_WORD_STYLE };
  // Pra-TK dan TK Olimpiade (D-062, D-071): perintah Bahasa Indonesia dengan kata English di dalamnya.
  if (skillId.startsWith('english.prek.') || skillId.startsWith('english.tkosn.'))
    return { lang: 'id-ID', style: ID_EN_VOICE_STYLE, rateDelta };
  return { lang: 'en-GB', style: ENGLISH_VOICE_STYLE };
};
export const voiceLangOf = (skillId: string, part: VoiceItemPart = 'prompt'): VoiceLang =>
  voiceProfileOf(skillId, part).lang;

/**
 * Pengaturan suara untuk satu profil: model, nama suara, dan kecepatan dari admin; gaya mengikuti profil,
 * kecepatan digeser `rateDelta` (TK sedikit lebih pelan). Kalimat Momo umum (tanpa profil) memakai gaya admin.
 */
export const voiceSettingsFor = (s: VoiceSettings, p: VoiceProfile | VoiceLang): VoiceSettings => {
  const profile: VoiceProfile =
    typeof p === 'string' ? { lang: p, ...(p === 'en-GB' && { style: ENGLISH_VOICE_STYLE }) } : p;
  if (!profile.style && !profile.rateDelta) return s;
  const rate = profile.rateDelta
    ? Math.round(Math.min(1.2, Math.max(0.7, s.rate + profile.rateDelta)) * 100) / 100
    : s.rate;
  return { ...s, ...(profile.style && { style: profile.style }), rate };
};

/**
 * Model suara Google Cloud Text-to-Speech (D-087):
 * - `chirp3-hd` — suara generasi baru yang natural (nama suara `id-ID-Chirp3-HD-<suara>`), cukup API key biasa;
 *   TIDAK menerima arahan gaya (gaya per jenjang diabaikan, kecepatan & naskah ucapan tetap berlaku).
 * - `gemini-2.5-flash-tts` / `gemini-2.5-pro-tts` — menerima arahan gaya, tetapi butuh Agent Platform API dan kunci
 *   yang terikat service account.
 */
export const CHIRP3_HD_MODEL = 'chirp3-hd';
/** Model yang bisa dipilih admin: hanya Chirp 3 HD (D-091 — semua suara aplikasi memakai Chirp 3 HD). */
export const VOICE_MODELS = [CHIRP3_HD_MODEL] as const;
export const isChirpModel = (model: string) => /^chirp/i.test(model.trim());

/** Pengaturan suara Momo (admin). Model & nama suara Google Cloud Text-to-Speech. */
export const voiceSettingsSchema = z.strictObject({
  enabled: z.boolean(),
  model: z.string().trim().min(3).max(60),
  voice: z.string().trim().min(2).max(40),
  /** Arahan gaya bicara (prompt), mis. ceria & lembut. */
  style: z.string().trim().max(400),
  /** Kecepatan bicara 0,7–1,2. */
  rate: z.number().min(0.7).max(1.2),
});
export type VoiceSettings = z.infer<typeof voiceSettingsSchema>;

/** Gaya bawaan lama (sebelum D-087); `upgradeVoiceSettings` menggantinya dengan gaya baru. */
export const LEGACY_VOICE_STYLE =
  'Kamu Momo, robot sahabat anak usia 5–8 tahun. Bicara dalam Bahasa Indonesia dengan nada ceria, lembut, dan hangat; pelan dan jelas; tersenyum saat bicara; tidak pernah terdengar marah atau kecewa.';

/** Gaya kalimat Momo umum (perintah, pujian, skor) — dipakai semua jenjang. */
export const VOICE_STYLE_DEFAULT =
  'Bacakan seperti kakak perempuan yang ramah dan ceria berbicara kepada anak SD: suara manusia yang natural dan hangat, bicara santai seperti mengobrol, intonasi hidup, jeda wajar di koma dan titik, tersenyum saat bicara. Jangan terdengar seperti robot, mesin, atau penyiar, dan jangan pernah terdengar marah atau kecewa.';

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: true,
  model: CHIRP3_HD_MODEL,
  voice: 'Leda',
  style: VOICE_STYLE_DEFAULT,
  rate: 1,
};

/**
 * Pengaturan admin yang masih memakai gaya bawaan lama ("robot", pelan) dinaikkan ke bawaan baru (D-087).
 * Gaya yang sudah disunting admin tidak disentuh.
 */
export const upgradeVoiceSettings = (s: VoiceSettings): VoiceSettings => {
  const styled =
    s.style.trim() === LEGACY_VOICE_STYLE
      ? { ...s, style: VOICE_STYLE_DEFAULT, rate: s.rate === 0.95 ? 1 : s.rate }
      : s;
  // D-091: semua suara memakai Chirp 3 HD. Pengaturan lama yang masih Gemini dipindah ke Chirp 3 HD; nama
  // suara (Leda, Kore, …) sama di kedua model, jadi tetap dipakai.
  return isChirpModel(styled.model) ? styled : { ...styled, model: CHIRP3_HD_MODEL };
};

export const voiceLinesUpdateSchema = z.strictObject({
  lines: z.record(z.string().regex(/^[a-z0-9_]+$/), z.string().trim().min(1).max(300)),
});
