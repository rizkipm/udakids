import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  GLYPH_HEIGHT,
  GLYPHS,
  glyphOf,
  isLetterGlyph,
  isStrokeGlyph,
  lessonFor,
  numberWord,
  ordinalWord,
  specSay,
  specVisual,
  type Spec,
  type GlyphId,
  strokePath,
  type Color,
  type LessonCard,
  type LessonScreen,
  type ObjectId,
  type SkillTemplate,
} from '@little-coder/engine';
import {
  pushVoiceLesson,
  speak,
  speakLesson,
  stopSpeaking,
  type LessonVoiceRef,
} from '../audio/speech';
import { useSession } from '../auth/session';
import { Momo, type MomoMood } from '../components/Momo';
import { VisualView } from '../components/visuals';
import { t } from '../i18n';
import { shelvesOf, useCatalog, bookKey } from './catalog';
import { TraceBoard } from './games/TraceBoard';
import { SimulationScreen, type SimVoice } from './LessonSim';
import { SpeakButton } from './ItemPlayer';
import { ExploreScreen, LessonTry, ReadScreen, VideoScreen } from './LessonMedia';
import { Peraga } from './peraga/Peraga';
import { InfografisScreen } from './Infografis';
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
  // Pelajaran manual (+ Video Momo otomatis bila belum ada) atau pelajaran otomatis (D-090).
  const lesson = useMemo(
    () => (shelf ? lessonFor(shelf.category, shelf.skills) : undefined),
    [shelf],
  );
  const [i, setI] = useState(0);
  const screen = lesson?.layar[i];
  // Suara Chirp dari server (D-088) untuk pelajaran manual di katalog. Video Momo otomatis yang ditambahkan di
  // depan (D-090) tidak ada di server, jadi nomor layar server = i − jumlah layar tambahan.
  const own = shelf?.category.lesson;
  const offset = own && lesson ? lesson.layar.length - own.layar.length : 0;
  const ref: LessonVoiceRef | undefined =
    own && where && i >= offset
      ? { domain: where.domain, grade: where.grade, code: where.code }
      : undefined;
  const voice: SimVoice = (key, text, onEnd) =>
    speakLesson(ref, ref ? (key ? `${i - offset}.${key}` : `${i - offset}`) : undefined, text, {
      onEnd,
    });

  // Konteks suara (D-091): kalimat pelajaran manual/otomatis topik ini boleh dibuatkan suara Chirp. Layout effect
  // supaya terpasang sebelum adegan pertama Video Momo dibacakan.
  const lessonKey = where ? `${where.domain}~${where.grade}~${where.code}` : '';
  useLayoutEffect(() => {
    if (!lessonKey) return undefined;
    const [domain, grade, code] = lessonKey.split('~') as [string, string, string];
    return pushVoiceLesson({ domain, grade, code });
  }, [lessonKey]);

  useEffect(() => {
    // Video Momo (D-089) membacakan adegannya sendiri; simulasi melanjutkan dengan ajakan menjelajah.
    if (screen && screen.jenis !== 'tonton')
      voice(
        '',
        screen.suara,
        screen.simulasi ? () => voice('sj', screen.simulasi!.jelajahSuara) : undefined,
      );
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <SpeakButton text={screen.suara} onSpeak={() => voice('', screen.suara)} />
          <p>{screen.teks}</p>
        </div>
        <ScreenBody screen={screen} skills={shelf.skills} voice={voice} />
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

function ScreenBody({
  screen,
  skills,
  voice,
}: {
  screen: LessonScreen;
  skills: SkillTemplate[];
  voice: SimVoice;
}) {
  const main = MainBody({ screen, skills, voice });
  // Kartu gambar (D-079) di atas isi utama: mis. pola yang dilanjutkan pada layar "coba pilih".
  return (
    <>
      {screen.kartuGambar && (
        <PictureCards
          cards={screen.kartuGambar}
          queue={!!screen.antrean}
          // Pada "coba pilih/urut" kartu ini adalah soalnya: tampil kecil dalam panel, terpisah dari pilihan.
          stimulus={screen.mode === 'pilih' || screen.mode === 'urut'}
        />
      )}
      {main}
    </>
  );
}

function MainBody({
  screen,
  skills,
  voice,
}: {
  screen: LessonScreen;
  skills: SkillTemplate[];
  voice: SimVoice;
}) {
  switch (screen.jenis) {
    case 'simulasi':
      return screen.simulasi ? <SimulationScreen sim={screen.simulasi} voice={voice} /> : null;
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
          fingers={!!screen.jari}
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
    case 'peraga':
      return screen.peraga ? <Peraga data={screen.peraga} /> : null;
    case 'infografis':
      return screen.infografis ? <InfografisScreen data={screen.infografis} /> : null;
    case 'tonton':
      return screen.adegan ? <VideoScreen scenes={screen.adegan} skills={skills} /> : null;
    case 'jelajah':
      return screen.titik ? <ExploreScreen spots={screen.titik} /> : null;
    case 'baca':
      return screen.kalimat ? <ReadScreen lines={screen.kalimat} /> : null;
    case 'coba':
      if (screen.mode === 'soal' && screen.contoh)
        return <LessonTry example={screen.contoh} skills={skills} />;
      if (screen.mode === 'pilih')
        return <ChoiceTry options={screen.pilihan!} answer={screen.jawaban ?? 0} />;
      if (screen.mode === 'urut') return <OrderTry steps={screen.pilihan!} />;
      if (screen.mode === 'hitung')
        return <CountTry n={screen.angka![0]!} object={screen.gambar![0]!} />;
      if (screen.mode === 'cari') return <FindLetter letter={screen.huruf![0]!} />;
      return (
        <TraceTry
          glyphs={
            screen.garis
              ? screen.garis
              : screen.huruf
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
  fingers = false,
  words,
}: {
  numbers: number[];
  object?: ObjectId;
  /** Tampilkan jari tangan sebanyak angkanya (P-MA-04). */
  fingers?: boolean;
  words?: boolean;
}) {
  const [on, setOn] = useState<number>();
  const tap = (n: number) => {
    setOn(n);
    speak(n === 0 ? 'Nol' : fingers ? `${numberWord(n)}. ${numberWord(n)} jari.` : numberWord(n));
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
          {fingers && on > 0 && (
            <div className="number-focus-objects" aria-label={`${on} jari`}>
              <VisualView visual={{ kind: 'fingers', count: on }} size={160} />
            </div>
          )}
          {!fingers && object && on > 0 && (
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
          ) : c.angka !== undefined ? (
            <span className="word-card-num" style={{ color: numColor(c.angka) }}>
              {c.angka}
            </span>
          ) : null}
          <VisualView
            visual={
              c.visual
                ? specVisual(c.visual)
                : c.angka === undefined
                  ? { kind: 'object', object: c.gambar! }
                  : { kind: 'objects', object: c.gambar!, count: c.angka, layout: 'rows' }
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
  const lines = glyphs.some(isStrokeGlyph);
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
          ? t(
              lines
                ? 'play.lesson.traceLinesAll'
                : letters
                  ? 'play.lesson.traceLettersAll'
                  : 'play.lesson.traceAll',
            )
          : t(
              lines
                ? 'play.lesson.traceLineOf'
                : letters
                  ? 'play.lesson.traceLetterOf'
                  : 'play.lesson.traceOf',
              {
                n: k + 1,
                of: glyphs.length,
              },
            )}
      </p>
    </>
  );
}

/**
 * Kartu gambar yang bisa diketuk (D-079): disebut saat diketuk. `queue` = antrean dari kiri (bendera di depan);
 * kartu yang diketuk mendapat nomor urutnya ("pertama", "kedua", …).
 */
function PictureCards({
  cards,
  queue,
  stimulus = false,
}: {
  cards: Spec[];
  queue: boolean;
  stimulus?: boolean;
}) {
  const [on, setOn] = useState<number[]>([]);
  const tap = (k: number) => {
    setOn((o) => (o.includes(k) ? o : [...o, k]));
    const what = specSay(cards[k]!);
    speak(queue ? `${ordinalWord(k + 1)}, ${what}` : what);
  };
  const list = (
    <div
      className={`picture-cards${queue ? ' is-queue' : ''}${stimulus ? ' is-stimulus' : ''}`}
      role="group"
      aria-label={t('play.lesson.pictures')}
    >
      {cards.map((c, k) => (
        <button
          key={k}
          type="button"
          className={`picture-card${on.includes(k) ? ' is-on' : ''}`}
          aria-label={queue ? `${ordinalWord(k + 1)}, ${specSay(c)}` : specSay(c)}
          onClick={() => tap(k)}
        >
          {queue && on.includes(k) && <span className="picture-badge">{k + 1}</span>}
          <VisualView visual={specVisual(c)} size={queue || stimulus ? 54 : 96} />
        </button>
      ))}
    </div>
  );
  if (!queue) return list;
  return (
    <div className="queue-wrap">
      <span className="queue-flag" aria-hidden>
        <svg viewBox="0 0 40 30" width="40" height="30">
          <path d="M6 2 V28" stroke="#2b2540" strokeWidth="4" strokeLinecap="round" />
          <path d="M8 3 H34 L28 10 L34 17 H8 Z" fill="#e76f51" stroke="#2b2540" strokeWidth="3" />
        </svg>
        {t('play.lesson.queueFront')}
      </span>
      {list}
    </div>
  );
}

/** Coba memilih (tidak dinilai): kartu tepat → pujian; lainnya → bergoyang + ajakan melihat lagi. */
function ChoiceTry({ options, answer }: { options: Spec[]; answer: number }) {
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState<{ k: number; n: number }>();
  const tap = (k: number) => {
    if (done) return;
    if (k === answer) {
      setDone(true);
      speak(`${specSay(options[k]!)}. ${t('play.lesson.pickRight')}`);
    } else {
      setShake((s) => ({ k, n: (s?.n ?? 0) + 1 }));
      speak(`${specSay(options[k]!)}. ${t('play.lesson.pickAgain')}`);
    }
  };
  return (
    <>
      <div className="picture-cards" role="group" aria-label={t('play.lesson.pictures')}>
        {options.map((c, k) => (
          <button
            key={`${k}-${shake?.k === k ? shake.n : 0}`}
            type="button"
            className={`picture-card${done && k === answer ? ' is-right' : ''}${shake?.k === k ? ' is-shake' : ''}`}
            aria-label={specSay(c)}
            onClick={() => tap(k)}
          >
            <VisualView visual={specVisual(c)} size={96} />
          </button>
        ))}
      </div>
      {done && <p className="kid-note">{t('play.lesson.pickRight')}</p>}
    </>
  );
}

/** Coba mengurutkan (tidak dinilai): ketuk kartu berurutan; nomor muncul di kartu yang sudah tepat. */
function OrderTry({ steps }: { steps: Spec[] }) {
  // Susunan acak tetap (diputar), supaya urutan benar tidak langsung terlihat.
  const shown = useMemo(
    () => steps.map((_, i) => (i * 2 + 1) % steps.length).filter((v, i, a) => a.indexOf(v) === i),
    [steps],
  );
  const order = shown.length === steps.length ? shown : steps.map((_, i) => steps.length - 1 - i);
  const [got, setGot] = useState<number[]>([]);
  const [shake, setShake] = useState<{ k: number; n: number }>();
  const done = got.length === steps.length;
  const tap = (k: number) => {
    if (done || got.includes(k)) return;
    if (k === got.length) {
      const next = [...got, k];
      setGot(next);
      speak(
        next.length === steps.length
          ? `${specSay(steps[k]!)}. ${t('play.lesson.orderDone')}`
          : specSay(steps[k]!),
      );
    } else {
      setShake((s) => ({ k, n: (s?.n ?? 0) + 1 }));
      speak(t('play.lesson.orderNext', { n: got.length + 1 }));
    }
  };
  return (
    <>
      <div className="picture-cards" role="group" aria-label={t('play.lesson.pictures')}>
        {order.map((k) => (
          <button
            key={`${k}-${shake?.k === k ? shake.n : 0}`}
            type="button"
            className={`picture-card${got.includes(k) ? ' is-right' : ''}${shake?.k === k ? ' is-shake' : ''}`}
            aria-label={specSay(steps[k]!)}
            onClick={() => tap(k)}
          >
            {got.includes(k) && <span className="picture-badge">{k + 1}</span>}
            <VisualView visual={specVisual(steps[k]!)} size={96} />
          </button>
        ))}
      </div>
      {done && <p className="kid-note">{t('play.lesson.orderDone')}</p>}
    </>
  );
}
