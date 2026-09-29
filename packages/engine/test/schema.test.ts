import { describe, expect, it } from 'vitest';
import {
  countFocus,
  focusProblems,
  levelAudioKeys,
  levelBaseSchema,
  type LevelBase,
} from '../src/index.js';

const base = {
  id: 'w1-l04',
  version: 1,
  tier: 'basic',
  world: 1,
  index: 4,
  role: 'practice',
  focus: 'logic',
  skills: ['sequencing'],
  type: 'sequence-cards',
  story: { intro: 'vo_w1_l04_intro', success: 'vo_success_a', hint: ['vo_hint_a'] },
  cards: ['a', 'b'],
};

describe('levelBaseSchema', () => {
  it('menerima level valid dan mempertahankan field khusus type', () => {
    const parsed = levelBaseSchema.parse(base);
    expect(parsed.cards).toEqual(['a', 'b']);
  });

  it('menolak id yang salah format', () => {
    expect(levelBaseSchema.safeParse({ ...base, id: 'level-4' }).success).toBe(false);
  });

  it('menolak type puzzle yang tidak dikenal', () => {
    expect(levelBaseSchema.safeParse({ ...base, type: 'drag-blocks' }).success).toBe(false);
  });

  it('menolak audioKey dengan huruf besar/spasi', () => {
    const bad = { ...base, story: { intro: 'Vo Intro', success: 'vo_ok' } };
    expect(levelBaseSchema.safeParse(bad).success).toBe(false);
  });
});

describe('levelAudioKeys', () => {
  it('mengumpulkan intro, success, dan hint', () => {
    const level = levelBaseSchema.parse(base);
    expect(levelAudioKeys(level)).toEqual(['vo_w1_l04_intro', 'vo_success_a', 'vo_hint_a']);
  });

  it('bekerja tanpa hint', () => {
    const level = levelBaseSchema.parse({ ...base, story: { intro: 'a', success: 'b' } });
    expect(levelAudioKeys(level)).toEqual(['a', 'b']);
  });
});

describe('focus per dunia', () => {
  const mk = (focus: LevelBase['focus'], role: LevelBase['role'] = 'practice') =>
    levelBaseSchema.parse({ ...base, focus, role });

  it('komposisi 4/3/3 lolos', () => {
    const levels = [
      ...Array.from({ length: 4 }, () => mk('logic')),
      ...Array.from({ length: 3 }, () => mk('math')),
      ...Array.from({ length: 3 }, () => mk('science')),
    ];
    expect(focusProblems(countFocus(levels))).toEqual([]);
  });

  it('level bonus tidak dihitung', () => {
    expect(countFocus([mk('logic', 'bonus'), mk('math')])).toEqual({
      logic: 0,
      math: 1,
      science: 0,
    });
  });

  it('melaporkan komposisi yang kurang', () => {
    expect(focusProblems(countFocus([mk('logic')]))).toEqual([
      'logic: 1 (harus 4)',
      'math: 0 (harus 3)',
      'science: 0 (harus 3)',
    ]);
  });
});
