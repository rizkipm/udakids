import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SkillStat } from '../../src/api/types';
import type { AdminInsights } from '../../src/admin/insightsTypes';
import { AdminApp } from '../../src/admin/AdminApp';
import { hardestSkills, insightNotes, popularDistractors } from '../../src/admin/OverviewPage';
import { t } from '../../src/i18n';
import { mockApi, renderAdmin } from './helpers';

export const insights: AdminInsights = {
  days: 30,
  month: '2026-10',
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
    activeN: 50,
  },
  sales: {
    revenueTotal: 1_250_000,
    revenueMonth: 420_333,
    revenuePrevMonth: 300_000,
    paid: 30,
    paidMonth: 12,
    orders: 40,
    awaitingReview: 3,
    awaitingPayment: 2,
    rejected: 1,
    expired: 3,
    cancelled: 1,
    avgOrder: 41_667,
    successRate: 86,
    payingFamilies: 25,
    payingRate: 63,
    discountGiven: 90_000,
    topPackages: [{ name: 'Akses Semua', sold: 20, revenue: 900_000 }],
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
    month: { income: 420_333, expense: 100_000, net: 320_333 },
    year: { income: 1_250_000, expense: 300_000, net: 950_000 },
  },
  learning: {
    rounds7: 321,
    rounds: 900,
    passRate: 72,
    avgScore: 74,
    minutes: 1200,
    learners: 50,
    topBooks: [{ title: 'Math Grade 1', domain: 'math', grade: 'sd1', rounds: 400, passRate: 55 }],
  },
  classes: { open: 2, total: 3, students: 20 },
  series: Array.from({ length: 30 }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, '0')}`,
    revenue: i * 1000,
    orders: i % 3,
    rounds: i,
    newUsers: 1,
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
    mockApi({ '/admin/insights': insights, '/admin/reports/skills': stats });
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
    expect(await screen.findByText(t('admin.ins.revenueMonth'))).toBeInTheDocument();
    expect(screen.getAllByText('Rp420.333').length).toBeGreaterThan(0);
    expect(screen.getByText(t('admin.ins.vsPrevUp', { pct: 40 }))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('admin.ins.noteReview', { n: 3 }) })).toHaveAttribute(
      'href',
      '/admin/transaksi',
    );
    expect(screen.getByText('Akses Semua', { selector: '.ins-rank span' })).toBeInTheDocument();
    expect(
      screen.getByLabelText(t('admin.ins.revenueChart', { days: 30 })).querySelectorAll('li'),
    ).toHaveLength(30);
    // s2 (< 5 jawaban) tidak ikut; s1 paling sulit.
    expect(await screen.findByRole('link', { name: 'A.1 Skill s1' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'A.2 Skill s2' })).not.toBeInTheDocument();
    expect(screen.getByText('kurang-satu')).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: t('common.shell.logout') })).toBeInTheDocument();
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
    expect(notes).toContain(t('admin.ins.noteRevenueUp', { pct: 40 }));
    expect(notes).toContain(t('admin.ins.noteWeakBook', { book: 'Math Grade 1', pct: 55 }));
    const quiet = insightNotes({
      ...insights,
      users: { ...insights.users, children: 0, parents: 0 },
      sales: {
        ...insights.sales,
        awaitingReview: 0,
        revenueMonth: 0,
        revenuePrevMonth: 0,
        orders: 0,
      },
      learning: { ...insights.learning, topBooks: [] },
    });
    expect(quiet.map((n) => n.text)).toEqual([t('admin.ins.noteQuiet')]);
  });

  it('hardestSkills & popularDistractors', () => {
    expect(hardestSkills(stats).map((s) => s.id)).toEqual(['s1', 's3']);
    expect(popularDistractors(stats)).toMatchObject([
      { tag: 'kurang-satu', count: 5 },
      { tag: 'lebih-satu', count: 4 },
    ]);
  });
});
