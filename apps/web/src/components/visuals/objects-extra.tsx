import { LINE } from './draw';
import { OUTLINE, PALETTE, shade, tint } from './palette';
import type { ObjectArt } from './objects';

const PINK = '#ff9ec7';
const LEAF = '#3fae5a';
const eye = (x: number, y: number, r = 3) => <circle cx={x} cy={y} r={r} fill={OUTLINE} />;
const smile = (x: number, y: number, w = 6) => (
  <path
    d={`M${x - w} ${y} Q${x} ${y + w * 0.8} ${x + w} ${y}`}
    fill="none"
    {...LINE}
    strokeWidth={2.2}
  />
);

/** Tambahan ilustrasi agar soal TK/Pra-TK lebih beragam (D-055). Kotak 100×100, garis tepi tebal. */
export const EXTRA_OBJECT_ART = {
  sapi: ({ color }) => {
    const fill = tint(color, '#ffffff');
    return (
      <g>
        <rect x={18} y={44} width={58} height={34} rx={14} fill={fill} {...LINE} />
        <path
          d="M30 52 q8 -4 10 6 q-6 6 -10 -6 Z M56 60 q10 -2 10 8 q-10 2 -10 -8 Z"
          fill={OUTLINE}
        />
        {[24, 36, 58, 70].map((x) => (
          <rect key={x} x={x} y={74} width={7} height={16} rx={3} fill={fill} {...LINE} />
        ))}
        <rect x={66} y={26} width={26} height={28} rx={10} fill={fill} {...LINE} />
        <path d="M68 28 l-6 -8 M90 28 l6 -8" {...LINE} />
        <ellipse cx={79} cy={48} rx={10} ry={6} fill={PINK} {...LINE} />
        {eye(73, 36)}
        {eye(85, 36)}
      </g>
    );
  },
  kambing: ({ color }) => {
    const fill = tint(color, '#e9e1d4');
    return (
      <g>
        <ellipse cx={46} cy={60} rx={28} ry={16} fill={fill} {...LINE} />
        {[26, 38, 54, 66].map((x) => (
          <rect key={x} x={x} y={70} width={6} height={18} rx={3} fill={fill} {...LINE} />
        ))}
        <ellipse cx={78} cy={42} rx={12} ry={14} fill={fill} {...LINE} />
        <path d="M72 30 q-8 -14 -16 -8 M84 30 q8 -14 16 -8" fill="none" {...LINE} />
        <path d="M78 56 l-4 12 l8 0 Z" fill={fill} {...LINE} />
        {eye(74, 40)}
        {eye(83, 40)}
      </g>
    );
  },
  kuda: ({ color }) => {
    const fill = tint(color, '#b9814f');
    return (
      <g>
        <ellipse cx={44} cy={58} rx={28} ry={15} fill={fill} {...LINE} />
        {[24, 34, 54, 64].map((x) => (
          <rect key={x} x={x} y={68} width={6} height={22} rx={3} fill={fill} {...LINE} />
        ))}
        <path d="M60 50 L70 26 L80 30 L74 56 Z" fill={fill} {...LINE} />
        <ellipse
          cx={82}
          cy={30}
          rx={13}
          ry={9}
          fill={fill}
          {...LINE}
          transform="rotate(25 82 30)"
        />
        <path d="M74 20 l2 -8 l5 7" fill={fill} {...LINE} />
        <path
          d="M72 22 q-8 10 -6 26"
          fill="none"
          stroke={OUTLINE}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <path
          d="M18 54 q-12 6 -8 24"
          fill="none"
          stroke={OUTLINE}
          strokeWidth={5}
          strokeLinecap="round"
        />
        {eye(84, 28)}
      </g>
    );
  },
  monyet: ({ color }) => {
    const fill = tint(color, '#a0673f');
    return (
      <g>
        <path d="M70 80 q22 -6 16 -30" fill="none" {...LINE} strokeWidth={5} />
        <ellipse cx={50} cy={72} rx={18} ry={18} fill={fill} {...LINE} />
        <circle cx={26} cy={38} r={9} fill={fill} {...LINE} />
        <circle cx={74} cy={38} r={9} fill={fill} {...LINE} />
        <circle cx={50} cy={40} r={22} fill={fill} {...LINE} />
        <ellipse cx={50} cy={46} rx={15} ry={12} fill="#f3d2b3" {...LINE} />
        {eye(44, 36)}
        {eye(56, 36)}
        {smile(50, 48, 5)}
      </g>
    );
  },
  singa: ({ color }) => {
    const fill = tint(color, '#f2b33d');
    return (
      <g>
        <circle cx={50} cy={46} r={34} fill={shade(fill, -0.25)} {...LINE} />
        <circle cx={50} cy={48} r={22} fill={fill} {...LINE} />
        <circle cx={33} cy={30} r={6} fill={fill} {...LINE} />
        <circle cx={67} cy={30} r={6} fill={fill} {...LINE} />
        <ellipse cx={50} cy={56} rx={10} ry={7} fill="#fff1d6" {...LINE} strokeWidth={2} />
        <path d="M46 52 l4 3 l4 -3 Z" fill={OUTLINE} />
        {eye(42, 44)}
        {eye(58, 44)}
      </g>
    );
  },
  jerapah: ({ color }) => {
    const fill = tint(color, '#f4c25a');
    return (
      <g>
        <ellipse cx={40} cy={70} rx={20} ry={12} fill={fill} {...LINE} />
        {[26, 34, 46, 54].map((x) => (
          <rect key={x} x={x} y={76} width={5} height={16} rx={2.5} fill={fill} {...LINE} />
        ))}
        <path d="M52 64 L64 22 L72 24 L62 68 Z" fill={fill} {...LINE} />
        <ellipse cx={72} cy={18} rx={12} ry={8} fill={fill} {...LINE} />
        <path d="M66 10 v-6 M74 10 v-6" {...LINE} />
        {[
          [36, 66],
          [46, 72],
          [60, 40],
          [64, 54],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r={3.5} fill={shade(fill, -0.35)} />
        ))}
        {eye(74, 16, 2.5)}
      </g>
    );
  },
  burung: ({ color }) => {
    const fill = tint(color, PALETTE.biru.fill);
    return (
      <g>
        <ellipse cx={48} cy={56} rx={26} ry={20} fill={fill} {...LINE} />
        <path d="M30 54 q14 -18 30 2 q-16 10 -30 -2 Z" fill={shade(fill, -0.2)} {...LINE} />
        <circle cx={70} cy={40} r={14} fill={fill} {...LINE} />
        <path d="M82 40 l12 4 l-12 4 Z" fill="#ffcc2e" {...LINE} />
        <path d="M24 60 l-14 -6 l4 14 Z" fill={shade(fill, -0.2)} {...LINE} />
        <path d="M44 76 v12 M54 76 v12" {...LINE} />
        {eye(72, 37)}
      </g>
    );
  },
  'kura-kura': ({ color }) => {
    const fill = tint(color, '#3fae5a');
    return (
      <g>
        <ellipse cx={82} cy={62} rx={10} ry={8} fill="#9fd98a" {...LINE} />
        {[30, 66].map((x) => (
          <ellipse key={x} cx={x} cy={76} rx={8} ry={6} fill="#9fd98a" {...LINE} />
        ))}
        <path d="M18 68 Q20 30 50 30 Q80 30 80 68 Z" fill={fill} {...LINE} />
        <path
          d="M36 68 L40 46 L60 46 L64 68 M40 46 L50 32 L60 46"
          fill="none"
          {...LINE}
          strokeWidth={2.2}
        />
        {eye(85, 60, 2.5)}
      </g>
    );
  },
  katak: ({ color }) => {
    const fill = tint(color, '#4cc26a');
    return (
      <g>
        <ellipse cx={50} cy={66} rx={30} ry={20} fill={fill} {...LINE} />
        <circle cx={34} cy={40} r={11} fill={fill} {...LINE} />
        <circle cx={66} cy={40} r={11} fill={fill} {...LINE} />
        <circle cx={34} cy={40} r={5} fill="#ffffff" />
        <circle cx={66} cy={40} r={5} fill="#ffffff" />
        {eye(34, 40, 3)}
        {eye(66, 40, 3)}
        {smile(50, 64, 12)}
        <path d="M22 84 l-8 6 M78 84 l8 6" {...LINE} />
      </g>
    );
  },
  lebah: ({ color }) => {
    const fill = tint(color, '#ffcc2e');
    return (
      <g>
        <ellipse
          cx={40}
          cy={34}
          rx={14}
          ry={10}
          fill="#e8f6ff"
          {...LINE}
          transform="rotate(-20 40 34)"
        />
        <ellipse
          cx={60}
          cy={34}
          rx={14}
          ry={10}
          fill="#e8f6ff"
          {...LINE}
          transform="rotate(20 60 34)"
        />
        <ellipse cx={50} cy={58} rx={26} ry={18} fill={fill} {...LINE} />
        <path d="M42 41 v34 M56 41 v34" stroke={OUTLINE} strokeWidth={6} />
        <path d="M76 58 l8 0" {...LINE} />
        <circle cx={26} cy={56} r={9} fill={OUTLINE} />
        <circle cx={23} cy={54} r={2} fill="#ffffff" />
      </g>
    );
  },
  siput: ({ color }) => {
    const fill = tint(color, '#e59a5c');
    return (
      <g>
        <path d="M14 80 Q40 74 88 80 Q90 86 84 88 L18 88 Q12 86 14 80 Z" fill="#c9e7a8" {...LINE} />
        <path d="M78 80 L82 52 M86 80 L90 54" {...LINE} />
        <circle cx={82} cy={50} r={3} fill={OUTLINE} />
        <circle cx={90} cy={52} r={3} fill={OUTLINE} />
        <circle cx={46} cy={58} r={24} fill={fill} {...LINE} />
        <path
          d="M46 58 m-14 0 a14 14 0 1 1 14 14 a8 8 0 1 1 -6 -10"
          fill="none"
          {...LINE}
          strokeWidth={2.4}
        />
      </g>
    );
  },
  penguin: ({ color }) => {
    const back = tint(color, '#2b2540');
    return (
      <g>
        <ellipse cx={50} cy={56} rx={26} ry={34} fill={back} {...LINE} />
        <ellipse cx={50} cy={62} rx={17} ry={24} fill="#ffffff" {...LINE} strokeWidth={2} />
        <path d="M44 38 l6 6 l6 -6 Z" fill="#ffb300" {...LINE} strokeWidth={2} />
        <circle cx={43} cy={32} r={3} fill="#ffffff" />
        <circle cx={57} cy={32} r={3} fill="#ffffff" />
        <path d="M40 90 h8 M52 90 h8" stroke="#ffb300" strokeWidth={5} strokeLinecap="round" />
      </g>
    );
  },
  beruang: ({ color }) => {
    const fill = tint(color, '#8a5a3c');
    return (
      <g>
        <ellipse cx={50} cy={74} rx={24} ry={18} fill={fill} {...LINE} />
        <circle cx={30} cy={24} r={9} fill={fill} {...LINE} />
        <circle cx={70} cy={24} r={9} fill={fill} {...LINE} />
        <circle cx={50} cy={42} r={24} fill={fill} {...LINE} />
        <ellipse cx={50} cy={50} rx={11} ry={8} fill="#e8c7a4" {...LINE} strokeWidth={2} />
        <ellipse cx={50} cy={46} rx={4} ry={3} fill={OUTLINE} />
        {eye(41, 38)}
        {eye(59, 38)}
      </g>
    );
  },
  mangga: ({ color }) => {
    const fill = tint(color, '#ffb23e');
    return (
      <g>
        <path
          d="M50 22 C80 22 90 56 70 78 C56 92 26 86 22 62 C18 40 30 22 50 22 Z"
          fill={fill}
          {...LINE}
        />
        <path d="M50 22 q4 -10 14 -12 q-2 10 -14 12" fill={LEAF} {...LINE} />
        <ellipse cx={40} cy={42} rx={6} ry={10} fill="#ffffff" opacity={0.45} />
      </g>
    );
  },
  nanas: ({ color }) => {
    const fill = tint(color, '#ffcc2e');
    return (
      <g>
        <path d="M50 30 L40 8 L50 18 L56 4 L58 20 L70 10 L60 32 Z" fill={LEAF} {...LINE} />
        <ellipse cx={50} cy={62} rx={22} ry={30} fill={fill} {...LINE} />
        <path
          d="M34 44 L66 80 M66 44 L34 80 M30 60 L52 36 M70 60 L48 36 M30 64 L54 90 M70 64 L46 90"
          stroke={shade(fill, -0.35)}
          strokeWidth={2}
          fill="none"
        />
      </g>
    );
  },
  stroberi: ({ color }) => {
    const fill = tint(color, '#e8484f');
    return (
      <g>
        <path d="M50 90 C24 70 18 38 50 34 C82 38 76 70 50 90 Z" fill={fill} {...LINE} />
        <path d="M34 34 L50 22 L66 34 L56 40 L50 32 L44 40 Z" fill={LEAF} {...LINE} />
        {[
          [40, 50],
          [58, 50],
          [50, 62],
          [42, 72],
          [58, 72],
        ].map(([x, y]) => (
          <ellipse key={`${x}${y}`} cx={x} cy={y} rx={1.8} ry={3} fill="#ffe68f" />
        ))}
      </g>
    );
  },
  tomat: ({ color }) => {
    const fill = tint(color, '#e8484f');
    return (
      <g>
        <circle cx={50} cy={58} r={30} fill={fill} {...LINE} />
        <path d="M36 32 L50 38 L64 32 L58 42 L50 36 L42 42 Z" fill={LEAF} {...LINE} />
        <ellipse cx={38} cy={50} rx={6} ry={9} fill="#ffffff" opacity={0.4} />
      </g>
    );
  },
  jagung: ({ color }) => {
    const fill = tint(color, '#ffcc2e');
    return (
      <g>
        <ellipse cx={50} cy={50} rx={16} ry={34} fill={fill} {...LINE} />
        {[30, 40, 50, 60, 70].map((y) => (
          <path key={y} d={`M38 ${y} H62`} stroke={shade(fill, -0.3)} strokeWidth={2} />
        ))}
        <path d="M44 22 V80 M56 22 V80" stroke={shade(fill, -0.3)} strokeWidth={2} />
        <path d="M34 50 C20 70 32 90 50 92 C40 80 38 66 34 50 Z" fill={LEAF} {...LINE} />
        <path d="M66 50 C80 70 68 90 50 92 C60 80 62 66 66 50 Z" fill={LEAF} {...LINE} />
      </g>
    );
  },
  brokoli: ({ color }) => {
    const fill = tint(color, '#2fb36a');
    return (
      <g>
        <path d="M44 56 L40 90 L60 90 L56 56 Z" fill="#9fd98a" {...LINE} />
        {[
          [34, 44, 14],
          [52, 34, 16],
          [68, 46, 13],
          [50, 54, 14],
        ].map(([cx, cy, r]) => (
          <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={r} fill={fill} {...LINE} />
        ))}
      </g>
    );
  },
  pesawat: ({ color }) => {
    const fill = tint(color, '#ffffff');
    const accent = tint(color, PALETTE.biru.fill);
    return (
      <g>
        <path
          d="M10 52 Q10 44 22 44 L80 44 Q94 48 94 52 Q94 56 80 60 L22 60 Q10 60 10 52 Z"
          fill={fill}
          {...LINE}
        />
        <path
          d="M40 44 L56 16 L66 16 L58 44 Z M40 60 L56 88 L66 88 L58 60 Z"
          fill={accent}
          {...LINE}
        />
        <path d="M14 44 L8 30 L18 30 L26 44 Z" fill={accent} {...LINE} />
        {[66, 74, 82].map((x) => (
          <circle key={x} cx={x} cy={52} r={2.5} fill={GLASS_C} {...LINE} strokeWidth={1.5} />
        ))}
      </g>
    );
  },
  kapal: ({ color }) => {
    const fill = tint(color, PALETTE.merah.fill);
    return (
      <g>
        <path
          d="M8 78 Q30 84 50 78 T92 78"
          fill="none"
          stroke="#2f80ed"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <path d="M14 56 L86 56 L76 76 L24 76 Z" fill={fill} {...LINE} />
        <rect x={30} y={36} width={40} height={20} rx={3} fill="#ffffff" {...LINE} />
        <rect x={52} y={20} width={10} height={16} fill={shade(fill, -0.2)} {...LINE} />
        {[38, 50, 62].map((x) => (
          <circle key={x} cx={x} cy={46} r={3} fill={GLASS_C} {...LINE} strokeWidth={1.5} />
        ))}
      </g>
    );
  },
  bus: ({ color }) => {
    const fill = tint(color, PALETTE.kuning.fill);
    return (
      <g>
        <rect x={10} y={24} width={80} height={52} rx={10} fill={fill} {...LINE} />
        {[18, 38, 58].map((x) => (
          <rect
            key={x}
            x={x}
            y={32}
            width={16}
            height={16}
            rx={3}
            fill={GLASS_C}
            {...LINE}
            strokeWidth={2}
          />
        ))}
        <rect
          x={76}
          y={32}
          width={10}
          height={30}
          rx={2}
          fill={GLASS_C}
          {...LINE}
          strokeWidth={2}
        />
        <circle cx={28} cy={78} r={9} fill={OUTLINE} />
        <circle cx={72} cy={78} r={9} fill={OUTLINE} />
        <circle cx={28} cy={78} r={3} fill="#c3cad6" />
        <circle cx={72} cy={78} r={3} fill="#c3cad6" />
      </g>
    );
  },
  kereta: ({ color }) => {
    const fill = tint(color, PALETTE.biru.fill);
    return (
      <g>
        <path d="M6 88 H94" stroke={OUTLINE} strokeWidth={3} />
        <rect x={10} y={30} width={56} height={46} rx={8} fill={fill} {...LINE} />
        <path d="M66 44 H84 Q92 44 92 54 V76 H66 Z" fill={shade(fill, -0.15)} {...LINE} />
        <rect x={74} y={30} width={8} height={14} fill={OUTLINE} />
        <circle cx={80} cy={22} r={5} fill="#e4e7ee" {...LINE} strokeWidth={2} />
        <path d="M92 70 L98 80 H88 Z" fill={shade(fill, -0.3)} {...LINE} strokeWidth={2} />
        {[18, 38].map((x) => (
          <rect
            key={x}
            x={x}
            y={38}
            width={14}
            height={14}
            rx={3}
            fill={GLASS_C}
            {...LINE}
            strokeWidth={2}
          />
        ))}
        {[22, 50, 80].map((x) => (
          <circle key={x} cx={x} cy={80} r={7} fill={OUTLINE} />
        ))}
      </g>
    );
  },
  matahari: ({ color }) => {
    const fill = tint(color, '#ffcc2e');
    const rays = Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return (
        <path
          key={i}
          d={`M${50 + Math.cos(a) * 30} ${50 + Math.sin(a) * 30} L${50 + Math.cos(a) * 44} ${50 + Math.sin(a) * 44}`}
          stroke={shade(fill, -0.15)}
          strokeWidth={6}
          strokeLinecap="round"
        />
      );
    });
    return (
      <g>
        {rays}
        <circle cx={50} cy={50} r={24} fill={fill} {...LINE} />
        {eye(42, 46)}
        {eye(58, 46)}
        {smile(50, 56, 7)}
      </g>
    );
  },
  awan: ({ color }) => (
    <g>
      <path
        d="M24 74 C10 74 10 54 24 54 C24 38 44 34 50 46 C56 30 82 34 80 54 C94 54 94 74 80 74 Z"
        fill={tint(color, '#ffffff')}
        {...LINE}
      />
    </g>
  ),
  bulan: ({ color }) => (
    <g>
      <path
        d="M62 14 C36 18 26 50 40 72 C52 88 76 88 88 76 C64 78 46 58 52 36 C54 26 58 18 62 14 Z"
        fill={tint(color, '#ffe68f')}
        {...LINE}
      />
      <circle cx={24} cy={28} r={3} fill="#ffcc2e" />
      <circle cx={18} cy={60} r={2} fill="#ffcc2e" />
    </g>
  ),
  payung: ({ color }) => {
    const fill = tint(color, PALETTE.ungu.fill);
    return (
      <g>
        <path
          d="M10 50 Q50 0 90 50 Q83 44 76 50 Q70 44 63 50 Q57 44 50 50 Q43 44 37 50 Q30 44 24 50 Q17 44 10 50 Z"
          fill={fill}
          {...LINE}
        />
        <path d="M50 50 V82 Q50 90 42 90 Q36 90 36 84" fill="none" {...LINE} strokeWidth={4} />
        <path d="M50 10 V4" {...LINE} />
      </g>
    );
  },
  api: ({ color }) => (
    <g>
      <path
        d="M22 88 L78 72 M22 72 L78 88"
        stroke="#8a5a3c"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <path
        d="M50 12 C64 30 76 40 72 60 C70 74 60 80 50 80 C38 80 28 72 28 58 C28 44 40 40 42 26 C48 34 50 40 50 46 C56 38 54 24 50 12 Z"
        fill={tint(color, '#ff8a2a')}
        {...LINE}
      />
      <path d="M50 46 C58 54 60 62 56 70 C52 76 44 74 44 66 C44 58 50 56 50 46 Z" fill="#ffcc2e" />
    </g>
  ),
  'es-batu': ({ color }) => (
    <g>
      <path
        d="M20 36 L50 22 L80 36 L80 70 L50 84 L20 70 Z"
        fill={tint(color, '#cdeeff')}
        {...LINE}
      />
      <path d="M20 36 L50 50 L80 36 M50 50 V84" fill="none" {...LINE} strokeWidth={2} />
      <path d="M30 42 l8 4" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  // Ketupat lebaran: anyaman janur berbentuk belah ketupat (D-069, soal bangun datar EMC TK).
  ketupat: ({ color }) => {
    const fill = tint(color, '#9ccc4a');
    return (
      <g>
        <path
          d="M50 18 C44 10 38 8 30 8 M50 18 C56 10 62 8 70 8"
          fill="none"
          stroke={shade(fill, -0.3)}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <polygon points="50,18 82,54 50,90 18,54" fill={fill} {...LINE} />
        <path
          d="M28.7 42 L60.7 78 M39.3 30 L71.3 66 M28.7 66 L60.7 30 M39.3 78 L71.3 42"
          stroke={shade(fill, -0.3)}
          strokeWidth={2.5}
        />
        <path
          d="M44 30 L34 42"
          stroke="#ffffff"
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.7}
        />
      </g>
    );
  },
} satisfies Record<string, ObjectArt>;

const GLASS_C = '#bfe6ff';
