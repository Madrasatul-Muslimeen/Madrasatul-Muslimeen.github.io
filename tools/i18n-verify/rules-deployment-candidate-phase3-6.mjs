// The assembled Phase 3-6 DEPLOYMENT candidate -- the text that would
// actually be pasted into the Firebase Console. Same method as
// rules-deployment-candidate.mjs (Phase 4-6, 17 Sep 2026), extended by one
// more phase: MAP Phase 3, Arabic Progress (quranWordProgress /
// quranWordApprovals), added 22 Sep 2026 on the Owner's own instruction.
//
// THAT FILE IS KEPT, NOT REPLACED -- it is the historical record of the
// Phase 4-6-only assembly and stays exactly as it was. This is a NEW file
// governing a NEW candidate, because the candidate itself is new: production
// plus four phases now, not three.
//
// Same divergence this repository already found and pinned for Phase 5/6:
// an extract that says a helper is "reproduced unchanged from the deployed
// rules" is not always telling the truth about its own body, and nothing
// catches that except comparing the bodies.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
const CANDIDATE = "docs/governance/phase3-6-DEPLOYMENT-candidate-2026-09-22.rules";
const EXTRACTS = [
  "tests/firestore/word-progress-v1.proposed.rules",
  "docs/governance/phase5-note-foundation-rules-candidate-2026-09-15.rules",
  "docs/governance/phase6-journey-map-rules-candidate-2026-09-15.rules",
];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

/** Top-level (4-space) function definitions -> normalised bodies. */
function topLevelFunctions(text) {
  const lines = text.split("\n");
  const out = new Map();
  for (let i = 0; i < lines.length; i++) {
    const m = /^ {4}function ([A-Za-z0-9_]+)\(/.exec(lines[i]);
    if (!m) continue;
    let depth = 0, j = i, started = false;
    const chunk = [];
    for (; j < lines.length; j++) {
      chunk.push(lines[j]);
      depth += (lines[j].match(/\{/g) ?? []).length - (lines[j].match(/\}/g) ?? []).length;
      if (lines[j].includes("{")) started = true;
      if (started && depth <= 0) break;
    }
    const body = chunk.join("\n").replace(/\s+/g, " ").trim();
    if (!out.has(m[1])) out.set(m[1], []);
    out.get(m[1]).push(body);
    i = j;
  }
  return out;
}

const production = read("firestore.rules");
const candidate = read(CANDIDATE);
const prodFns = topLevelFunctions(production);

check("POSITIVE CONTROL: the function comparator really reads bodies", () => {
  assert.ok(prodFns.size > 30, `only ${prodFns.size} top-level helpers found in firestore.rules`);
  assert.ok(prodFns.has("signedIn") && prodFns.has("canRecordFor"), "known production helpers missing");
});

// --- the candidate is production PLUS, never production ALTERED -------------
check("the deployment candidate drops no production line", () => {
  const missing = production.split("\n").filter((l) => l.trim() && !candidate.includes(l));
  assert.deepEqual(missing.slice(0, 3), [],
    `${missing.length} production line(s) absent -- deploying this would REMOVE live rules`);
});

check("the deployment candidate defines no top-level helper twice", () => {
  const dupes = [...topLevelFunctions(candidate)].filter(([, bodies]) => bodies.length > 1).map(([n]) => n);
  assert.deepEqual(dupes, [], `duplicate top-level definitions would not compile: ${dupes.join(", ")}`);
});

check("the deployment candidate never REDEFINES a production helper differently", () => {
  const offenders = [];
  for (const [name, bodies] of topLevelFunctions(candidate)) {
    if (!prodFns.has(name)) continue;
    if (!prodFns.get(name).includes(bodies[0])) offenders.push(name);
  }
  assert.deepEqual(offenders, [],
    `the candidate carries a DIFFERENT implementation of: ${offenders.join(", ")}`);
});

check("the three genuinely-new Phase 3 helpers are genuinely new", () => {
  // canSuperviseRecordFor/wordLaneIdentityUnchanged/isWordLaneCreate must not
  // already exist in production under a different meaning -- if they did,
  // the redefinition check above would already have failed, but a NAME that
  // is merely absent from production and present once in the candidate is
  // the only shape a truly new helper can take. Assert that shape directly.
  const candFns = topLevelFunctions(candidate);
  for (const name of ["canSuperviseRecordFor", "wordLaneIdentityUnchanged", "isWordLaneCreate"]) {
    assert.ok(!prodFns.has(name), `${name} was supposed to be new but production already defines it`);
    assert.equal(candFns.get(name)?.length, 1, `${name} is missing or defined more than once`);
  }
});

check("the deployment candidate governs every collection the four phases add", () => {
  for (const block of ["quranWordProgress", "quranWordApprovals",
                        "notes", "noteRevisions", "noteSources", "noteFolders", "notePlacements"]) {
    assert.ok(candidate.includes(`match /${block}/`), `missing match /${block}/`);
  }
  assert.ok(candidate.includes("/evidence/"), "missing the Phase 4 evidence subcollection");
  assert.ok(candidate.includes("match /tenantInvites/"), "the candidate is not built on the production ruleset");
});

// --- the extracts stay extracts ---------------------------------------------
check("the Phase 5/6 extracts still declare themselves undeployable", () => {
  for (const rel of EXTRACTS.slice(1)) {
    assert.match(read(rel), /must never be deployed as a whole file/,
      `${rel} no longer warns that it must not be pasted into the Console`);
  }
});

check("the Phase 3 extract still declares itself a candidate, not production", () => {
  const text = read(EXTRACTS[0]);
  assert.match(text, /CANDIDATE\. NOT DEPLOYED\. NOT MERGED INTO firestore\.rules/,
    "the Phase 3 extract no longer warns that it is undeployed");
});

check("the extracts' divergence from production is EXACTLY the audited four", () => {
  const KNOWN = ["hasRoleIn", "isCoEnrolledTeacherOf", "isSelfPerson", "myPersonIdIn"].sort();
  const found = new Set();
  for (const rel of EXTRACTS) {
    for (const [name, bodies] of topLevelFunctions(read(rel))) {
      if (!prodFns.has(name)) continue;
      if (!prodFns.get(name).includes(bodies[0])) found.add(name);
    }
  }
  assert.deepEqual([...found].sort(), KNOWN,
    `the set of helpers that differ from production has changed -- re-audit before updating this list`);
});

// --- nothing is deployed ----------------------------------------------------
check("nothing has been deployed: firestore.rules and firebase.json are untouched", () => {
  assert.ok(!production.includes("match /notes/"), "firestore.rules now governs the Note Foundation");
  assert.ok(!production.includes("/evidence/"), "firestore.rules now carries the Phase 4 amendment");
  assert.ok(!production.includes("match /quranWordProgress/"), "firestore.rules now governs word progress");
  const firebase = JSON.parse(read("firebase.json"));
  assert.ok(!("indexes" in (firebase.firestore ?? {})), "firebase.json now points at an index file");
});

check("Phase 3 needs no new index -- confirmed against the app's own query", () => {
  // getSurahProgress() is equality-only (tenantId, personId, level, surah),
  // no orderBy, no range filter -- single-field indexes already serve it.
  // firestore-index-requirements.mjs scans every query in the app and would
  // fail if that ever stopped being true; this just pins the reason in one
  // place next to the rules that would otherwise look like they need one.
  const dataLayer = read("app/js/quran-word-progress-data.js");
  assert.ok(dataLayer.includes('where("tenantId"'), "the query shape this check assumes has changed");
  assert.ok(!/orderBy\(/.test(dataLayer.match(/const laneQuery[\s\S]*?\);/)?.[0] ?? ""),
    "the word-progress query now orders results -- it may need a composite index");
});

console.log(`\n==== Rules deployment candidate (Phase 3-6): ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
