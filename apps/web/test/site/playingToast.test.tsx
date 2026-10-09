import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/client', () => ({
  api: vi.fn(async () => [
    {
      nickname: 'Alya',
      momoColor: 'biru',
      momoLook: null,
      book: 'Matematika Kelas 2',
      topic: 'Pecahan',
    },
    { nickname: 'Budi', momoColor: 'hijau', momoLook: null, book: 'Sains Kelas 1', topic: 'Cuaca' },
  ]),
}));

const { PlayingToast } = await import('../../src/site/PlayingToast');

/** Toast "sedang bermain" di landing (D-103). */
describe('toast sedang bermain', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  const mount = async () => {
    render(
      <MemoryRouter>
        <PlayingToast />
      </MemoryRouter>,
    );
    await act(async () => {
      await Promise.resolve();
    });
  };

  it('muncul setelah 8 detik, bergantian, maks. 4 kali per kunjungan; ajakan ke /play', async () => {
    await mount();
    expect(screen.queryByText('Alya')).toBeNull();
    await act(async () => vi.advanceTimersByTime(8_000));
    expect(screen.getByText('Alya')).toBeTruthy();
    expect(screen.getByText('Pecahan')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ayo main juga' }).getAttribute('href')).toBe('/play');
    await act(async () => vi.advanceTimersByTime(7_000));
    expect(screen.queryByText('Alya')).toBeNull();
    await act(async () => vi.advanceTimersByTime(20_000));
    expect(screen.getByText('Budi')).toBeTruthy();
    // Sampai batas 4 kali, lalu berhenti.
    for (let k = 0; k < 6; k++) await act(async () => vi.advanceTimersByTime(27_000));
    expect(JSON.parse(sessionStorage.getItem('lc.playingToast')!).n).toBe(4);
    expect(screen.queryByText('Alya')).toBeNull();
    expect(screen.queryByText('Budi')).toBeNull();
  });

  it('ditutup → tidak muncul lagi di kunjungan ini', async () => {
    await mount();
    await act(async () => vi.advanceTimersByTime(8_000));
    fireEvent.click(screen.getByRole('button', { name: 'Tutup pemberitahuan' }));
    expect(screen.queryByText('Alya')).toBeNull();
    await act(async () => vi.advanceTimersByTime(120_000));
    expect(screen.queryByText('Budi')).toBeNull();
    expect(JSON.parse(sessionStorage.getItem('lc.playingToast')!).closed).toBe(true);
  });
});
