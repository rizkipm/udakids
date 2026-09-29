import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GRADE_LABEL } from '@little-coder/engine';
import type { CatalogRow, SkillRow } from '../../api/types';
import { useFetch } from '../../auth/useApi';
import { t } from '../../i18n';
import {
  Badge,
  Card,
  Empty,
  PageHeader,
  SelectField,
  Table,
  TextField,
  type Column,
} from '../../ui/ui';
import { Icon, Loadable, skillPath, StatusBadge } from '../common';

type Group = {
  key: string;
  title: string;
  categories: { code: string; title: string; rows: SkillRow[] }[];
};

/** Kelompokkan skill per katalog (domain+grade) lalu per kategori, memakai judul katalog. */
export function groupSkills(rows: SkillRow[], catalogs: CatalogRow[]): Group[] {
  const groups = new Map<string, Group>();
  for (const r of rows) {
    const key = `${r.domain}/${r.grade}`;
    const cat = catalogs.find((c) => c.domain === r.domain && c.grade === r.grade);
    let g = groups.get(key);
    if (!g) {
      const gradeLabel = GRADE_LABEL[r.grade as keyof typeof GRADE_LABEL] ?? r.grade;
      g = { key, title: cat?.title ?? `${r.domain} ${gradeLabel}`, categories: [] };
      groups.set(key, g);
    }
    let c = g.categories.find((x) => x.code === r.category);
    if (!c) {
      const title = cat?.categories.find((x) => x.code === r.category)?.title ?? '';
      c = { code: r.category, title, rows: [] };
      g.categories.push(c);
    }
    c.rows.push(r);
  }
  for (const g of groups.values()) {
    g.categories.sort((a, b) => a.code.length - b.code.length || a.code.localeCompare(b.code));
    for (const c of g.categories) c.rows.sort((a, b) => a.order - b.order);
  }
  return [...groups.values()];
}

export function SkillList() {
  const skills = useFetch<SkillRow[]>('staff', '/admin/skills');
  const catalogs = useFetch<CatalogRow[]>('staff', '/admin/catalogs');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'draft'>('all');
  const [kind, setKind] = useState<'all' | 'generator' | 'manual'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (skills.data ?? []).filter(
      (s) =>
        (status === 'all' || s.status === status) &&
        (kind === 'all' || (kind === 'manual') === (s.template.family === 'manual')) &&
        (!q ||
          s.title.toLowerCase().includes(q) ||
          s.id.includes(q) ||
          s.template.family.includes(q)),
    );
  }, [skills.data, query, status, kind]);
  const groups = useMemo(
    () => groupSkills(filtered, catalogs.data ?? []),
    [filtered, catalogs.data],
  );

  const columns: Column<SkillRow>[] = [
    {
      key: 'order',
      label: t('admin.col.order'),
      width: '70px',
      render: (s) => `${s.category}.${s.order}`,
    },
    {
      key: 'title',
      label: t('admin.col.title'),
      render: (s) => <Link to={skillPath(s.id)}>{s.title}</Link>,
    },
    {
      key: 'family',
      label: t('admin.col.family'),
      render: (s) =>
        s.template.family === 'manual' ? (
          <Badge tone="info">{t('admin.skill.manualBadge')}</Badge>
        ) : (
          <code>{s.template.family}</code>
        ),
    },
    {
      key: 'status',
      label: t('admin.col.status'),
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: 'version',
      label: t('admin.col.version'),
      width: '70px',
      render: (s) => `v${s.version}`,
    },
  ];

  return (
    <>
      <PageHeader
        title={t('admin.skill.title')}
        subtitle={t('admin.skill.subtitle')}
        actions={
          <>
            <Link className="ui-btn ui-btn-primary" to="/admin/skill/baru">
              <Icon name="plus" />
              {t('admin.skill.new')}
            </Link>
            <Link className="ui-btn ui-btn-secondary" to="/admin/skill/manual-baru">
              <Icon name="plus" />
              {t('admin.skill.newManual')}
            </Link>
          </>
        }
      />
      <Card>
        <div className="adm-fields">
          <TextField
            label={t('admin.skill.search')}
            type="search"
            value={query}
            placeholder={t('admin.skill.searchPlaceholder')}
            onChange={(e) => setQuery(e.target.value)}
          />
          <SelectField
            label={t('admin.skill.filterStatus')}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            options={[
              { value: 'all', label: t('admin.filter.all') },
              { value: 'active', label: t('admin.status.active') },
              { value: 'draft', label: t('admin.status.draft') },
            ]}
          />
          <SelectField
            label={t('admin.skill.filterKind')}
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            options={[
              { value: 'all', label: t('admin.filter.all') },
              { value: 'generator', label: t('admin.skill.kindGenerator') },
              { value: 'manual', label: t('admin.skill.kindManual') },
            ]}
          />
        </div>
        <p className="ui-muted">
          {t('admin.skill.count', { n: filtered.length, total: skills.data?.length ?? 0 })}
        </p>
      </Card>
      <Loadable
        loading={skills.loading}
        error={skills.error ?? catalogs.error}
        hasData={!!skills.data}
      >
        {() =>
          groups.length === 0 ? (
            <Empty>{t('admin.skill.empty')}</Empty>
          ) : (
            groups.map((g) => (
              <Card key={g.key} title={g.title}>
                {g.categories.map((c) => (
                  <div key={c.code}>
                    <h3 className="adm-group-title">
                      {c.code}
                      {c.title && ` — ${c.title}`}{' '}
                      <span className="ui-muted">({c.rows.length})</span>
                    </h3>
                    <Table rows={c.rows} columns={columns} rowKey={(s) => s.id} />
                  </div>
                ))}
              </Card>
            ))
          )
        }
      </Loadable>
    </>
  );
}
