"""Build tools/quran-data-pull/output/lemma-meaning-groups.json from the
reviewed same-meaning groups (meaning-groups-reviewed.json).

Owner, 2 Oct 2026: "As long as words gets same meaning even though they are in
different forms, they should count as known. Any words got different meaning,
even though from same root, won't be counted."

Only groups of two or more lemmas are written; a lemma not listed shares its
"known" with nothing but itself. Lemma strings are kept byte-for-byte as in
lemmas-index.json (no normalisation), and every one is checked against it.
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "quran-data-pull", "output")
reviewed = json.load(open(os.path.join(HERE, "meaning-groups-reviewed.json"), encoding="utf-8"))["roots"]
lemmas = json.load(open(os.path.join(OUT, "lemmas-index.json"), encoding="utf-8"))["values"]
groups, by_lemma = {}, {}
for root, gs in reviewed.items():
    for i, g in enumerate(gs, 1):
        for l in g:
            if l not in lemmas: sys.exit(f"unknown lemma {l!r} in root {root}")
            if l in by_lemma: sys.exit(f"lemma {l!r} is in two groups")
        if len(g) < 2: continue
        gid = f"{root}:{i}"
        groups[gid] = g
        for l in g: by_lemma[l] = gid
json.dump({
    "contract": "lemma-meaning-groups:v1",
    "source": "tools/dictionary-pull/meaning-groups-reviewed.json",
    "rule": "A lemma counts as known when it, or another lemma in its group, is known. Same root AND same meaning only.",
    "groupCount": len(groups), "lemmaCount": len(by_lemma),
    "groups": groups, "byLemma": by_lemma,
}, open(os.path.join(OUT, "lemma-meaning-groups.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"{len(groups)} groups, {len(by_lemma)} lemmas")
