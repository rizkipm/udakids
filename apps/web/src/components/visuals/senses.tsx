import type { SenseId } from '@little-coder/engine';
import { LINE } from './draw';
import { OUTLINE } from './palette';

/**
 * Pancaindra (D-089): wajah anak besar dengan dua tangan terbuka, dan ikon tiap alat indra. Digambar sendiri
 * (bukan salinan buku mana pun). Koordinat titik (`SENSE_SPOTS`) dipakai untuk sorotan, jelajah di pelajaran, dan
 * game "ketuk di wajah".
 */

const SKIN = '#f6c79a';
const SKIN_DARK = '#e8a878';
const HAIR = '#4a2f20';
const PINK = '#ff9ec7';

export const FACE_W = 240;
export const FACE_H = 270;

/** Pusat & jari-jari titik tiap alat indra pada wajah (koordinat viewBox 240×250). */
export const SENSE_SPOTS: Record<SenseId, { x: number; y: number; r: number }> = {
  mata: { x: 120, y: 88, r: 30 },
  telinga: { x: 199, y: 124, r: 22 },
  hidung: { x: 120, y: 138, r: 18 },
  lidah: { x: 120, y: 188, r: 20 },
  kulit: { x: 204, y: 240, r: 26 },
};

function Hand({ x, flip = false }: { x: number; flip?: boolean }) {
  const s = flip ? -1 : 1;
  return (
    <g transform={`translate(${x} 240) scale(${s} 1)`}>
      <path
        d="M-18 34 L-16 4 C-17 -6 -10 -8 -8 2 L-7 -14 C-7 -24 1 -24 1 -14 L1 -18 C1 -28 9 -28 9 -18 L9 -13 C9 -22 17 -22 17 -12 L17 2 C20 -6 27 -3 25 6 L20 26 C18 32 14 34 10 34 Z"
        fill={SKIN}
        {...LINE}
      />
      <path d="M-4 18 C0 22 6 22 10 18" fill="none" stroke={SKIN_DARK} strokeWidth={2.5} />
    </g>
  );
}

/** Wajah anak dengan dua tangan; alat indra `sense` disorot lingkaran kuning berdenyut. */
export function FaceFigure({ sense, dim }: { sense?: SenseId; dim?: readonly SenseId[] }) {
  const mark = sense ? SENSE_SPOTS[sense] : undefined;
  return (
    <g>
      {/* Badan & tangan */}
      <path
        d="M62 270 C66 238 92 224 120 224 C148 224 174 238 178 270 Z"
        fill="#7cc6ff"
        {...LINE}
      />
      <Hand x={36} />
      <Hand x={204} flip />
      {/* Telinga */}
      <ellipse cx={43} cy={124} rx={15} ry={20} fill={SKIN} {...LINE} />
      <ellipse cx={197} cy={124} rx={15} ry={20} fill={SKIN} {...LINE} />
      <path d="M200 116 C206 120 206 130 199 133" fill="none" stroke={SKIN_DARK} strokeWidth={3} />
      <path d="M40 116 C34 120 34 130 41 133" fill="none" stroke={SKIN_DARK} strokeWidth={3} />
      {/* Kepala */}
      <ellipse cx={120} cy={122} rx={78} ry={95} fill={SKIN} {...LINE} />
      <path
        d="M44 104 C38 44 92 24 124 28 C168 32 204 58 196 106 C184 80 160 62 136 58 C112 54 92 62 80 58 C66 70 52 84 44 104 Z"
        fill={HAIR}
        {...LINE}
      />
      {/* Alis & mata */}
      <path
        d="M84 68 C92 62 104 62 110 68"
        fill="none"
        stroke={HAIR}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path
        d="M130 68 C136 62 148 62 156 68"
        fill="none"
        stroke={HAIR}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <ellipse cx={97} cy={88} rx={12} ry={14} fill="#fff" {...LINE} strokeWidth={2.5} />
      <ellipse cx={143} cy={88} rx={12} ry={14} fill="#fff" {...LINE} strokeWidth={2.5} />
      <circle cx={99} cy={90} r={7} fill="#3b2a20" />
      <circle cx={145} cy={90} r={7} fill="#3b2a20" />
      <circle cx={101} cy={87} r={2.5} fill="#fff" />
      <circle cx={147} cy={87} r={2.5} fill="#fff" />
      {/* Hidung */}
      <path
        d="M120 122 C112 142 112 148 122 148 C128 148 130 144 126 142"
        fill="none"
        stroke={SKIN_DARK}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {/* Pipi */}
      <circle cx={76} cy={158} r={11} fill={PINK} opacity={0.55} />
      <circle cx={164} cy={158} r={11} fill={PINK} opacity={0.55} />
      {/* Mulut terbuka & lidah */}
      <path d="M98 176 C104 204 136 204 142 176 Z" fill="#8c2f39" {...LINE} />
      <path d="M108 190 C112 180 128 180 132 190 C128 198 112 198 108 190 Z" fill="#ff6f8f" />
      {/* Bagian yang tidak bisa diketuk (game dengan pilihan sedikit) tampil redup */}
      {dim?.map((s) => {
        const p = SENSE_SPOTS[s];
        return <circle key={s} cx={p.x} cy={p.y} r={p.r} fill="#fff" opacity={0.55} />;
      })}
      {mark && (
        <g>
          <circle cx={mark.x} cy={mark.y} r={mark.r} fill="none" stroke="#f7a900" strokeWidth={5} />
          <g className="va-pulse">
            <circle
              cx={mark.x}
              cy={mark.y}
              r={mark.r + 6}
              fill="none"
              stroke="#f7c948"
              strokeWidth={4}
            />
          </g>
        </g>
      )}
    </g>
  );
}

/** Ikon satu alat indra (viewBox 100×100). */
export function SenseIcon({ sense }: { sense: SenseId }) {
  switch (sense) {
    case 'mata':
      return (
        <g>
          <path
            d="M8 50 C28 20 72 20 92 50 C72 80 28 80 8 50 Z"
            fill="#fff"
            {...LINE}
            strokeWidth={4}
          />
          <circle cx={50} cy={50} r={17} fill="#4f8fbf" {...LINE} strokeWidth={3} />
          <circle cx={50} cy={50} r={8} fill="#1d1d2b" />
          <circle cx={55} cy={45} r={4} fill="#fff" />
          <path
            d="M18 30 L12 22 M34 22 L31 13 M50 20 V10 M66 22 L69 13 M82 30 L88 22"
            stroke={OUTLINE}
            strokeWidth={4}
            strokeLinecap="round"
          />
        </g>
      );
    case 'telinga':
      return (
        <g>
          <path
            d="M34 30 C34 6 76 6 76 34 C76 52 62 56 60 70 C58 86 44 92 36 82"
            fill={SKIN}
            {...LINE}
            strokeWidth={4}
          />
          <path
            d="M46 32 C46 20 64 20 64 34 C64 44 54 46 54 56"
            fill="none"
            stroke={SKIN_DARK}
            strokeWidth={5}
            strokeLinecap="round"
          />
          <path
            d="M84 36 C90 42 90 54 84 60 M90 28 C100 38 100 58 90 68"
            fill="none"
            stroke="#5b3fd6"
            strokeWidth={4}
            strokeLinecap="round"
          />
        </g>
      );
    case 'hidung':
      return (
        <g>
          <path
            d="M50 10 C40 40 26 58 28 72 C30 84 44 84 50 78 C56 84 70 84 72 72 C74 58 60 40 50 10 Z"
            fill={SKIN}
            {...LINE}
            strokeWidth={4}
          />
          <ellipse cx={40} cy={72} rx={5} ry={3.5} fill={SKIN_DARK} />
          <ellipse cx={60} cy={72} rx={5} ry={3.5} fill={SKIN_DARK} />
          <path
            d="M14 30 C20 24 14 18 20 12 M86 30 C80 24 86 18 80 12"
            fill="none"
            stroke="#43aa8b"
            strokeWidth={4}
            strokeLinecap="round"
          />
        </g>
      );
    case 'lidah':
      return (
        <g>
          <path d="M14 36 C30 86 70 86 86 36 Z" fill="#8c2f39" {...LINE} strokeWidth={4} />
          <path
            d="M30 52 C34 34 66 34 70 52 C68 74 32 74 30 52 Z"
            fill="#ff6f8f"
            {...LINE}
            strokeWidth={3}
          />
          <path d="M50 42 V60" stroke="#e0476a" strokeWidth={3} strokeLinecap="round" />
          <rect x={14} y={28} width={72} height={10} rx={5} fill="#fff" {...LINE} strokeWidth={3} />
        </g>
      );
    default:
      return (
        <g transform="translate(50 52)">
          <path
            d="M-24 40 L-22 4 C-23 -8 -14 -10 -12 2 L-11 -20 C-11 -32 -1 -32 -1 -20 L-1 -26 C-1 -38 9 -38 9 -26 L9 -19 C9 -30 19 -30 19 -17 L19 2 C23 -8 32 -4 29 7 L23 30 C20 38 15 40 10 40 Z"
            fill={SKIN}
            {...LINE}
            strokeWidth={4}
          />
          <path d="M-8 20 C-2 26 6 26 12 20" fill="none" stroke={SKIN_DARK} strokeWidth={3} />
        </g>
      );
  }
}
