# Rencana SEO dan Digital Marketing UdaKids

Status: **Usulan**, menunggu keputusan pemilik produk (bagian 9). Ditulis 2026-10-06.
Pembaca: pemilik produk, tim marketing, dan tim pengembang.

## 1. Ringkasan

Situs `kids.eduskul.my.id` saat ini **hampir tidak terbaca mesin pencari**. Penyebabnya teknis, bukan kualitas
produk. Rencananya tiga lapis:

1. **Fondasi teknis (2 minggu):** halaman publik dirender sebagai HTML, judul dan deskripsi per halaman,
   `robots.txt` dan `sitemap.xml` asli, data terstruktur, Search Console.
2. **Konten yang dicari orang tua dan guru (berjalan terus):** halaman per mapel dan jenjang, ratusan halaman topik
   dari katalog yang sudah ada, worksheet PDF gratis, dan artikel.
3. **Distribusi dan otoritas:** media sosial, komunitas WhatsApp, afiliasi, kerja sama sekolah, liputan media,
   dan (perlu keputusan) kehadiran di Play Store.

**Ekspektasi realistis:**

| Kata kunci                                                                                   | Target                                                         | Perkiraan waktu                   |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------- |
| Nama merek ("udakids")                                                                       | Peringkat 1                                                    | 2–6 minggu setelah fondasi teknis |
| Kata kunci panjang ("latihan soal penjumlahan TK online", "belajar suku kata online gratis") | Halaman 1                                                      | 2–4 bulan                         |
| Kata kunci menengah ("game edukasi anak TK", "aplikasi belajar calistung")                   | Halaman 1                                                      | 6–12 bulan                        |
| Kata kunci umum ("game anak", "platform anak")                                               | Sulit, dikuasai Play Store, portal game besar, dan media besar | 12 bulan+, bukan target awal      |

"Game anak" kebanyakan dicari orang yang ingin game hiburan, bukan belajar. Kata kunci yang lebih tepat dan lebih
mungkin dimenangkan adalah "game **edukasi** anak", "belajar … online", dan "latihan soal …".

## 2. Hasil audit (2026-10-06)

| Temuan                                                                      | Dampak                                                                                                                    | Prioritas |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------- |
| HTML halaman utama hanya ±1 KB berisi `<div id="root">` kosong (SPA)        | Google harus menjalankan JavaScript dulu, sedangkan Bing, WhatsApp, Facebook, dan AI search sering melihat halaman kosong | Tinggi    |
| `<title>` = "Little Coder", sedangkan merek yang dipakai adalah **UdaKids** | Pencarian "udakids" tidak cocok dengan judul halaman                                                                      | Tinggi    |
| Tidak ada meta description, Open Graph, atau gambar pratinjau               | Cuplikan di Google acak, dan link yang dibagikan di WA/IG tanpa gambar                                                    | Tinggi    |
| `/robots.txt` dan `/sitemap.xml` menjawab **200 dengan halaman aplikasi**   | Mesin pencari tidak punya peta situs. Ini juga "soft 404"                                                                 | Tinggi    |
| Semua alamat (termasuk yang tidak ada) menjawab 200                         | Halaman sampah bisa terindeks, `/play` dan `/admin` ikut dirayapi                                                         | Sedang    |
| Tidak ada data terstruktur (JSON-LD)                                        | Google kurang paham bahwa ini aplikasi edukasi                                                                            | Sedang    |
| Belum ada halaman konten yang bisa diindeks per mapel/topik                 | Tidak ada yang bisa muncul untuk kata kunci panjang                                                                       | Tinggi    |
| Domain berupa subdomain `kids.eduskul.my.id`                                | Dinilai Google sebagai situs terpisah dan mulai dari nol. Nama merek tidak ada di domain                                  | Keputusan |

## 3. Fase 1: Fondasi teknis (± 2 minggu)

| #   | Pekerjaan                                                                                                                                                     | Catatan kepatuhan                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | **Merek konsisten:** nama produk di `apps/web/src/config/app.ts` (`APP_NAME`) dan judul halaman memakai "UdaKids"                                             | Perlu keputusan (PRD A18: nama belum final)       |
| 2   | **Prerender halaman publik saat build:** landing, halaman mapel/jenjang, topik, artikel → HTML statis lengkap. Area `/play`, `/orang-tua`, `/admin` tetap SPA | Tanpa SSR server, tetap cocok dengan Nginx statis |
| 3   | **Meta per halaman:** `title` (≤ 60 huruf), `description` (≤ 155), `canonical`, Open Graph dan Twitter Card, gambar pratinjau 1200×630                        | –                                                 |
| 4   | **`robots.txt` asli:** izinkan halaman publik. `Disallow: /play /orang-tua /admin /fasilitator /laporan /api /r/`                                             | Area anak tidak diindeks                          |
| 5   | **`sitemap.xml` otomatis** dari halaman publik dan katalog, diperbarui saat build atau seed                                                                   | –                                                 |
| 6   | **Nginx:** header `X-Robots-Tag: noindex` untuk area login, dan 404 asli untuk alamat yang tidak dikenal                                                      | –                                                 |
| 7   | **JSON-LD:** `Organization`, `WebSite`, `WebApplication` (kategori `EducationalApplication`, harga dari paket), `Course` per buku, `BreadcrumbList`           | –                                                 |
| 8   | **Kecepatan (Core Web Vitals):** landing ringan (pisahkan kode area anak/admin), gambar WebP, cache Cloudflare untuk aset                                     | –                                                 |
| 9   | **Google Search Console + Bing Webmaster:** verifikasi lewat DNS Cloudflare, kirim sitemap, pantau indeks                                                     | –                                                 |
| 10  | **Analitik ramah privasi** (Umami atau Plausible di server sendiri, tanpa cookie) **hanya di halaman publik dan area orang tua**, tidak pernah di `/play`     | Data anak minimal (PRD A17, UU PDP)               |

## 4. Fase 2: Konten yang dicari (mulai minggu 3, berjalan terus)

### 4.1 Peta kata kunci → halaman

| Klaster          | Contoh kata kunci (bahasa Indonesia)                                                    | Halaman tujuan                           |
| ---------------- | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| Merek            | udakids, uda kids, momo udakids                                                         | Landing                                  |
| Game edukasi     | game edukasi anak TK, game edukasi anak online, game belajar anak gratis tanpa iklan    | `/game-edukasi-anak`                     |
| Calistung        | belajar calistung online, belajar membaca suku kata, belajar menulis huruf anak TK      | `/belajar/calistung-tk` (+ Menu Belajar) |
| Matematika       | latihan soal matematika TK, penjumlahan sampai 10, soal matematika kelas 1 SD           | `/belajar/matematika-tk`, halaman topik  |
| Sains            | soal IPA anak SD kelas 1, eksperimen sains anak TK, belajar sains anak                  | `/belajar/sains-sd`, halaman topik       |
| English          | belajar bahasa Inggris anak TK, huruf alfabet bahasa Inggris, phonics anak              | `/belajar/english-anak`                  |
| OSN dan lomba    | latihan soal OSN matematika SD, soal OSN TK, lomba matematika online anak               | `/latihan-osn`, halaman lomba live       |
| Worksheet        | lembar kerja TK pdf, worksheet anak TK gratis, lembar kerja calistung                   | `/worksheet/...` (unduhan PDF gratis)    |
| Orang tua        | aplikasi belajar anak tanpa iklan, aplikasi pantau belajar anak, cara anak suka belajar | Artikel + landing orang tua              |
| Guru dan sekolah | media pembelajaran interaktif TK, platform belajar untuk sekolah, kelas online TK       | `/untuk-sekolah` (fasilitator dan kelas) |

### 4.2 Halaman yang dibangun

1. **Halaman mapel × jenjang** (± 20 halaman): penjelasan, daftar topik, rujukan kurikulum, **contoh soal yang bisa
   langsung dicoba tanpa daftar** (memakai contoh soal Level 1 yang sudah ada di D-026), dan tombol daftar.
2. **Halaman topik otomatis dari katalog** (± 400+ halaman): misalnya "Latihan Penjumlahan sampai 10 untuk TK".
   Isinya diambil dari `intro` dan `tips` topik, contoh soal, dan level-levelnya. Setiap halaman harus punya isi
   unik dan berguna, bukan halaman tipis yang hanya berganti judul.
3. **Worksheet PDF gratis** per topik, dibuat dari data Menu Belajar (`docs/blueprint`). Ini magnet terkuat untuk
   pencarian "lembar kerja TK pdf" dan sumber backlink dari guru. Unduhan bisa langsung atau dengan email
   orang tua (opsional, dengan persetujuan).
4. **Artikel** 2 per minggu untuk orang tua dan guru, misalnya "Cara mengajari anak membaca dengan suku kata",
   "10 permainan berhitung di rumah", "Contoh soal OSN matematika kelas 1 dan pembahasannya". Setiap artikel
   menautkan ke halaman topik terkait.
5. **Halaman "Untuk Sekolah"**: kelas, dashboard fasilitator realtime, lomba live, dan formulir kerja sama.

## 5. Fase 3: Distribusi dan otoritas (mulai minggu 3)

| Kanal                             | Aksi                                                                                                                                        | Catatan kepatuhan                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Instagram, TikTok, YouTube Shorts | 3–5 konten per minggu: demo Momo, "tantangan soal hari ini", tips orang tua, carousel komunitas                                             | Tanpa wajah atau nama anak tanpa izin tertulis orang tua                                                            |
| Komunitas WhatsApp                | Grup orang tua (link sudah bisa diatur di Admin → Kontak WhatsApp), info lomba, worksheet mingguan                                          | –                                                                                                                   |
| Program afiliasi                  | Sudah ada (D-063). Dorong orang tua aktif membagikan link `/r/KODE`                                                                         | –                                                                                                                   |
| Sekolah dan guru PAUD             | Kemitraan: sekolah memakai kelas gratis atau berbayar, lalu menautkan UdaKids dari situs sekolah (backlink bernilai)                        | –                                                                                                                   |
| Lomba live                        | Lomba bulanan berhadiah sertifikat (`pdf-lib`), dengan halaman pengumuman publik. Sekolah dan media lokal menautkan                         | Hitung mundur hanya di lomba (D-042)                                                                                |
| Media dan direktori               | Siaran pers ("platform belajar anak tanpa iklan, bisa offline"), pengajuan ulasan ke portal parenting, daftar di direktori aplikasi edukasi | –                                                                                                                   |
| Situs induk                       | Tautan dari `eduskul.my.id` dan situs Udacoding ke UdaKids                                                                                  | –                                                                                                                   |
| Google Business Profile           | Bila ada alamat kantor atau tempat belajar resmi                                                                                            | –                                                                                                                   |
| Iklan berbayar (opsional)         | Google Ads untuk kata kunci panjang, Meta Ads yang menyasar **orang tua** dengan anggaran kecil dan diuji                                   | Iklan tidak pernah tampil di area anak, dan tidak menyasar anak                                                     |
| Play Store (perlu keputusan)      | PWA dibungkus **Trusted Web Activity** supaya muncul di pencarian Play Store "game edukasi anak". Aplikasinya tetap PWA yang sama           | CLAUDE.md: "app native" di luar lingkup MVP, jadi perlu persetujuan. Wajib mengikuti kebijakan Families Google Play |

## 6. Pengukuran

| Ukuran                                   | Target 3 bulan | Target 6 bulan |
| ---------------------------------------- | -------------- | -------------- |
| Halaman terindeks (Search Console)       | 300+           | 600+           |
| Tayangan di Google per bulan             | 20.000         | 100.000        |
| Klik organik per bulan                   | 800            | 5.000          |
| Kata kunci di halaman 1 (dari 30 target) | 8              | 20             |
| Pendaftar orang tua dari organik         | 100/bulan      | 500/bulan      |

Ditinjau setiap bulan dari Search Console, analitik tanpa cookie, dan data pendaftaran (termasuk kode referal).
Angka di atas adalah target awal dan perlu disesuaikan setelah data bulan pertama masuk.

## 7. Jadwal

| Minggu | Kerja                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------ |
| 1–2    | Fase 1 lengkap. Search Console aktif, sitemap terkirim                                           |
| 3–4    | 20 halaman mapel × jenjang, 50 halaman topik pertama, 4 artikel, akun media sosial konsisten     |
| 5–8    | Semua halaman topik, 20 worksheet PDF, lomba live pertama, kemitraan 5 sekolah, siaran pers      |
| 9–12   | Evaluasi data, perbaiki halaman yang tayang tapi jarang diklik (judul/deskripsi), tambah artikel |
| 13–26  | Iklan uji, Play Store bila disetujui, perluasan worksheet dan Menu Belajar                       |

## 8. Yang tidak dilakukan

- Pelacak, iklan, atau promosi di area anak (`/play`). Halaman dan konten marketing hanya untuk orang tua dan guru.
- Menyalin konten atau soal dari situs lain, membeli backlink, atau membuat halaman tipis massal.
- Memakai foto, nama, atau suara anak tanpa izin tertulis orang tua.
- Menjanjikan peringkat 1 untuk kata kunci umum dalam waktu singkat.

## 9. Keputusan yang dibutuhkan

1. **Nama merek di aplikasi:** ganti `APP_NAME` dari "Little Coder" menjadi **"UdaKids"**? → Sudah (D-097).
2. **Domain:** tetap `kids.eduskul.my.id`, atau memakai domain merek sendiri (misalnya `udakids.id` atau
   `udakids.com`) dengan pengalihan 301? Lebih baik diputuskan **sebelum** konten SEO dibangun, karena pindah
   domain belakangan berarti kehilangan sebagian peringkat.
3. **Halaman publik dengan contoh soal tanpa login:** setuju?
4. **Worksheet PDF gratis:** unduh bebas, atau dengan email orang tua (opsional)?
5. **Analitik:** Umami/Plausible di server sendiri (tanpa cookie), hanya di halaman publik dan area orang tua?
6. **Play Store lewat Trusted Web Activity:** dibahas sekarang, atau setelah Fase 1–2?
7. **Iklan berbayar:** anggaran bulanan bila ingin diuji.
