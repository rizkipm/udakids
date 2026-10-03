import { describe, expect, it } from 'vitest';
import {
  allVisuals,
  checkAnswer,
  FAMILIES,
  FAMILY_NAMES,
  generateItem,
  GeneratorError,
  itemProblems,
  OBJECT_IDS,
  skillTemplateSchema,
  validateSkillContent,
  validateTemplate,
  type AnswerValue,
  type FamilyName,
  type Item,
  type ItemCore,
  type SkillTemplate,
} from '../src/index.js';

const tpl = (
  family: FamilyName,
  params: Record<string, unknown> = {},
  over: Partial<SkillTemplate> = {},
): SkillTemplate =>
  skillTemplateSchema.parse({
    id: `test.${family}`,
    version: 1,
    domain: 'math',
    grade: 'prek',
    category: 'A',
    order: 1,
    title: 'Skill uji',
    tier: 'basic',
    family,
    params,
    ...over,
  });

/** Jawaban benar untuk soal apa pun. */
function correctAnswer(item: Item): AnswerValue {
  const it = item.interaction;
  switch (it.type) {
    case 'pick-one':
    case 'number-line':
      return it.answer;
    case 'tap-all':
    case 'order':
      return it.answer;
    case 'group':
    case 'match':
      return it.answer;
    case 'build':
      return it.target;
    case 'number-input':
      return it.answer;
  }
}

// Setiap family × mode/varian penting. Tiap kasus dihasilkan 60× (3 band) dan harus bebas masalah.
const CASES: [FamilyName, Record<string, unknown>][] = [
  ['numeral-tap-all', {}],
  ['numeral-tap-all', { values: [1, 20], tiles: [5, 6] }],
  ['numeral-listen', { values: [1, 10], choices: 4 }],
  ...(['objects', 'dots', 'shapes', 'cubes', 'frame', 'stickers'] as const).flatMap((visual) =>
    (['row', 'rows', 'scatter', 'ring'] as const).map(
      (layout) =>
        ['count', { visual, layout, range: [1, 10] }] as [FamilyName, Record<string, unknown>],
    ),
  ),
  ['count', { visual: 'frame', range: [0, 20], countAlong: true, objects: ['apel'] }],
  ...(['cube', 'frame', 'sticker', 'object'] as const).map(
    (unit) => ['build', { unit, range: [1, 12] }] as [FamilyName, Record<string, unknown>],
  ),
  ...(['objects', 'dots', 'shapes', 'cubes', 'frame'] as const).map(
    (visual) => ['represent', { visual, range: [1, 7] }] as [FamilyName, Record<string, unknown>],
  ),
  ['number-order', {}],
  ['number-order', { consecutive: false, max: 10, length: [4, 5] }],
  ['number-next', {}],
  ['number-next', { mode: 'missing', max: 20, length: [4, 6] }],
  ['number-line', {}],
  ['ordinal', {}],
  ['ordinal', { length: 10, maxOrdinal: 10 }],
  ['one-more-less', { mode: 'more' }],
  ['one-more-less', { mode: 'less', range: [1, 10] }],
  ...(['larger', 'largest', 'smaller', 'smallest'] as const).map(
    (mode) => ['compare-numbers', { mode }] as [FamilyName, Record<string, unknown>],
  ),
  ...(
    [
      'more',
      'fewer',
      'match',
      'count',
      'mixed',
      'more-fewer-same',
      'enough',
      'same-number',
      'equal-count',
    ] as const
  ).map((mode) => ['compare-groups', { mode }] as [FamilyName, Record<string, unknown>]),
  ...(['color', 'size', 'shape', 'object'] as const).map(
    (attribute) =>
      ['pattern', { attribute, units: ['AB', 'AAB', 'ABB', 'ABC', 'AABB'] }] as [
        FamilyName,
        Record<string, unknown>,
      ],
  ),
  ...(['color', 'shape', 'object'] as const).flatMap((attribute) =>
    (['different', 'same', 'pair'] as const).map(
      (mode) => ['same-different', { attribute, mode }] as [FamilyName, Record<string, unknown>],
    ),
  ),
  ['sort', { attribute: 'color', mode: 'tap-all' }],
  ['sort', { attribute: 'color', mode: 'group', groups: 3 }],
  ['sort', { attribute: 'shape', mode: 'tap-all' }],
  ['sort', { attribute: 'shape', mode: 'group' }],
  ['sort', { attribute: 'flat-solid' }],
  ['shape-tap', {}],
  ['shape-tap', { targets: ['lingkaran'] }],
  ['shape-tap', { kind: 'solid', targets: ['kubus'] }],
  ['shape-tap', { kind: 'solid-among-mixed' }],
  ['shape-name', {}],
  ['shape-name', { kind: 'solid', choices: 4 }],
  ['shape-sides', { ask: 'sides' }],
  ['shape-sides', { ask: 'either', pool: ['lingkaran', 'segitiga'] }],
  ['solid-describe', {}],
  ['solid-describe', { property: 'rolls' }],
  ['solid-describe', { property: 'stacks' }],
  ['solid-trace', {}],
  ['real-world-shape', {}],
  ['real-world-shape', { kind: 'solid', choices: 4 }],
  ...(
    [
      'front-behind',
      'inside-outside',
      'above-below',
      'beside',
      'left-right',
      'left-middle-right',
      'top-bottom',
      'top-middle-bottom',
    ] as const
  ).map((mode) => ['position', { mode }] as [FamilyName, Record<string, unknown>]),
  ...(['long', 'tall', 'wide', 'heavy', 'capacity', 'mixed'] as const).map(
    (attribute) => ['size-compare', { attribute }] as [FamilyName, Record<string, unknown>],
  ),
  ['size-compare', { attribute: 'long', ask: 'more' }],
  ['size-compare', { attribute: 'tall', ask: 'less' }],
  ['money', { mode: 'identify', coins: [100, 200, 500, 1000] }],
  ['money', { mode: 'count', coins: [100] }],
  ...(
    [
      'pictures',
      'cubes',
      'put-together',
      'train-words',
      'train-sentence',
      'sentence',
      'model-match',
      'model-show',
      'word-problem',
    ] as const
  ).flatMap(
    (presentation) =>
      [
        [
          'arith',
          {
            presentation,
            constraint: 'a + b <= 5',
            distractors: ['a + b + 1', { expr: 'a', tag: 'hanya-satu' }],
          },
        ],
        [
          'arith',
          {
            presentation,
            op: '-',
            vars: { a: [2, 10], b: [1, 9] },
            constraint: 'b < a',
            answer: 'a - b',
            hidePictures: true,
          },
        ],
      ] as [FamilyName, Record<string, unknown>][],
  ),
  [
    'expr',
    {
      vars: { a: [2, 9], b: [2, 9] },
      prompt: 'KPK {a} dan {b}?',
      answer: 'lcm(a, b)',
      distractors: ['a * b', 'gcd(a, b)'],
      explain: '{answer}',
    },
  ],
  [
    'expr',
    {
      vars: { a: [1, 3] },
      format: 'fraction',
      prompt: '{a}/5 + 1/5',
      fraction: { num: 'a + 1', den: '5' },
      distractors: [
        { num: 'a + 1', den: '10', tag: 'x' },
        { num: 'a + 2', den: '5', tag: 'y' },
        { num: 'a', den: '5', tag: 'z' },
      ],
      explain: '{answer}',
    },
  ],
  [
    'expr',
    {
      vars: { a: { range: [0.1, 0.9], step: 0.1 } },
      format: 'decimal',
      prompt: '{a} + 0,5',
      answer: 'a + 0.5',
      mode: 'input',
      explain: '{answer}',
    },
  ],
  [
    'manual',
    {
      items: [
        {
          prompt: 'Mana yang apel?',
          choices: [
            { visual: { kind: 'object', object: 'apel' }, say: 'apel' },
            { visual: { kind: 'object', object: 'bola' }, tag: 'lain' },
          ],
          answer: 0,
        },
        {
          prompt: 'Ketuk semua bintang.',
          say: 'Ketuk semua bintang.',
          stimulus: [{ kind: 'row', items: [{ kind: 'numeral', value: 2 }] }],
          choices: [
            { visual: { kind: 'object', object: 'bintang' } },
            { visual: { kind: 'object', object: 'bintang', color: 'biru' } },
            { visual: { kind: 'object', object: 'bola' } },
          ],
          answer: [0, 1],
        },
      ],
    },
  ],
  [
    'facts',
    {
      table: [
        { name: 'Kucing', object: 'kucing', attrs: { jenis: 'makhluk hidup' } },
        { name: 'Ikan', object: 'ikan', attrs: { jenis: 'makhluk hidup' } },
        { name: 'Batu', object: 'batu', attrs: { jenis: 'benda tak hidup' } },
        { name: 'Bola', object: 'bola', attrs: { jenis: 'benda tak hidup' } },
      ],
      attr: 'jenis',
      ask: 'name',
      choices: 2,
      pictures: true,
      prompt: 'Ketuk yang merupakan {value}.',
      explain: '{name} adalah {value}.',
      source: 'NGSS K-LS1-1',
    },
  ],
  ['clock', { mode: 'read', minutes: [0, 30] }],
  ['clock', { mode: 'match', minutes: [0, 15, 30, 45], choices: 4 }],
  [
    'mix',
    {
      parts: [
        { family: 'clock', params: { minutes: [0] } },
        { family: 'compare-numbers', params: { max: 10, mode: 'larger' } },
      ],
    },
  ],
];

describe('semua family', () => {
  it('setiap family terdaftar punya deskripsi dan diuji', () => {
    const tested = new Set(CASES.map(([f]) => f));
    for (const name of FAMILY_NAMES) {
      expect(FAMILIES[name].description.length).toBeGreaterThan(5);
      expect(tested.has(name), `family ${name} belum diuji`).toBe(true);
    }
  });

  it.each(CASES.map(([f, p], i) => [`${i}:${f} ${JSON.stringify(p).slice(0, 60)}`, f, p] as const))(
    '%s → 60 soal valid, jawaban benar diterima',
    (_label, family, params) => {
      const t = tpl(family, params);
      for (let seed = 0; seed < 60; seed++) {
        const item = generateItem(t, { seed, band: seed % 3 });
        expect(itemProblems(item)).toEqual([]);
        expect(checkAnswer(item, correctAnswer(item)).correct).toBe(true);
        for (const v of allVisuals(item)) {
          if (v.kind === 'objects' || v.kind === 'object') expect(OBJECT_IDS).toContain(v.object);
        }
        expect(item.prompt.charAt(0)).toBe(item.prompt.charAt(0).toUpperCase());
      }
    },
  );

  it('deterministik: seed + band sama → soal sama', () => {
    const t = tpl('count', { range: [1, 10] });
    expect(generateItem(t, { seed: 5, band: 1 })).toEqual(generateItem(t, { seed: 5, band: 1 }));
    expect(generateItem(t, { seed: 5, band: 7 }).band).toBe(2);
    expect(generateItem(t, { seed: 5, band: -3 }).band).toBe(0);
  });

  it('bands mengubah params', () => {
    const t = tpl(
      'count',
      {},
      { bands: [{ range: [1, 1] }, { range: [2, 2] }, { range: [3, 3] }] },
    );
    for (const band of [0, 1, 2]) {
      const it = generateItem(t, { seed: 1, band }).interaction;
      expect(it.type === 'pick-one' && it.answer).toBe(`n${band + 1}`);
    }
  });
});

describe('checkAnswer & chosenDistractor', () => {
  it('pick-one mencatat tag pengecoh', () => {
    const t = tpl('arith', {
      presentation: 'pictures',
      vars: { a: [2, 2], b: [2, 2] },
      distractors: [{ expr: 'a', tag: 'hanya-satu' }],
    });
    const item = generateItem(t, { seed: 1, band: 0 });
    expect(checkAnswer(item, 'n2')).toEqual({ correct: false, chosenDistractor: 'hanya-satu' });
    expect(checkAnswer(item, 'tidak-ada')).toEqual({ correct: false });
    expect(checkAnswer(item, 'n4')).toEqual({ correct: true });
  });

  it('tap-all, order, group, build, number-line menolak jawaban keliru', () => {
    const tap = generateItem(tpl('numeral-tap-all'), { seed: 1, band: 1 });
    expect(checkAnswer(tap, []).correct).toBe(false);
    expect(checkAnswer(tap, 'x').correct).toBe(false);
    const ord = generateItem(tpl('number-order'), { seed: 1, band: 1 });
    const answer = (ord.interaction as { answer: string[] }).answer;
    expect(checkAnswer(ord, [...answer].reverse()).correct).toBe(false);
    expect(checkAnswer(ord, answer.slice(1)).correct).toBe(false);
    const grp = generateItem(tpl('sort'), { seed: 1, band: 1 });
    expect(checkAnswer(grp, {}).correct).toBe(false);
    expect(checkAnswer(grp, ['x']).correct).toBe(false);
    const bld = generateItem(tpl('build'), { seed: 1, band: 1 });
    expect(checkAnswer(bld, 99).correct).toBe(false);
    const line = generateItem(tpl('number-line'), { seed: 1, band: 1 });
    expect(checkAnswer(line, -1).correct).toBe(false);
    const match: ItemCore = {
      prompt: 'x',
      stimulus: [],
      reteach: { say: 'x' },
      interaction: {
        type: 'match',
        left: [{ id: 'a', visual: { kind: 'numeral', value: 1 } }],
        right: [{ id: 'b', visual: { kind: 'numeral', value: 2 } }],
        answer: { a: 'b' },
      },
    };
    expect(checkAnswer(match, { a: 'b' }).correct).toBe(true);
    expect(itemProblems(match)).toEqual([]);
  });
});

describe('itemProblems (aturan kualitas)', () => {
  const base = { prompt: 'Soal', stimulus: [], reteach: { say: 'x' } };
  const n = (id: string, value: number) => ({ id, visual: { kind: 'numeral', value } as const });

  it('mendeteksi soal rusak', () => {
    const bad: ItemCore[] = [
      { ...base, interaction: { type: 'pick-one', choices: [n('a', 1)], answer: 'z' } },
      { ...base, interaction: { type: 'pick-one', choices: [n('a', 1), n('b', 1)], answer: 'a' } },
      { ...base, interaction: { type: 'pick-one', choices: [n('a', 1), n('a', 2)], answer: 'a' } },
      { ...base, interaction: { type: 'tap-all', choices: [n('a', 1)], answer: [] } },
      { ...base, interaction: { type: 'tap-all', choices: [n('a', 1)], answer: ['a'] } },
      { ...base, interaction: { type: 'tap-all', choices: [n('a', 1), n('b', 2)], answer: ['z'] } },
      { ...base, interaction: { type: 'order', choices: [n('a', 1), n('b', 1)], answer: ['a'] } },
      {
        ...base,
        interaction: { type: 'group', groups: [n('g', 1)], items: [n('a', 1)], answer: { a: 'x' } },
      },
      {
        ...base,
        interaction: { type: 'group', groups: [n('g', 1)], items: [n('a', 1)], answer: {} },
      },
      { ...base, interaction: { type: 'build', target: 9, unit: 'cube', max: 3 } },
      { ...base, interaction: { type: 'number-line', min: 0, max: 5, answer: 9 } },
      {
        ...base,
        prompt: 'x'.repeat(501),
        interaction: { type: 'build', target: 1, unit: 'cube', max: 3 },
      },
      {
        ...base,
        stimulus: [
          { kind: 'objects', object: 'naga' as never, count: -1, layout: 'row' },
          { kind: 'frame', filled: 9, size: 5 },
        ],
        interaction: { type: 'build', target: 1, unit: 'cube', max: 3 },
      },
      {
        ...base,
        stimulus: [
          { kind: 'scene', relation: 'inside', subject: 'naga' as never, reference: 'kotak' },
          { kind: 'mixed', parts: [{ object: 'naga' as never, count: 1 }] },
        ],
        interaction: { type: 'build', target: 1, unit: 'cube', max: 3 },
      },
    ];
    for (const item of bad)
      expect(itemProblems(item).length, JSON.stringify(item.interaction)).toBeGreaterThan(0);
  });
});

describe('skillTemplateSchema & validateTemplate', () => {
  it('menolak params yang tidak cocok dengan family (per band)', () => {
    expect(() => tpl('count', { range: [5, 1] })).toThrow(/rentang terbalik/);
    expect(() => tpl('count', {}, { bands: [{}, {}, { visual: 'naga' }] })).toThrow(/band 2/);
    expect(() => tpl('arith', { answer: 'a + z' })).toThrow(/variabel tak dikenal/);
    expect(() => tpl('arith', { answer: 'a +' })).toThrow(/tidak valid/);
    expect(() => tpl('arith', { vars: { a: [1, 2] } })).toThrow(/a dan b/);
    expect(() =>
      tpl('manual', {
        items: [
          {
            prompt: 'x',
            choices: [
              { visual: { kind: 'numeral', value: 1 } },
              { visual: { kind: 'numeral', value: 2 } },
            ],
            answer: 5,
          },
        ],
      }),
    ).toThrow(/di luar pilihan/);
    expect(() =>
      tpl('manual', {
        items: [
          {
            prompt: 'x',
            choices: [
              { visual: { kind: 'numeral', value: 1 } },
              { visual: { kind: 'numeral', value: 2 } },
            ],
            answer: [0, 0],
          },
        ],
      }),
    ).toThrow(/ganda/);
    expect(() =>
      tpl('manual', {
        items: [
          {
            prompt: 'x',
            choices: [
              { visual: { kind: 'numeral', value: 1 } },
              { visual: { kind: 'numeral', value: 2 } },
            ],
            answer: [0, 1],
          },
        ],
      }),
    ).toThrow(/semua pilihan/);
  });

  it('template mustahil → GeneratorError setelah 100 percobaan; validateTemplate melaporkannya', () => {
    const t = tpl('arith', { constraint: 'a + b > 100' });
    expect(() => generateItem(t, { seed: 0, band: 0 })).toThrow(GeneratorError);
    expect(validateTemplate(t, 10)).toHaveLength(1);
    expect(validateTemplate(tpl('count'), 30)).toEqual([]);
  });

  it('pengecoh angka yang tidak cukup ditolak (jawaban tunggal terjamin)', () => {
    expect(validateTemplate(tpl('count', { range: [1, 1], choices: 3 }), 5)).toEqual([]);
    expect(validateTemplate(tpl('numeral-listen', { values: [1, 2], choices: 5 }), 5)).toEqual([]);
  });

  it('error non-Reject diteruskan', () => {
    const t = tpl('arith', { answer: 'a / (b - b)' });
    expect(() => generateItem(t, { seed: 0, band: 0 })).toThrow('pembagian dengan nol');
  });
});

describe('validateSkillContent', () => {
  const catalog = {
    path: 'math/prek/_catalog.json',
    data: {
      domain: 'math',
      grade: 'prek',
      title: 'Matematika',
      categories: [{ code: 'A', title: 'Bilangan' }],
    },
  };
  const skill = (over: Record<string, unknown> = {}) => ({
    path: `math/prek/${String(over.id ?? 'x')}.json`,
    data: {
      id: 'math.prek.a1.x',
      version: 1,
      domain: 'math',
      grade: 'prek',
      category: 'A',
      order: 1,
      title: 'Hitung',
      tier: 'basic',
      family: 'count',
      ...over,
    },
  });

  it('valid', () => {
    const r = validateSkillContent({ catalogs: [catalog], skills: [skill()], sampleSize: 20 });
    expect(r.errors).toEqual([]);
    expect(r.skills).toHaveLength(1);
  });

  it('id duplikat, urutan kembar, kategori/katalog tak dikenal, skema, katalog rusak', () => {
    const r = validateSkillContent({
      catalogs: [catalog, { path: 'rusak.json', data: { domain: 'math' } }],
      skills: [
        skill(),
        skill({ id: 'math.prek.a1.x' }),
        skill({ id: 'math.prek.b1.y', category: 'B', order: 2 }),
        skill({ id: 'sains.tk.a1.z', domain: 'sains', grade: 'tk', order: 3 }),
        skill({ id: 'BAD' }),
      ],
      sampleSize: 5,
    });
    const all = r.errors.join('\n');
    expect(all).toMatch(/rusak.json/);
    expect(all).toMatch(/duplikat/);
    expect(all).toMatch(/urutan A.1 dipakai dua kali/);
    expect(all).toMatch(/kategori "B" tidak ada/);
    expect(all).toMatch(/tidak ada katalog untuk sains\/tk/);
    expect(all).toMatch(/format id/);
  });
});
