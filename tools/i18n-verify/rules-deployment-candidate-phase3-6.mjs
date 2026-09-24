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
import { execFileSync } from "node:child_process";

const root = path.resolve(process.argv[2] || process.cwd());
const CANDIDATE = "docs/governance/phase3-6-DEPLOYMENT-candidate-2026-09-22.rules";
const EXTRACTS = [
  "tests/firestore/word-progress-v1.proposed.rules",
  "docs/governance/phase5-note-foundation-rules-candidate-2026-09-15.rules",
  "docs/governance/phase6-journey-map-rules-candidate-2026-09-15.rules",
];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
// The commit where firestore.rules was synced to CANDIDATE above, faithfully
// and nothing else -- i.e. the Phase 3-6 deployment, confirmed byte-identical
// to CANDIDATE by this suite's own equality check at the time (`git show
// a8bb2d8:firestore.rules` == CANDIDATE, still true, still checked below).
// A LATER, separate, also-audited deployment (issue #206's quranWordTotals,
// 2026-09-24) has since been synced into firestore.rules on top of this --
// correctly, since it is a real later fact, not a defect. Comparing THAT
// live file against this Phase-3-6-only candidate would therefore report a
// growing "divergence" forever after, for every future legitimate Rules
// round, which is the same "vacuous forever" trap this file's own sibling
// check ("the three genuinely-new Phase 3 helpers are genuinely new") was
// already written to avoid. What this suite exists to prove is a fact about
// THIS round's own deployment -- that it was pasted faithfully -- and that
// fact does not move just because a later, different round shipped after it.
const AUDITED_DEPLOYMENT_REF = "a8bb2d8";
const readAtRef = (ref, rel) =>
  execFileSync("git", ["show", `${ref}:${rel}`], { cwd: root, encoding: "utf8" });

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
// Pinned per AUDITED_DEPLOYMENT_REF's own comment above -- used only by the
// two checks that assert a fact about THIS round's deployment specifically,
// not by anything checking the extracts against current reality.
const productionAtSync = readAtRef(AUDITED_DEPLOYMENT_REF, "firestore.rules");

check("POSITIVE CONTROL: the function comparator really reads bodies", () => {
  assert.ok(prodFns.size > 30, `only ${prodFns.size} top-level helpers found in firestore.rules`);
  assert.ok(prodFns.has("signedIn") && prodFns.has("canRecordFor"), "known production helpers missing");
});

// --- the candidate is production PLUS, never production ALTERED -------------
// Uses productionAtSync (pinned), not live production -- see
// AUDITED_DEPLOYMENT_REF's own comment: this is a fact about THIS round's
// deployment, and a later, separate, also-audited round syncing more
// material into firestore.rules afterward does not make it false.
check("the deployment candidate drops no production line", () => {
  const missing = productionAtSync.split("\n").filter((l) => l.trim() && !candidate.includes(l));
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
  // already exist in PRE-PHASE-3 production under a different meaning -- if
  // they did, the redefinition check above would already have failed, but a
  // NAME that is merely absent from that baseline and present once in the
  // candidate is the only shape a truly new helper can take. Assert that
  // shape directly.
  //
  // BASELINE IS THE 17 SEP CANDIDATE, NOT LIVE `firestore.rules` -- and this
  // is deliberate, not an oversight. Rules were actually deployed 22 Sep
  // 2026 (confirmed by the Owner), so `firestore.rules` now equals THIS
  // candidate and of course already contains all three names; comparing
  // against it would make this check pass vacuously forever. What it needs
  // to prove is unchanged by deployment: that these three names were new
  // INVENTIONS at assembly time, not accidental duplicates of something
  // production already had. `phase4-6-DEPLOYMENT-candidate-2026-09-17.rules`
  // is the fixed historical record of exactly that pre-Phase-3 state (kept,
  // never replaced, per this file's own header) -- the correct baseline for
  // a fact about the past, which does not move just because `firestore.rules`
  // later did.
  const prePhase3Baseline = topLevelFunctions(read("docs/governance/phase4-6-DEPLOYMENT-candidate-2026-09-17.rules"));
  const candFns = topLevelFunctions(candidate);
  for (const name of ["canSuperviseRecordFor", "wordLaneIdentityUnchanged", "isWordLaneCreate"]) {
    assert.ok(!prePhase3Baseline.has(name), `${name} was supposed to be new but the pre-Phase-3 baseline already defines it`);
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

// --- DEPLOYED, 22 Sep 2026, AND FAITHFULLY -----------------------------------
// This check used to assert the opposite -- that firestore.rules was
// untouched -- because until the Owner actually published in the Firebase
// Console, claiming otherwise would have been the repository asserting a
// deployment nobody had performed. That deployment happened (confirmed by
// the Owner directly, indexes and rules both). The check now guards the
// other direction: that the sync was a clean, faithful copy, byte for byte,
// not a paste that silently dropped or altered something on the way in.
//
// UPDATED IN PLACE 2026-09-24, reason recorded: this compared against LIVE
// firestore.rules, which was correct while this Phase 3-6 sync was the most
// recent deployment -- and stopped being correct the moment a second,
// separate, also-audited round (issue #206's quranWordTotals) was synced in
// afterward, which would otherwise make this check fail forever after for a
// reason that has nothing to do with whether THIS round's paste was clean.
// Pinned to productionAtSync (AUDITED_DEPLOYMENT_REF, see above) instead --
// a fact about the past does not move just because firestore.rules later did,
// the same principle rules-deployment-candidate.mjs's own PRE_DEPLOYMENT_REF
// and this file's "genuinely new Phase 3 helpers" check already apply.
check("firestore.rules (as synced 2026-09-22) matched the audited Phase 3-6 candidate exactly", () => {
  assert.equal(productionAtSync, candidate,
    "firestore.rules at the Phase 3-6 sync commit has diverged from the audited candidate -- either it was not a clean paste, or AUDITED_DEPLOYMENT_REF points at the wrong commit");
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
