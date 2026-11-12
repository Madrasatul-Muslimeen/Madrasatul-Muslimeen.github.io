#!/usr/bin/env python3
"""Printed-page map for a Shamela book whose hadith carry NO numbers (the Owner ticked hd1111n G, 11 Nov 2026: Forty Nawawi).

Like shamela-pages-riyad.py the map is keyed by OUR record order `n` (the position in the split files), not by a hadith number.
Instead of reading numbers it finds each of our passages in the typed pages by its OPENING WORDS:

  1. read every page of the Shamela book (cached OUTSIDE the repo) and turn it into one long list of normalised words
     (diacritics, tatweel and letter variants ignored), remembering which page each word is on;
  2. walk our passages in order of `n`; look for its first WORDS words in that list, FORWARD ONLY from where the last one was found
     (a passage can never sit before the one above it), within a window so a far-away repeat cannot match;
  3. a passage not found stays 0 (shown with no link, never a guess) and does not move the cursor.

Writes output/book-pages/<key>.json = { i, v, g } like the other Shamela maps (v is 0: one volume) and prints a report.

    python3 -I tools/hadith-data-pull/shamela-pages-text.py nawawi --cache /path/outside/the/repo
"""
import argparse, glob, importlib.util, json, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
REGISTRY = os.path.join(HERE, "sources", "book-pages.json")
OUT_DIR = os.path.join(HERE, "output", "book-pages")
SPLIT_ROOT = os.path.join(HERE, "output", "openiti-release", "split")
TITLE = re.compile(r"<title>\s*(?:ج(\d+)\s*-\s*)?ص(\d+)\s*-")
TAGS = re.compile(r"<[^>]+>")
LETTERS = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي"})


def norm(s):
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn" and c != "ـ").translate(LETTERS)
    return re.sub(r"[^ء-ي ]", " ", s).split()


def load_builder():
    spec = importlib.util.spec_from_file_location("sb", os.path.join(HERE, "shamela-pages-build.py"))
    sb = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(sb)
    return sb


def find_seq(stream, seq, start, window):
    """First index >= start (and within `window` words) where `seq` occurs in `stream`, or -1."""
    n = len(seq)
    if n == 0:
        return -1
    first = seq[0]
    end = min(len(stream) - n, start + window)
    i = start
    while i <= end:
        try:
            i = stream.index(first, i, end + n)
        except ValueError:
            return -1
        if stream[i:i + n] == seq:
            return i
        i += 1
    return -1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("key")
    ap.add_argument("--cache", required=True)
    ap.add_argument("--words", type=int, default=8)
    ap.add_argument("--window", type=int, default=4000)
    ap.add_argument("--short-window", type=int, default=150, dest="short_window")
    a = ap.parse_args()
    reg = json.load(open(REGISTRY, encoding="utf-8"))
    row = next(b for b in reg["books"] if b["key"] == a.key)
    sh = row["shamela"]
    sb = load_builder()
    os.makedirs(a.cache, exist_ok=True)
    stream, page_of = [], []  # page_of[k] = (index, volume, printed page) of word k
    for i in range(1, sh["lastIndex"] + 1):
        body = sb.fetch(sh["id"], i, a.cache)
        m = TITLE.search(body)
        if not m:
            continue
        # keep ONLY the book text: the first <div class="nass ..."> block, up to the site's own "load next page" buttons
        # (the menu and those buttons print Arabic UI words such as "تحميل الصفحة التالية" that must never join a passage)
        start = body.find('<div class="nass')
        end = body.find('<div class="text-center margin-top-20', start) if start >= 0 else -1
        text = body[start:end] if start >= 0 and end > start else body
        words = norm(TAGS.sub(" ", text))
        meta = (i, int(m.group(1) or 0), int(m.group(2)))
        stream += words
        page_of += [meta] * len(words)
    recs = []
    for f in glob.glob(os.path.join(SPLIT_ROOT, row["versionUri"], "ch-*.json")):
        recs += json.load(open(f, encoding="utf-8"))["hadiths"]
    recs.sort(key=lambda r: r["n"])
    top = row["lastNumber"]
    arrs = {"i": [0] * top, "v": [0] * top, "g": [0] * top}
    cursor, found, missing = 0, 0, []
    for r in recs:
        if r["kind"] not in row.get("alignKinds", ["hadith", "passage"]):
            continue
        seq = norm(r["text"])[: a.words]
        if len(seq) < 2:
            missing.append(r["n"])
            continue
        # a very short passage ("رواه مسلم", a takhrij line) is not unique in the book: it may only match just after the one above it
        k = find_seq(stream, seq, cursor, a.window if len(seq) >= 5 else a.short_window)
        if k < 0:
            missing.append(r["n"])
            continue
        arrs["i"][r["n"] - 1], arrs["v"][r["n"] - 1], arrs["g"][r["n"] - 1] = page_of[k]
        cursor = k
        found += 1
    out = {"schemaVersion": 1, "kind": "shamela", "keyBy": "n",
           "note": f"Generated by tools/hadith-data-pull/shamela-pages-text.py. Do not edit by hand. Keyed by OUR record order n. i/v/g[n-1] = Shamela page index, volume (0: one volume), printed page of record n (0 = not found).",
           "book": a.key, "shamelaId": sh["id"], "edition": sh["edition"], "numbers": top, **arrs}
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, f"{a.key}.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    kinds = row.get("alignKinds", ["hadith", "passage"])
    total = sum(1 for r in recs if r["kind"] in kinds)
    print(f"words in the typed pages: {len(stream)}; our records of kind {kinds}: {total}; found: {found} ({100*found/max(1,total):.1f}%)")
    print("not found (n):", missing[:60])
    back = 0
    prev = 0
    for x in arrs["i"]:
        if x:
            back += x < prev
            prev = x
    print(f"pages that go backwards: {back}")


if __name__ == "__main__":
    main()
