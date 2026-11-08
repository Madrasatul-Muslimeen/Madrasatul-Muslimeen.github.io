// D24 (PCF MSA J104 tick 18, the Owner 9 Nov 2026: "Family across duas"): for each root the grammar tool found in the dua
// words, which OTHER duas hold a word of that root. BUILD-TIME ONLY; free, from data already in the repository.
// Usage (repository root):  node tools/hadith-data-pull/dua-root-index.mjs
// Reads output/dua/grammar-<page>.json (lemma, root, pos per unlinked dua word; a computer's guess, so the card says so)
// and writes output/dua/root-index.json = { schemaVersion, note, roots: { "<root>": [[dua, "<dictionary form>"], ...] } },
// only for a root found in two or more duas, one entry per (dua, dictionary form).
import fs from "node:fs";
import path from "node:path";
const DUA = path.join(path.dirname(new URL(import.meta.url).pathname), "output", "dua");
const byRoot = new Map();
for (const f of fs.readdirSync(DUA).filter((x) => /^grammar-\d+\.json$/.test(x)).sort((a, b) => parseInt(a.slice(8)) - parseInt(b.slice(8))))
  for (const [dua, d] of Object.entries(JSON.parse(fs.readFileSync(path.join(DUA, f), "utf8")).duas))
    for (const g of Object.values(d.g)) {
      const [lemma, root] = g;
      if (!root || !lemma) continue;
      const list = byRoot.get(root) ?? byRoot.set(root, []).get(root);
      if (!list.some((x) => x[0] === Number(dua) && x[1] === lemma)) list.push([Number(dua), lemma]);
    }
const roots = {};
for (const [root, list] of [...byRoot].sort(([a], [b]) => a.localeCompare(b, "ar")))
  if (new Set(list.map((x) => x[0])).size >= 2) roots[root] = list.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1], "ar"));
fs.writeFileSync(path.join(DUA, "root-index.json"), JSON.stringify({ schemaVersion: 1, note: "Roots found in two or more duas, from the grammar tool's guess (to be checked). Built by tools/hadith-data-pull/dua-root-index.mjs.", roots }) + "\n");
console.log(`roots in the grammar files ${byRoot.size}, in 2+ duas ${Object.keys(roots).length}`);
