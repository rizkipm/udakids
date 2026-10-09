import { describe, expect, it } from 'vitest';
import {
  autoLesson,
  clip,
  exampleAnswerSay,
  generateItem,
  lessonFor,
  lessonScreenSchema,
  pickExamples,
  sentences,
  skillTemplateSchema,
  type Lesson,
  type SkillTemplate,
} from '../src/index.js';

/** Pelajaran otomatis (D-090). */
const skill = (order: number, family: string, params: Record<string, unknown>) =>
  skillTemplateSchema.parse({
    id: `math.prek.z${order}.uji-${order}`,
    version: 1,
    domain: 'math',
    grade: 'prek',
    category: 'Z',
    order,
    title: `Uji — Level ${order} — Uji`,
    tier: 'basic',
    family,
    params,
  });
const skills = [
  skill(1, 'numeral-trace', { values: [1, 3] }),
  skill(2, 'count', {}),
  skill(3, 'count', {}),
  skill(4, 'numeral-tap-all', { values: [1, 5] }),
];
const topic = {
  title: 'Mengenal angka',
  intro: 'Kita mengenal angka 1 sampai 5. Angka menunjukkan banyak benda.',
  tips: ['Hitung satu per satu.', 'Angka terakhir adalah banyaknya.'],
};

describe('pelajaran otomatis', () => {
  it('video + bacaan + coba soal + ingat; semua layar valid', () => {
    const l = autoLesson(topic, skills);
    expect(l.layar.map((s) => s.jenis)).toEqual(['tonton', 'baca', 'coba', 'ingat']);
    for (const s of l.layar) expect(lessonScreenSchema.safeParse(s).success, s.jenis).toBe(true);
    const video = l.layar[0]!;
    expect(video.adegan!.length).toBeGreaterThanOrEqual(4);
    expect(video.adegan!.filter((a) => a.contoh).length).toBeGreaterThanOrEqual(2);
  });

  it('contoh soal: utamakan yang jawabannya bisa disorot, dari level mudah ke sulit', () => {
    const found = pickExamples(skills);
    expect(found.length).toBe(3);
    const levels = found.map((f) => f.example.level);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
    expect(found.every((f) => f.item.interaction.type !== 'trace')).toBe(true);
    // Deterministik.
    expect(pickExamples(skills)).toEqual(found);
  });

  it('game/tebalkan saja: tetap ada contoh (cara bermain)', () => {
    const only = [
      skill(1, 'numeral-trace', { values: [1, 3] }),
      skill(2, 'numeral-trace', { values: [4, 6] }),
    ];
    expect(pickExamples(only).length).toBe(2);
  });

  it('kalimat jawaban menyebut pilihan yang tepat', () => {
    const it2 = generateItem(skills[1]!, { seed: 11, band: 0 });
    expect(exampleAnswerSay(it2)).toMatch(/^Jawabannya /);
  });

  it('pelajaran manual tanpa video mendapat Video Momo di depan; mock tidak berpelajaran', () => {
    const own: Lesson = {
      kode: 'P-MA-01',
      version: 1,
      judul: 'Angka',
      layar: [
        { jenis: 'kenalan', teks: 'Halo', suara: 'Halo', angka: [1] },
        { jenis: 'ingat', teks: 'Ingat', suara: 'Ingat' },
      ],
    };
    const l = lessonFor({ ...topic, lesson: own }, skills)!;
    expect(l.layar.map((s) => s.jenis)).toEqual(['tonton', 'kenalan', 'ingat']);
    const mock = {
      ...skills[0]!,
      id: 'math.prek.z9.mock-test-1',
      order: 9,
      family: 'mock',
    } as SkillTemplate;
    expect(lessonFor(topic, [mock])).toBeUndefined();
  });

  it('teks dipotong rapi; intro dipecah per kalimat', () => {
    expect(clip('a '.repeat(100), 20).length).toBeLessThanOrEqual(20);
    expect(sentences('Satu dua. Tiga empat! Lima?')).toEqual(['Satu dua.', 'Tiga empat!', 'Lima?']);
  });
});
