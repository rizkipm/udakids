import type { CoinValue, Color, ShapeId, Size, SolidId } from '@little-coder/engine';
import { Cone, Cuboid, Cylinder, LINE, Sphere, polygonPoints } from './draw';
import { FONT, OUTLINE, PALETTE } from './palette';

/** Skala tiap ukuran bangun datar di kotak 100×100. */
export const SIZE_SCALE: Record<Size, number> = { s: 0.56, m: 0.78, l: 1 };

export type FlatShapeProps = { shape: ShapeId; color: Color; size?: Size; rotate?: number };

/** Bangun datar di kotak 100×100 (mengembalikan `<g>`; pembungkus menyediakan `<svg>`). */
export function FlatShape({ shape, color, size = 'm', rotate = 0 }: FlatShapeProps) {
  const k = SIZE_SCALE[size];
  const p = { fill: PALETTE[color].fill, ...LINE, strokeWidth: 3.5 };
  let el;
  switch (shape) {
    case 'lingkaran':
      el = <circle cx={50} cy={50} r={42 * k} {...p} />;
      break;
    case 'segitiga':
      el = <polygon points={polygonPoints(50, 50 + 46 * k * 0.22, 48 * k, 3, -90)} {...p} />;
      break;
    case 'persegi':
      el = <rect x={50 - 38 * k} y={50 - 38 * k} width={76 * k} height={76 * k} rx={2} {...p} />;
      break;
    case 'persegi-panjang':
      el = <rect x={50 - 45 * k} y={50 - 26 * k} width={90 * k} height={52 * k} rx={2} {...p} />;
      break;
    case 'segi-lima':
      el = <polygon points={polygonPoints(50, 52, 45 * k, 5, -90)} {...p} />;
      break;
    case 'segi-enam':
      el = <polygon points={polygonPoints(50, 50, 45 * k, 6, 0)} {...p} />;
      break;
  }
  return <g transform={rotate ? `rotate(${rotate} 50 50)` : undefined}>{el}</g>;
}

export type SolidShapeProps = { solid: SolidId; color: Color };

/** Bangun ruang 3D dengan bayangan sederhana, di kotak 100×100. */
export function SolidShape({ solid, color }: SolidShapeProps) {
  const fill = PALETTE[color].fill;
  switch (solid) {
    case 'bola':
      return <Sphere cx={50} cy={52} r={38} fill={fill} />;
    case 'kubus':
      return <Cuboid x={16} y={38} w={52} h={52} d={22} fill={fill} />;
    case 'balok':
      return <Cuboid x={6} y={48} w={70} h={38} d={20} fill={fill} />;
    case 'tabung':
      return <Cylinder cx={50} y={20} rx={30} ry={9} h={64} fill={fill} />;
    case 'kerucut':
      return <Cone cx={50} apexY={10} baseY={82} rx={36} ry={10} fill={fill} />;
  }
}

type CoinStyle = { r: number; fill: string; rim: string; inner?: string };

/** Ukuran & warna koin Rupiah: 100 kecil abu muda, 200 abu, 500 keemasan, 1000 dwiwarna. */
export const COIN_STYLE: Record<CoinValue, CoinStyle> = {
  100: { r: 33, fill: '#e6e9ee', rim: '#b9c0cb' },
  200: { r: 38, fill: '#b9c0cb', rim: '#8f98a8' },
  500: { r: 45, fill: '#ecc453', rim: '#c3951c' },
  1000: { r: 42, fill: '#e3b94a', rim: '#b98b18', inner: '#cfd4dc' },
};

/** Koin bulat dengan tulisan "Rp" dan nilainya, di kotak 100×100. */
export function Coin({ value }: { value: CoinValue }) {
  const s = COIN_STYLE[value];
  const digits = String(value).length;
  return (
    <g>
      <circle cx={50} cy={52} r={s.r} fill={s.rim} />
      <circle cx={50} cy={50} r={s.r} fill={s.fill} {...LINE} />
      {s.inner && (
        <circle cx={50} cy={50} r={s.r * 0.68} fill={s.inner} stroke={s.rim} strokeWidth={2} />
      )}
      <circle cx={50} cy={50} r={s.r - 5} fill="none" stroke={s.rim} strokeWidth={2} />
      <text
        x={50}
        y={50 - s.r * 0.36}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={FONT}
        fontWeight={700}
        fontSize={s.r * 0.3}
        fill={OUTLINE}
      >
        Rp
      </text>
      <text
        x={50}
        y={50 + s.r * 0.14}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={FONT}
        fontWeight={800}
        fontSize={s.r * (digits > 3 ? 0.44 : 0.6)}
        fill={OUTLINE}
      >
        {value}
      </text>
    </g>
  );
}
