---
name: milestone
description: Kerjakan satu milestone Little Coder (M0–M7) dari docs/plan.md — rencanakan, implementasi, jalankan semua cek, lalu laporkan kriteria penerimaan. Pakai saat user bilang "lanjut ke M<n>", "kerjakan M<n>", atau /milestone M<n>.
---

# Menjalankan satu milestone

Argumen: nomor milestone (mis. `M1`). Tanpa argumen → milestone pertama berstatus "Belum" di `docs/plan.md`.

## 1. Siapkan konteks

1. Baca bagian milestone di `docs/plan.md` dan baris A16 terkait di `PRD.md`.
2. Baca bagian PRD yang dirujuk (A5–A15) — jangan mengandalkan ingatan.
3. Baca `docs/decisions.md`; keputusan berstatus **Usulan** yang menyentuh milestone ini harus
   dikonfirmasi ke user sebelum dikunci dalam kode.
4. Pastikan kondisi awal hijau: `pnpm lint && pnpm typecheck && pnpm test && pnpm validate:content`.

## 2. Rencanakan

- Pecah menjadi langkah kecil yang masing-masing bisa dites.
- Daftar pertanyaan untuk hal yang **tidak tercakup PRD**. Tanyakan dulu, jangan menebak. Setelah
  dijawab, catat di `docs/decisions.md` (ID berikutnya, tanggal, status Disetujui).
- Cek daftar "TIDAK BOLEH" di `CLAUDE.md` terhadap rencana.

## 3. Implementasi

- Logika murni masuk `packages/engine` lebih dulu, dengan test (skill `engine-module`).
- Konten baru lewat skill `add-level` / `add-skill-template`.
- Perubahan DB lewat skill `db-change`.
- UI anak diperiksa dengan skill `child-ux-review` sebelum dianggap selesai.

## 4. Verifikasi

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm validate:content && pnpm build
```

Untuk milestone UI (M2+): jalankan `pnpm dev`, buka di browser, dan jalankan Playwright bila ada.
Jangan menyatakan hijau tanpa melihat output-nya.

## 5. Laporan

Tulis ke user:

- Tabel kriteria penerimaan milestone: terpenuhi / sebagian / belum, dengan bukti (nama test, perintah).
- Keputusan baru yang dicatat, dan pertanyaan yang masih terbuka.
- Cara mengecek manual (URL, langkah).

Lalu update tabel status di `docs/plan.md` dan centang checklist milestone tersebut.
