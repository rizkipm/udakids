"""Pembantu pembuat konten EMC Kelas 3–4 (D-101): level JSON, bank soal manual terverifikasi, gambar `figure`.

Semua soal dibuat sendiri (bukan salinan soal EMC). Jawaban bank soal manual dihitung di sini dan diperiksa
`assert`; level `expr` dihitung engine dan diperiksa `pnpm validate:content` (200 soal per level).
"""

from __future__ import annotations

import random
from fractions import Fraction
from math import gcd

GROUP = "EMC · Eduversal Mathematics Competition — Penyisihan Kelas 3–4 (soal versi 2022)"
OSN = "EMC Kelas 3–4 — Penyisihan (gaya EMC 2022)"
NAMES = [
    "Ayu", "Bima", "Citra", "Dimas", "Eka", "Fajar", "Gita", "Hasan", "Intan", "Joko", "Kirana",
    "Lukman", "Made", "Nyoman", "Siti", "Putu", "Wulan", "Yusuf", "Tiara", "Raka", "Nadia", "Ucok",
]


def fmt(n) -> str:
    """Angka gaya Indonesia: 12.500 dan 0,25; pecahan a/b."""
    if isinstance(n, Fraction):
        return str(n.numerator) if n.denominator == 1 else f"{n.numerator}/{n.denominator}"
    if isinstance(n, float) and n.is_integer():
        n = int(n)
    if isinstance(n, int):
        s = f"{abs(n):,}".replace(",", ".")
        return ("−" if n < 0 else "") + s
    whole, _, dec = f"{n:.6f}".rstrip("0").partition(".")
    return f"{fmt(int(whole))},{dec}" if dec else fmt(int(whole))


def rp(n: int) -> str:
    return "Rp" + fmt(n)


# ------------------------------------------------------------------ level & params


def expr(prompt: str, explain: str, *, answer=None, vars=None, derived=None, words=None,
         constraint=None, distractors=(), unit=None, mode="choice", stimulus=None, fmt_=None,
         say=None, fraction=None, allow_negative=False):
    p: dict = {}
    if vars:
        p["vars"] = vars
    if derived:
        p["derived"] = derived
    if words:
        p["words"] = words
    if constraint:
        p["constraint"] = constraint
    p["prompt"] = prompt
    if say:
        p["say"] = say
    if stimulus:
        p["stimulus"] = stimulus
    if fmt_:
        p["format"] = fmt_
    if answer is not None:
        p["answer"] = answer
    if fraction:
        p["fraction"] = fraction
    if unit:
        p["unit"] = unit
    if distractors:
        p["distractors"] = [
            {"expr": d[0], "tag": d[1]} if isinstance(d, tuple) and len(d) == 2 and fraction is None
            else d
            for d in distractors
        ]
    if mode == "input":
        p["mode"] = "input"
    else:
        p["choices"] = 4
    if allow_negative:
        p["allowNegative"] = True
    p["explain"] = explain
    return ("expr", p)


def frac_d(num: str, den: str, tag: str) -> dict:
    return {"num": num, "den": den, "tag": tag}


def mix(*parts):
    return ("mix", {"parts": [{"family": f, "params": p} for f, p in parts]})


def game(family: str, params: dict):
    return (family, params)


# ------------------------------------------------------------------ bank soal manual


def text_choice(t: str, say: str | None = None) -> dict:
    c = {"visual": {"kind": "text", "text": t}}
    c["say"] = say or t
    return c


def frac_choice(fr: Fraction) -> dict:
    return {
        "visual": {"kind": "fraction", "num": fr.numerator, "den": fr.denominator},
        "say": f"{fr.numerator} per {fr.denominator}",
    }


def mc(answer, wrongs, *, unit: str = "", rng: random.Random | None = None, frac=False):
    """Satu jawaban + 3 pengecoh unik (pengecoh = kesalahan umum; kurang → angka dekat)."""
    seen = {answer}
    out = []
    for w in wrongs:
        if w is None or w in seen:
            continue
        if not frac and (isinstance(w, (int, float)) and w < 0 and not (isinstance(answer, (int, float)) and answer < 0)):
            continue
        if frac and (w <= 0 or w > 1):
            continue
        seen.add(w)
        out.append(w)
        if len(out) == 3:
            break
    k = 1
    while len(out) < 3:
        for cand in (answer + k, answer - k) if not frac else (answer + Fraction(k, 12), answer - Fraction(k, 12)):
            if cand not in seen and (frac and 0 < cand < 1 or not frac and cand > 0):
                seen.add(cand)
                out.append(cand)
                if len(out) == 3:
                    break
        k += 1
    vals = [answer, *out]
    sfx = f" {unit}" if unit and not unit.startswith(("°", "%")) else unit
    if frac:
        choices = [frac_choice(Fraction(v)) for v in vals]
    else:
        choices = [text_choice(f"{fmt(v)}{sfx}") for v in vals]
    assert len({c["visual"].get("text", str(c["visual"])) for c in choices}) == 4, vals
    return choices


def item(prompt: str, choices: list, reteach: str, *, stimulus=None, say=None, answer=0,
         source: str | None = None) -> dict:
    it = {"prompt": prompt}
    if say:
        it["say"] = say
    if stimulus:
        it["stimulus"] = stimulus
    it["choices"] = choices
    it["answer"] = answer
    it["reteach"] = reteach
    if source:
        it["source"] = source
    assert len(prompt) <= 500 and len(reteach) <= 400, prompt
    return it


def manual(items: list) -> tuple:
    assert 10 <= len(items) <= 200, len(items)
    prompts = [i["prompt"] + str(i.get("stimulus")) + str(sorted(str(c["visual"]) for c in i["choices"])) for i in items]
    assert len(set(prompts)) == len(prompts), "soal manual kembar"
    return ("manual", {"items": items})


# ------------------------------------------------------------------ gambar `figure`


def fig(shapes: list, *, axes=None, caption=None, grid=False) -> dict:
    v = {"kind": "figure"}
    if axes:
        v["axes"] = {"xMin": axes[0], "xMax": axes[1], "yMin": axes[2], "yMax": axes[3]}
    if grid:
        v["grid"] = True
    v["shapes"] = shapes
    if caption:
        v["caption"] = caption
    return v


def poly(pts, fill=None, **kw):
    s = {"t": "poly", "pts": [list(p) for p in pts]}
    if fill:
        s["fill"] = fill
    s.update(kw)
    return s


def seg(a, b, text=None, **kw):
    s = {"t": "seg", "a": list(a), "b": list(b)}
    if text:
        s["text"] = text
    s.update(kw)
    return s


def pt(at, name=None, pos=None, coord=False):
    s = {"t": "point", "at": list(at)}
    if name:
        s["name"] = name
    if coord:
        s["coord"] = True
    if pos:
        s["pos"] = pos
    return s


def right(at, a, b):
    return {"t": "right", "at": list(at), "a": list(a), "b": list(b)}


def label(at, text):
    return {"t": "label", "at": list(at), "text": text}


def shoelace(pts) -> Fraction:
    s = 0
    for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
        s += x1 * y2 - x2 * y1
    return Fraction(abs(s), 2)


def simplify(a: int, b: int) -> Fraction:
    return Fraction(a, b)


def lcm(a: int, b: int) -> int:
    return a * b // gcd(a, b)


def part_of(content, i=None) -> tuple:
    """Bagian ke-i dari level `mix` (atau level itu sendiri) sebagai (family, params)."""
    fam, p = content
    if fam == "mix" and i is not None:
        q = p["parts"][i]
        return (q["family"], q["params"])
    return (fam, p)


def harder(content, **over) -> tuple:
    """Salinan level/bagian dengan params diganti (mis. rentang angka lebih besar)."""
    fam, p = content
    return (fam, {**p, **over})


def as_choice(content, distractors) -> tuple:
    """Versi pilihan ganda dari level isian (untuk tantangan campuran)."""
    fam, p = content
    q = {k: v for k, v in p.items() if k != "mode"}
    q["choices"] = 4
    q["distractors"] = [{"expr": e, "tag": t} for e, t in distractors]
    return (fam, q)


def say_coord(x: int, y: int) -> str:
    w = lambda n: f"negatif {-n}" if n < 0 else str(n)
    return f"{w(x)}, {w(y)}"
