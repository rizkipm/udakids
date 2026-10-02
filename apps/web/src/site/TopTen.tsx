import { useEffect, useState } from 'react';
import { formatClock, type Color } from '@little-coder/engine';
import { api } from '../api/client';
import { Momo } from '../components/Momo';
import { t } from '../i18n';
import { formatStamp } from '../ui/ui';

/** Top 10 global (`/leaderboard/public`, D-045): hanya nama panggilan + warna Momo. */
export type PublicTop = {
  updatedAt: string;
  participants: number;
  top: {
    position: number;
    nickname: string;
    momoColor: string;
    points: number;
    questions: number;
    passedLevels: number;
    rounds: number;
    timeMs: number;
  }[];
};

const POLL_MS = 15_000;

/** Segarkan tiap 15 detik selama tab terlihat (server menyimpan papan 10 detik). */
export function usePublicTop() {
  const [data, setData] = useState<PublicTop>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      api<PublicTop>('/leaderboard/public')
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
  }, []);
  return { data, failed };
}

const num = (n: number) => n.toLocaleString('id-ID');

/** Bagian landing: 10 besar global realtime (skor, soal dijawab, level lulus, waktu). */
export function TopTenSection() {
  const { data, failed } = usePublicTop();
  if (failed && !data) return null;
  return (
    <section id="peringkat" className="site-section topten" aria-labelledby="topten-title">
      <h2 id="topten-title">{t('site.top.title')}</h2>
      <p className="section-lead">{t('site.top.sub')}</p>
      <div className="topten-card">
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
        {!data ? (
          <p className="topten-empty">{t('site.top.loading')}</p>
        ) : data.top.length === 0 ? (
          <p className="topten-empty">{t('site.top.empty')}</p>
        ) : (
          <div className="topten-scroll">
            <table className="topten-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">{t('site.top.col.name')}</th>
                  <th scope="col">{t('site.top.col.points')}</th>
                  <th scope="col">{t('site.top.col.questions')}</th>
                  <th scope="col">{t('site.top.col.levels')}</th>
                  <th scope="col">{t('site.top.col.time')}</th>
                </tr>
              </thead>
              <tbody>
                {data.top.map((r) => (
                  <tr
                    key={`${r.position}-${r.nickname}`}
                    className={`is-${Math.min(r.position, 4)}`}
                  >
                    <td>
                      <span className="topten-pos">{r.position}</span>
                    </td>
                    <th scope="row">
                      <span className="topten-name">
                        <Momo color={r.momoColor as Color} mood="happy" size={36} />
                        {r.nickname}
                      </span>
                    </th>
                    <td className="topten-points">{num(r.points)}</td>
                    <td>{num(r.questions)}</td>
                    <td>{num(r.passedLevels)}</td>
                    <td>{formatClock(r.timeMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="topten-note">{t('site.top.note')}</p>
      </div>
    </section>
  );
}
