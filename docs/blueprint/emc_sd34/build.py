"""Bangun konten EMC Kelas 3–4 (D-101) ke content/skills/math/sd34.

    python3 docs/blueprint/emc_sd34/build.py            # tulis level, mock, dan katalog
    pnpm validate:content                                # engine membuat 200 soal per level & memeriksa

Kode materi: EA–EH (8 topik kisi-kisi EMC), GE (game seru EMC), EY (3 mock test 40 soal berkisi-kisi).
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from core import GROUP, OSN  # noqa: E402

ROOT = HERE.parents[2]
OUT = ROOT / "content/skills/math/sd34"
CODES = ["EA", "EB", "EC", "ED", "EE", "EF", "EG", "EH", "GE", "EY"]


def level_json(code: str, short: str, kisi: str, order: int, lv: dict) -> dict:
    family, params = lv["content"]
    title = f"{short} — Level {order} — {lv['title']}"
    assert len(title) <= 80, title
    tags = {
        "level": str(order),
        "fase-merdeka": "B (pengayaan)",
        "osn": OSN,
        "kognitif": lv["kognitif"],
        "kisi-kisi": kisi,
        "indikator": lv["indikator"],
    }
    if lv.get("emc"):
        tags["emc-no"] = lv["emc"]
    return {
        "id": f"math.sd34.{code.lower()}{order}.{lv['slug']}",
        "version": 1,
        "domain": "math",
        "grade": "sd34",
        "category": code,
        "order": order,
        "title": title,
        "tier": "advanced",
        "tags": tags,
        "family": family,
        "params": params,
    }


def write(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    from topics import GAME_TOPIC, MOCK_SLOTS, TOPICS

    for f in OUT.glob("*.json"):
        if f.name[:2] in CODES and f.name[2:4].isdigit():
            f.unlink()
    cats = []
    for t in TOPICS + [GAME_TOPIC]:
        levels = t["levels"]()
        for i, lv in enumerate(levels, start=1):
            write(OUT / f"{t['code']}{i:02d}-{lv['slug']}.json",
                  level_json(t["code"], t["short"], t["kisi"], i, lv))
        cat = {"code": t["code"], "title": t["title"], "group": GROUP, "intro": t["intro"],
               "tips": t["tips"], "standalone": True}
        if t.get("lesson"):
            cat["lesson"] = t["lesson"]()
        cats.append(cat)
    # Mock test 1–3: kisi-kisi 40 nomor identik, soal berbeda tiap percobaan (D-101).
    assert len(MOCK_SLOTS) == 40
    plan = {d: sum(s["difficulty"] == d for s in MOCK_SLOTS) for d in ("easy", "medium", "hard")}
    assert plan == {"easy": 10, "medium": 10, "hard": 20}, plan
    for k in (1, 2, 3):
        write(OUT / f"EY{k:02d}-mock-test-{k}.json", {
            "id": f"math.sd34.ey{k}.emc-mock-test-{k}",
            "version": 1,
            "domain": "math",
            "grade": "sd34",
            "category": "EY",
            "order": k,
            "title": f"Mock Test EMC Matematika Kelas 3–4 — Level {k} — Mock test {k}",
            "tier": "advanced",
            "tags": {"level": f"mock-{k}", "fase-merdeka": "B (pengayaan)",
                     "osn": "Mock test EMC Kelas 3–4 (40 soal, kisi-kisi EMC 2022)"},
            "family": "mock",
            "params": {
                "questions": 40,
                "plan": plan,
                "points": {"easy": {"right": 8, "wrong": -2}, "medium": {"right": 20, "wrong": -5},
                           "hard": {"right": 40, "wrong": -10}},
                "referenceMinutes": 120,
                "rule": "Penilaian EMC: mudah +8/−2, sedang +20/−5, sulit +40/−10, kosong 0",
                "categories": [t["code"] for t in TOPICS],
                "slots": MOCK_SLOTS,
            },
        })
    cats.append({"code": "EY", "title": "Mock Test EMC Matematika Kelas 3–4", "group": GROUP,
                 "intro": "Simulasi penyisihan EMC: 40 soal (30 pilihan ganda, 10 isian singkat), kisi-kisi sama persis dengan EMC 2022. Benar +8/+20/+40, salah −2/−5/−10, kosong 0. Kerjakan tanpa kalkulator.",
                 "tips": ["Soal yang belum yakin boleh dilewati: kosong bernilai 0, salah dikurangi.",
                          "Soal sulit bernilai 40 poin, jadi sisakan waktu untuk soal isian 31–40."],
                 "standalone": True, "mock": True})
    cat_path = OUT / "_catalog.json"
    catalog = json.loads(cat_path.read_text(encoding="utf-8"))
    # Materi EMC tepat sebelum bagian "Game · …" (game seru di akhir buku, D-078); mock EY paling akhir.
    rest = [c for c in catalog["categories"] if c["code"] not in CODES]
    at = next((i for i, c in enumerate(rest) if (c.get("group") or "").startswith("Game · ")), len(rest))
    catalog["categories"] = rest[:at] + cats[:-1] + rest[at:] + cats[-1:]
    write(cat_path, catalog)
    written = sorted(str(f) for f in OUT.glob("*.json") if f.name[:2] in CODES) + [str(cat_path)]
    subprocess.run(["npx", "prettier", "--log-level", "warn", "--write", *written], cwd=ROOT, check=True)
    print(f"{len(written) - 1} berkas EMC ditulis")


if __name__ == "__main__":
    main()
