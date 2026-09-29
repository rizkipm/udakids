import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Color } from '@little-coder/engine';
import { errorMessage } from '../api/client';
import type { ChildProfile } from '../api/types';
import { useApiCall, useFetch } from '../auth/useApi';
import { rememberFamilyCode, rememberedFamilyCode, useSession } from '../auth/session';
import { VisualView } from '../components/visuals';
import { t } from '../i18n';
import { familySteps, Stepper } from '../site/AuthLayout';
import { Button, Card, Empty, Notice, PageHeader, Spinner, formatDate } from '../ui/ui';

type DashState = { welcome?: boolean; saved?: string } | null;

function FamilyCode() {
  const session = useSession('parent');
  const me = useFetch<{ familyCode?: string }>('parent', session?.familyCode ? null : '/auth/me');
  const code = session?.familyCode ?? me.data?.familyCode;
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (code && rememberedFamilyCode() !== code) rememberFamilyCode(code);
  }, [code]);

  return (
    <Card className="pa-family">
      <div className="pa-family-inner">
        <div>
          <h2 className="pa-family-title">{t('parent.family.title')}</h2>
          <p className="ui-muted">{t('parent.family.explain')}</p>
        </div>
        <div className="pa-family-code-wrap">
          <output className="pa-family-code" aria-label={t('parent.family.title')}>
            {code ?? '······'}
          </output>
          {code && typeof navigator !== 'undefined' && navigator.clipboard && (
            <Button
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(code).then(
                  () => setCopied(true),
                  () => setCopied(false),
                );
              }}
            >
              {copied ? t('parent.family.copied') : t('parent.family.copy')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function ChildCard({ child, onDeleted }: { child: ChildProfile; onDeleted: () => void }) {
  const call = useApiCall('parent');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function remove() {
    setBusy(true);
    setError(undefined);
    try {
      await call(`/parent/children/${child.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <article className="pa-child" aria-labelledby={`child-${child.id}`}>
      <div className="pa-child-head">
        <span className="pa-child-swatch" aria-hidden>
          <VisualView visual={{ kind: 'swatch', color: child.momoColor as Color }} size={48} />
        </span>
        <div>
          <h3 id={`child-${child.id}`}>{child.nickname}</h3>
          <p className="ui-muted">
            {child.lastActiveAt
              ? t('parent.child.lastActive', { when: formatDate(child.lastActiveAt) })
              : t('parent.child.never')}
          </p>
          <p className="ui-muted">
            {child.className
              ? t('parent.child.class', { name: child.className })
              : t('parent.child.noClass')}
          </p>
        </div>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {confirming ? (
        <div className="pa-confirm" role="alertdialog" aria-labelledby={`del-${child.id}`}>
          <p id={`del-${child.id}`}>{t('parent.child.deleteConfirm', { name: child.nickname })}</p>
          <div className="ui-row">
            <Button variant="danger" disabled={busy} onClick={remove}>
              {t('parent.child.deleteYes', { name: child.nickname })}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              {t('parent.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="pa-child-actions">
          <Link className="ui-btn ui-btn-primary" to={`/orang-tua/anak/${child.id}`}>
            {t('parent.child.report')}
          </Link>
          <Link className="ui-btn ui-btn-secondary" to={`/orang-tua/anak/${child.id}/ubah`}>
            {t('parent.child.edit')}
          </Link>
          <Link className="ui-btn ui-btn-secondary" to={`/orang-tua/anak/${child.id}/sandi`}>
            {t('parent.child.pin')}
          </Link>
          <Button variant="danger" onClick={() => setConfirming(true)}>
            {t('parent.child.delete')}
          </Button>
        </div>
      )}
    </article>
  );
}

export function Dashboard() {
  const session = useSession('parent');
  const state = useLocation().state as DashState;
  const { data, error, loading, reload } = useFetch<ChildProfile[]>('parent', '/parent/children');
  const [deleted, setDeleted] = useState<string>();
  const children = data ?? [];
  const showWelcome =
    !loading && !error && ((state?.welcome && !state.saved) || children.length === 0);

  return (
    <>
      <PageHeader
        title={t('parent.dash.title', { name: session?.user.name ?? '' })}
        subtitle={t('parent.dash.subtitle')}
      />

      {state?.saved && !deleted && (
        <Notice tone="success">{t('parent.dash.saved', { name: state.saved })}</Notice>
      )}
      {deleted && <Notice tone="success">{t('parent.dash.deleted', { name: deleted })}</Notice>}

      {state?.welcome && state.saved && (
        <>
          <Stepper current={3} labels={familySteps()} />
          <Notice tone="success">{t('parent.dash.ready', { name: state.saved })}</Notice>
        </>
      )}

      <Link className="pa-play" to="/play">
        <span className="pa-play-title">{t('parent.dash.play')}</span>
        <span className="pa-play-hint">{t('parent.dash.playHint')}</span>
      </Link>

      <FamilyCode />

      {showWelcome && (
        <Notice tone="info">
          <div className="pa-welcome">
            <span>{t('parent.dash.welcome')}</span>
            <Link className="ui-btn ui-btn-primary" to="/orang-tua/anak/baru">
              {t('parent.dash.addChild')}
            </Link>
          </div>
        </Notice>
      )}

      <Card
        title={t('parent.dash.children')}
        actions={
          <Link className="ui-btn ui-btn-secondary" to="/orang-tua/anak/baru">
            {t('parent.dash.addChild')}
          </Link>
        }
      >
        {loading && !data ? (
          <Spinner label={t('parent.loading')} />
        ) : error ? (
          <Notice tone="error">
            {t('parent.dash.loadError')} {errorMessage(error)}{' '}
            <Button variant="ghost" onClick={reload}>
              {t('parent.dash.retry')}
            </Button>
          </Notice>
        ) : children.length === 0 ? (
          <Empty>{t('parent.dash.noChildren')}</Empty>
        ) : (
          <div className="pa-children">
            {children.map((c) => (
              <ChildCard
                key={c.id}
                child={c}
                onDeleted={() => {
                  setDeleted(c.nickname);
                  reload();
                }}
              />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
