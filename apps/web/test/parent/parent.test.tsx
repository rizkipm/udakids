import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PinPicture } from '@little-coder/engine';
import type { ChildProfile, ChildReport as Report } from '../../src/api/types';
import { rememberedFamilyCode, setSession } from '../../src/auth/session';
import { ChildReport } from '../../src/components/ChildReport';
import { t } from '../../src/i18n';
import { ParentApp } from '../../src/parent/ParentApp';
import { PinSetter, pictureName } from '../../src/parent/PinSetter';

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
    expect(fetchMock).not.toHaveBeenCalled();
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
      screen.getByRole('list', { name: t('site.steps.label', { n: 2, total: 3 }) }),
    ).toBeInTheDocument();
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string) as Record<
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

describe('dashboard', () => {
  it('menampilkan kode keluarga dan daftar anak', async () => {
    setSession('parent', {
      token,
      user: { id: 'p1', role: 'parent', name: 'Ibu Sari' },
      familyCode: 'XYZ789',
    });
    const kids: ChildProfile[] = [
      {
        id: 'c1',
        nickname: 'Dodi',
        momoColor: 'biru',
        lastActiveAt: null,
        createdAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'c2',
        nickname: 'Ara',
        momoColor: 'kuning',
        lastActiveAt: '2026-09-28T08:00:00Z',
        createdAt: '2026-09-02T00:00:00Z',
      },
    ];
    fetchMock.mockResolvedValue(json(kids));
    renderParent('/orang-tua');
    expect(screen.getByText('XYZ789')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Dodi' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ara' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: t('parent.child.report') })[0]).toHaveAttribute(
      'href',
      '/orang-tua/anak/c1',
    );
    expect(screen.getByRole('link', { name: new RegExp(t('parent.dash.play')) })).toHaveAttribute(
      'href',
      '/play',
    );
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/parent\/children$/);
    expect((fetchMock.mock.calls[0]![1] as RequestInit).headers).toMatchObject({
      Authorization: `Bearer ${token}`,
    });
  });

  it('hapus anak meminta konfirmasi dulu', async () => {
    setSession('parent', {
      token,
      user: { id: 'p1', role: 'parent', name: 'Ibu Sari' },
      familyCode: 'XYZ789',
    });
    fetchMock.mockResolvedValue(
      json([
        {
          id: 'c1',
          nickname: 'Dodi',
          momoColor: 'biru',
          lastActiveAt: null,
          createdAt: '2026-09-01T00:00:00Z',
        },
      ]),
    );
    renderParent('/orang-tua');
    const card = (await screen.findByRole('heading', { name: 'Dodi' })).closest('article')!;
    fireEvent.click(
      within(card as HTMLElement).getByRole('button', { name: t('parent.child.delete') }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockResolvedValueOnce(json({ ok: true })).mockResolvedValue(json([]));
    fireEvent.click(
      screen.getByRole('button', { name: t('parent.child.deleteYes', { name: 'Dodi' }) }),
    );
    await waitFor(() =>
      expect(screen.getByText(t('parent.dash.deleted', { name: 'Dodi' }))).toBeInTheDocument(),
    );
    expect((fetchMock.mock.calls[1]![1] as RequestInit).method).toBe('DELETE');
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
