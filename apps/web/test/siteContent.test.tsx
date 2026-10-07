import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { t } from '../src/i18n';

/** Video panduan & artikel (D-073): data dari API publik, tanpa HTML dari admin. */
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

const article = (n: number) => ({
  id: `a${n}`,
  slug: `artikel-${n}`,
  title: `Artikel nomor ${n}`,
  summary: `Ringkasan artikel ${n}.`,
  coverImageId: null,
  publishedAt: '2026-10-07T03:00:00Z',
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function mockApi(routes: Record<string, unknown>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    const hit = Object.keys(routes).find((k) => url.includes(k));
    return hit ? json(routes[hit]) : json({ message: 'Tidak ditemukan' }, 404);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('landing: video panduan & artikel', () => {
  it('video tampil sebagai gambar; diketuk → pemutar youtube-nocookie; Esc menutup', async () => {
    mockApi({
      '/public/videos': [
        { id: 'v1', youtubeId: 'dQw4w9WgXcQ', title: 'Cara daftar', description: 'Langkah awal' },
      ],
      '/public/articles': { items: [], total: 0, page: 1, pageSize: 3 },
    });
    renderAt('/');
    const play = await screen.findByRole('button', {
      name: t('site.videos.play', { title: 'Cara daftar' }),
    });
    expect(play.querySelector('img')).toHaveAttribute(
      'src',
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
    // Tanpa artikel terbit → bagian artikel disembunyikan.
    expect(screen.queryByRole('heading', { name: t('site.articles.title') })).toBeNull();
    fireEvent.click(play);
    const dialog = screen.getByRole('dialog', { name: 'Cara daftar' });
    expect(dialog.querySelector('iframe')?.getAttribute('src')).toMatch(
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/,
    );
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('3 artikel terbaru + "Lihat semua"; data tak terduga tidak merusak landing', async () => {
    mockApi({
      '/public/videos': { rusak: true },
      '/public/articles': {
        items: [article(1), article(2), article(3)],
        total: 5,
        page: 1,
        pageSize: 3,
      },
    });
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Artikel nomor 1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('site.articles.all', { n: 5 }) })).toHaveAttribute(
      'href',
      '/artikel',
    );
    expect(screen.queryByRole('heading', { name: t('site.videos.title') })).toBeNull();
  });
});

describe('halaman artikel', () => {
  it('/artikel/:slug merender subjudul, paragraf, dan daftar sebagai teks (HTML tidak dijalankan)', async () => {
    mockApi({
      '/public/articles/artikel-1': {
        ...article(1),
        body: 'Pembuka <b>tebal</b>.\n\n## Langkah\n- Satu\n- Dua',
      },
    });
    renderAt('/artikel/artikel-1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Artikel nomor 1' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Langkah' })).toBeVisible();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Satu', 'Dua']);
    expect(screen.getByText('Pembuka <b>tebal</b>.')).toBeVisible();
    expect(document.querySelector('.art-body b')).toBeNull();
  });

  it('slug tidak ada → "Artikel tidak ditemukan" + kembali ke daftar', async () => {
    mockApi({});
    renderAt('/artikel/tidak-ada');
    expect(
      await screen.findByRole('heading', { level: 1, name: t('site.articles.notFound') }),
    ).toBeVisible();
    expect(screen.getAllByRole('link', { name: t('site.articles.back') })[0]).toHaveAttribute(
      'href',
      '/artikel',
    );
  });
});
