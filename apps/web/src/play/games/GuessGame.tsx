import { useEffect, useRef, useState } from 'react';
import {
  dotted,
  fromDigits,
  gameOver,
  guessHints,
  guessReplay,
  type GuessHint,
  type Interaction,
} from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { Momo } from '../../components/Momo';
import { t, type MessageKey } from '../../i18n';
import './g4.css';

type Guess = Extract<Interaction, { type: 'guess' }>;

const PLACE = (i: number) => t(`play.guess.place${i}` as MessageKey);
const HINT: Record<GuessHint, MessageKey> = {
  naik: 'play.guess.hintUp',
  turun: 'play.guess.hintDown',
  tepat: 'play.guess.hintOk',
};

/** Panah petunjuk (SVG, tanpa emoji): naik, turun, atau centang. */
function HintIcon({ h }: { h: GuessHint }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden className={`g4-hint is-${h}`}>
      {h === 'tepat' ? (
        <path
          d="M5 13l4 4 10-11"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      ) : (
        <path
          d={h === 'naik' ? 'M12 4l7 9h-4v7H9v-7H5z' : 'M12 20l7-9h-4V4H9v7H5z'}
          fill="currentColor"
        />
      )}
    </svg>
  );
}

/**
 * Tebak Angka Momo (D-096): anak memutar angka per nilai tempat lalu menekan Tebak. Momo memberi petunjuk lebih
 * besar/lebih kecil untuk bilangan utuh atau untuk setiap nilai tempat. Tebakan yang mengabaikan petunjuk
 * dihitung keliru oleh engine (`guessReplay`). Tanpa batas waktu.
 */
export function GuessGame({
  interaction: it,
  disabled,
  showAnswer,
  onDone,
}: {
  interaction: Guess;
  disabled: boolean;
  showAnswer: boolean;
  onDone: (taps: string[]) => void;
}) {
  const start = () => String(it.min).padStart(it.digits, '0').split('').map(Number);
  const [digits, setDigits] = useState<number[]>(start);
  const [history, setHistory] = useState<{ n: number; hints: GuessHint[] }[]>([]);
  const [wobble, setWobble] = useState(0);
  const taps = useRef<string[]>([]);
  useEffect(() => {
    setDigits(start());
    setHistory([]);
    taps.current = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [it]);
  const shown = showAnswer
    ? String(it.secret).padStart(it.digits, '0').split('').map(Number)
    : digits;
  const replay = guessReplay(it, taps.current);
  const done = replay.done;

  const turn = (i: number, d: number) =>
    !disabled && !done && setDigits((ds) => ds.map((x, k) => (k === i ? (x + d + 10) % 10 : x)));

  const guess = () => {
    if (disabled || done || showAnswer) return;
    const n = fromDigits(digits);
    taps.current = [...taps.current, String(n)];
    const before = replay.slips;
    const r = guessReplay(it, taps.current);
    setHistory((h) => [{ n, hints: guessHints(it, n) }, ...h]);
    if (r.done) {
      speak(t('play.guess.found'));
      return onDone(taps.current);
    }
    if (r.slips > before) setWobble((w) => w + 1);
    if (gameOver(it, taps.current)) return onDone(taps.current);
    speak(
      t(
        it.hint === 'digit'
          ? 'play.guess.digits'
          : n < it.secret
            ? 'play.guess.higher'
            : 'play.guess.lower',
      ),
    );
  };

  return (
    <div className="g4-board guess-board">
      <Momo own mood={done ? 'happy' : 'curious'} size={84} />
      {it.hint === 'number' && (
        <p className="kid-note">
          {t('play.guess.range', { lo: dotted(replay.lo), hi: dotted(replay.hi) })}
        </p>
      )}
      <div className={`guess-dials${wobble ? ' is-wobble' : ''}`} key={wobble}>
        {shown.map((d, i) => {
          const place = PLACE(it.digits - 1 - i);
          return (
            <div key={i} className="guess-dial">
              <button
                type="button"
                className="g4-step"
                aria-label={t('play.guess.up', { place })}
                disabled={disabled || done || showAnswer}
                onClick={() => turn(i, 1)}
              >
                <HintIcon h="naik" />
              </button>
              <span className="guess-digit" aria-live="polite">
                {d}
              </span>
              <button
                type="button"
                className="g4-step"
                aria-label={t('play.guess.down', { place })}
                disabled={disabled || done || showAnswer}
                onClick={() => turn(i, -1)}
              >
                <HintIcon h="turun" />
              </button>
              <small className="guess-place">{place}</small>
            </div>
          );
        })}
      </div>
      {showAnswer ? (
        <p className="kid-note">{t('play.guess.secret', { n: dotted(it.secret) })}</p>
      ) : (
        <button
          type="button"
          className="kid-btn big-play"
          disabled={disabled || done}
          onClick={guess}
        >
          {t('play.guess.go')}
        </button>
      )}
      {history.length > 0 && (
        <ol className="guess-history" aria-label={t('play.guess.history')}>
          {history.map((h, k) => (
            <li key={history.length - k}>
              <strong>{dotted(h.n)}</strong>
              {it.hint === 'number' ? (
                <span className="guess-hint-row">
                  <HintIcon h={h.hints[0]!} /> {t(HINT[h.hints[0]!])}
                </span>
              ) : (
                <span className="guess-hint-row">
                  {h.hints.map((x, i) => (
                    <span
                      key={i}
                      className="guess-hint-cell"
                      title={`${PLACE(it.digits - 1 - i)}: ${t(HINT[x])}`}
                    >
                      <HintIcon h={x} />
                    </span>
                  ))}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
