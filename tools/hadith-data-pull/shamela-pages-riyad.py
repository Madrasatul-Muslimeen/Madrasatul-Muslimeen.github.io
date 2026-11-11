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
import argparse, difflib, glob, importlib.util, json, os, re, sys, unicodedata

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


def head(words, k=34):
    return words[:k]


def shamela_head(text):
    """Opening words of a Shamela paragraph (tags dropped)."""
    return head(norm(TAGS.sub("", text)))


SPAN = 30  # words compared
THRESHOLD = 0.8


def close(ours, theirs, threshold=THRESHOLD):
    """Do two paragraphs open with the same words? Their first SPAN words, compared as sequences (difflib ratio >= THRESHOLD), our text
    from offset 0, 1 or 2 because it carries the ordinal word ("الثاني", "فالأول", "الحادي عشر") that Shamela puts before a colon.
    The narrator's name and "رضي الله عنه قال" alone cannot pass: many hadith share those first 8 words, and 8-of-10 matched
    the wrong hadith in the first runs of this tool."""
    if len(theirs) < 8:
        return False
    key = (tuple(ours[:SPAN + 2]), tuple(theirs[:SPAN]))
    hit = _CACHE.get(key)
    if hit is None:
        hit = False
        for off in (0, 1, 2):
            a, b = ours[off:off + SPAN], theirs[:SPAN]
            if len(a) >= 8 and difflib.SequenceMatcher(None, a, b, autojunk=False).ratio() >= threshold:
                hit = True
                break
        _CACHE[key] = hit
    return hit


_CACHE = {}


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


def align(ours, sh, band=80):
    """Longest common subsequence of the two lists, where two entries are "the same" when their opening words agree (see close()).
    A banded dynamic programme (the books differ by a few dozen paragraphs, so the two lists never drift more than `band` apart).
    Returns {n: shamela_entry} for every matched record, and notes naming each run of records left unmatched."""
    oh = [our_head(r["text"]) for r in ours]
    N, M = len(ours), len(sh)
    # L[k][j] = LCS of ours[k:] and sh[j:], only for |k - j| <= band (offset-adjusted storage)
    L = [dict() for _ in range(N + 2)]
    def get(k, j):
        return L[k].get(j, 0) if k <= N and j <= M else 0
    for k in range(N - 1, -1, -1):
        for j in range(min(M - 1, k + band), max(-1, k - band - 1), -1):
            if close(oh[k], sh[j]["w"]):
                L[k][j] = get(k + 1, j + 1) + 1
            else:
                L[k][j] = max(get(k + 1, j), get(k, j + 1))
    res, notes = {}, []
    k = j = 0
    while k < N and j < M:
        if close(oh[k], sh[j]["w"]) and L[k].get(j, 0) == get(k + 1, j + 1) + 1:
            res[ours[k]["n"]] = sh[j]
            k += 1
            j += 1
        elif get(k + 1, j) >= get(k, j + 1):
            notes.append(f"ours only: n={ours[k]['n']} (no Shamela paragraph with these opening words)")
            k += 1
        else:
            notes.append(f"Shamela only: {sh[j]['in']}/{sh[j]['gl']} on index {sh[j]['i']}")
            j += 1
    # second pass: the two texts do not always keep one order (OpenITI's copy and Shamela's differ in places). A record still unmapped is
    # matched to a Shamela paragraph still unused ONLY when its opening words (5 words after the ordinal) occur once on each side.
    used = {id(e) for e in res.values()}
    moved = 0
    for width in (20, 12):  # the longer the shared opening, the surer: 20 words, then 12, each time only on what is still free
        def key(w, off):
            return " ".join(w[off:off + width]) if len(w[off:off + width]) == width else None
        idx, count = {}, {}
        for e in sh:
            if id(e) not in used:
                for off in (0, 1, 2):
                    kx = key(e["w"], off)
                    if kx:
                        idx.setdefault(kx, []).append(e)
        free_ours = [(r, h) for r, h in zip(ours, oh) if r["n"] not in res]
        for r, h in free_ours:
            for off in (0, 1, 2):
                kx = key(h, off)
                if kx:
                    count[kx] = count.get(kx, 0) + 1
        for r, h in free_ours:
            for off in (0, 1, 2):
                kx = key(h, off)
                if kx and count.get(kx) == 1 and len(idx.get(kx, [])) == 1 and id(idx[kx][0]) not in used:
                    res[r["n"]] = idx[kx][0]
                    used.add(id(idx[kx][0]))
                    moved += 1
                    break
    notes.append(f"second pass (out-of-order, unique opening words): {moved} records")
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
