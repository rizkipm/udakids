import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatRupiah } from '@little-coder/engine';
import { setSession } from '../../src/auth/session';
import { t } from '../../src/i18n';
import { ParentApp } from '../../src/parent/ParentApp';
import { ReferralLanding } from '../../src/site/ReferralLanding';
import { forgetReferral, readReferral, rememberReferral } from '../../src/site/referral';

const token = `h.${btoa(JSON.stringify({ sub: 'p1' }))}.s`;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/r/:code" element={<ReferralLanding />} />
        <Route path="/orang-tua/*" element={<ParentApp />} />
      </Routes>
    </MemoryRouter>,
  );

let fetchMock: ReturnType<typeof vi.fn>;
const calls = (part: string) =>
  fetchMock.mock.calls.filter(([url]) => String(url).includes(part)) as [string, RequestInit?][];

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  setSession('parent', null);
});

describe('kode referal di perangkat (D-063)', () => {
  it('diingat 30 hari, hanya kode yang valid', () => {
    const now = Date.now();
    rememberReferral('rzk-7qm', now);
    expect(readReferral(now)).toBe('RZK7QM');
    expect(readReferral(now + 31 * 86_400_000)).toBe('');
    rememberReferral('bukan kode!', now);
    expect(readReferral(now)).toBe('RZK7QM');
    forgetReferral();
    expect(readReferral(now)).toBe('');
  });

  it('link /r/KODE → hitung klik, kode terisi di form daftar, nama pengajak tersamar', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/referral/RZK7QM/click'))
        return Promise.resolve(new Response(null, { status: 204 }));
      if (url.includes('/referral/RZK7QM'))
        return Promise.resolve(json({ valid: true, code: 'RZK7QM', name: 'Ri*** Sy***' }));
      return Promise.resolve(json({}));
    });
    renderAt('/r/rzk7qm');
    const field = await screen.findByLabelText(t('parent.register.referral'));
    expect(field).toHaveValue('RZK7QM');
    expect(
      await screen.findByText(t('parent.register.referralBy', { name: 'Ri*** Sy***' })),
    ).toBeInTheDocument();
    expect(calls('/referral/RZK7QM/click')[0]?.[1]?.method).toBe('POST');
    expect(readReferral()).toBe('RZK7QM');
  });

  it('kode tidak dikenal ditandai dan pendaftaran tidak dikirim sampai diperbaiki', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(url.includes('/referral/') ? json({ valid: false }) : json({})),
    );
    renderAt('/orang-tua/daftar?ref=ZZZZZZ');
    expect(await screen.findByText(t('parent.register.referralInvalid'))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(t('parent.register.name'), { exact: false }), {
      target: { value: 'Ani' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('parent.register.submit') }));
    await waitFor(() => expect(calls('/auth/parent/register')).toHaveLength(0));
  });
});

const overview = {
  enabled: true,
  code: 'RZK7QM',
  link: 'https://kids.contoh.id/r/RZK7QM',
  rules: {
    signupBonus: 3500,
    commissionBp: 3300,
    minPayout: 15000,
    holdDays: 7,
    qualifyRounds: 3,
    qualifyDays: 30,
    accountCooldownDays: 3,
  },
  providers: [
    { id: 'bca', name: 'BCA', kind: 'bank' },
    { id: 'dana', name: 'DANA', kind: 'ewallet' },
  ],
  balance: { available: 6800, pending: 3500, earned: 10300, withdrawn: 0, paid: 0 },
  counts: { clicks: 12, signups: 4, verified: 3, active: 2, subscribers: 1 },
  account: null,
  openPayout: null,
  recent: [],
};

describe('halaman Afiliasi orang tua', () => {
  beforeEach(() => {
    setSession('parent', {
      token,
      user: { id: 'p1', role: 'parent', name: 'Rizki' },
      familyCode: 'ABC234',
    });
  });

  it('kode, link, saldo, aturan; anggota tersamar; pencairan terkunci sampai rekening terverifikasi & saldo cukup', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('/parent/affiliate')) return Promise.resolve(json(overview));
      if (url.includes('/parent/affiliate/members'))
        return Promise.resolve(
          json({
            page: 1,
            pageSize: 20,
            total: 1,
            items: [
              {
                name: 'Bu*** Sa***',
                joinedAt: '2026-10-01T00:00:00Z',
                status: 'subscribed',
                paidOrders: 1,
                earned: 6800,
                subMembers: 2,
              },
            ],
          }),
        );
      if (url.includes('/parent/affiliate/payouts')) return Promise.resolve(json([]));
      return Promise.resolve(json({}));
    });
    renderAt('/orang-tua/afiliasi');
    expect(await screen.findByText('RZK7QM')).toBeInTheDocument();
    expect(screen.getByText('https://kids.contoh.id/r/RZK7QM')).toBeInTheDocument();
    expect(screen.getAllByText(formatRupiah(6800)).length).toBeGreaterThan(0);
    expect(screen.getByText(t('parent.aff.step2', { percent: '33%' }))).toBeInTheDocument();
    expect(screen.getByText(t('parent.aff.step2Hint', { days: 7 }))).toBeInTheDocument();
    expect(screen.getByText(t('parent.aff.ins.unverified', { n: 1 }))).toBeInTheDocument();
    const wa = screen.getByRole('link', { name: t('parent.aff.shareWa') });
    expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=/);

    expect(await screen.findByText('Bu*** Sa***')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('parent.aff.view.tree') }));
    expect(screen.getByText(t('parent.aff.treeSub', { n: 2 }))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: t('parent.aff.tab.payout') }));
    // Belum ada rekening → formulir rekening tampil; tombol ajukan nonaktif (saldo < minimal).
    expect(await screen.findByLabelText(t('parent.aff.accountNumber'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('parent.aff.submitPayout') })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: t('parent.aff.saveAccount') }));
    expect(await screen.findByText('Kode verifikasi 6 angka')).toBeInTheDocument();
    expect(
      calls('/parent/affiliate/account').filter(([, init]) => init?.method === 'PUT'),
    ).toHaveLength(0);
  });
});

describe('batas 7 anak per akun', () => {
  beforeEach(() => {
    setSession('parent', {
      token,
      user: { id: 'p1', role: 'parent', name: 'Rizki' },
      familyCode: 'ABC234',
    });
  });

  it('formulir tambah anak diganti peringatan saat sudah 7 anak', async () => {
    const kids = Array.from({ length: 7 }, (_, i) => ({
      id: `00000000-0000-4000-8000-00000000000${i}`,
      nickname: `Anak ${'ABCDEFG'[i]}`,
      momoColor: 'biru',
      momoLook: null,
      reportToken: 'x',
      classId: null,
      className: null,
      classCode: null,
    }));
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(url.includes('/parent/children') ? json(kids) : json({})),
    );
    renderAt('/orang-tua/anak/baru');
    expect(await screen.findByText(t('parent.dash.childLimit', { n: 7 }))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('parent.form.submitNew') })).toBeNull();
  });
});
