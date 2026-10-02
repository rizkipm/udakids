import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import {
  buildContestItems,
  checkContestAnswer,
  contestAnswerSchema,
  contestEntryStatus,
  contestPublicItem,
  CONTEST_FAST_MS,
  CONTEST_GRACE_MS,
  entryDeadline,
  skillTemplateSchema,
  type ContestAnswer,
  type ContestItem,
  type SessionUser,
} from '@little-coder/engine';
import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { RateLimiter } from '../common/rate-limit.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { contestAnswers, contestEntries, contests, skills } from '../db/schema.js';
import {
  bookTitles,
  contestInfo,
  entryState,
  findContest,
  iso,
  phaseOf,
  publicRow,
  ranking,
  type ContestRow,
  type EntryRow,
} from './contest.service.js';

/** Lomba yang tampil di daftar: akan dimulai ≤ 30 hari lagi, sedang berjalan, atau selesai ≤ 30 hari lalu. */
const LIST_WINDOW_MS = 30 * 24 * 3600_000;

const eventSchema = z.strictObject({ type: z.enum(['hidden', 'visible']) });

/**
 * Lomba live untuk peserta (D-042). Anti-curang:
 * - jam server (setiap respons membawa `now` agar hitung mundur di perangkat memakai selisih jam server);
 * - soal dibuat di server dengan seed acak per peserta, perangkat hanya menerima soal tanpa kunci & id
 *   pilihan disamarkan; satu entri per anak (unique + insert … on conflict do nothing);
 * - satu jawaban per soal (PK entry+index), tanpa umpan balik benar/salah selama lomba, batas laju;
 * - hanya peran `child` yang bisa ikut; kejanggalan (jawaban terlalu cepat, pindah halaman) dicatat.
 */
@Controller('contests')
export class ContestController {
  /** ≤ 3 jawaban per detik per anak. */
  private readonly answerLimit = new RateLimiter(3, 1_000);
  private readonly startLimit = new RateLimiter(5, 10_000);
  private readonly eventLimit = new RateLimiter(10, 10_000);

  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  async list(@CurrentUser() user: SessionUser) {
    const now = new Date();
    const rows = await this.db
      .select()
      .from(contests)
      .where(
        and(
          eq(contests.published, true),
          gte(contests.endsAt, new Date(now.getTime() - LIST_WINDOW_MS)),
          lte(contests.startsAt, new Date(now.getTime() + LIST_WINDOW_MS)),
        ),
      )
      .orderBy(asc(contests.startsAt));
    const mine = new Map<string, EntryRow>();
    if (user.role === 'child' && rows.length) {
      const entries = await this.db
        .select()
        .from(contestEntries)
        .where(
          and(
            eq(contestEntries.childId, user.id),
            inArray(
              contestEntries.contestId,
              rows.map((r) => r.id),
            ),
          ),
        );
      for (const e of entries) mine.set(e.contestId, e);
    }
    const books = await bookTitles(this.db, rows);
    return {
      now: iso(now),
      contests: rows.map((c) => ({
        ...contestInfo(c, now, books.get(`${c.domain}/${c.grade}`)),
        me: entryState(mine.get(c.id), now),
      })),
    };
  }

  @Get(':id')
  async detail(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    const now = new Date();
    const c = await findContest(this.db, id, { published: true });
    const e = user.role === 'child' ? await this.entry(c.id, user.id) : undefined;
    const books = await bookTitles(this.db, [c]);
    return {
      now: iso(now),
      contest: contestInfo(c, now, books.get(`${c.domain}/${c.grade}`)),
      me: entryState(e, now),
    };
  }

  /** Mulai (atau lanjutkan) lomba. Soal dibuat SEKALI per anak dan tidak pernah dibuat ulang. */
  @Roles('child')
  @Post(':id/start')
  @HttpCode(200)
  async start(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    this.startLimit.check(user.id);
    this.startLimit.fail(user.id);
    const now = new Date();
    const c = await findContest(this.db, id, { published: true });
    let e = await this.entry(c.id, user.id);
    if (!e) {
      const phase = phaseOf(c, now);
      if (phase === 'upcoming')
        throw new ForbiddenException({
          message: 'Lomba belum dimulai',
          startsAt: iso(c.startsAt),
          now: iso(now),
        });
      if (phase === 'ended') throw new ForbiddenException('Lomba sudah selesai');
      const items = await this.generate(c);
      await this.db
        .insert(contestEntries)
        .values({
          contestId: c.id,
          childId: user.id,
          items,
          startedAt: now,
          deadlineAt: entryDeadline(now, c.durationMinutes, iso(c.endsAt)),
        })
        .onConflictDoNothing();
      // Bila dua permintaan bersamaan, yang pertama menang; keduanya membaca entri yang sama.
      e = (await this.entry(c.id, user.id))!;
    }
    return this.session(c, e, new Date());
  }

  @Roles('child')
  @Post(':id/answer')
  @HttpCode(200)
  async answer(
    @Param('id') id: string,
    @Body(new ZodPipe(contestAnswerSchema)) body: ContestAnswer,
    @CurrentUser() user: SessionUser,
  ) {
    this.answerLimit.check(user.id);
    this.answerLimit.fail(user.id);
    const now = new Date();
    const c = await findContest(this.db, id, { published: true });
    const e = await this.entry(c.id, user.id);
    if (!e) throw new ConflictException('Lomba belum dimulai');
    if (e.submittedAt) throw new ConflictException('Jawaban sudah dikirim');
    if (now.getTime() > e.deadlineAt.getTime() + CONTEST_GRACE_MS)
      throw new ForbiddenException('Waktu lomba sudah habis');
    const items = e.items as ContestItem[];
    const item = items[body.index];
    if (!item) throw new BadRequestException('Nomor soal tidak ada');
    const correct = checkContestAnswer(item, body.value);

    const answered = await this.db.transaction(async (tx) => {
      const saved = await tx
        .insert(contestAnswers)
        .values({ entryId: e.id, index: body.index, value: body.value, correct, answeredAt: now })
        .onConflictDoNothing()
        .returning({ index: contestAnswers.index });
      if (saved.length === 0) throw new ConflictException('Soal ini sudah dijawab');
      const nowSql = sql`${iso(now)}::timestamptz`;
      const [row] = await tx
        .update(contestEntries)
        .set({
          correct: sql`${contestEntries.correct} + ${correct ? 1 : 0}`,
          answered: sql`${contestEntries.answered} + 1`,
          lastAnswerAt: sql`greatest(${contestEntries.lastAnswerAt}, ${nowSql})`,
          flags: sql`case when ${nowSql} - coalesce(${contestEntries.lastAnswerAt}, ${contestEntries.startedAt}) < ${`${CONTEST_FAST_MS} milliseconds`}::interval
            then jsonb_set(${contestEntries.flags}, '{fast}', to_jsonb(coalesce((${contestEntries.flags}->>'fast')::int, 0) + 1))
            else ${contestEntries.flags} end`,
        })
        .where(eq(contestEntries.id, e.id))
        .returning({ answered: contestEntries.answered });
      return row!.answered;
    });
    // Sengaja TIDAK memberi tahu benar/salah (agar jawaban tidak bisa ditebak-tebak).
    return { saved: true, answered, total: items.length };
  }

  @Roles('child')
  @Post(':id/submit')
  @HttpCode(200)
  async submit(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    const now = new Date();
    const c = await findContest(this.db, id, { published: true });
    const e = await this.entry(c.id, user.id);
    if (!e) throw new ConflictException('Lomba belum dimulai');
    if (!e.submittedAt) {
      await this.db
        .update(contestEntries)
        .set({ submittedAt: sql`least(${iso(now)}::timestamptz, ${contestEntries.deadlineAt})` })
        .where(and(eq(contestEntries.id, e.id), sql`${contestEntries.submittedAt} is null`));
    }
    const fresh = (await this.entry(c.id, user.id))!;
    return { now: iso(now), resultsAt: iso(c.endsAt), me: entryState(fresh, now) };
  }

  /** Catat pindah tab/aplikasi selama lomba (informasi untuk ditinjau admin). */
  @Roles('child')
  @Post(':id/event')
  @HttpCode(200)
  async event(
    @Param('id') id: string,
    @Body(new ZodPipe(eventSchema)) body: z.infer<typeof eventSchema>,
    @CurrentUser() user: SessionUser,
  ) {
    this.eventLimit.check(user.id);
    this.eventLimit.fail(user.id);
    const now = new Date();
    const c = await findContest(this.db, id, { published: true });
    const e = await this.entry(c.id, user.id);
    if (body.type === 'hidden' && e && contestEntryStatus(e, now) === 'active') {
      await this.db
        .update(contestEntries)
        .set({
          flags: sql`jsonb_set(${contestEntries.flags}, '{hidden}', to_jsonb(coalesce((${contestEntries.flags}->>'hidden')::int, 0) + 1))`,
        })
        .where(eq(contestEntries.id, e.id));
    }
    return { ok: true };
  }

  /** Papan pemenang — otomatis tersedia begitu waktu lomba berakhir (dihitung saat dibaca). */
  @Get(':id/results')
  async results(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    const now = new Date();
    const c = await findContest(this.db, id, { published: true });
    if (phaseOf(c, now) !== 'ended')
      throw new ForbiddenException({
        message: 'Hasil diumumkan setelah lomba selesai',
        resultsAt: iso(c.endsAt),
        now: iso(now),
      });
    const rows = await ranking(this.db, c.id);
    const meId = user.role === 'child' ? user.id : undefined;
    const me = meId ? rows.find((r) => r.childId === meId) : undefined;
    const books = await bookTitles(this.db, [c]);
    return {
      now: iso(now),
      contest: contestInfo(c, now, books.get(`${c.domain}/${c.grade}`)),
      participants: rows.length,
      winners: rows.slice(0, c.winners).map((r) => publicRow(r, meId)),
      me: me ? publicRow(me, meId) : null,
    };
  }

  private async entry(contestId: string, childId: string): Promise<EntryRow | undefined> {
    const [e] = await this.db
      .select()
      .from(contestEntries)
      .where(and(eq(contestEntries.contestId, contestId), eq(contestEntries.childId, childId)));
    return e;
  }

  /** Soal peserta: skill aktif di buku lomba (dan topik terpilih), seed acak kriptografis per peserta. */
  private async generate(c: ContestRow): Promise<ContestItem[]> {
    const categories = c.categories as string[];
    const rows = await this.db
      .select({ template: skills.template })
      .from(skills)
      .where(
        and(
          eq(skills.status, 'active'),
          eq(skills.domain, c.domain),
          eq(skills.grade, c.grade),
          ...(categories.length ? [inArray(skills.category, categories)] : []),
        ),
      );
    const templates = rows.flatMap((r) => {
      const t = skillTemplateSchema.safeParse(r.template);
      return t.success ? [t.data] : [];
    });
    if (templates.length === 0) throw new ConflictException('Soal lomba belum tersedia');
    return buildContestItems(templates, c.questionCount, randomBytes(16).toString('hex'));
  }

  private async session(c: ContestRow, e: EntryRow, now: Date) {
    const answers = await this.db
      .select({ index: contestAnswers.index })
      .from(contestAnswers)
      .where(eq(contestAnswers.entryId, e.id));
    const items = e.items as ContestItem[];
    return {
      entryId: e.id,
      now: iso(now),
      startedAt: iso(e.startedAt),
      deadlineAt: iso(e.deadlineAt),
      resultsAt: iso(c.endsAt),
      total: items.length,
      answered: answers.map((a) => a.index).sort((a, b) => a - b),
      me: entryState(e, now),
      // Soal tanpa kunci jawaban, pembahasan, label pengecoh, skill/seed; id pilihan disamarkan.
      items: items.map(contestPublicItem),
    };
  }
}
