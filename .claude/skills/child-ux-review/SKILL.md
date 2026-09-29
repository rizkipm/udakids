---
name: child-ux-review
description: Periksa perubahan UI area anak (/play) terhadap aturan UX anak PRD A14/A15/A17 sebelum dianggap selesai. Pakai setelah membuat atau mengubah komponen, layar, atau dialog yang dilihat anak.
---

# Review UX area anak

Jalankan terhadap diff (`git diff`) dan, bila bisa, halaman yang berjalan (`pnpm dev`). Laporkan setiap
pelanggaran dengan file:baris.

## Checklist

**Interaksi**

- [ ] Target sentuh ≥ 64×64 px (`--touch-min`); kartu bisa diketuk, drag hanya opsional.
- [ ] Bisa dipakai dengan mouse saja; touchpad & layar sentuh juga jalan.
- [ ] Tingkat Basic: maks 4 jenis kartu tampil sekaligus; tidak ada `turn`.

**Tanpa membaca**

- [ ] Tidak ada teks yang _harus_ dibaca di tingkat Basic; setiap instruksi/kartu punya gambar + audio
      (diputar saat muncul dan saat diketuk).
- [ ] Semua teks lewat `i18n/id.json`; tidak ada string UI hard-coded; nama lewat `APP_NAME`/`CHARACTER_NAME`.
- [ ] Tanpa emoji — pakai SVG sendiri.

**Nada & motivasi**

- [ ] Saat keliru: reaksi lucu Momo + instruksi penyebab berkedip pelan. Tidak ada kata "salah"/"gagal",
      warna merah besar, atau suara negatif.
- [ ] Pujian menyebut usaha/strategi, bukan kepintaran.
- [ ] Anak tidak melihat angka skor — hanya bintang, tanaman, keping, lencana.
- [ ] Tidak ada timer di level utama, nyawa, streak, peringkat individu, iklan, atau link keluar.
- [ ] Tidak ada obrolan AI/LLM atau chat.

**Suara (bila flag `VITE_FEATURE_VOICE`)**

- [ ] Hasil pengenalan selalu dikonfirmasi (Ya/Tidak bergambar); bila ragu tampilkan 2–3 pilihan.
- [ ] Offline/tidak didukung → tombol mic disembunyikan tanpa pesan error.
- [ ] Audio tidak disimpan atau dikirim ke server.

**Aksesibilitas & performa**

- [ ] Kontras tinggi; fokus keyboard terlihat.
- [ ] Level terbuka < 2 detik; aset baru masuk budget paket Basic < 15 MB.
