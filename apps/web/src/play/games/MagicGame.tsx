import { useEffect, useRef, useState } from 'react';
import { gameOver, magicReplay, type Interaction } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { Momo } from '../../components/Momo';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import { useSayChoice } from '../itemVoice';
import './g4.css';

type Magic = Extract<Interaction, { type: 'magic' }>;

function Star({ on }: { on: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="34"
      height="34"
      aria-hidden
      className={`magic-star${on ? ' is-on' : ''}`}
    >
      <path
        d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"
        stroke="#2b2540"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Penyihir Hitung (D-096): satu fakta hitung tampil besar, anak mengetuk jawabannya. Setiap `starEvery` jawaban
 * tepat menyalakan satu bintang mantra. Tanpa hitung mundur; ketukan keliru dihitung engine (`magicReplay`).
 */
export function MagicGame({
  interaction: it,
  disabled,
  showAnswer,
  onDone,
}: {
  interaction: Magic;
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
  const r = magicReplay(it.facts, taps.current);
  const k = showAnswer ? it.facts.length - 1 : Math.min(r.solved, it.facts.length - 1);
  const fact = it.facts[k]!;
  const total = Math.ceil(it.facts.length / it.starEvery);
  const lit = Math.floor((showAnswer ? it.facts.length : r.solved) / it.starEvery);

  // Bacakan fakta yang sedang ditanya.
  useEffect(() => {
    if (!r.done && !disabled) sayChoice({ id: fact.id, say: fact.say });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fact.id]);

  const tap = (choiceId: string) => {
    if (disabled || r.done || showAnswer) return;
    taps.current = [...taps.current, `${fact.id}:${choiceId}`];
    const next = magicReplay(it.facts, taps.current);
    setTick((n) => n + 1);
    if (next.done) {
      speak(t('play.magic.done'));
      return onDone(taps.current);
    }
    if (next.slips > r.slips) {
      setWobble(choiceId);
      if (gameOver(it, taps.current)) return onDone(taps.current);
      speak(t('play.magic.again'));
    }
  };

  return (
    <div className="g4-board magic-board">
      <div className="magic-stars" aria-label={t('play.magic.stars', { n: lit, total })}>
        {Array.from({ length: total }, (_, i) => (
          <Star key={i} on={i < lit} />
        ))}
      </div>
      <Momo own mood={r.done ? 'happy' : 'curious'} size={84} />
      <p className="kid-note">{t('play.magic.fact', { n: k + 1, total: it.facts.length })}</p>
      <p className="magic-fact" aria-live="polite">
        {fact.text}
      </p>
      <div className="magic-choices">
        {fact.choices.map((c) => (
          <button
            key={`${fact.id}${c.id}`}
            type="button"
            className={`g4-card${wobble === c.id ? ' is-wobble' : ''}${showAnswer && c.id === fact.answer ? ' is-answer' : ''}`}
            disabled={disabled || r.done || showAnswer}
            aria-label={c.say}
            onClick={() => tap(c.id)}
          >
            <VisualView visual={c.visual} size={56} />
          </button>
        ))}
      </div>
    </div>
  );
}
