import { Link } from 'react-router-dom';
import { formatPercentBp, formatRupiah } from '@little-coder/engine';
import { useFetch } from '../auth/useApi';
import { t } from '../i18n';
import { ShellIconSvg, type ShellIcon } from '../ui/AppShell';
import { Badge, Empty } from '../ui/ui';
import type { Commission } from './billing/types';
import {
  AreaChart,
  ChartTable,
  Donut,
  FunnelShape,
  Gauge,
  LineChart,
  SERIES,
  STATUS_COLOR,
  Sankey,
  Treemap,
  type SankeyLink,
  type SankeyNode,
} from './insightCharts';
import { Panel, SectionTitle, Stats, monthName, rupiahAxis, rupiahShort } from './overviewParts';
import {
  commissionMonth,
  periodQuery,
  periodTitle,
  rangeLabel,
  type Period,
  type PeriodSel,
} from './period';

/** GET /admin/affiliate — posisi saldo & antrean SAAT INI (tidak mengikuti filter). */
type AffiliateTotals = {
  available: number;
  pending: number;
  earned: number;
  payoutRequests: number;
  payoutRequestedAmount: number;
  paid: number;
  referred: number;
  affiliates: number;
  accountsPending: number;
};
/** GET /admin/affiliate/analytics?periode — tren 12 bulan, corong & afiliator teratas di periode itu. */
export type AffiliateAnalytics = {
  months: {
    month: string;
    signups: number;
    subscribers: number;
    commission: number;
    bonus: number;
    paid: number;
    revenue: number;
  }[];
  funnel: {
    clicks: number;
    signups: number;
    verified: number;
    active: number;
    subscribers: number;
  };
  revenue: { total: number; month: number; period: number };
  cost: number;
  costPeriod: number;
  flaggedAccounts: number;
  top: {
    id: string;
    name: string;
    code: string | null;
    members: number;
    subscribers: number;
    earned: number;
  }[];
  period: Period | null;
};
/** GET /admin/finance/commission-year?year= */
export type CommissionYear = {
  year: number;
  months: {
    month: string;
    income: number;
    expense: number;
    net: number;
    closed: boolean;
    future: boolean;
    shares: {
      ownerId: string | null;
      ownerName: string;
      percentBp: number;
      amount: number;
      paidAt: string | null;
    }[];
  }[];
};

const jakartaToday = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const plain = (n: number) => n.toLocaleString('id-ID');

function Todo({ to, icon, text }: { to: string; icon: ShellIcon; text: string }) {
  return (
    <Link to={to} className="aff-ov-todo">
      <ShellIconSvg name={icon} />
      <span>{text}</span>
    </Link>
  );
}

/** Rasio biaya afiliasi terhadap pendapatan anggota referal (%), atau null bila belum ada pendapatan. */
export const costRatio = (cost: number, revenue: number) =>
  revenue > 0 ? Math.round((cost / revenue) * 100) : null;

/**
 * Section Afiliasi (D-063, D-100): satu panel lebar penuh. Angka & grafik mengikuti filter periode; saldo dan
 * antrean pencairan adalah posisi saat ini.
 */
export function AffiliateSection({ sel }: { sel: PeriodSel }) {
  const totals = useFetch<AffiliateTotals>('staff', '/admin/affiliate');
  const stats = useFetch<AffiliateAnalytics>(
    'staff',
    `/admin/affiliate/analytics?${periodQuery(sel)}`,
  );
  const a = totals.data;
  const s = stats.data;
  if (!a && !s) return null;

  const ratio = s ? costRatio(s.costPeriod, s.revenue.period) : null;
  const perRupiah =
    s && s.costPeriod > 0 ? (s.revenue.period / s.costPeriod).toFixed(1).replace('.', ',') : null;
  const tick = (i: number) => monthName(s!.months[i]!.month, 'short');
  const title = (i: number) => monthName(s!.months[i]!.month, 'long');
  const range = s?.period ? rangeLabel(s.period.from, s.period.to) : periodTitle(sel);
  const todos = [
    a && a.payoutRequests > 0 && (
      <Todo
        key="payout"
        to="/admin/afiliasi?tab=payouts"
        icon="wallet"
        text={t('admin.ins.affTodoPayout', {
          n: a.payoutRequests,
          amount: formatRupiah(a.payoutRequestedAmount),
        })}
      />
    ),
    a && a.accountsPending > 0 && (
      <Todo
        key="accounts"
        to="/admin/afiliasi?tab=accounts"
        icon="bank"
        text={t('admin.ins.affTodoAccounts', { n: a.accountsPending })}
      />
    ),
    s && s.flaggedAccounts > 0 && (
      <Todo
        key="flags"
        to="/admin/afiliasi"
        icon="flag"
        text={t('admin.ins.affTodoFlags', { n: s.flaggedAccounts })}
      />
    ),
  ].filter(Boolean);

  return (
    <section className="aff-section" aria-labelledby="aff-title">
      <SectionTitle sub={t('admin.ins.affLead', { range })}>
        <span id="aff-title">{t('admin.ins.affTitle')}</span>
      </SectionTitle>
      <Panel
        title={t('admin.ins.affPanel')}
        sub={t('admin.ins.affPanelSub')}
        action={<Link to="/admin/afiliasi">{t('admin.ins.manage')}</Link>}
        className="is-chart is-wide"
      >
        {s && (
          <Stats
            items={[
              {
                label: t('admin.ins.affAffiliates'),
                value: plain(a?.affiliates ?? 0),
                hint: t('admin.ins.affReferred', { n: a?.referred ?? 0 }),
              },
              { label: t('admin.ins.affNewMembers'), value: plain(s.funnel.signups) },
              {
                label: t('admin.ins.affRevenue'),
                value: formatRupiah(s.revenue.period),
                hint: t('admin.ins.affRevenueAll', { amount: rupiahShort(s.revenue.total) }),
              },
              {
                label: t('admin.ins.affCost'),
                value: formatRupiah(s.costPeriod),
                hint:
                  ratio === null
                    ? t('admin.ins.affCostNoRevenue')
                    : t('admin.ins.affCostRatio', { pct: ratio }),
              },
              {
                label: t('admin.ins.affBalance'),
                value: formatRupiah(a?.available ?? 0),
                hint: t('admin.ins.nowLabel'),
              },
            ]}
          />
        )}
        {todos.length > 0 ? (
          <div className="aff-ov-todos">{todos}</div>
        ) : (
          a && <p className="aff-ov-clear">{t('admin.ins.affNoTodo')}</p>
        )}

        {s && (
          <>
            <div className="aff-block">
              <h3>{t('admin.ins.affFunnel')}</h3>
              <p className="ins-sub">{t('admin.ins.affFunnelSub', { range })}</p>
              <FunnelShape
                label={t('admin.ins.affFunnel')}
                height={280}
                steps={[
                  { label: t('admin.ins.affClicks'), value: s.funnel.clicks },
                  { label: t('admin.ins.affSignups'), value: s.funnel.signups },
                  { label: t('admin.ins.affVerified'), value: s.funnel.verified },
                  { label: t('admin.ins.affActive'), value: s.funnel.active },
                  { label: t('admin.ins.affSubscribers'), value: s.funnel.subscribers },
                ]}
              />
            </div>

            <div className="aff-row three">
              <div className="aff-block">
                <h3>{t('admin.ins.affRoi')}</h3>
                <Gauge
                  value={ratio}
                  max={100}
                  color={ratio !== null && ratio > 50 ? STATUS_COLOR.critical : SERIES.blue}
                  label={t('admin.ins.affRoi')}
                  caption={
                    perRupiah === null
                      ? t('admin.ins.affRoiEmpty')
                      : t('admin.ins.affRoiCaption', { amount: perRupiah })
                  }
                />
              </div>
              <div className="aff-block">
                <h3>{t('admin.ins.affMoney')}</h3>
                <Donut
                  label={t('admin.ins.affMoney')}
                  format={rupiahShort}
                  center={rupiahShort((a?.available ?? 0) + (a?.pending ?? 0) + (a?.paid ?? 0))}
                  caption={t('admin.ins.nowLabel')}
                  segments={[
                    {
                      label: t('admin.ins.affAvailable'),
                      value: a?.available ?? 0,
                      color: SERIES.blue,
                    },
                    {
                      label: t('admin.ins.affPending'),
                      value: a?.pending ?? 0,
                      color: SERIES.orange,
                    },
                    { label: t('admin.ins.affPaidOut'), value: a?.paid ?? 0, color: SERIES.aqua },
                  ]}
                />
              </div>
              <div className="aff-block">
                <h3>{t('admin.ins.affGrowth')}</h3>
                <LineChart
                  label={t('admin.ins.affGrowth')}
                  height={220}
                  series={[
                    {
                      key: 'signups',
                      label: t('admin.ins.affSignups'),
                      color: SERIES.blue,
                      values: s.months.map((m) => m.signups),
                    },
                    {
                      key: 'subscribers',
                      label: t('admin.ins.affSubscribers'),
                      color: SERIES.orange,
                      values: s.months.map((m) => m.subscribers),
                    },
                  ]}
                  tick={tick}
                  title={title}
                />
              </div>
            </div>

            <div className="aff-block">
              <h3>{t('admin.ins.affTrend')}</h3>
              <p className="ins-sub">
                {t('admin.ins.affTrendSub', {
                  month: monthName(s.months[s.months.length - 1]!.month, 'long'),
                })}
              </p>
              <AreaChart
                label={t('admin.ins.affTrend')}
                series={[
                  {
                    key: 'commission',
                    label: t('admin.ins.affCommission'),
                    color: SERIES.blue,
                    values: s.months.map((m) => m.commission),
                  },
                  {
                    key: 'bonus',
                    label: t('admin.ins.affBonus'),
                    color: SERIES.orange,
                    values: s.months.map((m) => m.bonus),
                  },
                ]}
                tick={tick}
                title={title}
                format={formatRupiah}
                axisFormat={rupiahAxis}
              />
            </div>

            <div className="aff-block">
              <h3>{t('admin.ins.affRevVsCost')}</h3>
              <p className="ins-sub">{t('admin.ins.affRevVsCostSub')}</p>
              <LineChart
                label={t('admin.ins.affRevVsCost')}
                series={[
                  {
                    key: 'revenue',
                    label: t('admin.ins.affRevenue'),
                    color: SERIES.aqua,
                    values: s.months.map((m) => m.revenue),
                  },
                  {
                    key: 'cost',
                    label: t('admin.ins.affCost'),
                    color: SERIES.orange,
                    values: s.months.map((m) => m.commission + m.bonus),
                  },
                ]}
                tick={tick}
                title={title}
                format={formatRupiah}
                axisFormat={rupiahAxis}
              />
              <ChartTable
                head={[
                  t('admin.ins.colMonth'),
                  t('admin.ins.affSignups'),
                  t('admin.ins.affSubscribers'),
                  t('admin.ins.affRevenue'),
                  t('admin.ins.affCommission'),
                  t('admin.ins.affBonus'),
                  t('admin.ins.affPaidOut'),
                ]}
                rows={s.months.map((m) => [
                  monthName(m.month, 'long'),
                  m.signups,
                  m.subscribers,
                  formatRupiah(m.revenue),
                  formatRupiah(m.commission),
                  formatRupiah(m.bonus),
                  formatRupiah(m.paid),
                ])}
              />
            </div>

            <div className="aff-block">
              <h3>{t('admin.ins.affTop')}</h3>
              <p className="ins-sub">{t('admin.ins.affTopSub', { range })}</p>
              <Treemap
                label={t('admin.ins.affTop')}
                format={rupiahShort}
                items={s.top.map((x) => ({
                  label: x.name,
                  value: x.earned,
                  sub: t('admin.ins.affTopDetail', { members: x.members, subs: x.subscribers }),
                }))}
              />
              <ChartTable
                head={[
                  t('admin.ins.affColName'),
                  t('admin.ins.affColMembers'),
                  t('admin.ins.affSubscribers'),
                  t('admin.ins.affColEarned'),
                ]}
                rows={s.top.map((x) => [x.name, x.members, x.subscribers, formatRupiah(x.earned)])}
              />
            </div>
          </>
        )}
      </Panel>
    </section>
  );
}

/** Simpul & aliran uang: pemasukan → pengeluaran / laba bersih → komisi tiap owner / sisa perusahaan. */
export function commissionFlow(
  income: number,
  expense: number,
  shares: { ownerName: string; amount: number }[],
): { nodes: SankeyNode[]; links: SankeyLink[]; retained: number; commission: number } {
  const net = income - expense;
  const commission = shares.reduce((a, x) => a + x.amount, 0);
  const retained = Math.max(0, net - commission);
  // Kolom kanan: afiliator (oranye, toska, kuning — urutan lolos uji buta warna) lalu "ditahan" (biru).
  const ownerColors = [SERIES.orange, SERIES.aqua, SERIES.yellow];
  const nodes: SankeyNode[] = [
    { id: 'in', label: t('admin.ins.income'), color: SERIES.aqua, column: 0 },
    { id: 'out', label: t('admin.ins.expense'), color: STATUS_COLOR.muted, column: 1 },
    { id: 'net', label: t('admin.ins.net'), color: STATUS_COLOR.good, column: 1 },
    ...shares.map((x, i) => ({
      id: `o${i}`,
      label: x.ownerName,
      color: ownerColors[i % ownerColors.length]!,
      column: 2,
    })),
    { id: 'keep', label: t('admin.ins.comRetained'), color: SERIES.blue, column: 2 },
  ];
  const links: SankeyLink[] = [
    { from: 'in', to: 'out', value: Math.min(expense, income) },
    { from: 'in', to: 'net', value: Math.max(0, net) },
    ...shares.map((x, i) => ({ from: 'net', to: `o${i}`, value: x.amount })),
    { from: 'net', to: 'keep', value: retained },
  ];
  return { nodes, links, retained, commission };
}

/**
 * Section Komisi owner (D-036, D-100): aliran uang (Sankey) bulan/tahun terpilih, tren laba vs komisi setahun,
 * porsi tiap owner, dan status bayar per bulan.
 */
export function CommissionSection({ sel, period }: { sel: PeriodSel; period: Period | null }) {
  const today = jakartaToday();
  const month = commissionMonth(sel, period, today);
  const year = sel.kind === 'days' ? Number(month.slice(0, 4)) : sel.year;
  const monthly = useFetch<Commission>('staff', `/admin/finance/commission?month=${month}`);
  const yearly = useFetch<CommissionYear>('staff', `/admin/finance/commission-year?year=${year}`);
  const c = monthly.data;
  const y = yearly.data;
  if (!c && !y) return null;

  const isYear = sel.kind === 'year';
  // Mode tahun: jumlahkan 12 bulan (komisi dihitung per bulan, bulan rugi = 0).
  const agg =
    isYear && y
      ? (() => {
          const byOwner = new Map<string, { ownerName: string; amount: number }>();
          for (const m of y.months)
            for (const x of m.shares) {
              const k = x.ownerId ?? x.ownerName;
              const cur = byOwner.get(k) ?? { ownerName: x.ownerName, amount: 0 };
              cur.amount += x.amount;
              byOwner.set(k, cur);
            }
          return {
            income: y.months.reduce((a, m) => a + m.income, 0),
            expense: y.months.reduce((a, m) => a + m.expense, 0),
            shares: [...byOwner.values()],
          };
        })()
      : c
        ? { income: c.summary.income, expense: c.summary.expense, shares: c.shares }
        : null;
  const flow = agg ? commissionFlow(agg.income, agg.expense, agg.shares) : null;
  const net = agg ? agg.income - agg.expense : 0;
  const scope = isYear ? t('admin.ins.yearN', { year }) : monthName(month, 'long');
  const unpaidShares = c?.shares.filter((x) => !x.paidAt && x.amount > 0) ?? [];
  const owners = y
    ? [
        ...new Map(
          y.months.flatMap((m) => m.shares).map((x) => [x.ownerId ?? x.ownerName, x.ownerName]),
        ).entries(),
      ]
    : [];
  const ownerTotals = owners.map(([key, name]) => ({
    key,
    name,
    amount: (y?.months ?? []).reduce(
      (a, m) => a + (m.shares.find((x) => (x.ownerId ?? x.ownerName) === key)?.amount ?? 0),
      0,
    ),
  }));
  // Urutan kategori tetap (biru, oranye, toska, kuning) — tervalidasi buta warna untuk segmen bersebelahan.
  const ownerColors = [SERIES.blue, SERIES.orange, SERIES.aqua, SERIES.yellow];
  const months = y?.months ?? [];
  // Tren hanya s.d. bulan berjalan: bulan yang belum terjadi bukan "nol".
  const past = months.filter((m) => !m.future);
  const mtick = (i: number) => monthName(past[i]!.month, 'short');
  const mtitle = (i: number) => monthName(past[i]!.month, 'long');

  return (
    <section className="aff-section" aria-labelledby="com-title">
      <SectionTitle sub={t('admin.ins.comLead', { scope })}>
        <span id="com-title">{t('admin.ins.comTitle')}</span>
      </SectionTitle>
      <Panel
        title={t('admin.ins.comPanel', { scope })}
        sub={t('admin.ins.comHint')}
        action={<Link to="/admin/komisi">{t('admin.ins.manage')}</Link>}
        className="is-chart is-wide"
      >
        {agg && flow && (
          <Stats
            items={[
              { label: t('admin.ins.income'), value: formatRupiah(agg.income) },
              { label: t('admin.ins.expense'), value: formatRupiah(agg.expense) },
              { label: t('admin.ins.net'), value: formatRupiah(net) },
              {
                label: t('admin.ins.comTotal'),
                value: formatRupiah(flow.commission),
                hint:
                  net > 0
                    ? t('admin.ins.comShareOfNet', {
                        pct: Math.round((flow.commission / net) * 100),
                      })
                    : undefined,
              },
              { label: t('admin.ins.comRetained'), value: formatRupiah(flow.retained) },
            ]}
          />
        )}
        {!isYear && c && (
          <div className="aff-ov-status">
            <Badge tone={c.closed ? 'success' : 'info'}>
              {c.closed ? t('admin.ins.comClosed') : t('admin.ins.comOpen')}
            </Badge>
            {unpaidShares.length > 0 && (
              <Badge tone="warning">{t('admin.ins.comUnpaid', { n: unpaidShares.length })}</Badge>
            )}
          </div>
        )}

        {flow && (
          <div className="aff-block">
            <h3>{t('admin.ins.comFlow', { scope })}</h3>
            <p className="ins-sub">
              {net <= 0 ? t('admin.ins.comFlowLoss') : t('admin.ins.comFlowSub')}
            </p>
            <Sankey
              label={t('admin.ins.comFlow', { scope })}
              nodes={flow.nodes}
              links={flow.links}
              format={rupiahShort}
              height={300}
            />
          </div>
        )}

        {y && (
          <>
            <div className="aff-row three">
              <div className="aff-block span-2">
                <h3>{t('admin.ins.comTrend', { year })}</h3>
                <LineChart
                  label={t('admin.ins.comTrend', { year })}
                  height={260}
                  series={[
                    {
                      key: 'net',
                      label: t('admin.ins.net'),
                      color: SERIES.aqua,
                      values: past.map((m) => Math.max(0, m.net)),
                    },
                    {
                      key: 'commission',
                      label: t('admin.ins.comTotal'),
                      color: SERIES.blue,
                      values: past.map((m) => m.shares.reduce((a, x) => a + x.amount, 0)),
                    },
                  ]}
                  tick={mtick}
                  title={mtitle}
                  format={formatRupiah}
                  axisFormat={rupiahAxis}
                />
              </div>
              <div className="aff-block">
                <h3>{t('admin.ins.comOwners', { year })}</h3>
                {ownerTotals.length === 0 ? (
                  <Empty>{t('admin.ins.comEmpty')}</Empty>
                ) : (
                  <Donut
                    label={t('admin.ins.comOwners', { year })}
                    format={rupiahShort}
                    center={rupiahShort(ownerTotals.reduce((a, o) => a + o.amount, 0))}
                    caption={t('admin.ins.comTotal')}
                    segments={ownerTotals.map((o, i) => ({
                      label: o.name,
                      value: o.amount,
                      color: ownerColors[i % ownerColors.length]!,
                    }))}
                  />
                )}
              </div>
            </div>

            <div className="aff-block">
              <h3>{t('admin.ins.comGrid', { year })}</h3>
              <p className="ins-sub">{t('admin.ins.comGridSub')}</p>
              {ownerTotals.length === 0 ? (
                <Empty>{t('admin.ins.comEmpty')}</Empty>
              ) : (
                <div className="com-grid-wrap">
                  <table className="com-grid" aria-label={t('admin.ins.comGrid', { year })}>
                    <thead>
                      <tr>
                        <th>{t('admin.ins.comOwner')}</th>
                        {months.map((m) => (
                          <th key={m.month} className={m.month === month ? 'is-current' : ''}>
                            {monthName(m.month, 'short')}
                          </th>
                        ))}
                        <th>{t('admin.ins.total')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ownerTotals.map((o) => (
                        <tr key={o.key}>
                          <th>{o.name}</th>
                          {months.map((m) => {
                            const x = m.shares.find((z) => (z.ownerId ?? z.ownerName) === o.key);
                            const state = m.future
                              ? 'future'
                              : !x || x.amount === 0
                                ? 'none'
                                : x.paidAt
                                  ? 'paid'
                                  : m.closed
                                    ? 'unpaid'
                                    : 'open';
                            return (
                              <td key={m.month} className={`is-${state}`}>
                                <span className="com-cell-amount">
                                  {state === 'future' ? '' : rupiahShort(x?.amount ?? 0)}
                                </span>
                                <span className="com-cell-state">
                                  {state === 'future' || state === 'none'
                                    ? ''
                                    : t(`admin.ins.comState.${state}`)}
                                </span>
                              </td>
                            );
                          })}
                          <td className="com-grid-total">{rupiahShort(o.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {!isYear && c && c.shares.length > 0 && (
          <div className="aff-block">
            <h3>{t('admin.ins.comShares', { scope })}</h3>
            <ul className="aff-ov-shares">
              {c.shares.map((x) => (
                <li key={x.ownerId ?? x.ownerName}>
                  <div>
                    <strong>{x.ownerName}</strong>
                    <small>{formatPercentBp(x.percentBp)}</small>
                  </div>
                  <span className="ins-amount">{formatRupiah(x.amount)}</span>
                  <Badge tone={x.paidAt ? 'success' : 'muted'}>
                    {x.paidAt ? t('admin.ins.comPaid') : t('admin.ins.comNotPaid')}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </section>
  );
}
