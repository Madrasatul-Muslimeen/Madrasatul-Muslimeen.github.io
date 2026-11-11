#!/usr/bin/env python3
"""Hadith book pages: map every hadith number to the page of a scanned printed book (Owner decision, 10-11 Nov 2026).

Reads the scan's OCR layer (archive.org `_djvu.xml`), finds each hadith number at the start of a line, keeps the longest
increasing run of numbers (a number found out of order is dropped, never trusted), fills the few gaps from their neighbours
and FLAGS them as approximate, then cross-checks the exact ones against our own English text of the same translation.

  python3 -I tools/hadith-data-pull/book-pages-build.py bukhari [--xml PATH]

Output (small, shipped to the app): tools/hadith-data-pull/output/book-pages/<book>.json
  p : array, index n-1 -> leaf (0-based page of the scan, the `nNNN` of archive.org's reader)
  a : sorted list of the numbers whose page is only approximate (the page where the previous hadith starts)
No PDF or scan is ever stored here. The registry (sources/book-pages.json) says where each scan lives.
"""
import bisect, html, json, os, re, sys, unicodedata, urllib.request, random

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REG = os.path.join(ROOT, "tools/hadith-data-pull/sources/book-pages.json")
OUT = os.path.join(ROOT, "tools/hadith-data-pull/output/book-pages")
TR = os.path.join(ROOT, "tools/hadith-data-pull/output/translations")

def load_registry(key):
    reg = json.load(open(REG, encoding="utf8"))
    row = next((b for b in reg["books"] if b["key"] == key), None)
    if not row:
        sys.exit(f"unknown book {key}; known: {[b['key'] for b in reg['books']]}")
    return reg, row

def fetch_xml(row, path):
    if path:
        return open(path, encoding="utf8", errors="replace").read()
    url = f"https://archive.org/download/{row['archiveId']}/{urllib.request.quote(row['scanFile'])}_djvu.xml"
    print("downloading", url)
    with urllib.request.urlopen(url, timeout=300) as r:
        return r.read().decode("utf8", errors="replace")

def parse_leaves(xml):
    leaves = []
    for o in xml.split("<OBJECT ")[1:]:
        lines = []
        for ln in re.findall(r"<LINE>(.*?)</LINE>", o, flags=re.S):
            ws = [html.unescape(w) for w in re.findall(r"<WORD[^>]*>([^<]*)</WORD>", ln)]
            if ws:
                lines.append(ws)
        leaves.append(lines)
    return leaves

# Each book numbers its hadith in print its own way; the registry's `numberRegex` (group 1 = the number) says how to read it at the
# start of a line. OCR splits "18 ." into two words, so the first words of the line are joined before matching.
DEFAULT_NUM_RE = r"(\d{1,4}) ?[.,:] ?(?=[A-Z(\[])"

def candidates(leaves, top, num_re):
    NUM_RE = re.compile(num_re)
    out = []
    for i, lines in enumerate(leaves):
        for ws in lines:
            m = NUM_RE.match(" ".join(ws[:6]))
            if m and 1 <= int(m.group(1)) <= top:
                out.append((i, int(m.group(1))))
    return out

def longest_increasing(cand):
    seq = [c[1] for c in cand]
    tails, tidx, prev = [], [], [-1] * len(seq)
    for k, v in enumerate(seq):
        j = bisect.bisect_left(tails, v)
        if j == len(tails):
            tails.append(v); tidx.append(k)
        else:
            tails[j] = v; tidx[j] = k
        prev[k] = tidx[j - 1] if j > 0 else -1
    k, chain = tidx[-1], []
    while k != -1:
        chain.append(k); k = prev[k]
    chain.reverse()
    return {cand[k][1]: cand[k][0] for k in chain}

def norm_words(s):
    return re.findall(r"[a-z']+", s.lower().replace("`", "'").replace("’", "'").replace("‘", "'"))

COMMON = {"allah", "messenger", "narrated", "prophet", "when", "that", "this", "then", "they", "said", "have", "with", "from"}

def fold(s):
    """Lower-case, accents and apostrophe-like marks removed, so 'Isma\u2019\u012bl' and OCR's "Isma'il" compare equal."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[\u2019\u2018\u02bf\u02be`']", "", s.lower())

def our_text(book, n, chunk):
    path = os.path.join(TR, book, "en", f"{n // chunk}.json")
    if not os.path.exists(path):
        return None
    return json.load(open(path, encoding="utf8")).get(str(n))

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    key = args[0] if args else sys.exit(__doc__)
    xml_path = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--xml=")), None)
    if "--xml" in sys.argv:
        xml_path = sys.argv[sys.argv.index("--xml") + 1]
    reg, row = load_registry(key)
    top = row["lastNumber"]
    leaves = parse_leaves(fetch_xml(row, xml_path))
    cand = candidates(leaves, top, row.get("numberRegex", DEFAULT_NUM_RE))
    lis = longest_increasing(cand)
    exact = {n: lf for n, lf in lis.items()}
    p, approx, last_leaf = [], [], exact.get(1, 0)
    for n in range(1, top + 1):
        if n in exact:
            last_leaf = exact[n]
            p.append(last_leaf)
        else:
            approx.append(n)
            p.append(last_leaf)  # at or after the previous hadith's page
    # --- cross-check against our own English text of the same hadith. Same translation (`crossCheck: words`): its opening words must be on
    # the page. Another translation (`crossCheck: names`): the narrators' names (which every translation spells alike) must be on it.
    chunk = row.get("translationChunk", 500)
    mode = row.get("crossCheck", "words")
    rnd = random.Random(7)
    pool = [n for n in exact if our_text(row["translationDir"], n, chunk)]
    sample = rnd.sample(pool, min(400, len(pool)))
    ok = bad = ctrl_ok = 0
    bad_list = []
    for n in sample:
        t = our_text(row["translationDir"], n, chunk)
        raw = " ".join(" ".join(ws) for ws in leaves[exact[n]])
        page = fold(raw)
        if mode == "names":
            names = [fold(w) for w in re.findall(r"\b[A-Z][A-Za-z\u00C0-\u024F'’`ʿ]{3,}", t[:260]) if fold(w) not in COMMON]
            names = list(dict.fromkeys(names))[:5]
            # translations spell names differently (Huraira / Hurairah, A'isha / Aishah): compare the first 4 letters
            hit = sum(1 for w in names if w[:4] in page)
            good = len(names) == 0 or hit >= 1
            ctrl_page = fold(" ".join(" ".join(ws) for ws in leaves[(exact[n] + 997) % len(leaves)]))  # CONTROL: the same text against a wrong page
            ctrl_good = len(names) == 0 or sum(1 for w in names if w[:4] in ctrl_page) >= 1
            ctrl_ok += 1 if ctrl_good else 0
        else:
            words = [w for w in norm_words(t) if w not in ("narrated", "by", "the", "of", "from", "that", "he", "said")][:5]
            page_w = raw.lower().replace("`", "'")
            hit = sum(1 for w in words if w in page_w)
            good = len(words) and hit >= max(3, len(words) - 2)
        if good:
            ok += 1
        else:
            bad += 1; bad_list.append(n)
    os.makedirs(OUT, exist_ok=True)
    out = {
        "schemaVersion": 1,
        "note": "Generated by tools/hadith-data-pull/book-pages-build.py. Do not edit by hand. p[n-1] = leaf (0-based page of the scan); a = approximate numbers.",
        "book": key, "archiveId": row["archiveId"], "scanFile": row["scanFile"], "leaves": len(leaves),
        "numbers": top, "p": p, "a": approx,
    }
    path = os.path.join(OUT, f"{key}.json")
    json.dump(out, open(path, "w", encoding="utf8"), separators=(",", ":"))
    print(f"{key}: {len(exact)} of {top} found directly ({100 * len(exact) / top:.1f}%), {len(approx)} approximate")
    print(f"cross-check on {len(sample)} direct hits against our own English: {ok} agree, {bad} do not ({100 * ok / max(1, len(sample)):.1f}% agree)")
    if mode == "names":
        print(f"  control (the same texts against a WRONG page): {ctrl_ok} of {len(sample)} would pass, so a pass here means something")
    if bad_list:
        print("  disagreeing numbers (first 15):", sorted(bad_list)[:15])
    mono = all(p[i] <= p[i + 1] for i in range(len(p) - 1))
    print("pages never go backwards:", mono, "| wrote", os.path.relpath(path, ROOT), f"({os.path.getsize(path)} bytes)")

if __name__ == "__main__":
    main()
