// Word card rebuild, round 1 (decision 59; docs/reference/2026-10-03-word-card-build-spec.md §2).
//
// Pure data checks over the round's outputs:
//   tools/quran-data-pull/output/word-features/*.json   (per-word Corpus features)
//   tools/quran-data-pull/output/lemma-forms.json       (Basic's derived-form groups)
//   app/js/word-grammar-tables.js                       (names, Form sentences, order)
//
// Every expected value here is WRITTEN BY HAND from the Corpus rows and the
// approved demo (docs/reference/2026-10-03-word-card-demo.html), never read
// back out of the code under test. Run from the repository root.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { allEmittablePartIds, ruleGroup, partIdsForRows, stemFeatures } from "../quran-data-pull/build-word-features.mjs";

const root = path.resolve(process.argv[2] || process.cwd());
const out = path.join(root, "tools", "quran-data-pull", "output");
const T = await import(pathToFileURL(path.join(root, "app", "js", "word-grammar-tables.js")).href);

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const feat = (s) => readJson(path.join(out, "word-features", `surah_${String(s).padStart(3, "0")}.json`));
const s1 = feat(1), s2 = feat(2);
const lemmaForms = readJson(path.join(out, "lemma-forms.json"));
const manifest = readJson(path.join(out, "word-features", "manifest.json"));
// The data keys a Dictionary word by pull.js's own spelling (no Unicode
// normalisation); the expectations below are typed by hand, so compare in NFC.
const byNfc = (values) => Object.fromEntries(Object.entries(values).map(([k, v]) => [k.normalize("NFC"), v]));
const LF = byNfc(lemmaForms.values);

console.log("\n1. The fixture word and its neighbours, hand-written from the Corpus rows");

check("2:102:35 فَيَتَعَلَّمُونَ: resumption فَ, present prefix, Form V stem, plural doer ending; present, 3MP, indicative", () => {
  assert.deepEqual(s2.words["102:35"], {
    parts: ["rem-f", "impf-prefix", "stem-V", "subj-waw"],
    pos: "V", tense: "IMPF", form: 5, pgn: "3MP", mood: "IND",
  });
});
check("2:102:34 تَكْفُرْ: jussive, 2MS, Form I (no form key)", () => {
  assert.deepEqual(s2.words["102:34"], { parts: ["impf-prefix", "stem-V"], pos: "V", tense: "IMPF", pgn: "2MS", mood: "JUS" });
});
check("2:27:14 يُوصَلَ: passive, subjunctive", () => {
  assert.equal(s2.words["27:14"].pass, 1);
  assert.equal(s2.words["27:14"].mood, "SUBJ");
});
check("2:3:7 رَزَقْنَٰهُمْ: نَا is the doer (we), هُمْ the object", () => {
  assert.deepEqual(s2.words["3:7"].parts, ["stem-V", "subj-na", "pron-obj"]);
});
check("2:6:9 تُنذِرْهُمْ: Form IV, and هُمْ is an object, not a doer", () => {
  assert.deepEqual(s2.words["6:9"].parts, ["impf-prefix", "stem-V", "pron-obj"]);
  assert.equal(s2.words["6:9"].form, 4);
});
check("2:7:4 قُلُوبِهِمْ: the pronoun on a noun is possessive", () => {
  assert.deepEqual(s2.words["7:4"].parts, ["stem-N", "pron-poss"]);
});
check("1:7:4 عَلَيْهِمْ: the pronoun on a preposition", () => {
  assert.deepEqual(s1.words["7:4"].parts, ["stem-P", "pron-prep"]);
});
check("1:4:1 مَٰلِكِ: an active participle", () => {
  assert.equal(s1.words["4:1"].deriv, "AP");
});
check("the subject-or-object rule: a 3MS verb with a 3MS pronoun is an OBJECT (نَصَرَهُ)", () => {
  const rows = [
    { form: "naSara", tag: "V", features: "STEM|POS:V|PERF|LEM:naSara|ROOT:nSr|3MS" },
    { form: "hu", tag: "PRON", features: "SUFFIX|PRON:3MS" },
  ];
  assert.deepEqual(partIdsForRows(rows), ["stem-V", "pron-obj"]);
});
check("stemFeatures: a passive participle is a participle, not a passive verb", () => {
  assert.deepEqual(stemFeatures("N", "STEM|POS:N|PASS|PCPL|LEM:magoDuwb|ROOT:gDb|M|GEN"), { pos: "N", deriv: "PP" });
});

console.log("\n2. Whole-Qur'an sweeps");

check("coverage at least 99.5% of the Qur'an's 77,429 words", () => {
  assert.equal(manifest.totalWords, 77429);
  assert.ok(manifest.coveragePercent >= 99.5, `coverage ${manifest.coveragePercent}%`);
});
check("size budget: no surah file over 400 KB, all of them under 5 MB, lemma-forms under 200 KB", () => {
  assert.ok(manifest.maxBytes <= 400 * 1024, `largest ${manifest.maxBytes}`);
  assert.ok(manifest.totalBytes <= 5 * 1024 * 1024, `total ${manifest.totalBytes}`);
  assert.ok(fs.statSync(path.join(out, "lemma-forms.json")).size <= 200 * 1024);
});
const segDir = path.join(out, "word-segments");
let zipped = 0, mismatched = [];
const emitted = new Set();
for (let s = 1; s <= 114; s++) {
  const f = feat(s);
  const seg = readJson(path.join(segDir, `surah_${String(s).padStart(3, "0")}.json`));
  for (const [k, w] of Object.entries(f.words)) {
    w.parts.forEach((p) => emitted.add(p));
    const sg = seg.words[k];
    if (!sg) continue;
    zipped++;
    if (sg.length !== w.parts.length) mismatched.push(`${s}:${k}`);
  }
}
check("every word's part ids line up one-for-one with its colouring segments (zips by index)", () => {
  assert.ok(zipped > 77000, `only ${zipped} words compared`);
  assert.deepEqual(mismatched.slice(0, 5), []);
});
check("every part id the data carries has an Arabic, English and Bangla name", () => {
  const missing = [...emitted].filter((id) => {
    const n = T.partName(id);
    return !n || !n.ar || !n.en || !n.bn || !/[ঀ-৿]/.test(n.bn) || !/[؀-ۿ]/.test(n.ar);
  });
  assert.deepEqual(missing, []);
});
check("every part id the BUILD can emit has a name (not only the ones seen)", () => {
  const tags = Object.keys(T.STEM_NAMES);
  const missing = [...allEmittablePartIds(tags)].filter((id) => !T.partName(id));
  assert.deepEqual(missing, []);
  const stemTagsInData = [...emitted].filter((p) => p.startsWith("stem-")).map((p) => p.slice(5));
  assert.deepEqual(stemTagsInData.filter((t) => !T.STEM_NAMES[t]), []);
});

console.log("\n3. Basic's derived forms of ع ل م, as the approved demo shows them");

// Hand-written from the demo's FORMS table: [Dictionary word, group, Form].
const DEMO = [
  ["عَلِمَ", "verb", 1], ["عَلَّمَ", "verb", 2], ["يَتَعَلَّمُ", "verb", 5],
  ["عِلْم", "masdar", 1],
  ["عَٰلِم", "doer", 1],
  ["مَّعْلُوم", "done", 1], ["مَّعْلُومَٰت", "done", 1], ["مُعَلَّم", "done", 2],
  ["عَلِيم", "intens", 1], ["عَلَّٰم", "intens", 1],
  ["أَعْلَم", "elative", 1],
  ["عَٰلَمِين", "noun", 0], ["أَعْلَٰم", "noun", 0], ["عَلَٰمَٰت", "noun", 0],
];
check("all 14 of the demo's forms get the demo's group (and Form for verbs)", () => {
  for (const [lemma, group, form] of DEMO) {
    const v = LF[lemma.normalize("NFC")];
    assert.ok(v, `${lemma} missing`);
    assert.equal(v[0], group, `${lemma}: ${v[0]} ≠ ${group}`);
    if (group === "verb") assert.equal(v[1], form, `${lemma}: Form ${v[1]} ≠ ${form}`);
  }
});
check("ordered by the one table, the 14 come out in the demo's order", () => {
  const counts = byNfc(JSON.parse(fs.readFileSync(path.join(out, "lemmas-index.json"), "utf8")).values);
  const items = DEMO.map(([lemma]) => {
    const k = lemma.normalize("NFC");
    return { lemma, group: LF[k][0], form: LF[k][1], count: counts[k].length };
  });
  const shuffled = [...items].reverse();
  assert.deepEqual(T.orderDerivedForms(shuffled).map((x) => x.lemma), DEMO.map((d) => d[0]));
});
check("a homograph is never called a verbal noun: قَلْب (heart), شَمْس (sun), رَبّ stay Other nouns", () => {
  for (const w of ["قَلْب", "شَمْس", "رَبّ", "كِتَٰب"]) assert.equal(LF[w.normalize("NFC")][0], "noun", w);
});
check("the comparative rule refuses colours and bodily marks: أَبْيَض, أَصَمّ, أَرْبَع", () => {
  for (const w of ["أَبْيَض", "أَصَمّ", "أَرْبَع"]) assert.notEqual(LF[w.normalize("NFC")][0], "elative", w);
});
check("ruleGroup: فَعِيل on an adjective is intensive, on a plain noun it is nothing", () => {
  assert.equal(ruleGroup("Ealiym", "Elm", true), "intens");
  assert.equal(ruleGroup("Ealiym", "Elm", false), null);
  assert.equal(ruleGroup(">aEolam", "Elm", false), "elative");
  assert.equal(ruleGroup("qalob", "qlb", false), null);
});
check("every grouping carries its source letter, and only d/w/r/x", () => {
  const bad = Object.entries(lemmaForms.values).filter(([, v]) => !["d", "w", "r", "x"].includes(v[2]));
  assert.deepEqual(bad.slice(0, 3), []);
});

console.log("\n4. The tables (I11) and the load boundary (I9)");

check("one sentence per verb Form I–XII, English and Bangla", () => {
  for (let n = 1; n <= 12; n++) {
    const f = T.FORM_NAMES[n];
    assert.ok(f && f.en.length > 30 && /[ঀ-৿]/.test(f.bn) && f.past && f.present && f.ordinalAr, `Form ${n}`);
  }
});
check("every one of the app's Dictionary words has a group, and nothing else does", () => {
  const li = Object.keys(JSON.parse(fs.readFileSync(path.join(out, "lemmas-index.json"), "utf8")).values).sort();
  assert.deepEqual(Object.keys(lemmaForms.values).sort(), li);
});
check("the 14 persons in the poster's order, each with English and Bangla", () => {
  assert.deepEqual(T.PERSONS.map((p) => p.pgn), ["3MS", "3MD", "3MP", "3FS", "3FD", "3FP", "2MS", "2MD", "2MP", "2FS", "2FD", "2FP", "1S", "1P"]);
  assert.ok(T.PERSONS.every((p) => p.en && /[ঀ-৿]/.test(p.bn)));
  assert.equal(T.personFor("3D").pgn, "3MD");
});
check("no user-visible text says 'lemma' (decision 59: 'Dictionary word')", () => {
  const src = fs.readFileSync(path.join(root, "app", "js", "word-grammar-tables.js"), "utf8");
  const strings = src.match(/"[^"\n]*"/g) || [];
  assert.deepEqual(strings.filter((s) => /lemma/i.test(s)), []);
});
check("I9: only the on-demand loader names the new files; no page or module imports the loader yet", () => {
  const appDir = path.join(root, "app");
  const hits = [];
  const importers = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|html)$/.test(e.name) && !e.name.startsWith("_prev")) {
        // Comments name these files to explain them; only code counts (both comment forms stripped).
        const t = fs.readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/<!--[\s\S]*?-->/g, "");
        if (/word-features\/|lemma-forms\.json/.test(t)) hits.push(path.relative(root, p));
        if (/quran-word-features\.js/.test(t)) importers.push(path.relative(root, p));
      }
    }
  };
  walk(appDir);
  assert.deepEqual(hits, ["app/js/quran-word-features.js"]);
  assert.deepEqual(importers, []);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
