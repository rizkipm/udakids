import { useEffect, useRef, useState } from 'react';
import { sortStep, type Interaction } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import { useSayChoice } from '../itemVoice';
import './fun.css';

type Sort = Extract<Interaction, { type: 'sort' }>;

function Basket() {
  return (
    <svg viewBox="0 0 120 56" className="sort-basket-art" aria-hidden>
      <path
        d="M6 10 H114 L100 52 H20 Z"
        fill="#e9c46a"
        stroke="#2b2540"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M18 22 H102 M24 36 H96" stroke="#b9873a" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function TruckBed() {
  return (
    <svg viewBox="0 0 120 56" className="sort-basket-art" aria-hidden>
      <rect
        x="4"
        y="8"
        width="84"
        height="30"
        rx="5"
        fill="#ffb84d"
        stroke="#2b2540"
        strokeWidth="4"
      />
      <path
        d="M88 16 H104 L116 28 V38 H88 Z"
        fill="#4aa8ff"
        stroke="#2b2540"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {[24, 70, 104].map((x) => (
        <circle key={x} cx={x} cy="44" r="9" fill="#2b2540" stroke="#fff" strokeWidth="3" />
      ))}
    </svg>
  );
}

/**
 * Sortir keranjang (D-078): benda datang satu per satu di atas; anak mengetuk keranjang (atau truk) yang
 * tepat. Keranjang lain hanya bergoyang dan Momo mengajak berpikir lagi — tanpa kata "salah". Penilaian
 * di engine (`sortReplay`).
 */
export function SortGame({
  interaction: it,
  disabled,
  showAnswer,
  onDone,
}: {
  interaction: Sort;
  disabled: boolean;
  showAnswer: boolean;
  onDone: (taps: string[]) => void;
}) {
  const [placed, setPlaced] = useState(0);
  const [shake, setShake] = useState<{ bin: string; n: number }>();
  const taps = useRef<string[]>([]);
  const sayChoice = useSayChoice();
  useEffect(() => {
    setPlaced(0);
    setShake(undefined);
    taps.current = [];
  }, [it]);
  const current = it.items[placed];
  // Benda baru dibacakan saat muncul.
  useEffect(() => {
    if (current && !disabled && !showAnswer) sayChoice(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);
  const done = placed === it.items.length;
  const inBin = (bin: string) =>
    it.items.filter((x, k) => (showAnswer || k < placed) && it.answer[x.id] === bin);

  const drop = (bin: string) => {
    if (disabled || done || !current || showAnswer) return;
    taps.current = [...taps.current, `${current.id}>${bin}`];
    const r = sortStep(it.items, it.answer, placed, bin);
    if (r.slip) {
      setShake((s) => ({ bin, n: (s?.n ?? 0) + 1 }));
      speak(t('play.sort.again', { thing: current.say ?? '' }));
      return;
    }
    setPlaced(r.placed);
    if (r.placed === it.items.length) {
      speak(t('play.sort.done'));
      onDone(taps.current);
    }
  };

  return (
    <div className={`sort-board is-${it.style}${done ? ' is-done' : ''}`}>
      <div className="sort-belt" aria-live="polite">
        {current && !showAnswer ? (
          <button
            key={current.id}
            type="button"
            className="sort-item"
            disabled={disabled}
            aria-label={current.say}
            onClick={() => sayChoice(current)}
          >
            {current.visual.kind === 'word' ? (
              <span className="fun-word">{current.visual.text}</span>
            ) : (
              <VisualView visual={current.visual} size={96} />
            )}
          </button>
        ) : (
          <span className="kid-note">{t('play.sort.finished')}</span>
        )}
        <span className="sort-count">
          {t('play.sort.progress', { n: placed, of: it.items.length })}
        </span>
      </div>
      <div className="sort-bins" style={{ ['--bins' as string]: it.bins.length }}>
        {it.bins.map((b) => (
          <button
            key={`${b.id}-${shake?.bin === b.id ? shake.n : 0}`}
            type="button"
            className={`sort-bin${shake?.bin === b.id ? ' is-shake' : ''}`}
            disabled={disabled}
            aria-label={t('play.sort.bin', { name: b.say ?? '' })}
            onClick={() => drop(b.id)}
          >
            <span className="sort-bin-icon">
              <VisualView visual={b.visual} size={52} />
            </span>
            <span className="sort-bin-name">{b.say}</span>
            <span className="sort-bin-in">
              {inBin(b.id).map((x) => (
                <span key={x.id} className="sort-bin-thumb">
                  {x.visual.kind === 'word' ? (
                    <span className="fun-word is-small">{x.visual.text}</span>
                  ) : (
                    <VisualView visual={x.visual} size={26} />
                  )}
                </span>
              ))}
            </span>
            {it.style === 'trucks' ? <TruckBed /> : <Basket />}
          </button>
        ))}
      </div>
    </div>
  );
}
