import { useEffect, useState } from 'react';
import {
  PLACE_VALUE,
  TENS_MAX,
  dotted,
  numberWord,
  tensParts,
  type Interaction,
  type TensPlace,
} from '@little-coder/engine';
import { speak } from '../../../audio/speech';
import { t } from '../../../i18n';
import { CheckButton } from '../../ItemPlayer';
import { ARENA_COLORS } from './parts';
import './arena.css';

type Tens = Extract<Interaction, { type: 'tens' }>;

/** Ular 10 ruas (puluhan) atau 1 ruas (satuan). */
function Snake({ segs, color }: { segs: number; color: string }) {
  const S = 13;
  const W = segs * S + 22;
  return (
    <svg viewBox={`0 0 ${W} 30`} width={W} height="30" aria-hidden className="tens-piece">
      {Array.from({ length: segs }, (_, i) => (
        <circle
          key={i}
          cx={8 + i * S}
          cy={15 + (i % 2 ? 3 : -3)}
          r="7.5"
          fill={i % 2 ? color : '#fff'}
          stroke="#2b2540"
          strokeWidth="2"
        />
      ))}
      <ellipse
        cx={W - 12}
        cy="15"
        rx="10"
        ry="8.5"
        fill={color}
        stroke="#2b2540"
        strokeWidth="2.5"
      />
      <circle cx={W - 9} cy="12" r="2.4" fill="#2b2540" />
    </svg>
  );
}

/** Balok nilai tempat: kubus ribuan, papan ratusan, batang puluhan, kubus satuan. */
function Block({ place, color }: { place: TensPlace; color: string }) {
  if (place === 'satu')
    return (
      <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden className="tens-piece">
        <rect
          x="1"
          y="1"
          width="12"
          height="12"
          rx="2"
          fill={color}
          stroke="#2b2540"
          strokeWidth="2"
        />
      </svg>
    );
  if (place === 'puluh')
    return (
      <svg viewBox="0 0 14 62" width="14" height="62" aria-hidden className="tens-piece">
        <rect
          x="1"
          y="1"
          width="12"
          height="60"
          rx="2"
          fill={color}
          stroke="#2b2540"
          strokeWidth="2"
        />
        {Array.from({ length: 9 }, (_, i) => (
          <line
            key={i}
            x1="1"
            x2="13"
            y1={7 + i * 6}
            y2={7 + i * 6}
            stroke="#2b2540"
            strokeWidth="1"
          />
        ))}
      </svg>
    );
  const s = place === 'ratus' ? 52 : 46;
  return (
    <svg
      viewBox={`0 0 ${s + 10} ${s + 10}`}
      width={s + 10}
      height={s + 10}
      aria-hidden
      className="tens-piece"
    >
      {place === 'ribu' && (
        <path
          d={`M1 9 L9 1 H${s + 9} V${s + 1} L${s + 1} ${s + 9} Z`}
          fill="#2b2540"
          opacity="0.25"
        />
      )}
      <rect
        x="1"
        y="9"
        width={s}
        height={s}
        rx="3"
        fill={color}
        stroke="#2b2540"
        strokeWidth="2.5"
      />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i}>
          <line
            x1={1 + (i + 1) * (s / 10)}
            x2={1 + (i + 1) * (s / 10)}
            y1="9"
            y2={s + 9}
            stroke="#2b2540"
            strokeWidth="0.8"
          />
          <line
            y1={9 + (i + 1) * (s / 10)}
            y2={9 + (i + 1) * (s / 10)}
            x1="1"
            x2={s + 1}
            stroke="#2b2540"
            strokeWidth="0.8"
          />
        </g>
      ))}
    </svg>
  );
}

const PLACE_COLOR: Record<TensPlace, string> = {
  ribu: ARENA_COLORS[4]!,
  ratus: ARENA_COLORS[1]!,
  puluh: ARENA_COLORS[3]!,
  satu: ARENA_COLORS[0]!,
};

/**
 * Ular puluhan / balok nilai tempat (D-115): tambah atau kurangi ular sepuluh ruas & ruas satuan (atau balok
 * ribuan, ratusan, puluhan, satuan) sampai sama dengan bilangan Momo, lalu Selesai. Penilaian di engine
 * (`tensValue`). Jumlah totalnya sengaja tidak ditampilkan; anak membaca nilai tempat dari susunannya.
 */
export function TensGame({
  interaction: it,
  disabled,
  showAnswer,
  onSubmit,
}: {
  interaction: Tens;
  disabled: boolean;
  showAnswer: boolean;
  onSubmit: (v: Record<string, string>) => void;
}) {
  const zero = () => Object.fromEntries(it.places.map((p) => [p, 0])) as Record<TensPlace, number>;
  const [n, setN] = useState(zero);
  useEffect(() => setN(zero()), [it]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = showAnswer
    ? (Object.fromEntries(
        Object.entries(tensParts(it.target, it.places)).map(([k, v]) => [k, Number(v)]),
      ) as Record<TensPlace, number>)
    : n;
  const bump = (p: TensPlace, d: number) => {
    if (disabled || showAnswer) return;
    const v = Math.max(0, Math.min(TENS_MAX, (n[p] ?? 0) + d));
    setN({ ...n, [p]: v });
    speak(t(`play.tens.say.${p}`, { n: numberWord(v) }));
  };
  const snake = it.theme === 'snake';

  return (
    <div className={`arena-board tens-board is-${it.theme}`}>
      <p className="tens-target" aria-label={numberWord(it.target)}>
        {dotted(it.target)}
      </p>
      <div
        className={`tens-cols${it.places.length > 2 ? ' is-wide' : ''}`}
        style={{ gridTemplateColumns: `repeat(${it.places.length}, minmax(0, 1fr))` }}
      >
        {it.places.map((p) => (
          <div key={p} className="tens-col">
            <span className="tens-label">{t(`play.tens.place.${p}`)}</span>
            <div
              className={`tens-pile is-${p}`}
              aria-label={t('play.tens.count', {
                n: shown[p] ?? 0,
                place: t(`play.tens.place.${p}`),
              })}
            >
              {Array.from({ length: shown[p] ?? 0 }, (_, i) =>
                snake ? (
                  <Snake
                    key={i}
                    segs={PLACE_VALUE[p] === 10 ? 10 : 1}
                    color={ARENA_COLORS[(i + (p === 'satu' ? 3 : 0)) % ARENA_COLORS.length]!}
                  />
                ) : (
                  <Block key={i} place={p} color={PLACE_COLOR[p]} />
                ),
              )}
            </div>
            <span className="tens-count">{shown[p] ?? 0}</span>
            <div className="tens-ctrl">
              <button
                type="button"
                className="g4-step"
                aria-label={t('play.tens.more', { place: t(`play.tens.place.${p}`) })}
                disabled={disabled || showAnswer || (n[p] ?? 0) >= TENS_MAX}
                onClick={() => bump(p, 1)}
              >
                +
              </button>
              <button
                type="button"
                className="g4-step"
                aria-label={t('play.tens.less', { place: t(`play.tens.place.${p}`) })}
                disabled={disabled || showAnswer || (n[p] ?? 0) <= 0}
                onClick={() => bump(p, -1)}
              >
                −
              </button>
            </div>
          </div>
        ))}
      </div>
      <CheckButton
        disabled={disabled || it.places.every((p) => (n[p] ?? 0) === 0)}
        onClick={() => onSubmit(Object.fromEntries(it.places.map((p) => [p, String(n[p] ?? 0)])))}
      />
    </div>
  );
}
