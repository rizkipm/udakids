"""EG Kombinatorika & Penalaran, EH Kecepatan & Kerja, GE Game seru EMC (kisi-kisi EMC Kelas 3–4, D-101)."""

from __future__ import annotations

import random
from fractions import Fraction as Fr
from itertools import combinations
from math import comb

from core import NAMES, as_choice, expr, fig, game, harder, item, manual, mc, mix, part_of, poly, seg

HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
NAMA1 = ["Ayu", "Bima", "Citra", "Dimas", "Eka", "Fajar"]
NAMA2 = ["Gita", "Hasan", "Intan", "Joko", "Kirana", "Lukman"]


# ------------------------------------------------------------------ penghitung segitiga (brute force)


def _inter(p1, p2, p3, p4):
    """Titik potong ruas p1p2 dan p3p4 (termasuk ujung), atau None."""
    (x1, y1), (x2, y2), (x3, y3), (x4, y4) = p1, p2, p3, p4
    d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if d == 0:
        return None
    t = Fr((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4), d)
    u = Fr((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2), d)
    if 0 <= t <= 1 and 0 <= u <= 1:
        return (x1 + t * (x2 - x1), y1 + t * (y2 - y1))
    return None


def count_triangles(segs) -> int:
    """Banyak segitiga yang sisi-sisinya terletak pada ruas-ruas gambar."""
    segs = [((Fr(a[0]), Fr(a[1])), (Fr(b[0]), Fr(b[1]))) for a, b in segs]
    on = [set([a, b]) for a, b in segs]
    for i, j in combinations(range(len(segs)), 2):
        p = _inter(*segs[i], *segs[j])
        if p is not None:
            on[i].add(p)
            on[j].add(p)
    pts = set().union(*on)
    linked = lambda p, q: any(p in s and q in s for s in on)
    count = 0
    for p, q, r in combinations(pts, 3):
        if (q[0] - p[0]) * (r[1] - p[1]) == (q[1] - p[1]) * (r[0] - p[0]):
            continue
        if linked(p, q) and linked(q, r) and linked(p, r):
            count += 1
    return count


def cevian_figure(m: int, bands: int):
    A, B, C = (4, 9), (0, 0), (12, 0)
    segs = [(A, B), (A, C), (B, C)]
    for i in range(1, m + 1):
        segs.append((A, (Fr(12 * i, m + 1), 0)))
    for k in range(1, bands + 1):
        y = Fr(9 * k, bands + 1)
        # Titik pada AB dan AC setinggi y (garis sejajar alas, ujungnya tepat di sisi segitiga).
        segs.append(((4 * y / 9, y), (12 - 8 * y / 9, y)))
    return segs


def to_fig(segs):
    f = lambda p: [float(p[0]), float(p[1])]
    return fig([{"t": "seg", "a": f(a), "b": f(b)} for a, b in segs])


# =============================================================== EG


def eg_levels():
    rng = random.Random("EG")
    L = []

    # EG1 — prinsip pagar satu baris (mudah).
    pg = {"vars": {"d": [2, 10], "n": [3, 20]}, "derived": {"lj": "d * n"}}
    L.append(dict(
        slug="prinsip-pagar-satu-baris", title="Prinsip pagar satu baris",
        kognitif="applying", indikator="Menghitung banyak tiang/pohon pada garis dan lingkaran", emc="",
        content=mix(
            expr("Di sepanjang sisi jalan yang panjangnya {lj} m ditanam pohon setiap {d} m, termasuk di kedua ujung jalan. Banyak pohon adalah …",
                 "Ada {lj} : {d} = {n} jarak antarpohon. Pada garis lurus, banyak pohon = banyak jarak + 1 = {answer}.",
                 **pg, answer="n + 1", distractors=[("n", "lupa-tambah-1"), ("n + 2", "tambah-2"), ("n - 1", "kurang-1")]),
            expr("Di sekeliling kolam bundar yang kelilingnya {lj} m dipasang lampu setiap {d} m. Banyak lampu adalah …",
                 "Pada lingkaran, lampu pertama sekaligus menjadi lampu terakhir, jadi banyak lampu = banyak jarak = {lj} : {d} = {answer}.",
                 **pg, answer="n", distractors=[("n + 1", "seperti-garis"), ("n - 1", "kurang-1"), ("2 * n", "dua-kali")]),
            expr("Di kedua sisi jalan yang panjangnya {lj} m dipasang bendera setiap {d} m, termasuk di ujung-ujung jalan. Banyak bendera adalah …",
                 "Satu sisi: {lj} : {d} + 1 = {=n+1} bendera. Dua sisi: 2 × {=n+1} = {answer}.",
                 **pg, answer="2 * (n + 1)", distractors=[("2 * n", "lupa-tambah-1"), ("n + 1", "satu-sisi"), ("2 * n + 1", "tambah-sekali")]),
        )))

    # EG2 — titik pada barisan berbentuk persegi panjang (EMC no. 14, sedang).
    L.append(dict(
        slug="barisan-berbentuk-persegi-panjang", title="Barisan berbentuk persegi panjang",
        kognitif="analyzing", indikator="Menghitung banyak titik pada grid berjarak sama", emc="14",
        content=mix(
            expr("Siswa berbaris membentuk persegi panjang untuk upacara. Jarak setiap siswa dengan siswa di depan, belakang, kanan, dan kirinya 1 m. Panjang barisan {p} m dan lebarnya {q} m, dan semua tempat terisi. Banyak siswa adalah …",
                 "Sepanjang {p} m ada {p} jarak, jadi {=p+1} siswa per baris. Sepanjang {q} m ada {=q+1} baris. Banyak siswa = {=p+1} × {=q+1} = {answer}.",
                 vars={"p": [3, 12], "q": [2, 9]}, constraint="p != q", answer="(p + 1) * (q + 1)",
                 distractors=[("p * q", "lupa-tambah-1"), ("(p + 1) * q", "satu-sisi"), ("2 * (p + q)", "keliling")]),
            expr("Pak {nama} menanam bibit cabai di kebun persegi panjang berukuran {p} m × {q} m. Bibit ditanam setiap 2 m ke samping dan ke belakang, termasuk di tepi kebun. Banyak bibit adalah …",
                 "Sepanjang {p} m ada {=p/2} jarak 2 m, jadi {=p/2+1} bibit per baris. Sepanjang {q} m ada {=q/2+1} baris. Banyak bibit = {=p/2+1} × {=q/2+1} = {answer}.",
                 vars={"a": [2, 8], "b": [2, 6]}, derived={"p": "2 * a", "q": "2 * b"}, constraint="a != b",
                 words={"nama": NAMES}, answer="(a + 1) * (b + 1)",
                 distractors=[("a * b", "lupa-tambah-1"), ("(p + 1) * (q + 1)", "jarak-1-m"), ("p * q / 2", "luas-dibagi")]),
        )))

    # EG3 — jabat tangan & pertandingan (sedang).
    L.append(dict(
        slug="jabat-tangan-dan-pertandingan", title="Jabat tangan dan pertandingan",
        kognitif="applying", indikator="Menghitung banyak pasangan dari n objek", emc="",
        content=mix(
            expr("Dalam sebuah pertemuan ada {n} anak. Setiap anak berjabat tangan tepat satu kali dengan setiap anak lainnya. Banyak jabat tangan adalah …",
                 "Setiap anak berjabat tangan dengan {=n-1} anak lain: {n} × {=n-1} = {=n*(n-1)}, tetapi setiap jabat tangan terhitung dua kali. Jadi {=n*(n-1)} : 2 = {answer}.",
                 vars={"n": [4, 25]}, answer="n * (n - 1) / 2",
                 distractors=[("n * (n - 1)", "terhitung-dua-kali"), ("n * n / 2", "setengah-kuadrat"), ("n - 1", "satu-anak")]),
            expr("Dalam turnamen catur, setiap pemain bertanding tepat satu kali melawan setiap pemain lain. Seluruhnya ada {t} pertandingan. Banyak pemain adalah …",
                 "Banyak pertandingan = n × (n − 1) : 2. Cari n: {n} × {=n-1} : 2 = {t}. Jadi ada {answer} pemain.",
                 vars={"n": [4, 16]}, derived={"t": "n * (n - 1) / 2"}, answer="n",
                 distractors=[("t / 2", "dibagi-dua"), ("n + 1", "lebih-satu"), ("n - 1", "kurang-satu")]),
        )))

    # EG4 — nilai maksimum dengan syarat minimal (EMC no. 16, sedang).
    L.append(dict(
        slug="nilai-paling-banyak-dengan-syarat", title="Nilai paling banyak dengan syarat",
        kognitif="analyzing", indikator="Menentukan nilai maksimum/minimum dengan syarat tiap kategori", emc="16",
        content=mix(
            expr("{nama} punya {n} buku tulis bersampul merah, biru, dan hijau. Setiap warna ada paling sedikit {mn} buku. Buku bersampul hijau paling banyak ada … buku.",
                 "Agar hijau sebanyak mungkin, warna lain dibuat sesedikit mungkin: merah {mn} dan biru {mn}. Hijau = {n} − 2 × {mn} = {answer}.",
                 vars={"n": [7, 20], "mn": [1, 3]}, words={"nama": NAMES}, constraint="n - 2 * mn > mn",
                 answer="n - 2 * mn", distractors=[("n - mn", "satu-warna"), ("n / 3", "dibagi-rata"), ("n - 3 * mn", "tiga-warna")]),
            expr("Sebuah kotak berisi {n} bola berwarna merah, kuning, biru, dan hijau. Setiap warna ada paling sedikit {mn} bola. Bola merah paling banyak ada … bola.",
                 "Warna lain dibuat sesedikit mungkin: 3 warna × {mn} = {=3*mn}. Merah = {n} − {=3*mn} = {answer}.",
                 vars={"n": [10, 30], "mn": [1, 4]}, constraint="n - 3 * mn > mn",
                 answer="n - 3 * mn", distractors=[("n - mn", "satu-warna"), ("n / 4", "dibagi-rata"), ("n - 4 * mn", "empat-warna")]),
            expr("Di rak ada {n} toples kue nastar, kastengel, dan putri salju. Setiap jenis ada paling banyak {mx} toples. Toples nastar paling sedikit ada … toples.",
                 "Agar nastar sesedikit mungkin, dua jenis lain dibuat sebanyak mungkin: 2 × {mx} = {=2*mx}. Nastar = {n} − {=2*mx} = {answer}.",
                 vars={"n": [10, 27], "mx": [4, 12]}, constraint="n - 2 * mx >= 1 && n - 2 * mx <= mx",
                 answer="n - 2 * mx", distractors=[("n - mx", "satu-jenis"), ("n / 3", "dibagi-rata"), ("mx", "batas")]),
        )))

    # EG5 — prinsip sarang merpati (sedang).
    pm = {"vars": {"a": [2, 9], "b": [2, 9], "c": [2, 9]}}
    L.append(dict(
        slug="ambil-paling-sedikit-agar-pasti", title="Ambil paling sedikit agar pasti",
        kognitif="analyzing", indikator="Menentukan banyak pengambilan agar suatu kejadian pasti terjadi", emc="",
        content=mix(
            expr("Dalam laci gelap ada {a} kaus kaki merah, {b} biru, dan {c} hijau. Paling sedikit berapa kaus kaki yang harus diambil agar pasti mendapat 2 kaus kaki merah?",
                 "Kemungkinan terburuk: semua biru dan hijau terambil dulu ({=b+c}), lalu 2 merah. Jadi {=b+c} + 2 = {answer}.",
                 **pm, answer="b + c + 2", distractors=[("2", "dua-saja"), ("4", "sepasang-sewarna"), ("a + 2", "salah-warna")]),
            expr("Dalam laci gelap ada {a} kaus kaki merah, {b} biru, dan {c} hijau. Paling sedikit berapa kaus kaki yang harus diambil agar pasti mendapat sepasang kaus kaki yang warnanya sama?",
                 "Ada 3 warna. Kemungkinan terburuk: 3 kaus kaki pertama berbeda warna semua. Kaus kaki ke-4 pasti sewarna dengan salah satunya. Jadi 4.",
                 **pm, answer="4", distractors=[("2", "dua-saja"), ("3", "tiga-warna"), ("a + b + c", "semua")]),
            expr("Dalam kotak ada {a} bola merah, {b} biru, dan {c} hijau. Paling sedikit berapa bola yang harus diambil tanpa melihat agar pasti mendapat ketiga warna?",
                 "Kemungkinan terburuk: semua bola dari dua warna terbanyak terambil dulu ({=a+b+c-min(a,min(b,c))}), lalu satu bola warna ketiga. Jadi {answer}.",
                 **pm, answer="a + b + c - min(a, min(b, c)) + 1",
                 distractors=[("3", "tiga-saja"), ("a + b + c", "semua"), ("max(a, max(b, c)) + 2", "satu-warna-terbanyak")]),
        )))

    # EG6 — aturan perkalian (sedang).
    L.append(dict(
        slug="banyak-cara-aturan-perkalian", title="Banyak cara dengan aturan perkalian",
        kognitif="applying", indikator="Menghitung banyak susunan dengan aturan perkalian", emc="",
        content=mix(
            expr("{nama} punya {a} kaus, {b} celana, dan {c} topi. Banyak pasangan pakaian (1 kaus, 1 celana, 1 topi) yang berbeda adalah …",
                 "Untuk setiap kaus ada {b} pilihan celana dan {c} pilihan topi: {a} × {b} × {c} = {answer}.",
                 vars={"a": [2, 6], "b": [2, 5], "c": [2, 4]}, words={"nama": NAMES}, answer="a * b * c",
                 distractors=[("a + b + c", "dijumlah"), ("a * b + c", "campur"), ("a * b", "lupa-topi")]),
            expr("Kode gembok terdiri atas 3 angka. Setiap angka boleh dipilih dari 1 sampai {n} dan boleh berulang. Banyak kode yang mungkin adalah …",
                 "Setiap tempat punya {n} pilihan: {n} × {n} × {n} = {answer}.",
                 vars={"n": [3, 9]}, answer="n * n * n", distractors=[("3 * n", "tiga-kali-n"), ("n * (n - 1) * (n - 2)", "tak-berulang"), ("n * n", "dua-tempat")]),
            expr("Dari angka 1 sampai {n} akan dibuat bilangan dua angka dengan angka yang berbeda. Banyak bilangan yang dapat dibuat adalah …",
                 "Angka puluhan: {n} pilihan. Angka satuan harus berbeda: {=n-1} pilihan. Jadi {n} × {=n-1} = {answer}.",
                 vars={"n": [3, 9]}, answer="n * (n - 1)", distractors=[("n * n", "boleh-berulang"), ("n * (n - 1) / 2", "dibagi-dua"), ("2 * n", "dua-kali-n")]),
        )))

    # EG7 — menghitung banyak segitiga pada gambar (EMC no. 26, sulit). Bank soal, dihitung brute force.
    items = []
    for m in range(1, 6):
        for bands in range(0, 3):
            segs = cevian_figure(m, bands)
            n = count_triangles(segs)
            assert n == (bands + 1) * comb(m + 2, 2), (m, bands, n)
            per = comb(m + 2, 2)
            why = (f"Pada satu lapis, pilih 2 dari {m + 2} garis yang keluar dari puncak: ada {per} segitiga."
                   + (f" Ada {bands + 1} garis alas (alas besar dan {bands} garis mendatar), jadi {bands + 1} × {per} = {n}." if bands else ""))
            items.append(item("Hitunglah semua segitiga yang terbentuk oleh garis-garis pada gambar, yang kecil maupun yang besar.",
                              mc(n, [per + m, n - m - 1, 2 * (m + 1) * (bands + 1), n + bands + 1]), why,
                              stimulus=[to_fig(segs)]))
    extra = {
        "persegi panjang dengan kedua diagonalnya": [((0, 0), (8, 0)), ((8, 0), (8, 6)), ((8, 6), (0, 6)), ((0, 6), (0, 0)), ((0, 0), (8, 6)), ((8, 0), (0, 6))],
        "persegi dengan kedua diagonal dan garis tengah tegak": [((0, 0), (6, 0)), ((6, 0), (6, 6)), ((6, 6), (0, 6)), ((0, 6), (0, 0)), ((0, 0), (6, 6)), ((6, 0), (0, 6)), ((3, 0), (3, 6))],
        "persegi dengan kedua diagonal dan dua garis tengah": [((0, 0), (6, 0)), ((6, 0), (6, 6)), ((6, 6), (0, 6)), ((0, 6), (0, 0)), ((0, 0), (6, 6)), ((6, 0), (0, 6)), ((3, 0), (3, 6)), ((0, 3), (6, 3))],
        "segitiga dengan garis dari setiap titik sudut ke tengah sisi di depannya": [((0, 0), (8, 0)), ((8, 0), (4, 7)), ((4, 7), (0, 0)), ((0, 0), (6, 3.5)), ((8, 0), (2, 3.5)), ((4, 7), (4, 0))],
        "segitiga dengan garis-garis yang menghubungkan titik tengah sisinya": [((0, 0), (8, 0)), ((8, 0), (4, 8)), ((4, 8), (0, 0)), ((2, 4), (6, 4)), ((6, 4), (4, 0)), ((4, 0), (2, 4))],
    }
    for name, segs in extra.items():
        n = count_triangles(segs)
        items.append(item("Hitunglah semua segitiga yang terbentuk oleh garis-garis pada gambar, yang kecil maupun yang besar.",
                          mc(n, [n - 2, n + 2, n // 2]),
                          f"Hitung dengan teratur: segitiga terkecil dulu, lalu gabungan 2 bagian, 3 bagian, dan seterusnya. Gambar {name} memuat {n} segitiga.",
                          stimulus=[to_fig(segs)]))
    rng.shuffle(items)
    L.append(dict(slug="menghitung-banyak-segitiga", title="Menghitung banyak segitiga", kognitif="analyzing",
                  indikator="Menghitung banyak bangun (segitiga) pada gambar secara sistematis", emc="26",
                  content=manual(items)))

    # EG8 — persegi & persegi panjang pada petak (sulit). Bank soal.
    items = []
    for m in range(2, 6):
        for n in range(m, 6):
            g = [poly([(0, 0), (m, 0), (m, n), (0, n)])]
            g += [seg((x, 0), (x, n)) for x in range(1, m)] + [seg((0, y), (m, y)) for y in range(1, n)]
            squares = sum((m - k + 1) * (n - k + 1) for k in range(1, min(m, n) + 1))
            rects = comb(m + 1, 2) * comb(n + 1, 2)
            items.append(item(
                f"Gambar menunjukkan papan berpetak {m} × {n}. Ada berapa banyak persegi (semua ukuran) pada gambar?",
                mc(squares, [m * n, squares + 1, rects]),
                "Hitung per ukuran: " + " + ".join(f"{(m - k + 1) * (n - k + 1)} (ukuran {k}×{k})" for k in range(1, min(m, n) + 1)) + f" = {squares}.",
                stimulus=[fig(g)]))
            items.append(item(
                f"Gambar menunjukkan papan berpetak {m} × {n}. Ada berapa banyak persegi panjang (termasuk persegi) pada gambar?",
                mc(rects, [m * n, squares, rects - m * n]),
                f"Pilih 2 dari {m + 1} garis tegak ({comb(m + 1, 2)} cara) dan 2 dari {n + 1} garis mendatar ({comb(n + 1, 2)} cara): {comb(m + 1, 2)} × {comb(n + 1, 2)} = {rects}.",
                stimulus=[fig(g)]))
    L.append(dict(slug="persegi-dan-persegi-panjang-pada-petak", title="Persegi dan persegi panjang pada petak",
                  kognitif="analyzing", indikator="Menghitung banyak persegi/persegi panjang pada papan berpetak", emc="",
                  content=manual(items)))

    # EG9 — teka-teki penalaran gaya EMC (bank soal).
    items = []
    for k, h in enumerate(HARI):
        ans = HARI[(k - 3) % 7]
        items.append(item(
            f"Jika lusa adalah hari {h}, maka kemarin adalah hari …",
            [{"visual": {"kind": "text", "text": d}} for d in [ans, HARI[(k - 2) % 7], HARI[(k - 1) % 7], HARI[(k + 1) % 7]]],
            f"Lusa = 2 hari lagi, jadi hari ini {HARI[(k - 2) % 7]}. Kemarin = 1 hari sebelum hari ini: {ans}."))
    for n in [45, 99, 120, 150, 210, 256, 300]:
        digits = sum(len(str(i)) for i in range(1, n + 1))
        items.append(item(
            f"Halaman sebuah buku diberi nomor 1 sampai {n}. Banyak angka yang ditulis untuk menomori semua halaman adalah …",
            mc(digits, [n, 2 * n, digits - 9]),
            f"Halaman 1–9: 9 angka. " + (f"Halaman 10–{min(n, 99)}: {2 * (min(n, 99) - 9)} angka. " if n >= 10 else "") + (f"Halaman 100–{n}: {3 * (n - 99)} angka. " if n >= 100 else "") + f"Jumlah {digits}."))
    for d, n in [(1, 50), (7, 100), (2, 60), (5, 99), (3, 40), (9, 100)]:
        cnt = sum(str(i).count(str(d)) for i in range(1, n + 1))
        items.append(item(
            f"Semua bilangan dari 1 sampai {n} ditulis berurutan. Angka {d} ditulis sebanyak … kali.",
            mc(cnt, [cnt - 1, cnt + 1, n // 10]),
            f"Hitung di tempat satuan dan di tempat puluhan secara terpisah, lalu jumlahkan: {cnt} kali."))
    for p, q in [(5, 8), (7, 4), (10, 12), (3, 9), (12, 6), (8, 8)]:
        items.append(item(
            f"Anak-anak berbaris lurus. {NAMES[p]} berada di urutan ke-{p} dari depan dan ke-{q} dari belakang. Banyak anak di barisan itu adalah …",
            mc(p + q - 1, [p + q, p + q + 1, max(p, q)]),
            f"{NAMES[p]} terhitung dua kali (dari depan dan dari belakang), jadi {p} + {q} − 1 = {p + q - 1} anak."))
    rng.shuffle(items)
    L.append(dict(slug="teka-teki-gaya-emc", title="Teka-teki gaya EMC", kognitif="reasoning",
                  indikator="Teka-teki penalaran campuran gaya EMC", emc="", content=manual(items)))

    # EG10 — tantangan campuran.
    L.append(dict(slug="tantangan-kombinatorika-dan-penalaran", title="Tantangan kombinatorika dan penalaran",
                  kognitif="reasoning", indikator="Gabungan semua indikator kombinatorika & penalaran", emc="",
                  content=mix(part_of(L[1]["content"], 0), part_of(L[2]["content"], 0), part_of(L[3]["content"], 1),
                              part_of(L[4]["content"], 2), part_of(L[5]["content"], 2))))

    # EG11 — game Tebak Angka Momo (strategi bagi dua).
    L.append(dict(slug="game-tebak-angka-strategi", title="Game tebak angka strategi", kognitif="reasoning",
                  indikator="Game: menebak bilangan dengan strategi membagi dua rentang", emc="",
                  content=mix(("guess-game", {"range": [1, 100], "hint": "number"}),
                              ("guess-game", {"range": [1, 500], "hint": "number"}),
                              ("guess-game", {"range": [100, 999], "hint": "digit"}))))
    return L


# =============================================================== EH


def eh_levels():
    rng = random.Random("EH")
    L = []

    # EH1 — jarak = kecepatan × waktu (mudah).
    L.append(dict(
        slug="jarak-kecepatan-dan-waktu", title="Jarak, kecepatan, dan waktu",
        kognitif="applying", indikator="Menghitung jarak dari kecepatan dan waktu", emc="",
        content=mix(
            expr("Sebuah bus melaju dengan kecepatan tetap {v} km/jam selama {t} jam. Jarak yang ditempuh bus adalah … km.",
                 "Jarak = kecepatan × waktu = {v} × {t} = {answer} km.",
                 vars={"v": [30, 90], "t": [2, 6]}, answer="v * t", unit="km",
                 distractors=[("v + t", "dijumlah"), ("v * (t - 1)", "kurang-satu-jam"), ("v * t / 2", "dibagi-dua")]),
            expr("{nama} bersepeda dengan kecepatan {v} m/menit selama {t} menit. Jarak yang ditempuh {nama} adalah … m.",
                 "Jarak = kecepatan × waktu = {v} × {t} = {answer} m.",
                 vars={"v": [80, 250], "t": [5, 30]}, words={"nama": NAMES}, answer="v * t", unit="m",
                 distractors=[("v + t", "dijumlah"), ("v * t / 60", "salah-satuan"), ("v * (t + 1)", "lebih-satu")]),
        )))

    # EH2 — waktu tempuh (mudah).
    L.append(dict(
        slug="waktu-tempuh", title="Waktu tempuh",
        kognitif="applying", indikator="Menghitung waktu tempuh dari jarak dan kecepatan", emc="",
        content=expr(
            "Jarak rumah Nenek {d} km. Ayah mengendarai mobil dengan kecepatan tetap {v} km/jam. Lama perjalanan Ayah adalah … menit.",
            "Waktu = jarak : kecepatan = {d} : {v} jam. Dalam menit: {d} × 60 : {v} = {answer} menit.",
            vars={"v": {"values": [30, 40, 48, 60, 72, 80]}, "t": {"values": [30, 45, 75, 90, 105, 120, 150]}},
            derived={"d": "v * t / 60"}, constraint="(v * t) % 60 == 0",
            answer="t", unit="menit", distractors=[("d * v / 60", "dikali"), ("t + 15", "lain"), ("t - 15", "lain-2")]),
    ))

    # EH3 — mengubah satuan kecepatan (sedang).
    L.append(dict(
        slug="mengubah-satuan-kecepatan", title="Mengubah satuan kecepatan",
        kognitif="applying", indikator="Mengubah km/jam menjadi m/menit dan sebaliknya", emc="",
        content=mix(
            expr("Kecepatan {v} km/jam sama dengan … m/menit.",
                 "{v} km = {=v*1000} m dan 1 jam = 60 menit. Jadi {=v*1000} : 60 = {answer} m/menit.",
                 vars={"v": {"values": [6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 72, 90]}}, answer="v * 50 / 3", unit="m/menit",
                 distractors=[("v * 1000", "lupa-dibagi-60"), ("v * 60", "dikali-60"), ("v * 100 / 6", "salah-nol")]),
            expr("Kecepatan {w} m/menit sama dengan … km/jam.",
                 "Dalam 1 jam (60 menit): {w} × 60 = {=w*60} m = {answer} km. Jadi {answer} km/jam.",
                 vars={"v": {"values": [6, 12, 18, 24, 30, 36, 48, 60]}}, derived={"w": "v * 50 / 3"}, answer="v", unit="km/jam",
                 distractors=[("w * 60", "lupa-dibagi-1000"), ("w / 60", "dibagi-60"), ("v * 10", "salah-nol")]),
        )))

    # EH4 — waktu berpapasan (sedang).
    L.append(dict(
        slug="waktu-berpapasan", title="Waktu berpapasan",
        kognitif="applying", indikator="Menentukan waktu berpapasan dua benda yang saling mendekat", emc="",
        content=expr(
            "Kota P dan kota Q berjarak {d} km. {n1} naik motor dari P ke Q dengan kecepatan {v1} km/jam. Pada saat yang sama {n2} naik mobil dari Q ke P dengan kecepatan {v2} km/jam. Mereka berpapasan setelah … jam.",
            "Saling mendekat berarti jarak berkurang {v1} + {v2} = {=v1+v2} km setiap jam. Waktu = {d} : {=v1+v2} = {answer} jam.",
            vars={"v1": [30, 70], "v2": [20, 60], "t": [1, 4]}, words={"n1": NAMA1, "n2": NAMA2},
            derived={"d": "(v1 + v2) * t"}, constraint="v1 != v2", answer="t", unit="jam",
            distractors=[("d / v1", "satu-kendaraan"), ("t + 1", "lebih-satu"), ("2 * t", "dua-kali")]),
    ))

    # EH5 — jarak benda lambat saat berpapasan (EMC no. 9, sulit).
    bp = {"vars": {"k": [2, 5], "u": [1, 12]}, "words": {"n1": NAMA1, "n2": NAMA2}, "derived": {"d": "(k + 1) * u"}}
    L.append(dict(
        slug="jarak-saat-berpapasan", title="Jarak saat berpapasan",
        kognitif="analyzing", indikator="Menentukan jarak tempuh benda saat berpapasan dari perbandingan kecepatan", emc="9",
        content=mix(
            expr("{n1} dan {n2} bersepeda saling mendekat dari dua tempat yang berjarak {d} km. Kecepatan {n1} {k} kali kecepatan {n2}. Saat berpapasan, {n2} sudah bersepeda sejauh … km.",
                 "Dalam waktu yang sama, jarak sebanding dengan kecepatan: {n1} : {n2} = {k} : 1. Jarak {d} km dibagi {=k+1} bagian, {n2} menempuh 1 bagian = {answer} km.",
                 **bp, answer="u", unit="km", distractors=[("d / 2", "dibagi-dua"), ("k * u", "tertukar"), ("d / k", "dibagi-k")]),
            expr("{n1} dan {n2} berlari saling mendekat dari dua ujung lintasan yang panjangnya {=d*100} m. Kecepatan {n1} {k} kali kecepatan {n2}. Saat berpapasan, {n1} sudah berlari sejauh … m.",
                 "Perbandingan jarak = perbandingan kecepatan = {k} : 1. Lintasan dibagi {=k+1} bagian, satu bagian {=u*100} m. {n1} menempuh {k} bagian = {answer} m.",
                 **bp, answer="k * u * 100", unit="m", distractors=[("u * 100", "tertukar"), ("d * 50", "dibagi-dua"), ("d * 100 / k", "dibagi-k")]),
        )))

    # EH6 — debit (sedang).
    L.append(dict(
        slug="debit-dan-waktu-mengisi", title="Debit dan waktu mengisi",
        kognitif="applying", indikator="Menghitung volume, debit, atau waktu mengisi", emc="",
        content=mix(
            expr("Sebuah keran mengalirkan air {q} liter setiap menit. Untuk mengisi penuh bak berisi {vol} liter diperlukan waktu … menit.",
                 "Waktu = volume : debit = {vol} : {q} = {answer} menit.",
                 vars={"q": [2, 20], "t": [5, 30]}, derived={"vol": "q * t"}, answer="t", unit="menit",
                 distractors=[("vol * q", "dikali"), ("vol - q", "dikurangi"), ("t + 5", "lain")]),
            expr("Sebuah pompa mengisi kolam {vol} liter dalam {t} menit. Debit pompa itu adalah … liter/menit.",
                 "Debit = volume : waktu = {vol} : {t} = {answer} liter/menit.",
                 vars={"q": [3, 25], "t": [5, 40]}, derived={"vol": "q * t"}, answer="q", unit="liter/menit",
                 distractors=[("vol * t", "dikali"), ("vol - t", "dikurangi"), ("q + 2", "lain")]),
        )))

    # EH7 — kerja bersama (sedang).
    L.append(dict(
        slug="kerja-bersama", title="Kerja bersama",
        kognitif="applying", indikator="Menentukan waktu kerja bersama dari waktu kerja masing-masing", emc="",
        content=expr(
            "Keran A dapat mengisi penuh sebuah kolam dalam {a} jam, sedangkan keran B dalam {b} jam. Jika kedua keran dibuka bersamaan, kolam penuh dalam … menit.",
            "Dalam 1 jam, A mengisi 1/{a} kolam dan B mengisi 1/{b} kolam, bersama {=a+b}/{=a*b} kolam. Waktu = {=a*b}/{=a+b} jam = {=a*b} × 60 : {=a+b} = {answer} menit.",
            vars={"a": [2, 12], "b": [2, 12]}, constraint="a < b && (a * b * 60) % (a + b) == 0",
            answer="a * b * 60 / (a + b)", unit="menit",
            distractors=[("(a + b) * 30", "rata-rata-waktu"), ("(a + b) * 60", "dijumlah"), ("(b - a) * 60", "dikurangi")]),
    ))

    # EH8 — waktu kerja sendiri dari waktu kerja bersama (EMC no. 33, sulit, isian).
    L.append(dict(
        slug="waktu-kerja-sendiri", title="Waktu kerja sendiri",
        kognitif="analyzing", indikator="Menentukan waktu kerja sendiri dari waktu kerja bersama", emc="33",
        content=expr(
            "{n1} dan {n2} bersama-sama dapat menyelesaikan sebuah mozaik dalam {t} jam. Jika {n1} bekerja sendiri, mozaik itu selesai dalam {a} jam. Jika {n2} bekerja sendiri, mozaik itu selesai dalam … jam.",
            "Bersama: 1/{t} mozaik per jam. {n1}: 1/{a} mozaik per jam. {n2} = 1/{t} − 1/{a} = 1/{answer} mozaik per jam, jadi {n2} butuh {answer} jam.",
            # 1/t = 1/a + 1/b  ⇔  (a − t)(b − t) = t²: pilih t dan pembagi x dari t².
            vars={"t": [2, 12], "x": [1, 36]}, words={"n1": NAMA1, "n2": NAMA2},
            derived={"a": "t + x", "b": "t + t * t / x"}, constraint="(t * t) % x == 0 && x != t && b <= 72",
            answer="b", unit="jam", mode="input"),
    ))

    # EH9 — teka-teki gerak & kerja gaya EMC (bank soal).
    items = []
    for v1, v2, t in [(40, 60, 1), (30, 50, 2), (45, 60, 1), (20, 30, 2), (50, 75, 1), (36, 48, 2)]:
        lead = v1 * t
        catch = Fr(lead, v2 - v1)
        if catch.denominator != 1:
            continue
        items.append(item(
            f"Dino berangkat naik sepeda motor dengan kecepatan {v1} km/jam. {t} jam kemudian, Kakak menyusul dari tempat yang sama dengan kecepatan {v2} km/jam. Kakak menyusul Dino setelah berkendara … jam.",
            mc(int(catch), [int(catch) + t, t, int(catch) - 1 if catch > 1 else int(catch) + 2]),
            f"Saat Kakak berangkat, Dino sudah {v1} × {t} = {lead} km di depan. Setiap jam jaraknya berkurang {v2} − {v1} = {v2 - v1} km. Waktu = {lead} : {v2 - v1} = {int(catch)} jam."))
    for lk, lt, v in [(100, 200, 15), (150, 450, 20), (120, 280, 10), (200, 400, 25), (80, 320, 20), (160, 440, 30)]:
        tt = Fr(lk + lt, v)
        if tt.denominator != 1:
            continue
        items.append(item(
            f"Kereta sepanjang {lk} m melaju dengan kecepatan {v} m/detik melewati terowongan sepanjang {lt} m. Waktu sejak kepala kereta masuk sampai ekor kereta keluar terowongan adalah … detik.",
            mc(int(tt), [lt // v, (lt - lk) // v, int(tt) + 5]),
            f"Kereta harus menempuh panjang terowongan + panjang kereta = {lt} + {lk} = {lk + lt} m. Waktu = {lk + lt} : {v} = {int(tt)} detik."))
    for n, d, n2 in [(6, 10, 4), (8, 9, 6), (5, 12, 10), (4, 15, 6), (10, 6, 12), (9, 8, 6)]:
        days = Fr(n * d, n2)
        if days.denominator != 1:
            continue
        items.append(item(
            f"{n} tukang dapat membangun pagar dalam {d} hari. Jika dikerjakan {n2} tukang yang sama cepatnya, pagar selesai dalam … hari.",
            mc(int(days), [d * n2 // n if (d * n2) % n == 0 else d + 1, d, n * d]),
            f"Pekerjaan = {n} × {d} = {n * d} hari-orang. Dengan {n2} tukang: {n * d} : {n2} = {int(days)} hari. Lebih banyak tukang, lebih cepat selesai."))
    for v1, v2 in [(60, 40), (30, 20), (60, 30), (40, 60), (12, 6), (90, 60)]:
        avg = Fr(2 * v1 * v2, v1 + v2)
        if avg.denominator != 1:
            continue
        items.append(item(
            f"Ayah pergi ke kota dengan kecepatan {v1} km/jam dan pulang melalui jalan yang sama dengan kecepatan {v2} km/jam. Kecepatan rata-rata pergi-pulang adalah … km/jam.",
            mc(int(avg), [(v1 + v2) // 2, max(v1, v2), int(avg) + 2]),
            f"Misalkan jaraknya {v1 * v2} km (kelipatan {v1} dan {v2}). Pergi {v2} jam, pulang {v1} jam, total {v1 + v2} jam untuk {2 * v1 * v2} km. Rata-rata = {2 * v1 * v2} : {v1 + v2} = {int(avg)} km/jam, bukan ({v1} + {v2}) : 2."))
    rng.shuffle(items)
    L.append(dict(slug="teka-teki-gaya-emc", title="Teka-teki gaya EMC", kognitif="reasoning",
                  indikator="Teka-teki gerak & kerja campuran gaya EMC", emc="", content=manual(items)))

    # EH10 — tantangan campuran.
    L.append(dict(slug="tantangan-kecepatan-dan-kerja", title="Tantangan kecepatan dan kerja",
                  kognitif="reasoning", indikator="Gabungan semua indikator kecepatan & kerja", emc="",
                  content=mix(L[3]["content"], part_of(L[4]["content"], 0), L[6]["content"],
                              as_choice(L[7]["content"], [("a", "waktu-sendiri"), ("a - t", "dikurangi"), ("a * t", "dikali")]))))

    # EH11 — game lompat kodok: jarak setiap jam.
    hop = lambda v: ("hop-game", {
        "mode": "skip", "board": [0, 10 * v], "boardStep": v, "start": [0, v], "hops": [3, 5], "step": v,
        "prompt": f"Bus melaju {v} km setiap jam. Mulai dari km {{start}}, ketuk posisi bus setiap jam selama {{n}} jam.",
        "say": f"Bus melaju {v} kilometer setiap jam. Mulai dari kilometer {{start}}, ketuk posisi bus setiap jam selama {{n}} jam."})
    L.append(dict(slug="game-perjalanan-bus", title="Game perjalanan bus", kognitif="applying",
                  indikator="Game: posisi kendaraan setiap jam (kelipatan kecepatan)", emc="",
                  content=mix(hop(40), hop(45), hop(60), hop(75))))
    return L


# =============================================================== GE


def ge_levels():
    W = lambda w, say=None: {"word": w, **({"say": say} if say else {})}
    return [
        dict(slug="harta-karun-koordinat", title="Harta karun koordinat", kognitif="applying",
             indikator="Game: titik, geser, dan sudut persegi panjang di bidang koordinat", emc="",
             content=("coord-game", {"x": [-6, 6], "y": [-5, 6], "mode": "mix", "steps": 5})),
        dict(slug="eksperimen-dua-dadu", title="Eksperimen dua dadu", kognitif="analyzing",
             indikator="Game: ruang sampel dua dadu dan koin", emc="",
             content=mix(
                 ("chance-game", {"space": "dice2", "events": [
                     {"text": "hasil kali matanya 6", "test": "a * b == 6"},
                     {"text": "jumlah matanya kelipatan 5", "test": "s % 5 == 0"},
                     {"text": "mata dadu pertama lebih besar", "test": "a > b"}]}),
                 ("chance-game", {"space": "coins2", "events": [
                     {"text": "kedua koin berbeda", "test": "h == 1"}]}),
                 ("chance-game", {"space": "die", "events": [
                     {"text": "matanya bilangan prima", "test": "a == 2 || a == 3 || a == 5"},
                     {"text": "matanya lebih dari 4", "test": "a > 4"}]}))),
        dict(slug="bingo-diskon-dan-kembalian", title="Bingo diskon dan kembalian", kognitif="applying",
             indikator="Game: jumlah belanja, kembalian, dan harga beberapa barang", emc="",
             content=("bingo-game", {"kinds": ["jumlah", "kembalian", "kali"], "price": [5000, 30000], "step": 500})),
        dict(slug="diagram-data-lomba", title="Diagram data lomba", kognitif="applying",
             indikator="Game: membuat diagram batang", emc="",
             content=("chart-game", {"title": "Peserta lomba olimpiade per kelas", "unit": "anak", "scale": 4,
                                     "steps": [1, 9], "items": [{"label": "Kelas 3"}, {"label": "Kelas 4"}, {"label": "Kelas 5"}, {"label": "Kelas 6"}]})),
        dict(slug="penyihir-hitung-cepat", title="Penyihir hitung cepat", kognitif="applying",
             indikator="Game: fakta perkalian dan pembagian tanpa kalkulator", emc="",
             content=("magic-game", {"op": "campur", "tables": [6, 7, 8, 9, 11, 12], "factor": [2, 12], "count": 9, "starEvery": 3})),
        dict(slug="tumpuk-angka-hasil-kali", title="Tumpuk angka hasil kali", kognitif="analyzing",
             indikator="Game: memilih faktor sampai hasil kali tepat", emc="",
             content=("stack-game", {"op": "×", "values": [2, 12], "pick": [2, 3], "blocks": 6})),
        dict(slug="tebak-angka-momo", title="Tebak angka Momo", kognitif="reasoning",
             indikator="Game: strategi membagi dua rentang", emc="",
             content=("guess-game", {"range": [1, 1000], "hint": "number"})),
        dict(slug="teka-teki-silang-istilah-emc", title="Teka-teki silang istilah EMC", kognitif="remembering",
             indikator="Game: istilah matematika olimpiade", emc="",
             content=("crossword-game", {"custom": [
                 {"text": "KELILING", "clue": W("tepi bangun", "jumlah semua sisi bangun")},
                 {"text": "LUAS", "clue": W("p × l", "panjang kali lebar")},
                 {"text": "PELUANG", "clue": W("1/6 dadu", "kemungkinan suatu kejadian")},
                 {"text": "MODUS", "clue": W("paling sering", "data yang paling sering muncul")},
                 {"text": "MEDIAN", "clue": W("data tengah", "data di tengah setelah diurutkan")},
                 {"text": "DIAGONAL", "clue": W("pojok ke pojok", "garis dari pojok ke pojok seberang")},
                 {"text": "RUSUK", "clue": W("kubus ada 12", "garis pertemuan dua sisi kubus")},
                 {"text": "DISKON", "clue": W("potongan harga", "potongan harga")},
                 {"text": "RASIO", "clue": W("a : b", "perbandingan")},
                 {"text": "FAKTOR", "clue": W("pembagi", "bilangan yang membagi habis")},
             ], "mascot": "penggaris", "words": [3, 3], "maxLen": 8, "reveal": "first"})),
        dict(slug="sortir-mustahil-mungkin-pasti", title="Sortir mustahil, mungkin, pasti", kognitif="understanding",
             indikator="Game: mengelompokkan kejadian menurut peluangnya", emc="",
             content=("sort-game", {
                 "bins": [{"id": "mustahil", "label": "mustahil (0)", "icon": W("0", "mustahil")},
                          {"id": "mungkin", "label": "mungkin", "icon": W("0 < p < 1", "mungkin")},
                          {"id": "pasti", "label": "pasti (1)", "icon": W("1", "pasti")}],
                 "items": [
                     {"bin": "mustahil", "item": W("dadu mata 7", "dadu muncul mata 7")},
                     {"bin": "mustahil", "item": W("koin mata 3", "koin muncul angka 3")},
                     {"bin": "mustahil", "item": W("bulan ke-13", "ada bulan ke-13")},
                     {"bin": "mungkin", "item": W("dadu mata 6", "dadu muncul mata 6")},
                     {"bin": "mungkin", "item": W("koin angka", "koin muncul angka")},
                     {"bin": "mungkin", "item": W("hujan besok", "besok hujan")},
                     {"bin": "mungkin", "item": W("dadu genap", "dadu muncul mata genap")},
                     {"bin": "pasti", "item": W("dadu < 7", "dadu muncul kurang dari 7")},
                     {"bin": "pasti", "item": W("koin jatuh", "koin yang dilempar jatuh ke bawah")},
                     {"bin": "pasti", "item": W("koin A atau G", "koin muncul angka atau gambar")},
                 ]})),
        dict(slug="pasangan-pecahan-dan-persen", title="Pasangan pecahan dan persen", kognitif="applying",
             indikator="Game: memasangkan pecahan dengan persen yang sama nilainya", emc="",
             content=("pairs-game", {"pairs": [
                 {"a": W("1/2", "1 per 2"), "b": W("50%", "50 persen")},
                 {"a": W("1/4", "1 per 4"), "b": W("25%", "25 persen")},
                 {"a": W("3/4", "3 per 4"), "b": W("75%", "75 persen")},
                 {"a": W("1/5", "1 per 5"), "b": W("20%", "20 persen")},
                 {"a": W("2/5", "2 per 5"), "b": W("40%", "40 persen")},
                 {"a": W("1/10", "1 per 10"), "b": W("10%", "10 persen")},
                 {"a": W("3/5", "3 per 5"), "b": W("60%", "60 persen")},
             ], "count": [4, 5], "what": "pecahan dan persen yang sama nilainya",
                 "reteach": "Persen artinya per seratus: 1/4 = 25/100 = 25%."})),
    ]
