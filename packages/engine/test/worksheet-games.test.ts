import { describe, expect, it } from 'vitest';
import {
  buildWordSearch,
  carveMaze,
  catchReplay,
  checkAnswer,
  contestSafeTemplate,
  countWord,
  createRng,
  generateItem,
  GLYPHS,
  isLetterGlyph,
  lessonScreenSchema,
  groupStartCodes,
  levelStatuses,
  standaloneCodes,
  LETTER_GLYPH_IDS,
  mazeDeadEnds,
  mazeMove,
  mazeNeighbors,
  mazePath,
  mazeReplay,
  memoryReplay,
  publicItem,
  skillTemplateSchema,
  TRACE_START,
  traceStep,
  itemProblems,
  validateTemplate,
  WALL,
  wordSearchReplay,
  type FamilyName,
  type Interaction,
  type Item,
} from '../src/index.js';

/** Game & huruf vokal Worksheet PAUD (D-075). */
const tpl = (family: FamilyName, params: Record<string, unknown> = {}) =>
  skillTemplateSchema.parse({
    id: `worksheet.prek.z9.uji-${family}`,
    version: 1,
    domain: 'worksheet',
    grade: 'prek',
    category: 'Z',
    order: 9,
    title: 'Uji',
    tier: 'basic',
    family,
    params,
  });
const item = (family: FamilyName, params: Record<string, unknown> = {}, seed = 1) =>
  generateItem(tpl(family, params), { seed, band: 1 });
const taps = (cells: number[]) => cells.map((c) => `c${c}`);

describe('labirin', () => {
  it('labirin sempurna: semua kotak tersambung, tepat satu jalan (lorong = kotak − 1)', () => {
    for (let seed = 0; seed < 30; seed++) {
      const walls = carveMaze(createRng(seed), 5, 4);
      const m = { cols: 5, rows: 4, walls };
      let doors = 0;
      for (let c = 0; c < 20; c++) {
        doors += mazeNeighbors(m, c).length;
        expect(mazePath(m, 0, c).length).toBeGreaterThan(0);
      }
      expect(doors / 2).toBe(19);
    }
  });

  it('langkah lurus tanpa dinding; diagonal, dinding, dan tetap di tempat ditolak', () => {
    // 3×1 lorong terbuka, lalu dinding di antara kotak 1 dan 2.
    const open = {
      cols: 3,
      rows: 1,
      walls: [WALL.N | WALL.S | WALL.W, WALL.N | WALL.S, WALL.N | WALL.S | WALL.E],
    };
    expect(mazeMove(open, 0, 2)).toEqual([1, 2]);
    expect(mazeMove(open, 2, 0)).toEqual([1, 0]);
    expect(mazeMove(open, 0, 0)).toBeNull();
    expect(mazeMove(open, 0, 9)).toBeNull();
    const walled = {
      ...open,
      walls: [open.walls[0]!, open.walls[1]! | WALL.E, open.walls[2]! | WALL.W],
    };
    expect(mazeMove(walled, 0, 2)).toBeNull();
    const square = { cols: 2, rows: 2, walls: [0, 0, 0, 0] };
    expect(mazeMove(square, 0, 3)).toBeNull();
    expect(mazePath(walled, 0, 2)).toEqual([]);
  });

  it('putar ulang: jalan keluar = selesai; menabrak dinding = slip; melewati pintu berhenti di pintu', () => {
    const it = item('maze-path', { cols: [4, 4], rows: [4, 4] }, 3) as Item & {
      interaction: Extract<Interaction, { type: 'maze' }>;
    };
    const m = it.interaction;
    const path = mazePath(m, m.start, m.goal);
    expect(mazeReplay(m, taps(path.slice(1)))).toMatchObject({ done: true, slips: 0 });
    expect(checkAnswer(it, taps(path.slice(1))).correct).toBe(true);
    const bad = ['x', `c${m.start}`, ...taps(path.slice(1))];
    expect(mazeReplay(m, bad)).toMatchObject({ done: true, slips: 2 });
    expect(checkAnswer(it, taps(path.slice(1, -1))).correct).toBe(false);
    expect(checkAnswer(it, 'c1').correct).toBe(false);
    // Ketukan setelah keluar diabaikan.
    expect(mazeReplay(m, [...taps(path.slice(1)), `c${m.start}`]).pos).toBe(m.goal);
    // Langkah panjang menembus pintu keluar berhenti di pintu.
    const lane = { cols: 3, rows: 1, walls: [13, 5, 7], start: 0, goal: 1 };
    expect(mazeReplay(lane, ['c2'])).toMatchObject({ pos: 1, done: true, trail: [0, 1] });
  });

  it('huruf/angka di jalan keluar berurutan, pengecoh hanya di jalan buntu', () => {
    for (let seed = 0; seed < 40; seed++) {
      const it = item('maze-path', { decoys: [2, 3], mode: seed % 2 ? 'numbers' : 'vowels' }, seed);
      expect(itemProblems(it)).toEqual([]);
      const m = it.interaction as Extract<Interaction, { type: 'maze' }>;
      const ends = mazeDeadEnds(m);
      for (const d of m.marks.filter((x) => x.decoy)) expect(ends).toContain(d.cell);
      expect(m.marks.filter((x) => !x.decoy).at(-1)!.cell).toBe(m.goal);
    }
  });
});

describe('cari kata', () => {
  it('setiap kata muncul tepat sekali; kata yang tidak muat ditolak', () => {
    for (let seed = 0; seed < 30; seed++) {
      const b = buildWordSearch(createRng(seed), 5, 5, ['AYAM', 'IKAN', 'ULAR'])!;
      if (!b) continue;
      for (const w of b.placed) expect(countWord(b.letters, 5, 5, w.text)).toBe(1);
    }
    expect(buildWordSearch(createRng(1), 4, 4, ['SEMANGKA'])).toBeNull();
  });

  it('ketuk huruf berurutan → kata ketemu; huruf keliru = slip dan mulai lagi', () => {
    // A B . .
    // C . . .
    // D . . .
    const g = { cols: 4, rows: 3, letters: 'ABXXCXXXDXXX' };
    const words = ['AB', 'CD'];
    expect(wordSearchReplay(g, words, ['c0', 'c1', 'c4', 'c8'])).toMatchObject({
      found: ['AB', 'CD'],
      slips: 0,
      done: true,
    });
    // Ketukan ganda diabaikan; huruf yang salah mengulang pilihan; mulai dari huruf pertama kata lain.
    expect(
      wordSearchReplay(g, words, ['c0', 'c0', 'c5', 'c4', 'c8', 'x', 'c0', 'c1']),
    ).toMatchObject({
      slips: 2,
      done: true,
    });
    expect(wordSearchReplay(g, words, ['c0', 'c4', 'c8'])).toMatchObject({
      found: ['CD'],
      slips: 1,
    });
  });

  it('soal dari tema: valid, dan benar bila semua kata diketuk', () => {
    for (const theme of ['buah', 'hewan', 'angka', 'vokal'] as const) {
      for (let seed = 0; seed < 20; seed++) {
        const it = item('word-search', { theme, size: [4, 5] }, seed);
        expect(itemProblems(it)).toEqual([]);
        const ws = it.interaction as Extract<Interaction, { type: 'word-search' }>;
        expect(
          checkAnswer(
            it,
            ws.words.flatMap((w) => taps(w.cells)),
          ).correct,
        ).toBe(true);
        expect(checkAnswer(it, taps(ws.words[0]!.cells)).correct).toBe(ws.words.length === 1);
        expect(checkAnswer(it, 3).correct).toBe(false);
      }
    }
  });
});

describe('kartu pasangan', () => {
  const cards = [
    { id: 'a', pair: 'p' },
    { id: 'b', pair: 'q' },
    { id: 'c', pair: 'p' },
    { id: 'd', pair: 'q' },
  ];
  it('pasangan cocok tetap terbuka, meleset dihitung, kartu terbuka diketuk lagi diabaikan', () => {
    expect(memoryReplay(cards, ['a', 'c', 'b', 'd'])).toMatchObject({ misses: 0, done: true });
    expect(memoryReplay(cards, ['a', 'b', 'a', 'a', 'c', 'c', 'zz', 'b', 'd'])).toMatchObject({
      misses: 1,
      done: true,
    });
    expect(memoryReplay(cards, ['a', 'b'])).toMatchObject({ misses: 1, done: false });
  });

  it('semua mode valid; keliru dihitung bila kartu sudah pernah terlihat (D-078)', () => {
    for (const mode of ['numeral-count', 'letter-case', 'letter-picture'] as const)
      for (let seed = 0; seed < 20; seed++) {
        const it = item('memory-pairs', { mode, pairs: [2, 4], maxSlips: 1 }, seed);
        expect(itemProblems(it)).toEqual([]);
        const mem = it.interaction as Extract<Interaction, { type: 'memory' }>;
        const perfect = [...mem.cards]
          .sort((a, b) => a.pair.localeCompare(b.pair))
          .map((c) => c.id);
        expect(checkAnswer(it, perfect).correct).toBe(true);
        const a = mem.cards[0]!.id;
        const other = mem.cards.find((c) => c.pair !== mem.cards[0]!.pair)!.id;
        // Pertama kali meleset: wajar (belum pernah melihat). Mengulang pasangan yang sudah terlihat = keliru.
        const once = [a, other, a, other, ...perfect];
        expect(checkAnswer(it, once)).toMatchObject({ correct: true, points: 5, mistakes: 1 });
        const twice = [a, other, a, other, a, other, ...perfect];
        expect(checkAnswer(it, twice)).toMatchObject({ correct: false, points: 0 });
        expect(checkAnswer(it, 'k0').correct).toBe(false);
      }
  });
});

describe('tangkap', () => {
  it('yang tepat tertangkap, ketukan lain meleset', () => {
    expect(catchReplay(['a', 'b'], ['a', 'x', 'b'])).toEqual({
      caught: ['a', 'b'],
      slips: 1,
      done: true,
    });
  });

  it('semua mode valid; benar bila semua tertangkap', () => {
    for (const mode of ['numeral', 'letter', 'initial'] as const)
      for (let seed = 0; seed < 20; seed++) {
        const it = item('catch-items', { mode, letters: ['a', 'u'], maxSlips: 1 }, seed);
        expect(itemProblems(it)).toEqual([]);
        const c = it.interaction as Extract<Interaction, { type: 'catch' }>;
        expect(checkAnswer(it, c.answer).correct).toBe(true);
        const wrong = c.choices.filter((x) => !c.answer.includes(x.id)).map((x) => x.id);
        expect(checkAnswer(it, [...wrong, ...wrong, ...c.answer]).correct).toBe(
          wrong.length * 2 <= 1,
        );
        expect(checkAnswer(it, 1).correct).toBe(false);
      }
  });
});

describe('huruf vokal', () => {
  it('goresan huruf a i u e o / A I U E O tersedia', () => {
    for (const id of LETTER_GLYPH_IDS) {
      expect(isLetterGlyph(id)).toBe(true);
      expect(GLYPHS[id].strokes.length).toBeGreaterThan(0);
    }
    expect(isLetterGlyph('7')).toBe(false);
  });

  it('titik huruf i selesai cukup dengan disentuh', () => {
    const dot = GLYPHS.i.strokes[1]!;
    expect(traceStep(dot, TRACE_START, dot[0]!, 14).status).toBe('done');
    expect(traceStep(GLYPHS.i.strokes[0]!, TRACE_START, GLYPHS.i.strokes[0]![0]!, 14).status).toBe(
      'drawing',
    );
  });

  it('semua family huruf & game lolos 200 soal acak', () => {
    const cases: [FamilyName, Record<string, unknown>][] = [
      ['letter-trace', { letters: ['a', 'i'], case: 'both' }],
      [
        'letter-trace',
        { letters: ['u', 'e', 'o'], case: 'upper', guide: 'dotted', picture: false },
      ],
      ['letter-find', { mode: 'listen', letters: ['a', 'i'], pool: ['a', 'i'] }],
      ['letter-find', { mode: 'show', letters: ['u'], case: 'both', choices: [4, 4] }],
      ['letter-find', { mode: 'initial', letters: ['a', 'i', 'u', 'e', 'o'], case: 'upper' }],
      ['letter-find', { mode: 'picture', letters: ['e', 'o'], pool: ['a', 'i', 'u'] }],
      ['letter-find', { mode: 'picture', letters: ['a'] }],
      ['letter-find', { mode: 'case', letters: ['a', 'i', 'u', 'e', 'o'], pool: ['o', 'a'] }],
      ['letter-tap-all', { letters: ['a', 'i'], pool: ['a', 'i'] }],
      ['letter-tap-all', { letters: ['o'], case: 'upper', style: 'cards', tiles: [6, 8] }],
      ['maze-path', { mode: 'numbers', count: [3, 5], cols: [3, 5], rows: [3, 5] }],
      [
        'maze-path',
        { mode: 'vowels', letters: ['a', 'i', 'u'], case: 'lower', cols: [3, 3], rows: [3, 4] },
      ],
      ['word-search', { theme: 'angka', size: [4, 5], words: [1, 2] }],
      ['memory-pairs', { mode: 'numeral-count', values: [1, 10], pairs: [4, 5] }],
      ['catch-items', { mode: 'initial', letters: ['i'], pool: ['a', 'i'] }],
    ];
    for (const [family, params] of cases)
      expect(validateTemplate(tpl(family, params)), family).toEqual([]);
  });

  it('pilihan huruf berbeda-beda dan menyertakan jawaban; pengecoh bertanda', () => {
    for (let seed = 0; seed < 30; seed++) {
      const it = item('letter-find', { mode: 'initial', letters: ['a', 'i', 'u', 'e', 'o'] }, seed);
      const p = it.interaction as Extract<Interaction, { type: 'pick-one' }>;
      expect(p.choices.map((c) => c.id)).toContain('ans');
      expect(p.choices.filter((c) => c.id !== 'ans').every((c) => !!c.tag)).toBe(true);
      expect(checkAnswer(it, 'ans').correct).toBe(true);
    }
  });

  it('rentang/huruf yang tidak cukup ditolak dengan jelas', () => {
    expect(validateTemplate(tpl('memory-pairs', { values: [1, 2], pairs: [3, 3] }))).not.toEqual(
      [],
    );
    expect(
      validateTemplate(
        tpl('memory-pairs', { mode: 'letter-case', letters: ['a', 'i'], pairs: [3, 3] }),
      ),
    ).not.toEqual([]);
    expect(validateTemplate(tpl('catch-items', { values: [4, 4] }))).not.toEqual([]);
    expect(
      validateTemplate(tpl('letter-find', { mode: 'picture', letters: ['a'], pool: ['a'] })),
    ).not.toEqual([]);
    expect(
      validateTemplate(tpl('word-search', { theme: 'buah', size: [4, 4], words: [1, 1] })),
    ).toEqual([]);
  });
});

describe('lomba live', () => {
  it('kartu pasangan & tangkap tidak dipakai di lomba; labirin & cari kata aman tanpa letak kata', () => {
    expect(contestSafeTemplate(tpl('memory-pairs'))).toBe(false);
    expect(contestSafeTemplate(tpl('catch-items'))).toBe(false);
    expect(contestSafeTemplate(tpl('maze-path'))).toBe(true);
    expect(
      contestSafeTemplate(
        tpl('mix', { parts: [{ family: 'maze-path' }, { family: 'catch-items' }] }),
      ),
    ).toBe(false);
    expect(
      contestSafeTemplate(
        tpl('mix', { parts: [{ family: 'maze-path' }, { family: 'word-search' }] }),
      ),
    ).toBe(true);
    const ws = publicItem(item('word-search'));
    expect(ws.interaction.type).toBe('word-search');
    expect(JSON.stringify(ws.interaction)).not.toContain('"cells"');
    expect(publicItem(item('maze-path')).interaction.type).toBe('maze');
    expect(() => publicItem(item('memory-pairs'))).toThrow();
    expect(() => publicItem(item('catch-items'))).toThrow();
  });
});

describe('pelajaran huruf (P-BT-04/05)', () => {
  const ok = (s: Record<string, unknown>) =>
    lessonScreenSchema.safeParse({ teks: 'Halo', suara: 'Halo', ...s }).success;
  it('layar huruf: kenalan, bunyi, kata, coba tebal/cari', () => {
    expect(ok({ jenis: 'kenalan', huruf: ['a', 'i'] })).toBe(true);
    expect(ok({ jenis: 'bunyi', huruf: ['a'], gambar: ['ayam', 'apel'] })).toBe(true);
    expect(ok({ jenis: 'bunyi', huruf: ['a'] })).toBe(false);
    expect(
      ok({
        jenis: 'kata',
        kartu: [{ huruf: 'a', kata: 'ayam', sukuKata: 'a-yam', gambar: 'ayam' }],
      }),
    ).toBe(true);
    // Kata harus dimulai dengan hurufnya; kartu tidak boleh angka DAN huruf.
    expect(
      ok({
        jenis: 'kata',
        kartu: [{ huruf: 'i', kata: 'ayam', sukuKata: 'a-yam', gambar: 'ayam' }],
      }),
    ).toBe(false);
    expect(
      ok({
        jenis: 'kata',
        kartu: [{ angka: 1, huruf: 'a', kata: 'ayam', sukuKata: 'a-yam', gambar: 'ayam' }],
      }),
    ).toBe(false);
    expect(ok({ jenis: 'coba', mode: 'tebal', huruf: ['a', 'I'] })).toBe(true);
    expect(ok({ jenis: 'coba', mode: 'tebal', huruf: ['b'] })).toBe(false);
    expect(ok({ jenis: 'coba', mode: 'cari', huruf: ['u'] })).toBe(true);
    expect(ok({ jenis: 'coba', mode: 'cari', angka: [1] })).toBe(false);
    expect(ok({ jenis: 'coba', mode: 'hitung', huruf: ['a'], gambar: ['ayam'] })).toBe(false);
  });
});

describe('bagian (group) memulai rantai kunci baru', () => {
  const cats = [
    { code: 'A', group: 'Berhitung' },
    { code: 'B', group: 'Berhitung', standalone: true },
    { code: 'C', group: 'Baca Tulis' },
    { code: 'D', group: 'Baca Tulis' },
    { code: 'E', group: 'Baca Tulis', standalone: true },
  ];
  const nodes = cats.flatMap((c) =>
    [1, 2].map((order) => ({ id: `${c.code}${order}`, category: c.code, order })),
  );
  it('Baca Tulis terbuka sejak awal; D tetap menunggu Level 1 C', () => {
    expect([...groupStartCodes(cats)]).toEqual(['C']);
    const st = levelStatuses(
      cats.map((c) => c.code),
      nodes,
      {},
      standaloneCodes(cats),
      groupStartCodes(cats),
    );
    expect(st).toMatchObject({
      A1: 'open',
      A2: 'locked',
      B1: 'open',
      C1: 'open',
      D1: 'locked',
      E1: 'open',
    });
    // Tanpa bagian: perilaku lama (C menunggu A).
    expect(levelStatuses(['A', 'C'], nodes, {}).C1).toBe('locked');
    expect(groupStartCodes([{ code: 'A' }, { code: 'B', group: 'X', standalone: true }]).size).toBe(
      0,
    );
  });
});
