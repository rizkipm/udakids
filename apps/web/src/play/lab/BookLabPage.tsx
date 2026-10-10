import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  groupOf,
  labExamItems,
  labQuizPool,
  labStars,
  OBJECTS,
  pickRound,
  SENSE_IDS,
  SENSES,
  type BookLab,
  type BookLabStation,
  type Catalog,
  type Color,
  type SenseId,
  type SkillTemplate,
} from '@little-coder/engine';
import { speak, stopSpeaking } from '../../audio/speech';
import { Momo } from '../../components/Momo';
import { VisualView } from '../../components/visuals';
import { SenseIcon } from '../../components/visuals/senses';
import { t, type MessageKey } from '../../i18n';
import { bookKey, shelvesOf, useCatalog } from '../catalog';
import { SpeakButton } from '../ItemPlayer';
import { useLinks } from '../links';
import { MomoLoader } from '../MomoLoader';
import { PageHead } from '../Profile';
import { Experiment, Explorer, FactCards, HabitSort } from './experiments';
import { LabPicView } from './pic';
import { useLabProgress } from './progress';
import { QuizResult, QuizRunner, Stars } from './quiz';
import { DoneNote } from './ui';
import '../games/games.css';
import '../infografis.css';
import './lab.css';
import './lab-math.css';

type Tab = 'jelajah' | 'eksperimen' | 'rawat' | 'uji';
const TAB_LABEL: Record<Tab, MessageKey> = {
  jelajah: 'play.lab.tab.kenali',
  eksperimen: 'play.lab.tab.eksperimen',
  rawat: 'play.lab.tab.rawat',
  uji: 'play.lab.tab.uji',
};
const tabsOf = (p: BookLabStation): Tab[] =>
  p.rawat ? ['jelajah', 'eksperimen', 'rawat', 'uji'] : ['jelajah', 'eksperimen', 'uji'];

type View =
  { kind: 'hub' } | { kind: 'pos'; id: string } | { kind: 'gabungan' } | { kind: 'ujian' };

/** Lab Buku (D-109): ruang lab satu buku/jenjang. `/play/lab/:token`. */
export function BookLabPage({ momoColor }: { momoColor: Color }) {
  const { token = '' } = useParams();
  const { data, failed, retry } = useCatalog();
  const links = useLinks(data);
  const where = links?.bookOf(token);
  const book = useMemo(() => {
    if (!data || !where) return undefined;
    const catalog = data.catalogs.find((c) => c.domain === where.domain && c.grade === where.grade);
    const shelves = shelvesOf(data).filter(
      (s) => bookKey(s.catalog) === `${where.domain}/${where.grade}`,
    );
    return catalog ? { catalog, skills: shelves.flatMap((s) => s.skills) } : undefined;
  }, [data, where]);
  const lab = book?.catalog.lab;
  const labKey = where ? `${where.domain}/${where.grade}` : '';
  const { parts, mark } = useLabProgress(labKey);

  if (!data || !links) return <MomoLoader color={momoColor} failed={failed} onRetry={retry} />;
  if (!book || !lab) {
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
  const cat = book.catalog;
  return (
    <BookLabView
      lab={lab}
      catalog={cat}
      skills={book.skills}
      momoColor={momoColor}
      parts={parts}
      mark={mark}
      topicLink={(code, materi) =>
        (materi ? links.materi : links.topic)({
          domain: cat.domain,
          grade: cat.grade,
          category: code,
        })
      }
    />
  );
}

/**
 * Isi Lab Buku tanpa sesi anak (halaman anak dan pratinjau admin). `topicLink` kosong = topik tampil tanpa
 * tautan (pratinjau).
 */
export function BookLabView({
  lab,
  catalog,
  skills,
  momoColor,
  parts,
  mark,
  topicLink,
}: {
  lab: BookLab;
  catalog: Catalog;
  skills: SkillTemplate[];
  momoColor: Color;
  parts: Record<string, number>;
  mark: (part: string, stars?: number) => void;
  topicLink?: (code: string, materi: boolean) => string;
}) {
  const [view, setView] = useState<View>({ kind: 'hub' });
  useEffect(() => {
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
    return () => stopSpeaking();
  }, [view]);
  const hub = () => setView({ kind: 'hub' });

  if (view.kind === 'pos') {
    const p = lab.pos.find((x) => x.id === view.id)!;
    return (
      <StationView
        key={p.id}
        station={p}
        catalog={catalog}
        skills={skills}
        topicLink={topicLink}
        parts={parts}
        mark={mark}
        onHub={hub}
      />
    );
  }
  if (view.kind === 'gabungan' && lab.gabungan)
    return (
      <main className="library lab">
        <PageHead title={t('play.lab.comboTitle')} sub={lab.judul} />
        <ComboLab data={lab.gabungan} onDone={() => mark('gabung', 1)} />
        <nav className="lesson-nav">
          <button type="button" className="kid-btn secondary" onClick={hub}>
            {t('play.lab.toLab')}
          </button>
        </nav>
      </main>
    );
  if (view.kind === 'ujian')
    return (
      <main className="library lab">
        <PageHead title={t('play.lab.examTitle')} sub={lab.judul} />
        <Exam
          lab={lab}
          skills={skills}
          momoColor={momoColor}
          onStars={(n) => mark('ujian', n)}
          onStation={(id) => setView({ kind: 'pos', id })}
          onHub={hub}
        />
      </main>
    );

  const total = lab.pos.length * 3;
  const got = lab.pos.reduce((a, p) => a + (parts[`uji:${p.id}`] ?? 0), 0);
  return (
    <main className="library lab">
      <PageHead title={lab.judul} sub={catalog.title} />
      <Hub lab={lab} got={got} total={total} parts={parts} momoColor={momoColor} onView={setView} />
    </main>
  );
}

function Hub({
  lab,
  got,
  total,
  parts,
  momoColor,
  onView,
}: {
  lab: BookLab;
  got: number;
  total: number;
  parts: Record<string, number>;
  momoColor: Color;
  onView: (v: View) => void;
}) {
  useEffect(() => {
    speak(lab.suara);
  }, [lab.suara]);
  return (
    <>
      <section className="lab-hero">
        <Momo own color={momoColor} mood={got === total ? 'proud' : 'happy'} size={92} />
        <div className="lab-hero-text">
          <h2>{lab.sub}</h2>
          <div className="lab-meter" aria-label={t('play.lab.mastery', { n: got, of: total })}>
            <span style={{ width: `${(got / total) * 100}%` }} />
          </div>
          <small>{t('play.lab.mastery', { n: got, of: total })}</small>
        </div>
        <SpeakButton text={lab.suara} />
      </section>
      <ol className="lab-pos-grid">
        {lab.pos.map((p) => {
          const tabs = tabsOf(p);
          const done = tabs.filter(
            (tab) => (parts[`${tab}:${p.id}`] ?? -1) >= (tab === 'uji' ? 1 : 0),
          ).length;
          return (
            <li key={p.id}>
              <button
                type="button"
                className="lab-pos-card"
                onClick={() => onView({ kind: 'pos', id: p.id })}
              >
                <span className="lab-pos-card-pic">
                  <LabPicView pic={p.ikon} size={120} alt={p.judul} />
                </span>
                <strong>{p.judul}</strong>
                <span>{p.sub}</span>
                <span className="lab-pos-card-foot">
                  <span
                    className="lab-tabs-mini"
                    aria-label={t('play.lab.tabsDone', { n: done, of: tabs.length })}
                  >
                    {tabs.map((tab) => (
                      <i
                        key={tab}
                        className={(parts[`${tab}:${p.id}`] ?? -1) >= 0 ? 'is-on' : undefined}
                      />
                    ))}
                  </span>
                  <Stars n={parts[`uji:${p.id}`] ?? 0} size={20} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="lab-extra">
        {lab.gabungan && (
          <button
            type="button"
            className="lab-extra-card is-combo"
            onClick={() => onView({ kind: 'gabungan' })}
          >
            <span className="lab-combo-icons" aria-hidden>
              {SENSE_IDS.map((s) => (
                <svg key={s} viewBox="0 0 100 100">
                  <SenseIcon sense={s} />
                </svg>
              ))}
            </span>
            <strong>{t('play.lab.comboTitle')}</strong>
            <span>{t('play.lab.comboSub')}</span>
          </button>
        )}
        <button
          type="button"
          className="lab-extra-card is-exam"
          onClick={() => onView({ kind: 'ujian' })}
        >
          <Stars n={parts.ujian ?? 0} size={36} />
          <strong>{t('play.lab.examTitle')}</strong>
          <span>{t('play.lab.examSub')}</span>
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ Pos */

function StationView({
  station,
  catalog,
  skills,
  topicLink,
  parts,
  mark,
  onHub,
}: {
  station: BookLabStation;
  catalog: Catalog;
  skills: SkillTemplate[];
  topicLink?: (code: string, materi: boolean) => string;
  parts: Record<string, number>;
  mark: (part: string, stars?: number) => void;
  onHub: () => void;
}) {
  const tabs = tabsOf(station);
  const [tab, setTab] = useState<Tab>('jelajah');
  const [exp, setExp] = useState(0);
  const [expDone, setExpDone] = useState<number[]>([]);
  const done = (x: Tab) => (parts[`${x}:${station.id}`] ?? -1) >= (x === 'uji' ? 1 : 0);
  useEffect(() => {
    speak(station.suara);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const open = (next: Tab) => {
    setTab(next);
    stopSpeaking();
    if (next === 'eksperimen') speak(station.eksperimen[exp]!.suara);
    if (next === 'rawat' && station.rawat) speak(station.rawat.suara);
    if (next === 'uji') speak(t('play.lab.quizSay'));
  };
  const e = station.eksperimen[exp]!;
  const topics = station.topik
    .map((code) => catalog.categories.find((c) => c.code === code))
    .filter((c): c is Catalog['categories'][number] => !!c);
  return (
    <main className="library lab lab-pos">
      <PageHead title={station.judul} sub={catalog.title} />
      <div className="lab-pos-head">
        <span className="lab-pos-icon">
          <LabPicView pic={station.ikon} size={64} alt={station.judul} />
        </span>
        <p>{station.sub}</p>
        <SpeakButton text={station.suara} />
      </div>
      <div className="lab-tabbar" role="tablist" aria-label={station.judul}>
        {tabs.map((x) => (
          <button
            key={x}
            type="button"
            role="tab"
            aria-selected={tab === x}
            className={`lab-tab${tab === x ? ' is-on' : ''}${done(x) ? ' is-done' : ''}`}
            onClick={() => open(x)}
          >
            {t(TAB_LABEL[x])}
            {done(x) && <span className="lab-tab-check" aria-label={t('play.lab.tabDone')} />}
          </button>
        ))}
      </div>
      <section className="lab-panel" key={tab}>
        {tab === 'jelajah' && (
          <>
            <Explorer x={station.jelajah} onDone={() => mark(`jelajah:${station.id}`, 0)} />
            <FactCards facts={station.fakta} />
          </>
        )}
        {tab === 'eksperimen' && (
          <>
            {station.eksperimen.length > 1 && (
              <div className="lab-exp-pick" role="group">
                {station.eksperimen.map((x, k) => (
                  <button
                    key={k}
                    type="button"
                    className={`lab-chip${k === exp ? ' is-on' : ''}${expDone.includes(k) ? ' is-done' : ''}`}
                    onClick={() => {
                      setExp(k);
                      stopSpeaking();
                      speak(x.suara);
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
              key={exp}
              e={e}
              onDone={() => {
                const next = expDone.includes(exp) ? expDone : [...expDone, exp];
                setExpDone(next);
                if (next.length === station.eksperimen.length) mark(`eksperimen:${station.id}`, 0);
              }}
            />
          </>
        )}
        {tab === 'rawat' && station.rawat && (
          <HabitSort rawat={station.rawat} onDone={() => mark(`rawat:${station.id}`, 0)} />
        )}
        {tab === 'uji' && (
          <StationQuiz
            station={station}
            skills={skills}
            onStars={(n) => mark(`uji:${station.id}`, n)}
          />
        )}
      </section>
      {topics.length > 0 && (
        <section className="lab-topics">
          <h3>{t('play.lab.topicsTitle')}</h3>
          <div className="lab-topic-row">
            {topics.map((c) => {
              const body = (
                <>
                  <strong>{c.title}</strong>
                  <small>
                    {c.materi ? t('play.lab.topicMateri') : t('play.lab.topicPractice')}
                  </small>
                </>
              );
              const cls = `lab-topic${c.materi ? ' has-materi' : ''}`;
              return topicLink ? (
                <Link key={c.code} className={cls} to={topicLink(c.code, !!c.materi)}>
                  {body}
                </Link>
              ) : (
                <span key={c.code} className={cls}>
                  {body}
                </span>
              );
            })}
          </div>
        </section>
      )}
      <nav className="lesson-nav">
        <button type="button" className="kid-btn secondary" onClick={onHub}>
          {t('play.lab.toLab')}
        </button>
        {tab !== 'uji' && (
          <button
            type="button"
            className="kid-btn"
            onClick={() => open(tabs[tabs.indexOf(tab) + 1]!)}
          >
            {t('play.lab.nextTab', { tab: t(TAB_LABEL[tabs[tabs.indexOf(tab) + 1]!]) })}
          </button>
        )}
      </nav>
    </main>
  );
}

const QUIZ_N = 4;

function StationQuiz({
  station,
  skills,
  onStars,
}: {
  station: BookLabStation;
  skills: SkillTemplate[];
  onStars: (n: number) => void;
}) {
  const pool = useMemo(() => labQuizPool(skills, station.uji, station.saring), [skills, station]);
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<boolean[]>();
  const [started, setStarted] = useState(false);
  const items = useMemo(() => pickRound(pool, QUIZ_N, round), [pool, round]);
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
    return (
      <QuizResult
        right={right}
        total={result.length}
        stars={labStars(right, result.length)}
        onAgain={() => {
          setResult(undefined);
          setRound((r) => r + 1);
        }}
      />
    );
  }
  return (
    <QuizRunner
      key={round}
      items={items}
      onFinish={(r) => {
        setResult(r);
        onStars(labStars(r.filter(Boolean).length, r.length));
      }}
    />
  );
}

function Exam({
  lab,
  skills,
  momoColor,
  onStars,
  onStation,
  onHub,
}: {
  lab: BookLab;
  skills: SkillTemplate[];
  momoColor: Color;
  onStars: (n: number) => void;
  onStation: (id: string) => void;
  onHub: () => void;
}) {
  const [round, setRound] = useState(0);
  const items = useMemo(() => labExamItems(skills, lab.ujian.soal, round), [skills, lab, round]);
  const [started, setStarted] = useState(false);
  const [map, setMap] = useState<Record<string, [number, number]>>();
  useEffect(() => {
    speak(lab.ujian.suara);
  }, [lab.ujian.suara]);
  // Soal → pos: kata saring pos dulu, lalu pos yang memuat topik soal itu.
  const posOf = (k: number) => {
    const x = items[k]!;
    const g = groupOf(
      x.item,
      lab.pos.map((p) => p.saring),
    );
    if (g >= 0) return lab.pos[g]!.id;
    return lab.pos.find((p) => p.topik.includes(x.ref.topik))?.id ?? 'umum';
  };
  if (map) {
    const right = Object.values(map).reduce((a, x) => a + x[0], 0);
    const total = Object.values(map).reduce((a, x) => a + x[1], 0);
    const weakest = lab.pos
      .filter((p) => map[p.id]?.[1])
      .sort((a, b) => map[a.id]![0] / map[a.id]![1] - map[b.id]![0] / map[b.id]![1])[0];
    return (
      <section className="lab-panel">
        <div className="lab-panel-say">
          <Momo own color={momoColor} mood="proud" size={80} />
          <p>{lab.ujian.selesai}</p>
          <SpeakButton text={lab.ujian.selesai} />
        </div>
        <Stars n={labStars(right, total)} size={52} />
        <p className="lab-score">{t('play.lab.examScore', { n: right, of: total })}</p>
        <ul className="lab-map">
          {lab.pos.map((p) => {
            const [r, n] = map[p.id] ?? [0, 0];
            return (
              <li key={p.id}>
                <span className="lab-map-pic">
                  <LabPicView pic={p.ikon} size={40} alt={p.judul} />
                </span>
                <strong>{p.judul}</strong>
                <span className="lab-map-bar">
                  <span style={{ width: n ? `${(r / n) * 100}%` : '0%' }} />
                </span>
                <small>{n ? t('play.lab.mapOf', { n: r, of: n }) : t('play.lab.mapNone')}</small>
                <button type="button" className="lab-chip" onClick={() => onStation(p.id)}>
                  {t('play.lab.goStation')}
                </button>
              </li>
            );
          })}
        </ul>
        {weakest && map[weakest.id]![0] < map[weakest.id]![1] && (
          <p className="lab-hint">{t('play.lab.suggest', { sense: weakest.judul })}</p>
        )}
        <nav className="lesson-nav">
          <button type="button" className="kid-btn secondary" onClick={onHub}>
            {t('play.lab.toLab')}
          </button>
          <button
            type="button"
            className="kid-btn"
            onClick={() => {
              setMap(undefined);
              setStarted(false);
              setRound((r) => r + 1);
            }}
          >
            {t('play.lab.quizAgain')}
          </button>
        </nav>
      </section>
    );
  }
  if (!started)
    return (
      <section className="lab-panel">
        <div className="lab-panel-say">
          <Momo own color={momoColor} mood="curious" size={80} />
          <p>{lab.ujian.suara}</p>
          <SpeakButton text={lab.ujian.suara} />
        </div>
        <p className="lab-hint">{t('play.lab.examCount', { n: items.length })}</p>
        <nav className="lesson-nav">
          <button type="button" className="kid-btn secondary" onClick={onHub}>
            {t('play.lab.toLab')}
          </button>
          <button
            type="button"
            className="kid-btn big-play"
            onClick={() => (stopSpeaking(), setStarted(true))}
          >
            {t('play.lab.quizStart')}
          </button>
        </nav>
      </section>
    );
  return (
    <section className="lab-panel">
      <QuizRunner
        items={items.map((x) => x.item)}
        head={(i) => {
          const id = posOf(i);
          const p = lab.pos.find((x) => x.id === id);
          return p ? <span className="lab-quiz-tag">{p.judul}</span> : null;
        }}
        onFinish={(results) => {
          const out: Record<string, [number, number]> = {};
          items.forEach((_, k) => {
            const id = posOf(k);
            const [r, n] = out[id] ?? [0, 0];
            out[id] = [r + (results[k] ? 1 : 0), n + 1];
          });
          setMap(out);
          onStars(labStars(results.filter(Boolean).length, results.length));
        }}
      />
    </section>
  );
}

/* ------------------------------------------------------------ Lab Gabungan */

function ComboLab({
  data,
  onDone,
}: {
  data: NonNullable<BookLab['gabungan']>;
  onDone: () => void;
}) {
  const [b, setB] = useState(0);
  const [tried, setTried] = useState<SenseId[]>([]);
  const [on, setOn] = useState<SenseId>();
  const obj = data.benda[b]!;
  useEffect(() => {
    speak(data.suara);
  }, [data.suara]);
  const pick = (k: number) => {
    setB(k);
    setTried([]);
    setOn(undefined);
    speak(t('play.lab.comboPick', { obj: OBJECTS[data.benda[k]!.benda].say }));
  };
  const tap = (s: SenseId) => {
    const x = obj.indra.find((i) => i.indra === s)!;
    setOn(s);
    const next = tried.includes(s) ? tried : [...tried, s];
    setTried(next);
    const all = next.length === 5;
    speak(all && !tried.includes(s) ? `${x.suara} ${data.selesai}` : x.suara);
    if (all) onDone();
  };
  const active = on ? obj.indra.find((i) => i.indra === on) : undefined;
  return (
    <section className="lab-panel lab-combo">
      <div className="lab-combo-pick" role="group" aria-label={t('play.lab.comboObjects')}>
        {data.benda.map((x, k) => (
          <button
            key={x.benda}
            type="button"
            className={`lab-combo-obj${k === b ? ' is-on' : ''}`}
            aria-label={OBJECTS[x.benda].say}
            onClick={() => pick(k)}
          >
            <VisualView visual={{ kind: 'object', object: x.benda }} size={60} />
          </button>
        ))}
      </div>
      <div className="lab-combo-ring" key={b}>
        <span className="lab-combo-center">
          <VisualView visual={{ kind: 'object', object: obj.benda }} size={130} />
        </span>
        {SENSE_IDS.map((s, k) => {
          const x = obj.indra.find((i) => i.indra === s)!;
          const done = tried.includes(s);
          return (
            <button
              key={s}
              type="button"
              className={`lab-combo-sense p${k}${done ? (x.ya ? ' is-yes' : ' is-no') : ''}${on === s ? ' is-on' : ''}`}
              aria-label={SENSES[s].say}
              onClick={() => tap(s)}
            >
              <svg viewBox="0 0 100 100" aria-hidden>
                <SenseIcon sense={s} />
              </svg>
              {done && <span className={`lab-combo-mark${x.ya ? ' is-yes' : ''}`} aria-hidden />}
            </button>
          );
        })}
      </div>
      {active ? (
        <p className={`lab-combo-say${active.ya ? ' is-yes' : ''}`}>{active.suara}</p>
      ) : (
        <p className="lab-hint">{t('play.lab.comboHint')}</p>
      )}
      {tried.length === 5 && (
        <DoneNote text={t('play.lab.comboCount', { n: obj.indra.filter((i) => i.ya).length })} />
      )}
    </section>
  );
}
