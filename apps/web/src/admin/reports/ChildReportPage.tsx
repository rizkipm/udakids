import { Link, useParams } from 'react-router-dom';
import type { ChildReport, SkillStatus } from '../../api/types';
import { useFetch } from '../../auth/useApi';
import { t } from '../../i18n';
import { Badge, Card, Empty, formatDate, PageHeader, Stat, Table, type Column } from '../../ui/ui';
import { ColorDot, Icon, Loadable, percent, skillPath } from '../common';

type SkillRowR = ChildReport['areas'][number]['categories'][number]['skills'][number];

const STATUS_TONE: Record<SkillStatus, 'success' | 'info' | 'warning' | 'muted'> = {
  Jago: 'success',
  Bisa: 'info',
  Belajar: 'warning',
  'Belum mulai': 'muted',
};

function StatusCell({ s }: { s: Pick<SkillRowR, 'status' | 'needsReview'> }) {
  return (
    <span className="adm-tags">
      <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
      {s.needsReview && <Badge tone="warning">{t('admin.child.needsReview')}</Badge>}
    </span>
  );
}

function Meter({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="ui-row" style={{ justifyContent: 'space-between' }}>
        <span>{label}</span>
        <strong>{v}/100</strong>
      </div>
      <div
        className="adm-meter"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-label={label}
      >
        <span style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

const acc = (correct: number, answered: number) =>
  answered ? percent((correct / answered) * 100) : '—';

export function ChildReportPage() {
  const { id = '' } = useParams();
  const report = useFetch<ChildReport>('staff', `/admin/children/${encodeURIComponent(id)}/report`);

  const columns: Column<SkillRowR>[] = [
    { key: 'order', label: t('admin.col.order'), render: (s) => `${s.category}.${s.order}` },
    {
      key: 'title',
      label: t('admin.col.skill'),
      render: (s) => <Link to={skillPath(s.id)}>{s.title}</Link>,
    },
    { key: 'status', label: t('admin.col.status'), render: (s) => <StatusCell s={s} /> },
    { key: 'score', label: t('admin.col.score'), render: (s) => s.score },
    { key: 'stage', label: t('admin.col.stage'), render: (s) => s.stage },
    {
      key: 'answered',
      label: t('admin.col.answered'),
      render: (s) => `${s.correct}/${s.answered}`,
    },
  ];

  return (
    <Loadable loading={report.loading} error={report.error} hasData={!!report.data}>
      {() => {
        const r = report.data!;
        return (
          <>
            <PageHeader
              title={
                <>
                  <ColorDot color={r.child.momoColor} />
                  {t('admin.child.title', { name: r.child.nickname })}
                </>
              }
              subtitle={t('admin.child.subtitle', {
                last: formatDate(r.child.lastActiveAt),
                since: formatDate(r.child.createdAt),
              })}
              actions={
                <Link className="ui-btn ui-btn-ghost" to="/admin/laporan">
                  <Icon name="back" />
                  {t('admin.back')}
                </Link>
              }
            />
            <div className="ui-grid" style={{ marginBottom: 20 }}>
              <Stat
                label={t('admin.child.answered')}
                value={r.totals.answered}
                hint={t('admin.child.accuracy', { v: acc(r.totals.correct, r.totals.answered) })}
              />
              <Stat
                label={t('admin.child.jago')}
                value={r.totals.jago}
                hint={t('admin.child.ofSkills', { n: r.totals.skills })}
              />
              <Stat
                label={t('admin.child.week')}
                value={r.week.answered}
                hint={t('admin.child.accuracy', { v: acc(r.week.correct, r.week.answered) })}
              />
            </div>
            <Card title={t('admin.child.recommendations')}>
              {r.recommendations.length === 0 ? (
                <Empty>{t('admin.child.noRecommendations')}</Empty>
              ) : (
                <ul className="adm-kids">
                  {r.recommendations.map((x) => (
                    <li key={x.id}>
                      <span className="ui-row">
                        <Link to={skillPath(x.id)}>{x.title}</Link>
                        <span className="ui-muted">{x.category}</span>
                        <StatusCell s={{ status: x.status, needsReview: false }} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            {r.areas.map((a) => (
              <Card key={`${a.domain}/${a.grade}`} title={a.title}>
                <Meter value={a.mastery} label={t('admin.child.mastery')} />
                <p className="ui-muted" style={{ margin: '8px 0 12px' }}>
                  {t('admin.child.areaCounts', { jago: a.jago, bisa: a.bisa, total: a.total })}
                </p>
                {a.categories.map((c) => (
                  <details key={c.code} open={c.skills.some((s) => s.answered > 0)}>
                    <summary className="adm-group-title" style={{ cursor: 'pointer' }}>
                      {c.code} — {c.title}{' '}
                      <span className="ui-muted">
                        {t('admin.child.catCounts', { jago: c.jago, bisa: c.bisa, total: c.total })}
                      </span>
                    </summary>
                    <Table rows={c.skills} columns={columns} rowKey={(s) => s.id} />
                  </details>
                ))}
              </Card>
            ))}
          </>
        );
      }}
    </Loadable>
  );
}
