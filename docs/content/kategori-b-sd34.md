# Kategori B (SD/MI Kelas 3–4): analisis kepatuhan & rancangan level

> Struktur 3 level per materi di dokumen ini sudah diganti menjadi 10 level per topik (D-023, lihat
> [buku-10-level.md](buku-10-level.md)). Riset, sumber, dan bank soal di bawah tetap berlaku.

Tanggal: 29 September 2026 · Konten: `content/skills/math/sd34/` (30 skill) dan `content/skills/sains/sd34/`
(30 skill, 158 soal) · Keputusan terkait: D-020.

## 1. Ringkasan temuan

| Temuan                                                                                                                                                 | Dampak                                                       | Tindakan (yang dibuat comply)                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| "Kategori B kelas 3–4" **bukan kategori resmi OSN**. OSN SD 2025 hanya untuk **kelas IV dan V** (Panduan OSN SD 2025, BPTI Puspresnas).                | Label "OSN" tidak boleh diklaim resmi.                       | Disebut "setara/terinspirasi format OSN". Level 3 = gaya soal olimpiade, bukan soal resmi.                                          |
| Banyak materi di tabel berada di **Fase C (kelas 5–6)**, bukan Fase B (Kepka BSKAP 046/H/KR/2025).                                                     | Soal langsung setingkat Fase C terlalu sulit untuk kelas 3.  | Level 1 berpijak pada Fase B, Level 2 jembatan, Level 3 pengayaan/olimpiade (boleh Fase C). Setiap skill diberi tag `fase-merdeka`. |
| OSN memakai 3 tingkat kesulitan berbobot sama banyak (mudah 1,00 · sedang 1,25 · sulit 1,50) dan format pilihan jamak (OSN-K) / isian singkat (OSN-P). | Dasar resmi untuk 3 level.                                   | 3 level per materi; Level 3 banyak memakai **isian singkat** (keypad angka).                                                        |
| OSN memberi nilai −1 untuk jawaban salah dan membatasi waktu 60 menit.                                                                                 | Bertentangan dengan PRD A9/A14 (tanpa hukuman, tanpa timer). | **Tidak ditiru**: tetap Skor Jago yang tidak menghukum, tanpa timer. Simulasi ujian berwaktu perlu keputusan terpisah.              |
| Usia kelas 3–4 (8–10 tahun) di luar target PRD (5–8 tahun).                                                                                            | Aturan "tanpa teks" tingkat Basic tidak cocok.               | Tier `advanced`: teks boleh dibaca (tetap dibacakan TTS), sesi 15 soal.                                                             |
| TIMSS 2023 kelas 4: ranah kognitif Knowing 40% · Applying 40% · Reasoning 20%.                                                                         | Proporsi level.                                              | Level 1 = knowing, Level 2 = applying, Level 3 = reasoning (tag `timss-kognitif`).                                                  |

## 2. Penempatan materi di Kurikulum Merdeka (CP 046/H/KR/2025)

### Matematika

| Materi (tabel klien) | Fase B (kelas 3–4)                                      | Fase C (kelas 5–6)                           | Rancangan                                                                                       |
| -------------------- | ------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Bilangan cacah       | Bilangan sampai 10.000; perkalian & pembagian           | Sampai 1.000.000                             | L1 operasi bersusun; L2 urutan operasi & soal cerita; L3 Gauss, kelipatan, angka satuan         |
| FPB & KPK            | "mengenal kelipatan dan faktor"                         | "menyelesaikan masalah KPK dan FPB"          | L1 lewat daftar kelipatan/faktor; L2–L3 soal cerita (Fase C)                                    |
| Pecahan              | Membandingkan pecahan (pembilang satu), pecahan senilai | Membandingkan termasuk campuran; operasi     | L1 membaca model & membandingkan; L2 operasi penyebut sama/kelipatan; L3 pecahan dari kuantitas |
| Desimal              | Intuisi desimal, pecahan → desimal                      | Membandingkan desimal                        | L1 per sepuluh/per seratus; L2 operasi; L3 multi-langkah                                        |
| Keliling & luas      | Luas & volume dengan satuan tidak baku                  | Keliling & luas bangun datar dan gabungannya | L1 menghitung petak; L2 rumus & bangun L; L3 invers & konversi                                  |
| Volume kubus & balok | Satuan tidak baku                                       | Bangun ruang kubus/balok                     | L1 menghitung kubus satuan; L2–L3 rumus, liter, kubus dicat                                     |
| Sudut                | —                                                       | "mengukur besar sudut"                       | L1 jenis sudut (visual); L2 busur derajat; L3 segitiga & jam (pengayaan)                        |
| Data                 | Tabel, piktogram, diagram batang skala satu             | Diagram, tabel frekuensi                     | L1 membaca; L2 selisih/total, skala piktogram; L3 multi-langkah                                 |
| Pola bilangan        | Pola gambar/objek sederhana                             | Pola bilangan membesar/mengecil              | L1 barisan aritmetika; L2 bilangan persegi; L3 suku ke-n, korek api, segitiga                   |
| Soal aplikasi        | Hubungan satuan panjang & berat                         | Durasi waktu                                 | L1 uang Rupiah & konversi; L2 waktu; L3 ayam–kambing, perbandingan umur, harga satuan           |

### IPA / IPAS

Fase B IPAS (046/H/KR/2025) mencakup: bentuk & fungsi pancaindra; siklus hidup dan pelestariannya;
pelestarian SDA sebagai mitigasi perubahan iklim; perubahan wujud zat; sumber & perubahan bentuk energi;
jenis gaya dan pengaruhnya terhadap arah, gerak, dan bentuk benda.

| Materi           | Fase                                    | Catatan                                         |
| ---------------- | --------------------------------------- | ----------------------------------------------- |
| Organ tubuh      | B untuk pancaindra, C untuk organ dalam | L1 dicampur: fungsi organ dasar + pancaindra    |
| Daur hidup       | B                                       | Metamorfosis sempurna / tidak sempurna          |
| Ekosistem        | C (tidak ada di Fase B)                 | Pengayaan                                       |
| Perubahan wujud  | B                                       | Termasuk mengkristal/deposisi dan uji yang adil |
| Energi           | B                                       | Termasuk energi terbarukan                      |
| Gaya & gerak     | B                                       | Termasuk magnet dan kelembaman (L3)             |
| Cahaya           | C (tidak ada di Fase B)                 | Pengayaan                                       |
| Sumber daya alam | B                                       |                                                 |
| Tata surya       | C (tidak ada di Fase B)                 | Pengayaan                                       |
| Lingkungan       | B (pelestarian, mitigasi iklim)         |                                                 |

## 3. Cara menjamin "ilmiah dan beralasan, bukan halusinasi"

- **Matematika dihitung, bukan ditulis tangan.** Soal dibuat oleh generator ber-seed (family `expr`, PRD A10).
  Jawabannya dihitung evaluator ekspresi aman, dan pembahasannya diisi dari angka yang sama.
  - Validator menghasilkan 200 soal per skill.
  - Soal ditolak bila jawabannya tidak tunggal, ada pengecoh yang sama atau senilai dengan jawaban (mis. 2/4 = 1/2), ada jawaban bukan bilangan bulat atau negatif, atau kalimatnya lebih dari 160 karakter.
- **Pengecoh memakai miskonsepsi yang terdokumentasi.** Tag-nya tersimpan sebagai `chosenDistractor` untuk analisis admin.
  - "Kurangi angka kecil dari angka besar" pada pengurangan bersusun (Brown & Burton, 1978).
  - "Desimal lebih panjang lebih besar", mis. 0,11 > 0,8 (Steinle & Stacey).
  - Menjumlah penyebut (bias bilangan cacah pada pecahan; Ni & Zhou, 2005).
  - Keliling dan luas tertukar, KPK/FPB tertukar, dan skala busur terbalik.
- **IPA berupa bank soal manual** dengan field `source` di setiap soal, yang terlihat di admin tapi tidak ditampilkan ke anak. Miskonsepsi yang ditargetkan:
  - "cahaya keluar dari mata" (Winer dkk., 2002);
  - "benda berat jatuh lebih cepat" dan "tumbuhan makan dari tanah" (Driver dkk., 1994);
  - model mental Bumi dan siang/malam (Vosniadou & Brewer, 1994);
  - "air merembes menembus gelas" pada pengembunan;
  - Bulan bercahaya sendiri;
  - jumlah planet 9 (Pluto).
- **Tinjauan manusia tetap wajib (PRD).** Guru IPA/Matematika memeriksa 30–50 soal contoh per skill sebelum dirilis. Status skill bisa diubah ke `draft` di admin.

## 4. Sumber

| Sumber                                                                                                                                                                                                                                             | Status                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Panduan OSN SD Tahun 2025, BPTI Puspresnas Kemendikdasmen (PDF di pusatprestasinasional.kemendikdasmen.go.id) — peserta kelas IV–V; OSN-K pilihan jamak (IPA 60 soal, Matematika 30 soal, 60 menit); OSN-P isian singkat; bobot mudah/sedang/sulit | Dibuka & diverifikasi 29-09-2026                                                                                              |
| Kepka BSKAP No. 046/H/KR/2025 tentang Capaian Pembelajaran (berlaku 16 Juli 2025, mencabut 032/H/KR/2024) — dikutip lewat salinan kepalasekolah.id (Matematika) dan pembelajaranmendalam.com (IPAS)                                                | Salinan sekunder dibuka; domain resmi kemdikbud.go.id tidak dapat diakses saat riset — **perlu dicek ulang ke dokumen resmi** |
| TIMSS 2023 Assessment Frameworks (IEA, timssandpirls.bc.edu) — ranah kognitif kelas 4: 40/40/20                                                                                                                                                    | Dari hasil pencarian; halaman resmi belum dibuka                                                                              |
| NASA Science, Solar System (science.nasa.gov/solar-system); IAU Resolusi B5 (2006)                                                                                                                                                                 | Rujukan umum, belum dibuka di sesi ini                                                                                        |
| Brown, J. S., & Burton, R. R. (1978). Diagnostic models for procedural bugs in basic mathematical skills. _Cognitive Science_, 2(2), 155–192                                                                                                       | Rujukan pustaka                                                                                                               |
| Steinle, V., & Stacey, K. (1998/2004). Penelitian miskonsepsi desimal ("longer-is-larger")                                                                                                                                                         | Rujukan pustaka                                                                                                               |
| Ni, Y., & Zhou, Y.-D. (2005). Teaching and learning fraction and rational numbers: The origins and implications of whole number bias. _Educational Psychologist_, 40(1), 27–52                                                                     | Rujukan pustaka                                                                                                               |
| Driver, R., Squires, A., Rushworth, P., & Wood-Robinson, V. (1994). _Making Sense of Secondary Science_. Routledge                                                                                                                                 | Rujukan pustaka                                                                                                               |
| Winer, G. A., Cottrell, J. E., dkk. (2002). Fundamentally misunderstanding visual perception. _American Psychologist_, 57(6–7), 417–424                                                                                                            | Rujukan pustaka                                                                                                               |
| Vosniadou, S., & Brewer, W. F. (1994). Mental models of the day/night cycle. _Cognitive Science_, 18(1), 123–183                                                                                                                                   | Rujukan pustaka                                                                                                               |

Buku IPAS SD Kemendikbudristek (Kelas IV/V) dirujuk sebagai sumber istilah. Dokumennya belum dibuka di sesi
ini, dan harus diperiksa tim konten saat tinjauan.
