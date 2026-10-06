import type { BodyPart } from '@little-coder/engine';
import { LINE } from './draw';
import { OUTLINE, PALETTE, shade, tint } from './palette';
import type { ObjectArt } from './objects';
import './anim.css';

/**
 * Ilustrasi ESC Sains TK (D-070): hewan laut & makanan hewan, kendaraan, alat kebersihan, benda alam, api &
 * air, dan anak memakai pancaindra. Kotak 100×100, garis tepi tebal, animasi ringan lewat kelas `va-*`.
 */

const SKIN = '#f6c79a';
const HAIR = '#5a3a26';
const LEAF = '#3fae5a';
const WATER = '#6cc4ff';
const WOOD = '#c98a4b';
const eye = (x: number, y: number, r = 3) => <circle cx={x} cy={y} r={r} fill={OUTLINE} />;
const smile = (x: number, y: number, w = 5) => (
  <path
    d={`M${x - w} ${y} Q${x} ${y + w * 0.8} ${x + w} ${y}`}
    fill="none"
    {...LINE}
    strokeWidth={2.2}
  />
);
/** Lengan/kaki: garis tebal bergaris tepi. */
const limb = (d: string, fill: string, width = 7) => (
  <>
    <path d={d} fill="none" stroke={OUTLINE} strokeWidth={width + 5} strokeLinecap="round" />
    <path d={d} fill="none" stroke={fill} strokeWidth={width} strokeLinecap="round" />
  </>
);
/** Kepala anak di (x, y), radius r. */
const kidHead = (x: number, y: number, r = 14) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={SKIN} {...LINE} />
    <path
      d={`M${x - r} ${y - 2} C${x - r} ${y - r - 6} ${x + r} ${y - r - 6} ${x + r} ${y - 2} C${x + r / 2} ${y - r / 1.6} ${x - r / 2} ${y - r / 1.6} ${x - r} ${y - 2} Z`}
      fill={HAIR}
      {...LINE}
      strokeWidth={2}
    />
  </g>
);
const drop = (x: number, y: number, s = 1, fill = WATER) => (
  <path
    d={`M${x} ${y} c${-4 * s} ${6 * s} ${-5 * s} ${9 * s} 0 ${11 * s} c${5 * s} ${-2 * s} ${4 * s} ${-5 * s} 0 ${-11 * s} Z`}
    fill={fill}
    {...LINE}
    strokeWidth={1.5}
  />
);
const flame = (x: number, y: number, s = 1) => (
  <g className="va-flicker">
    <path
      d={`M${x} ${y - 30 * s} C${x + 10 * s} ${y - 18 * s} ${x + 14 * s} ${y - 10 * s} ${x + 12 * s} ${y - 2 * s} C${x + 10 * s} ${y + 4 * s} ${x - 10 * s} ${y + 4 * s} ${x - 12 * s} ${y - 2 * s} C${x - 14 * s} ${y - 12 * s} ${x - 4 * s} ${y - 16 * s} ${x} ${y - 30 * s} Z`}
      fill="#ff8a2a"
      {...LINE}
      strokeWidth={2.5}
    />
    <path
      d={`M${x} ${y - 16 * s} C${x + 6 * s} ${y - 8 * s} ${x + 6 * s} ${y} ${x} ${y} C${x - 6 * s} ${y} ${x - 6 * s} ${y - 8 * s} ${x} ${y - 16 * s} Z`}
      fill="#ffcc2e"
    />
  </g>
);
const wheel = (x: number, y: number, r = 11) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#3a3550" {...LINE} />
    <circle cx={x} cy={y} r={r * 0.4} fill="#c3cad6" />
  </g>
);

export const ESC_OBJECT_ART = {
  // ---------------------------------------------------------------- hewan
  paus: ({ color }) => {
    const fill = tint(color, '#4f8fe8');
    return (
      <g>
        <g className="va-spout">
          <path
            d="M38 26 C36 18 30 14 26 12 M38 26 V8 M38 26 C40 18 46 14 50 12"
            fill="none"
            stroke={WATER}
            strokeWidth={4}
            strokeLinecap="round"
          />
        </g>
        <g className="va-bob">
          <path
            d="M8 60 C8 40 26 30 46 32 C66 34 76 46 78 54 L90 42 C94 52 92 62 86 66 L94 76 C84 76 80 72 78 68 C72 80 56 86 40 86 C20 86 8 76 8 60 Z"
            fill={fill}
            {...LINE}
          />
          <path d="M12 66 C24 82 56 84 74 68 C62 78 30 82 12 66 Z" fill="#dff1ff" />
          {eye(28, 56, 3.5)}
          {smile(36, 64, 5)}
          <circle cx={22} cy={64} r={3} fill="#ff9ec7" opacity={0.8} />
        </g>
      </g>
    );
  },
  hiu: ({ color }) => {
    const fill = tint(color, '#8a9bb3');
    return (
      <g className="va-bob">
        <path d="M44 34 L52 12 L62 36 Z" fill={fill} {...LINE} />
        <path
          d="M6 54 C14 38 40 32 62 36 C74 38 82 44 86 50 L96 36 C96 50 94 58 96 70 L86 58 C80 66 66 72 50 72 C30 72 14 66 6 54 Z"
          fill={fill}
          {...LINE}
        />
        <path d="M8 56 C20 68 42 72 62 66 C44 70 22 66 8 56 Z" fill="#ffffff" />
        <path d="M48 70 L56 82 L60 68 Z" fill={fill} {...LINE} strokeWidth={2.5} />
        {eye(22, 48, 3.5)}
        <path d="M10 56 L14 60 L18 56 L22 60 L26 56 L30 60" fill="none" {...LINE} strokeWidth={2} />
        <path d="M36 48 v8 M40 47 v8 M44 46 v8" {...LINE} strokeWidth={2} />
      </g>
    );
  },
  gurita: ({ color }) => {
    const fill = tint(color, '#b77ce8');
    const arms = [16, 30, 44, 56, 70, 84];
    return (
      <g>
        <g className="va-sway">
          {arms.map((x, i) => (
            <path
              key={x}
              d={`M${50 + (x - 50) * 0.45} 58 C${x} 70 ${x + (i % 2 ? 8 : -8)} 82 ${x + (i % 2 ? -2 : 2)} 90`}
              fill="none"
              stroke={OUTLINE}
              strokeWidth={11}
              strokeLinecap="round"
            />
          ))}
          {arms.map((x, i) => (
            <path
              key={`f${x}`}
              d={`M${50 + (x - 50) * 0.45} 58 C${x} 70 ${x + (i % 2 ? 8 : -8)} 82 ${x + (i % 2 ? -2 : 2)} 90`}
              fill="none"
              stroke={fill}
              strokeWidth={6}
              strokeLinecap="round"
            />
          ))}
        </g>
        <path
          d="M22 50 C22 22 78 22 78 50 C78 62 66 66 50 66 C34 66 22 62 22 50 Z"
          fill={fill}
          {...LINE}
        />
        <circle cx={38} cy={34} r={3} fill="#ffffff" opacity={0.7} />
        {eye(42, 48, 3.5)}
        {eye(58, 48, 3.5)}
        {smile(50, 55, 5)}
      </g>
    );
  },
  kepiting: ({ color }) => {
    const fill = tint(color, '#ef5b3c');
    return (
      <g>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <path d={`M30 ${60 + i * 6} L12 ${66 + i * 8}`} {...LINE} strokeWidth={4} />
            <path d={`M70 ${60 + i * 6} L88 ${66 + i * 8}`} {...LINE} strokeWidth={4} />
          </g>
        ))}
        <path d="M30 50 L18 34 M70 50 L82 34" {...LINE} strokeWidth={5} />
        <g className="va-bob">
          <path d="M8 28 C8 14 28 14 28 28 L20 24 Z" fill={fill} {...LINE} />
          <path d="M92 28 C92 14 72 14 72 28 L80 24 Z" fill={fill} {...LINE} />
        </g>
        <ellipse cx={50} cy={62} rx={26} ry={18} fill={fill} {...LINE} />
        <path d="M42 46 V36 M58 46 V36" {...LINE} strokeWidth={3} />
        <circle cx={42} cy={34} r={5} fill="#ffffff" {...LINE} strokeWidth={2} />
        <circle cx={58} cy={34} r={5} fill="#ffffff" {...LINE} strokeWidth={2} />
        {eye(42, 34, 2.2)}
        {eye(58, 34, 2.2)}
        {smile(50, 64, 6)}
      </g>
    );
  },
  penyu: ({ color }) => {
    const shell = tint(color, '#3f9e6a');
    const skin = '#9fd8a8';
    return (
      <g className="va-bob">
        <path d="M24 46 C10 36 4 40 6 48 C10 54 20 54 28 52 Z" fill={skin} {...LINE} />
        <path d="M30 70 C18 82 10 82 12 74 C14 68 22 66 30 64 Z" fill={skin} {...LINE} />
        <path d="M70 66 C82 80 90 78 88 70 C86 64 78 62 70 62 Z" fill={skin} {...LINE} />
        <path d="M74 50 C82 40 96 42 94 52 C92 60 80 60 74 58 Z" fill={skin} {...LINE} />
        {eye(86, 50, 2.5)}
        <path d="M18 60 C18 36 74 32 80 56 C76 72 24 76 18 60 Z" fill={shell} {...LINE} />
        <path
          d="M30 50 L40 44 L54 44 L64 50 L56 62 L38 62 Z M40 44 L36 36 M54 44 L58 36 M30 50 L22 54 M64 50 L74 54 M38 62 L32 70 M56 62 L62 70"
          fill="none"
          stroke={shade(shell, -0.35)}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
      </g>
    );
  },
  buaya: ({ color }) => {
    const fill = tint(color, '#5c9e3c');
    return (
      <g>
        <path
          d="M30 66 L24 82 M44 68 L44 84 M64 68 L66 84 M78 64 L86 78"
          {...LINE}
          strokeWidth={7}
        />
        <path
          d="M4 52 L30 46 C40 40 60 40 74 46 C84 50 92 54 98 64 C88 64 80 62 72 64 C56 70 36 70 28 64 L4 60 Z"
          fill={fill}
          {...LINE}
        />
        <path
          d="M6 56 L9 52 L12 56 L15 52 L18 56 L21 52 L24 56"
          fill="#ffffff"
          {...LINE}
          strokeWidth={1.5}
        />
        <path
          d="M38 44 l4 -5 l4 5 M50 42 l4 -5 l4 5 M62 43 l4 -5 l4 5 M74 47 l4 -4 l3 5"
          fill="none"
          {...LINE}
          strokeWidth={2.5}
        />
        <circle cx={28} cy={44} r={5} fill="#ffffff" {...LINE} strokeWidth={2} />
        {eye(29, 44, 2.2)}
      </g>
    );
  },
  ulat: ({ color }) => {
    const fill = tint(color, '#8bd14a');
    const xs = [22, 36, 50, 64];
    return (
      <g className="va-bob">
        <path d="M8 86 H94" stroke={WOOD} strokeWidth={6} strokeLinecap="round" />
        {xs.map((x, i) => (
          <circle key={x} cx={x} cy={70 - (i % 2) * 6} r={11} fill={fill} {...LINE} />
        ))}
        <circle cx={78} cy={58} r={14} fill={fill} {...LINE} />
        <path d="M74 46 L70 34 M84 46 L90 36" {...LINE} strokeWidth={2.5} />
        <circle cx={70} cy={33} r={3} fill={OUTLINE} />
        <circle cx={90} cy={35} r={3} fill={OUTLINE} />
        {eye(74, 56, 2.5)}
        {eye(84, 56, 2.5)}
        {smile(79, 63, 4)}
        {xs.map((x, i) => (
          <path
            key={`k${x}`}
            d={`M${x - 4} ${80 - (i % 2) * 6} v6 M${x + 4} ${80 - (i % 2) * 6} v6`}
            {...LINE}
            strokeWidth={2.5}
          />
        ))}
      </g>
    );
  },
  'lumba-lumba': ({ color }) => {
    const fill = tint(color, '#5aa4d8');
    return (
      <g className="va-bob">
        <path
          d="M10 62 C16 40 40 26 64 30 L70 18 L76 32 C86 36 92 46 94 54 C86 52 80 54 76 58 C66 70 46 74 30 70 L22 82 L18 68 C14 66 12 64 10 62 Z"
          fill={fill}
          {...LINE}
        />
        <path d="M14 64 C30 70 54 70 72 60 C58 72 30 74 14 64 Z" fill="#e8f4ff" />
        <path d="M76 56 C84 58 90 58 96 56" fill="none" {...LINE} strokeWidth={2.5} />
        {eye(74, 46, 3)}
        <path d="M44 56 L54 66 L58 54 Z" fill={fill} {...LINE} strokeWidth={2.5} />
      </g>
    );
  },
  // ---------------------------------------------------------------- makanan hewan
  daun: ({ color }) => {
    const fill = tint(color, LEAF);
    return (
      <g className="va-sway">
        <path d="M18 86 C10 50 40 14 88 12 C90 56 60 88 18 86 Z" fill={fill} {...LINE} />
        <path
          d="M18 86 C40 62 60 40 86 14 M38 66 L34 46 M50 54 L48 34 M62 42 L62 26 M38 66 L58 66 M50 54 L70 52 M62 42 L78 38"
          fill="none"
          stroke={shade(fill, -0.3)}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </g>
    );
  },
  rumput: ({ color }) => {
    const fill = tint(color, LEAF);
    const blades = [
      'M14 88 C14 66 10 52 4 40 C18 52 22 68 22 88',
      'M24 88 C26 60 30 40 40 22 C36 46 34 66 34 88',
      'M38 88 C40 62 46 46 58 36 C52 54 48 70 48 88',
      'M50 88 C52 58 62 36 76 26 C68 48 62 68 60 88',
      'M62 88 C66 66 76 54 92 48 C82 60 76 74 74 88',
    ];
    return (
      <g>
        <ellipse cx={50} cy={88} rx={44} ry={6} fill="#c7a77b" {...LINE} strokeWidth={2} />
        <g className="va-sway">
          {blades.map((d) => (
            <path key={d} d={`${d} Z`} fill={fill} {...LINE} strokeWidth={2.5} />
          ))}
        </g>
      </g>
    );
  },
  // ---------------------------------------------------------------- kendaraan
  motor: ({ color }) => {
    const fill = tint(color, PALETTE.merah.fill);
    return (
      <g>
        {wheel(22, 72, 14)}
        {wheel(80, 72, 14)}
        <path d="M22 72 L40 52 H66 L80 72" fill="none" {...LINE} strokeWidth={4} />
        <path d="M34 54 C36 42 58 40 70 46 L74 58 H40 Z" fill={fill} {...LINE} />
        <path
          d="M38 44 C44 38 58 38 62 42"
          fill="none"
          stroke="#3a3550"
          strokeWidth={7}
          strokeLinecap="round"
        />
        <path d="M70 46 L76 28 M70 28 H84" {...LINE} strokeWidth={4} />
        <circle cx={84} cy={42} r={5} fill="#ffe27a" {...LINE} strokeWidth={2} />
      </g>
    );
  },
  helikopter: ({ color }) => {
    const fill = tint(color, PALETTE.kuning.fill);
    return (
      <g>
        <g className="va-rotor">
          <path d="M8 18 H84" stroke={OUTLINE} strokeWidth={5} strokeLinecap="round" />
        </g>
        <path d="M46 18 V30" {...LINE} strokeWidth={4} />
        <path d="M58 52 H88 L94 42" fill="none" {...LINE} strokeWidth={6} />
        <path d="M58 52 H88 L94 42" fill="none" stroke={fill} strokeWidth={2.5} />
        <circle cx={94} cy={40} r={6} fill="#ffffff" {...LINE} strokeWidth={2} />
        <path
          d="M18 54 C18 36 32 30 46 30 C62 30 68 42 68 54 C68 66 58 70 44 70 C28 70 18 66 18 54 Z"
          fill={fill}
          {...LINE}
        />
        <path d="M22 50 C24 40 32 36 42 36 V52 Z" fill="#bfe6ff" {...LINE} strokeWidth={2.5} />
        <path d="M24 70 V80 M58 70 V80 M14 82 H70" {...LINE} strokeWidth={4} />
      </g>
    );
  },
  perahu: ({ color }) => {
    const fill = tint(color, WOOD);
    return (
      <g>
        <g className="va-bob">
          <path d="M10 56 H90 L78 74 H22 Z" fill={fill} {...LINE} />
          <path d="M16 62 H84" stroke={shade(fill, -0.25)} strokeWidth={2.5} />
          <path d="M30 56 L18 36 M70 56 L84 38" {...LINE} strokeWidth={4} />
          <ellipse cx={17} cy={34} rx={4} ry={7} fill={fill} {...LINE} strokeWidth={2} />
          <ellipse cx={85} cy={36} rx={4} ry={7} fill={fill} {...LINE} strokeWidth={2} />
        </g>
        <g className="va-wave">
          <path
            d="M0 80 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 V96 H0 Z"
            fill={WATER}
            {...LINE}
            strokeWidth={2.5}
          />
        </g>
      </g>
    );
  },
  truk: ({ color }) => {
    const fill = tint(color, PALETTE.biru.fill);
    return (
      <g>
        <rect x={6} y={28} width={58} height={42} rx={4} fill={shade(fill, 0.25)} {...LINE} />
        <path d="M64 40 H82 L94 54 V70 H64 Z" fill={fill} {...LINE} />
        <path d="M70 44 H80 L88 54 H70 Z" fill="#bfe6ff" {...LINE} strokeWidth={2.5} />
        {wheel(22, 74)}
        {wheel(48, 74)}
        {wheel(80, 74)}
      </g>
    );
  },
  // ---------------------------------------------------------------- alat kebersihan
  sapu: ({ color }) => {
    const fill = tint(color, '#e2b45a');
    return (
      <g>
        <path d="M66 6 L48 58" stroke={OUTLINE} strokeWidth={9} strokeLinecap="round" />
        <path d="M66 6 L48 58" stroke={WOOD} strokeWidth={5} strokeLinecap="round" />
        <path
          d="M36 56 L60 64 L64 70 L32 60 Z"
          fill={PALETTE.merah.fill}
          {...LINE}
          strokeWidth={2.5}
        />
        <path d="M32 60 L64 70 L58 94 L14 80 Z" fill={fill} {...LINE} />
        <path
          d="M24 68 L18 82 M32 70 L26 86 M40 72 L36 88 M48 74 L44 90 M56 72 L52 92"
          stroke={shade(fill, -0.3)}
          strokeWidth={2}
        />
      </g>
    );
  },
  pel: ({ color }) => {
    const fill = tint(color, '#7ec8e3');
    return (
      <g>
        <path d="M50 4 V60" stroke={OUTLINE} strokeWidth={9} strokeLinecap="round" />
        <path d="M50 4 V60" stroke="#c3cad6" strokeWidth={5} strokeLinecap="round" />
        <rect
          x={30}
          y={56}
          width={40}
          height={10}
          rx={3}
          fill={shade(fill, -0.2)}
          {...LINE}
          strokeWidth={2.5}
        />
        {[32, 38, 44, 50, 56, 62, 68].map((x, i) => (
          <path
            key={x}
            d={`M${x} 66 C${x + (i % 2 ? 4 : -4)} 76 ${x} 84 ${x + (i % 2 ? -3 : 3)} 94`}
            fill="none"
            stroke={OUTLINE}
            strokeWidth={7}
            strokeLinecap="round"
          />
        ))}
        {[32, 38, 44, 50, 56, 62, 68].map((x, i) => (
          <path
            key={`f${x}`}
            d={`M${x} 66 C${x + (i % 2 ? 4 : -4)} 76 ${x} 84 ${x + (i % 2 ? -3 : 3)} 94`}
            fill="none"
            stroke={fill}
            strokeWidth={3.5}
            strokeLinecap="round"
          />
        ))}
      </g>
    );
  },
  kemoceng: ({ color }) => {
    const feathers = [
      PALETTE.merah.fill,
      PALETTE.kuning.fill,
      PALETTE.biru.fill,
      PALETTE.hijau.fill,
      PALETTE.ungu.fill,
    ];
    return (
      <g>
        <path d="M50 96 V50" stroke={OUTLINE} strokeWidth={9} strokeLinecap="round" />
        <path d="M50 96 V50" stroke={tint(color, WOOD)} strokeWidth={5} strokeLinecap="round" />
        <g className="va-sway">
          {feathers.map((f, i) => {
            const a = -60 + i * 30;
            return (
              <ellipse
                key={f}
                cx={50}
                cy={30}
                rx={10}
                ry={24}
                fill={f}
                {...LINE}
                strokeWidth={2.5}
                transform={`rotate(${a} 50 52)`}
              />
            );
          })}
        </g>
      </g>
    );
  },
  'tempat-sampah': ({ color }) => {
    const fill = tint(color, PALETTE.hijau.fill);
    return (
      <g>
        <path d="M22 30 H78 L72 92 H28 Z" fill={fill} {...LINE} />
        <rect x={16} y={20} width={68} height={12} rx={4} fill={shade(fill, -0.15)} {...LINE} />
        <rect
          x={42}
          y={12}
          width={16}
          height={8}
          rx={3}
          fill={shade(fill, -0.15)}
          {...LINE}
          strokeWidth={2.5}
        />
        <path
          d="M38 42 L40 82 M50 42 V82 M62 42 L60 82"
          stroke={shade(fill, -0.3)}
          strokeWidth={3}
          strokeLinecap="round"
        />
      </g>
    );
  },
  'sikat-gigi': ({ color }) => {
    const fill = tint(color, PALETTE.biru.fill);
    return (
      <g transform="rotate(-30 50 50)">
        <rect x={8} y={50} width={62} height={12} rx={6} fill={fill} {...LINE} />
        <rect x={66} y={44} width={26} height={18} rx={4} fill="#ffffff" {...LINE} />
        {[70, 76, 82, 88].map((x) => (
          <path key={x} d={`M${x} 44 V32`} stroke="#ffffff" strokeWidth={4} />
        ))}
        <path d="M68 34 H92" {...LINE} strokeWidth={2} />
        <path
          d="M66 30 C66 20 74 24 78 18 C82 24 92 20 92 30 Z"
          fill="#ffffff"
          stroke="#7ec8e3"
          strokeWidth={2.5}
        />
      </g>
    );
  },
  sabun: ({ color }) => {
    const fill = tint(color, '#ff9ec7');
    return (
      <g>
        <g className="va-bob">
          <circle cx={30} cy={24} r={9} fill="#e8f6ff" {...LINE} strokeWidth={2} />
          <circle cx={56} cy={16} r={6} fill="#e8f6ff" {...LINE} strokeWidth={2} />
          <circle cx={74} cy={30} r={8} fill="#e8f6ff" {...LINE} strokeWidth={2} />
        </g>
        <rect x={16} y={46} width={68} height={38} rx={16} fill={fill} {...LINE} />
        <rect x={26} y={54} width={48} height={20} rx={10} fill={shade(fill, 0.25)} />
        <path
          d="M30 50 C38 46 46 46 52 48"
          stroke="#ffffff"
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    );
  },
  // ---------------------------------------------------------------- benda alam
  gunung: ({ color }) => {
    const fill = tint(color, '#7a9e6a');
    return (
      <g>
        <path d="M2 88 L34 34 L54 64 L70 40 L98 88 Z" fill={fill} {...LINE} />
        <path d="M34 34 L26 48 L32 46 L36 50 L42 44 Z" fill="#ffffff" {...LINE} strokeWidth={2} />
        <path d="M70 40 L64 50 L70 48 L74 52 L78 48 Z" fill="#ffffff" {...LINE} strokeWidth={2} />
        <path d="M2 88 H98" {...LINE} />
      </g>
    );
  },
  pelangi: () => {
    const bands = ['#ef5b3c', '#ff9f2a', '#f7c948', '#3fae5a', '#2f80ed', '#8a5ce0'];
    return (
      <g>
        {bands.map((c, i) => (
          <path
            key={c}
            d={`M${10 + i * 5} 74 A${40 - i * 5} ${40 - i * 5} 0 0 1 ${90 - i * 5} 74`}
            fill="none"
            stroke={c}
            strokeWidth={5.5}
          />
        ))}
        <path
          d="M6 80 C2 70 14 64 20 70 C24 62 36 66 34 74 C40 74 40 82 34 82 H10 C6 82 4 81 6 80 Z"
          fill="#ffffff"
          {...LINE}
          strokeWidth={2.5}
        />
        <path
          d="M66 80 C62 70 74 64 80 70 C84 62 96 66 94 74 C100 74 100 82 94 82 H70 C66 82 64 81 66 80 Z"
          fill="#ffffff"
          {...LINE}
          strokeWidth={2.5}
        />
      </g>
    );
  },
  laut: ({ color }) => {
    const fill = tint(color, '#2f80ed');
    return (
      <g>
        <circle cx={76} cy={24} r={12} fill="#ffcc2e" {...LINE} />
        <g className="va-wave">
          <path
            d="M-6 50 q9 -8 18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0 V92 H-6 Z"
            fill={shade(fill, 0.35)}
            {...LINE}
          />
        </g>
        <path d="M0 66 q9 -8 18 0 t18 0 t18 0 t18 0 t18 0 t18 0 V92 H0 Z" fill={fill} {...LINE} />
        <path
          d="M14 78 h10 M48 82 h12 M76 76 h10"
          stroke="#ffffff"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </g>
    );
  },
  // ---------------------------------------------------------------- api & air
  lilin: ({ color }) => {
    const fill = tint(color, '#fff3d6');
    return (
      <g>
        <ellipse cx={50} cy={90} rx={26} ry={6} fill="#c3cad6" {...LINE} strokeWidth={2.5} />
        <rect x={38} y={44} width={24} height={46} rx={4} fill={fill} {...LINE} />
        <path
          d="M40 48 C44 54 44 58 42 62"
          fill="none"
          stroke={shade(fill, -0.15)}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path d="M50 44 V36" {...LINE} strokeWidth={2.5} />
        {flame(50, 36, 0.7)}
      </g>
    );
  },
  kompor: ({ color }) => {
    const fill = tint(color, '#c3cad6');
    return (
      <g>
        <g className="va-flicker">
          {[30, 70].map((x) => (
            <path
              key={x}
              d={`M${x - 14} 54 C${x - 12} 44 ${x - 8} 42 ${x - 6} 34 C${x - 2} 42 ${x} 40 ${x} 30 C${x + 2} 40 ${x + 6} 40 ${x + 6} 34 C${x + 10} 42 ${x + 12} 44 ${x + 14} 54 Z`}
              fill="#4aa8ff"
              {...LINE}
              strokeWidth={2}
            />
          ))}
        </g>
        <rect x={6} y={54} width={88} height={30} rx={6} fill={fill} {...LINE} />
        <ellipse cx={30} cy={56} rx={16} ry={4} fill="#3a3550" />
        <ellipse cx={70} cy={56} rx={16} ry={4} fill="#3a3550" />
        <circle cx={30} cy={72} r={5} fill="#ffffff" {...LINE} strokeWidth={2} />
        <circle cx={70} cy={72} r={5} fill="#ffffff" {...LINE} strokeWidth={2} />
      </g>
    );
  },
  'api-unggun': ({ color }) => (
    <g>
      <path
        d="M18 86 L82 70 M18 70 L82 86"
        stroke={OUTLINE}
        strokeWidth={13}
        strokeLinecap="round"
      />
      <path
        d="M18 86 L82 70 M18 70 L82 86"
        stroke={tint(color, WOOD)}
        strokeWidth={8}
        strokeLinecap="round"
      />
      {[24, 40, 56, 72].map((x) => (
        <ellipse key={x} cx={x} cy={90} rx={7} ry={4} fill="#9aa3b2" {...LINE} strokeWidth={2} />
      ))}
      {flame(50, 74, 1.6)}
    </g>
  ),
  keran: ({ color }) => {
    const fill = tint(color, '#c3cad6');
    return (
      <g>
        <rect x={4} y={22} width={16} height={34} rx={3} fill={shade(fill, -0.15)} {...LINE} />
        <path
          d="M20 32 H58 C66 32 70 38 70 46 V56 H58 V46 C58 44 56 44 54 44 H20 Z"
          fill={fill}
          {...LINE}
        />
        <rect x={34} y={20} width={8} height={12} fill={fill} {...LINE} strokeWidth={2.5} />
        <path d="M26 18 H50" stroke={OUTLINE} strokeWidth={9} strokeLinecap="round" />
        <path d="M26 18 H50" stroke={PALETTE.biru.fill} strokeWidth={5} strokeLinecap="round" />
        <g className="va-drip">{drop(64, 62, 1.3)}</g>
        <path d="M44 92 C44 84 84 84 84 92 Z" fill={WATER} {...LINE} strokeWidth={2.5} />
      </g>
    );
  },
  gembor: ({ color }) => {
    const fill = tint(color, PALETTE.hijau.fill);
    return (
      <g>
        <path d="M58 46 L84 26 L90 32 L66 54 Z" fill={fill} {...LINE} strokeWidth={2.5} />
        <ellipse
          cx={88}
          cy={28}
          rx={5}
          ry={8}
          transform="rotate(45 88 28)"
          fill={shade(fill, -0.15)}
          {...LINE}
          strokeWidth={2}
        />
        <path d="M14 40 H62 L58 84 H18 Z" fill={fill} {...LINE} />
        <path d="M18 40 C18 22 50 22 50 40" fill="none" {...LINE} strokeWidth={5} />
        <g className="va-drip">
          {drop(92, 42, 0.8)}
          {drop(84, 48, 0.8)}
        </g>
      </g>
    );
  },
  // ---------------------------------------------------------------- anak & pancaindra
  'anak-mendengar': ({ color }) => {
    const shirt = tint(color, PALETTE.oranye.fill);
    return (
      <g>
        <path d="M30 96 C30 72 70 72 70 96 Z" fill={shirt} {...LINE} />
        {kidHead(50, 48, 22)}
        <circle cx={28} cy={52} r={6} fill={SKIN} {...LINE} strokeWidth={2.5} />
        {eye(42, 50, 3)}
        {eye(58, 50, 3)}
        <ellipse cx={50} cy={60} rx={3.5} ry={4.5} fill={OUTLINE} />
        {limb('M34 80 Q20 70 22 56', SKIN, 7)}
        <g className="va-pulse">
          <path
            d="M16 44 C10 50 10 58 16 64 M10 38 C0 48 0 62 10 70"
            fill="none"
            stroke={PALETTE.merah.fill}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>
      </g>
    );
  },
  'anak-melihat': ({ color }) => {
    const shirt = tint(color, PALETTE.biru.fill);
    return (
      <g>
        <path d="M28 96 C28 72 72 72 72 96 Z" fill={shirt} {...LINE} />
        {kidHead(50, 50, 22)}
        {smile(50, 62, 5)}
        {limb('M32 80 Q26 66 38 52', SKIN, 7)}
        {limb('M68 80 Q74 66 62 52', SKIN, 7)}
        <rect
          x={30}
          y={40}
          width={18}
          height={14}
          rx={5}
          fill="#3a3550"
          {...LINE}
          strokeWidth={2.5}
        />
        <rect
          x={52}
          y={40}
          width={18}
          height={14}
          rx={5}
          fill="#3a3550"
          {...LINE}
          strokeWidth={2.5}
        />
        <rect x={46} y={43} width={8} height={7} fill="#3a3550" />
        <circle cx={39} cy={47} r={4} fill="#9fd8ff" />
        <circle cx={61} cy={47} r={4} fill="#9fd8ff" />
        <g className="va-pulse">
          <path
            d="M28 30 L22 24 M72 30 L78 24"
            stroke={PALETTE.kuning.fill}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>
      </g>
    );
  },
  'anak-mencium': ({ color }) => {
    const shirt = tint(color, PALETTE.ungu.fill);
    return (
      <g>
        <path d="M24 96 C24 74 64 72 64 96 Z" fill={shirt} {...LINE} />
        {kidHead(44, 50, 22)}
        <path d="M34 50 q3 3 6 0 M48 50 q3 3 6 0" fill="none" {...LINE} strokeWidth={2.2} />
        <circle cx={34} cy={58} r={3} fill="#ff9ec7" opacity={0.8} />
        {smile(46, 62, 4)}
        <path
          d="M72 92 C70 78 70 66 68 56"
          fill="none"
          stroke={LEAF}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <path
          d="M70 76 C78 72 84 74 86 70 C80 66 74 68 70 76 Z"
          fill={LEAF}
          {...LINE}
          strokeWidth={2}
        />
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse
            key={a}
            cx={66}
            cy={44}
            rx={5}
            ry={8}
            transform={`rotate(${a} 66 52)`}
            fill={PALETTE.merah.fill}
            {...LINE}
            strokeWidth={2}
          />
        ))}
        <circle cx={66} cy={52} r={4} fill={PALETTE.kuning.fill} {...LINE} strokeWidth={2} />
        {limb('M56 82 Q66 80 70 70', SKIN, 6)}
        <g className="va-pulse">
          <path
            d="M60 30 c-3 -4 3 -6 0 -10 M68 28 c-3 -4 3 -6 0 -10"
            fill="none"
            stroke="#c38fff"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </g>
      </g>
    );
  },
  'anak-meraba': ({ color }) => {
    const fur = tint(color, '#f2d0a4');
    return (
      <g>
        <path d="M6 84 C6 62 24 54 50 54 C76 54 94 62 94 84 Z" fill={fur} {...LINE} />
        <path
          d="M14 70 l4 -4 M26 62 l3 -5 M40 58 l2 -5 M60 58 l2 -5 M74 62 l3 -5 M86 70 l4 -4"
          stroke={shade(fur, -0.3)}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <g className="va-bob">
          <path
            d="M30 54 C28 44 30 30 36 26 C40 24 42 28 42 34 L44 22 C45 16 52 16 52 22 L52 32 L56 20 C58 14 65 16 64 22 L60 36 L66 28 C70 24 76 28 72 34 L62 50 C58 56 50 60 42 60 C36 60 32 58 30 54 Z"
            fill={SKIN}
            {...LINE}
          />
        </g>
      </g>
    );
  },
  'anak-mandi': ({ color }) => {
    const cap = tint(color, PALETTE.kuning.fill);
    return (
      <g>
        <path d="M70 6 V16 H56" fill="none" {...LINE} strokeWidth={4} />
        <path d="M46 12 H66 L62 22 H50 Z" fill="#c3cad6" {...LINE} strokeWidth={2.5} />
        <g className="va-drip">
          {drop(50, 26, 0.7)}
          {drop(58, 28, 0.7)}
          {drop(64, 24, 0.7)}
        </g>
        <path d="M30 96 C30 74 70 74 70 96 Z" fill={SKIN} {...LINE} />
        {kidHead(50, 58, 18)}
        <path
          d="M32 54 C32 40 68 40 68 54 C60 48 40 48 32 54 Z"
          fill={cap}
          {...LINE}
          strokeWidth={2}
        />
        {eye(44, 60, 2.5)}
        {eye(56, 60, 2.5)}
        {smile(50, 66, 4)}
        {[24, 76, 30, 70].map((x, i) => (
          <circle
            key={i}
            cx={x}
            cy={80 + (i % 2) * 6}
            r={5}
            fill="#e8f6ff"
            {...LINE}
            strokeWidth={1.5}
          />
        ))}
      </g>
    );
  },
  'anak-menyiram': ({ color }) => {
    const shirt = tint(color, PALETTE.hijau.fill);
    return (
      <g>
        {limb('M30 74 L28 92', '#5b6b8a')}
        {limb('M40 74 L42 92', '#5b6b8a')}
        <path d="M24 46 C24 38 46 38 46 46 L44 76 H26 Z" fill={shirt} {...LINE} />
        {kidHead(35, 26, 12)}
        {eye(39, 27, 2)}
        {smile(39, 32, 3)}
        {limb('M44 48 L58 50', SKIN, 6)}
        <path d="M52 44 H72 L70 62 H54 Z" fill={PALETTE.biru.fill} {...LINE} strokeWidth={2.5} />
        <path d="M72 48 L84 40" {...LINE} strokeWidth={4} />
        <g className="va-drip">
          {drop(86, 46, 0.6)}
          {drop(90, 52, 0.6)}
        </g>
        <path
          d="M86 94 C86 82 84 76 84 68"
          fill="none"
          stroke={LEAF}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <path
          d="M84 76 C76 70 70 72 70 78 C76 80 80 80 84 76 Z M85 72 C92 66 98 70 96 74 C92 76 88 76 85 72 Z"
          fill={LEAF}
          {...LINE}
          strokeWidth={2}
        />
        <path d="M68 94 H98" {...LINE} strokeWidth={4} />
      </g>
    );
  },
} satisfies Record<string, ObjectArt>;

/** Titik pusat & jari-jari penanda untuk tiap bagian tubuh di visual `body` (kotak 120×160). */
const BODY_MARK: Record<BodyPart, { x: number; y: number; r: number }> = {
  kepala: { x: 60, y: 40, r: 32 },
  rambut: { x: 60, y: 18, r: 14 },
  mata: { x: 60, y: 41, r: 16 },
  telinga: { x: 94, y: 44, r: 10 },
  hidung: { x: 60, y: 49, r: 7 },
  mulut: { x: 60, y: 58, r: 8 },
  tangan: { x: 94, y: 110, r: 11 },
  perut: { x: 60, y: 94, r: 14 },
  kaki: { x: 69, y: 146, r: 11 },
};

/** Anak berdiri (seluruh tubuh); bagian `part` ditandai lingkaran kuning berdenyut + panah. */
export function BodyFigure({ part }: { part?: BodyPart }) {
  const mark = part ? BODY_MARK[part] : undefined;
  const dir = mark && mark.x > 75 ? -1 : 1;
  return (
    <g>
      {limb('M52 118 L50 146', SKIN, 9)}
      {limb('M68 118 L70 146', SKIN, 9)}
      <ellipse cx={48} cy={150} rx={9} ry={5} fill={SKIN} {...LINE} strokeWidth={2.5} />
      <ellipse cx={72} cy={150} rx={9} ry={5} fill={SKIN} {...LINE} strokeWidth={2.5} />
      <path
        d="M42 108 H78 L80 124 H62 L60 116 L58 124 H40 Z"
        fill="#4f8fbf"
        {...LINE}
        strokeWidth={2.5}
      />
      {limb('M40 76 L28 108', SKIN, 8)}
      {limb('M80 76 L92 108', SKIN, 8)}
      <path d="M40 74 C40 68 80 68 80 74 L80 110 H40 Z" fill="#9fe0d6" {...LINE} />
      <circle cx={26} cy={44} r={7} fill={SKIN} {...LINE} strokeWidth={2.5} />
      <circle cx={94} cy={44} r={7} fill={SKIN} {...LINE} strokeWidth={2.5} />
      <circle cx={60} cy={44} r={30} fill={SKIN} {...LINE} />
      <path
        d="M30 40 C28 12 92 12 90 40 C80 28 62 26 52 30 C44 32 36 34 30 40 Z"
        fill={HAIR}
        {...LINE}
        strokeWidth={2.5}
      />
      {eye(50, 42, 3.5)}
      {eye(70, 42, 3.5)}
      <circle cx={60} cy={50} r={2.5} fill="#e09a74" />
      {smile(60, 57, 6)}
      <circle cx={44} cy={52} r={4} fill="#ff9ec7" opacity={0.6} />
      <circle cx={76} cy={52} r={4} fill="#ff9ec7" opacity={0.6} />
      {mark && (
        <g>
          <circle cx={mark.x} cy={mark.y} r={mark.r} fill="none" stroke="#f7a900" strokeWidth={4} />
          <g className="va-pulse">
            <circle
              cx={mark.x}
              cy={mark.y}
              r={mark.r + 4}
              fill="none"
              stroke="#f7c948"
              strokeWidth={3}
            />
          </g>
          {/* Panah dari sisi yang lapang (kanan untuk bagian tengah/kiri, kiri untuk bagian kanan). */}
          <path
            d={`M${mark.x + dir * (mark.r + 18)} ${mark.y - 14} L${mark.x + dir * (mark.r + 3)} ${mark.y - 3}`}
            stroke="#f7a900"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <path
            d={`M${mark.x + dir * (mark.r + 3)} ${mark.y - 3} l${dir * 9} -1 l${dir * -5} -7 Z`}
            fill="#f7a900"
          />
        </g>
      )}
    </g>
  );
}
