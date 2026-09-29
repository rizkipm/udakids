import { durationWords, formatClock, type Color } from '@little-coder/engine';
import type { Leaderboard, LeaderboardRow } from '../api/types';
import { useFetch } from '../auth/useApi';
import { Momo } from '../components/Momo';
import { t } from '../i18n';
import { SpeakButton } from './ItemPlayer';
import { Crown, StatIcon } from './icons';
import { PageHead } from './Profile';

/**
 * Papan peringkat global (D-024): skor total → level lulus → waktu tercepat. Anak lain hanya terlihat
 * nama panggilan + warna Momo. Butuh koneksi (data dari server).
 */
export function LeaderboardPage({ momoColor }: { momoColor: Color }) {
  const board = useFetch<Leaderboard>('child', '/practice/leaderboard');
  const data = board.data;
  const podium = data?.rows.slice(0, 3) ?? [];
  const rest = data?.rows.slice(3) ?? [];
  const meOutside = data?.me && !data.rows.some((r) => r.me) ? data.me : null;
  const say = data?.me
    ? t('play.board.mySay', { position: data.me.position, of: data.total, score: data.me.points })
    : t('play.board.intro');

  return (
    <main className="library board-page">
      <PageHead title={t('play.board.title')} sub={t('play.board.sub')} />

      <div className="kid-say board-intro">
        <SpeakButton text={say} />
        <p>{say}</p>
      </div>

      {!data ? (
        <section className="board-empty">
          <Momo color={momoColor} mood={board.error ? 'curious' : 'idle'} size={120} />
          <p className="kid-note">
            {board.error ? t('play.board.offline') : t('play.library.loading')}
          </p>
        </section>
      ) : data.rows.length === 0 ? (
        <section className="board-empty">
          <Momo color={momoColor} mood="happy" size={120} />
          <p className="kid-note">{t('play.board.empty')}</p>
        </section>
      ) : (
        <>
          <ol className="podium" aria-label={t('play.board.top')}>
            {[podium[1], podium[0], podium[2]].map((r, i) =>
              !r ? (
                <li key={`empty-${i}`} className={`podium-spot is-empty slot-${i}`} aria-hidden />
              ) : (
                <li
                  key={`${r.position}-${r.nickname}`}
                  className={`podium-spot place-${r.position <= 3 ? r.position : 3} slot-${i}${r.me ? ' is-me' : ''}`}
                >
                  {r.position === 1 && <Crown size={44} />}
                  <Momo color={r.momoColor as Color} mood="proud" size={i === 1 ? 104 : 84} />
                  <strong className="podium-name">{r.nickname}</strong>
                  <span className="podium-points">
                    <StatIcon kind="points" size={20} /> {r.points}
                  </span>
                  <span className="podium-block">{r.position}</span>
                </li>
              ),
            )}
          </ol>

          <div className="board-table" role="table" aria-label={t('play.board.title')}>
            <div className="board-row board-header" role="row">
              <span role="columnheader">#</span>
              <span role="columnheader">{t('play.board.col.name')}</span>
              <span role="columnheader">{t('play.board.col.points')}</span>
              <span role="columnheader">{t('play.board.col.highest')}</span>
              <span role="columnheader">{t('play.board.col.time')}</span>
            </div>
            {data.rows.map((r) => (
              <Row key={`${r.position}-${r.nickname}`} row={r} />
            ))}
            {meOutside && (
              <>
                <div className="board-gap" aria-hidden>
                  ⋯
                </div>
                <Row row={meOutside} />
              </>
            )}
          </div>
          {rest.length === 0 && podium.length < 3 && (
            <p className="kid-note">{t('play.board.few')}</p>
          )}
          <p className="board-rule">{t('play.board.rule')}</p>
        </>
      )}
    </main>
  );
}

function Row({ row }: { row: LeaderboardRow }) {
  return (
    <div
      className={`board-row${row.me ? ' is-me' : ''}${row.position <= 3 ? ` is-top place-${row.position}` : ''}`}
      role="row"
      aria-label={t('play.board.rowSay', {
        position: row.position,
        name: row.nickname,
        score: row.points,
        time: durationWords(row.timeMs),
      })}
    >
      <span className="board-pos" role="cell">
        {row.position}
      </span>
      <span className="board-name" role="cell">
        <Momo color={row.momoColor as Color} mood="happy" size={44} />
        <span>
          <strong>{row.nickname}</strong>
          {row.me && <em className="board-me">{t('play.board.me')}</em>}
          <small className="board-sub">{t('play.board.passed', { n: row.passed })}</small>
        </span>
      </span>
      <span className="board-points" role="cell">
        <StatIcon kind="points" size={20} />
        {row.points}
      </span>
      <span className="board-highest" role="cell">
        {row.highest ? (
          <>
            <strong>{t('play.library.level', { n: row.highest.level })}</strong>
            <small>{row.highest.book}</small>
          </>
        ) : (
          '–'
        )}
      </span>
      <span className="board-time" role="cell">
        <StatIcon kind="time" size={20} />
        {formatClock(row.timeMs)}
      </span>
    </div>
  );
}
