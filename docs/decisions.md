# Keputusan (Decision Log)

Keputusan di luar atau yang mengubah PRD. Status: **Disetujui** (oleh pemilik produk) atau
**Usulan** (default sementara dari Claude Code — perlu dikonfirmasi; boleh dibatalkan tanpa biaya besar).

| ID    | Tanggal    | Keputusan                                               | Status              |
| ----- | ---------- | ------------------------------------------------------- | ------------------- |
| D-001 | 2026-09-28 | Backend: NestJS + PostgreSQL, menggantikan Supabase     | Disetujui           |
| D-002 | 2026-09-28 | ORM: Drizzle + drizzle-kit                              | Usulan              |
| D-003 | 2026-09-28 | Realtime: Socket.IO lewat `@nestjs/websockets`          | Usulan (dipakai M5) |
| D-004 | 2026-09-28 | Login fasilitator: magic link buatan sendiri + JWT      | Usulan (dipakai M5) |
| D-005 | 2026-09-28 | Versi dipin ke major stabil; React 18                   | Usulan              |
| D-006 | 2026-09-28 | Engine ESM dengan export condition `source`             | Usulan              |
| D-007 | 2026-09-28 | Postgres lokal (Postgres.app), tanpa Docker             | Disetujui           |
| D-008 | 2026-09-29 | Momo berhenti begitu sampai tujuan                      | Usulan              |
| D-009 | 2026-09-29 | Hitungan kartu: `move n` = n kartu                      | Usulan              |
| D-010 | 2026-09-29 | Bintang bertingkat (3 mensyaratkan 2)                   | Usulan              |
| D-011 | 2026-09-29 | Batas "4 jenis kartu" berlaku untuk palette/pilihan     | Usulan              |
| D-012 | 2026-09-29 | Field grid tambahan: `puddles`, `goal.collectAll`       | Usulan              |
| D-013 | 2026-09-29 | Solver: makro `repeat` berisi datar; `if` menyusul      | Usulan              |
| D-014 | 2026-09-29 | Peran: admin, fasilitator, orang tua, anak              | Disetujui           |
| D-015 | 2026-09-29 | Staf & orang tua login email + password                 | Disetujui           |
| D-016 | 2026-09-29 | Anak login: kode keluarga + profil + sandi gambar       | Disetujui           |
| D-017 | 2026-09-29 | Admin kelola semua: skill, soal, level, user, lapor     | Disetujui           |
| D-018 | 2026-09-29 | Katalog Pra-TK Matematika penuh, semua bisa dimain      | Disetujui           |
| D-019 | 2026-09-29 | Generator berbasis "family" + ekspresi A10              | Usulan              |
| D-020 | 2026-09-29 | Kategori B (kelas 3–4): 3 level, gaya OSN               | Diganti D-023       |
| D-021 | 2026-09-30 | Ronde level 10 soal, skor ≥ 70 lulus, merah/hijau       | Disetujui           |
| D-022 | 2026-09-30 | Profil anak + peringkat di kelas (posisi sendiri)       | Diganti D-024       |
| D-023 | 2026-09-30 | Semua buku 10 level/topik; TK, Grade 1-2 baru           | Disetujui           |
| D-024 | 2026-09-30 | Stopwatch tanpa batas + papan peringkat global          | Disetujui           |
| D-025 | 2026-09-30 | Registrasi: wizard keluarga, daftar kelas, gabung       | Disetujui           |
| D-026 | 2026-09-30 | Tampilan anak ringkas + materi topik + alur selesai     | Disetujui           |
| D-027 | 2026-09-30 | URL level/topik buram + kunci level dicek server        | Disetujui           |
| D-028 | 2026-09-30 | Ulang ronde = soal baru (tanpa kembar, sesuai level)    | Disetujui           |
| D-029 | 2026-09-30 | .env dimuat, backup/restore DB, umpan balik inline      | Disetujui           |
| D-030 | 2026-09-30 | Semua data runtime dari DB; migrate/seed produksi       | Disetujui           |
| D-031 | 2026-09-30 | Akses jaringan lokal (iPad) + panduan deploy            | Disetujui           |
| D-032 | 2026-09-30 | Buku per kelas: Sains 1–4, Math 1–2 (1.560 level)       | Disetujui           |
| D-033 | 2026-09-30 | Rak buku bergeser (10/halaman) + statistik realtime     | Disetujui           |
| D-034 | 2026-09-30 | Sains Kindergarten (TK) + rak 9 buku/halaman            | Disetujui           |
| D-035 | 2026-10-01 | Suara Momo: perintah & respons, Google Cloud TTS        | Disetujui           |
| D-036 | 2026-10-01 | Paket berbayar, transfer manual, buku kas, komisi       | Disetujui           |
| D-037 | 2026-10-01 | Anak daftar sendiri tanpa orang tua (tanpa email)       | Disetujui           |
| D-038 | 2026-10-01 | Dasbor orang tua beranimasi + insight; landing harga    | Disetujui           |
| D-039 | 2026-10-01 | Sidebar bisa disembunyikan; laporan admin & guru        | Disetujui           |
| D-040 | 2026-10-01 | Audit keamanan peran, email, rate limit, header         | Disetujui           |
| D-041 | 2026-10-01 | Premium dari admin; status Free/Premium; direktori      | Disetujui           |
| D-042 | 2026-10-02 | Peringkat rata-rata & per buku; jenjang; lomba; banner  | Disetujui           |
| D-043 | 2026-10-02 | Mode total skor; masa paket; soal dengar; API key admin | Disetujui           |

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

## D-032 — Buku per kelas: Sains Grade 1–4 dan Math Grade 1–2 (struktur IXL, adaptasi Indonesia)

Tanggal 2026-09-30 · Status **Disetujui**. Pilihan pemilik produk: buku baru terpisah (buku lama tidak diubah),
cakupan "Semua Sains + Math 1–2", dan adaptasi Indonesia.

| Buku          | Folder      | Topik (kode IXL) | Level | Fase                                   |
| ------------- | ----------- | ---------------- | ----- | -------------------------------------- |
| Math Grade 1  | `math/sd1`  | 41 (A–OO)        | 410   | A (101–120 pengayaan)                  |
| Math Grade 2  | `math/sd2`  | 39 (A–MM)        | 390   | A; bilangan sampai 1.000 = pengayaan/B |
| Sains Grade 1 | `sains/sd1` | 16 (A–P)         | 160   | A (pengayaan; IPAS mulai Fase B)       |
| Sains Grade 2 | `sains/sd2` | 9 (A–I)          | 90    | A (pengayaan)                          |
| Sains Grade 3 | `sains/sd3` | 25 (A–Y)         | 250   | B                                      |
| Sains Grade 4 | `sains/sd4` | 26 (A–Z)         | 260   | B; sebagian topik C                    |

- **Jenjang baru** `sd3` dan `sd4`. Urutan rak per mata pelajaran: Pra-TK, TK, Grade 1, Grade 2, Grade 1-2 (lama),
  Grade 3, Grade 4, Grade 3-4 (lama).
- **Aturan konten tetap sama** (D-023/D-026/D-028): setiap topik tepat 10 level mudah → sulit, level 10 tantangan, materi
  (intro + tips) per topik, sumber nyata per tabel/soal, jawaban tunggal, dan ronde ulang memberi soal baru.
- **Adaptasi Indonesia:**
  - Satuan metrik saja; uang Rupiah emisi 2016; jam 24 dan pagi/siang/sore/malam.
  - Musim hujan & kemarau; cuaca ekstrem Indonesia (banjir, puting beliung, siklon tropis).
  - Hewan, tumbuhan, dan tempat Indonesia (kontras gurun/kutub tetap dipakai).
  - Topik "engineering" menjadi soal memilih rancangan beserta alasannya.
- **Interaksi IXL yang belum ada** (seret, gambar, susun diagram, garis bilangan >20, termometer, uang kertas
  bergambar, kalender 7 kolom) diganti soal pilihan, ketuk-semua, atau isian yang menguji konsep sama; daftar per
  buku ada di laporan generator. Ini kandidat fitur engine berikutnya.
- **Mutu:**
  - Pemeriksa per buku: validasi skema + 200 soal/level, 10 level/topik, dan materi. Hasilnya 0 masalah.
  - Variasi: 1.557 dari 1.560 level memberi 10 soal baru saat diulang. Tiga level (Sains 3: muatan listrik & kutub magnet)
    ruang soalnya memang kecil.
  - Pindai teks 7.800 soal: kata ganda / templat bocor / kurung dan kutip tidak berpasangan = 0. Dua perbaikan engine
    ditemukan dari pindai ini: satuan ganda di pembahasan `expr` ("cm cm") dan negasi ganda di templat `facts`.
- **Seed:** katalog kini punya `updated_by` (migrasi `0004`). `db:seed` tidak menimpa katalog yang disunting admin
  (kecuali `--force`), sama seperti skill. Sebelumnya seed selalu menimpa katalog, sehingga judul "Math Pra-TK"
  hasil suntingan admin sempat kembali ke bawaan; judulnya sudah dipulihkan.
- **Belum:** Math Grade 3 (daftar topik di pesan pemilik terpotong; kini dibuat di D-061) dan tinjauan guru untuk buku baru.

## D-033 — Rak buku landing bergeser (10 per halaman) dan statistik realtime

Tanggal 2026-09-30 · Status **Disetujui** (permintaan pemilik produk).

- **Rak buku:**
  - Maksimal **10 buku per halaman**. Bila lebih, rak menjadi slide: tombol ‹ ›, titik halaman, keterangan
    "Buku 1–10 dari 12", dan bisa digeser dengan jari (scroll-snap) di iPad/HP.
  - Tinggi rak mengikuti halaman aktif. Posisi tetap di halaman yang sama saat layar diputar.
  - Aksesibilitas: `aria-roledescription="carousel"`, dan halaman yang tidak aktif `aria-hidden`.
  - ≤10 buku tetap tampil sebagai grid biasa.
- **Statistik hero** (dari PostgreSQL, `GET /public/stats`):
  - jumlah buku, jumlah level, 10 soal per level;
  - **total pengguna** (orang tua + anak + staf yang aktif);
  - **anak yang sedang belajar** (aktif ≤10 menit);
  - **ronde dimainkan**.
    Hanya angka agregat, tanpa nama atau data pribadi; di-cache 5 detik.
- **Realtime:**
  - Server-Sent Events `GET /public/stats/stream`. Server mengirim angka saat tersambung, lalu setiap kali
    angkanya berubah (dicek tiap 10 detik).
  - Web menampilkan chip "● Langsung". Bila SSE terputus, web beralih ke polling 30 detik ("Diperbarui berkala")
    sambil EventSource menyambung ulang sendiri.
  - SSE dipilih (bukan WebSocket) karena alirannya satu arah, lewat HTTP biasa, dan berjalan melalui proxy
    Vite/Nginx. Nginx diberi blok khusus `proxy_buffering off` di `deploy/nginx.conf.example`.
- **Diuji:**
  - Web: halaman 10 + 2, tombol, titik, dan pembaruan dari event SSE.
  - API e2e: angka cocok dengan tabel, tidak ada field pribadi, dan event pertama SSE terkirim.
  - Browser: desktop, iPad, dan ponsel lewat IP jaringan lokal, tanpa scroll ke samping.

## D-034 — Buku Sains Kindergarten (TK) dan rak 9 buku per halaman

Tanggal 2026-09-30 · Status **Disetujui** (permintaan pemilik produk).

- **Rak buku landing** berisi 9 buku per halaman (grid 3 × 3); lebih dari 9 buku → halaman berikutnya (D-033).
- **Sains Kindergarten (TK)** (`sains/tk`, tier `basic`): 15 topik IXL A–O × 10 level = 150 level, dengan aturan yang
  sama seperti D-023/D-026/D-032. Aturan tambahan untuk anak yang belum lancar membaca (PRD A14):
  - soal sangat pendek (±8 kata) dan dibacakan; pilihan teks selalu punya suara;
  - utamakan pilihan bergambar;
  - maksimal 3 pilihan di level 1–5 dan 4 pilihan di level 6–10;
  - tanpa negasi di level 1–3;
  - aturan di atas diperiksa otomatis oleh generator.
  - Fase: Fondasi (PAUD). Sumber: CP PAUD Fase Fondasi, NGSS Kindergarten, BMKG, BNPB, dan NASA Space Place.
- **Mutu:**
  - Pemeriksa 0 masalah; 137/150 level memberi 10 soal baru saat diulang. 13 level lainnya punya bank soal kecil
    (tetap 10 soal unik per ronde).
  - Pindai teks tanpa temuan selain spasi pada "...".
  - Satu level ("Sinar matahari dan tempat teduh") ditemukan memakai tabel panas/dingin makanan yang tidak sesuai topik;
    tabelnya diganti tabel terik/teduh.

## D-035 — Suara Momo: hanya perintah soal & respons jawaban, dibuat sekali lalu di-cache

Tanggal 2026-10-01 · Status **Disetujui** (pemilik produk: "khas suara Momo yang ceria dan lembut, hanya untuk perintah
soal dan respons jawaban, bukan membacakan seluruh soal"; soal TK: "suara Momo, dibuat saat diputar").

- **Yang bersuara Momo:**
  - perintah per jenis soal (8 kalimat `vo_cmd_*`, mis. "Pilih satu jawaban yang paling tepat, ya.");
  - respons jawaban: 5 `vo_right_*` dan 3 `vo_wrong_*`;
  - skor ronde (`vo_score_0..100`) dan hasil (`vo_passed`, `vo_passed_last`, `vo_retry`, `vo_locked`, `vo_paid`).
  - Total 32 kalimat, tersimpan di dialog (database `dialogs`, sumber `content/dialog/momo.id.json`), bisa disunting
    admin. Validator konten mewajibkan semuanya ada.
- **Kelas 1+:** hanya perintah yang dibacakan, bukan seluruh soal. **Basic (Pra-TK/TK):** kalimat soal dan pembahasan
  dibacakan suara Momo yang dibuat saat pertama diputar lalu disimpan, karena anak belum bisa membaca (PRD A14).
  Server menurunkan teksnya sendiri dari skill + seed + band, jadi browser tidak bisa meminta teks bebas.
- **Penyedia:** Google Cloud Text-to-Speech, model Gemini-TTS (`gemini-2.5-flash-tts`), id-ID GA.
  - Suara bawaan **Leda** dengan arahan gaya ceria, lembut, hangat, pelan, dan jelas; kecepatan 0,95. Semuanya bisa
    diubah di admin.
  - Kunci `GOOGLE_TTS_API_KEY` hanya ada di server. **Bukan** kunci Google AI Studio, karena syarat Gemini API
    melarang aplikasi yang ditujukan untuk pengguna di bawah 18 tahun.
- **Cache:**
  - klip MP3 disimpan di PostgreSQL (`voice_clips`, kunci = SHA-256 model|suara|gaya|kecepatan|teks), jadi ikut
    backup/restore dan tidak pernah dibuat ulang;
  - disajikan dengan `Cache-Control: immutable`;
  - perangkat menyimpan daftar kalimat untuk offline;
  - batas `TTS_DAILY_LIMIT` (bawaan 3.000) klip baru per hari, ditambah batas per IP untuk soal Basic.
- **Cadangan:** tanpa kunci, saat offline, atau bila klip belum mulai dalam 2,5 detik → suara browser seperti
  sebelumnya.
- **Pembuatan:** `pnpm voice:generate` (server: `node dist/cli/voice.js`), atau tombol "Buat semua suara" di
  admin.
- **Perkiraan biaya:** 32 kalimat < $0,01 sekali; soal Basic sekitar $0,0008 per kalimat baru, lalu gratis selamanya
  karena di-cache.
- **Tidak diambil:** suara anak laki-laki/perempuan sesuai gender anak. Menyimpan gender melanggar PRD A17, dan
  Gemini-TTS tidak mendukung mengubah usia/gender lewat prompt.
- **Teks umpan balik:** kata "Salah"/"Gagal" di layar diganti "Belum tepat"/"Hampir!" (aturan UX anak).

## D-036 — Paket berbayar, pembayaran transfer manual, buku kas, dan komisi owner

Tanggal 2026-10-01 · Status **Disetujui** (pemilik produk; mengubah PRD A2/A17 yang menaruh pembayaran di luar MVP).

- **Kunci berbayar:** level 1–N setiap topik gratis (N diatur admin, bawaan 2); level berikutnya perlu paket.
  - Dicek di perangkat (status `paid`) dan di server: sync menolak ronde level berbayar yang belum dibeli.
  - Anak hanya melihat "Level ini perlu dibuka oleh Ayah atau Bunda", **tanpa harga atau ajakan membeli**.
  - Pembayaran hanya ada di area orang tua.
  - Anak di kelas workshop yang masih buka mendapat akses penuh (dapat dimatikan: `classFullAccess`).
  - Paywall bisa dimatikan total.
- **Paket diatur admin:**
  - nama, deskripsi, cakupan (semua buku termasuk buku baru, atau buku tertentu), masa aktif (selamanya / N hari),
    harga rupiah;
  - diskon persen (1–90%) atau nominal, dengan periode opsional; harga akhir minimal Rp1.000;
  - orang tua melihat harga normal (dicoret) dan harga diskon;
  - hak akses berlaku untuk semua anak di keluarga; membeli ulang paket berbatas waktu memperpanjang dari akhir masa
    aktif.
- **Transfer manual:**
  - admin mengisi rekening bank / e-wallet (nama, nomor, atas nama, petunjuk);
  - total = harga akhir + **kode unik 1–499 sehingga total selalu ganjil** (mis. 35.000 → 35.111), unik di antara
    pesanan yang masih terbuka;
  - pesanan kedaluwarsa setelah N jam (bawaan 24);
  - orang tua mengunggah bukti (JPG/PNG/WEBP/PDF ≤ 2 MB, jenis dicek dari isi file), lalu admin menyetujui atau
    menolak dengan alasan; bukti yang ditolak bisa diunggah ulang;
  - paket & rekening disalin ke pesanan, jadi riwayat tidak berubah; ada riwayat transaksi untuk orang tua dan admin.
- **Buku kas:**
  - pemasukan otomatis dari pesanan yang disetujui (tidak bisa diubah manual);
  - pengeluaran/pemasukan lain diinput admin;
  - ringkasan per bulan dan per tahun (tanggal WIB).
- **Komisi owner:**
  - banyak owner, persen dinamis (basis poin, mis. 12,5%), total owner aktif maksimal 100%;
  - komisi = persen × laba bersih bulan itu (pemasukan − pengeluaran; rugi → 0);
  - bulan berjalan = perkiraan; "Tutup bulan" (hanya bulan yang sudah lewat) membekukan angka, dan buku kas bulan itu
    terkunci;
  - tiap komisi bisa ditandai sudah dibayar.
- **Privasi:** bukti transfer adalah data orang tua (bukan anak), tersimpan di PostgreSQL dan ikut backup. Hanya
  pemiliknya dan admin yang bisa melihat.

## D-037 — Anak daftar sendiri tanpa orang tua

Tanggal 2026-10-01 · Status **Disetujui** (pilihan pemilik produk: "Anak tanpa email").

- Alur `/play/daftar`: nama panggilan → warna Momo → 3 gambar sandi (2×) → anak mendapat **kode keluarga sendiri**
  (`children.self_code`) untuk masuk lagi.
  - Kode ditampilkan besar dan dibacakan, serta ada di profil anak.
  - Sesi baru dipasang setelah anak menekan "Mulai bermain".
- Yang disimpan hanya nama panggilan, warna Momo, dan hash sandi gambar (PRD A17); tanpa email/kontak. Dibatasi
  5 pendaftaran per jam per alamat IP.
- **Tautkan ke orang tua:**
  - orang tua memasukkan kode anak + sandi gambarnya di dasbor (`POST /parent/children/claim`);
  - setelah ditautkan, paket keluarga berlaku dan laporan muncul; kode anak tetap bisa dipakai masuk;
  - anak yang sudah tertaut ke orang tua lain tidak bisa diambil alih.
- Pembelian paket tetap lewat orang tua. Anak yang daftar sendiri memakai level gratis sampai ditautkan.

## D-038 — Dasbor orang tua yang beranimasi & berwawasan; landing: daftar sendiri + harga

Tanggal 2026-10-01 · Status **Disetujui** (permintaan pemilik produk: "dashboard yang animasi, insightful, mudah
dimengerti, bisa lihat progress anak dengan menarik"; "landing untuk register sudah disesuaikan?").

- **Dasbor `/orang-tua`** memakai satu panggilan `GET /parent/overview`. Ringkasan dihitung oleh fungsi murni engine
  `childInsights` (dengan test).
  - Hero keluarga untuk minggu ini: ronde, ronde lulus, menit belajar, dan anak aktif.
  - Tab per anak. Isinya:
    - total skor, level lulus, ronde, dan waktu belajar;
    - grafik 7 hari (WIB), dengan bagian hijau untuk ronde yang lulus;
    - tren rata-rata skor dibanding minggu lalu;
    - progres per buku (cincin + bar) dan 5 ronde terakhir.
  - Insight berbahasa sehari-hari:
    - langkah berikutnya (level terbuka pertama di buku terakhir; bila berbayar → tautan ke halaman paket);
    - topik yang sedang kuat (≥ 2 level lulus);
    - topik yang perlu ditemani (belum lulus, percobaan terbanyak), dengan saran membaca materi bersama;
    - kebiasaan belajar (hari aktif minggu ini). Tidak ada streak, peringkat antar anak, atau angka yang
      membandingkan anak.
  - Anak yang belum pernah main → 3 langkah mulai bermain.
  - Animasi CSS (muncul bertahap, angka naik, batang & cincin terisi, Momo bergoyang); mati otomatis bila
    `prefers-reduced-motion`.
  - Kartu kelola (kode keluarga, tautkan anak, paket) dipindah ke bawah.
- **Landing:**
  - tombol "Anak daftar sendiri" (`/play/daftar`) di hero dan di pintu Anak; "Punya kode kelas?" tetap ada;
  - teks pintu Keluarga menyebut dasbor progres dan paket;
  - bagian **Harga** dari `GET /public/pricing`: kartu Gratis (Level 1–N setiap topik) dan paket aktif dengan
    harga normal dicoret dan harga diskon; pembelian lewat "Daftar keluarga";
  - teks fitur suara disesuaikan dengan suara Momo (D-035).

## D-039 — Sidebar bisa disembunyikan; laporan admin & guru yang bermakna

Tanggal 2026-10-01 · Status **Disetujui** (permintaan pemilik produk).

- **`AppShell`** (`apps/web/src/ui/AppShell.tsx`) dipakai area orang tua (tema terang), admin, dan guru (tema
  gelap).
  - Desktop: sidebar penuh ↔ rel ikon lewat tombol "Sembunyikan/Tampilkan menu"; pilihannya diingat per perangkat.
  - Tablet/HP: laci dengan tombol menu (Esc, ketuk latar, atau pilih menu untuk menutup).
  - Badge untuk hal yang perlu tindakan.
- **Ringkasan admin** dari `GET /admin/insights?days=7|30|90`:
  - KPI: pendapatan bulan ini vs bulan lalu, total pendapatan & rata-rata per transaksi, transaksi lunas, menunggu
    verifikasi/bayar, keluarga, anak, anak aktif 7 hari, ronde;
  - catatan otomatis (verifikasi tertunda, tren pendapatan, % keluarga membeli, pesanan hilang, buku dengan
    tingkat lulus rendah, % anak aktif);
  - grafik pendapatan & ronde harian;
  - status transaksi, paket terlaris, transaksi terbaru;
  - pengguna per jenis, belajar (tingkat lulus, buku terpopuler), dan keuangan bulan & tahun ini.
  - Tabel skill tersulit & pengecoh tetap ada.
- **Ringkasan guru** (`/fasilitator`, `GET /facilitator/insights`, hanya kelas miliknya; admin melihat semua):
  - KPI kelas, siswa, aktif, ronde, % lulus;
  - grafik 14 hari;
  - kartu per kelas;
  - siswa yang perlu dibantu (≥ 3 percobaan belum lulus);
  - aktivitas terbaru.
  - Kelas dipindah ke `/fasilitator/kelas`.

## D-040 — Audit keamanan peran & autentikasi

Tanggal 2026-10-01 · Status **Disetujui** (permintaan pemilik produk: audit authorization, email, dan roles).
Rincian temuan dan status ada di [docs/security.md](security.md). Ringkasnya:

- Guard memeriksa akun di DB (aktif + peran) dan `JWT_SECRET` wajib diisi.
- Kunci sandi gambar bertingkat dan rate limit per IP (`trust proxy`).
- Email ketat & tidak membedakan huruf besar/kecil (indeks `lower(email)`, migrasi 0006).
- Header keamanan; batas pesanan terbuka; template berbayar tidak terkirim.
- Akses penuh kelas hanya untuk siswa tanpa orang tua.
- Sesi orang tua 7 hari.
- **Belum:** verifikasi kepemilikan email (butuh layanan email/SMTP — keputusan terpisah).

## D-041 — Premium dari admin, status Free/Premium, dan direktori pengguna

Tanggal 2026-10-01 · Status **Disetujui** (permintaan pemilik produk: "admin bisa set user — anak atau yang daftar
sendiri — jadi premium untuk akses semua kelas, dan ini tidak masuk catatan arus kas").

- **Premium dari admin selalu per anak** (revisi 2026-10-01). Di menu Orang tua & anak, setiap anak punya tombol
  "Atur Premium":
  - anak di keluarga: hanya anak itu yang Premium — saudaranya **tidak ikut**;
  - anak yang daftar sendiri: per orang.
  - Tidak ada lagi Premium sekeluarga dari admin. Migrasi 0008 memecah Premium keluarga dari admin yang masih
    berlaku menjadi Premium per anak aktif (masa berlaku, catatan, dan pemberi sama), lalu mengakhiri yang lama.
  - Paket yang **dibeli** orang tua tetap berlaku untuk semua anak di keluarga (aturan pembelian, D-036).
  - Masa berlaku: selamanya / 30 / 90 / 180 / 365 hari (diperpanjang dari masa yang masih berjalan), dengan catatan
    opsional; bisa dicabut.
  - Disimpan sebagai hak akses `source = admin` dengan `child_id` (migrasi 0007). Tidak membuat pesanan, **tidak
    masuk buku kas**, dan tidak dihitung sebagai pendapatan atau komisi.
  - Hak dari pembelian paket tidak bisa dicabut dari sini.
- **Status** dihitung `planStatus` (engine): **Premium** (semua buku), **Paket buku** (sebagian), atau **Free**,
  lengkap dengan asal (dibeli / diberikan admin) dan masa berlaku. Untuk anak = hak keluarga + hak anak itu sendiri.
  Ditampilkan di direktori admin dan di dasbor orang tua (dengan tautan "Lihat paket" bila Free). Tidak ditampilkan
  di area anak (tanpa unsur komersial bagi anak).
- **Direktori `/admin/keluarga`:**
  - ringkasan: keluarga, anak (daftar sendiri / siswa kelas), anak Premium (berapa yang daftar sendiri), Premium
    dari admin;
  - tab **Keluarga**: kartu per keluarga berisi "x dari y anak Premium" dan setiap anak dengan status & aksinya
    sendiri. Tab **Anak**: tabel; di HP menjadi kartu;
  - cari, filter status / jenis anak / akun aktif, urutan (terbaru, terlama, nama, terakhir aktif);
  - paging di server (10/20/50 per halaman); filter tersimpan di URL;
  - aksi lama tetap ada: laporan, ganti sandi gambar, aktif/nonaktif, atur password orang tua.
- Catatan (2026-10-08): Premium keluarga lama dari admin (sudah dipecah per anak lalu diakhiri, migrasi 0008) tidak
  dihitung lagi di `accessForChild`. Anak yang ditambahkan sesudahnya tidak lagi melihat "masa paket sudah berakhir";
  ia melihat pemberitahuan biasa "Khusus Premium" sampai admin memberinya Premium per anak. Katalog di perangkat
  diperbarui tiap 15 detik (ETag/304), jadi Premium baru dari admin cepat terlihat.

## D-042 — Peringkat rata-rata & per buku, materi per jenjang, lomba live, banner & galeri

Tanggal 2026-10-02 · Status **Disetujui** (permintaan pemilik produk). Aturan rinci yang belum diatur PRD diisi
default berikut (bisa diubah):

- **Peringkat** (mengganti urutan total skor D-024):
  - global = rata-rata skor semua ronde yang dikerjakan (0–100, 2 desimal, mis. 87,53 — sama dengan persen benar
    dari semua soal); rata-rata sama → total waktu lebih cepat; lalu ronde lebih banyak. Posisi berurutan;
  - peringkat per buku (MTK TK, MTK Grade 1, Sains Grade 3, …);
  - Top 25 tampil seperti papan pengumuman (UN/OSN); detail Top 25 (rata-rata per buku & per topik) bisa dibuka
    pengguna yang login. Peserta lainnya tetap tercantum di bawahnya dengan paging;
  - yang terlihat hanya nama panggilan + warna Momo.
- **Materi per jenjang** di area anak: pilih jenjang dulu (Pra-TK, TK, Kelas 1, Kelas 2, Kelas 1–2 (OSN), Kelas 3,
  Kelas 4, Kelas 3–4 (OSN)), lalu buku di jenjang itu. Kelas 1 dan 2 tetap terpisah dari Kelas 1–2.
- **Lomba live** (`contests`, migrasi 0009):
  - admin membuat lomba per buku (opsional per topik), jumlah soal, jadwal mulai–selesai serentak, batas waktu per
    peserta, dan jumlah pemenang;
  - soal dibuat & dinilai **di server**: perangkat menerima soal tanpa kunci jawaban, pembahasan, atau label pengecoh
    (`publicItem`);
  - waktu dari jam server; satu kali ikut per anak; satu jawaban per soal; tidak ada umpan balik benar/salah selama
    lomba; batas laju; kejanggalan (keluar halaman, menjawab terlalu cepat) dicatat untuk ditinjau admin, yang bisa
    mendiskualifikasi;
  - pemenang dihitung otomatis setelah waktu habis: benar terbanyak → waktu tercepat → selesai lebih dulu.
- **Banner slideshow** (kegiatan, promosi, info) di landing, dasbor orang tua, dan admin — **tidak** di area anak.
  **Galeri dokumentasi** di landing. Gambar diunggah admin (JPG/PNG/WEBP, dicek dari isi file) dan disimpan di
  PostgreSQL (`media`), sehingga ikut backup.
- **Detail penerapan (2026-10-02):**
  - **Lomba:**
    - id pilihan jawaban diacak dengan kunci rahasia di server, karena beberapa generator memakai id yang bisa
      membocorkan jawaban;
    - hitung mundur hanya di lomba — acara terpisah yang diikuti sukarela. Ini pengecualian dari larangan batas
      waktu di level utama;
    - warna tetap tenang (kuning di menit terakhir, tanpa merah) dan tanpa umpan balik benar/salah selama lomba;
    - lomba terbuka untuk semua anak, tidak dibatasi paket;
    - admin bisa mengunduh hasil (CSV).
  - **Banner:** banner untuk orang tua/admin hanya diambil setelah login. Gambar disajikan lewat id acak (UUID).
    Tautan tombol hanya `/…` (internal) atau `https://`.
  - **Peringkat:** detail Top 25 bisa dibuka anak, orang tua, dan staf yang login. Anak selalu bisa melihat detail
    dirinya sendiri.

## D-043 — Papan peringkat 2 mode, masa paket, soal dengar dibacakan, API key suara dari admin

Tanggal 2026-10-02 · Status **Disetujui** (permintaan pemilik produk).

- **Papan peringkat** punya pilihan urutan (tersimpan di perangkat), berlaku untuk papan global maupun per buku,
  25 besar, dan detail:
  - **Rata-rata** (D-042, bawaan);
  - **Total skor** (seperti D-024): jumlah skor terbaik tiap level → level lulus terbanyak → waktu skor terbaik
    tercepat.
- **Masa paket berlangganan (30/90/… hari):**
  - akhir masa aktif dihitung tepat (`entitlementEnd`); beli ulang paket yang sama memperpanjang dari akhir yang
    masih berjalan;
  - setelah habis, level di atas level gratis terkunci lagi, di perangkat (`paid`) dan di server (sync menolak);
    template berbayar tidak dikirim lagi;
  - **skor, riwayat ronde, level lulus, peringkat, dan laporan tetap tersimpan**; level 1–N tetap bisa dimainkan;
  - beli lagi → terbuka kembali dengan progres lama;
  - dasbor orang tua mengingatkan ≤ 7 hari sebelum berakhir dan setelah berakhir (≤ 30 hari).
  - Diuji di `apps/api/test/subscription.e2e.test.ts`.
- **Soal "dengar"** (mis. "Dengarkan, lalu tulis angkanya", yang isinya hanya ada di kalimat yang diucapkan):
  - selalu dibacakan lengkap di semua jenjang (`isListeningItem`), tidak hanya perintahnya (memperbaiki D-035);
  - suara Momo untuk kalimat itu juga boleh dibuat server.
- **API key suara dari admin** (Admin → Suara Momo):
  - disimpan terenkripsi AES-256-GCM (kunci turunan JWT_SECRET) di `app_settings.voice_key`, tidak pernah
    dikirim balik (hanya 4 karakter terakhir);
  - bisa diuji dan dihapus;
  - urutan pemakaian: `.env` GOOGLE_TTS_API_KEY → kunci admin → suara browser.
  - Memakai Google Cloud Text-to-Speech (model Gemini-TTS), bukan key Google AI Studio.

## D-044 — Email: verifikasi pendaftaran & notifikasi transaksi

Tanggal 2026-10-02 · Status **Disetujui** (permintaan pemilik produk). Panduan: [email.md](email.md).

- **Pengirim:** Gmail SMTP `project.udacoding@gmail.com` dengan App Password. Rahasia hanya ada di `.env` server,
  tidak di DB dan tidak di UI.
- **Verifikasi wajib:**
  - orang tua yang baru daftar harus memasukkan kode 6 angka dari email sebelum bisa masuk;
  - kode: TTL 15 menit, 5 percobaan, disimpan sebagai hash; jeda kirim ulang 60 detik;
  - akun yang sudah ada sebelum fitur ini dianggap terverifikasi;
  - admin bisa menandai terverifikasi secara manual.
- **Transaksi:** pesanan dibuat, bukti diterima, dibayar, dan ditolak → email ke orang tua dan salinan ke
  direksi (`MAIL_DIRECTOR`, bawaan `udacodingofficial@gmail.com`).
- **Isi email:** hangat, profesional, ramah anak; footer **"Momo From Udakids"**. Tanpa data anak selain yang sudah
  diketahui orang tua; tidak pernah berisi password atau sandi gambar.
- **Antrean `email_outbox`** dengan percobaan ulang; isi dihapus setelah terkirim. Di dev tanpa SMTP, isi dicetak
  di log.

## D-045 — Nilai peringkat tertimbang, total soal dijawab, Top 10 landing, notifikasi admin, wizard 3 langkah

Tanggal 2026-10-03 · Status **Disetujui** (permintaan pemilik produk; diuji di lokal sebelum deploy).

- **Peringkat "Rata-rata" diganti nilai peringkat (rata-rata tertimbang / Bayesian average):**
  - Rumusnya `(jumlah skor + 5 × 70) / (ronde + 5)`: setiap anak dianggap mulai dengan 5 ronde bernilai 70
    (batas lulus `PASS_SCORE`), lalu ronde aslinya menggeser nilai itu ke rata-rata sebenarnya.
  - Kalau nilai peringkat sama: rata-rata asli lebih tinggi → waktu lebih cepat → ronde lebih banyak.
  - **Alasan, dari data produksi 2026-10-03:** dengan rata-rata murni, Yasmine (1 ronde, 100) berada di #2,
    sedangkan Maryam (82 ronde, 94,63) di #11 dan Aim (111 ronde, 89,46) di #14. Dengan nilai peringkat:
    Maryam #1, Aim #3, Uwais (17 ronde, 97,06) #2, dan Yasmine turun ke #12. Rata-rata asli tetap
    ditampilkan di samping nilai peringkat.
  - **Alternatif yang dibandingkan:**
    - prior = rata-rata global 90,76: Aim masih di bawah anak 1 ronde;
    - batas minimal 10 ronde: anak baru tidak muncul sama sekali.
  - Mode **Total skor** (D-043) tidak berubah.
- **Total soal dijawab** (jumlah jawaban per skill, `skill_mastery.answered`, satu sumber untuk semua tampilan)
  tampil di:
  - laporan anak orang tua dan dasbor orang tua;
  - laporan admin;
  - daftar keluarga admin;
  - daftar siswa kelas (admin & fasilitator);
  - profil anak;
  - papan peringkat beserta detailnya;
  - Top 10 landing.
- **Top 10 global di landing** (`GET /leaderboard/public`, tanpa login):
  - diurutkan menurut total skor → level lulus → waktu;
  - kolom yang tampil: skor, soal dijawab, level lulus, waktu;
  - disegarkan tiap 15 detik selama tab terlihat (cache server 10 detik);
  - hanya nama panggilan + warna Momo, tanpa id anak.
- **Notifikasi admin:**
  - lonceng di kanan atas berisi pendaftaran (orang tua, anak daftar sendiri, anak gabung kelas) dan transaksi
    (pesanan baru, bukti transfer) 30 hari terakhir;
  - status "dibaca" disimpan per admin di perangkat;
  - Ringkasan admin punya kartu "Pendaftar terbaru".
- **Wizard keluarga 3 langkah yang nyata:** Isi data → Cek email (kode) → Profil anak. Dasbor menandai semua langkah
  selesai. Form daftar menjelaskan langkahnya dan memberi tahu untuk mengecek folder Spam/Promosi.

## D-046 — Info level Premium untuk anak & suara soal lintas perangkat

Tanggal 2026-10-03 · Status **Disetujui** (permintaan pemilik produk).

- **Level berbayar:** pesan lama "perlu dibuka Ayah/Bunda" diganti kotak oranye yang menjelaskan keadaannya.
  - Akun Gratis: judul "Level {n} ke atas khusus akun Premium"; isinya "Akunmu masih Gratis (Basic): Level 1–{free}
    bisa dimainkan".
  - Paket berakhir: judul "Masa paket Premium GRATIS BASIC sudah berakhir"; isinya menegaskan skor dan progres tetap aman.
  - Bagian "Untuk Ayah/Bunda" berisi langkah ke `/orang-tua/paket`: masuk, buka menu Paket & Pembayaran, pilih
    paket yang tersedia.
  - Anak tanpa akun orang tua: langkahnya daftar orang tua → Tautkan anak dengan kode keluarganya → pilih paket.
- **Tetap patuh D-036** (tanpa harga, tanpa tombol atau tautan beli di area anak):
  - alamat ditulis sebagai teks untuk orang tua dan dibuka di halaman orang tua yang butuh login;
  - warna oranye, bukan merah (PRD A14).
- **Data yang dikirim server** (`access`):
  - `expired` saat pernah punya paket tapi semuanya berakhir;
  - `noParent` untuk anak yang daftar sendiri atau anak kelas.
- **Suara soal** (di produksi semua memakai suara browser karena klip Momo belum aktif):
  - Ketukan pertama membuka kunci suara. iOS/iPadOS memblokir suara otomatis sebelum ada ketukan.
  - Jeda singkat setelah `cancel()`, untuk Chrome yang kadang menelan ucapan.
  - Referensi ucapan disimpan, karena GC di Chrome bisa membuat `onend` tidak terpanggil.
  - `resume()` dipanggil bila mesin suara berstatus paused.
  - Kalimat panjang dipecah per kalimat, karena Chrome memotong ucapan setelah ±15 detik.
  - Kalau suara Indonesia tidak tersedia atau ucapan tidak mulai dalam 1,8 detik, dicoba ulang dengan suara
    bawaan perangkat.
  - Kalau tetap gagal, layar soal menampilkan kotak bantuan oranye (naikkan volume, matikan mode senyap) beserta
    kalimat soal agar dibacakan orang dewasa.
  - Tidak memakai regex lookbehind, karena merusak aplikasi di iOS < 16.4.

## D-047 — Suara soal pasti terdengar (tombol Mulai) & salinan katalog per anak

Tanggal 2026-10-03 · Status **Disetujui** (laporan uji pemilik produk).

- **Penyebab soal tidak bersuara, terbukti di Chrome:**
  - Saat halaman soal dibuka langsung (URL, muat ulang, aplikasi baru dibuka), browser menolak suara otomatis
    (`not-allowed`) sampai ada ketukan di halaman itu.
  - Logika teks yang diucapkan sudah benar: hasil pindai 475 contoh soal "dengar" menunjukkan semuanya
    membacakan isinya.
- **Perbaikan:**
  - **Tombol "Mulai"** sebelum soal pertama, hanya bila halaman belum pernah diketuk
    (`navigator.userActivation` / buka kunci). Ketukan ini sekaligus membuka kunci suara; stopwatch belum
    berjalan.
  - Kalau suara masih ditolak, speaker berkedip dan muncul petunjuk oranye "Ketuk tombol speaker" (tidak dicoba
    ulang otomatis).
  - **Soal yang isinya hanya lewat suara** (`isAudioOnlyItem`, mis. "Ketuk angka yang kamu dengar.") selalu punya
    tombol "Tidak terdengar? Lihat petunjuk", yang menampilkan kalimat soal untuk dibacakan orang dewasa. Dengan
    begitu soal tidak 100% bergantung pada audio.
- **Salinan katalog di perangkat sekarang per anak** (`lc.catalog.<childId>`):
  - Sebelumnya satu salinan dipakai bersama. Adik (Free) di perangkat yang sama bisa memakai katalog kakak
    (Premium), sehingga level berbayar terbuka di layar sampai data server tiba (atau selamanya bila offline).
  - Server sejak awal menolak hasil level berbayar dari anak Free.
  - Catatan: di DB lokal `freeLevels = 5` (level 1–5 gratis), di produksi `3`.

## D-048 — Buku Math Grade 5-6 (OSN Kategori C)

Tanggal 2026-10-03 · Status **Disetujui** (permintaan pemilik produk).

- **Jenjang baru `sd56`** ("Grade 5-6 (Kategori C)", "Kelas 5–6 (OSN)") di `GRADES`, setelah `sd34`.
- **Buku `content/skills/math/sd56/`:** 10 materi × 10 level = 100 skill.
  - Seluruhnya family `expr`/`mix`, tier `advanced`, tag `fase-merdeka: C` dan `timss-kognitif`.
  - Pola tiap materi: level 1–3 pengetahuan → level 4–8 penerapan & soal cerita → level 9 penalaran gaya OSN
    (isian) → level 10 tantangan campuran (isian).
- **Materi** (indikator OSN SD/MI Kategori C):

  | Kode | Materi            | Indikator                                                           |
  | ---- | ----------------- | ------------------------------------------------------------------- |
  | A    | Bilangan bulat    | operasi termasuk negatif, suhu, kedalaman, skor benar/salah         |
  | B    | FPB & KPK         | soal cerita, FPB × KPK = hasil kali                                 |
  | C    | Pecahan           | biasa, campuran, desimal, persen                                    |
  | D    | Persentase        | diskon, diskon bertingkat, untung-rugi, bunga sederhana             |
  | E    | Perbandingan      | rasio, senilai/berbalik nilai, skala                                |
  | F    | Kecepatan         | jarak, waktu, kecepatan, berpapasan, menyusul, rata-rata            |
  | G    | Luas bangun datar | termasuk lingkaran π = 22/7, gabungan, daerah diarsir               |
  | H    | Bangun ruang      | volume & luas permukaan kubus, balok, prisma, tabung                |
  | I    | Statistika        | mean, median, modus, rata-rata gabungan                             |
  | J    | Peluang           | dadu, koin, kartu, komplemen, frekuensi harapan, tanpa pengembalian |

- **Pengecoh** berbasis miskonsepsi (mis. KPK ↔ FPB, diskon bertingkat dijumlah, rata-rata kecepatan biasa,
  dengan/tanpa pengembalian).
- **Soal orisinal**, tidak disalin dari bank soal OSN/IXL. Lolos `validate:content` (200 soal per skill).

## D-049 — Buku Math SMP Kelas 7-9 (OSN Kategori D) & batas soal 500 karakter

Tanggal 2026-10-03 · Status **Disetujui** (permintaan pemilik produk).

- **Jenjang baru `smp79`** ("SMP Kelas 7-9 (Kategori D)", "SMP Kelas 7–9 (OSN)").
- **Buku `content/skills/math/smp79/`:** 9 materi × 10 level = 90 skill.
  - Family `expr`/`mix`, tier `advanced`, `fase-merdeka: D`.
  - Pola tiap materi sama dengan buku OSN lain: level 1–3 konsep → 4–8 penerapan → 9 penalaran gaya OSN (isian)
    → 10 tantangan campuran (isian).
- **Materi** (indikator OSN SMP):

  | Kode | Materi               | Indikator                                                                                                        |
  | ---- | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
  | A    | Teori bilangan       | banyak & jumlah faktor, sisa bagi, angka satuan berpangkat, kongruensi, teorema sisa Cina, inklusi-eksklusi      |
  | B    | Aljabar              | substitusi, identitas (x+y)², a²−b², a³+b³, x + 1/x, akar kuadrat, sistem linear, teleskopik                     |
  | C    | Persamaan fungsional | linear, komposisi, f(x+1)=f(x)+c, f(xy)=f(x)+f(y), substitusi f(x)+2f(2−x), rekursif                             |
  | D    | Geometri olimpiade   | sudut segitiga, sudut luar, segi-n, sudut pusat/keliling, Pythagoras, diagonal, jarum jam, segi empat tali busur |
  | E    | Kombinatorika        | aturan perkalian, permutasi, kombinasi, melingkar, lintasan kisi, inklusi-eksklusi                               |
  | F    | Pola bilangan        | aritmetika, geometri, bilangan segitiga, beda bertingkat, pola berulang, Fibonacci                               |
  | G    | Logika               | ayam-kambing, sarang merpati, kesatria-penipu, angka AB−BA, hari, umur, rata-rata                                |
  | H    | Invarians            | jumlah tetap, paritas, kelereng merah-biru, akar digital, sisa bagi 3, tanda ±, lampu, memecah tumpukan          |
  | I    | Ekstremal            | luas maksimum, hasil kali/jumlah ekstrem, minimum kuadrat, kelipatan terbesar/terkecil, sarang merpati           |

- **Batas kalimat soal 160 → 500 karakter** (`MAX_PROMPT_LENGTH`, skema `expr`/`manual`/`facts`, editor soal manual
  admin), agar soal cerita/olimpiade bisa lengkap. Soal > 160 karakter tampil dengan huruf sedikit lebih kecil
  (`.item-prompt p.is-long`). Soal Basic tetap pendek sesuai PRD A14.
- Semua soal orisinal (tidak disalin dari bank soal OSN). Lolos `validate:content` (200 soal per skill).

## D-050 — Buku Math & Sains TK gaya olimpiade (OSN TK)

Tanggal 2026-10-03 · Status **Disetujui** (permintaan pemilik produk).

- **Jenjang baru `tkosn`** ("TK (OSN)", "TK A–B · gaya olimpiade"), urut setelah `tk`.
- **Dua buku**, tier `basic` (dibacakan, jawaban diketuk; gambar bila asetnya ada), `fase-merdeka: Fondasi (PAUD)`:
  - **Math TK (OSN)**, 5 materi × 10 level: angka & membilang (sampai 20), berhitung ceria (gambar & cerita,
    mis. "5 apel merah dan 3 apel hijau"), membandingkan (lebih banyak/sedikit/sama, panjang, tinggi, berat,
    isi), bentuk geometri, pola & logika gambar.
  - **Sains TK (OSN)**, 5 materi × 10 level: tubuhku & pancaindra (mis. bulu kucing halus dirasakan dengan
    kulit), dunia hewan (kelinci makan wortel, bertelur/melahirkan, kaki, suara), tumbuhan/buah/sayur
    (semangka buah, brokoli sayur, kunyit bumbu), panas-dingin & cuaca (api unggun panas, buah dari kulkas
    dingin, payung saat hujan), lingkungan sekitar (kereta di stasiun, pilot menerbangkan pesawat, profesi,
    menjaga lingkungan).
- **Pola per materi:** level 1–8 konsep & penerapan → level 9 teka-teki gaya OSN (bank soal `manual`, ≥ 8 soal)
  → level 10 tantangan campuran.
- **Komponen yang dipakai ulang:** family generator yang sudah ada (`count`, `arith`, `compare-groups`, `shape-*`,
  `pattern`, `facts`, `manual`).
- **Gambar:** pilihan hanya bergambar bila aset benda tersedia (hewan, buah, benda rumah). Pilihan lain berupa
  kata yang dibacakan saat diketuk, sama seperti buku Sains TK yang sudah ada.
- **Bahasa Inggris** belum dibuat (di luar domain yang tersedia; menunggu keputusan).
- Soal orisinal mengikuti contoh materi lomba yang diberikan; tidak menyalin bank soal lomba.

## D-051 — Sains Grade 5-6 (OSN Kategori C) & Hias Momo (gradasi + aksesori)

Tanggal 2026-10-03 · Status **Disetujui** (permintaan pemilik produk; bentuk kustom dipilih pemilik produk:
gradasi dua warna, aksesori bebas untuk semua anak).

**Buku Sains Grade 5-6 (OSN)** (`content/skills/sains/sd56`)

- 10 materi × 10 level = 100 skill, tier `advanced`, `fase-merdeka: C`.
- **Materi:** sistem organ, fotosintesis, ekosistem (peran, rantai makanan, simbiosis), adaptasi (morfologi,
  fisiologi, tingkah laku), listrik (komponen, seri/paralel, konduktor/isolator), magnet (sifat, benda magnetis,
  cara membuat, pemanfaatan), kalor (konduksi/konveksi/radiasi, pemuaian), pesawat sederhana (tuas golongan
  I–III, katrol, bidang miring, roda berporos), bumi & tata surya (planet, rotasi/revolusi, gerhana, pasang
  surut), dan metode ilmiah (langkah, variabel).
- **Pola level sama dengan Sains Grade 3-4 (OSN):** level 1–5 tabel fakta (tanya keterangan / nama / benar-salah
  / kelompok / bukan anggota), 6–8 soal konsep, penerapan, dan penalaran (+ fakta), 9 ulangan, 10 tantangan.
- **Soal hitung OSN:** tegangan baterai seri dan gaya kuasa tuas (isian).

**Hias Momo** (gradasi + aksesori)

- **Data:** kolom baru `children.momo_look` (jsonb, migrasi `0011_momo_look`) berisi
  `{ gradient, accessory, accessoryColor }`. Warna utama tetap `momo_color` (6 warna lama).
- **Gradasi:** warna utama → salah satu dari 12 warna (`MOMO_TONES`).
- **Aksesori:** tanpa aksesori, rambut poni, rambut kuncir, rambut keriting, topi, peci, jilbab, pita; warnanya
  bisa dipilih.
- **Privasi:** tampilan robot, bukan data pribadi anak. Semua pilihan tersedia untuk semua anak tanpa label
  laki-laki/perempuan; tidak ada data gender atau agama yang disimpan (PRD A17).
- **Siapa yang mengubah:**
  - anak sendiri lewat Profil → "Hias Momo" (`PUT /auth/me/momo`, hanya peran anak);
  - orang tua lewat formulir profil anak ("Hias Momo", opsional).
- **Tampil di:** semua layar anak (Momo milik sendiri), layar pilih profil, papan peringkat + detail, Top 10
  landing, dan dasbor orang tua.
- **Data lama atau rusak** dibaca sebagai polos (`parseMomoLook`).

## D-052 — Buku Sains SMP Kelas 7-9 (OSN Kategori D)

Tanggal 2026-10-03 · Status **Disetujui** (permintaan pemilik produk).

- **Buku `content/skills/sains/smp79`:** 10 materi × 10 level = 100 skill, tier `advanced`, `fase-merdeka: D`,
  jenjang `smp79` (sama dengan Math SMP, D-049).
- **Materi:**

  | Materi               | Isi                                                                                    |
  | -------------------- | -------------------------------------------------------------------------------------- |
  | Sel                  | organel, sel hewan vs tumbuhan, prokariotik, difusi/osmosis                            |
  | Organisasi kehidupan | sel → jaringan → organ → sistem organ; jaringan hewan & tumbuhan                       |
  | Genetika             | istilah, homozigot/heterozigot, persilangan monohibrid 1 : 2 : 1 dan 3 : 1, uji silang |
  | Ekologi              | peran, interaksi, aliran energi 10%, biomagnifikasi, eutrofikasi, suksesi              |
  | Klasifikasi          | kingdom, kelas vertebrata, takson, binomial nomenklatur                                |
  | Zat                  | perubahan fisika/kimia, unsur-senyawa-campuran, pemisahan campuran, massa jenis        |
  | Gaya & energi        | hukum Newton, tekanan, usaha, energi kinetik/potensial, daya                           |
  | Gelombang            | getaran, frekuensi/periode, v = λf, bunyi, cahaya, cermin & lensa                      |
  | Listrik & magnet     | hukum Ohm, seri/paralel, energi & daya listrik, elektromagnet, induksi                 |
  | Bumi & antariksa     | struktur bumi & atmosfer, lempeng, gempa/tsunami, rotasi/revolusi, selisih waktu bujur |

- **Pola level sama dengan Sains Grade 5-6 (OSN):** level 1–5 fakta, 6–8 konsep, penerapan, dan penalaran, 9 ulangan,
  10 tantangan.
- **Soal hitung OSN SMP (isian):** rasio Mendel, energi trofik, massa jenis, usaha, energi kinetik, cepat rambat,
  frekuensi, hukum Ohm, arus seri, selisih waktu bujur.

## D-053 — Info materi baru otomatis lewat email (broadcast)

Tanggal 2026-10-03 · Status **Disetujui** (pilihan pemilik produk: otomatis setiap ada soal baru; langganan aktif
dan bisa berhenti).

- **Pemicu:** skill aktif baru (kolom baru `skills.created_at`, migrasi `0012_content_news`).
  - Batas awal disimpan di `app_settings.news.lastAt` saat migrasi, sehingga skill lama tidak diumumkan.
  - Agar tidak membanjiri, semua skill baru digabung dalam **satu email**. Email dikirim setelah 30 menit tanpa
    skill baru, paling sering sekali per 24 jam.
  - Admin bisa "Kirim sekarang" atau mematikan fitur di Admin → Email.
- **Penerima:**
  - orang tua aktif dengan email terverifikasi yang belum berhenti berlangganan (`parents.news_opt_out_at`);
  - salinan ringkasan ke direksi.
- **Berhenti berlangganan:**
  - tautan di setiap email (`/berhenti-langganan`, token HMAC per orang tua, tanpa login);
  - centang "Kirimi saya email saat ada materi baru" di dasbor orang tua.
  - Teks persetujuan pendaftaran menyebut email info materi baru (UU PDP).
  - Email verifikasi dan transaksi tetap dikirim.
- **Kuota Gmail:** maksimal 400 email info per 24 jam (`NEWS_DAILY_CAP`). Sisanya otomatis dilanjutkan; email
  verifikasi dan transaksi selalu didahulukan di antrean.
- **Urutan deploy:** jalankan migrasi **sebelum** seed konten baru (`migrate:prod` lalu `seed:prod`). Dengan
  begitu, buku yang baru ditambahkan ikut diumumkan.

## D-054 — Pengingat masa paket Premium via email (H-5, H-3, H-1) & perbaikan email

Tanggal 2026-10-03 · Status **Disetujui** (permintaan pemilik produk).

- **Pengingat masa paket** (`ExpiryReminderService`, berjalan tiap jam):
  - email ke orang tua terverifikasi pada **H-5, H-3, dan H-1** sebelum paket berakhir;
  - satu kali per hari pengingat per hak akses (dicatat di `email_outbox` kind `expiry_<n>`, refId = id hak akses);
  - tidak dikirim bila keluarga sudah punya paket lain yang aktif lebih lama;
  - email layanan, tidak terpengaruh berhenti berlangganan info materi.
  - Isinya menegaskan bahwa skor dan progres tetap tersimpan, disertai tombol "Perpanjang paket".
- **Premium:** paket yang dibeli berlaku **per akun orang tua** (semua anak di akun itu); Premium dari admin berlaku per
  anak. Teks landing dan email diperjelas.
- **Email:**
  - logo Momo kini ditempel langsung di email (CID inline, `apps/api/src/mail/logo.ts`), sehingga tidak bergantung
    pada pemuatan gambar dari URL;
  - catatan kecil tidak lagi tampil sebagai tag HTML mentah.
- **Landing:** menampilkan total soal latihan (level × 10) dan total soal dijawab (realtime).

## D-055 — Variasi soal Pra-TK, TK, dan TK OSN

Tanggal 2026-10-03 · Status **Disetujui** (permintaan pemilik produk: soal terasa berulang).

- **29 ilustrasi baru:**
  - 13 hewan: sapi, kambing, kuda, monyet, singa, jerapah, burung, kura-kura, katak, lebah, siput, penguin, beruang;
  - 6 buah dan sayur;
  - 4 kendaraan;
  - 6 benda alam.
  - 22 ilustrasi bisa dihitung, sehingga semua generator membilang, membandingkan, dan berhitung otomatis memakai
    benda yang lebih beragam.
- **Tabel fakta diperluas:**
  - Sains TK: bagian tubuh hewan, anak hewan, makhluk hidup / benda tak hidup, hewan / tumbuhan;
  - Sains TK OSN: dari 7 menjadi 20 hewan bergambar, ditambah buah dan sayur baru, teka-teki hewan, kendaraan, dan
    alam bergambar.
- **Soal cerita** (setengah/seperempat dari benda, piktogram, belanja, benda dua warna, sisa benda) kini memilih benda,
  nama, dan jajanan secara acak.
- **Ukuran (30 soal per skill):** rata-rata jenis benda per skill naik 48–140%. Soal dengan rentang angka sempit
  (mis. "angka sampai 2") tetap terbatas karena disengaja untuk level awal.
- **Seed:** skill yang sudah ada kini diperbarui bila `version` di content/ lebih tinggi; skill yang isinya diubah
  dinaikkan versinya. Suntingan admin dengan versi sama atau lebih tinggi tidak ditimpa; `--force` tetap menimpa
  semuanya.
- **Id skill dipertahankan** walau judul berubah, supaya progres anak tidak hilang.

## D-056 — Soal tidak berulang dalam satu level; bank soal Sains TK dan TK OSN per level

Tanggal 2026-10-03 · Status **Disetujui** (permintaan pemilik produk: soal sains TK/TK OSN berulang per topik).

- **Penyusunan ronde (engine `generateRound`):** selain soal identik, kini dihindari juga soal dengan **inti** sama
  (kalimat + gambar soal + jawaban benar) walau pengecohnya beda, lalu kalimat soal yang sama. Prioritas: soal identik
  ≫ inti kembar ≫ kalimat kembar > soal yang keluar di ronde sebelumnya. Inti kembar tidak dilarang mutlak karena pada
  soal perbandingan (3 vs 1, 3 vs 2) pengecohnya bagian dari soal. Riwayat perangkat (`itemKey`) tidak berubah.
- **Konten Sains TK (15 topik) dan TK OSN (5 topik), 198 skill:**
  - setiap level 1–9 punya bank soal sendiri, minimal 20 soal unik (umumnya 25–60), tidak lagi menyalin bank atau tabel
    level lain dalam topik yang sama (tumpang tindih antar level ≤ 20%);
  - level 10 (Tantangan) tetap ulangan dari level 1–9 topiknya;
  - tidak ada soal yang sama di dua topik berbeda;
  - pilihan jawaban dalam satu soal berformat sama (semua gambar atau semua teks), agar jawaban tidak ketahuan dari
    bentuknya.
- Versi skill yang diubah dinaikkan, sehingga `seed` memperbarui database (D-055). Id, judul, dan urutan tetap.

## D-057 — Papan peringkat memuat semua anak, berhalaman; detail rapi dan responsif

Tanggal 2026-10-03 · Status **Disetujui** (permintaan pemilik produk).

- **Papan global:** memuat semua anak aktif. Anak yang belum punya ronde tampil paling bawah, urut nama, berlabel
  "Belum bermain" tanpa nilai dan tanpa tombol detail. Papan per buku tetap hanya anak yang memainkan buku itu.
  Respons memuat `played` (jumlah yang sudah bermain).
- **Landing:** "N peserta" = semua anak aktif, ditambah "M sudah bermain" bila berbeda.
- **Paging:** "Peserta lainnya" (peringkat 26 ke bawah) memakai halaman bernomor, 50 per halaman, tombol ≥ 64 px. Di layar
  kecil tampil Sebelumnya · Halaman x dari y · Berikutnya. Menggantikan tombol "Muat lebih banyak".
- **Detail anak:** ringkasan berupa kartu statistik (peringkat, nilai peringkat, rata-rata asli, total skor, ronde,
  soal, level lulus, waktu), bukan kalimat panjang berhuruf besar. Kalimatnya tetap bisa didengar lewat tombol suara.
  Di HP, tabel per buku dan per topik menjadi kartu bertumpuk.
- Tetap hanya nama panggilan dan warna/tampilan Momo yang terlihat oleh anak lain (D-024, D-042).

## D-058 — Buku English Pra-TK (domain `english`)

Tanggal 2026-10-03 · Status **Disetujui** (permintaan pemilik produk: English selain Math dan Sains).

- **Domain baru `english`** (di `DOMAINS`, setelah `sains`); buku `english/prek` "English Pra-TK". Daftar buku
  publik kini diurutkan sesuai `DOMAINS` (Math, Sains, English), bukan abjad.
- **Cakupan:** 29 kategori × 10 level = 290 skill (family `manual`, 12–30 soal per level, ±8.100 soal). Topik
  mengikuti Cambridge Pre-A1 Starters dan Singapore NEL (Language & Literacy): huruf A–Z, huruf besar/kecil,
  mengenal kata, rima, suku kata, menggabung bunyi, bunyi awal/akhir, huruf & bunyi, vokal pendek, sight words
  (10 set), memahami buku/cerita, kata warna, kata bilangan, singular/plural, kata kerja, kata sifat, kata posisi,
  lawan kata, dan kelompok benda. Daftar topik IXL hanya dipakai sebagai peta topik; semua soal ditulis sendiri.
- **Bahasa:** instruksi bahasa Indonesia, kata target bahasa Inggris. Suara Momo tetap id-ID (tanpa ubah TTS). _Diganti D-059 (instruksi English, suara en-GB), lalu D-062: instruksi & narasi kembali Bahasa Indonesia._
- **Fonik lewat kata contoh** ("ball dimulai dengan huruf apa?"), tidak mengucapkan fonem terpisah. Pengecualian
  aturan "literasi lewat suku kata, bukan fonik Inggris" hanya untuk buku English ini.
- **Soal membaca/mendengar tidak membocorkan jawaban:** teks soal yang tampil tidak memuat kata jawaban (kata itu
  hanya diucapkan), dan kartu kata pada soal membaca tidak bersuara.
- **30 ilustrasi baru** (`objects-english.tsx`): igloo, selai, kunci, sarang, van, biola, xilofon, yoyo, zebra, anjing,
  rumah, tikus, ular, rubah, telur, ranjang, babi, 5 wajah perasaan, 8 anak beraktivitas. Semua `countable: false`
  agar soal matematika yang ada tidak berubah.
- Buku baru belum masuk paket berbayar mana pun; admin menambahkannya lewat menu paket bila perlu.

## D-059 — Buku English format Singapore & Cambridge, suara British English, rujukan kurikulum di landing

Tanggal 2026-10-04 · Status **Disetujui** (pilihan pemilik produk: "English + bantuan Indonesia", suara "en-GB").

- **Format buku English Pra-TK (290 skill):**
  - mengacu pada Cambridge English Pre A1 Starters (Young Learners) dan Singapore MOE Nursery–K2 NEL Framework 2022
    (Language & Literacy). Ejaan British (colour, grey);
  - perintah soal dan suara dalam English sederhana gaya Cambridge ("Tap the letter you hear."); _diganti D-062:
    perintah & narasi Bahasa Indonesia, kata/kalimat target tetap English_;
  - penjelasan saat keliru dua bahasa: kalimat English, lalu bantuan Bahasa Indonesia dalam kurung; _diganti D-062:
    hanya bantuan Bahasa Indonesia_;
  - intro dan tips topik untuk orang tua tetap Bahasa Indonesia;
  - setiap soal punya `source` (rujukan Cambridge dan NEL). Aturan variasi sama dengan D-056;
  - hasil: 9.337 soal, setiap level minimal 24 soal unik, tanpa tumpang tindih antar level, tanpa pilihan kembar.
    Aturan D-058 tetap: jawaban soal dengar hanya ada di suara, kartu kata pada soal membaca tidak bersuara;
  - preposisi mengikuti Cambridge Starters (in, on, under, next to, behind, in front of); "corn" tidak dijamakkan.
- **Penyusunan ronde:** kalimat yang diucapkan (`say`) ikut menjadi bagian inti soal, sehingga soal dengar dengan
  perintah sama tetapi kata yang diucapkan berbeda dihitung sebagai soal yang berbeda (melengkapi D-056).
- **Suara:**
  - _(diganti D-062 untuk Pra-TK: narasi id-ID, kartu kata en-GB)_ buku English memakai suara British English (`en-GB`, gaya bicara English bawaan; model, suara, dan kecepatan sama
    dengan pengaturan admin). Buku lain tetap `id-ID`;
  - bahasa ditentukan dari id skill (`english.*`);
  - kunci klip memasukkan bahasa hanya bila bukan Indonesia, jadi klip lama tetap berlaku;
  - suara cadangan browser memilih suara Inggris untuk soal English (D-062: suara perempuan lebih dulu).
  - Soal dengar English ("hear"/"listen") dikenali seperti "dengar" (petunjuk untuk orang dewasa, D-047).
- **Landing:**
  - kalimat pembuka dan langkah "cara" menyebut mata pelajaran yang benar-benar ada (matematika, sains, bahasa
    Inggris);
  - bagian baru "Mata pelajaran & rujukan kurikulum" per mata pelajaran: jumlah buku dan level, jenjang, dan rujukan;
  - rujukan diturunkan dari tag skill (`merdeka`/`fase-merdeka`, `sg`, `cambridge`, `timss-kognitif`, `osn`, `ngss`,
    `ccss`). Buku Kelas 1–2 dan 3–4 dihitung bergaya OSN. `ixlRef` (internal) tidak pernah tampil;
  - disertai pernyataan bahwa aplikasi tidak berafiliasi dengan Cambridge, MOE Singapura, IEA (TIMSS), maupun
    Puspresnas.

## D-060 — Variasi soal Sains SD–SMP; perbaikan urutan variabel turunan; pengaman halaman anak

Tanggal 2026-10-04 · Status **Disetujui** (permintaan pemilik produk: soal sains SD–SMP berulang; error Math SMP).

- **Bug Math SMP "variabel tidak dikenal pi":**
  - variabel turunan (`derived`) dulu dievaluasi menurut urutan kunci objek. Skill dibaca dari PostgreSQL `jsonb`,
    yang mengurutkan ulang kunci (yang pendek dulu), sehingga `n = pi * qj` dihitung sebelum `pi`. File JSON lolos
    validator, tetapi data di database gagal;
  - kini engine mengurutkan variabel turunan menurut ketergantungannya (urutan topologis). Ketergantungan melingkar
    ditolak validator;
  - test baru menjalankan semua skill di `content/` dengan urutan kunci ala `jsonb`. Terdampak sebelumnya: 4 skill
    Math SMP (A01, A03, A09, A10). Semua 3.660 skill di database lokal kini berhasil dibuat soalnya.
- **Pengaman halaman anak:** bila satu halaman gagal ditampilkan, anak melihat Momo dan tombol "Kembali ke Pustaka",
  bukan layar putih. Direset saat pindah halaman.
- **Sains Kelas 1, 2, 1–2 OSN, 3, 4, 3–4 OSN, 5–6 OSN (tahap 1, 1.060 level):**
  - aturan variasi D-056 diterapkan: ≥ 20 soal unik per level, tumpang tindih antar level ≤ 20%, tanpa soal sama di
    dua topik, pilihan seragam formatnya;
  - sebelum: 354 level di bawah 20 soal unik (terendah 3) dan ±700 pasangan level tumpang tindih. Sesudah: 0 dan 0;
  - buku OSN mengikuti `timss-kognitif` per level: hitungan (`expr`), membaca tabel/grafik, dan penalaran
    percobaan (variabel bebas, terikat, kontrol);
  - 739 skill berubah dan versinya dinaikkan. Id, judul, urutan, dan tag tetap, sehingga progres anak tidak hilang.
- **Sains SMP 7–9 OSN:** ditunda atas permintaan pemilik produk (tahap 2).

## D-061 — Buku Math Grade 3 (Singapore P3, Cambridge Stage 3, OSN)

Tanggal 2026-10-04 · Status **Disetujui** (permintaan pemilik produk). Melengkapi D-032 ("Belum: Math Grade 3").

- **Buku `content/skills/math/sd3/`** "Math Grade 3": 29 topik × 10 level = 290 skill, tier `intermediate`, Fase B.
  Family `expr`/`mix`; satu level umumnya 2–7 bentuk soal (kalimat, konteks, dan pengecoh berbeda).
- **Rujukan:** daftar topik IXL Grade 3 sebagai peta topik saja (semua soal ditulis sendiri), Singapore MOE Primary 3,
  Cambridge Primary Stage 3, dan indikator OSN SD. Tag `fase-merdeka`, `sg`, `cambridge`, `kognitif`, dan `osn`
  (level 9–10), sehingga landing menampilkan Merdeka, Singapore, Cambridge, OSN (D-059).
- **Topik:**
  - bilangan: nilai tempat sampai puluh ribuan, membandingkan, pembulatan, estimasi;
  - operasi: tambah/kurang 3–5 angka, campuran, sifat penjumlahan, membilang loncat;
  - perkalian dan pembagian: konsep, tabel 0–12, fakta pembagian, bersusun (2–3 angka dengan 1 angka, bersisa),
    sifat perkalian dan keluarga fakta, soal cerita;
  - pecahan: memahami pecahan, senilai, membandingkan, menjumlah/mengurangi berpenyebut sama;
  - pengukuran: uang Rupiah, panjang–massa–volume (metrik), waktu (jam 24, lama waktu, kalender), data
    (diagram batang, piktogram, tabel);
  - geometri: bangun datar, segi empat, sudut siku-siku, sejajar/tegak lurus, keliling dan luas;
  - penalaran gaya OSN.
- **Pola level:** 1–3 pengetahuan → 4–8 penerapan dan soal cerita → 9 penalaran isian (gaya OSN) → 10 tantangan
  campuran dari level 4–9.
- **Adaptasi Indonesia:** Rupiah emisi 2016, satuan metrik, jam 24, nama dan tempat Indonesia (gunung, kota).
- **Mutu:**
  - validator 0 error;
  - audit variasi: setiap level ≥ 20 soal inti unik, duplikat per ronde 0, tumpang tindih antar level 1–9 ≤ 20%. Level
    campuran tabel perkalian/pembagian memakai kalimat soal sendiri, agar tidak menyalin level satu-tabel;
  - pindai teks 34.800 soal: template bocor / NaN / kata ganda / spasi ganda = 0;
  - pengecoh berbasis miskonsepsi (lupa menyimpan/meminjam, salah nilai tempat, keliling vs luas, sisa terbalik);
  - soal yang jawabannya tidak tunggal dibuang (mis. 0 × □ = 0).
- **Belum:** tinjauan guru. Buku belum masuk paket berbayar; admin menambahkannya lewat menu paket bila perlu.

## D-062 — English Pra-TK: instruksi & narasi Bahasa Indonesia, suara perempuan yang jelas

Tanggal 2026-10-04 · Status **Disetujui** (permintaan pemilik produk: suara pria terlalu berat sehingga ejaan kurang
terdengar; anak Pra-TK belum paham instruksi English). Mengganti poin bahasa & suara D-059 untuk Pra-TK.

- **Penyebab suara pria:** kata pada kartu pilihan diucapkan suara perangkat `en-GB`, yang di iPad/Mac bawaannya
  "Daniel" (pria, berat). Narasi soal sudah memakai suara Momo (Leda, perempuan).
- **Suara:**
  - narasi soal & penjelasan English Pra-TK: suara Momo **Bahasa Indonesia** (`id-ID`, nama suara dari admin, mis.
    Leda) dengan arahan gaya: suara perempuan ceria, pelan seperti guru TK, kata/huruf Inggris dilafalkan British
    English yang jelas;
  - kata/huruf pada **kartu pilihan** English kini dibuat server (`/voice/item/:id?part=choice&c=<id kartu>`, `en-GB`,
    suara Momo yang sama, gaya "satu kata, pelan, sangat jelas, suara perempuan"), di-cache per teks seperti klip
    lain, dan disiapkan di latar bersama soal berikutnya. Hanya untuk buku English (biaya klip terbatas);
  - suara cadangan perangkat memilih **suara perempuan lebih dulu** (Samantha, Serena, Karen, Google UK English
    Female, Damayanti, …) dan menghindari suara pria dikenal (Daniel, Arthur, …). Untuk kata Inggris, suara perempuan
    lebih diutamakan daripada aksen British; kecepatan 0,8 agar ejaan jelas;
  - buku English jenjang lain (belum ada) tetap seluruhnya `en-GB` seperti D-059.
- **Konten (290 skill, 9.337 soal, versi 2):**
  - soal D-059 dipertahankan (variasi, Cambridge/NEL, `source`); hanya kalimat perintah/pertanyaan yang diterjemahkan
    ke Bahasa Indonesia lewat tabel ±900 pola. Kata, huruf, dan kalimat target Inggris tetap English
    (mis. "Ketuk gambar yang dimulai dengan B.", "Kata mana yang berima dengan cat?", "Ketuk animal (hewan).");
  - kalimat bacaan yang tampil di soal (sight words, kalimat posisi, cerita, kalimat rumpang) tetap English;
  - penjelasan saat keliru: bantuan Bahasa Indonesia (kata Inggris tetap);
  - id, judul, dan urutan skill sama dengan aslinya; versi dinaikkan ke 2 agar `db:seed` memperbarui database.
- **Mutu:** validator 0 error; audit variasi 0 level bermasalah, tanpa tumpang tindih antar level; tanpa pilihan kembar;
  jawaban soal dengar tidak tampil di teks soal; tanpa kata "salah/gagal".

## D-063 — Afiliasi orang tua (kode referal, saldo, pencairan) & batas 7 anak per akun

Tanggal 2026-10-04 · Status **Disetujui** (pilihan pemilik produk: afiliasi lewat akun dewasa, bonus tertahan sampai
teman aktif, komisi 1 tingkat dengan pohon visual, verifikasi rekening manual oleh admin).

- **Peserta:** hanya akun dewasa (akun orang tua, boleh tanpa anak, email terverifikasi). Tidak ada kode, saldo, link,
  atau rekening di area anak. Anak yang daftar sendiri ikut dikelola akun orang tua yang menautkannya.
- **Kode & link:**
  - kode 6 karakter tanpa huruf yang mudah tertukar, dibuat saat menu Afiliasi pertama dibuka;
  - link `/r/KODE` menyimpan kode di perangkat 30 hari, menghitung klik (angka harian saja), lalu membuka daftar
    orang tua dengan kode terisi;
  - kode juga bisa diketik manual; pratinjau hanya menampilkan nama pengajak tersamar ("Ri*** Sy***");
  - kode dikunci saat daftar (satu perekrut, tidak bisa diri sendiri; kode tak dikenal diabaikan).
- **Bonus ajak teman** (bawaan Rp3.500): tercatat tertahan; cair bila teman sudah verifikasi email dan anaknya main
  ≥ 3 ronde dalam 30 hari, gugur bila tidak. Batas 20 bonus per bulan per akun. Semua angka diatur admin.
- **Komisi langganan 1 tingkat** (bawaan 33%):
  - dari harga paket tanpa kode unik transfer (D-036), dibulatkan ke bawah;
  - dicatat di transaksi yang sama dengan persetujuan pesanan; tertahan 7 hari, admin bisa menggugurkan yang masih
    tertahan;
  - persen & dasar disimpan per catatan, jadi perubahan pengaturan tidak mengubah komisi lama;
  - tidak bertingkat (aman dari larangan skema piramida, UU 7/2014 Pasal 9). Pohon hanya visual: anggota langsung +
    jumlah anggota mereka.
- **Saldo = buku besar** (`affiliate_ledger`): setiap gerakan baris baru, jumlah tidak pernah diubah; indeks unik
  menjamin satu bonus per teman, satu komisi per pesanan, satu catatan per jenis per pencairan.
- **Rekening pencairan:**
  - bank/e-wallet dari daftar admin; nomor terenkripsi (AES-GCM) + hash HMAC untuk deteksi rekening kembar, selalu
    tampil tersamar;
  - menyimpan/mengubah wajib kode 6 angka dari email; nama pemilik harus cocok dengan nama akun → langsung
    terverifikasi, berbeda atau nomor dipakai akun lain → menunggu verifikasi admin;
  - pencairan ditahan 3 hari setelah rekening diubah; rekening terkunci selama ada pengajuan.
- **Pencairan:** minimal Rp15.000, satu pengajuan terbuka per akun (dijaga database), saldo dikunci saat diajukan
  (baris akun dikunci di transaksi). Admin melihat nomor utuh, mentransfer manual, lalu menandai "sudah ditransfer" →
  pengeluaran "Komisi afiliasi" otomatis di buku kas (komisi owner ikut benar). Ditolak/dibatalkan → saldo kembali.
  Email ke orang tua (dibayar/ditolak/rekening ditinjau) dan ke direksi (pengajuan baru).
- **Anti-kecurangan (tanda untuk admin, tidak menghukum otomatis):** rekening dipakai akun lain, nama rekening
  berbeda, anggota daftar dari jaringan yang sama (hash IP saat daftar, HMAC, tidak bisa dibalik), ≥ 3 anggota dari
  jaringan yang sama. Admin bisa koreksi saldo (baris baru + alasan) dan menggugurkan catatan tertahan.
- **Privasi (UU PDP):** anggota tampil dengan nama tersamar, tanpa email dan tanpa data anak.
- **Pajak:** komisi ke orang pribadi bisa dikenai PPh 21 bukan pegawai (PMK 168/2023); nominal tercatat bruto,
  pemotongan pajak dikonsultasikan dulu dengan konsultan pajak.
- **Batas 7 anak aktif per akun orang tua:** dicek di server (tambah anak, tautkan anak daftar sendiri, admin
  mengaktifkan kembali) dengan baris akun dikunci; layar orang tua menampilkan peringatan dan saran membuat akun baru.
  - Info batas selalu terlihat: halaman daftar & masuk ("maksimal 7 anak, lebih dari itu buat akun orang tua kedua
    dengan email lain"), dasbor "3 dari 7 anak terdaftar", dan formulir tambah anak.
  - Saat sudah 7 anak: tombol "Tambah profil anak" dan "Tautkan anak" membuka pop-up (`<dialog>` modal) yang
    menjelaskan anak ke-8 tidak bisa ditambahkan dan menawarkan "Keluar & buat akun orang tua baru" (sesi orang tua
    saja yang keluar; sesi anak & kode keluarga di perangkat tetap). Formulir tambah anak tidak ditampilkan dan pop-up
    langsung terbuka; penolakan server `child_limit` (mis. anak ditambah dari perangkat lain) juga membuka pop-up.
- Migrasi `0013_affiliate` hanya menambah tabel/kolom (aman untuk data yang ada).
- **Tampilan (pembaruan):** halaman Afiliasi orang tua memakai hero saldo (progres menuju minimal pencairan + tombol
  cairkan), KPI, insight personal (komisi berikutnya cair kapan, bonus menunggu teman aktif, teman belum verifikasi),
  corong konversi, dan daftar kartu yang responsif. Admin mendapat tab Ringkasan berisi insight yang bisa diklik
  (antrean, rekening, tanda kecurigaan, rasio biaya afiliasi terhadap pendapatan anggota referal, konversi), tren 12
  bulan, corong, dan afiliator teratas (`GET /admin/affiliate/analytics`); antrean pencairan & rekening berupa kartu;
  Pengaturan di tab sendiri dengan contoh hitung komisi.
- **Landing:** bagian "Fitur terbaru" berisi program ajak teman (angka bonus, persen komisi, dan minimal pencairan dari
  `GET /public/affiliate`, mengikuti pengaturan admin; hilang bila program dimatikan) dan info satu akun untuk hingga
  7 anak. Teks paket keluarga dan pintu masuk orang tua ikut menyebut batas 7 anak. Hanya untuk orang dewasa (landing),
  tidak tampil di area anak.

## D-064 — Akun orang tua (lupa/ganti password, edit profil), kontak WhatsApp, password sementara dari admin

Keluhan peserta: lupa password, tidak bisa mengganti password/email, dan sulit menghubungi admin.

- **Lupa password** (`/orang-tua/lupa-password`, tautan di halaman masuk): kode 6 angka ke email (mekanisme sama
  dengan verifikasi D-044: hash, 15 menit, 5 percobaan, jeda 60 detik, jawaban selalu sama). Kode cocok → password
  baru disimpan dan orang tua langsung masuk; akun yang belum terverifikasi ikut terverifikasi.
- **Akun saya** (`/orang-tua/akun`):
  - ubah nama;
  - ganti email: password saat ini wajib, kode dikirim ke email **baru**, email lama tetap berlaku sampai kode
    cocok, lalu email lama diberi tahu;
  - ganti password: password lama wajib, password baru minimal 8 karakter dan berbeda.
- **Sesi dicabut saat password berganti:** `parents.password_changed_at`; token yang dibuat sebelum waktu itu
  ditolak (401). Perangkat yang mengganti password menerima token baru.
- **Tandai email terverifikasi (admin):** server membuat password sementara acak (12 karakter, tanpa huruf mirip),
  menandai email terverifikasi, dan mengirim email "Akun sudah aktif" berisi email, password sementara, dan kode
  keluarga. Admin melihat password itu sekali di pop-up dan bisa menyalinnya. **Pengecualian D-044** (disetujui
  pemilik produk): password sementara ditulis di email. Mitigasi: `must_change_password` → pop-up "Segera ganti
  password" di area orang tua sampai diganti, sesi lama dicabut, isi email dihapus dari antrean setelah terkirim.
  "Atur password" oleh admin juga mewajibkan orang tua menggantinya.
- **Kontak WhatsApp** (`app_settings.contact`, Admin → Pengaturan): nomor HP (08… otomatis jadi `wa.me/62…`) atau
  link wa.me, pesan pembuka opsional, dan link grup `chat.whatsapp.com`. Tombol "Hubungi admin" melayang di kanan
  bawah pada landing, area orang tua, dan admin/guru; **tidak di area anak** (`/play`, PRD A17). Link grup hanya
  dipakai di email (verifikasi, selamat datang, akun aktif), tidak dibuka di API publik.
- **Salinan ke pemantau** (permintaan pemilik produk, 2026-10-06): setiap "Tandai email terverifikasi" juga
  mengirim email "Salinan: akun … sudah diaktifkan" ke `MAIL_VERIFY_COPY` (bawaan `workbyrizki@gmail.com`, `off` =
  mati) untuk memastikan email terkirim. Salinan berisi nama, email, kode keluarga, dan waktu, **tanpa** password
  sementara (admin sudah melihatnya di pop-up).
- **Kirim ulang info akun** (2026-10-06): bila email "Akun sudah aktif" tidak sampai, admin bisa menekan **Kirim
  ulang info akun** di Admin → Keluarga selama orang tua belum mengganti password sementara
  (`must_change_password`). Password sementara **baru** dibuat (yang lama tidak berlaku) dan dikirim lagi, dengan
  konfirmasi. Setelah orang tua memilih password sendiri, server menolak (409) agar password itu tidak tertimpa.
- **Email dari server hosting** (2026-10-06): batas tunggu SMTP 90 detik (Exim/cPanel bisa menahan sapaan 10–40
  detik), password selain Gmail tidak dibuang spasinya, dan alat diagnosa `mail-check` (`pnpm mail:check`).
- **Kirim ulang info akun** (2026-10-06): bila email "Akun sudah aktif" tidak sampai, admin menekan **Kirim
  ulang info akun** di Admin → Keluarga (dengan konfirmasi). Hanya tersedia selama orang tua belum mengganti
  password sementara (`must_change_password`). Password sementara **baru** dibuat dan dikirim lagi (yang lama tidak
  berlaku), termasuk salinannya. Setelah orang tua memilih password sendiri, server menolak (409) agar password itu
  tidak tertimpa.
- Migrasi `0014_parent_account` hanya menambah kolom (aman untuk data yang ada).

## D-065 — Follow up pesanan belum dibayar lewat email

Tanggal 2026-10-06 · Status **Disetujui** (permintaan pemilik produk: "bagi yang belum bayar, admin bisa klik tombol
untuk follow up… kirim email dulu").

- **Tombol "Follow up via email"** di detail pesanan (Admin → Transaksi) untuk status **menunggu bayar** dan
  **kedaluwarsa**. Pesanan yang menunggu verifikasi, lunas, ditolak, atau dibatalkan tidak punya tombol ini (server
  menolak 400).
- **Isi email ke orang tua:**
  - menunggu bayar: total transfer, rekening tujuan, batas bayar, dan tombol "Lanjutkan pembayaran";
  - kedaluwarsa: nomor transfer sudah tidak berlaku, dengan ajakan memesan ulang lewat tombol "Pilih paket lagi";
  - keduanya menampilkan **"Ada kendala? Hubungi admin"** (WhatsApp admin) dan **Gabung grup WhatsApp**, bila diisi di
    Admin → Pengaturan → Kontak WhatsApp (D-064).
- **Batas:** sekali per pesanan per 24 jam (409), dengan konfirmasi sebelum kirim. Riwayat follow up (jumlah dan
  waktu terakhir) diambil dari antrean email (`email_outbox`, kind `order_followup`), jadi **tanpa migrasi**.
  Daftar transaksi menampilkan "Follow up n×".
- Hanya admin. Email transaksi lain dan salinan direksi tidak berubah. Tidak ada yang tampil di area anak.

## D-066 — Daftar & masuk orang tua dengan Google

Tanggal 2026-10-06 · Status **Disetujui** (pilihan pemilik produk: "Daftar & masuk", akun lama "Otomatis tersambung",
"Tombol + pop-up otomatis"). Alasan: banyak orang tua kesulitan mengetik email secara manual.

- **Tampilan:** tombol resmi Google Identity Services ("Daftar dengan Google" / "Lanjutkan dengan Google") di
  `/orang-tua/daftar` dan `/orang-tua/masuk`, plus pop-up One Tap yang menawarkan akun Google aktif. Form email
  tetap ada di bawahnya ("atau daftar dengan email"). Tidak ada di area anak.
- **Google diutamakan** (permintaan pemilik produk, 2026-10-06, karena banyak daftar manual gagal verifikasi):
  halaman daftar dan masuk awalnya hanya menampilkan dua pilihan, yaitu tombol Google (dengan catatan "tanpa
  mengetik email dan tanpa kode verifikasi") dan tombol **"Isi email secara manual"** / **"Masuk dengan email &
  password"**. Form lama baru muncul setelah memilih manual, disertai catatan kode verifikasi dan tautan kembali
  ke Google. Form manual langsung tampil bila Google belum diatur, skripnya gagal dimuat, atau tidak siap dalam
  6 detik, serta pada tautan berisi `?email=`.
- **Server** (`POST /auth/parent/google`, `GET /auth/parent/google` = Client ID): verifikasi ID token tanpa library
  tambahan (RS256 dengan kunci publik Google, `iss`, `aud` = `GOOGLE_CLIENT_ID`, `exp`, `email_verified`).
  Client secret tidak dipakai. Gagal verifikasi dihitung di batas percobaan per IP.
- **Akun baru:** tanpa `consent` server hanya mengembalikan nama & email (akun belum dibuat). Setelah persetujuan
  (teks sama dengan daftar biasa, UU PDP), akun dibuat dengan email terverifikasi, `google_sub`, kode referal
  (D-063), dan email sambutan. Kode referal ikut otomatis dari link `/r/KODE` atau halaman daftar, tampil di
  langkah persetujuan (bisa diketik/diubah, kode tidak dikenal ditandai). Akun lama yang masuk dengan Google tidak
  mendapat pengajak baru (referal dikunci saat daftar). Password acak yang tidak bisa dipakai; orang tua bisa membuatnya lewat "Lupa
  password?".
- **Akun lama:** cocok `google_sub` atau email → langsung masuk, tersambung, dan ditandai terverifikasi. Email yang
  sudah tersambung ke akun Google lain ditolak (409). Akun nonaktif ditolak.
- **Data:** kolom baru `parents.google_sub` (unik, migrasi `0015_google_login`). Tidak ada data anak yang dikirim
  ke atau diterima dari Google.
- **Pengaturan:** `GOOGLE_CLIENT_ID` di `.env` server (kosong = tombol tidak tampil). Panduan: `docs/google-login.md`.
  Contoh Nginx: CSP mengizinkan `accounts.google.com/gsi`, `Referrer-Policy: strict-origin-when-cross-origin`.

## D-067 — Audit SEO (perbaikan) dan keterkiriman email

Tanggal 2026-10-07 · Status **Disetujui** (permintaan pemilik produk: audit SEO yang sudah diterapkan dan email yang
tercatat terkirim tapi tidak sampai).

- **SEO** (melanjutkan commit `b376764`, rencana `docs/rencana-seo-marketing.md`):
  - judul ≤ 60 huruf dan deskripsi ≤ 155 huruf yang sesuai isi aplikasi (Pra-TK sampai SMP; matematika, sains,
    English, logika), meta `keywords` berisi nama internal dihapus;
  - data terstruktur `WebApplication` jujur: gratis dengan level awal, paket Premium tersedia (bukan "harga 0"
    tanpa keterangan); logo organisasi memakai PNG;
  - gambar pratinjau 1200×669 JPEG ±240 KB (sebelumnya JPEG berlabel PNG, 850 KB, ukuran tidak sesuai meta);
  - **area anak (`/play`, `/play/daftar`, `/play/gabung`) dan login staf → `noindex`** dan keluar dari sitemap:
    pemasaran hanya untuk orang tua (PRD A17). `robots.txt` hanya memblokir area privat; halaman `noindex` tidak
    di-Disallow agar mesin pencari bisa membaca `noindex`;
  - deskripsi daftar tidak lagi menjanjikan "akses penuh" (sebagian level berbayar).
- **Email:** status "Terkirim" hanya berarti diterima server SMTP; tanpa alat, admin tidak bisa tahu email ditolak
  atau masuk spam. SPF domain memuat `include:eduskul.my.id` (memasukkan dirinya sendiri): server Niagahoster tetap
  lolos, tetapi email yang keluar lewat relay MailChannels mendapat PermError (uji mail-tester: `T_SPF_PERMERROR`),
  sehingga perlu dirapikan di Cloudflare. Perbaikan di aplikasi:
  - **Admin → Email → Cek DNS email** (`GET /admin/mail/dns`): SPF, DKIM (`default`), DMARC, daftar masalah, dan
    usulan SPF. Hanya membaca DNS;
  - status `sent` kini berlabel **"Diterima server"** (bukan "Terkirim") dengan catatan bahwa belum tentu sampai;
  - **ID server SMTP** disimpan (`email_outbox.smtp_response`, migrasi `0016_email_tracking`) dan tampil di daftar,
    untuk dilacak di cPanel → Track Delivery;
  - semua email membawa header `List-Unsubscribe` (info materi: tautan berhenti berlangganan + mailto; lainnya:
    mailto ke pengirim). Uji mail-tester: 9/10, sisa potongan karena link situs dijawab 403 oleh pengaman bot
    Cloudflare (perlu diatur di Cloudflare, bukan di kode).
  - penutup semua email: **"Ada pertanyaan? Balas email ini"** (sebelumnya "Mohon tidak membalas"), karena balasan
    menaikkan kepercayaan Gmail (persetujuan pemilik produk 2026-10-07). Balasan masuk ke alamat pengirim, jadi
    alamat itu wajib diteruskan ke kotak masuk yang dibaca tim (Cloudflare Email Routing).
- **SEO lanjutan:** isi cadangan untuk crawler di `index.html` disamakan dengan landing (mata pelajaran & jenjang,
  cara belajar, keamanan anak, tautan orang tua), agar yang dibaca mesin pencari sama dengan yang dilihat pengunjung.

## D-068 — AI Gambar di admin (OpenAI), unit P-MA-01: pelajaran angka, menebalkan & sambung titik

Tanggal 2026-10-07 · Status **Disetujui** (permintaan pemilik produk; pilihan dikonfirmasi lewat pertanyaan:
rentang 1–10 dengan P-MA-03 tetap, model `gpt-5.6-luna`, simpan di PostgreSQL, poin masuk Skor Jago). Menjawab
sebagian bagian 8 [rencana-gudang-gambar-menu-belajar.md](rencana-gudang-gambar-menu-belajar.md).

- **AI Gambar hanya di admin** (Admin → AI Gambar, `/admin/ai-gambar`). Anak tidak pernah memicu AI; tidak ada data
  anak yang dikirim ke OpenAI. Gambar = aset statis yang direview manusia sebelum tayang.
- **Model:** `gpt-5.6-luna` adalah model teks, jadi gambar dibuat lewat **Responses API**: luna + alat
  `image_generation` yang dipaksa (`tool_choice`), kualitas **low**, WebP, latar transparan. Cadangan: Images API
  langsung (`gpt-image-2`). Semua bisa diganti di admin.
- **Hemat token (pola clipvideo):** awalan prompt tetap (`AI_STYLE_GUIDE`) + `prompt_cache_key` → cache prompt
  OpenAI; `store: false`; alat dipaksa sehingga tidak ada balasan teks; token cache dicatat per panggilan
  (`ai_usage.cached_tokens`); kualitas low (lebih murah dan cukup untuk ikon anak).
- **Sekali generate, dipakai selamanya:** sidik jari SHA-256 (versi gaya, jenis, subjek, kata, varian, catatan,
  model, kualitas, ukuran, latar, referensi). Permintaan yang sama memakai baris yang ada tanpa biaya; varian baru
  = gambar baru. **Karakter Momo** dibuat sekali (jenis `character`, subjek `momo`), disetujui, lalu dikirim sebagai
  gambar referensi untuk setiap adegan bersama Momo, sehingga karakternya tidak dibuat ulang.
- **Penyimpanan:** tabel `ai_images` (bytea, ikut `db:backup`) dan `ai_usage` (biaya + audit), migrasi
  `0017_ai_images`. Publik hanya `GET /pictures/:id` untuk gambar **disetujui** (cache permanen); pratinjau admin
  lewat endpoint ber-token.
- **Keamanan kunci:** hanya admin; kunci tulis saja (tampil `••••abcd`), AES-256-GCM (`secret-box`), **wajib sandi
  admin** untuk mengganti kunci atau pengaturan biaya (5 salah / 15 menit), email ke direksi saat kunci diganti/
  dihapus atau batas dinaikkan, error OpenAI disensor (`sk-…`), log tanpa kunci, tombol nonaktif & hapus kunci.
  Prompt disusun server dari kata + panduan gaya (admin hanya isi kata dan catatan ≤ 120 huruf). Batas biaya
  harian/bulanan (bawaan US$5/US$50, kalender WIB) ditegakkan Udakids sebelum setiap panggilan; generate maks.
  30 / 10 menit per admin. `.env OPENAI_API_KEY` dipakai lebih dulu bila diisi (disarankan kosong).
- **Unit P-MA-01 "Bilangan 1 sampai 10"** (CSV diubah dari 1–5; P-MA-03 tetap): pelajaran 6 layar menempel di
  kategori katalog (`lesson`, skema `lessonSchema`), dibuka dari tombol "Belajar dulu" di halaman topik
  (`/play/belajar/:token`): ketuk angka → disebut + Momo menulis + benda sebanyak angka; kartu kata dengan suku
  kata yang disorot (sa-tu … se-pu-luh); coba menghitung (ketuk benda satu per satu); coba menebalkan 1–3 (tidak
  dinilai); ingat → "Ayo latihan". Suara pelajaran memakai suara perangkat (D-035 belum diperluas ke narasi
  pelajaran).
- **Interaksi baru (masuk Skor Jago):** `trace` (family `numeral-trace`: tebalkan 0–10 mengikuti goresan bernomor,
  jalur goresan buatan sendiri; benar setelah semua goresan selesai dengan keluar jalur ≤ `maxSlips`; keluar jalur
  → goresan diulang lembut tanpa kata "salah"; tulisan anak tidak disimpan), `connect` (family `connect-dots`:
  sambung titik 1–N sampai gambar jadi; benar bila ketukan keliru ≤ `maxSlips`), dan `tap-all` gaya `balloons`
  (pecahkan balon angka).
- **Buku baru "Worksheet Pra-TK"** (domain `worksheet`, permintaan pemilik produk: Pra-TK → Worksheet → judul yang
  sesuai). Topik A **"Mengenal angka 1 sampai 10"** berisi pelajaran P-MA-01 + 10 level: tebalkan 1–3, 4–6, 7–10,
  balon ≤ 5, sambung titik ≤ 6, tebalkan titik-titik 0–10, balon ≤ 10, sambung titik ≤ 10, hitung lalu tebalkan,
  tantangan campuran. Akses anak: `/play` → Pra-TK → tab **Worksheet**. Pengelompokan berikutnya di buku yang sama
  (satu topik per lembar kerja): Mengenal huruf vokal, Menebalkan garis & pola, Huruf awal benda, Cocokkan gambar.
  Buku Math Pra-TK tidak berubah (tetap 25 topik).
- `standalone: true` (topik mandiri yang tidak mengunci topik lain; dicek juga di server, dan tidak dipilih sebagai
  "level berikutnya" bila anak sudah bermain di topik biasa) tersedia untuk topik tambahan yang kelak disisipkan ke
  buku yang sudah dimainkan anak.
- Contoh lembar kerja yang dikirim hanya acuan bentuk latihan; goresan, gambar sambung titik, dan teks dibuat sendiri.

## D-069 — EMC TK (Eduversal Mathematics Competition) di buku Math TK (OSN)

Tanggal 2026-10-07 · Status **Disetujui** (permintaan pemilik produk).

- **Penempatan:** TK (OSN) → Matematika → bagian **"EMC · Eduversal Mathematics Competition"**. Kategori katalog
  mendapat field opsional **`group`** (2–60 huruf); daftar materi anak menampilkan materi tanpa `group` lebih dulu,
  lalu satu judul bagian per `group` (nomor materi mulai dari 1 di tiap bagian). Bisa diubah di admin → Katalog.
  Tanpa migrasi DB (kategori disimpan sebagai jsonb).
- **Empat materi `standalone`** (F–I, 10 level per materi; terbuka sejak awal, tidak mengunci materi A–E), mengikuti
  kisi-kisi EMC TK:
  - **F Pasar buah: tambah dan kurang** — penjumlahan & pengurangan bergambar (gabung, coret, kalimat matematika,
    berapa yang ditambah, soal cerita, tiga keranjang).
  - **G Kereta angka ratusan** — mengurutkan puluhan/ratusan bulat/ratusan, sebelum–sesudah–di antara, loncat 10/100.
  - **H Timbangan angka dan dadu** — tanda >, <, = untuk mata dadu, bilangan sampai 20/100/ratusan, jumlah mata dua
    dadu, mata dadu vs angka.
  - **I Kota bentuk** — lingkaran, segitiga, persegi, persegi panjang, **belah ketupat**; benda di sekitar, tarik
    garis benda ↔ bentuk dan angka ↔ kumpulan bentuk, belah ketupat vs persegi, pola.
  - Pola level: 1–8 konsep & penerapan → 9 teka-teki gaya EMC (bank soal `manual`) → 10 tantangan campuran.
- **Komponen baru (engine + web):**
  - Visual **`die`** (mata dadu 1–6, SVG pola dadu asli; juga di editor visual admin).
  - Bangun datar **`belah-ketupat`** dan benda **`ketupat`**. `SHAPE_IDS` tetap 6 bentuk lama (pilihan acak & pool
    default), sehingga soal lama tidak berubah; belah ketupat hanya muncul bila disebut di `pool` (`ALL_SHAPE_IDS` =
    semua bentuk). Persegi tidak lagi diputar 45° agar tidak tertukar dengan belah ketupat. `real-world-shape`
    mendapat param `pool`.
  - `number-order`: param `min`, `step`, `direction` (`asc`/`desc`), batas sampai 999; nilai bawaan menghasilkan soal
    yang sama seperti sebelumnya.
  - `expr`: **`labelSay`** (cara membacakan label, mis. ">" → "lebih dari") dan token **`{answer_say}`**.
  - Family **`match-pairs`**: bank soal "tarik garis" (2–5 pasangan, kolom kanan diacak; anak mengetuk kiri lalu
    kanan, tanpa drag). Editor bank soal manual yang ada tidak berubah.
- Contoh lembar kerja yang dikirim hanya acuan bentuk soal; soal, gambar, dan teks dibuat sendiri (tidak menyalin bank
  soal EMC). Semua dibacakan, jawaban berupa kartu besar, tanpa batas waktu.

## D-070 — ESC Sains TK (Eduversal Science Competition), judul bagian lomba, "TK (Olimpiade)"

Tanggal 2026-10-07 · Status **Disetujui** (permintaan pemilik produk; pilihan dikonfirmasi lewat pertanyaan: nama
ESC, interaksi ketuk huruf, gambar SVG sendiri).

- **Nama jenjang** `tkosn` di area anak: **"TK (Olimpiade)"**; buku: "Math TK (Olimpiade)" dan "Sains TK (Olimpiade)".
- **Judul bagian lomba** (`group`, kini ≤ 100 huruf) berpola `SINGKATAN · Nama lomba — keterangan` dan tampil sebagai
  kartu judul: lencana singkatan, nama lomba tebal, keterangan + jumlah materi, tombol dengar.
  - Math: "EMC · Eduversal Mathematics Competition — Penyisihan Final Provinsi 2026" (D-069).
  - Sains: **"ESC · Eduversal Science Competition — Penyisihan Final Provinsi 2026"**.
- **Sains TK (Olimpiade), empat materi `standalone`** (F–I, 10 level; level 9 teka-teki gaya ESC, level 10
  tantangan campuran), mengikuti kisi-kisi 2026:
  - **F Kendaraan, alat kebersihan, dan benda alam** — silang kendaraan darat/air/udara, hubungkan kendaraan ↔
    tempat, tulis nama kendaraan, silang alat kebersihan & gunanya, benda alam vs buatan manusia, tebak benda alam.
  - **G Hewan: berkembang biak, makanan, dan bergerak** — silang hewan laut + tulis namanya (P _ _ _, G _ R _ T _,
    H _ _, K _ P _ T _ _ G, P _ _ Y _), hubungkan hewan ↔ makanan, bertelur/melahirkan, cara bergerak, ciri
    (berkaki dua, berbisa, bersayap, bercapit).
  - **H Tubuhku: bagian dan fungsinya** — tunjuk/nama bagian tubuh pada gambar anak, tulis nama anggota tubuh
    (M _ _ _, H _ _ _ NG, M _ _ _ T, K _ _ _ L _, T _ NG _ _, K _ _ _), "Aku … dengan …", hubungkan kegiatan ↔
    pancaindra, fungsi anggota tubuh, menjaga tubuh.
  - **I Manfaat api dan air** — api atau air, silang yang memakai api/air, hubungkan benda ↔ manfaat, keselamatan
    api & hemat air, api dan air mengubah benda.
- **Format soal mengikuti lembar contoh** (silang, lengkapi nama, "Aku … dengan …", tunjuk bagian tubuh, hubungkan),
  tetapi kalimat dan gambar dibuat sendiri (PRD A17: tidak menyalin soal/aset pihak lain).
- **Komponen baru:**
  - Interaksi **`spell`** + family **`spell-word`** (bank soal): kotak huruf dengan kotak kosong (pola `show`,
    mis. "G_R_T_"; bawaan huruf pertama lalu berselang-seling), kartu huruf = huruf hilang + 1–4 pengecoh yang tidak
    ada di kata. Anak mengetuk kartu untuk mengisi kotak dari kiri; ketuk kotak terisi untuk mengembalikan. Nilai
    jawaban = huruf (bukan id), jadi aman untuk lomba tanpa penyamaran. Perintah suara `vo_cmd_spell`.
  - Visual **`body`**: anak berdiri, bagian tubuh (`kepala`, `rambut`, `mata`, `telinga`, `hidung`, `mulut`,
    `tangan`, `perut`, `kaki`) ditandai lingkaran kuning berdenyut + panah. Juga di editor visual admin.
  - **34 ilustrasi SVG baru** (paus, hiu, gurita, kepiting, penyu, buaya, ulat, lumba-lumba, daun, rumput, motor,
    helikopter, perahu, truk, sapu, alat pel, kemoceng, tempat sampah, sikat gigi, sabun, gunung, pelangi, laut,
    lilin, kompor, api unggun, keran, penyiram tanaman, anak mendengar/melihat/mencium/meraba/mandi/menyiram), semua
    `countable: false` agar soal membilang lama tidak berubah.
  - **Animasi ringan** (`va-*`: paus menyembur, api menyala, air menetes, baling-baling, ombak, gelombang suara),
    mati bila "kurangi gerak" aktif.
  - Bank soal `manual` kini sampai **10 pilihan** (soal "silang semua" seperti lembar lomba).

## D-071 — English TK (Olimpiade): kisi-kisi Final 2026, soal dibuat dari kosakata

Tanggal 2026-10-07 · Status **Disetujui** (permintaan pemilik produk).

- **Buku baru `english/tkosn` "English TK (Olimpiade)"**, di jenjang TK (Olimpiade) bersama Math dan Sains (OSN).
  12 materi × 10 level, dikelompokkan dengan `group` (D-069) sesuai kisi-kisi Final 2026:
  - **Kisi-kisi 1** (hewan, cuaca, bagian tubuh, buah & sayur): A Animals, B Fruits and vegetables, C Weather,
    D My body;
  - **Kisi-kisi 2** (benda di kelas, peralatan toilet, benda umum): E In the classroom, F In the bathroom,
    G Things and toys;
  - **Kisi-kisi 3** (bangun datar): H Shapes;
  - **Kisi-kisi 4** (he, she, it & percakapan): I He, she, it; J Everyday talk;
  - **Simulasi Final 2026**: K Numbers (kata bilangan one–twenty, dari contoh soal "hitung dan lingkari"),
    L Simulasi Final 2026 (paket 1–10 campuran semua kisi-kisi).
    Semua materi `standalone` agar anak bisa langsung berlatih kisi-kisi mana pun.
- **Model soal mengikuti contoh lembar olimpiade**: "Lengkapilah nama hewan" (kotak huruf, huruf pertama tampil),
  "Silang/lingkari nama yang tepat" (2–4 kartu kata huruf besar), "I like my …" (pilih gambar dari kalimat),
  "Hitung dan lingkari jumlah" (kata bilangan), ditambah dengar-lalu-pilih, kelompokkan (tap-all), ketuk semua bentuk
  yang sama, he/she/it (isi & pilih gambar), dan percakapan (jawaban yang tepat, sapaan dari gambar, What is this?,
  What colour is it?). **Bentuk soal disamakan, isinya tidak disalin**: kata, kalimat, dan gambar dibuat sendiri
  (aturan CLAUDE.md: dilarang menyalin soal/aset pihak lain).
- **Selalu berbeda**: soal tidak dari bank tetap, tetapi dibuat engine dari kosakata 150+ kata (family baru
  `english-word`, `english-count`, `english-pronoun`, `english-talk`). Setiap level menghasilkan ≥ 48 soal berbeda
  (kebanyakan ratusan); ronde menghindari soal kembar dan soal 3 ronde terakhir (D-028), jadi setiap kali level
  dibuka soalnya berbeda.
- **Komponen baru**: visual `letters` (kotak huruf, kotak kosong berkedip lembut); 29 ilustrasi SVG baru
  (`objects-emc.tsx`: hujan, salju, angin, petir, kursi, tas, penghapus, penggaris, gunting, krayon, papan tulis,
  kloset, handuk, sisir, pasta gigi, cermin, boneka, robot, boneka beruang, ceri, bawang, kentang, harimau, anak
  laki-laki, anak perempuan, ayah, ibu berkerudung, kakek, nenek) dengan animasi ringan yang mati saat
  "kurangi gerakan". Tidak menyimpan data anak apa pun (gambar orang hanya untuk he/she).
- **Suara**: seperti English Pra-TK (D-062), perintah English TK Olimpiade dibacakan dalam Bahasa Indonesia dengan
  kata English di dalamnya; kartu kata dibacakan suara English (en-GB) saat diketuk.

## D-072 — Mock Test olimpiade (25 soal, penilaian gaya EMC) & bagian lomba di buku TK (Olimpiade)

Tanggal 2026-10-07 · Status **Disetujui** (permintaan pemilik produk; pilihan dikonfirmasi: penilaian gaya EMC dengan
pengurangan, stopwatch tanpa batas waktu, satu mock test per buku, bagian "OSN TK" + "EEC").

- **Riset penilaian olimpiade:** Math Kangaroo kelas 1–4 (anak TK ikut kelas 1): 24 soal, 75 menit, sepertiga soal
  bernilai 3/4/5 poin, salah tidak dikurangi. EMC Eduversal (data 2020, SD–SMA): 45 soal, 120 menit; benar +8/+20/+40
  dan salah −2/−5/−10 untuk soal mudah/sedang/sulit, kosong 0. Peringkat umumnya: poin tertinggi, lalu (Udakids)
  waktu tercepat.
- **Aturan baru konten:** setiap buku olimpiade punya, selain 10 level per materi, **satu Mock Test** dengan jumlah
  soal seperti lomba asli (TK: **25**) yang menggabungkan semua materi di buku itu. Dicatat juga di skill
  `add-skill-template`.
- **Bentuk:** kategori `Z` "Mock Test Olimpiade …" (group "Mock Test · Simulasi lomba 25 soal — penilaian gaya EMC",
  standalone) berisi satu skill `family: "mock"` yang hanya menyimpan konfigurasi (`questions` 25, `plan` 9 mudah /
  8 sedang / 8 sulit, `levels` 1–3 / 4–7 / 8–10, `points` EMC, `referenceMinutes` 60). Soal disusun
  `generateMockRound` dari level-level buku itu, urut mudah → sulit, materi bergiliran, tanpa soal kembar, dan
  menghindari soal ronde sebelumnya. Soal membawa id/seed level sumbernya, jadi suara Momo dan pemeriksaan jawaban
  sama seperti level biasa. Level berbayar yang belum dibeli tidak ikut jadi sumber.
- **Saat mengerjakan:** tanda benar/belum tepat tidak tampil per soal (seperti lembar lomba); tombol **Lewati**
  (nilai 0); **stopwatch tanpa batas waktu** (D-024) dengan acuan "±60 menit" sebagai informasi saja — tidak ada
  hitung mundur. Hasil: skor 0–100, poin EMC (mis. 300/552), jumlah benar/belum tepat/dilewati per tingkat,
  durasi, dan **pembahasan** tiap soal (jawaban + penjelasan).
- **Skor:** poin = Σ (+8/+20/+40 benar, −2/−5/−10 belum tepat, 0 dilewati); **skor 0–100 = max(0, poin) / poin
  maksimal × 100**, disimpan seperti hasil level (skor terbaik tidak turun, waktu skor terbaik) sehingga **masuk skor
  utama dan papan peringkat**. Server memeriksa ulang: jumlah soal harus sesuai konfigurasi dan poin dalam rentang
  yang mungkin (−138 … 552); `points` di level biasa ditolak. Field opsional `points` di `practiceSync.quizzes`
  (tanpa migrasi DB).
- **Bagian lomba yang seragam:** Math & Sains TK (Olimpiade) materi A–E kini berjudul bagian
  **"OSN TK · Olimpiade Sains Nasional TK — materi umum"**, F–I tetap EMC/ESC; English TK (Olimpiade) materi A–K masuk
  **"EEC · Eduversal English Competition — Final 2026"**, dan materi "Simulasi Final 2026" (L) dihapus karena
  digantikan Mock Test (skill lama otomatis menjadi draft saat seed).
- **Khusus anak berpaket** (keputusan pemilik produk; **diganti D-073**: Mock test 1 gratis satu kali): bila paywall aktif, Mock Test tidak termasuk "level gratis"
  (`needsPurchase` dengan `family: 'mock'`), tampil terkunci dengan pemberitahuan Premium yang ramah anak (tanpa
  harga), dan hasilnya ditolak server untuk anak tanpa paket. Alasan: soal sedang/sulit diambil dari level 4–10 yang
  memang berbayar.
- **Perbaikan API macet saat restart:** koneksi SSE statistik langsung menahan `server.close()`, sehingga
  `nest --watch` (dan `systemctl restart`) menunggu selamanya dan semua `/api` menjawab 500. API kini memutus semua
  koneksi saat menerima SIGTERM/SIGINT (`main.ts`).
- **Peringkat mock test:** hasil mock ikut papan global & per buku (seperti ronde biasa), dan setiap mock test punya
  **papan sendiri** — di menu Peringkat (tab **Mock test** + pilihan mata pelajaran per buku olimpiade) dan di halaman
  topik mock test ("Papan peringkat mock test ini", 10 besar + posisimu). Urutan gaya olimpiade: percobaan terbaik tiap
  anak, **poin tertinggi → waktu tercepat** (poin & waktu sama → posisi sama). Hanya nama panggilan + warna Momo yang
  terlihat (tanpa id anak lain). API `GET /leaderboard/mocks` dan `GET /leaderboard/mock/:skillId`; 25 soal mock ikut
  dihitung sebagai "soal dijawab".
- **Laporan mock test-ku (khusus anak itu sendiri):** setiap percobaan menyimpan laporan ringkas per soal (level
  sumber + versi + seed + band + tingkat + hasil benar/belum tepat/dilewati; jawaban yang dipilih tidak disimpan) di
  event `quiz_result` (`review`, diperiksa server: satu entri per soal, jumlah benar cocok). Di halaman topik mock
  ada bagian **"Laporan mock test-ku"**: daftar percobaan (termasuk yang belum terkirim dari perangkat) yang bisa
  dibuka untuk melihat ringkasan, rincian per tingkat, dan pembahasan tiap soal (jawaban benar + penjelasan). Soal
  dibuat ulang secara deterministik; bila level sumbernya sudah berubah versi, laporan menulis "soal ini sudah
  diperbarui". API `GET /practice/mock/:skillId/attempts` hanya untuk peran anak dan hanya mengembalikan percobaan
  `user.id` sendiri — anak lain tidak bisa melihat laporan orang lain. Tampilan mock (ringkasan, soal, hasil,
  laporan, papan) diuji tanpa meluber di lebar 390 / 820 / 1280 px.
- Mock test tidak dipakai sebagai sumber soal lomba live (D-042). Kata "salah" tidak dipakai di layar anak
  ("belum tepat"), tanpa merah besar.

## D-073 — Landing (10 Besar, video panduan, artikel), lanjutkan permainan, 3 mock test per buku olimpiade

Tanggal: 2026-10-07. Disetujui pemilik produk (jawaban: "Ketiganya sama 9/8/8", "Nilai peringkat + soal dijawab",
"Tombol besar 'Lanjutkan'", "Teks + gambar sampul").

- **Urutan landing:** hero → banner → **10 Besar Global** → … Bagian 10 Besar memakai podium 1–2–3 + daftar 4–10
  (seperti menu Peringkat) dengan tiga papan: **Total skor**, **Rata-rata tertinggi** (nilai peringkat berbobot
  D-045), dan **Paling aktif** (soal dijawab; seri → waktu bermain lebih lama). Rata-rata & paling aktif punya
  periode **semua / bulan ini / minggu ini / hari ini** (zona WIB; paling aktif tanpa "semua" — permintaan `period=all` memakai bulan ini). API publik
  `GET /leaderboard/public?board=&period=` hanya mengirim nama panggilan + warna/tampilan Momo (tanpa id anak).
- **Video panduan:** admin menempel tautan YouTube (watch, youtu.be, shorts, embed, live, atau id) di Admin →
  **Video panduan**; yang disimpan hanya id 11 karakter + judul/keterangan/urutan/aktif (tabel `videos`). Landing
  menampilkan gambar dari `i.ytimg.com`; video baru dimuat saat diketuk, di dialog lewat **youtube-nocookie**. CSP
  nginx: `img-src https://i.ytimg.com`, `frame-src https://www.youtube-nocookie.com`.
- **Artikel/berita:** Admin → **Artikel & berita** (tabel `articles`): judul, slug unik (dibuat dari judul; bentrok
  → akhiran `-2`, `-3`, …), ringkasan, isi **teks biasa** (baris kosong = paragraf, `## ` = subjudul, `- ` =
  daftar; tidak ada HTML dari admin), gambar sampul (unggahan media D-042, terlindung dari pembersihan otomatis,
  dibuang saat diganti/artikel dihapus), status draf/terbit (tanggal terbit diisi saat pertama kali terbit). Landing
  menampilkan 3 artikel terbaru + "Lihat semua" → `/artikel` (per halaman) dan `/artikel/:slug`. Publik hanya
  melihat artikel terbit dan video aktif.
- **Lanjutkan permainan:** ronde latihan yang belum selesai disimpan di perangkat (`inProgress`: skill + versi +
  seed + daftar hindar + jawaban, maks. 7 hari) sehingga soal yang sama tersusun ulang dan anak kembali ke soal
  berikutnya yang belum dijawab. Beranda menampilkan kartu besar **"Lanjutkan permainan terakhir"** (soal n dari
  10); di perangkat lain, kartu memakai level terakhir dari server (`GET /practice/resume`, tanpa mock test).
  Selesai atau keluar dengan sengaja menghapus simpanan.
- **3 mock test per buku olimpiade** (Math/Sains/English TK): Mock test 1 (id lama dipertahankan agar riwayat tidak
  hilang), 2, dan 3 — semua 25 soal 9/8/8 dari kisi-kisi buku yang sama; soal berbeda karena seed baru tiap
  percobaan dan menghindari soal sebelumnya. Mock test tidak berurutan (2 tidak menunggu 1 lulus).
  **Gratis:** Mock test 1 boleh **satu kali** (tanpa ulang); Mock 2 & 3 khusus Premium. **Premium/kelas:** semua
  mock boleh diulang, dengan riwayat + poin (laporan mock test-ku D-072). Server menolak hasil yang melanggar
  (`needsPurchase` untuk mock = order > 1; `mockRetakeLocked` = tanpa akses buku & sudah ≥ 1 percobaan). Ini
  menggantikan aturan "Khusus anak berpaket" di D-072.

## D-074 — KMSI (Kompetensi Matematika Sains dan Bahasa Inggris): Level A (TK), KKM, mock & peringkat publik

Tanggal 2026-10-07 · Status **Disetujui** (pemilik produk; dikonfirmasi lewat pertanyaan: nama "KMSI", per butir
kisi-kisi dikerjakan bertahap per jenjang, Level A benar 4 / salah & kosong 0, 3 mock per buku seperti TK).

- **Ketentuan lomba KMSI (penyisihan 2026):** 5 kategori — TK (Level A), Kelas 1–2 (Level 1), Kelas 3–4 (Level 2),
  Kelas 5–6 (Level 3), SMP 7–9 (Level 4); 60 menit; Level A 20 soal, Level 1–4 30 soal pilihan ganda; benar 4,
  salah 0, kosong 0; KKM lolos Level A **40**, Level 1–4 **72**. Peserta boleh ikut beberapa mapel dan level di
  atasnya (aplikasi tidak membatasi jenjang).
- **Penempatan:** jenjang yang sudah ada (`tkosn`, `sd12`, `sd34`, `sd56`, `smp79`). Label anak berubah dari "(OSN)"
  menjadi **"(Olimpiade)"**: "Kelas 1–2 (Olimpiade)", "Kelas 3–4 (Olimpiade)", "Kelas 5–6 (Olimpiade)",
  "SMP Kelas 7–9 (Olimpiade)"; judul buku "Math/Sains Grade 1-2 (Olimpiade)" dst. Materi KMSI = bagian (`group`)
  **"KMSI · Kompetensi Matematika Sains dan Bahasa Inggris — Penyisihan 2026"**, satu materi per butir kisi-kisi ×
  10 level (pola sama dengan TK Olimpiade: 1–8 konsep & penerapan, 9 teka-teki gaya KMSI, 10 tantangan campuran),
  semua `standalone`.
- **Tahap 1 (sesi ini) — Level A (TK):** Math J–M (tambah/kurang, nama bangun datar, melanjutkan pola, mengurutkan
  angka), Sains J–Q (pancaindra, rasa manis/asin/asam/pahit, hewan–buah–sayur, melengkapi huruf nama benda,
  anggota tubuh, cuaca & benda langit, tempat tinggal hewan, kebiasaan baik), English L–S (animals & fruits,
  numbers, school things, counting, body parts, huruf hilang nama buah, susun huruf acak, transportation) — 200
  level.
- **Tahap 2 — Level 1–4 (selesai 2026-10-08)**, mock 30 soal 10/10/10, KKM 72:
  - **Kelas 1–2 (`sd12`)** — Math K–Q (pengukuran & alat ukur, operasi bilangan, sifat bilangan & operasi, nilai
    tempat & lambang bilangan, pecahan sederhana, waktu, bangun datar); Sains K–Q (benda & sifatnya, energi &
    perubahannya, perubahan wujud, anggota tubuh & kesehatan, gaya & bunyi, makhluk hidup, lingkungan); **English
    Grade 1-2 (Olimpiade)** A–L (number & simple math, colors, animals, fruits & vegetables, body parts, school
    objects, food & drink, family members, daily activities & habits, introducing oneself, simple descriptions,
    basic grammar & expressions).
  - **Kelas 3–4 (`sd34`)** — Math K–Q (operasi & penaksiran, sifat bilangan/KPK/FPB, pecahan, bangun datar, bangun
    ruang, persamaan, aritmetika sosial); Sains K–Q (makhluk hidup, benda & sifatnya, gaya & gerak, energi,
    pelestarian hewan, keterampilan proses sains, lingkungan & SDA); **English Grade 3-4** A–L (number & math, food
    & meals, animals, likes & dislikes, simple present, present continuous, house & rooms, hobbies, transportation,
    introducing oneself, prepositions of place, descriptive text/reading).
  - **Kelas 5–6 (`sd56`)** — Math K–R (operasi bilangan bulat/pangkat/akar, bangun datar & lingkaran, bangun ruang,
    persamaan, aritmetika sosial, teori bilangan sederhana, pola & barisan, statistika sederhana); Sains K–R (energi
    & gaya, pesawat sederhana, gaya–energi–magnet, alat optik, metode ilmiah, makhluk hidup, benda & sifatnya,
    lingkungan & SDA); **English Grade 5-6** A–L (jobs, WH-questions, simple past, routines, present simple vs
    continuous, clothes, weather & seasons, comparison, house & places, descriptive text, narrative/recount reading —
    dua butir kisi-kisi "Reading and Descriptive Text" dibedakan agar soal tidak kembar —, vocabulary & proverbs).
  - **SMP 7–9 (`smp79`)** — Math J–R (operasi bilangan, bangun datar & Pythagoras, bangun ruang, persamaan & SPLDV,
    aritmetika sosial, teori bilangan, pola & barisan, perbandingan, statistika & peluang); Sains K–R (klasifikasi
    makhluk hidup, kesehatan & tubuh, ekologi, genetika, zat & perubahan, bioteknologi, energi & gaya, metode ilmiah
    & bioteknologi); **English SMP Kelas 7-9** A–L (synonym/antonym, parts of speech, prepositions, speaking
    expressions, past simple/continuous/perfect, modals & conditionals, comparison, descriptive/report text,
    biography/recount, data reading, public space & environment, functional texts).
  - Pola level sama untuk semua: tabel fakta (Sains/kosakata, family `facts`: tanya atribut → tanya nama → benar/
    salah → mana yang berbeda) atau bank soal mudah/sedang/sulit (grammar & bacaan) atau template hitung (`expr`,
    Matematika), lalu level 9 teka-teki gaya KMSI dan level 10 tantangan campuran. Soal pangkat memakai tabel nilai
    karena evaluator ekspresi tidak punya operator pangkat.
  - **Seed & katalog suntingan admin:** katalog yang pernah disunting admin tetap tidak ditimpa, tetapi `db:seed`
    kini menambahkan **materi baru** dari `content/` (kode yang belum ada di DB) dan mengganti judul "(OSN)" →
    "(Olimpiade)"; suntingan admin pada materi lama tetap, bagian "Mock Test …" tetap di akhir
    (`mergeNewCategories`). Tanpa ini, materi KMSI Math/Sains Kelas 1–4 tidak muncul di server yang katalognya
    pernah disunting.
  - Landing: chip jenjang di "Peringkat Mock Test Olimpiade" diurutkan TK → SMP dan bisa digeser di HP.
  - Total KMSI: 1.290 level + 45 mock (5 jenjang × 3 mapel × 3 mock); seluruh konten lolos `validate:content`
    (200 soal per level) dan setiap mock tersusun penuh hanya dari materi KMSI.
- **Mock Test KMSI:** kategori `Y` "Mock Test KMSI <mapel> TK" (group "Mock Test KMSI · Simulasi penyisihan 20 soal
  — benar 4, KKM 40"), 3 mock per buku (akses sama dengan D-073: Mock 1 gratis sekali, Mock 2–3 & mengulang
  Premium). Konfigurasi mock baru:
  - `categories`: soal hanya dari materi lomba itu (mock lama tanpa field ini tetap dari semua materi buku);
  - `points`: KMSI `{ right: 4, wrong: 0 }` untuk semua tingkat (`KMSI_POINTS`);
  - `passPoints` (KKM): mock "lulus" bila poin ≥ KKM (`mockPassed`), dicatat lewat `recordQuiz(…, passScore)` dengan
    `mockPassScore` = KKM dikonversi ke skor 0–100 (Level A 40/80 → 50; Level 1–4 72/120 → 60), di perangkat dan
    server. Ringkasan mock menampilkan "KKM 40 · poin untuk lolos (maks. 80)"; hasil menampilkan "Poinmu mencapai
    KKM — lolos ke babak berikutnya" atau "Tinggal n poin lagi" (tanpa kata "gagal", tanpa merah).
  - Stopwatch tanpa batas waktu tetap (D-024); 60 menit hanya acuan.
- **Komponen baru:** topik kosakata English `transport` (10 kendaraan; tidak ikut mode kelompokkan/hitung agar soal
  lama tetap); `spell-word` boleh `extra: 0` → **susun huruf acak** (kartu tepat huruf kata itu, tidak pernah sudah
  urut); 13 SVG (`objects-kmsi.tsx`): permen, madu, gula, garam, kerupuk, kopi, obat, pare, jeruk nipis, lidah,
  kandang, kolam, sarang lebah; teks kartu "Belum dicoba · n soal baru" mengikuti jumlah soal mock.
- **Landing — "Peringkat Mock Test Olimpiade"** (setelah 10 Besar Global): pilih lomba (**KMSI 2026** /
  Olimpiade gaya EMC), jenjang, mata pelajaran, dan mock test 1–3; podium 1–2–3 + daftar 4–10 dengan poin/maks,
  jumlah benar, waktu, dan lencana **Lolos KKM**; baris aturan (jumlah soal, penilaian, KKM) dan jumlah peserta yang
  lolos KKM. API publik `GET /leaderboard/public/mocks` dan `GET /leaderboard/public/mock/:skillId` (10 besar) hanya
  mengirim nama panggilan + tampilan Momo (tanpa id anak), dari snapshot yang sama (cache 10 detik). Nama lomba
  diambil dari judul bagian mock ("Mock Test KMSI · …" → KMSI).
- Contoh soal yang dikirim hanya acuan bentuk; soal, kalimat, dan gambar dibuat sendiri (PRD A17).

## D-075 — PAUD, Worksheet PAUD Baca Tulis (huruf vokal P-BT-04/05) & game interaktif

Tanggal: 2026-10-07. Disetujui pemilik produk (jawaban: "Semua label", game "Labirin, Cari kata, Kartu pasangan,
Tangkap — semuanya", bunyi P-BT-01 "Momo menirukan bunyi", cakupan "Bertahap").

- **Pra-TK → PAUD** di semua label (chip jenjang, landing "Dari PAUD sampai SMP", SEO, judul buku Math/English/
  Worksheet PAUD, blueprint). Kode jenjang tetap `prek`, jadi progres anak dan id skill tidak berubah. Judul
  katalog yang pernah disunting admin tidak ditimpa seed; diganti dengan SQL khusus judul (docs/deploy-contabo.md).
- **Worksheet PAUD dikelompokkan** dengan `group` (D-069): "Numerasi · Berhitung — …" (A Mengenal angka 1–10,
  B Game angka) dan "Literasi · Baca Tulis — …" (C Huruf vokal a dan i = P-BT-04, D Huruf vokal u, e, o =
  P-BT-05, E Game huruf). Unit Baca Tulis PAUD masuk buku Worksheet (bukan buku `literasi`), atas permintaan
  pemilik produk. Topik game (B, E) `standalone`.
- **Rantai kunci per bagian:** topik biasa pertama setiap bagian setelah bagian pertama terbuka sejak awal
  (`groupStartCodes`, dipakai web dan server), jadi Baca Tulis tidak menunggu Berhitung; di dalam bagian tetap
  berurutan (D menunggu Level 1 C). Buku lain tidak berubah (bagian keduanya hanya berisi topik mandiri).
- **Pelajaran huruf** (`lessonSchema` diperluas): `kenalan`/`ingat` dengan `huruf` (ketuk → disebut, Momo menulis
  huruf besar & kecil, gambar berawalan huruf itu), `bunyi` (ketuk gambar → bunyi depan lalu kata), `kata` dengan
  kartu `huruf` + suku kata (a-yam, i-kan), `coba` `tebal` huruf dan `cari` huruf (tidak dinilai).
- **Huruf vokal di engine:** goresan a i u e o / A I U E O (`glyphs.ts`, dibuat sendiri; titik huruf i cukup
  disentuh); family `letter-trace`, `letter-find` (dengar, tunjuk, huruf depan, gambar berawalan, besar-kecil),
  `letter-tap-all` (balon huruf). Pengecoh: vokal lain, huruf bentuk mirip (a/o, e/c, u/n, i/l), lalu konsonan.
  Gambar baru (buatan sendiri): itik, udang, unta, elang, emas, obor, obeng, ombak; kata lain dari contoh lembar
  kerja dicatat di `docs/blueprint/gambar-kurang.csv`.
- **Empat game baru (interaksi + family), dinilai engine dari ketukan, tanpa batas waktu & tanpa nyawa:**
  - `maze` / `maze-path`: labirin sempurna ber-seed (maks. 5 kolom), ketuk kotak sebaris/sekolom untuk berjalan;
    huruf A I U E O atau angka 1…n berurutan di jalan keluar, pengecoh di jalan buntu; menabrak dinding = slip.
  - `word-search` / `word-search`: kotak huruf maks. 5×5, kata bergambar (buah, hewan, angka, berawalan vokal),
    mendatar/menurun, ketuk huruf berurutan. Penilaian dari huruf di kotak (`wordSearchStep`, sama di web & server),
    setiap kata dijamin muncul tepat sekali.
  - `memory` / `memory-pairs`: kartu pasangan angka ↔ banyak benda, huruf besar ↔ kecil, huruf ↔ gambar.
  - `catch` / `catch-items`: benda melintas pelan dan terus berputar sampai ditangkap; bila gerak dikurangi
    (`prefers-reduced-motion`), benda diam berjajar.
  - Target sentuh ≥ 64 px juga di layar 360 px (papan memakai sebagian margin layar). Kalimat perintah baru di
    dialog Momo (`vo_cmd_maze`, `vo_cmd_word_search`, `vo_cmd_memory`, `vo_cmd_catch`).
  - Lomba live: labirin & cari kata boleh (letak kata tidak dikirim); kartu pasangan & tangkap tidak dipakai
    karena kunci jawabannya harus ada di perangkat (`contestSafeTemplate`).
- **Konten:** 40 level baru (B, C, D, E × 10), setiap level ≥ 36 soal unik; level tebalkan digabung dengan cari
  huruf sesuai kolom CSV "tebalkan + cari huruf". Status unit P-BT-04/05 di blueprint: Draf.
- **Berikutnya (sesi lain):** P-BT-01 (bunyi di sekitar, ditirukan suara Momo), P-BT-02/03 (garis tegak/mendatar,
  lengkung/lingkaran/zig-zag: perlu goresan pola di `glyphs.ts`), dan konsonan/suku kata (Ba Bi Bu Be Bo) dari
  contoh lembar kerja. Contoh lembar kerja hanya acuan bentuk; soal, kalimat, dan gambar dibuat sendiri.

## D-076 — Mock test di dalam bagian lombanya; detail artikel baru & gambar artikel ganda (slider)

**Diminta pemilik produk.**

- **Mock test masuk ke bagian lombanya.** Sebelumnya mock tampil sebagai bagian terpisah ("Mock Test …"), seolah
  bukan bagian dari olimpiade. Sekarang materi mock memakai `group` yang sama dengan kisi-kisinya, plus tanda
  katalog baru `mock: true`. Mock Z TK masuk ke EMC (Matematika), ESC (Sains), atau EEC (English); mock Y masuk ke
  KMSI di semua buku olimpiade. Di Library, setiap bagian lomba menampilkan subjudul **Kisi-kisi soal & topik**
  lalu **Mock test**. Kartu mock memakai ikon piala, dan judul bagian menampilkan "n materi · m mock test".
  Mock tetap `standalone`, jadi aturan kunci tidak berubah (`groupStartCodes` melewati topik mandiri).
- **Seed:** katalog yang pernah disunting admin juga mendapat `group`/`mock` baru untuk materi mock (judul lain
  tidak disentuh). Mock tetap ditaruh di akhir. Mock dikenali dari `mock: true`, atau dari judul lama "Mock Test …".
- **Papan peringkat mock di landing:** nama lomba diambil dari singkatan judul bagian (`competitionOf`): KMSI, EMC,
  ESC, EEC. Judul lama tetap dikenali. Urutan tab: KMSI, EMC · Matematika, ESC · Sains, EEC · English. Sebelumnya
  EMC, ESC, dan EEC digabung dalam satu tab "Olimpiade (gaya EMC)".
- **Gambar artikel ganda.**
  - Kolom baru `articles.image_ids` (jsonb, migrasi 0019, berisi sampul lama), maksimal 10 gambar.
  - Gambar pertama menjadi sampul (`cover_image_id` tetap diisi untuk kartu).
  - Admin dapat memilih atau menyeret banyak gambar sekaligus (JPG/PNG/WEBP ≤ 3 MB per gambar, ukuran dan rasio
    bebas), mengatur urutan, memilih "Jadikan sampul", dan menghapus gambar.
  - Gambar yang dilepas atau artikel yang dihapus → gambar dihapus bila tidak dipakai di tempat lain
    (`dropIfUnused` juga memeriksa `image_ids`).
- **Detail artikel `/artikel/:slug` dirombak.**
  - Header berisi label, judul, ringkasan, tanggal, perkiraan "n menit baca", dan tombol bagikan (WhatsApp, salin
    tautan).
  - Galeri `ArticleGallery`: satu gambar tampil besar; lebih dari satu tampil sebagai slider dengan panah,
    penanda n/total, thumbnail, geser jari, dan tombol panah keyboard. Gambar tampil utuh di atas latar buram,
    sehingga gambar potret maupun lanskap tetap rapi.
  - Lebar baca nyaman (720 px), kartu ajakan "Main sekarang", dan "Artikel lainnya" (3 terbaru).
  - Saat memuat tampil kerangka (skeleton). Pratinjau admin memakai galeri yang sama.
  - Ini halaman situs untuk orang dewasa, bukan area anak; tidak ada harga atau promosi.

## D-077 — Layar tunggu Momo yang hidup & katalog lebih ringan

Tanggal: 2026-10-08. Permintaan pemilik produk: layar "Momo sedang menyiapkan buku…" / "Momo belum bisa
mengambil buku" sering muncul dan terasa monoton.

- **Penyebab:** katalog (`GET /catalog`, seluruh bank soal) ±35 MB dikirim tanpa kompresi, diunduh ulang di setiap
  halaman anak (beranda, topik, latihan, pelajaran), tidak dicoba ulang saat gagal sesaat, dan salinan offline di
  localStorage (±5 MB) gagal tersimpan diam-diam.
- **Server:** katalog dikemas sekali per versi konten (jumlah & `updated_at` skill/katalog) × akses anak, dikompres
  gzip (35 MB → ±2,8 MB), diberi `ETag` + `Cache-Control: private, no-cache` (perangkat yang katalognya sama
  menerima 304 tanpa isi). Memakai `zlib` bawaan Node, tanpa dependensi baru.
- **Web:** satu unduhan dipakai bersama semua halaman (diperbarui paling cepat 3 menit sekali), coba ulang otomatis
  2× (1,5 dtk, 4 dtk; 4xx tidak diulang), tombol "Coba lagi", dan coba lagi otomatis saat internet tersambung.
  Salinan offline di localStorage bila muat, selain itu IndexedDB (`lc-store`, tanpa Dexie).
- **Layar tunggu (`MomoLoader`):** Momo melayang, buku terbang ke pelukannya, kalimat bergantian, bilah kemajuan
  lembut (tanpa angka & hitung mundur). Interaktif: ketuk Momo → melompat & menyapa (gelembung + suara), ketuk
  bintang → dikumpulkan & dihitung ("Bintang terkumpul: 2 dari 5"). Saat buku belum didapat: Momo mencari dengan kaca
  pembesar, pesan ramah (tanpa kata "salah/gagal", tanpa merah), tombol besar "Coba lagi"; pesan berbeda bila
  perangkat offline. Dipakai di beranda, topik, latihan, pelajaran, dan mock test (sebelumnya empat halaman itu
  tidak punya keadaan gagal sama sekali). `prefers-reduced-motion` mematikan animasi.

## D-078 — Game seru berlevel per buku (PAUD, TK, Kelas 1, Kelas 2 — Matematika, Sains, English PAUD)

Tanggal: 2026-10-08. Disetujui pemilik produk:

- Game baru: "Sortir keranjang, Neraca seimbang, Lompat kodok, Toko Momo", ditambah teka-teki silang bertema,
  angka/huruf yang hilang, tempel kata ke benda, puzzle, bianglala, hitung langkah, tema astronot, kucing, dan
  kendaraan.
- Letak: 1 topik di akhir buku.
- Cakupan: bertahap.
- Lanjutan dari pemilik produk: "game jangan sampai ada yang berulang tipenya dalam 1 topik".

**Topik `GM` "Game seru …"** ada di akhir buku, di bagian `Game · Game Seru Momo — …`. Topik ini `standalone`
(langsung terbuka, tidak mengunci topik lain) dan berisi 10 level. Aturan paket/level gratis sama dengan topik lain.

**Aturan: 10 level = 10 jenis game berbeda.**

- Jenis dihitung per mekanik yang dirasakan anak:
  - isi sampai pas (neraca / Toko Momo / truk / beri makan)
  - lompat (kodok / langkah)
  - urut (bianglala / roket)
  - kereta (angka/huruf hilang)
  - sortir
  - teka-teki silang
  - puzzle (susun / pilih kepingan)
  - labirin
  - kartu pasangan
  - tangkap (termasuk balon)
  - tempel label
  - cari kata
  - sambung titik
- Tidak ada level "tantangan campuran", karena isinya pasti mengulang jenis. Satu level boleh memakai beberapa
  bagian dari jenis yang sama (mis. sortir hewan + sortir siang/malam), supaya isinya bervariasi.
- Dicek dua kali: generator konten menolak buku dengan jenis kembar, dan test engine (`play.test.ts`) membuat soal
  dari semua topik GM di `content/` lalu memastikan setiap level satu jenis dan setiap topik punya 10 jenis berbeda.

**Isi per buku:**

| Buku          | 10 level (jenis berbeda)                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Math PAUD     | hewan lapar (isi), kereta angka, lompat kodok berhitung, bianglala angka, sortir bentuk, balon angka (tangkap), puzzle, labirin traktor angka, kartu angka ↔ benda, sambung titik                                                                            |
| English PAUD  | kartu huruf besar-kecil, kereta alfabet, tangkap animals, tempel kata, sortir animals/food/toys, cari kata, teka-teki silang hewan, bianglala number words, labirin astronot alfabet, puzzle hewan (nama English)                                            |
| Math TK       | Toko Momo, lompat tambah/kurang, kereta angka sampai 20, roket hitung mundur, sortir menggelinding, teka-teki silang angka, labirin astronot loncat dua, kartu soal ↔ hasil, puzzle pilih kepingan, tempel nama bangun datar                                 |
| Sains TK      | sortir (darat/air, hidup/tak hidup, siang/malam), kartu hewan ↔ rumah, tangkap sampah di laut, bianglala kecil → besar, labirin traktor menanam, teka-teki silang cuaca, puzzle hewan & tumbuhan, tempel nama benda langit, cari kata alam, beri makan hewan |
| Math Kelas 1  | lompat tambah/kurang sampai 20, kereta loncat 2/5/10, Toko Momo, bianglala sampai 100, sortir bangun datar/ruang, kartu penjumlahan sampai 20, teka-teki silang nama bilangan, labirin truk loncat lima, tangkap pasangan sepuluh, tempel nama bangun ruang  |
| Sains Kelas 1 | sortir bunyi/cahaya & panas/dingin, kartu hewan ↔ makanan, tangkap hewan bertelur, bianglala daur hidup & ukuran, labirin truk sampah, teka-teki silang luar angkasa, puzzle alam, tempel nama cuaca, cari kata hewan, kereta kata sains                     |
| Math Kelas 2  | sortir genap/ganjil, lompat loncat 10/5/3/4, neraca penjumlahan dua angka, bianglala sampai 1.000, kereta pola bilangan, kartu penjumlahan berulang, teka-teki silang bilangan, tangkap kelipatan lima, labirin koin dari terkecil, tempel waktu ke jam      |
| Sains Kelas 2 | sortir magnet & padat/cair, kartu hewan ↔ cara bergerak, tangkap benda yang mencair, bianglala ringan → berat, labirin robot magnet, teka-teki silang panas & dingin, puzzle benda, tempel sifat benda, cari kata sains, kereta kata benda                   |

**Tahap 3 (lanjutan, disetujui: "Semua, termasuk Olimpiade"):**

- Buku reguler Matematika Kelas 3, Sains Kelas 3, dan Sains Kelas 4.
- 14 buku Olimpiade (Matematika, Sains, English; TK, Kelas 1–2, 3–4, 5–6, SMP). Gamenya mengikuti kisi-kisi
  buku, mis.:
  - Matematika: FPB/KPK, pecahan ↔ desimal ↔ persen, bilangan prima/kuadrat/kubik, bilangan bulat negatif,
    bentuk aljabar, Fibonacci.
  - Sains: konduktor/isolator, perpindahan kalor, organ & organel sel, besaran pokok, unsur/senyawa/campuran,
    tata surya, metode ilmiah.
  - English: verb -ing/past, synonym/antonym, comparative, adverb, noun/verb, tenses.
- Total sekarang 26 buku × 10 level (+ 2 topik game Worksheet PAUD). Di buku Olimpiade, topik GM ada tepat sebelum mock test (mock tetap paling
  akhir, aturan seed D-076). Di layar, bagian "Game" tetap tampil paling bawah.
- **Level game tidak pernah menjadi sumber soal mock test** (`mockSources` melewati `usesGameFamily`) dan
  tidak dipakai di lomba live. Pengecualian yang sudah disetujui di D-075 tetap berlaku: labirin & cari kata
  Worksheet PAUD boleh dipakai di lomba.
- **Worksheet PAUD (D-075) dibuat comply:**
  - Topik "Game angka" (B) dan "Game huruf" (E) sebelumnya memakai labirin/kartu/tangkap 2–3 kali.
  - Level yang jenisnya sudah unik tidak diubah (B01–B03, B07, E01–E03, E06), sehingga id dan progres anak
    tetap.
  - Level lain diganti:
    - B: hewan lapar, lompat kodok, kereta angka, bianglala, sortir angka/huruf, sambung titik.
    - E: sortir gambar berawalan vokal, kereta vokal, bianglala a-i-u-e-o, puzzle, tempel huruf depan,
      teka-teki silang kata vokal.
  - Id lama yang diganti menjadi draft lewat seed (tidak tampil lagi).
- Engine tambahan:
  - Teka-teki silang dengan kata sendiri (`custom`, petunjuk boleh kata, mis. "kucing" → CAT).
  - Lompat kodok bilangan negatif (`signedWord`: "negatif tiga").
  - Label satu huruf.
  - Label & kartu pasangan tidak pernah memuat kata/gambar kembar.
  - Teks panjang di kartu, labirin, tangkap, dan bianglala tetap muat.
- Ketahanan: 280 level game (termasuk Worksheet) × 1.200 soal = 336.000 soal tanpa gagal; setiap level ≥ 16 soal
  unik per tingkat kesulitan.

**Poin soal: jawaban salah diterima dan dikurangi poin (lanjutan, disetujui "Poin per soal").** Sebelumnya
sebagian besar game memaksa anak terus mengetuk sampai benar (batas `maxSlips` 4–10), jadi hampir tidak pernah
salah.

- Setiap soal bernilai **10 poin**; setiap kekeliruan di game **−5 poin**.
  - Kekeliruan ke-2 membuat soal itu **salah (0 poin)**, dan game langsung lanjut ke soal berikutnya.
  - Benar setelah keliru sekali = 5 poin.
  - Soal kuis biasa tetap: benar 10, salah 0.
- Skor ronde = jumlah poin 10 soal (0–100). Lulus bila skor ≥ 70 **dan** tidak lebih dari 3 soal salah; selain itu
  gagal dan level diulang (`roundScore`, `roundPassed`).
- Game ketuk (labirin, cari kata, kartu pasangan, tangkap/balon, lompat, sortir, teka-teki silang, puzzle, sambung
  titik): kekeliruan dihitung dari ketukan di engine (`gameMistakes`, `gameOver`). Kelonggaran wajar:
  - Labirin & cari kata: keliru pertama tidak dikurangi (anak sedang menjelajah).
  - Kartu pasangan: dihitung keliru hanya bila pasangannya sudah pernah terlihat, atau kartu yang sama yang sudah
    diketahui bukan pasangannya dibuka lagi.
- Game tombol Selesai (neraca, Toko Momo, truk, kereta, label, bianglala/roket, beri makan, `isRetryGame`):
  - Jawaban keliru pertama → catatan "Belum pas. Betulkan jawabannya, ya. Poin soal ini jadi 5." dan anak boleh
    membetulkan.
  - Keliru kedua → salah.
- Tanpa kata "salah/gagal", tanpa nyawa, dan tanpa menampilkan sisa kesempatan. Titik ronde bernilai 5 poin
  tampil setengah hijau. Hasil ronde menampilkan "x dari 10 soal benar · y dari 100 poin".
- Server: perangkat mengirim `roundPoints`; server memeriksanya terhadap jumlah benar (5×benar ≤ poin ≤ 10×benar)
  dan memakainya sebagai skor. Perangkat lama tanpa `roundPoints` tetap dinilai dari persen benar. Mock test
  (`points`) dan lomba live tidak berubah.

**Mesin game (engine, dinilai dari ketukan; tanpa batas waktu dan tanpa nyawa):**

- Interaksi baru:
  - `sum`: neraca, toko, atau truk. Jumlah token harus tepat dan ≤ `maxTokens`. Neraca miring ke sisi yang lebih
    berat.
  - `hop`: papan batu zig-zag 5 per baris; anak mengetuk batu tempat mendarat.
  - `sort`: benda datang satu per satu, lalu dimasukkan ke 2–3 keranjang/truk.
  - `crossword`: teka-teki silang bergambar ber-seed (`buildCrossword`). Anak mengetuk gambar, lalu kartu huruf.
  - `jigsaw`: kepingan dipotong dari ilustrasi 100×100. Visual `puzzle` (gambar berlubang / satu kepingan) untuk
    "kepingan mana yang pas".
- Gaya tampilan baru (penilaian tidak berubah):
  - `order`: `ferris` (bianglala) dan `rocket` (hitung mundur).
  - `spell`: `train` (gerbong angka/huruf yang hilang).
  - `match`: `labels` (tempel kata).
  - `build`: `feed` + `eater` (beri makan hewan).
  - `maze`: `walker`, `goalVisual`, dan tanda bergambar.
  - `catch`: `scene` (langit, angkasa, laut, kebun).
- Family berbasis data (`families/fun.ts`): `sum-game`, `hop-game`, `sort-game`, `crossword-game`, `jigsaw-game`,
  `pairs-game`, `catch-game`, `train-game`, `label-game`, `wheel-game`, `feed-game`, `maze-game`, `word-hunt`.
  Isi game ditulis di JSON lewat `spec` gambar (object/shape/solid/numeral/word/coin/die + `say`). Untuk buku
  English, `say` diisi kata English agar dibacakan suara English.
- Tambahan tahap 2:
  - Gambar jam di JSON (`clock: "07:30"`).
  - Bianglala mode `sequence` (daur hidup, ringan → berat).
  - Kartu pasangan tidak pernah memuat dua kartu yang sama (mis. dua kartu "5").
  - Nama gambar puzzle bisa English (`names`).
  - Tema teka-teki silang `bilangan` dan `panas`.
- Variasi & ketahanan:
  - Setiap level ≥ 16 soal unik per tingkat kesulitan (sebagian besar ≥ 100), sehingga satu ronde tidak berisi soal
    kembar.
  - 120.000 soal acak (1.500 per level) dibuat tanpa gagal.
- Lomba live: semua game seru tidak dipakai (`CONTEST_UNSAFE_FAMILIES`), karena umpan balik tiap ketukan butuh
  kunci jawaban di perangkat.
- Suara: perintah baru `vo_cmd_sum`, `vo_cmd_hop`, `vo_cmd_sort`, `vo_cmd_crossword`, `vo_cmd_jigsaw`.
- Ilustrasi baru (buatan sendiri): traktor, roket, planet, astronot, kerang, benih, tunas.
- UX anak:
  - Target sentuh ≥ 64 px, semua lewat ketukan (tanpa drag).
  - Saat belum tepat, benda hanya bergoyang dan Momo mengajak mencoba lagi; tidak ada kata "salah"/"gagal" dan
    tidak ada merah besar.
  - Gerak dikurangi bila `prefers-reduced-motion`.

## D-079 — Berhitung PAUD P-MA-04…14: jari, urutan, pagi-siang-malam, dan pelajaran untuk topik yang sudah ada

Tanggal: 2026-10-08. Permintaan pemilik produk: lanjutkan P-MA-04 sampai P-MA-14 "comply dengan worksheet mengenal
angka 1–10", interaktif (angka diketuk → bersuara, menebalkan mengikuti titik sampai pola selesai baru benar), ada
game, dan "jangan berulang".

- **Unit BARU masuk Worksheet PAUD, bagian Numerasi · Berhitung** (sama seperti P-MA-01, D-068), setelah materi A:
  - **F Jari tangan dan angka (P-MA-04)**: family `fingers` (hitung jari, tunjukkan jari, tarik garis jari ↔ angka,
    lebih banyak/sedikit, gabung dua tangan, ketuk semua), menebalkan angka dengan hitungan jari
    (`numeral-trace` `countWith: "fingers"`), kartu pasangan jari ↔ angka, tantangan.
  - **G Pertama sampai kelima (P-MA-05)**: family `queue`, antrean hewan/kendaraan dibaca dari kiri (paling depan,
    ketuk urutan ke-n, ke berapa, dua urutan, di depan/di belakang, berapa di depannya, susun antrean), bianglala
    urutan, tantangan.
  - **H Pagi, siang, dan malam (P-MA-14)**: family `day-time` (kapan kegiatan, kegiatan di waktu itu, benda langit,
    urutkan waktu, sesudah/sebelum, rutinitas pagi & malam, urutan sehari), game sortir siang/malam dan tempel kata,
    tantangan. Hanya kegiatan yang waktunya jelas (bangun tidur = pagi, tidur = malam), supaya tidak ada jawaban
    ganda.
  - Satu level = satu bentuk soal; game hanya family game yang sudah ada (pasangan, sortir, tempel kata, bianglala,
    tangkap di tantangan), jadi otomatis tidak dipakai mock test maupun lomba (D-078).
  - Setiap level ≥ 16 soal unik per tingkat kesulitan (sebagian besar > 100). Gambar jari memakai tiga warna kulit,
    tangan kiri/kanan, dan pembagian dua tangan yang berbeda (7 = 5 + 2, 4 + 3, …), sekaligus mengenalkan susunan
    bilangan.
- **Unit "soal sudah ada" (P-MA-06…13)**: pelajaran "Belajar dulu" menempel di topik Math PAUD yang sudah ada,
  tanpa soal baru: K Membandingkan kelompok (P-MA-06), M Pola (P-MA-07), N Kata posisi (P-MA-08), P Bangun datar
  (P-MA-09), T Ukuran (P-MA-10), O Sama, beda, dan mengelompokkan (P-MA-11), V Penjumlahan sampai 5 (P-MA-12), U Uang
  Rupiah (P-MA-13).
- **Pelajaran lebih interaktif (skema `lesson` diperluas):** `kartuGambar` (kartu gambar bebas yang diketuk →
  dibacakan; memakai format `spec` game: benda, jumlah benda, bentuk, bangun ruang, koin, jari, posisi, ukuran),
  `antrean` (bendera "Depan", nomor urut muncul saat diketuk), `jari` (strip angka 1–10 dengan jari), `coba` mode
  `pilih` dan `urut` (tidak dinilai: tepat → pujian; belum tepat → kartu bergoyang + ajakan melihat lagi), dan kartu
  kata tanpa angka/huruf (mis. pa-gi). Pada "coba pilih/urut", kartu soal tampil kecil dalam panel, terpisah dari
  kartu pilihan.
- **Gambar baru (buatan sendiri):** tangan dengan jari (`fingers`), suasana pagi, siang, malam, anak bangun tidur,
  anak berangkat sekolah. `spec` mendapat `fingers`, `scale` (besar–kecil, panjang–pendek), dan `at`/`of` (posisi).
- **Seed untuk katalog yang pernah disunting admin:** pelajaran dari `content/` dimasukkan ke materi lama yang belum
  punya pelajaran (atau versinya lebih lama), dan materi baru disisipkan di posisinya menurut `content/` (bukan di
  akhir), supaya bagian dan rantai kunci sama. Isi suntingan admin lainnya tidak disentuh.
- P-MA-02, P-MA-03, dan uang kertas dilengkapi di D-081.

## D-080 — KMSI Final Provinsi Jatim 2026: Matematika Level 1–4 (materi Final, game Final, mock 25 soal)

Tanggal: 2026-10-08. Disetujui pemilik produk (jawaban: "Materi baru khusus Final", "1 topik game Final per buku",
"3 mock × 25 soal, tanpa KKM", "Tab terpisah KMSI Final Jatim 2026").

- **Ketentuan lomba:** Final Provinsi KMSI Jatim 2026, 25 soal; benar +4, salah 0, kosong 0 (maks. 100). Juara:
  nilai tertinggi → waktu pengumpulan tercepat → abjad nama peserta. Kisi-kisi Matematika:
  - **Level 1 (`sd12`)**: operasi bilangan, nilai tempat & lambang bilangan, waktu, bangun datar, bangun ruang,
    tabel & diagram, pola bilangan sederhana, aritmetika sosial.
  - **Level 2 (`sd34`)**: operasi bilangan, pecahan sederhana, bangun datar, bangun ruang, tabel & diagram,
    aritmetika sosial, pola & deret bilangan, teori bilangan sederhana.
  - **Level 3 (`sd56`)**: operasi bilangan, geometri, aritmetika sosial, pola–baris–deret, teori bilangan,
    persamaan, perbandingan, statistika sederhana.
  - **Level 4 (`smp79`)**: operasi bilangan, geometri, aritmetika sosial, pola–baris–deret, teori bilangan lanjutan,
    persamaan & pertidaksamaan, perbandingan, statistika & peluang.
  - Ejaan kisi-kisi dibakukan: "Aritmatika" → aritmetika, "Statiska" → statistika.
- **Materi baru, bukan memakai ulang Penyisihan (D-074):** bagian (`group`) **"KMSI · Kompetensi Matematika Sains
  dan Bahasa Inggris — Final Provinsi Jatim 2026"**, materi **FA–FH** (urut kisi-kisi) × 10 level, semua
  `standalone`. Pola level sama dengan Penyisihan (1–3 konsep, 4–7 penerapan & soal cerita, 8 sulit, 9 teka-teki
  Final KMSI (bank soal), 10 tantangan campuran), tingkat soal final. Tabel & diagram dan statistika memakai
  gambar `table` / `bar-chart`; waktu memakai jam. Materi Penyisihan, GM, dan Y tidak berubah.
- **Game Final (`GF`, "Game Final KMSI matematika")** di bagian Final, 10 level = 10 jenis game berbeda (aturan
  D-078: isi, lompat, urut, kereta, sortir, kartu, silang, labirin, tangkap, label), isinya dari materi Final (setiap
  FA–FH minimal sekali). Seperti GM: tidak masuk mock test maupun lomba live; test `play.test.ts` kini juga
  memeriksa topik `GF`.
- **Mock test Final (`FY`)**: 3 mock per buku, 25 soal (9 mudah / 8 sedang / 8 sulit dari level 1–3 / 4–7 / 8–10),
  `categories` FA–FH, `points` `KMSI_POINTS`, **tanpa `passPoints`** (Final tidak memakai KKM; status selesai memakai
  batas skor biasa seperti mock EMC). Akses sama dengan D-073 (Mock 1 gratis sekali, Mock 2–3 & mengulang
  Premium). Stopwatch tanpa batas; acuan 60 menit hanya informasi (lama lomba Final belum diberikan).
- **Papan peringkat:** `competitionOf` mengenali keterangan bagian "— Final Provinsi …" → lomba **"KMSI Final"**
  (tab sendiri di landing, label "KMSI Final Jatim 2026", setelah "KMSI 2026"), jadi chip Mock test 1–3 tidak
  kembar dengan mock Penyisihan. "Penyisihan Final Provinsi" (EMC/ESC) tetap EMC/ESC. Baris aturan KMSI tanpa KKM:
  "25 soal · benar 4, salah 0, kosong 0 · poin maksimal 100 · juara: poin tertinggi, lalu waktu tercepat".
  `rankMockBoard(rows, { byName: true })` dipakai untuk KMSI Final: poin & waktu sama → abjad nama panggilan yang
  menentukan, tanpa posisi kembar (lomba lain tetap posisi sama).
- **Kode materi:** `FA`–`FH` materi, `GF` game, `FY` mock (bukan `FG` untuk game, karena `FG` = materi ke-7).
  Katalog yang pernah disunting admin mendapat materi baru di posisinya lewat `mergeNewCategories` (D-079); mock
  tetap paling akhir.
- **Belum dikerjakan:** Sains dan English Final Jatim (kisi-kisinya belum diberikan), dan Level A (TK) bila ada.
- Contoh soal lomba hanya acuan bentuk; semua soal, kalimat, dan gambar dibuat sendiri (PRD A17).

## D-081 — Melengkapi PAUD: lihat sekilas, Bilangan 6–10, uang kertas, dengar bunyi, dan garis pramenulis

Tanggal: 2026-10-08. Permintaan pemilik produk: "lengkapi semua yang tadi diminta sampai selesai" — sisa P-MA-02,
P-MA-03, uang kertas, dan tahap Baca Tulis yang ditunda di D-075 (P-BT-01 sampai 03).

- **Worksheet PAUD** (urutan materi kini mengikuti nomor unit):
  - Numerasi · Berhitung: A (P-MA-01), **I Lihat sekilas 1 sampai 5 (P-MA-02)**, F, G, H, B (game).
  - Literasi · Baca Tulis: **J Dengar bunyi di sekitarku (P-BT-01)**, **K Garis tegak dan mendatar (P-BT-02)**,
    **L Garis lengkung, lingkaran, dan zig-zag (P-BT-03)**, C, D, E (game).
  - Setiap materi baru punya pelajaran "Belajar dulu" dan 10 level (≥ 16 soal unik per tingkat kesulitan).
- **Lihat sekilas (P-MA-02)**, family `subitize`: titik dengan berbagai susunan, mata dadu berwarna, dan bingkai lima
  tampil sebentar (`peek`, mis. 2 detik), lalu ditutup kartu "?". Tombol "Lihat lagi" membukanya kembali berapa kali
  pun, jadi tidak ada batas waktu menjawab (PRD A17). Ada juga lebih banyak, cocokkan titik ↔ angka, ketuk semua,
  game kartu pasangan dadu ↔ angka, dan tangkap dadu.
- **Dengar bunyi (P-BT-01)**, family `sound`: bunyi ditirukan suara Momo (onomatope Indonesia: kukuruyuk, tin tin,
  dung dung). Ada tebak hewan/kendaraan/benda, cocokkan gambar ↔ bunyi, sama atau beda, mana yang berbunyi, game
  sortir bunyi, dan tangkap kendaraan. Soal dengar tetap punya petunjuk tertulis untuk orang dewasa (D-047).
- **Garis pramenulis (P-BT-02/03)**: 11 goresan baru di `glyphs.ts` (tegak, mendatar, miring, tambah, pagar, tangga,
  lengkung, lingkaran, zig-zag, gelombang, spiral; arah seperti buku menulis PAUD). Family `stroke-trace` (tebalkan;
  benar setelah polanya selesai) dan `stroke-find` (mana garisnya / benda ini seperti garis apa). Level tebal dibuat
  "tebalkan dan kenali": sebagian besar menebalkan garis target, diselingi mengenali, supaya ronde tidak monoton.
  Gambar contoh hanya yang jelas bentuknya (hujan = tegak, gunung = zig-zag, ombak = gelombang, siput = spiral).
  Game: sortir tegak/mendatar, sortir lurus/lengkung, kartu pasangan gambar ↔ garis.
- **Pelajaran Math PAUD:** P-MA-03 "Bilangan 6 sampai 10" di topik E. Pelajaran Uang Rupiah (P-MA-13) versi 2 menambah
  layar **uang kertas** Rp2.000, Rp5.000, dan Rp10.000. Visual `note` digambar sendiri (warna per nilai + nominal),
  bukan salinan desain uang asli.
- Visual baru `glyph` (gambar garis) dan `note` (uang kertas). `spec` mendapat `glyph` dan `note`, pelajaran mendapat
  `garis` (coba tebal garis), dan layar `bunyi` boleh memakai kartu gambar.
- **Soal dengar:** sidik jari soal (`itemKey`) untuk soal yang isinya hanya lewat suara kini ikut menghitung kalimat
  yang diucapkan. Sebelumnya "sama atau beda bunyinya" dianggap satu soal yang sama.
- 5 level huruf vokal D-075 (C01, C04, C06, D01, D04) versi 2: tingkat mudah lebih bervariasi (huruf besar/kecil,
  2–3 pilihan).

## D-082 — Topik bebas dipilih (tidak harus berurutan)

**Tanggal:** 2026-10-08 · **Status:** Disetujui (pemilik produk)

- **Masalah:** anak yang membuka topik ke-2 sebelum topik ke-1 melihat semua levelnya terkunci, dan pesan yang
  tampil malah "Level 4 ke atas khusus akun Premium". Pesan itu keliru, karena yang mengunci adalah urutan topik.
- **Keputusan:** di semua buku, Level 1 setiap topik terbuka sejak awal. Anak boleh memilih topik mana saja dan
  mengerjakan beberapa topik bersamaan. Di dalam topik, level tetap berurutan: Level n+1 terbuka setelah Level n
  lulus. Mock test (D-072) tetap tidak saling mengunci, dan level berbayar tetap diatur paket (D-036/D-041).
- **Saran tanpa mengunci:** topik terbuka pertama di urutan buku diberi label **"Disarankan"** di beranda. Topik
  mandiri (D-068) tetap dilewati untuk anak yang sudah bermain di topik biasa. "Langkah berikutnya" di laporan
  orang tua memakai aturan yang sama.
- **Server:** kunci level di `/practice/sync` memakai aturan yang sama. Level 1 topik mana pun diterima, sedangkan
  Level 2+ yang belum dibuka tetap ditolak.
- Aturan rantai antar-topik (D-026/D-068/D-075, `groupStartCodes`) dihapus. Pesan "Terkunci — lulus Level 1
  materi sebelumnya dulu" juga tidak dipakai lagi.

## D-083 — Latihan menulis angka 1–10 dan huruf a–z (Worksheet PAUD)

**Tanggal:** 2026-10-08 · **Status:** Disetujui (pemilik produk: "semuanya, angka 1–10 serta huruf a–z secara
berkala")

- **7 topik baru**, masing-masing 10 level dan pelajaran "Belajar dulu". Semua level Basic, tanpa teks yang wajib
  dibaca, dan setiap level punya paling sedikit 10 soal berbeda.
  - Numerasi: **M** Menulis angka 1 sampai 5 (P-MA-15) dan **N** Menulis angka 6 sampai 10 (P-MA-16).
  - Literasi: **O** Menulis huruf vokal besar dan kecil (P-BT-12), lalu huruf berurutan abjad: **P** b, c, d, f, g
    (P-BT-13) · **Q** h, j, k, l, m (P-BT-14) · **R** n, p, q, r, s (P-BT-15) · **S** t, v, w, x, y, z (P-BT-16).
  - Unit rencana P-BT-09 "Huruf bibir b, m, p" sudah tercakup di P/Q/R. Barisnya dibiarkan di blueprint sampai
    diputuskan digabung.
- **Pola level:** tebalkan dengan garis tebal → titik-titik → tanpa gambar; dengar lalu ketuk; huruf depan gambar;
  huruf besar; pasangan besar-kecil; balon; game tangkap huruf & kartu pasangan; tantangan di Level 10. Untuk
  angka, gambar hitungan bergantian: benda, jari, mata dadu (≤ 6), bingkai sepuluh, dan titik.
- **Engine:**
  - Goresan bernomor untuk 21 konsonan kecil & besar (total 52 huruf). Huruf berekor (g j p q y) badannya dinaikkan
    supaya ekornya muat di kotak 140.
  - `letter-trace`, `letter-find`, `letter-tap-all`, `memory-pairs`, dan `catch-items` menerima huruf a–z.
  - `guide: 'mixed'` untuk huruf & angka, dan `countWith` baru di `numeral-trace`: `die`, `frame`, `dots`, `mixed`.
- **Kata bergambar** konsonan (`CONSONANT_WORDS`) memakai gambar yang sudah ada. Huruf **f, q, v** belum punya
  gambar, jadi ditebalkan dan dikenali tanpa gambar. Usulan gambar ada di `docs/blueprint/gambar-kurang.csv`.
- **Perbaikan:** di game tangkap huruf, pengisi b/m/s tidak lagi bisa sama dengan huruf yang dicari.
- **Kalimat soal:** "Tebalkan huruf b, seperti bebek." Huruf tidak lagi diletakkan di awal kalimat, karena tampilan
  mengubah awal kalimat menjadi huruf besar ("B untuk bebek").

## D-084 — KMSI Final Provinsi Jatim 2026: Sains Level 1–4 (soal & game bervariasi)

Tanggal: 2026-10-08. Permintaan pemilik produk: lanjutan Final Jatim untuk Sains Level 1–4, "soal per topik hingga
level 10, mock test dan game … game yang berbeda-beda sesuai topik, jangan yang itu-itu saja, begitupun soalnya".
Pola mengikuti D-080 (materi baru, 1 topik game Final per buku, 3 mock × 25 soal tanpa KKM, tab "KMSI Final").

- **Kisi-kisi (9 materi per jenjang, kode FA–FI):**
  - **Level 1 (`sd12`)**: makhluk hidup; hewan, tumbuhan, dan adaptasi; tubuh dan kesehatan; benda dan perubahan
    wujud; pengukuran dan suhu; gaya, gerak, energi, dan pemanfaatannya; bunyi dan cahaya; lingkungan, cuaca, dan
    sumber daya alam; bumi dan tata surya. Daftar asli memuat "Bunyi dan cahaya" dua kali dan baris salinan
    "Lingkungan, gerak, energi dan pemanfaatannya"; dirapikan menjadi 9 materi (sama banyak dengan Level 2–4).
  - **Level 2 (`sd34`)**: gaya, tekanan, dan energi; cahaya, bunyi, dan gelombang; sel dan sistem kehidupan; struktur
    dan proses kehidupan tumbuhan; keanekaragaman, klasifikasi, dan perkembangbiakan; ekosistem dan lingkungan; materi,
    perubahan materi, dan campuran; bumi dan antariksa ("antartika" di daftar asli = salah ketik); energi dan teknologi.
  - **Level 3 (`sd56`)**: makhluk hidup & sistem kehidupan; ekosistem & lingkungan; gaya, gerak & energi; pesawat
    sederhana; cahaya dan bunyi; materi dan perubahannya; bumi dan antariksa; tekanan, massa jenis, dan fluida; energi
    alternatif.
  - **Level 4 (`smp79`)**: makhluk hidup & sistem kehidupan; genetika & bioteknologi; mikrobiologi; tumbuhan & ekologi;
    mekanika & gerak; suhu, kalor & gelombang; cahaya, listrik & kemagnetan; materi & atom; bumi & antariksa.
- **Soal tidak itu-itu saja:** Penyisihan Sains memakai `facts` di hampir semua level. Di Final, setiap level dalam
  satu materi punya bentuk soal dan sub-topik berbeda: 1 fakta (tanya nilai), 2 fakta (tanya nama, tabel lain),
  3 "ketuk semua yang benar", 4 fenomena sehari-hari berkonteks Jawa Timur (Bromo, Semeru, Kenjeran, garam Madura,
  Lumpur Sidoarjo, Paiton, …), 5 benar/salah atau mana yang berbeda (tabel ketiga), 6 membaca data tabel/diagram
  batang, 7 hitungan (`expr`: suhu, kecepatan, tekanan, massa jenis, kalor, Ohm, …) atau merancang percobaan,
  8 sebab-akibat, 9 teka-teki Final KMSI, 10 tantangan campuran. Soal tidak mengulang soal Penyisihan, dan skrip cek
  menolak kalimat soal kembar antar-level dalam satu buku.
- **Game berbeda per jenjang & sesuai topik:** tiap buku 10 jenis berbeda (aturan D-078), dengan kombinasi jenis yang
  berbeda antar-jenjang (Kelas 1–2 tanpa kereta & cari kata, Kelas 3–4 tanpa urut & puzzle, Kelas 5–6 tanpa isi &
  silang, SMP tanpa lompat & label) dan tema yang berbeda dari GM buku itu maupun game Final Matematika. Contoh: beri
  makan hewan, termometer naik/turun, terapung–tenggelam, induk–anak hewan, planet dari Matahari (Kelas 1–2);
  rantai makanan, kelompok hewan, jalan cahaya periskop (Kelas 3–4); massa jenis, pesawat sederhana, rantai energi
  pembangkit (Kelas 5–6); resultan gaya, tingkat genetik, jalan udara pernapasan, unsur logam (SMP).
- **Engine:** `hop-game` mendapat `prompt`/`say`/`reteach` opsional (isian `{start} {n} {step} {end} {list}`; di
  suara angka dibacakan sebagai kata). Dengan kalimat tema, gambar persamaan "start + n" tidak ditampilkan (n = menit/
  detik, bukan angka yang dijumlah). Dipakai game termometer & jarak per detik; game kodok lama tidak berubah.
- **Mock:** 3 × 25 soal per buku dari FA–FI, benar 4 / salah 0, tanpa KKM; masuk tab "KMSI Final" (D-080). Soal
  "ketuk semua" (level 3) boleh muncul di mock sebagai soal mudah.
- Kebenaran fakta diperiksa per contoh soal; fakta yang ambigu sengaja dihindari (mis. jumlah satelit planet,
  kelas tuas stapler, "bulu" kelinci — dibedakan "bulu unggas" dan "rambut (mamalia)"). Data percobaan/pengamatan di
  level 6 adalah data rekaan. Soal & kalimat dibuat sendiri (PRD A17).
- Belum: English Final Jatim (kisi-kisi belum diberikan), Level A (TK).

## D-085 — KMSI Final Provinsi Jatim 2026: English Level 1–4

Tanggal: 2026-10-08. Permintaan pemilik produk: lanjutan Final Jatim untuk English Level 1–4 dengan aturan yang sama
seperti Sains (D-084): 10 level per topik, mock test, game yang berbeda-beda sesuai topik, soal tidak itu-itu saja.
Pola D-080 (materi baru, 1 topik game Final per buku, 3 mock × 25 soal tanpa KKM, tab "KMSI Final").

- **Kisi-kisi (10 materi per jenjang, kode FA–FJ, judul English seperti kisi-kisi; "dan" dibakukan "and"):**
  - **Level 1 (`sd12`)**: Numbers and Math; Animals and Family; Vocabulary and Synonym; Daily Activities and Habits;
    Simple Present Tense; Present Continuous Tense; Prepositions and Places; Sentence Arrangement and Grammar; Reading
    Comprehension; Stories, Fables, Legends, and Proverbs.
  - **Level 2 (`sd34`)**: Vocabulary; Noun, Pronoun, Adjective, and Adverb; Animals, Family, Places, and Things; Daily
    Activities and Expressions; Simple Present, Simple Past, and Present Continuous; Future Activities; Sentence
    Arrangement and Grammar; Reading Comprehension; Descriptive and Biography Text; Notice, Table, and Data Reading.
  - **Level 3 (`sd56`)**: Vocabulary; Noun, Pronoun, and Parts of Speech; Grammar and Sentence Structure; Tenses; Modal
    and Expression; Descriptive and Recount Text; Narrative Text; Reading Comprehension; Functional Text and Dialogue;
    Sentence Arrangement and Language Use.
  - **Level 4 (`smp79`)**: Vocabulary and Word Meaning; Synonym, Antonym, Idiom, and Proverbs; Parts of Speech and Word
    Formation; Grammar and Sentence Structure; Tenses and Verb Patterns; Passive Voice, Relative Pronoun, and
    Conjunction; Gerund, Infinitive, and Conditional Sentence; Reading Comprehension and Text Interpretation;
    Conversation and Speaking Expressions; Data Reading and General Knowledge.
- **Soal tidak itu-itu saja:** Penyisihan English mengulang bentuk (bahkan soal yang sama di level 1 dan 2). Di Final
  setiap level satu bentuk: 1 pemanasan (sebagian bergambar), 2 kalimat rumpang, 3 "ketuk semua", 4 kata/kalimat yang
  kurang tepat, 5 makna & relasi kata, 6 membaca notice/tabel/diagram/teks (jenis pertanyaan bervariasi), 7 dialog
  berkonteks Jawa Timur, 8 susun/ubah kalimat, 9 teka-teki Final KMSI, 10 tantangan campuran. Materi bacaan memakai
  jenis teks berbeda di tiap level. Tidak ada kalimat soal kembar antar-level maupun dengan Penyisihan. Narasi dibaca
  suara Indonesia, kartu pilihan suara English (D-062).
- **Game:** 10 jenis per buku, satu jenis per materi, dan pasangan jenis–materi berbeda di tiap jenjang. Game
  berbasis materi Final (grammar, tenses, ungkapan, bacaan), bukan kosakata hewan/warna seperti GM English. Contoh:
  label number words (Kelas 1–2), sortir noun/adjective/adverb dan labirin kata kerja lampau (Kelas 3–4), tangkap
  past participle dan kereta kata penghubung recount (Kelas 5–6), kartu idiom ↔ makna dan tangkap verb + gerund
  (SMP). Jenis isi & lompat tidak dipakai di English karena kalimatnya berbahasa Indonesia dan tidak melatih English.
- **Game urut kalimat** (`wheel-game` sequence) selalu memakai SEMUA potongan kalimat (`count` = jumlah potongan),
  karena mode sequence mengambil sebagian item; untuk cerita, sebagian peristiwa tetap urut.
- Mock: 3 × 25 soal per buku dari FA–FJ, benar 4 / salah 0, tanpa KKM. Teks bacaan, cerita, dan biografi rekaan
  dibuat sendiri; fabel/legenda domain publik diceritakan ulang (PRD A17).

## D-086 — KMSI Final Provinsi Jatim 2026: Level A (TK) — Matematika, Sains, English

Tanggal: 2026-10-08. Permintaan pemilik produk: Final Jatim untuk TK, "comply dengan yang sudah ada", 10 level, mock
test, dan game sesuai topik. Pola D-080/D-084/D-085 di buku `tkosn` (TK (Olimpiade)), tier `basic`.

- **Kisi-kisi Level A (4 materi per mapel, kode FA–FD):**
  - **Matematika**: tambah & kurang dengan gambar; mengurutkan bilangan ratusan; membandingkan bilangan ratusan dan
    jumlah mata dadu dengan <, >, = (tanda dibacakan "lebih dari / kurang dari / sama dengan"); bentuk bangun datar.
  - **Sains**: transportasi, alat kebersihan, dan benda alam; berkembang biak, makanan, dan gerak hewan; bagian tubuh
    dan fungsinya; manfaat api dan air.
  - **English**: animals, weather, body, fruits & vegetables; classroom, bathroom & everyday things; shapes; he/she/it
    & daily conversation (instruksi Bahasa Indonesia, kata English dibacakan suara English — D-062/D-071).
- **Aturan TK:** setiap soal dibacakan, pilihan bergambar/angka/tanda singkat dengan suara, maks 4 pilihan. Bentuk soal
  per level berbeda: kenali (dengar–ketuk), sebutkan, ketuk semua, pasangkan, mana yang berbeda, hitung/bandingkan,
  urutkan/lengkapi huruf, soal cerita bergambar berlatar Jawa Timur, teka-teki Final, tantangan campuran. Tidak ada
  kalimat soal yang sama dengan materi lain di buku `tkosn` (Penyisihan, OSN, EMC/ESC/EEC).
- **Game GF** (10 jenis berbeda, setiap materi ≥ 2 game, tema beda dari GM tkosn), mis. Matematika: beri makan
  (tambah), turun tangga (kurang), roket ratusan, labirin ratusan, sortir lebih/kurang dari 500, tangkap dadu, kartu
  dadu ↔ benda, silang banyak sisi, tempel nama bentuk ke benda nyata, puzzle benda berbentuk bangun. Sains: sortir
  alami/buatan, tangkap benda alam, cari kata kendaraan, kartu hewan ↔ cara bergerak, labirin hewan bertelur, daur hidup,
  label & kereta bagian tubuh, silang api & air, lompat liter air di ember. English: tangkap vegetables, kartu weather,
  puzzle hewan, cari kata classroom, kereta benda toilet, silang benda rumah, labirin & urut shapes, sortir he/she/it,
  label keluarga. Sambung titik tidak dipakai di Matematika karena gambarnya bawaan (layangan, rumah) dan tidak melatih
  bangun datar; diganti tempel nama bentuk ke benda nyata (jam dinding/piring → lingkaran, roti lapis → segitiga,
  jendela → persegi; label maks 12 huruf, jadi "persegi panjang"/"belah ketupat" tidak dipakai di game ini). Tomat
  tidak dipakai di soal/game kelompok sayur–buah (ambigu).
- **Mock FY:** 3 × **25 soal** (ketentuan Final: 25 soal; Penyisihan Level A 20 soal), 9/8/8 dari FA–FD, benar 4 /
  salah 0, tanpa KKM, tab "KMSI Final".

## D-089 — Pelajaran interaktif (Video Momo, jelajah, bacaan), game "ketuk di wajah", dan game lama Worksheet PAUD dikembalikan

**Tanggal:** 2026-10-08 · **Status:** Disetujui (pemilik produk; contoh pertama di Sains TK Olimpiade "Tubuhku dan
pancaindra")

- **Game lama Worksheet PAUD dikembalikan.** D-078 mengganti 12 level di "Game angka" (B) dan "Game huruf" (E)
  lalu menjadikan id lamanya draft. Pemilik produk masih membutuhkannya, jadi kedua topik versi sebelum D-078
  dikembalikan utuh (10 level masing-masing) sebagai topik mandiri baru, di samping topik B/E yang sekarang:
  - **T** "Labirin dan kartu angka", tepat setelah B;
  - **U** "Labirin dan kartu huruf", tepat setelah E.
    Id-nya baru (`worksheet.prek.t…`/`u…`), jadi id lama tetap draft. Aturan D-078 "satu jenis game sekali per topik"
    tetap berlaku untuk topik B/E; T/U sengaja memakai labirin, kartu, dan tangkap berulang seperti dulu.
- **Layar pelajaran baru** (`lessonSchema`), semuanya dari data dan gambar sendiri, jadi tetap offline:
  - `tonton` — **Video Momo**: 2–8 adegan. Tiap adegan berisi gambar bergerak (muncul/zoom/goyang/geser/denyut),
    teks besar, dan narasi Momo, lalu pindah otomatis setelah narasi. Ada tombol putar/jeda/ulang,
    sebelum/berikutnya, dan titik adegan. Video MP4/YouTube dari luar **tidak** dipakai di area anak
    (iklan/rekomendasi, kuota, offline).
  - `jelajah` — gambar wajah besar. Anak mengetuk mata, telinga, hidung, lidah, dan tangan/kulit; bagian itu disorot
    dan dibacakan, contoh bendanya muncul, dan ada hitungan "n dari 5 sudah kamu jelajahi".
  - `baca` — bacaan interaktif: kalimat bergambar diketuk untuk didengar; "Bacakan semua" menyorot kalimat satu per
    satu.
- **Visual baru:** `sense` (ikon alat indra) dan `face` (wajah anak + tangan, alat indra disorot). Di spec gambar
  JSON: `{ "sense": "mata" }` dan `{ "face": "hidung" | "semua" }`.
- **Game visual baru `sense-tap` ("ketuk di wajah"):** alat indra diketuk langsung pada gambar wajah besar.
  - Mode: kegiatan bergambar → indranya, nama alat indra, atau kegunaannya.
  - Interaksinya tetap `pick-one` dengan susunan baru `face`, jadi penilaian, lomba (`publicItem`), dan laporan
    tidak berubah.
  - Target sentuh 64–72 px dan tidak saling menimpa. Keliru ditandai oranye lembut, bukan merah besar.
- **Contoh pertama — Sains TK (Olimpiade), topik A "Tubuhku dan pancaindra" (unit K-SA-12):**
  - Pelajaran 6 layar: Video Momo 7 adegan → jelajah wajah → bacaan 6 kalimat → 2 coba pilih → ingat.
  - Level 1 dan Level 10 (versi 4) kini juga berisi game ketuk di wajah.
- Ilustrasi contoh dari pemilik produk (buku pelajaran, lembar kerja merek lain) hanya dipakai sebagai gaya
  rujukan. Gambar, kalimat, dan soalnya dibuat sendiri (PRD A17).
- **Rencana game visual berikutnya** (belum dibuat, menunggu prioritas):
  - tebalkan garis pada gambar (rambut, hujan, ubur-ubur, siput);
  - pasangkan dengan garis (bangun datar ↔ benda);
  - koordinat pada kotak-kotak;
  - hitung sisi & sudut.

## D-090 — Setiap topik punya penjelasan "Belajar dulu" dengan Video Momo (pelajaran otomatis)

**Tanggal:** 2026-10-08 · **Status:** Disetujui (pemilik produk: "implementasi untuk semua topik … semua mempunyai
penjelasan dengan video")

- Sebelumnya hanya 27 dari 222 topik PAUD/TK/TK Olimpiade yang punya pelajaran. Menulis 195 pelajaran manual tidak
  realistis dan cepat basi saat level disunting. Karena itu pelajaran dibuat **otomatis dari data topik** (fungsi
  murni `lessonFor`/`autoLesson` di engine, seed tetap). Hasilnya selalu sesuai isi level dan ikut berubah bila
  admin menyunting.
- **Isi pelajaran otomatis:**
  - **Video Momo**, berisi:
    - pembuka: judul dan intro topik;
    - **2–3 contoh soal dari level topik itu, dari mudah ke sulit.** Soal asli tampil tanpa bisa diketuk dan
      dibacakan, lalu jawabannya disorot ("Ini jawabannya") dan dijelaskan dengan penjelasan soal (`reteach`).
      Game, labirin, dan tebalkan tampil sebagai "cara bermain" dengan papan aslinya;
    - tips topik, lalu penutup.
  - **Bacaan interaktif:** kalimat intro + tips.
  - **Coba satu soal tanpa nilai:** Momo menjelaskan bila keliru; ada tombol "soal lain".
  - **Ingat:** ringkasan tips.
- **Pelajaran manual tetap dipakai.** Bila belum punya video, Video Momo otomatis ditambahkan di depannya.
  Topik Mock Test tidak berpelajaran.
- **Berlaku untuk semua buku.** Fungsinya umum, jadi buku SD juga mendapat "Belajar dulu" otomatis.
- **Skema:** adegan video boleh berisi `contoh` ({level, seed}) atau `visual`, atau tanpa gambar (Momo tampil
  besar). Layar `coba` mendapat mode `soal`.
- **Pemeriksaan rutin:** `validate:content` (CI) kini memeriksa setiap topik punya pelajaran dengan Video Momo,
  semua layarnya valid, dan ≥ 2 contoh soal yang bisa dibuat. Hasilnya 725 topik di semua buku lolos.
- **Responsif:**
  - Kartu "Lanjutkan permainan" boleh melipat, sehingga teks tidak terjepit satu kata per baris di iPad.
  - Kontrol video tidak melebar di HP.
  - Nama anak di header boleh dua baris sebelum dipotong.
  - Audit otomatis membuka setiap topik dan setiap layar pelajaran di lebar 390 (HP) dan 810 (iPad) untuk mencari
    elemen yang keluar layar, terpotong, atau terjepit.

## D-087 — Suara Momo lebih natural: gaya bicara manusia per jenjang & naskah ucapan

Tanggal: 2026-10-08. Permintaan pemilik produk setelah audit suara: "agar audionya terasa lebih natural, seperti suara
manusia normal, bukan robot dan kaku" — dikerjakan butir 2 (gaya & kecepatan) dan 3 (naskah ucapan).

- **Gaya bicara (Gemini-TTS):** arahan lama "Kamu Momo, **robot** sahabat anak…" membuat model meniru suara robot.
  Arahan baru menggambarkan pembaca manusia (kakak/guru perempuan yang ramah, santai seperti mengobrol, intonasi
  wajar, jeda di koma/titik, nada bertanya pada pertanyaan, "jangan terdengar seperti robot/mesin/penyiar"). Nama
  Momo tetap di aplikasi.
  - Satu gaya per jenjang dari id skill (`voiceStageOf`): **TK** (PAUD/TK/TK Olimpiade, sedikit lebih pelan:
    kecepatan admin − 0,05), **SD**, **SMP** (tidak kekanak-kanakan). English: gaya guru English yang natural;
    English Pra-TK/TK: narasi Indonesia + lafal British English (tanpa "robot").
  - Kalimat Momo umum (perintah, pujian, skor) memakai gaya admin; bawaan baru `VOICE_STYLE_DEFAULT`, kecepatan
    bawaan **1,0** (sebelumnya 0,95 + "pelan" ganda → terseret).
  - Pengaturan tersimpan yang masih memakai gaya bawaan lama dinaikkan otomatis saat dibaca
    (`upgradeVoiceSettings` di `SettingsService`); gaya yang sudah disunting admin tidak disentuh.
- **Naskah ucapan (`speechText`, engine):** teks soal ditulis untuk dibaca, dan ±9,5% kalimat yang dibacakan berisi
  simbol (…, _**, +, =, Rp12.500, 3/4, °C, cm², (lambat)) yang dibaca kaku/dilewati mesin suara. Sebelum dikirim ke
  TTS (dan ke suara cadangan browser), teks diubah menjadi kalimat lisan: "10 + 9 = …" → "10 ditambah 9 sama dengan
  titik-titik", "Rp5.500.000" → "lima juta lima ratus ribu rupiah", "64 cm²" → "64 sentimeter persegi", "pukul 07.00" →
  "pukul tujuh", "(−7)" → "negatif 7", "slow (lambat)" → "slow, lambat", "tanda >" → "tanda lebih dari", English
  "**_" → "blank". Angka biasa tetap angka. Hasil: 0 dari 18.421 kalimat yang dibacakan masih bersimbol.
- **Klip:** kunci klip dihitung dari naskah ucapan + gaya + kecepatan, jadi semua klip dibuat ulang otomatis saat
  pertama diputar (atau `pnpm voice:generate`); teks asli tetap disimpan di `voice_clips.text`.
- **Model bawaan: Chirp 3 HD** (`chirp3-hd`, disetujui pemilik produk setelah mendengar contoh). Gemini-TTS lewat
  Text-to-Speech API butuh Agent Platform API **dan** kunci yang terikat service account (kunci biasa ditolak:
  `aiplatform.endpoints.predict` denied), sedangkan Chirp 3 HD jalan dengan API key biasa dan terdengar natural
  (30 suara id-ID, termasuk Leda). Permintaan Chirp: nama suara `id-ID-Chirp3-HD-<suara>` / `en-GB-…` tanpa
  `modelName` dan tanpa `prompt` (Google menolak arahan gaya untuk Chirp: "Prompt is only supported for Gemini
  TTS"), jadi gaya per jenjang hanya berlaku bila admin memilih model Gemini; kecepatan per jenjang & naskah ucapan
  tetap berlaku. Admin bisa memilih model dari daftar (`VOICE_MODELS`). Pengaturan admin tersimpan yang masih
  memakai model Gemini tidak diubah otomatis — ganti modelnya di Admin → Suara Momo.
- Belum: uji A/B beberapa suara Chirp, nada suara browser (pitch 1,1), dan polesan audio.

## D-088 — Simulasi interaktif bergambar foto realistis, suara Chirp untuk pelajaran

Tanggal: 2026-10-08. Disetujui pemilik produk (rancangan "Tubuhku bekerja", foto realistis buatan AI, suara Chirp).
Skill simulasi dari pemilik produk (`simulasi/<slug>/index.html` + `narrator.js`) ditulis untuk proyek HTML statis;
di proyek ini disesuaikan agar comply: layar pelajaran, data di katalog (PostgreSQL), teks antarmuka di i18n, suara
server, tanpa drag wajib.

- **Layar pelajaran baru `simulasi`** (`lessonSimSchema`): foto utama + bagian (titik sentuh dalam persen + foto
  close-up + contoh benda nyata) + kegiatan (foto, bagian yang dipakai, kalimat selesai) + momen "aha" + penutup.
  Alur: pembuka → jelajah (ketuk semua bagian) → kegiatan (ketuk semua bagian yang dipakai; bagian lain hanya
  bergoyang, tanpa kata "salah") → aha (kegiatan pertama yang memakai > 1 bagian) → penutup → ulangi. Kuis memakai
  layar `coba pilih` (tidak dinilai). Validator menolak kegiatan dengan bagian yang tidak ada dan simulasi tanpa aha.
- **Contoh pertama:** Sains TK (Olimpiade) topik H "Tubuhku: bagian dan fungsinya", pelajaran K-SA-12 "Tubuhku
  bekerja" (simulasi 6 bagian × 4 kegiatan, 2 kuis indra, ingat).
- **Foto realistis:** AI Gambar mendapat gaya `foto` (`AI_PHOTO_STYLE_GUIDE`: foto natural, latar polos, anak rekaan
  berpakaian sopan, tanpa teks/logo); gaya bawaan tetap ilustrasi, sidik jari gambar lama tidak berubah. Pilihan
  "Gaya" ada di Admin → AI Gambar. `pnpm sim:photos -- <domain> <grade> <kode>` meminta semua foto simulasi satu
  topik (17 untuk topik H) lewat layanan yang sama (batas biaya, audit, dipakai ulang); hasilnya berstatus review dan
  tampil di simulasi setelah disetujui (`/pictures/subject/:subject`). Selama belum ada atau offline: gambar SVG yang
  sudah ada, dan titik sentuh di gambar disembunyikan (posisinya untuk foto) — kartu bagian tetap bisa diketuk.
  Posisi titik (`x`, `y`) perlu disetel setelah foto utama disetujui.
- **Suara Chirp untuk pelajaran:** `GET /voice/lesson/:domain/:grade/:code?k=<kunci>` membuat/memutar klip untuk
  kalimat pelajaran di katalog (`lessonVoiceLines`: narasi layar, adegan, titik, kalimat, dan semua kalimat simulasi).
  Teks diambil server dari pelajaran, bukan dari perangkat; batas per IP sama dengan suara soal; naskah ucapan &
  gaya per jenjang (D-087) berlaku. Perangkat memakai suara browser bila tidak ada kunci (pelajaran otomatis D-090,
  kalimat buatan perangkat seperti nama huruf/angka) atau suara server tidak tersedia. Video Momo otomatis di depan
  pelajaran manual tidak ada di server, jadi nomor layar disesuaikan.
- Belum: foto (butuh API key OpenAI di Admin → AI Gambar), penyetelan titik di foto, simulasi untuk topik lain.

## D-091 — Semua suara aplikasi memakai Chirp 3 HD (suara browser hanya cadangan terakhir)

**Tanggal:** 2026-10-08 · **Status:** Disetujui (pemilik produk: "pastikan sudah menggunakan yang chirp3-hd bukan lagi
suara bawaan dari browser … replace semua, tanpa terkecuali")

- **Sebelumnya** hanya sebagian yang memakai suara server: kalimat Momo (`vo_*`), soal Basic, kartu English, dan
  pelajaran di katalog (D-035/D-043/D-062/D-088). Teks antarmuka, game, soal Kelas 1+, kartu mapel lain, nama
  huruf/angka, dan pelajaran otomatis (D-090) masih memakai suara browser. Baru 23 klip yang ada.
- **Sekarang semua kalimat memakai klip Chirp 3 HD dari server:**
  - `speak()` di web memutar klip dari `GET /voice/say?t=…`, dengan konteks yang sedang tampil:
    - `i` = soal (skill~seed~band);
    - `s` = pelajaran (domain~jenjang~kode);
    - `c` = soal lomba live (id peserta~nomor).
  - Konteks dipasang oleh ItemPlayer, LessonPage, dan halaman lomba (`pushVoiceItem/Lesson/Contest`, layout
    effect).
  - `speakLesson` lewat jalur yang sama, jadi tidak bergantung pada nomor layar.
  - Batasan lama dibuka: soal semua jenjang (prompt, pembahasan, kartu), dan kartu semua mata pelajaran.
- **Tetap bukan teks bebas (keamanan biaya):** server hanya membuat suara bila teks berasal dari aplikasi
  (`voiceTextAllowed`, engine). Sumbernya:
  - template i18n web (dibaca dari `apps/web/src/i18n/id`; bisa diganti lewat `I18N_DIR`);
  - teks katalog dan judul level, serta dialog Momo;
  - kalimat soal yang diturunkan ulang dari skill + seed, atau dari soal peserta lomba;
  - kalimat pelajaran manual/otomatis beserta soal contohnya;
  - kosakata aplikasi: angka 0–1000, urutan, huruf, nama benda/bentuk/warna, alat indra, kata English.

  Teks boleh berupa gabungan kalimat-kalimat itu, dengan dua aturan tambahan:
  - "Label: teks" diperiksa per bagian;
  - tanda baca akhir diabaikan.

  Template ber-isian hanya cocok bila hurufnya ≥ 3, setiap isian ≤ 40 huruf, dan huruf tetap ≥ 30% kalimat (atau
  ≥ 20 huruf). Jadi "{name}" dan "Halo, {name}" tidak bisa dipakai untuk mengucapkan kalimat bebas. Teks lain
  ditolak (404, dicatat di log).

- **Model dikunci Chirp 3 HD.** `VOICE_MODELS` hanya `chirp3-hd`. Pengaturan tersimpan yang masih Gemini dibaca
  sebagai Chirp 3 HD (`upgradeVoiceSettings`); nama suara (Leda, …) sama di kedua model.
- **Batas:**
  - 2000 permintaan dan 200 klip baru per 10 menit per IP (satu kelas sering berbagi IP Wi-Fi);
  - batas harian `TTS_DAILY_LIMIT` tetap ada.
  - Klip dibuat sekali, disimpan di PostgreSQL, dan di-cache browser selamanya.
  - Waktu tunggu klip pertama 6 detik, karena klip baru perlu dibuat dulu.
- **Suara browser hanya cadangan terakhir:**
  - offline untuk kalimat yang belum pernah diputar;
  - kunci suara tidak ada atau suara dimatikan admin;
  - klip gagal, ditolak, atau melewati batas.
- **Buat lebih dulu:** `pnpm voice:generate -- --all --dry-run` menghitung kalimat yang belum bersuara.
  - Hasil 8 Okt 2026: 9.879 kalimat, ±1 juta huruf.
  - `--all [--max=N]` membuat klip untuk teks antarmuka anak, tombol "Dengarkan" topik, dan semua kalimat
    pelajaran.
  - Soal tetap dibuat saat diputar dan disiapkan lebih dulu oleh perangkat.
  - Biaya Google ditanggung pemilik kunci, jadi perintah ini dijalankan pemilik produk, bukan otomatis.
- **Audit:** di browser, untuk beranda, topik, pelajaran, soal, peringkat, profil, dan login, 0 kalimat yang jatuh
  ke suara browser selama klip tersedia.
- **Bawa ke server tanpa diisi/dibayar dua kali (`carry`):** `pnpm carry:export -- <file>` di laptop, lalu
  `node dist/cli/carry.js import <file>` di server.
  - Yang dibawa: API key admin (`voice_key`, `ai_key`, `ai_claude_key`), pengaturan `voice` & `ai_image`, semua
    `voice_clips`, dan gambar AI yang sudah dibuat (`ai_images`; pembuat/peninjau dikosongkan).
  - Kunci dibuka dengan `JWT_SECRET` laptop, dikunci dengan kata sandi sementara (`CARRY_PASSPHRASE`, scrypt +
    AES-256-GCM), lalu di server dikunci lagi dengan `JWT_SECRET` server. File tidak pernah memuat kunci terbaca dan
    disimpan di `backups/` (tidak masuk git).
  - Impor idempoten (klip yang ada dilewati). Pengaturan suara ikut dibawa, supaya kunci klip di server sama
    persis.
  - Langkahnya ada di `docs/deploy-contabo.md`.
- **Audit menyeluruh 9 Okt 2026 (PAUD–SD + halaman sistem):** suara browser masih terdengar karena dua sebab, dan
  keduanya sudah diperbaiki.
  - **Batas harian 3.000 klip baru tercapai** (792 penolakan di log). Setelah batas itu, sisa hari jatuh ke suara
    browser.
    - Bawaan `TTS_DAILY_LIMIT` sekarang 20.000.
    - Batas klip baru per IP sekarang 600 per 10 menit.
  - **Daftar suara belum dimuat** pada ucapan pertama dan di luar area anak (mis. Momo Studio orang tua).
    `speak()` sekarang memuatnya dulu dan menunggu maksimal 1,5 detik sebelum memilih Chirp atau cadangan.
  - **Kalimat yang dibuat lebih dulu bertambah:**
    - teks simulasi `peraga`: kartu, tahap, langkah alat, dan kata English dengan lafal British;
    - kata bilangan 0–1000.
    - Total ±14.700 kalimat.
  - Setelah klip bertambah, buat file `carry` baru untuk server.

## D-092 — AI Gambar: Claude menulis prompt, OpenAI menggambar

Tanggal: 2026-10-08. Pemilik produk ingin AI Gambar memakai Claude API. Claude tidak bisa membuat gambar (keluarannya
teks), jadi pilihan yang disetujui: **Claude menulis prompt, OpenAI menggambar** (D-068 tetap berlaku untuk
pembuatan gambar).

- **Pengaturan** (Admin → AI Gambar): "Penulis prompt" `none` (bawaan) / `claude`, "Model Claude" (bawaan
  `claude-opus-5-5`), harga token Claude (Opus 5.5: US$4 masuk, US$0,20 cache, US$20 keluar per 1 juta). Field baru
  ber-default, jadi pengaturan tersimpan yang lama tetap valid.
- **Kunci Claude** (`sk-ant-…`): `.env ANTHROPIC_API_KEY` lebih dulu, lalu kunci admin terenkripsi
  (`app_settings.ai_claude_key`, AES-256-GCM seperti kunci OpenAI); sandi admin wajib untuk mengganti, email ke
  direksi saat diganti/dihapus, tombol uji (membaca info model, tanpa biaya token), error disensor (`sk-ant-…`).
- **Alur:** permintaan kamus admin → Claude (SDK resmi `@anthropic-ai/sdk`, `beta.messages.create`, effort `low`,
  keluaran JSON terstruktur `{prompt}`, instruksi sistem tetap + cache, `fallbacks: "default"` bila Claude menolak) →
  prompt 60–140 kata bahasa Inggris sesuai gaya (foto/ilustrasi) → OpenAI membuat gambar dengan panduan gaya yang
  sama. Prompt tersimpan di gambar (bisa dilihat saat review). Claude gagal/menolak → prompt bawaan, gambar tetap
  dibuat, kegagalan dicatat (`ai_usage` action `prompt`, ok=false). Biaya Claude dicatat di audit `prompt` dan masuk
  batas biaya harian/bulanan; perkiraan biaya per gambar ikut naik saat Claude aktif.
- **Bawaan (lanjutan, permintaan pemilik produk):** Penulis prompt = **Claude** (tanpa kunci Claude → prompt bawaan),
  dan form "Buat gambar" memakai gaya **Foto realistis**. Gaya bawaan di API tetap ilustrasi, supaya sidik jari
  permintaan lama tidak berubah.
- **Simpan sekali, pakai ulang (hemat biaya):** setiap gambar disimpan di PostgreSQL (`ai_images`) dengan sidik jari
  permintaan (jenis, subjek, kata, tema, catatan, varian, gaya, model, kualitas, ukuran, latar, referensi). Permintaan
  yang sama mengembalikan gambar yang sudah ada **sebelum** memanggil Claude atau OpenAI (biaya 0). Penulis prompt
  sengaja tidak ikut sidik jari, jadi mengaktifkan Claude tidak membuat ulang gambar yang sudah ada. Membuat ulang
  hanya terjadi bila admin menolak gambar lalu meminta lagi (Claude menulis prompt baru). Aplikasi menampilkan foto
  lewat `/pictures/subject/:subject` → `/pictures/:id` (cache permanen). Suara: setiap klip disimpan di
  `voice_clips` dengan kunci hash (naskah ucapan + pengaturan suara) dan hanya dibuat bila belum ada.
- Hanya di panel admin; yang dikirim ke Claude hanya kata kamus, catatan admin, dan panduan gaya — tidak pernah data
  anak. Area anak tetap tanpa AI (PRD A17).

## D-093 — Pelajaran + simulasi untuk setiap topik SD (bertahap), foto realistis disetujui otomatis

**Tanggal:** 2026-10-09 · **Status:** Disetujui pemilik produk:

- simulasi sesuai mapel;
- foto medium yang langsung tampil;
- dikerjakan bertahap per jenjang, mulai Kelas 1.

- **Tujuan:** setiap topik SD (Kelas 1–6 dan buku Olimpiade) punya penjelasan yang konkret dan lengkap, simulasi
  interaktif dengan foto realistis (bukan kartun), dan suara Chirp (D-091).
- **Layar baru `peraga`** (`content/peraga.ts`), semuanya data:
  - `jelajah`: kartu foto nyata, lalu pertanyaan "ketuk yang …", lalu momen aha.
  - `proses`: urutan sebab-akibat berfoto.
  - `alat`: alat peraga matematika; setiap langkah punya target.
    - Alatnya: garis bilangan, blok puluhan, benda tambah/kurang/hitung, uang Rupiah, jam, penggaris, timbangan,
      bangun (hitung sisi/sudut), pecahan, dan pola.
  - `kata`: kartu kata English berfoto, lafal British lalu arti, lalu "dengar lalu ketuk".
- **Aturan tampilan:**
  - Tanpa nilai dan tanpa kata "salah"; pilihan yang belum tepat bergoyang dan Momo memberi petunjuk.
  - Setiap kartu wajib punya gambar SVG cadangan, supaya tetap bisa dimainkan sebelum foto ada atau saat offline.
  - Titik sentuh tidak diletakkan di atas foto AI, karena posisinya tidak bisa dijamin; tiap bagian punya foto
    kartunya sendiri.
  - Foto tidak dipakai untuk menghitung jumlah benda.
- **Susunan pelajaran per topik** (disimpan di katalog, `docs/content/peraga-sd.md`):
  1. konsep;
  2. 1–2 simulasi;
  3. langkah/strategi;
  4. coba satu soal;
  5. ingat.

  Video Momo otomatis (D-090) ditambahkan di depan. Kode pelajaran: `1-MA-05`, `12-SA-14`, …

- **Foto realistis disimpan dan dipakai ulang:**
  - `pnpm lesson:photos -- <domain> <grade> … [--dry-run]` meminta setiap foto ke AI Gambar (gaya `foto`, subjek dipakai
    ulang lintas topik, batas biaya, audit).
  - Foto disimpan di PostgreSQL (`ai_images`) dan ikut dibawa ke server lewat `carry`.
- **Persetujuan otomatis (mengubah D-068 untuk foto simulasi):**
  - Foto baru langsung disetujui lewat `setStatus` (tercatat di audit `review-approved`).
  - Admin tetap bisa menolak atau mengganti di Admin → AI Gambar.
  - Subjek yang pernah ditolak admin tidak disetujui ulang.
  - Panduan gaya foto D-088 tetap berlaku: tanpa tulisan, anak rekaan, berpakaian sopan.
- **Biaya:** sekitar US$0,05 per foto baru (OpenAI medium + prompt Claude). Tahap 1 sekitar 130 topik.
  - Batas biaya harian/bulanan di Admin → AI Gambar perlu dinaikkan sebelum menjalankan `lesson:photos`.
- **Tahap 1 (Kelas 1):** `math/sd1`, `sains/sd1`, `math/sd12`, `sains/sd12`, `english/sd12`.
  - `validate:content` mewajibkan setiap topik (kecuali game/mock) di buku `PERAGA_BOOKS` punya pelajaran dengan
    simulasi.
  - Tahap berikutnya: Kelas 2–4, lalu Kelas 5–6.

## D-094 — Mock test 1 gratis disusun dari level gratis

Tanggal: 2026-10-09. Disetujui pemilik produk (jawaban: "Dari level gratis").

- **Masalah (audit suara 9 Okt 2026):** semua 99 mock test tidak bisa dimainkan oleh anak tanpa paket ("Soal mock
  test belum bisa dibuat"). Soal sulit mock diambil dari level 8–10, padahal level di atas `freeLevels` (5)
  berbayar dan dikirim ke perangkat sebagai stub tanpa isi soal (audit M9). Akibatnya Mock test 1 yang gratis sekali
  (D-073) gagal dibuat.
- **Keputusan:** bila sebuah tingkat mock hanya berisi level berbayar yang terkunci, `mockSources` menyusun soal dari
  level gratis saja.
  - Urutan level yang tersedia dibagi tiga: terendah = mudah, tengah = sedang, tertinggi = sulit.
  - Contoh 5 level gratis: level 1–2 mudah, level 3 sedang, level 4–5 sulit.
  - Jumlah soal & rencana 9/8/8 tetap, poin EMC tetap per tingkat.
  - Isi level berbayar tetap tidak dikirim ke perangkat.
- Soalnya lebih mudah daripada lomba asli. Anak Premium dan anak kelas tetap mendapat soal dari level 8–10.
- Test: `packages/engine/test/mock.test.ts` (TK & Kelas 1–2, semua mock). Audit browser: 15 mock PAUD–Kelas 1–2
  bisa dimainkan dan suaranya Chirp.
