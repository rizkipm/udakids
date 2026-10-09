import { useEffect, useMemo, useRef, useState } from 'react';
import {
  exampleAnswerSay,
  isShowableExample,
  generateItem,
  OBJECTS,
  SENSES,
  specSay,
  specVisual,
  type AnswerResult,
  type Item,
  type LessonExample,
  type LessonScene,
  type SkillTemplate,
  type Visual,
  type LessonSentence,
  type LessonSpot,
  type SenseId,
} from '@little-coder/engine';
import { speak, stopSpeaking } from '../audio/speech';
import { Momo } from '../components/Momo';
import { VisualView } from '../components/visuals';
import { FACE_H, FACE_W, FaceFigure, SENSE_SPOTS, SenseIcon } from '../components/visuals/senses';
import { t } from '../i18n';
import { ItemPlayer, SpeakButton } from './ItemPlayer';

/**
 * Layar pelajaran interaktif (D-089): "Video Momo" (adegan bergerak + narasi + teks), jelajah gambar (ketuk
 * bagiannya), dan bacaan interaktif (ketuk kalimat untuk mendengar). Semua dibuat dari data pelajaran dan
 * gambar sendiri, jadi bekerja offline tanpa video dari luar.
 */

/** Jeda singkat setelah narasi sebelum adegan berikutnya (ms). */
const SCENE_GAP = 900;

/** Soal contoh dari level topik (D-090); undefined bila level/soal tidak bisa dibuat. */
export function exampleItem(skills: readonly SkillTemplate[], ex: LessonExample): Item | undefined {
  const skill = skills.find((k) => k.order === ex.level);
  if (!skill) return undefined;
  try {
    return generateItem(skill, { seed: ex.seed, band: 0 });
  } catch {
    return undefined;
  }
}

export function VideoScreen({
  scenes,
  skills = [],
}: {
  scenes: LessonScene[];
  skills?: readonly SkillTemplate[];
}) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  // Adegan contoh soal: setelah soal dibacakan, jawabannya disorot lalu dijelaskan.
  const [revealed, setRevealed] = useState(false);
  const scene = scenes[i]!;
  const item = useMemo(
    () => (scene.contoh ? exampleItem(skills, scene.contoh) : undefined),
    [scene, skills],
  );

  useEffect(() => {
    if (!playing) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const next = () => {
      timer = setTimeout(() => {
        if (cancelled) return;
        if (i < scenes.length - 1) {
          setRevealed(false);
          setI(i + 1);
        } else {
          setPlaying(false);
          setEnded(true);
        }
      }, SCENE_GAP);
    };
    const explain = () => {
      setRevealed(true);
      speak(exampleAnswerSay(item!), { onEnd: () => !cancelled && next() });
    };
    if (revealed && item) explain();
    else
      speak(scene.suara, {
        onEnd: () => {
          if (cancelled) return;
          if (item) timer = setTimeout(() => !cancelled && explain(), SCENE_GAP);
          else next();
        },
      });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // `revealed` sengaja tidak memicu ulang (berubah di tengah adegan).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, playing, scene, item, scenes.length]);

  useEffect(() => () => stopSpeaking(), []);

  const go = (n: number) => {
    stopSpeaking();
    setEnded(false);
    setRevealed(false);
    setI(n);
    setPlaying(true);
  };
  const toggle = () => {
    if (ended) return go(0);
    if (playing) {
      stopSpeaking();
      setPlaying(false);
    } else setPlaying(true);
  };

  return (
    <div className="lesson-video">
      <div
        className={`video-stage${playing ? ' is-playing' : ''}${item ? ' has-example' : ''}`}
        aria-live="polite"
      >
        {item ? (
          <div className={`video-example${revealed ? ' is-revealed' : ''}`} key={i}>
            <span className="video-badge">
              {isShowableExample(item)
                ? revealed
                  ? t('play.lesson.videoAnswer')
                  : t('play.lesson.videoExample')
                : revealed
                  ? t('play.lesson.videoExplain')
                  : t('play.lesson.videoHowTo')}
            </span>
            <ItemPlayer
              item={item}
              mode="preview"
              disabled
              showAnswer={revealed}
              showMarks={false}
            />
          </div>
        ) : (
          <div className={`video-art move-${scene.gerak ?? 'muncul'}`} key={i}>
            {scenePictures(scene).map((v, k, all) => (
              <span key={k} className="video-pic" style={{ animationDelay: `${k * 260}ms` }}>
                <VisualView visual={v} size={all.length > 1 ? 130 : 210} />
              </span>
            ))}
            {scenePictures(scene).length === 0 && (
              <span className="video-pic">
                <Momo own mood={i === 0 ? 'happy' : 'proud'} size={170} />
              </span>
            )}
          </div>
        )}
        <p className="video-caption" key={`c${i}`}>
          {scene.teks}
        </p>
        {ended && (
          <div className="video-end">
            <Momo own mood="proud" size={88} />
          </div>
        )}
      </div>
      <div className="video-controls">
        <button
          type="button"
          className="kid-btn secondary video-btn"
          onClick={() => go(Math.max(0, i - 1))}
          disabled={i === 0}
          aria-label={t('play.lesson.videoPrev')}
        >
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
            <path
              d="M15 5 L8 12 L15 19"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className="kid-btn video-btn video-play"
          onClick={toggle}
          aria-label={
            ended
              ? t('play.lesson.videoReplay')
              : playing
                ? t('play.lesson.videoPause')
                : t('play.lesson.videoPlay')
          }
        >
          <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden>
            {ended ? (
              <path
                d="M5 12 A7 7 0 1 0 8 6.3 M8 2.5 V6.6 H12"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : playing ? (
              <path
                d="M8 5 V19 M16 5 V19"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            ) : (
              <path d="M7 4.5 L19 12 L7 19.5 Z" fill="currentColor" />
            )}
          </svg>
        </button>
        <button
          type="button"
          className="kid-btn secondary video-btn"
          onClick={() => go(Math.min(scenes.length - 1, i + 1))}
          disabled={i === scenes.length - 1}
          aria-label={t('play.lesson.videoNext')}
        >
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
            <path
              d="M9 5 L16 12 L9 19"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div className="video-dots" role="tablist" aria-label={t('play.lesson.videoScenes')}>
        {scenes.map((_, k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === i}
            aria-label={t('play.lesson.videoScene', { n: k + 1, of: scenes.length })}
            className={k < i ? 'is-past' : k === i ? 'is-on' : undefined}
            onClick={() => go(k)}
          />
        ))}
      </div>
    </div>
  );
}

/** Gambar sebuah adegan: spec JSON dan/atau visual soal. */
const scenePictures = (scene: LessonScene): Visual[] => [
  ...(scene.gambar ?? []).map(specVisual),
  ...(scene.visual ?? []),
];

/** Coba satu soal dari level topik, tanpa nilai (D-090): Momo menjelaskan setelah anak menjawab. */
export function LessonTry({
  example,
  skills,
}: {
  example: LessonExample;
  skills: readonly SkillTemplate[];
}) {
  const [seed, setSeed] = useState(example.seed);
  const [result, setResult] = useState<AnswerResult>();
  const item = useMemo(
    () => exampleItem(skills, { level: example.level, seed }),
    [skills, example.level, seed],
  );
  if (!item) return null;
  return (
    <div className="lesson-try">
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

/** Jelajah wajah: ketuk alat indra → disorot, dibacakan, dan contoh bendanya muncul. */
export function ExploreScreen({ spots }: { spots: LessonSpot[] }) {
  const [active, setActive] = useState<SenseId>();
  const [seen, setSeen] = useState<SenseId[]>([]);
  const spot = spots.find((s) => s.bagian === active);
  const done = seen.length === spots.length;
  const open = (s: LessonSpot) => {
    setActive(s.bagian);
    setSeen((x) => (x.includes(s.bagian) ? x : [...x, s.bagian]));
    speak(s.suara);
  };
  return (
    <div className="lesson-explore">
      <div className="face-pick explore-face">
        <svg viewBox={`0 0 ${FACE_W} ${FACE_H}`} className="face-pick-art" aria-hidden>
          <FaceFigure sense={active} />
        </svg>
        {spots.map((s) => {
          const p = SENSE_SPOTS[s.bagian];
          return (
            <button
              key={s.bagian}
              type="button"
              className={`face-spot${seen.includes(s.bagian) ? ' is-seen' : ' is-new'}${active === s.bagian ? ' is-selected' : ''}`}
              style={{
                left: `${(p.x / FACE_W) * 100}%`,
                top: `${(p.y / FACE_H) * 100}%`,
                ['--spot' as string]: `${p.r >= 26 ? 72 : 64}px`,
              }}
              aria-label={SENSES[s.bagian].say}
              aria-pressed={active === s.bagian}
              onClick={() => open(s)}
            />
          );
        })}
      </div>
      <div className="explore-side">
        <p className="explore-count" aria-live="polite">
          {done
            ? t('play.lesson.exploreDone')
            : t('play.lesson.exploreCount', { n: seen.length, of: spots.length })}
        </p>
        <div className="explore-chips" aria-hidden>
          {spots.map((s) => (
            <span key={s.bagian} className={seen.includes(s.bagian) ? 'is-on' : undefined}>
              <svg viewBox="0 0 100 100" width="40" height="40">
                <SenseIcon sense={s.bagian} />
              </svg>
            </span>
          ))}
        </div>
        {spot ? (
          <div className="explore-card" key={spot.bagian}>
            <svg viewBox="0 0 100 100" width="72" height="72" aria-hidden>
              <SenseIcon sense={spot.bagian} />
            </svg>
            <div>
              <strong>{SENSES[spot.bagian].say}</strong>
              <p>{spot.teks}</p>
            </div>
            {spot.gambar && (
              <div className="explore-examples">
                {spot.gambar.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className="explore-example"
                    aria-label={OBJECTS[o].say}
                    onClick={() => speak(OBJECTS[o].say)}
                  >
                    <VisualView visual={{ kind: 'object', object: o }} size={64} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="explore-hint">{t('play.lesson.exploreHint')}</p>
        )}
      </div>
    </div>
  );
}

/** Bacaan interaktif: ketuk kalimat untuk mendengar; "Bacakan semua" menyorot kalimat satu per satu. */
export function ReadScreen({ lines }: { lines: LessonSentence[] }) {
  const [on, setOn] = useState<number>();
  const [all, setAll] = useState(false);
  const run = useRef(0);
  useEffect(() => () => stopSpeaking(), []);
  const say = (k: number, chain: boolean) => {
    const token = ++run.current;
    setOn(k);
    const line = lines[k]!;
    speak(line.suara ?? line.teks, {
      onEnd: () => {
        if (token !== run.current) return;
        if (chain && k < lines.length - 1) say(k + 1, true);
        else if (chain) {
          setAll(false);
          setOn(undefined);
        }
        // Ketukan satu kalimat: sorotan tetap di kalimat yang baru dibacakan.
      },
    });
  };
  const readAll = () => {
    if (all) {
      run.current++;
      stopSpeaking();
      setAll(false);
      setOn(undefined);
      return;
    }
    setAll(true);
    say(0, true);
  };
  return (
    <div className="lesson-read">
      <button type="button" className="kid-btn secondary read-all" onClick={readAll}>
        {all ? t('play.lesson.readStop') : t('play.lesson.readAll')}
      </button>
      <ol className="read-lines">
        {lines.map((l, k) => (
          <li key={k}>
            <button
              type="button"
              className={`read-line${on === k ? ' is-on' : ''}`}
              onClick={() => {
                setAll(false);
                say(k, false);
              }}
            >
              {l.gambar && (
                <span className="read-pic" aria-hidden>
                  <VisualView visual={specVisual(l.gambar)} size={64} />
                </span>
              )}
              <span className="read-text">{l.teks}</span>
              {l.gambar && <span className="lesson-sr">{specSay(l.gambar)}</span>}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
