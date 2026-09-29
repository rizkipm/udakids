---
name: engine-module
description: Tulis atau ubah kode di packages/engine (program, interpreter, solver, scoring, generator, adaptive, events) sebagai TypeScript murni dan deterministik dengan test Vitest dan coverage ≥ 90%. Pakai untuk semua logika permainan, penilaian, dan generator soal.
---

# Menulis modul engine

## Batasan

- TypeScript murni: **tanpa** React, DOM (`window`, `document`, `localStorage`, `navigator`), NestJS, Dexie,
  Howler, jaringan, atau waktu sistem implisit. ESLint menegakkan sebagian besar ini.
- Deterministik: acak hanya lewat RNG ber-seed yang dioper sebagai argumen; waktu (`now`) dioper sebagai
  argumen, bukan `Date.now()` di dalam fungsi.
- Tidak ada `eval` / `new Function` — ekspresi konten lewat evaluator aman di `generator/`.
- Import relatif memakai ekstensi `.js` (module `nodenext`). Ekspor publik lewat `src/index.ts`.
- Skema data pakai Zod; tipe diturunkan dengan `z.infer`.

## Model inti (PRD A5)

- Semua input diterjemahkan ke `Program` (`src/program/types.ts`).
- `run(level, program) => Trace`; setiap langkah membawa `instrPath` untuk menyorot Buku Catatan; batas
  200 langkah.
- Basic: hanya `move` arah tetap.

## Test

- File di `packages/engine/test/**/*.test.ts`; fixture konten di `test/fixtures/`.
- Setiap jenis instruksi, setiap aturan bintang/Skor Jago, dan setiap aturan validator punya test.
- Invarian yang wajib dites: bintang tidak pernah turun; `visibleStage` tidak pernah turun; mode tantangan
  tidak mengurangi skor atau me-reset `challengeCorrect`; solver menolak level yang tidak bisa diselesaikan.
- `pnpm --filter @little-coder/engine test` — gagal bila coverage < 90%.
