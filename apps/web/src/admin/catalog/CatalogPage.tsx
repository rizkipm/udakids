import { useState } from 'react';
import { catalogSchema, GRADE_LABEL, type Catalog } from '@little-coder/engine';
import type { CatalogRow } from '../../api/types';
import { useApiCall, useFetch } from '../../auth/useApi';
import { t } from '../../i18n';
import { Button, Card, Empty, PageHeader, TextArea, TextField } from '../../ui/ui';
import { ActionNotice, formatUpdated, Icon, Loadable, useAction } from '../common';
import { IssueList } from '../skills/IssueList';

/** Kode kategori berikutnya: A..Z, lalu AA, AB, ... */
export function nextCategoryCode(codes: string[]): string {
  const toNum = (c: string) => [...c].reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);
  const max = codes.reduce((m, c) => Math.max(m, /^[A-Z]{1,2}$/.test(c) ? toNum(c) : 0), 0);
  let n = max + 1;
  let out = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function CatalogEditor({
  catalog,
  onSaved,
}: {
  catalog: CatalogRow;
  onSaved: (c: Catalog) => void;
}) {
  const call = useApiCall('staff');
  const action = useAction();
  const [title, setTitle] = useState(catalog.title);
  const [categories, setCategories] = useState(catalog.categories);
  // Baris "hal penting" yang kosong dibuang sebelum validasi & simpan.
  const cleanCats = categories.map(({ tips, ...c }) => {
    const kept = tips?.map((x) => x.trim()).filter(Boolean);
    return kept && kept.length > 0 ? { ...c, tips: kept } : c;
  });
  const draft: Catalog = {
    domain: catalog.domain,
    grade: catalog.grade,
    title,
    categories: cleanCats,
  };
  const parsed = catalogSchema.safeParse(draft);
  const dupes = categories.map((c) => c.code).filter((c, i, xs) => xs.indexOf(c) !== i);
  const issues = [
    ...(parsed.success
      ? []
      : parsed.error.issues.map((i) => ({
          path: i.path.map(String).join('.'),
          message: i.message,
        }))),
    ...[...new Set(dupes)].map((c) => ({
      path: 'categories',
      message: t('admin.catalog.dupe', { code: c }),
    })),
  ];

  const setCat = (i: number, patch: Partial<Catalog['categories'][number]>) =>
    setCategories((xs) => xs.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) =>
    setCategories((xs) => {
      const j = i + d;
      if (j < 0 || j >= xs.length) return xs;
      const next = [...xs];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  async function save() {
    const out = await action.run(
      () =>
        call<Catalog>(`/admin/catalogs/${catalog.domain}/${catalog.grade}`, {
          method: 'PUT',
          body: draft,
        }),
      t('admin.catalog.saved'),
    );
    if (out) onSaved(out);
  }

  return (
    <Card
      title={`${catalog.domain} · ${GRADE_LABEL[catalog.grade]}`}
      actions={<span className="ui-muted">{formatUpdated(catalog.updatedAt)}</span>}
    >
      <TextField
        label={t('admin.catalog.titleField')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <h3 className="adm-group-title">{t('admin.catalog.categories', { n: categories.length })}</h3>
      {categories.map((c, i) => (
        <div key={i} className="adm-cat-row">
          <div className="adm-inline-form" style={{ marginBottom: 8 }}>
            <div style={{ width: 90 }}>
              <TextField
                label={t('admin.catalog.code')}
                value={c.code}
                maxLength={2}
                onChange={(e) => setCat(i, { code: e.target.value.toUpperCase() })}
              />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <TextField
                label={t('admin.catalog.catTitle')}
                value={c.title}
                onChange={(e) => setCat(i, { title: e.target.value })}
              />
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <TextField
                label={t('admin.catalog.group')}
                value={c.group ?? ''}
                maxLength={100}
                placeholder={t('admin.catalog.groupHint')}
                onChange={(e) => setCat(i, { group: e.target.value || undefined })}
              />
            </div>
            <Button
              variant="ghost"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={t('admin.catalog.up', { code: c.code })}
            >
              {t('admin.catalog.upShort')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => move(i, 1)}
              disabled={i === categories.length - 1}
              aria-label={t('admin.catalog.down', { code: c.code })}
            >
              {t('admin.catalog.downShort')}
            </Button>
            <Button
              variant="danger"
              onClick={() => setCategories((xs) => xs.filter((_, k) => k !== i))}
              aria-label={t('admin.catalog.remove', { code: c.code })}
            >
              <Icon name="trash" />
            </Button>
          </div>
          <details className="adm-cat-intro">
            <summary>
              {c.intro ? t('admin.catalog.introEdit') : t('admin.catalog.introAdd')}
            </summary>
            <TextArea
              label={t('admin.catalog.intro')}
              hint={t('admin.catalog.introHint')}
              rows={3}
              maxLength={300}
              value={c.intro ?? ''}
              onChange={(e) => setCat(i, { intro: e.target.value || undefined })}
            />
            <TextArea
              label={t('admin.catalog.tips')}
              hint={t('admin.catalog.tipsHint')}
              rows={3}
              value={(c.tips ?? []).join('\n')}
              onChange={(e) => {
                const tips = e.target.value.split('\n').slice(0, 3);
                setCat(i, { tips: tips.some((x) => x.trim()) ? tips : undefined });
              }}
            />
          </details>
        </div>
      ))}
      <div className="ui-row" style={{ margin: '12px 0 16px' }}>
        <Button
          variant="secondary"
          onClick={() =>
            setCategories((xs) => [
              ...xs,
              { code: nextCategoryCode(xs.map((x) => x.code)), title: '' },
            ])
          }
        >
          <Icon name="plus" />
          {t('admin.catalog.add')}
        </Button>
      </div>
      <IssueList issues={issues} />
      <p className="ui-muted">{t('admin.catalog.removeHint')}</p>
      <ActionNotice error={action.error} done={action.done} />
      <Button onClick={save} disabled={issues.length > 0 || action.busy}>
        <Icon name="check" />
        {t('admin.catalog.save')}
      </Button>
    </Card>
  );
}

export function CatalogPage() {
  const catalogs = useFetch<CatalogRow[]>('staff', '/admin/catalogs');
  return (
    <>
      <PageHeader title={t('admin.catalog.title')} subtitle={t('admin.catalog.subtitle')} />
      <Loadable loading={catalogs.loading} error={catalogs.error} hasData={!!catalogs.data}>
        {() =>
          catalogs.data!.length === 0 ? (
            <Empty>{t('admin.catalog.empty')}</Empty>
          ) : (
            catalogs.data!.map((c) => (
              <CatalogEditor
                key={`${c.domain}/${c.grade}`}
                catalog={c}
                onSaved={(saved) =>
                  catalogs.setData((xs) =>
                    xs?.map((x) =>
                      x.domain === saved.domain && x.grade === saved.grade
                        ? { ...x, ...saved, updatedAt: new Date().toISOString() }
                        : x,
                    ),
                  )
                }
              />
            ))
          )
        }
      </Loadable>
    </>
  );
}
