import { describe, expect, it } from 'vitest';
import {
  buildVoiceAllowList,
  generateItem,
  itemVoiceTexts,
  lessonFor,
  lessonVoiceTexts,
  skillTemplateSchema,
  voiceSentences,
  voiceTextAllowed,
  voiceVocabulary,
} from '../src/index.js';

/** Semua suara Chirp, tetapi hanya untuk teks dari aplikasi (D-091). */
const global = buildVoiceAllowList({
  texts: ['Benda dibuat dari bahan. Ada yang kasar.', 'Raba bendanya. Kasar atau halus?', 'PAUD'],
  templates: [
    'Tepat!',
    'Ingat:',
    'Halo, {name}! Ayo lanjut: {topic}, level {n}.',
    'Ketuk tiga gambar rahasiamu.',
    '{name}',
    '{kind} {provider}',
  ],
  words: voiceVocabulary(),
});
const ok = (t: string, extra = [] as ReturnType<typeof buildVoiceAllowList>[]) =>
  voiceTextAllowed(t, [global, ...extra]);

describe('daftar teks suara', () => {
  it('teks i18n, katalog, dan gabungan kalimatnya diizinkan', () => {
    expect(ok('Tepat!')).toBe(true);
    expect(ok('Ada yang kasar.')).toBe(true);
    expect(ok('Ingat: Raba bendanya. Kasar atau halus?')).toBe(true);
    expect(ok('Halo, Aimar! Ayo lanjut: Membilang sampai 3, level 2.')).toBe(true);
    expect(ok('Aimar. Ketuk tiga gambar rahasiamu.')).toBe(true);
    expect(ok('PAUD')).toBe(true);
  });

  it('kosakata aplikasi boleh dirangkai: huruf, angka, nama benda', () => {
    expect(ok('Huruf b besar. tujuh, gajah.')).toBe(true);
    expect(ok('Dua puluh tiga.')).toBe(true);
  });

  it('teks bebas ditolak, juga lewat template yang isiannya mendominasi', () => {
    expect(ok('Ayo beli saham murah sekarang juga di toko online kami')).toBe(false);
    expect(ok('Halo, beli saham murah sekarang juga di toko kami! Ayo lanjut: x, level 1.')).toBe(
      false,
    );
    expect(ok('transfer uang ke rekening ini')).toBe(false);
    expect(ok('a'.repeat(700))).toBe(false);
    expect(ok('')).toBe(false);
  });

  it('kalimat soal hanya dengan konteks soal itu', () => {
    const t = skillTemplateSchema.parse({
      id: 'math.prek.z1.uji',
      version: 1,
      domain: 'math',
      grade: 'prek',
      category: 'Z',
      order: 1,
      title: 'Uji',
      tier: 'basic',
      family: 'count',
      params: {},
    });
    const item = generateItem(t, { seed: 5, band: 1 });
    const list = buildVoiceAllowList({ texts: itemVoiceTexts(item) });
    expect(ok(item.reteach.say, [list])).toBe(true);
    expect(ok(item.say ?? item.prompt, [list])).toBe(true);
    // Pelajaran otomatis: kalimat video & soal contohnya.
    const lesson = lessonFor({ title: 'Uji', intro: 'Kita berhitung.', tips: ['Hitung pelan.'] }, [
      t,
    ])!;
    const ll = buildVoiceAllowList({ texts: lessonVoiceTexts(lesson, [t]) });
    const opening = lesson.layar[0]!.adegan![0]!.suara;
    expect(ok(opening)).toBe(false);
    expect(ok(opening, [ll])).toBe(true);
  });

  it('pecah kalimat', () => {
    expect(voiceSentences('Satu. Dua! Tiga? Empat…')).toEqual(['Satu.', 'Dua!', 'Tiga?', 'Empat…']);
  });
});
