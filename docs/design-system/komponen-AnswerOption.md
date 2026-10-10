# Pilihan Jawaban

Satu kartu per pilihan, tinggi minimal 64px di area anak. Ada tiga keadaan:

- **Biasa:** `kertas` dengan batas `garis-tegas` (≥ 3:1; `garis` 1,31:1 terlalu samar untuk tombol anak).
- **Benar:** `sawah-soft` dengan tepi `sawah`, lalu pujian singkat dalam `sawah`.
- **Coba lagi:** `kunyit-soft` dengan tepi `kunyit`, lalu petunjuk dalam `kunyit-teks`.

Jawaban yang belum tepat **tidak pernah merah** dan tidak pernah memakai kata "salah". Merah (`gonjong`) adalah warna merek, bukan warna kegagalan. Petunjuk selalu memberi arah ("Coba hitung lagi..."), bukan hanya "Belum tepat". Jangan bedakan keadaan dengan warna saja: pujian dan petunjuk selalu tertulis (dan dibacakan suara Momo).

Di kode: `.choice.is-right` / `.choice.is-wrong`, `.feedback.is-right` / `.feedback.is-wrong` (`apps/web/src/play/play.css`, D-107 menggantikan merah D-021).
