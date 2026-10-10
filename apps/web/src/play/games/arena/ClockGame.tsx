import { useEffect, useState } from 'react';
import { clockValue, type Interaction } from '@little-coder/engine';
import { t } from '../../../i18n';
import { CheckButton } from '../../ItemPlayer';
import './arena.css';

type Clock = Extract<Interaction, { type: 'clock' }>;

/** Jam analog besar; jarum pendek ikut bergeser sesuai menit (seperti jam sungguhan). */
function Face({ hour, minute }: { hour: number; minute: number }) {
  const ha = ((hour % 12) + minute / 60) * 30;
  const ma = minute * 6;
  return (
    <svg
      viewBox="-110 -110 220 220"
      className="clock-face"
      role="img"
      aria-label={t('play.clock.face')}
    >
      <circle r="104" fill="#ffffff" stroke="#2b2540" strokeWidth="6" />
      <circle r="96" fill="none" stroke="#ffd166" strokeWidth="6" />
      {Array.from({ length: 60 }, (_, i) => (
        <line
          key={i}
          x1="0"
          y1={i % 5 ? -88 : -82}
          x2="0"
          y2="-94"
          stroke="#2b2540"
          strokeWidth={i % 5 ? 1.5 : 3.5}
          transform={`rotate(${i * 6})`}
        />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i + 1) * Math.PI) / 6;
        return (
          <text
            key={i}
            x={Math.sin(a) * 68}
            y={-Math.cos(a) * 68 + 8}
            textAnchor="middle"
            className="clock-num"
          >
            {i + 1}
          </text>
        );
      })}
      <line
        className="clock-hand"
        x1="0"
        y1="10"
        x2="0"
        y2="-50"
        stroke="#ef476f"
        strokeWidth="10"
        strokeLinecap="round"
        style={{ transform: `rotate(${ha}deg)` }}
      />
      <line
        className="clock-hand"
        x1="0"
        y1="14"
        x2="0"
        y2="-80"
        stroke="#4361ee"
        strokeWidth="6"
        strokeLinecap="round"
        style={{ transform: `rotate(${ma}deg)` }}
      />
      <circle r="8" fill="#2b2540" />
    </svg>
  );
}

/**
 * Atur jam (D-115): tombol jam dan menit memutar jarum (menit per `step`; untuk target per menit tersedia juga
 * loncat 5 menit). Waktu digital sengaja tidak ditampilkan; anak membaca jarumnya sendiri. Penilaian di engine.
 */
export function ClockGame({
  interaction: it,
  disabled,
  showAnswer,
  onSubmit,
}: {
  interaction: Clock;
  disabled: boolean;
  showAnswer: boolean;
  onSubmit: (v: string) => void;
}) {
  const [time, setTime] = useState({ h: 12, m: 0 });
  useEffect(() => setTime({ h: 12, m: 0 }), [it]);
  const shown = showAnswer ? { h: it.hour, m: it.minute } : time;
  const move = (dm: number) => {
    if (disabled || showAnswer) return;
    // Menit berputar penuh → jam ikut maju/mundur, seperti memutar jarum panjang.
    const total = ((time.h % 12) * 60 + time.m + dm + 720 * 4) % 720;
    setTime({ h: Math.floor(total / 60) || 12, m: total % 60 });
  };
  const steps = it.step >= 60 ? [] : it.step === 1 ? [5, 1] : [it.step];

  return (
    <div className="arena-board clock-board">
      <Face hour={shown.h} minute={shown.m} />
      <div className="clock-ctrls">
        <div className="clock-ctrl">
          <span className="kid-note">{t('play.clock.hour')}</span>
          <button
            type="button"
            className="g4-step clock-btn is-hour"
            disabled={disabled || showAnswer}
            aria-label={t('play.clock.hourBack')}
            onClick={() => move(-60)}
          >
            −
          </button>
          <button
            type="button"
            className="g4-step clock-btn is-hour"
            disabled={disabled || showAnswer}
            aria-label={t('play.clock.hourNext')}
            onClick={() => move(60)}
          >
            +
          </button>
        </div>
        {steps.map((s) => (
          <div key={s} className="clock-ctrl">
            <span className="kid-note">{t('play.clock.minutes', { n: s })}</span>
            <button
              type="button"
              className="g4-step clock-btn is-minute"
              disabled={disabled || showAnswer}
              aria-label={t('play.clock.minuteBack', { n: s })}
              onClick={() => move(-s)}
            >
              −
            </button>
            <button
              type="button"
              className="g4-step clock-btn is-minute"
              disabled={disabled || showAnswer}
              aria-label={t('play.clock.minuteNext', { n: s })}
              onClick={() => move(s)}
            >
              +
            </button>
          </div>
        ))}
      </div>
      <CheckButton disabled={disabled} onClick={() => onSubmit(clockValue(time.h, time.m))} />
    </div>
  );
}
