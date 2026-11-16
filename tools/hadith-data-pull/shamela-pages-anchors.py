#!/usr/bin/env python3
"""Printed-page map for a Shamela book whose hadith OPEN with the same chain of narrators (Hadith Lead 16L, 16 Nov 2026: 'Amal al-Yawm
wa'l-Layla by an-Nasa'i and by Ibn al-Sunni). shamela-pages-text.py finds a passage by its first words; here the first words are an isnad
that dozens of passages share, so it matched the wrong page and every passage after it then failed. This tool finds a passage by RARE PHRASES:

  1. read every page of the Shamela book (cached OUTSIDE the repo), turn the book into one long list of normalised words, remember each word's page;
  2. a 6-word phrase that occurs exactly ONCE in the whole book is an anchor: wherever it is found, the passage is there;
  3. each passage of ours votes with all its anchors (position of the phrase minus its offset in the passage = where the passage starts);
     the largest cluster of votes (within 400 words) gives its place;
  4. our passages are in the book's order, so places must not go backwards: the longest non-decreasing run of places is kept, the rest are dropped;
  5. a passage with NO place that sits between two kept passages on the SAME Shamela page is on that page (nothing else is possible); any other stays 0
     (shown with no link, never a guess).

--verify measures it: the anchors of each passage are split into two halves, each half places the passage on its own, and the report says how
often the two halves agree within one page.

    python3 -I tools/hadith-data-pull/shamela-pages-anchors.py nasai-amal --cache /path/outside/the/repo [--verify]
"""
import argparse, glob, importlib.util, json, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
REGISTRY = os.path.join(HERE, "sources", "book-pages.json")
OUT_DIR = os.path.join(HERE, "output", "book-pages")
SPLIT_ROOT = os.path.join(HERE, "output", "openiti-release", "split")


def load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, f"{name}.py"))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def cluster(estimates, span=400):
    """Median of the largest group of estimates that lie within `span` words of each other, or -1."""
    if not estimates:
        return -1
    xs = sorted(estimates)
    best, lo = (0, 0, 0), 0
    for hi in range(len(xs)):
        while xs[hi] - xs[lo] > span:
            lo += 1
        if hi - lo + 1 > best[0]:
            best = (hi - lo + 1, lo, hi)
    grp = xs[best[1]:best[2] + 1]
    return grp[len(grp) // 2]


def longest_nondecreasing(items):
    """items = [(n, place)] in order of n; indexes of the longest non-decreasing subsequence of place."""
    import bisect
    tails, tail_idx, prev = [], [], [-1] * len(items)
    for i, (_, p) in enumerate(items):
        j = bisect.bisect_right(tails, p)
        if j == len(tails):
            tails.append(p); tail_idx.append(i)
        else:
            tails[j] = p; tail_idx[j] = i
        prev[i] = tail_idx[j - 1] if j > 0 else -1
    out, i = [], tail_idx[-1] if tail_idx else -1
    while i >= 0:
        out.append(i); i = prev[i]
    return out[::-1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("key")
    ap.add_argument("--cache", required=True)
    ap.add_argument("--gram", type=int, default=6)
    ap.add_argument("--verify", action="store_true")
    a = ap.parse_args()
    reg = json.load(open(REGISTRY, encoding="utf-8"))
    row = next(b for b in reg["books"] if b["key"] == a.key)
    sh = row["shamela"]
    sb, tx = load("shamela-pages-build"), load("shamela-pages-text")
    os.makedirs(a.cache, exist_ok=True)
    stream, page_of = [], []
    for i in range(1, sh["lastIndex"] + 1):
        body = sb.fetch(sh["id"], i, a.cache)
        m = tx.TITLE.search(body)
        if not m:
            continue
        start = body.find('<div class="nass')
        end = body.find('<div class="text-center margin-top-20', start) if start >= 0 else -1
        if start >= 0 and end <= start:
            ends = [e for e in (body.find("<button", start), body.find('<div class="row"', start)) if e > start]
            end = min(ends) if ends else -1
        text = body[start:end] if start >= 0 and end > start else body
        words = tx.norm(tx.TAGS.sub(" ", text))
        stream += words
        page_of += [(i, int(m.group(1) or 0), int(m.group(2)))] * len(words)
    G = a.gram
    where = {}
    for k in range(len(stream) - G + 1):
        g = tuple(stream[k:k + G])
        where[g] = -1 if g in where else k  # -1: seen twice, not an anchor
    recs = []
    for f in glob.glob(os.path.join(SPLIT_ROOT, row["versionUri"], "ch-*.json")):
        recs += json.load(open(f, encoding="utf-8"))["hadiths"]
    recs.sort(key=lambda r: r["n"])
    kinds = row.get("alignKinds", ["hadith", "passage"])
    recs = [r for r in recs if r["kind"] in kinds]

    def votes(words):
        out = []
        for off in range(0, len(words) - G + 1):
            k = where.get(tuple(words[off:off + G]), -1)
            if k >= 0:
                out.append(k - off)
        return out

    placed, no_anchor, agree, tried, disagree = [], 0, 0, 0, 0
    for r in recs:
        words = tx.norm(r["text"])
        v = votes(words)
        if not v:
            no_anchor += 1
            continue
        placed.append((r["n"], max(0, cluster(v))))
        if a.verify and len(v) >= 4:
            half = len(v) // 2
            x, y = cluster(v[:half]), cluster(v[half:])
            tried += 1
            if abs(page_of[max(0, min(len(page_of) - 1, x))][0] - page_of[max(0, min(len(page_of) - 1, y))][0]) <= 1:
                agree += 1
            else:
                disagree += 1
    keep = longest_nondecreasing(placed)
    kept = [placed[i] for i in keep]
    top = row["lastNumber"]
    arrs = {"i": [0] * top, "v": [0] * top, "g": [0] * top}
    for n, p in kept:
        p = min(p, len(page_of) - 1)
        arrs["i"][n - 1], arrs["v"][n - 1], arrs["g"][n - 1] = page_of[p]
    # between two kept passages on the SAME page: the passages between them are on it too
    filled = 0
    kept_ns = [n for n, _ in kept]
    for (n1, p1), (n2, p2) in zip(kept, kept[1:]):
        if page_of[min(p1, len(page_of) - 1)][0] == page_of[min(p2, len(page_of) - 1)][0]:
            for r in recs:
                if n1 < r["n"] < n2 and not arrs["i"][r["n"] - 1]:
                    arrs["i"][r["n"] - 1], arrs["v"][r["n"] - 1], arrs["g"][r["n"] - 1] = page_of[min(p1, len(page_of) - 1)]
                    filled += 1
    out = {"schemaVersion": 1, "kind": "shamela", "keyBy": "n",
           "note": "Generated by tools/hadith-data-pull/shamela-pages-anchors.py. Do not edit by hand. Keyed by OUR record order n. i/v/g[n-1] = Shamela page index, volume (0: one volume), printed page of record n (0 = not found).",
           "book": a.key, "shamelaId": sh["id"], "edition": sh["edition"], "numbers": top, **arrs}
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, f"{a.key}.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    total = len(recs)
    mapped = sum(1 for n in range(top) if arrs["i"][n])
    print(f"words in the typed pages: {len(stream)}; our records: {total}; with an anchor: {len(placed)}; no anchor: {no_anchor}")
    print(f"kept after the no-going-back rule: {len(kept)} (dropped {len(placed) - len(kept)}); filled between two on one page: {filled}")
    print(f"MAPPED: {mapped} of {total} ({100 * mapped / max(1, total):.1f}%)")
    if a.verify:
        print(f"verify: two independent halves of a passage's anchors agree within one page for {agree} of {tried} ({100 * agree / max(1, tried):.1f}%); disagree {disagree}")
    back = prev = 0
    for x in arrs["i"]:
        if x:
            back += x < prev; prev = x
    print(f"pages that go backwards: {back}")


if __name__ == "__main__":
    main()
