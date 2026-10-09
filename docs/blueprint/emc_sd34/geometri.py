"""EA Geometri Bidang & Ruang, EB Geometri Koordinat (kisi-kisi EMC Kelas 3–4, D-101)."""

from __future__ import annotations

import random
from fractions import Fraction
from math import gcd, isqrt

from core import (NAMES, as_choice, expr, fig, fmt, game, harder, item, label, manual, mc, mix, part_of,
                  poly, pt, right, say_coord, seg, shoelace)

BENDA_BULAT = ["tutup toples", "jam dinding", "piring", "roda mainan", "hiasan bundar", "tampah",
               "kolam bundar", "taman bundar"]


def triples(limit=40):
    """Tripel Pythagoras (a, b, c) dengan a, b ≤ limit."""
    out = []
    for a in range(1, limit + 1):
        for b in range(1, limit + 1):
            c = isqrt(a * a + b * b)
            if c * c == a * a + b * b:
                out.append((a, b, c))
    return out


# =============================================================== EA


def ea_levels():
    rng = random.Random("EA")
    L = []

    # EA1 — keliling lingkaran & jari-jari (EMC no. 3, mudah).
    L.append(dict(
        slug="keliling-lingkaran-dan-jari-jari", title="Keliling lingkaran dan jari-jari",
        kognitif="applying", indikator="Menentukan jari-jari dari keliling lingkaran (dalam π)", emc="3",
        content=mix(
            expr("Tali yang dililitkan tepat satu putaran di tepi {benda} bundar panjangnya {k}π cm. Berapa cm jari-jari {benda} itu?",
                 "Keliling = 2 × π × jari-jari. Jadi 2 × r = {k}, sehingga r = {k} : 2 = {r} cm.",
                 say="Tali yang dililitkan tepat satu putaran di tepi {benda} bundar panjangnya {k} pi sentimeter. Berapa sentimeter jari-jarinya?",
                 vars={"r": [3, 14]}, derived={"k": "2 * r"}, words={"benda": BENDA_BULAT},
                 answer="r", unit="cm",
                 distractors=[("k", "diameter"), ("k * 2", "dikali-dua"), ("r * 4", "keliling-4r")]),
            expr("Jari-jari sebuah {benda} adalah {r} cm. Keliling {benda} itu adalah …",
                 "Keliling = 2 × π × r = 2 × {r} × π = {answer}.",
                 say="Jari-jari sebuah {benda} adalah {r} sentimeter. Berapa kelilingnya, dalam pi sentimeter?",
                 vars={"r": [2, 15]}, words={"benda": BENDA_BULAT},
                 answer="2 * r", unit="π cm",
                 distractors=[("r", "lupa-dikali-2"), ("r * r", "rumus-luas"), ("4 * r", "dikali-4")]),
            expr("Diameter sebuah {benda} {d} cm. Keliling {benda} itu adalah …",
                 "Diameter = 2 × jari-jari, jadi keliling = π × diameter = {answer}.",
                 say="Diameter sebuah {benda} adalah {d} sentimeter. Berapa kelilingnya, dalam pi sentimeter?",
                 vars={"d": [4, 30]}, words={"benda": BENDA_BULAT}, answer="d", unit="π cm",
                 distractors=[("2 * d", "diameter-dikali-2"), ("d / 2", "jari-jari"), ("d * d / 4", "rumus-luas")]),
        ),
    ))

    # EA2 — persegi dipotong menjadi persegi kecil (EMC no. 6, mudah).
    sq = fig([
        poly([(0, 0), (6, 0), (6, 6), (0, 6)]),
        poly([(0, 0), ("=q", 0), ("=q", "=q"), (0, "=q")], "soft"),
        seg(("=q", 0), ("=q", 6), dashed=True), seg(("=q2", 0), ("=q2", 6), dashed=True),
        seg((0, "=q"), (6, "=q"), dashed=True), seg((0, "=q2"), (6, "=q2"), dashed=True),
    ], caption="luas kertas {luas} cm²")
    L.append(dict(
        slug="memotong-persegi-menjadi-persegi-kecil", title="Memotong persegi menjadi persegi kecil",
        kognitif="applying", indikator="Menentukan keliling persegi kecil hasil pemotongan", emc="6",
        content=mix(
            expr("{nama} menggunting kertas origami seluas {luas} cm² menjadi {n} kotak kecil berbentuk persegi yang ukurannya sama. Berapa cm keliling setiap kotak kecil?",
                 "Sisi kertas besar = {big} cm karena {big} × {big} = {luas}. Dipotong {m} × {m}, jadi sisi kecil = {big} : {m} = {s} cm. Keliling = 4 × {s} = {answer}.",
                 vars={"s": [1, 7], "m": {"values": [2, 3]}}, words={"nama": NAMES},
                 derived={"big": "s * m", "luas": "big * big", "n": "m * m", "q": "6 / m", "q2": "12 / m"},
                 constraint="!(s == 2 && m == 2)", stimulus=[sq], answer="4 * s", unit="cm",
                 distractors=[("4 * big", "keliling-kertas-besar"), ("s * s", "luas-kecil"), ("2 * s", "dua-sisi")]),
            expr("Bingkai foto persegi kelilingnya {kb} cm dibagi dengan garis-garis menjadi {n} kotak persegi yang ukurannya sama. Berapa cm² luas setiap kotak?",
                 "Sisi kertas besar = {kb} : 4 = {big} cm. Sisi kecil = {big} : {m} = {s} cm. Luas = {s} × {s} = {answer}.",
                 vars={"s": [1, 7], "m": {"values": [2, 3]}},
                 derived={"big": "s * m", "kb": "4 * big", "n": "m * m"}, answer="s * s", unit="cm²",
                 distractors=[("big * big", "luas-besar"), ("4 * s", "keliling-kecil"), ("kb / n", "keliling-dibagi")]),
        ),
    ))

    # EA3 — kawat menjadi persegi panjang berbanding (EMC no. 18, sedang).
    L.append(dict(
        slug="persegi-panjang-dari-kawat-dan-perbandingan", title="Persegi panjang dari kawat dan perbandingan",
        kognitif="applying", indikator="Menentukan luas dari keliling dan perbandingan sisi", emc="18",
        content=mix(
            expr("{nama} menekuk seutas pita {kel} cm sampai membentuk bingkai persegi panjang. Panjang bingkai banding lebarnya {a} : {b}. Berapa cm² luas daerah di dalam bingkai?",
                 "Panjang + lebar = {kel} : 2 = {=p+l} cm, dibagi {=a+b} bagian, satu bagian = {k} cm. Panjang = {p} cm, lebar = {l} cm. Luas = {p} × {l} = {answer}.",
                 vars={"a": [2, 5], "b": [1, 4], "k": [1, 8]}, words={"nama": NAMES},
                 constraint="b < a && gcd(a, b) == 1 && !(a == 3 && b == 2 && k == 4)",
                 derived={"p": "a * k", "l": "b * k", "kel": "2 * (p + l)"}, answer="p * l", unit="cm²",
                 distractors=[("kel", "keliling"), ("a * b * k", "lupa-kali-k"), ("p * l * 2", "dikali-dua")]),
            expr("Keliling sebuah taman persegi panjang {kel} m. Panjangnya {a} kali lebarnya. Luas taman itu adalah … m².",
                 "Panjang + lebar = {=p+l} m = {=a+1} bagian, satu bagian = {l} m. Panjang = {p} m. Luas = {p} × {l} = {answer}.",
                 vars={"a": [2, 5], "l": [2, 12]}, derived={"p": "a * l", "kel": "2 * (p + l)"},
                 answer="p * l", unit="m²",
                 distractors=[("kel", "keliling"), ("(p + l) * l", "salah-panjang"), ("p * p", "persegi")]),
        ),
    ))

    # EA4 — keliling segitiga dengan garis tinggi (EMC no. 20, sedang). Bank soal: tripel berkaki sama.
    legs: dict[int, list[tuple[int, int]]] = {}
    for a, b, c in triples(40):
        legs.setdefault(a, []).append((b, c))
    items = []
    for h, bs in sorted(legs.items()):
        for i, (b1, c1) in enumerate(bs):
            for b2, c2 in bs[i + 1:]:
                if h > 30 or b1 + b2 > 48 or (h, b1, b2) == (12, 5, 9):
                    continue
                for left, right_ in ((b1, b2), (b2, b1)):
                    cl = c1 if left == b1 else c2
                    cr = c2 if left == b1 else c1
                    base = left + right_
                    ans = cl + cr + base
                    A, D, C, B = (0, 0), (left, 0), (base, 0), (left, h)
                    f = fig([poly([A, C, B]), seg(B, D, dashed=True), right(D, C, B),
                             seg(A, D, f"{left}"), seg(D, C, f"{right_}"), label((left + 1.6, h / 2), f"{h}"),
                             pt(A, "A", "sw"), pt(B, "B", "n"), pt(C, "C", "se"), pt(D, "D", "s")])
                    items.append(item(
                        f"Pada segitiga ABC, garis tinggi BD panjangnya {h} cm. Titik D membagi alas AC menjadi AD = {left} cm dan DC = {right_} cm. Keliling segitiga ABC adalah … cm.",
                        mc(ans, [cl + cr, base + h + cl, ans + h, cl + cr + h]),
                        f"Segitiga ABD siku-siku: AB = √({left}² + {h}²) = {cl}. Segitiga BDC: BC = √({right_}² + {h}²) = {cr}. Keliling = {cl} + {cr} + {base} = {ans} cm.",
                        stimulus=[f]))
    rng.shuffle(items)
    L.append(dict(
        slug="keliling-segitiga-dengan-garis-tinggi", title="Keliling segitiga dengan garis tinggi",
        kognitif="applying", indikator="Menentukan keliling segitiga dari tinggi dan pembagian alas (tripel Pythagoras)",
        emc="20", content=manual(items[:40]),
    ))

    # EA5 — kerangka kubus & balok (EMC no. 38, sulit, isian).
    L.append(dict(
        slug="kerangka-dan-volume-kubus", title="Kerangka dan volume kubus",
        kognitif="applying", indikator="Menentukan volume/luas kubus dari panjang total rusuk", emc="38",
        content=mix(
            expr("{nama} memakai kawat {kw} cm sampai habis untuk membuat kerangka sebuah kubus. Berapa cm³ volume kubus itu?",
                 "Kubus punya 12 rusuk yang sama panjang. Rusuk = {kw} : 12 = {s} cm. Volume = {s} × {s} × {s} = {answer}.",
                 vars={"s": [2, 12]}, words={"nama": NAMES}, constraint="s != 4", derived={"kw": "12 * s"},
                 answer="s * s * s", unit="cm³", mode="input"),
            expr("Kerangka sebuah kubus dibuat dari lidi yang panjang totalnya {kw} cm. Luas seluruh permukaan kubus itu adalah … cm².",
                 "Rusuk = {kw} : 12 = {s} cm. Kubus punya 6 sisi persegi: 6 × {s} × {s} = {answer}.",
                 vars={"s": [2, 12]}, derived={"kw": "12 * s"}, answer="6 * s * s", unit="cm²", mode="input"),
            expr("Kerangka balok berukuran {p} cm × {l} cm × {t} cm dibuat dari kawat. Panjang kawat yang diperlukan adalah … cm.",
                 "Balok punya 4 rusuk panjang, 4 rusuk lebar, dan 4 rusuk tinggi: 4 × ({p} + {l} + {t}) = {answer}.",
                 vars={"p": [5, 20], "l": [3, 12], "t": [2, 10]}, constraint="l < p",
                 answer="4 * (p + l + t)", unit="cm", mode="input"),
        ),
    ))

    # EA6 — persegi panjang dipotong diagonal (EMC no. 24, sulit).
    L.append(dict(
        slug="persegi-panjang-dipotong-diagonal", title="Persegi panjang dipotong diagonal",
        kognitif="analyzing", indikator="Menentukan keliling segitiga siku-siku hasil potongan diagonal", emc="24",
        content=expr(
            "Pak {nama} punya papan persegi panjang dengan luas {luas} cm² dan keliling {kel} cm. Papan itu digergaji lurus dari satu pojok ke pojok seberangnya. Keliling salah satu potongan segitiganya adalah … cm.",
            "Panjang + lebar = {kel} : 2 = {=a+b}, dan panjang × lebar = {luas}. Bilangan yang cocok: {a} dan {b}. Diagonal = √({a}² + {b}²) = {c}. Keliling segitiga = {a} + {b} + {c} = {answer}.",
            vars={"u": [2, 4], "v": [1, 3], "k": [1, 4]}, words={"nama": NAMES},
            derived={"a": "k * (u * u - v * v)", "b": "k * 2 * u * v", "c": "k * (u * u + v * v)",
                     "luas": "a * b", "kel": "2 * (a + b)"},
            constraint="v < u && a + b <= 46 && a != b", answer="a + b + c", unit="cm",
            distractors=[("kel", "keliling-persegi-panjang"), ("a + b", "lupa-diagonal"),
                         ("kel + c", "ditambah-diagonal"), ("2 * c", "dua-diagonal")]),
    ))

    # EA7 — perbandingan luas segitiga (EMC no. 37, sulit, isian).
    F = ("=4 - m / (m + n)", "=6 * m / (m + n)")
    A, B, C, D = (0, 0), (3, 6), (8, 0), (4, 0)

    def tri_fig(shade):
        return fig([poly([A, C, B]), poly(shade, "shade"), seg(B, D), seg(A, F),
                    seg(A, D, ticks=1), seg(D, C, ticks=1),
                    pt(A, "A", "sw"), pt(B, "B", "n"), pt(C, "C", "se"), pt(D, "D", "s"), pt(F, "F", "e")])

    exp = "Karena AD = DC, luas ABD = setengah luas ABC = {=lt/2} cm². Segitiga AFD dan AFB sama-sama berpuncak di A dengan alas DF dan FB pada satu garis, jadi luasnya sebanding DF : FB = {m} : {n}. "
    L.append(dict(
        slug="perbandingan-luas-segitiga", title="Perbandingan luas segitiga",
        kognitif="evaluating", indikator="Menentukan luas segitiga dari perbandingan ruas garis", emc="37",
        content=mix(
            expr("Pada gambar, D titik tengah AC dan titik F pada BD dengan DF : FB = {m} : {n}. Luas segitiga ABC {lt} cm². Luas segitiga AFB (daerah arsir) adalah … cm².",
                 exp + "Luas AFB = {n}/{=m+n} × {=lt/2} = {answer}.",
                 vars={"m": [1, 3], "n": [1, 3], "k": [1, 6]}, constraint="gcd(m, n) == 1",
                 derived={"lt": "2 * (m + n) * k"}, stimulus=[tri_fig([A, F, B])],
                 answer="n * k", unit="cm²", mode="input"),
            expr("Pada gambar, D titik tengah AC dan titik F pada BD dengan DF : FB = {m} : {n}. Luas segitiga ABC {lt} cm². Luas segitiga AFD (daerah arsir) adalah … cm².",
                 exp + "Luas AFD = {m}/{=m+n} × {=lt/2} = {answer}.",
                 vars={"m": [1, 3], "n": [1, 3], "k": [1, 6]}, constraint="gcd(m, n) == 1",
                 derived={"lt": "2 * (m + n) * k"}, stimulus=[tri_fig([A, F, D])],
                 answer="m * k", unit="cm²", mode="input"),
        ),
    ))

    # EA8 — luas gabungan bangun yang tumpang tindih (EMC no. 25, sulit).
    two_sq = fig([poly([(0, 0), ("=s", 0), ("=s", "=s"), (0, "=s")], "shade"),
                  poly([("=h", "=h"), ("=h+s", "=h"), ("=h+s", "=h+s"), ("=h", "=h+s")], "shade"),
                  pt(("=h", "=h"), "O", "sw")])
    sq_tri = fig([poly([(0, 0), ("=s", 0), ("=s", "=s"), (0, "=s")], "shade"),
                  poly([("=h", "=h"), ("=3*h", "=h"), ("=h", "=3*h")], "shade"),
                  right(("=h", "=h"), ("=3*h", "=h"), ("=h", "=3*h")),
                  pt(("=h", "=h"), "O", "sw"), pt(("=3*h", "=h"), "P", "e"), pt(("=h", "=3*h"), "Q", "n")])
    L.append(dict(
        slug="luas-gabungan-bangun-tumpang-tindih", title="Luas gabungan bangun yang tumpang tindih",
        kognitif="analyzing", indikator="Menghitung luas gabungan dua bangun yang tumpang tindih", emc="25",
        content=mix(
            expr("Dua persegi sama besar, luas masing-masing {lp} cm². Satu titik sudut persegi kedua tepat di titik pusat O persegi pertama dan sisi-sisinya sejajar (lihat gambar). Luas seluruh daerah arsir adalah … cm².",
                 "Bagian yang tumpang tindih adalah persegi kecil bersisi setengah sisi persegi, luasnya {lp} : 4 = {=lp/4}. Luas gabungan = {lp} + {lp} − {=lp/4} = {answer} cm².",
                 vars={"h": [1, 7]}, derived={"s": "2 * h", "lp": "s * s"}, stimulus=[two_sq],
                 answer="2 * lp - lp / 4", unit="cm²",
                 distractors=[("2 * lp", "lupa-irisan"), ("2 * lp - lp / 2", "irisan-setengah"), ("lp + lp / 4", "salah-tanda")]),
            expr("Pada gambar, persegi dan segitiga siku-siku sama kaki OPQ tumpang tindih. Titik siku-siku O adalah pusat persegi, dan OP = OQ = sisi persegi. Luas segitiga OPQ {lt} cm². Luas seluruh daerah arsir adalah … cm².",
                 "Luas segitiga = sisi × sisi : 2, jadi luas persegi = 2 × {lt} = {lp} cm². Bagian yang tumpang tindih = seperempat persegi = {=lp/4}. Luas gabungan = {lp} + {lt} − {=lp/4} = {answer} cm².",
                 vars={"h": [1, 7]}, derived={"s": "2 * h", "lp": "s * s", "lt": "lp / 2"}, stimulus=[sq_tri],
                 answer="lp + lt - lp / 4", unit="cm²",
                 distractors=[("lp + lt", "lupa-irisan"), ("lp + lt - lp / 2", "irisan-setengah"), ("lp", "hanya-persegi")]),
        ),
    ))

    # EA9 — teka-teki gaya EMC (bank soal).
    items = []
    for s in range(4, 21, 2):  # persegi lewat titik tengah sisi
        h = s // 2
        f = fig([poly([(0, 0), (s, 0), (s, s), (0, s)]), poly([(h, 0), (s, h), (h, s), (0, h)], "shade")])
        items.append(item(
            f"Titik tengah keempat sisi sebuah persegi bersisi {s} cm dihubungkan sehingga terbentuk persegi baru (arsir). Luas persegi yang diarsir adalah … cm².",
            mc(s * s // 2, [s * s, s * s // 4, 2 * s * 2 // 2 * 2]),
            f"Garis yang menghubungkan titik tengah membagi persegi menjadi 8 segitiga sama besar; 4 di antaranya diarsir. Jadi luas arsir = setengah dari {s} × {s} = {s * s // 2} cm².",
            stimulus=[f]))
    for w, hh, steps in [(6, 6, 3), (8, 6, 2), (9, 6, 3), (12, 8, 4), (12, 9, 3), (15, 10, 5), (8, 8, 4),
                         (10, 6, 2), (12, 6, 3), (16, 12, 4)]:
        dx, dy = w // steps, hh // steps
        assert dx * steps == w and dy * steps == hh
        pts = [(0, 0), (w, 0)]
        x, y = w, 0
        for _ in range(steps):
            y += dy
            pts.append((x, y))
            x -= dx
            pts.append((x, y))
        assert pts[-1] == (0, hh)
        f = fig([poly(pts, "soft"), seg((0, 0), (w, 0), f"{w} cm"), seg((0, 0), (0, hh), f"{hh} cm")])
        items.append(item(
            f"Bangun berbentuk tangga pada gambar lebarnya {w} cm dan tingginya {hh} cm. Semua sudutnya siku-siku. Keliling bangun itu adalah … cm.",
            mc(2 * (w + hh), [w + hh, w * hh, 2 * (w + hh) + 2 * steps]),
            f"Geser semua anak tangga mendatar ke bawah dan yang tegak ke kiri: kelilingnya sama dengan persegi panjang {w} × {hh}, yaitu 2 × ({w} + {hh}) = {2 * (w + hh)} cm.",
            stimulus=[f]))
    for n in range(3, 8):
        for kind, cnt, why in [
            ("tepat dua sisinya", 12 * (n - 2), f"Kubus kecil dengan 2 sisi berwarna ada di rusuk (bukan pojok): 12 rusuk × {n - 2} = {12 * (n - 2)}."),
            ("tidak berwarna sama sekali", (n - 2) ** 3, f"Kubus tanpa warna ada di bagian dalam: ({n} − 2)³ = {(n - 2) ** 3}."),
            ("tepat satu sisinya", 6 * (n - 2) ** 2, f"Kubus dengan 1 sisi berwarna ada di tengah tiap sisi: 6 × ({n} − 2)² = {6 * (n - 2) ** 2}."),
        ]:
            if cnt == 0:
                continue
            items.append(item(
                f"Sebuah kubus besar dicat merah di seluruh permukaannya, lalu dipotong menjadi {n ** 3} kubus kecil sama besar ({n} × {n} × {n}). Banyak kubus kecil yang {kind} berwarna merah adalah …",
                mc(cnt, [8, 12 * n, 6 * n * n, (n - 1) ** 3, 4 * (n - 2)]),
                why))
    for w, hh in [(10, 6), (12, 8), (14, 6), (16, 10), (9, 8), (20, 7), (18, 12)]:
        t = w // 3
        f = fig([poly([(0, 0), (w, 0), (w, hh), (0, hh)]), poly([(0, 0), (w, 0), (t, hh)], "shade"),
                 pt((t, hh), "T", "n")])
        items.append(item(
            f"Sebuah persegi panjang berukuran {w} cm × {hh} cm. Titik T terletak di sisi atas. Luas segitiga yang diarsir adalah … cm².",
            mc(w * hh // 2, [w * hh, w * hh // 4, (w + hh)]),
            f"Alas segitiga = {w} cm dan tingginya sama dengan tinggi persegi panjang, {hh} cm, di mana pun letak T. Luas = {w} × {hh} : 2 = {w * hh // 2} cm².",
            stimulus=[f]))
    for r in range(3, 12):
        items.append(item(
            f"Sebuah lingkaran berada di dalam persegi dan menyentuh keempat sisinya. Keliling persegi itu {8 * r} cm. Keliling lingkaran adalah …",
            mc(2 * r, [r, 4 * r, 8 * r], unit="π cm"),
            f"Sisi persegi = {8 * r} : 4 = {2 * r} cm = diameter lingkaran. Keliling lingkaran = π × diameter = {2 * r}π cm."))
    rng.shuffle(items)
    L.append(dict(slug="teka-teki-gaya-emc", title="Teka-teki gaya EMC", kognitif="reasoning",
                  indikator="Teka-teki geometri campuran gaya EMC", emc="", content=manual(items[:60])))

    # EA10 — tantangan campuran (angka lebih besar).
    L.append(dict(slug="tantangan-geometri-bidang-dan-ruang", title="Tantangan geometri bidang dan ruang",
                  kognitif="reasoning", indikator="Gabungan semua indikator geometri bidang & ruang", emc="",
                  content=mix(
                      harder(part_of(L[2]["content"], 0), vars={"a": [3, 7], "b": [1, 6], "k": [2, 10]}),
                      harder(L[5]["content"], vars={"u": [2, 5], "v": [1, 4], "k": [1, 3]},
                             constraint="v < u && a + b <= 70 && a != b"),
                      as_choice(part_of(L[6]["content"], 0), [("m * k", "tertukar"), ("lt / 2", "setengah"), ("(m + n) * k", "luas-abd")]),
                      part_of(L[7]["content"], 1),
                  )))

    # EA11 — game: kartu pasangan bangun ↔ ukurannya.
    L.append(dict(slug="game-pasangan-bangun-dan-ukuran", title="Game pasangan bangun dan ukuran",
                  kognitif="applying", indikator="Game: memasangkan bangun dengan ukurannya", emc="",
                  content=game("pairs-game", {
                      "pairs": [
                          {"a": {"word": "r = 5 cm", "say": "jari-jari 5 sentimeter"}, "b": {"word": "K = 10π cm", "say": "keliling 10 pi sentimeter"}},
                          {"a": {"word": "r = 3 cm", "say": "jari-jari 3 sentimeter"}, "b": {"word": "K = 6π cm", "say": "keliling 6 pi sentimeter"}},
                          {"a": {"word": "kubus s = 4", "say": "kubus rusuk 4"}, "b": {"word": "V = 64", "say": "volume 64"}},
                          {"a": {"word": "kubus s = 3", "say": "kubus rusuk 3"}, "b": {"word": "V = 27", "say": "volume 27"}},
                          {"a": {"word": "siku 6 & 8", "say": "sisi siku-siku 6 dan 8"}, "b": {"word": "miring 10", "say": "sisi miring 10"}},
                          {"a": {"word": "siku 5 & 12", "say": "sisi siku-siku 5 dan 12"}, "b": {"word": "miring 13", "say": "sisi miring 13"}},
                          {"a": {"word": "persegi s = 9", "say": "persegi sisi 9"}, "b": {"word": "L = 81", "say": "luas 81"}},
                          {"a": {"word": "7 × 4 cm", "say": "persegi panjang 7 kali 4 sentimeter"}, "b": {"word": "K = 22 cm", "say": "keliling 22 sentimeter"}},
                      ],
                      "count": [4, 4],
                      "what": "bangun dan ukurannya yang cocok",
                      "reteach": "Hitung dulu ukurannya: keliling lingkaran 2 × π × r, volume kubus s × s × s, sisi miring dari tripel 3-4-5 dan 5-12-13.",
                  })))
    return L


# =============================================================== EB


def axes_for(points, pad=1):
    xs = [p[0] for p in points] + [0]
    ys = [p[1] for p in points] + [0]
    return (min(xs) - pad, max(xs) + pad, min(ys) - pad, max(ys) + pad)


def eb_levels():
    rng = random.Random("EB")
    L = []

    # EB1 — jarak dua titik mendatar/tegak (EMC no. 8, mudah).
    flat = fig([seg(("=x1", "=y"), ("=x2", "=y"), dashed=True), pt(("=x1", "=y"), "P", "n", True),
                pt(("=x2", "=y"), "Q", "n", True)], axes=("=min(x1,0)-1", "=max(x2,0)+1", "=min(y,0)-1", "=max(y,0)+1"))
    tall = fig([seg(("=x", "=y1"), ("=x", "=y2"), dashed=True), pt(("=x", "=y1"), "P", "e", True),
                pt(("=x", "=y2"), "Q", "e", True)], axes=("=min(x,0)-1", "=max(x,0)+1", "=min(y1,0)-1", "=max(y2,0)+1"))
    L.append(dict(
        slug="jarak-dua-titik-mendatar-dan-tegak", title="Jarak dua titik mendatar dan tegak",
        kognitif="understanding", indikator="Menentukan jarak dua titik dengan ordinat/absis sama", emc="8",
        content=mix(
            expr("Titik P({x1}, {y}) dan Q({x2}, {y}) terletak pada satu garis mendatar. Berapa satuan panjang ruas PQ?",
                 "Ordinatnya sama ({y}), jadi cukup hitung selisih absis: {x2} − ({x1}) = {answer} satuan.",
                 vars={"x1": [-8, 6], "x2": [-6, 9], "y": [-6, 7]}, constraint="x1 < x2 && x2 - x1 >= 2 && max(x2,0) - min(x1,0) <= 16",
                 stimulus=[flat], answer="x2 - x1", unit="satuan",
                 distractors=[("abs(x2 + x1)", "dijumlah"), ("x2 - x1 + 1", "menghitung-titik"), ("abs(x2)", "satu-titik")]),
            expr("Titik P({x}, {y1}) dan Q({x}, {y2}) terletak pada satu garis tegak. Berapa satuan panjang ruas PQ?",
                 "Absisnya sama ({x}), jadi cukup hitung selisih ordinat: {y2} − ({y1}) = {answer} satuan.",
                 vars={"x": [-6, 7], "y1": [-8, 5], "y2": [-5, 9]}, constraint="y1 < y2 && y2 - y1 >= 2 && max(y2,0) - min(y1,0) <= 16",
                 stimulus=[tall], answer="y2 - y1", unit="satuan",
                 distractors=[("abs(y2 + y1)", "dijumlah"), ("y2 - y1 + 1", "menghitung-titik"), ("abs(y2)", "satu-titik")]),
        ),
    ))

    # EB2 — keliling persegi panjang dari koordinat (EMC no. 28, mudah).
    rect = fig([poly([("=x0", "=y0"), ("=x0+w", "=y0"), ("=x0+w", "=y0+h"), ("=x0", "=y0+h")], "soft")],
               axes=("=min(x0,0)-1", "=max(x0+w,0)+1", "=min(y0,0)-1", "=max(y0+h,0)+1"))
    L.append(dict(
        slug="keliling-persegi-panjang-dari-koordinat", title="Keliling persegi panjang dari koordinat",
        kognitif="understanding", indikator="Menghitung keliling/luas persegi panjang dari koordinat titik sudut", emc="28",
        content=mix(
            expr("Titik ({x0}, {y0}), ({=x0+w}, {y0}), ({=x0+w}, {=y0+h}), dan ({x0}, {=y0+h}) dihubungkan menjadi persegi panjang. Keliling persegi panjang itu adalah … satuan.",
                 "Panjang = {=x0+w} − ({x0}) = {w}, lebar = {=y0+h} − ({y0}) = {h}. Keliling = 2 × ({w} + {h}) = {answer}.",
                 vars={"x0": [-5, 3], "y0": [-5, 3], "w": [2, 9], "h": [2, 8]}, constraint="w != h",
                 stimulus=[rect], answer="2 * (w + h)", unit="satuan", allow_negative=False,
                 distractors=[("w * h", "luas"), ("w + h", "setengah-keliling"), ("2 * w + h", "satu-lebar")]),
            expr("Titik ({x0}, {y0}), ({=x0+w}, {y0}), ({=x0+w}, {=y0+h}), dan ({x0}, {=y0+h}) dihubungkan menjadi persegi panjang. Luas persegi panjang itu adalah … satuan persegi.",
                 "Panjang = {w}, lebar = {h}. Luas = {w} × {h} = {answer}.",
                 vars={"x0": [-5, 3], "y0": [-5, 3], "w": [2, 9], "h": [2, 8]}, constraint="w != h",
                 answer="w * h", unit="satuan²",
                 distractors=[("2 * (w + h)", "keliling"), ("w + h", "dijumlah"), ("(w + 1) * (h + 1)", "menghitung-titik")]),
        ),
    ))

    # EB3 — jarak dua titik (Pythagoras) (EMC no. 17, sedang).
    py_vars = {"u": [2, 4], "v": [1, 3], "k": [1, 3], "x1": [-6, 6], "y1": [-6, 6], "sx": {"values": [1, -1]}, "sy": {"values": [1, -1]}}
    py_der = {"dx": "k * (u * u - v * v)", "dy": "k * 2 * u * v", "c": "k * (u * u + v * v)",
              "x2": "x1 + sx * dx", "y2": "y1 + sy * dy"}
    L.append(dict(
        slug="jarak-dua-titik-dengan-pythagoras", title="Jarak dua titik dengan Pythagoras",
        kognitif="applying", indikator="Menghitung jarak dua titik dengan teorema Pythagoras", emc="17",
        content=expr("Seekor semut berjalan lurus dari titik ({x1}, {y1}) ke titik ({x2}, {y2}) pada kertas berpetak. Berapa satuan panjang lintasan semut itu?",
                     "Geser mendatar {dx} satuan dan tegak {dy} satuan. Jarak = √({dx}² + {dy}²) = √{=c*c} = {answer}.",
                     vars=py_vars, derived=py_der, constraint="v < u && dx <= 16 && dy <= 16",
                     answer="c", unit="satuan",
                     distractors=[("dx + dy", "dijumlah"), ("max(dx, dy)", "satu-arah"), ("c + 1", "lain")])))

    # EB4 — luas segitiga → koordinat (EMC no. 13, sedang).
    tri = fig([poly([("=a", "=b"), ("=a+w", "=b"), ("=a+w", "=b+h")], "soft"),
               pt(("=a", "=b"), None), pt(("=a+w", "=b"), None), pt(("=a+w", "=b+h"), "?", "e")],
              axes=("=min(a,0)-1", "=max(a+w,0)+1", "=min(b,0)-1", "=max(b+h,0)+1"))
    L.append(dict(
        slug="mencari-koordinat-dari-luas-segitiga", title="Mencari koordinat dari luas segitiga",
        kognitif="applying", indikator="Menentukan koordinat titik dari luas segitiga", emc="13",
        content=expr("Dua titik sudut sebuah segitiga siku-siku adalah ({a}, {b}) dan ({=a+w}, {b}). Titik sudut ketiganya ({=a+w}, Y) berada di atas titik ({=a+w}, {b}). Luas segitiga itu {ls} satuan persegi. Berapakah Y?",
                     "Alas = {w}, tinggi = Y − {b}. Luas = {w} × (Y − {b}) : 2 = {ls}, jadi Y − {b} = {h} dan Y = {answer}.",
                     vars={"a": [-4, 3], "b": [-4, 3], "w": [2, 8], "h": [2, 8]},
                     constraint="(w * h) % 2 == 0 && !(a == 1 && b == 1 && w == 3 && h == 4)",
                     derived={"ls": "w * h / 2"}, stimulus=[tri], answer="b + h", allow_negative=True,
                     distractors=[("h", "lupa-titik-awal"), ("b + 2 * h", "lupa-setengah"), ("b + h / 2", "dibagi-dua")])))

    # EB5 — keliling segitiga siku-siku dari koordinat (EMC no. 36, sulit, isian).
    L.append(dict(
        slug="keliling-segitiga-dari-koordinat", title="Keliling segitiga dari koordinat",
        kognitif="applying", indikator="Menghitung keliling segitiga siku-siku dari koordinat", emc="36",
        content=expr("Tiga patok kebun ditancapkan di titik ({x1}, {y1}), ({x1}, {y2}), dan ({x2}, {y1}). Seutas tali dibentangkan mengelilingi ketiga patok itu. Berapa satuan panjang tali?",
                     "Sisi tegak = {dy}, sisi mendatar = {dx}. Sisi miring = √({dx}² + {dy}²) = {c}. Keliling = {dx} + {dy} + {c} = {answer}.",
                     vars=py_vars, derived=py_der, constraint="v < u && dx <= 16 && dy <= 16",
                     answer="dx + dy + c", unit="satuan", mode="input")))

    # EB6 — luas segiempat dari koordinat (EMC no. 32, sulit, isian).
    L.append(dict(
        slug="luas-segiempat-dari-koordinat", title="Luas segiempat dari koordinat",
        kognitif="analyzing", indikator="Menghitung luas segiempat sembarang dari koordinat titik sudut", emc="32",
        content=mix(
            expr("Empat titik (0, {y1}), ({p}, {yr}), (0, {y2}), dan ({=-q}, {yl}) dihubungkan berurutan dan kembali ke titik pertama. Berapa satuan persegi luas bangun yang terbentuk?",
                 "Titik (0, {y1}) dan (0, {y2}) ada di sumbu-y; ruas itu panjangnya {d} dan membagi segiempat menjadi dua segitiga dengan tinggi {p} dan {q}. Luas = {d} × {p} : 2 + {d} × {q} : 2 = {answer}.",
                 vars={"y1": [-6, -1], "d": [4, 12], "p": [1, 8], "q": [1, 8], "a": [1, 9], "b": [1, 9]},
                 derived={"y2": "y1 + d", "yr": "y1 + min(a, d - 1)", "yl": "y1 + min(b, d - 1)"},
                 constraint="(d * (p + q)) % 2 == 0", answer="d * (p + q) / 2", unit="satuan²", mode="input"),
            expr("Empat titik ({x1}, 0), ({xt}, {p}), ({x2}, 0), dan ({xb}, {=-q}) dihubungkan berurutan dan kembali ke titik pertama. Berapa satuan persegi luas bangun yang terbentuk?",
                 "Titik ({x1}, 0) dan ({x2}, 0) ada di sumbu-x; ruas itu panjangnya {d} dan membagi segiempat menjadi dua segitiga dengan tinggi {p} dan {q}. Luas = {d} × ({p} + {q}) : 2 = {answer}.",
                 vars={"x1": [-6, -1], "d": [4, 12], "p": [1, 8], "q": [1, 8], "a": [1, 9], "b": [1, 9]},
                 derived={"x2": "x1 + d", "xt": "x1 + min(a, d - 1)", "xb": "x1 + min(b, d - 1)"},
                 constraint="(d * (p + q)) % 2 == 0", answer="d * (p + q) / 2", unit="satuan²", mode="input"),
        ),
    ))

    # EB7 — luas segilima dari koordinat (EMC no. 30, sulit). Bank soal: kotak batas − segitiga pojok.
    items = []
    seen = set()
    while len(items) < 40:
        x0, y0 = rng.randint(-6, 0), rng.randint(-5, 0)
        W, H = rng.randint(5, 9), rng.randint(4, 7)
        x1, y1 = x0 + W, y0 + H
        a = rng.randint(1, H - 2)        # potong pojok kiri bawah: (x0, y0+a) → (x0+b, y0)
        b = rng.randint(1, W - 3)
        c = rng.randint(1, W - b - 1)    # potong pojok kanan bawah: (x1-c, y0) → (x1, y0+e)
        e = rng.randint(1, H - 1)
        g = rng.randint(1, min(W - 1, 4))  # potong pojok kanan atas: (x1, y1-k) → (x1-g, y1)
        k = rng.randint(1, H - e)
        pts = [(x0, y0 + a), (x0 + b, y0), (x1 - c, y0), (x1, y0 + e), (x1, y1 - k), (x1 - g, y1), (x0, y1)]
        pts = [p for i, p in enumerate(pts) if p != pts[i - 1]]
        if len(pts) != 7 or (x0, y0, W, H, a, b, c, e, g, k) in seen:
            continue
        seen.add((x0, y0, W, H, a, b, c, e, g, k))
        area = shoelace(pts)
        assert area == W * H - Fraction(a * b + c * e + g * k, 2)
        if area.denominator != 1:
            continue
        # Segi lima: gabungkan dua titik sudut kanan bila e + k = H (titik sama) — cukup pakai 7 titik (segi tujuh).
        ptxt = ", ".join(f"({fmt(x)}, {fmt(y)})" for x, y in pts)
        ans = int(area)
        items.append(item(
            f"Pada bidang koordinat, titik-titik {ptxt} dihubungkan berurutan dan kembali ke titik pertama. Luas daerah di dalam bangun itu adalah … satuan persegi.",
            mc(ans, [W * H, ans + (a * b) // 2 + 1, W * H - (a * b + c * e + g * k), 2 * (W + H)]),
            f"Kotak batasnya {W} × {H} = {W * H}. Kurangi tiga segitiga pojok: {fmt(Fraction(a * b, 2))} + {fmt(Fraction(c * e, 2))} + {fmt(Fraction(g * k, 2))}. Luas = {ans}.",
            stimulus=[fig([poly(pts, "soft")], axes=axes_for(pts))]))
    L.append(dict(slug="luas-segi-banyak-dari-koordinat", title="Luas segi banyak dari koordinat",
                  kognitif="analyzing", indikator="Menghitung luas segi banyak dari koordinat titik sudut", emc="30",
                  content=manual(items)))

    # EB8 — titik dengan syarat perbandingan jarak (EMC no. 12, sulit). Bank soal: cek pilihan.
    items = []
    keys = set()
    for _ in range(4000):
        if len(items) >= 40:
            break
        ax, ay = rng.randint(-3, 6), rng.randint(-3, 6)
        cx = rng.randint(-3, 7)
        X = rng.randint(-2, 9)
        dx, dy = cx - ax, X - ay
        if (dx, dy) == (0, 0):
            continue
        # B = C + 2 × (AC diputar 90°) → BC = 2 × AC.
        sgn = rng.choice([1, -1])
        bx, by = cx + sgn * 2 * dy, X - sgn * 2 * dx
        if not (-6 <= bx <= 14 and -6 <= by <= 16):
            continue
        sols = [x for x in range(-20, 30) if (bx - cx) ** 2 + (by - x) ** 2 == 4 * ((ax - cx) ** 2 + (ay - x) ** 2)]
        assert X in sols
        wrong = [w for w in (X + 1, X - 1, X + 2, X - 2, X + 3) if w not in sols][:3]
        key = (ax, ay, bx, by, cx)
        if len(wrong) < 3 or key in keys:
            continue
        keys.add(key)
        ac2 = dx * dx + dy * dy
        items.append(item(
            f"Titik C({fmt(cx)}, X) dipilih sehingga jaraknya ke titik B({fmt(bx)}, {fmt(by)}) tepat dua kali jaraknya ke titik A({fmt(ax)}, {fmt(ay)}). Manakah nilai X yang memenuhi?",
            mc(X, wrong),
            f"Cek pilihan X = {fmt(X)}: AC² = {dx * dx} + {dy * dy} = {ac2}, BC² = {(bx - cx) ** 2} + {(by - X) ** 2} = {4 * ac2} = 4 × {ac2}. Jadi BC = 2 × AC. Mengecek pilihan lebih cepat daripada menyelesaikan persamaan."))
    L.append(dict(slug="titik-dengan-syarat-jarak", title="Titik dengan syarat jarak",
                  kognitif="analyzing", indikator="Menentukan koordinat yang memenuhi syarat perbandingan jarak", emc="12",
                  content=manual(items)))

    # EB9 — teka-teki koordinat gaya EMC (bank soal).
    items = []
    for x, y in [(3, 5), (-4, 2), (6, -3), (-2, -5), (7, 1), (-6, 4), (5, -6), (1, 7)]:
        items.append(item(
            f"Titik P({fmt(x)}, {fmt(y)}) dicerminkan terhadap sumbu-y menjadi P'. Koordinat P' adalah …",
            [{"visual": {"kind": "text", "text": f"({fmt(-x)}, {fmt(y)})"}, "say": say_coord(-x, y)},
             {"visual": {"kind": "text", "text": f"({fmt(x)}, {fmt(-y)})"}, "say": say_coord(x, -y)},
             {"visual": {"kind": "text", "text": f"({fmt(-x)}, {fmt(-y)})"}, "say": say_coord(-x, -y)},
             {"visual": {"kind": "text", "text": f"({fmt(y)}, {fmt(x)})"}, "say": say_coord(y, x)}],
            "Pencerminan terhadap sumbu-y: absis (x) berganti tanda, ordinat (y) tetap."))
    for a, b in [(1, 2), (2, 3), (1, 3), (3, 4), (2, 5), (1, 4), (3, 5), (4, 5)]:
        s = a * a + b * b
        pts = [(0, a), (b, 0), (a + b, b), (a, a + b)]
        items.append(item(
            f"Titik (0, {a}), ({b}, 0), ({a + b}, {b}), dan ({a}, {a + b}) adalah titik sudut sebuah persegi yang miring. Luas persegi itu adalah … satuan persegi.",
            mc(s, [(a + b) ** 2, a * b * 2, a + b + a * b]),
            f"Kotak batasnya ({a} + {b}) × ({a} + {b}) = {(a + b) ** 2}. Kurangi 4 segitiga pojok: 4 × {a} × {b} : 2 = {2 * a * b}. Luas = {s}.",
            stimulus=[fig([poly(pts, "soft")], axes=(-1, a + b + 1, -1, a + b + 1))]))
    for (x1, y1), (x2, y2) in [((2, 3), (8, 7)), ((-4, 1), (6, 5)), ((1, -3), (7, 9)), ((-6, -2), (2, 4)), ((0, 5), (10, -1)), ((-3, 7), (5, 1))]:
        mx, my = (x1 + x2) // 2, (y1 + y2) // 2
        items.append(item(
            f"Titik M adalah titik tengah ruas garis yang menghubungkan ({fmt(x1)}, {fmt(y1)}) dan ({fmt(x2)}, {fmt(y2)}). Koordinat M adalah …",
            [{"visual": {"kind": "text", "text": f"({fmt(mx)}, {fmt(my)})"}},
             {"visual": {"kind": "text", "text": f"({fmt(x2 - x1)}, {fmt(y2 - y1)})"}},
             {"visual": {"kind": "text", "text": f"({fmt(x1 + x2)}, {fmt(y1 + y2)})"}},
             {"visual": {"kind": "text", "text": f"({fmt(mx + 1)}, {fmt(my)})"}}],
            f"Titik tengah = rata-rata absis dan rata-rata ordinat: (({fmt(x1)} + {fmt(x2)}) : 2, ({fmt(y1)} + {fmt(y2)}) : 2) = ({fmt(mx)}, {fmt(my)})."))
    for w, h in [(4, 6), (6, 9), (8, 12), (5, 10), (3, 9), (10, 4), (12, 8), (9, 6)]:
        g = gcd(w, h)
        items.append(item(
            f"Ruas garis dari (0, 0) ke ({w}, {h}) digambar pada kertas berpetak. Banyak titik dengan koordinat bilangan bulat yang dilewati ruas itu (termasuk kedua ujungnya) adalah …",
            mc(g + 1, [g, w + 1, h + 1]),
            f"FPB({w}, {h}) = {g}, jadi garis melewati titik kisi setiap ({w // g}, {h // g}) langkah: ada {g} langkah dan {g + 1} titik."))
    rng.shuffle(items)
    for it in items:
        assert len({c["visual"].get("text", str(c["visual"])) for c in it["choices"]}) == len(it["choices"]), it
    L.append(dict(slug="teka-teki-gaya-emc", title="Teka-teki gaya EMC", kognitif="reasoning",
                  indikator="Teka-teki koordinat campuran gaya EMC", emc="", content=manual(items)))

    # EB10 — tantangan campuran.
    L.append(dict(slug="tantangan-geometri-koordinat", title="Tantangan geometri koordinat",
                  kognitif="reasoning", indikator="Gabungan semua indikator geometri koordinat", emc="",
                  content=mix(
                      L[2]["content"],
                      L[3]["content"],
                      as_choice(L[4]["content"], [("dx + dy", "lupa-miring"), ("2 * (dx + dy)", "persegi-panjang"), ("dx + dy + c + 1", "lain")]),
                      as_choice(part_of(L[5]["content"], 0), [("d * (p + q)", "lupa-setengah"), ("d * p / 2", "satu-segitiga"), ("(p + q) * d / 2 + d", "lain")]),
                  )))

    # EB11 — game Harta Karun Koordinat.
    L.append(dict(slug="game-harta-karun-koordinat", title="Game harta karun koordinat",
                  kognitif="applying", indikator="Game: menandai titik di bidang koordinat", emc="",
                  content=mix(
                      ("coord-game", {"x": [-5, 5], "y": [-5, 5], "mode": "plot", "steps": 4}),
                      ("coord-game", {"x": [-6, 6], "y": [-5, 5], "mode": "move", "steps": 4}),
                      ("coord-game", {"x": [-5, 6], "y": [-4, 6], "mode": "mix", "steps": 3}),
                  )))
    return L
