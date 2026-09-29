import type { Stage } from '@little-coder/engine';

/**
 * Tanaman Skor Jago (PRD A9): Benih → Tunas → Pohon → Berbuah. Anak tidak pernah melihat angka.
 * `thirsty` = "perlu disiram" (ulangan terlewat) — tanaman tidak mengecil.
 */
export function Plant({
  stage,
  thirsty = false,
  size = 72,
  label,
}: {
  stage: Stage;
  thirsty?: boolean;
  size?: number;
  label?: string;
}) {
  const names = ['benih', 'tunas', 'pohon', 'pohon berbuah'];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role="img"
      aria-label={label ?? `Tanaman: ${names[stage]}${thirsty ? ', perlu disiram' : ''}`}
      className={`plant plant-${stage}`}
    >
      <path
        d="M16 62 h48 l-6 14 h-36 z"
        fill="#c9774a"
        stroke="#2b2540"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect
        x="12"
        y="56"
        width="56"
        height="8"
        rx="4"
        fill="#a85f38"
        stroke="#2b2540"
        strokeWidth="3"
      />
      {stage === 0 && (
        <ellipse cx="40" cy="52" rx="8" ry="5" fill="#8a5a33" stroke="#2b2540" strokeWidth="3" />
      )}
      {stage >= 1 && (
        <path
          d={stage === 1 ? 'M40 56 v-18' : 'M40 56 v-30'}
          stroke="#3f8f4f"
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}
      {stage === 1 && (
        <>
          <path
            d="M40 42 q-12 -2 -14 -12 q12 0 14 12z"
            fill="#5cc26f"
            stroke="#2b2540"
            strokeWidth="2.5"
          />
          <path
            d="M40 42 q12 -2 14 -12 q-12 0 -14 12z"
            fill="#5cc26f"
            stroke="#2b2540"
            strokeWidth="2.5"
          />
        </>
      )}
      {stage >= 2 && (
        <>
          <circle cx="40" cy="24" r="18" fill="#4fb565" stroke="#2b2540" strokeWidth="3" />
          <circle cx="26" cy="32" r="10" fill="#5cc26f" stroke="#2b2540" strokeWidth="3" />
          <circle cx="54" cy="32" r="10" fill="#5cc26f" stroke="#2b2540" strokeWidth="3" />
        </>
      )}
      {stage === 3 && (
        <>
          <circle cx="32" cy="20" r="5" fill="#f25f5c" stroke="#2b2540" strokeWidth="2" />
          <circle cx="48" cy="16" r="5" fill="#f7c948" stroke="#2b2540" strokeWidth="2" />
          <circle cx="54" cy="32" r="5" fill="#f79a4a" stroke="#2b2540" strokeWidth="2" />
          <circle cx="26" cy="34" r="5" fill="#f25f5c" stroke="#2b2540" strokeWidth="2" />
        </>
      )}
      {thirsty && (
        <path d="M66 10 q6 9 0 13 q-6 -4 0 -13z" fill="#4f8ff7" stroke="#2b2540" strokeWidth="2" />
      )}
    </svg>
  );
}
