import { useEffect, useState } from 'react';
import { numberWord, type Interaction } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import { CheckButton } from '../ItemPlayer';
import './fun.css';

type Build = Extract<Interaction, { type: 'build' }>;

function Cat({ happy }: { happy: boolean }) {
  return (
    <svg viewBox="0 0 120 110" className="cat-art" aria-hidden>
      <path
        d="M24 40 L18 6 L46 26 Z M96 40 L102 6 L74 26 Z"
        fill="#ffb84d"
        stroke="#2b2540"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <ellipse cx="60" cy="60" rx="44" ry="40" fill="#ffb84d" stroke="#2b2540" strokeWidth="4" />
      <path d="M30 52 h10 M80 52 h10" stroke="#e08a1e" strokeWidth="4" strokeLinecap="round" />
      {happy ? (
        <path
          d="M38 50 Q44 42 50 50 M70 50 Q76 42 82 50"
          fill="none"
          stroke="#2b2540"
          strokeWidth="4"
          strokeLinecap="round"
        />
      ) : (
        <>
          <circle cx="44" cy="50" r="6" fill="#2b2540" />
          <circle cx="76" cy="50" r="6" fill="#2b2540" />
        </>
      )}
      <path d="M56 64 L64 64 L60 70 Z" fill="#ff8fa3" stroke="#2b2540" strokeWidth="2" />
      <path
        d={happy ? 'M48 74 Q60 88 72 74' : 'M50 78 Q60 72 70 78'}
        fill="none"
        stroke="#2b2540"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M14 70 H36 M14 80 H36 M84 70 H106 M84 80 H106"
        stroke="#2b2540"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Beri makan kucing (D-078): ketuk ikan di keranjang untuk memasukkannya ke mangkuk (dihitung keras-keras),
 * ketuk mangkuk untuk mengambil satu kembali. Kucing tersenyum saat makan. Penilaian sama dengan `build`.
 */
export function FeedCat({
  interaction: it,
  disabled,
  showAnswer,
  onSubmit,
}: {
  interaction: Build;
  disabled: boolean;
  showAnswer: boolean;
  onSubmit: (n: number) => void;
}) {
  const [n, setN] = useState(0);
  useEffect(() => setN(0), [it]);
  const count = showAnswer ? it.target : n;
  const object = it.object ?? 'ikan';
  return (
    <div className="feed-board">
      <div className="feed-scene">
        {!it.eater || it.eater === 'kucing' ? (
          <Cat happy={count > 0} />
        ) : (
          <span className="feed-eater">
            <VisualView visual={{ kind: 'object', object: it.eater }} size={130} />
          </span>
        )}
        <button
          type="button"
          className="feed-bowl"
          disabled={disabled || showAnswer || n === 0}
          aria-label={t('play.feed.takeBack')}
          onClick={() => setN((x) => x - 1)}
        >
          <span className="feed-food" aria-live="polite">
            {count > 0 && (
              <VisualView
                visual={{ kind: 'objects', object, count, layout: count <= 5 ? 'row' : 'rows' }}
                size={count <= 5 ? 44 : 70}
              />
            )}
          </span>
          <svg viewBox="0 0 160 40" className="feed-bowl-art" aria-hidden>
            <path
              d="M6 6 H154 Q146 38 80 38 Q14 38 6 6 Z"
              fill="#ff7a59"
              stroke="#2b2540"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </svg>
          <span className="feed-count">{count}</span>
        </button>
      </div>
      <button
        type="button"
        className="feed-add"
        disabled={disabled || showAnswer || n >= it.max}
        aria-label={t('play.feed.give')}
        onClick={() => {
          setN((x) => x + 1);
          speak(numberWord(n + 1));
        }}
      >
        <VisualView visual={{ kind: 'object', object }} size={60} />
        <span>{t('play.feed.giveShort')}</span>
      </button>
      <CheckButton disabled={disabled || n === 0} onClick={() => onSubmit(n)} />
    </div>
  );
}
