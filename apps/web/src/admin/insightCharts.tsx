import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { t } from '../i18n';
import '../ui/charts.css';
import './insightCharts.css';

/**
 * Grafik SVG ringan untuk ringkasan admin (D-099): kolom (tumpuk/kelompok), garis, donat, peta panas,
 * corong. Tanpa pustaka. Warna kategori divalidasi buta warna (urutan tetap, tidak berputar); setiap
 * grafik punya legenda (≥ 2 seri), tooltip saat disorot, dan tabel sebagai padanan aksesibel.
 */
export const SERIES = {
  /* Nilai = variabel CSS di ui/charts.css (--viz-*), sehingga ikut tema terang/gelap (D-110). */
  blue: 'var(--viz-1)',
  orange: 'var(--viz-2)',
  aqua: 'var(--viz-3)',
  yellow: 'var(--viz-4)',
  muted: 'var(--viz-muted)',
} as const;
/** Warna status (hanya untuk arti baik/buruk), selalu dengan label. */
export const STATUS_COLOR = {
  good: 'var(--viz-good)',
  warning: 'var(--viz-warning)',
  info: 'var(--viz-info)',
  critical: 'var(--viz-critical)',
  muted: 'var(--viz-muted)',
  muted2: 'var(--viz-muted-2)',
} as const;
/** Tingkat ramp satu warna (biru --viz-seq) dicampur dengan permukaan; tingkat 0 hampir sewarna kartu. */
const seq = (pct: number) => `color-mix(in srgb, var(--viz-seq) ${pct}%, var(--kertas))`;
/** Ramp berurutan, terang → gelap (di tema gelap: redup → terang), untuk peta panas & kohort. */
const RAMP = [seq(6), seq(22), seq(40), seq(60), seq(80), seq(100)];

const PAD = { top: 16, right: 16, bottom: 30, left: 58 };
const GAP = 2;

export type Series = { key: string; label: string; color: string; values: number[] };

const plain = (n: number) => n.toLocaleString('id-ID');
const compactFmt = new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
export const compact = (n: number) => compactFmt.format(n);

/** Garis bantu sumbu Y yang "bulat" (0, 5, 10 …); langkah minimal 1 karena semua data bilangan bulat. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw);
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

/** Lebar wadah (ResizeObserver) agar teks SVG tidak ikut melar. */
function useWidth(fallback = 720) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setW(Math.max(260, Math.round(e.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Batang dengan ujung data membulat 4px dan pangkal persegi. */
function barPath(x: number, y: number, w: number, h: number, round: boolean) {
  const r = round ? Math.min(4, w / 2, h) : 0;
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

type TipRow = { color?: string; label: string; value: string };

function Tooltip({
  x,
  width,
  title,
  rows,
}: {
  x: number;
  width: number;
  title: string;
  rows: TipRow[];
}) {
  const left = Math.min(Math.max(x, 90), width - 90);
  return (
    <div className="ich-tip" style={{ left }} role="status">
      <strong>{title}</strong>
      {rows.map((r) => (
        <span key={r.label}>
          {r.color && <i style={{ background: r.color }} aria-hidden />}
          {r.label}
          <b>{r.value}</b>
        </span>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <ul className="ich-legend">
      {items.map((s) => (
        <li key={s.label}>
          <i style={{ background: s.color }} aria-hidden />
          {s.label}
          {s.value && <b>{s.value}</b>}
        </li>
      ))}
    </ul>
  );
}

/** Tabel padanan grafik (pembaca layar, salin angka). */
export function ChartTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="ich-table">
      <summary>{t('admin.ins.showTable')}</summary>
      <div className="ich-table-scroll">
        <table>
          <thead>
            <tr>
              {head.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{typeof c === 'number' ? plain(c) : c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function YAxis({
  ticks,
  y,
  width,
  format,
}: {
  ticks: number[];
  y: (v: number) => number;
  width: number;
  format: (n: number) => string;
}) {
  return (
    <g className="ich-axis">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} />
          <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end">
            {format(v)}
          </text>
        </g>
      ))}
    </g>
  );
}

function XLabels({
  n,
  x,
  height,
  every,
  tick,
}: {
  n: number;
  x: (i: number) => number;
  height: number;
  every: number;
  tick: (i: number) => string;
}) {
  return (
    <g className="ich-axis">
      {Array.from({ length: n }, (_, i) =>
        (i % every === 0 && n - 1 - i >= every / 2) || i === n - 1 ? (
          <text key={i} x={x(i)} y={height - 8} textAnchor="middle">
            {tick(i)}
          </text>
        ) : null,
      )}
    </g>
  );
}

const autoEvery = (n: number, width: number) =>
  Math.max(1, Math.ceil(n / Math.max(4, Math.floor(width / 70))));

/**
 * Kolom per kategori X. `stack` = segmen bertumpuk (bagian dari total), `group` = berdampingan
 * (mis. pemasukan vs pengeluaran). Satu sumbu Y, tidak pernah dua.
 */
export function ColumnChart({
  series,
  label,
  tick,
  title,
  mode = 'stack',
  height = 300,
  format = plain,
  axisFormat = compact,
  extra,
}: {
  series: Series[];
  label: string;
  tick: (i: number) => string;
  title?: (i: number) => string;
  mode?: 'stack' | 'group';
  height?: number;
  format?: (n: number) => string;
  axisFormat?: (n: number) => string;
  extra?: (i: number) => TipRow[];
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const n = series[0]?.values.length ?? 0;
  const totals = Array.from({ length: n }, (_, i) =>
    mode === 'stack'
      ? series.reduce((a, s) => a + (s.values[i] ?? 0), 0)
      : Math.max(0, ...series.map((s) => s.values[i] ?? 0)),
  );
  const ticks = niceTicks(Math.max(0, ...totals));
  const top = ticks[ticks.length - 1] ?? 1;
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const band = plotW / Math.max(1, n);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const cx = (i: number) => PAD.left + band * i + band / 2;
  const per = mode === 'group' ? series.length : 1;
  const barW = Math.max(2, Math.min(24, (band - GAP * 2) / per - (per > 1 ? GAP : 0)));
  const peak = totals.indexOf(Math.max(...totals));
  const empty = (totals[peak] ?? 0) <= 0;
  const name = title ?? tick;

  return (
    <div className="ich" ref={ref}>
      {series.length > 1 && <Legend items={series} />}
      <div className="ich-plot">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          onMouseLeave={() => setHover(null)}
        >
          <YAxis ticks={empty ? [0] : ticks} y={y} width={width} format={axisFormat} />
          {hover !== null && (
            <rect
              className="ich-hl"
              x={PAD.left + band * hover}
              y={PAD.top}
              width={band}
              height={plotH}
            />
          )}
          {Array.from({ length: n }, (_, i) => {
            if (mode === 'group') {
              const start = cx(i) - (per * barW + (per - 1) * GAP) / 2;
              return series.map((s, k) => {
                const v = s.values[i] ?? 0;
                const h = plotH * (v / top);
                return v > 0 ? (
                  <path
                    key={`${s.key}${i}`}
                    d={barPath(start + k * (barW + GAP), y(v), barW, h, true)}
                    style={{ fill: s.color }}
                  />
                ) : null;
              });
            }
            let base = 0;
            const drawn = series.filter((s) => (s.values[i] ?? 0) > 0);
            return drawn.map((s, k) => {
              const v = s.values[i] ?? 0;
              const yTop = y(base + v);
              const h = Math.max(1, y(base) - yTop - (k > 0 ? GAP : 0));
              base += v;
              return (
                <path
                  key={`${s.key}${i}`}
                  d={barPath(cx(i) - barW / 2, yTop, barW, h, k === drawn.length - 1)}
                  style={{ fill: s.color }}
                />
              );
            });
          })}
          {(totals[peak] ?? 0) > 0 && (
            <text
              className="ich-peak"
              x={cx(peak)}
              y={y(totals[peak] ?? 0) - 6}
              textAnchor="middle"
            >
              {axisFormat(totals[peak] ?? 0)}
            </text>
          )}
          <XLabels n={n} x={cx} height={height} every={autoEvery(n, plotW)} tick={tick} />
          {Array.from({ length: n }, (_, i) => (
            <rect
              key={i}
              className="ich-hit"
              x={PAD.left + band * i}
              y={PAD.top}
              width={band}
              height={plotH}
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
        {empty && <p className="ich-empty">{t('admin.ins.chartEmpty')}</p>}
        {hover !== null && !empty && (
          <Tooltip
            x={cx(hover)}
            width={width}
            title={name(hover)}
            rows={[
              ...series.map((s) => ({
                color: s.color,
                label: s.label,
                value: format(s.values[hover] ?? 0),
              })),
              ...(extra?.(hover) ?? []),
            ]}
          />
        )}
      </div>
    </div>
  );
}

/** Garis (1–2 seri berskala sama) dengan arsir tipis, titik akhir berlabel, dan garis bidik saat disorot. */
export function LineChart({
  series,
  label,
  tick,
  title,
  height = 260,
  format = plain,
  axisFormat = compact,
}: {
  series: Series[];
  label: string;
  tick: (i: number) => string;
  title?: (i: number) => string;
  height?: number;
  format?: (n: number) => string;
  axisFormat?: (n: number) => string;
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const n = series[0]?.values.length ?? 0;
  const ticks = niceTicks(Math.max(0, ...series.flatMap((s) => s.values)));
  const top = ticks[ticks.length - 1] ?? 1;
  // Ruang kanan untuk label nilai di ujung garis.
  const endLabel = Math.max(
    0,
    ...series.map((s) => axisFormat(s.values[s.values.length - 1] ?? 0).length),
  );
  const right = PAD.right + 14 + endLabel * 7;
  const plotW = width - PAD.left - right;
  const plotH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const empty = top <= 1 && series.every((s) => s.values.every((v) => v <= 0));
  const pts = (s: Series) => s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const name = title ?? tick;
  const onMove = (e: MouseEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - box.left) / Math.max(1, box.width);
    setHover(Math.min(n - 1, Math.max(0, Math.round(rel * (n - 1)))));
  };
  return (
    <div className="ich" ref={ref}>
      {series.length > 1 && <Legend items={series} />}
      <div className="ich-plot">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          onMouseLeave={() => setHover(null)}
        >
          <YAxis
            ticks={empty ? [0] : ticks}
            y={y}
            width={width - right + PAD.right}
            format={axisFormat}
          />
          {series.length === 1 && series[0] && n > 1 && (
            <polygon
              points={`${x(0)},${y(0)} ${pts(series[0])} ${x(n - 1)},${y(0)}`}
              style={{ fill: series[0].color }}
              opacity={0.1}
            />
          )}
          {series.map((s) => (
            <polyline
              key={s.key}
              points={pts(s)}
              className="ich-line"
              style={{ stroke: s.color }}
            />
          ))}
          {hover !== null && (
            <line
              className="ich-cross"
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + plotH}
            />
          )}
          {series.map((s) => {
            const i = hover ?? n - 1;
            const v = s.values[i] ?? 0;
            return (
              <g key={s.key}>
                <circle className="ich-dot" cx={x(i)} cy={y(v)} r={4.5} style={{ fill: s.color }} />
                {hover === null && (
                  <text className="ich-peak" x={x(i) + 8} y={y(v)} dy="0.32em">
                    {axisFormat(v)}
                  </text>
                )}
              </g>
            );
          })}
          <XLabels n={n} x={x} height={height} every={autoEvery(n, plotW)} tick={tick} />
          <rect
            className="ich-hit"
            x={PAD.left}
            y={PAD.top}
            width={Math.max(1, plotW)}
            height={plotH}
            onMouseMove={onMove}
          />
        </svg>
        {empty && <p className="ich-empty">{t('admin.ins.chartEmpty')}</p>}
        {hover !== null && !empty && (
          <Tooltip
            x={x(hover)}
            width={width}
            title={name(hover)}
            rows={series.map((s) => ({
              color: s.color,
              label: s.label,
              value: format(s.values[hover] ?? 0),
            }))}
          />
        )}
      </div>
    </div>
  );
}

/** Donat bagian-dari-keseluruhan (≤ 6 segmen) dengan legenda berangka & persen. */
export function Donut({
  segments,
  label,
  center,
  caption,
  format = plain,
}: {
  segments: { label: string; value: number; color: string }[];
  label: string;
  center: ReactNode;
  caption: string;
  format?: (n: number) => string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const size = 188;
  const r = 74;
  const c = 2 * Math.PI * r;
  const live = segments.filter((s) => s.value > 0);
  const gap = live.length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <div className="ich-donut">
      <div className="ich-donut-ring">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={label}
        >
          <circle cx={size / 2} cy={size / 2} r={r} className="ich-donut-track" />
          {total > 0 &&
            live.map((s) => {
              const len = (s.value / total) * c;
              const el = (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  className="ich-donut-seg"
                  style={{ stroke: s.color }}
                  strokeDasharray={`${Math.max(0.5, len - gap)} ${c}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                >
                  <title>{`${s.label}: ${format(s.value)}`}</title>
                </circle>
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="ich-donut-center">
          <strong>{center}</strong>
          <small>{caption}</small>
        </div>
      </div>
      <ul className="ich-donut-legend">
        {segments.map((s) => (
          <li key={s.label}>
            <i style={{ background: s.color }} aria-hidden />
            <span>{s.label}</span>
            <b>{format(s.value)}</b>
            <small>{total ? `${Math.round((s.value / total) * 100)}%` : '–'}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Peta panas hari × jam (ramp satu warna). Sel kosong tetap terlihat agar pola mudah dibaca. */
export function Heatmap({
  grid,
  rows,
  label,
  cellLabel,
}: {
  grid: number[][];
  rows: string[];
  label: string;
  cellLabel: (row: number, hour: number, n: number) => string;
}) {
  const max = Math.max(0, ...grid.flat());
  const step = (n: number) =>
    n <= 0 || max === 0
      ? 0
      : Math.min(RAMP.length - 1, 1 + Math.floor((n / max) * (RAMP.length - 1.001)));
  return (
    <div className="ich-heat" role="img" aria-label={label}>
      <div className="ich-heat-grid">
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="ich-heat-hour" aria-hidden>
            {h % 3 === 0 ? h : ''}
          </span>
        ))}
        {grid.map((row, d) => (
          <div key={d} className="ich-heat-row">
            <span className="ich-heat-day">{rows[d]}</span>
            {row.map((n, h) => (
              <span
                key={h}
                className="ich-heat-cell"
                style={{ background: RAMP[step(n)] }}
                title={cellLabel(d, h, n)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="ich-heat-scale" aria-hidden>
        <span>{t('admin.ins.heatLow')}</span>
        {RAMP.map((c) => (
          <i key={c} style={{ background: c }} />
        ))}
        <span>{t('admin.ins.heatHigh')}</span>
      </div>
    </div>
  );
}

/** Tabel kohort: % anak yang masih bermain di minggu ke-w (ramp satu warna; angka selalu tertulis). */
export function CohortTable({
  cohorts,
  label,
  weekLabel,
}: {
  cohorts: { week: string; size: number; active: number[] }[];
  label: string;
  weekLabel: (week: string) => string;
}) {
  const cols = Math.max(1, ...cohorts.map((c) => c.active.length));
  return (
    <div className="ich-cohort">
      <table aria-label={label}>
        <thead>
          <tr>
            <th>{t('admin.ins.cohortWeek')}</th>
            <th>{t('admin.ins.cohortSize')}</th>
            {Array.from({ length: cols }, (_, w) => (
              <th key={w}>{t('admin.ins.cohortW', { n: w })}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.week}>
              <th>{weekLabel(c.week)}</th>
              <td>{plain(c.size)}</td>
              {Array.from({ length: cols }, (_, w) => {
                if (w >= c.active.length) return <td key={w} className="is-future" />;
                const pct = c.size ? Math.round(((c.active[w] ?? 0) / c.size) * 100) : 0;
                const step = pct === 0 ? 0 : Math.min(RAMP.length - 1, 1 + Math.floor(pct / 21));
                return (
                  <td
                    key={w}
                    style={{
                      background: RAMP[step],
                      color: step >= 4 ? 'var(--viz-seq-on)' : undefined,
                    }}
                    title={`${c.active[w] ?? 0} / ${c.size}`}
                  >
                    {pct}%
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Corong: lebar = dibanding langkah pertama; teks menyebut % yang lanjut dari langkah sebelumnya. */
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const first = Math.max(1, steps[0]?.value ?? 0);
  return (
    <ol className="ich-funnel">
      {steps.map((s, i) => {
        const prev = i > 0 ? (steps[i - 1]?.value ?? 0) : null;
        const conv = prev ? Math.round((s.value / prev) * 100) : null;
        return (
          <li key={s.label}>
            <div className="ich-funnel-head">
              <span>{s.label}</span>
              <b>{plain(s.value)}</b>
              {conv !== null && <small>{t('admin.ins.funnelConv', { pct: conv })}</small>}
            </div>
            <span className="ich-funnel-track" aria-hidden>
              <span style={{ width: `${Math.max(s.value ? 2 : 0, (s.value / first) * 100)}%` }} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Tab kecil untuk mengganti metrik satu grafik (hindari grafik dua sumbu). */
export function MetricTabs<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
  label: string;
}) {
  return (
    <div className="ich-tabs" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={`ins-chip${o.key === value ? ' is-on' : ''}`}
          aria-pressed={o.key === value}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Area bertumpuk (bagian-dari-total sepanjang waktu), mis. komisi + bonus per bulan. Satu sumbu; garis tepi 2px
 * di atas tiap lapisan; garis bidik & tooltip saat disorot.
 */
export function AreaChart({
  series,
  label,
  tick,
  title,
  height = 280,
  format = plain,
  axisFormat = compact,
}: {
  series: Series[];
  label: string;
  tick: (i: number) => string;
  title?: (i: number) => string;
  height?: number;
  format?: (n: number) => string;
  axisFormat?: (n: number) => string;
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const n = series[0]?.values.length ?? 0;
  const totals = Array.from({ length: n }, (_, i) =>
    series.reduce((a, s) => a + (s.values[i] ?? 0), 0),
  );
  const ticks = niceTicks(Math.max(0, ...totals));
  const top = ticks[ticks.length - 1] ?? 1;
  const empty = totals.every((v) => v <= 0);
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const name = title ?? tick;
  // Batas atas kumulatif per lapisan.
  const layers = series.map((_, k) =>
    Array.from({ length: n }, (_, i) =>
      series.slice(0, k + 1).reduce((a, s) => a + (s.values[i] ?? 0), 0),
    ),
  );
  const onMove = (e: MouseEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - box.left) / Math.max(1, box.width);
    setHover(Math.min(n - 1, Math.max(0, Math.round(rel * (n - 1)))));
  };
  return (
    <div className="ich" ref={ref}>
      {series.length > 1 && <Legend items={series} />}
      <div className="ich-plot">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          onMouseLeave={() => setHover(null)}
        >
          <YAxis ticks={empty ? [0] : ticks} y={y} width={width} format={axisFormat} />
          {!empty &&
            series.map((s, k) => {
              const upper = layers[k]!;
              const lower = k === 0 ? upper.map(() => 0) : layers[k - 1]!;
              const topPts = upper.map((v, i) => `${x(i)},${y(v)}`);
              const botPts = lower.map((v, i) => `${x(i)},${y(v)}`).reverse();
              return (
                <g key={s.key}>
                  <polygon
                    points={[...topPts, ...botPts].join(' ')}
                    style={{ fill: s.color }}
                    opacity={0.22}
                  />
                  <polyline
                    points={topPts.join(' ')}
                    className="ich-line"
                    style={{ stroke: s.color }}
                  />
                </g>
              );
            })}
          {hover !== null && !empty && (
            <line
              className="ich-cross"
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + plotH}
            />
          )}
          {!empty &&
            series.map((s, k) => {
              const i = hover ?? n - 1;
              return (
                <circle
                  key={s.key}
                  className="ich-dot"
                  cx={x(i)}
                  cy={y(layers[k]![i] ?? 0)}
                  r={4.5}
                  style={{ fill: s.color }}
                />
              );
            })}
          <XLabels n={n} x={x} height={height} every={autoEvery(n, plotW)} tick={tick} />
          <rect
            className="ich-hit"
            x={PAD.left}
            y={PAD.top}
            width={Math.max(1, plotW)}
            height={plotH}
            onMouseMove={onMove}
          />
        </svg>
        {empty && <p className="ich-empty">{t('admin.ins.chartEmpty')}</p>}
        {hover !== null && !empty && (
          <Tooltip
            x={x(hover)}
            width={width}
            title={name(hover)}
            rows={[
              ...series.map((s) => ({
                color: s.color,
                label: s.label,
                value: format(s.values[hover] ?? 0),
              })),
              { label: t('admin.ins.total'), value: format(totals[hover] ?? 0) },
            ]}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Gauge setengah lingkaran untuk satu rasio (0–100%+). Zona ditulis sebagai teks di bawahnya, bukan hanya warna.
 */
export function Gauge({
  value,
  label,
  caption,
  max = 100,
  color = SERIES.blue,
}: {
  value: number | null;
  label: string;
  caption: string;
  max?: number;
  color?: string;
}) {
  const w = 240;
  const r = 96;
  const cx = w / 2;
  const cy = 112;
  const frac = value === null ? 0 : Math.max(0, Math.min(1, value / max));
  const arc = (f: number) => {
    const a = Math.PI * (1 - f);
    return `${cx + r * Math.cos(a)},${cy - r * Math.sin(a)}`;
  };
  const path = (f: number) => `M${arc(0)} A${r},${r} 0 0 1 ${arc(f)}`;
  return (
    <div className="ich-gauge">
      <svg width={w} height={140} viewBox={`0 0 ${w} 140`} role="img" aria-label={label}>
        <path d={path(1)} className="ich-gauge-track" />
        {frac > 0 && <path d={path(frac)} className="ich-gauge-fill" style={{ stroke: color }} />}
        <text x={cx} y={cy - 18} textAnchor="middle" className="ich-gauge-value">
          {value === null ? '–' : `${value}%`}
        </text>
        <text x={cx - r} y={cy + 24} textAnchor="middle" className="ich-axis-t">
          0%
        </text>
        <text x={cx + r} y={cy + 24} textAnchor="middle" className="ich-axis-t">
          {max}%
        </text>
      </svg>
      <p>{caption}</p>
    </div>
  );
}

type TreeItem = { label: string; value: number; sub?: string };
type TreeRect = TreeItem & { x: number; y: number; w: number; h: number; i: number };

/** Treemap sederhana (bagi dua menurut jumlah, potong di sisi terpanjang). */
export function layoutTreemap(items: TreeItem[], w: number, h: number): TreeRect[] {
  const out: TreeRect[] = [];
  const go = (list: (TreeItem & { i: number })[], x: number, y: number, ww: number, hh: number) => {
    if (list.length === 0) return;
    if (list.length === 1) {
      out.push({ ...list[0]!, x, y, w: ww, h: hh });
      return;
    }
    const total = list.reduce((a, it) => a + it.value, 0);
    let acc = 0;
    let cut = 1;
    for (let k = 0; k < list.length - 1; k++) {
      acc += list[k]!.value;
      cut = k + 1;
      if (acc >= total / 2) break;
    }
    const a = list.slice(0, cut);
    const b = list.slice(cut);
    const share = total ? a.reduce((s, it) => s + it.value, 0) / total : 0.5;
    if (ww >= hh) {
      go(a, x, y, ww * share, hh);
      go(b, x + ww * share, y, ww * (1 - share), hh);
    } else {
      go(a, x, y, ww, hh * share);
      go(b, x, y + hh * share, ww, hh * (1 - share));
    }
  };
  go(
    items
      .map((it, i) => ({ ...it, i }))
      .filter((it) => it.value > 0)
      .sort((p, q) => q.value - p.value),
    0,
    0,
    w,
    h,
  );
  return out;
}

/** Treemap porsi (mis. komisi per afiliator). Label hanya di kotak yang muat; sisanya lewat tooltip/tabel. */
export function Treemap({
  items,
  label,
  format = plain,
  height = 260,
}: {
  items: TreeItem[];
  label: string;
  format?: (n: number) => string;
  height?: number;
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const rects = layoutTreemap(items, width, height);
  const total = items.reduce((a, it) => a + it.value, 0);
  const palette = [SERIES.blue, SERIES.orange, SERIES.aqua, SERIES.yellow];
  const inks = ['var(--viz-on-1)', 'var(--viz-on-2)', 'var(--viz-on-3)', 'var(--viz-on-4)'];
  const hovered = rects.find((r) => r.i === hover);
  return (
    <div className="ich" ref={ref}>
      <div className="ich-plot">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          onMouseLeave={() => setHover(null)}
        >
          {rects.map((r) => {
            const shown = r.label.length > 22 ? 22 : r.label.length;
            const valueText = `${format(r.value)} · ${total ? Math.round((r.value / total) * 100) : 0}%`;
            // Perkiraan lebar teks (≈7px/huruf) — label hanya bila muat; selebihnya lewat tooltip & tabel.
            const fits = r.w > Math.max(shown * 7.5, valueText.length * 7) + 20 && r.h > 44;
            // Hingga 4 warna kategori berurutan; sisanya abu "lainnya" (bukan warna baru).
            const fill = r.i < palette.length ? palette[r.i]! : SERIES.muted;
            const ink = r.i < inks.length ? inks[r.i]! : 'var(--viz-on-muted)';
            return (
              <g key={r.i} onMouseEnter={() => setHover(r.i)}>
                <rect
                  x={r.x + 1}
                  y={r.y + 1}
                  width={Math.max(0, r.w - 2)}
                  height={Math.max(0, r.h - 2)}
                  rx={6}
                  style={{ fill: fill }}
                  opacity={hover === null || hover === r.i ? 1 : 0.55}
                />
                {fits && (
                  <text x={r.x + 10} y={r.y + 22} className="ich-tree-label" style={{ fill: ink }}>
                    <tspan>{r.label.length > 22 ? `${r.label.slice(0, 21)}…` : r.label}</tspan>
                    <tspan x={r.x + 10} dy={18} className="ich-tree-value">
                      {valueText}
                    </tspan>
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {rects.length === 0 && <p className="ich-empty is-full">{t('admin.ins.chartEmpty')}</p>}
        {hovered && (
          <Tooltip
            x={hovered.x + hovered.w / 2}
            width={width}
            title={hovered.label}
            rows={[
              { label: t('admin.ins.total'), value: format(hovered.value) },
              ...(hovered.sub ? [{ label: '', value: hovered.sub }] : []),
            ]}
          />
        )}
      </div>
    </div>
  );
}

export type SankeyNode = { id: string; label: string; color: string; column: number };
export type SankeyLink = { from: string; to: string; value: number };

/**
 * Diagram alir (Sankey) 3 kolom: tinggi simpul = nilai; pita = aliran uang. Dipakai untuk pemasukan →
 * pengeluaran / laba bersih → komisi tiap owner / sisa perusahaan.
 */
export function Sankey({
  nodes,
  links,
  label,
  format = plain,
  height = 320,
}: {
  nodes: SankeyNode[];
  links: SankeyLink[];
  label: string;
  format?: (n: number) => string;
  height?: number;
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<string | null>(null);
  const live = links.filter((l) => l.value > 0);
  const value = (id: string) =>
    Math.max(
      live.filter((l) => l.from === id).reduce((a, l) => a + l.value, 0),
      live.filter((l) => l.to === id).reduce((a, l) => a + l.value, 0),
    );
  const cols = Math.max(1, ...nodes.map((n) => n.column)) + 1;
  const nodeW = 14;
  const gap = 18;
  const labelW = Math.min(170, width / 4);
  const usableW = width - labelW - 8;
  const colX = (c: number) => (cols === 1 ? 0 : (usableW - nodeW) * (c / (cols - 1)));
  const scaleBase = Math.max(
    1,
    ...Array.from({ length: cols }, (_, c) =>
      nodes.filter((n) => n.column === c).reduce((a, n) => a + value(n.id), 0),
    ),
  );
  const maxCount = Math.max(
    ...Array.from(
      { length: cols },
      (_, c) => nodes.filter((n) => n.column === c && value(n.id) > 0).length,
    ),
  );
  const k = (height - gap * Math.max(0, maxCount - 1)) / scaleBase;
  const pos = new Map<string, { x: number; y: number; h: number; outY: number; inY: number }>();
  for (let c = 0; c < cols; c++) {
    let y = 0;
    for (const n of nodes.filter((m) => m.column === c && value(m.id) > 0)) {
      const h = Math.max(2, value(n.id) * k);
      pos.set(n.id, { x: colX(c), y, h, outY: y, inY: y });
      y += h + gap;
    }
  }
  const ribbons = live.flatMap((l) => {
    const a = pos.get(l.from);
    const b = pos.get(l.to);
    if (!a || !b) return [];
    const h = l.value * k;
    const y0 = a.outY;
    const y1 = b.inY;
    a.outY += h;
    b.inY += h;
    const x0 = a.x + nodeW;
    const x1 = b.x;
    const mx = (x0 + x1) / 2;
    return [
      {
        l,
        d: `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1} L${x1},${y1 + h} C${mx},${y1 + h} ${mx},${y0 + h} ${x0},${y0 + h} Z`,
      },
    ];
  });
  const colorOf = (id: string) => nodes.find((n) => n.id === id)?.color ?? SERIES.muted;
  const empty = live.length === 0;
  return (
    <div className="ich" ref={ref}>
      <div className="ich-plot">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          onMouseLeave={() => setHover(null)}
        >
          {ribbons.map(({ l, d }) => {
            const id = `${l.from}>${l.to}`;
            return (
              <path
                key={id}
                d={d}
                style={{ fill: colorOf(l.to) }}
                opacity={hover === null ? 0.28 : hover === id ? 0.55 : 0.12}
                onMouseEnter={() => setHover(id)}
              >
                <title>{`${nodes.find((n) => n.id === l.from)?.label} → ${nodes.find((n) => n.id === l.to)?.label}: ${format(l.value)}`}</title>
              </path>
            );
          })}
          {nodes.map((n) => {
            const p = pos.get(n.id);
            if (!p) return null;
            return (
              <g key={n.id}>
                <rect x={p.x} y={p.y} width={nodeW} height={p.h} rx={3} style={{ fill: n.color }} />
                <text
                  x={p.x + nodeW + 8}
                  y={p.y + p.h / 2}
                  dy="-0.2em"
                  className="ich-sankey-label"
                >
                  {n.label}
                </text>
                <text
                  x={p.x + nodeW + 8}
                  y={p.y + p.h / 2}
                  dy="1.05em"
                  className="ich-sankey-value"
                >
                  {format(value(n.id))}
                </text>
              </g>
            );
          })}
        </svg>
        {empty && <p className="ich-empty is-full">{t('admin.ins.chartEmpty')}</p>}
      </div>
    </div>
  );
}

/**
 * Corong meruncing (trapesium) — tiap langkah selebar nilainya dibanding langkah pertama; teks menyebut jumlah
 * dan % yang lanjut dari langkah sebelumnya.
 */
export function FunnelShape({
  steps,
  label,
  height = 300,
}: {
  steps: { label: string; value: number }[];
  label: string;
  height?: number;
}) {
  const [ref, width] = useWidth();
  const first = Math.max(1, steps[0]?.value ?? 0);
  const textW = Math.min(260, width * 0.42);
  const shapeW = width - textW - 12;
  const rowH = height / Math.max(1, steps.length);
  const cx = shapeW / 2;
  const half = (v: number) => Math.max(6, (v / first) * (shapeW / 2));
  // Ramp satu warna (biru), kuat → pudar; 3 tingkat pertama memakai teks --viz-seq-on.
  const shades = [seq(100), seq(88), seq(76), seq(50), seq(36), seq(22)];
  return (
    <div className="ich" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={label}>
        {steps.map((s, i) => {
          const next = steps[i + 1]?.value ?? s.value * 0.85;
          const y0 = i * rowH + 2;
          const y1 = (i + 1) * rowH - 2;
          const a = half(s.value);
          const b = half(Math.min(s.value, next));
          const prev = i > 0 ? (steps[i - 1]?.value ?? 0) : null;
          const conv = prev ? Math.round((s.value / prev) * 100) : null;
          const fill = shades[Math.min(i, shades.length - 1)]!;
          return (
            <g key={s.label}>
              <path
                d={`M${cx - a},${y0} L${cx + a},${y0} L${cx + b},${y1} L${cx - b},${y1} Z`}
                style={{ fill: fill }}
              >
                <title>{`${s.label}: ${plain(s.value)}`}</title>
              </path>
              {a > 34 && (
                <text
                  x={cx}
                  y={(y0 + y1) / 2}
                  dy="0.35em"
                  textAnchor="middle"
                  className="ich-funnel-in"
                  style={{ fill: i < 3 ? 'var(--viz-seq-on)' : 'var(--malam)' }}
                >
                  {plain(s.value)}
                </text>
              )}
              <text x={shapeW + 12} y={(y0 + y1) / 2} dy="-0.15em" className="ich-sankey-label">
                {s.label}
              </text>
              <text x={shapeW + 12} y={(y0 + y1) / 2} dy="1.1em" className="ich-sankey-value">
                {plain(s.value)}
                {conv !== null ? ` · ${t('admin.ins.funnelConv', { pct: conv })}` : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Batang mendatar berperingkat (mis. paket terlaris): panjang = dibanding nilai terbesar, label & angka selalu
 * terbaca tanpa sorot. Satu warna karena satu metrik; urutan ditentukan pemanggil.
 */
export function BarList({
  items,
  label,
  color = SERIES.blue,
}: {
  items: { key: string; label: string; value: number; display: string; sub?: string }[];
  label: string;
  color?: string;
}) {
  const max = Math.max(1, ...items.map((x) => x.value));
  return (
    <ol className="ich-barlist" aria-label={label}>
      {items.map((x, i) => (
        <li key={x.key}>
          <span className="ich-barlist-rank" aria-hidden>
            {i + 1}
          </span>
          <div className="ich-barlist-body">
            <div className="ich-barlist-head">
              <span>{x.label}</span>
              <b>{x.display}</b>
            </div>
            <span className="ich-barlist-track" aria-hidden>
              <span
                style={{
                  width: `${Math.max(x.value ? 2 : 0, (x.value / max) * 100)}%`,
                  background: color,
                }}
              />
            </span>
            {x.sub && <small>{x.sub}</small>}
          </div>
        </li>
      ))}
    </ol>
  );
}
