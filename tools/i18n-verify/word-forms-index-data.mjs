// Word card rebuild, round 6 (decision 59): the word-forms index for Search.
// Expected values are written by hand, never read from the builder. Run from
// the repository root.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const out = path.join(path.resolve(process.argv[2] || process.cwd()), "tools", "quran-data-pull", "output");
const idx = JSON.parse(fs.readFileSync(path.join(out, "word-forms-index.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(out, "word-identity-index-manifest.json"), "utf8"));
const byForm = new Map(idx.forms.map((r) => [r[0], r]));

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous.");
    if (r === false) throw new Error("condition false");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}
const must = (c, m) => { if (!c) throw new Error(m); };

const TAALAMUN = "تَعْلَمُونَ", YAALAMUN = "يَعْلَمُونَ", SHADDA_TAALAMUN = "تَّعْلَمُونَ";

check("contract and load boundary", () => { must(idx.contract === "word-forms-index:v1" && idx.loadBoundary === "on-demand-only", "header"); });
check("rows have the shape [ar, tr, en, bn, ids]", () => idx.forms.every((r) => r.length === 5 && typeof r[0] === "string" && typeof r[1] === "string" && typeof r[2] === "string" && typeof r[3] === "string" && Array.isArray(r[4]) && r[4].length > 0 && r[4].every(Number.isInteger)));
check("تَعْلَمُونَ has 54 occurrences (the demo's 53 was one short)", () => { must(byForm.get(TAALAMUN)?.[4].length === 54, `got ${byForm.get(TAALAMUN)?.[4].length}`); });
check("تَعْلَمُونَ includes 2:42:8", () => { must(byForm.get(TAALAMUN)[4].includes(2042008), "missing"); });
check("تَعْلَمُونَ includes 26:49:14, whose text carries a pause mark", () => { must(byForm.get(TAALAMUN)[4].includes(26049014), "missing"); });
check("يَعْلَمُونَ has 81 occurrences (the demo's 80 was one short)", () => { must(byForm.get(YAALAMUN)?.[4].length === 81, `got ${byForm.get(YAALAMUN)?.[4].length}`); });
check("يَعْلَمُونَ includes 39:9:20", () => { must(byForm.get(YAALAMUN)[4].includes(39009020), "missing"); });
check("تَّعْلَمُونَ is its own form, with 61:5:9", () => { must(byForm.get(SHADDA_TAALAMUN)?.[4].includes(61005009), "missing"); });
check("no form contains a pause mark, ۞ or a space", () => {
  const bad = idx.forms.filter((r) => /[ۖ-ۛ۞۩‌-‏\s]/.test(r[0]));
  must(bad.length === 0, `${bad.length} forms, first ${bad[0]?.[0]}`);
});
check("forms are unique", () => { must(byForm.size === idx.forms.length, "duplicate form"); });
check("occurrence total equals the manifest's occurrenceCount (77429)", () => {
  must(manifest.occurrenceCount === 77429, "manifest changed");
  const total = idx.forms.reduce((n, r) => n + r[4].length, 0);
  must(total === 77429, `got ${total}`);
});
check("occurrence ids are unique", () => { must(new Set(idx.forms.flatMap((r) => r[4])).size === 77429, "duplicate id"); });

// Architect review of #519: an exact form typed with its shadda and vowel in
// the other order (keyboards differ) still comes first.
const S = await import(new URL("../../app/js/word-card-search.js", import.meta.url).href);
check("typed تَّعْلَمُونَ with shadda and fatḥa swapped still puts that exact form first", () => {
  const data = byForm.get(SHADDA_TAALAMUN)[0];
  const swapped = data.replace(/([\u064E\u0651])([\u064E\u0651])/, "$2$1");
  must(swapped !== data, "the probe did not swap anything");
  const r = S.searchWordForms(idx, swapped, "en");
  must(r.kind === "forms" && r.forms[0][0] === data, `first was ${r.forms?.[0]?.[0]}`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
