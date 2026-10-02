import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import {
  DOMAINS,
  GRADES,
  LEADERBOARD_TOP,
  average2,
  compareLeaders,
  rankByAverage,
  type SessionUser,
} from '@little-coder/engine';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { CurrentUser } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';

const GLOBAL = 'global';
const scopeSchema = z
  .string()
  .regex(/^(global|[a-z]+\/[a-z0-9]+)$/)
  .default(GLOBAL);
/** Urutan papan (D-043): rata-rata (D-042, bawaan) atau total skor (D-024: skor → level lulus → waktu). */
const modeSchema = z.enum(['average', 'total']).default('average');
type Mode = z.infer<typeof modeSchema>;
const boardQuery = z.object({
  scope: scopeSchema,
  mode: modeSchema,
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
const detailQuery = z.object({ scope: scopeSchema, mode: modeSchema });
const uuid = z.uuid();

type Agg = {
  rounds: number;
  scoreSum: number;
  timeMs: number;
  passedLevels: number;
  /** Total skor = jumlah skor terbaik tiap level (D-024). */
  points: number;
  /** Jumlah waktu skor terbaik tiap level (D-024). */
  bestTimeMs: number;
};
type Entry = Agg & { id: string; nickname: string; momoColor: string };
type Board = (Entry & { average: number; position: number })[];
type Book = {
  key: string;
  domain: string;
  grade: string;
  title: string;
  categories: { code: string; title: string }[];
};
type Snapshot = {
  at: Date;
  books: Map<string, Book>;
  /** Kunci `<mode>:<scope>`. */
  boards: Map<string, Board>;
  /** Jumlah level aktif per `domain/grade` dan per `domain/grade/kategori`. */
  levels: Map<string, number>;
};

const n = (v: unknown) => Number(v ?? 0);
const gradeRank = (g: string) => GRADES.indexOf(g as (typeof GRADES)[number]);
const domainRank = (d: string) => DOMAINS.indexOf(d as (typeof DOMAINS)[number]);
const byBook = (a: { domain: string; grade: string }, b: { domain: string; grade: string }) =>
  domainRank(a.domain) - domainRank(b.domain) || gradeRank(a.grade) - gradeRank(b.grade);

/**
 * Peringkat rata-rata (D-042): global + per buku (domain/jenjang). Rata-rata = rata-rata skor semua
 * ronde `quiz_result` anak di lingkup itu (2 desimal); sama → total waktu tercepat. 25 teratas tampil
 * sebagai "papan pengumuman" (detail bisa dibuka), sisanya daftar berhalaman. Anak lain hanya terlihat
 * nama panggilan + warna Momo; id anak hanya dikirim untuk 25 teratas (perlu untuk detail) dan diri sendiri.
 */
@Controller('leaderboard')
export class LeaderboardController {
  private cache: { at: number; value: Promise<Snapshot> } | undefined;

  constructor(@Inject(DB) private readonly db: Db) {}

  @Get('scopes')
  async scopes() {
    const snap = await this.snapshot();
    return {
      updatedAt: snap.at.toISOString(),
      scopes: [
        {
          key: GLOBAL,
          title: 'Global',
          participants: snap.boards.get(`average:${GLOBAL}`)?.length ?? 0,
        },
        ...[...snap.books.values()]
          .filter((b) => (snap.boards.get(`average:${b.key}`)?.length ?? 0) > 0)
          .sort(byBook)
          .map((b) => ({
            key: b.key,
            domain: b.domain,
            grade: b.grade,
            title: b.title,
            participants: snap.boards.get(`average:${b.key}`)!.length,
          })),
      ],
    };
  }

  @Get()
  async board(
    @CurrentUser() user: SessionUser,
    @Query(new ZodPipe(boardQuery)) q: z.infer<typeof boardQuery>,
  ) {
    const snap = await this.snapshot();
    const { board, title } = this.scope(snap, q.scope, q.mode);
    const viewer = user.role === 'child' ? user.id : null;
    const start = LEADERBOARD_TOP + (q.page - 1) * q.pageSize;
    const mine = viewer ? board.find((r) => r.id === viewer) : undefined;
    return {
      scope: q.scope,
      mode: q.mode,
      title,
      updatedAt: snap.at.toISOString(),
      total: board.length,
      top: board.slice(0, LEADERBOARD_TOP).map((r) => publicRow(r, viewer, true)),
      rest: {
        page: q.page,
        pageSize: q.pageSize,
        total: Math.max(0, board.length - LEADERBOARD_TOP),
        items: board.slice(start, start + q.pageSize).map((r) => publicRow(r, viewer, false)),
      },
      me: mine ? publicRow(mine, viewer, true) : null,
    };
  }

  @Get('detail/:childId')
  async detail(
    @CurrentUser() user: SessionUser,
    @Param('childId', new ZodPipe(uuid)) childId: string,
    @Query(new ZodPipe(detailQuery)) q: z.infer<typeof detailQuery>,
  ) {
    const snap = await this.snapshot();
    const { board, book } = this.scope(snap, q.scope, q.mode);
    const self = user.role === 'child' && user.id === childId;
    const row = board.find((r) => r.id === childId);
    if (!row) {
      if (self) throw new NotFoundException('Belum ada ronde di buku ini');
      throw new ForbiddenException('Detail hanya untuk 25 besar');
    }
    if (!self && row.position > LEADERBOARD_TOP) {
      throw new ForbiddenException('Detail hanya untuk 25 besar');
    }

    const books = [...snap.books.values()]
      .map((b) => ({ b, r: snap.boards.get(`${q.mode}:${b.key}`)?.find((x) => x.id === childId) }))
      .filter((x): x is { b: Book; r: Board[number] } => x.r !== undefined)
      .sort((x, y) => byBook(x.b, y.b))
      .map(({ b, r }) => ({
        key: b.key,
        title: b.title,
        domain: b.domain,
        grade: b.grade,
        average: r.average,
        points: r.points,
        rounds: r.rounds,
        timeMs: r.timeMs,
        bestTimeMs: r.bestTimeMs,
        passedLevels: r.passedLevels,
        totalLevels: snap.levels.get(b.key) ?? 0,
        position: r.position,
        participants: snap.boards.get(`${q.mode}:${b.key}`)!.length,
      }));

    const where = book ? sql`and s.domain = ${book.domain} and s.grade = ${book.grade}` : sql``;
    const res = await this.db.execute(sql`
      with played as (
        select s.domain, s.grade, s.category, count(*) as rounds,
          sum((e.payload->>'score')::numeric) as score_sum,
          sum(coalesce((e.payload->>'durationMs')::numeric, 0)) as time_ms
        from events e
        join skills s on s.id = e.payload->>'skillId'
        where e.type = 'quiz_result' and e.child_id = ${childId} ${where}
        group by s.domain, s.grade, s.category
      ), passed as (
        select s.domain, s.grade, s.category, count(*) filter (where qr.passed) as passed,
          sum(qr.best) as points
        from quiz_results qr
        join skills s on s.id = qr.skill_id
        where qr.child_id = ${childId} ${where}
        group by s.domain, s.grade, s.category
      )
      select p.*, coalesce(x.passed, 0) as passed, coalesce(x.points, 0) as points
      from played p
      left join passed x using (domain, grade, category)`);
    const topics = res.rows
      .map((r) => {
        const domain = String(r.domain);
        const grade = String(r.grade);
        const category = String(r.category);
        const b = snap.books.get(`${domain}/${grade}`);
        const order = b?.categories.findIndex((c) => c.code === category) ?? -1;
        return {
          bookKey: `${domain}/${grade}`,
          book: b?.title ?? `${domain} ${grade}`,
          domain,
          grade,
          category,
          topic: b?.categories[order]?.title ?? category,
          order: order < 0 ? 999 : order,
          average: average2(n(r.score_sum), n(r.rounds)),
          rounds: n(r.rounds),
          timeMs: n(r.time_ms),
          passed: n(r.passed),
          points: n(r.points),
          levels: snap.levels.get(`${domain}/${grade}/${category}`) ?? 0,
        };
      })
      .sort((a, b) => byBook(a, b) || a.order - b.order)
      .map(({ order: _order, ...t }) => t);

    return {
      scope: q.scope,
      mode: q.mode,
      nickname: row.nickname,
      momoColor: row.momoColor,
      isMe: self,
      position: row.position,
      participants: board.length,
      average: row.average,
      points: row.points,
      rounds: row.rounds,
      timeMs: row.timeMs,
      bestTimeMs: row.bestTimeMs,
      passedLevels: row.passedLevels,
      books,
      topics,
    };
  }

  private scope(
    snap: Snapshot,
    key: string,
    mode: Mode,
  ): { board: Board; title: string; book?: Book } {
    if (key === GLOBAL)
      return { board: snap.boards.get(`${mode}:${GLOBAL}`) ?? [], title: 'Global' };
    const book = snap.books.get(key);
    if (!book) throw new NotFoundException('Buku tidak ditemukan');
    return { board: snap.boards.get(`${mode}:${key}`) ?? [], title: book.title, book };
  }

  /** Semua papan dihitung sekali dari agregat Postgres, disimpan sebentar (default 10 detik). */
  private snapshot(): Promise<Snapshot> {
    const ttl = Number(process.env.LEADERBOARD_CACHE_MS ?? 10_000);
    const now = Date.now();
    if (this.cache && now - this.cache.at < ttl) return this.cache.value;
    const value = this.build();
    this.cache = { at: now, value };
    value.catch(() => {
      if (this.cache?.value === value) this.cache = undefined;
    });
    return value;
  }

  private async build(): Promise<Snapshot> {
    const [played, passed, catalogs, levels] = await Promise.all([
      this.db.execute(sql`
        select c.id, c.nickname, c.momo_color, s.domain, s.grade, count(*) as rounds,
          sum((e.payload->>'score')::numeric) as score_sum,
          sum(coalesce((e.payload->>'durationMs')::numeric, 0)) as time_ms
        from events e
        join children c on c.id = e.child_id and c.active
        left join skills s on s.id = e.payload->>'skillId'
        where e.type = 'quiz_result'
        group by c.id, c.nickname, c.momo_color, s.domain, s.grade`),
      this.db.execute(sql`
        select qr.child_id, s.domain, s.grade, count(*) filter (where qr.passed) as passed,
          sum(qr.best) as points, sum(coalesce(qr.best_time_ms, 0)) as best_time_ms
        from quiz_results qr
        join children c on c.id = qr.child_id and c.active
        left join skills s on s.id = qr.skill_id
        group by qr.child_id, s.domain, s.grade`),
      this.db.execute(sql`select domain, grade, title, categories from skill_catalogs`),
      this.db.execute(sql`
        select domain, grade, category, count(*) as n from skills
        where status = 'active' group by domain, grade, category`),
    ]);

    const books = new Map<string, Book>();
    for (const r of catalogs.rows) {
      const key = `${String(r.domain)}/${String(r.grade)}`;
      books.set(key, {
        key,
        domain: String(r.domain),
        grade: String(r.grade),
        title: String(r.title),
        categories: Array.isArray(r.categories)
          ? (r.categories as { code: string; title: string }[])
          : [],
      });
    }
    const levelCount = new Map<string, number>();
    for (const r of levels.rows) {
      const book = `${String(r.domain)}/${String(r.grade)}`;
      levelCount.set(book, (levelCount.get(book) ?? 0) + n(r.n));
      levelCount.set(`${book}/${String(r.category)}`, n(r.n));
    }

    const levelAgg = new Map<string, { passed: number; points: number; bestTimeMs: number }>();
    const addLevel = (key: string, r: Record<string, unknown>) => {
      const cur = levelAgg.get(key) ?? { passed: 0, points: 0, bestTimeMs: 0 };
      cur.passed += n(r.passed);
      cur.points += n(r.points);
      cur.bestTimeMs += n(r.best_time_ms);
      levelAgg.set(key, cur);
    };
    for (const r of passed.rows) {
      const id = String(r.child_id);
      addLevel(`${id}|${GLOBAL}`, r);
      if (r.domain != null) addLevel(`${id}|${String(r.domain)}/${String(r.grade)}`, r);
    }

    const entries = new Map<string, Map<string, Entry>>();
    const add = (scope: string, r: Record<string, unknown>) => {
      const id = String(r.id);
      let m = entries.get(scope);
      if (!m) entries.set(scope, (m = new Map()));
      const cur = m.get(id) ?? {
        id,
        nickname: String(r.nickname),
        momoColor: String(r.momo_color),
        rounds: 0,
        scoreSum: 0,
        timeMs: 0,
        passedLevels: levelAgg.get(`${id}|${scope}`)?.passed ?? 0,
        points: levelAgg.get(`${id}|${scope}`)?.points ?? 0,
        bestTimeMs: levelAgg.get(`${id}|${scope}`)?.bestTimeMs ?? 0,
      };
      cur.rounds += n(r.rounds);
      cur.scoreSum += n(r.score_sum);
      cur.timeMs += n(r.time_ms);
      m.set(id, cur);
    };
    for (const r of played.rows) {
      add(GLOBAL, r);
      if (r.domain != null) add(`${String(r.domain)}/${String(r.grade)}`, r);
    }
    const boards = new Map<string, Board>();
    for (const [scope, m] of entries) {
      const rows = [...m.values()];
      boards.set(`average:${scope}`, rankByAverage(rows));
      // Total skor (D-024): skor total → level lulus → waktu skor terbaik; posisi berurutan.
      boards.set(
        `total:${scope}`,
        rows
          .map((r) => ({ ...r, average: average2(r.scoreSum, r.rounds) }))
          .sort((a, b) =>
            compareLeaders(
              { points: a.points, passed: a.passedLevels, timeMs: a.bestTimeMs },
              { points: b.points, passed: b.passedLevels, timeMs: b.bestTimeMs },
            ),
          )
          .map((r, i) => ({ ...r, position: i + 1 })),
      );
    }
    return { at: new Date(), books, boards, levels: levelCount };
  }
}

function publicRow(r: Board[number], viewer: string | null, withId: boolean) {
  const isMe = viewer !== null && r.id === viewer;
  return {
    position: r.position,
    ...((withId || isMe) && { childId: r.id }),
    isMe,
    nickname: r.nickname,
    momoColor: r.momoColor,
    average: r.average,
    points: r.points,
    rounds: r.rounds,
    timeMs: r.timeMs,
    bestTimeMs: r.bestTimeMs,
    passedLevels: r.passedLevels,
  };
}
