import type { ReactNode } from 'react';
import { formatId, type FigurePoint, type FigureShape, type Visual } from '@little-coder/engine';
import { FONT, OUTLINE, TOKENS } from './palette';

type Figure = Extract<Visual, { kind: 'figure' }>;
type Built = { w: number; h: number; body: ReactNode; label: string };

/** Arsiran abu-abu gaya lembar lomba dan warna lembut untuk bangun kedua. */
const SHADE = '#a9a9b3';
const SOFT = '#e4dcff';
const AXIS = '#5c5f73';
const GRID = '#d9dbe6';
const PAD = 34;

const fmt = (n: number) => formatId(n).replace('-', '−');
const coordText = ([x, y]: FigurePoint) => `(${fmt(x)}, ${fmt(y)})`;

function bounds(v: Figure) {
  const xs: number[] = [];
  const ys: number[] = [];
  const add = ([x, y]: FigurePoint) => {
    xs.push(x);
    ys.push(y);
  };
  if (v.axes) {
    add([v.axes.xMin, v.axes.yMin]);
    add([v.axes.xMax, v.axes.yMax]);
  }
  for (const s of v.shapes) {
    if (s.t === 'poly') s.pts.forEach(add);
    else if (s.t === 'seg') [s.a, s.b].forEach(add);
    else if (s.t === 'point' || s.t === 'label') add(s.at);
    else if (s.t === 'right') add(s.at);
    else {
      add([s.c[0] - s.r, s.c[1] - s.r]);
      add([s.c[0] + s.r, s.c[1] + s.r]);
    }
  }
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  return { x0, x1: x1 === x0 ? x0 + 1 : x1, y0, y1: y1 === y0 ? y0 + 1 : y1 };
}

const OFFSET: Record<NonNullable<Extract<FigureShape, { t: 'point' }>['pos']>, [number, number]> = {
  n: [0, -1],
  s: [0, 1],
  e: [1, 0],
  w: [-1, 0],
  ne: [0.8, -0.8],
  nw: [-0.8, -0.8],
  se: [0.8, 0.8],
  sw: [-0.8, 0.8],
};

function Txt({
  x,
  y,
  children,
  size = 22,
  anchor = 'middle',
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  anchor?: 'start' | 'middle' | 'end';
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={700}
      fontFamily={FONT}
      textAnchor={anchor}
      dominantBaseline="central"
      fill={OUTLINE}
      stroke={TOKENS.card}
      strokeWidth={5}
      paintOrder="stroke"
    >
      {children}
    </text>
  );
}

/** Kalimat aria untuk gambar geometri (dibaca pembaca layar; juga teks alternatif). */
function describe(v: Figure): string {
  const parts: string[] = [v.axes ? 'bidang koordinat' : 'gambar bangun'];
  for (const s of v.shapes) {
    if (s.t === 'point' && (s.name || s.coord))
      parts.push(`titik ${s.name ?? ''}${s.coord ? ` ${coordText(s.at)}` : ''}`.trim());
    else if (s.t === 'poly' && s.fill === 'shade') parts.push('daerah diarsir');
    else if (s.t === 'seg' && s.text) parts.push(`ruas ${s.text}`);
    else if (s.t === 'label') parts.push(s.text);
  }
  if (v.caption) parts.push(v.caption);
  return parts.join(', ');
}

export function buildFigure(v: Figure): Built {
  const b = bounds(v);
  const spanX = b.x1 - b.x0;
  const spanY = b.y1 - b.y0;
  // Satu satuan = s piksel; gambar muat ±380 × 300, petak koordinat minimal 18 px agar mudah dihitung.
  const s = Math.max(v.axes ? 18 : 6, Math.min(380 / spanX, 300 / spanY, 64));
  const w = spanX * s + PAD * 2;
  const capH = v.caption ? 34 : 0;
  const h = spanY * s + PAD * 2 + capH;
  const X = (x: number) => PAD + (x - b.x0) * s;
  const Y = (y: number) => PAD + (b.y1 - y) * s;
  const P = ([x, y]: FigurePoint) => `${X(x)},${Y(y)}`;
  const nodes: ReactNode[] = [];

  if (v.axes || v.grid) {
    const ax = v.axes ?? {
      xMin: Math.floor(b.x0),
      xMax: Math.ceil(b.x1),
      yMin: Math.floor(b.y0),
      yMax: Math.ceil(b.y1),
    };
    for (let x = Math.ceil(ax.xMin); x <= ax.xMax; x++)
      nodes.push(
        <line key={`gx${x}`} x1={X(x)} y1={Y(ax.yMin)} x2={X(x)} y2={Y(ax.yMax)} stroke={GRID} />,
      );
    for (let y = Math.ceil(ax.yMin); y <= ax.yMax; y++)
      nodes.push(
        <line key={`gy${y}`} x1={X(ax.xMin)} y1={Y(y)} x2={X(ax.xMax)} y2={Y(y)} stroke={GRID} />,
      );
  }
  if (v.axes) {
    const a = v.axes;
    const arrow = (x1: number, y1: number, x2: number, y2: number, key: string) => (
      <line
        key={key}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={AXIS}
        strokeWidth={2.5}
        markerEnd="url(#fig-arrow)"
      />
    );
    if (a.yMin <= 0 && a.yMax >= 0) {
      nodes.push(arrow(X(a.xMin), Y(0), X(a.xMax) + 14, Y(0), 'ax'));
      nodes.push(
        <Txt key="axl" x={X(a.xMax) + 20} y={Y(0) - 14} size={18}>
          x
        </Txt>,
      );
    }
    if (a.xMin <= 0 && a.xMax >= 0) {
      nodes.push(arrow(X(0), Y(a.yMin), X(0), Y(a.yMax) - 14, 'ay'));
      nodes.push(
        <Txt key="ayl" x={X(0) + 14} y={Y(a.yMax) - 20} size={18}>
          y
        </Txt>,
      );
    }
    // Angka sumbu: setiap petak bila rapat sedikit, tiap 2 bila lebar.
    const every = a.xMax - a.xMin > 16 || a.yMax - a.yMin > 16 ? 2 : 1;
    const y0 = a.yMin <= 0 && a.yMax >= 0 ? 0 : a.yMin;
    const x0 = a.xMin <= 0 && a.xMax >= 0 ? 0 : a.xMin;
    for (let x = Math.ceil(a.xMin); x <= a.xMax; x++)
      if (x !== 0 && x % every === 0)
        nodes.push(
          <Txt key={`nx${x}`} x={X(x)} y={Y(y0) + 14} size={14}>
            {fmt(x)}
          </Txt>,
        );
    for (let y = Math.ceil(a.yMin); y <= a.yMax; y++)
      if (y !== 0 && y % every === 0)
        nodes.push(
          <Txt key={`ny${y}`} x={X(x0) - 12} y={Y(y)} size={14}>
            {fmt(y)}
          </Txt>,
        );
    if (a.xMin <= 0 && a.xMax >= 0 && a.yMin <= 0 && a.yMax >= 0)
      nodes.push(
        <Txt key="o" x={X(0) - 11} y={Y(0) + 13} size={14}>
          0
        </Txt>,
      );
  }

  const labels: ReactNode[] = [];
  v.shapes.forEach((sh, i) => {
    const key = `s${i}`;
    switch (sh.t) {
      case 'poly': {
        const pts = sh.pts.map(P).join(' ');
        const props = {
          points: pts,
          fill: sh.open ? 'none' : sh.fill === 'shade' ? SHADE : sh.fill === 'soft' ? SOFT : 'none',
          fillOpacity: sh.fill === 'shade' ? 0.75 : 1,
          stroke: OUTLINE,
          strokeWidth: 3,
          strokeLinejoin: 'round' as const,
          ...(sh.dashed && { strokeDasharray: '8 6' }),
        };
        nodes.push(sh.open ? <polyline key={key} {...props} /> : <polygon key={key} {...props} />);
        break;
      }
      case 'seg': {
        nodes.push(
          <line
            key={key}
            x1={X(sh.a[0])}
            y1={Y(sh.a[1])}
            x2={X(sh.b[0])}
            y2={Y(sh.b[1])}
            stroke={OUTLINE}
            strokeWidth={3}
            strokeLinecap="round"
            {...(sh.dashed && { strokeDasharray: '8 6' })}
          />,
        );
        const mx = (X(sh.a[0]) + X(sh.b[0])) / 2;
        const my = (Y(sh.a[1]) + Y(sh.b[1])) / 2;
        const dx = X(sh.b[0]) - X(sh.a[0]);
        const dy = Y(sh.b[1]) - Y(sh.a[1]);
        const len = Math.hypot(dx, dy) || 1;
        // Normal satuan: label di samping garis, tanda sama panjang memotong garis.
        const nx = -dy / len;
        const ny = dx / len;
        if (sh.ticks)
          for (let k = 0; k < sh.ticks; k++) {
            const off = (k - (sh.ticks - 1) / 2) * 7;
            const cx = mx + (dx / len) * off;
            const cy = my + (dy / len) * off;
            nodes.push(
              <line
                key={`${key}t${k}`}
                x1={cx + nx * 8}
                y1={cy + ny * 8}
                x2={cx - nx * 8}
                y2={cy - ny * 8}
                stroke={OUTLINE}
                strokeWidth={2.5}
              />,
            );
          }
        if (sh.text)
          labels.push(
            <Txt key={`${key}l`} x={mx + nx * 20} y={my + ny * 20} size={20}>
              {sh.text}
            </Txt>,
          );
        break;
      }
      case 'circle':
        nodes.push(
          <circle
            key={key}
            cx={X(sh.c[0])}
            cy={Y(sh.c[1])}
            r={sh.r * s}
            fill={sh.fill === 'shade' ? SHADE : sh.fill === 'soft' ? SOFT : 'none'}
            stroke={OUTLINE}
            strokeWidth={3}
          />,
        );
        if (sh.center)
          nodes.push(
            <circle key={`${key}c`} cx={X(sh.c[0])} cy={Y(sh.c[1])} r={4} fill={OUTLINE} />,
          );
        break;
      case 'right': {
        const at = [X(sh.at[0]), Y(sh.at[1])] as const;
        const unit = (p: FigurePoint) => {
          const dx = X(p[0]) - at[0];
          const dy = Y(p[1]) - at[1];
          const l = Math.hypot(dx, dy) || 1;
          return [(dx / l) * 14, (dy / l) * 14] as const;
        };
        const [ax, ay] = unit(sh.a);
        const [bx, by] = unit(sh.b);
        nodes.push(
          <polyline
            key={key}
            points={`${at[0] + ax},${at[1] + ay} ${at[0] + ax + bx},${at[1] + ay + by} ${at[0] + bx},${at[1] + by}`}
            fill="none"
            stroke={OUTLINE}
            strokeWidth={2}
          />,
        );
        break;
      }
      case 'point': {
        const [dx, dy] = OFFSET[sh.pos ?? 'ne'];
        nodes.push(<circle key={key} cx={X(sh.at[0])} cy={Y(sh.at[1])} r={5.5} fill={OUTLINE} />);
        const text = [sh.name, sh.coord ? coordText(sh.at) : ''].filter(Boolean).join(' ');
        if (text)
          labels.push(
            <Txt
              key={`${key}l`}
              x={X(sh.at[0]) + dx * 18}
              y={Y(sh.at[1]) + dy * 18}
              size={sh.name && !sh.coord ? 24 : 18}
              anchor={dx > 0.1 ? 'start' : dx < -0.1 ? 'end' : 'middle'}
            >
              {sh.name ? <tspan fontStyle="italic">{sh.name}</tspan> : null}
              {sh.coord ? `${sh.name ? ' ' : ''}${coordText(sh.at)}` : null}
            </Txt>,
          );
        break;
      }
      case 'label':
        labels.push(
          <Txt key={key} x={X(sh.at[0])} y={Y(sh.at[1])} size={20}>
            {sh.text}
          </Txt>,
        );
        break;
    }
  });

  return {
    w,
    h,
    label: describe(v),
    body: (
      <>
        <defs>
          <marker
            id="fig-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" fill={AXIS} />
          </marker>
        </defs>
        <rect x={0} y={0} width={w} height={h} rx={16} fill={TOKENS.card} />
        {nodes}
        {labels}
        {v.caption && (
          <Txt x={w / 2} y={h - capH / 2 - 4} size={18}>
            {v.caption}
          </Txt>
        )}
      </>
    ),
  };
}
