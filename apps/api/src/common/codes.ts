import { FAMILY_CODE_ALPHABET, FAMILY_CODE_LENGTH } from '@little-coder/engine';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/db.module.js';
import { children, classes, parents } from '../db/schema.js';
import { randomCode } from './crypto.js';

/**
 * Kode keluarga & kode kelas memakai format yang sama dan dimasukkan di kolom yang sama saat anak
 * masuk (D-025), jadi harus unik di semua tabel — termasuk kode milik anak yang daftar sendiri (D-037).
 */
export async function uniqueEntryCode(db: Pick<Db, 'select'>): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = randomCode(FAMILY_CODE_LENGTH, FAMILY_CODE_ALPHABET);
    const [p] = await db
      .select({ id: parents.id })
      .from(parents)
      .where(eq(parents.familyCode, code));
    const [c] = await db.select({ id: classes.id }).from(classes).where(eq(classes.code, code));
    const [k] = await db
      .select({ id: children.id })
      .from(children)
      .where(eq(children.selfCode, code));
    if (!p && !c && !k) return code;
  }
  throw new Error('gagal membuat kode unik');
}
