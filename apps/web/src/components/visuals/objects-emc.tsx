import type { JSX } from 'react';
import { LINE } from './draw';
import { OUTLINE, PALETTE, shade, tint } from './palette';
import type { ObjectArt } from './objects';
import './objects-emc.css';

/**
 * Ilustrasi English TK Olimpiade (D-071): cuaca, benda di kelas, kamar mandi, mainan, buah/sayur, harimau, dan
 * orang untuk he/she. Dibuat sendiri (tidak menyalin lembar soal), kotak 100×100, garis tepi tebal, animasi
 * ringan lewat kelas `ve-*` (mati bila pengguna memilih gerak dikurangi).
 */

const SKIN = '#f6c79a';
const HAIR = '#5a3a26';
const GREY_HAIR = '#cfcfd6';
const WOOD = '#c98a4b';
const LEAF = '#3fae5a';
const CLOUD = '#ffffff';
const eye = (x: number, y: number, r = 2.6) => <circle cx={x} cy={y} r={r} fill={OUTLINE} />;
const smile = (x: number, y: number, w = 5) => (
  <path
    d={`M${x - w} ${y} Q${x} ${y + w * 0.8} ${x + w} ${y}`}
    fill="none"
    {...LINE}
    strokeWidth={2.2}
  />
);
const cloud = (fill = CLOUD, dy = 0) => (
  <path
    d={`M22 ${52 + dy} C10 ${52 + dy} 10 ${34 + dy} 24 ${34 + dy} C26 ${20 + dy} 46 ${16 + dy} 54 ${28 + dy} C62 ${18 + dy} 82 ${22 + dy} 80 ${36 + dy} C92 ${36 + dy} 92 ${52 + dy} 80 ${52 + dy} Z`}
    fill={fill}
    {...LINE}
  />
);

/** Orang setengah badan: kepala, rambut/kerudung, badan berbaju. */
function person(opts: {
  shirt: string;
  hair: 'short' | 'pony' | 'hijab' | 'bald' | 'bun';
  hairColor?: string;
  mustache?: boolean;
  glasses?: boolean;
  small?: boolean;
}): JSX.Element {
  const s = opts.small ? 0.86 : 1;
  const hc = opts.hairColor ?? HAIR;
  return (
    <g transform={`translate(${50 - 50 * s} ${100 - 100 * s}) scale(${s})`}>
      {/* badan */}
      <path d="M18 98 C18 72 30 64 50 64 C70 64 82 72 82 98 Z" fill={opts.shirt} {...LINE} />
      <path d="M42 64 L50 74 L58 64" fill="none" {...LINE} strokeWidth={2.5} />
      {opts.hair === 'hijab' ? (
        <>
          <path
            d="M24 52 C20 20 80 20 76 52 C76 66 66 72 50 72 C34 72 24 66 24 52 Z"
            fill={hc}
            {...LINE}
          />
          <ellipse cx={50} cy={46} rx={18} ry={19} fill={SKIN} {...LINE} />
        </>
      ) : (
        <>
          <ellipse cx={50} cy={42} rx={20} ry={21} fill={SKIN} {...LINE} />
          <ellipse cx={30} cy={44} rx={3.5} ry={5} fill={SKIN} {...LINE} strokeWidth={2} />
          <ellipse cx={70} cy={44} rx={3.5} ry={5} fill={SKIN} {...LINE} strokeWidth={2} />
          {opts.hair === 'short' && (
            <path
              d="M30 40 C28 18 72 16 70 40 C64 30 56 28 50 30 C44 26 36 30 30 40 Z"
              fill={hc}
              {...LINE}
            />
          )}
          {opts.hair === 'pony' && (
            <>
              <path
                d="M30 42 C26 16 74 16 70 42 C66 30 58 26 50 28 C42 26 34 30 30 42 Z"
                fill={hc}
                {...LINE}
              />
              <circle cx={26} cy={30} r={7} fill={hc} {...LINE} />
              <circle cx={74} cy={30} r={7} fill={hc} {...LINE} />
              <circle cx={30} cy={26} r={2.5} fill="#ff6fa5" />
              <circle cx={70} cy={26} r={2.5} fill="#ff6fa5" />
            </>
          )}
          {opts.hair === 'bald' && (
            <path
              d="M30 40 C30 32 34 28 36 30 M70 40 C70 32 66 28 64 30"
              fill="none"
              stroke={hc}
              strokeWidth={5}
              strokeLinecap="round"
            />
          )}
          {opts.hair === 'bun' && (
            <>
              <circle cx={50} cy={18} r={8} fill={hc} {...LINE} />
              <path
                d="M30 40 C28 20 72 20 70 40 C64 32 56 30 50 31 C44 30 36 32 30 40 Z"
                fill={hc}
                {...LINE}
              />
            </>
          )}
        </>
      )}
      {eye(43, 45)}
      {eye(57, 45)}
      {opts.glasses && (
        <g fill="none" stroke={OUTLINE} strokeWidth={2}>
          <circle cx={43} cy={45} r={5.5} />
          <circle cx={57} cy={45} r={5.5} />
          <path d="M48.5 45 H51.5" />
        </g>
      )}
      <circle cx={38} cy={52} r={3} fill="#ff9ea8" opacity={0.6} />
      <circle cx={62} cy={52} r={3} fill="#ff9ea8" opacity={0.6} />
      {opts.mustache ? (
        <>
          <path d="M42 54 C46 51 50 53 50 53 C50 53 54 51 58 54 C54 57 46 57 42 54 Z" fill={hc} />
          {smile(50, 57, 4)}
        </>
      ) : (
        smile(50, 53, 5)
      )}
    </g>
  );
}

export const EMC_ENGLISH_OBJECT_ART = {
  // ---------------------------------------------------------------- cuaca
  hujan: () => (
    <g>
      {cloud('#dfe8f2', -6)}
      <g className="ve-rain" stroke="#3b9cf0" strokeWidth={4} strokeLinecap="round">
        {[26, 42, 58, 74].map((x, i) => (
          <path key={x} d={`M${x} ${60 + (i % 2) * 6} l-4 12`} />
        ))}
        {[34, 50, 66].map((x) => (
          <path key={x} d={`M${x} 80 l-4 12`} />
        ))}
      </g>
    </g>
  ),
  salju: () => (
    <g>
      {cloud('#eef4fb', -8)}
      <g className="ve-snow" stroke="#7fb6e8" strokeWidth={2.5} strokeLinecap="round">
        {[
          [28, 66],
          [50, 78],
          [72, 64],
          [38, 90],
          [64, 90],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <path d="M-5 0 H5 M0 -5 V5 M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5" />
          </g>
        ))}
      </g>
    </g>
  ),
  angin: () => (
    <g className="ve-wind" fill="none" strokeLinecap="round">
      {[
        'M8 34 H62 C74 34 76 18 64 18 C58 18 56 24 58 28',
        'M14 54 H80 C92 54 92 38 82 38 C76 38 74 44 76 48',
        'M8 74 H56 C68 74 70 88 60 88 C54 88 52 82 54 80',
      ].map((d) => (
        <g key={d}>
          <path d={d} stroke={OUTLINE} strokeWidth={9} />
          <path d={d} stroke="#9ad7f0" strokeWidth={5} />
        </g>
      ))}
      <path d="M86 70 l6 -4 M84 80 l8 0" stroke="#3fae5a" strokeWidth={4} />
    </g>
  ),
  petir: () => (
    <g>
      {cloud('#8d96a8', -10)}
      <path
        className="ve-flash"
        d="M52 46 L38 72 H50 L42 96 L68 62 H55 L64 46 Z"
        fill="#ffcc2e"
        {...LINE}
      />
    </g>
  ),
  // ---------------------------------------------------------------- di kelas
  kursi: ({ color }) => {
    const fill = tint(color, WOOD);
    return (
      <g>
        <rect x={28} y={10} width={44} height={40} rx={6} fill={fill} {...LINE} />
        <rect x={34} y={18} width={32} height={6} rx={3} fill={shade(fill, 0.25)} />
        <rect x={22} y={50} width={56} height={12} rx={4} fill={shade(fill, -0.1)} {...LINE} />
        <rect x={26} y={62} width={8} height={30} rx={3} fill={fill} {...LINE} />
        <rect x={66} y={62} width={8} height={30} rx={3} fill={fill} {...LINE} />
      </g>
    );
  },
  tas: ({ color }) => {
    const fill = tint(color, PALETTE.merah.fill);
    return (
      <g>
        <path d="M36 26 C36 10 64 10 64 26" fill="none" {...LINE} strokeWidth={5} />
        <rect x={20} y={24} width={60} height={68} rx={16} fill={fill} {...LINE} />
        <rect x={30} y={56} width={40} height={26} rx={8} fill={shade(fill, 0.2)} {...LINE} />
        <path d="M30 40 H70" {...LINE} strokeWidth={2.5} />
        <circle cx={50} cy={64} r={3} fill={OUTLINE} />
      </g>
    );
  },
  penghapus: ({ color }) => {
    const fill = tint(color, '#ff9ec7');
    return (
      <g transform="rotate(-18 50 50)">
        <rect x={16} y={34} width={68} height={32} rx={6} fill={fill} {...LINE} />
        <rect x={52} y={34} width={32} height={32} rx={6} fill={PALETTE.biru.fill} {...LINE} />
        <path d="M58 44 H78 M58 52 H74" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
      </g>
    );
  },
  penggaris: ({ color }) => {
    const fill = tint(color, PALETTE.kuning.fill);
    return (
      <g transform="rotate(-20 50 50)">
        <rect x={6} y={38} width={88} height={24} rx={4} fill={fill} {...LINE} />
        {Array.from({ length: 13 }, (_, i) => (
          <path
            key={i}
            d={`M${12 + i * 6.5} 38 v${i % 2 ? 6 : 11}`}
            stroke={OUTLINE}
            strokeWidth={2}
          />
        ))}
      </g>
    );
  },
  gunting: ({ color }) => {
    const fill = tint(color, PALETTE.oranye.fill);
    return (
      <g>
        <path d="M44 56 L84 14" stroke="#b9c2cf" strokeWidth={9} strokeLinecap="round" />
        <path d="M44 56 L84 14" fill="none" {...LINE} strokeWidth={2} />
        <path d="M56 56 L16 14" stroke="#d6dde6" strokeWidth={9} strokeLinecap="round" />
        <path d="M56 56 L16 14" fill="none" {...LINE} strokeWidth={2} />
        <circle cx={50} cy={52} r={4} fill={OUTLINE} />
        <circle cx={34} cy={76} r={13} fill="none" stroke={OUTLINE} strokeWidth={10} />
        <circle cx={34} cy={76} r={13} fill="none" stroke={fill} strokeWidth={6} />
        <circle cx={66} cy={76} r={13} fill="none" stroke={OUTLINE} strokeWidth={10} />
        <circle cx={66} cy={76} r={13} fill="none" stroke={fill} strokeWidth={6} />
      </g>
    );
  },
  krayon: ({ color }) => {
    const fill = tint(color, PALETTE.ungu.fill);
    return (
      <g transform="rotate(-35 50 50)">
        <path d="M22 40 H70 L88 50 L70 60 H22 Z" fill={fill} {...LINE} />
        <path d="M70 40 L88 50 L70 60 Z" fill={shade(fill, 0.3)} {...LINE} />
        <rect x={30} y={40} width={30} height={20} fill="#ffffff" {...LINE} strokeWidth={2} />
        <path d="M36 50 H54" stroke={fill} strokeWidth={4} strokeLinecap="round" />
      </g>
    );
  },
  'papan-tulis': () => (
    <g>
      <rect x={8} y={14} width={84} height={58} rx={6} fill={WOOD} {...LINE} />
      <rect x={14} y={20} width={72} height={46} rx={3} fill="#2f6b4f" {...LINE} strokeWidth={2} />
      <path
        d="M22 32 C30 26 36 38 44 30 M22 46 H52 M58 34 L68 46 L78 34"
        fill="none"
        stroke="#ffffff"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <rect x={60} y={66} width={16} height={5} rx={2} fill="#ffffff" {...LINE} strokeWidth={1.5} />
      <path d="M26 72 L20 94 M74 72 L80 94" {...LINE} strokeWidth={5} />
    </g>
  ),
  // ---------------------------------------------------------------- kamar mandi
  kloset: () => (
    <g>
      <rect x={26} y={8} width={48} height={30} rx={6} fill="#ffffff" {...LINE} />
      <rect x={58} y={14} width={10} height={5} rx={2} fill="#b9c2cf" {...LINE} strokeWidth={1.5} />
      <path d="M18 44 H82 C82 66 68 74 50 74 C32 74 18 66 18 44 Z" fill="#ffffff" {...LINE} />
      <ellipse cx={50} cy={46} rx={26} ry={6} fill="#cfeaff" {...LINE} strokeWidth={2} />
      <path d="M36 72 L40 92 H60 L64 72" fill="#ffffff" {...LINE} />
    </g>
  ),
  handuk: ({ color }) => {
    const fill = tint(color, PALETTE.biru.light);
    return (
      <g>
        <path d="M12 18 H88" {...LINE} strokeWidth={5} />
        <circle cx={12} cy={18} r={4} fill={WOOD} {...LINE} strokeWidth={2} />
        <circle cx={88} cy={18} r={4} fill={WOOD} {...LINE} strokeWidth={2} />
        <path className="ve-sway" d="M24 18 H76 V86 H24 Z" fill={fill} {...LINE} />
        <path d="M24 72 H76 M24 78 H76" stroke={shade(fill, -0.25)} strokeWidth={3} />
      </g>
    );
  },
  sisir: ({ color }) => {
    const fill = tint(color, PALETTE.oranye.fill);
    return (
      <g transform="rotate(-15 50 50)">
        <rect x={10} y={30} width={80} height={16} rx={6} fill={fill} {...LINE} />
        {Array.from({ length: 12 }, (_, i) => (
          <rect
            key={i}
            x={14 + i * 6.3}
            y={44}
            width={3.6}
            height={i < 6 ? 22 : 16}
            rx={1.5}
            fill={fill}
            {...LINE}
            strokeWidth={1.5}
          />
        ))}
      </g>
    );
  },
  'pasta-gigi': ({ color }) => {
    const fill = tint(color, PALETTE.biru.fill);
    return (
      <g transform="rotate(-25 50 50)">
        <path d="M14 34 H72 L80 42 V58 L72 66 H14 L20 50 Z" fill="#ffffff" {...LINE} />
        <path d="M30 40 H64 V60 H30 Z" fill={fill} />
        <rect x={80} y={44} width={10} height={12} rx={2} fill={PALETTE.merah.fill} {...LINE} />
        <path d="M36 50 H58" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
      </g>
    );
  },
  cermin: () => (
    <g>
      <ellipse cx={50} cy={46} rx={30} ry={38} fill={WOOD} {...LINE} />
      <ellipse cx={50} cy={46} rx={23} ry={31} fill="#cfeaff" {...LINE} strokeWidth={2} />
      <path
        className="ve-shine"
        d="M38 30 L50 22 M36 42 L56 26"
        stroke="#ffffff"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path d="M40 84 H60 L56 94 H44 Z" fill={WOOD} {...LINE} />
    </g>
  ),
  // ---------------------------------------------------------------- mainan
  boneka: ({ color }) => {
    const dress = tint(color, '#ff6fa5');
    return (
      <g className="ve-bob">
        <path d="M30 92 L38 56 H62 L70 92 Z" fill={dress} {...LINE} />
        <path d="M38 64 L24 74 M62 64 L76 74" {...LINE} strokeWidth={6} />
        <path d="M38 64 L24 74 M62 64 L76 74" stroke={SKIN} strokeWidth={3} strokeLinecap="round" />
        <circle cx={50} cy={36} r={20} fill={SKIN} {...LINE} />
        <path
          d="M30 36 C28 12 72 12 70 36 C66 24 56 22 50 24 C44 22 34 24 30 36 Z"
          fill="#f2b84b"
          {...LINE}
        />
        <path
          d="M30 34 C24 46 24 56 30 60 M70 34 C76 46 76 56 70 60"
          fill="none"
          stroke="#f2b84b"
          strokeWidth={6}
          strokeLinecap="round"
        />
        {eye(43, 38)}
        {eye(57, 38)}
        {smile(50, 46, 5)}
        <path
          d="M42 18 L50 22 L58 18 L56 26 H44 Z"
          fill={PALETTE.merah.fill}
          {...LINE}
          strokeWidth={2}
        />
      </g>
    );
  },
  robot: ({ color }) => {
    const fill = tint(color, '#9fb3c8');
    return (
      <g>
        <path d="M50 6 V16" {...LINE} />
        <circle
          className="ve-blink"
          cx={50}
          cy={6}
          r={4}
          fill={PALETTE.merah.fill}
          {...LINE}
          strokeWidth={2}
        />
        <rect x={28} y={16} width={44} height={30} rx={8} fill={fill} {...LINE} />
        <circle cx={41} cy={30} r={5} fill="#ffffff" {...LINE} strokeWidth={2} />
        <circle cx={59} cy={30} r={5} fill="#ffffff" {...LINE} strokeWidth={2} />
        <circle cx={41} cy={30} r={2} fill={OUTLINE} />
        <circle cx={59} cy={30} r={2} fill={OUTLINE} />
        <path d="M42 40 H58" {...LINE} strokeWidth={2.5} />
        <rect x={30} y={48} width={40} height={30} rx={6} fill={fill} {...LINE} />
        <rect
          x={40}
          y={54}
          width={20}
          height={14}
          rx={3}
          fill="#ffcc2e"
          {...LINE}
          strokeWidth={2}
        />
        <path d="M30 56 H18 V68 M70 56 H82 V68" fill="none" {...LINE} strokeWidth={5} />
        <rect x={34} y={78} width={10} height={14} rx={3} fill={fill} {...LINE} />
        <rect x={56} y={78} width={10} height={14} rx={3} fill={fill} {...LINE} />
      </g>
    );
  },
  'boneka-beruang': ({ color }) => {
    const fill = tint(color, '#c98a4b');
    const light = shade(fill, 0.35);
    return (
      <g>
        <circle cx={28} cy={22} r={10} fill={fill} {...LINE} />
        <circle cx={72} cy={22} r={10} fill={fill} {...LINE} />
        <ellipse cx={50} cy={72} rx={26} ry={22} fill={fill} {...LINE} />
        <ellipse cx={50} cy={74} rx={14} ry={12} fill={light} />
        <circle cx={24} cy={70} r={9} fill={fill} {...LINE} />
        <circle cx={76} cy={70} r={9} fill={fill} {...LINE} />
        <circle cx={50} cy={36} r={22} fill={fill} {...LINE} />
        <ellipse cx={50} cy={44} rx={10} ry={8} fill={light} {...LINE} strokeWidth={2} />
        <circle cx={50} cy={40} r={3} fill={OUTLINE} />
        {eye(42, 31)}
        {eye(58, 31)}
        <path
          d="M40 58 L50 64 L60 58 L56 54 L50 58 L44 54 Z"
          fill={PALETTE.merah.fill}
          {...LINE}
          strokeWidth={2}
        />
      </g>
    );
  },
  // ---------------------------------------------------------------- buah & sayur
  ceri: ({ color }) => {
    const fill = tint(color, '#d7263d');
    return (
      <g>
        <path
          d="M34 66 C40 40 52 24 62 12 M68 62 C66 40 64 26 62 12"
          fill="none"
          stroke="#6b8e23"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <path
          d="M62 12 C72 6 84 10 86 20 C76 24 66 20 62 12 Z"
          fill={LEAF}
          {...LINE}
          strokeWidth={2}
        />
        <circle cx={32} cy={72} r={16} fill={fill} {...LINE} />
        <circle cx={68} cy={70} r={16} fill={fill} {...LINE} />
        <circle cx={26} cy={66} r={4} fill="#ffffff" opacity={0.7} />
        <circle cx={62} cy={64} r={4} fill="#ffffff" opacity={0.7} />
      </g>
    );
  },
  bawang: ({ color }) => {
    const fill = tint(color, '#b56fb8');
    return (
      <g>
        <path
          d="M50 26 C46 18 44 12 50 4 C56 12 54 18 50 26 Z"
          fill={LEAF}
          {...LINE}
          strokeWidth={2}
        />
        <path
          d="M50 24 C24 34 18 58 30 76 C38 88 62 88 70 76 C82 58 76 34 50 24 Z"
          fill={fill}
          {...LINE}
        />
        <path
          d="M50 28 C38 44 38 66 46 84 M50 28 C62 44 62 66 54 84"
          fill="none"
          stroke={shade(fill, 0.35)}
          strokeWidth={2.5}
        />
        <path
          d="M42 86 l-4 8 M50 88 v8 M58 86 l4 8"
          stroke="#c9a46a"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </g>
    );
  },
  kentang: ({ color }) => {
    const fill = tint(color, '#d4a55e');
    return (
      <g>
        <path
          d="M18 54 C14 30 42 20 62 26 C86 32 90 58 76 72 C60 86 24 82 18 54 Z"
          fill={fill}
          {...LINE}
        />
        {[
          [34, 44],
          [56, 38],
          [70, 56],
          [42, 66],
        ].map(([x, y]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={3} ry={2} fill={shade(fill, -0.35)} />
        ))}
      </g>
    );
  },
  // ---------------------------------------------------------------- hewan
  harimau: ({ color }) => {
    const fill = tint(color, '#f28c28');
    return (
      <g>
        <path
          d="M70 60 C86 58 92 44 86 36"
          fill="none"
          stroke={OUTLINE}
          strokeWidth={8}
          strokeLinecap="round"
        />
        <path
          d="M70 60 C86 58 92 44 86 36"
          fill="none"
          stroke={fill}
          strokeWidth={4.5}
          strokeLinecap="round"
        />
        <ellipse cx={56} cy={66} rx={28} ry={18} fill={fill} {...LINE} />
        {[46, 56, 66].map((x) => (
          <path
            key={x}
            d={`M${x} 50 l-3 10`}
            stroke={OUTLINE}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}
        <rect x={36} y={76} width={9} height={16} rx={4} fill={fill} {...LINE} />
        <rect x={66} y={76} width={9} height={16} rx={4} fill={fill} {...LINE} />
        <circle cx={22} cy={22} r={7} fill={fill} {...LINE} />
        <circle cx={46} cy={22} r={7} fill={fill} {...LINE} />
        <circle cx={34} cy={40} r={20} fill={fill} {...LINE} />
        <ellipse cx={34} cy={48} rx={11} ry={8} fill="#fff4e0" {...LINE} strokeWidth={2} />
        <path
          d="M24 26 l3 6 M34 22 v7 M44 26 l-3 6"
          stroke={OUTLINE}
          strokeWidth={3}
          strokeLinecap="round"
        />
        {eye(27, 38)}
        {eye(41, 38)}
        <path d="M31 45 h6 l-3 3 Z" fill={OUTLINE} />
        {smile(34, 50, 4)}
      </g>
    );
  },
  // ---------------------------------------------------------------- orang (he / she)
  'anak-laki-laki': ({ color }) =>
    person({ shirt: tint(color, PALETTE.biru.fill), hair: 'short', small: true }),
  'anak-perempuan': ({ color }) =>
    person({ shirt: tint(color, '#ff6fa5'), hair: 'pony', small: true }),
  ayah: ({ color }) =>
    person({ shirt: tint(color, PALETTE.hijau.fill), hair: 'short', mustache: true }),
  ibu: ({ color }) =>
    person({ shirt: tint(color, PALETTE.ungu.fill), hair: 'hijab', hairColor: '#e9a03b' }),
  kakek: ({ color }) =>
    person({
      shirt: tint(color, '#7a8fa6'),
      hair: 'bald',
      hairColor: GREY_HAIR,
      mustache: true,
      glasses: true,
    }),
  nenek: ({ color }) =>
    person({ shirt: tint(color, '#c96a8a'), hair: 'bun', hairColor: GREY_HAIR, glasses: true }),
} satisfies Record<string, ObjectArt>;
