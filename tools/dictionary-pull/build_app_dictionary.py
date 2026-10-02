"""Builds tools/quran-data-pull/output/lemma-dictionary-en.json from
coverage-wiktionary.json (the 2 Oct 2026 coverage run).

Owner decisions, 2 Oct 2026:
- show sure (high) AND likely (medium) Wiktionary matches; low ones are left out;
- three core words carry the app's own fixed meaning;
- "change God/Lord to Allah/Rabb always" (decision 49, restated 2 Oct).

Output shape: {"source", "licence", "fixed", "entries": {lemma: {"m", "c", "u"?}}}
c is "high", "medium" or "fixed"; u is the Wiktionary page (CC BY-SA credit).
"""
import json, re, pathlib
here = pathlib.Path(__file__).parent
src = json.loads((here / "coverage-wiktionary.json").read_text())
FIXED = {
    "ٱللَّه": "Allah",
    "رَبّ": "Rabb (Sustainer, Master)",
    "إِلَٰه": "god (deity)",
}
def allah_rabb(text):
    # Capitalised God (and God's) -> Allah; Lord / lord (singular) -> Rabb.
    # Lower-case "god"/"gods" (a false deity) and plural "lords" are left alone:
    # they do not name Allah, and "Allahs" or "Rabbs" would be wrong.
    text = re.sub(r"\bGod(?='s\b|\b)", "Allah", text)
    text = re.sub(r"\b[Ll]ord\b(?!s)", "Rabb", text)
    return text
entries = {}
for r in src["matches"]:
    lemma = r["lemma"]
    if lemma in FIXED:
        entries[lemma] = {"m": FIXED[lemma], "c": "fixed"}
        continue
    if not r.get("matched") or r.get("confidence") not in ("high", "medium"):
        continue
    gloss = (r.get("resolvedGloss") or r.get("gloss") or "").strip()
    if not gloss:
        continue
    entries[lemma] = {"m": allah_rabb(gloss), "c": r["confidence"], "u": r.get("url")}
for lemma, m in FIXED.items():
    entries.setdefault(lemma, {"m": m, "c": "fixed"})
out = {
    "source": "Wiktionary via kaikki.org, matched 2 Oct 2026 (tools/dictionary-pull)",
    "licence": "CC BY-SA 4.0 (Wiktionary contributors); adapted: God -> Allah, Lord -> Rabb",
    "fixed": sorted(FIXED),
    "entries": entries,
}
dest = here.parent / "quran-data-pull" / "output" / "lemma-dictionary-en.json"
dest.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
by = {}
for e in entries.values(): by[e["c"]] = by.get(e["c"], 0) + 1
print(dest, len(entries), by, dest.stat().st_size, "bytes")
