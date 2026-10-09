import { describe, expect, it } from 'vitest';
import {
  ACTIVITIES,
  checkAnswer,
  generateItem,
  itemProblems,
  lessonScreenSchema,
  QUEUE_THEMES,
  skillTemplateSchema,
  specSay,
  specSchema,
  specVisual,
  validateTemplate,
  type FamilyName,
  type Interaction,
  type Item,
} from '../src/index.js';

/** Unit Berhitung PAUD P-MA-04, P-MA-05, P-MA-14 dan pelajaran P-MA-06…13 (D-079). */
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
const answerChoice = (it: Item) => {
  const p = it.interaction as Pick1;
  return p.choices.find((c) => c.id === p.answer)!;
};

describe('jari tangan dan angka (P-MA-04)', () => {
  it('semua mode lolos 200 soal acak', () => {
    for (const mode of ['count', 'show', 'match', 'more', 'fewer', 'combine', 'tap-all'])
      for (const values of [
        [1, 5],
        [6, 10],
        [1, 10],
      ])
        expect(validateTemplate(tpl('fingers', { mode, values })), `${mode} ${values}`).toEqual([]);
  });

  it('hitung jari: jawaban = banyak jari di gambar; pengecoh kurang/lebih satu', () => {
    for (const it of many('fingers', { mode: 'count', values: [1, 10] })) {
      const n = (it.stimulus[0] as { kind: 'fingers'; count: number }).count;
      expect((answerChoice(it).visual as { value: number }).value).toBe(n);
      expect(checkAnswer(it, `n${n}`).correct).toBe(true);
    }
  });

  it('tunjukkan jari & lebih banyak/sedikit: tangan jawaban sesuai', () => {
    for (const it of many('fingers', { mode: 'show', values: [1, 5] })) {
      const n = (it.stimulus[0] as { value: number }).value;
      expect(answerChoice(it).visual).toMatchObject({ kind: 'fingers', count: n });
    }
    for (const mode of ['more', 'fewer'] as const)
      for (const it of many('fingers', { mode, values: [1, 10] })) {
        const counts = (it.interaction as Pick1).choices.map(
          (c) => (c.visual as { count: number }).count,
        );
        const want = mode === 'more' ? Math.max(...counts) : Math.min(...counts);
        expect((answerChoice(it).visual as { count: number }).count).toBe(want);
      }
  });

  it('gabung dua tangan: jumlahnya benar, tiap tangan ≤ 5', () => {
    for (const it of many('fingers', { mode: 'combine', values: [2, 10] })) {
      const row = it.stimulus[0] as { kind: 'row'; items: { count: number }[] };
      const total = row.items[0]!.count + row.items[1]!.count;
      expect(row.items.every((h) => h.count >= 1 && h.count <= 5)).toBe(true);
      expect((answerChoice(it).visual as { value: number }).value).toBe(total);
    }
  });

  it('tebalkan angka dengan hitungan jari (pola selesai = benar)', () => {
    const items = many('numeral-trace', { values: [1, 10], countWith: 'fingers' });
    for (const it of items) {
      expect(it.stimulus[0]!.kind).toBe('fingers');
      expect(it.prompt).toMatch(/jari/);
      expect(checkAnswer(it, 0).correct).toBe(true);
      expect(checkAnswer(it, 9).correct).toBe(false);
    }
    // Bawaan (benda) tidak berubah.
    expect(
      generateItem(tpl('numeral-trace', { values: [3, 3] }), { seed: 1, band: 1 }).stimulus[0]!
        .kind,
    ).toBe('objects');
  });

  it('spec gambar: jari, ukuran, dan posisi', () => {
    const f = specSchema.parse({ fingers: 7 });
    expect(specVisual(f)).toEqual({ kind: 'fingers', count: 7 });
    expect(specSay(f)).toBe('tujuh jari');
    expect(specVisual(specSchema.parse({ object: 'gajah', scale: 1.4 }))).toMatchObject({
      scaleX: 1.4,
    });
    expect(
      specVisual(
        specSchema.parse({ object: 'bola', at: 'inside', of: 'kotak', say: 'bola di dalam kotak' }),
      ),
    ).toEqual({
      kind: 'scene',
      relation: 'inside',
      subject: 'bola',
      reference: 'kotak',
    });
    expect(specSchema.safeParse({ object: 'bola', at: 'inside' }).success).toBe(false);
    expect(specSchema.safeParse({ numeral: 3, scale: 1.2 }).success).toBe(false);
    expect(specSchema.safeParse({ fingers: 11 }).success).toBe(false);
  });
});

describe('pertama sampai kelima (P-MA-05)', () => {
  const modes = ['tap', 'ends', 'which', 'tap-two', 'next-to', 'ahead', 'build'];
  it('semua mode × tema lolos 200 soal acak', () => {
    for (const mode of modes)
      for (const theme of ['hewan', 'kendaraan'])
        expect(
          validateTemplate(tpl('queue', { mode, theme, length: [4, 5] })),
          `${mode} ${theme}`,
        ).toEqual([]);
    expect(validateTemplate(tpl('queue', { mode: 'tap', length: [3, 3], upTo: 3 }))).toEqual([]);
  });

  it('ketuk urutan ke-n: jawaban = anggota ke-n dari kiri', () => {
    for (const it of many('queue', { mode: 'tap' })) {
      const p = it.interaction as Pick1;
      const n = Number(p.answer.slice(1));
      expect(p.choices[n - 1]!.id).toBe(p.answer);
      expect(it.prompt).toContain(n === 1 ? 'pertama' : 'ke');
    }
  });

  it('ada berapa di depan = urutan − 1; susun antrean = urutan sesuai kalimat', () => {
    for (const it of many('queue', { mode: 'ahead', length: [4, 5] })) {
      const name = it.prompt.replace(/^Ada berapa yang di depan (.+)\?$/, '$1');
      const row = it.stimulus[0] as { items: { object: string }[] };
      const idx = row.items.findIndex((x) =>
        QUEUE_THEMES.hewan.some((o) => o === x.object && name.includes(o)),
      );
      expect(idx).toBeGreaterThan(0);
      expect((answerChoice(it).visual as { value: number }).value).toBe(idx);
    }
    for (const it of many('queue', { mode: 'build', length: [3, 4] })) {
      const o = it.interaction as Extract<Interaction, { type: 'order' }>;
      expect(checkAnswer(it, o.answer).correct).toBe(true);
    }
  });
});

describe('pagi, siang, malam (P-MA-14)', () => {
  const modes = ['when', 'which', 'sky', 'order-times', 'routine', 'order-day', 'after'];
  it('semua mode lolos 200 soal acak; kegiatan tidak bermakna ganda', () => {
    for (const mode of modes) expect(validateTemplate(tpl('day-time', { mode })), mode).toEqual([]);
    expect(validateTemplate(tpl('day-time', { mode: 'when', choices: [2, 2] }))).toEqual([]);
    expect(validateTemplate(tpl('day-time', { mode: 'routine', steps: [4, 4] }))).toEqual([]);
    const objects = ACTIVITIES.map((a) => a.object);
    expect(new Set(objects).size).toBe(objects.length);
  });

  it('kapan: jawaban = waktu kegiatan itu', () => {
    for (const it of many('day-time', { mode: 'when' })) {
      const obj = (it.stimulus[0] as { object: string }).object;
      const act = ACTIVITIES.find((a) => a.object === obj)!;
      expect((answerChoice(it).visual as { object: string }).object).toBe(act.time);
      expect(itemProblems(it)).toEqual([]);
    }
  });

  it('urutkan waktu & rutinitas: urutan jawaban benar', () => {
    for (const mode of ['order-times', 'routine', 'order-day'])
      for (const it of many('day-time', { mode })) {
        const o = it.interaction as Extract<Interaction, { type: 'order' }>;
        expect(checkAnswer(it, o.answer).correct).toBe(true);
        expect(checkAnswer(it, [...o.answer].reverse()).correct).toBe(false);
      }
  });
});

describe('pelajaran berhitung PAUD (skema)', () => {
  const ok = (s: Record<string, unknown>) =>
    lessonScreenSchema.safeParse({ teks: 'Halo', suara: 'Halo', ...s }).success;
  it('kartu gambar, antrean, jari, coba pilih & urut', () => {
    expect(
      ok({
        jenis: 'kenalan',
        kartuGambar: [
          { object: 'apel', count: 5 },
          { object: 'apel', count: 2 },
        ],
      }),
    ).toBe(true);
    expect(
      ok({
        jenis: 'cerita',
        kartuGambar: [{ object: 'kucing' }, { object: 'ayam' }],
        antrean: true,
      }),
    ).toBe(true);
    expect(ok({ jenis: 'cerita', antrean: true })).toBe(false);
    expect(ok({ jenis: 'kenalan', angka: [1, 2, 3, 4, 5], jari: true })).toBe(true);
    expect(ok({ jenis: 'kenalan', angka: [0, 1], jari: true })).toBe(false);
    expect(
      ok({ jenis: 'coba', mode: 'pilih', pilihan: [{ fingers: 2 }, { fingers: 3 }], jawaban: 1 }),
    ).toBe(true);
    expect(
      ok({ jenis: 'coba', mode: 'pilih', pilihan: [{ fingers: 2 }, { fingers: 3 }], jawaban: 2 }),
    ).toBe(false);
    expect(
      ok({ jenis: 'coba', mode: 'urut', pilihan: [{ object: 'pagi' }, { object: 'siang' }] }),
    ).toBe(true);
    expect(ok({ jenis: 'coba', mode: 'urut' })).toBe(false);
    expect(
      ok({ jenis: 'kata', kartu: [{ kata: 'pagi', sukuKata: 'pa-gi', gambar: 'pagi' }] }),
    ).toBe(true);
    expect(
      ok({
        jenis: 'kata',
        kartu: [{ kata: 'lingkaran', sukuKata: 'ling-ka-ran', visual: { shape: 'lingkaran' } }],
      }),
    ).toBe(true);
    expect(ok({ jenis: 'kata', kartu: [{ kata: 'pagi', sukuKata: 'pa-gi' }] })).toBe(false);
  });
});

describe('variasi gambar jari', () => {
  it('6–10 dibagi dua tangan (tiap tangan 1–5), warna kulit 0–2', () => {
    const splits = new Set<number>();
    for (const it of many('fingers', { mode: 'count', values: [6, 10] }, 120)) {
      const v = it.stimulus[0] as { count: number; tone: number; split: number };
      expect(v.split).toBeGreaterThanOrEqual(1);
      expect(v.count - v.split).toBeGreaterThanOrEqual(1);
      expect(v.count - v.split).toBeLessThanOrEqual(5);
      expect([0, 1, 2]).toContain(v.tone);
      splits.add(v.split);
    }
    expect(splits.size).toBeGreaterThan(2);
  });
});
