// The assembled Phase 4-6 DEPLOYMENT candidate -- the text that would actually
// be pasted into the Firebase Console.
//
// WHY THIS SUITE EXISTS.
//
// Phase 5 and Phase 6 each produced a Rules candidate that is an EXTRACT: a
// self-contained file carrying its own copy of the shared helper block so the
// emulator can run it in isolation. Both say so in their headers. But until now
// there was no deployable text at all for either phase, which meant two things
// nobody had checked:
//
//   1. Pasting an extract into the Console would REPLACE the entire live
//      ruleset with a file governing three collections and nothing else.
//   2. Every emulator assertion was proving something about a file that would
//      never be deployed.
//
// And it hid a real divergence. Four helpers the extracts describe as
// "reproduced unchanged from the deployed rules" are NOT unchanged --
// hasRoleIn, myPersonIdIn, isSelfPerson and isCoEnrolledTeacherOf were written
// with defensive `.get(field, default)` reads where production reads the field
// directly. Same outcome whenever the field is present; different route when it
// is absent. Nothing compared them, because every existing check about
// firestore.rules asserts only what it does NOT contain.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
const CANDIDATE = "docs/governance/phase4-6-DEPLOYMENT-candidate-2026-09-17.rules";
const EXTRACTS = [
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
  // Without this, a broken regex would find no functions and every comparison
  // below would pass vacuously.
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
  // This is the safety property the whole task turns on: what gets deployed
  // must be the deployed security model, not a second one wearing its names.
  const offenders = [];
  for (const [name, bodies] of topLevelFunctions(candidate)) {
    if (!prodFns.has(name)) continue;
    if (!prodFns.get(name).includes(bodies[0])) offenders.push(name);
  }
  assert.deepEqual(offenders, [],
    `the candidate carries a DIFFERENT implementation of: ${offenders.join(", ")}`);
});

check("the deployment candidate governs every collection the three phases add", () => {
  for (const block of ["notes", "noteRevisions", "noteSources", "noteFolders", "notePlacements"]) {
    assert.ok(candidate.includes(`match /${block}/`), `missing match /${block}/`);
  }
  assert.ok(candidate.includes("/evidence/"), "missing the Phase 4 evidence subcollection");
  assert.ok(candidate.includes("match /tenantInvites/"), "the candidate is not built on the production ruleset");
});

// --- the extracts stay extracts, and their divergence set is PINNED ---------
check("each extract still declares itself undeployable", () => {
  for (const rel of EXTRACTS) {
    assert.match(read(rel), /must never be deployed as a whole file/,
      `${rel} no longer warns that it must not be pasted into the Console`);
  }
});

check("the extracts' divergence from production is EXACTLY the audited four", () => {
  // A NEW divergence is a fact someone must look at deliberately: it may be
  // harmless like these four, or it may be a second security model.
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
  const firebase = JSON.parse(read("firebase.json"));
  assert.ok(!("indexes" in (firebase.firestore ?? {})), "firebase.json now points at an index file");
});

check("the standing brief points at a deployment document that exists", () => {
  // The brief named docs/governance/phase4-production-package-2026-09-14.md,
  // which was never written -- a dead pointer the Owner would have followed.
  const brief = read("CLAUDE.md");
  for (const m of brief.matchAll(/`(docs\/governance\/[^`]+)`/g)) {
    assert.ok(fs.existsSync(path.join(root, m[1])), `CLAUDE.md points at a file that does not exist: ${m[1]}`);
  }
});

// --- the Owner-facing package must match the machine-readable candidates ----
check("the deployment package's index tables match the index candidates exactly", () => {
  // The package is what the Owner types into the Console by hand. If it drifts
  // from the candidates, they create the wrong index and the queries fail in a
  // way no test here would ever see.
  const pkg = read("docs/governance/phase4-6-production-deployment-package-2026-09-17.md");
  const declared = [
    "docs/governance/phase5-note-foundation-indexes-candidate-2026-09-15.json",
    "docs/governance/phase6-journey-map-indexes-candidate-2026-09-17.json",
  ].flatMap((rel) => JSON.parse(read(rel)).indexes)
   .map((idx) => `${idx.collectionGroup}: ${idx.fields.map((f) => `${f.fieldPath} ${f.order}`).join(", ")}`)
   .sort();

  const written = [];
  for (const chunk of pkg.split(/^### Index \d+$/m).slice(1)) {
    const collection = /\| Collection ID \| `([^`]+)` \|/.exec(chunk);
    if (!collection) continue;
    const fields = [...chunk.matchAll(/\| Field \d+ \| `([^`]+)` — \*{0,2}(Ascending|Descending)\*{0,2} \|/g)]
      .map((m) => `${m[1]} ${m[2].toUpperCase()}`);
    written.push(`${collection[1]}: ${fields.join(", ")}`);
  }
  assert.ok(written.length > 0, "no index tables were parsed from the package -- the format changed");
  assert.deepEqual(written.sort(), declared,
    "the package's hand-written index tables have drifted from the index candidates");
});

console.log(`\n==== Rules deployment candidate: ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
