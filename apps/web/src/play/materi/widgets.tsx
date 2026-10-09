import { useEffect, useMemo, useRef, useState } from 'react';
import { numberWord, ordinalWord, OBJECTS, type ObjectId, type Visual } from '@little-coder/engine';
import { speak, stopSpeaking } from '../../audio/speech';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import { SpeakButton } from '../ItemPlayer';
import { GlyphWrite } from '../Lesson';
import { glyphOf } from '@little-coder/engine';
import type { Adegan, Main } from './types';

/** Warna angka (sama dengan pelajaran biasa) supaya anak mengenali angka yang sama. */
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
export const numColor = (n: number) => NUM_COLOR[n % NUM_COLOR.length]!;
const word = (n: number) => (n === 0 ? 'nol' : numberWord(n));
const objName = (o: ObjectId) => OBJECTS[o].say ?? o.replace('-', ' ');
/** Jeda sebelum ronde berikutnya, supaya pujian sempat terdengar (ms). */
const NEXT_ROUND = 1600;

/** Goyang lembut pada pilihan yang belum tepat (tanpa merah, tanpa kata "salah"). */
function useShake() {
  const [shake, setShake] = useState<{ k: string; n: number }>();
  return {
    key: (k: string) => `${k}-${shake?.k === k ? shake.n : 0}`,
    is: (k: string) => shake?.k === k,
    shake: (k: string) => setShake((s) => ({ k, n: (s?.n ?? 0) + 1 })),
  };
}

/** Ronde berikutnya setelah jeda; dibatalkan bila widget ditutup. */
function useLater() {
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (fn: () => void, ms = NEXT_ROUND) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(fn, ms);
  };
}

function RoundDots({ n, at }: { n: number; at: number }) {
  return (
    <div
      className="m-rounds"
      aria-label={t('play.materi.round', { n: Math.min(at + 1, n), of: n })}
    >
      {Array.from({ length: n }, (_, k) => (
        <span key={k} className={k < at ? 'is-done' : k === at ? 'is-now' : undefined} />
      ))}
    </div>
  );
}

function Finished({ text, onAgain }: { text: string; onAgain: () => void }) {
  useEffect(() => speak(text), [text]);
  return (
    <div className="m-finished" role="status">
      <StarBadge />
      <p>{text}</p>
      <button type="button" className="kid-btn secondary" onClick={onAgain}>
        {t('play.materi.again')}
      </button>
    </div>
  );
}

export function StarBadge({ size = 56 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <path
        d="M24 4l6 13 14 1.5-10.5 9.5 3 14L24 35l-12.5 7 3-14L4 18.5 18 17z"
        fill="#f7c948"
        stroke="#2b2540"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Banyak benda/titik di sebuah visual (untuk animasi hitung bersama). */
export function countOf(v: Visual): number {
  switch (v.kind) {
    case 'objects':
    case 'dots':
      return v.count;
    case 'frame':
      return v.filled;
    case 'cubes':
      return v.counts.reduce((a, b) => a + b, 0);
    default:
      return 0;
  }
}

/* ------------------------------------------------------------------ Contoh Momo */

/**
 * Contoh Momo: adegan berjalan sendiri (narasi → hitung bersama → kalimat penutup → adegan berikutnya). Anak bisa
 * menjeda, mundur, maju, atau mengetuk titik adegan.
 */
export function ContohPlayer({ adegan }: { adegan: Adegan[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [step, setStep] = useState<number>();
  const later = useLater();
  const scene = adegan[i]!;
  const total = scene.hitung ? countOf(scene.visual[0]!) : 0;

  useEffect(() => {
    setStep(undefined);
    let alive = true;
    const next = () => {
      if (!alive) return;
      if (i < adegan.length - 1) later(() => alive && setI((x) => x + 1), 900);
      else setPlaying(false);
    };
    const finish = () => (scene.selesai ? speak(scene.selesai, { onEnd: next }) : next());
    const count = (k: number) => {
      if (!alive) return;
      if (k > total) {
        setStep(total);
        finish();
        return;
      }
      setStep(k);
      speak(scene.hitung === 'urutan' ? ordinalWord(k) : word(k), {
        rate: 0.9,
        onEnd: () => later(() => count(k + 1), 250),
      });
    };
    if (playing) speak(scene.suara, { onEnd: () => (scene.hitung && total ? count(1) : finish()) });
    return () => {
      alive = false;
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, playing]);

  const go = (k: number) => {
    setI(Math.max(0, Math.min(adegan.length - 1, k)));
    setPlaying(true);
  };
  return (
    <div className="m-contoh">
      <div className="m-stage" key={i}>
        <div className="m-stage-pics">
          {scene.visual.map((v, k) => (
            <span key={k} className="m-pop" style={{ animationDelay: `${k * 0.15}s` }}>
              <VisualView
                visual={v}
                size={scene.visual.length > 1 ? 120 : 150}
                countStep={k === 0 && scene.hitung ? step : undefined}
              />
            </span>
          ))}
        </div>
        <p className="m-stage-text">{scene.teks}</p>
      </div>
      <div className="m-controls">
        <button
          type="button"
          className="m-ctrl"
          aria-label={t('play.materi.prevScene')}
          disabled={i === 0}
          onClick={() => go(i - 1)}
        >
          <Chevron dir="left" />
        </button>
        <button
          type="button"
          className="m-ctrl is-main"
          aria-label={playing ? t('play.materi.pause') : t('play.materi.play')}
          onClick={() => (playing ? (setPlaying(false), stopSpeaking()) : setPlaying(true))}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          className="m-ctrl"
          aria-label={t('play.materi.nextScene')}
          disabled={i === adegan.length - 1}
          onClick={() => go(i + 1)}
        >
          <Chevron dir="right" />
        </button>
      </div>
      <div className="m-scenes" role="group" aria-label={t('play.materi.scenes')}>
        {adegan.map((_, k) => (
          <button
            key={k}
            type="button"
            className={k === i ? 'is-on' : k < i ? 'is-done' : undefined}
            aria-label={t('play.materi.scene', { n: k + 1 })}
            onClick={() => go(k)}
          />
        ))}
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden>
      <path
        d={dir === 'left' ? 'M15 4l-8 8 8 8' : 'M9 4l8 8-8 8'}
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden>
      <rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
      <rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden>
      <path d="M7 4l13 8-13 8z" fill="currentColor" />
    </svg>
  );
}

/* ------------------------------------------------------------------ Main (tidak dinilai) */

export function MainView({ main }: { main: Main }) {
  switch (main.tipe) {
    case 'kenal-angka':
      return <KenalAngka sampai={main.sampai} benda={main.benda} />;
    case 'dengar-ketuk':
      return <DengarKetuk ronde={main.ronde} />;
    case 'hitung-ketuk':
      return <HitungKetuk ronde={main.ronde} />;
    case 'pasangkan':
      return <Pasangkan pasangan={main.pasangan} />;
    case 'garis-bilangan':
      return <GarisBilangan sampai={main.sampai} />;
    case 'kereta':
      return <Kereta ronde={main.ronde} />;
    case 'urutkan':
      return <Urutkan ronde={main.ronde} />;
    case 'antrean':
      return <Antrean hewan={main.hewan} ronde={main.ronde} />;
    case 'banding':
      return <Banding ronde={main.ronde} />;
    case 'bingkai':
      return <Bingkai ronde={main.ronde} />;
  }
}

function NumTile({
  n,
  on,
  className = '',
  onClick,
  label,
  small,
}: {
  n: number;
  on?: boolean;
  className?: string;
  onClick: () => void;
  label?: string;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      className={`m-num${on ? ' is-on' : ''}${small ? ' is-small' : ''} ${className}`}
      style={{ background: numColor(n) }}
      aria-label={label ?? word(n)}
      onClick={onClick}
    >
      {n}
    </button>
  );
}

/** Kenal angka: ketuk → nama disebut, Momo menulis angkanya, benda & jari sebanyak angka itu muncul. */
function KenalAngka({ sampai, benda }: { sampai: number; benda: ObjectId }) {
  const [on, setOn] = useState<number>();
  const [seen, setSeen] = useState<number[]>([]);
  const tap = (n: number) => {
    setOn(n);
    setSeen((s) => (s.includes(n) ? s : [...s, n]));
    speak(`${word(n)}. Ada ${word(n)} ${objName(benda)}.`);
  };
  return (
    <div className="m-kenal">
      <div className="m-num-row" role="group" aria-label={t('play.lesson.numbers')}>
        {Array.from({ length: sampai }, (_, k) => k + 1).map((n) => (
          <NumTile
            key={n}
            n={n}
            on={on === n}
            className={seen.includes(n) ? 'is-seen' : ''}
            onClick={() => tap(n)}
          />
        ))}
      </div>
      {on === undefined ? (
        <p className="kid-note">{t('play.materi.tapNumber')}</p>
      ) : (
        <div className="m-focus" key={on}>
          <div className="m-focus-card">
            <GlyphWrite glyph={glyphOf(on).id} color={numColor(on)} size={130} />
            <b>{word(on)}</b>
          </div>
          <div className="m-focus-card">
            <VisualView
              visual={{
                kind: 'objects',
                object: benda,
                count: on,
                layout: on <= 5 ? 'row' : 'rows',
              }}
              size={130}
            />
            <small>{t('play.materi.objectsOf', { n: on })}</small>
          </div>
          {on <= 10 && (
            <div className="m-focus-card">
              <VisualView visual={{ kind: 'fingers', count: on }} size={130} />
              <small>{t('play.materi.fingersOf', { n: on })}</small>
            </div>
          )}
        </div>
      )}
      <p className="m-progress-note">{t('play.materi.seen', { n: seen.length, of: sampai })}</p>
    </div>
  );
}

/** Dengar lalu ketuk (seperti Level 1). */
function DengarKetuk({ ronde }: { ronde: { target: number; pilihan: number[] }[] }) {
  const [r, setR] = useState(0);
  const [right, setRight] = useState(false);
  const s = useShake();
  const later = useLater();
  const round = ronde[r];
  const ask = round ? t('play.materi.tapHeard', { n: word(round.target) }) : '';
  useEffect(() => {
    if (round) speak(ask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!round)
    return (
      <Finished text={t('play.materi.listenDone')} onAgain={() => (setR(0), setRight(false))} />
    );
  const tap = (n: number) => {
    if (right) return;
    if (n === round.target) {
      setRight(true);
      speak(t('play.materi.heardRight', { n: word(n) }));
      later(() => {
        setRight(false);
        setR(r + 1);
      });
    } else {
      s.shake(String(n));
      speak(t('play.materi.heardAgain', { n: word(n), target: word(round.target) }));
    }
  };
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <div className="m-ask">
        <SpeakButton text={ask} label={t('play.materi.listenAgain')} />
        <p>{t('play.materi.tapHeardShort')}</p>
      </div>
      <div className="m-num-row is-big">
        {round.pilihan.map((n) => (
          <NumTile
            key={s.key(String(n))}
            n={n}
            on={right && n === round.target}
            className={`${s.is(String(n)) ? 'is-shake' : ''}${right && n === round.target ? ' is-right' : ''}`}
            onClick={() => tap(n)}
          />
        ))}
      </div>
    </div>
  );
}

/** Ketuk benda satu per satu (Momo ikut menghitung), lalu pilih angkanya (seperti Level 2). */
function HitungKetuk({ ronde }: { ronde: { n: number; benda: ObjectId; pilihan: number[] }[] }) {
  const [r, setR] = useState(0);
  const [counted, setCounted] = useState<number[]>([]);
  const [right, setRight] = useState(false);
  const s = useShake();
  const later = useLater();
  const round = ronde[r];
  if (!round)
    return (
      <Finished
        text={t('play.materi.countDone')}
        onAgain={() => {
          setR(0);
          setCounted([]);
        }}
      />
    );
  const all = counted.length >= round.n;
  const tapObj = (k: number) => {
    if (counted.includes(k)) {
      speak(t('play.materi.alreadyCounted'));
      return;
    }
    const next = [...counted, k];
    setCounted(next);
    speak(
      next.length >= round.n
        ? `${word(next.length)}. ${t('play.materi.howMany')}`
        : word(next.length),
    );
  };
  const pick = (n: number) => {
    if (right) return;
    if (n === round.n) {
      setRight(true);
      speak(t('play.materi.countRight', { n: word(n), obj: objName(round.benda) }));
      later(() => {
        setRight(false);
        setCounted([]);
        setR(r + 1);
      });
    } else {
      s.shake(String(n));
      speak(t('play.materi.countHint', { n: word(round.n) }));
    }
  };
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <div className="m-count-field" key={r}>
        {Array.from({ length: round.n }, (_, k) => {
          const at = counted.indexOf(k);
          return (
            <button
              key={k}
              type="button"
              className={`m-count-obj${at >= 0 ? ' is-counted' : ''}`}
              aria-label={at >= 0 ? word(at + 1) : t('play.lesson.countMe')}
              onClick={() => tapObj(k)}
            >
              <VisualView visual={{ kind: 'object', object: round.benda }} size={64} />
              {at >= 0 && <span className="m-badge">{at + 1}</span>}
            </button>
          );
        })}
      </div>
      {all ? (
        <>
          <p className="kid-note">{t('play.materi.howMany')}</p>
          <div className="m-num-row is-big">
            {round.pilihan.map((n) => (
              <NumTile
                key={s.key(String(n))}
                n={n}
                on={right && n === round.n}
                className={`${s.is(String(n)) ? 'is-shake' : ''}${right && n === round.n ? ' is-right' : ''}`}
                onClick={() => pick(n)}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="kid-note">{t('play.materi.countTap', { n: counted.length })}</p>
      )}
    </div>
  );
}

/** Pasangkan angka dengan kelompok benda (seperti Level 3). */
function Pasangkan({ pasangan }: { pasangan: { n: number; benda: ObjectId }[] }) {
  // Kelompok benda tampil dengan urutan diputar (tetap, bukan acak) supaya pasangannya tidak sejajar.
  const groups = useMemo(() => pasangan.map((_, k) => (k + 1) % pasangan.length), [pasangan]);
  const [sel, setSel] = useState<number>();
  const [done, setDone] = useState<number[]>([]);
  const s = useShake();
  if (done.length === pasangan.length)
    return (
      <Finished
        text={t('play.materi.matchDone')}
        onAgain={() => (setDone([]), setSel(undefined))}
      />
    );
  const pickNum = (k: number) => {
    if (done.includes(k)) return;
    setSel(k);
    speak(`${word(pasangan[k]!.n)}. ${t('play.materi.matchFind')}`);
  };
  const pickGroup = (g: number) => {
    if (done.includes(g)) return;
    const pair = pasangan[g]!;
    if (sel === undefined) {
      speak(t('play.materi.matchNumFirst'));
      return;
    }
    if (g === sel) {
      setDone([...done, g]);
      setSel(undefined);
      speak(t('play.materi.matchRight', { n: word(pair.n), obj: objName(pair.benda) }));
    } else {
      s.shake(`g${g}`);
      speak(t('play.materi.matchHint', { n: word(pasangan[sel]!.n) }));
    }
  };
  return (
    <div className="m-match">
      <div className="m-num-row is-big" role="group" aria-label={t('play.lesson.numbers')}>
        {pasangan.map((p, k) => (
          <NumTile
            key={k}
            n={p.n}
            on={sel === k}
            className={done.includes(k) ? 'is-right is-matched' : ''}
            onClick={() => pickNum(k)}
          />
        ))}
      </div>
      <div className="m-groups">
        {groups.map((g) => {
          const p = pasangan[g]!;
          const ok = done.includes(g);
          return (
            <button
              key={s.key(`g${g}`)}
              type="button"
              className={`m-group${ok ? ' is-right' : ''}${s.is(`g${g}`) ? ' is-shake' : ''}`}
              style={ok ? { borderColor: numColor(p.n) } : undefined}
              aria-label={`${word(p.n)} ${objName(p.benda)}`}
              onClick={() => pickGroup(g)}
            >
              <VisualView
                visual={{
                  kind: 'objects',
                  object: p.benda,
                  count: p.n,
                  layout: p.n <= 4 ? 'row' : 'grid',
                }}
                size={96}
              />
              {ok && (
                <span className="m-badge is-pair" style={{ background: numColor(p.n) }}>
                  {p.n}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="kid-note">
        {sel === undefined ? t('play.materi.matchStart') : t('play.materi.matchFind')}
      </p>
    </div>
  );
}

/** Garis bilangan: ketuk angka → sebelum & sesudahnya disorot dan disebut (Level 4–5). */
function GarisBilangan({ sampai }: { sampai: number }) {
  const [on, setOn] = useState<number>();
  const tap = (n: number) => {
    setOn(n);
    const parts = [word(n) + '.'];
    if (n > 1) parts.push(t('play.materi.beforeSay', { n: word(n), b: word(n - 1) }));
    if (n < sampai) parts.push(t('play.materi.afterSay', { n: word(n), a: word(n + 1) }));
    speak(parts.join(' '));
  };
  const rows = Math.ceil(sampai / 10);
  return (
    <div className="m-line">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="m-line-row">
          {Array.from({ length: Math.min(10, sampai - r * 10) }, (_, k) => r * 10 + k + 1).map(
            (n) => (
              <button
                key={n}
                type="button"
                className={`m-line-cell${on === n ? ' is-on' : ''}${on !== undefined && n === on - 1 ? ' is-before' : ''}${on !== undefined && n === on + 1 ? ' is-after' : ''}`}
                aria-label={word(n)}
                onClick={() => tap(n)}
              >
                {n}
              </button>
            ),
          )}
        </div>
      ))}
      <div className="m-line-arrow" aria-hidden>
        <span>{t('play.materi.smaller')}</span>
        <svg viewBox="0 0 200 20" preserveAspectRatio="none">
          <path d="M4 10H192M182 3l10 7-10 7" fill="none" stroke="#2b2540" strokeWidth="3" />
        </svg>
        <span>{t('play.materi.bigger')}</span>
      </div>
      {on === undefined ? (
        <p className="kid-note">{t('play.materi.tapNumber')}</p>
      ) : (
        <div className="m-neighbors" key={on}>
          <div className="m-neighbor is-before">
            <small>{t('play.materi.before')}</small>
            <b>{on > 1 ? on - 1 : '–'}</b>
            {on > 1 && <span>{t('play.materi.lessOne')}</span>}
          </div>
          <div className="m-neighbor is-now" style={{ background: numColor(on) }}>
            <b>{on}</b>
          </div>
          <div className="m-neighbor is-after">
            <small>{t('play.materi.after')}</small>
            <b>{on < sampai ? on + 1 : '–'}</b>
            {on < sampai && <span>{t('play.materi.moreOne')}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/** Kereta angka: isi gerbong kosong (angka berikutnya / angka yang hilang, Level 4–5). */
function Kereta({ ronde }: { ronde: { deret: number[]; kosong: number; pilihan: number[] }[] }) {
  const [r, setR] = useState(0);
  const [right, setRight] = useState(false);
  const s = useShake();
  const later = useLater();
  const round = ronde[r];
  useEffect(() => {
    if (round)
      speak(
        `${round.deret.map((n, k) => (k === round.kosong ? 'kosong' : word(n))).join(', ')}. ${t('play.materi.trainAsk')}`,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!round) return <Finished text={t('play.materi.trainDone')} onAgain={() => setR(0)} />;
  const target = round.deret[round.kosong]!;
  const pick = (n: number) => {
    if (right) return;
    if (n === target) {
      setRight(true);
      speak(`${round.deret.map(word).join(', ')}. ${t('play.materi.trainRight')}`);
      later(() => {
        setRight(false);
        setR(r + 1);
      });
    } else {
      s.shake(String(n));
      speak(
        round.kosong > 0
          ? t('play.materi.trainHintAfter', { n: word(round.deret[round.kosong - 1]!) })
          : t('play.materi.trainHintBefore', { n: word(round.deret[1]!) }),
      );
    }
  };
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <div className={`m-train${right ? ' is-go' : ''}`} key={r}>
        <Engine />
        {round.deret.map((n, k) => (
          <span key={k} className={`m-car${k === round.kosong && !right ? ' is-empty' : ''}`}>
            <b style={k === round.kosong && !right ? undefined : { color: numColor(n) }}>
              {k === round.kosong && !right ? '?' : n}
            </b>
            <i aria-hidden />
            <i aria-hidden />
          </span>
        ))}
      </div>
      <div className="m-num-row is-big">
        {round.pilihan.map((n) => (
          <NumTile
            key={s.key(String(n))}
            n={n}
            on={right && n === target}
            className={`${s.is(String(n)) ? 'is-shake' : ''}${right && n === target ? ' is-right' : ''}`}
            onClick={() => pick(n)}
          />
        ))}
      </div>
    </div>
  );
}

function Engine() {
  return (
    <svg className="m-engine" viewBox="0 0 90 70" width="90" height="70" aria-hidden>
      <rect
        x="6"
        y="22"
        width="56"
        height="34"
        rx="6"
        fill="#5b3fd6"
        stroke="#2b2540"
        strokeWidth="4"
      />
      <rect
        x="40"
        y="6"
        width="26"
        height="26"
        rx="4"
        fill="#f7c948"
        stroke="#2b2540"
        strokeWidth="4"
      />
      <rect x="14" y="10" width="12" height="14" fill="#2b2540" />
      <rect
        x="62"
        y="34"
        width="22"
        height="22"
        rx="4"
        fill="#e76f51"
        stroke="#2b2540"
        strokeWidth="4"
      />
      <circle cx="22" cy="60" r="8" fill="#2b2540" />
      <circle cx="52" cy="60" r="8" fill="#2b2540" />
    </svg>
  );
}

/** Urutkan kartu dari yang paling kecil (Level 6). */
function Urutkan({ ronde }: { ronde: number[][] }) {
  const [r, setR] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const s = useShake();
  const later = useLater();
  const cards = ronde[r];
  useEffect(() => {
    if (cards) speak(t('play.materi.sortAsk'));
  }, [cards]);
  if (!cards)
    return (
      <Finished
        text={t('play.materi.sortDone')}
        onAgain={() => {
          setR(0);
          setPlaced([]);
        }}
      />
    );
  const sorted = [...cards].sort((a, b) => a - b);
  const tap = (n: number) => {
    if (placed.includes(n)) return;
    if (n === sorted[placed.length]) {
      const next = [...placed, n];
      setPlaced(next);
      if (next.length === cards.length) {
        speak(`${next.map(word).join(', ')}. ${t('play.materi.sortRight')}`);
        later(() => {
          setPlaced([]);
          setR(r + 1);
        });
      } else speak(word(n));
    } else {
      s.shake(String(n));
      speak(t('play.materi.sortHint', { n: word(n) }));
    }
  };
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <ol className="m-slots" aria-label={t('play.materi.sortSlots')}>
        {sorted.map((n, k) => (
          <li key={k} className={placed[k] !== undefined ? 'is-filled' : undefined}>
            {placed[k] !== undefined ? (
              <span
                className="m-num is-small is-static"
                style={{ background: numColor(placed[k]!) }}
              >
                {placed[k]}
              </span>
            ) : (
              <small>{k === 0 ? t('play.materi.smallest') : k + 1}</small>
            )}
          </li>
        ))}
      </ol>
      <div className="m-num-row is-big">
        {cards.map((n) =>
          placed.includes(n) ? (
            <span key={n} className="m-num is-gone" aria-hidden />
          ) : (
            <NumTile
              key={s.key(String(n))}
              n={n}
              className={s.is(String(n)) ? 'is-shake' : ''}
              onClick={() => tap(n)}
            />
          ),
        )}
      </div>
    </div>
  );
}

/** Antrean hewan: ketuk hewan ke-n dari depan (bendera), Level 7. */
function Antrean({ hewan, ronde }: { hewan: ObjectId[]; ronde: number[] }) {
  const [r, setR] = useState(0);
  const [right, setRight] = useState(false);
  const s = useShake();
  const later = useLater();
  const target = ronde[r];
  const ask = target ? t('play.materi.queueAsk', { n: ordinalWord(target) }) : '';
  useEffect(() => {
    if (target) speak(ask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!target) return <Finished text={t('play.materi.queueDone')} onAgain={() => setR(0)} />;
  const tap = (k: number) => {
    if (right) return;
    if (k + 1 === target) {
      setRight(true);
      speak(t('play.materi.queueRight', { n: ordinalWord(target), obj: objName(hewan[k]!) }));
      later(() => {
        setRight(false);
        setR(r + 1);
      });
    } else {
      s.shake(String(k));
      speak(t('play.materi.queueHint', { n: ordinalWord(k + 1), target: ordinalWord(target) }));
    }
  };
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <div className="m-ask">
        <SpeakButton text={ask} label={t('play.materi.listenAgain')} />
        <p>{t('play.materi.queueShort', { n: ordinalWord(target) })}</p>
      </div>
      <div className="m-queue">
        <span className="m-flag" aria-hidden>
          <svg viewBox="0 0 40 50" width="40" height="50">
            <path d="M6 2 V48" stroke="#2b2540" strokeWidth="4" strokeLinecap="round" />
            <path d="M8 3 H34 L28 10 L34 17 H8 Z" fill="#e76f51" stroke="#2b2540" strokeWidth="3" />
          </svg>
          {t('play.lesson.queueFront')}
        </span>
        {hewan.map((h, k) => (
          <button
            key={s.key(String(k))}
            type="button"
            className={`m-queue-item${s.is(String(k)) ? ' is-shake' : ''}${right && k + 1 === target ? ' is-right' : ''}`}
            aria-label={objName(h)}
            onClick={() => tap(k)}
          >
            {right && k < target && <span className="m-badge">{k + 1}</span>}
            <VisualView visual={{ kind: 'object', object: h }} size={60} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Bandingkan: kartu angka + menara kubus, ketuk yang paling besar/kecil (Level 8, 10). */
function Banding({ ronde }: { ronde: { angka: number[]; cari: 'besar' | 'kecil' }[] }) {
  const [r, setR] = useState(0);
  const [right, setRight] = useState(false);
  const s = useShake();
  const later = useLater();
  const round = ronde[r];
  const ask = round
    ? t(round.cari === 'besar' ? 'play.materi.biggestAsk' : 'play.materi.smallestAsk')
    : '';
  useEffect(() => {
    if (round) speak(ask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!round) return <Finished text={t('play.materi.compareDone')} onAgain={() => setR(0)} />;
  const target = round.cari === 'besar' ? Math.max(...round.angka) : Math.min(...round.angka);
  const max = Math.max(...round.angka);
  const tap = (n: number) => {
    if (right) return;
    if (n === target) {
      setRight(true);
      speak(
        t(round.cari === 'besar' ? 'play.materi.biggestRight' : 'play.materi.smallestRight', {
          n: word(n),
        }),
      );
      later(() => {
        setRight(false);
        setR(r + 1);
      });
    } else {
      s.shake(String(n));
      speak(
        t(round.cari === 'besar' ? 'play.materi.biggestHint' : 'play.materi.smallestHint', {
          n: word(n),
        }),
      );
    }
  };
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <div className="m-ask">
        <SpeakButton text={ask} label={t('play.materi.listenAgain')} />
        <p>{ask}</p>
      </div>
      <div className="m-towers">
        {round.angka.map((n) => (
          <button
            key={s.key(String(n))}
            type="button"
            className={`m-tower${s.is(String(n)) ? ' is-shake' : ''}${right && n === target ? ' is-right' : ''}`}
            aria-label={word(n)}
            onClick={() => tap(n)}
          >
            <span className="m-tower-stack" style={{ height: `${max * 13 + 8}px` }} aria-hidden>
              {Array.from({ length: n }, (_, k) => (
                <i key={k} style={{ background: numColor(n), opacity: k >= 10 ? 0.75 : 1 }} />
              ))}
            </span>
            <b style={{ background: numColor(n) }}>{n}</b>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Bingkai sepuluh: isi kotak sampai banyaknya pas (Level 9). */
function Bingkai({ ronde }: { ronde: number[] }) {
  const [r, setR] = useState(0);
  const [filled, setFilled] = useState(0);
  const later = useLater();
  const target = ronde[r];
  const ask = target ? t('play.materi.frameAsk', { n: word(target) }) : '';
  useEffect(() => {
    if (target) speak(ask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!target)
    return (
      <Finished
        text={t('play.materi.frameDone')}
        onAgain={() => {
          setR(0);
          setFilled(0);
        }}
      />
    );
  const frames = target > 10 ? 2 : 1;
  const done = filled >= target;
  const add = () => {
    if (done) return;
    const n = filled + 1;
    setFilled(n);
    if (n === target) {
      speak(
        target > 10
          ? t('play.materi.frameRightTeen', { n: word(n), rest: word(n - 10) })
          : t('play.materi.frameRight', { n: word(n) }),
      );
      later(() => {
        setFilled(0);
        setR(r + 1);
      }, 2600);
    } else if (n === 10) speak(t('play.materi.frameFull'));
    else speak(word(n));
  };
  const undo = () => {
    if (filled > 0 && !done) setFilled(filled - 1);
  };
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <div className="m-ask">
        <SpeakButton text={ask} label={t('play.materi.listenAgain')} />
        <p>{t('play.materi.frameShort', { n: target })}</p>
      </div>
      <div className="m-frames">
        {Array.from({ length: frames }, (_, f) => (
          <div key={f} className={`m-frame${filled >= (f + 1) * 10 ? ' is-full' : ''}`}>
            {Array.from({ length: 10 }, (_, c) => {
              const idx = f * 10 + c;
              const on = idx < filled;
              return (
                <button
                  key={c}
                  type="button"
                  className={`m-cell${on ? ' is-on' : ''}`}
                  aria-label={on ? word(idx + 1) : t('play.materi.frameCell')}
                  onClick={add}
                >
                  {on && <i />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="m-frame-count">
        <b>{filled}</b>
        {filled > 10 && <span>= 10 + {filled - 10}</span>}
        <button
          type="button"
          className="kid-btn secondary"
          onClick={undo}
          disabled={!filled || done}
        >
          {t('play.materi.undo')}
        </button>
      </div>
    </div>
  );
}
