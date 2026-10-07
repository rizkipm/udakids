import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  GLYPH_HEIGHT,
  GLYPHS,
  glyphOf,
  isLetterGlyph,
  numberWord,
  type GlyphId,
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
import { MomoLoader } from './MomoLoader';
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
  const { data, failed: catalogFailed, retry: retryCatalog } = useCatalog();
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
    return <MomoLoader color={momoColor} failed={catalogFailed} onRetry={retryCatalog} />;
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
      if (screen.huruf)
        return (
          <LetterStrip
            letters={screen.huruf}
            pictures={screen.gambar ?? []}
            words={screen.jenis === 'ingat'}
          />
        );
      return screen.angka ? (
        <NumberStrip
          numbers={screen.angka}
          object={screen.gambar?.[0]}
          words={screen.jenis === 'ingat'}
        />
      ) : null;
    case 'bunyi':
      return screen.huruf ? (
        <SoundScreen letter={screen.huruf[0]!} pictures={screen.gambar ?? []} />
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
      if (screen.mode === 'hitung')
        return <CountTry n={screen.angka![0]!} object={screen.gambar![0]!} />;
      if (screen.mode === 'cari') return <FindLetter letter={screen.huruf![0]!} />;
      return (
        <TraceTry
          glyphs={
            screen.huruf
              ? screen.huruf.filter((h) => h in GLYPHS).map((h) => h as GlyphId)
              : (screen.angka ?? [1]).map((n) => glyphOf(n).id)
          }
        />
      );
    default:
      return null;
  }
}

/** Warna huruf vokal (cerah, kontras dengan garis tepi gelap). */
const LETTER_COLOR: Record<string, string> = {
  a: '#e63946',
  i: '#f3722c',
  u: '#e9a400',
  e: '#43aa8b',
  o: '#277da1',
};
const letterColor = (ch: string) => LETTER_COLOR[ch.toLowerCase()] ?? '#5b3fd6';
const letterName = (ch: string) =>
  ch === ch.toUpperCase() ? `huruf ${ch.toLowerCase()} besar` : `huruf ${ch}`;

/** Huruf besar-kecil yang bisa diketuk: disebut, Momo menuliskannya, dan gambar berawalan huruf itu muncul. */
function LetterStrip({
  letters,
  pictures,
  words,
}: {
  letters: string[];
  pictures: ObjectId[];
  words?: boolean;
}) {
  const [on, setOn] = useState<number>();
  const tap = (k: number) => {
    setOn(k);
    const ch = letters[k]!;
    const pic = pictures[k];
    speak(pic ? `${letterName(ch)}. ${ch}, seperti ${pic.replace('-', ' ')}.` : letterName(ch));
  };
  const ch = on !== undefined ? letters[on]! : undefined;
  return (
    <>
      <div className="number-strip" role="group" aria-label={t('play.lesson.letters')}>
        {letters.map((l, k) => (
          <button
            key={l}
            type="button"
            className={`number-tile letter-tile${on === k ? ' is-on' : ''}`}
            style={{ background: letterColor(l) }}
            aria-label={letterName(l)}
            onClick={() => tap(k)}
          >
            {l.toUpperCase()}
            <small>{l.toLowerCase()}</small>
          </button>
        ))}
      </div>
      {words && pictures.length > 0 && (
        <div className="letter-pics">
          {letters.map((l, k) =>
            pictures[k] ? (
              <span key={l} className="letter-pic">
                <VisualView visual={{ kind: 'object', object: pictures[k]! }} size={64} />
                <b style={{ color: letterColor(l) }}>{l}</b>
              </span>
            ) : null,
          )}
        </div>
      )}
      {ch && (
        <div className="number-focus" key={ch}>
          <span className="letter-pair">
            {isLetterGlyph(ch.toUpperCase() as GlyphId) && (
              <GlyphWrite glyph={ch.toUpperCase() as GlyphId} color={letterColor(ch)} size={120} />
            )}
            {isLetterGlyph(ch.toLowerCase() as GlyphId) && (
              <GlyphWrite glyph={ch.toLowerCase() as GlyphId} color={letterColor(ch)} size={120} />
            )}
          </span>
          {pictures[on!] && (
            <div className="number-focus-objects">
              <VisualView visual={{ kind: 'object', object: pictures[on!]! }} size={150} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Bunyi huruf: huruf besar + gambar berawalan huruf itu; ketuk gambar → bunyi depan lalu kata per suku kata. */
function SoundScreen({ letter, pictures }: { letter: string; pictures: ObjectId[] }) {
  const [on, setOn] = useState<ObjectId>();
  return (
    <div className="sound-screen">
      <button
        type="button"
        className="number-tile letter-tile is-big"
        style={{ background: letterColor(letter) }}
        aria-label={letterName(letter)}
        onClick={() => speak(`${letter}. ${letter}. ${letter}.`, { rate: 0.8 })}
      >
        {letter.toUpperCase()}
        <small>{letter.toLowerCase()}</small>
      </button>
      <div className="sound-pics" role="group" aria-label={t('play.lesson.sound')}>
        {pictures.map((pic) => {
          const word = pic.replace('-', ' ');
          return (
            <button
              key={pic}
              type="button"
              className={`word-card sound-card${on === pic ? ' is-on' : ''}`}
              aria-label={word}
              onClick={() => {
                setOn(pic);
                speak(`${letter}... ${word}`, { rate: 0.85 });
              }}
            >
              <VisualView visual={{ kind: 'object', object: pic }} size={96} />
              <span className="word-card-word">
                <b style={{ color: letterColor(letter) }}>{word[0]}</b>
                {word.slice(1)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Coba mencari huruf: ketuk semua huruf yang sama di antara huruf lain (tidak dinilai). */
const FIND_OTHERS: Record<string, string[]> = {
  a: ['o', 'e', 'd', 'b'],
  i: ['l', 't', 'j', 'u'],
  u: ['n', 'o', 'v', 'a'],
  e: ['c', 'a', 'o', 'b'],
  o: ['a', 'c', 'e', 'u'],
};
function FindLetter({ letter }: { letter: string }) {
  const tiles = useMemo(() => {
    const others = FIND_OTHERS[letter] ?? ['b', 'm', 's', 't'];
    // Susunan tetap (bukan acak) supaya layar pelajaran sama setiap dibuka.
    return [
      letter,
      others[0]!,
      others[1]!,
      letter,
      others[2]!,
      others[3]!,
      others[0]!,
      letter,
      others[1]!,
    ];
  }, [letter]);
  const total = tiles.filter((x) => x === letter).length;
  const [got, setGot] = useState<number[]>([]);
  const [shake, setShake] = useState<{ k: number; n: number }>();
  const tap = (k: number) => {
    if (got.includes(k)) return;
    if (tiles[k] !== letter) {
      setShake((s) => ({ k, n: (s?.n ?? 0) + 1 }));
      speak(`${letterName(tiles[k]!)}. ${t('play.lesson.findLetter', { letter })}?`);
      return;
    }
    const next = [...got, k];
    setGot(next);
    speak(
      next.length >= total
        ? t('play.lesson.findDone', { letter })
        : t('play.lesson.findLeft', { n: numberWord(total - next.length), letter }),
    );
  };
  return (
    <>
      <div className="find-grid">
        {tiles.map((ch, k) => (
          <button
            key={`${k}-${shake?.k === k ? shake.n : 0}`}
            type="button"
            className={`find-tile${got.includes(k) ? ' is-got' : ''}${shake?.k === k ? ' is-shake' : ''}`}
            aria-label={letterName(ch)}
            onClick={() => tap(k)}
          >
            {ch}
          </button>
        ))}
      </div>
      <p className="kid-note" aria-live="polite">
        {got.length >= total
          ? t('play.lesson.findDone', { letter })
          : t('play.lesson.findLeft', { n: total - got.length, letter })}
      </p>
    </>
  );
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
          <GlyphWrite glyph={glyphOf(on).id} color={numColor(on)} />
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
export function GlyphWrite({
  glyph,
  color,
  size = 150,
}: {
  glyph: GlyphId;
  color: string;
  size?: number;
}) {
  const g = GLYPHS[glyph];
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
          {c.huruf ? (
            <span className="word-card-num" style={{ color: letterColor(c.huruf) }}>
              {c.huruf}
            </span>
          ) : (
            <span className="word-card-num" style={{ color: numColor(c.angka ?? 0) }}>
              {c.angka}
            </span>
          )}
          <VisualView
            visual={
              c.huruf
                ? { kind: 'object', object: c.gambar }
                : { kind: 'objects', object: c.gambar, count: c.angka ?? 1, layout: 'rows' }
            }
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
      {done && <GlyphWrite glyph={glyphOf(n).id} color={numColor(n)} size={120} />}
    </>
  );
}

/** Coba menebalkan beberapa angka/huruf berurutan. Tidak dinilai (latihan bebas). */
function TraceTry({ glyphs }: { glyphs: GlyphId[] }) {
  const [k, setK] = useState(0);
  const [finished, setFinished] = useState(false);
  const glyph = glyphs[k]!;
  const letters = glyphs.some(isLetterGlyph);
  return (
    <>
      <TraceBoard
        key={`${k}-${glyph}`}
        glyph={glyph}
        tolerance={20}
        size={260}
        onDone={() => {
          if (k + 1 < glyphs.length) window.setTimeout(() => setK(k + 1), 1100);
          else setFinished(true);
        }}
      />
      <p className="kid-note">
        {finished
          ? t(letters ? 'play.lesson.traceLettersAll' : 'play.lesson.traceAll')
          : t(letters ? 'play.lesson.traceLetterOf' : 'play.lesson.traceOf', {
              n: k + 1,
              of: glyphs.length,
            })}
      </p>
    </>
  );
}
