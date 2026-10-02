import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  durationWords,
  formatClock,
  passedLevels,
  totalPoints,
  totalTimeMs,
  type Color,
} from '@little-coder/engine';
import type { ChildProfileStats } from '../api/types';
import { useSession } from '../auth/session';
import { useFetch } from '../auth/useApi';
import { Momo } from '../components/Momo';
import { t } from '../i18n';
import { SpeakButton } from './ItemPlayer';
import { useProgress } from './practiceStore';
import { BackIcon, StatIcon, type StatKind } from './icons';

/**
 * Data profil anak (D-022, D-024): total skor, level lulus, dan total waktu dihitung dari perangkat
 * (selalu terbaru, juga offline); peringkat global, level tertinggi, dan riwayat lengkap dari server.
 */
function useProfile() {
  const session = useSession('child')!;
  const progress = useProgress(session.user.id);
  const server = useFetch<ChildProfileStats>('child', '/practice/profile');
  const me = useFetch<{ selfCode?: string | null }>('child', '/auth/me');
  const history =
    server.data?.history.map((h) => ({ ...h, ts: new Date(h.ts).getTime() })) ??
    progress.quizHistory.map((h) => ({ ...h, durationMs: h.durationMs ?? null }));
  return {
    name: session.user.name,
    total: Math.max(totalPoints(progress.quizzes), server.data?.totalPoints ?? 0),
    passed: Math.max(passedLevels(progress.quizzes), server.data?.passedLevels ?? 0),
    played: Math.max(progress.quizHistory.length, server.data?.played ?? 0),
    answered: Math.max(
      progress.quizHistory.reduce((a, h) => a + h.total, 0),
      server.data?.answered ?? 0,
    ),
    timeMs: Math.max(totalTimeMs(progress.quizzes), server.data?.totalTimeMs ?? 0),
    rank: server.data?.rank ?? null,
    highest: server.data?.highest ?? null,
    className: server.data?.className ?? null,
    online: server.data !== undefined,
    /** Kode keluarga milik anak yang daftar sendiri (D-037). */
    selfCode: me.data?.selfCode ?? null,
    history,
  };
}

function rankText(p: ReturnType<typeof useProfile>) {
  if (!p.online) return t('play.profile.rankOffline');
  if (!p.rank) return t('play.profile.rankNone');
  return t('play.profile.rank', { position: p.rank.position, of: p.rank.of });
}

function Stat({
  kind,
  value,
  label,
  to,
}: {
  kind: StatKind;
  value: ReactNode;
  label: ReactNode;
  to?: string;
}) {
  const body = (
    <>
      <StatIcon kind={kind} />
      <span className="profile-value">{value}</span>
      <span className="profile-label">{label}</span>
    </>
  );
  return to ? (
    <Link to={to} className={`profile-stat is-${kind} is-link`}>
      {body}
    </Link>
  ) : (
    <div className={`profile-stat is-${kind}`}>{body}</div>
  );
}

export function PageHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="practice-head">
      <Link to="/play" className="kid-link" aria-label={t('play.quiz.back')}>
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

export function ProfilePage({ momoColor }: { momoColor: Color }) {
  const p = useProfile();
  const say = `${p.name}. ${t('play.profile.total', { score: p.total })}. ${t('play.profile.passed', { n: p.passed })}. ${t('play.profile.answeredSay', { n: p.answered })}. ${t('play.profile.timeSay', { time: durationWords(p.timeMs) })}. ${rankText(p)}.`;
  return (
    <main className="library profile-page">
      <PageHead title={t('play.profile.title')} />

      <section className={`profile-hero momo-${momoColor}`}>
        <div className="profile-avatar">
          <Momo color={momoColor} mood="proud" size={132} />
        </div>
        <div className="profile-id">
          <h1>{p.name}</h1>
          <p>
            {p.className
              ? t('play.profile.classOf', { name: p.className })
              : t('play.profile.noClass')}
          </p>
          {p.selfCode && (
            <p className="profile-code">{t('play.profile.selfCode', { code: p.selfCode })}</p>
          )}
          <div className="profile-actions">
            <SpeakButton text={say} />
            <Link className="kid-btn" to="/play/peringkat">
              {t('play.board.open')}
            </Link>
          </div>
        </div>
      </section>

      <div className="profile-stats profile-grid">
        <Stat kind="points" value={p.total} label={t('play.profile.totalLabel')} />
        <Stat kind="passed" value={p.passed} label={t('play.profile.passedLabel')} />
        <Stat
          kind="highest"
          value={p.highest ? t('play.library.level', { n: p.highest.level }) : '–'}
          label={p.highest ? p.highest.book : t('play.profile.highestLabel')}
        />
        <Stat kind="time" value={formatClock(p.timeMs)} label={t('play.profile.timeLabel')} />
        <Stat kind="played" value={p.played} label={t('play.profile.playedLabel')} />
        <Stat
          kind="answered"
          value={p.answered.toLocaleString('id-ID')}
          label={t('play.profile.answeredLabel')}
        />
        <Stat
          kind="rank"
          value={p.rank && p.online ? `#${p.rank.position}` : '–'}
          label={rankText(p)}
          to="/play/peringkat"
        />
      </div>

      <section className="history">
        <h2>{t('play.profile.historyTitle')}</h2>
        {p.history.length === 0 ? (
          <p className="kid-note">{t('play.profile.empty')}</p>
        ) : (
          <ol className="history-list">
            {p.history.map((h) => (
              <li key={h.id} className={`history-row ${h.passed ? 'is-passed' : 'is-failed'}`}>
                <span className="history-score">{h.score}</span>
                <span className="history-main">
                  <strong>{h.title}</strong>
                  <small>
                    {new Date(h.ts).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}{' '}
                    · {t('play.quiz.summary', { correct: h.correct, total: h.total })}
                    {h.durationMs != null && (
                      <>
                        {' '}
                        · <span className="history-time">{formatClock(h.durationMs)}</span>
                      </>
                    )}
                  </small>
                </span>
                <span className="history-badge">
                  {h.passed ? t('play.library.passed') : t('play.profile.failed')}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
