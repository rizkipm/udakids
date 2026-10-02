import { Controller, Get, Inject } from '@nestjs/common';
import { childInsights, planStatus, type QuizResult, type SessionUser } from '@little-coder/engine';
import { and, count, desc, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { BillingService } from '../billing/billing.service.js';
import { DB, type Db } from '../db/db.module.js';
import {
  children,
  classes,
  entitlements,
  events,
  quizResults,
  skillCatalogs,
  skillMastery,
  skills,
} from '../db/schema.js';

const DAY = 86_400_000;

/**
 * Dasbor orang tua (D-038): ringkasan belajar semua anak dalam satu panggilan — aktivitas 7 hari,
 * tren skor, progres per buku, ronde terakhir, langkah berikutnya, topik kuat & perlu latihan.
 */
@Roles('parent')
@Controller('parent')
export class ParentOverviewController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly billing: BillingService,
  ) {}

  @Get('overview')
  async overview(@CurrentUser() user: SessionUser) {
    const now = Date.now();
    const kids = await this.db
      .select({
        id: children.id,
        nickname: children.nickname,
        momoColor: children.momoColor,
        lastActiveAt: children.lastActiveAt,
        className: classes.eventName,
      })
      .from(children)
      .leftJoin(classes, eq(children.classId, classes.id))
      .where(and(eq(children.parentId, user.id), eq(children.active, true)))
      .orderBy(children.createdAt);
    const access = await this.billing.accessForParent(user.id);
    if (kids.length === 0) return { children: [], access };
    const ids = kids.map((k) => k.id);

    const [catalogs, nodes, results, rounds, played, answered] = await Promise.all([
      this.db.select().from(skillCatalogs),
      this.db
        .select({
          id: skills.id,
          domain: skills.domain,
          grade: skills.grade,
          category: skills.category,
          order: skills.order,
          title: skills.title,
        })
        .from(skills)
        .where(eq(skills.status, 'active')),
      this.db.select().from(quizResults).where(inArray(quizResults.childId, ids)),
      this.db
        .select({ childId: events.childId, payload: events.payload, ts: events.ts })
        .from(events)
        .where(
          and(
            inArray(events.childId, ids),
            eq(events.type, 'quiz_result'),
            gte(events.ts, new Date(now - 15 * DAY)),
          ),
        )
        .orderBy(desc(events.ts)),
      this.db
        .select({ childId: events.childId, n: count() })
        .from(events)
        .where(and(inArray(events.childId, ids), eq(events.type, 'quiz_result')))
        .groupBy(events.childId),
      // Total soal dijawab (D-045): sama dengan laporan anak (jumlah jawaban per skill).
      this.db
        .select({
          childId: skillMastery.childId,
          n: sql<number>`coalesce(sum(${skillMastery.answered}), 0)::int`,
        })
        .from(skillMastery)
        .where(inArray(skillMastery.childId, ids))
        .groupBy(skillMastery.childId),
    ]);
    // Ronde terakhir bisa lebih lama dari 15 hari: ambil 5 terakhir per anak bila perlu.
    const recentOld = await Promise.all(
      ids.map((id) =>
        this.db
          .select({ childId: events.childId, payload: events.payload, ts: events.ts })
          .from(events)
          .where(and(eq(events.childId, id), eq(events.type, 'quiz_result')))
          .orderBy(desc(events.ts))
          .limit(5),
      ),
    );
    // Status Free / Premium per anak (D-041): hak keluarga + Premium khusus anak dari admin.
    const ents = await this.db
      .select()
      .from(entitlements)
      .where(or(eq(entitlements.parentId, user.id), inArray(entitlements.childId, ids)));
    const accessOf = await Promise.all(ids.map((id) => this.billing.accessForChild(id)));
    const books = catalogs.map((c) => ({
      domain: c.domain,
      grade: c.grade,
      title: c.title,
      categories: c.categories as { code: string; title: string }[],
    }));

    return {
      access,
      children: kids.map((k, i) => {
        const mine = Object.fromEntries(
          results
            .filter((r) => r.childId === k.id)
            .map((r) => [
              r.skillId,
              {
                best: r.best,
                last: r.last,
                passed: r.passed,
                attempts: r.attempts,
                ts: r.updatedAt.getTime(),
                ...(r.bestTimeMs !== null && { bestTimeMs: r.bestTimeMs }),
                ...(r.lastTimeMs !== null && { lastTimeMs: r.lastTimeMs }),
              } satisfies QuizResult,
            ]),
        );
        const seen = new Set<string>();
        const list = [...rounds.filter((r) => r.childId === k.id), ...recentOld[i]!]
          .map((r) => {
            const p = r.payload as { skillId: string; score: number; durationMs?: number };
            return {
              skillId: p.skillId,
              score: p.score,
              durationMs: p.durationMs ?? null,
              ts: r.ts.getTime(),
            };
          })
          .filter((r) => {
            const key = `${r.skillId}@${r.ts}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        return {
          id: k.id,
          nickname: k.nickname,
          momoColor: k.momoColor,
          lastActiveAt: k.lastActiveAt,
          className: k.className,
          plan: planStatus(
            ents
              .filter((e) => e.parentId === user.id || e.childId === k.id)
              .map((e) => ({
                scope: e.scope,
                books: e.books as { domain: string; grade: string }[],
                endsAt: e.endsAt ? e.endsAt.toISOString() : null,
                source: e.source,
              })),
            new Date(now),
          ),
          insights: childInsights({
            rounds: list,
            played: Number(played.find((p) => p.childId === k.id)?.n ?? 0),
            answered: Number(answered.find((a) => a.childId === k.id)?.n ?? 0),
            results: mine,
            skills: nodes,
            books,
            now,
            access: accessOf[i]!,
          }),
        };
      }),
    };
  }
}
