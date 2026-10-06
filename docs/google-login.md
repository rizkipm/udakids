# Daftar & masuk orang tua dengan Google (D-066)

Untuk admin/pengelola server. Fitur ini menampilkan tombol **"Daftar dengan Google"** / **"Lanjutkan dengan
Google"** dan pop-up kecil (One Tap) yang menawarkan akun Google aktif di HP atau browser orang tua. Hanya untuk
area orang tua; area anak tidak berubah.

## 1. Buat Client ID di Google Cloud (sekali saja)

1. Buka <https://console.cloud.google.com/> dan pilih atau buat project, misalnya `Udakids`.
2. **APIs & Services → OAuth consent screen** (Google Auth Platform → Branding):
   - User type: **External**;
   - App name: `Udakids`, user support email, logo (opsional);
   - Authorized domain: `eduskul.my.id`;
   - Developer contact: email pengelola;
   - Scopes cukup bawaan: `openid`, `email`, `profile` (tidak perlu verifikasi Google);
   - **Publish app** (status "In production"), supaya semua orang tua bisa masuk, bukan hanya akun uji.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**, nama: `Udakids Web`;
   - **Authorized JavaScript origins**:
     - `https://kids.eduskul.my.id`
     - `http://localhost:6006` (untuk dev)
   - Authorized redirect URIs: kosongkan (tidak dipakai);
   - Simpan, lalu salin **Client ID** (`…apps.googleusercontent.com`). **Client secret tidak dipakai.**

## 2. Isi di server

```bash
cd /var/www/kids.eduskul.my.id
nano .env
```

```ini
GOOGLE_CLIENT_ID=1234567890-abcdefg.apps.googleusercontent.com
```

Lalu `systemctl restart little-coder-api`. Tidak perlu build ulang web: tombol mengambil Client ID dari server.
Kosongkan nilainya untuk menyembunyikan tombol lagi.

Bila Nginx memasang header CSP sendiri, tambahkan alamat Google seperti di `deploy/nginx.conf.example`
(`script-src`, `style-src`, `frame-src`, `connect-src` ke `https://accounts.google.com/gsi/…`) dan pakai
`Referrer-Policy: strict-origin-when-cross-origin`. Jangan pasang `Cross-Origin-Opener-Policy: same-origin`
(pop-up Google tidak bisa kembali).

## 3. Cara kerja

- **Tampilan:** halaman daftar dan masuk menampilkan dua pilihan: tombol Google (disarankan) dan tombol isi
  manual. Form email + password muncul setelah memilih isi manual. Bila Google tidak tersedia (Client ID kosong,
  offline, atau diblokir), form manual langsung tampil.
- **Akun baru:** orang tua memilih akun Google → muncul langkah "Satu langkah lagi" (nama bisa diubah, kode
  referal ikut terbawa, centang persetujuan wajib) → akun dibuat, email langsung terverifikasi (tanpa kode),
  email sambutan terkirim, lalu lanjut menambah profil anak.
- **Akun lama:** email Google sama dengan akun yang sudah ada → langsung masuk dan akun tersambung ke Google.
  Password lama tetap berlaku.
- Akun yang dibuat lewat Google belum punya password. Bila ingin masuk dengan email + password juga, pakai
  **"Lupa password?"** untuk membuatnya.
- Server memverifikasi ID token Google: tanda tangan (kunci publik Google), penerbit, Client ID, masa berlaku,
  dan email terverifikasi. Data yang disimpan hanya nama, email, dan id akun Google (`google_sub`) milik orang tua.
