import { useEffect, useMemo, useState } from 'react';
import { numberWord, type Interaction } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import { useSayChoice } from '../itemVoice';
import './paud-games.css';

type Count = Extract<Interaction, { type: 'count' }>;

/** Warna-warni ceria (kontras tinggi dengan garis gelap). */
const PALETTE = [
  '#ff8a3d',
  '#ffd166',
  '#5cc96b',
  '#4cc9f0',
  '#b388ff',
  '#ff6b9a',
  '#f7c948',
  '#2ec4b6',
];

/** Posisi tetap per soal (bukan acak per render): grid longgar dengan geser kecil. */
function layout(n: number, w: number, h: number, pad: number) {
  const cols = Math.ceil(Math.sqrt(n * (w / h)));
  const rows = Math.ceil(n / cols);
  return Array.from({ length: n }, (_, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const jitterX = ((i * 37) % 11) - 5;
    const jitterY = ((i * 53) % 9) - 4;
    return {
      x: pad + ((c + 0.5) * (w - 2 * pad)) / cols + jitterX,
      y: pad + ((r + 0.5) * (h - 2 * pad)) / rows + jitterY,
    };
  });
}

function Fish({ color, lit, flip }: { color: string; lit: boolean; flip: boolean }) {
  return (
    <g transform={flip ? 'scale(-1,1)' : undefined} className={lit ? 'is-lit' : ''}>
      <path
        d="M-22 0 L-34 -12 L-34 12 Z"
        fill={color}
        stroke="#2b2540"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <ellipse cx="0" cy="0" rx="24" ry="15" fill={color} stroke="#2b2540" strokeWidth="3" />
      <path d="M-4 -14 Q4 -24 12 -13" fill={color} stroke="#2b2540" strokeWidth="2.5" />
      <circle cx="11" cy="-3" r="4.5" fill="#fff" stroke="#2b2540" strokeWidth="2" />
      <circle cx="12" cy="-3" r="2" fill="#2b2540" />
      <path
        d="M-6 6 Q0 10 6 6"
        fill="none"
        stroke="#2b2540"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

function Snowball({ lit }: { lit: boolean }) {
  return (
    <g className={lit ? 'is-lit' : ''}>
      <circle r="20" fill="#fff" stroke="#2b2540" strokeWidth="3" />
      <path
        d="M-10 -6 Q-4 -12 4 -10"
        fill="none"
        stroke="#bfe3ff"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="8" cy="7" r="3" fill="#dceeff" />
    </g>
  );
}

/**
 * Hitung & ketuk (D-108, PAUD): adegan berwarna — ikan berenang di akuarium, ular warna-warni, atau bola salju.
 * Setiap benda yang diketuk menyala dan Momo menyebut hitungannya; lalu anak mengetuk angka. Penilaian di engine.
 */
export function CountGame({
  interaction: it,
  disabled,
  showAnswer,
  onSubmit,
}: {
  interaction: Count;
  disabled: boolean;
  showAnswer: boolean;
  onSubmit: (id: string) => void;
}) {
  const [lit, setLit] = useState<number[]>([]);
  const sayChoice = useSayChoice();
  useEffect(() => setLit([]), [it]);
  const W = 360;
  const H = it.theme === 'snake' ? 200 : 240;
  const spots = useMemo(() => layout(it.n, W, H, 34), [it.n, H]);
  const tap = (i: number) => {
    if (disabled || lit.includes(i)) return;
    const next = [...lit, i];
    setLit(next);
    speak(numberWord(next.length));
  };
  const allLit = showAnswer || lit.length === it.n;

  const snake = it.theme === 'snake';
  // Ular: ruas berjajar berkelok (gelombang sinus), kepala di ujung kanan.
  const seg = snake
    ? Array.from({ length: it.n }, (_, i) => ({
        x: 32 + (i * (W - 104)) / Math.max(1, it.n - 1),
        y: H / 2 + Math.sin(i * 0.9) * 34,
      }))
    : spots;

  return (
    <div className={`paud-board count-board is-${it.theme}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`count-scene is-${it.theme}`}
        role="img"
        aria-label={t('play.count.scene')}
      >
        {it.theme === 'aquarium' && (
          <>
            <rect
              x="4"
              y="4"
              width={W - 8}
              height={H - 8}
              rx="22"
              fill="#bfeaff"
              stroke="#2b2540"
              strokeWidth="4"
            />
            <path
              d={`M4 ${H - 40} Q90 ${H - 60} 180 ${H - 40} T${W - 4} ${H - 40} V${H - 4} H4 Z`}
              fill="#ffe8a8"
            />
            <path
              d={`M40 ${H - 40} q-8 -40 6 -70 M56 ${H - 40} q10 -30 -2 -60`}
              stroke="#3fa66b"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
            />
            {[60, 140, 250, 310].map((x, k) => (
              <circle
                key={k}
                cx={x}
                cy={30 + ((k * 23) % 50)}
                r={4 + (k % 3)}
                fill="#fff"
                opacity="0.7"
                className="count-bubble"
              />
            ))}
          </>
        )}
        {it.theme === 'snow' && (
          <>
            <rect
              x="4"
              y="4"
              width={W - 8}
              height={H - 8}
              rx="22"
              fill="#d9ecff"
              stroke="#2b2540"
              strokeWidth="4"
            />
            <path
              d={`M4 ${H - 30} Q120 ${H - 60} 220 ${H - 34} T${W - 4} ${H - 30} V${H - 4} H4 Z`}
              fill="#fff"
            />
          </>
        )}
        {snake && (
          <>
            <rect
              x="4"
              y="4"
              width={W - 8}
              height={H - 8}
              rx="22"
              fill="#e6f7d9"
              stroke="#2b2540"
              strokeWidth="4"
            />
            <polyline
              points={seg.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#2b2540"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        {seg.map((p, i) => {
          const on = showAnswer || lit.includes(i);
          const color = PALETTE[i % PALETTE.length]!;
          return (
            <g
              key={i}
              transform={`translate(${p.x} ${p.y})`}
              className={`count-obj${on ? ' is-on' : ''}`}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={t('play.count.object', { n: i + 1 })}
              onClick={() => tap(i)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && tap(i)}
            >
              {/* Area ketuk ≥ 64 px. */}
              <circle r="32" fill="transparent" />
              {it.theme === 'aquarium' && <Fish color={color} lit={on} flip={i % 2 === 1} />}
              {it.theme === 'snow' && <Snowball lit={on} />}
              {snake && (
                <circle
                  r="20"
                  fill={color}
                  stroke="#2b2540"
                  strokeWidth="3"
                  className={on ? 'is-lit' : ''}
                />
              )}
              {on && (
                <text y="6" textAnchor="middle" className="count-badge">
                  {(showAnswer ? i : lit.indexOf(i)) + 1}
                </text>
              )}
            </g>
          );
        })}
        {snake && (
          <g transform={`translate(${seg.at(-1)!.x + 34} ${seg.at(-1)!.y})`} aria-hidden>
            <ellipse rx="20" ry="16" fill="#5cc96b" stroke="#2b2540" strokeWidth="3" />
            <circle cx="6" cy="-5" r="4" fill="#fff" stroke="#2b2540" strokeWidth="2" />
            <circle cx="7" cy="-5" r="2" fill="#2b2540" />
            <path
              d="M18 2 l10 -3 M18 2 l10 4"
              stroke="#ff6b9a"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>
      <p className="kid-note" aria-live="polite">
        {allLit ? t('play.count.allCounted') : t('play.count.counted', { n: lit.length })}
      </p>
      <div className="count-choices">
        {it.choices.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`paud-bubble${showAnswer && c.id === it.answer ? ' is-answer' : ''}`}
            disabled={disabled}
            aria-label={c.say}
            onClick={() => {
              sayChoice(c);
              onSubmit(c.id);
            }}
          >
            <VisualView visual={c.visual} size={64} />
          </button>
        ))}
      </div>
    </div>
  );
}
