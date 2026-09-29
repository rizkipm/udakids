---
name: add-level
description: Tulis atau ubah level Petualangan Momo (JSON di content/levels) sesuai skema PRD A6 dan aturan validator A7. Pakai saat menambah level dunia 1–3, mengisi placeholder, atau memperbaiki level yang ditolak validator.
---

# Menambah / mengubah level

## Lokasi & penamaan

- File: `content/levels/<tier>/world-<N>/w<N>-l<NN>.json` (bonus: `w<N>-lb1..lb3`).
- `id` harus cocok dengan `world` + `index` dan nama file.
- Mengubah level yang sudah dirilis → naikkan `version` (progres anak disimpan per `id + version`).

## Field wajib

`id, version, tier, world, index, role, focus, skills, type, story{intro, success, hint?}` + field khusus
per `type` (lihat PRD A6 dan skema di `packages/engine/src/levels/`).

## Aturan desain (harus dipenuhi)

- Pola dunia: l01–02 `intro` (hampir pasti berhasil), l03–07 `practice`, l08 `twist`, l09 `challenge`,
  l10 `boss`. Komposisi fokus per dunia: 4 `logic`, 3 `math`, 3 `science` (bonus tidak dihitung).
- Tingkat Basic: hanya `move` arah tetap — **tidak ada `turn`**; maks 4 jenis kartu di `palette`; tanpa teks
  yang harus dibaca; grid Dunia 2 naik dari 3×3 ke 6×6.
- `sequence-cards`: cantumkan **semua** urutan yang masuk akal di `validOrders`.
- Grid: `optimalSteps: "auto"` (jangan isi manual); `maxCards` cukup longgar untuk solusi terpendek.
- Level ber-skill `loop` tidak boleh bisa diselesaikan tanpa `repeat` dalam `maxCards`.
- Isi soal & gambar buatan sendiri — jangan menyalin IXL/Code.org/ScratchJr.

## Dialog

Setiap `audioKey` di `story` harus ada di `content/dialog/momo.id.json`. Kalimat Momo:

- Hangat, pendek, bisa diucapkan; pujian menyebut usaha/strategi ("Kamu teliti banget!"), bukan kepintaran.
- Saat keliru: bingkai sebagai kebingungan Momo ("Aduh, Momo nabrak!"), tanpa kata "salah/gagal".
- Selalu memakai kata spasial (atas, bawah, di antara) bila relevan.

## Verifikasi

```bash
pnpm validate:content          # harus 0 error
pnpm validate:content:strict   # saat dunia sudah lengkap 10 level
```
