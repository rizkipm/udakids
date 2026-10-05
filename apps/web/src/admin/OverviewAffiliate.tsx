import { Link } from 'react-router-dom';
import { formatPercentBp, formatRupiah } from '@little-coder/engine';
import { useFetch } from '../auth/useApi';
import { t, type MessageKey } from '../i18n';
import { ShellIconSvg, type ShellIcon } from '../ui/AppShell';
import { DayBars, Meter } from '../ui/charts';
import { Badge, Empty } from '../ui/ui';
import type { Commission } from './billing/types';

/** GET /admin/affiliate (ringkasan saldo & antrean). */
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
/** GET /admin/affiliate/analytics (12 bulan, corong, pendapatan anggota referal). */
type AffiliateAnalytics = {
  months: { month: string; commission: number; bonus: number; paid: number }[];
  funnel: {
    clicks: number;
    signups: number;
    verified: number;
    active: number;
    subscribers: number;
  };
  revenue: { total: number; month: number };
  cost: number;
  flaggedAccounts: number;
};

const thisMonth = () => new Date().toISOString().slice(0, 7);
const monthLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('id-ID', { month: 'short', timeZone: 'UTC' });

const FUNNEL: { key: keyof AffiliateAnalytics['funnel']; label: MessageKey; tone: string }[] = [
  { key: 'clicks', label: 'admin.ins.affClicks', tone: 'sky' },
  { key: 'signups', label: 'admin.ins.affSignups', tone: 'grape' },
  { key: 'verified', label: 'admin.ins.affVerified', tone: 'grape' },
  { key: 'active', label: 'admin.ins.affActive', tone: 'leaf' },
  { key: 'subscribers', label: 'admin.ins.affSubscribers', tone: 'sun' },
];

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="aff-ov-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function Todo({ to, icon, text }: { to: string; icon: ShellIcon; text: string }) {
  return (
    <Link to={to} className="aff-ov-todo">
      <ShellIconSvg name={icon} />
      <span>{text}</span>
    </Link>
  );
}

/**
 * Ringkasan afiliasi (D-063) dan komisi owner bulan ini di dasbor admin: angka utama, antrean yang
 * perlu ditindak, corong referal, tren 12 bulan, dan pembagian komisi.
 */
export function AffiliateCommissionOverview() {
  const totals = useFetch<AffiliateTotals>('staff', '/admin/affiliate');
  const stats = useFetch<AffiliateAnalytics>('staff', '/admin/affiliate/analytics');
  const month = thisMonth();
  const commission = useFetch<Commission>('staff', `/admin/finance/commission?month=${month}`);
  const a = totals.data;
  const s = stats.data;
  const c = commission.data;
  if (!a && !s && !c) return null;

  const costRatio = s && s.revenue.total > 0 ? Math.round((s.cost / s.revenue.total) * 100) : null;
  const funnelMax = Math.max(1, ...(s ? FUNNEL.map((f) => s.funnel[f.key]) : [1]));
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
  const unpaidShares = c?.shares.filter((x) => !x.paidAt && x.amount > 0) ?? [];

  return (
    <section className="aff-ov" aria-labelledby="aff-ov-title">
      <div className="aff-ov-head">
        <h2 id="aff-ov-title">{t('admin.ins.affTitle')}</h2>
        <p className="ui-muted">{t('admin.ins.affLead')}</p>
      </div>
      <div className="ins-grid">
        <section className="ins-panel pd-rise">
          <div className="ins-panel-head">
            <h2>{t('admin.ins.affPanel')}</h2>
            <Link to="/admin/afiliasi">{t('admin.ins.manage')}</Link>
          </div>
          {a && (
            <div className="aff-ov-stats">
              <Stat
                label={t('admin.ins.affAffiliates')}
                value={a.affiliates.toLocaleString('id-ID')}
                hint={t('admin.ins.affReferred', { n: a.referred })}
              />
              <Stat
                label={t('admin.ins.affRevenue')}
                value={formatRupiah(s?.revenue.total ?? 0)}
                hint={t('admin.ins.affRevenueMonth', {
                  amount: formatRupiah(s?.revenue.month ?? 0),
                })}
              />
              <Stat
                label={t('admin.ins.affCost')}
                value={formatRupiah(s?.cost ?? 0)}
                hint={
                  costRatio === null
                    ? t('admin.ins.affCostNoRevenue')
                    : t('admin.ins.affCostRatio', { pct: costRatio })
                }
              />
              <Stat
                label={t('admin.ins.affBalance')}
                value={formatRupiah(a.available)}
                hint={t('admin.ins.affBalanceHint', {
                  pending: formatRupiah(a.pending),
                  paid: formatRupiah(a.paid),
                })}
              />
            </div>
          )}
          {todos.length > 0 ? (
            <div className="aff-ov-todos">{todos}</div>
          ) : (
            a && <p className="aff-ov-clear">{t('admin.ins.affNoTodo')}</p>
          )}
          {s && (
            <div className="aff-ov-split">
              <div>
                <h3>{t('admin.ins.affFunnel')}</h3>
                <ul className="ins-bars">
                  {FUNNEL.map((f) => (
                    <li key={f.key}>
                      <span>{t(f.label)}</span>
                      <strong>{s.funnel[f.key].toLocaleString('id-ID')}</strong>
                      <Meter value={s.funnel[f.key]} max={funnelMax} tone={f.tone} />
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>{t('admin.ins.affTrend')}</h3>
                <DayBars
                  height={120}
                  labelEvery={3}
                  data={s.months.map((m) => ({
                    date: `${m.month}-01`,
                    value: m.commission + m.bonus,
                  }))}
                  label={t('admin.ins.affTrend')}
                  format={formatRupiah}
                  dayLabel={monthLabel}
                />
              </div>
            </div>
          )}
        </section>

        <section className="ins-panel pd-rise">
          <div className="ins-panel-head">
            <h2>{t('admin.ins.comPanel', { month: monthLabel(`${month}-01`) })}</h2>
            <Link to="/admin/komisi">{t('admin.ins.manage')}</Link>
          </div>
          {c && (
            <>
              <div className="aff-ov-stats three">
                <Stat label={t('admin.ins.incomeMonth')} value={formatRupiah(c.summary.income)} />
                <Stat label={t('admin.ins.expenseMonth')} value={formatRupiah(c.summary.expense)} />
                <Stat label={t('admin.ins.netMonth')} value={formatRupiah(c.summary.net)} />
              </div>
              <div className="aff-ov-status">
                <Badge tone={c.closed ? 'success' : 'info'}>
                  {c.closed ? t('admin.ins.comClosed') : t('admin.ins.comOpen')}
                </Badge>
                {unpaidShares.length > 0 && (
                  <Badge tone="warning">
                    {t('admin.ins.comUnpaid', { n: unpaidShares.length })}
                  </Badge>
                )}
              </div>
              {c.shares.length === 0 ? (
                <Empty>{t('admin.ins.comEmpty')}</Empty>
              ) : (
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
              )}
              <p className="ins-foot">{t('admin.ins.comHint')}</p>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
