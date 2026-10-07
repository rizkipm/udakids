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
  rating2,
  rankContest,
  skillTemplateSchema,
  type Item,
} from '../src/index.js';

describe('peringkat rata-rata tertimbang (D-042, D-045)', () => {
  it('rata-rata & nilai peringkat 2 desimal', () => {
    expect(average2(2979, 30)).toBe(99.3);
    expect(average2(1000, 3)).toBe(333.33);
    expect(formatAverage(87.5)).toBe('87,50');
    // 1 ronde 100 → (100 + 5×70) / 6
    expect(rating2(100, 1)).toBe(75);
    expect(rating2(0, 0)).toBe(0);
    // Makin banyak ronde, makin dekat ke rata-rata asli.
    expect(rating2(95 * 100, 100)).toBeCloseTo(93.81, 2);
  });

  it('1 ronde bernilai 100 tidak mengalahkan banyak ronde yang konsisten (data produksi 2026-10-03)', () => {
    const rows = [
      { id: 'Yasmine', rounds: 1, scoreSum: 100, timeMs: 174_000 },
      { id: 'Vincent', rounds: 6, scoreSum: 600, timeMs: 84_000 },
      { id: 'Kay', rounds: 7, scoreSum: 690, timeMs: 210_000 },
      { id: 'Uwais', rounds: 17, scoreSum: 1650, timeMs: 684_000 },
      { id: 'Maryam', rounds: 82, scoreSum: 7760, timeMs: 4_350_000 },
      { id: 'Aim', rounds: 111, scoreSum: 9930, timeMs: 9_930_000 },
      { id: 'Alma', rounds: 1, scoreSum: 50, timeMs: 42_000 },
      { id: 'baru', rounds: 0, scoreSum: 0, timeMs: 0 }, // belum main → tidak masuk
    ];
    expect(rankByAverage(rows).map((x) => x.id)).toEqual([
      'Maryam',
      'Uwais',
      'Aim',
      'Kay',
      'Vincent',
      'Yasmine',
      'Alma',
    ]);
  });

  it('nilai peringkat sama → rata-rata asli → waktu tercepat; posisi berurutan', () => {
    const r = rankByAverage([
      { id: 'a', rounds: 2, scoreSum: 180, timeMs: 9000 },
      { id: 'b', rounds: 2, scoreSum: 180, timeMs: 5000 }, // sama, lebih cepat
      { id: 'c', rounds: 1, scoreSum: 100, timeMs: 1000 },
    ]);
    expect(r.map((x) => [x.id, x.rating, x.average, x.position])).toEqual([
      ['b', 75.71, 90, 1],
      ['a', 75.71, 90, 2],
      ['c', 75, 100, 3],
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
      if (t.family === 'mock') continue; // mock test (D-072) tidak membuat soal sendiri
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
    // Memindai seluruh content/ (ribuan skill) — butuh waktu lebih dari batas bawaan 5 detik.
  }, 30_000);

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
