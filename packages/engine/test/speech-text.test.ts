import { describe, expect, it } from 'vitest';
import {
  bigNumberWord,
  DEFAULT_VOICE_SETTINGS,
  LEGACY_VOICE_STYLE,
  speechText,
  upgradeVoiceSettings,
  VOICE_STYLE_SMP,
  VOICE_STYLE_TK,
  voiceProfileOf,
  voiceSettingsFor,
  voiceStageOf,
} from '../src/index.js';

describe('naskah ucapan (D-087): teks tulis → kalimat lisan', () => {
  const cases: [string, string][] = [
    ['10 + 9 = …', '10 ditambah 9 sama dengan titik-titik'],
    ['9 = 6 + …', '9 sama dengan 6 ditambah titik-titik'],
    ['7 − 3 = 4', '7 dikurangi 3 sama dengan 4'],
    ['Setelah siang hari, datanglah …', 'Setelah siang hari, datanglah titik-titik'],
    ['Harga roti Rp500.', 'Harga roti lima ratus rupiah.'],
    ['Gaji Rp5.500.000 sebulan', 'Gaji lima juta lima ratus ribu rupiah sebulan'],
    ['Ketuk angka 1.000', 'Ketuk angka seribu'],
    ['Suhu air 27 °C', 'Suhu air 27 derajat Celsius'],
    [
      'Luas 64 cm², kelilingnya … cm',
      'Luas 64 sentimeter persegi, kelilingnya titik-titik sentimeter',
    ],
    ['Kecepatan 60 km/jam', 'Kecepatan 60 kilometer per jam'],
    ['Diskon 25%', 'Diskon 25 persen'],
    ['3/4 dari 20', '3 per 4 dari 20'],
    [
      'Hasil dari (−10) × 9 − 49 : (−7) + 12 adalah …',
      'Hasil dari negatif 10 dikali 9 dikurangi 49 dibagi negatif 7 ditambah 12 adalah titik-titik',
    ],
    ['√16 + 3² = …', 'akar 16 ditambah 3 kuadrat sama dengan titik-titik'],
    ['321 < … .', '321 kurang dari titik-titik.'],
    ['Lebih dari ditulis dengan tanda >.', 'Lebih dari ditulis dengan tanda lebih dari.'],
    ['pukul 07.00 sampai 09.30', 'pukul tujuh sampai sembilan tiga puluh'],
    ['Apakah snail slow (lambat)?', 'Apakah snail slow, lambat?'],
    ['Tanggal 1–5 Juli', 'Tanggal 1 sampai 5 Juli'],
    ['Ayu: "Halo!"\nBudi: "Hai."', 'Ayu: Halo! Budi: Hai.'],
    ['Nilai 0,75 lebih dari 1/2', 'Nilai 0,75 lebih dari 1 per 2'],
  ];
  it.each(cases)('%s', (from, to) => expect(speechText(from)).toBe(to));

  it('English: blank, plus, equals, atau → or; isi kurung tidak diubah', () => {
    expect(speechText('The sun is ___. 2 + 3 = …', 'en-GB')).toBe(
      'The sun is blank. 2 plus 3 equals blank',
    );
    expect(speechText('He/She (dia)', 'en-GB')).toBe('He or She (dia)');
  });

  it('teks tanpa simbol tidak berubah; angka biasa tetap angka', () => {
    expect(speechText('Ketuk lingkaran.')).toBe('Ketuk lingkaran.');
    expect(speechText('Ada 5 apel.')).toBe('Ada 5 apel.');
  });

  it('bilangan besar dalam kata', () => {
    expect(bigNumberWord(12_500)).toBe('dua belas ribu lima ratus');
    expect(bigNumberWord(1_000_000)).toBe('satu juta');
    expect(bigNumberWord(250_001)).toBe('dua ratus lima puluh ribu satu');
  });
});

describe('gaya suara per jenjang (D-087)', () => {
  it('tidak ada arahan "robot"; TK, SD, SMP berbeda', () => {
    expect(DEFAULT_VOICE_SETTINGS.style).not.toMatch(/Kamu Momo, robot/);
    expect(voiceStageOf('math.tkosn.a1.x')).toBe('tk');
    expect(voiceStageOf('worksheet.prek.a1.x')).toBe('tk');
    expect(voiceStageOf('sains.sd34.a1.x')).toBe('sd');
    expect(voiceStageOf('math.smp79.a1.x')).toBe('smp');
    expect(voiceProfileOf('math.tk.a1.x').style).toBe(VOICE_STYLE_TK);
    expect(voiceProfileOf('math.smp79.a1.x').style).toBe(VOICE_STYLE_SMP);
  });

  it('TK sedikit lebih pelan dari pengaturan admin; jenjang lain mengikuti admin', () => {
    const s = { ...DEFAULT_VOICE_SETTINGS, rate: 1 };
    expect(voiceSettingsFor(s, voiceProfileOf('math.tk.a1.x')).rate).toBe(0.95);
    expect(voiceSettingsFor(s, voiceProfileOf('math.sd1.a1.x')).rate).toBe(1);
    expect(voiceSettingsFor({ ...s, rate: 0.7 }, voiceProfileOf('math.tk.a1.x')).rate).toBe(0.7);
  });

  it('pengaturan bawaan lama dinaikkan; gaya suntingan admin tetap', () => {
    const old = { ...DEFAULT_VOICE_SETTINGS, style: LEGACY_VOICE_STYLE, rate: 0.95 };
    expect(upgradeVoiceSettings(old)).toEqual({ ...DEFAULT_VOICE_SETTINGS, rate: 1 });
    const mine = { ...DEFAULT_VOICE_SETTINGS, style: 'Gaya saya sendiri.', rate: 0.9 };
    expect(upgradeVoiceSettings(mine)).toBe(mine);
  });
});
