export type Stars = 0 | 1 | 2 | 3;

export type StarInput = {
  solved: boolean;
  /** Jumlah petunjuk yang dipakai di percobaan ini. */
  hintsUsed: number;
  /** Petunjuk yang masih boleh dipakai untuk tetap dapat bintang 2 (level `stars.hintsAllowedFor2Stars`). */
  hintsAllowedFor2Stars?: number;
  /** Puzzle "hemat" (grid): kartu yang dipakai dan `optimalSteps` hasil solver. */
  cardsUsed?: number;
  optimalSteps?: number;
  /** Puzzle tanpa konsep hemat: benar pada percobaan pertama. */
  firstTry?: boolean;
};

/**
 * PRD A8 — bintang bertingkat:
 * 1 = sampai tujuan / jawaban benar; 2 = + tanpa petunjuk; 3 = + kartu ≤ optimalSteps
 * (untuk puzzle tanpa konsep hemat: + benar pada percobaan pertama).
 */
export function computeStars(input: StarInput): Stars {
  if (!input.solved) return 0;
  if (input.hintsUsed > (input.hintsAllowedFor2Stars ?? 0)) return 1;
  const efficient =
    input.optimalSteps !== undefined
      ? input.cardsUsed !== undefined && input.cardsUsed <= input.optimalSteps
      : input.firstTry === true;
  return efficient ? 3 : 2;
}

/** Bintang yang sudah didapat tidak pernah berkurang (simpan max). */
export const mergeStars = (prev: Stars | undefined, next: Stars): Stars =>
  Math.max(prev ?? 0, next) as Stars;
