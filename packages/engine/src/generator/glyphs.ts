/**
 * Jalur goresan angka 0–10, huruf vokal a i u e o / A I U E O (D-075), dan konsonan b–z kecil & besar (D-083)
 * untuk menebalkan (interaksi `trace`)
 * dan animasi Momo menulis. Dibuat sendiri (bukan salinan lembar kerja mana pun): setiap angka/huruf =
 * 1–4 goresan bernomor, koordinat di kotak
 * `GLYPH_HEIGHT` tinggi (sumbu y ke bawah), sudah dicacah menjadi titik-titik berjarak ±`STEP`.
 *
 * Pemeriksaan menebalkan juga di sini (fungsi murni): jari harus mulai di titik awal goresan, tetap di
 * dekat jalur, dan maju berurutan sampai ujung goresan.
 */
export type Pt = { x: number; y: number };
export type Glyph = { id: GlyphId; width: number; strokes: Pt[][] };

export const DIGIT_GLYPH_IDS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;
/** Huruf vokal kecil & besar (D-075). */
export const VOWELS = ['a', 'i', 'u', 'e', 'o'] as const;
export type Vowel = (typeof VOWELS)[number];
/** Huruf a–z (urutan abjad). */
export const ALPHABET = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
] as const;
export type Letter = (typeof ALPHABET)[number];
/** Konsonan b–z (D-083). */
export const CONSONANT_LETTERS = ALPHABET.filter(
  (l) => !(VOWELS as readonly string[]).includes(l),
) as readonly Exclude<Letter, Vowel>[];
type Upper<T extends string> = Uppercase<T>;
export const LETTER_GLYPH_IDS = [
  ...ALPHABET,
  ...(ALPHABET.map((l) => l.toUpperCase()) as Upper<Letter>[]),
] as const;
export type LetterGlyphId = Letter | Upper<Letter>;
/** Garis & pola pramenulis (P-BT-02/03, D-081). */
export const STROKE_GLYPH_IDS = [
  'tegak',
  'datar',
  'miring',
  'tambah',
  'pagar',
  'tangga',
  'lengkung',
  'lingkaran',
  'zigzag',
  'gelombang',
  'spiral',
] as const;
export type StrokeGlyphId = (typeof STROKE_GLYPH_IDS)[number];
export const GLYPH_IDS = [...DIGIT_GLYPH_IDS, ...LETTER_GLYPH_IDS, ...STROKE_GLYPH_IDS] as const;
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
const RAW: Record<Exclude<(typeof DIGIT_GLYPH_IDS)[number], '10'>, Pt[][]> = {
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

/**
 * Huruf vokal. Huruf kecil berdiri di garis dasar y=126 dengan tinggi badan ±70 (seperti buku tulis
 * bergaris); huruf besar setinggi angka. Arah goresan mengikuti cara menulis yang diajarkan di PAUD/TK.
 */
const LETTERS: Record<LetterGlyphId, { width: number; strokes: Pt[][] }> = {
  // Bulatan (mulai kanan atas, memutar ke kiri), lalu tiang turun di kanan.
  a: { width: 90, strokes: [arc(44, 92, 26, 32, -40, -400), line([70, 58], [70, 126])] },
  // Tiang turun, lalu titik di atasnya.
  i: { width: 50, strokes: [line([25, 62], [25, 126]), arc(25, 36, 5, 5, -90, -450)] },
  // Turun, melengkung di bawah, naik; lalu tiang turun di kanan.
  u: {
    width: 90,
    strokes: [
      join(line([18, 58], [18, 98]), arc(43, 98, 25, 28, 180, 0), line([68, 98], [68, 58])),
      line([68, 58], [68, 126]),
    ],
  },
  // Garis tengah ke kanan, lalu memutar ke atas, ke kiri, dan ke bawah.
  e: { width: 90, strokes: [join(line([18, 92], [70, 92]), arc(44, 92, 26, 34, 0, -305))] },
  // Bulatan, mulai di atas memutar ke kiri.
  o: { width: 90, strokes: [arc(45, 92, 27, 34, -90, -450)] },
  // Miring kiri, miring kanan (dari puncak), lalu palang.
  A: {
    width: 100,
    strokes: [line([50, 16], [16, 126]), line([50, 16], [84, 126]), line([30, 84], [70, 84])],
  },
  I: { width: 50, strokes: [line([25, 16], [25, 126])] },
  U: {
    width: 100,
    strokes: [
      join(line([20, 16], [20, 88]), arc(50, 88, 30, 38, 180, 0), line([80, 88], [80, 16])),
    ],
  },
  // Tiang, lalu tiga palang dari atas ke bawah.
  E: {
    width: 90,
    strokes: [
      line([22, 16], [22, 126]),
      line([22, 16], [74, 16]),
      line([22, 70], [66, 70]),
      line([22, 126], [74, 126]),
    ],
  },
  O: { width: 100, strokes: [arc(50, 71, 34, 55, -90, -450)] },

  // ---- Konsonan (D-083). Huruf kecil: badan y 58–126, tiang tinggi mulai y 16. Huruf berekor (g j p q y)
  // badannya dinaikkan (y 32–88) supaya ekornya muat di kotak.
  // Tiang turun, lalu perut di kanan (mulai di tiang, naik memutar ke kanan).
  b: { width: 84, strokes: [line([22, 16], [22, 126]), arc(48, 94, 26, 32, 180, 540)] },
  // Mulai kanan atas, memutar ke kiri, berhenti di kanan bawah.
  c: { width: 84, strokes: [arc(48, 92, 28, 34, -40, -320)] },
  // Bulatan seperti a, lalu tiang tinggi di kanan.
  d: { width: 90, strokes: [arc(44, 92, 26, 32, -40, -400), line([70, 16], [70, 126])] },
  // Kait di atas lalu turun; lalu palang.
  f: {
    width: 84,
    strokes: [
      join(bezier(P(72, 26), P(64, 12), P(40, 10), P(40, 38)), line([40, 38], [40, 126])),
      line([18, 62], [64, 62]),
    ],
  },
  // Bulatan, lalu tiang turun berkait ke kiri.
  g: {
    width: 90,
    strokes: [
      arc(44, 60, 24, 28, -40, -400),
      join(line([68, 32], [68, 110]), arc(46, 110, 22, 22, 0, 160)),
    ],
  },
  // Tiang tinggi; lalu dari tiang naik melengkung dan turun.
  h: {
    width: 90,
    strokes: [
      line([22, 16], [22, 126]),
      join(arc(46, 84, 24, 24, 180, 360), line([70, 84], [70, 126])),
    ],
  },
  // Tiang turun berkait ke kiri, lalu titik.
  j: {
    width: 64,
    strokes: [
      join(line([44, 40], [44, 114]), arc(28, 114, 16, 18, 0, 160)),
      arc(44, 16, 5, 5, -90, -450),
    ],
  },
  // Tiang tinggi; lalu miring masuk dan miring keluar.
  k: { width: 84, strokes: [line([22, 16], [22, 126]), line([66, 58], [24, 94], [68, 126])] },
  l: { width: 50, strokes: [line([25, 16], [25, 126])] },
  // Tiang, lalu dua bukit.
  m: {
    width: 100,
    strokes: [
      line([16, 58], [16, 126]),
      join(arc(33, 80, 17, 20, 180, 360), line([50, 80], [50, 126])),
      join(arc(67, 80, 17, 20, 180, 360), line([84, 80], [84, 126])),
    ],
  },
  // Tiang, lalu satu bukit.
  n: {
    width: 88,
    strokes: [
      line([20, 58], [20, 126]),
      join(arc(44, 84, 24, 24, 180, 360), line([68, 84], [68, 126])),
    ],
  },
  // Tiang turun berekor; lalu perut di kanan atas.
  p: { width: 84, strokes: [line([22, 32], [22, 136]), arc(46, 60, 24, 28, 180, 540)] },
  // Bulatan, lalu tiang lurus berekor di kanan.
  q: { width: 90, strokes: [arc(44, 60, 24, 28, -40, -400), line([68, 32], [68, 136])] },
  // Tiang, lalu bahu kecil ke kanan.
  r: { width: 74, strokes: [line([22, 58], [22, 126]), arc(44, 84, 22, 24, 180, 310)] },
  // Satu goresan berkelok dari kanan atas ke kiri bawah.
  s: {
    width: 86,
    strokes: [
      join(
        bezier(P(66, 68), P(58, 54), P(22, 54), P(24, 76)),
        bezier(P(24, 76), P(26, 94), P(66, 88), P(66, 108)),
        bezier(P(66, 108), P(66, 130), P(26, 132), P(20, 114)),
      ),
    ],
  },
  // Tiang turun berbelok ke kanan di bawah; lalu palang.
  t: {
    width: 76,
    strokes: [
      join(line([36, 24], [36, 110]), arc(52, 110, 16, 16, 180, 60)),
      line([16, 58], [60, 58]),
    ],
  },
  v: { width: 88, strokes: [line([16, 58], [44, 126], [72, 58])] },
  w: { width: 100, strokes: [line([12, 58], [30, 126], [50, 76], [70, 126], [88, 58])] },
  x: { width: 88, strokes: [line([18, 58], [70, 126]), line([70, 58], [18, 126])] },
  // Miring pendek; lalu miring panjang berekor.
  y: { width: 88, strokes: [line([16, 32], [44, 88]), line([72, 32], [30, 136])] },
  z: { width: 90, strokes: [line([18, 58], [70, 58], [18, 126], [72, 126])] },

  // Huruf besar: setinggi angka (y 16–126).
  B: {
    width: 94,
    strokes: [
      line([22, 16], [22, 126]),
      join(line([22, 16], [50, 16]), arc(50, 43, 26, 27, -90, 90), line([50, 70], [22, 70])),
      join(line([22, 70], [54, 70]), arc(54, 98, 28, 28, -90, 90), line([54, 126], [22, 126])),
    ],
  },
  C: { width: 100, strokes: [arc(58, 71, 40, 55, -40, -320)] },
  D: {
    width: 92,
    strokes: [
      line([22, 16], [22, 126]),
      join(line([22, 16], [40, 16]), arc(40, 71, 40, 55, -90, 90), line([40, 126], [22, 126])),
    ],
  },
  F: {
    width: 88,
    strokes: [line([22, 16], [22, 126]), line([22, 16], [76, 16]), line([22, 68], [66, 68])],
  },
  G: { width: 104, strokes: [join(arc(56, 71, 40, 55, -40, -360), line([96, 71], [62, 71]))] },
  H: {
    width: 100,
    strokes: [line([20, 16], [20, 126]), line([80, 16], [80, 126]), line([20, 70], [80, 70])],
  },
  J: { width: 86, strokes: [join(line([66, 16], [66, 96]), arc(42, 96, 24, 30, 0, 170))] },
  K: { width: 92, strokes: [line([22, 16], [22, 126]), line([78, 16], [24, 76], [80, 126])] },
  L: { width: 86, strokes: [line([24, 16], [24, 126], [76, 126])] },
  M: { width: 100, strokes: [line([14, 126], [14, 16], [50, 90], [86, 16], [86, 126])] },
  N: { width: 100, strokes: [line([20, 126], [20, 16], [80, 126], [80, 16])] },
  P: {
    width: 90,
    strokes: [
      line([22, 16], [22, 126]),
      join(line([22, 16], [50, 16]), arc(50, 44, 28, 28, -90, 90), line([50, 72], [22, 72])),
    ],
  },
  Q: { width: 100, strokes: [arc(50, 71, 34, 55, -90, -450), line([60, 100], [88, 132])] },
  R: {
    width: 92,
    strokes: [
      line([22, 16], [22, 126]),
      join(line([22, 16], [50, 16]), arc(50, 44, 28, 28, -90, 90), line([50, 72], [22, 72])),
      line([46, 72], [80, 126]),
    ],
  },
  S: {
    width: 100,
    strokes: [
      join(
        bezier(P(78, 30), P(66, 10), P(22, 12), P(24, 42)),
        bezier(P(24, 42), P(26, 66), P(78, 64), P(78, 96)),
        bezier(P(78, 96), P(78, 130), P(26, 130), P(18, 106)),
      ),
    ],
  },
  T: { width: 100, strokes: [line([14, 16], [86, 16]), line([50, 16], [50, 126])] },
  V: { width: 100, strokes: [line([14, 16], [50, 126], [86, 16])] },
  W: { width: 100, strokes: [line([8, 16], [28, 126], [50, 46], [72, 126], [92, 16])] },
  X: { width: 100, strokes: [line([16, 16], [84, 126]), line([84, 16], [16, 126])] },
  Y: { width: 100, strokes: [line([16, 16], [50, 70]), line([84, 16], [50, 70], [50, 126])] },
  Z: { width: 100, strokes: [line([16, 16], [84, 16], [16, 126], [86, 126])] },
};

const shift = (strokes: Pt[][], dx: number, sx = 1) =>
  strokes.map((s) => s.map((p) => ({ x: p.x * sx + dx, y: p.y })));

/** Spiral dari tengah keluar (siput), searah jarum jam di layar. */
function spiral(cx: number, cy: number, turns: number, step: number): Pt[] {
  const n = Math.ceil(turns * 60);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * turns * 2 * Math.PI;
    const r = 4 + (step * t) / (2 * Math.PI);
    return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
  });
}

/**
 * Garis pramenulis: arah seperti di buku menulis PAUD — tegak dari atas ke bawah, mendatar dari kiri ke kanan,
 * lengkung & gelombang dari kiri, lingkaran mulai di atas memutar ke kiri.
 */
const STROKES: Record<StrokeGlyphId, { width: number; strokes: Pt[][] }> = {
  tegak: { width: 60, strokes: [line([30, 14], [30, 126])] },
  datar: { width: 140, strokes: [line([12, 70], [128, 70])] },
  miring: { width: 130, strokes: [line([18, 18], [112, 122])] },
  tambah: { width: 120, strokes: [line([60, 14], [60, 126]), line([12, 70], [108, 70])] },
  pagar: {
    width: 130,
    strokes: [line([20, 20], [20, 120]), line([65, 20], [65, 120]), line([110, 20], [110, 120])],
  },
  tangga: {
    width: 140,
    strokes: [line([12, 28], [48, 28], [48, 66], [86, 66], [86, 104], [128, 104])],
  },
  lengkung: { width: 140, strokes: [arc(70, 112, 56, 84, 180, 360)] },
  lingkaran: { width: 120, strokes: [arc(60, 70, 46, 52, -90, -450)] },
  zigzag: { width: 136, strokes: [line([10, 112], [40, 34], [68, 112], [96, 34], [126, 112])] },
  gelombang: {
    width: 140,
    strokes: [
      join(
        arc(26, 70, 16, 18, 180, 360),
        arc(58, 70, 16, 18, 180, 0),
        arc(90, 70, 16, 18, 180, 360),
        arc(122, 70, 16, 18, 180, 0),
      ),
    ],
  },
  spiral: { width: 120, strokes: [spiral(60, 70, 2.25, 18)] },
};

function build(id: GlyphId): Glyph {
  if (id in STROKES) {
    const g = STROKES[id as StrokeGlyphId];
    return { id, width: g.width, strokes: g.strokes.map(resample) };
  }
  if (id === '10') {
    // "1" dan "0" berdampingan (sedikit dirampingkan).
    const one = shift(RAW['1'], -8, 0.9);
    const zero = shift(RAW['0'], 62, 0.9);
    return { id, width: 160, strokes: [...one, ...zero].map(resample) };
  }
  if (id in LETTERS) {
    const l = LETTERS[id as LetterGlyphId];
    return { id, width: l.width, strokes: l.strokes.map(resample) };
  }
  return {
    id,
    width: DIGIT_WIDTH,
    strokes: RAW[id as Exclude<GlyphId, '10' | LetterGlyphId | StrokeGlyphId>].map(resample),
  };
}

export const GLYPHS: Record<GlyphId, Glyph> = Object.fromEntries(
  GLYPH_IDS.map((id) => [id, build(id)]),
) as Record<GlyphId, Glyph>;

export const glyphOf = (n: number): Glyph => {
  const id = String(n);
  if (!(DIGIT_GLYPH_IDS as readonly string[]).includes(id))
    throw new Error(`tidak ada goresan angka ${n}`);
  return GLYPHS[id as GlyphId];
};

export const isLetterGlyph = (id: GlyphId): id is LetterGlyphId =>
  (LETTER_GLYPH_IDS as readonly string[]).includes(id);
export const isStrokeGlyph = (id: string): id is StrokeGlyphId =>
  (STROKE_GLYPH_IDS as readonly string[]).includes(id);
/** Nama garis untuk kalimat soal. */
export const STROKE_NAMES: Record<StrokeGlyphId, string> = {
  tegak: 'garis tegak',
  datar: 'garis mendatar',
  miring: 'garis miring',
  tambah: 'tanda tambah',
  pagar: 'garis pagar',
  tangga: 'garis tangga',
  lengkung: 'garis lengkung',
  lingkaran: 'lingkaran',
  zigzag: 'garis zig-zag',
  gelombang: 'garis gelombang',
  spiral: 'spiral',
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
    if (dist(p, stroke[0]!) > tolerance * 1.4) return state;
    // Goresan sekecil titik (titik huruf i): menyentuhnya sudah cukup.
    if (stroke.every((q) => dist(p, q) <= tolerance))
      return { reached: stroke.length - 1, status: 'done' };
    return { reached: 0, status: 'drawing' };
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
