import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FREE_ACCESS,
  GRADES,
  levelStatuses,
  skippedStandalone,
  standaloneCodes,
  totalPoints,
  withAccess,
  type Color,
  type PlayStatus,
} from '@little-coder/engine';
import { speak } from '../audio/speech';
import { useSession } from '../auth/session';
import { Momo } from '../components/Momo';
import { t, type MessageKey } from '../i18n';
import { ContestEntryCard } from './contest/ContestEntryCard';
import {
  bookKey,
  firstOpen,
  gradeLabel,
  levelLabel,
  shelvesOf,
  useCatalog,
  type Shelf,
} from './catalog';
import { CheckIcon, DoorIcon, LockIcon, PlayIcon, StatIcon, TrophyIcon } from './icons';
import { SpeakButton } from './ItemPlayer';
import { useLinks, type Links } from './links';
import { useProgress } from './practiceStore';

const BOOK_KEY = 'lc.library.book';
const GRADE_KEY = 'lc.library.grade';

function remembered(key: string) {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}
function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* abaikan */
  }
}

const gradeOrder = (g: string) => {
  const i = GRADES.indexOf(g as (typeof GRADES)[number]);
  return i < 0 ? GRADES.length : i;
};
/** Nama buku di dalam jenjang: cukup mata pelajarannya (Matematika, Sains), judul lengkap dibacakan. */
const bookLabel = (b: { domain: string; title: string }) => {
  const key = `play.domain.${b.domain}` as MessageKey;
  const label = t(key);
  return label === key ? b.title : label;
};

/**
 * Beranda anak (D-026). Satu layar = satu keputusan: tombol besar "Lanjut" ke level berikutnya,
 * atau pilih buku → topik. Detail level & materi ada di halaman topik; statistik di Profilku.
 */
export function Library({ momoColor }: { momoColor: Color }) {
  const session = useSession('child')!;
  const progress = useProgress(session.user.id);
  const { data, failed } = useCatalog();
  const links = useLinks(data);
  const [book, setBook] = useState(() => remembered(BOOK_KEY));
  const [grade, setGrade] = useState(() => remembered(GRADE_KEY));

  const books = useMemo(() => data?.catalogs ?? [], [data]);
  // Jenjang yang punya buku, urut GRADES (Pra-TK, TK, Kelas 1, Kelas 2, Kelas 1–2 OSN, …).
  const grades = useMemo<string[]>(
    () => [...new Set(books.map((b) => b.grade))].sort((a, b) => gradeOrder(a) - gradeOrder(b)),
    [books],
  );
  const savedBook = books.find((b) => bookKey(b) === book);
  const gradeNav = useRef<HTMLElement>(null);
  const activeGrade = grades.includes(grade) ? grade : (savedBook?.grade ?? grades[0]);
  const gradeBooks = useMemo(
    () => books.filter((b) => b.grade === activeGrade),
    [books, activeGrade],
  );
  const activeBook =
    gradeBooks.find((b) => bookKey(b) === book) ??
    gradeBooks.find((b) => b.domain === savedBook?.domain) ??
    gradeBooks[0];
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
          standaloneCodes(shelves.map((s) => s.category)),
        ),
        shelves.flatMap((s) => s.skills),
        data?.access ?? FREE_ACCESS,
      ),
    [shelves, progress.quizzes, data?.access],
  );
  const next = firstOpen(
    shelves,
    statuses,
    skippedStandalone(
      shelves.flatMap((s) => s.skills),
      progress.quizzes,
      standaloneCodes(shelves.map((s) => s.category)),
    ),
  );
  // Jenjang terpilih selalu terlihat di baris chip yang bisa digeser.
  useEffect(() => {
    const nav = gradeNav.current;
    const on = nav?.querySelector<HTMLElement>('.grade-chip.is-on');
    if (nav && on)
      nav.scrollLeft = on.offsetLeft - nav.offsetLeft - (nav.clientWidth - on.clientWidth) / 2;
  }, [activeGrade, grades.length]);
  const points = totalPoints(progress.quizzes);

  const chooseBook = (b: { domain: string; grade: string; title: string }) => {
    speak(b.title);
    setBook(bookKey(b));
    remember(BOOK_KEY, bookKey(b));
  };
  const chooseGrade = (g: string) => {
    speak(gradeLabel(g));
    setGrade(g);
    remember(GRADE_KEY, g);
    // Tetap di mata pelajaran yang sama bila ada di jenjang baru (Math TK → Math Kelas 1).
    const inGrade = books.filter((b) => b.grade === g);
    const same = inGrade.find((b) => b.domain === activeBook?.domain) ?? inGrade[0];
    if (same) {
      setBook(bookKey(same));
      remember(BOOK_KEY, bookKey(same));
    }
  };

  const top = (
    <header className="kid-top">
      <Link
        to="profil"
        className="me-chip"
        aria-label={t('play.home.profile', { name: session.user.name })}
      >
        <Momo own color={momoColor} mood="happy" size={44} />
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
          <Momo own color={momoColor} mood={failed ? 'curious' : 'idle'} size={140} />
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

      <ContestEntryCard />
      <section className="continue-card">
        <Momo own color={momoColor} mood={next ? 'happy' : 'proud'} size={96} />
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

      {grades.length > 1 && (
        <nav ref={gradeNav} className="grade-chips" aria-label={t('play.library.grades')}>
          {grades.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={g === activeGrade}
              className={`grade-chip${g === activeGrade ? ' is-on' : ''}${/^sd\d\d$/.test(g) ? ' is-osn' : ''}`}
              onClick={() => chooseGrade(g)}
            >
              {gradeLabel(g)}
            </button>
          ))}
        </nav>
      )}

      {gradeBooks.length > 1 && (
        <nav className="book-tabs library-books" aria-label={t('play.library.books')}>
          {gradeBooks.map((b) => (
            <button
              key={bookKey(b)}
              type="button"
              aria-pressed={activeBook && bookKey(b) === bookKey(activeBook)}
              aria-label={b.title}
              className={`book-tab${activeBook && bookKey(b) === bookKey(activeBook) ? ' is-on' : ''}`}
              onClick={() => chooseBook(b)}
            >
              {bookLabel(b)}
            </button>
          ))}
        </nav>
      )}

      <h2 className="home-h2">
        {activeBook && grades.length > 1 ? `${activeBook.title} · ` : ''}
        {t('play.home.topics')}
      </h2>
      {sectionsOf(shelves).map(({ group, shelves: list }) => (
        <section key={group ?? ''} className={group ? 'topic-section is-group' : 'topic-section'}>
          {group && <GroupHeader group={group} topics={list.length} />}
          <ol className="topic-grid">
            {list.map((s, i) => (
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
        </section>
      ))}
    </main>
  );
}

/**
 * Judul bagian (D-069, D-070). Teks `group` berpola "SINGKATAN · Nama lomba — keterangan", mis.
 * "EMC · Eduversal Mathematics Competition — Penyisihan Final Provinsi 2026": singkatan jadi lencana, nama
 * lomba tebal, keterangan di bawahnya. Teks tanpa pola ini tampil apa adanya.
 */
function GroupHeader({ group, topics }: { group: string; topics: number }) {
  const m = /^(\S{2,12}) · (.+?)(?: [—–-] (.+))?$/.exec(group);
  const badge = m?.[1];
  const title = m ? m[2]! : group;
  const note = m?.[3];
  return (
    <header className="topic-group">
      <span className="topic-group-badge">
        <TrophyIcon size={22} />
        {badge}
      </span>
      <span className="topic-group-text">
        <strong>{title}</strong>
        <span>
          {note && <>{note} · </>}
          {t('play.home.groupTopics', { n: topics })}
        </span>
      </span>
      <SpeakButton text={note ? `${title}. ${note}.` : title} />
    </header>
  );
}

/**
 * Bagian di dalam buku (D-069): materi tanpa `group` lebih dulu (tanpa judul), lalu tiap `group`
 * (mis. EMC) dengan judulnya sendiri. Nomor materi mulai dari 1 di setiap bagian.
 */
function sectionsOf(shelves: Shelf[]): { group?: string; shelves: Shelf[] }[] {
  const out: { group?: string; shelves: Shelf[] }[] = [];
  const plain = shelves.filter((s) => !s.category.group);
  if (plain.length > 0) out.push({ shelves: plain });
  for (const s of shelves) {
    const g = s.category.group;
    if (!g) continue;
    const sec = out.find((x) => x.group === g);
    if (sec) sec.shelves.push(s);
    else out.push({ group: g, shelves: [s] });
  }
  return out;
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
