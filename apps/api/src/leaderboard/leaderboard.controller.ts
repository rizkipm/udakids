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
  BOARD_PERIODS,
  rankByActivity,
  average2,
  compareLeaders,
  rankByAverage,
  rating2,
  mockConfigOf,
  mockMaxPoints,
  rankMockBoard,
  skillTemplateSchema,
  type SessionUser,
  parseMomoLook,
  type MomoLook,
} from '@little-coder/engine';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { CurrentUser, Public } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';

const GLOBAL = 'global';
/** Jumlah peringkat di landing page. */
const PUBLIC_TOP = 10;
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
const publicQuery = z.object({
  board: z.enum(['total', 'average', 'active']).default('total'),
  period: z.enum(BOARD_PERIODS).default('all'),
});
type PeriodRow = {
  id: string;
  nickname: string;
  momoColor: string;
  momoLook: MomoLook | null;
  rounds: number;
  scoreSum: number;
  timeMs: number;
  questions: number;
  /** Event terakhir di periode ini (epoch ms). */
  lastPlayedAt: number | null;
};
type PeriodBoards = {
  at: Date;
  average: (PeriodRow & { position: number; average: number; rating: number })[];
  active: (PeriodRow & { position: number })[];
};
const uuid = z.uuid();

type Agg = {
  rounds: number;
  /** Total soal yang dijawab (jumlah `total` tiap ronde). */
  questions: number;
  scoreSum: number;
  timeMs: number;
  passedLevels: number;
  /** Total skor = jumlah skor terbaik tiap level (D-024). */
  points: number;
  /** Jumlah waktu skor terbaik tiap level (D-024). */
  bestTimeMs: number;
  /** Ronde terakhir (epoch ms); null = belum pernah bermain. */
  lastPlayedAt: number | null;
};
type Entry = Agg & { id: string; nickname: string; momoColor: string; momoLook: MomoLook | null };
type Board = (Entry & { average: number; rating: number; position: number })[];
type Book = {
  key: string;
  domain: string;
  grade: string;
  title: string;
  categories: { code: string; title: string; group?: string }[];
};
type Snapshot = {
  at: Date;
  books: Map<string, Book>;
  /** Kunci `<mode>:<scope>`. */
  boards: Map<string, Board>;
  /** Jumlah level aktif per `domain/grade` dan per `domain/grade/kategori`. */
  levels: Map<string, number>;
  /** Papan per Mock Test olimpiade (D-072), kunci = id skill mock. */
  mocks: Map<string, MockBoard>;
};
type MockEntry = {
  id: string;
  nickname: string;
  momoColor: string;
  momoLook: MomoLook | null;
  points: number;
  score: number;
  correct: number;
  total: number;
  timeMs: number;
  attempts: number;
  /** Percobaan terakhir di mock ini (epoch ms). */
  lastPlayedAt: number | null;
  position: number;
};
type MockBoard = {
  skillId: string;
  domain: string;
  grade: string;
  book: string;
  title: string;
  maxPoints: number;
  questions: number;
  /** Urutan mock di materinya (Mock test 1, 2, 3). */
  order: number;
  /** Singkatan lomba dari judul bagian mock (D-074, D-076), mis. "KMSI", "EMC", "ESC", "EEC". */
  competition: string;
  /** KKM lomba dalam poin, bila ada (KMSI). */
  passPoints: number | null;
  rows: MockEntry[];
};

/**
 * Singkatan lomba dari judul bagian mock: "KMSI · Kompetensi …" / "EMC · Eduversal …" (D-076) → "KMSI" / "EMC";
 * judul lama "Mock Test KMSI · …" (D-074) → "KMSI"; "Mock Test · …" (D-072) → "Olimpiade".
 * Babak final provinsi sebagai lomba sendiri (D-080): "KMSI · … — Final Provinsi Jatim 2026" → "KMSI Final",
 * supaya mock test 1–3-nya tidak bercampur dengan mock penyisihan. ("Penyisihan Final Provinsi" EMC tetap EMC.)
 */
export const competitionOf = (group: string | undefined) => {
  const abbr = /^(?:Mock Test )?([^\s·]{2,12}) ·/.exec(group ?? '')?.[1];
  if (!abbr) return 'Olimpiade';
  return /— Final Provinsi\b/.test(group ?? '') ? `${abbr} Final` : abbr;
};
const mockQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
const skillId = z.string().regex(/^[a-z]+(\.[a-z0-9-]+)+$/);

const n = (v: unknown) => Number(v ?? 0);
const gradeRank = (g: string) => GRADES.indexOf(g as (typeof GRADES)[number]);
const domainRank = (d: string) => DOMAINS.indexOf(d as (typeof DOMAINS)[number]);
const byBook = (a: { domain: string; grade: string }, b: { domain: string; grade: string }) =>
  domainRank(a.domain) - domainRank(b.domain) || gradeRank(a.grade) - gradeRank(b.grade);

/**
 * Peringkat rata-rata tertimbang (D-042, D-045): global + per buku (domain/jenjang). Rata-rata = rata-rata skor semua
 * ronde `quiz_result` anak di lingkup itu (2 desimal); sama → total waktu tercepat. Papan global memuat semua anak
 * aktif (yang belum bermain di urutan terbawah); papan per buku hanya anak yang memainkan buku itu. 25 teratas tampil
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

  /** Daftar Mock Test olimpiade yang punya papan peringkat (kategori "Mock test" + mata pelajaran). */
  @Get('mocks')
  async mocks() {
    const snap = await this.snapshot();
    return {
      updatedAt: snap.at.toISOString(),
      mocks: [...snap.mocks.values()]
        .sort((a, b) => byBook(a, b))
        .map((m) => ({
          skillId: m.skillId,
          domain: m.domain,
          grade: m.grade,
          book: m.book,
          title: m.title,
          participants: m.rows.length,
        })),
    };
  }

  /**
   * Papan satu Mock Test (D-072): percobaan terbaik tiap anak, poin tertinggi → waktu tercepat. Anak lain hanya
   * terlihat nama panggilan + warna Momo (tanpa id).
   */
  @Get('mock/:skillId')
  async mockBoard(
    @CurrentUser() user: SessionUser,
    @Param('skillId', new ZodPipe(skillId)) id: string,
    @Query(new ZodPipe(mockQuery)) q: z.infer<typeof mockQuery>,
  ) {
    const snap = await this.snapshot();
    const m = snap.mocks.get(id);
    if (!m) throw new NotFoundException('Mock test tidak ditemukan');
    const viewer = user.role === 'child' ? user.id : null;
    const row = (r: MockEntry) => {
      const { id: rowId, lastPlayedAt, ...rest } = r;
      return {
        ...rest,
        lastPlayedAt: lastPlayedAt === null ? null : new Date(lastPlayedAt).toISOString(),
        isMe: viewer !== null && rowId === viewer,
      };
    };
    const start = LEADERBOARD_TOP + (q.page - 1) * q.pageSize;
    const mine = viewer ? m.rows.find((r) => r.id === viewer) : undefined;
    return {
      skillId: m.skillId,
      book: m.book,
      title: m.title,
      maxPoints: m.maxPoints,
      questions: m.questions,
      updatedAt: snap.at.toISOString(),
      total: m.rows.length,
      top: m.rows.slice(0, LEADERBOARD_TOP).map(row),
      rest: {
        page: q.page,
        pageSize: q.pageSize,
        total: Math.max(0, m.rows.length - LEADERBOARD_TOP),
        items: m.rows.slice(start, start + q.pageSize).map(row),
      },
      me: mine ? row(mine) : null,
    };
  }

  /**
   * Top 10 global untuk landing page (D-045), tanpa login: urut total skor → level lulus → waktu.
   * Hanya nama panggilan + warna Momo (tanpa id anak), dari snapshot yang sama (cache 10 detik).
   */
  /**
   * 10 besar untuk landing page (D-045, diperluas D-073), tanpa login — hanya nama panggilan + warna Momo:
   * - `board=total` (semua waktu): total skor → level lulus → waktu;
   * - `board=average` (semua / bulan / minggu / hari ini, WIB): nilai peringkat tertimbang (D-045);
   * - `board=active` (hari / minggu / bulan): soal dijawab terbanyak → waktu bermain lebih lama.
   */
  /**
   * Daftar Mock Test olimpiade untuk landing (D-074), tanpa login: lomba (KMSI / Olimpiade), jenjang, mata
   * pelajaran, dan jumlah peserta. Tidak ada data anak.
   */
  @Public()
  @Get('public/mocks')
  async publicMocks() {
    const snap = await this.snapshot();
    return {
      updatedAt: snap.at.toISOString(),
      mocks: [...snap.mocks.values()]
        .sort((a, b) => byBook(a, b) || a.order - b.order)
        .map((m) => ({
          skillId: m.skillId,
          domain: m.domain,
          grade: m.grade,
          book: m.book,
          title: m.title,
          order: m.order,
          competition: m.competition,
          questions: m.questions,
          maxPoints: m.maxPoints,
          passPoints: m.passPoints,
          participants: m.rows.length,
        })),
    };
  }

  /**
   * 10 besar satu Mock Test untuk landing (D-074), tanpa login: percobaan terbaik, poin tertinggi → waktu tercepat.
   * Hanya nama panggilan + tampilan Momo (tanpa id anak), jumlah benar, waktu, dan lolos KKM.
   */
  @Public()
  @Get('public/mock/:skillId')
  async publicMock(@Param('skillId', new ZodPipe(skillId)) id: string) {
    const snap = await this.snapshot();
    const m = snap.mocks.get(id);
    if (!m) throw new NotFoundException('Mock test tidak ditemukan');
    return {
      skillId: m.skillId,
      book: m.book,
      title: m.title,
      competition: m.competition,
      questions: m.questions,
      maxPoints: m.maxPoints,
      passPoints: m.passPoints,
      updatedAt: snap.at.toISOString(),
      participants: m.rows.length,
      passed: m.passPoints === null ? null : m.rows.filter((r) => r.points >= m.passPoints!).length,
      top: m.rows.slice(0, PUBLIC_TOP).map((r) => ({
        position: r.position,
        nickname: r.nickname,
        momoColor: r.momoColor,
        momoLook: r.momoLook,
        points: r.points,
        correct: r.correct,
        total: r.total,
        timeMs: r.timeMs,
        passed: m.passPoints === null ? null : r.points >= m.passPoints,
      })),
    };
  }

  @Public()
  @Get('public')
  async publicTop(@Query(new ZodPipe(publicQuery)) q: z.infer<typeof publicQuery>) {
    const snap = await this.snapshot();
    if (q.board === 'total' || (q.board === 'average' && q.period === 'all')) {
      const board = snap.boards.get(`${q.board}:${GLOBAL}`) ?? [];
      const ranked = q.board === 'average' ? board.filter((r) => r.rounds > 0) : board;
      return {
        updatedAt: snap.at.toISOString(),
        board: q.board,
        period: 'all',
        participants: board.length,
        played: playedCount(board),
        ranked: ranked.length,
        top: ranked.slice(0, PUBLIC_TOP).map((r) => ({
          position: r.position,
          nickname: r.nickname,
          momoColor: r.momoColor,
          momoLook: r.momoLook,
          points: r.points,
          questions: r.questions,
          passedLevels: r.passedLevels,
          rounds: r.rounds,
          timeMs: q.board === 'total' ? r.bestTimeMs : r.timeMs,
          average: r.average,
          rating: r.rating,
          lastPlayedAt: isoOrNull(r.lastPlayedAt),
        })),
      };
    }
    const period = q.period === 'all' ? 'month' : q.period;
    const p = await this.periodBoards(period);
    const ranked = q.board === 'average' ? p.average : p.active;
    return {
      updatedAt: p.at.toISOString(),
      board: q.board,
      period,
      participants: snap.boards.get(`total:${GLOBAL}`)?.length ?? 0,
      played: p.active.length,
      ranked: ranked.length,
      top: ranked.slice(0, PUBLIC_TOP).map((r) => ({
        position: r.position,
        nickname: r.nickname,
        momoColor: r.momoColor,
        momoLook: r.momoLook,
        points: 0,
        questions: r.questions,
        passedLevels: 0,
        rounds: r.rounds,
        timeMs: r.timeMs,
        average: average2(r.scoreSum, r.rounds),
        rating: rating2(r.scoreSum, r.rounds),
        lastPlayedAt: isoOrNull(r.lastPlayedAt),
      })),
    };
  }

  private periodCache = new Map<string, { at: number; value: Promise<PeriodBoards> }>();

  /** Papan per periode (WIB), dihitung dari event dan disimpan sebentar seperti snapshot utama. */
  private periodBoards(period: 'month' | 'week' | 'day'): Promise<PeriodBoards> {
    const ttl = Number(process.env.LEADERBOARD_CACHE_MS ?? 10_000);
    const hit = this.periodCache.get(period);
    if (hit && Date.now() - hit.at < ttl) return hit.value;
    const value = (async (): Promise<PeriodBoards> => {
      const unit = period === 'day' ? 'day' : period === 'week' ? 'week' : 'month';
      const res = await this.db.execute(sql`
        with q as (
          select e.child_id,
            count(*) filter (where e.type = 'quiz_result') as rounds,
            coalesce(sum((e.payload->>'score')::numeric) filter (where e.type = 'quiz_result'), 0) as score_sum,
            coalesce(sum(coalesce((e.payload->>'durationMs')::numeric, 0)) filter (where e.type = 'quiz_result'), 0) as time_ms,
            count(*) filter (where e.type = 'item_answer') as answers,
            coalesce(sum((e.payload->>'total')::int) filter (where e.type = 'quiz_result' and e.payload ? 'points'), 0) as mock_questions,
            max(e.ts) as last_ts
          from events e
          where e.type in ('quiz_result', 'item_answer')
            and e.ts >= (date_trunc(${unit}, now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta')
          group by e.child_id
        )
        select q.*, c.nickname, c.momo_color, c.momo_look
        from q join children c on c.id = q.child_id and c.active`);
      const rows = res.rows.map((r) => ({
        id: String(r.child_id),
        nickname: String(r.nickname),
        momoColor: String(r.momo_color),
        momoLook: parseMomoLook(r.momo_look),
        rounds: n(r.rounds),
        scoreSum: n(r.score_sum),
        timeMs: n(r.time_ms),
        // Soal mock test tidak tercatat per soal, jadi diambil dari jumlah soal ronde mock.
        questions: n(r.answers) + n(r.mock_questions),
        lastPlayedAt: r.last_ts ? new Date(r.last_ts as string).getTime() : null,
      }));
      return { at: new Date(), average: rankByAverage(rows), active: rankByActivity(rows) };
    })();
    this.periodCache.set(period, { at: Date.now(), value });
    value.catch(() => this.periodCache.delete(period));
    return value;
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
      played: playedCount(board),
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
        rating: r.rating,
        points: r.points,
        rounds: r.rounds,
        questions: r.questions,
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
      ), answered as (
        select s.domain, s.grade, s.category, sum(sm.answered) as questions
        from skill_mastery sm
        join skills s on s.id = sm.skill_id
        where sm.child_id = ${childId} ${where}
        group by s.domain, s.grade, s.category
      ), passed as (
        select s.domain, s.grade, s.category, count(*) filter (where qr.passed) as passed,
          sum(qr.best) as points
        from quiz_results qr
        join skills s on s.id = qr.skill_id
        where qr.child_id = ${childId} ${where}
        group by s.domain, s.grade, s.category
      )
      select p.*, coalesce(x.passed, 0) as passed, coalesce(x.points, 0) as points,
        coalesce(a.questions, 0) as questions
      from played p
      left join passed x using (domain, grade, category)
      left join answered a using (domain, grade, category)`);
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
          questions: n(r.questions),
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
      momoLook: row.momoLook,
      isMe: self,
      position: row.position,
      participants: board.length,
      average: row.average,
      rating: row.rating,
      points: row.points,
      rounds: row.rounds,
      questions: row.questions,
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
    const [
      played,
      passed,
      catalogs,
      levels,
      answered,
      kids,
      mockSkills,
      mockBest,
      mockAnswered,
      lastSeen,
    ] = await Promise.all([
      this.db.execute(sql`
        select c.id, c.nickname, c.momo_color, c.momo_look, s.domain, s.grade, count(*) as rounds,
          sum((e.payload->>'score')::numeric) as score_sum,
          sum(coalesce((e.payload->>'durationMs')::numeric, 0)) as time_ms,
          max(e.ts) as last_ts
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
      // Total soal dijawab (D-045) — sumber yang sama dengan laporan anak.
      this.db.execute(sql`
        select sm.child_id, s.domain, s.grade, sum(sm.answered) as answered
        from skill_mastery sm
        join children c on c.id = sm.child_id and c.active
        left join skills s on s.id = sm.skill_id
        group by sm.child_id, s.domain, s.grade`),
      // Semua anak aktif: yang belum pernah bermain tetap tampil di papan global (paling bawah).
      this.db.execute(sql`select id, nickname, momo_color, momo_look from children where active`),
      // Mock Test olimpiade (D-072): skill mock aktif, percobaan terbaik tiap anak, dan soal yang dijawab.
      this.db.execute(sql`
        select id, domain, grade, template from skills
        where status = 'active' and template->>'family' = 'mock'`),
      this.db.execute(sql`
        select distinct on (e.child_id, s.id)
          e.child_id, s.id as skill_id, c.nickname, c.momo_color, c.momo_look,
          (e.payload->>'points')::int as points, (e.payload->>'score')::int as score,
          (e.payload->>'correct')::int as correct, (e.payload->>'total')::int as total,
          coalesce((e.payload->>'durationMs')::bigint, 0) as time_ms,
          count(*) over (partition by e.child_id, s.id) as attempts,
          max(e.ts) over (partition by e.child_id, s.id) as last_ts
        from events e
        join children c on c.id = e.child_id and c.active
        join skills s on s.id = e.payload->>'skillId' and s.template->>'family' = 'mock'
        where e.type = 'quiz_result' and e.payload ? 'points'
        order by e.child_id, s.id, (e.payload->>'points')::int desc,
          coalesce((e.payload->>'durationMs')::bigint, 0) asc, e.ts asc`),
      this.db.execute(sql`
        select e.child_id, s.domain, s.grade, sum((e.payload->>'total')::int) as answered
        from events e
        join children c on c.id = e.child_id and c.active
        join skills s on s.id = e.payload->>'skillId' and s.template->>'family' = 'mock'
        where e.type = 'quiz_result'
        group by e.child_id, s.domain, s.grade`),
      // Terakhir bermain (D-105, D-116) = soal terakhir dijawab ATAU ronde terakhir selesai, sama dengan papan periode.
      this.db.execute(sql`
        select e.child_id, s.domain, s.grade, max(e.ts) as last_ts
        from events e
        left join skills s on s.id = e.payload->>'skillId'
        where e.type in ('quiz_result', 'item_answer')
        group by e.child_id, s.domain, s.grade`),
    ]);
    const lastAgg = new Map<string, number>();
    for (const r of lastSeen.rows) {
      if (!r.last_ts) continue;
      const id = String(r.child_id);
      const ms = new Date(r.last_ts as string).getTime();
      const put = (key: string) => lastAgg.set(key, Math.max(lastAgg.get(key) ?? 0, ms));
      put(`${id}|${GLOBAL}`);
      if (r.domain != null) put(`${id}|${String(r.domain)}/${String(r.grade)}`);
    }
    const answeredAgg = new Map<string, number>();
    // Soal mock test tidak tercatat per soal (tanpa Skor Jago), jadi jumlahnya diambil dari hasil ronde.
    for (const r of [...answered.rows, ...mockAnswered.rows]) {
      const id = String(r.child_id);
      const add = (key: string) =>
        answeredAgg.set(key, (answeredAgg.get(key) ?? 0) + n(r.answered));
      add(`${id}|${GLOBAL}`);
      if (r.domain != null) add(`${id}|${String(r.domain)}/${String(r.grade)}`);
    }

    const books = new Map<string, Book>();
    for (const r of catalogs.rows) {
      const key = `${String(r.domain)}/${String(r.grade)}`;
      books.set(key, {
        key,
        domain: String(r.domain),
        grade: String(r.grade),
        title: String(r.title),
        categories: Array.isArray(r.categories)
          ? (r.categories as { code: string; title: string; group?: string }[])
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
        momoLook: parseMomoLook(r.momo_look),
        rounds: 0,
        questions: answeredAgg.get(`${id}|${scope}`) ?? 0,
        scoreSum: 0,
        timeMs: 0,
        passedLevels: levelAgg.get(`${id}|${scope}`)?.passed ?? 0,
        points: levelAgg.get(`${id}|${scope}`)?.points ?? 0,
        bestTimeMs: levelAgg.get(`${id}|${scope}`)?.bestTimeMs ?? 0,
        lastPlayedAt: lastAgg.get(`${id}|${scope}`) ?? null,
      };
      const last = r.last_ts ? new Date(r.last_ts as string).getTime() : null;
      if (last !== null && (cur.lastPlayedAt === null || last > cur.lastPlayedAt))
        cur.lastPlayedAt = last;
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
          .map((r) => ({
            ...r,
            average: average2(r.scoreSum, r.rounds),
            rating: rating2(r.scoreSum, r.rounds),
          }))
          .sort((a, b) =>
            compareLeaders(
              { points: a.points, passed: a.passedLevels, timeMs: a.bestTimeMs },
              { points: b.points, passed: b.passedLevels, timeMs: b.bestTimeMs },
            ),
          )
          .map((r, i) => ({ ...r, position: i + 1 })),
      );
    }
    // Papan global memuat SEMUA anak aktif: yang belum punya ronde di bawah (urut nama), posisi berlanjut.
    for (const mode of ['average', 'total'] as const) {
      const key = `${mode}:${GLOBAL}`;
      const board = boards.get(key) ?? [];
      const seen = new Set(board.map((r) => r.id));
      const idle = kids.rows
        .filter((kid) => !seen.has(String(kid.id)))
        .map((kid) => {
          const id = String(kid.id);
          const lv = levelAgg.get(`${id}|${GLOBAL}`);
          return {
            id,
            nickname: String(kid.nickname),
            momoColor: String(kid.momo_color),
            momoLook: parseMomoLook(kid.momo_look),
            rounds: 0,
            questions: answeredAgg.get(`${id}|${GLOBAL}`) ?? 0,
            scoreSum: 0,
            timeMs: 0,
            passedLevels: lv?.passed ?? 0,
            points: lv?.points ?? 0,
            bestTimeMs: lv?.bestTimeMs ?? 0,
            lastPlayedAt: lastAgg.get(`${id}|${GLOBAL}`) ?? null,
            average: 0,
            rating: 0,
          };
        })
        .sort((a, b) => a.nickname.localeCompare(b.nickname, 'id'))
        .map((r, i) => ({ ...r, position: board.length + i + 1 }));
      boards.set(key, [...board, ...idle]);
    }
    const mocks = new Map<string, MockBoard>();
    for (const r of mockSkills.rows) {
      const parsed = skillTemplateSchema.safeParse(r.template);
      if (!parsed.success) continue;
      const c = mockConfigOf(parsed.data);
      const book = books.get(`${String(r.domain)}/${String(r.grade)}`);
      const rows = mockBest.rows
        .filter((x) => String(x.skill_id) === String(r.id))
        .map((x) => ({
          id: String(x.child_id),
          nickname: String(x.nickname),
          momoColor: String(x.momo_color),
          momoLook: parseMomoLook(x.momo_look),
          points: n(x.points),
          score: n(x.score),
          correct: n(x.correct),
          total: n(x.total),
          timeMs: n(x.time_ms),
          attempts: n(x.attempts),
          lastPlayedAt: x.last_ts ? new Date(x.last_ts as string).getTime() : null,
        }));
      const competition = competitionOf(
        book?.categories.find((x) => x.code === parsed.data.category)?.group,
      );
      mocks.set(String(r.id), {
        skillId: String(r.id),
        domain: String(r.domain),
        grade: String(r.grade),
        book: book?.title ?? `${String(r.domain)} ${String(r.grade)}`,
        // "Mock test 1" (label level); bukunya tersedia di `book`.
        title: parsed.data.title.split(' — ')[2] ?? parsed.data.title,
        maxPoints: mockMaxPoints(c),
        questions: c.questions,
        order: parsed.data.order,
        competition,
        passPoints: c.passPoints ?? null,
        // KMSI Final (D-080): nilai → waktu pengumpulan → abjad nama, tanpa posisi kembar.
        rows: rankMockBoard(rows, { byName: competition === 'KMSI Final' }),
      });
    }
    return { at: new Date(), books, boards, levels: levelCount, mocks };
  }
}

/** Anak yang sudah punya minimal satu ronde (papan global juga memuat anak yang belum bermain). */
const playedCount = (board: Board) => board.filter((r) => r.rounds > 0).length;

function publicRow(r: Board[number], viewer: string | null, withId: boolean) {
  const isMe = viewer !== null && r.id === viewer;
  return {
    position: r.position,
    ...((withId || isMe) && { childId: r.id }),
    isMe,
    nickname: r.nickname,
    momoColor: r.momoColor,
    momoLook: r.momoLook,
    average: r.average,
    rating: r.rating,
    points: r.points,
    rounds: r.rounds,
    questions: r.questions,
    timeMs: r.timeMs,
    bestTimeMs: r.bestTimeMs,
    passedLevels: r.passedLevels,
    /** Kapan terakhir bermain (D-105; juga di landing publik sejak D-116). */
    lastPlayedAt: isoOrNull(r.lastPlayedAt),
  };
}

const isoOrNull = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());
