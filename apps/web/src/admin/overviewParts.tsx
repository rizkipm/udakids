import type { ReactNode } from 'react';
import { formatRupiah } from '@little-coder/engine';
import { t, type MessageKey } from '../i18n';
import { compact } from './insightCharts';

/** Bagian tampilan & format angka bersama untuk ringkasan admin, afiliasi, dan komisi (D-099, D-100). */

export const shortDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
export const longDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
export const monthName = (month: string, style: 'short' | 'long') =>
  new Date(`${month.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString('id-ID', {
    month: style,
    ...(style === 'long' && { year: 'numeric' }),
    timeZone: 'UTC',
  });
export const hours = (h: number | null) =>
  h === null
    ? '–'
    : h < 1
      ? t('admin.ins.minutesShort', { n: Math.round(h * 60) })
      : t('admin.ins.hoursShort', { n: h.toLocaleString('id-ID') });
export const rupiahAxis = (n: number) => (n === 0 ? '0' : `Rp${compact(n)}`);
export const rupiahShort = (n: number) =>
  Math.abs(n) >= 1_000_000
    ? `Rp${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
    : formatRupiah(n);
export const domainLabel = (d: string) => {
  const key = `admin.ins.domain.${d}` as MessageKey;
  const label = t(key);
  return label === key ? d : label;
};

export function Panel({
  title,
  sub,
  action,
  children,
  className = '',
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ins-panel pd-rise ${className}`}>
      <div className="ins-panel-head">
        <div>
          <h2>{title}</h2>
          {sub && <p className="ins-sub">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="ins-section-head">
      <h2 className="ins-section">{children}</h2>
      {sub && <p className="ins-sub">{sub}</p>}
    </div>
  );
}

/** Angka ringkas di kepala grafik besar; `delta` = % terhadap periode pembanding. */
export function Stats({
  items,
}: {
  items: { label: string; value: string; hint?: string; delta?: number | null }[];
}) {
  return (
    <dl className="ins-stats">
      {items.map((x) => (
        <div key={x.label}>
          <dt>{x.label}</dt>
          <dd>
            {x.value}
            {x.delta !== undefined && x.delta !== null && <Delta pct={x.delta} />}
          </dd>
          {x.hint && <small>{x.hint}</small>}
        </div>
      ))}
    </dl>
  );
}

/** Panah naik/turun + persen; arti ditulis (bukan hanya warna). */
export function Delta({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span
      className={`ins-delta ${up ? 'is-up' : 'is-down'}`}
      title={t(up ? 'admin.ins.vsPrevUp' : 'admin.ins.vsPrevDown', { pct: Math.abs(pct) })}
    >
      <span aria-hidden>{up ? '▲' : '▼'}</span>
      <span className="pd-sr-only">
        {t(up ? 'admin.ins.vsPrevUp' : 'admin.ins.vsPrevDown', { pct: Math.abs(pct) })}
      </span>
      <span aria-hidden>{Math.abs(pct)}%</span>
    </span>
  );
}

export function Row({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="ins-row">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}
