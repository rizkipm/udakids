import { useEffect, useRef, useState } from 'react';
import {
  LEADERBOARD_TOP,
  durationWords,
  formatAverage,
  formatClock,
  type Color,
} from '@little-coder/engine';
import type {
  Leaderboard,
  LeaderboardDetail,
  LeaderboardMode,
  LeaderboardRow,
  LeaderboardScope,
  LeaderboardScopes,
} from '../api/types';
import { speak } from '../audio/speech';
import { useApiCall, useFetch } from '../auth/useApi';
import { Momo } from '../components/Momo';
import { t } from '../i18n';
import { SpeakButton } from './ItemPlayer';
import { Crown, StatIcon } from './icons';
import { PageHead } from './Profile';

const SCOPE_KEY = 'lc.rank.scope';
const MODE_KEY = 'lc.rank.mode';

function rememberedMode(): LeaderboardMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'total' ? 'total' : 'average';
  } catch {
    return 'average';
  }
}

/** "Kamis, 2 Okt 2026 · 13.38.05" — tanggal, jam, menit, detik (waktu perangkat). */
export function formatUpdated(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${date} · ${time}`;
}

/** Nilai utama sesuai urutan papan: rata-rata "87,50" atau total skor "1.250". */
const metric = (r: { average: number; points: number }, mode: LeaderboardMode) =>
  mode === 'total' ? r.points.toLocaleString('id-ID') : formatAverage(r.average);
/** Waktu sesuai urutan papan: total waktu semua ronde (rata-rata) atau waktu skor terbaik (total skor). */
const timeOf = (r: { timeMs: number; bestTimeMs: number }, mode: LeaderboardMode) =>
  mode === 'total' ? r.bestTimeMs : r.timeMs;
const PAGE_SIZE = 50;

function rememberedScope() {
  try {
    return localStorage.getItem(SCOPE_KEY) ?? 'global';
  } catch {
    return 'global';
  }
}

const scopeLabel = (s: Pick<LeaderboardScope, 'key' | 'title'>) =>
  s.key === 'global' ? t('rank.scope.global') : s.title;

/**
 * Papan peringkat rata-rata (D-042): global + per buku, gaya "papan pengumuman". 25 besar tampil
 * (podium 3 teratas, lalu daftar) dan detailnya bisa dibuka; peserta lainnya berhalaman.
 * Anak lain hanya terlihat nama panggilan + warna Momo. Butuh koneksi (data dari server).
 */
export function LeaderboardPage({ momoColor }: { momoColor: Color }) {
  const scopes = useFetch<LeaderboardScopes>('child', '/leaderboard/scopes');
  const [scope, setScope] = useState(rememberedScope);
  const [mode, setMode] = useState<LeaderboardMode>(rememberedMode);
  const known = scopes.data?.scopes;
  // Lingkup tersimpan yang sudah tidak ada (buku tanpa peserta) → kembali ke global.
  const active = !known || known.some((s) => s.key === scope) ? scope : 'global';
  const board = useFetch<Leaderboard>(
    'child',
    `/leaderboard?scope=${active}&mode=${mode}&pageSize=${PAGE_SIZE}`,
  );
  const call = useApiCall('child');
  const [more, setMore] = useState<{ key: string; page: number; items: LeaderboardRow[] }>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState<LeaderboardRow>();

  const data =
    board.data?.scope === active && (board.data.mode ?? 'average') === mode
      ? board.data
      : undefined;
  const extra = more?.key === `${mode}:${active}` ? more : undefined;
  const restItems = [...(data?.rest.items ?? []), ...(extra?.items ?? [])];
  const boardName = data ? scopeLabel({ key: data.scope, title: data.title }) : '';

  const choose = (s: LeaderboardScope) => {
    speak(scopeLabel(s));
    setScope(s.key);
    try {
      localStorage.setItem(SCOPE_KEY, s.key);
    } catch {
      /* abaikan */
    }
  };

  const chooseMode = (m: LeaderboardMode) => {
    speak(t(m === 'total' ? 'rank.mode.total' : 'rank.mode.average'));
    setMode(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* abaikan */
    }
  };

  const loadMore = async () => {
    if (!data) return;
    const page = (extra?.page ?? 1) + 1;
    setLoadingMore(true);
    try {
      const next = await call<Leaderboard>(
        `/leaderboard?scope=${active}&mode=${mode}&page=${page}&pageSize=${PAGE_SIZE}`,
      );
      setMore({
        key: `${mode}:${active}`,
        page,
        items: [...(extra?.items ?? []), ...next.rest.items],
      });
    } catch {
      /* tetap tampilkan yang sudah ada */
    } finally {
      setLoadingMore(false);
    }
  };

  const say = !data
    ? t('rank.intro')
    : data.me
      ? t(mode === 'total' ? 'rank.mySayTotal' : 'rank.mySay', {
          board: boardName,
          position: data.me.position,
          of: data.total,
          average: formatAverage(data.me.average),
          points: data.me.points.toLocaleString('id-ID'),
        })
      : t('rank.notYet', { board: boardName });

  const podium = data?.top.slice(0, 3) ?? [];
  const list = data?.top.slice(3) ?? [];
  const meOutside = data?.me && data.me.position > LEADERBOARD_TOP ? data.me : null;

  return (
    <main className="library board-page rank-page">
      <PageHead title={t('rank.title')} sub={t(mode === 'total' ? 'rank.subTotal' : 'rank.sub')} />

      <div className="rank-modes" role="group" aria-label={t('rank.mode.label')}>
        {(['average', 'total'] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={`rank-mode${m === mode ? ' is-on' : ''}`}
            aria-pressed={m === mode}
            onClick={() => chooseMode(m)}
          >
            <StatIcon kind={m === 'total' ? 'points' : 'passed'} size={22} />
            <strong>{t(m === 'total' ? 'rank.mode.total' : 'rank.mode.average')}</strong>
          </button>
        ))}
      </div>

      {known && known.length > 1 && (
        <nav className="rank-scopes" aria-label={t('rank.scopes')}>
          {known.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`rank-scope${s.key === active ? ' is-on' : ''}`}
              aria-pressed={s.key === active}
              onClick={() => choose(s)}
            >
              <strong>{scopeLabel(s)}</strong>
            </button>
          ))}
        </nav>
      )}

      <div className="kid-say board-intro">
        <SpeakButton text={say} />
        <p>{say}</p>
      </div>

      {!data ? (
        <section className="board-empty">
          <Momo color={momoColor} mood={board.error ? 'curious' : 'idle'} size={120} />
          <p className="kid-note">{board.error ? t('rank.offline') : t('rank.loading')}</p>
        </section>
      ) : data.total === 0 ? (
        <section className="board-empty">
          <Momo color={momoColor} mood="happy" size={120} />
          <p className="kid-note">{t('rank.empty')}</p>
        </section>
      ) : (
        <>
          <section className="rank-announce" aria-labelledby="rank-announce-title">
            <header className="rank-announce-head">
              <h2 id="rank-announce-title">
                {t('rank.announce')} · {boardName}
              </h2>
              <small>
                <time dateTime={data.updatedAt}>
                  {t('rank.announceSub', { time: formatUpdated(data.updatedAt) })}
                </time>
              </small>
            </header>

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
                    <Momo color={r.momoColor as Color} mood="proud" size={i === 1 ? 104 : 84} />
                    <strong className="podium-name">{r.nickname}</strong>
                    <span className="podium-points rank-avg">{metric(r, mode)}</span>
                    <span className="podium-meta">
                      <span>{t('rank.rounds', { n: r.rounds })}</span>
                      <span className="rank-time">
                        <StatIcon kind="time" size={16} />
                        {formatClock(timeOf(r, mode))}
                      </span>
                    </span>
                    <DetailButton row={r} onOpen={setOpen} compact />
                    <span className="podium-block">{r.position}</span>
                  </li>
                ),
              )}
            </ol>

            {list.length > 0 && (
              <ol className="rank-list" aria-label={t('rank.announce')}>
                {list.map((r) => (
                  <RankRow
                    key={`${r.position}-${r.nickname}`}
                    row={r}
                    mode={mode}
                    onOpen={setOpen}
                  />
                ))}
              </ol>
            )}
            {data.total < 3 && <p className="kid-note">{t('rank.few')}</p>}
          </section>

          {meOutside && (
            <section className="rank-mine" aria-label={t('rank.posCard')}>
              <h2>{t('rank.posCard')}</h2>
              <ol className="rank-list">
                <RankRow row={meOutside} mode={mode} onOpen={setOpen} />
              </ol>
            </section>
          )}

          {data.rest.total > 0 && (
            <section className="rank-others" aria-labelledby="rank-others-title">
              <h2 id="rank-others-title">{t('rank.others')}</h2>
              <p className="rank-others-sub">
                {t('rank.othersSub', { last: LEADERBOARD_TOP + data.rest.total })}
              </p>
              <ol className="rank-list is-small">
                {restItems.map((r) => (
                  <RankRow key={`${r.position}-${r.nickname}`} row={r} mode={mode} />
                ))}
              </ol>
              {restItems.length < data.rest.total && (
                <button
                  type="button"
                  className="kid-btn secondary rank-more"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? t('rank.loadingMore') : t('rank.more')}
                </button>
              )}
            </section>
          )}
          <p className="board-rule">{t(mode === 'total' ? 'rank.ruleTotal' : 'rank.rule')}</p>
        </>
      )}

      {open?.childId && (
        <DetailDialog
          childId={open.childId}
          name={open.nickname}
          scope={active}
          mode={mode}
          onClose={() => setOpen(undefined)}
        />
      )}
    </main>
  );
}

function DetailButton({
  row,
  onOpen,
  compact,
}: {
  row: LeaderboardRow;
  onOpen?: (r: LeaderboardRow) => void;
  compact?: boolean;
}) {
  if (!onOpen || !row.childId) return null;
  return (
    <button
      type="button"
      className={`rank-detail-btn${compact ? ' is-compact' : ''}`}
      aria-label={t('rank.detailOf', { name: row.nickname })}
      onClick={() => onOpen(row)}
    >
      {t('rank.detail')}
    </button>
  );
}

function RankRow({
  row,
  mode,
  onOpen,
}: {
  row: LeaderboardRow;
  mode: LeaderboardMode;
  onOpen?: (r: LeaderboardRow) => void;
}) {
  return (
    <li
      className={`rank-row${row.isMe ? ' is-me' : ''}${row.position <= 3 ? ` place-${row.position}` : ''}`}
      aria-label={t(mode === 'total' ? 'rank.rowSayTotal' : 'rank.rowSay', {
        position: row.position,
        name: row.nickname,
        average: formatAverage(row.average),
        points: row.points.toLocaleString('id-ID'),
        rounds: row.rounds,
        time: durationWords(timeOf(row, mode)),
      })}
    >
      <span className="rank-pos">{row.position}</span>
      <Momo color={row.momoColor as Color} mood="happy" size={44} />
      <span className="rank-name">
        <strong>{row.nickname}</strong>
        {row.isMe && <em className="board-me">{t('rank.me')}</em>}
        <small>
          {t('rank.rounds', { n: row.rounds })} · {t('rank.passed', { n: row.passedLevels })}
        </small>
      </span>
      <span className="rank-avg">{metric(row, mode)}</span>
      <span className="rank-time">
        <StatIcon kind="time" size={18} />
        {formatClock(timeOf(row, mode))}
      </span>
      <DetailButton row={row} onOpen={onOpen} />
    </li>
  );
}

function DetailDialog({
  childId,
  name,
  scope,
  mode,
  onClose,
}: {
  childId: string;
  name: string;
  scope: string;
  mode: LeaderboardMode;
  onClose: () => void;
}) {
  const detail = useFetch<LeaderboardDetail>(
    'child',
    `/leaderboard/detail/${childId}?scope=${scope}&mode=${mode}`,
  );
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeFn = useRef(onClose);
  closeFn.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFn.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      before?.focus?.();
    };
  }, []);

  const d = detail.data;
  const say = d
    ? t('rank.detail.say', {
        name: d.nickname,
        position: d.position,
        of: d.participants,
        average: formatAverage(d.average),
        points: d.points.toLocaleString('id-ID'),
        rounds: d.rounds,
      })
    : '';
  const byBook = new Map<string, LeaderboardDetail['topics']>();
  for (const topic of d?.topics ?? []) {
    byBook.set(topic.bookKey, [...(byBook.get(topic.bookKey) ?? []), topic]);
  }

  return (
    <div
      className="quit-backdrop rank-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="rank-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rank-detail-title"
      >
        <header className="rank-dialog-head">
          {d && <Momo color={d.momoColor as Color} mood="proud" size={72} />}
          <div>
            <h2 id="rank-detail-title">{t('rank.detail.title', { name: d?.nickname ?? name })}</h2>
            {d && (
              <p className="rank-dialog-sum">
                <span className="rank-pos">{d.position}</span>
                <span className="rank-avg">{metric(d, mode)}</span>
                <span>{t('rank.rounds', { n: d.rounds })}</span>
                <span className="rank-time">
                  <StatIcon kind="time" size={18} />
                  {formatClock(timeOf(d, mode))}
                </span>
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="kid-btn secondary rank-close"
            onClick={onClose}
          >
            {t('rank.close')}
          </button>
        </header>

        {!d ? (
          <p className="kid-note">
            {detail.error ? t('rank.detail.error') : t('rank.detail.loading')}
          </p>
        ) : (
          <div className="rank-dialog-body">
            <div className="kid-say">
              <SpeakButton text={say} />
              <p>{say}</p>
            </div>

            <h3>{t('rank.detail.books')}</h3>
            <div className="rank-table-wrap">
              <table className="rank-table">
                <thead>
                  <tr>
                    <th scope="col">{t('rank.detail.book')}</th>
                    <th scope="col">{t('rank.col.average')}</th>
                    <th scope="col">{t('rank.col.points')}</th>
                    <th scope="col">{t('rank.col.rounds')}</th>
                    <th scope="col">{t('rank.detail.levels')}</th>
                    <th scope="col">{t('rank.col.pos')}</th>
                  </tr>
                </thead>
                <tbody>
                  {d.books.map((b) => (
                    <tr key={b.key} className={b.key === scope ? 'is-on' : undefined}>
                      <th scope="row">{b.title}</th>
                      <td className={mode === 'average' ? 'rank-avg' : undefined}>
                        {formatAverage(b.average)}
                      </td>
                      <td className={mode === 'total' ? 'rank-avg' : undefined}>
                        {b.points.toLocaleString('id-ID')}
                      </td>
                      <td>{b.rounds}</td>
                      <td>
                        {b.passedLevels}/{b.totalLevels}
                      </td>
                      <td>
                        {t('rank.detail.position', { position: b.position, of: b.participants })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3>{t('rank.detail.topics')}</h3>
            {d.topics.length === 0 ? (
              <p className="kid-note">{t('rank.detail.empty')}</p>
            ) : (
              [...byBook.entries()].map(([key, topics]) => (
                <div key={key} className="rank-table-wrap">
                  <table className="rank-table">
                    <caption>{topics[0]!.book}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t('rank.detail.topic')}</th>
                        <th scope="col">{t('rank.col.average')}</th>
                        <th scope="col">{t('rank.col.points')}</th>
                        <th scope="col">{t('rank.col.rounds')}</th>
                        <th scope="col">{t('rank.detail.levels')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topics.map((tp) => (
                        <tr key={tp.category}>
                          <th scope="row">{tp.topic}</th>
                          <td className={mode === 'average' ? 'rank-avg' : undefined}>
                            {formatAverage(tp.average)}
                          </td>
                          <td className={mode === 'total' ? 'rank-avg' : undefined}>
                            {tp.points.toLocaleString('id-ID')}
                          </td>
                          <td>{tp.rounds}</td>
                          <td>
                            {tp.passed}/{tp.levels}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
