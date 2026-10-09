import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PASS_SCORE, formatRupiah } from '@little-coder/engine';
import type { SkillStat } from '../api/types';
import { useFetch } from '../auth/useApi';
import type { AdminNotification } from './notifications/NotificationBell';
import { BannerSlider } from '../components/BannerSlider';
import { t, type MessageKey } from '../i18n';
import { ShellIconSvg, type ShellIcon } from '../ui/AppShell';
import { CountUp, Kpi, Meter, Ring } from '../ui/charts';
import { Badge, Card, Empty, PageHeader, Table, formatDate, type Column } from '../ui/ui';
import { Loadable, percent, skillPath } from './common';
import type { AdminInsights } from './insightsTypes';
import { AffiliateSection, CommissionSection } from './OverviewAffiliate';
import {
  Panel,
  Row,
  SectionTitle,
  Stats,
  domainLabel,
  hours,
  longDay,
  monthName,
  rupiahAxis,
  rupiahShort,
  shortDay,
} from './overviewParts';
import {
  deltaPct,
  formatPeriodParam,
  parsePeriod,
  periodQuery,
  periodTitle,
  rangeLabel,
  type PeriodSel,
} from './period';
import {
  ChartTable,
  CohortTable,
  ColumnChart,
  Donut,
  Funnel,
  Heatmap,
  LineChart,
  MetricTabs,
  SERIES,
  STATUS_COLOR,
  compact,
} from './insightCharts';

export const MIN_ANSWERS_FOR_DIFFICULTY = 5;

/** Skill dengan akurasi terendah (minimal 5 jawaban). */
export function hardestSkills(stats: SkillStat[], limit = 8): SkillStat[] {
  return stats
    .filter((s) => s.answered >= MIN_ANSWERS_FOR_DIFFICULTY && s.accuracy !== null)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0) || b.answered - a.answered)
    .slice(0, limit);
}

export type DistractorTotal = { tag: string; count: number; skills: SkillStat[] };

/** Label miskonsepsi yang paling sering dipilih anak, dijumlah dari semua skill. */
export function popularDistractors(stats: SkillStat[], limit = 8): DistractorTotal[] {
  const map = new Map<string, DistractorTotal>();
  for (const s of stats) {
    for (const d of s.topDistractors) {
      const cur = map.get(d.tag) ?? { tag: d.tag, count: 0, skills: [] };
      cur.count += d.count;
      cur.skills.push(s);
      map.set(d.tag, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export type Note = {
  tone: 'grape' | 'leaf' | 'sun' | 'sky' | 'coral';
  icon: ShellIcon;
  text: string;
  to?: string;
};

/** Nama hari (1 = Senin) dari Intl; 1 Jan 2024 adalah Senin. */
export const weekday = (d: number, style: 'short' | 'long' = 'short') =>
  new Date(Date.UTC(2024, 0, d)).toLocaleDateString('id-ID', { weekday: style, timeZone: 'UTC' });

export type FunnelStep = { key: string; label: string; value: number };

export function funnelSteps(d: AdminInsights): FunnelStep[] {
  const f = d.funnel;
  return [
    { key: 'registered', label: t('admin.ins.fnRegistered'), value: f.registered },
    { key: 'verified', label: t('admin.ins.fnVerified'), value: f.verified },
    { key: 'withChild', label: t('admin.ins.fnWithChild'), value: f.withChild },
    { key: 'active', label: t('admin.ins.fnActive'), value: f.active },
    { key: 'paying', label: t('admin.ins.fnPaying'), value: f.paying },
  ];
}

/** Langkah corong dengan persentase lanjut terendah (minimal 5 keluarga di langkah sebelumnya). */
export function biggestLeak(steps: FunnelStep[]) {
  let worst: { from: FunnelStep; to: FunnelStep; pct: number } | null = null;
  for (let i = 1; i < steps.length; i++) {
    const from = steps[i - 1]!;
    const to = steps[i]!;
    if (from.value < 5) continue;
    const pct = Math.round((to.value / from.value) * 100);
    if (!worst || pct < worst.pct) worst = { from, to, pct };
  }
  return worst;
}

/** Sel hari × jam paling ramai, atau null bila datanya terlalu sedikit untuk disimpulkan. */
export function peakSlot(grid: number[][], minRounds = 20) {
  const total = grid.flat().reduce((a, n) => a + n, 0);
  if (total < minRounds) return null;
  let best = { day: 1, hour: 0, n: -1 };
  grid.forEach((row, d) =>
    row.forEach((n, h) => {
      if (n > best.n) best = { day: d + 1, hour: h, n };
    }),
  );
  return best;
}

/** Catatan otomatis dari angka periode terpilih: yang perlu ditindak lebih dulu (D-039, D-099, D-100). */
export function insightNotes(d: AdminInsights): Note[] {
  const out: Note[] = [];
  const s = d.sales;
  if (s.queue.review > 0)
    out.push({
      tone: 'sun',
      icon: 'receipt',
      text: t('admin.ins.noteReview', { n: s.queue.review }),
      to: '/admin/transaksi',
    });
  const oldest = s.review.oldestPendingHours;
  if (oldest !== null && oldest >= 24)
    out.push({
      tone: 'coral',
      icon: 'receipt',
      text: t('admin.ins.noteOldestPending', { h: oldest }),
      to: '/admin/transaksi',
    });
  // Pembanding = periode sebelumnya yang sama panjang (bulan/tahun lalu s.d. tanggal yang sama).
  const prev = rangeLabel(d.period.prevFrom, d.period.prevTo);
  const delta = deltaPct(s.revenue, s.revenuePrev);
  if (delta !== null)
    out.push({
      tone: delta >= 0 ? 'leaf' : 'coral',
      icon: 'chart',
      text: t(delta >= 0 ? 'admin.ins.noteRevenueUp' : 'admin.ins.noteRevenueDown', {
        pct: Math.abs(delta),
        prev,
      }),
    });
  else if (s.revenue > 0)
    out.push({
      tone: 'leaf',
      icon: 'chart',
      text: t('admin.ins.noteFirstRevenue', { amount: formatRupiah(s.revenue) }),
    });
  const unverified = d.funnel.registered - d.funnel.verified;
  if (d.funnel.registered >= 3 && unverified > 0 && unverified / d.funnel.registered > 0.2)
    out.push({
      tone: 'sun',
      icon: 'users',
      text: t('admin.ins.noteUnverified', { n: unverified }),
      to: '/admin/keluarga',
    });
  const leak = biggestLeak(funnelSteps(d));
  if (leak && leak.pct < 50)
    out.push({
      tone: 'coral',
      icon: 'users',
      text: t('admin.ins.noteLeak', { from: leak.from.label, to: leak.to.label, pct: leak.pct }),
    });
  if (s.payingRate !== null && d.users.parents >= 3)
    out.push({
      tone: 'grape',
      icon: 'users',
      text: t('admin.ins.notePaying', { pct: s.payingRate, n: s.payingFamilies }),
    });
  if (s.expired + s.cancelled > 0 && s.orders >= 3) {
    const lost = Math.round(((s.expired + s.cancelled) / s.orders) * 100);
    if (lost >= 30)
      out.push({ tone: 'coral', icon: 'receipt', text: t('admin.ins.noteLost', { pct: lost }) });
  }
  const weak = d.learning.topBooks.find((b) => b.rounds >= 10 && b.passRate < 60);
  if (weak)
    out.push({
      tone: 'sun',
      icon: 'book',
      text: t('admin.ins.noteWeakBook', { book: weak.title, pct: weak.passRate }),
      to: '/admin/skill',
    });
  const ret = d.learning.retention;
  if (ret.prev >= 5 && ret.rate !== null)
    out.push({
      tone: ret.rate < 40 ? 'coral' : 'leaf',
      icon: 'play',
      text: t(ret.rate < 40 ? 'admin.ins.noteRetentionLow' : 'admin.ins.noteRetention', {
        pct: ret.rate,
        prev,
      }),
    });
  if (d.users.children > 0) {
    const pct = Math.round((d.learning.learners / d.users.children) * 100);
    out.push({
      tone: 'sky',
      icon: 'play',
      text: t('admin.ins.noteActive', { pct, n: d.learning.learners }),
    });
  }
  const peak = peakSlot(d.learning.heatmap);
  if (peak)
    out.push({
      tone: 'grape',
      icon: 'chart',
      text: t('admin.ins.notePeak', { day: weekday(peak.day, 'long'), hour: peak.hour }),
    });
  if (out.length === 0) out.push({ tone: 'sky', icon: 'chart', text: t('admin.ins.noteQuiet') });
  return out;
}

const STATUS: { key: keyof AdminInsights['sales']; label: MessageKey; color: string }[] = [
  { key: 'paid', label: 'admin.order.status.paid', color: STATUS_COLOR.good },
  {
    key: 'awaitingReview',
    label: 'admin.order.status.awaiting_review',
    color: STATUS_COLOR.warning,
  },
  {
    key: 'awaitingPayment',
    label: 'admin.order.status.awaiting_payment',
    color: STATUS_COLOR.info,
  },
  { key: 'rejected', label: 'admin.order.status.rejected', color: STATUS_COLOR.critical },
  { key: 'expired', label: 'admin.order.status.expired', color: STATUS_COLOR.muted },
  { key: 'cancelled', label: 'admin.order.status.cancelled', color: STATUS_COLOR.muted2 },
];
const STATUS_TONE: Record<string, 'success' | 'warning' | 'info' | 'muted'> = {
  paid: 'success',
  awaiting_review: 'warning',
  awaiting_payment: 'info',
  rejected: 'warning',
  expired: 'muted',
  cancelled: 'muted',
};

type TrendKey = 'revenue' | 'newParents' | 'learners' | 'rounds';

/** Pendaftar terbaru (D-045): orang tua, anak daftar sendiri, anak gabung kelas — 30 hari terakhir. */
function RecentSignups() {
  const res = useFetch<{ items: AdminNotification[] }>('staff', '/admin/notifications');
  const list = (res.data?.items ?? []).filter((n) => !n.kind.startsWith('order')).slice(0, 8);
  return (
    <div className="ins-grid one">
      <Panel
        title={t('admin.ins.recentSignups')}
        action={<Link to="/admin/keluarga">{t('admin.ins.seeAll')}</Link>}
      >
        {list.length === 0 ? (
          <Empty>{t('admin.ins.noSignups')}</Empty>
        ) : (
          <ul className="ins-orders ins-signups">
            {list.map((n) => (
              <li key={n.key}>
                <div>
                  <strong>{n.title}</strong>
                  <small>
                    {n.detail ? `${n.detail} · ` : ''}
                    {formatDate(n.at)}
                  </small>
                </div>
                <span className="ins-amount">{t(`admin.notif.kind.${n.kind}` as MessageKey)}</span>
                {n.status === 'unverified' ? (
                  <Badge tone="warning">{t('admin.family.unverified')}</Badge>
                ) : (
                  <Badge tone="success">{t('admin.ins.signupOk')}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function MonthlyTrend({ d }: { d: AdminInsights }) {
  const [metric, setMetric] = useState<TrendKey>('revenue');
  const opts: { key: TrendKey; label: string }[] = [
    { key: 'revenue', label: t('admin.ins.trendRevenue') },
    { key: 'newParents', label: t('admin.ins.trendFamilies') },
    { key: 'learners', label: t('admin.ins.trendLearners') },
    { key: 'rounds', label: t('admin.ins.trendRounds') },
  ];
  const current = opts.find((o) => o.key === metric)!;
  const money = metric === 'revenue';
  const values = d.months.map((m) => m[metric]);
  const fmt = money ? formatRupiah : (n: number) => n.toLocaleString('id-ID');
  return (
    <Panel
      title={t('admin.ins.trendTitle')}
      sub={t('admin.ins.trendSub', {
        month: monthName(d.months[d.months.length - 1]!.month, 'long'),
      })}
      action={
        <MetricTabs
          options={opts}
          value={metric}
          onChange={setMetric}
          label={t('admin.ins.trendTitle')}
        />
      }
      className="is-chart"
    >
      <ColumnChart
        label={`${t('admin.ins.trendTitle')}: ${current.label}`}
        series={[{ key: metric, label: current.label, color: SERIES.grape, values }]}
        tick={(i) => monthName(d.months[i]!.month, 'short')}
        title={(i) => monthName(d.months[i]!.month, 'long')}
        format={fmt}
        axisFormat={money ? rupiahAxis : compact}
      />
      <ChartTable
        head={[t('admin.ins.colMonth'), ...opts.map((o) => o.label)]}
        rows={d.months.map((m) => [
          monthName(m.month, 'long'),
          formatRupiah(m.revenue),
          m.newParents,
          m.learners,
          m.rounds,
        ])}
      />
    </Panel>
  );
}

/** Filter periode di paling atas: 7/30/90 hari, atau bulan + tahun kalender (D-100). */
export function PeriodFilter({
  value,
  onChange,
  firstYear,
  thisYear,
}: {
  value: PeriodSel;
  onChange: (p: PeriodSel) => void;
  firstYear: number;
  thisYear: number;
}) {
  const years = Array.from(
    { length: Math.max(1, thisYear - Math.min(firstYear, thisYear) + 1) },
    (_, i) => thisYear - i,
  );
  const year = value.kind === 'days' ? thisYear : value.year;
  const month = value.kind === 'month' ? value.month : 0;
  const months = Array.from({ length: 12 }, (_, i) =>
    new Date(Date.UTC(2024, i, 1)).toLocaleDateString('id-ID', {
      month: 'long',
      timeZone: 'UTC',
    }),
  );
  return (
    <div className="ins-filter" role="group" aria-label={t('admin.ins.period')}>
      <span className="ins-filter-label">{t('admin.ins.period')}</span>
      <div className="ins-filter-chips">
        {([7, 30, 90] as const).map((n) => {
          const on = value.kind === 'days' && value.days === n;
          return (
            <button
              key={n}
              type="button"
              className={`ins-chip${on ? ' is-on' : ''}`}
              aria-pressed={on}
              onClick={() => onChange({ kind: 'days', days: n })}
            >
              {t('admin.ins.days', { n })}
            </button>
          );
        })}
      </div>
      <label className={`ins-select${value.kind !== 'days' ? ' is-on' : ''}`}>
        <span>{t('admin.ins.filterMonth')}</span>
        <select
          aria-label={t('admin.ins.filterMonth')}
          value={value.kind === 'days' ? '' : String(month)}
          onChange={(e) => {
            const m = Number(e.target.value);
            onChange(m === 0 ? { kind: 'year', year } : { kind: 'month', year, month: m });
          }}
        >
          {value.kind === 'days' && <option value="">{t('admin.ins.filterPick')}</option>}
          <option value="0">{t('admin.ins.filterAllMonths')}</option>
          {months.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className={`ins-select${value.kind !== 'days' ? ' is-on' : ''}`}>
        <span>{t('admin.ins.filterYear')}</span>
        <select
          aria-label={t('admin.ins.filterYear')}
          value={value.kind === 'days' ? '' : String(year)}
          onChange={(e) => {
            const y = Number(e.target.value);
            onChange(
              value.kind === 'month'
                ? { kind: 'month', year: y, month: value.month }
                : { kind: 'year', year: y },
            );
          }}
        >
          {value.kind === 'days' && <option value="">{t('admin.ins.filterPick')}</option>}
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function AdminInsightsView({ d }: { d: AdminInsights }) {
  const s = d.sales;
  const u = d.users;
  const l = d.learning;
  const p = d.period;
  const byMonth = p.bucket === 'month';
  const range = rangeLabel(p.from, p.to);
  const prevRange = rangeLabel(p.prevFrom, p.prevTo);
  const bookMax = Math.max(1, ...l.topBooks.map((b) => b.rounds));
  const domainMax = Math.max(1, ...l.domains.map((x) => x.rounds));
  const sum = (k: keyof AdminInsights['series'][number]) =>
    d.series.reduce((a, x) => a + Number(x[k]), 0);
  const best = d.series.reduce<AdminInsights['series'][number] | null>(
    (b, x) => (x.revenue > 0 && (!b || x.revenue > b.revenue) ? x : b),
    null,
  );
  const tick = (i: number) =>
    byMonth ? monthName(d.series[i]!.date, 'short') : shortDay(d.series[i]!.date);
  const title = (i: number) =>
    byMonth ? monthName(d.series[i]!.date, 'long') : longDay(d.series[i]!.date);
  const per = byMonth ? t('admin.ins.perMonth') : t('admin.ins.perDay');
  const avgLearners = d.series.length ? Math.round(sum('learners') / d.series.length) : 0;
  const roundsPerLearner = l.learners ? (l.rounds / l.learners).toFixed(1).replace('.', ',') : '–';
  const familyChildren = Math.max(0, u.children - u.selfOnly - u.inClass);
  const orderSegments = STATUS.map((x) => ({
    label: t(x.label),
    value: Number(s[x.key]),
    color: x.color,
  }));
  const passBand = PASS_SCORE / 10;
  const bandLabel = (i: number) => (i === 9 ? '90–100' : `${i * 10}–${i * 10 + 9}`);
  const days = Array.from({ length: 7 }, (_, i) => weekday(i + 1));
  const colDate = byMonth ? t('admin.ins.colMonth') : t('admin.ins.colDate');
  const rowDate = (x: { date: string }) => (byMonth ? monthName(x.date, 'long') : shortDay(x.date));
  const vs = (cur: number, prev: number) => {
    const pc = deltaPct(cur, prev);
    return pc === null
      ? t('admin.ins.noPrev')
      : t(pc >= 0 ? 'admin.ins.vsPrevUp' : 'admin.ins.vsPrevDown', { pct: Math.abs(pc) });
  };

  return (
    <>
      <div className="ins-kpis">
        <Kpi
          i={0}
          tone="leaf"
          icon={<ShellIconSvg name="wallet" />}
          label={t('admin.ins.revenuePeriod')}
          value={<CountUp value={s.revenue} format={formatRupiah} />}
          hint={vs(s.revenue, s.revenuePrev)}
        />
        <Kpi
          i={1}
          tone="sky"
          icon={<ShellIconSvg name="receipt" />}
          label={t('admin.ins.paidOrders')}
          value={<CountUp value={s.paid} />}
          hint={t('admin.ins.avgOrder', { amount: formatRupiah(s.avgOrder) })}
        />
        <Kpi
          i={2}
          tone="sun"
          icon={<ShellIconSvg name="receipt" />}
          label={t('admin.ins.awaitingReviewNow')}
          value={<CountUp value={s.queue.review} />}
          hint={t('admin.ins.awaitingPayment', { n: s.queue.payment })}
        />
        <Kpi
          i={3}
          tone="grape"
          icon={<ShellIconSvg name="users" />}
          label={t('admin.ins.families')}
          value={<CountUp value={u.parents} />}
          hint={t('admin.ins.newInPeriod', { n: u.newParents })}
        />
        <Kpi
          i={4}
          tone="leaf"
          icon={<ShellIconSvg name="badge" />}
          label={t('admin.ins.children')}
          value={<CountUp value={u.children} />}
          hint={t('admin.ins.newInPeriod', { n: u.newChildren })}
        />
        <Kpi
          i={5}
          tone="sky"
          icon={<ShellIconSvg name="play" />}
          label={t('admin.ins.learnersPeriod')}
          value={<CountUp value={l.learners} />}
          hint={vs(l.learners, l.learnersPrev)}
        />
        <Kpi
          i={6}
          tone="coral"
          icon={<ShellIconSvg name="book" />}
          label={t('admin.ins.roundsPeriod')}
          value={<CountUp value={l.rounds} />}
          hint={vs(l.rounds, l.roundsPrev)}
        />
        <Kpi
          i={7}
          tone="grape"
          icon={<ShellIconSvg name="chart" />}
          label={t('admin.ins.retention')}
          value={l.retention.rate === null ? '–' : `${l.retention.rate}%`}
          hint={t('admin.ins.retentionHint', {
            n: l.retention.returned,
            prev: l.retention.prev,
          })}
        />
      </div>

      <section className="ins-notes pd-rise" aria-label={t('admin.ins.notes')}>
        {insightNotes(d).map((n) => (
          <div key={n.text} className={`pd-insight tone-${n.tone}`}>
            <span className="pd-insight-icon" aria-hidden>
              <ShellIconSvg name={n.icon} />
            </span>
            <p>{n.to ? <Link to={n.to}>{n.text}</Link> : n.text}</p>
          </div>
        ))}
      </section>

      <SectionTitle sub={t('admin.ins.secSub', { range, prev: prevRange })}>
        {t('admin.ins.secSales')}
      </SectionTitle>
      <Panel
        title={t('admin.ins.revenueChart', { per })}
        sub={t('admin.ins.revenueSum', { amount: formatRupiah(s.revenue), orders: s.orders })}
        className="is-chart"
      >
        <Stats
          items={[
            {
              label: t('admin.ins.statTotal'),
              value: formatRupiah(s.revenue),
              delta: deltaPct(s.revenue, s.revenuePrev),
              hint: t('admin.ins.prevValue', { value: formatRupiah(s.revenuePrev) }),
            },
            {
              label: byMonth ? t('admin.ins.statAvgMonth') : t('admin.ins.statAvgDay'),
              value: formatRupiah(Math.round(s.revenue / Math.max(1, d.series.length))),
            },
            {
              label: t('admin.ins.statPaid'),
              value: s.paid.toLocaleString('id-ID'),
              delta: deltaPct(s.paid, s.paidPrev),
            },
            {
              label: byMonth ? t('admin.ins.statBestMonth') : t('admin.ins.statBestDay'),
              value: best ? `${tick(d.series.indexOf(best))} · ${rupiahShort(best.revenue)}` : '–',
            },
          ]}
        />
        <ColumnChart
          label={t('admin.ins.revenueChart', { per })}
          series={[
            {
              key: 'revenue',
              label: t('admin.ins.revenue'),
              color: SERIES.grape,
              values: d.series.map((x) => x.revenue),
            },
          ]}
          tick={tick}
          title={title}
          format={formatRupiah}
          axisFormat={rupiahAxis}
          height={320}
          extra={(i) => [
            { label: t('admin.ins.paidOrders'), value: String(d.series[i]!.paid) },
            { label: t('admin.ins.newOrders'), value: String(d.series[i]!.orders) },
          ]}
        />
        <ChartTable
          head={[
            colDate,
            t('admin.ins.revenue'),
            t('admin.ins.paidOrders'),
            t('admin.ins.newOrders'),
          ]}
          rows={d.series.map((x) => [rowDate(x), formatRupiah(x.revenue), x.paid, x.orders])}
        />
      </Panel>

      <div className="ins-grid wide-left">
        <MonthlyTrend d={d} />
        <Panel
          title={t('admin.ins.funnel')}
          sub={t('admin.ins.funnelSub')}
          action={<Link to="/admin/transaksi">{t('admin.ins.seeAll')}</Link>}
          className="is-chart"
        >
          <Donut
            segments={orderSegments}
            label={t('admin.ins.funnel')}
            center={s.orders.toLocaleString('id-ID')}
            caption={t('admin.ins.ordersAll')}
          />
          <Row
            label={t('admin.ins.successRate')}
            value={s.successRate === null ? '–' : `${s.successRate}%`}
          />
          <Row label={t('admin.ins.discountGiven')} value={formatRupiah(s.discountGiven)} />
          <Row label={t('admin.ins.uniqueCode')} value={formatRupiah(s.uniqueCode)} />
          <Row
            label={t('admin.ins.reviewMedian')}
            value={hours(s.review.medianHours)}
            hint={t('admin.ins.reviewHint', {
              p90: hours(s.review.p90Hours),
              n: s.review.reviewed,
            })}
          />
          <Row label={t('admin.ins.reviewOldest')} value={hours(s.review.oldestPendingHours)} />
        </Panel>
      </div>

      <div className="ins-grid">
        <Panel
          title={t('admin.ins.topPackages')}
          action={<Link to="/admin/paket">{t('admin.ins.manage')}</Link>}
        >
          {s.topPackages.length === 0 ? (
            <Empty>{t('admin.ins.noSales')}</Empty>
          ) : (
            <ol className="ins-rank">
              {s.topPackages.map((x) => (
                <li key={x.name}>
                  <span>{x.name}</span>
                  <strong>{rupiahShort(x.revenue)}</strong>
                  <small>
                    {t('admin.ins.sold', { n: x.sold })} ·{' '}
                    {t('admin.ins.share', {
                      pct: s.revenue ? Math.round((x.revenue / s.revenue) * 100) : 0,
                    })}
                  </small>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel
          title={t('admin.ins.recentOrders')}
          action={<Link to="/admin/transaksi">{t('admin.ins.seeAll')}</Link>}
        >
          {d.recentOrders.length === 0 ? (
            <Empty>{t('admin.ins.noOrders')}</Empty>
          ) : (
            <ul className="ins-orders">
              {d.recentOrders.map((o) => (
                <li key={o.id}>
                  <div>
                    <strong>{o.parentName}</strong>
                    <small>
                      {o.package} · {formatDate(o.createdAt)}
                    </small>
                  </div>
                  <span className="ins-amount">{formatRupiah(o.amount)}</span>
                  <Badge tone={STATUS_TONE[o.status] ?? 'muted'}>
                    {t(`admin.order.status.${o.status}` as MessageKey)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <SectionTitle sub={t('admin.ins.usersSub', { range })}>
        {t('admin.ins.secUsers')}
      </SectionTitle>
      <div className="ins-grid">
        <Panel
          title={t('admin.ins.funnelFamily')}
          sub={t('admin.ins.funnelFamilySub', { range })}
          action={<Link to="/admin/keluarga">{t('admin.ins.manage')}</Link>}
          className="is-chart"
        >
          <Funnel steps={funnelSteps(d)} />
          <Row
            label={t('admin.ins.payingRate')}
            value={s.payingRate === null ? '–' : `${s.payingRate}%`}
            hint={t('admin.ins.payingFamilies', { n: s.payingFamilies })}
          />
        </Panel>
        <Panel
          title={t('admin.ins.usersTitle')}
          sub={t('admin.ins.usersAsOf', { date: rangeLabel(p.to, p.to) })}
          className="is-chart"
        >
          <Donut
            segments={[
              { label: t('admin.ins.childrenFamily'), value: familyChildren, color: SERIES.grape },
              { label: t('admin.ins.childrenSelf'), value: u.selfOnly, color: SERIES.orange },
              { label: t('admin.ins.childrenClass'), value: u.inClass, color: SERIES.aqua },
            ]}
            label={t('admin.ins.usersTitle')}
            center={u.children.toLocaleString('id-ID')}
            caption={t('admin.ins.children')}
          />
          <Row label={t('admin.ins.staff')} value={`${u.admins} admin · ${u.facilitators} guru`} />
          <Row
            label={t('admin.ins.classes')}
            value={t('admin.ins.classesValue', {
              open: d.classes.open,
              total: d.classes.total,
              students: d.classes.students,
            })}
          />
        </Panel>
      </div>
      <Panel
        title={t('admin.ins.signupChart', { per })}
        sub={t('admin.ins.newUsersSum', { n: sum('newUsers') })}
        className="is-chart"
      >
        <ColumnChart
          label={t('admin.ins.signupChart', { per })}
          series={[
            {
              key: 'parents',
              label: t('admin.ins.newParents'),
              color: SERIES.grape,
              values: d.series.map((x) => x.newParents),
            },
            {
              key: 'children',
              label: t('admin.ins.newChildren'),
              color: SERIES.orange,
              values: d.series.map((x) => x.newChildren),
            },
          ]}
          tick={tick}
          title={title}
          height={240}
        />
        <ChartTable
          head={[colDate, t('admin.ins.newParents'), t('admin.ins.newChildren')]}
          rows={d.series.map((x) => [rowDate(x), x.newParents, x.newChildren])}
        />
      </Panel>

      <SectionTitle sub={t('admin.ins.secSub', { range, prev: prevRange })}>
        {t('admin.ins.secLearning')}
      </SectionTitle>
      <Panel
        title={t('admin.ins.roundsChart', { per })}
        sub={t('admin.ins.roundsSub', { pass: PASS_SCORE })}
        action={<Link to="/admin/laporan">{t('admin.ins.seeAll')}</Link>}
        className="is-chart"
      >
        <Stats
          items={[
            {
              label: t('admin.ins.statRounds'),
              value: l.rounds.toLocaleString('id-ID'),
              delta: deltaPct(l.rounds, l.roundsPrev),
            },
            {
              label: t('admin.ins.passRateLabel'),
              value: l.passRate === null ? '–' : `${l.passRate}%`,
            },
            {
              label: t('admin.ins.learners'),
              value: l.learners.toLocaleString('id-ID'),
              delta: deltaPct(l.learners, l.learnersPrev),
            },
            { label: t('admin.ins.roundsPerLearner'), value: roundsPerLearner },
            { label: t('admin.ins.minutes'), value: l.minutes.toLocaleString('id-ID') },
          ]}
        />
        <ColumnChart
          label={t('admin.ins.roundsChart', { per })}
          series={[
            {
              key: 'passed',
              label: t('admin.ins.passed'),
              color: SERIES.grape,
              values: d.series.map((x) => x.passed),
            },
            {
              key: 'notPassed',
              label: t('admin.ins.notPassed'),
              color: SERIES.muted,
              values: d.series.map((x) => x.rounds - x.passed),
            },
          ]}
          tick={tick}
          title={title}
          height={320}
          extra={(i) => {
            const x = d.series[i]!;
            return [
              {
                label: t('admin.ins.passRateLabel'),
                value: x.rounds ? `${Math.round((x.passed / x.rounds) * 100)}%` : '–',
              },
            ];
          }}
        />
        <ChartTable
          head={[
            colDate,
            t('admin.ins.statRounds'),
            t('admin.ins.passed'),
            t('admin.ins.learners'),
          ]}
          rows={d.series.map((x) => [rowDate(x), x.rounds, x.passed, x.learners])}
        />
      </Panel>

      <div className="ins-grid">
        <Panel
          title={t('admin.ins.learnersChart', { per })}
          sub={t('admin.ins.learnersSub', { n: avgLearners, per })}
          className="is-chart"
        >
          <LineChart
            label={t('admin.ins.learnersChart', { per })}
            series={[
              {
                key: 'learners',
                label: t('admin.ins.learners'),
                color: SERIES.grape,
                values: d.series.map((x) => x.learners),
              },
            ]}
            tick={tick}
            title={title}
          />
        </Panel>
        <Panel
          title={t('admin.ins.scoreChart')}
          sub={t('admin.ins.scoreSub', { pass: PASS_SCORE })}
          className="is-chart"
        >
          <ColumnChart
            label={t('admin.ins.scoreChart')}
            series={[
              {
                key: 'pass',
                label: t('admin.ins.passed'),
                color: SERIES.grape,
                values: l.scoreBands.map((n, i) => (i >= passBand ? n : 0)),
              },
              {
                key: 'fail',
                label: t('admin.ins.notPassed'),
                color: SERIES.muted,
                values: l.scoreBands.map((n, i) => (i < passBand ? n : 0)),
              },
            ]}
            tick={(i) => String(i * 10)}
            title={bandLabel}
            height={260}
          />
          <ChartTable
            head={[t('admin.ins.colScore'), t('admin.ins.statRounds')]}
            rows={l.scoreBands.map((n, i) => [bandLabel(i), n])}
          />
        </Panel>
      </div>

      <div className="ins-grid wide-left">
        <Panel title={t('admin.ins.heatTitle')} sub={t('admin.ins.heatSub')} className="is-chart">
          <Heatmap
            grid={l.heatmap}
            rows={days}
            label={t('admin.ins.heatTitle')}
            cellLabel={(day, hour, n) =>
              t('admin.ins.heatCell', { day: weekday(day + 1, 'long'), hour, n })
            }
          />
          <ChartTable
            head={[t('admin.ins.colDay'), ...Array.from({ length: 24 }, (_, h) => String(h))]}
            rows={l.heatmap.map((row, i) => [days[i]!, ...row])}
          />
        </Panel>
        <Panel title={t('admin.ins.domainTitle')} className="is-chart">
          {l.domains.length === 0 ? (
            <Empty>{t('admin.ins.noRounds')}</Empty>
          ) : (
            <ul className="ins-bars">
              {l.domains.map((x) => (
                <li key={x.domain}>
                  <span>{domainLabel(x.domain)}</span>
                  <strong>
                    {t('admin.ins.domainValue', {
                      n: x.rounds,
                      pct: x.passRate,
                      kids: x.learners,
                    })}
                  </strong>
                  <Meter
                    value={x.rounds}
                    max={domainMax}
                    tone={x.passRate < 60 ? 'sun' : 'grape'}
                  />
                </li>
              ))}
            </ul>
          )}
          <Row
            label={t('admin.ins.retention')}
            value={l.retention.rate === null ? '–' : `${l.retention.rate}%`}
            hint={t('admin.ins.retentionHint', {
              n: l.retention.returned,
              prev: l.retention.prev,
            })}
          />
          <Row label={t('admin.ins.freshLearners')} value={l.retention.fresh} />
        </Panel>
      </div>

      <Panel
        title={t('admin.ins.cohortTitle')}
        sub={t('admin.ins.cohortSub', { date: rangeLabel(p.to, p.to) })}
        className="is-chart"
      >
        {l.cohorts.length === 0 ? (
          <Empty>{t('admin.ins.noRounds')}</Empty>
        ) : (
          <CohortTable
            cohorts={l.cohorts}
            label={t('admin.ins.cohortTitle')}
            weekLabel={(w) => shortDay(w)}
          />
        )}
      </Panel>

      <div className="ins-grid">
        <Panel
          title={t('admin.ins.learningTitle')}
          action={<Link to="/admin/laporan">{t('admin.ins.seeAll')}</Link>}
        >
          <div className="ins-learn">
            <Ring
              percent={l.passRate ?? 0}
              size={104}
              label={t('admin.ins.passRate', { pct: l.passRate ?? 0 })}
            />
            <div>
              <Row
                label={t('admin.ins.passRateLabel')}
                value={l.passRate === null ? '–' : `${l.passRate}%`}
              />
              <Row label={t('admin.ins.avgScore')} value={l.avgScore} />
              <Row label={t('admin.ins.minutes')} value={l.minutes.toLocaleString('id-ID')} />
              <Row label={t('admin.ins.active7')} value={u.active7.toLocaleString('id-ID')} />
            </div>
          </div>
          {l.topBooks.length > 0 && (
            <ul className="ins-bars">
              {l.topBooks.map((b) => (
                <li key={`${b.domain}/${b.grade}`}>
                  <span>{b.title}</span>
                  <strong>{t('admin.ins.bookRounds', { n: b.rounds, pct: b.passRate })}</strong>
                  <Meter value={b.rounds} max={bookMax} tone={b.passRate < 60 ? 'sun' : 'grape'} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={t('admin.ins.financeTitle')}
          sub={t('admin.ins.financeSub', { month: monthName(p.to, 'long') })}
          action={<Link to="/admin/kas">{t('admin.ins.cashBook')}</Link>}
          className="is-chart"
        >
          <ColumnChart
            mode="group"
            label={t('admin.ins.financeTitle')}
            series={[
              {
                key: 'in',
                label: t('admin.ins.income'),
                color: SERIES.aqua,
                values: d.months.map((m) => m.income),
              },
              {
                key: 'out',
                label: t('admin.ins.expense'),
                color: SERIES.orange,
                values: d.months.map((m) => m.expense),
              },
            ]}
            tick={(i) => monthName(d.months[i]!.month, 'short')}
            title={(i) => monthName(d.months[i]!.month, 'long')}
            format={formatRupiah}
            axisFormat={rupiahAxis}
            height={240}
            extra={(i) => {
              const m = d.months[i]!;
              return [{ label: t('admin.ins.net'), value: formatRupiah(m.income - m.expense) }];
            }}
          />
          <Row
            label={t('admin.ins.netPeriod')}
            value={formatRupiah(d.finance.period.net)}
            hint={t('admin.ins.yearHint', {
              income: formatRupiah(d.finance.period.income),
              expense: formatRupiah(d.finance.period.expense),
            })}
          />
          <Row
            label={t('admin.ins.netYear', { year: d.finance.year.year })}
            value={formatRupiah(d.finance.year.net)}
            hint={t('admin.ins.yearHint', {
              income: formatRupiah(d.finance.year.income),
              expense: formatRupiah(d.finance.year.expense),
            })}
          />
          <ChartTable
            head={[
              t('admin.ins.colMonth'),
              t('admin.ins.income'),
              t('admin.ins.expense'),
              t('admin.ins.net'),
            ]}
            rows={d.months.map((m) => [
              monthName(m.month, 'long'),
              formatRupiah(m.income),
              formatRupiah(m.expense),
              formatRupiah(m.income - m.expense),
            ])}
          />
        </Panel>
      </div>
    </>
  );
}

export function OverviewPage() {
  const [params, setParams] = useSearchParams();
  const sel = parsePeriod(params.get('periode'));
  const qs = periodQuery(sel);
  const insights = useFetch<AdminInsights>('staff', `/admin/insights?${qs}`);
  const skills = useFetch<SkillStat[]>('staff', `/admin/reports/skills?${qs}`);
  const thisYear = Number(new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 4));
  const period = insights.data?.period ?? null;
  const setSel = (p: PeriodSel) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('periode', formatPeriodParam(p));
        return next;
      },
      { replace: true },
    );
  const hardCols: Column<SkillStat>[] = [
    {
      key: 'title',
      label: t('admin.col.skill'),
      render: (s) => (
        <Link to={skillPath(s.id)}>
          {s.category}.{s.order} {s.title}
        </Link>
      ),
    },
    { key: 'answered', label: t('admin.col.answered'), render: (s) => s.answered },
    { key: 'accuracy', label: t('admin.col.accuracy'), render: (s) => percent(s.accuracy) },
  ];
  const distCols: Column<DistractorTotal>[] = [
    { key: 'tag', label: t('admin.col.misconception'), render: (d) => <code>{d.tag}</code> },
    { key: 'count', label: t('admin.col.times'), render: (d) => d.count },
    {
      key: 'skills',
      label: t('admin.col.skills'),
      render: (d) =>
        d.skills
          .slice(0, 3)
          .map((s) => `${s.category}.${s.order}`)
          .join(', ') + (d.skills.length > 3 ? ` +${d.skills.length - 3}` : ''),
    },
  ];

  return (
    <>
      <PageHeader title={t('admin.overview.title')} subtitle={t('admin.overview.subtitle')} />
      <div className="ins-filter-bar">
        <PeriodFilter
          value={sel}
          onChange={setSel}
          firstYear={insights.data?.firstYear ?? thisYear}
          thisYear={thisYear}
        />
        <p className="ins-filter-range" aria-live="polite">
          <strong>{periodTitle(sel)}</strong>
          {period && (
            <>
              {' · '}
              {rangeLabel(period.from, period.to)}
              <span className="ui-muted">
                {' · '}
                {t('admin.ins.comparedTo', { prev: rangeLabel(period.prevFrom, period.prevTo) })}
              </span>
            </>
          )}
          {insights.data && (
            <span className="ui-muted">
              {' · '}
              {t('admin.ins.updated', { when: formatDate(insights.data.updatedAt) })}
            </span>
          )}
        </p>
      </div>
      <BannerSlider placement="admin" />
      <div className={insights.loading && insights.data ? 'ins-refetch' : undefined}>
        <Loadable loading={insights.loading} error={insights.error} hasData={!!insights.data}>
          {() => <AdminInsightsView d={insights.data!} />}
        </Loadable>
        <AffiliateSection sel={sel} />
        <CommissionSection sel={sel} period={period} />
        <SectionTitle sub={t('admin.ins.qualitySub', { title: periodTitle(sel) })}>
          {t('admin.ins.secQuality')}
        </SectionTitle>
        <div className="adm-two">
          <Card title={t('admin.overview.hardest')}>
            <Loadable loading={skills.loading} error={skills.error} hasData={!!skills.data}>
              {() => {
                const rows = hardestSkills(skills.data!);
                return rows.length ? (
                  <Table rows={rows} columns={hardCols} rowKey={(s) => s.id} />
                ) : (
                  <Empty>
                    {t('admin.overview.hardestEmpty', { n: MIN_ANSWERS_FOR_DIFFICULTY })}
                  </Empty>
                );
              }}
            </Loadable>
          </Card>
          <Card title={t('admin.overview.distractors')}>
            <Loadable loading={skills.loading} error={skills.error} hasData={!!skills.data}>
              {() => {
                const rows = popularDistractors(skills.data!);
                return rows.length ? (
                  <Table rows={rows} columns={distCols} rowKey={(d) => d.tag} />
                ) : (
                  <Empty>{t('admin.overview.distractorsEmpty')}</Empty>
                );
              }}
            </Loadable>
          </Card>
        </div>
        <RecentSignups />
      </div>
    </>
  );
}
