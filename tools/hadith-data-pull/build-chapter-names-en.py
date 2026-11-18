#!/usr/bin/env python3
"""Assemble the draft English chapter names (the Owner, 18 Nov 2026) into one small file per book:
tools/hadith-data-pull/output/chapter-names-en/<versionUri>.json  {chapterId: english}

Input: a directory of translated parts named <author>_<work>_<NN>.json ({chapterId: english}), one per 300 titles of the book's
index.json chapters (titles that are empty are skipped). The parts are checked against the book's own chapter ids: a part naming an id the
book does not have, or an empty value, stops the build. Run:  python3 -I tools/hadith-data-pull/build-chapter-names-en.py <parts-dir>"""
import json, os, sys, glob

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
SPLIT = os.path.join(ROOT, "openiti-release", "split")
OUT = os.path.join(ROOT, "chapter-names-en")

def main(parts):
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for book in sorted(os.listdir(SPLIT)):
        if not book.startswith("0") or "Bukhari.Sahih" in book:
            continue
        idx = json.load(open(os.path.join(SPLIT, book, "index.json"), encoding="utf-8"))
        want = {c["id"] for c in idx["chapters"] if str(c.get("title") or "").strip()}
        stem = "_".join(book.split(".")[:2])
        got = {}
        for f in sorted(glob.glob(os.path.join(parts, stem + "_*.json"))):
            got.update(json.load(open(f, encoding="utf-8")))
        extra = set(got) - want
        missing = want - set(got)
        empty = [k for k, v in got.items() if not str(v).strip()]
        if extra or missing or empty:
            sys.exit(f"{book}: {len(missing)} missing, {len(extra)} unknown, {len(empty)} empty")
        ordered = {c["id"]: " ".join(str(got[c["id"]]).split()) for c in idx["chapters"] if c["id"] in got}
        with open(os.path.join(OUT, book + ".json"), "w", encoding="utf-8") as fh:
            json.dump(ordered, fh, ensure_ascii=False, separators=(",", ":"))
        total += len(ordered)
        print(f"{book}: {len(ordered)}")
    print("total", total)

if __name__ == "__main__":
    main(sys.argv[1])
