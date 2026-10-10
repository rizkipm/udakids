/** Potongan gambar bersama Arena game Momo (D-115): SVG sendiri, tanpa emoji. */

export const ARENA_COLORS = [
  '#ff6b9a',
  '#4cc9f0',
  '#ffd166',
  '#5cc96b',
  '#b388ff',
  '#ff8a3d',
  '#2ec4b6',
  '#f7c948',
];

export function Speaker() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      <path
        d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Letusan kembang api kecil (dipakai saat jawaban tepat). */
export function Burst({ size = 64, color = '#ffd166' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="-32 -32 64 64" width={size} height={size} aria-hidden className="arena-burst">
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i * Math.PI) / 5;
        return (
          <line
            key={i}
            x1={Math.cos(a) * 9}
            y1={Math.sin(a) * 9}
            x2={Math.cos(a) * 26}
            y2={Math.sin(a) * 26}
            stroke={i % 2 ? color : ARENA_COLORS[i % ARENA_COLORS.length]}
            strokeWidth="4"
            strokeLinecap="round"
          />
        );
      })}
      <circle r="6" fill={color} stroke="#2b2540" strokeWidth="2" />
    </svg>
  );
}

/** Letak mata dadu 1–6 dalam kotak 0..1. */
const PIPS: Record<number, [number, number][]> = {
  0: [],
  1: [[0.5, 0.5]],
  2: [
    [0.25, 0.25],
    [0.75, 0.75],
  ],
  3: [
    [0.25, 0.25],
    [0.5, 0.5],
    [0.75, 0.75],
  ],
  4: [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
  ],
  5: [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.5, 0.5],
    [0.25, 0.75],
    [0.75, 0.75],
  ],
  6: [
    [0.25, 0.22],
    [0.75, 0.22],
    [0.25, 0.5],
    [0.75, 0.5],
    [0.25, 0.78],
    [0.75, 0.78],
  ],
};

export function Pips({
  value,
  x,
  y,
  s,
  color = '#2b2540',
}: {
  value: number;
  x: number;
  y: number;
  s: number;
  color?: string;
}) {
  return (
    <>
      {(PIPS[value] ?? []).map(([px, py], i) => (
        <circle key={i} cx={x + px * s} cy={y + py * s} r={s * 0.09} fill={color} />
      ))}
    </>
  );
}

/** Dadu berwarna (ukuran px). */
export function Die({ value, color, size = 64 }: { value: number; color: string; size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className="arena-die">
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="14"
        fill={color}
        stroke="#2b2540"
        strokeWidth="4"
      />
      <Pips value={value} x={6} y={6} s={52} color="#2b2540" />
    </svg>
  );
}

/** Kartu domino dua sisi. */
export function Domino({ a, b, size = 120 }: { a: number; b: number; size?: number }) {
  return (
    <svg viewBox="0 0 128 64" width={size} height={size / 2} aria-hidden className="arena-domino">
      <rect
        x="3"
        y="3"
        width="122"
        height="58"
        rx="12"
        fill="#ffffff"
        stroke="#2b2540"
        strokeWidth="4"
      />
      <line x1="64" y1="10" x2="64" y2="54" stroke="#2b2540" strokeWidth="3" />
      <Pips value={a} x={8} y={6} s={52} color="#e85d75" />
      <Pips value={b} x={68} y={6} s={52} color="#3a86ff" />
    </svg>
  );
}
