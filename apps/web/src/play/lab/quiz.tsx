import { useEffect, useState, type ReactNode } from 'react';
import type { AnswerResult, Item } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { t } from '../../i18n';
import { ItemPlayer, SpeakButton } from '../ItemPlayer';
import { StarIcon } from './ui';

/**
 * Uji lab (D-109): soal asli satu per satu; setelah menjawab Momo menjelaskan, lalu lanjut. Tidak mengubah nilai
 * atau kunci level latihan.
 */
export function QuizRunner({
  items,
  onFinish,
  head,
}: {
  items: Item[];
  onFinish: (results: boolean[]) => void;
  head?: (i: number) => ReactNode;
}) {
  const [i, setI] = useState(0);
  const [res, setRes] = useState<AnswerResult>();
  const [results, setResults] = useState<boolean[]>([]);
  const item = items[i];
  if (!item) return null;
  const next = () => {
    const all = [...results, !!res?.correct];
    setResults(all);
    setRes(undefined);
    if (i + 1 >= items.length) onFinish(all);
    else setI(i + 1);
  };
  return (
    <div className="lab-quiz">
      <div
        className="lab-quiz-bar"
        aria-label={t('play.lab.quizOf', { n: i + 1, of: items.length })}
      >
        {items.map((_, k) => (
          <span
            key={k}
            className={
              k < results.length
                ? results[k]
                  ? 'is-right'
                  : 'is-tried'
                : k === i
                  ? 'is-now'
                  : undefined
            }
          />
        ))}
      </div>
      {head?.(i)}
      <ItemPlayer
        key={`${i}-${item.skillId}-${item.seed}`}
        item={item}
        mode="preview"
        onAnswer={setRes}
      />
      {res && (
        <div className={`example-feedback ${res.correct ? 'is-right' : 'is-wrong'}`} role="status">
          <div className="kid-say">
            <SpeakButton text={item.reteach.say} />
            <p>
              {res.correct ? t('play.quiz.right') : t('play.topic.exampleWrong')} {item.reteach.say}
            </p>
          </div>
          <button type="button" className="kid-btn" onClick={next}>
            {i + 1 >= items.length ? t('play.lab.seeResult') : t('play.lesson.next')}
          </button>
        </div>
      )}
    </div>
  );
}

export function Stars({ n, size = 22 }: { n: number; size?: number }) {
  return (
    <span
      className={`lab-stars${size > 30 ? ' is-big' : ''}`}
      aria-label={t('play.lab.stars', { n })}
    >
      {[1, 2, 3].map((k) => (
        <StarIcon key={k} size={size} off={k > n} />
      ))}
    </span>
  );
}

export function QuizResult({
  right,
  total,
  stars,
  onAgain,
  children,
}: {
  right: number;
  total: number;
  stars: number;
  onAgain: () => void;
  children?: ReactNode;
}) {
  const say = t(
    stars >= 3 ? 'play.lab.resultTop' : stars >= 1 ? 'play.lab.resultGood' : 'play.lab.resultTry',
    { n: right, of: total },
  );
  useEffect(() => speak(say), [say]);
  return (
    <div className="lab-result" role="status">
      <Stars n={stars} size={52} />
      <p>{say}</p>
      {children}
      <button type="button" className="kid-btn secondary" onClick={onAgain}>
        {t('play.lab.quizAgain')}
      </button>
    </div>
  );
}
