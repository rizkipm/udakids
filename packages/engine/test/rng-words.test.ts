import { describe, expect, it } from 'vitest';
import { createRng, numberWord, ordinalWord, rupiahWord, sentenceCase } from '../src/index.js';

describe('RNG ber-seed', () => {
  it('seed sama → deret sama; seed beda → deret beda', () => {
    const a = createRng('x');
    const b = createRng('x');
    const c = createRng(42);
    const seq = (r: ReturnType<typeof createRng>) => Array.from({ length: 5 }, () => r.next());
    const sa = seq(a);
    expect(sa).toEqual(seq(b));
    expect(sa).not.toEqual(seq(c));
    sa.forEach((v) => expect(v >= 0 && v < 1).toBe(true));
  });
  it('int, pick, shuffle, sample, chance', () => {
    const r = createRng(1);
    for (let i = 0; i < 100; i++) {
      const v = r.int(2, 4);
      expect(v >= 2 && v <= 4).toBe(true);
    }
    expect(['a']).toContain(r.pick(['a']));
    expect(r.shuffle([1, 2, 3]).sort()).toEqual([1, 2, 3]);
    expect(new Set(r.sample([1, 2, 3, 4], 3)).size).toBe(3);
    expect(typeof r.chance(0.5)).toBe('boolean');
  });
  it('kesalahan rentang', () => {
    const r = createRng(1);
    expect(() => r.int(3, 1)).toThrow('rentang kosong');
    expect(() => r.pick([])).toThrow('kosong');
    expect(() => r.sample([1], 2)).toThrow('sample');
  });
});

describe('kata bilangan', () => {
  it.each([
    [0, 'nol'],
    [7, 'tujuh'],
    [10, 'sepuluh'],
    [11, 'sebelas'],
    [15, 'lima belas'],
    [20, 'dua puluh'],
    [21, 'dua puluh satu'],
    [100, 'seratus'],
    [250, 'dua ratus lima puluh'],
    [1000, 'seribu'],
    [2500, 'dua ribu lima ratus'],
  ])('%d → %s', (n, w) => expect(numberWord(n)).toBe(w));
  it('di luar jangkauan / bukan bulat → angka', () => {
    expect(numberWord(1.5)).toBe('1.5');
    expect(numberWord(-1)).toBe('-1');
  });
  it('urutan dan rupiah', () => {
    expect(ordinalWord(1)).toBe('pertama');
    expect(ordinalWord(3)).toBe('ketiga');
    expect(ordinalWord(10)).toBe('kesepuluh');
    expect(rupiahWord(500)).toBe('lima ratus rupiah');
  });
  it('sentenceCase', () => {
    expect(sentenceCase('ada lima. empat pergi! tinggal? berapa')).toBe(
      'Ada lima. Empat pergi! Tinggal? Berapa',
    );
  });
});
