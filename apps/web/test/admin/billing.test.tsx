import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CatalogRow } from '../../src/api/types';
import { AdminApp } from '../../src/admin/AdminApp';
import { CommissionPage } from '../../src/admin/billing/CommissionPage';
import { OrdersPage } from '../../src/admin/billing/OrdersPage';
import { PackagesPage, toPackageInput } from '../../src/admin/billing/PackagesPage';
import type {
  Commission,
  OrderRow,
  Owner,
  PackageRow,
  VoiceOverview,
} from '../../src/admin/billing/types';
import { bpToPercent, localInputToIso, percentToBp } from '../../src/admin/billing/util';
import { VoicePage } from '../../src/admin/voice/VoicePage';
import { t } from '../../src/i18n';
import { mockApi, renderAdmin } from './helpers';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const catalogs = [
  { domain: 'math', grade: 'tk', title: 'Matematika TK', categories: [], updatedAt: '' },
  { domain: 'literasi', grade: 'tk', title: 'Literasi TK', categories: [], updatedAt: '' },
] as unknown as CatalogRow[];

const pkg: PackageRow = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Paket Lengkap',
  description: 'Semua buku selama setahun',
  scope: 'books',
  books: [{ domain: 'math', grade: 'tk' }],
  durationDays: 365,
  price: 50_000,
  discountType: 'percent',
  discountValue: 30,
  discountStartsAt: null,
  discountEndsAt: null,
  active: true,
  sort: 0,
  pricing: { normal: 50_000, discount: 15_000, final: 35_000, discountActive: true },
  sold: 4,
};

const order: OrderRow = {
  id: '22222222-2222-4222-8222-222222222222',
  number: 'LC-261001-ABCDE',
  parentId: '33333333-3333-4333-8333-333333333333',
  packageId: pkg.id,
  packageSnapshot: { name: 'Paket Lengkap', scope: 'all', books: [], durationDays: null },
  methodSnapshot: {
    kind: 'bank',
    provider: 'BCA',
    accountNumber: '1234567890',
    accountName: 'Little Coder',
    instructions: '',
  },
  priceNormal: 50_000,
  discount: 15_000,
  uniqueCode: 111,
  amount: 35_111,
  status: 'awaiting_review',
  expiresAt: '2026-10-02T00:00:00.000Z',
  proofMime: null,
  proofAt: null,
  reviewedAt: null,
  note: null,
  createdAt: '2026-10-01T01:00:00.000Z',
  parentName: 'Bu Sari',
  parentEmail: 'sari@example.com',
};

describe('PackagesPage', () => {
  it('menampilkan harga normal dicoret, harga akhir, cakupan buku, dan jumlah terjual', async () => {
    mockApi({ '/admin/packages': [pkg], '/admin/catalogs': catalogs });
    renderAdmin(<PackagesPage />, '/admin/paket');
    const row = (await screen.findByText('Paket Lengkap')).closest('tr')!;
    const normal = within(row).getByText('Rp50.000');
    expect(normal.tagName).toBe('S');
    expect(within(row).getByText('Rp35.000')).toBeInTheDocument();
    expect(within(row).getByText(/Rp15\.000/)).toBeInTheDocument();
    expect(within(row).getByText(t('admin.pkg.days', { n: 365 }))).toBeInTheDocument();
    expect(await within(row).findByText('Matematika TK')).toBeInTheDocument();
    expect(within(row).getByText('4')).toBeInTheDocument();
  });

  it('pratinjau harga langsung memakai pricing() dari engine', async () => {
    mockApi({ '/admin/packages': [], '/admin/catalogs': catalogs });
    renderAdmin(<PackagesPage />, '/admin/paket');
    await screen.findByText(t('admin.pkg.empty'));
    fireEvent.change(screen.getByLabelText(t('admin.pkg.price')), { target: { value: '40000' } });
    fireEvent.change(screen.getByLabelText(t('admin.pkg.discountType')), {
      target: { value: 'amount' },
    });
    fireEvent.change(screen.getByLabelText(t('admin.pkg.discountValueAmount')), {
      target: { value: '5000' },
    });
    expect(screen.getByText('Rp35.000')).toBeInTheDocument();
    expect(screen.getByText('− Rp5.000')).toBeInTheDocument();
  });

  it('toPackageInput: buku, selamanya, dan diskon dibersihkan', () => {
    const base = {
      name: ' Paket ',
      description: '',
      scope: 'books' as const,
      books: ['math/tk'],
      durationDays: '',
      price: '35.000',
      discountType: 'none' as const,
      discountValue: '10',
      discountStartsAt: '2026-10-01T10:00',
      discountEndsAt: '',
      active: true,
      sort: '2',
    };
    expect(toPackageInput(base)).toMatchObject({
      name: 'Paket',
      books: [{ domain: 'math', grade: 'tk' }],
      durationDays: null,
      price: 35_000,
      discountValue: 0,
      discountStartsAt: null,
      sort: 2,
    });
    expect(toPackageInput({ ...base, discountType: 'percent' }).discountStartsAt).toBe(
      localInputToIso('2026-10-01T10:00'),
    );
  });
});

describe('OrdersPage', () => {
  it('menyetujui pesanan memanggil endpoint approve', async () => {
    const fetch = mockApi({
      '/admin/orders': [order],
      [`POST /admin/orders/${order.id}/approve`]: { ...order, status: 'paid' },
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderAdmin(<OrdersPage />, '/admin/transaksi');
    expect(await screen.findByText('LC-261001-ABCDE')).toBeInTheDocument();
    expect(screen.getByText('Rp35.111')).toBeInTheDocument();
    expect(fetch.mock.calls[0]![0]).toContain('/admin/orders?status=awaiting_review');
    fireEvent.click(
      screen.getByRole('button', { name: t('admin.order.openLabel', { number: order.number }) }),
    );
    fireEvent.click(screen.getByRole('button', { name: t('admin.order.approve') }));
    expect(
      await screen.findByText(t('admin.order.approved', { number: order.number })),
    ).toBeInTheDocument();
    const call = fetch.mock.calls.find(([u]) => String(u).endsWith('/approve'));
    expect(call?.[1]?.method).toBe('POST');
  });

  it('menolak butuh alasan dan mengirimnya', async () => {
    const fetch = mockApi({
      '/admin/orders': [order],
      [`POST /admin/orders/${order.id}/reject`]: { ...order, status: 'rejected', note: 'x' },
    });
    renderAdmin(<OrdersPage />, '/admin/transaksi');
    fireEvent.click(
      await screen.findByRole('button', {
        name: t('admin.order.openLabel', { number: order.number }),
      }),
    );
    fireEvent.change(screen.getByLabelText(t('admin.order.rejectReason')), {
      target: { value: 'Nominal tidak sesuai' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('admin.order.reject') }));
    await waitFor(() =>
      expect(fetch.mock.calls.some(([u]) => String(u).endsWith('/reject'))).toBe(true),
    );
    const call = fetch.mock.calls.find(([u]) => String(u).endsWith('/reject'))!;
    expect(JSON.parse(String(call[1]!.body))).toEqual({ reason: 'Nominal tidak sesuai' });
  });

  it('follow up pesanan belum dibayar: konfirmasi, kirim email, lalu tombol menunggu 24 jam', async () => {
    const unpaid: OrderRow = {
      ...order,
      status: 'awaiting_payment',
      proofMime: null,
      proofAt: null,
      followUps: 0,
      lastFollowUpAt: null,
    };
    const fetch = mockApi({
      '/admin/orders': [unpaid],
      [`POST /admin/orders/${order.id}/follow-up`]: {
        sentTo: order.parentEmail,
        followUps: 1,
        lastFollowUpAt: new Date().toISOString(),
      },
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderAdmin(<OrdersPage />, '/admin/transaksi');
    fireEvent.click(
      await screen.findByRole('button', {
        name: t('admin.order.openLabel', { number: order.number }),
      }),
    );
    expect(screen.getByText(t('admin.order.followUpHint'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('admin.order.followUpButton') }));
    expect(confirm).toHaveBeenCalledWith(
      t('admin.order.followUpConfirm', { email: order.parentEmail ?? '' }),
    );
    expect(
      await screen.findByText(t('admin.order.followedUp', { email: order.parentEmail ?? '' })),
    ).toBeInTheDocument();
    expect(fetch.mock.calls.some(([u]) => String(u).endsWith('/follow-up'))).toBe(true);
    expect(screen.getByRole('button', { name: t('admin.order.followUpButton') })).toBeDisabled();
  });

  it('pesanan yang menunggu verifikasi atau lunas tidak punya tombol follow up', async () => {
    mockApi({ '/admin/orders': [order] });
    renderAdmin(<OrdersPage />, '/admin/transaksi');
    fireEvent.click(
      await screen.findByRole('button', {
        name: t('admin.order.openLabel', { number: order.number }),
      }),
    );
    expect(screen.queryByRole('button', { name: t('admin.order.followUpButton') })).toBeNull();
  });
});

describe('CommissionPage', () => {
  const owners: Owner[] = [
    { id: 'o1', name: 'Andi', percentBp: 6000, active: true, createdAt: '' },
    { id: 'o2', name: 'Budi', percentBp: 1250, active: true, createdAt: '' },
  ];
  const commission: Commission = {
    month: '2026-09',
    summary: { month: '2026-09', income: 1_000_000, expense: 200_000, net: 800_000 },
    closed: false,
    canClose: true,
    shares: [
      {
        id: null,
        ownerId: 'o1',
        ownerName: 'Andi',
        percentBp: 6000,
        net: 800_000,
        amount: 480_000,
        paidAt: null,
      },
      {
        id: null,
        ownerId: 'o2',
        ownerName: 'Budi',
        percentBp: 1250,
        net: 800_000,
        amount: 100_000,
        paidAt: null,
      },
    ],
  };

  it('menampilkan total persen, laba bersih, dan komisi tiap owner', async () => {
    mockApi({ '/admin/finance/owners': owners, '/admin/finance/commission': commission });
    renderAdmin(<CommissionPage />, '/admin/komisi');
    expect(await screen.findByText(t('admin.owner.total', { total: '72,5' }))).toBeInTheDocument();
    expect(await screen.findByText('Rp480.000')).toBeInTheDocument();
    expect(screen.getByText('Rp100.000')).toBeInTheDocument();
    expect(screen.getAllByText('12,5%').length).toBeGreaterThan(0);
    expect(screen.getByText('Rp800.000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('admin.comm.close') })).toBeInTheDocument();
  });

  it('persen ↔ basis poin', () => {
    expect(percentToBp('12,5')).toBe(1250);
    expect(percentToBp('100')).toBe(10_000);
    expect(percentToBp('1,234')).toBeNaN();
    expect(bpToPercent(1250)).toBe('12,5');
  });
});

describe('VoicePage', () => {
  const overview: VoiceOverview = {
    settings: { enabled: true, model: 'gemini-2.5-flash-tts', voice: 'Leda', style: '', rate: 1 },
    providerReady: false,
    clips: 0,
    bytes: 0,
    madeToday: 0,
    rev: 'abc',
    lines: {
      vo_cmd_pick_one: { text: 'Pilih satu jawaban.', clip: null },
      vo_right_1: { text: 'Hebat!', clip: 'a'.repeat(64) },
    },
  };

  it('memberi tahu bila GOOGLE_TTS_API_KEY belum diisi', async () => {
    mockApi({ '/admin/voice': overview });
    renderAdmin(<VoicePage />, '/admin/suara');
    expect(await screen.findByText(t('admin.voice.noProvider'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buat semua suara/ })).toBeDisabled();
    expect(screen.getByText(t('admin.voice.group.cmd'))).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pilih satu jawaban.')).toBeInTheDocument();
    // Klip ada → tetap bisa diputar; tanpa klip dan tanpa penyedia → tidak bisa.
    expect(
      screen.getByRole('button', { name: t('admin.voice.play', { key: 'vo_right_1' }) }),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: t('admin.voice.play', { key: 'vo_cmd_pick_one' }) }),
    ).toBeDisabled();
  });
});

describe('AdminApp billing nav', () => {
  it('menampilkan jumlah transfer menunggu di menu Transaksi', async () => {
    mockApi({
      '/admin/reports/overview': {},
      '/admin/reports/skills': [],
      '/admin/orders/pending-count': { count: 3 },
    });
    renderAdmin(<AdminApp />);
    const link = await screen.findByRole('link', {
      name: `${t('admin.nav.orders')}, ${t('admin.nav.pendingOrders', { n: 3 })}`,
    });
    expect(link).toHaveAttribute('href', '/admin/transaksi');
    expect(link).toHaveTextContent('3');
  });
});
