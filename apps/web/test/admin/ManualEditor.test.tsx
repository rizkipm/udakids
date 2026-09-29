import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateItem, skillTemplateSchema, validateTemplate } from '@little-coder/engine';
import type { CatalogRow } from '../../src/api/types';
import { ManualEditor } from '../../src/admin/skills/ManualEditor';
import {
  buildManualTemplate,
  checkManual,
  draftsFromTemplate,
  newItem,
  type ItemDraft,
} from '../../src/admin/skills/manualModel';
import { emptyMeta } from '../../src/admin/skills/skillForm';
import { t } from '../../src/i18n';
import { mockApi, renderAdmin } from './helpers';

const catalogs: CatalogRow[] = [
  {
    domain: 'math',
    grade: 'prek',
    title: 'Matematika Pra-TK',
    categories: [{ code: 'A', title: 'Bilangan sampai 3' }],
    updatedAt: '2026-09-29T00:00:00Z',
  },
];

const meta = {
  ...emptyMeta(),
  id: 'math.prek.a9.bank-apel',
  title: 'Bank soal apel',
  category: 'A',
  order: '9',
};

afterEach(() => vi.unstubAllGlobals());

describe('model soal manual', () => {
  it('membangun template manual yang lolos skillTemplateSchema (pilih satu & ketuk semua)', () => {
    const one: ItemDraft = {
      ...newItem(),
      prompt: 'Berapa apel?',
      stimulus: [{ kind: 'objects', object: 'apel', count: 2, layout: 'row' }],
      choices: [
        { visual: { kind: 'numeral', value: 1 }, say: 'satu', tag: 'kurang-satu' },
        { visual: { kind: 'numeral', value: 2 }, say: 'dua', tag: '' },
        { visual: { kind: 'numeral', value: 3 }, say: '', tag: 'lebih-satu' },
      ],
      answers: [1],
    };
    const many: ItemDraft = {
      ...newItem(),
      prompt: 'Ketuk semua lingkaran',
      multi: true,
      choices: [
        {
          visual: { kind: 'shape', shape: 'lingkaran', color: 'merah', size: 'm' },
          say: '',
          tag: '',
        },
        {
          visual: { kind: 'shape', shape: 'segitiga', color: 'biru', size: 'm' },
          say: '',
          tag: 'bentuk-lain',
        },
        {
          visual: { kind: 'shape', shape: 'lingkaran', color: 'hijau', size: 's' },
          say: '',
          tag: '',
        },
      ],
      answers: [2, 0],
    };
    const tpl = buildManualTemplate(meta, [one, many]);
    const parsed = skillTemplateSchema.safeParse(tpl);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.family).toBe('manual');
    const items = (parsed.data.params as { items: unknown[] }).items;
    expect(items[0]).toMatchObject({
      answer: 1,
      choices: [{ say: 'satu', tag: 'kurang-satu' }, { say: 'dua' }, { tag: 'lebih-satu' }],
    });
    expect(items[1]).toMatchObject({ answer: [0, 2] });
    expect(validateTemplate(parsed.data, 30)).toEqual([]);
    const item = generateItem(parsed.data, { seed: 1, band: 0 });
    expect(['pick-one', 'tap-all']).toContain(item.interaction.type);
    // Bolak-balik: template → form → template sama.
    expect(buildManualTemplate(meta, draftsFromTemplate(parsed.data))).toEqual(tpl);
  });

  it('masalah dikelompokkan per soal', () => {
    const bad: ItemDraft = { ...newItem(), prompt: '', multi: true, answers: [0, 1, 2] };
    const res = checkManual(meta, [{ ...newItem(), prompt: 'ok' }, bad]);
    expect(res.template).toBeUndefined();
    expect([...res.byItem.keys()]).toEqual([1]);
  });
});

describe('ManualEditor', () => {
  it('form terisi → siap disimpan, lalu dikirim sebagai skill manual', async () => {
    const post = vi.fn((_: string, init?: RequestInit) => ({
      ...JSON.parse(String(init?.body)),
      version: 1,
    }));
    mockApi({ 'POST /admin/skills': post, '/admin/skills/math.prek.a1.bank-apel': {} });
    renderAdmin(<ManualEditor catalogs={catalogs} />, '/admin/skill/manual-baru');
    fireEvent.change(screen.getByLabelText(t('admin.skill.field.title')), {
      target: { value: 'Bank apel' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('admin.skill.field.idSuggest') }));
    fireEvent.change(screen.getByLabelText(t('admin.manual.prompt')), {
      target: { value: 'Pilih angka dua' },
    });
    const correct = screen.getAllByLabelText(t('admin.manual.correct'));
    fireEvent.click(correct[1]!);
    await screen.findByText(t('admin.manual.validOk', { n: 1 }), {}, { timeout: 3000 });
    const create = screen.getByRole('button', { name: t('admin.skill.create') });
    await waitFor(() => expect(create).toBeEnabled());
    fireEvent.click(create);
    await waitFor(() => expect(post).toHaveBeenCalled());
    const body = JSON.parse(String(post.mock.calls[0]![1]?.body)) as unknown;
    const parsed = skillTemplateSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    expect(body).toMatchObject({
      id: 'math.prek.a1.bank-apel',
      family: 'manual',
      params: { items: [{ prompt: 'Pilih angka dua', answer: 1 }] },
    });
  });
});
