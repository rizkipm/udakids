# CLAUDE.md — Little Coder (Cleo Kids)

PWA untuk anak 5–8 tahun: anak "mengajari" robot **Momo** dengan kartu gambar besar yang diketuk;
urutan kartu = program (**Buku Catatan Momo**). Dua lapisan: **Petualangan Momo** (level cerita, workshop)
dan **Pustaka Latihan** (skill ala IXL, soal di-generate, Skor Jago). Ada dashboard fasilitator realtime
dan laporan orang tua via link. Wajib jalan offline dan menyimpan data anak seminimal mungkin.

Sumber kebenaran: `PRD.md` (Bagian A = build brief). Dokumen pendukung:
[docs/architecture.md](docs/architecture.md) · [docs/plan.md](docs/plan.md) ·
[docs/decisions.md](docs/decisions.md) · [docs/skills.md](docs/skills.md).

## Cara kerja

- **Satu milestone per sesi** (M0–M7, lihat `docs/plan.md`): rencanakan → implementasi → jalankan semua
  cek → laporkan kriteria penerimaan mana yang terpenuhi. Pakai skill `/milestone`.
- **Tanya dulu** sebelum keputusan yang tidak tercakup di PRD. Setelah disetujui, catat di
  `docs/decisions.md`.
- Sebelum menyatakan selesai, semua ini harus hijau:
  `pnpm lint && pnpm typecheck && pnpm test && pnpm validate:content && pnpm build`.

## Tech stack (PRD A3, disesuaikan — lihat D-001)

| Lapisan  | Pilihan                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------ |
| Runtime  | Node.js ≥ 22.12 (dev: 24), pnpm 10 workspaces (tanpa Turborepo)                                        |
| Bahasa   | TypeScript 5.9 strict di semua paket                                                                   |
| Web      | Vite 7 + React 18 + React Router 6, Zustand, Dexie, `vite-plugin-pwa` (M4), Framer Motion, Howler      |
| API      | NestJS 11 (Express), REST + WebSocket gateway (Socket.IO, M5)                                          |
| Database | PostgreSQL (lokal: Postgres.app 18) via Drizzle ORM + drizzle-kit (migrasi SQL di `apps/api/drizzle/`) |
| Validasi | Zod 4 — level, skill template, event (dipakai bersama web & api lewat engine)                          |
| Test     | Vitest (unit; api pakai `unplugin-swc` untuk decorator metadata), Playwright (e2e, mulai M2)           |
| Lain     | `pdf-lib` (sertifikat), `qrcode`, `seedrandom`, ESLint 9 flat config + Prettier                        |

## Struktur folder

```text
packages/engine/   TypeScript murni (TANPA React/DOM/Nest/IO): program, interpreter, levels,
                   solver, scoring (bintang + Skor Jago), generator, adaptive, events
apps/web/          /play (anak), /fasilitator, /laporan/:token; i18n/id.json; sync/ (SyncAdapter)
apps/api/          NestJS: modul per fitur; src/db/schema.ts (Drizzle); drizzle/ (migrasi)
content/           levels/basic/world-N/*.json, skills/{math,literasi,sains}/*.json, dialog/momo.id.json
scripts/           validate-content.ts
docs/              architecture, plan, decisions, skills
.claude/skills/    skill Claude Code untuk alur kerja proyek ini
```

## Perintah

```bash
pnpm install
cp .env.example .env  # sekali saja; .env tidak masuk git (rahasia)
# sekali saja: role + database di Postgres lokal (Postgres.app, port 5432)
psql -h localhost -d postgres -c "create role littlecoder login password 'littlecoder'"
createdb -h localhost -O littlecoder littlecoder
pnpm db:setup         # = db:migrate + db:seed (instal baru)
pnpm db:migrate       # terapkan migrasi Drizzle (apps/api/drizzle/0000…)
pnpm db:seed          # isi katalog + 170 skill + level dari content/, buat admin pertama
pnpm dev              # engine (watch) + api :7177 + web :6006 (web memanggil API lewat /api)
pnpm dev:lan          # sama, plus alamat untuk iPad/HP di Wi-Fi yang sama (docs/lan.md)
pnpm lan              # versi produksi di jaringan lokal (hentikan pnpm dev dulu)
pnpm test             # vitest semua paket (engine dengan coverage ≥ 90%)
pnpm lint             # eslint + prettier --check
pnpm validate:content # --allow-incomplete; versi ketat: validate:content:strict
pnpm db:generate      # setelah mengubah apps/api/src/db/schema.ts
pnpm db:backup        # cadangkan SELURUH DB (skema + data) → backups/*.dump (tidak masuk git)
pnpm db:restore -- <file.dump>  # pulihkan ke DATABASE_URL, lalu db:migrate && db:seed
pnpm content:export   # tulis suntingan admin dari DB kembali ke content/ (lalu commit)
pnpm deploy:db        # server: node dist/cli/migrate.js + seed.js (langkah lengkap: docs/deploy.md)
pnpm voice:generate   # buat klip suara Momo yang belum ada (butuh GOOGLE_TTS_API_KEY, D-035)
```

## Peran & login (D-014..D-016)

| Peran       | Masuk                                                                                                                               | Area                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| admin       | email + password (`/masuk/staf`)                                                                                                    | `/admin` — skill & soal, bank soal, katalog, level, pengguna, kelas, laporan |
| fasilitator | email + password (`/masuk/staf`)                                                                                                    | `/fasilitator` — hanya kelasnya sendiri                                      |
| orang tua   | email + password + persetujuan (`/orang-tua`)                                                                                       | profil anak, sandi gambar, laporan                                           |
| anak        | kode keluarga/kelas → profil → 3 gambar sandi (`/play`); gabung kelas `/play/gabung` (D-025); daftar sendiri `/play/daftar` (D-037) | Pustaka Latihan, Petualangan, profil, papan peringkat                        |

Admin dev bawaan dari seed: `admin@littlecoder.local` / `admin12345` (ganti lewat `ADMIN_PASSWORD`).
JWT (`JWT_SECRET`, wajib di produksi); guard global NestJS + `@Public()` / `@Roles()`.
Orang tua baru wajib verifikasi email (kode 6 angka) sebelum bisa masuk; email transaksi juga dikirim ke direksi
(D-044, [docs/email.md](docs/email.md), Gmail App Password di `.env`). Tanpa SMTP di dev, email dicetak di log API.

## Aturan kode

- Engine = fungsi murni & deterministik; semua acak lewat RNG ber-seed. ESLint melarang import React/Nest/
  Dexie dan global browser di `packages/engine`.
- Engine ESM dengan export condition `source`: web, vitest, dan tsx memakai source TS langsung; api
  (CommonJS) memakai `dist/` — `pnpm dev` membangun engine lebih dulu.
- Import relatif di engine dan api memakai ekstensi `.js` (module `nodenext`).
- Semua input (ketuk, suara, kamera) diterjemahkan ke tipe `Program` yang sama (PRD A5). Interpreter:
  `run(level, program) => Trace`, maksimal 200 langkah.
- Level, skill, katalog/materi, dan dialog adalah **data di PostgreSQL** (runtime tidak membaca JSON konten).
  `content/` = sumber seed + CI; suntingan admin dibawa balik dengan `pnpm content:export`.
  Skill baru cukup JSON selama family generator-nya ada (`packages/engine/src/generator/families`).
- Level & skill di `content/` tetap divalidasi. Setiap perubahan konten harus lolos validator.
  `optimalSteps: "auto"` ditulis ke `content/.generated/optimal.json`, jangan ubah file sumber.
- Suara Momo (D-035): hanya perintah soal & respons jawaban (kunci dialog `vo_*`), plus kalimat soal Basic.
  Klip dibuat server lewat Google Cloud TTS lalu di-cache di PostgreSQL (`voice_clips`). Kunci API hanya di server,
  bukan kunci Google AI Studio. Cadangan: suara browser.
- Billing (D-036): uang = rupiah bulat. Kunci level berbayar dicek di perangkat (`paid`) DAN server. Harga, paket, dan
  komisi tidak pernah tampil di area anak.
- Semua teks UI lewat `apps/web/src/i18n/id.json` (siap `en.json`). Nama produk/karakter hanya di
  `apps/web/src/config/app.ts` (`APP_NAME`, `CHARACTER_NAME`).
- Event ditulis ke outbox Dexie dulu, dikirim `SyncAdapter` (`mock` | `http`) dengan backoff. Server
  idempoten per `event.id` (`insert … on conflict do nothing`). Konflik: bintang = max, visibleStage = max,
  Skor Jago = `ts` terbaru. Progres per `levelId + levelVersion`.
- Test dulu untuk logika engine; Skor Jago dan solver wajib test lengkap.

## Aturan UX anak (PRD A14)

Target sentuh ≥ 64×64 px, kartu diketuk (drag opsional) · Basic tanpa teks yang harus dibaca; setiap
kartu/instruksi punya audio · maks 4 jenis kartu sekaligus di Basic · saat keliru: Momo bereaksi lucu,
instruksi penyebab berkedip pelan — tanpa kata "salah/gagal", merah besar, atau suara negatif · pujian
menyebut usaha/strategi · tanpa emoji (pakai SVG) · kontras tinggi, bisa dengan mouse saja.

## Hal yang TIDAK BOLEH dilakukan (PRD A17)

- Menyimpan data pribadi anak selain nama panggilan dan warna Momo (tanpa foto, email, tgl lahir). Tampilan
  Momo (gradasi + aksesori, D-051) adalah tampilan robot, bukan data pribadi; semua pilihan untuk semua anak.
- Menyimpan atau mengirim rekaman suara.
- Memakai `eval` / `new Function` untuk ekspresi konten (ESLint `no-eval`, `no-new-func` aktif).
- Drag & drop blok kecil sebagai satu-satunya cara input.
- Memakai belok relatif (`turn`) di tingkat Basic.
- Menampilkan nyawa, streak, atau **batas waktu** di level utama untuk anak. (Pengecualian yang sudah
  disetujui: skor ronde merah/hijau D-021, stopwatch tanpa batas + papan peringkat global D-024/D-042 — hanya
  nama panggilan + warna Momo yang terlihat oleh anak lain; hitung mundur HANYA di lomba live D-042.)
- Menyalin soal/aset dari IXL, Code.org, ScratchJr, atau platform lain.
- Menambah obrolan AI/LLM ke area anak.
- Membangun yang di luar lingkup MVP: kartu kamera, level 31–100, editor level visual, pembayaran online
  (gateway), app native, fitur sosial/chat. (Disetujui: paket + transfer manual + buku kas/komisi, D-036.)
- Menampilkan harga, ajakan membeli, formulir pembayaran, atau banner promosi di area anak (hanya area orang tua).
- Mengirim kunci jawaban ke perangkat saat lomba live (soal lomba dibuat & dinilai di server, `publicItem`).
- Menyimpan gender/jenis kelamin anak (mis. untuk memilih suara).
- Mengambil keputusan di luar PRD tanpa bertanya.
