import { describe, expect, it } from 'vitest';
import {
  checkAnswer,
  GLYPHS,
  generateItem,
  lessonScreenSchema,
  SOUND_MAKERS,
  skillTemplateSchema,
  specSay,
  specSchema,
  specVisual,
  STROKE_GLYPH_IDS,
  traceStroke,
  validateTemplate,
  type FamilyName,
  type Interaction,
  type Item,
} from '../src/index.js';

/** P-MA-02 lihat sekilas, P-BT-01 dengar bunyi, P-BT-02/03 garis pramenulis, uang kertas (D-081). */
const tpl = (family: FamilyName, params: Record<string, unknown> = {}) =>
  skillTemplateSchema.parse({
    id: `worksheet.prek.z9.uji-${family}`,
    version: 1,
    domain: 'worksheet',
    grade: 'prek',
    category: 'Z',
    order: 9,
    title: 'Uji',
    tier: 'basic',
    family,
    params,
  });
const many = (family: FamilyName, params: Record<string, unknown>, n = 60): Item[] =>
  Array.from({ length: n }, (_, seed) =>
    generateItem(tpl(family, params), { seed, band: seed % 3 }),
  );
type Pick1 = Extract<Interaction, { type: 'pick-one' }>;
const answerOf = (it: Item) => {
  const p = it.interaction as Pick1;
  return p.choices.find((c) => c.id === p.answer)!;
};

describe('garis pramenulis (P-BT-02/03)', () => {
  it('setiap garis bisa ditebalkan sampai selesai', () => {
    for (const id of STROKE_GLYPH_IDS)
      for (const s of GLYPHS[id].strokes) expect(traceStroke(s, s, 14).status, id).toBe('done');
  });

  it('tebalkan & kenali garis lolos 200 soal acak', () => {
    expect(validateTemplate(tpl('stroke-trace', { strokes: [...STROKE_GLYPH_IDS] }))).toEqual([]);
    expect(
      validateTemplate(
        tpl('stroke-trace', { strokes: ['tegak'], picture: false, guide: 'dotted' }),
      ),
    ).toEqual([]);
    expect(
      validateTemplate(tpl('stroke-find', { strokes: ['tegak', 'datar', 'miring', 'tambah'] })),
    ).toEqual([]);
    expect(
      validateTemplate(
        tpl('stroke-find', {
          mode: 'picture',
          strokes: ['lengkung', 'lingkaran', 'zigzag', 'gelombang'],
        }),
      ),
    ).toEqual([]);
    expect(
      validateTemplate(
        tpl('stroke-find', { mode: 'picture', strokes: ['tegak', 'datar'], choices: [2, 2] }),
      ),
    ).toEqual([]);
  });

  it('tebalkan garis = interaksi trace dengan id garis; kenali = gambar garis yang disebut', () => {
    for (const it of many('stroke-trace', { strokes: ['zigzag', 'gelombang'] })) {
      const t = it.interaction as Extract<Interaction, { type: 'trace' }>;
      expect(['zigzag', 'gelombang']).toContain(t.glyph);
      expect(checkAnswer(it, 0).correct).toBe(true);
    }
    for (const it of many('stroke-find', { strokes: ['tegak', 'datar', 'miring'] })) {
      const g = (answerOf(it).visual as { glyph: string }).glyph;
      expect(it.prompt.toLowerCase()).toContain(g === 'datar' ? 'mendatar' : g);
    }
  });
});

describe('dengar bunyi (P-BT-01)', () => {
  it('semua mode × kelompok lolos 200 soal acak', () => {
    for (const mode of ['listen', 'match', 'same', 'makes-sound'])
      for (const groups of [['hewan'], ['kendaraan'], ['benda'], ['hewan', 'kendaraan', 'benda']])
        expect(validateTemplate(tpl('sound', { mode, groups })), `${mode} ${groups}`).toEqual([]);
  });

  it('dengar: bunyi yang diucapkan = bunyi gambar jawaban; bunyi tidak kembar antarbenda', () => {
    const sounds = SOUND_MAKERS.map((m) => m.sound);
    expect(new Set(sounds).size).toBe(sounds.length);
    for (const it of many('sound', { mode: 'listen', groups: ['hewan', 'kendaraan'] })) {
      const obj = (answerOf(it).visual as { object: string }).object;
      const maker = SOUND_MAKERS.find((m) => m.object === obj)!;
      expect(it.say!.toLowerCase()).toContain(maker.sound.split(',')[0]!);
    }
  });

  it('sama atau beda: jawaban sesuai dua bunyi', () => {
    for (const it of many('sound', { mode: 'same', groups: ['hewan'] })) {
      const [, a, b] = /pertama: (.+?)\. Bunyi kedua: (.+?)\. /.exec(it.say!)!;
      expect((it.interaction as Pick1).answer).toBe(a === b ? 'ya' : 'tidak');
    }
  });
});

describe('lihat sekilas (P-MA-02)', () => {
  it('semua mode lolos 200 soal acak; gambar ditutup sebentar (peek)', () => {
    for (const mode of ['dots', 'die', 'frame', 'more', 'match', 'tap-all'])
      expect(validateTemplate(tpl('subitize', { mode })), mode).toEqual([]);
    const it = generateItem(tpl('subitize', { mode: 'dots', peek: 1500 }), { seed: 1, band: 1 });
    expect(it.peek).toBe(1500);
    expect(
      generateItem(tpl('subitize', { mode: 'dots', peek: 0 }), { seed: 1, band: 1 }).peek,
    ).toBeUndefined();
  });

  it('jawaban = banyak titik / mata dadu / kotak terisi', () => {
    for (const mode of ['dots', 'die', 'frame'] as const)
      for (const it of many('subitize', { mode })) {
        const v = it.stimulus[0] as { count?: number; value?: number; filled?: number };
        const n = v.count ?? v.value ?? v.filled;
        expect((answerOf(it).visual as { value: number }).value).toBe(n);
      }
  });
});

describe('uang kertas & skema pelajaran tahap 3', () => {
  it('spec uang kertas dan garis', () => {
    expect(specVisual(specSchema.parse({ note: 5000 }))).toEqual({ kind: 'note', value: 5000 });
    expect(specSay(specSchema.parse({ note: 2000 }))).toBe('dua ribu rupiah');
    expect(specSay(specSchema.parse({ glyph: 'zigzag' }))).toBe('garis zig-zag');
    expect(specSchema.safeParse({ note: 3000 }).success).toBe(false);
  });

  it('pelajaran: coba tebal garis; layar bunyi dengan kartu gambar', () => {
    const ok = (s: Record<string, unknown>) =>
      lessonScreenSchema.safeParse({ teks: 'Halo', suara: 'Halo', ...s }).success;
    expect(ok({ jenis: 'coba', mode: 'tebal', garis: ['tegak', 'datar'] })).toBe(true);
    expect(ok({ jenis: 'kenalan', garis: ['tegak'], kartuGambar: [{ glyph: 'tegak' }] })).toBe(
      false,
    );
    expect(ok({ jenis: 'bunyi', kartuGambar: [{ object: 'ayam', say: 'ayam: kukuruyuk' }] })).toBe(
      true,
    );
    expect(ok({ jenis: 'bunyi', huruf: ['a'] })).toBe(false);
  });
});
