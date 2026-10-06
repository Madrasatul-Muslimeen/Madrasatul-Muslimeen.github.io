// The Owner, 6 Oct 2026: فَهُمْ is in two ayat (36:6:6, 36:8:9); Achieved in one
// place must mark both. 3,307 words have NO dictionary word, so WbW's mirror had
// nothing to share. They are shared through a stand-in key (formKey), kept in its
// own form-index.json -- never in lemmas-index.json. Run from the repository root.
import fs from "node:fs";
import path from "node:path";
import { formKey, isFormKey, wbwClaimKey } from "../../app/js/quran-word-form-key.js";

const out = "tools/quran-data-pull/output";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (typeof ok?.then === "function") throw new Error(`check "${n}" got a promise`); ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`)); };

const words = [];
for (const f of fs.readdirSync(path.join(out, "surahs")).filter((x) => /^surah_\d{3}\.json$/.test(x)).sort()) {
  const s = JSON.parse(fs.readFileSync(path.join(out, "surahs", f), "utf8"));
  for (const a of s.ayahs) for (const w of a.words ?? []) words.push({ ref: s.surahNumber * 1e6 + a.ayah * 1e3 + w.position, w, surah: s.surahNumber, ayah: a.ayah, pos: w.position });
}
const find = (s, a, p) => words.find((x) => x.surah === s && x.ayah === a && x.pos === p).w;
const lemmaIndex = JSON.parse(fs.readFileSync(path.join(out, "lemmas-index.json"), "utf8"));
const formIndex = JSON.parse(fs.readFileSync(path.join(out, "form-index.json"), "utf8"));

console.log("\n=== the Owner's report ===");
const w1 = find(36, 6, 6), w2 = find(36, 8, 9);
check("36:6:6 and 36:8:9 are both فهم with no dictionary word", !w1.morphology?.lemma && !w2.morphology?.lemma);
check("formKey of 36:6:6 equals that of 36:8:9", formKey(w1) === formKey(w2) && isFormKey(formKey(w1)), `${formKey(w1)} / ${formKey(w2)}`);
check("formKey is deterministic and carries the prefix", formKey(w1) === "form:فهم", formKey(w1));
check("a trailing space groups with the bare form", formKey("به ") === formKey("به") && formKey("به") === "form:به");
check("alef wasla folds to alef; tatweel and Qur'anic marks drop", formKey("ٱلله") === formKey("الله") && formKey("بـِهِۦ") === "form:به", formKey("بـِهِۦ"));
check("no letters -> no key", formKey("ۖ") === null && formKey("") === null && formKey(undefined) === null);

console.log("\n=== group sizes, tallied independently of formKey ===");
// A deliberately different method: KEEP only base Arabic letters.
const keep = (s) => [...String(s)].map((c) => (c === "ٱ" ? "ا" : c)).filter((c) => /[ء-غف-يا]/.test(c)).join("");
const tally = new Map();
for (const x of words) if (!x.w.morphology?.lemma) { const k = keep(x.w.arabic); tally.set(k, (tally.get(k) ?? 0) + 1); }
for (const letters of ["لهم", "هم", "فهم"]) {
  const got = formIndex.values["form:" + letters]?.length;
  check(`group "${letters}" has ${tally.get(letters)} occurrences in the surah files and in form-index.json`, tally.get(letters) > 0 && got === tally.get(letters), String(got));
}
check("every group size agrees with the independent tally", [...tally].every(([k, n]) => formIndex.values["form:" + k]?.length === n));
check("same number of groups", tally.size === Object.keys(formIndex.values).length, `${tally.size} vs ${Object.keys(formIndex.values).length}`);
console.log(`  (info) ${tally.size} stand-in groups over ${[...tally.values()].reduce((a, b) => a + b, 0)} words`);

console.log("\n=== coverage: every occurrence exactly once ===");
const seen = new Map();
for (const idx of [lemmaIndex, formIndex]) for (const refs of Object.values(idx.values)) for (const r of refs) seen.set(r, (seen.get(r) ?? 0) + 1);
check("77,429 occurrences in the packaged data", words.length === 77429, String(words.length));
check("lemmas-index + form-index cover 77,429 occurrences", seen.size === 77429, String(seen.size));
check("...each exactly once", [...seen.values()].every((n) => n === 1));
check("every packaged occurrence is covered", words.every((x) => seen.has(x.ref)));
check("form-index's own `occurrences` is 3,307", formIndex.occurrences === 3307, String(formIndex.occurrences));
check("form-index has the lemma index's contract and encoding", formIndex.identityContract === lemmaIndex.identityContract && formIndex.encoding === lemmaIndex.encoding);

console.log("\n=== stand-ins never leak into the lemma index ===");
check("no key of lemmas-index.json is a stand-in", !Object.keys(lemmaIndex.values).some(isFormKey));
check("no key of lemmas-index.json is empty", !Object.keys(lemmaIndex.values).includes(""));
check("lemmas-index.json still lists 74,122 occurrences", lemmaIndex.occurrences === 74122 && Object.values(lemmaIndex.values).reduce((a, v) => a + v.length, 0) === 74122);
check("every form-index key is a stand-in, none a real lemma", Object.keys(formIndex.values).every((k) => isFormKey(k) && !(k in lemmaIndex.values)));

console.log("\n=== a word with a dictionary word is unchanged ===");
const withLemma = words.filter((x) => x.w.morphology?.lemma);
check("74,122 words carry a lemma", withLemma.length === 74122, String(withLemma.length));
check("every lemma word's WbW claim key IS its lemma", withLemma.every((x) => wbwClaimKey(x.w) === x.w.morphology.lemma));
check("every lemma-less word has a stand-in claim key", words.filter((x) => !x.w.morphology?.lemma).every((x) => isFormKey(wbwClaimKey(x.w))));
check("every stand-in key is a legal lemmaId (1-400 chars, no '/' or '__')", Object.keys(formIndex.values).every((k) => k.length >= 1 && k.length <= 400 && !k.includes("/") && !k.includes("__")));

console.log(`\n==== quran-word-form-key: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
