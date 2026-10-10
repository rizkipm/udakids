import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { jagoStateSchema, parentStatus, STAGE_NAMES, type JagoState } from '@little-coder/engine';
import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module.js';
import { inRange, type Period } from './period.js';
import {
  children,
  events,
  labProgress,
  parents,
  skillCatalogs,
  skillMastery,
  skills,
  staffUsers,
  quizResults,
} from '../db/schema.js';

const DAY = 24 * 60 * 60 * 1000;
type Category = { code: string; title: string };

@Injectable()
export class ReportsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Laporan satu anak: penguasaan per kategori, rekomendasi 3 skill, aktivitas 7 hari. */
  async childReport(childId: string, now = Date.now()) {
    const [child] = await this.db
      .select({
        id: children.id,
        nickname: children.nickname,
        momoColor: children.momoColor,
        lastActiveAt: children.lastActiveAt,
        createdAt: children.createdAt,
      })
      .from(children)
      .where(eq(children.id, childId));
    if (!child) throw new NotFoundException('Anak tidak ditemukan');

    const mastery = await this.db
      .select()
      .from(skillMastery)
      .where(eq(skillMastery.childId, childId));
    const byId = new Map(mastery.map((m) => [m.skillId, m]));
    const quizzes = new Map(
      (await this.db.select().from(quizResults).where(eq(quizResults.childId, childId))).map(
        (q) => [q.skillId, q],
      ),
    );
    const catalogs = await this.db.select().from(skillCatalogs);
    const active = await this.db
      .select({
        id: skills.id,
        domain: skills.domain,
        grade: skills.grade,
        category: skills.category,
        order: skills.order,
        title: skills.title,
      })
      .from(skills)
      .where(eq(skills.status, 'active'))
      .orderBy(skills.domain, skills.grade, skills.category, skills.order);

    const skillRows = active.map((s) => {
      const m = byId.get(s.id);
      const state: JagoState | undefined = m ? jagoStateSchema.parse(m.state) : undefined;
      return {
        ...s,
        score: state?.score ?? 0,
        stage: STAGE_NAMES[state?.visibleStage ?? 0],
        status: state ? parentStatus(state) : ('Belum mulai' as const),
        needsReview: state?.needsReview ?? false,
        answered: m?.answered ?? 0,
        correct: m?.correct ?? 0,
        /** Hasil ronde level terbaik (D-021), null bila belum pernah. */
        level: quizzes.has(s.id)
          ? {
              best: quizzes.get(s.id)!.best,
              passed: quizzes.get(s.id)!.passed,
              attempts: quizzes.get(s.id)!.attempts,
            }
          : null,
      };
    });

    const areas = catalogs.map((cat) => {
      const rows = skillRows.filter((s) => s.domain === cat.domain && s.grade === cat.grade);
      const categories = (cat.categories as Category[]).map((c) => {
        const list = rows.filter((s) => s.category === c.code);
        return {
          code: c.code,
          title: c.title,
          total: list.length,
          jago: list.filter((s) => s.status === 'Jago').length,
          bisa: list.filter((s) => s.status === 'Bisa').length,
          skills: list,
        };
      });
      const started = rows.filter((s) => s.status !== 'Belum mulai');
      return {
        domain: cat.domain,
        grade: cat.grade,
        title: cat.title,
        total: rows.length,
        jago: rows.filter((s) => s.status === 'Jago').length,
        bisa: rows.filter((s) => s.status === 'Bisa').length,
        /** Skor penguasaan area (0–100) = rata-rata Skor Jago skill yang sudah dimulai. */
        mastery: started.length
          ? Math.round(started.reduce((a, s) => a + s.score, 0) / started.length)
          : 0,
        categories,
      };
    });

    // Rekomendasi: yang sedang dipelajari dulu, lalu skill berikutnya yang belum dimulai (urutan katalog).
    const learning = skillRows.filter(
      (s) => s.status === 'Belajar' || s.status === 'Bisa' || s.needsReview,
    );
    const next = skillRows.filter((s) => s.status === 'Belum mulai');
    const recommendations = [...learning, ...next]
      .slice(0, 3)
      .map(({ id, title, category, status }) => ({ id, title, category, status }));

    const since = new Date(now - 7 * DAY);
    const [week] = await this.db
      .select({
        answered: count(),
        correct: sql<number>`count(*) filter (where (${events.payload}->>'correct')::boolean)`,
      })
      .from(events)
      .where(
        and(eq(events.childId, childId), eq(events.type, 'item_answer'), gte(events.ts, since)),
      );

    const totals = skillRows.reduce(
      (a, s) => ({ answered: a.answered + s.answered, correct: a.correct + s.correct }),
      { answered: 0, correct: 0 },
    );
    // Progres materi berformat lab (D-109): bagian yang dijelajahi & bintang uji, dengan judulnya.
    const labRows = await this.db
      .select()
      .from(labProgress)
      .where(eq(labProgress.childId, childId));
    const labKeys = [...new Set(labRows.map((r) => r.labKey))];
    const labs = labKeys.map((key) => {
      const [domain, grade, code] = key.split('/');
      const cat = catalogs.find((c) => c.domain === domain && c.grade === grade);
      const category = code
        ? (cat?.categories as (Category & { materi?: { judul: string } })[] | undefined)?.find(
            (c) => c.code === code,
          )
        : undefined;
      const title = code
        ? (category?.materi?.judul ?? category?.title ?? key)
        : ((cat?.lab as { judul?: string } | null)?.judul ?? cat?.title ?? key);
      const rows = labRows.filter((r) => r.labKey === key);
      const uji = rows.filter(
        (r) => r.part === 'uji' || r.part.startsWith('uji:') || r.part === 'ujian',
      );
      return {
        key,
        kind: code ? ('materi' as const) : ('buku' as const),
        title,
        book: cat?.title ?? '',
        /** Bagian yang sudah dijelajahi (tab/pos). */
        parts: rows.length,
        /** Bintang uji terbaik (0–3); untuk Lab Buku rata-rata pos yang sudah diuji. */
        stars: uji.length ? Math.round(uji.reduce((a, r) => a + r.stars, 0) / uji.length) : 0,
        updatedAt: rows.reduce((a, r) => (r.updatedAt > a ? r.updatedAt : a), rows[0]!.updatedAt),
      };
    });
    labs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return {
      child,
      labs,
      totals: {
        ...totals,
        jago: skillRows.filter((s) => s.status === 'Jago').length,
        skills: skillRows.length,
      },
      week: { answered: Number(week?.answered ?? 0), correct: Number(week?.correct ?? 0) },
      areas,
      recommendations,
    };
  }

  async overview(now = Date.now()) {
    const since = new Date(now - 7 * DAY);
    const one = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0);
    return {
      parents: await one(this.db.select({ n: count() }).from(parents)),
      children: await one(this.db.select({ n: count() }).from(children)),
      staff: await one(this.db.select({ n: count() }).from(staffUsers)),
      skills: await one(
        this.db.select({ n: count() }).from(skills).where(eq(skills.status, 'active')),
      ),
      answersWeek: await one(
        this.db
          .select({ n: count() })
          .from(events)
          .where(and(eq(events.type, 'item_answer'), gte(events.ts, since))),
      ),
      activeChildrenWeek: await one(
        this.db.select({ n: count() }).from(children).where(gte(children.lastActiveAt, since)),
      ),
      jago: await one(
        this.db
          .select({ n: count() })
          .from(skillMastery)
          .where(sql`(${skillMastery.state}->>'score')::numeric >= 100`),
      ),
    };
  }

  /** Analisis per skill: jumlah jawaban, ketepatan, anak, Jago, pengecoh terpopuler (miskonsepsi). */
  async skillStats(period?: Period) {
    // Jawaban & pengecoh mengikuti periode bila ada; jumlah Jago = posisi saat ini.
    const within = period ? inRange(sql.raw('"events"."ts"'), period.from, period.to) : sql`true`;
    const answers = await this.db
      .select({
        skillId: sql<string>`${events.payload}->>'skillId'`,
        answered: count(),
        correct: sql<number>`count(*) filter (where (${events.payload}->>'correct')::boolean)`,
        learners: sql<number>`count(distinct ${events.childId})`,
      })
      .from(events)
      .where(and(eq(events.type, 'item_answer'), within))
      .groupBy(sql`${events.payload}->>'skillId'`);
    const distractors = await this.db
      .select({
        skillId: sql<string>`${events.payload}->>'skillId'`,
        tag: sql<string>`${events.payload}->>'chosenDistractor'`,
        n: count(),
      })
      .from(events)
      .where(
        and(eq(events.type, 'item_answer'), sql`${events.payload} ? 'chosenDistractor'`, within),
      )
      .groupBy(sql`${events.payload}->>'skillId'`, sql`${events.payload}->>'chosenDistractor'`)
      .orderBy(desc(count()));
    const jago = await this.db
      .select({ skillId: skillMastery.skillId, n: count() })
      .from(skillMastery)
      .where(sql`(${skillMastery.state}->>'score')::numeric >= 100`)
      .groupBy(skillMastery.skillId);
    const rows = await this.db
      .select({
        id: skills.id,
        title: skills.title,
        category: skills.category,
        order: skills.order,
        grade: skills.grade,
        domain: skills.domain,
        status: skills.status,
      })
      .from(skills)
      .orderBy(skills.domain, skills.grade, skills.category, skills.order);
    const a = new Map(answers.map((x) => [x.skillId, x]));
    const j = new Map(jago.map((x) => [x.skillId, Number(x.n)]));
    return rows.map((s) => {
      const st = a.get(s.id);
      const answered = Number(st?.answered ?? 0);
      const correct = Number(st?.correct ?? 0);
      return {
        ...s,
        answered,
        accuracy: answered ? Math.round((correct / answered) * 100) : null,
        learners: Number(st?.learners ?? 0),
        jago: j.get(s.id) ?? 0,
        topDistractors: distractors
          .filter((d) => d.skillId === s.id)
          .slice(0, 3)
          .map((d) => ({ tag: d.tag, count: Number(d.n) })),
      };
    });
  }

  async childrenSummary() {
    const rows = await this.db
      .select({
        id: children.id,
        nickname: children.nickname,
        momoColor: children.momoColor,
        active: children.active,
        lastActiveAt: children.lastActiveAt,
        createdAt: children.createdAt,
        parentId: parents.id,
        parentName: parents.name,
        parentEmail: parents.email,
        answered: sql<number>`coalesce((select sum(${skillMastery.answered}) from ${skillMastery} where ${skillMastery.childId} = ${children.id}), 0)`,
        jago: sql<number>`(select count(*) from ${skillMastery} where ${skillMastery.childId} = ${children.id} and (${skillMastery.state}->>'score')::numeric >= 100)`,
      })
      .from(children)
      .leftJoin(parents, eq(children.parentId, parents.id))
      .orderBy(desc(children.createdAt));
    return rows.map((r) => ({ ...r, answered: Number(r.answered), jago: Number(r.jago) }));
  }
}
