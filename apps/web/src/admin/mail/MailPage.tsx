import { useState, type FormEvent } from 'react';
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
              <Card title={t('admin.mail.recentTitle')}>
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
