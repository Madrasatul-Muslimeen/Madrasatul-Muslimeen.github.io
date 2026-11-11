#!/usr/bin/env python3
"""Shamela page map for a book whose OpenITI Arabic file carries PageV<vol>P<page> marks (Musnad Ahmad, Riyad al-Salihin ...).

Crawling every Shamela page of a 23,000-page book is rude and slow. Instead:
  1. read each hadith's volume and printed page from OUR OWN OpenITI text (a mark closes the page it follows: the text of a page
     comes BEFORE its PageV mark, which the --check step proves against Shamela itself);
  2. find, for every volume, where it starts in Shamela's numbering (a binary search over page titles "ج<vol> - ص<page>");
  3. index = volStart + printed page - firstPage; and PROVE it: a sample of hadith (every volume, both ends, plus random ones)
     is fetched from Shamela and the hadith number must be printed on that page. A control (the same numbers against a page
     60 pages away) must FAIL, or the check proves nothing.

    python3 -I tools/hadith-data-pull/shamela-pages-from-marks.py ahmad --cache DIR [--samples 400]
"""
import argparse, importlib.util, json, os, random, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("shamela_pages_build", os.path.join(HERE, "shamela-pages-build.py"))
sp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sp)

MARK = re.compile(r"PageV(\d+)P(\d+)")
HEAD = re.compile(r"^# (\d+) - ")
VOL_ONLY = re.compile(r"<title>\s*ج(\d+)\s*-")


def hadith_pages(txt_path, top):
    """n -> (vol, page): the first PageV mark at or after the line that begins hadith n."""
    out, pending = {}, []
    for line in open(txt_path, encoding="utf-8"):
        m = HEAD.match(line)
        if m:
            pending.append(int(m.group(1)))
        for mk in MARK.finditer(line):
            v, p = int(mk.group(1)), int(mk.group(2))
            if v == 0 or p == 0:
                continue  # editor/front-matter marks have no printed page
            for n in pending:
                if 1 <= n <= top and n not in out:
                    out[n] = (v, p)
            pending = []
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("key")
    ap.add_argument("--cache", required=True)
    ap.add_argument("--samples", type=int, default=400)
    ap.add_argument("--seed", type=int, default=1108)
    a = ap.parse_args()
    reg = json.load(open(sp.REGISTRY, encoding="utf-8"))
    row = next(b for b in reg["books"] if b["key"] == a.key)
    sh, top = row["shamela"], row["lastNumber"]
    os.makedirs(a.cache, exist_ok=True)
    txt = os.path.join(HERE, "output", "openiti-release", row["versionUri"] + ".txt")
    pages = hadith_pages(txt, top)
    print(f"OpenITI: {len(pages)} of {top} numbers have a volume/page", file=sys.stderr)

    probes = {}

    def probe(i):  # (vol, page|None) of Shamela index i
        if i not in probes:
            body = sp.fetch(sh["id"], i, a.cache)
            m = sp.TITLE.search(body)
            if m:
                probes[i] = (int(m.group(1)), int(m.group(2)))
            else:
                v = VOL_ONLY.search(body)
                probes[i] = (int(v.group(1)) if v else 0, None)
        return probes[i]

    last = sh["lastIndex"]
    vols = sorted({v for v, _ in pages.values()})
    # first index of each volume: vol is non-decreasing in the index
    starts = {}
    for v in vols:
        lo, hi = 1, last
        while lo < hi:
            mid = (lo + hi) // 2
            if probe(mid)[0] >= v:
                hi = mid
            else:
                lo = mid + 1
        starts[v] = lo
    # the first printed page seen in each volume (a volume may open with a title page that has no number)
    base = {}
    for v in vols:
        i = starts[v]
        while probe(i)[1] is None and i < starts[v] + 12:
            i += 1
        base[v] = (i, probe(i)[1])
    def page_at(i, hi):  # printed page at index i, nudged forward over page-less pages (a title page)
        while i <= hi and probe(i)[1] is None:
            i += 1
        return i, (probe(i)[1] if i <= hi else None)

    # Shamela skips some printed page numbers inside a volume, so index = page + offset with an offset that only ever STEPS DOWN
    # (never up) along the volume. Equal offsets at both ends of a stretch therefore mean the whole stretch has that offset;
    # unequal ones are bisected until every step is found. Each stretch is (firstPage, lastPage, offset).
    segs = {}
    for k, v in enumerate(vols):
        end = (starts[vols[k + 1]] - 1) if k + 1 < len(vols) else last
        lo_i, lo_p = page_at(starts[v], end)
        hi_i = end
        while hi_i > lo_i and probe(hi_i)[1] is None:
            hi_i -= 1
        hi_p = probe(hi_i)[1]
        out_segs = []

        def walk(li, lp, hi_, hp):
            if li - lp == hi_ - hp:
                out_segs.append((lp, hp, li - lp))
                return
            if hi_ - li <= 1:
                out_segs.append((lp, lp, li - lp))
                out_segs.append((hp, hp, hi_ - hp))
                return
            mi, mp = page_at((li + hi_) // 2, hi_)
            if mp is None or mi >= hi_ or mi <= li:
                mi, mp = li + 1, probe(li + 1)[1]
                if mp is None:
                    out_segs.append((lp, lp, li - lp)); out_segs.append((hp, hp, hi_ - hp)); return
            walk(li, lp, mi, mp)
            walk(mi, mp, hi_, hp)

        walk(lo_i, lo_p, hi_i, hi_p)
        merged = []
        for lo_, hi2, off in sorted(out_segs):
            if merged and merged[-1][2] == off:
                merged[-1] = (merged[-1][0], max(merged[-1][1], hi2), off)
            else:
                merged.append((lo_, hi2, off))
        segs[v] = merged
    print("volumes:", len(vols), " page-numbering steps found:", sum(len(x) - 1 for x in segs.values()), file=sys.stderr)

    def guess(vol, page):
        """Shamela index of printed page `page` of `vol`, or None when Shamela has no such page (never a guess)."""
        ss = segs[vol]
        for k, (lo_, hi2, off) in enumerate(ss):
            nxt = ss[k + 1][0] if k + 1 < len(ss) else None
            if lo_ <= page <= hi2:
                return page + off
            # between two stretches: pages after hi2 up to the next stretch's first page may be missing from Shamela
        return None

    # proof by sampling
    rng = random.Random(a.seed)
    nums = sorted(pages)
    sample = set()
    for v in vols:
        in_v = [n for n in nums if pages[n][0] == v]
        sample.update([in_v[0], in_v[-1], in_v[len(in_v) // 2]])
    sample.update(rng.sample(nums, min(a.samples, len(nums))))
    ok = bad = ctl_ok = skipped = 0
    wrong = []
    for n in sorted(sample):
        vol, page = pages[n]
        i = guess(vol, page)
        if i is None:
            skipped += 1
            continue
        body = sp.fetch(sh["id"], i, a.cache)
        here = sp.read_page(body)
        has = bool(here) and here[0] == vol and here[1] == page and n in here[2]
        if has:
            ok += 1
        else:
            bad += 1
            wrong.append((n, vol, page, i, here[:2] if here else None))
        far = sp.fetch(sh["id"], min(last, i + 60), a.cache)
        fr = sp.read_page(far)
        if fr and n in fr[2]:
            ctl_ok += 1
    print(f"(sample numbers whose page Shamela does not have: {skipped})")
    print(f"sample {len(sample)}: number printed on the mapped page {ok}, not {bad}; CONTROL (60 pages away) hits {ctl_ok}  (must be 0)")
    print("first misses:", wrong[:8])

    arrs = {"i": [0] * top, "v": [0] * top, "g": [0] * top}
    for n, (vol, page) in pages.items():
        i = guess(vol, page)
        if i is not None and 1 <= i <= last:
            arrs["i"][n - 1], arrs["v"][n - 1], arrs["g"][n - 1] = i, vol, page
    mapped = sum(1 for x in arrs["i"] if x)
    out = {
        "schemaVersion": 1, "kind": "shamela",
        "note": "Generated by tools/hadith-data-pull/shamela-pages-from-marks.py. Do not edit by hand. i/v/g[n-1] = Shamela page index, volume, printed page of hadith n (0 = not found).",
        "book": a.key, "shamelaId": sh["id"], "edition": sh["edition"], "numbers": top, **arrs,
    }
    p = os.path.join(sp.OUT_DIR, f"{a.key}.json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"mapped {mapped}/{top}; wrote {p} ({os.path.getsize(p)} bytes)")


if __name__ == "__main__":
    main()
