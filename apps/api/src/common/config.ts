import { join } from 'node:path';

export const DEFAULT_DATABASE_URL = 'postgres://littlecoder:littlecoder@localhost:5432/littlecoder';
const DEV_SECRET = 'dev-only-secret-ganti-di-produksi';

/**
 * Rahasia JWT. Wajib diisi (minimal 32 karakter) kecuali saat test otomatis — rahasia bawaan ada di repo
 * sehingga siapa pun bisa memalsukan token admin (audit keamanan H2).
 */
export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret === DEV_SECRET) {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) return DEV_SECRET;
    throw new Error(
      'JWT_SECRET wajib diisi di .env (minimal 32 karakter). Buat dengan: openssl rand -base64 48',
    );
  }
  if (secret.length < 32 && process.env.NODE_ENV === 'production')
    throw new Error('JWT_SECRET terlalu pendek: minimal 32 karakter di produksi');
  return secret;
}

/** Folder konten repo (seed skill, level, dialog). */
export const contentDir = () =>
  process.env.CONTENT_DIR ?? join(__dirname, '..', '..', '..', '..', 'content');

/**
 * Teks antarmuka anak (i18n web) — dibaca server untuk daftar teks yang boleh dibuatkan suara Chirp (D-091).
 */
export const i18nDir = () =>
  process.env.I18N_DIR ?? join(__dirname, '..', '..', '..', 'web', 'src', 'i18n', 'id');

/** Masa berlaku sesi. Orang tua 7 hari (perangkat sering dipakai bersama anak, audit M8). */
export const TOKEN_TTL = { staff: '12h', parent: '7d', child: '12h' } as const;
