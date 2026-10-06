import { describe, expect, it } from 'vitest';
import {
  checkAnswer,
  EN_NUMBERS,
  EN_WORDS,
  enSentence,
  generateItem,
  itemFingerprint,
  OBJECTS,
  skillTemplateSchema,
  voiceProfileOf,
  type Item,
} from '../src/index.js';
import { plural } from '../src/generator/families/english.js';

const skill = (family: string, params: Record<string, unknown>) =>
  skillTemplateSchema.parse({
    id: 'english.tkosn.a1.uji',
    version: 1,
    domain: 'english',
    grade: 'tkosn',
    category: 'A',
    order: 1,
    title: 'Skill uji',
    tier: 'basic',
    family,
    params,
  });
const many = (family: string, params: Record<string, unknown>, n = 90): Item[] =>
  Array.from({ length: n }, (_, i) =>
    generateItem(skill(family, params), { seed: i, band: i % 3 }),
  );
const rightValue = (item: Item) => {
  const it = item.interaction;
  if (it.type === 'pick-one' || it.type === 'tap-all' || it.type === 'order') return it.answer;
  throw new Error(it.type);
};

describe('kosakata English TK Olimpiade (D-071)', () => {
  it('setiap kata punya gambar yang ada dan unik per topik', () => {
    const seen = new Set<string>();
    for (const w of EN_WORDS) {
      if (w.pic.kind === 'object') expect(w.pic.object in OBJECTS, w.word).toBe(true);
      const key = `${w.topic}/${w.word}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
    expect(EN_WORDS.filter((w) => w.topic === 'person').every((w) => w.pronoun)).toBe(true);
  });

  it('kalimat contoh & bentuk jamak', () => {
    const word = (x: string) => EN_WORDS.find((w) => w.word === x)!;
    expect(enSentence(word('fish'))).toBe('I like my fish.');
    expect(enSentence(word('apple'))).toBe('I eat an apple.');
    expect(enSentence(word('sunny'))).toBe('It is sunny today.');
    expect(enSentence(word('girl'))).toBe('This is a girl.');
    expect(enSentence(word('mother'))).toBe('This is my mother.');
    expect(enSentence(word('scissors'))).toBe('These are scissors.');
    expect(plural('mouse', 3)).toBe('mice');
    expect(plural('cat', 1)).toBe('cat');
    expect(plural('cat', 2)).toBe('cats');
    expect(EN_NUMBERS[20]).toBe('twenty');
  });
});

describe('english-word', () => {
  for (const mode of ['pick-word', 'pick-picture', 'listen', 'spell', 'sort'] as const) {
    it(`${mode}: jawaban benar diterima, bervariasi`, () => {
      const items = many('english-word', {
        topics: ['animal', 'fruit', 'classroom'],
        mode,
        choices: 4,
        blanks: [1, 3],
      });
      for (const item of items) expect(checkAnswer(item, rightValue(item)).correct).toBe(true);
      expect(new Set(items.map(itemFingerprint)).size).toBeGreaterThan(40);
    });
  }

  it('pick-word: gambar soal sesuai jawaban, pengecoh dari topik sama', () => {
    for (const item of many('english-word', { topics: ['animal'], mode: 'pick-word' })) {
      const it = item.interaction;
      if (it.type !== 'pick-one') throw new Error();
      const right = it.choices.find((c) => c.id === it.answer)!;
      const word = EN_WORDS.find(
        (w) => w.word.toUpperCase() === (right.visual as { text: string }).text,
      )!;
      expect(word.topic).toBe('animal');
      expect(item.stimulus[0]).toMatchObject({
        kind: 'object',
        object: (word.pic as { object: string }).object,
      });
    }
  });

  it('spell: huruf pertama selalu tampil; kotak kosong = banyak huruf yang hilang', () => {
    for (const item of many('english-word', {
      topics: ['animal'],
      mode: 'spell',
      blanks: [1, 3],
    })) {
      const letters = item.stimulus.find((v) => v.kind === 'letters') as { letters: string[] };
      expect(letters.letters[0]).not.toBe('');
      const blanks = letters.letters.filter((l) => l === '').length;
      const it = item.interaction;
      expect(it.type === 'order' ? it.answer.length : 1).toBe(blanks);
      expect(item.say).not.toMatch(/\b(cat|dog|rabbit|elephant|tiger)\b/);
    }
  });

  it('tap-same untuk bangun datar & body parts tidak bisa dikelompokkan', () => {
    for (const item of many('english-word', { topics: ['shape'], mode: 'tap-same' }, 30))
      expect(checkAnswer(item, rightValue(item)).correct).toBe(true);
    expect(() =>
      generateItem(skill('english-word', { topics: ['body'], mode: 'sort' }), { seed: 1, band: 0 }),
    ).toThrow();
  });
});

describe('english-count, pronoun, talk', () => {
  for (const mode of ['count-word', 'word-picture', 'numeral-word', 'spell-number'] as const)
    it(`count ${mode}`, () => {
      for (const item of many('english-count', { mode, range: [1, 20], choices: 3 }))
        expect(checkAnswer(item, rightValue(item)).correct).toBe(true);
    });

  it('count-word: kata bilangan benar = banyak benda', () => {
    for (const item of many('english-count', { mode: 'count-word', range: [1, 10] })) {
      const it = item.interaction;
      if (it.type !== 'pick-one') throw new Error();
      const n = (item.stimulus[0] as { count: number }).count;
      const right = it.choices.find((c) => c.id === it.answer)!;
      expect((right.visual as { text: string }).text).toBe(EN_NUMBERS[n]!.toUpperCase());
    }
  });

  it('pronoun: he untuk laki-laki, she untuk perempuan, it untuk hewan/benda', () => {
    for (const item of many('english-pronoun', { mode: 'fill', pool: 'mixed' })) {
      const it = item.interaction;
      if (it.type !== 'pick-one') throw new Error();
      const pic = item.stimulus[0] as { object: string };
      const right = (it.choices.find((c) => c.id === it.answer)!.visual as { text: string }).text;
      const person = EN_WORDS.find(
        (w) => w.pic.kind === 'object' && w.pic.object === pic.object && w.topic === 'person',
      );
      expect(right).toBe((person?.pronoun ?? 'it').toUpperCase());
    }
    for (const mode of ['pick', 'listen'] as const)
      for (const pool of ['people', 'mixed'] as const)
        for (const item of many('english-pronoun', { mode, pool }, 30))
          expect(checkAnswer(item, rightValue(item)).correct).toBe(true);
  });

  it('talk: semua mode punya satu jawaban tepat', () => {
    for (const mode of ['reply', 'greet', 'whatis', 'colour'] as const)
      for (const item of many('english-talk', { mode, choices: 4 }, 60)) {
        const it = item.interaction;
        if (it.type !== 'pick-one') throw new Error();
        expect(new Set(it.choices.map((c) => JSON.stringify(c.visual))).size).toBe(
          it.choices.length,
        );
        expect(checkAnswer(item, it.answer).correct).toBe(true);
      }
  });

  it('suara TK Olimpiade: perintah Indonesia, kartu kata English', () => {
    expect(voiceProfileOf('english.tkosn.a1.x', 'prompt').lang).toBe('id-ID');
    expect(voiceProfileOf('english.tkosn.a1.x', 'choice').lang).toBe('en-GB');
    expect(voiceProfileOf('english.sd1.a1.x', 'prompt').lang).toBe('en-GB');
  });
});
