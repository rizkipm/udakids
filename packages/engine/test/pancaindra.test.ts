import { describe, expect, it } from 'vitest';
import {
  checkAnswer,
  generateItem,
  lessonScreenSchema,
  publicItem,
  SENSE_IDS,
  SENSE_USES,
  skillTemplateSchema,
  specSay,
  specSchema,
  specVisual,
  validateTemplate,
  visualSchema,
  type Interaction,
  type Item,
} from '../src/index.js';

/** Pancaindra (D-089): game "ketuk di wajah" dan layar pelajaran interaktif. */
const tpl = (params: Record<string, unknown> = {}) =>
  skillTemplateSchema.parse({
    id: 'sains.tkosn.z9.uji-sense-tap',
    version: 1,
    domain: 'sains',
    grade: 'tkosn',
    category: 'Z',
    order: 9,
    title: 'Uji',
    tier: 'basic',
    family: 'sense-tap',
    params,
  });
type Pick1 = Extract<Interaction, { type: 'pick-one' }>;
const many = (params: Record<string, unknown>, n = 120): Item[] =>
  Array.from({ length: n }, (_, seed) => generateItem(tpl(params), { seed, band: seed % 3 }));

describe('game ketuk di wajah (sense-tap)', () => {
  it('semua mode lolos 200 soal acak', () => {
    for (const mode of ['use', 'name', 'function'])
      expect(validateTemplate(tpl({ mode })), mode).toEqual([]);
    expect(
      validateTemplate(tpl({ mode: 'use', senses: ['mata', 'hidung'], choices: [2, 3] })),
    ).toEqual([]);
  });

  it('pilihan = alat indra di wajah (urutan tetap), jawaban = indra kegiatan itu', () => {
    for (const it of many({ mode: 'use' })) {
      const p = it.interaction as Pick1;
      expect(p.arrangement).toBe('face');
      const senses = p.choices.map((c) => (c.visual as { sense: string }).sense);
      expect(senses).toEqual(SENSE_IDS.filter((s) => senses.includes(s)));
      const object = (it.stimulus[0] as { object: string }).object;
      const use = SENSE_USES.find((u) => u.object === object)!;
      const ans = p.choices.find((c) => c.id === p.answer)!;
      expect((ans.visual as { sense: string }).sense).toBe(use.sense);
      expect(checkAnswer(it, p.answer).correct).toBe(true);
    }
  });

  it('pilihan sedikit: tetap ada jawaban; lomba tidak membocorkan jawaban', () => {
    for (const it of many({ mode: 'name', choices: [2, 3] })) {
      const p = it.interaction as Pick1;
      expect(p.choices.length).toBeGreaterThanOrEqual(2);
      expect(p.choices.some((c) => c.id === p.answer)).toBe(true);
      const pub = publicItem(it);
      expect(JSON.stringify(pub)).not.toContain('"answer"');
    }
  });
});

describe('visual & spec pancaindra', () => {
  it('sense dan face', () => {
    expect(specVisual(specSchema.parse({ sense: 'lidah' }))).toEqual({
      kind: 'sense',
      sense: 'lidah',
    });
    expect(specVisual(specSchema.parse({ face: 'semua' }))).toEqual({ kind: 'face' });
    expect(specSay(specSchema.parse({ face: 'telinga' }))).toBe('telinga, indra pendengar');
    expect(visualSchema.safeParse({ kind: 'face', sense: 'kulit' }).success).toBe(true);
    expect(visualSchema.safeParse({ kind: 'sense', sense: 'kaki' }).success).toBe(false);
  });
});

describe('layar pelajaran interaktif (D-089)', () => {
  const ok = (s: Record<string, unknown>) =>
    lessonScreenSchema.safeParse({ teks: 'Halo', suara: 'Halo semua', ...s }).success;
  const scene = { teks: 'Mata', suara: 'Ini mata', gambar: [{ face: 'mata' }] };
  it('tonton butuh 2–8 adegan', () => {
    expect(ok({ jenis: 'tonton', adegan: [scene, { ...scene, gerak: 'zoom' }] })).toBe(true);
    expect(ok({ jenis: 'tonton', adegan: [scene] })).toBe(false);
    expect(ok({ jenis: 'tonton' })).toBe(false);
    expect(ok({ jenis: 'kenalan', angka: [1], adegan: [scene, scene] })).toBe(false);
  });
  it('jelajah butuh figur dan titik yang tidak kembar', () => {
    const spot = (bagian: string) => ({
      bagian,
      teks: 'Untuk melihat',
      suara: 'Mata untuk melihat',
    });
    expect(
      ok({ jenis: 'jelajah', figur: 'pancaindra', titik: [spot('mata'), spot('hidung')] }),
    ).toBe(true);
    expect(ok({ jenis: 'jelajah', figur: 'pancaindra', titik: [spot('mata'), spot('mata')] })).toBe(
      false,
    );
    expect(ok({ jenis: 'jelajah', titik: [spot('mata'), spot('hidung')] })).toBe(false);
  });
  it('baca butuh kalimat', () => {
    expect(
      ok({ jenis: 'baca', kalimat: [{ teks: 'Mata melihat.' }, { teks: 'Telinga mendengar.' }] }),
    ).toBe(true);
    expect(ok({ jenis: 'baca' })).toBe(false);
  });
});
