import { createPublicKey, verify as verifySignature, type JsonWebKey } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * Masuk/daftar orang tua dengan Google (D-066). Peramban mengirim ID token (JWT) dari Google Identity
 * Services; server memverifikasi tanda tangan RS256 dengan kunci publik Google, penerbit, audiens
 * (GOOGLE_CLIENT_ID), masa berlaku, dan email terverifikasi. Tanpa library tambahan, tanpa client secret.
 */
export type GoogleProfile = { sub: string; email: string; name: string };

const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
/** Toleransi selisih jam server (detik). */
const SKEW_S = 60;

/** Client ID OAuth (Web) dari Google Cloud Console; kosong = fitur Google nonaktif. */
export const googleClientId = () => process.env.GOOGLE_CLIENT_ID?.trim() || '';

type Jwk = JsonWebKey & { kid?: string };

const b64json = (part: string): Record<string, unknown> =>
  JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>;

@Injectable()
export class GoogleVerifier {
  private keys = new Map<string, Jwk>();
  private keysUntil = 0;
  /** Kunci tetap (test); null = ambil dari Google. */
  private fixed: Jwk[] | null = null;

  /** Untuk test: pakai kunci publik sendiri, bukan kunci Google. */
  useKeys(keys: Jwk[]) {
    this.fixed = keys;
    this.keys = new Map(keys.map((k) => [k.kid ?? '', k]));
  }

  private async key(kid: string): Promise<Jwk | undefined> {
    if (this.fixed) return this.keys.get(kid);
    if (Date.now() > this.keysUntil || !this.keys.has(kid)) {
      const res = await fetch(CERTS_URL, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`kunci Google: HTTP ${res.status}`);
      const body = (await res.json()) as { keys: Jwk[] };
      this.keys = new Map(body.keys.map((k) => [k.kid ?? '', k]));
      const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1]);
      this.keysUntil = Date.now() + (Number.isFinite(maxAge) ? maxAge : 3600) * 1000;
    }
    return this.keys.get(kid);
  }

  async verify(idToken: string, now = Date.now()): Promise<GoogleProfile> {
    const clientId = googleClientId();
    const bad = (why: string): never => {
      throw new UnauthorizedException(`Masuk dengan Google gagal (${why}). Coba lagi.`);
    };
    if (!clientId) bad('belum diatur');
    const parts = idToken.split('.');
    if (parts.length !== 3) bad('token tidak valid');
    const [h, p, s] = parts as [string, string, string];
    let header: Record<string, unknown>;
    let claims: Record<string, unknown>;
    try {
      header = b64json(h);
      claims = b64json(p);
    } catch {
      return bad('token tidak valid');
    }
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') bad('token tidak valid');
    const jwk = await this.key(header.kid as string).catch(() => undefined);
    if (!jwk) bad('kunci tidak dikenal');
    const ok = verifySignature(
      'RSA-SHA256',
      Buffer.from(`${h}.${p}`),
      createPublicKey({ key: jwk!, format: 'jwk' }),
      Buffer.from(s, 'base64url'),
    );
    if (!ok) bad('tanda tangan tidak cocok');
    const sec = Math.floor(now / 1000);
    if (!ISSUERS.has(String(claims.iss))) bad('penerbit tidak dikenal');
    const aud = claims.aud;
    if (!(aud === clientId || (Array.isArray(aud) && aud.includes(clientId)))) bad('aplikasi lain');
    if (typeof claims.exp !== 'number' || claims.exp + SKEW_S < sec) bad('kedaluwarsa');
    if (typeof claims.iat === 'number' && claims.iat - SKEW_S > sec) bad('waktu tidak valid');
    if (claims.email_verified !== true && claims.email_verified !== 'true')
      bad('email Google belum terverifikasi');
    const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
    const sub = typeof claims.sub === 'string' ? claims.sub : '';
    if (!email || !sub) bad('data akun tidak lengkap');
    const name = (typeof claims.name === 'string' ? claims.name : '').trim().slice(0, 60);
    return { sub, email, name: name || email.split('@')[0]!.slice(0, 60) };
  }
}
