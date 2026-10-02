import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  contestEntryStatus,
  contestInputSchema,
  type ContestInput,
  type SessionUser,
} from '@little-coder/engine';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { children, classes, contestEntries, contests, skills } from '../db/schema.js';
import {
  bookTitles,
  contestInfo,
  findContest,
  iso,
  phaseOf,
  ranking,
  type ContestRow,
  type EntryFlags,
} from './contest.service.js';

const disqualifySchema = z.strictObject({
  disqualified: z.boolean(),
  reason: z.string().trim().max(300).default(''),
});

/** Kolom yang terkunci setelah lomba dimulai / ada peserta (soal sudah dibuat dari pengaturan ini). */
const LOCKED: (keyof ContestInput)[] = [
  'domain',
  'grade',
  'categories',
  'questionCount',
  'startsAt',
  'endsAt',
  'durationMinutes',
];

const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  // Cegah formula injection di spreadsheet.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Admin: kelola lomba live (D-042). */
@Roles('admin')
@Controller('admin/contests')
export class AdminContestController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  async list() {
    const now = new Date();
    const rows = await this.db.select().from(contests).orderBy(desc(contests.startsAt));
    const stats = rows.length
      ? await this.db
          .select({
            contestId: contestEntries.contestId,
            participants: count(),
            submitted: sql<number>`count(*) filter (where ${contestEntries.submittedAt} is not null)`,
            disqualified: sql<number>`count(*) filter (where ${contestEntries.disqualified})`,
          })
          .from(contestEntries)
          .where(
            inArray(
              contestEntries.contestId,
              rows.map((r) => r.id),
            ),
          )
          .groupBy(contestEntries.contestId)
      : [];
    const byId = new Map(stats.map((s) => [s.contestId, s]));
    const books = await bookTitles(this.db, rows);
    return {
      now: iso(now),
      contests: rows.map((c) => {
        const s = byId.get(c.id);
        return {
          ...contestInfo(c, now, books.get(`${c.domain}/${c.grade}`)),
          published: c.published,
          participants: Number(s?.participants ?? 0),
          submitted: Number(s?.submitted ?? 0),
          disqualified: Number(s?.disqualified ?? 0),
        };
      }),
    };
  }

  @Post()
  async create(
    @Body(new ZodPipe(contestInputSchema)) body: ContestInput,
    @CurrentUser() user: SessionUser,
  ) {
    await this.ensureSkills(body);
    const [row] = await this.db
      .insert(contests)
      .values({ ...this.values(body), createdBy: user.id })
      .returning();
    return contestInfo(row!, new Date());
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body(new ZodPipe(contestInputSchema)) body: ContestInput) {
    const now = new Date();
    const c = await findContest(this.db, id);
    const entries = await this.entryCount(c.id);
    if (phaseOf(c, now) !== 'upcoming' || entries > 0) {
      const before: Record<string, unknown> = {
        domain: c.domain,
        grade: c.grade,
        categories: c.categories,
        questionCount: c.questionCount,
        startsAt: c.startsAt.getTime(),
        endsAt: c.endsAt.getTime(),
        durationMinutes: c.durationMinutes,
      };
      const after: Record<string, unknown> = {
        ...body,
        startsAt: Date.parse(body.startsAt),
        endsAt: Date.parse(body.endsAt),
      };
      const changed = LOCKED.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
      if (changed.length)
        throw new ConflictException({
          message:
            'Lomba sudah dimulai: hanya judul, deskripsi, jumlah pemenang, dan status tampil yang bisa diubah',
          fields: changed,
        });
      const [row] = await this.db
        .update(contests)
        .set({
          title: body.title,
          description: body.description,
          winners: body.winners,
          published: body.published,
          updatedAt: now,
        })
        .where(eq(contests.id, c.id))
        .returning();
      return contestInfo(row!, now);
    }
    await this.ensureSkills(body);
    const [row] = await this.db
      .update(contests)
      .set({ ...this.values(body), updatedAt: now })
      .where(eq(contests.id, c.id))
      .returning();
    return contestInfo(row!, now);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const c = await findContest(this.db, id);
    if ((await this.entryCount(c.id)) > 0)
      throw new ConflictException('Lomba sudah punya peserta; sembunyikan saja (tidak tampil)');
    await this.db.delete(contests).where(eq(contests.id, c.id));
    return { deleted: true };
  }

  /** Detail: peserta (progres, kejanggalan), peringkat (sementara selama lomba, final setelah selesai). */
  @Get(':id')
  async detail(@Param('id') id: string) {
    const now = new Date();
    const c = await findContest(this.db, id);
    const rows = await this.db
      .select({
        id: contestEntries.id,
        childId: contestEntries.childId,
        nickname: children.nickname,
        momoColor: children.momoColor,
        active: children.active,
        className: classes.eventName,
        items: contestEntries.items,
        startedAt: contestEntries.startedAt,
        deadlineAt: contestEntries.deadlineAt,
        submittedAt: contestEntries.submittedAt,
        lastAnswerAt: contestEntries.lastAnswerAt,
        answered: contestEntries.answered,
        correct: contestEntries.correct,
        flags: contestEntries.flags,
        disqualified: contestEntries.disqualified,
      })
      .from(contestEntries)
      .innerJoin(children, eq(children.id, contestEntries.childId))
      .leftJoin(classes, eq(classes.id, children.classId))
      .where(eq(contestEntries.contestId, c.id))
      .orderBy(contestEntries.startedAt);
    const ranked = await ranking(this.db, c.id);
    const pos = new Map(ranked.map((r) => [r.id, r]));
    const books = await bookTitles(this.db, [c]);
    return {
      now: iso(now),
      contest: {
        ...contestInfo(c, now, books.get(`${c.domain}/${c.grade}`)),
        published: c.published,
      },
      entries: rows.map(({ items, ...r }) => {
        const rank = pos.get(r.id);
        return {
          ...r,
          total: (items as unknown[]).length,
          startedAt: iso(r.startedAt),
          deadlineAt: iso(r.deadlineAt),
          submittedAt: r.submittedAt ? iso(r.submittedAt) : null,
          lastAnswerAt: r.lastAnswerAt ? iso(r.lastAnswerAt) : null,
          status: contestEntryStatus(r, now),
          flags: r.flags as EntryFlags,
          position: rank?.position ?? null,
          score: rank?.score ?? null,
          timeMs: rank?.timeMs ?? null,
        };
      }),
    };
  }

  @Post(':id/entries/:entryId/disqualify')
  @HttpCode(200)
  async disqualify(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body(new ZodPipe(disqualifySchema)) body: z.infer<typeof disqualifySchema>,
    @CurrentUser() user: SessionUser,
  ) {
    const c = await findContest(this.db, id);
    if (!/^[0-9a-f-]{36}$/i.test(entryId)) throw new NotFoundException('Peserta tidak ditemukan');
    const [e] = await this.db
      .select()
      .from(contestEntries)
      .where(and(eq(contestEntries.id, entryId), eq(contestEntries.contestId, c.id)));
    if (!e) throw new NotFoundException('Peserta tidak ditemukan');
    if (body.disqualified && !body.reason)
      throw new BadRequestException('Tuliskan alasan diskualifikasi');
    const flags = { ...(e.flags as EntryFlags) };
    const at = new Date().toISOString();
    if (body.disqualified) flags.dq = { reason: body.reason, by: user.name, at };
    else {
      flags.undq = [...(flags.undq ?? []), { by: user.name, at }];
      flags.dq = null;
    }
    await this.db
      .update(contestEntries)
      .set({ disqualified: body.disqualified, flags })
      .where(eq(contestEntries.id, e.id));
    return { id: e.id, disqualified: body.disqualified, flags };
  }

  /** Hasil lengkap (CSV) untuk diumumkan / diarsipkan. */
  @Get(':id/results.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async csv(@Param('id') id: string) {
    const c = await findContest(this.db, id);
    const detail = await this.detail(c.id);
    const header = [
      'peringkat',
      'nama_panggilan',
      'warna_momo',
      'kelas',
      'benar',
      'dijawab',
      'jumlah_soal',
      'skor',
      'waktu_detik',
      'mulai',
      'selesai',
      'jawaban_cepat',
      'pindah_halaman',
      'diskualifikasi',
      'alasan',
    ];
    const lines = [...detail.entries]
      .sort((a, b) => (a.position ?? 1e9) - (b.position ?? 1e9))
      .map((e) =>
        [
          e.position ?? '',
          e.nickname,
          e.momoColor,
          e.className ?? '',
          e.correct,
          e.answered,
          e.total,
          e.score ?? '',
          e.timeMs === null ? '' : Math.round(e.timeMs / 1000),
          e.startedAt,
          e.submittedAt ?? '',
          e.flags.fast ?? 0,
          e.flags.hidden ?? 0,
          e.disqualified ? 'ya' : 'tidak',
          e.flags.dq?.reason ?? '',
        ]
          .map(csvCell)
          .join(','),
      );
    return `\ufeff${[header.join(','), ...lines].join('\n')}\n`;
  }

  private values(b: ContestInput) {
    return {
      title: b.title,
      description: b.description,
      domain: b.domain,
      grade: b.grade,
      categories: b.categories,
      questionCount: b.questionCount,
      startsAt: new Date(b.startsAt),
      endsAt: new Date(b.endsAt),
      durationMinutes: b.durationMinutes,
      winners: b.winners,
      published: b.published,
    } satisfies Partial<ContestRow>;
  }

  private async entryCount(contestId: string) {
    const [r] = await this.db
      .select({ n: count() })
      .from(contestEntries)
      .where(eq(contestEntries.contestId, contestId));
    return Number(r?.n ?? 0);
  }

  /** Buku (dan topik) harus punya skill aktif agar soal bisa dibuat. */
  private async ensureSkills(b: ContestInput) {
    const [r] = await this.db
      .select({ n: count() })
      .from(skills)
      .where(
        and(
          eq(skills.status, 'active'),
          eq(skills.domain, b.domain),
          eq(skills.grade, b.grade),
          ...(b.categories.length ? [inArray(skills.category, b.categories)] : []),
        ),
      );
    if (!Number(r?.n ?? 0))
      throw new BadRequestException('Buku/topik ini belum punya level aktif untuk dijadikan soal');
  }
}
