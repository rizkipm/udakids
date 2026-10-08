import { useEffect, useState } from 'react';
import type { Interaction } from '@little-coder/engine';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import { CheckButton } from '../ItemPlayer';
import { useSayChoice } from '../itemVoice';
import './fun.css';

type Match = Extract<Interaction, { type: 'match' }>;

/**
 * Tempel label (D-078): ketuk kartu kata (dibacakan), lalu ketuk gambarnya — kata menempel seperti stiker di
 * bawah gambar. Ketuk stiker untuk melepasnya. Penilaian sama dengan `match`.
 */
export function LabelMatch({
  interaction: it,
  disabled,
  showAnswer,
  onSubmit,
}: {
  interaction: Match;
  disabled: boolean;
  showAnswer: boolean;
  onSubmit: (pairs: Record<string, string>) => void;
}) {
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [held, setHeld] = useState<string>();
  const sayChoice = useSayChoice();
  useEffect(() => {
    setPairs({});
    setHeld(undefined);
  }, [it]);
  const shown = showAnswer ? it.answer : pairs;
  const word = (id: string) => {
    const v = it.left.find((c) => c.id === id)?.visual;
    return v?.kind === 'word' ? v.text : '';
  };
  const stick = (pic: string) => {
    if (disabled || showAnswer) return;
    const picture = it.right.find((c) => c.id === pic)!;
    if (!held) {
      sayChoice(picture);
      return;
    }
    setPairs((p) => ({
      ...Object.fromEntries(Object.entries(p).filter(([w, g]) => g !== pic && w !== held)),
      [held]: pic,
    }));
    setHeld(undefined);
  };
  const unstick = (w: string) =>
    !disabled &&
    !showAnswer &&
    setPairs((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== w)));

  return (
    <div className="label-board">
      <div className="label-pics">
        {it.right.map((c) => {
          const owner = Object.keys(shown).find((k) => shown[k] === c.id);
          return (
            <div key={c.id} className="label-pic">
              <button
                type="button"
                className={`label-pic-btn${held ? ' is-ready' : ''}`}
                disabled={disabled}
                aria-label={held ? t('play.labels.stickOn', { thing: c.say ?? '' }) : c.say}
                onClick={() => stick(c.id)}
              >
                <VisualView visual={c.visual} size={84} />
              </button>
              {owner ? (
                <button
                  type="button"
                  className="label-sticker"
                  disabled={disabled || showAnswer}
                  aria-label={t('play.labels.remove', { word: word(owner) })}
                  onClick={() => unstick(owner)}
                >
                  {word(owner)}
                </button>
              ) : (
                <span className="label-empty" aria-hidden />
              )}
            </div>
          );
        })}
      </div>
      <div className="fun-tiles">
        {it.left
          .filter((c) => !(c.id in shown))
          .map((c) => (
            <button
              key={c.id}
              type="button"
              className={`fun-tile is-word${held === c.id ? ' is-held' : ''}`}
              disabled={disabled || showAnswer}
              aria-pressed={held === c.id}
              onClick={() => {
                sayChoice(c);
                setHeld(held === c.id ? undefined : c.id);
              }}
            >
              {word(c.id)}
            </button>
          ))}
      </div>
      <CheckButton
        disabled={disabled || Object.keys(pairs).length !== it.left.length}
        onClick={() => onSubmit(pairs)}
      />
    </div>
  );
}
