import { useEffect, useRef, useState } from 'react';
import { gameOver, type Interaction } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import './games.css';

type Memory = Extract<Interaction, { type: 'memory' }>;

/** Ukuran kartu kata (D-078): makin panjang kata terpanjangnya, makin kecil hurufnya; huruf tunggal tetap besar. */
const wordSize = (text: string) => {
  const longest = Math.max(...text.split(' ').map((w) => w.length));
  if (text.length <= 2) return '';
  return longest >= 8 ? ' is-word is-long' : longest >= 6 ? ' is-word is-mid' : ' is-word';
};

/** Lama dua kartu yang belum cocok tetap terbuka sebelum ditutup lagi (ms). */
const PEEK_MS = 1100;

/**
 * Kartu pasangan / memori (D-075): ketuk kartu untuk membaliknya (animasi balik), dua-dua. Cocok → tetap
 * terbuka berkilau; belum cocok → ditutup lagi dengan lembut. Semua kartu yang dibalik dikirim lewat
 * `onDone` dan dinilai engine (`memoryReplay`).
 */
export function MemoryGame({
  interaction: it,
  disabled = false,
  reveal = false,
  onDone,
}: {
  interaction: Memory;
  disabled?: boolean;
  /** Pratinjau admin dengan kunci jawaban: semua kartu terbuka. */
  reveal?: boolean;
  onDone?: (flips: string[]) => void;
}) {
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const flips = useRef<string[]>([]);
  const timer = useRef<number>();
  useEffect(() => {
    setOpen([]);
    setMatched([]);
    setBusy(false);
    flips.current = [];
    return () => window.clearTimeout(timer.current);
  }, [it]);

  const pairOf = new Map(it.cards.map((c) => [c.id, c.pair]));
  const done = matched.length === it.cards.length;

  const flip = (id: string) => {
    if (disabled || done || busy || open.includes(id) || matched.includes(id)) return;
    const card = it.cards.find((c) => c.id === id)!;
    flips.current = [...flips.current, id];
    if (card.say) speak(card.say);
    const now = [...open, id];
    if (now.length < 2) {
      setOpen(now);
      return;
    }
    const [a, b] = now as [string, string];
    if (pairOf.get(a) === pairOf.get(b)) {
      const all = [...matched, a, b];
      setMatched(all);
      setOpen([]);
      if (all.length === it.cards.length) {
        speak(t('play.memory.done'));
        onDone?.(flips.current);
      } else timer.current = window.setTimeout(() => speak(t('play.memory.match')), 500);
      return;
    }
    setOpen(now);
    setBusy(true);
    // Kekeliruan ke-2 (D-078; pasangan sudah pernah terlihat): soal berakhir, lanjut ke soal berikutnya.
    if (gameOver(it, flips.current)) {
      timer.current = window.setTimeout(() => onDone?.(flips.current), PEEK_MS);
      return;
    }
    timer.current = window.setTimeout(() => {
      setOpen([]);
      setBusy(false);
      speak(t('play.memory.again'));
    }, PEEK_MS);
  };

  const cols = it.cards.length <= 4 ? 2 : it.cards.length <= 6 ? 3 : 4;
  return (
    <div className={`mem-board${done ? ' is-done' : ''}`}>
      <div className="mem-grid" style={{ ['--cols' as string]: cols }}>
        {it.cards.map((card, k) => {
          const up = reveal || open.includes(card.id) || matched.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              className={`mem-card${up ? ' is-up' : ''}${matched.includes(card.id) ? ' is-matched' : ''}`}
              disabled={disabled}
              aria-pressed={up}
              aria-label={
                up
                  ? (card.say ?? t('play.memory.card', { n: k + 1 }))
                  : t('play.memory.card', { n: k + 1 })
              }
              onClick={() => flip(card.id)}
            >
              <span className="mem-inner">
                <span className="mem-back" aria-hidden>
                  <svg viewBox="0 0 40 40" width="40" height="40">
                    <path
                      d="M20 4 L24.5 15 L36 15.5 L27 23 L30 34.5 L20 28 L10 34.5 L13 23 L4 15.5 L15.5 15 Z"
                      fill="#ffd166"
                      stroke="#2b2540"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="mem-front">
                  {card.visual.kind === 'word' ? (
                    // Kata/soal (D-078) lebih kecil dan boleh turun baris; huruf tunggal tetap besar.
                    <span className={`mem-letter${wordSize(card.visual.text)}`}>
                      {card.visual.text}
                    </span>
                  ) : (
                    <VisualView visual={card.visual} size={84} />
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="kid-note" aria-live="polite">
        {t('play.memory.progress', { n: matched.length / 2, of: it.cards.length / 2 })}
      </p>
    </div>
  );
}
