import { useEffect, useState } from 'react';
import { sumOf, sumSolution, type Interaction } from '@little-coder/engine';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import { CheckButton } from '../ItemPlayer';
import { useSayChoice } from '../itemVoice';
import './fun.css';

type Sum = Extract<Interaction, { type: 'sum' }>;

const rupiah = (n: number) => `Rp${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/**
 * Neraca seimbang, Toko Momo, dan truk muatan (D-078). Anak mengetuk token untuk menaruhnya (persediaan tak
 * terbatas) dan mengetuk token yang sudah terpasang untuk mengeluarkannya. Neraca miring ke sisi yang lebih
 * berat, jadi anak bisa mencoba sendiri. Penilaian di engine (`sumOf`): jumlah harus tepat.
 */
export function SumGame({
  interaction: it,
  disabled,
  showAnswer,
  onSubmit,
}: {
  interaction: Sum;
  disabled: boolean;
  showAnswer: boolean;
  onSubmit: (ids: string[]) => void;
}) {
  const [placed, setPlaced] = useState<string[]>([]);
  const sayChoice = useSayChoice();
  useEffect(() => setPlaced([]), [it]);
  const shown = showAnswer ? (sumSolution(it.tokens, it.target - it.given) ?? []) : placed;
  const total = it.given + (sumOf(it.tokens, shown) ?? 0);
  const byId = new Map(it.tokens.map((x) => [x.id, x]));
  const full = placed.length >= it.maxTokens;
  const add = (id: string) => {
    if (disabled || full) return;
    sayChoice(byId.get(id)!);
    setPlaced((p) => [...p, id]);
  };
  const remove = (k: number) => !disabled && setPlaced((p) => p.filter((_, j) => j !== k));
  const money = it.style === 'shop';
  const label = (v: number) => (money ? rupiah(v) : String(v));

  const chips = (
    <span className="sum-chips">
      {it.given > 0 && <span className="sum-chip is-given">{it.given}</span>}
      {shown.map((id, k) => {
        const tok = byId.get(id)!;
        return (
          <button
            key={k}
            type="button"
            className={`sum-chip${money ? ' is-coin' : ''}`}
            disabled={disabled || showAnswer}
            aria-label={t('play.sum.remove', { v: label(tok.value) })}
            onClick={() => remove(k)}
          >
            {tok.visual.kind === 'coin' ? (
              <VisualView visual={tok.visual} size={34} />
            ) : (
              label(tok.value)
            )}
          </button>
        );
      })}
    </span>
  );

  // Kemiringan neraca: kiri lebih berat → miring ke kiri (sudut negatif).
  const diff = it.target - total;
  const tilt =
    diff === 0
      ? 0
      : Math.max(-12, Math.min(12, -Math.sign(diff) * (4 + Math.min(8, Math.abs(diff)))));
  return (
    <div className={`sum-board is-${it.style}${diff === 0 && shown.length ? ' is-even' : ''}`}>
      {it.style === 'balance' ? (
        <div className="balance">
          <div className="balance-beam" style={{ ['--tilt' as string]: `${tilt}deg` }}>
            <div className="balance-pan is-left">
              <VisualView visual={it.show} size={70} />
            </div>
            <div className="balance-pan is-right">{chips}</div>
          </div>
          <svg className="balance-stand" viewBox="0 0 120 70" aria-hidden>
            <path
              d="M60 4 L40 66 H80 Z"
              fill="#b8a4ff"
              stroke="#2b2540"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <circle cx="60" cy="8" r="7" fill="#ffd166" stroke="#2b2540" strokeWidth="3" />
          </svg>
          <p className="kid-note" aria-live="polite">
            {diff === 0 && shown.length
              ? t('play.sum.even')
              : diff > 0
                ? t('play.sum.lighter')
                : t('play.sum.heavier')}
          </p>
        </div>
      ) : it.style === 'shop' ? (
        <div className="shop">
          <div className="shop-counter">
            <VisualView visual={it.show} size={84} />
          </div>
          <div className="shop-tray" aria-live="polite">
            {chips}
            <span className="shop-total">{t('play.sum.paid', { v: rupiah(total) })}</span>
          </div>
        </div>
      ) : (
        <div className="truck">
          <div className="truck-sign">
            <VisualView visual={it.show} size={56} />
          </div>
          <div className="truck-bed" aria-live="polite">
            {chips}
          </div>
          <svg className="truck-body" viewBox="0 0 220 70" aria-hidden>
            <rect
              x="4"
              y="6"
              width="150"
              height="40"
              rx="6"
              fill="#ffb84d"
              stroke="#2b2540"
              strokeWidth="4"
            />
            <path
              d="M154 18 H190 L210 34 V46 H154 Z"
              fill="#4aa8ff"
              stroke="#2b2540"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <rect
              x="168"
              y="22"
              width="18"
              height="12"
              rx="2"
              fill="#e8f6ff"
              stroke="#2b2540"
              strokeWidth="3"
            />
            {[40, 120, 186].map((x) => (
              <circle key={x} cx={x} cy="54" r="12" fill="#2b2540" stroke="#fff" strokeWidth="3" />
            ))}
          </svg>
          <p className="kid-note">{t('play.sum.load', { n: total })}</p>
        </div>
      )}
      <div className="sum-tokens" role="group" aria-label={t('play.sum.tokens')}>
        {it.tokens.map((tok) => (
          <button
            key={tok.id}
            type="button"
            className={`sum-token${money ? ' is-coin' : ''}`}
            disabled={disabled || showAnswer || full}
            aria-label={t('play.sum.add', { v: label(tok.value) })}
            onClick={() => add(tok.id)}
          >
            {tok.visual.kind === 'coin' ? (
              <VisualView visual={tok.visual} size={56} />
            ) : (
              label(tok.value)
            )}
          </button>
        ))}
      </div>
      <CheckButton disabled={disabled || placed.length === 0} onClick={() => onSubmit(placed)} />
    </div>
  );
}
