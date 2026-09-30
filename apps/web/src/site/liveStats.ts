import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { API_URL } from '../config/app';

/** Statistik agregat dari database (`/public/stats`, D-033) — hanya angka, tanpa data pribadi. */
export type PublicStats = {
  books: number;
  totalLevels: number;
  users: number;
  learners: number;
  activeNow: number;
  rounds: number;
  updatedAt: string;
};

const POLL_MS = 30_000;

/**
 * Statistik realtime untuk landing: Server-Sent Events (`/public/stats/stream`) — server mengirim
 * angka baru begitu berubah. Bila SSE tidak tersedia/terputus, jatuh ke polling tiap 30 detik.
 * `live` = true selama aliran SSE tersambung.
 */
export function useLiveStats() {
  const [stats, setStats] = useState<PublicStats>();
  const [live, setLive] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const load = () =>
      api<PublicStats>('/public/stats')
        .then((s) => alive && setStats(s))
        .catch(() => undefined);
    const startPolling = () => {
      if (timer) return;
      timer = setInterval(load, POLL_MS);
    };

    void load();
    let source: EventSource | undefined;
    if (typeof EventSource !== 'undefined') {
      source = new EventSource(`${API_URL}/public/stats/stream`);
      source.onopen = () => alive && setLive(true);
      source.onmessage = (e) => {
        if (!alive) return;
        try {
          setStats(JSON.parse(e.data as string) as PublicStats);
          setLive(true);
        } catch {
          /* abaikan pesan rusak */
        }
      };
      source.onerror = () => {
        // EventSource mencoba menyambung ulang sendiri; sementara itu tetap segarkan lewat polling.
        if (alive) setLive(false);
        startPolling();
      };
    } else {
      startPolling();
    }
    return () => {
      alive = false;
      source?.close();
      if (timer) clearInterval(timer);
    };
  }, []);

  return { stats, live };
}
