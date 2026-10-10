import { useEffect, useState } from 'react';
import { linesCounts, type Interaction } from '@little-coder/engine';
import { t, type MessageKey } from '../../i18n';
import { CheckButton } from '../ItemPlayer';
import './g4.css';

type Lines = Extract<Interaction, { type: 'lines' }>;
const GROUPS = ['ratusan', 'puluhan', 'satuan'] as const;
type Group = (typeof GROUPS)[number];
// Warna kelompok dari token (D-110) agar tetap kontras di tema gelap.
const COLOR: Record<Group, string> = {
  ratusan: 'var(--langit)',
  puluhan: 'var(--jeruk)',
  satuan: 'var(--sawah)',
};

/** Posisi garis: puluhan di satu kelompok, satuan di kelompok lain, dengan jarak antarkelompok. */
function positions(n: number, from: number, to: number) {
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const span = to - from;
  const gap = span * 0.18;
  const one = (span - gap) / Math.max(1, tens + ones);
  const out: { at: number; place: 'tens' | 'ones' }[] = [];
  for (let i = 0; i < tens; i++) out.push({ at: from + one * (i + 0.5), place: 'tens' });
  for (let i = 0; i < ones; i++)
    out.push({ at: from + one * tens + (tens ? gap : 0) + one * (i + 0.5), place: 'ones' });
  return out;
}

/**
 * Garis Perkalian (D-096): bilangan pertama digambar sebagai garis tegak (puluhan, lalu satuan), bilangan kedua
 * garis mendatar. Titik potong dikelompokkan: puluhan×puluhan = ratusan, silang = puluhan, satuan×satuan =
 * satuan. Anak boleh mengetuk titik untuk menandai yang sudah dihitung, lalu mengisi banyak titik per kelompok.
 */
export function LinesGame({
  interaction: it,
  disabled,
  showAnswer,
  onSubmit,
}: {
  interaction: Lines;
  disabled: boolean;
  showAnswer: boolean;
  onSubmit: (v: Record<string, string>) => void;
}) {
  const zero = { ratusan: 0, puluhan: 0, satuan: 0 };
  const [count, setCount] = useState<Record<Group, number>>(zero);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  useEffect(() => {
    setCount(zero);
    setMarked(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [it]);
  const shown = showAnswer ? linesCounts(it.a, it.b) : count;
  const W = 300;
  const vs = positions(it.a, 20, W - 20);
  const hs = positions(it.b, 20, W - 20);
  const groupOf = (v: 'tens' | 'ones', h: 'tens' | 'ones'): Group =>
    v === 'tens' && h === 'tens' ? 'ratusan' : v === 'ones' && h === 'ones' ? 'satuan' : 'puluhan';
  const bump = (g: Group, d: number) =>
    !disabled && setCount((c) => ({ ...c, [g]: Math.max(0, Math.min(9, c[g] + d)) }));
  const label = (g: Group) => t(`play.lines.${g}` as MessageKey);

  return (
    <div className="g4-board lines-board">
      <svg
        viewBox={`0 0 ${W} ${W}`}
        className="lines-svg"
        role="img"
        aria-label={t('play.lines.board', { a: it.a, b: it.b })}
      >
        {vs.map((v, i) => (
          <line
            key={`v${i}`}
            x1={v.at}
            y1="8"
            x2={v.at}
            y2={W - 8}
            stroke="var(--malam)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        ))}
        {hs.map((h, i) => (
          <line
            key={`h${i}`}
            x1="8"
            y1={h.at}
            x2={W - 8}
            y2={h.at}
            stroke="var(--malam-muted)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        ))}
        {vs.flatMap((v, i) =>
          hs.map((h, j) => {
            const key = `${i}-${j}`;
            const g = groupOf(v.place, h.place);
            return (
              <circle
                key={key}
                cx={v.at}
                cy={h.at}
                r={marked.has(key) ? 9 : 7}
                fill={marked.has(key) ? COLOR[g] : 'var(--kertas)'}
                stroke={COLOR[g]}
                strokeWidth="3.5"
                className="lines-dot"
                onClick={() =>
                  !disabled &&
                  setMarked((m) => {
                    const n = new Set(m);
                    if (n.has(key)) n.delete(key);
                    else n.add(key);
                    return n;
                  })
                }
              />
            );
          }),
        )}
      </svg>
      <div className="lines-counters">
        {GROUPS.map((g) => (
          <div key={g} className="lines-counter" style={{ ['--g' as string]: COLOR[g] }}>
            <span className="lines-name">{label(g)}</span>
            <button
              type="button"
              className="g4-step"
              aria-label={t('play.lines.less', { g: label(g) })}
              disabled={disabled || showAnswer || shown[g] <= 0}
              onClick={() => bump(g, -1)}
            >
              −
            </button>
            <span className="lines-value" aria-live="polite">
              {shown[g]}
            </span>
            <button
              type="button"
              className="g4-step"
              aria-label={t('play.lines.more', { g: label(g) })}
              disabled={disabled || showAnswer || shown[g] >= 9}
              onClick={() => bump(g, 1)}
            >
              +
            </button>
          </div>
        ))}
      </div>
      <p className="kid-note">
        {t('play.lines.result', { n: shown.ratusan * 100 + shown.puluhan * 10 + shown.satuan })}
      </p>
      <CheckButton
        disabled={disabled}
        onClick={() =>
          onSubmit({
            ratusan: String(count.ratusan),
            puluhan: String(count.puluhan),
            satuan: String(count.satuan),
          })
        }
      />
    </div>
  );
}
