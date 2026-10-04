import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { childInsights, MAX_CHILDREN_PER_PARENT } from '@little-coder/engine';
import { setSession, useSession } from '../../src/auth/session';
import { t } from '../../src/i18n';
import { ParentApp } from '../../src/parent/ParentApp';

/** Bagian hero dasbor (tautan menu samping "Tambah profil anak" membuka halaman yang sama dengan pop-up). */
const hero = () =>
  within(screen.getByRole('region', { name: t('parent.dash.title', { name: 'Rizki' }) }));
import type { OverviewChild } from '../../src/parent/Progress';

/** Batas 7 anak per akun orang tua (D-063): info selalu terlihat + pop-up "buat akun terpisah". */
const N = MAX_CHILDREN_PER_PARENT;
const token = `h.${btoa(JSON.stringify({ sub: 'p1' }))}.s`;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function SessionProbe() {
  const s = useSession('parent');
  return <output data-testid="session">{s ? 'in' : 'out'}</output>;
}
const renderParent = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProbe />
      <Routes>
        <Route path="/orang-tua/*" element={<ParentApp />} />
      </Routes>
    </MemoryRouter>,
  );

const kid = (i: number): OverviewChild => ({
  id: `00000000-0000-4000-8000-00000000000${i}`,
  nickname: `Anak ${'ABCDEFGH'[i]}`,
  momoColor: 'biru',
  lastActiveAt: null,
  className: null,
  insights: childInsights({
    rounds: [],
    played: 0,
    results: {},
    skills: [],
    books: [],
    now: Date.parse('2026-10-08T05:00:00Z'),
  }),
});
const profile = (i: number) => ({
  id: `00000000-0000-4000-8000-00000000000${i}`,
  nickname: `Anak ${'ABCDEFGH'[i]}`,
  momoColor: 'biru',
  momoLook: null,
  reportToken: 'x',
  classId: null,
  className: null,
  classCode: null,
});
const kids = (n: number) => Array.from({ length: n }, (_, i) => kid(i));

let fetchMock: ReturnType<typeof vi.fn>;
const serve = (count: number, claim?: Response) =>
  fetchMock.mockImplementation((url: string, init?: RequestInit) =>
    Promise.resolve(
      url.endsWith('/parent/overview')
        ? json({
            children: kids(count),
            access: { paywall: false, freeLevels: 2, all: true, books: [] },
          })
        : url.endsWith('/parent/children/claim') && init?.method !== 'GET'
          ? (claim ?? json({}))
          : url.endsWith('/parent/children')
            ? json(Array.from({ length: count }, (_, i) => profile(i)))
            : json({}),
    ),
  );
const login = () =>
  setSession('parent', {
    token,
    user: { id: 'p1', role: 'parent', name: 'Rizki' },
    familyCode: 'ABC234',
  });

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  setSession('parent', null);
});

describe('info batas 7 anak', () => {
  it('halaman daftar & masuk menyebut batas sebelum akun dibuat', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({})));
    renderParent('/orang-tua/daftar');
    expect(await screen.findByText(t('parent.register.childLimit', { n: N }))).toBeInTheDocument();
    expect(screen.getByText(t('parent.register.subtitle', { n: N }))).toBeInTheDocument();
  });

  it('halaman masuk menyebut batas', async () => {
    renderParent('/orang-tua/masuk');
    expect(await screen.findByText(t('parent.login.childLimit', { n: N }))).toBeInTheDocument();
  });

  it('dasbor menampilkan "3 dari 7 anak" dan tombol tambah anak biasa', async () => {
    login();
    serve(3);
    renderParent('/orang-tua');
    expect(
      await screen.findByText(t('parent.limit.count', { count: 3, n: N })),
    ).toBeInTheDocument();
    expect(hero().getByRole('link', { name: t('parent.dash.addChild') })).toHaveAttribute(
      'href',
      '/orang-tua/anak/baru',
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('sudah 7 anak: anak ke-8 tidak bisa, pop-up akun terpisah', () => {
  beforeEach(login);

  it('tombol tambah anak membuka pop-up; "buat akun baru" keluar lalu ke halaman daftar', async () => {
    serve(N);
    renderParent('/orang-tua');
    expect(
      await screen.findByText(t('parent.limit.countFull', { count: N, n: N })),
    ).toBeInTheDocument();
    expect(hero().queryByRole('link', { name: t('parent.dash.addChild') })).toBeNull();
    fireEvent.click(hero().getByRole('button', { name: t('parent.dash.addChild') }));
    const dialog = await screen.findByRole('dialog', { name: t('parent.limit.title', { n: N }) });
    expect(within(dialog).getByText(t('parent.limit.how', { n: N }))).toBeInTheDocument();
    // "Mengerti" menutup tanpa keluar.
    fireEvent.click(within(dialog).getByRole('button', { name: t('parent.limit.ok') }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByTestId('session')).toHaveTextContent('in');
    // Buka lagi → keluar & buat akun baru.
    fireEvent.click(hero().getByRole('button', { name: t('parent.dash.addChild') }));
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: t('parent.limit.newAccount'),
      }),
    );
    expect(await screen.findByText(t('parent.register.childLimit', { n: N }))).toBeInTheDocument();
    expect(screen.getByTestId('session')).toHaveTextContent('out');
  });

  it('tautkan anak ke-8 tidak dibuka; pop-up yang muncul', async () => {
    serve(N);
    renderParent('/orang-tua');
    await screen.findByText(t('parent.limit.countFull', { count: N, n: N }));
    fireEvent.click(screen.getByRole('button', { name: t('parent.claim.open') }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByLabelText(new RegExp(t('parent.claim.code')))).toBeNull();
  });

  it('formulir tambah anak: tanpa formulir, pop-up langsung terbuka', async () => {
    serve(N);
    renderParent('/orang-tua/anak/baru');
    expect(
      await screen.findByRole('dialog', { name: t('parent.limit.title', { n: N }) }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('parent.form.submitNew') })).toBeNull();
  });

  it('server menolak tautan anak (child_limit) → pop-up, bukan pesan error biasa', async () => {
    serve(
      N - 1,
      json(
        {
          statusCode: 400,
          message: `Satu akun maksimal ${N} anak. Untuk anak berikutnya, buat akun orang tua baru.`,
          reason: 'child_limit',
        },
        400,
      ),
    );
    renderParent('/orang-tua');
    await screen.findByText(t('parent.limit.count', { count: N - 1, n: N }));
    fireEvent.click(screen.getByRole('button', { name: t('parent.claim.open') }));
    fireEvent.change(await screen.findByLabelText(new RegExp(t('parent.claim.code'))), {
      target: { value: 'ABC234' },
    });
    for (const name of ['kucing', 'bola', 'apel'])
      fireEvent.click(
        screen.getAllByRole('button').find((b) => b.getAttribute('aria-label')?.includes(name))!,
      );
    fireEvent.click(screen.getByRole('button', { name: t('parent.claim.submit') }));
    expect(
      await screen.findByRole('dialog', { name: t('parent.limit.title', { n: N }) }),
    ).toBeInTheDocument();
  });
});
