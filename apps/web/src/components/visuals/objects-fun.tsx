import { LINE } from './draw';
import { OUTLINE, shade, tint } from './palette';
import type { ObjectArt } from './objects';

/**
 * Ilustrasi game seru (D-078): traktor, roket, planet, astronot, kerang, benih, dan tunas. Dibuat sendiri,
 * kotak 100×100, garis tepi tebal seperti ilustrasi lain.
 */

const wheel = (x: number, y: number, r: number, hub = '#ffd166') => (
  <g>
    <circle cx={x} cy={y} r={r} fill={OUTLINE} />
    <circle cx={x} cy={y} r={r * 0.45} fill={hub} {...LINE} />
  </g>
);

export const FUN_OBJECT_ART = {
  // Traktor: badan hijau, kabin, roda belakang besar dan roda depan kecil, cerobong.
  traktor: ({ color }) => {
    const fill = tint(color, '#3fb34f');
    return (
      <g>
        <path d="M16 70 H86" stroke="#c98a4b" strokeWidth={4} strokeLinecap="round" />
        <rect x={40} y={22} width={28} height={30} rx={4} fill={shade(fill, 0.15)} {...LINE} />
        <rect x={46} y={28} width={16} height={14} rx={2} fill="#e8f6ff" {...LINE} />
        <path d="M14 52 H84 V64 H14 Z" fill={fill} {...LINE} />
        <path d="M66 44 H84 V52 H66 Z" fill={fill} {...LINE} />
        <path d="M74 30 V44" stroke={OUTLINE} strokeWidth={5} strokeLinecap="round" />
        {wheel(32, 68, 17)}
        {wheel(76, 72, 11)}
      </g>
    );
  },
  // Roket: badan putih, jendela biru, sirip merah, api kecil.
  roket: ({ color }) => {
    const fin = tint(color, '#ff5d5d');
    return (
      <g>
        <path d="M44 84 Q50 98 56 84 Z" fill="#ffb020" {...LINE} />
        <path d="M50 6 C66 22 68 52 62 82 H38 C32 52 34 22 50 6 Z" fill="#f4f1ff" {...LINE} />
        <path d="M50 6 C58 14 62 22 63 30 H37 C38 22 42 14 50 6 Z" fill={fin} {...LINE} />
        <circle cx={50} cy={46} r={9} fill="#4aa8ff" {...LINE} />
        <path d="M38 62 L24 84 L38 82 Z M62 62 L76 84 L62 82 Z" fill={fin} {...LINE} />
      </g>
    );
  },
  // Planet bercincin.
  planet: ({ color }) => {
    const fill = tint(color, '#9b7bff');
    return (
      <g>
        <ellipse cx={50} cy={54} rx={44} ry={12} fill="none" stroke={OUTLINE} strokeWidth={7} />
        <circle cx={50} cy={50} r={28} fill={fill} {...LINE} />
        <path
          d="M30 40 Q50 34 70 42 M28 58 Q50 54 72 60"
          fill="none"
          stroke={shade(fill, -0.2)}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <path
          d="M8 54 Q50 70 92 54"
          fill="none"
          stroke="#ffd166"
          strokeWidth={5}
          strokeLinecap="round"
        />
      </g>
    );
  },
  // Astronot: helm bulat dengan kaca, baju putih, ransel.
  astronot: ({ color }) => {
    const suit = tint(color, '#f4f1ff');
    return (
      <g>
        <rect x={24} y={46} width={52} height={40} rx={14} fill={suit} {...LINE} />
        <rect x={40} y={58} width={20} height={12} rx={3} fill="#ff7a59" {...LINE} />
        <path
          d="M26 56 L14 70 M74 56 L86 70"
          stroke={OUTLINE}
          strokeWidth={8}
          strokeLinecap="round"
        />
        <path d="M26 56 L14 70 M74 56 L86 70" stroke={suit} strokeWidth={4} strokeLinecap="round" />
        <circle cx={50} cy={30} r={22} fill={suit} {...LINE} />
        <rect x={34} y={20} width={32} height={20} rx={10} fill="#4aa8ff" {...LINE} />
        <path
          d="M40 26 Q44 23 48 26"
          fill="none"
          stroke="#e8f6ff"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path d="M36 86 V94 M64 86 V94" stroke={OUTLINE} strokeWidth={6} strokeLinecap="round" />
      </g>
    );
  },
  // Kerang: cangkang kipas bergaris.
  kerang: ({ color }) => {
    const fill = tint(color, '#ffc2a8');
    return (
      <g>
        <path d="M50 84 L20 44 Q50 4 80 44 Z" fill={fill} {...LINE} />
        <path
          d="M50 84 L34 30 M50 84 L50 22 M50 84 L66 30 M50 84 L26 42 M50 84 L74 42"
          stroke={shade(fill, -0.25)}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path d="M40 84 H60 L56 92 H44 Z" fill={shade(fill, -0.1)} {...LINE} />
      </g>
    );
  },
  // Benih: biji cokelat di atas tanah.
  benih: () => (
    <g>
      <path d="M8 74 Q50 62 92 74 V90 H8 Z" fill="#a0673a" {...LINE} />
      <ellipse
        cx={50}
        cy={56}
        rx={16}
        ry={11}
        fill="#c98a4b"
        {...LINE}
        transform="rotate(-20 50 56)"
      />
      <path
        d="M42 54 Q50 50 58 56"
        fill="none"
        stroke="#8a5a2b"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </g>
  ),
  // Tunas: dua daun kecil muncul dari tanah.
  tunas: () => (
    <g>
      <path d="M8 74 Q50 62 92 74 V90 H8 Z" fill="#a0673a" {...LINE} />
      <path d="M50 70 V40" stroke="#3a8f3a" strokeWidth={5} strokeLinecap="round" />
      <path d="M50 46 C36 46 28 36 28 26 C42 26 50 34 50 46 Z" fill="#5cc96b" {...LINE} />
      <path d="M50 40 C64 40 72 30 72 20 C58 20 50 28 50 40 Z" fill="#5cc96b" {...LINE} />
    </g>
  ),
} satisfies Record<string, ObjectArt>;
