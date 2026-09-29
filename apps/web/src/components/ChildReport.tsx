import type { Color } from '@little-coder/engine';
import type { ChildReport as Report, SkillStatus } from '../api/types';
import { t } from '../i18n';
import { Badge, Card, Stat, formatDate } from '../ui/ui';
import { VisualView } from './visuals';
import './ChildReport.css';

/**
 * Laporan perkembangan satu anak untuk orang dewasa (orang tua, admin). Angka boleh tampil di
 * sini (PRD: angka hanya untuk orang tua/fasilitator), dengan bahasa yang menghargai usaha.
 */

const STATUS_TONE: Record<SkillStatus, 'success' | 'info' | 'warning' | 'muted'> = {
  Jago: 'success',
  Bisa: 'info',
  Belajar: 'warning',
  'Belum mulai': 'muted',
};

export function StatusBadge({ status }: { status: SkillStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{t(`parent.status.${status}`)}</Badge>;
}

const pct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function MasteryBar({ value, label }: { value: number; label: string }) {
  const v = pct(value);
  return (
    <div
      className="cr-bar"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
    >
      <span className="cr-bar-fill" style={{ width: `${v}%` }} />
    </div>
  );
}

export function ChildReport({ report }: { report: Report }) {
  const { child, totals, week, areas, recommendations } = report;
  const categoryTitle = new Map<string, string>();
  for (const area of areas) for (const c of area.categories) categoryTitle.set(c.code, c.title);
  const accuracy = week.answered > 0 ? `${pct((week.correct / week.answered) * 100)}%` : '—';
  const encourage =
    totals.answered > 0 ? 'parent.report.encourageGrow' : 'parent.report.encourageStart';

  return (
    <div className="cr">
      <header className="cr-head">
        <span className="cr-swatch" aria-hidden>
          <VisualView visual={{ kind: 'swatch', color: child.momoColor as Color }} size={56} />
        </span>
        <div>
          <h2 className="cr-name">{t('parent.report.title', { name: child.nickname })}</h2>
          <p className="ui-muted">
            {child.lastActiveAt
              ? t('parent.report.lastActive', { when: formatDate(child.lastActiveAt) })
              : t('parent.child.never')}
          </p>
        </div>
      </header>

      <p className="cr-encourage">{t(encourage, { name: child.nickname })}</p>

      <div className="cr-stats">
        <Stat
          label={t('parent.report.statJago')}
          value={t('parent.report.jagoOf', { jago: totals.jago, total: totals.skills })}
        />
        <Stat label={t('parent.report.statWeek')} value={week.answered} />
        <Stat
          label={t('parent.report.statAccuracy')}
          value={accuracy}
          hint={
            week.answered > 0
              ? t('parent.report.statAccuracyHint', {
                  correct: week.correct,
                  answered: week.answered,
                })
              : t('parent.report.statAccuracyNone')
          }
        />
      </div>

      <Card title={t('parent.report.today')}>
        <p className="ui-muted cr-gap">{t('parent.report.todayHint')}</p>
        {recommendations.length === 0 ? (
          <p>{t('parent.report.todayNone')}</p>
        ) : (
          <ol className="cr-recs">
            {recommendations.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{r.title}</strong>
                  {categoryTitle.has(r.category) && (
                    <small className="ui-muted cr-block">{categoryTitle.get(r.category)}</small>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ol>
        )}
      </Card>

      {areas.length === 0 && <p className="ui-empty">{t('parent.report.noAreas')}</p>}
      {areas.map((area) => (
        <Card key={`${area.domain}-${area.grade}`} title={area.title}>
          <div className="cr-area-top">
            <MasteryBar
              value={area.mastery}
              label={t('parent.report.masteryLabel', { area: area.title })}
            />
            <span className="cr-area-pct">
              {t('parent.report.mastery', { pct: pct(area.mastery) })}
            </span>
          </div>
          <p className="ui-muted cr-gap">
            {t('parent.report.jagoOf', { jago: area.jago, total: area.total })}{' '}
            {t('parent.status.Jago')}
          </p>
          <ul className="cr-cats">
            {area.categories.map((cat) => (
              <li key={cat.code}>
                <details className="cr-cat">
                  <summary>
                    <span className="cr-cat-title">{cat.title}</span>
                    <span className="cr-cat-count">
                      {t('parent.report.categoryJago', { jago: cat.jago, total: cat.total })}
                    </span>
                    <span className="cr-cat-bar" aria-hidden>
                      <span
                        className="cr-bar-fill"
                        style={{ width: `${cat.total ? pct((cat.jago / cat.total) * 100) : 0}%` }}
                      />
                    </span>
                  </summary>
                  <ul className="cr-skills">
                    {[...cat.skills]
                      .sort((a, b) => a.order - b.order)
                      .map((s) => (
                        <li key={s.id}>
                          <div className="cr-skill-main">
                            <span>{s.title}</span>
                            {s.answered > 0 && (
                              <small className="ui-muted">
                                {t('parent.report.answered', {
                                  correct: s.correct,
                                  answered: s.answered,
                                })}
                              </small>
                            )}
                          </div>
                          <div className="ui-row cr-skill-tags">
                            <StatusBadge status={s.status} />
                            {s.level && (
                              <Badge tone={s.level.passed ? 'success' : 'warning'}>
                                {t(
                                  s.level.passed
                                    ? 'parent.report.levelPassed'
                                    : 'parent.report.levelFailed',
                                  { score: s.level.best },
                                )}
                              </Badge>
                            )}
                            {s.needsReview && (
                              <span title={t('parent.report.needsReviewHint')}>
                                <Badge tone="info">{t('parent.report.needsReview')}</Badge>
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
