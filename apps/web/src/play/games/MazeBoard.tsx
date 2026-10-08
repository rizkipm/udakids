import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  mazeMove,
  mazeNeighbors,
  OBJECTS,
  WALL,
  type Interaction,
  gameOver,
} from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { Momo } from '../../components/Momo';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import './games.css';

type Maze = Extract<Interaction, { type: 'maze' }>;

/** Lama langkah Momo per kotak (ms). */
const STEP_MS = 170;

/**
 * Labirin (D-075): ketuk kotak sebaris/sekolom untuk menggerakkan Momo (boleh beberapa kotak sekaligus,
 * tidak menembus dinding). Menabrak dinding: kotak bergoyang + Momo memberi petunjuk, tanpa kata "salah".
 * Semua ketukan dikirim lewat `onDone` untuk dinilai engine. Panah keyboard juga bisa dipakai.
 */
export function MazeBoard({
  interaction: it,
  disabled = false,
  onDone,
}: {
  interaction: Maze;
  disabled?: boolean;
  onDone?: (taps: string[]) => void;
}) {
  const [pos, setPos] = useState(it.start);
  const [trail, setTrail] = useState<number[]>([it.start]);
  const [bump, setBump] = useState<{ cell: number; n: number }>();
  const [walking, setWalking] = useState(false);
  const taps = useRef<string[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setPos(it.start);
    setTrail([it.start]);
    setBump(undefined);
    setWalking(false);
    taps.current = [];
    const pending = timers.current;
    return () => {
      pending.forEach((x) => window.clearTimeout(x));
      pending.length = 0;
    };
  }, [it]);

  const done = pos === it.goal;
  const markAt = new Map(it.marks.map((m) => [m.cell, m]));

  const go = (cell: number) => {
    if (disabled || done || walking) return;
    taps.current = [...taps.current, `c${cell}`];
    const step = mazeMove(it, pos, cell);
    if (!step) {
      setBump((b) => ({ cell, n: (b?.n ?? 0) + 1 }));
      // Kekeliruan ke-2 (D-078): soal berakhir, lanjut ke soal berikutnya (tidak dipaksa sampai benar).
      if (gameOver(it, taps.current)) return onDone?.(taps.current);
      speak(t('play.maze.wall'));
      return;
    }
    // Berhenti di pintu keluar bila langkah melewatinya (sama dengan penilaian engine).
    const at = step.indexOf(it.goal);
    const path = at >= 0 ? step.slice(0, at + 1) : step;
    setWalking(true);
    path.forEach((c, k) => {
      timers.current.push(
        window.setTimeout(() => {
          setPos(c);
          setTrail((tr) => [...tr, c]);
          const mark = markAt.get(c);
          if (mark && c !== it.goal) speak(mark.say);
          if (k === path.length - 1) {
            setWalking(false);
            if (c === it.goal) {
              speak(t('play.maze.done'));
              onDone?.(taps.current);
            }
          }
        }, k * STEP_MS),
      );
    });
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = { ArrowUp: -it.cols, ArrowDown: it.cols, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (d === undefined) return;
    e.preventDefault();
    const target = pos + d;
    // Tetap di baris yang sama untuk kiri/kanan.
    if (Math.abs(d) === 1 && Math.floor(target / it.cols) !== Math.floor(pos / it.cols)) return;
    if (target >= 0 && target < it.cols * it.rows) go(target);
  };

  const r = Math.floor(pos / it.cols);
  const c = pos % it.cols;
  const visited = new Set(trail);
  const nextTo = new Set(mazeNeighbors(it, pos));
  return (
    <div className={`maze-board${done ? ' is-done' : ''}`}>
      <div
        className="maze-grid"
        style={{ ['--cols' as string]: it.cols, ['--rows' as string]: it.rows }}
        role="group"
        aria-label={t('play.maze.label')}
        tabIndex={0}
        onKeyDown={onKey}
      >
        {it.walls.map((w, cell) => {
          const mark = markAt.get(cell);
          const cls = [
            'maze-cell',
            w & WALL.N ? 'w-n' : '',
            w & WALL.E ? 'w-e' : '',
            w & WALL.S ? 'w-s' : '',
            w & WALL.W ? 'w-w' : '',
            visited.has(cell) ? 'is-trail' : '',
            mark && visited.has(cell) && !mark.decoy ? 'is-got' : '',
            cell === it.goal ? 'is-goal' : '',
            nextTo.has(cell) && !done ? 'is-near' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={`${cell}-${bump?.cell === cell ? bump.n : 0}`}
              type="button"
              className={`${cls}${bump?.cell === cell ? ' is-bump' : ''}`}
              disabled={disabled}
              aria-label={
                cell === it.goal
                  ? t('play.maze.exit')
                  : mark
                    ? t('play.maze.cellMark', { mark: mark.say })
                    : t('play.maze.cell', {
                        r: Math.floor(cell / it.cols) + 1,
                        c: (cell % it.cols) + 1,
                      })
              }
              onClick={() => go(cell)}
            >
              {mark &&
                (mark.visual ? (
                  <span className="maze-mark is-pic">
                    <VisualView visual={mark.visual} size={40} />
                  </span>
                ) : (
                  <span className={`maze-mark${mark.text.length > 3 ? ' is-long' : ''}`}>
                    {mark.text}
                  </span>
                ))}
              {cell === it.goal &&
                (it.goalVisual ? (
                  <span className="maze-goal-pic">
                    <VisualView visual={it.goalVisual} size={44} />
                  </span>
                ) : (
                  <ExitFlag />
                ))}
            </button>
          );
        })}
        <span
          className="maze-momo"
          style={{ ['--r' as string]: r, ['--c' as string]: c }}
          aria-hidden
        >
          {/* Tokoh labirin bertema (D-078): traktor, astronot, kucing, …; default Momo. */}
          {it.walker ? (
            <VisualView visual={{ kind: 'object', object: it.walker }} size={50} />
          ) : (
            <Momo own mood={done ? 'proud' : 'happy'} size={52} />
          )}
        </span>
      </div>
      <p className="kid-note maze-hint">
        {done
          ? t('play.maze.done')
          : it.walker
            ? t('play.maze.hintWalker', { who: OBJECTS[it.walker].say })
            : t('play.maze.hint')}
      </p>
    </div>
  );
}

function ExitFlag() {
  return (
    <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden className="maze-flag">
      <path d="M10 6 V36" stroke="#2b2540" strokeWidth="3" strokeLinecap="round" />
      <path d="M11 7 H31 L26 14 L31 21 H11 Z" fill="#2e9e5b" stroke="#2b2540" strokeWidth="2.5" />
    </svg>
  );
}
