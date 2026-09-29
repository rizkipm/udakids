import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  answerJago,
  correctNeeded,
  durationWords,
  formatClock,
  generateRound,
  itemKey,
  rememberRound,
  isPassed,
  levelStatuses,
  PASS_SCORE,
  QUIZ_LENGTH,
  quizScore,
  recordQuiz,
  type AnswerResult,
  type AnswerValue,
  type Color,
  type Item,
  type Visual,
} from '@little-coder/engine';
import { speak } from '../audio/speech';
import { useSession } from '../auth/session';
import { Momo, type MomoMood } from '../components/Momo';
import { VisualView } from '../components/visuals';
import { t, type MessageKey } from '../i18n';
import { levelLabel, shelvesOf, useCatalog } from './catalog';
import { useLinks } from './links';
import { ItemPlayer, SpeakButton } from './ItemPlayer';
import { loadProgress, newId, stateOf, updateProgress, useProgress } from './practiceStore';
import { flushPractice } from './sync';
import { useStopwatch } from './useStopwatch';

type Phase =
  | { name: 'question' }
  | { name: 'feedback'; correct: boolean; message: string }
  | { name: 'done'; score: number; correct: number; timeMs: number };

const PRAISE: MessageKey[] = [
  'play.session.praise.1',
  'play.session.praise.2',
  'play.session.praise.3',
  'play.session.praise.4',
  'play.session.praise.5',
];

/**
 * Ronde satu level (D-021): 10 soal dari mudah ke sulit. Benar = hijau, salah = merah + jawaban
 * benar + pembahasan. Skor akhir 0–100; lulus bila ≥ 70 dan membuka level berikutnya.
 */
export function Practice({ momoColor, onRestart }: { momoColor: Color; onRestart: () => void }) {
  const { token = '' } = useParams();
  const session = useSession('child')!;
  const childId = session.user.id;
  const progress = useProgress(childId);
  const { data } = useCatalog();
  const links = useLinks(data);
  const skillId = links?.skillOf(token) ?? '';
  const skill = data?.skills.find((s) => s.id === skillId);

  // Level sebelum & sesudahnya dalam buku yang sama, untuk kunci dan tombol "Level berikutnya".
  const book = useMemo(() => {
    if (!data || !skill) return undefined;
    const shelves = shelvesOf(data).filter(
      (s) => s.catalog.domain === skill.domain && s.catalog.grade === skill.grade,
    );
    const shelfIndex = shelves.findIndex((s) => s.category.code === skill.category);
    const shelf = shelves[shelfIndex];
    return {
      statuses: levelStatuses(
        shelves.map((s) => s.category.code),
        shelves.flatMap((s) => s.skills),
        progress.quizzes,
      ),
      next: shelf?.skills[shelf.skills.findIndex((k) => k.id === skill.id) + 1],
      nextShelf: shelves[shelfIndex + 1],
      topic: shelf?.category.title,
      levelNo: (shelf?.skills.findIndex((k) => k.id === skill.id) ?? 0) + 1,
    };
  }, [data, skill, progress.quizzes]);

  const [seedBase] = useState(() => Math.floor(Date.now() % 1_000_000));
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<boolean[]>([]);
  const [phase, setPhase] = useState<Phase>({ name: 'question' });
  const [confirmQuit, setConfirmQuit] = useState(false);
  const navigate = useNavigate();
  const correctSoFar = history.filter(Boolean).length;
  // Stopwatch berjalan hanya saat soal dikerjakan (tanpa batas waktu, D-024).
  const watch = useStopwatch(phase.name === 'question' && !confirmQuit);

  // Katalog dimuat dua kali (cache perangkat lalu server) dengan objek baru: soal hanya dibuat ulang
  // bila id/versi skill berubah, supaya ketukan anak tidak hilang saat katalog diperbarui.
  const skillKey = skill ? `${skill.id}@${skill.version}` : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableSkill = useMemo(() => skill, [skillKey]);
  // Satu ronde disusun sekaligus (D-028): 10 soal tanpa kembar, menghindari soal ronde-ronde sebelumnya
  // (riwayat di perangkat), band mudah → sulit sesuai level. Coba lagi = ronde baru dengan soal lain.
  const round = useMemo(
    () =>
      stableSkill
        ? generateRound(stableSkill, {
            seed: seedBase,
            avoid: loadProgress(childId).recentItems?.[stableSkill.id],
          })
        : undefined,
    [stableSkill, seedBase, childId],
  );
  const item: Item | undefined = round?.[index];

  const locked = book?.statuses[skillId] === 'locked';
  useEffect(() => {
    if (locked) speak(t('play.quiz.locked', { pass: PASS_SCORE }));
  }, [locked]);
  // Catat soal ronde ini begitu ronde dimulai (juga bila anak berhenti di tengah).
  useEffect(() => {
    if (!round || !stableSkill || locked) return;
    const keys = round.map(itemKey);
    updateProgress(childId, (p) => ({
      ...p,
      recentItems: {
        ...p.recentItems,
        [stableSkill.id]: rememberRound(p.recentItems?.[stableSkill.id], keys),
      },
    }));
  }, [round, stableSkill, locked, childId]);

  if (!data || !links) {
    return (
      <main className="kid-screen">
        <Momo color={momoColor} mood="idle" size={140} />
        <p className="kid-note">{t('play.library.loading')}</p>
      </main>
    );
  }
  if (!skill || !item || !book) {
    return (
      <main className="kid-screen">
        <Momo color={momoColor} mood="curious" size={140} />
        <p className="kid-note">{t('play.quiz.notFound')}</p>
        <Link className="kid-btn" to="/play">
          {t('play.quiz.back')}
        </Link>
      </main>
    );
  }
  if (locked) {
    return (
      <main className="kid-screen">
        <Momo color={momoColor} mood="curious" size={140} />
        <p className="kid-note">{t('play.quiz.locked', { pass: PASS_SCORE })}</p>
        <Link className="kid-btn" to={links.topic(skill)}>
          {t('play.quiz.backTopic')}
        </Link>
      </main>
    );
  }

  const finish = (answers: boolean[]) => {
    const correct = answers.filter(Boolean).length;
    const score = quizScore(correct, QUIZ_LENGTH);
    const now = Date.now();
    const id = newId();
    const timeMs = Math.round(watch.elapsed());
    updateProgress(childId, (p) => ({
      ...p,
      quizzes: { ...p.quizzes, [skill.id]: recordQuiz(p.quizzes[skill.id], score, now, timeMs) },
      quizOutbox: [
        ...p.quizOutbox,
        { id, skillId: skill.id, correct, total: QUIZ_LENGTH, ts: now, durationMs: timeMs },
      ],
      quizHistory: [
        {
          id,
          skillId: skill.id,
          title: skill.title,
          score,
          correct,
          total: QUIZ_LENGTH,
          passed: isPassed(score),
          durationMs: timeMs,
          ts: now,
        },
        ...p.quizHistory,
      ].slice(0, 50),
    }));
    void flushPractice(childId);
    const passed = isPassed(score);
    speak(
      `${t('play.quiz.score', { score })}. ${t('play.quiz.timeSay', { time: durationWords(timeMs) })}. ${
        passed
          ? t(book.next ? 'play.quiz.passed' : 'play.quiz.passedLast')
          : t('play.quiz.failed', { need: correctNeeded(), pass: PASS_SCORE })
      }`,
    );
    setPhase({ name: 'done', score, correct, timeMs });
  };

  const next = () => {
    if (index + 1 >= QUIZ_LENGTH) return finish(history);
    setIndex((i) => i + 1);
    setPhase({ name: 'question' });
  };

  const onAnswer = (r: AnswerResult & { value: AnswerValue }) => {
    const now = Date.now();
    updateProgress(childId, (p) => ({
      ...p,
      outbox: [
        ...p.outbox,
        {
          id: newId(),
          skillId: skill.id,
          correct: r.correct,
          band: item.band,
          ...(r.chosenDistractor && { chosenDistractor: r.chosenDistractor }),
          ts: now,
        },
      ],
      // Skor Jago tetap dihitung untuk laporan orang tua & rekomendasi.
      states: { ...p.states, [skill.id]: answerJago(stateOf(p, skill.id), r.correct, now).state },
    }));
    void flushPractice(childId);
    setHistory((h) => [...h, r.correct]);
    const message = r.correct
      ? `${t('play.quiz.right')} ${t(PRAISE[(seedBase + index) % PRAISE.length]!)}`
      : `${t('play.quiz.wrong')} ${item.reteach.say}`;
    speak(message);
    setPhase({ name: 'feedback', correct: r.correct, message });
  };

  const header = (
    <header className="practice-head">
      <button
        type="button"
        className="kid-link"
        aria-label={t('play.quiz.backTopic')}
        onClick={() =>
          // Di tengah ronde: tanya dulu agar anak tidak kehilangan ronde tanpa sengaja.
          phase.name === 'done' || history.length === 0
            ? navigate(links.topic(skill))
            : setConfirmQuit(true)
        }
      >
        <svg viewBox="0 0 48 48" width="32" height="32" aria-hidden>
          <path
            d="M30 10L16 24l14 14"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="practice-title">
        <span className="practice-kicker">
          {book.topic && <span className="practice-topic">{book.topic}</span>}
          <span className="practice-level">{t('play.library.level', { n: book.levelNo })}</span>
        </span>
        <strong className="practice-name">{levelLabel(skill.title)}</strong>
      </div>
      <div className="practice-meta">
        <Stopwatch
          ms={phase.name === 'done' ? phase.timeMs : watch.elapsed()}
          running={watch.running}
        />
        <div className="practice-score" aria-live="polite">
          {t('play.quiz.correctCount', { n: correctSoFar })}
        </div>
      </div>
    </header>
  );

  const progressLabel = t('play.quiz.progress', {
    n: Math.min(index + 1, QUIZ_LENGTH),
    total: QUIZ_LENGTH,
  });
  const dots = (
    <div className="quiz-progress">
      <div className="quiz-dots" role="img" aria-label={progressLabel}>
        {Array.from({ length: QUIZ_LENGTH }, (_, i) => (
          <span
            key={i}
            className={`quiz-dot${history[i] === true ? ' is-right' : history[i] === false ? ' is-wrong' : i === index ? ' is-current' : ''}`}
          />
        ))}
      </div>
      <span className="quiz-count" aria-hidden>
        {progressLabel}
      </span>
    </div>
  );

  if (phase.name === 'done') {
    const passed = isPassed(phase.score);
    return (
      <main className="practice">
        {header}
        <section className={`result-card ${passed ? 'is-passed' : 'is-failed'}`}>
          <Momo color={momoColor} mood={passed ? 'proud' : 'curious'} size={130} />
          <p className="result-score">{t('play.quiz.score', { score: phase.score })}</p>
          <p className="result-summary">
            {t('play.quiz.summary', { correct: phase.correct, total: QUIZ_LENGTH })}
          </p>
          <p className="result-time">
            <ClockIcon />
            {t('play.quiz.time', { time: durationWords(phase.timeMs) })}
          </p>
          <div className="quiz-dots">
            {history.map((ok, i) => (
              <span key={i} className={`quiz-dot ${ok ? 'is-right' : 'is-wrong'}`} />
            ))}
          </div>
          <p className="result-message">
            {passed
              ? t(book.next ? 'play.quiz.passed' : 'play.quiz.passedLast')
              : t('play.quiz.failed', { need: correctNeeded(), pass: PASS_SCORE })}
          </p>
          <div className="result-actions">
            {passed ? (
              book.next ? (
                <Link className="kid-btn big-play" to={links.level(book.next.id)}>
                  {t('play.quiz.nextLevelN', { n: book.levelNo + 1 })}
                </Link>
              ) : book.nextShelf ? (
                <Link className="kid-btn big-play" to={links.topic(book.nextShelf.skills[0]!)}>
                  {t('play.quiz.nextTopic', { topic: book.nextShelf.category.title })}
                </Link>
              ) : (
                <Link className="kid-btn big-play" to="/play">
                  {t('play.quiz.back')}
                </Link>
              )
            ) : (
              <button type="button" className="kid-btn big-play" onClick={onRestart}>
                {t('play.quiz.retry')}
              </button>
            )}
            <div className="result-more">
              {passed ? (
                <button type="button" className="kid-link" onClick={onRestart}>
                  {t('play.quiz.retryBetter')}
                </button>
              ) : (
                <Link className="kid-link" to={links.topic(skill)}>
                  {t('play.quiz.readLesson')}
                </Link>
              )}
              {passed && (
                <Link className="kid-link" to={links.topic(skill)}>
                  {t('play.quiz.backTopic')}
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="practice">
      {header}
      {dots}
      {confirmQuit && (
        <div className="quit-backdrop">
          <div
            className="quit-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="quit-title"
          >
            <Momo color={momoColor} mood="curious" size={90} />
            <div className="kid-say">
              <SpeakButton text={`${t('play.quiz.quitTitle')} ${t('play.quiz.quitText')}`} />
              <p id="quit-title">{t('play.quiz.quitTitle')}</p>
            </div>
            <p className="kid-note">{t('play.quiz.quitText')}</p>
            <div className="kid-row">
              <button
                type="button"
                className="kid-btn"
                autoFocus
                onClick={() => setConfirmQuit(false)}
              >
                {t('play.quiz.quitStay')}
              </button>
              <button
                type="button"
                className="kid-btn secondary"
                onClick={() => navigate(links.topic(skill))}
              >
                {t('play.quiz.quitLeave')}
              </button>
            </div>
          </div>
        </div>
      )}
      <ItemPlayer
        key={`${seedBase}-${index}`}
        item={item}
        onAnswer={onAnswer}
        disabled={phase.name !== 'question'}
        showAnswer={phase.name === 'feedback' && !phase.correct}
      />
      {phase.name === 'feedback' && (
        <Feedback
          correct={phase.correct}
          color={momoColor}
          message={phase.message}
          onNext={next}
          last={index + 1 >= QUIZ_LENGTH}
        >
          {!phase.correct &&
            item.reteach.show
              // Angka tunggal sudah terlihat hijau di papan jawaban → tidak ditampilkan dua kali.
              ?.filter((v) => v.kind !== 'numeral')
              .map((v, i) => <CountAlong key={i} visual={v} />)}
        </Feedback>
      )}
    </main>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 48 48" width="26" height="26" aria-hidden className="clock-icon">
      <circle cx="24" cy="26" r="17" fill="#fff" stroke="currentColor" strokeWidth="4" />
      <path
        d="M24 16v10l7 5"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="19" y="3" width="10" height="5" rx="2" fill="currentColor" />
    </svg>
  );
}

/** Jam berjalan di kepala ronde (tanpa batas waktu; berhenti saat membaca pembahasan). */
function Stopwatch({ ms, running }: { ms: number; running: boolean }) {
  return (
    <div
      className={`stopwatch${running ? ' is-running' : ''}`}
      role="timer"
      aria-label={t('play.quiz.timeLabel', { time: durationWords(ms) })}
    >
      <ClockIcon />
      <span>{formatClock(ms)}</span>
    </div>
  );
}

function Feedback({
  correct,
  color,
  message,
  onNext,
  last,
  children,
}: {
  correct: boolean;
  color: Color;
  message: string;
  onNext: () => void;
  last: boolean;
  children?: ReactNode;
}) {
  const mood: MomoMood = correct ? 'happy' : 'curious';
  const ref = useRef<HTMLDivElement>(null);
  // Umpan balik = footer tetap (D-030). Tingginya dipasang sebagai --feedback-h agar halaman memberi
  // ruang di bawah; lalu halaman digulir supaya pilihan jawaban tetap terlihat di atas footer.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const apply = () => {
      const h = el.getBoundingClientRect().height;
      root.style.setProperty('--feedback-h', `${Math.ceil(h)}px`);
      const board = document.querySelector('.practice .interaction');
      const bottom = board?.getBoundingClientRect().bottom ?? 0;
      const limit = window.innerHeight - h - 16;
      if (bottom > limit) window.scrollBy?.({ top: bottom - limit, behavior: 'smooth' });
    };
    apply();
    const ro = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(apply);
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      root.style.removeProperty('--feedback-h');
    };
  }, []);
  return (
    <div ref={ref} className={`feedback ${correct ? 'is-right' : 'is-wrong'}`} role="status">
      <Momo color={color} mood={mood} size={90} />
      <div className="feedback-body">
        <div className="kid-say">
          <SpeakButton text={message} />
          <p>{message}</p>
        </div>
        {children && <div className="feedback-show">{children}</div>}
      </div>
      <button type="button" className="kid-btn next-btn" onClick={onNext} autoFocus>
        {last ? t('play.quiz.seeScore') : t('play.session.next')}
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <path
            d="M18 10l14 14-14 14"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

/** Rute latihan: "Coba lagi" memulai ronde baru (state di-reset lewat key). */
export function PracticeRoute({ momoColor }: { momoColor: Color }) {
  const { token } = useParams();
  const [run, setRun] = useState(0);
  return (
    <Practice
      key={`${token}-${run}`}
      momoColor={momoColor}
      onRestart={() => setRun((r) => r + 1)}
    />
  );
}

/** "Hitung bareng": sorot benda satu per satu. */
function CountAlong({ visual }: { visual: Visual }) {
  const total =
    visual.kind === 'objects' || visual.kind === 'dots'
      ? visual.count
      : visual.kind === 'cubes'
        ? visual.counts.reduce((a, b) => a + b, 0) - (visual.crossed ?? 0)
        : visual.kind === 'frame'
          ? visual.filled
          : visual.kind === 'shapes'
            ? visual.items.length
            : 0;
  const animate = 'countAlong' in visual && visual.countAlong === true && total > 0;
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!animate) return;
    setStep(0);
    const id = setInterval(() => setStep((s) => (s >= total ? s : s + 1)), 750);
    return () => clearInterval(id);
  }, [animate, total]);
  return <VisualView visual={visual} size={96} {...(animate && { countStep: step })} />;
}
