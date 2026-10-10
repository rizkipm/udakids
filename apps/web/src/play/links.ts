import { useEffect, useState } from 'react';
import type { CatalogResponse } from '../api/types';
import { useSession } from '../auth/session';

/**
 * Tautan buram untuk level & topik (D-027): `/play/latihan/<token>` dan `/play/topik/<token>`.
 * Token = 16 karakter base64url dari SHA-256("lc-link-v1|<id anak>|<jenis>|<kunci>"). Tautan tidak bisa
 * dibaca atau ditebak dari nama skill, dan berbeda untuk setiap anak.
 *
 * Catatan: ini penyamaran, bukan pengaman. Kunci level tetap diperiksa di perangkat (Practice) DAN di
 * server (sync menolak ronde untuk level terkunci), jadi mengubah URL tidak membuka level.
 */
export type Links = {
  level: (skillId: string) => string;
  topic: (t: { domain: string; grade: string; category: string }) => string;
  skillOf: (token: string) => string | undefined;
  topicOf: (token: string) => { domain: string; grade: string; code: string } | undefined;
  /** Materi Topik berformat lab (D-109): token sama dengan topik. */
  materi: (t: { domain: string; grade: string; category: string }) => string;
  /** Lab Buku (D-109): `/play/lab/<token>`. */
  book: (b: { domain: string; grade: string }) => string;
  bookOf: (token: string) => { domain: string; grade: string } | undefined;
};

const PEPPER = 'lc-link-v1';
const TOKEN_BYTES = 12;

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/**
 * SHA-256 murni JavaScript (FIPS 180-4). Dipakai bila `crypto.subtle` tidak tersedia: browser hanya
 * menyediakannya di HTTPS atau localhost, sedangkan iPad di jaringan lokal membuka `http://192.168.x.x`.
 * Hasilnya identik dengan Web Crypto (diuji), jadi token sama di semua perangkat.
 */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256(data: Uint8Array): Uint8Array {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const len = data.length;
  const padded = new Uint8Array(Math.ceil((len + 9) / 64) * 64);
  padded.set(data);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor((len * 8) / 2 ** 32));
  view.setUint32(padded.length - 4, (len * 8) >>> 0);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15]!, 7) ^ rotr(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotr(w[i - 2]!, 17) ^ rotr(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h as unknown as number[];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e!, 6) ^ rotr(e!, 11) ^ rotr(e!, 25);
      const ch = (e! & f!) ^ (~e! & g!);
      const t1 = (hh! + S1 + ch + K[i]! + w[i]!) >>> 0;
      const S0 = rotr(a!, 2) ^ rotr(a!, 13) ^ rotr(a!, 22);
      const maj = (a! & b!) ^ (a! & c!) ^ (b! & c!);
      const t2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d! + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0]! + a!) >>> 0;
    h[1] = (h[1]! + b!) >>> 0;
    h[2] = (h[2]! + c!) >>> 0;
    h[3] = (h[3]! + d!) >>> 0;
    h[4] = (h[4]! + e!) >>> 0;
    h[5] = (h[5]! + f!) >>> 0;
    h[6] = (h[6]! + g!) >>> 0;
    h[7] = (h[7]! + hh!) >>> 0;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  h.forEach((x, i) => ov.setUint32(i * 4, x));
  return out;
}

async function digest(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const subtle = typeof crypto !== 'undefined' ? crypto.subtle : undefined;
  if (subtle) return new Uint8Array(await subtle.digest('SHA-256', data));
  return sha256(data);
}

export async function linkToken(childId: string, kind: 'level' | 'topic' | 'book', key: string) {
  const data = new TextEncoder().encode(`${PEPPER}|${childId}|${kind}|${key}`);
  const hash = await digest(data);
  return base64url(hash.slice(0, TOKEN_BYTES));
}

const topicKey = (t: { domain: string; grade: string; category: string }) =>
  `${t.domain}/${t.grade}/${t.category}`;

async function build(childId: string, data: CatalogResponse): Promise<Links> {
  const levelTok = new Map<string, string>();
  const levelRev = new Map<string, string>();
  const topicTok = new Map<string, string>();
  const topicRev = new Map<string, { domain: string; grade: string; code: string }>();
  const bookTok = new Map<string, string>();
  const bookRev = new Map<string, { domain: string; grade: string }>();
  await Promise.all([
    ...data.catalogs.map(async (c) => {
      const key = `${c.domain}/${c.grade}`;
      const tok = await linkToken(childId, 'book', key);
      bookTok.set(key, tok);
      bookRev.set(tok, { domain: c.domain, grade: c.grade });
    }),
    ...data.skills.map(async (s) => {
      const tok = await linkToken(childId, 'level', s.id);
      levelTok.set(s.id, tok);
      levelRev.set(tok, s.id);
    }),
    ...data.catalogs.flatMap((c) =>
      c.categories.map(async (cat) => {
        const key = topicKey({ domain: c.domain, grade: c.grade, category: cat.code });
        const tok = await linkToken(childId, 'topic', key);
        topicTok.set(key, tok);
        topicRev.set(tok, { domain: c.domain, grade: c.grade, code: cat.code });
      }),
    ),
  ]);
  return {
    level: (id) => `/play/latihan/${levelTok.get(id) ?? ''}`,
    topic: (t) => `/play/topik/${topicTok.get(topicKey(t)) ?? ''}`,
    skillOf: (tok) => levelRev.get(tok),
    topicOf: (tok) => topicRev.get(tok),
    materi: (t) => `/play/belajar/${topicTok.get(topicKey(t)) ?? ''}/materi`,
    book: (b) => `/play/lab/${bookTok.get(`${b.domain}/${b.grade}`) ?? ''}`,
    bookOf: (tok) => bookRev.get(tok),
  };
}

// Dihitung sekali per anak + isi katalog, dipakai bersama semua halaman.
const cache = new Map<string, Promise<Links>>();
const fingerprint = (childId: string, d: CatalogResponse) =>
  `${childId}|${d.catalogs.length}|${d.skills.length}|${d.skills[0]?.id ?? ''}|${d.skills.at(-1)?.id ?? ''}`;

/** Peta tautan untuk anak yang masuk; `undefined` selama token sedang dihitung (sekejap). */
export function useLinks(data: CatalogResponse | undefined): Links | undefined {
  const childId = useSession('child')?.user.id;
  const [links, setLinks] = useState<{ key: string; links: Links }>();
  const key = data && childId ? fingerprint(childId, data) : '';
  useEffect(() => {
    if (!data || !childId) return;
    let alive = true;
    let p = cache.get(key);
    if (!p) {
      p = build(childId, data);
      cache.set(key, p);
    }
    void p.then((l) => alive && setLinks({ key, links: l }));
    return () => {
      alive = false;
    };
  }, [key, data, childId]);
  return links?.key === key ? links.links : undefined;
}
