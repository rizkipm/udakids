import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dbAvailable, startApp } from './e2e-setup.js';

/** Banner slideshow & galeri dokumentasi (D-042). Database test sendiri agar bisa paralel. */
const URL =
  process.env.DATABASE_URL_TEST_MEDIA ??
  'postgres://littlecoder:littlecoder@localhost:5432/littlecoder_test_media';
const up = await dbAvailable(URL);

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('fake-png-body'),
]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('fake-jpg')]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

const hour = 3600_000;
const at = (ms: number) => new Date(Date.now() + ms).toISOString();

describe.skipIf(!up)('banner & galeri (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof startApp>>;
  let parentToken = '';
  const http = () => ctx.http();
  const admin = () => ctx.auth(ctx.adminToken);

  const upload = async (buf = PNG, type = 'image/png') => {
    const r = await http()
      .post('/admin/media')
      .set(admin())
      .set('Content-Type', type)
      .send(buf)
      .expect(201);
    return r.body.id as string;
  };
  const mediaCount = async () =>
    Number((await ctx.pool.query('select count(*)::int as n from media')).rows[0].n);

  beforeAll(async () => {
    ctx = await startApp(URL);
    const r = await http()
      .post('/auth/parent/register')
      .send({ name: 'Ibu Banner', email: 'ibu@banner.id', password: 'rahasia123', consent: true })
      .expect(201);
    parentToken = r.body.token;
  }, 120_000);
  afterAll(async () => {
    await ctx?.close();
  });

  describe('unggah gambar', () => {
    it('PNG/JPG diterima; jenis disimpan dari isi file', async () => {
      const r = await http()
        .post('/admin/media')
        .set(admin())
        .set('Content-Type', 'image/png')
        .send(PNG)
        .expect(201);
      expect(r.body).toMatchObject({ mime: 'image/png', bytes: PNG.length });
      // Header bilang webp, isinya JPG → disimpan sebagai JPG.
      const j = await http()
        .post('/admin/media')
        .set(admin())
        .set('Content-Type', 'image/webp')
        .send(JPG)
        .expect(201);
      expect(j.body.mime).toBe('image/jpeg');
    });

    it('SVG, HTML, PDF, dan isi palsu ditolak', async () => {
      await http()
        .post('/admin/media')
        .set(admin())
        .set('Content-Type', 'image/svg+xml')
        .send(SVG)
        .expect(415);
      await http()
        .post('/admin/media')
        .set(admin())
        .set('Content-Type', 'text/html')
        .send('<html><script>x</script></html>')
        .expect(415);
      await http()
        .post('/admin/media')
        .set(admin())
        .set('Content-Type', 'application/pdf')
        .send(Buffer.from('%PDF-1.4 x'))
        .expect(415);
      // Header gambar, isi HTML → ditolak dari magic bytes.
      await http()
        .post('/admin/media')
        .set(admin())
        .set('Content-Type', 'image/png')
        .send(Buffer.from('<html>bukan gambar</html>'))
        .expect(400);
      await http()
        .post('/admin/media')
        .set(admin())
        .set('Content-Type', 'image/png')
        .send(Buffer.alloc(0))
        .expect(400);
    });

    it('lebih dari 3 MB ditolak', async () => {
      const big = Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]);
      await http()
        .post('/admin/media')
        .set(admin())
        .set('Content-Type', 'image/png')
        .send(big)
        .expect(413);
    });

    it('hanya admin', async () => {
      await http().post('/admin/media').set('Content-Type', 'image/png').send(PNG).expect(401);
      await http()
        .post('/admin/media')
        .set(ctx.auth(parentToken))
        .set('Content-Type', 'image/png')
        .send(PNG)
        .expect(403);
      const kid = await ctx.newChild('Bani');
      await http()
        .post('/admin/media')
        .set(ctx.auth(kid.token))
        .set('Content-Type', 'image/png')
        .send(PNG)
        .expect(403);
      await http().get('/admin/banners').set(ctx.auth(parentToken)).expect(403);
      await http().get('/admin/gallery').set(ctx.auth(parentToken)).expect(403);
    });

    it('route biner lain tetap menolak gambar (415)', async () => {
      await http()
        .post('/admin/banners')
        .set(admin())
        .set('Content-Type', 'image/png')
        .send(PNG)
        .expect(415);
    });

    it('GET /media/:id publik dengan cache lama + nosniff; 404 bila tidak ada', async () => {
      const id = await upload();
      const r = await http().get(`/media/${id}`).expect(200);
      expect(r.headers['content-type']).toBe('image/png');
      expect(r.headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(r.headers['x-content-type-options']).toBe('nosniff');
      expect(Buffer.compare(r.body as Buffer, PNG)).toBe(0);
      await http().get('/media/00000000-0000-4000-8000-000000000000').expect(404);
      await http().get('/media/bukan-uuid').expect(400);
    });
  });

  describe('banner', () => {
    const base = {
      title: 'Workshop Coding Akhir Pekan',
      subtitle: 'Sabtu ini di perpustakaan kota',
      ctaLabel: 'Daftar',
      ctaUrl: '/orang-tua/daftar',
      placements: ['landing'],
    };

    it('validasi: tautan berbahaya, label tanpa tautan, tempat tampil, jadwal terbalik', async () => {
      for (const ctaUrl of [
        'javascript:alert(1)',
        'JavaScript:alert(1)',
        'data:text/html,<script>1</script>',
        'http://contoh.id',
        '//evil.example',
        '/\\evil.example',
        'https://user:pw@contoh.id',
        '/play x',
      ]) {
        const r = await http()
          .post('/admin/banners')
          .set(admin())
          .send({ ...base, ctaUrl })
          .expect(400);
        expect(JSON.stringify(r.body)).toMatch(/ctaUrl/);
      }
      await http()
        .post('/admin/banners')
        .set(admin())
        .send({ ...base, ctaUrl: '' })
        .expect(400);
      await http()
        .post('/admin/banners')
        .set(admin())
        .send({ ...base, placements: [] })
        .expect(400);
      await http()
        .post('/admin/banners')
        .set(admin())
        .send({ ...base, placements: ['play'] })
        .expect(400);
      await http()
        .post('/admin/banners')
        .set(admin())
        .send({ ...base, tone: 'neon' })
        .expect(400);
      await http()
        .post('/admin/banners')
        .set(admin())
        .send({ ...base, title: 'x'.repeat(81) })
        .expect(400);
      await http()
        .post('/admin/banners')
        .set(admin())
        .send({ ...base, startsAt: at(2 * hour), endsAt: at(hour) })
        .expect(400);
      await http()
        .post('/admin/banners')
        .set(admin())
        .send({ ...base, imageId: '00000000-0000-4000-8000-000000000000' })
        .expect(400);
      await http()
        .post('/admin/banners')
        .set(admin())
        .send({ ...base, ctaUrl: 'https://contoh.id/acara?x=1' })
        .expect(201);
    });

    it('publik: hanya aktif, dalam jadwal, sesuai tempat tampil, urut sort', async () => {
      await ctx.pool.query('delete from banners');
      const mk = async (body: Record<string, unknown>) =>
        (await http().post('/admin/banners').set(admin()).send(body).expect(201)).body as {
          id: string;
        };
      const b = await mk({ ...base, title: 'B', sort: 2, placements: ['landing', 'parent'] });
      const a = await mk({ ...base, title: 'A', sort: 1 });
      await mk({ ...base, title: 'Nonaktif', active: false });
      await mk({ ...base, title: 'Nanti', startsAt: at(hour) });
      await mk({ ...base, title: 'Lewat', startsAt: at(-2 * hour), endsAt: at(-hour) });
      await mk({ ...base, title: 'Sedang', startsAt: at(-hour), endsAt: at(hour), sort: 3 });
      await mk({ ...base, title: 'Admin', placements: ['admin'] });

      const land = await http().get('/public/banners?placement=landing').expect(200);
      expect(land.body.items.map((x: { title: string }) => x.title)).toEqual(['A', 'B', 'Sedang']);
      expect(land.body.items[0]).not.toHaveProperty('active');
      await http().get('/public/banners?placement=admin').expect(400);
      await http().get('/public/banners?placement=parent').expect(400);

      await http().get('/parent/banners').expect(401);
      const par = await http().get('/parent/banners').set(ctx.auth(parentToken)).expect(200);
      expect(par.body.items.map((x: { title: string }) => x.title)).toEqual(['B']);
      const adm = await http().get('/admin/banners/live').set(admin()).expect(200);
      expect(adm.body.items.map((x: { title: string }) => x.title)).toEqual(['Admin']);
      await http().get('/admin/banners/live').set(ctx.auth(parentToken)).expect(403);

      // Urutkan ulang (daftar lengkap dari admin): B dulu.
      const all = await http().get('/admin/banners').set(admin()).expect(200);
      const re = await http()
        .post('/admin/banners/reorder')
        .set(admin())
        .send({
          ids: [
            b.id,
            a.id,
            ...all.body
              .map((x: { id: string }) => x.id)
              .filter((id: string) => id !== a.id && id !== b.id),
          ],
        })
        .expect(200);
      expect(re.body.slice(0, 2).map((x: { title: string }) => x.title)).toEqual(['B', 'A']);
      const land2 = await http().get('/public/banners').expect(200);
      expect(land2.body.items[0].title).toBe('B');
    });

    it('ubah & hapus: gambar lama yang tidak dipakai ikut terhapus', async () => {
      const img1 = await upload();
      const img2 = await upload();
      const created = await http()
        .post('/admin/banners')
        .set(admin())
        .send({ ...base, imageId: img1 })
        .expect(201);
      const before = await mediaCount();
      const upd = await http()
        .put(`/admin/banners/${created.body.id}`)
        .set(admin())
        .send({ ...base, title: 'Diubah', imageId: img2, placements: ['parent', 'admin'] })
        .expect(200);
      expect(upd.body).toMatchObject({ title: 'Diubah', imageId: img2 });
      expect(await mediaCount()).toBe(before - 1);
      await http().get(`/media/${img1}`).expect(404);
      await http()
        .put(`/admin/banners/${created.body.id}`)
        .set(admin())
        .send({ ...base, ctaUrl: 'javascript:void(0)' })
        .expect(400);
      await http().delete(`/admin/banners/${created.body.id}`).set(admin()).expect(200);
      await http().get(`/media/${img2}`).expect(404);
      await http().delete(`/admin/banners/${created.body.id}`).set(admin()).expect(404);
    });

    it('gambar yang dipakai dua tempat tidak ikut terhapus', async () => {
      const img = await upload();
      const one = await http()
        .post('/admin/banners')
        .set(admin())
        .send({ ...base, imageId: img })
        .expect(201);
      await http()
        .post('/admin/gallery')
        .set(admin())
        .send({ title: 'Sama', imageId: img })
        .expect(201);
      await http().delete(`/admin/banners/${one.body.id}`).set(admin()).expect(200);
      await http().get(`/media/${img}`).expect(200);
      await http().delete(`/admin/media/${img}`).set(admin()).expect(200);
      await http().get(`/media/${img}`).expect(200);
    });
  });

  describe('galeri', () => {
    it('validasi tanggal & judul', async () => {
      const img = await upload();
      await http()
        .post('/admin/gallery')
        .set(admin())
        .send({ title: '', imageId: img })
        .expect(400);
      await http()
        .post('/admin/gallery')
        .set(admin())
        .send({ title: 'Tanggal aneh', imageId: img, eventDate: '2026-02-30' })
        .expect(400);
      await http()
        .post('/admin/gallery')
        .set(admin())
        .send({ title: 'Tanpa gambar', imageId: '00000000-0000-4000-8000-000000000000' })
        .expect(400);
    });

    it('paging publik: hanya aktif, tanggal terbaru dulu (tanpa tanggal di akhir)', async () => {
      await ctx.pool.query('delete from gallery_items');
      const dates = ['2026-01-05', '2026-03-10', null, '2026-02-01', '2025-12-24'];
      const ids: string[] = [];
      for (const [i, eventDate] of dates.entries()) {
        const imageId = await upload();
        const r = await http()
          .post('/admin/gallery')
          .set(admin())
          .send({ title: `Foto ${i}`, caption: 'Keseruan', eventDate, imageId })
          .expect(201);
        ids.push(r.body.id);
      }
      await http()
        .put(`/admin/gallery/${ids[4]}`)
        .set(admin())
        .send({ title: 'Disembunyikan', active: false, eventDate: '2025-12-24' })
        .expect(200);

      const p1 = await http().get('/public/gallery?page=1&pageSize=2').expect(200);
      expect(p1.body.total).toBe(4);
      expect(p1.body.items.map((x: { eventDate: string | null }) => x.eventDate)).toEqual([
        '2026-03-10',
        '2026-02-01',
      ]);
      const p2 = await http().get('/public/gallery?page=2&pageSize=2').expect(200);
      expect(p2.body.items.map((x: { eventDate: string | null }) => x.eventDate)).toEqual([
        '2026-01-05',
        null,
      ]);
      expect(p2.body.items[0]).not.toHaveProperty('active');
      await http().get('/public/gallery?pageSize=1000').expect(400);

      const adm = await http().get('/admin/gallery?page=1&pageSize=10').set(admin()).expect(200);
      expect(adm.body.total).toBe(5);
      expect(adm.body.items.some((x: { active: boolean }) => !x.active)).toBe(true);
    });

    it('hapus foto ikut menghapus gambarnya', async () => {
      const img = await upload();
      const r = await http()
        .post('/admin/gallery')
        .set(admin())
        .send({ title: 'Hapus aku', imageId: img })
        .expect(201);
      await http().get(`/media/${img}`).expect(200);
      await http().delete(`/admin/gallery/${r.body.id}`).set(admin()).expect(200);
      await http().get(`/media/${img}`).expect(404);
      await http().delete(`/admin/gallery/${r.body.id}`).set(admin()).expect(404);
    });
  });
});
