# Claude Code Skills — UdaKids

Skill proyek ada di `.claude/skills/<nama>/SKILL.md` dan otomatis tersedia saat `claude` dijalankan di repo
ini. Panggil dengan `/<nama>` atau biarkan Claude memilih berdasarkan deskripsinya.

| Skill                                                                  | Kapan dipakai                                      | Aturan PRD yang dijaga                    |
| ---------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| [`/milestone`](../.claude/skills/milestone/SKILL.md)                   | "Lanjut ke M1", kerjakan satu milestone end-to-end | A16, alur kerja "satu milestone per sesi" |
| [`/engine-module`](../.claude/skills/engine-module/SKILL.md)           | Logika di `packages/engine`                        | A5, A7–A10, coverage ≥ 90%                |
| [`/add-level`](../.claude/skills/add-level/SKILL.md)                   | Menulis/memperbaiki level Petualangan              | A6, A7, pola 10 level per dunia           |
| [`/add-skill-template`](../.claude/skills/add-skill-template/SKILL.md) | Skill template Pustaka Latihan                     | A9, A10, konten lokal, tanpa `eval`       |
| [`/child-ux-review`](../.claude/skills/child-ux-review/SKILL.md)       | Setelah mengubah UI area anak                      | A14, A15, A17                             |
| [`/db-change`](../.claude/skills/db-change/SKILL.md)                   | Skema PostgreSQL / migrasi Drizzle                 | A11, A12, privasi data anak               |

## Contoh pemakaian

```text
/milestone M1
/add-level buat w2-l01 sampai w2-l03 (grid 3x3, intro)
/child-ux-review
```

## Menambah skill baru

1. Buat `.claude/skills/<nama>/SKILL.md` dengan frontmatter `name` dan `description` (deskripsi = kapan dipakai;
   ini yang dibaca Claude untuk memutuskan).
2. Isi dengan langkah konkret + perintah verifikasi, rujuk bagian PRD daripada menyalinnya.
3. Tambahkan baris di tabel ini.
