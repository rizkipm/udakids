import { useEffect, useRef, useState } from 'react';

/**
 * Jam lomba mengikuti jam SERVER (D-042): selisih `serverNow - Date.now()` dicatat saat respons diterima,
 * sehingga mengubah jam perangkat tidak mengubah sisa waktu.
 */
export const clockOffset = (serverNowIso: string, localNow = Date.now()) =>
  Date.parse(serverNowIso) - localNow;

/** Sisa waktu dalam kata, dibulatkan ke atas: "2 jam 5 menit", "3 hari", "45 detik". */
export function untilWords(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return h > 0 ? `${d} hari ${h} jam` : `${d} hari`;
  if (h > 0) return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
  if (m > 0) return `${Math.ceil(s / 60)} menit`;
  return `${s} detik`;
}

/** "Sabtu, 10 Okt" (zona waktu perangkat). */
export const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
/** "10.00". */
export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

/** Waktu server sekarang (ms), diperbarui tiap detik. `offset` dari `clockOffset`. */
export function useServerNow(offset: number | undefined, tickMs = 1000) {
  const [now, setNow] = useState(() => Date.now() + (offset ?? 0));
  const ref = useRef(offset ?? 0);
  ref.current = offset ?? 0;
  useEffect(() => {
    setNow(Date.now() + ref.current);
    const id = setInterval(() => setNow(Date.now() + ref.current), tickMs);
    return () => clearInterval(id);
  }, [offset, tickMs]);
  return now;
}
