# Buku Pustaka: 10 level per topik (D-023)

Semua buku di `content/skills/<domain>/<grade>/` memakai struktur yang sama. Setiap topik (kategori)
berisi **tepat 10 level** yang berurutan dari mudah ke sulit, dan Level 10 selalu tantangan gabungan.
Id skill: `{domain}.{grade}.{kode}{n}.{slug}`, judul: `Topik — Level n — Judul level`.

| Buku                   | Folder       | Topik           | Level | Tier         |
| ---------------------- | ------------ | --------------- | ----- | ------------ |
| Matematika Pra-TK      | `math/prek`  | 25 (A–Y)        | 250   | basic        |
| Math Kindergarten (TK) | `math/tk`    | 52 (A–Z, AA–ZZ) | 520   | basic        |
| Math Grade 1-2         | `math/sd12`  | 10 (A–J)        | 100   | intermediate |
| Math Grade 3-4         | `math/sd34`  | 10 (A–J)        | 100   | advanced     |
| Sains Grade 1-2        | `sains/sd12` | 10 (A–J)        | 100   | intermediate |
| Sains Grade 3-4        | `sains/sd34` | 10 (A–J)        | 100   | advanced     |
| Math Grade 1           | `math/sd1`   | 41 (A–OO)       | 410   | intermediate |
| Math Grade 2           | `math/sd2`   | 39 (A–MM)       | 390   | intermediate |
| Sains Grade 1          | `sains/sd1`  | 16 (A–P)        | 160   | intermediate |
| Sains Grade 2          | `sains/sd2`  | 9 (A–I)         | 90    | intermediate |
| Sains Grade 3          | `sains/sd3`  | 25 (A–Y)        | 250   | advanced     |
| Sains Grade 4          | `sains/sd4`  | 26 (A–Z)        | 260   | advanced     |
| Math Grade 4           | `math/sd4`   | 33 (A–GG) + GM  | 373   | advanced     |

## Pola level

**Matematika.** Level naik lewat besar bilangan dan bentuk representasi: gambar → titik/kubus →
angka → soal cerita. Level 10 adalah `mix` dari bentuk-bentuk sebelumnya. Untuk Math Grade 3-4, tiga skill
lama (Dasar/Menengah/Olimpiade × band 0–2) dipecah menjadi 9 level, ditambah Level 10 tantangan.

**Sains.**

| Level | Isi                                                                                        | Kognitif TIMSS |
| ----- | ------------------------------------------------------------------------------------------ | -------------- |
| 1–5   | Tabel fakta (`facts`): tanya nilai, tanya nama, benar/salah, atribut kedua, cari yang beda | knowing        |
| 6–8   | Bank soal penalaran (`manual`) digabung dengan fakta                                       | applying       |
| 9     | Ulangan: seluruh bank soal topik (tidak berulang dalam satu ronde)                         | reasoning      |
| 10    | Tantangan: gabungan semua bentuk                                                           | reasoning      |

Grade 1-2 memakai gambar benda (`pictures`) di level awal bagi anak yang belum lancar membaca.

**Math Grade 4 (D-096):** setiap topik berisi 10 level soal ditambah **Level 11 game** yang sesuai materinya,
plus topik GM (10 game). Level game tidak masuk mock test maupun lomba.

## Materi per topik (D-026)

Setiap kategori di `_catalog.json` punya `intro` (penjelasan ≤ 300 huruf untuk dibacakan) dan `tips`
(1–3 hal penting). Teksnya ditulis dengan kalimat pendek dan kata sehari-hari, dan faktanya mengikuti sumber
di tabel di bawah. Halaman topik juga menampilkan contoh soal dari Level 1 yang tidak dinilai.

## Aturan kebenaran tabel fakta

Setiap fakta ditulis satu kali di tabel, lalu dipakai untuk banyak soal. Supaya jawaban selalu tunggal:

- Pengecoh diambil hanya dari entitas yang **tidak** memiliki nilai yang ditanyakan.
- Entitas yang punya lebih dari satu nilai memakai array, misalnya bebek `tempat: ["darat", "air"]`.
- Nilai yang maknanya tumpang tindih tidak dimasukkan. Contohnya, "badai petir" tidak diberi `tanda`
  karena badai juga hujan dan berangin, dan "menutup pintu" tidak dipakai karena bisa berupa dorongan
  maupun tarikan.
- Bila pernyataan benar/salah ternyata salah, pembahasannya menyebut fakta yang benar untuk subjek itu.

## Sumber

| Buku / topik          | Rujukan                                                                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pra-TK & Kindergarten | Struktur kategori IXL Pre-K/Kindergarten Math (diadaptasi); CP PAUD Fase Fondasi; Rupiah emisi 2016                                                                                                                  |
| Math Grade 1-2        | Tabel Kategori A pemilik produk; CP Matematika Fase A (BSKAP 046/H/KR/2025)                                                                                                                                          |
| Math Grade 3-4        | [kategori-b-sd34.md](kategori-b-sd34.md): Panduan OSN SD 2025, CP Fase B, TIMSS 2023                                                                                                                                 |
| Sains Grade 1-2       | NGSS K-2: K-LS1-1, 1-LS1-1, 1-LS3-1, 2-LS2-1, 2-PS1-1/4, K-PS2-1/2, K-PS3-1, K-ESS2-1, K-ESS3-2/3, 1-ESS1-1 (nextgenscience.org); tema Kurikulum 2013 kelas 1–2; BMKG (musim, petir); NASA Space Place (siang–malam) |
| Sains Grade 3-4       | CP IPAS Fase B (BSKAP 046/H/KR/2025); buku IPAS SD Kemendikbudristek kelas IV–V; NASA Science Solar System; IAU Resolusi B5 (2006)                                                                                   |

Setiap soal sains menyimpan `source` (tabel fakta atau soal manual). Admin bisa melihatnya, sedangkan anak tidak.

## Catatan kurikulum

- **IPAS tidak ada di Fase A.** Sains Grade 1-2 adalah pengayaan yang mengikuti NGSS K-2 dan tema kelas 1–2.
  Tag skill: `fase-merdeka: "A (pengayaan: IPAS mulai Fase B)"`.
- **Math Grade 1-2:** perkalian/pembagian dasar, satuan baku, dan uang di atas Rp1.000 berada di atas
  CP Fase A. Materi ini diambil dari tabel Kategori A dan diperlakukan sebagai pengayaan.
- Topik Fase C di Sains Grade 3-4 (ekosistem, cahaya, tata surya) ditandai `fase-merdeka: C`.

## Belum

- Tinjauan guru (30–50 soal contoh per topik) untuk Grade 1-2 dan Kindergarten sebelum rilis ke anak.
