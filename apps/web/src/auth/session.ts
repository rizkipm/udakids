import { useSyncExternalStore } from 'react';
import type { Role } from '@little-coder/engine';

/**
 * Sesi per jenis akun disimpan terpisah, sehingga orang tua dan anak bisa sama-sama masuk di
 * perangkat bersama. Disimpan di localStorage (dibungkus try/catch — bisa diblokir).
 */
export type SessionKind = 'staff' | 'parent' | 'child';
export type Session = {
  token: string;
  user: { id: string; role: Role; name: string };
  familyCode?: string;
};

const KEY = (k: SessionKind) => `lc.session.${k}`;
const listeners = new Set<() => void>();
const cache = new Map<SessionKind, Session | null>();

function read(kind: SessionKind): Session | null {
  if (cache.has(kind)) return cache.get(kind)!;
  let value: Session | null = null;
  try {
    const raw = localStorage.getItem(KEY(kind));
    value = raw ? (JSON.parse(raw) as Session) : null;
    // Buang token kedaluwarsa.
    if (value && tokenExpired(value.token)) value = null;
  } catch {
    value = null;
  }
  cache.set(kind, value);
  return value;
}

export function tokenExpired(token: string, now = Date.now()): boolean {
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number };
    return payload.exp !== undefined && payload.exp * 1000 <= now;
  } catch {
    return true;
  }
}

export function setSession(kind: SessionKind, session: Session | null) {
  cache.set(kind, session);
  try {
    if (session) localStorage.setItem(KEY(kind), JSON.stringify(session));
    else localStorage.removeItem(KEY(kind));
  } catch {
    /* penyimpanan tidak tersedia: sesi hanya di memori */
  }
  listeners.forEach((l) => l());
}

export const getSession = read;

export function useSession(kind: SessionKind): Session | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => read(kind),
  );
}

/** Kode keluarga diingat perangkat agar anak tidak perlu mengetik (D-016). */
export function rememberedFamilyCode(): string | null {
  try {
    return localStorage.getItem('lc.familyCode');
  } catch {
    return null;
  }
}
export function rememberFamilyCode(code: string | null) {
  try {
    if (code) localStorage.setItem('lc.familyCode', code);
    else localStorage.removeItem('lc.familyCode');
  } catch {
    /* abaikan */
  }
}
