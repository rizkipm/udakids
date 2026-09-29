import type { ReactNode } from 'react';
import { formatId, type Visual } from '@little-coder/engine';
import { OBJECTS } from '@little-coder/engine';
import { OBJECT_ART } from './objects';
import { FONT, OUTLINE, TOKENS } from './palette';

/** Visual untuk kelas 3+: teks, pecahan, tabel, diagram, bangun berukuran, sudut. */
export type ExtraVisual = Extract<
  Visual,
  {
    kind:
      | 'text'
      | 'fraction'
      | 'table'
      | 'bar-chart'
      | 'rect'
      | 'cuboid'
      | 'angle'
      | 'clock'
      | 'digital'
      | 'tens'
      | 'number-chart'
      | 'venn'
      | 'measure';
  }
>;
type Built = { w: number; h: number; body: ReactNode; label: string };

const SHADE = '#8a6cf0';
const SHADE_SOFT = '#e4dcff';
const LINE = { stroke: OUTLINE, strokeWidth: 3 } as const;

function T({
  x,
  y,
  size,
  children,
  anchor = 'middle',
  weight = 700,
  fill = OUTLINE,
}: {
  x: number;
  y: number;
  size: number;
  children: ReactNode;
  anchor?: 'start' | 'middle' | 'end';
  weight?: number;
  fill?: string;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={weight}
      fontFamily={FONT}
      textAnchor={anchor}
      dominantBaseline="central"
      fill={fill}
    >
      {children}
    </text>
  );
}

/** Pecah teks menjadi baris ±maxChars karakter (SVG tidak membungkus teks sendiri). */
export function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > maxChars) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

/** Kelipatan "rapi" untuk sumbu diagram. */
export function niceStep(max: number): number {
  const raw = max / 5;
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

export function buildExtra(v: ExtraVisual): Built {
  switch (v.kind) {
    case 'text': {
      const lines = wrapText(v.text, 30);
      const w = Math.max(160, Math.min(30, Math.max(...lines.map((l) => l.length))) * 17 + 48);
      const h = 36 + lines.length * 40;
      return {
        w,
        h,
        label: v.text,
        body: (
          <>
            <rect x={3} y={3} width={w - 6} height={h - 6} rx={18} fill={TOKENS.card} {...LINE} />
            {lines.map((l, i) => (
              <T key={i} x={w / 2} y={38 + i * 40} size={30}>
                {l}
              </T>
            ))}
          </>
        ),
      };
    }
    case 'fraction': {
      const label = v.hideNumber
        ? `gambar dibagi ${v.den} bagian sama besar, ${v.num} diarsir`
        : `${v.whole ? `${v.whole} ` : ''}${v.num} per ${v.den}`;
      const numText = (
        <g>
          {v.whole !== undefined && v.whole > 0 && (
            <T x={40} y={80} size={64}>
              {v.whole}
            </T>
          )}
          <T x={v.whole ? 120 : 70} y={42} size={52}>
            {v.num}
          </T>
          <line
            x1={v.whole ? 84 : 34}
            y1={80}
            x2={v.whole ? 156 : 106}
            y2={80}
            stroke={OUTLINE}
            strokeWidth={5}
            strokeLinecap="round"
          />
          <T x={v.whole ? 120 : 70} y={118} size={52}>
            {v.den}
          </T>
        </g>
      );
      const textW = v.hideNumber && v.model ? 0 : v.whole ? 170 : 140;
      if (!v.model) return { w: textW, h: 160, label, body: numText };
      const parts = Math.min(v.den, 24);
      if (v.model === 'bar') {
        const bw = 300;
        const cell = bw / parts;
        return {
          w: textW + bw + 30,
          h: 160,
          label: `${label}, gambar batang`,
          body: (
            <>
              {textW > 0 && numText}
              <g transform={`translate(${textW + 10} 50)`}>
                {Array.from({ length: parts }, (_, i) => (
                  <rect
                    key={i}
                    x={i * cell}
                    y={0}
                    width={cell}
                    height={60}
                    fill={i < v.num ? SHADE : TOKENS.paper}
                    {...LINE}
                  />
                ))}
              </g>
            </>
          ),
        };
      }
      const r = 64;
      const cx = textW + 90;
      const cy = 80;
      const slice = (i: number) => {
        const a0 = (i / parts) * 2 * Math.PI - Math.PI / 2;
        const a1 = ((i + 1) / parts) * 2 * Math.PI - Math.PI / 2;
        return `M${cx} ${cy} L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`;
      };
      return {
        w: textW + 180,
        h: 160,
        label: `${label}, gambar lingkaran`,
        body: (
          <>
            {textW > 0 && numText}
            {parts === 1 ? (
              <circle cx={cx} cy={cy} r={r} fill={v.num >= 1 ? SHADE : TOKENS.paper} {...LINE} />
            ) : (
              Array.from({ length: parts }, (_, i) => (
                <path key={i} d={slice(i)} fill={i < v.num ? SHADE : TOKENS.paper} {...LINE} />
              ))
            )}
          </>
        ),
      };
    }
    case 'table': {
      const colW = 150;
      const rowH = 48;
      const top = v.caption ? 44 : 6;
      const w = v.headers.length * colW + 12;
      const h = top + (v.rows.length + 1) * rowH + 8;
      const cell = (x: number) => 6 + x * colW;
      return {
        w,
        h,
        label: `Tabel${v.caption ? ` ${v.caption}` : ''}: ${v.headers.join(', ')}; ${v.rows.map((r) => r.map((c) => (typeof c === 'number' ? formatId(c) : c)).join(' ')).join('; ')}`,
        body: (
          <>
            {v.caption && (
              <T x={w / 2} y={22} size={24}>
                {v.caption}
              </T>
            )}
            {v.headers.map((head, x) => (
              <g key={`h${x}`}>
                <rect x={cell(x)} y={top} width={colW} height={rowH} fill={SHADE_SOFT} {...LINE} />
                <T x={cell(x) + colW / 2} y={top + rowH / 2} size={21}>
                  {head}
                </T>
              </g>
            ))}
            {v.rows.map((row, y) =>
              row.map((c, x) => (
                <g key={`${y}-${x}`}>
                  <rect
                    x={cell(x)}
                    y={top + (y + 1) * rowH}
                    width={colW}
                    height={rowH}
                    fill={TOKENS.paper}
                    {...LINE}
                  />
                  <T x={cell(x) + colW / 2} y={top + (y + 1.5) * rowH} size={22} weight={600}>
                    {typeof c === 'number' ? formatId(c) : c}
                  </T>
                </g>
              )),
            )}
          </>
        ),
      };
    }
    case 'bar-chart': {
      const n = v.labels.length;
      const barW = 64;
      const gap = 28;
      const left = 70;
      const top = v.caption ? 50 : 20;
      const plotH = 220;
      const max = Math.max(...v.values, 1);
      const step = niceStep(max);
      const axisMax = Math.ceil(max / step) * step;
      const w = left + n * (barW + gap) + 20;
      const h = top + plotH + 60;
      const y = (val: number) => top + plotH - (val / axisMax) * plotH;
      const ticks = Array.from({ length: Math.round(axisMax / step) + 1 }, (_, i) => i * step);
      const Art = v.pictogram ? OBJECT_ART[v.pictogram] : undefined;
      return {
        w,
        h,
        label: `Diagram${v.caption ? ` ${v.caption}` : ''}: ${v.labels.map((l, i) => `${l} ${formatId(v.values[i]!)}${v.unit ? ` ${v.unit}` : ''}`).join(', ')}`,
        body: (
          <>
            {v.caption && (
              <T x={w / 2} y={22} size={24}>
                {v.caption}
              </T>
            )}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={left} y1={y(t)} x2={w - 10} y2={y(t)} stroke="#d9d3ea" strokeWidth={2} />
                <T x={left - 10} y={y(t)} size={18} anchor="end" weight={600}>
                  {formatId(t)}
                </T>
              </g>
            ))}
            <line x1={left} y1={top} x2={left} y2={top + plotH} {...LINE} />
            <line x1={left} y1={top + plotH} x2={w - 10} y2={top + plotH} {...LINE} />
            {v.values.map((val, i) => {
              const x = left + gap / 2 + i * (barW + gap);
              return (
                <g key={i}>
                  {Art && Number.isInteger(val) && val <= 12 ? (
                    Array.from({ length: val }, (_, k) => {
                      const cellH = plotH / axisMax;
                      const icon = Math.min(barW, cellH);
                      return (
                        <g
                          key={k}
                          transform={`translate(${x + (barW - icon) / 2} ${top + plotH - (k + 1) * cellH + (cellH - icon) / 2}) scale(${icon / 100})`}
                        >
                          <Art />
                        </g>
                      );
                    })
                  ) : (
                    <rect
                      x={x}
                      y={y(val)}
                      width={barW}
                      height={top + plotH - y(val)}
                      fill={SHADE}
                      {...LINE}
                    />
                  )}
                  <T x={x + barW / 2} y={top + plotH + 26} size={18}>
                    {v.labels[i]}
                  </T>
                </g>
              );
            })}
            {v.unit && (
              <T x={left} y={top - 10} size={16} anchor="middle" weight={600} fill={TOKENS.muted}>
                {v.unit}
              </T>
            )}
          </>
        ),
      };
    }
    case 'rect': {
      const maxW = 300;
      const maxH = 190;
      const s = Math.min(maxW / v.w, maxH / v.h);
      const rw = Math.max(40, v.w * s);
      const rh = Math.max(30, v.h * s);
      const x0 = 30;
      const y0 = 20;
      const grid =
        v.grid && Number.isInteger(v.w) && Number.isInteger(v.h) && v.w <= 20 && v.h <= 20;
      return {
        w: rw + 130,
        h: rh + 80,
        label: `persegi panjang ${formatId(v.w)} ${v.unit} kali ${formatId(v.h)} ${v.unit}`,
        body: (
          <>
            <rect x={x0} y={y0} width={rw} height={rh} fill={SHADE_SOFT} {...LINE} />
            {grid &&
              Array.from({ length: v.w - 1 }, (_, i) => (
                <line
                  key={`x${i}`}
                  x1={x0 + ((i + 1) * rw) / v.w}
                  y1={y0}
                  x2={x0 + ((i + 1) * rw) / v.w}
                  y2={y0 + rh}
                  stroke="#b9a9f5"
                  strokeWidth={1.5}
                />
              ))}
            {grid &&
              Array.from({ length: v.h - 1 }, (_, i) => (
                <line
                  key={`y${i}`}
                  x1={x0}
                  y1={y0 + ((i + 1) * rh) / v.h}
                  x2={x0 + rw}
                  y2={y0 + ((i + 1) * rh) / v.h}
                  stroke="#b9a9f5"
                  strokeWidth={1.5}
                />
              ))}
            <T x={x0 + rw / 2} y={y0 + rh + 30} size={24}>
              {`${formatId(v.w)} ${v.unit}`}
            </T>
            <T x={x0 + rw + 12} y={y0 + rh / 2} size={24} anchor="start">
              {`${formatId(v.h)} ${v.unit}`}
            </T>
          </>
        ),
      };
    }
    case 'cuboid': {
      const s = Math.min(200 / v.p, 120 / v.t, 22);
      const pw = v.p * s;
      const th = v.t * s;
      const d = Math.min(v.l * s * 0.5, 70);
      const x0 = 30;
      const y0 = 20 + d;
      const cubes = v.cubes && [v.p, v.l, v.t].every((n) => Number.isInteger(n) && n <= 10);
      const front = `M${x0} ${y0} h${pw} v${th} h${-pw} z`;
      const top = `M${x0} ${y0} l${d} ${-d} h${pw} l${-d} ${d} z`;
      const side = `M${x0 + pw} ${y0} l${d} ${-d} v${th} l${-d} ${d} z`;
      return {
        w: x0 + pw + d + 110,
        h: y0 + th + 50,
        label: `balok panjang ${formatId(v.p)}, lebar ${formatId(v.l)}, tinggi ${formatId(v.t)} ${v.unit}`,
        body: (
          <>
            <path d={top} fill="#efeaff" {...LINE} />
            <path d={side} fill="#cfc2ff" {...LINE} />
            <path d={front} fill={SHADE_SOFT} {...LINE} />
            {cubes &&
              Array.from({ length: v.p - 1 }, (_, i) => (
                <line
                  key={`p${i}`}
                  x1={x0 + (i + 1) * s}
                  y1={y0}
                  x2={x0 + (i + 1) * s}
                  y2={y0 + th}
                  stroke="#9f8cf0"
                  strokeWidth={1.5}
                />
              ))}
            {cubes &&
              Array.from({ length: v.t - 1 }, (_, i) => (
                <line
                  key={`t${i}`}
                  x1={x0}
                  y1={y0 + (i + 1) * s}
                  x2={x0 + pw}
                  y2={y0 + (i + 1) * s}
                  stroke="#9f8cf0"
                  strokeWidth={1.5}
                />
              ))}
            <T x={x0 + pw / 2} y={y0 + th + 26} size={22}>
              {`p = ${formatId(v.p)} ${v.unit}`}
            </T>
            <T x={x0 + pw + d + 8} y={y0 + th / 2 - d / 2} size={22} anchor="start">
              {`t = ${formatId(v.t)} ${v.unit}`}
            </T>
            <T x={x0 + pw + d / 2 + 8} y={y0 - d / 2 - 14} size={22} anchor="start">
              {`l = ${formatId(v.l)} ${v.unit}`}
            </T>
          </>
        ),
      };
    }
    case 'angle': {
      const cx = 160;
      const cy = 170;
      const r = 130;
      const rad = (v.degrees * Math.PI) / 180;
      const ex = cx + r * Math.cos(rad);
      const ey = cy - r * Math.sin(rad);
      const ar = 40;
      const large = v.degrees > 180 ? 1 : 0;
      const arc = `M${cx + ar} ${cy} A${ar} ${ar} 0 ${large} 0 ${cx + ar * Math.cos(rad)} ${cy - ar * Math.sin(rad)}`;
      return {
        w: 330,
        h: v.degrees > 180 ? 330 : 200,
        label: v.showValue ? `sudut ${formatId(v.degrees)} derajat` : 'sebuah sudut',
        body: (
          <>
            {v.protractor && (
              <g>
                <path
                  d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z`}
                  fill="#fff6d6"
                  stroke={TOKENS.muted}
                  strokeWidth={2}
                />
                {Array.from({ length: 19 }, (_, i) => {
                  const a = (i * 10 * Math.PI) / 180;
                  const inner = i % 9 === 0 ? r - 18 : i % 3 === 0 ? r - 14 : r - 8;
                  return (
                    <g key={i}>
                      <line
                        x1={cx + inner * Math.cos(a)}
                        y1={cy - inner * Math.sin(a)}
                        x2={cx + r * Math.cos(a)}
                        y2={cy - r * Math.sin(a)}
                        stroke={TOKENS.muted}
                        strokeWidth={2}
                      />
                      {i % 3 === 0 && (
                        <T
                          x={cx + (r - 30) * Math.cos(a)}
                          y={cy - (r - 30) * Math.sin(a)}
                          size={13}
                          weight={600}
                          fill={TOKENS.muted}
                        >
                          {i * 10}
                        </T>
                      )}
                    </g>
                  );
                })}
              </g>
            )}
            <path d={arc} fill="none" stroke={SHADE} strokeWidth={4} />
            <line
              x1={cx}
              y1={cy}
              x2={cx + r}
              y2={cy}
              stroke={OUTLINE}
              strokeWidth={5}
              strokeLinecap="round"
            />
            <line
              x1={cx}
              y1={cy}
              x2={ex}
              y2={ey}
              stroke={OUTLINE}
              strokeWidth={5}
              strokeLinecap="round"
            />
            <circle cx={cx} cy={cy} r={6} fill={OUTLINE} />
            {v.showValue && (
              <T x={cx + 70 * Math.cos(rad / 2)} y={cy - 70 * Math.sin(rad / 2)} size={24}>
                {`${formatId(v.degrees)}°`}
              </T>
            )}
          </>
        ),
      };
    }
    case 'clock': {
      const cx = 100;
      const cy = 100;
      const minuteA = (v.minute / 60) * 2 * Math.PI;
      const hourA = (((v.hour % 12) + v.minute / 60) / 12) * 2 * Math.PI;
      const hand = (a: number, len: number) => ({
        x2: cx + len * Math.sin(a),
        y2: cy - len * Math.cos(a),
      });
      return {
        w: 200,
        h: 200,
        label: `jam analog pukul ${v.hour} lewat ${v.minute} menit`,
        body: (
          <>
            <circle cx={cx} cy={cy} r={92} fill={TOKENS.paper} {...LINE} strokeWidth={5} />
            {Array.from({ length: 12 }, (_, i) => {
              const a = ((i + 1) / 12) * 2 * Math.PI;
              return (
                <T key={i} x={cx + 72 * Math.sin(a)} y={cy - 72 * Math.cos(a)} size={20}>
                  {i + 1}
                </T>
              );
            })}
            {Array.from({ length: 60 }, (_, i) => {
              const a = (i / 60) * 2 * Math.PI;
              const r1 = i % 5 === 0 ? 82 : 86;
              return (
                <line
                  key={`m${i}`}
                  x1={cx + r1 * Math.sin(a)}
                  y1={cy - r1 * Math.cos(a)}
                  x2={cx + 90 * Math.sin(a)}
                  y2={cy - 90 * Math.cos(a)}
                  stroke={TOKENS.muted}
                  strokeWidth={i % 5 === 0 ? 3 : 1.5}
                />
              );
            })}
            <line
              x1={cx}
              y1={cy}
              {...hand(hourA, 45)}
              stroke={OUTLINE}
              strokeWidth={9}
              strokeLinecap="round"
            />
            <line
              x1={cx}
              y1={cy}
              {...hand(minuteA, 70)}
              stroke={SHADE}
              strokeWidth={6}
              strokeLinecap="round"
            />
            <circle cx={cx} cy={cy} r={7} fill={OUTLINE} />
          </>
        ),
      };
    }
    case 'digital': {
      const text = `${String(v.hour).padStart(2, '0')}.${String(v.minute).padStart(2, '0')}`;
      return {
        w: 200,
        h: 100,
        label: `jam digital ${text}`,
        body: (
          <>
            <rect x={4} y={4} width={192} height={92} rx={18} fill="#1d1a2e" />
            <T x={100} y={52} size={48} fill="#7CFFB2">
              {text}
            </T>
          </>
        ),
      };
    }
    case 'tens': {
      const rodW = 22;
      const unit = 18;
      const rods = Array.from({ length: v.tens }, (_, i) => (
        <g key={`r${i}`} transform={`translate(${10 + i * (rodW + 8)} 10)`}>
          {Array.from({ length: 10 }, (_, k) => (
            <rect
              key={k}
              x={0}
              y={k * unit}
              width={rodW}
              height={unit}
              fill="#4f8ff7"
              stroke={OUTLINE}
              strokeWidth={2}
            />
          ))}
        </g>
      ));
      const ox = 20 + v.tens * (rodW + 8);
      const ones = Array.from({ length: v.ones }, (_, i) => (
        <rect
          key={`o${i}`}
          x={ox + (i % 5) * (unit + 4)}
          y={10 + 10 * unit - (Math.floor(i / 5) + 1) * (unit + 4)}
          width={unit}
          height={unit}
          fill="#f7c948"
          stroke={OUTLINE}
          strokeWidth={2}
        />
      ));
      return {
        w: Math.max(120, ox + 5 * (unit + 4) + 10),
        h: 10 * unit + 20,
        label: `${v.tens} puluhan dan ${v.ones} satuan`,
        body: (
          <>
            {rods}
            {ones}
          </>
        ),
      };
    }
    case 'number-chart': {
      const cell = 46;
      const nums = Array.from({ length: v.end - v.start + 1 }, (_, i) => v.start + i);
      const rows = Math.ceil(nums.length / v.columns);
      const blanks = new Set(v.blanks ?? []);
      const hi = new Set(v.highlight ?? []);
      return {
        w: v.columns * cell + 8,
        h: rows * cell + 8,
        label: `papan bilangan ${v.start} sampai ${v.end}${blanks.size ? `, ${blanks.size} kotak kosong` : ''}`,
        body: (
          <>
            {nums.map((n, i) => {
              const x = 4 + (i % v.columns) * cell;
              const y = 4 + Math.floor(i / v.columns) * cell;
              return (
                <g key={n}>
                  <rect
                    x={x}
                    y={y}
                    width={cell}
                    height={cell}
                    fill={blanks.has(n) ? '#fff6d6' : hi.has(n) ? SHADE_SOFT : TOKENS.paper}
                    stroke={OUTLINE}
                    strokeWidth={2}
                  />
                  <T x={x + cell / 2} y={y + cell / 2} size={18}>
                    {blanks.has(n) ? '?' : n}
                  </T>
                </g>
              );
            })}
          </>
        ),
      };
    }
    case 'venn': {
      const Art = OBJECT_ART[v.object];
      const dots = (n: number, cx: number, cy: number) =>
        Array.from({ length: n }, (_, i) => (
          <g
            key={i}
            transform={`translate(${cx - 40 + (i % 3) * 28} ${cy - 30 + Math.floor(i / 3) * 28}) scale(0.26)`}
          >
            <Art />
          </g>
        ));
      return {
        w: 340,
        h: 220,
        label: `diagram Venn: ${v.a} saja ${v.onlyA}, ${v.b} saja ${v.onlyB}, keduanya ${v.both} ${OBJECTS[v.object].say}`,
        body: (
          <>
            <circle cx={130} cy={120} r={90} fill="rgba(138,108,240,0.18)" {...LINE} />
            <circle cx={210} cy={120} r={90} fill="rgba(247,201,72,0.25)" {...LINE} />
            <T x={90} y={20} size={18}>
              {v.a}
            </T>
            <T x={250} y={20} size={18}>
              {v.b}
            </T>
            {dots(v.onlyA, 95, 120)}
            {dots(v.both, 175, 120)}
            {dots(v.onlyB, 255, 120)}
          </>
        ),
      };
    }
    case 'measure': {
      const Art = OBJECT_ART[v.object];
      const u = 30;
      const horizontal = v.direction === 'horizontal';
      const cubes = Array.from({ length: v.length }, (_, i) =>
        horizontal ? (
          <rect
            key={i}
            x={10 + i * u}
            y={112}
            width={u}
            height={u}
            fill="#f79a4a"
            stroke={OUTLINE}
            strokeWidth={2}
          />
        ) : (
          <rect
            key={i}
            x={20}
            y={10 + (v.length - 1 - i) * u}
            width={u}
            height={u}
            fill="#f79a4a"
            stroke={OUTLINE}
            strokeWidth={2}
          />
        ),
      );
      return horizontal
        ? {
            w: 20 + v.length * u,
            h: 150,
            label: `${OBJECTS[v.object].say} diukur dengan kubus`,
            body: (
              <>
                <g transform={`translate(10 6) scale(${(v.length * u) / 100} 1)`}>
                  <Art />
                </g>
                {v.showCubes && cubes}
              </>
            ),
          }
        : {
            w: 170,
            h: 20 + v.length * u,
            label: `${OBJECTS[v.object].say} diukur dengan kubus`,
            body: (
              <>
                <g transform={`translate(62 10) scale(1 ${(v.length * u) / 100})`}>
                  <Art />
                </g>
                {v.showCubes && cubes}
              </>
            ),
          };
    }
  }
}
