import { describe, expect, it } from 'vitest';
import { childInsights, localDate, type InsightSkill, type QuizResult } from '../src/index.js';

const NOW = Date.parse('2026-10-08T05:00:00Z'); // 12:00 WIB
const DAY = 86_400_000;
const sk = (category: string, order: number, grade = 'sd1'): InsightSkill => ({
  id: `math.${grade}.${category.toLowerCase()}${order}.x`,
  domain: 'math',
  grade,
  category,
  order,
  title: `Topik ${category} — Level ${order} — Judul ${category}${order}`,
});
const skills = [sk('A', 1), sk('A', 2), sk('A', 3), sk('B', 1), sk('B', 2)];
const books = [
  {
    domain: 'math',
    grade: 'sd1',
    title: 'Math Grade 1',
    categories: [
      { code: 'A', title: 'Membilang' },
      { code: 'B', title: 'Penjumlahan' },
    ],
  },
  { domain: 'math', grade: 'sd2', title: 'Math Grade 2', categories: [{ code: 'A', title: 'X' }] },
];
const res = (best: number, attempts = 1, ts = NOW - DAY): QuizResult => ({
  best,
  last: best,
  passed: best >= 70,
  attempts,
  ts,
});

describe('ringkasan dasbor orang tua (D-038)', () => {
  it('tanggal lokal WIB', () => {
    expect(localDate(Date.parse('2026-10-07T18:00:00Z'))).toBe('2026-10-08');
    expect(localDate(Date.parse('2026-10-07T16:59:00Z'))).toBe('2026-10-07');
  });

  it('belum pernah main → kosong, tanpa langkah berikutnya', () => {
    const r = childInsights({ rounds: [], results: {}, skills, books, now: NOW });
    expect(r.week).toHaveLength(7);
    expect(r.week.at(-1)!.date).toBe('2026-10-08');
    expect(r).toMatchObject({
      activeDays: 0,
      weekRounds: 0,
      trend: null,
      books: [],
      recent: [],
      next: null,
      strength: null,
      focus: null,
      totals: { points: 0, passed: 0, played: 0, timeMs: 0 },
    });
  });

  it('aktivitas 7 hari, tren skor, progres buku, ronde terakhir', () => {
    const ids = skills.map((s) => s.id);
    const rounds = [
      { skillId: ids[0]!, score: 90, ts: NOW - 1000, durationMs: 120_000 },
      { skillId: ids[1]!, score: 60, ts: NOW - 2 * DAY, durationMs: 180_000 },
      { skillId: ids[1]!, score: 80, ts: NOW - 2 * DAY + 5000, durationMs: 60_000 },
      { skillId: ids[0]!, score: 50, ts: NOW - 9 * DAY }, // minggu lalu
    ];
    const r = childInsights({
      rounds,
      played: 12,
      results: { [ids[0]!]: res(90, 2, NOW), [ids[1]!]: res(80, 2) },
      skills,
      books,
      now: NOW,
    });
    expect(r.weekRounds).toBe(3);
    expect(r.weekPassed).toBe(2);
    expect(r.weekMinutes).toBe(6);
    expect(r.activeDays).toBe(2);
    expect(r.week.at(-1)).toMatchObject({ rounds: 1, minutes: 2 });
    expect(r.trend).toEqual({ now: 77, before: 50 });
    expect(r.books).toEqual([
      expect.objectContaining({ title: 'Math Grade 1', passed: 2, levels: 5, percent: 40 }),
    ]);
    expect(r.recent[0]).toMatchObject({
      title: 'Judul A1',
      book: 'Math Grade 1',
      level: 1,
      passed: true,
    });
    expect(r.totals).toMatchObject({ points: 170, passed: 2, played: 12 });
    expect(r.next).toMatchObject({ topic: 'Membilang', level: 3, paid: false });
    expect(r.strength).toMatchObject({ topic: 'Membilang', best: 85 });
  });

  it('topik yang perlu latihan: belum lulus dengan percobaan terbanyak', () => {
    const ids = skills.map((s) => s.id);
    const r = childInsights({
      rounds: [],
      results: { [ids[0]!]: res(80), [ids[1]!]: res(40, 4), [ids[3]!]: res(60, 1) },
      skills,
      books,
      now: NOW,
    });
    expect(r.focus).toEqual({
      book: 'Math Grade 1',
      topic: 'Membilang',
      level: 2,
      best: 40,
      attempts: 4,
    });
    expect(r.next).toMatchObject({ level: 2 });
  });

  it('langkah berikutnya berbayar ditandai paid (tanpa harga)', () => {
    const ids = skills.map((s) => s.id);
    const r = childInsights({
      rounds: [],
      results: { [ids[0]!]: res(90), [ids[1]!]: res(90), [ids[3]!]: res(90), [ids[4]!]: res(90) },
      skills,
      books,
      now: NOW,
      access: { paywall: true, freeLevels: 2, all: false, books: [] },
    });
    expect(r.next).toMatchObject({ topic: 'Membilang', level: 3, paid: true });
  });
});
