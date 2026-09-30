import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ENGINE_VERSION } from '@little-coder/engine';
import { App } from '../src/App';
import { t } from '../src/i18n';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe('App routes', () => {
  it('beranda (landing): judul, pintu anak/keluarga/kelas, dan rak buku', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ajari Momo');
    for (const link of screen.getAllByRole('link', { name: t('site.cta.play') }))
      expect(link).toHaveAttribute('href', '/play');
    expect(screen.getAllByRole('link', { name: t('site.cta.join') })[0]).toHaveAttribute(
      'href',
      '/play/gabung',
    );
    expect(screen.getAllByRole('link', { name: t('site.cta.family') })[0]).toHaveAttribute(
      'href',
      '/orang-tua/daftar',
    );
    expect(screen.getByRole('link', { name: t('site.doors.class.login') })).toHaveAttribute(
      'href',
      '/masuk/staf',
    );
  });

  const book = (n: number) => ({
    domain: n % 2 ? 'sains' : 'math',
    grade: 'sd1',
    title: `Buku ${n}`,
    topics: 10,
    levels: 100,
    sampleTopics: [`Topik ${n}`],
  });
  const stats = {
    books: 12,
    totalLevels: 2730,
    users: 1234,
    learners: 900,
    activeNow: 7,
    rounds: 5678,
    updatedAt: '2026-09-30T10:00:00Z',
  };
  const mockPublic = (books: ReturnType<typeof book>[]) =>
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      const body = url.includes('/public/stats')
        ? stats
        : { totalLevels: books.reduce((a, b) => a + b.levels, 0), books };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

  it('rak buku landing diambil dari database (GET /public/books), tidak ditulis di kode', async () => {
    const fetchSpy = mockPublic([
      {
        domain: 'sains',
        grade: 'sd34',
        title: 'Sains Grade 3-4',
        topics: 11,
        levels: 110,
        sampleTopics: ['Organ tubuh manusia', 'Daur hidup hewan'],
      },
    ]);
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Sains Grade 3-4' })).toBeInTheDocument();
    expect(screen.getByText('Organ tubuh manusia, Daur hidup hewan')).toBeInTheDocument();
    expect(screen.getByText('11 topik · 110 level')).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([u]) => String(u).includes('/public/books'))).toBe(true);
    // Satu halaman saja (≤9 buku) → tanpa tombol geser.
    expect(screen.queryByRole('button', { name: t('site.books.next') })).toBeNull();
    fetchSpy.mockRestore();
  });

  it('rak buku: maksimal 9 per halaman, lebih dari 9 → halaman berikutnya', async () => {
    const fetchSpy = mockPublic(Array.from({ length: 12 }, (_, i) => book(i + 1)));
    const { container } = renderAt('/');
    expect(
      await screen.findByText(t('site.books.page', { from: 1, to: 9, total: 12 })),
    ).toBeInTheDocument();
    const pages = container.querySelectorAll('.book-page');
    expect(pages).toHaveLength(2);
    expect(pages[0]!.querySelectorAll('.book-card')).toHaveLength(9);
    expect(pages[1]!.querySelectorAll('.book-card')).toHaveLength(3);
    const prev = screen.getByRole('button', { name: t('site.books.prev') });
    const next = screen.getByRole('button', { name: t('site.books.next') });
    expect(prev).toBeDisabled();
    fireEvent.click(next);
    expect(
      screen.getByText(t('site.books.page', { from: 10, to: 12, total: 12 })),
    ).toBeInTheDocument();
    expect(next).toBeDisabled();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
    fetchSpy.mockRestore();
  });

  it('statistik realtime: total pengguna & yang sedang belajar dari /public/stats (SSE)', async () => {
    const fetchSpy = mockPublic([book(1)]);
    const sources: {
      onmessage?: (e: { data: string }) => void;
      onopen?: () => void;
      url: string;
    }[] = [];
    class FakeES {
      onmessage?: (e: { data: string }) => void;
      onopen?: () => void;
      onerror?: () => void;
      constructor(public url: string) {
        sources.push(this);
      }
      close() {}
    }
    vi.stubGlobal('EventSource', FakeES);
    renderAt('/');
    expect(await screen.findByText('1.234')).toBeInTheDocument();
    expect(screen.getByText(t('site.fact.users'))).toBeInTheDocument();
    expect(sources[0]!.url).toContain('/public/stats/stream');
    act(() => {
      sources[0]!.onopen?.();
      sources[0]!.onmessage?.({ data: JSON.stringify({ ...stats, users: 1300, activeNow: 9 }) });
    });
    expect(screen.getByText('1.300')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(t('site.live.on')))).toBeInTheDocument();
    vi.unstubAllGlobals();
    fetchSpy.mockRestore();
  });

  it('area admin tanpa login diarahkan ke halaman masuk staf', () => {
    renderAt('/admin');
    expect(screen.getByRole('heading', { name: t('staff.login.title') })).toBeInTheDocument();
  });

  it('laporan dan halaman tak dikenal', () => {
    renderAt('/laporan/abc123');
    expect(screen.getByText(t('common.placeholder.report'))).toBeInTheDocument();
  });

  it('bisa memakai engine dari workspace', () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('i18n', () => {
  it('mengisi placeholder karakter; kunci tak dikenal dikembalikan apa adanya', () => {
    expect(t('common.placeholder.report')).toBe('Laporan perjalanan Momo.');
    expect(t('common.nope' as never)).toBe('common.nope');
  });
});
