import { Link } from 'react-router-dom';
import { durationWords, formatClock, type Color } from '@little-coder/engine';
import { setSession, useSession } from '../auth/session';
import { Momo } from '../components/Momo';
import { t } from '../i18n';
import { StatIcon } from './icons';
import { SpeakButton } from './ItemPlayer';
import { useProgress } from './practiceStore';

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

/**
 * "Selesai main" (D-026): ringkasan hari ini, lalu dua pilihan jelas — Main lagi / Keluar.
 * Keluar hanya menutup sesi anak; perangkat tetap mengingat kode keluarga/kelas.
 */
export function Goodbye({ momoColor }: { momoColor: Color }) {
  const session = useSession('child')!;
  const progress = useProgress(session.user.id);
  const now = Date.now();
  const today = progress.quizHistory.filter((h) => sameDay(h.ts, now));
  const passed = today.filter((h) => h.passed).length;
  const timeMs = today.reduce((a, h) => a + (h.durationMs ?? 0), 0);
  const say =
    today.length === 0
      ? t('play.bye.sayNone', { name: session.user.name })
      : passed > 0
        ? t('play.bye.say', { name: session.user.name, played: today.length, passed })
        : t('play.bye.sayPractice', { name: session.user.name, played: today.length });

  return (
    <main className="kid-screen bye-screen">
      <Momo own color={momoColor} mood="proud" size={150} />
      <div className="kid-say">
        <SpeakButton text={`${say} ${t('play.bye.question')}`} />
        <p>{say}</p>
      </div>
      {today.length > 0 && (
        <ul className="bye-stats">
          <li className="profile-stat is-played">
            <StatIcon kind="played" />
            <span className="profile-value">{today.length}</span>
            <span className="profile-label">{t('play.bye.played')}</span>
          </li>
          <li className="profile-stat is-passed">
            <StatIcon kind="passed" />
            <span className="profile-value">{passed}</span>
            <span className="profile-label">{t('play.bye.passed')}</span>
          </li>
          <li className="profile-stat is-time" aria-label={durationWords(timeMs)}>
            <StatIcon kind="time" />
            <span className="profile-value">{formatClock(timeMs)}</span>
            <span className="profile-label">{t('play.bye.time')}</span>
          </li>
        </ul>
      )}
      <p className="bye-question">{t('play.bye.question')}</p>
      <div className="kid-row bye-actions">
        <Link className="kid-btn" to="/play">
          {t('play.bye.again')}
        </Link>
        <button
          type="button"
          className="kid-btn secondary"
          onClick={() => setSession('child', null)}
        >
          {t('play.bye.exit')}
        </button>
      </div>
    </main>
  );
}
