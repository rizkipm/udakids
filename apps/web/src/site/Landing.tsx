import { useEffect, useState } from 'react';
import { GRADES } from '@little-coder/engine';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import { Momo } from '../components/Momo';
import { APP_NAME } from '../config/app';
import { t, type MessageKey } from '../i18n';
import { BookSlider } from './BookSlider';
import { Blocks, Cloud, Icon, ProgramCard, Star, type FeatureIcon } from './Decor';
import { useLiveStats } from './liveStats';
import { PricingSection } from './Pricing';
import { BannerSlider } from '../components/BannerSlider';
import { GallerySection, useHasGallery } from './GallerySection';
import { TopTenSection } from './TopTen';
import './site.css';

/** Buku Pustaka dari database (`GET /public/books`, D-030) — tidak lagi ditulis manual di kode. */
type PublicBook = {
  domain: string;
  grade: string;
  title: string;
  topics: number;
  levels: number;
  sampleTopics: string[];
  /** Rujukan kurikulum dari tag skill (server lama: tidak ada). */
  standards?: string[];
};
type PublicBooks = { books: PublicBook[]; totalLevels: number };

const TONES = ['sun', 'coral', 'sky', 'grape', 'leaf', 'teal'] as const;
const DOMAIN_ICON: Record<string, FeatureIcon> = {
  math: 'math',
  sains: 'science',
  english: 'english',
};
const iconOf = (b: { domain: string }): FeatureIcon => DOMAIN_ICON[b.domain] ?? 'book';
/** Label mata pelajaran yang punya teks; domain lain (mis. buku baru) memakai judul bukunya. */
const SUBJECTS = ['math', 'sains', 'english'] as const;
const known = (d: string): d is (typeof SUBJECTS)[number] =>
  (SUBJECTS as readonly string[]).includes(d);

/** "matematika, sains, dan bahasa Inggris" dari buku yang benar-benar ada (urut seperti di server). */
export function subjectList(books: { domain: string }[] | undefined, type: 'and' | 'or' = 'and') {
  const domains = [...new Set((books ?? []).map((b) => b.domain))].filter(known);
  if (domains.length === 0)
    return t(type === 'and' ? 'site.subjects.default' : 'site.subjects.defaultOr');
  const words = domains.map((d) => t(k(`site.subjectLower.${d}`)));
  try {
    return new Intl.ListFormat('id', {
      type: type === 'and' ? 'conjunction' : 'disjunction',
    }).format(words);
  } catch {
    return words.join(', ');
  }
}

type Subject = {
  domain: string;
  title: string;
  books: PublicBook[];
  levels: number;
  standards: string[];
};

/** Urutan rujukan: kurikulum nasional, standar internasional, gaya olimpiade, lalu pengayaan. */
const STANDARD_ORDER = ['merdeka', 'singapore', 'cambridge', 'timss', 'osn', 'ngss', 'ccss'];
const standardRank = (s: string) => {
  const i = STANDARD_ORDER.indexOf(s);
  return i < 0 ? STANDARD_ORDER.length : i;
};

/** Kelompokkan buku per mata pelajaran; rujukan = gabungan rujukan bukunya, urut `STANDARD_ORDER`. */
export function groupSubjects(books: PublicBook[]): Subject[] {
  const out = new Map<string, Subject>();
  for (const b of books) {
    const cur = out.get(b.domain) ?? {
      domain: b.domain,
      title: known(b.domain) ? t(k(`site.subject.${b.domain}`)) : b.title,
      books: [],
      levels: 0,
      standards: [],
    };
    cur.books.push(b);
    cur.levels += b.levels;
    for (const s of b.standards ?? []) if (!cur.standards.includes(s)) cur.standards.push(s);
    out.set(b.domain, cur);
  }
  const subjects = [...out.values()];
  for (const s of subjects) s.standards.sort((a, b) => standardRank(a) - standardRank(b));
  return subjects;
}

/** Label rujukan: versi khusus mata pelajaran bila ada (mis. Singapore untuk English), lalu label umum. */
function standardLabel(domain: string, std: string) {
  const own = `site.std.${domain}.${std}`;
  const label = t(k(own));
  return label === own ? t(k(`site.std.${std}`)) : label;
}

function SubjectsSection({ books }: { books: PublicBook[] }) {
  const subjects = groupSubjects(books);
  if (subjects.length === 0) return null;
  return (
    <section id="kurikulum" className="site-section subjects" aria-labelledby="subjects-title">
      <h2 id="subjects-title">{t('site.subjects.title')}</h2>
      <p className="section-lead">{t('site.subjects.lead')}</p>
      <div className="subject-grid">
        {subjects.map((s, i) => (
          <article key={s.domain} className={`subject-card tone-${TONES[i % TONES.length]}`}>
            <header className="subject-head">
              <Icon name={iconOf(s)} size={52} />
              <div>
                <h3>{s.title}</h3>
                <p className="subject-meta">
                  {t('site.subjects.meta', {
                    books: s.books.length,
                    levels: s.levels.toLocaleString('id-ID'),
                    span: gradeSpan(s.books),
                  })}
                </p>
              </div>
            </header>
            <ul className="subject-books">
              {s.books.map((b) => (
                <li key={b.grade}>{t(k(`site.age.${b.grade}`))}</li>
              ))}
            </ul>
            {s.standards.length > 0 && (
              <>
                <h4 className="subject-refs-title">{t('site.subjects.refs')}</h4>
                <ul className="subject-refs">
                  {s.standards.map((std) => (
                    <li key={std}>{standardLabel(s.domain, std)}</li>
                  ))}
                </ul>
              </>
            )}
            {s.domain === 'english' && (
              <p className="subject-note">{t('site.subjects.note.english')}</p>
            )}
          </article>
        ))}
      </div>
      <p className="subjects-disclaimer">{t('site.subjects.disclaimer')}</p>
    </section>
  );
}

function usePublicBooks() {
  const [data, setData] = useState<PublicBooks>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    api<PublicBooks>('/public/books')
      .then(setData)
      .catch(() => setFailed(true));
  }, []);
  return { data, failed };
}

const k = (s: string) => s as MessageKey;

/**
 * "Dari Pra-TK sampai SMP": rentang jenjang dihitung dari buku yang benar-benar ada di database (urut GRADES),
 * jadi otomatis ikut berubah saat buku baru ditambahkan. Sebelum data termuat: teks bawaan.
 */
export function gradeSpan(books: { grade: string }[] | undefined): string {
  const order = (g: string) => GRADES.indexOf(g as (typeof GRADES)[number]);
  const known = (books ?? []).map((b) => b.grade).filter((g) => order(g) >= 0);
  if (known.length === 0) return t('site.hero.kicker');
  known.sort((a, b) => order(a) - order(b));
  const from = t(k(`site.span.${known[0]}`));
  const to = t(k(`site.span.${known[known.length - 1]}`));
  return from === to
    ? t('site.hero.kickerOne', { grade: from })
    : t('site.hero.kickerSpan', { from, to });
}

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const hasGallery = useHasGallery();
  return (
    <header className="site-nav">
      <Link to="/" className="site-brand" aria-label={APP_NAME}>
        <Momo mood="happy" size={44} />
        <span>{APP_NAME}</span>
      </Link>
      <button
        type="button"
        className="site-burger"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sr-only">{t('site.nav.menu')}</span>
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
          <path
            d={open ? 'M5 5l14 14M19 5L5 19' : 'M4 7h16M4 12h16M4 17h16'}
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <nav
        id="site-menu"
        className={`site-menu${open ? ' is-open' : ''}`}
        onClick={() => setOpen(false)}
      >
        <a href="#buku">{t('site.nav.books')}</a>
        <a href="#kurikulum">{t('site.nav.subjects')}</a>
        <a href="#cara">{t('site.nav.how')}</a>
        <a href="#pintu">{t('site.nav.doors')}</a>
        <a href="#harga">{t('site.nav.price')}</a>
        {hasGallery && <a href="#galeri">{t('media.nav.gallery')}</a>}
        <a href="#aman">{t('site.nav.safe')}</a>
        <Link to="/orang-tua/masuk" className="site-btn ghost">
          {t('site.nav.parent')}
        </Link>
        <Link to="/play" className="site-btn">
          {t('site.cta.play')}
        </Link>
      </nav>
    </header>
  );
}

export function Landing() {
  const { data: shelf, failed } = usePublicBooks();
  const { stats, live } = useLiveStats();
  const fmt = (n?: number) => (n ?? 0).toLocaleString('id-ID');
  return (
    <div className="site">
      <SiteNav />

      <main>
        <section className="hero">
          <div className="hero-text">
            <p className="hero-kicker">
              <Star size={22} /> {gradeSpan(shelf?.books)}
            </p>
            <h1>
              {t('site.hero.title1')} <span className="hl">{t('site.hero.title2')}</span>
            </h1>
            <p className="hero-lead">
              {t('site.hero.lead', { subjects: subjectList(shelf?.books) })}
            </p>
            <div className="hero-cta">
              <Link to="/play" className="site-btn big">
                {t('site.cta.play')}
              </Link>
              <Link to="/play/daftar" className="site-btn big alt">
                {t('site.cta.self')}
              </Link>
              <Link to="/orang-tua/daftar" className="site-btn big ghost">
                {t('site.cta.family')}
              </Link>
            </div>
            <ul className="hero-facts" aria-live="polite">
              {(stats || shelf) && (
                <>
                  <li>
                    <strong>{fmt(stats?.books ?? shelf!.books.length)}</strong>{' '}
                    {t('site.fact.books')}
                  </li>
                  <li>
                    <strong>{fmt(stats?.totalLevels ?? shelf!.totalLevels)}</strong>{' '}
                    {t('site.fact.levels')}
                  </li>
                  <li>
                    <strong>
                      {fmt(
                        stats?.totalQuestions ?? (stats?.totalLevels ?? shelf!.totalLevels) * 10,
                      )}
                    </strong>{' '}
                    {t('site.fact.totalQuestions')}
                  </li>
                </>
              )}
              <li>
                <strong>10</strong> {t('site.fact.questions')}
              </li>
              {stats && (
                <li>
                  <strong>{fmt(stats.users)}</strong> {t('site.fact.users')}
                </li>
              )}
            </ul>
            {stats && (
              <p className={`live-chip${live ? ' is-live' : ''}`} aria-live="polite">
                <span className="live-dot" aria-hidden />
                <span>
                  {live ? t('site.live.on') : t('site.live.off')}
                  {' · '}
                  <strong>{fmt(stats.activeNow)}</strong> {t('site.live.active')}
                  {' · '}
                  <strong>{fmt(stats.rounds)}</strong> {t('site.live.rounds')}
                  {stats.answered !== undefined && (
                    <>
                      {' · '}
                      <strong>{fmt(stats.answered)}</strong> {t('site.live.answered')}
                    </>
                  )}
                </span>
              </p>
            )}
          </div>

          <div className="hero-art" aria-hidden>
            <div className="hero-blob" />
            <Cloud className="float-a hero-cloud-1" width={130} />
            <Cloud className="float-b hero-cloud-2" width={90} />
            <Star className="spin hero-star-1" size={36} />
            <Star className="spin hero-star-2" size={24} color="#ff7a59" />
            <div className="hero-momo float-b">
              <Momo mood="happy" size={230} />
            </div>
            <div className="hero-cards">
              <ProgramCard dir="right" color="#ff7a59" className="float-a" />
              <ProgramCard dir="up" color="#4aa8ff" className="float-b" />
              <ProgramCard dir="right" color="#46b97a" className="float-a" />
            </div>
            <Blocks className="hero-blocks float-b" />
            <div className="hero-bubble float-a">
              <strong>{t('site.hero.bubble1')}</strong>
              <span>{t('site.hero.bubble2')}</span>
            </div>
          </div>
        </section>

        <BannerSlider placement="landing" />

        <section id="pintu" className="site-section doors">
          <h2>{t('site.doors.title')}</h2>
          <p className="section-lead">{t('site.doors.lead')}</p>
          <div className="door-grid">
            <article className="door tone-grape">
              <Icon name="child" size={64} />
              <h3>{t('site.doors.child.title')}</h3>
              <p>{t('site.doors.child.text')}</p>
              <div className="door-actions">
                <Link to="/play" className="site-btn">
                  {t('site.doors.child.login')}
                </Link>
                <Link to="/play/daftar" className="site-btn ghost">
                  {t('site.doors.child.self')}
                </Link>
                <Link to="/play/gabung" className="site-btn ghost">
                  {t('site.doors.child.join')}
                </Link>
              </div>
            </article>
            <article className="door tone-leaf">
              <Icon name="family" size={64} />
              <h3>{t('site.doors.parent.title')}</h3>
              <p>{t('site.doors.parent.text')}</p>
              <div className="door-actions">
                <Link to="/orang-tua/daftar" className="site-btn">
                  {t('site.doors.parent.register')}
                </Link>
                <Link to="/orang-tua/masuk" className="site-btn ghost">
                  {t('site.doors.parent.login')}
                </Link>
              </div>
            </article>
            <article className="door tone-sky">
              <Icon name="class" size={64} />
              <h3>{t('site.doors.class.title')}</h3>
              <p>{t('site.doors.class.text')}</p>
              <div className="door-actions">
                <Link to="/masuk/staf" className="site-btn">
                  {t('site.doors.class.login')}
                </Link>
              </div>
            </article>
          </div>
        </section>

        <section id="buku" className="site-section books">
          <h2>{t('site.books.title')}</h2>
          <p className="section-lead">{t('site.books.lead')}</p>
          {shelf ? (
            <BookSlider
              items={shelf.books}
              render={(b, i) => (
                <article
                  key={`${b.domain}/${b.grade}`}
                  className={`book-card tone-${TONES[i % TONES.length]}`}
                >
                  <div className="book-spine" aria-hidden />
                  <Icon name={iconOf(b)} size={48} />
                  <h3>{b.title}</h3>
                  <p className="book-age">{t(k(`site.age.${b.grade}`))}</p>
                  <p>{b.sampleTopics.join(', ')}</p>
                  <span className="book-levels">
                    {t('site.books.meta', {
                      topics: b.topics,
                      n: b.levels.toLocaleString('id-ID'),
                    })}
                  </span>
                </article>
              )}
            />
          ) : (
            <div className="book-grid">
              {Array.from({ length: 3 }, (_, i) => (
                <article key={i} className="book-card is-skeleton" aria-hidden>
                  <div className="book-spine" />
                </article>
              ))}
            </div>
          )}
          {failed && !shelf && <p className="section-lead">{t('site.books.offline')}</p>}
        </section>

        {shelf && <SubjectsSection books={shelf.books} />}

        <section id="cara" className="site-section how">
          <h2>{t('site.how.title')}</h2>
          <ol className="how-steps">
            {(['1', '2', '3', '4'] as const).map((n) => (
              <li key={n} className={`how-step step-${n}`}>
                <span className="how-num">{n}</span>
                <h3>{t(k(`site.how.${n}.title`))}</h3>
                <p>{t(k(`site.how.${n}.text`), { subjects: subjectList(shelf?.books, 'or') })}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="site-section champions">
          <div className="champ-text">
            <h2>{t('site.champ.title')}</h2>
            <p>{t('site.champ.text')}</p>
            <ul className="check-list">
              <li>
                <Icon name="timer" size={32} /> {t('site.champ.timer')}
              </li>
              <li>
                <Icon name="trophy" size={32} /> {t('site.champ.board')}
              </li>
            </ul>
          </div>
          <div className="champ-art" aria-hidden>
            <div className="mini-podium">
              <div className="mp mp-2">
                <Momo color="biru" mood="happy" size={70} />
                <span>2</span>
              </div>
              <div className="mp mp-1">
                <Momo color="kuning" mood="proud" size={86} />
                <span>1</span>
              </div>
              <div className="mp mp-3">
                <Momo color="hijau" mood="happy" size={62} />
                <span>3</span>
              </div>
            </div>
          </div>
        </section>

        <TopTenSection />

        <PricingSection
          bookTitle={(domain, grade) =>
            shelf?.books.find((b) => b.domain === domain && b.grade === grade)?.title ??
            `${domain} ${grade}`
          }
        />

        <GallerySection />

        <section id="aman" className="site-section safe">
          <h2>{t('site.safe.title')}</h2>
          <div className="safe-grid">
            {(
              [
                ['shield', 'data'],
                ['noads', 'ads'],
                ['offline', 'offline'],
                ['voice', 'voice'],
              ] as const
            ).map(([icon, key]) => (
              <div key={key} className="safe-item">
                <Icon name={icon} size={52} />
                <h3>{t(k(`site.safe.${key}.title`))}</h3>
                <p>{t(k(`site.safe.${key}.text`))}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="cta-band">
          <Momo mood="proud" size={110} />
          <div>
            <h2>{t('site.band.title')}</h2>
            <p>{t('site.band.text')}</p>
          </div>
          <div className="hero-cta">
            <Link to="/play" className="site-btn big">
              {t('site.cta.play')}
            </Link>
            <Link to="/orang-tua/daftar" className="site-btn big ghost light">
              {t('site.cta.family')}
            </Link>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>
          © {new Date().getFullYear()} {APP_NAME}
        </span>
        <nav>
          <Link to="/play">{t('site.footer.child')}</Link>
          <Link to="/orang-tua/masuk">{t('site.footer.parent')}</Link>
          <Link to="/masuk/staf">{t('site.footer.staff')}</Link>
        </nav>
      </footer>
    </div>
  );
}
