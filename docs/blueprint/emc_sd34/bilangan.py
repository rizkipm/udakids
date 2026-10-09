"""EC Bilangan & Aljabar, ED Rasio, Persen & Aritmetika Sosial (kisi-kisi EMC Kelas 3–4, D-101)."""

from __future__ import annotations

import random
from math import comb

from core import (NAMES, as_choice, expr, fmt, game, harder, item, manual, mc, mix, part_of, rp,
                  text_choice)

MAKAN = ["bakso", "mi ayam", "soto", "nasi goreng", "gado-gado", "pecel", "nasi uduk"]
MINUM1 = ["es teh", "teh hangat", "air mineral"]
MINUM2 = ["es jeruk", "jus alpukat", "es cokelat", "jus mangga"]
ALAT1 = ["pensil", "penghapus", "buku tulis", "spidol"]
ALAT2 = ["penggaris", "pulpen", "krayon", "map plastik"]
NAMA1 = ["Ayu", "Bima", "Citra", "Dimas", "Eka", "Fajar"]
NAMA2 = ["Gita", "Hasan", "Intan", "Joko", "Kirana", "Lukman"]
NAMA3 = ["Made", "Nyoman", "Siti", "Putu"]
NAMA4 = ["Wulan", "Yusuf", "Tiara", "Raka"]

# =============================================================== EC


PARITY_FORMS = [
    # (teks, ucapan, koefisien n, konstanta)
    ("2n", "2 n", 2, 0), ("2n + 1", "2 n tambah 1", 2, 1), ("3n", "3 n", 3, 0),
    ("3n + 1", "3 n tambah 1", 3, 1), ("n + 1", "n tambah 1", 1, 1), ("n + 2", "n tambah 2", 1, 2),
    ("n + 3", "n tambah 3", 1, 3), ("4n − 2", "4 n kurang 2", 4, -2), ("5n", "5 n", 5, 0),
    ("2n − 3", "2 n kurang 3", 2, -3), ("3n + 2", "3 n tambah 2", 3, 2), ("6n + 5", "6 n tambah 5", 6, 5),
    ("n + 7", "n tambah 7", 1, 7), ("7n", "7 n", 7, 0), ("5n + 4", "5 n tambah 4", 5, 4),
    ("4n + 3", "4 n tambah 3", 4, 3), ("n − 1", "n kurang 1", 1, -1), ("9n + 1", "9 n tambah 1", 9, 1),
]


def ec_levels():
    rng = random.Random("EC")
    L = []

    # EC1 — paritas bentuk aljabar (EMC no. 1, mudah).
    items = []
    keys = set()
    for _ in range(600):
        if len(items) >= 36:
            break
        n_even = rng.random() < 0.5
        want_even = rng.random() < 0.5
        negate = rng.random() < 0.5  # "yang TIDAK genap" = cari yang ganjil
        target_even = (not want_even) if negate else want_even
        nval = 2 if n_even else 3
        par = lambda f: (f[2] * nval + f[3]) % 2 == 0
        good = [f for f in PARITY_FORMS if par(f) == target_even]
        bad = [f for f in PARITY_FORMS if par(f) != target_even]
        right = rng.choice(good)
        wrong = rng.sample(bad, 3)
        key = (n_even, want_even, negate, right[0], tuple(sorted(w[0] for w in wrong)))
        if key in keys:
            continue
        keys.add(key)
        kata = "genap" if want_even else "ganjil"
        ntext = "genap" if n_even else "ganjil"
        hasil = "genap" if target_even else "ganjil"
        why = (f"Coba ganti n dengan bilangan {ntext}, misalnya n = {nval}: {right[0]} = "
               f"{right[2] * nval + right[3]}, bilangan {'genap' if target_even else 'ganjil'}. "
               f"Ingat: genap × apa pun = genap, genap + ganjil = ganjil, ganjil + ganjil = genap.")
        q = (f"Misalkan n sebuah bilangan {ntext}. Tiga bentuk di bawah selalu bernilai {kata}, satu bentuk berbeda. Bentuk mana yang hasilnya selalu {hasil}?"
             if negate else
             f"Misalkan n sebuah bilangan {ntext}. Dari empat bentuk di bawah, hanya satu yang hasilnya selalu {hasil}. Bentuk yang mana?")
        items.append(item(q, [text_choice(f[0], f[1]) for f in [right, *wrong]], why))
    L.append(dict(slug="paritas-bentuk-aljabar", title="Ganjil dan genap bentuk aljabar",
                  kognitif="understanding", indikator="Menentukan bentuk aljabar yang bernilai ganjil/genap",
                  emc="1", content=manual(items)))

    # EC2 — selisih harga dari dua pernyataan (EMC no. 5, mudah).
    L.append(dict(
        slug="selisih-harga-dari-dua-pernyataan", title="Selisih harga dari dua pernyataan",
        kognitif="applying", indikator="Menentukan selisih harga dari dua pernyataan harga", emc="5",
        content=expr(
            "Harga 1 porsi {makan} dan {c} gelas {minum1} adalah Rp{p1}. Harga 1 porsi {makan} dan {c} gelas {minum2} adalah Rp{p2}. Satu gelas {minum2} lebih mahal Rp… daripada satu gelas {minum1}.",
            "Kedua belanjaan sama-sama berisi 1 porsi {makan}. Selisih totalnya Rp{=p2-p1} berasal dari {c} gelas minuman, jadi selisih per gelas = {=p2-p1} : {c} = Rp{answer}.",
            vars={"m": [8, 25], "a": [2, 8], "b": [3, 12], "c": {"values": [2, 3, 4]}}, constraint="b > a",
            words={"makan": MAKAN, "minum1": MINUM1, "minum2": MINUM2},
            derived={"p1": "(m + c * a) * 1000", "p2": "(m + c * b) * 1000"}, answer="(b - a) * 1000",
            distractors=[("c * (b - a) * 1000", "lupa-dibagi"), ("(b - a) * 500", "dibagi-dua"),
                         ("b * 1000", "harga-minuman"), ("(b - a + 1) * 1000", "lain")])))

    # EC3 — jumlah & selisih dua bilangan (EMC no. 27, sedang).
    sd = {"vars": {"a": [12, 70], "d": {"values": [2, 4, 6, 8, 10, 12, 14]}}, "derived": {"b": "a - d", "s": "a + b"}}
    L.append(dict(
        slug="jumlah-dan-selisih-dua-bilangan", title="Jumlah dan selisih dua bilangan",
        kognitif="applying", indikator="Menentukan hasil kali dua bilangan dari jumlah dan selisihnya", emc="27",
        content=mix(
            expr("{nama} memikirkan dua bilangan. Bila dijumlahkan hasilnya {s}, bila yang besar dikurangi yang kecil hasilnya {d}. Berapa hasil kali kedua bilangan itu?",
                 "Bilangan besar = ({s} + {d}) : 2 = {a}, bilangan kecil = ({s} − {d}) : 2 = {b}. Hasil kali = {a} × {b} = {answer}.",
                 **sd, constraint="b > 1 && !(s == 42 && d == 2)", words={"nama": NAMES}, answer="a * b",
                 distractors=[("s * d", "jumlah-kali-selisih"), ("a * a", "kuadrat"), ("(s / 2) * (s / 2)", "pakai-rata-rata")]),
            expr("{nama} punya kelereng merah dan biru, seluruhnya {s} butir. Kelereng merah {d} butir lebih banyak daripada kelereng biru. Banyak kelereng merah adalah … butir.",
                 "Kurangi dulu kelebihannya: {s} − {d} = {=s-d}, dibagi dua = {b} (biru). Merah = {b} + {d} = {answer}.",
                 **sd, constraint="b > 1", words={"nama": NAMES}, answer="a",
                 distractors=[("b", "tertukar"), ("s - d", "lupa-dibagi"), ("s / 2", "dibagi-dua-saja")]),
        )))

    # EC4 — kelipatan dalam rentang (EMC no. 15, sulit).
    L.append(dict(
        slug="banyak-kelipatan-di-antara-dua-bilangan", title="Banyak kelipatan di antara dua bilangan",
        kognitif="applying", indikator="Menghitung banyak kelipatan suatu bilangan di antara dua bilangan", emc="15",
        content=mix(
            expr("{nama} menulis semua bilangan yang lebih dari {lo} dan kurang dari {hi} yang habis dibagi {k}. Berapa banyak bilangan yang ia tulis?",
                 "Kelipatan {k} pertama setelah {lo} adalah {first}, yang terakhir sebelum {hi} adalah {last}. Banyaknya = ({last} − {first}) : {k} + 1 = {answer}.",
                 vars={"k": [3, 13], "lo": {"values": [100, 200, 300, 500, 1000, 1500]},
                       "span": {"values": [100, 200, 300, 500, 1000]}},
                 derived={"hi": "lo + span", "first": "(floor(lo / k) + 1) * k", "last": "floor(hi / k) * k"},
                 words={"nama": NAMES}, constraint="lo % k != 0 && hi % k != 0 && !(k == 6 && lo == 1000 && hi == 2000)",
                 answer="floor(hi / k) - floor(lo / k)",
                 distractors=[("floor(hi / k) - floor(lo / k) + 1", "tambah-satu"), ("floor(hi / k)", "dari-nol"),
                              ("floor(span / k) - 1", "kurang-satu")]),
            expr("Berapa banyak bilangan yang lebih dari {lo} dan kurang dari {hi} yang habis dibagi {a} sekaligus habis dibagi {b}?",
                 "Habis dibagi {a} dan {b} berarti kelipatan KPK-nya, yaitu {k}. Kelipatan {k} pertama setelah {lo} = {first}, terakhir sebelum {hi} = {last}. Banyaknya = ({last} − {first}) : {k} + 1 = {answer}.",
                 vars={"a": [2, 6], "b": [3, 9], "lo": {"values": [100, 200, 500, 1000]},
                       "span": {"values": [200, 300, 500, 1000]}},
                 derived={"k": "lcm(a, b)", "hi": "lo + span", "first": "(floor(lo / k) + 1) * k", "last": "floor(hi / k) * k"},
                 constraint="a < b && b % a != 0 && lo % k != 0 && hi % k != 0 && k <= 40",
                 answer="floor(hi / k) - floor(lo / k)",
                 distractors=[("floor(hi / (a * b)) - floor(lo / (a * b))", "kali-bukan-kpk"),
                              ("floor(hi / k) - floor(lo / k) + 1", "tambah-satu"), ("floor(span / a)", "hanya-a")]),
        )))

    # EC5 — menjumlahkan dua persamaan harga (EMC no. 22, sulit).
    pq = {"vars": {"a": [2, 5], "b": [1, 4], "x": [2, 15], "y": [2, 15]},
          "words": {"alat1": ALAT1, "alat2": ALAT2},
          "derived": {"p": "(a * x + b * y) * 1000", "q": "(b * x + a * y) * 1000"}}
    L.append(dict(
        slug="menjumlahkan-dua-persamaan-harga", title="Menjumlahkan dua persamaan harga",
        kognitif="analyzing", indikator="Menentukan jumlah/selisih harga satuan dari dua persamaan", emc="22",
        content=mix(
            expr("Koperasi sekolah menjual paket A berisi {a} {alat1} dan {b} {alat2} seharga Rp{p}, serta paket B berisi {b} {alat1} dan {a} {alat2} seharga Rp{q}. Berapa rupiah harga 1 {alat1} ditambah 1 {alat2}?",
                 "Jumlahkan kedua belanjaan: {=a+b} {alat1} dan {=a+b} {alat2} = Rp{=p+q}. Jadi 1 {alat1} + 1 {alat2} = {=p+q} : {=a+b} = Rp{answer}.",
                 **pq, constraint="a != b && x != y", answer="(x + y) * 1000",
                 distractors=[("p + q", "jumlah-total"), ("(p + q) / 2", "dibagi-dua"), ("(p + q) / (a + b) / 2", "dibagi-lagi")]),
            expr("Koperasi sekolah menjual paket A berisi {a} {alat1} dan {b} {alat2} seharga Rp{p}, serta paket B berisi {b} {alat1} dan {a} {alat2} seharga Rp{q}. Berapa rupiah 1 {alat2} lebih mahal daripada 1 {alat1}?",
                 "Kurangkan kedua belanjaan: selisihnya Rp{=q-p} berasal dari {=a-b} {alat2} lebih banyak dan {=a-b} {alat1} lebih sedikit. Jadi selisih harga satuan = {=q-p} : {=a-b} = Rp{answer}.",
                 **pq, constraint="a > b && y > x", answer="(y - x) * 1000",
                 distractors=[("q - p", "lupa-dibagi"), ("(q - p) / (a + b)", "dibagi-jumlah"), ("y * 1000", "harga-satuan")]),
        )))

    # EC6 — tiga bilangan: rata-rata & selisih (EMC no. 39, sulit, isian).
    tb = {"vars": {"m": [4, 40], "h": [1, 15]}, "derived": {"s": "3 * m", "d": "2 * h"}, "words": {"nama": NAMES}}
    L.append(dict(
        slug="tiga-bilangan-rata-rata-dan-selisih", title="Tiga bilangan: rata-rata dan selisih",
        kognitif="analyzing", indikator="Menentukan bilangan dari jumlah, rata-rata, dan selisih", emc="39",
        content=mix(
            expr("{nama} memikirkan tiga bilangan bulat yang jumlahnya {s}. Salah satunya tepat sama dengan rata-rata ketiga bilangan itu. Bilangan terbesar {d} lebih banyak daripada bilangan terkecil. Bilangan terkecil adalah …",
                 "Rata-rata = {s} : 3 = {m}, bilangan ini ada di tengah. Terbesar + terkecil = {s} − {m} = {=2*m} dan selisihnya {d}. Terkecil = ({=2*m} − {d}) : 2 = {answer}.",
                 **tb, constraint="m - h >= 1", answer="m - h", mode="input"),
            expr("{nama} memikirkan tiga bilangan bulat yang jumlahnya {s}. Salah satunya tepat sama dengan rata-rata ketiga bilangan itu. Bilangan terbesar {d} lebih banyak daripada bilangan terkecil. Bilangan terbesar adalah …",
                 "Rata-rata = {s} : 3 = {m}, bilangan ini ada di tengah. Terbesar + terkecil = {=2*m} dan selisihnya {d}. Terbesar = ({=2*m} + {d}) : 2 = {answer}.",
                 **tb, constraint="m - h >= 1", answer="m + h", mode="input"),
        )))

    # EC7 — banyak faktor (EMC no. 40, sulit, isian).
    L.append(dict(
        slug="banyak-faktor-bilangan-berpangkat", title="Banyak faktor bilangan berpangkat",
        kognitif="applying", indikator="Menentukan banyak faktor positif dari bilangan berpangkat", emc="40",
        content=mix(
            expr("{n} kelereng akan dibagikan sama banyak kepada beberapa anak tanpa sisa (boleh juga 1 anak atau {n} anak). Ada berapa pilihan banyak anak yang mungkin?",
                 "{n} = {p} pangkat {e}. Faktornya {p} pangkat 0, 1, 2, …, sampai {e}. Banyaknya {e} + 1 = {answer}.",
                 vars={"p": {"values": [2, 3, 5, 7]}, "e": [2, 10]}, derived={"n": "pow(p, e)"},
                 constraint="n <= 2500 && n >= 8 && n != 256", answer="e + 1", mode="input"),
            expr("{n} buku akan disusun di rak, setiap baris berisi buku yang sama banyak tanpa sisa (boleh 1 buku per baris, boleh juga semua dalam satu baris). Ada berapa pilihan banyak buku per baris?",
                 "{n} = 2 pangkat {a} × 3 pangkat {b}. Setiap faktor memakai 2 pangkat 0 sampai {a} ({=a+1} pilihan) dan 3 pangkat 0 sampai {b} ({=b+1} pilihan): {=a+1} × {=b+1} = {answer}.",
                 vars={"a": [1, 5], "b": [1, 4]}, derived={"n": "pow(2, a) * pow(3, b)"},
                 constraint="n <= 2000", answer="(a + 1) * (b + 1)", mode="input"),
        )))

    # EC8 — mencari bilangan (persamaan dua langkah).
    L.append(dict(
        slug="mencari-bilangan-yang-dipikirkan", title="Mencari bilangan yang dipikirkan",
        kognitif="analyzing", indikator="Menyelesaikan persamaan dua langkah dengan operasi kebalikan", emc="",
        content=mix(
            expr("{nama} memikirkan sebuah bilangan. Bilangan itu dikali {a}, lalu ditambah {b}, hasilnya {c}. Bilangan yang dipikirkan {nama} adalah …",
                 "Kerjakan mundur dengan operasi kebalikan: {c} − {b} = {=c-b}, lalu {=c-b} : {a} = {answer}.",
                 vars={"x": [3, 40], "a": [2, 9], "b": [2, 30]}, derived={"c": "a * x + b"}, words={"nama": NAMES},
                 answer="x", distractors=[("c - b", "lupa-dibagi"), ("(c + b) / a", "salah-kebalikan"), ("c / a", "lupa-dikurang")]),
            expr("Sebuah bilangan dikurangi {b}, lalu hasilnya dibagi {a}, ternyata hasilnya {r}. Bilangan itu adalah …",
                 "Kerjakan mundur: {r} × {a} = {=r*a}, lalu {=r*a} + {b} = {answer}.",
                 vars={"r": [2, 25], "a": [2, 9], "b": [2, 30]}, answer="r * a + b",
                 distractors=[("r * a - b", "salah-kebalikan"), ("(r + b) * a", "urutan-terbalik"), ("r * a", "lupa-ditambah")]),
        )))

    # EC9 — teka-teki bilangan gaya EMC (bank soal).
    items = []
    for base, cyc in [(2, [2, 4, 8, 6]), (3, [3, 9, 7, 1]), (7, [7, 9, 3, 1]), (8, [8, 4, 2, 6])]:
        for n in rng.sample(range(10, 60), 5):
            ans = cyc[(n - 1) % 4]
            assert pow(base, n, 10) == ans
            r = n % 4
            step = f"sisa {n} : 4 adalah {r}" if r else f"{n} habis dibagi 4"
            items.append(item(
                f"Angka satuan dari {base} pangkat {n} adalah …",
                mc(ans, [d for d in cyc if d != ans] + [base]),
                f"Angka satuan {base} pangkat 1, 2, 3, 4 adalah {', '.join(map(str, cyc))}, lalu berulang setiap 4. Karena {step}, angka satuannya {ans}."))
    for k in range(3, 16):
        cnt = sum(1 for a in range(1, 10) for b in range(10) if a + b == k)
        items.append(item(
            f"Banyak bilangan dua angka yang jumlah angka-angkanya {k} adalah …",
            mc(cnt, [cnt + 1, cnt - 1, k]),
            f"Daftar puluhan 1 sampai 9 dan pasangan satuannya (0–9) yang jumlahnya {k}. Ada {cnt} bilangan."))
    for s, d in [(20, 6), (30, 4), (25, 7), (40, 10), (18, 8), (50, 12), (36, 6)]:
        items.append(item(
            f"Jika a + b = {s} dan a − b = {d}, nilai a × a − b × b adalah …",
            mc(s * d, [s * s - d * d, s + d, (s + d) * (s - d) // 2]),
            f"a × a − b × b = (a + b) × (a − b) = {s} × {d} = {s * d}. Tidak perlu mencari a dan b dulu!"))
    for n, k in [(5, 60), (5, 85), (7, 98), (4, 54), (6, 81), (3, 72), (9, 117)]:
        mid = k // n
        if k % n:
            continue
        big = mid + (n - 1) // 2
        items.append(item(
            f"Jumlah {n} bilangan asli berurutan adalah {k}. Bilangan yang terbesar adalah …",
            mc(big, [mid, big + 1, big - 1, k // n + n]),
            f"Bilangan tengah = rata-rata = {k} : {n} = {mid}. Bilangan berurutannya {mid - (n - 1) // 2} sampai {big}, jadi yang terbesar {big}."))
    rng.shuffle(items)
    L.append(dict(slug="teka-teki-gaya-emc", title="Teka-teki gaya EMC", kognitif="reasoning",
                  indikator="Teka-teki bilangan campuran gaya EMC", emc="", content=manual(items)))

    # EC10 — tantangan campuran.
    L.append(dict(slug="tantangan-bilangan-dan-aljabar", title="Tantangan bilangan dan aljabar",
                  kognitif="reasoning", indikator="Gabungan semua indikator bilangan & aljabar", emc="",
                  content=mix(
                      harder(part_of(L[2]["content"], 0), vars={"a": [40, 150], "d": {"values": [6, 10, 14, 18, 22, 26]}}),
                      part_of(L[3]["content"], 1),
                      part_of(L[4]["content"], 0),
                      as_choice(part_of(L[5]["content"], 0), [("m", "rata-rata"), ("m - d", "dikurang-selisih"), ("s - d", "lain")]),
                      as_choice(part_of(L[6]["content"], 1), [("a * b", "kali-pangkat"), ("a + b + 1", "dijumlah"), ("a + b + 2", "lain")]),
                  )))

    # EC11 — game tangkap faktor/kelipatan.
    def catch(n: int, what: str, tgt: list[int], pool: range, scene: str):
        targets = [{"numeral": v} for v in tgt]
        decoys = [{"numeral": v} for v in pool if v not in tgt][:20]
        return ("catch-game", {"targets": targets, "decoys": decoys, "what": what, "scene": scene,
                               "reteach": f"{what[0].upper()}{what[1:]}: {', '.join(map(str, tgt))}."})
    L.append(dict(slug="game-tangkap-faktor-dan-kelipatan", title="Game tangkap faktor dan kelipatan",
                  kognitif="applying", indikator="Game: menangkap faktor dan kelipatan", emc="",
                  content=mix(
                      catch(64, "faktor dari 64", [1, 2, 4, 8, 16, 32, 64], range(3, 64, 3), "sea"),
                      catch(36, "faktor dari 36", [1, 2, 3, 4, 6, 9, 12, 18, 36], range(5, 40, 2), "space"),
                      catch(0, "kelipatan 7", [7, 14, 21, 28, 35, 42, 49, 56, 63], range(10, 70, 4), "sky"),
                      catch(0, "kelipatan 6 dan 9 sekaligus", [18, 36, 54, 72, 90], [6, 9, 12, 24, 27, 30, 42, 45, 48, 60, 63, 81], "farm"),
                  )))
    return L


# =============================================================== ED


def ed_levels():
    rng = random.Random("ED")
    L = []

    # ED1 — pecahan dari keseluruhan (EMC no. 7, mudah).
    pf = {"vars": {"b": [3, 8], "a": [1, 7], "k": [2, 20]}, "derived": {"total": "b * k", "sisa": "(b - a) * k"}}
    L.append(dict(
        slug="mencari-keseluruhan-dari-bagian", title="Mencari keseluruhan dari bagian",
        kognitif="applying", indikator="Menentukan total dari bagian pecahan yang diketahui", emc="7",
        content=mix(
            expr("Sebanyak {a}/{b} peserta lomba balap karung belum sampai di garis finis. Peserta yang sudah sampai ada {sisa} anak. Banyak seluruh peserta adalah … anak.",
                 "Yang sudah sampai = 1 − {a}/{b} = {=b-a}/{b} bagian = {sisa} anak. Satu bagian = {sisa} : {=b-a} = {k} anak. Seluruh peserta = {b} × {k} = {answer}.",
                 say="Sebanyak {a} per {b} peserta lomba balap karung belum sampai di garis finis. Peserta yang sudah sampai ada {sisa} anak. Berapa banyak seluruh peserta?",
                 **pf, constraint="a < b && gcd(a, b) == 1", answer="total",
                 distractors=[("sisa * b", "pakai-penyebut"), ("a * k", "bagian-lain"), ("sisa + a", "ditambah")]),
            expr("{nama} memakai {a}/{b} uang sakunya untuk membeli buku. Sisa uangnya Rp{=sisa*1000}. Uang saku {nama} mula-mula adalah Rp…",
                 "Sisa = {=b-a}/{b} bagian = Rp{=sisa*1000}. Satu bagian = Rp{=k*1000}. Uang mula-mula = {b} × {=k*1000} = Rp{answer}.",
                 say="{nama} memakai {a} per {b} uang sakunya untuk membeli buku. Sisa uangnya {=sisa*1000} rupiah. Berapa uang saku mula-mula?",
                 **pf, words={"nama": NAMES}, constraint="a < b && gcd(a, b) == 1", answer="total * 1000",
                 distractors=[("sisa * b * 1000", "pakai-penyebut"), ("a * k * 1000", "bagian-dipakai"), ("(sisa + a) * 1000", "ditambah")]),
        )))

    # ED2 — persen dari suatu bilangan (mudah, pemanasan).
    L.append(dict(
        slug="persen-dari-suatu-bilangan", title="Persen dari suatu bilangan",
        kognitif="applying", indikator="Menghitung persen dari suatu bilangan dan sebaliknya", emc="",
        content=mix(
            expr("{p}% dari {base} adalah …", "{p}% = {p}/100. Jadi {p}/100 × {base} = {answer}.",
                 vars={"p": {"values": [5, 10, 15, 20, 25, 30, 40, 50, 60, 75]}, "n": [2, 40]},
                 derived={"base": "20 * n"}, answer="base * p / 100",
                 distractors=[("base / p", "dibagi-persen"), ("base - base * p / 100", "sisanya"), ("base * p / 10", "dibagi-10")]),
            expr("Sebanyak {p}% dari siswa kelas 4 membawa bekal. Jika yang membawa bekal {x} siswa, banyak siswa kelas 4 adalah …",
                 "{p}% = {x} siswa, jadi 1% = {x} : {p}, dan 100% = {x} × 100 : {p} = {answer}.",
                 vars={"p": {"values": [10, 20, 25, 40, 50, 75]}, "t": [2, 8]},
                 derived={"total": "20 * t", "x": "total * p / 100"}, answer="total",
                 distractors=[("x * p / 100", "persen-dari"), ("x + p", "ditambah"), ("x * 100 / p / 2", "setengah")]),
        )))

    # ED3 — diskon untuk dua barang (EMC no. 29, mudah).
    L.append(dict(
        slug="diskon-untuk-dua-barang", title="Diskon untuk dua barang",
        kognitif="analyzing", indikator="Menentukan harga normal dari selisih harga setelah diskon", emc="29",
        content=expr(
            "Toko {toko} memberi diskon {d}% untuk pembelian 2 barang atau lebih. {n1} membeli 1 {barang}, sedangkan {n2} membeli 2 {barang} yang sama. {n2} membayar Rp{sel} lebih banyak daripada {n1}. Harga normal 1 {barang} adalah Rp…",
            "{n2} membayar 2 × {=100-d}% = {=2*(100-d)}% harga. {n1} membayar 100%. Selisihnya {=100-2*d}% harga = Rp{sel}. Jadi harga normal = {sel} × 100 : {=100-2*d} = Rp{answer}.",
            vars={"d": {"values": [10, 20, 25, 30, 40]}, "x": [2, 40]},
            words={"toko": ["Makmur", "Sentosa", "Ceria", "Pelangi"], "n1": NAMA1, "n2": NAMA2,
                   "barang": ["buku cerita", "kotak pensil", "botol minum", "topi"]},
            derived={"harga": "x * 1000", "sel": "harga * (100 - 2 * d) / 100"},
            constraint="(harga * (100 - 2 * d)) % 100 == 0", answer="harga",
            distractors=[("sel", "selisih"), ("2 * sel", "dikali-dua"), ("harga * (100 - d) / 100", "harga-diskon")]),
    ))

    # ED4 — kenaikan persen: nilai akhir (EMC no. 23, sedang).
    L.append(dict(
        slug="nilai-setelah-naik-persen", title="Nilai setelah naik persen",
        kognitif="applying", indikator="Menentukan nilai akhir dari besar kenaikan persen", emc="23",
        content=mix(
            expr("Dalam setahun, banyak buku di perpustakaan sekolah bertambah {p}%. Pertambahannya {naik} buku. Banyak buku sekarang adalah … buku.",
                 "{p}% = {naik} buku, jadi 100% (buku tahun lalu) = {naik} × 100 : {p} = {awal}. Sekarang = {awal} + {naik} = {answer}.",
                 vars={"p": {"values": [5, 10, 15, 20, 25, 30, 40, 50]}, "a": [5, 60]},
                 derived={"awal": "a * 20", "naik": "awal * p / 100"}, answer="awal + naik",
                 distractors=[("awal", "tahun-lalu"), ("awal - naik", "dikurangi"), ("naik * p", "dikali-persen")]),
            expr("Harga sebuah sepeda naik {p}%. Kenaikannya Rp{naik}. Harga sepeda setelah naik adalah Rp…",
                 "{p}% = Rp{naik}, jadi harga lama = {naik} × 100 : {p} = Rp{awal}. Harga baru = {awal} + {naik} = Rp{answer}.",
                 vars={"p": {"values": [5, 10, 15, 20, 25]}, "a": [5, 40]},
                 derived={"awal": "a * 100000", "naik": "awal * p / 100"}, answer="awal + naik",
                 distractors=[("awal", "harga-lama"), ("awal - naik", "dikurangi"), ("naik * 100 / p * 2", "dua-kali")]),
        )))

    # ED5 — perbandingan dua besaran (sedang).
    rs = {"vars": {"a": [2, 7], "b": [1, 6], "k": [2, 15]}, "words": {"n1": NAMA1, "n2": NAMA2},
          "derived": {"x": "a * k", "y": "b * k"}}
    L.append(dict(
        slug="perbandingan-dua-besaran", title="Perbandingan dua besaran",
        kognitif="applying", indikator="Menentukan besaran dari perbandingan dan jumlah/selisihnya", emc="",
        content=mix(
            expr("Perbandingan kelereng {n1} dan {n2} adalah {a} : {b}. Jumlah kelereng mereka {=x+y} butir. Banyak kelereng {n1} adalah … butir.",
                 "Jumlah bagian = {a} + {b} = {=a+b}. Satu bagian = {=x+y} : {=a+b} = {k}. Kelereng {n1} = {a} × {k} = {answer}.",
                 **rs, constraint="a != b && gcd(a, b) == 1", answer="x",
                 distractors=[("y", "tertukar"), ("(x + y) / a", "dibagi-bagian"), ("a * (x + y) / b", "salah-bagian")]),
            expr("Perbandingan uang {n1} dan {n2} adalah {a} : {b}. Uang {n1} Rp{=(x-y)*1000} lebih banyak daripada uang {n2}. Uang {n2} adalah Rp…",
                 "Selisih bagian = {a} − {b} = {=a-b}. Satu bagian = Rp{=(x-y)*1000} : {=a-b} = Rp{=k*1000}. Uang {n2} = {b} × {=k*1000} = Rp{answer}.",
                 **rs, constraint="a > b && gcd(a, b) == 1", answer="y * 1000",
                 distractors=[("x * 1000", "tertukar"), ("(x - y) * 1000 * b", "lupa-dibagi"), ("(x + y) * 1000", "jumlah")]),
        )))

    # ED6 — perbandingan berantai (EMC no. 35, sulit, isian).
    L.append(dict(
        slug="perbandingan-berantai", title="Perbandingan berantai",
        kognitif="analyzing", indikator="Menentukan kesetaraan harga melalui perbandingan berantai", emc="35",
        content=expr(
            "Di toko buah, uang untuk membeli {a} kg {x1} pas untuk membeli {b} kg {y1}, dan uang untuk {c} kg {y1} pas untuk {d} kg {z1}. Uang untuk {e} kg {z1} pas untuk membeli berapa kg {x1}?",
            "Misalkan 1 kg {x1} = {u} bagian, maka 1 kg {y1} = {v} bagian (karena {a} × {u} = {b} × {v}) dan 1 kg {z1} = {w} bagian (karena {c} × {v} = {d} × {w}). {e} kg {z1} = {=e*w} bagian = {=e*w} : {u} = {answer} kg {x1}.",
            vars={"u": [1, 6], "v": [1, 6], "w": [1, 6], "f": [1, 3]},
            words={"x1": ["anggur", "apel", "jeruk"], "y1": ["mangga", "salak", "pir"], "z1": ["manggis", "kelengkeng", "stroberi"]},
            derived={"a": "v / gcd(u, v)", "b": "u / gcd(u, v)", "c": "w / gcd(v, w)", "d": "v / gcd(v, w)",
                     "e": "f * u / gcd(u, w)"},
            constraint="u != v && v != w && u != w && e * w / u <= 60", answer="e * w / u", mode="input"),
    ))

    # ED7 — persen bertingkat (EMC no. 34, sulit, isian).
    def grow(p: int, base: str, note: str):
        return expr(
            "Uang kas kelas mula-mula Rp{s}. Setiap akhir bulan, uang kas bertambah {p}% dari jumlah pada awal bulan itu. Setelah {n} bulan, uang kas menjadi Rp… (tulis angkanya saja, tanpa titik)",
            "Hitung bulan demi bulan, setiap kali dikali (100 + {p})/100. " + note + " Hasilnya Rp{answer}.",
            vars={"n": [2, 3], "k": [1, 9], "p": {"values": [p]}}, derived={"s": f"k * pow({base}, n) * 1000"},
            constraint="s <= 2000000", answer=f"s * pow(100 + p, n) / pow(100, n)", mode="input")
    L.append(dict(
        slug="persen-bertingkat", title="Persen bertingkat",
        kognitif="applying", indikator="Menghitung nilai setelah kenaikan persen berulang", emc="34",
        content=mix(
            grow(25, "4", "Naik 25% sama dengan dikali 5/4."),
            grow(50, "2", "Naik 50% sama dengan dikali 3/2."),
            grow(20, "5", "Naik 20% sama dengan dikali 6/5."),
            grow(10, "10", "Naik 10% sama dengan dikali 11/10."),
        )))

    # ED8 — diskon bertingkat & untung (sulit).
    L.append(dict(
        slug="diskon-bertingkat-dan-untung", title="Diskon bertingkat dan untung",
        kognitif="analyzing", indikator="Menghitung harga setelah dua kali diskon dan harga jual dengan untung", emc="",
        content=mix(
            expr("Harga sebuah tas Rp{h}. Tas itu didiskon {d1}%, lalu harga setelah diskon didiskon lagi {d2}%. Harga akhir tas adalah Rp…",
                 "Setelah diskon pertama: {h} × {=100-d1}% = Rp{=h*(100-d1)/100}. Setelah diskon kedua: × {=100-d2}% = Rp{answer}. Diskon bertingkat tidak boleh dijumlahkan langsung.",
                 vars={"x": [5, 40], "d1": {"values": [10, 20, 25, 50]}, "d2": {"values": [10, 20, 50]}},
                 derived={"h": "x * 10000"}, answer="h * (100 - d1) * (100 - d2) / 10000",
                 distractors=[("h * (100 - d1 - d2) / 100", "diskon-dijumlah"), ("h * (100 - d1) / 100", "satu-diskon"),
                              ("h * d1 * d2 / 10000", "besar-diskon")]),
            expr("Pedagang membeli {n} kg jeruk seharga Rp{=n*b*100}. Ia ingin untung {p}% dari modalnya. Harga jual 1 kg jeruk adalah Rp…",
                 "Modal per kg = Rp{=b*100}. Untung {p}% = {=b*100} × {p}/100 = Rp{=b*p}. Harga jual per kg = {=b*100} + {=b*p} = Rp{answer}.",
                 vars={"n": [5, 30], "b": [80, 250], "p": {"values": [10, 20, 25, 30, 50]}},
                 answer="b * (100 + p)", constraint="(b * p) % 10 == 0",
                 distractors=[("b * 100", "modal"), ("b * p", "untung-saja"), ("n * b * (100 + p)", "semua-kg")]),
        )))

    # ED9 — teka-teki gaya EMC (bank soal).
    items = []
    for a, b, give, k in [(3, 2, 6, 5), (5, 3, 4, 3), (4, 1, 9, 2), (7, 5, 3, 4), (2, 1, 5, 6), (5, 2, 6, 3), (9, 5, 4, 2)]:
        x, y = a * k + give, b * k - give
        if y <= 0:
            continue
        # Setelah memberi `give`, perbandingan menjadi a : b (x - give : y + give).
        assert (x - give) * b == (y + give) * a
        items.append(item(
            f"Kakak punya {x} kelereng dan adik punya {y} kelereng. Kakak memberi adik beberapa kelereng sehingga perbandingan kelereng kakak dan adik menjadi {a} : {b}. Banyak kelereng yang diberikan kakak adalah …",
            mc(give, [give + 1, give - 1, abs(x - y) // 2, k]),
            f"Jumlah kelereng tetap {x + y}, dibagi {a + b} bagian, satu bagian = {k}. Kakak menjadi {a} × {k} = {a * k}, jadi kakak memberi {x} − {a * k} = {give}."))
    for ayah, anak, t in [(36, 9, 3), (40, 10, 5), (42, 14, 6), (35, 7, 7), (45, 15, 5), (48, 12, 4), (30, 6, 6)]:
        assert ayah % anak == 0
        tot = ayah + anak + 2 * t
        items.append(item(
            f"Umur ayah sekarang {ayah // anak} kali umur Dito. Jumlah umur mereka sekarang {ayah + anak} tahun. Jumlah umur mereka {t} tahun lagi adalah … tahun.",
            mc(tot, [tot - t, ayah + anak + t + 1, tot + t]),
            f"{t} tahun lagi, umur ayah bertambah {t} dan umur Dito juga bertambah {t}. Jumlahnya {ayah + anak} + 2 × {t} = {tot} tahun."))
    for p, q, r, s in [(3, 2, 4, 5), (2, 3, 6, 4), (5, 2, 3, 4), (4, 3, 2, 5), (3, 4, 5, 6), (6, 5, 2, 3)]:
        # p pensil = q pulpen, r pulpen = s spidol → berapa pensil seharga 1 spidol? (p × r) / (q × s) per spidol
        from fractions import Fraction as Fr
        val = Fr(p * r, q * s)
        if val.denominator != 1:
            continue
        items.append(item(
            f"Di kantin, {p} pensil dapat ditukar dengan {q} pulpen, dan {r} pulpen dapat ditukar dengan {s} spidol. Satu spidol dapat ditukar dengan berapa pensil?",
            mc(int(val), [p, s, int(val) + 1]),
            f"1 pulpen = {p}/{q} pensil. {r} pulpen = {fmt(Fr(p * r, q))} pensil = {s} spidol. Jadi 1 spidol = {int(val)} pensil."))
    for harga, bayar in [(17500, 20000), (8250, 10000), (34500, 50000), (12750, 15000), (46200, 50000), (63400, 100000), (27800, 30000)]:
        kem = bayar - harga
        items.append(item(
            f"Ibu membeli 3 barang yang harganya sama, totalnya {rp(harga * 3)}. Ibu membayar dengan uang {rp(bayar * 3)}. Uang kembalian Ibu adalah …",
            mc(kem * 3, [kem, bayar * 3 - harga, kem * 3 + 1000], unit=""),
            f"Kembalian = {fmt(bayar * 3)} − {fmt(harga * 3)} = {fmt(kem * 3)} rupiah.",
        ))
    for it in items:
        for c in it["choices"]:
            if it["prompt"].startswith("Ibu membeli"):
                c["visual"]["text"] = "Rp" + c["visual"]["text"]
                c["say"] = c["visual"]["text"]
    rng.shuffle(items)
    L.append(dict(slug="teka-teki-gaya-emc", title="Teka-teki gaya EMC", kognitif="reasoning",
                  indikator="Teka-teki rasio & aritmetika sosial gaya EMC", emc="", content=manual(items)))

    # ED10 — tantangan campuran.
    L.append(dict(slug="tantangan-rasio-dan-persen", title="Tantangan rasio dan persen",
                  kognitif="reasoning", indikator="Gabungan semua indikator rasio, persen, & aritmetika sosial", emc="",
                  content=mix(
                      L[2]["content"],
                      part_of(L[3]["content"], 1),
                      part_of(L[7]["content"], 0),
                      as_choice(L[5]["content"], [("e * u / w", "terbalik"), ("e * w", "lupa-dibagi"), ("e * w / u + 1", "lain")]),
                      as_choice(part_of(L[6]["content"], 0), [("s * (100 + p * n) / 100", "persen-dijumlah"), ("s * (100 + p) / 100", "sekali-naik"), ("s * p * n / 100", "kenaikan-saja")]),
                  )))

    # ED11 — game Bingo Rupiah: belanja, kembalian, beberapa barang.
    L.append(dict(slug="game-bingo-belanja", title="Game bingo belanja",
                  kognitif="applying", indikator="Game: menghitung jumlah, kembalian, dan harga beberapa barang", emc="",
                  content=mix(
                      ("bingo-game", {"kinds": ["jumlah", "kembalian", "kali"], "price": [2500, 15000], "step": 500}),
                      ("bingo-game", {"kinds": ["kembalian", "kali"], "price": [10000, 45000], "step": 1000}),
                  )))
    return L
