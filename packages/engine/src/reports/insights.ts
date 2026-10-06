import { FREE_ACCESS, withAccess, type Access, type PlayStatus } from '../billing/billing.js';
import {
  levelStatuses,
  skippedStandalone,
  standaloneCodes,
  passedLevels,
  totalPoints,
  totalTimeMs,
  type QuizResult,
} from '../scoring/quiz.js';

/**
 * Ringkasan belajar anak untuk dasbor orang tua (D-038). Murni & deterministik: waktu dan zona waktu
 * dari parameter. Hanya angka dari ronde level (D-021) — tanpa peringkat antar anak, tanpa streak.
 */

export type InsightRound = {
  skillId: string;
  score: number;
  ts: number;
  durationMs?: number | null;
};
export type InsightSkill = {
  id: string;
  domain: string;
  grade: string;
  category: string;
  order: number;
  title: string;
};
export type InsightBook = {
  domain: string;
  grade: string;
  title: string;
  categories: readonly { code: string; title: string; standalone?: boolean }[];
};

export type DayActivity = { date: string; rounds: number; passed: number; minutes: number };
export type BookProgress = {
  domain: string;
  grade: string;
  title: string;
  passed: number;
  levels: number;
  /** 0–100. */
  percent: number;
  lastTs: number;
};
export type TopicRef = {
  book: string;
  topic: string;
  level?: number;
  best?: number;
  attempts?: number;
};

export type ChildInsights = {
  totals: {
    points: number;
    passed: number;
    played: number;
    timeMs: number;
    /** Total soal yang sudah dijawab (latihan + level, D-045). */
    answered: number;
  };
  week: DayActivity[];
  activeDays: number;
  weekRounds: number;
  weekMinutes: number;
  weekPassed: number;
  /** Rata-rata skor 7 hari terakhir vs 7 hari sebelumnya (null bila belum cukup data). */
  trend: { now: number; before: number | null } | null;
  books: BookProgress[];
  recent: (InsightRound & { title: string; book: string; level: number; passed: boolean })[];
  next: (TopicRef & { skillId: string; level: number; paid: boolean }) | null;
  strength: TopicRef | null;
  focus: TopicRef | null;
};

const DAY = 86_400_000;
/** Tanggal kalender (YYYY-MM-DD) di zona dengan selisih `offsetMin` dari UTC (WIB = 420). */
export const localDate = (ts: number, offsetMin = 420) =>
  new Date(ts + offsetMin * 60_000).toISOString().slice(0, 10);

const levelTitle = (title: string) => title.replace(/^.*?—\s*Level\s+\d+\s*—\s*/, '');
const avg = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;

export function childInsights(input: {
  rounds: readonly InsightRound[];
  /** Total ronde sepanjang waktu (rounds boleh hanya sebagian terbaru). */
  played?: number;
  /** Total soal yang sudah dijawab sepanjang waktu (D-045). */
  answered?: number;
  results: Readonly<Record<string, QuizResult | undefined>>;
  skills: readonly InsightSkill[];
  books: readonly InsightBook[];
  now: number;
  offsetMin?: number;
  access?: Access;
}): ChildInsights {
  const { results, skills, books, now } = input;
  const off = input.offsetMin ?? 420;
  const access = input.access ?? FREE_ACCESS;
  const rounds = [...input.rounds].sort((a, b) => b.ts - a.ts);
  const byId = new Map(skills.map((s) => [s.id, s]));
  const bookOf = (s: InsightSkill) =>
    books.find((b) => b.domain === s.domain && b.grade === s.grade);
  const topicOf = (s: InsightSkill) =>
    bookOf(s)?.categories.find((c) => c.code === s.category)?.title ?? s.category;

  // 7 hari terakhir (lama → hari ini).
  const days = Array.from({ length: 7 }, (_, i) => localDate(now - (6 - i) * DAY, off));
  const week: DayActivity[] = days.map((date) => ({ date, rounds: 0, passed: 0, minutes: 0 }));
  for (const r of rounds) {
    const d = week.find((w) => w.date === localDate(r.ts, off));
    if (!d) continue;
    d.rounds++;
    if (r.score >= 70) d.passed++;
    d.minutes += (r.durationMs ?? 0) / 60_000;
  }
  for (const d of week) d.minutes = Math.round(d.minutes);

  const since = (from: number, to: number) =>
    rounds.filter((r) => r.ts > now - to * DAY && r.ts <= now - from * DAY).map((r) => r.score);
  const last7 = since(0, 7);
  const prev7 = since(7, 14);
  const trend = last7.length ? { now: avg(last7), before: prev7.length ? avg(prev7) : null } : null;

  // Progres per buku yang pernah dimainkan.
  const progress: BookProgress[] = [];
  for (const b of books) {
    const inBook = skills.filter((s) => s.domain === b.domain && s.grade === b.grade);
    const touched = inBook.filter((s) => results[s.id]);
    if (touched.length === 0) continue;
    const passed = inBook.filter((s) => results[s.id]?.passed).length;
    progress.push({
      domain: b.domain,
      grade: b.grade,
      title: b.title,
      passed,
      levels: inBook.length,
      percent: inBook.length ? Math.round((passed / inBook.length) * 100) : 0,
      lastTs: Math.max(...touched.map((s) => results[s.id]!.ts ?? 0)),
    });
  }
  progress.sort((a, b) => b.lastTs - a.lastTs);

  const recent = rounds.slice(0, 5).flatMap((r) => {
    const s = byId.get(r.skillId);
    if (!s) return [];
    return [
      {
        ...r,
        title: levelTitle(s.title),
        book: bookOf(s)?.title ?? '',
        level: s.order,
        passed: r.score >= 70,
      },
    ];
  });

  // Langkah berikutnya: level terbuka pertama di buku yang terakhir dimainkan.
  let next: ChildInsights['next'] = null;
  const lastBook = progress[0];
  if (lastBook) {
    const book = books.find((b) => b.domain === lastBook.domain && b.grade === lastBook.grade)!;
    const inBook = skills.filter((s) => s.domain === book.domain && s.grade === book.grade);
    const order = book.categories.map((c) => c.code);
    const alone = standaloneCodes(book.categories);
    const statuses: Record<string, PlayStatus> = withAccess(
      levelStatuses(order, inBook, results, alone),
      inBook,
      access,
    );
    const skip = skippedStandalone(inBook, results, alone);
    const sorted = [...inBook]
      .filter((s) => !skip.has(s.category))
      .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.order - b.order);
    const target =
      sorted.find((s) => statuses[s.id] === 'open') ??
      sorted.find((s) => statuses[s.id] === 'paid');
    if (target)
      next = {
        skillId: target.id,
        book: book.title,
        topic: topicOf(target),
        level: target.order,
        paid: statuses[target.id] === 'paid',
      };
  }

  // Topik terkuat (≥ 2 level lulus, rata-rata skor terbaik tertinggi) & topik yang perlu latihan
  // (level belum lulus dengan percobaan terbanyak / skor terbaik terendah).
  const topics = new Map<string, { s: InsightSkill; bests: number[]; passed: number }>();
  for (const s of skills) {
    const r = results[s.id];
    if (!r) continue;
    const key = `${s.domain}/${s.grade}/${s.category}`;
    const t = topics.get(key) ?? { s, bests: [], passed: 0 };
    t.bests.push(r.best);
    if (r.passed) t.passed++;
    topics.set(key, t);
  }
  const strong = [...topics.values()]
    .filter((t) => t.passed >= 2)
    .sort((a, b) => avg(b.bests) - avg(a.bests))[0];
  const strength = strong
    ? { book: bookOf(strong.s)?.title ?? '', topic: topicOf(strong.s), best: avg(strong.bests) }
    : null;
  const stuck = skills
    .filter((s) => results[s.id] && !results[s.id]!.passed)
    .sort(
      (a, b) =>
        results[b.id]!.attempts - results[a.id]!.attempts ||
        results[a.id]!.best - results[b.id]!.best,
    )[0];
  const focus = stuck
    ? {
        book: bookOf(stuck)?.title ?? '',
        topic: topicOf(stuck),
        level: stuck.order,
        best: results[stuck.id]!.best,
        attempts: results[stuck.id]!.attempts,
      }
    : null;

  const weekRounds = week.reduce((a, d) => a + d.rounds, 0);
  return {
    totals: {
      points: totalPoints(results),
      passed: passedLevels(results),
      played: Math.max(input.played ?? 0, rounds.length),
      timeMs: totalTimeMs(results),
      answered: input.answered ?? 0,
    },
    week,
    activeDays: week.filter((d) => d.rounds > 0).length,
    weekRounds,
    weekMinutes: week.reduce((a, d) => a + d.minutes, 0),
    weekPassed: week.reduce((a, d) => a + d.passed, 0),
    trend,
    books: progress,
    recent,
    next,
    strength,
    focus: focus && focus.topic ? focus : null,
  };
}
