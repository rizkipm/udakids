import { useCallback } from 'react';
import { ApiError } from '../../api/client';
import { getSession, setSession } from '../../auth/session';
import { API_URL } from '../../config/app';

/**
 * Ambil isi biner (bukti transfer, pratinjau suara) dengan token staf. Elemen <img>/<audio> tidak
 * bisa mengirim header Authorization, jadi hasilnya dipakai lewat object URL.
 */
export function useBlobCall() {
  return useCallback(async (path: string, body?: unknown): Promise<Blob> => {
    const token = getSession('staff')?.token ?? null;
    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
      });
    } catch {
      throw new ApiError(0, 'Tidak tersambung ke server');
    }
    if (!res.ok) {
      let message = res.statusText;
      try {
        const data = (await res.json()) as { message?: unknown };
        if (typeof data.message === 'string') message = data.message;
      } catch {
        /* bukan JSON */
      }
      if (res.status === 401) setSession('staff', null);
      throw new ApiError(res.status, message);
    }
    return res.blob();
  }, []);
}

/** Tanggal kalender WIB (YYYY-MM-DD), sama seperti buku kas di server. */
export const jakartaDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
export const thisMonth = () => jakartaDate().slice(0, 7);

/** "2026-03" → "Maret 2026". */
export const monthLabel = (m: string) =>
  new Date(`${m}-15T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

/** "2026-03-07" → "7 Mar 2026". */
export const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', { dateStyle: 'medium' });

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO → nilai <input type="datetime-local"> (waktu lokal perangkat). */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Nilai datetime-local (waktu lokal) → ISO dengan zona waktu; kosong → null. */
export function localInputToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Basis poin → teks persen Indonesia, mis. 1250 → "12,5". */
export const bpToPercent = (bp: number) =>
  (bp / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 });

/** "12,5" / "12.5" → 1250 basis poin; tidak valid → NaN. */
export function percentToBp(v: string): number {
  const s = v.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}

/** Angka bulat dari input (titik ribuan diabaikan); kosong/tidak valid → NaN. */
export function parseAmount(v: string): number {
  const s = v.replace(/[.\s]/g, '');
  return /^\d+$/.test(s) ? Number(s) : NaN;
}

/** Ukuran berkas ramah baca. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024)
    return `${(n / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 })} KB`;
  return `${(n / 1024 / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`;
}

/** Pesanan berubah (disetujui/ditolak) → badge jumlah menunggu di menu dimuat ulang. */
export const ORDERS_CHANGED = 'lc:admin-orders-changed';
export const notifyOrdersChanged = () => {
  try {
    window.dispatchEvent(new Event(ORDERS_CHANGED));
  } catch {
    /* tanpa window (test node) */
  }
};
