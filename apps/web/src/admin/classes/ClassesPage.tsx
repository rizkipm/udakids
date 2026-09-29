import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ClassRow, StaffUser } from '../../api/types';
import { useApiCall, useFetch } from '../../auth/useApi';
import { t } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  Empty,
  formatDate,
  PageHeader,
  SelectField,
  TextField,
} from '../../ui/ui';
import { ActionNotice, confirmAction, Icon, Loadable, useAction } from '../common';

function CreateClass({ staff, onCreated }: { staff: StaffUser[]; onCreated: () => void }) {
  const call = useApiCall('staff');
  const action = useAction();
  const [eventName, setEventName] = useState('');
  const [world, setWorld] = useState('');
  const [facilitatorId, setFacilitatorId] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = {
      eventName: eventName.trim(),
      ...(world && { world: Number(world) }),
      ...(facilitatorId && { facilitatorId }),
    };
    const out = await action.run(
      () => call<ClassRow>('/classes', { method: 'POST', body }),
      t('admin.class.created'),
    );
    if (out) {
      setEventName('');
      onCreated();
    }
  }

  return (
    <Card title={t('admin.class.createTitle')}>
      <ActionNotice error={action.error} done={action.done} />
      <form onSubmit={submit}>
        <div className="adm-fields">
          <TextField
            label={t('admin.class.eventName')}
            required
            maxLength={80}
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />
          <SelectField
            label={t('admin.class.world')}
            value={world}
            onChange={(e) => setWorld(e.target.value)}
            options={[
              { value: '', label: t('admin.class.worldAny') },
              ...Array.from({ length: 10 }, (_, i) => ({
                value: String(i + 1),
                label: t('admin.class.worldN', { n: i + 1 }),
              })),
            ]}
          />
          <SelectField
            label={t('admin.class.facilitator')}
            value={facilitatorId}
            onChange={(e) => setFacilitatorId(e.target.value)}
            options={[
              { value: '', label: t('admin.class.facilitatorMe') },
              ...staff
                .filter((s) => s.active && s.role === 'facilitator')
                .map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
        </div>
        <Button type="submit" disabled={action.busy}>
          <Icon name="plus" />
          {t('admin.class.create')}
        </Button>
      </form>
    </Card>
  );
}

export function ClassesPage({
  base = '/admin/kelas',
  canAssign = true,
}: {
  base?: string;
  canAssign?: boolean;
}) {
  const classes = useFetch<ClassRow[]>('staff', '/classes');
  const staff = useFetch<StaffUser[]>('staff', canAssign ? '/admin/staff' : null);
  const call = useApiCall('staff');
  const action = useAction();

  async function patch(c: ClassRow, body: { frozen?: boolean; closed?: boolean }, done: string) {
    const ok = await action.run(
      () => call(`/classes/${c.id}`, { method: 'PATCH', body }).then(() => true),
      done,
    );
    if (ok) classes.reload();
  }

  return (
    <>
      <PageHeader title={t('admin.class.title')} subtitle={t('admin.class.subtitle')} />
      <CreateClass staff={staff.data ?? []} onCreated={classes.reload} />
      <ActionNotice error={action.error} done={action.done} />
      <Loadable loading={classes.loading} error={classes.error} hasData={!!classes.data}>
        {() =>
          classes.data!.length === 0 ? (
            <Empty>{t('admin.class.empty')}</Empty>
          ) : (
            <div className="ui-grid">
              {classes.data!.map((c) => {
                const closed = !!c.closedAt;
                return (
                  <Card key={c.id} className={closed ? 'adm-muted-row' : undefined}>
                    <div className="ui-muted">{t('admin.class.code')}</div>
                    <div
                      className="adm-code"
                      aria-label={t('admin.class.codeLabel', { code: c.code })}
                    >
                      {c.code}
                    </div>
                    <h3 style={{ margin: '8px 0 4px' }}>{c.eventName}</h3>
                    <p className="ui-muted">
                      {c.world
                        ? t('admin.class.worldN', { n: c.world })
                        : t('admin.class.worldAny')}
                      {' · '}
                      {c.facilitatorName ?? '—'}
                    </p>
                    <p className="ui-muted">{formatDate(c.createdAt)}</p>
                    <Link
                      className="ui-btn ui-btn-primary adm-students-link"
                      to={`${base}/${c.id}`}
                    >
                      {t('admin.roster.open')}
                    </Link>
                    <div className="ui-row" style={{ margin: '10px 0' }}>
                      {closed ? (
                        <Badge tone="muted">
                          {t('admin.class.closed', { date: formatDate(c.closedAt) })}
                        </Badge>
                      ) : c.frozen ? (
                        <Badge tone="warning">{t('admin.class.frozen')}</Badge>
                      ) : (
                        <Badge tone="success">{t('admin.class.running')}</Badge>
                      )}
                    </div>
                    {!closed && (
                      <div className="ui-row">
                        <Button
                          variant="secondary"
                          disabled={action.busy}
                          onClick={() =>
                            void patch(
                              c,
                              { frozen: !c.frozen },
                              c.frozen
                                ? t('admin.class.unfrozenDone')
                                : t('admin.class.frozenDone'),
                            )
                          }
                        >
                          {c.frozen ? t('admin.class.unfreeze') : t('admin.class.freeze')}
                        </Button>
                        <Button
                          variant="danger"
                          disabled={action.busy}
                          onClick={() => {
                            if (
                              confirmAction(t('admin.class.closeConfirm', { name: c.eventName }))
                            ) {
                              void patch(c, { closed: true }, t('admin.class.closedDone'));
                            }
                          }}
                        >
                          {t('admin.class.close')}
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )
        }
      </Loadable>
    </>
  );
}
