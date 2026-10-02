import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildContestItems,
  checkAnswer,
  checkContestAnswer,
  contestBand,
  contestEntryStatus,
  contestPublicItem,
  contestTimeMs,
  CONTEST_GRACE_MS,
  maskIds,
  planContestSkills,
  skillTemplateSchema,
  type AnswerValue,
  type ContestItem,
  type SkillTemplate,
} from '../src/index.js';

const root = new URL('../../../content/skills/', import.meta.url);
const templates: SkillTemplate[] = readdirSync(root, { recursive: true })
  .map(String)
  .filter((f) => f.endsWith('.json') && !f.split('/').pop()!.startsWith('_'))
  .map((f) => skillTemplateSchema.parse(JSON.parse(readFileSync(new URL(f, root), 'utf8'))));
const book = (domain: string, grade: string) =>
  templates.filter((t) => t.domain === domain && t.grade === grade && t.status === 'active');

/** Jawaban benar dalam bentuk id samaran (seperti yang dikirim perangkat). */
function maskedAnswer(item: ContestItem): AnswerValue {
  const m = maskIds(item);
  const to = (s: string) => m.get(s)!;
  const it = item.interaction;
  switch (it.type) {
    case 'pick-one':
      return to(it.answer);
    case 'tap-all':
    case 'order':
      return it.answer.map(to);
    case 'group':
    case 'match':
      return Object.fromEntries(Object.entries(it.answer).map(([k, v]) => [to(k), to(v)]));
    case 'build':
      return it.target;
    case 'number-line':
    case 'number-input':
      return it.answer;
  }
}

describe('soal lomba (D-042)', () => {
  it('band mudah → sulit untuk jumlah soal berapa pun', () => {
    expect(Array.from({ length: 10 }, (_, i) => contestBand(i, 10))).toEqual([
      0, 0, 0, 1, 1, 1, 1, 2, 2, 2,
    ]);
    const b20 = Array.from({ length: 20 }, (_, i) => contestBand(i, 20));
    expect(b20[0]).toBe(0);
    expect(b20[19]).toBe(2);
    expect([...b20].sort()).toEqual(b20);
    expect(contestBand(0, 0)).toBe(0);
    expect(contestBand(99, 5)).toBe(2);
  });

  it('skill tersebar merata ke semua topik dan deterministik per seed', () => {
    const skills = [
      { id: 'a1', category: 'A', order: 1 },
      { id: 'a2', category: 'A', order: 2 },
      { id: 'a3', category: 'A', order: 3 },
      { id: 'b1', category: 'B', order: 1 },
      { id: 'c1', category: 'C', order: 1 },
    ];
    const plan = planContestSkills(skills, 9, 's1');
    expect(plan).toHaveLength(9);
    const per = (c: string) => plan.filter((id) => id.startsWith(c.toLowerCase())).length;
    expect([per('A'), per('B'), per('C')]).toEqual([3, 3, 3]);
    // Skill di topik A tidak diulang sebelum semuanya terpakai.
    expect(new Set(plan.filter((id) => id.startsWith('a'))).size).toBe(3);
    expect(planContestSkills(skills, 9, 's1')).toEqual(plan);
    expect(planContestSkills([], 5, 'x')).toEqual([]);
    expect(planContestSkills(skills, 0, 'x')).toEqual([]);
  });

  it('soal dibuat dari buku nyata: jumlah pas, tanpa kembar, seed beda → soal beda', () => {
    const tk = book('math', 'tk');
    expect(tk.length).toBeGreaterThan(3);
    const a = buildContestItems(tk, 20, 'seed-a');
    expect(a).toHaveLength(20);
    expect(a[0]!.band).toBe(0);
    expect(a[19]!.band).toBe(2);
    expect(a.every((x) => x.key.length > 0 && x.tier)).toBe(true);
    expect(buildContestItems(tk, 20, 'seed-a')).toEqual(a);
    const b = buildContestItems(tk, 20, 'seed-b');
    expect(JSON.stringify(b)).not.toBe(JSON.stringify(a));
    const topics = new Set(a.map((x) => tk.find((t) => t.id === x.skillId)!.category));
    expect(topics.size).toBeGreaterThan(1);
  });

  it('soal publik: tanpa kunci, id pilihan disamarkan; jawaban samaran dinilai benar di server', () => {
    const items = [
      ...buildContestItems(book('math', 'tk'), 30, 'p1'),
      ...buildContestItems(book('literasi', 'tk'), 30, 'p2'),
      ...buildContestItems(book('math', 'sd34'), 30, 'p3'),
    ];
    const types = new Set<string>();
    for (const item of items) {
      types.add(item.interaction.type);
      const pub = contestPublicItem(item);
      const json = JSON.stringify(pub);
      for (const k of ['"answer"', '"reteach"', '"tag"', '"skillId"', '"seed"', '"key"'])
        expect(json).not.toContain(k);
      // Tidak ada id asli yang terlihat di perangkat.
      const masked = maskIds(item);
      for (const [orig, m] of masked) {
        expect(m).toMatch(/^k[0-9a-z]+$/);
        expect(json).not.toContain(`"id":"${orig}"`);
      }
      expect(checkContestAnswer(item, maskedAnswer(item) as never)).toBe(true);
    }
    expect(types.size).toBeGreaterThanOrEqual(3);
  });

  it('jawaban dengan id asli / id tak dikenal tidak dihitung benar', () => {
    const item = buildContestItems(book('math', 'tk'), 30, 'q').find(
      (x) => x.interaction.type === 'pick-one',
    )!;
    const it = item.interaction as Extract<ContestItem['interaction'], { type: 'pick-one' }>;
    expect(checkAnswer(item, it.answer).correct).toBe(true);
    expect(checkContestAnswer(item, it.answer)).toBe(false);
    expect(checkContestAnswer(item, 'kzzzz')).toBe(false);
    expect(checkContestAnswer(item, ['x'])).toBe(false);
    expect(checkContestAnswer(item, { a: 'b' })).toBe(false);
    expect(checkContestAnswer(item, 3)).toBe(false);
  });

  it('lama pengerjaan tidak melewati batas waktu; status menurut jam server', () => {
    const startedAt = new Date('2026-10-10T03:00:00Z');
    const deadlineAt = new Date('2026-10-10T03:30:00Z');
    const at = (m: number) => new Date(startedAt.getTime() + m * 60_000);
    expect(
      contestTimeMs({ startedAt, deadlineAt, submittedAt: at(10), lastAnswerAt: at(9) }).timeMs,
    ).toBe(600_000);
    expect(
      contestTimeMs({ startedAt, deadlineAt, submittedAt: null, lastAnswerAt: at(20) }).timeMs,
    ).toBe(1_200_000);
    expect(
      contestTimeMs({ startedAt, deadlineAt, submittedAt: at(31), lastAnswerAt: null }).timeMs,
    ).toBe(1_800_000);
    expect(
      contestTimeMs({ startedAt, deadlineAt, submittedAt: null, lastAnswerAt: null }).timeMs,
    ).toBe(1_800_000);

    expect(contestEntryStatus(null, at(1))).toBe('none');
    expect(contestEntryStatus({ deadlineAt, submittedAt: null }, at(29))).toBe('active');
    expect(
      contestEntryStatus(
        { deadlineAt, submittedAt: null },
        new Date(deadlineAt.getTime() + CONTEST_GRACE_MS - 1),
      ),
    ).toBe('active');
    expect(contestEntryStatus({ deadlineAt, submittedAt: null }, at(31))).toBe('done');
    expect(contestEntryStatus({ deadlineAt, submittedAt: at(5) }, at(6))).toBe('done');
  });
});
