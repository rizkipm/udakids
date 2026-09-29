import type { Color } from '@little-coder/engine';

export type MomoMood = 'happy' | 'curious' | 'oops' | 'proud' | 'sleepy' | 'idle';

const BODY: Record<Color, string> = {
  merah: '#ef6f6c',
  biru: '#4f8ff7',
  kuning: '#f7c948',
  hijau: '#46b97a',
  ungu: '#8a6cf0',
  oranye: '#f79a4a',
};

/**
 * Momo, robot kecil. Placeholder SVG — antarmuka `mood` disiapkan agar bisa diganti animasi Rive
 * (PRD A3) tanpa mengubah pemakaian.
 */
export function Momo({
  mood = 'idle',
  color = 'ungu',
  size = 160,
  label,
}: {
  mood?: MomoMood;
  color?: Color;
  size?: number;
  label?: string;
}) {
  const body = BODY[color] ?? BODY.ungu;
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
      <line x1="56" y1="6" x2="56" y2="20" stroke="#2b2540" strokeWidth="4" strokeLinecap="round" />
      <circle
        cx="56"
        cy="6"
        r="6"
        fill={mood === 'proud' ? '#f7c948' : '#ffe08a'}
        stroke="#2b2540"
        strokeWidth="3"
      />
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
    </svg>
  );
}
