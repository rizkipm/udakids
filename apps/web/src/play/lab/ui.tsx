import { useEffect, useRef, useState } from 'react';

/** Goyang lembut untuk pilihan yang belum tepat (tanpa merah, tanpa kata "salah"). */
export function useShake() {
  const [s, set] = useState<{ k: string; n: number }>();
  return {
    key: (k: string) => `${k}-${s?.k === k ? s.n : 0}`,
    on: (k: string) => s?.k === k,
    shake: (k: string) => set((x) => ({ k, n: (x?.n ?? 0) + 1 })),
  };
}

export function useLater() {
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (fn: () => void, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(fn, ms);
  };
}

export function DoneNote({ text }: { text: string }) {
  return (
    <p className="lab-done-note" role="status">
      <StarIcon /> {text}
    </p>
  );
}

export function StarIcon({ size = 28, off = false }: { size?: number; off?: boolean }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden
      className={off ? 'is-off' : undefined}
    >
      <path
        d="M24 4l6 13 14 1.5-10.5 9.5 3 14L24 35l-12.5 7 3-14L4 18.5 18 17z"
        fill={off ? '#e8e3f4' : '#f7c948'}
        stroke="#2b2540"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
