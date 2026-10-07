---
name: add-skill-template
description: Buat skill template Pustaka Latihan (content/skills/<domain>/*.json) untuk generator soal — params, constraint, answer, distractors, difficulty band. Pakai saat menambah skill matematika/literasi/sains atau memperbaiki template yang gagal validasi 200 soal.
---

# Menambah skill template Pustaka

## Lokasi

`content/skills/{math,literasi,sains}/<skill-id>.json`, `skill-id` seperti `math.count.upto5`,
`lit.syllable.open.ba-bi-bu`, `sci.hot-cold`. Contoh struktur: PRD Bagian B "Generator soal".

## Aturan

- Satu skill melatih **satu hal saja**; rentang naik pelan (3 → 5 → 7 → 10 → 20).
- `itemType` MVP: `listen-pick-image`, `tap-all`, `count-then-tap`, `drag-to-group`, `order`, `match`,
  `number-line`.
- `answer` & `distractors` adalah ekspresi kecil untuk evaluator aman engine (+, −, ×, perbandingan,
  variabel). **Jangan** menulis sesuatu yang butuh `eval`.
- Pengecoh berbasis miskonsepsi umum (kurang satu, lebih satu, hanya satu kelompok) — tidak boleh sama
  dengan jawaban.
- `difficulty` = 3 band (0/1/2) yang dipakai Skor Jago; band 0 paling mudah dan tetap bergambar.
- Konteks lokal: Rupiah, nama & benda Indonesia; literasi lewat suku kata, bukan fonik Inggris.
- Tingkat Basic: semua soal dibacakan, jawaban berupa gambar; setiap kata benda punya gambar di
  `apps/web/public/assets/`.
- Isi `tags` kurikulum (`merdeka`, `sg`, `ixlRef` hanya referensi internal). Jangan menyalin soal IXL.
- **Buku olimpiade (`tkosn`, `sd12`, `sd34`, `sd56`, `smp79`, dan buku OSN baru) wajib punya Mock Test** (D-072):
  kategori `Z` "Mock Test …" (group `Mock Test · …`, `standalone: true`) dengan satu skill `family: "mock"`
  (`Z01-mock-test-<n>-soal.json`). Jumlah soal = jumlah soal lomba asli (TK: 25; 9 mudah / 8 sedang / 8 sulit),
  diambil otomatis dari level 1–3 / 4–7 / 8–10 semua materi di buku itu. Setiap materi tetap 10 level, dan materi
  diberi `group` per lomba (mis. `OSN TK · …`, `EMC · …`, `ESC · …`, `EEC · …`).

## Verifikasi

`pnpm validate:content` menghasilkan 200 soal (seed tetap) per skill: jawaban tunggal, pengecoh ≠ jawaban,
semua gambar ada. Setelah lolos, cetak 30–50 contoh soal untuk direview tim konten sebelum rilis.
