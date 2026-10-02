import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { durationWords, formatClock, type AnswerValue, type Color } from '@little-coder/engine';
import { ApiError } from '../../api/client';
import { useApiCall, useFetch } from '../../auth/useApi';
import { Momo } from '../../components/Momo';
import { t } from '../../i18n';
import { BackIcon, Crown } from '../icons';
import { ItemPlayer, SpeakButton } from '../ItemPlayer';
import { nextUnanswered, phaseAt, toPlayable } from './playable';
import { clockOffset, dayLabel, timeLabel, untilWords, useServerNow } from './time';
import type {
  ContestDetail,
  ContestInfo,
  ContestList,
  ContestListItem,
  ContestResults,
  ContestSession,
  ResultRow,
} from './types';
import './contest.css';

/** Lomba live untuk anak (D-042): daftar lomba, mengerjakan, dan hasil. Butuh koneksi (jam server). */

function Head({ title, sub, back = '/play' }: { title: string; sub?: string; back?: string }) {
  return (
    <header className="practice-head">
      <Link
        to={back}
        className="kid-link"
        aria-label={back === '/play' ? t('contest.home') : t('contest.back')}
      >
        <BackIcon />
      </Link>
      <div className="practice-title">
        <strong>{title}</strong>
        {sub && <span>{sub}</span>}
      </div>
      <span />
    </header>
  );
}

function Say({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`kid-say ${className}`}>
      <SpeakButton text={text} />
      <p>{text}</p>
    </div>
  );
}

export const whenText = (c: Pick<ContestInfo, 'startsAt' | 'endsAt'>) =>
  t('contest.when', {
    day: dayLabel(c.startsAt),
    start: timeLabel(c.startsAt),
    end: timeLabel(c.endsAt),
  });

/** Ikon bendera lomba (SVG, tanpa emoji). */
export function FlagIcon({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <path d="M12 6v38" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M12 8h24l-5 8 5 8H12z"
        fill="#f7c948"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
      <circle cx="24" cy="26" r="16" fill="#fff" stroke="currentColor" strokeWidth="4" />
      <path d="M24 17v9l6 4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M19 5h10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

// ------------------------------------------------------------------ daftar lomba

export function ContestHome({ momoColor }: { momoColor: Color }) {
  const list = useFetch<ContestList>('child', '/contests');
  const offset = useMemo(() => (list.data ? clockOffset(list.data.now) : undefined), [list.data]);
  const now = useServerNow(offset, 15_000);
  const groups = useMemo(() => {
    const out = {
      live: [] as ContestListItem[],
      upcoming: [] as ContestListItem[],
      ended: [] as ContestListItem[],
    };
    for (const c of list.data?.contests ?? []) out[phaseAt(c, now)].push(c);
    out.ended.reverse();
    return out;
  }, [list.data, now]);

  return (
    <main className="library contest-page">
      <Head title={t('contest.title')} sub={t('contest.sub')} />
      <Say text={t('contest.intro')} className="contest-intro" />
      {!list.data ? (
        <section className="contest-empty">
          <Momo color={momoColor} mood={list.error ? 'curious' : 'idle'} size={120} />
          <p className="kid-note">{list.error ? t('contest.offline') : t('contest.loading')}</p>
          {list.error !== undefined && (
            <button type="button" className="kid-btn" onClick={list.reload}>
              {t('contest.retry')}
            </button>
          )}
        </section>
      ) : list.data.contests.length === 0 ? (
        <section className="contest-empty">
          <Momo color={momoColor} mood="happy" size={120} />
          <p className="kid-note">{t('contest.empty')}</p>
        </section>
      ) : (
        (['live', 'upcoming', 'ended'] as const).map(
          (phase) =>
            groups[phase].length > 0 && (
              <section key={phase} className="contest-section" aria-labelledby={`cs-${phase}`}>
                <h2 id={`cs-${phase}`}>{t(`contest.section.${phase}`)}</h2>
                <ul className="contest-list">
                  {groups[phase].map((c) => (
                    <li key={c.id}>
                      <ContestRowCard c={c} phase={phase} now={now} />
                    </li>
                  ))}
                </ul>
              </section>
            ),
        )
      )}
    </main>
  );
}

function actionLabel(c: ContestListItem, phase: ContestInfo['phase'], now: number) {
  if (phase === 'ended') return t('contest.winners');
  if (phase === 'upcoming')
    return t('contest.startsIn', { time: untilWords(Date.parse(c.startsAt) - now) });
  if (c.me.status === 'active') return t('contest.continue');
  if (c.me.status === 'done') return t('contest.waiting');
  return t('contest.join');
}

function ContestRowCard({
  c,
  phase,
  now,
}: {
  c: ContestListItem;
  phase: ContestInfo['phase'];
  now: number;
}) {
  const action = actionLabel(c, phase, now);
  return (
    <Link to={`/play/lomba/${c.id}`} className={`contest-card is-${phase}`}>
      <span className="contest-card-icon">
        <FlagIcon size={40} />
      </span>
      <span className="contest-card-body">
        <span className={`contest-chip is-${phase}`}>{t(`contest.phase.${phase}`)}</span>
        <strong>{c.title}</strong>
        {c.book && <span className="contest-card-book">{c.book}</span>}
        <span className="contest-card-when">{whenText(c)}</span>
        <span className="contest-card-meta">
          {t('contest.questions', { n: c.questionCount })} ·{' '}
          {t('contest.minutes', { n: c.durationMinutes })}
          {c.me.status === 'done' && <> · {t('contest.doneBadge')}</>}
        </span>
      </span>
      <span className="contest-card-action">{action}</span>
    </Link>
  );
}

// ------------------------------------------------------------------ halaman satu lomba

type View =
  | { kind: 'loading' }
  | { kind: 'error'; notFound: boolean }
  | { kind: 'info'; detail: ContestDetail }
  | { kind: 'starting'; detail: ContestDetail }
  | { kind: 'play'; detail: ContestDetail; session: ContestSession }
  | { kind: 'thanks'; detail: ContestDetail; answered: number }
  | { kind: 'results'; results: ContestResults };

export function ContestPlay({ momoColor }: { momoColor: Color }) {
  const { id = '' } = useParams();
  const call = useApiCall('child');
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [offset, setOffset] = useState<number>();
  const base = `/contests/${encodeURIComponent(id)}`;
  const reload = useRef<() => Promise<void>>(async () => undefined);

  const showResults = useCallback(
    async (detail: ContestDetail) => {
      try {
        const results = await call<ContestResults>(`${base}/results`);
        setOffset(clockOffset(results.now));
        setView({ kind: 'results', results });
      } catch {
        setView({ kind: 'thanks', detail, answered: detail.me.answered });
      }
    },
    [base, call],
  );

  const start = useCallback(
    async (detail: ContestDetail) => {
      setView({ kind: 'starting', detail });
      try {
        const session = await call<ContestSession>(`${base}/start`, { method: 'POST' });
        setOffset(clockOffset(session.now));
        if (session.me.status === 'done')
          setView({ kind: 'thanks', detail, answered: session.answered.length });
        else setView({ kind: 'play', detail, session });
      } catch (err) {
        // 403 = jadwal berubah / lomba sudah ditutup menurut jam server → muat ulang statusnya.
        if (err instanceof ApiError && err.status === 403) await reload.current();
        else setView({ kind: 'info', detail });
      }
    },
    [base, call],
  );

  const load = useCallback(async () => {
    try {
      const detail = await call<ContestDetail>(base);
      setOffset(clockOffset(detail.now));
      if (detail.contest.phase === 'ended') return showResults(detail);
      if (detail.me.status === 'active') return start(detail);
      if (detail.me.status === 'done')
        return setView({ kind: 'thanks', detail, answered: detail.me.answered });
      setView({ kind: 'info', detail });
    } catch (err) {
      setView({ kind: 'error', notFound: err instanceof ApiError && err.status === 404 });
    }
  }, [base, call, showResults, start]);
  reload.current = load;

  useEffect(() => {
    void load();
  }, [load]);

  const contest = 'detail' in view ? view.detail.contest : undefined;
  const title =
    contest?.title ?? (view.kind === 'results' ? view.results.contest.title : t('contest.title'));

  return (
    <main className="library contest-page">
      <Head title={title} sub={contest?.book ?? undefined} back="/play/lomba" />
      {view.kind === 'loading' || view.kind === 'starting' ? (
        <section className="contest-empty">
          <Momo color={momoColor} mood="idle" size={120} />
          <p className="kid-note">
            {view.kind === 'starting' ? t('contest.starting') : t('contest.loading')}
          </p>
        </section>
      ) : view.kind === 'error' ? (
        <section className="contest-empty">
          <Momo color={momoColor} mood="curious" size={120} />
          <p className="kid-note">{view.notFound ? t('contest.notFound') : t('contest.offline')}</p>
          {!view.notFound && (
            <button type="button" className="kid-btn" onClick={() => void load()}>
              {t('contest.retry')}
            </button>
          )}
        </section>
      ) : view.kind === 'info' ? (
        <InfoScreen
          detail={view.detail}
          offset={offset}
          momoColor={momoColor}
          onStart={() => void start(view.detail)}
          onReload={() => void load()}
        />
      ) : view.kind === 'play' ? (
        <ContestRun
          base={base}
          session={view.session}
          offset={offset}
          onDone={(answered) => setView({ kind: 'thanks', detail: view.detail, answered })}
        />
      ) : view.kind === 'thanks' ? (
        <ThanksScreen
          detail={view.detail}
          answered={view.answered}
          offset={offset}
          momoColor={momoColor}
          onResults={() => void showResults(view.detail)}
        />
      ) : (
        <ResultsBoard results={view.results} momoColor={momoColor} />
      )}
    </main>
  );
}

function InfoScreen({
  detail,
  offset,
  momoColor,
  onStart,
  onReload,
}: {
  detail: ContestDetail;
  offset: number | undefined;
  momoColor: Color;
  onStart: () => void;
  onReload: () => void;
}) {
  const c = detail.contest;
  const now = useServerNow(offset);
  const phase = phaseAt(c, now);
  const reloaded = useRef(false);
  useEffect(() => {
    // Jam server menunjukkan lomba sudah dibuka → muat ulang status dari server (sekali).
    if (phase !== c.phase && !reloaded.current) {
      reloaded.current = true;
      onReload();
    }
  }, [phase, c.phase, onReload]);

  if (phase === 'upcoming') {
    const say = t('contest.upcoming.say', {
      day: dayLabel(c.startsAt),
      time: timeLabel(c.startsAt),
    });
    return (
      <section className="contest-rules">
        <Momo color={momoColor} mood="happy" size={120} />
        <h2>{t('contest.upcoming.title')}</h2>
        <Say text={say} />
        <p className="contest-count" aria-live="off">
          <span>{t('contest.upcoming.count')}</span>
          <strong>{untilWords(Date.parse(c.startsAt) - now)}</strong>
        </p>
        <p className="kid-note">{whenText(c)}</p>
      </section>
    );
  }
  const minutes = Math.max(
    1,
    Math.round(Math.min(c.durationMinutes * 60_000, Date.parse(c.endsAt) - now) / 60_000),
  );
  const rules = [
    t('contest.rules.count', { n: c.questionCount }),
    t('contest.rules.time', { time: durationWords(minutes * 60_000) }),
    t('contest.rules.once'),
    t('contest.rules.answer'),
    t('contest.rules.skip'),
    t('contest.rules.result', { time: timeLabel(c.endsAt) }),
    t('contest.rules.calm'),
  ];
  return (
    <section className="contest-rules">
      <Momo color={momoColor} mood="happy" size={120} />
      <h2>{t('contest.rules.title')}</h2>
      {c.description && <p className="kid-note">{c.description}</p>}
      <Say text={rules.join(' ')} />
      <ul className="contest-rule-list">
        {rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <button type="button" className="kid-btn big-play" onClick={onStart}>
        {t('contest.rules.start')}
      </button>
    </section>
  );
}

function ContestRun({
  base,
  session,
  offset,
  onDone,
}: {
  base: string;
  session: ContestSession;
  offset: number | undefined;
  onDone: (answered: number) => void;
}) {
  const call = useApiCall('child');
  const total = session.total;
  const [answered, setAnswered] = useState(() => new Set(session.answered));
  const [index, setIndex] = useState(() => nextUnanswered(total, new Set(session.answered), -1));
  const [sending, setSending] = useState(false);
  const [trouble, setTrouble] = useState<{ index: number; value: AnswerValue }>();
  const [asking, setAsking] = useState(false);
  const finished = useRef(false);
  const now = useServerNow(offset, 500);
  const remaining = Date.parse(session.deadlineAt) - now;
  const item = useMemo(
    () =>
      index >= 0 && session.items[index] ? toPlayable(session.items[index], index) : undefined,
    [index, session.items],
  );

  const finish = useCallback(
    async (count: number) => {
      if (finished.current) return;
      finished.current = true;
      try {
        await call(`${base}/submit`, { method: 'POST' });
      } catch {
        /* waktu tetap dihitung server; hasil tetap aman */
      }
      onDone(count);
    },
    [base, call, onDone],
  );

  // Waktu habis (jam server) → kirim otomatis.
  useEffect(() => {
    if (remaining <= 0) void finish(answered.size);
  }, [remaining, answered.size, finish]);

  // Catat pindah tab/aplikasi (informasi untuk admin; tidak menghentikan lomba).
  useEffect(() => {
    const onVis = () => {
      void call(`${base}/event`, {
        method: 'POST',
        body: { type: document.visibilityState === 'hidden' ? 'hidden' : 'visible' },
      }).catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [base, call]);

  const advance = (done: Set<number>, from: number) => {
    const next = nextUnanswered(total, done, from);
    if (next < 0) void finish(done.size);
    else setIndex(next);
  };

  const send = async (i: number, value: AnswerValue) => {
    setSending(true);
    setTrouble(undefined);
    try {
      await call(`${base}/answer`, { method: 'POST', body: { index: i, value } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setSending(false);
        return void finish(answered.size);
      }
      if (!(err instanceof ApiError && err.status === 409)) {
        setSending(false);
        return setTrouble({ index: i, value });
      }
    }
    setSending(false);
    const done = new Set(answered).add(i);
    setAnswered(done);
    advance(done, i);
  };

  const left = total - answered.size;
  return (
    <section className="contest-run">
      <div className="contest-bar">
        <div
          className="quiz-dots"
          role="img"
          aria-label={t('contest.answeredCount', { n: answered.size, total })}
        >
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`quiz-dot${answered.has(i) ? ' is-done' : i === index ? ' is-current' : ''}`}
            />
          ))}
        </div>
        <div
          className={`contest-clock${remaining < 60_000 ? ' is-soon' : ''}`}
          role="timer"
          aria-label={t('contest.timeLeft')}
        >
          <ClockIcon />
          <span>{formatClock(Math.max(0, remaining))}</span>
        </div>
      </div>
      <p className="contest-progress">{t('contest.progress', { n: index + 1, total })}</p>

      {item && (
        <ItemPlayer
          key={index}
          item={item}
          tier={session.items[index]?.tier}
          disabled={sending || trouble !== undefined}
          onSubmitValue={(v) => void send(index, v)}
        />
      )}

      {sending && (
        <p className="kid-note" role="status">
          {t('contest.saving')}
        </p>
      )}
      {trouble && (
        <div className="contest-trouble" role="status">
          <p>{t('contest.sendTrouble')}</p>
          <button
            type="button"
            className="kid-btn"
            onClick={() => void send(trouble.index, trouble.value)}
          >
            {t('contest.retrySend')}
          </button>
        </div>
      )}

      <div className="kid-row contest-actions">
        {left > 1 && (
          <button
            type="button"
            className="kid-btn secondary"
            disabled={sending || trouble !== undefined}
            onClick={() => advance(answered, index)}
          >
            {t('contest.skip')}
          </button>
        )}
        <button
          type="button"
          className="kid-btn secondary"
          disabled={sending}
          onClick={() => setAsking(true)}
        >
          {t('contest.finish')}
        </button>
      </div>

      {asking && (
        <div className="quit-backdrop">
          <div className="quit-dialog" role="dialog" aria-modal="true" aria-labelledby="cf-title">
            <h2 id="cf-title">{t('contest.finish.title')}</h2>
            <Say text={t('contest.finish.text', { n: left })} />
            <div className="kid-row">
              <button type="button" className="kid-btn" onClick={() => setAsking(false)} autoFocus>
                {t('contest.finish.no')}
              </button>
              <button
                type="button"
                className="kid-btn secondary"
                onClick={() => {
                  setAsking(false);
                  void finish(answered.size);
                }}
              >
                {t('contest.finish.yes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ThanksScreen({
  detail,
  answered,
  offset,
  momoColor,
  onResults,
}: {
  detail: ContestDetail;
  answered: number;
  offset: number | undefined;
  momoColor: Color;
  onResults: () => void;
}) {
  const c = detail.contest;
  const now = useServerNow(offset);
  const ended = phaseAt(c, now) === 'ended';
  const effort =
    answered > 0 ? t('contest.thanks.effort', { n: answered }) : t('contest.thanks.effortNone');
  const when = t('contest.thanks.when', { day: dayLabel(c.endsAt), time: timeLabel(c.endsAt) });
  const say = `${t('contest.thanks.title')} ${effort} ${ended ? '' : when}`.trim();
  return (
    <section className="contest-rules contest-thanks" aria-live="polite">
      <Momo color={momoColor} mood="proud" size={140} />
      <h2>{t('contest.thanks.title')}</h2>
      <Say text={say} />
      {ended ? (
        <button type="button" className="kid-btn big-play" onClick={onResults}>
          {t('contest.winners')}
        </button>
      ) : (
        <>
          <p className="contest-count">
            <strong>{when}</strong>
          </p>
          <p className="kid-note">{t('contest.thanks.wait')}</p>
          <Link className="kid-btn" to="/play/lomba">
            {t('contest.back')}
          </Link>
        </>
      )}
    </section>
  );
}

function ResultsBoard({ results, momoColor }: { results: ContestResults; momoColor: Color }) {
  const { winners, me, participants, contest } = results;
  const podium = winners.slice(0, 3);
  const list = winners.slice(3);
  const meOutside = me && !winners.some((w) => w.me) ? me : null;
  const say = me
    ? t('contest.results.meSay', { position: me.position, of: participants, correct: me.correct })
    : t('contest.results.say', { title: contest.title });
  return (
    <section className="contest-results" aria-labelledby="cr-title">
      <header className="contest-results-head">
        <h2 id="cr-title">{t('contest.results.title')}</h2>
        <small>{t('contest.results.sub')}</small>
      </header>
      <Say text={say} className="contest-intro" />
      {winners.length === 0 ? (
        <section className="contest-empty">
          <Momo color={momoColor} mood="happy" size={120} />
          <p className="kid-note">{t('contest.results.empty')}</p>
        </section>
      ) : (
        <>
          <ol className="podium" aria-label={t('contest.results.title')}>
            {[podium[1], podium[0], podium[2]].map((r, i) =>
              !r ? (
                <li key={`empty-${i}`} className={`podium-spot is-empty slot-${i}`} aria-hidden />
              ) : (
                <li
                  key={`${r.position}-${r.nickname}`}
                  className={`podium-spot place-${Math.min(r.position, 3)} slot-${i}${r.me ? ' is-me' : ''}`}
                >
                  {r.position === 1 && <Crown size={44} />}
                  <Momo color={r.momoColor as Color} mood="proud" size={i === 1 ? 104 : 84} />
                  <strong className="podium-name">
                    {r.me ? `${r.nickname} (${t('contest.you')})` : r.nickname}
                  </strong>
                  <span className="podium-points">
                    {t('contest.results.correct', { correct: r.correct, total: r.total })}
                  </span>
                  <span className="podium-block">{r.position}</span>
                </li>
              ),
            )}
          </ol>
          {list.length > 0 && (
            <ol className="contest-rank">
              {list.map((r) => (
                <ResultLine key={`${r.position}-${r.nickname}`} r={r} />
              ))}
            </ol>
          )}
        </>
      )}
      {meOutside && (
        <ol className="contest-rank is-mine" aria-label={t('contest.you')}>
          <ResultLine r={meOutside} />
        </ol>
      )}
      {!me && winners.length > 0 && <p className="kid-note">{t('contest.results.notMine')}</p>}
      <p className="board-rule">{t('contest.results.rule')}</p>
    </section>
  );
}

function ResultLine({ r }: { r: ResultRow }) {
  return (
    <li className={`contest-rank-row${r.me ? ' is-me' : ''}`}>
      <span className="contest-rank-pos">{r.position}</span>
      <Momo color={r.momoColor as Color} mood="happy" size={48} />
      <strong>{r.me ? `${r.nickname} (${t('contest.you')})` : r.nickname}</strong>
      <span>{t('contest.results.correct', { correct: r.correct, total: r.total })}</span>
      <span className="contest-rank-time">
        {t('contest.results.time', { time: formatClock(r.timeMs) })}
      </span>
    </li>
  );
}
