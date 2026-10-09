"""Daftar topik EMC Kelas 3–4 (urut kisi-kisi) dan kisi-kisi 40 nomor mock test (D-101)."""

from __future__ import annotations

import bilangan
import data
import geometri
import lessons
import penalaran

TOPICS = [
    dict(code="EA", title="Geometri bidang dan ruang", short="Geometri bidang & ruang", kisi="Geometri Bidang & Ruang",
         levels=geometri.ea_levels, lesson=lessons.ea_lesson,
         intro="Lingkaran, persegi, persegi panjang, segitiga siku-siku (tripel Pythagoras), luas gabungan, perbandingan luas segitiga, dan kerangka kubus. Porsi terbesar di EMC bersama geometri koordinat.",
         tips=["Keliling lingkaran = 2 × π × r.", "Hafalkan tripel 3-4-5, 6-8-10, 5-12-13, 9-12-15.",
               "Luas gabungan = jumlah luas − bagian yang tumpang tindih."]),
    dict(code="EB", title="Geometri koordinat", short="Geometri koordinat", kisi="Geometri Koordinat",
         levels=geometri.eb_levels, lesson=lessons.eb_lesson,
         intro="Titik (x, y) di bidang Kartesius: jarak mendatar dan miring (Pythagoras), keliling dan luas bangun dari koordinat, serta mencari koordinat yang memenuhi syarat.",
         tips=["Angka pertama x (mendatar), angka kedua y (tegak).", "Luas segi banyak = kotak batas − segitiga pojok.",
               "Soal 'nilai X': coba masukkan pilihan jawaban."]),
    dict(code="EC", title="Bilangan dan aljabar", short="Bilangan & aljabar", kisi="Bilangan & Aljabar",
         levels=bilangan.ec_levels, lesson=lessons.ec_lesson,
         intro="Ganjil-genap bentuk aljabar, harga dalam dua pernyataan, jumlah dan selisih, kelipatan dalam rentang, banyak faktor, dan persamaan sederhana.",
         tips=["Genap × apa saja = genap.", "Banyak kelipatan = (akhir − awal) : k + 1.",
               "Persamaan yang mirip: jumlahkan atau kurangkan."]),
    dict(code="ED", title="Rasio, persen, dan aritmetika sosial", short="Rasio & persen", kisi="Rasio, Persen & Aritmetika Sosial",
         levels=bilangan.ed_levels, lesson=lessons.ed_lesson,
         intro="Pecahan dari keseluruhan, persen, diskon, kenaikan persen (sekali dan berulang), perbandingan, dan perbandingan berantai dalam belanja sehari-hari.",
         tips=["Persen = per seratus.", "Cari nilai satu bagian dulu.", "Diskon dan kenaikan bertingkat dihitung satu per satu."]),
    dict(code="EE", title="Statistika", short="Statistika", kisi="Statistika",
         levels=data.ee_levels, lesson=lessons.ee_lesson,
         intro="Rata-rata, data yang hilang, tabel frekuensi, rata-rata gabungan, median, modus, dan data terurut.",
         tips=["Jumlah = rata-rata × banyak data.", "Urutkan data sebelum mencari median.",
               "Rata-rata gabungan dihitung dari jumlah, bukan dari rata-rata."]),
    dict(code="EF", title="Peluang", short="Peluang", kisi="Peluang",
         levels=data.ef_levels, lesson=lessons.ef_lesson,
         intro="Peluang dengan dadu, koin, kartu, dan bola: ruang sampel, kejadian, pengambilan dua bola sekaligus, dan kejadian kebalikan.",
         tips=["Peluang = hasil yang diharapkan : semua hasil.", "Daftar semua hasil dengan tabel.",
               "Paling sedikit satu = 1 − tidak ada sama sekali."]),
    dict(code="EG", title="Kombinatorika dan penalaran", short="Kombinatorika & penalaran", kisi="Kombinatorika & Penalaran",
         levels=penalaran.eg_levels, lesson=lessons.eg_lesson,
         intro="Prinsip pagar, barisan berbentuk persegi panjang, jabat tangan, nilai paling banyak, sarang merpati, aturan perkalian, dan menghitung bangun pada gambar.",
         tips=["Garis lurus: banyak jarak + 1.", "Paling banyak: jenis lain dibuat paling sedikit.",
               "Hitung bangun dengan teratur, dari yang terkecil."]),
    dict(code="EH", title="Kecepatan dan kerja", short="Kecepatan & kerja", kisi="Kecepatan & Kerja",
         levels=penalaran.eh_levels, lesson=lessons.eh_lesson,
         intro="Jarak, waktu, kecepatan, mengubah satuan, berpapasan, debit, dan kerja bersama.",
         tips=["Jarak = kecepatan × waktu.", "Saling mendekat: kecepatan dijumlah.", "Kerja: hitung bagian yang selesai per jam."]),
]

GAME_TOPIC = dict(
    code="GE", title="Game seru EMC", short="Game seru EMC", kisi="Game",
    levels=penalaran.ge_levels, lesson=None,
    intro="Sepuluh game berbeda dari materi EMC: harta karun koordinat, eksperimen peluang, bingo belanja, diagram, penyihir hitung, tumpuk angka, tebak angka, teka-teki silang, sortir peluang, dan kartu pasangan.",
    tips=["Tidak ada batas waktu: pikirkan dulu, lalu ketuk.", "Keliru sekali masih boleh mencoba lagi."],
)

# Kisi-kisi EMC 2022 Penyisihan Kelas 4: nomor → (materi, level, tingkat, bentuk).
_SLOTS = [
    (1, "EC", 1, "easy", "choice"), (2, "EF", 1, "easy", "choice"), (3, "EA", 1, "easy", "choice"),
    (4, "EE", 2, "easy", "choice"), (5, "EC", 2, "easy", "choice"), (6, "EA", 2, "easy", "choice"),
    (7, "ED", 1, "easy", "choice"), (8, "EB", 1, "easy", "choice"), (9, "EH", 5, "hard", "choice"),
    (10, "EE", 4, "medium", "choice"), (11, "EE", 6, "hard", "choice"), (12, "EB", 8, "hard", "choice"),
    (13, "EB", 4, "medium", "choice"), (14, "EG", 2, "medium", "choice"), (15, "EC", 4, "hard", "choice"),
    (16, "EG", 4, "medium", "choice"), (17, "EB", 3, "medium", "choice"), (18, "EA", 3, "medium", "choice"),
    (19, "EF", 6, "hard", "choice"), (20, "EA", 4, "medium", "choice"), (21, "EF", 5, "medium", "choice"),
    (22, "EC", 5, "hard", "choice"), (23, "ED", 4, "medium", "choice"), (24, "EA", 6, "hard", "choice"),
    (25, "EA", 8, "hard", "choice"), (26, "EG", 7, "hard", "choice"), (27, "EC", 3, "medium", "choice"),
    (28, "EB", 2, "easy", "choice"), (29, "ED", 3, "easy", "choice"), (30, "EB", 7, "hard", "choice"),
    (31, "EE", 7, "hard", "input"), (32, "EB", 6, "hard", "input"), (33, "EH", 8, "hard", "input"),
    (34, "ED", 7, "hard", "input"), (35, "ED", 6, "hard", "input"), (36, "EB", 5, "hard", "input"),
    (37, "EA", 7, "hard", "input"), (38, "EA", 5, "hard", "input"), (39, "EC", 6, "hard", "input"),
    (40, "EC", 7, "hard", "input"),
]


def _slots():
    by_code = {t["code"]: t["levels"]() for t in TOPICS}
    out = []
    for no, code, lv, diff, form in _SLOTS:
        level = by_code[code][lv - 1]
        assert level["emc"] == str(no), (no, code, lv, level["emc"])
        fam, params = level["content"]
        parts = params["parts"] if fam == "mix" else [{"family": fam, "params": params}]
        is_input = [p["family"] == "expr" and p["params"].get("mode") == "input" for p in parts]
        assert all(is_input) if form == "input" else not any(is_input), (no, form)
        out.append({"category": code, "levels": [lv, lv], "difficulty": diff, "form": form,
                    "topic": f"No. {no}: {level['indikator']}"[:80]})
    return out


MOCK_SLOTS = _slots()
