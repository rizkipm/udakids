import { LINE } from './draw';
import { OUTLINE, shade, tint } from './palette';
import type { ObjectArt } from './objects';

/**
 * Ilustrasi Worksheet PAUD huruf vokal (D-075): benda berawalan i, u, e, o. Dibuat sendiri (bukan salinan
 * lembar kerja contoh). Kotak 100×100, garis tepi tebal seperti ilustrasi lain.
 */

const eye = (x: number, y: number, r = 3) => <circle cx={x} cy={y} r={r} fill={OUTLINE} />;
const WOOD = '#c98a4b';
const FLAME = '#ffb020';

export const VOKAL_OBJECT_ART = {
  // Itik: badan cokelat muda, paruh jingga, berenang di air.
  itik: ({ color }) => {
    const fill = tint(color, '#f3e2b8');
    return (
      <g>
        <path
          d="M8 78 Q28 70 50 78 T92 78"
          fill="none"
          stroke="#6cc4ff"
          strokeWidth={5}
          strokeLinecap="round"
        />
        <path
          d="M18 58 C18 42 40 40 54 48 C60 52 70 52 74 56 C80 64 72 76 56 76 H32 C24 76 18 68 18 58 Z"
          fill={fill}
          {...LINE}
        />
        <path d="M32 58 C40 52 50 54 54 62" fill="none" {...LINE} />
        <circle cx={68} cy={36} r={13} fill={fill} {...LINE} />
        <path d="M79 36 L92 40 L79 44 Z" fill="#ff8c2a" {...LINE} />
        <path d="M60 46 L58 52" {...LINE} />
        {eye(71, 33)}
      </g>
    );
  },
  // Udang: badan melengkung beruas, ekor kipas, sungut panjang.
  udang: ({ color }) => {
    const fill = tint(color, '#ff8a65');
    return (
      <g>
        <path d="M70 30 C82 18 94 20 96 26 M70 34 C84 30 94 36 94 42" fill="none" {...LINE} />
        <path
          d="M72 34 C60 24 36 26 28 40 C20 54 26 70 38 76 L46 70 C38 64 36 52 42 46 C50 40 62 42 70 46 Z"
          fill={fill}
          {...LINE}
        />
        <path
          d="M40 48 L52 54 M36 58 L48 60 M38 68 L48 66"
          stroke={shade(fill, -0.25)}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path d="M38 76 L28 90 L42 86 L46 92 L50 74 Z" fill={shade(fill, -0.1)} {...LINE} />
        <path d="M54 46 L52 58 M62 46 L62 58" {...LINE} />
        {eye(68, 36, 3.5)}
      </g>
    );
  },
  // Unta: badan pasir dengan satu punuk, leher panjang.
  unta: ({ color }) => {
    const fill = tint(color, '#d9a35b');
    return (
      <g>
        <path
          d="M20 62 C20 50 28 46 36 46 C40 32 54 32 58 46 C64 46 70 50 70 58 L70 64 H20 Z"
          fill={fill}
          {...LINE}
        />
        {[24, 34, 56, 64].map((x) => (
          <rect key={x} x={x} y={62} width={6} height={26} rx={3} fill={fill} {...LINE} />
        ))}
        <path d="M66 54 C72 46 72 30 74 24 L84 24 C82 32 78 48 72 60 Z" fill={fill} {...LINE} />
        <ellipse cx={82} cy={22} rx={11} ry={7} fill={fill} {...LINE} />
        <path d="M18 56 C10 60 10 70 12 74" fill="none" {...LINE} />
        {eye(84, 20, 2.6)}
      </g>
    );
  },
  // Elang: sayap terbentang, kepala putih, paruh kuning.
  elang: ({ color }) => {
    const fill = tint(color, '#8a5a32');
    return (
      <g>
        <path
          d="M50 50 C36 34 18 30 6 34 C16 40 20 46 22 52 C30 50 40 52 50 58 Z"
          fill={fill}
          {...LINE}
        />
        <path
          d="M50 50 C64 34 82 30 94 34 C84 40 80 46 78 52 C70 50 60 52 50 58 Z"
          fill={fill}
          {...LINE}
        />
        <ellipse cx={50} cy={62} rx={11} ry={18} fill={fill} {...LINE} />
        <path d="M42 78 L50 92 L58 78 Z" fill={shade(fill, -0.15)} {...LINE} />
        <circle cx={50} cy={40} r={10} fill="#ffffff" {...LINE} />
        <path d="M50 44 L56 48 L50 50 Z" fill="#ffc83d" {...LINE} />
        {eye(47, 38, 2.4)}
      </g>
    );
  },
  // Emas: tiga batang emas bertumpuk dengan kilau.
  emas: ({ color }) => {
    const fill = tint(color, '#ffcc33');
    const bar = (x: number, y: number) => (
      <g key={`${x}-${y}`}>
        <path
          d={`M${x} ${y + 16} L${x + 6} ${y} H${x + 30} L${x + 36} ${y + 16} Z`}
          fill={fill}
          {...LINE}
        />
        <path
          d={`M${x + 8} ${y + 4} H${x + 20}`}
          stroke="#fff6c8"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </g>
    );
    return (
      <g>
        {bar(12, 64)}
        {bar(52, 64)}
        {bar(32, 46)}
        <path
          d="M78 22 L80 30 L88 32 L80 34 L78 42 L76 34 L68 32 L76 30 Z"
          fill="#fff6c8"
          {...LINE}
        />
      </g>
    );
  },
  // Obor: gagang kayu, mangkuk, dan api menyala.
  obor: ({ color }) => {
    const fill = tint(color, WOOD);
    return (
      <g>
        <path d="M44 52 H56 L54 92 H46 Z" fill={fill} {...LINE} />
        <path d="M32 44 H68 L62 56 H38 Z" fill={shade(fill, -0.2)} {...LINE} />
        <path
          d="M50 8 C58 20 70 26 66 40 C64 46 58 46 50 46 C42 46 36 46 34 40 C30 28 44 24 50 8 Z"
          fill={FLAME}
          {...LINE}
        />
        <path d="M50 22 C54 30 60 34 56 42 H44 C40 34 48 30 50 22 Z" fill="#ff6b3d" />
      </g>
    );
  },
  // Obeng: gagang bergerigi berwarna, batang logam, ujung pipih.
  obeng: ({ color }) => {
    const fill = tint(color, '#e5484d');
    return (
      <g transform="rotate(-35 50 50)">
        <rect x={40} y={8} width={20} height={36} rx={8} fill={fill} {...LINE} />
        <path
          d="M46 14 V38 M54 14 V38"
          stroke={shade(fill, -0.25)}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <rect x={46} y={44} width={8} height={40} fill="#c9d1dc" {...LINE} />
        <path d="M46 84 H54 L52 94 H48 Z" fill="#9aa4b2" {...LINE} />
      </g>
    );
  },
  // Ombak: gulungan air laut dengan buih.
  ombak: ({ color }) => {
    const fill = tint(color, '#3aa0e8');
    return (
      <g>
        <path
          d="M6 86 C10 60 26 40 48 38 C66 36 78 48 74 60 C70 70 58 68 58 60 C58 54 64 52 66 56 C70 44 52 44 46 52 C38 62 44 80 62 82 C74 84 86 78 94 70 V92 H6 Z"
          fill={fill}
          {...LINE}
        />
        <path
          d="M14 76 C22 66 30 62 38 62"
          fill="none"
          stroke="#e8f6ff"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <circle cx={80} cy={50} r={4} fill="#e8f6ff" {...LINE} />
        <circle cx={88} cy={60} r={3} fill="#e8f6ff" {...LINE} />
      </g>
    );
  },
} satisfies Record<string, ObjectArt>;
