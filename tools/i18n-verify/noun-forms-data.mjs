// MSA J41 (Taṣrīf for words that are not verbs), data step.
//
// Pure data checks over tools/quran-data-pull/output/noun-forms.json, the
// on-demand file that gives every noun place its gender, number and case,
// parallel to lemmas-index.json. Every expected code here is WRITTEN BY HAND
// from the Corpus rows (quoted beside each), never read back out of the code
// under test. Run from the repository root.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { caseEndingClash, nounFormCode } from "../quran-data-pull/build-word-features.mjs";

const root = path.resolve(process.argv[2] || process.cwd());
const out = path.join(root, "tools", "quran-data-pull", "output");

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const nounForms = readJson(path.join(out, "noun-forms.json"));
const lemmas = readJson(path.join(out, "lemmas-index.json")).values;

/** The code at one place (surah:ayah:position), found through lemmas-index. */
function codeAt(s, a, p) {
  const loc = s * 1000000 + a * 1000 + p;
  for (const [lemma, occ] of Object.entries(lemmas)) {
    const i = occ.indexOf(loc);
    if (i < 0) continue;
    const codes = nounForms.values[lemma];
    return codes ? codes.slice(3 * i, 3 * i + 3) : "(lemma not in noun-forms)";
  }
  return "(place not in lemmas-index)";
}

console.log("\n1. Places, hand-written from the Corpus rows");

check("2:2:2 ٱلْكِتَـٰبُ (N|M|NOM): masculine, singular by default, nominative → MSN", () => {
  assert.equal(codeAt(2, 2, 2), "MSN");
});
check("2:2:7 لِّلْمُتَّقِينَ (N|MP|GEN) → MPG", () => {
  assert.equal(codeAt(2, 2, 7), "MPG");
});
check("55:46:5 جَنَّتَانِ (N|FD|NOM): a dual whose ending agrees → FDN", () => {
  assert.equal(codeAt(55, 46, 5), "FDN");
});
check("18:32:7 جَنَّتَيْنِ (N|FD|NOM, ending ـَيْنِ): the label is kept, flagged lower-case → FDn", () => {
  assert.equal(codeAt(18, 32, 7), "FDn");
});
check("49:9:2 طَآئِفَتَانِ (N|FD|GEN, ending ـَانِ) → FDg", () => {
  assert.equal(codeAt(49, 9, 2), "FDg");
});
check("9:10:10 ٱلْمُعْتَدُونَ (N|MP|ACC, sound plural, ending ـُونَ) → MPa", () => {
  assert.equal(codeAt(9, 10, 10), "MPa");
});
check("10:13:3 ٱلْقُرُونَ (N|MP|ACC, BROKEN plural of قَرْن): not flagged → MPA", () => {
  assert.equal(codeAt(10, 13, 3), "MPA");
});
check("2:185:12 وَٱلْفُرْقَانِ (N|M|GEN): its ـَانِ is part of the word, not flagged → MSG", () => {
  assert.equal(codeAt(2, 185, 12), "MSG");
});
check("2:2:6 هُدًى (N|M|INDEF|NOM) → MSN", () => {
  assert.equal(codeAt(2, 2, 6), "MSN");
});
check("1:2:1 ٱلْحَمْدُ (N|M|NOM) → MSN; 1:2:2 لِلَّهِ (PN|GEN: no gender, no number) → --G", () => {
  assert.equal(codeAt(1, 2, 1), "MSN");
  assert.equal(codeAt(1, 2, 2), "--G");
});
check("2:2:1 ذَٰلِكَ (DEM, not a noun stem) has no noun-forms entry", () => {
  assert.equal(codeAt(2, 2, 1), "(lemma not in noun-forms)");
});

console.log("\n2. The whole file");

check("every value is 3 letters per place of lemmas-index.json (parallel, same order)", () => {
  let bad = 0;
  for (const [lemma, codes] of Object.entries(nounForms.values)) {
    if (!lemmas[lemma] || codes.length !== 3 * lemmas[lemma].length) bad++;
  }
  assert.equal(bad, 0, `${bad} entries are not parallel`);
});
check("every code is --- or gender/number/case letters", () => {
  const re = /^(?:---|[MF-][SDP-][NAGnag-])$/;
  const badOnes = [];
  for (const codes of Object.values(nounForms.values)) {
    for (let i = 0; i < codes.length; i += 3) if (!re.test(codes.slice(i, i + 3))) badOnes.push(codes.slice(i, i + 3));
  }
  assert.deepEqual(badOnes.slice(0, 5), []);
});
check("exactly 55 lower-case (flagged) places, and the header says so", () => {
  let n = 0;
  for (const codes of Object.values(nounForms.values)) for (let i = 2; i < codes.length; i += 3) if (/[nag]/.test(codes[i])) n++;
  assert.equal(n, 55);
  assert.equal(nounForms.caseEndingClashes, 55);
});
check("the 55 are 53 duals labelled nominative, one dual labelled genitive, one plural labelled accusative", () => {
  const tally = {};
  for (const codes of Object.values(nounForms.values)) {
    for (let i = 0; i < codes.length; i += 3) {
      const c = codes.slice(i, i + 3);
      if (/[nag]$/.test(c)) tally[c.slice(1)] = (tally[c.slice(1)] || 0) + 1;
    }
  }
  assert.deepEqual(tally, { Dn: 53, Dg: 1, Pa: 1 });
});
check("no entry is all ---, and no lemma is left out that has a noun place (3,271 words, 30,735 places)", () => {
  assert.ok(Object.values(nounForms.values).every((v) => !/^(?:---)+$/.test(v)));
  assert.equal(nounForms.entryCount, 3271);
  assert.equal(Object.keys(nounForms.values).length, 3271);
  assert.equal(nounForms.nounPlaces, 30735);
});
check("on-demand only, and small (at most 256 KB)", () => {
  assert.equal(nounForms.loadBoundary, "on-demand-only");
  assert.ok(fs.statSync(path.join(out, "noun-forms.json")).size <= 256 * 1024);
});

console.log("\n3. The functions, on rows written by hand");

const row = (tag, features, form) => ({ tag, features, form });
check("caseEndingClash: a dual ـَيْنِ labelled NOM is a clash; labelled ACC or GEN is not", () => {
  assert.equal(caseEndingClash(row("N", "STEM|POS:N|LEM:jan~ap|ROOT:jnn|FD|NOM", "jan~atayoni")), true);
  assert.equal(caseEndingClash(row("N", "STEM|POS:N|LEM:jan~ap|ROOT:jnn|FD|ACC", "jan~atayoni")), false);
  assert.equal(caseEndingClash(row("N", "STEM|POS:N|LEM:jan~ap|ROOT:jnn|FD|GEN", "jan~atayoni")), false);
});
check("caseEndingClash: a dual ـَانِ labelled NOM is fine; labelled GEN is a clash", () => {
  assert.equal(caseEndingClash(row("N", "STEM|POS:N|LEM:jan~ap|ROOT:jnn|FD|NOM", "jan~ataAni")), false);
  assert.equal(caseEndingClash(row("N", "STEM|POS:N|LEM:TaA^}ifap|ROOT:Twf|FD|GEN", "TaA^}ifataAni")), true);
});
check("caseEndingClash: a singular ending in ـَانِ is never judged (فُرْقَان)", () => {
  assert.equal(caseEndingClash(row("N", "STEM|POS:N|LEM:furoqaAn|ROOT:frq|M|GEN", "furoqaAni")), false);
  assert.equal(caseEndingClash(row("N", "STEM|POS:N|LEM:furoqaAn|ROOT:frq|M|NOM", "furoqaAnu")), false);
});
check("caseEndingClash: a sound plural ـُونَ labelled ACC clashes; a broken plural (قُرُون) does not", () => {
  assert.equal(caseEndingClash(row("N", "STEM|POS:N|LEM:muEotadiyn|ROOT:Edw|MP|ACC", "muEotaduwna")), true);
  assert.equal(caseEndingClash(row("N", "STEM|POS:N|LEM:qaron|ROOT:qrn|MP|ACC", "quruwna")), false);
  assert.equal(caseEndingClash(row("N", "STEM|POS:N|LEM:muEotadiyn|ROOT:Edw|MP|NOM", "muEotaduwna")), false);
  assert.equal(caseEndingClash(row("N", "STEM|POS:N|LEM:mut~aqiyn|ROOT:wqy|MP|NOM", "mut~aqiyna")), true);
});
check("nounFormCode: a verb, a particle and a missing word all give ---", () => {
  assert.equal(nounFormCode([row("V", "STEM|POS:V|IMPF|LEM:ta$oxaSu|ROOT:$xS|3FS", "ta$oxaSu")]), "---");
  assert.equal(nounFormCode([row("P", "STEM|POS:P|LEM:fiY", "fiy")]), "---");
  assert.equal(nounFormCode(undefined), "---");
});
check("nounFormCode: the prefix rows are skipped; the stem decides (لِلْمُتَّقِينَ → MPG)", () => {
  assert.equal(nounFormCode([row("P", "PREFIX|l:P+", "l~i"), row("DET", "PREFIX|Al+", "lo"),
    row("N", "STEM|POS:N|ACT|PCPL|(VIII)|LEM:mut~aqiyn|ROOT:wqy|MP|GEN", "mut~aqiyna")]), "MPG");
});

console.log(`\nnoun-forms-data: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
