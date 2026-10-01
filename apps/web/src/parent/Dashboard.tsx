import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Color } from '@little-coder/engine';
import { errorMessage } from '../api/client';
import { useApiCall, useFetch } from '../auth/useApi';
import { rememberFamilyCode, rememberedFamilyCode, useSession } from '../auth/session';
import { Momo } from '../components/Momo';
import { t } from '../i18n';
import { familySteps, Stepper } from '../site/AuthLayout';
import { Button, Card, Empty, Notice, Spinner } from '../ui/ui';
import { ClaimChild } from './ClaimChild';
import { CountUp, Kpi } from '../ui/charts';
import { ChildProgress, ProgressIcon, type OverviewChild } from './Progress';

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

/** Tombol kelola satu anak: laporan lengkap, ubah profil, sandi gambar, hapus (dengan konfirmasi). */
function ChildActions({ child, onDeleted }: { child: OverviewChild; onDeleted: () => void }) {
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
    <>
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
        <>
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
        </>
      )}
    </>
  );
}

/** Ringkasan minggu ini untuk seluruh keluarga. */
function FamilyHero({ name, kids }: { name: string; kids: OverviewChild[] }) {
  const sum = (f: (c: OverviewChild) => number) => kids.reduce((a, c) => a + f(c), 0);
  const active = kids.filter((c) => c.insights.weekRounds > 0).length;
  return (
    <section className="pd-hero" aria-labelledby="pd-hero-title">
      <div className="pd-hero-text">
        <h1 id="pd-hero-title">{t('parent.dash.title', { name })}</h1>
        <p>{kids.length ? t('parent.ov.heroLead') : t('parent.dash.subtitle')}</p>
        <div className="ui-row">
          <Link className="ui-btn ui-btn-primary" to="/play">
            {t('parent.dash.play')}
          </Link>
          <Link className="ui-btn ui-btn-secondary" to="/orang-tua/anak/baru">
            {t('parent.dash.addChild')}
          </Link>
        </div>
      </div>
      <div className="pd-hero-art pd-bob" aria-hidden>
        <Momo mood="happy" size={120} />
      </div>
      {kids.length > 0 && (
        <div className="pd-hero-kpis" aria-label={t('parent.ov.heroStats')}>
          <Kpi
            i={0}
            tone="grape"
            icon={<ProgressIcon name="play" />}
            label={t('parent.ov.weekRounds')}
            value={<CountUp value={sum((c) => c.insights.weekRounds)} />}
          />
          <Kpi
            i={1}
            tone="leaf"
            icon={<ProgressIcon name="flag" />}
            label={t('parent.ov.weekPassed')}
            value={<CountUp value={sum((c) => c.insights.weekPassed)} />}
          />
          <Kpi
            i={2}
            tone="sun"
            icon={<ProgressIcon name="clock" />}
            label={t('parent.ov.weekMinutes')}
            value={<CountUp value={sum((c) => c.insights.weekMinutes)} />}
          />
          <Kpi
            i={3}
            tone="sky"
            icon={<ProgressIcon name="star" />}
            label={t('parent.ov.activeKids')}
            value={`${active}/${kids.length}`}
          />
        </div>
      )}
    </section>
  );
}

export function Dashboard() {
  const session = useSession('parent');
  const state = useLocation().state as DashState;
  const { data, error, loading, reload } = useFetch<{ children: OverviewChild[] }>(
    'parent',
    '/parent/overview',
  );
  const [deleted, setDeleted] = useState<string>();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState<string>();
  const [picked, setPicked] = useState<string>();
  const kids = data?.children ?? [];
  const current = kids.find((c) => c.id === picked) ?? kids[0];
  const showWelcome =
    !loading && !error && ((state?.welcome && !state.saved) || (data && kids.length === 0));

  return (
    <div className="pd">
      <FamilyHero name={session?.user.name ?? ''} kids={kids} />

      {state?.saved && !deleted && (
        <Notice tone="success">{t('parent.dash.saved', { name: state.saved })}</Notice>
      )}
      {deleted && <Notice tone="success">{t('parent.dash.deleted', { name: deleted })}</Notice>}
      {claimed && <Notice tone="success">{t('parent.claim.done', { name: claimed })}</Notice>}

      {state?.welcome && state.saved && (
        <>
          <Stepper current={3} labels={familySteps()} />
          <Notice tone="success">{t('parent.dash.ready', { name: state.saved })}</Notice>
        </>
      )}

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

      <section className="pd-children" aria-labelledby="pd-children-title">
        <div className="pd-section-head">
          <h2 id="pd-children-title">{t('parent.ov.childrenTitle')}</h2>
          {kids.length > 1 && (
            <div className="pd-tabs" role="tablist" aria-label={t('parent.ov.pick')}>
              {kids.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={c.id === current?.id}
                  className={`pd-tab${c.id === current?.id ? ' is-on' : ''}`}
                  onClick={() => setPicked(c.id)}
                >
                  <Momo color={c.momoColor as Color} mood="happy" size={32} />
                  {c.nickname}
                </button>
              ))}
            </div>
          )}
        </div>
        {loading && !data ? (
          <Spinner label={t('parent.loading')} />
        ) : error ? (
          <Notice tone="error">
            {t('parent.dash.loadError')} {errorMessage(error)}{' '}
            <Button variant="ghost" onClick={reload}>
              {t('parent.dash.retry')}
            </Button>
          </Notice>
        ) : !current ? (
          <Empty>{t('parent.dash.noChildren')}</Empty>
        ) : (
          <ChildProgress
            key={current.id}
            child={current}
            actions={
              <ChildActions
                child={current}
                onDeleted={() => {
                  setClaimed(undefined);
                  setDeleted(current.nickname);
                  setPicked(undefined);
                  reload();
                }}
              />
            }
          />
        )}
      </section>

      <div className="pd-manage">
        <FamilyCode />

        {claiming ? (
          <ClaimChild
            onClose={() => setClaiming(false)}
            onClaimed={(child) => {
              setClaiming(false);
              setDeleted(undefined);
              setClaimed(child.nickname);
              reload();
            }}
          />
        ) : (
          <Card className="pa-claim">
            <div className="pa-family-inner">
              <div>
                <h2 className="pa-family-title">{t('parent.claim.title')}</h2>
                <p className="ui-muted">{t('parent.claim.explain')}</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setClaimed(undefined);
                  setClaiming(true);
                }}
              >
                {t('parent.claim.open')}
              </Button>
            </div>
          </Card>
        )}

        <Card className="pa-billing-link">
          <div className="pa-family-inner">
            <div>
              <h2 className="pa-family-title">{t('parent.dash.billingTitle')}</h2>
              <p className="ui-muted">{t('parent.dash.billingHint')}</p>
            </div>
            <div className="ui-row">
              <Link className="ui-btn ui-btn-secondary" to="/orang-tua/paket">
                {t('parent.nav.packages')}
              </Link>
              <Link className="ui-btn ui-btn-ghost" to="/orang-tua/transaksi">
                {t('parent.nav.orders')}
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
