---
name: generate-unit
description: Generate satu unit Menu Belajar (Pra-TK/TK/Kelas 1) dari docs/blueprint/menu-belajar.csv berdasarkan kodenya (mis. P-BT-04) — draf pelajaran, 10 level soal bila "BARU", dan daftar gambar yang kurang. Pakai saat user mengetik /generate-unit <KODE>.
---

# Generate satu unit Menu Belajar

Argumen: kode unit, mis. `P-BT-04`. Tanpa argumen → tanya kodenya. Satu pemanggilan = satu unit saja.

## 1. Baca konteks (jangan mengandalkan ingatan)

1. Ambil baris kode itu dari `docs/blueprint/menu-belajar.csv`. Kode tidak ada → berhenti dan laporkan.
2. Baca `docs/rencana-gudang-gambar-menu-belajar.md` (bagian 4 dan 6), `docs/rencana-worksheet-kosakata.md`
   (bagian 4: nomor model soal), `docs/content/buku-10-level.md` (pola 10 level), dan aturan di `CLAUDE.md`.
3. **Cek keputusan:** cari di `docs/decisions.md` keputusan yang menyetujui Menu Belajar dan buku Baca Tulis
   (nomor D setelah D-065). Bila belum ada:
   - mapel Berhitung/English/Sains dengan topik buku yang sudah ada → boleh lanjut;
   - buku baru (mis. Baca Tulis `literasi/*`, English TK/Kelas 1) → **berhenti dan tanya user** sebelum membuat
     buku atau katalog baru.

## 2. Draf pelajaran (Belajar)

Pelajaran menempel di kategori katalog yang dipakai unit itu: isi kolom `lesson` pada kategori di
`content/skills/<domain>/<grade>/_catalog.json` (skema `lessonSchema` di `packages/engine/src/content/lesson.ts`,
D-068). Aplikasi langsung membacanya (tombol "Belajar dulu" di halaman topik, `/play/belajar/:token`). Bila unit
butuh topik soal baru di buku yang sudah dimainkan anak, beri kategori itu `"standalone": true` agar tidak
mengunci topik lain.

```json
"lesson": {
  "kode": "P-BT-04",
  "version": 1,
  "judul": "Huruf a dan i",
  "layar": [
    { "jenis": "kenalan", "teks": "Ini huruf a.", "suara": "Ini huruf a. A.", "huruf": "a" },
    {
      "jenis": "kata",
      "teks": "apel",
      "suara": "a, pel. Apel.",
      "sukuKata": "a-pel",
      "gambar": ["apel"]
    },
    {
      "jenis": "ingat",
      "teks": "a: apel, ayam. i: ikan, itik.",
      "suara": "...",
      "gambar": ["apel", "ayam", "ikan"]
    }
  ]
}
```

Tambahan yang didukung pemutar: `angka` (0–10, deret angka yang bisa diketuk + Momo menulis), `kartu` (1–5 kartu
angka-kata-suku kata-gambar di layar `kata`), dan layar `coba` dengan `mode` `tebal` (menebalkan angka, tidak
dinilai) atau `hitung` (ketuk benda satu per satu). Contoh lengkap: buku `worksheet/prek` kategori `A` (P-MA-01). Unit lembar kerja interaktif (tebalkan, sambung
titik, balon) masuk buku **Worksheet** jenjangnya, satu topik per lembar kerja.

- Jenis layar hanya `kenalan`, `bunyi`, `kata`, `gabung`, `cerita`, `coba`, `ingat` (ikuti kolom "Belajar").
  3–6 layar, layar terakhir `ingat`.
- `teks` ≤ 120 huruf, kalimat pendek, dan semua teks punya `suara`. English: narasi Bahasa Indonesia, kata target
  English British (D-062). Baca Tulis: lewat suku kata.
- `gambar` hanya id dari `OBJECTS` di `packages/engine/src/generator/assets.ts`. Kata yang belum ada → catat
  di langkah 4, jangan dikarang id-nya.

## 3. Soal (Tantangan)

- Kolom Tantangan **"Ada: …"** → tidak membuat soal. Cukup cek bahwa kode topik itu memang ada di katalog.
- Kolom Tantangan **"BARU 10 level"** → ikuti skill `add-skill-template`:
  - kategori baru di `content/skills/<domain>/<grade>/_catalog.json` (kode berikutnya, `intro` ≤ 300 huruf,
    1–3 `tips`), lalu 10 file `<KODE-KATEGORI><nn>-<slug>.json`, Level 1–10 mudah → sulit, Level 10 gabungan;
  - domain: Baca Tulis = `literasi`, Berhitung = `math`, English = `english`, Sains = `sains`; grade: Pra-TK =
    `prek`, TK = `tk`, Kelas 1 = `sd1`;
  - hanya interaksi yang sudah ada (`pick-one`, `tap-all` (boleh `style: balloons`), `order`, `group`, `match`, `build`,
    `number-line`, `number-input`, `trace` lewat family `numeral-trace`, `connect` lewat family `connect-dots`). Model "Baru" di kolom Berlatih (10, 11, 13, 14, 16, 19, 23, …) diganti model yang sudah ada,
    lalu dicatat di laporan;
  - setiap level minimal 24 soal unik, maks 4 pilihan, `say`, `reteach`, `source`, dan `tags` rujukan dari kolom
    Rujukan; Basic tanpa teks yang wajib dibaca.

## 4. Gambar yang kurang

Tambahkan baris ke `docs/blueprint/gambar-kurang.csv` (buat bila belum ada, header
`kode_unit,id,kata_id,kata_en,tema`) untuk setiap kata yang dibutuhkan tetapi belum ada di `OBJECTS`. Jangan
membuat SVG atau memanggil API gambar dari skill ini.

## 5. Verifikasi

```bash
pnpm validate:content && pnpm lint
```

Bila ada skill baru, jalankan juga `pnpm --filter @little-coder/engine test`. Perbaiki sampai hijau. Jangan
menjalankan seed ke produksi, dan jangan commit kecuali diminta.

## 6. Laporan ke user

- File yang dibuat atau diubah, jumlah layar, dan jumlah soal per level.
- 10 contoh soal acak dan ringkasan layar pelajaran untuk direview.
- Model yang diganti sementara, gambar yang kurang, dan keputusan yang masih perlu ditanyakan.
- Saran status di Excel: **Draf** (menunggu review user).
