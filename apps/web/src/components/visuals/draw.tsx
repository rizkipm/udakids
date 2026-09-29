import { OUTLINE, shade } from './palette';

/** Properti garis tepi standar (tebal, sudut membulat). */
export const LINE = {
  stroke: OUTLINE,
  strokeWidth: 3,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;

const f = (n: number) => Math.round(n * 100) / 100;

/** Titik-titik poligon beraturan (sudut awal dalam derajat, 0 = kanan, searah jarum jam). */
export function polygonPoints(
  cx: number,
  cy: number,
  r: number,
  sides: number,
  startDeg: number,
): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = ((startDeg + (360 / sides) * i) * Math.PI) / 180;
    pts.push(`${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`);
  }
  return pts.join(' ');
}

/** Titik-titik bintang bersudut `points`. */
export function starPoints(cx: number, cy: number, outer: number, inner: number, points = 5) {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((-90 + (180 / points) * i) * Math.PI) / 180;
    pts.push(`${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`);
  }
  return pts.join(' ');
}

/** Garis tebal bertepi gelap (ekor, belalai, gagang). */
export function Tube({ d, width, fill }: { d: string; width: number; fill: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={OUTLINE} strokeWidth={width + 6} />
      <path d={d} stroke={fill} strokeWidth={width} />
    </g>
  );
}

/** Gabungan lingkaran dengan satu garis tepi luar (tajuk pohon, awan, es krim). */
export function Blob({ circles, fill }: { circles: [number, number, number][]; fill: string }) {
  return (
    <g>
      {circles.map(([cx, cy, r], i) => (
        <circle
          key={`o${i}`}
          cx={cx}
          cy={cy}
          r={r}
          fill={OUTLINE}
          stroke={OUTLINE}
          strokeWidth={6}
        />
      ))}
      {circles.map(([cx, cy, r], i) => (
        <circle key={`f${i}`} cx={cx} cy={cy} r={r} fill={fill} />
      ))}
    </g>
  );
}

/** Bola 3D: bayangan sabit kanan-bawah + kilau kiri-atas. */
export function Sphere({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const pt = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  };
  const p1 = pt(-25);
  const p2 = pt(150);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      <path
        d={`M${p1} A${r} ${r} 0 0 1 ${p2} A${f(r * 1.3)} ${f(r * 1.3)} 0 0 0 ${p1} Z`}
        fill={shade(fill, -0.45)}
        opacity={0.35}
      />
      <ellipse
        cx={f(cx - r * 0.38)}
        cy={f(cy - r * 0.4)}
        rx={f(r * 0.22)}
        ry={f(r * 0.13)}
        fill="#ffffff"
        opacity={0.75}
        transform={`rotate(-35 ${f(cx - r * 0.38)} ${f(cy - r * 0.4)})`}
      />
      <circle cx={cx} cy={cy} r={r} fill="none" {...LINE} />
    </g>
  );
}

/** Balok 3D: sisi depan `w×h` di (x, y), kedalaman `d` ke kanan-atas. */
export function Cuboid({
  x,
  y,
  w,
  h,
  d,
  fill,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  d: number;
  fill: string;
}) {
  const dy = d * 0.7;
  return (
    <g>
      <polygon
        points={`${x},${y} ${x + d},${f(y - dy)} ${x + w + d},${f(y - dy)} ${x + w},${y}`}
        fill={shade(fill, 0.35)}
        {...LINE}
      />
      <polygon
        points={`${x + w},${y} ${x + w + d},${f(y - dy)} ${x + w + d},${f(y + h - dy)} ${x + w},${y + h}`}
        fill={shade(fill, -0.22)}
        {...LINE}
      />
      <rect x={x} y={y} width={w} height={h} fill={fill} {...LINE} />
    </g>
  );
}

/** Tabung 3D dengan tutup elips di atas. `y` = pusat elips atas. */
export function Cylinder({
  cx,
  y,
  rx,
  ry,
  h,
  fill,
  top,
}: {
  cx: number;
  y: number;
  rx: number;
  ry: number;
  h: number;
  fill: string;
  top?: string;
}) {
  const l = cx - rx;
  const r = cx + rx;
  return (
    <g>
      <path
        d={`M${l} ${y} L${l} ${y + h} A${rx} ${ry} 0 0 0 ${r} ${y + h} L${r} ${y} Z`}
        fill={fill}
      />
      <path
        d={`M${f(cx + rx * 0.45)} ${y} L${f(cx + rx * 0.45)} ${f(y + h + ry * 0.9)} A${rx} ${ry} 0 0 0 ${r} ${y + h} L${r} ${y} Z`}
        fill={shade(fill, -0.45)}
        opacity={0.3}
      />
      <rect
        x={f(cx - rx * 0.7)}
        y={y + ry}
        width={f(rx * 0.16)}
        height={Math.max(0, h - ry * 1.5)}
        rx={f(rx * 0.08)}
        fill="#ffffff"
        opacity={0.45}
      />
      <path
        d={`M${l} ${y} L${l} ${y + h} A${rx} ${ry} 0 0 0 ${r} ${y + h} L${r} ${y}`}
        fill="none"
        {...LINE}
      />
      <ellipse cx={cx} cy={y} rx={rx} ry={ry} fill={top ?? shade(fill, 0.35)} {...LINE} />
    </g>
  );
}

/** Kerucut 3D: puncak di (cx, apexY), alas elips di baseY. */
export function Cone({
  cx,
  apexY,
  baseY,
  rx,
  ry,
  fill,
}: {
  cx: number;
  apexY: number;
  baseY: number;
  rx: number;
  ry: number;
  fill: string;
}) {
  return (
    <g>
      <path
        d={`M${cx} ${apexY} L${cx + rx} ${baseY} A${rx} ${ry} 0 0 1 ${cx - rx} ${baseY} Z`}
        fill={fill}
      />
      <path
        d={`M${cx} ${apexY} L${cx + rx} ${baseY} A${rx} ${ry} 0 0 1 ${f(cx + rx * 0.3)} ${f(baseY + ry * 0.95)} Z`}
        fill={shade(fill, -0.45)}
        opacity={0.3}
      />
      <path
        d={`M${f(cx - rx * 0.12)} ${f(apexY + (baseY - apexY) * 0.22)} L${f(cx - rx * 0.55)} ${f(baseY - (baseY - apexY) * 0.06)}`}
        stroke="#ffffff"
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.5}
      />
      <path
        d={`M${cx} ${apexY} L${cx + rx} ${baseY} A${rx} ${ry} 0 0 1 ${cx - rx} ${baseY} Z`}
        fill="none"
        {...LINE}
      />
    </g>
  );
}
