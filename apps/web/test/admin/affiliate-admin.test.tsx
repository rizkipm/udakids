import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AFFILIATE_SETTINGS } from '@little-coder/engine';
import { setSession } from '../../src/auth/session';
import { t } from '../../src/i18n';
import { AffiliateAdminPage } from '../../src/admin/affiliate/AffiliateAdminPage';

const token = `h.${btoa(JSON.stringify({ sub: 's1' }))}.s`;
const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const overview = {
  available: 186500,
  pending: 42000,
  earned: 512000,
  payoutRequests: 2,
  payoutRequestedAmount: 35000,
  paid: 284000,
  referred: 46,
  affiliates: 12,
  accountsPending: 1,
};
const analytics = {
  months: Array.from({ length: 12 }, (_, i) => ({
    month: `2026-${String((i % 12) + 1).padStart(2, '0')}`,
    signups: i,
    subscribers: 0,
    commission: i * 1000,
    bonus: 0,
    paid: 0,
  })),
  funnel: { clicks: 640, signups: 46, verified: 41, active: 29, subscribers: 17 },
  revenue: { total: 1_000_000, month: 300_000 },
  cost: 500_000,
  flaggedAccounts: 1,
  top: [
    {
      id: 'a',
      name: 'Rizki Syaputra',
      code: 'RZK7QM',
      members: 14,
      subscribers: 5,
      earned: 128500,
    },
  ],
};

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn((url: string) => {
    if (url.endsWith('/admin/affiliate')) return Promise.resolve(json(overview));
    if (url.includes('/admin/affiliate/analytics')) return Promise.resolve(json(analytics));
    if (url.includes('/admin/affiliate/settings'))
      return Promise.resolve(json(DEFAULT_AFFILIATE_SETTINGS));
    return Promise.resolve(json([]));
  });
  vi.stubGlobal('fetch', fetchMock);
  setSession('staff', { token, user: { id: 's1', role: 'admin', name: 'Admin' } });
});
afterEach(() => {
  vi.unstubAllGlobals();
  setSession('staff', null);
});

describe('admin afiliasi', () => {
  it('ringkasan: badge antrean, insight yang bisa diklik, corong & afiliator teratas; pengaturan dengan contoh hitung', async () => {
    render(
      <MemoryRouter>
        <AffiliateAdminPage />
      </MemoryRouter>,
    );
    // Biaya 50% dari pendapatan referal → peringatan biaya tinggi.
    expect(await screen.findByText(t('admin.aff.note.costHigh', { pct: 50 }))).toBeInTheDocument();
    expect(screen.getByText(t('admin.aff.note.flags', { n: 1 }))).toBeInTheDocument();
    expect(screen.getByText(t('admin.aff.funnelTitle'))).toBeInTheDocument();
    expect(screen.getByText('Rizki Syaputra')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Pencairan/ })).toHaveTextContent('2');

    fireEvent.click(screen.getByRole('tab', { name: t('admin.aff.tab.settings') }));
    expect(
      await screen.findByText(
        t('admin.aff.example', { price: 'Rp50.000', commission: 'Rp16.500', percent: '33%' }),
      ),
    ).toBeInTheDocument();
  });
});
