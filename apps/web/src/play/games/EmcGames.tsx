import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  chanceReplay,
  coordKey,
  coordLabel,
  coordReplay,
  coordSay,
  gameOver,
  type Choice,
  type Interaction,
} from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import { useSayChoice } from '../itemVoice';
import './g4.css';
import './emc.css';

/**
 * Game EMC Kelas 3–4 (D-101): Harta Karun Koordinat dan Eksperimen Peluang. Ketukan dinilai ulang di engine
 * (`coordReplay`, `chanceReplay`). Tanpa hitung mundur, nyawa, atau streak; kekeliruan ke-2 mengakhiri soal.
 */

type Coord = Extract<Interaction, { type: 'coord' }>;
type Chance = Extract<Interaction, { type: 'chance' }>;
type Mark = { x: number; y: number; name: string; tone?: 'found' | 'answer' | 'hint' };

const CELL = 40;
const PAD = 34;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const fmt = (n: number) => String(n).replace('-', '−');

/**
 * Bidang koordinat yang bisa diketuk: ketukan di mana saja memindahkan penanda ke titik kisi terdekat (target
 * sentuh seluas bidang), panah 64 px menggeser penanda satu petak (bisa dengan mouse/keyboard saja), lalu
 * "Pasang" untuk mengunci jawaban.
 */
export function CoordBoard({
  xMin,
  xMax,
  yMin,
  yMax,
  marks,
  disabled,
  wobble,
  onPlace,
  placeLabel,
}: {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  marks: Mark[];
  disabled: boolean;
  wobble?: boolean;
  onPlace: (x: number, y: number) => void;
  placeLabel?: string;
}) {
  const start = { x: clamp(0, xMin, xMax), y: clamp(0, yMin, yMax) };
  const [cur, setCur] = useState(start);
  const svg = useRef<SVGSVGElement>(null);
  useEffect(
    () => setCur({ x: clamp(0, xMin, xMax), y: clamp(0, yMin, yMax) }),
    [xMin, xMax, yMin, yMax],
  );
  const w = (xMax - xMin) * CELL + PAD * 2;
  const h = (yMax - yMin) * CELL + PAD * 2;
  const X = (x: number) => PAD + (x - xMin) * CELL;
  const Y = (y: number) => PAD + (yMax - y) * CELL;
  const move = (dx: number, dy: number) =>
    setCur((c) => ({ x: clamp(c.x + dx, xMin, xMax), y: clamp(c.y + dy, yMin, yMax) }));
  const tap = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (disabled || !svg.current) return;
    const r = svg.current.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * w;
    const sy = ((e.clientY - r.top) / r.height) * h;
    setCur({
      x: clamp(Math.round((sx - PAD) / CELL) + xMin, xMin, xMax),
      y: clamp(yMax - Math.round((sy - PAD) / CELL), yMin, yMax),
    });
  };
  const xs = Array.from({ length: xMax - xMin + 1 }, (_, i) => xMin + i);
  const ys = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i);
  const ox = clamp(0, xMin, xMax);
  const oy = clamp(0, yMin, yMax);
  return (
    <div className="coord-wrap">
      <svg
        ref={svg}
        className={`coord-board${wobble ? ' is-wobble' : ''}`}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={t('play.coord.board')}
        onPointerDown={tap}
      >
        <rect width={w} height={h} rx={18} fill="#f4fbff" />
        {xs.map((x) => (
          <line
            key={`x${x}`}
            x1={X(x)}
            y1={Y(yMin)}
            x2={X(x)}
            y2={Y(yMax)}
            className="coord-grid"
          />
        ))}
        {ys.map((y) => (
          <line
            key={`y${y}`}
            x1={X(xMin)}
            y1={Y(y)}
            x2={X(xMax)}
            y2={Y(y)}
            className="coord-grid"
          />
        ))}
        <line x1={X(xMin)} y1={Y(oy)} x2={X(xMax)} y2={Y(oy)} className="coord-axis" />
        <line x1={X(ox)} y1={Y(yMin)} x2={X(ox)} y2={Y(yMax)} className="coord-axis" />
        {xs.map((x) => (
          <text key={`nx${x}`} x={X(x)} y={Y(oy) + 18} className="coord-num">
            {fmt(x)}
          </text>
        ))}
        {ys.map((y) =>
          y === oy ? null : (
            <text key={`ny${y}`} x={X(ox) - 14} y={Y(y) + 5} className="coord-num">
              {fmt(y)}
            </text>
          ),
        )}
        {marks.map((m) => (
          <g key={`${m.name}${m.x},${m.y}`} className={`coord-mark is-${m.tone ?? 'hint'}`}>
            <circle cx={X(m.x)} cy={Y(m.y)} r={9} />
            <text x={X(m.x) + 12} y={Y(m.y) - 10} className="coord-name">
              {m.name}
            </text>
          </g>
        ))}
        <g className="coord-cursor" aria-hidden>
          <circle cx={X(cur.x)} cy={Y(cur.y)} r={15} />
          <path d={`M${X(cur.x) - 22} ${Y(cur.y)} h44 M${X(cur.x)} ${Y(cur.y) - 22} v44`} />
        </g>
      </svg>
      <div className="coord-controls">
        <span className="coord-readout" aria-live="polite">
          {t('play.coord.cursor', { point: coordLabel(cur.x, cur.y) })}
        </span>
        <div className="coord-pad">
          <button
            type="button"
            className="g4-step"
            aria-label={t('play.coord.left')}
            disabled={disabled || cur.x <= xMin}
            onClick={() => move(-1, 0)}
          >
            ←
          </button>
          <button
            type="button"
            className="g4-step"
            aria-label={t('play.coord.up')}
            disabled={disabled || cur.y >= yMax}
            onClick={() => move(0, 1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="g4-step"
            aria-label={t('play.coord.down')}
            disabled={disabled || cur.y <= yMin}
            onClick={() => move(0, -1)}
          >
            ↓
          </button>
          <button
            type="button"
            className="g4-step"
            aria-label={t('play.coord.right')}
            disabled={disabled || cur.x >= xMax}
            onClick={() => move(1, 0)}
          >
            →
          </button>
        </div>
        <button
          type="button"
          className="kid-btn coord-place"
          disabled={disabled}
          onClick={() => {
            speak(coordSay(cur.x, cur.y));
            onPlace(cur.x, cur.y);
          }}
        >
          {placeLabel ?? t('play.coord.place')}
        </button>
      </div>
    </div>
  );
}

export function CoordGame({
  interaction: it,
  disabled,
  showAnswer,
  onDone,
}: {
  interaction: Coord;
  disabled: boolean;
  showAnswer: boolean;
  onDone: (taps: string[]) => void;
}) {
  const taps = useRef<string[]>([]);
  const [, setTick] = useState(0);
  const [wobble, setWobble] = useState(false);
  const sayChoice = useSayChoice();
  useEffect(() => {
    taps.current = [];
    setTick((n) => n + 1);
  }, [it]);
  const r = coordReplay(it.steps, taps.current);
  const k = Math.min(r.found, it.steps.length - 1);
  const step = it.steps[k]!;
  const sayStep = () => sayChoice({ id: step.id, say: step.say });
  useEffect(() => {
    if (!r.done && !disabled && !showAnswer) sayStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  const found: Mark[] = it.steps
    .slice(0, showAnswer ? it.steps.length : r.found)
    .map((s) => ({ x: s.x, y: s.y, name: s.name, tone: showAnswer ? 'answer' : 'found' }));
  const marks: Mark[] = [...(r.done || showAnswer ? [] : step.marks), ...found];

  const place = (x: number, y: number) => {
    if (disabled || r.done || showAnswer) return;
    taps.current = [...taps.current, coordKey(x, y)];
    const next = coordReplay(it.steps, taps.current);
    setTick((n) => n + 1);
    if (next.done) {
      speak(t('play.coord.done'));
      return onDone(taps.current);
    }
    if (next.found > r.found) speak(t('play.coord.found', { name: step.name }));
    else if (next.slips > r.slips) {
      setWobble(true);
      window.setTimeout(() => setWobble(false), 450);
      if (gameOver(it, taps.current)) return onDone(taps.current);
      speak(t('play.coord.again'));
    }
  };

  return (
    <div className="g4-board">
      <div className="bingo-call">
        <span className="kid-note">
          {t('play.coord.step', { n: k + 1, total: it.steps.length })}
        </span>
        <p aria-live="polite">{step.text}</p>
        <button type="button" className="g4-step" aria-label={t('play.listen')} onClick={sayStep}>
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
            <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
          </svg>
        </button>
      </div>
      <CoordBoard
        xMin={it.xMin}
        xMax={it.xMax}
        yMin={it.yMin}
        yMax={it.yMax}
        marks={marks}
        wobble={wobble}
        disabled={disabled || showAnswer || r.done}
        onPlace={place}
      />
    </div>
  );
}

/** Kartu satu hasil percobaan: dadu digambar, koin sebagai A/G, bola sebagai teks. */
function OutcomeFace({ c }: { c: Choice }) {
  if (c.visual.kind === 'die' || c.visual.kind === 'row')
    return <VisualView visual={c.visual} size={40} />;
  const text = c.visual.kind === 'text' ? c.visual.text : (c.say ?? c.id);
  if (/^[AG]+$/.test(text))
    return (
      <span className="chance-coins" aria-hidden>
        {text.split('').map((s, i) => (
          <span key={i} className={`chance-coin is-${s}`}>
            {s}
          </span>
        ))}
      </span>
    );
  return <span className="chance-text">{text}</span>;
}

/** Semua hasil yang mungkin (ruang sampel) sebagai kartu yang bisa diketuk. */
export function OutcomeGrid({
  outcomes,
  marked,
  wobble,
  disabled,
  onTap,
}: {
  outcomes: Choice[];
  marked: ReadonlySet<string>;
  wobble?: string;
  disabled: boolean;
  onTap: (id: string) => void;
}) {
  return (
    <div
      className="chance-grid"
      role="group"
      aria-label={t('play.chance.space', { n: outcomes.length })}
    >
      {outcomes.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`chance-cell${marked.has(c.id) ? ' is-marked' : ''}${wobble === c.id ? ' is-wobble' : ''}`}
          aria-pressed={marked.has(c.id)}
          aria-label={c.say}
          disabled={disabled}
          onClick={() => onTap(c.id)}
        >
          <OutcomeFace c={c} />
        </button>
      ))}
    </div>
  );
}

export function ChanceGame({
  interaction: it,
  disabled,
  showAnswer,
  onDone,
}: {
  interaction: Chance;
  disabled: boolean;
  showAnswer: boolean;
  onDone: (taps: string[]) => void;
}) {
  const taps = useRef<string[]>([]);
  const [, setTick] = useState(0);
  const [wobble, setWobble] = useState<string>();
  const sayChoice = useSayChoice();
  useEffect(() => {
    taps.current = [];
    setTick((n) => n + 1);
  }, [it]);
  const r = chanceReplay(it.answer, it.fraction, taps.current);
  const want = new Set(it.answer);
  const marked = new Set(showAnswer ? it.answer : taps.current.filter((x) => want.has(x)));
  const allFound = showAnswer || r.found === it.answer.length;
  const off = disabled || showAnswer || r.done;

  const push = (tap: string) => {
    if (off) return;
    if (!tap.startsWith('p:') && marked.has(tap)) return;
    taps.current = [...taps.current, tap];
    const next = chanceReplay(it.answer, it.fraction, taps.current);
    setTick((n) => n + 1);
    if (next.done) {
      speak(t('play.chance.done'));
      return onDone(taps.current);
    }
    if (next.slips > r.slips) {
      setWobble(tap);
      window.setTimeout(() => setWobble(undefined), 450);
      if (gameOver(it, taps.current)) return onDone(taps.current);
      speak(t(tap.startsWith('p:') ? 'play.chance.fracAgain' : 'play.chance.again'));
      return;
    }
    if (!tap.startsWith('p:')) {
      const c = it.outcomes.find((o) => o.id === tap);
      if (c) sayChoice(c);
      if (next.found === it.answer.length)
        speak(t('play.chance.pick', { f: it.answer.length, n: it.outcomes.length }));
    }
  };

  return (
    <div className="g4-board">
      <p className="chance-event">
        {t('play.chance.event', { event: it.event })}
        <span className="chance-count">
          {t('play.chance.found', {
            n: showAnswer ? it.answer.length : r.found,
            total: it.outcomes.length,
          })}
        </span>
      </p>
      <OutcomeGrid
        outcomes={it.outcomes}
        marked={marked}
        wobble={wobble}
        disabled={off || allFound}
        onTap={push}
      />
      {allFound && (
        <div className="chance-fracs" role="group">
          <p className="kid-note">
            {t('play.chance.pick', { f: it.answer.length, n: it.outcomes.length })}
          </p>
          <div className="chance-frac-row">
            {it.fractions.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`g4-card${showAnswer && c.id === it.fraction ? ' is-answer' : ''}${wobble === `p:${c.id}` ? ' is-wobble' : ''}`}
                aria-label={c.say}
                disabled={off}
                onClick={() => push(`p:${c.id}`)}
              >
                <VisualView visual={c.visual} size={72} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
