import { useState, type FormEvent, type ReactNode } from 'react';
import {
  commissionFor,
  formatPercentBp,
  formatRupiah,
  type AffiliateSettings,
} from '@little-coder/engine';
import { useLocation } from 'react-router-dom';
import { useApiCall, useFetch } from '../../auth/useApi';
import { t, type MessageKey } from '../../i18n';
import { ShellIconSvg, type ShellIcon } from '../../ui/AppShell';
import { CountUp, DayBars, Kpi, Meter } from '../../ui/charts';
import { Badge, Button, Checkbox, PageHeader, Table, TextField, formatDate } from '../../ui/ui';
import { ActionNotice, Loadable, useAction } from '../common';

type Flag = 'shared_account' | 'same_ip_referee' | 'name_mismatch' | 'ip_cluster';
type Overview = {
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
type Analytics = {
  months: {
    month: string;
    signups: number;
    subscribers: number;
    commission: number;
    bonus: number;
    paid: number;
  }[];
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
  top: {
    id: string;
    name: string;
    code: string | null;
    members: number;
    subscribers: number;
    earned: number;
  }[];
};
type PayoutRow = {
  id: string;
  number: string;
  parentId: string;
  name: string;
  email: string;
  amount: number;
  providerName: string;
  kind: string;
  last4: string;
  holderName: string;
  status: 'requested' | 'paid' | 'rejected' | 'cancelled';
  note: string | null;
  transferRef: string | null;
  requestedAt: string;
  paidAt: string | null;
  flags: Flag[];
};
type AccountRow = {
  parentId: string;
  name: string;
  email: string;
  providerName: string;
  kind: string;
  last4: string;
  holderName: string;
  nameMatch: boolean;
  status: 'pending' | 'verified' | 'rejected';
  reviewNote: string | null;
  changedAt: string;
  flags: Flag[];
};
type AffiliateRow = {
  id: string;
  name: string;
  email: string;
  code: string | null;
  members: number;
  subscribers: number;
  available: number;
  pending: number;
  earned: number;
  flags: Flag[];
};
type LedgerRow = {
  id: string;
  type: string;
  state: 'pending' | 'available' | 'void';
  amount: number;
  note: string | null;
  createdAt: string;
  member: string | null;
};
type Detail = {
  id: string;
  name: string;
  email: string;
  code: string | null;
  balance: { available: number; pending: number; earned: number; paid: number };
  counts: { clicks: number; signups: number; active: number; subscribers: number };
  ledger: LedgerRow[];
  flags: Flag[];
};

const k = (s: string) => s as MessageKey;
const rp = (n: number) => formatRupiah(n);
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const monthLabel = (m: string) => MONTHS[Number(m.slice(5, 7)) - 1] ?? m;

type Tab = 'overview' | 'payouts' | 'accounts' | 'affiliates' | 'settings';
const TABS: { id: Tab; icon: ShellIcon }[] = [
  { id: 'overview', icon: 'chart' },
  { id: 'payouts', icon: 'wallet' },
  { id: 'accounts', icon: 'bank' },
  { id: 'affiliates', icon: 'users' },
  { id: 'settings', icon: 'gear' },
];

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

const Flags = ({ flags }: { flags: Flag[] }) =>
  flags.length === 0 ? null : (
    <ul className="aa-flags" aria-label={t('admin.aff.flagsLabel')}>
      {flags.map((f) => (
        <li key={f}>{t(k(`admin.aff.flag.${f}`))}</li>
      ))}
    </ul>
  );

/** Admin afiliasi (D-063): ringkasan & insight, antrean pencairan, verifikasi rekening, afiliator, pengaturan. */
export function AffiliateAdminPage() {
  // `?tab=payouts` dari dasbor admin langsung membuka antrean yang dimaksud.
  const asked = new URLSearchParams(useLocation().search).get('tab');
  const [tab, setTab] = useState<Tab>(
    TABS.some((x) => x.id === asked) ? (asked as Tab) : 'overview',
  );
  const o = useFetch<Overview>('staff', '/admin/affiliate');
  const badge: Partial<Record<Tab, number>> = {
    payouts: o.data?.payoutRequests ?? 0,
    accounts: o.data?.accountsPending ?? 0,
  };
  return (
    <div className="aa">
      <PageHeader title={t('admin.aff.title')} subtitle={t('admin.aff.subtitle')} />
      <nav className="aa-tabs" role="tablist" aria-label={t('admin.aff.title')}>
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            className={`aa-tab${tab === x.id ? ' is-on' : ''}`}
            onClick={() => setTab(x.id)}
          >
            <ShellIconSvg name={x.icon} />
            <span>{t(k(`admin.aff.tab.${x.id}`))}</span>
            {(badge[x.id] ?? 0) > 0 && <b className="aa-badge">{badge[x.id]}</b>}
          </button>
        ))}
      </nav>
      {tab === 'overview' && <OverviewTab overview={o.data} go={setTab} />}
      {tab === 'payouts' && <PayoutsTab onChange={o.reload} />}
      {tab === 'accounts' && <AccountsTab onChange={o.reload} />}
      {tab === 'affiliates' && <AffiliatesTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

// ---------------------------------------------------------------- ringkasan & insight

function OverviewTab({ overview: o, go }: { overview?: Overview; go: (t: Tab) => void }) {
  const a = useFetch<Analytics>('staff', '/admin/affiliate/analytics');
  return (
    <Loadable loading={a.loading || !o} error={a.error} hasData={!!a.data && !!o}>
      {() => {
        const d = a.data!;
        const ov = o!;
        const ratio = pct(d.cost, d.revenue.total);
        const last = d.months.at(-1)!;
        const prev = d.months.at(-2)!;
        const costNow = last.commission + last.bonus;
        const costPrev = prev.commission + prev.bonus;
        const notes: {
          tone: 'grape' | 'leaf' | 'sun' | 'sky' | 'coral';
          icon: ShellIcon;
          text: string;
          tab?: Tab;
        }[] = [];
        if (ov.payoutRequests > 0)
          notes.push({
            tone: 'sun',
            icon: 'wallet',
            text: t('admin.aff.note.payouts', {
              n: ov.payoutRequests,
              amount: rp(ov.payoutRequestedAmount),
            }),
            tab: 'payouts',
          });
        if (ov.accountsPending > 0)
          notes.push({
            tone: 'sky',
            icon: 'bank',
            text: t('admin.aff.note.accounts', { n: ov.accountsPending }),
            tab: 'accounts',
          });
        if (d.flaggedAccounts > 0)
          notes.push({
            tone: 'coral',
            icon: 'flag',
            text: t('admin.aff.note.flags', { n: d.flaggedAccounts }),
            tab: 'accounts',
          });
        if (d.revenue.total > 0)
          notes.push({
            tone: ratio > 40 ? 'coral' : 'leaf',
            icon: 'percent',
            text: t(ratio > 40 ? 'admin.aff.note.costHigh' : 'admin.aff.note.cost', { pct: ratio }),
            tab: ratio > 40 ? 'settings' : undefined,
          });
        if (d.funnel.signups > 0)
          notes.push({
            tone: 'grape',
            icon: 'users',
            text: t('admin.aff.note.conversion', {
              pct: pct(d.funnel.subscribers, d.funnel.signups),
              n: d.funnel.subscribers,
              of: d.funnel.signups,
            }),
          });
        if (notes.length === 0)
          notes.push({ tone: 'grape', icon: 'chart', text: t('admin.aff.note.empty') });

        const steps = [
          { key: 'clicks', value: d.funnel.clicks, tone: 'sky' },
          { key: 'signups', value: d.funnel.signups, tone: 'grape' },
          { key: 'verified', value: d.funnel.verified, tone: 'grape' },
          { key: 'active', value: d.funnel.active, tone: 'sun' },
          { key: 'subscribers', value: d.funnel.subscribers, tone: 'leaf' },
        ] as const;
        const funnelMax = Math.max(1, ...steps.map((s) => s.value));
        return (
          <>
            <div className="ins-kpis">
              <Kpi
                i={0}
                tone="sun"
                icon={<ShellIconSvg name="wallet" />}
                label={t('admin.aff.kpi.requests')}
                value={<CountUp value={ov.payoutRequests} />}
                hint={rp(ov.payoutRequestedAmount)}
              />
              <Kpi
                i={1}
                tone="leaf"
                icon={<ShellIconSvg name="chart" />}
                label={t('admin.aff.kpi.revenueMonth')}
                value={<CountUp value={d.revenue.month} format={rp} />}
                hint={t('admin.aff.kpi.revenueTotal', { amount: rp(d.revenue.total) })}
              />
              <Kpi
                i={2}
                tone="coral"
                icon={<ShellIconSvg name="percent" />}
                label={t('admin.aff.kpi.costMonth')}
                value={<CountUp value={costNow} format={rp} />}
                hint={
                  costPrev > 0
                    ? t(costNow >= costPrev ? 'admin.aff.kpi.up' : 'admin.aff.kpi.down', {
                        pct: Math.abs(pct(costNow - costPrev, costPrev)),
                      })
                    : t('admin.aff.kpi.noPrev')
                }
              />
              <Kpi
                i={3}
                tone="grape"
                icon={<ShellIconSvg name="tag" />}
                label={t('admin.aff.kpi.outstanding')}
                value={<CountUp value={ov.available} format={rp} />}
                hint={t('admin.aff.kpi.pending', { amount: rp(ov.pending) })}
              />
              <Kpi
                i={4}
                tone="sky"
                icon={<ShellIconSvg name="receipt" />}
                label={t('admin.aff.kpi.paid')}
                value={<CountUp value={ov.paid} format={rp} />}
                hint={t('admin.aff.kpi.ratio', { pct: ratio })}
              />
              <Kpi
                i={5}
                tone="grape"
                icon={<ShellIconSvg name="users" />}
                label={t('admin.aff.kpi.referred')}
                value={<CountUp value={ov.referred} />}
                hint={t('admin.aff.kpi.affiliates', { n: ov.affiliates })}
              />
            </div>

            <section className="ins-notes pd-rise" aria-label={t('admin.aff.notes')}>
              {notes.map((n) => (
                <div key={n.text} className={`pd-insight tone-${n.tone}`}>
                  <span className="pd-insight-icon" aria-hidden>
                    <ShellIconSvg name={n.icon} />
                  </span>
                  <p>
                    {n.tab ? (
                      <button type="button" className="aa-link" onClick={() => go(n.tab!)}>
                        {n.text}
                      </button>
                    ) : (
                      n.text
                    )}
                  </p>
                </div>
              ))}
            </section>

            <div className="ins-grid">
              <Panel title={t('admin.aff.chart.cost')}>
                <DayBars
                  data={d.months.map((m) => ({ date: m.month, value: m.commission + m.bonus }))}
                  label={t('admin.aff.chart.cost')}
                  format={rp}
                  dayLabel={monthLabel}
                />
                <p className="ins-foot">{t('admin.aff.chart.costFoot', { total: rp(d.cost) })}</p>
              </Panel>
              <Panel title={t('admin.aff.chart.members')}>
                <DayBars
                  data={d.months.map((m) => ({ date: m.month, value: m.signups }))}
                  label={t('admin.aff.chart.members')}
                  dayLabel={monthLabel}
                />
                <p className="ins-foot">
                  {t('admin.aff.chart.membersFoot', {
                    n: d.months.reduce((s, m) => s + m.signups, 0),
                    subs: d.months.reduce((s, m) => s + m.subscribers, 0),
                  })}
                </p>
              </Panel>
            </div>

            <div className="ins-grid">
              <Panel title={t('admin.aff.funnelTitle')}>
                <ol className="aa-funnel">
                  {steps.map((s, i) => (
                    <li key={s.key}>
                      <span>{t(k(`admin.aff.funnel.${s.key}`))}</span>
                      <strong>{s.value.toLocaleString('id-ID')}</strong>
                      {i > 0 && (
                        <small>
                          {t('admin.aff.funnel.of', { pct: pct(s.value, steps[i - 1]!.value) })}
                        </small>
                      )}
                      <Meter value={s.value} max={funnelMax} tone={s.tone} />
                    </li>
                  ))}
                </ol>
              </Panel>
              <Panel
                title={t('admin.aff.topTitle')}
                action={
                  <button type="button" className="aa-link" onClick={() => go('affiliates')}>
                    {t('admin.aff.seeAll')}
                  </button>
                }
              >
                {d.top.length === 0 ? (
                  <p className="ins-foot">{t('admin.aff.topEmpty')}</p>
                ) : (
                  <ol className="ins-rank">
                    {d.top.map((r) => (
                      <li key={r.id}>
                        <span>
                          {r.name} <span className="pa-mono aa-code">{r.code ?? '-'}</span>
                        </span>
                        <strong>{rp(r.earned)}</strong>
                        <small>
                          {t('admin.aff.topMeta', { members: r.members, subs: r.subscribers })}
                        </small>
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>
            </div>
          </>
        );
      }}
    </Loadable>
  );
}

// ---------------------------------------------------------------- pencairan

const PAYOUT_STATUSES = ['requested', 'paid', 'rejected', 'cancelled', ''] as const;

function Chips<T extends string>({
  value,
  options,
  onChange,
  label,
  prefix,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  label: string;
  prefix: string;
}) {
  return (
    <div className="aa-chips" role="group" aria-label={label}>
      {options.map((s) => (
        <button
          key={s || 'all'}
          type="button"
          aria-pressed={value === s}
          className={`ins-chip${value === s ? ' is-on' : ''}`}
          onClick={() => onChange(s)}
        >
          {t(k(`${prefix}.${s || 'all'}`))}
        </button>
      ))}
    </div>
  );
}

function PayoutsTab({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState<(typeof PAYOUT_STATUSES)[number]>('requested');
  const list = useFetch<PayoutRow[]>(
    'staff',
    `/admin/affiliate/payouts${status ? `?status=${status}` : ''}`,
  );
  const call = useApiCall('staff');
  const action = useAction();
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const total = (list.data ?? []).reduce((s, r) => s + r.amount, 0);

  const done = () => {
    list.reload();
    onChange();
  };
  const reveal = async (id: string) => {
    const r = await action.run(() =>
      call<{ accountNumber: string }>(`/admin/affiliate/payouts/${id}/account`),
    );
    if (r) setRevealed((m) => ({ ...m, [id]: r.accountNumber }));
  };
  const paid = async (row: PayoutRow) => {
    const ref = window.prompt(t('admin.aff.transferRefPrompt', { number: row.number }), '');
    if (ref === null) return;
    if (
      await action.run(
        () =>
          call(`/admin/affiliate/payouts/${row.id}/paid`, {
            body: { transferRef: ref.trim() || null },
          }),
        t('admin.aff.paidDone'),
      )
    )
      done();
  };
  const reject = async (row: PayoutRow) => {
    const reason = window.prompt(t('admin.aff.rejectPrompt'), '');
    if (!reason || reason.trim().length < 3) return;
    if (
      await action.run(
        () =>
          call(`/admin/affiliate/payouts/${row.id}/reject`, { body: { reason: reason.trim() } }),
        t('admin.aff.rejectDone'),
      )
    )
      done();
  };

  return (
    <Panel
      title={t('admin.aff.payoutsTitle')}
      action={
        <Chips
          value={status}
          options={PAYOUT_STATUSES}
          onChange={setStatus}
          label={t('admin.aff.filter')}
          prefix="admin.aff.payoutStatus"
        />
      }
    >
      <p className="ins-foot">{t('admin.aff.payoutsHint')}</p>
      <ActionNotice error={action.error} done={action.done} />
      <Loadable loading={list.loading} error={list.error} hasData={!!list.data}>
        {() =>
          list.data!.length === 0 ? (
            <p className="aa-empty">{t('admin.aff.payoutsEmpty')}</p>
          ) : (
            <>
              <p className="aa-sum">
                {t('admin.aff.payoutsSum', { n: list.data!.length, amount: rp(total) })}
              </p>
              <ul className="aa-cards">
                {list.data!.map((r) => (
                  <li
                    key={r.id}
                    className={`aa-card is-${r.status}${r.flags.length ? ' is-flagged' : ''}`}
                  >
                    <div className="aa-card-head">
                      <span className="pa-mono">{r.number}</span>
                      <Badge
                        tone={
                          r.status === 'paid'
                            ? 'success'
                            : r.status === 'requested'
                              ? 'warning'
                              : 'muted'
                        }
                      >
                        {t(k(`admin.aff.payoutStatus.${r.status}`))}
                      </Badge>
                    </div>
                    <p className="aa-amount">{rp(r.amount)}</p>
                    <div className="aa-who">
                      <strong>{r.name}</strong>
                      <small>{r.email}</small>
                    </div>
                    <div className="aa-dest">
                      <span>
                        {r.providerName} ·{' '}
                        {revealed[r.id] ? <code>{revealed[r.id]}</code> : `•••• ${r.last4}`}
                      </span>
                      <small>a.n. {r.holderName}</small>
                    </div>
                    <Flags flags={r.flags} />
                    <small className="aa-date">
                      {t('admin.aff.requestedAt', { date: formatDate(r.requestedAt) })}
                      {r.paidAt && ` · ${t('admin.aff.paidAt', { date: formatDate(r.paidAt) })}`}
                    </small>
                    {(r.transferRef || r.note) && (
                      <small className="aa-date">
                        {r.transferRef && `Ref ${r.transferRef}`} {r.note}
                      </small>
                    )}
                    {r.status === 'requested' && (
                      <div className="aa-actions">
                        {!revealed[r.id] && (
                          <Button variant="secondary" onClick={() => void reveal(r.id)}>
                            {t('admin.aff.reveal')}
                          </Button>
                        )}
                        <Button onClick={() => void paid(r)} disabled={action.busy}>
                          {t('admin.aff.markPaid')}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => void reject(r)}
                          disabled={action.busy}
                        >
                          {t('admin.aff.reject')}
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )
        }
      </Loadable>
    </Panel>
  );
}

// ---------------------------------------------------------------- rekening

const ACCOUNT_STATUSES = ['pending', 'verified', 'rejected', ''] as const;

function AccountsTab({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState<(typeof ACCOUNT_STATUSES)[number]>('pending');
  const list = useFetch<AccountRow[]>(
    'staff',
    `/admin/affiliate/accounts${status ? `?status=${status}` : ''}`,
  );
  const call = useApiCall('staff');
  const action = useAction();
  const review = async (row: AccountRow, approved: boolean) => {
    const note = approved ? null : window.prompt(t('admin.aff.accountRejectPrompt'), '');
    if (!approved && !note) return;
    if (
      await action.run(
        () =>
          call(`/admin/affiliate/accounts/${row.parentId}/review`, { body: { approved, note } }),
        approved ? t('admin.aff.accountApproved') : t('admin.aff.accountRejected'),
      )
    ) {
      list.reload();
      onChange();
    }
  };
  return (
    <Panel
      title={t('admin.aff.accountsTitle')}
      action={
        <Chips
          value={status}
          options={ACCOUNT_STATUSES}
          onChange={setStatus}
          label={t('admin.aff.filter')}
          prefix="admin.aff.accountStatus"
        />
      }
    >
      <p className="ins-foot">{t('admin.aff.accountsHint')}</p>
      <ActionNotice error={action.error} done={action.done} />
      <Loadable loading={list.loading} error={list.error} hasData={!!list.data}>
        {() =>
          list.data!.length === 0 ? (
            <p className="aa-empty">{t('admin.aff.accountsEmpty')}</p>
          ) : (
            <ul className="aa-cards">
              {list.data!.map((r) => (
                <li key={r.parentId} className={`aa-card${r.flags.length ? ' is-flagged' : ''}`}>
                  <div className="aa-card-head">
                    <strong>{r.name}</strong>
                    <Badge
                      tone={
                        r.status === 'verified'
                          ? 'success'
                          : r.status === 'pending'
                            ? 'warning'
                            : 'muted'
                      }
                    >
                      {t(k(`admin.aff.accountStatus.${r.status}`))}
                    </Badge>
                  </div>
                  <small className="aa-date">{r.email}</small>
                  <div className="aa-dest">
                    <span>
                      {r.providerName} · •••• {r.last4}
                    </span>
                    <small>
                      a.n. {r.holderName}{' '}
                      <span className={r.nameMatch ? 'aa-ok' : 'aa-warn'}>
                        {r.nameMatch ? t('admin.aff.nameMatches') : t('admin.aff.nameDiffers')}
                      </span>
                    </small>
                  </div>
                  <Flags flags={r.flags} />
                  {r.reviewNote && <small className="aa-date">{r.reviewNote}</small>}
                  <small className="aa-date">
                    {t('admin.aff.changedAt', { date: formatDate(r.changedAt) })}
                  </small>
                  {r.status === 'pending' && (
                    <div className="aa-actions">
                      <Button onClick={() => void review(r, true)} disabled={action.busy}>
                        {t('admin.aff.approve')}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => void review(r, false)}
                        disabled={action.busy}
                      >
                        {t('admin.aff.reject')}
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )
        }
      </Loadable>
    </Panel>
  );
}

// ---------------------------------------------------------------- afiliator

function AffiliatesTab() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string>();
  const list = useFetch<{ items: AffiliateRow[] }>(
    'staff',
    `/admin/affiliate/affiliates${query ? `?q=${encodeURIComponent(query)}` : ''}`,
  );
  return (
    <>
      <Panel title={t('admin.aff.affiliatesTitle')}>
        <form
          className="aa-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q.trim());
          }}
        >
          <TextField
            label={t('admin.aff.search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            {t('admin.aff.searchBtn')}
          </Button>
        </form>
        <Loadable loading={list.loading} error={list.error} hasData={!!list.data}>
          {() => (
            <Table
              rows={list.data!.items}
              rowKey={(r) => r.id}
              empty={t('admin.aff.affiliatesEmpty')}
              columns={[
                {
                  key: 'who',
                  label: t('admin.aff.col.affiliate'),
                  render: (r) => (
                    <div className="aa-who">
                      <strong>
                        {r.name} <span className="pa-mono aa-code">{r.code ?? '-'}</span>
                      </strong>
                      <small>{r.email}</small>
                      <Flags flags={r.flags} />
                    </div>
                  ),
                },
                {
                  key: 'members',
                  label: t('admin.aff.col.members'),
                  render: (r) => `${r.members} / ${r.subscribers}`,
                },
                {
                  key: 'earned',
                  label: t('admin.aff.col.earned'),
                  render: (r) => <strong>{rp(r.earned)}</strong>,
                },
                {
                  key: 'available',
                  label: t('admin.aff.col.available'),
                  render: (r) => rp(r.available),
                },
                { key: 'pending', label: t('admin.aff.col.pending'), render: (r) => rp(r.pending) },
                {
                  key: 'act',
                  label: '',
                  render: (r) => (
                    <Button
                      variant={open === r.id ? 'primary' : 'secondary'}
                      onClick={() => setOpen(open === r.id ? undefined : r.id)}
                    >
                      {open === r.id ? t('admin.aff.close') : t('admin.aff.detail')}
                    </Button>
                  ),
                },
              ]}
            />
          )}
        </Loadable>
      </Panel>
      {open && <AffiliateDetail key={open} id={open} onChange={list.reload} />}
    </>
  );
}

function AffiliateDetail({ id, onChange }: { id: string; onChange: () => void }) {
  const d = useFetch<Detail>('staff', `/admin/affiliate/affiliates/${id}`);
  const call = useApiCall('staff');
  const action = useAction();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const refresh = () => {
    d.reload();
    onChange();
  };
  const adjust = async (e: FormEvent) => {
    e.preventDefault();
    if (
      await action.run(
        () =>
          call(`/admin/affiliate/affiliates/${id}/adjust`, {
            body: { amount: Number(amount), note },
          }),
        t('admin.aff.adjusted'),
      )
    ) {
      setAmount('');
      setNote('');
      refresh();
    }
  };
  const voidEntry = async (entry: LedgerRow) => {
    const reason = window.prompt(t('admin.aff.voidPrompt'), '');
    if (!reason || reason.trim().length < 3) return;
    if (
      await action.run(
        () => call(`/admin/affiliate/ledger/${entry.id}/void`, { body: { note: reason.trim() } }),
        t('admin.aff.voided'),
      )
    )
      refresh();
  };
  return (
    <Loadable loading={d.loading} error={d.error} hasData={!!d.data}>
      {() => {
        const x = d.data!;
        return (
          <Panel
            title={`${x.name} · ${x.code ?? '-'}`}
            action={<small className="ins-foot">{x.email}</small>}
          >
            <Flags flags={x.flags} />
            <div className="ins-kpis aa-mini">
              <Kpi
                i={0}
                tone="leaf"
                icon={<ShellIconSvg name="wallet" />}
                label={t('admin.aff.col.available')}
                value={rp(x.balance.available)}
              />
              <Kpi
                i={1}
                tone="sun"
                icon={<ShellIconSvg name="tag" />}
                label={t('admin.aff.col.pending')}
                value={rp(x.balance.pending)}
              />
              <Kpi
                i={2}
                tone="grape"
                icon={<ShellIconSvg name="chart" />}
                label={t('admin.aff.col.earned')}
                value={rp(x.balance.earned)}
              />
              <Kpi
                i={3}
                tone="sky"
                icon={<ShellIconSvg name="users" />}
                label={t('admin.aff.clicksSignups')}
                value={`${x.counts.clicks} / ${x.counts.signups}`}
                hint={t('admin.aff.topMeta', {
                  members: x.counts.signups,
                  subs: x.counts.subscribers,
                })}
              />
            </div>
            <ActionNotice error={action.error} done={action.done} />
            <form className="aa-adjust" onSubmit={adjust}>
              <TextField
                label={t('admin.aff.adjustAmount')}
                hint={t('admin.aff.adjustHint')}
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <TextField
                label={t('admin.aff.adjustNote')}
                required
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button type="submit" disabled={action.busy || !amount || note.trim().length < 3}>
                {t('admin.aff.adjust')}
              </Button>
            </form>
            <Table
              rows={x.ledger}
              rowKey={(r) => r.id}
              empty={t('admin.aff.ledgerEmpty')}
              columns={[
                {
                  key: 'date',
                  label: t('admin.aff.col.date'),
                  render: (r) => formatDate(r.createdAt),
                },
                {
                  key: 'type',
                  label: t('admin.aff.col.type'),
                  render: (r) => (
                    <>
                      {t(k(`admin.aff.type.${r.type}`))}
                      {r.member && <small className="ui-muted"> · {r.member}</small>}
                      {r.note && <small className="ui-muted"> · {r.note}</small>}
                    </>
                  ),
                },
                {
                  key: 'state',
                  label: t('admin.aff.col.state'),
                  render: (r) => (
                    <Badge
                      tone={
                        r.state === 'available'
                          ? 'success'
                          : r.state === 'pending'
                            ? 'warning'
                            : 'muted'
                      }
                    >
                      {t(k(`admin.aff.state.${r.state}`))}
                    </Badge>
                  ),
                },
                {
                  key: 'amount',
                  label: t('admin.aff.col.amount'),
                  render: (r) => (
                    <strong className={r.amount < 0 ? 'aa-neg' : 'aa-pos'}>{rp(r.amount)}</strong>
                  ),
                },
                {
                  key: 'act',
                  label: '',
                  render: (r) =>
                    r.state === 'pending' &&
                    (r.type === 'signup_bonus' || r.type === 'commission') ? (
                      <Button variant="ghost" onClick={() => void voidEntry(r)}>
                        {t('admin.aff.void')}
                      </Button>
                    ) : null,
                },
              ]}
            />
          </Panel>
        );
      }}
    </Loadable>
  );
}

// ---------------------------------------------------------------- pengaturan

function SettingsTab() {
  const s = useFetch<AffiliateSettings>('staff', '/admin/affiliate/settings');
  return (
    <Loadable loading={s.loading} error={s.error} hasData={!!s.data}>
      {() => <SettingsForm initial={s.data!} />}
    </Loadable>
  );
}

const EXAMPLE_PRICE = 50_000;

function SettingsForm({ initial }: { initial: AffiliateSettings }) {
  const call = useApiCall('staff');
  const action = useAction();
  const [form, setForm] = useState(initial);
  const set = <K extends keyof AffiliateSettings>(key: K, v: AffiliateSettings[K]) =>
    setForm((f) => ({ ...f, [key]: v }));
  const num = (key: keyof AffiliateSettings, min = 0, max?: number) => ({
    type: 'number',
    required: true,
    min,
    max,
    value: String(form[key] as number),
    onChange: (e: { target: { value: string } }) => set(key, Number(e.target.value) as never),
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const out = await action.run(
      () => call<AffiliateSettings>('/admin/affiliate/settings', { method: 'PUT', body: form }),
      t('admin.aff.saved'),
    );
    if (out) setForm(out);
  }

  return (
    <form className="aa-settings" onSubmit={submit}>
      <ActionNotice error={action.error} done={action.done} />
      <Panel title={t('admin.aff.set.program')}>
        <Checkbox
          label={t('admin.aff.enabled')}
          checked={form.enabled}
          onChange={(e) => set('enabled', e.target.checked)}
        />
        <p className="ins-foot">{t('admin.aff.forwardOnly')}</p>
      </Panel>
      <div className="ins-grid">
        <Panel title={t('admin.aff.set.reward')}>
          <TextField
            label={t('admin.aff.signupBonus')}
            hint={t('admin.aff.signupBonusHint')}
            {...num('signupBonus')}
          />
          <TextField
            label={t('admin.aff.commission')}
            hint={t('admin.aff.commissionHint', { now: formatPercentBp(form.commissionBp) })}
            type="number"
            required
            min={0}
            max={90}
            step={0.01}
            value={String(form.commissionBp / 100)}
            onChange={(e) => set('commissionBp', Math.round(Number(e.target.value) * 100))}
          />
          <div className="aa-example" aria-live="polite">
            {t('admin.aff.example', {
              price: rp(EXAMPLE_PRICE),
              commission: rp(commissionFor(EXAMPLE_PRICE, form.commissionBp)),
              percent: formatPercentBp(form.commissionBp),
            })}
          </div>
        </Panel>
        <Panel title={t('admin.aff.set.qualify')}>
          <TextField
            label={t('admin.aff.qualifyRounds')}
            hint={t('admin.aff.qualifyRoundsHint')}
            {...num('qualifyRounds', 1)}
          />
          <TextField
            label={t('admin.aff.qualifyDays')}
            hint={t('admin.aff.qualifyDaysHint')}
            {...num('qualifyDays', 1)}
          />
          <TextField
            label={t('admin.aff.monthlyBonusCap')}
            hint={t('admin.aff.monthlyBonusCapHint')}
            {...num('monthlyBonusCap')}
          />
        </Panel>
        <Panel title={t('admin.aff.set.payout')}>
          <TextField
            label={t('admin.aff.minPayout')}
            hint={t('admin.aff.minPayoutHint')}
            {...num('minPayout', 1000)}
          />
          <TextField
            label={t('admin.aff.holdDays')}
            hint={t('admin.aff.holdDaysHint')}
            {...num('holdDays')}
          />
        </Panel>
        <Panel title={t('admin.aff.set.security')}>
          <TextField
            label={t('admin.aff.cooldown')}
            hint={t('admin.aff.cooldownHint')}
            {...num('accountCooldownDays')}
          />
          <div>
            <p className="aa-label">{t('admin.aff.providers')}</p>
            <ul className="aa-providers">
              {form.providers.map((p) => (
                <li key={p.id}>
                  {p.name} <small>{t(k(`admin.aff.kind.${p.kind}`))}</small>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>
      <div className="aa-save">
        <Button type="submit" disabled={action.busy}>
          {t('admin.save')}
        </Button>
      </div>
    </form>
  );
}
