import { describe, expect, it } from 'vitest';
import {
  ALPHABET,
  checkAnswer,
  CONSONANT_LETTERS,
  GLYPHS,
  generateItem,
  LETTER_GLYPH_IDS,
  LETTER_WORDS,
  OBJECTS,
  skillTemplateSchema,
  traceStroke,
  validateTemplate,
  type FamilyName,
  type Interaction,
  type Item,
} from '../src/index.js';

/** Latihan menulis angka 1–10 dan huruf a–z (D-083). */
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
const many = (family: FamilyName, params: Record<string, unknown>, n = 80): Item[] =>
  Array.from({ length: n }, (_, seed) =>
    generateItem(tpl(family, params), { seed, band: seed % 3 }),
  );
type Trace = Extract<Interaction, { type: 'trace' }>;
type Pick1 = Extract<Interaction, { type: 'pick-one' }>;

describe('goresan huruf a–z', () => {
  it('52 huruf (kecil & besar), setiap goresan bisa ditebalkan sampai selesai dan muat di kotak', () => {
    expect(LETTER_GLYPH_IDS).toHaveLength(52);
    expect(CONSONANT_LETTERS).toHaveLength(21);
    for (const id of LETTER_GLYPH_IDS) {
      const g = GLYPHS[id];
      expect(g.strokes.length, id).toBeGreaterThan(0);
      for (const s of g.strokes) {
        expect(traceStroke(s, s, 14).status, id).toBe('done');
        for (const p of s) {
          expect(p.x, id).toBeGreaterThanOrEqual(0);
          expect(p.x, id).toBeLessThanOrEqual(g.width);
          expect(p.y, id).toBeGreaterThanOrEqual(0);
          expect(p.y, id).toBeLessThanOrEqual(140);
        }
      }
    }
  });

  it('kata bergambar: dimulai dengan hurufnya dan gambarnya ada; f, q, v belum bergambar', () => {
    for (const l of ALPHABET)
      for (const w of LETTER_WORDS[l]) {
        expect(w.word.startsWith(l), `${l} ${w.word}`).toBe(true);
        expect(OBJECTS[w.object], w.object).toBeDefined();
        expect(w.syl.replaceAll('-', '')).toBe(w.word);
      }
    expect(ALPHABET.filter((l) => LETTER_WORDS[l].length === 0)).toEqual(['f', 'q', 'v']);
  });
});

describe('keluarga huruf untuk konsonan', () => {
  it('tebalkan huruf: semua konsonan kecil/besar; tanpa gambar untuk f, q, v', () => {
    expect(
      validateTemplate(tpl('letter-trace', { letters: [...CONSONANT_LETTERS], case: 'both' })),
    ).toEqual([]);
    for (const it of many('letter-trace', { letters: ['f', 'q', 'v'], guide: 'mixed' })) {
      const t = it.interaction as Trace;
      expect(['f', 'q', 'v']).toContain(t.glyph);
      expect(['solid', 'dotted']).toContain(t.guide);
      expect(it.stimulus).toEqual([]);
      expect(checkAnswer(it, 0).correct).toBe(true);
    }
  });

  it('kenali huruf: jawaban = huruf yang disebut; pengecoh tidak kembar', () => {
    for (const mode of ['show', 'listen', 'case'] as const)
      for (const it of many('letter-find', {
        mode,
        letters: ['b', 'd', 'p', 'q'],
        pool: ['b', 'd', 'p', 'q'],
        choices: [3, 4],
      })) {
        const p = it.interaction as Pick1;
        const texts = p.choices.map((c) => (c.visual as { text: string }).text);
        expect(new Set(texts).size, mode).toBe(texts.length);
      }
    expect(
      validateTemplate(
        tpl('letter-find', { mode: 'initial', letters: ['b', 'c', 'd', 'g'], pool: ['b', 'c'] }),
      ),
    ).toEqual([]);
    // Huruf tanpa gambar tidak bisa dipakai untuk "huruf depan gambar".
    expect(
      validateTemplate(tpl('letter-find', { mode: 'initial', letters: ['f'] })).length,
    ).toBeGreaterThan(0);
  });

  it('tangkap huruf b: pengisi b/m/s tidak pernah sama dengan huruf yang dicari', () => {
    for (const it of many('catch-items', {
      mode: 'letter',
      letters: ['b', 'm', 's'],
      pool: ['b', 'm', 's'],
    })) {
      const i = it.interaction as Extract<Interaction, { type: 'tap-all' }>;
      const target = i.choices.find((c) => i.answer.includes(c.id))!;
      const wrong = i.choices.filter((c) => !i.answer.includes(c.id));
      for (const w of wrong) expect(w.visual).not.toEqual(target.visual);
    }
  });
});

describe('menulis angka dengan gambar hitungan bervariasi', () => {
  it('countWith mixed: benda, jari, dadu (≤ 6), bingkai, titik — banyaknya = angka', () => {
    const kinds = new Set<string>();
    for (const it of many(
      'numeral-trace',
      { values: [1, 10], ask: 'count', countWith: 'mixed' },
      200,
    )) {
      const v = it.stimulus[0]!;
      kinds.add(v.kind);
      const n = Number((it.interaction as Trace).glyph);
      const shown =
        v.kind === 'die'
          ? v.value
          : v.kind === 'frame'
            ? v.filled
            : v.kind === 'fingers' || v.kind === 'dots' || v.kind === 'objects'
              ? v.count
              : -1;
      expect(shown, v.kind).toBe(n);
      if (v.kind === 'die') expect(n).toBeLessThanOrEqual(6);
    }
    expect([...kinds].sort()).toEqual(['die', 'dots', 'fingers', 'frame', 'objects']);
  });
});
