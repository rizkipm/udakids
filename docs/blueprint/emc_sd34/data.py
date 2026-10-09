"""EE Statistika, EF Peluang (kisi-kisi EMC Kelas 3–4, D-101)."""

from __future__ import annotations

import random
from collections import Counter
from fractions import Fraction
from itertools import product
from math import comb

from core import NAMES, as_choice, expr, frac_choice, frac_d, harder, item, manual, mc, mix, part_of

NAMA1 = ["Ayu", "Bima", "Citra"]
NAMA2 = ["Dimas", "Eka", "Fajar"]
NAMA3 = ["Gita", "Hasan", "Intan"]
NAMA4 = ["Joko", "Kirana", "Lukman", "Made"]


def fmc(answer: Fraction, wrongs) -> list:
    """Pilihan pecahan: jawaban + 3 pengecoh bernilai beda (0 < p ≤ 1)."""
    seen = {answer}
    out = []
    for w in wrongs:
        w = Fraction(w)
        if 0 < w <= 1 and w not in seen:
            seen.add(w)
            out.append(w)
        if len(out) == 3:
            break
    k = 1
    while len(out) < 3:
        for cand in (answer + Fraction(1, answer.denominator * k), answer - Fraction(1, answer.denominator * k)):
            if 0 < cand <= 1 and cand not in seen:
                seen.add(cand)
                out.append(cand)
                if len(out) == 3:
                    break
        k += 1
    return [frac_choice(v) for v in [answer, *out]]


# =============================================================== EE


def ee_levels():
    rng = random.Random("EE")
    L = []

    # EE1 — rata-rata data (mudah).
    L.append(dict(
        slug="rata-rata-sekumpulan-data", title="Rata-rata sekumpulan data",
        kognitif="applying", indikator="Menghitung rata-rata sekumpulan data", emc="",
        content=mix(
            expr("Nilai ulangan lima anak: {a}, {b}, {c}, {d}, dan {e}. Rata-rata nilai mereka adalah …",
                 "Jumlahkan semua nilai: {=a+b+c+d+e}. Bagi dengan banyak data: {=a+b+c+d+e} : 5 = {answer}.",
                 vars={"a": [50, 100], "b": [50, 100], "c": [50, 100], "d": [50, 100], "e": [50, 100]},
                 constraint="(a + b + c + d + e) % 5 == 0", answer="(a + b + c + d + e) / 5",
                 distractors=[("(a + b + c + d + e) / 4", "dibagi-4"), ("(a + e) / 2", "ujung-saja"), ("c", "data-tengah")]),
            expr("Selama 4 hari, {nama} membaca {a}, {b}, {c}, dan {d} halaman buku. Rata-rata halaman yang dibaca setiap hari adalah …",
                 "Jumlah = {=a+b+c+d} halaman. Rata-rata = {=a+b+c+d} : 4 = {answer} halaman.",
                 vars={"a": [5, 40], "b": [5, 40], "c": [5, 40], "d": [5, 40]}, words={"nama": NAMES},
                 constraint="(a + b + c + d) % 4 == 0", answer="(a + b + c + d) / 4",
                 distractors=[("a + b + c + d", "jumlah"), ("(a + b + c + d) / 2", "dibagi-2"), ("(a + d) / 2", "ujung-saja")]),
        )))

    # EE2 — data hilang dari rata-rata baru (EMC no. 4, mudah).
    L.append(dict(
        slug="mencari-data-dari-rata-rata-baru", title="Mencari data dari rata-rata baru",
        kognitif="applying", indikator="Menentukan data yang hilang dari rata-rata baru", emc="4",
        content=expr(
            "Nilai kuis {n1}, {n2}, dan {n3} adalah {a}, {b}, dan {c}. {n4} mengikuti kuis susulan. Setelah nilai {n4} dimasukkan, rata-rata nilai keempat anak menjadi {m}. Nilai {n4} adalah …",
            "Jumlah nilai empat anak = 4 × {m} = {=4*m}. Jumlah nilai tiga anak = {=a+b+c}. Nilai {n4} = {=4*m} − {=a+b+c} = {answer}.",
            vars={"a": [5, 10], "b": [5, 10], "c": [5, 10], "m": [6, 9]},
            words={"n1": NAMA1, "n2": NAMA2, "n3": NAMA3, "n4": NAMA4},
            derived={"x": "4 * m - (a + b + c)"}, constraint="x >= 1 && x <= 10 && x != m",
            answer="x", distractors=[("m", "rata-rata"), ("4 * m", "jumlah"), ("3 * m - (a + b + c) + m + 1", "lain")]),
    ))

    # EE3 — median & modus (bank soal).
    items = []
    keys = set()
    while len(items) < 36:
        n = rng.choice([7, 8, 9])
        data = [rng.randint(3, 12) for _ in range(n)]
        cnt = Counter(data).most_common()
        ask = rng.choice(["median", "modus"])
        if ask == "modus":
            if len(cnt) > 1 and cnt[0][1] == cnt[1][1]:
                continue
            ans = cnt[0][0]
            why = f"Modus = data yang paling sering muncul: {ans} muncul {cnt[0][1]} kali."
            wrong = [sorted(data)[n // 2], max(data), round(sum(data) / n)]
        else:
            srt = sorted(data)
            if n % 2:
                ans = srt[n // 2]
                why = f"Urutkan: {', '.join(map(str, srt))}. Data ke-{n // 2 + 1} (tengah) adalah {ans}."
            else:
                a, b = srt[n // 2 - 1], srt[n // 2]
                if (a + b) % 2:
                    continue
                ans = (a + b) // 2
                why = f"Urutkan: {', '.join(map(str, srt))}. Dua data tengah {a} dan {b}, median = ({a} + {b}) : 2 = {ans}."
            wrong = [data[n // 2], cnt[0][0], max(data) - min(data)]
        key = (ask, tuple(data))
        if key in keys:
            continue
        keys.add(key)
        items.append(item(
            f"Data banyak gol tim sekolah dalam {n} pertandingan: {', '.join(map(str, data))}. {ask.capitalize()} data tersebut adalah …",
            mc(ans, wrong), why))
    L.append(dict(slug="median-dan-modus", title="Median dan modus", kognitif="applying",
                  indikator="Menentukan median dan modus data tunggal", emc="", content=manual(items)))

    # EE4 — rata-rata dari tabel frekuensi (EMC no. 10, sedang).
    table = {"kind": "table", "headers": ["Berat (kg)", "Banyak semangka"],
             "rows": [["{=t1/10}", "{f1}"], ["{=t2/10}", "{f2}"], ["{=t3/10}", "{f3}"], ["{=t4/10}", "{f4}"]],
             "caption": "Semangka di kios Bu {nama}"}
    L.append(dict(
        slug="rata-rata-dari-tabel-frekuensi", title="Rata-rata dari tabel frekuensi",
        kognitif="applying", indikator="Menghitung rata-rata dari tabel frekuensi", emc="10",
        content=expr(
            "Tabel menunjukkan berat semangka di kios Bu {nama}. Rata-rata berat semangka itu adalah … kg.",
            "Kalikan setiap berat dengan banyaknya, lalu jumlahkan: {=s10/10} kg. Banyak semangka = {n}. Rata-rata = {=s10/10} : {n} = {answer}.",
            vars={"t1": [20, 34], "t2": [35, 44], "t3": [45, 54], "t4": [55, 70],
                  "f1": [1, 9], "f2": [1, 9], "f3": [1, 9], "f4": [1, 9]},
            words={"nama": ["Ani", "Sri", "Tuti", "Wati", "Rina"]}, stimulus=[table],
            derived={"n": "f1 + f2 + f3 + f4", "s10": "t1 * f1 + t2 * f2 + t3 * f3 + t4 * f4"},
            constraint="(s10 * 10) % n == 0 && n >= 10", fmt_="decimal", answer="s10 / (10 * n)", unit="kg",
            distractors=[("(t1 + t2 + t3 + t4) / 40", "tanpa-frekuensi"), ("s10 / (10 * n) + 0.2", "lain"),
                         ("s10 / (10 * n) - 0.3", "lain-2")]),
    ))

    # EE5 — rata-rata gabungan (sedang).
    L.append(dict(
        slug="rata-rata-gabungan-dua-kelompok", title="Rata-rata gabungan dua kelompok",
        kognitif="applying", indikator="Menghitung rata-rata gabungan dua kelompok data", emc="",
        content=expr(
            "Rata-rata nilai {n1} siswa kelas 4A adalah {m1}, dan rata-rata nilai {n2} siswa kelas 4B adalah {m2}. Rata-rata nilai seluruh siswa kedua kelas adalah …",
            "Jumlah nilai 4A = {n1} × {m1} = {=n1*m1}, 4B = {n2} × {m2} = {=n2*m2}. Rata-rata gabungan = ({=n1*m1} + {=n2*m2}) : {=n1+n2} = {answer}.",
            vars={"n1": [10, 30], "n2": [10, 30], "mm": [65, 85], "q": [1, 3]},
            derived={"m1": "mm + q * n2 / gcd(n1, n2)", "m2": "mm - q * n1 / gcd(n1, n2)"},
            constraint="n1 != n2 && m1 <= 98 && m2 >= 45",
            answer="(n1 * m1 + n2 * m2) / (n1 + n2)",
            distractors=[("(m1 + m2) / 2", "rata-rata-biasa"), ("m1 + m2", "dijumlah"), ("max(m1, m2)", "terbesar")]),
    ))

    # EE6 — nilai data yang sama dari rata-rata (EMC no. 11, sulit).
    L.append(dict(
        slug="nilai-yang-sama-dari-rata-rata", title="Nilai yang sama dari rata-rata",
        kognitif="applying", indikator="Menentukan nilai data yang sama dari rata-rata keseluruhan", emc="11",
        content=expr(
            "Ada {n} anak mengikuti kuis. Semua anak mendapat nilai yang sama, kecuali {nama} yang mendapat {h}. Rata-rata nilai mereka {m}. Nilai setiap anak lainnya adalah …",
            "Jumlah semua nilai = {n} × {m} = {=n*m}. Tanpa {nama}: {=n*m} − {h} = {=n*m-h}, dibagi {=n-1} anak = {answer}.",
            vars={"n": [4, 8], "m": [4, 9], "h": [1, 10]}, words={"nama": NAMES},
            derived={"x": "(n * m - h) / (n - 1)"}, constraint="(n * m - h) % (n - 1) == 0 && x >= 1 && x != h && x != m && x <= 10",
            answer="x", distractors=[("m", "rata-rata"), ("(n * m - h) / n", "dibagi-semua"), ("n * m - h", "lupa-dibagi")]),
    ))

    # EE7 — data terurut dengan rata-rata (EMC no. 31, sulit, isian).
    so = {"vars": {"lv": [4, 9], "j": {"values": [0, 1, 2]}, "r1": [0, 2], "r2": [0, 2], "r3": [0, 2], "e2": [0, 3]},
          "derived": {"a3": "lv - r3", "a2": "a3 - r2", "a1": "a2 - r1", "x": "lv + floor(j / 2)",
                      "y": "lv + ceil(j / 2)", "b1": "lv + 1", "b2": "lv + 1 + e2",
                      "tot": "a1 + a2 + a3 + lv + x + y + b1 + b2", "m": "tot / 8"},
          "constraint": "tot % 8 == 0 && a1 >= 1"}
    L.append(dict(
        slug="data-terurut-dengan-rata-rata", title="Data terurut dengan rata-rata",
        kognitif="analyzing", indikator="Menentukan data yang hilang pada data terurut dengan rata-rata diketahui", emc="31",
        content=mix(
            expr("{nama} mencatat skor 8 kali latihan memanah, diurutkan dari yang terkecil: {a1}, {a2}, {a3}, {lv}, X, Y, {b1}, {b2}. Semua skor bilangan bulat dan rata-ratanya {m}. Berapa skor X?",
                 "Jumlah semua data = 8 × {m} = {tot}. Jumlah data yang diketahui = {=tot-x-y}, jadi X + Y = {=x+y}. Karena urut, {lv} ≤ X ≤ Y ≤ {b1}. Satu-satunya pasangan: X = {x} dan Y = {y}.",
                 **so, words={"nama": NAMES}, answer="x", mode="input"),
            expr("{nama} mencatat skor 8 kali latihan memanah, diurutkan dari yang terkecil: {a1}, {a2}, {a3}, {lv}, X, Y, {b1}, {b2}. Semua skor bilangan bulat dan rata-ratanya {m}. Berapa skor Y?",
                 "Jumlah semua data = 8 × {m} = {tot}. Jumlah data yang diketahui = {=tot-x-y}, jadi X + Y = {=x+y}. Karena urut, {lv} ≤ X ≤ Y ≤ {b1}. Satu-satunya pasangan: X = {x} dan Y = {y}.",
                 **so, words={"nama": NAMES}, answer="y", mode="input"),
        )))

    # EE8 — rata-rata berubah saat data diambil/ditambah (sulit).
    L.append(dict(
        slug="rata-rata-berubah", title="Rata-rata berubah",
        kognitif="analyzing", indikator="Menentukan data yang diambil/ditambah dari perubahan rata-rata", emc="",
        content=mix(
            expr("Rata-rata berat {n} kotak adalah {m} kg. Setelah satu kotak diambil, rata-rata berat {=n-1} kotak sisanya {m2} kg. Berat kotak yang diambil adalah … kg.",
                 "Berat semua kotak = {n} × {m} = {=n*m}. Berat sisanya = {=n-1} × {m2} = {=(n-1)*m2}. Kotak yang diambil = {=n*m} − {=(n-1)*m2} = {answer} kg.",
                 vars={"n": [5, 10], "m": [5, 20], "m2": [4, 21]}, derived={"w": "n * m - (n - 1) * m2"},
                 constraint="w >= 1 && w <= 60 && m2 != m", answer="w", unit="kg",
                 distractors=[("m - m2", "selisih-rata-rata"), ("m", "rata-rata"), ("w + m2", "lain")]),
            expr("Rata-rata tinggi {n} pemain basket {m} cm. Seorang pemain baru bergabung sehingga rata-rata tinggi mereka menjadi {m2} cm. Tinggi pemain baru adalah … cm.",
                 "Jumlah tinggi awal = {n} × {m} = {=n*m}. Jumlah sesudahnya = {=n+1} × {m2} = {=(n+1)*m2}. Tinggi pemain baru = {answer} cm.",
                 vars={"n": [4, 9], "m": [140, 165], "dm": [1, 4]}, derived={"m2": "m + dm", "w": "(n + 1) * m2 - n * m"},
                 answer="w", unit="cm", distractors=[("m2", "rata-rata-baru"), ("m + dm * n", "lain"), ("w - dm", "lain-2")]),
        )))

    # EE9 — teka-teki statistika gaya EMC (bank soal).
    items = []
    for n, m in [(5, 10), (4, 12), (5, 20), (6, 15), (3, 9), (4, 25), (5, 8), (6, 10)]:
        big = n * m - sum(range(1, n))
        items.append(item(
            f"Rata-rata {n} bilangan asli yang berbeda adalah {m}. Bilangan terbesar yang mungkin adalah …",
            mc(big, [n * m, m * 2, big - 1]),
            f"Jumlah semuanya {n} × {m} = {n * m}. Agar yang terbesar sebesar mungkin, yang lain dibuat sekecil mungkin: 1 + 2 + … + {n - 1} = {sum(range(1, n))}. Terbesar = {n * m} − {sum(range(1, n))} = {big}."))
    for k, m, target in [(4, 7, 8), (3, 70, 75), (5, 80, 82), (4, 60, 65), (3, 6, 7), (4, 85, 87), (5, 72, 75)]:
        need = (k + 1) * target - k * m
        items.append(item(
            f"Rata-rata nilai {k} ulangan pertama Rani adalah {m}. Agar rata-rata {k + 1} ulangan menjadi {target}, nilai ulangan ke-{k + 1} harus …",
            mc(need, [target, target + (target - m), need - 1]),
            f"Jumlah yang diperlukan = {k + 1} × {target} = {(k + 1) * target}. Jumlah sekarang = {k} × {m} = {k * m}. Nilai berikutnya = {need}."))
    for a, d, n in [(3, 2, 5), (10, 5, 7), (4, 3, 9), (6, 4, 5), (20, 10, 9), (5, 5, 7)]:
        seq = [a + d * i for i in range(n)]
        items.append(item(
            f"Rata-rata dari {', '.join(map(str, seq))} adalah …",
            mc(seq[n // 2], [sum(seq), seq[-1], seq[n // 2] + d]),
            f"Bilangannya naik teratur ({d} setiap kali) dan banyaknya ganjil, jadi rata-ratanya sama dengan bilangan tengah: {seq[n // 2]}."))
    for x, add in [(12, 3), (20, 5), (15, 4), (30, 10), (8, 2), (50, 7)]:
        items.append(item(
            f"Rata-rata sekumpulan data adalah {x}. Jika setiap data ditambah {add}, rata-ratanya menjadi …",
            mc(x + add, [x, x + 2 * add, x * add]),
            f"Setiap data naik {add}, jadi jumlah naik {add} × banyak data, dan rata-rata naik tepat {add}: {x} + {add} = {x + add}."))
    rng.shuffle(items)
    L.append(dict(slug="teka-teki-gaya-emc", title="Teka-teki gaya EMC", kognitif="reasoning",
                  indikator="Teka-teki statistika campuran gaya EMC", emc="", content=manual(items)))

    # EE10 — tantangan campuran.
    L.append(dict(slug="tantangan-statistika", title="Tantangan statistika", kognitif="reasoning",
                  indikator="Gabungan semua indikator statistika", emc="",
                  content=mix(
                      L[3]["content"], L[5]["content"], part_of(L[7]["content"], 0),
                      as_choice(part_of(L[6]["content"], 0), [("y", "tertukar"), ("m", "rata-rata"), ("x + 2", "lain")]),
                  )))

    # EE11 — game Diagram Ajaib.
    L.append(dict(slug="game-diagram-ajaib", title="Game diagram ajaib", kognitif="applying",
                  indikator="Game: membuat diagram batang dari data", emc="",
                  content=mix(
                      ("chart-game", {"title": "Medali lomba 17-an tiap kelas", "unit": "medali", "scale": 2, "steps": [1, 8],
                                      "items": [{"label": "3A"}, {"label": "3B"}, {"label": "4A"}, {"label": "4B"}]}),
                      ("chart-game", {"title": "Pengunjung perpustakaan", "unit": "anak", "scale": 5, "steps": [1, 9],
                                      "items": [{"label": "Senin"}, {"label": "Selasa"}, {"label": "Rabu"}, {"label": "Kamis"}, {"label": "Jumat"}]}),
                      ("chart-game", {"title": "Sampah daur ulang (kg)", "unit": "kg", "scale": 10, "steps": [1, 9],
                                      "items": [{"label": "Kertas"}, {"label": "Plastik"}, {"label": "Kaleng"}]}),
                  )))
    return L


# =============================================================== EF


def dice2():
    return list(product(range(1, 7), repeat=2))


def ef_levels():
    rng = random.Random("EF")
    L = []

    # EF1 — peluang menang/kalah/seri dengan satu dadu (EMC no. 2, mudah).
    items = []
    faces = list(range(1, 7))
    combos = []
    for lose in ([a] for a in faces):
        for tie in ([b] for b in faces if b not in lose):
            combos.append((lose, tie))
    for a in faces:
        for b in faces:
            if a < b:
                for c in faces:
                    if c not in (a, b):
                        combos.append(([a, b], [c]))
    rng.shuffle(combos)
    seen = set()
    for lose, tie in combos:
        if len(items) >= 40:
            break
        win = 6 - len(lose) - len(tie)
        ask = rng.choice(["menang", "tidak kalah"])
        key = (tuple(lose), tuple(tie), ask)
        if key in seen:
            continue
        seen.add(key)
        nama, lawan = rng.sample(NAMES, 2)
        good = win if ask == "menang" else win + len(tie)
        ans = Fraction(good, 6)
        ltxt = " atau ".join(map(str, lose))
        ttxt = " atau ".join(map(str, tie))
        items.append(item(
            f"{nama} dan {lawan} bermain dadu. {nama} melempar sebuah dadu sekali. Ia kalah jika muncul mata {ltxt}, hasilnya seri jika muncul mata {ttxt}, dan ia menang jika muncul mata lainnya. Peluang {nama} {ask} adalah …",
            fmc(ans, [Fraction(len(lose), 6), Fraction(len(lose) + len(tie), 6), Fraction(win, 6) if ask != "menang" else Fraction(win + len(tie), 6), Fraction(1, 6)]),
            f"Ada 6 mata dadu. {nama} {ask} jika muncul {good} mata dari 6. Peluang = {good}/6{f' = {ans.numerator}/{ans.denominator}' if ans.denominator != 6 else ''}."))
    L.append(dict(slug="peluang-menang-dengan-dadu", title="Peluang menang dengan dadu", kognitif="applying",
                  indikator="Menghitung peluang dari aturan menang/kalah/seri pada pelemparan dadu", emc="2",
                  content=manual(items)))

    # EF2 — peluang mengambil satu benda (mudah).
    L.append(dict(
        slug="peluang-mengambil-satu-benda", title="Peluang mengambil satu benda",
        kognitif="applying", indikator="Menghitung peluang mengambil satu benda dari kantong", emc="",
        content=expr(
            "Di dalam kantong ada {m} permen rasa stroberi, {b} rasa melon, dan {h} rasa jeruk. {nama} mengambil satu permen tanpa melihat. Peluang terambil permen rasa stroberi adalah …",
            "Banyak semua permen = {m} + {b} + {h} = {=m+b+h}. Permen stroberi = {m}. Peluang = {m}/{=m+b+h}, paling sederhana {answer}.",
            vars={"m": [1, 8], "b": [1, 8], "h": [1, 8]}, words={"nama": NAMES}, fmt_="fraction",
            fraction={"num": "m", "den": "m + b + h"},
            distractors=[frac_d("m", "b + h", "banding-bukan-peluang"), frac_d("b + h", "m + b + h", "kebalikan"),
                         frac_d("1", "m + b + h", "satu-permen"), frac_d("m", "m + b + h + 1", "lain")]),
    ))

    # EF3 — banyak hasil yang mungkin (mudah).
    L.append(dict(
        slug="banyak-hasil-yang-mungkin", title="Banyak hasil yang mungkin",
        kognitif="understanding", indikator="Menentukan banyak anggota ruang sampel", emc="",
        content=mix(
            expr("{n} koin dilempar bersamaan. Banyak hasil yang mungkin (ruang sampel) adalah …",
                 "Setiap koin punya 2 kemungkinan (angka atau gambar). {n} koin: 2 dikali sebanyak {n} kali = {answer}.",
                 vars={"n": [2, 6]}, answer="pow(2, n)", distractors=[("2 * n", "dua-kali-n"), ("n + 1", "banyak-angka"), ("n * n", "kuadrat")]),
            expr("Sebuah dadu dan {n} koin dilempar bersamaan. Banyak hasil yang mungkin adalah …",
                 "Dadu punya 6 kemungkinan dan setiap koin 2 kemungkinan: 6 × {=pow(2,n)} = {answer}.",
                 vars={"n": [1, 4]}, answer="6 * pow(2, n)", distractors=[("6 + 2 * n", "dijumlah"), ("6 * 2 * n", "dua-kali-n"), ("pow(2, n)", "lupa-dadu")]),
            expr("{n} dadu dilempar bersamaan. Banyak hasil yang mungkin adalah …",
                 "Setiap dadu punya 6 kemungkinan: 6 dikali sebanyak {n} kali = {answer}.",
                 vars={"n": [2, 3]}, answer="pow(6, n)", distractors=[("6 * n", "enam-kali-n"), ("6 + n", "dijumlah"), ("pow(6, n) / 2", "setengah")]),
        )))

    # EF4 — peluang dua dadu (sedang).
    L.append(dict(
        slug="peluang-jumlah-dua-dadu", title="Peluang jumlah dua dadu",
        kognitif="applying", indikator="Menghitung peluang jumlah/selisih mata dua dadu", emc="",
        content=mix(
            expr("Dua dadu dilempar bersamaan. Peluang jumlah kedua mata dadu sama dengan {t} adalah …",
                 "Ada 36 pasangan mata dadu. Pasangan berjumlah {t} ada {=6-abs(t-7)}. Peluang = {=6-abs(t-7)}/36, paling sederhana {answer}.",
                 vars={"t": [2, 12]}, fmt_="fraction", fraction={"num": "6 - abs(t - 7)", "den": "36"},
                 distractors=[frac_d("1", "11", "sebelas-jumlah"), frac_d("6 - abs(t - 7)", "12", "dua-belas"),
                              frac_d("1", "36", "satu-pasangan"), frac_d("t", "36", "jumlah-sebagai-banyak")]),
            expr("Dua dadu dilempar bersamaan. Peluang selisih kedua mata dadu sama dengan {d} adalah …",
                 "Pasangan dengan selisih {d}: ada {=6-d} pasangan (a, a + {d}) dan {=6-d} pasangan dibalik, jadi {=2*(6-d)}. Peluang = {=2*(6-d)}/36, paling sederhana {answer}.",
                 vars={"d": [1, 5]}, fmt_="fraction", fraction={"num": "2 * (6 - d)", "den": "36"},
                 distractors=[frac_d("6 - d", "36", "lupa-dibalik"), frac_d("1", "6", "satu-per-enam"),
                              frac_d("d", "36", "selisih-sebagai-banyak")]),
        )))

    # EF5 — dua bola sekaligus (EMC no. 21, sedang).
    bb = {"vars": {"r": [2, 5], "k": [2, 5]}, "derived": {"t": "r + k", "pairs": "t * (t - 1) / 2"}}
    L.append(dict(
        slug="peluang-mengambil-dua-bola", title="Peluang mengambil dua bola",
        kognitif="applying", indikator="Menghitung peluang pengambilan dua bola sekaligus tanpa pengembalian", emc="21",
        content=mix(
            expr("Sebuah kotak berisi {r} bola kuning dan {k} bola hijau. {nama} mengambil 2 bola sekaligus tanpa melihat. Peluang terambil 1 bola kuning dan 1 bola hijau adalah …",
                 "Banyak cara memilih 2 bola dari {t} bola = {t} × {=t-1} : 2 = {pairs}. Pasangan kuning-hijau = {r} × {k} = {=r*k}. Peluang = {=r*k}/{pairs}, paling sederhana {answer}.",
                 **bb, words={"nama": NAMES}, fmt_="fraction", fraction={"num": "r * k", "den": "pairs"},
                 distractors=[frac_d("r * k", "t * t", "dengan-pengembalian"), frac_d("r", "t", "satu-bola"),
                              frac_d("r * k", "t * (t - 1)", "berurutan"), frac_d("1", "2", "setengah")]),
            expr("Sebuah kotak berisi {r} bola kuning dan {k} bola hijau. {nama} mengambil 2 bola sekaligus tanpa melihat. Peluang kedua bola berwarna kuning adalah …",
                 "Banyak cara memilih 2 bola = {pairs}. Cara memilih 2 bola kuning = {r} × {=r-1} : 2 = {=r*(r-1)/2}. Peluang = {=r*(r-1)/2}/{pairs}, paling sederhana {answer}.",
                 **bb, words={"nama": NAMES}, fmt_="fraction", fraction={"num": "r * (r - 1) / 2", "den": "pairs"},
                 distractors=[frac_d("r * r", "t * t", "dengan-pengembalian"), frac_d("r", "t", "satu-bola"),
                              frac_d("r * k", "pairs", "beda-warna")]),
        )))

    # EF6 — peluang beberapa koin (EMC no. 19, sulit). Bank soal.
    items = []
    for n in (3, 4, 5):
        tot = 2 ** n
        for k in range(0, n + 1):
            ways = comb(n, k)
            ans = Fraction(ways, tot)
            items.append(item(
                f"{n} uang logam dilempar bersamaan. Peluang muncul tepat {k} sisi angka adalah …",
                fmc(ans, [Fraction(1, tot), Fraction(k, n + 1), Fraction(k, tot), Fraction(1, n + 1)]),
                f"Banyak hasil = 2 pangkat {n} = {tot}. Cara memilih {k} koin yang angka dari {n} koin = {ways}. Peluang = {ways}/{tot}{f' = {ans.numerator}/{ans.denominator}' if ans.denominator != tot else ''}."))
        same = Fraction(2, tot)
        items.append(item(
            f"{n} uang logam dilempar bersamaan. Peluang semua uang logam menunjukkan sisi yang sama adalah …",
            fmc(same, [Fraction(1, tot), Fraction(1, 2), Fraction(n, tot)]),
            f"Hanya 2 hasil yang semua sama: semua angka atau semua gambar. Peluang = 2/{tot} = {same.numerator}/{same.denominator}."))
    for n, k in [(4, 3), (5, 4), (5, 3), (3, 2)]:
        tot = 2 ** n
        ways = comb(n, k) + comb(n, n - k) if k != n - k else comb(n, k)
        ans = Fraction(ways, tot)
        items.append(item(
            f"Pada pelemparan {n} keping uang logam sekaligus, berapa peluang hasilnya terdiri atas {k} sisi sejenis dan {n - k} sisi jenis lainnya?",
            fmc(ans, [Fraction(comb(n, k), tot), Fraction(1, tot), Fraction(k, n)]),
            f"Bisa {k} angka dan {n - k} gambar ({comb(n, k)} cara) atau {k} gambar dan {n - k} angka ({comb(n, n - k)} cara). Peluang = {ways}/{tot} = {ans.numerator}/{ans.denominator}."))
    rng.shuffle(items)
    L.append(dict(slug="peluang-beberapa-uang-logam", title="Peluang beberapa uang logam", kognitif="analyzing",
                  indikator="Menghitung peluang kombinasi sisi pada beberapa koin", emc="19", content=manual(items)))

    # EF7 — peluang komplemen (sulit). Bank soal.
    items = []
    for n in (2, 3, 4, 5):
        tot = 2 ** n
        ans = Fraction(tot - 1, tot)
        items.append(item(
            f"{n} uang logam dilempar bersamaan. Peluang muncul paling sedikit satu sisi angka adalah …",
            fmc(ans, [Fraction(1, tot), Fraction(1, 2), Fraction(n, tot)]),
            f"Kebalikannya: tidak ada angka sama sekali (semua gambar), peluangnya 1/{tot}. Jadi peluang paling sedikit satu angka = 1 − 1/{tot} = {tot - 1}/{tot}."))
    events = [
        ("tidak ada mata 6 sama sekali", lambda a, b: a != 6 and b != 6),
        ("paling sedikit satu dadu bermata 6", lambda a, b: a == 6 or b == 6),
        ("jumlah mata dadunya bukan 7", lambda a, b: a + b != 7),
        ("kedua mata dadu tidak sama", lambda a, b: a != b),
        ("paling sedikit satu dadu bermata ganjil", lambda a, b: a % 2 or b % 2),
        ("jumlah mata dadunya lebih dari 3", lambda a, b: a + b > 3),
        ("jumlah mata dadunya kurang dari 11", lambda a, b: a + b < 11),
        ("paling sedikit satu dadu bermata 1", lambda a, b: a == 1 or b == 1),
    ]
    for text, f in events:
        cnt = sum(1 for a, b in dice2() if f(a, b))
        ans = Fraction(cnt, 36)
        items.append(item(
            f"Dua dadu dilempar bersamaan. Peluang {text} adalah …",
            fmc(ans, [Fraction(36 - cnt, 36), Fraction(cnt, 36) - Fraction(1, 36), Fraction(1, 6), Fraction(5, 6)]),
            f"Hitung kejadian kebalikannya (lebih sedikit), lalu kurangkan dari 36. Ada {cnt} pasangan yang cocok dari 36, jadi peluangnya {cnt}/36{f' = {ans.numerator}/{ans.denominator}' if ans.denominator != 36 else ''}."))
    for n, k in [(10, 3), (12, 5), (20, 4), (15, 2), (8, 3), (25, 6)]:
        ans = Fraction(n - k, n)
        items.append(item(
            f"Dalam kotak undian ada {n} kertas bernomor 1 sampai {n}. {k} di antaranya berhadiah. Peluang mengambil kertas yang TIDAK berhadiah adalah …",
            fmc(ans, [Fraction(k, n), Fraction(1, n), Fraction(n - k, n + k)]),
            f"Peluang tidak berhadiah = 1 − peluang berhadiah = 1 − {k}/{n} = {n - k}/{n}."))
    rng.shuffle(items)
    L.append(dict(slug="peluang-kejadian-kebalikan", title="Peluang kejadian kebalikan", kognitif="analyzing",
                  indikator="Menghitung peluang dengan kejadian kebalikan (komplemen)", emc="", content=manual(items)))

    # EF8 — peluang dua dadu: kejadian khusus (sulit). Bank soal.
    items = []
    ev = [
        ("hasil kali mata dadunya genap", lambda a, b: (a * b) % 2 == 0),
        ("hasil kali mata dadunya ganjil", lambda a, b: (a * b) % 2 == 1),
        ("jumlah mata dadunya bilangan prima", lambda a, b: a + b in (2, 3, 5, 7, 11)),
        ("jumlah mata dadunya kelipatan 3", lambda a, b: (a + b) % 3 == 0),
        ("jumlah mata dadunya kelipatan 4", lambda a, b: (a + b) % 4 == 0),
        ("mata dadu pertama lebih besar daripada mata dadu kedua", lambda a, b: a > b),
        ("hasil kali mata dadunya 12", lambda a, b: a * b == 12),
        ("hasil kali mata dadunya lebih dari 20", lambda a, b: a * b > 20),
        ("kedua mata dadunya bilangan prima", lambda a, b: a in (2, 3, 5) and b in (2, 3, 5)),
        ("mata dadu yang terbesar adalah 4", lambda a, b: max(a, b) == 4),
        ("mata dadu yang terkecil adalah 2", lambda a, b: min(a, b) == 2),
        ("salah satu mata dadu dua kali mata dadu lainnya", lambda a, b: a == 2 * b or b == 2 * a),
        ("jumlah mata dadunya genap", lambda a, b: (a + b) % 2 == 0),
        ("selisih mata dadunya paling sedikit 3", lambda a, b: abs(a - b) >= 3),
    ]
    for text, f in ev:
        cnt = sum(1 for a, b in dice2() if f(a, b))
        assert 0 < cnt < 36
        ans = Fraction(cnt, 36)
        items.append(item(
            f"Dua dadu dilempar bersamaan. Peluang {text} adalah …",
            fmc(ans, [Fraction(36 - cnt, 36), Fraction(cnt, 6) if cnt < 6 else Fraction(1, 6), Fraction(cnt + 1, 36), Fraction(cnt - 1, 36)]),
            f"Buat tabel 6 × 6 pasangan mata dadu, lalu tandai yang memenuhi: ada {cnt} dari 36. Peluang = {cnt}/36{f' = {ans.numerator}/{ans.denominator}' if ans.denominator != 36 else ''}."))
    rng.shuffle(items)
    L.append(dict(slug="peluang-kejadian-dua-dadu", title="Peluang kejadian dua dadu", kognitif="analyzing",
                  indikator="Menghitung peluang kejadian khusus pada dua dadu dengan tabel", emc="", content=manual(items)))

    # EF9 — teka-teki peluang gaya EMC (bank soal).
    items = []
    for word in ["MATEMATIKA", "OLIMPIADE", "INDONESIA", "PELUANG", "SEKOLAH", "BELAJAR", "KALKULATOR"]:
        c = Counter(word)
        letter, k = c.most_common(1)[0]
        ans = Fraction(k, len(word))
        items.append(item(
            f"Setiap huruf kata {word} ditulis pada kartu, lalu kartu dikocok. Peluang mengambil kartu berhuruf {letter} adalah …",
            fmc(ans, [Fraction(1, len(word)), Fraction(1, len(c)), Fraction(k, len(c))]),
            f"Ada {len(word)} kartu dan huruf {letter} muncul {k} kali. Peluang = {k}/{len(word)}{f' = {ans.numerator}/{ans.denominator}' if ans.denominator != len(word) else ''}."))
    for n, what, f in [(20, "bilangan prima", lambda x: x in (2, 3, 5, 7, 11, 13, 17, 19)),
                       (30, "kelipatan 4", lambda x: x % 4 == 0), (25, "bilangan kuadrat", lambda x: x in (1, 4, 9, 16, 25)),
                       (12, "faktor dari 12", lambda x: 12 % x == 0), (40, "kelipatan 6", lambda x: x % 6 == 0),
                       (50, "berangka satuan 7", lambda x: x % 10 == 7), (36, "faktor dari 36", lambda x: 36 % x == 0)]:
        cnt = sum(1 for x in range(1, n + 1) if f(x))
        ans = Fraction(cnt, n)
        items.append(item(
            f"Kartu bernomor 1 sampai {n} dikocok, lalu diambil satu kartu. Peluang terambil kartu bernomor {what} adalah …",
            fmc(ans, [Fraction(cnt + 1, n), Fraction(1, n), Fraction(cnt, n + 1)]),
            f"Daftar nomor yang merupakan {what} dari 1 sampai {n}: ada {cnt}. Peluang = {cnt}/{n}{f' = {ans.numerator}/{ans.denominator}' if ans.denominator != n else ''}."))
    for r, k in [(3, 2), (4, 1), (2, 3), (5, 3), (1, 4), (3, 3)]:
        t = r + k
        ans = Fraction(r * r, t * t)
        items.append(item(
            f"Kantong berisi {r} kelereng merah dan {k} kelereng biru. Diambil satu kelereng, dicatat warnanya, lalu dikembalikan. Kemudian diambil lagi satu kelereng. Peluang kedua kelereng berwarna merah adalah …",
            fmc(ans, [Fraction(r, t), Fraction(r * (r - 1), t * (t - 1)) if r > 1 else Fraction(1, t * t), Fraction(2 * r, t * t)]),
            f"Karena dikembalikan, setiap pengambilan peluang merahnya {r}/{t}. Dua kali: {r}/{t} × {r}/{t} = {r * r}/{t * t}."))
    rng.shuffle(items)
    L.append(dict(slug="teka-teki-gaya-emc", title="Teka-teki gaya EMC", kognitif="reasoning",
                  indikator="Teka-teki peluang campuran gaya EMC", emc="", content=manual(items)))

    # EF10 — tantangan campuran.
    L.append(dict(slug="tantangan-peluang", title="Tantangan peluang", kognitif="reasoning",
                  indikator="Gabungan semua indikator peluang", emc="",
                  content=mix(part_of(L[3]["content"], 0), part_of(L[3]["content"], 1),
                              part_of(L[4]["content"], 0), part_of(L[4]["content"], 1),
                              harder(L[1]["content"], vars={"m": [3, 12], "b": [2, 12], "h": [2, 12]}))))

    # EF11 — game Eksperimen Peluang.
    L.append(dict(slug="game-eksperimen-peluang", title="Game eksperimen peluang", kognitif="analyzing",
                  indikator="Game: mendaftar ruang sampel lalu menghitung peluang", emc="",
                  content=mix(
                      ("chance-game", {"space": "dice2", "events": [
                          {"text": "jumlah matanya 7", "test": "s == 7"},
                          {"text": "jumlah matanya 9", "test": "s == 9"},
                          {"text": "kedua matanya sama", "test": "a == b"},
                          {"text": "jumlah matanya lebih dari 9", "test": "s > 9"},
                          {"text": "selisih matanya 2", "test": "abs(a - b) == 2"}]}),
                      ("chance-game", {"space": "coins3", "events": [
                          {"text": "muncul tepat 2 angka", "test": "h == 2"},
                          {"text": "muncul paling sedikit 2 gambar", "test": "g >= 2"},
                          {"text": "koin pertama angka", "test": "c1 == 1"}]}),
                      ("chance-game", {"space": "coins4", "events": [
                          {"text": "tiga koin sama dan satu berbeda", "test": "h == 3 || g == 3"},
                          {"text": "angka dan gambar sama banyak", "test": "h == 2"}]}),
                      ("chance-game", {"space": "bag", "bag": {"merah": 2, "biru": 3}, "simplify": False, "events": [
                          {"text": "warnanya berbeda", "test": "merah == 1"},
                          {"text": "keduanya biru", "test": "biru == 2"}]}),
                  )))
    return L
