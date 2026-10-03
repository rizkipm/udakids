import { useState } from 'react';
import { useApiCall, useFetch } from '../auth/useApi';
import { t } from '../i18n';
import { Card, Checkbox } from '../ui/ui';

/** Pengaturan email info materi baru (D-053). */
export function NewsToggle() {
  const data = useFetch<{ subscribed: boolean }>('parent', '/parent/news');
  const call = useApiCall('parent');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<boolean>();
  const on = saved ?? data.data?.subscribed ?? true;
  async function change(next: boolean) {
    setBusy(true);
    try {
      await call('/parent/news', { method: 'PUT', body: { subscribed: next } });
      setSaved(next);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="pa-news">
      <div className="pa-family-inner">
        <div>
          <h2 className="pa-family-title">{t('parent.news.title')}</h2>
          <p className="ui-muted">{t('parent.news.hint')}</p>
          <Checkbox
            label={t('parent.news.label')}
            checked={on}
            disabled={busy || data.loading}
            onChange={(e) => void change(e.target.checked)}
          />
        </div>
      </div>
    </Card>
  );
}
