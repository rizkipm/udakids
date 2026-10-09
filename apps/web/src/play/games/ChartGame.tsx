import { useEffect, useState } from 'react';
import { dotted, type Interaction } from '@little-coder/engine';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import { CheckButton } from '../ItemPlayer';
import { useSayChoice } from '../itemVoice';
import './g4.css';

type Chart = Extract<Interaction, { type: 'chart' }>;

/**
 * Diagram Ajaib (D-096): tabel data di kiri, diagram batang di kanan. Anak menaikkan/menurunkan setiap batang
 * per kotak (satu kotak = `scale`) sampai sama dengan tabel, lalu menekan Selesai. Penilaian di engine.
 */
export function ChartGame({
  interaction: it,
  disabled,
  showAnswer,
  onSubmit,
}: {
  interaction: Chart;
  disabled: boolean;
  showAnswer: boolean;
  onSubmit: (v: Record<string, string>) => void;
}) {
  const [steps, setSteps] = useState<number[]>(() => it.bars.map(() => 0));
  const sayChoice = useSayChoice();
  useEffect(() => setSteps(it.bars.map(() => 0)), [it]);
  const shown = showAnswer ? it.bars.map((b) => b.value / it.scale) : steps;
  const bump = (i: number, d: number) => {
    if (disabled || showAnswer) return;
    sayChoice(it.bars[i]!);
    setSteps((s) => s.map((x, k) => (k === i ? Math.max(0, Math.min(it.steps, x + d)) : x)));
  };
  const ticks = Array.from({ length: it.steps + 1 }, (_, k) => it.steps - k);

  return (
    <div className="g4-board chart-board">
      <table className="chart-table" aria-label={t('play.chart.table')}>
        <tbody>
          {it.bars.map((b) => (
            <tr key={b.id}>
              <th scope="row">{b.label}</th>
              <td>
                {dotted(b.value)} {it.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {it.scale !== 1 && (
        <p className="kid-note">{t('play.chart.scale', { n: dotted(it.scale), unit: it.unit })}</p>
      )}
      <div className="chart-area">
        <div className="chart-axis" aria-hidden>
          {ticks.map((k) => (
            <span key={k}>{dotted(k * it.scale)}</span>
          ))}
        </div>
        <div className="chart-bars">
          {it.bars.map((b, i) => (
            <div key={b.id} className="chart-col">
              <div className="chart-track" style={{ ['--rows' as string]: it.steps }}>
                <div
                  className="chart-bar"
                  style={{ height: `${(shown[i]! / it.steps) * 100}%` }}
                  aria-label={`${b.label} ${dotted(shown[i]! * it.scale)}`}
                />
              </div>
              <div className="chart-ctrl">
                <button
                  type="button"
                  className="g4-step"
                  aria-label={t('play.chart.more', { label: b.label })}
                  disabled={disabled || showAnswer || shown[i]! >= it.steps}
                  onClick={() => bump(i, 1)}
                >
                  +
                </button>
                <button
                  type="button"
                  className="g4-step"
                  aria-label={t('play.chart.less', { label: b.label })}
                  disabled={disabled || showAnswer || shown[i]! <= 0}
                  onClick={() => bump(i, -1)}
                >
                  −
                </button>
              </div>
              <span className="chart-label">
                {b.visual.kind === 'object' ? <VisualView visual={b.visual} size={36} /> : null}
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <CheckButton
        disabled={disabled || steps.every((s) => s === 0)}
        onClick={() =>
          onSubmit(Object.fromEntries(it.bars.map((b, i) => [b.id, String(steps[i]! * it.scale)])))
        }
      />
    </div>
  );
}
