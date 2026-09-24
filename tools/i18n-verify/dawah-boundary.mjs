// MAP v4 Phase 7 (P7-A) -- the STRUCTURAL guards around the Dawah printable-
// page contract and its data layer. Everything here is invisible to a
// functional test.
//
// Two claims are made by P7-A that no behaviour suite can see:
//
//   1. ADR-005 -- "a Dawah piece is derived output and must never overwrite
//      its source Note" -- which is about WHAT `dawah-data.js` can reach,
//      not about what it does with what it reaches. The strongest, simplest
//      way to prove that is to assert it imports NOTHING from
//      note-foundation.js at all (not its write functions, not its read
//      functions, not even its id helpers), rather than trying to name every
//      write function note-foundation.js exports today and hoping the list
//      stays complete.
//   2. "This changes nothing" -- which is about WIRING. `dawah-data.js`
//      could pass every one of its own function-level tests while being
//      imported into a live screen. So this suite walks the real import
//      graph from every `app/*.html` page, the same shape
//      `study-note-boundary.mjs`/`study-approach-contract-boundary.mjs` both
//      already use for an uninvoked module.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

import { DAWAH_ACTIONS, DAWAH_PAGE_STATUSES, DAWAH_STATUS, dawahTransition } from "../../app/js/dawah-contract.js";

const root = path.resolve(process.argv[2] || process.cwd());
const appDir = path.join(root, "app");
const appJs = path.join(appDir, "js");

let passed = 0, failed = 0;
function check(name, fn) {
  // A SYNCHRONOUS RUNNER COUNTS AN `async` BODY AS A PASS -- the assertion
  // throws inside an uncaught promise and the case prints PASS. Refuse it.
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    }
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

const GUARDED = ["dawah-contract.js", "dawah-data.js"];

/** A module's CODE, with block comments and whole-line `//` comments removed -- so a forbidden name in a doc comment never counts as a real reference. */
function codeOf(name) {
  return fs.readFileSync(path.join(appJs, name), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(?:\/\/|\*)/.test(line))
    .join("\n");
}

function everyAppSource() {
  const out = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|html)$/.test(entry.name)) out.push(full);
    }
  })(appDir);
  return out;
}

// --- 1. UNINVOKED, BY ANY CHAIN OF ANY LENGTH -------------------------------

/** Local `./x.js` imports of one module. */
function localImportsOf(file) {
  const text = fs.readFileSync(file, "utf8");
  return [
    ...[...text.matchAll(/from\s*["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]),
    ...[...text.matchAll(/import\s*["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]),
  ];
}
/** The modules one page loads directly. */
function entryModulesOf(htmlPath) {
  return [...fs.readFileSync(htmlPath, "utf8").matchAll(/["'`](?:\.\/)?js\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]);
}
/** Every `app/*.html` page that can reach `target`, with the chain by which it does. */
function chainsToTarget(target) {
  const found = [];
  for (const entry of fs.readdirSync(appDir)) {
    if (!entry.endsWith(".html")) continue;
    const seen = new Set();
    const queue = entryModulesOf(path.join(appDir, entry)).map((m) => [m]);
    while (queue.length) {
      const chain = queue.shift();
      const head = chain[chain.length - 1];
      if (seen.has(head)) continue;
      seen.add(head);
      if (head === target) { found.push(`app/${entry} -> ${chain.join(" -> ")}`); break; }
      const full = path.join(appJs, head);
      if (!fs.existsSync(full)) continue;
      for (const next of localImportsOf(full)) queue.push([...chain, next]);
    }
  }
  return found;
}

check("POSITIVE CONTROL: the reachability walker really does find a wired module", () => {
  // Without this, a broken regex would make every chain come back empty and
  // the cases below would pass vacuously -- a check that cannot fail.
  const control = chainsToTarget("records.js");
  assert.ok(control.length > 0, "the walker found no page importing records.js -- it is not working");
});

check("no page reaches dawah-data.js, by any chain of any length -- it stays unreachable until P7-B", () => {
  const reachable = chainsToTarget("dawah-data.js");
  assert.deepEqual(reachable, [], `unexpected reachability for dawah-data.js: ${reachable.join(" | ")}`);
});

check("no page reaches dawah-contract.js, by any chain of any length", () => {
  const reachable = chainsToTarget("dawah-contract.js");
  assert.deepEqual(reachable, [], `unexpected reachability for dawah-contract.js: ${reachable.join(" | ")}`);
});

check("no app source imports either guarded module, by a direct textual scan", () => {
  const importers = [];
  for (const file of everyAppSource()) {
    if (GUARDED.some((g) => file.endsWith(path.join("js", g)))) continue;
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file).split(path.sep).join("/");
    for (const guarded of GUARDED) {
      const base = guarded.replace(/\.js$/, "");
      if (new RegExp(String.raw`(?:from|import)\s*["'\`][./]*(?:js/)?${base}\.js["'\`]`).test(text)) {
        importers.push(`${rel} -> ${guarded}`);
      }
    }
  }
  assert.deepEqual(importers, [], `unexpected importer(s) of the guarded modules: ${JSON.stringify(importers)}`);
});

// --- 2. ADR-005: dawah-data.js DOES NOT IMPORT note-foundation.js AT ALL ----

check("dawah-contract.js imports nothing at all -- pure policy, same pattern as journey-map-contract.js", () => {
  const text = fs.readFileSync(path.join(appJs, "dawah-contract.js"), "utf8");
  assert.equal([...text.matchAll(/^\s*import\s/gm)].length, 0);
});

check("dawah-data.js does not import note-foundation.js at all -- ADR-005, the strongest form of the claim", () => {
  // codeOf(), not the raw file text: this module's own header comment NAMES
  // note-foundation.js in prose, precisely to explain why it is not
  // imported -- the same "strip comments before grepping for a forbidden
  // name" lesson this codebase's own standing rules record.
  assert.ok(!/note-foundation\.js/.test(codeOf("dawah-data.js")), "dawah-data.js names note-foundation.js outside a comment");
  const text = fs.readFileSync(path.join(appJs, "dawah-data.js"), "utf8");
  const specifiers = [...text.matchAll(/^\s*import[^;]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  const local = specifiers.filter((s) => s.startsWith("./"));
  assert.deepEqual(local.sort(), ["./collections.js", "./dawah-contract.js", "./envelope.js"],
    `dawah-data.js's local imports have drifted from the expected, minimal set: ${local.join(", ")}`);
});

// A closed list, named explicitly and checked as its own thing (belt AND
// braces alongside the import check above): even if note-foundation.js were
// ever imported by accident, none of its WRITE functions may be named.
const NOTE_WRITING_FUNCTIONS = [
  "createPermanentNote", "updatePermanentNoteContent", "retirePermanentNote",
  "createNoteFolder", "renameNoteFolder", "reorderNoteFolder", "reparentNoteFolder", "retireNoteFolder",
  "createNotePlacement", "reorderNotePlacement", "retireNotePlacement", "moveNotePlacement",
  "createNoteSource", "retireNoteSource",
];
check("dawah-data.js never names a note-foundation.js WRITE function", () => {
  const text = codeOf("dawah-data.js");
  const offenders = NOTE_WRITING_FUNCTIONS.filter((name) => text.includes(name));
  assert.deepEqual(offenders, [], `dawah-data.js names note-writing function(s): ${offenders.join(", ")}`);
});

check("dawah-data.js reads notes/noteRevisions/noteSources read-only -- no setDoc/updateDoc/addDoc/runTransaction of its own on those collections", () => {
  const text = codeOf("dawah-data.js");
  for (const forbidden of ["setDoc(", "updateDoc(", "addDoc(", "runTransaction(", "writeBatch(", "deleteDoc("]) {
    assert.ok(!text.includes(forbidden), `dawah-data.js calls ${forbidden} directly -- every write must go through envelope.js`);
  }
});

// --- 3. the closed vocabulary is bound to ADR-011 ---------------------------

check("every status and action ADR-011 names is exactly what the contract implements", () => {
  const adr = fs.readFileSync(path.join(root, "docs/governance/adr/ADR-011-dawah-printable-pages-v1.md"), "utf8");
  for (const status of DAWAH_PAGE_STATUSES) {
    assert.ok(adr.includes(`\`${status}\``), `ADR-011 does not record the status ${status}`);
  }
  assert.deepEqual([...DAWAH_PAGE_STATUSES].sort(),
    [DAWAH_STATUS.DRAFT, DAWAH_STATUS.AWAITING_APPROVAL, DAWAH_STATUS.SHARED, DAWAH_STATUS.RETIRED].sort());
  for (const action of DAWAH_ACTIONS) {
    assert.ok(adr.includes(`\`${action}\``), `ADR-011 does not record the action ${action}`);
  }
});

check("the named transitions match ADR-011's own table exactly", () => {
  assert.equal(dawahTransition("submit", "draft"), "awaiting-approval");
  assert.equal(dawahTransition("share", "draft"), "shared");
  assert.equal(dawahTransition("approve", "awaiting-approval"), "shared");
  assert.equal(dawahTransition("return", "awaiting-approval"), "draft");
  for (const status of DAWAH_PAGE_STATUSES) {
    if (status === "retired") continue;
    assert.equal(dawahTransition("retire", status), "retired", `retire from ${status} should reach retired`);
  }
  assert.equal(dawahTransition("retire", "retired"), null, "retiring an already-retired page must refuse, not no-op silently");
});

check("no transition skips a status ADR-011 does not name -- e.g. no draft -> shared for a page that needs approval is expressed here", () => {
  // The contract itself cannot check "does this author need approval" (it
  // imports nothing and has no concept of an author) -- that gate is
  // dawah-data.js's own canShareDirectly() call before invoking this
  // transition. What the contract CAN guarantee is that every OTHER move
  // stays exactly the one named move, never a shortcut.
  assert.equal(dawahTransition("approve", "draft"), null, "approve must not be reachable from draft");
  assert.equal(dawahTransition("share", "awaiting-approval"), null, "share must not be reachable from awaiting-approval");
  assert.equal(dawahTransition("submit", "shared"), null, "submit must not be reachable from shared");
  assert.equal(dawahTransition("return", "draft"), null, "return must not be reachable from draft");
  assert.equal(dawahTransition("retire", "bogus-status"), null, "an unrecognised status must refuse, not guess");
});

// --- 4. no Rules/index/version material was touched this round -------------

function unchangedSinceMain(relPath) {
  const head = execFileSync("git", ["show", `origin/main:${relPath}`], { cwd: root, encoding: "utf8" });
  const now = fs.readFileSync(path.join(root, relPath), "utf8");
  assert.equal(now, head, `${relPath} is NOT byte-identical to origin/main`);
}

check("app/js/version.js is untouched -- no version bump from this round", () => {
  unchangedSinceMain("app/js/version.js");
});

// UPDATED IN PLACE, 24 Sep 2026. This check used to assert firestore.rules
// named no dawahPages at all -- true until the Owner published the Dawah
// Rules in the Firebase Console the same day ("Dawah rules are live"). It now
// asserts the repository copy is BYTE-IDENTICAL to the audited, append-only
// deployment file the Owner was given, so nothing else can ride in with it.
// firebase.json still carries no Dawah material (no index was needed).
check("firestore.rules is exactly the published Dawah deployment file, and firebase.json is unchanged", () => {
  const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
  const published = fs.readFileSync(path.join(root, "docs/governance/phase7-dawah-DEPLOYMENT-candidate-2026-09-24.rules"), "utf8");
  assert.equal(rules, published, "firestore.rules differs from the Dawah deployment file the Owner published");
  unchangedSinceMain("firebase.json");
});

check("the Rules candidate is a self-contained extract governing exactly dawahPages, and was not pasted into production", () => {
  const candidatePath = path.join(root, "docs/governance/phase7-dawah-pages-rules-candidate-2026-09-24.rules");
  assert.ok(fs.existsSync(candidatePath), "the Phase 7 Rules candidate file is missing");
  const candidate = fs.readFileSync(candidatePath, "utf8");
  const blocks = [...new Set([...candidate.matchAll(/match \/(\w+)\//g)].map((m) => m[1]))].filter((n) => n !== "databases");
  assert.deepEqual(blocks, ["dawahPages"], `the candidate must govern exactly dawahPages, saw: ${blocks}`);
  assert.ok(candidate.includes("STATUS: CANDIDATE. NOT DEPLOYED."), "the candidate does not state its own non-deployed status");
});

console.log(`\n==== Phase 7 Dawah pages boundary: ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
