import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FamiliesPage } from '../../src/admin/users/FamiliesPage';
import type { ChildRow, FamilyRow } from '../../src/admin/users/directoryTypes';
import type { PlanStatus } from '@little-coder/engine';
import { t } from '../../src/i18n';
import { pageList } from '../../src/ui/Pager';
import { mockApi, renderAdmin } from './helpers';

const free: PlanStatus = { tier: 'free', source: null, endsAt: null, books: [] };
const premium: PlanStatus = { tier: 'premium', source: 'admin', endsAt: null, books: [] };
const summary = {
  families: 25,
  familiesInactive: 1,
  children: 40,
  childrenInactive: 2,
  selfChildren: 6,
  classChildren: 9,
  premiumSelf: 3,
  premiumChildren: 7,
  adminGrants: 2,
};
const family = (i: number, plan: PlanStatus = free): FamilyRow => ({
  id: `00000000-0000-4000-8000-0000000000${String(i).padStart(2, '0')}`,
  name: `Keluarga ${i}`,
  email: `k${i}@contoh.id`,
  familyCode: 'ABC234',
  active: true,
  consentAt: '2026-09-01T00:00:00Z',
  createdAt: '2026-09-01T00:00:00Z',
  lastActiveAt: null,
  plan,
  grants: [],
  premiumChildren: plan.tier === 'premium' ? 1 : 0,
  children: [
    {
      id: `c${i}`,
      nickname: `Anak ${i}`,
      momoColor: 'biru',
      active: true,
      lastActiveAt: null,
      classId: null,
      plan,
      grants: [],
    },
  ],
});
const child: ChildRow = {
  id: '00000000-0000-4000-8000-0000000000aa',
  nickname: 'Bima',
  momoColor: 'hijau',
  active: true,
  lastActiveAt: null,
  createdAt: '2026-09-30T00:00:00Z',
  type: 'self',
  selfCode: 'LE2EGM',
  parent: null,
  class: null,
  passed: 3,
  plan: free,
  grants: [],
  familyGrants: [],
};

afterEach(() => vi.unstubAllGlobals());

describe('Orang tua & anak (D-041)', () => {
  it('ringkasan, status Free/Premium, paging, dan filter dikirim ke server', async () => {
    const fn = mockApi({
      '/admin/directory/summary': summary,
      '/admin/directory/families': {
        page: 1,
        pageSize: 20,
        total: 25,
        items: [family(1, premium), ...Array.from({ length: 19 }, (_, i) => family(i + 2))],
      },
    });
    renderAdmin(<FamiliesPage />, '/admin/keluarga');
    expect(await screen.findByText('Keluarga 1')).toBeInTheDocument();
    expect(screen.getByText(t('admin.dir.kPremiumHint', { n: 3 }))).toBeInTheDocument();
    expect(
      screen.getAllByLabelText(/^Premium · diberikan admin · selamanya$/).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Free').length).toBeGreaterThan(0);
    expect(
      screen.getByText(t('common.pager.range', { from: 1, to: 20, total: 25 })),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('common.pager.page', { n: 2 }) }));
    await waitFor(() =>
      expect(
        fn.mock.calls.some(
          ([u]) => String(u).includes('/admin/directory/families') && String(u).includes('page=2'),
        ),
      ).toBe(true),
    );
    fireEvent.change(screen.getByLabelText(t('admin.dir.fStatus')), {
      target: { value: 'premium' },
    });
    await waitFor(() =>
      expect(
        fn.mock.calls.some(
          ([u]) => String(u).includes('status=premium') && String(u).includes('page=1'),
        ),
      ).toBe(true),
    );
  });

  it('tab Anak: beri Premium ke anak mandiri lewat dialog (tanpa buku kas)', async () => {
    let posted: unknown;
    mockApi({
      '/admin/directory/summary': summary,
      '/admin/directory/children': { page: 1, pageSize: 20, total: 1, items: [child] },
      'POST /admin/premium': (_p: string, init?: RequestInit) => {
        posted = JSON.parse(String(init?.body));
        return { id: 'g1' };
      },
    });
    renderAdmin(<FamiliesPage />, '/admin/keluarga?tab=anak');
    const row = (await screen.findByText('Bima')).closest('.dir-tr-wrap') as HTMLElement;
    expect(within(row).getByText(t('admin.dir.typeSelf'))).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: t('admin.dir.setPremium') }));
    const dialog = screen.getByRole('dialog', {
      name: t('admin.dir.premiumChild', { name: 'Bima' }),
    });
    expect(within(dialog).getByText(t('admin.dir.noCash'))).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(t('admin.dir.duration')), {
      target: { value: '90' },
    });
    fireEvent.change(within(dialog).getByLabelText(t('admin.dir.note')), {
      target: { value: 'Beasiswa' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: t('admin.dir.grant') }));
    await waitFor(() =>
      expect(posted).toEqual({ childId: child.id, durationDays: 90, note: 'Beasiswa' }),
    );
    expect(await screen.findByText(t('admin.dir.granted', { name: 'Bima' }))).toBeInTheDocument();
  });

  it('nomor halaman dengan elipsis', () => {
    expect(pageList(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageList(6, 12)).toEqual([1, '…', 5, 6, 7, '…', 12]);
    expect(pageList(1, 12)).toEqual([1, 2, '…', 12]);
  });
});
