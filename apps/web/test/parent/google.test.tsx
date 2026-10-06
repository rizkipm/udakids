import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSession, rememberedFamilyCode, setSession } from '../../src/auth/session';
import { t } from '../../src/i18n';
import { ParentApp } from '../../src/parent/ParentApp';
import { resetGoogleCache } from '../../src/parent/GoogleAuth';
import { ReferralLanding } from '../../src/site/ReferralLanding';
import { readReferral } from '../../src/site/referral';

const token = `h.${btoa(JSON.stringify({ sub: 'p9' }))}.s`;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const renderParent = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/r/:code" element={<ReferralLanding />} />
        <Route path="/orang-tua/*" element={<ParentApp />} />
      </Routes>
    </MemoryRouter>,
  );

/** Google Identity Services tiruan: menyimpan callback agar test bisa "memilih akun". */
function fakeGoogle() {
  const g = {
    callback: undefined as undefined | ((r: { credential: string }) => void),
    initialize: vi.fn((opts: { callback: (r: { credential: string }) => void }) => {
      g.callback = opts.callback;
    }),
    renderButton: vi.fn(),
    prompt: vi.fn(),
    cancel: vi.fn(),
  };
  vi.stubGlobal('google', { accounts: { id: g } });
  return g;
}

let fetchMock: ReturnType<typeof vi.fn>;
const posts = () =>
  fetchMock.mock.calls
    .filter(([u, init]) => String(u).endsWith('/auth/parent/google') && init?.method === 'POST')
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)) as Record<string, unknown>);

beforeEach(() => {
  resetGoogleCache();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  setSession('parent', null);
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('daftar & masuk dengan Google (D-066)', () => {
  it('akun baru: tombol + One Tap, langkah persetujuan wajib, lalu langkah tambah anak', async () => {
    const g = fakeGoogle();
    let created = false;
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/auth/parent/google') && init?.method !== 'POST')
        return Promise.resolve(json({ clientId: 'abc.apps.googleusercontent.com' }));
      if (url.endsWith('/auth/parent/google')) {
        const body = JSON.parse(String(init!.body)) as { consent?: boolean };
        if (!body.consent)
          return Promise.resolve(
            json({ needsConsent: true, email: 'bunda@gmail.com', name: 'Bunda Google' }),
          );
        created = true;
        return Promise.resolve(
          json({
            token,
            user: { id: 'p9', role: 'parent', name: 'Bunda Rara' },
            familyCode: 'GOO234',
            mustChangePassword: false,
            created: true,
          }),
        );
      }
      return Promise.resolve(json([]));
    });
    renderParent('/orang-tua/daftar?ref=RZK7QM');
    await waitFor(() => expect(g.renderButton).toHaveBeenCalledOnce());
    expect(g.initialize.mock.calls[0]![0]).toMatchObject({
      client_id: 'abc.apps.googleusercontent.com',
      context: 'signup',
    });
    expect(g.prompt).toHaveBeenCalled();
    // Pilihan awal: Google disarankan, form manual masih tersembunyi.
    expect(screen.getByText(t('parent.choice.googleHintRegister'))).toBeVisible();
    expect(screen.getByRole('button', { name: t('parent.choice.manualRegister') })).toBeVisible();
    expect(screen.queryByRole('button', { name: t('parent.register.submit') })).toBeNull();

    g.callback!({ credential: 'id-token-1' });
    expect(
      await screen.findByRole('heading', { name: t('parent.google.consentTitle') }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(t('parent.google.consentIntro', { email: 'bunda@gmail.com' })),
    ).toBeInTheDocument();
    const name = screen.getByLabelText(t('parent.register.name'), { exact: false });
    expect(name).toHaveValue('Bunda Google');
    // Tanpa centang persetujuan → akun tidak dibuat.
    fireEvent.click(screen.getByRole('button', { name: t('parent.google.create') }));
    expect(await screen.findByText(t('parent.consent.required'))).toBeInTheDocument();
    expect(posts()).toHaveLength(1);

    fireEvent.change(name, { target: { value: 'Bunda Rara' } });
    fireEvent.click(screen.getByLabelText(t('parent.consent.label')));
    fireEvent.click(screen.getByRole('button', { name: t('parent.google.create') }));
    expect(
      await screen.findByRole('heading', { name: t('parent.form.newTitle') }),
    ).toBeInTheDocument();
    expect(created).toBe(true);
    expect(posts()[1]).toEqual({
      credential: 'id-token-1',
      consent: true,
      name: 'Bunda Rara',
      referralCode: 'RZK7QM',
    });
    expect(getSession('parent')?.familyCode).toBe('GOO234');
    expect(rememberedFamilyCode()).toBe('GOO234');
  });

  it('link ajak teman /r/KODE → daftar dengan Google: kode terisi otomatis, nama pengajak tampil, ikut terkirim', async () => {
    const g = fakeGoogle();
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/auth/parent/google') && init?.method !== 'POST')
        return Promise.resolve(json({ clientId: 'abc.apps.googleusercontent.com' }));
      if (url.includes('/referral/RZK7QM/click'))
        return Promise.resolve(new Response(null, { status: 204 }));
      if (url.includes('/referral/RZK7QM'))
        return Promise.resolve(json({ valid: true, code: 'RZK7QM', name: 'Ri*** Sy***' }));
      if (url.endsWith('/auth/parent/google')) {
        const body = JSON.parse(String(init!.body)) as { consent?: boolean };
        return Promise.resolve(
          json(
            body.consent
              ? {
                  token,
                  user: { id: 'p9', role: 'parent', name: 'Bunda' },
                  familyCode: 'REF234',
                  mustChangePassword: false,
                  created: true,
                }
              : { needsConsent: true, email: 'bunda@gmail.com', name: 'Bunda' },
          ),
        );
      }
      return Promise.resolve(json([]));
    });
    renderParent('/r/rzk7qm');
    await waitFor(() => expect(g.renderButton).toHaveBeenCalled());
    g.callback!({ credential: 'id-token-ref' });
    const field = await screen.findByLabelText(t('parent.register.referral'));
    expect(field).toHaveValue('RZK7QM');
    expect(
      await screen.findByText(t('parent.register.referralBy', { name: 'Ri*** Sy***' })),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(t('parent.consent.label')));
    fireEvent.click(screen.getByRole('button', { name: t('parent.google.create') }));
    await waitFor(() => expect(posts()).toHaveLength(2));
    expect(posts()[1]).toMatchObject({ consent: true, referralCode: 'RZK7QM' });
    // Setelah akun jadi, kode di perangkat dilupakan (tidak terpakai dua kali).
    await waitFor(() => expect(readReferral()).toBe(''));
  });

  it('kode referal yang diketik di langkah Google: kode tidak dikenal ditandai dan akun tidak dibuat', async () => {
    const g = fakeGoogle();
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/auth/parent/google') && init?.method !== 'POST')
        return Promise.resolve(json({ clientId: 'abc.apps.googleusercontent.com' }));
      if (url.includes('/referral/'))
        return Promise.resolve(json({ valid: url.includes('/referral/BAKE22') }));
      if (url.endsWith('/auth/parent/google')) {
        const body = JSON.parse(String(init!.body)) as { consent?: boolean };
        return Promise.resolve(
          json(
            body.consent
              ? {
                  token,
                  user: { id: 'p9', role: 'parent', name: 'Ayah' },
                  familyCode: 'TYP234',
                  mustChangePassword: false,
                  created: true,
                }
              : { needsConsent: true, email: 'ayah@gmail.com', name: 'Ayah' },
          ),
        );
      }
      return Promise.resolve(json([]));
    });
    renderParent('/orang-tua/masuk');
    await waitFor(() => expect(g.renderButton).toHaveBeenCalled());
    g.callback!({ credential: 'id-token-typed' });
    const field = await screen.findByLabelText(t('parent.register.referral'));
    expect(field).toHaveValue('');
    fireEvent.click(screen.getByLabelText(t('parent.consent.label')));
    fireEvent.change(field, { target: { value: 'zzzz99' } });
    expect(await screen.findByText(t('parent.register.referralInvalid'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('parent.google.create') }));
    expect(posts()).toHaveLength(1);
    fireEvent.change(field, { target: { value: 'bake22' } });
    await waitFor(() =>
      expect(screen.queryByText(t('parent.register.referralInvalid'))).toBeNull(),
    );
    fireEvent.click(screen.getByRole('button', { name: t('parent.google.create') }));
    await waitFor(() => expect(posts()).toHaveLength(2));
    expect(posts()[1]).toMatchObject({ referralCode: 'BAKE22' });
  });

  it('akun lama: pilih akun Google di halaman masuk → langsung ke dasbor', async () => {
    const g = fakeGoogle();
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/auth/parent/google') && init?.method !== 'POST')
        return Promise.resolve(json({ clientId: 'abc.apps.googleusercontent.com' }));
      if (url.endsWith('/auth/parent/google'))
        return Promise.resolve(
          json({
            token,
            user: { id: 'p9', role: 'parent', name: 'Ayah Lama' },
            familyCode: 'OLD234',
            mustChangePassword: false,
            created: false,
          }),
        );
      return Promise.resolve(json([]));
    });
    renderParent('/orang-tua/masuk');
    await waitFor(() => expect(g.renderButton).toHaveBeenCalledOnce());
    expect(g.initialize.mock.calls[0]![0]).toMatchObject({ context: 'signin' });
    g.callback!({ credential: 'id-token-2' });
    await waitFor(() => expect(getSession('parent')?.familyCode).toBe('OLD234'));
    expect(screen.queryByRole('heading', { name: t('parent.google.consentTitle') })).toBeNull();
  });

  it('Google belum diatur di server → tombol tidak tampil, form email tetap ada', async () => {
    const g = fakeGoogle();
    fetchMock.mockImplementation(() => Promise.resolve(json({ clientId: null })));
    renderParent('/orang-tua/daftar');
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('/auth/parent/google'))).toBe(
        true,
      ),
    );
    expect(g.initialize).not.toHaveBeenCalled();
    // Langsung form manual, tanpa pilihan Google dan tanpa tautan kembali.
    expect(await screen.findByRole('button', { name: t('parent.register.submit') })).toBeVisible();
    expect(screen.queryByRole('button', { name: t('parent.choice.manualRegister') })).toBeNull();
    expect(screen.queryByRole('button', { name: t('parent.choice.back') })).toBeNull();
  });

  it('isi manual membuka form lama + catatan kode verifikasi; bisa kembali ke pilihan Google', async () => {
    const g = fakeGoogle();
    fetchMock.mockImplementation(() =>
      Promise.resolve(json({ clientId: 'abc.apps.googleusercontent.com' })),
    );
    renderParent('/orang-tua/daftar');
    await waitFor(() => expect(g.renderButton).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: t('parent.choice.manualRegister') }));
    expect(screen.getByRole('button', { name: t('parent.register.submit') })).toBeVisible();
    expect(screen.getByText(t('parent.choice.manualHintRegister'))).toBeVisible();
    expect(g.cancel).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: t('parent.choice.back') }));
    await waitFor(() => expect(g.renderButton).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('button', { name: t('parent.register.submit') })).toBeNull();
  });

  it('halaman masuk dengan ?email= langsung membuka form manual yang sudah terisi', async () => {
    fakeGoogle();
    fetchMock.mockImplementation(() =>
      Promise.resolve(json({ clientId: 'abc.apps.googleusercontent.com' })),
    );
    renderParent('/orang-tua/masuk?email=ayah%40contoh.id');
    expect(screen.getByRole('button', { name: t('parent.login.submit') })).toBeVisible();
    expect(screen.getByLabelText(t('parent.login.email'), { exact: false })).toHaveValue(
      'ayah@contoh.id',
    );
    expect(screen.getByRole('button', { name: t('parent.choice.back') })).toBeVisible();
  });
});
