---
name: db-change
description: Ubah skema PostgreSQL UdaKids lewat Drizzle (apps/api/src/db/schema.ts) dan buat migrasi dengan drizzle-kit, sambil menjaga aturan privasi data anak. Pakai saat menambah tabel/kolom/index atau mengubah model data API.
---

# Perubahan skema database

## Aturan privasi (cek dulu)

- Tabel `children` hanya boleh berisi `nickname`, `momo_color`, `report_token`, relasi, dan timestamp.
  **Dilarang:** foto, email, tanggal lahir, alamat, rekaman/transkrip suara.
- Kontak orang tua hanya di `parent_contacts`, dan `consent_at` wajib `not null`.
- Kalau perubahan menyentuh data pribadi di luar ini → berhenti dan tanya user.

## Langkah

1. Ubah `apps/api/src/db/schema.ts`.
2. `pnpm db:generate` (atau `pnpm --filter @little-coder/api exec drizzle-kit generate --name <nama>`).
3. Review file SQL baru di `apps/api/drizzle/` — jangan edit migrasi yang sudah di-commit; buat migrasi baru.
4. `pnpm db:migrate` lalu cek `psql postgres://littlecoder:littlecoder@localhost:5432/littlecoder -c '\d <tabel>'`.
5. Tambah/ubah test API; jalankan `pnpm test`.

## Pola yang dipakai

- `events`: PK `id` dari client (uuid v4) → insert idempoten `onConflictDoNothing()`.
- Proyeksi (`level_progress`, `skill_mastery`) dihitung dengan reducer dari `@little-coder/engine`, merge:
  bintang = max, `visibleStage` = max, Skor Jago = `ts` terbaru.
- Otorisasi di guard NestJS: fasilitator hanya kelasnya; anak lewat token sesi kelas; laporan lewat
  `report_token`.
- Postgres lokal (Postgres.app) di port **5432**, tanpa Docker.
