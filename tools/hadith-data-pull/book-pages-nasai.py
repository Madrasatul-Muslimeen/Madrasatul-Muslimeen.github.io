#!/usr/bin/env python3
"""Nasa'i printed page: content-aligned bridge (Owner hd1111n C/D, 11 Nov 2026; design: docs/reports/2026-11-12-hadith-nasai-bridge-design.md).

Darussalam's printed numbers differ from the STANDARD numbers our reader cites (sunnah.com), so the number cannot find the page.
This aligns the scan's English text to OUR English text of the same standard number (output/translations/nasai/en) in three
monotone passes, then keeps a number only when 6 consecutive words of our text are on the mapped leaf (or the next): no page
rather than a guess.

  python3 -I tools/hadith-data-pull/book-pages-nasai.py [--xml VOL1-5.xml,VOL6.xml]
Output: tools/hadith-data-pull/output/book-pages/nasai.json  (p[cite-1] = leaf in the part that holds that cite, or null;
parts[i].from/to are in STANDARD numbers). No scan or PDF is stored.
"""
import bisect, difflib, json, os, re, sys, importlib.util
sys.dont_write_bytecode = True
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
spec = importlib.util.spec_from_file_location("bp", os.path.join(ROOT, "tools/hadith-data-pull/book-pages-build.py"))
bp = importlib.util.module_from_spec(spec); spec.loader.exec_module(bp)
reg, row = bp.load_registry("nasai")
parts = row["parts"]
args = sys.argv[1:]
xml_paths = args[args.index("--xml") + 1].split(",") if "--xml" in args else [None] * len(parts)

norm = lambda s: re.findall(r"[a-z]+", s.lower())
sc = lambda a, b: difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()
T = {}
d = os.path.join(ROOT, "tools/hadith-data-pull/output/translations/nasai/en")
for f in os.listdir(d): T.update(json.load(open(os.path.join(d, f), encoding="utf8")))
full = {int(k): norm(v) for k, v in T.items()}
Tn = {k: v[:30] for k, v in full.items()}

NR = re.compile(row["numberRegex"])
LV, recs = [], []   # recs: (part, leaf, printed number, words)
for pi, part in enumerate(parts):
    lv = bp.parse_leaves(bp.fetch_xml({**row, **part}, xml_paths[pi])); LV.append(lv)
    for i, lines in enumerate(lv):
        for j, ws in enumerate(lines):
            m = NR.match(" ".join(ws[:6]))
            if m and 1 <= int(m.group(1)) <= row["lastNumber"]:
                recs.append((pi, i, int(m.group(1)), norm(" ".join(" ".join(x) for x in lines[j:j + 5]))[:30]))

# pass 1: numbered line vs standard numbers near the printed number; longest increasing chain by (cite, scan order)
cand = []
for idx, r in enumerate(recs):
    best = (0, None)
    for c in range(max(1, r[2] - 14), r[2] + 6):
        if c in Tn:
            s = sc(r[3], Tn[c])
            if s > best[0]: best = (s, c)
    if best[0] >= 0.6: cand.append((idx, best[1]))
tails, prev = [], {}
for k, (idx, c) in enumerate(cand):
    p = bisect.bisect_left([cand[t][1] for t in tails], c)
    if p == len(tails): tails.append(k)
    else: tails[p] = k
    prev[k] = tails[p - 1] if p else None
k, chain = tails[-1], []
while k is not None: chain.append(cand[k]); k = prev[k]
mp = {c: recs[idx] for idx, c in reversed(chain)}   # cite -> rec
anchors1 = len(mp)

# pass 2: between neighbouring anchors, scan lines in order take only cites strictly between them
idxof = {id(r): i for i, r in enumerate(recs)}
A = sorted((idxof[id(r)], c) for c, r in mp.items())
for (i0, c0), (i1, c1) in zip(A, A[1:]):
    free = [c for c in range(c0 + 1, c1) if c in Tn]; last = c0
    for i in range(i0 + 1, i1):
        r = recs[i]; best = (0, None)
        for c in free:
            if c <= last or abs(c - (r[2] + (c0 - recs[i0][2]))) > 6: continue
            s = sc(r[3], Tn[c])
            if s > best[0]: best = (s, c)
        if best[0] >= 0.42: mp[best[1]] = r; last = best[1]
pass12 = len(mp)

# pass 3: text only (no printed number needed): search the neighbours' leaf span for the first 12 words
def stream(pi, l0, l1):
    return [(w, l) for l in range(l0, min(l1, len(LV[pi]) - 1) + 1) for ws in LV[pi][l] for w in norm(" ".join(ws))]
res = {c: (r[0], r[1]) for c, r in mp.items()}
order = sorted(mp)
for a, b in zip(order, order[1:]):
    miss = [c for c in range(a + 1, b) if c in Tn]
    if not miss or mp[a][0] != mp[b][0]: continue
    st = stream(mp[a][0], mp[a][1], mp[b][1]); words = [w for w, _ in st]; pos = 0
    for c in miss:
        t = Tn[c][:12]
        if len(t) < 6: continue
        best = (0, None)
        for i in range(pos, max(pos, len(words) - len(t) + 1)):
            if words[i] not in t[:3]: continue
            s = sc(words[i:i + 12], t)
            if s > best[0]: best = (s, i)
        if best[0] >= 0.5: pos = best[1] + 12; res[c] = (mp[a][0], st[best[1]][1])
aligned = len(res)

# verification: a number keeps its page only when our text is really on the mapped leaf (or the next):
#   tier A: 8 consecutive words of OUR text appear there exactly; or
#   tier B: the best 14-word window there is >= 0.65 similar to our first 14 words (OCR inserts junk glyph runs into names).
# Anything weaker has no page: a missing page beats a wrong one (100L, 12 Nov 2026).
def lw(pi, l): return norm(" ".join(" ".join(w) for w in LV[pi][l])) if 0 <= l < len(LV[pi]) else []
def has_k(ws, t, k):
    grams = {tuple(ws[j:j + k]) for j in range(len(ws) - k + 1)}
    return any(tuple(t[i:i + k]) in grams for i in range(len(t) - k + 1))
def local(ws, t):
    t = t[:14]
    return max((sc(ws[i:i + 14], t) for i in range(max(1, len(ws) - 13))), default=0)
ok, tierB, dropped = {}, 0, 0
for c, v in res.items():
    ws = lw(v[0], v[1]) + lw(v[0], v[1] + 1)
    if has_k(ws, full[c], 8): ok[c] = v
    elif local(ws, full[c]) >= 0.65: ok[c] = v; tierB += 1
    else: dropped += 1

top = row["lastNumber"] + 7   # standard numbering runs to 5765
p = [None] * top
for c, (pi, l) in ok.items(): p[c - 1] = l
cites_by_part = [sorted(c for c, v in ok.items() if v[0] == i) for i in range(len(parts))]
mono = all((ok[a][0], ok[a][1]) <= (ok[b][0], ok[b][1]) for a, b in zip(sorted(ok), sorted(ok)[1:]))
out = {
    "note": "Generated by tools/hadith-data-pull/book-pages-nasai.py. Do not edit by hand. p[n-1] = leaf (0-based page) of the scan file parts[i] that holds STANDARD number n (null = no page); parts[i].from/to are standard numbers.",
    "book": "nasai", "archiveId": row["archiveId"], "numbers": top, "scanFile": parts[0]["scanFile"],
    "parts": [{"from": cs[0], "to": cs[-1], "scanFile": pt["scanFile"], "slug": pt["scanSlug"], "pdf": pt["pdfFile"], "pdfBytes": pt["pdfBytes"], "leaves": len(LV[i])}
              for i, (pt, cs) in enumerate(zip(parts, cites_by_part))],
    "p": p, "a": [],
}
op = os.path.join(ROOT, "tools/hadith-data-pull/output/book-pages/nasai.json")
json.dump(out, open(op, "w"), separators=(",", ":"))
print(f"tier B {tierB}; dropped {dropped}; scan lines {len(recs)}; anchors {anchors1}; +fill {pass12 - anchors1}; text-only +{aligned - pass12}; aligned {aligned}; "
      f"verified {len(ok)} of {len(Tn)} standard numbers ({100 * len(ok) / len(Tn):.1f}%); in order: {mono}; parts: {[(x['from'], x['to']) for x in out['parts']]}")
