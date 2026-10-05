# Email: verifikasi pendaftaran & notifikasi transaksi (D-044)

Udakids mengirim email lewat **Gmail SMTP** dari akun pengirim `project.udacoding@gmail.com`.

| Email                                 | Penerima              | Kapan                                         |
| ------------------------------------- | --------------------- | --------------------------------------------- |
| Kode verifikasi 6 angka               | orang tua yang daftar | daftar, kirim ulang, masuk sebelum verifikasi |
| Selamat datang (+ kode keluarga)      | orang tua             | setelah email terverifikasi                   |
| Kode buat password baru               | orang tua             | "Lupa password?" (D-064)                      |
| Password sudah diganti                | orang tua             | ganti/buat password baru (D-064)              |
| Kode ganti email (ke email baru)      | orang tua             | Akun saya → ganti email (D-064)               |
| Email akun sudah diganti (email lama) | orang tua             | kode ganti email cocok (D-064)                |
| Akun sudah aktif + password sementara | orang tua             | admin "Tandai email terverifikasi" (D-064)    |
| Pesanan dibuat (instruksi transfer)   | orang tua + direksi   | pesanan baru                                  |
| Bukti transfer diterima               | orang tua + direksi   | orang tua mengunggah bukti                    |
| Pembayaran dikonfirmasi (paket aktif) | orang tua + direksi   | admin menyetujui                              |
| Pembayaran belum bisa dikonfirmasi    | orang tua + direksi   | admin menolak (dengan alasan)                 |

Direksi = `MAIL_DIRECTOR` (bawaan `udacodingofficial@gmail.com`). Semua email ditutup dengan
**"Momo From Udakids"**. Email **tidak pernah** berisi password, sandi gambar anak, atau data anak — dengan satu
pengecualian yang disetujui pemilik produk (D-064): email "Akun sudah aktif" setelah admin menandai email
terverifikasi berisi **password sementara** acak. Orang tua lalu diminta segera menggantinya, dan isi email tetap
dihapus dari antrean setelah terkirim.

Email kode verifikasi, selamat datang, dan "Akun sudah aktif" menampilkan tombol **Gabung grup WhatsApp** bila
admin mengisi link grup di **Admin → Pengaturan → Kontak WhatsApp**.

### SMTP hosting sendiri (Niagahoster/cPanel)

Gmail dibatasi sekitar 500 email/hari. Untuk volume lebih besar, pakai akun email domain sendiri, misalnya:

```env
SMTP_HOST=srv176.niagahoster.com   # nama server cPanel, bukan mail.<domain> bila domain diproksi Cloudflare
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=helo@eduskul.my.id
SMTP_PASS='password-akun-email'   # pakai tanda kutip tunggal bila ada karakter $ # ' " atau spasi
MAIL_FROM="Udakids <helo@eduskul.my.id>"
```

Pastikan DNS domain pengirim punya SPF yang memuat IP server email dan DKIM `default._domainkey` dari cPanel
(di Cloudflare: catatan DNS-only, tanpa proksi). Cek dari laptop dulu dengan `pnpm dev` + **Admin → Email → Kirim
email uji**; konfigurasi yang sama lalu disalin ke `.env` server.

## Langkah di Gmail (sekali saja)

App Password hanya bisa dibuat bila **Verifikasi 2 Langkah** aktif. Google tidak lagi mengizinkan login SMTP
dengan password biasa.

1. Masuk ke Gmail sebagai **project.udacoding@gmail.com** (jendela penyamaran lebih aman agar tidak tertukar akun).
2. Buka <https://myaccount.google.com/security>.
3. Di bagian **"Cara Anda login ke Google"**, klik **Verifikasi 2 Langkah**, lalu **Aktifkan**. Ikuti langkahnya
   (nomor HP atau aplikasi Google Authenticator). Simpan juga **kode cadangan** di tempat aman.
4. Buka <https://myaccount.google.com/apppasswords>. Bila diminta, masukkan password akun lagi.
5. Di **"Nama aplikasi"**, ketik `Udakids Server`, lalu klik **Buat**.
6. Google menampilkan **16 huruf** (mis. `abcd efgh ijkl mnop`). Salin sekarang, karena Google tidak menampilkannya
   lagi.
7. Di server, buka `.env` (bukan `.env.example`, dan jangan pernah di-commit), lalu isi:

   ```bash
   SMTP_USER=project.udacoding@gmail.com
   SMTP_PASS=abcdefghijklmnop        # App Password; spasi boleh, akan dibuang
   MAIL_FROM="Udakids <project.udacoding@gmail.com>"
   MAIL_DIRECTOR=udacodingofficial@gmail.com
   APP_PUBLIC_URL=https://domain-udakids-anda   # untuk logo & tautan di email
   ```

   Port 587 (STARTTLS) juga bisa: `SMTP_PORT=587` (mode TLS otomatis mengikuti port). Nama `SMTP_PASSWORD`
   diterima sebagai alias `SMTP_PASS`.

8. `chmod 600 .env`, lalu mulai ulang API (`sudo systemctl restart littlecoder-api`, atau `pnpm dev` di laptop).
9. Masuk **Admin → Email**. Status harus **"Siap mengirim"**. Klik **Kirim email uji** dan periksa kotak masuk.
10. Opsional, supaya balasan sampai ke direksi: di Gmail pengirim, buka **Setelan → Lihat semua setelan → Akun →
    Kirim email sebagai → edit → "Balas ke"**, isi `udacodingofficial@gmail.com`.

### Bila ada kendala

| Gejala di Admin → Email                                | Penyebab & solusi                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `Invalid login` / `Username and Password not accepted` | App Password salah atau Verifikasi 2 Langkah mati. Buat App Password baru.         |
| Opsi App Password tidak muncul                         | Verifikasi 2 Langkah belum aktif, atau akun Workspace yang dibatasi admin.         |
| Email masuk ke Spam                                    | Tandai "Bukan spam" sekali; pastikan `APP_PUBLIC_URL` memakai https.               |
| `Daily user sending limit exceeded`                    | Batas Gmail sekitar 500 email/hari. Antrean mencoba lagi otomatis (hingga 12 jam). |
| Status "Menunggu SMTP"                                 | `SMTP_USER`/`SMTP_PASS` kosong di `.env` server. Isi, lalu restart API.            |

Bila App Password bocor: hapus di <https://myaccount.google.com/apppasswords>, buat yang baru, ganti `SMTP_PASS`.
Mengganti password Gmail juga mencabut semua App Password.

## Cara kerja & keamanan

- **Verifikasi wajib** (`EMAIL_VERIFICATION=on`, bawaan). Akun baru belum bisa masuk sebelum memasukkan kode.
  Saat masuk sebelum verifikasi, API menjawab `403 EMAIL_NOT_VERIFIED` dan web membuka langkah kode.
- **Kode** 6 angka acak (`crypto.randomInt`):
  - berlaku 15 menit, maksimal 5 percobaan;
  - disimpan sebagai **hash scrypt**, bukan angka aslinya;
  - kode baru membatalkan kode lama;
  - kirim ulang dengan jeda 60 detik; batas laju per email dan per IP;
  - jawaban "kirim ulang" selalu sama, sehingga tidak membocorkan apakah sebuah email terdaftar.
- **Akun lama** (sebelum migrasi 0010) otomatis dianggap terverifikasi.
- **Antrean `email_outbox`:** transaksi tidak pernah gagal karena email. Email dicoba ulang setelah 1 menit,
  5 menit, 30 menit, 2 jam, dan 12 jam, lalu berstatus "Gagal" (bisa dikirim ulang dari admin). **Isi email
  dihapus setelah terkirim**; yang tersisa hanya penerima, subjek, jenis, dan status.
- **Template:** HTML berbasis tabel dengan gaya inline (aman untuk Gmail/Outlook) plus versi teks. Semua teks dari
  pengguna di-escape. Logo diambil dari `APP_PUBLIC_URL/email/momo.png`.
- **Tanpa SMTP di dev:** isi email (termasuk kode) dicetak di log API, sehingga alur verifikasi bisa dicoba tanpa
  Gmail.
- **Admin:**
  - **Admin → Email:** status pengirim (user disamarkan), email uji, 50 email terakhir, kirim ulang;
  - **Admin → Keluarga:** lencana "Email belum diverifikasi" dan tombol **Tandai email terverifikasi**, untuk
    orang tua yang tidak menerima email. Tombol ini membuat password sementara acak (12 karakter), menampilkannya
    sekali di pop-up (bisa disalin untuk WhatsApp), dan mengirimkannya ke email orang tua (D-064).
- Test: `apps/api/test/mail.e2e.test.ts` memakai pengirim palsu, sehingga tidak ada email sungguhan yang dikirim.
