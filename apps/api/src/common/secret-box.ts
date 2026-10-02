import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { jwtSecret } from './config.js';

/**
 * Enkripsi rahasia yang disimpan di database (mis. API key suara dari admin, D-043): AES-256-GCM dengan
 * kunci turunan dari JWT_SECRET. Backup database tidak memuat API key dalam bentuk terbaca. Bila
 * JWT_SECRET berganti, rahasia lama tidak bisa dibuka → dianggap kosong (admin mengisi ulang).
 */
export type Sealed = {
  v: 1;
  iv: string;
  tag: string;
  data: string;
  last4: string;
  updatedAt: string;
};

const key = () => createHash('sha256').update(`lc-secret-v1|${jwtSecret()}`).digest();

export function seal(plain: string, now = new Date()): Sealed {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return {
    v: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
    last4: plain.slice(-4),
    updatedAt: now.toISOString(),
  };
}

export function open(box: Sealed | null | undefined): string | null {
  if (!box || box.v !== 1) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(box.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(box.tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(box.data, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}
