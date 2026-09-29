import { Link } from 'react-router-dom';
import type { Overview, SkillStat } from '../api/types';
import { useFetch } from '../auth/useApi';
import { t } from '../i18n';
import { Card, Empty, PageHeader, Stat, Table, type Column } from '../ui/ui';
import { Loadable, percent, skillPath } from './common';

export const MIN_ANSWERS_FOR_DIFFICULTY = 5;

/** Skill dengan akurasi terendah (minimal 5 jawaban). */
export function hardestSkills(stats: SkillStat[], limit = 8): SkillStat[] {
  return stats
    .filter((s) => s.answered >= MIN_ANSWERS_FOR_DIFFICULTY && s.accuracy !== null)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0) || b.answered - a.answered)
    .slice(0, limit);
}

export type DistractorTotal = { tag: string; count: number; skills: SkillStat[] };

/** Label miskonsepsi yang paling sering dipilih anak, dijumlah dari semua skill. */
export function popularDistractors(stats: SkillStat[], limit = 8): DistractorTotal[] {
  const map = new Map<string, DistractorTotal>();
  for (const s of stats) {
    for (const d of s.topDistractors) {
      const cur = map.get(d.tag) ?? { tag: d.tag, count: 0, skills: [] };
      cur.count += d.count;
      cur.skills.push(s);
      map.set(d.tag, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export function OverviewPage() {
  const overview = useFetch<Overview>('staff', '/admin/reports/overview');
  const skills = useFetch<SkillStat[]>('staff', '/admin/reports/skills');

  const hardCols: Column<SkillStat>[] = [
    {
      key: 'title',
      label: t('admin.col.skill'),
      render: (s) => (
        <Link to={skillPath(s.id)}>
          {s.category}.{s.order} {s.title}
        </Link>
      ),
    },
    { key: 'answered', label: t('admin.col.answered'), render: (s) => s.answered },
    { key: 'accuracy', label: t('admin.col.accuracy'), render: (s) => percent(s.accuracy) },
  ];
  const distCols: Column<DistractorTotal>[] = [
    { key: 'tag', label: t('admin.col.misconception'), render: (d) => <code>{d.tag}</code> },
    { key: 'count', label: t('admin.col.times'), render: (d) => d.count },
    {
      key: 'skills',
      label: t('admin.col.skills'),
      render: (d) =>
        d.skills
          .slice(0, 3)
          .map((s) => `${s.category}.${s.order}`)
          .join(', ') + (d.skills.length > 3 ? ` +${d.skills.length - 3}` : ''),
    },
  ];

  return (
    <>
      <PageHeader title={t('admin.overview.title')} subtitle={t('admin.overview.subtitle')} />
      <Loadable loading={overview.loading} error={overview.error} hasData={!!overview.data}>
        {() => {
          const o = overview.data!;
          return (
            <div className="ui-grid" style={{ marginBottom: 20 }}>
              <Stat label={t('admin.overview.children')} value={o.children} />
              <Stat label={t('admin.overview.parents')} value={o.parents} />
              <Stat label={t('admin.overview.staff')} value={o.staff} />
              <Stat label={t('admin.overview.skills')} value={o.skills} />
              <Stat label={t('admin.overview.answersWeek')} value={o.answersWeek} />
              <Stat label={t('admin.overview.activeWeek')} value={o.activeChildrenWeek} />
              <Stat label={t('admin.overview.jago')} value={o.jago} />
            </div>
          );
        }}
      </Loadable>
      <div className="adm-two">
        <Card title={t('admin.overview.hardest')}>
          <Loadable loading={skills.loading} error={skills.error} hasData={!!skills.data}>
            {() => {
              const rows = hardestSkills(skills.data!);
              return rows.length ? (
                <Table rows={rows} columns={hardCols} rowKey={(s) => s.id} />
              ) : (
                <Empty>{t('admin.overview.hardestEmpty', { n: MIN_ANSWERS_FOR_DIFFICULTY })}</Empty>
              );
            }}
          </Loadable>
        </Card>
        <Card title={t('admin.overview.distractors')}>
          <Loadable loading={skills.loading} error={skills.error} hasData={!!skills.data}>
            {() => {
              const rows = popularDistractors(skills.data!);
              return rows.length ? (
                <Table rows={rows} columns={distCols} rowKey={(d) => d.tag} />
              ) : (
                <Empty>{t('admin.overview.distractorsEmpty')}</Empty>
              );
            }}
          </Loadable>
        </Card>
      </div>
    </>
  );
}
