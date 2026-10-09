import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { jakartaDate } from '../common/dates.js';

/**
 * Periode laporan admin (D-100): `days` (7–90 hari terakhir), `year` + `month` (satu bulan kalender), atau
 * `year` saja (satu tahun). Semua tanggal WIB. Pembanding = periode sebelumnya yang sama panjang: bulan/tahun
 * lalu s.d. tanggal yang sama bila periode berjalan belum selesai.
 */
export const periodQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});
export type PeriodQuery = z.infer<typeof periodQuerySchema>;

export type Period = {
  kind: 'days' | 'month' | 'year';
  /** Inklusif, "YYYY-MM-DD" (WIB). */
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  /** Jumlah hari dalam periode. */
  days: number;
  /** Seri harian sampai 92 hari; lebih dari itu per bulan. */
  bucket: 'day' | 'month';
};

const DAY = 86_400_000;
const toDate = (d: string) => new Date(`${d}T00:00:00Z`);
const fmt = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => fmt(new Date(toDate(d).getTime() + n * DAY));
const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const daysBetween = (a: string, b: string) =>
  Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY) + 1;

export function resolvePeriod(q: PeriodQuery, now = new Date()): Period {
  const today = jakartaDate(now);
  const make = (
    kind: Period['kind'],
    from: string,
    to: string,
    prevFrom: string,
    prevTo: string,
  ) => {
    const days = daysBetween(from, to);
    return {
      kind,
      from,
      to,
      prevFrom,
      prevTo,
      days,
      bucket: days > 92 ? 'month' : 'day',
    } as Period;
  };
  if (q.year && q.month) {
    const y = q.year;
    const m = q.month;
    const from = `${y}-${pad(m)}-01`;
    const end = `${y}-${pad(m)}-${pad(lastDay(y, m))}`;
    // Bulan berjalan dipotong s.d. hari ini; bulan yang belum mulai tetap utuh (kosong).
    const to = end > today && from <= today ? today : end;
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    const pLast = lastDay(py, pm);
    const prevDay = to === end ? pLast : Math.min(Number(to.slice(8, 10)), pLast);
    return make('month', from, to, `${py}-${pad(pm)}-01`, `${py}-${pad(pm)}-${pad(prevDay)}`);
  }
  if (q.year) {
    const y = q.year;
    const from = `${y}-01-01`;
    const end = `${y}-12-31`;
    const to = end > today && from <= today ? today : end;
    const md = to.slice(5);
    // 29 Feb → 28 Feb di tahun bukan kabisat.
    const prevMd = md === '02-29' && lastDay(y - 1, 2) === 28 ? '02-28' : md;
    return make('year', from, to, `${y - 1}-01-01`, `${y - 1}-${prevMd}`);
  }
  const n = q.days ?? 30;
  const from = addDays(today, -(n - 1));
  return make('days', from, today, addDays(from, -n), addDays(from, -1));
}

/** Batas waktu (timestamptz) untuk rentang tanggal WIB: `[from 00.00, to+1 00.00)` — memakai index ts. */
export function bounds(from: string, to: string) {
  return { start: `${from}T00:00:00+07:00`, end: `${addDays(to, 1)}T00:00:00+07:00` };
}

/** `col` berada dalam rentang tanggal WIB (inklusif). */
export function inRange(col: ReturnType<typeof sql.raw>, from: string, to: string) {
  const b = bounds(from, to);
  return sql`${col} >= ${b.start}::timestamptz and ${col} < ${b.end}::timestamptz`;
}

/** Daftar "YYYY-MM" 12 bulan yang berakhir di bulan `to`. */
export function monthsEnding(to: string, n = 12): string[] {
  const y = Number(to.slice(0, 4));
  const m = Number(to.slice(5, 7));
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  });
}

/** Tanggal terakhir di bulan `d` ("YYYY-MM-DD" → "YYYY-MM-28/29/30/31"). */
export function monthEnd(d: string): string {
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(5, 7));
  return `${d.slice(0, 7)}-${pad(lastDay(y, m))}`;
}

/** Senin dari minggu tanggal `d` ("YYYY-MM-DD"). */
export function weekStartOf(d: string): string {
  const dow = (toDate(d).getUTCDay() + 6) % 7; // 0 = Senin
  return addDays(d, -dow);
}
