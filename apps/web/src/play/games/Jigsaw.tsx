import { useEffect, useRef, useState } from 'react';
import { jigsawStep, type Interaction, type Visual } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { OBJECT_ART } from '../../components/visuals/objects';
import { t } from '../../i18n';
import './fun.css';

type Jigsaw = Extract<Interaction, { type: 'jigsaw' }>;

/** Satu kepingan gambar (kotak `index` dari `cols` × `rows`), digambar dari ilustrasi 100×100. */
export function PuzzlePiece({
  picture,
  cols,
  rows,
  index,
  size,
}: {
  picture: Visual;
  cols: number;
  rows: number;
  index: number;
  size: number;
}) {
  if (picture.kind !== 'object') return null;
  const Art = OBJECT_ART[picture.object];
  const w = 100 / cols;
  const h = 100 / rows;
  const x = (index % cols) * w;
  const y = Math.floor(index / cols) * h;
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} width={size} height={(size * h) / w} aria-hidden>
      <rect x={x} y={y} width={w} height={h} fill="#fffaf0" />
      <Art color={picture.color} />
    </svg>
  );
}

/**
 * Puzzle susun (D-078): kepingan teracak di bawah; ketuk satu kepingan lalu ketuk tempatnya di papan. Papan
 * menampilkan bayangan samar gambar utuh sebagai petunjuk. Kepingan di tempat yang belum pas kembali dengan
 * goyangan kecil. Penilaian di engine (`jigsawReplay`).
 */
export function JigsawGame({
  interaction: it,
  disabled,
  showAnswer,
  onDone,
}: {
  interaction: Jigsaw;
  disabled: boolean;
  showAnswer: boolean;
  onDone: (taps: string[]) => void;
}) {
  const total = it.cols * it.rows;
  const [placed, setPlaced] = useState<Set<number>>(() => new Set(it.fixed));
  const [held, setHeld] = useState<string>();
  const [wobble, setWobble] = useState<{ slot: number; n: number }>();
  const taps = useRef<string[]>([]);
  useEffect(() => {
    setPlaced(new Set(it.fixed));
    setHeld(undefined);
    setWobble(undefined);
    taps.current = [];
  }, [it]);
  const done = placed.size === total;
  const cell = Math.min(118, Math.floor(300 / it.cols));

  const put = (slot: number) => {
    if (disabled || done || showAnswer || !held || placed.has(slot)) return;
    const tap = `${held}@${slot}`;
    taps.current = [...taps.current, tap];
    const r = jigsawStep(placed, tap, total);
    if (r.slip) {
      setWobble((w) => ({ slot, n: (w?.n ?? 0) + 1 }));
      speak(t('play.jigsaw.again'));
      return;
    }
    if (r.slot === undefined) return;
    const next = new Set(placed).add(r.slot);
    setPlaced(next);
    setHeld(undefined);
    if (next.size === total) {
      speak(t('play.jigsaw.done'));
      onDone(taps.current);
    } else speak(t('play.jigsaw.fit'));
  };

  return (
    <div className={`jig-board${done ? ' is-done' : ''}`}>
      <div
        className="jig-frame"
        style={{ ['--cols' as string]: it.cols, ['--cell' as string]: `${cell}px` }}
        role="group"
        aria-label={t('play.jigsaw.board')}
      >
        {Array.from({ length: total }, (_, slot) => {
          const filled = placed.has(slot) || showAnswer;
          return (
            <button
              key={`${slot}-${wobble?.slot === slot ? wobble.n : 0}`}
              type="button"
              className={`jig-slot${filled ? ' is-filled' : ''}${held && !filled ? ' is-ready' : ''}${wobble?.slot === slot ? ' is-wobble' : ''}`}
              disabled={disabled || filled}
              aria-label={t('play.jigsaw.slot', { n: slot + 1 })}
              onClick={() => put(slot)}
            >
              <span className={filled ? '' : 'jig-ghost'}>
                <PuzzlePiece
                  picture={it.picture}
                  cols={it.cols}
                  rows={it.rows}
                  index={slot}
                  size={cell}
                />
              </span>
            </button>
          );
        })}
      </div>
      {!done && !showAnswer && (
        <div className="jig-tray" role="group" aria-label={t('play.jigsaw.pieces')}>
          {it.pieces
            .filter((p) => !placed.has(Number(p.slice(1))))
            .map((p) => (
              <button
                key={p}
                type="button"
                className={`jig-piece${held === p ? ' is-held' : ''}`}
                disabled={disabled}
                aria-pressed={held === p}
                aria-label={t('play.jigsaw.piece', { n: Number(p.slice(1)) + 1 })}
                onClick={() => setHeld(held === p ? undefined : p)}
              >
                <PuzzlePiece
                  picture={it.picture}
                  cols={it.cols}
                  rows={it.rows}
                  index={Number(p.slice(1))}
                  size={Math.max(64, Math.min(90, cell - 10))}
                />
              </button>
            ))}
        </div>
      )}
      <p className="kid-note" aria-live="polite">
        {done ? t('play.jigsaw.finished') : held ? t('play.jigsaw.where') : t('play.jigsaw.pick')}
      </p>
    </div>
  );
}
