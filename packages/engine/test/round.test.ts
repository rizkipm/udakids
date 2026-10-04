import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  generateRound,
  itemCoreKey,
  itemFingerprint,
  itemKey,
  RECENT_PER_SKILL,
  rememberRound,
  quizBand,
  skillTemplateSchema,
  type SkillTemplate,
} from '../src/index.js';

const content = (rel: string): SkillTemplate =>
  skillTemplateSchema.parse(
    JSON.parse(
      readFileSync(join(import.meta.dirname, '..', '..', '..', 'content', 'skills', rel), 'utf8'),
    ),
  );

const bank = (n: number) =>
  skillTemplateSchema.parse({
    id: 'sains.sd12.a6.uji-bank',
    version: 1,
    domain: 'sains',
    grade: 'sd12',
    category: 'A',
    order: 6,
    title: 'Uji bank',
    tier: 'intermediate',
    family: 'manual',
    params: {
      items: Array.from({ length: n }, (_, k) => ({
        prompt: `Soal nomor ${k + 1}`,
        choices: [
          { visual: { kind: 'text', text: 'ya' } },
          { visual: { kind: 'text', text: 'tidak' } },
        ],
        answer: 0,
      })),
    },
  });

const fps = (items: ReturnType<typeof generateRound>) => items.map(itemKey);

describe('ronde tanpa soal kembar & ulang ronde dengan soal baru (D-028)', () => {
  const skill = content('math/sd12/A02-bilangan-lebih-kecil-sampai-20.json');

  it('10 soal, band mengikuti level (mudah → sulit), tanpa kembar dalam satu ronde', () => {
    const round = generateRound(skill, { seed: 1234 });
    expect(round).toHaveLength(10);
    expect(round.map((it) => it.band)).toEqual(round.map((_, i) => quizBand(i)));
    expect(new Set(fps(round)).size).toBe(10);
    expect(round.every((it) => it.skillId === skill.id)).toBe(true);
  });

  it('ulang ronde: tidak ada soal yang sama dengan ronde sebelumnya', () => {
    const first = generateRound(skill, { seed: 1234 });
    const again = generateRound(skill, { seed: 1235, avoid: fps(first) });
    const overlap = fps(again).filter((f) => fps(first).includes(f));
    expect(overlap).toEqual([]);
  });

  it('deterministik untuk seed & riwayat yang sama', () => {
    expect(fps(generateRound(skill, { seed: 9 }))).toEqual(fps(generateRound(skill, { seed: 9 })));
  });

  it('sidik jari tidak terpengaruh urutan pilihan', () => {
    const [a] = generateRound(skill, { seed: 5 });
    const i = a!.interaction as { choices: unknown[] };
    const flipped = {
      ...a!,
      interaction: { ...a!.interaction, choices: [...i.choices].reverse() },
    };
    expect(itemFingerprint(flipped as typeof a & object)).toBe(itemFingerprint(a!));
  });

  it('bank soal kecil (12): ronde kedua memakai 2 soal baru + soal yang paling lama tidak muncul', () => {
    const t = bank(12);
    const first = generateRound(t, { seed: 100 });
    expect(new Set(fps(first)).size).toBe(10);
    const again = generateRound(t, { seed: 101, avoid: fps(first) });
    expect(new Set(fps(again)).size).toBe(10);
    const fresh = fps(again).filter((f) => !fps(first).includes(f));
    expect(fresh).toHaveLength(2);
    // Yang dipakai ulang diambil dari bagian awal riwayat (paling lama), bukan yang barusan.
    const reused = fps(again).filter((f) => fps(first).includes(f));
    expect(reused.every((f) => fps(first).indexOf(f) < 8 + 2)).toBe(true);
  });

  it('bank soal besar (Sains, 17 soal): 10 soal baru di ronde kedua bila memungkinkan', () => {
    const s = content('sains/sd34/A09-ulangan-semua-soal.json');
    const first = generateRound(s, { seed: 7 });
    const again = generateRound(s, { seed: 8, avoid: fps(first) });
    const fresh = fps(again).filter((f) => !fps(first).includes(f));
    expect(fresh.length).toBeGreaterThanOrEqual(7);
  });
});

describe('inti soal tidak kembar dalam satu ronde', () => {
  // 12 soal = 6 pertanyaan × 2 versi pengecoh: jawaban sama, hanya pengecohnya beda.
  const twins = skillTemplateSchema.parse({
    id: 'sains.tk.z1.uji-kembar',
    version: 1,
    domain: 'sains',
    grade: 'tk',
    category: 'Z',
    order: 1,
    title: 'Uji kembar',
    tier: 'basic',
    family: 'manual',
    params: {
      items: Array.from({ length: 12 }, (_, k) => ({
        prompt: `Pertanyaan ${(k % 6) + 1}`,
        choices: [
          { visual: { kind: 'text', text: `benar ${k % 6}` } },
          { visual: { kind: 'text', text: k < 6 ? 'pengecoh a' : 'pengecoh b' } },
        ],
        answer: 0,
      })),
    },
  });

  it('versi pengecoh berbeda tetap dianggap soal yang sama', () => {
    const round = generateRound(twins, { seed: 3, length: 6 });
    expect(new Set(round.map(itemCoreKey)).size).toBe(6);
    expect(new Set(round.map((it) => it.prompt)).size).toBe(6);
  });

  it('soal dengar: kalimat sama tetapi kata yang diucapkan beda = soal berbeda (D-059)', () => {
    const listen = skillTemplateSchema.parse({
      id: 'english.prek.z1.uji-dengar',
      version: 1,
      domain: 'english',
      grade: 'prek',
      category: 'Z',
      order: 1,
      title: 'Uji dengar',
      tier: 'basic',
      family: 'manual',
      params: {
        items: ['ball', 'bed', 'bus', 'bag', 'box', 'bat'].map((w) => ({
          prompt: 'Tap the letter you hear.',
          say: `Listen: ${w}. Which letter does it start with?`,
          choices: [
            { visual: { kind: 'word', text: 'b' } },
            { visual: { kind: 'word', text: 'd' } },
          ],
          answer: 0,
        })),
      },
    });
    const round = generateRound(listen, { seed: 5, length: 6 });
    expect(new Set(round.map(itemCoreKey)).size).toBe(6);
    expect(new Set(round.map((it) => it.say)).size).toBe(6);
  });

  it('bila variasi habis, pengulangan dibagi rata dan tidak berurutan', () => {
    const round = generateRound(twins, { seed: 4 });
    const cores = round.map(itemCoreKey);
    cores.forEach((k, i) => i > 0 && expect(k).not.toBe(cores[i - 1]));
    const counts = [...new Set(cores)].map((k) => cores.filter((x) => x === k).length);
    expect(Math.max(...counts)).toBe(2);
  });
});

describe('riwayat soal per skill', () => {
  it('rememberRound: terbaru di belakang, tanpa duplikat, dibatasi', () => {
    expect(rememberRound(['a', 'b', 'c'], ['b', 'd'])).toEqual(['a', 'c', 'b', 'd']);
    const long = Array.from({ length: 40 }, (_, i) => `k${i}`);
    expect(rememberRound(undefined, long)).toHaveLength(RECENT_PER_SKILL);
    expect(rememberRound(undefined, long).at(-1)).toBe('k39');
  });

  it('level dengan ruang soal kecil: semua variasi dipakai bergiliran sebelum mengulang', () => {
    const t = content('math/prek/A09-angka-yang-lebih-besar-sampai-3.json');
    let recent: string[] = [];
    const all = new Set<string>();
    for (let r = 0; r < 3; r++) {
      const keys = fps(generateRound(t, { seed: 50 + r, avoid: recent }));
      keys.forEach((k) => all.add(k));
      // Ronde pertama soal di awal ronde tidak sama dengan soal terakhir ronde sebelumnya.
      if (recent.length) expect(keys[0]).not.toBe(recent.at(-1));
      recent = rememberRound(recent, keys);
    }
    expect(all.size).toBe(3);
    // Variasi sedikit: tetap tidak ada soal kembar berurutan dan pemakaian dibagi rata.
    const keys = fps(generateRound(t, { seed: 77 }));
    keys.forEach((k, i) => i > 0 && expect(k).not.toBe(keys[i - 1]));
    const counts = [...new Set(keys)].map((k) => keys.filter((x) => x === k).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('itemKey pendek & stabil', () => {
    const [a] = generateRound(content('math/sd12/A02-bilangan-lebih-kecil-sampai-20.json'), {
      seed: 3,
    });
    expect(itemKey(a!)).toMatch(/^[0-9a-z]{6,12}$/);
    expect(itemKey(a!)).toBe(itemKey(structuredClone(a!)));
    expect(itemFingerprint(a!).length).toBeGreaterThan(itemKey(a!).length);
  });
});
