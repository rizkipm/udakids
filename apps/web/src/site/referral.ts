import { isReferralCode, normalizeReferralCode } from '@little-coder/engine';

/**
 * Kode referal dari link `/r/KODE` (D-063) diingat di perangkat 30 hari, supaya tetap terisi walau orang tua
 * baru mendaftar beberapa hari kemudian. Hanya kode — tidak ada data pengunjung yang disimpan.
 */
const KEY = 'lc.ref';
const TTL_MS = 30 * 86_400_000;

export function rememberReferral(raw: string, now = Date.now()) {
  if (!isReferralCode(raw)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ code: normalizeReferralCode(raw), at: now }));
  } catch {
    /* penyimpanan diblokir: kode tetap dibawa lewat ?ref= */
  }
}

export function readReferral(now = Date.now()): string {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as {
      code?: string;
      at?: number;
    } | null;
    if (v?.code && typeof v.at === 'number' && now - v.at < TTL_MS && isReferralCode(v.code))
      return v.code;
  } catch {
    /* abaikan */
  }
  return '';
}

export function forgetReferral() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
}
