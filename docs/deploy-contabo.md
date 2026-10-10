# Deploy ke server Contabo (kids.eduskul.my.id)

Server produksi yang sudah berjalan: `ssh root@169.58.177.74`, folder `/var/www/kids.eduskul.my.id`, service
`little-coder-api`. Untuk server baru dari nol, lihat [deploy.md](deploy.md).

## Kapan perlu migrasi dan seed?

Aplikasi membaca **soal, buku, materi, level, dan dialog dari PostgreSQL**, bukan dari folder `content/`. Kode baru
saja tidak cukup bila ada soal baru.

| Isi rilis                                    | `migrate:prod` | `seed:prod` |
| -------------------------------------------- | -------------- | ----------- |
| Hanya kode / tampilan                        | tidak          | tidak       |
| File baru di `apps/api/drizzle/` (migrasi)   | **ya**         | tidak       |
| Perubahan di `content/` (soal, buku, dialog) | tidak          | **ya**      |
| Keduanya (mis. rilis 2026-10-07)             | **ya**         | **ya**      |
| Ragu                                         | ya             | ya (aman)   |

Cek dari server setelah `git pull`: `git diff --stat $PREV HEAD -- apps/api/drizzle content`.

**`seed:prod` aman di produksi:** hanya menambah/memperbarui konten (soal baru masuk; soal lama diperbarui bila
`version` naik; suntingan admin tidak ditimpa; dialog hanya ditambah kunci baru). Tidak membuat orang tua, anak,
kelas, atau data percobaan. Admin hanya dibuat bila belum ada admin sama sekali.

**Jangan jalankan di server:** `pnpm db:generate` (membuat migrasi baru, khusus laptop), `pnpm db:setup` /
`pnpm db:seed` (versi pengembangan), `pnpm db:restore` dengan file dari laptop (menimpa data asli), dan jangan ubah
`JWT_SECRET` di `.env`.

---

## Rilis berikutnya (D-109, D-117): Materi Topik & Lab Buku semua buku, foto Pexels → AI

**Isi rilis:**

- **D-109 — materi berformat lab:** 726 Materi Topik (tab Pahami / Eksperimen / Contoh / Ingat / Uji) dan 28 Lab
  Buku (pos per tema + Uji Jago) untuk semua buku PAUD–SMP. Tombol utama di halaman topik menjadi "Materi Topik";
  pelajaran lama menjadi "Ringkasan 1 menit". Progres bintang lab disinkronkan (outbox) dan tampil di laporan orang
  tua. Admin → Materi lab: cakupan + pratinjau.
- **Migrasi baru `0021_lab_progress`:** tabel `lab_progress` + kolom `skill_catalogs.lab`. Hanya menambah, aman untuk
  versi lama.
- **D-117 — gambar utama:** `lesson-photos.js` mencari Pexels lebih dulu; yang tidak ketemu dibuat AI Gambar bila
  `OPENAI_API_KEY` ada; tanpa kunci → tetap SVG cadangan. `--tanpa-ai` = hanya Pexels.
- **Simpan katalog admin ≤ 5 MB** (katalog kini 0,1–1,3 MB); route lain tetap 100 KB. Nginx sudah 5 MB.
- **Ikut terbawa:** pekerjaan sesi lain yang belum di-commit (lihat `git status` sebelum commit).

**Yang perlu di server:** `migrate:prod` **wajib**, `seed:prod` **wajib**, impor foto (file `carry`), lalu
`lesson-photos.js` untuk foto yang masih kurang.

### 0. Laptop: syarat sebelum deploy

1. **Build harus lolos.** `apps/web` membangun dengan `tsc --noEmit && vite build` (termasuk file test), jadi dua
   error lama dari sesi lain wajib diperbaiki dulu:
   - `apps/web/test/play/peta.test.tsx:229` (typecheck) — tanpa ini `pnpm build` di server gagal;
   - `apps/web/public/theme-init.js` (lint: `document`/`e`).
2. **Aturan anak (disarankan, Prompt 1 bagian 1):** ganti simbol ✓ ✗ ✕ di 22 poster dan kata "salah" di Lab Buku
   `math/sd56` (lihat `docs/tinjauan-materi-lab.md`). Bisa juga rilis berikutnya, tetapi lebih baik sebelum anak
   melihatnya.
3. **Hentikan job foto di laptop** (server yang melanjutkan, supaya tidak menyaring dua kali):
   `pkill -f "src/cli/lesson-photos.ts"`.

### 1. Laptop: cek akhir, siapkan foto, commit, push, kirim

Hentikan `pnpm dev` dulu (Ctrl+C). Jalankan satu baris demi satu baris:

```bash
cd ~/Repo/udakids
pnpm lint && pnpm typecheck && pnpm test && pnpm validate:content && pnpm build
pnpm carry:export -- $PWD/backups/lab-$(date +%F).ndjson.gz --since=2026-10-09
git add -A
git status --short | grep -E "\.env$|\.dump$|backups/|\.ndjson|labs-staging/" || echo "aman"
git commit -m "Materi Topik & Lab Buku semua buku, foto Pexels lalu AI, simpan katalog 5 MB (D-109, D-117)"
git push origin main
git log -1 --oneline
scp backups/lab-*.ndjson.gz root@169.58.177.74:/root/backups/
```

- Semua cek hijau; `validate:content` → "7893 skill valid — 0 error".
- `carry:export --since` membawa foto Pexels + klip suara sejak 9 Oktober, **tanpa** kunci/pengaturan/kata sandi
  (±1.100+ foto, ukuran besar — tunggu sampai selesai).
- Baris `grep` harus `aman`. Catat hash dari `git log -1 --oneline`.

### 2. Server: cadangkan, ambil kode, build

```bash
ssh root@169.58.177.74
cd /var/www/kids.eduskul.my.id
PREV=$(git rev-parse --short HEAD); echo $PREV
U=$(grep "^DATABASE_URL=" .env | cut -d= -f2- | tr -d '"')
pg_dump "$U" -Fc -f /root/backups/sebelum-lab-$(date +%F-%H%M).dump && ls -lh /root/backups | tail -2
psql "$U" -c "select (select count(*) from parents) ortu, (select count(*) from children) anak"
git pull origin main
git log -1 --oneline
pnpm install --frozen-lockfile
pnpm build
```

- Catat `$PREV` (rollback) serta angka `ortu`/`anak` (harus sama setelah deploy).
- `git log -1` = hash langkah 1. `pnpm build`: engine, api, web "Done"; bila gagal berhenti — layanan lama tetap
  jalan.

### 3. Server: `.env`, migrasi, seed, impor foto, nyalakan

```bash
grep -E "^PEXELS_API_KEY=.|^OPENAI_API_KEY=.|^TTS_DAILY_LIMIT" .env | sed 's/=.*/=…/'
systemctl stop little-coder-api
pnpm --filter @little-coder/api migrate:prod
pnpm --filter @little-coder/api seed:prod
cd apps/api && node dist/cli/carry.js import /root/backups/lab-*.ndjson.gz && cd ../..
systemctl start little-coder-api
```

- `PEXELS_API_KEY` wajib ada. `OPENAI_API_KEY` **opsional**: isi (`nano .env`) bila foto yang tidak ketemu di
  Pexels mau dibuat AI (±US$0,045/gambar termasuk penulisan prompt — angka pasti di `--dry-run`; batas harian
  Admin → AI Gambar). Kunci juga bisa diisi di Admin → AI Gambar.
- `migrate:prod` → "Migrasi database selesai." `seed:prod` → katalog diperbarui (materi & Lab Buku masuk).
- Impor → "… gambar AI baru" (foto Pexels dari laptop; yang sudah ada dilewati).

### 4. Server: periksa

```bash
sleep 5; systemctl is-active little-coder-api; curl -s http://127.0.0.1:7177/health; echo
psql "$U" -tAc "select count(*) from drizzle.__drizzle_migrations"
psql "$U" -tAc "select count(*) from skill_catalogs where lab is not null"
psql "$U" -tAc "select sum((select count(*) from jsonb_array_elements(categories) c where c ? 'materi')) from skill_catalogs"
psql "$U" -tAc "select to_regclass('public.lab_progress')"
psql "$U" -c "select (select count(*) from parents) ortu, (select count(*) from children) anak"
psql "$U" -tAc "select count(*) from ai_images where status='approved'"
```

| Perintah               | Hasil                                             |
| ---------------------- | ------------------------------------------------- |
| `is-active` / `health` | `active` / `"status":"ok"`                        |
| jumlah migrasi         | 22                                                |
| Lab Buku               | 28                                                |
| Materi Topik           | 726 (lebih kecil → `seed:prod` belum jalan/gagal) |
| `lab_progress`         | `lab_progress`                                    |
| ortu, anak             | sama dengan langkah 2                             |
| foto disetujui         | naik sesuai impor                                 |

### 5. Server: foto yang masih kurang (berjalan di latar, ±1–2 hari)

```bash
cd /var/www/kids.eduskul.my.id/apps/api
B="math prek worksheet prek english prek sains tk sains tkosn math tk math tkosn english tkosn math sd1 math sd2 math sd12 sains sd1 sains sd2 sains sd12 english sd12 math sd3 math sd34 math sd4 sains sd3 sains sd34 sains sd4 english sd34 math sd56 sains sd56 english sd56 math smp79 sains smp79 english smp79"
node dist/cli/lesson-photos.js $B --tanpa-ai --dry-run
nohup node dist/cli/lesson-photos.js $B > /root/lab-photos.log 2>&1 &
tail -f /root/lab-photos.log          # Ctrl+C = berhenti memantau saja
```

- Tanpa `OPENAI_API_KEY`: hanya Pexels, sisanya SVG ("Kunci AI Gambar belum ada …" di akhir log — normal).
- Batas Pexels 200 permintaan/jam (skrip menunggu sendiri); penyaringan Claude ±US$0,003/kandidat, ikut batas
  harian AI Gambar. Terputus → jalankan perintah `nohup` yang sama; foto yang sudah ada dilewati.
- Setelah Pexels selesai dan kunci OpenAI ada: `nohup node dist/cli/lesson-photos.js $B --ai > /root/lab-ai.log 2>&1 &`
  (hanya foto yang belum ada).

### 6. Cek di browser (jendela penyamaran)

- **Anak → Pustaka:** kartu Lab Buku (ikon labu) di tiap buku; buka → pos bertema → eksperimen → Uji → bintang.
- **Anak → topik apa saja → "Materi Topik":** tab Pahami / Eksperimen / Contoh / Ingat / Uji; tombol kedua
  "Ringkasan 1 menit". Narasi Momo berbunyi (klip baru dibuat saat pertama diputar — tunggu sebentar bila diam).
- **Foto:** kartu benda memakai foto asli; yang belum ada memakai gambar SVG (tidak kosong).
- **Progres:** selesaikan satu Uji → buka di perangkat lain/muat ulang → bintang tetap ada.
- **Orang tua → laporan anak:** kartu "Lab & Materi" tampil.
- **Admin → Materi lab:** cakupan 726 topik / 28 Lab Buku; pratinjau bisa dibuka.
- **Admin → Skill → katalog → Simpan:** berhasil (tidak "request entity too large").
- **Admin → AI Gambar:** foto baru "Disetujui"; tolak yang kurang pas (lihat daftar foto sensitif di
  `docs/tinjauan-materi-lab.md` bagian D).

### 7. Bersihkan

```bash
rm /root/backups/lab-*.ndjson.gz                 # server
rm ~/Repo/udakids/backups/lab-*.ndjson.gz        # laptop
```

### Rollback

```bash
cd /var/www/kids.eduskul.my.id
git checkout $PREV && pnpm install --frozen-lockfile && pnpm build && systemctl restart little-coder-api
```

- Migrasi 0021 hanya menambah tabel & kolom, jadi versi lama tetap jalan (materi lab tidak tampil di sana).
- Bila perlu kembali penuh: pulihkan `pg_dump` dari langkah 2 (`pg_restore --clean -d "$U" <file>`), lalu restart.

### Setelah rilis

- **Suara materi dibuat lebih dulu:** setelah Prompt 1 bagian 2 (narasi materi masuk `voice --all`), rilis lagi lalu
  `node dist/cli/voice.js --all --dry-run` → setujui biaya (±2,5 juta huruf) → `--all`.
- **Prompt 2/3** (widget baru, perbaikan bank soal/fakta): tiap rilis = langkah 1–4 di atas (`seed:prod` wajib,
  karena `version` materi naik).

---

## Rilis berikutnya (D-096 … D-106): Kelas 4, UdaKids, audio hanya Chirp, ringkasan admin, EMC Kelas 3–4, Hias Momo

**Isi rilis** (semua belum di-deploy setelah commit `9628db2`, D-095):

- **D-096 — Matematika Kelas 4** (`math/sd4`):
  - 33 topik × (10 level soal + Level 11 game) + topik "Game seru" (10 game), total 373 level;
  - pelajaran + simulasi di setiap topik; alat peraga Kelas 4 (ribuan, luas/keliling, sudut, diagram, desimal);
  - 6 game baru: Tebak Angka Momo, Diagram Ajaib, Penyihir Hitung, Tumpuk Angka, Garis Perkalian, Bingo Rupiah.
- **D-097 — merek seragam UdaKids** di seluruh tampilan, email, dan SEO.
- **D-098 — audio hanya Chirp 3 HD:**
  - tanpa suara browser/Melayu;
  - bahasa suara mengikuti kalimat (penjelasan Indonesia di buku English tidak lagi dibacakan suara British);
  - teks campuran diputar per kalimat.
- **D-099/D-100 — ringkasan admin:** grafik lebih analitis, filter bulan/tahun, section Afiliasi & Komisi owner.
- **D-101 — EMC Kelas 3–4:** 8 materi kisi-kisi + mock 40 soal + game, 101 level di `math/sd34`.
- **D-102 / D-104 — Hias Momo:**
  - 8 model karakter, pola badan, pernak-pernik;
  - warna sendiri (pemilih warna + kode `#RRGGBB`);
  - gaya rambut pendek/keren (cepak, jabrik, belah samping, mohawk, gelombang, topi terbalik, bandana);
  - tombol Acak/Kembalikan.
  - Disimpan di `momo_look` yang sudah ada, tanpa migrasi.
- **D-103 — siapa yang sedang bermain:** detail di admin, toast ajakan di landing.
- **D-105 — papan peringkat:** "Main 2 jam lalu" di setiap baris (hanya di area masuk, tidak di landing publik).
- **D-107 — design system UdaKids tahap 1:**
  - fon Andika + Lilita One (lokal, ikut `pnpm install`);
  - logo U gonjong (favicon & ikon iPhone baru);
  - warna antarmuka merah gonjong, bukan ungu; tombol anak tangga;
  - jawaban keliru berwarna kunyit (bukan merah);
  - section "Kenapa namanya UdaKids?" di landing.
- **D-110 / D-111 / D-112 / D-113:**
  - mode gelap (tombol tema; terang bawaan) dan semua warna lewat token;
  - Peta Belajar menggantikan daftar topik;
  - suara PAUD–Kelas 1 tidak lagi berlogat asing (kartu & kalimat campuran, singkatan TK/SD);
  - Momo UdaKids menjadi bawaan.
  - File baru `public/theme-init.js` ikut terbangun ke `dist`; tidak perlu mengubah CSP nginx.
- **D-106 — suara:**
  - suara bawaan browser dihapus total;
  - tebakan bahasa diperbaiki ("Momo baru!", "Siap main?", "Putar video" tidak lagi dibacakan suara British).
- **D-108 / D-115 — game baru Matematika:**
  - PAUD "Game berhitung seru" (GN, 10 game);
  - "Arena game" (GX) di PAUD, TK, dan Kelas 1–4: 6 × 10 level, 7 mekanik baru (balapan, dadu/domino, tendang
    pembulatan, hoki nilai tempat, balon, gelembung/batu, papan angka, ular/balok nilai tempat, bersihkan papan,
    atur jam, pizza/cokelat pecahan);
  - +7 kalimat perintah Momo. Tanpa migrasi; ikut `seed:prod`. Suara: jalankan `voice:prod` (langkah 6).

**Yang perlu di server:**

- **Migrasi baru `0020`** (index `events(type, ts)`): `migrate:prod` wajib.
- **`seed:prod` wajib:** Kelas 4, EMC, dan game baru (GN + GX).
- **File `baru-2026-10-09.ndjson.gz`** (±97 MB, sudah disiapkan di laptop): 3.809 klip suara Chirp + 129 foto.
  Tanpa kunci, tanpa kata sandi. Klip/foto yang sudah ada di server dilewati.
- **Cek `.env` server:**
  - `TTS_DAILY_LIMIT=20000` (atau baris dihapus);
  - `PEXELS_API_KEY` terisi (untuk foto yang masih kurang).

### 1. Laptop: cek akhir, commit, push, kirim file

Hentikan `pnpm dev` dulu (Ctrl+C). Jalankan satu baris demi satu baris:

```bash
cd ~/Repo/udakids
pnpm lint && pnpm typecheck && pnpm test && pnpm validate:content && pnpm build
git add -A
git status --short | grep -E "\.env$|\.dump$|backups/|\.ndjson" || echo "aman"
git commit -m "Kelas 4 + 6 game, UdaKids, audio hanya Chirp, ringkasan admin, EMC Kelas 3-4, Hias Momo (D-096…D-106)"
git push origin main
git log -1 --oneline
scp backups/baru-2026-10-09.ndjson.gz root@169.58.177.74:/root/backups/
```

- Cek hasilnya: semua cek hijau; `validate:content` → "7823 skill valid — 0 error".
- Baris `grep` harus `aman`.
- Catat hash dari `git log -1 --oneline`.

### 2. Server: cadangkan, ambil kode, build

```bash
ssh root@169.58.177.74
cd /var/www/kids.eduskul.my.id
PREV=$(git rev-parse --short HEAD); echo $PREV
U=$(grep "^DATABASE_URL=" .env | cut -d= -f2- | tr -d '"')
pg_dump "$U" -Fc -f /root/backups/sebelum-deploy-$(date +%F-%H%M).dump && ls -lh /root/backups | tail -2
psql "$U" -c "select (select count(*) from parents) ortu, (select count(*) from children) anak"
git pull origin main
git log -1 --oneline
pnpm install --frozen-lockfile
pnpm build
```

- `echo $PREV`: catat untuk rollback.
- Angka `ortu` dan `anak`: catat, harus sama setelah deploy.
- `git log -1 --oneline`: harus sama dengan hash di langkah 1.
- `pnpm build`: engine, api, web harus "Done". Bila gagal, berhenti dan kirim error-nya; layanan lama masih
  berjalan.

### 3. Server: `.env`, migrasi, seed, impor, nyalakan

```bash
grep -E "^TTS_DAILY_LIMIT|^PEXELS_API_KEY=." .env | sed 's/=.*/=…/'
systemctl stop little-coder-api
pnpm --filter @little-coder/api migrate:prod
pnpm --filter @little-coder/api seed:prod
cd apps/api
node dist/cli/carry.js import /root/backups/baru-2026-10-09.ndjson.gz
cd ../..
systemctl start little-coder-api
```

- `grep … .env`: harus ada `TTS_DAILY_LIMIT=…` (20000) dan `PEXELS_API_KEY=…`. Bila kurang, ubah dengan
  `nano .env`.
- `migrate:prod` → "Migrasi database selesai."
- `seed:prod` → `skill: … ditambahkan/diperbarui`, lebih dari 400.
- Impor → "Diimpor: kunci -; pengaturan -; … klip baru …; … gambar AI baru."

### 4. Server: periksa

```bash
sleep 5; systemctl is-active little-coder-api; curl -s http://127.0.0.1:7177/health; echo
psql "$U" -tAc "select count(*) from drizzle.__drizzle_migrations"
psql "$U" -tAc "select count(*) from skills where domain='math' and grade='sd4' and status='active'"
psql "$U" -tAc "select count(*) from skills where domain='math' and grade='sd34' and status='active' and template->>'category' ~ '^(E[A-H]|EY|GE)$'"
psql "$U" -c "select (select count(*) from parents) ortu, (select count(*) from children) anak"
cd apps/api
node dist/cli/voice.js --all --dry-run
node dist/cli/voice.js --all
node dist/cli/lesson-photos.js math sd4 math sd34
cd ../..
rm /root/backups/baru-2026-10-09.ndjson.gz
```

Hasil yang diharapkan:

| Perintah                   | Hasil                                              |
| -------------------------- | -------------------------------------------------- |
| `is-active` / `health`     | `active` / `"status":"ok"`                         |
| jumlah migrasi             | 21                                                 |
| skill Kelas 4              | 373                                                |
| skill EMC Kelas 3–4        | 101                                                |
| ortu, anak                 | sama dengan langkah 2                              |
| `voice.js --all --dry-run` | sedikit atau 0 belum bersuara                      |
| `voice.js --all`           | membuat sisanya (hanya bila ada)                   |
| `lesson-photos.js`         | mencari foto yang masih kurang, gratis dari Pexels |

### 5. Cek di browser (jendela penyamaran)

- **Landing:** header & footer bertuliskan **UdaKids**.
- **Kelas 4 → Matematika:** 33 topik + "Game seru matematika"; Game seru Level 1 "Tebak angka Momo" bisa dimainkan.
- **Kelas 3–4 (Olimpiade):** bagian EMC tampil.
- **SMP Kelas 7–9 → English → topik apa saja:**
  - tombol "Dengarkan": kalimat Indonesia bersuara Indonesia, kalimat English bersuara British, tanpa suara robot HP;
  - jawab satu soal keliru: pembahasan berbahasa Indonesia dibacakan suara Indonesia.
- **Admin → Ringkasan:** grafik baru dan filter bulan/tahun tampil.
- **Anak → Profil → Hias Momo:**
  - tab Model/Warna/Pola/Kepala/Pernik tampil;
  - ketuk "Acak" dan tab "Pernik": suaranya suara Momo berbahasa Indonesia, bukan suara robot English;
  - ketik kode warna `#13C2C2` → Momo berganti warna;
  - Simpan → Momo baru tampil di profil dan papan peringkat.
- **Anak → Papan peringkat:** setiap baris bertuliskan "Main … lalu".
- **Landing:** logo U merah di kiri atas, menu "Tentang" menuju section "Kenapa namanya UdaKids?".
- **Anak → jawab satu soal keliru:** pilihan berwarna kuning dengan "Belum tepat…" + petunjuk, tidak merah.
- **Tema:** tombol bulan/matahari di header landing → mode gelap; muat ulang → tetap gelap; kembali terang.
- **Anak → Pustaka:** Peta Belajar (jalur & simpul topik), panel topik, "Mulai belajar" merah.
- **Anak → buku English Kelas 1–2 → soal warna:** kartu "hijau" bersuara Indonesia, "green" bersuara British.
- **Ikon tab browser:** logo U merah (bila masih Momo lama, muat ulang paksa / bersihkan cache).

Bila ada kalimat yang diam (tanpa suara), tunggu sebentar lalu ketuk speaker lagi: klip baru sedang dibuat.

### 6. Bersihkan laptop

```bash
rm ~/Repo/udakids/backups/baru-2026-10-09.ndjson.gz
```

### Rollback

```bash
cd /var/www/kids.eduskul.my.id
git checkout $PREV && pnpm install --frozen-lockfile && pnpm build && systemctl restart little-coder-api
```

- Migrasi 0020 hanya menambah index, jadi aman untuk versi lama.
- Soal Kelas 4 & EMC tetap ada di database dan tampil di versi lama, tetapi 6 game Kelas 4 tidak bisa dimainkan di
  sana. Bila rollback lebih dari sebentar, pulihkan cadangan `pg_dump` dari langkah 2.

---

## Rilis berikutnya (D-095): foto simulasi dari Pexels, kredit foto, galeri admin

**Isi rilis:** `lesson:photos` mencari foto gratis di Pexels lalu disaring Claude (D-095), `--max=N`, berhenti
sendiri setelah 3 gagal beruntun, kredit fotografer di Admin → AI Gambar, baris kredit Pexels di footer landing,
galeri AI Gambar menampilkan "Disetujui" lebih dulu.

**Tanpa migrasi, tanpa perubahan `content/`** → `migrate:prod`/`seed:prod` tidak wajib (aman bila dijalankan).
Env baru: `PEXELS_API_KEY` (wajib untuk `lesson:photos`). 62 foto Pexels dari laptop dibawa dengan file
`carry --images-only` (±4 MB, tanpa kunci/pengaturan/klip, tanpa kata sandi), jadi tidak dicari ulang di server.

### 1. Laptop: cek, commit, push

```bash
cd ~/Repo/udakids
# hentikan pnpm dev dulu (Ctrl+C)
pnpm lint && pnpm typecheck && pnpm test && pnpm validate:content && pnpm build
git add -A
git status --short | grep -E "\.env$|\.dump$|backups/|\.ndjson" || echo "aman"
git commit -m "Foto simulasi dari Pexels disaring Claude, kredit foto, galeri admin (D-095)"
git push origin main
git log -1 --oneline                                      # catat hash
```

### 2. Server: kode baru

```bash
ssh root@169.58.177.74
cd /var/www/kids.eduskul.my.id
PREV=$(git rev-parse --short HEAD); echo $PREV
git pull origin main
git log -1 --oneline                                      # = hash langkah 1
pnpm install --frozen-lockfile
pnpm build                                                # engine, api, web: Done
systemctl restart little-coder-api
sleep 5; curl -s http://127.0.0.1:7177/health; echo       # "status":"ok"
```

### 3. Server: kunci Pexels

```bash
nano .env          # tambah satu baris (tanpa spasi/kutip): PEXELS_API_KEY=<kunci dari pexels.com/api>
grep -c "^PEXELS_API_KEY=." .env                          # 1
```

Kunci Claude sudah ada di server (dibawa `carry`). Cek di Admin → AI Gambar: "Kunci Claude" terisi.

### 3b. Bawa 62 foto Pexels dari laptop

Laptop (terminal biasa, bukan ssh):

```bash
cd ~/Repo/udakids
pnpm carry:export -- $PWD/backups/gambar-$(date +%F).ndjson.gz --images-only
# "Diekspor: kunci -; pengaturan -; 0 klip suara, 62 gambar AI (4.2 MB) → …"
scp backups/gambar-*.ndjson.gz root@169.58.177.74:/root/backups/
```

Server (sesudah langkah 2, karena butuh kode baru):

```bash
cd /var/www/kids.eduskul.my.id/apps/api
node dist/cli/carry.js import /root/backups/gambar-*.ndjson.gz
# "Diimpor: kunci -; pengaturan -; 0 dari 0 klip baru …; 62 dari 62 gambar AI baru."
rm /root/backups/gambar-*.ndjson.gz
```

Gambar yang sudah ada di server tidak ditimpa; kunci, pengaturan, dan klip suara server tidak disentuh.

### 4. Server: foto simulasi Kelas 1

```bash
cd /var/www/kids.eduskul.my.id/apps/api
B="math sd1 sains sd1 math sd12 sains sd12 english sd12"
node dist/cli/lesson-photos.js $B --dry-run               # "… belum ada, … dicari sekarang"
node dist/cli/lesson-photos.js $B --max=5                 # coba 5: baris "foto   … ← Pexels #…"
nohup node dist/cli/lesson-photos.js $B > /root/lesson-photos.log 2>&1 &
tail -f /root/lesson-photos.log                           # Ctrl+C = berhenti memantau saja
```

- Lama: ±2–4 jam (batas Pexels 200 permintaan/jam; skrip menunggu sendiri).
- Biaya: foto 0; penyaringan Claude ±US$2–4 total, ikut batas harian AI Gambar.
- Baris akhir: `Selesai: … foto Pexels disetujui, … tanpa foto cocok (gambar cadangan), 0 gagal, biaya …`.
- Terputus/berhenti → jalankan perintah `nohup` yang sama lagi; foto yang sudah ada dilewati.
- `gagal … Kunci Pexels ditolak` → perbaiki `PEXELS_API_KEY` di `.env`, lalu jalankan lagi (tanpa restart API).

### 5. Periksa

- Admin → AI Gambar: galeri langsung "Disetujui"; kartu foto Pexels memuat "Pexels #… · Foto: …".
- Foto yang kurang pas → **Tolak**; foto itu tidak dicari ulang dan kartunya kembali ke gambar cadangan.
- Kelas 1 → English → "Fruits and vegetables" → "Belajar dulu" → simulasi: kartu memakai foto asli.
- Landing (`https://kids.eduskul.my.id`): footer "Sebagian foto pelajaran berasal dari Pexels".

### Rollback

```bash
cd /var/www/kids.eduskul.my.id
git checkout $PREV && pnpm install --frozen-lockfile && pnpm build && systemctl restart little-coder-api
```

Foto yang sudah tersimpan tetap aman dan tetap tampil (aplikasi anak tidak berubah di rilis ini).

---

## Rilis berikutnya (D-079 … D-094): PAUD lengkap, Video Momo semua topik, simulasi Kelas 1, semua suara Chirp 3 HD

**Isi rilis:**

- PAUD lengkap:
  - Worksheet PAUD 21 topik (210 level), termasuk latihan menulis angka 1–10 dan huruf a–z (D-079 … D-083);
  - game lama Worksheet dikembalikan sebagai topik T/U (D-089).
- Semua topik terbuka di Level 1, dan anak boleh memilih topik acak (D-082).
- "Belajar dulu" dengan Video Momo di semua topik (D-090), plus pelajaran pancaindra interaktif dan game "ketuk di
  wajah" (D-089).
- Semua suara memakai Chirp 3 HD dari server (D-091); simulasi pelajaran & AI Gambar dari sesi lain (D-087, D-088,
  D-092).
- Pelajaran + simulasi untuk semua topik Kelas 1 (`math/sd1`, `sains/sd1`, `math/sd12`, `sains/sd12`,
  `english/sd12`, D-093). Foto realistis menyusul (`lesson:photos`); sampai saat itu tampil gambar cadangan.
- Mock test 1 gratis bisa dimainkan lagi oleh anak tanpa paket, dengan soal dari level 1–5 (D-094).
- **Tanpa migrasi baru** setelah 0019, tanpa dependensi atau env wajib baru. Bila rilis 2026-10-08 (D-073 … D-078) belum
  pernah di-deploy, langkah ini sekaligus membawanya: `migrate:prod` menjalankan 0018/0019 yang belum ada.
- **Kunci API & suara tidak diisi dua kali:** file `carry` membawa dari laptop ke server:
  - API key Google TTS & Claude (dan OpenAI bila ada);
  - pengaturan suara & AI Gambar;
  - ±16.000 klip Chirp dan gambar AI yang sudah dibayar.
- **Cek `.env` server:** bila ada `TTS_DAILY_LIMIT=3000`, ubah ke `20000` (atau hapus barisnya; bawaan 20000).
  Batas 3000 membuat anak mendengar suara browser setelah batas tercapai (audit D-091, 9 Okt 2026).
  Perintahnya ada di langkah 4.
- **`GOOGLE_TTS_API_KEY` di `.env`:** `carry` membawa kunci yang diisi di **Admin → Suara Momo**, bukan isi `.env`.
  Bila kunci di `.env` laptop diganti dan server juga memakai `.env`, salin kuncinya sendiri ke `.env` server
  (jangan lewat chat/git). Kunci `.env` didahulukan daripada kunci admin. Klip yang sudah ada tetap dipakai walau
  kuncinya diganti.

### 0. Laptop: siapkan file `carry` (kunci API + klip suara)

Klip suara sudah lengkap (9 Okt 2026: 14.688 kalimat, 0 belum bersuara). Hentikan `pnpm dev`, lalu buat file dengan kata sandi sementara (minimal 12 huruf, jangan
disimpan di file atau git):

```bash
cd ~/Repo/udakids
read -rs CARRY_PASSPHRASE && export CARRY_PASSPHRASE      # ketik kata sandi sementara, Enter
pnpm carry:export -- $PWD/backups/carry-$(date +%F).ndjson.gz
# "Diekspor: kunci voice_key, ai_claude_key; pengaturan voice; ±16000 klip suara (±300 MB) → …"
```

Isi file tidak berisi API key dalam bentuk terbaca: kunci dikunci dengan kata sandi tadi. Folder `backups/` tidak
masuk git.

### 1. Laptop: cek, commit, push

Hentikan `pnpm dev` dulu (Ctrl+C), karena build menghapus `dist/` yang sedang dipakai dev server.

```bash
cd ~/Repo/udakids
pnpm lint && pnpm typecheck && pnpm test && pnpm validate:content && pnpm build
# semua hijau; validate:content: "0 error". (pnpm lint memeriksa juga docs/udakids.code-workspace milik Anda —
# bila hanya file itu yang ditandai, jalankan: npx prettier --write docs/udakids.code-workspace, atau abaikan.)

git add -A
git status --short | grep -E "\.env$|\.dump$|backups/|test-results|\.ndjson" || echo "aman"
git diff --cached --stat -- apps/api/drizzle | tail -3    # kosong (tidak ada migrasi baru)
git commit -m "PAUD lengkap, Video Momo semua topik, simulasi Kelas 1, suara Chirp 3 HD, mock gratis (D-079…D-094)"
git push origin main
git log -1 --oneline                                      # catat hash ini
```

Bila `grep` menampilkan file selain `aman`, batalkan dengan `git reset <file>`.

### 2. Server: masuk, cadangkan, catat angka awal

```bash
ssh root@169.58.177.74
cd /var/www/kids.eduskul.my.id
PREV=$(git rev-parse --short HEAD); echo "versi sekarang: $PREV"
U=$(grep "^DATABASE_URL=" .env | cut -d= -f2- | tr -d '"')
git status --short                                        # harus kosong
mkdir -p /root/backups && chmod 700 /root/backups
pg_dump "$U" -Fc -f /root/backups/sebelum-deploy-$(date +%F-%H%M).dump && ls -lh /root/backups | tail -1
psql "$U" -c "
  select (select count(*) from parents)  ortu,
         (select count(*) from children) anak,
         (select count(*) from skills where status = 'active') skill_aktif,
         (select count(*) from voice_clips) klip_suara,
         (select count(*) from drizzle.__drizzle_migrations) migrasi"
```

**Catat angkanya.** `ortu` dan `anak` harus tetap sama setelah deploy.

### 3. Laptop: kirim file `carry` ke server

Di terminal laptop (bukan di ssh):

```bash
cd ~/Repo/udakids
scp backups/carry-*.ndjson.gz root@169.58.177.74:/root/backups/
```

### 4. Server: ambil kode, build, migrasi, seed, impor kunci & suara

```bash
cd /var/www/kids.eduskul.my.id
git pull origin main
git log -1 --oneline                                      # = hash dari langkah 1
grep TTS_DAILY_LIMIT .env                                 # kosong atau 20000
sed -i 's/^TTS_DAILY_LIMIT=.*/TTS_DAILY_LIMIT=20000/' .env  # bila tadi 3000
pnpm install --frozen-lockfile
pnpm build                                                # engine, api, web: Done
systemctl stop little-coder-api
pnpm --filter @little-coder/api migrate:prod              # "Migrasi database selesai."
pnpm --filter @little-coder/api seed:prod                 # soal, buku, pelajaran, dialog baru
cd apps/api
read -rs CARRY_PASSPHRASE && export CARRY_PASSPHRASE      # kata sandi yang sama dengan langkah 0
node dist/cli/carry.js import /root/backups/carry-*.ndjson.gz
# "Diimpor: kunci voice_key (…TN-U), ai_claude_key (…qgAA); pengaturan voice; ±16000 dari ±16000 klip baru …"
unset CARRY_PASSPHRASE
cd ../..
systemctl start little-coder-api
```

Keluaran `seed:prod` yang diharapkan:

- `skill: … ditambahkan/diperbarui` lebih dari 0 (Worksheet PAUD, latihan menulis, pancaindra, KMSI);
- buku Kelas 1 ikut diperbarui (pelajaran + simulasi D-093 tersimpan di katalog);
- `skill lama … → draft` boleh muncul.

Kunci API diimpor dengan `JWT_SECRET` server (dibaca dari `.env`), jadi Admin → Suara Momo dan Admin → AI Gambar
langsung terisi. Impor aman diulang: klip yang sudah ada dilewati, dan kunci ditimpa dengan nilai yang sama.

Bila `pnpm build` gagal: jangan migrasi/seed, jalankan `systemctl start little-coder-api` bila sempat di-stop,
lalu kirim pesan error-nya.

### 5. Periksa

```bash
sleep 5
systemctl is-active little-coder-api                                   # active
curl -s http://127.0.0.1:7177/health; echo                             # "status":"ok","db":"up"
psql "$U" -tAc "select count(*) from drizzle.__drizzle_migrations"     # 20
psql "$U" -tAc "select count(*) from skills where domain='worksheet' and grade='prek' and status='active'"   # 210
psql "$U" -tAc "select string_agg(c->>'code', ' ') from skill_catalogs, jsonb_array_elements(categories) c
  where domain='worksheet' and grade='prek'"
# A I F G H M N B T J K L C D O P Q R S E U
psql "$U" -tAc "select c->'lesson'->>'kode' from skill_catalogs, jsonb_array_elements(categories) c
  where domain='sains' and grade='tkosn' and c->>'code'='A'"                                              # K-SA-12
psql "$U" -tAc "select key, value->>'last4' from app_settings where key like '%key' order by key"
# ai_claude_key | qgAA   ·   voice_key | TN-U   (4 huruf terakhir kunci Anda)
psql "$U" -tAc "select value->>'model', value->>'voice' from app_settings where key='voice'"   # chirp3-hd | Leda
psql "$U" -tAc "select count(*) from voice_clips"                      # ±16000
psql "$U" -tAc "select count(*) from skill_catalogs, jsonb_array_elements(categories) c
  where grade in ('sd1','sd12') and c->'lesson'->'layar' @> '[{\"jenis\":\"peraga\"}]'"  # 130
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:7177/voice/say?t=Tepat%21"            # 200
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:7177/voice/say?t=beli%20saham%20sekarang"  # 404
cd apps/api && node dist/cli/voice.js --all --dry-run; cd ../..        # "… 0 belum bersuara" (atau sedikit)
psql "$U" -c "select (select count(*) from parents) ortu, (select count(*) from children) anak"   # = langkah 2
```

### 6. Cek di browser (jendela penyamaran)

- `https://kids.eduskul.my.id/play` → PAUD → Worksheet: Numerasi 9 materi, Literasi 12 materi; label "Disarankan".
- Buka topik apa saja → "Belajar dulu" → Video Momo memutar contoh soal ("Contoh soal" → "Ini jawabannya").
  Suaranya Chirp (suara manusia yang natural), bukan suara bawaan HP.
- Sains TK (Olimpiade) → "Tubuhku dan pancaindra" → Video Momo, jelajah wajah, game ketuk di wajah (Level 1).
- Kelas 1 → Matematika → topik apa saja → "Belajar dulu": ada layar simulasi (alat peraga, gambar cadangan).
- TK (Olimpiade) → Matematika → Mock Test, dengan akun anak tanpa paket: "Mulai mock test" → soal tampil (D-094).
- Admin → Suara Momo: model chirp3-hd, kunci terisi, jumlah klip ±16.000. Admin → AI Gambar: kunci Claude terisi.

### 7. Bersihkan file `carry`

```bash
rm /root/backups/carry-*.ndjson.gz                        # server
rm ~/Repo/udakids/backups/carry-*.ndjson.gz               # laptop
```

### Rollback

```bash
cd /var/www/kids.eduskul.my.id
git checkout $PREV && pnpm install --frozen-lockfile && pnpm build && systemctl restart little-coder-api
```

Data tidak perlu dipulihkan, karena rilis ini tidak mengubah struktur tabel. Soal baru dari `seed:prod`, kunci, dan
klip suara tetap ada tanpa mengganggu versi lama. Pulihkan cadangan `pg_dump` hanya bila diminta.

---

## Rilis 2026-10-08 (D-073 … D-078): migrasi 0018 + 0019, KMSI, mock test, artikel, PAUD, katalog ringan, Game seru

**Isi rilis:**

- Video panduan & artikel di landing, artikel dengan banyak gambar (slider), 10 Besar, "Lanjutkan permainan" (D-073, D-076).
- Olimpiade KMSI untuk TK s.d. SMP (soal + 3 mock test per buku, KKM) dan peringkat mock di landing (D-074).
- Mock test pindah ke dalam bagian lombanya: EMC/ESC/EEC/KMSI → "Kisi-kisi soal & topik" lalu "Mock test" (D-076).
- Worksheet PAUD Baca Tulis + game interaktif; label Pra-TK → PAUD (D-075).
- Layar tunggu Momo yang animatif + katalog dikompres (±35 MB → ±3 MB) dan tidak diunduh ulang tiap halaman (D-077).
- **Game seru (D-078):** topik "Game seru" (10 level, 10 jenis game berbeda) di 26 buku: PAUD, TK, Kelas 1–3, Sains
  Kelas 4, dan semua buku Olimpiade. Topik Game angka & Game huruf di Worksheet PAUD dirombak supaya tidak ada jenis
  game yang berulang (12 level lama → draft, progres level yang dipertahankan tetap). Level game tidak dipakai mock
  test maupun lomba live.

**Yang dibawa ke server hanya kode, migrasi, dan konten soal** dari git. Akun, anak, skor, progres, artikel, atau
gambar percobaan di laptop **tidak** ikut, karena semua itu hanya ada di database laptop dan database laptop tidak
dikirim. Jangan memakai `db:backup`/`db:restore` dari laptop untuk rilis ini.

Tanpa env baru dan tanpa dependensi sistem baru. **Perlu `migrate:prod` DAN `seed:prod`.**

> Diuji 2026-10-08 di laptop dengan database kosong + `NODE_ENV=production`:
>
> - Hasil: 20 migrasi, 27 buku, 5.794 skill aktif (54 mock test, 260 level Game seru di 26 buku), 3 level, 1 dialog,
>   1 admin.
> - Data lain kosong: 0 orang tua/anak/kelas/event/skor/artikel/media.
> - Satu baris `app_settings` "news" hanya penanda waktu email info materi, bukan data percobaan.

### 1. Laptop: cek, commit, push

Sebagian rilis ini (termasuk migrasi 0018/0019) sudah ada di `origin/main` (commit `1afa173`, `d436640`). Game seru
(D-078) dan beberapa perbaikan lain **belum di-commit** (±350 file per 2026-10-08). Cek dulu:

```bash
cd ~/Repo/udakids
git fetch origin && git status -sb
# "## main...origin/main" tanpa [ahead …] dan tanpa file M/?? → sudah lengkap, langsung ke langkah 2.
```

Bila masih ada file berubah, lanjutkan langkah di bawah. Hentikan `pnpm dev` dulu (Ctrl+C), karena build
menghapus `dist/` yang sedang dipakai dev server.

```bash
cd ~/Repo/udakids
pnpm lint && pnpm typecheck && pnpm test && pnpm validate:content && pnpm build
# semua harus hijau; validate:content: "0 error"

git add -A
# pastikan tidak ada rahasia / dump / data lokal yang ikut:
git status --short | grep -E "\.env$|\.dump$|backups/|test-results|\.png$" || echo "aman"
git diff --cached --stat -- apps/api/drizzle | tail -3   # boleh kosong: 0018 & 0019 sudah di origin/main
git commit -m "Game seru 26 buku + Worksheet PAUD comply, layar tunggu Momo, katalog ringan (D-077, D-078)"
git push origin main
git log -1 --oneline                                      # catat hash commit ini
```

Bila `grep` menampilkan file selain `aman`, batalkan dengan `git reset <file>` lalu ulangi `git status`.

### 2. Server: masuk, cadangkan, catat angka awal

```bash
ssh root@169.58.177.74
cd /var/www/kids.eduskul.my.id
PREV=$(git rev-parse --short HEAD); echo "versi sekarang: $PREV"
U=$(grep "^DATABASE_URL=" .env | cut -d= -f2- | tr -d '"')
git status --short                                   # harus kosong (tidak ada suntingan langsung di server)
mkdir -p /root/backups && chmod 700 /root/backups
pg_dump "$U" -Fc -f /root/backups/sebelum-deploy-$(date +%F-%H%M).dump && ls -lh /root/backups | tail -1
psql "$U" -c "
  select (select count(*) from parents)  ortu,
         (select count(*) from children) anak,
         (select count(*) from events)   event,
         (select count(*) from skills where status = 'active') skill_aktif,
         (select count(*) from skill_catalogs) buku,
         (select count(*) from drizzle.__drizzle_migrations) migrasi"
```

**Catat angkanya.** `ortu` dan `anak` harus tetap sama setelah deploy (event boleh bertambah karena anak bermain).
`migrasi` sekarang 18 (0000–0017), 19, atau 20 bila commit `1afa173`/`d436640` sudah pernah di-deploy. Semua aman:
`migrate:prod` hanya menjalankan yang belum ada.

### 3. Ambil kode, build, migrasi, seed

```bash
git pull origin main
git log -1 --oneline                                 # = hash dari langkah 1
git diff --stat $PREV HEAD -- apps/api/drizzle | tail -3
pnpm install --frozen-lockfile
pnpm build                                           # engine, api, web: Done
systemctl stop little-coder-api
pnpm --filter @little-coder/api migrate:prod         # "Migrasi database selesai." (0018 + 0019)
pnpm --filter @little-coder/api seed:prod            # soal, buku, dialog baru
systemctl start little-coder-api
```

Keluaran `seed:prod` yang diharapkan:

```text
skill: … ditambahkan/diperbarui dari 5821 file    ← > 0 (KMSI, mock, worksheet PAUD, Game seru 260 level)
katalog lama yang disunting admin juga mendapat materi baru; judul "Pra-TK" → "PAUD" dan "(OSN)" → "(Olimpiade)" ikut diganti
skill: … skill lama tidak ada di konten → draft     ← ±12 (level Worksheet game yang diganti, D-078)
level: 0 ditambahkan/diperbarui
dialog: 1 ditambahkan/diperbarui                    ← kalimat suara baru (game PAUD & Game seru)
```

**Jangan** jalankan `pnpm db:seed`, `pnpm db:setup`, `pnpm db:restore`, `pnpm db:generate`, atau `seed:prod --force`
di server (yang terakhir menimpa suntingan admin).

Bila `pnpm build` gagal: jangan migrasi/seed, jalankan `systemctl start little-coder-api` (bila sempat di-stop),
lalu kirim pesan error-nya.

### 4. Periksa

```bash
sleep 5
systemctl is-active little-coder-api                                   # active
curl -s http://127.0.0.1:7177/health; echo                             # "status":"ok","db":"up"
psql "$U" -tAc "select count(*) from drizzle.__drizzle_migrations"     # 20
psql "$U" -tAc "select to_regclass('videos'), to_regclass('articles')" # videos | articles
psql "$U" -tAc "select count(*) from skill_catalogs"                   # 27
psql "$U" -tAc "select count(*) from skills where template->>'family' = 'mock' and status = 'active'"   # 54
psql "$U" -tAc "select count(*) from skills where category = 'GM' and status = 'active'"              # 260
psql "$U" -tAc "select count(*) from skill_catalogs where categories::text like '%\"GM\"%'"           # 26
psql "$U" -tAc "select count(*) from skills where domain = 'worksheet' and category in ('B','E') and status = 'active'"  # 20
psql "$U" -c "
  select domain, grade, title,
         (select count(*) from jsonb_array_elements(categories) c where c->>'mock' = 'true') mock,
         updated_by is not null disunting_admin
  from skill_catalogs where grade in ('tkosn','sd12','sd34','sd56','smp79') order by grade, domain"
# 15 baris; kolom mock: 2 untuk tkosn (EMC/ESC/EEC + KMSI), 1 untuk sd12…smp79 (KMSI)
psql "$U" -c "
  select (select count(*) from parents)  ortu,
         (select count(*) from children) anak,
         (select count(*) from skills where status = 'active') skill_aktif"   # ortu & anak = langkah 2
curl -s http://127.0.0.1:7177/leaderboard/public/mocks | grep -o '"competition":"[A-Z]*"' | sort | uniq -c
# KMSI, EMC, ESC, EEC
psql "$U" -c "select domain, title, jsonb_array_length(categories) materi from skill_catalogs where grade = 'prek' order by domain"
# english   English PAUD    …
# math      Math PAUD       …
# worksheet Worksheet PAUD  5

# Katalog dikompres (D-077): ganti email & sandi admin Anda
T=$(curl -s -X POST http://127.0.0.1:7177/auth/staff/login -H 'Content-Type: application/json' \
  -d '{"email":"EMAIL-ADMIN","password":"SANDI-ADMIN"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')
curl -s -o /dev/null -w "gzip %{size_download} byte\n" -H "Accept-Encoding: gzip" -H "Authorization: Bearer $T" \
  http://127.0.0.1:7177/catalog                                         # ±3.000.000 (bukan ±35.000.000)
```

**Bila jumlah katalog dengan GM < 26:** katalog itu pernah disunting admin dan topik baru belum masuk; jalankan
`seed:prod` sekali lagi (topik baru ditambahkan tanpa menghapus suntingan admin).

**Bila ada buku dengan `mock` = 0 atau judul masih "(OSN)":** katalog itu pernah diubah lewat Admin → Katalog.
Seed sekarang tetap menambahkan materi baru, memindahkan mock, dan mengganti "(OSN)" → "(Olimpiade)" tanpa menghapus
suntingan admin. Jadi cukup jalankan `seed:prod` sekali lagi. Bila masih belum berubah, kirim hasil query di atas.

**Worksheet PAUD:** bila judulnya masih "Pra-TK" atau Worksheet hanya 1 materi, ikuti catatan "Tambahan rilis yang sama
(D-075)" di bawah.

**Nginx (sekali saja, untuk video YouTube):**

```bash
grep -n "Content-Security-Policy\|set \$csp" /etc/nginx/sites-enabled/*
```

- Tidak ada hasil → lewati.
- Ada → di `img-src …;` tambahkan ` https://i.ytimg.com`, dan di `frame-src …;` tambahkan
  ` https://www.youtube-nocookie.com`. Bila belum ada `frame-src`, buat `frame-src https://www.youtube-nocookie.com;`.
  Contohnya ada di `deploy/nginx.conf.example`.
- Lalu jalankan `nginx -t && systemctl reload nginx`.

Gambar artikel tidak perlu perubahan Nginx, karena dilayani dari `/api/media/…` (domain yang sama).

### 5. Cek di browser (jendela penyamaran)

1. `https://kids.eduskul.my.id/play` → masuk anak → **TK (Olimpiade)** → **Matematika**. Harus tampil bagian
   **EMC** dengan subjudul "Kisi-kisi soal & topik" lalu "Mock test", dan bagian **KMSI** dengan susunan yang sama.
2. **Kelas 1–2 (Olimpiade)** → **English** → bagian KMSI: 12 materi + "Mock test".
3. Landing → **Peringkat Mock Test**: tab KMSI 2026, EMC · Matematika, ESC · Sains, EEC · English.
4. `/masuk/staf` → Admin → **Artikel & berita** → tulis artikel, unggah 2–3 gambar sekaligus, status **Terbit**.
   Di `/artikel/<slug>`, gambarnya harus bisa digeser. Admin → **Video panduan** → tempel satu tautan YouTube.
5. **PAUD** → **Worksheet**: bagian Numerasi dan Literasi, "Huruf vokal a dan i" langsung terbuka.
6. Buku mana saja (mis. **Kelas 1** → **Matematika**, **TK (Olimpiade)** → **Sains**): paling bawah ada bagian
   **Game Seru Momo** berisi 1 topik, 10 level dengan jenis game berbeda. Level 1 bisa langsung dimainkan.
7. Mock test di buku Olimpiade tidak pernah berisi soal game (kartu pasangan, labirin, neraca, …).

Artikel, video, dan banner diisi lewat Admin di server. Isi percobaan di laptop memang tidak ikut terbawa.

Perangkat anak memperbarui katalog sendiri saat online. Bila masih tampil versi lama, muat ulang halaman.

### 6. Opsional: suara Momo untuk kalimat baru

Bila `GOOGLE_TTS_API_KEY` sudah diisi di Admin/`.env`:

```bash
pnpm --filter @little-coder/api voice:prod           # "Suara Momo: … dibuat"
```

### Rollback

```bash
cd /var/www/kids.eduskul.my.id
git checkout $PREV && pnpm install --frozen-lockfile && pnpm build && systemctl restart little-coder-api
```

- Migrasi 0018/0019 hanya menambah tabel/kolom, dan seed hanya menambah konten, jadi kode lama tetap jalan tanpa
  memulihkan database.
- Pulihkan dari `/root/backups/sebelum-deploy-….dump` hanya bila data rusak (lihat bagian Rollback rilis
  2026-10-07). Semua perubahan setelah cadangan akan hilang.

### Bila Worksheet/judul PAUD belum berubah (cadangan, biasanya tidak perlu)

`seed:prod` sudah mengganti judul "Pra-TK" → "PAUD" dan menambah materi B–E Worksheet walau katalognya pernah
disunting admin. Bila setelah langkah 4 judul masih "Pra-TK", ganti judulnya saja (isi tidak disentuh):

```bash
psql "$U" -c "update skill_catalogs set title = replace(title, 'Pra-TK', 'PAUD') where grade = 'prek' and title like '%Pra-TK%'"
```

Bila Worksheet masih 1 materi, kirim hasil query `select … where grade = 'prek'` di langkah 4 (jangan langsung
memakai `seed:prod --force`, karena itu menimpa semua suntingan admin).

---

## Rilis 2026-10-07 (commit `5be6a4e`): migrasi 0017 + soal baru

Isi: AI Gambar di admin (tabel `ai_images`, `ai_usage`), buku **Worksheet Pra-TK** (pelajaran angka, tebalkan,
sambung titik, balon), buku **English TK (Olimpiade)** (12 materi × 10 level), materi baru Math/Sains TK (Olimpiade),
dan suara perintah baru. Tanpa env baru, tanpa dependensi baru.

**Bila kode `5be6a4e` sudah di-pull dan di-build di server tapi soal baru belum muncul:** seed belum dijalankan.
Mulai dari langkah 2, lalu di langkah 3 boleh lewati `git pull` dan `pnpm install`.

### 1. Laptop: commit dan push

Hentikan `pnpm dev` dulu (build menghapus `dist/` yang dipakai dev server).

```bash
cd ~/Repo/udakids
pnpm lint && pnpm typecheck && pnpm test && pnpm validate:content && pnpm build
git add -A
git status --short | grep -E "\.env$|\.dump|backups/" || echo "aman"
git commit -m "<ringkasan rilis>"
git push origin main
git log -1 --oneline
```

### 2. Server: cadangkan dan catat angka awal

```bash
ssh root@169.58.177.74
cd /var/www/kids.eduskul.my.id
PREV=$(git rev-parse --short HEAD); echo "versi sekarang: $PREV"
U=$(grep "^DATABASE_URL=" .env | cut -d= -f2- | tr -d '"')
git status --short                                   # harus kosong
mkdir -p /root/backups && chmod 700 /root/backups
pg_dump "$U" -Fc -f /root/backups/sebelum-deploy-$(date +%F-%H%M).dump && ls -lh /root/backups | tail -1
psql "$U" -c "
  select (select count(*) from parents)  ortu,
         (select count(*) from children) anak,
         (select count(*) from skills where status = 'active') skill_aktif,
         (select count(*) from skill_catalogs) buku,
         (select count(*) from drizzle.__drizzle_migrations) migrasi"
```

Catat angkanya. `ortu` dan `anak` harus tetap sama setelah deploy.

### 3. Ambil kode, build, migrasi, seed

```bash
git pull origin main
git log -1 --oneline                                 # 5be6a4e (atau commit terbaru Anda)
git diff --stat $PREV HEAD -- apps/api/drizzle content | tail -3
pnpm install --frozen-lockfile
pnpm build                                           # engine, api, web: Done
systemctl stop little-coder-api
pnpm --filter @little-coder/api migrate:prod         # menerapkan 0017_ai_images
pnpm --filter @little-coder/api seed:prod            # memasukkan soal & buku baru
systemctl start little-coder-api
```

Keluaran `seed:prod` yang diharapkan (angka bisa sedikit berbeda):

```text
skill: … ditambahkan/diperbarui dari … file      ← harus > 0 untuk rilis ini
skill: … skill lama tidak ada di konten → draft   ← boleh muncul (mis. id lama yang dipindah)
level: 0 ditambahkan/diperbarui
dialog: 1 ditambahkan/diperbarui                  ← kalimat suara baru (tebalkan, sambung titik)
```

Bila `pnpm build` gagal: jangan jalankan migrasi/seed, `systemctl start little-coder-api` (bila sempat di-stop),
lalu kirim pesan error-nya.

### 4. Periksa

```bash
sleep 5
systemctl is-active little-coder-api                                  # active
curl -s http://127.0.0.1:7177/health; echo                            # "status":"ok","db":"up"
psql "$U" -tAc "select count(*) from drizzle.__drizzle_migrations"    # 18
psql "$U" -c "
  select domain, grade, title, jsonb_array_length(categories) materi, updated_by is not null disunting_admin
  from skill_catalogs
  where (domain, grade) in (('worksheet','prek'), ('english','tkosn'), ('math','tkosn'), ('sains','tkosn'))
  order by domain"
# english   tkosn  English TK (Olimpiade)  12
# math      tkosn  Math TK (Olimpiade)     (bertambah, ada bagian EMC)
# sains     tkosn  …                       (bertambah, ada bagian ESC)
# worksheet prek   Worksheet Pra-TK        1
psql "$U" -c "
  select (select count(*) from parents)  ortu,
         (select count(*) from children) anak,
         (select count(*) from skills where status = 'active') skill_aktif"   # ortu & anak sama dengan langkah 2
```

Bila sebuah buku lama tidak bertambah materinya dan kolom `disunting_admin` = `t`: katalog itu pernah diubah lewat
Admin → Katalog, sehingga seed sengaja tidak menimpanya. Tambahkan materinya lewat Admin → Katalog, atau (bila
suntingan admin di katalog itu memang boleh hilang) jalankan
`psql "$U" -c "update skill_catalogs set updated_by = null where domain='math' and grade='tkosn'"` lalu
`pnpm --filter @little-coder/api seed:prod` sekali lagi.

Di browser (jendela penyamaran supaya cache lama tidak terpakai):

1. `https://kids.eduskul.my.id/play` → masuk anak → **Pra-TK** → tab **Worksheet** → "Mengenal angka 1 sampai 10".
2. **TK (Olimpiade)** → tab **English** → 12 materi (Kisi-kisi 1–4, Simulasi Final 2026).
3. `/masuk/staf` → Admin → **AI Gambar** terbuka tanpa error.

Perangkat anak yang sudah pernah membuka aplikasi memperbarui katalog sendiri saat online. Bila masih tampil versi
lama, muat ulang halaman.

### 5. Sekali saja: kunci AI Gambar

1. OpenAI: **cabut** kunci yang pernah tertempel di chat, buat kunci baru di Project khusus (izin Images/Responses
   saja) dengan batas biaya.
2. Admin → **AI Gambar** → isi kunci + sandi admin → **Simpan kunci** → **Uji kunci**. Atur batas biaya.

Jangan menulis kunci di `.env`, chat, atau catatan.

### Rollback

```bash
cd /var/www/kids.eduskul.my.id
git checkout $PREV && pnpm install --frozen-lockfile && pnpm build && systemctl restart little-coder-api
```

Migrasi 0017 hanya menambah dua tabel, dan seed hanya menambah konten, jadi kode lama tetap jalan tanpa memulihkan
database. Pulihkan dari `/root/backups/sebelum-deploy-….dump` hanya bila data rusak (semua perubahan setelah
cadangan akan hilang):

```bash
systemctl stop little-coder-api
pg_restore --clean --if-exists --no-owner -d "$U" /root/backups/sebelum-deploy-<tanggal-jam>.dump
systemctl start little-coder-api
```
