import { describe, expect, it } from 'vitest';
import {
  execute,
  initialState,
  MAX_STEPS,
  makeRepeat,
  run,
  stateKey,
  type Program,
} from '../src/index.js';
import { gridLevel } from './helpers.js';

const R = { op: 'move', dir: 'right' } as const;
const D = { op: 'move', dir: 'down' } as const;

describe('interpreter grid — move (arah tetap)', () => {
  it('sampai tujuan → goal, dan arah hadap mengikuti panah', () => {
    const t = run(gridLevel(), [R, R]);
    expect(t.result).toBe('goal');
    expect(t.steps.map((s) => [s.pos.x, s.pos.y, s.event])).toEqual([
      [1, 0, undefined],
      [2, 0, 'goal'],
    ]);
    expect(t.steps.map((s) => s.instrPath)).toEqual([[0], [1]]);
    expect(t.final.facing).toBe('right');
  });

  it('move dengan n berjalan n langkah dengan instrPath yang sama', () => {
    const t = run(gridLevel(), [{ op: 'move', dir: 'right', n: 2 }]);
    expect(t.result).toBe('goal');
    expect(t.steps.map((s) => s.instrPath)).toEqual([[0], [0]]);
  });

  it('berhenti saat sampai tujuan; instruksi sisanya tidak dijalankan', () => {
    const t = run(gridLevel(), [R, R, D, D]);
    expect(t.result).toBe('goal');
    expect(t.steps).toHaveLength(2);
  });

  it('menabrak dinding → bump, posisi tetap, bumpPath menunjuk instruksi penyebab', () => {
    const t = run(gridLevel({ grid: { walls: [[1, 0]] } }), [D, { op: 'move', dir: 'up' }, R]);
    expect(t.result).toBe('bump');
    expect(t.bumpPath).toEqual([2]);
    expect(t.final.pos).toEqual({ x: 0, y: 0 });
    expect(t.steps.at(-1)?.event).toBe('bump');
  });

  it('keluar grid → bump', () => {
    const t = run(gridLevel(), [{ op: 'move', dir: 'up' }]);
    expect(t.result).toBe('bump');
    expect(t.bumpPath).toEqual([0]);
  });

  it('masuk genangan → bump', () => {
    const t = run(gridLevel({ grid: { puddles: [[1, 0]] } }), [R]);
    expect(t.result).toBe('bump');
  });

  it('program habis sebelum tujuan → incomplete', () => {
    const t = run(gridLevel(), [R]);
    expect(t.result).toBe('incomplete');
    expect(t.limitReached).toBe(false);
  });

  it('program kosong → incomplete tanpa langkah', () => {
    const t = run(gridLevel(), []);
    expect(t).toMatchObject({ result: 'incomplete', steps: [] });
  });
});

describe('interpreter grid — bintang', () => {
  it('mengambil bintang saat melewati kotaknya', () => {
    const t = run(gridLevel({ grid: { stars: [[1, 0]] } }), [R, R]);
    expect(t.steps.map((s) => s.event)).toEqual(['collect', 'goal']);
    expect(t.final.collected).toEqual(['1,0']);
  });

  it('bintang di kotak tujuan: collect lalu goal', () => {
    const t = run(gridLevel({ grid: { stars: [[2, 0]] } }), [R, R]);
    expect(t.steps.map((s) => s.event)).toEqual([undefined, 'collect', 'goal']);
  });

  it('collectAll: tujuan belum terhitung sebelum semua bintang diambil', () => {
    const lvl = gridLevel({ grid: { stars: [[2, 1]] }, goal: { collectAll: true } });
    expect(run(lvl, [R, R]).result).toBe('incomplete');
    expect(run(lvl, [R, D, R, { op: 'move', dir: 'up' }]).result).toBe('goal');
  });

  it('pick mengambil bintang di kotak sekarang; tanpa bintang tetap tercatat', () => {
    const lvl = gridLevel({ grid: { stars: [[1, 0]] }, goal: { collectAll: true } });
    const t = execute(lvl, [{ op: 'pick' }], {
      pos: { x: 1, y: 0 },
      facing: 'right',
      collected: [],
    });
    expect(t.steps[0]?.event).toBe('collect');
    expect(run(lvl, [{ op: 'pick' }]).steps[0]?.event).toBeUndefined();
  });
});

describe('interpreter grid — instruksi Intermediate/Advanced', () => {
  it('forward mengikuti arah hadap; turn memutar arah', () => {
    const lvl = gridLevel({ goal: { x: 1, y: 1 } });
    const t = run(lvl, [{ op: 'forward' }, { op: 'turn', dir: 'right' }, { op: 'forward' }]);
    expect(t.result).toBe('goal');
    expect(t.steps[1]).toMatchObject({ facing: 'down', instrPath: [1] });
  });

  it('turn kiri empat kali kembali ke arah awal', () => {
    const t = run(gridLevel(), [makeRepeat(4, [{ op: 'turn', dir: 'left' }])]);
    expect(t.steps.map((s) => s.facing)).toEqual(['up', 'left', 'down', 'right']);
  });

  it('turn kanan memutar searah jarum jam', () => {
    const t = run(gridLevel(), [makeRepeat(4, [{ op: 'turn', dir: 'right' }])]);
    expect(t.steps.map((s) => s.facing)).toEqual(['down', 'left', 'up', 'right']);
  });

  it('forward dengan n', () => {
    expect(run(gridLevel(), [{ op: 'forward', n: 2 }]).result).toBe('goal');
  });

  it('jump melompati genangan', () => {
    const lvl = gridLevel({ grid: { puddles: [[1, 0]] } });
    const t = run(lvl, [{ op: 'jump' }]);
    expect(t.result).toBe('goal');
    expect(t.steps).toHaveLength(1);
  });

  it('jump tidak bisa melewati dinding atau keluar grid', () => {
    expect(run(gridLevel({ grid: { walls: [[1, 0]] } }), [{ op: 'jump' }]).result).toBe('bump');
    expect(run(gridLevel({ goal: { x: 2, y: 2 } }), [R, { op: 'jump' }]).result).toBe('bump');
  });

  it('jump tidak boleh mendarat di genangan', () => {
    const lvl = gridLevel({ grid: { w: 4, puddles: [[2, 0]] }, goal: { x: 3, y: 0 } });
    expect(run(lvl, [{ op: 'jump' }]).result).toBe('bump');
  });

  it('drop, paint, dan card tercatat tanpa berpindah', () => {
    const t = run(gridLevel(), [
      { op: 'drop' },
      { op: 'paint', color: 'merah' },
      { op: 'card', id: 'x' },
    ]);
    expect(t.steps.map((s) => s.pos)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
  });

  it('repeat: instrPath menunjuk isi blok', () => {
    const t = run(gridLevel(), [makeRepeat(2, [R])]);
    expect(t.result).toBe('goal');
    expect(t.steps.map((s) => s.instrPath)).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  it('if wall-ahead memilih cabang; instrPath memuat cabang', () => {
    const lvl = gridLevel({ start: { x: 2, y: 1, facing: 'right' }, goal: { x: 2, y: 2 } });
    const prog: Program = [{ op: 'if', cond: { sensor: 'wall-ahead' }, then: [D], else: [R] }];
    const t = run(lvl, prog);
    expect(t.result).toBe('goal');
    expect(t.steps[0]?.instrPath).toEqual([0, 0, 0]);
  });

  it('if else dijalankan saat kondisi salah', () => {
    const lvl = gridLevel({ start: { x: 0, y: 1, facing: 'right' }, goal: { x: 1, y: 1 } });
    const t = run(lvl, [{ op: 'if', cond: { sensor: 'wall-ahead' }, then: [D], else: [R] }]);
    expect(t.result).toBe('goal');
    expect(t.steps[0]?.instrPath).toEqual([0, 1, 0]);
  });

  it('if tanpa else dan kondisi salah → tidak melakukan apa-apa', () => {
    const t = run(gridLevel(), [{ op: 'if', cond: { sensor: 'wall-ahead' }, then: [D] }]);
    expect(t.steps).toHaveLength(0);
  });

  it('sensor puddle-ahead, star-here, dan negate', () => {
    const lvl = gridLevel({ grid: { puddles: [[1, 0]], stars: [[0, 0]] }, goal: { x: 0, y: 2 } });
    const jumpIfPuddle: Program = [
      { op: 'if', cond: { sensor: 'puddle-ahead' }, then: [{ op: 'jump' }] },
    ];
    expect(run(lvl, jumpIfPuddle).final.pos).toEqual({ x: 2, y: 0 });
    const pickIfStar: Program = [
      { op: 'if', cond: { sensor: 'star-here' }, then: [{ op: 'pick' }] },
    ];
    expect(run(lvl, pickIfStar).final.collected).toEqual(['0,0']);
    const notWall: Program = [
      { op: 'if', cond: { sensor: 'wall-ahead', negate: true }, then: [D] },
    ];
    expect(run(lvl, notWall).final.pos).toEqual({ x: 0, y: 1 });
  });

  it('puddle-ahead di tepi grid = false', () => {
    const lvl = gridLevel({ start: { x: 2, y: 1, facing: 'right' }, goal: { x: 0, y: 0 } });
    const t = run(lvl, [
      {
        op: 'if',
        cond: { sensor: 'puddle-ahead' },
        then: [D],
        else: [{ op: 'move', dir: 'left' }],
      },
    ]);
    expect(t.final.pos).toEqual({ x: 1, y: 1 });
  });
});

describe('batas aman', () => {
  it(`berhenti setelah ${MAX_STEPS} langkah → incomplete + limitReached`, () => {
    const lvl = gridLevel({ goal: { x: 2, y: 2 } });
    const t = run(lvl, [
      makeRepeat(10, [makeRepeat(10, [makeRepeat(10, [{ op: 'turn', dir: 'left' }])])]),
    ]);
    expect(t.steps).toHaveLength(MAX_STEPS);
    expect(t).toMatchObject({ result: 'incomplete', limitReached: true });
  });

  it('deterministik: program sama → trace sama', () => {
    const p: Program = [R, D, R];
    expect(run(gridLevel({ goal: { x: 2, y: 2 } }), p)).toEqual(
      run(gridLevel({ goal: { x: 2, y: 2 } }), p),
    );
  });
});

describe('state', () => {
  it('initialState & stateKey', () => {
    const s = initialState(gridLevel({ grid: { stars: [[1, 1]] } }));
    expect(stateKey(s)).toBe('0,0,right|');
    expect(stateKey({ ...s, collected: ['1,1'] })).toBe('0,0,right|1,1');
  });
});
