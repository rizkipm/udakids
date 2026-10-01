import { useState, type FormEvent } from 'react';
import { formatRupiah, totalPercentBp } from '@little-coder/engine';
import { useApiCall, useFetch } from '../../auth/useApi';
import { t } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  formatDate,
  Notice,
  PageHeader,
  RequiredNote,
  Table,
  TextField,
  type Column,
} from '../../ui/ui';
import { ActionNotice, ActiveBadge, confirmAction, Icon, Loadable, useAction } from '../common';
import { signedRupiah, SummaryStats } from './CashPage';
import type { Commission, CommissionShare, Owner } from './types';
import { bpToPercent, monthLabel, percentToBp, thisMonth } from './util';

function OwnerEditor({
  editing,
  owners,
  onSaved,
  onCancel,
}: {
  editing: Owner | null;
  owners: Owner[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const call = useApiCall('staff');
  const action = useAction();
  const [name, setName] = useState(editing?.name ?? '');
  const [percent, setPercent] = useState(editing ? bpToPercent(editing.percentBp) : '');
  const [active, setActive] = useState(editing?.active ?? true);
  const bp = percentToBp(percent);
  const others = owners.filter((o) => o.id !== editing?.id);
  const total = totalPercentBp([...others, { percentBp: Number.isFinite(bp) ? bp : 0, active }]);
  const over = total > 10_000;
  const invalid = percent.trim() !== '' && (!Number.isFinite(bp) || bp < 1 || bp > 10_000);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = { name: name.trim(), percentBp: bp, active };
    const out = await action.run(
      () =>
        editing
          ? call<Owner>(`/admin/finance/owners/${editing.id}`, { method: 'PUT', body })
          : call<Owner>('/admin/finance/owners', { method: 'POST', body }),
      t('admin.owner.saved', { name: body.name }),
    );
    if (out) {
      if (!editing) {
        setName('');
        setPercent('');
        setActive(true);
      }
      onSaved();
    }
  }

  return (
    <Card
      title={
        editing ? t('admin.owner.editTitle', { name: editing.name }) : t('admin.owner.createTitle')
      }
    >
      <ActionNotice error={action.error} done={action.done} />
      <form onSubmit={submit}>
        <RequiredNote />
        <div className="adm-fields">
          <TextField
            label={t('admin.owner.name')}
            required
            minLength={2}
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label={t('admin.owner.percent')}
            hint={t('admin.owner.percentHint')}
            error={invalid ? t('admin.owner.percentInvalid') : undefined}
            required
            inputMode="decimal"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
          />
        </div>
        <Checkbox
          label={t('admin.owner.active')}
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        {over && (
          <Notice tone="warning">
            {t('admin.owner.overLimit', { total: bpToPercent(total) })}
          </Notice>
        )}
        <div className="ui-row">
          <Button type="submit" disabled={action.busy || invalid || over}>
            {editing ? (
              t('admin.save')
            ) : (
              <>
                <Icon name="plus" />
                {t('admin.owner.create')}
              </>
            )}
          </Button>
          {editing && (
            <Button variant="ghost" onClick={onCancel}>
              {t('admin.cancel')}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

function Owners({ onChanged }: { onChanged: () => void }) {
  const owners = useFetch<Owner[]>('staff', '/admin/finance/owners');
  const call = useApiCall('staff');
  const action = useAction();
  const [editing, setEditing] = useState<Owner | null>(null);
  const list = owners.data ?? [];
  const total = totalPercentBp(list);

  const changed = () => {
    setEditing(null);
    owners.reload();
    onChanged();
  };

  async function remove(o: Owner) {
    if (!confirmAction(t('admin.owner.deleteConfirm', { name: o.name }))) return;
    const ok = await action.run(
      () => call(`/admin/finance/owners/${o.id}`, { method: 'DELETE' }).then(() => true),
      t('admin.owner.deleted', { name: o.name }),
    );
    if (ok) changed();
  }

  const columns: Column<Owner>[] = [
    { key: 'name', label: t('admin.owner.name'), render: (o) => <strong>{o.name}</strong> },
    {
      key: 'percent',
      label: t('admin.owner.percent'),
      render: (o) => `${bpToPercent(o.percentBp)}%`,
    },
    {
      key: 'active',
      label: t('admin.col.status'),
      render: (o) => <ActiveBadge active={o.active} />,
    },
    {
      key: 'actions',
      label: t('admin.col.actions'),
      render: (o) => (
        <div className="ui-row">
          <Button variant="secondary" onClick={() => setEditing(o)}>
            {t('admin.edit')}
          </Button>
          <Button
            variant="danger"
            disabled={action.busy}
            aria-label={t('admin.owner.deleteLabel', { name: o.name })}
            onClick={() => void remove(o)}
          >
            <Icon name="trash" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card
        title={t('admin.owner.listTitle')}
        actions={
          <Badge tone={total > 10_000 ? 'warning' : total === 10_000 ? 'success' : 'info'}>
            {t('admin.owner.total', { total: bpToPercent(total) })}
          </Badge>
        }
      >
        <ActionNotice error={action.error} done={action.done} />
        <Loadable loading={owners.loading} error={owners.error} hasData={!!owners.data}>
          {() => (
            <Table
              rows={list}
              columns={columns}
              rowKey={(o) => o.id}
              empty={t('admin.owner.empty')}
            />
          )}
        </Loadable>
        <p className="ui-muted">{t('admin.owner.hint')}</p>
      </Card>
      <OwnerEditor
        key={editing?.id ?? 'new'}
        editing={editing}
        owners={list}
        onSaved={changed}
        onCancel={() => setEditing(null)}
      />
    </>
  );
}

export function CommissionPage() {
  const [month, setMonth] = useState(thisMonth());
  const data = useFetch<Commission>('staff', `/admin/finance/commission?month=${month}`);
  const call = useApiCall('staff');
  const action = useAction();

  async function close() {
    if (!confirmAction(t('admin.comm.closeConfirm', { month: monthLabel(month) }))) return;
    const ok = await action.run(
      () =>
        call(`/admin/finance/commission/${month}/close`, { method: 'POST', body: {} }).then(
          () => true,
        ),
      t('admin.comm.closed', { month: monthLabel(month) }),
    );
    if (ok) data.reload();
  }

  async function markPaid(s: CommissionShare, paid: boolean) {
    const out = await action.run(
      () =>
        call<CommissionShare>(`/admin/finance/commission/payouts/${s.id}/paid`, {
          method: 'POST',
          body: { paid },
        }),
      paid
        ? t('admin.comm.paidDone', { name: s.ownerName })
        : t('admin.comm.unpaidDone', { name: s.ownerName }),
    );
    if (out)
      data.setData((d) =>
        d ? { ...d, shares: d.shares.map((x) => (x.id === s.id ? { ...x, ...out } : x)) } : d,
      );
  }

  const columns = (closed: boolean): Column<CommissionShare>[] => [
    { key: 'owner', label: t('admin.owner.name'), render: (s) => <strong>{s.ownerName}</strong> },
    {
      key: 'percent',
      label: t('admin.owner.percent'),
      render: (s) => `${bpToPercent(s.percentBp)}%`,
    },
    { key: 'amount', label: t('admin.comm.amount'), render: (s) => formatRupiah(s.amount) },
    ...(closed
      ? [
          {
            key: 'paid',
            label: t('admin.comm.paid'),
            render: (s: CommissionShare) => (
              <>
                <Checkbox
                  label={t('admin.comm.markPaid')}
                  checked={!!s.paidAt}
                  disabled={action.busy}
                  onChange={(e) => void markPaid(s, e.target.checked)}
                  aria-label={t('admin.comm.markPaidFor', { name: s.ownerName })}
                />
                {s.paidAt && <small className="ui-muted">{formatDate(s.paidAt)}</small>}
              </>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader title={t('admin.comm.title')} subtitle={t('admin.comm.subtitle')} />
      <Owners onChanged={data.reload} />
      <Card
        title={t('admin.comm.monthTitle', { month: monthLabel(month) })}
        actions={
          <div className="adm-month">
            <TextField
              label={t('admin.cash.month')}
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
            />
          </div>
        }
      >
        <ActionNotice error={action.error} done={action.done} />
        <Loadable loading={data.loading} error={data.error} hasData={!!data.data}>
          {() => {
            const d = data.data!;
            return (
              <>
                <SummaryStats summary={d.summary} />
                {d.closed ? (
                  <Notice tone="success">{t('admin.comm.isClosed')}</Notice>
                ) : (
                  <Notice tone="info">
                    {d.summary.net > 0
                      ? t('admin.comm.estimate', { net: signedRupiah(d.summary.net) })
                      : t('admin.comm.noProfit')}
                  </Notice>
                )}
                <Table
                  rows={d.shares}
                  columns={columns(d.closed)}
                  rowKey={(s) => s.id ?? s.ownerId ?? s.ownerName}
                  empty={t('admin.owner.empty')}
                />
                {!d.closed && (
                  <div className="ui-row" style={{ marginTop: 12 }}>
                    {d.canClose ? (
                      <Button variant="danger" disabled={action.busy} onClick={() => void close()}>
                        {t('admin.comm.close')}
                      </Button>
                    ) : (
                      <span className="ui-muted">{t('admin.comm.closeLater')}</span>
                    )}
                  </div>
                )}
              </>
            );
          }}
        </Loadable>
      </Card>
    </>
  );
}
