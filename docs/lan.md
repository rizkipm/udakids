# Akses dari iPad / HP di jaringan lokal (Wi-Fi yang sama)

Laptop berfungsi sebagai server. iPad dan perangkat lain di **Wi-Fi yang sama** membuka alamat IP laptop. Web
memanggil API lewat `/api` di alamat yang sama (proxy Vite), sehingga perangkat lain tidak perlu mengatur apa pun.

## Cara 1 — Mode pengembangan (paling cepat)

```bash
pnpm dev:lan          # menampilkan alamat, lalu menjalankan pnpm dev
```

```text
Buka salah satu alamat ini di Safari iPad (Wi-Fi yang sama):
  http://192.168.1.11:6006    (en0)
```

Buka alamat itu di Safari iPad. `pnpm lan:info` menampilkan alamat lagi kapan saja.

## Cara 2 — Versi produksi di jaringan lokal (untuk workshop/kelas)

Lebih cepat dan stabil untuk banyak iPad sekaligus. Hentikan `pnpm dev` dulu, lalu:

```bash
pnpm lan              # build + migrasi/seed + API (dist) + web preview di port 6006
```

## Di iPad

1. Sambungkan ke Wi-Fi yang sama dengan laptop.
2. Buka **Safari**, lalu ketik `http://<IP-laptop>:6006`, misalnya `http://192.168.1.11:6006`.
3. Supaya terasa seperti aplikasi, ketuk **Bagikan → Tambahkan ke Layar Utama**. Aplikasi terbuka layar penuh
   dengan ikon Momo.
4. Anak: `/play` (kode keluarga/kelas, lalu nama dan 3 gambar). Orang tua: `/orang-tua`. Guru/admin: `/masuk/staf`.

## Bila iPad tidak bisa membuka

| Masalah                                      | Solusi                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Tidak termuat / waktu habis                  | Pastikan Wi-Fi sama. Di macOS: Pengaturan Sistem → Jaringan → Firewall → izinkan **node**. |
| Wi-Fi tamu/sekolah memblokir antar-perangkat | Nonaktifkan "client/AP isolation", atau gunakan hotspot HP / router sendiri.               |
| IP laptop berubah                            | Jalankan `pnpm lan:info` lagi (atau atur IP tetap/DHCP reservation di router).             |
| "Tidak tersambung ke server"                 | API harus berjalan: `curl http://<IP-laptop>:6006/api/health`.                             |

## Catatan teknis

- Vite mendengarkan di semua antarmuka (`host: true`). API tetap hanya diakses lewat proxy `/api`.
- Di `http://192.168.x.x` browser tidak menyediakan `crypto.subtle`, karena halaman bukan HTTPS. Aplikasi memakai
  SHA-256 JavaScript yang hasilnya identik, sehingga tautan level tetap sama di semua perangkat (diuji).
- Jaringan lokal memakai HTTP tanpa enkripsi. Gunakan hanya di jaringan tepercaya; untuk publik, pakai server
  dengan HTTPS ([docs/deploy.md](deploy.md)).
