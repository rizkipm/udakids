import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SkillStat } from '../../src/api/types';
import type { AdminInsights } from '../../src/admin/insightsTypes';
import { AdminApp } from '../../src/admin/AdminApp';
import {
  biggestLeak,
  funnelSteps,
  hardestSkills,
  insightNotes,
  peakSlot,
  popularDistractors,
  weekday,
} from '../../src/admin/OverviewPage';
import { niceTicks } from '../../src/admin/insightCharts';
import { rangeLabel } from '../../src/admin/period';
import { t } from '../../src/i18n';
import { mockApi, renderAdmin } from './helpers';

export const insights: AdminInsights = {
  period: {
    kind: 'days',
    from: '2026-09-01',
    to: '2026-09-30',
    prevFrom: '2026-08-02',
    prevTo: '2026-08-31',
    days: 30,
    bucket: 'day',
  },
  firstYear: 2025,
  updatedAt: '2026-10-01T08:00:00Z',
  users: {
    parents: 40,
    children: 70,
    selfOnly: 5,
    inClass: 20,
    admins: 1,
    facilitators: 3,
    newParents: 8,
    newChildren: 12,
    active7: 35,
  },
  sales: {
    revenueTotal: 1_250_000,
    revenue: 420_333,
    revenuePrev: 300_000,
    paid: 30,
    paidPrev: 20,
    orders: 40,
    awaitingReview: 3,
    awaitingPayment: 2,
    rejected: 1,
    expired: 3,
    cancelled: 1,
    createdPaid: 30,
    avgOrder: 41_667,
    successRate: 86,
    payingFamilies: 25,
    payingRate: 63,
    discountGiven: 90_000,
    uniqueCode: 9_000,
    queue: { review: 3, payment: 2 },
    review: { reviewed: 12, medianHours: 0.5, p90Hours: 6, oldestPendingHours: 30 },
    topPackages: [
      { name: 'Akses Semua', sold: 2, revenue: 900_000 },
      { name: 'Kumbang', sold: 20, revenue: 400_000 },
    ],
  },
  recentOrders: [
    {
      id: 'o1',
      number: 'LC-261001-AAAAA',
      amount: 35_111,
      status: 'awaiting_review',
      createdAt: '2026-10-01T07:00:00Z',
      package: 'Akses Semua',
      parentName: 'Ibu Sari',
    },
  ],
  finance: {
    period: { income: 420_333, expense: 100_000, net: 320_333 },
    year: { year: 2026, income: 1_250_000, expense: 300_000, net: 950_000 },
  },
  learning: {
    rounds: 900,
    roundsPrev: 600,
    passRate: 72,
    avgScore: 74,
    minutes: 1200,
    learners: 50,
    learnersPrev: 40,
    topBooks: [{ title: 'Math Grade 1', domain: 'math', grade: 'sd1', rounds: 400, passRate: 55 }],
    retention: { prev: 20, returned: 6, fresh: 4, rate: 30 },
    cohorts: [
      { week: '2026-09-21', size: 10, active: [10, 6, 3] },
      { week: '2026-09-28', size: 4, active: [4, 1] },
      { week: '2026-10-05', size: 2, active: [2] },
    ],
    domains: [{ domain: 'math', rounds: 900, learners: 50, passRate: 72 }],
    scoreBands: [5, 5, 10, 20, 30, 40, 100, 200, 250, 240],
    heatmap: Array.from({ length: 7 }, (_, d) =>
      Array.from({ length: 24 }, (_, h) => (d === 2 && h === 19 ? 40 : h > 15 ? 3 : 0)),
    ),
  },
  funnel: { registered: 40, verified: 28, withChild: 25, active: 10, paying: 8 },
  classes: { open: 2, total: 3, students: 20 },
  series: Array.from({ length: 30 }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, '0')}`,
    revenue: i * 1000,
    orders: i % 3,
    paid: i % 2,
    rounds: i,
    passed: Math.floor(i / 2),
    learners: Math.min(i, 9),
    newParents: 1,
    newChildren: 0,
    newUsers: 1,
  })),
  months: Array.from({ length: 12 }, (_, i) => ({
    month: `2026-${String(i + 1).padStart(2, '0')}`,
    revenue: i * 10_000,
    paid: i,
    newParents: i,
    rounds: i * 3,
    learners: i,
    income: i * 10_000,
    expense: i * 2_000,
  })),
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
    const fetchMock = mockApi({ '/admin/insights': insights, '/admin/reports/skills': stats });
    renderAdmin(<AdminApp />);
    const nav = screen.getByRole('complementary', { name: t('admin.nav.label') });
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
    // Laporan (D-039): pendapatan, transaksi, pengguna, belajar dari /admin/insights.
    expect(await screen.findByText(t('admin.ins.revenuePeriod'))).toBeInTheDocument();
    expect(screen.getAllByText('Rp420.333').length).toBeGreaterThan(0);
    // Dibanding periode pembanding yang sama panjang (Rp300.000 → +40%).
    expect(screen.getAllByText(t('admin.ins.vsPrevUp', { pct: 40 })).length).toBeGreaterThan(0);
    expect(document.querySelector('.ins-filter-range')).toHaveTextContent(
      t('admin.ins.comparedTo', { prev: rangeLabel('2026-08-02', '2026-08-31') }),
    );
    expect(screen.getByRole('link', { name: t('admin.ins.noteReview', { n: 3 }) })).toHaveAttribute(
      'href',
      '/admin/transaksi',
    );
    // Paket terlaris diurutkan dari jumlah terjual (bukan nominal); tab Pendapatan membalik urutannya.
    const pkgNames = () =>
      [...document.querySelectorAll('.ich-barlist-head span')].map((el) => el.textContent);
    expect(pkgNames()).toEqual(['Kumbang', 'Akses Semua']);
    const pkgTabs = screen.getByRole('group', { name: t('admin.ins.topPackages') });
    fireEvent.click(within(pkgTabs).getByRole('button', { name: t('admin.ins.pkgByRevenue') }));
    expect(pkgNames()).toEqual(['Akses Semua', 'Kumbang']);
    // Grafik pendapatan: satu batang per hari yang ada pendapatannya (hari 0 = Rp0 tidak digambar).
    expect(
      screen
        .getByRole('img', { name: t('admin.ins.revenueChart', { per: t('admin.ins.perDay') }) })
        .querySelectorAll('path'),
    ).toHaveLength(29);
    for (const name of [
      t('admin.ins.funnel'),
      t('admin.ins.usersTitle'),
      t('admin.ins.scoreChart'),
      t('admin.ins.learnersChart', { per: t('admin.ins.perDay') }),
      t('admin.ins.heatTitle'),
      t('admin.ins.financeTitle'),
      t('admin.ins.signupChart', { per: t('admin.ins.perDay') }),
    ])
      expect(screen.getByRole('img', { name })).toBeInTheDocument();
    expect(screen.getAllByText(t('admin.ins.showTable')).length).toBeGreaterThan(5);
    // Kohort: persen dari ukuran kohort; minggu yang belum terjadi kosong.
    const cohort = screen.getByRole('table', { name: t('admin.ins.cohortTitle') });
    expect(within(cohort).getByText('60%')).toBeInTheDocument();
    expect(within(cohort).getByText('25%')).toBeInTheDocument();
    expect(cohort.querySelectorAll('td.is-future')).toHaveLength(3);
    // Layanan verifikasi & kode unik.
    expect(screen.getByText(t('admin.ins.minutesShort', { n: 30 }))).toBeInTheDocument();
    expect(screen.getByText(t('admin.ins.uniqueCode'))).toBeInTheDocument();
    // Tren 12 bulan bisa diganti metrik tanpa grafik dua sumbu.
    fireEvent.click(screen.getByRole('button', { name: t('admin.ins.trendFamilies') }));
    expect(
      screen.getByRole('img', {
        name: `${t('admin.ins.trendTitle')}: ${t('admin.ins.trendFamilies')}`,
      }),
    ).toBeInTheDocument();
    // s2 (< 5 jawaban) tidak ikut; s1 paling sulit.
    expect(await screen.findByRole('link', { name: 'A.1 Skill s1' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'A.2 Skill s2' })).not.toBeInTheDocument();
    expect(screen.getByText('kurang-satu')).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: t('common.shell.logout') })).toBeInTheDocument();
    // Filter bulan & tahun: semua data diminta ulang untuk periode itu (insights & kualitas soal).
    fireEvent.change(screen.getByRole('combobox', { name: t('admin.ins.filterYear') }), {
      target: { value: '2025' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: t('admin.ins.filterMonth') }), {
      target: { value: '3' },
    });
    const urls = () => fetchMock.mock.calls.map(([u]) => String(u));
    expect(
      urls().some((u) => u.includes('/admin/insights?year=2025') && !u.includes('month')),
    ).toBe(true);
    expect(urls().some((u) => u.includes('/admin/insights?year=2025&month=3'))).toBe(true);
    expect(urls().some((u) => u.includes('/admin/reports/skills?year=2025&month=3'))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: t('admin.ins.days', { n: 7 }) }));
    expect(urls().some((u) => u.includes('/admin/insights?days=7'))).toBe(true);
  });

  it('sidebar bisa disembunyikan (rel ikon) dan ditampilkan lagi; pilihan diingat', async () => {
    mockApi({ '/admin/insights': insights, '/admin/reports/skills': [] });
    const { container, unmount } = renderAdmin(<AdminApp />);
    const hide = screen.getByRole('button', { name: t('common.shell.collapse') });
    expect(hide).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(hide);
    expect(container.querySelector('.shell')).toHaveClass('is-rail');
    expect(screen.getByRole('button', { name: t('common.shell.expand') })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    // Label tetap ada untuk pembaca layar.
    expect(screen.getByRole('link', { name: t('admin.nav.skills') })).toBeInTheDocument();
    unmount();
    renderAdmin(<AdminApp />);
    expect(document.querySelector('.shell')).toHaveClass('is-rail');
    fireEvent.click(screen.getByRole('button', { name: t('common.shell.expand') }));
    expect(document.querySelector('.shell')).not.toHaveClass('is-rail');
    localStorage.clear();
  });

  it('catatan otomatis: verifikasi, tren pendapatan, buku dengan tingkat lulus rendah', () => {
    const notes = insightNotes(insights).map((n) => n.text);
    expect(notes).toContain(t('admin.ins.noteReview', { n: 3 }));
    const prev = rangeLabel('2026-08-02', '2026-08-31');
    expect(notes).toContain(t('admin.ins.noteRevenueUp', { pct: 40, prev }));
    expect(notes).toContain(t('admin.ins.noteUnverified', { n: 12 }));
    expect(notes).toContain(t('admin.ins.noteOldestPending', { h: 30 }));
    expect(notes).toContain(
      t('admin.ins.noteLeak', {
        from: t('admin.ins.fnWithChild'),
        to: t('admin.ins.fnActive'),
        pct: 40,
      }),
    );
    expect(notes).toContain(t('admin.ins.noteRetentionLow', { pct: 30, prev }));
    expect(notes).toContain(t('admin.ins.notePeak', { day: weekday(3, 'long'), hour: 19 }));
    expect(notes).toContain(t('admin.ins.noteWeakBook', { book: 'Math Grade 1', pct: 55 }));
    const quiet = insightNotes({
      ...insights,
      users: { ...insights.users, children: 0, parents: 0 },
      sales: {
        ...insights.sales,
        queue: { review: 0, payment: 0 },
        revenue: 0,
        revenuePrev: 0,
        orders: 0,
        review: { reviewed: 0, medianHours: null, p90Hours: null, oldestPendingHours: null },
      },
      funnel: { registered: 0, verified: 0, withChild: 0, active: 0, paying: 0 },
      learning: {
        ...insights.learning,
        topBooks: [],
        retention: { prev: 0, returned: 0, fresh: 0, rate: null },
        heatmap: [[1]],
      },
    });
    expect(quiet.map((n) => n.text)).toEqual([t('admin.ins.noteQuiet')]);
  });

  it('corong, jam ramai, sumbu Y', () => {
    expect(biggestLeak(funnelSteps(insights))).toMatchObject({ pct: 40 });
    expect(
      biggestLeak([
        { key: 'a', label: 'A', value: 2 },
        { key: 'b', label: 'B', value: 0 },
      ]),
    ).toBeNull();
    expect(peakSlot(insights.learning.heatmap)).toEqual({ day: 3, hour: 19, n: 40 });
    expect(peakSlot([[3]])).toBeNull();
    expect(weekday(1)).toMatch(/^Sen/);
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(3)).toEqual([0, 1, 2, 3]);
    expect(niceTicks(420_333)).toEqual([0, 200_000, 400_000, 600_000]);
  });

  it('hardestSkills & popularDistractors', () => {
    expect(hardestSkills(stats).map((s) => s.id)).toEqual(['s1', 's3']);
    expect(popularDistractors(stats)).toMatchObject([
      { tag: 'kurang-satu', count: 5 },
      { tag: 'lebih-satu', count: 4 },
    ]);
  });
});
