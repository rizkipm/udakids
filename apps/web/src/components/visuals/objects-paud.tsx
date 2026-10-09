import type { ReactNode } from 'react';
import { LINE } from './draw';
import { OUTLINE } from './palette';
import type { ObjectArt } from './objects';

/**
 * Ilustrasi Berhitung PAUD (D-079): suasana pagi, siang, malam, dan kegiatan anak (bangun tidur, berangkat
 * sekolah). Dibuat sendiri; kotak 100×100, garis tepi tebal seperti ilustrasi lain.
 */

const HILL = '#7cc66b';
const SKIN = '#f8c9a0';
const eye = (x: number, y: number) => <circle cx={x} cy={y} r={2.4} fill={OUTLINE} />;

/** Bingkai suasana: langit + bukit. */
function Scene({ sky, hill, children }: { sky: string; hill: string; children?: ReactNode }) {
  return (
    <g>
      <clipPath id={`scene-${sky.slice(1)}`}>
        <rect x={6} y={10} width={88} height={80} rx={14} />
      </clipPath>
      <g clipPath={`url(#scene-${sky.slice(1)})`}>
        <rect x={6} y={10} width={88} height={80} fill={sky} />
        {children}
        <path
          d="M2 76 Q30 60 56 72 T98 68 V94 H2 Z"
          fill={hill}
          stroke={OUTLINE}
          strokeWidth={2.5}
        />
      </g>
      <rect x={6} y={10} width={88} height={80} rx={14} fill="none" {...LINE} />
    </g>
  );
}

const rays = (cx: number, cy: number, r: number, n = 8) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i * 2 * Math.PI) / n;
    return `M${cx + Math.cos(a) * (r + 4)} ${cy + Math.sin(a) * (r + 4)} L${cx + Math.cos(a) * (r + 11)} ${cy + Math.sin(a) * (r + 11)}`;
  }).join(' ');

export const PAUD_OBJECT_ART = {
  // Pagi: matahari terbit di balik bukit, langit jingga muda.
  pagi: () => (
    <Scene sky="#ffd9b0" hill={HILL}>
      <circle cx={50} cy={70} r={18} fill="#ffb347" stroke={OUTLINE} strokeWidth={2.5} />
      <path d={rays(50, 70, 18)} stroke="#ff9f1c" strokeWidth={3.5} strokeLinecap="round" />
      <path d="M14 30 q6 -8 14 -2 q8 -6 14 2 Z" fill="#fff" stroke={OUTLINE} strokeWidth={2} />
    </Scene>
  ),
  // Siang: matahari tinggi bersinar terik, langit biru.
  siang: () => (
    <Scene sky="#8fd3ff" hill={HILL}>
      <circle cx={50} cy={36} r={14} fill="#ffd23f" stroke={OUTLINE} strokeWidth={2.5} />
      <path d={rays(50, 36, 14, 10)} stroke="#ffb800" strokeWidth={3.5} strokeLinecap="round" />
      <path d="M68 58 q5 -7 12 -2 q7 -5 12 2 Z" fill="#fff" stroke={OUTLINE} strokeWidth={2} />
    </Scene>
  ),
  // Malam: langit gelap, bulan sabit, bintang.
  malam: () => (
    <Scene sky="#2b2f6b" hill="#3f6b48">
      <path
        d="M66 22 a14 14 0 1 0 8 26 a11 11 0 1 1 -8 -26 Z"
        fill="#fff3b0"
        stroke={OUTLINE}
        strokeWidth={2}
      />
      {[
        [22, 26],
        [36, 44],
        [18, 56],
        [84, 54],
        [44, 22],
      ].map(([x, y], i) => (
        <path
          key={i}
          transform={`translate(${x} ${y})`}
          d="M0 -5 L1.5 -1.5 L5 0 L1.5 1.5 L0 5 L-1.5 1.5 L-5 0 L-1.5 -1.5 Z"
          fill="#fff3b0"
        />
      ))}
    </Scene>
  ),
  // Bangun tidur: anak duduk di kasur sambil merentangkan tangan.
  'anak-bangun': () => (
    <g>
      <rect x={10} y={60} width={80} height={18} rx={6} fill="#c98a4b" {...LINE} />
      <rect x={14} y={78} width={7} height={12} fill="#a46a35" {...LINE} />
      <rect x={79} y={78} width={7} height={12} fill="#a46a35" {...LINE} />
      <rect x={12} y={52} width={76} height={12} rx={5} fill="#a8dadc" {...LINE} />
      <rect x={14} y={44} width={18} height={10} rx={4} fill="#fff" {...LINE} />
      <path d="M40 54 V36 Q50 30 60 36 V54" fill="#ffd166" {...LINE} />
      <path
        d="M41 40 L28 22 M59 40 L72 22"
        stroke={OUTLINE}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <path d="M41 40 L28 22 M59 40 L72 22" stroke={SKIN} strokeWidth={3.2} strokeLinecap="round" />
      <circle cx={50} cy={24} r={11} fill={SKIN} {...LINE} />
      <path d="M40 20 Q50 8 60 20" fill="#3d2b1f" stroke={OUTLINE} strokeWidth={2} />
      <path d="M45 25 q2 -2 4 0 M51 25 q2 -2 4 0" fill="none" stroke={OUTLINE} strokeWidth={1.8} />
      <ellipse cx={50} cy={30} rx={3} ry={2.4} fill={OUTLINE} />
    </g>
  ),
  // Berangkat sekolah: anak berjalan membawa tas punggung.
  'anak-sekolah': () => (
    <g>
      <path d="M12 92 H88" stroke={OUTLINE} strokeWidth={3} strokeLinecap="round" />
      <rect x={30} y={38} width={16} height={26} rx={5} fill="#e76f51" {...LINE} />
      <path d="M36 38 V30" stroke={OUTLINE} strokeWidth={3} />
      <path d="M42 36 H60 V66 H42 Z" fill="#fff" {...LINE} />
      <path
        d="M44 64 L38 88 M58 64 L66 88"
        stroke={OUTLINE}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <path
        d="M44 64 L38 88 M58 64 L66 88"
        stroke="#3a6ea5"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path d="M60 44 L72 56" stroke={OUTLINE} strokeWidth={6} strokeLinecap="round" />
      <path d="M60 44 L72 56" stroke={SKIN} strokeWidth={3.2} strokeLinecap="round" />
      <circle cx={51} cy={24} r={11} fill={SKIN} {...LINE} />
      <path d="M41 21 Q51 8 61 21" fill="#3d2b1f" stroke={OUTLINE} strokeWidth={2} />
      {eye(55, 24)}
      <path d="M54 29 q3 2 6 0" fill="none" stroke={OUTLINE} strokeWidth={1.8} />
    </g>
  ),
} satisfies Record<string, ObjectArt>;
