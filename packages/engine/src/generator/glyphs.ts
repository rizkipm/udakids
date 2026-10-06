/**
 * Jalur goresan angka 0–10 untuk menebalkan (interaksi `trace`) dan animasi Momo menulis. Dibuat sendiri
 * (bukan salinan lembar kerja mana pun): setiap angka = 1–2 goresan bernomor, koordinat di kotak
 * `GLYPH_HEIGHT` tinggi (sumbu y ke bawah), sudah dicacah menjadi titik-titik berjarak ±`STEP`.
 *
 * Pemeriksaan menebalkan juga di sini (fungsi murni): jari harus mulai di titik awal goresan, tetap di
 * dekat jalur, dan maju berurutan sampai ujung goresan.
 */
export type Pt = { x: number; y: number };
export type Glyph = { id: GlyphId; width: number; strokes: Pt[][] };

export const GLYPH_IDS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;
export type GlyphId = (typeof GLYPH_IDS)[number];

export const GLYPH_HEIGHT = 140;
const DIGIT_WIDTH = 100;
const STEP = 3;

const round = (n: number) => Math.round(n * 10) / 10;

/** Cacah polyline menjadi titik berjarak ±STEP (titik sudut tetap ada). */
function resample(points: readonly Pt[]): Pt[] {
  const out: Pt[] = [points[0]!];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.round(len / STEP));
    for (let k = 1; k <= n; k++)
      out.push({ x: round(a.x + ((b.x - a.x) * k) / n), y: round(a.y + ((b.y - a.y) * k) / n) });
  }
  return out;
}

const line = (...pts: [number, number][]): Pt[] => pts.map(([x, y]) => ({ x, y }));

/** Busur elips; sudut dalam derajat, y ke bawah (sudut bertambah = searah jarum jam di layar). */
function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number): Pt[] {
  const n = Math.max(2, Math.ceil(Math.abs(to - from) / 6));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    return { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) };
  });
}

function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt): Pt[] {
  return Array.from({ length: 21 }, (_, i) => {
    const t = i / 20;
    const u = 1 - t;
    return {
      x: u ** 3 * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * p3.x,
      y: u ** 3 * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * p3.y,
    };
  });
}

const join = (...parts: Pt[][]): Pt[] => parts.flat();
const P = (x: number, y: number): Pt => ({ x, y });

/** Goresan kasar per angka (sebelum dicacah). */
const RAW: Record<Exclude<GlyphId, '10'>, Pt[][]> = {
  // Mulai di atas, memutar ke kiri (berlawanan jarum jam) sampai kembali ke atas.
  '0': [arc(50, 70, 32, 52, -90, -450)],
  // Garis miring naik, lalu turun lurus.
  '1': [line([30, 42], [60, 16]), line([60, 16], [60, 126])],
  // Lengkung atas lalu miring ke kiri bawah; lalu garis dasar ke kanan.
  '2': [join(arc(50, 46, 28, 28, 200, 390), line([74, 60], [22, 124])), line([22, 124], [82, 124])],
  // Dua perut: atas lalu bawah.
  '3': [arc(48, 42, 26, 26, 210, 450), arc(48, 97, 29, 29, 270, 510)],
  // Miring turun dan mendatar; lalu tiang tegak.
  '4': [line([62, 16], [18, 92], [86, 92]), line([66, 46], [66, 126])],
  // Tiang turun lalu perut; lalu topi di atas.
  '5': [join(line([30, 16], [29, 64]), arc(48, 92, 30, 30, 230, 480)), line([30, 16], [78, 16])],
  // Lengkung turun lalu lingkaran kecil di bawah.
  '6': [join(bezier(P(72, 16), P(42, 30), P(24, 62), P(24, 98)), arc(49, 98, 25, 26, 180, -180))],
  // Mendatar lalu miring turun.
  '7': [line([20, 16], [80, 16], [42, 126])],
  // Satu goresan: setengah kiri lingkaran atas, lingkaran bawah penuh, setengah kanan lingkaran atas.
  '8': [
    join(
      arc(50, 40, 24, 24, -90, -270),
      arc(50, 96, 29, 28, -90, 270),
      arc(50, 40, 24, 24, 90, -90),
    ),
  ],
  // Lingkaran (mulai di kanan, memutar ke atas), lalu tiang turun.
  '9': [join(arc(50, 44, 26, 27, 0, -360), line([76, 44], [72, 126]))],
};

const shift = (strokes: Pt[][], dx: number, sx = 1) =>
  strokes.map((s) => s.map((p) => ({ x: p.x * sx + dx, y: p.y })));

function build(id: GlyphId): Glyph {
  if (id === '10') {
    // "1" dan "0" berdampingan (sedikit dirampingkan).
    const one = shift(RAW['1'], -8, 0.9);
    const zero = shift(RAW['0'], 62, 0.9);
    return { id, width: 160, strokes: [...one, ...zero].map(resample) };
  }
  return { id, width: DIGIT_WIDTH, strokes: RAW[id].map(resample) };
}

export const GLYPHS: Record<GlyphId, Glyph> = Object.fromEntries(
  GLYPH_IDS.map((id) => [id, build(id)]),
) as Record<GlyphId, Glyph>;

export const glyphOf = (n: number): Glyph => {
  const id = String(n);
  if (!(GLYPH_IDS as readonly string[]).includes(id))
    throw new Error(`tidak ada goresan angka ${n}`);
  return GLYPHS[id as GlyphId];
};

/** Jalur SVG (`d`) untuk satu goresan. */
export const strokePath = (stroke: readonly Pt[]) =>
  stroke.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Jarak titik ke jalur goresan (ke titik cacahan terdekat; cacahan cukup rapat). */
export function distanceToStroke(stroke: readonly Pt[], p: Pt): number {
  let best = Infinity;
  for (const q of stroke) best = Math.min(best, dist(p, q));
  return best;
}

/**
 * Keadaan satu goresan yang sedang ditebalkan. `reached` = indeks titik jalur terjauh yang sudah dilewati
 * berurutan (−1 = belum mulai).
 */
export type TraceState = { reached: number; status: 'idle' | 'drawing' | 'off' | 'done' };

export const TRACE_START: TraceState = { reached: -1, status: 'idle' };

/** Seberapa jauh jari boleh melompat maju dalam satu gerakan (titik cacahan). */
const LOOKAHEAD = 8;

/**
 * Langkah pemeriksaan menebalkan: dipanggil untuk setiap titik sentuh (koordinat glyph). Mulai harus di
 * dekat titik awal; selama menggores, jari maju bila dekat titik berikutnya, dan "keluar jalur" bila
 * terlalu jauh dari goresan. Selesai bila titik akhir tercapai.
 */
export function traceStep(
  stroke: readonly Pt[],
  state: TraceState,
  p: Pt,
  tolerance: number,
): TraceState {
  if (state.status === 'done' || state.status === 'off') return state;
  if (state.status === 'idle') {
    return dist(p, stroke[0]!) <= tolerance * 1.4 ? { reached: 0, status: 'drawing' } : state;
  }
  if (distanceToStroke(stroke, p) > tolerance * 1.6) return { ...state, status: 'off' };
  let reached = state.reached;
  const last = Math.min(stroke.length - 1, reached + LOOKAHEAD);
  for (let i = reached + 1; i <= last; i++) if (dist(p, stroke[i]!) <= tolerance) reached = i;
  return { reached, status: reached >= stroke.length - 2 ? 'done' : 'drawing' };
}

/** Titik-titik antara dua sampel sentuhan (gerakan cepat tidak melompati jalur). */
export function interpolate(a: Pt, b: Pt, step = STEP): Pt[] {
  const n = Math.max(1, Math.ceil(dist(a, b) / step));
  return Array.from({ length: n }, (_, i) => ({
    x: a.x + ((b.x - a.x) * (i + 1)) / n,
    y: a.y + ((b.y - a.y) * (i + 1)) / n,
  }));
}

/** Jalankan semua titik satu gesekan jari sekaligus (dipakai test & pemeriksaan akhir). */
export function traceStroke(
  stroke: readonly Pt[],
  points: readonly Pt[],
  tolerance: number,
): TraceState {
  let s = TRACE_START;
  for (const p of points) s = traceStep(stroke, s, p, tolerance);
  return s;
}

/** Bagian goresan yang sudah dilewati (0–1), untuk mengisi warna saat menebalkan. */
export const traceFraction = (stroke: readonly Pt[], s: TraceState) =>
  s.status === 'done' ? 1 : s.reached < 0 ? 0 : Math.min(1, s.reached / (stroke.length - 1));
