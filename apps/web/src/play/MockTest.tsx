import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  durationWords,
  FREE_ACCESS,
  formatClock,
  generateMockRound,
  itemKey,
  MOCK_DIFFICULTIES,
  mockConfigOf,
  mockMaxPoints,
  recordQuiz,
  rememberRound,
  scoreMock,
  type AnswerResult,
  type Color,
  type MockConfig,
  type MockDifficulty,
  type MockOutcome,
  type MockScore,
  type Item,
  type SkillTemplate,
} from '@little-coder/engine';
import { speak, stopSpeaking } from '../audio/speech';
import { useSession } from '../auth/session';
import { Momo } from '../components/Momo';
import { t, type MessageKey } from '../i18n';
import { useCatalog } from './catalog';
import { ItemPlayer, SpeakButton } from './ItemPlayer';
import { PlayIcon } from './icons';
import { useLinks } from './links';
import { loadProgress, newId, updateProgress } from './practiceStore';
import { flushPractice } from './sync';
import { useStopwatch } from './useStopwatch';
import { PremiumNotice } from './PremiumNotice';
import './mock.css';

const DIFF_LABEL: Record<MockDifficulty, MessageKey> = {
  easy: 'play.mock.easy',
  medium: 'play.mock.medium',
  hard: 'play.mock.hard',
};
const sign = (n: number) => (n > 0 ? `+${n}` : String(n));

/**
 * Mock Test olimpiade (D-072): 25 soal gabungan semua materi di buku, mudah → sulit, seperti lembar lomba.
 * Tanda benar/belum tepat tidak tampil per soal; soal boleh dilewati; stopwatch tanpa batas waktu (D-024).
 * Hasil: poin gaya EMC, skor 0–100 (masuk skor utama), jumlah benar, durasi, dan pembahasan tiap soal.
 */
export function MockTest({
  mock,
  momoColor,
  onRestart,
}: {
  mock: SkillTemplate;
  momoColor: Color;
  onRestart: () => void;
}) {
  const session = useSession('child')!;
  const childId = session.user.id;
  const { data } = useCatalog();
  const links = useLinks(data);
  const config = useMemo(() => mockConfigOf(mock), [mock]);
  const [seed] = useState(() => Math.floor(Date.now() % 1_000_000_000));
  const round = useMemo(() => {
    if (!data) return undefined;
    try {
      return generateMockRound(mock, data.skills, {
        seed,
        avoid: loadProgress(childId).recentItems?.[mock.id],
      });
    } catch {
      return [];
    }
    // Soal dibuat sekali per percobaan; katalog yang diperbarui server tidak mengganti soal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mock.id, mock.version, seed, childId, !!data]);

  const [phase, setPhase] = useState<'question' | 'done'>('question');
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<MockOutcome[]>([]);
  const [result, setResult] = useState<{ score: MockScore; timeMs: number }>();
  const [quit, setQuit] = useState(false);
  // Stopwatch baru berjalan saat soal pertama tampil (bukan selama halaman dimuat).
  const watch = useStopwatch(phase === 'question' && !!links && !!round && round.length > 0);

  useEffect(() => () => stopSpeaking(), []);

  if (!data || !links || !round) {
    return (
      <main className="kid-screen">
        <Momo own color={momoColor} mood="idle" size={140} />
        <p className="kid-note">{t('play.library.loading')}</p>
      </main>
    );
  }
  const topicHref = links.topic(mock);
  if (round.length === 0) {
    return (
      <main className="kid-screen">
        <Momo own color={momoColor} mood="curious" size={140} />
        <p className="kid-note">{t('play.mock.unavailable')}</p>
        <Link className="kid-btn" to={topicHref}>
          {t('play.quiz.backTopic')}
        </Link>
      </main>
    );
  }

  if ((mock as SkillTemplate & { stub?: boolean }).stub) {
    return (
      <main className="kid-screen">
        <Momo own color={momoColor} mood="curious" size={140} />
        <PremiumNotice access={data.access ?? FREE_ACCESS} mock />
        <Link className="kid-btn" to={topicHref}>
          {t('play.quiz.backTopic')}
        </Link>
      </main>
    );
  }

  const finish = (all: MockOutcome[]) => {
    const score = scoreMock(
      config,
      all.map((outcome, i) => ({ difficulty: round[i]!.difficulty, outcome })),
    );
    const timeMs = Math.round(watch.elapsed());
    const now = Date.now();
    const id = newId();
    updateProgress(childId, (p) => ({
      ...p,
      quizzes: {
        ...p.quizzes,
        [mock.id]: recordQuiz(p.quizzes[mock.id], score.score, now, timeMs),
      },
      quizOutbox: [
        ...p.quizOutbox,
        {
          id,
          skillId: mock.id,
          correct: score.correct,
          total: config.questions,
          ts: now,
          durationMs: timeMs,
          points: score.points,
          review: round.map((q, i) => ({
            skillId: q.item.skillId,
            version: q.item.version,
            seed: q.item.seed,
            band: q.item.band,
            difficulty: q.difficulty,
            outcome: all[i]!,
          })),
        },
      ],
      quizHistory: [
        {
          id,
          skillId: mock.id,
          title: mock.title,
          score: score.score,
          correct: score.correct,
          total: config.questions,
          passed: score.score >= 70,
          durationMs: timeMs,
          ts: now,
        },
        ...p.quizHistory,
      ].slice(0, 50),
      recentItems: {
        ...p.recentItems,
        [mock.id]: rememberRound(
          p.recentItems?.[mock.id],
          round.map((q) => itemKey(q.item)),
        ),
      },
    }));
    void flushPractice(childId);
    speak(t('play.mock.doneSay', { correct: score.correct, total: config.questions }));
    setResult({ score, timeMs });
    setPhase('done');
  };

  const answer = (outcome: MockOutcome) => {
    const all = [...outcomes, outcome];
    setOutcomes(all);
    // Jawaban tersimpan tanpa tanda benar/belum tepat; lanjut ke soal berikutnya.
    window.setTimeout(
      () => (all.length >= round.length ? finish(all) : setIndex(all.length)),
      outcome === 'skip' ? 0 : 350,
    );
  };

  if (phase === 'done' && result) {
    return (
      <MockResult
        mock={mock}
        round={round}
        outcomes={outcomes}
        result={result}
        referenceMinutes={config.referenceMinutes}
        momoColor={momoColor}
        topicHref={topicHref}
        onRestart={onRestart}
      />
    );
  }

  const q = round[index]!;
  return (
    <main className="practice mock-run">
      <header className="mock-bar">
        <span className="mock-count">
          {t('play.mock.progress', { n: index + 1, total: round.length })}
        </span>
        <span className={`mock-diff is-${q.difficulty}`}>{t(DIFF_LABEL[q.difficulty])}</span>
        <span className="mock-clock" aria-label={t('play.mock.elapsed')}>
          {formatClock(watch.elapsed())}
        </span>
      </header>
      <div className="mock-dots" aria-hidden>
        {round.map((r, i) => (
          <span
            key={i}
            className={`is-${r.difficulty}${i < outcomes.length ? ' is-done' : ''}${i === index ? ' is-now' : ''}`}
          />
        ))}
      </div>
      <ItemPlayer
        key={`${seed}-${index}`}
        item={q.item}
        tier="basic"
        showMarks={false}
        disabled={outcomes.length > index}
        onAnswer={(r: AnswerResult) => answer(r.correct ? 'right' : 'wrong')}
      />
      <div className="mock-actions">
        {quit ? (
          <div className="mock-quit" role="alertdialog" aria-label={t('play.mock.quitTitle')}>
            <p>{t('play.mock.quitTitle')}</p>
            <button type="button" className="kid-btn secondary" onClick={() => setQuit(false)}>
              {t('play.mock.quitNo')}
            </button>
            <Link className="kid-btn" to={topicHref}>
              {t('play.mock.quitYes')}
            </Link>
          </div>
        ) : (
          <>
            <button type="button" className="kid-link" onClick={() => setQuit(true)}>
              {t('play.mock.quit')}
            </button>
            <button
              type="button"
              className="kid-btn secondary"
              disabled={outcomes.length > index}
              onClick={() => answer('skip')}
            >
              {t('play.mock.skip')}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function MockResult({
  mock,
  round,
  outcomes,
  result,
  referenceMinutes,
  momoColor,
  topicHref,
  onRestart,
}: {
  mock: SkillTemplate;
  round: ReturnType<typeof generateMockRound>;
  outcomes: MockOutcome[];
  result: { score: MockScore; timeMs: number };
  referenceMinutes: number;
  momoColor: Color;
  topicHref: string;
  onRestart: () => void;
}) {
  return (
    <main className="library mock-page">
      <MockReportView
        title={mock.title.split(' — ')[0]!}
        questions={round}
        outcomes={outcomes}
        score={result.score}
        timeMs={result.timeMs}
        referenceMinutes={referenceMinutes}
        momoColor={momoColor}
        praise
        actions={
          <div className="mock-actions">
            <Link className="kid-btn secondary" to={topicHref}>
              {t('play.quiz.backTopic')}
            </Link>
            <button type="button" className="kid-btn big-play" onClick={onRestart}>
              {t('play.mock.again')}
            </button>
          </div>
        }
      />
    </main>
  );
}

/**
 * Laporan satu percobaan Mock Test (D-072): ringkasan, rincian per tingkat, dan pembahasan tiap soal (jawaban
 * benar + penjelasan). Dipakai tepat setelah tes dan dari riwayat "Laporan mock test-ku" (khusus anak itu sendiri).
 */
export function MockReportView({
  title,
  when,
  questions,
  outcomes,
  score: s,
  timeMs,
  referenceMinutes,
  momoColor,
  praise = false,
  actions,
}: {
  title: string;
  when?: string;
  questions: readonly { item?: Item; difficulty: MockDifficulty }[];
  outcomes: readonly MockOutcome[];
  score: MockScore;
  timeMs: number | null;
  referenceMinutes: number;
  momoColor: Color;
  praise?: boolean;
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState<number>();
  return (
    <>
      <section className="mock-card mock-result">
        <div className="mock-head">
          <Momo own color={momoColor} mood={s.score >= 70 ? 'proud' : 'happy'} size={88} />
          <div className="mock-head-text">
            <h2>{t('play.mock.resultTitle')}</h2>
            <p>{when ? `${title} · ${when}` : title}</p>
          </div>
        </div>
        <div className="mock-stats">
          <div className="mock-stat is-main">
            <strong>{s.score}</strong>
            <span>{t('play.mock.score')}</span>
          </div>
          <div className="mock-stat">
            <strong>
              {s.points} / {s.maxPoints}
            </strong>
            <span>{t('play.mock.points')}</span>
          </div>
          <div className="mock-stat">
            <strong>
              {s.correct} / {questions.length}
            </strong>
            <span>{t('play.mock.correct')}</span>
          </div>
          <div className="mock-stat">
            <strong>{timeMs === null ? '–' : formatClock(timeMs)}</strong>
            <span title={timeMs === null ? undefined : durationWords(timeMs)}>
              {t('play.mock.time', { minutes: referenceMinutes })}
            </span>
          </div>
        </div>
        <div className="mock-table-wrap">
          <table className="mock-points">
            <thead>
              <tr>
                <th>{t('play.mock.level')}</th>
                <th>{t('play.mock.right')}</th>
                <th>{t('play.mock.notYet')}</th>
                <th>{t('play.mock.skipped')}</th>
                <th>{t('play.mock.points')}</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_DIFFICULTIES.map((d) => (
                <tr key={d}>
                  <td>
                    <span className={`mock-diff is-${d}`}>{t(DIFF_LABEL[d])}</span>
                  </td>
                  <td>{s.byDifficulty[d].right}</td>
                  <td>{s.byDifficulty[d].wrong}</td>
                  <td>{s.byDifficulty[d].skip}</td>
                  <td>{s.byDifficulty[d].points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {praise && <p className="kid-note">{t('play.mock.praise')}</p>}
        {actions}
      </section>
      <section className="mock-card" aria-label={t('play.mock.review')}>
        <h2>{t('play.mock.review')}</h2>
        <p className="mock-review-hint">{t('play.mock.reviewHint')}</p>
        <ol className="mock-review">
          {questions.map((q, i) => (
            <li key={i} className={`is-${outcomes[i] ?? 'skip'}`}>
              <button
                type="button"
                className="mock-review-row"
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? undefined : i)}
              >
                <span className="mock-review-no">{i + 1}</span>
                <span className="mock-review-q">
                  {q.item?.prompt ?? t('play.mock.changed')}
                  <small className={`mock-diff is-${q.difficulty}`}>
                    {t(DIFF_LABEL[q.difficulty])}
                  </small>
                </span>
                <span className="mock-review-tag">
                  {t(
                    outcomes[i] === 'right'
                      ? 'play.mock.right'
                      : outcomes[i] === 'wrong'
                        ? 'play.mock.notYet'
                        : 'play.mock.skipped',
                  )}
                </span>
              </button>
              {open === i && (
                <div className="mock-review-body">
                  {q.item ? (
                    <>
                      <ItemPlayer item={q.item} mode="preview" showAnswer disabled />
                      <p className="kid-note">{q.item.reteach.say}</p>
                    </>
                  ) : (
                    <p className="kid-note">{t('play.mock.changedLong')}</p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

/** Tabel poin per tingkat (penilaian gaya EMC). */
export function MockPointsTable({ config }: { config: MockConfig }) {
  return (
    <table className="mock-points">
      <thead>
        <tr>
          <th>{t('play.mock.level')}</th>
          <th>{t('play.mock.questions')}</th>
          <th>{t('play.mock.right')}</th>
          <th>{t('play.mock.notYet')}</th>
          <th>{t('play.mock.skipped')}</th>
        </tr>
      </thead>
      <tbody>
        {MOCK_DIFFICULTIES.map((d) => (
          <tr key={d}>
            <td>
              <span className={`mock-diff is-${d}`}>{t(DIFF_LABEL[d])}</span>
            </td>
            <td>{config.plan[d]}</td>
            <td className="is-plus">{sign(config.points[d].right)}</td>
            <td className="is-minus">{sign(config.points[d].wrong)}</td>
            <td>0</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Ringkasan Mock Test di halaman topik (D-072): fakta utama, tabel poin, hasil terbaik, tips, dan satu tombol
 * mulai. Menggantikan tampilan "materi + daftar level" yang dipakai topik biasa.
 */
export function MockOverview({
  mock,
  tips,
  momoColor,
  best,
  start,
  locked,
}: {
  mock: SkillTemplate;
  tips: readonly string[];
  momoColor: Color;
  best?: { best: number; bestTimeMs?: number; attempts: number };
  /** Tautan mulai (undefined bila terkunci). */
  start?: string;
  locked?: ReactNode;
}) {
  const c = mockConfigOf(mock);
  const say = t('play.mock.introSay', { n: c.questions, minutes: c.referenceMinutes });
  return (
    <section className="mock-overview" aria-labelledby="mock-title">
      <div className="mock-head">
        <Momo own color={momoColor} mood="curious" size={72} />
        <div className="mock-head-text">
          <h2 id="mock-title">{t('play.mock.heading')}</h2>
          <p>{t('play.mock.subtitle', { n: c.questions })}</p>
        </div>
        <SpeakButton text={say} label={t('play.topic.listen')} />
      </div>
      <ul className="mock-facts">
        <li>
          <strong>{c.questions}</strong>
          <span>{t('play.mock.factQuestions')}</span>
        </li>
        <li>
          <strong>
            {c.plan.easy} · {c.plan.medium} · {c.plan.hard}
          </strong>
          <span>{t('play.mock.factLevels')}</span>
        </li>
        <li>
          <strong>{t('play.mock.factNoLimit')}</strong>
          <span>{t('play.mock.factReference', { minutes: c.referenceMinutes })}</span>
        </li>
        <li>
          <strong>{t('play.mock.factNew')}</strong>
          <span>{t('play.mock.factRetry')}</span>
        </li>
      </ul>
      <div className="mock-scoring">
        <h3>{c.rule}</h3>
        <MockPointsTable config={c} />
        <p className="mock-formula">{t('play.mock.formula', { max: mockMaxPoints(c) })}</p>
      </div>
      {best && (
        <p className="mock-best">
          {t('play.mock.best', {
            score: best.best,
            time: best.bestTimeMs !== undefined ? formatClock(best.bestTimeMs) : '–',
          })}{' '}
          {t('play.mock.attempts', { n: best.attempts })}
        </p>
      )}
      {tips.length > 0 && (
        <ul className="mock-tips">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}
      {locked}
      {start && (
        <div className="topic-cta mock-cta">
          <Link className="kid-btn big-play" to={start}>
            <PlayIcon />
            {t('play.mock.start')}
          </Link>
        </div>
      )}
    </section>
  );
}
