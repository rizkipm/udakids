import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '../../src/i18n';
import { PlayErrorBoundary } from '../../src/play/PlayErrorBoundary';

function Boom(): never {
  throw new Error('variabel tidak dikenal "pi"');
}

describe('pengaman halaman anak', () => {
  afterEach(() => vi.restoreAllMocks());

  it('halaman yang gagal → Momo + tombol kembali, bukan layar putih; pindah halaman → normal lagi', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(
      <MemoryRouter>
        <PlayErrorBoundary resetKey="/play/topik/a">
          <Boom />
        </PlayErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(t('play.crash.title'));
    expect(screen.getByRole('link', { name: t('play.crash.back') })).toHaveAttribute(
      'href',
      '/play',
    );
    expect(screen.getByRole('alert').textContent).not.toMatch(/salah|gagal|error/i);

    rerender(
      <MemoryRouter>
        <PlayErrorBoundary resetKey="/play">
          <p>Pustaka</p>
        </PlayErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByText('Pustaka')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
