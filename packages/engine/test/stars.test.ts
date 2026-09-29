import { describe, expect, it } from 'vitest';
import { computeStars, mergeStars } from '../src/index.js';

describe('computeStars (PRD A8)', () => {
  it('belum selesai → 0', () => {
    expect(computeStars({ solved: false, hintsUsed: 0 })).toBe(0);
  });

  it('pakai petunjuk → 1', () => {
    expect(computeStars({ solved: true, hintsUsed: 1, cardsUsed: 4, optimalSteps: 4 })).toBe(1);
  });

  it('hintsAllowedFor2Stars memberi toleransi petunjuk', () => {
    expect(
      computeStars({
        solved: true,
        hintsUsed: 1,
        hintsAllowedFor2Stars: 1,
        cardsUsed: 4,
        optimalSteps: 4,
      }),
    ).toBe(3);
  });

  it('grid: tanpa petunjuk tapi boros → 2; hemat → 3', () => {
    expect(computeStars({ solved: true, hintsUsed: 0, cardsUsed: 6, optimalSteps: 4 })).toBe(2);
    expect(computeStars({ solved: true, hintsUsed: 0, cardsUsed: 4, optimalSteps: 4 })).toBe(3);
  });

  it('grid tanpa cardsUsed tidak dapat bintang 3', () => {
    expect(computeStars({ solved: true, hintsUsed: 0, optimalSteps: 4 })).toBe(2);
  });

  it('puzzle tanpa konsep hemat: bintang 3 = benar pada percobaan pertama', () => {
    expect(computeStars({ solved: true, hintsUsed: 0, firstTry: true })).toBe(3);
    expect(computeStars({ solved: true, hintsUsed: 0, firstTry: false })).toBe(2);
    expect(computeStars({ solved: true, hintsUsed: 0 })).toBe(2);
  });
});

describe('mergeStars', () => {
  it('bintang tidak pernah berkurang', () => {
    expect(mergeStars(3, 1)).toBe(3);
    expect(mergeStars(1, 2)).toBe(2);
    expect(mergeStars(undefined, 0)).toBe(0);
  });
});
