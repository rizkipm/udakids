import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingSettingsPage } from '../../src/admin/billing/BillingSettingsPage';
import { FamiliesPage } from '../../src/admin/users/FamiliesPage';
import type { FamilyRow } from '../../src/admin/users/directoryTypes';
import { getSession, setSession } from '../../src/auth/session';
import { resetContactLink, WhatsAppButton } from '../../src/components/WhatsAppButton';
import { t } from '../../src/i18n';
import { ParentApp } from '../../src/parent/ParentApp';
import type { ParentAccount } from '../../src/parent/AccountPage';
import { mockApi, renderAdmin } from '../admin/helpers';

/** Akun orang tua (D-064): lupa password, Akun saya, password sementara dari admin, tombol WhatsApp. */
const token = (sub: string) => `h.${btoa(JSON.stringify({ sub }))}.s`;
const user = { id: 'p1', role: 'parent' as const, name: 'Rizki' };
const account = (over: Partial<ParentAccount> = {}): ParentAccount => ({
  name: 'Rizki',
  email: 'rizki@contoh.id',
  familyCode: 'ABC234',
  mustChangePassword: false,
  passwordChangedAt: null,
  pendingEmail: null,
  ...over,
});
const label = (key: Parameters<typeof t>[0]) =>
  new RegExp(`^${t(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
const bodyOf = (fn: ReturnType<typeof mockApi>, path: string) => {
  const call = fn.mock.calls.find(([url, init]) => String(url).endsWith(path) && init?.body);
  return call ? (JSON.parse(String(call[1]?.body)) as Record<string, unknown>) : undefined;
};

const renderParent = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/orang-tua/*" element={<ParentApp />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  setSession('parent', null);
});

describe('lupa password', () => {
  it('halaman masuk punya tautan "Lupa password?" yang membawa email', () => {
    mockApi({});
    renderParent('/orang-tua/masuk');
    fireEvent.change(screen.getByLabelText(label('parent.login.email')), {
      target: { value: 'a@contoh.id' },
    });
    expect(screen.getByRole('link', { name: t('parent.forgot.link') })).toHaveAttribute(
      'href',
      '/orang-tua/lupa-password?email=a%40contoh.id',
    );
  });

  it('email → kode + password baru → langsung masuk', async () => {
    const fn = mockApi({
      'POST /auth/parent/forgot': { ok: true, cooldownSeconds: 60 },
      'POST /auth/parent/reset': {
        token: token('p1'),
        user,
        familyCode: 'ABC234',
        mustChangePassword: false,
      },
    });
    renderParent('/orang-tua/lupa-password?email=rizki@contoh.id');
    fireEvent.click(screen.getByRole('button', { name: t('parent.forgot.send') }));
    expect(
      await screen.findByText(t('parent.forgot.sent', { email: 'rizki@contoh.id' })),
    ).toBeInTheDocument();
    expect(bodyOf(fn, '/auth/parent/forgot')).toEqual({ email: 'rizki@contoh.id' });

    fireEvent.change(screen.getByLabelText(label('parent.verify.code')), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText(label('parent.forgot.newPassword')), {
      target: { value: 'rahasia-baru' },
    });
    fireEvent.change(screen.getByLabelText(label('parent.register.confirm')), {
      target: { value: 'beda-sendiri' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('parent.forgot.submit') }));
    expect(await screen.findByText(t('parent.register.confirmMismatch'))).toBeInTheDocument();
    expect(bodyOf(fn, '/auth/parent/reset')).toBeUndefined();

    fireEvent.change(screen.getByLabelText(label('parent.register.confirm')), {
      target: { value: 'rahasia-baru' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('parent.forgot.submit') }));
    await waitFor(() => expect(getSession('parent')?.token).toBe(token('p1')));
    expect(bodyOf(fn, '/auth/parent/reset')).toEqual({
      email: 'rizki@contoh.id',
      code: '123456',
      password: 'rahasia-baru',
    });
  });
});

describe('Akun saya', () => {
  beforeEach(() => setSession('parent', { token: token('p1'), user, familyCode: 'ABC234' }));

  it('ganti password: token baru disimpan, kode keluarga tetap', async () => {
    const fn = mockApi({
      'GET /parent/account': account({ mustChangePassword: true }),
      'POST /parent/account/password': { token: token('p1-baru'), user },
    });
    renderParent('/orang-tua/akun');
    expect(await screen.findByText(t('parent.account.mustChange'))).toBeInTheDocument();
    // Di halaman Akun saya pop-up tidak muncul (formulirnya sudah di sini).
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.change(screen.getByLabelText(label('parent.account.tempPassword')), {
      target: { value: 'Sementara123' },
    });
    fireEvent.change(screen.getByLabelText(label('parent.forgot.newPassword')), {
      target: { value: 'rahasia-baru' },
    });
    fireEvent.change(screen.getByLabelText(label('parent.register.confirm')), {
      target: { value: 'rahasia-baru' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('parent.account.savePassword') }));
    expect(await screen.findByText(t('parent.account.passwordSaved'))).toBeInTheDocument();
    expect(getSession('parent')).toMatchObject({ token: token('p1-baru'), familyCode: 'ABC234' });
    expect(bodyOf(fn, '/parent/account/password')).toEqual({
      currentPassword: 'Sementara123',
      password: 'rahasia-baru',
    });
    expect(screen.queryByText(t('parent.account.mustChange'))).toBeNull();
  });

  it('ganti nama ikut mengubah nama di sesi', async () => {
    mockApi({
      'GET /parent/account': account(),
      'PATCH /parent/account': account({ name: 'Bunda Rizki' }),
    });
    renderParent('/orang-tua/akun');
    fireEvent.change(await screen.findByLabelText(label('parent.account.name')), {
      target: { value: 'Bunda Rizki' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('parent.account.saveProfile') }));
    expect(await screen.findByText(t('parent.account.profileSaved'))).toBeInTheDocument();
    expect(getSession('parent')?.user.name).toBe('Bunda Rizki');
  });

  it('ganti email: kode ke email baru, lalu email akun berganti', async () => {
    const fn = mockApi({
      'GET /parent/account': account(),
      'POST /parent/account/email': { ok: true, pendingEmail: 'baru@contoh.id', minutes: 15 },
      'POST /parent/account/email/verify': account({ email: 'baru@contoh.id' }),
    });
    renderParent('/orang-tua/akun');
    fireEvent.change(await screen.findByLabelText(label('parent.account.newEmail')), {
      target: { value: 'baru@contoh.id' },
    });
    const emailCard = screen.getByRole('heading', { name: t('parent.account.email') })
      .parentElement!.parentElement!;
    fireEvent.change(within(emailCard).getByLabelText(label('parent.account.currentPassword')), {
      target: { value: 'rahasia-lama' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('parent.account.emailSend') }));
    expect(
      await screen.findByText(t('parent.account.emailCodeSent', { email: 'baru@contoh.id' })),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(label('parent.verify.code')), {
      target: { value: '654321' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('parent.account.emailConfirm') }));
    expect(
      await screen.findByText(t('parent.account.emailChanged', { email: 'baru@contoh.id' })),
    ).toBeInTheDocument();
    expect(bodyOf(fn, '/parent/account/email/verify')).toEqual({ code: '654321' });
  });

  it('password sementara: pop-up "segera ganti password" di dasbor → ke Akun saya', async () => {
    mockApi({ 'GET /parent/account': account({ mustChangePassword: true }) });
    renderParent('/orang-tua');
    const dialog = await screen.findByRole('dialog', {
      name: t('parent.account.mustChangeTitle'),
    });
    fireEvent.click(within(dialog).getByRole('button', { name: t('parent.account.changeNow') }));
    expect(
      await screen.findByRole('heading', { level: 1, name: t('parent.account.title') }),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('admin: tandai email terverifikasi → password sementara', () => {
  it('pop-up menampilkan password sementara dan bisa disalin', async () => {
    const family = {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Keluarga Rizki',
      email: 'rizki@contoh.id',
      familyCode: 'ABC234',
      active: true,
      consentAt: '2026-09-01T00:00:00Z',
      emailVerifiedAt: null,
      createdAt: '2026-09-01T00:00:00Z',
      lastActiveAt: null,
      plan: { tier: 'free', source: null, endsAt: null, books: [] },
      grants: [],
      premiumChildren: 0,
      children: [],
    } as unknown as FamilyRow;
    mockApi({
      '/admin/directory/summary': {},
      '/admin/directory/families': { page: 1, pageSize: 20, total: 1, items: [family] },
      [`POST /admin/mail/parents/${family.id}/verify`]: {
        ok: true,
        changed: true,
        email: 'rizki@contoh.id',
        tempPassword: 'Kp7mWx3qRt9a',
      },
    });
    const writeText = vi.fn((_text: string) => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    renderAdmin(<FamiliesPage />, '/admin/keluarga');
    fireEvent.click(await screen.findByRole('button', { name: t('admin.family.verifyEmail') }));
    const dialog = await screen.findByRole('dialog', {
      name: t('admin.family.tempTitle', { name: 'Keluarga Rizki' }),
    });
    expect(within(dialog).getByTestId('temp-password')).toHaveTextContent('Kp7mWx3qRt9a');
    expect(within(dialog).getByText(t('admin.family.tempNote'))).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: t('admin.family.tempCopy') }));
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(writeText.mock.calls[0]![0]).toContain('Kp7mWx3qRt9a');
    expect(
      await within(dialog).findByRole('button', { name: t('admin.family.tempCopied') }),
    ).toBeInTheDocument();
  });

  it('kirim ulang info akun hanya selama password sementara belum diganti, dengan konfirmasi', async () => {
    const base = {
      name: 'Keluarga',
      familyCode: 'ABC234',
      active: true,
      consentAt: '2026-09-01T00:00:00Z',
      emailVerifiedAt: '2026-10-01T00:00:00Z',
      createdAt: '2026-09-01T00:00:00Z',
      lastActiveAt: null,
      plan: { tier: 'free', source: null, endsAt: null, books: [] },
      grants: [],
      premiumChildren: 0,
      children: [],
    };
    const waiting = {
      ...base,
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Keluarga Ani',
      email: 'ani@contoh.id',
      mustChangePassword: true,
    } as unknown as FamilyRow;
    const done = {
      ...base,
      id: '00000000-0000-4000-8000-000000000003',
      name: 'Keluarga Budi',
      email: 'budi@contoh.id',
      mustChangePassword: false,
    } as unknown as FamilyRow;
    mockApi({
      '/admin/directory/summary': {},
      '/admin/directory/families': { page: 1, pageSize: 20, total: 2, items: [waiting, done] },
      [`POST /admin/mail/parents/${waiting.id}/verify`]: {
        ok: true,
        changed: true,
        email: 'ani@contoh.id',
        tempPassword: 'Zq8nVb4kLm2p',
      },
    });
    const confirm = vi.fn(() => true);
    vi.stubGlobal('confirm', confirm);
    renderAdmin(<FamiliesPage />, '/admin/keluarga');
    const resend = await screen.findAllByRole('button', { name: t('admin.family.resend') });
    // Hanya keluarga Ani (password sementara belum diganti); tombol "Tandai" tidak tampil lagi.
    expect(resend).toHaveLength(1);
    expect(screen.queryByRole('button', { name: t('admin.family.verifyEmail') })).toBeNull();
    fireEvent.click(resend[0]!);
    expect(confirm).toHaveBeenCalledWith(t('admin.family.resendConfirm', { name: 'Keluarga Ani' }));
    const dialog = await screen.findByRole('dialog', {
      name: t('admin.family.tempTitle', { name: 'Keluarga Ani' }),
    });
    expect(within(dialog).getByTestId('temp-password')).toHaveTextContent('Zq8nVb4kLm2p');
  });
});

describe('kontak WhatsApp', () => {
  beforeEach(resetContactLink);

  const renderAt = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <WhatsAppButton />
      </MemoryRouter>,
    );

  it('tampil di halaman depan dengan link dari admin', async () => {
    mockApi({ '/public/contact': { adminWhatsapp: 'https://wa.me/628123456789' } });
    renderAt('/');
    expect(await screen.findByRole('link', { name: t('common.whatsapp.label') })).toHaveAttribute(
      'href',
      'https://wa.me/628123456789',
    );
  });

  it('tidak tampil di area anak dan tidak memanggil server', async () => {
    const fn = mockApi({ '/public/contact': { adminWhatsapp: 'https://wa.me/628123456789' } });
    renderAt('/play/latihan');
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole('link')).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });

  it('tidak tampil bila admin belum mengisi nomor', async () => {
    const fn = mockApi({ '/public/contact': { adminWhatsapp: '' } });
    renderAt('/orang-tua/masuk');
    await waitFor(() => expect(fn).toHaveBeenCalled());
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('admin menyimpan nomor & link grup di Pengaturan', async () => {
    const fn = mockApi({
      '/admin/billing/settings': {
        paywall: false,
        freeLevels: 2,
        orderExpiryHours: 24,
        classFullAccess: true,
      },
      'GET /admin/contact': { adminWhatsapp: '', adminMessage: '', groupWhatsapp: '' },
      'PUT /admin/contact': (_: string, init?: RequestInit) => ({
        ...(JSON.parse(String(init?.body)) as object),
        adminWhatsapp: 'https://wa.me/628123456789',
      }),
    });
    renderAdmin(<BillingSettingsPage />, '/admin/pengaturan');
    fireEvent.change(await screen.findByLabelText(label('admin.contact.adminWhatsapp')), {
      target: { value: '08123456789' },
    });
    fireEvent.change(screen.getByLabelText(label('admin.contact.groupWhatsapp')), {
      target: { value: 'https://chat.whatsapp.com/AbCdEf' },
    });
    const card = screen
      .getByRole('heading', { name: t('admin.contact.cardTitle') })
      .closest('section')!;
    fireEvent.click(within(card).getByRole('button', { name: t('admin.save') }));
    expect(await screen.findByText(t('admin.contact.saved'))).toBeInTheDocument();
    expect(bodyOf(fn, '/admin/contact')).toEqual({
      adminWhatsapp: '08123456789',
      adminMessage: '',
      groupWhatsapp: 'https://chat.whatsapp.com/AbCdEf',
    });
    expect(screen.getByLabelText(label('admin.contact.adminWhatsapp'))).toHaveValue(
      'https://wa.me/628123456789',
    );
  });
});

describe('dasbor: kartu ajak teman', () => {
  beforeEach(() => setSession('parent', { token: token('p1'), user, familyCode: 'ABC234' }));
  const aff = (enabled: boolean) => ({
    enabled,
    code: 'UJI7K2',
    link: 'https://contoh.id/r/UJI7K2',
    rules: { signupBonus: 5000, commissionBp: 1000, minPayout: 15000 },
    balance: { available: 10000, pending: 5000 },
    counts: { signups: 3, active: 1 },
  });
  const overview = {
    children: [],
    access: { paywall: false, freeLevels: 2, all: true, books: [] },
  };

  it('menampilkan kode referal, info bonus/komisi, dan tautan ke Afiliasi', async () => {
    mockApi({ '/parent/overview': overview, '/parent/affiliate': aff(true) });
    renderParent('/orang-tua');
    expect(await screen.findByTestId('ref-code')).toHaveTextContent('UJI7K2');
    expect(screen.getByRole('link', { name: t('parent.aff.shareWa') })).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/?text='),
    );
    expect(screen.getByRole('link', { name: t('parent.dash.refMore') })).toHaveAttribute(
      'href',
      '/orang-tua/afiliasi',
    );
    expect(screen.getByTestId('child-count')).toHaveClass('pd-hero-count');
  });

  it('tidak tampil bila program afiliasi dimatikan', async () => {
    const fn = mockApi({ '/parent/overview': overview, '/parent/affiliate': aff(false) });
    renderParent('/orang-tua');
    await waitFor(() =>
      expect(fn.mock.calls.some(([u]) => String(u).endsWith('/parent/affiliate'))).toBe(true),
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('ref-code')).toBeNull();
  });
});
