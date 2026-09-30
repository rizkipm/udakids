import { describe, expect, it } from 'vitest';
import {
  checkAnswer,
  generateItem,
  skillTemplateSchema,
  validateTemplate,
  type Item,
} from '../src/index.js';
import { timeText, timeWords } from '../src/generator/families/clock.js';

const tpl = (family: string, params: Record<string, unknown>, id = 'sains.sd34.a1.uji') =>
  skillTemplateSchema.parse({
    id,
    version: 1,
    domain: id.split('.')[0],
    grade: id.split('.')[1],
    category: 'A',
    order: 1,
    title: 'Uji family',
    tier: 'advanced',
    family,
    params,
  });

const items = (t: ReturnType<typeof tpl>, n = 40) =>
  Array.from({ length: n }, (_, seed) => generateItem(t, { seed, band: 1 }));

const choicesOf = (it: Item) => {
  const i = it.interaction;
  if (i.type !== 'pick-one') throw new Error(`bukan pick-one: ${i.type}`);
  return i;
};
const textOf = (c: { visual: { kind: string } }) => (c.visual as { text?: string }).text;

const TABLE = [
  { name: 'Jantung', attrs: { fungsi: 'memompa darah', sistem: 'peredaran darah' } },
  { name: 'Paru-paru', attrs: { fungsi: 'bernapas', sistem: 'pernapasan' } },
  { name: 'Lambung', attrs: { fungsi: 'mencerna makanan', sistem: 'pencernaan' } },
  { name: 'Usus halus', attrs: { fungsi: 'menyerap sari makanan', sistem: 'pencernaan' } },
  { name: 'Usus besar', attrs: { fungsi: 'menyerap air', sistem: 'pencernaan' } },
  { name: 'Ginjal', attrs: { fungsi: 'menyaring darah', sistem: 'pengeluaran' } },
];
const facts = (extra: Record<string, unknown>) =>
  tpl('facts', {
    table: TABLE,
    attr: 'fungsi',
    prompt: 'Soal {name} {value}',
    explain: '{name} berfungsi {value}.',
    source: 'Uji',
    ...extra,
  });
const valueOf = (name: string, attr: 'fungsi' | 'sistem') =>
  TABLE.find((r) => r.name === name)!.attrs[attr];

describe('family facts', () => {
  it('ask=value: jawaban = nilai milik entitas, pengecoh nilai entitas lain', () => {
    for (const it of items(facts({ ask: 'value', prompt: 'Apa fungsi {name}?' }))) {
      const i = choicesOf(it);
      const name = it.prompt.replace('Apa fungsi ', '').replace('?', '');
      const right = i.choices.find((c) => c.id === i.answer)!;
      expect(textOf(right)).toBe(valueOf(name, 'fungsi'));
      expect(i.choices).toHaveLength(4);
      expect(new Set(i.choices.map(textOf)).size).toBe(4);
    }
  });

  it('ask=name: tepat satu pilihan memiliki nilai yang ditanya', () => {
    for (const it of items(
      facts({ ask: 'name', attr: 'sistem', prompt: 'Organ sistem {value}?' }),
    )) {
      const i = choicesOf(it);
      const v = it.prompt.replace('Organ sistem ', '').replace('?', '');
      const owners = i.choices.filter((c) => valueOf(textOf(c)!, 'sistem') === v);
      expect(owners.map((c) => c.id)).toEqual([i.answer]);
    }
  });

  it('ask=true-false: kunci sesuai tabel; pernyataan salah dijelaskan dengan fakta subjeknya', () => {
    let sawFalse = false;
    for (const it of items(facts({ ask: 'true-false', prompt: '{name}|{value}' }), 60)) {
      const i = choicesOf(it);
      const [name, v] = it.prompt.split('|') as [string, string];
      const truth = valueOf(name, 'fungsi') === v;
      expect(i.answer).toBe(truth ? 'benar' : 'salah');
      expect(it.reteach.say).toBe(`${name} berfungsi ${valueOf(name, 'fungsi')}.`);
      if (!truth) sawFalse = true;
    }
    expect(sawFalse).toBe(true);
  });

  it('ask=odd: jawaban satu-satunya yang bukan anggota kelompok', () => {
    const t = facts({ ask: 'odd', attr: 'sistem', choices: 3, prompt: 'Bukan sistem {value}?' });
    for (const it of items(t)) {
      const i = choicesOf(it);
      const v = it.prompt.replace('Bukan sistem ', '').replace('?', '');
      const outsiders = i.choices.filter((c) => valueOf(textOf(c)!, 'sistem') !== v);
      expect(outsiders.map((c) => c.id)).toEqual([i.answer]);
    }
  });

  it('nilai array & only: entitas dengan banyak nilai tidak menjadi pengecoh', () => {
    const t = tpl('facts', {
      table: [
        { name: 'Bebek', attrs: { tempat: ['darat', 'air'] } },
        { name: 'Ikan', attrs: { tempat: 'air' } },
        { name: 'Kucing', attrs: { tempat: 'darat' } },
        { name: 'Sapi', attrs: { tempat: 'darat' } },
      ],
      attr: 'tempat',
      ask: 'name',
      only: ['air'],
      choices: 3,
      prompt: 'Hidup di {value}?',
      explain: '{name} hidup di {value}.',
      source: 'Uji',
    });
    for (const it of items(t)) {
      const i = choicesOf(it);
      expect(it.prompt).toBe('Hidup di air?');
      const right = textOf(i.choices.find((c) => c.id === i.answer)!);
      expect(['Bebek', 'Ikan']).toContain(right);
      expect(i.choices.filter((c) => ['Bebek', 'Ikan'].includes(textOf(c)!))).toHaveLength(1);
    }
  });

  it('pictures: pilihan berupa gambar benda; tanpa object ditolak skema', () => {
    const rows = [
      { name: 'Kucing', object: 'kucing', attrs: { jenis: 'hidup' } },
      { name: 'Ikan', object: 'ikan', attrs: { jenis: 'hidup' } },
      { name: 'Batu', object: 'batu', attrs: { jenis: 'tak hidup' } },
      { name: 'Bola', object: 'bola', attrs: { jenis: 'tak hidup' } },
    ];
    const base = {
      attr: 'jenis',
      ask: 'name',
      choices: 2,
      prompt: 'Mana yang {value}?',
      explain: '{name}.',
      source: 'Uji',
    };
    const it = generateItem(tpl('facts', { ...base, table: rows, pictures: true }), {
      seed: 3,
      band: 0,
    });
    expect(choicesOf(it).choices.every((c) => c.visual.kind === 'object')).toBe(true);
    const bad = {
      ...base,
      table: [...rows, { name: 'Meja', attrs: { jenis: 'tak hidup' } }],
      pictures: true,
    };
    expect(() => tpl('facts', bad)).toThrow(/object/);
  });

  it('skema menolak template tak dikenal & atribut yang terlalu jarang', () => {
    expect(() => facts({ prompt: 'Apa {nama}?' })).toThrow(/tidak dikenal/);
    expect(() => facts({ attr: 'warna' })).toThrow(/kurang dari 3/);
  });
});

describe('family clock', () => {
  it('nama waktu Bahasa Indonesia', () => {
    expect(timeText(3, 5)).toBe('03.05');
    expect(timeWords(3, 0)).toBe('pukul tiga');
    expect(timeWords(3, 30)).toBe('pukul setengah empat');
    expect(timeWords(12, 30)).toBe('pukul setengah satu');
    expect(timeWords(9, 15)).toBe('pukul sembilan lewat lima belas menit');
  });

  it('read & match: jawaban sesuai jam di stimulus, pilihan unik', () => {
    for (const mode of ['read', 'match'] as const) {
      const t = tpl('clock', { mode, minutes: [0, 30], choices: 3 }, 'math.tk.a1.jam');
      for (const it of items(t)) {
        const i = choicesOf(it);
        const s = it.stimulus[0] as { kind: string; hour: number; minute: number };
        expect(s.kind).toBe(mode === 'read' ? 'clock' : 'digital');
        expect(i.answer).toBe(`t${s.hour}-${s.minute}`);
        expect(new Set(i.choices.map((c) => c.id)).size).toBe(i.choices.length);
        expect(checkAnswer(it, i.answer).correct).toBe(true);
      }
      expect(validateTemplate(t)).toEqual([]);
    }
  });
});

describe('family mix', () => {
  it('setiap soal berasal dari salah satu bagian; bagian tidak valid ditolak', () => {
    const t = tpl(
      'mix',
      {
        parts: [
          { family: 'clock', params: { minutes: [0] } },
          { family: 'compare-numbers', params: { max: 10, mode: 'larger' }, weight: 2 },
        ],
      },
      'math.tk.a1.campur',
    );
    const kinds = new Set(
      items(t, 60).map((it) => (it.prompt.startsWith('Jam') ? 'clock' : 'compare')),
    );
    expect(kinds).toEqual(new Set(['clock', 'compare']));
    expect(validateTemplate(t)).toEqual([]);
    expect(() =>
      tpl(
        'mix',
        { parts: [{ family: 'clock', params: { minutes: [99] } }, { family: 'clock' }] },
        'math.tk.a1.x',
      ),
    ).toThrow(/clock/);
  });
});

describe('family manual', () => {
  const bank = (n: number) =>
    Array.from({ length: n }, (_, k) => ({
      prompt: `Soal ${k}`,
      choices: [
        { visual: { kind: 'text', text: 'ya' } },
        { visual: { kind: 'text', text: 'tidak' } },
      ],
      answer: 0,
    }));

  it('10 seed berurutan dalam satu ronde tidak mengulang soal bila bank ≥ 10', () => {
    const t = tpl('manual', { items: bank(12) });
    for (const base of [0, 10, 37, 1000]) {
      const prompts = Array.from(
        { length: 10 },
        (_, k) => generateItem(t, { seed: base + k, band: 1 }).prompt,
      );
      expect(new Set(prompts).size).toBe(10);
    }
  });
});

describe('expr: labels & {w:}', () => {
  it('labels menjadi pilihan kategori dengan satu jawaban benar', () => {
    const t = tpl(
      'expr',
      {
        vars: { a: [1, 20] },
        answer: 'a % 2',
        labels: { '0': 'genap', '1': 'ganjil' },
        prompt: 'Bilangan {a} termasuk?',
        explain: '{a} adalah {answer}.',
      },
      'math.sd12.a1.genap',
    );
    for (const it of items(t)) {
      const i = choicesOf(it);
      const a = Number(it.prompt.match(/\d+/)![0]);
      expect(textOf(i.choices.find((c) => c.id === i.answer)!)).toBe(a % 2 ? 'ganjil' : 'genap');
      expect(i.choices.map(textOf).sort()).toEqual(['ganjil', 'genap']);
    }
    expect(() =>
      tpl(
        'expr',
        {
          vars: { a: [1, 5] },
          answer: 'a',
          labels: { '1': 'x' },
          mode: 'input',
          prompt: '{a}',
          explain: '-',
        },
        'math.sd12.a1.y',
      ),
    ).toThrow();
  });

  it('{w:a} menulis bilangan dalam kata', () => {
    const t = tpl(
      'expr',
      {
        vars: { a: { values: [7] } },
        answer: 'a',
        prompt: 'Tulis angka {w:a}.',
        explain: '{w:a} = {a}',
      },
      'math.sd12.a1.kata',
    );
    const it = generateItem(t, { seed: 1, band: 0 });
    expect(it.prompt).toBe('Tulis angka tujuh.');
  });
});

describe('visual baru (jam, puluhan, tabel angka, venn, ukur)', () => {
  it('menerima bentuk yang benar dan menolak nilai di luar batas', async () => {
    const { visualSchema } = await import('../src/generator/visual-schema.js');
    const ok = [
      { kind: 'clock', hour: 3, minute: 30 },
      { kind: 'digital', hour: 15, minute: 5 },
      { kind: 'tens', tens: 2, ones: 7 },
      { kind: 'number-chart', start: 1, end: 20, columns: 10, blanks: [7] },
      { kind: 'venn', a: 'merah', b: 'bulat', onlyA: 2, onlyB: 1, both: 3, object: 'apel' },
      { kind: 'measure', object: 'pensil', length: 5, direction: 'horizontal', showCubes: true },
    ];
    for (const v of ok) expect(visualSchema.safeParse(v).success, v.kind).toBe(true);
    const bad = [
      { kind: 'clock', hour: 13, minute: 0 },
      { kind: 'tens', tens: 11, ones: 0 },
      { kind: 'measure', object: 'pensil', length: 20, direction: 'horizontal', showCubes: false },
    ];
    for (const v of bad) expect(visualSchema.safeParse(v).success, v.kind).toBe(false);
  });
});

describe('katalog: materi topik (D-026)', () => {
  it('intro & tips opsional; tips maks 3, intro maks 300 huruf', async () => {
    const { catalogSchema } = await import('../src/index.js');
    const base = { domain: 'math', grade: 'tk', title: 'Math Kindergarten' };
    const cat = (extra: Record<string, unknown>) =>
      catalogSchema.safeParse({
        ...base,
        categories: [{ code: 'A', title: 'Bilangan', ...extra }],
      });
    expect(cat({}).success).toBe(true);
    expect(
      cat({ intro: 'Angka memberi tahu banyak benda.', tips: ['Satu', 'Dua', 'Tiga'] }).success,
    ).toBe(true);
    expect(cat({ tips: ['a1', 'b2', 'c3', 'd4'] }).success).toBe(false);
    expect(cat({ intro: 'x'.repeat(301) }).success).toBe(false);
  });
});

describe('expr: satuan tidak tertulis dua kali', () => {
  it('"{answer} cm" dengan unit cm → "… cm", bukan "… cm cm"', async () => {
    const { skillTemplateSchema: sch, generateItem: gen } = await import('../src/index.js');
    const t = sch.parse({
      id: 'math.sd2.hh8.uji-satuan',
      version: 1,
      domain: 'math',
      grade: 'sd2',
      category: 'H',
      order: 8,
      title: 'Uji satuan',
      tier: 'intermediate',
      family: 'expr',
      params: {
        vars: { a: [10, 40], b: [10, 40] },
        answer: 'a + b',
        unit: 'cm',
        prompt: 'Pita {a} cm disambung pita {b} cm. Berapa panjangnya?',
        explain: '{a} + {b} = {answer} cm. Juga menit menit tetap bila bukan satuan.',
      },
    });
    const it = gen(t, { seed: 4, band: 1 });
    expect(it.reteach.say).toMatch(/= \d+ cm\. /);
    expect(it.reteach.say).not.toMatch(/cm cm/);
    expect(it.reteach.say).toContain('menit menit'); // hanya satuan jawaban yang dirapikan
  });
});
