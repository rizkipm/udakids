import type { Color } from '@little-coder/engine';

/** Warna garis tepi semua ilustrasi (ungu tua, kontras tinggi di latar terang). */
export const OUTLINE = '#2b2540';

/** Token warna untuk COLORS. `fill` = badan utama, `light` = sorotan, `dark` = bayangan. */
export type ColorToken = { fill: string; light: string; dark: string };

/**
 * Warna cerah dengan kontras tinggi terhadap garis tepi. Merah hanya sebuah warna benda — makna
 * (benar/keliru, dicoret, sorotan hitungan) tidak pernah bergantung pada merah.
 */
export const PALETTE: Record<Color, ColorToken> = {
  merah: { fill: '#e8484f', light: '#f7a1a4', dark: '#b3262d' },
  biru: { fill: '#2f80ed', light: '#94c0f8', dark: '#1a5bb8' },
  kuning: { fill: '#ffcc2e', light: '#ffe68f', dark: '#d9a200' },
  hijau: { fill: '#2fb36a', light: '#93deb3', dark: '#1d7f48' },
  ungu: { fill: '#8e5bd6', light: '#c9adf1', dark: '#6537a8' },
  oranye: { fill: '#ff8a2a', light: '#ffc28f', dark: '#d2620b' },
};

/** Warna netral dan warna peran. */
export const TOKENS = {
  ink: OUTLINE,
  paper: '#ffffff',
  card: '#fffdf7',
  muted: '#7a7394',
  blankFill: '#f4f1fb',
  /** Titik / penghitung default (bukan merah). */
  dot: '#2f80ed',
  /** Sorotan "hitung bersama". */
  glow: '#ffe066',
  glowEdge: '#f2b600',
  /** Lencana "ya" — hijau lembut. */
  yes: '#2fa36b',
  /** Lencana "tidak" — abu-abu netral. */
  no: '#8a8799',
  ground: '#e4f4d9',
  groundLine: '#9fcf86',
} as const;

export const FONT = 'Andika, Nunito, system-ui, sans-serif';

/** Warna `color` bila ada, selain itu `fallback`. */
export const tint = (color: Color | undefined, fallback: string): string =>
  color ? PALETTE[color].fill : fallback;

/** Campur hex dengan putih (amt > 0) atau hitam (amt < 0); amt dalam -1..1. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const target = amt > 0 ? 255 : 0;
  const a = Math.min(1, Math.abs(amt));
  const mix = (c: number) => Math.round(c + (target - c) * a);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
