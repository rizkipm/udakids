import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  bubblesReplay,
  checkAnswer,
  clearReplay,
  clearSolution,
  clockMinutes,
  clockValue,
  generateItem,
  gridTargetsReplay,
  isPrime,
  pizzaCount,
  questReplay,
  roundTo,
  skillTemplateSchema,
  tensParts,
  tensValue,
  voiceItemText,
  type Item,
} from '../src/index.js';
import { timeSay } from '../src/generator/families/arena.js';

/** Arena game Momo (D-115): penilaian dari ketukan/nilai, sama di web dan server. */
describe('Arena game Momo: logika murni', () => {
  it('ronde: berurutan, ketukan keliru dihitung', () => {
    const rounds = [
      { id: 'r0', answer: 'n3' },
      { id: 'r1', answer: 'n5' },
    ];
    expect(questReplay(rounds, ['r0:n3', 'r1:n5'])).toMatchObject({ slips: 0, done: true });
    expect(questReplay(rounds, ['r0:n4', 'r0:n3', 'r1:n5'])).toMatchObject({
      slips: 1,
      done: true,
    });
    // Jawaban ronde berikutnya sebelum waktunya = keliru.
    expect(questReplay(rounds, ['r1:n5'])).toMatchObject({ slips: 1, solved: 0 });
  });

  it('gelembung: urut; pengecoh keliru; gelembung yang sudah pecah diabaikan', () => {
    const ans = ['b2', 'b4', 'b6'];
    expect(bubblesReplay(ans, ['b2', 'b4', 'b6'])).toMatchObject({ slips: 0, done: true });
    expect(bubblesReplay(ans, ['b2', 'b3', 'b2', 'b4', 'b6'])).toMatchObject({
      slips: 1,
      done: true,
    });
    expect(bubblesReplay(ans, ['b4'])).toMatchObject({ slips: 1, popped: 0 });
  });

  it('papan sasaran: urutan bebas, sel lain keliru', () => {
    expect(gridTargetsReplay(['c5', 'c10'], ['c10', 'c7', 'c5'])).toMatchObject({
      slips: 1,
      done: true,
    });
  });

  it('bersihkan papan: pasangan tepat hilang, pasangan lain keliru, ketuk ulang = batal', () => {
    const it2 = {
      op: '+' as const,
      target: 10,
      tiles: [
        { id: 't0', value: 3 },
        { id: 't1', value: 7 },
        { id: 't2', value: 4 },
        { id: 't3', value: 6 },
      ],
    };
    expect(clearReplay(it2, ['t0', 't1', 't2', 't3'])).toMatchObject({ slips: 0, done: true });
    expect(clearReplay(it2, ['t0', 't2', 't0', 't0', 't1'])).toMatchObject({
      slips: 1,
      cleared: [],
      pending: 't1',
    });
    expect(clearReplay(it2, clearSolution(it2)).done).toBe(true);
    const mul = { op: '×' as const, target: 12, tiles: [...it2.tiles] };
    // 4 × 3 = 12 hilang; 7 × 6 bukan 12 = keliru.
    expect(clearReplay(mul, ['t2', 't0', 't1', 't3'])).toMatchObject({
      cleared: ['t2', 't0'],
      slips: 1,
    });
  });

  it('nilai tempat, jam, pizza, prima, pembulatan', () => {
    expect(tensValue(['puluh', 'satu'], { puluh: '3', satu: '7' })).toBe(37);
    // Maks. 9 per bagian; bagian yang bukan soal ditolak.
    expect(tensValue(['puluh', 'satu'], { puluh: '2', satu: '17' })).toBeUndefined();
    expect(tensValue(['puluh', 'satu'], { ratus: '1' })).toBeUndefined();
    expect(tensParts(4058, ['ribu', 'ratus', 'puluh', 'satu'])).toEqual({
      ribu: '4',
      ratus: '0',
      puluh: '5',
      satu: '8',
    });
    expect(clockMinutes(clockValue(12, 5))).toBe(5);
    expect(clockValue(13, 0)).toBe('1:00');
    expect(clockMinutes('13:00')).toBeUndefined();
    expect(pizzaCount({ wholes: 2, parts: 4 }, ['w0s0', 'w1s3'])).toBe(2);
    expect(pizzaCount({ wholes: 2, parts: 4 }, ['w0s0', 'w0s0'])).toBeUndefined();
    expect(pizzaCount({ wholes: 2, parts: 4 }, ['w2s0'])).toBeUndefined();
    expect([1, 2, 9, 13, 91, 97].map(isPrime)).toEqual([false, true, false, true, false, true]);
    expect([roundTo(45, 10), roundTo(44, 10), roundTo(1450, 100)]).toEqual([50, 40, 1500]);
  });

  it('cara membaca jam (Bahasa Indonesia)', () => {
    expect(timeSay(7, 0)).toBe('pukul tujuh tepat');
    expect(timeSay(7, 30)).toBe('pukul setengah delapan');
    expect(timeSay(12, 45)).toBe('pukul satu kurang seperempat');
    expect(timeSay(3, 50)).toBe('pukul empat kurang sepuluh menit');
    expect(timeSay(15, 40, true)).toBe('pukul lima belas lewat empat puluh menit');
  });
});

describe('Arena game Momo di content/ (D-115)', () => {
  const root = new URL('../../../content/skills/math/', import.meta.url);
  const levels = readdirSync(root, { recursive: true })
    .map(String)
    .filter((f) => /(^|\/)GX\d\d-[^/]+\.json$/.test(f))
    .sort();

  it('PAUD, TK, Kelas 1–4: masing-masing 10 level', () => {
    const books = new Map<string, number>();
    for (const f of levels) books.set(f.split('/')[0]!, (books.get(f.split('/')[0]!) ?? 0) + 1);
    expect(Object.fromEntries(books)).toEqual({
      prek: 10,
      tk: 10,
      sd1: 10,
      sd2: 10,
      sd3: 10,
      sd4: 10,
    });
  });

  // Suara kartu diambil server lewat id (soal dibuat ulang dari skill + seed): id yang sama harus berkalimat sama.
  it('setiap kalimat ronde/panggilan/kartu terjangkau lewat id-nya; jawaban benar diterima', () => {
    for (const f of levels) {
      const t = skillTemplateSchema.parse(JSON.parse(readFileSync(new URL(f, root), 'utf8')));
      for (let seed = 0; seed < 12; seed++) {
        const item: Item = generateItem(t, { seed, band: seed % 3 });
        const it = item.interaction;
        const cards: { id: string; say?: string }[] =
          it.type === 'quest'
            ? [
                ...it.rounds.map((r) => ({ id: r.id, say: r.say })),
                ...it.rounds.flatMap((r) => r.choices),
              ]
            : it.type === 'bubbles'
              ? it.bubbles
              : it.type === 'clear'
                ? it.tiles
                : it.type === 'grid'
                  ? (it.calls ?? [])
                  : [];
        for (const c of cards)
          expect(voiceItemText(item, 'choice', c.id), `${f} ${c.id}`).toBe(c.say);
        expect(item.say ?? item.prompt, f).not.toMatch(/\{\w+\}/);
        // Basic (PAUD/TK): pertanyaan ronde tidak ditulis (anak belum membaca).
        if (t.tier === 'basic' && it.type === 'quest')
          expect(
            it.rounds.every((r) => r.text === ''),
            f,
          ).toBe(true);
        const answer =
          it.type === 'quest'
            ? it.rounds.map((r) => `${r.id}:${r.answer}`)
            : it.type === 'bubbles'
              ? it.answer
              : it.type === 'grid'
                ? (it.calls?.map((c) => c.answer) ?? it.targets!)
                : it.type === 'clear'
                  ? clearSolution(it)
                  : it.type === 'tens'
                    ? tensParts(it.target, it.places)
                    : it.type === 'clock'
                      ? clockValue(it.hour, it.minute)
                      : it.type === 'pizza'
                        ? Array.from(
                            { length: it.target },
                            (_, i) => `w${Math.floor(i / it.parts)}s${i % it.parts}`,
                          )
                        : undefined;
        expect(answer, `${f}: ${it.type}`).toBeDefined();
        expect(checkAnswer(item, answer!), f).toMatchObject({ correct: true, points: 10 });
      }
    }
  }, 60_000);
});
