import { useEffect, useMemo, useRef, useState } from 'react';
import { bubblesReplay, dotted, gameOver, type Interaction } from '@little-coder/engine';
import { speak } from '../../../audio/speech';
import { t } from '../../../i18n';
import { useSayChoice } from '../../itemVoice';
import { ARENA_COLORS } from './parts';
import './arena.css';

type Bubbles = Extract<Interaction, { type: 'bubbles' }>;

/** Posisi tetap per soal: grid longgar dengan geser kecil (gelembung) atau berkelok seperti sungai (batu). */
function spots(n: number, stone: boolean) {
  const cols = n <= 4 ? n : n <= 6 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const list = Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const c = r % 2 && stone ? cols - 1 - (i % cols) : i % cols;
    // Tepi kolam tetap kosong supaya gelembung tidak terpotong.
    return {
      // 4 kolom: jarak antarpusat ≥ lebar gelembung (70 px) di kolam 320 px, tanpa geser acak.
      x:
        cols === 4
          ? 4 + ((c + 0.5) / cols) * 92
          : 12 + ((c + 0.5) / cols) * 76 + (((i * 37) % 5) - 2),
      y: 8 + ((r + 0.5) / rows) * 84 + (((i * 53) % 5) - 2),
    };
  });
  return { list, rows };
}

/**
 * Gelembung angka / batu sungai (D-115): ketuk bilangan berurutan (loncat 1, 2, 5, 10, …). Gelembung yang tepat
 * pecah (batu: Momo melompat ke atasnya); yang lain bergoyang. Penilaian di engine (`bubblesReplay`).
 */
export function BubblesGame({
  interaction: it,
  disabled,
  showAnswer,
  onDone,
}: {
  interaction: Bubbles;
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
  const stone = it.theme === 'stone';
  const { list: pos, rows } = useMemo(
    () => spots(it.bubbles.length, stone),
    [it.bubbles.length, stone],
  );
  const r = bubblesReplay(it.answer, taps.current);
  const done = new Set(showAnswer ? it.answer : it.answer.slice(0, r.popped));
  const last = showAnswer ? it.answer.at(-1) : it.answer[r.popped - 1];

  const tap = (id: string) => {
    if (disabled || r.done || showAnswer || done.has(id)) return;
    const b = it.bubbles.find((x) => x.id === id)!;
    sayChoice(b);
    taps.current = [...taps.current, id];
    const next = bubblesReplay(it.answer, taps.current);
    setTick((n) => n + 1);
    if (next.done) {
      speak(t(stone ? 'play.bubbles.doneStone' : 'play.bubbles.done'));
      return onDone(taps.current);
    }
    if (next.slips > r.slips) {
      setWobble(`${id}#${taps.current.length}`);
      if (gameOver(it, taps.current)) return onDone(taps.current);
      speak(t('play.bubbles.again'));
    }
  };

  return (
    <div className="arena-board">
      <p className="kid-note" aria-live="polite">
        {t('play.bubbles.progress', { n: done.size, total: it.answer.length })}
      </p>
      <div
        className={`bubbles-pond is-${it.theme}`}
        style={{ ['--rows' as string]: rows }}
        role="group"
        aria-label={t(stone ? 'play.bubbles.river' : 'play.bubbles.pond')}
      >
        {it.bubbles.map((b, i) => {
          const on = done.has(b.id) && !showAnswer;
          const order = showAnswer ? it.answer.indexOf(b.id) : -1;
          const value = b.visual.kind === 'numeral' ? b.visual.value : 0;
          return (
            <button
              key={b.id}
              type="button"
              className={`bubble${on ? ' is-on' : ''}${order >= 0 ? ' is-answer' : ''}${wobble?.startsWith(`${b.id}#`) ? ' is-wobble' : ''}`}
              style={{
                left: `${pos[i]!.x}%`,
                top: `${pos[i]!.y}%`,
                ['--tone' as string]: ARENA_COLORS[i % ARENA_COLORS.length],
              }}
              disabled={disabled || showAnswer || r.done}
              aria-pressed={on}
              aria-label={b.say}
              onClick={() => tap(b.id)}
            >
              <span className={value >= 1000 ? 'bubble-long' : undefined}>{dotted(value)}</span>
              {order >= 0 && <span className="bubble-order">{order + 1}</span>}
              {stone && last === b.id && (
                <svg
                  viewBox="0 0 40 40"
                  width="34"
                  height="34"
                  className="bubble-hopper"
                  aria-hidden
                >
                  <circle cx="20" cy="22" r="14" fill="#5cc96b" stroke="#2b2540" strokeWidth="3" />
                  <circle cx="14" cy="16" r="5" fill="#fff" stroke="#2b2540" strokeWidth="2" />
                  <circle cx="26" cy="16" r="5" fill="#fff" stroke="#2b2540" strokeWidth="2" />
                  <circle cx="14" cy="16" r="2" fill="#2b2540" />
                  <circle cx="26" cy="16" r="2" fill="#2b2540" />
                  <path d="M13 27 q7 5 14 0" stroke="#2b2540" strokeWidth="2" fill="none" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
