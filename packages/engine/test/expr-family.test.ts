import { describe, expect, it } from 'vitest';
import {
  checkAnswer,
  evalNumber,
  formatId,
  generateItem,
  itemProblems,
  skillTemplateSchema,
  validateTemplate,
} from '../src/index.js';

const tpl = (params: Record<string, unknown>) =>
  skillTemplateSchema.parse({
    id: 'math.sd34.b1.uji',
    version: 1,
    domain: 'math',
    grade: 'sd34',
    category: 'B',
    order: 1,
    title: 'Uji expr',
    tier: 'advanced',
    family: 'expr',
    params,
  });

describe('fungsi FPB/KPK di evaluator', () => {
  it('gcd, lcm, floor, ceil, round', () => {
    expect(evalNumber('gcd(12, 18)', {})).toBe(6);
    expect(evalNumber('gcd(12, 18, 8)', {})).toBe(2);
    expect(evalNumber('lcm(4, 6)', {})).toBe(12);
    expect(evalNumber('lcm(3, 4, 6)', {})).toBe(12);
    expect(evalNumber('lcm(0, 6)', {})).toBe(0);
    expect(evalNumber('floor(7/2) + ceil(7/2) + round(2.5)', {})).toBe(10);
  });
});

describe('formatId', () => {
  it('angka gaya Indonesia', () => {
    expect(formatId(12500)).toBe('12.500');
    expect(formatId(0.25)).toBe('0,25');
    expect(formatId(0.1 + 0.2)).toBe('0,3');
  });
});

describe('family expr', () => {
  it('bilangan: template, pengecoh bertag, pembahasan, jawaban tunggal', () => {
    const t = tpl({
      vars: { a: [4, 12], b: [4, 12] },
      constraint: 'a != b',
      words: { nama: ['Sari', 'Budi'] },
      prompt:
        'Lampu merah berkedip tiap {a} detik, lampu hijau tiap {b} detik. {nama} melihat keduanya berkedip bersamaan. Berapa detik lagi keduanya berkedip bersamaan lagi?',
      answer: 'lcm(a, b)',
      unit: 'detik',
      distractors: [
        { expr: 'a * b', tag: 'kali-bukan-kpk' },
        { expr: 'gcd(a, b)', tag: 'fpb-bukan-kpk' },
        { expr: 'a + b', tag: 'menjumlah' },
      ],
      explain: 'KPK dari {a} dan {b} adalah {answer}.',
    });
    for (let seed = 0; seed < 50; seed++) {
      const item = generateItem(t, { seed, band: seed % 3 });
      expect(itemProblems(item)).toEqual([]);
      if (item.interaction.type !== 'pick-one') throw new Error('harus pick-one');
      expect(item.interaction.choices).toHaveLength(4);
      expect(checkAnswer(item, item.interaction.answer).correct).toBe(true);
      expect(item.prompt).toMatch(/^Lampu merah berkedip tiap \d+ detik/);
      expect(item.reteach.say).toMatch(/^KPK dari \d+ dan \d+ adalah \d+ detik\.$/);
    }
  });

  it('desimal: angka ber-koma, pengecoh miskonsepsi "angka lebih panjang lebih besar"', () => {
    const t = tpl({
      vars: { a: { range: [0.1, 0.9], step: 0.1 }, b: { range: [0.01, 0.09], step: 0.01 } },
      format: 'decimal',
      prompt: 'Berapa {a} + {b}?',
      answer: 'a + b',
      distractors: [{ expr: 'a + b * 10', tag: 'nilai-tempat' }],
      explain: '{a} + {b} = {answer}',
    });
    const item = generateItem(t, { seed: 1, band: 0 });
    expect(item.prompt).toMatch(/^Berapa 0,\d \+ 0,0\d\?$/);
    expect(itemProblems(item)).toEqual([]);
  });

  it('pecahan: disederhanakan; pengecoh senilai jawaban dibuang', () => {
    const t = tpl({
      vars: { a: [1, 3], b: [1, 3] },
      derived: { d: '4' },
      format: 'fraction',
      prompt: 'Hasil {a}/4 + {b}/4 = …',
      fraction: { num: 'a + b', den: 'd' },
      distractors: [
        { num: 'a + b', den: 'd + d', tag: 'menjumlah-penyebut' },
        { num: '2 * (a + b)', den: '2 * d', tag: 'senilai' },
        { num: 'a * b', den: 'd', tag: 'mengalikan' },
        { num: 'a + b + 1', den: 'd', tag: 'lebih-satu' },
      ],
      choices: 3,
      explain: 'Penyebut sama, jumlahkan pembilangnya: {answer}.',
    });
    for (let seed = 0; seed < 40; seed++) {
      const item = generateItem(t, { seed, band: 0 });
      if (item.interaction.type !== 'pick-one') throw new Error();
      const tags = item.interaction.choices.map((c) => c.tag);
      expect(tags).not.toContain('senilai');
      expect(item.interaction.answer).toMatch(/^f\d+-\d+$/);
      expect(itemProblems(item)).toEqual([]);
    }
  });

  it('pecahan tanpa penyederhanaan (untuk membandingkan) dan satuan derajat menempel', () => {
    const cmp = tpl({
      vars: { a: { values: [4] } },
      format: 'fraction',
      prompt: '3/8 atau {a}/8?',
      fraction: { num: 'a', den: '8', simplify: false },
      distractors: [{ num: '3', den: '8', tag: 'salah-banding' }],
      choices: 2,
      explain: '{answer}',
    });
    const item = generateItem(cmp, { seed: 0, band: 0 });
    expect(item.interaction.type === 'pick-one' && item.interaction.answer).toBe('f4-8');
    const deg = tpl({
      vars: { a: { values: [40] } },
      prompt: 'x',
      answer: '90 - a',
      unit: '°',
      explain: '{answer}',
    });
    expect(generateItem(deg, { seed: 0, band: 0 }).reteach.say).toBe('50°');
  });

  it('isian (mode input) + stimulus dengan ekspresi', () => {
    const t = tpl({
      vars: { p: [3, 9], l: [2, 6] },
      prompt: 'Berapa luas persegi panjang ini?',
      stimulus: [
        { kind: 'rect', w: '=p', h: '=l', unit: 'cm', grid: true },
        { kind: 'text', text: 'Panjang {p} cm' },
      ],
      answer: 'p * l',
      unit: 'cm²',
      mode: 'input',
      explain: 'Luas = {p} × {l} = {answer}.',
    });
    const item = generateItem(t, { seed: 2, band: 1 });
    expect(item.interaction.type).toBe('number-input');
    expect(item.stimulus[0]).toMatchObject({ kind: 'rect', unit: 'cm', grid: true });
    const answer = item.interaction.type === 'number-input' ? item.interaction.answer : -1;
    expect(checkAnswer(item, answer).correct).toBe(true);
    expect(checkAnswer(item, answer + 1).correct).toBe(false);
    expect(checkAnswer(item, 'x').correct).toBe(false);
  });

  it('validasi template: variabel & template tak dikenal, pecahan tanpa definisi, isian pecahan', () => {
    expect(() => tpl({ prompt: '{x}?', answer: '1', explain: 'x' })).toThrow(
      /template ..\{x\}.. tidak dikenal/,
    );
    expect(() => tpl({ prompt: 'x', answer: 'q + 1', explain: 'x' })).toThrow(
      /variabel tak dikenal ..q/,
    );
    expect(() => tpl({ prompt: 'x', answer: '1 +', explain: 'x' })).toThrow(/tidak valid/);
    expect(() => tpl({ prompt: 'x', format: 'fraction', explain: 'x' })).toThrow(
      /butuh `fraction`/,
    );
    expect(() => tpl({ prompt: 'x', explain: 'x' })).toThrow(/butuh `answer`/);
    expect(() =>
      tpl({
        prompt: 'x',
        format: 'fraction',
        fraction: { num: '1', den: '2' },
        mode: 'input',
        explain: 'x',
      }),
    ).toThrow(/isian/);
  });

  it('stimulus rusak / constraint mustahil dilaporkan validateTemplate', () => {
    expect(
      validateTemplate(
        tpl({ prompt: 'x', answer: '1', stimulus: [{ kind: 'naga' }], explain: 'x' }),
        3,
      )[0],
    ).toMatch(/stimulus tidak valid/);
    expect(
      validateTemplate(
        tpl({ vars: { a: [1, 2] }, constraint: 'a > 5', prompt: 'x', answer: 'a', explain: 'x' }),
        3,
      )[0],
    ).toMatch(/gagal membuat soal/);
    expect(
      validateTemplate(
        tpl({ vars: { a: [1, 2] }, prompt: 'x', answer: 'a / 3', explain: 'x' }),
        3,
      )[0],
    ).toMatch(/bukan bilangan bulat/);
    expect(
      validateTemplate(
        tpl({ vars: { a: [1, 2] }, prompt: 'x', answer: '0 - a', explain: 'x' }),
        3,
      )[0],
    ).toMatch(/negatif/);
    expect(validateTemplate(tpl({ prompt: 'x', answer: '1 / 0', explain: 'x' }), 1)[0]).toMatch(
      /nol/,
    );
  });

  it('allowNegative, pengecoh ekspresi rusak dilewati, variabel values', () => {
    const t = tpl({
      vars: { a: { values: [5] } },
      prompt: 'x',
      answer: '0 - a',
      allowNegative: true,
      distractors: ['a / 0', 'a'],
      choices: 2,
      explain: '{=a * 2}',
    });
    const item = generateItem(t, { seed: 0, band: 0 });
    expect(item.reteach.say).toBe('10');
    expect(itemProblems(item)).toEqual([]);
  });
});

describe('variabel turunan dievaluasi menurut ketergantungan, bukan urutan kunci', () => {
  // PostgreSQL jsonb mengurutkan kunci: yang pendek dulu, lalu abjad ("n" sebelum "pi").
  const jsonbOrder = (o: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(o).sort(([a], [b]) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0)),
    );
  const params = {
    vars: { p: { values: [2, 3] }, i: [1, 3], q: { values: [5, 7] }, j: [1, 2] },
    derived: {
      pi: '(i == 1) * p + (i == 2) * p * p + (i == 3) * p * p * p',
      qj: '(j == 1) * q + (j == 2) * q * q',
      n: 'pi * qj',
    },
    prompt: 'Banyak faktor positif dari {n} adalah …',
    answer: '(i + 1) * (j + 1)',
    distractors: ['i * j', 'i + j + 2', '(i + 1) * (j + 1) + 1'],
    explain: 'Faktorkan {n}.',
  };

  it('urutan kunci ala jsonb ("n" sebelum "pi") menghasilkan soal yang sama', () => {
    const asFile = tpl(params);
    const asDb = tpl({ ...params, derived: jsonbOrder(params.derived) });
    expect(Object.keys(asDb.params.derived as object)[0]).toBe('n');
    for (let seed = 0; seed < 20; seed++) {
      expect(generateItem(asDb, { seed, band: 0 }).prompt).toBe(
        generateItem(asFile, { seed, band: 0 }).prompt,
      );
    }
  });

  it('ketergantungan melingkar ditolak validator', () => {
    expect(() => tpl({ ...params, derived: { a: 'b + 1', b: 'a + 1' } })).toThrow(/melingkar/);
  });
});
