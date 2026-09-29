/** Ikon SVG area anak (tanpa emoji, PRD A14). Warna mengikuti `currentColor`. */

export function BackIcon() {
  return (
    <svg viewBox="0 0 48 48" width="32" height="32" aria-hidden>
      <path
        d="M30 10L16 24l14 14"
        stroke="currentColor"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type StatKind = 'current' | 'points' | 'passed' | 'time' | 'rank' | 'highest' | 'played';

export function StatIcon({ kind, size = 34 }: { kind: StatKind; size?: number }) {
  const common = { viewBox: '0 0 48 48', width: size, height: size, 'aria-hidden': true } as const;
  switch (kind) {
    case 'points':
      return (
        <svg {...common} className="stat-icon">
          <path
            d="M24 4l6 13 14 1.5-10.5 9.5 3 14L24 35l-12.5 7 3-14L4 18.5 18 17z"
            fill="currentColor"
          />
        </svg>
      );
    case 'passed':
      return (
        <svg {...common} className="stat-icon">
          <path d="M10 44V6" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          <path d="M12 8h26l-6 8 6 8H12z" fill="currentColor" />
        </svg>
      );
    case 'time':
      return (
        <svg {...common} className="stat-icon">
          <circle cx="24" cy="27" r="17" fill="none" stroke="currentColor" strokeWidth="5" />
          <path
            d="M24 17v10l7 5"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <rect x="18" y="2" width="12" height="6" rx="3" fill="currentColor" />
        </svg>
      );
    case 'rank':
      return (
        <svg {...common} className="stat-icon">
          <path d="M14 4h20l-4 14H18z" fill="currentColor" opacity="0.55" />
          <circle cx="24" cy="30" r="13" fill="currentColor" />
          <path d="M24 23l2.5 5 5.5.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.5-.8z" fill="#fff" />
        </svg>
      );
    case 'highest':
      return (
        <svg {...common} className="stat-icon">
          <path d="M4 42L18 16l8 12 6-8 12 22z" fill="currentColor" />
          <path d="M18 16l-4 8h8z" fill="#fff" opacity="0.8" />
        </svg>
      );
    case 'played':
      return (
        <svg {...common} className="stat-icon">
          <rect x="6" y="12" width="36" height="26" rx="10" fill="currentColor" />
          <path d="M15 21v8M11 25h8" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <circle cx="31" cy="22" r="3" fill="#fff" />
          <circle cx="36" cy="28" r="3" fill="#fff" />
        </svg>
      );
    default:
      return (
        <svg {...common} className="stat-icon">
          <path
            d="M8 36c6-14 10-20 16-20s10 6 16 20"
            stroke="currentColor"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="24" cy="12" r="6" fill="currentColor" />
        </svg>
      );
  }
}

export function Crown({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 32" width={size} height={(size * 32) / 48} aria-hidden className="crown">
      <path
        d="M4 28L2 6l12 10L24 2l10 14L46 6l-2 22z"
        fill="#f5b400"
        stroke="#1d1a2e"
        strokeWidth="2.5"
      />
      <circle cx="24" cy="20" r="3" fill="#e2412f" />
    </svg>
  );
}

export function TrophyIcon({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <path
        d="M14 6h20v12a10 10 0 0 1-20 0z"
        fill="#f7c948"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M14 10H7a7 7 0 0 0 7 9M34 10h7a7 7 0 0 1-7 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path d="M20 28h8v7h-8z" fill="#f7c948" stroke="currentColor" strokeWidth="3" />
      <rect x="13" y="35" width="22" height="8" rx="2" fill="currentColor" />
    </svg>
  );
}

export function DoorIcon({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <path d="M10 6h20v36H10z" fill="#fff" stroke="currentColor" strokeWidth="3.5" />
      <circle cx="25" cy="25" r="2.5" fill="currentColor" />
      <path
        d="M34 24h10M39 18l6 6-6 6"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockIcon({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <rect x="10" y="21" width="28" height="20" rx="5" fill="currentColor" />
      <path d="M16 21v-6a8 8 0 0 1 16 0v6" fill="none" stroke="currentColor" strokeWidth="5" />
    </svg>
  );
}

export function CheckIcon({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="20" fill="#2e9e5b" />
      <path
        d="M14 25l7 7 13-14"
        stroke="#fff"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlayIcon({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <path d="M16 10l24 14-24 14z" fill="currentColor" />
    </svg>
  );
}

export function BookIcon({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <path
        d="M6 9h14a5 5 0 0 1 4 2 5 5 0 0 1 4-2h14v30H28a4 4 0 0 0-4 3 4 4 0 0 0-4-3H6z"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M24 11v31" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
