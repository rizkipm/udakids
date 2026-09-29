import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEYLEN = 32;

/** Hash password / sandi gambar: "scrypt$<salt hex>$<hash hex>" (bersalt, bawaan Node). */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(secret, salt, KEYLEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifySecret(
  secret: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;
  const [algo, saltHex, hashHex] = stored.split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(secret, Buffer.from(saltHex, 'hex'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function randomCode(length: number, alphabet: string): string {
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join('');
}

export const randomToken = (bytes = 24) => randomBytes(bytes).toString('base64url');

/** Sandi gambar dinormalkan menjadi string sebelum di-hash. */
export const pinSecret = (pin: readonly string[]) => `pin:${pin.join('|')}`;
