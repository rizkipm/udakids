import { join } from 'node:path';

export const DEFAULT_DATABASE_URL = 'postgres://littlecoder:littlecoder@localhost:5432/littlecoder';
const DEV_SECRET = 'dev-only-secret-ganti-di-produksi';

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET wajib di produksi');
    return DEV_SECRET;
  }
  return secret;
}

/** Folder konten repo (seed skill, level, dialog). */
export const contentDir = () =>
  process.env.CONTENT_DIR ?? join(__dirname, '..', '..', '..', '..', 'content');

export const TOKEN_TTL = { staff: '12h', parent: '30d', child: '12h' } as const;
