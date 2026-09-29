import { Inject, Injectable } from '@nestjs/common';
import { validateContent, type Level } from '@little-coder/engine';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module.js';
import { dialogs } from '../db/schema.js';

/** Validasi level memakai aturan yang sama dengan `pnpm validate:content` (skema + solver). */
@Injectable()
export class ContentService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Dialog Momo dari database (tabel `dialogs`, diisi `db:seed`; D-030). */
  private async dialogData(locale = 'id'): Promise<unknown> {
    const [row] = await this.db
      .select({ data: dialogs.data })
      .from(dialogs)
      .where(eq(dialogs.locale, locale));
    return row?.data ?? { lines: {} };
  }

  async validateLevel(data: unknown): Promise<{
    level?: Level;
    errors: string[];
    warnings: string[];
    optimalSteps?: number;
  }> {
    const dialog = await this.dialogData();
    const d = (data ?? {}) as { id?: string; tier?: string; world?: number };
    const path = `levels/${d.tier}/world-${d.world}/${d.id}.json`;
    const r = validateContent({
      levels: [{ path, data }],
      dialog: { path: 'dialog/momo.id.json', data: dialog },
      allowIncomplete: true,
    });
    const level = r.levels[0];
    return {
      ...(level && { level }),
      errors: r.errors.map((e) => e.replace(`${path}: `, '')),
      warnings: r.warnings.filter((w) => w.startsWith(path)).map((w) => w.replace(`${path}: `, '')),
      ...(level && r.optimal[level.id] && { optimalSteps: r.optimal[level.id]!.optimalSteps }),
    };
  }
}
