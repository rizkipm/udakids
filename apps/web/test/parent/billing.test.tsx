import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  childInsights,
  PIN_PICTURES,
  PROOF_MAX_BYTES,
  formatRupiah,
  type PinPicture,
} from '@little-coder/engine';
import { setSession } from '../../src/auth/session';
import { t } from '../../src/i18n';
import type { BillingOverview, Order } from '../../src/parent/billingTypes';
import { ParentApp } from '../../src/parent/ParentApp';
import { pictureName } from '../../src/parent/PinSetter';

const token = `h.${btoa(JSON.stringify({ sub: 'p1' }))}.s`;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const renderParent = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/orang-tua/*" element={<ParentApp />} />
      </Routes>
    </MemoryRouter>,
  );

const PKG = '11111111-1111-4111-8111-111111111111';
const METHOD = '22222222-2222-4222-8222-222222222222';
const ORDER = '33333333-3333-4333-8333-333333333333';

const overview: BillingOverview = {
  packages: [
    {
      id: PKG,
      name: 'Paket Lengkap',
      description: 'Semua level di semua buku.',
      scope: 'all',
      books: [],
      durationDays: 365,
      pricing: { normal: 50_000, discount: 10_000, final: 40_000, discountActive: true },
      discountEndsAt: '2026-12-31T16:59:59.000Z',
    },
  ],
  methods: [
    {
      id: METHOD,
      kind: 'bank',
      provider: 'BCA',
      accountNumber: '1234567890',
      accountName: 'PT Contoh',
      instructions: 'Tulis nomor pesanan di berita transfer.',
    },
  ],
  entitlements: [],
  access: { paywall: true, freeLevels: 2, all: false, books: [] },
  settings: { paywall: true, freeLevels: 2, orderExpiryHours: 24 },
};

const order: Order = {
  id: ORDER,
  number: 'LC-261001-ABCDE',
  packageId: PKG,
  packageSnapshot: { name: 'Paket Lengkap', scope: 'all', books: [], durationDays: 365 },
  methodSnapshot: {
    kind: 'bank',
    provider: 'BCA',
    accountNumber: '1234567890',
    accountName: 'PT Contoh',
    instructions: 'Tulis nomor pesanan di berita transfer.',
  },
  priceNormal: 50_000,
  discount: 10_000,
  uniqueCode: 111,
  amount: 40_111,
  status: 'awaiting_payment',
  expiresAt: '2026-10-02T10:00:00.000Z',
  proofMime: null,
  proofAt: null,
  note: null,
  createdAt: '2026-10-01T10:00:00.000Z',
};

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  setSession('parent', {
    token,
    user: { id: 'p1', role: 'parent', name: 'Ibu Sari' },
    familyCode: 'XYZ789',
  });
});
afterEach(() => {
  setSession('parent', null);
  localStorage.clear();
  vi.unstubAllGlobals();
});

const callsTo = (suffix: string, method = 'GET') =>
  fetchMock.mock.calls.filter(
    ([url, init]) =>
      String(url).endsWith(suffix) &&
      ((init as RequestInit | undefined)?.method ?? 'GET') === method,
  );

describe('paket & pembayaran', () => {
  it('menampilkan level gratis, harga normal dicoret, potongan, dan harga akhir', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(overview)));
    renderParent('/orang-tua/paket');
    const card = (await screen.findByRole('heading', { name: 'Paket Lengkap' })).closest(
      'article',
    )! as HTMLElement;
    expect(screen.getByText(t('parent.billing.free', { n: 2 }))).toBeInTheDocument();
    expect(card.querySelector('s')).toHaveTextContent(formatRupiah(50_000));
    expect(card.querySelector('.pa-price-final')).toHaveTextContent(formatRupiah(40_000));
    expect(
      within(card).getByText(t('parent.billing.save', { amount: formatRupiah(10_000) })),
    ).toBeInTheDocument();
    expect(within(card).getByText(t('parent.billing.scopeAll'))).toBeInTheDocument();
    expect(within(card).getByText(t('parent.billing.days', { n: 365 }))).toBeInTheDocument();
    expect(screen.getByText(t('parent.billing.mineNone'))).toBeInTheDocument();
  });

  it('tanpa diskon: tidak ada harga dicoret', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        json({
          ...overview,
          packages: [
            {
              ...overview.packages[0]!,
              pricing: { normal: 50_000, discount: 0, final: 50_000, discountActive: false },
            },
          ],
        }),
      ),
    );
    renderParent('/orang-tua/paket');
    const card = (await screen.findByRole('heading', { name: 'Paket Lengkap' })).closest(
      'article',
    )! as HTMLElement;
    expect(card.querySelector('s')).toBeNull();
    expect(card.querySelector('.pa-price-final')).toHaveTextContent(formatRupiah(50_000));
  });

  it('beli → pilih cara bayar → pesanan dibuat dan jumlah transfer menampilkan kode unik', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/parent/billing')) return Promise.resolve(json(overview));
      if (url.endsWith('/parent/orders') && init?.method === 'POST')
        return Promise.resolve(json(order, 201));
      if (url.endsWith(`/parent/orders/${ORDER}`)) return Promise.resolve(json(order));
      return Promise.resolve(json({}, 404));
    });
    renderParent('/orang-tua/paket');
    fireEvent.click(
      await screen.findByRole('button', {
        name: t('parent.billing.buy', { name: 'Paket Lengkap' }),
      }),
    );
    // Tanpa memilih metode → pesan, belum ada POST.
    fireEvent.click(screen.getByRole('button', { name: t('parent.billing.createOrder') }));
    expect(screen.getByText(t('parent.billing.methodMissing'))).toBeInTheDocument();
    expect(callsTo('/parent/orders', 'POST')).toHaveLength(0);

    fireEvent.click(screen.getByRole('radio'));
    fireEvent.click(screen.getByRole('button', { name: t('parent.billing.createOrder') }));

    expect(
      await screen.findByRole('heading', {
        name: t('parent.order.title', { number: order.number }),
      }),
    ).toBeInTheDocument();
    const [post] = callsTo('/parent/orders', 'POST');
    expect(JSON.parse((post![1] as RequestInit).body as string)).toEqual({
      packageId: PKG,
      methodId: METHOD,
    });
    const amount = document.querySelector('.pa-amount-big')!;
    expect(amount).toHaveTextContent(formatRupiah(40_111));
    expect(amount.querySelector('mark')).toHaveTextContent('111');
    expect(screen.getByText(t('parent.order.exact'))).toBeInTheDocument();
    expect(screen.getByText(t('parent.order.created'))).toBeInTheDocument();
    expect(screen.getByText('1234567890')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('parent.order.cancel') })).toBeInTheDocument();
  });
});

describe('bukti transfer', () => {
  it('menolak file terlalu besar di perangkat tanpa mengirim', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(order)));
    renderParent(`/orang-tua/transaksi/${ORDER}`);
    const input = await screen.findByLabelText(t('parent.order.proofChoose'));
    const big = new File([new Uint8Array(PROOF_MAX_BYTES + 1)], 'besar.jpg', {
      type: 'image/jpeg',
    });
    fireEvent.change(input, { target: { files: [big] } });
    expect(screen.getByText(t('parent.order.proofSize'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('parent.order.proofSend') })).toBeDisabled();
    expect(callsTo('/proof', 'PUT')).toHaveLength(0);
  });

  it('mengunggah dengan PUT, badan = file, Content-Type = jenis file', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      init?.method === 'PUT'
        ? Promise.resolve(
            json({
              ...order,
              status: 'awaiting_review',
              proofMime: 'image/png',
              proofAt: order.createdAt,
            }),
          )
        : Promise.resolve(json(order)),
    );
    renderParent(`/orang-tua/transaksi/${ORDER}`);
    const input = await screen.findByLabelText(t('parent.order.proofChoose'));
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'bukti.png', {
      type: 'image/png',
    });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: t('parent.order.proofSend') }));
    expect(await screen.findByText(t('parent.order.proofSent'))).toBeInTheDocument();
    const [put] = callsTo(`/parent/orders/${ORDER}/proof`, 'PUT');
    const init = put![1] as RequestInit;
    expect(init.body).toBe(file);
    expect(init.headers).toMatchObject({
      'Content-Type': 'image/png',
      Authorization: `Bearer ${token}`,
    });
    expect(screen.getByText(t('parent.orderStatus.awaiting_review'))).toBeInTheDocument();
  });

  it('bukti ditolak: alasan tampil dan bisa unggah ulang', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        json({
          ...order,
          status: 'rejected',
          note: 'Nominal tidak sesuai',
          proofMime: 'image/png',
          proofAt: order.createdAt,
        }),
      ),
    );
    renderParent(`/orang-tua/transaksi/${ORDER}`);
    expect(
      await screen.findByText(t('parent.order.rejected', { note: 'Nominal tidak sesuai' })),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(t('parent.order.proofReplace'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('parent.order.cancel') })).toBeNull();
  });
});

describe('riwayat transaksi', () => {
  it('menampilkan nomor, paket, jumlah, status, dan tautan detail', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json([{ ...order, status: 'paid' }])));
    renderParent('/orang-tua/transaksi');
    const link = await screen.findByRole('link', { name: order.number });
    expect(link).toHaveAttribute('href', `/orang-tua/transaksi/${ORDER}`);
    const row = link.closest('tr')! as HTMLElement;
    expect(within(row).getByText('Paket Lengkap')).toBeInTheDocument();
    expect(within(row).getByText(formatRupiah(40_111))).toBeInTheDocument();
    expect(within(row).getByText(t('parent.orderStatus.paid'))).toBeInTheDocument();
  });
});

describe('tautkan anak yang daftar sendiri', () => {
  const pick = (p: PinPicture) =>
    fireEvent.click(
      screen.getByRole('button', { name: t('parent.pin.pick', { name: pictureName(p) }) }),
    );

  it('mengirim kode + sandi gambar, lalu menampilkan pesan dan memuat ulang daftar anak', async () => {
    let claimed = false;
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/parent/children/claim')) {
        claimed = true;
        return Promise.resolve(
          json({
            id: 'c9',
            nickname: 'Bima',
            momoColor: 'biru',
            lastActiveAt: null,
            createdAt: '',
          }),
        );
      }
      if (url.endsWith('/parent/overview') && init?.method === 'GET')
        return Promise.resolve(
          json({
            access: { paywall: true, freeLevels: 2, all: false, books: [] },
            children: claimed
              ? [
                  {
                    id: 'c9',
                    nickname: 'Bima',
                    momoColor: 'biru',
                    lastActiveAt: null,
                    className: null,
                    insights: childInsights({
                      rounds: [],
                      results: {},
                      skills: [],
                      books: [],
                      now: 0,
                    }),
                  },
                ]
              : [],
          }),
        );
      return Promise.resolve(json({}, 404));
    });
    renderParent('/orang-tua');
    fireEvent.click(await screen.findByRole('button', { name: t('parent.claim.open') }));
    // Kosong → pesan per isian, tanpa permintaan ke server.
    fireEvent.click(screen.getByRole('button', { name: t('parent.claim.submit') }));
    expect(screen.getByText(t('parent.claim.codeInvalid'))).toBeInTheDocument();
    expect(screen.getByText(t('parent.claim.pinMissing'))).toBeInTheDocument();
    expect(callsTo('/parent/children/claim', 'POST')).toHaveLength(0);

    fireEvent.change(screen.getByLabelText(t('parent.claim.code')), {
      target: { value: 'abc234' },
    });
    const pin = [PIN_PICTURES[0]!, PIN_PICTURES[3]!, PIN_PICTURES[0]!];
    pin.forEach(pick);
    fireEvent.click(screen.getByRole('button', { name: t('parent.claim.submit') }));

    expect(await screen.findByText(t('parent.claim.done', { name: 'Bima' }))).toBeInTheDocument();
    const [post] = callsTo('/parent/children/claim', 'POST');
    expect(JSON.parse((post![1] as RequestInit).body as string)).toEqual({
      familyCode: 'ABC234',
      pin,
    });
    expect(await screen.findByRole('heading', { name: 'Bima' })).toBeInTheDocument();
  });

  it('kode/sandi tidak cocok: pesan dari server tampil', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.endsWith('/claim')
        ? Promise.resolve(json({ message: 'Kode atau sandi gambar anak tidak cocok' }, 404))
        : Promise.resolve(json({ children: [], access: null })),
    );
    renderParent('/orang-tua');
    fireEvent.click(await screen.findByRole('button', { name: t('parent.claim.open') }));
    fireEvent.change(screen.getByLabelText(t('parent.claim.code')), {
      target: { value: 'ABC234' },
    });
    [PIN_PICTURES[1]!, PIN_PICTURES[1]!, PIN_PICTURES[2]!].forEach(pick);
    fireEvent.click(screen.getByRole('button', { name: t('parent.claim.submit') }));
    await waitFor(() =>
      expect(screen.getByText('Kode atau sandi gambar anak tidak cocok')).toBeInTheDocument(),
    );
  });
});
