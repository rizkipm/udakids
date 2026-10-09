import { LINE } from './draw';
import { OUTLINE } from './palette';

/**
 * Tangan dengan jari terangkat (P-MA-04, D-079), digambar sendiri. Urutan menghitung seperti anak PAUD:
 * telunjuk, jari tengah, jari manis, kelingking, lalu jempol. Kotak satu tangan 100×110; jari yang tidak
 * dihitung terlipat (pendek) supaya banyaknya jari terlihat jelas.
 */
/** Tiga warna kulit (kartu jari tidak selalu sama warna, seperti tangan teman-teman). */
const TONES = [
  { skin: '#f8c9a0', dark: '#e4a97c' },
  { skin: '#d9a271', dark: '#b97f4f' },
  { skin: '#9c6440', dark: '#7c4a2c' },
];

/** x tengah jari telunjuk → kelingking, dan tinggi ujungnya saat terangkat. */
const FINGERS = [
  { x: 35, top: 14 },
  { x: 48, top: 8 },
  { x: 61, top: 13 },
  { x: 73, top: 24 },
];

function Hand({
  raised,
  x = 0,
  mirror = false,
  tone = 0,
}: {
  raised: number;
  x?: number;
  mirror?: boolean;
  tone?: number;
}) {
  const { skin: SKIN, dark: SKIN_DARK } = TONES[tone] ?? TONES[0]!;
  const up = (i: number) => i < Math.min(raised, 4);
  const thumbUp = raised >= 5;
  return (
    <g transform={mirror ? `translate(${x + 100} 0) scale(-1 1)` : `translate(${x} 0)`}>
      {FINGERS.map((f, i) => (
        <rect
          key={i}
          x={f.x - 6}
          y={up(i) ? f.top : 46}
          width={12}
          height={up(i) ? 62 - f.top : 18}
          rx={6}
          fill={SKIN}
          {...LINE}
          strokeWidth={2.5}
        />
      ))}
      {/* Jempol: menyamping bila diangkat, terlipat di depan telapak bila belum. */}
      {thumbUp ? (
        <rect
          x={8}
          y={52}
          width={30}
          height={12}
          rx={6}
          fill={SKIN}
          {...LINE}
          strokeWidth={2.5}
          transform="rotate(-35 30 58)"
        />
      ) : null}
      <path
        d="M27 54 H81 V86 C81 98 72 104 60 104 H44 C33 104 27 96 27 86 Z"
        fill={SKIN}
        {...LINE}
        strokeWidth={2.5}
      />
      {!thumbUp && (
        <rect
          x={34}
          y={62}
          width={26}
          height={11}
          rx={5.5}
          fill={SKIN_DARK}
          {...LINE}
          strokeWidth={2.5}
        />
      )}
      {/* Lengan baju */}
      <rect
        x={33}
        y={100}
        width={42}
        height={10}
        rx={3}
        fill="#5b3fd6"
        stroke={OUTLINE}
        strokeWidth={2.5}
      />
    </g>
  );
}

/**
 * Gambar 1–10 jari: satu tangan (≤ 5) atau dua tangan. `split` = jari di tangan kiri (bawaan 5), sisanya di
 * tangan kanan, mis. 7 = 4 + 3.
 */
export function Fingers({
  count,
  tone = 0,
  split,
  mirror = false,
}: {
  count: number;
  tone?: number;
  split?: number;
  /** Satu tangan: tangan kiri. */
  mirror?: boolean;
}) {
  if (count <= 5) return <Hand raised={count} tone={tone} mirror={mirror} />;
  const left = split ?? 5;
  return (
    <>
      <Hand raised={left} mirror tone={tone} />
      <Hand raised={count - left} x={104} tone={tone} />
    </>
  );
}

export const fingersSize = (count: number) => ({ w: count <= 5 ? 100 : 204, h: 112 });
