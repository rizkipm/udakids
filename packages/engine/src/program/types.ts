// PRD A5 — satu format program untuk semua cara input (ketuk, suara, kamera).
export type Dir = 'up' | 'down' | 'left' | 'right';

export type Cond = {
  sensor: 'wall-ahead' | 'puddle-ahead' | 'star-here';
  negate?: boolean;
};

export type Instr =
  | { op: 'move'; dir: Dir; n?: number } // arah tetap (Basic)
  | { op: 'forward'; n?: number } // maju relatif arah hadap (Intermediate+)
  | { op: 'turn'; dir: 'left' | 'right' } // belok relatif (mulai Dunia 6)
  | { op: 'jump' }
  | { op: 'pick' }
  | { op: 'drop' }
  | { op: 'paint'; color: string }
  | { op: 'repeat'; n: number; body: Instr[] } // Dunia 5+
  | { op: 'if'; cond: Cond; then: Instr[]; else?: Instr[] } // Dunia 8+
  | { op: 'card'; id: string }; // puzzle susun urutan / pola

export type Program = Instr[];
