#!/usr/bin/env python3
"""Round 5b of "Dua words that work like Qur'an words" (decisions 90/91, issue 662).

README. BUILD-TIME ONLY: this runs on the build machine and never in the app.
  pip install camel-tools && camel_data -i morphology-db-msa-r13     (CAMeL Tools: MIT code; calima-msa-r13 is GPL-2,
  which is fine at build time because no part of it ships)
  Usage (repository root):  python3 tools/hadith-data-pull/dua-word-grammar.py

For every dua word that dua-word-links.mjs left UNLINKED (w[i] === -1) it asks CAMeL Tools for the best analysis in
the sentence (the dua's own words, in order), and writes beside each words-<page>.json:
  grammar-<page>.json = { schemaVersion: 1, page, tool, duas: { "<dua>": { f: <fingerprint, copied from words-<page>.json>,
                          g: { "<word index>": [lemma, root, pos, vowelled] } } } }
Only unlinked words appear; a word with no analysis is left out. Words are read exactly as the app reads them, through
app/js/dua-words.js (duaWords, duaWordTokens), so word positions match. The app uses a file only when f matches.
The guess is a computer's suggestion: the card says so.
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DUA = Path(__file__).resolve().parent / "output" / "dua"

READ_WORDS = """
import fs from "node:fs";
import { duaWords, duaWordTokens } from "./app/js/dua-words.js";
const dir = process.argv[1], out = {};
for (const f of fs.readdirSync(dir).filter((x) => /^cards-\\d+\\.json$/.test(x))) {
  const page = Number(f.match(/\\d+/)[0]), o = {};
  for (const c of JSON.parse(fs.readFileSync(dir + "/" + f, "utf8")).cards) { const r = duaWords(c.text); if (r) o[c.dua] = duaWordTokens(r.words); }
  out[page] = o;
}
console.log(JSON.stringify(out));
"""


def read_tokens():
    r = subprocess.run(["node", "--input-type=module", "-e", READ_WORDS, str(DUA)], cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


# The weak letters a "#" may be filled with. Not alif: in a hollow verb (قال, عاذ) the alif stands for و or ي, so a
# root read from it would be wrong (قال is ق.و.ل); such a root is left out.
WEAK = set("ويىأإءئؤ")
MARKS = re.compile(r"[\u064B-\u0652\u0670]")


def clean_root(root, lemma=""):
    """CAMeL writes a root as "ف.#.ض": "#" stands for a weak letter (و, ي or a hamza seat). It is filled back from the
    dictionary form when that form holds exactly one weak letter between the root's other letters (فَوَّض -> فوض);
    otherwise the root is left out rather than guessed. NTWS (a foreign stem) and Latin tags give no root."""
    parts = [p for p in (root or "").split(".") if p]
    if len(parts) < 3 or any(re.search(r"[A-Za-z]", p) for p in parts):
        return ""
    if "#" not in parts:
        return "".join(parts)
    letters = MARKS.sub("", lemma or "")
    pattern = "".join("([" + "".join(sorted(WEAK)) + "])" if p == "#" else re.escape(p) for p in parts)
    found = [m for m in re.finditer(pattern, letters)]
    if len(found) != 1:
        return ""
    groups = iter(found[0].groups())
    return "".join(next(groups).replace("ى", "ي").replace("أ", "ء").replace("إ", "ء").replace("آ", "ء").replace("ئ", "ء").replace("ؤ", "ء") if p == "#" else p for p in parts)


def main():
    import camel_tools
    from camel_tools.disambig.mle import MLEDisambiguator
    mle = MLEDisambiguator.pretrained("calima-msa-r13")
    tool = f"camel-tools {getattr(camel_tools, '__version__', 'unknown')}, calima-msa-r13"
    tokens = read_tokens()
    total = got = 0
    for page, duas in sorted(tokens.items(), key=lambda kv: int(kv[0])):
        words = json.loads((DUA / f"words-{page}.json").read_text("utf8"))
        out = {}
        for dua, toks in duas.items():
            links = words["duas"].get(dua)
            if not links:
                continue
            unlinked = [i for i, w in enumerate(links["w"]) if w < 0]
            total += len(unlinked)
            if not unlinked:
                continue
            dis = mle.disambiguate(toks)
            g = {}
            for i in unlinked:
                analyses = dis[i].analyses
                if not analyses:
                    continue
                a = analyses[0].analysis
                # Only an analysis from CAMeL's own lexicon. "backoff" is NO_ANALYSIS (the word echoed back); "spvar"
                # (a spelling variant) and NTWS (a foreign stem) gave nonsense for duas (وألجأت -> "the GATT",
                # لبيك -> "Bey"): measured on the 3,980 words, 8 Oct 2026. Such a word gets no suggestion.
                if a.get("source") != "lex" or "NTWS" in (a.get("root") or ""):
                    continue
                lemma = re.sub(r"_\d+$", "", a.get("lex", ""))
                if not lemma:
                    continue
                g[str(i)] = [lemma, clean_root(a.get("root"), lemma), a.get("pos", ""), a.get("diac", "")]
                got += 1
            if g:
                out[dua] = {"f": links["f"], "g": g}
        (DUA / f"grammar-{int(page)}.json").write_text(
            json.dumps({"schemaVersion": 1, "page": int(page), "tool": tool, "duas": out}, ensure_ascii=False, separators=(",", ":")), "utf8")
    print(f"unlinked dua words {total}, analysed {got} ({100 * got / max(total, 1):.1f}%)")


if __name__ == "__main__":
    sys.exit(main())
