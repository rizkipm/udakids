import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  answerJago,
  correctNeeded,
  isListeningItem,
  FREE_ACCESS,
  RESULT_KEYS,
  RIGHT_KEYS,
  scoreKey,
  WRONG_KEYS,
  withAccess,
  durationWords,
  formatClock,
  generateRound,
  itemKey,
  rememberRound,
  isPassed,
  isMockSkill,
  levelStatuses,
  standaloneCodes,
  groupStartCodes,
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
import {
  audioReady,
  prefetchItemVoice,
  speak,
  speakItem,
  speakLine,
  speechAvailable,
  unlockNow,
} from '../audio/speech';
import { useSession } from '../auth/session';
import { Momo, type MomoMood } from '../components/Momo';
import { VisualView } from '../components/visuals';
import { t, type MessageKey } from '../i18n';
import { levelLabel, shelvesOf, useCatalog } from './catalog';
import { useLinks } from './links';
import { MomoLoader } from './MomoLoader';
import { ItemPlayer, SpeakButton } from './ItemPlayer';
import { PlayIcon } from './icons';
import { PremiumNotice, premiumSay } from './PremiumNotice';
import {
  loadProgress,
  newId,
  RESUME_MAX_AGE_MS,
  stateOf,
  updateProgress,
  useProgress,
} from './practiceStore';
import { flushPractice } from './sync';
import { useStopwatch } from './useStopwatch';
import { MockTest } from './MockTest';

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
  const { data, failed: catalogFailed, retry: retryCatalog } = useCatalog();
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
      // Level berbayar yang belum dibeli → 'paid' (D-036).
      statuses: withAccess(
        levelStatuses(
          shelves.map((s) => s.category.code),
          shelves.flatMap((s) => s.skills),
          progress.quizzes,
          standaloneCodes(shelves.map((s) => s.category)),
          groupStartCodes(shelves.map((s) => s.category)),
        ),
        shelves.flatMap((s) => s.skills),
        data.access ?? FREE_ACCESS,
      ),
      next: shelf?.skills[shelf.skills.findIndex((k) => k.id === skill.id) + 1],
      nextShelf: shelves[shelfIndex + 1],
      topic: shelf?.category.title,
      levelNo: (shelf?.skills.findIndex((k) => k.id === skill.id) ?? 0) + 1,
    };
  }, [data, skill, progress.quizzes]);

  // Lanjutkan ronde yang belum selesai (D-073): ronde yang sama disusun ulang dari seed + daftar hindar tersimpan.
  const resume = useMemo(() => {
    const snap = loadProgress(childId).inProgress;
    return skill &&
      snap?.skillId === skill.id &&
      snap.version === skill.version &&
      snap.history.length > 0 &&
      Date.now() - snap.ts < RESUME_MAX_AGE_MS
      ? snap
      : undefined;
    // Dibaca sekali per skill; jangan ikut berubah saat snapshot diperbarui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill?.id, skill?.version, childId]);
  const [freshSeed] = useState(() => Math.floor(Date.now() % 1_000_000));
  const seedBase = resume?.seedBase ?? freshSeed;
  const avoidUsed = useRef<string[]>([]);
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<boolean[]>([]);
  const [phase, setPhase] = useState<Phase>({ name: 'question' });
  const [confirmQuit, setConfirmQuit] = useState(false);
  const navigate = useNavigate();
  const correctSoFar = history.filter(Boolean).length;
  // Stopwatch berjalan hanya saat soal dikerjakan (tanpa batas waktu, D-024).
  // Soal dibuka langsung (URL / muat ulang / aplikasi baru dibuka): browser menolak suara sampai ada ketukan.
  // Tampilkan tombol "Mulai" dulu agar soal pertama pasti terdengar (D-047).
  const [gate, setGate] = useState(() => speechAvailable() && !audioReady());
  const watch = useStopwatch(phase.name === 'question' && !confirmQuit && !gate);

  // Katalog dimuat dua kali (cache perangkat lalu server) dengan objek baru: soal hanya dibuat ulang
  // bila id/versi skill berubah, supaya ketukan anak tidak hilang saat katalog diperbarui.
  const skillKey = skill ? `${skill.id}@${skill.version}` : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableSkill = useMemo(() => skill, [skillKey]);
  // Satu ronde disusun sekaligus (D-028): 10 soal tanpa kembar, menghindari soal ronde-ronde sebelumnya
  // (riwayat di perangkat), band mudah → sulit sesuai level. Coba lagi = ronde baru dengan soal lain.
  const status = book?.statuses[skillId];
  const playable = status === 'open' || status === 'passed';
  const round = useMemo(
    () =>
      // Level terkunci/berbayar tidak dibuat soalnya (template berbayar dikirim tanpa isi soal).
      // Mock test (D-072) punya layar sendiri (MockTest); jangan buat ronde 10 soal darinya.
      stableSkill && playable && !isMockSkill(stableSkill)
        ? generateRound(stableSkill, {
            seed: seedBase,
            avoid: (avoidUsed.current =
              resume?.avoid ?? loadProgress(childId).recentItems?.[stableSkill.id] ?? []),
          })
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stableSkill, seedBase, childId, playable],
  );
  const item: Item | undefined = round?.[index];

  // Lanjutkan: kembalikan nomor soal & jawaban yang sudah diberikan (sekali, saat ronde tersimpan ditemukan).
  const restored = useRef(false);
  useEffect(() => {
    if (!resume || !round || restored.current) return;
    restored.current = true;
    // Lanjut dari soal pertama yang belum dijawab.
    const done = Math.min(resume.history.length, round.length - 1);
    setIndex(done);
    setHistory(resume.history.slice(0, done));
  }, [resume, round]);

  // Simpan posisi ronde yang sedang berjalan (D-073) supaya bisa dilanjutkan setelah keluar/ganti halaman.
  useEffect(() => {
    if (!round || !stableSkill || phase.name === 'done' || history.length === 0) return;
    if (resume && !restored.current) return;
    updateProgress(childId, (p) => ({
      ...p,
      inProgress: {
        skillId: stableSkill.id,
        version: stableSkill.version,
        seedBase,
        avoid: avoidUsed.current,
        index: history.length,
        history,
        ts: Date.now(),
      },
    }));
  }, [round, stableSkill, index, history, phase.name, seedBase, childId, resume]);

  const paid = status === 'paid';
  const locked = status === 'locked' || paid;
  const basic = skill?.tier === 'basic';
  const access = data?.access ?? FREE_ACCESS;
  useEffect(() => {
    if (paid) speak(premiumSay(access));
    else if (locked) speakLine(RESULT_KEYS.locked, t('play.quiz.locked', { pass: PASS_SCORE }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, paid]);
  // Basic: siapkan suara Momo untuk soal berikutnya agar langsung terdengar.
  const upcoming = round?.[index + 1];
  useEffect(() => {
    if (upcoming && !locked && (basic || isListeningItem(upcoming))) prefetchItemVoice(upcoming);
  }, [basic, upcoming, locked]);
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
    return <MomoLoader color={momoColor} failed={catalogFailed} onRetry={retryCatalog} />;
  }
  if (locked && skill) {
    return (
      <main className="kid-screen">
        <Momo own color={momoColor} mood="curious" size={140} />
        {paid ? (
          <PremiumNotice access={access} />
        ) : (
          <p className="kid-alert is-compact" role="note">
            {t('play.quiz.locked', { pass: PASS_SCORE })}
          </p>
        )}
        <Link className="kid-btn" to={links.topic(skill)}>
          {t('play.quiz.backTopic')}
        </Link>
      </main>
    );
  }
  // Mock test (D-072): PracticeRoute akan menampilkan MockTest; jangan sempat tampil "tidak ditemukan".
  if (skill && isMockSkill(skill)) {
    return <MomoLoader color={momoColor} />;
  }
  if (!skill || !item || !book) {
    return (
      <main className="kid-screen">
        <Momo own color={momoColor} mood="curious" size={140} />
        <p className="kid-note">{t('play.quiz.notFound')}</p>
        <Link className="kid-btn" to="/play">
          {t('play.quiz.back')}
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
      inProgress: undefined,
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
    // Suara Momo: skor, lalu hasil (lulus / coba lagi). Waktu tetap terlihat di layar.
    speakLine(scoreKey(score), t('play.quiz.score', { score }), {
      onEnd: () =>
        passed
          ? speakLine(
              book.next ? RESULT_KEYS.passed : RESULT_KEYS.passedLast,
              t(book.next ? 'play.quiz.passed' : 'play.quiz.passedLast'),
            )
          : speakLine(
              RESULT_KEYS.retry,
              t('play.quiz.failed', { need: correctNeeded(), pass: PASS_SCORE }),
            ),
    });
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
    // Respons jawaban dengan suara Momo; pembahasan dibacakan hanya di Basic (anak belum membaca).
    if (r.correct) {
      speakLine(RIGHT_KEYS[(seedBase + index) % RIGHT_KEYS.length]!, message);
    } else {
      speakLine(WRONG_KEYS[(seedBase + index) % WRONG_KEYS.length]!, t('play.quiz.wrong'), {
        onEnd: basic ? () => speakItem(item, item.reteach.say, 'reteach') : undefined,
      });
    }
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
          <Momo own color={momoColor} mood={passed ? 'proud' : 'curious'} size={130} />
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
            <Momo own color={momoColor} mood="curious" size={90} />
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
                onClick={() => {
                  // Berhenti dengan sengaja: ronde dibuang (tidak dilanjutkan), sesuai pesan dialog.
                  updateProgress(childId, (p) => ({ ...p, inProgress: undefined }));
                  navigate(links.topic(skill));
                }}
              >
                {t('play.quiz.quitLeave')}
              </button>
            </div>
          </div>
        </div>
      )}
      {gate ? (
        <section className="start-gate">
          <Momo own color={momoColor} mood="happy" size={130} />
          <h2>{t('play.start.title')}</h2>
          <p className="kid-note">{t('play.start.say')}</p>
          <button
            type="button"
            className="kid-btn"
            autoFocus
            onClick={() => {
              unlockNow();
              setGate(false);
            }}
          >
            <PlayIcon />
            {t('play.start.button')}
          </button>
        </section>
      ) : (
        <ItemPlayer
          key={`${seedBase}-${index}`}
          item={item}
          tier={skill.tier}
          onAnswer={onAnswer}
          disabled={phase.name !== 'question'}
          showAnswer={phase.name === 'feedback' && !phase.correct}
        />
      )}
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
      <Momo own color={color} mood={mood} size={90} />
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
  const { token = '' } = useParams();
  const [run, setRun] = useState(0);
  const { data } = useCatalog();
  const links = useLinks(data);
  const skill = data?.skills.find((s) => s.id === links?.skillOf(token));
  // Mock Test olimpiade (D-072): 25 soal gabungan semua materi, dinilai gaya EMC.
  if (skill && isMockSkill(skill))
    return (
      <MockTest
        key={`${token}-${run}`}
        mock={skill}
        momoColor={momoColor}
        onRestart={() => setRun((r) => r + 1)}
      />
    );
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
