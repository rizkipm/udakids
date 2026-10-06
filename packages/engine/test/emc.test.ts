import { describe, expect, it } from 'vitest';
import {
  ALL_SHAPE_IDS,
  SHAPE_IDS,
  catalogSchema,
  checkAnswer,
  generateItem,
  itemProblems,
  skillTemplateSchema,
  validateTemplate,
  visualSchema,
  type Item,
} from '../src/index.js';

const tpl = (family: string, params: Record<string, unknown>, id = 'math.tkosn.f1.uji') =>
  skillTemplateSchema.parse({
    id,
    version: 1,
    domain: 'math',
    grade: 'tkosn',
    category: 'F',
    order: 1,
    title: 'Uji EMC',
    tier: 'basic',
    family,
    params,
  });

const items = (t: ReturnType<typeof tpl>, n = 60) =>
  Array.from({ length: n }, (_, seed) => generateItem(t, { seed, band: seed % 3 }));

const nums = (ids: string[]) => ids.map((id) => Number(id.slice(1)));

describe('EMC TK (D-069): aset baru', () => {
  it('belah ketupat bisa digambar tetapi bukan bentuk bawaan generator', () => {
    expect(ALL_SHAPE_IDS).toContain('belah-ketupat');
    expect(SHAPE_IDS).not.toContain('belah-ketupat');
    expect(SHAPE_IDS).toHaveLength(6);
  });

  it('visual dadu hanya bermata 1–6', () => {
    expect(visualSchema.safeParse({ kind: 'die', value: 6 }).success).toBe(true);
    expect(visualSchema.safeParse({ kind: 'die', value: 3, color: 'merah' }).success).toBe(true);
    expect(visualSchema.safeParse({ kind: 'die', value: 0 }).success).toBe(false);
    expect(visualSchema.safeParse({ kind: 'die', value: 7 }).success).toBe(false);
  });

  it('kategori katalog boleh punya `group`', () => {
    const base = { domain: 'math', grade: 'tkosn', title: 'Math TK (OSN)' };
    const ok = catalogSchema.safeParse({
      ...base,
      categories: [{ code: 'F', title: 'Pasar buah', group: 'EMC', standalone: true }],
    });
    expect(ok.success).toBe(true);
    const bad = catalogSchema.safeParse({
      ...base,
      categories: [{ code: 'F', title: 'Pasar buah', group: 'x' }],
    });
    expect(bad.success).toBe(false);
  });
});

describe('number-order: ratusan, kelipatan, dan urutan menurun', () => {
  it('ratusan bulat dari yang terkecil', () => {
    const t = tpl('number-order', {
      min: 100,
      max: 900,
      step: 100,
      length: [3, 4],
      consecutive: false,
    });
    for (const it of items(t)) {
      const i = it.interaction;
      if (i.type !== 'order') throw new Error(i.type);
      const v = nums(i.answer);
      expect(v.every((n) => n % 100 === 0 && n >= 100 && n <= 900)).toBe(true);
      expect([...v].sort((a, b) => a - b)).toEqual(v);
      expect(checkAnswer(it, i.answer).correct).toBe(true);
    }
  });

  it('dari yang terbesar', () => {
    const t = tpl('number-order', {
      min: 100,
      max: 999,
      length: [3, 4],
      consecutive: false,
      direction: 'desc',
    });
    for (const it of items(t)) {
      const i = it.interaction;
      if (i.type !== 'order') throw new Error(i.type);
      const v = nums(i.answer);
      expect([...v].sort((a, b) => b - a)).toEqual(v);
      expect(v.every((n) => n >= 100)).toBe(true);
      expect(it.prompt).toContain('paling besar');
    }
  });

  it('berurutan dengan step mengikuti kelipatannya', () => {
    const t = tpl('number-order', { min: 10, max: 90, step: 10, length: [3, 3] });
    for (const it of items(t)) {
      const i = it.interaction;
      if (i.type !== 'order') throw new Error(i.type);
      const [a, b, c] = nums(i.answer);
      expect([b! - a!, c! - b!]).toEqual([10, 10]);
    }
  });

  it('min ≥ max ditolak saat membuat soal', () => {
    const t = tpl('number-order', { min: 50, max: 40 });
    expect(validateTemplate(t, 3).join()).toMatch(/min harus lebih kecil/);
  });

  it('nilai bawaan tetap sama seperti sebelumnya (1..max, menaik)', () => {
    const t = tpl('number-order', { max: 10, length: [3, 3] });
    for (const it of items(t)) {
      const i = it.interaction;
      if (i.type !== 'order') throw new Error(i.type);
      const v = nums(i.answer);
      expect(v[1]! - v[0]!).toBe(1);
      expect(v[0]).toBeGreaterThanOrEqual(1);
      expect(it.reteach.say).toMatch(/^Kita hitung/);
    }
  });
});

describe('expr: labelSay untuk tanda <, >, =', () => {
  const params = {
    vars: { a: [1, 6], b: [1, 6] },
    prompt: 'Tanda yang tepat: {a} … {b}',
    stimulus: [
      { kind: 'die', value: '=a' },
      { kind: 'text', text: '…' },
      { kind: 'die', value: '=b' },
    ],
    answer: '(a > b) * 1 + (a < b) * 2 + (a == b) * 3',
    labels: { '1': '>', '2': '<', '3': '=' },
    labelSay: { '1': 'lebih dari', '2': 'kurang dari', '3': 'sama dengan' },
    explain: '{a} {answer_say} {b}.',
  };

  it('pilihan dibacakan dengan kata, pembahasan memakai {answer_say}', () => {
    for (const it of items(tpl('expr', params))) {
      const i = it.interaction;
      if (i.type !== 'pick-one') throw new Error(i.type);
      expect(i.choices.map((c) => c.say).sort()).toEqual([
        'kurang dari',
        'lebih dari',
        'sama dengan',
      ]);
      const [a, b] = it.stimulus
        .filter((v) => v.kind === 'die')
        .map((v) => (v as { value: number }).value);
      const word = a! > b! ? 'lebih dari' : a! < b! ? 'kurang dari' : 'sama dengan';
      expect(it.reteach.say).toBe(`${a} ${word} ${b}.`);
      expect(i.choices.find((c) => c.id === i.answer)?.say).toBe(word);
    }
  });

  it('labelSay untuk kunci yang tidak ada di labels ditolak', () => {
    expect(() => tpl('expr', { ...params, labelSay: { '9': 'apa' } })).toThrow(/labelSay/);
  });
});

describe('match-pairs (tarik garis)', () => {
  const pair = (n: number, shape: string) => ({
    left: { visual: { kind: 'numeral', value: n }, say: String(n) },
    right: { visual: { kind: 'shape', shape, color: 'biru', size: 'm' } },
  });
  const t = tpl('match-pairs', {
    items: [
      {
        prompt: 'Pasangkan.',
        pairs: [pair(1, 'lingkaran'), pair(2, 'segitiga'), pair(3, 'belah-ketupat')],
      },
      { prompt: 'Pasangkan lagi.', pairs: [pair(4, 'persegi'), pair(5, 'segi-lima')] },
    ],
  });

  it('menghasilkan soal match yang valid dan jawaban kunci diterima', () => {
    const seen = new Set<string>();
    for (const it of items(t, 20) as Item[]) {
      const i = it.interaction;
      if (i.type !== 'match') throw new Error(i.type);
      seen.add(it.prompt);
      expect(itemProblems(it)).toEqual([]);
      expect(i.right).toHaveLength(i.left.length);
      expect(checkAnswer(it, i.answer).correct).toBe(true);
      const wrong = { ...i.answer, l0: i.answer.l1!, l1: i.answer.l0! };
      expect(checkAnswer(it, wrong).correct).toBe(false);
    }
    expect(seen.size).toBe(2);
  });

  it('butuh minimal 2 pasangan', () => {
    expect(() =>
      tpl('match-pairs', { items: [{ prompt: 'x', pairs: [pair(1, 'lingkaran')] }] }),
    ).toThrow();
  });
});

describe('bangun datar dengan belah ketupat', () => {
  const pool = ['lingkaran', 'segitiga', 'persegi', 'persegi-panjang', 'belah-ketupat'];

  it('real-world-shape memakai pool, termasuk ketupat → belah ketupat', () => {
    const t = tpl('real-world-shape', { kind: 'flat', pool, choices: 3 });
    const objects = new Set<string>();
    for (const it of items(t, 120)) {
      const obj = it.stimulus[0] as { object: string };
      objects.add(obj.object);
      const i = it.interaction;
      if (i.type !== 'pick-one') throw new Error(i.type);
      for (const c of i.choices) expect(pool).toContain((c.visual as { shape: string }).shape);
      if (obj.object === 'ketupat') expect(i.answer).toBe('s-belah-ketupat');
    }
    expect(objects.has('ketupat')).toBe(true);
  });

  it('tanpa pool, ketupat dan belah ketupat tidak muncul (soal lama tidak berubah)', () => {
    const t = tpl('real-world-shape', { kind: 'flat', choices: 3 });
    for (const it of items(t, 120)) {
      expect((it.stimulus[0] as { object: string }).object).not.toBe('ketupat');
      const i = it.interaction;
      if (i.type !== 'pick-one') throw new Error(i.type);
      expect(i.answer).not.toBe('s-belah-ketupat');
    }
  });

  it('persegi tidak pernah diputar 45° (tidak tertukar dengan belah ketupat)', () => {
    const t = tpl('shape-tap', { kind: 'flat', pool, tiles: [6, 8] });
    for (const it of items(t, 120)) {
      const i = it.interaction;
      if (i.type !== 'tap-all') throw new Error(i.type);
      for (const c of i.choices) {
        const v = c.visual as { shape: string; rotate?: number };
        if (v.shape === 'persegi') expect(v.rotate).not.toBe(45);
      }
    }
  });

  it('shape-name mengenal belah ketupat bila ada di pool', () => {
    const t = tpl('shape-name', { kind: 'flat', pool, choices: 3 });
    const answers = new Set(
      items(t, 120).map((it) => (it.interaction as { answer: string }).answer),
    );
    expect(answers.has('w-belah-ketupat')).toBe(true);
  });
});

describe('ESC Sains TK (D-070): lengkapi nama & tubuh', () => {
  const t = tpl('spell-word', {
    items: [
      {
        prompt: 'Lengkapi.',
        stimulus: [{ kind: 'object', object: 'gurita' }],
        word: 'GURITA',
        show: 'G_R_T_',
      },
    ],
  });

  it('kotak kosong sesuai pola, kartu = huruf hilang + pengecoh', () => {
    for (const it of items(t, 30)) {
      const i = it.interaction;
      if (i.type !== 'spell') throw new Error(i.type);
      expect(i.slots).toEqual(['G', null, 'R', null, 'T', null]);
      expect(i.answer).toEqual(['U', 'I', 'A']);
      expect(i.letters).toHaveLength(5);
      const extra = i.letters
        .map((c) => (c.visual as { text: string }).text)
        .filter((x) => !['U', 'I', 'A'].includes(x));
      expect(extra.every((x) => !'GURITA'.includes(x))).toBe(true);
      expect(itemProblems(it)).toEqual([]);
      expect(checkAnswer(it, ['u', 'i', 'a']).correct).toBe(true);
      expect(checkAnswer(it, ['I', 'U', 'A']).correct).toBe(false);
      expect(checkAnswer(it, ['U', 'I']).correct).toBe(false);
    }
  });

  it('pola bawaan: huruf pertama tampil lalu berselang-seling', () => {
    const d = tpl('spell-word', { items: [{ prompt: 'x', word: 'MATA' }] });
    const i = generateItem(d, { seed: 1, band: 0 }).interaction;
    if (i.type !== 'spell') throw new Error(i.type);
    expect(i.slots).toEqual(['M', null, 'T', null]);
    expect(i.answer).toEqual(['A', 'A']);
  });

  it('pola yang tidak cocok dengan kata ditolak', () => {
    expect(() =>
      tpl('spell-word', { items: [{ prompt: 'x', word: 'PAUS', show: 'X___' }] }),
    ).toThrow();
    expect(() =>
      tpl('spell-word', { items: [{ prompt: 'x', word: 'PAUS', show: 'PAUS' }] }),
    ).toThrow();
    expect(() =>
      tpl('spell-word', { items: [{ prompt: 'x', word: 'PAU', show: 'P___' }] }),
    ).toThrow();
    expect(() => tpl('spell-word', { items: [{ prompt: 'x', word: 'paus' }] })).toThrow();
  });

  it('visual tubuh hanya menerima bagian yang dikenal', () => {
    expect(visualSchema.safeParse({ kind: 'body', part: 'telinga' }).success).toBe(true);
    expect(visualSchema.safeParse({ kind: 'body' }).success).toBe(true);
    expect(visualSchema.safeParse({ kind: 'body', part: 'sayap' }).success).toBe(false);
  });

  it('bank soal manual menerima sampai 10 gambar (silang semua)', () => {
    const choices = Array.from({ length: 10 }, (_, k) => ({
      visual: { kind: 'numeral', value: k },
    }));
    expect(() =>
      tpl('manual', { items: [{ prompt: 'x', choices, answer: [0, 1] }] }),
    ).not.toThrow();
    const eleven = [...choices, { visual: { kind: 'numeral', value: 10 } }];
    expect(() => tpl('manual', { items: [{ prompt: 'x', choices: eleven, answer: 0 }] })).toThrow();
  });
});
