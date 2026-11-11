#!/usr/bin/env python3
"""Build the Shamela page map of one hadith book (the Owner, 10-11 Nov 2026: scan first, Shamela for the rest).

Shamela (shamela.ws) shows a typed copy of a NAMED printed edition, one printed page per address:
    https://shamela.ws/book/<shamelaId>/<index>
Every page carries its volume and printed page in its <title> ("ج2 - ص99 - ...") and in `data-page-num`, and each hadith
paragraph starts with the hadith number in Arabic-Indic digits ("٢٣٣ - ..."). This tool walks the pages of one book, reads those
numbers, and writes the small map the app uses:  output/book-pages/<key>.json  =  { i[n-1], v[n-1], g[n-1] }
(Shamela index, volume, printed page of hadith n; 0 = number not found, shown with no link, never a guess).

It reads public pages politely (a few requests at a time, a pause between them) and caches every page OUTSIDE the repository
(--cache). Nothing from Shamela is stored in the repo except these numbers.

    python3 -I tools/hadith-data-pull/shamela-pages-build.py muwatta --cache /path/to/cache [--last 5400] [--workers 3]
"""
import argparse, concurrent.futures as cf, html, json, os, re, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REGISTRY = os.path.join(HERE, "sources", "book-pages.json")
OUT_DIR = os.path.join(HERE, "output", "book-pages")
ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")
TITLE = re.compile(r"<title>\s*ج(\d+)\s*-\s*ص(\d+)\s*-")
# a hadith paragraph starts with its number: <p><span id="p1" class="anchor"></span>٢٣٣ - ...
PARA_NUMBER = re.compile(r'<p>\s*(?:<span\b[^>]*\bclass="anchor"[^>]*></span>\s*)?([٠-٩0-9]+)\s*[-–]\s')


def fetch(book_id, index, cache, retries=4):
    path = os.path.join(cache, f"{book_id}-{index}.html")
    if os.path.exists(path) and os.path.getsize(path) > 2000:
        return open(path, encoding="utf-8").read()
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(f"https://shamela.ws/book/{book_id}/{index}", headers={"User-Agent": "MMSA-book-pages/1 (reading page numbers)"})
            with urllib.request.urlopen(req, timeout=40) as r:
                body = r.read().decode("utf-8", "replace")
            if len(body) > 2000:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(body)
                return body
            last = "short body"
        except Exception as e:  # network hiccup: wait and try again
            last = repr(e)
        time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"index {index}: {last}")


def read_page(body):
    m = TITLE.search(body)
    if not m:
        return None  # a front-matter page without a printed number
    vol, page = int(m.group(1)), int(m.group(2))
    nums = [int(x.translate(ARABIC_DIGITS)) for x in PARA_NUMBER.findall(body)]
    return vol, page, nums


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("key")
    ap.add_argument("--cache", required=True)
    ap.add_argument("--first", type=int, default=1)
    ap.add_argument("--last", type=int, default=0, help="last Shamela index to read (default: the registry's)")
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--pause", type=float, default=0.25)
    a = ap.parse_args()
    reg = json.load(open(REGISTRY, encoding="utf-8"))
    row = next(b for b in reg["books"] if b["key"] == a.key)
    sh = row["shamela"]
    last = a.last or sh["lastIndex"]
    os.makedirs(a.cache, exist_ok=True)

    def one(i):
        body = fetch(sh["id"], i, a.cache)
        time.sleep(a.pause)
        return i, read_page(body)

    found = {}  # number -> (index, vol, page) first occurrence
    dupes, problems, seen_pages = [], [], 0
    with cf.ThreadPoolExecutor(a.workers) as ex:
        for k, (i, res) in enumerate(ex.map(one, range(a.first, last + 1))):
            if res is None:
                continue
            seen_pages += 1
            vol, page, nums = res
            for n in nums:
                if n in found:
                    dupes.append((n, found[n][0], i))
                else:
                    found[n] = (i, vol, page)
            if k % 200 == 0:
                print(f"  ...{i}/{last}", file=sys.stderr, flush=True)
    top = row["lastNumber"]
    arrs = {"i": [0] * top, "v": [0] * top, "g": [0] * top}
    stray = 0
    for n, (i, vol, page) in found.items():
        if 1 <= n <= top:
            arrs["i"][n - 1], arrs["v"][n - 1], arrs["g"][n - 1] = i, vol, page
        else:
            stray += 1
    missing = [n for n in range(1, top + 1) if not arrs["i"][n - 1]]
    # order check: a hadith number must never be on an earlier page than a smaller number
    back = 0
    prev = (0, 0)
    for n in range(1, top + 1):
        cur = (arrs["i"][n - 1])
        if cur:
            if cur < prev[0]:
                back += 1
            prev = (cur, n)
    out = {
        "schemaVersion": 1,
        "kind": "shamela",
        "note": "Generated by tools/hadith-data-pull/shamela-pages-build.py. Do not edit by hand. i/v/g[n-1] = Shamela page index, volume, printed page of hadith n (0 = not found).",
        "book": a.key, "shamelaId": sh["id"], "edition": sh["edition"], "numbers": top, **arrs,
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    p = os.path.join(OUT_DIR, f"{a.key}.json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"pages read: {seen_pages}; numbers found: {top - len(missing)}/{top} ({100 * (top - len(missing)) / top:.1f}%)")
    print(f"missing: {len(missing)} (first 20: {missing[:20]}); duplicates: {len(dupes)} (first 5: {dupes[:5]}); out of range: {stray}; went backwards: {back}")
    print("wrote", p, os.path.getsize(p), "bytes")


if __name__ == "__main__":
    main()
