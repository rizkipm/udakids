import { useEffect, useMemo, useRef, useState } from 'react';
import { numberWord, ordinalWord, OBJECTS, type ObjectId, type Visual } from '@little-coder/engine';
import { speak, stopSpeaking } from '../../audio/speech';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import { SpeakButton } from '../ItemPlayer';
import { GlyphWrite } from '../Lesson';
import { glyphOf } from '@little-coder/engine';
import type { LabExperiment, LabScene } from '@little-coder/engine';

/** Warna angka (sama dengan pelajaran biasa) supaya anak mengenali angka yang sama. */
/** Warna angka dari token design system (`--isi-0` … `--isi-10`, D-107), sama dengan pelajaran biasa. */
const NUM_COLOR = Array.from({ length: 11 }, (_, n) => `var(--isi-${n})`);
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

function Finished({
  text,
  onAgain,
  onDone,
}: {
  text: string;
  onAgain: () => void;
  onDone?: () => void;
}) {
  useEffect(() => {
    speak(text);
    onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
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
export function PeragaanPlayer({ adegan }: { adegan: LabScene[] }) {
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

type MathExp = Extract<
  LabExperiment,
  {
    jenis:
      | 'kenal-angka'
      | 'dengar-ketuk'
      | 'hitung-ketuk'
      | 'pasang-angka'
      | 'garis-bilangan'
      | 'kereta'
      | 'urutkan'
      | 'antrean'
      | 'banding'
      | 'bingkai'
      | 'tambah-kurang'
      | 'jam'
      | 'uang'
      | 'nilai-tempat'
      | 'bangun'
      | 'pecahan'
      | 'kali'
      | 'bagi'
      | 'ukur'
      | 'luas'
      | 'diagram';
  }
>;
const MATH = new Set<string>([
  'kenal-angka',
  'dengar-ketuk',
  'hitung-ketuk',
  'pasang-angka',
  'garis-bilangan',
  'kereta',
  'urutkan',
  'antrean',
  'banding',
  'bingkai',
  'tambah-kurang',
  'jam',
  'uang',
  'nilai-tempat',
  'bangun',
  'pecahan',
  'kali',
  'bagi',
  'ukur',
  'luas',
  'diagram',
]);
export const isMath = (e: LabExperiment): e is MathExp => MATH.has(e.jenis);

/** Eksperimen matematika (alat peraga angka); `onDone` saat semua ronde selesai. */
export function MathExperiment({ e, onDone }: { e: MathExp; onDone: () => void }) {
  switch (e.jenis) {
    case 'kenal-angka':
      return <KenalAngka sampai={e.sampai} benda={e.benda} onDone={onDone} />;
    case 'dengar-ketuk':
      return <DengarKetuk ronde={e.ronde} onDone={onDone} />;
    case 'hitung-ketuk':
      return <HitungKetuk ronde={e.ronde} onDone={onDone} />;
    case 'pasang-angka':
      return <Pasangkan pasangan={e.pasangan} onDone={onDone} />;
    case 'garis-bilangan':
      return <GarisBilangan sampai={e.sampai} onDone={onDone} />;
    case 'kereta':
      return <Kereta ronde={e.ronde} onDone={onDone} />;
    case 'urutkan':
      return <Urutkan ronde={e.ronde} turun={e.turun} onDone={onDone} />;
    case 'antrean':
      return <Antrean hewan={e.hewan} ronde={e.ronde} onDone={onDone} />;
    case 'banding':
      return <Banding ronde={e.ronde} onDone={onDone} />;
    case 'bingkai':
      return <Bingkai ronde={e.ronde} onDone={onDone} />;
    case 'tambah-kurang':
      return <TambahKurang ronde={e.ronde} onDone={onDone} />;
    case 'jam':
      return <Jam ronde={e.ronde} onDone={onDone} />;
    case 'uang':
      return <Uang ronde={e.ronde} onDone={onDone} />;
    case 'nilai-tempat':
      return <NilaiTempat ronde={e.ronde} onDone={onDone} />;
    case 'bangun':
      return <Bangun ronde={e.ronde} onDone={onDone} />;
    case 'pecahan':
      return <Pecahan ronde={e.ronde} onDone={onDone} />;
    case 'kali':
      return <Kali ronde={e.ronde} onDone={onDone} />;
    case 'bagi':
      return <Bagi ronde={e.ronde} onDone={onDone} />;
    case 'ukur':
      return <Ukur ronde={e.ronde} satuan={e.satuan} onDone={onDone} />;
    case 'luas':
      return <Luas ronde={e.ronde} onDone={onDone} />;
    case 'diagram':
      return <Diagram ronde={e.ronde} onDone={onDone} />;
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
function KenalAngka({
  onDone,
  sampai,
  benda,
}: {
  sampai: number;
  benda: ObjectId;
  onDone: () => void;
}) {
  const [on, setOn] = useState<number>();
  const [seen, setSeen] = useState<number[]>([]);
  const tap = (n: number) => {
    setOn(n);
    if (!seen.includes(n)) {
      const next = [...seen, n];
      setSeen(next);
      if (next.length === sampai) onDone();
    }
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
function DengarKetuk({
  onDone,
  ronde,
}: {
  ronde: { target: number; pilihan: number[] }[];
  onDone: () => void;
}) {
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
      <Finished
        onDone={onDone}
        text={t('play.materi.listenDone')}
        onAgain={() => (setR(0), setRight(false))}
      />
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
function HitungKetuk({
  onDone,
  ronde,
}: {
  ronde: { n: number; benda: ObjectId; pilihan: number[] }[];
  onDone: () => void;
}) {
  const [r, setR] = useState(0);
  const [counted, setCounted] = useState<number[]>([]);
  const [right, setRight] = useState(false);
  const s = useShake();
  const later = useLater();
  const round = ronde[r];
  if (!round)
    return (
      <Finished
        onDone={onDone}
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
function Pasangkan({
  onDone,
  pasangan,
}: {
  pasangan: { n: number; benda: ObjectId }[];
  onDone: () => void;
}) {
  // Kelompok benda tampil dengan urutan diputar (tetap, bukan acak) supaya pasangannya tidak sejajar.
  const groups = useMemo(() => pasangan.map((_, k) => (k + 1) % pasangan.length), [pasangan]);
  const [sel, setSel] = useState<number>();
  const [done, setDone] = useState<number[]>([]);
  const s = useShake();
  if (done.length === pasangan.length)
    return (
      <Finished
        onDone={onDone}
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
function GarisBilangan({ onDone, sampai }: { sampai: number; onDone: () => void }) {
  const [on, setOn] = useState<number>();
  const [taps, setTaps] = useState(0);
  const tap = (n: number) => {
    setOn(n);
    // Cukup menjelajah 5 angka untuk menandai percobaan ini selesai.
    if (taps + 1 === 5) onDone();
    setTaps((x) => x + 1);
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
function Kereta({
  onDone,
  ronde,
}: {
  ronde: { deret: number[]; kosong: number; pilihan: number[] }[];
  onDone: () => void;
}) {
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
  if (!round)
    return <Finished onDone={onDone} text={t('play.materi.trainDone')} onAgain={() => setR(0)} />;
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
        fill="var(--langit)"
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
function Urutkan({
  onDone,
  ronde,
  turun = false,
}: {
  ronde: number[][];
  turun?: boolean;
  onDone: () => void;
}) {
  const [r, setR] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const s = useShake();
  const later = useLater();
  const cards = ronde[r];
  useEffect(() => {
    if (cards) speak(t(turun ? 'play.materi.sortAskDown' : 'play.materi.sortAsk'));
  }, [cards, turun]);
  if (!cards)
    return (
      <Finished
        onDone={onDone}
        text={t('play.materi.sortDone')}
        onAgain={() => {
          setR(0);
          setPlaced([]);
        }}
      />
    );
  const sorted = [...cards].sort((a, b) => (turun ? b - a : a - b));
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
      speak(t(turun ? 'play.materi.sortHintDown' : 'play.materi.sortHint', { n: word(n) }));
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
              <small>
                {k === 0 ? t(turun ? 'play.materi.biggest' : 'play.materi.smallest') : k + 1}
              </small>
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
function Antrean({
  onDone,
  hewan,
  ronde,
}: {
  hewan: ObjectId[];
  ronde: number[];
  onDone: () => void;
}) {
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
  if (!target)
    return <Finished onDone={onDone} text={t('play.materi.queueDone')} onAgain={() => setR(0)} />;
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
function Banding({
  onDone,
  ronde,
}: {
  ronde: { angka: number[]; cari: 'besar' | 'kecil' }[];
  onDone: () => void;
}) {
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
  if (!round)
    return <Finished onDone={onDone} text={t('play.materi.compareDone')} onAgain={() => setR(0)} />;
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
            {max <= 20 ? (
              <span className="m-tower-stack" style={{ height: `${max * 13 + 8}px` }} aria-hidden>
                {Array.from({ length: n }, (_, k) => (
                  <i key={k} style={{ background: numColor(n), opacity: k >= 10 ? 0.75 : 1 }} />
                ))}
              </span>
            ) : (
              // Bilangan besar: batang setinggi sebanding (tanpa kubus satu per satu).
              <span className="m-tower-stack is-bar" style={{ height: 268 }} aria-hidden>
                <i style={{ height: `${(n / max) * 260}px`, background: numColor(n % 11) }} />
              </span>
            )}
            <b style={{ background: numColor(n) }}>{n}</b>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Bingkai sepuluh: isi kotak sampai banyaknya pas (Level 9). */
function Bingkai({ onDone, ronde }: { ronde: number[]; onDone: () => void }) {
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
        onDone={onDone}
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

type TkRonde = {
  a: number;
  b: number;
  op: 'tambah' | 'kurang';
  benda: ObjectId;
  pilihan: number[];
};

/**
 * Tambah: kelompok kedua masuk saat diketuk lalu semua dihitung; kurang: ketuk benda untuk mengambilnya (dicoret),
 * lalu hitung sisanya. Setelah itu pilih angkanya.
 */
function TambahKurang({ ronde, onDone }: { ronde: TkRonde[]; onDone: () => void }) {
  const [r, setR] = useState(0);
  const [moved, setMoved] = useState(0);
  const [right, setRight] = useState(false);
  const s = useShake();
  const later = useLater();
  const round = ronde[r];
  useEffect(() => {
    if (!round) return;
    speak(
      round.op === 'tambah'
        ? t('play.materi.addAsk', { a: word(round.a), b: word(round.b), obj: objName(round.benda) })
        : t('play.materi.subAsk', {
            a: word(round.a),
            b: word(round.b),
            obj: objName(round.benda),
          }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!round)
    return (
      <Finished
        onDone={onDone}
        text={t('play.materi.addSubDone')}
        onAgain={() => {
          setR(0);
          setMoved(0);
        }}
      />
    );
  const want = round.op === 'tambah' ? round.a + round.b : round.a - round.b;
  const ready = moved >= round.b;
  const tapObj = () => {
    if (ready) return;
    const n = moved + 1;
    setMoved(n);
    speak(n >= round.b ? t('play.materi.howMany') : word(n));
  };
  const pick = (n: number) => {
    if (right || !ready) return;
    if (n === want) {
      setRight(true);
      speak(
        round.op === 'tambah'
          ? t('play.materi.addRight', { a: word(round.a), b: word(round.b), n: word(n) })
          : t('play.materi.subRight', { a: word(round.a), b: word(round.b), n: word(n) }),
      );
      later(() => {
        setRight(false);
        setMoved(0);
        setR(r + 1);
      }, 2400);
    } else {
      s.shake(String(n));
      speak(t('play.materi.countHint', { n: word(want) }));
    }
  };
  const total = round.op === 'tambah' ? round.a + round.b : round.a;
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <p className="lab-eq" aria-live="polite">
        {round.a} {round.op === 'tambah' ? '+' : '−'} {round.b} = {right ? want : '?'}
      </p>
      <div className="m-count-field lab-addsub" key={r}>
        {Array.from({ length: total }, (_, k) => {
          const second = round.op === 'tambah' && k >= round.a;
          const hidden = second && k - round.a >= moved;
          const crossed = round.op === 'kurang' && k >= round.a - moved;
          return (
            <button
              key={k}
              type="button"
              className={`m-count-obj${hidden ? ' is-waiting' : ''}${crossed ? ' is-crossed' : ''}${second && !hidden ? ' is-new' : ''}`}
              aria-label={objName(round.benda)}
              onClick={tapObj}
            >
              <VisualView
                visual={{ kind: 'object', object: round.benda }}
                size={total > 20 ? 34 : 56}
              />
            </button>
          );
        })}
      </div>
      {ready ? (
        <>
          <p className="kid-note">{t('play.materi.howMany')}</p>
          <div className="m-num-row is-big">
            {round.pilihan.map((n) => (
              <NumTile
                key={s.key(String(n))}
                n={n}
                on={right && n === want}
                className={`${s.is(String(n)) ? 'is-shake' : ''}${right && n === want ? ' is-right' : ''}`}
                onClick={() => pick(n)}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="kid-note">
          {round.op === 'tambah' ? t('play.materi.addTap') : t('play.materi.subTap')}
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Widget SD (L2) */

const timeSay = (h: number, m: number) =>
  m === 0
    ? t('play.materi.clockSharp', { h: word(h) })
    : t('play.materi.clockPast', { h: word(h), m: word(m) });

/** Atur jarum jam: jarum pendek (jam) dan jarum panjang (menit, kelipatan 5). Tepat → otomatis lanjut. */
function Jam({ ronde, onDone }: { ronde: { jam: number; menit: number }[]; onDone: () => void }) {
  const [r, setR] = useState(0);
  const [h, setH] = useState(12);
  const [m, setM] = useState(0);
  const [right, setRight] = useState(false);
  const later = useLater();
  const round = ronde[r];
  useEffect(() => {
    if (round) speak(t('play.materi.clockAsk', { time: timeSay(round.jam, round.menit) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!round)
    return (
      <Finished
        onDone={onDone}
        text={t('play.materi.clockDone')}
        onAgain={() => {
          setR(0);
          setH(12);
          setM(0);
        }}
      />
    );
  const set = (nh: number, nm: number) => {
    if (right) return;
    setH(nh);
    setM(nm);
    if (nh === round.jam && nm === round.menit) {
      setRight(true);
      speak(t('play.materi.clockRight', { time: timeSay(nh, nm) }));
      later(() => {
        setRight(false);
        setR(r + 1);
      }, 2200);
    }
  };
  const hourHint = h !== round.jam;
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <div className="m-ask">
        <SpeakButton text={t('play.materi.clockAsk', { time: timeSay(round.jam, round.menit) })} />
        <p>{timeSay(round.jam, round.menit)}</p>
      </div>
      <div className={`lab-clock${right ? ' is-right' : ''}`}>
        <VisualView visual={{ kind: 'clock', hour: h, minute: m }} size={220} />
        <span className="lab-digital">
          {h}.{String(m).padStart(2, '0')}
        </span>
      </div>
      <div className="lab-clock-ctrl">
        <div>
          <small>{t('play.materi.clockHour')}</small>
          <button
            type="button"
            className="lab-toggle"
            onClick={() => set(h === 1 ? 12 : h - 1, m)}
            aria-label={t('play.materi.clockHourDown')}
          >
            −
          </button>
          <button
            type="button"
            className="lab-toggle"
            onClick={() => set(h === 12 ? 1 : h + 1, m)}
            aria-label={t('play.materi.clockHourUp')}
          >
            +
          </button>
        </div>
        <div>
          <small>{t('play.materi.clockMinute')}</small>
          <button
            type="button"
            className="lab-toggle"
            onClick={() => set(h, m === 0 ? 55 : m - 5)}
            aria-label={t('play.materi.clockMinDown')}
          >
            −
          </button>
          <button
            type="button"
            className="lab-toggle"
            onClick={() => set(h, m === 55 ? 0 : m + 5)}
            aria-label={t('play.materi.clockMinUp')}
          >
            +
          </button>
        </div>
      </div>
      {!right && (
        <p className="kid-note">
          {hourHint ? t('play.materi.clockHintHour') : t('play.materi.clockHintMinute')}
        </p>
      )}
    </div>
  );
}

const rupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

/** Bayar tepat: ketuk koin/uang kertas ke nampan; ketuk yang di nampan untuk mengambilnya kembali. */
function Uang({
  ronde,
  onDone,
}: {
  ronde: { harga: number; benda: ObjectId; pecahan: number[] }[];
  onDone: () => void;
}) {
  const [r, setR] = useState(0);
  const [tray, setTray] = useState<number[]>([]);
  const [right, setRight] = useState(false);
  const later = useLater();
  const round = ronde[r];
  useEffect(() => {
    if (round)
      speak(t('play.materi.moneyAsk', { obj: objName(round.benda), price: word(round.harga) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!round)
    return (
      <Finished
        onDone={onDone}
        text={t('play.materi.moneyDone')}
        onAgain={() => {
          setR(0);
          setTray([]);
        }}
      />
    );
  const sum = tray.reduce((a, b) => a + b, 0);
  const update = (next: number[]) => {
    setTray(next);
    const total = next.reduce((a, b) => a + b, 0);
    if (total === round.harga) {
      setRight(true);
      speak(t('play.materi.moneyRight', { price: word(total) }));
      later(() => {
        setRight(false);
        setTray([]);
        setR(r + 1);
      }, 2400);
    } else if (total > round.harga) speak(t('play.materi.moneyTooMuch'));
    else speak(word(total));
  };
  const money = (v: number) =>
    v >= 1000 && v !== 1000
      ? { kind: 'note' as const, value: v as 2000 }
      : { kind: 'coin' as const, value: v as 100 };
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <div className="lab-shop">
        <span className="lab-shop-item">
          <VisualView visual={{ kind: 'object', object: round.benda }} size={90} />
          <b>{rupiah(round.harga)}</b>
        </span>
        <div
          className={`lab-tray${right ? ' is-right' : sum > round.harga ? ' is-over' : ''}`}
          aria-live="polite"
        >
          {tray.length === 0 && <small>{t('play.materi.moneyTray')}</small>}
          {tray.map((v, k) => (
            <button
              key={k}
              type="button"
              className="lab-money is-in"
              aria-label={rupiah(v)}
              onClick={() => !right && update(tray.filter((_, j) => j !== k))}
            >
              <VisualView visual={money(v)} size={52} />
            </button>
          ))}
          <strong className="lab-tray-sum">{rupiah(sum)}</strong>
        </div>
      </div>
      <div className="lab-wallet" role="group" aria-label={t('play.materi.moneyWallet')}>
        {round.pecahan.map((v) => (
          <button
            key={v}
            type="button"
            className="lab-money"
            aria-label={rupiah(v)}
            onClick={() => !right && update([...tray, v])}
          >
            <VisualView visual={money(v)} size={64} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Susun bilangan: +10 (batang puluhan) dan +1 (kubus satuan); 10 satuan ditukar menjadi 1 puluhan. */
/** Lempeng ratusan, batang puluhan, kubus satuan (CSS) untuk bilangan ratusan. */
function BaseTen({ h, t: tt, o }: { h: number; t: number; o: number }) {
  return (
    <div className="lab-base10" aria-hidden>
      {Array.from({ length: h }, (_, k) => (
        <span key={`h${k}`} className="lab-flat" />
      ))}
      {Array.from({ length: tt }, (_, k) => (
        <span key={`t${k}`} className="lab-rod" />
      ))}
      <span className="lab-units">
        {Array.from({ length: o }, (_, k) => (
          <i key={k} />
        ))}
      </span>
    </div>
  );
}

/**
 * Susun bilangan dengan ratusan, puluhan, dan satuan. 10 satuan ditukar jadi 1 puluhan; 10 puluhan ditukar jadi
 * 1 ratusan. Kolom ratusan hanya muncul bila bilangannya ≥ 100.
 */
function NilaiTempat({ ronde, onDone }: { ronde: number[]; onDone: () => void }) {
  const [r, setR] = useState(0);
  const [hund, setHund] = useState(0);
  const [tens, setTens] = useState(0);
  const [ones, setOnes] = useState(0);
  const [right, setRight] = useState(false);
  const later = useLater();
  const n = ronde[r];
  useEffect(() => {
    if (n !== undefined) speak(t('play.materi.placeAsk', { n: word(n) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (n === undefined)
    return (
      <Finished
        onDone={onDone}
        text={t('play.materi.placeDone')}
        onAgain={() => {
          setR(0);
          setHund(0);
          setTens(0);
          setOnes(0);
        }}
      />
    );
  const big = n >= 100;
  const check = (hh: number, tt: number, oo: number) => {
    setHund(hh);
    setTens(tt);
    setOnes(oo);
    const val = hh * 100 + tt * 10 + oo;
    if (val === n) {
      setRight(true);
      speak(
        hh
          ? t('play.materi.placeRight3', { n: word(n), h: word(hh), t: word(tt), o: word(oo) })
          : t('play.materi.placeRight', { n: word(n), t: word(tt), o: word(oo) }),
      );
      later(() => {
        setRight(false);
        setHund(0);
        setTens(0);
        setOnes(0);
        setR(r + 1);
      }, 2600);
    } else speak(word(val));
  };
  const addTen = () => {
    if (right) return;
    if (big && tens === 9) {
      speak(t('play.materi.placeTrade100'));
      check(hund + 1, 0, ones);
    } else check(hund, tens + 1, ones);
  };
  const addOne = () => {
    if (right) return;
    if (ones === 9) {
      speak(t('play.materi.placeTrade'));
      if (big && tens === 9) check(hund + 1, 0, 0);
      else check(hund, tens + 1, 0);
    } else check(hund, tens, ones + 1);
  };
  const col = (
    label: string,
    down: string,
    up: string,
    canDown: boolean,
    canUp: boolean,
    onDown: () => void,
    onUp: () => void,
  ) => (
    <div>
      <small>{label}</small>
      <button
        type="button"
        className="lab-toggle"
        disabled={!canDown}
        onClick={() => !right && onDown()}
        aria-label={down}
      >
        −
      </button>
      <button
        type="button"
        className="lab-toggle"
        disabled={!canUp}
        onClick={() => !right && onUp()}
        aria-label={up}
      >
        +
      </button>
    </div>
  );
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <div className="m-ask">
        <SpeakButton text={t('play.materi.placeAsk', { n: word(n) })} />
        <p className="lab-eq">{n}</p>
      </div>
      <div className={`lab-place${right ? ' is-right' : ''}`}>
        {big ? (
          <BaseTen h={hund} t={tens} o={ones} />
        ) : (
          <VisualView visual={{ kind: 'tens', tens: Math.min(10, tens), ones }} size={170} />
        )}
        <p className="lab-place-sum">
          {big && <span>{t('play.materi.placeHund', { n: hund })}</span>}
          <span>{t('play.materi.placeTens', { n: tens })}</span>
          <span>{t('play.materi.placeOnes', { n: ones })}</span>
          <b>= {hund * 100 + tens * 10 + ones}</b>
        </p>
      </div>
      <div className="lab-clock-ctrl">
        {big &&
          col(
            t('play.materi.placeHundLabel'),
            t('play.materi.placeHundDown'),
            t('play.materi.placeHundUp'),
            hund > 0,
            hund < 9,
            () => check(hund - 1, tens, ones),
            () => check(hund + 1, tens, ones),
          )}
        {col(
          t('play.materi.placeTensLabel'),
          t('play.materi.placeTensDown'),
          t('play.materi.placeTensUp'),
          tens > 0,
          big || tens < 10,
          () => check(hund, tens - 1, ones),
          addTen,
        )}
        {col(
          t('play.materi.placeOnesLabel'),
          t('play.materi.placeOnesDown'),
          t('play.materi.placeOnesUp'),
          ones > 0,
          true,
          () => check(hund, tens, ones - 1),
          addOne,
        )}
      </div>
    </div>
  );
}

/** Titik sudut bangun datar dalam kotak 300×240. */
const SHAPE_POINTS: Record<string, [number, number][]> = {
  segitiga: [
    [150, 20],
    [270, 220],
    [30, 220],
  ],
  persegi: [
    [50, 20],
    [250, 20],
    [250, 220],
    [50, 220],
  ],
  'persegi-panjang': [
    [20, 50],
    [280, 50],
    [280, 190],
    [20, 190],
  ],
  'segi-lima': [
    [150, 18],
    [272, 104],
    [226, 226],
    [74, 226],
    [28, 104],
  ],
  'segi-enam': [
    [90, 20],
    [210, 20],
    [272, 120],
    [210, 220],
    [90, 220],
    [28, 120],
  ],
  'belah-ketupat': [
    [150, 10],
    [270, 120],
    [150, 230],
    [30, 120],
  ],
};

/** Ketuk setiap sisi bangun (dihitung & diberi nomor); setelah semua, sisi & sudutnya disebut. */
function Bangun({ ronde, onDone }: { ronde: string[]; onDone: () => void }) {
  const [r, setR] = useState(0);
  const [got, setGot] = useState<number[]>([]);
  const later = useLater();
  const shape = ronde[r];
  useEffect(() => {
    if (shape) speak(t('play.materi.shapeAsk', { shape: shape.replace('-', ' ') }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!shape)
    return <Finished onDone={onDone} text={t('play.materi.shapeDone')} onAgain={() => setR(0)} />;
  const pts = SHAPE_POINTS[shape] ?? SHAPE_POINTS.persegi!;
  const n = pts.length;
  const all = got.length === n;
  const tap = (k: number) => {
    if (all || got.includes(k)) return;
    const next = [...got, k];
    setGot(next);
    if (next.length === n) {
      speak(t('play.materi.shapeRight', { shape: shape.replace('-', ' '), n: word(n) }));
      later(() => {
        setGot([]);
        setR(r + 1);
      }, 2600);
    } else speak(word(next.length));
  };
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <svg
        className={`lab-shape${all ? ' is-right' : ''}`}
        viewBox="0 0 300 240"
        role="group"
        aria-label={shape}
      >
        <polygon points={pts.map((p) => p.join(',')).join(' ')} fill="#efe9ff" />
        {pts.map((p, k) => {
          const q = pts[(k + 1) % n]!;
          const at = got.indexOf(k);
          const mx = (p[0] + q[0]) / 2;
          const my = (p[1] + q[1]) / 2;
          return (
            <g
              key={k}
              className="lab-side"
              onClick={() => tap(k)}
              role="button"
              aria-label={t('play.materi.shapeSide', { n: k + 1 })}
            >
              <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="transparent" strokeWidth={34} />
              <line
                x1={p[0]}
                y1={p[1]}
                x2={q[0]}
                y2={q[1]}
                stroke={at >= 0 ? '#2e9e5b' : '#2b2540'}
                strokeWidth={at >= 0 ? 12 : 7}
                strokeLinecap="round"
              />
              {at >= 0 && (
                <g>
                  <circle cx={mx} cy={my} r={16} fill="#2e9e5b" stroke="#2b2540" strokeWidth={3} />
                  <text
                    x={mx}
                    y={my + 6}
                    textAnchor="middle"
                    fontSize={18}
                    fontWeight={900}
                    fill="#fff"
                  >
                    {at + 1}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {all &&
          pts.map((p, k) => (
            <circle
              key={`c${k}`}
              cx={p[0]}
              cy={p[1]}
              r={10}
              fill="#f7c948"
              stroke="#2b2540"
              strokeWidth={3}
            />
          ))}
      </svg>
      <p className="kid-note">
        {all ? t('play.materi.shapeCount', { n }) : t('play.materi.shapeTap', { n: got.length })}
      </p>
    </div>
  );
}

/** Warnai `warnai` dari `bagian` potongan pizza yang sama besar. */
function Pecahan({
  ronde,
  onDone,
}: {
  ronde: { bagian: number; warnai: number }[];
  onDone: () => void;
}) {
  const [r, setR] = useState(0);
  const [on, setOn] = useState<number[]>([]);
  const [right, setRight] = useState(false);
  const later = useLater();
  const round = ronde[r];
  useEffect(() => {
    if (round) speak(t('play.materi.fracAsk', { k: word(round.warnai), n: word(round.bagian) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!round)
    return (
      <Finished
        onDone={onDone}
        text={t('play.materi.fracDone')}
        onAgain={() => {
          setR(0);
          setOn([]);
        }}
      />
    );
  const n = round.bagian;
  const tap = (k: number) => {
    if (right) return;
    const next = on.includes(k) ? on.filter((x) => x !== k) : [...on, k];
    setOn(next);
    if (next.length === round.warnai) {
      setRight(true);
      speak(t('play.materi.fracRight', { k: word(round.warnai), n: word(n) }));
      later(() => {
        setRight(false);
        setOn([]);
        setR(r + 1);
      }, 2400);
    } else if (next.length > round.warnai) speak(t('play.materi.fracTooMany'));
    else speak(word(next.length));
  };
  const slice = (k: number) => {
    const a0 = (k / n) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((k + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const R = 110;
    const x0 = 120 + R * Math.cos(a0);
    const y0 = 120 + R * Math.sin(a0);
    const x1 = 120 + R * Math.cos(a1);
    const y1 = 120 + R * Math.sin(a1);
    return `M120 120 L${x0} ${y0} A${R} ${R} 0 ${1 / n > 0.5 ? 1 : 0} 1 ${x1} ${y1} Z`;
  };
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <p className="lab-eq">
        <span className="lab-frac">
          <b>{round.warnai}</b>
          <i />
          <b>{n}</b>
        </span>
      </p>
      <svg
        className={`lab-pizza${right ? ' is-right' : ''}`}
        viewBox="0 0 240 240"
        role="group"
        aria-label={t('play.materi.fracLabel', { n })}
      >
        <circle cx={120} cy={120} r={116} fill="#e9a400" stroke="#2b2540" strokeWidth={5} />
        {Array.from({ length: n }, (_, k) => (
          <path
            key={k}
            d={slice(k)}
            fill={on.includes(k) ? '#e76f51' : '#ffe8a3'}
            stroke="#2b2540"
            strokeWidth={4}
            role="button"
            aria-label={t('play.materi.fracSlice', { n: k + 1 })}
            onClick={() => tap(k)}
          />
        ))}
      </svg>
      <p className="kid-note">{t('play.materi.fracCount', { k: on.length, n })}</p>
    </div>
  );
}

/** Pilih angka jawaban; benar → pujian & ronde berikutnya, keliru → goyang + petunjuk. */
function useAnswer(onRight: () => void) {
  const s = useShake();
  const [right, setRight] = useState(false);
  const later = useLater();
  const pick = (n: number, want: number, say: string, hint: string) => {
    if (right) return;
    if (n === want) {
      setRight(true);
      speak(say);
      later(() => {
        setRight(false);
        onRight();
      }, 2400);
    } else {
      s.shake(String(n));
      speak(hint);
    }
  };
  const tiles = (choices: number[], want: number, say: string, hint: string) => (
    <div className="m-num-row is-big">
      {choices.map((n) => (
        <NumTile
          key={s.key(String(n))}
          n={n}
          on={right && n === want}
          className={`${s.is(String(n)) ? 'is-shake' : ''}${right && n === want ? ' is-right' : ''}`}
          onClick={() => pick(n, want, say, hint)}
        />
      ))}
    </div>
  );
  return { right, tiles };
}

type KaliRonde = { baris: number; kolom: number; benda: ObjectId; pilihan: number[] };

/** Perkalian = baris sama banyak: ketuk untuk menambah baris (Momo menjumlah berulang), lalu pilih hasilnya. */
function Kali({ ronde, onDone }: { ronde: KaliRonde[]; onDone: () => void }) {
  const [r, setR] = useState(0);
  const [rows, setRows] = useState(0);
  const round = ronde[r];
  const ans = useAnswer(() => {
    setRows(0);
    setR(r + 1);
  });
  useEffect(() => {
    if (round)
      speak(
        t('play.materi.mulAsk', {
          b: word(round.baris),
          k: word(round.kolom),
          obj: objName(round.benda),
        }),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!round)
    return <Finished onDone={onDone} text={t('play.materi.mulDone')} onAgain={() => setR(0)} />;
  const want = round.baris * round.kolom;
  const add = () => {
    if (rows >= round.baris) return;
    const n = rows + 1;
    setRows(n);
    speak(
      n === round.baris
        ? `${word(n * round.kolom)}. ${t('play.materi.howMany')}`
        : word(n * round.kolom),
    );
  };
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <p className="lab-eq">
        {round.baris} × {round.kolom} = {ans.right ? want : '?'}
      </p>
      <div className="lab-array">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="lab-array-row">
            {Array.from({ length: round.kolom }, (_, j) => (
              <VisualView key={j} visual={{ kind: 'object', object: round.benda }} size={40} />
            ))}
            <b>{(i + 1) * round.kolom}</b>
          </div>
        ))}
      </div>
      {rows < round.baris ? (
        <button type="button" className="kid-btn" onClick={add}>
          {t('play.materi.mulAddRow', { k: round.kolom })}
        </button>
      ) : (
        ans.tiles(
          round.pilihan,
          want,
          t('play.materi.mulRight', { b: word(round.baris), k: word(round.kolom), n: word(want) }),
          t('play.materi.mulHint'),
        )
      )}
    </div>
  );
}

type BagiRonde = { jumlah: number; piring: number; benda: ObjectId; pilihan: number[] };

/** Pembagian = berbagi rata: setiap ketukan membagikan satu benda ke piring berikutnya. */
function Bagi({ ronde, onDone }: { ronde: BagiRonde[]; onDone: () => void }) {
  const [r, setR] = useState(0);
  const [dealt, setDealt] = useState(0);
  const round = ronde[r];
  const ans = useAnswer(() => {
    setDealt(0);
    setR(r + 1);
  });
  useEffect(() => {
    if (round)
      speak(
        t('play.materi.divAsk', {
          n: word(round.jumlah),
          obj: objName(round.benda),
          p: word(round.piring),
        }),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!round)
    return <Finished onDone={onDone} text={t('play.materi.divDone')} onAgain={() => setR(0)} />;
  const want = round.jumlah / round.piring;
  const deal = () => {
    if (dealt >= round.jumlah) return;
    const n = dealt + 1;
    setDealt(n);
    if (n === round.jumlah) speak(t('play.materi.divEach'));
  };
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <p className="lab-eq">
        {round.jumlah} : {round.piring} = {ans.right ? want : '?'}
      </p>
      <button
        type="button"
        className="lab-pile"
        onClick={deal}
        disabled={dealt >= round.jumlah}
        aria-label={t('play.materi.divDeal')}
      >
        {Array.from({ length: round.jumlah - dealt }, (_, k) => (
          <VisualView key={k} visual={{ kind: 'object', object: round.benda }} size={32} />
        ))}
        {dealt < round.jumlah && <small>{t('play.materi.divDeal')}</small>}
      </button>
      <div className="lab-plates">
        {Array.from({ length: round.piring }, (_, p) => {
          const got = Math.floor(dealt / round.piring) + (p < dealt % round.piring ? 1 : 0);
          return (
            <div key={p} className="lab-plate">
              {Array.from({ length: got }, (_, k) => (
                <VisualView key={k} visual={{ kind: 'object', object: round.benda }} size={30} />
              ))}
            </div>
          );
        })}
      </div>
      {dealt >= round.jumlah &&
        ans.tiles(
          round.pilihan,
          want,
          t('play.materi.divRight', {
            n: word(round.jumlah),
            p: word(round.piring),
            k: word(want),
          }),
          t('play.materi.divHint'),
        )}
    </div>
  );
}

/** Penggaris mulai dari 0: ketuk angka di ujung benda. */
function Ukur({
  ronde,
  satuan,
  onDone,
}: {
  ronde: { benda: ObjectId; panjang: number }[];
  satuan: 'cm' | 'kotak';
  onDone: () => void;
}) {
  const [r, setR] = useState(0);
  const [right, setRight] = useState(false);
  const s = useShake();
  const later = useLater();
  const round = ronde[r];
  const unit = t(satuan === 'cm' ? 'play.materi.unitCm' : 'play.materi.unitBox');
  useEffect(() => {
    if (round) speak(t('play.materi.measureAsk', { obj: objName(round.benda) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!round)
    return <Finished onDone={onDone} text={t('play.materi.measureDone')} onAgain={() => setR(0)} />;
  const max = 12;
  const pick = (n: number) => {
    if (right) return;
    if (n === round.panjang) {
      setRight(true);
      speak(t('play.materi.measureRight', { obj: objName(round.benda), n: word(n), unit }));
      later(() => {
        setRight(false);
        setR(r + 1);
      }, 2400);
    } else {
      s.shake(String(n));
      speak(n === 0 ? t('play.materi.measureZero') : t('play.materi.measureHint'));
    }
  };
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <div className="lab-ruler-wrap">
        <div className="lab-ruler-obj" style={{ width: `${(round.panjang / max) * 100}%` }}>
          <VisualView visual={{ kind: 'object', object: round.benda }} size={44} />
        </div>
        <div className="lab-ruler">
          {Array.from({ length: max + 1 }, (_, n) => (
            <button
              key={s.key(String(n))}
              type="button"
              className={`lab-tick${s.is(String(n)) ? ' is-shake' : ''}${right && n === round.panjang ? ' is-right' : ''}`}
              style={{ left: `${(n / max) * 100}%` }}
              aria-label={`${n} ${unit}`}
              onClick={() => pick(n)}
            >
              <i />
              <span>{n}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="kid-note">{t('play.materi.measureTip')}</p>
    </div>
  );
}

/** Luas = banyak petak: ketuk setiap petak sampai semua berwarna, lalu pilih luasnya. */
function Luas({
  ronde,
  onDone,
}: {
  ronde: { baris: number; kolom: number; pilihan: number[] }[];
  onDone: () => void;
}) {
  const [r, setR] = useState(0);
  const [on, setOn] = useState<number[]>([]);
  const round = ronde[r];
  const ans = useAnswer(() => {
    setOn([]);
    setR(r + 1);
  });
  useEffect(() => {
    if (round) speak(t('play.materi.areaAsk'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!round)
    return <Finished onDone={onDone} text={t('play.materi.areaDone')} onAgain={() => setR(0)} />;
  const total = round.baris * round.kolom;
  const tap = (k: number) => {
    if (on.includes(k)) return;
    const next = [...on, k];
    setOn(next);
    speak(
      next.length === total ? `${word(total)}. ${t('play.materi.howMany')}` : word(next.length),
    );
  };
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <div className="lab-grid" style={{ gridTemplateColumns: `repeat(${round.kolom}, 52px)` }}>
        {Array.from({ length: total }, (_, k) => (
          <button
            key={k}
            type="button"
            className={`lab-cell${on.includes(k) ? ' is-on' : ''}`}
            aria-label={t('play.materi.areaCell', { n: k + 1 })}
            onClick={() => tap(k)}
          >
            {on.includes(k) ? on.indexOf(k) + 1 : ''}
          </button>
        ))}
      </div>
      {on.length === total ? (
        ans.tiles(
          round.pilihan,
          total,
          t('play.materi.areaRight', {
            n: word(total),
            b: word(round.baris),
            k: word(round.kolom),
          }),
          t('play.materi.areaHint'),
        )
      ) : (
        <p className="kid-note">{t('play.materi.areaCount', { n: on.length })}</p>
      )}
    </div>
  );
}

type DiagramRonde = {
  data: { nama: string; benda: ObjectId; n: number }[];
  cari: 'banyak' | 'sedikit';
};

/** Diagram batang bergambar: ketuk batang yang paling banyak / paling sedikit. */
function Diagram({ ronde, onDone }: { ronde: DiagramRonde[]; onDone: () => void }) {
  const [r, setR] = useState(0);
  const [right, setRight] = useState(false);
  const s = useShake();
  const later = useLater();
  const round = ronde[r];
  const ask = round
    ? t(round.cari === 'banyak' ? 'play.materi.chartMost' : 'play.materi.chartLeast')
    : '';
  useEffect(() => {
    if (round) speak(ask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!round)
    return <Finished onDone={onDone} text={t('play.materi.chartDone')} onAgain={() => setR(0)} />;
  const ns = round.data.map((d) => d.n);
  const want = round.cari === 'banyak' ? Math.max(...ns) : Math.min(...ns);
  const tap = (k: number) => {
    if (right) return;
    const d = round.data[k]!;
    if (d.n === want) {
      setRight(true);
      speak(t('play.materi.chartRight', { name: d.nama, n: word(d.n) }));
      later(() => {
        setRight(false);
        setR(r + 1);
      }, 2400);
    } else {
      s.shake(String(k));
      speak(t('play.materi.chartHint', { name: d.nama, n: word(d.n) }));
    }
  };
  return (
    <div className="m-play">
      <RoundDots n={ronde.length} at={r} />
      <div className="m-ask">
        <SpeakButton text={ask} />
        <p>{ask}</p>
      </div>
      <div className="lab-chart">
        {round.data.map((d, k) => (
          <button
            key={s.key(String(k))}
            type="button"
            className={`lab-bar${s.is(String(k)) ? ' is-shake' : ''}${right && d.n === want ? ' is-right' : ''}`}
            aria-label={`${d.nama}: ${d.n}`}
            onClick={() => tap(k)}
          >
            <span className="lab-bar-stack">
              {Array.from({ length: d.n }, (_, j) => (
                <VisualView key={j} visual={{ kind: 'object', object: d.benda }} size={26} />
              ))}
            </span>
            <b>{d.nama}</b>
          </button>
        ))}
      </div>
    </div>
  );
}
