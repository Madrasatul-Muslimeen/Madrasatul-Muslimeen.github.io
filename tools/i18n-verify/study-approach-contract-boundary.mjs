// MAP Phase 4 task P4-A — boundary suite for the pure Study-to-Approach
// contract tranche.
//
// The two modules this guards (study-approach-contract.js,
// study-activity-evidence.js) are PURE POLICY and deliberately UNINVOKED:
// landing them must change nothing a reader sees and nothing the app writes.
// A suite that only exercised their functions would pass just as happily if
// someone wired them into a live write path, so the invariants that actually
// matter for this tranche are asserted here instead:
//
//   1. Nothing in app/ imports either module (uninvoked, BR-0).
//   2. Neither module can reach Firestore, Activity, Records or Rules.
//   3. Every Approach id the policy names still IS the Approach it means,
//      read from APPROACH_TEMPLATES rather than trusted as a literal.
//   4. The unit keys and occurrence ids the evidence module accepts are
//      exactly the ones buildUnitKey / quranWordOccurrenceId produce (I5).
//
// Checks 3 and 4 exist because the contract hardcodes "approach_07" and a
// unit-key regexp. If a later round renumbers the catalogue or reshapes a
// permanent key, the contract would keep passing its own tests while mapping
// real study to the wrong Approach. That defect is invisible on a screen.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { STUDY_EVENT_POLICY, studyEventApproachId } from "../../app/js/study-approach-contract.js";
import { projectStudyActivityEvidence } from "../../app/js/study-activity-evidence.js";
import { APPROACH_TEMPLATES } from "../../app/js/catalogue-data.js";
import { buildUnitKey } from "../../app/js/unit-keys.js";
import { quranWordOccurrenceId } from "../../app/js/quran-word-identity.js";

const root = path.resolve(process.argv[2] || process.cwd());
const appJs = path.join(root, "app", "js");

let passed = 0;
let failed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log(`  PASS  ${name}`); }
  catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

/**
 * A module's CODE, with block comments and whole-line `//` comments removed.
 *
 * The forbidden-token checks below must read code, not prose: this module's
 * own header comment states that it "never calls Records/claimStatus", and a
 * raw text scan therefore failed on the very sentence promising the thing it
 * was checking for. Trailing `//` comments are deliberately still scanned —
 * that errs towards a false alarm rather than a missed wiring.
 */
function codeOf(name) {
  return fs.readFileSync(path.join(appJs, name), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(?:\/\/|\*)/.test(line))
    .join("\n");
}

const GUARDED = ["study-approach-contract.js", "study-activity-evidence.js"];

/** Every .js under app/ plus every .html in app/, as { file, text }. */
function appSources() {
  const out = [];
  for (const entry of fs.readdirSync(appJs)) {
    if (entry.endsWith(".js")) out.push({ file: `app/js/${entry}`, text: fs.readFileSync(path.join(appJs, entry), "utf8") });
  }
  const i18n = path.join(appJs, "i18n");
  if (fs.existsSync(i18n)) {
    for (const entry of fs.readdirSync(i18n)) {
      if (entry.endsWith(".js")) out.push({ file: `app/js/i18n/${entry}`, text: fs.readFileSync(path.join(i18n, entry), "utf8") });
    }
  }
  for (const entry of fs.readdirSync(path.join(root, "app"))) {
    if (entry.endsWith(".html")) out.push({ file: `app/${entry}`, text: fs.readFileSync(path.join(root, "app", entry), "utf8") });
  }
  return out;
}

// --- 1. uninvoked ----------------------------------------------------------

check("no app source imports the guarded modules", () => {
  const importers = [];
  for (const { file, text } of appSources()) {
    if (GUARDED.includes(path.basename(file))) continue;
    for (const guarded of GUARDED) {
      const base = guarded.replace(/\.js$/, "");
      if (new RegExp(`["'\`][./]*(?:js/)?${base}\\.js["'\`]`).test(text)) importers.push(`${file} -> ${guarded}`);
    }
  }
  assert.deepEqual(importers, [], `guarded modules are wired in: ${importers.join(", ")}`);
});

check("the evidence module imports only the contract and word identity", () => {
  const text = fs.readFileSync(path.join(appJs, "study-activity-evidence.js"), "utf8");
  const specifiers = [...text.matchAll(/^\s*import[^;]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  assert.deepEqual(specifiers.sort(), ["./quran-word-identity.js", "./study-approach-contract.js"]);
});

check("the contract module imports nothing at all", () => {
  const text = fs.readFileSync(path.join(appJs, "study-approach-contract.js"), "utf8");
  assert.equal([...text.matchAll(/^\s*import\s/gm)].length, 0);
});

check("neither module can reach Firestore, Activity, Records or Rules", () => {
  for (const name of GUARDED) {
    const text = codeOf(name);
    for (const forbidden of ["firebasejs", "firestore", "setDoc", "updateDoc", "addDoc", "runTransaction",
                             "arrayUnion", "./activity.js", "./records.js", "./envelope.js", "firestore.rules"]) {
      assert.ok(!text.includes(forbidden), `${name} references ${forbidden}`);
    }
  }
});

check("neither module writes a status, claim or approval", () => {
  for (const name of GUARDED) {
    const text = codeOf(name);
    for (const forbidden of ["claimStatus", "confirmStatus", "achieved", "mastered", "approveWord", "setApproval"]) {
      assert.ok(!text.includes(forbidden), `${name} references ${forbidden}`);
    }
  }
});

// --- 2. the live Activity writer is untouched -------------------------------

check("activity.js still uses its existing arrayUnion append path", () => {
  const text = codeOf("activity.js");
  assert.ok(text.includes("arrayUnion"), "activity.js no longer appends with arrayUnion");
  assert.ok(!text.includes("v1Events"), "activity.js carries the gated keyed-map writer");
  assert.ok(!text.includes("study-activity-week"), "activity.js imports the gated keyed writer");
  assert.ok(!text.includes("study-approach-contract"), "activity.js is wired to the v1 contract");
});

// --- 3. Approach ids still mean what the contract says ----------------------

const EXPECTED_APPROACH_NAMES = Object.freeze({
  approach_01: "Reading (with Tajweed)",
  approach_03: "Reading (with Meaning)",
  approach_04: "Reading — Word-by-Word Meaning",
  approach_07: "Listening Attentively (Arabic only)",
  approach_08: "Listening Attentively (Arabic with meaning)",
  approach_10: "Journaling",
});

const byId = new Map(APPROACH_TEMPLATES.map((tpl) => [tpl.id, tpl]));

check("every Approach id the policy names exists in the catalogue", () => {
  for (const id of Object.keys(EXPECTED_APPROACH_NAMES)) {
    assert.ok(byId.has(id), `${id} is not in APPROACH_TEMPLATES`);
  }
});

check("each named Approach still IS the Approach the contract means", () => {
  for (const [id, englishName] of Object.entries(EXPECTED_APPROACH_NAMES)) {
    assert.equal(byId.get(id).name.en, englishName, `${id} has been renumbered or renamed`);
  }
});

check("the policy references no Approach outside that set", () => {
  const referenced = new Set();
  for (const policy of Object.values(STUDY_EVENT_POLICY)) {
    if (policy.approachId) referenced.add(policy.approachId);
    for (const id of policy.approachIds ?? []) referenced.add(id);
  }
  assert.deepEqual([...referenced].sort(), Object.keys(EXPECTED_APPROACH_NAMES).sort());
});

check("the resolved Reading and Listening variants are the catalogue's own pair", () => {
  assert.equal(byId.get(studyEventApproachId("reading.completed", "plain")).name.en, "Reading (with Tajweed)");
  assert.equal(byId.get(studyEventApproachId("reading.completed", "with-meaning")).name.en, "Reading (with Meaning)");
  assert.equal(byId.get(studyEventApproachId("listening.completed", "arabic-only")).name.en, "Listening Attentively (Arabic only)");
  assert.equal(byId.get(studyEventApproachId("listening.completed", "with-meaning")).name.en, "Listening Attentively (Arabic with meaning)");
});

check("all 30 Approaches are still present, so nothing was renumbered wholesale", () => {
  assert.equal(APPROACH_TEMPLATES.length, 30);
});

// --- 4. permanent keys the evidence module accepts are the app's own --------

const common = { tenantId: "t1", personId: "p1", dateIso: "2026-09-14", eventType: "reading.completed", mode: "plain" };

check("the three accepted unit keys are exactly what buildUnitKey produces", () => {
  for (const unitKey of [buildUnitKey.ayah(2, 255), buildUnitKey.range(2, 254, 256), buildUnitKey.surah(2)]) {
    const row = projectStudyActivityEvidence({ ...common, unitKey });
    assert.equal(row.unitKey, unitKey, `${unitKey} was not accepted verbatim`);
  }
});

check("the unit key is stored verbatim and never reshaped", () => {
  const unitKey = buildUnitKey.range(2, 254, 256);
  assert.equal(projectStudyActivityEvidence({ ...common, unitKey }).unitKey, unitKey);
});

check("unit types outside the accepted three fail closed, not silently", () => {
  for (const unitKey of [buildUnitKey.juz(3), buildUnitKey.ruku(2, 1), buildUnitKey.page("madani", 5),
                         buildUnitKey.hizb(4), buildUnitKey.topic("t42"), buildUnitKey.name(1)]) {
    assert.throws(() => projectStudyActivityEvidence({ ...common, unitKey }), /Study Unit/, `${unitKey} did not fail closed`);
  }
});

check("the accepted occurrence id is exactly what quranWordOccurrenceId produces", () => {
  const row = projectStudyActivityEvidence({
    ...common, eventType: "wbw.engaged", mode: null,
    unitKey: buildUnitKey.ayah(2, 255), occurrenceId: quranWordOccurrenceId(2, 255, 1),
  });
  assert.equal(row.occurrenceId, quranWordOccurrenceId(2, 255, 1));
  assert.equal(row.trackableId, "approach_04");
});

// --- 5. no Rules, index or migration material in this tranche ---------------

check("no Firestore Rules or index file is touched by this tranche", () => {
  const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
  assert.ok(!rules.includes("v1Events"), "firestore.rules carries keyed-Activity material");
  assert.ok(!rules.includes("study-approach-contract"), "firestore.rules references the v1 contract");
  assert.ok(!fs.existsSync(path.join(root, "firestore.indexes.json")), "a tracked index file appeared");
  assert.ok(!fs.existsSync(path.join(root, "tests", "firestore", "activity-v1.proposed.rules")),
    "the gated Activity Rules candidate leaked into this tranche");
});

console.log(`\n==== Phase 4 pure contract boundary: ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
