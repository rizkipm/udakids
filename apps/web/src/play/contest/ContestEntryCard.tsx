import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../auth/useApi';
import { t } from '../../i18n';
import { SpeakButton } from '../ItemPlayer';
import { FlagIcon, whenText } from './ContestPages';
import { phaseAt } from './playable';
import { clockOffset, untilWords, useServerNow } from './time';
import type { ContestList, ContestListItem } from './types';
import './contest.css';

/** Lomba yang akan dimulai dalam ≤ 7 hari ditampilkan di beranda. */
const SOON_MS = 7 * 24 * 3600_000;
/** Pengumuman pemenang lomba yang diikuti tampil ≤ 3 hari setelah selesai. */
const RESULTS_MS = 3 * 24 * 3600_000;

/** Pilih lomba untuk beranda: yang sedang berlangsung, lalu yang paling dekat, lalu hasil terbaru. */
export function pickContest(list: readonly ContestListItem[], now: number) {
  const live = list.find((c) => phaseAt(c, now) === 'live');
  if (live) return { c: live, phase: 'live' as const };
  const soon = list
    .filter((c) => phaseAt(c, now) === 'upcoming' && Date.parse(c.startsAt) - now <= SOON_MS)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
  if (soon) return { c: soon, phase: 'upcoming' as const };
  const mine = list
    .filter(
      (c) =>
        phaseAt(c, now) === 'ended' &&
        c.me.status !== 'none' &&
        now - Date.parse(c.endsAt) <= RESULTS_MS,
    )
    .sort((a, b) => Date.parse(b.endsAt) - Date.parse(a.endsAt))[0];
  return mine ? { c: mine, phase: 'ended' as const } : null;
}

/** Kartu "Lomba" di beranda anak (tampil bila ada lomba yang akan/sedang berlangsung). */
export function ContestEntryCard() {
  const list = useFetch<ContestList>('child', '/contests');
  const offset = useMemo(() => (list.data ? clockOffset(list.data.now) : undefined), [list.data]);
  const now = useServerNow(offset, 15_000);
  const pick = list.data ? pickContest(list.data.contests, now) : null;
  if (!pick) return null;
  const { c, phase } = pick;
  const heading =
    phase === 'live'
      ? t('contest.card.live')
      : phase === 'upcoming'
        ? t('contest.card.upcoming')
        : t('contest.card.results');
  const status =
    phase === 'upcoming'
      ? t('contest.startsIn', { time: untilWords(Date.parse(c.startsAt) - now) })
      : phase === 'ended'
        ? t('contest.winners')
        : c.me.status === 'active'
          ? t('contest.continue')
          : c.me.status === 'done'
            ? t('contest.waiting')
            : t('contest.endsIn', { time: untilWords(Date.parse(c.endsAt) - now) });
  const action =
    phase === 'live' && c.me.status === 'none'
      ? t('contest.join')
      : phase === 'live' && c.me.status === 'active'
        ? t('contest.continue')
        : phase === 'ended'
          ? t('contest.winners')
          : t('contest.title');
  return (
    <section className={`contest-entry is-${phase}`} aria-labelledby="contest-entry-title">
      <div className="contest-entry-icon">
        <FlagIcon size={56} />
      </div>
      <div className="contest-entry-body">
        <span className="contest-entry-kicker">{heading}</span>
        <strong id="contest-entry-title">{c.title}</strong>
        <span className="contest-card-when">{whenText(c)}</span>
        <span className="contest-entry-status">{status}</span>
      </div>
      <div className="contest-entry-actions">
        <SpeakButton text={t('contest.card.say', { title: c.title, status })} />
        <Link
          to={phase === 'upcoming' ? '/play/lomba' : `/play/lomba/${c.id}`}
          className="kid-btn big-play"
        >
          {action}
        </Link>
      </div>
    </section>
  );
}
