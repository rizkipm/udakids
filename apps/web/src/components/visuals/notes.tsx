import {
  GLYPH_HEIGHT,
  GLYPHS,
  strokePath,
  type GlyphId,
  type NoteValue,
} from '@little-coder/engine';
import { LINE } from './draw';
import { FONT, OUTLINE } from './palette';

/**
 * Uang kertas Rupiah (D-081): gambar sederhana buatan sendiri — warna khas per nilai dan nominal besar, bukan
 * salinan desain uang asli. Kotak 200×100.
 */
const NOTE_COLOR: Record<NoteValue, string> = {
  1000: '#d9c39a',
  2000: '#a7b6c9',
  5000: '#c9a27b',
  10000: '#b9a3d6',
  20000: '#9ccc9a',
  50000: '#8fb8e6',
  100000: '#e69a9a',
};
const rp = (n: number) => `Rp${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

export function Banknote({ value }: { value: NoteValue }) {
  const fill = NOTE_COLOR[value];
  return (
    <g>
      <rect x={4} y={6} width={192} height={88} rx={10} fill={fill} {...LINE} />
      <rect
        x={14}
        y={16}
        width={172}
        height={68}
        rx={6}
        fill="none"
        stroke="#ffffff99"
        strokeWidth={3}
      />
      <circle cx={36} cy={50} r={16} fill="#ffffff88" stroke={OUTLINE} strokeWidth={2} />
      <path
        d="M40 50 q12 -16 24 0 q-12 16 -24 0 Z"
        fill={fill}
        stroke={OUTLINE}
        strokeWidth={1.5}
      />
      <path
        d="M86 70 q18 -10 36 0 t36 0"
        fill="none"
        stroke="#ffffffaa"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <text
        x={182}
        y={46}
        textAnchor="end"
        fontFamily={FONT}
        fontWeight={900}
        fontSize={value >= 10000 ? 21 : 24}
        fill={OUTLINE}
      >
        {rp(value)}
      </text>
    </g>
  );
}

/** Gambar garis/pola pramenulis (P-BT-02/03): jalur tebal berwarna, titik awal hijau. */
export function GlyphLines({ glyph }: { glyph: GlyphId }) {
  const g = GLYPHS[glyph];
  return (
    <g>
      {g.strokes.map((s, i) => (
        <path
          key={i}
          d={strokePath(s)}
          fill="none"
          stroke="var(--langit)"
          strokeWidth={10}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {g.strokes.map((s, i) => (
        <circle
          key={`s${i}`}
          cx={s[0]!.x}
          cy={s[0]!.y}
          r={7}
          fill="var(--sawah)"
          stroke={OUTLINE}
          strokeWidth={2}
        />
      ))}
    </g>
  );
}
export const glyphBox = (glyph: GlyphId) => ({ w: GLYPHS[glyph].width, h: GLYPH_HEIGHT });
