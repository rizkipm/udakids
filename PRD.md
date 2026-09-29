# Little Coder (Cleo Kids) — PRD + Build Brief untuk Claude Code

> Versi dokumen: PRD v0.5 + Build Brief v1.0 · 28 September 2026 · Pemilik: Rizki Syaputra (Silentmode Sdn Bhd)
>
> File ini berisi tiga bagian:
> - **Bagian A — Build Brief:** instruksi teknis yang harus diikuti Claude Code saat membangun proyek.
> - **Bagian B — PRD lengkap:** alasan, konsep produk, silabus, skor, dan keputusan desain.
> - **Bagian C — Ringkasan riset:** temuan riset yang menjadi dasar keputusan desain.

---

## Cara memakai file ini

1. Buat folder proyek baru, misalnya `little-coder/`, lalu buka di Visual Studio Code.
2. Simpan file ini di root folder dengan nama `PRD.md`.
3. Buka terminal di VS Code dan jalankan `claude` (Claude Code).
4. Salin dan tempel prompt berikut:

```text
Baca PRD.md secara lengkap, terutama "Bagian A — Build Brief".
Bangun proyek ini mengikuti milestone M0 sampai M7 secara berurutan.
Sebelum mulai, buat CLAUDE.md berisi ringkasan aturan dari Bagian A
(tech stack, struktur folder, aturan kode, dan "hal yang tidak boleh dilakukan").
Kerjakan satu milestone per sesi: rencanakan, implementasikan, jalankan semua test,
lalu laporkan hasilnya dan kriteria penerimaan mana yang sudah terpenuhi.
Tanya saya dulu sebelum mengambil keputusan yang tidak tercakup di PRD.
Mulai dari M0.
```

5. Setelah setiap milestone selesai, cek hasilnya di browser (`pnpm dev`), lalu minta Claude melanjutkan: `Lanjut ke M1`.

---

# BAGIAN A — BUILD BRIEF (untuk Claude Code)

## A1. Ringkasan produk dalam 5 kalimat

Little Coder adalah aplikasi web (PWA) untuk anak 5–8 tahun yang melatih logika & coding, spasial, matematika, literasi, dan sains. Anak "mengajari" robot bernama **Momo** dengan kartu gambar besar yang cukup diketuk (tanpa drag & drop blok kecil); urutan kartu itu adalah programnya (**Buku Catatan Momo**). Ada dua lapisan: **Petualangan Momo** (100 level cerita dalam 10 dunia, dimainkan di workshop) dan **Pustaka Latihan** (katalog skill ala IXL dengan soal yang di-generate, untuk latihan di rumah). Fasilitator workshop punya dashboard kelas realtime, dan orang tua menerima laporan + sertifikat lewat link. Aplikasi wajib tetap berjalan offline dan menyimpan data anak seminimal mungkin.

## A2. Lingkup build pertama (MVP)

**Masuk:**

- Petualangan Momo tingkat **Basic**: Dunia 1 (Urutan), Dunia 2 (Arah), Dunia 3 (Pola) = level 1–30. Untuk build awal cukup **10 level contoh per dunia yang bisa dimainkan**, sisanya boleh placeholder yang lolos validator.
- Pustaka Latihan versi awal: mesin generator + Skor Jago + **minimal 12 skill contoh** (4 matematika, 4 literasi, 4 sains). Target akhir MVP 60 skill, ditambah bertahap oleh tim konten.
- Masuk anak lewat kode kelas / QR + pilih warna Momo (tanpa password, tanpa email).
- Kota Momo (peta dunia), bintang 1–3, keping, lencana usaha.
- Dashboard fasilitator: buat kelas + QR, pantau progres realtime, tanda "macet > 3 menit", bekukan layar anak, tantangan kelas dengan timer.
- Halaman laporan orang tua + sertifikat PDF.
- Offline-first (PWA) + sinkronisasi event.
- Input suara (Bahasa Indonesia) di balik feature flag, selalu dengan cadangan tombol.

**Tidak masuk (jangan dibangun sekarang):** kartu fisik via kamera, obrolan bebas dengan AI/LLM, level 31–100, editor level visual untuk admin, pembayaran/pendaftaran online, aplikasi mobile native, fitur sosial/chat, leaderboard individu.

## A3. Tech stack (sudah diputuskan)

| Lapisan | Pilihan | Catatan |
| --- | --- | --- |
| Monorepo | pnpm workspaces | Tanpa Turborepo di awal; cukup script pnpm |
| Bahasa | TypeScript (strict) | Semua paket |
| App web | Vite + React 18 + React Router | Satu app dengan tiga area: `/play` (anak), `/fasilitator`, `/laporan/:token` (orang tua) |
| PWA | `vite-plugin-pwa` (Workbox) | Precache semua aset tingkat Basic |
| State | Zustand | Store kecil per fitur |
| Penyimpanan lokal | Dexie (IndexedDB) | Event log + cache progres |
| Validasi skema | Zod | Level, skill template, event |
| Grafik game | React + SVG + Framer Motion | Grid kecil (≤ 8×8) cukup dengan SVG; tidak perlu Phaser di MVP |
| Animasi karakter | Placeholder SVG dulu; siapkan komponen `<Momo mood="..."/>` agar bisa diganti Rive nanti | |
| Audio | Howler.js | Setiap teks punya `audioKey`; di dev boleh fallback ke `speechSynthesis` id-ID |
| Suara anak | Web Speech API (`SpeechRecognition`, `lang="id-ID"`) | Di balik flag `VITE_FEATURE_VOICE`; kosakata terbatas |
| Backend | Supabase (Postgres, Realtime, Edge Functions) | Buat adapter `SyncAdapter` dengan implementasi `mock` (lokal) dan `supabase` |
| PDF sertifikat | `pdf-lib` di client | Template sederhana |
| QR | `qrcode` | |
| Test | Vitest (unit), Playwright (e2e ringan) | Chromium sudah tersedia |
| Lint/format | ESLint + Prettier | |
| CI | GitHub Actions | `pnpm lint && pnpm test && pnpm validate:content` |

## A4. Struktur folder

```text
little-coder/
├─ PRD.md
├─ CLAUDE.md
├─ package.json            # scripts root
├─ pnpm-workspace.yaml
├─ packages/
│  └─ engine/              # TypeScript murni, TANPA React/DOM
│     ├─ src/
│     │  ├─ program/       # tipe Instruksi (AST) + penerjemah input -> program
│     │  ├─ interpreter/   # menjalankan program langkah demi langkah (deterministik)
│     │  ├─ levels/        # skema Zod level + evaluator per jenis puzzle
│     │  ├─ solver/        # BFS / iterative deepening: solvable, optimalSteps, shortcut detect
│     │  ├─ scoring/       # bintang level + Skor Jago
│     │  ├─ generator/     # generator soal dari skill template (seeded RNG)
│     │  ├─ adaptive/      # bantuan bertahap, lompat maju, rekomendasi
│     │  └─ events/        # tipe event + reducer progres
│     └─ test/
├─ apps/
│  └─ web/
│     ├─ src/
│     │  ├─ play/          # area anak: KotaMomo, LevelPlayer, Pustaka, BukuCatatan
│     │  ├─ facilitator/   # dashboard kelas
│     │  ├─ report/        # laporan orang tua + sertifikat
│     │  ├─ components/    # Momo, KartuBesar, Grid, TombolSuara, dst.
│     │  ├─ audio/         # Howler wrapper + fallback TTS
│     │  ├─ sync/          # SyncAdapter: mock | supabase, Dexie outbox
│     │  └─ i18n/id.json   # SEMUA teks UI (Bahasa Indonesia)
│     └─ public/assets/    # ilustrasi SVG, audio
├─ content/
│  ├─ levels/basic/world-1/*.json
│  ├─ levels/basic/world-2/*.json
│  ├─ levels/basic/world-3/*.json
│  ├─ skills/math/*.json
│  ├─ skills/literasi/*.json
│  ├─ skills/sains/*.json
│  └─ dialog/momo.id.json  # kalimat Momo + audioKey
├─ scripts/
│  └─ validate-content.ts  # jalankan Zod + solver + generator check untuk semua konten
└─ supabase/
   └─ migrations/*.sql
```

## A5. Model program (Catatan Momo)

Semua cara input (ketuk kartu, suara, nanti kamera) **wajib** diterjemahkan ke tipe yang sama:

```ts
export type Dir = 'up' | 'down' | 'left' | 'right';
export type Instr =
  | { op: 'move'; dir: Dir; n?: number }          // arah tetap (Basic)
  | { op: 'forward'; n?: number }                 // maju relatif arah hadap (Intermediate+)
  | { op: 'turn'; dir: 'left' | 'right' }         // belok relatif (mulai Dunia 6)
  | { op: 'jump' }
  | { op: 'pick' } | { op: 'drop' }
  | { op: 'paint'; color: string }
  | { op: 'repeat'; n: number; body: Instr[] }    // Dunia 5+
  | { op: 'if'; cond: Cond; then: Instr[]; else?: Instr[] } // Dunia 8+
  | { op: 'card'; id: string };                   // untuk puzzle susun urutan / pola
export type Cond = { sensor: 'wall-ahead' | 'puddle-ahead' | 'star-here'; negate?: boolean };
export type Program = Instr[];
```

**Interpreter:** fungsi murni `run(level, program) => Trace`, di mana `Trace` adalah daftar langkah `{ step, pos, facing, event?: 'bump'|'collect'|'goal', instrPath }`. `instrPath` menunjuk instruksi yang sedang jalan (untuk menyorot kalimat di Buku Catatan dan kalimat penyebab tabrakan). Batas aman: maksimal 200 langkah per eksekusi.

## A6. Jenis puzzle dan skema level

Jenis puzzle (field `type`): `sequence-cards`, `grid-move`, `pattern`, `classify`, `debug`, `grid-program`, `code`, `stage-event`, `number`, `measure`, `predict`. MVP wajib: `sequence-cards`, `grid-move`, `pattern`, `classify`, `number`, `predict`.

```ts
// field umum semua level
{
  id: string;            // "w2-l07"
  version: number;
  tier: 'basic' | 'intermediate' | 'advanced';
  world: number;         // 1..10
  index: number;         // 1..10 di dalam dunia
  role: 'intro' | 'practice' | 'twist' | 'challenge' | 'boss' | 'bonus';
  focus: 'logic' | 'math' | 'science';   // tiap dunia: 4 logic, 3 math, 3 science
  skills: string[];      // label untuk skor penguasaan, mis. ["sequencing","counting"]
  type: PuzzleType;
  story: { intro: string; success: string; hint?: string[] }; // audioKey
  variants?: { seeded: boolean; count: number };
  // + field khusus per type
}
```

Contoh level (harus ada di `content/`):

```json
{
  "id": "w1-l04", "version": 1, "tier": "basic", "world": 1, "index": 4,
  "role": "practice", "focus": "logic", "skills": ["sequencing"],
  "type": "sequence-cards",
  "cards": ["ambil-piring", "ambil-roti", "oles-selai", "siap-dimakan"],
  "validOrders": [
    ["ambil-piring", "ambil-roti", "oles-selai", "siap-dimakan"],
    ["ambil-roti", "ambil-piring", "oles-selai", "siap-dimakan"]
  ],
  "distractors": [],
  "story": { "intro": "vo_w1_l04_intro", "success": "vo_success_a" }
}
```

```json
{
  "id": "w2-l07", "version": 1, "tier": "basic", "world": 2, "index": 7,
  "role": "practice", "focus": "math", "skills": ["direction-fixed", "number-line"],
  "type": "grid-move",
  "grid": { "w": 5, "h": 5, "walls": [[2,1],[2,2]], "stars": [[4,0]], "numberedPath": true },
  "start": { "x": 0, "y": 4, "facing": "up" },
  "goal": { "x": 4, "y": 0 },
  "palette": ["up", "down", "left", "right"],
  "maxCards": 8,
  "stars": { "optimalSteps": "auto", "hintsAllowedFor2Stars": 0 },
  "story": { "intro": "vo_w2_l07_intro", "success": "vo_success_b" },
  "variants": { "seeded": true, "count": 5 }
}
```

```json
{
  "id": "w3-l05", "version": 1, "tier": "basic", "world": 3, "index": 5,
  "role": "practice", "focus": "science", "skills": ["classify", "living-nonliving"],
  "type": "classify",
  "groups": ["hidup", "tak-hidup"],
  "items": [
    { "id": "kucing", "group": "hidup" }, { "id": "batu", "group": "tak-hidup" },
    { "id": "pohon", "group": "hidup" }, { "id": "bola", "group": "tak-hidup" }
  ],
  "story": { "intro": "vo_w3_l05_intro", "success": "vo_success_c" }
}
```

**Aturan penting:**

- `sequence-cards` harus menerima **lebih dari satu urutan benar** (`validOrders`).
- Tingkat Basic: hanya `move` arah tetap (atas/bawah/kiri/kanan layar), **tidak ada** `turn`. Ini keputusan berbasis riset (lihat Bagian C).
- `grid.numberedPath: true` → setiap kotak jalur diberi nomor dan Momo menyebut angkanya saat melangkah.

## A7. Solver dan validator konten

`pnpm validate:content` harus gagal (exit code ≠ 0) kalau ada konten yang tidak memenuhi aturan berikut:

1. Semua JSON lolos skema Zod.
2. Untuk jenis grid: solver (BFS di atas state `{pos, facing, collected}` untuk program datar; iterative deepening untuk program dengan `repeat`/`if`) menemukan solusi dalam `maxCards`.
3. `optimalSteps: "auto"` diganti dengan panjang solusi terpendek (ditulis ke file `content/.generated/optimal.json`, bukan mengubah file sumber).
4. **Deteksi jalan pintas:** kalau level punya skill `loop`, solver harus membuktikan tidak ada solusi tanpa `repeat` dalam `maxCards`. Kalau ada, gagalkan validasi.
5. Tiap dunia berisi tepat 4 level `focus: logic`, 3 `math`, 3 `science` (level bonus dikecualikan). Selama konten belum lengkap, cukup beri peringatan (bukan error) dengan flag `--allow-incomplete`.
6. Setiap `audioKey` yang dirujuk ada di `content/dialog/momo.id.json` atau daftar kunci soal.
7. Setiap skill template menghasilkan 200 soal acak (seed tetap) tanpa error: jawaban tunggal, tidak ada pengecoh yang sama dengan jawaban, semua gambar ada.

## A8. Penilaian level (bintang)

- Bintang 1 = Momo sampai tujuan / jawaban benar.
- Bintang 2 = tanpa memakai petunjuk.
- Bintang 3 = jumlah instruksi ≤ `optimalSteps` (untuk puzzle tanpa konsep "hemat", bintang 3 = benar pada percobaan pertama).
- Bintang yang sudah didapat **tidak pernah berkurang** (simpan `max`).

**Bantuan bertahap per level:** gagal 2× → sorot instruksi yang salah; gagal 3× → Momo mencontohkan langkah pertama; gagal 5× → tawarkan varian lebih mudah. **Lompat maju:** 3 level berturut-turut bintang 3 tanpa petunjuk → tawarkan langsung ke level `challenge` dunia itu.

## A9. Skor Jago (Pustaka Latihan)

Implementasikan di `packages/engine/src/scoring/jago.ts` sebagai fungsi murni dengan test lengkap.

```text
state: { score: 0..100, visibleStage: 0..3, challengeCorrect: 0..3,
         jagoAt?: date, nextReviewAt?: date, needsReview: boolean }

visibleStage (yang dilihat anak, TIDAK PERNAH turun):
  0 Benih (score < 30) · 1 Tunas (30–59) · 2 Pohon (60–89) · 3 Berbuah (Jago, score = 100)
  visibleStage = max(visibleStage, stageOf(score))

Jawaban BENAR (score < 90):  score += 12 jika < 40, 8 jika < 70, 5 jika < 90
Jawaban SALAH (score < 90):  score -= 4 (tidak di bawah batas bawah stage yang sudah terlihat - 10)
                             -> tampilkan reteach + soal lebih mudah (turunkan difficulty band)
Mode tantangan (score >= 90): butuh 3 jawaban benar (challengeCorrect).
                             Salah -> reteach, challengeCorrect TIDAK di-reset, score tidak turun.
                             challengeCorrect == 3 -> score = 100, Jago.
Difficulty band dari score: < 40 -> band 0, < 75 -> band 1, else band 2.
Sesi: maksimal 10 soal untuk tier basic, 15 untuk lainnya; lalu ajak istirahat.
Ulangan: setelah Jago, nextReviewAt = +7 hari, lalu +30 hari.
         Gagal ulangan -> needsReview = true ("pohon perlu disiram"), score = 85, visibleStage tetap.
Status untuk orang tua: score >= 80 "Bisa", 100 "Jago".
```

## A10. Generator soal (Pustaka Latihan)

- Skill template (lihat contoh di Bagian B, "Generator soal") memakai RNG ber-seed (mis. `seedrandom`) agar soal bisa direproduksi untuk debug.
- `params` berisi rentang dan `constraint`; generator melakukan rejection sampling maksimal 100 kali, lalu error.
- `answer` dan `distractors` adalah ekspresi kecil. **Jangan pakai `eval`**: tulis evaluator ekspresi aman sederhana (+, −, ×, perbandingan, variabel).
- Jenis soal MVP (`itemType`): `listen-pick-image`, `tap-all`, `count-then-tap`, `drag-to-group`, `order`, `match`, `number-line`.
- Catat pengecoh yang dipilih anak di event (`chosenDistractor`) untuk analisis miskonsepsi.

Contoh skill wajib (buat file JSON-nya): `math.count.upto5`, `math.more-less.upto5`, `math.add.pictures.upto5`, `math.shape.flat`; `lit.letter.recognize.a-h`, `lit.sound.initial`, `lit.syllable.open.ba-bi-bu`, `lit.position-words`; `sci.living-nonliving`, `sci.five-senses`, `sci.animal-home`, `sci.hot-cold`.

## A11. Event dan sinkronisasi

```ts
type BaseEvent = { id: string /* uuid v4 */; childId: string; classId?: string; ts: number; appVersion: string };
type Event = BaseEvent & (
  | { type: 'level_start'; levelId: string; levelVersion: number; variant: number }
  | { type: 'program_run'; levelId: string; program: Program; result: 'goal'|'bump'|'incomplete'|'wrong' }
  | { type: 'hint_used'; levelId: string; hintLevel: 1|2|3 }
  | { type: 'level_complete'; levelId: string; levelVersion: number; stars: 1|2|3; durationMs: number; attempts: number }
  | { type: 'stuck'; levelId: string; idleMs: number }
  | { type: 'item_answer'; skillId: string; correct: boolean; band: number; chosenDistractor?: string }
  | { type: 'skill_state'; skillId: string; state: JagoState }
);
```

- Semua event ditulis ke Dexie (`outbox`) dulu, lalu dikirim oleh `SyncAdapter` saat online (retry dengan backoff).
- Server wajib **idempoten** berdasarkan `event.id`.
- Konflik progres: bintang = `max`, `visibleStage` = `max`, Skor Jago = state dengan `ts` terbaru.
- Progres level disimpan per `levelId + levelVersion`.

## A12. Skema database (Supabase)

```sql
-- ringkas; Claude Code boleh melengkapi index dan RLS
create table facilitators (id uuid primary key default gen_random_uuid(), email text unique not null, name text);
create table classes (id uuid primary key default gen_random_uuid(), facilitator_id uuid references facilitators,
  code text unique not null, event_name text, world int, starts_at timestamptz, frozen boolean default false);
create table children (id uuid primary key default gen_random_uuid(), class_id uuid references classes,
  nickname text not null, momo_color text not null, report_token text unique not null, created_at timestamptz default now());
create table parent_contacts (child_id uuid references children primary key, contact text, consent_at timestamptz not null);
create table events (id uuid primary key, child_id uuid references children, class_id uuid, type text not null,
  payload jsonb not null, ts timestamptz not null);
create table level_progress (child_id uuid references children, level_id text, level_version int, stars int,
  attempts int, hints int, primary key (child_id, level_id, level_version));
create table skill_mastery (child_id uuid references children, skill_id text, state jsonb, primary key (child_id, skill_id));
```

- **Privasi:** tabel anak hanya berisi `nickname` + `momo_color`. Tidak ada foto, email, tanggal lahir, atau rekaman suara. Kontak orang tua di tabel terpisah dan hanya dengan `consent_at`.
- RLS: fasilitator hanya bisa membaca kelasnya sendiri; anak menulis event lewat Edge Function dengan kode kelas; laporan orang tua dibaca lewat `report_token`.

## A13. Layar yang harus ada (MVP)

**Anak (`/play`):** Masuk (scan QR / ketik kode kelas oleh kakak → pilih warna Momo → ketik atau pilih nama panggilan dari daftar) · Kota Momo (peta dunia + Pustaka) · Pemutar level (grid/kartu di kiri, Buku Catatan di kanan, kartu besar di bawah, tombol Jalankan) · Hasil level (bintang + reaksi Momo + keping) · Pustaka (rak skill per domain dengan tanaman) · Sesi latihan · Kamar Momo (aksesori dari keping).

**Fasilitator (`/fasilitator`):** Login (magic link) · Buat kelas (nama event, dunia) → tampilkan QR + kode · Dashboard (kartu per anak: level sekarang, bintang, warna kuning jika macet > 3 menit) · Tombol "Semua lihat ke depan" (bekukan layar) · Tantangan kelas (bintang bersama + timer opsional) · Tutup kelas → buat link laporan.

**Orang tua (`/laporan/:token`):** Ringkasan (dunia yang diselesaikan, bintang, skill yang Jago per area), rekaman perjalanan Momo (replay dari `program_run` terakhir yang sukses), unduh sertifikat PDF.

## A14. Aturan UX yang wajib

- Target sentuh minimal 64×64 px; kartu bisa **diketuk** untuk ditambahkan (drag opsional).
- Tingkat Basic: **tanpa teks yang harus dibaca**. Setiap instruksi dan kartu punya suara (diputar otomatis saat muncul dan saat diketuk) dan gambar.
- Maksimal 4 jenis kartu tampil sekaligus di tingkat Basic.
- Saat salah: Momo bereaksi lucu ("Aduh, Momo nabrak!"), instruksi penyebab berkedip pelan. **Tidak ada** kata "salah/gagal", warna merah besar, atau suara negatif.
- Pujian menyebut usaha/strategi, bukan kepintaran ("Kamu teliti banget!", bukan "Kamu pintar!").
- Tidak ada timer di level utama, tidak ada nyawa, tidak ada streak, tidak ada peringkat individu, tidak ada iklan, tidak ada link keluar di area anak.
- Anak tidak melihat angka skor; hanya bintang, tanaman, keping, lencana.
- Jangan pakai emoji di UI final; pakai ilustrasi SVG sendiri (emoji tampil beda di tiap OS).
- Kontras tinggi; semua fitur bisa dipakai dengan mouse saja.
- Semua teks lewat `i18n/id.json`; struktur siap untuk `en.json`.

## A15. Fitur suara (flag `VITE_FEATURE_VOICE`)

- Kosakata dikenali: maju, mundur, atas, bawah, kiri, kanan, belok, lompat, ambil, taruh, ulangi, stop, dan angka satu–sepuluh.
- Setiap hasil pengenalan **selalu dikonfirmasi** Momo sebelum dijalankan ("Maju tiga, betul?") dengan tombol Ya/Tidak bergambar.
- Kalau tidak yakin / tidak dikenali: tampilkan 2–3 pilihan bergambar, jangan minta mengulang terus.
- Offline atau browser tidak mendukung: tombol mikrofon disembunyikan otomatis, tanpa pesan error ke anak.
- Audio tidak pernah disimpan atau dikirim ke server kita.

## A16. Milestone dan kriteria penerimaan

| # | Milestone | Kriteria penerimaan |
| --- | --- | --- |
| M0 | Scaffold | Monorepo jalan; `pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm validate:content` ada dan hijau; CI GitHub Actions; CLAUDE.md dibuat |
| M1 | Engine inti | Tipe program, interpreter, evaluator `sequence-cards`/`grid-move`/`pattern`/`classify`, solver + deteksi jalan pintas, bintang, bantuan bertahap. Coverage engine ≥ 90%. Validator menolak level yang tidak bisa diselesaikan (ada test-nya) |
| M2 | Petualangan (anak) | Kota Momo + pemutar level; 10 level Dunia 1 dan 10 level Dunia 2 bisa dimainkan end-to-end dengan audio (fallback TTS), Buku Catatan tersorot saat eksekusi, reaksi Momo, bintang tersimpan lokal. Playwright: selesaikan w1-l01 dan w2-l01 |
| M3 | Pustaka Latihan | Generator + evaluator ekspresi aman + 7 jenis soal + Skor Jago + 12 skill contoh. Test Skor Jago mencakup: tahap tidak turun, mode tantangan tidak menghukum, ulangan terjadwal |
| M4 | Offline & sync | PWA bisa dipasang; dengan jaringan dimatikan, level dan Pustaka tetap jalan; event masuk outbox dan terkirim saat online; server idempoten (test kirim ganda) |
| M5 | Fasilitator | Buat kelas + QR; anak masuk via kode; dashboard realtime; tanda macet > 3 menit; bekukan layar bekerja < 2 detik; tantangan kelas |
| M6 | Laporan orang tua | Halaman laporan via token; replay perjalanan Momo; sertifikat PDF; skor penguasaan per area |
| M7 | Suara + polish | Voice di balik flag sesuai A15; audit aksesibilitas; performa (level terbuka < 2 detik di laptop kelas bawah); paket Basic < 15 MB; Dunia 3 lengkap 10 level |

## A17. Hal yang tidak boleh dilakukan Claude Code

- Menyimpan data pribadi anak selain nama panggilan dan warna Momo.
- Menyimpan atau mengirim rekaman suara.
- Memakai `eval` / `new Function` untuk ekspresi konten.
- Menambah drag & drop blok kecil sebagai satu-satunya cara input.
- Memakai belok relatif (`turn`) di tingkat Basic.
- Menampilkan skor angka, peringkat individu, nyawa, streak, atau timer di level utama untuk anak.
- Menyalin soal atau aset dari IXL, Code.org, ScratchJr, atau platform lain. IXL hanya acuan struktur.
- Menambah obrolan AI/LLM ke area anak.
- Mengambil keputusan di luar PRD tanpa bertanya (catat di `docs/decisions.md` setelah disetujui).

## A18. Keputusan yang masih terbuka (pakai default ini sampai diputuskan)

| Pertanyaan | Default sementara |
| --- | --- |
| Nama produk & karakter (Little Coder/Little Thinkers, Momo/Riko) | Pakai konstanta `APP_NAME` dan `CHARACTER_NAME` di satu file config; default "Little Coder" dan "Momo" |
| Literasi: Bahasa Indonesia saja atau + Inggris | Bahasa Indonesia saja, struktur i18n siap Inggris |
| Backend final | Supabase, di balik `SyncAdapter` sehingga bisa diganti |
| Model bisnis Pustaka | Tidak ada paywall di MVP; siapkan flag `entitlement` per anak |
| Ilustrasi & suara final | Placeholder SVG sederhana + TTS browser; nama file aset mengikuti `audioKey` agar mudah diganti |

---

# BAGIAN B — PRD LENGKAP

## PRD — Platform & Silabus Little Coder (Cleo Kids)

28 September 2026 · Rizki Syaputra · Status: Draf v0.5

### Kenapa Little Coder ada

Kami ingin anak 5–8 tahun belajar berpikir seperti programmer dengan cara yang terasa seperti bermain bersama teman, bukan seperti mengoperasikan software.

Di dalam platform yang sama, anak juga mengasah matematika (dengan acuan pendekatan Singapura), literasi, dan sains. Semuanya lewat dua pintu: Petualangan Momo yang dimainkan di workshop, dan Pustaka Latihan yang terinspirasi IXL untuk latihan di rumah. Jadi satu platform melatih lima hal: logika & coding, spasial, matematika, literasi, dan sains.

Sebagian besar platform coding anak, seperti Code.org, Blockly Games dan ScratchJr, memakai model menyusun blok. Model itu efektif, tapi bagi anak 5–6 tahun menarik-lepas blok kecil dengan mouse terasa seperti tugas. Semuanya juga berbahasa Inggris dan tidak bisa diatur mengikuti alur workshop Cleo Kids.

Little Coder mengambil jalan lain. Anak berbicara, mencontohkan gerakan dan memakai kartu untuk memberi instruksi ke sebuah karakter bernama Momo. Logika yang dipelajari tetap sama (urutan, pengulangan, kondisi), tapi caranya lebih dekat dengan cara anak berinteraksi sehari-hari.

Di Batam, kursus coding yang ada (Timedoor, OSEDU, Kalananti) kebanyakan berupa kelas rutin untuk anak yang lebih besar. Workshop event untuk usia 5–8 tahun dengan pendekatan seperti ini masih kosong.

### Kenalan dengan Momo

Momo adalah robot kecil yang baru datang ke kota dan belum tahu apa-apa. Anak berperan sebagai gurunya. Setiap kali anak mengajari Momo, sebenarnya anak sedang menulis program, hanya saja tidak pernah terasa seperti itu.

Peran "guru" ini disengaja. Anak biasanya lebih tekun dan lebih sabar memperbaiki kesalahan ketika merasa sedang membantu teman, dibanding ketika merasa sedang diuji.

#### Tiga cara anak mengajari Momo

**1. Bicara langsung.** Anak cukup berkata "Momo, maju dua langkah, terus belok kiri!". Momo mengulang instruksinya dengan suara ("Oke, maju dua, lalu belok kiri ya?") sebelum bergerak, jadi anak belajar bahwa instruksi harus jelas. Kalau instruksinya kabur, Momo bertanya balik: "Kiri yang mana? Kiri Momo atau kiri kamu?" Ini cara alami mengenalkan sudut pandang spasial.

**2. Kartu ajaib.** Anak menyusun kartu bergambar di meja (panah, "ulangi", "kalau ada batu"), lalu menunjukkannya ke kamera laptop. Momo "membaca" kartu satu per satu dan menjalankannya. Kartu ini menyambungkan permainan di lantai dengan permainan di layar, dan bisa dibawa pulang.

**3. Tunjukkan caranya.** Anak menggerakkan Momo selangkah demi selangkah atau menggambar jalur di peta. Momo mencatat semuanya. Setelah itu anak bisa berkata "Momo, ulangi yang tadi tiga kali". Di sinilah anak menemukan sendiri konsep pengulangan.

Ketiga cara ini selalu bisa dipakai bergantian. Venue event sering ramai, jadi setiap instruksi suara selalu punya cadangan berupa tombol gambar besar.

#### Buku Catatan Momo

Apa pun cara anak memberi instruksi, hasilnya muncul di **Buku Catatan Momo**: daftar kalimat pendek bergambar yang dibacakan Momo, misalnya "Maju 2 langkah", "Belok kiri", "Ulangi 3 kali: lompat". Buku catatan inilah programnya. Anak bisa mengetuk satu kalimat untuk mengubahnya, menukar urutannya, atau menghapusnya.

#### Kalau Momo salah jalan

Momo tidak pernah bilang "salah" atau "gagal". Kalau menabrak, Momo tertawa kecil dan berkata "Aduh, Momo nabrak! Yuk cek catatan Momo, di mana ya kelirunya?" Kalimat yang menyebabkan tabrakan berkedip pelan. Anak belajar debugging dengan cara menolong temannya.

Untuk MVP, dialog Momo ditulis dan direkam sebelumnya, bukan obrolan bebas dengan AI. Dengan begitu isi percakapan dengan anak selalu aman dan bisa diprediksi.

### Sehari di workshop

Cara paling mudah memahami produk ini adalah mengikuti satu anak dari datang sampai pulang.

Alya, 6 tahun, datang bersama ibunya. Kakak fasilitator sudah menyiapkan kelas di laptop sejak pagi, jadi di layar sudah tampil kode QR. Alya memindai QR, memilih warna Momo miliknya (ungu), dan Momo menyapa: "Halo Alya! Momo tersesat, mau bantu Momo pulang?"

Sebelum menyentuh laptop, Alya bermain "Human Robot" di lantai: temannya jadi Momo, Alya memberi perintah. Setelah itu di laptop, Alya mengajari Momo pulang ke rumah. Awalnya lewat tombol gambar, lalu mulai berani bicara langsung. Di misi keempat Momo menabrak pohon. Alya membuka Buku Catatan Momo, melihat kalimat "Belok kanan" yang berkedip, lalu menggantinya jadi "Belok kiri". Momo sampai rumah dan melompat kegirangan.

Sementara itu, di dashboard kakak fasilitator, nama Raka berubah kuning karena sudah 3 menit tidak maju. Kakak menghampiri Raka dan memberi petunjuk. Di akhir sesi, fasilitator menutup kelas, dan ibu Alya menerima link berisi rekaman perjalanan Momo buatan Alya serta sertifikatnya.

**Alur satu sesi (3 peran):**

1. Fasilitator: buat kelas + kode QR.
2. Anak: scan QR, pilih warna Momo.
3. Anak: mengajari Momo misi demi misi (kalau Momo nabrak, cek catatannya lalu coba lagi).
4. Fasilitator: pantau dashboard (progres + sinyal macet) dan bantu yang macet.
5. Fasilitator: tutup sesi, kirim hasil.
6. Orang tua: buka laporan + sertifikat.

Pola yang sama berlaku untuk setiap modul. Hanya cerita dan tantangannya yang berganti.

### Perjalanan belajar: 100 level dalam 3 tingkat

Silabus sekarang terdiri dari 100 level, dibagi ke 10 dunia (10 level per dunia) dan 3 tingkat kesulitan. Satu dunia = satu workshop, jadi anak yang ikut semua event akan menyelesaikan seluruh perjalanan Momo.

**Peta 100 level:**

| Tingkat | Level | Usia (panduan) | Dunia |
| --- | --- | --- | --- |
| Basic (versi pertama) | 1–30 | 5–6 th, tanpa teks | 1 Urutan (urutan harian) · 2 Arah (grid, arah tetap) · 3 Pola (pola, kelompok) |
| Intermediate | 31–70 | 5–8 th | 4 Detektif (debugging) · 5 Ulangi (pengulangan) · 6 Koki (belok relatif) · 7 Melukis (dekomposisi) |
| Advanced | 71–100 | 7–8 th | 8 Hujan (kondisi jika) · 9 Sandi (kode, biner) · 10 Panggung (event, berkarya) |

Usia pada tiap tingkat hanya panduan, bukan kunci. Anak 5 tahun yang cepat boleh lanjut ke Intermediate, dan anak 8 tahun yang baru mulai tetap memulai dari Basic dengan tempo lebih cepat.

#### Tingkat Basic (level 1–30): tanpa teks sama sekali

**Dunia 1 — Urutan Sehari-hari.** Sebelum bergerak di peta, anak menyusun urutan kegiatan yang sudah ia kenal: pakai kaus kaki dulu baru sepatu, lalu ambil piring, ambil roti, oles selai, siap dimakan. Konsep: urutan (sequencing) tanpa beban spasial. Level awal berisi 2 kartu, level akhir 5 kartu dengan satu kartu pengecoh.

**Dunia 2 — Momo Tersesat.** Anak menuntun Momo di peta kotak-kotak memakai **arah tetap**: panah atas, bawah, kiri, kanan layar, bukan "belok". Keputusan ini mengikuti riset bahwa anak 5–6 tahun belum bisa memakai kiri-kanan dari sudut pandang orang lain. Grid naik dari 3×3 ke 6×6, lalu muncul rintangan.

**Dunia 3 — Pola & Kelompok.** Anak melanjutkan pola (merah, biru, merah, ...), lalu mengelompokkan barang Momo berdasarkan warna, bentuk, atau ukuran. Konsep: pola dan cara komputer menyortir data.

#### Tingkat Intermediate (level 31–70)

**Dunia 4 — Detektif Bug.** Catatan Momo diacak, dan anak mencari lalu memperbaiki langkah yang salah. Awalnya hanya 1 kesalahan, lalu 2 kesalahan, lalu kesalahan yang tidak langsung terlihat.

**Dunia 5 — Momo Capek Mengulang.** Level dengan batas jumlah kartu memaksa anak memakai "ulangi". Konsep: pengulangan.

**Dunia 6 — Momo Jadi Koki.** Momo mengambil bahan sesuai resep di dapur. Di dunia ini **belok relatif** ("belok kiri Momo") baru dikenalkan, dibantu tangan Momo yang berwarna berbeda. Konsep: algoritma dan sudut pandang.

**Dunia 7 — Momo Melukis.** Anak memecah gambar besar menjadi bagian kecil, lalu memakai pengulangan untuk bagian yang sama. Konsep: dekomposisi.

#### Tingkat Advanced (level 71–100)

**Dunia 8 — Hujan di Kota Momo.** Genangan muncul di tempat acak, jadi satu aturan "kalau ada genangan, lompat" harus berlaku untuk semua keadaan. Konsep: kondisi.

**Dunia 9 — Pesan Rahasia.** Anak membaca dan menulis pesan dengan kode titik hitam-putih. Konsep: data sebagai kode (pengenalan biner).

**Dunia 10 — Panggung Momo.** Anak menyutradarai pertunjukan: apa yang terjadi saat penonton bertepuk tangan atau saat lampu menyala. Konsep: event, lalu berkarya bebas. Level 100 adalah pertunjukan besar yang menggabungkan semua konsep.

#### Pola di dalam setiap dunia

Setiap dunia memakai pola 10 level yang sama, supaya anak merasakan irama yang bisa ditebak:

1. **Level 1–2: kenalan.** Momo mencontohkan, anak meniru. Hampir pasti berhasil.
2. **Level 3–7: latihan.** Tantangan naik sedikit demi sedikit.
3. **Level 8: kejutan.** Satu variasi baru, misalnya peta berputar atau kartu pengecoh.
4. **Level 9: tantangan.** Menggabungkan konsep dunia ini dengan dunia sebelumnya.
5. **Level 10: misi besar.** Level cerita yang menutup dunia dan membuka dunia berikutnya.

Setiap dunia juga punya 3 level bonus tersembunyi yang tidak dihitung dalam 100 level, untuk anak yang cepat.

#### Irama setiap workshop

Satu workshop membahas satu dunia: pembukaan cerita dan permainan di lantai (20 menit), percobaan sains di meja (15 menit), mengenalkan misi di layar besar (5 menit), level 1–7 di laptop (35 menit), istirahat camilan (15 menit), level 8–9 sebagai tantangan kelas (20 menit), level 10 dan level bonus (20 menit), lalu pertunjukan karya dan foto bersama (20 menit).

### Math dan sains di setiap dunia

Math dan sains tidak dibuat sebagai aplikasi atau pelajaran terpisah. Keduanya masuk ke dalam cerita dan misi Momo yang sama, jadi Petualangan Momo melatih logika & coding, spasial, matematika, dan sains sekaligus. Literasi hadir lewat cerita dan dialog Momo, dan dilatih lebih dalam di Pustaka Latihan.

#### Pembagian level di setiap dunia

Dari 10 level di tiap dunia, **4 level fokus logika dan coding, 3 level fokus matematika, dan 3 level fokus sains**. Semuanya tetap dimainkan dengan cara yang sama, yaitu mengajari Momo. Contohnya:

- **Level matematika (Dunia 5):** Momo berdiri di garis bilangan. Anak menyuruh "ulangi 3 kali: lompat 2", dan Momo mendarat di angka 6. Tanpa disadari, anak sedang mengenal 3 × 2.
- **Level sains (Dunia 4):** Momo bertanya, "Kalau batu dan daun dimasukkan ke air, mana yang tenggelam?" Anak menebak, simulasi menunjukkan hasilnya, lalu anak membetulkan tebakan yang meleset. Ini debugging versi sains.

#### Isi per dunia

| Dunia | Logika & coding | Matematika (acuan Singapura) | Sains | Percobaan di meja workshop |
| --- | --- | --- | --- | --- |
| 1 · Urutan | Urutan langkah | Membilang 1–10, urutan ke- (pertama, kedua, ketiga) | Siklus tumbuhan: biji, tunas, tanaman, bunga | Menanam biji kacang hijau, dibawa pulang |
| 2 · Arah | Arah tetap di grid | Jalur bernomor 1–20 sebagai garis bilangan, kata posisi (atas, bawah, di antara) | Rumah hewan: darat, air, udara | Berjalan di garis bilangan di lantai |
| 3 · Pola | Pola, mengelompokkan | Pola bentuk dan bilangan, bentuk datar, grafik gambar sederhana | Makhluk hidup dan benda tak hidup | Memilah kartu dan benda nyata |
| 4 · Detektif | Debugging | Lebih banyak, lebih sedikit, sama dengan; memeriksa hitungan Momo | Tenggelam atau terapung | Baskom air dan benda sehari-hari |
| 5 · Ulangi | Pengulangan | Lompat hitung 2, 5, 10 sebagai dasar perkalian | Siklus siang-malam, siklus air | Senter dan bola untuk siang-malam |
| 6 · Koki | Algoritma, belok relatif | Mengukur (lebih panjang, lebih berat), takaran, uang untuk belanja bahan | Perubahan wujud: es mencair, adonan mengembang | Balapan es batu mencair |
| 7 · Melukis | Dekomposisi | Number bonds (7 = 3 + 4), simetri, luas dengan menghitung kotak | Mencampur warna | Cat air: merah + kuning = ? |
| 8 · Hujan | Kondisi jika-maka | Penjumlahan dan pengurangan sampai 20, membandingkan (>, <) sebagai syarat | Cuaca, tumbuhan butuh air dan cahaya | Tisu menyerap air berwarna |
| 9 · Sandi | Kode, biner | Nilai tempat (puluhan dan satuan), bilangan sampai 100 | Magnet: menarik atau tidak | Magnet dan benda di sekitar |
| 10 · Panggung | Event | Membaca jam, urutan waktu, grafik hasil survei penonton | Sebab-akibat, cahaya dan bayangan | Senter dan wayang bayangan |

Topik matematika diambil dari tujuan numerasi TK Singapura (NEL) dan silabus kelas 1–2 SD MOE 2021. Topik sains diambil dari lima tema sains Singapura (keragaman, siklus, energi, interaksi, sistem) dalam versi paling sederhana, sesuai area "Discovery of the World" untuk usia TK. Detail risetnya ada di ringkasan riset (Bagian C).

#### Matematika: benda dulu, gambar, baru angka

Semua konsep matematika mengikuti pendekatan **Konkret – Gambar – Simbol (CPA)** yang dipakai Singapura:

1. **Konkret:** di meja workshop, anak memegang benda nyata (manik, balok, kartu angka) sebelum menyentuh laptop.
2. **Gambar:** di dunia Momo, konsep yang sama muncul sebagai gambar: jalur bernomor, kotak sepuluh (ten-frame), gambar number bonds.
3. **Simbol:** angka dan tanda (+, −, =, >) baru muncul di level akhir.

Tahap ini terikat pada tingkat. **Basic** hanya konkret dan gambar, tanpa angka tertulis kecuali nomor jalur. **Intermediate** memakai gambar dengan angka. **Advanced** memakai simbol dan mulai mengenalkan model batang (bar model) sederhana untuk soal cerita penjumlahan dan pengurangan, ciri khas matematika Singapura.

Satu keputusan berbasis riset: di setiap grid, **jalur Momo diberi nomor dan Momo menyebut angkanya setiap melangkah**. Studi Siegler & Ramani (2008) menunjukkan cara sesederhana ini, cukup 4 × 15 menit, sudah memperbaiki pemahaman garis bilangan anak prasekolah secara besar.

#### Sains: tebak – coba – ceritakan

Setiap level sains mengikuti tiga langkah:

1. **Tebak:** Momo bertanya, dan anak memilih tebakannya ("Menurutmu es mencair lebih cepat di tangan atau di piring?").
2. **Coba:** simulasi di laptop menunjukkan hasilnya. Di workshop, anak juga mencobanya dengan benda nyata di meja.
3. **Ceritakan:** Momo mengajak anak menjelaskan dengan kata-katanya sendiri (dipilih dari gambar untuk anak yang belum membaca), dan tebakan yang meleset diperbaiki tanpa dianggap salah.

Simulasi di laptop tidak pernah menggantikan percobaan nyata. Karena itu setiap workshop punya slot 15 menit untuk percobaan sains di meja, dan setiap dunia punya paket alat percobaan yang murah dan aman.

### Pustaka Latihan (terinspirasi IXL)

Selain 100 level Petualangan Momo, platform punya lapisan kedua: **Pustaka Latihan**, yaitu ratusan skill kecil yang bisa dilatih kapan saja, mirip cara [IXL](https://www.ixl.com/math/pre-k) menyusun materinya. Petualangan membuat anak jatuh cinta di workshop. Pustaka membuat kemampuannya benar-benar terlatih di rumah.

**Dua pintu belajar, satu profil penguasaan:**

- Petualangan Momo (100 level cerita, workshop) → Profil penguasaan (5 domain, Skor Jago per skill)
- Pustaka Latihan (ratusan skill, di rumah) → Profil penguasaan
- Profil penguasaan → Rekomendasi (3 skill untuk hari ini) dan Laporan (orang tua dan fasilitator)

Kedua pintu mengisi satu profil penguasaan yang sama. Kalau di Petualangan anak kesulitan menjumlahkan, Pustaka akan merekomendasikan skill "penjumlahan sampai 5 dengan gambar" untuk dilatih di rumah. Sebaliknya, skill yang sudah dikuasai di Pustaka membuat level terkait di Petualangan terasa lebih mudah.

#### Yang dipelajari dari IXL

- **Materi dipecah sangat kecil dan berurutan.** Matematika pra-TK IXL saja berisi 25 kategori, dari "bilangan sampai 3" sampai "pengurangan sampai 10". ELA pra-TK berisi 121 skill, dan sains TK berisi 65 skill. Setiap skill melatih satu hal saja.
- **Rentang bilangan naik pelan-pelan:** 3, lalu 5, 7, 9, 10, 20. Prinsip ini kita pakai untuk semua domain.
- **Soal tidak ada habisnya** dan menyesuaikan kemampuan anak: benar makin sulit, salah makin mudah.
- **Saat salah, anak langsung diberi penjelasan** langkah demi langkah.
- **Susunannya per kelas dan per topik,** sehingga orang tua mudah melihat posisi anak.

#### Yang sengaja dibuat berbeda

- **Konteks lokal:** uang Rupiah, nama dan benda Indonesia, belajar membaca lewat suku kata (ba-bi-bu), bukan fonik bahasa Inggris.
- **Ramah anak yang belum bisa membaca:** semua soal dibacakan, dan jawaban berupa gambar.
- **Skor tidak menghukum kesalahan** (lihat Skor Jago di bawah). Ini jawaban atas kritik yang paling sering ditujukan pada SmartScore IXL.
- **Terhubung ke cerita Momo dan workshop,** bukan sekadar lembar latihan digital.
- **Isi soal dibuat sendiri.** IXL hanya dipakai sebagai inspirasi struktur, bukan disalin soalnya.

### Katalog skill per domain

Usulan awal: sekitar **300 skill** di lima domain, disusun dalam tiga tingkat yang sama dengan Petualangan Momo. Isinya diadaptasi dari struktur IXL (matematika pra-TK dan TK, ELA pra-TK, sains TK–kelas 2), lalu disesuaikan dengan acuan Singapura dan konteks Indonesia.

| Domain | Basic (5–6 th) | Intermediate (6–7 th) | Advanced (7–8 th) | Target skill (usulan) |
| --- | --- | --- | --- | --- |
| Matematika | Bilangan dan membilang sampai 3, 5, 10; satu lebih dan satu kurang; membandingkan kelompok; pola; posisi; bentuk datar | Bilangan sampai 20; penjumlahan dan pengurangan sampai 10 dengan gambar; number bonds; bentuk ruang; ukuran (panjang, berat); uang Rupiah | Bilangan sampai 100; nilai tempat; penjumlahan dan pengurangan sampai 20; lompat hitung 2, 5, 10; jam; grafik gambar; setengah dan seperempat; model batang sederhana | 90 |
| Literasi (Bahasa Indonesia) | Huruf A–Z; huruf besar dan kecil; bunyi awal kata; kata posisi (di atas, di dalam); lawan kata; mengelompokkan benda | Suku kata terbuka (ba-bi-bu-be-bo); menggabung suku kata menjadi kata; kata sehari-hari; rima dan sajak; kata benda, kata kerja, kata sifat | Membaca kalimat pendek; urutan kejadian dalam cerita; apa yang terjadi selanjutnya; perasaan tokoh; nyata atau khayalan | 90 |
| Sains | Makhluk hidup dan benda tak hidup; lima indera; bentuk dan warna benda; panas dan dingin | Kebutuhan hewan dan tumbuhan; bagian tubuh hewan dan tumbuhan; tempat hidup hewan; dorong dan tarik; cuaca | Wujud benda (padat, cair); cahaya dan bunyi; magnet; siklus air; siang dan malam; 3R (kurangi, pakai ulang, daur ulang); merancang solusi sederhana | 60 |
| Logika & coding | Urutan; pola; mengelompokkan | Debugging; pengulangan; algoritma | Kondisi; kode; event | 30 |
| Spasial | Kiri-kanan untuk diri sendiri; arah tetap di grid; mencocokkan bentuk | Membalik dan memutar bentuk; peta sederhana; belok relatif | Sudut pandang lain; simetri; membangun bentuk 3D dari gambar | 30 |

**Domain logika & coding dan spasial** sebagian besar dilatih lewat Petualangan Momo. Di Pustaka, keduanya hadir sebagai latihan singkat untuk mengulang.

**Literasi memakai Bahasa Indonesia sebagai jalur utama.** Bahasa Indonesia ditulis hampir persis seperti diucapkan, jadi belajar membaca paling alami lewat suku kata, bukan fonik seperti di IXL ELA. Jalur bahasa Inggris bisa ditambahkan sebagai paket terpisah kalau ada permintaan.

**Setiap skill diberi label kurikulum:** Kurikulum Merdeka (Fase Fondasi untuk PAUD dan Fase A untuk kelas 1–2), NEL dan silabus MOE Singapura, serta pemetaan ke kategori IXL untuk referensi internal. Dengan label ini, laporan untuk orang tua dan sekolah bisa ditampilkan dalam bahasa kurikulum yang mereka kenal.

#### Bentuk soal

Semua domain memakai kumpulan bentuk soal yang sama, supaya anak cepat terbiasa:

- **Dengar lalu pilih gambar:** "Mana yang dimulai dengan bunyi /b/?"
- **Ketuk semua yang cocok:** "Ketuk semua hewan yang hidup di air."
- **Hitung lalu ketuk angka,** memakai kotak sepuluh atau gambar benda.
- **Seret ke kelompok:** makhluk hidup atau benda tak hidup.
- **Susun urutan:** kejadian cerita, siklus tumbuhan, bilangan.
- **Jodohkan:** huruf besar dengan huruf kecil, benda dengan bayangannya.
- **Garis bilangan:** letakkan angka di garis.
- **Tulis atau ketik angka:** hanya di tingkat Advanced.
- **Ucapkan:** membaca suku kata dengan suara, di versi berikutnya dan dengan batasan yang sama seperti fitur suara Momo.

### Skor Jago: penguasaan per skill

Setiap skill di Pustaka punya **Skor Jago** 0–100. Cara kerjanya mirip SmartScore IXL: ini bukan persentase jawaban benar, melainkan perkiraan seberapa dikuasai sebuah skill. Bedanya, Skor Jago dirancang supaya anak tidak pernah merasa dihukum karena salah.

**Masalah yang dihindari.** [SmartScore IXL](https://blog.ixl.com/2020/11/11/ixl-smartscore-the-key-to-mastery-based-learning/) memakai ambang 80 (mahir), 90 (masuk "Challenge Zone"), dan 100 (menguasai). Di atas 90, satu jawaban salah bisa mengurangi skor jauh lebih banyak daripada tambahan dari satu jawaban benar. [Kritik yang sering muncul](https://www.boddlelearning.com/article/ixl-punishes-wrong-answers): anak membaca skor yang turun sebagai penilaian atas dirinya, lalu menghindari soal sulit. Untuk anak 5–8 tahun, risikonya lebih besar lagi.

**Cara Skor Jago bekerja:**

- **Anak tidak melihat angka.** Anak melihat tanaman yang tumbuh untuk setiap skill: benih, tunas, pohon, lalu pohon berbuah saat Jago. Tanaman tidak pernah mengecil.
- **Angka hanya untuk sistem, orang tua, dan fasilitator.** Status 80 = "Bisa", 100 = "Jago".
- **Saat salah, Momo mengajari dulu.** Momo menunjukkan contoh dengan gambar, lalu memberi soal yang lebih mudah. Perkiraan internal menyesuaikan, tapi tampilan anak tidak mundur.
- **Tahap akhir yang lembut.** Di atas 90, anak cukup menjawab 3 soal tantangan dengan benar untuk menjadi Jago. Kalau salah, Momo menjelaskan dan anak mencoba soal tantangan lain, tanpa kehilangan kemajuan yang terlihat.
- **Sesi pendek.** Satu sesi skill maksimal 10 soal (sekitar 5 menit) untuk anak 5–6 tahun, lalu Momo mengajak istirahat atau berpindah skill.
- **Mengulang supaya tidak lupa.** Skill yang sudah Jago muncul lagi sebagai soal ulangan singkat setelah sekitar seminggu dan sebulan. Kalau anak lupa, pohonnya tidak mengecil, hanya diberi tanda "perlu disiram".

**Terhubung ke hadiah.** Setiap skill yang mencapai Jago memberi keping Momo dan satu stiker di album koleksi per domain. Skor Jago juga menjadi dasar **skor penguasaan per area** di laporan orang tua dan dasar rekomendasi "3 skill untuk hari ini".

### Skor, bintang, dan hadiah

Sistem hadiah dirancang agar anak ingin terus bermain karena merasa Momo dan kotanya tumbuh berkat dirinya, bukan karena takut kehilangan sesuatu atau kalah dari teman.

#### Yang dilihat anak

| Hadiah | Cara mendapatkan | Gunanya |
| --- | --- | --- |
| Bintang (1–3 per level, maksimal 300) | 1 = Momo sampai tujuan, 2 = tanpa petunjuk, 3 = memakai langkah paling hemat | Ukuran utama kemajuan, membuka level bonus |
| Keping Momo | Dari setiap bintang dan level bonus | Menghias kamar Momo dan membeli aksesori (topi koki, syal, kacamata). Hanya kosmetik, tidak bisa dibeli dengan uang |
| Kota Momo | Setiap dunia yang selesai membangun satu tempat baru di kota (taman, dapur, galeri, panggung) | Peta kemajuan yang bisa dilihat, sekaligus menu pilihan dunia |
| Gelar guru | Jumlah bintang: Guru Pemula, Guru Muda, Guru Hebat, Guru Master | Menguatkan peran anak sebagai guru Momo |
| Trik baru Momo | Setiap tingkat yang selesai: Momo belajar menari, bernyanyi, atau sulap | Momo terlihat "makin pintar" berkat anak |
| Lencana usaha | Pantang Menyerah (berhasil setelah 3+ kali coba), Detektif Teliti (memperbaiki kesalahan tanpa petunjuk), Hemat Langkah (memakai "ulangi" dengan tepat) | Memuji proses, bukan kepintaran |

#### Yang dilihat fasilitator dan orang tua

Anak tidak melihat angka skor. Fasilitator dan orang tua melihat **skor penguasaan 0–100 per konsep** (urutan, arah, pola, debugging, pengulangan, bilangan, mengukur, prediksi, dan seterusnya), yang dikelompokkan ke lima area: logika & coding, spasial, matematika, literasi, dan sains. Skor ini menggabungkan hasil Petualangan Momo dan Skor Jago dari Pustaka Latihan. Skor ini dihitung dari bintang, jumlah percobaan, dan penggunaan petunjuk. Skor inilah isi laporan orang tua dan dasar rekomendasi dunia berikutnya.

#### Momen kelas

Di workshop, tantangan kelas memakai **bintang bersama**: "Kelas kita sudah mengumpulkan 180 bintang, 20 lagi Momo akan berpesta dansa!" Semua anak menyumbang, jadi tidak ada yang merasa kalah. Untuk tingkat Advanced, boleh ada lomba antar tim kecil (3–4 anak), tapi tidak ada peringkat individu yang ditampilkan.

#### Aturan yang tidak boleh dilanggar

- Bintang yang sudah didapat tidak pernah hilang.
- Tidak ada hukuman karena berhenti bermain (tidak ada "streak" yang putus) dan tidak ada nyawa yang habis.
- Level utama tidak memakai batas waktu. Timer hanya ada di tantangan kelas yang opsional.
- Tidak ada mata uang berbayar, kotak hadiah acak, atau iklan.
- Pujian dan nama lencana selalu menyebut usaha atau strategi anak, sesuai riset Mueller & Dweck.

### Mesin level dan tingkat kesulitan adaptif

Keputusan arsitektur terpenting: 100 level adalah **data, bukan kode**. Satu mesin permainan menjalankan semua level, sehingga menambah level baru tidak butuh developer, dan setiap level bisa diuji otomatis.

**Alur mesin level:**

```text
[Kartu ketuk] ─┐
[Suara]       ─┼─> [Penerjemah ke 1 format] ─> [Catatan Momo: program JSON] ─> [Interpreter per langkah] ─┬─> Animasi Momo
[Kartu fisik + kamera] ─┘                                                                            ├─> Bintang + skor
                                                                                                     └─> Log dashboard
```

Apa pun cara anak memberi instruksi, hasilnya diterjemahkan ke satu format program yang sama (Catatan Momo). Karena itu fitur suara atau kamera bisa ditambahkan kapan saja tanpa mengubah level, skor, atau dashboard.

#### Sepuluh jenis puzzle, satu mesin

Level logika dan coding dibangun dari tujuh jenis puzzle: **susun urutan** (Dunia 1), **jalan di grid** (Dunia 2, 6), **lanjutkan pola / kelompokkan** (Dunia 3), **perbaiki program** (Dunia 4), **program dengan ulangi dan jika** (Dunia 5, 7, 8), **sandi** (Dunia 9), dan **panggung event** (Dunia 10). Setiap jenis punya satu komponen tampilan dan satu aturan penilaian.

Untuk matematika dan sains ada tiga jenis tambahan: **bilangan** (garis bilangan, kotak sepuluh, number bonds, model batang), **ukur & bandingkan** (panjang, berat, takaran, uang), dan **tebak – coba** (simulasi sains dengan pertanyaan prediksi). Setiap level diberi label `skills`, misalnya `["sequencing", "counting"]`. Label ini dipakai untuk menghitung skor penguasaan per area dan memastikan tiap dunia berisi 4 level logika, 3 level matematika, dan 3 level sains.

#### Generator soal untuk Pustaka Latihan

Menulis ratusan skill satu soal demi satu soal tidak akan pernah selesai. Karena itu setiap skill di Pustaka adalah **template**, dan generator membuat variasi soal tanpa batas dari template tersebut. Level Petualangan Momo ditulis manual, sedangkan soal Pustaka dihasilkan otomatis.

```json
{
  "skill": "math.add.pictures.upto5",
  "domain": "math",
  "tier": "intermediate",
  "tags": { "merdeka": "fase-a", "sg": "P1-number", "ixlRef": "prek-V" },
  "itemType": "count-then-tap",
  "prompt": "Ada {a} {benda} dan {b} {benda} lagi. Semuanya ada berapa?",
  "params": { "a": [1, 4], "b": [1, 4], "constraint": "a + b <= 5", "benda": ["apel", "bebek", "layang-layang"] },
  "answer": "a + b",
  "distractors": ["a + b + 1", "a + b - 1", "a"],
  "difficulty": ["sum<=3", "sum<=5", "no-picture-hint"],
  "reteach": "anim_add_count_all",
  "audio": "tts"
}
```

Beberapa keputusan penting:

- **Tingkat kesulitan di dalam skill** diatur lewat parameter (misalnya jumlah sampai 3 dulu, lalu sampai 5, lalu tanpa gambar bantu), sehingga Skor Jago bisa menaikkan atau menurunkan kesulitan tanpa berganti skill.
- **Pengecoh dibuat dengan aturan,** berdasarkan kesalahan yang umum dilakukan anak (kurang satu, lebih satu, hanya menghitung satu kelompok). Pengecoh yang dipilih anak dicatat untuk mendeteksi pola miskonsepsi.
- **Suara:** kalimat soal memakai text-to-speech Bahasa Indonesia berkualitas tinggi karena jumlahnya ribuan. Kalimat Momo tetap memakai pengisi suara manusia supaya karakternya hangat.
- **Validator otomatis** memeriksa setiap template: jawaban selalu tunggal, pengecoh tidak pernah sama dengan jawaban, gambar tersedia untuk setiap kata benda, dan kalimat tidak melebihi batas panjang.
- **Review oleh manusia:** untuk setiap skill, tim konten memeriksa 30–50 contoh soal hasil generator sebelum skill dirilis.
- **Alat penulis konten:** tim kurikulum yang bukan programmer bisa membuat dan menguji template lewat editor visual, dengan pratinjau soal secara langsung.

#### Contoh data satu level

```json
{
  "id": "w2-l07",
  "version": 3,
  "tier": "basic",
  "world": 2,
  "type": "grid-move",
  "grid": { "w": 5, "h": 5, "walls": [[2,1],[2,2]], "stars": [[4,0]] },
  "start": { "x": 0, "y": 4, "facing": "up" },
  "goal": { "x": 4, "y": 0 },
  "palette": ["up", "down", "left", "right"],
  "maxCards": 8,
  "stars": { "optimalSteps": "auto", "hintsAllowedFor2Stars": 0 },
  "story": { "intro": "vo_w2_l07_intro", "success": "vo_w2_success_b" },
  "variants": { "seeded": true, "count": 5 }
}
```

#### Solver: setiap level dijamin bisa diselesaikan

Setiap level diperiksa oleh **solver** otomatis, yaitu program yang mencoba semua kemungkinan jawaban dengan pencarian bertingkat. Solver punya tiga tugas:

1. Memastikan level bisa diselesaikan dalam batas kartu yang tersedia.
2. Menghitung jumlah langkah paling hemat, yang otomatis menjadi syarat bintang 3 (`optimalSteps: auto`).
3. Mendeteksi jalan pintas yang tidak disengaja, misalnya level "pengulangan" yang ternyata bisa diselesaikan tanpa "ulangi".

Solver dijalankan di pipeline CI untuk ke-100 level setiap kali ada perubahan. Level yang gagal tidak bisa dirilis.

#### Skor kesulitan dan kurva

Setiap level diberi **skor kesulitan** yang dihitung dari ukuran grid, panjang solusi paling hemat, jumlah konsep yang dipakai, kartu pengecoh, dan kebutuhan belok relatif. Kurva skor ini harus naik perlahan di dalam dunia dan "turun sedikit" di awal dunia baru, supaya anak punya waktu bernapas setiap kali mengenal konsep baru.

Setelah pilot, kurva disetel ulang dengan data nyata. Targetnya, **70–85% anak menyelesaikan setiap level dalam 3 percobaan**. Level di bawah itu dipermudah, level di atasnya dipersulit atau digabung.

#### Tingkat kesulitan yang menyesuaikan anak

- **Tes penempatan:** 5 level mini di awal menentukan dunia mana yang cocok untuk anak, bukan usianya.
- **Bantuan bertahap:** gagal 2 kali, blok yang salah disorot. Gagal 3 kali, Momo menunjukkan langkah pertama. Gagal 5 kali, Momo menawarkan "versi yang lebih mudah" dari level yang sama.
- **Lompat maju:** 3 level berturut-turut dengan bintang 3 dan tanpa petunjuk, anak ditawari langsung ke level tantangan dunia itu.
- **Varian:** setiap level punya 5 varian dengan posisi berbeda (dari `seed`), sehingga anak yang duduk bersebelahan tidak bisa sekadar menyontek, dan mengulang level tetap terasa baru.

#### Data dan sinkronisasi

Setiap aksi dicatat sebagai event kecil: mulai level, menjalankan program (beserta isi programnya), memakai petunjuk, selesai (bintang dan waktu), dan macet lebih dari 3 menit. Event disimpan dulu di laptop (IndexedDB), lalu dikirim ke server saat online. Setiap event punya ID unik sehingga pengiriman ulang tidak menggandakan data. Kalau ada perbedaan, yang dipakai adalah bintang tertinggi.

Progres disimpan berdasarkan `id` + `version` level. Jadi saat sebuah level diperbaiki, bintang anak di versi lama tetap aman.

#### Kualitas

- Interpreter punya unit test untuk setiap jenis instruksi.
- Semua level diuji solver di CI, plus satu test "rekaman jawaban" per level.
- Batas ukuran: satu level < 5 KB, satu paket tingkat Basic (termasuk suara dan animasi) < 15 MB supaya cepat diunduh untuk mode offline.
- Playtest dengan anak sungguhan di setiap akhir fase, bukan hanya pengujian internal.

### Masukan dari prototipe Little Thinkers dan riset Gemini

Prototipe Little Thinkers sudah berada di arah yang benar: kartu besar yang cukup diketuk, dan program anak terlihat sebagai slot bernomor. Tapi ada beberapa hal yang bertentangan dengan riset dan perlu diubah sebelum diuji ke anak.

#### Yang dipertahankan dari prototipe

- Kartu besar yang cukup diketuk, tanpa drag & drop.
- Slot bernomor (1, 2, 3) yang menunjukkan program sedang disusun. Ini bentuk awal Buku Catatan Momo.
- Tantangan urutan membuat roti (ambil piring, ambil roti, oles selai, siap dimakan), yang langsung menjadi isi Dunia 1.
- Penanda "Langkah 2 dari 4" dan warna yang hangat.

#### Yang perlu diubah

1. **Kartu "Kanan" dan "Kiri" ambigu.** Tidak jelas apakah artinya bergeser ke kanan layar atau berbelok. Di tingkat Basic, pakai empat panah arah tetap (atas, bawah, kiri, kanan layar) tanpa kata "belok". Prototipe saat ini juga belum punya panah bawah.
2. **Layar perintah robot belum menampilkan peta.** Anak menyusun 3 kartu tanpa melihat ruang tempat Riko berjalan, jadi kemampuan spasialnya tidak terlatih. Tampilkan grid ruangan dengan Riko dan meja makan, lalu animasikan Riko saat perintah dijalankan.
3. **Terlalu banyak teks untuk anak 5 tahun.** "Apa yang harus dilakukan PERTAMA / BERIKUTNYA?" dan label "Maju / Kanan / Kiri" belum bisa dibaca anak usia ini. Setiap instruksi dan kartu perlu dibacakan dengan suara saat muncul atau diketuk.
4. **Urutan roti bisa punya lebih dari satu jawaban benar.** "Ambil piring" dan "ambil roti" sama-sama masuk akal sebagai langkah pertama. Mesin level harus menerima beberapa urutan yang valid. Ini juga pelajaran penting: dalam coding, sering ada lebih dari satu jawaban benar.
5. **Siapa Riko?** Kartu misi menampilkan emoji robot dan orang berjalan sekaligus, jadi tidak jelas Riko itu robot atau anak. Pilih satu karakter dengan satu tampilan.
6. **Emoji tampil berbeda di Windows, Mac dan Chromebook.** Untuk produk final, ganti emoji dengan ilustrasi sendiri supaya tampilannya konsisten dan sesuai brand.
7. **Angka bintang di pojok (100 dan 25) belum punya arti yang jelas.** Ganti dengan sistem bintang per level seperti di bagian Skor, bintang, dan hadiah.

#### Riset Gemini: yang sejalan dan yang dikoreksi

Sebagian besar isi riset Gemini sejalan dengan riset di ringkasan riset (Bagian C): mulai dari aktivitas tubuh dan benda nyata, fokus pada urutan, pola, debugging, dan dekomposisi, serta menganggap salah sebagai bagian dari petualangan. Aktivitasnya langsung bisa dipakai sebagai permainan pembuka setiap dunia:

| Aktivitas dari riset Gemini | Dipakai di |
| --- | --- |
| Simon Says versi algoritma ("lompat 2 kali, tepuk tangan, jongkok") | Ice breaking semua workshop |
| Algoritma membuat roti (kakak menjalankan instruksi anak secara harfiah) | Pembuka Dunia 1: Urutan Sehari-hari |
| Menata meja makan | Pembuka Dunia 1 dan level 1–10 |
| Manusia Robot dan peta harta karun di grid lantai | Pembuka Dunia 2: Momo Tersesat |
| Labirin kertas | Lembar bawa pulang Dunia 2 |
| Pola warna balok dan mengelompokkan mainan | Pembuka Dunia 3: Pola & Kelompok |

Ada tiga koreksi:

- **Pola warna bukan dasar logika kondisi.** Melanjutkan pola (merah, biru, merah, ...) melatih pengenalan pola, bukan logika jika-maka. Logika kondisi punya tempat sendiri di Dunia 8.
- **Kartu kiri-kanan untuk anak 5 tahun perlu disesuaikan.** Riset perkembangan (Rigal, 1994) menunjukkan kiri-kanan dari sudut pandang orang lain baru lancar di usia 8–9 tahun. Karena itu belok relatif dipindah ke Dunia 6.
- **100% tanpa layar memang paling kuat menurut riset, tapi Little Coder tetap memakai laptop.** Jalan tengahnya: setiap dunia dibuka dengan permainan tanpa layar, lalu laptop dipakai untuk konsep yang sama. Pola hybrid ini didukung studi del Olmo-Muñoz (2020).

### Yang dibangun lebih dulu

Versi pertama cukup untuk menjalankan tingkat Basic (Dunia 1–3, level 1–30) di workshop sungguhan. Semua yang lain menunggu sampai kita melihat anak benar-benar memakainya.

**Untuk anak:**

- Masuk dengan memindai QR dan memilih warna Momo, tanpa password dan tanpa mengetik.
- Mengajari Momo lewat tombol gambar besar dan suara berbahasa Indonesia. Kartu ajaib via kamera menyusul di versi berikutnya.
- Buku Catatan Momo yang dibacakan dan bisa diubah dengan mengetuk.
- Kota Momo sebagai peta dunia, bintang 1–3 per level, keping Momo, dan lencana usaha.
- Momo yang bereaksi hangat saat berhasil maupun saat menabrak.
- Level matematika dan sains di Dunia 1–3, beserta daftar alat peraga dan bahan percobaan untuk setiap dunia.
- Pustaka Latihan versi awal: sekitar 60 skill tingkat Basic (25 matematika, 20 literasi, 15 sains) dengan Skor Jago, rekomendasi "3 skill untuk hari ini", dan tes penempatan singkat per domain.

**Untuk kakak fasilitator:**

- Membuat kelas untuk satu event dalam beberapa menit, lengkap dengan QR.
- Melihat seluruh kelas di satu layar, dengan tanda untuk anak yang sudah lama tidak maju.
- Membekukan semua layar anak saat perlu perhatian ke depan, dan menjalankan tantangan kelas dengan timer.

**Untuk orang tua:**

- Satu link berisi rekaman perjalanan Momo buatan anak, ringkasan apa yang dipelajari, dan sertifikat.

**Belum masuk versi pertama:** kartu ajaib via kamera, obrolan bebas dengan AI, level 31–100 (Intermediate dan Advanced), editor misi untuk admin, pendaftaran dan pembayaran online, serta aplikasi mobile.

### Hal yang harus selalu benar

Beberapa hal tidak boleh ditawar, karena kalau gagal di depan 20 anak dan orang tuanya, kepercayaan langsung hilang.

**Tetap jalan walau wifi mati.** Setelah dibuka sekali, semua misi tersimpan di laptop. Progres disimpan di laptop dan dikirim ke server saat online. Pengenalan suara di browser umumnya membutuhkan internet, jadi saat offline Momo otomatis beralih ke tombol gambar tanpa membuat anak bingung. Untuk venue tanpa internet sama sekali, sistem bisa dijalankan dari laptop fasilitator dengan router sendiri.

**Data anak sesedikit mungkin.** Dari anak, kita hanya menyimpan nama panggilan dan warna Momo. Tidak ada foto, email, tanggal lahir, maupun rekaman suara yang disimpan: suara hanya diubah menjadi perintah lalu dibuang. Kontak disimpan hanya milik orang tua, dengan persetujuan saat mendaftar, mengacu pada UU Pelindungan Data Pribadi.

**Aman untuk anak.** Di area anak tidak ada iklan, link keluar, atau obrolan dengan orang lain. Semua kalimat Momo sudah ditulis dan diperiksa sebelumnya.

**Bisa dipakai di laptop biasa.** Berjalan di browser Chrome atau Edge di laptop Windows, Mac dan Chromebook. Tetap ringan di laptop kelas bawah, dan setiap misi terbuka dalam hitungan detik. Mouse diutamakan, tapi touchpad dan layar sentuh juga bisa dipakai.

**Ramah untuk yang belum bisa membaca.** Setiap instruksi punya suara dan gambar, kontrasnya tinggi, dan misi utama tidak dibatasi waktu. Bahasa Indonesia jadi bahasa utama, dengan struktur yang siap ditambah bahasa Inggris.

### Di balik layar

Secara teknis Little Coder adalah satu aplikasi web yang bisa dipasang di laptop dan berjalan offline, terhubung ke satu server yang bisa berada di cloud atau di laptop fasilitator.

**Arsitektur:**

- **Laptop anak (PWA):** Momo + percakapan (suara, tombol, kartu) · Dunia Momo (peta, animasi, catatan) · Simpan lokal (level + progres, offline)
- **Server (cloud / lokal):** API + login kelas (kode kelas + avatar) · Database (progres, skill, event) · Realtime (update ke dashboard)
- **Klien lain:** Dashboard fasilitator (progres kelas, mode lomba) · Editor misi admin (buat dan susun misi) · Halaman orang tua (laporan + sertifikat PDF)
- Laptop anak ↔ server: sinkron. Server → dashboard dan halaman orang tua; editor admin → server.

Bagian yang disorot, yaitu Momo dan cara anak bercakap dengannya, adalah jantung produk ini dan yang paling layak diberi waktu desain terbanyak.

**Suara Momo** sebaiknya direkam oleh pengisi suara manusia, bukan suara mesin. Kehangatan suara adalah bagian terbesar dari kesan "humanized". **Mendengar anak** bisa memakai pengenalan suara bawaan browser Chrome yang mendukung Bahasa Indonesia. Momo tidak perlu memahami kalimat bebas, cukup mengenali kata kunci seperti maju, belok, kiri, kanan, ulangi, dan angka.

**Gerak dan ekspresi Momo** bisa dibuat dengan alat animasi karakter interaktif seperti [Rive](https://rive.app) atau Lottie, sehingga Momo bisa bingung, tertawa, atau melompat secara halus. **Dunia Momo** (peta, rintangan, bintang) cukup digambar dengan canvas 2D atau engine ringan seperti Phaser.

**Kartu ajaib** (versi berikutnya) memakai kartu cetak dengan penanda visual kecil di sudutnya yang bisa dibaca kamera laptop, teknik yang sudah umum dan tersedia di library open source.

Untuk aplikasinya, React sebagai PWA sudah cukup. Untuk server, Supabase atau Firebase menyediakan login, database dan pembaruan realtime siap pakai, cocok untuk tim kecil. Pilihan akhir tetap mengikuti kemampuan tim developer yang ada.

### Langkah ke depan

Momo bisa menemani workshop pertama sekitar 2–2,5 bulan setelah pengembangan dimulai. Setiap fase baru dilanjutkan kalau gerbang sebelumnya lolos.

**Roadmap:**

| Fase | Durasi (perkiraan) | Isi | Gerbang untuk lanjut |
| --- | --- | --- | --- |
| Fase 0 · Validasi | ±2 minggu | Prototipe level 1–10, uji ke 5–8 anak, uji suara saat ramai | Anak 5–6 th bisa main tanpa dibantu |
| Fase 1 · MVP | ±6–8 minggu | Basic level 1–30, Pustaka 60 skill, mesin level + solver | 1 event uji, 20 anak lancar |
| Fase 2 · Pilot | ±4 minggu | 2–3 workshop nyata, tema co-branding, laporan orang tua | Target metrik tercapai |
| Fase 3 · Perluasan | setelah pilot | Level 31–100, kartu ajaib + editor, Pustaka 300 skill | — |

Fase 0 adalah yang terpenting. Sebelum membangun apa pun, kita membuat prototipe sederhana Momo dan level 1–10, lalu mencobanya ke 5–8 anak di tempat yang seramai venue sungguhan. Pertanyaannya sederhana: apakah anak 5–6 tahun bisa mengajari Momo tanpa dibantu, dan apakah suara tetap bisa dipakai di tengah keramaian?

Durasi di atas masih perkiraan untuk tim kecil (1–2 developer, 1 desainer, 1 pengisi suara). Dengan tambahan Pustaka Latihan, Fase 1 kemungkinan butuh 2–4 minggu lebih lama, atau 1 penulis konten tambahan. Alternatifnya, Pustaka dirilis menyusul setelah pilot pertama. Tanggal pasti ditentukan setelah tim dan jadwal event dikunci.

### Yang masih perlu diputuskan

Risiko terbesar konsep ini ada di suara. Keramaian venue, logat anak, dan anak yang malu bicara bisa membuat Momo sering salah dengar. Karena itu tombol gambar selalu tersedia sejak hari pertama, headset dengan mikrofon disiapkan per laptop, dan Fase 0 khusus menguji hal ini.

Risiko lainnya lebih umum. Karakter Momo harus benar-benar disukai anak, jadi desain dan suaranya perlu diuji sebelum dikunci. Biaya bisa membengkak kalau terlalu banyak bab dibangun sekaligus, jadi versi pertama dibatasi tingkat Basic (30 level). Ketersediaan laptop di event juga perlu direncanakan: bawaan orang tua, sewa, atau kerja sama lab dengan lembaga kursus.

**Pertanyaan yang perlu dijawab:**

- [ ] Siapa yang membangun: tim internal Silentmode, freelancer, atau vendor?
- [ ] Siapa yang mendesain karakter Momo dan mengisi suaranya?
- [ ] Apakah anak bisa lanjut bermain di rumah secara gratis, atau berlangganan setelah event?
- [ ] Berapa laptop yang realistis disediakan per event, dan berapa anak per sesi?
- [ ] Apakah "Little Coder" dan "Momo" jadi brand tersendiri, atau tetap di bawah nama Cleo Kids?
- [ ] Apakah silabus perlu diselaraskan dengan materi koding di kurikulum sekolah supaya bisa ditawarkan ke sekolah?
- [ ] Venue pilot pertama: restoran partner (cocok untuk Dunia 1 yang bertema dapur, atau Dunia 6: Momo Jadi Koki) atau mal/sekolah?
- [ ] Nama produk dan karakter: Little Coder atau Little Thinkers? Momo atau Riko? ("Little Thinkers" mungkin lebih pas karena fokusnya logika, bukan menulis kode.)
- [ ] Siapa yang menulis dan menguji 100 level, dan berapa level per bulan yang realistis?
- [ ] Apakah isi matematika dan sains perlu ditinjau guru TK/SD berlatar matematika atau sains sebelum pilot?
- [ ] Apakah klaim ke orang tua memakai kalimat "terinspirasi pendekatan Singapura"? (Bukti efektivitas kurikulum Singapore Math sebagai merek masih terbatas.)
- [ ] Literasi: Bahasa Indonesia saja, atau ditambah jalur bahasa Inggris seperti IXL ELA?
- [ ] Siapa tim konten yang menulis dan meninjau sekitar 300 skill, dan berapa skill per bulan yang realistis?
- [ ] Model bisnis Pustaka Latihan: gratis selama periode tertentu setelah workshop, lalu berlangganan? Atau dijual ke sekolah per kelas?

### Sumber

- [Code.org Pre-reader Express](https://studio.code.org/courses/pre-express-2025/units/1) dan [ScratchJr](https://www.scratchjr.org/about/info): pembanding platform model blok untuk usia 4–7 th
- [Kodable – Unplugged coding activities](https://www.kodable.com/learn/unplugged-coding-activities): acuan permainan lantai
- [Rive](https://rive.app): contoh alat animasi karakter interaktif
- [Timedoor Batam](https://timedooracademy.com/id/branch/les-coding-di-batam/), [OSEDU](http://osedu.id/), [Kalananti](https://www.kalananti.id/): peta pesaing lokal
- [Siegler & Ramani (2008)](https://siegler.tc.columbia.edu/wp-content/uploads/2019/02/sieg-ram08.pdf): papan bernomor dan pemahaman bilangan
- [Nurturing Early Learners, MOE Singapura](https://www.zhenghuapri.moe.edu.sg/files/kindergarten-curriculum-framework-guide-for-parents.pdf) dan [ringkasan silabus matematika SD 2021](https://www.kiasuparents.com/kiasu/article/primary-school-maths-syllabus-what-your-child-learns-from-p1-to-p6): acuan isi matematika
- [TIMSS 2015 Encyclopedia – Singapura](https://timssandpirls.bc.edu/timss2015/encyclopedia/countries/singapore/the-science-curriculum-in-primary-and-lower-secondary-grades/): tema sains Singapura
- IXL: [matematika pra-TK](https://www.ixl.com/math/pre-k), [matematika TK](https://www.ixl.com/math/kindergarten), [ELA](https://www.ixl.com/ela) dan [ELA pra-TK](https://www.ixl.com/ela/pre-k), [sains](https://www.ixl.com/science) dan [sains TK](https://www.ixl.com/science/kindergarten): acuan struktur katalog skill
- [IXL SmartScore](https://blog.ixl.com/2020/11/11/ixl-smartscore-the-key-to-mastery-based-learning/) dan [kritik terhadapnya](https://www.boddlelearning.com/article/ixl-punishes-wrong-answers): acuan desain Skor Jago

---

# BAGIAN C — RINGKASAN RISET

Riset lengkap ada di dokumen terpisah "Riset Pendukung Little Coder". Tabel ini merangkum temuan yang langsung memengaruhi desain dan kode.

| Temuan | Sumber | Keputusan di produk |
| --- | --- | --- |
| Program coding usia 3–7 th efektif (d = 0,73; matematika d = 0,73). Unplugged (d = 0,92) dan robot (d = 0,96) jauh lebih efektif daripada layar saja (d = 0,42) atau karakter digital (d = 0,43). Durasi tidak berpengaruh signifikan | [Meta-analisis program coding usia dini, 2025](https://www.sciencedirect.com/science/article/pii/S1041608025000755) | Setiap workshop dibuka permainan tanpa layar; kartu fisik jadi jembatan; format 2,5 jam masuk akal |
| Mulai unplugged lalu layar lebih baik daripada langsung layar (84 siswa kelas 2) | [del Olmo-Muñoz dkk., 2020](https://www.sciencedirect.com/science/article/abs/pii/S0360131520300348) | Pola hybrid di setiap dunia |
| Anak lancar memakai kiri-kanan untuk tubuhnya sendiri sekitar usia 7, untuk orang lain sekitar 8–9 th | [Rigal, 1994](https://journals.sagepub.com/doi/10.2466/pms.1994.79.3.1259) | Basic hanya arah tetap; belok relatif mulai Dunia 6 |
| Kemampuan spasial bisa dilatih (g = 0,47), bertahan, dan menular; video game sama efektifnya dengan kursus | [Uttal dkk., 2013](https://groups.psych.northwestern.edu/uttal/vittae/documents/ContentServer.pdf) | Grid dan misi spasial naik bertahap |
| Bahasa spasial dari orang dewasa memprediksi kemampuan spasial anak | [Pruden, Levine & Huttenlocher, 2011](https://tdlc.ucsd.edu/global/images/Pruden_Levine_Huttenlocher.pdf) | Momo selalu memakai dan mengulang kata spasial |
| Mengajari karakter digital membuat siswa belajar lebih lama dan lebih banyak, lebih berani mengakui salah (usia 10–14 th, belum diuji pada 5–8 th) | [Chase dkk., 2009](https://link.springer.com/article/10.1007/s10956-009-9180-4) | Anak sebagai guru Momo; kesalahan dibingkai sebagai kebingungan Momo |
| Pengenalan suara anak TK salah hingga 35% (dewasa ±5%), makin buruk di tempat ramai | [The Learning Agency](https://the-learning-agency.com/guides-resources/closing-the-child-speech-recognition-gap-evidence-limitations-and-paths-forward/) | Kosakata terbatas, konfirmasi, tombol cadangan, voice di balik flag |
| Bermain terarah lebih baik daripada pengajaran langsung untuk matematika awal, bentuk, dan berpindah tugas | [Skene dkk., 2022](https://wrap2fasd.org/wp-content/uploads/2025/01/Child-Development-2022-Skene-Can-guidance-during-play-enhance-children-s-learning-and-development-in-educational.pdf) | Misi punya tujuan jelas, caranya bebas |
| Pujian untuk kepintaran membuat anak lebih mudah menyerah; pujian untuk usaha membuat anak bertahan | [Mueller & Dweck, 1998](https://www.columbia.edu/cu/psychology/courses/3615/Readings/Mueller_Dweck.pdf) | Semua pujian dan lencana menyebut usaha/strategi |
| Board game bernomor lurus 1–10, 4 × 15 menit, memperbaiki pemahaman garis bilangan anak 4–5 th secara besar | [Siegler & Ramani, 2008](https://siegler.tc.columbia.edu/wp-content/uploads/2019/02/sieg-ram08.pdf) | `numberedPath` di grid, Momo menyebut angka tiap langkah |
| Singapura memakai pendekatan Konkret–Gambar–Simbol sejak awal 1980-an; efektivitas kurikulum Singapore Math sebagai merek belum punya studi yang memenuhi standar WWC | [NIE Singapura](https://math.nie.edu.sg/wkho/Research/My%20publications/Math%20Education/Yew%20Hoong%20et%20al%20(Final).pdf), [WWC](https://ies.ed.gov/ncee/wwc/EvidenceSnapshot/464) | CPA terikat tingkat; klaim "terinspirasi pendekatan Singapura" |
| IXL memecah materi menjadi skill sangat kecil (mis. 121 skill ELA pra-TK, 65 skill sains TK); SmartScore dikritik karena menghukum salah di atas 90 | [IXL](https://www.ixl.com/math/pre-k), [SmartScore](https://blog.ixl.com/2020/11/11/ixl-smartscore-the-key-to-mastery-based-learning/), [kritik](https://www.boddlelearning.com/article/ixl-punishes-wrong-answers) | Pustaka Latihan berbasis skill kecil + Skor Jago yang tidak menghukum |
