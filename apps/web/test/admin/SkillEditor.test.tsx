import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { skillTemplateSchema, type SkillTemplate } from '@little-coder/engine';
import type { CatalogRow } from '../../src/api/types';
import { SkillEditor, evaluateDraft } from '../../src/admin/skills/SkillEditor';
import {
  emptyMeta,
  metaFromTemplate,
  parseTags,
  suggestId,
} from '../../src/admin/skills/skillForm';
import { t } from '../../src/i18n';
import { renderAdmin } from './helpers';

const catalogs: CatalogRow[] = [
  {
    domain: 'math',
    grade: 'prek',
    title: 'Matematika Pra-TK',
    categories: [{ code: 'B', title: 'Membilang sampai 3' }],
    updatedAt: '2026-09-29T00:00:00Z',
  },
];

const template: SkillTemplate = skillTemplateSchema.parse({
  id: 'math.prek.b2.hitung-gambar',
  version: 2,
  domain: 'math',
  grade: 'prek',
  category: 'B',
  order: 2,
  title: 'Hitung gambar sampai 3',
  tier: 'basic',
  status: 'active',
  family: 'count',
  params: { visual: 'objects', range: [1, 3] },
});

afterEach(() => vi.unstubAllGlobals());

describe('SkillEditor', () => {
  it('template valid lolos validasi lokal', () => {
    const draft = {
      meta: metaFromTemplate(template),
      family: 'count' as const,
      paramsText: JSON.stringify(template.params),
      bandsText: '',
    };
    const res = evaluateDraft(draft, 2, 20);
    expect(res.issues).toEqual([]);
    expect(res.template?.version).toBe(2);
  });

  it('menampilkan masalah untuk params yang rusak', async () => {
    renderAdmin(<SkillEditor initial={template} catalogs={catalogs} />, '/admin/skill/x');
    const params = screen.getByLabelText(t('admin.skill.field.params'));
    fireEvent.change(params, { target: { value: '{ "range": [5, 1] }' } });
    const alert = await screen.findByRole('alert', {}, { timeout: 3000 });
    expect(alert).toHaveTextContent('rentang terbalik');
    expect(screen.getByRole('button', { name: t('admin.skill.save') })).toBeDisabled();

    fireEvent.change(params, { target: { value: '{ "range": [1, ' } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('JSON'), {
      timeout: 3000,
    });

    fireEvent.change(params, { target: { value: '{ "range": [1, 3] }' } });
    await waitFor(
      () => expect(screen.getByRole('button', { name: t('admin.skill.save') })).toBeEnabled(),
      { timeout: 3000 },
    );
  });

  it('helper form: tag dan usulan id', () => {
    expect(parseTags('merdeka=fondasi, sg = NEL')).toEqual({ merdeka: 'fondasi', sg: 'NEL' });
    const meta = { ...emptyMeta(), category: 'C', order: '4', title: 'Hitung Bébek!' };
    expect(suggestId(meta)).toBe('math.prek.c4.hitung-bebek');
  });
});
