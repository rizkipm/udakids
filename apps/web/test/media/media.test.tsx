import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bannerProblems, bannerStatus, BannersPage } from '../../src/admin/media/BannersPage';
import { isSafeCtaUrl, titleFromFile } from '../../src/admin/media/upload';
import { setSession } from '../../src/auth/session';
import { BannerSlider, BannerSlides, type Banner } from '../../src/components/BannerSlider';
import { t } from '../../src/i18n';
import { GallerySection, resetGalleryCache } from '../../src/site/GallerySection';
import { mockApi } from '../admin/helpers';

const banner = (n: number, extra: Partial<Banner> = {}): Banner => ({
  id: `b${n}`,
  title: `Banner ${n}`,
  subtitle: `Keterangan ${n}`,
  ctaLabel: '',
  ctaUrl: '',
  imageId: null,
  tone: 'grape',
  ...extra,
});

const inRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);
const slides = () =>
  screen
    .getAllByRole('group', { hidden: true })
    .filter((g) => g.getAttribute('aria-roledescription') === 'slide');
const shown = () => slides().find((s) => s.getAttribute('aria-hidden') === 'false');

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((q: string) => ({
      matches: reduce && q.includes('reduce'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BannerSlider', () => {
  beforeEach(() => stubReducedMotion(false));

  it('carousel aksesibel: slide berlabel, sebelumnya/berikutnya, titik', () => {
    inRouter(<BannerSlides placement="landing" items={[banner(1), banner(2), banner(3)]} />);
    const region = screen.getByRole('region', { name: t('media.banner.region') });
    expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    expect(slides()).toHaveLength(3);
    expect(shown()).toHaveAccessibleName(/1 dari 3: Banner 1/);
    fireEvent.click(screen.getByRole('button', { name: t('media.banner.next') }));
    expect(shown()).toHaveAccessibleName(/2 dari 3/);
    fireEvent.click(screen.getByRole('button', { name: t('media.banner.prev') }));
    fireEvent.click(screen.getByRole('button', { name: t('media.banner.prev') }));
    // Berputar ke slide terakhir.
    expect(shown()).toHaveAccessibleName(/3 dari 3/);
    fireEvent.click(
      screen.getByRole('button', { name: t('media.banner.goto', { n: 1, title: 'Banner 1' }) }),
    );
    expect(shown()).toHaveAccessibleName(/1 dari 3/);
    // Slide tersembunyi tidak bisa difokus.
    expect(slides()[1]).toHaveAttribute('inert');
  });

  it('CTA internal lewat router, eksternal https di tab baru', () => {
    inRouter(
      <BannerSlides
        placement="landing"
        items={[
          banner(1, { ctaLabel: 'Daftar', ctaUrl: '/orang-tua/daftar' }),
          banner(2, { ctaLabel: 'Info acara', ctaUrl: 'https://contoh.id/acara' }),
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: /Daftar/ })).toHaveAttribute(
      'href',
      '/orang-tua/daftar',
    );
    const ext = screen.getByRole('link', { name: /Info acara/, hidden: true });
    expect(ext).toHaveAttribute('target', '_blank');
    expect(ext).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('ganti otomatis ~6 detik; tombol jeda menghentikannya', () => {
    vi.useFakeTimers();
    inRouter(<BannerSlides placement="landing" items={[banner(1), banner(2)]} />);
    act(() => void vi.advanceTimersByTime(6100));
    expect(shown()).toHaveAccessibleName(/2 dari 2/);
    fireEvent.click(screen.getByRole('button', { name: t('media.banner.pause') }));
    act(() => void vi.advanceTimersByTime(13000));
    expect(shown()).toHaveAccessibleName(/2 dari 2/);
    expect(screen.getByRole('button', { name: t('media.banner.play') })).toBeInTheDocument();
  });

  it('prefers-reduced-motion: tanpa autoplay dan tanpa tombol jeda', () => {
    stubReducedMotion(true);
    vi.useFakeTimers();
    inRouter(<BannerSlides placement="landing" items={[banner(1), banner(2)]} />);
    act(() => void vi.advanceTimersByTime(20000));
    expect(shown()).toHaveAccessibleName(/1 dari 2/);
    expect(screen.queryByRole('button', { name: t('media.banner.pause') })).toBeNull();
  });

  it('satu banner: tanpa tombol geser', () => {
    inRouter(<BannerSlides placement="landing" items={[banner(1)]} />);
    expect(screen.getByRole('heading', { name: 'Banner 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('media.banner.next') })).toBeNull();
  });

  it('mengambil banner landing dari API publik; kosong → tidak tampil', async () => {
    const fetchMock = mockApi({ '/public/banners': { items: [] } });
    const { container } = inRouter(<BannerSlider placement="landing" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/public/banners?placement=landing');
    expect(container).toBeEmptyDOMElement();
  });

  it('dasbor orang tua memakai token orang tua; tanpa sesi tidak memanggil API', async () => {
    const fetchMock = mockApi({ '/parent/banners': { items: [banner(7)] } });
    inRouter(<BannerSlider placement="parent" />);
    expect(fetchMock).not.toHaveBeenCalled();
    setSession('parent', { token: 'tok', user: { id: 'p', role: 'parent', name: 'Ibu' } });
    inRouter(<BannerSlider placement="parent" />);
    expect(await screen.findByRole('heading', { name: 'Banner 7' })).toBeInTheDocument();
    expect((fetchMock.mock.calls[0]![1] as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer tok',
    });
    setSession('parent', null);
  });

  it('respons rusak / gagal → tidak tampil, tanpa pesan galat', async () => {
    const fetchMock = mockApi({ '/public/banners': { books: [] } });
    const { container } = inRouter(<BannerSlider placement="landing" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe('GallerySection', () => {
  const photo = (n: number, eventDate: string | null = '2026-03-10') => ({
    id: `g${n}`,
    title: `Foto ${n}`,
    caption: `Cerita ${n}`,
    eventDate,
    imageId: `00000000-0000-4000-8000-00000000000${n}`,
  });
  beforeEach(() => resetGalleryCache());

  it('kosong → tidak tampil', async () => {
    const fetchMock = mockApi({
      '/public/gallery': { items: [], total: 0, page: 1, pageSize: 12 },
    });
    const { container } = inRouter(<GallerySection />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('grid foto, lightbox (Esc, berikutnya), dan "Lihat lebih banyak"', async () => {
    mockApi({
      '/public/gallery': (_path: string, _init?: RequestInit) => ({
        items: [photo(1), photo(2, null)],
        total: 3,
        page: 1,
        pageSize: 12,
      }),
    });
    inRouter(<GallerySection />);
    expect(
      await screen.findByRole('heading', { name: t('media.gallery.title') }),
    ).toBeInTheDocument();
    expect(screen.getByText('10 Maret 2026')).toBeInTheDocument();

    const thumb = screen.getByRole('button', {
      name: t('media.gallery.open', { title: 'Foto 1' }),
    });
    fireEvent.click(thumb);
    const dialog = screen.getByRole('dialog', { name: t('media.gallery.dialog') });
    expect(within(dialog).getByRole('img', { name: 'Foto 1' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: t('media.gallery.close') })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole('button', { name: t('media.gallery.next') }));
    expect(within(dialog).getByRole('img', { name: 'Foto 2' })).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(within(dialog).getByRole('img', { name: 'Foto 1' })).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    // Fokus kembali ke foto yang terakhir dilihat.
    expect(
      screen.getByRole('button', { name: t('media.gallery.open', { title: 'Foto 2' }) }),
    ).toHaveFocus();
    expect(thumb).not.toHaveFocus();

    // Halaman 2.
    vi.unstubAllGlobals();
    const more = mockApi({
      '/public/gallery': { items: [photo(3)], total: 3, page: 2, pageSize: 12 },
    });
    fireEvent.click(screen.getByRole('button', { name: t('media.gallery.more') }));
    expect(
      await screen.findByRole('button', { name: t('media.gallery.open', { title: 'Foto 3' }) }),
    ).toBeInTheDocument();
    expect(String(more.mock.calls[0]![0])).toContain('page=2');
    expect(screen.queryByRole('button', { name: t('media.gallery.more') })).toBeNull();
  });
});

describe('admin banner', () => {
  it('validasi tautan & jadwal di perangkat', () => {
    expect(isSafeCtaUrl('/play')).toBe(true);
    expect(isSafeCtaUrl('https://contoh.id/a')).toBe(true);
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'http://x.id', '//evil', '/a b'])
      expect(isSafeCtaUrl(bad)).toBe(false);
    const base = {
      title: 'A',
      subtitle: '',
      ctaLabel: 'Daftar',
      ctaUrl: 'javascript:alert(1)',
      imageId: null,
      tone: 'grape' as const,
      placements: [],
      startsAt: '2026-05-02T00:00:00.000Z',
      endsAt: '2026-05-01T00:00:00.000Z',
      active: true,
      sort: 0,
    };
    expect(Object.keys(bannerProblems(base)).sort()).toEqual(['ctaUrl', 'endsAt', 'placements']);
    expect(bannerStatus({ active: false, startsAt: null, endsAt: null })).toBe('off');
    expect(bannerStatus({ active: true, startsAt: '2999-01-01T00:00:00Z', endsAt: null })).toBe(
      'scheduled',
    );
    expect(bannerStatus({ active: true, startsAt: null, endsAt: '2000-01-01T00:00:00Z' })).toBe(
      'ended',
    );
    expect(titleFromFile('workshop_bandung-2026.JPG')).toBe('workshop bandung 2026');
  });

  it('daftar banner + formulir menolak javascript: tanpa memanggil API', async () => {
    setSession('staff', { token: 'adm', user: { id: 'a', role: 'admin', name: 'Admin' } });
    const fetchMock = mockApi({
      'GET /admin/banners': [
        {
          ...banner(1),
          tone: 'sky',
          placements: ['landing', 'parent'],
          startsAt: null,
          endsAt: null,
          active: true,
          sort: 0,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    });
    inRouter(<BannersPage />);
    expect(await screen.findByText('Banner 1')).toBeInTheDocument();
    expect(screen.getAllByText(t('media.placement.parent')).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText(new RegExp(t('media.admin.banner.fTitle'))), {
      target: { value: 'Promo' },
    });
    fireEvent.change(screen.getByLabelText(t('media.admin.banner.fCtaLabel')), {
      target: { value: 'Klik' },
    });
    fireEvent.change(screen.getByLabelText(t('media.admin.banner.fCtaUrl')), {
      target: { value: 'javascript:alert(1)' },
    });
    // Pratinjau langsung ikut berubah.
    expect(screen.getAllByText('Promo').length).toBeGreaterThan(0);
    const calls = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: t('media.admin.banner.create') }));
    expect(await screen.findByText(t('media.admin.banner.ctaUrlBad'))).toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBe(calls);
    setSession('staff', null);
  });
});
