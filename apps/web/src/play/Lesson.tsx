import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  GLYPH_HEIGHT,
  glyphOf,
  numberWord,
  strokePath,
  type Color,
  type LessonCard,
  type LessonScreen,
  type ObjectId,
} from '@little-coder/engine';
import { speak, stopSpeaking } from '../audio/speech';
import { useSession } from '../auth/session';
import { Momo, type MomoMood } from '../components/Momo';
import { VisualView } from '../components/visuals';
import { t } from '../i18n';
import { shelvesOf, useCatalog, bookKey } from './catalog';
import { TraceBoard } from './games/TraceBoard';
import { SpeakButton } from './ItemPlayer';
import { useLinks } from './links';
import { PageHead } from './Profile';
import './games/games.css';

/** Warna angka 0–10 (cerah, kontras dengan huruf putih + garis tepi gelap). */
const NUM_COLOR = [
  '#6c757d',
  '#e63946',
  '#f3722c',
  '#e9a400',
  '#43aa8b',
  '#277da1',
  '#5b3fd6',
  '#b5179e',
  '#d1495b',
  '#2a9d8f',
  '#7b2cbf',
];
const numColor = (n: number) => NUM_COLOR[n % NUM_COLOR.length]!;

/**
 * Pemutar pelajaran (Belajar, D-068): 3–6 layar dari `category.lesson`, semua dibacakan, tanpa nilai.
 * Setelah layar terakhir, anak diarahkan ke latihan (level topik). Bekerja offline (data dari katalog).
 */
export function LessonPage({ momoColor }: { momoColor: Color }) {
  const { token = '' } = useParams();
  useSession('child');
  const { data } = useCatalog();
  const links = useLinks(data);
  const where = links?.topicOf(token);
  const shelf = useMemo(() => {
    if (!data || !where) return undefined;
    return shelvesOf(data).find(
      (s) =>
        bookKey(s.catalog) === `${where.domain}/${where.grade}` && s.category.code === where.code,
    );
  }, [data, where]);
  const lesson = shelf?.category.lesson;
  const [i, setI] = useState(0);
  const screen = lesson?.layar[i];

  useEffect(() => {
    if (screen) speak(screen.suara);
    return () => stopSpeaking();
  }, [screen]);

  if (!data || !links) {
    return (
      <main className="kid-screen">
        <Momo own color={momoColor} mood="idle" size={140} />
        <p className="kid-note">{t('play.library.loading')}</p>
      </main>
    );
  }
  if (!shelf || !lesson || !screen || !where) {
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
  const last = i === lesson.layar.length - 1;

  return (
    <main className="library lesson-player">
      <PageHead title={lesson.judul} sub={shelf.category.title} />
      <div
        className="lesson-progress"
        aria-label={t('play.lesson.progress', { n: i + 1, of: lesson.layar.length })}
      >
        {lesson.layar.map((_, k) => (
          <span key={k} className={k <= i ? 'is-on' : undefined} />
        ))}
      </div>
      <section className="lesson-card" key={i}>
        <div className="lesson-say">
          <Momo own color={momoColor} mood={moodOf(screen)} size={84} />
          <SpeakButton text={screen.suara} />
          <p>{screen.teks}</p>
        </div>
        <ScreenBody screen={screen} />
      </section>
      <nav className="lesson-nav">
        {i > 0 ? (
          <button type="button" className="kid-btn secondary" onClick={() => setI(i - 1)}>
            {t('play.lesson.back')}
          </button>
        ) : (
          <Link className="kid-btn secondary" to={topicHref}>
            {t('play.lesson.back')}
          </Link>
        )}
        {last ? (
          <Link className="kid-btn big-play" to={topicHref}>
            {t('play.lesson.practice')}
          </Link>
        ) : (
          <button type="button" className="kid-btn" onClick={() => setI(i + 1)}>
            {t('play.lesson.next')}
          </button>
        )}
      </nav>
    </main>
  );
}

const moodOf = (s: LessonScreen): MomoMood =>
  s.jenis === 'ingat' ? 'proud' : s.jenis === 'coba' ? 'curious' : 'happy';

function ScreenBody({ screen }: { screen: LessonScreen }) {
  switch (screen.jenis) {
    case 'kenalan':
    case 'ingat':
      return screen.angka ? (
        <NumberStrip
          numbers={screen.angka}
          object={screen.gambar?.[0]}
          words={screen.jenis === 'ingat'}
        />
      ) : null;
    case 'kata':
      return (
        <WordCards
          cards={
            screen.kartu ??
            (screen.sukuKata
              ? [
                  {
                    angka: screen.angka?.[0] ?? 0,
                    kata: screen.sukuKata.replaceAll('-', ''),
                    sukuKata: screen.sukuKata,
                    gambar: screen.gambar?.[0] ?? 'apel',
                  },
                ]
              : [])
          }
        />
      );
    case 'coba':
      return screen.mode === 'hitung' ? (
        <CountTry n={screen.angka![0]!} object={screen.gambar![0]!} />
      ) : (
        <TraceTry numbers={screen.angka ?? [1]} />
      );
    default:
      return null;
  }
}

/** Deretan angka besar: ketuk → angka disebut, Momo menuliskannya, dan benda sebanyak angka itu muncul. */
function NumberStrip({
  numbers,
  object,
  words,
}: {
  numbers: number[];
  object?: ObjectId;
  words?: boolean;
}) {
  const [on, setOn] = useState<number>();
  const tap = (n: number) => {
    setOn(n);
    speak(n === 0 ? 'Nol' : numberWord(n));
  };
  return (
    <>
      <div className="number-strip" role="group" aria-label={t('play.lesson.numbers')}>
        {numbers.map((n) => (
          <button
            key={n}
            type="button"
            className={`number-tile${on === n ? ' is-on' : ''}`}
            style={{ background: numColor(n) }}
            aria-label={numberWord(n)}
            onClick={() => tap(n)}
          >
            {n}
          </button>
        ))}
      </div>
      {words && <p className="kid-note">{numbers.map((n) => numberWord(n)).join(', ')}</p>}
      {on !== undefined && (
        <div className="number-focus" key={on}>
          <GlyphWrite n={on} color={numColor(on)} />
          {object && on > 0 && (
            <div className="number-focus-objects" aria-label={`${on} ${object}`}>
              <VisualView
                visual={{ kind: 'objects', object, count: on, layout: on <= 5 ? 'row' : 'rows' }}
                size={170}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Momo "menulis" angka: goresan bernomor muncul satu per satu (animasi garis). */
export function GlyphWrite({ n, color, size = 150 }: { n: number; color: string; size?: number }) {
  const g = glyphOf(n);
  const pad = 12;
  const w = g.width + pad * 2;
  const h = GLYPH_HEIGHT + pad * 2;
  return (
    <svg
      viewBox={`${-pad} ${-pad} ${w} ${h}`}
      width={(size * w) / h}
      height={size}
      className="glyph-write"
      aria-hidden
    >
      {g.strokes.map((s, i) => (
        <path key={`g${i}`} d={strokePath(s)} className="trace-guide" />
      ))}
      {g.strokes.map((s, i) => (
        <path
          key={`w${i}`}
          d={strokePath(s)}
          className="trace-demo"
          pathLength={1}
          stroke={color}
          style={{ stroke: color, strokeWidth: 14, animationDelay: `${i * 1.1}s` }}
        />
      ))}
    </svg>
  );
}

/** Kartu angka + kata + gambar. Ketuk → suku kata disorot satu per satu sambil dibacakan. */
function WordCards({ cards }: { cards: LessonCard[] }) {
  const [active, setActive] = useState<{ card: number; syl: number }>();
  const read = (k: number) => {
    const card = cards[k]!;
    const syl = card.sukuKata.split('-');
    const step = (j: number) => {
      if (j >= syl.length) {
        setActive({ card: k, syl: -1 });
        speak(card.kata);
        return;
      }
      setActive({ card: k, syl: j });
      speak(syl[j]!, { rate: 0.8, onEnd: () => step(j + 1) });
    };
    step(0);
  };
  return (
    <div className="word-cards">
      {cards.map((c, k) => (
        <button key={c.kata} type="button" className="word-card" onClick={() => read(k)}>
          <span className="word-card-num" style={{ color: numColor(c.angka) }}>
            {c.angka}
          </span>
          <VisualView
            visual={{ kind: 'objects', object: c.gambar, count: c.angka, layout: 'rows' }}
            size={90}
          />
          <span className="word-card-word">
            {c.sukuKata.split('-').map((s, j) => (
              <span
                key={j}
                className={`syl${active?.card === k && (active.syl === j || active.syl === -1) ? ' is-on' : ''}`}
              >
                {s}
              </span>
            ))}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Coba menghitung: ketuk benda satu per satu, Momo ikut menghitung. Tidak dinilai. */
function CountTry({ n, object }: { n: number; object: ObjectId }) {
  const [counted, setCounted] = useState<number[]>([]);
  const done = counted.length >= n;
  const tap = (k: number) => {
    if (counted.includes(k) || done) return;
    const next = [...counted, k];
    setCounted(next);
    if (next.length >= n) speak(t('play.lesson.counted', { n: numberWord(n) }));
    else speak(numberWord(next.length));
  };
  return (
    <>
      <div className="count-field">
        {Array.from({ length: n }, (_, k) => {
          const at = counted.indexOf(k);
          return (
            <button
              key={k}
              type="button"
              className={`count-obj${at >= 0 ? ' is-counted' : ''}`}
              aria-label={at >= 0 ? numberWord(at + 1) : t('play.lesson.countMe')}
              onClick={() => tap(k)}
            >
              <VisualView visual={{ kind: 'object', object }} size={72} />
              {at >= 0 && <span className="count-obj-badge">{at + 1}</span>}
            </button>
          );
        })}
      </div>
      {done && <GlyphWrite n={n} color={numColor(n)} size={120} />}
    </>
  );
}

/** Coba menebalkan beberapa angka berurutan. Tidak dinilai (latihan bebas). */
function TraceTry({ numbers }: { numbers: number[] }) {
  const [k, setK] = useState(0);
  const [finished, setFinished] = useState(false);
  const n = numbers[k]!;
  return (
    <>
      <TraceBoard
        key={`${k}-${n}`}
        glyph={glyphOf(n).id}
        tolerance={20}
        size={260}
        onDone={() => {
          if (k + 1 < numbers.length) window.setTimeout(() => setK(k + 1), 1100);
          else setFinished(true);
        }}
      />
      <p className="kid-note">
        {finished
          ? t('play.lesson.traceAll')
          : t('play.lesson.traceOf', { n: k + 1, of: numbers.length })}
      </p>
    </>
  );
}
