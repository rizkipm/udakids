# Rencana Build — M0 s.d. M7

Satu milestone per sesi. Setiap milestone ditutup dengan: semua cek hijau
(`pnpm lint && pnpm typecheck && pnpm test && pnpm validate:content && pnpm build`), laporan kriteria
penerimaan, dan update status di tabel ini. Alur kerja: skill `/milestone`.

| #   | Milestone          | Status                                  |
| --- | ------------------ | --------------------------------------- |
| M0  | Scaffold           | Selesai (2026-09-28)                    |
| M1  | Engine inti        | Selesai (2026-09-29)                    |
| M2  | Petualangan (anak) | Belum                                   |
| M3  | Pustaka Latihan    | Sebagian besar (2026-09-29) — lihat M3+ |
| M4  | Offline & sync     | Belum                                   |
| M5  | Fasilitator        | Belum                                   |
| M6  | Laporan orang tua  | Belum                                   |
| M7  | Suara + polish     | Belum                                   |

---

## M0 — Scaffold

**Kriteria (PRD A16):** monorepo jalan; `pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm validate:content` ada
dan hijau; CI GitHub Actions; CLAUDE.md dibuat.

- [x] pnpm workspaces: `packages/engine`, `apps/web`, `apps/api`
- [x] TypeScript strict, ESLint 9 flat config (aturan A17: `no-eval`, `no-new-func`; engine bebas React/DOM)
- [x] Web: Vite + React 18 + Router, rute `/play`, `/fasilitator`, `/laporan/:token`, i18n `id.json`, config `APP_NAME`/`CHARACTER_NAME`
- [x] API: NestJS + Drizzle + PostgreSQL, `GET /health`, skema A12 + migrasi awal, Postgres lokal (Postgres.app)
- [x] Engine: tipe program A5, skema dasar level A6, skema dialog
- [x] `validate:content`: skema dasar, id/world/index, id unik, audioKey, komposisi 4/3/3 (peringatan)
- [x] 3 level contoh PRD (w1-l04, w2-l07, w3-l05) + `content/dialog/momo.id.json`
- [x] CI: lint, typecheck, test, validate:content, build
- [x] CLAUDE.md, docs/, `.claude/skills/`

## M1 — Engine inti

**Kriteria:** tipe program, interpreter, evaluator `sequence-cards`/`grid-move`/`pattern`/`classify`, solver

- deteksi jalan pintas, bintang, bantuan bertahap. Coverage engine ≥ 90%. Validator menolak level yang
  tidak bisa diselesaikan (ada test-nya).

* [x] Skema Zod per `type` (discriminated union) untuk 6 type MVP + aturan lintas-field; Basic: palette
      tanpa belok relatif, ≤ 4 jenis kartu (`levels/schema.ts`)
* [x] `program/program.ts`: `cardCount`, kartu → instruksi, edit Buku Catatan (tambah/hapus/ganti/tukar)
* [x] `interpreter/grid.ts`: `run(level, program) → Trace` (`step, pos, facing, event?, instrPath`), semua
      jenis instruksi, batas 200 langkah
* [x] `levels/evaluate.ts`: `sequence-cards` (multi `validOrders`), `grid-move`, `pattern`, `classify`,
      `number`, `predict` + `faultyPath` untuk sorotan
* [x] `solver/grid.ts`: BFS / pencarian biaya-seragam dengan makro `repeat`; `optimalSteps` →
      `content/.generated/optimal.json`; deteksi jalan pintas skill `loop`
* [x] `scoring/stars.ts` (A8, `mergeStars` = max) dan `adaptive/assist.ts` (2×/3×/5×, lompat maju)
* [x] `levels/validate.ts` dipakai `scripts/validate-content.ts`; test exit code di
      `scripts/validate-content.test.ts`
* [x] Coverage engine: 100% statements/lines/functions, 98,95% branches

## M2 — Petualangan (anak)

**Kriteria:** Kota Momo + pemutar level; 10 level Dunia 1 dan 10 level Dunia 2 bisa dimainkan end-to-end
dengan audio (fallback TTS), Buku Catatan tersorot saat eksekusi, reaksi Momo, bintang tersimpan lokal.
Playwright: selesaikan w1-l01 dan w2-l01.

1. Komponen: `<Momo mood>` (SVG placeholder, siap Rive), `KartuBesar` (≥ 64 px, ketuk), `Grid` (SVG, jalur
   bernomor + Momo menyebut angka), `BukuCatatan` (ketuk untuk ubah/tukar/hapus).
2. `audio/`: Howler per `audioKey`, fallback `speechSynthesis` id-ID; putar saat muncul & diketuk.
3. Alur masuk (kode kelas → warna Momo → nama panggilan) versi lokal; Kota Momo; hasil level (bintang, keping).
4. Konten: w1-l01…l10, w2-l01…l10 (+ dialog); dunia 3 placeholder yang lolos validator.
5. Playwright (Chromium) untuk w1-l01 dan w2-l01.

## M3 — Pustaka Latihan

**Kriteria:** generator + evaluator ekspresi aman + 7 jenis soal + Skor Jago + 12 skill contoh. Test Skor Jago
mencakup: tahap tidak turun, mode tantangan tidak menghukum, ulangan terjadwal.

1. `generator/expr.ts`: tokenizer + parser (+, −, ×, perbandingan, variabel) — tanpa `eval`.
2. `generator/`: `seedrandom`, rejection sampling ≤ 100, band kesulitan.
3. `scoring/jago.ts` sesuai A9 (fungsi murni, test lengkap).
4. UI 7 `itemType`; rak Pustaka dengan tanaman; sesi 10 soal lalu ajak istirahat; `chosenDistractor` di event.
5. 12 skill wajib (A10); validator menghasilkan 200 soal/skill tanpa error.

## M4 — Offline & sync

**Kriteria:** PWA bisa dipasang; dengan jaringan dimatikan, level dan Pustaka tetap jalan; event masuk outbox
dan terkirim saat online; server idempoten (test kirim ganda).

1. `vite-plugin-pwa` precache aset + konten Basic.
2. `engine/events`: skema Zod event A11 + reducer progres + aturan merge.
3. Dexie `outbox`/`progress`; `SyncAdapter` `mock` & `http` dengan backoff.
4. API `EventsModule`: `POST /events` batch, `on conflict do nothing`, proyeksi `level_progress`/`skill_mastery`.
5. Test integrasi API terhadap Postgres (service container di CI); Playwright mode offline.

## M5 — Fasilitator

**Kriteria:** buat kelas + QR; anak masuk via kode; dashboard realtime; tanda macet > 3 menit; bekukan layar
< 2 detik; tantangan kelas.

1. `AuthModule` magic link (D-004) + tabel `login_tokens`; guard per kelas.
2. `ClassesModule`: kode kelas, QR (`qrcode`), tutup kelas → `report_token`.
3. `RealtimeGateway` Socket.IO (D-003); event `stuck` dari client setelah idle 3 menit.
4. Dashboard: kartu per anak, kuning saat macet, tombol "Semua lihat ke depan", tantangan kelas + timer.

## M6 — Laporan orang tua

**Kriteria:** halaman laporan via token; replay perjalanan Momo; sertifikat PDF; skor penguasaan per area.

1. `ReportsModule` `GET /reports/:token`.
2. Replay dari `program_run` sukses terakhir memakai interpreter engine.
3. Sertifikat `pdf-lib` di client; skor penguasaan per 5 area.

## M7 — Suara + polish

**Kriteria:** voice di balik flag sesuai A15; audit aksesibilitas; level terbuka < 2 detik di laptop kelas
bawah; paket Basic < 15 MB; Dunia 3 lengkap 10 level.

1. `SpeechRecognition` id-ID, kosakata terbatas → `Program`; konfirmasi Ya/Tidak bergambar; 2–3 pilihan
   bila ragu; sembunyikan mic saat offline/tidak didukung; audio tidak pernah disimpan.
2. Audit a11y (kontras, fokus, mouse saja), budget ukuran di CI, profil performa.
3. w3-l01…l10; `validate:content:strict` lolos untuk dunia 1–3.

---

## M3+ — Akun, peran, dan Pustaka Pra-TK Matematika (permintaan 2026-09-29)

Dikerjakan di luar urutan atas permintaan pemilik produk (D-014..D-019).

- [x] Engine: RNG ber-seed, evaluator ekspresi aman (tanpa eval), 26 family generator, `generateItem`,
      validator 200 soal/skill, Skor Jago (A9) + ulangan terjadwal, skema akun bersama
- [x] Konten: katalog Matematika Pra-TK 25 kategori (A–Y), 170 skill (adaptasi lokal, Rupiah)
- [x] API: staf/orang tua email+password (scrypt + JWT), anak sandi gambar + penguncian, guard peran,
      katalog, sync latihan idempoten, laporan anak/admin, CRUD skill/soal/level/pengguna/kelas, seed
- [x] Web area anak: masuk kode keluarga → profil → sandi gambar, Pustaka (tanaman, tanpa angka),
      pemutar 7 jenis interaksi, sesi 10 soal + reteach Momo + istirahat, outbox offline
- [x] Ilustrasi SVG untuk semua visual (tanpa emoji)
- [ ] Web area admin (sedang dikerjakan)
- [ ] Web area orang tua (sedang dikerjakan)
- [ ] Literasi (20 skill) dan Sains (15 skill) Pustaka — menyusul (target MVP PRD 60 skill)
- [ ] Rekaman suara Momo (sekarang TTS browser), tes penempatan per domain

## Kategori B — SD/MI kelas 3–4 (permintaan 2026-09-29, D-020)

- [x] Riset & analisis kepatuhan (Panduan OSN SD 2025, CP BSKAP 046/H/KR/2025, TIMSS 2023):
      [docs/content/kategori-b-sd34.md](content/kategori-b-sd34.md)
- [x] Engine: family `expr` (bilangan/desimal/pecahan, pilihan ganda/isian), FPB/KPK, visual kelas 3+
- [x] Matematika: 10 materi × 3 level = 30 skill (generator, 200 soal/skill tervalidasi)
- [x] IPA: 10 materi × 3 level = 30 skill, 158 soal manual bersumber
- [x] Web: keypad isian, visual pecahan/tabel/diagram/bangun/sudut, tab buku di Pustaka
- [ ] Tinjauan guru (30–50 soal per skill) sebelum dirilis ke anak
- [ ] Cek ulang CP ke dokumen resmi BSKAP 046/H/KR/2025 (saat riset, domain kemdikbud.go.id tidak dapat diakses)

## Semua buku 10 level per topik (permintaan 2026-09-29, D-023)

- [x] Rename: Math Grade 3-4, Sains Grade 3-4; buku baru Math Kindergarten (TK), Math Grade 1-2, Sains Grade 1-2
- [x] 1170 level (Pra-TK 250, TK 520, Math 1-2 100, Math 3-4 100, Sains 1-2 100, Sains 3-4 100), 0 error validator
- [x] Engine: family `facts`, `clock`, `mix`; `expr` labels & `{w:}`; test (coverage engine 99,9%)
- [x] Seed: skill lama → draft; katalog diurutkan per jenjang
- [ ] Tinjauan guru untuk buku Grade 1-2 & Kindergarten

## Timer, papan peringkat, registrasi & desain ulang (permintaan 2026-09-30, D-024/D-025)

- [x] Stopwatch tanpa batas di ronde + waktu di hasil, riwayat, profil (migrasi `0002_quiz_time`)
- [x] Papan peringkat global `/play/peringkat` (podium + tabel, responsif)
- [x] Registrasi: wizard keluarga 3 langkah, roster kelas + kartu masuk cetak, gabung sendiri `/play/gabung`
- [x] Masuk anak dengan kode keluarga atau kode kelas; area `/fasilitator` (kelas & siswa)
- [x] Landing page baru, layout masuk/daftar, profil anak baru; dicek di 1280 px & 390 px
- [ ] Moderasi nama panggilan untuk papan global; menautkan akun kelas ke akun orang tua

## Tampilan anak ringkas & materi topik (permintaan 2026-09-30, D-026)

- [x] Formulir: tanda wajib `*` + lihat/sembunyikan password
- [x] Materi (intro + "Ingat!") untuk 117 topik + contoh soal tidak dinilai; bisa diedit admin
- [x] Beranda ringkas (satu tombol Main + kartu topik), halaman topik, dialog berhenti, layar Selesai main
- [x] Layar hasil: satu tombol utama sesuai lulus/gagal
- [ ] Tinjauan guru untuk teks materi

## Materi berformat lab (permintaan 2026-10-10, D-109)

Purwarupa: Lab Pancaindra (`sains/tkosn` J) dan materi Angka (`math/tkosn` A). Target: setiap buku punya Lab Buku,
setiap topik (±711) punya Materi Topik detail.

### L0 — Fondasi

- [x] Skema umum Lab Buku + Materi Topik (pos per tema, figur generik, tab per mapel, `labRef` dari topik, status
      draf/aktif); Lab Pancaindra dipindah ke format ini
- [x] Slot foto (`foto` + cadangan SVG) di lab; `lesson:photos` mengumpulkan foto lab
- [x] Bagian otomatis: Contoh per level (semua level topik) + Uji penguasaan dari bank soal
- [x] Validator cakupan (semua level dirujuk, Uji ≥ 4 soal per pos, gambar ada) + test render semua lab
- [x] Event progres lab lewat outbox + endpoint idempoten (migrasi), tampil di laporan orang tua & fasilitator
- [x] Halaman topik: tombol utama Materi Topik/Lab; "Belajar dulu" jadi ringkasan
- [x] Admin: laporan cakupan lab per buku + pratinjau
- [x] Skill Claude `/generate-lab` (draf konten dari level + daftar foto)

### L1 — Pilot

- [x] Lab Buku Sains TK (Olimpiade) + Materi Topik J (pancaindra) dengan foto Pexels + 1 topik lain
- [x] Materi Topik Math TK (Olimpiade) A (angka), purwarupa kode dihapus
- [ ] Tinjauan pemilik produk → penyesuaian format sebelum produksi

### L2 — Pustaka eksperimen (±30–40 widget, memakai ulang alat peraga/game yang ada)

- [x] Math: hitung-ketuk, garis bilangan, bingkai sepuluh, kereta angka, balok tambah/kurang, nilai tempat (≤ 999),
      jam, uang, bangun, pola, pecahan, penggaris, grafik, kali/bagi/luas (21 widget; tanpa timbangan & dadu)
- [x] Sains: figur berbagian (8 figur), pemilah 2–4 kotak, penggeser sebab-akibat, urut (daur, rantai makanan),
      indra (cahaya, lup, bunyi, bau, rasa, raba); listrik/magnet/tata surya lewat penggeser & pemilah
- [ ] English: dengar-pilih, pasang, susun (urut), pola sudah; phonics & dialog bergambar belum ada widget khusus

### L3 — Produksi bergelombang (Lab Buku dulu, lalu Materi Topik per topik)

Alur: draf per topik di `labs-staging/` (`pnpm lab:brief` → tulis → `pnpm lab:check`), lalu `pnpm lab:merge`,
`pnpm validate:content`, `pnpm db:seed`, `pnpm lesson:photos -- <domain> <grade>`. Pantau di Admin → Materi lab.

- [x] Gelombang 1: PAUD & TK (math prek/tk/tkosn, sains tk/tkosn, english prek/tkosn, worksheet prek)
- [x] Gelombang 2: SD 1–2 (math sd1/sd2/sd12, sains sd1/sd2/sd12, english sd12)
- [x] Gelombang 3: SD 3–4 (math sd3/sd34/sd4, sains sd3/sd34/sd4, english sd34) + topik Y/Z buku kelas yang
      sempat terlewat (aturan lewati kini `isLabTopic`: hanya mock test & game)
- [x] Gelombang 4: SD 5–6 & SMP (math/sains/english sd56 & smp79) — total 726 Materi Topik, 28 Lab Buku
- [ ] Tinjauan guru per gelombang (akurasi materi)

### L4 — Ukur & perbaiki

- [ ] Dashboard: penyelesaian lab, tab yang dilewati, bintang Uji vs tingkat lulus latihan sebelum/sesudah lab
