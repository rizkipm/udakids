import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setSession } from '../../src/auth/session';
import { t } from '../../src/i18n';
import { useCatalog } from '../../src/play/catalog';
import { MomoLoader } from '../../src/play/MomoLoader';

const token = (sub: string) => `h.${btoa(JSON.stringify({ sub, role: 'child' }))}.s`;
const catalog = {
  catalogs: [],
  skills: [],
  access: { paywall: false, freeLevels: 3, all: true, books: [] },
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  setSession('child', null);
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('layar tunggu Momo', () => {
  it('memuat: kalimat bergantian, ketuk Momo menyapa, bintang bisa dikumpulkan', () => {
    vi.useFakeTimers();
    render(<MomoLoader color="ungu" />);
    expect(screen.getByText(t('play.loader.line1'))).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2700);
    });
    expect(screen.getByText(t('play.loader.line2'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('play.loader.tapMomo') }));
    expect(screen.getByRole('status')).toHaveTextContent(t('play.loader.tap1'));
    const stars = screen.getAllByRole('button', { name: t('play.loader.star') });
    fireEvent.click(stars[0]!);
    fireEvent.click(stars[0]!); // bintang yang sama tidak dihitung dua kali
    fireEvent.click(stars[1]!);
    expect(
      screen.getByText(t('play.loader.stars', { n: 2, of: stars.length })),
    ).toBeInTheDocument();
  });

  it('gagal: tombol Coba lagi, dan mencoba sendiri saat internet tersambung', () => {
    const retry = vi.fn();
    render(<MomoLoader color="ungu" failed onRetry={retry} />);
    expect(screen.getByText(t('play.loader.failTitle'))).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/salah|gagal/i);
    fireEvent.click(screen.getByRole('button', { name: t('play.loader.retry') }));
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(retry).toHaveBeenCalledTimes(2);
  });
});

describe('katalog: sekali unduh, coba ulang otomatis', () => {
  it('gangguan sesaat dicoba ulang sendiri, lalu halaman lain memakai katalog yang sama', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValue(json(catalog));
    vi.stubGlobal('fetch', fetch);
    setSession('child', {
      token: token('anak'),
      user: { id: 'anak', role: 'child', name: 'Anak' },
    });
    const a = renderHook(() => useCatalog());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    await waitFor(() => expect(a.result.current.data).toBeDefined());
    expect(a.result.current.failed).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
    // Halaman berikutnya: langsung ada, tanpa unduh ulang.
    const b = renderHook(() => useCatalog());
    expect(b.result.current.data).toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('server menolak (4xx) → tidak dicoba ulang; Coba lagi mengunduh lagi', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ message: 'x' }, 401))
      .mockResolvedValue(json(catalog));
    vi.stubGlobal('fetch', fetch);
    setSession('child', {
      token: token('anak2'),
      user: { id: 'anak2', role: 'child', name: 'Anak' },
    });
    const h = renderHook(() => useCatalog());
    await waitFor(() => expect(h.result.current.failed).toBe(true));
    expect(fetch).toHaveBeenCalledTimes(1);
    act(() => h.result.current.retry());
    await waitFor(() => expect(h.result.current.data).toBeDefined());
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
