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
- **Belum:** Math Grade 3 (daftar topik di pesan pemilik terpotong) dan tinjauan guru untuk buku baru.

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

- **Pengirim:** Gmail SMTP `projectsudacoding@gmail.com` dengan App Password. Rahasia hanya ada di `.env` server,
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
