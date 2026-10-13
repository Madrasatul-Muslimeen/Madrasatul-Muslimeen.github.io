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
# J23 (12 Oct 2026) -- a "verbal noun of X" / "active participle of X" page
# points at a VERB, but match_wikt.py's resolve_formof() looked the verb up by
# its normalised spelling and preferred an entry of the NOUN's own part of
# speech, so a noun homograph won: بَوَار ("verbal noun of بَارَ") printed "bar
# (place where alcoholic beverages are sold)", مَكْر a plant's Latin name,
# كُفُور "cover, case". Such a resolution must be a verb's meaning ("to ...").
# When it is not, the Qur'an's own matched verb is used if the coverage run has
# it; otherwise the entry is left out (the Word card then falls back to the
# word's own word-by-word meaning) -- never a wrong meaning.
import sys
sys.path.insert(0, str(here))
from norm import voc
VERB_TARGET = re.compile(r"^(verbal noun|active participle|passive participle) of ([ء-ْٰٱ]+)")
QURAN_VERBS = {}
for r in src["matches"]:
    if r.get("matched") and r.get("pos") == "verb" and not r.get("formOfOnly") and r.get("confidence") in ("high", "medium") and (r.get("gloss") or "").lower().startswith("to "):
        QURAN_VERBS.setdefault(voc(r["lemma"]), r)
# Read by hand, 12 Oct 2026: this one's own resolution IS its meaning (a noun of the same sense).
KEEP_RESOLVED = {"عَلَانِيَة"}
def verb_target_gloss(r):
    """None = not a verb-targeted form-of (use the usual gloss); "" = mis-resolved and no verb found (leave out)."""
    m = VERB_TARGET.match(r.get("gloss") or "") if r.get("formOfOnly") else None
    resolved = (r.get("resolvedGloss") or "").strip()
    if not m or not resolved or resolved.lower().startswith("to ") or r["lemma"] in KEEP_RESOLVED:
        return None
    verb = QURAN_VERBS.get(voc(m.group(2)))
    return verb["gloss"].strip() if verb else ""
entries = {}
for r in src["matches"]:
    lemma = r["lemma"]
    if lemma in FIXED:
        entries[lemma] = {"m": FIXED[lemma], "c": "fixed"}
        continue
    if not r.get("matched") or r.get("confidence") not in ("high", "medium"):
        continue
    fixed_verb = verb_target_gloss(r)
    gloss = fixed_verb if fixed_verb is not None else (r.get("resolvedGloss") or r.get("gloss") or "").strip()
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
