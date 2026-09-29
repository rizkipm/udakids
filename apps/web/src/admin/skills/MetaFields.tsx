import { GRADE_LABEL } from '@little-coder/engine';
import type { CatalogRow } from '../../api/types';
import { t } from '../../i18n';
import { Button, SelectField, TextField } from '../../ui/ui';
import { DOMAINS, GRADES, suggestId, TIERS, type SkillMeta } from './skillForm';

type Props = {
  meta: SkillMeta;
  onChange: (next: SkillMeta) => void;
  catalogs: CatalogRow[];
  /** true = skill baru (id masih bisa diisi). */
  creating: boolean;
};

export function categoryOptions(catalogs: CatalogRow[], domain: string, grade: string) {
  const cat = catalogs.find((c) => c.domain === domain && c.grade === grade);
  return cat?.categories.map((c) => ({ value: c.code, label: `${c.code} — ${c.title}` })) ?? [];
}

/** Field metadata bersama untuk editor generator dan editor soal manual. */
export function MetaFields({ meta, onChange, catalogs, creating }: Props) {
  const set = <K extends keyof SkillMeta>(key: K, value: SkillMeta[K]) =>
    onChange({ ...meta, [key]: value });
  const categories = categoryOptions(catalogs, meta.domain, meta.grade);
  const hasCategory = categories.some((c) => c.value === meta.category);

  return (
    <>
      <div className="adm-fields">
        <TextField
          label={t('admin.skill.field.title')}
          value={meta.title}
          onChange={(e) => set('title', e.target.value)}
          maxLength={80}
          required
        />
        <SelectField
          label={t('admin.skill.field.domain')}
          value={meta.domain}
          onChange={(e) => set('domain', e.target.value as SkillMeta['domain'])}
          options={DOMAINS.map((d) => ({ value: d, label: d }))}
        />
        <SelectField
          label={t('admin.skill.field.grade')}
          value={meta.grade}
          onChange={(e) => set('grade', e.target.value as SkillMeta['grade'])}
          options={GRADES.map((g) => ({ value: g, label: GRADE_LABEL[g] }))}
        />
        {categories.length > 0 ? (
          <SelectField
            label={t('admin.skill.field.category')}
            value={hasCategory ? meta.category : ''}
            onChange={(e) => set('category', e.target.value)}
            options={[
              ...(hasCategory ? [] : [{ value: '', label: t('admin.skill.field.categoryPick') }]),
              ...categories,
            ]}
          />
        ) : (
          <TextField
            label={t('admin.skill.field.category')}
            hint={t('admin.skill.field.categoryNoCatalog')}
            value={meta.category}
            onChange={(e) => set('category', e.target.value.toUpperCase())}
            maxLength={2}
          />
        )}
        <TextField
          label={t('admin.skill.field.order')}
          type="number"
          min={1}
          value={meta.order}
          onChange={(e) => set('order', e.target.value)}
        />
        <SelectField
          label={t('admin.skill.field.tier')}
          value={meta.tier}
          onChange={(e) => set('tier', e.target.value as SkillMeta['tier'])}
          options={TIERS.map((x) => ({ value: x, label: x }))}
        />
        <SelectField
          label={t('admin.skill.field.status')}
          value={meta.status}
          onChange={(e) => set('status', e.target.value as SkillMeta['status'])}
          options={[
            { value: 'draft', label: t('admin.status.draft') },
            { value: 'active', label: t('admin.status.active') },
          ]}
        />
      </div>
      <TextField
        label={t('admin.skill.field.tags')}
        hint={t('admin.skill.field.tagsHint')}
        value={meta.tags}
        onChange={(e) => set('tags', e.target.value)}
      />
      {creating ? (
        <div className="adm-inline-form" style={{ marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <TextField
              label={t('admin.skill.field.id')}
              hint={t('admin.skill.field.idHint')}
              value={meta.id}
              onChange={(e) => set('id', e.target.value.trim())}
            />
          </div>
          <Button variant="ghost" onClick={() => set('id', suggestId(meta))}>
            {t('admin.skill.field.idSuggest')}
          </Button>
        </div>
      ) : (
        <p className="ui-muted" style={{ marginBottom: 14 }}>
          {t('admin.skill.field.id')}: <code>{meta.id}</code>
        </p>
      )}
    </>
  );
}
