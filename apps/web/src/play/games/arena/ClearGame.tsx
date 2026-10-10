import { useEffect, useRef, useState } from 'react';
import { clearReplay, dotted, gameOver, numberWord, type Interaction } from '@little-coder/engine';
import { speak } from '../../../audio/speech';
import { t } from '../../../i18n';
import { useSayChoice } from '../../itemVoice';
import { ARENA_COLORS } from './parts';
import './arena.css';

type Clear = Extract<Interaction, { type: 'clear' }>;

function Wrapper({ color, stone }: { color: string; stone: boolean }) {
  return stone ? (
    <svg viewBox="0 0 80 64" className="clear-skin" aria-hidden>
      <path
        d="M8 40 C4 22 18 8 38 8 C60 8 76 20 72 40 C70 56 52 60 38 58 C20 60 10 54 8 40 Z"
        fill={color}
        stroke="#2b2540"
        strokeWidth="3.5"
      />
      <path d="M20 22 q8 -6 16 -4" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6" />
    </svg>
  ) : (
    <svg viewBox="0 0 96 64" className="clear-skin" aria-hidden>
      <path
        d="M4 18 L20 32 L4 46 Z M92 18 L76 32 L92 46 Z"
        fill={color}
        stroke="#2b2540"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <ellipse cx="48" cy="32" rx="30" ry="24" fill={color} stroke="#2b2540" strokeWidth="3.5" />
      <path d="M30 20 q18 -8 36 0" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6" />
    </svg>
  );
}

/**
 * Bersihkan papan (D-115): ketuk dua permen/batu yang jumlah (atau hasil kalinya) sama dengan sasaran; pasangan
 * yang tepat hilang, sampai papan kosong. Penilaian di engine (`clearReplay`).
 */
export function ClearGame({
  interaction: it,
  disabled,
  showAnswer,
  onDone,
}: {
  interaction: Clear;
  disabled: boolean;
  showAnswer: boolean;
  onDone: (taps: string[]) => void;
}) {
  const taps = useRef<string[]>([]);
  const [, setTick] = useState(0);
  const [wobble, setWobble] = useState<string[]>([]);
  const sayChoice = useSayChoice();
  useEffect(() => {
    taps.current = [];
    setTick((n) => n + 1);
  }, [it]);
  const r = clearReplay(it, taps.current);
  const cleared = new Set(showAnswer ? it.tiles.map((x) => x.id) : r.cleared);
  const stone = it.theme === 'stone';

  const tap = (id: string) => {
    if (disabled || r.done || showAnswer || cleared.has(id)) return;
    const tile = it.tiles.find((x) => x.id === id)!;
    sayChoice(tile);
    const before = r.pending;
    taps.current = [...taps.current, id];
    const next = clearReplay(it, taps.current);
    setTick((n) => n + 1);
    if (next.done) {
      speak(t(stone ? 'play.clear.doneStone' : 'play.clear.done'));
      return onDone(taps.current);
    }
    if (next.slips > r.slips) {
      setWobble([before!, id]);
      if (gameOver(it, taps.current)) return onDone(taps.current);
      speak(t('play.clear.again'));
    } else if (next.cleared.length > r.cleared.length) setWobble([]);
  };

  return (
    <div className={`arena-board clear-board is-${it.theme}`}>
      <div
        className="clear-target"
        aria-label={t(it.op === '+' ? 'play.clear.sum' : 'play.clear.product', {
          n: numberWord(it.target),
        })}
      >
        <span className="clear-op">{it.op === '+' ? '+' : '×'}</span>
        <span aria-hidden>=</span>
        <strong>{dotted(it.target)}</strong>
      </div>
      <p className="kid-note" aria-live="polite">
        {t('play.clear.left', { n: it.tiles.length - cleared.size })}
      </p>
      <div className="clear-tiles" role="group" aria-label={t('play.clear.board')}>
        {it.tiles.map((x, i) => {
          const gone = cleared.has(x.id);
          return (
            <button
              key={x.id}
              type="button"
              className={`clear-tile${gone ? ' is-gone' : ''}${r.pending === x.id && !showAnswer ? ' is-picked' : ''}${wobble.includes(x.id) ? ' is-wobble' : ''}`}
              disabled={disabled || showAnswer || r.done || gone}
              aria-pressed={r.pending === x.id}
              aria-label={x.say}
              onClick={() => tap(x.id)}
            >
              <Wrapper color={ARENA_COLORS[i % ARENA_COLORS.length]!} stone={stone} />
              <span className="clear-num">{dotted(x.value)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
