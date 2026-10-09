import type { Infografis, ObjectId, Visual } from '@little-coder/engine';

/**
 * Materi lengkap (purwarupa): satu topik dipecah menjadi beberapa bab berurutan. Tiap bab mengikuti satu level
 * latihan dan berjalan dengan pola tetap: penjelasan → contoh Momo → main (tidak dinilai) → coba soal asli →
 * ingat. Semua kalimat dibacakan; kesalahan hanya dibalas petunjuk lembut.
 */
export type Materi = {
  judul: string;
  sub: string;
  bab: Bab[];
};

export type Bab = {
  id: string;
  judul: string;
  /** Kalimat pendek di peta materi. */
  ringkas: string;
  /** Gambar kecil di peta materi. */
  ikon: Visual;
  /** Level latihan yang dibahas (urutan level di topik). */
  level: number[];
  langkah: Langkah[];
};

export type Langkah =
  | { jenis: 'jelaskan'; teks: string; suara: string; poster: Infografis }
  | { jenis: 'contoh'; teks: string; suara: string; adegan: Adegan[] }
  | { jenis: 'main'; teks: string; suara: string; main: Main }
  | { jenis: 'soal'; teks: string; suara: string; level: number; seed: number }
  | { jenis: 'ingat'; teks: string; suara: string; poin: Ingat[] };

/**
 * Satu adegan contoh: Momo mengerjakan selangkah demi selangkah. `hitung` = sesudah `suara`, benda di gambar
 * pertama disorot satu per satu sambil disebut ("satu, dua, …" atau "pertama, kedua, …"), lalu `selesai`.
 */
export type Adegan = {
  teks: string;
  suara: string;
  visual: Visual[];
  hitung?: 'angka' | 'urutan';
  selesai?: string;
};

export type Ingat = { teks: string; tepat: boolean };

/** Permainan kecil yang tidak dinilai. */
export type Main =
  | { tipe: 'kenal-angka'; sampai: number; benda: ObjectId }
  | { tipe: 'dengar-ketuk'; ronde: { target: number; pilihan: number[] }[] }
  | { tipe: 'hitung-ketuk'; ronde: { n: number; benda: ObjectId; pilihan: number[] }[] }
  | { tipe: 'pasangkan'; pasangan: { n: number; benda: ObjectId }[] }
  | { tipe: 'garis-bilangan'; sampai: number }
  | { tipe: 'kereta'; ronde: { deret: number[]; kosong: number; pilihan: number[] }[] }
  | { tipe: 'urutkan'; ronde: number[][] }
  | { tipe: 'antrean'; hewan: ObjectId[]; ronde: number[] }
  | { tipe: 'banding'; ronde: { angka: number[]; cari: 'besar' | 'kecil' }[] }
  | { tipe: 'bingkai'; ronde: number[] };
