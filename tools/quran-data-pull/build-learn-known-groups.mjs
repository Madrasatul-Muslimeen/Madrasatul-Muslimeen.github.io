// "Words you already know" (the Owner, 15 Nov 2026, from the Learn next demo): builds output/learn-known-groups.json.
// The group lists are the Owner-reviewed demo's (learn-known-seed.json, by lemma id); the Asma Name -> Qur'an word map is the
// seed's for Names 1-99 and, for the extra Names (100+), an exact match of the Arabic (marks and "ال" dropped) to a dictionary
// word of learn-next.json. "Words in Your Own Language" has no list here: it is the reader's own Bangla-words list, live.
//   node tools/quran-data-pull/build-learn-known-groups.mjs
import fs from "node:fs";
import { DEFAULT_EXTRA_ASMA_NAMES, DEFAULT_ASMA_COLLECTIONS } from "../../app/js/asma-collections-data.js";

const out = "tools/quran-data-pull/output/learn-known-groups.json";
const LN = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/learn-next.json", "utf8"));
const seed = JSON.parse(fs.readFileSync("tools/quran-data-pull/learn-known-seed.json", "utf8"));
const norm = (s) => s.replace(/[ً-ٰٟۖ-ۭـ^#@0-9:]/g, "").replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/^ال/, "");
const idx = new Map();
for (const r of LN.rows) { const k = norm(r.l); if (!idx.has(k)) idx.set(k, r.l); }
const known = new Set(LN.rows.map((r) => r.l));
const TITLES = {
  prophets: { en: "The Prophets' names", bn: "নবীদের নাম" },
  people: { en: "Well-known names", bn: "পরিচিত নাম" },
  ibadah: { en: "Words in Ebadah (Rituals)", bn: "ইবাদতের (আমলের) শব্দ" },
  daily: { en: "Words of daily life", bn: "প্রতিদিনের জীবনের শব্দ" },
};
const groups = seed.groups.filter((g) => TITLES[g.k]).map((g) => ({ k: g.k, ...TITLES[g.k], lemmas: g.lemmas }));
const names = {};
for (const n of seed.names) if (n.lemma) names[n.no] = n.lemma;
for (const n of DEFAULT_EXTRA_ASMA_NAMES) {
  // 100 (الإله) and 132 (الله) are the words إِلَٰه and ٱللَّه themselves: dropping the leading "ال" would leave "له", so these two are named, not matched
  const m = n.number === 100 ? seed.groups.find((g) => g.k === "allah").lemmas[2] : n.number === 132 ? seed.groups.find((g) => g.k === "allah").lemmas[0] : idx.get(norm(n.arabic));
  if (m) names[n.number] = m;
}
for (const g of groups) for (const l of g.lemmas) if (!known.has(l)) throw new Error(`group ${g.k}: lemma not in learn-next.json: ${l}`);
for (const [no, l] of Object.entries(names)) if (!known.has(l)) throw new Error(`name ${no}: lemma not in learn-next.json: ${l}`);
// the Allah's Names group as plain lemma ids (the Asma groups' Names that have a Qur'an word, once each, in group order): the Monitor and the steps need the list without the Asma page code
const allahLemmas = [...new Set(DEFAULT_ASMA_COLLECTIONS.flatMap((c) => c.items).map((k) => names[Number(String(k).slice(5))]).filter(Boolean))];
fs.writeFileSync(out, JSON.stringify({ contract: "learn-known-groups:v1", groups, names, allahLemmas }) + "\n");
console.log(`wrote ${out}: ${groups.map((g) => `${g.k} ${g.lemmas.length}`).join(", ")}; ${Object.keys(names).length} Names with a Qur'an word`);
