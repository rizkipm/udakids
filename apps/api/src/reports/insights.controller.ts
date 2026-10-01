import { Controller, Get, Inject, Query } from '@nestjs/common';
import { monthSummary, type SessionUser } from '@little-coder/engine';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { jakartaDate } from '../billing/billing.service.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { cashEntries } from '../db/schema.js';

const TZ = 'Asia/Jakarta';
const daysSchema = z.coerce.number().int().min(7).max(90).default(30);
const num = (v: unknown) => Number(v ?? 0);
type Row = Record<string, unknown>;

/**
 * Laporan bermakna untuk admin & guru (D-039). Semua angka agregat dari PostgreSQL — tanpa data
 * pribadi anak selain nama panggilan (untuk guru, hanya siswa di kelasnya sendiri).
 */
@Controller()
export class InsightsController {
  constructor(@Inject(DB) private readonly db: Db) {}

  private async rows(q: ReturnType<typeof sql>): Promise<Row[]> {
    const res = await this.db.execute(q);
    return res.rows as Row[];
  }
  private async one(q: ReturnType<typeof sql>): Promise<Row> {
    return (await this.rows(q))[0] ?? {};
  }

  @Roles('admin')
  @Get('admin/insights')
  async admin(@Query('days', new ZodPipe(daysSchema)) days: number) {
    const now = new Date();
    const month = jakartaDate(now).slice(0, 7);
    const prevMonth = jakartaDate(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)),
    ).slice(0, 7);

    const users = await this.one(sql`
      select
        (select count(*) from parents where active) as parents,
        (select count(*) from children where active) as children,
        (select count(*) from children where active and self_code is not null and parent_id is null) as self_only,
        (select count(*) from children where active and class_id is not null) as in_class,
        (select count(*) from staff_users where active and role = 'admin') as admins,
        (select count(*) from staff_users where active and role = 'facilitator') as facilitators,
        (select count(*) from parents where created_at > now() - make_interval(days => ${days})) as new_parents,
        (select count(*) from children where created_at > now() - make_interval(days => ${days})) as new_children,
        (select count(*) from children where last_active_at > now() - interval '7 days') as active7,
        (select count(*) from children where last_active_at > now() - make_interval(days => ${days})) as active_n`);

    const sales = await this.one(sql`
      select
        coalesce(sum(amount) filter (where status = 'paid'), 0) as revenue_total,
        coalesce(sum(amount) filter (where status = 'paid'
          and to_char(reviewed_at at time zone ${TZ}, 'YYYY-MM') = ${month}), 0) as revenue_month,
        coalesce(sum(amount) filter (where status = 'paid'
          and to_char(reviewed_at at time zone ${TZ}, 'YYYY-MM') = ${prevMonth}), 0) as revenue_prev,
        count(*) filter (where status = 'paid') as paid,
        count(*) filter (where status = 'paid'
          and to_char(reviewed_at at time zone ${TZ}, 'YYYY-MM') = ${month}) as paid_month,
        count(*) filter (where status = 'awaiting_review') as awaiting_review,
        count(*) filter (where status = 'awaiting_payment' and expires_at > now()) as awaiting_payment,
        count(*) filter (where status = 'rejected') as rejected,
        count(*) filter (where status = 'expired' or (status = 'awaiting_payment' and expires_at <= now())) as expired,
        count(*) filter (where status = 'cancelled') as cancelled,
        count(*) as orders,
        count(distinct parent_id) filter (where status = 'paid') as paying_families,
        coalesce(sum(discount) filter (where status = 'paid'), 0) as discount_given
      from orders`);

    const topPackages = await this.rows(sql`
      select package_snapshot->>'name' as name, count(*) as sold, sum(amount) as revenue
      from orders where status = 'paid'
      group by 1 order by revenue desc limit 5`);

    const recentOrders = await this.rows(sql`
      select o.id, o.number, o.amount, o.status, o.created_at, o.package_snapshot->>'name' as package,
             p.name as parent_name
      from orders o join parents p on p.id = o.parent_id
      order by o.created_at desc limit 6`);

    const learning = await this.one(sql`
      select
        count(*) filter (where ts > now() - interval '7 days') as rounds7,
        count(*) filter (where ts > now() - make_interval(days => ${days})) as rounds_n,
        count(*) filter (where ts > now() - make_interval(days => ${days}) and (payload->>'score')::int >= 70) as passed_n,
        coalesce(round(avg((payload->>'score')::int) filter (where ts > now() - make_interval(days => ${days}))), 0) as avg_score,
        coalesce(sum((payload->>'durationMs')::bigint) filter (where ts > now() - make_interval(days => ${days})), 0) as duration_ms,
        count(distinct child_id) filter (where ts > now() - make_interval(days => ${days})) as learners
      from events where type = 'quiz_result'`);

    const topBooks = await this.rows(sql`
      select c.title, s.domain, s.grade, count(*) as rounds,
             round(100.0 * count(*) filter (where (e.payload->>'score')::int >= 70) / greatest(count(*), 1)) as pass_rate
      from events e
      join skills s on s.id = e.payload->>'skillId'
      join skill_catalogs c on c.domain = s.domain and c.grade = s.grade
      where e.type = 'quiz_result' and e.ts > now() - make_interval(days => ${days})
      group by 1, 2, 3 order by rounds desc limit 6`);

    const series = await this.rows(sql`
      with d as (
        select generate_series(
          (now() at time zone ${TZ})::date - (${days} - 1),
          (now() at time zone ${TZ})::date, interval '1 day')::date as day
      )
      select to_char(d.day, 'YYYY-MM-DD') as date,
        (select coalesce(sum(amount), 0) from orders
          where status = 'paid' and (reviewed_at at time zone ${TZ})::date = d.day) as revenue,
        (select count(*) from orders where (created_at at time zone ${TZ})::date = d.day) as orders,
        (select count(*) from events
          where type = 'quiz_result' and (ts at time zone ${TZ})::date = d.day) as rounds,
        (select count(*) from parents where (created_at at time zone ${TZ})::date = d.day)
          + (select count(*) from children where (created_at at time zone ${TZ})::date = d.day) as new_users
      from d order by d.day`);

    const classes = await this.one(sql`
      select count(*) filter (where closed_at is null) as open, count(*) as total,
             (select count(*) from children where class_id is not null and active) as students
      from classes`);

    const cash = await this.db
      .select({ date: cashEntries.date, type: cashEntries.type, amount: cashEntries.amount })
      .from(cashEntries)
      .where(sql`${cashEntries.date} like ${`${month.slice(0, 4)}-%`}`);
    const financeMonth = monthSummary(cash as never, month);
    const financeYear = cash.reduce(
      (a, e) =>
        e.type === 'in'
          ? { ...a, income: a.income + e.amount }
          : { ...a, expense: a.expense + e.amount },
      { income: 0, expense: 0 },
    );

    const paid = num(sales.paid);
    const decided = paid + num(sales.rejected) + num(sales.expired) + num(sales.cancelled);
    const parentsN = num(users.parents);
    return {
      days,
      month,
      updatedAt: now.toISOString(),
      users: {
        parents: parentsN,
        children: num(users.children),
        selfOnly: num(users.self_only),
        inClass: num(users.in_class),
        admins: num(users.admins),
        facilitators: num(users.facilitators),
        newParents: num(users.new_parents),
        newChildren: num(users.new_children),
        active7: num(users.active7),
        activeN: num(users.active_n),
      },
      sales: {
        revenueTotal: num(sales.revenue_total),
        revenueMonth: num(sales.revenue_month),
        revenuePrevMonth: num(sales.revenue_prev),
        paid,
        paidMonth: num(sales.paid_month),
        orders: num(sales.orders),
        awaitingReview: num(sales.awaiting_review),
        awaitingPayment: num(sales.awaiting_payment),
        rejected: num(sales.rejected),
        expired: num(sales.expired),
        cancelled: num(sales.cancelled),
        avgOrder: paid ? Math.round(num(sales.revenue_total) / paid) : 0,
        /** Pesanan yang sudah selesai (lunas/ditolak/kedaluwarsa/batal) yang berakhir lunas, %. */
        successRate: decided ? Math.round((paid / decided) * 100) : null,
        payingFamilies: num(sales.paying_families),
        /** Keluarga yang pernah membeli dibanding semua keluarga, %. */
        payingRate: parentsN ? Math.round((num(sales.paying_families) / parentsN) * 100) : null,
        discountGiven: num(sales.discount_given),
        topPackages: topPackages.map((p) => ({
          name: String(p.name),
          sold: num(p.sold),
          revenue: num(p.revenue),
        })),
      },
      recentOrders: recentOrders.map((o) => ({
        id: String(o.id),
        number: String(o.number),
        amount: num(o.amount),
        status: String(o.status),
        createdAt: new Date(o.created_at as string).toISOString(),
        package: String(o.package ?? ''),
        parentName: String(o.parent_name ?? ''),
      })),
      finance: {
        month: financeMonth,
        year: { ...financeYear, net: financeYear.income - financeYear.expense },
      },
      learning: {
        rounds7: num(learning.rounds7),
        rounds: num(learning.rounds_n),
        passRate: num(learning.rounds_n)
          ? Math.round((num(learning.passed_n) / num(learning.rounds_n)) * 100)
          : null,
        avgScore: num(learning.avg_score),
        minutes: Math.round(num(learning.duration_ms) / 60_000),
        learners: num(learning.learners),
        topBooks: topBooks.map((b) => ({
          title: String(b.title),
          domain: String(b.domain),
          grade: String(b.grade),
          rounds: num(b.rounds),
          passRate: num(b.pass_rate),
        })),
      },
      classes: {
        open: num(classes.open),
        total: num(classes.total),
        students: num(classes.students),
      },
      series: series.map((s) => ({
        date: String(s.date),
        revenue: num(s.revenue),
        orders: num(s.orders),
        rounds: num(s.rounds),
        newUsers: num(s.new_users),
      })),
    };
  }

  /**
   * Ringkasan guru: hanya kelas miliknya (admin melihat semua kelas). Siswa yang perlu dibantu =
   * level belum lulus setelah ≥ 3 percobaan.
   */
  @Roles('facilitator', 'admin')
  @Get('facilitator/insights')
  async facilitator(@CurrentUser() user: SessionUser) {
    const mine = user.role === 'admin' ? sql`true` : sql`c.facilitator_id = ${user.id}`;
    const classes = await this.rows(sql`
      select c.id, c.code, c.event_name, c.frozen, c.closed_at,
        (select count(*) from children k where k.class_id = c.id and k.active) as students,
        (select count(*) from children k where k.class_id = c.id and k.active
           and k.last_active_at > now() - interval '7 days') as active7,
        (select count(*) from events e join children k on k.id = e.child_id
           where k.class_id = c.id and e.type = 'quiz_result' and e.ts > now() - interval '7 days') as rounds7,
        (select round(avg((e.payload->>'score')::int)) from events e join children k on k.id = e.child_id
           where k.class_id = c.id and e.type = 'quiz_result' and e.ts > now() - interval '7 days') as avg7,
        (select count(*) filter (where (e.payload->>'score')::int >= 70) from events e join children k on k.id = e.child_id
           where k.class_id = c.id and e.type = 'quiz_result' and e.ts > now() - interval '7 days') as passed7
      from classes c where ${mine}
      order by c.closed_at nulls first, c.created_at desc`);

    const series = await this.rows(sql`
      with d as (
        select generate_series((now() at time zone ${TZ})::date - 13, (now() at time zone ${TZ})::date,
          interval '1 day')::date as day
      )
      select to_char(d.day, 'YYYY-MM-DD') as date,
        (select count(*) from events e join children k on k.id = e.child_id join classes c on c.id = k.class_id
          where ${mine} and e.type = 'quiz_result' and (e.ts at time zone ${TZ})::date = d.day) as rounds
      from d order by d.day`);

    const needsHelp = await this.rows(sql`
      select k.id as child_id, k.nickname, k.momo_color, c.event_name, s.title, q.best, q.attempts
      from quiz_results q
      join children k on k.id = q.child_id and k.active
      join classes c on c.id = k.class_id
      join skills s on s.id = q.skill_id
      where ${mine} and c.closed_at is null and not q.passed and q.attempts >= 3
      order by q.attempts desc, q.best asc limit 8`);

    const recent = await this.rows(sql`
      select k.nickname, k.momo_color, c.event_name, s.title, (e.payload->>'score')::int as score, e.ts
      from events e
      join children k on k.id = e.child_id
      join classes c on c.id = k.class_id
      left join skills s on s.id = e.payload->>'skillId'
      where ${mine} and e.type = 'quiz_result'
      order by e.ts desc limit 8`);

    const list = classes.map((c) => {
      const rounds7 = num(c.rounds7);
      return {
        id: String(c.id),
        code: String(c.code),
        eventName: String(c.event_name),
        frozen: Boolean(c.frozen),
        closed: c.closed_at !== null,
        students: num(c.students),
        active7: num(c.active7),
        rounds7,
        avgScore7: c.avg7 === null ? null : num(c.avg7),
        passRate7: rounds7 ? Math.round((num(c.passed7) / rounds7) * 100) : null,
      };
    });
    const open = list.filter((c) => !c.closed);
    const rounds7 = open.reduce((a, c) => a + c.rounds7, 0);
    const passed7 = classes
      .filter((c) => c.closed_at === null)
      .reduce((a, c) => a + num(c.passed7), 0);
    const levelTitle = (t: unknown) => String(t ?? '').replace(/^.*?—\s*Level\s+\d+\s*—\s*/, '');
    return {
      totals: {
        classes: open.length,
        students: open.reduce((a, c) => a + c.students, 0),
        active7: open.reduce((a, c) => a + c.active7, 0),
        rounds7,
        passRate7: rounds7 ? Math.round((passed7 / rounds7) * 100) : null,
      },
      classes: list,
      series: series.map((s) => ({ date: String(s.date), rounds: num(s.rounds) })),
      needsHelp: needsHelp.map((h) => ({
        childId: String(h.child_id),
        nickname: String(h.nickname),
        momoColor: String(h.momo_color),
        className: String(h.event_name),
        level: levelTitle(h.title),
        best: num(h.best),
        attempts: num(h.attempts),
      })),
      recent: recent.map((r) => ({
        nickname: String(r.nickname),
        momoColor: String(r.momo_color),
        className: String(r.event_name),
        level: levelTitle(r.title),
        score: num(r.score),
        ts: new Date(r.ts as string).toISOString(),
      })),
    };
  }
}
