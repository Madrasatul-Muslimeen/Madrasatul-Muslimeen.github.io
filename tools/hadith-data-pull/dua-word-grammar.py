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


def clean_root(root):
    r = re.sub(r"[.\s]", "", root or "")
    return "" if (not r or "#" in r or "NTWS" in r or re.search(r"[A-Za-z]", r)) else r


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
                lemma = re.sub(r"_\d+$", "", a.get("lex", ""))
                if not lemma:
                    continue
                g[str(i)] = [lemma, clean_root(a.get("root")), a.get("pos", ""), a.get("diac", "")]
                got += 1
            if g:
                out[dua] = {"f": links["f"], "g": g}
        (DUA / f"grammar-{int(page)}.json").write_text(
            json.dumps({"schemaVersion": 1, "page": int(page), "tool": tool, "duas": out}, ensure_ascii=False, separators=(",", ":")), "utf8")
    print(f"unlinked dua words {total}, analysed {got} ({100 * got / max(total, 1):.1f}%)")


if __name__ == "__main__":
    sys.exit(main())
