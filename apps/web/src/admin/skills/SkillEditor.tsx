import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FAMILIES, FAMILY_NAMES, type FamilyName, type SkillTemplate } from '@little-coder/engine';
import type { CatalogRow, SkillRow } from '../../api/types';
import { t } from '../../i18n';
import { Button, Card, Checkbox, PageHeader, SelectField, TextArea } from '../../ui/ui';
import { Icon, useDebounced } from '../common';
import { IssueList, type Issue } from './IssueList';
import { ItemPreview } from './ItemPreview';
import { MetaFields } from './MetaFields';
import { SkillActions } from './SkillActions';
import {
  buildTemplate,
  checkTemplate,
  emptyMeta,
  metaFromTemplate,
  parseJson,
  type SkillMeta,
} from './skillForm';

type Draft = { meta: SkillMeta; family: FamilyName; paramsText: string; bandsText: string };

const pretty = (v: unknown) => JSON.stringify(v, null, 2);

/** Validasi lengkap draft form → template valid (bila ada) + daftar masalah. */
export function evaluateDraft(
  d: Draft,
  version = 1,
  samples = 50,
): { template?: SkillTemplate; issues: Issue[] } {
  const params = parseJson(d.paramsText);
  const bands = parseJson(d.bandsText);
  const issues: Issue[] = [];
  if (params.error) issues.push({ path: 'params', message: `JSON: ${params.error}` });
  if (bands.error) issues.push({ path: 'bands', message: `JSON: ${bands.error}` });
  if (issues.length) return { issues };
  const candidate = buildTemplate(d.meta, d.family, params.value ?? {}, bands.value, version);
  return checkTemplate(candidate, samples);
}

type Props = {
  initial?: SkillTemplate;
  catalogs: CatalogRow[];
  /** Skill lain (untuk "ambil contoh params" dari family yang sama). */
  examples?: SkillRow[];
};

/** Editor skill generator (semua family kecuali `manual`). */
export function SkillEditor({ initial, catalogs, examples = [] }: Props) {
  const creating = !initial;
  const [draft, setDraft] = useState<Draft>(() => ({
    meta: initial ? metaFromTemplate(initial) : emptyMeta(),
    family: initial && initial.family !== 'manual' ? initial.family : 'count',
    paramsText: pretty(initial?.params ?? {}),
    bandsText: initial?.bands ? pretty(initial.bands) : '',
  }));
  const [saved, setSaved] = useState(
    initial ? { status: initial.status, version: initial.version } : undefined,
  );

  const key = JSON.stringify(draft);
  const debouncedKey = useDebounced(key, 400);
  const version = saved?.version ?? 1;
  const result = useMemo(
    () => evaluateDraft(JSON.parse(debouncedKey) as Draft, version),
    [debouncedKey, version],
  );
  const checking = key !== debouncedKey;

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const familyOptions = FAMILY_NAMES.filter((f) => f !== 'manual').map((f) => ({
    value: f,
    label: f,
  }));
  const example = examples.find(
    (s) => s.template.family === draft.family && s.id !== draft.meta.id,
  );

  function onSaved(tpl: SkillTemplate) {
    setSaved({ status: tpl.status, version: tpl.version });
    set({ meta: { ...draft.meta, status: tpl.status } });
  }

  return (
    <>
      <PageHeader
        title={creating ? t('admin.skill.newTitle') : draft.meta.title || draft.meta.id}
        subtitle={t('admin.skill.editorSubtitle')}
        actions={
          <Link className="ui-btn ui-btn-ghost" to="/admin/skill">
            <Icon name="back" />
            {t('admin.back')}
          </Link>
        }
      />
      <div className="adm-two">
        <div>
          <Card title={t('admin.skill.metaTitle')}>
            <MetaFields
              meta={draft.meta}
              onChange={(meta) => set({ meta })}
              catalogs={catalogs}
              creating={creating}
            />
          </Card>
          <Card title={t('admin.skill.generatorTitle')}>
            <SelectField
              label={t('admin.skill.field.family')}
              value={draft.family}
              onChange={(e) => set({ family: e.target.value as FamilyName })}
              options={familyOptions}
              hint={FAMILIES[draft.family].description}
            />
            {example && (
              <div className="ui-row" style={{ marginBottom: 12 }}>
                <Button
                  variant="ghost"
                  onClick={() =>
                    set({
                      paramsText: pretty(example.template.params),
                      bandsText: example.template.bands ? pretty(example.template.bands) : '',
                    })
                  }
                >
                  {t('admin.skill.useExample')}
                </Button>
                <span className="ui-muted">
                  {t('admin.skill.exampleFrom', { title: example.title })}
                </span>
              </div>
            )}
            <TextArea
              label={t('admin.skill.field.params')}
              hint={t('admin.skill.field.paramsHint')}
              value={draft.paramsText}
              onChange={(e) => set({ paramsText: e.target.value })}
              spellCheck={false}
              rows={12}
            />
            <Checkbox
              label={t('admin.skill.field.bandsToggle')}
              checked={draft.bandsText.trim() !== ''}
              onChange={(e) => set({ bandsText: e.target.checked ? pretty([{}, {}, {}]) : '' })}
            />
            {draft.bandsText.trim() !== '' && (
              <TextArea
                label={t('admin.skill.field.bands')}
                hint={t('admin.skill.field.bandsHint')}
                value={draft.bandsText}
                onChange={(e) => set({ bandsText: e.target.value })}
                spellCheck={false}
                rows={10}
              />
            )}
          </Card>
        </div>
        <div>
          <Card title={t('admin.validate.title')}>
            <IssueList
              issues={result.issues}
              checking={checking}
              okText={t('admin.skill.validOk', { n: 50 })}
            />
            <SkillActions
              template={checking || result.issues.length ? undefined : result.template}
              creating={creating}
              saved={saved}
              onSaved={onSaved}
            />
          </Card>
          <Card title={t('admin.preview.title')}>
            <ItemPreview template={result.template} />
          </Card>
        </div>
      </div>
    </>
  );
}
