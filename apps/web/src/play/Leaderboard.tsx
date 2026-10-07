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
  MockBoardList,
} from '../api/types';
import { speak } from '../audio/speech';
import { useApiCall, useFetch } from '../auth/useApi';
import { Momo } from '../components/Momo';
import { t } from '../i18n';
import { pageList } from '../ui/Pager';
import { formatStamp } from '../ui/ui';
import { SpeakButton } from './ItemPlayer';
import { Crown, StatIcon } from './icons';
import { MockBoard } from './MockBoard';
import { PageHead } from './Profile';

const SCOPE_KEY = 'lc.rank.scope';
const MODE_KEY = 'lc.rank.mode';

/** Tab papan: rata-rata, total skor, atau Mock Test olimpiade (D-072). */
type Tab = LeaderboardMode | 'mock';
const MOCK_KEY = 'lc.rank.mock';

function rememberedMode(): Tab {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === 'total' || v === 'mock' ? v : 'average';
  } catch {
    return 'average';
  }
}

/**
 * Nilai utama sesuai urutan papan: nilai peringkat (rata-rata tertimbang, D-045) "87,50" atau total skor
 * "1.250". Rata-rata asli tetap ditampilkan kecil di bawahnya.
 */
const metric = (r: { rating: number; points: number }, mode: LeaderboardMode) =>
  mode === 'total' ? r.points.toLocaleString('id-ID') : formatAverage(r.rating);
/** "12 ronde · 120 soal". */
const volume = (r: { rounds: number; questions: number }) =>
  `${t('rank.rounds', { n: r.rounds })} · ${t('rank.questions', { n: r.questions.toLocaleString('id-ID') })}`;
/** Waktu sesuai urutan papan: total waktu semua ronde (rata-rata) atau waktu skor terbaik (total skor). */
const timeOf = (r: { timeMs: number; bestTimeMs: number }, mode: LeaderboardMode) =>
  mode === 'total' ? r.bestTimeMs : r.timeMs;
const PAGE_SIZE = 50;
/** Belum punya ronde: tetap tampil di papan global (paling bawah), tanpa nilai. */
const idle = (r: { rounds: number }) => r.rounds === 0;

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
 * Papan peringkat rata-rata tertimbang (D-042, D-045): global + per buku, gaya "papan pengumuman". 25 besar tampil
 * (podium 3 teratas, lalu daftar) dan detailnya bisa dibuka; peserta lainnya berhalaman.
 * Anak lain hanya terlihat nama panggilan + warna Momo. Butuh koneksi (data dari server).
 */
export function LeaderboardPage({ momoColor }: { momoColor: Color }) {
  const scopes = useFetch<LeaderboardScopes>('child', '/leaderboard/scopes');
  const [scope, setScope] = useState(rememberedScope);
  const [tab, setTab] = useState<Tab>(rememberedMode);
  const isMock = tab === 'mock';
  const mode: LeaderboardMode = tab === 'mock' ? 'average' : tab;
  const known = scopes.data?.scopes;
  // Lingkup tersimpan yang sudah tidak ada (buku tanpa peserta) → kembali ke global.
  const active = !known || known.some((s) => s.key === scope) ? scope : 'global';
  const board = useFetch<Leaderboard>(
    'child',
    isMock ? null : `/leaderboard?scope=${active}&mode=${mode}&pageSize=${PAGE_SIZE}`,
  );
  const mocks = useFetch<MockBoardList>('child', isMock ? '/leaderboard/mocks' : null);
  const [mockId, setMockId] = useState(() => {
    try {
      return localStorage.getItem(MOCK_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const mockList = mocks.data?.mocks ?? [];
  const activeMock = mockList.find((m) => m.skillId === mockId) ?? mockList[0];
  const activeBook = activeMock ? `${activeMock.domain}/${activeMock.grade}` : '';
  const mockBooks = [...new Map(mockList.map((m) => [`${m.domain}/${m.grade}`, m])).values()].map(
    (m) => ({ key: `${m.domain}/${m.grade}`, book: m.book, first: m }),
  );
  const call = useApiCall('child');
  const [paged, setPaged] = useState<{ key: string; page: number; items: LeaderboardRow[] }>();
  const [loadingPage, setLoadingPage] = useState(false);
  const [open, setOpen] = useState<LeaderboardRow>();
  const othersRef = useRef<HTMLElement>(null);

  const data =
    board.data?.scope === active && (board.data.mode ?? 'average') === mode
      ? board.data
      : undefined;
  const boardKey = `${mode}:${active}`;
  const current = paged?.key === boardKey ? paged : undefined;
  const page = current?.page ?? 1;
  const restItems = current?.items ?? data?.rest.items ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.rest.total / PAGE_SIZE)) : 1;
  const from = LEADERBOARD_TOP + (page - 1) * PAGE_SIZE + 1;
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

  const chooseMock = (id: string, title: string) => {
    speak(title);
    setMockId(id);
    try {
      localStorage.setItem(MOCK_KEY, id);
    } catch {
      /* abaikan */
    }
  };

  const chooseMode = (m: Tab) => {
    speak(
      t(m === 'total' ? 'rank.mode.total' : m === 'mock' ? 'rank.mode.mock' : 'rank.mode.average'),
    );
    setTab(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* abaikan */
    }
  };

  const goPage = async (n: number) => {
    if (!data || n === page || n < 1 || n > pages || loadingPage) return;
    setLoadingPage(true);
    try {
      const next =
        n === 1
          ? data
          : await call<Leaderboard>(
              `/leaderboard?scope=${active}&mode=${mode}&page=${n}&pageSize=${PAGE_SIZE}`,
            );
      setPaged({ key: boardKey, page: n, items: next.rest.items });
      othersRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    } catch {
      /* tetap tampilkan halaman yang sudah ada */
    } finally {
      setLoadingPage(false);
    }
  };

  const say = !data
    ? t('rank.intro')
    : data.me && !idle(data.me)
      ? t(mode === 'total' ? 'rank.mySayTotal' : 'rank.mySay', {
          board: boardName,
          position: data.me.position,
          of: data.total,
          average: formatAverage(data.me.rating),
          points: data.me.points.toLocaleString('id-ID'),
        })
      : t('rank.notYet', { board: boardName });

  const podium = data?.top.slice(0, 3) ?? [];
  const list = data?.top.slice(3) ?? [];
  const meOutside = data?.me && data.me.position > LEADERBOARD_TOP ? data.me : null;

  return (
    <main className="library board-page rank-page">
      <PageHead
        title={t('rank.title')}
        sub={t(isMock ? 'rank.subMock' : mode === 'total' ? 'rank.subTotal' : 'rank.sub')}
      />

      <div className="rank-modes" role="group" aria-label={t('rank.mode.label')}>
        {(['average', 'total', 'mock'] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={`rank-mode${m === tab ? ' is-on' : ''}`}
            aria-pressed={m === tab}
            onClick={() => chooseMode(m)}
          >
            <StatIcon
              kind={m === 'total' ? 'points' : m === 'mock' ? 'time' : 'passed'}
              size={22}
            />
            <strong>
              {t(
                m === 'total'
                  ? 'rank.mode.total'
                  : m === 'mock'
                    ? 'rank.mode.mock'
                    : 'rank.mode.average',
              )}
            </strong>
          </button>
        ))}
      </div>

      {isMock && (
        <>
          {mockList.length > 0 && (
            <>
              <nav className="rank-scopes" aria-label={t('rank.mock.subjects')}>
                {mockBooks.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    className={`rank-scope${b.key === activeBook ? ' is-on' : ''}`}
                    aria-pressed={b.key === activeBook}
                    onClick={() => chooseMock(b.first.skillId, b.book)}
                  >
                    <strong>{b.book}</strong>
                  </button>
                ))}
              </nav>
              <nav className="rank-scopes is-sub" aria-label={t('rank.mock.which')}>
                {mockList
                  .filter((m) => `${m.domain}/${m.grade}` === activeBook)
                  .map((m) => (
                    <button
                      key={m.skillId}
                      type="button"
                      className={`rank-scope${m.skillId === activeMock?.skillId ? ' is-on' : ''}`}
                      aria-pressed={m.skillId === activeMock?.skillId}
                      onClick={() => chooseMock(m.skillId, m.title)}
                    >
                      <strong>{m.title}</strong>
                      <small>{t('rank.mock.participants', { n: m.participants })}</small>
                    </button>
                  ))}
              </nav>
            </>
          )}
          {activeMock ? (
            <MockBoard
              key={activeMock.skillId}
              skillId={activeMock.skillId}
              momoColor={momoColor}
            />
          ) : (
            <section className="board-empty">
              <Momo own color={momoColor} mood={mocks.error ? 'curious' : 'idle'} size={120} />
              <p className="kid-note">
                {mocks.error
                  ? t('rank.offline')
                  : mocks.data
                    ? t('rank.mock.none')
                    : t('rank.loading')}
              </p>
            </section>
          )}
        </>
      )}

      {!isMock && (
        <>
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
          {data && data.played !== undefined && data.played < data.total && (
            <p className="rank-played">
              {t('rank.played', {
                played: data.played.toLocaleString('id-ID'),
                total: data.total.toLocaleString('id-ID'),
              })}
            </p>
          )}

          {!data ? (
            <section className="board-empty">
              <Momo own color={momoColor} mood={board.error ? 'curious' : 'idle'} size={120} />
              <p className="kid-note">{board.error ? t('rank.offline') : t('rank.loading')}</p>
            </section>
          ) : data.total === 0 ? (
            <section className="board-empty">
              <Momo own color={momoColor} mood="happy" size={120} />
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
                      {t('rank.announceSub', { time: formatStamp(data.updatedAt) })}
                    </time>
                  </small>
                </header>

                <ol className="podium" aria-label={t('rank.top')}>
                  {[podium[1], podium[0], podium[2]].map((r, i) =>
                    !r ? (
                      <li
                        key={`empty-${i}`}
                        className={`podium-spot is-empty slot-${i}`}
                        aria-hidden
                      />
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
                        {idle(r) ? (
                          <span className="podium-raw">{t('rank.idle')}</span>
                        ) : (
                          <>
                            <span className="podium-points rank-avg">{metric(r, mode)}</span>
                            {mode === 'average' && (
                              <span className="podium-raw">
                                {t('rank.raw', { average: formatAverage(r.average) })}
                              </span>
                            )}
                            <span className="podium-meta">
                              <span>{volume(r)}</span>
                              <span className="rank-time">
                                <StatIcon kind="time" size={16} />
                                {formatClock(timeOf(r, mode))}
                              </span>
                            </span>
                          </>
                        )}
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
                <section
                  ref={othersRef}
                  className="rank-others"
                  aria-labelledby="rank-others-title"
                >
                  <h2 id="rank-others-title">{t('rank.others')}</h2>
                  <p className="rank-others-sub" aria-live="polite">
                    {loadingPage
                      ? t('rank.loadingMore')
                      : t('rank.othersSub', {
                          from: from.toLocaleString('id-ID'),
                          to: (from + restItems.length - 1).toLocaleString('id-ID'),
                          total: data.total.toLocaleString('id-ID'),
                        })}
                  </p>
                  <ol className={`rank-list is-small${loadingPage ? ' is-loading' : ''}`}>
                    {restItems.map((r) => (
                      <RankRow key={`${r.position}-${r.nickname}`} row={r} mode={mode} />
                    ))}
                  </ol>
                  {pages > 1 && (
                    <Pager
                      page={page}
                      pages={pages}
                      busy={loadingPage}
                      onGo={(n) => void goPage(n)}
                    />
                  )}
                </section>
              )}
              <p className="board-rule">{t(mode === 'total' ? 'rank.ruleTotal' : 'rank.rule')}</p>
            </>
          )}
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

function Pager({
  page,
  pages,
  busy,
  onGo,
}: {
  page: number;
  pages: number;
  busy: boolean;
  onGo: (page: number) => void;
}) {
  return (
    <nav className="rank-pager" aria-label={t('rank.page.label')}>
      <button
        type="button"
        className="rank-page-btn is-step"
        disabled={busy || page <= 1}
        onClick={() => onGo(page - 1)}
      >
        {t('rank.page.prev')}
      </button>
      <ol className="rank-page-list">
        {pageList(page, pages).map((n, i) =>
          n === '…' ? (
            <li key={`gap-${i}`} className="rank-page-gap" aria-hidden>
              …
            </li>
          ) : (
            <li key={n}>
              <button
                type="button"
                className={`rank-page-btn${n === page ? ' is-on' : ''}`}
                aria-label={t('rank.page.go', { page: n })}
                aria-current={n === page ? 'page' : undefined}
                disabled={busy}
                onClick={() => onGo(n)}
              >
                {n}
              </button>
            </li>
          ),
        )}
      </ol>
      <span className="rank-page-status">{t('rank.page.status', { page, pages })}</span>
      <button
        type="button"
        className="rank-page-btn is-step"
        disabled={busy || page >= pages}
        onClick={() => onGo(page + 1)}
      >
        {t('rank.page.next')}
      </button>
    </nav>
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
  if (!onOpen || !row.childId || idle(row)) return null;
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
      className={`rank-row${row.isMe ? ' is-me' : ''}${row.position <= 3 && !idle(row) ? ` place-${row.position}` : ''}${idle(row) ? ' is-idle' : ''}`}
      aria-label={
        idle(row)
          ? t('rank.idleSay', { position: row.position, name: row.nickname })
          : t(mode === 'total' ? 'rank.rowSayTotal' : 'rank.rowSay', {
              position: row.position,
              name: row.nickname,
              average: formatAverage(row.rating),
              raw: formatAverage(row.average),
              points: row.points.toLocaleString('id-ID'),
              rounds: row.rounds,
              questions: row.questions,
              time: durationWords(timeOf(row, mode)),
            })
      }
    >
      <span className="rank-pos">{row.position}</span>
      <Momo color={row.momoColor as Color} look={row.momoLook ?? null} mood="happy" size={44} />
      <span className="rank-name">
        <strong>{row.nickname}</strong>
        {row.isMe && <em className="board-me">{t('rank.me')}</em>}
        {!idle(row) && (
          <small>
            {volume(row)} · {t('rank.passed', { n: row.passedLevels })}
            {mode === 'average' && <> · {t('rank.raw', { average: formatAverage(row.average) })}</>}
          </small>
        )}
      </span>
      {idle(row) ? (
        <span className="rank-idle">{t('rank.idle')}</span>
      ) : (
        <>
          <span className="rank-avg">{metric(row, mode)}</span>
          <span className="rank-time">
            <StatIcon kind="time" size={18} />
            {formatClock(timeOf(row, mode))}
          </span>
        </>
      )}
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
        average: formatAverage(d.rating),
        raw: formatAverage(d.average),
        points: d.points.toLocaleString('id-ID'),
        rounds: d.rounds,
        questions: d.questions,
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
          {d && (
            <Momo color={d.momoColor as Color} look={d.momoLook ?? null} mood="proud" size={56} />
          )}
          <div>
            <h2 id="rank-detail-title">{t('rank.detail.title', { name: d?.nickname ?? name })}</h2>
          </div>
          {d && <SpeakButton text={say} />}
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
            <dl className="rank-stats">
              {[
                {
                  label: t('rank.col.pos'),
                  value: d.position.toLocaleString('id-ID'),
                  note: t('rank.detail.of', { n: d.participants.toLocaleString('id-ID') }),
                },
                {
                  label: t('rank.col.rating'),
                  value: formatAverage(d.rating),
                  strong: mode === 'average',
                },
                { label: t('rank.col.average'), value: formatAverage(d.average) },
                {
                  label: t('rank.col.points'),
                  value: d.points.toLocaleString('id-ID'),
                  strong: mode === 'total',
                },
                { label: t('rank.col.rounds'), value: d.rounds.toLocaleString('id-ID') },
                { label: t('rank.col.questions'), value: d.questions.toLocaleString('id-ID') },
                { label: t('rank.detail.levels'), value: d.passedLevels.toLocaleString('id-ID') },
                { label: t('rank.col.time'), value: formatClock(timeOf(d, mode)) },
              ].map((x) => (
                <div key={x.label} className={`rank-stat${x.strong ? ' is-strong' : ''}`}>
                  <dt>{x.label}</dt>
                  <dd>
                    {x.value}
                    {x.note && <small> {x.note}</small>}
                  </dd>
                </div>
              ))}
            </dl>

            <h3>{t('rank.detail.books')}</h3>
            <div className="rank-table-wrap">
              <table className="rank-table is-stack">
                <thead>
                  <tr>
                    <th scope="col">{t('rank.detail.book')}</th>
                    <th scope="col">{t('rank.col.rating')}</th>
                    <th scope="col">{t('rank.col.average')}</th>
                    <th scope="col">{t('rank.col.points')}</th>
                    <th scope="col">{t('rank.col.rounds')}</th>
                    <th scope="col">{t('rank.col.questions')}</th>
                    <th scope="col">{t('rank.detail.levels')}</th>
                    <th scope="col">{t('rank.col.pos')}</th>
                  </tr>
                </thead>
                <tbody>
                  {d.books.map((b) => (
                    <tr key={b.key} className={b.key === scope ? 'is-on' : undefined}>
                      <th scope="row">{b.title}</th>
                      <td
                        data-label={t('rank.col.rating')}
                        className={mode === 'average' ? 'rank-avg' : undefined}
                      >
                        {formatAverage(b.rating)}
                      </td>
                      <td data-label={t('rank.col.average')}>{formatAverage(b.average)}</td>
                      <td
                        data-label={t('rank.col.points')}
                        className={mode === 'total' ? 'rank-avg' : undefined}
                      >
                        {b.points.toLocaleString('id-ID')}
                      </td>
                      <td data-label={t('rank.col.rounds')}>{b.rounds}</td>
                      <td data-label={t('rank.col.questions')}>
                        {b.questions.toLocaleString('id-ID')}
                      </td>
                      <td data-label={t('rank.detail.levels')}>
                        {b.passedLevels}/{b.totalLevels}
                      </td>
                      <td data-label={t('rank.col.pos')}>
                        <span>
                          {b.position.toLocaleString('id-ID')}{' '}
                          <small>
                            {t('rank.detail.of', { n: b.participants.toLocaleString('id-ID') })}
                          </small>
                        </span>
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
                  <table className="rank-table is-stack">
                    <caption>{topics[0]!.book}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t('rank.detail.topic')}</th>
                        <th scope="col">{t('rank.col.average')}</th>
                        <th scope="col">{t('rank.col.points')}</th>
                        <th scope="col">{t('rank.col.rounds')}</th>
                        <th scope="col">{t('rank.col.questions')}</th>
                        <th scope="col">{t('rank.detail.levels')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topics.map((tp) => (
                        <tr key={tp.category}>
                          <th scope="row">{tp.topic}</th>
                          <td data-label={t('rank.col.average')}>{formatAverage(tp.average)}</td>
                          <td
                            data-label={t('rank.col.points')}
                            className={mode === 'total' ? 'rank-avg' : undefined}
                          >
                            {tp.points.toLocaleString('id-ID')}
                          </td>
                          <td data-label={t('rank.col.rounds')}>{tp.rounds}</td>
                          <td data-label={t('rank.col.questions')}>
                            {tp.questions.toLocaleString('id-ID')}
                          </td>
                          <td data-label={t('rank.detail.levels')}>
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
