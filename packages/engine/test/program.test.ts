import { describe, expect, it } from 'vitest';
import {
  appendInstr,
  cardCount,
  cardsProgram,
  gridCardToInstr,
  makeRepeat,
  programCardIds,
  removeInstr,
  replaceInstr,
  swapInstr,
  usesRepeat,
  type Program,
} from '../src/index.js';

describe('cardCount', () => {
  it('satu kartu per instruksi sederhana', () => {
    expect(cardCount([{ op: 'jump' }, { op: 'pick' }, { op: 'turn', dir: 'left' }])).toBe(3);
  });

  it('move/forward dengan n dihitung n kartu (suara tidak lebih hemat)', () => {
    expect(
      cardCount([{ op: 'move', dir: 'up', n: 3 }, { op: 'forward', n: 2 }, { op: 'forward' }]),
    ).toBe(6);
  });

  it('repeat = 1 + isi; if = 1 + then + else', () => {
    const p: Program = [
      makeRepeat(4, [{ op: 'move', dir: 'right' }, { op: 'jump' }]),
      { op: 'if', cond: { sensor: 'wall-ahead' }, then: [{ op: 'jump' }] },
      { op: 'if', cond: { sensor: 'star-here' }, then: [{ op: 'pick' }], else: [{ op: 'jump' }] },
    ];
    expect(cardCount(p)).toBe(3 + 2 + 3);
  });
});

describe('usesRepeat', () => {
  it('mendeteksi repeat di tingkat atas dan di dalam if', () => {
    expect(usesRepeat([{ op: 'jump' }])).toBe(false);
    expect(usesRepeat([makeRepeat(2, [{ op: 'jump' }])])).toBe(true);
    expect(
      usesRepeat([
        {
          op: 'if',
          cond: { sensor: 'wall-ahead' },
          then: [],
          else: [makeRepeat(2, [{ op: 'jump' }])],
        },
      ]),
    ).toBe(true);
    expect(usesRepeat([{ op: 'if', cond: { sensor: 'wall-ahead' }, then: [{ op: 'jump' }] }])).toBe(
      false,
    );
  });
});

describe('gridCardToInstr', () => {
  it.each([
    ['up', { op: 'move', dir: 'up' }],
    ['down', { op: 'move', dir: 'down' }],
    ['left', { op: 'move', dir: 'left' }],
    ['right', { op: 'move', dir: 'right' }],
    ['forward', { op: 'forward' }],
    ['turn-left', { op: 'turn', dir: 'left' }],
    ['turn-right', { op: 'turn', dir: 'right' }],
    ['jump', { op: 'jump' }],
    ['pick', { op: 'pick' }],
  ] as const)('%s', (card, instr) => {
    expect(gridCardToInstr(card)).toEqual(instr);
  });
});

describe('kartu urutan', () => {
  it('cardsProgram ↔ programCardIds', () => {
    const p = cardsProgram(['a', 'b']);
    expect(p).toEqual([
      { op: 'card', id: 'a' },
      { op: 'card', id: 'b' },
    ]);
    expect(programCardIds([...p, { op: 'jump' }])).toEqual(['a', 'b']);
  });
});

describe('edit Buku Catatan', () => {
  const p: Program = cardsProgram(['a', 'b', 'c']);

  it('append, remove, replace tidak mengubah program asli', () => {
    expect(programCardIds(appendInstr(p, { op: 'card', id: 'd' }))).toEqual(['a', 'b', 'c', 'd']);
    expect(programCardIds(removeInstr(p, 1))).toEqual(['a', 'c']);
    expect(programCardIds(replaceInstr(p, 0, { op: 'card', id: 'z' }))).toEqual(['z', 'b', 'c']);
    expect(programCardIds(p)).toEqual(['a', 'b', 'c']);
  });

  it('swap menukar dua kalimat; indeks di luar batas diabaikan', () => {
    expect(programCardIds(swapInstr(p, 0, 2))).toEqual(['c', 'b', 'a']);
    expect(swapInstr(p, 0, 5)).toBe(p);
    expect(swapInstr(p, -1, 0)).toBe(p);
  });
});
