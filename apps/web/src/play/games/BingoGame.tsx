import { useEffect, useRef, useState } from 'react';
import { bingoReplay, gameOver, type Interaction } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { t } from '../../i18n';
import { VisualView } from '../../components/visuals';
import { useSayChoice } from '../itemVoice';
import './g4.css';

type Bingo = Extract<Interaction, { type: 'bingo' }>;

const BLOCK = ['#ef476f', '#ffd166', '#06d6a0', '#4cc9f0', '#9b5de5', '#ff8a3d'];

/** Balok berwarna 3 per baris (PAUD, D-108): besar dan mudah dihitung satu per satu. */
function Blocks({ n }: { n: number }) {
  const rows = Math.ceil(n / 3);
  const S = 18;
  return (
    <svg
      viewBox={`0 0 ${3 * S + 4} ${rows * S + 4}`}
      width={3 * S + 4}
      height={rows * S + 4}
      aria-hidden
    >
      {Array.from({ length: n }, (_, i) => (
        <rect
          key={i}
          x={2 + (i % 3) * S}
          y={2 + (rows - 1 - Math.floor(i / 3)) * S}
          width={S - 2}
          height={S - 2}
          rx="3"
          fill={BLOCK[i % BLOCK.length]}
          stroke="#2b2540"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

function Speaker() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      <path
        d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Bingo Rupiah (D-096): kartu 3×3 berisi nominal Rupiah. Momo membacakan soal belanja satu per satu; anak
 * mengetuk nominal yang pas sampai satu garis lengkap (BINGO). Ketukan keliru dihitung engine (`bingoReplay`).
 */
export function BingoGame({
  interaction: it,
  disabled,
  showAnswer,
  onDone,
}: {
  interaction: Bingo;
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
  const r = bingoReplay(it.calls, taps.current);
  const marked = new Set(
    (showAnswer ? it.calls : it.calls.slice(0, r.marked)).map((c) => c.answer),
  );
  const call = it.calls[Math.min(r.marked, it.calls.length - 1)]!;
  const sayCall = () => sayChoice({ id: call.id, say: call.say });

  useEffect(() => {
    if (!r.done && !disabled) sayCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.id]);

  const tap = (id: string) => {
    if (disabled || r.done || showAnswer || marked.has(id)) return;
    taps.current = [...taps.current, id];
    const next = bingoReplay(it.calls, taps.current);
    setTick((n) => n + 1);
    if (next.done) {
      speak(t('play.bingo.done'));
      return onDone(taps.current);
    }
    if (next.slips > r.slips) {
      setWobble(id);
      if (gameOver(it, taps.current)) return onDone(taps.current);
      speak(t('play.bingo.again'));
    }
  };

  return (
    <div className="g4-board bingo-board">
      <div className="bingo-call">
        <span className="kid-note">
          {t('play.bingo.call', {
            n: Math.min(r.marked + 1, it.calls.length),
            total: it.calls.length,
          })}
        </span>
        {/* PAUD (D-108): soal hanya dibacakan, tidak ditulis. */}
        <p aria-live="polite">{call.text || t('play.bingo.listenFirst')}</p>
        <button
          type="button"
          className="g4-step"
          aria-label={t('play.bingo.listen')}
          onClick={sayCall}
        >
          <Speaker />
        </button>
      </div>
      <div className="bingo-card" role="group" aria-label={t('play.bingo.card')}>
        {it.cells.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`bingo-cell${marked.has(c.id) ? ' is-marked' : ''}${wobble === c.id ? ' is-wobble' : ''}`}
            disabled={disabled || showAnswer || r.done}
            aria-pressed={marked.has(c.id)}
            aria-label={c.say}
            onClick={() => tap(c.id)}
          >
            {c.visual.kind === 'word' ? (
              c.visual.text
            ) : c.visual.kind === 'tens' ? (
              <Blocks n={c.visual.ones} />
            ) : (
              <VisualView visual={c.visual} size={52} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
