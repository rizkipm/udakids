import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { VOICE_LINE_KEYS } from '@little-coder/engine';

const ROOT = join(import.meta.dirname, '..');
const dirs: string[] = [];

/** Buat folder konten sementara berisi satu level grid dunia 2. */
function contentDir(level: Record<string, unknown>) {
  const dir = mkdtempSync(join(tmpdir(), 'lc-content-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'levels/basic/world-2'), { recursive: true });
  mkdirSync(join(dir, 'dialog'));
  writeFileSync(
    join(dir, 'dialog/momo.id.json'),
    JSON.stringify({
      lang: 'id',
      lines: {
        vo_intro: { text: 'Halo' },
        vo_success: { text: 'Hore' },
        // Kalimat suara Momo wajib ada (D-035).
        ...Object.fromEntries(VOICE_LINE_KEYS.map((k) => [k, { text: k }])),
      },
    }),
  );
  const data = {
    id: 'w2-l01',
    version: 1,
    tier: 'basic',
    world: 2,
    index: 1,
    role: 'intro',
    focus: 'logic',
    skills: ['direction-fixed'],
    type: 'grid-move',
    grid: { w: 3, h: 3 },
    start: { x: 0, y: 0, facing: 'right' },
    goal: { x: 2, y: 0 },
    palette: ['up', 'down', 'left', 'right'],
    maxCards: 4,
    story: { intro: 'vo_intro', success: 'vo_success' },
    ...level,
  };
  writeFileSync(join(dir, 'levels/basic/world-2/w2-l01.json'), JSON.stringify(data));
  return dir;
}

function validate(dir: string, ...flags: string[]) {
  return spawnSync(
    'node',
    [
      '--import',
      'tsx',
      '--conditions=source',
      'scripts/validate-content.ts',
      '--content',
      dir,
      '--allow-incomplete',
      ...flags,
    ],
    { cwd: ROOT, encoding: 'utf8' },
  );
}

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('pnpm validate:content', () => {
  it('exit 0 dan menulis .generated/optimal.json untuk level valid', () => {
    const dir = contentDir({});
    const res = validate(dir);
    expect(res.status, res.stderr).toBe(0);
    expect(JSON.parse(readFileSync(join(dir, '.generated/optimal.json'), 'utf8'))).toEqual({
      'w2-l01': { version: 1, optimalSteps: 2 },
    });
  });

  it('exit ≠ 0 untuk level yang tidak bisa diselesaikan', () => {
    const dir = contentDir({
      grid: {
        w: 3,
        h: 3,
        walls: [
          [1, 0],
          [1, 1],
          [1, 2],
        ],
      },
    });
    const res = validate(dir);
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/tidak bisa diselesaikan dalam maxCards = 4/);
    expect(existsSync(join(dir, '.generated'))).toBe(false);
  });

  it('exit ≠ 0 untuk JSON rusak; --no-write tidak menulis file', () => {
    const dir = contentDir({});
    writeFileSync(join(dir, 'levels/basic/world-2/w2-l02.json'), '{ rusak');
    expect(validate(dir).status).toBe(1);
    const ok = contentDir({});
    expect(validate(ok, '--no-write').status).toBe(0);
    expect(existsSync(join(ok, '.generated'))).toBe(false);
  });
});
