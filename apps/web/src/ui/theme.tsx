import { useEffect, useState } from 'react';
import { t } from '../i18n';

/**
 * Tema tampilan (D-110): TERANG bawaan, pengguna boleh memilih gelap. Disimpan per perangkat (`uk.theme`) dan
 * dipasang di <html data-theme>. Skrip kecil di index.html memasangnya sebelum halaman tampil (tanpa kedip putih).
 */
export type Theme = 'light' | 'dark';
export const THEME_KEY = 'uk.theme';

export function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#151a1f' : '#f6f7f8');
}

const listeners = new Set<(t: Theme) => void>();

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* mode privat: tetap berlaku untuk sesi ini */
  }
  applyTheme(theme);
  for (const l of listeners) l(theme);
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, set] = useState<Theme>(readTheme);
  useEffect(() => {
    listeners.add(set);
    return () => {
      listeners.delete(set);
    };
  }, []);
  return [theme, setTheme];
}

/** Tombol ganti tema: ikon matahari/bulan + label tertulis (tidak hanya ikon). */
export function ThemeToggle({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [theme, set] = useTheme();
  const dark = theme === 'dark';
  const label = dark ? t('common.theme.toLight') : t('common.theme.toDark');
  return (
    <button
      type="button"
      className={`theme-toggle${compact ? ' is-compact' : ''} ${className}`}
      aria-pressed={dark}
      aria-label={label}
      title={label}
      onClick={() => set(dark ? 'light' : 'dark')}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        {dark ? (
          <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
          </g>
        ) : (
          <path
            d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
        )}
      </svg>
      {!compact && <span>{dark ? t('common.theme.light') : t('common.theme.dark')}</span>}
    </button>
  );
}
