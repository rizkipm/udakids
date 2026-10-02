# Deploy ke server — langkah demi langkah

Contoh memakai **VPS Ubuntu 24.04** dengan domain `app.contoh.id` (ganti dengan domain Anda). Hasil akhirnya:

```text
Browser / iPad ──HTTPS──▶ Nginx ──┬── /        → apps/web/dist (file statis)
                                  └── /api/... → API NestJS :7177 (systemd) ──▶ PostgreSQL
```

Semua data (akun, anak, progres, soal, katalog, materi, level, dialog) ada di **PostgreSQL**. Folder `content/`
hanya dipakai untuk mengisi database pertama kali (seed).

---

## Langkah 0 — Siapkan

- VPS minimal **1 vCPU, 1–2 GB RAM, 20 GB disk**. Anda perlu akses `ssh` sebagai user dengan `sudo`.
- Domain, misalnya `app.contoh.id`, dengan **A record** yang mengarah ke IP VPS.
- Repo Little Coder di Git (GitHub/GitLab).

## Langkah 1 — Pasang software di server

```bash
ssh ubuntu@IP-SERVER

sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx postgresql postgresql-contrib ufw

# Node.js 24 LTS + pnpm
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
node -v   # v24.x
```

## Langkah 2 — Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # port 80 & 443
sudo ufw enable
```

Port API (7177) dan PostgreSQL (5432) **tidak** dibuka ke internet; keduanya hanya diakses dari dalam server.

## Langkah 3 — Database PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE littlecoder LOGIN PASSWORD 'GANTI-password-db-yang-kuat';
CREATE DATABASE littlecoder OWNER littlecoder;
SQL
```

## Langkah 4 — Ambil kode & build

```bash
sudo adduser --system --group --home /srv/littlecoder littlecoder
sudo mkdir -p /srv/littlecoder && sudo chown littlecoder:littlecoder /srv/littlecoder
sudo -u littlecoder -H bash
cd /srv/littlecoder
git clone <URL-REPO> .
pnpm install --frozen-lockfile
```

Buat `.env` produksi:

```bash
cp .env.example .env
nano .env
```

```ini
NODE_ENV=production
DATABASE_URL=postgres://littlecoder:GANTI-password-db-yang-kuat@localhost:5432/littlecoder
API_PORT=7177
JWT_SECRET=<hasil: openssl rand -base64 48>
ADMIN_EMAIL=admin@sekolah.id
ADMIN_PASSWORD=<password admin pertama yang kuat>
WEB_ORIGIN=https://app.contoh.id
VITE_API_URL=/api
VITE_FEATURE_VOICE=false
# Suara Momo (opsional, D-035): API key Google Cloud Text-to-Speech (bukan Google AI Studio)
GOOGLE_TTS_API_KEY=
TTS_DAILY_LIMIT=3000
# Email (D-044): langkah Gmail di docs/email.md
SMTP_USER=project.udacoding@gmail.com
SMTP_PASS=<App Password 16 huruf>
MAIL_FROM="Udakids <project.udacoding@gmail.com>"
MAIL_DIRECTOR=udacodingofficial@gmail.com
APP_PUBLIC_URL=https://app.contoh.id
```

> Email: tanpa `SMTP_PASS`, pendaftar baru tidak menerima kode verifikasi dan belum bisa masuk (admin bisa
> menandai terverifikasi manual di Admin → Keluarga). Setelah API jalan, kirim email uji dari **Admin → Email**.

Lalu build:

```bash
chmod 600 .env
pnpm build          # engine → apps/api/dist → apps/web/dist
```

## Langkah 5 — Isi database (pilih salah satu)

**A. Server baru (mulai dari nol):**

```bash
pnpm deploy:db
# Migrasi database selesai.
# skill: 2880 ditambahkan … dialog: 1 … admin dibuat: admin@sekolah.id
```

**B. Pindah dari laptop/server lama beserta SEMUA data** (akun, anak, progres):

```bash
# di laptop lama
pnpm content:export     # opsional: suntingan admin → content/, lalu commit & push
pnpm db:backup          # → backups/littlecoder-<tanggal>.dump
scp backups/littlecoder-<tanggal>.dump ubuntu@IP-SERVER:/tmp/

# di server (sebagai user littlecoder, di /srv/littlecoder)
pnpm db:restore -- /tmp/littlecoder-<tanggal>.dump     # ketik "ya"
pnpm deploy:db          # migrasi yang lebih baru + konten baru, suntingan admin tidak ditimpa
rm /tmp/littlecoder-<tanggal>.dump
```

Setelah dipulihkan, gunakan `ADMIN_PASSWORD` lama, karena admin dari database lama ikut terbawa. Klip suara Momo,
paket, pesanan, bukti transfer, dan buku kas ikut terbawa karena semuanya ada di PostgreSQL.

**Suara Momo (sekali, setelah `GOOGLE_TTS_API_KEY` diisi):**

```bash
pnpm --filter @little-coder/api voice:prod    # node dist/cli/voice.js → "Suara Momo: 32 dibuat …"
```

Cara membuat key: Google Cloud Console → aktifkan **Cloud Text-to-Speech API** → Credentials → Create API key →
batasi key hanya untuk API itu. Tanpa key, aplikasi tetap jalan dengan suara browser.

Keluar dari user littlecoder: `exit`.

## Langkah 6 — Jalankan API sebagai service

```bash
sudo cp /srv/littlecoder/deploy/littlecoder-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now littlecoder-api
sudo systemctl status littlecoder-api      # active (running)
curl http://127.0.0.1:7177/health          # {"status":"ok","db":"up",...}
```

Log API: `journalctl -u littlecoder-api -f`. Service ini menjalankan migrasi setiap kali start (idempoten).

## Langkah 7 — Nginx (web + /api)

```bash
sudo cp /srv/littlecoder/deploy/nginx.conf.example /etc/nginx/sites-available/littlecoder
sudo sed -i 's/app.contoh.id/DOMAIN-ANDA/' /etc/nginx/sites-available/littlecoder
sudo ln -s /etc/nginx/sites-available/littlecoder /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
curl http://DOMAIN-ANDA/api/health
```

## Langkah 8 — HTTPS (gratis, Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d DOMAIN-ANDA      # pilih redirect HTTP → HTTPS
```

Buka `https://DOMAIN-ANDA`, lalu masuk admin di `/masuk/staf` dengan `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Langkah 9 — Cadangan otomatis

```bash
sudo -u littlecoder crontab -e
# tambahkan: setiap hari 02:00, simpan 14 hari
0 2 * * * /srv/littlecoder/deploy/backup.sh >> /srv/littlecoder/backup.log 2>&1
```

Salin cadangan ke tempat lain secara berkala (object storage terenkripsi). Isinya data pribadi anak (UU PDP).

## Langkah 10 — Memperbarui versi

```bash
sudo -u littlecoder -H bash -c '
  cd /srv/littlecoder &&
  pnpm db:backup &&                       # jaga-jaga sebelum update
  git pull &&
  pnpm install --frozen-lockfile &&
  pnpm build &&
  pnpm deploy:db'
sudo systemctl restart littlecoder-api
```

## Periksa bila ada masalah

| Gejala                               | Periksa                                                           |
| ------------------------------------ | ----------------------------------------------------------------- |
| Halaman putih / 404 saat refresh     | blok `location /` Nginx harus `try_files $uri /index.html`        |
| "Tidak tersambung ke server"         | `curl https://DOMAIN/api/health`; `journalctl -u littlecoder-api` |
| API gagal start: `JWT_SECRET wajib`  | isi `JWT_SECRET` di `/srv/littlecoder/.env`                       |
| Seed gagal: `ADMIN_PASSWORD wajib`   | isi `ADMIN_PASSWORD` (hanya untuk membuat admin pertama)          |
| `db:backup`: pg_dump tidak ditemukan | `sudo apt install postgresql-client`, atau set `PG_BIN`           |

Untuk mencoba di jaringan rumah/sekolah tanpa server (iPad, HP), lihat [docs/lan.md](lan.md).
