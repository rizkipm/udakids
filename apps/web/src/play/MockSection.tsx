import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  mockConfigOf,
  formatClock,
  hasBookAccess,
  mockRetakeLocked,
  type Access,
  type Color,
  type PlayStatus,
  type QuizResult,
  type SkillTemplate,
} from '@little-coder/engine';
import { speak } from '../audio/speech';
import { t } from '../i18n';
import { levelLabel } from './catalog';
import { LockIcon, PlayIcon } from './icons';
import { MockBoard } from './MockBoard';
import { MockHistory } from './MockHistory';
import { MockOverview } from './MockTest';
import { PremiumNotice } from './PremiumNotice';

/**
 * Bagian Mock Test di halaman topik (D-072): ringkasan aturan, tiga kartu Mock test (1 gratis sekali; 2 & 3 dan
 * mengulang khusus Premium), lalu laporan & papan peringkat untuk mock yang dipilih.
 */
export function MockSection({
  mocks,
  tips,
  statuses,
  results,
  access,
  momoColor,
  levelHref,
}: {
  mocks: SkillTemplate[];
  tips: readonly string[];
  statuses: Readonly<Record<string, PlayStatus>>;
  results: Readonly<Record<string, QuizResult | undefined>>;
  access: Access;
  momoColor: Color;
  levelHref: (id: string) => string;
}) {
  const [selected, setSelected] = useState(mocks[0]!.id);
  const current = mocks.find((m) => m.id === selected) ?? mocks[0]!;
  const premium = hasBookAccess(access, mocks[0]!);
  const cards = mocks.map((m, i) => {
    const r = results[m.id];
    const attempts = r?.attempts ?? 0;
    const paid = statuses[m.id] === 'paid';
    const retakeLocked = !paid && mockRetakeLocked(access, m, attempts);
    const playable = !paid && !retakeLocked && ['open', 'passed'].includes(statuses[m.id] ?? '');
    return { m, n: i + 1, r, attempts, paid, retakeLocked, playable };
  });
  const showPremium = cards.some((c) => c.paid || c.retakeLocked);

  return (
    <>
      <MockOverview mock={mocks[0]!} tips={tips} momoColor={momoColor}>
        <div className="mock-picker" role="list" aria-label={t('play.mock.pick')}>
          {cards.map(({ m, n, r, attempts, retakeLocked, playable }) => (
            <article
              key={m.id}
              role="listitem"
              className={`mock-pick${playable ? '' : ' is-locked'}${m.id === current.id ? ' is-on' : ''}`}
            >
              <header>
                <strong>{levelLabel(m.title)}</strong>
                {/* D-073: Mock test 1 selalu gratis (tanpa paket: sekali saja); Mock 2 & 3 Premium. */}
                <span className={`mock-badge ${n === 1 ? 'is-free' : 'is-premium'}`}>
                  {n === 1
                    ? t(premium ? 'play.mock.freeBadge' : 'play.mock.freeOnce')
                    : t('play.mock.premiumBadge')}
                </span>
              </header>
              <p>
                {r
                  ? t('play.mock.cardBest', {
                      score: r.best,
                      time: r.bestTimeMs !== undefined ? formatClock(r.bestTimeMs) : '–',
                      n: attempts,
                    })
                  : t('play.mock.cardNew', { n: mockConfigOf(m).questions })}
              </p>
              <div className="mock-pick-actions">
                {playable ? (
                  <Link className="kid-btn big-play" to={levelHref(m.id)}>
                    <PlayIcon />
                    {attempts > 0 ? t('play.mock.retake') : t('play.mock.start')}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="kid-btn secondary is-locked"
                    onClick={() =>
                      speak(t(retakeLocked ? 'play.mock.retakeLockedSay' : 'play.premium.sayMock'))
                    }
                  >
                    <LockIcon size={20} />
                    {retakeLocked ? t('play.mock.retakeLocked') : t('play.mock.lockedPremium')}
                  </button>
                )}
                {attempts > 0 && (
                  <button
                    type="button"
                    className="kid-link"
                    aria-pressed={m.id === current.id}
                    onClick={() => setSelected(m.id)}
                  >
                    {t('play.mock.seeReport')}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        {showPremium && <PremiumNotice access={access} mock />}
      </MockOverview>

      <nav className="mock-tabs" aria-label={t('play.mock.pick')}>
        {mocks.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`mock-tab${m.id === current.id ? ' is-on' : ''}`}
            aria-pressed={m.id === current.id}
            onClick={() => setSelected(m.id)}
          >
            {levelLabel(m.title)}
          </button>
        ))}
      </nav>
      <MockHistory key={`h-${current.id}`} mock={current} momoColor={momoColor} />
      <MockBoard key={`b-${current.id}`} skillId={current.id} momoColor={momoColor} compact />
    </>
  );
}
