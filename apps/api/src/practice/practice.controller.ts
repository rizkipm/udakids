import { Body, Controller, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import {
  needsPurchase,
  GRADES,
  jagoStateSchema,
  levelStatuses,
  standaloneCodes,
  groupStartCodes,
  mergeJago,
  isPassed,
  passedLevels,
  practiceSyncSchema,
  skillIdSchema,
  quizScore,
  roundScore,
  validRoundPoints,
  rankLeaders,
  totalPoints,
  totalTimeMs,
  recordQuiz,
  type PracticeSync,
  type QuizResult,
  type SessionUser,
  mockConfigOf,
  mockPassScore,
  PASS_SCORE,
  mockRetakeLocked,
  mockPointsRange,
  mockScore100,
  type MockConfig,
  type SkillTemplate,
} from '@little-coder/engine';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { BillingService } from '../billing/billing.service.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import {
  children,
  classes,
  events,
  quizResults,
  skillCatalogs,
  skillMastery,
  skills,
} from '../db/schema.js';

const LEADERBOARD_SIZE = 50;

export type LeaderRow = {
  id: string;
  nickname: string;
  momoColor: string;
  points: number;
  passed: number;
  timeMs: number;
  position: number;
  /** Level tertinggi yang lulus: buku (jenjang tertinggi) + nomor level. */
  highest: { book: string; level: number } | null;
};

type QuizIn = PracticeSync['quizzes'][number];

/** Mock Test (D-072): jumlah soal sesuai konfigurasi dan poin dalam rentang yang mungkin. Level biasa selalu sah. */
function validMock(q: QuizIn, mocks: Map<string, MockConfig>): boolean {
  const c = mocks.get(q.skillId);
  if (!c)
    return (
      q.points === undefined &&
      q.review === undefined &&
      (q.roundPoints === undefined || validRoundPoints(q.roundPoints, q.correct, q.total))
    );
  if (q.roundPoints !== undefined) return false;
  if (q.total !== c.questions || q.points === undefined || q.correct > q.total) return false;
  // Laporan (opsional) harus satu entri per soal, dengan jumlah benar yang sama.
  if (
    q.review &&
    (q.review.length !== q.total ||
      q.review.filter((r) => r.outcome === 'right').length !== q.correct)
  )
    return false;
  const [min, max] = mockPointsRange(c);
  return q.points >= min && q.points <= max;
}

/** Skor 0–100: Mock Test dari poin gaya EMC, level biasa dari persen benar. */
function scoreOf(q: QuizIn, mocks?: Map<string, MockConfig>): number {
  const c = mocks?.get(q.skillId);
  if (c) return mockScore100(c, q.points ?? 0);
  // Level biasa: dari poin soal (D-078) bila ada, selain itu persen benar (perangkat lama).
  return q.roundPoints !== undefined
    ? roundScore(q.roundPoints, q.total)
    : quizScore(q.correct, q.total);
}

/** Batas lulus skor 0–100: mock dengan KKM (D-074) memakai KKM-nya, lainnya batas biasa. */
function passScoreOf(q: QuizIn, mocks?: Map<string, MockConfig>): number {
  const c = mocks?.get(q.skillId);
  return c ? mockPassScore(c) : PASS_SCORE;
}

@Roles('child')
@Controller('practice')
export class PracticeController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly billing: BillingService,
  ) {}

  @Get('state')
  async state(@CurrentUser() user: SessionUser) {
    const rows = await this.db.select().from(skillMastery).where(eq(skillMastery.childId, user.id));
    return {
      states: Object.fromEntries(rows.map((r) => [r.skillId, r.state])),
      quizzes: await this.quizzes(this.db, user.id),
    };
  }

  /**
   * Profil anak (D-022): total skor (jumlah skor terbaik per level), level lulus, peringkat di kelas
   * workshop (hanya posisi sendiri, tanpa nama anak lain), dan riwayat ronde terbaru.
   */
  /**
   * Laporan Mock Test milik anak yang login SAJA (D-072): percobaan terbaru beserta hasil tiap soal. Anak lain tidak
   * bisa melihat laporan ini (hanya `user.id` sendiri).
   */
  @Get('mock/:skillId/attempts')
  async mockAttempts(
    @CurrentUser() user: SessionUser,
    @Param('skillId', new ZodPipe(skillIdSchema)) skillId: string,
  ) {
    const rows = await this.db
      .select({ id: events.id, ts: events.ts, payload: events.payload })
      .from(events)
      .where(
        and(
          eq(events.childId, user.id),
          eq(events.type, 'quiz_result'),
          sql`${events.payload}->>'skillId' = ${skillId}`,
        ),
      )
      .orderBy(desc(events.ts))
      .limit(20);
    return rows.map((r) => {
      const p = r.payload as {
        correct: number;
        total: number;
        score: number;
        points?: number;
        durationMs?: number;
        review?: unknown[];
      };
      return {
        id: r.id,
        ts: r.ts.toISOString(),
        correct: p.correct,
        total: p.total,
        score: p.score,
        points: p.points ?? null,
        durationMs: p.durationMs ?? null,
        review: Array.isArray(p.review) ? p.review : null,
      };
    });
  }

  /**
   * Level terakhir yang dimainkan anak ini (D-073), dari perangkat mana pun: dipakai tombol "Lanjutkan" di beranda.
   * Mock test tidak ikut (mock dimulai sendiri dari halaman topiknya).
   */
  @Get('resume')
  async resume(@CurrentUser() user: SessionUser) {
    const res = await this.db.execute(sql`
      select e.payload->>'skillId' as skill_id, e.ts
      from events e
      join skills s on s.id = e.payload->>'skillId' and s.status = 'active'
      where e.child_id = ${user.id}
        and e.type in ('item_answer', 'quiz_result')
        and coalesce(s.template->>'family', '') <> 'mock'
      order by e.ts desc
      limit 1`);
    const row = res.rows[0];
    return row
      ? { skillId: String(row.skill_id), ts: new Date(String(row.ts)).toISOString() }
      : null;
  }

  @Get('profile')
  async profile(@CurrentUser() user: SessionUser) {
    const mine = await this.quizzes(this.db, user.id);
    const total = totalPoints(mine);
    const [child] = await this.db
      .select({
        nickname: children.nickname,
        momoColor: children.momoColor,
        classId: children.classId,
      })
      .from(children)
      .where(eq(children.id, user.id));

    let className: string | null = null;
    if (child?.classId) {
      const [cls] = await this.db
        .select({ eventName: classes.eventName })
        .from(classes)
        .where(eq(classes.id, child.classId));
      className = cls?.eventName ?? null;
    }
    // Peringkat global (D-024): posisi anak di antara semua anak yang sudah bermain.
    const board = await this.board();
    const me = board.find((r) => r.id === user.id);
    const rank = me ? { position: me.position, of: board.length } : null;

    const [played] = await this.db
      .select({ n: count() })
      .from(events)
      .where(and(eq(events.childId, user.id), eq(events.type, 'quiz_result')));
    // Total soal dijawab (D-045), sama dengan laporan orang tua.
    const [answered] = await this.db
      .select({ n: sql<number>`coalesce(sum(${skillMastery.answered}), 0)::int` })
      .from(skillMastery)
      .where(eq(skillMastery.childId, user.id));
    const history = await this.db
      .select({
        id: events.id,
        payload: events.payload,
        ts: events.ts,
        title: skills.title,
        domain: skills.domain,
        grade: skills.grade,
        category: skills.category,
        order: skills.order,
      })
      .from(events)
      .leftJoin(skills, eq(skills.id, sql`${events.payload}->>'skillId'`))
      .where(and(eq(events.childId, user.id), eq(events.type, 'quiz_result')))
      .orderBy(desc(events.ts))
      .limit(50);

    return {
      nickname: child?.nickname ?? user.name,
      momoColor: child?.momoColor ?? 'ungu',
      totalPoints: total,
      passedLevels: passedLevels(mine),
      totalTimeMs: totalTimeMs(mine),
      highest: me?.highest ?? null,
      className,
      played: Number(played?.n ?? 0),
      answered: Number(answered?.n ?? 0),
      rank,
      history: history.map((h) => {
        const p = h.payload as {
          skillId: string;
          correct: number;
          total: number;
          score: number;
          durationMs?: number;
        };
        return {
          id: h.id,
          skillId: p.skillId,
          title: h.title ?? p.skillId,
          domain: h.domain,
          grade: h.grade,
          category: h.category,
          order: h.order,
          score: p.score,
          correct: p.correct,
          total: p.total,
          passed: isPassed(p.score),
          durationMs: p.durationMs ?? null,
          ts: h.ts,
        };
      }),
    };
  }

  /**
   * Papan peringkat global (D-024): semua anak aktif yang sudah menyelesaikan minimal satu ronde.
   * Anak lain hanya terlihat nama panggilan + warna Momo (PRD A17: tanpa data pribadi lain).
   */
  @Get('leaderboard')
  async leaderboard(@CurrentUser() user: SessionUser) {
    const board = await this.board();
    const strip = ({ id, ...r }: LeaderRow) => ({ ...r, me: id === user.id });
    const me = board.find((r) => r.id === user.id);
    return {
      total: board.length,
      rows: board.slice(0, LEADERBOARD_SIZE).map(strip),
      me: me ? strip(me) : null,
    };
  }

  private async board(): Promise<LeaderRow[]> {
    const totals = await this.db
      .select({
        id: children.id,
        nickname: children.nickname,
        momoColor: children.momoColor,
        points: sql<number>`coalesce(sum(${quizResults.best}), 0)`,
        passed: sql<number>`count(*) filter (where ${quizResults.passed})`,
        timeMs: sql<number>`coalesce(sum(${quizResults.bestTimeMs}), 0)`,
      })
      .from(children)
      .innerJoin(quizResults, eq(quizResults.childId, children.id))
      .where(eq(children.active, true))
      .groupBy(children.id);
    const passedRows = await this.db
      .select({
        childId: quizResults.childId,
        domain: skills.domain,
        grade: skills.grade,
        order: skills.order,
      })
      .from(quizResults)
      .innerJoin(skills, eq(skills.id, quizResults.skillId))
      // Level tertinggi hanya dari skill aktif (skill lama yang dijadikan draft tidak dihitung).
      .where(and(eq(quizResults.passed, true), eq(skills.status, 'active')));
    const books = new Map(
      (
        await this.db
          .select({
            domain: skillCatalogs.domain,
            grade: skillCatalogs.grade,
            title: skillCatalogs.title,
          })
          .from(skillCatalogs)
      ).map((c) => [`${c.domain}/${c.grade}`, c.title]),
    );
    const rankOfGrade = (g: string) => GRADES.indexOf(g as (typeof GRADES)[number]);
    const highest = new Map<string, { domain: string; grade: string; order: number }>();
    for (const r of passedRows) {
      const cur = highest.get(r.childId);
      const better =
        !cur ||
        rankOfGrade(r.grade) > rankOfGrade(cur.grade) ||
        (r.grade === cur.grade && r.order > cur.order);
      if (better) highest.set(r.childId, r);
    }
    return rankLeaders(
      totals.map((t) => {
        const h = highest.get(t.id);
        return {
          id: t.id,
          nickname: t.nickname,
          momoColor: t.momoColor,
          points: Number(t.points),
          passed: Number(t.passed),
          timeMs: Number(t.timeMs),
          highest: h
            ? { book: books.get(`${h.domain}/${h.grade}`) ?? h.grade, level: h.order }
            : null,
        };
      }),
    );
  }

  /**
   * Pisahkan ronde yang sah (level terbuka/lulus) dari yang ditolak. Disimulasikan berurutan menurut
   * waktu, sehingga lulus Level 1 lalu memainkan Level 2 dalam satu kiriman tetap diterima.
   */
  private async unlockedQuizzes(
    tx: Pick<Db, 'select'>,
    childId: string,
    quizzes: PracticeSync['quizzes'],
  ): Promise<{
    allowed: PracticeSync['quizzes'];
    rejected: string[];
    mocks?: Map<string, MockConfig>;
  }> {
    if (quizzes.length === 0) return { allowed: [], rejected: [] };
    const mocks = await this.mockConfigs(tx);
    const nodes = await tx
      .select({
        id: skills.id,
        domain: skills.domain,
        grade: skills.grade,
        category: skills.category,
        order: skills.order,
        family: sql<string>`${skills.template}->>'family'`,
      })
      .from(skills)
      .where(eq(skills.status, 'active'));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const books = new Map(
      (
        await tx
          .select({
            domain: skillCatalogs.domain,
            grade: skillCatalogs.grade,
            categories: skillCatalogs.categories,
          })
          .from(skillCatalogs)
      ).map((c) => {
        const cats = c.categories as { code: string; group?: string; standalone?: boolean }[];
        return [
          `${c.domain}/${c.grade}` as string,
          {
            codes: cats.map((x) => x.code),
            standalone: standaloneCodes(cats),
            groupStarts: groupStartCodes(cats),
          },
        ] as const;
      }),
    );
    const results = await this.quizzes(tx, childId);
    const access = await this.billing.accessForChild(childId);
    const allowed: PracticeSync['quizzes'] = [];
    const rejected: string[] = [];
    for (const q of [...quizzes].sort((a, b) => a.ts - b.ts)) {
      const node = byId.get(q.skillId);
      const key = node && `${node.domain}/${node.grade}`;
      const book = key ? books.get(key) : undefined;
      const status =
        node && book
          ? levelStatuses(
              book.codes,
              nodes.filter((n) => n.domain === node.domain && n.grade === node.grade),
              results,
              book.standalone,
              book.groupStarts,
            )[q.skillId]
          : undefined;
      // Level berbayar yang belum dibeli juga ditolak (D-036), sama seperti level terkunci.
      if (
        !status ||
        status === 'locked' ||
        needsPurchase(access, { ...node!, ...(mocks.has(q.skillId) && { family: 'mock' }) }) ||
        !validMock(q, mocks) ||
        // Tanpa Premium, Mock test 1 hanya boleh dikerjakan sekali (D-072).
        (mocks.has(q.skillId) && mockRetakeLocked(access, node!, results[q.skillId]?.attempts ?? 0))
      ) {
        rejected.push(q.id);
        continue;
      }
      allowed.push(q);
      results[q.skillId] = recordQuiz(
        results[q.skillId],
        scoreOf(q, mocks),
        q.ts,
        undefined,
        passScoreOf(q, mocks),
      );
    }
    return { allowed, rejected, mocks };
  }

  /** Konfigurasi Mock Test olimpiade (D-072) per id skill. */
  private async mockConfigs(tx: Pick<Db, 'select'>): Promise<Map<string, MockConfig>> {
    const rows = await tx
      .select({ id: skills.id, template: skills.template })
      .from(skills)
      .where(sql`${skills.template}->>'family' = 'mock'`);
    return new Map(rows.map((r) => [r.id, mockConfigOf(r.template as SkillTemplate)]));
  }

  private async quizzes(
    db: Pick<Db, 'select'>,
    childId: string,
  ): Promise<Record<string, QuizResult>> {
    const rows = await db.select().from(quizResults).where(eq(quizResults.childId, childId));
    return Object.fromEntries(
      rows.map((r) => [
        r.skillId,
        {
          best: r.best,
          last: r.last,
          passed: r.passed,
          attempts: r.attempts,
          ts: r.updatedAt.getTime(),
          ...(r.bestTimeMs !== null && { bestTimeMs: r.bestTimeMs }),
          ...(r.lastTimeMs !== null && { lastTimeMs: r.lastTimeMs }),
        },
      ]),
    );
  }

  /**
   * Sinkronisasi dari outbox perangkat. Idempoten per event.id (PRD A11): kirim ulang tidak
   * menggandakan jawaban. Konflik Skor Jago: state ts terbaru menang, visibleStage = max.
   */
  @Post('sync')
  @HttpCode(200)
  async sync(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(practiceSyncSchema)) body: PracticeSync,
  ) {
    return this.db.transaction(async (tx) => {
      let inserted: { id: string; payload: unknown }[] = [];
      if (body.answers.length > 0) {
        inserted = await tx
          .insert(events)
          .values(
            body.answers.map((a) => ({
              id: a.id,
              childId: user.id,
              type: 'item_answer',
              payload: {
                skillId: a.skillId,
                correct: a.correct,
                band: a.band,
                ...(a.chosenDistractor && { chosenDistractor: a.chosenDistractor }),
                ...(a.review && { review: true }),
              },
              ts: new Date(a.ts),
            })),
          )
          .onConflictDoNothing({ target: events.id })
          .returning({ id: events.id, payload: events.payload });
      }
      // Hitungan jawaban hanya dari event yang benar-benar baru.
      const counts = new Map<string, { answered: number; correct: number }>();
      for (const e of inserted) {
        const p = e.payload as { skillId: string; correct: boolean };
        const c = counts.get(p.skillId) ?? { answered: 0, correct: 0 };
        counts.set(p.skillId, {
          answered: c.answered + 1,
          correct: c.correct + (p.correct ? 1 : 0),
        });
      }

      // Hanya skill yang benar-benar ada & aktif (audit L6): id asal tidak membuat baris sampah.
      const known = new Set(
        body.states.length || counts.size
          ? (
              await tx
                .select({ id: skills.id })
                .from(skills)
                .where(
                  inArray(skills.id, [
                    ...new Set([...body.states.map((x) => x.skillId), ...counts.keys()]),
                  ]),
                )
            ).map((r) => r.id)
          : [],
      );
      const incoming = new Map(
        body.states.filter((s) => known.has(s.skillId)).map((s) => [s.skillId, s.state]),
      );
      const touched = new Set([
        ...[...counts.keys()].filter((k) => known.has(k)),
        ...incoming.keys(),
      ]);
      const existing = touched.size
        ? await tx.select().from(skillMastery).where(eq(skillMastery.childId, user.id))
        : [];
      const current = new Map(existing.map((r) => [r.skillId, r]));
      for (const skillId of touched) {
        const prev = current.get(skillId);
        const next = incoming.get(skillId);
        const prevState = prev ? jagoStateSchema.parse(prev.state) : undefined;
        const state = prevState && next ? mergeJago(prevState, next) : (next ?? prevState);
        if (!state) continue;
        const c = counts.get(skillId) ?? { answered: 0, correct: 0 };
        await tx
          .insert(skillMastery)
          .values({ childId: user.id, skillId, state, answered: c.answered, correct: c.correct })
          .onConflictDoUpdate({
            target: [skillMastery.childId, skillMastery.skillId],
            set: {
              state,
              answered: sql`${skillMastery.answered} + ${c.answered}`,
              correct: sql`${skillMastery.correct} + ${c.correct}`,
              updatedAt: new Date(),
            },
          });
      }
      // Kunci level juga dicek di server (bukan hanya di perangkat): ronde untuk level yang masih
      // terkunci, atau skill yang tidak aktif, ditolak agar skor & papan peringkat tidak bisa dicurangi.
      const { allowed, rejected, mocks } = await this.unlockedQuizzes(tx, user.id, body.quizzes);
      // Hasil ronde: idempoten per id (event quiz_result), skor terbaik & lulus tidak pernah turun.
      if (allowed.length > 0) {
        const fresh = await tx
          .insert(events)
          .values(
            allowed.map((q) => ({
              id: q.id,
              childId: user.id,
              type: 'quiz_result',
              payload: {
                skillId: q.skillId,
                correct: q.correct,
                total: q.total,
                score: scoreOf(q, mocks),
                ...(q.points !== undefined && { points: q.points }),
                ...(q.roundPoints !== undefined && { roundPoints: q.roundPoints }),
                ...(q.review && { review: q.review }),
                ...(q.durationMs !== undefined && { durationMs: q.durationMs }),
              },
              ts: new Date(q.ts),
            })),
          )
          .onConflictDoNothing({ target: events.id })
          .returning({ id: events.id });
        const freshIds = new Set(fresh.map((f) => f.id));
        const current = await this.quizzes(tx, user.id);
        for (const q of [...allowed].sort((a, b) => a.ts - b.ts)) {
          if (!freshIds.has(q.id)) continue;
          const next = recordQuiz(
            current[q.skillId],
            scoreOf(q, mocks),
            q.ts,
            q.durationMs,
            passScoreOf(q, mocks),
          );
          current[q.skillId] = next;
          const row = {
            best: next.best,
            last: next.last,
            passed: next.passed,
            attempts: next.attempts,
            bestTimeMs: next.bestTimeMs ?? null,
            lastTimeMs: next.lastTimeMs ?? null,
            updatedAt: new Date(q.ts),
          };
          await tx
            .insert(quizResults)
            .values({ childId: user.id, skillId: q.skillId, ...row })
            .onConflictDoUpdate({ target: [quizResults.childId, quizResults.skillId], set: row });
        }
      }
      await tx.update(children).set({ lastActiveAt: new Date() }).where(eq(children.id, user.id));
      const states = await tx.select().from(skillMastery).where(eq(skillMastery.childId, user.id));
      return {
        accepted: inserted.length,
        duplicates: body.answers.length - inserted.length,
        rejectedQuizzes: rejected,
        states: Object.fromEntries(states.map((r) => [r.skillId, r.state])),
        quizzes: await this.quizzes(tx, user.id),
      };
    });
  }
}
