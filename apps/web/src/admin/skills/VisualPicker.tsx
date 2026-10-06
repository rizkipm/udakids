import { useState } from 'react';
import {
  ALL_SHAPE_IDS,
  BODY_PART_IDS,
  BODY_PARTS,
  COINS,
  COLORS,
  OBJECT_IDS,
  OBJECTS,
  SOLID_IDS,
  visualSchema,
  type Visual,
} from '@little-coder/engine';
import { VisualView } from '../../components/visuals';
import { t, type MessageKey } from '../../i18n';
import { Button, Checkbox, SelectField, TextArea, TextField } from '../../ui/ui';
import { Icon } from '../common';
import { defaultVisual, isPickerKind, PICKER_KINDS, type PickerKind } from './visualDefaults';

type Props = {
  label: string;
  value: Visual;
  onChange: (v: Visual) => void;
  onRemove?: () => void;
};

type V<K extends Visual['kind']> = Extract<Visual, { kind: K }>;

const OTHER = 'other';
const LAYOUTS = ['row', 'rows', 'scatter', 'ring', 'grid'] as const;
const opt = <T extends string | number>(xs: readonly T[], label?: (x: T) => string) =>
  xs.map((x) => ({ value: String(x), label: label ? label(x) : String(x) }));
const objectOptions = opt(OBJECT_IDS, (id) => OBJECTS[id].say);
const colorOptions = opt(COLORS);
const optionalColor = [{ value: '', label: '—' }, ...colorOptions];
const int = (s: string) => {
  const n = Math.trunc(Number(s));
  return Number.isFinite(n) ? n : 0;
};

/** Error pertama dari visualSchema (kosong = valid). */
export function visualError(v: unknown): string | undefined {
  const r = visualSchema.safeParse(v);
  if (r.success) return undefined;
  const i = r.error.issues[0];
  return i ? `${i.path.map(String).join('.') || 'visual'}: ${i.message}` : 'tidak valid';
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <TextField
      label={label}
      type="number"
      value={String(value)}
      min={min}
      max={max}
      onChange={(e) => onChange(int(e.target.value))}
    />
  );
}

/** Field khusus untuk setiap jenis visual. */
function KindFields({ value, onChange }: { value: Visual; onChange: (v: Visual) => void }) {
  const L = (k: string) => t(`admin.visual.field.${k}` as MessageKey);
  switch (value.kind) {
    case 'object': {
      const v = value;
      const scale = (s: string) => (s === '' ? undefined : Number(s));
      const upd = (patch: Partial<V<'object'>>) => {
        const next: V<'object'> = { ...v, ...patch };
        (['color', 'scaleX', 'scaleY'] as const).forEach((k) => {
          if (next[k] === undefined) delete next[k];
        });
        onChange(next);
      };
      return (
        <>
          <SelectField
            label={L('object')}
            value={v.object}
            options={objectOptions}
            onChange={(e) => upd({ object: e.target.value as V<'object'>['object'] })}
          />
          <SelectField
            label={L('color')}
            value={v.color ?? ''}
            options={optionalColor}
            onChange={(e) => upd({ color: (e.target.value || undefined) as V<'object'>['color'] })}
          />
          <TextField
            label={L('scaleX')}
            type="number"
            step={0.1}
            min={0.2}
            max={2}
            value={v.scaleX === undefined ? '' : String(v.scaleX)}
            onChange={(e) => upd({ scaleX: scale(e.target.value) })}
          />
          <TextField
            label={L('scaleY')}
            type="number"
            step={0.1}
            min={0.2}
            max={2}
            value={v.scaleY === undefined ? '' : String(v.scaleY)}
            onChange={(e) => upd({ scaleY: scale(e.target.value) })}
          />
        </>
      );
    }
    case 'objects': {
      const v = value;
      const upd = (patch: Partial<V<'objects'>>) => {
        const next: V<'objects'> = { ...v, ...patch };
        if (next.color === undefined) delete next.color;
        onChange(next);
      };
      return (
        <>
          <SelectField
            label={L('object')}
            value={v.object}
            options={objectOptions}
            onChange={(e) => upd({ object: e.target.value as V<'objects'>['object'] })}
          />
          <NumberInput
            label={L('count')}
            value={v.count}
            min={0}
            max={30}
            onChange={(count) => upd({ count })}
          />
          <SelectField
            label={L('layout')}
            value={v.layout}
            options={opt(LAYOUTS)}
            onChange={(e) => upd({ layout: e.target.value as V<'objects'>['layout'] })}
          />
          <SelectField
            label={L('color')}
            value={v.color ?? ''}
            options={optionalColor}
            onChange={(e) => upd({ color: (e.target.value || undefined) as V<'objects'>['color'] })}
          />
        </>
      );
    }
    case 'numeral':
      return (
        <NumberInput
          label={L('value')}
          value={value.value}
          min={0}
          max={9999}
          onChange={(n) => onChange({ ...value, value: n })}
        />
      );
    case 'dots':
      return (
        <>
          <NumberInput
            label={L('count')}
            value={value.count}
            min={0}
            max={30}
            onChange={(count) => onChange({ ...value, count })}
          />
          <SelectField
            label={L('layout')}
            value={value.layout}
            options={opt(LAYOUTS)}
            onChange={(e) => onChange({ ...value, layout: e.target.value as V<'dots'>['layout'] })}
          />
        </>
      );
    case 'body':
      return (
        <SelectField
          label={L('part')}
          value={value.part ?? ''}
          options={[{ value: '', label: '—' }, ...opt(BODY_PART_IDS, (p) => BODY_PARTS[p])]}
          onChange={(e) => {
            const next: V<'body'> = {
              kind: 'body',
              part: (e.target.value || undefined) as V<'body'>['part'],
            };
            if (next.part === undefined) delete next.part;
            onChange(next);
          }}
        />
      );
    case 'die':
      return (
        <>
          <NumberInput
            label={L('value')}
            value={value.value}
            min={1}
            max={6}
            onChange={(n) => onChange({ ...value, value: n })}
          />
          <SelectField
            label={L('color')}
            value={value.color ?? ''}
            options={optionalColor}
            onChange={(e) => {
              const next: V<'die'> = {
                ...value,
                color: (e.target.value || undefined) as V<'die'>['color'],
              };
              if (next.color === undefined) delete next.color;
              onChange(next);
            }}
          />
        </>
      );
    case 'shape':
      return (
        <>
          <SelectField
            label={L('shape')}
            value={value.shape}
            options={opt(ALL_SHAPE_IDS)}
            onChange={(e) => onChange({ ...value, shape: e.target.value as V<'shape'>['shape'] })}
          />
          <SelectField
            label={L('color')}
            value={value.color}
            options={colorOptions}
            onChange={(e) => onChange({ ...value, color: e.target.value as V<'shape'>['color'] })}
          />
          <SelectField
            label={L('size')}
            value={value.size}
            options={opt(['s', 'm', 'l'] as const)}
            onChange={(e) => onChange({ ...value, size: e.target.value as V<'shape'>['size'] })}
          />
        </>
      );
    case 'solid':
      return (
        <>
          <SelectField
            label={L('solid')}
            value={value.solid}
            options={opt(SOLID_IDS)}
            onChange={(e) => onChange({ ...value, solid: e.target.value as V<'solid'>['solid'] })}
          />
          <SelectField
            label={L('color')}
            value={value.color}
            options={colorOptions}
            onChange={(e) => onChange({ ...value, color: e.target.value as V<'solid'>['color'] })}
          />
        </>
      );
    case 'coin':
      return (
        <SelectField
          label={L('coin')}
          value={String(value.value)}
          options={opt(COINS, (c) => `Rp${c}`)}
          onChange={(e) =>
            onChange({ ...value, value: Number(e.target.value) as V<'coin'>['value'] })
          }
        />
      );
    case 'word':
      return (
        <TextField
          label={L('text')}
          value={value.text}
          maxLength={40}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
        />
      );
    case 'cubes': {
      const v = value;
      const groups = v.counts.map((c, i) => ({ count: c, color: v.colors[i] ?? v.colors[0]! }));
      const write = (next: { count: number; color: V<'cubes'>['colors'][number] }[]) =>
        onChange({ ...v, counts: next.map((g) => g.count), colors: next.map((g) => g.color) });
      return (
        <>
          {groups.map((g, i) => (
            <div className="adm-inline-form" key={i}>
              <NumberInput
                label={t('admin.visual.field.groupCount', { n: i + 1 })}
                value={g.count}
                min={0}
                max={30}
                onChange={(count) => write(groups.map((x, k) => (k === i ? { ...x, count } : x)))}
              />
              <SelectField
                label={L('color')}
                value={g.color}
                options={colorOptions}
                onChange={(e) =>
                  write(
                    groups.map((x, k) =>
                      k === i ? { ...x, color: e.target.value as typeof g.color } : x,
                    ),
                  )
                }
              />
              {groups.length > 1 && (
                <Button
                  variant="ghost"
                  aria-label={t('admin.visual.removeGroup', { n: i + 1 })}
                  onClick={() => write(groups.filter((_, k) => k !== i))}
                >
                  <Icon name="trash" />
                </Button>
              )}
            </div>
          ))}
          {groups.length < 3 && (
            <Button
              variant="ghost"
              onClick={() => write([...groups, { count: 1, color: 'merah' }])}
            >
              <Icon name="plus" />
              {t('admin.visual.addGroup')}
            </Button>
          )}
        </>
      );
    }
    case 'frame':
      return (
        <>
          <NumberInput
            label={L('filled')}
            value={value.filled}
            min={0}
            max={value.size}
            onChange={(filled) => onChange({ ...value, filled })}
          />
          <SelectField
            label={L('frameSize')}
            value={String(value.size)}
            options={opt([5, 10, 20] as const)}
            onChange={(e) =>
              onChange({ ...value, size: Number(e.target.value) as V<'frame'>['size'] })
            }
          />
        </>
      );
    case 'equation': {
      const v = value;
      return (
        <>
          <NumberInput
            label={L('left')}
            value={v.left}
            onChange={(left) => onChange({ ...v, left })}
          />
          <SelectField
            label={L('op')}
            value={v.op}
            options={opt(['+', '-'] as const)}
            onChange={(e) => onChange({ ...v, op: e.target.value as '+' | '-' })}
          />
          <NumberInput
            label={L('right')}
            value={v.right}
            onChange={(right) => onChange({ ...v, right })}
          />
          <TextField
            label={L('result')}
            hint={t('admin.visual.field.resultHint')}
            type="number"
            value={v.result === undefined ? '' : String(v.result)}
            onChange={(e) => {
              const next: V<'equation'> = { ...v, result: int(e.target.value) };
              if (e.target.value === '') delete next.result;
              onChange(next);
            }}
          />
        </>
      );
    }
    case 'swatch':
      return (
        <SelectField
          label={L('color')}
          value={value.color}
          options={colorOptions}
          onChange={(e) => onChange({ ...value, color: e.target.value as V<'swatch'>['color'] })}
        />
      );
    case 'yesno':
      return (
        <Checkbox
          label={L('yes')}
          checked={value.value}
          onChange={(e) => onChange({ ...value, value: e.target.checked })}
        />
      );
    default:
      return null;
  }
}

/** Mode JSON untuk jenis yang tidak punya form (scene, row, mixed, ...). */
function JsonVisual({ value, onChange }: { value: Visual; onChange: (v: Visual) => void }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState<string>();
  return (
    <TextArea
      label={t('admin.visual.json')}
      value={text}
      error={error}
      rows={6}
      spellCheck={false}
      onChange={(e) => {
        setText(e.target.value);
        try {
          const parsed = JSON.parse(e.target.value) as unknown;
          const err = visualError(parsed);
          setError(err);
          if (!err) onChange(parsed as Visual);
        } catch (err2) {
          setError((err2 as Error).message);
        }
      }}
    />
  );
}

/** Pemilih gambar untuk soal manual, dengan pratinjau langsung. */
export function VisualPicker({ label, value, onChange, onRemove }: Props) {
  const kind: PickerKind | typeof OTHER = isPickerKind(value.kind) ? value.kind : OTHER;
  const [jsonMode, setJsonMode] = useState(kind === OTHER);
  const error = visualError(value);

  return (
    <fieldset className="adm-picker">
      <legend>
        <strong>{label}</strong>
      </legend>
      <div className="adm-picker-body">
        <div>
          <SelectField
            label={t('admin.visual.kind')}
            value={jsonMode ? OTHER : kind}
            options={[
              ...PICKER_KINDS.map((k) => ({
                value: k,
                label: t(`admin.visual.kind.${k}` as MessageKey),
              })),
              { value: OTHER, label: t('admin.visual.kind.other') },
            ]}
            onChange={(e) => {
              const k = e.target.value;
              if (k === OTHER) {
                setJsonMode(true);
                return;
              }
              setJsonMode(false);
              if (isPickerKind(k) && k !== value.kind) onChange(defaultVisual(k));
            }}
          />
          {jsonMode ? (
            <JsonVisual key={value.kind} value={value} onChange={onChange} />
          ) : (
            <KindFields value={value} onChange={onChange} />
          )}
        </div>
        <div>
          <div className="adm-picker-preview" aria-hidden>
            {!error && <VisualView visual={value} size={110} />}
          </div>
          {onRemove && (
            <Button variant="ghost" onClick={onRemove} style={{ marginTop: 8 }}>
              <Icon name="trash" />
              {t('admin.visual.remove')}
            </Button>
          )}
        </div>
      </div>
      {error && <small className="ui-error">{error}</small>}
    </fieldset>
  );
}
