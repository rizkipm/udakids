import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FREE_ACCESS,
  levelStatuses,
  totalPoints,
  withAccess,
  type Color,
  type PlayStatus,
} from '@little-coder/engine';
import { useSession } from '../auth/session';
import { Momo } from '../components/Momo';
import { t } from '../i18n';
import { bookKey, firstOpen, levelLabel, shelvesOf, useCatalog, type Shelf } from './catalog';
import { CheckIcon, DoorIcon, LockIcon, PlayIcon, StatIcon, TrophyIcon } from './icons';
import { SpeakButton } from './ItemPlayer';
import { useLinks, type Links } from './links';
import { useProgress } from './practiceStore';

const BOOK_KEY = 'lc.library.book';

function rememberedBook() {
  try {
    return localStorage.getItem(BOOK_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * Beranda anak (D-026). Satu layar = satu keputusan: tombol besar "Lanjut" ke level berikutnya,
 * atau pilih buku → topik. Detail level & materi ada di halaman topik; statistik di Profilku.
 */
export function Library({ momoColor }: { momoColor: Color }) {
  const session = useSession('child')!;
  const progress = useProgress(session.user.id);
  const { data, failed } = useCatalog();
  const links = useLinks(data);
  const [book, setBook] = useState(rememberedBook);

  const books = useMemo(() => data?.catalogs ?? [], [data]);
  const activeBook = books.find((b) => bookKey(b) === book) ?? books[0];
  const shelves = useMemo(
    () =>
      data && activeBook
        ? shelvesOf(data).filter((s) => bookKey(s.catalog) === bookKey(activeBook))
        : [],
    [data, activeBook],
  );
  const statuses = useMemo(
    () =>
      withAccess(
        levelStatuses(
          shelves.map((s) => s.category.code),
          shelves.flatMap((s) => s.skills),
          progress.quizzes,
        ),
        shelves.flatMap((s) => s.skills),
        data?.access ?? FREE_ACCESS,
      ),
    [shelves, progress.quizzes, data?.access],
  );
  const next = firstOpen(shelves, statuses);
  const points = totalPoints(progress.quizzes);

  const chooseBook = (key: string) => {
    setBook(key);
    try {
      localStorage.setItem(BOOK_KEY, key);
    } catch {
      /* abaikan */
    }
  };

  const top = (
    <header className="kid-top">
      <Link
        to="profil"
        className="me-chip"
        aria-label={t('play.home.profile', { name: session.user.name })}
      >
        <Momo color={momoColor} mood="happy" size={44} />
        <span className="me-name">{session.user.name}</span>
        <span className="me-points">
          <StatIcon kind="points" size={20} />
          {points}
        </span>
      </Link>
      <nav className="top-actions">
        <Link to="peringkat" className="icon-btn" aria-label={t('play.board.open')}>
          <TrophyIcon />
          <span>{t('play.home.board')}</span>
        </Link>
        <Link to="selesai" className="icon-btn" aria-label={t('play.home.done')}>
          <DoorIcon />
          <span>{t('play.home.doneShort')}</span>
        </Link>
      </nav>
    </header>
  );

  if (!data || !links) {
    return (
      <main className="home">
        {top}
        <section className="home-empty">
          <Momo color={momoColor} mood={failed ? 'curious' : 'idle'} size={140} />
          <p className="kid-note">
            {failed ? t('play.library.offline') : t('play.library.loading')}
          </p>
        </section>
      </main>
    );
  }

  const say = next
    ? t('play.home.nextSay', {
        name: session.user.name,
        topic: next.shelf.category.title,
        n: next.level,
      })
    : t('play.home.allDone');

  return (
    <main className="home">
      {top}

      <section className="continue-card">
        <Momo color={momoColor} mood={next ? 'happy' : 'proud'} size={96} />
        <div className="continue-body">
          <div className="kid-say">
            <SpeakButton text={say} />
            <p>{next ? t('play.home.next') : t('play.home.allDone')}</p>
          </div>
          {next && (
            <p className="continue-what">
              <strong>{next.shelf.category.title}</strong>
              <span>
                {t('play.library.level', { n: next.level })} · {levelLabel(next.skill.title)}
              </span>
            </p>
          )}
        </div>
        {next && (
          <div className="continue-actions">
            <Link className="kid-btn big-play" to={links.level(next.skill.id)}>
              <PlayIcon />
              {t('play.home.play')}
            </Link>
            <Link className="kid-link" to={links.topic(next.skill)}>
              {t('play.topic.readShort')}
            </Link>
          </div>
        )}
      </section>

      {books.length > 1 && (
        <nav className="book-tabs" aria-label={t('play.library.books')}>
          {books.map((b) => (
            <button
              key={bookKey(b)}
              type="button"
              aria-pressed={activeBook && bookKey(b) === bookKey(activeBook)}
              className={`book-tab${activeBook && bookKey(b) === bookKey(activeBook) ? ' is-on' : ''}`}
              onClick={() => chooseBook(bookKey(b))}
            >
              {b.title}
            </button>
          ))}
        </nav>
      )}

      <h2 className="home-h2">{t('play.home.topics')}</h2>
      <ol className="topic-grid">
        {shelves.map((s, i) => (
          <li key={s.category.code}>
            <TopicCard
              links={links}
              shelf={s}
              n={i + 1}
              statuses={statuses}
              isNext={next?.shelf === s}
            />
          </li>
        ))}
      </ol>
    </main>
  );
}

function TopicCard({
  links,
  shelf,
  n,
  statuses,
  isNext,
}: {
  links: Links;
  shelf: Shelf;
  n: number;
  statuses: Record<string, PlayStatus>;
  isNext: boolean;
}) {
  const total = shelf.skills.length;
  const passed = shelf.skills.filter((k) => statuses[k.id] === 'passed').length;
  const locked = shelf.skills.every((k) => statuses[k.id] === 'locked');
  const done = passed === total;
  const state = locked ? 'is-locked' : done ? 'is-done' : isNext ? 'is-next' : 'is-open';
  return (
    <Link
      to={links.topic(shelf.skills[0]!)}
      className={`topic-card ${state}`}
      aria-label={`${shelf.category.title}. ${
        locked ? t('play.home.lockedTopic') : t('play.home.progress', { passed, total })
      }`}
    >
      <span className="topic-num">{n}</span>
      <span className="topic-title">{shelf.category.title}</span>
      <span className="topic-foot">
        {locked ? (
          <>
            <LockIcon size={22} /> {t('play.library.locked')}
          </>
        ) : done ? (
          <>
            <CheckIcon size={22} /> {t('play.home.topicDone')}
          </>
        ) : (
          <>
            <span className="topic-bar" aria-hidden>
              <span style={{ width: `${(passed / total) * 100}%` }} />
            </span>
            <span className="topic-count">
              {passed}/{total}
            </span>
          </>
        )}
      </span>
    </Link>
  );
}
