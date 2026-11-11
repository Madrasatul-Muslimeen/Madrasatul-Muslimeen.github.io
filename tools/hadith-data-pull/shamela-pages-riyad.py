#!/usr/bin/env python3
"""Riyad al-Salihin printed-page map (the PCA approved this as a small separate piece, 11 Nov 2026).

Why a separate tool: the other Shamela books are keyed by the book's hadith NUMBER. Riyad's numbers cannot be: our OpenITI header
"in-chapter/global-" carries source typos (11 numbers print twice, 9 places run backwards, one reads 1967 in a 1896-hadith book).
So this tool keys the map by our record order `n` (the position in the book, as the split files number it) instead:

  1. read Shamela 12014 (Risala, one volume, 810 pages): every hadith paragraph starts "in-chapter/global-" in Arabic-Indic digits;
  2. take our hadith records in order of `n`;
  3. walk both lists together, accepting a pair only when the OPENING WORDS agree (diacritics, tatweel and letter variants ignored; the
     ordinal word "الأول:" is dropped from Shamela's side); when they disagree, look a few records ahead on either side to re-sync, and
     leave the record unmapped (0) rather than guess.

Writes output/book-pages/riyad.json = { i[n-1], v[n-1], g[n-1] } for n = 1..lastN (0 = no page, shown with no link) and prints a report.

    python3 -I tools/hadith-data-pull/shamela-pages-riyad.py --cache /path/outside/the/repo [--fetch]
"""
import argparse, glob, importlib.util, json, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
REGISTRY = os.path.join(HERE, "sources", "book-pages.json")
OUT_DIR = os.path.join(HERE, "output", "book-pages")
SPLIT = os.path.join(HERE, "output", "openiti-release", "split", "0676Nawawi.RiyadSalihin.Shamela0012014-ara1")
ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")
TITLE = re.compile(r"<title>\s*(?:ج(\d+)\s*-\s*)?ص(\d+)\s*-")
# a hadith paragraph: <p>  ٧/١٢٣-السابع: ...  (in-chapter / global - ordinal word : text). The dash may be followed straight by the word.
PARA = re.compile(r'<p>\s*(?:<span\b[^>]*\bclass="anchor"[^>]*></span>\s*)?([٠-٩0-9]+)\s*/\s*([٠-٩0-9]+)\s*[-–]\s*(.*?)</p>', re.S)
TAGS = re.compile(r"<[^>]+>")
LETTERS = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي"})


def norm(s):
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn" and c != "ـ").translate(LETTERS)
    return re.sub(r"[^ء-ي ]", " ", s).split()


def head(words, k=7):
    return words[:k]


def shamela_head(text):
    """Opening words of a Shamela paragraph, minus the ordinal word ("السابع:") that precedes the narrator's name."""
    t = TAGS.sub("", text)
    m = re.match(r"\s*([^:：]{1,24})[:：]\s*", t)  # "السابع: عنه ..."
    if m and len(m.group(1).split()) <= 3:
        t = t[m.end():]
    return head(norm(t))


def close(a, b):
    """Two openings agree when they share most of their first words in order (editions differ in small wording)."""
    if not a or not b:
        return False
    a, b = a[:6], b[:6]
    if a[0] == "و" or a[0].startswith("و") and len(a[0]) > 3:
        pass
    same = sum(1 for x, y in zip(a, b) if x == y)
    return same >= max(2, min(len(a), len(b)) - 2)


def read_shamela(cache, last):
    out = []  # (index, page, ingap, glob, headwords)
    for i in range(1, last + 1):
        body = open(os.path.join(cache, f"12014-{i}.html"), encoding="utf-8").read()
        m = TITLE.search(body)
        if not m:
            continue
        page = int(m.group(2))
        for a, g, rest in PARA.findall(body):
            out.append({"i": i, "g": page, "in": int(a.translate(ARABIC_DIGITS)), "gl": int(g.translate(ARABIC_DIGITS)), "w": shamela_head(rest)})
    return out


def read_ours():
    rows = []
    for f in glob.glob(os.path.join(SPLIT, "ch-*.json")):
        rows += json.load(open(f, encoding="utf-8"))["hadiths"]
    rows.sort(key=lambda r: r["n"])
    return rows


def our_head(text):
    w = norm(text)
    return head(w)


def align(ours, sh, window=6):
    """Walk both lists; returns {n: shamela_entry}, plus a report of every place the walk had to re-sync or give up."""
    res, notes = {}, []
    j = 0
    k = 0
    while k < len(ours) and j < len(sh):
        o = our_head(ours[k]["text"])
        if close(o, sh[j]["w"]):
            res[ours[k]["n"]] = sh[j]
            k += 1
            j += 1
            continue
        # re-sync: nearest pair (dk, dj) with a match, preferring the smallest total skip
        best = None
        for tot in range(1, window * 2 + 1):
            for dk in range(0, min(tot, window) + 1):
                dj = tot - dk
                if dj > window or k + dk >= len(ours) or j + dj >= len(sh) or (dk == 0 and dj == 0):
                    continue
                if close(our_head(ours[k + dk]["text"]), sh[j + dj]["w"]):
                    best = (dk, dj)
                    break
            if best:
                break
        if not best:
            notes.append(f"no match: our n={ours[k]['n']} vs Shamela index {sh[j]['i']} ({sh[j]['in']}/{sh[j]['gl']})")
            k += 1
            j += 1
            continue
        dk, dj = best
        notes.append(f"re-sync: skipped {dk} of ours (from n={ours[k]['n']}) and {dj} of Shamela's (from {sh[j]['in']}/{sh[j]['gl']}, index {sh[j]['i']})")
        k += dk
        j += dj
    return res, notes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", required=True)
    ap.add_argument("--last", type=int, default=0)
    a = ap.parse_args()
    reg = json.load(open(REGISTRY, encoding="utf-8"))
    row = next(b for b in reg["books"] if b["key"] == "riyad")
    last = a.last or row["shamela"]["lastIndex"]
    sh = read_shamela(a.cache, last)
    ours = [r for r in read_ours() if r["kind"] == "hadith"]
    res, notes = align(ours, sh)
    top = row["lastNumber"]
    arrs = {"i": [0] * top, "v": [0] * top, "g": [0] * top}
    for n, e in res.items():
        arrs["i"][n - 1], arrs["v"][n - 1], arrs["g"][n - 1] = e["i"], 0, e["g"]
    out = {"schemaVersion": 1, "kind": "shamela", "keyBy": "n",
           "note": "Generated by tools/hadith-data-pull/shamela-pages-riyad.py. Do not edit by hand. Keyed by OUR record order n (not the hadith number, which repeats and has typos). i/v/g[n-1] = Shamela page index, volume (0: one volume), printed page of record n (0 = none).",
           "book": "riyad", "shamelaId": row["shamela"]["id"], "edition": row["shamela"]["edition"], "numbers": top, **arrs}
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "riyad.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Shamela paragraphs: {len(sh)}; our hadith records: {len(ours)}; mapped: {len(res)} ({100*len(res)/len(ours):.1f}%)")
    print(f"{len(notes)} walk notes")
    for n in notes[:60]:
        print(" ", n)
    # order check: pages must never go backwards
    prev = 0
    back = 0
    for n in sorted(res):
        if res[n]["i"] < prev:
            back += 1
        prev = res[n]["i"]
    print(f"records whose page is earlier than the previous record's: {back}")


if __name__ == "__main__":
    main()
