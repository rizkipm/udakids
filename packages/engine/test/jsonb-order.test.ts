import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateItem, skillTemplateSchema } from '../src/index.js';

/**
 * Skill dibaca dari PostgreSQL jsonb, yang mengurutkan ulang kunci objek (yang pendek dulu, lalu abjad). Semua
 * skill di content/ harus tetap bisa dibuat soalnya dengan urutan kunci itu (bug "variabel tidak dikenal pi").
 */
const ROOT = join(import.meta.dirname, '..', '..', '..', 'content', 'skills');
const jsonbOrder = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(jsonbOrder);
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, x]) => [k, jsonbOrder(x)]),
    );
  return v;
};

describe('skill tetap jalan dengan urutan kunci jsonb', () => {
  const files = readdirSync(ROOT, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.json') && !e.name.startsWith('_'))
    .map((e) => join(e.parentPath, e.name));

  it('semua skill dengan variabel turunan', () => {
    const broken: string[] = [];
    let checked = 0;
    for (const f of files) {
      const raw = JSON.parse(readFileSync(f, 'utf8'));
      if (!JSON.stringify(raw.params ?? {}).includes('"derived"')) continue;
      checked++;
      const t = skillTemplateSchema.parse(jsonbOrder(raw));
      try {
        for (let seed = 0; seed < 12; seed++) generateItem(t, { seed, band: seed % 3 });
      } catch (err) {
        broken.push(`${raw.id}: ${(err as Error).message}`);
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(broken).toEqual([]);
    // Memeriksa ribuan skill; dengan coverage bisa melewati batas bawaan 5 detik.
  }, 60_000);
});
