// D24 (PCF MSA J104 tick 17 A, the Owner 9 Nov 2026): English meanings for the dua words whose dictionary form is not a
// Qur'an lemma, from Wiktionary through kaikki.org (Wiktextract; CC BY-SA 4.0, credited on the card). BUILD-TIME ONLY.
// Usage (repository root):  node tools/hadith-data-pull/dua-wiktionary.mjs
// For every dictionary form in output/dua/grammar-<page>.json it asks kaikki.org's Arabic page for the form's letters
// (vowel marks removed) and keeps up to 3 short glosses per part of speech. The match is by LETTERS ALONE, so a sense
// may be the wrong one: the card shows it as "suggested, to be checked", never as a settled meaning.
import fs from "node:fs";
import path from "node:path";
const DUA = path.join(path.dirname(new URL(import.meta.url).pathname), "output", "dua");
const OUT = path.join(DUA, "wiktionary-meanings.json");
export const plain = (w) => String(w).normalize("NFC").replace(/[ـً-ٰٟ]/gu, "");
const lemmas = new Set();
for (const f of fs.readdirSync(DUA).filter((x) => /^grammar-\d+\.json$/.test(x)))
  for (const d of Object.values(JSON.parse(fs.readFileSync(path.join(DUA, f), "utf8")).duas)) for (const g of Object.values(d.g)) if (g[0]) lemmas.add(g[0]);
const keys = [...new Set([...lemmas].map(plain))].sort();
const url = (k) => { const c = [...k]; return `https://kaikki.org/dictionary/Arabic/meaning/${encodeURIComponent(c[0])}/${encodeURIComponent(c.slice(0, 2).join(""))}/${encodeURIComponent(k)}.jsonl`; };
const out = {};
let next = 0, missing = 0;
async function one(k) {
  for (let tries = 0; tries < 3; tries++) {
    try {
      const r = await fetch(url(k));
      if (r.status === 404) { missing++; return; }
      if (!r.ok) throw new Error(String(r.status));
      const byPos = {};
      for (const line of (await r.text()).split("\n").filter(Boolean)) {
        const e = JSON.parse(line);
        for (const s of e.senses ?? []) {
          if (s.form_of || s.alt_of || !s.glosses?.length) continue;
          const g = s.glosses[s.glosses.length - 1];
          if (g.length > 90) continue;
          ((byPos[e.pos] ??= []).includes(g) ? 0 : byPos[e.pos].push(g));
        }
      }
      for (const p of Object.keys(byPos)) byPos[p] = byPos[p].slice(0, 3);
      if (Object.keys(byPos).length) out[k] = byPos; else missing++;
      return;
    } catch { await new Promise((r) => setTimeout(r, 400 * (tries + 1))); }
  }
  missing++;
}
await Promise.all(Array.from({ length: 8 }, async () => { while (next < keys.length) await one(keys[next++]); }));
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b, "ar")));
fs.writeFileSync(OUT, JSON.stringify({ schemaVersion: 1, source: "Wiktionary via kaikki.org (Wiktextract)", licence: "CC BY-SA 4.0", note: "Matched by letters alone (vowel marks removed): a suggested meaning, to be checked, never a settled one. Keyed by the dictionary form without vowel marks, then by Wiktionary part of speech.", count: Object.keys(sorted).length, meanings: sorted }, null, 0) + "\n");
console.log(`forms ${keys.length}, with a meaning ${Object.keys(sorted).length}, none ${missing}`);
