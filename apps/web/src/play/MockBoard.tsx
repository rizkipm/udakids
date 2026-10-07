import { durationWords, formatClock, type Color } from '@little-coder/engine';
import type { MockBoardData, MockBoardRow } from '../api/types';
import { useFetch } from '../auth/useApi';
import { Momo } from '../components/Momo';
import { t } from '../i18n';
import { formatStamp } from '../ui/ui';
import { SpeakButton } from './ItemPlayer';
import { Crown, StatIcon } from './icons';

const pts = (n: number) => n.toLocaleString('id-ID');

/**
 * Papan peringkat satu Mock Test olimpiade (D-072): percobaan terbaik tiap anak, poin tertinggi → waktu
 * tercepat. Anak lain hanya terlihat nama panggilan + warna Momo. `compact` = 10 besar (halaman topik).
 */
export function MockBoard({
  skillId,
  momoColor,
  compact = false,
}: {
  skillId: string;
  momoColor: Color;
  compact?: boolean;
}) {
  const board = useFetch<MockBoardData>('child', `/leaderboard/mock/${skillId}?pageSize=1`);
  const data = board.data?.skillId === skillId ? board.data : undefined;
  if (!data) {
    return (
      <section className="mock-board is-empty">
        <p className="kid-note">{board.error ? t('rank.offline') : t('rank.loading')}</p>
      </section>
    );
  }
  const top = compact ? data.top.slice(0, 10) : data.top;
  const podium = compact ? [] : top.slice(0, 3);
  const list = compact ? top : top.slice(3);
  const meOutside = data.me && !top.some((r) => r.isMe) ? data.me : null;
  const say = data.me
    ? t('rank.mock.mySay', {
        position: data.me.position,
        of: data.total,
        points: pts(data.me.points),
        time: durationWords(data.me.timeMs),
      })
    : t('rank.mock.notYet');

  return (
    <section
      className={`mock-board${compact ? ' is-compact' : ''}`}
      aria-labelledby={`mb-${skillId}`}
    >
      <header className="mock-board-head">
        <div>
          <h3 id={`mb-${skillId}`}>
            {compact ? t('rank.mock.boardHere') : `${t('rank.mode.mock')} · ${data.book}`}
          </h3>
          <small>
            {t('rank.mock.participants', { n: data.total })} ·{' '}
            <time dateTime={data.updatedAt}>
              {t('rank.announceSub', { time: formatStamp(data.updatedAt) })}
            </time>
          </small>
        </div>
        <SpeakButton text={say} />
      </header>
      <p className="mock-board-say">{say}</p>

      {data.total === 0 ? (
        <div className="board-empty">
          <Momo own color={momoColor} mood="happy" size={84} />
          <p className="kid-note">{t('rank.mock.empty')}</p>
        </div>
      ) : (
        <>
          {podium.length > 0 && (
            <ol className="podium" aria-label={t('rank.top')}>
              {[podium[1], podium[0], podium[2]].map((r, i) =>
                !r ? (
                  <li key={`empty-${i}`} className={`podium-spot is-empty slot-${i}`} aria-hidden />
                ) : (
                  <li
                    key={`${r.position}-${r.nickname}`}
                    className={`podium-spot place-${Math.min(r.position, 3)} slot-${i}${r.isMe ? ' is-me' : ''}`}
                  >
                    {r.position === 1 && <Crown size={44} />}
                    <Momo
                      color={r.momoColor as Color}
                      look={r.momoLook ?? null}
                      mood="proud"
                      size={i === 1 ? 104 : 84}
                    />
                    <strong className="podium-name">{r.nickname}</strong>
                    <span className="podium-points rank-avg">
                      {t('rank.mock.points', { n: pts(r.points) })}
                    </span>
                    <span className="podium-meta">
                      <span>{t('rank.mock.correct', { n: r.correct, total: r.total })}</span>
                      <span className="rank-time">
                        <StatIcon kind="time" size={16} />
                        {formatClock(r.timeMs)}
                      </span>
                    </span>
                    <span className="podium-block">{r.position}</span>
                  </li>
                ),
              )}
            </ol>
          )}
          {list.length > 0 && (
            <ol className={`rank-list${compact ? ' is-small' : ''}`}>
              {list.map((r) => (
                <MockRow key={`${r.position}-${r.nickname}`} row={r} />
              ))}
            </ol>
          )}
          {meOutside && (
            <div className="rank-mine">
              <h4>{t('rank.posCard')}</h4>
              <ol className="rank-list is-small">
                <MockRow row={meOutside} />
              </ol>
            </div>
          )}
        </>
      )}
      <p className="board-rule">{t('rank.mock.rule', { max: pts(data.maxPoints) })}</p>
    </section>
  );
}

function MockRow({ row }: { row: MockBoardRow }) {
  return (
    <li
      className={`rank-row${row.isMe ? ' is-me' : ''}${row.position <= 3 ? ` place-${row.position}` : ''}`}
      aria-label={t('rank.mock.rowSay', {
        position: row.position,
        name: row.nickname,
        points: pts(row.points),
        correct: row.correct,
        total: row.total,
        time: durationWords(row.timeMs),
      })}
    >
      <span className="rank-pos">{row.position}</span>
      <Momo color={row.momoColor as Color} look={row.momoLook ?? null} mood="happy" size={44} />
      <span className="rank-name">
        <strong>{row.nickname}</strong>
        {row.isMe && <em className="board-me">{t('rank.me')}</em>}
        <small>
          {t('rank.mock.correct', { n: row.correct, total: row.total })} ·{' '}
          {t('rank.mock.score', { n: row.score })} · {t('rank.mock.attempts', { n: row.attempts })}
        </small>
      </span>
      <span className="rank-avg">{t('rank.mock.points', { n: pts(row.points) })}</span>
      <span className="rank-time">
        <StatIcon kind="time" size={18} />
        {formatClock(row.timeMs)}
      </span>
    </li>
  );
}
