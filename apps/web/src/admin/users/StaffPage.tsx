import { useState, type FormEvent } from 'react';
import type { StaffUser } from '../../api/types';
import { useSession } from '../../auth/session';
import { useApiCall, useFetch } from '../../auth/useApi';
import { t } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  formatDate,
  PageHeader,
  SelectField,
  Table,
  TextField,
  type Column,
} from '../../ui/ui';
import { ActionNotice, ActiveBadge, Icon, Loadable, useAction } from '../common';
import { MIN_PASSWORD, PasswordSetter } from './PasswordSetter';

type Role = StaffUser['role'];
const roleOptions = () => [
  { value: 'admin', label: t('admin.role.admin') },
  { value: 'facilitator', label: t('admin.role.facilitator') },
];

function CreateStaff({ onCreated }: { onCreated: (u: StaffUser) => void }) {
  const call = useApiCall('staff');
  const action = useAction();
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'facilitator' as Role,
    password: '',
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    const out = await action.run(
      () => call<StaffUser>('/admin/staff', { method: 'POST', body: form }),
      t('admin.staff.created', { name: form.name }),
    );
    if (out) {
      onCreated(out);
      setForm({ name: '', email: '', role: 'facilitator', password: '' });
    }
  }
  return (
    <Card title={t('admin.staff.createTitle')}>
      <ActionNotice error={action.error} done={action.done} />
      <form onSubmit={submit}>
        <div className="adm-fields">
          <TextField
            label={t('admin.user.name')}
            required
            maxLength={60}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label={t('admin.user.email')}
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <SelectField
            label={t('admin.user.role')}
            value={form.role}
            options={roleOptions()}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
          />
          <TextField
            label={t('admin.user.password')}
            hint={t('admin.user.passwordHint', { n: MIN_PASSWORD })}
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <Button type="submit" disabled={action.busy}>
          <Icon name="plus" />
          {t('admin.staff.create')}
        </Button>
      </form>
    </Card>
  );
}

export function StaffPage() {
  const staff = useFetch<StaffUser[]>('staff', '/admin/staff');
  const me = useSession('staff');
  const call = useApiCall('staff');
  const action = useAction();

  async function patch(
    u: StaffUser,
    body: Partial<Pick<StaffUser, 'role' | 'active'>> | { password: string },
    done: string,
  ) {
    const out = await action.run(
      () => call<StaffUser>(`/admin/staff/${u.id}`, { method: 'PATCH', body }),
      done,
    );
    if (out) staff.setData((xs) => xs?.map((x) => (x.id === u.id ? { ...x, ...out } : x)));
    return !!out;
  }

  const columns: Column<StaffUser>[] = [
    {
      key: 'name',
      label: t('admin.user.name'),
      render: (u) => (
        <>
          <strong>{u.name}</strong>{' '}
          {u.id === me?.user.id && <Badge tone="info">{t('admin.staff.you')}</Badge>}
          <div className="ui-muted">{u.email}</div>
        </>
      ),
    },
    {
      key: 'role',
      label: t('admin.user.role'),
      render: (u) => (
        <select
          aria-label={t('admin.staff.roleFor', { name: u.name })}
          value={u.role}
          disabled={action.busy}
          onChange={(e) =>
            void patch(
              u,
              { role: e.target.value as Role },
              t('admin.staff.roleChanged', { name: u.name }),
            )
          }
        >
          {roleOptions().map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'active',
      label: t('admin.col.status'),
      render: (u) => <ActiveBadge active={u.active} />,
    },
    { key: 'created', label: t('admin.col.created'), render: (u) => formatDate(u.createdAt) },
    {
      key: 'actions',
      label: t('admin.col.actions'),
      render: (u) => (
        <div className="ui-row">
          <Button
            variant={u.active ? 'danger' : 'secondary'}
            disabled={action.busy}
            onClick={() =>
              void patch(
                u,
                { active: !u.active },
                u.active
                  ? t('admin.staff.deactivated', { name: u.name })
                  : t('admin.staff.activated', { name: u.name }),
              )
            }
          >
            {u.active ? t('admin.user.deactivate') : t('admin.user.activate')}
          </Button>
          <PasswordSetter
            busy={action.busy}
            onSubmit={(password) =>
              patch(u, { password }, t('admin.user.passwordSet', { name: u.name }))
            }
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t('admin.staff.title')} subtitle={t('admin.staff.subtitle')} />
      <Card title={t('admin.staff.listTitle')}>
        <ActionNotice error={action.error} done={action.done} />
        <Loadable loading={staff.loading} error={staff.error} hasData={!!staff.data}>
          {() => <Table rows={staff.data!} columns={columns} rowKey={(u) => u.id} />}
        </Loadable>
      </Card>
      <CreateStaff onCreated={(u) => staff.setData((xs) => [...(xs ?? []), u])} />
    </>
  );
}
