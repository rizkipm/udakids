/**
 * Gambar "sambung titik" (interaksi `connect`): titik bernomor disambung berurutan sampai gambarnya jadi.
 * Bentuk dibuat sendiri dari koordinat sederhana (kotak 100×100), tidak meniru lembar kerja mana pun.
 * Setiap gambar punya beberapa versi jumlah titik, supaya Level mudah memakai titik lebih sedikit.
 */
export type DotPoint = { x: number; y: number };
export type DotPicture = {
  /** Nama untuk suara ("Wah, jadi bintang!"). */
  say: string;
  /** Warna isi saat gambar selesai. */
  fill: string;
  /** Titik-titik keliling per jumlah titik (gambar selalu tertutup kembali ke titik 1). */
  shapes: Partial<Record<number, DotPoint[]>>;
};

const pts = (...xy: [number, number][]): DotPoint[] => xy.map(([x, y]) => ({ x, y }));

/** Bintang n sudut: titik luar dan dalam bergantian. */
function star(points: number): DotPoint[] {
  const out: DotPoint[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? 46 : 20;
    const t = -Math.PI / 2 + (i * Math.PI) / points;
    out.push({ x: Math.round(50 + r * Math.cos(t)), y: Math.round(52 + r * Math.sin(t)) });
  }
  return out;
}

export const DOT_PICTURES = {
  layangan: {
    say: 'layang-layang',
    fill: '#f4a259',
    shapes: { 4: pts([50, 6], [86, 42], [50, 94], [14, 42]) },
  },
  rumah: {
    say: 'rumah',
    fill: '#e76f51',
    shapes: {
      5: pts([50, 8], [90, 44], [90, 94], [10, 94], [10, 44]),
      7: pts([50, 8], [96, 46], [80, 46], [80, 94], [20, 94], [20, 46], [4, 46]),
    },
  },
  ikan: {
    say: 'ikan',
    fill: '#4ea8de',
    shapes: {
      8: pts([8, 50], [26, 30], [48, 24], [70, 40], [92, 22], [92, 78], [70, 60], [40, 76]),
    },
  },
  perahu: {
    say: 'perahu',
    fill: '#2a9d8f',
    shapes: {
      // Layar segitiga + lambung; garis terakhir kembali ke titik 1 menjadi tiang.
      6: pts([50, 8], [88, 56], [76, 88], [24, 88], [12, 56], [50, 56]),
      9: pts(
        [50, 6],
        [86, 52],
        [94, 60],
        [78, 90],
        [50, 92],
        [22, 90],
        [6, 60],
        [14, 52],
        [50, 52],
      ),
    },
  },
  bintang: { say: 'bintang', fill: '#ffca3a', shapes: { 10: star(5) } },
  hati: {
    say: 'hati',
    fill: '#ef476f',
    shapes: {
      8: pts([50, 30], [64, 12], [86, 16], [94, 38], [50, 92], [6, 38], [14, 16], [36, 12]),
      10: pts(
        [50, 30],
        [60, 14],
        [76, 10],
        [92, 22],
        [92, 44],
        [50, 92],
        [8, 44],
        [8, 22],
        [24, 10],
        [40, 14],
      ),
    },
  },
  payung: {
    say: 'payung',
    fill: '#9b5de5',
    shapes: {
      7: pts([50, 6], [88, 30], [96, 52], [74, 46], [50, 52], [26, 46], [4, 52]),
      9: pts([50, 6], [76, 14], [92, 32], [96, 52], [74, 46], [50, 52], [26, 46], [4, 52], [8, 32]),
    },
  },
} satisfies Record<string, DotPicture>;

export type DotPictureId = keyof typeof DOT_PICTURES;
export const DOT_PICTURE_IDS = Object.keys(DOT_PICTURES) as DotPictureId[];

/** Gambar yang punya versi dengan tepat n titik. */
export const picturesWith = (n: number): DotPictureId[] =>
  DOT_PICTURE_IDS.filter((id) => (DOT_PICTURES[id] as DotPicture).shapes[n] !== undefined);

/** Semua jumlah titik yang tersedia. */
export const DOT_COUNTS = [
  ...new Set(DOT_PICTURE_IDS.flatMap((id) => Object.keys(DOT_PICTURES[id].shapes).map(Number))),
].sort((a, b) => a - b);

export const dotShape = (id: DotPictureId, n: number): DotPoint[] => {
  const shape = (DOT_PICTURES[id] as DotPicture).shapes[n];
  if (!shape) throw new Error(`gambar ${id} tidak punya versi ${n} titik`);
  return shape;
};
