# EMC Kelas 3–4 (Olimpiade) — kisi-kisi, level, dan mock test (D-101)

Buku `math/sd34`, bagian **EMC · Eduversal Mathematics Competition — Penyisihan Kelas 3–4 (soal versi 2022)**. Acuan: kisi-kisi EMC 2022
Penyisihan Kelas 4 (40 soal, 120 menit, tanpa kalkulator; no. 1–30 PG, 31–40 isian; Mudah +8/−2, Sedang +20/−5,
Sulit +40/−10, kosong 0; maks. 1080). Soal, kalimat, angka, dan gambar dibuat sendiri — tidak menyalin soal EMC.

## Membuat ulang konten

```bash
python3 docs/blueprint/emc_sd34/build.py   # tulis EA–EH, GE, EY + katalog (lalu prettier)
pnpm validate:content                     # 200 soal per level dibuat & diperiksa engine
pnpm --filter @little-coder/engine exec vitest run test/emc.test.ts
pnpm db:seed && pnpm lesson:photos -- math sd34
```

Bank soal manual (gambar segitiga, segi banyak koordinat, peluang dadu/koin, hitung segitiga, dll.) dihitung dan
di-`assert` di Python; banyak segitiga pada gambar dihitung brute force dari titik potong garis.

## Materi dan level

| Kode | Materi                               | Level 1–8 (indikator, no. EMC)                                                                                                                                                                                                                                                                                                                                                                               | 9                  | 10                                    | 11 (game)                         |
| ---- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------------------------------------- | --------------------------------- |
| EA   | Geometri bidang dan ruang            | 1. Keliling lingkaran dan jari-jari (no. 3)<br>2. Memotong persegi menjadi persegi kecil (no. 6)<br>3. Persegi panjang dari kawat dan perbandingan (no. 18)<br>4. Keliling segitiga dengan garis tinggi (no. 20)<br>5. Kerangka dan volume kubus (no. 38)<br>6. Persegi panjang dipotong diagonal (no. 24)<br>7. Perbandingan luas segitiga (no. 37)<br>8. Luas gabungan bangun yang tumpang tindih (no. 25) | Teka-teki gaya EMC | Tantangan geometri bidang dan ruang   | Game pasangan bangun dan ukuran   |
| EB   | Geometri koordinat                   | 1. Jarak dua titik mendatar dan tegak (no. 8)<br>2. Keliling persegi panjang dari koordinat (no. 28)<br>3. Jarak dua titik dengan Pythagoras (no. 17)<br>4. Mencari koordinat dari luas segitiga (no. 13)<br>5. Keliling segitiga dari koordinat (no. 36)<br>6. Luas segiempat dari koordinat (no. 32)<br>7. Luas segi banyak dari koordinat (no. 30)<br>8. Titik dengan syarat jarak (no. 12)               | Teka-teki gaya EMC | Tantangan geometri koordinat          | Game harta karun koordinat        |
| EC   | Bilangan dan aljabar                 | 1. Ganjil dan genap bentuk aljabar (no. 1)<br>2. Selisih harga dari dua pernyataan (no. 5)<br>3. Jumlah dan selisih dua bilangan (no. 27)<br>4. Banyak kelipatan di antara dua bilangan (no. 15)<br>5. Menjumlahkan dua persamaan harga (no. 22)<br>6. Tiga bilangan: rata-rata dan selisih (no. 39)<br>7. Banyak faktor bilangan berpangkat (no. 40)<br>8. Mencari bilangan yang dipikirkan                 | Teka-teki gaya EMC | Tantangan bilangan dan aljabar        | Game tangkap faktor dan kelipatan |
| ED   | Rasio, persen, dan aritmetika sosial | 1. Mencari keseluruhan dari bagian (no. 7)<br>2. Persen dari suatu bilangan<br>3. Diskon untuk dua barang (no. 29)<br>4. Nilai setelah naik persen (no. 23)<br>5. Perbandingan dua besaran<br>6. Perbandingan berantai (no. 35)<br>7. Persen bertingkat (no. 34)<br>8. Diskon bertingkat dan untung                                                                                                          | Teka-teki gaya EMC | Tantangan rasio dan persen            | Game bingo belanja                |
| EE   | Statistika                           | 1. Rata-rata sekumpulan data<br>2. Mencari data dari rata-rata baru (no. 4)<br>3. Median dan modus<br>4. Rata-rata dari tabel frekuensi (no. 10)<br>5. Rata-rata gabungan dua kelompok<br>6. Nilai yang sama dari rata-rata (no. 11)<br>7. Data terurut dengan rata-rata (no. 31)<br>8. Rata-rata berubah                                                                                                    | Teka-teki gaya EMC | Tantangan statistika                  | Game diagram ajaib                |
| EF   | Peluang                              | 1. Peluang menang dengan dadu (no. 2)<br>2. Peluang mengambil satu benda<br>3. Banyak hasil yang mungkin<br>4. Peluang jumlah dua dadu<br>5. Peluang mengambil dua bola (no. 21)<br>6. Peluang beberapa uang logam (no. 19)<br>7. Peluang kejadian kebalikan<br>8. Peluang kejadian dua dadu                                                                                                                 | Teka-teki gaya EMC | Tantangan peluang                     | Game eksperimen peluang           |
| EG   | Kombinatorika dan penalaran          | 1. Prinsip pagar satu baris<br>2. Barisan berbentuk persegi panjang (no. 14)<br>3. Jabat tangan dan pertandingan<br>4. Nilai paling banyak dengan syarat (no. 16)<br>5. Ambil paling sedikit agar pasti<br>6. Banyak cara dengan aturan perkalian<br>7. Menghitung banyak segitiga (no. 26)<br>8. Persegi dan persegi panjang pada petak                                                                     | Teka-teki gaya EMC | Tantangan kombinatorika dan penalaran | Game tebak angka strategi         |
| EH   | Kecepatan dan kerja                  | 1. Jarak, kecepatan, dan waktu<br>2. Waktu tempuh<br>3. Mengubah satuan kecepatan<br>4. Waktu berpapasan<br>5. Jarak saat berpapasan (no. 9)<br>6. Debit dan waktu mengisi<br>7. Kerja bersama<br>8. Waktu kerja sendiri (no. 33)                                                                                                                                                                            | Teka-teki gaya EMC | Tantangan kecepatan dan kerja         | Game perjalanan bus               |

**GE Game seru EMC** (10 jenis berbeda): Harta karun koordinat, Eksperimen dua dadu, Bingo diskon dan kembalian, Diagram data lomba, Penyihir hitung cepat, Tumpuk angka hasil kali, Tebak angka Momo, Teka-teki silang istilah EMC, Sortir mustahil, mungkin, pasti, Pasangan pecahan dan persen.

## Kisi-kisi Mock Test 1–3 (EY)

Ketiga mock memakai kisi-kisi yang sama; soal dibuat ulang dari level sumber dengan seed baru setiap percobaan.

| No  | Materi | Level | Tingkat | Bentuk | Indikator                                                                 |
| --- | ------ | ----- | ------- | ------ | ------------------------------------------------------------------------- |
| 1   | EC     | 1     | Mudah   | PG     | Menentukan bentuk aljabar yang bernilai ganjil/genap                      |
| 2   | EF     | 1     | Mudah   | PG     | Menghitung peluang dari aturan menang/kalah/seri pada pelemparan dadu     |
| 3   | EA     | 1     | Mudah   | PG     | Menentukan jari-jari dari keliling lingkaran (dalam π)                    |
| 4   | EE     | 2     | Mudah   | PG     | Menentukan data yang hilang dari rata-rata baru                           |
| 5   | EC     | 2     | Mudah   | PG     | Menentukan selisih harga dari dua pernyataan harga                        |
| 6   | EA     | 2     | Mudah   | PG     | Menentukan keliling persegi kecil hasil pemotongan                        |
| 7   | ED     | 1     | Mudah   | PG     | Menentukan total dari bagian pecahan yang diketahui                       |
| 8   | EB     | 1     | Mudah   | PG     | Menentukan jarak dua titik dengan ordinat/absis sama                      |
| 9   | EH     | 5     | Sulit   | PG     | Menentukan jarak tempuh benda saat berpapasan dari perbandingan kecepatan |
| 10  | EE     | 4     | Sedang  | PG     | Menghitung rata-rata dari tabel frekuensi                                 |
| 11  | EE     | 6     | Sulit   | PG     | Menentukan nilai data yang sama dari rata-rata keseluruhan                |
| 12  | EB     | 8     | Sulit   | PG     | Menentukan koordinat yang memenuhi syarat perbandingan jarak              |
| 13  | EB     | 4     | Sedang  | PG     | Menentukan koordinat titik dari luas segitiga                             |
| 14  | EG     | 2     | Sedang  | PG     | Menghitung banyak titik pada grid berjarak sama                           |
| 15  | EC     | 4     | Sulit   | PG     | Menghitung banyak kelipatan suatu bilangan di antara dua bilangan         |
| 16  | EG     | 4     | Sedang  | PG     | Menentukan nilai maksimum/minimum dengan syarat tiap kategori             |
| 17  | EB     | 3     | Sedang  | PG     | Menghitung jarak dua titik dengan teorema Pythagoras                      |
| 18  | EA     | 3     | Sedang  | PG     | Menentukan luas dari keliling dan perbandingan sisi                       |
| 19  | EF     | 6     | Sulit   | PG     | Menghitung peluang kombinasi sisi pada beberapa koin                      |
| 20  | EA     | 4     | Sedang  | PG     | Menentukan keliling segitiga dari tinggi dan pembagian alas (tripel Pyth  |
| 21  | EF     | 5     | Sedang  | PG     | Menghitung peluang pengambilan dua bola sekaligus tanpa pengembalian      |
| 22  | EC     | 5     | Sulit   | PG     | Menentukan jumlah/selisih harga satuan dari dua persamaan                 |
| 23  | ED     | 4     | Sedang  | PG     | Menentukan nilai akhir dari besar kenaikan persen                         |
| 24  | EA     | 6     | Sulit   | PG     | Menentukan keliling segitiga siku-siku hasil potongan diagonal            |
| 25  | EA     | 8     | Sulit   | PG     | Menghitung luas gabungan dua bangun yang tumpang tindih                   |
| 26  | EG     | 7     | Sulit   | PG     | Menghitung banyak bangun (segitiga) pada gambar secara sistematis         |
| 27  | EC     | 3     | Sedang  | PG     | Menentukan hasil kali dua bilangan dari jumlah dan selisihnya             |
| 28  | EB     | 2     | Mudah   | PG     | Menghitung keliling/luas persegi panjang dari koordinat titik sudut       |
| 29  | ED     | 3     | Mudah   | PG     | Menentukan harga normal dari selisih harga setelah diskon                 |
| 30  | EB     | 7     | Sulit   | PG     | Menghitung luas segi banyak dari koordinat titik sudut                    |
| 31  | EE     | 7     | Sulit   | Isian  | Menentukan data yang hilang pada data terurut dengan rata-rata diketahui  |
| 32  | EB     | 6     | Sulit   | Isian  | Menghitung luas segiempat sembarang dari koordinat titik sudut            |
| 33  | EH     | 8     | Sulit   | Isian  | Menentukan waktu kerja sendiri dari waktu kerja bersama                   |
| 34  | ED     | 7     | Sulit   | Isian  | Menghitung nilai setelah kenaikan persen berulang                         |
| 35  | ED     | 6     | Sulit   | Isian  | Menentukan kesetaraan harga melalui perbandingan berantai                 |
| 36  | EB     | 5     | Sulit   | Isian  | Menghitung keliling segitiga siku-siku dari koordinat                     |
| 37  | EA     | 7     | Sulit   | Isian  | Menentukan luas segitiga dari perbandingan ruas garis                     |
| 38  | EA     | 5     | Sulit   | Isian  | Menentukan volume/luas kubus dari panjang total rusuk                     |
| 39  | EC     | 6     | Sulit   | Isian  | Menentukan bilangan dari jumlah, rata-rata, dan selisih                   |
| 40  | EC     | 7     | Sulit   | Isian  | Menentukan banyak faktor positif dari bilangan berpangkat                 |

Ringkasan: Geometri bidang & ruang 8, Geometri koordinat 8, Bilangan & aljabar 7, Rasio/persen 5, Statistika 4,
Peluang 3, Kombinatorika 3, Kecepatan & kerja 2 · Mudah 10, Sedang 10, Sulit 20 · PG 30, Isian 10 · poin maks. 1080.

## Pemeriksaan kemiripan dengan soal asli

Semua soal unik hasil generator (±13.000 kalimat soal, 300 seed per level) dibandingkan dengan 40 soal asli memakai
`difflib.SequenceMatcher`. Batas: < 0,60. Hasil akhir: **kemiripan tertinggi 0,55**; kombinasi angka persis soal asli
(mis. kawat 48 cm → kubus, segitiga (1, 1), (4, 1), (4, X) luas 6, jumlah 42 selisih 2, 256) dikecualikan lewat `constraint`.
Teks soal asli tidak disimpan di repo.

## Pelajaran

Setiap materi: infografis (poster) → simulasi (`luas`, `koordinat`, `garis-bilangan`, `desimal`, `diagram`, `peluang`) →
cara cepat → coba satu soal → ingat, plus Video Momo otomatis. Foto: Pexels + saringan Claude (D-095); gambar
geometri selalu SVG `figure`.
