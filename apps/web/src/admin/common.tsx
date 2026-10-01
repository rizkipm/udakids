import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Color } from '@little-coder/engine';
import { errorMessage } from '../api/client';
import { PALETTE } from '../components/visuals';
import { t } from '../i18n';
import { Badge, formatDate, Notice, Spinner } from '../ui/ui';

/** Nilai yang baru berubah setelah `ms` tanpa perubahan (untuk validasi langsung). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [out, setOut] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setOut(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return out;
}

/** Jalankan aksi API dengan status sibuk + pesan galat/sukses. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [done, setDone] = useState<string>();
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
      setBusy(true);
      setError(undefined);
      setDone(undefined);
      try {
        const out = await fn();
        if (success) setDone(success);
        return out;
      } catch (err) {
        setError(err);
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [],
  );
  const clear = useCallback(() => {
    setError(undefined);
    setDone(undefined);
  }, []);
  return { busy, error, done, run, clear };
}

export function ActionNotice({ error, done }: { error?: unknown; done?: string }) {
  if (error) return <Notice tone="error">{errorMessage(error)}</Notice>;
  if (done) return <Notice tone="success">{done}</Notice>;
  return null;
}

/** Status muat standar untuk useFetch. */
export function Loadable({
  loading,
  error,
  hasData,
  children,
}: {
  loading: boolean;
  error: unknown;
  hasData: boolean;
  children: () => ReactNode;
}) {
  if (error) return <Notice tone="error">{errorMessage(error)}</Notice>;
  if (!hasData && loading) return <Spinner label={t('admin.loading')} />;
  if (!hasData) return null;
  return <>{children()}</>;
}

export function StatusBadge({ status }: { status: 'active' | 'draft' }) {
  return status === 'active' ? (
    <Badge tone="success">{t('admin.status.active')}</Badge>
  ) : (
    <Badge tone="muted">{t('admin.status.draft')}</Badge>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge tone="success">{t('admin.user.active')}</Badge>
  ) : (
    <Badge tone="muted">{t('admin.user.inactive')}</Badge>
  );
}

/** Titik warna Momo milik anak. */
export function ColorDot({ color }: { color: string }) {
  const fill = PALETTE[color as Color]?.fill ?? '#999';
  return <span className="adm-dot" style={{ background: fill }} aria-hidden />;
}

const ICONS = {
  plus: 'M12 5v14M5 12h14',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  back: 'M15 18l-6-6 6-6',
  check: 'M5 12l5 5 9-10',
  play: 'M8 5v14l11-7z',
} as const;

/** Ikon garis sederhana (tanpa emoji). */
export function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

export const skillPath = (id: string) => `/admin/skill/${encodeURIComponent(id)}`;
export const levelPath = (id: string) => `/admin/level/${encodeURIComponent(id)}`;
export const childReportPath = (id: string) => `/admin/laporan/anak/${encodeURIComponent(id)}`;

/** Konfirmasi sebelum aksi berbahaya (window.confirm; aman bila tidak tersedia). */
export function confirmAction(message: string): boolean {
  try {
    return window.confirm(message);
  } catch {
    return false;
  }
}

export const percent = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : `${Math.round(v)}%`;

export const formatUpdated = (v: string | null | undefined) =>
  t('admin.updatedAt', { date: formatDate(v) });
