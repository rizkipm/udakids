import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Overview, SkillStat } from '../../src/api/types';
import { AdminApp } from '../../src/admin/AdminApp';
import { hardestSkills, popularDistractors } from '../../src/admin/OverviewPage';
import { t } from '../../src/i18n';
import { mockApi, renderAdmin } from './helpers';

const overview: Overview = {
  parents: 4,
  children: 7,
  staff: 2,
  skills: 170,
  answersWeek: 321,
  activeChildrenWeek: 5,
  jago: 12,
};

const stat = (
  id: string,
  answered: number,
  accuracy: number | null,
  tags: [string, number][] = [],
): SkillStat => ({
  id,
  title: `Skill ${id}`,
  category: 'A',
  order: Number(id.replace(/\D/g, '')) || 1,
  grade: 'prek',
  domain: 'math',
  status: 'active',
  answered,
  accuracy,
  learners: 1,
  jago: 0,
  topDistractors: tags.map(([tag, count]) => ({ tag, count })),
});

const stats = [
  stat('s1', 10, 40, [['kurang-satu', 3]]),
  stat('s2', 3, 10),
  stat('s3', 20, 90, [
    ['kurang-satu', 2],
    ['lebih-satu', 4],
  ]),
  stat('s4', 0, null),
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AdminApp', () => {
  it('menampilkan menu samping dan ringkasan dari API', async () => {
    mockApi({ '/admin/reports/overview': overview, '/admin/reports/skills': stats });
    renderAdmin(<AdminApp />);
    const nav = screen.getByRole('navigation', { name: t('admin.nav.label') });
    for (const key of [
      'overview',
      'skills',
      'catalog',
      'levels',
      'staff',
      'families',
      'classes',
      'reports',
      'gallery',
    ] as const) {
      expect(nav).toHaveTextContent(t(`admin.nav.${key}`));
    }
    expect(screen.getByRole('link', { name: t('admin.nav.skills') })).toHaveAttribute(
      'href',
      '/admin/skill',
    );
    expect(await screen.findByText('321')).toBeInTheDocument();
    expect(screen.getByText(t('admin.overview.answersWeek'))).toBeInTheDocument();
    // s2 (< 5 jawaban) tidak ikut; s1 paling sulit.
    expect(await screen.findByRole('link', { name: 'A.1 Skill s1' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'A.2 Skill s2' })).not.toBeInTheDocument();
    expect(screen.getByText('kurang-satu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('admin.topbar.logout') })).toBeInTheDocument();
  });

  it('hardestSkills & popularDistractors', () => {
    expect(hardestSkills(stats).map((s) => s.id)).toEqual(['s1', 's3']);
    expect(popularDistractors(stats)).toMatchObject([
      { tag: 'kurang-satu', count: 5 },
      { tag: 'lebih-satu', count: 4 },
    ]);
  });
});
