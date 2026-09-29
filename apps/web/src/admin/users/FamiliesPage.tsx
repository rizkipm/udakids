import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PinPicture } from '@little-coder/engine';
import type { ParentRow } from '../../api/types';
import { useApiCall, useFetch } from '../../auth/useApi';
import { t } from '../../i18n';
import { Button, Card, Empty, formatDate, PageHeader, TextField } from '../../ui/ui';
import {
  ActionNotice,
  ActiveBadge,
  childReportPath,
  ColorDot,
  Loadable,
  useAction,
} from '../common';
import { PasswordSetter } from './PasswordSetter';
import { PinPicker } from './PinPicker';

type Child = ParentRow['children'][number];

export function FamiliesPage() {
  const parents = useFetch<ParentRow[]>('staff', '/admin/parents');
  const call = useApiCall('staff');
  const action = useAction();
  const [query, setQuery] = useState('');
  const [pinFor, setPinFor] = useState<string>();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (parents.data ?? []).filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.familyCode.toLowerCase().includes(q) ||
        p.children.some((c) => c.nickname.toLowerCase().includes(q)),
    );
  }, [parents.data, query]);

  const updateParent = (id: string, patch: Partial<ParentRow>) =>
    parents.setData((xs) => xs?.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const updateChild = (c: Child, patch: Partial<Child>) =>
    parents.setData((xs) =>
      xs?.map((p) =>
        p.id === c.parentId
          ? { ...p, children: p.children.map((k) => (k.id === c.id ? { ...k, ...patch } : k)) }
          : p,
      ),
    );

  async function toggleParent(p: ParentRow) {
    const out = await action.run(
      () =>
        call(`/admin/parents/${p.id}`, { method: 'PATCH', body: { active: !p.active } }).then(
          () => true,
        ),
      p.active
        ? t('admin.family.parentOff', { name: p.name })
        : t('admin.family.parentOn', { name: p.name }),
    );
    if (out) updateParent(p.id, { active: !p.active });
  }
  async function setPassword(p: ParentRow, password: string) {
    const out = await action.run(
      () =>
        call(`/admin/parents/${p.id}/password`, { method: 'POST', body: { password } }).then(
          () => true,
        ),
      t('admin.user.passwordSet', { name: p.name }),
    );
    return out === true;
  }
  async function toggleChild(c: Child) {
    const out = await action.run(
      () =>
        call(`/admin/children/${c.id}`, { method: 'PATCH', body: { active: !c.active } }).then(
          () => true,
        ),
      c.active
        ? t('admin.family.childOff', { name: c.nickname })
        : t('admin.family.childOn', { name: c.nickname }),
    );
    if (out) updateChild(c, { active: !c.active });
  }
  async function setPin(c: Child, pin: PinPicture[]) {
    const out = await action.run(
      () => call(`/admin/children/${c.id}/pin`, { method: 'POST', body: { pin } }).then(() => true),
      t('admin.pin.saved', { name: c.nickname }),
    );
    if (out) setPinFor(undefined);
  }

  return (
    <>
      <PageHeader title={t('admin.family.title')} subtitle={t('admin.family.subtitle')} />
      <Card>
        <TextField
          label={t('admin.family.search')}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('admin.family.searchPlaceholder')}
        />
        <ActionNotice error={action.error} done={action.done} />
      </Card>
      <Loadable loading={parents.loading} error={parents.error} hasData={!!parents.data}>
        {() =>
          rows.length === 0 ? (
            <Empty>{t('admin.family.empty')}</Empty>
          ) : (
            rows.map((p) => (
              <Card
                key={p.id}
                title={
                  <>
                    {p.name} <ActiveBadge active={p.active} />
                  </>
                }
                actions={
                  <>
                    <Button
                      variant={p.active ? 'danger' : 'secondary'}
                      disabled={action.busy}
                      onClick={() => void toggleParent(p)}
                    >
                      {p.active ? t('admin.user.deactivate') : t('admin.user.activate')}
                    </Button>
                    <PasswordSetter busy={action.busy} onSubmit={(pw) => setPassword(p, pw)} />
                  </>
                }
              >
                <p className="ui-muted" style={{ marginBottom: 10 }}>
                  {p.email} · {t('admin.family.code')}:{' '}
                  <span className="adm-code-small">{p.familyCode}</span> ·{' '}
                  {t('admin.family.consent')}: {formatDate(p.consentAt)}
                </p>
                {p.children.length === 0 ? (
                  <Empty>{t('admin.family.noChildren')}</Empty>
                ) : (
                  <ul className="adm-kids">
                    {p.children.map((c) => (
                      <li key={c.id} className={c.active ? undefined : 'adm-muted-row'}>
                        <div className="ui-row" style={{ justifyContent: 'space-between' }}>
                          <span>
                            <ColorDot color={c.momoColor} />
                            <strong>{c.nickname}</strong>{' '}
                            <span className="ui-muted">
                              {t('admin.family.lastActive', { date: formatDate(c.lastActiveAt) })}
                            </span>{' '}
                            {!c.active && <ActiveBadge active={false} />}
                          </span>
                          <span className="ui-row">
                            <Link className="ui-btn ui-btn-ghost" to={childReportPath(c.id)}>
                              {t('admin.family.report')}
                            </Link>
                            <Button
                              variant="ghost"
                              onClick={() => setPinFor(pinFor === c.id ? undefined : c.id)}
                            >
                              {t('admin.pin.reset')}
                            </Button>
                            <Button
                              variant={c.active ? 'danger' : 'secondary'}
                              disabled={action.busy}
                              onClick={() => void toggleChild(c)}
                            >
                              {c.active ? t('admin.user.deactivate') : t('admin.user.activate')}
                            </Button>
                          </span>
                        </div>
                        {pinFor === c.id && (
                          <div style={{ marginTop: 10 }}>
                            <PinPicker
                              busy={action.busy}
                              onCancel={() => setPinFor(undefined)}
                              onSubmit={(pin) => void setPin(c, pin)}
                            />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))
          )
        }
      </Loadable>
    </>
  );
}
