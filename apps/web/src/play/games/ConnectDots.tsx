import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { DOT_PICTURES, numberWord, type Interaction } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { t } from '../../i18n';
import './games.css';

type Connect = Extract<Interaction, { type: 'connect' }>;

/** Jarak ketuk ke titik (satuan papan 100×100) — target sentuh besar, titik terdekat yang dipilih. */
const HIT = 13;

/**
 * Sambung titik (D-068): ketuk titik bernomor berurutan; garis tersambung dan gambar terisi warna saat
 * selesai. Ketukan keliru: titik bergoyang + Momo menyebut angka berikutnya (tanpa kata "salah"). Gambar
 * selalu bisa diselesaikan; semua ketukan dikirim lewat `onDone` untuk dinilai engine.
 */
export function ConnectDots({
  interaction: it,
  disabled = false,
  onDone,
  size = 340,
}: {
  interaction: Pick<Connect, 'dots' | 'picture'>;
  disabled?: boolean;
  onDone?: (taps: string[]) => void;
  size?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [taps, setTaps] = useState<string[]>([]);
  const [done, setDone] = useState(0);
  const [shake, setShake] = useState<{ id: string; n: number }>();
  useEffect(() => {
    setTaps([]);
    setDone(0);
    setShake(undefined);
  }, [it]);

  const complete = done >= it.dots.length;
  const picture = DOT_PICTURES[it.picture];

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (disabled || complete) return;
    const m = svgRef.current?.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    let best: (typeof it.dots)[number] | undefined;
    let bestD = HIT;
    for (const d of it.dots) {
      const dist = Math.hypot(d.x - p.x, d.y - p.y);
      if (dist < bestD) [best, bestD] = [d, dist];
    }
    if (!best) return;
    // Titik yang sudah tersambung diketuk lagi: abaikan (bukan slip).
    if (it.dots.indexOf(best) < done) return;
    const next = it.dots[done]!;
    const all = [...taps, best.id];
    setTaps(all);
    if (best.id === next.id) {
      const n = done + 1;
      setDone(n);
      if (n >= it.dots.length) {
        speak(t('play.connect.done', { picture: picture.say }));
        onDone?.(all);
      } else speak(numberWord(next.label));
    } else {
      setShake((s) => ({ id: best.id, n: (s?.n ?? 0) + 1 }));
      speak(t('play.connect.findNext', { n: numberWord(next.label) }));
    }
  };

  const linked = it.dots.slice(0, done);
  const poly = linked.map((d) => `${d.x},${d.y}`).join(' ');
  return (
    <div className={`connect-board${complete ? ' is-done' : ''}`}>
      <svg
        ref={svgRef}
        viewBox="-8 -8 116 116"
        width={size}
        height={size}
        className="connect-svg"
        role="img"
        aria-label={t('play.connect.label', { n: it.dots.length })}
        onPointerDown={onDown}
      >
        {complete && <polygon points={poly} className="connect-fill" fill={picture.fill} />}
        {linked.length > 1 && <polyline points={poly} className="connect-line" />}
        {complete && (
          <line
            x1={linked.at(-1)!.x}
            y1={linked.at(-1)!.y}
            x2={linked[0]!.x}
            y2={linked[0]!.y}
            className="connect-line"
          />
        )}
        {it.dots.map((d, i) => (
          <g
            key={`${d.id}-${shake?.id === d.id ? shake.n : 0}`}
            className={`connect-dot${i < done ? ' is-linked' : ''}${i === done && !complete && shake ? ' is-next' : ''}${shake?.id === d.id ? ' is-shake' : ''}`}
          >
            <circle cx={d.x} cy={d.y} r={5.5} />
            <text x={d.x} y={d.y - 8.5}>
              {d.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
