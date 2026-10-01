import { useState, type FormEvent } from 'react';
import { formatRupiah, type CashEntryInput, type MonthSummary } from '@little-coder/engine';
import { useApiCall, useFetch } from '../../auth/useApi';
import { t } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  PageHeader,
  RequiredNote,
  SelectField,
  Stat,
  Table,
  TextField,
  type Column,
} from '../../ui/ui';
import { ActionNotice, confirmAction, Icon, Loadable, useAction } from '../common';
import type { CashEntry, CashMonth, FinanceYear } from './types';
import { dayLabel, jakartaDate, monthLabel, parseAmount, thisMonth } from './util';

const CATEGORY_SUGGESTIONS = [
  'Penjualan paket',
  'Workshop / event',
  'Server & hosting',
  'Domain & layanan',
  'Iklan & promosi',
  'Gaji & honor',
  'Perlengkapan',
  'Transportasi',
  'Biaya bank',
  'Pajak',
  'Lain-lain',
];

type Form = {
  date: string;
  type: 'in' | 'out';
  category: string;
  amount: string;
  description: string;
};

const emptyForm = (month: string): Form => {
  const today = jakartaDate();
  return {
    date: today.startsWith(month) ? today : `${month}-01`,
    type: 'out',
    category: '',
    amount: '',
    description: '',
  };
};

/** Angka uang bertanda: pengeluaran/rugi diberi tanda minus. */
export const signedRupiah = (n: number) => (n < 0 ? `−${formatRupiah(-n)}` : formatRupiah(n));

export function SummaryStats({ summary }: { summary: MonthSummary }) {
  return (
    <div className="ui-grid adm-stats">
      <Stat label={t('admin.cash.income')} value={formatRupiah(summary.income)} />
      <Stat label={t('admin.cash.expense')} value={formatRupiah(summary.expense)} />
      <Stat label={t('admin.cash.net')} value={signedRupiah(summary.net)} />
    </div>
  );
}

function EntryEditor({
  month,
  editing,
  categories,
  onSaved,
  onCancel,
}: {
  month: string;
  editing: CashEntry | null;
  categories: string[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const call = useApiCall('staff');
  const action = useAction();
  const [form, setForm] = useState<Form>(() =>
    editing
      ? {
          date: editing.date,
          type: editing.type,
          category: editing.category,
          amount: String(editing.amount),
          description: editing.description,
        }
      : emptyForm(month),
  );
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body: CashEntryInput = {
      date: form.date,
      type: form.type,
      category: form.category.trim(),
      amount: parseAmount(form.amount),
      description: form.description.trim(),
    };
    const out = await action.run(
      () =>
        editing
          ? call<CashEntry>(`/admin/finance/cash/${editing.id}`, { method: 'PUT', body })
          : call<CashEntry>('/admin/finance/cash', { method: 'POST', body }),
      t('admin.cash.saved'),
    );
    if (out) {
      if (!editing) setForm(emptyForm(month));
      onSaved();
    }
  }

  return (
    <Card title={editing ? t('admin.cash.editTitle') : t('admin.cash.createTitle')}>
      <ActionNotice error={action.error} done={action.done} />
      <form onSubmit={submit}>
        <RequiredNote />
        <div className="adm-fields">
          <TextField
            label={t('admin.cash.date')}
            type="date"
            required
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
          />
          <SelectField
            label={t('admin.cash.type')}
            value={form.type}
            onChange={(e) => set('type', e.target.value as Form['type'])}
            options={[
              { value: 'out', label: t('admin.cash.typeOut') },
              { value: 'in', label: t('admin.cash.typeIn') },
            ]}
          />
          <TextField
            label={t('admin.cash.category')}
            required
            minLength={2}
            maxLength={40}
            list="adm-cash-categories"
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
          />
          <TextField
            label={t('admin.cash.amount')}
            hint={t('admin.pkg.priceHint')}
            required
            inputMode="numeric"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
          />
        </div>
        <datalist id="adm-cash-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <TextField
          label={t('admin.cash.description')}
          maxLength={200}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
        <div className="ui-row">
          <Button type="submit" disabled={action.busy}>
            {editing ? (
              t('admin.save')
            ) : (
              <>
                <Icon name="plus" />
                {t('admin.cash.create')}
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

function YearSummary({ year }: { year: number }) {
  const data = useFetch<FinanceYear>('staff', `/admin/finance/summary?year=${year}`);
  type Row = MonthSummary & { total?: boolean };
  const columns: Column<Row>[] = [
    {
      key: 'month',
      label: t('admin.cash.month'),
      render: (r) => (r.total ? <strong>{t('admin.cash.total')}</strong> : monthLabel(r.month)),
    },
    { key: 'income', label: t('admin.cash.income'), render: (r) => formatRupiah(r.income) },
    { key: 'expense', label: t('admin.cash.expense'), render: (r) => formatRupiah(r.expense) },
    {
      key: 'net',
      label: t('admin.cash.net'),
      render: (r) => (r.total ? <strong>{signedRupiah(r.net)}</strong> : signedRupiah(r.net)),
    },
  ];
  return (
    <Card title={t('admin.cash.yearTitle', { year })}>
      <Loadable loading={data.loading} error={data.error} hasData={!!data.data}>
        {() => (
          <Table<Row>
            rows={[...data.data!.months, { month: 'total', ...data.data!.total, total: true }]}
            columns={columns}
            rowKey={(r) => r.month}
          />
        )}
      </Loadable>
    </Card>
  );
}

export function CashPage() {
  const [month, setMonth] = useState(thisMonth());
  const cash = useFetch<CashMonth>('staff', `/admin/finance/cash?month=${month}`);
  const call = useApiCall('staff');
  const action = useAction();
  const [editing, setEditing] = useState<CashEntry | null>(null);
  const [tick, setTick] = useState(0);
  const categories = [
    ...new Set([...CATEGORY_SUGGESTIONS, ...(cash.data?.entries.map((e) => e.category) ?? [])]),
  ];

  const changed = () => {
    setEditing(null);
    cash.reload();
    setTick((x) => x + 1);
  };

  async function remove(e: CashEntry) {
    if (
      !confirmAction(
        t('admin.cash.deleteConfirm', { category: e.category, amount: formatRupiah(e.amount) }),
      )
    )
      return;
    const ok = await action.run(
      () => call(`/admin/finance/cash/${e.id}`, { method: 'DELETE' }).then(() => true),
      t('admin.cash.deleted'),
    );
    if (ok) changed();
  }

  const columns: Column<CashEntry>[] = [
    { key: 'date', label: t('admin.cash.date'), render: (e) => dayLabel(e.date) },
    {
      key: 'type',
      label: t('admin.cash.type'),
      render: (e) =>
        e.type === 'in' ? (
          <Badge tone="success">{t('admin.cash.typeIn')}</Badge>
        ) : (
          <Badge tone="warning">{t('admin.cash.typeOut')}</Badge>
        ),
    },
    {
      key: 'category',
      label: t('admin.cash.category'),
      render: (e) => (
        <>
          {e.category}
          {e.description && <div className="ui-muted">{e.description}</div>}
        </>
      ),
    },
    {
      key: 'amount',
      label: t('admin.cash.amount'),
      render: (e) => (e.type === 'out' ? `−${formatRupiah(e.amount)}` : formatRupiah(e.amount)),
    },
    {
      key: 'actions',
      label: t('admin.col.actions'),
      render: (e) =>
        e.orderId ? (
          <Badge tone="info">{t('admin.cash.auto')}</Badge>
        ) : (
          <div className="ui-row">
            <Button variant="secondary" onClick={() => setEditing(e)}>
              {t('admin.edit')}
            </Button>
            <Button
              variant="danger"
              disabled={action.busy}
              aria-label={t('admin.cash.deleteLabel', { category: e.category })}
              onClick={() => void remove(e)}
            >
              <Icon name="trash" />
            </Button>
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('admin.cash.title')}
        subtitle={t('admin.cash.subtitle')}
        actions={
          <div className="adm-month">
            <TextField
              label={t('admin.cash.month')}
              type="month"
              value={month}
              onChange={(e) => {
                if (!e.target.value) return;
                setMonth(e.target.value);
                setEditing(null);
              }}
            />
          </div>
        }
      />
      <Loadable loading={cash.loading} error={cash.error} hasData={!!cash.data}>
        {() => (
          <>
            <SummaryStats summary={cash.data!.summary} />
            <Card title={t('admin.cash.listTitle', { month: monthLabel(cash.data!.month) })}>
              <ActionNotice error={action.error} done={action.done} />
              <Table
                rows={cash.data!.entries}
                columns={columns}
                rowKey={(e) => e.id}
                empty={t('admin.cash.empty')}
              />
              <p className="ui-muted">{t('admin.cash.autoHint')}</p>
            </Card>
          </>
        )}
      </Loadable>
      <EntryEditor
        key={`${editing?.id ?? 'new'}-${month}`}
        month={month}
        editing={editing}
        categories={categories}
        onSaved={changed}
        onCancel={() => setEditing(null)}
      />
      <YearSummary key={tick} year={Number(month.slice(0, 4))} />
    </>
  );
}
