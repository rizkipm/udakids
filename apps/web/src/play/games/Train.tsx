import { useEffect, useMemo, useState } from 'react';
import type { Interaction } from '@little-coder/engine';
import { t } from '../../i18n';
import { CheckButton } from '../ItemPlayer';
import { useSayChoice } from '../itemVoice';
import './fun.css';

type Spell = Extract<Interaction, { type: 'spell' }>;

function Engine() {
  return (
    <svg viewBox="0 0 90 70" className="train-engine" aria-hidden>
      <rect
        x="30"
        y="8"
        width="34"
        height="34"
        rx="5"
        fill="#ff7a59"
        stroke="#2b2540"
        strokeWidth="4"
      />
      <rect
        x="38"
        y="15"
        width="18"
        height="14"
        rx="3"
        fill="#e8f6ff"
        stroke="#2b2540"
        strokeWidth="3"
      />
      <rect
        x="6"
        y="30"
        width="80"
        height="24"
        rx="6"
        fill="var(--gonjong)"
        stroke="#2b2540"
        strokeWidth="4"
      />
      <rect x="10" y="4" width="12" height="26" rx="3" fill="#2b2540" />
      {[22, 66].map((x) => (
        <circle key={x} cx={x} cy="58" r="9" fill="#2b2540" stroke="#fff" strokeWidth="3" />
      ))}
    </svg>
  );
}

/**
 * Kereta angka/huruf (D-078): gerbong kosong diisi kartu angka/huruf dari kiri. Ketuk gerbong yang terisi
 * untuk mengeluarkan kartunya. Penilaian sama dengan `spell` (huruf di gerbong kosong berurutan).
 */
export function TrainSpell({
  interaction: it,
  disabled,
  showAnswer,
  onSubmit,
}: {
  interaction: Spell;
  disabled: boolean;
  showAnswer: boolean;
  onSubmit: (letters: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const sayChoice = useSayChoice();
  useEffect(() => setPicked([]), [it]);
  const byId = useMemo(() => new Map(it.letters.map((c) => [c.id, c])), [it]);
  const blanks = it.slots.filter((x) => x === null).length;
  const textOf = (id: string) => {
    const v = byId.get(id)?.visual;
    return v?.kind === 'word' ? v.text : '';
  };
  let k = 0;
  return (
    <div className="train-board">
      <div className="train" aria-label={t('play.train.label')}>
        <Engine />
        {it.slots.map((fixed, i) => {
          if (fixed !== null)
            return (
              <span key={i} className="train-car">
                <span className="train-val">{fixed}</span>
              </span>
            );
          const n = k++;
          const id = picked[n];
          const val = showAnswer ? it.answer[n] : id ? textOf(id) : '';
          return (
            <button
              key={i}
              type="button"
              className={`train-car is-blank${val ? ' is-filled' : ''}${n === picked.length && !showAnswer ? ' is-next' : ''}`}
              disabled={disabled || showAnswer || !id}
              aria-label={val || t('play.train.empty')}
              onClick={() => setPicked((p) => p.filter((_, j) => j !== n))}
            >
              <span className="train-val">{val}</span>
            </button>
          );
        })}
      </div>
      <div className="fun-tiles">
        {it.letters
          .filter((c) => !picked.includes(c.id))
          .map((c) => (
            <button
              key={c.id}
              type="button"
              className="fun-tile"
              disabled={disabled || showAnswer || picked.length >= blanks}
              aria-label={c.say}
              onClick={() => {
                sayChoice(c);
                setPicked((p) => (p.length < blanks ? [...p, c.id] : p));
              }}
            >
              {textOf(c.id)}
            </button>
          ))}
      </div>
      <CheckButton
        disabled={disabled || picked.length !== blanks}
        onClick={() => onSubmit(picked.map(textOf))}
      />
    </div>
  );
}
