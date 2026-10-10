---
name: generate-lab
description: Buat atau perbaiki materi berformat lab (D-109) — Materi Topik (`category.materi`) untuk satu topik, atau Lab Buku (`catalog.lab`) untuk satu buku — lengkap dengan foto Pexels (cadangan SVG), eksperimen dari pustaka widget, dan jebakan. Pakai saat user mengetik /generate-lab <domain> <grade> [<kode topik>|buku], atau saat mengerjakan gelombang produksi L3 di docs/plan.md.
---

# Generate materi berformat lab (D-109)

Argumen: `<domain> <grade> <KODE>` → Materi Topik satu topik; `<domain> <grade> buku` → Lab Buku. Satu pemanggilan
boleh beberapa topik dalam satu buku, tapi selalu validasi setelah setiap topik.

## 1. Baca dulu (jangan mengandalkan ingatan)

1. `docs/decisions.md` D-109 (aturan), skema `packages/engine/src/content/lab.ts` (field & batas panjang), dan
   contoh yang sudah aktif: `content/skills/sains/tkosn/_catalog.json` (Lab Buku + materi J) dan
   `content/skills/math/tkosn/_catalog.json` (materi A).
2. **Semua level topik**: buka setiap `content/skills/<domain>/<grade>/<KODE>NN-*.json`. Catat jenis soal, konsep,
   dan jebakannya. Materi WAJIB menjelaskan konsep yang muncul di setiap level (Contoh per level & Uji dibuat
   otomatis dari level ini — konten manual menyiapkan pemahamannya).
3. Aset: id benda di `packages/engine/src/generator/assets.ts` (`OBJECTS`), jenis gambar di `visual-schema.ts`.

## 2. Materi Topik (`category.materi`)

```jsonc
{
  "version": 1, "status": "draf",           // "aktif" setelah ditinjau
  "judul": "…", "sub": "…", "suara": "…",   // suara = dibacakan Momo saat dibuka
  "pahami": {
    "poster": [ /* 1–4 infografis: judul, sub, foto+visual, 2–4 poin (foto+visual), lencana ≤4, rumus/banding, tips */ ],
    "peragaan": [ /* opsional, 2–8 adegan Momo: teks, suara, visual[], hitung "angka"|"urutan", selesai */ ],
    "jelajah": [ /* opsional: {jenis:"figur",figur,titik} atau {jenis:"kartu",kartu:[{judul,teks,suara,gambar}]} */ ]
  },
  "eksperimen": [ /* 1–10 dari pustaka widget, lihat bagian 4 */ ],
  "contoh": { "catatan": { "1": "tips level 1", "…": "…" } },   // tips singkat per level (opsional tapi dianjurkan)
  "ingat": { "poin": [ {"teks":"…","tepat":true}, {"teks":"Hati-hati: …","tepat":false} ], "rawat": {…}, "fakta": [ … ] }
}
```

- Minimal 1 jebakan (`tepat: false`) yang benar-benar sering terjadi di level topik itu.
- Poster: maks 4 poin, judul ≤ 48 huruf, teks ≤ 160 huruf. Kalimat `suara` lengkap & ramah anak.

## 3. Lab Buku (`catalog.lab`)

Pos per **tema besar** buku (4–8 pos), setiap topik buku masuk ke tepat satu pos (`topik`). Per pos: `ikon` (foto +
SVG), `jelajah`, 1–3 `eksperimen`, `fakta`, `rawat` opsional, `uji` (6–10 rujukan level dari topik pos itu),
`saring` opsional (kata kunci jawaban bila level pos bercampur tema). `ujian`: 8–15 rujukan lintas pos.

## 4. Pustaka eksperimen (`jenis`)

| Mapel | Jenis                                                                                                                                                                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Umum  | `pilah` (2–4 kotak), `urut` (urutan/daur), `pasang` (kiri ↔ kanan), `pola`, `dengar-pilih` (kata dibacakan → ketuk gambar; English juga), `tebal` (angka/huruf/garis), `geser` (tahap sebab-akibat)                                                   |
| Sains | `cahaya`, `lup`, `bunyi`, `tebak-bunyi`, `bau`, `rasa`, `raba`; figur jelajah: `mata`, `telinga`, `hidung`, `lidah`, `kulit`, `pencernaan`, `tumbuhan`, `tubuh`                                                                                       |
| Math  | `kenal-angka`, `dengar-ketuk`, `hitung-ketuk`, `pasang-angka`, `garis-bilangan`, `kereta`, `urutkan`, `antrean`, `banding`, `bingkai`, `tambah-kurang`, `jam`, `uang`, `nilai-tempat`, `bangun`, `pecahan`, `kali`, `bagi`, `ukur`, `luas`, `diagram` |

Jenis baru = ubah skema + widget web + test (skill `engine-module`), bukan memaksa data ke jenis yang tidak cocok.

## 5. Gambar (D-095/D-109)

- Setiap slot gambar: `foto` (`id` huruf kecil-tanda-hubung unik, `label` Indonesia, `en` 2–4 kata English untuk
  Pexels) **dan** cadangan SVG (`benda` atau `visual`). Pakai ulang `id` foto yang sama untuk subjek yang sama.
- Foto untuk benda/dunia nyata. SVG saja untuk angka, bangun, grafik, diagram dalam tubuh, dan bagian beranimasi.
- Setelah seed: `pnpm lesson:photos -- <domain> <grade> --dry-run`, lalu tanpa `--dry-run` (Pexels + saring Claude).

## 6. Selesai = semua hijau

1. `pnpm validate:content` → 0 error (cakupan level, uji ≥ 4 soal per pos, gambar ada).
2. `pnpm db:seed` lalu `pnpm lesson:photos -- <domain> <grade>`.
3. Test: `apps/web/test/play/lab.test.tsx` merender semua materi di buku pilot; tambahkan buku baru ke daftarnya.
4. Skill `child-ux-review` untuk eksperimen/teks baru. Ubah `status` ke `"aktif"` setelah ditinjau.
5. Centang topik di `docs/plan.md` (L3) dan laporkan: topik selesai, foto lolos/cadangan SVG, catatan untuk guru.

## Larangan (CLAUDE.md, PRD A17)

Tanpa data pribadi anak, tanpa salinan soal/aset IXL/Code.org/platform lain, tanpa kata "salah/gagal", tanpa batas
waktu, tanpa emoji. Semua teks dibacakan.
