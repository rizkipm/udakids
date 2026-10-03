import { createContext, useContext, useId, type ReactNode } from 'react';
import {
  ACCESSORY_DEFAULT_TONE,
  MOMO_TONES,
  type Color,
  type MomoAccessory,
  type MomoLook,
} from '@little-coder/engine';

export type MomoMood = 'happy' | 'curious' | 'oops' | 'proud' | 'sleepy' | 'idle';

const BODY: Record<Color, string> = {
  merah: '#ef6f6c',
  biru: '#4f8ff7',
  kuning: '#f7c948',
  hijau: '#46b97a',
  ungu: '#8a6cf0',
  oranye: '#f79a4a',
};

/** Tampilan Momo milik anak yang sedang bermain (D-051); dipakai oleh `<Momo own />`. */
const OwnLook = createContext<MomoLook | null>(null);
export function OwnMomoLook({ look, children }: { look: MomoLook | null; children: ReactNode }) {
  return <OwnLook.Provider value={look}>{children}</OwnLook.Provider>;
}

const LINE = '#2b2540';
/** Aksesori yang menutupi kepala → antena disembunyikan. */
const HIDES_ANTENNA: ReadonlySet<MomoAccessory> = new Set(['topi', 'peci', 'jilbab']);

/** Lapisan di belakang layar wajah (jilbab membingkai wajah). */
function AccessoryBack({ kind, fill }: { kind: MomoAccessory; fill: string }) {
  if (kind !== 'jilbab') return null;
  return (
    <path
      d="M56 8 C26 8 9 30 9 56 L9 90 C30 98 82 98 103 90 L103 56 C103 30 86 8 56 8 Z"
      fill={fill}
      stroke={LINE}
      strokeWidth="4"
      strokeLinejoin="round"
    />
  );
}

/** Lapisan di depan (rambut, topi, peci, pita) dan kain jilbab di dada. */
function AccessoryFront({ kind, fill }: { kind: MomoAccessory; fill: string }) {
  const stroke = { stroke: LINE, strokeWidth: 3, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'rambut-poni':
      return (
        <path
          d="M16 44 C14 22 32 13 56 13 C80 13 98 22 96 44 L90 36 L83 43 L76 34 L68 42 L60 33 L52 42 L44 34 L36 43 L29 34 L22 43 Z"
          fill={fill}
          {...stroke}
        />
      );
    case 'rambut-kuncir':
      return (
        <g fill={fill} {...stroke}>
          <circle cx="9" cy="42" r="9" />
          <circle cx="103" cy="42" r="9" />
          <path d="M16 40 C16 20 34 14 56 14 C78 14 96 20 96 40 C82 30 30 30 16 40 Z" />
          <circle cx="17" cy="38" r="3.5" fill="#f58fc0" />
          <circle cx="95" cy="38" r="3.5" fill="#f58fc0" />
        </g>
      );
    case 'rambut-keriting':
      return (
        <g fill={fill} {...stroke}>
          {[22, 34, 46, 58, 70, 82, 90].map((x, i) => (
            <circle key={x} cx={x} cy={i % 2 ? 18 : 22} r="10" />
          ))}
          <circle cx="16" cy="34" r="8" />
          <circle cx="96" cy="34" r="8" />
        </g>
      );
    case 'topi':
      return (
        <g {...stroke}>
          <path d="M18 34 C18 10 94 10 94 34 Z" fill={fill} />
          <rect x="52" y="29" width="54" height="8" rx="4" fill={fill} />
          <circle cx="56" cy="13" r="4" fill={fill} />
        </g>
      );
    case 'peci':
      return <path d="M22 28 L27 9 H85 L90 28 Z" fill={fill} {...stroke} />;
    case 'jilbab':
      return (
        <path
          d="M28 86 Q56 102 84 86 L86 96 Q56 116 26 96 Z"
          fill={fill}
          stroke={LINE}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      );
    case 'pita':
      return (
        <g fill={fill} {...stroke}>
          <path d="M80 22 L66 12 L66 32 Z" />
          <path d="M80 22 L94 12 L94 32 Z" />
          <circle cx="80" cy="22" r="5" />
        </g>
      );
    default:
      return null;
  }
}

/**
 * Momo, robot kecil. Placeholder SVG — antarmuka `mood` disiapkan agar bisa diganti animasi Rive
 * (PRD A3) tanpa mengubah pemakaian.
 */
export function Momo({
  mood = 'idle',
  color = 'ungu',
  size = 160,
  label,
  look,
  own = false,
}: {
  mood?: MomoMood;
  color?: Color;
  size?: number;
  label?: string;
  /** Gradasi & aksesori (D-051). */
  look?: MomoLook | null;
  /** Momo milik anak yang sedang bermain: tampilan diambil dari `OwnMomoLook`. */
  own?: boolean;
}) {
  const ownLook = useContext(OwnLook);
  const style = look !== undefined ? look : own ? ownLook : null;
  const gid = `momo-g${useId().replace(/:/g, '')}`;
  const base = BODY[color] ?? BODY.ungu;
  const second = style?.gradient ? MOMO_TONES[style.gradient] : undefined;
  const body = second ? `url(#${gid})` : base;
  const accessory: MomoAccessory = style?.accessory ?? 'none';
  const accFill = MOMO_TONES[style?.accessoryColor ?? ACCESSORY_DEFAULT_TONE[accessory]];
  const antenna = !HIDES_ANTENNA.has(accessory);
  const eyes =
    mood === 'happy' || mood === 'proud' ? (
      <>
        <path
          d="M38 50 q6 -8 12 0"
          stroke="#1d1a2e"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M62 50 q6 -8 12 0"
          stroke="#1d1a2e"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ) : mood === 'sleepy' ? (
      <>
        <path d="M38 50 h12" stroke="#1d1a2e" strokeWidth="4" strokeLinecap="round" />
        <path d="M62 50 h12" stroke="#1d1a2e" strokeWidth="4" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="44" cy="50" r={mood === 'oops' ? 7 : 6} fill="#1d1a2e" />
        <circle cx="68" cy="50" r={mood === 'oops' ? 7 : 6} fill="#1d1a2e" />
        <circle cx="46" cy="48" r="2" fill="#fff" />
        <circle cx="70" cy="48" r="2" fill="#fff" />
      </>
    );
  const mouth =
    mood === 'oops' ? (
      <ellipse cx="56" cy="66" rx="6" ry="5" fill="#1d1a2e" />
    ) : mood === 'curious' ? (
      <path
        d="M48 66 q8 4 16 -2"
        stroke="#1d1a2e"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
    ) : mood === 'sleepy' || mood === 'idle' ? (
      <path
        d="M48 66 q8 5 16 0"
        stroke="#1d1a2e"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
    ) : (
      <path d="M44 62 q12 14 24 0 z" fill="#1d1a2e" />
    );
  return (
    <svg
      className={`momo momo-${mood}`}
      width={size}
      height={size * 1.15}
      viewBox="0 0 112 128"
      role="img"
      aria-label={label ?? 'Momo'}
    >
      {second && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={base} />
            <stop offset="100%" stopColor={second} />
          </linearGradient>
        </defs>
      )}
      {antenna && (
        <>
          <line
            x1="56"
            y1="6"
            x2="56"
            y2="20"
            stroke="#2b2540"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle
            cx="56"
            cy="6"
            r="6"
            fill={mood === 'proud' ? '#f7c948' : '#ffe08a'}
            stroke="#2b2540"
            strokeWidth="3"
          />
        </>
      )}
      <rect
        x="16"
        y="20"
        width="80"
        height="64"
        rx="24"
        fill={body}
        stroke="#2b2540"
        strokeWidth="4"
      />
      <AccessoryBack kind={accessory} fill={accFill} />
      <rect
        x="28"
        y="34"
        width="56"
        height="42"
        rx="16"
        fill="#fff8ec"
        stroke="#2b2540"
        strokeWidth="3"
      />
      {eyes}
      {mouth}
      {(mood === 'happy' || mood === 'proud') && (
        <>
          <circle cx="36" cy="64" r="4" fill="#ffb3b0" />
          <circle cx="76" cy="64" r="4" fill="#ffb3b0" />
        </>
      )}
      <rect
        x="30"
        y="86"
        width="52"
        height="30"
        rx="12"
        fill={body}
        stroke="#2b2540"
        strokeWidth="4"
      />
      <path
        d={mood === 'happy' || mood === 'proud' ? 'M30 92 l-16 -18' : 'M30 96 l-14 10'}
        stroke="#2b2540"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d={
          mood === 'happy' || mood === 'proud'
            ? 'M82 92 l16 -18'
            : mood === 'curious'
              ? 'M82 94 l14 -12'
              : 'M82 96 l14 10'
        }
        stroke="#2b2540"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="56" cy="101" r="5" fill="#fff8ec" stroke="#2b2540" strokeWidth="2" />
      <AccessoryFront kind={accessory} fill={accFill} />
    </svg>
  );
}
