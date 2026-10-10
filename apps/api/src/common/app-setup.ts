import type { NestExpressApplication } from '@nestjs/platform-express';
import { PROOF_MAX_BYTES, PROOF_TYPES } from '@little-coder/engine';
import { MEDIA_MAX_BYTES, MEDIA_TYPES } from '../media/media.schema.js';

type Req = { method: string; path: string; headers: Record<string, string | string[] | undefined> };
type Res = {
  setHeader: (k: string, v: string) => void;
  status: (n: number) => Res;
  json: (b: unknown) => void;
};

/** Route yang menerima badan biner: bukti transfer (orang tua) dan unggah gambar (admin, D-042). */
const PROOF_ROUTE = /^\/parent\/orders\/[0-9a-f-]{36}\/proof$/;
const MEDIA_ROUTE = /^\/admin\/media$/;
/** Simpan katalog oleh admin: katalog utuh berisi Materi Topik & Lab Buku (D-109) bisa > 1 MB. */
const CATALOG_ROUTE = /^\/admin\/catalogs\/[a-z]+\/[a-z0-9]+$/;
const CATALOG_MAX_BYTES = 5 * 1024 * 1024; // sama dengan client_max_body_size Nginx (deploy/nginx.conf.example)

const contentType = (req: Pick<Req, 'headers'>) =>
  String(req.headers['content-type'] ?? '')
    .split(';')[0]!
    .trim()
    .toLowerCase();
const isProof = (req: Req) =>
  PROOF_ROUTE.test(req.path) && (PROOF_TYPES as readonly string[]).includes(contentType(req));
const isMedia = (req: Req) =>
  MEDIA_ROUTE.test(req.path) && (MEDIA_TYPES as readonly string[]).includes(contentType(req));
const BINARY_TYPES = new Set<string>([...PROOF_TYPES, ...MEDIA_TYPES]);

/**
 * Pengaturan aplikasi yang sama untuk server dan test (audit keamanan M1, M7, L7):
 * - `trust proxy` loopback: di balik Nginx, alamat IP klien dari X-Forwarded-For (rate limit per IP);
 * - header keamanan di semua respons API; tanpa `X-Powered-By`;
 * - badan biner hanya diterima di route bukti transfer (JPG/PNG/WEBP/PDF ≤ 2 MB) dan unggah gambar
 *   admin (JPG/PNG/WEBP ≤ 3 MB); jenis sebenarnya tetap dicek dari isi file di controller;
 * - JSON ≤ 100 KB (bawaan), kecuali simpan katalog oleh admin (≤ 5 MB, route khusus admin).
 */
export function configureApp(app: NestExpressApplication) {
  app.set('trust proxy', 'loopback');
  app.disable('x-powered-by');
  app.use((req: Req, res: Res, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; sandbox");
    if (BINARY_TYPES.has(contentType(req)) && !isProof(req) && !isMedia(req)) {
      res.status(415).json({ message: 'Jenis isi tidak diterima di alamat ini' });
      return;
    }
    next();
  });
  app.useBodyParser('raw', {
    type: (req) => isProof(req as unknown as Req),
    limit: PROOF_MAX_BYTES,
  });
  app.useBodyParser('raw', {
    type: (req) => isMedia(req as unknown as Req),
    limit: MEDIA_MAX_BYTES,
  });
  app.useBodyParser('json', {
    type: (req) => {
      const r = req as unknown as Req;
      return (
        r.method === 'PUT' && CATALOG_ROUTE.test(r.path) && contentType(r) === 'application/json'
      );
    },
    limit: CATALOG_MAX_BYTES,
  });
  // Parser JSON di atas menggantikan parser bawaan Nest, jadi JSON lain (100 KB, bawaan Express) dipasang di sini.
  app.useBodyParser('json', { limit: '100kb' });
  return app;
}
