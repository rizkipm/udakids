import type { JSX } from 'react';
import { LINE } from './draw';
import { OUTLINE, PALETTE, shade, tint } from './palette';
import type { ObjectArt } from './objects';

const PINK = '#ff9ec7';
const SKIN = '#f6c79a';
const HAIR = '#5a3a26';
const eye = (x: number, y: number, r = 3) => <circle cx={x} cy={y} r={r} fill={OUTLINE} />;

/** Lengan/kaki: garis tebal bergaris tepi. */
const limb = (d: string, fill: string, width = 7) => (
  <>
    <path d={d} fill="none" stroke={OUTLINE} strokeWidth={width + 5} strokeLinecap="round" />
    <path d={d} fill="none" stroke={fill} strokeWidth={width} strokeLinecap="round" />
  </>
);

/** Kepala anak (rambut + wajah tersenyum) di (x, y). */
const kidHead = (x: number, y: number, mouth: 'smile' | 'open' | 'closed' = 'smile') => (
  <g>
    <circle cx={x} cy={y} r={12} fill={SKIN} {...LINE} />
    <path
      d={`M${x - 12} ${y - 2} C${x - 12} ${y - 16} ${x + 12} ${y - 16} ${x + 12} ${y - 2} C${x + 6} ${y - 8} ${x - 6} ${y - 8} ${x - 12} ${y - 2} Z`}
      fill={HAIR}
      {...LINE}
      strokeWidth={2}
    />
    {mouth === 'closed' ? (
      <path
        d={`M${x - 7} ${y + 1} q3 2 6 0 M${x + 1} ${y + 1} q3 2 6 0`}
        fill="none"
        {...LINE}
        strokeWidth={2}
      />
    ) : (
      <>
        {eye(x - 4, y + 1, 2)}
        {eye(x + 4, y + 1, 2)}
      </>
    )}
    {mouth === 'open' ? (
      <ellipse cx={x} cy={y + 7} rx={3} ry={3.5} fill={OUTLINE} />
    ) : (
      <path
        d={`M${x - 4} ${y + 6} Q${x} ${y + 9} ${x + 4} ${y + 6}`}
        fill="none"
        {...LINE}
        strokeWidth={2}
      />
    )}
  </g>
);

/** Wajah bulat untuk kata perasaan. */
const face = (fill: string, features: JSX.Element) => (
  <g>
    <circle cx={50} cy={52} r={38} fill={fill} {...LINE} />
    <circle cx={30} cy={62} r={5} fill={PINK} opacity={0.7} />
    <circle cx={70} cy={62} r={5} fill={PINK} opacity={0.7} />
    {features}
  </g>
);

/**
 * Ilustrasi tambahan untuk buku English Pra-TK (D-058): kata bergambar untuk huruf yang belum punya
 * gambar, rima, vokal pendek, perasaan, dan kata kerja. Kotak 100×100, garis tepi tebal.
 */
export const ENGLISH_OBJECT_ART = {
  igloo: ({ color }) => {
    const fill = tint(color, '#eaf6ff');
    return (
      <g>
        <path d="M12 82 C12 34 88 34 88 82 Z" fill={fill} {...LINE} />
        <path
          d="M15 70 H85 M23 58 H77 M30 82 V70 M50 82 V70 M40 70 V58 M62 70 V58"
          fill="none"
          {...LINE}
          strokeWidth={2}
        />
        <path d="M60 82 C60 66 82 66 82 82 Z" fill={shade(fill, -0.35)} {...LINE} />
      </g>
    );
  },
  selai: ({ color }) => {
    const fill = tint(color, PALETTE.ungu.fill);
    return (
      <g>
        <rect x={26} y={34} width={48} height={52} rx={10} fill={fill} {...LINE} />
        <rect x={22} y={20} width={56} height={16} rx={5} fill="#f2c94c" {...LINE} />
        <rect
          x={34}
          y={50}
          width={32}
          height={22}
          rx={4}
          fill="#ffffff"
          {...LINE}
          strokeWidth={2}
        />
        <circle cx={50} cy={61} r={6} fill={fill} />
      </g>
    );
  },
  kunci: ({ color }) => {
    const fill = tint(color, '#f2c94c');
    return (
      <g>
        <circle cx={30} cy={50} r={18} fill={fill} {...LINE} />
        <circle cx={30} cy={50} r={7} fill="#ffffff" {...LINE} />
        <path d="M46 44 H88 V56 H82 V66 H74 V56 H66 V64 H58 V56 H46 Z" fill={fill} {...LINE} />
      </g>
    );
  },
  sarang: ({ color }) => {
    const fill = tint(color, '#b07a45');
    return (
      <g>
        <ellipse cx={34} cy={52} rx={9} ry={12} fill="#cfe9ff" {...LINE} />
        <ellipse cx={50} cy={48} rx={9} ry={12} fill="#cfe9ff" {...LINE} />
        <ellipse cx={66} cy={52} rx={9} ry={12} fill="#cfe9ff" {...LINE} />
        <path d="M12 56 C14 86 86 86 88 56 Z" fill={fill} {...LINE} />
        <path
          d="M18 62 Q34 70 50 62 Q66 70 82 62 M24 72 Q40 78 56 72 Q68 78 78 70"
          fill="none"
          stroke={shade(fill, -0.35)}
          strokeWidth={3}
          strokeLinecap="round"
        />
      </g>
    );
  },
  van: ({ color }) => {
    const fill = tint(color, PALETTE.biru.fill);
    return (
      <g>
        <path
          d="M10 70 V36 C10 30 14 26 20 26 H66 C72 26 76 30 80 36 L90 52 V70 Z"
          fill={fill}
          {...LINE}
        />
        <path d="M66 32 L76 52 H60 V32 Z" fill="#cfe9ff" {...LINE} strokeWidth={2} />
        <rect
          x={18}
          y={34}
          width={16}
          height={14}
          rx={2}
          fill="#cfe9ff"
          {...LINE}
          strokeWidth={2}
        />
        <rect
          x={38}
          y={34}
          width={16}
          height={14}
          rx={2}
          fill="#cfe9ff"
          {...LINE}
          strokeWidth={2}
        />
        <circle cx={28} cy={72} r={9} fill={OUTLINE} />
        <circle cx={28} cy={72} r={4} fill="#c3cad6" />
        <circle cx={72} cy={72} r={9} fill={OUTLINE} />
        <circle cx={72} cy={72} r={4} fill="#c3cad6" />
      </g>
    );
  },
  biola: ({ color }) => {
    const fill = tint(color, '#c06a2b');
    return (
      <g>
        <path d="M58 40 L80 12" {...LINE} strokeWidth={7} />
        <path d="M76 10 q8 -4 10 4 q-2 6 -8 4" fill="#8a5a3c" {...LINE} strokeWidth={2} />
        <path
          d="M56 36 C66 40 70 52 62 58 C70 66 66 82 52 86 C38 90 18 80 22 64 C24 56 30 54 34 56 C30 48 34 36 44 34 C48 33 52 34 56 36 Z"
          fill={fill}
          {...LINE}
        />
        <path d="M40 58 q2 6 -2 10 M52 50 q-2 6 2 10" fill="none" {...LINE} strokeWidth={2} />
        <path d="M34 80 L64 42 M37 82 L67 44" stroke="#f4e3c3" strokeWidth={1.5} />
        <rect
          x={38}
          y={68}
          width={12}
          height={4}
          rx={1}
          transform="rotate(-52 44 70)"
          fill={OUTLINE}
        />
      </g>
    );
  },
  xilofon: ({ color }) => {
    const bars = [
      PALETTE.merah.fill,
      PALETTE.oranye.fill,
      PALETTE.kuning.fill,
      PALETTE.hijau.fill,
      PALETTE.biru.fill,
      PALETTE.ungu.fill,
    ];
    return (
      <g>
        <path
          d="M10 40 L90 30 M10 74 L90 64"
          stroke="#8a5a3c"
          strokeWidth={5}
          strokeLinecap="round"
        />
        {bars.map((c, i) => (
          <rect
            key={c}
            x={14 + i * 12.5}
            y={26 + i * 1.8}
            width={10}
            height={56 - i * 5}
            rx={3}
            fill={color ? tint(color, c) : c}
            {...LINE}
            strokeWidth={2}
          />
        ))}
        <path d="M70 90 L88 76" stroke={OUTLINE} strokeWidth={3} strokeLinecap="round" />
        <circle cx={88} cy={76} r={5} fill={PINK} {...LINE} strokeWidth={2} />
      </g>
    );
  },
  yoyo: ({ color }) => {
    const fill = tint(color, PALETTE.merah.fill);
    return (
      <g>
        <path d="M50 8 V36" stroke={OUTLINE} strokeWidth={3} />
        <circle cx={50} cy={62} r={28} fill={fill} {...LINE} />
        <circle cx={50} cy={62} r={18} fill={shade(fill, 0.35)} {...LINE} strokeWidth={2} />
        <circle cx={50} cy={62} r={5} fill={OUTLINE} />
      </g>
    );
  },
  zebra: ({ color }) => {
    const fill = tint(color, '#ffffff');
    return (
      <g>
        <rect x={14} y={44} width={54} height={28} rx={13} fill={fill} {...LINE} />
        {[20, 32, 46, 56].map((x) => (
          <rect key={x} x={x} y={66} width={7} height={22} rx={3} fill={fill} {...LINE} />
        ))}
        <path d="M56 50 L66 26 L80 30 L70 56 Z" fill={fill} {...LINE} />
        <ellipse
          cx={80}
          cy={30}
          rx={10}
          ry={15}
          transform="rotate(50 80 30)"
          fill={fill}
          {...LINE}
        />
        <ellipse cx={88} cy={36} rx={6} ry={5} fill="#9a9aa8" {...LINE} strokeWidth={2} />
        <path d="M70 18 L68 8 L76 14 Z" fill={fill} {...LINE} strokeWidth={2} />
        <path d="M64 28 L70 14" stroke={OUTLINE} strokeWidth={5} strokeLinecap="round" />
        <path
          d="M24 45 q4 13 0 26 M36 44 q4 14 0 28 M48 44 q4 14 0 28 M62 36 l10 4 M60 44 l10 4 M76 24 l6 6"
          fill="none"
          stroke={OUTLINE}
          strokeWidth={4}
          strokeLinecap="round"
        />
        {eye(80, 26)}
        <path d="M14 50 L6 64" {...LINE} strokeWidth={4} />
      </g>
    );
  },
  anjing: ({ color }) => {
    const fill = tint(color, '#d9a066');
    return (
      <g>
        <rect x={20} y={50} width={50} height={26} rx={12} fill={fill} {...LINE} />
        {[26, 38, 52, 62].map((x) => (
          <rect key={x} x={x} y={70} width={7} height={18} rx={3} fill={fill} {...LINE} />
        ))}
        <path d="M20 56 Q8 48 12 38" fill="none" {...LINE} strokeWidth={5} />
        <circle cx={70} cy={40} r={18} fill={fill} {...LINE} />
        <path
          d="M56 30 C48 34 50 54 58 50 Z M84 30 C92 34 90 54 82 50 Z"
          fill={shade(fill, -0.35)}
          {...LINE}
        />
        <ellipse cx={70} cy={50} rx={9} ry={6} fill={shade(fill, 0.4)} {...LINE} strokeWidth={2} />
        <ellipse cx={70} cy={46} rx={4} ry={3} fill={OUTLINE} />
        {eye(63, 36)}
        {eye(77, 36)}
      </g>
    );
  },
  rumah: ({ color }) => {
    const fill = tint(color, PALETTE.kuning.fill);
    return (
      <g>
        <rect x={20} y={46} width={60} height={42} fill={fill} {...LINE} />
        <path d="M12 48 L50 14 L88 48 Z" fill={PALETTE.merah.fill} {...LINE} />
        <rect x={42} y={62} width={16} height={26} fill="#a8683a" {...LINE} />
        <rect x={26} y={56} width={12} height={12} fill="#cfe9ff" {...LINE} strokeWidth={2} />
        <rect x={62} y={56} width={12} height={12} fill="#cfe9ff" {...LINE} strokeWidth={2} />
      </g>
    );
  },
  tikus: ({ color }) => {
    const fill = tint(color, '#b8b8c8');
    return (
      <g>
        <path d="M20 70 C6 70 6 86 22 84" fill="none" {...LINE} strokeWidth={3} />
        <path
          d="M20 74 C20 52 40 42 60 50 L82 66 C84 72 80 76 74 76 H24 C21 76 20 75 20 74 Z"
          fill={fill}
          {...LINE}
        />
        <circle cx={58} cy={44} r={11} fill={fill} {...LINE} />
        <circle cx={58} cy={44} r={6} fill={PINK} />
        <circle cx={84} cy={67} r={3.5} fill={PINK} {...LINE} strokeWidth={1.5} />
        {eye(70, 60)}
      </g>
    );
  },
  ular: ({ color }) => {
    const fill = tint(color, PALETTE.hijau.fill);
    return (
      <g>
        <path
          d="M14 78 C14 64 40 64 40 74 C40 84 64 84 64 70 C64 56 40 58 40 44 C40 30 62 26 70 34"
          fill="none"
          stroke={OUTLINE}
          strokeWidth={16}
          strokeLinecap="round"
        />
        <path
          d="M14 78 C14 64 40 64 40 74 C40 84 64 84 64 70 C64 56 40 58 40 44 C40 30 62 26 70 34"
          fill="none"
          stroke={fill}
          strokeWidth={10}
          strokeLinecap="round"
        />
        <ellipse cx={74} cy={36} rx={12} ry={9} fill={fill} {...LINE} />
        <path
          d="M86 38 l8 0 m-3 0 l3 -3 m-3 3 l3 3"
          fill="none"
          stroke={PALETTE.merah.fill}
          strokeWidth={2}
          strokeLinecap="round"
        />
        {eye(76, 32)}
      </g>
    );
  },
  rubah: ({ color }) => {
    const fill = tint(color, PALETTE.oranye.fill);
    return (
      <g>
        <path d="M24 60 C6 60 4 84 22 84 C30 84 32 76 30 70" fill={fill} {...LINE} />
        <path d="M8 76 C12 84 20 86 24 82" fill="#ffffff" />
        <ellipse cx={46} cy={70} rx={20} ry={16} fill={fill} {...LINE} />
        <path d="M44 22 L50 40 L36 40 Z M82 22 L76 40 L90 40 Z" fill={fill} {...LINE} />
        <path
          d="M38 38 C40 56 56 66 64 66 C72 66 88 56 90 38 C80 32 48 32 38 38 Z"
          fill={fill}
          {...LINE}
        />
        <path
          d="M50 50 C56 62 72 62 78 50 C72 58 56 58 50 50 Z"
          fill="#ffffff"
          {...LINE}
          strokeWidth={2}
        />
        <circle cx={64} cy={60} r={3} fill={OUTLINE} />
        {eye(54, 44)}
        {eye(74, 44)}
      </g>
    );
  },
  telur: ({ color }) => {
    const fill = tint(color, '#fff6e6');
    return (
      <g>
        <path
          d="M50 10 C70 10 82 44 82 62 C82 80 68 90 50 90 C32 90 18 80 18 62 C18 44 30 10 50 10 Z"
          fill={fill}
          {...LINE}
        />
        <path
          d="M34 34 Q38 24 46 22"
          fill="none"
          stroke="#ffffff"
          strokeWidth={5}
          strokeLinecap="round"
        />
      </g>
    );
  },
  ranjang: ({ color }) => {
    const fill = tint(color, PALETTE.biru.fill);
    return (
      <g>
        <rect x={8} y={30} width={10} height={58} rx={3} fill="#a8683a" {...LINE} />
        <rect x={82} y={50} width={10} height={38} rx={3} fill="#a8683a" {...LINE} />
        <rect x={14} y={58} width={74} height={16} rx={3} fill="#ffffff" {...LINE} />
        <rect x={20} y={46} width={20} height={14} rx={6} fill="#ffffff" {...LINE} />
        <path d="M38 52 H86 V74 H38 Z" fill={fill} {...LINE} />
        <path d="M14 74 H88" {...LINE} />
      </g>
    );
  },
  babi: ({ color }) => {
    const fill = tint(color, '#ffb3cc');
    return (
      <g>
        <ellipse cx={46} cy={60} rx={30} ry={22} fill={fill} {...LINE} />
        {[24, 36, 54, 64].map((x) => (
          <rect key={x} x={x} y={74} width={8} height={14} rx={3} fill={fill} {...LINE} />
        ))}
        <path d="M16 54 q-8 -4 -4 -10 q6 2 2 8" fill="none" {...LINE} strokeWidth={2.5} />
        <circle cx={72} cy={46} r={17} fill={fill} {...LINE} />
        <path d="M62 32 L60 20 L70 28 Z M82 32 L86 20 L76 28 Z" fill={fill} {...LINE} />
        <ellipse
          cx={78}
          cy={52}
          rx={8}
          ry={6}
          fill={shade(fill, -0.15)}
          {...LINE}
          strokeWidth={2}
        />
        <circle cx={75} cy={52} r={1.8} fill={OUTLINE} />
        <circle cx={81} cy={52} r={1.8} fill={OUTLINE} />
        {eye(68, 42)}
        {eye(80, 40)}
      </g>
    );
  },
  'wajah-senang': ({ color }) =>
    face(
      tint(color, PALETTE.kuning.fill),
      <>
        {eye(37, 44, 4)}
        {eye(63, 44, 4)}
        <path d="M32 62 Q50 82 68 62 Z" fill={OUTLINE} />
        <path
          d="M40 70 Q50 76 60 70"
          fill="none"
          stroke={PINK}
          strokeWidth={4}
          strokeLinecap="round"
        />
      </>,
    ),
  'wajah-sedih': ({ color }) =>
    face(
      tint(color, PALETTE.kuning.fill),
      <>
        <path d="M30 38 L42 42 M70 38 L58 42" {...LINE} />
        {eye(37, 48, 4)}
        {eye(63, 48, 4)}
        <path d="M36 74 Q50 62 64 74" fill="none" {...LINE} strokeWidth={4} />
        <path d="M66 54 C62 62 70 66 70 60 Z" fill="#5fb7ff" {...LINE} strokeWidth={1.5} />
      </>,
    ),
  'wajah-marah': ({ color }) =>
    face(
      tint(color, PALETTE.oranye.light),
      <>
        <path d="M28 34 L44 42 M72 34 L56 42" {...LINE} strokeWidth={4} />
        {eye(38, 48, 4)}
        {eye(62, 48, 4)}
        <path d="M36 72 Q50 64 64 72" fill="none" {...LINE} strokeWidth={4} />
      </>,
    ),
  'wajah-takut': ({ color }) =>
    face(
      tint(color, '#dff3ff'),
      <>
        <path d="M30 36 Q36 30 44 34 M56 34 Q64 30 70 36" fill="none" {...LINE} />
        <circle cx={38} cy={47} r={6} fill="#ffffff" {...LINE} strokeWidth={2} />
        <circle cx={62} cy={47} r={6} fill="#ffffff" {...LINE} strokeWidth={2} />
        {eye(38, 47, 2.5)}
        {eye(62, 47, 2.5)}
        <path d="M36 72 l5 -4 l5 4 l4 -4 l5 4 l5 -4" fill="none" {...LINE} strokeWidth={2.5} />
        <path
          d="M18 40 q-4 6 0 10 M82 40 q4 6 0 10"
          fill="none"
          stroke="#5fb7ff"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </>,
    ),
  'wajah-ngantuk': ({ color }) =>
    face(
      tint(color, PALETTE.ungu.light),
      <>
        <path d="M30 48 Q37 53 44 48 M56 48 Q63 53 70 48" fill="none" {...LINE} strokeWidth={3.5} />
        <ellipse cx={50} cy={70} rx={6} ry={7} fill={OUTLINE} />
        <path
          d="M72 14 h10 l-10 10 h10 M86 4 h6 l-6 6 h6"
          fill="none"
          {...LINE}
          strokeWidth={2.5}
        />
      </>,
    ),
  'anak-lari': ({ color }) => {
    const shirt = tint(color, PALETTE.biru.fill);
    return (
      <g>
        <path
          d="M14 70 H26 M8 58 H22 M14 46 H24"
          stroke={OUTLINE}
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.6}
        />
        {limb('M48 60 L36 74 L26 72', '#5b6b8a')}
        {limb('M52 60 L60 76 L70 86', '#5b6b8a')}
        {limb('M48 40 L34 50 L30 40', SKIN, 6)}
        {limb('M56 40 L66 48 L76 40', SKIN, 6)}
        <path d="M42 36 C42 30 60 30 60 36 L58 62 H44 Z" fill={shirt} {...LINE} />
        {kidHead(54, 20)}
      </g>
    );
  },
  'anak-lompat': ({ color }) => {
    const shirt = tint(color, PALETTE.hijau.fill);
    return (
      <g>
        <ellipse cx={50} cy={92} rx={20} ry={4} fill={OUTLINE} opacity={0.2} />
        <path
          d="M30 84 q-4 -6 0 -12 M70 84 q4 -6 0 -12"
          fill="none"
          stroke={OUTLINE}
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.6}
        />
        {limb('M45 58 L38 70 L44 78', '#5b6b8a')}
        {limb('M55 58 L62 70 L56 78', '#5b6b8a')}
        {limb('M44 38 L32 26 L28 14', SKIN, 6)}
        {limb('M56 38 L68 26 L72 14', SKIN, 6)}
        <path d="M41 34 C41 28 59 28 59 34 L57 60 H43 Z" fill={shirt} {...LINE} />
        {kidHead(50, 20, 'open')}
      </g>
    );
  },
  'anak-makan': ({ color }) => {
    const shirt = tint(color, PALETTE.oranye.fill);
    return (
      <g>
        {limb('M44 72 L42 90', '#5b6b8a')}
        {limb('M56 72 L58 90', '#5b6b8a')}
        <path d="M38 44 C38 36 62 36 62 44 L60 74 H40 Z" fill={shirt} {...LINE} />
        {limb('M42 46 L34 60', SKIN, 6)}
        {kidHead(50, 24, 'open')}
        {limb('M58 46 Q74 50 68 38', SKIN, 6)}
        <path d="M68 38 L56 32" stroke="#c3cad6" strokeWidth={3} strokeLinecap="round" />
        <ellipse cx={55} cy={32} rx={4} ry={2.5} fill="#c3cad6" {...LINE} strokeWidth={1.5} />
        <ellipse cx={26} cy={66} rx={14} ry={5} fill="#ffffff" {...LINE} />
        <circle cx={26} cy={62} r={6} fill={PALETTE.merah.fill} {...LINE} strokeWidth={2} />
      </g>
    );
  },
  'anak-tidur': ({ color }) => {
    const blanket = tint(color, PALETTE.ungu.fill);
    return (
      <g>
        <rect x={8} y={60} width={84} height={14} rx={4} fill="#ffffff" {...LINE} />
        <rect x={10} y={48} width={22} height={14} rx={6} fill="#ffffff" {...LINE} />
        <path d="M34 62 C34 46 90 46 90 62 Z" fill={blanket} {...LINE} />
        {kidHead(26, 48, 'closed')}
        <path d="M44 22 h8 l-8 8 h8 M58 10 h6 l-6 6 h6" fill="none" {...LINE} strokeWidth={2.5} />
        <path d="M10 74 V88 M90 74 V88" {...LINE} strokeWidth={5} />
      </g>
    );
  },
  'anak-berenang': ({ color }) => {
    const cap = tint(color, PALETTE.merah.fill);
    return (
      <g>
        <path d="M6 56 H94 V92 H6 Z" fill="#8fd0ff" />
        {limb('M40 54 L24 40 L14 46', SKIN, 6)}
        {limb('M60 56 L76 44 L86 50', SKIN, 6)}
        <circle cx={50} cy={50} r={12} fill={SKIN} {...LINE} />
        <path d="M38 48 C38 34 62 34 62 48 Z" fill={cap} {...LINE} />
        {eye(45, 52, 2)}
        {eye(55, 52, 2)}
        <path
          d="M6 62 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0"
          fill="none"
          stroke="#2f80ed"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path
          d="M14 78 q8 -5 16 0 t16 0 M58 82 q8 -5 16 0 t16 0"
          fill="none"
          stroke="#2f80ed"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </g>
    );
  },
  'anak-membaca': ({ color }) => {
    const book = tint(color, PALETTE.merah.fill);
    return (
      <g>
        {limb('M40 74 L60 76 L74 88', '#5b6b8a')}
        <path d="M36 46 C36 38 56 38 56 46 L58 76 H36 Z" fill={PALETTE.kuning.fill} {...LINE} />
        {kidHead(46, 26)}
        <path d="M50 56 L64 50 L80 56 L80 76 L64 70 L50 76 Z" fill="#ffffff" {...LINE} />
        <path d="M50 56 L64 50 L64 70 L50 76 Z" fill={book} {...LINE} />
        <path d="M64 50 V70" {...LINE} strokeWidth={2} />
        {limb('M42 52 L52 66', SKIN, 6)}
      </g>
    );
  },
  'anak-menyanyi': ({ color }) => {
    const shirt = tint(color, PALETTE.ungu.fill);
    return (
      <g>
        {limb('M44 70 L42 90', '#5b6b8a')}
        {limb('M56 70 L58 90', '#5b6b8a')}
        <path d="M38 42 C38 34 62 34 62 42 L60 72 H40 Z" fill={shirt} {...LINE} />
        {limb('M42 44 L34 58 L44 66', SKIN, 6)}
        {limb('M58 44 L70 34 L78 24', SKIN, 6)}
        {kidHead(50, 22, 'open')}
        <path d="M74 12 V26 M74 12 L84 10 V22" fill="none" {...LINE} strokeWidth={2.5} />
        <ellipse cx={71} cy={27} rx={4} ry={3} fill={OUTLINE} />
        <ellipse cx={81} cy={23} rx={4} ry={3} fill={OUTLINE} />
        <path d="M16 20 V32" {...LINE} strokeWidth={2.5} />
        <ellipse cx={13} cy={33} rx={4} ry={3} fill={OUTLINE} />
      </g>
    );
  },
  'anak-duduk': ({ color }) => {
    const shirt = tint(color, PALETTE.hijau.fill);
    return (
      <g>
        <rect x={20} y={62} width={44} height={8} rx={2} fill="#c98a4b" {...LINE} />
        <path d="M24 70 V90 M60 70 V90 M22 62 V30" {...LINE} strokeWidth={5} />
        {limb('M40 60 L62 60 L64 84', '#5b6b8a')}
        <path d="M30 36 C30 28 50 28 50 36 L50 62 H32 Z" fill={shirt} {...LINE} />
        {limb('M46 40 L58 50 L66 46', SKIN, 6)}
        {kidHead(40, 18)}
      </g>
    );
  },
} satisfies Record<string, ObjectArt>;
