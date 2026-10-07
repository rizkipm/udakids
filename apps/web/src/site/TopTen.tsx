import { useEffect, useState } from 'react';
import { formatAverage, formatClock, type Color, type MomoLook } from '@little-coder/engine';
import { api } from '../api/client';
import { Momo } from '../components/Momo';
import { t } from '../i18n';
import { formatStamp } from '../ui/ui';

/** Top 10 global (`/leaderboard/public`, D-045): hanya nama panggilan + warna Momo. */
export type PublicTop = {
  updatedAt: string;
  /** Semua anak aktif. */
  participants: number;
  /** Anak yang sudah punya minimal satu ronde (server lama: tidak ada). */
  played?: number;
  top: {
    position: number;
    nickname: string;
    momoColor: string;
    momoLook?: MomoLook | null;
    points: number;
    questions: number;
    passedLevels: number;
    rounds: number;
    timeMs: number;
    average?: number;
    rating?: number;
  }[];
  board?: Board;
  period?: Period;
  ranked?: number;
};

type Board = 'total' | 'average' | 'active';
type Period = 'all' | 'month' | 'week' | 'day';

const POLL_MS = 15_000;

/** Segarkan tiap 15 detik selama tab terlihat (server menyimpan papan 10 detik). */
export function usePublicTop(board: Board = 'total', period: Period = 'all') {
  const [data, setData] = useState<PublicTop>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setData(undefined);
    const load = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      api<PublicTop>(`/leaderboard/public?board=${board}&period=${period}`)
        .then((d) => {
          if (!alive) return;
          // Server lama / respons tak terduga → sembunyikan bagian ini, bukan error.
          if (!d || !Array.isArray(d.top)) throw new Error('bentuk respons tidak dikenal');
          setData(d);
          setFailed(false);
        })
        .catch(() => alive && setFailed(true));
    };
    load();
    const timer = setInterval(load, POLL_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [board, period]);
  return { data, failed };
}

const num = (n: number) => n.toLocaleString('id-ID');
const PERIODS: Record<Board, Period[]> = {
  total: ['all'],
  average: ['all', 'month', 'week', 'day'],
  active: ['day', 'week', 'month'],
};
type Row = PublicTop['top'][number];

/** Nilai utama per papan: total skor, nilai peringkat (rata-rata tertimbang), atau soal dijawab. */
const metricOf = (board: Board, r: Row) =>
  board === 'total'
    ? t('site.top.metric.points', { n: num(r.points) })
    : board === 'average'
      ? formatAverage(r.rating ?? 0)
      : t('site.top.metric.questions', { n: num(r.questions) });
const detailOf = (board: Board, r: Row) =>
  board === 'total'
    ? t('site.top.detail.total', { q: num(r.questions), l: num(r.passedLevels) })
    : board === 'average'
      ? t('site.top.detail.average', { avg: formatAverage(r.average ?? 0), n: num(r.rounds) })
      : t('site.top.detail.active', { n: num(r.rounds) });

/**
 * Bagian landing (D-045, diperluas D-073): 10 besar realtime dengan podium 1–2–3 lalu daftar 4–10. Tiga papan:
 * total skor, rata-rata tertinggi (semua / bulan / minggu / hari ini), dan paling aktif (hari / minggu / bulan).
 * Hanya nama panggilan + warna Momo yang tampil.
 */
export function TopTenSection() {
  const [board, setBoard] = useState<Board>('total');
  const [period, setPeriod] = useState<Period>('all');
  const { data, failed } = usePublicTop(board, period);
  if (failed && !data) return null;
  const pick = (b: Board) => {
    setBoard(b);
    setPeriod(PERIODS[b][0]!);
  };
  const top = data?.board === board ? data.top : [];
  const podium = top.slice(0, 3);
  const rest = top.slice(3);
  return (
    <section id="peringkat" className="site-section topten" aria-labelledby="topten-title">
      <h2 id="topten-title">{t('site.top.title')}</h2>
      <p className="section-lead">{t('site.top.sub')}</p>
      <div className="topten-card">
        <div className="topten-tabs" role="tablist" aria-label={t('site.top.title')}>
          {(['total', 'average', 'active'] as const).map((b) => (
            <button
              key={b}
              type="button"
              role="tab"
              aria-selected={b === board}
              className={`topten-tab${b === board ? ' is-on' : ''}`}
              onClick={() => pick(b)}
            >
              {t(`site.top.board.${b}`)}
            </button>
          ))}
        </div>
        {PERIODS[board].length > 1 && (
          <div className="topten-periods" role="group" aria-label={t('site.top.period')}>
            {PERIODS[board].map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={p === period}
                className={`topten-period${p === period ? ' is-on' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {t(`site.top.periodName.${p}`)}
              </button>
            ))}
          </div>
        )}
        <div className="topten-head">
          <span className="topten-live">
            <span className="topten-dot" aria-hidden />
            {t('site.top.live')}
          </span>
          {data && (
            <small>
              {t('site.top.updated', { time: formatStamp(data.updatedAt) })} ·{' '}
              {t('site.top.participants', { n: num(data.participants) })}
            </small>
          )}
        </div>
        {!data || data.board !== board ? (
          <p className="topten-empty">{t('site.top.loading')}</p>
        ) : top.length === 0 ? (
          <p className="topten-empty">{t('site.top.emptyPeriod')}</p>
        ) : (
          <>
            <ol className="topten-podium" aria-label={t('site.top.podium')}>
              {[podium[1], podium[0], podium[2]].map((r, i) =>
                !r ? (
                  <li key={`kosong-${i}`} className={`tp-spot slot-${i} is-empty`} aria-hidden />
                ) : (
                  <li
                    key={`${r.position}-${r.nickname}`}
                    className={`tp-spot slot-${i} place-${r.position}`}
                  >
                    {r.position === 1 && (
                      <span className="tp-crown" aria-hidden>
                        ★
                      </span>
                    )}
                    <Momo
                      color={r.momoColor as Color}
                      look={r.momoLook ?? null}
                      mood="proud"
                      size={i === 1 ? 92 : 72}
                    />
                    <strong className="tp-name">{r.nickname}</strong>
                    <span className="tp-metric">{metricOf(board, r)}</span>
                    <small className="tp-detail">
                      {detailOf(board, r)} · {formatClock(r.timeMs)}
                    </small>
                    <span className="tp-block">{r.position}</span>
                  </li>
                ),
              )}
            </ol>
            {rest.length > 0 && (
              <ol className="topten-list" start={4}>
                {rest.map((r) => (
                  <li key={`${r.position}-${r.nickname}`}>
                    <span className="topten-pos">{r.position}</span>
                    <Momo
                      color={r.momoColor as Color}
                      look={r.momoLook ?? null}
                      mood="happy"
                      size={36}
                    />
                    <span className="tl-name">
                      <strong>{r.nickname}</strong>
                      <small>
                        {detailOf(board, r)} · {formatClock(r.timeMs)}
                      </small>
                    </span>
                    <span className="tl-metric">{metricOf(board, r)}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
        <p className="topten-note">{t(`site.top.rule.${board}`)}</p>
      </div>
    </section>
  );
}
