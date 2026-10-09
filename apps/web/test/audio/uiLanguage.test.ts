import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { langSegments } from '@little-coder/engine';
import { describe, expect, it } from 'vitest';

/**
 * Semua teks antarmuka berbahasa Indonesia; bila dibacakan lewat `speak()` (tanpa bahasa eksplisit) tebakan
 * bahasanya harus Indonesia — bukan suara British yang membaca kalimat Indonesia (D-098, D-106).
 */
const DIR = join(import.meta.dirname, '../../src/i18n/id');
/** Teks yang dibacakan di area anak (admin/landing tidak memakai suara Momo). */
const SPOKEN = ['play.json', 'rank.json', 'contest.json', 'common.json'];
/** Teks yang memang English (nama mata pelajaran/kalimat English sengaja). Kosongkan bila bisa. */
const INTENTIONAL_EN = new Set<string>([]);

describe('bahasa suara teks antarmuka (D-106)', () => {
  for (const file of SPOKEN) {
    it(`${file}: tidak ada teks yang dibacakan suara British`, () => {
      const dict = JSON.parse(readFileSync(join(DIR, file), 'utf8')) as Record<string, string>;
      const english = Object.entries(dict)
        .filter(([k]) => !INTENTIONAL_EN.has(`${file}:${k}`))
        .filter(([, v]) => langSegments(v.replace(/\{\w+\}/g, '5')).some((s) => s.lang !== 'id-ID'))
        .map(([k, v]) => `${k}: ${v}`);
      expect(english).toEqual([]);
    });
  }
});
