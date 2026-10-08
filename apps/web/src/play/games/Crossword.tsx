import { useEffect, useRef, useState } from 'react';
import { crosswordLetters, crosswordStep, type Interaction, gameOver } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import { useSayChoice } from '../itemVoice';
import './fun.css';

type Crossword = Extract<Interaction, { type: 'crossword' }>;

/**
 * Teka-teki silang bergambar (D-078): ketuk gambar petunjuk (kata itu disorot di papan dan dibacakan), lalu
 * ketuk kartu huruf untuk mengisi kotaknya dari depan. Huruf yang belum pas hanya bergoyang. Kata selesai →
 * pindah otomatis ke kata berikutnya. Penilaian di engine (`crosswordReplay`).
 */
export function CrosswordGame({
  interaction: it,
  disabled,
  showAnswer,
  onDone,
}: {
  interaction: Crossword;
  disabled: boolean;
  showAnswer: boolean;
  onDone: (taps: string[]) => void;
}) {
  const [filled, setFilled] = useState<Set<number>>(() => new Set(it.prefill));
  const [active, setActive] = useState(it.words[0]!.id);
  const [wobble, setWobble] = useState<{ id: string; n: number }>();
  const taps = useRef<string[]>([]);
  const sayChoice = useSayChoice();
  useEffect(() => {
    setFilled(new Set(it.prefill));
    setActive(it.words[0]!.id);
    setWobble(undefined);
    taps.current = [];
  }, [it]);
  const letters = crosswordLetters(it);
  const allCells = new Set(it.words.flatMap((w) => w.cells));
  const done = [...allCells].every((c) => filled.has(c));
  const word = it.words.find((w) => w.id === active)!;
  const wordDone = (id: string) =>
    it.words.find((w) => w.id === id)!.cells.every((c) => filled.has(c));
  // Nomor seperti teka-teki silang biasa: per kotak awal (urut baca), kata mendatar & menurun boleh bernomor sama.
  const startOf = new Map(
    [...new Set(it.words.map((w) => w.cells[0]!))].sort((a, b) => a - b).map((c, i) => [c, i + 1]),
  );
  const numberOf = (w: (typeof it.words)[number]) => startOf.get(w.cells[0]!)!;

  const choose = (id: string) => {
    setActive(id);
    speak(it.words.find((w) => w.id === id)!.say);
  };
  const press = (letterId: string) => {
    if (disabled || done || showAnswer) return;
    const tile = it.letters.find((l) => l.id === letterId)!;
    const ch = tile.visual.kind === 'word' ? tile.visual.text : '';
    taps.current = [...taps.current, `${word.id}:${ch}`];
    const r = crosswordStep(it, filled, `${word.id}:${ch}`);
    if (r.slip) {
      setWobble((w) => ({ id: letterId, n: (w?.n ?? 0) + 1 }));
      // Kekeliruan ke-2 (D-078): soal berakhir, lanjut ke soal berikutnya (tidak dipaksa sampai benar).
      if (gameOver(it, taps.current)) return onDone(taps.current);
      speak(t('play.crossword.again', { word: word.say }));
      return;
    }
    sayChoice(tile);
    if (r.cell === undefined) return;
    const next = new Set(filled).add(r.cell);
    setFilled(next);
    if ([...allCells].every((c) => next.has(c))) {
      speak(t('play.crossword.done'));
      onDone(taps.current);
      return;
    }
    if (word.cells.every((c) => next.has(c))) {
      const following = it.words.find((w) => !w.cells.every((c) => next.has(c)));
      if (following) {
        window.setTimeout(() => speak(t('play.crossword.word', { word: word.say })), 300);
        setActive(following.id);
      }
    }
  };

  return (
    <div className={`cross-board${done ? ' is-done' : ''}`}>
      <div className="cross-clues" role="group" aria-label={t('play.crossword.clues')}>
        {it.mascot && (
          <span className="cross-mascot" aria-hidden>
            <VisualView visual={{ kind: 'object', object: it.mascot }} size={64} />
          </span>
        )}
        {it.words.map((w) => (
          <button
            key={w.id}
            type="button"
            className={`cross-clue${w.id === active ? ' is-on' : ''}${wordDone(w.id) ? ' is-done' : ''}`}
            disabled={disabled}
            aria-pressed={w.id === active}
            aria-label={t('play.crossword.clue', { n: numberOf(w), word: w.say })}
            onClick={() => choose(w.id)}
          >
            <span className="cross-clue-n">
              {numberOf(w)}
              {w.dir === 'across' ? '→' : '↓'}
            </span>
            {w.visual.kind === 'word' ? (
              <span className="fun-word">{w.visual.text}</span>
            ) : (
              <VisualView visual={w.visual} size={52} />
            )}
          </button>
        ))}
      </div>
      <div
        className="cross-grid"
        style={{ ['--cols' as string]: it.cols, ['--rows' as string]: it.rows }}
        aria-hidden
      >
        {letters.map((ch, c) =>
          ch ? (
            <span
              key={c}
              className={`cross-cell${word.cells.includes(c) ? ' is-active' : ''}${filled.has(c) || showAnswer ? ' is-filled' : ''}`}
            >
              {startOf.has(c) && <span className="cross-cell-n">{startOf.get(c)}</span>}
              {filled.has(c) || showAnswer ? ch : ''}
            </span>
          ) : (
            <span key={c} className="cross-gap" />
          ),
        )}
      </div>
      <div className="cross-letters" role="group" aria-label={t('play.crossword.letters')}>
        {it.letters.map((l) => (
          <button
            key={`${l.id}-${wobble?.id === l.id ? wobble.n : 0}`}
            type="button"
            className={`cross-letter${wobble?.id === l.id ? ' is-wobble' : ''}`}
            disabled={disabled || done || showAnswer}
            aria-label={l.say}
            onClick={() => press(l.id)}
          >
            {l.visual.kind === 'word' ? l.visual.text : ''}
          </button>
        ))}
      </div>
    </div>
  );
}
