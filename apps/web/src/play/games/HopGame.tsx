import { useEffect, useRef, useState } from 'react';
import { hopStep, signedWord, type Interaction } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { Momo } from '../../components/Momo';
import { t } from '../../i18n';
import './fun.css';

type Hop = Extract<Interaction, { type: 'hop' }>;

/** Batu per baris papan (zig-zag seperti papan permainan): 4 di layar sempit agar batu tetap ≥ 64 px. */
const perRow = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(max-width: 440px)').matches ? 4 : 5;

function Frog() {
  return (
    <svg viewBox="0 0 60 50" width="46" height="38" aria-hidden>
      <ellipse cx="30" cy="32" rx="24" ry="15" fill="#5cc96b" stroke="#2b2540" strokeWidth="3" />
      <circle cx="18" cy="14" r="9" fill="#5cc96b" stroke="#2b2540" strokeWidth="3" />
      <circle cx="42" cy="14" r="9" fill="#5cc96b" stroke="#2b2540" strokeWidth="3" />
      <circle cx="18" cy="13" r="4" fill="#2b2540" />
      <circle cx="42" cy="13" r="4" fill="#2b2540" />
      <path
        d="M20 34 Q30 41 40 34"
        fill="none"
        stroke="#2b2540"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Lompat kodok / hitung langkah (D-078): papan batu bernomor zig-zag. Anak mengetuk batu tempat mendarat satu
 * per satu; kodok melompat. Batu yang belum tepat hanya bergoyang dan Momo mengajak menghitung lagi. Semua
 * ketukan dinilai engine (`hopReplay`).
 */
export function HopGame({
  interaction: it,
  disabled,
  showAnswer,
  onDone,
}: {
  interaction: Hop;
  disabled: boolean;
  showAnswer: boolean;
  onDone: (taps: string[]) => void;
}) {
  const [landed, setLanded] = useState(0);
  const [PER_ROW, setPerRow] = useState(perRow);
  useEffect(() => {
    const onResize = () => setPerRow(perRow());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [wobble, setWobble] = useState<{ v: number; n: number }>();
  const taps = useRef<string[]>([]);
  useEffect(() => {
    setLanded(0);
    setWobble(undefined);
    taps.current = [];
  }, [it]);
  const done = landed === it.answer.length;
  const at = landed === 0 ? it.start : it.answer[landed - 1]!;
  const path = new Set([it.start, ...it.answer.slice(0, showAnswer ? it.answer.length : landed)]);

  const tap = (v: number) => {
    if (disabled || done || showAnswer) return;
    taps.current = [...taps.current, String(v)];
    const r = hopStep(it.answer, landed, v);
    if (r.slip) {
      setWobble((w) => ({ v, n: (w?.n ?? 0) + 1 }));
      speak(t('play.hop.again', { n: signedWord(at) }));
      return;
    }
    setLanded(r.landed);
    if (r.landed === it.answer.length) {
      speak(t('play.hop.done', { n: signedWord(v) }));
      onDone(taps.current);
    } else speak(signedWord(v));
  };

  // Baris genap kiri → kanan, baris ganjil kanan → kiri (zig-zag).
  const rows: number[][] = [];
  for (let i = 0; i < it.stones.length; i += PER_ROW) {
    const row = it.stones.slice(i, i + PER_ROW);
    rows.push(rows.length % 2 ? [...row].reverse() : row);
  }
  return (
    <div className={`hop-board is-${it.style}${done ? ' is-done' : ''}`}>
      <div className="hop-pond" role="group" aria-label={t('play.hop.label')}>
        {rows.map((row, ri) => (
          <div key={ri} className={`hop-row${ri % 2 ? ' is-back' : ''}`}>
            {row.map((v) => (
              <button
                key={`${v}-${wobble?.v === v ? wobble.n : 0}`}
                type="button"
                className={`hop-stone${path.has(v) ? ' is-path' : ''}${v === at && !showAnswer ? ' is-here' : ''}${wobble?.v === v ? ' is-wobble' : ''}`}
                disabled={disabled}
                aria-label={t('play.hop.stone', { n: v })}
                onClick={() => tap(v)}
              >
                <span className="hop-num">{v}</span>
                {v === at && !showAnswer && (
                  <span className="hop-hero" key={landed}>
                    {it.style === 'frog' ? <Frog /> : <Momo own mood="happy" size={40} />}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
      <p className="kid-note" aria-live="polite">
        {done
          ? t('play.hop.finished')
          : t('play.hop.progress', { n: landed, of: it.answer.length })}
      </p>
    </div>
  );
}
