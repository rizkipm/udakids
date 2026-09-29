import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { visualSchema, type Visual } from '@little-coder/engine';
import { VisualPicker, visualError } from '../../src/admin/skills/VisualPicker';
import { defaultVisual, PICKER_KINDS } from '../../src/admin/skills/visualDefaults';
import { t } from '../../src/i18n';

function Harness({ onValue }: { onValue: (v: Visual) => void }) {
  const [v, setV] = useState<Visual>({ kind: 'numeral', value: 1 });
  return (
    <VisualPicker
      label="Gambar"
      value={v}
      onChange={(next) => {
        onValue(next);
        setV(next);
      }}
    />
  );
}

describe('VisualPicker', () => {
  it('visual awal setiap jenis valid', () => {
    for (const k of PICKER_KINDS) {
      expect(visualSchema.safeParse(defaultVisual(k)).success, k).toBe(true);
    }
    expect(visualError({ kind: 'word', text: '' })).toBeTruthy();
  });

  it('setiap pilihan jenis dan perubahan field menghasilkan Visual yang valid', () => {
    const seen: Visual[] = [];
    render(<Harness onValue={(v) => seen.push(v)} />);
    const kind = screen.getByLabelText(t('admin.visual.kind'));
    for (const k of PICKER_KINDS) {
      fireEvent.change(kind, { target: { value: k } });
    }
    expect(seen.map((v) => v.kind)).toEqual([...PICKER_KINDS]);

    fireEvent.change(kind, { target: { value: 'objects' } });
    fireEvent.change(screen.getByLabelText(t('admin.visual.field.count')), {
      target: { value: '7' },
    });
    fireEvent.change(screen.getByLabelText(t('admin.visual.field.object')), {
      target: { value: 'bebek' },
    });
    fireEvent.change(screen.getByLabelText(t('admin.visual.field.color')), {
      target: { value: 'kuning' },
    });
    expect(seen.at(-1)).toEqual({
      kind: 'objects',
      object: 'bebek',
      count: 7,
      layout: 'row',
      color: 'kuning',
    });
    fireEvent.change(screen.getByLabelText(t('admin.visual.field.color')), {
      target: { value: '' },
    });
    expect(seen.at(-1)).toEqual({ kind: 'objects', object: 'bebek', count: 7, layout: 'row' });

    fireEvent.change(kind, { target: { value: 'cubes' } });
    fireEvent.click(screen.getByRole('button', { name: t('admin.visual.addGroup') }));
    expect(seen.at(-1)).toEqual({ kind: 'cubes', counts: [3, 1], colors: ['biru', 'merah'] });

    fireEvent.change(kind, { target: { value: 'equation' } });
    fireEvent.change(screen.getByLabelText(t('admin.visual.field.result')), {
      target: { value: '3' },
    });
    expect(seen.at(-1)).toEqual({ kind: 'equation', left: 2, op: '+', right: 1, result: 3 });

    for (const v of seen) expect(visualSchema.safeParse(v).success, JSON.stringify(v)).toBe(true);
  });

  it('mode JSON untuk jenis lain', () => {
    const seen: Visual[] = [];
    render(<Harness onValue={(v) => seen.push(v)} />);
    fireEvent.change(screen.getByLabelText(t('admin.visual.kind')), { target: { value: 'other' } });
    const json = screen.getByLabelText(t('admin.visual.json'));
    fireEvent.change(json, {
      target: {
        value: '{"kind":"scene","relation":"inside","subject":"kucing","reference":"kotak"}',
      },
    });
    expect(seen.at(-1)).toEqual({
      kind: 'scene',
      relation: 'inside',
      subject: 'kucing',
      reference: 'kotak',
    });
    fireEvent.change(json, { target: { value: '{"kind":"scene"}' } });
    expect(seen).toHaveLength(1);
  });
});
