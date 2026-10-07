import { describe, expect, it } from 'vitest';
import {
  articleBlocks,
  articleInputSchema,
  parseYoutubeId,
  slugify,
  videoInputSchema,
  youtubeEmbed,
} from '../src/index.js';

describe('video YouTube (D-073)', () => {
  it('mengenali berbagai bentuk tautan', () => {
    const id = 'dQw4w9WgXcQ';
    for (const url of [
      id,
      `https://www.youtube.com/watch?v=${id}`,
      `https://youtube.com/watch?v=${id}&t=30s`,
      `https://m.youtube.com/watch?v=${id}`,
      `https://youtu.be/${id}?si=abc`,
      `youtu.be/${id}`,
      `https://www.youtube.com/shorts/${id}`,
      `https://www.youtube.com/embed/${id}`,
      `https://www.youtube.com/live/${id}`,
    ])
      expect(parseYoutubeId(url), url).toBe(id);
  });
  it('menolak yang bukan YouTube atau id tidak sah', () => {
    for (const bad of [
      'https://vimeo.com/123',
      'https://evil.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com/watch?v=pendek',
      'javascript:alert(1)',
      '',
    ])
      expect(parseYoutubeId(bad), bad).toBeNull();
    expect(youtubeEmbed('dQw4w9WgXcQ')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
  it('skema input video', () => {
    expect(
      videoInputSchema.safeParse({ url: 'https://youtu.be/dQw4w9WgXcQ', title: 'Cara daftar' })
        .success,
    ).toBe(true);
    expect(
      videoInputSchema.safeParse({ url: 'https://vimeo.com/1', title: 'Cara daftar' }).success,
    ).toBe(false);
  });
});

describe('artikel', () => {
  it('slug dari judul', () => {
    expect(slugify('Cara Daftar Anak di Udakids!')).toBe('cara-daftar-anak-di-udakids');
    expect(slugify('Tips Belajar Calistung: 5 Langkah')).toBe('tips-belajar-calistung-5-langkah');
    expect(slugify('!!!')).toBe('artikel');
  });
  it('isi menjadi blok teks (tanpa HTML)', () => {
    const blocks = articleBlocks(
      'Halo orang tua.\nIni paragraf satu.\n\n## Langkah\n- Daftar akun\n- Tautkan anak\n\nSelesai <b>tebal</b>.',
    );
    expect(blocks).toEqual([
      { type: 'p', text: 'Halo orang tua. Ini paragraf satu.' },
      { type: 'h', text: 'Langkah' },
      { type: 'ul', items: ['Daftar akun', 'Tautkan anak'] },
      { type: 'p', text: 'Selesai <b>tebal</b>.' },
    ]);
  });
  it('skema input artikel', () => {
    const ok = articleInputSchema.safeParse({
      title: 'Cara mendaftar',
      summary: 'Panduan singkat mendaftar.',
      body: 'Isi artikel yang cukup panjang di sini.',
    });
    expect(ok.success && ok.data).toMatchObject({ status: 'draft', slug: '', coverImageId: null });
    expect(articleInputSchema.safeParse({ title: 'x', summary: 'y', body: 'z' }).success).toBe(
      false,
    );
  });
});
