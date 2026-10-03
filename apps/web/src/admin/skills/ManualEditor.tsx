import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { generateItem, type SkillTemplate, type Visual } from '@little-coder/engine';
import type { CatalogRow } from '../../api/types';
import { t } from '../../i18n';
import { ItemPlayer } from '../../play/ItemPlayer';
import { Button, Card, Checkbox, Notice, PageHeader, TextField } from '../../ui/ui';
import { Icon, useDebounced } from '../common';
import { IssueList } from './IssueList';
import { MetaFields } from './MetaFields';
import { SkillActions } from './SkillActions';
import {
  checkManual,
  draftsFromTemplate,
  MAX_CHOICES,
  MAX_STIMULUS,
  MIN_CHOICES,
  newChoice,
  newItem,
  singleItemTemplate,
  type ChoiceDraft,
  type ItemDraft,
} from './manualModel';
import { emptyMeta, metaFromTemplate, type SkillMeta } from './skillForm';
import { VisualPicker } from './VisualPicker';

/** Hapus pilihan ke-i dan geser indeks jawaban. */
function withoutChoice(item: ItemDraft, i: number): ItemDraft {
  const answers = item.answers.filter((a) => a !== i).map((a) => (a > i ? a - 1 : a));
  return {
    ...item,
    choices: item.choices.filter((_, k) => k !== i),
    answers: answers.length || item.multi ? answers : [0],
  };
}

function ItemPreviewBox({ meta, item }: { meta: SkillMeta; item: ItemDraft }) {
  const [seed, setSeed] = useState(0);
  const template = useMemo(() => singleItemTemplate(meta, item), [meta, item]);
  if (!template) return <Notice tone="warning">{t('admin.manual.previewInvalid')}</Notice>;
  let generated;
  try {
    generated = generateItem(template, { seed, band: 1 });
  } catch (err) {
    return <Notice tone="error">{(err as Error).message}</Notice>;
  }
  return (
    <div className="adm-preview">
      <div className="ui-row" style={{ marginBottom: 8 }}>
        <span className="adm-preview-meta">{t('admin.manual.previewHint')}</span>
        <Button variant="ghost" onClick={() => setSeed((s) => s + 1)}>
          <Icon name="refresh" />
          {t('admin.preview.shuffle')}
        </Button>
      </div>
      <ItemPlayer item={generated} mode="preview" showAnswer />
    </div>
  );
}

function ChoiceEditor({
  index,
  choice,
  correct,
  multi,
  groupName,
  onChange,
  onCorrect,
  onRemove,
}: {
  index: number;
  choice: ChoiceDraft;
  correct: boolean;
  multi: boolean;
  groupName: string;
  onChange: (c: ChoiceDraft) => void;
  onCorrect: (on: boolean) => void;
  onRemove?: () => void;
}) {
  return (
    <div className={`adm-choice ${correct ? 'is-answer' : ''}`}>
      <VisualPicker
        label={t('admin.manual.choice', { n: index + 1 })}
        value={choice.visual}
        onChange={(visual) => onChange({ ...choice, visual })}
        onRemove={onRemove}
      />
      <label className="ui-check" style={{ marginTop: 10 }}>
        <input
          type={multi ? 'checkbox' : 'radio'}
          name={groupName}
          checked={correct}
          onChange={(e) => onCorrect(e.target.checked)}
        />
        <span>{t('admin.manual.correct')}</span>
      </label>
      <TextField
        label={t('admin.manual.choiceSay')}
        hint={t('admin.manual.choiceSayHint')}
        value={choice.say}
        maxLength={60}
        onChange={(e) => onChange({ ...choice, say: e.target.value })}
      />
      {!correct && (
        <TextField
          label={t('admin.manual.choiceTag')}
          hint={t('admin.manual.choiceTagHint')}
          value={choice.tag}
          maxLength={40}
          onChange={(e) => onChange({ ...choice, tag: e.target.value })}
        />
      )}
    </div>
  );
}

function ItemEditor({
  index,
  item,
  meta,
  issues,
  onChange,
  onRemove,
  onDuplicate,
}: {
  index: number;
  item: ItemDraft;
  meta: SkillMeta;
  issues: string[];
  onChange: (d: ItemDraft) => void;
  onRemove?: () => void;
  onDuplicate: () => void;
}) {
  const groupName = useId();
  const [preview, setPreview] = useState(false);
  const set = (patch: Partial<ItemDraft>) => onChange({ ...item, ...patch });
  const setStimulus = (i: number, v: Visual) =>
    set({ stimulus: item.stimulus.map((s, k) => (k === i ? v : s)) });

  function toggleCorrect(i: number, on: boolean) {
    if (!item.multi) return set({ answers: [i] });
    set({ answers: on ? [...item.answers, i] : item.answers.filter((a) => a !== i) });
  }

  return (
    <section className="adm-item" aria-label={t('admin.manual.item', { n: index + 1 })}>
      <div className="adm-item-head">
        <h3>{t('admin.manual.item', { n: index + 1 })}</h3>
        <div className="ui-row">
          <Button variant="ghost" onClick={() => setPreview((p) => !p)} aria-pressed={preview}>
            {preview ? t('admin.manual.hidePreview') : t('admin.manual.showPreview')}
          </Button>
          <Button variant="ghost" onClick={onDuplicate}>
            {t('admin.manual.duplicate')}
          </Button>
          {onRemove && (
            <Button variant="danger" onClick={onRemove}>
              <Icon name="trash" />
              {t('admin.manual.removeItem')}
            </Button>
          )}
        </div>
      </div>
      {issues.length > 0 && (
        <Notice tone="error">
          <ul className="adm-issues">
            {issues.map((m, k) => (
              <li key={k}>{m}</li>
            ))}
          </ul>
        </Notice>
      )}
      <div className="adm-fields">
        <TextField
          label={t('admin.manual.prompt')}
          value={item.prompt}
          maxLength={500}
          required
          onChange={(e) => set({ prompt: e.target.value })}
        />
        <TextField
          label={t('admin.manual.say')}
          hint={t('admin.manual.sayHint')}
          value={item.say}
          maxLength={240}
          onChange={(e) => set({ say: e.target.value })}
        />
        <TextField
          label={t('admin.manual.reteach')}
          hint={t('admin.manual.reteachHint')}
          value={item.reteach}
          maxLength={240}
          onChange={(e) => set({ reteach: e.target.value })}
        />
      </div>

      <h4 className="adm-group-title">
        {t('admin.manual.stimulus', { n: item.stimulus.length, max: MAX_STIMULUS })}
      </h4>
      <div className="adm-stimulus">
        {item.stimulus.map((v, i) => (
          <VisualPicker
            key={i}
            label={t('admin.manual.stimulusN', { n: i + 1 })}
            value={v}
            onChange={(nv) => setStimulus(i, nv)}
            onRemove={() => set({ stimulus: item.stimulus.filter((_, k) => k !== i) })}
          />
        ))}
      </div>
      {item.stimulus.length < MAX_STIMULUS && (
        <Button
          variant="ghost"
          onClick={() =>
            set({
              stimulus: [
                ...item.stimulus,
                { kind: 'objects', object: 'apel', count: 3, layout: 'row' },
              ],
            })
          }
        >
          <Icon name="plus" />
          {t('admin.manual.addStimulus')}
        </Button>
      )}

      <h4 className="adm-group-title">{t('admin.manual.choices')}</h4>
      <Checkbox
        label={t('admin.manual.multi')}
        checked={item.multi}
        onChange={(e) =>
          set({
            multi: e.target.checked,
            answers: e.target.checked ? item.answers : [item.answers[0] ?? 0],
          })
        }
      />
      <div className="adm-choices">
        {item.choices.map((c, i) => (
          <ChoiceEditor
            key={i}
            index={i}
            choice={c}
            multi={item.multi}
            groupName={groupName}
            correct={item.answers.includes(i)}
            onChange={(nc) => set({ choices: item.choices.map((x, k) => (k === i ? nc : x)) })}
            onCorrect={(on) => toggleCorrect(i, on)}
            onRemove={
              item.choices.length > MIN_CHOICES ? () => onChange(withoutChoice(item, i)) : undefined
            }
          />
        ))}
      </div>
      {item.choices.length < MAX_CHOICES && (
        <Button
          variant="ghost"
          style={{ marginTop: 12 }}
          onClick={() => set({ choices: [...item.choices, newChoice(item.choices.length + 1)] })}
        >
          <Icon name="plus" />
          {t('admin.manual.addChoice')}
        </Button>
      )}
      {preview && (
        <div style={{ marginTop: 16 }}>
          <ItemPreviewBox meta={meta} item={item} />
        </div>
      )}
    </section>
  );
}

type Props = { initial?: SkillTemplate; catalogs: CatalogRow[] };

/** Bank soal: form terstruktur untuk skill family `manual` (tanpa JSON). */
export function ManualEditor({ initial, catalogs }: Props) {
  const creating = !initial;
  const [meta, setMeta] = useState<SkillMeta>(() =>
    initial ? metaFromTemplate(initial) : emptyMeta(),
  );
  const [items, setItems] = useState<ItemDraft[]>(() =>
    initial ? draftsFromTemplate(initial) : [newItem()],
  );
  const [saved, setSaved] = useState(
    initial ? { status: initial.status, version: initial.version } : undefined,
  );

  const key = JSON.stringify({ meta, items });
  const debouncedKey = useDebounced(key, 400);
  const version = saved?.version ?? 1;
  const result = useMemo(() => {
    const d = JSON.parse(debouncedKey) as { meta: SkillMeta; items: ItemDraft[] };
    return checkManual(d.meta, d.items, version);
  }, [debouncedKey, version]);
  const checking = key !== debouncedKey;
  const ready = !checking && result.issues.length === 0 ? result.template : undefined;

  function onSaved(tpl: SkillTemplate) {
    setSaved({ status: tpl.status, version: tpl.version });
    setMeta((m) => ({ ...m, status: tpl.status }));
  }

  return (
    <>
      <PageHeader
        title={creating ? t('admin.manual.newTitle') : meta.title || meta.id}
        subtitle={t('admin.manual.subtitle')}
        actions={
          <Link className="ui-btn ui-btn-ghost" to="/admin/skill">
            <Icon name="back" />
            {t('admin.back')}
          </Link>
        }
      />
      <div className="adm-two">
        <Card title={t('admin.skill.metaTitle')}>
          <MetaFields meta={meta} onChange={setMeta} catalogs={catalogs} creating={creating} />
        </Card>
        <Card title={t('admin.validate.title')}>
          <IssueList
            issues={result.general}
            checking={checking}
            okText={
              result.issues.length
                ? t('admin.manual.itemIssues')
                : t('admin.manual.validOk', { n: items.length })
            }
          />
          {!checking && result.byItem.size > 0 && result.general.length === 0 && (
            <Notice tone="error">
              {t('admin.manual.itemIssuesList', {
                list: [...result.byItem.keys()].map((i) => i + 1).join(', '),
              })}
            </Notice>
          )}
          <SkillActions template={ready} creating={creating} saved={saved} onSaved={onSaved} />
        </Card>
      </div>
      <Card
        title={t('admin.manual.itemsTitle', { n: items.length })}
        actions={
          <Button variant="secondary" onClick={() => setItems((xs) => [...xs, newItem()])}>
            <Icon name="plus" />
            {t('admin.manual.addItem')}
          </Button>
        }
      >
        {items.map((it, i) => (
          <ItemEditor
            key={i}
            index={i}
            item={it}
            meta={meta}
            issues={checking ? [] : (result.byItem.get(i) ?? [])}
            onChange={(d) => setItems((xs) => xs.map((x, k) => (k === i ? d : x)))}
            onDuplicate={() =>
              setItems((xs) => [...xs.slice(0, i + 1), structuredClone(it), ...xs.slice(i + 1)])
            }
            onRemove={
              items.length > 1 ? () => setItems((xs) => xs.filter((_, k) => k !== i)) : undefined
            }
          />
        ))}
        <Button variant="secondary" onClick={() => setItems((xs) => [...xs, newItem()])}>
          <Icon name="plus" />
          {t('admin.manual.addItem')}
        </Button>
      </Card>
    </>
  );
}
