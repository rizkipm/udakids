import { describe, expect, it } from 'vitest';
import {
  correctNeeded,
  durationShort,
  durationWords,
  formatClock,
  rankLeaders,
  totalTimeMs,
  passedLevels,
  rankOf,
  totalPoints,
  isPassed,
  levelStatuses,
  mergeQuiz,
  PASS_SCORE,
  QUIZ_LENGTH,
  quizBand,
  quizScore,
  recordQuiz,
  type QuizResult,
} from '../src/index.js';

describe('ronde level (D-021)', () => {
  it('10 soal, mudah → sulit', () => {
    expect(QUIZ_LENGTH).toBe(10);
    expect(Array.from({ length: 12 }, (_, i) => quizBand(i))).toEqual([
      0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2,
    ]);
  });

  it('skor = persen benar; lulus bila ≥ 70 (7 dari 10)', () => {
    expect(quizScore(7)).toBe(70);
    expect(quizScore(6)).toBe(60);
    expect(quizScore(10)).toBe(100);
    expect(quizScore(12)).toBe(100);
    expect(quizScore(-1)).toBe(0);
    expect(quizScore(1, 0)).toBe(0);
    expect(quizScore(2, 3)).toBe(67);
    expect(isPassed(70)).toBe(true);
    expect(isPassed(69)).toBe(false);
    expect(PASS_SCORE).toBe(70);
    expect(correctNeeded()).toBe(7);
    expect(correctNeeded(15)).toBe(11);
  });

  it('skor terbaik dan status lulus tidak pernah turun', () => {
    const a = recordQuiz(undefined, 80, 1);
    expect(a).toEqual({ best: 80, last: 80, passed: true, attempts: 1, ts: 1 });
    const b = recordQuiz(a, 40, 2);
    expect(b).toEqual({ best: 80, last: 40, passed: true, attempts: 2, ts: 2 });
    expect(recordQuiz(undefined, 60, 1).passed).toBe(false);
  });

  it('merge dua perangkat', () => {
    const x: QuizResult = { best: 60, last: 60, passed: false, attempts: 2, ts: 5 };
    const y: QuizResult = { best: 90, last: 30, passed: true, attempts: 1, ts: 3 };
    expect(mergeQuiz(x, y)).toEqual({ best: 90, last: 60, passed: true, attempts: 2, ts: 5 });
    expect(mergeQuiz(y, x)).toEqual({ best: 90, last: 60, passed: true, attempts: 2, ts: 5 });
  });
});

describe('level terbuka berurutan', () => {
  const skills = [
    { id: 'a1', category: 'A', order: 1 },
    { id: 'a3', category: 'A', order: 3 },
    { id: 'a2', category: 'A', order: 2 },
    { id: 'b1', category: 'B', order: 1 },
    { id: 'b2', category: 'B', order: 2 },
    { id: 'c1', category: 'C', order: 1 },
  ];
  const pass = (best = 80): QuizResult => ({
    best,
    last: best,
    passed: best >= 70,
    attempts: 1,
    ts: 1,
  });

  it('awal: hanya Level 1 materi pertama yang terbuka', () => {
    expect(levelStatuses(['A', 'B', 'C', 'Z'], skills, {})).toEqual({
      a1: 'open',
      a2: 'locked',
      a3: 'locked',
      b1: 'locked',
      b2: 'locked',
      c1: 'locked',
    });
  });

  it('lulus A1 membuka A2 dan materi B', () => {
    expect(levelStatuses(['A', 'B', 'C'], skills, { a1: pass() })).toEqual({
      a1: 'passed',
      a2: 'open',
      a3: 'locked',
      b1: 'open',
      b2: 'locked',
      c1: 'locked',
    });
  });

  it('skor < 70 tidak membuka apa pun', () => {
    expect(levelStatuses(['A', 'B', 'C'], skills, { a1: pass(60) }).a2).toBe('locked');
  });

  it('rantai materi: C terbuka hanya jika B1 lulus', () => {
    const r = levelStatuses(['A', 'B', 'C'], skills, { a1: pass(), a2: pass(), b1: pass() });
    expect(r).toEqual({
      a1: 'passed',
      a2: 'passed',
      a3: 'open',
      b1: 'passed',
      b2: 'open',
      c1: 'open',
    });
  });

  it('lulus tanpa urutan (data lama) tetap tampil lulus, tapi tidak membuka yang terkunci', () => {
    const r = levelStatuses(['A', 'B'], skills, { a2: pass() });
    expect(r).toMatchObject({ a1: 'open', a2: 'passed', a3: 'locked', b1: 'locked' });
  });
});

describe('profil & peringkat (D-022)', () => {
  const r = (best: number): QuizResult => ({
    best,
    last: best,
    passed: best >= 70,
    attempts: 1,
    ts: 1,
  });
  it('total skor & level lulus', () => {
    expect(totalPoints({ a: r(80), b: r(50), c: undefined })).toBe(130);
    expect(passedLevels({ a: r(80), b: r(50), c: r(70) })).toBe(2);
    expect(totalPoints({})).toBe(0);
  });
  it('peringkat kompetisi: nilai sama = peringkat sama', () => {
    expect(rankOf([300, 250, 250, 100], 250)).toEqual({ position: 2, of: 4 });
    expect(rankOf([300, 250, 250, 100], 100)).toEqual({ position: 4, of: 4 });
    expect(rankOf([300], 300)).toEqual({ position: 1, of: 1 });
    expect(rankOf([], 0)).toEqual({ position: 1, of: 1 });
  });
});

describe('waktu pengerjaan & papan peringkat (D-024)', () => {
  it('bestTimeMs mengikuti skor terbaik; skor sama → tercepat', () => {
    let r = recordQuiz(undefined, 60, 1, 90_000);
    expect(r).toMatchObject({ bestTimeMs: 90_000, lastTimeMs: 90_000 });
    r = recordQuiz(r, 50, 2, 30_000); // skor lebih rendah: waktu terbaik tetap
    expect(r).toMatchObject({ best: 60, bestTimeMs: 90_000, lastTimeMs: 30_000 });
    r = recordQuiz(r, 60, 3, 70_000); // skor sama, lebih cepat
    expect(r.bestTimeMs).toBe(70_000);
    r = recordQuiz(r, 80, 4, 120_000); // skor lebih tinggi menang walau lebih lama
    expect(r.bestTimeMs).toBe(120_000);
    r = recordQuiz(r, 40, 5); // tanpa waktu (klien lama)
    expect(r).toMatchObject({ bestTimeMs: 120_000, lastTimeMs: 120_000 });
    expect(recordQuiz(undefined, 70, 1)).not.toHaveProperty('bestTimeMs');
  });

  it('mergeQuiz menggabungkan waktu dari dua perangkat', () => {
    const a = {
      best: 80,
      last: 80,
      passed: true,
      attempts: 2,
      ts: 10,
      bestTimeMs: 100,
      lastTimeMs: 100,
    };
    const b = {
      best: 80,
      last: 50,
      passed: false,
      attempts: 3,
      ts: 20,
      bestTimeMs: 60,
      lastTimeMs: 40,
    };
    expect(mergeQuiz(a, b)).toMatchObject({ bestTimeMs: 60, lastTimeMs: 40 });
    expect(mergeQuiz({ ...a, best: 90 }, b).bestTimeMs).toBe(100);
    const old = { best: 70, last: 70, passed: true, attempts: 1, ts: 30 };
    expect(mergeQuiz(a, old)).toMatchObject({ bestTimeMs: 100, lastTimeMs: 100 });
  });

  it('totalTimeMs & rankLeaders: skor → level lulus → waktu, posisi seri', () => {
    expect(
      totalTimeMs({
        x: { best: 1, last: 1, passed: false, attempts: 1, ts: 1, bestTimeMs: 5 },
        y: undefined,
      }),
    ).toBe(5);
    const ranked = rankLeaders([
      { id: 'a', points: 300, passed: 3, timeMs: 500 },
      { id: 'b', points: 300, passed: 3, timeMs: 400 },
      { id: 'c', points: 300, passed: 4, timeMs: 900 },
      { id: 'd', points: 100, passed: 1, timeMs: 10 },
      { id: 'e', points: 100, passed: 1, timeMs: 10 },
    ]);
    expect(ranked.map((r) => `${r.id}${r.position}`)).toEqual(['c1', 'b2', 'a3', 'd4', 'e4']);
  });

  it('format waktu', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(200_999)).toBe('03:20');
    expect(formatClock(3_723_000)).toBe('1:02:03');
    expect(durationWords(200_000)).toBe('3 menit 20 detik');
    expect(durationWords(120_000)).toBe('2 menit');
    expect(durationWords(0)).toBe('0 detik');
    expect(durationWords(3_600_000)).toBe('1 jam');
    // Ringkas untuk kartu dasbor: paling banyak dua satuan.
    expect(durationShort(8_156_000)).toBe('2 jam 15 mnt');
    expect(durationShort(7_200_000)).toBe('2 jam');
    expect(durationShort(956_000)).toBe('15 mnt 56 dtk');
    expect(durationShort(900_000)).toBe('15 mnt');
    expect(durationShort(56_000)).toBe('56 dtk');
    expect(durationShort(-5)).toBe('0 dtk');
  });
});
