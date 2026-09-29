import { Link, useParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import type { ChildReport as Report } from '../api/types';
import { useFetch } from '../auth/useApi';
import { ChildReport } from '../components/ChildReport';
import { t } from '../i18n';
import { Button, Notice, Spinner } from '../ui/ui';

export function ReportPage() {
  const { id } = useParams();
  const { data, error, loading, reload } = useFetch<Report>(
    'parent',
    id ? `/parent/children/${encodeURIComponent(id)}/report` : null,
  );

  return (
    <>
      <p className="pa-back">
        <Link to="/orang-tua">{t('parent.back')}</Link>
      </p>
      {loading && !data ? (
        <Spinner label={t('parent.loading')} />
      ) : error || !data ? (
        <Notice tone="error">
          {t('parent.report.loadError')} {error ? errorMessage(error) : ''}{' '}
          <Button variant="ghost" onClick={reload}>
            {t('parent.dash.retry')}
          </Button>
        </Notice>
      ) : (
        <>
          <Notice tone="info">{t('parent.report.intro')}</Notice>
          <ChildReport report={data} />
        </>
      )}
    </>
  );
}
