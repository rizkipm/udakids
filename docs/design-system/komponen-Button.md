# Tombol

Tombol UdaKids berbentuk "anak tangga": isian penuh dengan bayangan padat 5px di bawahnya (`shadow-tekan` + token `-tekan`), dan turun saat ditekan. Tidak ada tepi hitam tebal.

- **Utama** (`gonjong`): satu per layar, untuk hal yang paling ingin anak lakukan: "Main sekarang", "Lanjut", "Cek jawaban".
- **Hadiah** (`kunyit`): hanya untuk bintang, poin, dan hadiah: "Ambil bintang", "Buka peti".
- **Biasa** (`kertas`): aksi pendukung: "Ulangi", "Kembali". Di area anak diberi batas `garis-tegas` (≥ 3:1).

Tinggi minimal **64px di area anak** (PRD A14; panduan umum 52px berlaku untuk landing/orang dewasa). Label diawali kata kerja, maksimal 3 kata, huruf kapital hanya di awal. Font judul (Lilita One) 20px.

Di kode: `.uk-btn` / `.uk-btn--utama` / `.uk-btn--hadiah` (`apps/web/src/styles/uk-components.css`); tombol anak lama `.kid-btn` dan tombol landing `.site-btn` sudah memakai gaya yang sama (D-107).
