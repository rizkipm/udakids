import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  OBJECTS,
  type LabExperiment,
  type LabExplore,
  type LabFigure,
  type LabHabit,
  type LabTaste,
  type ObjectId,
} from '@little-coder/engine';
import { speak, stopSpeaking } from '../../audio/speech';
import { VisualView } from '../../components/visuals';
import { t, type MessageKey } from '../../i18n';
import { SpeakButton } from '../ItemPlayer';
import {
  ORGAN_H,
  ORGAN_SPOTS,
  ORGAN_W,
  Organ,
  SnifferFace,
  TasterFace,
  type OrganFx,
} from './organs';
import { GenericExperiment, isGeneric } from './generic';
import { MathExperiment, isMath } from './math';
import { LabPicView } from './pic';
import { DoneNote, StarIcon, useLater, useShake } from './ui';

export { DoneNote, StarIcon, useShake };
import { playLabSound } from './sound';

const objName = (o: ObjectId) => OBJECTS[o].say ?? o.replace(/-/g, ' ');

function Pic({ o, size = 72 }: { o: ObjectId; size?: number }) {
  return <VisualView visual={{ kind: 'object', object: o }} size={size} />;
}

/* ------------------------------------------------------------ Jelajah: figur berbagian & kartu */

const ORGAN_ACTION: Record<LabFigure, MessageKey> = {
  mata: 'play.lab.actBlink',
  telinga: 'play.lab.actSound',
  hidung: 'play.lab.actBreath',
  lidah: 'play.lab.actTaste',
  kulit: 'play.lab.actTouch',
  pencernaan: 'play.lab.actDigest',
  tumbuhan: 'play.lab.actWater',
  tubuh: 'play.lab.actMove',
};

type Spot = { bagian: string; judul: string; teks: string; suara: string };

export function Explorer({ x, onDone }: { x: LabExplore; onDone: () => void }) {
  return x.jenis === 'figur' ? (
    <FigureExplorer figur={x.figur} titik={x.titik} onDone={onDone} />
  ) : (
    <CardExplorer kartu={x.kartu} onDone={onDone} />
  );
}

export function FigureExplorer({
  figur,
  titik: spots,
  onDone,
}: {
  figur: LabFigure;
  titik: Spot[];
  onDone: () => void;
}) {
  const [on, setOn] = useState<string>();
  const [seen, setSeen] = useState<string[]>([]);
  const [fx, setFx] = useState<OrganFx>({});
  const active = spots.find((s) => s.bagian === on);
  const tap = (bagian: string) => {
    setOn(bagian);
    const next = seen.includes(bagian) ? seen : [...seen, bagian];
    setSeen(next);
    if (bagian === 'kelopak') setFx((f) => ({ ...f, blink: (f.blink ?? 0) + 1 }));
    if (bagian === 'air-mata') setFx((f) => ({ ...f, tear: (f.tear ?? 0) + 1 }));
    if (bagian === 'manik') setFx((f) => ({ ...f, pupil: f.pupil === 34 ? 16 : 34 }));
    const s = spots.find((x) => x.bagian === bagian)!;
    speak(s.suara);
    if (next.length === spots.length && !seen.includes(bagian)) onDone();
  };
  const act = () => {
    setFx((f) => ({
      ...f,
      pulse: (f.pulse ?? 0) + 1,
      blink: figur === 'mata' ? (f.blink ?? 0) + 1 : f.blink,
    }));
    if (figur === 'telinga') playLabSound('drum', 0.8);
    speak(t(`${ORGAN_ACTION[figur]}Say` as MessageKey));
  };
  return (
    <div className="lab-explore">
      <div className="lab-organ-wrap">
        <Organ sense={figur} fx={{ ...fx, on }} label={spots.map((s) => s.judul).join(', ')} />
        {spots.map((s, k) => {
          const p = ORGAN_SPOTS[figur][s.bagian]!;
          return (
            <button
              key={s.bagian}
              type="button"
              className={`lab-spot${on === s.bagian ? ' is-on' : ''}${seen.includes(s.bagian) ? ' is-seen' : ''}`}
              style={{ left: `${(p.x / ORGAN_W) * 100}%`, top: `${(p.y / ORGAN_H) * 100}%` }}
              aria-label={s.judul}
              onClick={() => tap(s.bagian)}
            >
              <span>{k + 1}</span>
            </button>
          );
        })}
      </div>
      <div className="lab-explore-side">
        {active ? (
          <div className="lab-info" key={active.bagian}>
            <h3>{active.judul}</h3>
            <p>{active.teks}</p>
            <SpeakButton text={active.suara} />
          </div>
        ) : (
          <p className="lab-hint">{t('play.lab.tapParts')}</p>
        )}
        <button type="button" className="kid-btn lab-act" onClick={act}>
          {t(ORGAN_ACTION[figur])}
        </button>
        <p className="lab-count">{t('play.lab.partsSeen', { n: seen.length, of: spots.length })}</p>
      </div>
    </div>
  );
}

/** Kartu bergambar (foto asli/SVG): ketuk → dibacakan & dibesarkan. */
export function CardExplorer({
  kartu,
  onDone,
}: {
  kartu: Extract<LabExplore, { jenis: 'kartu' }>['kartu'];
  onDone: () => void;
}) {
  const [on, setOn] = useState<number>();
  const [seen, setSeen] = useState<number[]>([]);
  const tap = (k: number) => {
    setOn(k);
    speak(kartu[k]!.suara);
    if (!seen.includes(k)) {
      const next = [...seen, k];
      setSeen(next);
      if (next.length === kartu.length) onDone();
    }
  };
  const active = on !== undefined ? kartu[on] : undefined;
  return (
    <div className="lab-cards">
      <div className="lab-card-grid">
        {kartu.map((c, k) => (
          <button
            key={c.judul}
            type="button"
            className={`lab-card${on === k ? ' is-on' : ''}${seen.includes(k) ? ' is-seen' : ''}`}
            onClick={() => tap(k)}
          >
            <LabPicView pic={c.gambar} size={110} alt={c.judul} />
            <strong>{c.judul}</strong>
          </button>
        ))}
      </div>
      {active ? (
        <div className="lab-info" key={on}>
          <h3>{active.judul}</h3>
          <p>{active.teks}</p>
          <SpeakButton text={active.suara} />
        </div>
      ) : (
        <p className="lab-hint">{t('play.lab.tapCards')}</p>
      )}
      <p className="lab-count">{t('play.lab.partsSeen', { n: seen.length, of: kartu.length })}</p>
    </div>
  );
}

export function FactCards({ facts }: { facts: string[] }) {
  const [on, setOn] = useState<number>();
  return (
    <section className="lab-facts" aria-label={t('play.lab.didYouKnow')}>
      <h3>{t('play.lab.didYouKnow')}</h3>
      <div className="lab-facts-row">
        {facts.map((f, k) => (
          <button
            key={k}
            type="button"
            className={`lab-fact${on === k ? ' is-on' : ''}`}
            onClick={() => {
              setOn(k);
              speak(f);
            }}
          >
            <BulbIcon />
            <span>{f}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function BulbIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden>
      <path
        d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"
        fill="#f7c948"
        stroke="#2b2540"
        strokeWidth="1.8"
      />
      <rect x="8.5" y="18" width="7" height="3" rx="1" fill="#2b2540" />
    </svg>
  );
}

/* ------------------------------------------------------------ Eksperimen */

export function Experiment({ e, onDone }: { e: LabExperiment; onDone: () => void }) {
  if (isGeneric(e)) return <GenericExperiment e={e} onDone={onDone} />;
  if (isMath(e)) return <MathExperiment e={e} onDone={onDone} />;
  switch (e.jenis) {
    case 'cahaya':
      return <CahayaLab e={e} onDone={onDone} />;
    case 'lup':
      return <LupLab e={e} onDone={onDone} />;
    case 'bunyi':
      return <BunyiLab e={e} onDone={onDone} />;
    case 'tebak-bunyi':
      return <TebakBunyi e={e} onDone={onDone} />;
    case 'bau':
      return <BauLab e={e} onDone={onDone} />;
    case 'rasa':
      return <RasaLab e={e} onDone={onDone} />;
    case 'raba':
      return <RabaLab e={e} onDone={onDone} />;
  }
}

type Exp<K extends LabExperiment['jenis']> = {
  e: Extract<LabExperiment, { jenis: K }>;
  onDone: () => void;
};

type Light = 'terang' | 'redup' | 'gelap';
const PUPIL: Record<Light, number> = { terang: 14, redup: 26, gelap: 40 };
const DARK: Record<Light, number> = { terang: 0, redup: 0.55, gelap: 0.93 };

function CahayaLab({ e, onDone }: Exp<'cahaya'>) {
  const [light, setLight] = useState<Light>('terang');
  const [tried, setTried] = useState<Light[]>(['terang']);
  const set = (l: Light) => {
    setLight(l);
    speak(e[l]);
    const next = tried.includes(l) ? tried : [...tried, l];
    setTried(next);
    if (next.length === 3 && tried.length < 3) onDone();
  };
  return (
    <div className="lab-light">
      <div className="lab-room">
        <span className="lab-window" aria-hidden />
        <span className={`lab-lamp is-${light}`} aria-hidden />
        <div className="lab-room-things">
          {e.benda.map((o) => (
            <button
              key={o}
              type="button"
              className="lab-thing"
              aria-label={objName(o)}
              onClick={() =>
                speak(
                  light === 'gelap'
                    ? t('play.lab.tooDark')
                    : t('play.lab.iSee', { obj: objName(o) }),
                )
              }
            >
              <Pic o={o} size={78} />
            </button>
          ))}
        </div>
        <span className="lab-dark" style={{ opacity: DARK[light] }} aria-hidden />
      </div>
      <div className="lab-light-side">
        <div className="lab-mini-organ">
          <Organ sense="mata" fx={{ pupil: PUPIL[light] }} label={t('play.lab.pupilLabel')} />
        </div>
        <div className="lab-switches" role="group" aria-label={t('play.lab.lightLabel')}>
          {(['terang', 'redup', 'gelap'] as const).map((l) => (
            <button
              key={l}
              type="button"
              className={`lab-switch is-${l}${light === l ? ' is-on' : ''}`}
              aria-pressed={light === l}
              onClick={() => set(l)}
            >
              <LightIcon l={l} />
              {t(`play.lab.light.${l}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LightIcon({ l }: { l: Light }) {
  return (
    <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden>
      {l === 'gelap' ? (
        <path
          d="M20 4a12 12 0 1 0 8 20A10 10 0 0 1 20 4z"
          fill="var(--langit)"
          stroke="#2b2540"
          strokeWidth="2"
        />
      ) : (
        <>
          <circle
            cx="16"
            cy="16"
            r={l === 'terang' ? 8 : 6}
            fill={l === 'terang' ? '#f7c948' : '#f3d98b'}
            stroke="#2b2540"
            strokeWidth="2"
          />
          {l === 'terang' &&
            [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <line
                key={a}
                x1="16"
                y1="3"
                x2="16"
                y2="6"
                stroke="#2b2540"
                strokeWidth="2.4"
                strokeLinecap="round"
                transform={`rotate(${a} 16 16)`}
              />
            ))}
        </>
      )}
    </svg>
  );
}

/** Posisi benda kecil di taman (persen), tetap supaya layar sama setiap dibuka. */
const HIDE_AT = [
  { x: 18, y: 72 },
  { x: 72, y: 40 },
  { x: 46, y: 82 },
  { x: 86, y: 76 },
  { x: 30, y: 36 },
];
const ZOOM = 3.2;
const LENS = 150;

function LupLab({ e, onDone }: Exp<'lup'>) {
  const ref = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState({ x: 50, y: 50, w: 600, h: 300 });
  const [found, setFound] = useState<number[]>([]);
  // Gerakan pointer cepat bisa datang sebelum state diperbarui: ref mencegah hewan yang sama dihitung dua kali.
  const foundRef = useRef<number[]>([]);
  const move = (ev: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width, ev.clientX - r.left));
    const y = Math.max(0, Math.min(r.height, ev.clientY - r.top));
    setLens({ x, y, w: r.width, h: r.height });
    e.benda.forEach((b, k) => {
      const at = HIDE_AT[k]!;
      const dx = (at.x / 100) * r.width - x;
      const dy = (at.y / 100) * r.height - y;
      if (Math.hypot(dx, dy) < 34 && !foundRef.current.includes(k)) {
        const next = [...foundRef.current, k];
        foundRef.current = next;
        setFound(next);
        speak(next.length === e.benda.length ? `${b.suara} ${e.selesai}` : b.suara);
        if (next.length === e.benda.length) onDone();
      }
    });
  };
  const garden = (zoomed: boolean) => (
    <div className="lab-garden-inner">
      <span className="lab-flower is-a" aria-hidden />
      <span className="lab-flower is-b" aria-hidden />
      <span className="lab-flower is-c" aria-hidden />
      {e.benda.map((b, k) => {
        const at = HIDE_AT[k]!;
        return (
          <span
            key={b.benda}
            className={`lab-tiny${found.includes(k) ? ' is-found' : ''}`}
            style={{ left: `${at.x}%`, top: `${at.y}%` }}
            aria-hidden={zoomed}
          >
            <Pic o={b.benda} size={18} />
          </span>
        );
      })}
    </div>
  );
  return (
    <div className="lab-lup">
      <div
        ref={ref}
        className="lab-garden"
        onPointerMove={move}
        onPointerDown={(ev) => {
          (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId);
          move(ev);
        }}
        role="application"
        aria-label={t('play.lab.lupLabel')}
      >
        {garden(false)}
        <div
          className="lab-lens"
          style={{ width: LENS, height: LENS, left: lens.x - LENS / 2, top: lens.y - LENS / 2 }}
          aria-hidden
        >
          <div
            className="lab-lens-view"
            style={{
              width: lens.w,
              height: lens.h,
              transform: `translate(${LENS / 2 - lens.x * ZOOM}px, ${LENS / 2 - lens.y * ZOOM}px) scale(${ZOOM})`,
            }}
          >
            {garden(true)}
          </div>
        </div>
      </div>
      <div className="lab-found" aria-live="polite">
        {e.benda.map((b, k) => (
          <span key={b.benda} className={`lab-found-slot${found.includes(k) ? ' is-on' : ''}`}>
            {found.includes(k) ? <Pic o={b.benda} size={44} /> : '?'}
          </span>
        ))}
        <small>{t('play.lab.found', { n: found.length, of: e.benda.length })}</small>
      </div>
    </div>
  );
}

function BunyiLab({ e, onDone }: Exp<'bunyi'>) {
  const [loud, setLoud] = useState(true);
  const [covered, setCovered] = useState(false);
  const [wave, setWave] = useState<{ k: number; n: number }>();
  const [used, setUsed] = useState<string[]>([]);
  const mark = (key: string) =>
    setUsed((u) => {
      if (u.includes(key)) return u;
      const next = [...u, key];
      if (next.length === e.alat.length + 3) onDone();
      return next;
    });
  const play = (k: number) => {
    const a = e.alat[k]!;
    stopSpeaking();
    const ms = playLabSound(a.bunyi, covered ? 0.18 : loud ? 1 : 0.35);
    setWave({ k, n: (wave?.n ?? 0) + 1 });
    mark(`a${k}`);
    window.setTimeout(() => speak(a.suara), ms);
  };
  return (
    <div className="lab-sound">
      <div className="lab-stage" role="group" aria-label={t('play.lab.stageLabel')}>
        {e.alat.map((a, k) => (
          <button
            key={a.benda}
            type="button"
            className={`lab-pad${wave?.k === k ? ' is-playing' : ''}`}
            aria-label={objName(a.benda)}
            onClick={() => play(k)}
          >
            <Pic o={a.benda} size={70} />
            {used.includes(`a${k}`) && <span className="lab-pad-check" aria-hidden />}
          </button>
        ))}
      </div>
      <div className="lab-sound-row">
        <div className={`lab-ear-box${covered ? ' is-covered' : ''}`}>
          {wave && (
            <span
              key={wave.n}
              className={`lab-rings${loud && !covered ? ' is-loud' : ''}${covered ? ' is-blocked' : ''}`}
              aria-hidden
            >
              <i />
              <i />
              <i />
            </span>
          )}
          <svg viewBox="0 0 100 100" className="lab-ear-icon" aria-hidden>
            <path
              d="M34 30 C34 6 76 6 76 34 C76 52 62 56 60 70 C58 86 44 92 36 82"
              fill="#f6c79a"
              stroke="#2b2540"
              strokeWidth="4"
            />
            <path
              d="M46 32 C46 20 64 20 64 34 C64 44 54 46 54 56"
              fill="none"
              stroke="#e2a273"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
          {covered && (
            <svg viewBox="0 0 100 100" className="lab-cover-hand" aria-hidden>
              <path
                d="M20 90 C14 60 14 40 22 30 L26 14 C28 6 38 8 36 18 L36 30 L42 8 C44 0 54 2 52 12 L50 30 L58 10 C60 2 70 4 68 14 L62 34 L72 22 C78 16 86 22 80 30 L66 56 C62 74 60 84 60 90 Z"
                fill="#f6c79a"
                stroke="#2b2540"
                strokeWidth="4"
              />
            </svg>
          )}
        </div>
        <div className="lab-sound-ctrl">
          <button
            type="button"
            className={`lab-toggle${loud ? ' is-on' : ''}`}
            aria-pressed={loud}
            onClick={() => {
              setLoud(true);
              mark('keras');
              speak(e.keras);
            }}
          >
            <VolIcon loud />
            {t('play.lab.loud')}
          </button>
          <button
            type="button"
            className={`lab-toggle${!loud ? ' is-on' : ''}`}
            aria-pressed={!loud}
            onClick={() => {
              setLoud(false);
              mark('pelan');
              speak(e.pelan);
            }}
          >
            <VolIcon loud={false} />
            {t('play.lab.soft')}
          </button>
          <button
            type="button"
            className={`lab-toggle${covered ? ' is-on' : ''}`}
            aria-pressed={covered}
            onClick={() => {
              const c = !covered;
              setCovered(c);
              if (c) {
                mark('tutup');
                speak(e.tutup);
              }
            }}
          >
            {t(covered ? 'play.lab.uncover' : 'play.lab.cover')}
          </button>
        </div>
      </div>
      <p className="lab-count">
        {t('play.lab.triedOf', { n: used.length, of: e.alat.length + 3 })}
      </p>
    </div>
  );
}

function VolIcon({ loud }: { loud: boolean }) {
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden>
      <path d="M4 12h6l8-6v20l-8-6H4z" fill="#2b2540" />
      <path
        d="M22 11c2 2.5 2 7.5 0 10"
        stroke="#2b2540"
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
      />
      {loud && (
        <path
          d="M26 7c4 4.5 4 13.5 0 18"
          stroke="#2b2540"
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function TebakBunyi({ e, onDone }: Exp<'tebak-bunyi'>) {
  const [r, setR] = useState(0);
  const [right, setRight] = useState(false);
  const s = useShake();
  const later = useLater();
  const round = e.ronde[r];
  const play = () => round && playLabSound(round.bunyi, 0.9);
  useEffect(() => {
    if (!round) return;
    const id = window.setTimeout(play, r === 0 ? 400 : 200);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!round)
    return (
      <div className="lab-finish">
        <DoneNote text={t('play.lab.guessDone')} />
        <button type="button" className="kid-btn secondary" onClick={() => setR(0)}>
          {t('play.lab.again')}
        </button>
      </div>
    );
  const pick = (o: ObjectId) => {
    if (right) return;
    if (o === round.jawaban) {
      setRight(true);
      speak(t('play.lab.guessRight', { obj: objName(o) }));
      later(() => {
        setRight(false);
        if (r + 1 === e.ronde.length) onDone();
        setR(r + 1);
      }, 1800);
    } else {
      s.shake(o);
      speak(t('play.lab.guessAgain', { obj: objName(o) }), { onEnd: play });
    }
  };
  return (
    <div className="lab-guess">
      <div className="lab-rounds">
        {e.ronde.map((_, k) => (
          <span key={k} className={k < r ? 'is-done' : k === r ? 'is-now' : undefined} />
        ))}
      </div>
      <button type="button" className="kid-btn big-play lab-play-sound" onClick={play}>
        <VolIcon loud /> {t('play.lab.playSound')}
      </button>
      <div className="lab-choices">
        {round.pilihan.map((o) => (
          <button
            key={s.key(o)}
            type="button"
            className={`lab-choice${s.on(o) ? ' is-shake' : ''}${right && o === round.jawaban ? ' is-right' : ''}`}
            aria-label={objName(o)}
            onClick={() => pick(o)}
          >
            <Pic o={o} size={90} />
          </button>
        ))}
      </div>
    </div>
  );
}

function BauLab({ e, onDone }: Exp<'bau'>) {
  const [open, setOpen] = useState<number>();
  const [sorted, setSorted] = useState<Record<number, boolean>>({});
  const [pilek, setPilek] = useState(false);
  const [puff, setPuff] = useState(0);
  const s = useShake();
  const jar = open !== undefined ? e.botol[open] : undefined;
  const sniff = (k: number) => {
    if (k in sorted) return;
    setOpen(k);
    setPuff((p) => p + 1);
    speak(pilek ? t('play.lab.cantSmell') : e.botol[k]!.suara);
  };
  const put = (harum: boolean) => {
    if (open === undefined || !jar) {
      speak(t('play.lab.openFirst'));
      return;
    }
    if (pilek) {
      speak(t('play.lab.cantSmell'));
      return;
    }
    if (jar.harum === harum) {
      const next = { ...sorted, [open]: harum };
      setSorted(next);
      setOpen(undefined);
      const done = Object.keys(next).length === e.botol.length;
      speak(done ? e.selesai : t(harum ? 'play.lab.putHarum' : 'play.lab.putTidak'));
      if (done) onDone();
    } else {
      s.shake(harum ? 'h' : 't');
      speak(t('play.lab.sniffAgain'));
      setPuff((p) => p + 1);
    }
  };
  return (
    <div className="lab-smell">
      <div className="lab-shelf" role="group" aria-label={t('play.lab.jarsLabel')}>
        {e.botol.map((b, k) =>
          k in sorted ? (
            <span key={b.benda} className="lab-jar is-empty" aria-hidden />
          ) : (
            <button
              key={b.benda}
              type="button"
              className={`lab-jar${open === k ? ' is-open' : ''}`}
              aria-label={objName(b.benda)}
              onClick={() => sniff(k)}
            >
              <span className="lab-jar-lid" aria-hidden />
              <Pic o={b.benda} size={54} />
            </button>
          ),
        )}
      </div>
      <div className="lab-smell-row">
        <div className="lab-sniff">
          {jar && (
            <span
              key={puff}
              className={`lab-scent${jar.harum ? ' is-nice' : ' is-strong'}${pilek ? ' is-blocked' : ''}`}
              aria-hidden
            >
              <i />
              <i />
              <i />
            </span>
          )}
          <SnifferFace
            mood={jar && !pilek ? (jar.harum ? 'harum' : 'tidak') : undefined}
            pilek={pilek}
          />
        </div>
        <div className="lab-bins">
          <button
            key={s.key('h')}
            type="button"
            className={`lab-bin is-nice${s.on('h') ? ' is-shake' : ''}`}
            onClick={() => put(true)}
          >
            <BinIcon nice />
            {t('play.lab.binHarum')}
            <span className="lab-bin-items">
              {Object.entries(sorted)
                .filter(([, h]) => h)
                .map(([k]) => (
                  <Pic key={k} o={e.botol[Number(k)]!.benda} size={30} />
                ))}
            </span>
          </button>
          <button
            key={s.key('t')}
            type="button"
            className={`lab-bin is-strong${s.on('t') ? ' is-shake' : ''}`}
            onClick={() => put(false)}
          >
            <BinIcon nice={false} />
            {t('play.lab.binTidak')}
            <span className="lab-bin-items">
              {Object.entries(sorted)
                .filter(([, h]) => !h)
                .map(([k]) => (
                  <Pic key={k} o={e.botol[Number(k)]!.benda} size={30} />
                ))}
            </span>
          </button>
          <button
            type="button"
            className={`lab-toggle${pilek ? ' is-on' : ''}`}
            aria-pressed={pilek}
            onClick={() => {
              const p = !pilek;
              setPilek(p);
              if (p) speak(e.pilek);
              else speak(t('play.lab.pilekOff'));
            }}
          >
            {t(pilek ? 'play.lab.pilekOn' : 'play.lab.pilek')}
          </button>
        </div>
      </div>
    </div>
  );
}

function BinIcon({ nice }: { nice: boolean }) {
  return (
    <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden>
      {nice ? (
        <path
          d="M16 4c3 4 8 5 8 11a8 8 0 0 1-16 0c0-6 5-7 8-11z"
          fill="#ff9ec7"
          stroke="#2b2540"
          strokeWidth="2"
        />
      ) : (
        <path
          d="M6 10c4-4 6 4 10 0s6 4 10 0M6 18c4-4 6 4 10 0s6 4 10 0M6 26c4-4 6 4 10 0s6 4 10 0"
          fill="none"
          stroke="#7a8b3a"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

const TASTE_COLOR: Record<LabTaste, string> = {
  manis: '#ffd1e3',
  asin: '#dbeafe',
  asam: '#fff3b0',
  pahit: '#e3d5c8',
};

function RasaLab({ e, onDone }: Exp<'rasa'>) {
  const [cur, setCur] = useState<number>();
  const [taste, setTaste] = useState<LabTaste>();
  const [bite, setBite] = useState(0);
  const [placed, setPlaced] = useState<Record<number, LabTaste>>({});
  const s = useShake();
  const tastes = useMemo(
    () =>
      (['manis', 'asin', 'asam', 'pahit'] as const).filter((x) =>
        e.makanan.some((m) => m.rasa === x),
      ),
    [e.makanan],
  );
  const eat = (k: number) => {
    if (k in placed) return;
    setCur(k);
    setTaste(undefined);
    setBite((b) => b + 1);
    window.setTimeout(() => setTaste(e.makanan[k]!.rasa), 650);
    speak(e.makanan[k]!.suara);
  };
  const put = (x: LabTaste) => {
    if (cur === undefined) {
      speak(t('play.lab.tasteFirst'));
      return;
    }
    const m = e.makanan[cur]!;
    if (m.rasa === x) {
      const next = { ...placed, [cur]: x };
      setPlaced(next);
      setCur(undefined);
      setTaste(undefined);
      const done = Object.keys(next).length === e.makanan.length;
      speak(done ? e.selesai : t('play.lab.tasteRight', { obj: objName(m.benda), taste: x }));
      if (done) onDone();
    } else {
      s.shake(x);
      setBite((b) => b + 1);
      speak(t('play.lab.tasteAgain'));
    }
  };
  return (
    <div className="lab-taste">
      <div className="lab-tray" role="group" aria-label={t('play.lab.trayLabel')}>
        {e.makanan.map((m, k) =>
          k in placed ? (
            <span key={m.benda} className="lab-food is-gone" aria-hidden />
          ) : (
            <button
              key={m.benda}
              type="button"
              className={`lab-food${cur === k ? ' is-on' : ''}`}
              aria-label={objName(m.benda)}
              onClick={() => eat(k)}
            >
              <Pic o={m.benda} size={58} />
            </button>
          ),
        )}
      </div>
      <div className="lab-taste-row">
        <div className="lab-taster-wrap">
          {cur !== undefined && (
            <span key={bite} className="lab-bite" aria-hidden>
              <Pic o={e.makanan[cur]!.benda} size={48} />
            </span>
          )}
          <TasterFace taste={taste} eating={cur !== undefined ? 1 : 0} />
        </div>
        <div className="lab-jars">
          {tastes.map((x) => (
            <button
              key={s.key(x)}
              type="button"
              className={`lab-taste-jar${s.on(x) ? ' is-shake' : ''}`}
              style={{ background: TASTE_COLOR[x] }}
              onClick={() => put(x)}
            >
              <strong>{t(`play.lab.taste.${x}`)}</strong>
              <span className="lab-bin-items">
                {Object.entries(placed)
                  .filter(([, v]) => v === x)
                  .map(([k]) => (
                    <Pic key={k} o={e.makanan[Number(k)]!.benda} size={28} />
                  ))}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

type RabaStep = 'pilih' | 'raba' | 'permukaan' | 'suhu' | 'lihat';

function RabaLab({ e, onDone }: Exp<'raba'>) {
  const [k, setK] = useState<number>();
  const [step, setStep] = useState<RabaStep>('pilih');
  const [done, setDone] = useState<number[]>([]);
  const s = useShake();
  const later = useLater();
  const item = k !== undefined ? e.benda[k] : undefined;
  const choose = (i: number) => {
    if (done.includes(i)) return;
    setK(i);
    setStep('raba');
    speak(t('play.lab.reachIn'));
  };
  const reach = () => {
    setStep('permukaan');
    speak(t('play.lab.askSurface'));
  };
  const reveal = () => {
    setStep('lihat');
    const next = [...done, k!];
    setDone(next);
    const all = next.length === e.benda.length;
    speak(all ? `${item!.suara} ${e.selesai}` : item!.suara);
    if (all) onDone();
    later(() => {
      setK(undefined);
      setStep('pilih');
    }, 4200);
  };
  const answer = (kind: 'permukaan' | 'suhu', v: string) => {
    if (!item) return;
    if (item[kind] === v) {
      if (kind === 'permukaan' && item.suhu !== 'biasa') {
        setStep('suhu');
        speak(t('play.lab.askTemp', { v }));
      } else reveal();
    } else {
      s.shake(v);
      speak(t('play.lab.feelAgain'));
    }
  };
  return (
    <div className="lab-touch">
      <div className="lab-boxes" role="group" aria-label={t('play.lab.boxesLabel')}>
        {e.benda.map((b, i) => (
          <button
            key={b.benda}
            type="button"
            className={`lab-box${k === i ? ' is-on' : ''}${done.includes(i) ? ' is-done' : ''}`}
            aria-label={done.includes(i) ? objName(b.benda) : t('play.lab.boxN', { n: i + 1 })}
            onClick={() => choose(i)}
          >
            {done.includes(i) ? <Pic o={b.benda} size={50} /> : <span>?</span>}
          </button>
        ))}
      </div>
      {item && (
        <div className="lab-touch-stage">
          <div className={`lab-bigbox is-${step}`}>
            {step === 'lihat' ? (
              <span className="lab-reveal">
                <Pic o={item.benda} size={110} />
              </span>
            ) : (
              <>
                <span className="lab-hole" aria-hidden />
                <svg viewBox="0 0 100 100" className="lab-reach-hand" aria-hidden>
                  <path
                    d="M20 90 C14 60 14 40 22 30 L26 14 C28 6 38 8 36 18 L36 30 L42 8 C44 0 54 2 52 12 L50 30 L58 10 C60 2 70 4 68 14 L62 34 L72 22 C78 16 86 22 80 30 L66 56 C62 74 60 84 60 90 Z"
                    fill="#f6c79a"
                    stroke="#2b2540"
                    strokeWidth="4"
                  />
                </svg>
                {step !== 'raba' && (
                  <span
                    className={`lab-feel-fx is-${item.permukaan} is-${item.suhu}`}
                    aria-hidden
                  />
                )}
              </>
            )}
          </div>
          <div className="lab-touch-ask">
            {step === 'raba' && (
              <button type="button" className="kid-btn big-play" onClick={reach}>
                {t('play.lab.reach')}
              </button>
            )}
            {step === 'permukaan' &&
              (['halus', 'kasar'] as const).map((v) => (
                <button
                  key={s.key(v)}
                  type="button"
                  className={`lab-feel-btn is-${v}${s.on(v) ? ' is-shake' : ''}`}
                  onClick={() => answer('permukaan', v)}
                >
                  <TextureIcon v={v} />
                  {t(`play.lab.feel.${v}`)}
                </button>
              ))}
            {step === 'suhu' &&
              (['panas', 'dingin'] as const).map((v) => (
                <button
                  key={s.key(v)}
                  type="button"
                  className={`lab-feel-btn is-${v}${s.on(v) ? ' is-shake' : ''}`}
                  onClick={() => answer('suhu', v)}
                >
                  <TextureIcon v={v} />
                  {t(`play.lab.feel.${v}`)}
                </button>
              ))}
          </div>
        </div>
      )}
      {!item && <p className="lab-hint">{t('play.lab.pickBox')}</p>}
      <p className="lab-count">{t('play.lab.found', { n: done.length, of: e.benda.length })}</p>
    </div>
  );
}

function TextureIcon({ v }: { v: 'halus' | 'kasar' | 'panas' | 'dingin' }) {
  return (
    <svg viewBox="0 0 40 24" width="56" height="34" aria-hidden>
      {v === 'halus' && (
        <path
          d="M2 12 C10 6 14 18 20 12 S30 6 38 12"
          fill="none"
          stroke="#2b2540"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {v === 'kasar' && (
        <path
          d="M2 16 L6 6 L10 16 L14 6 L18 16 L22 6 L26 16 L30 6 L34 16 L38 6"
          fill="none"
          stroke="#2b2540"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}
      {v === 'panas' && (
        <g>
          <rect
            x="16"
            y="2"
            width="8"
            height="16"
            rx="4"
            fill="#fff"
            stroke="#2b2540"
            strokeWidth="2"
          />
          <circle cx="20" cy="19" r="4.5" fill="#f3722c" stroke="#2b2540" strokeWidth="2" />
          <rect x="18.5" y="6" width="3" height="12" fill="#f3722c" />
        </g>
      )}
      {v === 'dingin' && (
        <g>
          <rect
            x="16"
            y="2"
            width="8"
            height="16"
            rx="4"
            fill="#fff"
            stroke="#2b2540"
            strokeWidth="2"
          />
          <circle cx="20" cy="19" r="4.5" fill="#277da1" stroke="#2b2540" strokeWidth="2" />
          <rect x="18.5" y="14" width="3" height="4" fill="#277da1" />
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------ Rawat */

export function HabitSort({
  rawat,
  onDone,
}: {
  rawat: { suara: string; kebiasaan: LabHabit[] };
  onDone: () => void;
}) {
  const list = rawat.kebiasaan;
  const [i, setI] = useState(0);
  const [right, setRight] = useState<boolean>();
  const s = useShake();
  const later = useLater();
  const h = list[i];
  useEffect(() => {
    if (h) speak(h.suara);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  if (!h)
    return (
      <div className="lab-finish">
        <DoneNote text={t('play.lab.habitDone')} />
        <button type="button" className="kid-btn secondary" onClick={() => setI(0)}>
          {t('play.lab.again')}
        </button>
      </div>
    );
  const pick = (baik: boolean) => {
    if (right) return;
    if (h.baik === baik) {
      setRight(true);
      speak(t(baik ? 'play.lab.habitGood' : 'play.lab.habitCareful'));
      later(() => {
        setRight(undefined);
        if (i + 1 === list.length) onDone();
        setI(i + 1);
      }, 1700);
    } else {
      s.shake(baik ? 'y' : 'n');
      speak(t('play.lab.habitThink'));
    }
  };
  return (
    <div className="lab-habit">
      <div className="lab-rounds">
        {list.map((_, k) => (
          <span key={k} className={k < i ? 'is-done' : k === i ? 'is-now' : undefined} />
        ))}
      </div>
      <div
        className={`lab-habit-card${right ? (h.baik ? ' is-good' : ' is-careful') : ''}`}
        key={i}
      >
        {h.gambar ? (
          <LabPicView pic={h.gambar} size={110} alt={h.teks} />
        ) : (
          <span className="lab-habit-blank" aria-hidden />
        )}
        <p>{h.teks}</p>
        <SpeakButton text={h.suara} />
      </div>
      <div className="lab-habit-btns">
        <button
          key={s.key('y')}
          type="button"
          className={`lab-habit-btn is-good${s.on('y') ? ' is-shake' : ''}`}
          onClick={() => pick(true)}
        >
          <ThumbIcon />
          {t('play.lab.habitYes')}
        </button>
        <button
          key={s.key('n')}
          type="button"
          className={`lab-habit-btn is-careful${s.on('n') ? ' is-shake' : ''}`}
          onClick={() => pick(false)}
        >
          <CarefulIcon />
          {t('play.lab.habitNo')}
        </button>
      </div>
    </div>
  );
}

function ThumbIcon() {
  return (
    <svg viewBox="0 0 32 32" width="40" height="40" aria-hidden>
      <path
        d="M10 14 L15 4 C18 4 19 6 18 9 L17 13 H26 C28 13 29 15 28 17 L25 26 C24 28 23 28 21 28 H10 Z"
        fill="#fff"
        stroke="#2b2540"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <rect
        x="4"
        y="14"
        width="6"
        height="14"
        rx="1.5"
        fill="#fff"
        stroke="#2b2540"
        strokeWidth="2.2"
      />
    </svg>
  );
}
function CarefulIcon() {
  return (
    <svg viewBox="0 0 32 32" width="40" height="40" aria-hidden>
      <path
        d="M16 3 L30 28 H2 Z"
        fill="#f7c948"
        stroke="#2b2540"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M16 12 V20" stroke="#2b2540" strokeWidth="3" strokeLinecap="round" />
      <circle cx="16" cy="24" r="1.8" fill="#2b2540" />
    </svg>
  );
}
