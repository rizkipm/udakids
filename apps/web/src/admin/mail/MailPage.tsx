import { useState, type FormEvent } from 'react';
import { errorMessage } from '../../api/client';
import { useApiCall, useFetch } from '../../auth/useApi';
import { t, type MessageKey } from '../../i18n';
import { Badge, Button, Card, Notice, PageHeader, Stat, TextField } from '../../ui/ui';
import { ActionNotice, Loadable, useAction } from '../common';

type MailRow = {
  id: string;
  toEmail: string;
  subject: string;
  kind: string;
  status: string;
  attempts: number;
  lastError: string | null;
  /** Jawaban server SMTP, mis. "250 OK id=1xDmjJ-…" (untuk cPanel → Track Delivery). */
  smtpResponse?: string | null;
  createdAt: string;
  sentAt: string | null;
};
type MailOverview = {
  configured: boolean;
  host: string;
  port: number;
  from: string;
  user: string | null;
  director: string[];
  appUrl: string;
  counts: Record<string, number>;
  recent: MailRow[];
};

const STATUS_TONE: Record<string, 'success' | 'warning' | 'info' | 'muted' | 'neutral'> = {
  sent: 'success',
  logged: 'muted',
  queued: 'info',
  retry: 'warning',
  waiting_smtp: 'warning',
  failed: 'warning',
};
const RETRYABLE = new Set(['failed', 'retry', 'waiting_smtp']);

const when = (v: string) =>
  new Date(v).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

type NewsOverview = {
  enabled: boolean;
  lastSentAt: string | null;
  lastRecipients: number;
  lastLevels: number;
  pending: { total: number; books: { title: string; topics: string[]; levels: number }[] };
  nextSendAt: string | null;
  subscribers: number;
  unsubscribed: number;
};

type DnsReport = {
  domain: string;
  smtpHost: string;
  smtpIps: string[];
  spf: {
    record: string | null;
    ok: boolean;
    issues: string[];
    warnings?: string[];
    suggested: string | null;
  };
  dkim: { selector: string; found: boolean; issues: string[] };
  dmarc: { record: string | null; policy: string | null; issues: string[] };
  ok: boolean;
};

/** ID antrean server dari jawaban SMTP ("250 OK id=1xDmjJ-…" → "1xDmjJ-…"). */
const smtpId = (r?: string | null) => (r ? (/id=([\w.-]+)/i.exec(r)?.[1] ?? r) : null);

/** Cek SPF/DKIM/DMARC domain pengirim: email "Diterima server" tapi tidak sampai biasanya karena ini. */
function DnsPanel() {
  const call = useApiCall('staff');
  const [report, setReport] = useState<DnsReport | null>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function check() {
    setBusy(true);
    setError(undefined);
    try {
      setReport((await call<{ report: DnsReport | null }>('/admin/mail/dns')).report);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  const row = (label: string, ok: boolean, value: string | null, issues: string[]) => (
    <>
      <dt>{label}</dt>
      <dd>
        <Badge tone={ok ? 'success' : 'warning'}>
          {value ? t('admin.mail.dns.found') : t('admin.mail.dns.missing')}
        </Badge>
        {value && <code className="adm-mail-dns-record">{value}</code>}
        {issues.map((x) => (
          <small key={x} className="adm-mail-error">
            {x}
          </small>
        ))}
      </dd>
    </>
  );
  return (
    <Card title={t('admin.mail.dns.title')}>
      <p className="ui-muted">{t('admin.mail.dns.intro')}</p>
      {error && <Notice tone="error">{error}</Notice>}
      {report === null && <Notice tone="info">{t('admin.mail.dns.skipped')}</Notice>}
      {report && (
        <>
          <Notice tone={report.ok ? 'success' : 'warning'}>
            {report.ok ? t('admin.mail.dns.ok') : t('admin.mail.dns.problem')}
          </Notice>
          <dl className="adm-mail-config">
            {row(t('admin.mail.dns.spf'), report.spf.ok, report.spf.record, report.spf.issues)}
            {row(
              t('admin.mail.dns.dkim', { selector: report.dkim.selector }),
              report.dkim.found,
              report.dkim.found ? 'v=DKIM1' : null,
              report.dkim.issues,
            )}
            {row(
              t('admin.mail.dns.dmarc'),
              !!report.dmarc.record,
              report.dmarc.record,
              report.dmarc.issues,
            )}
          </dl>
          {report.spf.warnings?.map((x) => (
            <Notice key={x} tone="info">
              {x}
            </Notice>
          ))}
          {report.spf.suggested && (
            <>
              <p>{t('admin.mail.dns.suggested')}</p>
              <code className="adm-mail-dns-record">{report.spf.suggested}</code>
              <p className="ui-muted">{t('admin.mail.dns.after')}</p>
            </>
          )}
        </>
      )}
      <Button variant="secondary" disabled={busy} onClick={() => void check()}>
        {t('admin.mail.dns.check')}
      </Button>
    </Card>
  );
}

/** Info materi baru otomatis (D-053): status, jadwal, nyala/mati, kirim sekarang. */
function NewsPanel() {
  const news = useFetch<NewsOverview>('staff', '/admin/news');
  const call = useApiCall('staff');
  const action = useAction();
  const n = news.data;
  async function toggle() {
    if (!n) return;
    const ok = await action.run(
      () => call('/admin/news', { method: 'PUT', body: { enabled: !n.enabled } }).then(() => true),
      n.enabled ? t('admin.news.turnedOff') : t('admin.news.turnedOn'),
    );
    if (ok) news.reload();
  }
  async function sendNow() {
    const ok = await action.run(
      () => call('/admin/news/send-now', { method: 'POST' }).then(() => true),
      t('admin.news.sent'),
    );
    if (ok) news.reload();
  }
  return (
    <Card title={t('admin.news.title')}>
      <p className="ui-muted">{t('admin.news.hint')}</p>
      <ActionNotice error={action.error} done={action.done} />
      {n && (
        <>
          <dl className="adm-mail-config">
            <dt>{t('admin.mail.status')}</dt>
            <dd>
              {n.enabled ? (
                <Badge tone="success">{t('admin.news.on')}</Badge>
              ) : (
                <Badge tone="warning">{t('admin.news.off')}</Badge>
              )}
            </dd>
            <dt>{t('admin.news.subscribers')}</dt>
            <dd>{t('admin.news.subscribersValue', { n: n.subscribers, out: n.unsubscribed })}</dd>
            <dt>{t('admin.news.pending')}</dt>
            <dd>
              {n.pending.total === 0
                ? t('admin.news.none')
                : n.pending.books.map((b) => `${b.title} (${b.levels})`).join(', ')}
            </dd>
            <dt>{t('admin.news.next')}</dt>
            <dd>{n.nextSendAt ? when(n.nextSendAt) : '-'}</dd>
            <dt>{t('admin.news.last')}</dt>
            <dd>
              {n.lastSentAt
                ? t('admin.news.lastValue', {
                    when: when(n.lastSentAt),
                    n: n.lastRecipients,
                    levels: n.lastLevels,
                  })
                : '-'}
            </dd>
          </dl>
          <div className="ui-row">
            <Button variant="secondary" disabled={action.busy} onClick={() => void toggle()}>
              {n.enabled ? t('admin.news.disable') : t('admin.news.enable')}
            </Button>
            <Button disabled={action.busy || n.pending.total === 0} onClick={() => void sendNow()}>
              {t('admin.news.sendNow')}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

/** Admin: status pengiriman email (Gmail SMTP), email uji, dan antrean (D-044). */
export function MailPage() {
  const data = useFetch<MailOverview>('staff', '/admin/mail');
  const call = useApiCall('staff');
  const action = useAction();
  const [to, setTo] = useState('');

  async function sendTest(e: FormEvent) {
    e.preventDefault();
    const out = await action.run(
      () =>
        call<{ to: string }>('/admin/mail/test', {
          method: 'POST',
          body: to.trim() ? { to: to.trim() } : {},
        }),
      t('admin.mail.testSent'),
    );
    if (out) data.reload();
  }

  async function retry(id: string) {
    const ok = await action.run(
      () => call(`/admin/mail/outbox/${id}/retry`, { method: 'POST' }).then(() => true),
      t('admin.mail.retried'),
    );
    if (ok) data.reload();
  }

  return (
    <>
      <PageHeader title={t('admin.mail.title')} subtitle={t('admin.mail.subtitle')} />
      <Loadable loading={data.loading} error={data.error} hasData={!!data.data}>
        {() => {
          const d = data.data!;
          const n = (k: string) => d.counts[k] ?? 0;
          return (
            <>
              {!d.configured && <Notice tone="warning">{t('admin.mail.notConfigured')}</Notice>}
              <Card title={t('admin.mail.configTitle')}>
                <dl className="adm-mail-config">
                  <dt>{t('admin.mail.status')}</dt>
                  <dd>
                    {d.configured ? (
                      <Badge tone="success">{t('admin.mail.ready')}</Badge>
                    ) : (
                      <Badge tone="warning">{t('admin.mail.notReady')}</Badge>
                    )}
                  </dd>
                  <dt>{t('admin.mail.sender')}</dt>
                  <dd>{d.from}</dd>
                  <dt>{t('admin.mail.server')}</dt>
                  <dd>
                    {d.host}:{d.port} {d.user ? `· ${d.user}` : ''}
                  </dd>
                  <dt>{t('admin.mail.director')}</dt>
                  <dd>{d.director.join(', ') || '-'}</dd>
                  <dt>{t('admin.mail.appUrl')}</dt>
                  <dd>{d.appUrl}</dd>
                </dl>
                <p className="ui-muted">{t('admin.mail.configHint')}</p>
              </Card>
              <div className="ui-grid adm-stats">
                <Stat label={t('admin.mail.statSent')} value={n('sent')} />
                <Stat label={t('admin.mail.statQueued')} value={n('queued') + n('retry')} />
                <Stat label={t('admin.mail.statWaiting')} value={n('waiting_smtp')} />
                <Stat label={t('admin.mail.statFailed')} value={n('failed')} />
              </div>
              <Card title={t('admin.mail.testTitle')}>
                <ActionNotice error={action.error} done={action.done} />
                <form onSubmit={sendTest} className="adm-key-form">
                  <TextField
                    label={t('admin.mail.testTo')}
                    hint={t('admin.mail.testHint')}
                    type="email"
                    autoComplete="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                  <div className="ui-row">
                    <Button type="submit" disabled={action.busy}>
                      {t('admin.mail.testSend')}
                    </Button>
                    <Button variant="ghost" onClick={data.reload}>
                      {t('admin.order.refresh')}
                    </Button>
                  </div>
                </form>
              </Card>
              <DnsPanel />
              <NewsPanel />
              <Card title={t('admin.mail.recentTitle')}>
                <p className="ui-muted">{t('admin.mail.sentNote')}</p>
                {d.recent.length === 0 ? (
                  <p className="ui-muted">{t('admin.mail.empty')}</p>
                ) : (
                  <ul className="adm-mail-list">
                    {d.recent.map((m) => (
                      <li key={m.id}>
                        <div>
                          <strong>{m.subject}</strong>
                          <small className="ui-muted">
                            {m.toEmail} ·{' '}
                            {t(`admin.mail.kind.${m.kind.split('_')[0]}` as MessageKey)} ·{' '}
                            {when(m.sentAt ?? m.createdAt)}
                          </small>
                          {m.lastError && <small className="adm-mail-error">{m.lastError}</small>}
                          {m.status === 'sent' && smtpId(m.smtpResponse) && (
                            <small className="ui-muted adm-mail-smtp">
                              {t('admin.mail.smtpId', { id: smtpId(m.smtpResponse)! })}
                            </small>
                          )}
                        </div>
                        <div className="ui-row">
                          <Badge tone={STATUS_TONE[m.status] ?? 'neutral'}>
                            {t(`admin.mail.status.${m.status}` as MessageKey)}
                          </Badge>
                          {RETRYABLE.has(m.status) && (
                            <Button
                              variant="secondary"
                              disabled={action.busy}
                              onClick={() => void retry(m.id)}
                            >
                              {t('admin.mail.retry')}
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          );
        }}
      </Loadable>
    </>
  );
}
