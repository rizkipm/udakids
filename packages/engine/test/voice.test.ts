import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  COMMAND_KEYS,
  dialogFileSchema,
  scoreKey,
  spokenPrompt,
  VOICE_LINE_KEYS,
  voiceItemText,
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
    expect(Object.keys(COMMAND_KEYS)).toHaveLength(8);
    for (const k of VOICE_LINE_KEYS) {
      expect(dialog.lines[k], k).toBeDefined();
      expect(dialog.lines[k]!.text).not.toMatch(/\b(salah|gagal)\b/i);
    }
  });

  it('pengaturan bawaan valid', () => {
    expect(voiceSettingsSchema.parse(DEFAULT_VOICE_SETTINGS)).toEqual(DEFAULT_VOICE_SETTINGS);
  });
});
