import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  average2,
  checkAnswer,
  contestInputSchema,
  contestPhase,
  entryDeadline,
  formatAverage,
  generateItem,
  publicItem,
  rankByAverage,
  rankContest,
  skillTemplateSchema,
  type Item,
} from '../src/index.js';

describe('peringkat rata-rata (D-042)', () => {
  it('rata-rata 2 desimal; sama → waktu tercepat; posisi berurutan', () => {
    expect(average2(2979, 30)).toBe(99.3);
    expect(average2(1000, 3)).toBe(333.33);
    expect(formatAverage(87.5)).toBe('87,50');
    const r = rankByAverage([
      { id: 'a', rounds: 3, scoreSum: 270, timeMs: 9000 },
      { id: 'b', rounds: 2, scoreSum: 180, timeMs: 5000 }, // 90.00, lebih cepat
      { id: 'c', rounds: 1, scoreSum: 100, timeMs: 99_000 },
      { id: 'd', rounds: 0, scoreSum: 0, timeMs: 0 }, // belum main → tidak masuk
    ]);
    expect(r.map((x) => [x.id, x.average, x.position])).toEqual([
      ['c', 100, 1],
      ['b', 90, 2],
      ['a', 90, 3],
    ]);
  });
});

describe('lomba live (D-042)', () => {
  const c = { startsAt: '2026-10-10T03:00:00Z', endsAt: '2026-10-10T05:00:00Z' };

  it('fase berdasarkan jam server; batas waktu peserta tidak melewati akhir lomba', () => {
    expect(contestPhase(c, new Date('2026-10-10T02:59:59Z'))).toBe('upcoming');
    expect(contestPhase(c, new Date('2026-10-10T03:00:00Z'))).toBe('live');
    expect(contestPhase(c, new Date('2026-10-10T05:00:00Z'))).toBe('ended');
    expect(entryDeadline(new Date('2026-10-10T03:10:00Z'), 30, c.endsAt).toISOString()).toBe(
      '2026-10-10T03:40:00.000Z',
    );
    expect(entryDeadline(new Date('2026-10-10T04:50:00Z'), 30, c.endsAt).toISOString()).toBe(
      '2026-10-10T05:00:00.000Z',
    );
  });

  it('skema: akhir setelah mulai, jumlah soal 5–50', () => {
    const base = {
      title: 'OSN MTK TK',
      domain: 'math',
      grade: 'tk',
      questionCount: 20,
      durationMinutes: 60,
      ...c,
    };
    expect(contestInputSchema.safeParse(base).success).toBe(true);
    expect(contestInputSchema.safeParse({ ...base, endsAt: c.startsAt }).success).toBe(false);
    expect(contestInputSchema.safeParse({ ...base, questionCount: 2 }).success).toBe(false);
  });

  it('soal publik tidak membawa kunci jawaban, pembahasan, atau label pengecoh', () => {
    // Template asli dari content/ — satu per jenis interaksi yang ditemukan.
    const root = new URL('../../../content/skills/', import.meta.url);
    const files = readdirSync(root, { recursive: true })
      .map(String)
      .filter((f) => f.endsWith('.json') && !f.split('/').pop()!.startsWith('_'));
    const byType = new Map<string, Item>();
    for (const f of files) {
      if (byType.size >= 8) break;
      const t = skillTemplateSchema.parse(JSON.parse(readFileSync(new URL(f, root), 'utf8')));
      for (const band of [0, 2]) {
        const it = generateItem(t, { seed: 11, band });
        if (!byType.has(it.interaction.type)) byType.set(it.interaction.type, it);
      }
    }
    const items = [...byType.values()];
    expect(items.length).toBeGreaterThanOrEqual(6);
    for (const it of items) {
      const pub = publicItem(it) as unknown as Record<string, unknown>;
      const json = JSON.stringify(pub);
      expect(json).not.toContain('"answer"');
      expect(json).not.toContain('"reteach"');
      expect(json).not.toContain('"tag"');
      expect(pub.prompt).toBe(it.prompt);
    }
  });

  it('pilihan kartu tetap utuh (id sama) sehingga jawaban dinilai server dengan checkAnswer', () => {
    const it: Item = {
      skillId: 's',
      version: 1,
      seed: 3,
      band: 0,
      prompt: 'Urutkan',
      stimulus: [],
      interaction: {
        type: 'order',
        choices: ['a', 'b', 'c', 'd'].map((id) => ({
          id,
          visual: { kind: 'numeral', value: 1 } as never,
          tag: 'x',
        })),
        answer: ['a', 'b', 'c', 'd'],
      },
      reteach: { say: 'a b c d' },
    };
    const pub = publicItem(it);
    expect(pub.interaction.type).toBe('order');
    const ids = (pub.interaction as { choices: { id: string }[] }).choices.map((x) => x.id);
    expect([...ids].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(checkAnswer(it, ['a', 'b', 'c', 'd']).correct).toBe(true);
    expect(checkAnswer(it, ids).correct).toBe(ids.join() === 'a,b,c,d');
  });

  it('peringkat lomba: benar terbanyak → waktu tercepat → selesai lebih dulu', () => {
    const r = rankContest([
      { id: 'a', correct: 18, total: 20, timeMs: 600_000, finishedAt: 3 },
      { id: 'b', correct: 18, total: 20, timeMs: 500_000, finishedAt: 5 },
      { id: 'c', correct: 19, total: 20, timeMs: 900_000, finishedAt: 9 },
      { id: 'd', correct: 18, total: 20, timeMs: 500_000, finishedAt: 4 },
    ]);
    expect(r.map((x) => [x.id, x.position, x.score])).toEqual([
      ['c', 1, 95],
      ['d', 2, 90],
      ['b', 3, 90],
      ['a', 4, 90],
    ]);
  });
});
