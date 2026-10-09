import { describe, expect, it, vi } from 'vitest';
import { findStockPhoto, MAX_SCREENED } from '../src/cli/lesson-photos.js';
import {
  PexelsClient,
  pexelsCredit,
  pexelsQueries,
  type PexelsPhoto,
} from '../src/photos/pexels.js';
import type { PhotoScreener } from '../src/photos/photo-screen.js';

/** Foto stok Pexels + saringan Claude untuk simulasi pelajaran (D-095). */
const photo = (id: number): PexelsPhoto => ({
  id,
  width: 1200,
  height: 800,
  url: `https://www.pexels.com/photo/${id}/`,
  alt: '',
  photographer: `Fotografer ${id}`,
  photographerUrl: `https://www.pexels.com/@f${id}`,
  small: `https://images.pexels.com/${id}-m.jpg`,
  large: `https://images.pexels.com/${id}-l.jpg`,
});
const usage = { input: 500, cachedRead: 0, cacheWrite: 0, output: 30 };
const foto = { id: 'foto-akar-tanaman', label: 'akar tanaman di tanah', en: 'plant roots in soil' };

describe('pencarian foto Pexels (D-095)', () => {
  it('kata kunci English dulu, lalu dipersempit 3 dan 2 kata', () => {
    expect(pexelsQueries(foto.label, foto.en)).toEqual([
      'plant roots in soil',
      'plant roots in',
      'plant roots',
    ]);
    expect(pexelsQueries('apel')).toEqual(['apel']);
    expect(pexelsCredit(photo(7), 'apple')).toContain('Foto: Fotografer 7');
  });

  it('kandidat pertama yang lolos Claude dipakai; yang ditolak dilewati', async () => {
    const search = vi.fn(async (q: string) =>
      q === 'plant roots in soil' ? [photo(1), photo(2)] : [photo(3)],
    );
    const screener: PhotoScreener = {
      check: vi.fn(async (url: string) => ({
        ok: url.includes('/3-'),
        reason: url.includes('/3-') ? 'Cocok' : 'Bukan akar',
        usage,
      })),
    };
    const verdicts: number[] = [];
    const hit = await findStockPhoto(foto, { search }, screener, async (_v, p) => {
      verdicts.push(p.id);
    });
    expect(hit).toEqual({ photo: photo(3), query: 'plant roots in' });
    expect(verdicts).toEqual([1, 2, 3]);
  });

  it(`paling banyak ${MAX_SCREENED} kandidat dilihat Claude; tidak ada yang lolos → null (gambar cadangan)`, async () => {
    let n = 0;
    const search = vi.fn(async () => [photo(++n * 10), photo(++n * 10), photo(++n * 10)]);
    const check = vi.fn(async () => ({ ok: false, reason: 'tidak pantas', usage }));
    const hit = await findStockPhoto(foto, { search }, { check }, async () => {});
    expect(hit).toBeNull();
    expect(check).toHaveBeenCalledTimes(MAX_SCREENED);
  });

  it('klien: 429 → tunggu sampai jatah dibuka; 401 → pesan kunci ditolak', async () => {
    const body = {
      photos: [{ id: 5, width: 10, height: 10, url: 'u', src: { medium: 'm', large: 'l' } }],
    };
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('', { status: 429, headers: { 'x-ratelimit-reset': '0' } }),
      )
      .mockResolvedValueOnce(Response.json(body))
      .mockResolvedValueOnce(new Response('', { status: 401 }));
    const wait = vi.fn(async () => {});
    const client = new PexelsClient('k', fetchFn as unknown as typeof fetch, wait);
    const [p] = await client.search('apple');
    expect(p).toMatchObject({ id: 5, small: 'm', large: 'l', photographer: '' });
    expect(wait).toHaveBeenCalledWith(60_000);
    expect(fetchFn.mock.calls[0]![1]).toEqual({ headers: { Authorization: 'k' } });
    await expect(client.search('apple')).rejects.toThrow(/Kunci Pexels ditolak/);
  });

  it('unduhan hanya menerima berkas gambar', async () => {
    const ok = new Response(new Uint8Array([1, 2, 3]), {
      headers: { 'content-type': 'image/jpeg' },
    });
    const html = new Response('<html>', { headers: { 'content-type': 'text/html' } });
    const fetchFn = vi.fn().mockResolvedValueOnce(ok).mockResolvedValueOnce(html);
    const client = new PexelsClient('k', fetchFn as unknown as typeof fetch);
    expect((await client.download('x')).data.length).toBe(3);
    await expect(client.download('y')).rejects.toThrow(/Bukan foto/);
  });
});
