import { useEffect, useState } from 'react';
import { numberWord, type AnswerResult, type Interaction } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { t } from '../../i18n';
import { CheckButton } from '../ItemPlayer';
import './paud-games.css';

type Build = Extract<Interaction, { type: 'build' }>;
const CANDLE = ['#ff6b9a', '#4cc9f0', '#ffd166', '#5cc96b', '#b388ff', '#ff8a3d'];

function Candle({ color, flame }: { color: string; flame: boolean }) {
  return (
    <svg viewBox="0 0 24 64" width="32" height="84" aria-hidden className="cake-candle">
      {flame && (
        <path
          className="cake-flame"
          d="M12 2 C18 10 18 16 12 20 C6 16 6 10 12 2 Z"
          fill="#ffb703"
          stroke="#e85d04"
          strokeWidth="2"
        />
      )}
      <rect
        x="6"
        y="22"
        width="12"
        height="40"
        rx="4"
        fill={color}
        stroke="#2b2540"
        strokeWidth="2.5"
      />
      <path d="M6 32 L18 28 M6 44 L18 40 M6 56 L18 52" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}

/**
 * Kue ulang tahun Momo (D-108, PAUD): ketuk lilin di nampan untuk menancapkannya di kue (Momo menyebut
 * hitungannya), ketuk lilin di kue untuk mencabutnya. Selesai → bila tepat, lilin menyala lalu ditiup.
 */
export function CakeGame({
  interaction: it,
  disabled,
  showAnswer,
  result,
  onSubmit,
}: {
  interaction: Build;
  disabled: boolean;
  showAnswer: boolean;
  result?: AnswerResult;
  onSubmit: (n: number) => void;
}) {
  const [n, setN] = useState(0);
  const [blown, setBlown] = useState(false);
  useEffect(() => {
    setN(0);
    setBlown(false);
  }, [it]);
  // Jawaban tepat: lilin menyala sebentar, lalu "ditiup".
  useEffect(() => {
    if (!result?.correct) return;
    const id = setTimeout(() => setBlown(true), 1200);
    return () => clearTimeout(id);
  }, [result?.correct]);
  const count = showAnswer ? it.target : n;
  const add = () => {
    if (disabled || n >= it.max) return;
    setN(n + 1);
    speak(numberWord(n + 1));
  };
  const remove = () => !disabled && n > 0 && setN(n - 1);

  return (
    <div className="paud-board cake-board">
      <div className={`cake-scene${result?.correct ? ' is-party' : ''}`}>
        <div className="cake-candles" role="group" aria-label={t('play.cake.onCake', { n: count })}>
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              className="cake-slot"
              disabled={disabled || showAnswer}
              aria-label={t('play.cake.remove')}
              onClick={remove}
            >
              <Candle color={CANDLE[i % CANDLE.length]!} flame={!!result?.correct && !blown} />
            </button>
          ))}
        </div>
        <svg viewBox="0 0 320 150" className="cake-body" aria-hidden>
          <ellipse cx="160" cy="138" rx="150" ry="10" fill="var(--bayangan)" />
          <rect
            x="30"
            y="70"
            width="260"
            height="66"
            rx="16"
            fill="#f7a8c8"
            stroke="#2b2540"
            strokeWidth="4"
          />
          <rect
            x="50"
            y="20"
            width="220"
            height="56"
            rx="16"
            fill="#ffd6e7"
            stroke="#2b2540"
            strokeWidth="4"
          />
          <path
            d="M50 46 Q75 60 100 46 T150 46 T200 46 T250 46 T270 46"
            fill="none"
            stroke="#fff"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {[70, 120, 170, 220, 260].map((x, k) => (
            <circle
              key={k}
              cx={x}
              cy={100 + (k % 2) * 14}
              r="6"
              fill={CANDLE[k]}
              stroke="#2b2540"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
      <p className="kid-note" aria-live="polite">
        {blown ? t('play.cake.blown') : t('play.cake.count', { n: count })}
      </p>
      <div className="cake-tray">
        <button
          type="button"
          className="paud-bubble cake-add"
          disabled={disabled || showAnswer || n >= it.max}
          aria-label={t('play.cake.add')}
          onClick={add}
        >
          <Candle color={CANDLE[n % CANDLE.length]!} flame={false} />
          <span aria-hidden>+</span>
        </button>
      </div>
      <CheckButton disabled={disabled || n === 0} onClick={() => onSubmit(n)} />
    </div>
  );
}
