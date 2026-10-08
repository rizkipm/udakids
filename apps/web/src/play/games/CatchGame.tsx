import { useEffect, useRef, useState } from 'react';
import { gameOver, type Interaction } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import './games.css';

type Catch = Extract<Interaction, { type: 'catch' }>;

/** Banyak lajur benda melintas. */
const LANES = 3;

/**
 * Tangkap (D-075): benda melintas pelan dari kanan ke kiri dan terus berputar sampai ditangkap — tanpa
 * hitung mundur, tanpa nyawa. Yang tepat masuk keranjang; ketukan lain hanya membuat bendanya bergoyang
 * (dihitung meleset oleh engine). Bila gerak dikurangi (prefers-reduced-motion), benda diam di kotak.
 */
export function CatchGame({
  interaction: it,
  disabled = false,
  onDone,
}: {
  interaction: Catch;
  disabled?: boolean;
  onDone?: (taps: string[]) => void;
}) {
  const [caught, setCaught] = useState<string[]>([]);
  const [wobble, setWobble] = useState<{ id: string; n: number }>();
  const taps = useRef<string[]>([]);
  useEffect(() => {
    setCaught([]);
    setWobble(undefined);
    taps.current = [];
  }, [it]);

  const done = caught.length === it.answer.length;
  const tap = (id: string) => {
    if (disabled || done || caught.includes(id)) return;
    taps.current = [...taps.current, id];
    const choice = it.choices.find((c) => c.id === id)!;
    if (it.answer.includes(id)) {
      const all = [...caught, id];
      setCaught(all);
      if (all.length === it.answer.length) {
        speak(t('play.catch.done'));
        onDone?.(taps.current);
      } else speak(choice.say ?? t('play.catch.got'));
      return;
    }
    setWobble((w) => ({ id, n: (w?.n ?? 0) + 1 }));
    // Kekeliruan ke-2 (D-078): soal berakhir, lanjut ke soal berikutnya (tidak dipaksa sampai benar).
    if (gameOver(it, taps.current)) return onDone?.(taps.current);
    speak(t('play.catch.notThis', { thing: choice.say ?? '' }));
  };

  return (
    <div className={`catch-board scene-${it.scene ?? 'sky'}${done ? ' is-done' : ''}`}>
      <div className="catch-sky" role="group" aria-label={t('play.catch.label')}>
        {it.choices.map((c, i) => {
          const lane = i % LANES;
          // Kecepatan & jarak berbeda per benda agar tidak menumpuk; tetap pelan (≥ 11 detik per lintasan).
          const dur = 11 + ((i * 7) % 5);
          const delay = -((i * dur) / it.choices.length);
          const got = caught.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              className={`catch-item${got ? ' is-caught' : ''}`}
              style={{
                ['--lane' as string]: lane,
                ['--dur' as string]: `${dur}s`,
                ['--delay' as string]: `${delay}s`,
              }}
              disabled={disabled || got}
              aria-label={c.say ?? t('play.catch.thing', { n: i + 1 })}
              onClick={() => tap(c.id)}
            >
              {/* Goyangan diulang dengan kunci baru di dalam, supaya lintasan tidak melompat. */}
              <span
                key={wobble?.id === c.id ? wobble.n : 0}
                className={`catch-body${wobble?.id === c.id ? ' is-wobble' : ''}`}
              >
                {c.visual.kind === 'word' ? (
                  <span
                    className={`catch-letter${c.visual.text.length > 2 ? ' is-long' : ''}${c.visual.text.length > 6 ? ' is-xlong' : ''}`}
                  >
                    {c.visual.text}
                  </span>
                ) : (
                  <VisualView visual={c.visual} size={64} />
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div className="catch-basket" aria-live="polite">
        <svg viewBox="0 0 64 40" width="64" height="40" aria-hidden>
          <path
            d="M4 10 H60 L52 36 H12 Z"
            fill="#e9c46a"
            stroke="#2b2540"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M14 18 H50 M18 26 H46" stroke="#b9873a" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span>{t('play.catch.progress', { n: caught.length, of: it.answer.length })}</span>
        <span className="catch-got">
          {caught.map((id) => {
            const c = it.choices.find((x) => x.id === id)!;
            return (
              <span key={id} className="catch-got-item">
                {c.visual.kind === 'word' ? (
                  <span className="catch-letter is-small">{c.visual.text}</span>
                ) : (
                  <VisualView visual={c.visual} size={36} />
                )}
              </span>
            );
          })}
        </span>
      </div>
    </div>
  );
}
