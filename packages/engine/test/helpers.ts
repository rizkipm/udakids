import { gridMoveSchema, levelSchema, type GridMoveLevel, type Level } from '../src/index.js';

const common = {
  version: 1,
  tier: 'basic',
  role: 'practice',
  focus: 'logic',
  skills: ['direction-fixed'],
  story: { intro: 'vo_intro', success: 'vo_success' },
} as const;

type GridInput = Partial<Omit<GridMoveLevel, 'grid' | 'goal'>> & {
  grid?: Partial<GridMoveLevel['grid']>;
  goal?: Partial<GridMoveLevel['goal']>;
};

/** Level grid kecil untuk test. Default: 3×3, start (0,0) hadap kanan, tujuan (2,0). */
export function gridLevel(over: GridInput = {}): GridMoveLevel {
  return gridMoveSchema.parse({
    id: 'w2-l01',
    world: 2,
    index: 1,
    ...common,
    type: 'grid-move',
    start: { x: 0, y: 0, facing: 'right' },
    palette: ['up', 'down', 'left', 'right'],
    maxCards: 8,
    ...over,
    grid: { w: 3, h: 3, ...over.grid },
    goal: { x: 2, y: 0, ...over.goal },
  });
}

export function level(data: Record<string, unknown>): Level {
  return levelSchema.parse({ id: 'w1-l01', world: 1, index: 1, ...common, ...data });
}

export const levelInput = (data: Record<string, unknown>) => ({
  id: 'w1-l01',
  world: 1,
  index: 1,
  ...common,
  ...data,
});
