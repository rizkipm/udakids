import { describe, expect, it } from 'vitest';
import {
  compileExpr,
  evalBool,
  evalExpr,
  evalNumber,
  ExprError,
  exprVariables,
} from '../src/index.js';

describe('evaluator ekspresi aman (PRD A10)', () => {
  it('aritmetika dengan presedensi dan kurung', () => {
    expect(evalNumber('a + b * 2', { a: 1, b: 3 })).toBe(7);
    expect(evalNumber('(a + b) * 2', { a: 1, b: 3 })).toBe(8);
    expect(evalNumber('a - b - 1', { a: 10, b: 3 })).toBe(6);
    expect(evalNumber('7 % 3 + 8 / 4', {})).toBe(3);
    expect(evalNumber('-a + 2', { a: 5 })).toBe(-3);
  });
  it('perbandingan dan logika', () => {
    expect(evalBool('a + b <= 5', { a: 2, b: 3 })).toBe(true);
    expect(evalBool('a < b && b != 3', { a: 1, b: 3 })).toBe(false);
    expect(evalBool('a > b || a == 1', { a: 1, b: 3 })).toBe(true);
    expect(evalBool('!(a >= b)', { a: 1, b: 3 })).toBe(true);
    expect(evalExpr('a == a', { a: 1 })).toBe(true);
  });
  it('boolean dikonversi saat dipakai sebagai angka', () => {
    expect(evalNumber('(a > 1) + 1', { a: 2 })).toBe(2);
  });
  it('fungsi min, max, abs', () => {
    expect(evalNumber('max(a, b, 2) - min(a, b) + abs(0 - 4)', { a: 1, b: 9 })).toBe(12);
    expect(evalNumber('max()', {})).toBe(-Infinity);
  });
  it('variabel yang dirujuk', () => {
    expect(exprVariables('a + b * max(c, 1)')).toEqual(['a', 'b', 'c']);
    expect(exprVariables('-a')).toEqual(['a']);
  });
  it('cache kompilasi', () => {
    expect(compileExpr('a + 1').evaluate({ a: 1 })).toBe(2);
    expect(compileExpr('a + 1').source).toBe('a + 1');
  });
  it.each([
    ['a +', 'terpotong'],
    ['a $ b', 'karakter tidak dikenal'],
    ['foo(1)', 'fungsi tidak dikenal'],
    ['(a + 1', 'diharapkan'],
    ['a b', 'sisa token'],
    [')', 'token tak terduga'],
    ['1..2', 'angka tidak valid'],
  ])('menolak "%s"', (src, msg) => {
    expect(() => evalExpr(src, { a: 1, b: 1 })).toThrow(msg);
  });
  it('kesalahan saat evaluasi', () => {
    expect(() => evalExpr('x + 1', {})).toThrow(ExprError);
    expect(() => evalExpr('1 / 0', {})).toThrow('pembagian dengan nol');
    expect(() => evalExpr('1 % 0', {})).toThrow('pembagian dengan nol');
    expect(() => evalNumber('1 < 2', {})).toThrow('harus menghasilkan angka');
  });
  it('tidak bisa mengakses apa pun di luar variabel (tanpa eval)', () => {
    expect(() => evalExpr('constructor', {})).toThrow('variabel tidak dikenal');
    expect(() => evalExpr('toString', {})).toThrow('variabel tidak dikenal');
    expect(() => evalExpr('toString(1)', {})).toThrow('fungsi tidak dikenal');
    expect(() => evalExpr('process.exit(1)', {})).toThrow();
  });
});
