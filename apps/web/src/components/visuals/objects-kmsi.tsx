import { LINE } from './draw';
import { OUTLINE, PALETTE, shade, tint } from './palette';
import type { ObjectArt } from './objects';
import './anim.css';

/**
 * Ilustrasi KMSI Level A Sains (D-074): makanan untuk rasa manis/asin/pahit/asam, lidah, dan tempat tinggal hewan.
 * Kotak 100×100, garis tepi tebal seperti ilustrasi lain; animasi ringan lewat kelas `va-*`.
 */

const LEAF = '#3fae5a';
const WATER = '#6cc4ff';
const WOOD = '#c98a4b';

export const KMSI_OBJECT_ART = {
  permen: ({ color }) => {
    const fill = tint(color, PALETTE.merah.fill);
    return (
      <g>
        <path d="M30 50 L10 36 L12 64 Z" fill={fill} {...LINE} />
        <path d="M70 50 L90 36 L88 64 Z" fill={fill} {...LINE} />
        <circle cx={50} cy={50} r={22} fill={fill} {...LINE} />
        <path
          d="M36 40 C44 34 56 66 64 60 M34 54 C42 50 50 64 58 66"
          fill="none"
          stroke="#ffffff"
          strokeWidth={4}
          strokeLinecap="round"
        />
      </g>
    );
  },
  madu: ({ color }) => {
    const fill = tint(color, '#f2a51a');
    return (
      <g>
        <rect x={26} y={16} width={48} height={12} rx={4} fill={shade(fill, -0.25)} {...LINE} />
        <path
          d="M24 30 H76 V82 C76 88 70 92 64 92 H36 C30 92 24 88 24 82 Z"
          fill={fill}
          {...LINE}
        />
        <path
          d="M24 34 H76 C70 42 64 40 58 46 C52 52 44 44 36 48 C30 50 26 44 24 42 Z"
          fill="#ffd45e"
        />
        <path
          d="M38 64 l6 -4 l6 4 v7 l-6 4 l-6 -4 Z M50 64 l6 -4 l6 4 v7 l-6 4 l-6 -4 Z"
          fill="none"
          stroke="#ffffff"
          strokeWidth={2.5}
        />
      </g>
    );
  },
  gula: ({ color }) => (
    <g>
      <path
        d="M20 90 C16 70 22 52 36 46 H64 C78 52 84 70 80 90 Z"
        fill={tint(color, '#ffffff')}
        {...LINE}
      />
      <path d="M34 46 C36 36 64 36 66 46 Z" fill="#f3efe4" {...LINE} strokeWidth={2.5} />
      {[
        [40, 26],
        [52, 18],
        [62, 28],
        [46, 34],
      ].map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={8}
          height={8}
          rx={1.5}
          fill="#ffffff"
          {...LINE}
          strokeWidth={2}
        />
      ))}
      <path d="M32 66 h36" stroke="#c3cad6" strokeWidth={3} strokeLinecap="round" />
    </g>
  ),
  garam: ({ color }) => {
    const fill = tint(color, '#c3cad6');
    return (
      <g>
        <path d="M30 34 H70 L66 90 H34 Z" fill="#f4f7fb" {...LINE} />
        <path d="M30 34 C30 16 70 16 70 34 Z" fill={fill} {...LINE} />
        {[
          [42, 24],
          [50, 20],
          [58, 24],
          [46, 28],
          [54, 28],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={2} fill={OUTLINE} />
        ))}
        <path d="M38 60 h24 M38 70 h24" stroke="#c3cad6" strokeWidth={3} strokeLinecap="round" />
      </g>
    );
  },
  kerupuk: ({ color }) => {
    const fill = tint(color, '#ffe3a8');
    return (
      <g>
        <path
          d="M14 52 C12 34 28 20 46 20 C56 14 70 18 76 28 C90 32 92 50 86 60 C90 74 76 86 62 82 C52 90 34 88 28 78 C14 76 8 64 14 52 Z"
          fill={fill}
          {...LINE}
        />
        <path
          d="M30 44 c4 -4 8 0 4 4 M54 34 c4 -4 8 0 4 4 M62 58 c4 -4 8 0 4 4 M40 64 c4 -4 8 0 4 4"
          fill="none"
          stroke={shade(fill, -0.3)}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </g>
    );
  },
  kopi: ({ color }) => {
    const cup = tint(color, '#ffffff');
    return (
      <g>
        <g className="va-sway">
          <path
            d="M40 26 c-4 -6 4 -10 0 -16 M52 26 c-4 -6 4 -10 0 -16 M64 26 c-4 -6 4 -10 0 -16"
            fill="none"
            stroke="#c3cad6"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>
        <ellipse cx={52} cy={88} rx={36} ry={6} fill="#e8e2d6" {...LINE} strokeWidth={2.5} />
        <path d="M74 44 C90 44 90 70 72 70" fill="none" {...LINE} strokeWidth={6} />
        <path d="M24 34 H80 L74 80 C72 86 32 86 30 80 Z" fill={cup} {...LINE} />
        <ellipse cx={52} cy={36} rx={26} ry={5} fill="#5a3a26" />
      </g>
    );
  },
  obat: ({ color }) => {
    const fill = tint(color, PALETTE.biru.fill);
    return (
      <g>
        <g transform="rotate(-35 50 50)">
          <rect x={18} y={38} width={64} height={24} rx={12} fill="#ffffff" {...LINE} />
          <path d="M50 38 H70 C76 38 82 44 82 50 C82 56 76 62 70 62 H50 Z" fill={fill} {...LINE} />
        </g>
        <circle cx={78} cy={78} r={12} fill="#ffffff" {...LINE} />
        <path d="M70 78 H86" {...LINE} strokeWidth={2.5} />
      </g>
    );
  },
  pare: ({ color }) => {
    const fill = tint(color, '#5daa3c');
    return (
      <g transform="rotate(-20 50 50)">
        <path
          d="M50 8 C46 14 46 18 50 20"
          fill="none"
          stroke={shade(fill, -0.35)}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <path
          d="M50 20 C70 24 72 60 62 86 C58 94 42 94 38 86 C28 60 30 24 50 20 Z"
          fill={fill}
          {...LINE}
        />
        {[
          [44, 34],
          [56, 36],
          [42, 50],
          [58, 52],
          [46, 66],
          [56, 72],
          [50, 82],
        ].map(([x, y]) => (
          <ellipse
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            rx={3}
            ry={5}
            fill={shade(fill, 0.25)}
            {...LINE}
            strokeWidth={1.5}
          />
        ))}
      </g>
    );
  },
  'jeruk-nipis': ({ color }) => {
    const fill = tint(color, '#8fd14f');
    return (
      <g>
        <circle cx={36} cy={56} r={24} fill={fill} {...LINE} />
        <path
          d="M36 32 C40 26 46 24 52 26 C48 30 42 32 36 32 Z"
          fill={LEAF}
          {...LINE}
          strokeWidth={2}
        />
        <circle cx={68} cy={62} r={22} fill="#e8f7c8" {...LINE} />
        <circle cx={68} cy={62} r={16} fill="#c9ec8a" />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <path
            key={a}
            d="M68 62 L68 47"
            stroke="#ffffff"
            strokeWidth={2.5}
            transform={`rotate(${a} 68 62)`}
          />
        ))}
      </g>
    );
  },
  lidah: ({ color }) => (
    <g>
      <path
        d="M14 40 C14 22 86 22 86 40 C86 72 70 90 50 90 C30 90 14 72 14 40 Z"
        fill="#f6c79a"
        {...LINE}
      />
      <path
        d="M26 42 C36 36 64 36 74 42 C72 58 62 66 50 66 C38 66 28 58 26 42 Z"
        fill="#7a2a2a"
        {...LINE}
        strokeWidth={2.5}
      />
      <path
        d="M36 52 C36 46 64 46 64 52 C64 70 58 80 50 80 C42 80 36 70 36 52 Z"
        fill={tint(color, '#ff7b9a')}
        {...LINE}
      />
      <path
        d="M50 54 V70"
        stroke={shade('#ff7b9a', -0.25)}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path d="M30 42 h40" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" />
    </g>
  ),
  kandang: ({ color }) => {
    const wood = tint(color, WOOD);
    return (
      <g>
        <path d="M8 44 L50 14 L92 44 Z" fill={PALETTE.merah.fill} {...LINE} />
        <rect x={14} y={44} width={72} height={46} fill={wood} {...LINE} />
        <path d="M14 58 H86 M14 74 H86" stroke={shade(wood, -0.3)} strokeWidth={2.5} />
        <path d="M38 90 V62 H62 V90" fill="#5a3a26" {...LINE} />
        <path d="M38 62 L62 90 M62 62 L38 90" stroke={wood} strokeWidth={3} />
        <circle cx={50} cy={32} r={6} fill="#ffffff" {...LINE} strokeWidth={2} />
      </g>
    );
  },
  kolam: ({ color }) => {
    const water = tint(color, WATER);
    return (
      <g>
        <ellipse cx={50} cy={64} rx={44} ry={24} fill="#9aa3b2" {...LINE} />
        <ellipse cx={50} cy={62} rx={36} ry={18} fill={water} {...LINE} strokeWidth={2.5} />
        <g className="va-wave">
          <path
            d="M28 60 q6 -4 12 0 M54 68 q6 -4 12 0"
            fill="none"
            stroke="#ffffff"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>
        <ellipse cx={70} cy={54} rx={10} ry={5} fill={LEAF} {...LINE} strokeWidth={2} />
        <path
          d="M16 46 C16 30 12 22 8 18 M22 44 C24 30 26 22 30 16"
          fill="none"
          stroke={LEAF}
          strokeWidth={4}
          strokeLinecap="round"
        />
      </g>
    );
  },
  'sarang-lebah': ({ color }) => {
    const fill = tint(color, '#f2b13a');
    return (
      <g>
        <path d="M50 4 V14" {...LINE} strokeWidth={4} />
        <path
          d="M50 14 C74 14 82 34 80 56 C78 80 64 92 50 92 C36 92 22 80 20 56 C18 34 26 14 50 14 Z"
          fill={fill}
          {...LINE}
        />
        <path d="M24 34 H76 M20 52 H80 M22 70 H78" stroke={shade(fill, -0.3)} strokeWidth={3} />
        <ellipse cx={50} cy={78} rx={7} ry={6} fill="#5a3a26" />
        <g className="va-bob">
          <ellipse
            cx={84}
            cy={30}
            rx={6}
            ry={4.5}
            fill={PALETTE.kuning.fill}
            {...LINE}
            strokeWidth={1.5}
          />
          <path d="M82 27 v6 M86 27 v6" stroke={OUTLINE} strokeWidth={1.5} />
          <ellipse cx={84} cy={25} rx={4} ry={2.5} fill="#e8f6ff" {...LINE} strokeWidth={1} />
        </g>
      </g>
    );
  },
} satisfies Record<string, ObjectArt>;
