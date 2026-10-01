import { describe, expect, it } from 'vitest';
import { validateContent, VOICE_LINE_KEYS, type ContentFile } from '../src/index.js';

const voiceLines = Object.fromEntries(VOICE_LINE_KEYS.map((k) => [k, { text: `Kalimat ${k}` }]));
const dialog: ContentFile = {
  path: 'dialog/momo.id.json',
  data: {
    lang: 'id',
    lines: { vo_intro: { text: 'Halo' }, vo_success: { text: 'Hore' }, ...voiceLines },
  },
};

const gridData = (over: Record<string, unknown> = {}) => ({
  id: 'w2-l01',
  version: 1,
  tier: 'basic',
  world: 2,
  index: 1,
  role: 'intro',
  focus: 'logic',
  skills: ['direction-fixed'],
  type: 'grid-move',
  grid: { w: 3, h: 3 },
  start: { x: 0, y: 0, facing: 'right' },
  goal: { x: 2, y: 0 },
  palette: ['up', 'down', 'left', 'right'],
  maxCards: 4,
  story: { intro: 'vo_intro', success: 'vo_success' },
  ...over,
});

const file = (
  data: Record<string, unknown>,
  path = `levels/basic/world-${data.world}/${data.id}.json`,
) => ({
  path,
  data,
});

const validate = (levels: ContentFile[], allowIncomplete = true) =>
  validateContent({ levels, dialog, allowIncomplete });

describe('validateContent', () => {
  it('kalimat suara Momo (D-035) wajib lengkap di dialog', () => {
    const { vo_cmd_pick_one: _, ...rest } = voiceLines;
    const r = validateContent({
      levels: [],
      dialog: { path: 'dialog/momo.id.json', data: { lang: 'id', lines: rest } },
      allowIncomplete: true,
    });
    expect(r.errors.join('\n')).toMatch(/kalimat suara Momo "vo_cmd_pick_one" belum ada/);
  });

  it('level valid → tanpa error, optimalSteps auto ditulis ke optimal', () => {
    const r = validate([file(gridData())]);
    expect(r.errors).toEqual([]);
    expect(r.optimal).toEqual({ 'w2-l01': { version: 1, optimalSteps: 2 } });
    expect(r.levels).toHaveLength(1);
  });

  it('MENOLAK level yang tidak bisa diselesaikan', () => {
    const r = validate([
      file(
        gridData({
          grid: {
            w: 3,
            h: 3,
            walls: [
              [1, 0],
              [1, 1],
              [1, 2],
            ],
          },
        }),
      ),
    ]);
    expect(r.errors).toEqual([
      'levels/basic/world-2/w2-l01.json: tidak bisa diselesaikan dalam maxCards = 4',
    ]);
  });

  it('menolak level yang butuh lebih banyak kartu dari maxCards', () => {
    const r = validate([file(gridData({ maxCards: 1 }))]);
    expect(r.errors.join()).toMatch(/tidak bisa diselesaikan dalam maxCards = 1/);
  });

  it('menolak jalan pintas pada level ber-skill loop', () => {
    const r = validate([
      file(
        gridData({ tier: 'intermediate', skills: ['loop'], palette: ['right', 'repeat'] }),
        'levels/intermediate/world-2/w2-l01.json',
      ),
    ]);
    expect(r.errors.join()).toMatch(/jalan pintas.*tanpa ulangi dengan 2 kartu/);
  });

  it('optimalSteps manual yang mustahil = error; yang longgar = peringatan', () => {
    const tooLow = validate([file(gridData({ stars: { optimalSteps: 1 } }))]);
    expect(tooLow.errors.join()).toMatch(/optimalSteps 1 mustahil/);
    const loose = validate([file(gridData({ stars: { optimalSteps: 3 } }))]);
    expect(loose.errors).toEqual([]);
    expect(loose.warnings.join()).toMatch(/optimalSteps 3 > solusi terpendek 2/);
  });

  it('skema, type belum didukung, dan bentuk dasar', () => {
    const r = validate([
      file(gridData({ id: 'w2-l02', index: 2, maxCards: 'banyak' })),
      file({ ...gridData({ id: 'w2-l03', index: 3 }), type: 'debug' }),
      { path: 'levels/basic/world-2/rusak.json', data: { id: 'x' } },
    ]);
    expect(r.errors.some((e) => e.includes('w2-l02.json: maxCards'))).toBe(true);
    expect(r.errors.some((e) => e.includes('type "debug" belum didukung'))).toBe(true);
    expect(r.errors.some((e) => e.startsWith('levels/basic/world-2/rusak.json: id'))).toBe(true);
  });

  it('id / nama file / folder harus konsisten; id unik', () => {
    const r = validate([
      file(gridData({ index: 2 })),
      file(gridData(), 'levels/basic/world-3/salah-nama.json'),
    ]);
    expect(r.errors).toEqual(
      expect.arrayContaining([
        'levels/basic/world-2/w2-l01.json: id "w2-l01" tidak cocok dengan world/index (w2-l02)',
        'levels/basic/world-3/salah-nama.json: nama file harus w2-l01.json',
        'levels/basic/world-3/salah-nama.json: harus berada di levels/basic/world-2/',
      ]),
    );
    expect(r.errors.some((e) => e.includes('duplikat'))).toBe(true);
  });

  it('level bonus boleh memakai id lb*', () => {
    const r = validate([file(gridData({ id: 'w2-lb1', role: 'bonus' }))]);
    expect(r.errors).toEqual([]);
  });

  it('audioKey harus ada di dialog atau extraAudioKeys', () => {
    const data = gridData({
      story: { intro: 'vo_tidak_ada', success: 'vo_success', hint: ['vo_soal'] },
    });
    expect(validate([file(data)]).errors).toEqual([
      'levels/basic/world-2/w2-l01.json: audioKey "vo_tidak_ada" tidak ada di dialog',
      'levels/basic/world-2/w2-l01.json: audioKey "vo_soal" tidak ada di dialog',
    ]);
    const r = validateContent({
      levels: [file(data)],
      dialog,
      allowIncomplete: true,
      extraAudioKeys: ['vo_tidak_ada', 'vo_soal'],
    });
    expect(r.errors).toEqual([]);
  });

  it('dialog rusak dilaporkan', () => {
    const r = validateContent({
      levels: [],
      dialog: { path: 'dialog/momo.id.json', data: { lines: 3 } },
    });
    expect(r.errors[0]).toMatch(/^dialog\/momo.id.json:/);
  });

  it('komposisi 4/3/3: peringatan dengan allowIncomplete, error tanpa', () => {
    expect(validate([file(gridData())], true).warnings.join()).toMatch(
      /basic dunia 2: komposisi fokus/,
    );
    expect(validate([file(gridData())], false).errors.join()).toMatch(
      /basic dunia 2: komposisi fokus/,
    );
  });

  it('dunia lengkap 4/3/3 lolos mode ketat', () => {
    const focus = [
      'logic',
      'logic',
      'logic',
      'logic',
      'math',
      'math',
      'math',
      'science',
      'science',
      'science',
    ];
    const levels = focus.map((f, i) => {
      const id = `w2-l${String(i + 1).padStart(2, '0')}`;
      return file(gridData({ id, index: i + 1, focus: f }));
    });
    const r = validate(levels, false);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
});
