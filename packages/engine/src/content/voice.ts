import { z } from 'zod';
import type { InteractionType, Item } from '../generator/item.js';
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
  isListeningItem(item) && /\bdengar/i.test(item.prompt);

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

/** Bagian soal Basic yang boleh dibuatkan suara on-demand (server memeriksa ulang dari skill+seed). */
export const VOICE_ITEM_PARTS = ['prompt', 'reteach'] as const;
export type VoiceItemPart = (typeof VOICE_ITEM_PARTS)[number];
export const voiceItemText = (item: Item, part: VoiceItemPart) =>
  part === 'prompt' ? (item.say ?? item.prompt) : item.reteach.say;

/** Pengaturan suara Momo (admin). Model & nama suara Gemini-TTS di Google Cloud Text-to-Speech. */
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

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: true,
  model: 'gemini-2.5-flash-tts',
  voice: 'Leda',
  style:
    'Kamu Momo, robot sahabat anak usia 5–8 tahun. Bicara dalam Bahasa Indonesia dengan nada ceria, lembut, dan hangat; pelan dan jelas; tersenyum saat bicara; tidak pernah terdengar marah atau kecewa.',
  rate: 0.95,
};

export const voiceLinesUpdateSchema = z.strictObject({
  lines: z.record(z.string().regex(/^[a-z0-9_]+$/), z.string().trim().min(1).max(300)),
});
