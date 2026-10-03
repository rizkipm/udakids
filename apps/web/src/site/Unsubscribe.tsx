import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Momo } from '../components/Momo';
import { t } from '../i18n';
import { Card, Notice } from '../ui/ui';

/** Tautan "berhenti menerima info materi baru" dari email (D-053). */
export function Unsubscribe() {
  const [params] = useSearchParams();
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  useEffect(() => {
    const p = params.get('p') ?? '';
    const tk = params.get('t') ?? '';
    api('/public/news/unsubscribe', { body: { p, t: tk } })
      .then(() => setState('ok'))
      .catch(() => setState('error'));
  }, [params]);
  return (
    <main
      className="ui-shell"
      style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}
    >
      <Card title={t('site.unsub.title')}>
        <div style={{ display: 'grid', justifyItems: 'center', gap: 12, maxWidth: 440 }}>
          <Momo mood={state === 'error' ? 'curious' : 'happy'} size={110} />
          {state === 'loading' && <p>{t('site.unsub.loading')}</p>}
          {state === 'ok' && <Notice tone="success">{t('site.unsub.ok')}</Notice>}
          {state === 'error' && <Notice tone="warning">{t('site.unsub.error')}</Notice>}
          <Link to="/orang-tua">{t('site.unsub.dashboard')}</Link>
        </div>
      </Card>
    </main>
  );
}
