import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Color, SkillTemplate } from '@little-coder/engine';
import { speak, stopSpeaking } from '../../audio/speech';
import { useSession } from '../../auth/session';
import { Momo, type MomoMood } from '../../components/Momo';
import { VisualView } from '../../components/visuals';
import { t, type MessageKey } from '../../i18n';
import { bookKey, shelvesOf, useCatalog } from '../catalog';
import { InfografisScreen } from '../Infografis';
import { SpeakButton } from '../ItemPlayer';
import { LessonTry } from '../LessonMedia';
import { useLinks } from '../links';
import { MomoLoader } from '../MomoLoader';
import { PageHead } from '../Profile';
import { materiOf } from './registry';
import type { Bab, Ingat, Langkah, Materi } from './types';
import { ContohPlayer, MainView, StarBadge } from './widgets';
import '../games/games.css';
import '../infografis.css';
import './materi.css';

const STEP_LABEL: Record<Langkah['jenis'], MessageKey> = {
  jelaskan: 'play.materi.step.jelaskan',
  contoh: 'play.materi.step.contoh',
  main: 'play.materi.step.main',
  soal: 'play.materi.step.soal',
  ingat: 'play.materi.step.ingat',
};
const MOOD: Record<Langkah['jenis'], MomoMood> = {
  jelaskan: 'happy',
  contoh: 'happy',
  main: 'curious',
  soal: 'curious',
  ingat: 'proud',
};

/** Bab yang sudah selesai disimpan di perangkat ini saja (kenyamanan, bukan data penting). */
function useDone(token: string) {
  const key = `materi-done:${token}`;
  const [done, setDone] = useState<string[]>(() => {
    try {
      const v: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });
  const mark = (id: string) =>
    setDone((d) => {
      if (d.includes(id)) return d;
      const next = [...d, id];
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* penyimpanan perangkat tidak tersedia: progres hanya untuk sesi ini */
      }
      return next;
    });
  return [done, mark] as const;
}

/**
 * Materi lengkap (purwarupa): peta bab → tiap bab berjalan berurutan (penjelasan, contoh Momo, main, coba soal,
 * ingat). Tidak ada nilai; soal contoh diambil dari level topik ini supaya jenis soalnya sama dengan latihan.
 */
export function MateriLengkapPage({ momoColor }: { momoColor: Color }) {
  const { token = '' } = useParams();
  useSession('child');
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
  const materi = where ? materiOf(where.domain, where.grade, where.code) : undefined;
  const [done, markDone] = useDone(token);
  const [open, setOpen] = useState<number>();

  if (!data || !links) return <MomoLoader color={momoColor} failed={failed} onRetry={retry} />;
  if (!shelf || !where || !materi) {
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

  if (open !== undefined) {
    const bab = materi.bab[open]!;
    return (
      <BabView
        key={bab.id}
        bab={bab}
        no={open + 1}
        total={materi.bab.length}
        skills={shelf.skills}
        momoColor={momoColor}
        onMap={() => setOpen(undefined)}
        onDone={() => markDone(bab.id)}
        onNext={open + 1 < materi.bab.length ? () => setOpen(open + 1) : undefined}
        practiceHref={topicHref}
      />
    );
  }

  const nextIdx = materi.bab.findIndex((b) => !done.includes(b.id));
  return (
    <main className="library materi">
      <PageHead title={materi.judul} sub={shelf.catalog.title} />
      <MateriMap
        materi={materi}
        done={done}
        nextIdx={nextIdx}
        momoColor={momoColor}
        onOpen={setOpen}
        practiceHref={topicHref}
      />
    </main>
  );
}

function MateriMap({
  materi,
  done,
  nextIdx,
  momoColor,
  onOpen,
  practiceHref,
}: {
  materi: Materi;
  done: string[];
  nextIdx: number;
  momoColor: Color;
  onOpen: (k: number) => void;
  practiceHref: string;
}) {
  const doneCount = materi.bab.filter((b) => done.includes(b.id)).length;
  const intro = `${materi.sub} ${t('play.materi.mapSay', { n: materi.bab.length })}`;
  useEffect(() => () => stopSpeaking(), []);
  return (
    <>
      <section className="m-hero">
        <Momo
          own
          color={momoColor}
          mood={doneCount === materi.bab.length ? 'proud' : 'happy'}
          size={96}
        />
        <div className="m-hero-text">
          <h2>{t('play.materi.mapTitle')}</h2>
          <p>{materi.sub}</p>
          <div
            className="m-hero-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={materi.bab.length}
            aria-valuenow={doneCount}
            aria-label={t('play.materi.doneOf', { n: doneCount, of: materi.bab.length })}
          >
            <span style={{ width: `${(doneCount / materi.bab.length) * 100}%` }} />
          </div>
          <small>{t('play.materi.doneOf', { n: doneCount, of: materi.bab.length })}</small>
        </div>
        <SpeakButton text={intro} />
      </section>

      {nextIdx >= 0 ? (
        <button
          type="button"
          className="kid-btn big-play m-continue"
          onClick={() => onOpen(nextIdx)}
        >
          {t(nextIdx === 0 && doneCount === 0 ? 'play.materi.start' : 'play.materi.continue', {
            n: nextIdx + 1,
            title: materi.bab[nextIdx]!.judul,
          })}
        </button>
      ) : (
        <Link className="kid-btn big-play m-continue" to={practiceHref}>
          {t('play.materi.allDone')}
        </Link>
      )}

      <ol className="m-path">
        {materi.bab.map((b, k) => {
          const isDone = done.includes(b.id);
          const isNext = k === nextIdx;
          return (
            <li key={b.id} className={`${isDone ? 'is-done' : ''}${isNext ? ' is-next' : ''}`}>
              <button
                type="button"
                className="m-bab"
                onClick={() => onOpen(k)}
                aria-label={`${t('play.materi.babNo', { n: k + 1 })}: ${b.judul}. ${isDone ? t('play.materi.babDone') : ''}`}
              >
                <span className="m-bab-no" aria-hidden>
                  {isDone ? <CheckMark /> : k + 1}
                </span>
                <span className="m-bab-pic" aria-hidden>
                  <VisualView visual={b.ikon} size={56} />
                </span>
                <span className="m-bab-text">
                  <strong>{b.judul}</strong>
                  <span>{b.ringkas}</span>
                  <small>
                    {b.level.map((l) => t('play.materi.levelChip', { n: l })).join(' · ')}
                  </small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function BabView({
  bab,
  no,
  total,
  skills,
  momoColor,
  onMap,
  onDone,
  onNext,
  practiceHref,
}: {
  bab: Bab;
  no: number;
  total: number;
  skills: SkillTemplate[];
  momoColor: Color;
  onMap: () => void;
  onDone: () => void;
  onNext?: () => void;
  practiceHref: string;
}) {
  const [i, setI] = useState(0);
  const [finished, setFinished] = useState(false);
  const step = bab.langkah[i]!;
  const last = i === bab.langkah.length - 1;

  useEffect(() => {
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
    // Contoh Momo & permainan membacakan dirinya sendiri; layar lain dibacakan saat dibuka.
    if (!finished && (step.jenis === 'jelaskan' || step.jenis === 'soal' || step.jenis === 'ingat'))
      speak(step.suara);
    return () => stopSpeaking();
  }, [step, finished]);

  if (finished) {
    return (
      <main className="library materi">
        <PageHead title={t('play.materi.babNo', { n: no })} sub={bab.judul} />
        <section className="m-finish">
          <Momo own color={momoColor} mood="proud" size={130} />
          <StarBadge size={72} />
          <h2>{t('play.materi.babFinished', { title: bab.judul })}</h2>
          <p>{t('play.materi.babFinishedSub')}</p>
          <div className="m-finish-actions">
            {onNext ? (
              <button type="button" className="kid-btn big-play" onClick={onNext}>
                {t('play.materi.nextBab', { n: no + 1 })}
              </button>
            ) : (
              <Link className="kid-btn big-play" to={practiceHref}>
                {t('play.lesson.practice')}
              </Link>
            )}
            <button type="button" className="kid-btn secondary" onClick={onMap}>
              {t('play.materi.toMap')}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="library materi lesson-player">
      <PageHead title={t('play.materi.babOf', { n: no, of: total })} sub={bab.judul} />
      <ol
        className="m-steps"
        aria-label={t('play.lesson.progress', { n: i + 1, of: bab.langkah.length })}
      >
        {bab.langkah.map((l, k) => (
          <li key={k} className={k < i ? 'is-done' : k === i ? 'is-now' : undefined}>
            <button
              type="button"
              onClick={() => setI(k)}
              aria-current={k === i ? 'step' : undefined}
            >
              <span aria-hidden>{k < i ? <CheckMark /> : k + 1}</span>
              <small>{t(STEP_LABEL[l.jenis])}</small>
            </button>
          </li>
        ))}
      </ol>
      <section className={`lesson-card m-card is-${step.jenis}`} key={i}>
        <div className="lesson-say">
          <Momo own color={momoColor} mood={MOOD[step.jenis]} size={84} />
          <SpeakButton text={step.suara} />
          <div className="m-say-text">
            <span className="m-chip">{t(STEP_LABEL[step.jenis])}</span>
            <p>{step.teks}</p>
          </div>
        </div>
        <StepBody step={step} skills={skills} />
      </section>
      <nav className="lesson-nav">
        {i > 0 ? (
          <button type="button" className="kid-btn secondary" onClick={() => setI(i - 1)}>
            {t('play.lesson.back')}
          </button>
        ) : (
          <button type="button" className="kid-btn secondary" onClick={onMap}>
            {t('play.materi.toMap')}
          </button>
        )}
        {last ? (
          <button
            type="button"
            className="kid-btn big-play"
            onClick={() => {
              onDone();
              setFinished(true);
            }}
          >
            {t('play.materi.finishBab')}
          </button>
        ) : (
          <button type="button" className="kid-btn" onClick={() => setI(i + 1)}>
            {t('play.lesson.next')}
          </button>
        )}
      </nav>
    </main>
  );
}

function StepBody({ step, skills }: { step: Langkah; skills: SkillTemplate[] }) {
  switch (step.jenis) {
    case 'jelaskan':
      return <InfografisScreen data={step.poster} />;
    case 'contoh':
      return <ContohPlayer adegan={step.adegan} />;
    case 'main':
      return <MainStep step={step} />;
    case 'soal':
      return <LessonTry example={{ level: step.level, seed: step.seed }} skills={skills} />;
    case 'ingat':
      return <IngatList poin={step.poin} />;
  }
}

/** Petunjuk permainan dibacakan dulu; permainannya baru bicara sesudahnya. */
function MainStep({ step }: { step: Extract<Langkah, { jenis: 'main' }> }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    speak(step.suara, { onEnd: () => setReady(true) });
    // Bila suara tidak tersedia, permainan tetap bisa dimulai lewat tombol.
    return () => stopSpeaking();
  }, [step]);
  if (!ready)
    return (
      <div className="m-ready">
        <button
          type="button"
          className="kid-btn big-play"
          onClick={() => (stopSpeaking(), setReady(true))}
        >
          {t('play.materi.letsPlay')}
        </button>
      </div>
    );
  return <MainView main={step.main} />;
}

function IngatList({ poin }: { poin: Ingat[] }) {
  const [on, setOn] = useState<number>();
  return (
    <ul className="info-tips m-ingat">
      {poin.map((p, k) => (
        <li key={k}>
          <button
            type="button"
            className={`info-tip${p.tepat ? ' is-good' : ' is-careful'}${on === k ? ' is-on' : ''}`}
            onClick={() => {
              setOn(k);
              speak(`${t(p.tepat ? 'play.info.good' : 'play.info.careful')}: ${p.teks}`);
            }}
          >
            {p.tepat ? <CheckMark /> : <CarefulMark />}
            <span className="lesson-sr">
              {t(p.tepat ? 'play.info.good' : 'play.info.careful')}:
            </span>
            <span>{p.teks}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#2e9e5b" />
      <path
        d="M7 12.5l3.2 3.2L17 9"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function CarefulMark() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#eda100" />
      <path d="M12 6.5v7" stroke="#2b2540" strokeWidth="3" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1.7" fill="#2b2540" />
    </svg>
  );
}
