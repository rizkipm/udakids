import { useEffect, useMemo, useState } from 'react';
import type { Choice, Interaction } from '@little-coder/engine';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import { CheckButton } from '../ItemPlayer';
import { useSayChoice } from '../itemVoice';
import './fun.css';

type Order = Extract<Interaction, { type: 'order' }>;

function Card({ c, size }: { c: Choice; size: number }) {
  return c.visual.kind === 'word' ? (
    <span className="fun-word">{c.visual.text}</span>
  ) : (
    <VisualView visual={c.visual} size={size} />
  );
}

function Rocket({ ready }: { ready: boolean }) {
  return (
    <svg viewBox="0 0 80 140" className={`rocket-art${ready ? ' is-ready' : ''}`} aria-hidden>
      <path
        d="M40 6 C60 26 62 70 56 100 H24 C18 70 20 26 40 6 Z"
        fill="#f4f1ff"
        stroke="#2b2540"
        strokeWidth="4"
      />
      <circle cx="40" cy="48" r="11" fill="#4aa8ff" stroke="#2b2540" strokeWidth="4" />
      <path
        d="M24 78 L8 104 L24 100 Z M56 78 L72 104 L56 100 Z"
        fill="#ff7a59"
        stroke="#2b2540"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M30 104 Q40 134 50 104 Z"
        fill="#ffd166"
        stroke="#2b2540"
        strokeWidth="3"
        className="rocket-flame"
      />
    </svg>
  );
}

/**
 * Bianglala & roket (D-078): kartu diketuk berurutan dan naik ke kabin bianglala (atau panel hitung mundur
 * roket). Ketuk kabin yang terisi untuk menurunkan kartunya. Penilaian sama dengan `order`.
 */
export function WheelGame({
  interaction: it,
  disabled,
  showAnswer,
  onSubmit,
}: {
  interaction: Order;
  disabled: boolean;
  showAnswer: boolean;
  onSubmit: (ids: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const sayChoice = useSayChoice();
  useEffect(() => setPicked([]), [it]);
  const byId = useMemo(() => new Map(it.choices.map((c) => [c.id, c])), [it]);
  const order = showAnswer ? it.answer : picked;
  const n = it.choices.length;
  const full = picked.length === n;
  const slot = (i: number, extra = '') => {
    const id = order[i];
    const c = id ? byId.get(id) : undefined;
    return (
      <button
        key={i}
        type="button"
        className={`wheel-cabin${c ? ' is-filled' : ''}${i === picked.length && !showAnswer ? ' is-next' : ''}${extra}`}
        disabled={disabled || showAnswer || !c}
        aria-label={c ? (c.say ?? '') : t('play.wheel.cabin', { n: i + 1 })}
        onClick={() => setPicked((p) => p.filter((x) => x !== id))}
      >
        {c ? <Card c={c} size={44} /> : <span className="wheel-cabin-n">{i + 1}</span>}
      </button>
    );
  };
  return (
    <div className={`wheel-board is-${it.style ?? 'ferris'}`}>
      {it.style === 'rocket' ? (
        <div className="rocket-pad">
          <Rocket ready={full} />
          <div className="rocket-panel">{Array.from({ length: n }, (_, i) => slot(i))}</div>
        </div>
      ) : (
        <div
          className="ferris"
          style={{ ['--n' as string]: n, ['--turn' as string]: `${picked.length * 18}deg` }}
        >
          <svg viewBox="0 0 200 200" className="ferris-art" aria-hidden>
            <circle cx="100" cy="100" r="78" fill="none" stroke="var(--langit)" strokeWidth="8" />
            {Array.from({ length: n }, (_, i) => {
              const a = (i / n) * Math.PI * 2 - Math.PI / 2;
              return (
                <line
                  key={i}
                  x1="100"
                  y1="100"
                  x2={100 + 78 * Math.cos(a)}
                  y2={100 + 78 * Math.sin(a)}
                  stroke="var(--langit)"
                  strokeWidth="5"
                />
              );
            })}
            <circle cx="100" cy="100" r="12" fill="#ffd166" stroke="#2b2540" strokeWidth="4" />
            <path
              d="M100 100 L62 196 M100 100 L138 196"
              stroke="var(--malam)"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
          {Array.from({ length: n }, (_, i) => {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            return (
              <span
                key={i}
                className="ferris-seat"
                style={{ left: `${50 + 39 * Math.cos(a)}%`, top: `${50 + 39 * Math.sin(a)}%` }}
              >
                {slot(i)}
              </span>
            );
          })}
        </div>
      )}
      <div className="fun-tiles">
        {it.choices
          .filter((c) => !order.includes(c.id))
          .map((c) => (
            <button
              key={c.id}
              type="button"
              className="fun-tile is-card"
              disabled={disabled || showAnswer}
              aria-label={c.say}
              onClick={() => {
                sayChoice(c);
                setPicked((p) => [...p, c.id]);
              }}
            >
              <Card c={c} size={56} />
            </button>
          ))}
      </div>
      <CheckButton disabled={disabled || !full} onClick={() => onSubmit(picked)} />
    </div>
  );
}
