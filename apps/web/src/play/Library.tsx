import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FREE_ACCESS,
  GRADES,
  isMockSkill,
  levelStatuses,
  skippedStandalone,
  standaloneCodes,
  totalPoints,
  withAccess,
  type Color,
} from '@little-coder/engine';
import { speak } from '../audio/speech';
import { useSession } from '../auth/session';
import { Momo } from '../components/Momo';
import { t, type MessageKey } from '../i18n';
import { ContestEntryCard } from './contest/ContestEntryCard';
import { bookKey, firstOpen, gradeLabel, levelLabel, shelvesOf, useCatalog } from './catalog';
import { DoorIcon, PlayIcon, StatIcon, TrophyIcon } from './icons';
import { SpeakButton } from './ItemPlayer';
import { useLinks } from './links';
import { mapelOf, PetaBelajar } from './peta/PetaBelajar';
import { MomoLoader } from './MomoLoader';
import { RESUME_MAX_AGE_MS, useProgress } from './practiceStore';
import { useFetch } from '../auth/useApi';

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
 * atau pilih buku → Peta Belajar (D-111: jalur topik per bab + panel topik). Detail level & materi ada di halaman
 * topik; statistik di Profilku.
 */
export function Library({ momoColor }: { momoColor: Color }) {
  const session = useSession('child')!;
  const progress = useProgress(session.user.id);
  const { data, failed, retry: retryCatalog } = useCatalog();
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
        ),
        shelves.flatMap((s) => s.skills),
        data?.access ?? FREE_ACCESS,
      ),
    [shelves, progress.quizzes, data?.access],
  );
  const lastPlayed = useFetch<{ skillId: string; ts: string } | null>('child', '/practice/resume');
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
        <MomoLoader compact color={momoColor} failed={failed} onRetry={retryCatalog} />
      </main>
    );
  }

  // "Lanjutkan" (D-073): ronde yang belum selesai di perangkat ini, atau level terakhir dari server.
  const resumeTarget = (() => {
    if (!data || !links) return undefined;
    const local = progress.inProgress;
    const fresh = local && Date.now() - local.ts < RESUME_MAX_AGE_MS ? local : undefined;
    const id = fresh?.skillId ?? lastPlayed.data?.skillId;
    if (!id) return undefined;
    const all = shelvesOf(data);
    const shelf = all.find((s) => s.skills.some((k) => k.id === id));
    const skill = shelf?.skills.find((k) => k.id === id);
    if (!shelf || !skill || isMockSkill(skill)) return undefined;
    const inBook = all.filter((s) => bookKey(s.catalog) === bookKey(shelf.catalog));
    const status = withAccess(
      levelStatuses(
        inBook.map((s) => s.category.code),
        inBook.flatMap((s) => s.skills),
        progress.quizzes,
      ),
      inBook.flatMap((s) => s.skills),
      data.access ?? FREE_ACCESS,
    )[skill.id];
    if (status !== 'open' && status !== 'passed') return undefined;
    return {
      shelf,
      skill,
      level: shelf.skills.indexOf(skill) + 1,
      question: fresh?.skillId === id ? fresh.history.length + 1 : undefined,
    };
  })();

  const say = resumeTarget
    ? t('play.home.resumeSay', {
        name: session.user.name,
        topic: resumeTarget.shelf.category.title,
        n: resumeTarget.level,
      })
    : next
      ? t('play.home.nextSay', {
          name: session.user.name,
          topic: next.shelf.category.title,
          n: next.level,
        })
      : t('play.home.allDone');

  return (
    <main className="home" data-mapel={activeBook ? mapelOf(activeBook) : undefined}>
      {top}

      <ContestEntryCard />
      {resumeTarget ? (
        <section className="continue-card is-resume">
          <Momo own color={momoColor} mood="happy" size={96} />
          <div className="continue-body">
            <div className="kid-say">
              <SpeakButton text={say} />
              <p>{t('play.home.resume')}</p>
            </div>
            <p className="continue-what">
              <strong>{resumeTarget.shelf.category.title}</strong>
              <span>
                {t('play.library.level', { n: resumeTarget.level })} ·{' '}
                {levelLabel(resumeTarget.skill.title)}
                {resumeTarget.question !== undefined && (
                  <> · {t('play.home.resumeQuestion', { n: resumeTarget.question })}</>
                )}
              </span>
            </p>
          </div>
          <div className="continue-actions">
            <Link className="kid-btn big-play" to={links.level(resumeTarget.skill.id)}>
              <PlayIcon />
              {t('play.home.resumeButton')}
            </Link>
            {next && next.skill.id !== resumeTarget.skill.id && (
              <Link className="kid-link" to={links.level(next.skill.id)}>
                {t('play.home.orNext', { topic: next.shelf.category.title, n: next.level })}
              </Link>
            )}
          </div>
        </section>
      ) : (
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
      )}

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

      {activeBook?.lab && (
        <Link className="booklab-card" to={links.book(activeBook)}>
          <span className="booklab-card-icon" aria-hidden>
            <FlaskIcon />
          </span>
          <span className="booklab-card-text">
            <strong>{activeBook.lab.judul}</strong>
            <span>{activeBook.lab.sub}</span>
          </span>
          <PlayIcon />
        </Link>
      )}

      <h2 className="home-h2">
        {activeBook && grades.length > 1 ? `${activeBook.title} · ` : ''}
        {t('play.peta.title')}
      </h2>
      {activeBook && (
        <PetaBelajar
          book={activeBook}
          shelves={shelves}
          statuses={statuses}
          nextCode={next?.shelf.category.code}
          links={links}
          access={data.access ?? FREE_ACCESS}
          momoColor={momoColor}
        />
      )}
    </main>
  );
}

/** Ikon labu laboratorium untuk kartu Lab Buku (D-109). */
function FlaskIcon() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44">
      <path
        d="M18 4h12M20 4v14L8 38a5 5 0 0 0 4 8h24a5 5 0 0 0 4-8L28 18V4"
        fill="#e4f2fb"
        stroke="#2b2540"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M12 34h24l3 5a3 3 0 0 1-3 4H12a3 3 0 0 1-3-4z" fill="#43aa8b" />
      <circle cx="20" cy="30" r="2.5" fill="#43aa8b" />
      <circle cx="27" cy="25" r="2" fill="#43aa8b" />
    </svg>
  );
}
