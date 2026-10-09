# Menulis pelajaran + simulasi SD (D-093)

Setiap topik SD punya pelajaran "Belajar dulu" yang **konkret dan lengkap**. Pelajaran ini disimpan di
`content/skills/<domain>/<grade>/_catalog.json`, di kategori topik, kunci `lesson`. Video Momo otomatis (D-090)
ditambahkan aplikasi di depannya, jadi jangan menulis layar `tonton`. Semua kalimat dibacakan suara Chirp (D-091).

## Susunan pelajaran (4–6 layar, layar terakhir `ingat`)

1. `baca` **Konsep**: 4–6 kalimat konkret, yaitu definisi sederhana, contoh nyata dari kehidupan anak Indonesia,
   cara menulis/membaca simbol, dan satu fakta penting. `gambar` (spec) boleh ada di kalimat.
2. `peraga` **Simulasi** (1–2 layar): jenisnya sesuai mapel (lihat di bawah).
3. Opsional: `baca` **Langkah/strategi**: 3–5 kalimat "cara mengerjakan" (mis. strategi menghitung, cara membaca
   jam, cara menjawab soal cerita).
4. `coba` mode `soal` dengan `contoh: {"level": 1–3, "seed": 21}`. Level harus ada di topik itu.
5. `ingat`: ringkasan 1 kalimat di `teks`; `suara` merangkum poin penting lalu "Ayo latihan!".

`kode`: `<grade tanpa "sd">-<MA|SA|EN>-<nomor urut topik 2 digit>`, mis. `1-MA-05`, `12-SA-14`. `version`: 1.
`judul` ≤ 60 huruf (= judul topik).

## Batas & aturan umum

- `teks` ≤ 120 huruf, `suara` ≤ 400 huruf, `nama` kartu ≤ 40 huruf, `foto.label` ≤ 80 huruf, spec `word` ≤ 14 huruf.
- Bahasa Indonesia yang ramah anak SD: kalimat pendek, konkret, dan benar secara materi. Tanpa kata "salah" dan
  tanpa emoji. Pujian menyebut usaha ("Kamu sudah mengamati dengan teliti").
- Isi harus **sesuai topik & levelnya** (baca judul, intro, tips, dan judul 10 level topik itu) dan sesuai kelas.
- Fakta harus benar (Kurikulum Merdeka / buku SD). Jangan menyalin soal/kalimat dari buku, IXL, atau platform
  lain. Tulis sendiri.
- Untuk English: narasi Bahasa Indonesia, kata/kalimat target English British (colour, Mum). Kata English yang
  dibacakan berada di kartu `kata` (lafal British otomatis).

## Gambar

- **`gambar` (wajib di setiap kartu/tahap/kata)**: gambar SVG cadangan yang tampil selama foto belum ada atau saat
  offline. Spec JSON, isi tepat satu:
  - `{"object": "<id>"}` (daftar id: `objects.txt`); bisa ditambah `count` (1–20), atau `color` untuk benda;
  - `{"shape": "lingkaran|segitiga|persegi|persegi-panjang|segi-lima|segi-enam|belah-ketupat", "color": "merah|biru|kuning|hijau|ungu|oranye"}`;
  - `{"solid": "bola|kubus|balok|tabung|kerucut"}`, `{"numeral": 12}`, `{"die": 4}`;
  - `{"coin": 500}`, `{"note": 5000}`, `{"clock": "07:30"}` (menit 00/15/30/45);
  - `{"word": "akar"}`: teks pendek, bila tidak ada gambar yang cocok.

  Pilih yang benar-benar cocok. Jangan memakai pohon untuk "akar"; lebih baik `word`.

- **`foto` (realistis; dicari di Pexels lalu disaring Claude, D-095; disimpan sekali lalu dipakai ulang)**:
  - Bentuknya `{"id": "foto-<slug>", "label": "<deskripsi Indonesia ≤ 80>", "en": "<English singkat>"}`.
  - `en` adalah kata kunci pencarian Pexels: tulis benda/adegan yang umum difoto (mis. `a whole onion`,
    `children washing hands`), bukan kalimat panjang. Bila tidak ada foto yang lolos, gambar cadangan yang tampil.
  - Satu foto = satu benda/adegan nyata yang jelas.
  - Tanpa tulisan, angka, atau logo di foto (foto tidak boleh memuat jawaban soal).
  - Orang hanya anak/orang dewasa rekaan, berpakaian sopan.
  - Pakai ulang `id` yang sama bila isinya sama persis (mis. `foto-daun-hijau`).
  - Foto TIDAK dipakai untuk menghitung jumlah benda (jumlah di foto AI tidak bisa dijamin). Jumlah ditunjukkan oleh
    alat peraga atau `gambar` ber-`count`.

## Jenis simulasi (`peraga`)

### `jelajah` (Sains, juga English "tempat/benda")

```json
{"tipe": "jelajah", "foto": {...opsional suasana...}, "jelajahSuara": "...",
 "bagian": [{"id": "akar", "nama": "Akar", "teks": "...", "suara": "...", "foto": {...}, "gambar": {...}}],
 "tanya": [{"teks": "Ketuk ...", "suara": "...", "jawaban": ["akar"], "selesai": "..."}],
 "aha": "...", "tutup": "..."}
```

- 3–8 bagian. 1–5 pertanyaan; jawaban 1–4 id bagian.
- Minimal satu pertanyaan memakai > 1 jawaban (menghubungkan konsep), dan `aha` menjelaskan temuan itu.

### `proses` (Sains: perubahan, daur, urutan sebab-akibat)

```json
{"tipe": "proses", "tombol": "Panaskan", "tahap": [{"nama": "Es batu", "teks": "...", "suara": "...", "foto": {...}, "gambar": {...}}],
 "aha": "...", "tutup": "..."}
```

2–6 tahap berurutan. `tombol` ≤ 24 huruf.

### `alat` (Matematika)

```json
{"tipe": "alat", "alat": "<alat>", "foto": {...konteks nyata opsional...}, "pengantar": "...",
 "langkah": [{"teks": "...", "suara": "...", "selesai": "...", ...parameter alat}], "aha": "...", "tutup": "..."}
```

1–5 langkah, dari mudah ke sulit. Parameter per alat:

| alat             | parameter langkah                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `garis-bilangan` | `min`, `max` (≤ 1000), `dari`, `ubah` (+ maju / − mundur), `loncat` (besar lompatan, bawaan 1; `ubah` kelipatan `loncat`) |
| `blok-puluhan`   | `target` (1–999): susun dengan ratusan/puluhan/satuan                                                                     |
| `benda`          | `benda` (id objek), `a`, `b` (0–20), `op`: `+` tambah b, `-` ambil b (b ≤ a), `=` hitung a satu per satu                  |
| `uang`           | `target` rupiah, `pecahan` (koin 100/200/500/1000, kertas 1000…100000); target harus bisa dibayar pas                     |
| `jam`            | `jam` (1–12), `menit` (kelipatan 5)                                                                                       |
| `ukur`           | `benda`, `panjang` (1–15), `satuan`: `cm` / `kotak` / `klip`                                                              |
| `timbangan`      | `kiri` & `kanan`: `{benda, jumlah 1–10, berat 1–100}`. Anak memilih sisi yang lebih berat (atau sama)                     |
| `bangun`         | `bangun` (bangun datar atau ruang), `hitung`: `sisi` / `sudut` (bangun ruang: sisi = bidang, sudut = titik sudut)         |
| `pecahan`        | `penyebut` 2–12, `pembilang` ≤ penyebut, `model`: `circle` / `bar`                                                        |
| `pola`           | `urutan` (3–10 spec), `pilihan` (2–4 spec), `jawaban` (indeks)                                                            |

Boleh dua layar `peraga` (mis. `benda` lalu `garis-bilangan`). Untuk topik data/diagram/Venn yang tidak cocok dengan
alat di atas: pakai `jelajah` (kartu kategori) atau `pola`/`benda` untuk konsep dasarnya.

### `kata` (English)

```json
{"tipe": "kata", "pengantar": "...", "kata": [{"en": "red", "id": "merah", "kalimat": "The apple is red.", "foto": {...}, "gambar": {...}}],
 "aha": "...", "tutup": "..."}
```

3–8 kata. Untuk topik tata bahasa (tense, preposition, kalimat), kartunya berisi frasa/kalimat contoh pendek
(`en` ≤ 40, `kalimat` ≤ 80) dengan foto adegan.

## Memeriksa & menggabungkan

```bash
# file kerja: { "<kode topik>": { lesson … }, … }
npx tsx --conditions=source check.ts <domain> <grade> <file.json>   # dari packages/engine
python3 merge.py <domain> <grade> <file.json>                         # gabung ke _catalog.json
pnpm validate:content                                                  # harus 0 error
pnpm lesson:photos -- <domain> <grade> --dry-run                       # jumlah foto yang belum ada
pnpm lesson:photos -- <domain> <grade> [--max=20]                      # cari di Pexels + saring Claude (D-095)
```

Contoh lengkap ada di `math/sd1` topik E, `sains/sd1` topik I & E, dan `english/sd12` topik B.
