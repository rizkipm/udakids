/** RNG ber-seed (mulberry32 + hash string xmur3) — soal bisa direproduksi untuk debug (PRD A10). */
export type Rng = {
  /** [0, 1) */
  next(): number;
  /** Bilangan bulat di [min, max] (inklusif). */
  int(min: number, max: number): number;
  pick<T>(xs: readonly T[]): T;
  shuffle<T>(xs: readonly T[]): T[];
  /** k elemen berbeda, urutan acak. */
  sample<T>(xs: readonly T[], k: number): T[];
  chance(p: number): boolean;
};

function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function createRng(seed: string | number): Rng {
  let a = hashSeed(String(seed));
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => {
    if (max < min) throw new RangeError(`rentang kosong [${min}, ${max}]`);
    return min + Math.floor(next() * (max - min + 1));
  };
  const shuffle = <T>(xs: readonly T[]): T[] => {
    const out = [...xs];
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  };
  return {
    next,
    int,
    pick: <T>(xs: readonly T[]) => {
      if (xs.length === 0) throw new RangeError('pick dari daftar kosong');
      return xs[int(0, xs.length - 1)]!;
    },
    shuffle,
    sample: <T>(xs: readonly T[], k: number) => {
      if (k > xs.length) throw new RangeError(`sample ${k} dari ${xs.length}`);
      return shuffle(xs).slice(0, k);
    },
    chance: (p: number) => next() < p,
  };
}
