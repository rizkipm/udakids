import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ChildSummary, SkillStat } from '../../api/types';
import { useFetch } from '../../auth/useApi';
import { t } from '../../i18n';
import {
  Badge,
  Card,
  Checkbox,
  formatDate,
  PageHeader,
  SelectField,
  Table,
  type Column,
} from '../../ui/ui';
import { childReportPath, ColorDot, Loadable, percent, skillPath } from '../common';

export type SkillSort = 'accuracy-asc' | 'accuracy-desc' | 'answered-desc' | 'order';

/** Urutkan & saring statistik skill. Akurasi null (belum dijawab) selalu di akhir. */
export function sortSkillStats(
  rows: SkillStat[],
  opts: { sort: SkillSort; category: string; answeredOnly: boolean },
): SkillStat[] {
  const out = rows.filter(
    (r) =>
      (opts.category === '' || r.category === opts.category) &&
      (!opts.answeredOnly || r.answered > 0),
  );
  const acc = (r: SkillStat, dir: 1 | -1) => (r.accuracy === null ? Infinity : dir * r.accuracy);
  const byOrder = (a: SkillStat, b: SkillStat) =>
    a.category.length - b.category.length ||
    a.category.localeCompare(b.category) ||
    a.order - b.order;
  return [...out].sort((a, b) => {
    switch (opts.sort) {
      case 'accuracy-asc':
        return acc(a, 1) - acc(b, 1) || byOrder(a, b);
      case 'accuracy-desc':
        return acc(a, -1) - acc(b, -1) || byOrder(a, b);
      case 'answered-desc':
        return b.answered - a.answered || byOrder(a, b);
      default:
        return byOrder(a, b);
    }
  });
}

function SkillStats() {
  const stats = useFetch<SkillStat[]>('staff', '/admin/reports/skills');
  const [sort, setSort] = useState<SkillSort>('accuracy-asc');
  const [category, setCategory] = useState('');
  const [answeredOnly, setAnsweredOnly] = useState(true);
  const rows = useMemo(
    () => sortSkillStats(stats.data ?? [], { sort, category, answeredOnly }),
    [stats.data, sort, category, answeredOnly],
  );
  const categories = useMemo(
    () =>
      [...new Set((stats.data ?? []).map((s) => s.category))].sort(
        (a, b) => a.length - b.length || a.localeCompare(b),
      ),
    [stats.data],
  );
  const columns: Column<SkillStat>[] = [
    { key: 'code', label: t('admin.col.order'), render: (s) => `${s.category}.${s.order}` },
    {
      key: 'title',
      label: t('admin.col.skill'),
      render: (s) => <Link to={skillPath(s.id)}>{s.title}</Link>,
    },
    { key: 'answered', label: t('admin.col.answered'), render: (s) => s.answered },
    { key: 'accuracy', label: t('admin.col.accuracy'), render: (s) => percent(s.accuracy) },
    { key: 'learners', label: t('admin.col.learners'), render: (s) => s.learners },
    { key: 'jago', label: t('admin.col.jago'), render: (s) => s.jago },
    {
      key: 'dist',
      label: t('admin.col.misconception'),
      render: (s) =>
        s.topDistractors.length ? (
          <span className="adm-tags">
            {s.topDistractors.map((d) => (
              <Badge key={d.tag} tone="warning">
                {d.tag} ×{d.count}
              </Badge>
            ))}
          </span>
        ) : (
          '—'
        ),
    },
  ];
  return (
    <Card title={t('admin.report.skillsTitle')}>
      <div className="adm-fields">
        <SelectField
          label={t('admin.report.sort')}
          value={sort}
          onChange={(e) => setSort(e.target.value as SkillSort)}
          options={[
            { value: 'accuracy-asc', label: t('admin.report.sortAccAsc') },
            { value: 'accuracy-desc', label: t('admin.report.sortAccDesc') },
            { value: 'answered-desc', label: t('admin.report.sortAnswered') },
            { value: 'order', label: t('admin.report.sortOrder') },
          ]}
        />
        <SelectField
          label={t('admin.report.category')}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={[
            { value: '', label: t('admin.filter.all') },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
        />
      </div>
      <Checkbox
        label={t('admin.report.answeredOnly')}
        checked={answeredOnly}
        onChange={(e) => setAnsweredOnly(e.target.checked)}
      />
      <Loadable loading={stats.loading} error={stats.error} hasData={!!stats.data}>
        {() => (
          <Table
            rows={rows}
            columns={columns}
            rowKey={(s) => s.id}
            empty={t('admin.report.skillsEmpty')}
          />
        )}
      </Loadable>
    </Card>
  );
}

function ChildrenStats() {
  const kids = useFetch<ChildSummary[]>('staff', '/admin/children');
  const columns: Column<ChildSummary>[] = [
    {
      key: 'nick',
      label: t('admin.col.child'),
      render: (c) => (
        <Link to={childReportPath(c.id)}>
          <ColorDot color={c.momoColor} />
          {c.nickname}
        </Link>
      ),
    },
    { key: 'parent', label: t('admin.col.parent'), render: (c) => c.parentName ?? '—' },
    { key: 'answered', label: t('admin.col.answered'), render: (c) => c.answered },
    { key: 'jago', label: t('admin.col.jago'), render: (c) => c.jago },
    { key: 'last', label: t('admin.col.lastActive'), render: (c) => formatDate(c.lastActiveAt) },
    {
      key: 'active',
      label: t('admin.col.status'),
      render: (c) => (c.active ? '' : <Badge tone="muted">{t('admin.user.inactive')}</Badge>),
    },
  ];
  return (
    <Card title={t('admin.report.childrenTitle')}>
      <Loadable loading={kids.loading} error={kids.error} hasData={!!kids.data}>
        {() => (
          <Table
            rows={[...kids.data!].sort((a, b) => b.answered - a.answered)}
            columns={columns}
            rowKey={(c) => c.id}
            empty={t('admin.report.childrenEmpty')}
          />
        )}
      </Loadable>
    </Card>
  );
}

export function ReportsPage() {
  return (
    <>
      <PageHeader title={t('admin.report.title')} subtitle={t('admin.report.subtitle')} />
      <SkillStats />
      <ChildrenStats />
    </>
  );
}
