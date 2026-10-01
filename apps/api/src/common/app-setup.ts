import type { NestExpressApplication } from '@nestjs/platform-express';
import { PROOF_MAX_BYTES, PROOF_TYPES } from '@little-coder/engine';

type Req = { method: string; path: string; headers: Record<string, string | string[] | undefined> };
type Res = {
  setHeader: (k: string, v: string) => void;
  status: (n: number) => Res;
  json: (b: unknown) => void;
};

/** Satu-satunya route yang menerima badan biner (bukti transfer). */
const PROOF_ROUTE = /^\/parent\/orders\/[0-9a-f-]{36}\/proof$/;

/**
 * Pengaturan aplikasi yang sama untuk server dan test (audit keamanan M1, M7, L7):
 * - `trust proxy` loopback: di balik Nginx, alamat IP klien dari X-Forwarded-For (rate limit per IP);
 * - header keamanan di semua respons API; tanpa `X-Powered-By`;
 * - badan biner (JPG/PNG/WEBP/PDF ≤ 2 MB) hanya diterima di route bukti transfer.
 */
export function configureApp(app: NestExpressApplication) {
  app.set('trust proxy', 'loopback');
  app.disable('x-powered-by');
  app.use((req: Req, res: Res, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; sandbox");
    const type = String(req.headers['content-type'] ?? '')
      .split(';')[0]!
      .trim();
    if ((PROOF_TYPES as readonly string[]).includes(type) && !PROOF_ROUTE.test(req.path)) {
      res.status(415).json({ message: 'Jenis isi tidak diterima di alamat ini' });
      return;
    }
    next();
  });
  app.useBodyParser('raw', { type: [...PROOF_TYPES], limit: PROOF_MAX_BYTES });
  return app;
}
