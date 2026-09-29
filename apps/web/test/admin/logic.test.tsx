import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SkillStat } from '../../src/api/types';
import { nextCategoryCode } from '../../src/admin/catalog/CatalogPage';
import { checkLevelText, LEVEL_STARTER } from '../../src/admin/levels/LevelEditor';
import { LevelSummary } from '../../src/admin/levels/LevelSummary';
import { sortSkillStats } from '../../src/admin/reports/ReportsPage';
import { t } from '../../src/i18n';

describe('logika halaman admin', () => {
  it('kode kategori berikutnya', () => {
    expect(nextCategoryCode([])).toBe('A');
    expect(nextCategoryCode(['A', 'B'])).toBe('C');
    expect(nextCategoryCode(['Y', 'Z'])).toBe('AA');
    expect(nextCategoryCode(['AA', 'C'])).toBe('AB');
  });

  it('level contoh valid dan dirender sebagai grid', () => {
    const res = checkLevelText(JSON.stringify(LEVEL_STARTER));
    expect(res.issues).toEqual([]);
    render(<LevelSummary level={res.level!} />);
    expect(
      screen.getByRole('img', { name: t('admin.level.gridLabel', { w: 4, h: 4 }) }),
    ).toBeInTheDocument();
    expect(checkLevelText('{').issues[0]?.path).toBe('JSON');
    expect(
      checkLevelText(JSON.stringify({ ...LEVEL_STARTER, goal: { x: 0, y: 3 } })).issues,
    ).not.toEqual([]);
  });

  it('urutan statistik skill: akurasi kosong di akhir', () => {
    const s = (id: string, answered: number, accuracy: number | null, category = 'A') =>
      ({ id, answered, accuracy, category, order: 1 }) as SkillStat;
    const rows = [s('a', 10, 80), s('b', 0, null), s('c', 30, 20, 'B')];
    const ids = (
      sort: Parameters<typeof sortSkillStats>[1]['sort'],
      answeredOnly = false,
      category = '',
    ) => sortSkillStats(rows, { sort, category, answeredOnly }).map((r) => r.id);
    expect(ids('accuracy-asc')).toEqual(['c', 'a', 'b']);
    expect(ids('accuracy-desc')).toEqual(['a', 'c', 'b']);
    expect(ids('answered-desc', true)).toEqual(['c', 'a']);
    expect(ids('order', false, 'A')).toEqual(['a', 'b']);
  });
});
