# Rencana: Worksheet, Kamus Bergambar, dan Model Soal Pra-TK & TK (Math + English)

Status: **Usulan**, menunggu keputusan pemilik produk (bagian 9). Ditulis 2026-10-05.
Pembaca: pemilik produk, tim konten, dan tim pengembang Udakids.
Melengkapi [rencana-studio-soal.md](rencana-studio-soal.md) (Studio Konten, pelajaran dulu baru latihan).

> Pembaruan: sumber gambar dan Menu Belajar dirinci di
> [rencana-gudang-gambar-menu-belajar.md](rencana-gudang-gambar-menu-belajar.md). Gambar dibuat sendiri dengan AI
> dalam gaya Udakids, sehingga usulan Fluent Emoji di bagian 3.4 menjadi cadangan saja.

## 1. Ringkasan

Tiga masalah yang ingin diselesaikan:

1. **Gambar dan kosakata masih sedikit.** Udakids punya ±142 ilustrasi benda (112 + 30 dari D-062). Riset
   menunjukkan anak usia 5 tahun rata-rata mengenal ±2.300–4.700 kata dasar dan bertambah ±1.000 kata per tahun
   (Biemiller & Slonim). Pustaka gambar kita perlu tumbuh ke **ratusan lalu ribuan** kata.
2. **Model soal kurang beragam.** Saat ini ada 9 jenis interaksi. Anak cepat bosan bila bentuknya itu-itu saja.
3. **PDF materi menumpuk** dan belum bisa diolah sistem.

Usulan intinya:

- **Kamus Bergambar Udakids**: satu basis data kata (Indonesia + Inggris + gambar + suara) yang dipakai
  **otomatis** oleh semua generator soal dan pelajaran. Satu kata baru langsung memperkaya ratusan soal.
- **24 model soal** (9 sudah ada, 15 baru) yang dipetakan ke topik.
- **Peta topik Pra-TK & TK** untuk Math (memperkaya buku yang sudah ada) dan **English TK** (buku baru).
- **Pengolah PDF tanpa API key** memakai alat gratis di server, ditambah Kamus Bergambar sebagai "penerjemah"
  ke gaya Udakids (bagian 8).

## 2. Hasil riset: rujukan yang dipakai

| Bidang                   | Rujukan                                                                                                                 | Yang diambil                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Kurikulum nasional       | CP Fase Fondasi 2024 (Kemendikbudristek), elemen Dasar-dasar Literasi, Matematika, Sains, Teknologi, Rekayasa, dan Seni | Kesadaran bilangan, pola, bentuk dan ukuran, klasifikasi, kesadaran waktu, lewat benda konkret dan bermain |
| Kebijakan transisi       | Gerakan Transisi PAUD ke SD yang Menyenangkan (SE 0759/C/HK.04.01/2023)                                                 | Calistung tidak jadi syarat masuk SD. Pendekatan bermain, bukan drill                                      |
| Numerasi Singapura       | MOE Nurturing Early Learners (NEL) 2022, Educators' Guide Numeracy                                                      | Relasi dan pola, membilang dan number sense, bentuk dan ruang, angka ↔ banyak benda, data sederhana        |
| Numerasi Inggris         | EYFS Early Learning Goals: Number, Numerical Patterns                                                                   | Subitising sampai 5, komposisi bilangan sampai 10, number bond, dobel, ganjil-genap, membilang lewat 20    |
| Numerasi AS              | Common Core Kindergarten (5 domain)                                                                                     | Counting & Cardinality, Operations, bilangan 11–19, Measurement & Data, Geometry                           |
| Bahasa Inggris           | Cambridge Pre A1 Starters (±500 kata, 12 kelompok topik)                                                                | Daftar kata dan tata bahasa dasar, gaya soal bergambar                                                     |
| Fonik                    | Letters and Sounds (DfE) Phase 1–3, kerangka publik                                                                     | Urutan bunyi s-a-t-p-i-n…, CVC, digraf sh/ch/th/ng, vokal digraf ai/ee/oa/oo                               |
| Sight words              | Dolch pre-primer (40) dan primer (52), Fry 100 pertama                                                                  | Kata frekuensi tinggi untuk English TK                                                                     |
| Membaca bahasa Indonesia | Penelitian metode SAS dan metode suku kata (berbagai jurnal PGSD/PAUD)                                                  | Suku kata, kalimat → kata → suku kata → huruf, untuk buku Baca Tulis                                       |
| Kosakata anak            | Biemiller & Slonim; MacArthur-Bates CDI / Wordbank (ada adaptasi banyak bahasa)                                         | Target ukuran kosakata dan pemilihan kata yang dikenal anak lebih dulu                                     |

Semua rujukan hanya dipakai sebagai acuan tujuan belajar. Soal, gambar, dan program bermerek (Jolly Phonics, Little
Wandle, IXL, dll.) tidak disalin, sesuai aturan Udakids.

## 3. Kamus Bergambar Udakids

### 3.1 Isi satu entri kata

| Kolom          | Contoh                                               | Kegunaan                                        |
| -------------- | ---------------------------------------------------- | ----------------------------------------------- |
| `id`           | `apel`                                               | Kunci tetap, dipakai template soal              |
| kata Indonesia | apel                                                 | Teks dan suara id-ID                            |
| suku kata      | a-pel                                                | Pelajaran Baca Tulis (sorotan per suku kata)    |
| kata Inggris   | apple (UK)                                           | Buku English, suara en-GB                       |
| tema           | buah                                                 | Pengelompokan, soal "mana yang termasuk buah?"  |
| jenjang        | prek                                                 | Kata yang boleh muncul di Pra-TK / TK / Kelas 1 |
| atribut        | warna merah, bisa dihitung, ukuran kecil, rasa manis | Bahan soal klasifikasi, pengecoh, sains         |
| gambar         | `apel.svg` + sumber/lisensi                          | Tampil di soal, pelajaran, dan kartu kata       |
| suara          | klip id + en (cache TTS)                             | Dibuat sekali, offline                          |
| rujukan        | `cambridge-starters`, `cdi`                          | Bukti kurikulum                                 |

**Aturan mutu kata:** tidak ambigu secara gambar (bebek dan angsa tidak dipakai bersama sebagai pengecoh), huruf
awal jelas untuk soal huruf awal (hindari kata berawalan huruf mati yang dilafalkan berbeda), dan budaya lokal
(bakso, angklung, becak, rambutan, salak, wayang, delman).

### 3.2 Target jumlah

| Tahap | Jumlah kata | Isi                                                                                                  |
| ----- | ----------- | ---------------------------------------------------------------------------------------------------- |
| T1    | 500         | Kata konkret paling umum: benda, hewan, makanan, tubuh, keluarga, rumah, sekolah, kendaraan, warna   |
| T2    | 1.000       | Seluruh kosakata Cambridge Starters yang bergambar, kata kerja dan sifat bergambar, budaya Indonesia |
| T3    | 2.000+      | Profesi, tempat, alam dan cuaca, alat, alat musik, perasaan, kegiatan, kata untuk Baca Tulis Kelas 1 |

### 3.3 Tema (28 tema, mengikuti tema PAUD dan topik Starters)

Diriku dan tubuh · perasaan · keluarga · rumah dan perabot · dapur dan alat makan · makanan · buah · sayur ·
minuman · pakaian · sekolah dan alat tulis · mainan · hewan peliharaan · hewan ternak · hewan liar · hewan air ·
burung · serangga · tanaman · kendaraan darat · kendaraan air dan udara · tempat umum · profesi · alam dan
cuaca · langit dan antariksa · alat musik dan budaya Indonesia · kata kerja (kegiatan) · kata sifat dan lawan
kata.

### 3.4 Sumber gambar

Gambar harus **satu gaya** supaya rapi. Pilihan yang berlisensi untuk produk komersial:

| Sumber                              | Lisensi             | Jumlah             | Catatan                                                                            |
| ----------------------------------- | ------------------- | ------------------ | ---------------------------------------------------------------------------------- |
| Microsoft Fluent Emoji (Flat/Color) | MIT                 | ±1.500 gambar unik | Gaya konsisten, SVG, cocok untuk anak. Kekurangan: sedikit benda khas Indonesia    |
| Google Noto Emoji                   | Apache 2.0          | ±3.700             | Gaya bulat, SVG                                                                    |
| OpenMoji                            | CC BY-SA 4.0        | ±4.400             | **Share-alike**: turunan harus berlisensi sama. Kurang cocok untuk produk tertutup |
| Openclipart                         | CC0 (domain publik) | ±180.000           | Bebas, tapi gayanya campur aduk. Perlu kurasi berat                                |
| Kenney                              | CC0                 | ribuan (aset game) | Bagus untuk ikon dan objek game, kurang untuk kosakata sehari-hari                 |
| ARASAAC, Sclera                     | CC BY-NC            | ribuan             | **Tidak boleh**: non-komersial, sementara Udakids berbayar                         |
| Desainer / ilustrasi sendiri        | milik Udakids       | sesuai anggaran    | Wajib untuk benda khas Indonesia dan karakter Momo                                 |

**Rekomendasi:** satu pustaka dasar berlisensi longgar (Fluent Emoji gaya Flat, MIT) untuk ±1.000 kata pertama,
lalu diberi sentuhan gaya Udakids (garis tepi, palet warna). Ditambah ilustrasi sendiri untuk benda khas
Indonesia. Atribusi dan lisensi dicatat per gambar.

> Catatan kepatuhan: aturan UX anak berbunyi "tanpa emoji (pakai SVG)". Memakai **gambar SVG** yang berasal dari
> pustaka emoji bukan berarti menampilkan karakter emoji, tapi tetap perlu persetujuan dan dicatat sebagai
> keputusan.

## 4. Model soal (24 model)

Setiap model adalah satu tampilan interaksi yang dibuat sekali. Isinya diambil dari Kamus Bergambar dan template.

| #   | Model                          | Contoh                                        | Interaksi                                          | Status                     |
| --- | ------------------------------ | --------------------------------------------- | -------------------------------------------------- | -------------------------- |
| 1   | Dengar lalu pilih gambar       | "Ketuk gambar _apel_"                         | `pick-one`                                         | Ada                        |
| 2   | Ketuk semua                    | Ketuk semua huruf "a"                         | `tap-all`                                          | Ada                        |
| 3   | Hitung lalu pilih angka        | 4 potong daging → 4                           | `pick-one`                                         | Ada                        |
| 4   | Susun benda / kubus            | Buat 7 dengan kubus                           | `build`                                            | Ada                        |
| 5   | Garis bilangan                 | Lompat ke 8                                   | `number-line`                                      | Ada                        |
| 6   | Urutkan                        | Kecil → besar, urutan cerita                  | `order`                                            | Ada                        |
| 7   | Kelompokkan                    | Buah / sayur                                  | `group`                                            | Ada                        |
| 8   | Pasangkan                      | Jari ↔ angka, gambar ↔ huruf awal             | `match`                                            | Ada                        |
| 9   | Isian angka                    | 3 + 2 = ?                                     | `number-input`                                     | Ada                        |
| 10  | **Tebalkan huruf/angka**       | Ikuti goresan bernomor                        | `trace`                                            | Baru                       |
| 11  | **Susun huruf jadi kata**      | Ketuk huruf: b-o-l-a                          | `spell`                                            | Baru                       |
| 12  | **Gabung suku kata**           | ba + ju = ?                                   | `pick-one` + animasi                               | Baru (tampilan)            |
| 13  | **Cari di gambar besar**       | "Ketuk kucing di bawah meja" pada satu adegan | `scene-tap`                                        | Baru                       |
| 14  | **Kartu memori**               | Balik dua kartu yang sama (gambar ↔ kata)     | `memory`                                           | Baru                       |
| 15  | **Yang berbeda**               | 3 buah dan 1 kendaraan                        | `pick-one`                                         | Baru (template)            |
| 16  | **Lihat sekilas** (subitising) | Titik tampil 1 detik, berapa banyaknya?       | `pick-one` + waktu tampil, bukan batas waktu jawab | Baru                       |
| 17  | **Timbangan**                  | Mana yang lebih berat?                        | `pick-one` + visual                                | Baru (visual)              |
| 18  | **Bagian-keseluruhan**         | 5 = 2 + ?                                     | `pick-one` / `build`                               | Baru (visual)              |
| 19  | **Labirin angka/huruf**        | Ketuk jalur 1 → 10                            | `path`                                             | Baru                       |
| 20  | **Lengkapi pola**              | merah-biru-merah-?                            | `pick-one`                                         | Ada (perlu variasi gambar) |
| 21  | **Benar atau tidak**           | "Ini _cat_?" + gambar kucing                  | `pick-one` ya/tidak                                | Ada                        |
| 22  | **Baca lalu pilih gambar**     | Kartu kata "bola" → gambar bola (TK/Kelas 1)  | `pick-one`                                         | Ada                        |
| 23  | **Dengar kalimat lalu ketuk**  | "The ball is under the chair"                 | `scene-tap`                                        | Baru                       |
| 24  | **Cerita mini**                | 3 gambar berurutan + pertanyaan               | `order` / `pick-one`                               | Baru (tampilan)            |

Semua model baru tetap mengikuti aturan anak: target sentuh ≥ 64 px, maksimal 4 pilihan di Basic, bisa dengan
ketuk saja (seret hanya opsional), tanpa batas waktu menjawab (model 16 hanya mengatur lama gambar tampil),
dan respons keliru yang lucu tanpa kata "salah".

## 5. Rencana Math Pra-TK & TK

Buku Math Pra-TK (25 topik) dan TK (52 topik) **sudah luas**. Jadi rencananya bukan buku baru, melainkan:

1. **Pelajaran di depan setiap topik** (bentuk "pelajaran dulu", lihat rencana Studio Konten).
2. **Gambar lebih beragam:** soal membilang dan cerita mengambil benda dari Kamus Bergambar (ribuan, bukan 112),
   jadi anak jarang melihat gambar yang sama.
3. **Topik baru dari celah kurikulum.** Topik berikut belum ada sebagai topik tersendiri:

| Topik baru                                    | Jenjang    | Rujukan                 | Model soal |
| --------------------------------------------- | ---------- | ----------------------- | ---------- |
| Lihat sekilas (subitising) 1–5                | Pra-TK, TK | EYFS, NEL               | 16         |
| Bagian dan keseluruhan, number bond 5 dan 10  | TK         | EYFS, Common Core OA    | 18, 4      |
| Dobel (1+1 sampai 5+5)                        | TK         | EYFS                    | 3, 8, 18   |
| Ganjil dan genap sampai 10                    | TK         | EYFS Numerical Patterns | 7, 2       |
| Bilangan urutan (pertama…kesepuluh)           | Pra-TK, TK | Common Core, NEL        | 13, 6      |
| Simetri sederhana                             | TK         | NEL bentuk dan ruang    | 1, 8       |
| Labirin dan pola bilangan                     | TK         | NEL relasi dan pola     | 19, 20     |
| Matematika di sekitarku (pasar, dapur, kebun) | TK         | CP Fase Fondasi         | 13, 3, 24  |

Perkiraan: 8 topik × 10 level = **80 level baru**, ditambah pelajaran untuk 77 topik yang ada.

## 6. Rencana English Pra-TK & TK

**English Pra-TK** (29 topik, sudah ada) diperkaya dengan Kamus Bergambar (kata Starters bergambar) dan model
baru 11, 13, 14, dan 23.

**English TK** (buku baru), sekitar 30 topik × 10 level = **300 level**:

| Kelompok               | Topik                                                                                                                         | Rujukan                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Fonik                  | s a t p · i n m d · g o c k · e u r · h b f l · CVC a/e/i/o/u · sh ch th ng · ai ee oa oo                                     | Letters and Sounds Phase 2–3 |
| Membaca                | Menggabung CVC · kata bergambar · sight words 1–4 (Dolch pre-primer + primer) · kalimat 3–5 kata · cerita mini                | Dolch, Fry, NEL              |
| Kosakata (Starters)    | Animals · Body · Clothes · Colours · Family · Food & drink · Home · Numbers 1–20 · School · Toys · Transport · Weather        | Cambridge Pre A1 Starters    |
| Tata bahasa (Starters) | this/that · is/are · plural · can/can't · have got · there is/are · in/on/under/next to/behind/in front of · adjective + noun | Cambridge Pre A1 Starters    |
| Mendengar & memahami   | Dengar kalimat lalu ketuk (23) · ikuti perintah · tanya jawab who/what/where                                                  | Cambridge, NEL               |

Aturan D-062 tetap berlaku: perintah dan narasi Bahasa Indonesia, kata dan kalimat target English (en-GB).

## 7. Volume dan biaya kasar

| Item                      | T1                         | T2     |
| ------------------------- | -------------------------- | ------ |
| Kata di Kamus Bergambar   | 500                        | 1.000  |
| Klip suara baru (id + en) | ±1.000                     | ±2.000 |
| Level baru Math           | 80                         | 80     |
| Level baru English TK     | 150                        | 300    |
| Model soal baru dibangun  | 6 (10, 11, 14, 15, 16, 18) | 15     |

Biaya TTS kecil karena klip dibuat sekali lalu di-cache (batas harian `TTS_DAILY_LIMIT` tetap berlaku). Biaya
terbesar adalah **ilustrasi khas Indonesia** dan waktu kurasi.

## 8. Tanpa API key: bisakah PostgreSQL mengolah PDF dan gambar?

**Jawaban singkat:** PostgreSQL sendiri **tidak bisa membaca** isi PDF atau memahami gambar. PostgreSQL adalah
tempat menyimpan dan mencari data. Tetapi **tanpa API key berbayar**, server Udakids bisa mengolah PDF cukup jauh
memakai alat gratis, lalu PostgreSQL menyimpan dan mencocokkan hasilnya.

### 8.1 Yang bisa dilakukan tanpa AI berbayar

| Langkah                         | Alat gratis di server                                                                                            | Hasil                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Pecah PDF jadi halaman          | Poppler `pdftoppm` (gambar halaman), `pdfimages`, `pdftotext`                                                    | Gambar per halaman, gambar tertanam, teks bila PDF berteks                                              |
| Baca teks dari gambar           | Tesseract OCR bahasa `ind` + `eng`                                                                               | Kata-kata di halaman ("Ayo cari huruf a", "apel", "ayam")                                               |
| Simpan dan cari                 | PostgreSQL: tabel sumber, pencarian teks, pencocokan mirip (`pg_trgm`)                                           | Halaman bisa dicari, kata dicocokkan walau OCR sedikit meleset                                          |
| **Terjemahkan ke gaya Udakids** | Kamus Bergambar + aturan pola                                                                                    | "apel, ayam, api, awan" dikenali sebagai kata di kamus → dibangun ulang dengan gambar dan suara Udakids |
| Kenali pola lembar kerja        | Aturan kata kunci: "cocokkan" → `match`, "lingkari/cari" → `tap-all`, "hitung" → membilang, "tebalkan" → `trace` | Usulan model soal per halaman                                                                           |
| Susun draf                      | Generator Udakids yang sudah ada                                                                                 | Draf pelajaran dan latihan, admin tinggal memeriksa                                                     |

Contoh nyata dengan lembar "huruf a" yang dikirim:

```text
PDF ─▶ pdftoppm ─▶ OCR: "apel", "ayam", "api", "awan", huruf "a"
     ─▶ cocokkan ke Kamus Bergambar: apel ✓ ayam ✓ api ✓ awan ✓
     ─▶ usulan: Pelajaran "Huruf a" (layar kenalan + kata a-pel, a-yam, a-pi, a-wan)
               Latihan: cari huruf a (tap-all), huruf awal (match), tebalkan a (trace)
     ─▶ semua gambar dan suara dari pustaka Udakids, bukan dari PDF
     ─▶ admin cek ─▶ terbit
```

Sisi bagusnya, gambar dari PDF **tidak pernah dipakai ulang**. Sistem hanya mengenali kata dan konsepnya, lalu
membangun ulang dengan aset Udakids. Ini sekaligus menyelesaikan masalah hak cipta.

### 8.2 Batasnya tanpa AI

- Gambar tanpa tulisan (misalnya gambar obeng tanpa label) tidak bisa dikenali. Admin memilih katanya dari
  kamus dengan beberapa ketukan.
- Instruksi bebas atau soal cerita panjang tidak bisa dipahami atau ditulis ulang secara otomatis.
- Narasi pelajaran baru tidak bisa dikarang otomatis. Sistem memakai kalimat pola ("Ini huruf a. A untuk apel."),
  dan admin bisa mengubahnya.
- Soal ambigu (seperti "selera rasa" dan "selera makan") tidak terdeteksi otomatis.

### 8.3 Pilihan AI tanpa API berbayar

| Pilihan                                      | Kebutuhan                               | Kegunaan                                  | Rekomendasi                                                                        |
| -------------------------------------------- | --------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| CLIP lewat Transformers.js (lokal, CPU)      | RAM ±2–4 GB, tanpa GPU, offline         | Menebak isi gambar dari daftar kata kamus | Layak, tahap 2                                                                     |
| Model visi-bahasa lokal (mis. Qwen2.5-VL 7B) | RAM ≥ 32 GB tanpa GPU, atau GPU 8–12 GB | Memahami halaman dan menulis draf         | Tidak di VPS sekarang (1–2 GB). Bisa di PC kantor ber-GPU sebagai pekerja terpisah |
| API berbayar (Claude, dll.)                  | API key + anggaran                      | Pemahaman penuh dan menulis draf natural  | Opsional nanti, memakai alur yang sama                                             |

### 8.4 Rekomendasi bertingkat

1. **Tingkat 1, tanpa AI (bisa mulai sekarang):** Poppler + Tesseract + Kamus Bergambar + aturan pola + editor
   pemetaan. Admin cukup unggah, sistem mengusulkan, dan admin mengonfirmasi dalam beberapa ketukan.
2. **Tingkat 2, AI lokal gratis:** CLIP untuk mengenali gambar tanpa label. VPS perlu dinaikkan ke ±4 GB RAM.
3. **Tingkat 3, opsional:** AI berbayar dipasang lewat adaptor yang sama bila anggaran tersedia. Tidak ada yang
   perlu dibangun ulang.

Di semua tingkat: PDF hanya terlihat oleh admin, tidak ada data anak yang diolah, dan tidak ada draf yang terbit
tanpa disetujui.

## 9. Urutan kerja yang diusulkan

| Fase | Isi                                                                                                | Perkiraan  |
| ---- | -------------------------------------------------------------------------------------------------- | ---------- |
| K0   | Keputusan (bagian 10), skema Kamus Bergambar di PostgreSQL, impor ±142 gambar yang ada             | ± 1 minggu |
| K1   | Kamus T1 (500 kata, gambar + suara), generator membaca kamus, admin kelola kamus                   | ± 3 minggu |
| K2   | Model soal baru gelombang 1: trace, spell, memory, yang berbeda, lihat sekilas, bagian-keseluruhan | ± 3 minggu |
| K3   | Pengolah PDF Tingkat 1 (Poppler + Tesseract + pencocokan kamus + editor pemetaan)                  | ± 2 minggu |
| K4   | Math: 8 topik baru + pelajaran. English TK gelombang 1 (fonik + kosakata, 150 level)               | ± 4 minggu |
| K5   | Kamus T2 (1.000 kata), model gelombang 2 (scene-tap, path, cerita mini), English TK lengkap        | ± 4 minggu |

Fase-fase ini berjalan bersama rencana Studio Konten. Fase 0 keduanya bisa digabung.

## 10. Keputusan yang dibutuhkan

1. **Kamus Bergambar** sebagai sumber kata dan gambar bersama di PostgreSQL. Setuju?
2. **Sumber gambar:** Fluent Emoji (MIT) gaya Flat sebagai dasar plus ilustrasi sendiri untuk benda khas
   Indonesia? Ini juga perlu pengecualian atas aturan "tanpa emoji", karena yang dipakai adalah gambar SVG.
3. **English TK** sebagai buku baru (±300 level) dengan urutan fonik Letters and Sounds dan kosakata Starters?
4. **8 topik Math baru** di bagian 5?
5. **Pengolah PDF Tingkat 1** tanpa AI berbayar lebih dulu, lalu menaikkan VPS ke 4 GB untuk Tingkat 2?
6. **Prioritas:** rekomendasi K0 → K1 → K2 → K3 → K4 → K5.
