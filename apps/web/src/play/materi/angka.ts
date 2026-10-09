import type { Materi } from './types';

/**
 * Materi lengkap "Angka dan membilang" (Math TK Olimpiade, kategori A). Satu bab per level latihan A1–A10,
 * jadi setiap jenis soal yang muncul di latihan sudah dijelaskan dan dicoba lebih dulu.
 */
export const MATERI_ANGKA: Materi = {
  judul: 'Angka dan membilang',
  sub: 'Belajar pelan-pelan, satu bab demi satu bab, bersama Momo.',
  bab: [
    {
      id: 'kenal',
      judul: 'Kenal angka 1 sampai 10',
      ringkas: 'Melihat, mendengar, dan menulis angka.',
      ikon: { kind: 'numeral', value: 5 },
      level: [1],
      langkah: [
        {
          jenis: 'jelaskan',
          teks: 'Angka memberi tahu kita ada berapa banyak.',
          suara:
            'Halo! Angka itu seperti nama untuk banyaknya benda. Ketuk setiap kotak untuk mendengar penjelasannya.',
          poster: {
            judul: 'Apa itu angka?',
            sub: 'Setiap angka punya nama, bentuk, dan banyak.',
            visual: { kind: 'numeral', value: 3 },
            poin: [
              {
                judul: 'Punya nama',
                teks: 'Angka 3 dibaca "tiga".',
                suara: 'Setiap angka punya nama. Angka ini dibaca tiga.',
                visual: { kind: 'numeral', value: 3 },
              },
              {
                judul: 'Punya banyak',
                teks: 'Tiga berarti ada 3 benda.',
                suara: 'Angka tiga berarti ada tiga benda. Satu, dua, tiga apel.',
                visual: { kind: 'objects', object: 'apel', count: 3, layout: 'row' },
              },
              {
                judul: 'Bisa dengan jari',
                teks: 'Tunjukkan 3 jari.',
                suara: 'Kita juga bisa menunjukkan tiga dengan jari. Ayo angkat tiga jarimu!',
                visual: { kind: 'fingers', count: 3 },
              },
            ],
            lencana: ['Nama', 'Bentuk', 'Banyak'],
          },
        },
        {
          jenis: 'contoh',
          teks: 'Lihat Momo mengenalkan angka satu per satu.',
          suara: 'Ayo lihat Momo mengenalkan angka.',
          adegan: [
            {
              teks: '1 — satu',
              suara: 'Ini angka satu. Ada satu bola.',
              visual: [
                { kind: 'numeral', value: 1 },
                { kind: 'objects', object: 'bola', count: 1, layout: 'row' },
              ],
            },
            {
              teks: '4 — empat',
              suara: 'Ini angka empat. Ada empat bola. Kita hitung bersama.',
              selesai: 'Empat bola, angka empat.',
              visual: [
                { kind: 'numeral', value: 4 },
                { kind: 'objects', object: 'bola', count: 4, layout: 'row' },
              ],
              hitung: 'angka',
            },
            {
              teks: '7 — tujuh',
              suara: 'Ini angka tujuh. Ada tujuh bola. Kita hitung bersama.',
              selesai: 'Tujuh bola, angka tujuh.',
              visual: [
                { kind: 'numeral', value: 7 },
                { kind: 'objects', object: 'bola', count: 7, layout: 'rows' },
              ],
              hitung: 'angka',
            },
            {
              teks: '10 — sepuluh',
              suara: 'Ini angka sepuluh. Sepuluh sama dengan semua jari di dua tangan.',
              visual: [
                { kind: 'numeral', value: 10 },
                { kind: 'fingers', count: 10 },
              ],
            },
          ],
        },
        {
          jenis: 'main',
          teks: 'Ketuk angka. Dengar namanya dan lihat banyaknya.',
          suara:
            'Sekarang giliranmu. Ketuk setiap angka, lalu dengarkan namanya dan lihat banyak bendanya.',
          main: { tipe: 'kenal-angka', sampai: 10, benda: 'bintang' },
        },
        {
          jenis: 'main',
          teks: 'Dengarkan Momo, lalu ketuk angkanya.',
          suara:
            'Ayo main dengar lalu ketuk. Momo menyebut sebuah angka, kamu ketuk angka yang Momo sebut.',
          main: {
            tipe: 'dengar-ketuk',
            ronde: [
              { target: 2, pilihan: [2, 5, 8] },
              { target: 6, pilihan: [9, 6, 3] },
              { target: 9, pilihan: [6, 1, 9] },
              { target: 10, pilihan: [1, 10, 7] },
            ],
          },
        },
        {
          jenis: 'soal',
          teks: 'Coba satu soal seperti di latihan Level 1.',
          suara: 'Sekarang coba satu soal seperti di latihan. Tidak dinilai, jadi santai saja.',
          level: 1,
          seed: 7,
        },
        {
          jenis: 'ingat',
          teks: 'Ingat, ya!',
          suara: 'Ingat, ya. Dengarkan sampai selesai sebelum mengetuk.',
          poin: [
            { teks: 'Dengarkan nama angka sampai selesai, baru ketuk.', tepat: true },
            {
              teks: 'Angka 6 dan 9 mirip. Lihat lingkarannya di atas atau di bawah.',
              tepat: false,
            },
            { teks: 'Angka 10 punya dua angka: 1 dan 0.', tepat: true },
          ],
        },
      ],
    },
    {
      id: 'membilang',
      judul: 'Membilang benda',
      ringkas: 'Menghitung benda satu per satu.',
      ikon: { kind: 'objects', object: 'apel', count: 3, layout: 'row' },
      level: [2],
      langkah: [
        {
          jenis: 'jelaskan',
          teks: 'Membilang artinya menghitung benda satu per satu.',
          suara:
            'Membilang artinya menghitung benda satu per satu. Ada tiga cara supaya tidak keliru.',
          poster: {
            judul: 'Cara membilang',
            sub: 'Tiga langkah supaya hitunganmu tepat.',
            visual: { kind: 'objects', object: 'apel', count: 5, layout: 'row' },
            poin: [
              {
                judul: 'Tunjuk satu per satu',
                teks: 'Setiap benda ditunjuk sekali saja.',
                suara: 'Pertama, tunjuk benda satu per satu. Setiap benda ditunjuk sekali saja.',
                visual: { kind: 'objects', object: 'apel', count: 1, layout: 'row' },
              },
              {
                judul: 'Sebut angkanya',
                teks: 'Satu, dua, tiga, sambil menunjuk.',
                suara: 'Kedua, sebut angkanya sambil menunjuk. Satu, dua, tiga.',
                visual: { kind: 'objects', object: 'apel', count: 3, layout: 'row' },
              },
              {
                judul: 'Angka terakhir = banyaknya',
                teks: 'Angka terakhir yang kamu sebut adalah jawabannya.',
                suara:
                  'Ketiga, angka terakhir yang kamu sebut adalah banyaknya benda. Kalau terakhir menyebut lima, berarti ada lima.',
                visual: { kind: 'numeral', value: 5 },
              },
            ],
            tips: [
              { teks: 'Mulai dari kiri, terus ke kanan.', tepat: true },
              { teks: 'Hati-hati: jangan menghitung benda yang sama dua kali.', tepat: false },
            ],
          },
        },
        {
          jenis: 'contoh',
          teks: 'Momo menghitung kucing.',
          suara: 'Ayo lihat Momo menghitung.',
          adegan: [
            {
              teks: 'Ada berapa kucing?',
              suara: 'Ada berapa kucing di sini? Momo hitung satu per satu, ya.',
              visual: [{ kind: 'objects', object: 'kucing', count: 6, layout: 'rows' }],
            },
            {
              teks: 'Tunjuk dan sebut',
              suara: 'Momo tunjuk satu per satu sambil menyebut angkanya.',
              visual: [{ kind: 'objects', object: 'kucing', count: 6, layout: 'rows' }],
              hitung: 'angka',
            },
            {
              teks: 'Terakhir: enam. Jadi ada 6 kucing.',
              suara: 'Angka terakhir yang Momo sebut adalah enam. Jadi ada enam kucing.',
              visual: [
                { kind: 'objects', object: 'kucing', count: 6, layout: 'rows' },
                { kind: 'numeral', value: 6 },
              ],
            },
          ],
        },
        {
          jenis: 'main',
          teks: 'Ketuk benda satu per satu, lalu pilih angkanya.',
          suara:
            'Giliranmu! Ketuk setiap benda satu kali. Momo ikut menghitung. Setelah itu, pilih angka yang tepat.',
          main: {
            tipe: 'hitung-ketuk',
            ronde: [
              { n: 4, benda: 'bebek', pilihan: [3, 4, 5] },
              { n: 7, benda: 'stroberi', pilihan: [7, 6, 8] },
              { n: 9, benda: 'balon', pilihan: [10, 8, 9] },
            ],
          },
        },
        {
          jenis: 'soal',
          teks: 'Coba satu soal seperti di latihan Level 2.',
          suara: 'Sekarang coba soal menghitung seperti di latihan. Tunjuk satu per satu, ya.',
          level: 2,
          seed: 11,
        },
        {
          jenis: 'ingat',
          teks: 'Ingat, ya!',
          suara: 'Ingat, ya. Angka terakhir yang kamu sebut adalah banyaknya benda.',
          poin: [
            { teks: 'Tunjuk setiap benda satu kali.', tepat: true },
            { teks: 'Angka terakhir yang disebut = banyaknya benda.', tepat: true },
            { teks: 'Hati-hati melompati benda kalau letaknya berantakan.', tepat: false },
          ],
        },
      ],
    },
    {
      id: 'pasangkan',
      judul: 'Angka dan gambar',
      ringkas: 'Memasangkan angka dengan banyak benda.',
      ikon: {
        kind: 'row',
        items: [
          { kind: 'numeral', value: 2 },
          { kind: 'objects', object: 'jeruk', count: 2, layout: 'row' },
        ],
      },
      level: [3],
      langkah: [
        {
          jenis: 'jelaskan',
          teks: 'Satu angka cocok dengan satu kelompok benda.',
          suara: 'Setiap angka punya pasangan: kelompok benda yang banyaknya sama.',
          poster: {
            judul: 'Angka punya pasangan',
            sub: 'Hitung bendanya, lalu cari angka yang sama.',
            visual: {
              kind: 'row',
              items: [
                { kind: 'numeral', value: 4 },
                { kind: 'objects', object: 'jeruk', count: 4, layout: 'grid' },
              ],
            },
            poin: [
              {
                judul: 'Hitung dulu',
                teks: 'Hitung benda di setiap kelompok.',
                suara: 'Pertama, hitung benda di setiap kelompok.',
                visual: { kind: 'objects', object: 'jeruk', count: 4, layout: 'grid' },
              },
              {
                judul: 'Cari angkanya',
                teks: 'Cari angka yang sama dengan hasil hitunganmu.',
                suara:
                  'Lalu cari angka yang sama dengan hasil hitunganmu. Empat jeruk, angka empat.',
                visual: { kind: 'numeral', value: 4 },
              },
            ],
            banding: {
              judul: 'Bentuk lain, banyak sama',
              kiri: {
                label: 'Titik',
                nilai: '4',
                visual: { kind: 'dots', count: 4, layout: 'grid' },
              },
              kanan: { label: 'Jari', nilai: '4', visual: { kind: 'fingers', count: 4 } },
              tanda: '=',
              catatan: 'Titik, jari, atau buah: kalau banyaknya 4, angkanya tetap 4.',
            },
          },
        },
        {
          jenis: 'contoh',
          teks: 'Momo memasangkan angka 5.',
          suara: 'Ayo lihat Momo mencari pasangan angka lima.',
          adegan: [
            {
              teks: 'Mana yang lima?',
              suara: 'Momo punya angka lima. Kelompok mana yang ada lima benda?',
              visual: [
                { kind: 'objects', object: 'ikan', count: 3, layout: 'row' },
                { kind: 'objects', object: 'ikan', count: 5, layout: 'row' },
              ],
            },
            {
              teks: 'Hitung kelompok pertama',
              suara: 'Kelompok pertama, kita hitung.',
              selesai: 'Ada tiga. Belum lima. Kita lihat kelompok kedua.',
              visual: [{ kind: 'objects', object: 'ikan', count: 3, layout: 'row' }],
              hitung: 'angka',
            },
            {
              teks: 'Hitung kelompok kedua',
              suara: 'Kelompok kedua, kita hitung.',
              selesai: 'Ada lima!',
              visual: [{ kind: 'objects', object: 'ikan', count: 5, layout: 'row' }],
              hitung: 'angka',
            },
            {
              teks: 'Lima ikan = angka 5',
              suara: 'Ada lima ikan. Jadi pasangan angka lima adalah kelompok kedua.',
              visual: [
                { kind: 'numeral', value: 5 },
                { kind: 'objects', object: 'ikan', count: 5, layout: 'row' },
              ],
            },
          ],
        },
        {
          jenis: 'main',
          teks: 'Ketuk angka, lalu ketuk gambar pasangannya.',
          suara:
            'Ayo pasangkan! Ketuk sebuah angka, lalu ketuk kelompok benda yang banyaknya sama.',
          main: {
            tipe: 'pasangkan',
            pasangan: [
              { n: 2, benda: 'mobil' },
              { n: 5, benda: 'bunga' },
              { n: 8, benda: 'semut' },
            ],
          },
        },
        {
          jenis: 'soal',
          teks: 'Coba satu soal seperti di latihan Level 3.',
          suara: 'Sekarang coba satu soal memasangkan angka dan gambar.',
          level: 3,
          seed: 5,
        },
        {
          jenis: 'ingat',
          teks: 'Ingat, ya!',
          suara: 'Ingat, ya. Hitung dulu, baru cari angkanya.',
          poin: [
            { teks: 'Hitung bendanya dulu, baru cari angka.', tepat: true },
            { teks: 'Benda besar atau kecil tidak mengubah banyaknya.', tepat: false },
          ],
        },
      ],
    },
    {
      id: 'berikutnya',
      judul: 'Angka berikutnya',
      ringkas: 'Sebelum dan sesudah sebuah angka.',
      ikon: {
        kind: 'row',
        items: [
          { kind: 'numeral', value: 3 },
          { kind: 'numeral', value: 4 },
        ],
      },
      level: [4],
      langkah: [
        {
          jenis: 'jelaskan',
          teks: 'Angka berikutnya = satu lebih banyak.',
          suara:
            'Angka-angka berbaris seperti tangga. Angka berikutnya selalu satu lebih banyak dari angka sebelumnya.',
          poster: {
            judul: 'Sebelum dan sesudah',
            sub: 'Angka berbaris rapi dari kecil ke besar.',
            visual: {
              kind: 'cubes',
              counts: [3, 1],
              colors: ['biru', 'oranye'],
              separated: true,
            },
            poin: [
              {
                judul: 'Sesudah = tambah satu',
                teks: 'Sesudah 3 adalah 4.',
                suara:
                  'Angka sesudah tiga adalah empat. Tiga kubus ditambah satu kubus jadi empat.',
                visual: {
                  kind: 'cubes',
                  counts: [3, 1],
                  colors: ['biru', 'oranye'],
                  separated: true,
                },
              },
              {
                judul: 'Sebelum = kurang satu',
                teks: 'Sebelum 3 adalah 2.',
                suara: 'Angka sebelum tiga adalah dua. Satu lebih sedikit.',
                visual: { kind: 'cubes', counts: [2], colors: ['biru'] },
              },
              {
                judul: 'Baca dari kiri',
                teks: 'Deret 1, 2, 3, ... dibaca dari kiri ke kanan.',
                suara: 'Deret angka dibaca dari kiri ke kanan. Satu, dua, tiga, dan seterusnya.',
                visual: {
                  kind: 'row',
                  items: [
                    { kind: 'numeral', value: 1 },
                    { kind: 'numeral', value: 2 },
                    { kind: 'numeral', value: 3 },
                  ],
                },
              },
            ],
          },
        },
        {
          jenis: 'contoh',
          teks: 'Momo melanjutkan deret 5, 6, 7, ...',
          suara: 'Ayo lihat Momo melanjutkan deret angka.',
          adegan: [
            {
              teks: '5, 6, 7, ... ?',
              suara: 'Ada deret lima, enam, tujuh. Angka apa sesudahnya?',
              visual: [
                {
                  kind: 'row',
                  items: [
                    { kind: 'numeral', value: 5 },
                    { kind: 'numeral', value: 6 },
                    { kind: 'numeral', value: 7 },
                    { kind: 'blank' },
                  ],
                },
              ],
            },
            {
              teks: 'Sebut dari awal',
              suara: 'Momo sebut dari awal: lima, enam, tujuh, ... delapan!',
              visual: [
                { kind: 'cubes', counts: [7, 1], colors: ['biru', 'oranye'], separated: true },
              ],
            },
            {
              teks: 'Jawabannya 8',
              suara: 'Sesudah tujuh adalah delapan. Satu lebih banyak dari tujuh.',
              visual: [
                {
                  kind: 'row',
                  items: [
                    { kind: 'numeral', value: 5 },
                    { kind: 'numeral', value: 6 },
                    { kind: 'numeral', value: 7 },
                    { kind: 'numeral', value: 8 },
                  ],
                },
              ],
            },
          ],
        },
        {
          jenis: 'main',
          teks: 'Ketuk sebuah angka di garis bilangan.',
          suara: 'Ini garis bilangan. Ketuk sebuah angka, lalu lihat angka sebelum dan sesudahnya.',
          main: { tipe: 'garis-bilangan', sampai: 10 },
        },
        {
          jenis: 'main',
          teks: 'Gerbong mana yang belum ada angkanya?',
          suara: 'Kereta angka butuh bantuanmu! Pilih angka untuk gerbong yang kosong.',
          main: {
            tipe: 'kereta',
            ronde: [
              { deret: [2, 3, 4, 5], kosong: 3, pilihan: [5, 6, 3] },
              { deret: [6, 7, 8, 9], kosong: 3, pilihan: [8, 10, 9] },
              { deret: [1, 2, 3], kosong: 2, pilihan: [3, 4, 2] },
            ],
          },
        },
        {
          jenis: 'soal',
          teks: 'Coba satu soal seperti di latihan Level 4.',
          suara: 'Sekarang coba satu soal angka berikutnya.',
          level: 4,
          seed: 3,
        },
        {
          jenis: 'ingat',
          teks: 'Ingat, ya!',
          suara: 'Ingat, ya. Sesudah artinya satu lebih banyak.',
          poin: [
            { teks: 'Sesudah = satu lebih banyak.', tepat: true },
            { teks: 'Sebelum = satu lebih sedikit.', tepat: true },
            { teks: 'Hati-hati: sebut dari angka pertama supaya tidak terlewat.', tepat: false },
          ],
        },
      ],
    },
    {
      id: 'hilang',
      judul: 'Angka yang hilang',
      ringkas: 'Mencari angka yang hilang sampai 20.',
      ikon: {
        kind: 'row',
        items: [{ kind: 'numeral', value: 12 }, { kind: 'blank' }, { kind: 'numeral', value: 14 }],
      },
      level: [5],
      langkah: [
        {
          jenis: 'jelaskan',
          teks: 'Angka setelah 10: sebelas sampai dua puluh.',
          suara:
            'Setelah sepuluh, angka terus berlanjut sampai dua puluh. Lalu kita cari angka yang hilang.',
          poster: {
            judul: 'Angka 11 sampai 20',
            sub: 'Sepuluh lalu tambah sedikit lagi.',
            visual: { kind: 'frame', filled: 13, size: 20 },
            poin: [
              {
                judul: 'Belas',
                teks: '11 sebelas, 12 dua belas, ... 19 sembilan belas.',
                suara:
                  'Sebelas, dua belas, tiga belas, empat belas, lima belas, enam belas, tujuh belas, delapan belas, sembilan belas.',
                visual: { kind: 'numeral', value: 13 },
              },
              {
                judul: 'Dua puluh',
                teks: '20 = dua bingkai sepuluh yang penuh.',
                suara: 'Dua puluh sama dengan dua bingkai sepuluh yang penuh.',
                visual: { kind: 'frame', filled: 20, size: 20 },
              },
              {
                judul: 'Cari yang hilang',
                teks: 'Lihat angka sebelum dan sesudah tempat kosong.',
                suara:
                  'Untuk mencari angka yang hilang, lihat angka sebelum dan sesudah tempat kosong. Angka yang hilang ada di tengahnya.',
                visual: {
                  kind: 'row',
                  items: [
                    { kind: 'numeral', value: 12 },
                    { kind: 'blank' },
                    { kind: 'numeral', value: 14 },
                  ],
                },
              },
            ],
          },
        },
        {
          jenis: 'contoh',
          teks: 'Momo mencari angka yang hilang: 15, 16, ?, 18',
          suara: 'Ayo lihat Momo mencari angka yang hilang.',
          adegan: [
            {
              teks: '15, 16, ?, 18',
              suara: 'Ada lima belas, enam belas, kosong, delapan belas. Angka apa yang hilang?',
              visual: [
                {
                  kind: 'row',
                  items: [
                    { kind: 'numeral', value: 15 },
                    { kind: 'numeral', value: 16 },
                    { kind: 'blank' },
                    { kind: 'numeral', value: 18 },
                  ],
                },
              ],
            },
            {
              teks: 'Sesudah 16 adalah 17',
              suara:
                'Sesudah enam belas adalah tujuh belas. Sebelum delapan belas juga tujuh belas. Cocok!',
              visual: [{ kind: 'frame', filled: 17, size: 20 }],
            },
            {
              teks: 'Jawabannya 17',
              suara: 'Jadi angka yang hilang adalah tujuh belas.',
              visual: [
                {
                  kind: 'row',
                  items: [
                    { kind: 'numeral', value: 15 },
                    { kind: 'numeral', value: 16 },
                    { kind: 'numeral', value: 17 },
                    { kind: 'numeral', value: 18 },
                  ],
                },
              ],
            },
          ],
        },
        {
          jenis: 'main',
          teks: 'Jelajahi garis bilangan sampai 20.',
          suara:
            'Ketuk angka mana saja di garis bilangan sampai dua puluh. Dengarkan sebelum dan sesudahnya.',
          main: { tipe: 'garis-bilangan', sampai: 20 },
        },
        {
          jenis: 'main',
          teks: 'Isi gerbong yang kosong.',
          suara: 'Ada gerbong kosong di tengah kereta. Pilih angka yang hilang.',
          main: {
            tipe: 'kereta',
            ronde: [
              { deret: [10, 11, 12, 13], kosong: 1, pilihan: [11, 14, 12] },
              { deret: [14, 15, 16, 17], kosong: 2, pilihan: [18, 16, 15] },
              { deret: [16, 17, 18, 19], kosong: 0, pilihan: [15, 16, 20] },
              { deret: [17, 18, 19, 20], kosong: 3, pilihan: [20, 19, 10] },
            ],
          },
        },
        {
          jenis: 'soal',
          teks: 'Coba satu soal seperti di latihan Level 5.',
          suara: 'Sekarang coba satu soal angka yang hilang.',
          level: 5,
          seed: 9,
        },
        {
          jenis: 'ingat',
          teks: 'Ingat, ya!',
          suara: 'Ingat, ya. Lihat angka di kiri dan kanan tempat kosong.',
          poin: [
            { teks: 'Angka hilang = sesudah angka di kirinya.', tepat: true },
            { teks: 'Cek lagi: harus sebelum angka di kanannya.', tepat: true },
            { teks: 'Hati-hati: 12 dan 21 berbeda. Baca angka dari kiri.', tepat: false },
          ],
        },
      ],
    },
    {
      id: 'urutkan',
      judul: 'Mengurutkan angka',
      ringkas: 'Menyusun angka dari kecil ke besar.',
      ikon: {
        kind: 'row',
        items: [
          { kind: 'numeral', value: 1 },
          { kind: 'numeral', value: 2 },
          { kind: 'numeral', value: 3 },
        ],
      },
      level: [6],
      langkah: [
        {
          jenis: 'jelaskan',
          teks: 'Mengurutkan = menyusun dari yang paling kecil.',
          suara:
            'Mengurutkan angka artinya menyusun dari yang paling kecil sampai yang paling besar.',
          poster: {
            judul: 'Dari kecil ke besar',
            sub: 'Seperti tangga yang makin tinggi.',
            visual: {
              kind: 'row',
              items: [
                { kind: 'dots', count: 2, layout: 'grid' },
                { kind: 'dots', count: 4, layout: 'grid' },
                { kind: 'dots', count: 6, layout: 'grid' },
              ],
            },
            poin: [
              {
                judul: 'Cari yang paling kecil',
                teks: 'Letakkan di paling depan.',
                suara: 'Pertama, cari angka yang paling kecil. Letakkan di paling depan.',
                visual: { kind: 'numeral', value: 2 },
              },
              {
                judul: 'Lalu yang berikutnya',
                teks: 'Dari sisa kartu, cari lagi yang paling kecil.',
                suara:
                  'Lalu dari kartu yang tersisa, cari lagi yang paling kecil. Ulangi sampai habis.',
                visual: {
                  kind: 'row',
                  items: [
                    { kind: 'numeral', value: 2 },
                    { kind: 'numeral', value: 4 },
                  ],
                },
              },
              {
                judul: 'Cek dengan menyebut',
                teks: 'Sebut urutannya: makin lama makin besar.',
                suara: 'Terakhir, sebut urutannya. Angkanya harus makin lama makin besar.',
                visual: {
                  kind: 'row',
                  items: [
                    { kind: 'numeral', value: 2 },
                    { kind: 'numeral', value: 4 },
                    { kind: 'numeral', value: 6 },
                  ],
                },
              },
            ],
          },
        },
        {
          jenis: 'contoh',
          teks: 'Momo mengurutkan 7, 3, 9, 5.',
          suara: 'Ayo lihat Momo mengurutkan kartu angka.',
          adegan: [
            {
              teks: 'Kartu: 7, 3, 9, 5',
              suara:
                'Ada kartu tujuh, tiga, sembilan, dan lima. Kita urutkan dari yang paling kecil.',
              visual: [
                {
                  kind: 'row',
                  items: [
                    { kind: 'numeral', value: 7 },
                    { kind: 'numeral', value: 3 },
                    { kind: 'numeral', value: 9 },
                    { kind: 'numeral', value: 5 },
                  ],
                },
              ],
            },
            {
              teks: 'Paling kecil: 3',
              suara: 'Yang paling kecil adalah tiga. Tiga di depan.',
              visual: [{ kind: 'numeral', value: 3 }],
            },
            {
              teks: 'Lalu 5, lalu 7',
              suara: 'Dari sisanya, yang paling kecil lima. Lalu tujuh.',
              visual: [
                {
                  kind: 'row',
                  items: [
                    { kind: 'numeral', value: 3 },
                    { kind: 'numeral', value: 5 },
                    { kind: 'numeral', value: 7 },
                  ],
                },
              ],
            },
            {
              teks: '3, 5, 7, 9',
              suara:
                'Terakhir sembilan. Urutannya tiga, lima, tujuh, sembilan. Makin lama makin besar.',
              visual: [
                {
                  kind: 'row',
                  items: [
                    { kind: 'numeral', value: 3 },
                    { kind: 'numeral', value: 5 },
                    { kind: 'numeral', value: 7 },
                    { kind: 'numeral', value: 9 },
                  ],
                },
              ],
            },
          ],
        },
        {
          jenis: 'main',
          teks: 'Ketuk kartu dari yang paling kecil.',
          suara: 'Giliranmu! Ketuk kartu angka mulai dari yang paling kecil.',
          main: {
            tipe: 'urutkan',
            ronde: [
              [4, 1, 3, 2],
              [8, 5, 10, 6],
              [9, 2, 7, 4],
            ],
          },
        },
        {
          jenis: 'soal',
          teks: 'Coba satu soal seperti di latihan Level 6.',
          suara: 'Sekarang coba satu soal mengurutkan angka.',
          level: 6,
          seed: 4,
        },
        {
          jenis: 'ingat',
          teks: 'Ingat, ya!',
          suara: 'Ingat, ya. Mulai dari yang paling kecil.',
          poin: [
            { teks: 'Mulai dari angka paling kecil.', tepat: true },
            {
              teks: 'Hati-hati: angka tidak harus berurutan satu-satu, misalnya 3, 5, 7.',
              tepat: false,
            },
          ],
        },
      ],
    },
    {
      id: 'urutan',
      judul: 'Urutan ke berapa',
      ringkas: 'Pertama, kedua, ketiga, dan seterusnya.',
      ikon: { kind: 'objects', object: 'bebek', count: 3, layout: 'row' },
      level: [7],
      langkah: [
        {
          jenis: 'jelaskan',
          teks: 'Urutan dihitung dari yang paling depan.',
          suara:
            'Kalau benda berbaris, kita bisa menyebut urutannya: pertama, kedua, ketiga. Dihitung dari yang paling depan.',
          poster: {
            judul: 'Pertama, kedua, ketiga',
            sub: 'Hitung dari depan barisan.',
            visual: { kind: 'objects', object: 'bebek', count: 5, layout: 'row' },
            poin: [
              {
                judul: 'Lihat depannya',
                teks: 'Depan barisan ditandai bendera.',
                suara: 'Lihat dulu di mana depan barisan. Di sini, depan ditandai bendera.',
                visual: { kind: 'objects', object: 'bebek', count: 1, layout: 'row' },
              },
              {
                judul: 'Hitung dari depan',
                teks: 'Yang paling depan = pertama.',
                suara: 'Yang paling depan disebut pertama. Lalu kedua, ketiga, dan seterusnya.',
                visual: { kind: 'objects', object: 'bebek', count: 3, layout: 'row' },
              },
              {
                judul: 'Ke-1 sampai ke-10',
                teks: 'Pertama, kedua, ketiga, ... kesepuluh.',
                suara:
                  'Pertama, kedua, ketiga, keempat, kelima, keenam, ketujuh, kedelapan, kesembilan, kesepuluh.',
                visual: { kind: 'numeral', value: 10 },
              },
            ],
            tips: [
              { teks: 'Satu bisa disebut "pertama" atau "kesatu".', tepat: true },
              { teks: 'Hati-hati: jangan mulai dari belakang barisan.', tepat: false },
            ],
          },
        },
        {
          jenis: 'contoh',
          teks: 'Hewan ke berapa yang memakai topi?',
          suara: 'Ayo lihat Momo mencari urutan.',
          adegan: [
            {
              teks: 'Mana yang keempat?',
              suara: 'Ada barisan hewan. Momo mencari yang keempat dari depan.',
              visual: [{ kind: 'objects', object: 'kelinci', count: 6, layout: 'row' }],
            },
            {
              teks: 'Hitung dari depan',
              suara: 'Momo hitung dari depan, ya.',
              visual: [{ kind: 'objects', object: 'kelinci', count: 4, layout: 'row' }],
              hitung: 'urutan',
              selesai: 'Ketemu! Ini yang keempat.',
            },
            {
              teks: 'Keempat = nomor 4 dari depan',
              suara: 'Yang keempat adalah kelinci nomor empat dari depan.',
              visual: [{ kind: 'numeral', value: 4 }],
            },
          ],
        },
        {
          jenis: 'main',
          teks: 'Ketuk hewan yang Momo sebut.',
          suara: 'Ayo main antrean! Bendera ada di depan. Ketuk hewan yang Momo sebut urutannya.',
          main: {
            tipe: 'antrean',
            hewan: ['kucing', 'bebek', 'kelinci', 'sapi', 'katak', 'penguin', 'gajah', 'monyet'],
            ronde: [3, 1, 6, 8],
          },
        },
        {
          jenis: 'soal',
          teks: 'Coba satu soal seperti di latihan Level 7.',
          suara: 'Sekarang coba satu soal urutan ke berapa.',
          level: 7,
          seed: 6,
        },
        {
          jenis: 'ingat',
          teks: 'Ingat, ya!',
          suara: 'Ingat, ya. Selalu hitung dari depan.',
          poin: [
            { teks: 'Cari depan barisan dulu.', tepat: true },
            {
              teks: 'Hati-hati: "ketiga" bukan "tiga benda", tapi satu benda di urutan 3.',
              tepat: false,
            },
          ],
        },
      ],
    },
    {
      id: 'besar',
      judul: 'Paling besar, paling kecil',
      ringkas: 'Membandingkan angka sampai 20.',
      ikon: { kind: 'cubes', counts: [2, 5], colors: ['biru', 'oranye'], separated: true },
      level: [8],
      langkah: [
        {
          jenis: 'jelaskan',
          teks: 'Angka besar = bendanya lebih banyak.',
          suara: 'Angka yang lebih besar artinya bendanya lebih banyak. Ada dua cara untuk tahu.',
          poster: {
            judul: 'Mana yang lebih besar?',
            sub: 'Bandingkan banyaknya atau letaknya.',
            visual: {
              kind: 'row',
              items: [
                { kind: 'frame', filled: 4, size: 10 },
                { kind: 'frame', filled: 7, size: 10 },
              ],
            },
            poin: [
              {
                judul: 'Bandingkan menara',
                teks: 'Menara kubus yang lebih panjang = angka lebih besar.',
                suara:
                  'Bayangkan angka sebagai menara kubus. Menara yang lebih panjang adalah angka yang lebih besar.',
                visual: { kind: 'cubes', counts: [7], colors: ['oranye'] },
              },
              {
                judul: 'Lihat garis bilangan',
                teks: 'Makin ke kanan, makin besar.',
                suara:
                  'Di garis bilangan, angka yang lebih ke kanan adalah angka yang lebih besar.',
                visual: {
                  kind: 'row',
                  items: [
                    { kind: 'numeral', value: 4 },
                    { kind: 'numeral', value: 7 },
                  ],
                },
              },
              {
                judul: 'Angka belasan',
                teks: '15 lebih besar dari 9, karena 15 = 10 + 5.',
                suara:
                  'Lima belas lebih besar dari sembilan, karena lima belas adalah sepuluh ditambah lima lagi.',
                visual: { kind: 'frame', filled: 15, size: 20 },
              },
            ],
            banding: {
              judul: 'Contoh',
              kiri: {
                label: 'Tujuh',
                nilai: '7',
                visual: { kind: 'dots', count: 7, layout: 'grid' },
              },
              kanan: {
                label: 'Empat',
                nilai: '4',
                visual: { kind: 'dots', count: 4, layout: 'grid' },
              },
              tanda: '>',
              catatan: '7 lebih besar dari 4.',
            },
          },
        },
        {
          jenis: 'contoh',
          teks: 'Momo mencari yang paling besar: 12, 8, 17.',
          suara: 'Ayo lihat Momo mencari angka paling besar.',
          adegan: [
            {
              teks: '12, 8, 17 — mana paling besar?',
              suara: 'Ada dua belas, delapan, dan tujuh belas. Mana yang paling besar?',
              visual: [
                {
                  kind: 'row',
                  items: [
                    { kind: 'numeral', value: 12 },
                    { kind: 'numeral', value: 8 },
                    { kind: 'numeral', value: 17 },
                  ],
                },
              ],
            },
            {
              teks: '8 tidak sampai 10',
              suara: 'Delapan belum sampai sepuluh. Jadi delapan paling kecil.',
              visual: [{ kind: 'frame', filled: 8, size: 10 }],
            },
            {
              teks: '12 dan 17: lihat sisanya',
              suara:
                'Dua belas dan tujuh belas sama-sama punya sepuluh. Dua belas lebihnya dua, tujuh belas lebihnya tujuh.',
              visual: [
                { kind: 'frame', filled: 12, size: 20 },
                { kind: 'frame', filled: 17, size: 20 },
              ],
            },
            {
              teks: 'Paling besar: 17',
              suara: 'Jadi yang paling besar adalah tujuh belas.',
              visual: [{ kind: 'numeral', value: 17 }],
            },
          ],
        },
        {
          jenis: 'main',
          teks: 'Ketuk angka yang Momo minta.',
          suara: 'Ayo bandingkan! Lihat menaranya kalau ragu, lalu ketuk angka yang Momo minta.',
          main: {
            tipe: 'banding',
            ronde: [
              { angka: [3, 8, 5], cari: 'besar' },
              { angka: [9, 4, 6], cari: 'kecil' },
              { angka: [11, 16, 13], cari: 'besar' },
              { angka: [18, 10, 14], cari: 'kecil' },
            ],
          },
        },
        {
          jenis: 'soal',
          teks: 'Coba satu soal seperti di latihan Level 8.',
          suara: 'Sekarang coba satu soal angka paling besar.',
          level: 8,
          seed: 2,
        },
        {
          jenis: 'ingat',
          teks: 'Ingat, ya!',
          suara: 'Ingat, ya. Makin ke kanan di garis bilangan, makin besar.',
          poin: [
            { teks: 'Bendanya lebih banyak = angkanya lebih besar.', tepat: true },
            { teks: 'Baca pertanyaannya: paling besar atau paling kecil?', tepat: false },
            { teks: 'Angka belasan selalu lebih besar dari angka satuan.', tepat: true },
          ],
        },
      ],
    },
    {
      id: 'bingkai',
      judul: 'Bingkai sepuluh',
      ringkas: 'Menghitung cepat sampai 20.',
      ikon: { kind: 'frame', filled: 7, size: 10 },
      level: [9],
      langkah: [
        {
          jenis: 'jelaskan',
          teks: 'Bingkai sepuluh membantu menghitung lebih cepat.',
          suara:
            'Bingkai sepuluh punya sepuluh kotak. Kalau penuh, isinya pasti sepuluh. Ini membuat menghitung jadi cepat.',
          poster: {
            judul: 'Bingkai sepuluh',
            sub: 'Penuh berarti sepuluh. Tidak perlu dihitung lagi.',
            visual: { kind: 'frame', filled: 10, size: 10 },
            poin: [
              {
                judul: 'Satu baris = 5',
                teks: 'Satu baris penuh berisi 5 titik.',
                suara: 'Satu baris penuh berisi lima titik.',
                visual: { kind: 'frame', filled: 5, size: 10 },
              },
              {
                judul: 'Penuh = 10',
                teks: 'Dua baris penuh = 10 titik.',
                suara: 'Dua baris penuh berisi sepuluh titik.',
                visual: { kind: 'frame', filled: 10, size: 10 },
              },
              {
                judul: 'Lanjut dari 10',
                teks: '10 penuh + 4 titik = 14.',
                suara:
                  'Kalau satu bingkai penuh dan bingkai kedua ada empat titik, kita mulai dari sepuluh: sebelas, dua belas, tiga belas, empat belas.',
                visual: { kind: 'frame', filled: 14, size: 20 },
              },
            ],
            tips: [
              { teks: 'Mulai dari 10, lalu hitung terus titik sisanya.', tepat: true },
              { teks: 'Hati-hati: jangan hitung kotak kosong.', tepat: false },
            ],
          },
        },
        {
          jenis: 'contoh',
          teks: 'Momo menghitung titik di bingkai.',
          suara: 'Ayo lihat Momo menghitung titik di bingkai.',
          adegan: [
            {
              teks: 'Ada berapa titik?',
              suara: 'Ada berapa titik di bingkai ini?',
              visual: [{ kind: 'frame', filled: 16, size: 20 }],
            },
            {
              teks: 'Bingkai pertama penuh: 10',
              suara: 'Bingkai pertama penuh. Itu sepuluh. Tidak perlu dihitung satu per satu.',
              visual: [{ kind: 'frame', filled: 10, size: 10 }],
            },
            {
              teks: 'Lanjut: 11, 12, 13, 14, 15, 16',
              suara:
                'Lalu lanjut dari sepuluh: sebelas, dua belas, tiga belas, empat belas, lima belas, enam belas.',
              visual: [{ kind: 'frame', filled: 16, size: 20 }],
            },
            {
              teks: 'Jadi ada 16 titik',
              suara: 'Jadi ada enam belas titik. Sepuluh ditambah enam.',
              visual: [{ kind: 'numeral', value: 16 }],
            },
          ],
        },
        {
          jenis: 'main',
          teks: 'Isi bingkai sampai angka yang Momo sebut.',
          suara: 'Ayo isi bingkai! Ketuk kotak kosong untuk menaruh titik sampai banyaknya pas.',
          main: { tipe: 'bingkai', ronde: [8, 13, 19] },
        },
        {
          jenis: 'soal',
          teks: 'Coba satu soal seperti di latihan Level 9.',
          suara: 'Sekarang coba satu soal menghitung titik di bingkai.',
          level: 9,
          seed: 8,
        },
        {
          jenis: 'ingat',
          teks: 'Ingat, ya!',
          suara: 'Ingat, ya. Bingkai penuh berarti sepuluh.',
          poin: [
            { teks: 'Bingkai penuh = 10.', tepat: true },
            { teks: 'Mulai dari 10, lalu hitung sisanya.', tepat: true },
          ],
        },
      ],
    },
    {
      id: 'tantangan',
      judul: 'Tantangan angka',
      ringkas: 'Semua yang sudah kamu pelajari.',
      ikon: { kind: 'object', object: 'bintang' },
      level: [10],
      langkah: [
        {
          jenis: 'jelaskan',
          teks: 'Di tantangan, jenis soalnya bercampur.',
          suara:
            'Di tantangan, soalnya bercampur. Ini peta semua yang sudah kamu pelajari. Ketuk untuk mengingat lagi.',
          poster: {
            judul: 'Peta jago angka',
            sub: 'Semua cara yang sudah kamu kuasai.',
            visual: { kind: 'object', object: 'bintang' },
            poin: [
              {
                judul: 'Dengar & kenal',
                teks: 'Dengar nama angka, cari bentuknya.',
                suara: 'Dengarkan nama angka sampai selesai, lalu cari bentuknya.',
                visual: { kind: 'numeral', value: 15 },
              },
              {
                judul: 'Hitung',
                teks: 'Tunjuk satu per satu. Angka terakhir = banyaknya.',
                suara: 'Saat menghitung, tunjuk satu per satu. Angka terakhir adalah banyaknya.',
                visual: { kind: 'objects', object: 'apel', count: 6, layout: 'rows' },
              },
              {
                judul: 'Bandingkan',
                teks: 'Paling kecil ada di paling kiri garis bilangan.',
                suara:
                  'Angka paling kecil ada di paling kiri garis bilangan. Paling besar di paling kanan.',
                visual: {
                  kind: 'cubes',
                  counts: [3, 6],
                  colors: ['biru', 'oranye'],
                  separated: true,
                },
              },
              {
                judul: 'Urutan',
                teks: 'Sesudah = tambah satu, sebelum = kurang satu.',
                suara: 'Angka sesudah adalah tambah satu. Angka sebelum adalah kurang satu.',
                visual: {
                  kind: 'row',
                  items: [
                    { kind: 'numeral', value: 9 },
                    { kind: 'numeral', value: 10 },
                    { kind: 'numeral', value: 11 },
                  ],
                },
              },
            ],
            kutipan: 'Pelan-pelan dan teliti lebih penting daripada cepat.',
          },
        },
        {
          jenis: 'main',
          teks: 'Pemanasan: dengar lalu ketuk angka belasan.',
          suara: 'Pemanasan dulu. Dengarkan Momo, lalu ketuk angkanya. Sekarang sampai dua puluh!',
          main: {
            tipe: 'dengar-ketuk',
            ronde: [
              { target: 12, pilihan: [12, 21, 2, 15] },
              { target: 17, pilihan: [11, 7, 17, 19] },
              { target: 20, pilihan: [2, 12, 10, 20] },
            ],
          },
        },
        {
          jenis: 'main',
          teks: 'Cari angka yang paling kecil.',
          suara: 'Di tantangan ada soal angka paling kecil. Ayo coba!',
          main: {
            tipe: 'banding',
            ronde: [
              { angka: [14, 9, 20, 11], cari: 'kecil' },
              { angka: [19, 15, 16, 12], cari: 'kecil' },
            ],
          },
        },
        {
          jenis: 'soal',
          teks: 'Coba soal tantangan.',
          suara: 'Sekarang coba satu soal tantangan.',
          level: 10,
          seed: 1,
        },
        {
          jenis: 'soal',
          teks: 'Satu soal tantangan lagi.',
          suara: 'Satu soal tantangan lagi. Kamu pasti bisa!',
          level: 10,
          seed: 2,
        },
        {
          jenis: 'ingat',
          teks: 'Kamu sudah belajar semua bab!',
          suara: 'Hebat! Kamu sudah belajar semua bab dengan sabar. Sekarang kamu siap berlatih.',
          poin: [
            { teks: 'Dengarkan atau baca soal sampai selesai.', tepat: true },
            { teks: 'Hitung pelan-pelan, satu per satu.', tepat: true },
            { teks: 'Ragu? Gambar menara atau garis bilangan di kepalamu.', tepat: true },
          ],
        },
      ],
    },
  ],
};
