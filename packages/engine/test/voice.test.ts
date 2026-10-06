import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  COMMAND_KEYS,
  isAudioOnlyItem,
  isListeningItem,
  dialogFileSchema,
  scoreKey,
  spokenPrompt,
  VOICE_LINE_KEYS,
  voiceItemText,
  voiceLangOf,
  voiceProfileOf,
  ENGLISH_WORD_STYLE,
  ID_EN_VOICE_STYLE,
  voiceSettingsFor,
  voiceSettingsSchema,
  DEFAULT_VOICE_SETTINGS,
  type Item,
} from '../src/index.js';

const item = (type: 'pick-one' | 'number-input'): Item =>
  ({
    skillId: 'math.sd1.a1.x',
    version: 1,
    seed: 1,
    band: 0,
    prompt: 'Budi punya 9 pensil. Berapa sisanya?',
    stimulus: [],
    interaction: type === 'pick-one' ? { type, choices: [], answer: 'a' } : { type, answer: 4 },
    reteach: { say: '9 − 5 = 4.' },
  }) as Item;

describe('suara Momo (D-035)', () => {
  it('kelas 1+: hanya perintah per jenis soal; Basic: kalimat soal', () => {
    expect(spokenPrompt(item('number-input'), 'intermediate')).toEqual({
      kind: 'line',
      key: 'vo_cmd_number_input',
    });
    expect(spokenPrompt(item('pick-one'), 'advanced')).toEqual({
      kind: 'line',
      key: 'vo_cmd_pick_one',
    });
    expect(spokenPrompt({ ...item('pick-one'), say: 'Ketuk lingkaran.' }, 'basic')).toEqual({
      kind: 'item',
      text: 'Ketuk lingkaran.',
    });
    expect(voiceItemText(item('pick-one'), 'reteach')).toBe('9 − 5 = 4.');
  });

  it('soal dengar (dikte) dibacakan lengkap di semua jenjang (D-043)', () => {
    const dikte = {
      ...item('number-input'),
      prompt: 'Dengarkan, lalu tulis angkanya.',
      say: 'Tulis angka dua puluh tiga.',
    };
    expect(isListeningItem(dikte)).toBe(true);
    expect(spokenPrompt(dikte, 'intermediate')).toEqual({
      kind: 'item',
      text: 'Tulis angka dua puluh tiga.',
    });
    expect(spokenPrompt(dikte, 'advanced').kind).toBe('item');
    // say sama dengan prompt → bukan soal dengar
    expect(isListeningItem({ prompt: 'Berapa?', say: 'Berapa?' })).toBe(false);
  });

  it('soal yang isinya hanya lewat suara ditandai (D-047)', () => {
    expect(
      isAudioOnlyItem({ prompt: 'Ketuk angka yang kamu dengar.', say: 'Ketuk angka dua.' }),
    ).toBe(true);
    expect(
      isAudioOnlyItem({ prompt: 'Dengarkan, lalu tulis angkanya.', say: 'Tulis angka tujuh.' }),
    ).toBe(true);
    // Isi soal juga terlihat di layar (gambar/angka) → bukan "hanya suara".
    expect(
      isAudioOnlyItem({
        prompt: 'Ada 5 kucing. 3 pergi. Tinggal berapa?',
        say: 'Ada lima kucing.',
      }),
    ).toBe(false);
    expect(isAudioOnlyItem({ prompt: 'Ketuk angka yang kamu dengar.' })).toBe(false);
  });

  it('skor dibulatkan ke kunci 0..100', () => {
    expect(scoreKey(70)).toBe('vo_score_70');
    expect(scoreKey(104)).toBe('vo_score_100');
    expect(scoreKey(-3)).toBe('vo_score_0');
  });

  it('semua kunci suara ada di dialog Momo, tanpa kata "salah/gagal"', () => {
    const dialog = dialogFileSchema.parse(
      JSON.parse(
        readFileSync(new URL('../../../content/dialog/momo.id.json', import.meta.url), 'utf8'),
      ),
    );
    expect(Object.keys(COMMAND_KEYS)).toHaveLength(11);
    for (const k of VOICE_LINE_KEYS) {
      expect(dialog.lines[k], k).toBeDefined();
      expect(dialog.lines[k]!.text).not.toMatch(/\b(salah|gagal)\b/i);
    }
  });

  it('soal dengar English juga dikenali (D-059)', () => {
    expect(isAudioOnlyItem({ prompt: 'Tap the letter you hear.', say: 'Tap the letter b.' })).toBe(
      true,
    );
    expect(isAudioOnlyItem({ prompt: 'Listen. Which word starts with b?', say: 'Ball.' })).toBe(
      true,
    );
  });

  it('English Pra-TK: narasi Indonesia, kartu English; buku lain Indonesia (D-062)', () => {
    // Narasi soal & penjelasan Pra-TK: Bahasa Indonesia dengan kata Inggris yang dilafalkan jelas.
    expect(voiceProfileOf('english.prek.a1.huruf-a')).toEqual({
      lang: 'id-ID',
      style: ID_EN_VOICE_STYLE,
    });
    expect(voiceProfileOf('english.prek.a1.huruf-a', 'reteach').lang).toBe('id-ID');
    // Kartu pilihan: British English, satu kata, suara perempuan yang jelas.
    expect(voiceProfileOf('english.prek.a1.huruf-a', 'choice')).toEqual({
      lang: 'en-GB',
      style: ENGLISH_WORD_STYLE,
    });
    expect(ENGLISH_WORD_STYLE).toMatch(/female/);
    // Buku English jenjang lain (kelak) tetap seluruhnya British English (D-059).
    expect(voiceLangOf('english.tk.a1.x')).toBe('en-GB');
    expect(voiceLangOf('math.prek.a1.kenali-angka-1-sampai-2')).toBe('id-ID');
    expect(voiceProfileOf('sains.tk.a1.ketuk-bentuknya', 'choice')).toEqual({ lang: 'id-ID' });
    // Nama suara, model, dan kecepatan tetap dari admin; hanya gaya yang mengikuti profil.
    const mix = voiceSettingsFor(DEFAULT_VOICE_SETTINGS, voiceProfileOf('english.prek.a1.huruf-a'));
    expect(mix).toMatchObject({ voice: DEFAULT_VOICE_SETTINGS.voice, style: ID_EN_VOICE_STYLE });
    expect(voiceSettingsFor(DEFAULT_VOICE_SETTINGS, { lang: 'id-ID' })).toBe(
      DEFAULT_VOICE_SETTINGS,
    );
    const en = voiceSettingsFor(DEFAULT_VOICE_SETTINGS, 'en-GB');
    expect(en).toMatchObject({
      voice: DEFAULT_VOICE_SETTINGS.voice,
      rate: DEFAULT_VOICE_SETTINGS.rate,
    });
    expect(en.style).toMatch(/British English/);
    expect(voiceSettingsFor(DEFAULT_VOICE_SETTINGS, 'id-ID')).toBe(DEFAULT_VOICE_SETTINGS);
  });

  it('teks kartu pilihan untuk suara (D-062)', () => {
    const card: Item = {
      ...item('pick-one'),
      interaction: {
        type: 'pick-one',
        choices: [
          { id: 'c0', visual: { kind: 'word', text: 'cat' }, say: 'cat' },
          { id: 'c1', visual: { kind: 'word', text: 'b' } },
        ],
        answer: 'c0',
      },
    };
    expect(voiceItemText(card, 'choice', 'c0')).toBe('cat');
    expect(voiceItemText(card, 'choice', 'c1')).toBeUndefined();
    expect(voiceItemText(card, 'choice', 'x')).toBeUndefined();
    expect(voiceItemText(card, 'prompt')).toBe(card.prompt);
  });

  it('pengaturan bawaan valid', () => {
    expect(voiceSettingsSchema.parse(DEFAULT_VOICE_SETTINGS)).toEqual(DEFAULT_VOICE_SETTINGS);
  });
});
