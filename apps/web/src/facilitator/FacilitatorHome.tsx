import { Link } from 'react-router-dom';
import type { Color } from '@little-coder/engine';
import type { FacilitatorInsights } from '../admin/insightsTypes';
import { Loadable } from '../admin/common';
import { useFetch } from '../auth/useApi';
import { Momo } from '../components/Momo';
import { t } from '../i18n';
import { ShellIconSvg } from '../ui/AppShell';
import { CountUp, DayBars, Kpi, Meter } from '../ui/charts';
import { Badge, Empty, PageHeader, formatDate } from '../ui/ui';

const shortDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('id-ID', { weekday: 'short', timeZone: 'UTC' });

/** Ringkasan guru (D-039): hanya kelas miliknya — aktivitas, tingkat lulus, siswa yang perlu dibantu. */
export function FacilitatorHome() {
  const res = useFetch<FacilitatorInsights>('staff', '/facilitator/insights');
  return (
    <>
      <PageHeader title={t('admin.fac.title')} subtitle={t('admin.fac.subtitle')} />
      <Loadable loading={res.loading} error={res.error} hasData={!!res.data}>
        {() => {
          const d = res.data!;
          return (
            <>
              <div className="ins-kpis five">
                <Kpi
                  i={0}
                  tone="grape"
                  icon={<ShellIconSvg name="school" />}
                  label={t('admin.fac.kClasses')}
                  value={<CountUp value={d.totals.classes} />}
                />
                <Kpi
                  i={1}
                  tone="leaf"
                  icon={<ShellIconSvg name="users" />}
                  label={t('admin.fac.kStudents')}
                  value={<CountUp value={d.totals.students} />}
                />
                <Kpi
                  i={2}
                  tone="sky"
                  icon={<ShellIconSvg name="play" />}
                  label={t('admin.fac.kActive')}
                  value={<CountUp value={d.totals.active7} />}
                />
                <Kpi
                  i={3}
                  tone="sun"
                  icon={<ShellIconSvg name="book" />}
                  label={t('admin.fac.kRounds')}
                  value={<CountUp value={d.totals.rounds7} />}
                />
                <Kpi
                  i={4}
                  tone="coral"
                  icon={<ShellIconSvg name="chart" />}
                  label={t('admin.fac.kPass')}
                  value={d.totals.passRate7 === null ? '–' : `${d.totals.passRate7}%`}
                />
              </div>

              <div className="ins-grid">
                <section className="ins-panel pd-rise">
                  <div className="ins-panel-head">
                    <h2>{t('admin.fac.chart')}</h2>
                  </div>
                  <DayBars
                    data={d.series.map((x) => ({ date: x.date, value: x.rounds }))}
                    label={t('admin.fac.chart')}
                    dayLabel={shortDay}
                  />
                </section>
                <section className="ins-panel pd-rise">
                  <div className="ins-panel-head">
                    <h2>{t('admin.fac.help')}</h2>
                  </div>
                  {d.needsHelp.length === 0 ? (
                    <Empty>{t('admin.fac.helpEmpty')}</Empty>
                  ) : (
                    <ul className="ins-people">
                      {d.needsHelp.map((h) => (
                        <li key={`${h.childId}-${h.level}`}>
                          <Momo color={h.momoColor as Color} mood="curious" size={36} />
                          <div>
                            <strong>
                              {h.nickname} <small>· {h.className}</small>
                            </strong>
                            <small>
                              {t('admin.fac.helpRow', {
                                level: h.level,
                                best: h.best,
                                attempts: h.attempts,
                              })}
                            </small>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <section className="ins-panel pd-rise">
                <div className="ins-panel-head">
                  <h2>{t('admin.fac.classesTitle')}</h2>
                  <Link className="ui-btn ui-btn-secondary" to="/fasilitator/kelas">
                    {t('admin.fac.newClass')}
                  </Link>
                </div>
                {d.classes.length === 0 ? (
                  <Empty>{t('admin.fac.noClasses')}</Empty>
                ) : (
                  <ul className="ins-classes">
                    {d.classes.map((c) => (
                      <li key={c.id} className={c.closed ? 'is-closed' : ''}>
                        <div className="ins-class-head">
                          <strong>{c.eventName}</strong>
                          <code>{c.code}</code>
                          {c.closed ? (
                            <Badge tone="muted">{t('admin.fac.closedTag')}</Badge>
                          ) : c.frozen ? (
                            <Badge tone="warning">{t('admin.fac.frozenTag')}</Badge>
                          ) : null}
                        </div>
                        <small>
                          {t('admin.fac.classStats', {
                            active: c.active7,
                            students: c.students,
                            rounds: c.rounds7,
                          })}
                        </small>
                        <Meter value={c.active7} max={Math.max(1, c.students)} tone="leaf" />
                        <small>
                          {c.passRate7 === null
                            ? t('admin.fac.classNoPlay')
                            : t('admin.fac.classPass', { pct: c.passRate7, avg: c.avgScore7 ?? 0 })}
                        </small>
                        <Link to={`/fasilitator/kelas/${c.id}`}>{t('admin.fac.open')}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="ins-panel pd-rise">
                <div className="ins-panel-head">
                  <h2>{t('admin.fac.recent')}</h2>
                </div>
                {d.recent.length === 0 ? (
                  <Empty>{t('admin.fac.recentEmpty')}</Empty>
                ) : (
                  <ul className="ins-people">
                    {d.recent.map((r) => (
                      <li key={`${r.nickname}-${r.ts}`}>
                        <Momo
                          color={r.momoColor as Color}
                          mood={r.score >= 70 ? 'proud' : 'curious'}
                          size={36}
                        />
                        <div>
                          <strong>
                            {r.nickname} <small>· {r.className}</small>
                          </strong>
                          <small>
                            {t('admin.fac.recentRow', { level: r.level, score: r.score })} ·{' '}
                            {formatDate(r.ts)}
                          </small>
                        </div>
                        <span className={`pd-score ${r.score >= 70 ? 'is-pass' : 'is-try'}`}>
                          {r.score}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          );
        }}
      </Loadable>
    </>
  );
}
