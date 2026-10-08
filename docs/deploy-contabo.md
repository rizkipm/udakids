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
