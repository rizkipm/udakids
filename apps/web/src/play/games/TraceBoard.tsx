import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  GLYPH_HEIGHT,
  GLYPHS,
  interpolate,
  strokePath,
  traceFraction,
  traceStep,
  TRACE_START,
  type GlyphId,
  type Pt,
  type TraceState,
} from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { t } from '../../i18n';
import './games.css';

const PAD = 14;
/** Warna goresan yang sudah ditebalkan (bergantian per goresan). */
const INK = ['#5b3fd6', '#e76f51', '#2a9d8f', '#f4a259'];

/**
 * Papan menebalkan angka (D-068). Anak menggores dengan jari/mouse mulai dari titik bernomor; warna mengisi
 * jalur saat jari maju. Keluar jalur → goresan itu diulang dengan lembut (dihitung sebagai "slip"), tanpa
 * kata "salah". Tulisan anak tidak disimpan — hanya banyak slip yang dikirim lewat `onDone`.
 */
export function TraceBoard({
  glyph,
  guide = 'solid',
  tolerance = 16,
  disabled = false,
  onDone,
  size = 300,
}: {
  glyph: GlyphId;
  guide?: 'solid' | 'dotted';
  tolerance?: number;
  disabled?: boolean;
  onDone?: (slips: number) => void;
  size?: number;
}) {
  const g = GLYPHS[glyph];
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState(0);
  const [state, setState] = useState<TraceState>(TRACE_START);
  const [trail, setTrail] = useState<Pt[]>([]);
  const [slips, setSlips] = useState(0);
  const [nudge, setNudge] = useState(0);
  const [demo, setDemo] = useState(false);
  const last = useRef<Pt | null>(null);
  const live = useRef<TraceState>(TRACE_START);

  useEffect(() => {
    setActive(0);
    setState(TRACE_START);
    live.current = TRACE_START;
    setTrail([]);
    setSlips(0);
  }, [glyph]);

  const done = active >= g.strokes.length;
  const stroke = g.strokes[Math.min(active, g.strokes.length - 1)]!;
  const paths = useMemo(() => g.strokes.map(strokePath), [g]);

  const toGlyph = (e: PointerEvent): Pt | null => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  const reset = (slip: boolean) => {
    live.current = TRACE_START;
    setState(TRACE_START);
    setTrail([]);
    last.current = null;
    if (slip) {
      setSlips((s) => s + 1);
      setNudge((n) => n + 1);
      speak(t('play.trace.offPath', { n: active + 1 }));
    }
  };

  const advance = (p: Pt) => {
    const from = last.current;
    const pts = from ? interpolate(from, p) : [p];
    let s = live.current;
    for (const q of pts) s = traceStep(stroke, s, q, tolerance);
    last.current = p;
    live.current = s;
    setState(s);
    if (s.status !== 'idle') setTrail((tr) => (tr.length > 400 ? tr : [...tr, p]));
    if (s.status === 'off') reset(true);
    else if (s.status === 'done') finishStroke(p);
  };

  const finishStroke = (p: Pt) => {
    const next = active + 1;
    // Goresan berikutnya mulai di tempat jari berada (mis. angka 1): lanjut tanpa mengangkat jari.
    const following = g.strokes[next];
    const carry = following ? traceStep(following, TRACE_START, p, tolerance) : TRACE_START;
    live.current = carry;
    last.current = carry.status === 'drawing' ? p : null;
    setTrail([]);
    setState(carry);
    setActive(next);
    if (next >= g.strokes.length) {
      speak(t('play.trace.done'));
      onDone?.(slips);
    }
  };

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (disabled || done) return;
    const p = toGlyph(e);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    advance(p);
    if (live.current.status === 'idle') {
      // Belum di titik awal: tunjukkan titiknya dengan lembut (bukan slip).
      setNudge((n) => n + 1);
      speak(t('play.trace.startHere', { n: active + 1 }));
    }
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (disabled || done || live.current.status !== 'drawing') return;
    const p = toGlyph(e);
    if (p) advance(p);
  };
  const onUp = () => {
    // Jari diangkat sebelum ujung goresan: ulang goresan itu tanpa dihitung slip.
    if (live.current.status === 'drawing') reset(false);
  };

  const w = g.width + PAD * 2;
  const h = GLYPH_HEIGHT + PAD * 2;
  const fraction = done ? 1 : traceFraction(stroke, state);
  const arrowAt = stroke[Math.min(stroke.length - 1, 5)]!;

  return (
    <div className={`trace-board${done ? ' is-done' : ''}`}>
      <svg
        ref={svgRef}
        viewBox={`${-PAD} ${-PAD} ${w} ${h}`}
        width={(size * w) / h}
        height={size}
        className="trace-svg"
        role="img"
        aria-label={t('play.trace.label', { n: glyph })}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* Jalur panduan */}
        {paths.map((d, i) => (
          <g key={`guide-${i}`}>
            {guide === 'solid' ? (
              <path d={d} className="trace-guide" />
            ) : (
              <path d={d} className="trace-dotted" />
            )}
            <path d={d} className="trace-center" />
          </g>
        ))}
        {/* Goresan yang sudah selesai */}
        {paths.slice(0, Math.min(active, paths.length)).map((d, i) => (
          <path key={`ink-${i}`} d={d} className="trace-ink" stroke={INK[i % INK.length]} />
        ))}
        {/* Goresan aktif: terisi sesuai kemajuan jari */}
        {!done && (
          <path
            d={paths[active]}
            className="trace-ink"
            stroke={INK[active % INK.length]}
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - fraction}
          />
        )}
        {trail.length > 1 && <path d={strokePath(trail)} className="trace-trail" />}
        {/* Demo: Momo menggambar goresan aktif */}
        {demo && !done && (
          <path
            key={`demo-${active}`}
            d={paths[active]}
            className="trace-demo"
            pathLength={1}
            onAnimationEnd={() => setDemo(false)}
          />
        )}
        {/* Titik awal bernomor + panah arah */}
        {!done &&
          g.strokes.map((s, i) => (
            <g
              key={`start-${i}-${i === active ? nudge : 0}`}
              className={`trace-start${i === active ? ' is-active' : ''}${i < active ? ' is-past' : ''}`}
            >
              <circle cx={s[0]!.x} cy={s[0]!.y} r={9} />
              <text x={s[0]!.x} y={s[0]!.y + 4}>
                {i + 1}
              </text>
            </g>
          ))}
        {!done && state.status === 'idle' && (
          <circle cx={arrowAt.x} cy={arrowAt.y} r={3.5} className="trace-arrow" />
        )}
        {done && <Sparkles w={g.width} />}
      </svg>
      {!done && (
        <button
          type="button"
          className="kid-link trace-show"
          disabled={disabled}
          onClick={() => {
            setDemo(true);
            speak(t('play.trace.watch'));
          }}
        >
          {t('play.trace.show')}
        </button>
      )}
    </div>
  );
}

/** Bintang kecil berkelip saat angka selesai ditebalkan. */
function Sparkles({ w }: { w: number }) {
  const spots = [
    [0, 10],
    [w, 20],
    [w * 0.15, GLYPH_HEIGHT],
    [w * 0.9, GLYPH_HEIGHT - 10],
    [w / 2, -6],
  ];
  return (
    <g className="trace-sparkles" aria-hidden>
      {spots.map(([x, y], i) => (
        <path
          key={i}
          transform={`translate(${x} ${y})`}
          style={{ animationDelay: `${i * 90}ms` }}
          d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z"
        />
      ))}
    </g>
  );
}
