# Keputusan (Decision Log)

Keputusan di luar atau yang mengubah PRD. Status: **Disetujui** (oleh pemilik produk) atau
**Usulan** (default sementara dari Claude Code — perlu dikonfirmasi; boleh dibatalkan tanpa biaya besar).

| ID    | Tanggal    | Keputusan                                            | Status              |
| ----- | ---------- | ---------------------------------------------------- | ------------------- |
| D-001 | 2026-09-28 | Backend: NestJS + PostgreSQL, menggantikan Supabase  | Disetujui           |
| D-002 | 2026-09-28 | ORM: Drizzle + drizzle-kit                           | Usulan              |
| D-003 | 2026-09-28 | Realtime: Socket.IO lewat `@nestjs/websockets`       | Usulan (dipakai M5) |
| D-004 | 2026-09-28 | Login fasilitator: magic link buatan sendiri + JWT   | Usulan (dipakai M5) |
| D-005 | 2026-09-28 | Versi dipin ke major stabil; React 18                | Usulan              |
| D-006 | 2026-09-28 | Engine ESM dengan export condition `source`          | Usulan              |
| D-007 | 2026-09-28 | Postgres lokal (Postgres.app), tanpa Docker          | Disetujui           |
| D-008 | 2026-09-29 | Momo berhenti begitu sampai tujuan                   | Usulan              |
| D-009 | 2026-09-29 | Hitungan kartu: `move n` = n kartu                   | Usulan              |
| D-010 | 2026-09-29 | Bintang bertingkat (3 mensyaratkan 2)                | Usulan              |
| D-011 | 2026-09-29 | Batas "4 jenis kartu" berlaku untuk palette/pilihan  | Usulan              |
| D-012 | 2026-09-29 | Field grid tambahan: `puddles`, `goal.collectAll`    | Usulan              |
| D-013 | 2026-09-29 | Solver: makro `repeat` berisi datar; `if` menyusul   | Usulan              |
| D-014 | 2026-09-29 | Peran: admin, fasilitator, orang tua, anak           | Disetujui           |
| D-015 | 2026-09-29 | Staf & orang tua login email + password              | Disetujui           |
| D-016 | 2026-09-29 | Anak login: kode keluarga + profil + sandi gambar    | Disetujui           |
| D-017 | 2026-09-29 | Admin kelola semua: skill, soal, level, user, lapor  | Disetujui           |
| D-018 | 2026-09-29 | Katalog Pra-TK Matematika penuh, semua bisa dimain   | Disetujui           |
| D-019 | 2026-09-29 | Generator berbasis "family" + ekspresi A10           | Usulan              |
| D-020 | 2026-09-29 | Kategori B (kelas 3–4): 3 level, gaya OSN            | Diganti D-023       |
| D-021 | 2026-09-30 | Ronde level 10 soal, skor ≥ 70 lulus, merah/hijau    | Disetujui           |
| D-022 | 2026-09-30 | Profil anak + peringkat di kelas (posisi sendiri)    | Diganti D-024       |
| D-023 | 2026-09-30 | Semua buku 10 level/topik; TK, Grade 1-2 baru        | Disetujui           |
| D-024 | 2026-09-30 | Stopwatch tanpa batas + papan peringkat global       | Disetujui           |
| D-025 | 2026-09-30 | Registrasi: wizard keluarga, daftar kelas, gabung    | Disetujui           |
| D-026 | 2026-09-30 | Tampilan anak ringkas + materi topik + alur selesai  | Disetujui           |
| D-027 | 2026-09-30 | URL level/topik buram + kunci level dicek server     | Disetujui           |
| D-028 | 2026-09-30 | Ulang ronde = soal baru (tanpa kembar, sesuai level) | Disetujui           |
| D-029 | 2026-09-30 | .env dimuat, backup/restore DB, umpan balik inline   | Disetujui           |
| D-030 | 2026-09-30 | Semua data runtime dari DB; migrate/seed produksi    | Disetujui           |
| D-031 | 2026-09-30 | Akses jaringan lokal (iPad) + panduan deploy         | Disetujui           |

## D-001 — NestJS + PostgreSQL menggantikan Supabase

Diminta pemilik produk: "gunakan nodejs, reactjs atau nest js, dan databasenya postgresQL".

Dampak terhadap PRD:

- `supabase/migrations/*.sql` → `apps/api/drizzle/*.sql` (dihasilkan dari `apps/api/src/db/schema.ts`).
- `SyncAdapter` implementasi `supabase` → `http` (REST ke NestJS). Implementasi `mock` tetap.
- Supabase Realtime → WebSocket gateway NestJS (D-003).
- Supabase Edge Function untuk tulis event anak → endpoint `POST /events` NestJS dengan token sesi kelas.
- RLS Postgres → guard/otorisasi di NestJS (fasilitator hanya kelasnya; laporan via `report_token`).
  RLS bisa ditambahkan belakangan sebagai lapis kedua.
- Supabase Auth magic link → D-004.

## D-002 — Drizzle ORM

Alasan: skema TypeScript yang dekat dengan SQL, migrasi berupa file `.sql` yang bisa direview (mirip
`supabase/migrations`), tanpa binary engine (lebih ringan untuk mode "server di laptop fasilitator").
Alternatif: Prisma (DX bagus, tapi binary/driver adapter), TypeORM (bawaan Nest, lebih berat).

## D-003 — Socket.IO untuk realtime

Room per kelas; event: `progress`, `stuck`, `freeze`, `class-challenge`. Fallback long-polling bawaan
Socket.IO membantu di wifi venue yang buruk. Target PRD: bekukan layar < 2 detik.

## D-004 — Magic link fasilitator

Token acak sekali pakai (hash disimpan, kedaluwarsa 15 menit) → JWT sesi. Pengiriman email lewat
`nodemailer` (SMTP dikonfigurasi lewat env); di dev, link dicetak ke log API. Perlu tabel baru
`login_tokens` di M5. **Perlu diputuskan:** penyedia email (SMTP sendiri, Resend, SES, dll).

## D-005 — Pin versi

Registry sudah punya major lebih baru (TypeScript 7, Vite 8, Vitest 5, NestJS 12, React 19, pnpm 12).
Dipakai: TypeScript 5.9, Vite 7, Vitest 3, NestJS 11, React 18.3 (sesuai PRD A3), React Router 6,
pnpm 10, ESLint 9, Zod 4, Drizzle 0.44. Upgrade dilakukan sengaja, satu per satu, setelah MVP.

## D-006 — Engine ESM + condition `source`

`packages/engine` adalah ESM. `exports["."].source` menunjuk `src/index.ts` sehingga Vite, Vitest, dan
`tsx --conditions=source` memakai source langsung (tanpa build). API NestJS (CommonJS) memakai `dist/`
lewat `require(esm)` Node ≥ 22.12. Konsekuensi: `pnpm dev` dan `pnpm build` membangun engine lebih dulu.

## D-007 — Postgres lokal, tanpa Docker

Pemilik produk memutuskan Docker tidak diperlukan. Pengembangan memakai PostgreSQL lokal (Postgres.app,
port 5432) dengan role & database `littlecoder`. CI (M4) akan memakai service container Postgres bawaan
GitHub Actions, bukan Docker Compose. Ubah `DATABASE_URL` bila memakai Postgres lain.

## D-008 — Momo berhenti begitu sampai tujuan

Interpreter menghentikan eksekusi saat Momo mencapai tujuan (dan semua bintang bila `collectAll`);
instruksi sisanya tidak dijalankan. Alasan: sesuai cerita ("Momo sampai rumah dan melompat
kegirangan"), dan kartu berlebih tetap membuat anak kehilangan bintang 3. Alternatif: tujuan harus
tercapai tepat di akhir program (gaya Lightbot).

## D-009 — `move`/`forward` dengan `n` dihitung n kartu

`cardCount` menghitung `move n` sebagai n kartu, dan `repeat`/`if` sebagai 1 + isinya. Tujuannya agar
perintah suara "maju tiga" tidak lebih hemat daripada tiga kartu panah, dan `maxCards`/bintang 3 konsisten
di semua cara input.

## D-010 — Bintang bertingkat

1 = sampai tujuan; 2 = sampai **dan** petunjuk ≤ `hintsAllowedFor2Stars`; 3 = syarat bintang 2 **dan**
kartu ≤ `optimalSteps` (atau benar pada percobaan pertama untuk puzzle tanpa konsep hemat). Jadi anak yang
memakai petunjuk maksimal mendapat 1 bintang meski solusinya hemat.

## D-011 — "Maksimal 4 jenis kartu" (A14)

Dipakai untuk `palette` grid dan `choices` di `pattern`/`number` tingkat Basic. **Tidak** dipakai untuk
`sequence-cards`, karena PRD Dunia 1 menyebut level akhir berisi 5 kartu + 1 pengecoh. Perlu konfirmasi
apakah tafsiran ini benar.

## D-012 — Field grid tambahan

- `grid.puddles` (genangan): Momo tidak mau berjalan masuk (dianggap menabrak); `jump` melompati
  satu kotak (kotak tengah boleh genangan, tidak boleh dinding). Dipakai mulai Dunia 8.
- `goal.collectAll` (default `false`): tujuan baru terhitung setelah semua bintang di grid diambil.
  Tanpa ini, bintang di grid hanya hiasan/keping.
- Bintang di grid terambil otomatis saat Momo melewati kotaknya; `pick` mengambil bintang di kotak saat ini.
- Koordinat: `x` kolom dari kiri, `y` baris dari atas (`up` = y berkurang).

## D-013 — Cakupan solver

Solver mencari di atas state `{pos, facing, collected}` dengan "makro" sebagai sisi: satu instruksi
primitif, atau `repeat(n = 2..10, isi datar ≤ 4 kartu)`. Ini optimal untuk program yang tingkat atasnya
berupa urutan makro (cukup untuk Dunia 1–7). Belum mencakup `repeat` bersarang dan `if` (Dunia 8+);
ditambahkan saat level Advanced dikerjakan. Batas 200 langkah dihitung per makro, bukan per program.

## D-014 — Peran pengguna

Diminta pemilik produk: "buat 2 level, admin dan user; setiap user perlu login". Implementasi:

- **admin** — mengelola semua (lihat D-017).
- **fasilitator** — akun staf yang hanya melihat kelasnya sendiri (PRD A13, M5).
- **orang tua** — akun keluarga; mengelola profil anak, melihat laporan.
- **anak** — profil di bawah akun orang tua (atau kelas), login dengan sandi gambar (D-016).

## D-015 — Login email + password

Staf (admin, fasilitator) dan orang tua login dengan email + password. Password di-hash dengan `scrypt`
(bawaan Node, bersalt), sesi memakai JWT. Tidak butuh layanan email, jadi tetap jalan di server laptop
fasilitator. Menggantikan magic link di D-004. Admin pertama dibuat lewat `pnpm db:seed`
(`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Pendaftaran orang tua wajib mencentang persetujuan → `consent_at`.

## D-016 — Login anak dengan sandi gambar

Anak tidak punya email atau password teks (PRD A17 tetap berlaku). Alurnya:
kode keluarga (6 karakter, diingat perangkat setelah orang tua login sekali) → pilih profil (nama panggilan

- warna Momo) → ketuk 3 gambar sandi dari 9 gambar. Yang disimpan hanya hash sandi gambar, bukan data
  pribadi. Orang tua bisa mengatur ulang sandi gambar. Di workshop, anak tetap masuk via kode kelas (M5).

## D-017 — Hak admin

Admin bisa: mengelola katalog skill Pustaka (buat/ubah/nonaktifkan, pratinjau soal generator), membuat
soal manual (bank soal), mengelola level Petualangan (editor JSON dengan validasi solver dan pratinjau,
bukan editor visual drag-drop), mengelola akun staf, orang tua, anak, dan kelas, serta melihat laporan
semua anak dan analisis per skill. Skill dan level disimpan di PostgreSQL; `content/` menjadi data awal
(seed) yang tetap divalidasi di CI.

## D-018 — Katalog Pra-TK Matematika penuh

Semua kategori Pra-TK Matematika (A–Y, ±170 skill) dibangun dan bisa dimainkan. Struktur mengacu IXL
(PRD: hanya acuan struktur), tapi nama skill, kalimat soal, dan ilustrasi dibuat sendiri dalam Bahasa
Indonesia; uang memakai koin Rupiah. Hal yang **tidak** ditiru dari IXL: batas latihan harian/paywall,
timer, angka skor dan jumlah soal yang terlihat anak (PRD A14, A17). Kategori A–U = tingkat `basic`,
V–Y (penjumlahan/pengurangan) = `intermediate`, sesuai tabel katalog PRD.

## D-019 — Generator berbasis family

Setiap skill template memilih satu **family** generator (mis. `count`, `compare-groups`, `arith`,
`position`) dan mengisi parameternya; family ditulis di engine sebagai fungsi murni ber-seed. Family
`arith` memakai format PRD A10 apa adanya (`params` + `constraint` + ekspresi `answer`/`distractors`,
dievaluasi evaluator aman tanpa `eval`). Alasan: ±170 skill dengan bentuk visual yang sangat beragam
(kubus, bingkai sepuluh, posisi, bentuk ruang, koin) tidak praktis ditulis sebagai ekspresi saja, tapi
skill baru tetap cukup berupa data (JSON) selama family-nya sudah ada. Soal manual dari admin memakai
family `manual`.

## D-020 — Kategori B (SD/MI kelas 3–4)

Diminta pemilik produk: soal Matematika dan IPA "Kategori B" per level, dari sederhana hingga sulit, berbasis
sumber tepercaya dan setara OSN. Ini memperluas target usia PRD (5–8 → sampai 10 tahun). Analisis lengkap:
[docs/content/kategori-b-sd34.md](content/kategori-b-sd34.md).

- Jenjang baru `sd34` ("SD/MI Kelas 3–4 (Kategori B)"), tier `advanced` (boleh membaca teks, sesi 15 soal).
- 10 materi × 3 level: Level 1 Dasar (Fase B, _knowing_), Level 2 Menengah (_applying_), Level 3 Olimpiade
  (_reasoning_, boleh Fase C). Mengikuti 3 tingkat bobot OSN dan proporsi kognitif TIMSS kelas 4.
- Tidak diklaim sebagai soal OSN resmi (OSN SD resmi untuk kelas IV–V).
- Tidak meniru nilai negatif dan batas waktu OSN (PRD A9/A14). Mode simulasi ujian berwaktu = keputusan terpisah.
- Engine: family `expr` (PRD A10 umum: bilangan/desimal/pecahan, pilihan ganda atau isian singkat), visual
  pecahan/tabel/diagram/persegi panjang/balok/sudut/teks, fungsi `gcd`/`lcm`, interaksi `number-input`.

## D-021 — Ronde level: skor, warna benar/salah, level berurutan

Diminta pemilik produk (mengacu tampilan IXL): jawaban salah berwarna merah, skor total terlihat, skor di
bawah 70 (kurang dari 7 benar dari 10) = gagal, dan soal muncul per level: lulus level 1 baru lanjut level
berikutnya. Level dibuka **per materi, dan materi berikutnya terkunci** sampai Level 1 materi sebelumnya lulus.

Aturan (engine `scoring/quiz.ts`):

- Satu ronde = 10 soal, kesulitan naik di dalam ronde (band 0,0,0,1,1,1,1,2,2,2).
- Skor = persen benar (0–100); lulus bila ≥ 70. Skor terbaik & status lulus tidak pernah turun; bisa diulang.
- Level = skill dalam satu kategori (urut `order`). Pra-TK: skill dalam kategori menjadi level berurutan;
  Kategori B: Level 1–3 per materi.
- Benar = hijau, salah = merah + jawaban benar hijau + pembahasan. Penghitung "Benar n" dan titik
  merah/hijau per soal terlihat anak. Layar akhir: skor, "x dari 10 benar", lulus/gagal, tombol level
  berikutnya / coba lagi.
- Hasil tersimpan di perangkat (offline) dan server (`quiz_results`, event `quiz_result`, idempoten).

**Mengubah PRD:** A14 (tanpa merah, tanpa kata "salah/gagal"), A9/A14 (anak tidak melihat angka skor),
dan sebagian semangat Skor Jago yang tidak menghukum. Skor Jago tetap dihitung di belakang layar untuk
laporan orang tua dan rekomendasi. Catatan riset yang menjadi alasan aturan lama: Mueller & Dweck (1998),
kritik SmartScore IXL. Tidak ada timer atau nyawa (tetap sesuai PRD).

## D-022 — Profil anak, riwayat skor, dan peringkat di kelas

Diminta pemilik produk: profil berisi total skor dan level, setiap ronde tersimpan dan bisa dilihat, serta
peringkat. Pilihan pemilik: peringkat **di dalam satu kelas workshop**, dan anak **hanya melihat
posisinya sendiri** (mis. "Peringkat 3 dari 12 di kelas"), tanpa nama anak lain.

- Total skor = jumlah skor terbaik semua level (0–100 per level). Level lulus = banyak level dengan skor ≥ 70.
- Peringkat gaya kompetisi (nilai sama = peringkat sama) di antara anak aktif satu kelas; anak tanpa
  kelas melihat "Belum ikut kelas". Orang tua memasukkan kode kelas (dari admin/fasilitator) di profil anak.
- Riwayat = event `quiz_result` (server, 50 terakhir) dengan cadangan riwayat di perangkat saat offline.
- **Mengubah PRD** A2/A14/A17 ("tidak ada peringkat individu"). Mitigasi: tidak ada papan peringkat,
  nama anak lain tidak pernah dikirim ke perangkat anak (diuji di e2e).

## D-023 — Semua buku: setiap topik tepat 10 level; buku Grade 1-2 & Kindergarten baru

Tanggal 2026-09-30 · Status **Disetujui** (permintaan pemilik produk; cakupan "Semua jenjang termasuk TK & Pra-TK").

- **Nama buku:** "Matematika SD/MI Kelas 3–4" → **Math Grade 3-4**; "IPA SD/MI Kelas 3–4" → **Sains Grade 3-4**.
  Buku baru: **Math Kindergarten (TK)** (52 topik A–ZZ, struktur IXL Kindergarten, konteks Indonesia),
  **Math Grade 1-2** dan **Sains Grade 1-2** (masing-masing 10 topik, tabel Kategori A).
- **Setiap topik = tepat 10 level** di semua buku (Pra-TK 25×10, TK 52×10, Math 1-2 / 3-4 dan Sains 1-2 / 3-4
  masing-masing 10×10 = 1170 level). Level 10 selalu tantangan gabungan. Aturan ronde D-021 tetap
  (10 soal, lulus ≥ 70, level & materi terbuka berurutan).
- **Sumber isi sains:** tabel fakta bersumber (family `facts`) + bank soal penalaran (family `manual`,
  setiap soal punya `source`). Grade 1-2 merujuk NGSS K-2 (K-LS1, 1-LS1, 2-LS2, 2-PS1, K-PS2, K-PS3, K-ESS2,
  K-ESS3, 1-ESS1) dan tema Kurikulum 2013 kelas 1–2, karena **IPAS baru dimulai di Fase B** (kelas 3).
  Grade 3-4 merujuk CP IPAS Fase B (BSKAP 046/H/KR/2025), buku IPAS Kemendikbudristek, NASA/IAU.
- **Catatan Fase A (Math Grade 1-2):** perkalian/pembagian dasar, satuan baku, dan uang di atas Rp1.000
  adalah **pengayaan** di atas CP Fase A (bilangan sampai 100, +/− sampai 20, satuan tidak baku), mengikuti
  tabel Kategori A pemilik produk. Ditandai tag `fase-merdeka` di setiap skill.
- **Family baru:** `facts` (tanya nilai / nama / benar-salah / cari yang beda), `clock` (jam analog),
  `mix` (gabungan beberapa bentuk soal dalam satu level); `expr` mendapat `labels` (jawaban kategori) dan
  `{w:a}` (bilangan dalam kata); `manual` tidak mengulang soal dalam satu ronde bila bank ≥ 10 soal.
- **Migrasi:** id skill berubah. `pnpm db:seed` menjadikan **draft** skill bawaan yang tidak ada lagi di folder
  konten (kecuali yang pernah diedit admin). Progres lama pada id lama tidak terbawa (data demo).
- Rincian & sumber: [docs/content/buku-10-level.md](content/buku-10-level.md).

## D-024 — Stopwatch tanpa batas waktu & papan peringkat global

Tanggal 2026-09-30 · Status **Disetujui** (pilihan pemilik produk: "Stopwatch berjalan", "Semua pengguna (global)").

- **Stopwatch** tampil di kepala ronde (mm:ss), **tanpa batas waktu**. Waktu hanya berjalan saat soal
  dikerjakan: berhenti saat anak membaca pembahasan dan saat tab/aplikasi di latar. Lama ronde dikirim
  sebagai `durationMs` (maks 6 jam) di event `quiz_result`, dan tampil di layar hasil ("Waktu: 3 menit 20 detik")
  serta di riwayat skor.
- Per level disimpan `best_time_ms` (waktu ronde skor terbaik; skor sama → tercepat) dan `last_time_ms`
  (migrasi `0002_quiz_time`). Total waktu = jumlah `best_time_ms`.
- **Papan peringkat global** (`GET /practice/leaderboard`, halaman `/play/peringkat`): semua anak aktif yang
  sudah menyelesaikan minimal satu ronde. Urutan: skor total ↓ → level lulus ↓ → total waktu ↑; nilai sama
  = posisi sama. Menampilkan 50 teratas + baris anak sendiri. Kolom: posisi, nama panggilan + warna Momo,
  skor, level tertinggi (buku jenjang tertinggi + nomor level, hanya skill aktif), total waktu.
- Profil anak: peringkat kini global ("Peringkat 3 dari 40"); kelas tetap ditampilkan sebagai info.
- **Mengubah PRD** A17 ("peringkat individu", "timer", "leaderboard individu") dan D-022 (hanya posisi sendiri
  di kelas). Mitigasi privasi: ke perangkat anak lain hanya dikirim nama panggilan + warna Momo (tanpa id,
  kelas, atau data orang tua; diuji di e2e). Risiko: nama panggilan terlihat oleh orang yang tidak dikenal.
  Saran moderasi nama panggilan (daftar kata terlarang) dicatat sebagai pekerjaan lanjutan.

## D-025 — Registrasi mudah: wizard keluarga, pendaftaran per kelas, gabung dengan kode kelas

Tanggal 2026-09-30 · Status **Disetujui** (pilihan pemilik produk: tiga alur).

1. **Keluarga (wizard 3 langkah):** Buat akun → Profil anak → Mulai main. Setelah daftar langsung ke form
   profil anak; setelah disimpan, dashboard menampilkan langkah 3 dan tombol "Mulai main" (kode keluarga
   sudah diingat perangkat).
2. **Per kelas oleh fasilitator/admin** (`POST /classes/:id/roster`): tempel daftar nama panggilan → akun anak
   dengan warna Momo & 3 gambar sandi acak (berbeda) → **kartu masuk siap cetak** (kode kelas + nama + gambar
   sandi). Sandi hanya tampil sekali; bisa dibuat ulang (`POST /classes/:id/students/:childId/pin`). Nama kembar
   di kelas dilewati. Fasilitator kini punya area `/fasilitator` (kelas miliknya + siswa).
3. **Siswa gabung sendiri** (`/play/gabung?kode=…`, `POST /auth/class/join`): kode kelas → nama panggilan →
   warna → 3 gambar sandi (diulang untuk konfirmasi). Tanpa email orang tua; persetujuan diwakili
   fasilitator kelas (dicatat di `parent_contacts` tanpa kontak). Kelas yang ditutup menolak pendaftaran.

- Layar masuk anak menerima **kode keluarga atau kode kelas**; kode dibuat unik di kedua tabel.
- Akun anak kelas tidak punya orang tua (`parent_id` null); orang tua dapat menautkannya kelak (belum dibuat).
- Staf: admin tetap membuat akun fasilitator (tidak ada pendaftaran staf publik).

## D-026 — Tampilan anak ringkas, materi per topik, dan alur selesai bermain

Tanggal 2026-09-30 · Status **Disetujui** (permintaan pemilik produk: tampilan anak "terlalu penuh" dan alur
selesai bermain "ambigu"). Semua perubahan tetap dalam aturan PRD A14: tanpa teks wajib dibaca (semua ada
tombol suara), target ≥ 64 px, dan satu keputusan per layar.

**Audit sebelum perubahan (`/play`):** kepala halaman berisi Momo, sapaan, dan tombol keluar; lalu 5 kartu
statistik dan 3 tombol; 6 tab buku; teks aturan; sampai 52 chip topik; dan semua kartu level sekaligus
(TK = 520 kartu). Tidak ada satu tombol utama, jadi anak harus memindai ratusan kartu. "Selesai main"
langsung keluar tanpa penjelasan. Layar hasil ronde punya 3 tombol yang sama kuat, dan panah kembali di
tengah ronde langsung membuang ronde tanpa bertanya.

**Susunan baru:**

1. **Beranda** `/play` berisi:
   - bilah atas: Momo + nama + skor (menuju Profilku), Peringkat, Selesai;
   - kartu **"Ayo lanjut belajar!"** dengan satu tombol besar **Main** ke level terbuka berikutnya, plus tautan "Baca materi dulu";
   - tab buku, lalu **kartu topik** (nomor, judul, progres x/10, terkunci/selesai). Daftar level tidak lagi tampil di Beranda.
2. **Halaman topik** `/play/topik/:domain/:grade/:code` berisi:
   - **Materi**: penjelasan singkat + 1–3 "Ingat!" + tombol suara, dan **contoh soal** dari Level 1 yang bisa dicoba, tidak dinilai, dan tidak dicatat;
   - 10 level dan aturan lulus;
   - satu tombol tetap di bawah: "Mulai Level n", atau "Topik berikutnya" bila semua level sudah lulus.
3. **Layar hasil** punya satu tombol utama:
   - **Lulus**: "Lanjut ke Level n+1", atau "Topik berikutnya: …" di level 10. Tautan kecil: main lagi untuk skor lebih tinggi, kembali ke topik.
   - **Gagal**: "Coba lagi". Tautan kecil: "Baca materi dulu".
4. **Berhenti di tengah ronde**: dialog "Berhenti dulu? Jawaban di ronde ini tidak dihitung" dengan pilihan
   Lanjut main / Berhenti. Stopwatch berhenti selama dialog tampil.
5. **Selesai main** `/play/selesai`: ringkasan hari ini (level dimainkan, lulus, waktu belajar), lalu **Main lagi** atau
   **Keluar**. Keluar hanya menutup sesi anak; kode keluarga/kelas tetap diingat perangkat.

**Materi topik (konten):** field opsional `intro` (≤ 300 huruf) dan `tips` (1–3 butir, ≤ 120 huruf) pada kategori
di `_catalog.json`. Sudah terisi untuk ke-117 topik. Admin bisa mengubahnya di Katalog ("Materi untuk anak").
Bila kosong, tampil kalimat umum.

**Perbaikan terkait:** saat level dibuka langsung, katalog dimuat dua kali (cache lalu server) sehingga soal
dibuat ulang dan ketukan pertama anak hilang. Kini soal hanya dibuat ulang bila id/versi skill berubah.

**Formulir dewasa:** isian wajib diberi tanda `*`, disertai keterangan "* wajib diisi" dan `required`/`aria-required`.
Kolom password punya tombol **Lihat/Tutup** (`aria-pressed`), dipakai di daftar/masuk orang tua dan masuk staf.

## D-027 — URL level/topik buram dan kunci level diperiksa di server

Tanggal 2026-09-30 · Status **Disetujui** (permintaan pemilik produk: tautan level jangan mudah ditebak,
misalnya `/play/latihan/math.sd12.a2.bilangan-lebih-kecil-sampai-20`).

- **URL buram:** `/play/latihan/<token>` dan `/play/topik/<token>`, dengan token 16 karakter base64url dari
  SHA-256(`lc-link-v1|<id anak>|level|<id skill>`) (Web Crypto). Token berbeda untuk setiap anak dan tidak
  bisa dibaca kembali menjadi nama skill. Perangkat memetakan token ke skill dari katalog yang sudah dimuat
  (`play/links.ts`), dan URL dengan id mentah tidak dikenali.
- **Ini penyamaran, bukan pengaman.** Pengamannya ada dua lapis:
  1. Perangkat tetap menolak membuka level terkunci.
  2. **Server** (`POST /practice/sync`) menghitung ulang status kunci dengan `levelStatuses` dari engine (skill
     aktif + urutan kategori + hasil anak). Ronde untuk level terkunci atau skill tidak aktif **ditolak**
     (`rejectedQuizzes`), sehingga tidak tercatat di skor maupun papan peringkat. Simulasinya berurutan menurut
     waktu, jadi lulus Level 1 lalu Level 2 dalam satu kiriman offline tetap sah.
- **Batas yang tersisa:** jumlah benar tetap dilaporkan oleh perangkat (offline-first). Validasi jawaban
  per soal di server bisa ditambahkan kelak bila papan global perlu lebih ketat.
- **Dampak:** tautan lama berisi id skill (mis. bookmark) tidak berlaku lagi; anak cukup masuk lewat Beranda.

## D-028 — Mengulang ronde memberi soal baru, tetap sesuai level

Tanggal 2026-09-30 · Status **Disetujui** (permintaan pemilik produk: saat gagal atau mengulang, beri soal
acak yang tidak sama, tapi tetap sesuai levelnya).

- Engine `generateRound(template, { seed, avoid })` menyusun 10 soal sekaligus:
  - band tetap mengikuti `quizBand` (mudah → sulit, level tidak berubah);
  - **tanpa soal kembar** dalam satu ronde;
  - **menghindari soal ronde-ronde sebelumnya**; bila variasi habis, dipakai soal yang paling lama tidak muncul.
    Dalam ronde yang variasinya sangat sedikit, soal dibagi rata dan tidak ada soal sama berurutan.
- Sidik jari soal = JSON kanonik (prompt + stimulus + interaksi). Urutan pilihan diabaikan, kecuali pada soal
  "urutkan", karena urutan awal kartu adalah soalnya. Riwayat disimpan per skill di perangkat sebagai kunci pendek
  cyrb53 (`recentItems`, 30 kunci ≈ 3 ronde) dan dicatat saat ronde dimulai.
- **Hasil pindai 1.170 skill** (ronde 1 lalu ronde ulang):
  - 883 skill memberi 10 soal baru.
  - 287 level punya ruang soal yang secara materi memang kecil (mis. "Pilih angka yang kamu dengar sampai 2" hanya
    punya 2 soal, dan 61 level punya ≤ 5 soal). Level ini memakai semua variasi bergiliran. Rentangnya sengaja tidak
    diperluas agar tetap sesuai level.
  - Tidak ada skill yang kurang optimal karena algoritma.
- Tata letak: kepala ronde diberi jarak atas `clamp(28px, 9vh, 96px)` dan jarak antar-bagian yang lega.

## D-029 — Konfigurasi `.env`, pemindahan database beserta data, dan umpan balik tanpa tumpukan

Tanggal 2026-09-30 · Status **Disetujui**.

**Penyimpanan (menjawab "apakah semua di PostgreSQL?"):** semua data server ada di PostgreSQL: akun staf, orang tua, anak, kelas, event,
progres, hasil ronde, katalog, skill, dan level. Perangkat anak hanya menyimpan **cache offline** di
`localStorage` (PRD A11): salinan katalog, progres terakhir, outbox yang belum terkirim, dan riwayat soal (D-028).
Cache ini disinkronkan ke server dan tidak menjadi sumber kebenaran.

**`.env`:**

- Sebelumnya API **tidak memuat** file `.env` sama sekali dan hanya memakai nilai bawaan di kode.
- Sekarang `apps/api/src/common/env.ts` memuat `.env` di root repo untuk API, seed, drizzle-kit, dan skrip db. Variabel yang sudah diset oleh lingkungan (CI/hosting) tetap menang.
- Vite memakai `envDir` root, sehingga hanya variabel `VITE_*` yang sampai ke browser.
- `.env` tetap di-gitignore karena berisi `JWT_SECRET`; `.env.example` adalah templatnya.
- `VITE_SYNC_ADAPTER` dihapus karena tidak dipakai.

**Migrasi & membawa data:**

- Skema: migrasi SQL Drizzle di `apps/api/drizzle/` (`0000_init`, `0001_quiz_results`, `0002_quiz_time`).
  `pnpm db:setup` = migrate + seed untuk instalasi baru.
- Konten: `content/` adalah sumber yang ikut git. `db:seed` menambah konten baru tanpa menimpa suntingan admin.
  `pnpm content:export` menulis suntingan admin dari DB kembali ke `content/` (divalidasi skema, hanya file yang
  berubah), sehingga konten ikut ke server lain.
- Data (akun, anak, progres): `pnpm db:backup` (pg_dump format custom → `backups/`, tidak masuk git, berisi data
  pribadi) lalu `pnpm db:restore -- <file>` di tujuan (dengan konfirmasi; menimpa isi DB tujuan), dilanjutkan
  `db:migrate && db:seed`. Diuji: backup DB dev → restore ke DB baru, jumlah baris semua tabel identik (termasuk
  riwayat migrasi), dan `db:migrate` sesudahnya aman.

**UI:** bilah umpan balik tidak lagi `position: fixed`. Kini bilah itu berada di alur halaman tepat di bawah soal, sehingga tidak
pernah menutupi pilihan atau tombol. Tombol cek disembunyikan setelah jawaban diperiksa. Gambar pembahasan berupa angka tunggal
tidak ditampilkan dua kali, karena jawabannya sudah ditandai hijau di papan.

## D-030 — Semua data runtime dari PostgreSQL, migrasi & seed siap produksi, umpan balik di footer

Tanggal 2026-09-30 · Status **Disetujui**.

- **Audit hardcode:** soal, katalog, materi topik, dan level sudah dibaca dari DB. Dua bagian yang masih membaca
  JSON/kode saat berjalan kini dipindah ke DB:
  1. Dialog Momo: tabel **`dialogs`** baru (migrasi `0003_dialogs`), diisi seed. Validasi level di admin
     membacanya dari DB.
  2. Rak buku di halaman depan: endpoint publik **`GET /public/books`** (judul, jumlah topik & level aktif, contoh
     topik), tanpa data pribadi. Tidak ada lagi daftar buku/angka level yang ditulis di kode.
     `content/` tetap ada sebagai **sumber seed & versi di git**, bukan sumber runtime. Teks antarmuka (i18n) tetap
     di kode karena bukan data.
- **Siap deploy:**
  - Migrasi & seed dipindah ke `apps/api/src/cli/` sehingga ikut build: `node dist/cli/migrate.js`
    (migrator drizzle-orm, tanpa drizzle-kit) dan `node dist/cli/seed.js`.
  - Skrip baru: `pnpm deploy:db` dan `pnpm start:api` (migrasi lalu API).
  - Di produksi seed **gagal di awal** bila `ADMIN_PASSWORD` kosong dan belum ada admin.
  - Diuji dari nol: build → DB kosong → migrate (2×) → seed (1.170 skill, 6 katalog, 3 level, 1 dialog, 1 admin)
    → API dari `dist` → `/public/books` dan login admin berhasil. Panduan: [docs/deploy.md](deploy.md).
- **UI:** umpan balik benar/salah menjadi **footer tetap** (lebar penuh, aman untuk safe-area). Tingginya diukur
  (ResizeObserver → `--feedback-h`) sebagai ruang di bawah halaman, dan halaman digulir agar pilihan jawaban
  selalu terlihat di atas footer (diukur: jarak 16–24 px, tanpa tumpukan).

## D-031 — Akses dari iPad di jaringan lokal & panduan deploy

Tanggal 2026-09-30 · Status **Disetujui**.

- **API di alamat yang sama (`/api`):** web tidak lagi memanggil `http://localhost:7177`, karena di iPad
  "localhost" berarti iPad itu sendiri. `VITE_API_URL` bawaan menjadi `/api`, dan permintaan diteruskan oleh
  proxy Vite (dev & preview) atau Nginx (server). Karena same-origin, CORS tidak diperlukan; `WEB_ORIGIN` tetap
  menerima daftar domain (dipisah koma) untuk kasus web dan API di domain berbeda.
- **Konteks tidak aman (http://192.168.x.x):** `crypto.subtle` tidak tersedia, sehingga tautan buram D-027 akan
  macet. Solusinya SHA-256 JavaScript murni sebagai cadangan, dengan hasil identik dengan Web Crypto (diuji
  terhadap `node:crypto` dan pada emulasi iPad). `crypto.randomUUID` sudah punya cadangan.
- **iPad:** `viewport-fit=cover` (safe-area untuk footer), meta web-app (layar penuh dari Layar Utama), ikon Momo
  (`apple-touch-icon.png`, `favicon.svg`).
- **Skrip:** `pnpm lan:info` (alamat IP), `pnpm dev:lan`, `pnpm lan` (build + deploy:db + API dist + preview).
- **Diuji:** emulasi iPad (Chrome, viewport/UA iPad) di `http://192.168.1.11:6006` dalam konteks tidak aman: landing
  (buku dari DB), login anak, bermain, dan login admin berhasil tanpa satu pun permintaan ke localhost. Build
  produksi web hanya berisi `/api`.
- **Deploy:** panduan langkah demi langkah Ubuntu + Nginx + systemd + HTTPS + cadangan cron di
  [docs/deploy.md](deploy.md). Contoh konfigurasi ada di `deploy/`.
