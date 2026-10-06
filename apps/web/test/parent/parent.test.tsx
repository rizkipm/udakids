import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { childInsights, type PinPicture } from '@little-coder/engine';
import type { ChildReport as Report } from '../../src/api/types';
import { rememberedFamilyCode, setSession } from '../../src/auth/session';
import { ChildReport } from '../../src/components/ChildReport';
import { t } from '../../src/i18n';
import { ParentApp } from '../../src/parent/ParentApp';
import { PinSetter, pictureName } from '../../src/parent/PinSetter';
import type { OverviewChild } from '../../src/parent/Progress';

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

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  setSession('parent', null);
  localStorage.clear();
  vi.unstubAllGlobals();
});

const pick = (p: PinPicture) =>
  fireEvent.click(
    screen.getByRole('button', { name: t('parent.pin.pick', { name: pictureName(p) }) }),
  );

describe('pendaftaran orang tua', () => {
  it('tidak mengirim tanpa persetujuan', () => {
    renderParent('/orang-tua/daftar');
    fireEvent.change(screen.getByLabelText(t('parent.register.name')), {
      target: { value: 'Ibu Sari' },
    });
    fireEvent.change(screen.getByLabelText(t('parent.register.email')), {
      target: { value: 'sari@contoh.id' },
    });
    fireEvent.change(screen.getByLabelText(t('parent.register.password')), {
      target: { value: 'rahasia123' },
    });
    fireEvent.change(screen.getByLabelText(t('parent.register.confirm')), {
      target: { value: 'rahasia123' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('parent.register.submit') }));
    expect(screen.getByText(t('parent.consent.required'))).toBeInTheDocument();
    // Hanya pengaturan tombol Google yang diambil; pendaftaran tidak dikirim.
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('/auth/parent/register'))).toBe(
      false,
    );
  });

  it('dengan persetujuan: menyimpan sesi, mengingat kode keluarga, lalu langkah 2 (profil anak)', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.endsWith('/auth/parent/register')
        ? Promise.resolve(
            json({
              token,
              user: { id: 'p1', role: 'parent', name: 'Ibu Sari' },
              familyCode: 'ABC234',
            }),
          )
        : Promise.resolve(json([])),
    );
    renderParent('/orang-tua/daftar');
    fireEvent.change(screen.getByLabelText(t('parent.register.name')), {
      target: { value: 'Ibu Sari' },
    });
    fireEvent.change(screen.getByLabelText(t('parent.register.email')), {
      target: { value: 'sari@contoh.id' },
    });
    fireEvent.change(screen.getByLabelText(t('parent.register.password')), {
      target: { value: 'rahasia123' },
    });
    fireEvent.change(screen.getByLabelText(t('parent.register.confirm')), {
      target: { value: 'rahasia123' },
    });
    fireEvent.click(screen.getByLabelText(t('parent.consent.label')));
    fireEvent.click(screen.getByRole('button', { name: t('parent.register.submit') }));
    expect(
      await screen.findByRole('heading', { name: t('parent.form.newTitle') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: t('site.steps.label', { n: 3, total: 3 }) }),
    ).toBeInTheDocument();
    const registerCall = fetchMock.mock.calls.find(([u]) =>
      String(u).endsWith('/auth/parent/register'),
    )!;
    const body = JSON.parse((registerCall[1] as RequestInit).body as string) as Record<
      string,
      unknown
    >;
    expect(body).toEqual({
      name: 'Ibu Sari',
      email: 'sari@contoh.id',
      password: 'rahasia123',
      consent: true,
    });
    expect(rememberedFamilyCode()).toBe('ABC234');
  });
});

describe('verifikasi email (D-044)', () => {
  const fill = () => {
    fireEvent.change(screen.getByLabelText(t('parent.register.name')), {
      target: { value: 'Ibu Sari' },
    });
    fireEvent.change(screen.getByLabelText(t('parent.register.email')), {
      target: { value: 'sari@contoh.id' },
    });
    fireEvent.change(screen.getByLabelText(t('parent.register.password')), {
      target: { value: 'rahasia123' },
    });
    fireEvent.change(screen.getByLabelText(t('parent.register.confirm')), {
      target: { value: 'rahasia123' },
    });
    fireEvent.click(screen.getByLabelText(t('parent.consent.label')));
  };

  it('daftar → langkah kode; kode keliru menampilkan sisa percobaan; kode benar → profil anak', async () => {
    let tries = 0;
    fetchMock.mockImplementation((url: string, init: RequestInit) => {
      if (url.endsWith('/auth/parent/register'))
        return Promise.resolve(json({ verificationRequired: true, email: 'sari@contoh.id' }, 201));
      if (url.endsWith('/auth/parent/verify')) {
        const body = JSON.parse(init.body as string) as { code: string };
        if (tries++ === 0 || body.code !== '123456')
          return Promise.resolve(
            json({ message: 'Kode belum cocok. Periksa lagi email Anda.', attemptsLeft: 4 }, 400),
          );
        return Promise.resolve(
          json({
            token,
            user: { id: 'p1', role: 'parent', name: 'Ibu Sari' },
            familyCode: 'ABC234',
          }),
        );
      }
      return Promise.resolve(json([]));
    });
    renderParent('/orang-tua/daftar');
    fill();
    fireEvent.click(screen.getByRole('button', { name: t('parent.register.submit') }));
    const input = await screen.findByLabelText(t('parent.verify.code'), { exact: false });
    expect(screen.getByText('sari@contoh.id')).toBeInTheDocument();
    // Kirim ulang dikunci selama jeda.
    expect(screen.getByRole('button', { name: /Kirim ulang dalam/ })).toBeDisabled();
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    fireEvent.change(input, { target: { value: '12a345' } });
    expect(input).toHaveValue('12345');
    fireEvent.change(input, { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: t('parent.verify.submit') }));
    expect(await screen.findByText(/Sisa percobaan: 4/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(t('parent.verify.code'), { exact: false }), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('parent.verify.submit') }));
    expect(
      await screen.findByRole('heading', { name: t('parent.form.newTitle') }),
    ).toBeInTheDocument();
    expect(rememberedFamilyCode()).toBe('ABC234');
  });

  it('masuk sebelum verifikasi → diarahkan ke langkah kode', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        json(
          {
            message: 'Email belum diverifikasi.',
            code: 'EMAIL_NOT_VERIFIED',
            email: 'sari@contoh.id',
          },
          403,
        ),
      ),
    );
    renderParent('/orang-tua/masuk');
    fireEvent.change(screen.getByLabelText(t('parent.login.email'), { exact: false }), {
      target: { value: 'sari@contoh.id' },
    });
    fireEvent.change(
      screen.getByLabelText(new RegExp(`^${t('parent.login.password')}`), { selector: 'input' }),
      {
        target: { value: 'rahasia123' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: t('parent.login.submit') }));
    expect(
      await screen.findByText(t('parent.verify.fromLogin'), { exact: false }),
    ).toBeInTheDocument();
    // Datang dari masuk: kode boleh langsung diminta ulang.
    expect(screen.getByRole('button', { name: t('parent.verify.resend') })).toBeEnabled();
  });
});

describe('formulir daftar: tanda wajib & lihat password', () => {
  it('semua isian wajib bertanda * dan required; password bisa ditampilkan/disembunyikan', () => {
    renderParent('/orang-tua/daftar');
    for (const key of [
      'parent.register.name',
      'parent.register.email',
      'parent.register.password',
      'parent.register.confirm',
    ] as const) {
      expect(screen.getByLabelText(t(key))).toBeRequired();
    }
    expect(screen.getByLabelText(t('parent.consent.label'))).toBeRequired();
    expect(screen.getByText(t('common.required'))).toBeInTheDocument();
    const pw = screen.getByLabelText(t('parent.register.password'));
    expect(pw).toHaveAttribute('type', 'password');
    const [toggle] = screen.getAllByRole('button', { name: t('common.password.show') });
    fireEvent.click(toggle!);
    expect(pw).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getAllByRole('button', { name: t('common.password.hide') })[0]!);
    expect(pw).toHaveAttribute('type', 'password');
  });
});

describe('akses', () => {
  it('dashboard tanpa login diarahkan ke halaman masuk', () => {
    renderParent('/orang-tua');
    expect(screen.getByRole('heading', { name: t('parent.login.title') })).toBeInTheDocument();
  });
});

describe('PinSetter', () => {
  it('menghasilkan 3 gambar dan butuh konfirmasi yang sama', () => {
    const onChange = vi.fn();
    render(<PinSetter onChange={onChange} />);
    const next = screen.getByRole('button', { name: t('parent.pin.next') });
    pick('kucing');
    pick('apel');
    expect(next).toBeDisabled();
    pick('kucing');
    // Gambar ke-4 tidak bisa dipilih.
    expect(
      screen.getByRole('button', { name: t('parent.pin.pick', { name: 'bola' }) }),
    ).toBeDisabled();
    fireEvent.click(next);
    expect(screen.getByText(t('parent.pin.stepConfirm'))).toBeInTheDocument();

    // Konfirmasi keliru → diminta ulang, belum ada sandi.
    pick('kucing');
    pick('bola');
    pick('kucing');
    expect(screen.getByText(t('parent.pin.mismatch'))).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalledWith(expect.arrayContaining(['bola']));

    pick('kucing');
    pick('apel');
    pick('kucing');
    expect(onChange).toHaveBeenLastCalledWith(['kucing', 'apel', 'kucing']);
    expect(
      screen.getByText(t('parent.pin.done', { seq: 'kucing, apel, kucing' })),
    ).toBeInTheDocument();
  });

  it('hapus terakhir mengurangi urutan', () => {
    render(<PinSetter onChange={vi.fn()} />);
    pick('ikan');
    pick('kue');
    fireEvent.click(screen.getByRole('button', { name: t('parent.pin.undo') }));
    expect(screen.getByLabelText(t('parent.pin.slotEmpty', { n: 2 }))).toBeInTheDocument();
    expect(screen.getByLabelText(t('parent.pin.slot', { n: 1, name: 'ikan' }))).toBeInTheDocument();
  });
});

/** Data `/parent/overview` (D-038): ringkasan anak dari engine `childInsights`. */
const NOW = Date.parse('2026-10-08T05:00:00Z');
const kid = (id: string, nickname: string, momoColor: string, played = 0): OverviewChild => ({
  id,
  nickname,
  momoColor,
  lastActiveAt: played ? '2026-10-08T04:00:00Z' : null,
  className: null,
  insights: childInsights({
    rounds: played
      ? [
          { skillId: 'math.sd1.a1.x', score: 90, ts: NOW - 60_000, durationMs: 300_000 },
          { skillId: 'math.sd1.a2.x', score: 50, ts: NOW - 86_400_000, durationMs: 240_000 },
        ]
      : [],
    played,
    results: played
      ? {
          'math.sd1.a1.x': { best: 90, last: 90, passed: true, attempts: 1, ts: NOW },
          'math.sd1.a2.x': { best: 50, last: 50, passed: false, attempts: 3, ts: NOW },
        }
      : {},
    skills: [1, 2, 3].map((order) => ({
      id: `math.sd1.a${order}.x`,
      domain: 'math',
      grade: 'sd1',
      category: 'A',
      order,
      title: `Membilang — Level ${order} — Hitung ${order}`,
    })),
    books: [
      {
        domain: 'math',
        grade: 'sd1',
        title: 'Math Grade 1',
        categories: [{ code: 'A', title: 'Membilang' }],
      },
    ],
    now: NOW,
  }),
});
const overview = (children: OverviewChild[]) => ({
  children,
  access: { paywall: true, freeLevels: 2, all: false, books: [] },
});

describe('dashboard', () => {
  const login = () =>
    setSession('parent', {
      token,
      user: { id: 'p1', role: 'parent', name: 'Ibu Sari' },
      familyCode: 'XYZ789',
    });

  it('kode keluarga, pilihan anak, dan tautan laporan', async () => {
    login();
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith('/parent/news')
          ? json({ subscribed: true })
          : json(overview([kid('c1', 'Dodi', 'biru'), kid('c2', 'Ara', 'kuning', 4)])),
      ),
    );
    renderParent('/orang-tua');
    expect(screen.getByText('XYZ789')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Dodi' })).toBeInTheDocument();
    // Belum main → langkah mulai, bukan angka kosong.
    expect(screen.getByText(t('parent.ov.emptyTitle', { name: 'Dodi' }))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('parent.child.report') })).toHaveAttribute(
      'href',
      '/orang-tua/anak/c1',
    );
    fireEvent.click(screen.getByRole('tab', { name: /Ara/ }));
    expect(await screen.findByRole('heading', { name: 'Ara' })).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: new RegExp(t('parent.dash.play')) })[0],
    ).toHaveAttribute('href', '/play');
    const ov = fetchMock.mock.calls.find((c) => /\/parent\/overview$/.test(c[0] as string))!;
    expect((ov[1] as RequestInit).headers).toMatchObject({
      Authorization: `Bearer ${token}`,
    });
  });

  it('progres anak: angka, grafik 7 hari, insight, buku, ronde terakhir', async () => {
    login();
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith('/parent/news')
          ? json({ subscribed: true })
          : json(overview([kid('c2', 'Ara', 'kuning', 4)])),
      ),
    );
    const { container } = renderParent('/orang-tua');
    expect(await screen.findByRole('heading', { name: 'Ara' })).toBeInTheDocument();
    expect(container.querySelectorAll('.pd-bar')).toHaveLength(7);
    expect(
      screen.getByLabelText(/Rab.*1 ronde, 1 lulus, 5 menit|1 ronde, 1 lulus, 5 menit/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(t('parent.ov.weekSum', { rounds: 2, passed: 1, minutes: 9 })),
    ).toBeInTheDocument();
    expect(screen.getByText(t('parent.ov.nextTitle'))).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp('Membilang Level 2: skor terbaik 50 setelah 3 kali')),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: t('parent.ov.bookRing', { book: 'Math Grade 1', percent: 33 }),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(t('parent.ov.bookLevels', { passed: 1, levels: 3 })),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('.pd-recent li')).toHaveLength(2);
    // Tanpa harga di dasbor; paket ada di halaman sendiri.
    expect(container.querySelector('.pd-child')?.textContent).not.toMatch(/Rp/);
  });

  it('hapus anak meminta konfirmasi dulu', async () => {
    login();
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith('/parent/news')
          ? json({ subscribed: true })
          : json(overview([kid('c1', 'Dodi', 'biru')])),
      ),
    );
    renderParent('/orang-tua');
    const card = (await screen.findByRole('heading', { name: 'Dodi' })).closest('article')!;
    fireEvent.click(
      within(card as HTMLElement).getByRole('button', { name: t('parent.child.delete') }),
    );
    // Belum ada permintaan hapus sebelum dikonfirmasi.
    const deletes = () =>
      fetchMock.mock.calls.filter(
        ([, init]) => (init as RequestInit | undefined)?.method === 'DELETE',
      );
    expect(deletes()).toHaveLength(0);
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'DELETE' ? json({ ok: true }) : json(overview([])),
    );
    fireEvent.click(
      screen.getByRole('button', { name: t('parent.child.deleteYes', { name: 'Dodi' }) }),
    );
    await waitFor(() =>
      expect(screen.getByText(t('parent.dash.deleted', { name: 'Dodi' }))).toBeInTheDocument(),
    );
    expect(deletes()).toHaveLength(1);
    expect(String(deletes()[0]![0])).toMatch(/\/parent\/children\/c1$/);
  });
});

const fixture: Report = {
  child: {
    id: 'c1',
    nickname: 'Dodi',
    momoColor: 'hijau',
    lastActiveAt: null,
    createdAt: '2026-09-01T00:00:00Z',
  },
  totals: { answered: 40, correct: 30, jago: 1, skills: 4 },
  week: { answered: 20, correct: 15 },
  areas: [
    {
      domain: 'math',
      grade: 'pra-tk',
      title: 'Matematika Pra-TK',
      total: 4,
      jago: 1,
      bisa: 1,
      mastery: 42,
      categories: [
        {
          code: 'A',
          title: 'Membilang',
          total: 4,
          jago: 1,
          bisa: 1,
          skills: [
            {
              id: 's1',
              title: 'Hitung sampai 5',
              category: 'A',
              order: 1,
              score: 95,
              stage: 'Berbuah',
              status: 'Jago',
              needsReview: true,
              answered: 20,
              correct: 18,
            },
            {
              id: 's2',
              title: 'Hitung sampai 10',
              category: 'A',
              order: 2,
              score: 75,
              stage: 'Pohon',
              status: 'Bisa',
              needsReview: false,
              answered: 12,
              correct: 8,
            },
            {
              id: 's3',
              title: 'Lebih banyak',
              category: 'A',
              order: 3,
              score: 30,
              stage: 'Tunas',
              status: 'Belajar',
              needsReview: false,
              answered: 8,
              correct: 4,
            },
            {
              id: 's4',
              title: 'Angka nol',
              category: 'A',
              order: 4,
              score: 0,
              stage: 'Benih',
              status: 'Belum mulai',
              needsReview: false,
              answered: 0,
              correct: 0,
            },
          ],
        },
      ],
    },
  ],
  recommendations: [
    { id: 's3', title: 'Lebih banyak', category: 'A', status: 'Belajar' },
    { id: 's4', title: 'Angka nol', category: 'A', status: 'Belum mulai' },
    { id: 's2', title: 'Hitung sampai 10', category: 'A', status: 'Bisa' },
  ],
};

describe('ChildReport', () => {
  it('menampilkan total, status skill, perlu disiram, dan rekomendasi', () => {
    render(<ChildReport report={fixture} />);
    expect(
      screen.getByRole('heading', { name: t('parent.report.title', { name: 'Dodi' }) }),
    ).toBeInTheDocument();
    expect(screen.getByText(t('parent.report.jagoOf', { jago: 1, total: 4 }))).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', {
        name: t('parent.report.masteryLabel', { area: 'Matematika Pra-TK' }),
      }),
    ).toHaveAttribute('aria-valuenow', '42');
    expect(
      screen.getByText(t('parent.report.categoryJago', { jago: 1, total: 4 })),
    ).toBeInTheDocument();
    for (const s of ['Jago', 'Bisa', 'Belajar', 'Belum mulai'] as const) {
      expect(screen.getAllByText(t(`parent.status.${s}`)).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(t('parent.report.needsReview'))).toBeInTheDocument();

    const recs = screen
      .getByRole('heading', { name: t('parent.report.today') })
      .closest('section')!;
    const items = within(recs as HTMLElement).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Lebih banyak');
    expect(items[0]).toHaveTextContent('Membilang');
  });
});

describe('sidebar orang tua', () => {
  it('menu di sidebar; di layar kecil dibuka/ditutup lewat tombol menu & Esc; badge pesanan', async () => {
    setSession('parent', {
      token,
      user: { id: 'p1', role: 'parent', name: 'Ibu Sari' },
      familyCode: 'XYZ789',
    });
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith('/parent/orders')
        ? json([{ status: 'awaiting_payment' }, { status: 'paid' }, { status: 'rejected' }])
        : json({ children: [], access: null }),
    );
    renderParent('/orang-tua');
    const nav = screen.getByRole('complementary', { name: t('parent.nav.label') });
    for (const name of [t('parent.nav.home'), t('parent.nav.packages')])
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument();
    expect(
      await within(nav).findByRole('link', {
        name: `${t('parent.nav.orders')}, ${t('parent.nav.pending', { n: 2 })}`,
      }),
    ).toHaveAttribute('href', '/orang-tua/transaksi');
    const open = screen.getByRole('button', { name: t('parent.nav.open') });
    expect(open).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(open);
    expect(open).toHaveAttribute('aria-expanded', 'true');
    expect(document.body).toHaveClass('shell-no-scroll');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(open).toHaveAttribute('aria-expanded', 'false');
    expect(document.body).not.toHaveClass('shell-no-scroll');
    expect(within(nav).getByRole('button', { name: t('parent.logout') })).toBeInTheDocument();
  });
});
