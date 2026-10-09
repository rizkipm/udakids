import { useEffect, useState } from 'react';
import { dotted, stackSolution, stackValue, type Interaction } from '@little-coder/engine';
import { t } from '../../i18n';
import { CheckButton } from '../ItemPlayer';
import { useSayChoice } from '../itemVoice';
import './g4.css';

type Stack = Extract<Interaction, { type: 'stack' }>;

/**
 * Tumpuk Angka (D-096): ketuk balok untuk menumpuknya (tiap balok sekali), ketuk balok di tumpukan untuk
 * mengeluarkannya. Nilai tumpukan terlihat, jadi anak bisa mencoba sendiri. Penilaian di engine (`stackValue`).
 */
export function StackGame({
  interaction: it,
  disabled,
  showAnswer,
  onSubmit,
}: {
  interaction: Stack;
  disabled: boolean;
  showAnswer: boolean;
  onSubmit: (ids: string[]) => void;
}) {
  const [placed, setPlaced] = useState<string[]>([]);
  const sayChoice = useSayChoice();
  useEffect(() => setPlaced([]), [it]);
  const shown = showAnswer
    ? (stackSolution(it.op, it.blocks, it.target, it.maxBlocks) ?? [])
    : placed;
  const byId = new Map(it.blocks.map((b) => [b.id, b]));
  const now = stackValue(it.op, it.blocks, shown) ?? 0;
  const full = placed.length >= it.maxBlocks;
  const add = (id: string) => {
    if (disabled || full || placed.includes(id)) return;
    sayChoice(byId.get(id)!);
    setPlaced((p) => [...p, id]);
  };
  const remove = (id: string) => !disabled && setPlaced((p) => p.filter((x) => x !== id));

  return (
    <div className="g4-board stack-board">
      <p className="stack-target">{t('play.stack.target', { n: dotted(it.target) })}</p>
      <div className="stack-tower" role="group" aria-label={t('play.stack.tower')}>
        {[...shown].reverse().map((id) => (
          <button
            key={id}
            type="button"
            className="stack-block is-placed"
            disabled={disabled || showAnswer}
            aria-label={t('play.stack.remove', { v: dotted(byId.get(id)!.value) })}
            onClick={() => remove(id)}
          >
            {dotted(byId.get(id)!.value)}
          </button>
        ))}
        <span className="stack-base" aria-hidden />
      </div>
      <p className="kid-note" aria-live="polite">
        {t(it.op === '+' ? 'play.stack.sum' : 'play.stack.product', {
          n: dotted(shown.length ? now : 0),
        })}
      </p>
      <div className="stack-pool">
        {it.blocks.map((b) => (
          <button
            key={b.id}
            type="button"
            className="stack-block"
            disabled={disabled || showAnswer || full || placed.includes(b.id)}
            aria-label={t('play.stack.add', { v: dotted(b.value) })}
            onClick={() => add(b.id)}
          >
            {dotted(b.value)}
          </button>
        ))}
      </div>
      <CheckButton disabled={disabled || placed.length === 0} onClick={() => onSubmit(placed)} />
    </div>
  );
}
