import { Controller, Get, Inject, Query } from '@nestjs/common';
import { PASS_SCORE, type SessionUser } from '@little-coder/engine';
import { sql } from 'drizzle-orm';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { jakartaDate } from '../billing/billing.service.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { cashEntries } from '../db/schema.js';
import {
  bounds,
  inRange,
  monthEnd,
  monthsEnding,
  periodQuerySchema,
  resolvePeriod,
  weekStartOf,
  type PeriodQuery,
} from './period.js';

const TZ = 'Asia/Jakarta';
const num = (v: unknown) => Number(v ?? 0);
/** Satu ronde dihitung paling lama 30 menit: tab yang ditinggal terbuka tidak menggelembungkan "menit belajar". */
const MAX_ROUND_MS = 30 * 60_000;
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : null);
/** Senin minggu ini (WIB) sebagai "YYYY-MM-DD". */
export const jakartaWeekStart = (now: Date) => weekStartOf(jakartaDate(now));
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
  async admin(@Query(new ZodPipe(periodQuerySchema)) q: PeriodQuery) {
    const now = new Date();
    const p = resolvePeriod(q, now);
    const score = sql`(payload->>'score')::int`;
    /** Kolom waktu `col` di dalam periode / periode pembanding (WIB, memakai index ts). */
    const cur = (col: string) => inRange(sql.raw(col), p.from, p.to);
    const prev = (col: string) => inRange(sql.raw(col), p.prevFrom, p.prevTo);
    const end = bounds(p.from, p.to).end;
    const quiz = sql`type = 'quiz_result'`;

    // Pengguna: jumlah per akhir periode (akun yang masih aktif), pendaftar baru di dalam periode.
    const users = await this.one(sql`
      select
        (select count(*) from parents where active and created_at < ${end}::timestamptz) as parents,
        (select count(*) from children where active and created_at < ${end}::timestamptz) as children,
        (select count(*) from children where active and created_at < ${end}::timestamptz
           and self_code is not null and parent_id is null) as self_only,
        (select count(*) from children where active and created_at < ${end}::timestamptz
           and class_id is not null) as in_class,
        (select count(*) from staff_users where active and role = 'admin') as admins,
        (select count(*) from staff_users where active and role = 'facilitator') as facilitators,
        (select count(*) from parents where ${cur('created_at')}) as new_parents,
        (select count(*) from children where ${cur('created_at')}) as new_children,
        (select count(*) from children where active and last_active_at > now() - interval '7 days') as active7,
        (select extract(year from min(created_at at time zone ${TZ}))::int from parents) as first_year`);

    // Penjualan dalam periode: pendapatan = pesanan lunas yang diverifikasi di periode itu;
    // status = pesanan yang DIBUAT di periode itu menurut statusnya sekarang.
    const sales = await this.one(sql`
      select
        coalesce(sum(amount) filter (where status = 'paid'), 0) as revenue_total,
        coalesce(sum(amount) filter (where status = 'paid' and ${cur('reviewed_at')}), 0) as revenue,
        coalesce(sum(amount) filter (where status = 'paid' and ${prev('reviewed_at')}), 0) as revenue_prev,
        count(*) filter (where status = 'paid' and ${cur('reviewed_at')}) as paid,
        count(*) filter (where status = 'paid' and ${prev('reviewed_at')}) as paid_prev,
        count(*) filter (where ${cur('created_at')}) as orders,
        count(*) filter (where ${cur('created_at')} and status = 'awaiting_review') as awaiting_review,
        count(*) filter (where ${cur('created_at')} and status = 'awaiting_payment' and expires_at > now()) as awaiting_payment,
        count(*) filter (where ${cur('created_at')} and status = 'rejected') as rejected,
        count(*) filter (where ${cur('created_at')} and (status = 'expired'
          or (status = 'awaiting_payment' and expires_at <= now()))) as expired,
        count(*) filter (where ${cur('created_at')} and status = 'cancelled') as cancelled,
        count(*) filter (where ${cur('created_at')} and status = 'paid') as created_paid,
        count(distinct parent_id) filter (where status = 'paid' and ${cur('reviewed_at')}
          and parent_id in (select id from parents where active)) as paying_families,
        coalesce(sum(discount) filter (where status = 'paid' and ${cur('reviewed_at')}), 0) as discount_given,
        coalesce(sum(unique_code) filter (where status = 'paid' and ${cur('reviewed_at')}), 0) as unique_code,
        count(*) filter (where status = 'awaiting_review') as queue_review,
        count(*) filter (where status = 'awaiting_payment' and expires_at > now()) as queue_payment
      from orders`);

    const topPackages = await this.rows(sql`
      select package_snapshot->>'name' as name, count(*) as sold, sum(amount) as revenue
      from orders where status = 'paid' and ${cur('reviewed_at')}
      group by 1 order by revenue desc limit 5`);

    const recentOrders = await this.rows(sql`
      select o.id, o.number, o.amount, o.status, o.created_at, o.package_snapshot->>'name' as package,
             p.name as parent_name
      from orders o join parents p on p.id = o.parent_id
      where ${cur('o.created_at')}
      order by o.created_at desc limit 6`);

    // Layanan verifikasi: lama bukti transfer menunggu sampai diputuskan admin (jam).
    const review = await this.one(sql`
      select count(*) as reviewed,
        percentile_cont(0.5) within group (order by extract(epoch from reviewed_at - proof_at) / 3600) as median_h,
        percentile_cont(0.9) within group (order by extract(epoch from reviewed_at - proof_at) / 3600) as p90_h,
        (select extract(epoch from now() - min(proof_at)) / 3600 from orders
          where status = 'awaiting_review' and proof_at is not null) as oldest_pending_h
      from orders
      where status in ('paid', 'rejected') and proof_at is not null and reviewed_at >= proof_at
        and ${cur('reviewed_at')}`);

    const learning = await this.one(sql`
      select
        count(*) as rounds,
        count(*) filter (where ${score} >= ${PASS_SCORE}) as passed,
        coalesce(round(avg(${score})), 0) as avg_score,
        coalesce(sum(least((payload->>'durationMs')::bigint, ${MAX_ROUND_MS})), 0) as duration_ms,
        count(distinct child_id) as learners
      from events where ${quiz} and ${cur('ts')}`);
    const learningPrev = await this.one(sql`
      select count(*) as rounds, count(distinct child_id) as learners
      from events where ${quiz} and ${prev('ts')}`);

    // Retensi: anak yang bermain di periode pembanding dan kembali bermain di periode ini.
    const retention = await this.one(sql`
      with c as (select distinct child_id from events where ${quiz} and ${cur('ts')}),
           pv as (select distinct child_id from events where ${quiz} and ${prev('ts')})
      select (select count(*) from pv) as prev,
             (select count(*) from pv join c using (child_id)) as returned,
             (select count(*) from c where child_id not in (select child_id from pv)) as fresh`);

    const topBooks = await this.rows(sql`
      select c.title, s.domain, s.grade, count(*) as rounds,
             round(100.0 * count(*) filter (where (e.payload->>'score')::int >= ${PASS_SCORE}) / greatest(count(*), 1)) as pass_rate
      from events e
      join skills s on s.id = e.payload->>'skillId'
      join skill_catalogs c on c.domain = s.domain and c.grade = s.grade
      where e.type = 'quiz_result' and ${cur('e.ts')}
      group by 1, 2, 3 order by rounds desc limit 6`);

    const domains = await this.rows(sql`
      select s.domain, count(*) as rounds, count(distinct e.child_id) as learners,
             count(*) filter (where (e.payload->>'score')::int >= ${PASS_SCORE}) as passed
      from events e join skills s on s.id = e.payload->>'skillId'
      where e.type = 'quiz_result' and ${cur('e.ts')}
      group by 1 order by rounds desc`);

    // Sebaran skor per 10 poin (90–100 satu kelompok).
    const scoreBands = await this.rows(sql`
      select least(greatest(${score}, 0) / 10, 9) as band, count(*) as n
      from events where ${quiz} and ${cur('ts')}
      group by 1`);

    // Kapan anak belajar: hari (1 = Senin) × jam, waktu Jakarta.
    const heat = await this.rows(sql`
      select extract(isodow from ts at time zone ${TZ})::int as dow,
             extract(hour from ts at time zone ${TZ})::int as hour, count(*) as n
      from events where ${quiz} and ${cur('ts')}
      group by 1, 2`);

    // Corong keluarga yang DAFTAR di periode ini: verifikasi → punya anak → anak pernah belajar → membeli.
    const funnel = await this.one(sql`
      with p as (select id, email_verified_at from parents where active and ${cur('created_at')})
      select
        (select count(*) from p) as registered,
        (select count(*) from p where email_verified_at is not null) as verified,
        (select count(distinct k.parent_id) from children k join p on p.id = k.parent_id
          where k.active) as with_child,
        (select count(distinct k.parent_id) from children k join p on p.id = k.parent_id
          where k.active and exists (select 1 from events e where e.child_id = k.id and e.type = 'quiz_result')) as active,
        (select count(distinct o.parent_id) from orders o join p on p.id = o.parent_id
          where o.status = 'paid') as paying`);

    // Seri waktu: per hari (≤ 92 hari) atau per bulan. Satu agregasi per tabel lalu digabung.
    const unit = p.bucket === 'day' ? 'day' : 'month';
    const key = (col: string) =>
      sql.raw(
        p.bucket === 'day'
          ? `to_char((${col} at time zone '${TZ}')::date, 'YYYY-MM-DD')`
          : `to_char(${col} at time zone '${TZ}', 'YYYY-MM')`,
      );
    const series = await this.rows(sql`
      with d as (
        select to_char(g, ${p.bucket === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM'}) as k from generate_series(
          date_trunc(${unit}, ${p.from}::date), ${p.to}::date, ${p.bucket === 'day' ? sql`interval '1 day'` : sql`interval '1 month'`}) as g
      ),
      rev as (
        select ${key('reviewed_at')} as k, sum(amount) as revenue, count(*) as paid
        from orders where status = 'paid' and ${cur('reviewed_at')} group by 1),
      ord as (select ${key('created_at')} as k, count(*) as orders from orders where ${cur('created_at')} group by 1),
      ev as (
        select ${key('ts')} as k, count(*) as rounds,
               count(*) filter (where ${score} >= ${PASS_SCORE}) as passed,
               count(distinct child_id) as learners
        from events where ${quiz} and ${cur('ts')} group by 1),
      np as (select ${key('created_at')} as k, count(*) as n from parents where ${cur('created_at')} group by 1),
      nc as (select ${key('created_at')} as k, count(*) as n from children where ${cur('created_at')} group by 1)
      select d.k as date,
        coalesce(rev.revenue, 0) as revenue, coalesce(rev.paid, 0) as paid,
        coalesce(ord.orders, 0) as orders,
        coalesce(ev.rounds, 0) as rounds, coalesce(ev.passed, 0) as passed,
        coalesce(ev.learners, 0) as learners,
        coalesce(np.n, 0) as new_parents, coalesce(nc.n, 0) as new_children
      from d
      left join rev using (k) left join ord using (k) left join ev using (k)
      left join np using (k) left join nc using (k)
      order by d.k`);

    // Tren 12 bulan yang berakhir di bulan akhir periode.
    const monthList = monthsEnding(p.to);
    const mFrom = `${monthList[0]}-01`;
    const mRange = (col: string) => inRange(sql.raw(col), mFrom, monthEnd(p.to));
    const months = await this.rows(sql`
      with m as (
        select to_char(g, 'YYYY-MM') as month
        from generate_series(${mFrom}::date, ${`${monthList[11]}-01`}::date, interval '1 month') as g
      ),
      rev as (
        select to_char(reviewed_at at time zone ${TZ}, 'YYYY-MM') as month, sum(amount) as revenue, count(*) as paid
        from orders where status = 'paid' and ${mRange('reviewed_at')} group by 1),
      np as (
        select to_char(created_at at time zone ${TZ}, 'YYYY-MM') as month, count(*) as n
        from parents where ${mRange('created_at')} group by 1),
      ev as (
        select to_char(ts at time zone ${TZ}, 'YYYY-MM') as month, count(*) as rounds,
               count(distinct child_id) as learners
        from events where ${quiz} and ${mRange('ts')} group by 1),
      cash as (
        select substr(date, 1, 7) as month,
               sum(amount) filter (where type = 'in') as income,
               sum(amount) filter (where type = 'out') as expense
        from cash_entries where date >= ${mFrom} group by 1)
      select m.month, coalesce(rev.revenue, 0) as revenue, coalesce(rev.paid, 0) as paid,
        coalesce(np.n, 0) as new_parents, coalesce(ev.rounds, 0) as rounds,
        coalesce(ev.learners, 0) as learners,
        coalesce(cash.income, 0) as income, coalesce(cash.expense, 0) as expense
      from m
      left join rev using (month) left join np using (month)
      left join ev using (month) left join cash using (month)
      order by m.month`);

    // Kohort mingguan: anak dikelompokkan menurut minggu ronde pertamanya (Senin, WIB), lalu dihitung
    // berapa yang masih bermain di minggu ke-0, 1, 2, … sesudahnya. 8 kohort yang berakhir di akhir periode.
    const lastWeek = weekStartOf(p.to);
    const cohortRows = await this.rows(sql`
      with r as (
        select child_id, date_trunc('week', ts at time zone ${TZ})::date as wk
        from events where ${quiz} and child_id is not null and ts < ${end}::timestamptz group by 1, 2),
      f as (select child_id, min(wk) as cohort from r group by 1)
      select to_char(f.cohort, 'YYYY-MM-DD') as cohort, (r.wk - f.cohort) / 7 as week, count(*) as n
      from r join f using (child_id)
      where f.cohort between ${lastWeek}::date - 49 and ${lastWeek}::date
      group by 1, 2 order by 1, 2`);
    const cohortWeeks = [...new Set(cohortRows.map((c) => String(c.cohort)))].sort();
    const weeksBetween = (a: string, b: string) =>
      Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / (7 * 86_400_000));
    const cohorts = cohortWeeks.map((week) => {
      const elapsed = Math.max(0, weeksBetween(week, lastWeek));
      const at = (w: number) =>
        num(cohortRows.find((c) => String(c.cohort) === week && num(c.week) === w)?.n);
      return { week, size: at(0), active: Array.from({ length: elapsed + 1 }, (_, w) => at(w)) };
    });

    const classes = await this.one(sql`
      select count(*) filter (where closed_at is null) as open, count(*) as total,
             (select count(*) from children where class_id is not null and active) as students
      from classes`);

    // Buku kas: rentang periode + tahun dari akhir periode.
    const year = p.to.slice(0, 4);
    const cash = await this.db
      .select({ date: cashEntries.date, type: cashEntries.type, amount: cashEntries.amount })
      .from(cashEntries)
      .where(
        sql`${cashEntries.date} like ${`${year}-%`} or (${cashEntries.date} >= ${p.from} and ${cashEntries.date} <= ${p.to})`,
      );
    const sumCash = (keep: (d: string) => boolean) => {
      const r = cash
        .filter((e) => keep(e.date))
        .reduce(
          (a, e) =>
            e.type === 'in'
              ? { ...a, income: a.income + e.amount }
              : { ...a, expense: a.expense + e.amount },
          { income: 0, expense: 0 },
        );
      return { ...r, net: r.income - r.expense };
    };

    const paid = num(sales.paid);
    const createdPaid = num(sales.created_paid);
    const decided = createdPaid + num(sales.rejected) + num(sales.expired) + num(sales.cancelled);
    const parentsN = num(users.parents);
    const rounds = num(learning.rounds);
    return {
      period: p,
      firstYear: users.first_year === null ? null : num(users.first_year),
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
        /** Saat ini (bukan periode): anak yang aktif 7 hari terakhir. */
        active7: num(users.active7),
      },
      sales: {
        revenueTotal: num(sales.revenue_total),
        revenue: num(sales.revenue),
        revenuePrev: num(sales.revenue_prev),
        paid,
        paidPrev: num(sales.paid_prev),
        orders: num(sales.orders),
        awaitingReview: num(sales.awaiting_review),
        awaitingPayment: num(sales.awaiting_payment),
        rejected: num(sales.rejected),
        expired: num(sales.expired),
        cancelled: num(sales.cancelled),
        createdPaid,
        avgOrder: paid ? Math.round(num(sales.revenue) / paid) : 0,
        /** Pesanan periode ini yang sudah selesai (lunas/ditolak/kedaluwarsa/batal) yang berakhir lunas, %. */
        successRate: pct(createdPaid, decided),
        payingFamilies: num(sales.paying_families),
        /** Keluarga yang membeli di periode ini dibanding semua keluarga aktif, %. */
        payingRate: pct(num(sales.paying_families), parentsN),
        discountGiven: num(sales.discount_given),
        /** Kode unik transfer ikut di pendapatan (uang yang benar-benar masuk); ditampilkan terpisah. */
        uniqueCode: num(sales.unique_code),
        /** Antrean saat ini (bukan periode). */
        queue: { review: num(sales.queue_review), payment: num(sales.queue_payment) },
        review: {
          reviewed: num(review.reviewed),
          medianHours: review.median_h === null ? null : Math.round(num(review.median_h) * 10) / 10,
          p90Hours: review.p90_h === null ? null : Math.round(num(review.p90_h) * 10) / 10,
          oldestPendingHours:
            review.oldest_pending_h === null ? null : Math.round(num(review.oldest_pending_h)),
        },
        topPackages: topPackages.map((x) => ({
          name: String(x.name),
          sold: num(x.sold),
          revenue: num(x.revenue),
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
        period: sumCash((d) => d >= p.from && d <= p.to),
        year: { year: Number(year), ...sumCash((d) => d.startsWith(`${year}-`)) },
      },
      learning: {
        rounds,
        roundsPrev: num(learningPrev.rounds),
        passRate: pct(num(learning.passed), rounds),
        avgScore: num(learning.avg_score),
        minutes: Math.round(num(learning.duration_ms) / 60_000),
        learners: num(learning.learners),
        learnersPrev: num(learningPrev.learners),
        topBooks: topBooks.map((b) => ({
          title: String(b.title),
          domain: String(b.domain),
          grade: String(b.grade),
          rounds: num(b.rounds),
          passRate: num(b.pass_rate),
        })),
        /** Anak yang bermain di periode pembanding dan kembali di periode ini. */
        retention: {
          prev: num(retention.prev),
          returned: num(retention.returned),
          fresh: num(retention.fresh),
          rate: pct(num(retention.returned), num(retention.prev)),
        },
        domains: domains.map((x) => ({
          domain: String(x.domain),
          rounds: num(x.rounds),
          learners: num(x.learners),
          passRate: pct(num(x.passed), num(x.rounds)) ?? 0,
        })),
        scoreBands: Array.from({ length: 10 }, (_, band) =>
          num(scoreBands.find((b) => num(b.band) === band)?.n),
        ),
        /** `active[w]` = anak kohort yang bermain di minggu ke-w sejak minggu pertamanya. */
        cohorts,
        /** 7 baris (Senin..Minggu) × 24 kolom jam. */
        heatmap: Array.from({ length: 7 }, (_, d) =>
          Array.from({ length: 24 }, (_, h) =>
            num(heat.find((x) => num(x.dow) === d + 1 && num(x.hour) === h)?.n),
          ),
        ),
      },
      funnel: {
        registered: num(funnel.registered),
        verified: num(funnel.verified),
        withChild: num(funnel.with_child),
        active: num(funnel.active),
        paying: num(funnel.paying),
      },
      classes: {
        open: num(classes.open),
        total: num(classes.total),
        students: num(classes.students),
      },
      series: series.map((s) => ({
        date: String(s.date),
        revenue: num(s.revenue),
        paid: num(s.paid),
        orders: num(s.orders),
        rounds: num(s.rounds),
        passed: num(s.passed),
        learners: num(s.learners),
        newParents: num(s.new_parents),
        newChildren: num(s.new_children),
        newUsers: num(s.new_parents) + num(s.new_children),
      })),
      months: months.map((m) => ({
        month: String(m.month),
        revenue: num(m.revenue),
        paid: num(m.paid),
        newParents: num(m.new_parents),
        rounds: num(m.rounds),
        learners: num(m.learners),
        income: num(m.income),
        expense: num(m.expense),
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
        (select count(*) filter (where (e.payload->>'score')::int >= ${PASS_SCORE}) from events e join children k on k.id = e.child_id
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
