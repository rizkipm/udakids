import type { JSX } from 'react';
import type { Color, ObjectId } from '@little-coder/engine';
import { Blob, Cone, Cuboid, Cylinder, LINE, Sphere, Tube, starPoints } from './draw';
import { OUTLINE, PALETTE, shade, tint } from './palette';

export type ObjectArtProps = { color?: Color };
export type ObjectArt = (props: ObjectArtProps) => JSX.Element;

const WOOD = '#c98a4b';
const LEAF = '#3fae5a';
const PINK = '#ff9ec7';
const SKIN_ORANGE = '#f7a24b';
const GLASS = '#bfe6ff';
const STEEL = '#c3cad6';

/**
 * Benda yang bisa diregangkan (soal panjang/tinggi/lebar). Digambar parametris di kotak `w×h`
 * sehingga garis tepi tetap rapi saat diregangkan tidak seragam. `w`/`h` = ukuran alami.
 */
export type StretchArt = {
  w: number;
  h: number;
  draw: (w: number, h: number, color?: Color) => JSX.Element;
};

export const STRETCH_ART = {
  pensil: {
    w: 92,
    h: 24,
    draw: (w, h, color) => {
      const t = Math.min(20, h - 4);
      const y0 = (h - t) / 2;
      const y1 = y0 + t;
      const cy = h / 2;
      const tip = Math.min(16, w * 0.2);
      const er = Math.min(8, w * 0.1);
      const fe = Math.min(6, w * 0.07);
      const bx = w - 2 - tip;
      return (
        <g>
          <rect x={2} y={y0} width={er + 4} height={t} rx={4} fill={PINK} {...LINE} />
          <rect x={2 + er} y={y0} width={fe} height={t} fill={STEEL} {...LINE} />
          <rect
            x={2 + er + fe}
            y={y0}
            width={Math.max(1, bx - 2 - er - fe)}
            height={t}
            fill={tint(color, '#ffcc2e')}
            {...LINE}
          />
          <line
            x1={2 + er + fe}
            y1={cy}
            x2={bx}
            y2={cy}
            stroke={shade(tint(color, '#ffcc2e'), -0.25)}
            strokeWidth={2}
          />
          <polygon points={`${bx},${y0} ${w - 2},${cy} ${bx},${y1}`} fill="#f5d6a8" {...LINE} />
          <polygon
            points={`${bx + tip * 0.6},${cy - t * 0.2} ${w - 2},${cy} ${bx + tip * 0.6},${cy + t * 0.2}`}
            fill={OUTLINE}
          />
        </g>
      );
    },
  },
  pita: {
    w: 92,
    h: 22,
    draw: (w, h, color) => {
      const t = Math.min(18, h - 4);
      const y0 = (h - t) / 2;
      const y1 = y0 + t;
      const cy = h / 2;
      const n = Math.min(8, w * 0.1);
      const fill = tint(color, '#ff6fa5');
      return (
        <g>
          <polygon
            points={`2,${y0} ${w - 2},${y0} ${w - 2 - n},${cy} ${w - 2},${y1} 2,${y1} ${2 + n},${cy}`}
            fill={fill}
            {...LINE}
          />
          <line
            x1={2 + n + 4}
            y1={y0 + t * 0.3}
            x2={w - 2 - n - 4}
            y2={y0 + t * 0.3}
            stroke="#ffffff"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.6}
          />
        </g>
      );
    },
  },
  pohon: {
    w: 80,
    h: 92,
    draw: (w, h) => {
      const cx = w / 2;
      const r = Math.min(30, w * 0.36, h * 0.3);
      const top = 4;
      const tw = Math.max(10, r * 0.5);
      return (
        <g>
          <rect
            x={cx - tw / 2}
            y={top + r * 1.5}
            width={tw}
            height={Math.max(4, h - 2 - top - r * 1.5)}
            rx={3}
            fill="#9a6232"
            {...LINE}
          />
          <Blob
            circles={[
              [cx, top + r, r],
              [cx - r * 0.62, top + r * 1.3, r * 0.72],
              [cx + r * 0.62, top + r * 1.3, r * 0.72],
            ]}
            fill={LEAF}
          />
          <circle cx={cx - r * 0.35} cy={top + r * 0.7} r={r * 0.18} fill="#ffffff" opacity={0.3} />
          <circle cx={cx + r * 0.4} cy={top + r * 1.35} r={r * 0.1} fill={shade(LEAF, -0.3)} />
          <circle cx={cx - r * 0.5} cy={top + r * 1.5} r={r * 0.1} fill={shade(LEAF, -0.3)} />
        </g>
      );
    },
  },
  gedung: {
    w: 60,
    h: 90,
    draw: (w, h, color) => {
      const fill = tint(color, '#7fa7d6');
      const cols = Math.max(1, Math.floor((w - 12) / 14));
      const rows = Math.max(1, Math.floor((h - 36) / 14));
      const cw = (w - 12) / cols;
      const wins: JSX.Element[] = [];
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          wins.push(
            <rect
              key={`${r}-${c}`}
              x={6 + c * cw + (cw - 8) / 2}
              y={16 + r * 14}
              width={8}
              height={8}
              rx={1.5}
              fill="#fff3b0"
              stroke={OUTLINE}
              strokeWidth={2}
            />,
          );
      const dw = Math.min(14, w * 0.3);
      return (
        <g>
          <rect x={3} y={8} width={w - 6} height={h - 10} fill={fill} {...LINE} />
          <rect x={1} y={3} width={w - 2} height={7} rx={2} fill={shade(fill, -0.3)} {...LINE} />
          {wins}
          <rect
            x={w / 2 - dw / 2}
            y={h - 18}
            width={dw}
            height={16}
            rx={2}
            fill={shade(fill, -0.4)}
            {...LINE}
          />
        </g>
      );
    },
  },
  bunga: {
    w: 50,
    h: 88,
    draw: (w, h, color) => {
      const cx = w / 2;
      const R = Math.min(20, w * 0.42, h * 0.24);
      const hy = 3 + R;
      const petal = tint(color, '#ff6fa5');
      const petals = [0, 60, 120, 180, 240, 300].map((deg) => {
        const a = (deg * Math.PI) / 180;
        return [cx + Math.cos(a) * R * 0.52, hy + Math.sin(a) * R * 0.52, R * 0.5] as [
          number,
          number,
          number,
        ];
      });
      const stemTop = hy + R * 0.5;
      const stemLen = h - 3 - stemTop;
      const ly = stemTop + stemLen * 0.55;
      return (
        <g>
          <Tube d={`M${cx} ${stemTop} L${cx} ${h - 3}`} width={4} fill={LEAF} />
          {stemLen > 14 && (
            <>
              <path
                d={`M${cx} ${ly} C${cx + 6} ${ly - 12} ${cx + 16} ${ly - 12} ${cx + 20} ${ly - 10} C${cx + 16} ${ly - 2} ${cx + 8} ${ly + 2} ${cx} ${ly} Z`}
                fill={LEAF}
                {...LINE}
              />
              <path
                d={`M${cx} ${ly + 8} C${cx - 6} ${ly - 4} ${cx - 16} ${ly - 4} ${cx - 20} ${ly - 2} C${cx - 16} ${ly + 6} ${cx - 8} ${ly + 10} ${cx} ${ly + 8} Z`}
                fill={LEAF}
                {...LINE}
              />
            </>
          )}
          <Blob circles={petals} fill={petal} />
          <circle cx={cx} cy={hy} r={R * 0.36} fill="#ffcc2e" {...LINE} />
        </g>
      );
    },
  },
  pintu: {
    w: 56,
    h: 88,
    draw: (w, h, color) => {
      const fill = tint(color, '#b8743c');
      const pw = w - 16;
      return (
        <g>
          <rect x={2} y={2} width={w - 4} height={h - 4} rx={3} fill={fill} {...LINE} />
          <rect
            x={8}
            y={9}
            width={pw}
            height={h * 0.36}
            rx={2}
            fill={shade(fill, 0.2)}
            stroke={shade(fill, -0.35)}
            strokeWidth={2.5}
          />
          <rect
            x={8}
            y={h * 0.53}
            width={pw}
            height={h * 0.36}
            rx={2}
            fill={shade(fill, 0.2)}
            stroke={shade(fill, -0.35)}
            strokeWidth={2.5}
          />
          <circle cx={w - 11} cy={h * 0.49} r={3.5} fill="#ffcc2e" {...LINE} />
        </g>
      );
    },
  },
  meja: {
    w: 94,
    h: 58,
    draw: (w, h, color) => {
      const fill = tint(color, WOOD);
      const legW = 8;
      return (
        <g>
          <rect
            x={8}
            y={12}
            width={legW}
            height={h - 14}
            rx={2}
            fill={shade(fill, -0.2)}
            {...LINE}
          />
          <rect
            x={w - 8 - legW}
            y={12}
            width={legW}
            height={h - 14}
            rx={2}
            fill={shade(fill, -0.2)}
            {...LINE}
          />
          <rect x={12} y={12} width={w - 24} height={8} fill={shade(fill, -0.1)} {...LINE} />
          <rect x={2} y={4} width={w - 4} height={10} rx={3} fill={fill} {...LINE} />
        </g>
      );
    },
  },
  buku: {
    w: 64,
    h: 80,
    draw: (w, h, color) => {
      const fill = tint(color, '#2f80ed');
      return (
        <g>
          <rect x={6} y={4} width={w - 8} height={h - 6} rx={3} fill="#fdf6e3" {...LINE} />
          <rect x={2} y={2} width={w - 8} height={h - 6} rx={3} fill={fill} {...LINE} />
          <rect x={2} y={2} width={9} height={h - 6} rx={3} fill={shade(fill, -0.3)} {...LINE} />
          <rect
            x={17}
            y={h * 0.2}
            width={Math.max(4, w - 30)}
            height={h * 0.18}
            rx={3}
            fill={shade(fill, 0.55)}
            stroke={OUTLINE}
            strokeWidth={2}
          />
        </g>
      );
    },
  },
} satisfies Partial<Record<ObjectId, StretchArt>>;

export type StretchId = keyof typeof STRETCH_ART;
export const isStretchable = (id: ObjectId): id is StretchId => id in STRETCH_ART;

/** Gambar benda regang pada ukuran alami, dipusatkan di kotak 100×100. */
const centered = (id: StretchId): ObjectArt =>
  function Centered({ color }) {
    const a: StretchArt = STRETCH_ART[id];
    return (
      <g transform={`translate(${(100 - a.w) / 2} ${(100 - a.h) / 2 + (a.h > 60 ? 2 : 0)})`}>
        {a.draw(a.w, a.h, color)}
      </g>
    );
  };

/**
 * Satu ilustrasi SVG datar per id benda, di dalam viewBox 0 0 100 100 (pembungkus menyediakan
 * `<svg>`). `color` mewarnai badan utama.
 */
export const OBJECT_ART: Record<ObjectId, ObjectArt> = {
  apel: ({ color }) => (
    <g>
      <path
        d="M50 30 C38 20 14 24 15 52 C16 76 34 92 50 84 C66 92 84 76 85 52 C86 24 62 20 50 30 Z"
        fill={tint(color, PALETTE.merah.fill)}
        {...LINE}
      />
      <path d="M50 30 C50 22 52 16 57 10" fill="none" {...LINE} strokeWidth={4} />
      <path d="M54 22 C58 12 72 10 78 14 C72 24 62 26 54 22 Z" fill={LEAF} {...LINE} />
      <ellipse
        cx={30}
        cy={46}
        rx={5}
        ry={10}
        fill="#ffffff"
        opacity={0.5}
        transform="rotate(20 30 46)"
      />
    </g>
  ),
  jeruk: ({ color }) => (
    <g>
      <Sphere cx={50} cy={56} r={36} fill={tint(color, PALETTE.oranye.fill)} />
      <path d="M50 20 L50 13" {...LINE} strokeWidth={4} />
      <path d="M52 18 C58 8 72 8 76 12 C70 20 60 22 52 18 Z" fill={LEAF} {...LINE} />
      <circle cx={62} cy={48} r={1.5} fill={OUTLINE} opacity={0.35} />
      <circle cx={42} cy={66} r={1.5} fill={OUTLINE} opacity={0.35} />
      <circle cx={60} cy={72} r={1.5} fill={OUTLINE} opacity={0.35} />
    </g>
  ),
  pisang: ({ color }) => (
    <g>
      <path
        d="M22 24 C16 58 42 88 86 74 C90 72 90 67 85 67 C58 70 38 52 34 24 Z"
        fill={tint(color, '#ffd23f')}
        {...LINE}
      />
      <path
        d="M30 30 C32 54 50 68 76 70"
        fill="none"
        stroke={shade('#ffd23f', -0.3)}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path d="M22 26 L23 14 L32 15 L34 26 Z" fill="#8a5a2b" {...LINE} />
      <circle cx={87} cy={70} r={2.5} fill={OUTLINE} />
    </g>
  ),
  anggur: ({ color }) => {
    const fill = tint(color, PALETTE.ungu.fill);
    const grapes: [number, number][] = [
      [34, 40],
      [50, 40],
      [66, 40],
      [42, 55],
      [58, 55],
      [34, 68],
      [50, 70],
      [66, 68],
      [50, 84],
    ];
    return (
      <g>
        <path d="M50 30 C50 22 52 16 56 10" fill="none" {...LINE} strokeWidth={4} />
        <path d="M54 22 C60 12 74 12 78 16 C72 24 62 26 54 22 Z" fill={LEAF} {...LINE} />
        {grapes.map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r={10} fill={fill} {...LINE} />
            <circle cx={x - 3.5} cy={y - 3.5} r={2.5} fill="#ffffff" opacity={0.55} />
          </g>
        ))}
      </g>
    );
  },
  semangka: ({ color }) => (
    <g>
      <path d="M6 34 A44 44 0 0 0 94 34 Z" fill={tint(color, '#2e9e52')} {...LINE} />
      <path d="M13 34 A37 37 0 0 0 87 34 Z" fill="#eaf7d2" />
      <path d="M18 34 A32 32 0 0 0 82 34 Z" fill="#f2545b" {...LINE} strokeWidth={2} />
      {[
        [34, 46],
        [50, 52],
        [66, 46],
        [42, 60],
        [58, 60],
        [50, 40],
      ].map(([x, y]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={2.2} ry={3.5} fill={OUTLINE} />
      ))}
      <path d="M6 34 L94 34" {...LINE} />
    </g>
  ),
  wortel: ({ color }) => (
    <g>
      <path d="M70 28 C66 16 70 6 76 4 C80 12 78 20 74 28 Z" fill={LEAF} {...LINE} />
      <path d="M74 30 C82 20 92 18 96 22 C90 30 84 32 76 34 Z" fill={LEAF} {...LINE} />
      <path d="M68 28 C60 18 50 16 46 20 C52 28 60 32 68 32 Z" fill={LEAF} {...LINE} />
      <path
        d="M60 28 C68 22 80 28 80 38 C80 42 78 46 74 48 L24 88 C20 91 15 87 18 82 Z"
        fill={tint(color, PALETTE.oranye.fill)}
        {...LINE}
      />
      <path
        d="M50 46 L56 50 M40 60 L46 64 M32 72 L37 75 M60 38 L66 42"
        stroke={shade(PALETTE.oranye.fill, -0.35)}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </g>
  ),
  bebek: ({ color }) => {
    const fill = tint(color, '#ffd23f');
    return (
      <g>
        <path d="M18 64 L8 50 L26 56 Z" fill={fill} {...LINE} />
        <path
          d="M40 84 L40 92 M34 92 L46 92 M56 84 L56 92 M50 92 L62 92"
          {...LINE}
          stroke="#f28a2e"
          strokeWidth={4}
        />
        <ellipse cx={46} cy={66} rx={32} ry={20} fill={fill} {...LINE} />
        <path d="M80 34 L95 39 L80 46 Z" fill="#f28a2e" {...LINE} />
        <circle cx={66} cy={38} r={16} fill={fill} {...LINE} />
        <circle cx={70} cy={34} r={3} fill={OUTLINE} />
        <circle cx={71} cy={33} r={1} fill="#ffffff" />
        <path
          d="M30 62 C40 54 56 56 60 66 C52 74 38 72 30 62 Z"
          fill={shade(fill, -0.15)}
          {...LINE}
        />
      </g>
    );
  },
  ayam: ({ color }) => {
    const fill = tint(color, '#fff4e0');
    return (
      <g>
        <path
          d="M42 84 L42 94 M36 94 L48 94 M56 84 L56 94 M50 94 L62 94"
          {...LINE}
          stroke="#e8a21c"
          strokeWidth={4}
        />
        <path
          d="M24 54 C10 44 10 30 18 26 C22 36 26 42 32 46 Z"
          fill={shade(fill, -0.15)}
          {...LINE}
        />
        <circle cx={48} cy={62} r={26} fill={fill} {...LINE} />
        <path
          d="M62 26 C60 16 68 14 70 22 C72 14 82 16 78 26 Z"
          fill={PALETTE.merah.fill}
          {...LINE}
        />
        <path d="M80 36 L92 41 L80 46 Z" fill="#ffcc2e" {...LINE} />
        <circle cx={68} cy={40} r={14} fill={fill} {...LINE} />
        <ellipse
          cx={80}
          cy={51}
          rx={3.5}
          ry={5}
          fill={PALETTE.merah.fill}
          {...LINE}
          strokeWidth={2}
        />
        <circle cx={71} cy={37} r={3} fill={OUTLINE} />
        <path
          d="M34 62 C42 54 56 56 60 66 C52 74 40 72 34 62 Z"
          fill={shade(fill, -0.1)}
          {...LINE}
        />
      </g>
    );
  },
  kucing: ({ color }) => {
    const fill = tint(color, SKIN_ORANGE);
    return (
      <g>
        <Tube d="M70 88 C88 88 94 72 84 60" width={7} fill={fill} />
        <path d="M28 92 C24 72 32 54 50 54 C68 54 76 72 72 92 Z" fill={fill} {...LINE} />
        <ellipse cx={50} cy={78} rx={12} ry={12} fill={shade(fill, 0.5)} />
        <ellipse cx={40} cy={92} rx={7} ry={4} fill={shade(fill, 0.3)} {...LINE} />
        <ellipse cx={60} cy={92} rx={7} ry={4} fill={shade(fill, 0.3)} {...LINE} />
        <path d="M31 32 L29 10 L47 22 Z" fill={fill} {...LINE} />
        <path d="M69 32 L71 10 L53 22 Z" fill={fill} {...LINE} />
        <path d="M34 26 L33 16 L41 22 Z" fill={PINK} />
        <path d="M66 26 L67 16 L59 22 Z" fill={PINK} />
        <circle cx={50} cy={40} r={22} fill={fill} {...LINE} />
        <ellipse cx={42} cy={38} rx={3} ry={4.5} fill={OUTLINE} />
        <ellipse cx={58} cy={38} rx={3} ry={4.5} fill={OUTLINE} />
        <path d="M47 46 L53 46 L50 49 Z" fill={PINK} {...LINE} strokeWidth={1.5} />
        <path
          d="M50 49 Q47 53 43 51 M50 49 Q53 53 57 51 M38 46 L26 44 M38 49 L27 51 M62 46 L74 44 M62 49 L73 51"
          fill="none"
          {...LINE}
          strokeWidth={2}
        />
      </g>
    );
  },
  ikan: ({ color }) => {
    const fill = tint(color, '#4aa3f0');
    return (
      <g>
        <path d="M70 50 L92 30 L88 50 L92 70 Z" fill={shade(fill, -0.15)} {...LINE} />
        <path d="M38 32 C44 20 58 22 62 34 Z" fill={shade(fill, -0.15)} {...LINE} />
        <ellipse cx={45} cy={50} rx={32} ry={21} fill={fill} {...LINE} />
        <path
          d="M50 40 Q56 50 50 60 M60 40 Q66 50 60 60"
          fill="none"
          stroke={shade(fill, -0.3)}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={28} cy={46} r={6} fill="#ffffff" {...LINE} strokeWidth={2} />
        <circle cx={27} cy={46} r={3} fill={OUTLINE} />
        <path d="M14 56 Q19 58 22 55" fill="none" {...LINE} strokeWidth={2} />
      </g>
    );
  },
  kelinci: ({ color }) => {
    const fill = tint(color, '#ece8f2');
    return (
      <g>
        <ellipse cx={40} cy={22} rx={7} ry={19} fill={fill} {...LINE} />
        <ellipse cx={60} cy={22} rx={7} ry={19} fill={fill} {...LINE} />
        <ellipse cx={40} cy={23} rx={3} ry={13} fill={PINK} />
        <ellipse cx={60} cy={23} rx={3} ry={13} fill={PINK} />
        <ellipse cx={50} cy={76} rx={23} ry={18} fill={fill} {...LINE} />
        <ellipse cx={38} cy={92} rx={9} ry={4.5} fill={fill} {...LINE} />
        <ellipse cx={62} cy={92} rx={9} ry={4.5} fill={fill} {...LINE} />
        <circle cx={50} cy={48} r={19} fill={fill} {...LINE} />
        <circle cx={43} cy={45} r={3} fill={OUTLINE} />
        <circle cx={57} cy={45} r={3} fill={OUTLINE} />
        <ellipse cx={50} cy={52} rx={3.5} ry={2.5} fill={PINK} {...LINE} strokeWidth={1.5} />
        <path d="M50 55 Q46 59 43 57 M50 55 Q54 59 57 57" fill="none" {...LINE} strokeWidth={2} />
        <circle cx={38} cy={53} r={3} fill={PINK} opacity={0.6} />
        <circle cx={62} cy={53} r={3} fill={PINK} opacity={0.6} />
      </g>
    );
  },
  'kupu-kupu': ({ color }) => {
    const fill = tint(color, PALETTE.oranye.fill);
    const wing = (
      <g>
        <path d="M48 48 C30 18 6 22 10 44 C12 56 30 58 48 52 Z" fill={fill} {...LINE} />
        <path
          d="M48 56 C30 58 16 70 24 82 C32 90 46 78 48 62 Z"
          fill={shade(fill, -0.15)}
          {...LINE}
        />
        <circle cx={26} cy={40} r={6} fill="#ffffff" opacity={0.7} {...LINE} strokeWidth={2} />
        <circle cx={33} cy={72} r={4} fill="#ffffff" opacity={0.7} />
      </g>
    );
    return (
      <g>
        {wing}
        <g transform="matrix(-1 0 0 1 100 0)">{wing}</g>
        <path d="M48 30 C44 20 40 16 34 14 M52 30 C56 20 60 16 66 14" fill="none" {...LINE} />
        <ellipse cx={50} cy={56} rx={4.5} ry={24} fill={OUTLINE} />
        <circle cx={50} cy={32} r={6} fill={OUTLINE} />
      </g>
    );
  },
  semut: ({ color }) => {
    const fill = tint(color, '#6b4230');
    return (
      <g>
        <path
          d="M52 58 L42 74 M56 58 L56 76 M60 58 L70 74 M52 54 L40 44 M60 54 L72 44"
          fill="none"
          {...LINE}
        />
        <path d="M78 42 C80 32 84 28 90 26 M74 42 C74 32 76 26 80 22" fill="none" {...LINE} />
        <ellipse cx={32} cy={56} rx={18} ry={13} fill={fill} {...LINE} />
        <ellipse cx={56} cy={56} rx={9} ry={7} fill={fill} {...LINE} />
        <circle cx={75} cy={50} r={10} fill={fill} {...LINE} />
        <circle cx={78} cy={48} r={2.5} fill="#ffffff" />
        <ellipse cx={27} cy={51} rx={6} ry={3} fill="#ffffff" opacity={0.3} />
      </g>
    );
  },
  gajah: ({ color }) => {
    const fill = tint(color, '#9aa3b5');
    const dark = shade(fill, -0.18);
    return (
      <g>
        <rect x={20} y={62} width={12} height={28} rx={4} fill={dark} {...LINE} />
        <rect x={52} y={62} width={12} height={28} rx={4} fill={dark} {...LINE} />
        <path d="M14 52 L8 66" {...LINE} />
        <ellipse cx={42} cy={56} rx={30} ry={22} fill={fill} {...LINE} />
        <rect x={30} y={66} width={12} height={26} rx={4} fill={fill} {...LINE} />
        <rect x={60} y={66} width={12} height={26} rx={4} fill={fill} {...LINE} />
        <Tube d="M84 50 C92 62 92 76 84 82" width={10} fill={fill} />
        <circle cx={74} cy={44} r={18} fill={fill} {...LINE} />
        <ellipse cx={66} cy={46} rx={11} ry={15} fill={dark} {...LINE} />
        <circle cx={80} cy={40} r={2.8} fill={OUTLINE} />
        <path d="M82 56 L90 60" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
      </g>
    );
  },
  bunga: centered('bunga'),
  pohon: centered('pohon'),
  bola: ({ color }) => {
    const fill = tint(color, PALETTE.merah.fill);
    return (
      <g>
        <Sphere cx={50} cy={52} r={38} fill={fill} />
        <path
          d="M14 44 C34 56 66 56 86 44 M14 60 C34 70 66 70 86 60"
          fill="none"
          stroke="#ffffff"
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.9}
        />
        <circle cx={50} cy={52} r={38} fill="none" {...LINE} />
      </g>
    );
  },
  balon: ({ color }) => (
    <g>
      <path d="M50 80 C44 86 56 90 50 97" fill="none" {...LINE} strokeWidth={2} />
      <path
        d="M50 8 C30 8 20 26 22 44 C24 62 38 74 50 76 C62 74 76 62 78 44 C80 26 70 8 50 8 Z"
        fill={tint(color, PALETTE.merah.fill)}
        {...LINE}
      />
      <path d="M45 81 L55 81 L50 75 Z" fill={tint(color, PALETTE.merah.fill)} {...LINE} />
      <ellipse
        cx={37}
        cy={30}
        rx={5}
        ry={11}
        fill="#ffffff"
        opacity={0.55}
        transform="rotate(25 37 30)"
      />
    </g>
  ),
  mobil: ({ color }) => (
    <g>
      <path
        d="M6 72 L6 56 C6 52 10 50 14 50 L26 50 L36 34 C38 31 41 30 44 30 L66 30 C70 30 72 32 74 35 L82 50 L88 51 C92 52 95 56 95 60 L95 72 Z"
        fill={tint(color, PALETTE.merah.fill)}
        {...LINE}
      />
      <path d="M40 36 L48 36 L48 50 L32 50 Z" fill={GLASS} {...LINE} strokeWidth={2.5} />
      <path
        d="M53 36 L65 36 C67 36 68 37 69 38 L75 50 L53 50 Z"
        fill={GLASS}
        {...LINE}
        strokeWidth={2.5}
      />
      <path d="M50 52 L50 70" {...LINE} strokeWidth={2} />
      <rect x={88} y={56} width={6} height={5} rx={2} fill="#ffe68f" {...LINE} strokeWidth={2} />
      <circle cx={27} cy={73} r={12} fill={OUTLINE} />
      <circle cx={27} cy={73} r={5} fill={STEEL} />
      <circle cx={74} cy={73} r={12} fill={OUTLINE} />
      <circle cx={74} cy={73} r={5} fill={STEEL} />
    </g>
  ),
  sepeda: ({ color }) => {
    const frame = tint(color, PALETTE.biru.fill);
    return (
      <g>
        <circle cx={24} cy={66} r={17} fill="none" stroke={OUTLINE} strokeWidth={5} />
        <circle cx={76} cy={66} r={17} fill="none" stroke={OUTLINE} strokeWidth={5} />
        <circle cx={24} cy={66} r={3} fill={OUTLINE} />
        <circle cx={76} cy={66} r={3} fill={OUTLINE} />
        <Tube
          d="M24 66 L42 42 L70 42 L76 66 M42 42 L50 66 L24 66 M50 66 L70 42"
          width={3}
          fill={frame}
        />
        <Tube d="M70 42 L66 30 L76 28" width={3} fill={frame} />
        <path d="M34 38 L48 38" {...LINE} strokeWidth={6} />
        <path d="M42 42 L40 38" {...LINE} />
        <circle cx={50} cy={66} r={4} fill={STEEL} {...LINE} strokeWidth={2} />
      </g>
    );
  },
  'layang-layang': ({ color }) => {
    const fill = tint(color, PALETTE.oranye.fill);
    return (
      <g>
        <path
          d="M50 76 C42 82 58 86 50 92 C46 95 50 98 52 98"
          fill="none"
          {...LINE}
          strokeWidth={2}
        />
        <path
          d="M44 84 L52 80 L50 88 Z M48 92 L56 90 L52 97 Z"
          fill={PALETTE.biru.fill}
          {...LINE}
          strokeWidth={2}
        />
        <path d="M50 6 L82 38 L50 78 L18 38 Z" fill={fill} {...LINE} />
        <path d="M50 6 L50 78 L18 38 Z" fill={shade(fill, 0.35)} {...LINE} />
        <path d="M18 38 L82 38" {...LINE} />
      </g>
    );
  },
  bintang: ({ color }) => (
    <g>
      <polygon
        points={starPoints(50, 54, 44, 20)}
        fill={tint(color, PALETTE.kuning.fill)}
        {...LINE}
        strokeWidth={3.5}
      />
      <ellipse
        cx={40}
        cy={42}
        rx={4}
        ry={7}
        fill="#ffffff"
        opacity={0.6}
        transform="rotate(35 40 42)"
      />
    </g>
  ),
  kue: ({ color }) => (
    <g>
      <path d="M26 56 L74 56 L66 92 L34 92 Z" fill={PALETTE.biru.light} {...LINE} />
      <path
        d="M38 58 L41 92 M50 58 L50 92 M62 58 L59 92"
        stroke={shade(PALETTE.biru.light, -0.3)}
        strokeWidth={2.5}
      />
      <path
        d="M20 60 C14 48 26 40 34 42 C36 30 54 26 60 36 C68 32 84 40 78 52 C86 56 80 64 74 62 Z"
        fill={tint(color, PINK)}
        {...LINE}
      />
      <path d="M58 26 C58 20 62 16 66 14" fill="none" {...LINE} strokeWidth={2.5} />
      <circle cx={56} cy={28} r={7} fill={PALETTE.merah.fill} {...LINE} />
      <path
        d="M34 50 L38 48 M46 44 L48 40 M66 46 L70 48 M42 56 L46 55 M62 54 L66 56"
        stroke="#ffffff"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </g>
  ),
  topi: ({ color }) => {
    const fill = tint(color, PALETTE.biru.fill);
    return (
      <g>
        <ellipse cx={50} cy={70} rx={44} ry={12} fill={shade(fill, -0.15)} {...LINE} />
        <path d="M26 70 C26 40 34 28 50 28 C66 28 74 40 74 70 Z" fill={fill} {...LINE} />
        <path
          d="M26 60 C40 64 60 64 74 60 L74 69 C60 73 40 73 26 69 Z"
          fill={PALETTE.kuning.fill}
          {...LINE}
        />
        <ellipse
          cx={40}
          cy={42}
          rx={4}
          ry={8}
          fill="#ffffff"
          opacity={0.4}
          transform="rotate(20 40 42)"
        />
      </g>
    );
  },
  pensil: centered('pensil'),
  buku: centered('buku'),
  pita: centered('pita'),
  gedung: centered('gedung'),
  pintu: centered('pintu'),
  meja: centered('meja'),
  batu: ({ color }) => {
    const fill = tint(color, '#9aa0a8');
    return (
      <g>
        <path
          d="M12 80 C8 64 20 48 34 44 C42 30 64 30 72 42 C86 44 94 60 88 78 C86 84 80 86 74 86 L22 86 C16 86 13 84 12 80 Z"
          fill={fill}
          {...LINE}
        />
        <path
          d="M30 56 C34 50 40 48 44 48 M62 50 L58 60 L66 66"
          fill="none"
          stroke={shade(fill, -0.3)}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <ellipse cx={50} cy={42} rx={8} ry={3} fill="#ffffff" opacity={0.4} />
      </g>
    );
  },
  bulu: ({ color }) => {
    const fill = tint(color, '#8fd3e8');
    return (
      <g>
        <path
          d="M80 10 C94 30 72 64 34 80 C28 70 34 50 48 36 C58 26 70 16 80 10 Z"
          fill={fill}
          {...LINE}
        />
        <path d="M20 92 C40 70 60 40 80 10" fill="none" {...LINE} />
        <path
          d="M56 40 L66 44 M46 52 L58 58 M40 64 L48 68 M52 30 L60 28"
          stroke={shade(fill, -0.3)}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </g>
    );
  },
  ember: ({ color }) => {
    const fill = tint(color, PALETTE.biru.fill);
    return (
      <g>
        <path d="M18 38 C18 4 82 4 82 38" fill="none" {...LINE} strokeWidth={4} />
        <path d="M18 36 L82 36 L74 90 L26 90 Z" fill={fill} {...LINE} />
        <rect x={14} y={32} width={72} height={9} rx={4} fill={shade(fill, 0.3)} {...LINE} />
        <path
          d="M30 48 L34 82"
          stroke="#ffffff"
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.4}
        />
      </g>
    );
  },
  gelas: ({ color }) => (
    <g>
      <path d="M26 12 L74 12 L67 92 L33 92 Z" fill="#eef9ff" {...LINE} />
      <path d="M30 42 L70 42 L67 92 L33 92 Z" fill={tint(color, '#8fd0ff')} />
      <path d="M26 12 L74 12 L67 92 L33 92 Z" fill="none" {...LINE} />
      <path
        d="M34 20 L38 84"
        stroke="#ffffff"
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.8}
      />
    </g>
  ),
  panci: ({ color }) => {
    const fill = tint(color, '#aeb8c6');
    return (
      <g>
        <rect x={3} y={52} width={16} height={8} rx={3} fill={OUTLINE} />
        <rect x={81} y={52} width={16} height={8} rx={3} fill={OUTLINE} />
        <path
          d="M14 44 L86 44 L86 78 C86 86 80 90 72 90 L28 90 C20 90 14 86 14 78 Z"
          fill={fill}
          {...LINE}
        />
        <path d="M10 44 C10 30 90 30 90 44 Z" fill={shade(fill, -0.15)} {...LINE} />
        <rect x={43} y={24} width={14} height={9} rx={3} fill={OUTLINE} />
        <path
          d="M24 54 L24 80"
          stroke="#ffffff"
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.5}
        />
      </g>
    );
  },
  cangkir: ({ color }) => {
    const fill = tint(color, '#fdfbf6');
    return (
      <g>
        <ellipse cx={48} cy={88} rx={40} ry={7} fill={PALETTE.biru.light} {...LINE} />
        <Tube d="M70 46 C84 44 86 66 68 68" width={4} fill={fill} />
        <path
          d="M20 36 L76 36 L72 76 C71 82 66 86 60 86 L36 86 C30 86 25 82 24 76 Z"
          fill={fill}
          {...LINE}
        />
        <path d="M21 46 L75 46 L74 54 L22 54 Z" fill={PALETTE.biru.fill} />
        <path
          d="M38 28 C34 22 42 18 38 12 M52 28 C48 22 56 18 52 12"
          fill="none"
          stroke={OUTLINE}
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.5}
        />
      </g>
    );
  },
  botol: ({ color }) => (
    <g>
      <path
        d="M42 16 L58 16 L58 26 C58 30 70 34 70 44 L70 88 C70 92 66 94 62 94 L38 94 C34 94 30 92 30 88 L30 44 C30 34 42 30 42 26 Z"
        fill={GLASS}
        {...LINE}
      />
      <rect x={40} y={5} width={20} height={12} rx={3} fill={PALETTE.biru.dark} {...LINE} />
      <rect x={30} y={54} width={40} height={22} fill={tint(color, PALETTE.hijau.fill)} {...LINE} />
      <path
        d="M36 40 L36 50 M36 80 L36 88"
        stroke="#ffffff"
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.7}
      />
    </g>
  ),
  sendok: ({ color }) => {
    const fill = tint(color, STEEL);
    return (
      <g>
        <Tube d="M44 46 L84 88" width={8} fill={fill} />
        <ellipse
          cx={32}
          cy={32}
          rx={17}
          ry={23}
          fill={fill}
          {...LINE}
          transform="rotate(-45 32 32)"
        />
        <ellipse
          cx={30}
          cy={30}
          rx={9}
          ry={14}
          fill="#ffffff"
          opacity={0.5}
          transform="rotate(-45 30 30)"
        />
      </g>
    );
  },
  kotak: ({ color }) => {
    const fill = tint(color, '#d9a066');
    return (
      <g>
        <Cuboid x={12} y={40} w={60} h={50} d={22} fill={fill} />
        <polygon points="34,40 56,24.6 64,24.6 42,40" fill={shade(fill, -0.25)} opacity={0.8} />
        <rect x={34} y={40} width={8} height={16} fill={shade(fill, -0.25)} opacity={0.8} />
      </g>
    );
  },
  'jam-dinding': ({ color }) => {
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30 * Math.PI) / 180;
      const r1 = i % 3 === 0 ? 24 : 27;
      return (
        <line
          key={i}
          x1={50 + Math.cos(a) * r1}
          y1={50 + Math.sin(a) * r1}
          x2={50 + Math.cos(a) * 30}
          y2={50 + Math.sin(a) * 30}
          stroke={OUTLINE}
          strokeWidth={i % 3 === 0 ? 3.5 : 2}
          strokeLinecap="round"
        />
      );
    });
    return (
      <g>
        <circle cx={50} cy={50} r={43} fill={tint(color, PALETTE.oranye.fill)} {...LINE} />
        <circle cx={50} cy={50} r={35} fill="#ffffff" {...LINE} />
        {ticks}
        <path d="M50 50 L50 30 M50 50 L66 56" {...LINE} strokeWidth={4} />
        <circle cx={50} cy={50} r={4} fill={OUTLINE} />
      </g>
    );
  },
  piring: ({ color }) => (
    <g>
      <circle cx={50} cy={50} r={43} fill="#fdfcf8" {...LINE} />
      <circle
        cx={50}
        cy={50}
        r={36}
        fill="none"
        stroke={tint(color, PALETTE.biru.fill)}
        strokeWidth={3}
      />
      <circle cx={50} cy={50} r={26} fill="#f3efe4" stroke="#ddd6c4" strokeWidth={2.5} />
      <path
        d="M26 30 C30 24 36 20 42 18"
        fill="none"
        stroke="#ffffff"
        strokeWidth={4}
        strokeLinecap="round"
      />
    </g>
  ),
  'roti-lapis': ({ color }) => (
    <g>
      <path
        d="M16 80 C24 88 32 76 40 84 C48 90 56 78 64 84 C72 90 80 78 86 82"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={10}
        strokeLinecap="round"
      />
      <path
        d="M16 80 C24 88 32 76 40 84 C48 90 56 78 64 84 C72 90 80 78 86 82"
        fill="none"
        stroke={tint(color, LEAF)}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path d="M12 80 L88 80 L50 12 Z" fill="#d9954a" {...LINE} strokeWidth={3.5} />
      <path d="M24 73 L76 73 L50 27 Z" fill="#ffe3a8" strokeLinejoin="round" />
      <path
        d="M50 44 L50 46 M42 60 L42 62 M58 60 L58 62"
        stroke="#e0bb78"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </g>
  ),
  jendela: ({ color }) => {
    const frame = tint(color, '#f7f3ea');
    return (
      <g>
        <rect x={12} y={10} width={76} height={76} rx={3} fill={frame} {...LINE} />
        {[
          [19, 17],
          [52, 17],
          [19, 50],
          [52, 50],
        ].map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={29}
            height={29}
            fill="#9fd8ff"
            {...LINE}
            strokeWidth={2.5}
          />
        ))}
        <path
          d="M24 38 L36 22 M57 38 L69 22"
          stroke="#ffffff"
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.8}
        />
        <rect x={6} y={84} width={88} height={8} rx={3} fill={shade(frame, -0.2)} {...LINE} />
      </g>
    );
  },
  kado: ({ color }) => {
    const fill = tint(color, PALETTE.ungu.fill);
    const rib = PALETTE.kuning.fill;
    return (
      <g>
        <Cuboid x={14} y={42} w={54} h={48} d={22} fill={fill} />
        <rect x={37} y={42} width={8} height={48} fill={rib} {...LINE} strokeWidth={2} />
        <polygon points="37,42 59,26.6 67,26.6 45,42" fill={rib} {...LINE} strokeWidth={2} />
        <polygon points="68,62 90,46.6 90,54.6 68,70" fill={rib} {...LINE} strokeWidth={2} />
        <ellipse
          cx={40}
          cy={26}
          rx={12}
          ry={7}
          fill={rib}
          {...LINE}
          transform="rotate(-20 40 26)"
        />
        <ellipse cx={62} cy={24} rx={12} ry={7} fill={rib} {...LINE} transform="rotate(20 62 24)" />
        <circle cx={51} cy={30} r={5} fill={shade(rib, -0.2)} {...LINE} />
      </g>
    );
  },
  dadu: ({ color }) => {
    const fill = tint(color, '#fdfdfd');
    const pip = (x: number, y: number) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r={4.5} fill={OUTLINE} />
    );
    return (
      <g>
        <Cuboid x={14} y={40} w={52} h={52} d={22} fill={fill} />
        {(
          [
            [26, 52],
            [54, 52],
            [40, 66],
            [26, 80],
            [54, 80],
          ] as const
        ).map(([x, y]) => pip(x, y))}
        <ellipse cx={51} cy={32.3} rx={6} ry={3} fill={OUTLINE} />
        <ellipse
          cx={71.5}
          cy={49}
          rx={2.6}
          ry={4.2}
          fill={OUTLINE}
          transform="rotate(-30 71.5 49)"
        />
        <ellipse
          cx={82.5}
          cy={67.5}
          rx={2.6}
          ry={4.2}
          fill={OUTLINE}
          transform="rotate(-30 82.5 67.5)"
        />
      </g>
    );
  },
  kaleng: ({ color }) => {
    const fill = tint(color, PALETTE.merah.fill);
    return (
      <g>
        <Cylinder cx={50} y={20} rx={27} ry={8} h={66} fill={fill} top="#d7dde6" />
        <path
          d="M23 40 A27 8 0 0 0 77 40 L77 64 A27 8 0 0 1 23 64 Z"
          fill="#ffffff"
          opacity={0.85}
          {...LINE}
          strokeWidth={2}
        />
        <circle cx={50} cy={52} r={6} fill={fill} />
        <ellipse cx={58} cy={19} rx={6} ry={2.5} fill="none" stroke={OUTLINE} strokeWidth={2} />
      </g>
    );
  },
  drum: ({ color }) => {
    const fill = tint(color, PALETTE.merah.fill);
    return (
      <g>
        <path d="M26 6 L52 34 M74 6 L48 34" {...LINE} strokeWidth={4} />
        <circle cx={26} cy={6} r={4} fill="#fdf6e3" {...LINE} strokeWidth={2} />
        <circle cx={74} cy={6} r={4} fill="#fdf6e3" {...LINE} strokeWidth={2} />
        <Cylinder cx={50} y={40} rx={38} ry={12} h={44} fill={fill} top="#fdf6e3" />
        <path
          d="M12 50 L25 78 L38 54 L50 82 L62 54 L75 78 L88 50"
          fill="none"
          stroke="#ffffff"
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <path
          d="M12 84 A38 12 0 0 0 88 84"
          fill="none"
          stroke={shade(fill, -0.4)}
          strokeWidth={6}
        />
        <path d="M12 84 A38 12 0 0 0 88 84" fill="none" {...LINE} />
      </g>
    );
  },
  'topi-ulang-tahun': ({ color }) => (
    <g>
      <Cone cx={50} apexY={14} baseY={84} rx={30} ry={9} fill={tint(color, PALETTE.biru.fill)} />
      {[
        [44, 52],
        [58, 64],
        [42, 76],
        [54, 38],
        [66, 80],
      ].map(([x, y]) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={4}
          fill={PALETTE.kuning.fill}
          stroke={OUTLINE}
          strokeWidth={1.5}
        />
      ))}
      <circle cx={50} cy={12} r={8} fill={PALETTE.kuning.fill} {...LINE} />
    </g>
  ),
  'es-krim': ({ color }) => (
    <g>
      <Cone cx={50} apexY={96} baseY={44} rx={22} ry={6} fill="#e8b06b" />
      <path
        d="M36 52 L54 82 M46 50 L62 74 M64 52 L46 82 M54 50 L38 74"
        stroke={shade('#e8b06b', -0.3)}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Blob
        circles={[
          [50, 30, 22],
          [34, 44, 8],
          [50, 46, 8],
          [66, 44, 8],
        ]}
        fill={tint(color, PINK)}
      />
      <ellipse
        cx={42}
        cy={22}
        rx={4}
        ry={7}
        fill="#ffffff"
        opacity={0.5}
        transform="rotate(30 42 22)"
      />
    </g>
  ),
  'kotak-susu': ({ color }) => (
    <g>
      <Cuboid x={26} y={38} w={40} h={56} d={18} fill="#fdfdfd" />
      <polygon points="46,20 64,7.4 84,25.4 66,38" fill="#e9edf2" {...LINE} />
      <polygon points="26,38 46,20 66,38" fill="#fdfdfd" {...LINE} />
      <path d="M46 20 L64 7.4" {...LINE} strokeWidth={6} />
      <rect x={26} y={52} width={40} height={26} fill={tint(color, PALETTE.biru.fill)} {...LINE} />
      <path
        d="M46 56 C52 64 54 68 54 70 C54 74 50 76 46 76 C42 76 38 74 38 70 C38 68 40 64 46 56 Z"
        fill="#ffffff"
      />
    </g>
  ),
  stiker: ({ color }) => (
    <g>
      <circle cx={48} cy={48} r={38} fill={tint(color, PALETTE.kuning.fill)} {...LINE} />
      <polygon points={starPoints(48, 50, 22, 10)} fill="#ffffff" {...LINE} strokeWidth={2.5} />
      <path d="M70 80 C80 76 86 68 86 60 L74 70 Z" fill="#ffffff" {...LINE} />
    </g>
  ),
};
