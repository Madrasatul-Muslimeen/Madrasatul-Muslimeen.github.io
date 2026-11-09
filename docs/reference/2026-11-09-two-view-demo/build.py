#!/usr/bin/env python3
"""Builds the two-view demo page: python3 build.py OUT.html  (data: Sūrat al-Fātiḥa from tools/quran-data-pull/output/surahs)."""
import json, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[3]
s = json.load(open(root / "tools/quran-data-pull/output/surahs/surah_001.json"))
ayahs = []
for a in s["ayahs"]:
    ayahs.append({
        "n": a["ayah"], "ar": a["uthmaniText"], "en": a["translations"]["en"], "bn": a["translations"]["bn"],
        "w": [{"ar": w["arabic"], "tr": w["transliteration"], "en": w["translation"]["en"], "bn": w["translation"]["bn"],
               "root": (w.get("morphology") or {}).get("root"), "lemma": (w.get("morphology") or {}).get("lemma")} for w in a["words"]],
    })
tpl = (pathlib.Path(__file__).parent / "template.html").read_text(encoding="utf-8")
pathlib.Path(sys.argv[1]).write_text(tpl.replace("/*__DATA__*/null", json.dumps({"name": s["surahNameEnglish"], "ar": s["surahNameArabic"], "ayahs": ayahs}, ensure_ascii=False)), encoding="utf-8")
print("ok", len(ayahs), "ayat")
