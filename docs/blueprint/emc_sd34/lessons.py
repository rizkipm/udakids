"""Pelajaran "Belajar dulu" EMC Kelas 3–4 (D-101): infografis + simulasi + strategi + coba + ingat.

Foto: subjek Pexels yang disaring Claude (`pnpm lesson:photos -- math sd34`, D-095); selama belum ada, gambar SVG
(`visual`) yang tampil. Gambar geometri selalu SVG (`figure`), tidak pernah foto, agar ukurannya tepat.
"""

from __future__ import annotations

from core import fig, poly, pt, right, seg, label


def photo(id_: str, label_: str, en: str) -> dict:
    return {"id": id_, "label": label_, "en": en}


def lesson(kode: str, judul: str, info: dict, peraga: dict, baca: list, coba_level: int, ingat: tuple) -> dict:
    return {
        "kode": kode,
        "version": 1,
        "judul": judul,
        "layar": [
            {"jenis": "infografis", "teks": "Ketuk setiap kartu untuk mendengarkan penjelasannya.",
             "suara": f"Ayo kenali dulu {judul.lower()}. Ketuk setiap kartu bernomor untuk mendengarkan penjelasannya.",
             "infografis": info},
            {"jenis": "peraga", "teks": peraga.pop("_teks"), "suara": peraga.pop("_suara"), "peraga": peraga},
            {"jenis": "baca", "teks": "Cara cepat gaya olimpiade. Ketuk setiap langkah.",
             "suara": "Begini cara cepat mengerjakan soal olimpiade. Ketuk setiap langkah untuk mendengarnya.",
             "kalimat": [{"teks": t} if isinstance(t, str) else {"teks": t[0], "suara": t[1]} for t in baca]},
            {"jenis": "coba", "mode": "soal", "teks": "Ayo coba satu soal. Tidak dinilai, kok!",
             "suara": "Sekarang coba satu soal. Tidak dinilai, jadi santai saja.",
             "contoh": {"level": coba_level, "seed": 7}},
            {"jenis": "ingat", "teks": ingat[0], "suara": ingat[1]},
        ],
    }


def alat(alat_: str, foto: dict | None, teks: str, suara: str, pengantar: str, langkah: list, aha: str, tutup: str) -> dict:
    d = {"_teks": teks, "_suara": suara, "tipe": "alat", "alat": alat_}
    if foto:
        d["foto"] = foto
    d.update({"pengantar": pengantar, "langkah": langkah, "aha": aha, "tutup": tutup})
    return d


TRI = fig([poly([(0, 0), (4, 0), (4, 3)], "soft"), right((4, 0), (0, 0), (4, 3)),
           seg((0, 0), (4, 0), "4"), seg((4, 0), (4, 3), "3"), seg((0, 0), (4, 3), "5")])
CIRCLE = fig([{"t": "circle", "c": [0, 0], "r": 3, "fill": "soft", "center": True},
              seg((0, 0), (3, 0), "r")])


def ea_lesson():
    info = {
        "judul": "Rahasia bangun datar dan ruang",
        "sub": "Lingkaran, persegi, segitiga siku-siku, dan kubus: rumus kecil yang sering keluar di EMC.",
        "foto": photo("foto-roda-sepeda", "roda sepeda yang bundar", "bicycle wheel close up"),
        "visual": CIRCLE,
        "poin": [
            {"judul": "Keliling lingkaran", "teks": "Keliling = 2 × π × jari-jari. Keliling 10π berarti jari-jari 5.",
             "suara": "Keliling lingkaran sama dengan dua kali pi kali jari-jari. Jika kelilingnya sepuluh pi, jari-jarinya lima.",
             "visual": CIRCLE},
            {"judul": "Persegi dipotong", "teks": "Persegi dipotong 4 sama besar: sisinya jadi setengah, luasnya jadi seperempat.",
             "foto": photo("foto-kertas-origami", "tumpukan kertas origami persegi warna-warni", "colorful origami paper squares")},
            {"judul": "Tripel Pythagoras", "teks": "Segitiga siku-siku 3-4-5, 6-8-10, 5-12-13, 9-12-15: sisi miringnya bulat.",
             "suara": "Ingat tripel Pythagoras: tiga empat lima, enam delapan sepuluh, lima dua belas tiga belas, dan sembilan dua belas lima belas.",
             "visual": TRI},
            {"judul": "Kerangka kubus", "teks": "Kubus punya 12 rusuk sama panjang. Kawat 60 cm → rusuk 5 cm → volume 125 cm³.",
             "foto": photo("foto-kotak-kado-kubus", "kotak kado berbentuk kubus", "cube shaped gift box")},
        ],
        "lencana": ["Tanpa kalkulator", "Tripel 3-4-5", "12 rusuk kubus", "Luas ½ × a × t"],
        "rumus": {"judul": "Rumus andalan", "baris": ["K lingkaran = 2 × π × r", "L persegi panjang = p × l",
                                                       "L segitiga = a × t : 2", "V kubus = s × s × s"],
                  "suara": "Rumus andalan: keliling lingkaran dua pi r. Luas persegi panjang panjang kali lebar. Luas segitiga alas kali tinggi dibagi dua. Volume kubus sisi kali sisi kali sisi."},
        "banding": {"judul": "Luas yang tumpang tindih",
                    "kiri": {"label": "Dijumlah langsung", "nilai": "16 + 16 = 32"},
                    "kanan": {"label": "Dikurangi irisan", "nilai": "32 − 4 = 28"},
                    "tanda": "→", "catatan": "Bagian yang tumpang tindih terhitung dua kali, jadi kurangi sekali."},
        "tips": [{"teks": "Gambar ulang bangunnya dan tulis ukuran yang diketahui.", "tepat": True},
                 {"teks": "Cari tripel Pythagoras sebelum menghitung akar.", "tepat": True},
                 {"teks": "Jangan lupa: π tetap ditulis kalau jawabannya dalam π.", "tepat": False},
                 {"teks": "Jangan tertukar keliling dan luas.", "tepat": False}],
        "kutipan": "Gambar dulu, hitung kemudian. Bangun yang digambar rapi setengah terjawab!",
    }
    per = alat("luas", photo("foto-ubin-lantai", "lantai ubin persegi yang rapi", "square floor tiles"),
               "Simulasi: keliling dan luas di petak.", "Isi petak untuk menghitung luas, lalu ukur keempat sisi untuk keliling.",
               "Setiap kotak bersisi 1 satuan. Luas = banyak kotak, keliling = panjang garis tepi.",
               [{"teks": "Isi persegi panjang 6 × 4.", "suara": "Isi persegi panjang enam kali empat sampai penuh.",
                 "selesai": "Luasnya 24 kotak, sama dengan 6 × 4.", "panjang": 6, "lebar": 4, "hitung": "luas"},
                {"teks": "Ukur keliling persegi panjang 6 × 4.", "suara": "Sekarang ukur keempat sisinya.",
                 "selesai": "Kelilingnya 6 + 4 + 6 + 4 = 20 satuan.", "panjang": 6, "lebar": 4, "hitung": "keliling"},
                {"teks": "Isi persegi 4 × 4.", "suara": "Isi persegi empat kali empat.",
                 "selesai": "Luasnya 16. Kalau dipotong menjadi 4 persegi kecil, tiap persegi kecil 2 × 2 = 4.", "panjang": 4, "lebar": 4, "hitung": "luas"}],
               "Luas menghitung isi, keliling menghitung tepi!", "Kamu teliti sekali membedakan luas dan keliling. Hebat!")
    baca = ["Soal lingkaran: tulis dulu rumus keliling 2 × π × r, lalu bandingkan angka di depan π.",
            "Persegi panjang dari kawat: panjang + lebar = setengah panjang kawat.",
            "Perbandingan 3 : 2 artinya panjang 3 bagian dan lebar 2 bagian; cari dulu nilai satu bagian.",
            "Segitiga dengan garis tinggi: bagi menjadi dua segitiga siku-siku, cari sisi miring dengan tripel.",
            "Luas gabungan = jumlah luas − luas bagian yang tumpang tindih."]
    return lesson("34-MA-101", "Geometri bidang dan ruang", info, per, baca, 2,
                  ("Keliling lingkaran 2πr, tripel 3-4-5, kubus 12 rusuk, luas gabungan dikurangi irisan.",
                   "Ingat, ya! Keliling lingkaran dua pi r. Cari tripel Pythagoras seperti tiga empat lima. Kubus punya dua belas rusuk. Luas gabungan dikurangi bagian yang tumpang tindih. Ayo latihan!"))


def eb_lesson():
    grid = fig([pt((3, 4), "P", "ne", True), pt((-2, 1), "Q", "nw", True), seg((-2, 1), (3, 1), dashed=True),
                seg((3, 1), (3, 4), dashed=True)], axes=(-4, 5, -2, 5))
    info = {
        "judul": "Peta harta bidang koordinat",
        "sub": "Setiap titik punya alamat (x, y): x ke kanan-kiri, y ke atas-bawah.",
        "foto": photo("foto-papan-catur", "papan catur kayu dengan petak-petaknya", "wooden chessboard"),
        "visual": grid,
        "poin": [
            {"judul": "Alamat titik", "teks": "(3, 4): dari titik nol, 3 langkah ke kanan lalu 4 langkah ke atas.",
             "suara": "Titik tiga koma empat: dari titik nol, tiga langkah ke kanan, lalu empat langkah ke atas.",
             "visual": grid},
            {"judul": "Jarak mendatar", "teks": "Jika y sama, jaraknya = selisih x. (2, 5) ke (9, 5) = 7 satuan."},
            {"judul": "Jarak miring", "teks": "Geser mendatar dan tegak, lalu pakai Pythagoras: geser 3 dan 4 → jarak 5.",
             "visual": TRI},
            {"judul": "Luas segi banyak", "teks": "Buat kotak batas, lalu kurangi segitiga-segitiga di pojoknya.",
             "foto": photo("foto-kertas-berpetak", "kertas berpetak dengan pensil", "graph paper with pencil")},
        ],
        "lencana": ["x dulu, y kemudian", "Negatif = kiri/bawah", "Kotak batas", "Cek pilihan"],
        "rumus": {"judul": "Rumus koordinat", "baris": ["jarak mendatar = x₂ − x₁", "jarak tegak = y₂ − y₁",
                                                         "jarak miring: tripel Pythagoras", "luas = kotak batas − pojok"],
                  "suara": "Jarak mendatar sama dengan selisih x. Jarak tegak sama dengan selisih y. Jarak miring pakai tripel Pythagoras. Luas sama dengan kotak batas dikurangi segitiga pojok."},
        "banding": {"judul": "Jangan tertukar",
                    "kiri": {"label": "Titik (2, 5)", "nilai": "2 kanan, 5 atas"},
                    "kanan": {"label": "Titik (5, 2)", "nilai": "5 kanan, 2 atas"},
                    "tanda": "≠", "catatan": "Urutan penting: angka pertama selalu x (mendatar)."},
        "tips": [{"teks": "Gambar sketsa sumbu dan titiknya, walau soal tidak memberi gambar.", "tepat": True},
                 {"teks": "Untuk soal pilihan, masukkan pilihan ke syarat soal lalu cek.", "tepat": True},
                 {"teks": "Jarak dari −2 ke 3 bukan 1, tetapi 5.", "tepat": False}],
        "kutipan": "Seperti peta harta karun: ikuti langkah x, lalu langkah y!",
    }
    per = alat("koordinat", photo("foto-peta-pulau", "peta kertas tua sebuah pulau", "old paper island map"),
               "Simulasi: tandai titik harta karun.", "Ketuk bidang koordinat untuk memindahkan penanda, lalu tekan Pasang.",
               "Mulai dari titik nol. Angka pertama ke kanan atau kiri, angka kedua ke atas atau bawah.",
               [{"teks": "Tandai titik (3, 2).", "suara": "Tandai titik tiga, dua.", "selesai": "Tepat! Tiga ke kanan, dua ke atas.",
                 "x": 3, "y": 2, "xMin": -4, "xMax": 5, "yMin": -4, "yMax": 5},
                {"teks": "Tandai titik (−3, 4).", "suara": "Tandai titik negatif tiga, empat.", "selesai": "Negatif berarti ke kiri. Tiga ke kiri, empat ke atas.",
                 "x": -3, "y": 4, "xMin": -4, "xMax": 5, "yMin": -4, "yMax": 5},
                {"teks": "K, L, M sudut persegi panjang. Tandai sudut keempat.", "suara": "K, L, dan M adalah tiga sudut persegi panjang. Tandai sudut keempatnya.",
                 "selesai": "Sudut keempat punya x dari satu titik dan y dari titik lainnya.",
                 "x": 4, "y": -2, "xMin": -4, "xMax": 5, "yMin": -4, "yMax": 5,
                 "titik": [{"x": -2, "y": -2, "nama": "K"}, {"x": -2, "y": 3, "nama": "L"}, {"x": 4, "y": 3, "nama": "M"}]}],
               "Titik (x, y): x untuk mendatar, y untuk tegak!", "Kamu sudah jago membaca peta koordinat!")
    baca = ["Jarak dua titik dengan y sama: kurangi x yang besar dengan x yang kecil.",
            "Jarak miring: hitung geser mendatar dan geser tegak, lalu cari tripel Pythagoras.",
            "Luas segitiga di koordinat: pilih sisi yang mendatar atau tegak sebagai alas.",
            "Luas segi banyak: buat kotak batas, lalu kurangi segitiga pojok yang tidak termasuk.",
            "Soal 'nilai X yang memenuhi': coba masukkan pilihan jawaban satu per satu."]
    return lesson("34-MA-102", "Geometri koordinat", info, per, baca, 1,
                  ("Angka pertama x (mendatar), kedua y (tegak). Jarak miring pakai Pythagoras. Luas pakai kotak batas.",
                   "Ingat, ya! Angka pertama x untuk mendatar, angka kedua y untuk tegak. Jarak miring pakai Pythagoras. Luas segi banyak pakai kotak batas dikurangi pojok. Ayo latihan!"))


def ec_lesson():
    info = {
        "judul": "Jurus bilangan dan aljabar",
        "sub": "Ganjil-genap, kelipatan, faktor, dan persamaan: trik cepat tanpa kalkulator.",
        "foto": photo("foto-timbangan-neraca", "timbangan neraca dua lengan", "balance scale"),
        "poin": [
            {"judul": "Ganjil dan genap", "teks": "Genap × apa saja = genap. Genap + 1 = ganjil. Ganjil + ganjil = genap."},
            {"judul": "Kelipatan di antara", "teks": "Cari kelipatan pertama dan terakhir, lalu (terakhir − pertama) : k + 1."},
            {"judul": "Jumlahkan persamaan", "teks": "4P + 3C dan 3P + 4C: jumlahkan → 7P + 7C, lalu bagi 7."},
            {"judul": "Banyak faktor", "teks": "2 pangkat 5 punya 5 + 1 = 6 faktor: 1, 2, 4, 8, 16, 32.",
             "foto": photo("foto-balok-mainan", "balok mainan kayu bertumpuk", "wooden toy blocks stacked")},
        ],
        "lencana": ["Ganjil-genap", "KPK & kelipatan", "Jumlahkan persamaan", "Pangkat + 1"],
        "rumus": {"judul": "Rumus cepat", "baris": ["besar = (jumlah + selisih) : 2", "kecil = (jumlah − selisih) : 2",
                                                   "banyak kelipatan = (akhir − awal) : k + 1", "faktor p pangkat n = n + 1"]},
        "banding": {"judul": "Contoh jumlah & selisih",
                    "kiri": {"label": "Jumlah 30, selisih 4", "nilai": "17 dan 13"},
                    "kanan": {"label": "Hasil kali", "nilai": "17 × 13 = 221"},
                    "tanda": "→", "catatan": "Cari dua bilangannya dulu dengan rumus cepat, baru dikali."},
        "tips": [{"teks": "Ganti huruf n dengan angka kecil untuk mengecek ganjil-genap.", "tepat": True},
                 {"teks": "Kerjakan mundur dengan operasi kebalikan.", "tepat": True},
                 {"teks": "'Di antara 100 dan 200' tidak termasuk 100 dan 200.", "tepat": False}],
        "kutipan": "Lihat polanya dulu, hitungan panjang jadi pendek!",
    }
    per = alat("garis-bilangan", None, "Simulasi: lompat kelipatan.", "Lompat pada garis bilangan untuk menemukan kelipatan.",
               "Setiap lompatan sama besar. Hitung berapa kali kamu mendarat.",
               [{"teks": "Dari 0, lompat 6 sebanyak 5 kali.", "suara": "Mulai dari nol. Lompat enam sebanyak lima kali.",
                 "selesai": "Kamu mendarat di 6, 12, 18, 24, 30: lima kelipatan 6.", "min": 0, "max": 60, "dari": 0, "ubah": 30, "loncat": 6},
                {"teks": "Dari 12, lompat 6 sampai 48.", "suara": "Mulai dari dua belas. Lompat enam sampai empat puluh delapan.",
                 "selesai": "12, 18, 24, 30, 36, 42, 48: ada (48 − 12) : 6 + 1 = 7 kelipatan.", "min": 0, "max": 60, "dari": 12, "ubah": 36, "loncat": 6}],
               "Banyak kelipatan = banyak lompatan + 1 (termasuk titik awal)!", "Lompatanmu rapi sekali!")
    baca = ["Soal ganjil-genap: misalkan n = 2 (genap) atau n = 3 (ganjil), lalu hitung setiap pilihan.",
            "Harga dua belanjaan yang mirip: kurangkan atau jumlahkan kedua belanjaan supaya yang sama hilang.",
            "Jumlah dan selisih dua bilangan: besar = (jumlah + selisih) : 2.",
            "Tiga bilangan dengan rata-rata: bilangan yang sama dengan rata-rata ada di tengah.",
            "Banyak faktor 2ᵃ × 3ᵇ = (a + 1) × (b + 1)."]
    return lesson("34-MA-103", "Bilangan dan aljabar", info, per, baca, 2,
                  ("Genap × apa saja genap. Kelipatan: (akhir − awal) : k + 1. Jumlahkan persamaan yang mirip.",
                   "Ingat, ya! Genap dikali apa saja tetap genap. Banyak kelipatan sama dengan akhir dikurangi awal, dibagi k, ditambah satu. Persamaan yang mirip dijumlahkan atau dikurangkan. Ayo latihan!"))


def ed_lesson():
    info = {
        "judul": "Belanja cerdas: rasio & persen",
        "sub": "Pecahan, persen, diskon, dan perbandingan dalam kehidupan sehari-hari.",
        "foto": photo("foto-pasar-buah", "lapak buah di pasar tradisional", "traditional fruit market stall"),
        "poin": [
            {"judul": "Persen = per seratus", "teks": "25% = 25/100 = 1/4. Jadi 25% dari 80 = 20."},
            {"judul": "Diskon", "teks": "Diskon 20% berarti membayar 80% harga. Harga Rp10.000 → bayar Rp8.000.",
             "foto": photo("foto-keranjang-belanja", "keranjang belanja berisi sayur dan buah", "shopping basket groceries")},
            {"judul": "Naik persen", "teks": "Naik 20% dan kenaikannya Rp300.000: 1% = Rp15.000, harga lama Rp1.500.000."},
            {"judul": "Naik berulang", "teks": "Naik 25% tiap bulan = dikali 5/4 tiap bulan, bukan ditambah 25% dari awal terus.",
             "foto": photo("foto-celengan", "celengan berisi uang koin", "piggy bank with coins")},
        ],
        "lencana": ["Persen = /100", "Diskon = bayar sisa", "Satu bagian dulu", "Tulis Rp rapi"],
        "rumus": {"judul": "Rumus andalan", "baris": ["a% dari N = a × N : 100", "harga diskon = (100 − d)% × harga",
                                                     "satu bagian = jumlah : banyak bagian", "naik p% = × (100 + p)/100"]},
        "banding": {"judul": "Diskon bertingkat",
                    "kiri": {"label": "Diskon 20% + 10%", "nilai": "bayar 72%"},
                    "kanan": {"label": "Diskon 30% sekaligus", "nilai": "bayar 70%"},
                    "tanda": "≠", "catatan": "Diskon kedua dihitung dari harga setelah diskon pertama."},
        "tips": [{"teks": "Cari nilai satu bagian atau satu persen dulu.", "tepat": True},
                 {"teks": "Baca baik-baik: yang ditanya harga awal atau harga akhir?", "tepat": True},
                 {"teks": "Persen bertingkat tidak boleh dijumlahkan langsung.", "tepat": False}],
        "kutipan": "Pembeli cerdas selalu menghitung satu bagian dulu!",
    }
    per = alat("desimal", photo("foto-label-harga-buah", "buah-buahan segar di rak toko", "fresh fruit on store shelf"),
               "Simulasi: persen di petak perseratus.", "Arsir petak sesuai persennya. Satu petak = 1%.",
               "Petak ini punya 100 kotak. Setiap kotak adalah satu persen.",
               [{"teks": "Arsir 25 kotak (25%).", "suara": "Arsir dua puluh lima kotak.", "selesai": "25% = 25 dari 100 = seperempat.", "perseratus": 25},
                {"teks": "Arsir 80 kotak: harga setelah diskon 20%.", "suara": "Diskon dua puluh persen berarti membayar delapan puluh persen. Arsir delapan puluh kotak.",
                 "selesai": "Diskon 20% → yang dibayar 80%.", "perseratus": 80}],
               "Persen artinya per seratus!", "Kamu sudah paham persen dengan petak. Keren!")
    baca = ["Bagian yang diketahui → cari satu bagian → kalikan dengan banyak bagian yang ditanya.",
            "Diskon untuk 2 barang: bandingkan apa yang dibayar masing-masing orang dalam persen harga.",
            "Kenaikan p% bernilai N: harga lama = N × 100 : p, harga baru = harga lama + N.",
            "Perbandingan berantai: samakan satu benda di tengah, lalu sambungkan.",
            "Naik berulang: hitung bulan demi bulan, setiap kali dikali (100 + p)/100."]
    return lesson("34-MA-104", "Rasio, persen, dan aritmetika sosial", info, per, baca, 1,
                  ("Persen = per seratus. Cari satu bagian dulu. Diskon bertingkat tidak dijumlahkan.",
                   "Ingat, ya! Persen artinya per seratus. Selalu cari satu bagian dulu. Diskon dan kenaikan bertingkat dihitung satu per satu. Ayo latihan!"))


def ee_lesson():
    info = {
        "judul": "Detektif data: statistika",
        "sub": "Rata-rata, median, dan modus untuk membaca data dengan cepat.",
        "foto": photo("foto-semangka-pasar", "tumpukan semangka di pasar", "watermelons at market"),
        "poin": [
            {"judul": "Rata-rata", "teks": "Rata-rata = jumlah semua data : banyak data. Data 6, 7, 8 → 21 : 3 = 7."},
            {"judul": "Data yang hilang", "teks": "Jumlah baru = rata-rata baru × banyak data. Kurangi jumlah yang sudah ada."},
            {"judul": "Tabel frekuensi", "teks": "Kalikan nilai dengan banyaknya, jumlahkan, lalu bagi dengan banyak semua data.",
             "visual": {"kind": "table", "headers": ["Nilai", "Banyak"], "rows": [["6", "2"], ["8", "3"]]}},
            {"judul": "Median & modus", "teks": "Median = data tengah setelah diurutkan. Modus = data paling sering muncul.",
             "foto": photo("foto-penggaris-pensil", "penggaris dan pensil di atas meja", "ruler and pencils on desk")},
        ],
        "lencana": ["Jumlah : banyak", "Urutkan dulu", "Rata-rata × n", "Tanpa kalkulator"],
        "rumus": {"judul": "Rumus statistika", "baris": ["rata-rata = jumlah : banyak", "jumlah = rata-rata × banyak",
                                                        "data baru = jumlah baru − jumlah lama"]},
        "banding": {"judul": "Rata-rata gabungan",
                    "kiri": {"label": "10 anak rata-rata 80", "nilai": "jumlah 800"},
                    "kanan": {"label": "30 anak rata-rata 60", "nilai": "jumlah 1.800"},
                    "tanda": "→", "catatan": "Gabungan = 2.600 : 40 = 65, bukan (80 + 60) : 2 = 70."},
        "tips": [{"teks": "Ubah rata-rata menjadi jumlah dulu.", "tepat": True},
                 {"teks": "Urutkan data sebelum mencari median.", "tepat": True},
                 {"teks": "Rata-rata dua kelompok berbeda ukuran tidak bisa dirata-rata langsung.", "tepat": False}],
        "kutipan": "Detektif data selalu mengubah rata-rata menjadi jumlah!",
    }
    per = alat("diagram", None, "Simulasi: diagram dari tabel.", "Atur tinggi batang sesuai tabel, lalu bandingkan.",
               "Satu kotak bernilai sama dengan skalanya.",
               [{"teks": "Buat diagram nilai kuis.", "suara": "Atur tinggi setiap batang sesuai nilai kuis.",
                 "selesai": "Jumlah 6 + 8 + 7 + 7 = 28, rata-rata 28 : 4 = 7.", "satuan": "poin", "skala": 1,
                 "data": [{"nama": "Ayu", "nilai": 6}, {"nama": "Bima", "nilai": 8}, {"nama": "Citra", "nilai": 7}, {"nama": "Dimas", "nilai": 7}]}],
               "Batang yang terlalu tinggi menutup batang yang pendek: itulah rata-rata!", "Diagrammu rapi. Hebat!")
    baca = ["Rata-rata diketahui? Kalikan dengan banyak data supaya mendapat jumlah.",
            "Data hilang = jumlah semua (dari rata-rata) − jumlah data yang diketahui.",
            "Tabel frekuensi: nilai × banyak, jumlahkan, lalu bagi dengan jumlah semua banyak.",
            "Semua sama kecuali satu: (jumlah − data yang beda) : (banyak − 1).",
            "Data terurut dengan dua huruf: cari jumlah keduanya, lalu pakai urutan untuk menebak nilainya."]
    return lesson("34-MA-105", "Statistika", info, per, baca, 2,
                  ("Rata-rata × banyak = jumlah. Median = tengah setelah diurutkan. Modus = paling sering.",
                   "Ingat, ya! Rata-rata dikali banyak data sama dengan jumlah. Median adalah data tengah setelah diurutkan. Modus adalah data yang paling sering muncul. Ayo latihan!"))


def ef_lesson():
    info = {
        "judul": "Kemungkinan peluang",
        "sub": "Dadu, koin, dan bola: hitung semua hasil, lalu hasil yang diharapkan.",
        "foto": photo("foto-dadu-meja", "dua dadu putih di atas meja kayu", "two dice on wooden table"),
        "visual": {"kind": "row", "items": [{"kind": "die", "value": 3}, {"kind": "die", "value": 5}]},
        "poin": [
            {"judul": "Rumus peluang", "teks": "Peluang = banyak hasil yang diharapkan : banyak semua hasil.",
             "visual": {"kind": "fraction", "num": 4, "den": 6}},
            {"judul": "Satu dadu", "teks": "Ada 6 hasil. Peluang mata genap = 3/6 = 1/2.",
             "visual": {"kind": "die", "value": 4}},
            {"judul": "Koin", "teks": "1 koin: 2 hasil. 3 koin: 2 × 2 × 2 = 8 hasil (AAA, AAG, …, GGG).",
             "foto": photo("foto-uang-logam", "beberapa uang logam di atas meja", "coins on table")},
            {"judul": "Dua bola sekaligus", "teks": "3 merah + 2 hitam, ambil 2 sekaligus: ada 10 pasangan, 6 di antaranya beda warna.",
             "foto": photo("foto-kelereng-warna", "kelereng warna-warni di dalam toples", "colorful marbles in jar")},
        ],
        "lencana": ["0 = mustahil", "1 = pasti", "Daftar semua hasil", "Tabel 6 × 6"],
        "rumus": {"judul": "Rumus peluang", "baris": ["P = hasil diharapkan : semua hasil", "koin n buah: 2 pangkat n hasil",
                                                     "dua dadu: 36 hasil", "P(tidak A) = 1 − P(A)"]},
        "banding": {"judul": "Dua dadu",
                    "kiri": {"label": "Jumlah 7", "nilai": "6/36 = 1/6", "visual": {"kind": "row", "items": [{"kind": "die", "value": 1}, {"kind": "die", "value": 6}]}},
                    "kanan": {"label": "Jumlah 2", "nilai": "1/36", "visual": {"kind": "row", "items": [{"kind": "die", "value": 1}, {"kind": "die", "value": 1}]}},
                    "tanda": ">", "catatan": "Jumlah 7 paling sering muncul karena pasangannya paling banyak."},
        "tips": [{"teks": "Daftar semua hasil dengan rapi (tabel atau pohon).", "tepat": True},
                 {"teks": "Untuk 'paling sedikit satu', hitung kebalikannya lalu kurangkan dari 1.", "tepat": True},
                 {"teks": "Seri bukan menang: baca aturan permainannya dengan teliti.", "tepat": False}],
        "kutipan": "Hitung semua kemungkinan dulu, peluang pun jadi jelas!",
    }
    per = alat("peluang", photo("foto-dadu-merah", "dadu merah dilempar di atas meja", "red dice rolling on table"),
               "Simulasi: tandai hasil yang cocok.", "Ketuk semua hasil yang memenuhi kejadian.",
               "Semua hasil yang mungkin tampil sebagai kartu. Ketuk yang cocok saja.",
               [{"teks": "Satu dadu: ketuk semua mata genap.", "suara": "Ketuk semua mata dadu yang genap.",
                 "selesai": "Ada 3 dari 6 hasil, peluangnya 3/6 = 1/2.", "ruang": "die", "syarat": "a % 2 == 0"},
                {"teks": "Dua dadu: ketuk semua pasangan berjumlah 7.", "suara": "Ketuk semua pasangan dadu yang jumlahnya tujuh.",
                 "selesai": "Ada 6 dari 36 pasangan, peluangnya 6/36 = 1/6.", "ruang": "dice2", "syarat": "s == 7"},
                {"teks": "Tiga koin: ketuk hasil dengan tepat 2 angka.", "suara": "Ketuk semua hasil dengan tepat dua angka.",
                 "selesai": "AAG, AGA, GAA: 3 dari 8, peluangnya 3/8.", "ruang": "coins3", "syarat": "h == 2"}],
               "Peluang = hasil yang cocok dibagi semua hasil!", "Kamu teliti menghitung semua kemungkinan. Hebat!")
    baca = ["Langkah 1: daftar semua hasil yang mungkin (ruang sampel).",
            "Langkah 2: tandai hasil yang diharapkan.",
            "Langkah 3: peluang = banyak yang ditandai : banyak semua hasil, lalu sederhanakan.",
            "Ambil 2 bola sekaligus: banyak pasangan dari n bola = n × (n − 1) : 2.",
            "Kebalikan: P(paling sedikit satu angka) = 1 − P(tidak ada angka)."]
    return lesson("34-MA-106", "Peluang", info, per, baca, 1,
                  ("Peluang = hasil yang diharapkan : semua hasil. Daftar semua hasil dengan rapi.",
                   "Ingat, ya! Peluang sama dengan banyak hasil yang diharapkan dibagi banyak semua hasil. Daftar semua hasil dengan rapi, dan pakai kebalikan untuk soal paling sedikit satu. Ayo latihan!"))


def eg_lesson():
    info = {
        "judul": "Hitung cerdas: kombinatorika",
        "sub": "Pagar, jabat tangan, sarang merpati, dan menghitung bangun pada gambar.",
        "foto": photo("foto-deretan-pohon", "deretan pohon di tepi jalan", "row of trees along road"),
        "poin": [
            {"judul": "Prinsip pagar", "teks": "Jalan 20 m, pohon setiap 5 m termasuk ujung: 20 : 5 + 1 = 5 pohon."},
            {"judul": "Barisan persegi panjang", "teks": "Panjang 4 m, lebar 2 m, jarak 1 m: (4 + 1) × (2 + 1) = 15 anak."},
            {"judul": "Paling banyak", "teks": "10 pasang kaus kaki 3 warna, tiap warna minimal 2: satu warna paling banyak 10 − 4 = 6.",
             "foto": photo("foto-kaus-kaki-warna", "kaus kaki warna-warni berjajar", "colorful socks")},
            {"judul": "Hitung segitiga", "teks": "Garis dari satu puncak ke alas: pilih 2 garis = 1 segitiga. Hitung per lapis.",
             "visual": fig([poly([(0, 0), (6, 0), (2, 5)]), seg((2, 5), (3, 0)), seg((2, 5), (4.5, 0))])},
        ],
        "lencana": ["+1 di garis", "Tanpa +1 di lingkaran", "Kemungkinan terburuk", "Hitung teratur"],
        "rumus": {"judul": "Rumus hitung", "baris": ["pagar lurus: jarak + 1", "jabat tangan: n × (n − 1) : 2",
                                                    "aturan kali: a × b × c", "persegi panjang petak: C(m+1,2) × C(n+1,2)"],
                  "suara": "Pagar lurus: banyak jarak ditambah satu. Jabat tangan: n kali n kurang satu, dibagi dua. Aturan perkalian: a kali b kali c."},
        "banding": {"judul": "Garis vs lingkaran",
                    "kiri": {"label": "Jalan lurus 30 m, tiap 5 m", "nilai": "7 tiang"},
                    "kanan": {"label": "Kolam keliling 30 m, tiap 5 m", "nilai": "6 tiang"},
                    "tanda": "≠", "catatan": "Pada lingkaran, tiang pertama sekaligus tiang terakhir."},
        "tips": [{"teks": "Gambar kecil dulu (sedikit tiang/anak), cari polanya, lalu perbesar.", "tepat": True},
                 {"teks": "Sarang merpati: bayangkan kemungkinan yang paling sial.", "tepat": True},
                 {"teks": "Hati-hati menghitung dua kali benda yang sama.", "tepat": False}],
        "kutipan": "Hitung dengan teratur, tidak ada yang terlewat!",
    }
    per = alat("garis-bilangan", photo("foto-pagar-kayu", "pagar kayu dengan tiang berjajar", "wooden fence posts"),
               "Simulasi: tiang pagar.", "Lompat pada garis untuk melihat banyak tiang.",
               "Setiap titik pendaratan adalah satu tiang. Jangan lupa tiang di titik awal.",
               [{"teks": "Jalan 30 m, tiang setiap 5 m. Lompat dari 0 ke 30.", "suara": "Lompat lima meter dari nol sampai tiga puluh.",
                 "selesai": "6 lompatan, tetapi 7 tiang karena tiang di titik 0 juga dihitung.", "min": 0, "max": 30, "dari": 0, "ubah": 30, "loncat": 5}],
               "Banyak tiang = banyak jarak + 1 pada garis lurus!", "Kamu menemukan rahasia pagar!")
    baca = ["Prinsip pagar: hitung banyak jarak, lalu tambah 1 untuk garis lurus.",
            "Barisan persegi panjang: (panjang : jarak + 1) × (lebar : jarak + 1).",
            "Paling banyak satu jenis = jumlah − (jumlah minimal semua jenis lain).",
            "Pasti mendapat: bayangkan kemungkinan terburuk, lalu tambah 1.",
            "Hitung segitiga: mulai dari yang terkecil, lalu gabungan 2, 3, dan seterusnya."]
    return lesson("34-MA-107", "Kombinatorika dan penalaran", info, per, baca, 1,
                  ("Garis lurus: jarak + 1. Paling banyak: yang lain dibuat minimal. Hitung dengan teratur.",
                   "Ingat, ya! Pada garis lurus, banyak tiang sama dengan banyak jarak ditambah satu. Agar satu jenis paling banyak, jenis lain dibuat paling sedikit. Hitung bangun dengan teratur. Ayo latihan!"))


def eh_lesson():
    info = {
        "judul": "Kencang dan kompak: kecepatan & kerja",
        "sub": "Jarak, waktu, kecepatan, berpapasan, dan kerja bersama.",
        "foto": photo("foto-kereta-api", "kereta api melaju di rel", "train on railway"),
        "poin": [
            {"judul": "Segitiga ajaib", "teks": "Jarak = kecepatan × waktu. Waktu = jarak : kecepatan."},
            {"judul": "Berpapasan", "teks": "Saling mendekat: kecepatan dijumlah. 120 km, 40 + 20 km/jam → 2 jam.",
             "foto": photo("foto-motor-jalan", "sepeda motor di jalan raya", "motorcycle on road")},
            {"judul": "Perbandingan jarak", "teks": "Waktu sama → jarak sebanding kecepatan. A 3 kali lebih cepat → A 3 bagian, B 1 bagian."},
            {"judul": "Kerja bersama", "teks": "A 4 jam, bersama 3 jam: B = 1/3 − 1/4 = 1/12 bagian per jam → 12 jam.",
             "foto": photo("foto-mengecat-dinding", "kuas dan kaleng cat di dekat dinding", "paint brush and paint can")},
        ],
        "lencana": ["J = K × W", "Mendekat: dijumlah", "Per jam", "Satuan sama"],
        "rumus": {"judul": "Rumus andalan", "baris": ["jarak = kecepatan × waktu", "berpapasan: waktu = jarak : (v1 + v2)",
                                                     "kerja: 1/bersama = 1/A + 1/B"]},
        "banding": {"judul": "Kerja bersama",
                    "kiri": {"label": "Rata-rata waktu", "nilai": "(4 + 12) : 2 = 8 jam"},
                    "kanan": {"label": "Benar", "nilai": "1/4 + 1/12 = 1/3 → 3 jam"},
                    "tanda": "≠", "catatan": "Bekerja bersama selalu lebih cepat daripada yang tercepat sendirian."},
        "tips": [{"teks": "Ubah semua ke satuan yang sama (km & jam, atau m & menit).", "tepat": True},
                 {"teks": "Pikirkan 'berapa bagian pekerjaan selesai dalam 1 jam'.", "tepat": True},
                 {"teks": "Waktu kerja bersama tidak boleh dijumlah atau dirata-rata.", "tepat": False}],
        "kutipan": "Hitung per jam, semua soal kecepatan dan kerja jadi mudah!",
    }
    per = alat("garis-bilangan", photo("foto-bus-jalan", "bus melaju di jalan raya", "bus on highway"),
               "Simulasi: perjalanan bus.", "Lompat sejauh jarak tempuh setiap jam.",
               "Setiap lompatan adalah jarak yang ditempuh dalam 1 jam.",
               [{"teks": "Bus 60 km/jam selama 3 jam.", "suara": "Lompat enam puluh kilometer sebanyak tiga kali.",
                 "selesai": "Jarak = 60 × 3 = 180 km.", "min": 0, "max": 300, "dari": 0, "ubah": 180, "loncat": 60},
                {"teks": "Bus 45 km/jam selama 4 jam.", "suara": "Lompat empat puluh lima kilometer sebanyak empat kali.",
                 "selesai": "Jarak = 45 × 4 = 180 km. Lebih lambat, tetapi lebih lama.", "min": 0, "max": 270, "dari": 0, "ubah": 180, "loncat": 45}],
               "Jarak = kecepatan × waktu!", "Perjalananmu tepat waktu. Hebat!")
    baca = ["Tulis yang diketahui: jarak, kecepatan, waktu. Satu dicari dari dua lainnya.",
            "Saling mendekat: dalam 1 jam jarak berkurang v1 + v2.",
            "Waktu sama: perbandingan jarak = perbandingan kecepatan.",
            "Kerja: A sendiri a jam berarti 1/a bagian per jam. Bersama: jumlahkan bagiannya.",
            "Waktu B sendiri: 1/B = 1/bersama − 1/A."]
    return lesson("34-MA-108", "Kecepatan dan kerja", info, per, baca, 1,
                  ("Jarak = kecepatan × waktu. Berpapasan: kecepatan dijumlah. Kerja: hitung bagian per jam.",
                   "Ingat, ya! Jarak sama dengan kecepatan kali waktu. Saat berpapasan, kecepatan dijumlahkan. Untuk kerja bersama, hitung berapa bagian selesai dalam satu jam. Ayo latihan!"))
