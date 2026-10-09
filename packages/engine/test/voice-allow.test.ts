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
  numberWord,
  parseNumberWord,
  textLanguage,
  voiceLangFor,
  voiceProfileFor,
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

describe('kata bilangan sampai jutaan (D-096)', () => {
  it('numberWord ↔ parseNumberWord bolak-balik; selain itu ditolak', () => {
    for (const n of [
      0, 7, 11, 19, 20, 99, 100, 101, 999, 1000, 1001, 4725, 10000, 12500, 99999, 100000, 250300,
      999999, 1000000, 2500000, 999999999,
    ])
      expect(parseNumberWord(numberWord(n))).toBe(n);
    expect(numberWord(4725)).toBe('empat ribu tujuh ratus dua puluh lima');
    expect(numberWord(1250000)).toBe('satu juta dua ratus lima puluh ribu');
    expect(numberWord(1e9)).toBe('1000000000');
    expect(parseNumberWord('dua puluh dua puluh')).toBeUndefined();
    expect(parseNumberWord('satu ratus')).toBeUndefined();
    expect(parseNumberWord('beli saham')).toBeUndefined();
    const none = [buildVoiceAllowList({ texts: ['Halo.'] })];
    expect(voiceTextAllowed('empat ribu tujuh ratus dua puluh lima.', none)).toBe(true);
    expect(voiceTextAllowed('Tolong belikan saham perusahaan itu sekarang juga.', none)).toBe(
      false,
    );
  });
});

describe('bahasa suara mengikuti kalimat (D-098)', () => {
  it('menebak bahasa; kata dalam kutip tidak dihitung', () => {
    expect(textLanguage('The flight was delayed because of the storm.')).toBe('en');
    expect(textLanguage('"No card, no lunch box" berarti kartu pelajar wajib ditunjukkan.')).toBe(
      'id',
    );
    expect(textLanguage('Reveal = mengungkapkan; conceal = menyembunyikan.')).toBe('id');
    expect(textLanguage('Ketuk semua antonim dari "visible".')).toBe('id');
    expect(textLanguage('7 + 5')).toBeUndefined();
  });
  it('buku English: penjelasan Indonesia → suara Indonesia; kalimat English → British', () => {
    const id = 'english.smp79.fh1.warm-up-notices-and-ads';
    expect(
      voiceProfileFor(id, 'reteach', 'Yang menanam adalah 300 pelajar, bukan petani.').lang,
    ).toBe('id-ID');
    expect(voiceProfileFor(id, 'reteach', '"Break a leg!" = semoga sukses.').lang).toBe('id-ID');
    expect(voiceProfileFor(id, 'prompt', 'Which line best fills the blank?').lang).toBe('en-GB');
    expect(voiceProfileFor(id, 'choice', 'kartu pelajar wajib ditunjukkan dulu').lang).toBe(
      'id-ID',
    );
    expect(voiceProfileFor(id, 'choice', 'apple').lang).toBe('en-GB');
    // PAUD English: perintah tetap Indonesia; buku lain selalu Indonesia.
    expect(voiceProfileFor('english.prek.a1.x', 'prompt', 'Touch the red apple.').lang).toBe(
      'id-ID',
    );
    expect(voiceProfileFor('english.prek.a1.x', 'reteach', 'This is a red apple.').lang).toBe(
      'en-GB',
    );
    expect(voiceProfileFor('math.smp79.a1.x', 'prompt', 'Which is the answer?').lang).toBe('id-ID');
    expect(voiceLangFor(id, 'prompt', 'Pilih jawaban yang tepat.')).toBe('id-ID');
  });
});
