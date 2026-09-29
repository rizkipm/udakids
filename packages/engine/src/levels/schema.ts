import { z } from 'zod';

// PRD A6 — skema level. `levelBaseSchema` = field umum (longgar); `levelSchema` = skema lengkap per type.
export const PUZZLE_TYPES = [
  'sequence-cards',
  'grid-move',
  'pattern',
  'classify',
  'debug',
  'grid-program',
  'code',
  'stage-event',
  'number',
  'measure',
  'predict',
] as const;

/** Type yang sudah didukung engine (MVP, PRD A6). Sisanya ditolak validator sampai diimplementasi. */
export const SUPPORTED_PUZZLE_TYPES = [
  'sequence-cards',
  'grid-move',
  'pattern',
  'classify',
  'number',
  'predict',
] as const;

export const puzzleTypeSchema = z.enum(PUZZLE_TYPES);
export type PuzzleType = z.infer<typeof puzzleTypeSchema>;

export const levelRoleSchema = z.enum(['intro', 'practice', 'twist', 'challenge', 'boss', 'bonus']);
export const levelFocusSchema = z.enum(['logic', 'math', 'science']);
export const tierSchema = z.enum(['basic', 'intermediate', 'advanced']);
export const dirSchema = z.enum(['up', 'down', 'left', 'right']);

const audioKey = z.string().regex(/^[a-z0-9_]+$/, 'audioKey hanya huruf kecil, angka, dan _');
const contentId = z.string().regex(/^[a-z0-9-]+$/, 'id kartu/benda: huruf kecil, angka, dan -');

const baseShape = {
  id: z.string().regex(/^w([1-9]|10)-l(0[1-9]|10|b[1-3])$/, 'format id: w<dunia>-l<01..10|b1..b3>'),
  version: z.number().int().positive(),
  tier: tierSchema,
  world: z.number().int().min(1).max(10),
  index: z.number().int().min(1).max(10),
  role: levelRoleSchema,
  focus: levelFocusSchema,
  skills: z.array(z.string().min(1)).min(1),
  story: z.object({
    intro: audioKey,
    success: audioKey,
    hint: z.array(audioKey).optional(),
  }),
  variants: z.object({ seeded: z.boolean(), count: z.number().int().positive() }).optional(),
};

export const levelBaseSchema = z.looseObject({ ...baseShape, type: puzzleTypeSchema });
export type LevelBase = z.infer<typeof levelBaseSchema>;

// ---------- grid-move ----------

const cell = z.tuple([z.number().int().min(0), z.number().int().min(0)]);
export type Cell = z.infer<typeof cell>;

/** Kartu yang bisa muncul di palette grid. Satu kartu = satu instruksi. */
export const GRID_CARDS = [
  'up',
  'down',
  'left',
  'right',
  'forward',
  'turn-left',
  'turn-right',
  'jump',
  'pick',
  'repeat',
] as const;
export const gridCardSchema = z.enum(GRID_CARDS);
export type GridCard = z.infer<typeof gridCardSchema>;

/** PRD A6/A17: tingkat Basic hanya arah tetap — tanpa belok relatif. */
export const BASIC_FORBIDDEN_CARDS: readonly GridCard[] = ['forward', 'turn-left', 'turn-right'];
/** PRD A14: maksimal 4 jenis kartu tampil sekaligus di tingkat Basic. */
export const BASIC_MAX_CARD_KINDS = 4;
export const MAX_GRID_SIZE = 8;

export const gridMoveSchema = z.strictObject({
  ...baseShape,
  type: z.literal('grid-move'),
  grid: z.strictObject({
    w: z.number().int().min(2).max(MAX_GRID_SIZE),
    h: z.number().int().min(2).max(MAX_GRID_SIZE),
    walls: z.array(cell).default([]),
    stars: z.array(cell).default([]),
    puddles: z.array(cell).default([]),
    numberedPath: z.boolean().default(false),
  }),
  start: z.strictObject({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    facing: dirSchema,
  }),
  goal: z.strictObject({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    /** true → semua bintang di grid harus diambil sebelum tujuan dihitung tercapai. */
    collectAll: z.boolean().default(false),
  }),
  palette: z.array(gridCardSchema).min(1),
  maxCards: z.number().int().min(1).max(20),
  stars: z
    .strictObject({
      optimalSteps: z.union([z.literal('auto'), z.number().int().positive()]).default('auto'),
      hintsAllowedFor2Stars: z.number().int().min(0).default(0),
    })
    .default({ optimalSteps: 'auto', hintsAllowedFor2Stars: 0 }),
});
export type GridMoveLevel = z.infer<typeof gridMoveSchema>;

// ---------- sequence-cards ----------

export const sequenceCardsSchema = z.strictObject({
  ...baseShape,
  type: z.literal('sequence-cards'),
  cards: z.array(contentId).min(2),
  /** Semua urutan yang benar (PRD A6: wajib bisa lebih dari satu). */
  validOrders: z.array(z.array(contentId)).min(1),
  distractors: z.array(contentId).default([]),
});
export type SequenceCardsLevel = z.infer<typeof sequenceCardsSchema>;

// ---------- pattern ----------

export const patternSchema = z.strictObject({
  ...baseShape,
  type: z.literal('pattern'),
  /** Pola yang ditampilkan; `null` = kotak kosong yang harus diisi anak. */
  sequence: z.array(contentId.nullable()).min(3),
  choices: z.array(contentId).min(2),
  /** Isian yang benar untuk kotak kosong, berurutan. Boleh lebih dari satu kemungkinan. */
  answers: z.array(z.array(contentId)).min(1),
});
export type PatternLevel = z.infer<typeof patternSchema>;

// ---------- classify ----------

export const classifySchema = z.strictObject({
  ...baseShape,
  type: z.literal('classify'),
  groups: z.array(contentId).min(2),
  items: z.array(z.strictObject({ id: contentId, group: contentId })).min(2),
});
export type ClassifyLevel = z.infer<typeof classifySchema>;

// ---------- number ----------

export const numberSchema = z.strictObject({
  ...baseShape,
  type: z.literal('number'),
  mode: z.enum(['count', 'number-line', 'ten-frame']),
  /** Benda yang dihitung / ditampilkan (gambar). */
  object: contentId.optional(),
  answer: z.number().int().min(0).max(100),
  choices: z.array(z.number().int().min(0).max(100)).min(2),
});
export type NumberLevel = z.infer<typeof numberSchema>;

// ---------- predict (tebak – coba – ceritakan) ----------

export const predictSchema = z.strictObject({
  ...baseShape,
  type: z.literal('predict'),
  options: z.array(contentId).min(2),
  /** Hasil simulasi yang benar. */
  outcome: contentId,
  /** Pilihan penjelasan bergambar untuk langkah "ceritakan". */
  explanations: z.array(contentId).default([]),
});
export type PredictLevel = z.infer<typeof predictSchema>;

// ---------- union + aturan lintas-field ----------

const levelUnion = z.discriminatedUnion('type', [
  gridMoveSchema,
  sequenceCardsSchema,
  patternSchema,
  classifySchema,
  numberSchema,
  predictSchema,
]);

export type Level = z.infer<typeof levelUnion>;

const sameMultiset = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join('\u0000') === [...b].sort().join('\u0000');

const unique = (xs: readonly unknown[]) =>
  new Set(xs.map((x) => JSON.stringify(x))).size === xs.length;

/** Masalah lintas-field (selain bentuk) untuk level yang sudah lolos bentuk. */
export function levelRuleProblems(level: Level): { path: (string | number)[]; message: string }[] {
  const out: { path: (string | number)[]; message: string }[] = [];
  const add = (path: (string | number)[], message: string) => out.push({ path, message });

  switch (level.type) {
    case 'grid-move': {
      const { grid, start, goal } = level;
      const inside = (x: number, y: number) => x < grid.w && y < grid.h;
      const key = ([x, y]: Cell) => `${x},${y}`;
      const walls = new Set(grid.walls.map(key));
      grid.walls.forEach((c, i) => !inside(...c) && add(['grid', 'walls', i], 'di luar grid'));
      grid.stars.forEach((c, i) => {
        if (!inside(...c)) add(['grid', 'stars', i], 'di luar grid');
        if (walls.has(key(c))) add(['grid', 'stars', i], 'bintang di atas dinding');
      });
      grid.puddles.forEach((c, i) => !inside(...c) && add(['grid', 'puddles', i], 'di luar grid'));
      if (!inside(start.x, start.y)) add(['start'], 'di luar grid');
      if (walls.has(`${start.x},${start.y}`)) add(['start'], 'start di atas dinding');
      if (!inside(goal.x, goal.y)) add(['goal'], 'di luar grid');
      if (walls.has(`${goal.x},${goal.y}`)) add(['goal'], 'tujuan di atas dinding');
      if (start.x === goal.x && start.y === goal.y) add(['goal'], 'tujuan sama dengan start');
      if (!unique(level.palette)) add(['palette'], 'kartu palette duplikat');
      if (level.tier === 'basic') {
        const forbidden = level.palette.filter((c) => BASIC_FORBIDDEN_CARDS.includes(c));
        if (forbidden.length > 0) {
          add(
            ['palette'],
            `tingkat Basic tidak boleh memakai belok relatif: ${forbidden.join(', ')}`,
          );
        }
        if (level.palette.length > BASIC_MAX_CARD_KINDS) {
          add(['palette'], `tingkat Basic maksimal ${BASIC_MAX_CARD_KINDS} jenis kartu`);
        }
      }
      break;
    }
    case 'sequence-cards': {
      if (!unique(level.cards)) add(['cards'], 'kartu duplikat');
      if (!unique(level.validOrders)) add(['validOrders'], 'urutan duplikat');
      level.validOrders.forEach((order, i) => {
        if (!sameMultiset(order, level.cards)) {
          add(['validOrders', i], 'harus memakai setiap kartu di `cards` tepat satu kali');
        }
      });
      level.distractors.forEach((d, i) => {
        if (level.cards.includes(d)) add(['distractors', i], 'pengecoh tidak boleh ada di `cards`');
      });
      break;
    }
    case 'pattern': {
      const blanks = level.sequence.filter((s) => s === null).length;
      if (blanks === 0) add(['sequence'], 'harus ada minimal satu kotak kosong (null)');
      if (!unique(level.choices)) add(['choices'], 'pilihan duplikat');
      if (level.tier === 'basic' && level.choices.length > BASIC_MAX_CARD_KINDS) {
        add(['choices'], `tingkat Basic maksimal ${BASIC_MAX_CARD_KINDS} jenis kartu`);
      }
      level.answers.forEach((ans, i) => {
        if (ans.length !== blanks) add(['answers', i], `harus berisi ${blanks} isian`);
        if (ans.some((a) => !level.choices.includes(a))) {
          add(['answers', i], 'isian harus ada di `choices`');
        }
      });
      break;
    }
    case 'classify': {
      if (!unique(level.groups)) add(['groups'], 'kelompok duplikat');
      if (!unique(level.items.map((i) => i.id))) add(['items'], 'id benda duplikat');
      level.items.forEach((item, i) => {
        if (!level.groups.includes(item.group))
          add(['items', i, 'group'], 'kelompok tidak dikenal');
      });
      level.groups.forEach((g, i) => {
        if (!level.items.some((item) => item.group === g))
          add(['groups', i], 'kelompok tanpa benda');
      });
      break;
    }
    case 'number': {
      if (!unique(level.choices)) add(['choices'], 'pilihan duplikat');
      if (!level.choices.includes(level.answer)) add(['choices'], 'jawaban harus ada di pilihan');
      if (level.tier === 'basic' && level.choices.length > BASIC_MAX_CARD_KINDS) {
        add(['choices'], `tingkat Basic maksimal ${BASIC_MAX_CARD_KINDS} pilihan`);
      }
      break;
    }
    case 'predict': {
      if (!unique(level.options)) add(['options'], 'pilihan duplikat');
      if (!level.options.includes(level.outcome))
        add(['outcome'], 'hasil harus salah satu pilihan');
      break;
    }
  }
  return out;
}

export const levelSchema = levelUnion.superRefine((level, ctx) => {
  for (const p of levelRuleProblems(level)) {
    ctx.addIssue({ code: 'custom', path: p.path, message: p.message });
  }
});

/** Semua audioKey yang dirujuk sebuah level (untuk aturan validator A7 no. 6). */
export function levelAudioKeys(level: Pick<LevelBase, 'story'>): string[] {
  return [level.story.intro, level.story.success, ...(level.story.hint ?? [])];
}

export type FocusCount = Record<z.infer<typeof levelFocusSchema>, number>;

/** PRD A7 no. 5 — tiap dunia: 4 logic, 3 math, 3 science (bonus dikecualikan). */
export const REQUIRED_FOCUS_PER_WORLD: FocusCount = { logic: 4, math: 3, science: 3 };

export function countFocus(levels: Pick<LevelBase, 'role' | 'focus'>[]): FocusCount {
  const count: FocusCount = { logic: 0, math: 0, science: 0 };
  for (const level of levels) {
    if (level.role !== 'bonus') count[level.focus] += 1;
  }
  return count;
}

export function focusProblems(count: FocusCount): string[] {
  return (Object.keys(REQUIRED_FOCUS_PER_WORLD) as (keyof FocusCount)[])
    .filter((focus) => count[focus] !== REQUIRED_FOCUS_PER_WORLD[focus])
    .map((focus) => `${focus}: ${count[focus]} (harus ${REQUIRED_FOCUS_PER_WORLD[focus]})`);
}
