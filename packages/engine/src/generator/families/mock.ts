import { mockConfigSchema } from '../mock-config.js';
import { defineFamily, reject } from './common.js';

/**
 * Mock Test olimpiade (D-072). Template ini hanya menyimpan konfigurasi (jumlah soal, tingkat, poin, acuan waktu);
 * soalnya diambil dari level-level lain di buku yang sama oleh `generateMockRound`, bukan dibuat di sini.
 */
export const mockFamily = defineFamily({
  description: 'Mock Test olimpiade: 25 soal campuran semua materi di buku, dinilai gaya EMC.',
  params: mockConfigSchema,
  generate() {
    return reject('soal mock test dibuat dari level lain di buku (generateMockRound)');
  },
});
