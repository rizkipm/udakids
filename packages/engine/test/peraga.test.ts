import { describe, expect, it } from 'vitest';
import { lessonScreenSchema, peragaPhotos, peragaSchema, peragaSteps } from '../src/index.js';

/** Simulasi pelajaran SD (D-093). */
const step = { teks: 'Langkah', suara: 'Langkah satu', selesai: 'Bagus' };
const card = (id: string) => ({
  id,
  nama: id,
  teks: 'Teks kartu',
  suara: 'Suara kartu',
  gambar: { word: id },
  foto: { id: `foto-${id}`, label: `foto ${id}` },
});
const ok = (p: unknown) => peragaSchema.safeParse(p).success;

describe('peraga: jelajah, proses, kata', () => {
  const jelajah = {
    tipe: 'jelajah',
    jelajahSuara: 'Ketuk kartunya',
    bagian: [card('akar'), card('batang'), card('daun')],
    tanya: [
      { teks: 'Ketuk akar', suara: 'Ketuk akar', jawaban: ['akar', 'batang'], selesai: 'Bagus' },
    ],
    aha: 'Aha',
    tutup: 'Tutup',
  };
  it('jelajah valid; jawaban harus id bagian; gambar cadangan wajib', () => {
    expect(ok(jelajah)).toBe(true);
    expect(ok({ ...jelajah, tanya: [{ ...jelajah.tanya[0], jawaban: ['bunga'] }] })).toBe(false);
    const { gambar: _g, ...noPic } = card('akar');
    expect(ok({ ...jelajah, bagian: [noPic, card('b'), card('c')] })).toBe(false);
    expect(peragaPhotos(peragaSchema.parse(jelajah)).map((f) => f.id)).toEqual([
      'foto-akar',
      'foto-batang',
      'foto-daun',
    ]);
  });
  it('proses & kata', () => {
    const tahap = (nama: string) => ({
      nama,
      teks: 'teks',
      suara: 'suara',
      gambar: { object: 'es-batu' },
    });
    expect(
      ok({
        tipe: 'proses',
        tombol: 'Panaskan',
        tahap: [tahap('Es'), tahap('Air')],
        aha: 'Aha',
        tutup: 'Tutup',
      }),
    ).toBe(true);
    const kata = (en: string) => ({ en, id: en, gambar: { word: en } });
    expect(
      ok({
        tipe: 'kata',
        pengantar: 'Ayo',
        kata: [kata('red'), kata('blue'), kata('green')],
        aha: 'Aha',
        tutup: 'Tutup',
      }),
    ).toBe(true);
    expect(
      ok({ tipe: 'kata', pengantar: 'Ayo', kata: [kata('red')], aha: 'Aha', tutup: 'Tutup' }),
    ).toBe(false);
  });
});

describe('peraga: alat matematika', () => {
  const alat = (a: string, langkah: unknown[]) => ({
    tipe: 'alat',
    alat: a,
    pengantar: 'Ayo',
    langkah,
    aha: 'Aha',
    tutup: 'Tutup',
  });
  it('setiap alat memeriksa parameternya', () => {
    expect(ok(alat('garis-bilangan', [{ ...step, min: 0, max: 10, dari: 3, ubah: 2 }]))).toBe(true);
    expect(ok(alat('garis-bilangan', [{ ...step, min: 0, max: 10, dari: 9, ubah: 5 }]))).toBe(
      false,
    );
    expect(ok(alat('blok-puluhan', [{ ...step, target: 47 }]))).toBe(true);
    expect(ok(alat('benda', [{ ...step, benda: 'apel', a: 2, b: 3, op: '-' }]))).toBe(false);
    expect(ok(alat('uang', [{ ...step, target: 1500, pecahan: [500, 1000] }]))).toBe(true);
    expect(ok(alat('uang', [{ ...step, target: 1250, pecahan: [500, 1000] }]))).toBe(false);
    expect(ok(alat('jam', [{ ...step, jam: 7, menit: 30 }]))).toBe(true);
    expect(ok(alat('jam', [{ ...step, jam: 7, menit: 32 }]))).toBe(false);
    expect(ok(alat('pecahan', [{ ...step, penyebut: 4, pembilang: 5 }]))).toBe(false);
    expect(ok(alat('bangun', [{ ...step, bangun: 'kubus', hitung: 'sudut' }]))).toBe(true);
    expect(
      ok(
        alat('timbangan', [
          {
            ...step,
            kiri: { benda: 'apel', jumlah: 2, berat: 3 },
            kanan: { benda: 'semangka', jumlah: 1, berat: 20 },
          },
        ]),
      ),
    ).toBe(true);
    expect(ok(alat('ukur', [{ ...step, benda: 'pensil', panjang: 8 }]))).toBe(true);
    expect(
      ok(
        alat('pola', [
          {
            ...step,
            urutan: [{ numeral: 1 }, { numeral: 2 }, { numeral: 1 }],
            pilihan: [{ numeral: 2 }, { numeral: 3 }],
            jawaban: 5,
          },
        ]),
      ),
    ).toBe(false);
  });
  it('langkah dibaca dengan nilai bawaan', () => {
    const [s] = peragaSteps('garis-bilangan', [{ ...step, min: 0, max: 20, dari: 0, ubah: 10 }]);
    expect(s!.loncat).toBe(1);
  });
  it('layar pelajaran peraga', () => {
    const screen = {
      jenis: 'peraga',
      teks: 'Simulasi',
      suara: 'Simulasi',
      peraga: alat('jam', [{ ...step, jam: 3, menit: 0 }]),
    };
    expect(lessonScreenSchema.safeParse(screen).success).toBe(true);
    expect(lessonScreenSchema.safeParse({ ...screen, jenis: 'baca' }).success).toBe(false);
    expect(lessonScreenSchema.safeParse({ ...screen, peraga: undefined }).success).toBe(false);
  });
});
