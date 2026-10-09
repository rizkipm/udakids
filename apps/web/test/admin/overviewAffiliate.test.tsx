import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AffiliateSection,
  CommissionSection,
  commissionFlow,
  costRatio,
  type AffiliateAnalytics,
  type CommissionYear,
} from '../../src/admin/OverviewAffiliate';
import { layoutTreemap } from '../../src/admin/insightCharts';
import {
  commissionMonth,
  deltaPct,
  formatPeriodParam,
  parsePeriod,
  periodQuery,
  rangeLabel,
} from '../../src/admin/period';
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
const analytics: AffiliateAnalytics = {
  months: Array.from({ length: 12 }, (_, i) => ({
    month: `2025-${String(i + 1).padStart(2, '0')}`,
    signups: i,
    subscribers: Math.floor(i / 2),
    commission: i * 1000,
    bonus: 500,
    paid: 0,
    revenue: i * 10_000,
  })),
  funnel: { clicks: 30, signups: 4, verified: 3, active: 2, subscribers: 1 },
  revenue: { total: 900_000, month: 50000, period: 200_000 },
  cost: 60_000,
  costPeriod: 20_000,
  flaggedAccounts: 0,
  top: [
    { id: 'p1', name: 'Bu Rina', code: 'RINA', members: 3, subscribers: 1, earned: 30_000 },
    { id: 'p2', name: 'Pak Budi', code: 'BUDI', members: 1, subscribers: 0, earned: 10_000 },
  ],
  period: {
    kind: 'month',
    from: '2025-10-01',
    to: '2025-10-31',
    prevFrom: '2025-09-01',
    prevTo: '2025-09-30',
    days: 31,
    bucket: 'day',
  },
};
const commission = {
  month: '2025-10',
  summary: { month: '2025-10', income: 300000, expense: 50000, net: 250000 },
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
const commissionYear: CommissionYear = {
  year: 2025,
  months: Array.from({ length: 12 }, (_, i) => ({
    month: `2025-${String(i + 1).padStart(2, '0')}`,
    income: 300_000,
    expense: 50_000,
    net: 250_000,
    closed: i < 9,
    future: false,
    shares: [
      {
        ownerId: 'o1',
        ownerName: 'Owner A',
        percentBp: 1000,
        amount: 25_000,
        paidAt: i < 8 ? '2025-01-31T00:00:00Z' : null,
      },
    ],
  })),
};

describe('filter periode (D-100)', () => {
  it('URL ↔ pilihan ↔ query API', () => {
    expect(parsePeriod(null)).toEqual({ kind: 'days', days: 30 });
    expect(parsePeriod('7h')).toEqual({ kind: 'days', days: 7 });
    expect(parsePeriod('12h')).toEqual({ kind: 'days', days: 30 });
    expect(parsePeriod('2026-03')).toEqual({ kind: 'month', year: 2026, month: 3 });
    expect(parsePeriod('2026-13')).toEqual({ kind: 'days', days: 30 });
    expect(parsePeriod('2025')).toEqual({ kind: 'year', year: 2025 });
    for (const raw of ['90h', '2026-03', '2025'])
      expect(formatPeriodParam(parsePeriod(raw))).toBe(raw);
    expect(periodQuery({ kind: 'month', year: 2026, month: 3 })).toBe('year=2026&month=3');
    expect(periodQuery({ kind: 'year', year: 2025 })).toBe('year=2025');
  });
  it('label rentang, bulan komisi, delta', () => {
    expect(rangeLabel('2026-10-01', '2026-10-09')).toMatch(/^1–9 Okt 2026$/);
    expect(rangeLabel('2025-01-01', '2026-10-09')).toMatch(/2025 – 9 Okt 2026$/);
    expect(commissionMonth({ kind: 'month', year: 2025, month: 2 }, null, '2026-10-09')).toBe(
      '2025-02',
    );
    expect(commissionMonth({ kind: 'days', days: 30 }, null, '2026-10-09')).toBe('2026-10');
    expect(deltaPct(140, 100)).toBe(40);
    expect(deltaPct(5, 0)).toBeNull();
  });
});

describe('grafik afiliasi & komisi', () => {
  it('treemap mengisi seluruh area tanpa tumpang tindih', () => {
    const rects = layoutTreemap(
      [
        { label: 'a', value: 50 },
        { label: 'b', value: 30 },
        { label: 'c', value: 20 },
        { label: 'z', value: 0 },
      ],
      400,
      200,
    );
    expect(rects).toHaveLength(3);
    expect(rects.reduce((a, r) => a + r.w * r.h, 0)).toBeCloseTo(80_000);
    expect(rects[0]!.w * rects[0]!.h).toBeCloseTo(40_000);
  });
  it('aliran komisi: pemasukan → pengeluaran/laba → owner/sisa', () => {
    const f = commissionFlow(300_000, 50_000, [{ ownerName: 'A', amount: 25_000 }]);
    expect(f).toMatchObject({ commission: 25_000, retained: 225_000 });
    expect(f.links.find((l) => l.to === 'net')?.value).toBe(250_000);
    // Rugi: tidak ada aliran ke laba bersih.
    const loss = commissionFlow(100, 300, []);
    expect(loss.links.find((l) => l.to === 'net')?.value).toBe(0);
    expect(costRatio(20_000, 200_000)).toBe(10);
    expect(costRatio(1, 0)).toBeNull();
  });
});

describe('dasbor admin: afiliasi & komisi', () => {
  it('afiliasi: satu panel lebar dengan corong, gauge, donat, area, treemap; ikut periode', async () => {
    const fetchMock = mockApi({
      '/admin/affiliate': totals(),
      '/admin/affiliate/analytics': analytics,
    });
    renderAdmin(<AffiliateSection sel={{ kind: 'month', year: 2025, month: 10 }} />);
    expect(await screen.findByText(t('admin.ins.affTitle'))).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([u]) => String(u))).toContainEqual(
      expect.stringContaining('/admin/affiliate/analytics?year=2025&month=10'),
    );
    expect(screen.getByText(t('admin.ins.affCostRatio', { pct: 10 }))).toBeInTheDocument();
    expect(screen.getByText(t('admin.ins.affRoiCaption', { amount: '10,0' }))).toBeInTheDocument();
    expect(screen.getByText(t('admin.ins.affNoTodo'))).toBeInTheDocument();
    for (const name of [
      t('admin.ins.affFunnel'),
      t('admin.ins.affRoi'),
      t('admin.ins.affMoney'),
      t('admin.ins.affGrowth'),
      t('admin.ins.affTrend'),
      t('admin.ins.affRevVsCost'),
      t('admin.ins.affTop'),
    ])
      expect(screen.getByRole('img', { name })).toBeInTheDocument();
    expect(screen.getAllByText('Bu Rina').length).toBeGreaterThan(0);
    // Hanya satu panel (tidak dibagi dua).
    expect(document.querySelectorAll('.aff-section > .ins-panel')).toHaveLength(1);
  });

  it('antrean pencairan & rekening jadi tautan ke tab yang tepat', async () => {
    mockApi({
      '/admin/affiliate': totals({
        payoutRequests: 2,
        payoutRequestedAmount: 45000,
        accountsPending: 1,
      }),
      '/admin/affiliate/analytics': analytics,
    });
    renderAdmin(<AffiliateSection sel={{ kind: 'days', days: 30 }} />);
    expect(
      await screen.findByRole('link', {
        name: t('admin.ins.affTodoPayout', { n: 2, amount: 'Rp45.000' }),
      }),
    ).toHaveAttribute('href', '/admin/afiliasi?tab=payouts');
    expect(
      screen.getByRole('link', { name: t('admin.ins.affTodoAccounts', { n: 1 }) }),
    ).toHaveAttribute('href', '/admin/afiliasi?tab=accounts');
  });

  it('komisi owner: section sendiri dengan aliran uang, tren, porsi, dan status per bulan', async () => {
    const fetchMock = mockApi({
      '/admin/finance/commission': commission,
      '/admin/finance/commission-year': commissionYear,
    });
    renderAdmin(<CommissionSection sel={{ kind: 'month', year: 2025, month: 10 }} period={null} />);
    expect(await screen.findByText(t('admin.ins.comTitle'))).toBeInTheDocument();
    const urls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(urls).toContainEqual(expect.stringContaining('commission?month=2025-10'));
    expect(urls).toContainEqual(expect.stringContaining('commission-year?year=2025'));
    expect(await screen.findByText(t('admin.ins.comUnpaid', { n: 1 }))).toBeInTheDocument();
    const scope = 'Oktober 2025';
    expect(
      screen.getByRole('img', { name: t('admin.ins.comFlow', { scope }) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: t('admin.ins.comTrend', { year: 2025 }) }),
    ).toBeInTheDocument();
    const grid = screen.getByRole('table', { name: t('admin.ins.comGrid', { year: 2025 }) });
    expect(within(grid).getAllByText(t('admin.ins.comState.paid'))).toHaveLength(8);
    expect(within(grid).getAllByText(t('admin.ins.comState.unpaid'))).toHaveLength(1);
    expect(within(grid).getAllByText(t('admin.ins.comState.open'))).toHaveLength(3);
  });

  it('komisi mode tahun: aliran uang dijumlah 12 bulan', async () => {
    mockApi({
      '/admin/finance/commission': commission,
      '/admin/finance/commission-year': commissionYear,
    });
    renderAdmin(<CommissionSection sel={{ kind: 'year', year: 2025 }} period={null} />);
    expect(
      await screen.findByRole('img', {
        name: t('admin.ins.comFlow', { scope: t('admin.ins.yearN', { year: 2025 }) }),
      }),
    ).toBeInTheDocument();
    // 12 × Rp25.000 komisi.
    expect(screen.getAllByText('Rp300.000').length).toBeGreaterThan(0);
  });
});
