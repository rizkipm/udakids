import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { aiImageRequestSchema, catalogSchema } from '@little-coder/engine';
import { simPhotoRequests } from '../src/cli/sim-photos.js';

describe('foto simulasi (D-088)', () => {
  const sim = catalogSchema
    .parse(
      JSON.parse(
        readFileSync(
          join(import.meta.dirname, '..', '..', '..', 'content/skills/sains/tkosn/_catalog.json'),
          'utf8',
        ),
      ),
    )
    .categories.find((c) => c.code === 'H')!.lesson!.layar[0]!.simulasi!;

  it('satu permintaan foto realistis per subjek: foto utama, bagian, contoh, kegiatan', () => {
    const reqs = simPhotoRequests(sim);
    expect(reqs).toHaveLength(17);
    expect(new Set(reqs.map((r) => r.subject)).size).toBe(17);
    for (const r of reqs) {
      expect(r.style).toBe('foto');
      expect(aiImageRequestSchema.safeParse(r).success, r.subject).toBe(true);
    }
    expect(reqs[0]).toMatchObject({ kind: 'character', subject: 'foto-anak-berdiri' });
    expect(reqs.find((r) => r.subject === 'foto-kegiatan-makan-apel')?.kind).toBe('scene');
  });
});
