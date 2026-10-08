import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dbAvailable, startApp } from './e2e-setup.js';

/** Video panduan & artikel landing (D-073). Database test sendiri agar bisa paralel. */
const URL =
  process.env.DATABASE_URL_TEST_SITE ??
  'postgres://littlecoder:littlecoder@localhost:5432/littlecoder_test_site';
const up = await dbAvailable(URL);

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('fake-png-body'),
]);
const BODY = 'Paragraf pertama artikel.\n\n## Langkah\n- Daftar\n- Pilih buku';

describe.skipIf(!up)('video panduan & artikel (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof startApp>>;
  let childToken = '';
  const http = () => ctx.http();
  const admin = () => ctx.auth(ctx.adminToken);

  beforeAll(async () => {
    ctx = await startApp(URL);
    childToken = (await ctx.newChild('Uji Situs')).token;
  }, 120_000);
  afterAll(async () => {
    await ctx?.close();
  });

  describe('video', () => {
    it('admin menempel tautan YouTube → disimpan sebagai id; publik hanya melihat yang aktif', async () => {
      const a = await http()
        .post('/admin/videos')
        .set(admin())
        .send({
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10',
          title: 'Cara daftar',
          sort: 2,
        })
        .expect(201);
      expect(a.body).toMatchObject({ youtubeId: 'dQw4w9WgXcQ', active: true, sort: 2 });
      await http()
        .post('/admin/videos')
        .set(admin())
        .send({ url: 'https://youtu.be/abcdefghijk', title: 'Video pertama', sort: 1 })
        .expect(201);
      await http()
        .post('/admin/videos')
        .set(admin())
        .send({ url: 'https://youtu.be/zzzzzzzzzzz', title: 'Disembunyikan', active: false })
        .expect(201);

      const pub = await http().get('/public/videos').expect(200);
      expect(pub.body.map((v: { title: string }) => v.title)).toEqual([
        'Video pertama',
        'Cara daftar',
      ]);
      expect(Object.keys(pub.body[0]).sort()).toEqual(['description', 'id', 'title', 'youtubeId']);

      await http()
        .put(`/admin/videos/${a.body.id}`)
        .set(admin())
        .send({
          url: 'https://www.youtube.com/shorts/AAAAAAAAAAA',
          title: 'Cara daftar',
          active: false,
        })
        .expect(200);
      expect((await http().get('/public/videos').expect(200)).body).toHaveLength(1);
      await http().delete(`/admin/videos/${a.body.id}`).set(admin()).expect(200);
      expect((await http().get('/admin/videos').set(admin()).expect(200)).body).toHaveLength(2);
    });

    it('tautan bukan YouTube ditolak; selain admin tidak boleh mengubah', async () => {
      await http()
        .post('/admin/videos')
        .set(admin())
        .send({ url: 'https://evil.example/watch?v=dQw4w9WgXcQ', title: 'Palsu' })
        .expect(400);
      await http()
        .post('/admin/videos')
        .set(admin())
        .send({ url: 'javascript:alert(1)', title: 'Palsu' })
        .expect(400);
      await http()
        .post('/admin/videos')
        .set(ctx.auth(childToken))
        .send({ url: 'https://youtu.be/abcdefghijk', title: 'Anak' })
        .expect(403);
      await http().get('/admin/videos').expect(401);
    });
  });

  describe('katalog besar (dikompres + ETag)', () => {
    it('gzip bila diminta, ETag sama → 304 tanpa isi, isi tetap JSON yang sama', async () => {
      const auth = ctx.auth(childToken);
      const plain = await http()
        .get('/catalog')
        .set(auth)
        .set('Accept-Encoding', 'identity')
        .expect(200);
      expect(plain.headers['content-encoding']).toBeUndefined();
      expect(plain.headers['cache-control']).toBe('private, no-cache');
      const etag = plain.headers.etag as string;
      expect(etag).toMatch(/^"[\w-]+"$/);
      const gz = await http().get('/catalog').set(auth).set('Accept-Encoding', 'gzip').expect(200);
      expect(gz.headers['content-encoding']).toBe('gzip');
      expect(gz.headers.etag).toBe(etag);
      expect(gz.body.skills.length).toBe(plain.body.skills.length);
      await http().get('/catalog').set(auth).set('If-None-Match', etag).expect(304);
      // Akses berbeda (staf melihat semua) → ETag berbeda.
      const staff = await http().get('/catalog').set(admin()).expect(200);
      expect(staff.headers.etag).not.toBe(etag);
      // Empat kali memuat katalog lengkap (±5.800 skill, D-078) saat semua suite jalan paralel: > 5 detik bawaan.
    }, 20_000);
  });

  describe('artikel', () => {
    let coverId = '';
    let articleId = '';

    it('draf tidak tampil; terbit tampil dengan slug dari judul dan isi teks', async () => {
      coverId = (
        await http()
          .post('/admin/media')
          .set(admin())
          .set('Content-Type', 'image/png')
          .send(PNG)
          .expect(201)
      ).body.id;
      const draft = await http()
        .post('/admin/articles')
        .set(admin())
        .send({
          title: 'Cara Daftar Anak di Rumah!',
          summary: 'Langkah singkat mendaftarkan anak.',
          body: BODY,
          coverImageId: coverId,
        })
        .expect(201);
      articleId = draft.body.id;
      expect(draft.body).toMatchObject({
        slug: 'cara-daftar-anak-di-rumah',
        status: 'draft',
        publishedAt: null,
      });
      expect((await http().get('/public/articles').expect(200)).body.total).toBe(0);
      await http().get('/public/articles/cara-daftar-anak-di-rumah').expect(404);

      const pub = await http()
        .put(`/admin/articles/${articleId}`)
        .set(admin())
        .send({
          title: 'Cara Daftar Anak di Rumah!',
          summary: 'Langkah singkat mendaftarkan anak.',
          body: BODY,
          coverImageId: coverId,
          status: 'published',
        })
        .expect(200);
      expect(pub.body.publishedAt).toBeTruthy();
      const list = await http().get('/public/articles?page=1&pageSize=3').expect(200);
      expect(list.body).toMatchObject({ total: 1, page: 1, pageSize: 3 });
      expect(list.body.items[0]).not.toHaveProperty('body');
      const one = await http().get('/public/articles/cara-daftar-anak-di-rumah').expect(200);
      expect(one.body).toMatchObject({
        title: 'Cara Daftar Anak di Rumah!',
        body: BODY,
        coverImageId: coverId,
      });
      // Gambar sampul tetap bisa diambil publik.
      await http().get(`/media/${coverId}`).expect(200);
    });

    it('judul sama → slug unik diberi akhiran angka; slug & sampul tidak sah ditolak', async () => {
      const r = await http()
        .post('/admin/articles')
        .set(admin())
        .send({ title: 'Cara daftar anak di rumah', summary: 'Ringkasan kedua ya.', body: BODY })
        .expect(201);
      expect(r.body.slug).toBe('cara-daftar-anak-di-rumah-2');
      await http()
        .post('/admin/articles')
        .set(admin())
        .send({ title: 'Slug aneh', slug: 'Ada Spasi', summary: 'Ringkasan ketiga.', body: BODY })
        .expect(400);
      await http()
        .post('/admin/articles')
        .set(admin())
        .send({
          title: 'Sampul hilang',
          summary: 'Ringkasan keempat.',
          body: BODY,
          coverImageId: '00000000-0000-4000-8000-000000000000',
        })
        .expect(400);
      await http().delete(`/admin/articles/${r.body.id}`).set(admin()).expect(200);
    });

    it('ganti sampul membuang gambar lama; hapus artikel membuang sampulnya', async () => {
      const count = async (id: string) =>
        Number(
          (await ctx.pool.query('select count(*)::int as n from media where id = $1', [id])).rows[0]
            .n,
        );
      const fresh = (
        await http()
          .post('/admin/media')
          .set(admin())
          .set('Content-Type', 'image/png')
          .send(PNG)
          .expect(201)
      ).body.id;
      await http()
        .put(`/admin/articles/${articleId}`)
        .set(admin())
        .send({
          title: 'Cara Daftar Anak di Rumah!',
          summary: 'Langkah singkat mendaftarkan anak.',
          body: BODY,
          coverImageId: fresh,
          status: 'published',
        })
        .expect(200);
      expect(await count(coverId)).toBe(0);
      expect(await count(fresh)).toBe(1);
      await http().delete(`/admin/articles/${articleId}`).set(admin()).expect(200);
      expect(await count(fresh)).toBe(0);
    });

    it('hanya admin yang bisa menulis artikel', async () => {
      await http()
        .post('/admin/articles')
        .set(ctx.auth(childToken))
        .send({ title: 'Artikel anak', summary: 'Ringkasan anak.', body: BODY })
        .expect(403);
      await http().get('/admin/articles').expect(401);
    });
  });
});
