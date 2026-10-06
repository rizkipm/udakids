# Rencana: Gudang Gambar AI Hemat Biaya dan Menu Belajar Pra-TK, TK, Kelas 1

Status: **Sebagian disetujui** (D-068, 2026-10-07): AI Gambar di admin, simpan di PostgreSQL, pelajaran di katalog,
unit P-MA-01. Sisa bagian 8 masih usulan. Ditulis 2026-10-05.
Pembaca: pemilik produk, tim konten, dan tim pengembang Udakids.
Melengkapi [rencana-studio-soal.md](rencana-studio-soal.md) dan [rencana-worksheet-kosakata.md](rencana-worksheet-kosakata.md).
Data tabel bagian 6 juga tersedia sebagai CSV di [blueprint/menu-belajar.csv](blueprint/menu-belajar.csv),
untuk dibaca Studio saat generate. Versi Excel dan cara generate satu per satu:
[blueprint/menu-belajar.xlsx](blueprint/menu-belajar.xlsx) dan [blueprint/PETUNJUK-GENERATE.md](blueprint/PETUNJUK-GENERATE.md).

## 1. Ringkasan

- **Gambar dibuat sekali, dipakai selamanya.** Setiap gambar dibuat lewat API gambar OpenAI satu kali, disimpan
  di server Udakids, lalu dipakai berulang oleh semua soal, pelajaran, dan worksheet tanpa biaya lagi. Anak tidak
  pernah memicu pembuatan gambar.
- **Biaya sangat kecil bila caranya tepat.** Dengan model mini, Batch API (diskon 50%), dan 4 gambar dalam satu
  permintaan, **10.000 gambar ≈ US$15–20**. Bandingkan dengan cara boros (model besar, kualitas tinggi, satu per
  satu, langsung) yang menelan ≈ US$1.670 untuk jumlah yang sama.
- **API key aman di panel admin:** terenkripsi, tidak pernah dikirim ke browser, hanya admin, dengan batas biaya
  harian/bulanan di Udakids, log audit, dan email pemberitahuan.
- **Menu Belajar khusus Pra-TK, TK, Kelas 1:** 4 mapel (Baca Tulis, Berhitung, English, Sains), **156 unit**.
  Setiap unit punya **Belajar → Berlatih → Tantangan** (soal seperti sekarang) dan worksheet cetak.

## 2. Gudang Gambar: hemat token dan sekali generate

### 2.1 Prinsip

1. **Gambar adalah aset, bukan permintaan.** Generate terjadi di admin, satu kali per gambar. Hasilnya disimpan
   dan dilayani sebagai file statis (cache browser dan PWA, bisa offline).
2. **Tidak pernah membayar dua kali.** Setiap permintaan punya sidik jari: `hash(kata + varian + gaya + model +
kualitas)`. Kalau sidik jari sudah ada, sistem memakai gambar yang tersimpan.
3. **Gambar tanpa tulisan.** Teks (kata, huruf, angka) digambar oleh aplikasi, bukan oleh AI. Satu gambar "apel"
   bisa dipakai untuk Baca Tulis ("apel"), English ("apple"), dan soal hitung, dan tidak ada salah eja di gambar.
4. **Adegan disusun aplikasi.** Soal "ada 4 apel di keranjang" memakai 1 gambar apel yang diulang 4 kali, bukan
   gambar baru. Adegan besar hanya dibuat untuk pelajaran dan model "cari di gambar".

### 2.2 Teknik hemat biaya (hasil riset)

| Teknik                               | Cara                                                                                                                                                                                                       | Penghematan                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Model mini                           | `gpt-image-1-mini` (low $0,005 · medium $0,011 · high $0,036 per 1024²)                                                                                                                                    | 54–70% vs model penuh                       |
| Batch API                            | Kirim antrean sampai 50.000 permintaan, hasil ≤ 24 jam                                                                                                                                                     | **50%**                                     |
| Grid 2×2                             | Satu gambar 1024² berisi 4 benda dengan latar polos dan jarak lebar, lalu dipotong otomatis (`sharp`) jadi 4 gambar 512²                                                                                   | **75%** (4 gambar per bayar)                |
| Pratinjau murah dulu                 | Draf kualitas _low_, admin memilih, baru versi _medium_ untuk yang disetujui                                                                                                                               | Gambar gagal tidak mahal                    |
| Ukuran sesuai pakai                  | Tampilan anak ≤ 256 px. Simpan WebP 512 dan 256 (±10–30 KB)                                                                                                                                                | Hemat penyimpanan dan kuota                 |
| Latar transparan                     | Parameter `background: "transparent"` + `output_format: "webp"`. Cadangan: latar putih lalu dibuang lokal                                                                                                  | Satu gambar cocok di semua tema             |
| Satu gaya tetap                      | Blok prompt gaya Udakids v1 yang sama untuk semua gambar                                                                                                                                                   | Tidak perlu generate ulang demi konsistensi |
| Teks AI (soal/pelajaran) hemat token | AI menulis **template**, bukan soal satu per satu. Satu template = ratusan soal gratis dari engine. Pakai Batch, _prompt caching_ (awalan prompt tetap), dan _structured output_ (JSON valid, tanpa ulang) | Sangat besar                                |

Harga di atas dari kalkulator harga pihak ketiga per Oktober 2026. Harga resmi bisa berubah, jadi panel admin
menyimpan tabel harga yang bisa diubah dan menghitung perkiraan biaya dari tabel itu.

### 2.3 Perkiraan biaya untuk 10.000 gambar

| Skenario                                          | Hitungan              | Total        |
| ------------------------------------------------- | --------------------- | ------------ |
| Boros: model penuh, high, satu per satu, langsung | 10.000 × $0,167       | ≈ **$1.670** |
| Mini medium, satu per satu, Batch                 | 10.000 × $0,0055      | ≈ $55        |
| **Rekomendasi:** mini medium, grid 2×2, Batch     | 2.500 × $0,0055       | ≈ **$14**    |
| + pratinjau low grid 2×2 + 20% generate ulang     | 2.500 × $0,0025 + 20% | ≈ $6         |
| **Total rekomendasi**                             |                       | ≈ **$20**    |

Dengan biaya ini, **20.000–30.000 gambar** (3.000–5.000 kata × 4–6 varian) tetap di bawah US$100. Varian penting
secara pedagogis: anak lebih mudah memahami dan mengingat kata baru bila melihat beberapa contoh yang berbeda
(Perry dkk., 2010, _exemplar variability_).

### 2.4 Alur gudang gambar

```text
Kamus Bergambar (kata + varian)
  ─▶ penyusun prompt (gaya Udakids v1 + benda + varian) ─▶ cek sidik jari (sudah ada? pakai)
  ─▶ antrean ─▶ OpenAI Batch API ─▶ unduh hasil
  ─▶ sharp: potong grid, rapikan tepi, cek latar, ubah ke WebP 512/256, buang gambar kembar (hash visual)
  ─▶ "menunggu review" ─▶ admin memeriksa dalam grid (setujui / tolak / buat ulang)
  ─▶ terbit: file statis dengan cache permanen ─▶ dipakai semua soal, pelajaran, worksheet
```

**Penyimpanan:** media Udakids saat ini disimpan sebagai `bytea` di PostgreSQL. Untuk puluhan ribu gambar
(±0,5–1 GB), gambar sebaiknya disimpan sebagai file di server, atau object storage, dengan nama hash. PostgreSQL
menyimpan datanya (kata, varian, lisensi, prompt, biaya, status). Dengan begitu cadangan database tetap kecil.
PWA hanya menyimpan gambar yang dipakai, atau paket per buku yang diunduh, bukan semua gambar sekaligus.

**Panduan gaya gambar** (masuk ke prompt dan checklist review):

- gaya ilustrasi datar, garis tepi tebal, warna lembut, ramah anak, latar transparan atau putih;
- tanpa huruf, angka, logo, atau merek;
- tidak meniru orang nyata atau karakter berhak cipta;
- tidak menakutkan dan tanpa kekerasan;
- benda dan budaya Indonesia bila relevan; anak digambarkan umum, beragam, dan berpakaian sopan.

## 3. API key OpenAI di panel admin: aman dan tidak bisa dicuri

Pola yang sama dengan kunci suara (D-043), yang sudah memakai `secret-box`, ditambah lapisan baru:

| Lapisan             | Penerapan                                                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hanya admin         | Menu **Admin → Pengaturan → AI Gambar**. Endpoint memakai `@Roles('admin')` dan rate limit.                                                                                               |
| Tulis saja          | Kolom kunci hanya bisa diisi atau diganti. Setelah disimpan, yang tampil hanya `sk-…abcd`. Kunci tidak pernah dikirim balik ke browser.                                                   |
| Terenkripsi         | AES-256-GCM (`secret-box`), sehingga cadangan database tidak memuat kunci yang terbaca. `JWT_SECRET` wajib dijaga dan tidak diganti.                                                      |
| Konfirmasi sandi    | Mengganti kunci atau menjalankan pekerjaan besar meminta sandi admin lagi.                                                                                                                |
| Email pemberitahuan | Setiap penggantian kunci dan pekerjaan di atas batas memicu email ke direksi (D-044).                                                                                                     |
| Batas biaya Udakids | Batas harian dan bulanan (US$) ditegakkan **oleh Udakids**, karena batas di OpenAI bisa berupa peringatan saja. Perkiraan biaya tampil dan harus dikonfirmasi sebelum pekerjaan berjalan. |
| Prompt dari sistem  | Server menyusun prompt dari Kamus Bergambar dan panduan gaya. Admin hanya menambah catatan pendek, jadi kunci tidak bisa dipakai untuk membuat gambar sembarangan.                        |
| Log audit           | Siapa, kapan, berapa gambar, dan berapa biayanya. Kunci tidak pernah tertulis di log (header disensor).                                                                                   |
| Tombol darurat      | "Nonaktifkan AI Gambar" dan "Hapus kunci" sekali klik.                                                                                                                                    |

**Di sisi OpenAI (disarankan, sekali saja):**

1. Buat **Project** khusus, misalnya `Udakids-Gambar`.
2. Buat **restricted key** dengan izin tulis hanya untuk Images, Files, dan Batch (dua yang terakhir dibutuhkan
   Batch API), dan izin lain _None_.
3. Pasang batas biaya dan peringatan pemakaian di project itu.
4. Ganti kunci setiap 90 hari, dan cabut segera bila ada pemakaian aneh.

**Kepatuhan:** AI hanya dipakai di admin untuk membuat aset statis. Anak tidak berinteraksi dengan AI, dan tidak
ada data anak yang dikirim ke OpenAI. Panduan OpenAI untuk pengguna di bawah 18 tahun berlaku untuk aplikasi
yang membiarkan anak memakai AI, dan itu bukan kasus Udakids. Semua gambar tetap direview admin sebelum tayang.

## 4. Menu Belajar khusus Pra-TK, TK, Kelas 1

Anak di tiga jenjang ini melihat menu **Belajar** sebagai pintu utama. Menu soal yang sekarang tetap ada di
dalamnya sebagai tahap Tantangan.

```text
Belajar ─▶ pilih mapel: Baca Tulis · Berhitung · English · Sains
        ─▶ peta unit (jalur petualangan bersama Momo)
        ─▶ setiap unit:
             1. Belajar     pelajaran beranimasi dan dibacakan, teks disorot (tanpa nilai)
             2. Berlatih    latihan ringan dengan petunjuk, boleh diulang, tanpa bintang
             3. Tantangan   10 level soal seperti sekarang (bintang, Skor Jago, peringkat)
             4. Worksheet   lembar kerja cetak (PDF) untuk orang tua, dibuat dari data yang sama
```

Aturan yang tetap berlaku: tanpa nyawa, streak, atau batas waktu; semua teks dibacakan; target sentuh ≥ 64 px;
respons keliru yang lucu; tanpa AI di area anak; dan tidak ada harga di area anak. **Worksheet cetak** diunduh dari
area orang tua (memakai `pdf-lib` yang sudah ada), bukan dari area anak.

**Arti kolom tabel bagian 6:**

- **Belajar (layar):** jenis layar pelajaran: kenalan, bunyi, kata, gabung, cerita, coba, ingat.
- **Berlatih (model):** nomor model soal di rencana-worksheet-kosakata bagian 4. Contohnya 10 = tebalkan,
  11 = susun huruf, 12 = gabung suku kata, 13 = cari di gambar, 14 = kartu memori, 16 = lihat sekilas,
  18 = bagian-keseluruhan, 23 = dengar kalimat lalu ketuk, 24 = cerita mini.
- **Tantangan (soal):** "Ada: …" berarti memakai topik buku yang sudah ada (kode topiknya disebut), jadi tidak
  dibuat ulang. "BARU 10 level" berarti topik soal baru.

## 5. Ringkasan jumlah

| Jenjang   | Baca Tulis | Berhitung | English | Sains  | Total unit | Topik soal baru      |
| --------- | ---------- | --------- | ------- | ------ | ---------- | -------------------- |
| Pra-TK    | 11         | 14        | 13      | 9      | 47         | 28                   |
| TK        | 12         | 17        | 15      | 13     | 57         | 31                   |
| Kelas 1   | 12         | 14        | 10      | 16     | 52         | 23                   |
| **Total** | **35**     | **45**    | **38**  | **38** | **156**    | **82** (± 820 level) |

Artinya: **156 pelajaran baru**, **82 topik soal baru (± 820 level)**, dan **74 unit** yang memakai soal yang
sudah ada (Math Pra-TK/TK/Kelas 1, Sains TK/Kelas 1, English Pra-TK).

**Gudang kosakata dan gambar yang dibutuhkan:**

| Tahap                                 | Kata  | Varian per kata | Gambar                        | Perkiraan biaya gambar |
| ------------------------------------- | ----- | --------------- | ----------------------------- | ---------------------- |
| T1                                    | 500   | 3               | 1.500                         | ± $3                   |
| T2                                    | 1.500 | 4               | 6.000                         | ± $12                  |
| T3                                    | 3.000 | 4               | 12.000                        | ± $24                  |
| T4                                    | 5.000 | 5               | 25.000                        | ± $50                  |
| Adegan pelajaran dan "cari di gambar" | –     | –               | ± 800 (satu per satu, medium) | ± $5                   |

## 6. Tabel rencana per jenjang dan mapel

### Pra-TK

#### Pra-TK · Baca Tulis (11 unit)

| Kode    | Unit                               | Tujuan · rujukan                                                                  | Belajar (layar)            | Berlatih (model) | Tantangan (soal) | Tema kosakata                | Worksheet cetak         |
| ------- | ---------------------------------- | --------------------------------------------------------------------------------- | -------------------------- | ---------------- | ---------------- | ---------------------------- | ----------------------- |
| P-BT-01 | Dengar bunyi di sekitarku          | Membedakan bunyi hewan, kendaraan, dan benda · _CP Fondasi literasi; L&S Phase 1_ | bunyi, kata                | 1, 14            | BARU 10 level    | hewan, kendaraan, alat musik | cocokkan gambar         |
| P-BT-02 | Garis tegak dan mendatar           | Kontrol gerak jari sebelum menulis huruf · _CP Fondasi motorik_                   | kenalan, coba              | 10, 19           | BARU 10 level    | benda sekitar                | tebalkan garis          |
| P-BT-03 | Garis lengkung, lingkaran, zig-zag | Pola goresan dasar huruf · _CP Fondasi motorik_                                   | kenalan, coba              | 10, 19           | BARU 10 level    | alam (ombak, gunung)         | tebalkan garis          |
| P-BT-04 | Huruf vokal a dan i                | Mengenal bentuk dan bunyi a, i · _CP Fondasi literasi; metode suku kata_          | kenalan, bunyi, kata, coba | 2, 8, 10         | BARU 10 level    | buah, hewan                  | tebalkan + cari huruf   |
| P-BT-05 | Huruf vokal u, e, o                | Mengenal bentuk dan bunyi u, e, o · _CP Fondasi literasi_                         | kenalan, bunyi, kata, coba | 2, 8, 10         | BARU 10 level    | benda rumah, alam            | tebalkan + cari huruf   |
| P-BT-06 | Huruf awal benda (vokal)           | Menghubungkan gambar dengan huruf awalnya · _CP Fondasi literasi_                 | kata, ingat                | 8, 1, 14         | BARU 10 level    | semua tema T1                | tarik garis             |
| P-BT-07 | Tepuk suku kata                    | Menyadari kata terdiri dari suku kata (ba-ju) · _Metode suku kata; L&S Phase 1_   | bunyi, kata                | 1, 3             | BARU 10 level    | pakaian, makanan             | lingkari jumlah tepukan |
| P-BT-08 | Bunyi akhir yang sama (rima)       | Mendengar kata berakhiran sama (topi-kopi) · _L&S Phase 1_                        | bunyi, kata                | 1, 14            | BARU 10 level    | benda sekitar                | cocokkan rima           |
| P-BT-09 | Huruf bibir: b, m, p               | Mengenal konsonan pertama yang mudah dilafalkan · _Metode suku kata_              | kenalan, bunyi, kata, coba | 2, 8, 10         | BARU 10 level    | hewan, mainan                | tebalkan huruf          |
| P-BT-10 | Cerita bergambar                   | Mengurutkan 3 gambar dan menceritakannya · _CP Fondasi literasi; NEL L&L_         | cerita, ingat              | 6, 24            | BARU 10 level    | kegiatan sehari-hari         | gunting & urutkan       |
| P-BT-11 | 100 kata pertamaku                 | Kosakata benda paling dekat dengan anak · _CDI / Biemiller_                       | kata                       | 1, 14, 15        | BARU 10 level    | Kamus T1 (100 kata)          | kartu kata              |

#### Pra-TK · Berhitung (14 unit)

| Kode    | Unit                        | Tujuan · rujukan                                                                    | Belajar (layar)     | Berlatih (model) | Tantangan (soal)            | Tema kosakata                | Worksheet cetak            |
| ------- | --------------------------- | ----------------------------------------------------------------------------------- | ------------------- | ---------------- | --------------------------- | ---------------------------- | -------------------------- |
| P-MA-01 | Bilangan 1 sampai 10        | Membilang dan mengenal lambang 1–10 · _CP Fondasi; NEL; EYFS_                       | kenalan, kata, coba | 3, 4, 8          | Worksheet A; Math A–D       | buah, hewan, mainan          | hitung & tulis             |
| P-MA-02 | Lihat sekilas 1 sampai 5    | Mengenali banyak benda tanpa menghitung satu-satu · _EYFS Number (subitising)_      | kenalan, coba       | 16, 3            | BARU 10 level               | titik, buah                  | kartu titik                |
| P-MA-03 | Bilangan 6 sampai 10        | Membilang dan mengenal lambang 6–10 · _CP Fondasi; NEL_                             | kenalan, coba       | 3, 4, 5          | Ada: Math Pra-TK E, F, G, H | makanan, kendaraan           | hitung & tulis             |
| P-MA-04 | Jari tangan dan angka       | Menunjukkan bilangan dengan jari · _NEL Numeracy_                                   | kenalan, coba       | 8, 16            | BARU 10 level               | tubuh (jari)                 | tarik garis jari ↔ angka   |
| P-MA-05 | Pertama sampai kelima       | Bilangan urutan dalam antrean · _Common Core K.CC; NEL_                             | cerita, coba        | 13, 6            | BARU 10 level               | hewan, kendaraan             | warnai urutan              |
| P-MA-06 | Lebih banyak, lebih sedikit | Membandingkan dua kelompok · _CP Fondasi; EYFS_                                     | kenalan, coba       | 1, 4             | Ada: Math Pra-TK I, K, L    | buah, mainan                 | lingkari yang lebih banyak |
| P-MA-07 | Pola warna dan bentuk       | Melanjutkan pola AB, AAB · _CP Fondasi (pola); NEL_                                 | kenalan, coba       | 20, 6            | Ada: Math Pra-TK M          | warna, bentuk                | lanjutkan pola             |
| P-MA-08 | Di atas, di bawah, di dalam | Kata posisi · _NEL bentuk & ruang_                                                  | cerita, coba        | 13, 1            | Ada: Math Pra-TK N          | rumah, mainan                | tempel stiker posisi       |
| P-MA-09 | Bentuk di sekitarku         | Mengenal lingkaran, segitiga, persegi, bangun ruang · _CP Fondasi; Common Core K.G_ | kenalan, kata, coba | 1, 7, 15         | Ada: Math Pra-TK P, Q, R, S | benda rumah                  | warnai bentuk              |
| P-MA-10 | Besar-kecil, panjang-pendek | Membandingkan ukuran · _CP Fondasi (ukur)_                                          | kenalan, coba       | 6, 17            | Ada: Math Pra-TK T          | hewan, benda                 | lingkari yang lebih besar  |
| P-MA-11 | Sama, beda, kelompokkan     | Mengklasifikasi benda · _CP Fondasi (klasifikasi)_                                  | kenalan, coba       | 7, 15            | Ada: Math Pra-TK O          | semua tema T1                | gunting & kelompokkan      |
| P-MA-12 | Tambah dan kurang sampai 5  | Menggabung dan mengambil benda · _EYFS; Common Core K.OA_                           | cerita, coba        | 3, 4, 18         | Ada: Math Pra-TK V, X       | makanan, hewan               | hitung gambar              |
| P-MA-13 | Uang Rupiah                 | Mengenal koin dan uang kertas · _Konteks lokal_                                     | kenalan, kata       | 1, 7             | Ada: Math Pra-TK U          | pasar, jajanan               | cocokkan uang              |
| P-MA-14 | Pagi, siang, malam          | Kesadaran waktu dalam kegiatan · _CP Fondasi (waktu)_                               | cerita, kata        | 6, 1             | BARU 10 level               | kegiatan sehari-hari, langit | urutkan kegiatan           |

#### Pra-TK · English (13 unit)

| Kode    | Unit                        | Tujuan · rujukan                                           | Belajar (layar) | Berlatih (model) | Tantangan (soal)                     | Tema kosakata   | Worksheet cetak     |
| ------- | --------------------------- | ---------------------------------------------------------- | --------------- | ---------------- | ------------------------------------ | --------------- | ------------------- |
| P-EN-01 | Hello! Greetings & feelings | Salam dan perasaan sederhana · _Cambridge Pre A1 Starters_ | kata, bunyi     | 1, 21            | BARU 10 level                        | perasaan        | cocokkan wajah      |
| P-EN-02 | Letters A–Z                 | Nama huruf A–Z · _NEL L&L; Starters_                       | kenalan, bunyi  | 2, 8             | Ada: English Pra-TK A, B, C, D, E, F | kata contoh A–Z | tebalkan huruf      |
| P-EN-03 | Big and small letters       | Huruf besar dan kecil · _NEL L&L_                          | kenalan, coba   | 8, 10            | Ada: English Pra-TK G                | kata contoh     | cocokkan Aa         |
| P-EN-04 | Sounds around me            | Bunyi awal kata · _L&S Phase 1–2_                          | bunyi, kata     | 1, 8             | Ada: English Pra-TK L, M, N          | hewan, makanan  | lingkari bunyi awal |
| P-EN-05 | Rhymes and syllables        | Rima dan suku kata · _L&S Phase 1_                         | bunyi, kata     | 1, 14            | Ada: English Pra-TK I, J, K          | benda           | cocokkan rima       |
| P-EN-06 | Colours and shapes          | Kata warna dan bentuk · _Starters_                         | kata, coba      | 1, 7             | Ada: English Pra-TK V                | warna, bentuk   | warnai sesuai kata  |
| P-EN-07 | Numbers 1–10                | Kata bilangan · _Starters_                                 | kata, coba      | 3, 8             | Ada: English Pra-TK W                | buah, mainan    | hitung & tulis      |
| P-EN-08 | My body                     | Anggota tubuh · _Starters (body & face)_                   | kata, cerita    | 1, 13            | BARU 10 level                        | tubuh           | tunjuk & tempel     |
| P-EN-09 | Animals                     | Hewan · _Starters (animals)_                               | kata, bunyi     | 1, 14, 7         | BARU 10 level                        | hewan           | kartu memori        |
| P-EN-10 | Food and fruit              | Makanan dan buah · _Starters (food & drink)_               | kata            | 1, 7, 14         | BARU 10 level                        | buah, makanan   | kelompokkan         |
| P-EN-11 | Action words                | Kata kerja · _Starters_                                    | kata, cerita    | 1, 13            | Ada: English Pra-TK Y                | kegiatan        | cocokkan gerak      |
| P-EN-12 | In, on, under               | Kata posisi · _Starters (prepositions)_                    | cerita, coba    | 23, 13           | Ada: English Pra-TK AA               | rumah, mainan   | tempel posisi       |
| P-EN-13 | Opposites and categories    | Lawan kata dan kelompok · _Starters; NEL_                  | kata, coba      | 7, 15            | Ada: English Pra-TK BB, CC, Z        | semua tema      | kelompokkan         |

#### Pra-TK · Sains (9 unit)

| Kode    | Unit                    | Tujuan · rujukan                                                            | Belajar (layar)     | Berlatih (model) | Tantangan (soal) | Tema kosakata            | Worksheet cetak           |
| ------- | ----------------------- | --------------------------------------------------------------------------- | ------------------- | ---------------- | ---------------- | ------------------------ | ------------------------- |
| P-SA-01 | Tubuhku dan panca indra | Mata melihat, telinga mendengar, dst. · _CP Fondasi sains; NEL Discovery_   | kenalan, kata, coba | 8, 1             | BARU 10 level    | tubuh, indra             | tarik garis indra ↔ benda |
| P-SA-02 | Hewan di sekitarku      | Nama, suara, dan tempat hidup hewan · _CP Fondasi sains_                    | kata, bunyi         | 1, 7, 14         | BARU 10 level    | hewan peliharaan, ternak | cocokkan rumah hewan      |
| P-SA-03 | Tumbuhan dan buah       | Bagian tumbuhan sederhana, buah lokal · _CP Fondasi sains_                  | kata, cerita        | 1, 7             | BARU 10 level    | buah, sayur, tanaman     | warnai buah               |
| P-SA-04 | Panas dan dingin        | Merasakan suhu benda · _CP Fondasi sains_                                   | kenalan, coba       | 7, 1             | BARU 10 level    | dapur, minuman, alam     | kelompokkan panas/dingin  |
| P-SA-05 | Cuaca hari ini          | Cerah, hujan, berawan, berangin · _CP Fondasi sains_                        | kata, cerita        | 1, 8             | BARU 10 level    | cuaca, pakaian           | cocokkan pakaian ↔ cuaca  |
| P-SA-06 | Siang dan malam         | Matahari, bulan, bintang · _CP Fondasi sains_                               | kata, cerita        | 7, 1             | BARU 10 level    | langit                   | kelompokkan siang/malam   |
| P-SA-07 | Tenggelam dan terapung  | Menduga lalu mengamati · _NEL Discovery (inquiry)_                          | cerita, coba        | 7, 1             | BARU 10 level    | benda rumah              | kelompokkan               |
| P-SA-08 | Air, es, dan uap        | Benda bisa berubah wujud · _CP Fondasi sains_                               | cerita, kata        | 6, 7             | BARU 10 level    | dapur, alam              | urutkan perubahan         |
| P-SA-09 | Bersih dan sehat        | Cuci tangan, sikat gigi, buang sampah · _CP Fondasi (jati diri, kesehatan)_ | cerita, coba        | 6, 15            | BARU 10 level    | kamar mandi, kegiatan    | urutkan langkah           |

### TK

#### TK · Baca Tulis (12 unit)

| Kode    | Unit                             | Tujuan · rujukan                                                    | Belajar (layar)            | Berlatih (model) | Tantangan (soal) | Tema kosakata         | Worksheet cetak    |
| ------- | -------------------------------- | ------------------------------------------------------------------- | -------------------------- | ---------------- | ---------------- | --------------------- | ------------------ |
| K-BT-01 | Huruf m, n, s, t, k, l           | Konsonan yang sering dipakai · _Metode suku kata_                   | kenalan, bunyi, kata, coba | 2, 8, 10         | BARU 10 level    | Kamus T1              | tebalkan huruf     |
| K-BT-02 | Huruf g, h, j, r, w, y, d        | Konsonan berikutnya · _Metode suku kata_                            | kenalan, bunyi, kata, coba | 2, 8, 10         | BARU 10 level    | Kamus T1              | tebalkan huruf     |
| K-BT-03 | Huruf c, f, v, z, q, x           | Konsonan jarang · _Metode suku kata_                                | kenalan, kata, coba        | 2, 8, 10         | BARU 10 level    | Kamus T2              | tebalkan huruf     |
| K-BT-04 | b, d, p yang mirip               | Membedakan huruf yang sering tertukar · _Praktik membaca permulaan_ | kenalan, coba              | 15, 2, 10        | BARU 10 level    | kata contoh           | lingkari huruf     |
| K-BT-05 | Huruf besar dan kecil            | Pasangan A-a sampai Z-z · _CP Fondasi literasi_                     | kenalan, coba              | 8, 14            | BARU 10 level    | kata contoh           | cocokkan Aa        |
| K-BT-06 | Suku kata ba-bi-bu-be-bo         | Suku kata terbuka dengan b, m, p, s · _Metode suku kata / SAS_      | bunyi, gabung              | 1, 2, 12         | BARU 10 level    | Kamus T1              | baca suku kata     |
| K-BT-07 | Suku kata ka, la, ta, da, na, ra | Suku kata terbuka berikutnya · _Metode suku kata_                   | bunyi, gabung              | 1, 2, 12         | BARU 10 level    | Kamus T1              | baca suku kata     |
| K-BT-08 | Gabung jadi kata (bo-la)         | Menggabung dua suku kata menjadi kata · _Metode suku kata / SAS_    | gabung, kata               | 12, 22           | BARU 10 level    | Kamus T1 (kata KV-KV) | gabung & gambar    |
| K-BT-09 | Membaca kata bergambar           | Membaca kata KV-KV lalu memilih gambarnya · _SAS_                   | kata, coba                 | 22, 14           | BARU 10 level    | Kamus T1              | baca & cocokkan    |
| K-BT-10 | Menyusun kata                    | Menyusun huruf/suku kata menjadi kata · _Metode suku kata_          | gabung, coba               | 11, 12           | BARU 10 level    | Kamus T1              | isi huruf hilang   |
| K-BT-11 | Menebalkan huruf kecil a–z       | Menulis huruf kecil sesuai urutan goresan · _CP Fondasi motorik_    | kenalan, coba              | 10               | BARU 10 level    | -                     | tebalkan huruf a–z |
| K-BT-12 | Kalimat pertamaku (ini bola)     | Membaca kalimat 2–3 kata · _SAS (kalimat → kata)_                   | cerita, gabung             | 13, 22, 24       | BARU 10 level    | mainan, rumah         | baca & tunjuk      |

#### TK · Berhitung (17 unit)

| Kode    | Unit                             | Tujuan · rujukan                                                            | Belajar (layar)       | Berlatih (model) | Tantangan (soal)                           | Tema kosakata            | Worksheet cetak      |
| ------- | -------------------------------- | --------------------------------------------------------------------------- | --------------------- | ---------------- | ------------------------------------------ | ------------------------ | -------------------- |
| K-MA-01 | Bilangan sampai 10 dan namanya   | Membilang, lambang, dan nama bilangan · _CP Fondasi; Common Core K.CC_      | kenalan, kata         | 3, 4, 8          | Ada: Math Kindergarten (TK) I, J, L        | Kamus T1                 | hitung & tulis       |
| K-MA-02 | Lihat sekilas dan kerangka 10    | Subitising sampai 10 dengan kerangka 5/10 · _EYFS; NEL_                     | kenalan, coba         | 16, 4            | BARU 10 level                              | titik, buah              | kartu titik          |
| K-MA-03 | Bagian dan keseluruhan           | Number bond 5 dan 10 · _EYFS Number; Common Core K.OA.3–4_                  | kenalan, gabung, coba | 18, 4            | Ada: Math Kindergarten (TK) P, T           | buah, mainan             | lengkapi number bond |
| K-MA-04 | Penjumlahan sampai 10            | Makna dan strategi penjumlahan · _Common Core K.OA_                         | cerita, coba          | 3, 18, 9         | Ada: Math Kindergarten (TK) R, S, U        | makanan, hewan           | hitung gambar        |
| K-MA-05 | Pengurangan sampai 10            | Makna dan strategi pengurangan · _Common Core K.OA_                         | cerita, coba          | 3, 18, 9         | Ada: Math Kindergarten (TK) Y, Z, AA       | makanan, hewan           | coret & hitung       |
| K-MA-06 | Dobel                            | 1+1 sampai 5+5 · _EYFS Number_                                              | kenalan, coba         | 3, 8, 18         | BARU 10 level                              | kupu-kupu, sepatu, sayap | cermin & hitung      |
| K-MA-07 | Ganjil dan genap                 | Berpasangan atau ada sisa · _EYFS Numerical Patterns_                       | kenalan, coba         | 7, 2             | BARU 10 level                              | kaus kaki, sepatu        | pasangkan            |
| K-MA-08 | Bilangan 11 sampai 20            | Belasan = sepuluh dan sekian · _Common Core K.NBT_                          | kenalan, coba         | 4, 5, 3          | Ada: Math Kindergarten (TK) DD, EE, II     | Kamus T1                 | hitung & tulis       |
| K-MA-09 | Membilang sampai 100             | Loncat sepuluh · _Common Core K.CC.1_                                       | kenalan, coba         | 5, 19            | Ada: Math Kindergarten (TK) JJ, KK, LL     | -                        | labirin angka        |
| K-MA-10 | Pertama sampai kesepuluh         | Bilangan urutan · _Common Core; NEL_                                        | cerita, coba          | 13, 6            | BARU 10 level                              | kendaraan, lomba         | warnai urutan        |
| K-MA-11 | Pola dan labirin bilangan        | Pola gambar dan pola bilangan · _NEL relasi & pola; CP Fondasi_             | kenalan, coba         | 20, 19           | Ada: Math Kindergarten (TK) MM             | warna, bentuk            | lanjutkan pola       |
| K-MA-12 | Bangun datar, ruang, dan simetri | Mengenal dan menyusun bangun · _Common Core K.G; NEL_                       | kenalan, kata, coba   | 1, 7, 15         | Ada: Math Kindergarten (TK) PP, QQ, RR, SS | benda rumah              | warnai & cerminkan   |
| K-MA-13 | Mengukur dan menimbang           | Panjang, berat, isi · _Common Core K.MD; NEL_                               | kenalan, coba         | 17, 6            | Ada: Math Kindergarten (TK) WW             | dapur, buah              | lingkari lebih berat |
| K-MA-14 | Waktu dan hari                   | Urutan kegiatan, nama hari · _CP Fondasi (waktu)_                           | cerita, kata          | 6, 1             | Ada: Math Kindergarten (TK) XX             | kegiatan sehari-hari     | urutkan hari         |
| K-MA-15 | Uang dan menabung                | Uang Rupiah dan literasi keuangan · _Konteks lokal_                         | cerita, kata          | 1, 3             | Ada: Math Kindergarten (TK) YY, ZZ         | pasar, jajanan           | belanja pura-pura    |
| K-MA-16 | Data dan grafik                  | Mengelompokkan lalu menghitung · _Common Core K.MD.3_                       | kenalan, coba         | 7, 3             | Ada: Math Kindergarten (TK) UU, VV         | buah, mainan             | isi tabel turus      |
| K-MA-17 | Matematika di sekitarku          | Membilang dan membandingkan di pasar, dapur, kebun · _CP Fondasi (konkret)_ | cerita, coba          | 13, 3, 24        | BARU 10 level                              | pasar, dapur, kebun      | cari & hitung        |

#### TK · English (15 unit)

| Kode    | Unit                        | Tujuan · rujukan                                                  | Belajar (layar)   | Berlatih (model) | Tantangan (soal)               | Tema kosakata       | Worksheet cetak        |
| ------- | --------------------------- | ----------------------------------------------------------------- | ----------------- | ---------------- | ------------------------------ | ------------------- | ---------------------- |
| K-EN-01 | Phonics s, a, t, p, i, n    | Bunyi huruf dan kata CVC pertama · _L&S Phase 2_                  | bunyi, kata, coba | 1, 11, 10        | BARU 10 level                  | kata CVC            | tebalkan & baca        |
| K-EN-02 | Phonics m, d, g, o, c, k    | Bunyi huruf lanjutan · _L&S Phase 2_                              | bunyi, kata       | 1, 11            | BARU 10 level                  | kata CVC            | baca & cocokkan        |
| K-EN-03 | Phonics e, u, r, h, b, f, l | Bunyi huruf lanjutan · _L&S Phase 2_                              | bunyi, kata       | 1, 11            | BARU 10 level                  | kata CVC            | baca & cocokkan        |
| K-EN-04 | CVC words a, e, i, o, u     | Membaca kata tiga bunyi · _L&S Phase 2_                           | gabung, kata      | 11, 22           | Ada: English Pra-TK O, P, Q, R | kata CVC            | baca & gambar          |
| K-EN-05 | sh, ch, th, ng              | Digraf konsonan · _L&S Phase 3_                                   | bunyi, kata       | 1, 11, 7         | BARU 10 level                  | kata digraf         | kelompokkan            |
| K-EN-06 | ai, ee, oa, oo              | Digraf vokal · _L&S Phase 3_                                      | bunyi, kata       | 1, 11            | BARU 10 level                  | kata digraf         | baca & cocokkan        |
| K-EN-07 | Sight words 1–2             | Kata frekuensi tinggi (Dolch pre-primer) · _Dolch pre-primer_     | kata, coba        | 2, 14            | Ada: English Pra-TK S, T       | -                   | cari kata              |
| K-EN-08 | Sight words 3–4             | Dolch primer · _Dolch primer; Fry 100_                            | kata, coba        | 2, 14            | BARU 10 level                  | -                   | cari kata              |
| K-EN-09 | My family and home          | Keluarga dan ruangan rumah · _Starters (family, home)_            | kata, cerita      | 1, 13            | BARU 10 level                  | keluarga, rumah     | tempel di rumah        |
| K-EN-10 | School and toys             | Alat sekolah dan mainan · _Starters (school, toys)_               | kata              | 1, 7, 14         | BARU 10 level                  | sekolah, mainan     | kelompokkan            |
| K-EN-11 | Clothes and weather         | Pakaian dan cuaca · _Starters (clothes, weather)_                 | kata, cerita      | 1, 8             | BARU 10 level                  | pakaian, cuaca      | cocokkan               |
| K-EN-12 | Transport and places        | Kendaraan dan tempat · _Starters (transport)_                     | kata              | 1, 7             | BARU 10 level                  | kendaraan, tempat   | kelompokkan            |
| K-EN-13 | This/that, is/are, plurals  | Tata bahasa dasar · _Starters grammar_                            | cerita, coba      | 21, 1            | Ada: English Pra-TK X          | semua tema          | lingkari               |
| K-EN-14 | I can… / There is…          | Kalimat pendek · _Starters grammar_                               | cerita, coba      | 23, 24           | BARU 10 level                  | kegiatan, rumah     | baca & tunjuk          |
| K-EN-15 | Listen and find             | Mendengar kalimat lalu menemukan di gambar · _Starters Listening_ | cerita            | 23, 13           | BARU 10 level                  | adegan rumah, taman | warnai sesuai perintah |

#### TK · Sains (13 unit)

| Kode    | Unit                   | Tujuan · rujukan                                                                            | Belajar (layar)             | Berlatih (model) | Tantangan (soal)               | Tema kosakata        | Worksheet cetak     |
| ------- | ---------------------- | ------------------------------------------------------------------------------------------- | --------------------------- | ---------------- | ------------------------------ | -------------------- | ------------------- |
| K-SA-01 | Bentuk dan warna       | Mengamati, membandingkan, menduga · _NGSS K; Cambridge Primary Science Stage 1; CP Fondasi_ | kenalan, kata, cerita, coba | 1, 7, 13         | Ada: Sains Kindergarten (TK) A | warna, bentuk        | amati & kelompokkan |
| K-SA-02 | Bahan benda            | Mengamati, membandingkan, menduga · _NGSS K; Cambridge Primary Science Stage 1; CP Fondasi_ | kenalan, kata, cerita, coba | 1, 7, 13         | Ada: Sains Kindergarten (TK) B | benda rumah          | amati & kelompokkan |
| K-SA-03 | Benda padat dan cair   | Mengamati, membandingkan, menduga · _NGSS K; Cambridge Primary Science Stage 1; CP Fondasi_ | kenalan, kata, cerita, coba | 1, 7, 13         | Ada: Sains Kindergarten (TK) D | dapur                | amati & kelompokkan |
| K-SA-04 | Cahaya dan bunyi       | Mengamati, membandingkan, menduga · _NGSS K; Cambridge Primary Science Stage 1; CP Fondasi_ | kenalan, kata, cerita, coba | 1, 7, 13         | Ada: Sains Kindergarten (TK) E | alat musik, lampu    | amati & kelompokkan |
| K-SA-05 | Gaya dan gerak         | Mengamati, membandingkan, menduga · _NGSS K; Cambridge Primary Science Stage 1; CP Fondasi_ | kenalan, kata, cerita, coba | 1, 7, 13         | Ada: Sains Kindergarten (TK) F | mainan, kendaraan    | amati & kelompokkan |
| K-SA-06 | Hewan                  | Mengamati, membandingkan, menduga · _NGSS K; Cambridge Primary Science Stage 1; CP Fondasi_ | kenalan, kata, cerita, coba | 1, 7, 13         | Ada: Sains Kindergarten (TK) G | hewan                | amati & kelompokkan |
| K-SA-07 | Tumbuhan               | Mengamati, membandingkan, menduga · _NGSS K; Cambridge Primary Science Stage 1; CP Fondasi_ | kenalan, kata, cerita, coba | 1, 7, 13         | Ada: Sains Kindergarten (TK) H | tanaman, buah, sayur | amati & kelompokkan |
| K-SA-08 | Cuaca                  | Mengamati, membandingkan, menduga · _NGSS K; Cambridge Primary Science Stage 1; CP Fondasi_ | kenalan, kata, cerita, coba | 1, 7, 13         | Ada: Sains Kindergarten (TK) M | cuaca, pakaian       | amati & kelompokkan |
| K-SA-09 | Langit siang dan malam | Mengamati, membandingkan, menduga · _NGSS K; Cambridge Primary Science Stage 1; CP Fondasi_ | kenalan, kata, cerita, coba | 1, 7, 13         | Ada: Sains Kindergarten (TK) N | langit               | amati & kelompokkan |
| K-SA-10 | Menjaga lingkungan     | Mengamati, membandingkan, menduga · _NGSS K; Cambridge Primary Science Stage 1; CP Fondasi_ | kenalan, kata, cerita, coba | 1, 7, 13         | Ada: Sains Kindergarten (TK) L | sampah, alam         | amati & kelompokkan |
| K-SA-11 | Merancang dan menguji  | Mengamati, membandingkan, menduga · _NGSS K; Cambridge Primary Science Stage 1; CP Fondasi_ | kenalan, kata, cerita, coba | 1, 7, 13         | Ada: Sains Kindergarten (TK) O | alat, bahan          | amati & kelompokkan |
| K-SA-12 | Tubuh dan panca indra  | Bagian tubuh dan fungsi indra · _CP Fondasi; NEL Discovery_                                 | kenalan, kata, coba         | 8, 13            | BARU 10 level                  | tubuh, indra         | tarik garis         |
| K-SA-13 | Makanan sehat          | Mengelompokkan makanan, minum air · _CP Fondasi (kesehatan)_                                | kata, cerita                | 7, 15            | BARU 10 level                  | makanan, minuman     | isi piring sehat    |

### Kelas 1

#### Kelas 1 · Baca Tulis (12 unit)

| Kode    | Unit                           | Tujuan · rujukan                                                      | Belajar (layar) | Berlatih (model) | Tantangan (soal) | Tema kosakata     | Worksheet cetak      |
| ------- | ------------------------------ | --------------------------------------------------------------------- | --------------- | ---------------- | ---------------- | ----------------- | -------------------- |
| 1-BT-01 | Kata tiga suku kata (se-pa-tu) | Membaca kata KV-KV-KV · _B. Indonesia Fase A; SAS_                    | gabung, kata    | 12, 22, 11       | BARU 10 level    | Kamus T2          | baca & gambar        |
| 1-BT-02 | Suku kata tertutup (ba-tuk)    | Suku kata berakhiran konsonan · _B. Indonesia Fase A_                 | bunyi, gabung   | 12, 11           | BARU 10 level    | Kamus T2          | isi suku kata        |
| 1-BT-03 | ng, ny, kh, sy                 | Gabungan huruf konsonan · _B. Indonesia Fase A_                       | bunyi, kata     | 1, 11, 7         | BARU 10 level    | Kamus T2          | kelompokkan          |
| 1-BT-04 | ai, au, oi (pan-tai, pu-lau)   | Diftong · _B. Indonesia Fase A_                                       | bunyi, kata     | 1, 11            | BARU 10 level    | alam, tempat      | baca & cocokkan      |
| 1-BT-05 | Huruf kapital dan titik        | Awal kalimat, nama orang/tempat · _B. Indonesia Fase A (menulis)_     | kenalan, cerita | 2, 15            | BARU 10 level    | nama tempat, hari | perbaiki kalimat     |
| 1-BT-06 | Membaca kalimat 3–5 kata       | Membaca lancar kalimat pendek · _SAS; Fase A_                         | cerita          | 23, 24, 22       | BARU 10 level    | kegiatan          | baca & tunjuk        |
| 1-BT-07 | Cerita mini: siapa, di mana    | Memahami isi cerita pendek · _Fase A (membaca-memirsa)_               | cerita, ingat   | 24, 1            | BARU 10 level    | keluarga, tempat  | jawab pertanyaan     |
| 1-BT-08 | Menyusun kalimat               | Mengurutkan kata menjadi kalimat · _Fase A (menulis)_                 | gabung, coba    | 6, 11            | BARU 10 level    | kegiatan          | urutkan kata         |
| 1-BT-09 | Kata tanya apa, siapa, di mana | Memahami pertanyaan · _Fase A (menyimak)_                             | cerita          | 1, 23            | BARU 10 level    | profesi, tempat   | cocokkan tanya-jawab |
| 1-BT-10 | Lawan kata dan persamaan kata  | Memperkaya kosakata · _Fase A; Biemiller_                             | kata, coba      | 8, 14            | BARU 10 level    | Kamus T2 (sifat)  | cocokkan lawan kata  |
| 1-BT-11 | Kata kerja sehari-hari         | Kegiatan di rumah dan sekolah · _Fase A_                              | kata, cerita    | 1, 13            | BARU 10 level    | kegiatan          | cocokkan gerak       |
| 1-BT-12 | Teks petunjuk                  | Mengurutkan langkah (cuci tangan, menanam) · _Fase A (teks prosedur)_ | cerita, coba    | 6, 24            | BARU 10 level    | kegiatan, tanaman | urutkan langkah      |

#### Kelas 1 · Berhitung (14 unit)

| Kode    | Unit                            | Tujuan · rujukan                                                                 | Belajar (layar)       | Berlatih (model) | Tantangan (soal)             | Tema kosakata | Worksheet cetak |
| ------- | ------------------------------- | -------------------------------------------------------------------------------- | --------------------- | ---------------- | ---------------------------- | ------------- | --------------- |
| 1-MA-01 | Bilangan sampai 120 dan loncat  | Memahami konsep lewat gambar lalu angka · _Matematika Fase A; Common Core 1.NBT_ | kenalan, cerita, coba | 3, 4, 5, 18, 9   | Ada: Math Grade 1 A, B, C    | Kamus T2      | lembar latihan  |
| 1-MA-02 | Nilai tempat puluhan dan satuan | Memahami konsep lewat gambar lalu angka · _Fase A; 1.NBT_                        | kenalan, cerita, coba | 3, 4, 5, 18, 9   | Ada: Math Grade 1 AA, BB     | Kamus T2      | lembar latihan  |
| 1-MA-03 | Strategi penjumlahan sampai 20  | Memahami konsep lewat gambar lalu angka · _Fase A; 1.OA_                         | kenalan, cerita, coba | 3, 4, 5, 18, 9   | Ada: Math Grade 1 E, F, P, Q | Kamus T2      | lembar latihan  |
| 1-MA-04 | Strategi pengurangan sampai 20  | Memahami konsep lewat gambar lalu angka · _Fase A; 1.OA_                         | kenalan, cerita, coba | 3, 4, 5, 18, 9   | Ada: Math Grade 1 I, J, S, T | Kamus T2      | lembar latihan  |
| 1-MA-05 | Soal cerita tambah dan kurang   | Memahami konsep lewat gambar lalu angka · _Fase A; 1.OA.1_                       | kenalan, cerita, coba | 3, 4, 5, 18, 9   | Ada: Math Grade 1 O, N, X    | Kamus T2      | lembar latihan  |
| 1-MA-06 | Kalimat matematika              | Memahami konsep lewat gambar lalu angka · _1.OA.7–8_                             | kenalan, cerita, coba | 3, 4, 5, 18, 9   | Ada: Math Grade 1 Y, Z       | Kamus T2      | lembar latihan  |
| 1-MA-07 | Tambah kurang puluhan           | Memahami konsep lewat gambar lalu angka · _1.NBT.4–6_                            | kenalan, cerita, coba | 3, 4, 5, 18, 9   | Ada: Math Grade 1 CC, DD     | Kamus T2      | lembar latihan  |
| 1-MA-08 | Mengukur panjang                | Memahami konsep lewat gambar lalu angka · _Fase A (pengukuran); 1.MD_            | kenalan, cerita, coba | 3, 4, 5, 18, 9   | Ada: Math Grade 1 EE         | Kamus T2      | lembar latihan  |
| 1-MA-09 | Jam, hari, dan bulan            | Memahami konsep lewat gambar lalu angka · _Fase A; 1.MD.3_                       | kenalan, cerita, coba | 3, 4, 5, 18, 9   | Ada: Math Grade 1 FF, GG     | Kamus T2      | lembar latihan  |
| 1-MA-10 | Uang dan literasi keuangan      | Memahami konsep lewat gambar lalu angka · _Konteks lokal_                        | kenalan, cerita, coba | 3, 4, 5, 18, 9   | Ada: Math Grade 1 HH, OO     | Kamus T2      | lembar latihan  |
| 1-MA-11 | Data dan diagram                | Memahami konsep lewat gambar lalu angka · _1.MD.4_                               | kenalan, cerita, coba | 3, 4, 5, 18, 9   | Ada: Math Grade 1 II, MM     | Kamus T2      | lembar latihan  |
| 1-MA-12 | Pola                            | Memahami konsep lewat gambar lalu angka · _Fase A (aljabar)_                     | kenalan, cerita, coba | 3, 4, 5, 18, 9   | Ada: Math Grade 1 JJ         | Kamus T2      | lembar latihan  |
| 1-MA-13 | Bangun datar dan ruang          | Memahami konsep lewat gambar lalu angka · _Fase A (geometri); 1.G_               | kenalan, cerita, coba | 3, 4, 5, 18, 9   | Ada: Math Grade 1 KK, LL     | Kamus T2      | lembar latihan  |
| 1-MA-14 | Setengah dan seperempat         | Memahami konsep lewat gambar lalu angka · _1.G.3_                                | kenalan, cerita, coba | 3, 4, 5, 18, 9   | Ada: Math Grade 1 NN         | Kamus T2      | lembar latihan  |

#### Kelas 1 · English (10 unit)

| Kode    | Unit                             | Tujuan · rujukan                                            | Belajar (layar)     | Berlatih (model) | Tantangan (soal) | Tema kosakata   | Worksheet cetak |
| ------- | -------------------------------- | ----------------------------------------------------------- | ------------------- | ---------------- | ---------------- | --------------- | --------------- |
| 1-EN-01 | Consonant blends (st, fr, cl)    | Membaca kata CCVC/CVCC · _L&S Phase 4_                      | bunyi, kata, cerita | 1, 11            | BARU 10 level    | kata blend      | baca & jawab    |
| 1-EN-02 | Magic e (a_e, i_e, o_e)          | Vokal panjang dengan e · _L&S Phase 5_                      | bunyi, kata, cerita | 1, 11, 22        | BARU 10 level    | kata a_e        | baca & jawab    |
| 1-EN-03 | Sight words grade 1              | Dolch grade 1 / Fry 100 · _Dolch; Fry_                      | bunyi, kata, cerita | 2, 14            | BARU 10 level    | -               | baca & jawab    |
| 1-EN-04 | Numbers 11–20 and age            | Bilangan dan bertanya umur · _Starters (numbers)_           | bunyi, kata, cerita | 3, 1             | BARU 10 level    | -               | baca & jawab    |
| 1-EN-05 | My day                           | Kegiatan harian, present simple · _Starters grammar_        | bunyi, kata, cerita | 24, 6            | BARU 10 level    | kegiatan        | baca & jawab    |
| 1-EN-06 | Likes and dislikes               | I like / I don't like · _Starters grammar_                  | bunyi, kata, cerita | 1, 21            | BARU 10 level    | makanan, mainan | baca & jawab    |
| 1-EN-07 | Have got / has got               | Kepemilikan · _Starters grammar_                            | bunyi, kata, cerita | 23, 13           | BARU 10 level    | hewan, mainan   | baca & jawab    |
| 1-EN-08 | Questions: what, where, how many | Pertanyaan sederhana · _Starters_                           | bunyi, kata, cerita | 23, 1            | BARU 10 level    | adegan          | baca & jawab    |
| 1-EN-09 | At the park / at the beach       | Kosakata tempat dan kegiatan · _Starters (world around us)_ | bunyi, kata, cerita | 13, 23           | BARU 10 level    | taman, pantai   | baca & jawab    |
| 1-EN-10 | Read a short story               | Memahami cerita 3–5 kalimat · _Starters Reading_            | bunyi, kata, cerita | 24               | BARU 10 level    | cerita          | baca & jawab    |

#### Kelas 1 · Sains (16 unit)

| Kode    | Unit                      | Tujuan · rujukan                                                                       | Belajar (layar)             | Berlatih (model) | Tantangan (soal)     | Tema kosakata  | Worksheet cetak     |
| ------- | ------------------------- | -------------------------------------------------------------------------------------- | --------------------------- | ---------------- | -------------------- | -------------- | ------------------- |
| 1-SA-01 | Bentuk dan warna          | Mengamati, mengelompokkan, menjelaskan · _NGSS 1; Cambridge Primary Science Stage 1–2_ | kenalan, kata, cerita, coba | 1, 7, 13, 24     | Ada: Sains Grade 1 A | warna          | amati & catat       |
| 1-SA-02 | Bahan benda               | Mengamati, mengelompokkan, menjelaskan · _NGSS 1; Cambridge Primary Science Stage 1–2_ | kenalan, kata, cerita, coba | 1, 7, 13, 24     | Ada: Sains Grade 1 B | benda          | amati & catat       |
| 1-SA-03 | Benda padat dan cair      | Mengamati, mengelompokkan, menjelaskan · _NGSS 1; Cambridge Primary Science Stage 1–2_ | kenalan, kata, cerita, coba | 1, 7, 13, 24     | Ada: Sains Grade 1 D | dapur          | amati & catat       |
| 1-SA-04 | Pemanasan dan pendinginan | Mengamati, mengelompokkan, menjelaskan · _NGSS 1; Cambridge Primary Science Stage 1–2_ | kenalan, kata, cerita, coba | 1, 7, 13, 24     | Ada: Sains Grade 1 E | dapur, cuaca   | amati & catat       |
| 1-SA-05 | Cahaya dan bunyi          | Mengamati, mengelompokkan, menjelaskan · _NGSS 1; Cambridge Primary Science Stage 1–2_ | kenalan, kata, cerita, coba | 1, 7, 13, 24     | Ada: Sains Grade 1 F | lampu, musik   | amati & catat       |
| 1-SA-06 | Gaya dan gerak            | Mengamati, mengelompokkan, menjelaskan · _NGSS 1; Cambridge Primary Science Stage 1–2_ | kenalan, kata, cerita, coba | 1, 7, 13, 24     | Ada: Sains Grade 1 G | mainan         | amati & catat       |
| 1-SA-07 | Hewan                     | Mengamati, mengelompokkan, menjelaskan · _NGSS 1; Cambridge Primary Science Stage 1–2_ | kenalan, kata, cerita, coba | 1, 7, 13, 24     | Ada: Sains Grade 1 H | hewan          | amati & catat       |
| 1-SA-08 | Tumbuhan                  | Mengamati, mengelompokkan, menjelaskan · _NGSS 1; Cambridge Primary Science Stage 1–2_ | kenalan, kata, cerita, coba | 1, 7, 13, 24     | Ada: Sains Grade 1 I | tanaman        | amati & catat       |
| 1-SA-09 | Makhluk hidup             | Mengamati, mengelompokkan, menjelaskan · _NGSS 1; Cambridge Primary Science Stage 1–2_ | kenalan, kata, cerita, coba | 1, 7, 13, 24     | Ada: Sains Grade 1 J | hewan, tanaman | amati & catat       |
| 1-SA-10 | Ekosistem                 | Mengamati, mengelompokkan, menjelaskan · _NGSS 1; Cambridge Primary Science Stage 1–2_ | kenalan, kata, cerita, coba | 1, 7, 13, 24     | Ada: Sains Grade 1 K | habitat        | amati & catat       |
| 1-SA-11 | Sumber daya bumi          | Mengamati, mengelompokkan, menjelaskan · _NGSS 1; Cambridge Primary Science Stage 1–2_ | kenalan, kata, cerita, coba | 1, 7, 13, 24     | Ada: Sains Grade 1 L | alam           | amati & catat       |
| 1-SA-12 | Menjaga lingkungan        | Mengamati, mengelompokkan, menjelaskan · _NGSS 1; Cambridge Primary Science Stage 1–2_ | kenalan, kata, cerita, coba | 1, 7, 13, 24     | Ada: Sains Grade 1 M | sampah         | amati & catat       |
| 1-SA-13 | Cuaca                     | Mengamati, mengelompokkan, menjelaskan · _NGSS 1; Cambridge Primary Science Stage 1–2_ | kenalan, kata, cerita, coba | 1, 7, 13, 24     | Ada: Sains Grade 1 N | cuaca          | amati & catat       |
| 1-SA-14 | Langit dan benda langit   | Mengamati, mengelompokkan, menjelaskan · _NGSS 1; Cambridge Primary Science Stage 1–2_ | kenalan, kata, cerita, coba | 1, 7, 13, 24     | Ada: Sains Grade 1 O | langit         | amati & catat       |
| 1-SA-15 | Merancang dan menguji     | Mengamati, mengelompokkan, menjelaskan · _NGSS 1; Cambridge Primary Science Stage 1–2_ | kenalan, kata, cerita, coba | 1, 7, 13, 24     | Ada: Sains Grade 1 P | alat           | amati & catat       |
| 1-SA-16 | Tubuhku tumbuh            | Bagian tubuh, gigi, dan pertumbuhan · _NGSS 1-LS; CP_                                  | kenalan, kata, cerita       | 8, 6             | BARU 10 level        | tubuh          | urutkan pertumbuhan |

## 7. Urutan kerja (tinggal generate setelah fondasi siap)

| Fase | Isi                                                                                                       | Hasil                                | Perkiraan  |
| ---- | --------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------- |
| G0   | Keputusan (bagian 8), catat keputusan baru                                                                | Arah disetujui                       | 2 hari     |
| G1   | Kamus Bergambar (skema + admin) dan **AI Gambar di admin** (kunci aman, batas biaya, Batch, grid, review) | Bisa generate gambar sendiri         | 2–3 minggu |
| G2   | Generate Kamus T1 (500 kata, 1.500 gambar), generator soal membaca kamus                                  | Soal yang ada langsung lebih beragam | 1 minggu   |
| G3   | Menu Belajar + pemutar pelajaran (7 layar) + Berlatih + model 10, 11, 12, 14, 16, 18                      | Kerangka siap diisi                  | 3–4 minggu |
| G4   | Isi Pra-TK (47 unit), lalu worksheet cetak di area orang tua                                              | Jenjang pertama lengkap              | 3 minggu   |
| G5   | Isi TK (57 unit), Kamus T2, model 13, 19, 23, 24                                                          | Jenjang kedua lengkap                | 4 minggu   |
| G6   | Isi Kelas 1 (52 unit), Kamus T3                                                                           | Tiga jenjang lengkap                 | 4 minggu   |

Setelah G1–G3 selesai, pekerjaan G4–G6 adalah **generate dari CSV**: admin memilih baris di
`docs/blueprint/menu-belajar.csv` (atau tabel yang sama di Studio), lalu sistem membuat draf pelajaran, latihan,
soal, dan gambar yang kurang. Admin cukup mereview.

## 8. Keputusan yang dibutuhkan

1. **AI Gambar di admin** dengan API key OpenAI milik Udakids, untuk membuat aset statis saja. Setuju?
2. **Model dan kualitas default:** `gpt-image-1-mini` medium + Batch + grid 2×2, dengan pratinjau low. Setuju?
3. **Batas biaya default:** misalnya US$5/hari dan US$50/bulan, bisa diubah admin dengan konfirmasi sandi.
4. **Penyimpanan gambar** di file server/object storage dengan data di PostgreSQL (bukan `bytea`). Setuju?
5. **Menu Belajar** (Belajar → Berlatih → Tantangan → Worksheet) sebagai menu utama Pra-TK, TK, Kelas 1. Setuju?
6. **Daftar 156 unit** di bagian 6, atau ada unit yang ingin ditambah, dihapus, atau dipindah jenjang?
7. **Worksheet cetak** di area orang tua (PDF). Setuju?
8. **Aturan "tanpa emoji":** tidak relevan lagi bila semua gambar dibuat sendiri dengan AI dalam gaya Udakids.
   Ini juga menggantikan usulan Fluent Emoji di rencana-worksheet-kosakata.
