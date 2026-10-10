import { useEffect, useState } from 'react';
import { numberWord, type Interaction } from '@little-coder/engine';
import { speak } from '../../../audio/speech';
import { t } from '../../../i18n';
import { CheckButton } from '../../ItemPlayer';
import './arena.css';

type Pizza = Extract<Interaction, { type: 'pizza' }>;

const R = 70;
/** Juring lingkaran potongan ke-j dari n. */
function slice(j: number, n: number) {
  const a0 = (j / n) * 2 * Math.PI - Math.PI / 2;
  const a1 = ((j + 1) / n) * 2 * Math.PI - Math.PI / 2;
  const p = (a: number) => `${(Math.cos(a) * R).toFixed(2)} ${(Math.sin(a) * R).toFixed(2)}`;
  return `M0 0 L${p(a0)} A${R} ${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z`;
}

/** Cokelat batang: kolom sedemikian rupa sehingga setiap potong ≥ 64 px dan barisnya rata (maks. 5 kolom). */
const barCols = (n: number) => (n <= 5 ? n : ([5, 4, 3].find((c) => n % c === 0) ?? 5));

/**
 * Pizza / cokelat pecahan (D-115): ketuk potongan untuk mewarnai (topping / gigitan), ketuk lagi untuk batal, lalu
 * Selesai. Pecahan tampil bertumpuk; bilangan campuran memakai beberapa pizza. Penilaian di engine (`pizzaCount`).
 */
export function PizzaGame({
  interaction: it,
  disabled,
  showAnswer,
  onSubmit,
}: {
  interaction: Pizza;
  disabled: boolean;
  showAnswer: boolean;
  onSubmit: (ids: string[]) => void;
}) {
  const [on, setOn] = useState<string[]>([]);
  useEffect(() => setOn([]), [it]);
  const ids = Array.from({ length: it.wholes }, (_, w) =>
    Array.from({ length: it.parts }, (_, s) => `w${w}s${s}`),
  );
  const shown = new Set(showAnswer ? ids.flat().slice(0, it.target) : on);
  const toggle = (id: string) => {
    if (disabled || showAnswer) return;
    const next = on.includes(id) ? on.filter((x) => x !== id) : [...on, id];
    setOn(next);
    speak(numberWord(next.length));
  };
  const pizza = it.theme === 'pizza';

  return (
    <div className={`arena-board pizza-board is-${it.theme}`}>
      <div
        className="pizza-label"
        aria-label={`${it.whole ? `${it.whole} ` : ''}${t('play.pizza.label', { num: it.num, den: it.den })}`}
      >
        {it.whole > 0 && <span className="pizza-whole">{it.whole}</span>}
        <span className="pizza-frac" aria-hidden>
          <span>{it.num}</span>
          <span>{it.den}</span>
        </span>
      </div>
      <div className="pizza-row">
        {ids.map((row, w) =>
          pizza ? (
            <svg
              key={w}
              viewBox="-80 -80 160 160"
              className="pizza-svg"
              role="group"
              aria-label={t('play.pizza.whole', { n: w + 1 })}
            >
              <circle r="78" fill="#e9b872" stroke="#2b2540" strokeWidth="4" />
              {row.map((id, j) => (
                <path
                  key={id}
                  d={slice(j, it.parts)}
                  className={`pizza-slice${shown.has(id) ? ' is-on' : ''}`}
                  role="button"
                  tabIndex={disabled || showAnswer ? -1 : 0}
                  aria-pressed={shown.has(id)}
                  aria-label={t('play.pizza.slice', { n: j + 1 })}
                  onClick={() => toggle(id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle(id)}
                />
              ))}
              {row.map((id, j) =>
                shown.has(id) ? (
                  <g key={`t${id}`} pointerEvents="none">
                    {[0.35, 0.65].map((f) => {
                      const a = ((j + f) / it.parts) * 2 * Math.PI - Math.PI / 2;
                      return (
                        <circle
                          key={f}
                          cx={Math.cos(a) * R * 0.6}
                          cy={Math.sin(a) * R * 0.6}
                          r="7"
                          fill="#c1121f"
                          stroke="#2b2540"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </g>
                ) : null,
              )}
            </svg>
          ) : (
            <div
              key={w}
              className="choco-bar"
              style={{ gridTemplateColumns: `repeat(${barCols(it.parts)}, minmax(0, 1fr))` }}
              role="group"
              aria-label={t('play.pizza.whole', { n: w + 1 })}
            >
              {row.map((id, j) => (
                <button
                  key={id}
                  type="button"
                  className={`choco-piece${shown.has(id) ? ' is-on' : ''}`}
                  disabled={disabled || showAnswer}
                  aria-pressed={shown.has(id)}
                  aria-label={t('play.pizza.slice', { n: j + 1 })}
                  onClick={() => toggle(id)}
                />
              ))}
            </div>
          ),
        )}
      </div>
      <p className="kid-note" aria-live="polite">
        {t('play.pizza.count', { n: shown.size })}
      </p>
      <CheckButton disabled={disabled || on.length === 0} onClick={() => onSubmit(on)} />
    </div>
  );
}
