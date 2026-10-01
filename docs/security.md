# Keamanan — audit peran & autentikasi (D-040, 2026-10-01)

Audit seluruh route API (peran, IDOR, token, email, rate limit, HTTP). Semua route punya guard: `@Public()`
untuk yang terbuka, `@Roles()` untuk yang khusus. Tidak ditemukan IDOR: orang tua, guru, dan anak hanya bisa
mengakses datanya sendiri.

## Temuan & status

| ID  | Tingkat | Masalah                                                                      | Status                                                                                                                              |
| --- | ------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Tinggi  | Guard memercayai `role` di JWT; akun nonaktif/diturunkan tetap punya akses   | **Diperbaiki**: guard cek akun di DB setiap request (cache 10 detik); peran diambil dari DB; ubah peran/status akun sendiri ditolak |
| H2  | Tinggi  | Rahasia JWT bawaan publik dipakai bila `JWT_SECRET` kosong (mis. `pnpm lan`) | **Diperbaiki**: API menolak start tanpa `JWT_SECRET` (≥ 32 karakter di produksi); `pnpm lan` = produksi                             |
| H3  | Tinggi  | Sandi gambar (729 kombinasi) bisa ditebak: kunci hanya 60 detik              | **Diperbaiki**: kunci bertingkat 1 → 5 → 30 → 120 menit; batas per IP                                                               |
| H4  | Tinggi  | Tautkan anak bisa ditebak dari banyak akun orang tua                         | **Diperbaiki**: batas per kode anak; percobaan gagal ikut mengunci sandi anak                                                       |
| M1  | Sedang  | Di balik Nginx semua klien ber-IP 127.0.0.1                                  | **Diperbaiki**: `trust proxy` loopback                                                                                              |
| M2  | Sedang  | Kode keluarga/kelas bisa dienumerasi                                         | **Diperbaiki**: batas per IP (30 gagal / 15 menit)                                                                                  |
| M3  | Sedang  | Login: tanpa batas per IP; memori limiter tumbuh; email tanpa batas panjang  | **Diperbaiki**: batas per IP, limiter dibersihkan & dibatasi, email ≤ 254 karakter                                                  |
| M4  | Sedang  | Kode unik transfer bisa dihabiskan dengan banyak pesanan                     | **Diperbaiki**: pesanan sama dipakai ulang; maks 3 pesanan terbuka per keluarga                                                     |
| M5  | Sedang  | Suara Momo on-demand bisa disalahgunakan (biaya)                             | **Diperbaiki**: klip baru maks 60 / 10 menit per IP; batas harian dihitung dari DB                                                  |
| M6  | Sedang  | Pendaftaran tanpa batas                                                      | **Diperbaiki**: daftar orang tua & gabung kelas dibatasi per IP. Verifikasi email belum ada (butuh SMTP)                            |
| M7  | Sedang  | Tanpa header keamanan                                                        | **Diperbaiki**: API mengirim nosniff, frame DENY, referrer, CSP; tanpa `X-Powered-By`; contoh Nginx berisi CSP/HSTS                 |
| M8  | Sedang  | Sesi orang tua 30 hari di perangkat yang dipakai anak                        | **Diperbaiki**: 7 hari                                                                                                              |
| M9  | Sedang  | Template level berbayar ikut terkirim ke anak tanpa paket                    | **Diperbaiki**: dikirim tanpa isi soal (`stub`)                                                                                     |
| L1  | Rendah  | Email admin seed tidak di-trim; unik masih membedakan huruf besar/kecil      | **Diperbaiki**: seed memakai skema email; indeks unik `lower(email)` (migrasi 0006)                                                 |
| L2  | Rendah  | Email terlalu panjang diterima                                               | **Diperbaiki** (maks 254)                                                                                                           |
| L3  | Rendah  | Waktu respons membocorkan email terdaftar                                    | **Diperbaiki**: hash palsu diverifikasi bila email tidak ada                                                                        |
| L4  | Rendah  | Guru bisa mengganti sandi gambar anak milik orang tua                        | **Diperbaiki**: hanya orang tua/admin                                                                                               |
| L5  | Rendah  | Anak keluarga yang memasukkan kode kelas mendapat akses berbayar gratis      | **Diperbaiki**: akses penuh kelas hanya untuk siswa tanpa akun orang tua                                                            |
| L6  | Rendah  | Sync menerima state skill yang tidak ada                                     | **Diperbaiki**                                                                                                                      |
| L7  | Rendah  | Bukti transfer tanpa nosniff/sandbox; badan biner diterima di semua route    | **Diperbaiki**: CSP sandbox + nosniff; biner hanya di route bukti                                                                   |
| L8  | Rendah  | Balapan daftar email yang sama → 500                                         | **Diperbaiki**: `on conflict do nothing` → 409                                                                                      |
| I1  | Info    | SSE tanpa batas koneksi                                                      | Contoh `limit_conn` di Nginx                                                                                                        |
| I2  | Info    | Level disimpan dari badan mentah (admin saja)                                | Tetap (perlu menjaga `optimalSteps: "auto"`)                                                                                        |
| I3  | Info    | Admin bisa menyetujui pesanan tanpa bukti                                    | Disengaja (transfer bisa dikonfirmasi dari mutasi rekening)                                                                         |

## Aturan yang dijaga

- Email selalu lewat `emailSchema` (engine): trim → huruf kecil → maks 254 → format valid. Pesannya sama di web
  (staf, orang tua) dan server. Login tidak membedakan huruf besar/kecil.
- Sesi: staf 12 jam, orang tua 7 hari, anak 12 jam. Akun yang dinonaktifkan atau dihapus kehilangan akses dalam
  ≤ 10 detik.
- Rahasia hanya di `.env` server: `JWT_SECRET`, `ADMIN_PASSWORD`, `GOOGLE_TTS_API_KEY`.
- Test e2e "keamanan (audit D-040)" memeriksa header, email, token akun nonaktif, kunci bertingkat, sandi anak
  milik orang tua, katalog berbayar, dan sync.
