import { useEffect, useRef, useState } from 'react';
import type { Color } from '@little-coder/engine';
import { speak } from '../audio/speech';
import { Momo, type MomoMood } from '../components/Momo';
import { t, type MessageKey } from '../i18n';
import './loader.css';

/** Kalimat bergantian saat menunggu (setiap ±2,6 detik). */
const LOADING_LINES: MessageKey[] = [
  'play.loader.line1',
  'play.loader.line2',
  'play.loader.line3',
  'play.loader.line4',
];
/** Ucapan Momo saat diketuk (bergantian). */
const TAP_LINES: MessageKey[] = [
  'play.loader.tap1',
  'play.loader.tap2',
  'play.loader.tap3',
  'play.loader.tap4',
];
/** Posisi bintang yang bisa diketuk selagi menunggu (persen area). */
const STAR_SPOTS = [
  { x: 10, y: 22 },
  { x: 84, y: 16 },
  { x: 18, y: 72 },
  { x: 80, y: 66 },
  { x: 50, y: 8 },
];
const BOOK_COLORS = ['#ff7a59', '#4aa8ff', '#2e9e5b', '#f7c948'];

/**
 * Layar tunggu Momo (memuat buku/soal) dan saat buku belum bisa diambil. Hidup & interaktif tanpa
 * membebani: buku terbang ke pelukan Momo, kalimat bergantian, ketuk Momo → melompat & menyapa, ketuk
 * bintang → dikumpulkan. Saat gagal: Momo mencari dengan kaca pembesar, tombol besar "Coba lagi", dan
 * otomatis mencoba lagi ketika internet tersambung. Tanpa kata "salah/gagal", tanpa warna merah besar.
 */
export function MomoLoader({
  color,
  failed = false,
  onRetry,
  compact = false,
}: {
  color: Color;
  failed?: boolean;
  onRetry?: () => void;
  /** Versi kecil (di dalam halaman yang sudah punya kepala). */
  compact?: boolean;
}) {
  const [line, setLine] = useState(0);
  const [hop, setHop] = useState(0);
  const [talk, setTalk] = useState<MessageKey>();
  const [stars, setStars] = useState<number[]>([]);
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  );
  const taps = useRef(0);
  // Versi kecil dipasang di dalam <main> halaman lain.
  const Root = compact ? 'section' : 'main';

  useEffect(() => {
    if (failed) return;
    const id = window.setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 2600);
    return () => window.clearInterval(id);
  }, [failed]);

  // Internet tersambung lagi → langsung coba ambil buku.
  useEffect(() => {
    const up = () => {
      setOnline(true);
      if (failed) onRetry?.();
    };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, [failed, onRetry]);

  const tapMomo = () => {
    const say = TAP_LINES[taps.current++ % TAP_LINES.length]!;
    setHop((h) => h + 1);
    setTalk(say);
    speak(t(say));
  };
  const tapStar = (i: number) => {
    if (stars.includes(i)) return;
    const next = [...stars, i];
    setStars(next);
    speak(next.length === STAR_SPOTS.length ? t('play.loader.allStars') : String(next.length));
  };

  const mood: MomoMood = failed
    ? 'curious'
    : stars.length === STAR_SPOTS.length
      ? 'proud'
      : 'happy';
  const message = failed
    ? online
      ? t('play.loader.failTitle')
      : t('play.loader.offlineTitle')
    : t(LOADING_LINES[line]!);

  return (
    <Root
      className={`kid-screen momo-loader${failed ? ' is-failed' : ''}${compact ? ' is-compact' : ''}`}
      aria-busy={!failed}
    >
      <div className="ml-stage">
        {!failed &&
          STAR_SPOTS.map((s, i) => (
            <button
              key={i}
              type="button"
              className={`ml-star${stars.includes(i) ? ' is-got' : ''}`}
              style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${i * -0.7}s` }}
              aria-label={t('play.loader.star')}
              onClick={() => tapStar(i)}
            >
              <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden>
                <path
                  d="M20 3 L25 15 L38 15.5 L28 24 L31.5 37 L20 29.5 L8.5 37 L12 24 L2 15.5 L15 15 Z"
                  fill="#f7c948"
                  stroke="#2b2540"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ))}

        {!failed && (
          <div className="ml-books" aria-hidden>
            {BOOK_COLORS.map((c, i) => (
              <span key={c} className="ml-book" style={{ animationDelay: `${i * 0.55}s` }}>
                <svg viewBox="0 0 40 30" width="40" height="30">
                  <rect
                    x="2"
                    y="2"
                    width="36"
                    height="26"
                    rx="4"
                    fill={c}
                    stroke="#2b2540"
                    strokeWidth="3"
                  />
                  <path d="M20 4 V26" stroke="#2b2540" strokeWidth="2.5" />
                  <path
                    d="M7 10 H15 M7 15 H15 M25 10 H33 M25 15 H33"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          className="ml-momo"
          aria-label={t('play.loader.tapMomo')}
          onClick={tapMomo}
        >
          <span key={hop} className={`ml-momo-body${hop ? ' is-hop' : ''}`}>
            <Momo own color={color} mood={mood} size={compact ? 120 : 150} />
          </span>
          {failed && (
            <svg className="ml-glass" viewBox="0 0 60 60" width="60" height="60" aria-hidden>
              <circle cx="24" cy="24" r="15" fill="#e2f1ff" stroke="#2b2540" strokeWidth="4" />
              <path
                d="M18 18 Q22 14 28 16"
                stroke="#fff"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
              <path d="M35 35 L52 52" stroke="#2b2540" strokeWidth="7" strokeLinecap="round" />
            </svg>
          )}
          <span className="ml-shadow" aria-hidden />
        </button>

        {talk && (
          <p key={hop} className="ml-bubble" role="status">
            {t(talk)}
          </p>
        )}
      </div>

      <p className="ml-message" aria-live="polite" key={failed ? 'f' : line}>
        {message}
      </p>

      {failed ? (
        <>
          <p className="kid-note">
            {online ? t('play.loader.failHint') : t('play.loader.offlineHint')}
          </p>
          {onRetry && (
            <button type="button" className="kid-btn big-play ml-retry" onClick={onRetry}>
              <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
                <path
                  d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t('play.loader.retry')}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="ml-progress" aria-hidden>
            <span />
          </div>
          <p className="kid-note ml-hint">
            {stars.length === 0
              ? t('play.loader.playHint')
              : t('play.loader.stars', { n: stars.length, of: STAR_SPOTS.length })}
          </p>
        </>
      )}
    </Root>
  );
}
