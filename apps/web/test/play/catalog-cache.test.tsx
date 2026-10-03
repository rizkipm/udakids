import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setSession } from '../../src/auth/session';
import { useCatalog } from '../../src/play/catalog';

const token = (sub: string) => `h.${btoa(JSON.stringify({ sub, role: 'child' }))}.s`;
const premium = {
  catalogs: [],
  skills: [],
  access: { paywall: true, freeLevels: 3, all: true, books: [] },
};

afterEach(() => {
  setSession('child', null);
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('salinan katalog per anak (D-047)', () => {
  it('adik (Free) di perangkat yang sama TIDAK memakai katalog kakak (Premium)', () => {
    // Server sedang lambat/offline: hanya salinan di perangkat yang tersedia.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    localStorage.setItem('lc.catalog.kakak', JSON.stringify(premium));
    localStorage.setItem('lc.catalog', JSON.stringify(premium)); // salinan lama yang dipakai bersama
    setSession('child', {
      token: token('adik'),
      user: { id: 'adik', role: 'child', name: 'Adik' },
    });
    const adik = renderHook(() => useCatalog());
    expect(adik.result.current.data).toBeUndefined();
    expect(localStorage.getItem('lc.catalog')).toBeNull();

    setSession('child', {
      token: token('kakak'),
      user: { id: 'kakak', role: 'child', name: 'Kakak' },
    });
    const kakak = renderHook(() => useCatalog());
    expect(kakak.result.current.data?.access?.all).toBe(true);
  });
});
