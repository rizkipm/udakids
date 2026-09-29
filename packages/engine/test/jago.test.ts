import { describe, expect, it } from 'vitest';
import {
  answerJago,
  applyReview,
  bandOf,
  initialJago,
  isChallengeMode,
  isReviewDue,
  mergeJago,
  nextBand,
  parentStatus,
  REVIEW_INTERVALS,
  sessionLength,
  stageOf,
  type JagoState,
} from '../src/index.js';

const NOW = 1_000_000;
const DAY = 24 * 60 * 60 * 1000;
const at = (score: number, over: Partial<JagoState> = {}): JagoState => ({
  ...initialJago(),
  score,
  visibleStage: stageOf(score),
  ...over,
});

/** Jalankan serangkaian jawaban. */
const play = (s: JagoState, answers: boolean[]) =>
  answers.reduce((acc, c, i) => answerJago(acc, c, NOW + i).state, s);

describe('stageOf & band (PRD A9)', () => {
  it('tahap: Benih < 30, Tunas 30–59, Pohon 60–99, Berbuah 100', () => {
    expect([0, 29, 30, 59, 60, 89, 95, 100].map(stageOf)).toEqual([0, 0, 1, 1, 2, 2, 2, 3]);
  });
  it('band: < 40 → 0, < 75 → 1, selain itu 2', () => {
    expect([0, 39, 40, 74, 75, 100].map(bandOf)).toEqual([0, 0, 1, 1, 2, 2]);
  });
  it('setelah salah, soal berikutnya satu band lebih mudah', () => {
    expect(nextBand(at(80), false)).toBe(1);
    expect(nextBand(at(10), false)).toBe(0);
    expect(nextBand(at(80), true)).toBe(2);
    expect(nextBand(at(80), undefined)).toBe(2);
  });
});

describe('jawaban benar', () => {
  it('+12 di bawah 40, +8 di bawah 70, +5 di bawah 90', () => {
    expect(answerJago(at(0), true, NOW).state.score).toBe(12);
    expect(answerJago(at(40), true, NOW).state.score).toBe(48);
    expect(answerJago(at(70), true, NOW).state.score).toBe(75);
  });
  it('skor biasa berhenti di 90 → masuk mode tantangan', () => {
    const s = answerJago(at(88), true, NOW).state;
    expect(s.score).toBe(90);
    expect(isChallengeMode(s)).toBe(true);
  });
  it('tanaman tumbuh saat melewati ambang tahap', () => {
    const u = answerJago(at(25), true, NOW);
    expect(u).toMatchObject({ grew: true, reteach: false });
    expect(u.state.visibleStage).toBe(1);
    expect(u.state.ts).toBe(NOW);
  });
});

describe('tahap yang terlihat TIDAK PERNAH turun', () => {
  it('jawaban salah beruntun tidak menurunkan visibleStage', () => {
    let s = at(62); // Pohon
    for (let i = 0; i < 30; i++) {
      const u = answerJago(s, false, NOW + i);
      expect(u.state.visibleStage).toBeGreaterThanOrEqual(s.visibleStage);
      expect(u.reteach).toBe(true);
      s = u.state;
    }
    expect(s.visibleStage).toBe(2);
    // Skor internal turun, tapi tidak di bawah (batas tahap Pohon 60 − 10).
    expect(s.score).toBe(50);
  });
  it('salah: −4, dengan batas bawah tahap − 10 (tidak di bawah 0)', () => {
    expect(answerJago(at(20), false, NOW).state.score).toBe(16);
    expect(answerJago(at(2), false, NOW).state.score).toBe(0);
    expect(answerJago(at(33), false, NOW).state.score).toBe(29);
    expect(answerJago(at(21, { visibleStage: 1 }), false, NOW).state.score).toBe(20);
  });
  it('batas bawah tidak pernah menaikkan skor', () => {
    const s = at(85, { visibleStage: 3, needsReview: true });
    expect(answerJago(s, false, NOW).state.score).toBe(85);
  });
  it('acak panjang: visibleStage monoton naik', () => {
    let s = initialJago();
    let x = 7;
    for (let i = 0; i < 500; i++) {
      x = (x * 1103515245 + 12345) % 2147483648;
      const next = answerJago(s, x % 3 !== 0, NOW + i).state;
      expect(next.visibleStage).toBeGreaterThanOrEqual(s.visibleStage);
      s = next;
    }
  });
});

describe('mode tantangan TIDAK menghukum', () => {
  it('salah di mode tantangan: skor tetap, challengeCorrect tidak di-reset, reteach', () => {
    const s = at(90, { challengeCorrect: 2 });
    const u = answerJago(s, false, NOW);
    expect(u.state.score).toBe(90);
    expect(u.state.challengeCorrect).toBe(2);
    expect(u.reteach).toBe(true);
  });
  it('3 jawaban benar (boleh diselingi salah) → Jago, skor 100, ulangan +7 hari', () => {
    const s = play(at(90), [true, false, true, false, false, true]);
    expect(s).toMatchObject({
      score: 100,
      visibleStage: 3,
      challengeCorrect: 3,
      needsReview: false,
    });
    expect(s.jagoAt).toBeDefined();
    expect(s.nextReviewAt).toBe(s.jagoAt! + REVIEW_INTERVALS[0]);
  });
  it('becameJago hanya sekali', () => {
    const s = at(90, { challengeCorrect: 2 });
    const u = answerJago(s, true, NOW);
    expect(u.becameJago).toBe(true);
    expect(answerJago(u.state, true, NOW + 1).becameJago).toBe(false);
  });
  it('sudah Jago: latihan tambahan tidak mengubah state', () => {
    const jago = play(at(90), [true, true, true]);
    expect(answerJago(jago, false, NOW + 99)).toMatchObject({
      state: jago,
      reteach: true,
      grew: false,
    });
    expect(answerJago(jago, true, NOW + 99).reteach).toBe(false);
  });
});

describe('ulangan terjadwal', () => {
  const jago = play(at(90), [true, true, true]);

  it('jatuh tempo setelah 7 hari', () => {
    expect(isReviewDue(jago, NOW + 6 * DAY)).toBe(false);
    expect(isReviewDue(jago, NOW + 8 * DAY)).toBe(true);
    expect(isReviewDue(at(50), NOW + 100 * DAY)).toBe(false);
  });
  it('lulus ulangan pertama → +30 hari; lulus kedua → tidak ada jadwal lagi', () => {
    const t1 = NOW + 8 * DAY;
    const r1 = applyReview(jago, true, t1);
    expect(r1).toMatchObject({
      reviewsPassed: 1,
      nextReviewAt: t1 + REVIEW_INTERVALS[1],
      score: 100,
    });
    const r2 = applyReview(r1, true, t1 + 31 * DAY);
    expect(r2.reviewsPassed).toBe(2);
    expect(r2.nextReviewAt).toBeUndefined();
  });
  it('gagal ulangan → "perlu disiram": skor 85, tahap tetap Berbuah', () => {
    const r = applyReview(jago, false, NOW + 8 * DAY);
    expect(r).toMatchObject({ needsReview: true, score: 85, visibleStage: 3, challengeCorrect: 0 });
    expect(r.nextReviewAt).toBeUndefined();
    // Kembali Jago lewat latihan biasa + tantangan.
    const back = play(r, [true, true, true, true, true]);
    expect(back).toMatchObject({ score: 100, needsReview: false, visibleStage: 3 });
  });
});

describe('status orang tua, merge, sesi', () => {
  it('parentStatus', () => {
    expect(parentStatus(initialJago())).toBe('Belum mulai');
    expect(parentStatus(at(0, { ts: 5 }))).toBe('Belajar');
    expect(parentStatus(at(50))).toBe('Belajar');
    expect(parentStatus(at(80))).toBe('Bisa');
    expect(parentStatus(at(100))).toBe('Jago');
  });
  it('merge: state ts terbaru menang, visibleStage = max', () => {
    const older = at(95, { ts: 1, visibleStage: 2 });
    const newer = at(40, { ts: 2, visibleStage: 1 });
    expect(mergeJago(older, newer)).toMatchObject({ score: 40, visibleStage: 2 });
    expect(mergeJago(newer, older)).toMatchObject({ score: 40, visibleStage: 2 });
  });
  it('sesi: 10 soal untuk basic, 15 lainnya', () => {
    expect(sessionLength('basic')).toBe(10);
    expect(sessionLength('intermediate')).toBe(15);
  });
});
