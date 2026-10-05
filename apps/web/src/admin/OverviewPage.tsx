import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatRupiah } from '@little-coder/engine';
import type { SkillStat } from '../api/types';
import { useFetch } from '../auth/useApi';
import type { AdminNotification } from './notifications/NotificationBell';
import { BannerSlider } from '../components/BannerSlider';
import { t, type MessageKey } from '../i18n';
import { ShellIconSvg, type ShellIcon } from '../ui/AppShell';
import { CountUp, DayBars, Kpi, Meter, Ring } from '../ui/charts';
import { Badge, Card, Empty, PageHeader, Table, formatDate, type Column } from '../ui/ui';
import { Loadable, percent, skillPath } from './common';
import type { AdminInsights } from './insightsTypes';
import { AffiliateCommissionOverview } from './OverviewAffiliate';

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

/** Catatan otomatis dari angka laporan: yang perlu ditindak lebih dulu (D-039). */
export function insightNotes(d: AdminInsights): Note[] {
  const out: Note[] = [];
  const s = d.sales;
  if (s.awaitingReview > 0)
    out.push({
      tone: 'sun',
      icon: 'receipt',
      text: t('admin.ins.noteReview', { n: s.awaitingReview }),
      to: '/admin/transaksi',
    });
  if (s.revenuePrevMonth > 0) {
    const delta = Math.round(((s.revenueMonth - s.revenuePrevMonth) / s.revenuePrevMonth) * 100);
    out.push({
      tone: delta >= 0 ? 'leaf' : 'coral',
      icon: 'chart',
      text: t(delta >= 0 ? 'admin.ins.noteRevenueUp' : 'admin.ins.noteRevenueDown', {
        pct: Math.abs(delta),
      }),
    });
  } else if (s.revenueMonth > 0) {
    out.push({
      tone: 'leaf',
      icon: 'chart',
      text: t('admin.ins.noteFirstRevenue', { amount: formatRupiah(s.revenueMonth) }),
    });
  }
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
  if (d.users.children > 0) {
    const pct = Math.round((d.users.active7 / d.users.children) * 100);
    out.push({
      tone: 'sky',
      icon: 'play',
      text: t('admin.ins.noteActive', { pct, n: d.users.active7 }),
    });
  }
  if (out.length === 0) out.push({ tone: 'sky', icon: 'chart', text: t('admin.ins.noteQuiet') });
  return out;
}

const STATUS: { key: keyof AdminInsights['sales']; label: MessageKey; tone: string }[] = [
  { key: 'paid', label: 'admin.order.status.paid', tone: 'leaf' },
  { key: 'awaitingReview', label: 'admin.order.status.awaiting_review', tone: 'sun' },
  { key: 'awaitingPayment', label: 'admin.order.status.awaiting_payment', tone: 'sky' },
  { key: 'rejected', label: 'admin.order.status.rejected', tone: 'coral' },
  { key: 'expired', label: 'admin.order.status.expired', tone: 'muted' },
  { key: 'cancelled', label: 'admin.order.status.cancelled', tone: 'muted' },
];
const STATUS_TONE: Record<string, 'success' | 'warning' | 'info' | 'muted'> = {
  paid: 'success',
  awaiting_review: 'warning',
  awaiting_payment: 'info',
  rejected: 'warning',
  expired: 'muted',
  cancelled: 'muted',
};

const shortDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
const rupiahShort = (n: number) =>
  n >= 1_000_000
    ? `Rp${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
    : formatRupiah(n);

function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ins-panel pd-rise ${className}`}>
      <div className="ins-panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="ins-row">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

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

function AdminInsightsView({ d }: { d: AdminInsights }) {
  const s = d.sales;
  const u = d.users;
  const l = d.learning;
  const revDelta =
    s.revenuePrevMonth > 0
      ? Math.round(((s.revenueMonth - s.revenuePrevMonth) / s.revenuePrevMonth) * 100)
      : null;
  const statusMax = Math.max(1, ...STATUS.map((x) => Number(s[x.key])));
  const bookMax = Math.max(1, ...l.topBooks.map((b) => b.rounds));
  return (
    <>
      <div className="ins-kpis">
        <Kpi
          i={0}
          tone="leaf"
          icon={<ShellIconSvg name="wallet" />}
          label={t('admin.ins.revenueMonth')}
          value={<CountUp value={s.revenueMonth} format={formatRupiah} />}
          hint={
            revDelta === null
              ? t('admin.ins.noPrev')
              : t(revDelta >= 0 ? 'admin.ins.vsPrevUp' : 'admin.ins.vsPrevDown', {
                  pct: Math.abs(revDelta),
                })
          }
        />
        <Kpi
          i={1}
          tone="grape"
          icon={<ShellIconSvg name="chart" />}
          label={t('admin.ins.revenueTotal')}
          value={<CountUp value={s.revenueTotal} format={formatRupiah} />}
          hint={t('admin.ins.avgOrder', { amount: formatRupiah(s.avgOrder) })}
        />
        <Kpi
          i={2}
          tone="sky"
          icon={<ShellIconSvg name="receipt" />}
          label={t('admin.ins.paidOrders')}
          value={<CountUp value={s.paid} />}
          hint={t('admin.ins.paidMonth', { n: s.paidMonth })}
        />
        <Kpi
          i={3}
          tone="sun"
          icon={<ShellIconSvg name="receipt" />}
          label={t('admin.ins.awaitingReview')}
          value={<CountUp value={s.awaitingReview} />}
          hint={t('admin.ins.awaitingPayment', { n: s.awaitingPayment })}
        />
        <Kpi
          i={4}
          tone="grape"
          icon={<ShellIconSvg name="users" />}
          label={t('admin.ins.families')}
          value={<CountUp value={u.parents} />}
          hint={t('admin.ins.newN', { n: u.newParents, days: d.days })}
        />
        <Kpi
          i={5}
          tone="leaf"
          icon={<ShellIconSvg name="badge" />}
          label={t('admin.ins.children')}
          value={<CountUp value={u.children} />}
          hint={t('admin.ins.newN', { n: u.newChildren, days: d.days })}
        />
        <Kpi
          i={6}
          tone="sky"
          icon={<ShellIconSvg name="play" />}
          label={t('admin.ins.active7')}
          value={<CountUp value={u.active7} />}
          hint={t('admin.ins.ofChildren', { n: u.children })}
        />
        <Kpi
          i={7}
          tone="coral"
          icon={<ShellIconSvg name="book" />}
          label={t('admin.ins.rounds', { days: d.days })}
          value={<CountUp value={l.rounds} />}
          hint={t('admin.ins.rounds7', { n: l.rounds7 })}
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

      <div className="ins-grid">
        <Panel title={t('admin.ins.revenueChart', { days: d.days })}>
          <DayBars
            data={d.series.map((x) => ({ date: x.date, value: x.revenue }))}
            label={t('admin.ins.revenueChart', { days: d.days })}
            format={formatRupiah}
            dayLabel={shortDay}
          />
          <p className="ins-foot">
            {t('admin.ins.revenueSum', {
              amount: formatRupiah(d.series.reduce((a, x) => a + x.revenue, 0)),
              orders: d.series.reduce((a, x) => a + x.orders, 0),
            })}
          </p>
        </Panel>
        <Panel title={t('admin.ins.roundsChart', { days: d.days })}>
          <DayBars
            data={d.series.map((x) => ({ date: x.date, value: x.rounds }))}
            label={t('admin.ins.roundsChart', { days: d.days })}
            dayLabel={shortDay}
          />
          <p className="ins-foot">
            {t('admin.ins.newUsersSum', { n: d.series.reduce((a, x) => a + x.newUsers, 0) })}
          </p>
        </Panel>
      </div>

      <div className="ins-grid three">
        <Panel
          title={t('admin.ins.funnel')}
          action={<Link to="/admin/transaksi">{t('admin.ins.seeAll')}</Link>}
        >
          <ul className="ins-bars">
            {STATUS.map((x) => (
              <li key={x.key}>
                <span>{t(x.label)}</span>
                <strong>{Number(s[x.key]).toLocaleString('id-ID')}</strong>
                <Meter value={Number(s[x.key])} max={statusMax} tone={x.tone} />
              </li>
            ))}
          </ul>
          <Row
            label={t('admin.ins.successRate')}
            value={s.successRate === null ? '–' : `${s.successRate}%`}
          />
          <Row
            label={t('admin.ins.payingRate')}
            value={s.payingRate === null ? '–' : `${s.payingRate}%`}
            hint={t('admin.ins.payingFamilies', { n: s.payingFamilies })}
          />
          <Row label={t('admin.ins.discountGiven')} value={formatRupiah(s.discountGiven)} />
        </Panel>

        <Panel
          title={t('admin.ins.topPackages')}
          action={<Link to="/admin/paket">{t('admin.ins.manage')}</Link>}
        >
          {s.topPackages.length === 0 ? (
            <Empty>{t('admin.ins.noSales')}</Empty>
          ) : (
            <ol className="ins-rank">
              {s.topPackages.map((p) => (
                <li key={p.name}>
                  <span>{p.name}</span>
                  <strong>{rupiahShort(p.revenue)}</strong>
                  <small>{t('admin.ins.sold', { n: p.sold })}</small>
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

      <AffiliateCommissionOverview />

      <div className="ins-grid three">
        <Panel
          title={t('admin.ins.usersTitle')}
          action={<Link to="/admin/keluarga">{t('admin.ins.manage')}</Link>}
        >
          <Row label={t('admin.ins.families')} value={u.parents.toLocaleString('id-ID')} />
          <Row
            label={t('admin.ins.childrenFamily')}
            value={(u.children - u.selfOnly - u.inClass).toLocaleString('id-ID')}
          />
          <Row label={t('admin.ins.childrenSelf')} value={u.selfOnly.toLocaleString('id-ID')} />
          <Row label={t('admin.ins.childrenClass')} value={u.inClass.toLocaleString('id-ID')} />
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

        <Panel
          title={t('admin.ins.learningTitle', { days: d.days })}
          action={<Link to="/admin/laporan">{t('admin.ins.seeAll')}</Link>}
        >
          <div className="ins-learn">
            <Ring
              percent={l.passRate ?? 0}
              size={92}
              label={t('admin.ins.passRate', { pct: l.passRate ?? 0 })}
            />
            <div>
              <Row
                label={t('admin.ins.passRateLabel')}
                value={l.passRate === null ? '–' : `${l.passRate}%`}
              />
              <Row label={t('admin.ins.avgScore')} value={l.avgScore} />
              <Row label={t('admin.ins.minutes')} value={l.minutes.toLocaleString('id-ID')} />
              <Row label={t('admin.ins.learners')} value={l.learners.toLocaleString('id-ID')} />
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
          action={<Link to="/admin/kas">{t('admin.ins.cashBook')}</Link>}
        >
          <Row label={t('admin.ins.incomeMonth')} value={formatRupiah(d.finance.month.income)} />
          <Row label={t('admin.ins.expenseMonth')} value={formatRupiah(d.finance.month.expense)} />
          <Row label={t('admin.ins.netMonth')} value={formatRupiah(d.finance.month.net)} />
          <Row
            label={t('admin.ins.netYear')}
            value={formatRupiah(d.finance.year.net)}
            hint={t('admin.ins.yearHint', {
              income: formatRupiah(d.finance.year.income),
              expense: formatRupiah(d.finance.year.expense),
            })}
          />
          <Link className="ui-btn ui-btn-secondary" to="/admin/komisi">
            {t('admin.ins.commission')}
          </Link>
        </Panel>
      </div>

      <RecentSignups />
    </>
  );
}

export function OverviewPage() {
  const [days, setDays] = useState(30);
  const insights = useFetch<AdminInsights>('staff', `/admin/insights?days=${days}`);
  const skills = useFetch<SkillStat[]>('staff', '/admin/reports/skills');
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
      <BannerSlider placement="admin" />
      <div className="ins-period" role="group" aria-label={t('admin.ins.period')}>
        {[7, 30, 90].map((n) => (
          <button
            key={n}
            type="button"
            className={`ins-chip${n === days ? ' is-on' : ''}`}
            aria-pressed={n === days}
            onClick={() => setDays(n)}
          >
            {t('admin.ins.days', { n })}
          </button>
        ))}
        {insights.data && (
          <span className="ui-muted">
            {t('admin.ins.updated', { when: formatDate(insights.data.updatedAt) })}
          </span>
        )}
      </div>
      <Loadable loading={insights.loading} error={insights.error} hasData={!!insights.data}>
        {() => <AdminInsightsView d={insights.data!} />}
      </Loadable>
      <div className="adm-two">
        <Card title={t('admin.overview.hardest')}>
          <Loadable loading={skills.loading} error={skills.error} hasData={!!skills.data}>
            {() => {
              const rows = hardestSkills(skills.data!);
              return rows.length ? (
                <Table rows={rows} columns={hardCols} rowKey={(s) => s.id} />
              ) : (
                <Empty>{t('admin.overview.hardestEmpty', { n: MIN_ANSWERS_FOR_DIFFICULTY })}</Empty>
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
    </>
  );
}
