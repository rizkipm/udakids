import { useState, type FormEvent } from 'react';
import { formatRupiah, pricing, type DiscountType, type PackageInput } from '@little-coder/engine';
import type { CatalogRow } from '../../api/types';
import { useApiCall, useFetch } from '../../auth/useApi';
import { t } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  PageHeader,
  RequiredNote,
  SelectField,
  Table,
  TextArea,
  TextField,
  type Column,
} from '../../ui/ui';
import { ActionNotice, ActiveBadge, confirmAction, Icon, Loadable, useAction } from '../common';
import type { BookRef, PackageDeleteResult, PackageRow } from './types';
import { isoToLocalInput, localInputToIso, parseAmount } from './util';

type Form = {
  name: string;
  description: string;
  scope: 'all' | 'books';
  books: string[];
  durationDays: string;
  price: string;
  discountType: DiscountType;
  discountValue: string;
  discountStartsAt: string;
  discountEndsAt: string;
  active: boolean;
  sort: string;
};

const EMPTY: Form = {
  name: '',
  description: '',
  scope: 'all',
  books: [],
  durationDays: '',
  price: '',
  discountType: 'none',
  discountValue: '',
  discountStartsAt: '',
  discountEndsAt: '',
  active: true,
  sort: '0',
};

const bookId = (b: { domain: string; grade: string }) => `${b.domain}/${b.grade}`;

const toForm = (p: PackageRow): Form => ({
  name: p.name,
  description: p.description,
  scope: p.scope,
  books: p.books.map(bookId),
  durationDays: p.durationDays === null ? '' : String(p.durationDays),
  price: String(p.price),
  discountType: p.discountType,
  discountValue: p.discountType === 'none' ? '' : String(p.discountValue),
  discountStartsAt: isoToLocalInput(p.discountStartsAt),
  discountEndsAt: isoToLocalInput(p.discountEndsAt),
  active: p.active,
  sort: String(p.sort),
});

/** Formulir → body API (validasi akhir oleh server, packageInputSchema). */
export function toPackageInput(f: Form): PackageInput {
  const num = (v: string) => (v.trim() === '' ? 0 : parseAmount(v));
  return {
    name: f.name.trim(),
    description: f.description.trim(),
    scope: f.scope,
    books:
      f.scope === 'all'
        ? []
        : f.books.map((id) => {
            const [domain, grade] = id.split('/');
            return { domain, grade } as BookRef;
          }),
    durationDays: f.durationDays.trim() === '' ? null : Number(f.durationDays),
    price: num(f.price),
    discountType: f.discountType,
    discountValue: f.discountType === 'none' ? 0 : num(f.discountValue),
    discountStartsAt: f.discountType === 'none' ? null : localInputToIso(f.discountStartsAt),
    discountEndsAt: f.discountType === 'none' ? null : localInputToIso(f.discountEndsAt),
    active: f.active,
    sort: Number(f.sort) || 0,
  };
}

export function bookTitle(b: BookRef, catalogs: CatalogRow[]): string {
  return catalogs.find((c) => c.domain === b.domain && c.grade === b.grade)?.title ?? bookId(b);
}

function PriceCell({ p }: { p: Pick<PackageRow, 'pricing'> }) {
  const { normal, discount, final, discountActive } = p.pricing;
  return (
    <div className="adm-price">
      {discountActive && (
        <s
          className="ui-muted"
          aria-label={t('admin.pkg.normalPrice', { price: formatRupiah(normal) })}
        >
          {formatRupiah(normal)}
        </s>
      )}
      <strong>{formatRupiah(final)}</strong>
      {discountActive && (
        <small className="adm-price-cut">
          {t('admin.pkg.discountCut', { amount: formatRupiah(discount) })}
        </small>
      )}
    </div>
  );
}

function PackageEditor({
  editing,
  catalogs,
  onSaved,
  onCancel,
}: {
  editing: PackageRow | null;
  catalogs: CatalogRow[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const call = useApiCall('staff');
  const action = useAction();
  const [form, setForm] = useState<Form>(editing ? toForm(editing) : EMPTY);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const input = toPackageInput(form);
  const preview =
    Number.isFinite(input.price) && input.price > 0
      ? pricing(
          {
            ...input,
            discountValue: Number.isFinite(input.discountValue) ? input.discountValue : 0,
          },
          new Date(),
        )
      : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const out = await action.run(
      () =>
        editing
          ? call<PackageRow>(`/admin/packages/${editing.id}`, { method: 'PUT', body: input })
          : call<PackageRow>('/admin/packages', { method: 'POST', body: input }),
      editing
        ? t('admin.pkg.saved', { name: input.name })
        : t('admin.pkg.created', { name: input.name }),
    );
    if (out) {
      if (!editing) setForm(EMPTY);
      onSaved();
    }
  }

  function toggleBook(id: string, on: boolean) {
    set('books', on ? [...form.books, id] : form.books.filter((b) => b !== id));
  }

  return (
    <Card
      title={
        editing ? t('admin.pkg.editTitle', { name: editing.name }) : t('admin.pkg.createTitle')
      }
    >
      <ActionNotice error={action.error} done={action.done} />
      <form onSubmit={submit}>
        <RequiredNote />
        <div className="adm-fields">
          <TextField
            label={t('admin.pkg.name')}
            required
            minLength={3}
            maxLength={80}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
          <TextField
            label={t('admin.pkg.price')}
            hint={t('admin.pkg.priceHint')}
            required
            inputMode="numeric"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
          />
          <TextField
            label={t('admin.pkg.duration')}
            hint={t('admin.pkg.durationHint')}
            type="number"
            min={1}
            max={3650}
            value={form.durationDays}
            onChange={(e) => set('durationDays', e.target.value)}
          />
          <TextField
            label={t('admin.pkg.sort')}
            hint={t('admin.pkg.sortHint')}
            type="number"
            min={0}
            max={999}
            value={form.sort}
            onChange={(e) => set('sort', e.target.value)}
          />
        </div>
        <TextArea
          className="adm-textarea"
          label={t('admin.pkg.description')}
          maxLength={300}
          rows={2}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />

        <fieldset className="adm-fieldset">
          <legend>{t('admin.pkg.scope')}</legend>
          <label className="ui-check">
            <input
              type="radio"
              name="pkg-scope"
              checked={form.scope === 'all'}
              onChange={() => set('scope', 'all')}
            />
            <span>{t('admin.pkg.scopeAll')}</span>
          </label>
          <label className="ui-check">
            <input
              type="radio"
              name="pkg-scope"
              checked={form.scope === 'books'}
              onChange={() => set('scope', 'books')}
            />
            <span>{t('admin.pkg.scopeBooks')}</span>
          </label>
          {form.scope === 'books' && (
            <div className="adm-book-list">
              {catalogs.map((c) => {
                const id = bookId(c);
                return (
                  <Checkbox
                    key={id}
                    label={c.title}
                    checked={form.books.includes(id)}
                    onChange={(e) => toggleBook(id, e.target.checked)}
                  />
                );
              })}
            </div>
          )}
        </fieldset>

        <fieldset className="adm-fieldset">
          <legend>{t('admin.pkg.discount')}</legend>
          <div className="adm-fields">
            <SelectField
              label={t('admin.pkg.discountType')}
              value={form.discountType}
              onChange={(e) => set('discountType', e.target.value as DiscountType)}
              options={[
                { value: 'none', label: t('admin.pkg.discountNone') },
                { value: 'percent', label: t('admin.pkg.discountPercent') },
                { value: 'amount', label: t('admin.pkg.discountAmount') },
              ]}
            />
            {form.discountType !== 'none' && (
              <>
                <TextField
                  label={
                    form.discountType === 'percent'
                      ? t('admin.pkg.discountValuePercent')
                      : t('admin.pkg.discountValueAmount')
                  }
                  required
                  inputMode="numeric"
                  value={form.discountValue}
                  onChange={(e) => set('discountValue', e.target.value)}
                />
                <TextField
                  label={t('admin.pkg.discountStart')}
                  hint={t('admin.pkg.discountWindowHint')}
                  type="datetime-local"
                  value={form.discountStartsAt}
                  onChange={(e) => set('discountStartsAt', e.target.value)}
                />
                <TextField
                  label={t('admin.pkg.discountEnd')}
                  hint={t('admin.pkg.discountWindowHint')}
                  type="datetime-local"
                  value={form.discountEndsAt}
                  onChange={(e) => set('discountEndsAt', e.target.value)}
                />
              </>
            )}
          </div>
        </fieldset>

        <Checkbox
          label={t('admin.pkg.active')}
          checked={form.active}
          onChange={(e) => set('active', e.target.checked)}
        />

        <div className="adm-price-preview" aria-live="polite">
          <strong>{t('admin.pkg.preview')}</strong>
          {preview ? (
            <dl>
              <div>
                <dt>{t('admin.pkg.normal')}</dt>
                <dd>{formatRupiah(preview.normal)}</dd>
              </div>
              <div>
                <dt>{t('admin.pkg.discountShort')}</dt>
                <dd>{preview.discount > 0 ? `− ${formatRupiah(preview.discount)}` : '—'}</dd>
              </div>
              <div>
                <dt>{t('admin.pkg.final')}</dt>
                <dd>
                  <strong>{formatRupiah(preview.final)}</strong>
                </dd>
              </div>
            </dl>
          ) : (
            <span className="ui-muted"> {t('admin.pkg.previewEmpty')}</span>
          )}
          {preview && form.discountType !== 'none' && !preview.discountActive && (
            <small className="ui-muted">{t('admin.pkg.previewInactive')}</small>
          )}
        </div>

        <div className="ui-row">
          <Button type="submit" disabled={action.busy}>
            {editing ? (
              t('admin.save')
            ) : (
              <>
                <Icon name="plus" />
                {t('admin.pkg.create')}
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

export function PackagesPage() {
  const list = useFetch<PackageRow[]>('staff', '/admin/packages');
  const catalogs = useFetch<CatalogRow[]>('staff', '/admin/catalogs');
  const call = useApiCall('staff');
  const action = useAction();
  const [editing, setEditing] = useState<PackageRow | null>(null);
  const [deleted, setDeleted] = useState<string>();
  const books = catalogs.data ?? [];

  async function remove(p: PackageRow) {
    if (!confirmAction(t('admin.pkg.deleteConfirm', { name: p.name }))) return;
    setDeleted(undefined);
    const out = await action.run(() =>
      call<PackageDeleteResult>(`/admin/packages/${p.id}`, { method: 'DELETE' }),
    );
    if (!out) return;
    // Paket yang sudah pernah dipesan hanya dinonaktifkan (riwayat tetap utuh).
    setDeleted(
      out.deactivated
        ? t('admin.pkg.deactivated', { name: p.name })
        : t('admin.pkg.deleted', { name: p.name }),
    );
    if (editing?.id === p.id) setEditing(null);
    list.reload();
  }

  const columns: Column<PackageRow>[] = [
    {
      key: 'name',
      label: t('admin.pkg.name'),
      render: (p) => (
        <>
          <strong>{p.name}</strong>
          {p.description && <div className="ui-muted">{p.description}</div>}
        </>
      ),
    },
    { key: 'price', label: t('admin.pkg.colPrice'), render: (p) => <PriceCell p={p} /> },
    {
      key: 'scope',
      label: t('admin.pkg.scope'),
      render: (p) =>
        p.scope === 'all' ? (
          t('admin.pkg.scopeAll')
        ) : (
          <div className="adm-tags">
            {p.books.map((b) => (
              <Badge key={bookId(b)} tone="info">
                {bookTitle(b, books)}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: 'duration',
      label: t('admin.pkg.colDuration'),
      render: (p) =>
        p.durationDays === null
          ? t('admin.pkg.forever')
          : t('admin.pkg.days', { n: p.durationDays }),
    },
    {
      key: 'active',
      label: t('admin.col.status'),
      render: (p) => <ActiveBadge active={p.active} />,
    },
    { key: 'sold', label: t('admin.pkg.sold'), render: (p) => p.sold ?? 0 },
    {
      key: 'actions',
      label: t('admin.col.actions'),
      render: (p) => (
        <div className="ui-row">
          <Button variant="secondary" onClick={() => setEditing(p)}>
            {t('admin.edit')}
          </Button>
          <Button
            variant="danger"
            disabled={action.busy}
            aria-label={t('admin.pkg.deleteLabel', { name: p.name })}
            onClick={() => void remove(p)}
          >
            <Icon name="trash" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t('admin.pkg.title')} subtitle={t('admin.pkg.subtitle')} />
      <Card title={t('admin.pkg.listTitle')}>
        <ActionNotice error={action.error} done={deleted} />
        <Loadable loading={list.loading} error={list.error} hasData={!!list.data}>
          {() => (
            <Table
              rows={list.data!}
              columns={columns}
              rowKey={(p) => p.id}
              empty={t('admin.pkg.empty')}
            />
          )}
        </Loadable>
      </Card>
      <PackageEditor
        key={editing?.id ?? 'new'}
        editing={editing}
        catalogs={books}
        onSaved={() => {
          setEditing(null);
          list.reload();
        }}
        onCancel={() => setEditing(null)}
      />
    </>
  );
}
