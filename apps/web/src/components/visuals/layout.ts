import type { Layout } from '@little-coder/engine';

/** Posisi pojok kiri-atas setiap sel (satuan = ukuran sel) + luas total (satuan sel). */
export type CellLayout = { pts: { x: number; y: number }[]; w: number; h: number };

/** Hash string FNV-1a 32-bit — seed stabil untuk tata letak acak. */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** PRNG mulberry32 — deterministik, tanpa Math.random. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const extent = (pts: { x: number; y: number }[]): CellLayout => ({
  pts,
  w: Math.max(1, ...pts.map((p) => p.x + 1)),
  h: Math.max(1, ...pts.map((p) => p.y + 1)),
});

/**
 * Tata letak `n` sel.
 * - row: satu baris, membungkus tiap 5.
 * - rows: baris berisi 5 seperti bingkai sepuluh; tiap dua baris (10) diberi jarak lebih.
 * - grid: kotak kira-kira persegi.
 * - ring: melingkar.
 * - scatter: acak ber-seed pada grid bergoyang (tidak pernah bertumpuk).
 */
export function layoutCells(n: number, layout: Layout, seedKey = ''): CellLayout {
  if (n <= 0) return { pts: [], w: 1, h: 1 };
  const pts: { x: number; y: number }[] = [];
  switch (layout) {
    case 'row':
      for (let i = 0; i < n; i++) pts.push({ x: (i % 5) * 1.05, y: Math.floor(i / 5) * 1.05 });
      break;
    case 'rows':
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / 5);
        pts.push({ x: (i % 5) * 1.05, y: r * 1.05 + Math.floor(r / 2) * 0.35 });
      }
      break;
    case 'grid': {
      const cols = Math.ceil(Math.sqrt(n));
      for (let i = 0; i < n; i++) pts.push({ x: (i % cols) * 1.1, y: Math.floor(i / cols) * 1.1 });
      break;
    }
    case 'ring': {
      if (n === 1) {
        pts.push({ x: 0, y: 0 });
        break;
      }
      const R = Math.max(0.8, 1.15 / (2 * Math.sin(Math.PI / n)));
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
        pts.push({ x: R + R * Math.cos(a), y: R + R * Math.sin(a) });
      }
      break;
    }
    case 'scatter': {
      const rand = mulberry32(hashSeed(`${seedKey}:${n}`));
      const cols = Math.max(1, Math.ceil(Math.sqrt(n * 1.5)));
      const rows = Math.max(1, Math.ceil((n * 1.5) / cols));
      const cells: { c: number; r: number; k: number }[] = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ c, r, k: rand() });
      const chosen = cells
        .sort((a, b) => a.k - b.k)
        .slice(0, n)
        .sort((a, b) => a.r - b.r || a.c - b.c);
      for (const { c, r } of chosen)
        pts.push({ x: c * 1.15 + (rand() - 0.5) * 0.24, y: r * 1.15 + (rand() - 0.5) * 0.24 });
      const minX = Math.min(...pts.map((p) => p.x));
      const minY = Math.min(...pts.map((p) => p.y));
      for (const p of pts) {
        p.x -= minX;
        p.y -= minY;
      }
      break;
    }
  }
  return extent(pts);
}
