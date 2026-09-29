import { Link } from 'react-router-dom';
import type { LevelRow } from '../../api/types';
import { useFetch } from '../../auth/useApi';
import { t } from '../../i18n';
import { Card, PageHeader, Table, type Column } from '../../ui/ui';
import { Icon, levelPath, Loadable, StatusBadge } from '../common';

export function LevelList() {
  const levels = useFetch<LevelRow[]>('staff', '/admin/levels');
  const columns: Column<LevelRow>[] = [
    {
      key: 'id',
      label: t('admin.col.id'),
      render: (l) => <Link to={levelPath(l.id)}>{l.id}</Link>,
    },
    { key: 'world', label: t('admin.col.world'), render: (l) => `${l.world}.${l.index}` },
    { key: 'type', label: t('admin.col.type'), render: (l) => <code>{l.data.type}</code> },
    { key: 'tier', label: t('admin.col.tier'), render: (l) => l.tier },
    { key: 'role', label: t('admin.col.role'), render: (l) => l.data.role },
    { key: 'version', label: t('admin.col.version'), render: (l) => `v${l.version}` },
    {
      key: 'status',
      label: t('admin.col.status'),
      render: (l) => <StatusBadge status={l.status} />,
    },
  ];
  return (
    <>
      <PageHeader
        title={t('admin.level.title')}
        subtitle={t('admin.level.subtitle')}
        actions={
          <Link className="ui-btn ui-btn-primary" to="/admin/level/baru">
            <Icon name="plus" />
            {t('admin.level.new')}
          </Link>
        }
      />
      <Card>
        <Loadable loading={levels.loading} error={levels.error} hasData={!!levels.data}>
          {() => (
            <Table
              rows={levels.data!}
              columns={columns}
              rowKey={(l) => l.id}
              empty={t('admin.level.empty')}
            />
          )}
        </Loadable>
      </Card>
    </>
  );
}
