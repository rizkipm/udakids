import { useEffect, useRef, useState } from 'react';

/**
 * Stopwatch tanpa batas waktu (D-024): hanya berjalan saat `running` dan tab terlihat, sehingga
 * waktu = lama anak mengerjakan soal (bukan saat membaca pembahasan atau aplikasi di latar).
 */
export function useStopwatch(running: boolean) {
  const acc = useRef(0);
  const since = useRef<number | null>(null);
  const [, tick] = useState(0);
  const [visible, setVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden',
  );

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const active = running && visible;
  useEffect(() => {
    if (!active) return;
    since.current = Date.now();
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => {
      clearInterval(id);
      acc.current += Date.now() - (since.current ?? Date.now());
      since.current = null;
    };
  }, [active]);

  /** Waktu terkumpul (ms), termasuk yang sedang berjalan. */
  const elapsed = () => acc.current + (since.current === null ? 0 : Date.now() - since.current);
  return { elapsed, running: active };
}
