import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AffiliateCommissionOverview } from '../../src/admin/OverviewAffiliate';
import { t } from '../../src/i18n';
import { mockApi, renderAdmin } from './helpers';

afterEach(() => vi.unstubAllGlobals());

const totals = (over: Record<string, number> = {}) => ({
  available: 20000,
  pending: 5000,
  earned: 40000,
  payoutRequests: 0,
  payoutRequestedAmount: 0,
  paid: 15000,
  referred: 4,
  affiliates: 2,
  accountsPending: 0,
  ...over,
});
const analytics = {
  months: [
    { month: '2026-10', signups: 4, subscribers: 1, commission: 10000, bonus: 5000, paid: 0 },
  ],
  funnel: { clicks: 30, signups: 4, verified: 3, active: 2, subscribers: 1 },
  revenue: { total: 200000, month: 50000 },
  cost: 20000,
  flaggedAccounts: 0,
};
const commission = {
  month: '2026-10',
  summary: { month: '2026-10', income: 300000, expense: 50000, net: 250000 },
  closed: false,
  shares: [
    {
      id: null,
      ownerId: 'o1',
      ownerName: 'Owner A',
      percentBp: 1000,
      net: 250000,
      amount: 25000,
      paidAt: null,
    },
  ],
};

describe('dasbor admin: afiliasi & komisi', () => {
  it('menampilkan angka afiliasi, rasio biaya, dan pembagian komisi owner', async () => {
    mockApi({
      '/admin/affiliate': totals(),
      '/admin/affiliate/analytics': analytics,
      '/admin/finance/commission': commission,
    });
    renderAdmin(<AffiliateCommissionOverview />);
    expect(await screen.findByText(t('admin.ins.affTitle'))).toBeInTheDocument();
    expect(screen.getByText(t('admin.ins.affCostRatio', { pct: 10 }))).toBeInTheDocument();
    expect(screen.getByText(t('admin.ins.affNoTodo'))).toBeInTheDocument();
    expect(await screen.findByText('Owner A')).toBeInTheDocument();
    expect(screen.getByText(t('admin.ins.comUnpaid', { n: 1 }))).toBeInTheDocument();
  });

  it('antrean pencairan & rekening jadi tautan ke tab yang tepat', async () => {
    mockApi({
      '/admin/affiliate': totals({
        payoutRequests: 2,
        payoutRequestedAmount: 45000,
        accountsPending: 1,
      }),
      '/admin/affiliate/analytics': analytics,
      '/admin/finance/commission': commission,
    });
    renderAdmin(<AffiliateCommissionOverview />);
    expect(
      await screen.findByRole('link', {
        name: t('admin.ins.affTodoPayout', { n: 2, amount: 'Rp45.000' }),
      }),
    ).toHaveAttribute('href', '/admin/afiliasi?tab=payouts');
    expect(
      screen.getByRole('link', { name: t('admin.ins.affTodoAccounts', { n: 1 }) }),
    ).toHaveAttribute('href', '/admin/afiliasi?tab=accounts');
  });
});
