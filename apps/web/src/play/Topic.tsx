import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MAX_WRONG_ITEMS,
  FREE_ACCESS,
  generateItem,
  levelStatuses,
  isMockSkill,
  lessonFor,
  withAccess,
  PASS_SCORE,
  QUIZ_LENGTH,
  type AnswerResult,
  type Color,
  type PlayStatus,
  type SkillTemplate,
  topicReadAloud,
} from '@little-coder/engine';
import { speak } from '../audio/speech';
import { useSession } from '../auth/session';
import { Momo } from '../components/Momo';
import { t } from '../i18n';
import { bookKey, levelLabel, shelvesOf, useCatalog } from './catalog';
import { CheckIcon, LockIcon, PlayIcon, StatIcon } from './icons';
import { ItemPlayer, SpeakButton } from './ItemPlayer';
import { useLinks } from './links';
import { MomoLoader } from './MomoLoader';
import { PremiumNotice } from './PremiumNotice';
import { MockSection } from './MockSection';
import { materiOf } from './materi/registry';
import { useProgress } from './practiceStore';
import { PageHead } from './Profile';

/**
 * Halaman topik (D-026): 1) Materi — penjelasan singkat + hal penting + contoh soal yang bisa
 * dicoba (tidak dinilai); 2) Level 1–10 berurutan. Satu tombol utama: mulai level yang terbuka.
 */
export function TopicPage({ momoColor }: { momoColor: Color }) {
  const { token = '' } = useParams();
  const session = useSession('child')!;
  const progress = useProgress(session.user.id);
  const { data, failed: catalogFailed, retry: retryCatalog } = useCatalog();
  const links = useLinks(data);
  const where = links?.topicOf(token);
  const domain = where?.domain ?? '';
  const grade = where?.grade ?? '';
  const code = where?.code ?? '';

  const book = useMemo(() => {
    if (!data || !domain) return undefined;
    const shelves = shelvesOf(data).filter((s) => bookKey(s.catalog) === `${domain}/${grade}`);
    const index = shelves.findIndex((s) => s.category.code === code);
    const here = shelves[index];
    return {
      shelves,
      shelf: here,
      // Pelajaran manual, atau otomatis dari data topik (D-090): setiap topik punya "Belajar dulu".
      lesson: here ? lessonFor(here.category, here.skills) : undefined,
      nextShelf: shelves[index + 1],
      statuses: withAccess(
        levelStatuses(
          shelves.map((s) => s.category.code),
          shelves.flatMap((s) => s.skills),
          progress.quizzes,
        ),
        shelves.flatMap((s) => s.skills),
        data.access ?? FREE_ACCESS,
      ),
    };
  }, [data, domain, grade, code, progress.quizzes]);

  const shelf = book?.shelf;
  if (!data || !links) {
    return <MomoLoader color={momoColor} failed={catalogFailed} onRetry={retryCatalog} />;
  }
  if (!book || !shelf) {
    return (
      <main className="kid-screen">
        <Momo own color={momoColor} mood="curious" size={140} />
        <p className="kid-note">{t('play.quiz.notFound')}</p>
        <Link className="kid-btn" to="/play">
          {t('play.quiz.back')}
        </Link>
      </main>
    );
  }

  const { category } = shelf;
  const open = shelf.skills.find((k) => book.statuses[k.id] === 'open');
  const openNo = open ? shelf.skills.indexOf(open) + 1 : 0;
  const done = shelf.skills.every((k) => book.statuses[k.id] === 'passed');
  // Level berikutnya berbayar (D-036): beri tahu anak dengan lembut, tanpa harga.
  const paidNext = !open && shelf.skills.some((k) => book.statuses[k.id] === 'paid');
  const intro = category.intro ?? t('play.topic.introFallback', { topic: category.title });
  const tips = category.tips ?? [];
  // Mock Test olimpiade (D-072): aturan & tombolnya berbeda dari level biasa.
  const mockSkill = shelf.skills[0] && isMockSkill(shelf.skills[0]) ? shelf.skills[0] : undefined;
  const readAloud = topicReadAloud(intro, tips, t('play.topic.tip'));
  // Materi lengkap (purwarupa): bab berurutan untuk topik yang sudah punya.
  const materi = materiOf(domain, grade, code);

  if (mockSkill) {
    return (
      <main className="library topic-page">
        <PageHead title={category.title} sub={shelf.catalog.title} />
        <MockSection
          mocks={shelf.skills.filter(isMockSkill)}
          tips={tips}
          statuses={book.statuses}
          results={progress.quizzes}
          access={data.access ?? FREE_ACCESS}
          momoColor={momoColor}
          levelHref={(id) => links.level(id)}
        />
      </main>
    );
  }

  return (
    <main className="library topic-page">
      <PageHead title={category.title} sub={shelf.catalog.title} />

      <section className="lesson" aria-labelledby="lesson-title">
        <div className="lesson-head">
          <Momo own color={momoColor} mood="curious" size={72} />
          <h2 id="lesson-title">{t('play.topic.lesson')}</h2>
          <SpeakButton text={readAloud} label={t('play.topic.listen')} />
        </div>
        {materi && (
          <Link className="kid-btn big-play lesson-open" to={`/play/belajar/${token}/lengkap`}>
            <PlayIcon />
            <span className="materi-open">
              {t('play.materi.open', { title: materi.judul })}
              <small>{t('play.materi.openSub', { n: materi.bab.length })}</small>
            </span>
          </Link>
        )}
        {book.lesson && (
          <Link
            className={`kid-btn lesson-open${materi ? ' secondary' : ' big-play'}`}
            to={`/play/belajar/${token}`}
          >
            <PlayIcon />
            {t('play.lesson.open', { title: book.lesson.judul })}
          </Link>
        )}
        <p className="lesson-intro">{intro}</p>
        {tips.length > 0 && (
          <ul className="lesson-tips" aria-label={t('play.topic.tip')}>
            {tips.map((tip) => (
              <li key={tip}>
                <StatIcon kind="points" size={22} />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}
        <Example skill={shelf.skills[0]!} />
      </section>

      <section className="levels" aria-labelledby="levels-title">
        <div className="levels-head">
          <h2 id="levels-title">{t('play.topic.levels')}</h2>
          <p className="levels-rule">
            {t('play.library.rule', {
              total: QUIZ_LENGTH,
              pass: PASS_SCORE,
              wrong: MAX_WRONG_ITEMS,
            })}
          </p>
        </div>
        {paidNext && <PremiumNotice access={data.access ?? FREE_ACCESS} />}
        <ol className="level-path">
          {shelf.skills.map((k, i) => (
            <li key={k.id}>
              <LevelCard
                href={links.level(k.id)}
                skill={k}
                n={i + 1}
                status={book.statuses[k.id] ?? 'locked'}
                best={progress.quizzes[k.id]?.best}
                isNext={k === open}
              />
            </li>
          ))}
        </ol>
      </section>

      <div className="topic-cta">
        {open ? (
          <Link className="kid-btn big-play" to={links.level(open.id)}>
            <PlayIcon />
            {t('play.topic.start', { n: openNo })}
          </Link>
        ) : done && book.nextShelf ? (
          <Link
            className="kid-btn big-play"
            to={links.topic({ domain, grade, category: book.nextShelf.category.code })}
          >
            {t('play.topic.nextTopic', { topic: book.nextShelf.category.title })}
          </Link>
        ) : (
          <Link className="kid-btn secondary" to="/play">
            {t('play.quiz.back')}
          </Link>
        )}
      </div>
    </main>
  );
}

/** Contoh soal dari Level 1: bisa dicoba, jawaban & pembahasan tampil, tidak dinilai. */
function Example({ skill }: { skill: SkillTemplate }) {
  const [shown, setShown] = useState(false);
  const [seed, setSeed] = useState(7);
  const [result, setResult] = useState<AnswerResult>();
  const key = `${skill.id}@${skill.version}`;
  // Sama seperti ronde: jangan buat ulang contoh saat katalog diperbarui dari server.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const item = useMemo(() => generateItem(skill, { seed, band: 0 }), [key, seed]);
  if (!shown) {
    return (
      <button
        type="button"
        className="kid-btn secondary example-open"
        onClick={() => setShown(true)}
      >
        {t('play.topic.example')}
      </button>
    );
  }
  return (
    <div className="example">
      <p className="example-label">{t('play.topic.exampleLabel')}</p>
      <ItemPlayer key={seed} item={item} mode="preview" onAnswer={setResult} />
      {result && (
        <div
          className={`example-feedback ${result.correct ? 'is-right' : 'is-wrong'}`}
          role="status"
        >
          <div className="kid-say">
            <SpeakButton text={item.reteach.say} />
            <p>
              {result.correct ? t('play.quiz.right') : t('play.topic.exampleWrong')}{' '}
              {item.reteach.say}
            </p>
          </div>
          <button
            type="button"
            className="kid-link"
            onClick={() => {
              setResult(undefined);
              setSeed((s) => s + 1);
            }}
          >
            {t('play.topic.exampleMore')}
          </button>
        </div>
      )}
    </div>
  );
}

function LevelCard({
  href,
  skill,
  n,
  status,
  best,
  isNext,
}: {
  href: string;
  skill: SkillTemplate;
  n: number;
  status: PlayStatus;
  best?: number;
  isNext: boolean;
}) {
  const body = (
    <>
      <span className="level-num">{n}</span>
      <span className="level-title">{levelLabel(skill.title)}</span>
      <span className="level-status">
        {status === 'locked' || status === 'paid' ? (
          <LockIcon size={20} />
        ) : status === 'passed' ? (
          <>
            <CheckIcon size={20} /> {best ?? 0}
          </>
        ) : best !== undefined ? (
          t('play.library.best', { score: best })
        ) : isNext ? (
          t('play.topic.now')
        ) : null}
      </span>
    </>
  );
  const label = `${t('play.library.level', { n })}: ${levelLabel(skill.title)}`;
  if (status === 'paid') {
    return (
      <button
        type="button"
        className="level-card is-locked is-paid"
        aria-label={`${label}, ${t('play.library.paid')}`}
        onClick={() => speak(t('play.quiz.paid'))}
      >
        {body}
      </button>
    );
  }
  return status === 'locked' ? (
    <div
      className="level-card is-locked"
      aria-disabled="true"
      aria-label={`${label}, ${t('play.library.locked')}`}
    >
      {body}
    </div>
  ) : (
    <Link
      to={href}
      className={`level-card is-${status}${isNext ? ' is-next' : ''}`}
      aria-label={label}
    >
      {body}
    </Link>
  );
}
