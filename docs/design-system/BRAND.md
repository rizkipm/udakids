# UdaKids

Belajar ditemani Uda. "Uda" adalah panggilan untuk kakak laki-laki dalam bahasa Minang, jadi UdaKids terasa seperti belajar bersama kakak yang sabar. Identitas visualnya diambil dari dunia Minangkabau: lengkung atap **gonjong** rumah gadang, warna **marawa** (hitam, merah, kuning), dan motif **pucuk rebung** dari songket. Hasilnya hangat, berani, dan khas Indonesia, sekaligus jelas berbeda dari platform belajar anak lain.

UdaKids adalah produk Eduskul, dibuat oleh tim Udacoding. Untuk pengguna, nama yang tampil hanya satu: **UdaKids**, di logo, judul halaman, dan footer.

> **Penerapan di repo ini (D-107):** token di `apps/web/src/styles/uk-tokens.css`, komponen dasar di
> `apps/web/src/styles/uk-components.css`, logo & Momo di `apps/web/public/brand/`. Bagian
> **"Penyesuaian dengan aturan proyek"** di akhir file ini mengalahkan panduan umum di atasnya.

## Prinsip

1. **Satu nama, satu wajah.** Selalu "UdaKids" (U dan K kapital). Jangan campur dengan nama produk lain di halaman yang sama.
2. **Merah untuk semangat, bukan kesalahan.** `gonjong` adalah warna merek. Jawaban yang belum tepat memakai `kunyit`, dan benar memakai `sawah`.
3. **Bisa ditekan harus terlihat bisa ditekan.** Tombol berbentuk anak tangga dengan bayangan padat di bawahnya.
4. **Besar dan jelas untuk jari kecil.** Area sentuh minimal 64px di area anak, teks isi 18px.
5. **Satu ciri per layar.** Puncak gonjong, pita pucuk rebung, atau Momo. Jangan ketiganya sekaligus berebut perhatian.

## Pembeda dari platform lain

Hindari ciri yang umum dipakai situs belajar anak lain:

- Latar krem dengan garis tepi hitam tebal di semua elemen. UdaKids memakai latar `awan` abu netral dan kartu tanpa tepi tebal (`shadow-kartu`).
- Ungu sebagai warna utama. UdaKids tidak memakai ungu sebagai warna antarmuka.
- Tombol berbentuk pil. Tombol UdaKids bersudut `radius-md` dengan bayangan anak tangga.
- Font Nunito atau Baloo. UdaKids memakai **Lilita One** dan **Andika**.

## Warna

| Peran        | Token                                          | Kapan dipakai                                  |
| ------------ | ---------------------------------------------- | ---------------------------------------------- |
| Latar        | `awan`, `kertas`                               | Halaman dan kartu                              |
| Teks         | `malam`, `malam-muted`                         | Teks utama dan keterangan                      |
| Batas sentuh | `garis-tegas`                                  | Batas tombol/pilihan yang bisa diketuk (≥ 3:1) |
| Merek        | `gonjong` (+ `-tekan`, `-soft`, `on-`)         | Tombol utama, logo, aksen judul                |
| Hadiah       | `kunyit` (+ `-tekan`, `-soft`, `-teks`, `on-`) | Bintang, poin, status "coba lagi"              |
| Berhasil     | `sawah` (+ `-soft`, `on-`)                     | Jawaban benar, level lulus, progres            |

Perbandingan kasar per layar: 70% `awan`/`kertas`, 20% `malam`, 10% warna mapel aktif dan aksen.

### Warna per mata pelajaran

Setiap mapel punya satu warna yang mewarnai tombol, jalur peta belajar, dan kepala panel di halamannya. Logo dan tombol "Mulai belajar" tetap `gonjong`.

| Mapel            | Token              | Terang                       | Gelap       |
| ---------------- | ------------------ | ---------------------------- | ----------- |
| Sains (IPAS)     | `mapel-sains`      | hijau daun                   | hijau muda  |
| Matematika       | `mapel-matematika` | merah gonjong                | merah koral |
| English          | `mapel-english`    | oranye bata                  | oranye      |
| Bahasa Indonesia | `mapel-bindo`      | hijau toska                  | toska muda  |
| Olimpiade        | `mapel-olimpiade`  | emas (teks gelap di atasnya) | emas        |

Dalam kode, pasang `data-mapel="sains"` (dan seterusnya) pada wadah halaman. Variabel `--m`, `--m-soft`, `--m-text`, `--on-m`, `--m-tekan` lalu otomatis mengikuti mapel itu. Semua pasangan **teks** memenuhi kontras 4,5:1 di tema terang dan gelap (diperiksa 2026-10-10).

## Tipografi

- **Lilita One** (judul, angka, label tombol): tebal, membulat, seperti tulisan di papan permainan. Hanya untuk teks pendek, jangan untuk paragraf. Hanya satu ketebalan: jangan diberi `font-weight` tebal (jadi tebal semu).
- **Andika** (isi): dirancang khusus untuk anak yang baru belajar membaca. Huruf "a" dan "g" bertingkat satu, "I" dan "l" mudah dibedakan.

Gaya: `display` 48px, `judul` 32px, `subjudul` 22px, `angka` 40px, `isi` 18px, `isi-kecil` 15px, `label` 13px kapital. Untuk PAUD/TK, naikkan isi menjadi 22px.

## Bentuk dan motif

- **Puncak gonjong:** lengkung atap rumah gadang di atas kartu level, kartu buku, dan sertifikat. Lengkung ini juga membentuk huruf **U** di logo.
- **Anak tangga:** bayangan padat 5px di bawah tombol, hilang saat ditekan.
- **Pucuk rebung:** pita segitiga `gonjong`/`kunyit` sebagai pembatas.
- Sudut: `radius-sm` 8px (lencana), `radius-md` 16px (tombol, pilihan), `radius-lg` 24px (kartu).

## Logo

Tanda UdaKids adalah huruf **U** berbentuk lengkung gonjong, putih di atas kotak `gonjong`, dengan satu titik `kunyit` seperti bintang (`apps/web/public/brand/udakids-mark.svg`, juga `favicon.svg` dan `apple-touch-icon.png`). Di sampingnya, tulis "UdaKids" dalam Lilita One warna `malam`. Jangan memutar, memberi gradien, atau mengganti warna tanda.

## Maskot: Momo

Usulan desain: Momo tetap robot yang sudah dikenal pengguna, dengan dua tambahan khas: **antena gonjong** dengan ujung `kunyit`, dan **badan `gonjong`** dengan garis pucuk rebung (`apps/web/public/brand/momo.svg`). Momo muncul di layar pembuka, saat memberi petunjuk, dan saat merayakan level lulus. Momo berbicara sebagai kakak: "Ayo, kita coba bareng!"

> **Diterapkan (D-113):** "Momo UdaKids" menjadi model bawaan sekaligus pilihan di Hias Momo. Warna badan mengikuti
> pilihan anak; tanpa warna = merah gonjong.

## Suara dan bahasa

- Bahasa Indonesia baku tapi hangat. Sapa anak dengan "kamu".
- Kalimat pendek: PAUD/TK maksimal 8 kata, SD maksimal 15 kata.
- Pujian spesifik: "Betul! Kamu menghitung semua Bumi dengan teliti." Bukan sekadar "Hebat!".
- Tidak pernah "Salah!". Pakai "Belum tepat, coba ..." dengan petunjuk.
- Angka format Indonesia: 73.490 soal, 14,5 poin.

## Ikon

Ikon bergaris tebal 2,5px dengan ujung membulat, ukuran 24px, warna `malam`. Isi penuh hanya untuk bintang (`kunyit`). Tanpa emoji sebagai ikon.

## Aksesibilitas

- Area sentuh minimal **64×64px di area anak** (PRD A14), 48px di area orang dewasa.
- Keadaan benar/coba lagi selalu disertai teks, tidak hanya warna.
- Fokus keyboard: garis `kunyit` 3px.
- Hormati `prefers-reduced-motion`.

## Peta Belajar

Menu belajar berbentuk peta petualangan per mapel: setiap bab adalah jalur berkelok berisi simpul topik (lingkaran 84px, ikon 52px). Keadaan simpul: **lulus** (centang `sawah` + bintang), **sekarang** (mahkota gonjong + cincin putus-putus berputar), **terkunci** (abu). Mengetuk simpul membuka panel topik: cerita pendek dari Momo dengan tombol dengar, diagram dengan titik bernomor yang bisa diketuk (penghitung "3 dari 8 bagian ditemukan"), kotak "Tahukah kamu?", foto nyata, lalu tombol "Mulai belajar".

> **Diterapkan dari data yang ada (D-111):** cerita = intro topik, "Tahukah kamu?" = tips topik. Diagram bertitik
> belum ada datanya.

---

## Penyesuaian dengan aturan proyek (D-107)

Paket design system ini dibuat umum. Di repo ini, aturan proyek (PRD, `CLAUDE.md`, keputusan D-xxx) yang berlaku bila
bertabrakan:

| Panduan paket                                                           | Yang berlaku di UdaKids                                             | Alasan                                                                                     |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Area sentuh 48px, tombol 52px                                           | **64px di area anak**                                               | PRD A14                                                                                    |
| Font dari Google Fonts                                                  | **Dipasang lokal** (`@fontsource/andika`, `@fontsource/lilita-one`) | Wajib offline; halaman anak tanpa server pihak ketiga                                      |
| Suara cadangan Web Speech API                                           | **Hanya Chirp dari server**, tanpa suara browser                    | D-106 (suara browser terdengar English/Melayu)                                             |
| `garis` untuk tepi pilihan jawaban                                      | **`garis-tegas`** (#7C8696 / gelap #6A7682)                         | `garis` 1,31:1 < 3:1 (WCAG 1.4.11)                                                         |
| Bintang `kunyit` saja                                                   | Bintang + teks jumlah / garis tepi                                  | `kunyit` di atas putih 1,85:1                                                              |
| Tema gelap wajib                                                        | Token siap, **belum diaktifkan**                                    | ±2.300 warna masih tertulis langsung di kode; diaktifkan setelah semua layar memakai token |
| Contoh `lab-antariksa.html` (Baloo 2, Lexend, bunyi "buzz" saat keliru) | Tidak diikuti                                                       | Bertentangan dengan BRAND.md sendiri dan PRD A14 (tanpa suara negatif)                     |
| Contoh `peta-belajar.html` (`speechSynthesis`)                          | Suara lewat `speak()` (Chirp)                                       | D-106                                                                                      |
| Data peta (cerita, diagram) ditulis bebas                               | Dari database; isi materi tidak dikarang                            | CLAUDE.md: konten = data di PostgreSQL                                                     |
