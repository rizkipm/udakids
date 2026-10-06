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
