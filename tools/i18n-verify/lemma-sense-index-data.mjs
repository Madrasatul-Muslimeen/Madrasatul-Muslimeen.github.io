// PCF MSA J45 (the Family level's two meaning sections side by side; every word of the root, every place), data step.
//
// Pure data checks over tools/quran-data-pull/output/lemma-sense-index.json: every dictionary word's senses and one
// number per place, parallel to lemmas-index.json. Expected values are WRITTEN BY HAND from the surah files' own
// word-by-word translation (quoted beside each). Run from the repository root.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const out = path.join(process.cwd(), "tools", "quran-data-pull", "output");
let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(out, f), "utf8"));
const index = readJson("lemma-sense-index.json");
const lemmas = readJson("lemmas-index.json").values;
const senses = readJson("lemma-senses.json").values;

/** The sense label at one place, found through lemmas-index (null = the place has no main English word). */
function senseAt(s, a, p) {
  const loc = s * 1000000 + a * 1000 + p;
  for (const [lemma, occ] of Object.entries(lemmas)) {
    const i = occ.indexOf(loc);
    if (i < 0) continue;
    const e = index.values[lemma];
    if (!e) return "(lemma not in the index)";
    return e[1][i] === -1 ? null : e[0][e[1][i]];
  }
  return "(place not in lemmas-index)";
}
const lemmaAt = (s, a, p) => Object.entries(lemmas).find(([, occ]) => occ.includes(s * 1000000 + a * 1000 + p))?.[0];

console.log("\n1. Places, hand-written from the word-by-word translation");
check("35:2:2 يَفْتَحِ (\"Allah grants\") → 'allah grants'", () => assert.equal(senseAt(35, 2, 2), "allah grants"));
check("6:44:6 فَتَحْنَا (\"We opened\") and 39:71:10 فُتِحَتْ (\"(will) be opened\") share one sense, 'we opened'", () => {
  assert.equal(senseAt(6, 44, 6), "we opened");
  assert.equal(senseAt(39, 71, 10), "we opened");
});
check("26:118:1 (\"So judge\") and 34:26:6 (\"He will judge\") are 'so judge'", () => {
  assert.equal(senseAt(26, 118, 1), "so judge");
  assert.equal(senseAt(34, 26, 6), "so judge");
});
check("2:76:15 فَتَحَ (\"has\": no main English word) is -1, not dropped", () => assert.equal(senseAt(2, 76, 15), null));
check("فَتَحَ: 16 places in all, 10 of them 'we opened', and its labels in count order", () => {
  const e = index.values[lemmaAt(35, 2, 2)];
  assert.equal(e[1].length, 16);
  assert.equal(e[1].filter((x) => x === 0).length, 10);
  assert.deepEqual(e[0], ["we opened", "so judge", "decide", "allah grants", "we have given victory"]);
});
check("a word with ONE sense is in the index too (مَفَاتِح, 6:59:2 \"(are the) keys\": every place sense 0)", () => {
  const lemma = lemmaAt(6, 59, 2);
  assert.ok(!senses[lemma], "positive control: مَفَاتِح is NOT in lemma-senses.json (one sense)");
  assert.deepEqual(index.values[lemma][1], [0, 0, 0]);
});

console.log("\n2. The whole file");
check("every entry has one number per place of lemmas-index.json (parallel)", () => {
  const bad = Object.entries(index.values).filter(([l, [, codes]]) => !lemmas[l] || codes.length !== lemmas[l].length).length;
  assert.equal(bad, 0);
});
check("every number is -1 or a real position in its own label list", () => {
  const bad = Object.values(index.values).filter(([labels, codes]) => codes.some((c) => !Number.isInteger(c) || c < -1 || c >= labels.length)).length;
  assert.equal(bad, 0);
});
check("labels are in count order: each label's places are no fewer than the next one's", () => {
  const bad = Object.values(index.values).filter(([labels, codes]) => labels.some((_, i) => i > 0 && codes.filter((c) => c === i).length > codes.filter((c) => c === i - 1).length)).length;
  assert.equal(bad, 0);
});
check("agrees with lemma-senses.json: same labels, same counts, for all 1,783 words it holds", () => {
  let bad = 0, seen = 0;
  for (const [lemma, list] of Object.entries(senses)) {
    seen++;
    const e = index.values[lemma];
    if (!e || list.some(([label, n], i) => e[0][i] !== label || e[1].filter((c) => c === i).length !== n)) bad++;
  }
  assert.equal(seen, 1783); assert.equal(bad, 0);
});
check("header counts match the data (4,762 words, 72,550 places)", () => {
  assert.equal(index.lemmaCount, Object.keys(index.values).length);
  assert.equal(index.lemmaCount, 4762);
  assert.equal(index.places, Object.values(index.values).reduce((n, [, c]) => n + c.length, 0));
  assert.equal(index.places, 72550);
  assert.equal(index.loadBoundary, "on-demand-only");
});
check("small enough to load on first use (at most 450 KB)", () => assert.ok(fs.statSync(path.join(out, "lemma-sense-index.json")).size <= 450 * 1024));

console.log(`\nlemma-sense-index-data: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
