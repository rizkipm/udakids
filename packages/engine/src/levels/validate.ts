import { dialogFileSchema } from '../content/dialog.js';
import { analyzeGridLevel, LOOP_SKILL } from '../solver/grid.js';
import {
  countFocus,
  focusProblems,
  levelAudioKeys,
  levelBaseSchema,
  levelSchema,
  SUPPORTED_PUZZLE_TYPES,
  type Level,
} from './schema.js';

export type ContentFile = {
  /** path relatif dengan '/', mis. "levels/basic/world-1/w1-l01.json" */ path: string;
  data: unknown;
};

export type OptimalEntry = { version: number; optimalSteps: number };

export type ValidationReport = {
  errors: string[];
  warnings: string[];
  levels: Level[];
  /** Isi `content/.generated/optimal.json` (PRD A7 no. 3). */
  optimal: Record<string, OptimalEntry>;
};

export type ValidateInput = {
  levels: ContentFile[];
  dialog: ContentFile;
  /** Komposisi 4/3/3 per dunia jadi peringatan, bukan error. */
  allowIncomplete?: boolean;
  /** audioKey lain yang sah (mis. kunci soal Pustaka). */
  extraAudioKeys?: readonly string[];
};

const supported = new Set<string>(SUPPORTED_PUZZLE_TYPES);

/** PRD A7 — aturan validator konten level. Fungsi murni: IO ada di scripts/validate-content.ts. */
export function validateContent(input: ValidateInput): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const levels: Level[] = [];
  const optimal: Record<string, OptimalEntry> = {};
  const err = (path: string, msg: string) => errors.push(`${path}: ${msg}`);

  // audioKey yang dikenal (A7 no. 6).
  const known = new Set(input.extraAudioKeys ?? []);
  const dialog = dialogFileSchema.safeParse(input.dialog.data);
  if (dialog.success) Object.keys(dialog.data.lines).forEach((k) => known.add(k));
  else err(input.dialog.path, dialog.error.issues.map((i) => i.message).join('; '));

  const seen = new Map<string, string>();
  const byWorld = new Map<string, Level[]>();

  for (const file of [...input.levels].sort((a, b) => a.path.localeCompare(b.path))) {
    // Bentuk dasar dulu, agar pesan untuk type yang belum didukung jelas.
    const base = levelBaseSchema.safeParse(file.data);
    if (!base.success) {
      base.error.issues.forEach((i) =>
        err(file.path, `${i.path.join('.') || '(root)'} — ${i.message}`),
      );
      continue;
    }
    if (!supported.has(base.data.type)) {
      err(
        file.path,
        `type "${base.data.type}" belum didukung engine (MVP: ${SUPPORTED_PUZZLE_TYPES.join(', ')})`,
      );
      continue;
    }
    const parsed = levelSchema.safeParse(file.data);
    if (!parsed.success) {
      parsed.error.issues.forEach((i) =>
        err(file.path, `${i.path.join('.') || '(root)'} — ${i.message}`),
      );
      continue;
    }
    const level = parsed.data;

    // Konsistensi id / nama file / folder.
    const expectedId = `w${level.world}-l${String(level.index).padStart(2, '0')}`;
    if (level.role !== 'bonus' && level.id !== expectedId) {
      err(file.path, `id "${level.id}" tidak cocok dengan world/index (${expectedId})`);
    }
    if (!file.path.endsWith(`/${level.id}.json`))
      err(file.path, `nama file harus ${level.id}.json`);
    if (!file.path.includes(`levels/${level.tier}/world-${level.world}/`)) {
      err(file.path, `harus berada di levels/${level.tier}/world-${level.world}/`);
    }
    const prev = seen.get(level.id);
    if (prev) err(file.path, `id "${level.id}" duplikat dengan ${prev}`);
    seen.set(level.id, file.path);

    for (const k of levelAudioKeys(level)) {
      if (!known.has(k)) err(file.path, `audioKey "${k}" tidak ada di dialog`);
    }

    // Solver (A7 no. 2–4).
    if (level.type === 'grid-move') {
      const analysis = analyzeGridLevel(level);
      if (!analysis.solvable || analysis.optimalSteps === undefined) {
        err(file.path, `tidak bisa diselesaikan dalam maxCards = ${level.maxCards}`);
      } else {
        optimal[level.id] = { version: level.version, optimalSteps: analysis.optimalSteps };
        const declared = level.stars.optimalSteps;
        if (declared !== 'auto' && declared < analysis.optimalSteps) {
          err(
            file.path,
            `optimalSteps ${declared} mustahil; solusi terpendek ${analysis.optimalSteps} kartu`,
          );
        } else if (declared !== 'auto' && declared > analysis.optimalSteps) {
          warnings.push(
            `${file.path}: optimalSteps ${declared} > solusi terpendek ${analysis.optimalSteps}; pertimbangkan "auto"`,
          );
        }
      }
      if (analysis.shortcut && analysis.flatSolution) {
        err(
          file.path,
          `jalan pintas: skill "${LOOP_SKILL}" bisa diselesaikan tanpa ulangi dengan ${analysis.flatSolution.cards} kartu`,
        );
      }
    }

    levels.push(level);
    const worldKey = `${level.tier} dunia ${level.world}`;
    byWorld.set(worldKey, [...(byWorld.get(worldKey) ?? []), level]);
  }

  // Komposisi fokus per dunia (A7 no. 5).
  for (const [world, list] of [...byWorld].sort(([a], [b]) => a.localeCompare(b))) {
    const problems = focusProblems(countFocus(list));
    if (problems.length === 0) continue;
    const msg = `${world}: komposisi fokus belum 4/3/3 — ${problems.join(', ')}`;
    (input.allowIncomplete ? warnings : errors).push(msg);
  }

  return { errors, warnings, levels, optimal };
}
