import { render, screen } from '@testing-library/react';
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

  it('rak buku landing diambil dari database (GET /public/books), tidak ditulis di kode', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          totalLevels: 110,
          books: [
            {
              domain: 'sains',
              grade: 'sd34',
              title: 'Sains Grade 3-4',
              topics: 11,
              levels: 110,
              sampleTopics: ['Organ tubuh manusia', 'Daur hidup hewan'],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Sains Grade 3-4' })).toBeInTheDocument();
    expect(screen.getByText('Organ tubuh manusia, Daur hidup hewan')).toBeInTheDocument();
    expect(screen.getByText('11 topik · 110 level')).toBeInTheDocument();
    expect(String(fetchSpy.mock.calls[0]![0])).toContain('/public/books');
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
