import { useEffect, useRef, useState } from 'react';
import {
  bingoReplay,
  dotted,
  gameOver,
  gridTargetsReplay,
  numberWord,
  type Interaction,
} from '@little-coder/engine';
import { speak } from '../../../audio/speech';
import { t } from '../../../i18n';
import { useSayChoice } from '../../itemVoice';
import { ARENA_COLORS, Burst, Speaker } from './parts';
import './arena.css';

type Grid = Extract<Interaction, { type: 'grid' }>;

function House({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 64" className="grid-house" aria-hidden>
      <path
        d="M6 30 L32 8 L58 30 Z"
        fill={color}
        stroke="#2b2540"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <rect
        x="9"
        y="28"
        width="46"
        height="32"
        rx="4"
        fill="#ffffff"
        stroke="#2b2540"
        strokeWidth="3.5"
      />
    </svg>
  );
}

/**
 * Papan angka (D-115): rumah angka (PAUD) atau papan kembang api. Mode panggilan: Momo menyebut bilangan yang
 * bersembunyi, anak mengetuk tempatnya (`bingoReplay`). Mode sasaran: ketuk semua kelipatan / bilangan prima
 * (`gridTargetsReplay`). Sel yang tepat meletuskan kembang api.
 */
export function GridGame({
  interaction: it,
  disabled,
  showAnswer,
  onDone,
}: {
  interaction: Grid;
  disabled: boolean;
  showAnswer: boolean;
  onDone: (taps: string[]) => void;
}) {
  const taps = useRef<string[]>([]);
  const [, setTick] = useState(0);
  const [wobble, setWobble] = useState<string>();
  const sayChoice = useSayChoice();
  useEffect(() => {
    taps.current = [];
    setTick((n) => n + 1);
  }, [it]);
  const calls = it.calls;
  const replay = () =>
    calls ? bingoReplay(calls, taps.current) : gridTargetsReplay(it.targets ?? [], taps.current);
  const r = replay();
  const found = new Set(
    showAnswer
      ? (calls?.map((c) => c.answer) ?? it.targets ?? [])
      : calls
        ? calls.slice(0, 'marked' in r ? r.marked : 0).map((c) => c.answer)
        : 'found' in r
          ? r.found
          : [],
  );
  const call = calls?.[Math.min('marked' in r ? r.marked : 0, calls.length - 1)];
  const sayCall = () => call && sayChoice({ id: call.id, say: call.say });

  useEffect(() => {
    if (!r.done && !disabled) sayCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call?.id]);

  const tap = (v: number) => {
    const id = `c${v}`;
    if (disabled || r.done || showAnswer || found.has(id)) return;
    taps.current = [...taps.current, id];
    const next = replay();
    setTick((n) => n + 1);
    if (next.slips === r.slips) speak(numberWord(v));
    if (next.done) {
      speak(t(it.theme === 'house' ? 'play.grid.doneHouse' : 'play.grid.done'));
      return onDone(taps.current);
    }
    if (next.slips > r.slips) {
      setWobble(`${id}#${taps.current.length}`);
      if (gameOver(it, taps.current)) return onDone(taps.current);
      speak(t('play.grid.again'));
    }
  };

  const house = it.theme === 'house';
  return (
    <div className={`arena-board grid-board is-${it.theme}`}>
      {calls ? (
        <div className="arena-call">
          <span className="kid-note">
            {t('play.bingo.call', {
              n: Math.min(('marked' in r ? r.marked : 0) + 1, calls.length),
              total: calls.length,
            })}
          </span>
          <p aria-live="polite">{call?.text || t('play.bingo.listenFirst')}</p>
          <button
            type="button"
            className="g4-step"
            aria-label={t('play.bingo.listen')}
            onClick={sayCall}
          >
            <Speaker />
          </button>
        </div>
      ) : (
        <p className="kid-note" aria-live="polite">
          {t('play.grid.found', { n: found.size, total: it.targets?.length ?? 0 })}
        </p>
      )}
      <div
        className="grid-cells"
        style={{ gridTemplateColumns: `repeat(${it.cols}, minmax(0, 1fr))` }}
        role="group"
        aria-label={t('play.grid.board')}
      >
        {Array.from({ length: it.count }, (_, i) => {
          const v = it.start + i;
          const id = `c${v}`;
          const hidden = it.hidden.includes(v) && !found.has(id);
          const on = found.has(id);
          return (
            <button
              key={id}
              type="button"
              className={`grid-cell${on ? ' is-on' : ''}${hidden ? ' is-hidden' : ''}${wobble?.startsWith(`${id}#`) ? ' is-wobble' : ''}`}
              style={{
                ['--tone' as string]:
                  ARENA_COLORS[(Math.floor(i / it.cols) + i) % ARENA_COLORS.length],
              }}
              disabled={disabled || showAnswer || r.done}
              aria-label={hidden ? t('play.grid.hidden') : numberWord(v)}
              onClick={() => tap(v)}
            >
              {house && <House color={ARENA_COLORS[i % ARENA_COLORS.length]!} />}
              <span className="grid-num">{hidden ? '?' : dotted(v)}</span>
              {on && !showAnswer && (
                <span className="grid-burst" aria-hidden>
                  <Burst size={58} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
