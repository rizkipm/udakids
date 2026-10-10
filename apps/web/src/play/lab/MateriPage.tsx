import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CONTOH_SEED,
  contohSay,
  labStars,
  levelShortTitle,
  materiQuizItems,
  type Color,
  type LabIngat,
  type Materi,
  type SkillTemplate,
} from '@little-coder/engine';
import { pushVoiceLesson, speak, stopSpeaking } from '../../audio/speech';
import { Momo } from '../../components/Momo';
import { t, type MessageKey } from '../../i18n';
import { bookKey, shelvesOf, useCatalog } from '../catalog';
import { InfografisScreen } from '../Infografis';
import { SpeakButton } from '../ItemPlayer';
import { LessonTry, VideoScreen } from '../LessonMedia';
import { useLinks } from '../links';
import { MomoLoader } from '../MomoLoader';
import { PageHead } from '../Profile';
import { Experiment, Explorer, FactCards, HabitSort } from './experiments';
import { PeragaanPlayer } from './math';
import { useLabProgress } from './progress';
import { QuizResult, QuizRunner, Stars } from './quiz';
import { DoneNote } from './ui';
import '../games/games.css';
import '../infografis.css';
import './lab.css';
import './lab-math.css';

type Tab = 'pahami' | 'eksperimen' | 'contoh' | 'ingat' | 'uji';
const TABS: Tab[] = ['pahami', 'eksperimen', 'contoh', 'ingat', 'uji'];
type Group = 'math' | 'sains' | 'english';
const groupOf = (domain: string): Group =>
  domain === 'sains' ? 'sains' : domain === 'english' ? 'english' : 'math';
const tabLabel = (g: Group, tab: Tab) => `play.lab.mtab.${g}.${tab}` as MessageKey;

/** Materi Topik (D-109): `/play/belajar/:token/materi`. Bebas urutan; bagian Contoh & Uji dibuat otomatis. */
export function MateriPage({ momoColor }: { momoColor: Color }) {
  const { token = '' } = useParams();
  const { data, failed, retry } = useCatalog();
  const links = useLinks(data);
  const where = links?.topicOf(token);
  const shelf = useMemo(() => {
    if (!data || !where) return undefined;
    return shelvesOf(data).find(
      (s) =>
        bookKey(s.catalog) === `${where.domain}/${where.grade}` && s.category.code === where.code,
    );
  }, [data, where]);
  const materi = shelf?.category.materi;
  const labKey = where ? `${where.domain}/${where.grade}/${where.code}` : '';
  const { parts, mark } = useLabProgress(labKey);

  if (!data || !links) return <MomoLoader color={momoColor} failed={failed} onRetry={retry} />;
  if (!shelf || !materi || !where) {
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
  const topicHref = links.topic({ domain: where.domain, grade: where.grade, category: where.code });
  const book = data.catalogs.find((c) => c.domain === where.domain && c.grade === where.grade);
  const pos = book?.lab?.pos.find((p) => p.topik.includes(where.code));
  return (
    <MateriView
      materi={materi}
      skills={shelf.skills}
      where={where}
      title={shelf.category.title}
      momoColor={momoColor}
      parts={parts}
      mark={mark}
      back={
        <Link className="kid-btn secondary" to={topicHref}>
          {t('play.lab.toTopic')}
        </Link>
      }
      finish={
        <Link className="kid-btn big-play" to={topicHref}>
          {t('play.lesson.practice')}
        </Link>
      }
      extra={
        pos &&
        book && (
          <Link
            className="lab-to-booklab"
            to={links.book({ domain: book.domain, grade: book.grade })}
          >
            {t('play.lab.toBookLab', { title: book.lab!.judul, pos: pos.judul })}
          </Link>
        )
      }
    />
  );
}

/**
 * Isi Materi Topik tanpa sesi anak (dipakai halaman anak dan pratinjau admin). `parts`/`mark` = progres;
 * `back`/`finish`/`extra` = tautan navigasi dari pemanggil.
 */
export function MateriView({
  materi,
  skills,
  where,
  title,
  momoColor,
  parts,
  mark,
  back,
  finish,
  extra,
}: {
  materi: Materi;
  skills: SkillTemplate[];
  where: { domain: string; grade: string; code: string };
  title: string;
  momoColor: Color;
  parts: Record<string, number>;
  mark: (part: string, stars?: number) => void;
  back?: ReactNode;
  finish?: ReactNode;
  extra?: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>('pahami');
  const [contohAt, setContohAt] = useState<number>();
  // Suara Momo untuk kalimat materi & contoh topik ini (D-091).
  const voiceKey = `${where.domain}~${where.grade}~${where.code}`;
  useLayoutEffect(() => {
    const [domain, grade, code] = voiceKey.split('~') as [string, string, string];
    return pushVoiceLesson({ domain, grade, code });
  }, [voiceKey]);
  useEffect(() => {
    speak(materi.suara);
    return () => stopSpeaking();
  }, [materi]);
  const g = groupOf(where.domain);
  const done = (x: Tab) => (parts[x] ?? -1) >= (x === 'uji' ? 1 : 0);
  const open = (x: Tab) => {
    stopSpeaking();
    setTab(x);
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className={`library lab lab-materi is-${g}`}>
      <PageHead title={materi.judul} sub={title} />
      <section className="lab-hero">
        <Momo own color={momoColor} mood="happy" size={84} />
        <div className="lab-hero-text">
          <h2>{materi.sub}</h2>
          <small>
            {t('play.lab.materiDone', { n: TABS.filter(done).length, of: TABS.length })}
          </small>
        </div>
        <Stars n={parts.uji ?? 0} size={26} />
        <SpeakButton text={materi.suara} />
      </section>
      <div className="lab-tabbar is-5" role="tablist" aria-label={materi.judul}>
        {TABS.map((x) => (
          <button
            key={x}
            type="button"
            role="tab"
            aria-selected={tab === x}
            className={`lab-tab${tab === x ? ' is-on' : ''}${done(x) ? ' is-done' : ''}`}
            onClick={() => open(x)}
          >
            {t(tabLabel(g, x))}
            {done(x) && <span className="lab-tab-check" aria-label={t('play.lab.tabDone')} />}
          </button>
        ))}
      </div>

      <section className="lab-panel" key={tab}>
        {tab === 'pahami' && <Pahami m={materi} onDone={() => mark('pahami', 0)} />}
        {tab === 'eksperimen' && <Eksperimen m={materi} onDone={() => mark('eksperimen', 0)} />}
        {tab === 'contoh' && (
          <Contoh
            m={materi}
            skills={skills}
            at={contohAt}
            onAt={setContohAt}
            onDone={() => mark('contoh', 0)}
          />
        )}
        {tab === 'ingat' && <Ingat m={materi} onDone={() => mark('ingat', 0)} />}
        {tab === 'uji' && (
          <Uji
            skills={skills}
            onStars={(n) => mark('uji', n)}
            onLevel={(level) => {
              setContohAt(level);
              open('contoh');
            }}
          />
        )}
      </section>

      <nav className="lesson-nav">
        {back ?? <span />}
        {tab !== 'uji' ? (
          <button
            type="button"
            className="kid-btn"
            onClick={() => open(TABS[TABS.indexOf(tab) + 1]!)}
          >
            {t('play.lab.nextTab', { tab: t(tabLabel(g, TABS[TABS.indexOf(tab) + 1]!)) })}
          </button>
        ) : (
          finish
        )}
      </nav>
      {extra}
    </main>
  );
}

/* ------------------------------------------------------------ Pahami */

function Pahami({ m, onDone }: { m: Materi; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [part, setPart] = useState<'poster' | 'peragaan' | 'jelajah'>('poster');
  const [jel, setJel] = useState(0);
  const posters = m.pahami.poster;
  useEffect(() => {
    if (i === posters.length - 1) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  const parts = [
    'poster' as const,
    ...(m.pahami.peragaan ? (['peragaan'] as const) : []),
    ...(m.pahami.jelajah ? (['jelajah'] as const) : []),
  ];
  return (
    <>
      {parts.length > 1 && (
        <div className="lab-exp-pick" role="group">
          {parts.map((p) => (
            <button
              key={p}
              type="button"
              className={`lab-chip${part === p ? ' is-on' : ''}`}
              onClick={() => {
                stopSpeaking();
                setPart(p);
              }}
            >
              {t(`play.lab.pahami.${p}` as MessageKey)}
            </button>
          ))}
        </div>
      )}
      {part === 'poster' && (
        <>
          <InfografisScreen key={i} data={posters[i]!} />
          {posters.length > 1 && (
            <div className="lab-pager">
              <button
                type="button"
                className="kid-btn secondary"
                disabled={i === 0}
                onClick={() => setI(i - 1)}
              >
                {t('play.lesson.back')}
              </button>
              <span className="lab-rounds">
                {posters.map((_, k) => (
                  <span key={k} className={k < i ? 'is-done' : k === i ? 'is-now' : undefined} />
                ))}
              </span>
              <button
                type="button"
                className="kid-btn"
                disabled={i === posters.length - 1}
                onClick={() => setI(i + 1)}
              >
                {t('play.lesson.next')}
              </button>
            </div>
          )}
        </>
      )}
      {part === 'peragaan' && m.pahami.peragaan && <PeragaanPlayer adegan={m.pahami.peragaan} />}
      {part === 'jelajah' && m.pahami.jelajah && (
        <>
          {m.pahami.jelajah.length > 1 && (
            <div className="lab-exp-pick" role="group">
              {m.pahami.jelajah.map((x, k) => (
                <button
                  key={k}
                  type="button"
                  className={`lab-chip${jel === k ? ' is-on' : ''}`}
                  onClick={() => {
                    stopSpeaking();
                    setJel(k);
                  }}
                >
                  {x.jenis === 'figur' ? x.figur : x.kartu[0]!.judul}
                </button>
              ))}
            </div>
          )}
          <Explorer key={jel} x={m.pahami.jelajah[jel]!} onDone={() => undefined} />
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------ Eksperimen */

function Eksperimen({ m, onDone }: { m: Materi; onDone: () => void }) {
  const [k, setK] = useState(0);
  const [doneK, setDoneK] = useState<number[]>([]);
  const e = m.eksperimen[k]!;
  useEffect(() => {
    speak(e.suara);
  }, [e]);
  return (
    <>
      {m.eksperimen.length > 1 && (
        <div className="lab-exp-pick" role="group">
          {m.eksperimen.map((x, j) => (
            <button
              key={j}
              type="button"
              className={`lab-chip${j === k ? ' is-on' : ''}${doneK.includes(j) ? ' is-done' : ''}`}
              onClick={() => {
                stopSpeaking();
                setK(j);
              }}
            >
              {x.judul}
            </button>
          ))}
        </div>
      )}
      <div className="lab-panel-say">
        <p>{e.suara}</p>
        <SpeakButton text={e.suara} />
      </div>
      <Experiment
        key={k}
        e={e}
        onDone={() => {
          const next = doneK.includes(k) ? doneK : [...doneK, k];
          setDoneK(next);
          // Cukup separuh percobaan untuk menandai bagian ini dijelajahi.
          if (next.length >= Math.ceil(m.eksperimen.length / 2)) onDone();
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------ Contoh per level (otomatis) */

function Contoh({
  m,
  skills,
  at,
  onAt,
  onDone,
}: {
  m: Materi;
  skills: SkillTemplate[];
  at?: number;
  onAt: (n: number) => void;
  onDone: () => void;
}) {
  const levels = useMemo(
    () => skills.filter((k) => k.family !== 'mock').sort((a, b) => a.order - b.order),
    [skills],
  );
  const [seen, setSeen] = useState<number[]>([]);
  const order = at ?? levels[0]?.order;
  const skill = levels.find((k) => k.order === order);
  useEffect(() => {
    if (order === undefined || seen.includes(order)) return;
    const next = [...seen, order];
    setSeen(next);
    if (next.length === levels.length) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);
  if (!skill) return <p className="lab-hint">{t('play.lab.noQuiz')}</p>;
  const title = levelShortTitle(skill.title);
  const note = m.contoh?.catatan?.[String(skill.order)];
  return (
    <>
      <div className="lab-levels" role="group" aria-label={t('play.lab.levelsLabel')}>
        {levels.map((k) => (
          <button
            key={k.id}
            type="button"
            className={`lab-level${k.order === order ? ' is-on' : ''}${seen.includes(k.order) ? ' is-seen' : ''}`}
            onClick={() => {
              stopSpeaking();
              onAt(k.order);
            }}
          >
            <b>{k.order}</b>
            <span>{levelShortTitle(k.title)}</span>
          </button>
        ))}
      </div>
      <h3 className="lab-exp-title">{t('play.lab.levelN', { n: skill.order, title })}</h3>
      <VideoScreen
        key={skill.id}
        scenes={[
          {
            teks: title,
            suara: contohSay(skill.order, title),
            contoh: { level: skill.order, seed: CONTOH_SEED },
          },
        ]}
        skills={levels}
      />
      {note && (
        <div className="lab-note">
          <strong>{t('play.lab.tip')}</strong>
          <span>{note}</span>
          <SpeakButton text={note} />
        </div>
      )}
      <h3 className="lab-exp-title">{t('play.lab.tryYourself')}</h3>
      <LessonTry
        key={`try-${skill.id}`}
        example={{ level: skill.order, seed: CONTOH_SEED + 1 }}
        skills={levels}
      />
      <p className="lab-count">{t('play.lab.levelsSeen', { n: seen.length, of: levels.length })}</p>
    </>
  );
}

/* ------------------------------------------------------------ Ingat */

function Ingat({ m, onDone }: { m: Materi; onDone: () => void }) {
  const [on, setOn] = useState<number>();
  useEffect(() => {
    if (!m.ingat.rawat) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <ul className="info-tips lab-ingat">
        {m.ingat.poin.map((p: LabIngat, k) => (
          <li key={k}>
            <button
              type="button"
              className={`info-tip${p.tepat ? ' is-good' : ' is-careful'}${on === k ? ' is-on' : ''}`}
              onClick={() => {
                setOn(k);
                speak(`${t(p.tepat ? 'play.info.good' : 'play.info.careful')}: ${p.teks}`);
              }}
            >
              <span className={`lab-ingat-mark${p.tepat ? ' is-good' : ''}`} aria-hidden />
              <span className="lesson-sr">
                {t(p.tepat ? 'play.info.good' : 'play.info.careful')}:
              </span>
              <span>{p.teks}</span>
            </button>
          </li>
        ))}
      </ul>
      {m.ingat.rawat && (
        <>
          <h3 className="lab-exp-title">{t('play.lab.tab.rawat')}</h3>
          <HabitSort rawat={m.ingat.rawat} onDone={onDone} />
        </>
      )}
      {m.ingat.fakta && <FactCards facts={m.ingat.fakta} />}
    </>
  );
}

/* ------------------------------------------------------------ Uji penguasaan (otomatis) */

const UJI_N = 8;

function Uji({
  skills,
  onStars,
  onLevel,
}: {
  skills: SkillTemplate[];
  onStars: (n: number) => void;
  onLevel: (level: number) => void;
}) {
  const [round, setRound] = useState(0);
  const items = useMemo(() => materiQuizItems(skills, UJI_N, round), [skills, round]);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<boolean[]>();
  useEffect(() => {
    speak(t('play.lab.quizSay'));
  }, []);
  if (items.length === 0) return <p className="lab-hint">{t('play.lab.noQuiz')}</p>;
  if (!started)
    return (
      <div className="lab-quiz-start">
        <p>{t('play.lab.quizIntro', { n: items.length })}</p>
        <button
          type="button"
          className="kid-btn big-play"
          onClick={() => (stopSpeaking(), setStarted(true))}
        >
          {t('play.lab.quizStart')}
        </button>
      </div>
    );
  if (result) {
    const right = result.filter(Boolean).length;
    const weak = [...new Set(items.filter((_, k) => !result[k]).map((x) => x.level))].sort(
      (a, b) => a - b,
    );
    return (
      <QuizResult
        right={right}
        total={result.length}
        stars={labStars(right, result.length)}
        onAgain={() => {
          setResult(undefined);
          setRound((r) => r + 1);
        }}
      >
        {weak.length > 0 ? (
          <div className="lab-weak">
            <p>{t('play.lab.weakLevels')}</p>
            <div className="lab-exp-pick">
              {weak.map((l) => (
                <button key={l} type="button" className="lab-chip" onClick={() => onLevel(l)}>
                  {t('play.lab.seeLevel', { n: l })}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <DoneNote text={t('play.lab.allRight')} />
        )}
      </QuizResult>
    );
  }
  return (
    <QuizRunner
      key={round}
      items={items.map((x) => x.item)}
      head={(i) => (
        <span className="lab-quiz-tag">{t('play.lab.levelTag', { n: items[i]!.level })}</span>
      )}
      onFinish={(r) => {
        setResult(r);
        onStars(labStars(r.filter(Boolean).length, r.length));
      }}
    />
  );
}
