import { describe, expect, it } from 'vitest';
import { competitionOf } from '../src/leaderboard/leaderboard.controller.js';

describe('competitionOf (D-074, D-076)', () => {
  it('singkatan lomba dari judul bagian mock', () => {
    expect(
      competitionOf('KMSI · Kompetensi Matematika Sains dan Bahasa Inggris — Penyisihan 2026'),
    ).toBe('KMSI');
    expect(
      competitionOf('EMC · Eduversal Mathematics Competition — Penyisihan Final Provinsi 2026'),
    ).toBe('EMC');
    expect(
      competitionOf('ESC · Eduversal Science Competition — Penyisihan Final Provinsi 2026'),
    ).toBe('ESC');
    expect(competitionOf('EEC · Eduversal English Competition — Final 2026')).toBe('EEC');
  });
  it('judul bagian lama tetap dikenali', () => {
    expect(competitionOf('Mock Test KMSI · Simulasi penyisihan 30 soal — benar 4, KKM 72')).toBe(
      'KMSI',
    );
    expect(competitionOf('Mock Test · Simulasi lomba 25 soal — penilaian gaya EMC')).toBe(
      'Olimpiade',
    );
    expect(competitionOf(undefined)).toBe('Olimpiade');
  });
});
