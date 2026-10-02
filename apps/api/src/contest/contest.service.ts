import { NotFoundException } from '@nestjs/common';
import {
  contestEntryStatus,
  contestPhase,
  contestTimeMs,
  rankContest,
  type ContestItem,
} from '@little-coder/engine';
import { and, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/db.module.js';
import { children, contestEntries, contests, skillCatalogs } from '../db/schema.js';

/**
 * Logika bersama lomba live (D-042). Semua waktu memakai jam SERVER (`new Date()`), bukan jam perangkat.
 * Hasil & pemenang dihitung saat dibaca (tanpa cron): begitu `ends_at` lewat, peringkat langsung tersedia.
 */

export type ContestRow = typeof contests.$inferSelect;
export type EntryRow = typeof contestEntries.$inferSelect;
export type EntryFlags = {
  /** Jawaban < CONTEST_FAST_MS sejak jawaban sebelumnya / mulai. */
  fast?: number;
  /** Berapa kali halaman disembunyikan (pindah tab/aplikasi). */
  hidden?: number;
  /** Diskualifikasi oleh admin (alasan dicatat). */
  dq?: { reason: string; by: string; at: string } | null;
  /** Riwayat pembatalan diskualifikasi. */
  undq?: { by: string; at: string }[];
};

export const iso = (d: Date) => d.toISOString();

export const phaseOf = (c: ContestRow, now: Date) =>
  contestPhase({ startsAt: iso(c.startsAt), endsAt: iso(c.endsAt) }, now);

export async function findContest(db: Db, id: string, opts: { published?: boolean } = {}) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new NotFoundException('Lomba tidak ditemukan');
  const [c] = await db.select().from(contests).where(eq(contests.id, id));
  if (!c || (opts.published && !c.published)) throw new NotFoundException('Lomba tidak ditemukan');
  return c;
}

/** Judul buku per domain/jenjang ("Matematika TK"). */
export async function bookTitles(db: Db, list: { domain: string; grade: string }[]) {
  const domains = [...new Set(list.map((c) => c.domain))];
  if (domains.length === 0) return new Map<string, string>();
  const rows = await db
    .select({
      domain: skillCatalogs.domain,
      grade: skillCatalogs.grade,
      title: skillCatalogs.title,
    })
    .from(skillCatalogs)
    .where(inArray(skillCatalogs.domain, domains));
  return new Map(rows.map((r) => [`${r.domain}/${r.grade}`, r.title]));
}

/** Info lomba yang aman untuk semua pengguna (tanpa soal). */
export function contestInfo(c: ContestRow, now: Date, book?: string) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    domain: c.domain,
    grade: c.grade,
    book: book ?? null,
    categories: c.categories as string[],
    questionCount: c.questionCount,
    startsAt: iso(c.startsAt),
    endsAt: iso(c.endsAt),
    durationMinutes: c.durationMinutes,
    winners: c.winners,
    phase: phaseOf(c, now),
  };
}

export const totalOf = (e: EntryRow) => (e.items as ContestItem[]).length;

/** Status peserta (tanpa jawaban). */
export function entryState(e: EntryRow | undefined, now: Date) {
  const status = contestEntryStatus(e ?? null, now);
  if (!e) return { status, answered: 0, total: 0, deadlineAt: null, remainingMs: 0 };
  return {
    status,
    answered: e.answered,
    total: totalOf(e),
    deadlineAt: iso(e.deadlineAt),
    remainingMs: status === 'active' ? Math.max(0, e.deadlineAt.getTime() - now.getTime()) : 0,
    submittedAt: e.submittedAt ? iso(e.submittedAt) : null,
  };
}

export type RankedRow = {
  id: string;
  childId: string;
  nickname: string;
  momoColor: string;
  correct: number;
  answered: number;
  total: number;
  timeMs: number;
  finishedAt: number;
  position: number;
  score: number;
};

/**
 * Peringkat lomba dari peserta yang tidak didiskualifikasi dan akunnya masih aktif:
 * benar terbanyak → waktu tercepat → selesai lebih dulu (`rankContest`).
 */
export async function ranking(db: Db, contestId: string): Promise<RankedRow[]> {
  const rows = await db
    .select({
      id: contestEntries.id,
      childId: contestEntries.childId,
      nickname: children.nickname,
      momoColor: children.momoColor,
      correct: contestEntries.correct,
      answered: contestEntries.answered,
      items: contestEntries.items,
      startedAt: contestEntries.startedAt,
      deadlineAt: contestEntries.deadlineAt,
      submittedAt: contestEntries.submittedAt,
      lastAnswerAt: contestEntries.lastAnswerAt,
    })
    .from(contestEntries)
    .innerJoin(children, eq(children.id, contestEntries.childId))
    .where(
      and(
        eq(contestEntries.contestId, contestId),
        eq(contestEntries.disqualified, false),
        eq(children.active, true),
      ),
    );
  return rankContest(
    rows.map((r) => ({
      id: r.id,
      childId: r.childId,
      nickname: r.nickname,
      momoColor: r.momoColor,
      correct: r.correct,
      answered: r.answered,
      total: (r.items as unknown[]).length,
      ...contestTimeMs(r),
    })),
  );
}

/** Baris publik papan pemenang: hanya nama panggilan + warna Momo (PRD A17). */
export const publicRow = (r: RankedRow, meId?: string) => ({
  position: r.position,
  nickname: r.nickname,
  momoColor: r.momoColor,
  correct: r.correct,
  total: r.total,
  score: r.score,
  timeMs: r.timeMs,
  me: r.childId === meId,
});
