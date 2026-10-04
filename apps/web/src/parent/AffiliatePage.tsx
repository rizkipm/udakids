import { useState, type FormEvent } from 'react';
import {
  formatPercentBp,
  formatRupiah,
  payoutAccountInputSchema,
  type MemberStatus,
  type PayoutProvider,
} from '@little-coder/engine';
import { ApiError, errorMessage } from '../api/client';
import { useApiCall, useFetch } from '../auth/useApi';
import { t, type MessageKey } from '../i18n';
import { ShellIconSvg, type ShellIcon } from '../ui/AppShell';
import { CountUp, DayBars, Kpi, Meter } from '../ui/charts';
import {
  Badge,
  Button,
  Card,
  Notice,
  PageHeader,
  SelectField,
  Spinner,
  TextField,
  formatDate,
} from '../ui/ui';
import { CopyButton } from './billingUi';

type Account = {
  providerId: string;
  providerName: string;
  kind: 'bank' | 'ewallet';
  last4: string;
  holderName: string;
  nameMatch: boolean;
  status: 'pending' | 'verified' | 'rejected';
  reviewNote: string | null;
  changedAt: string;
};
type LedgerItem = {
  id: string;
  type: 'signup_bonus' | 'commission' | 'payout' | 'payout_return' | 'adjustment';
  state: 'pending' | 'available' | 'void';
  amount: number;
  baseAmount: number | null;
  rateBp: number | null;
  availableAt: string | null;
  note: string | null;
  createdAt: string;
  member: string | null;
};
type Overview = {
  enabled: boolean;
  code: string;
  link: string;
  rules: {
    signupBonus: number;
    commissionBp: number;
    minPayout: number;
    holdDays: number;
    qualifyRounds: number;
    qualifyDays: number;
    accountCooldownDays: number;
  };
  providers: PayoutProvider[];
  balance: { available: number; pending: number; earned: number; withdrawn: number; paid: number };
  counts: {
    clicks: number;
    signups: number;
    verified: number;
    active: number;
    subscribers: number;
  };
  account: Account | null;
  openPayout: { id: string; number: string; amount: number; requestedAt: string } | null;
  recent: LedgerItem[];
  upcoming?: {
    commission: { at: string; amount: number } | null;
    bonusWaiting: { count: number; amount: number };
  };
};
type Members = {
  page: number;
  pageSize: number;
  total: number;
  items: {
    name: string;
    joinedAt: string;
    status: MemberStatus;
    paidOrders: number;
    earned: number;
    subMembers: number;
  }[];
};
type Payout = {
  id: string;
  number: string;
  amount: number;
  providerName: string;
  last4: string;
  status: 'requested' | 'paid' | 'rejected' | 'cancelled';
  note: string | null;
  transferRef: string | null;
  requestedAt: string;
  paidAt: string | null;
};

const k = (s: string) => s as MessageKey;
const rp = (n: number) => formatRupiah(n);
type Tab = 'members' | 'analytics' | 'ledger' | 'payout';
const TABS: Tab[] = ['members', 'analytics', 'ledger', 'payout'];

/** Afiliasi orang tua (D-063): kode & link, saldo, anggota, analisis, pencairan. Tidak pernah tampil di area anak. */
export function AffiliatePage() {
  const ov = useFetch<Overview>('parent', '/parent/affiliate');
  const [tab, setTab] = useState<Tab>('members');
  const d = ov.data;

  if (ov.loading && !d) return <Spinner label={t('parent.loading')} />;
  if (ov.error && !d)
    return (
      <Notice tone="error">
        {errorMessage(ov.error)}{' '}
        <Button variant="ghost" onClick={ov.reload}>
          {t('parent.dash.retry')}
        </Button>
      </Notice>
    );
  if (!d) return null;

  const conversion = d.counts.signups
    ? Math.round((d.counts.subscribers / d.counts.signups) * 100)
    : 0;
  const share = t('parent.aff.shareText', { link: d.link, code: d.code });
  const toMin = Math.max(0, d.rules.minPayout - d.balance.available);
  const progress = Math.min(100, Math.round((d.balance.available / d.rules.minPayout) * 100));
  const canWithdraw = d.balance.available >= d.rules.minPayout && !d.openPayout;
  const goPayout = () => {
    setTab('payout');
    document.getElementById('aff-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const insights: {
    tone: 'grape' | 'leaf' | 'sun' | 'sky' | 'coral';
    icon: ShellIcon;
    text: string;
  }[] = [];
  if (d.upcoming?.commission)
    insights.push({
      tone: 'leaf',
      icon: 'wallet',
      text: t('parent.aff.ins.nextRelease', {
        amount: rp(d.upcoming.commission.amount),
        date: formatDate(d.upcoming.commission.at),
      }),
    });
  if (d.upcoming && d.upcoming.bonusWaiting.count > 0)
    insights.push({
      tone: 'sun',
      icon: 'users',
      text: t('parent.aff.ins.bonusWaiting', {
        n: d.upcoming.bonusWaiting.count,
        amount: rp(d.upcoming.bonusWaiting.amount),
        rounds: d.rules.qualifyRounds,
      }),
    });
  if (d.counts.signups > d.counts.verified)
    insights.push({
      tone: 'sky',
      icon: 'mail',
      text: t('parent.aff.ins.unverified', { n: d.counts.signups - d.counts.verified }),
    });
  if (d.counts.clicks > 0 && d.counts.signups === 0)
    insights.push({
      tone: 'grape',
      icon: 'chart',
      text: t('parent.aff.ins.clicksNoSignup', { n: d.counts.clicks }),
    });
  if (d.counts.signups === 0 && d.counts.clicks === 0)
    insights.push({ tone: 'grape', icon: 'flag', text: t('parent.aff.ins.start') });
  if (d.account?.status === 'pending')
    insights.push({ tone: 'sun', icon: 'bank', text: t('parent.aff.ins.accountPending') });
  if (d.account?.status === 'rejected')
    insights.push({ tone: 'coral', icon: 'bank', text: t('parent.aff.ins.accountRejected') });

  const funnel = [
    { key: 'clicks', value: d.counts.clicks, tone: 'sky' },
    { key: 'signups', value: d.counts.signups, tone: 'grape' },
    { key: 'active', value: d.counts.active, tone: 'sun' },
    { key: 'subscribers', value: d.counts.subscribers, tone: 'leaf' },
  ] as const;
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <div className="aff">
      <PageHeader title={t('parent.aff.title')} subtitle={t('parent.aff.subtitle')} />
      {!d.enabled && <Notice tone="warning">{t('parent.aff.disabled')}</Notice>}

      <section className="aff-hero" aria-label={t('parent.aff.heroLabel')}>
        <div className="aff-hero-balance">
          <span className="aff-hero-label">{t('parent.aff.available')}</span>
          <strong className="aff-hero-value">
            <CountUp value={d.balance.available} format={rp} />
          </strong>
          <div className="aff-progress" aria-hidden>
            <span style={{ width: `${progress}%` }} />
          </div>
          <span className="aff-hero-note">
            {d.openPayout
              ? t('parent.aff.openPayout', {
                  number: d.openPayout.number,
                  amount: rp(d.openPayout.amount),
                })
              : toMin > 0
                ? t('parent.aff.toMin', { amount: rp(toMin), min: rp(d.rules.minPayout) })
                : t('parent.aff.readyToWithdraw')}
          </span>
          <Button className="aff-hero-cta" disabled={!canWithdraw} onClick={goPayout}>
            {t('parent.aff.withdrawCta')}
          </Button>
        </div>
        <div className="aff-hero-share">
          <span className="aff-hero-label">{t('parent.aff.codeTitle')}</span>
          <p className="aff-code" aria-label={t('parent.aff.codeLabel')}>
            {d.code}
          </p>
          <code className="aff-link">{d.link}</code>
          <div className="aff-share">
            <CopyButton text={d.link} label={t('parent.aff.copyLink')} />
            <CopyButton text={d.code} label={t('parent.aff.copyCode')} />
            <a
              className="ui-btn ui-btn-primary aff-wa"
              href={`https://wa.me/?text=${encodeURIComponent(share)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('parent.aff.shareWa')}
            </a>
          </div>
          <small className="aff-hero-note">{t('parent.aff.manualHint')}</small>
        </div>
      </section>

      <div className="aff-kpis">
        <Kpi
          i={0}
          tone="sun"
          icon={<ShellIconSvg name="tag" />}
          label={t('parent.aff.pending')}
          value={<CountUp value={d.balance.pending} format={rp} />}
          hint={t('parent.aff.pendingHint')}
        />
        <Kpi
          i={1}
          tone="grape"
          icon={<ShellIconSvg name="chart" />}
          label={t('parent.aff.earned')}
          value={<CountUp value={d.balance.earned} format={rp} />}
          hint={t('parent.aff.earnedHint')}
        />
        <Kpi
          i={2}
          tone="leaf"
          icon={<ShellIconSvg name="receipt" />}
          label={t('parent.aff.paid')}
          value={<CountUp value={d.balance.paid} format={rp} />}
        />
        <Kpi
          i={3}
          tone="sky"
          icon={<ShellIconSvg name="users" />}
          label={t('parent.aff.conversion')}
          value={`${conversion}%`}
          hint={t('parent.aff.conversionHint', { n: d.counts.subscribers, of: d.counts.signups })}
        />
      </div>

      <div className="aff-grid">
        <section className="aff-panel" aria-labelledby="aff-ins-title">
          <h2 id="aff-ins-title">{t('parent.aff.insTitle')}</h2>
          <ul className="aff-insights">
            {insights.map((n) => (
              <li key={n.text} className={`pd-insight tone-${n.tone}`}>
                <span className="pd-insight-icon" aria-hidden>
                  <ShellIconSvg name={n.icon} />
                </span>
                <p>{n.text}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="aff-panel" aria-labelledby="aff-funnel-title">
          <h2 id="aff-funnel-title">{t('parent.aff.funnelTitle')}</h2>
          <ol className="aff-funnel">
            {funnel.map((f) => (
              <li key={f.key}>
                <span>{t(k(`parent.aff.${f.key}`))}</span>
                <strong>{f.value.toLocaleString('id-ID')}</strong>
                <Meter value={f.value} max={funnelMax} tone={f.tone} />
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="aff-panel aff-how" aria-labelledby="aff-how-title">
        <h2 id="aff-how-title">{t('parent.aff.rulesTitle')}</h2>
        <ol className="aff-steps">
          <li>
            <span className="aff-step-icon" aria-hidden>
              <ShellIconSvg name="users" />
            </span>
            <strong>{t('parent.aff.step1', { bonus: rp(d.rules.signupBonus) })}</strong>
            <small>
              {t('parent.aff.step1Hint', {
                rounds: d.rules.qualifyRounds,
                days: d.rules.qualifyDays,
              })}
            </small>
          </li>
          <li>
            <span className="aff-step-icon" aria-hidden>
              <ShellIconSvg name="percent" />
            </span>
            <strong>
              {t('parent.aff.step2', { percent: formatPercentBp(d.rules.commissionBp) })}
            </strong>
            <small>{t('parent.aff.step2Hint', { days: d.rules.holdDays })}</small>
          </li>
          <li>
            <span className="aff-step-icon" aria-hidden>
              <ShellIconSvg name="wallet" />
            </span>
            <strong>{t('parent.aff.step3', { min: rp(d.rules.minPayout) })}</strong>
            <small>{t('parent.aff.step3Hint')}</small>
          </li>
        </ol>
        <p className="ui-muted aff-hint">{t('parent.aff.rule4')}</p>
      </section>

      <div id="aff-tabs" className="aff-tabs" role="tablist" aria-label={t('parent.aff.tabsLabel')}>
        {TABS.map((x) => (
          <button
            key={x}
            type="button"
            role="tab"
            id={`aff-tab-${x}`}
            aria-selected={tab === x}
            aria-controls={`aff-panel-${x}`}
            className={`aff-tab${tab === x ? ' is-on' : ''}`}
            onClick={() => setTab(x)}
          >
            {t(k(`parent.aff.tab.${x}`))}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`aff-panel-${tab}`} aria-labelledby={`aff-tab-${tab}`}>
        {tab === 'members' && <MembersTab />}
        {tab === 'analytics' && <AnalyticsTab />}
        {tab === 'ledger' && <LedgerTab />}
        {tab === 'payout' && <PayoutTab data={d} onChange={ov.reload} />}
      </div>
    </div>
  );
}

const STATUS_TONE: Record<MemberStatus, 'muted' | 'info' | 'success' | 'warning'> = {
  unverified: 'muted',
  joined: 'info',
  active: 'warning',
  subscribed: 'success',
};

function MembersTab() {
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'table' | 'tree'>('table');
  const m = useFetch<Members>('parent', `/parent/affiliate/members?page=${page}`);
  const pages = m.data ? Math.max(1, Math.ceil(m.data.total / m.data.pageSize)) : 1;
  return (
    <Card
      title={t('parent.aff.membersTitle', { n: m.data?.total ?? 0 })}
      actions={
        <div className="ui-row" role="group" aria-label={t('parent.aff.viewLabel')}>
          {(['table', 'tree'] as const).map((v) => (
            <Button
              key={v}
              variant={view === v ? 'primary' : 'secondary'}
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              {t(k(`parent.aff.view.${v}`))}
            </Button>
          ))}
        </div>
      }
    >
      <p className="ui-muted">{t('parent.aff.membersPrivacy')}</p>
      {!m.data ? (
        <Spinner label={t('parent.loading')} />
      ) : view === 'table' ? (
        m.data.items.length === 0 ? (
          <p className="ui-empty">{t('parent.aff.membersEmpty')}</p>
        ) : (
          <ul className="aff-list">
            {m.data.items.map((r) => (
              <li key={`${r.name}-${r.joinedAt}`} className="aff-item">
                <div className="aff-item-main">
                  <strong>{r.name}</strong>
                  <small>{t('parent.aff.joinedOn', { date: formatDate(r.joinedAt) })}</small>
                </div>
                <Badge tone={STATUS_TONE[r.status]}>{t(k(`parent.aff.status.${r.status}`))}</Badge>
                <div className="aff-item-meta">
                  <span>{t('parent.aff.ordersN', { n: r.paidOrders })}</span>
                  <strong>{rp(r.earned)}</strong>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : m.data.items.length === 0 ? (
        <p className="ui-empty">{t('parent.aff.membersEmpty')}</p>
      ) : (
        <div className="aff-tree">
          <p className="aff-tree-root">{t('parent.aff.treeYou')}</p>
          <ul>
            {m.data.items.map((r) => (
              <li key={`${r.name}-${r.joinedAt}`}>
                <span className="aff-tree-node">
                  <strong>{r.name}</strong>
                  <Badge tone={STATUS_TONE[r.status]}>
                    {t(k(`parent.aff.status.${r.status}`))}
                  </Badge>
                  <small className="ui-muted">{rp(r.earned)}</small>
                </span>
                {r.subMembers > 0 && (
                  <ul>
                    <li>
                      <span className="aff-tree-node is-sub">
                        {t('parent.aff.treeSub', { n: r.subMembers })}
                      </span>
                    </li>
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <p className="ui-muted aff-hint">{t('parent.aff.treeNote')}</p>
        </div>
      )}
      {pages > 1 && (
        <div className="ui-row aff-pager">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {t('parent.aff.prev')}
          </Button>
          <span className="ui-muted">{t('parent.aff.page', { page, pages })}</span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            {t('parent.aff.next')}
          </Button>
        </div>
      )}
    </Card>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;

function AnalyticsTab() {
  const a = useFetch<{
    months: {
      month: string;
      clicks: number;
      signups: number;
      subscribers: number;
      earned: number;
    }[];
  }>('parent', '/parent/affiliate/analytics');
  if (!a.data) return <Spinner label={t('parent.loading')} />;
  const series = (key: 'clicks' | 'signups' | 'subscribers' | 'earned') =>
    a.data!.months.map((m) => ({ date: m.month, value: m[key] }));
  return (
    <div className="aff-charts">
      {(['earned', 'clicks', 'signups', 'subscribers'] as const).map((key) => (
        <Card key={key} title={t(k(`parent.aff.chart.${key}`))}>
          <DayBars
            data={series(key)}
            label={t(k(`parent.aff.chart.${key}`))}
            format={key === 'earned' ? rp : undefined}
            dayLabel={(date) => monthLabel(date)}
            height={140}
          />
        </Card>
      ))}
    </div>
  );
}

const LEDGER_TONE: Record<LedgerItem['state'], 'success' | 'warning' | 'muted'> = {
  available: 'success',
  pending: 'warning',
  void: 'muted',
};

function LedgerTab() {
  const [page, setPage] = useState(1);
  const l = useFetch<{ page: number; pageSize: number; total: number; items: LedgerItem[] }>(
    'parent',
    `/parent/affiliate/ledger?page=${page}`,
  );
  const pages = l.data ? Math.max(1, Math.ceil(l.data.total / l.data.pageSize)) : 1;
  return (
    <Card title={t('parent.aff.ledgerTitle')}>
      {!l.data ? (
        <Spinner label={t('parent.loading')} />
      ) : l.data.items.length === 0 ? (
        <p className="ui-empty">{t('parent.aff.ledgerEmpty')}</p>
      ) : (
        <ul className="aff-list">
          {l.data.items.map((r) => (
            <li key={r.id} className={`aff-item is-${r.state}`}>
              <div className="aff-item-main">
                <strong>
                  {t(k(`parent.aff.type.${r.type}`))}
                  {r.member && <span className="ui-muted"> · {r.member}</span>}
                </strong>
                <small>
                  {formatDate(r.createdAt)}
                  {r.rateBp !== null && r.baseAmount !== null && (
                    <>
                      {' '}
                      · {formatPercentBp(r.rateBp)} × {rp(r.baseAmount)}
                    </>
                  )}
                  {r.state === 'pending' && r.availableAt && (
                    <>
                      {' · '}
                      {t(
                        r.type === 'signup_bonus' ? 'parent.aff.untilQualify' : 'parent.aff.until',
                        {
                          date: formatDate(r.availableAt),
                        },
                      )}
                    </>
                  )}
                  {r.state === 'void' && r.note && <> · {r.note}</>}
                </small>
              </div>
              <Badge tone={LEDGER_TONE[r.state]}>{t(k(`parent.aff.state.${r.state}`))}</Badge>
              <strong className={`aff-item-amount ${r.amount < 0 ? 'aff-minus' : 'aff-plus'}`}>
                {r.amount > 0 ? '+' : ''}
                {rp(r.amount)}
              </strong>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="ui-row aff-pager">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {t('parent.aff.prev')}
          </Button>
          <span className="ui-muted">{t('parent.aff.page', { page, pages })}</span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            {t('parent.aff.next')}
          </Button>
        </div>
      )}
    </Card>
  );
}

const ACCOUNT_TONE: Record<Account['status'], 'success' | 'warning' | 'muted'> = {
  verified: 'success',
  pending: 'warning',
  rejected: 'muted',
};
const PAYOUT_TONE: Record<Payout['status'], 'success' | 'warning' | 'muted' | 'info'> = {
  requested: 'warning',
  paid: 'success',
  rejected: 'muted',
  cancelled: 'muted',
};

function PayoutTab({ data, onChange }: { data: Overview; onChange: () => void }) {
  const call = useApiCall('parent');
  const list = useFetch<Payout[]>('parent', '/parent/affiliate/payouts');
  const [editing, setEditing] = useState(!data.account);
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string }>();
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    onChange();
    list.reload();
  };

  async function request(e: FormEvent) {
    e.preventDefault();
    setMsg(undefined);
    const value = Number(amount.replace(/\D/g, ''));
    setBusy(true);
    try {
      await call('/parent/affiliate/payouts', { body: { amount: value } });
      setAmount('');
      setMsg({ tone: 'success', text: t('parent.aff.requested') });
      refresh();
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setBusy(true);
    try {
      await call(`/parent/affiliate/payouts/${id}/cancel`, { method: 'POST' });
      refresh();
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  const a = data.account;
  return (
    <div className="aff-payout">
      <Card title={t('parent.aff.accountTitle')}>
        {a && !editing ? (
          <>
            <p className="aff-account">
              <strong>{a.providerName}</strong> •••• {a.last4} · {a.holderName}{' '}
              <Badge tone={ACCOUNT_TONE[a.status]}>{t(k(`parent.aff.account.${a.status}`))}</Badge>
            </p>
            {a.reviewNote && (
              <Notice tone={a.status === 'rejected' ? 'error' : 'warning'}>{a.reviewNote}</Notice>
            )}
            <Button
              variant="secondary"
              disabled={!!data.openPayout}
              onClick={() => setEditing(true)}
            >
              {t('parent.aff.changeAccount')}
            </Button>
            {data.openPayout && <p className="ui-muted">{t('parent.aff.lockedByPayout')}</p>}
          </>
        ) : (
          <AccountForm
            providers={data.providers}
            current={a}
            cooldownDays={data.rules.accountCooldownDays}
            onCancel={a ? () => setEditing(false) : undefined}
            onSaved={() => {
              setEditing(false);
              refresh();
            }}
          />
        )}
      </Card>

      <Card title={t('parent.aff.requestTitle')}>
        <p>
          {t('parent.aff.canWithdraw', { amount: rp(data.balance.available) })}{' '}
          <span className="ui-muted">
            {t('parent.aff.minNote', { min: rp(data.rules.minPayout) })}
          </span>
        </p>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        {data.openPayout ? (
          <Notice tone="info">
            {t('parent.aff.openPayout', {
              number: data.openPayout.number,
              amount: rp(data.openPayout.amount),
            })}{' '}
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => void cancel(data.openPayout!.id)}
            >
              {t('parent.aff.cancelPayout')}
            </Button>
          </Notice>
        ) : (
          <form className="aff-request" onSubmit={request} noValidate>
            <TextField
              label={t('parent.aff.amount')}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              hint={t('parent.aff.amountHint')}
            />
            <div className="ui-row">
              <Button
                variant="secondary"
                onClick={() => setAmount(String(data.balance.available))}
                disabled={data.balance.available < data.rules.minPayout}
              >
                {t('parent.aff.all')}
              </Button>
              <Button
                type="submit"
                disabled={
                  busy ||
                  !a ||
                  a.status !== 'verified' ||
                  data.balance.available < data.rules.minPayout
                }
              >
                {t('parent.aff.submitPayout')}
              </Button>
            </div>
          </form>
        )}
      </Card>

      <Card title={t('parent.aff.payoutsTitle')}>
        {(list.data ?? []).length === 0 ? (
          <p className="ui-empty">{t('parent.aff.payoutsEmpty')}</p>
        ) : (
          <ul className="aff-list">
            {list.data!.map((r) => (
              <li key={r.id} className="aff-item">
                <div className="aff-item-main">
                  <strong className="pa-mono">{r.number}</strong>
                  <small>
                    {formatDate(r.requestedAt)} · {r.providerName} •••• {r.last4}
                    {r.transferRef && <> · Ref {r.transferRef}</>}
                    {r.note && r.status !== 'paid' && <> · {r.note}</>}
                  </small>
                </div>
                <Badge tone={PAYOUT_TONE[r.status]}>{t(k(`parent.aff.payout.${r.status}`))}</Badge>
                <strong className="aff-item-amount">{rp(r.amount)}</strong>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function AccountForm({
  providers,
  current,
  cooldownDays,
  onCancel,
  onSaved,
}: {
  providers: PayoutProvider[];
  current: Account | null;
  cooldownDays: number;
  onCancel?: () => void;
  onSaved: () => void;
}) {
  const call = useApiCall('parent');
  const [providerId, setProviderId] = useState(current?.providerId ?? providers[0]?.id ?? '');
  const [accountNumber, setAccountNumber] = useState('');
  const [holderName, setHolderName] = useState(current?.holderName ?? '');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setMsg(undefined);
    try {
      const r = await call<{ sent: boolean; cooldownSeconds: number }>(
        '/parent/affiliate/account/code',
        {
          method: 'POST',
        },
      );
      setSent(true);
      setMsg(
        r.sent ? t('parent.aff.codeSent') : t('parent.aff.codeWait', { s: r.cooldownSeconds }),
      );
    } catch (err) {
      setMsg(errorMessage(err));
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(undefined);
    const parsed = payoutAccountInputSchema.safeParse({
      providerId,
      accountNumber,
      holderName,
      code,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await call('/parent/affiliate/account', { method: 'PUT', body: parsed.data });
      onSaved();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="aff-account-form">
      <Notice tone="info">{t('parent.aff.accountRule', { days: cooldownDays })}</Notice>
      <SelectField
        label={t('parent.aff.provider')}
        value={providerId}
        onChange={(e) => setProviderId(e.target.value)}
        options={providers.map((p) => ({
          value: p.id,
          label: `${p.name} (${t(k(`parent.aff.kind.${p.kind}`))})`,
        }))}
      />
      <TextField
        label={t('parent.aff.accountNumber')}
        inputMode="numeric"
        autoComplete="off"
        value={accountNumber}
        error={errors.accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
      />
      <TextField
        label={t('parent.aff.holderName')}
        hint={t('parent.aff.holderHint')}
        value={holderName}
        error={errors.holderName}
        onChange={(e) => setHolderName(e.target.value)}
      />
      <div className="aff-code-row">
        <TextField
          label={t('parent.aff.emailCode')}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          error={errors.code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
        <Button variant="secondary" onClick={() => void sendCode()}>
          {sent ? t('parent.aff.resendCode') : t('parent.aff.sendCode')}
        </Button>
      </div>
      {msg && <Notice tone="warning">{msg}</Notice>}
      <div className="ui-row">
        <Button type="submit" disabled={busy}>
          {busy ? t('parent.saving') : t('parent.aff.saveAccount')}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            {t('parent.cancel')}
          </Button>
        )}
      </div>
    </form>
  );
}
