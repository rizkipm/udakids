import { t } from '../i18n';

/**
 * Filter periode ringkasan admin (D-100): n hari terakhir, satu bulan kalender, atau satu tahun. Disimpan di URL
 * (`?periode=30h` | `2026-10` | `2026`) agar tautan bisa dibagikan dan tombol kembali bekerja.
 */
export type PeriodSel =
  | { kind: 'days'; days: 7 | 30 | 90 }
  | { kind: 'month'; year: number; month: number }
  | { kind: 'year'; year: number };

/** Periode yang sudah dihitung server (`period` di respons `/admin/insights`). */
export type Period = {
  kind: 'days' | 'month' | 'year';
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  days: number;
  bucket: 'day' | 'month';
};

export const DEFAULT_PERIOD: PeriodSel = { kind: 'days', days: 30 };
const QUICK_DAYS = [7, 30, 90] as const;

export function parsePeriod(raw: string | null): PeriodSel {
  if (!raw) return DEFAULT_PERIOD;
  const days = /^(\d+)h$/.exec(raw);
  if (days) {
    const n = Number(days[1]);
    return (QUICK_DAYS as readonly number[]).includes(n)
      ? { kind: 'days', days: n as 7 | 30 | 90 }
      : DEFAULT_PERIOD;
  }
  const ym = /^(\d{4})-(\d{2})$/.exec(raw);
  if (ym) {
    const month = Number(ym[2]);
    if (month >= 1 && month <= 12) return { kind: 'month', year: Number(ym[1]), month };
  }
  if (/^\d{4}$/.test(raw)) return { kind: 'year', year: Number(raw) };
  return DEFAULT_PERIOD;
}

export function formatPeriodParam(p: PeriodSel): string {
  if (p.kind === 'days') return `${p.days}h`;
  if (p.kind === 'month') return `${p.year}-${String(p.month).padStart(2, '0')}`;
  return String(p.year);
}

/** Query string untuk API (`days=30` | `year=2026&month=10` | `year=2026`). */
export function periodQuery(p: PeriodSel): string {
  if (p.kind === 'days') return `days=${p.days}`;
  if (p.kind === 'month') return `year=${p.year}&month=${p.month}`;
  return `year=${p.year}`;
}

const dateFmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('id-ID', { ...opts, timeZone: 'UTC' });

/** "1–9 Okt 2026", "28 Sep – 9 Okt 2026", "1 Jan 2025 – 9 Okt 2026". */
export function rangeLabel(from: string, to: string): string {
  if (from === to) return dateFmt(from, { day: 'numeric', month: 'short', year: 'numeric' });
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const sameMonth = sameYear && from.slice(5, 7) === to.slice(5, 7);
  const end = dateFmt(to, { day: 'numeric', month: 'short', year: 'numeric' });
  if (sameMonth) return `${Number(from.slice(8, 10))}–${end}`;
  return `${dateFmt(from, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })} – ${end}`;
}

/** Judul pendek periode untuk teks ("30 hari terakhir", "Oktober 2026", "Tahun 2026"). */
export function periodTitle(p: PeriodSel): string {
  if (p.kind === 'days') return t('admin.ins.lastDays', { n: p.days });
  if (p.kind === 'month')
    return new Date(Date.UTC(p.year, p.month - 1, 1)).toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  return t('admin.ins.yearN', { year: p.year });
}

/** Bulan untuk detail komisi: bulan terpilih, atau bulan akhir periode. */
export function commissionMonth(p: PeriodSel, period: Period | null, today: string): string {
  if (p.kind === 'month') return `${p.year}-${String(p.month).padStart(2, '0')}`;
  return (period?.to ?? today).slice(0, 7);
}

/** Perubahan % terhadap pembanding; null bila pembanding 0 (tidak bermakna). */
export const deltaPct = (cur: number, prev: number) =>
  prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
