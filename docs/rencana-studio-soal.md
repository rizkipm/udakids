# Rencana: Studio Konten (pelajaran dan soal dari panel admin dan PDF sumber)

Status: **Usulan**, menunggu keputusan pemilik produk (lihat bagian 8). Ditulis 2026-10-05, diperbarui hari yang
sama: materi calistung menjadi **pelajaran dulu, latihan kemudian** (bagian 2A) dan penempatan jenjang (bagian 2B).
Pembaca: pemilik produk, tim konten, dan tim pengembang Udakids.

## 1. Ringkasan

Saat ini soal dibuat dengan menyalin prompt ke asisten AI di luar sistem, menempelkan hasilnya ke `content/`,
lalu menjalankan validator dan seed. Cara ini lambat, sulit dilacak sumbernya, dan bergantung pada satu orang.

Usulannya adalah **Studio Soal** di panel admin, dengan dua pintu masuk:

1. **Dari formulir.** Admin memilih mata pelajaran, grade, topik, jumlah level, dan tingkat. Sistem membuat
   satu topik lengkap (10 level, pola D-023) sebagai **draft**.
2. **Dari sumber PDF.** Admin mengunggah PDF materi calistung. Sistem membaca tiap halaman, mengenali tujuan
   belajar dan bentuk latihannya, lalu mengusulkan topik dan level Udakids yang setara sebagai draft, lengkap
   dengan catatan halaman sumbernya.

Prinsip utamanya: **AI hanya menulis draf template skill. Yang menjamin mutu tetap sistem Udakids** (skema Zod,
validator 200 soal, generator yang menghitung jawaban) **dan admin yang menyetujui.** Tidak ada soal yang tayang
ke anak tanpa lolos validator dan disetujui manusia.

Kabar baiknya, fondasinya sudah ada sehingga pekerjaan ini lebih kecil dari kelihatannya:

| Sudah ada                                                                   | Dipakai untuk                        |
| --------------------------------------------------------------------------- | ------------------------------------ |
| Template skill berbasis family (`expr`, `facts`, `manual`, `numbers`, dst.) | Format keluaran AI                   |
| Skema Zod + validator (200 soal per skill, jawaban tunggal, aset ada)       | Gerbang mutu otomatis                |
| Status skill `draft` / `active`, editor skill, pratinjau soal di admin      | Alur review dan terbit               |
| Sidik jari soal (deteksi soal kembar)                                       | Mencegah duplikat dengan 3.971 skill |
| Materi per topik (D-026), suara Momo (D-035), galeri media admin            | Lapisan materi kreatif               |

## 2. Analisa contoh lembar kerja

Sembilan contoh yang dikirim dipetakan ke kemampuan Udakids saat ini:

| #   | Contoh                                    | Bentuk di Udakids                              | Status                                                  |
| --- | ----------------------------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| 1   | Kartu huruf "a, apel" + menebalkan huruf  | Materi pengenalan huruf + **menebalkan huruf** | Materi bisa; **menebalkan belum ada** (interaksi baru)  |
| 2   | Cari huruf "a" di antara lingkaran        | `tap-all` dengan pilihan huruf                 | Bisa sekarang                                           |
| 3   | Cocokkan gambar dengan huruf awal         | `match` gambar ↔ huruf                         | Bisa; sebagian gambar belum ada (obeng, elang)          |
| 4   | Lingkari gambar berhuruf depan sesuai     | `pick-one` / `tap-all` bergambar               | Bisa; gambar kepiting, palu, gergaji belum ada          |
| 5   | Hitung benda lalu tulis angkanya          | `pick-one` angka / `build` / `number-input`    | Bisa; gambar daging, keju, susu belum ada               |
| 6   | Kartu simbol + − × ÷ = < >                | Materi pengenalan simbol                       | Bisa sebagai materi; perlu ilustrasi simbol berkarakter |
| 7   | Cocokkan jari tangan dengan angka         | `match` gambar jari ↔ angka                    | Interaksi bisa; **visual jari belum ada**               |
| 8   | Pilihan ganda teks (buah, pilot, stasiun) | Bank soal `manual`                             | Bisa; hanya untuk anak yang sudah lancar membaca        |
| 9   | Benda panas/dingin bergambar              | Skill sains panas-dingin                       | Sudah ada                                               |

Kesimpulannya, sekitar 70% bentuk latihan calistung sudah bisa dibuat. Yang kurang ada tiga:

- **Interaksi menebalkan dan menulis huruf atau angka di layar.** Ini inti calistung, dan sangat cocok untuk
  layar sentuh.
- **Ilustrasi.** Pustaka gambar saat ini berisi 112 benda. Dari contoh di atas, 12 benda belum ada.
- **Materi pengenalan yang hidup**, misalnya kartu huruf beranimasi dengan Momo yang menuliskan hurufnya.

Lembar kerja juga menunjukkan kenapa review manusia wajib. Pada contoh 8, soal no. 5 ("selera rasa" atau
"selera makan") punya dua jawaban yang masuk akal. Ada juga salah ketik ("dimana", "kaka"). Sumber PDF tidak
otomatis benar, sehingga sistem harus menyaring dan memperbaikinya, bukan menyalin apa adanya.

## 2A. Pelajaran dulu, latihan kemudian

Materi calistung tidak langsung dijadikan soal. Anak **belajar dulu** lewat pelajaran yang dibacakan dan bisa
dibaca sendiri. Setelah paham, anak memilih **Ayo latihan** untuk masuk ke 10 level latihan topik itu.

Ini memperluas "Materi per topik" (D-026), yang sekarang hanya berisi penjelasan ≤ 300 huruf, 1–3 tips, dan satu
contoh soal. Pelajaran calistung butuh lebih dari itu.

**Susunan:** Buku → Topik → **Pelajaran** (3–6 layar pendek) → **Latihan** (10 level, seperti sekarang).

**Jenis layar pelajaran.** Jenisnya sedikit dan tetap, sehingga admin atau AI cukup mengisi datanya. Tampilan dan
animasinya dibuat sekali oleh tim pengembang:

| Layar     | Isi                                                                              | Contoh dari lembar kerja       |
| --------- | -------------------------------------------------------------------------------- | ------------------------------ |
| `kenalan` | Huruf/angka besar. Momo menuliskannya dengan goresan beranimasi, lalu dibacakan. | Kartu huruf "a" (contoh 1)     |
| `bunyi`   | Ketuk huruf atau suku kata untuk mendengar bunyinya.                             | a, i, u, e, o                  |
| `kata`    | Gambar + kata. Suku kata disorot satu per satu saat dibacakan: a-pel, a-yam.     | apel, ayam, api, awan          |
| `gabung`  | Dua suku kata bergerak lalu menyatu menjadi kata: ba + ju = baju.                | (tahap membaca TK)             |
| `cerita`  | Kalimat pendek, kata disorot saat dibacakan seperti karaoke. Kata bisa diketuk.  | (tahap membaca kelas 1)        |
| `coba`    | Mencoba tanpa nilai: tebalkan huruf, ketuk huruf yang dibacakan.                 | Menebalkan "a", cari huruf "a" |
| `ingat`   | Ringkasan satu layar, lalu tombol **Ayo latihan**.                               | Kartu simbol + − = (contoh 6)  |

**Audio dan membaca bersamaan.** Semua teks di layar dibacakan Momo, dan bagian yang sedang dibaca disorot.
Supaya sorotan selalu tepat, setiap potongan (huruf, suku kata, kata, kalimat) punya klip suara sendiri yang dibuat
server lewat TTS dan disimpan di cache `voice_clips` (D-035). Anak bisa mengulang, memilih suara pelan, atau mengetuk
kata mana saja untuk mendengarnya lagi. Anak yang belum bisa membaca tetap bisa belajar dari suara dan gambar,
dan anak yang mulai bisa membaca terbantu oleh sorotan teks.

**Aturan yang tetap berlaku:**

- Tidak ada skor, bintang, atau penilaian di pelajaran. Yang dicatat hanya "pelajaran selesai", untuk progres dan
  laporan orang tua.
- Tidak menyimpan rekaman suara anak atau gambar tulisan anak.
- Animasi menghormati pengaturan "kurangi gerakan" di perangkat, dan pelajaran tetap bisa dibuka offline.
- Pelajaran bisa dilewati. Latihan tidak dikunci menunggu pelajaran selesai, tapi Udakids menyarankannya.

**Dari PDF:** Studio membaca PDF lalu menghasilkan **dua draf terpisah**: draf pelajaran (layar-layar di atas)
dan draf latihan (template soal). Keduanya direview admin. Halaman kartu huruf di PDF menjadi pelajaran, sedangkan
halaman "cari huruf" atau "cocokkan" menjadi latihan.

## 2B. Calistung masuk jenjang apa?

**Rujukan:** Kurikulum Merdeka PAUD menempatkan calistung sebagai **fondasi literasi dan numerasi awal lewat
bermain**, bukan latihan menghafal. Gerakan Transisi PAUD ke SD yang Menyenangkan (Kemendikbudristek, 2023)
juga menegaskan bahwa calistung tidak menjadi syarat masuk SD. Membaca dan menulis secara formal baru dimulai di
Kelas 1 SD (Fase A). Metode membaca bahasa Indonesia memakai suku kata, sesuai aturan Udakids.

**Rekomendasi:** satu buku **Baca Tulis** per jenjang, memakai grade yang sudah ada, dan berhitung **tidak dibuat
buku baru**:

| Buku                           | Usia     | Isi pelajaran dan latihan                                                                                                       |
| ------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Baca Tulis Pra-TK** (`prek`) | ± 4–5 th | Pra-menulis (garis lurus, lengkung, zig-zag), huruf vokal a-i-u-e-o, bunyi huruf, huruf awal benda bergambar                    |
| **Baca Tulis TK** (`tk`)       | ± 5–6 th | Semua huruf, suku kata terbuka (ba-bi-bu-be-bo), menggabung jadi kata 2 suku kata (bo-la, ba-ju), menebalkan huruf              |
| **Baca Tulis Kelas 1** (`sd1`) | ± 6–7 th | Suku kata tertutup (-ng, -ny), kata 3 suku kata, kalimat 3–5 kata, cerita mini, huruf kapital dan titik                         |
| Berhitung                      | 4–7 th   | Sudah ada di Math Pra-TK dan Math TK (770 level). Cukup ditambah pelajaran di depan topiknya: kenalan angka, jari, simbol + − = |

Buku Baca Tulis masuk domain `literasi`, yang foldernya sudah disiapkan tapi masih kosong. Di layar anak,
ketiganya bisa dikelompokkan dalam rak **Calistung** bersama buku Math yang sesuai.

**Penempatan contoh lembar kerja:**

| Contoh                                | Masuk ke                                      |
| ------------------------------------- | --------------------------------------------- |
| 1, 2: kartu huruf "a", cari huruf "a" | Baca Tulis Pra-TK, topik huruf vokal          |
| 3, 4: huruf awal benda                | Baca Tulis Pra-TK (akhir) dan TK (awal)       |
| 5, 7: hitung benda, jari tangan       | Pelajaran di Math Pra-TK, topik membilang     |
| 6: simbol + − × ÷ = < >               | Math TK untuk + − = < >; × dan ÷ di Kelas 2–3 |
| 8: pilihan ganda teks                 | Baca Tulis Kelas 1 (butuh lancar membaca)     |
| 9: panas dan dingin                   | Sains TK (sudah ada)                          |

## 3. Kepatuhan (compliance)

| Aturan                                                                               | Dampak pada rencana                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hak cipta sumber** (CLAUDE.md: dilarang menyalin soal/aset)                        | Beberapa contoh bertanda "worksheet by @naashare", artinya milik pihak lain. PDF hanya boleh dipakai sebagai **acuan tujuan belajar dan bentuk latihan**. Kalimat, gambar, dan tata letaknya tidak disalin. Soal Udakids ditulis ulang dan memakai ilustrasi sendiri. PDF milik sendiri atau berlisensi boleh diadaptasi lebih dekat. Setiap PDF wajib diberi status lisensi saat diunggah. |
| **AI dilarang di area anak** (PRD A17)                                               | AI hanya ada di panel admin. Anak tidak pernah berinteraksi dengan AI, dan soal yang tayang adalah template statis hasil review.                                                                                                                                                                                                                                                            |
| **Data anak minimal**                                                                | Tidak ada data anak, nama, atau skor yang dikirim ke penyedia AI. Yang dikirim hanya parameter topik dan isi PDF.                                                                                                                                                                                                                                                                           |
| **Engine deterministik, tanpa `eval`**                                               | AI menulis JSON template yang divalidasi Zod. Jawaban soal matematika dihitung generator, bukan ditulis AI.                                                                                                                                                                                                                                                                                 |
| **Aturan UX anak** (Basic tanpa teks wajib dibaca, maks 4 kartu, tanpa kata "salah") | Dijadikan aturan pemeriksa otomatis tambahan di validator, sehingga draft yang melanggar tidak bisa disetujui.                                                                                                                                                                                                                                                                              |
| **Keputusan di luar PRD wajib ditanya**                                              | Generator AI di admin, penyedia AI, format pelajaran, perluasan suara Momo ke narasi pelajaran (D-035 saat ini hanya perintah dan respons), buku Baca Tulis, dan interaksi menebalkan huruf adalah keputusan baru. Dicatat sebagai keputusan baru (nomor D berikutnya) setelah disetujui.                                                                                                   |
| **Syarat penyedia AI**                                                               | Pilih penyedia yang syaratnya mengizinkan pembuatan konten untuk produk anak, lewat API berbayar, bukan akun konsumen (pelajaran dari D-035 soal Google AI Studio). Kunci API hanya di server, disimpan terenkripsi seperti kunci suara.                                                                                                                                                    |

## 4. Alur yang diusulkan

```text
            ┌─ Formulir: mapel, grade, topik, level, tingkat ─┐
Admin ──────┤                                                  ├─▶ Rancangan topik (blueprint)
            └─ PDF sumber ─▶ baca halaman ─▶ tujuan belajar ──┘        │  admin bisa ubah
                                                                        ▼
                                              AI menulis draf template skill (10 level)
                                                                        ▼
                               Gerbang otomatis: skema Zod ─▶ validator 200 soal ─▶ aturan UX anak
                               ─▶ cek kembar dengan skill yang ada ─▶ cek aset gambar
                                    │ gagal: AI memperbaiki sendiri (maks 2x), sisanya ditandai
                                                                        ▼
                               Antrean review: pratinjau soal acak, sumber halaman PDF di sampingnya
                                                                        ▼
                               Admin setujui / sunting / tolak ─▶ status active ─▶ tayang
                                                                        ▼
                               content:export ─▶ commit (tetap tercatat di git dan CI)
```

**Standar Udakids** yang dipakai AI berasal dari repo, bukan dari ingatan prompt: skema template, daftar family
dan aset yang tersedia, pola 10 level (D-023), pola sains TIMSS, aturan UX anak, dan 2–3 skill contoh terbaik
dari topik serupa. Dengan begitu, hasilnya konsisten dengan 3.971 skill yang sudah ada.

## 5. Rencana bertahap

Setiap fase bisa dirilis sendiri dan langsung memberi manfaat.

### Fase 0: Keputusan dan pagar (± 3 hari)

- Putuskan pertanyaan di bagian 8, lalu catat sebagai keputusan baru (nomor D berikutnya).
- Tambahkan aturan UX anak ke validator (Basic tanpa teks wajib, maks 4 pilihan, pengecoh ≠ jawaban), supaya
  berlaku juga untuk soal buatan manual.
- Tambahkan kolom asal-usul pada skill: `source` (formulir/PDF/manual), `sourceRef` (file + halaman),
  `generatedBy`, `reviewedBy`, `reviewedAt`.

### Fase 1: Generate dari formulir (± 2 minggu)

- Halaman **Admin → Studio Soal**: pilih mapel, grade, topik (atau ketik topik baru), jumlah level, dan tingkat.
- Server menyusun rancangan topik (tujuan per level), lalu draf template per level.
- Gerbang otomatis plus perbaikan otomatis maksimal 2 kali.
- Antrean review dengan pratinjau 20 soal acak per level dan tombol setujui, sunting, atau tolak.
- Batas biaya harian, seperti `TTS_DAILY_LIMIT`, dan log setiap permintaan.
- **Ukuran berhasil:** satu topik 10 level siap review dalam < 5 menit. ≥ 80% level lolos gerbang otomatis
  tanpa disunting.

### Fase 2: Pustaka sumber PDF (± 2 minggu)

- Unggah PDF (hanya admin, maks mis. 50 halaman/20 MB, disimpan privat di server, tidak tampil ke anak atau
  orang tua) dengan status lisensi wajib: milik sendiri / berlisensi / acuan saja.
- Sistem membaca tiap halaman (teks + gambar halaman) dan menghasilkan **kartu sumber**: tujuan belajar, bentuk
  latihan, perkiraan grade, dan usulan pemetaan ke topik Udakids yang sudah ada atau topik baru.
- Admin memilih halaman atau kartu yang mau dijadikan pelajaran atau latihan, lalu alurnya masuk ke Fase 1
  (latihan) atau Fase 3 (pelajaran).
- Cek cakupan: halaman mana yang sudah punya skill dan mana yang belum, supaya tumpukan PDF bisa dicicil rapi.
- **Ukuran berhasil:** satu PDF 30 halaman terpetakan dalam < 10 menit. Setiap skill hasil PDF bisa ditelusuri
  ke halaman sumbernya.

### Fase 3: Pelajaran Calistung (± 3–4 minggu)

- **Pemutar pelajaran** dengan 7 jenis layar (bagian 2A), sorotan teks sinkron dengan suara, tombol ulang dan
  suara pelan, serta tombol **Ayo latihan** di akhir. Tersedia offline.
- **Editor pelajaran di admin:** susun layar, isi teks dan gambar, dengarkan pratinjau suara. Studio bisa
  membuat draf pelajaran dari formulir atau dari PDF.
- **Goresan huruf dan angka:** jalur goresan a–z dan 0–9 dibuat sendiri, dipakai untuk animasi Momo menulis dan
  untuk menebalkan.
- **Interaksi baru `trace`:** menebalkan huruf/angka mengikuti urutan goresan bernomor (seperti contoh 1), dinilai
  dari kedekatan jalur dengan pola, dengan target sentuh besar dan bisa memakai jari atau mouse. Di pelajaran tidak
  dinilai, di latihan dinilai. Tidak menyimpan gambar tulisan anak, hanya hasil benar/belum.
- **Kartu simbol berkarakter** (+ − × ÷ = < >) dan **visual jari tangan** 0–10.
- **Antrean permintaan aset:** saat draft butuh gambar yang belum ada (mis. obeng), Studio mencatatnya, dan admin
  bisa mengunggah SVG lewat galeri. Draf baru bisa disetujui setelah semua gambarnya tersedia.
- **Ukuran berhasil:** topik huruf vokal a-i-u-e-o di Baca Tulis Pra-TK tayang lengkap (5 pelajaran dan
  10 level latihan), dan anak usia 4–5 tahun bisa menyelesaikan satu pelajaran tanpa bantuan.

### Fase 4: Mutu berkelanjutan (berjalan terus)

- Dasbor per skill baru: tingkat jawaban benar, soal yang paling sering keliru, dan soal yang dilewati. Skill
  yang terlalu sulit atau terlalu mudah ditandai untuk ditinjau ulang.
- Pemeriksa kedua otomatis untuk bank soal teks (`manual`): AI kedua menjawab soal tanpa melihat kunci. Kalau
  jawabannya berbeda, soal ditandai ambigu (kasus "selera rasa" dan "selera makan").

## 6. Risiko dan mitigasi

| Risiko                               | Mitigasi                                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| AI menulis kunci jawaban yang keliru | Matematika dihitung generator. Soal teks diperiksa AI kedua dan review manusia. Tidak ada terbit otomatis. |
| Melanggar hak cipta PDF pihak lain   | Status lisensi wajib, kalimat dan gambar tidak disalin, catatan asal-usul tersimpan.                       |
| Biaya AI membengkak                  | Batas harian, cache hasil per PDF, dan model hemat untuk tahap baca halaman.                               |
| Soal kembar dengan yang sudah ada    | Cek sidik jari soal dan kemiripan judul atau tujuan sebelum draft dibuat.                                  |
| Gambar yang dibutuhkan belum ada     | Antrean aset. Draft tidak bisa disetujui sebelum gambarnya tersedia.                                       |
| Ketergantungan pada satu penyedia AI | Lapisan adaptor penyedia, seperti `SyncAdapter`. Format keluaran tetap template Udakids.                   |

## 7. Yang tidak berubah

- Soal di perangkat anak tetap dibuat oleh engine deterministik dari template, dan tetap jalan offline.
- `content/` tetap menjadi salinan di git lewat `content:export`, dan CI tetap memvalidasi.
- Tidak ada AI, obrolan, atau unggahan di area anak.

## 8. Keputusan yang dibutuhkan

1. **Generator AI di panel admin.** Setuju sebagai fitur khusus admin, dengan aturan "tidak ada terbit tanpa
   review"?
2. **Penyedia AI dan anggaran bulanan.** Rekomendasi: Claude API (Anthropic) karena bisa membaca PDF dan gambar
   halaman sekaligus. Syaratnya dicek untuk produk anak sebelum dipakai.
3. **Status PDF yang dimiliki.** Mana yang milik sendiri atau berlisensi, dan mana yang hanya acuan (seperti yang
   bertanda @naashare)?
4. **Ilustrasi baru.** Dibuat desainer, dibeli dari pustaka berlisensi, atau dibuat AI gambar lalu dikurasi?
5. **Format pelajaran** (bagian 2A): setuju pelajaran dulu dengan 7 jenis layar, lalu latihan, dan suara Momo
   diperluas untuk narasi pelajaran?
6. **Penempatan jenjang** (bagian 2B): setuju buku Baca Tulis Pra-TK, TK, dan Kelas 1, sementara berhitung
   memakai buku Math yang sudah ada?
7. **Urutan prioritas.** Rekomendasi: Fase 0 → 3 (pelajaran calistung, paling terasa bagi anak) → 1 → 2.
