import { useEffect, useRef, useState } from 'react';
import { gameMistakes, gameOver, type Interaction } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { t } from '../../i18n';
import { useSayChoice } from '../itemVoice';
import './paud-games.css';

type Beads = Extract<Interaction, { type: 'beads' }>;

const HEX: Record<string, string> = {
  merah: '#ef476f',
  biru: '#4361ee',
  kuning: '#ffd166',
  hijau: '#06d6a0',
  ungu: '#9b5de5',
  oranye: '#ff8a3d',
};
const colorOf = (id: string) => HEX[id.replace(/^b-/, '')] ?? '#ccc';

function Bead({ color, size = 40, empty }: { color?: string; size?: number; empty?: boolean }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} aria-hidden>
      {empty ? (
        <circle
          cx="22"
          cy="22"
          r="17"
          fill="var(--kertas)"
          stroke="var(--garis-tegas)"
          strokeWidth="3"
          strokeDasharray="5 4"
        />
      ) : (
        <>
          <circle cx="22" cy="22" r="18" fill={color} stroke="#2b2540" strokeWidth="3" />
          <circle cx="15" cy="15" r="5" fill="#fff" opacity="0.55" />
        </>
      )}
    </svg>
  );
}

/**
 * Kalung manik pola (D-108, PAUD): manik yang sudah terpasang membentuk pola; anak mengetuk manik dari palet untuk
 * melanjutkannya. Manik yang tidak melanjutkan pola memantul kembali (dihitung keliru oleh engine).
 */
export function BeadsGame({
  interaction: it,
  disabled,
  showAnswer,
  onDone,
}: {
  interaction: Beads;
  disabled: boolean;
  showAnswer: boolean;
  onDone: (taps: string[]) => void;
}) {
  const taps = useRef<string[]>([]);
  const [placed, setPlaced] = useState(0);
  const [wobble, setWobble] = useState<string>();
  const sayChoice = useSayChoice();
  useEffect(() => {
    taps.current = [];
    setPlaced(0);
  }, [it]);
  const k = showAnswer ? it.answer.length : placed;
  // Semua manik muat satu baris (seperti kalung) di layar HP.
  const bead = Math.max(24, Math.min(40, Math.floor(300 / (it.shown.length + it.answer.length))));

  const tap = (id: string) => {
    if (disabled || showAnswer || placed >= it.answer.length) return;
    const c = it.choices.find((x) => x.id === id)!;
    sayChoice(c);
    taps.current = [...taps.current, id];
    const g = gameMistakes(it, taps.current)!;
    if (id === it.answer[placed]) {
      const next = placed + 1;
      setPlaced(next);
      if (g.done) {
        speak(t('play.beads.done'));
        onDone(taps.current);
      }
      return;
    }
    setWobble(`${id}${taps.current.length}`);
    if (gameOver(it, taps.current)) return onDone(taps.current);
    speak(t('play.beads.again'));
  };

  return (
    <div className="paud-board beads-board">
      <div className="beads-string" role="img" aria-label={t('play.beads.string')}>
        <span className="beads-cord" aria-hidden />
        {it.shown.map((b, i) => (
          <Bead key={`s${i}`} color={colorOf(b)} size={bead} />
        ))}
        {it.answer.map((b, i) => (
          <span key={`a${i}`} className={i === k ? 'beads-next' : ''}>
            <Bead color={colorOf(b)} empty={i >= k} size={bead} />
          </span>
        ))}
      </div>
      <div className="beads-palette">
        {it.choices.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`paud-bubble${wobble?.startsWith(c.id) ? ' is-wobble' : ''}`}
            disabled={disabled || showAnswer}
            aria-label={c.say}
            onClick={() => tap(c.id)}
          >
            <Bead color={colorOf(c.id)} size={52} />
          </button>
        ))}
      </div>
    </div>
  );
}
