// MAP Phase 4 (P4-C) -- the STRUCTURAL guards around the evidence writer.
//
// Everything this suite asserts is invisible to a functional test. The writer
// could pass every behaviour check in study-activity-evidence-store.mjs while
// being wired into a Study screen, or while quietly appending to the legacy
// entries[] array -- and the second of those is not a tidiness problem, it is
// the Activity-to-Mastery escalation P4-B was built to prevent:
//
//   records.js bulkConfirmWeek() builds its confirm set ENTIRELY from
//   activity.entries[]. A (unitKey, trackableId) pair appearing there causes
//   the matching PENDING Mastery claim to be confirmed. So if Study evidence
//   ever reached that array, merely reading an ayah would enlarge what one
//   supervisor click confirms -- in client code, where no Firestore Rule can
//   intervene.
//
// The protection is structural, so it is held here, by reading the source.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { APPROACH_TEMPLATES } from "../../app/js/catalogue-data.js";

const root = path.resolve(process.argv[2] || process.cwd());
const appJs = path.join(root, "app", "js");
let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const result = fn();
    // A promise here means an async body whose assertions this synchronous
    // runner would never see -- the failure would land in an uncaught
    // rejection and the case would be counted green. Refuse it loudly.
    if (result && typeof result.then === "function") {
      throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    }
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

const GUARDED = ["study-activity-evidence-id.js", "study-activity-evidence-store.js"];

// MERGED 2026-09-17 (main <- claude/phase4-wiring). Two true invariants met
// here and neither survives alone:
//
//   main  said NO PAGE may reach the writer, because through P5/P6 nothing was
//         wired and that was the whole safety case.
//   P4-D  said the writer has exactly ONE audited entry point, because this
//         branch wires Study surfaces to it ON PURPOSE.
//
// On this branch "unreachable" is simply false, and asserting it would have
// been asserting that the wiring does not work. So main's REACHABILITY WALKER
// is kept -- it is the stronger mechanism, catching a wiring wherever in the
// chain it happens -- and applied to P4-D's invariant: every page-reachable
// path to the writer must pass THROUGH the wiring module. A second module
// quietly learning to write evidence is what that catches.
const WIRING = "study-event-wiring.js";

/** A module's CODE, with block comments and whole-line `//` comments removed -- these checks must read code, not the prose that describes it. Trailing `//` comments stay in scope deliberately: that errs towards a false alarm, never a missed wiring. */
function codeOf(name) {
  return fs.readFileSync(path.join(appJs, name), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((line) => !/^\s*(?:\/\/|\*)/.test(line)).join("\n");
}
function appSources() {
  const out = [];
  for (const entry of fs.readdirSync(appJs)) {
    if (entry.endsWith(".js")) out.push({ file: `app/js/${entry}`, text: fs.readFileSync(path.join(appJs, entry), "utf8") });
  }
  const i18n = path.join(appJs, "i18n");
  if (fs.existsSync(i18n)) for (const e of fs.readdirSync(i18n)) {
    if (e.endsWith(".js")) out.push({ file: `app/js/i18n/${e}`, text: fs.readFileSync(path.join(i18n, e), "utf8") });
  }
  for (const e of fs.readdirSync(path.join(root, "app"))) {
    if (e.endsWith(".html")) out.push({ file: `app/${e}`, text: fs.readFileSync(path.join(root, "app", e), "utf8") });
  }
  return out;
}

// --- reachability: what can a PAGE actually load? --------------------------
//
// UPDATED 2026-09-15 (P5-C), with the reason recorded rather than the check
// deleted. The two cases below used to assert that NOTHING under app/ imports
// the writer at all. P5-C adds `study-note-service.js`, which imports it and is
// itself imported by nothing -- so the original mechanism failed while the
// claim it stands for ("no Study surface records evidence") stayed true.
//
// A blunter answer would have been an exception for that one file, which is
// exactly the "worked around" this project forbids: the next module importing
// the writer would need another exception, and the tenth would be a live
// wiring nobody noticed. So the mechanism is now STRICTER, not looser -- it
// follows the import graph from every page in app/ and asserts the writer is
// not reachable from any of them by any chain of any length. A wiring is
// caught wherever in that chain it happens.

/** Local `./x.js` imports of one module. */
function localImportsOf(file) {
  const text = fs.readFileSync(file, "utf8");
  return [
    ...[...text.matchAll(/from\s*["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]),
    ...[...text.matchAll(/import\s*["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]),
  ];
}

/** The modules one page loads directly, via a script src or an inline module import. */
function entryModulesOf(htmlPath) {
  return [...fs.readFileSync(htmlPath, "utf8").matchAll(/["'`](?:\.\/)?js\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]);
}

/** Every `app/*.html` page that can reach `target`, with the chain by which it does. */
function chainsToTarget(target) {
  const found = [];
  for (const entry of fs.readdirSync(path.join(root, "app"))) {
    if (!entry.endsWith(".html")) continue;
    const seen = new Set();
    const queue = entryModulesOf(path.join(root, "app", entry)).map((m) => [m]);
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

/** The modules that import one of the guarded files directly. */
function directImportersOf() {
  const importers = [];
  for (const { file, text } of appSources()) {
    if (GUARDED.includes(path.basename(file))) continue;
    for (const guarded of GUARDED) {
      const base = guarded.replace(/\.js$/, "");
      if (new RegExp(String.raw`(?:from|import)\s*["'\`][./]*(?:js/)?${base}\.js["'\`]`).test(text)) importers.push(path.basename(file));
    }
  }
  return [...new Set(importers)].sort();
}

// --- 1. the writer is UNINVOKED -------------------------------------------
check("POSITIVE CONTROL: the reachability walker really does find a wired module", () => {
  // Without this, a broken regex in entryModulesOf() would make every chain
  // come back empty and the three cases below would pass vacuously -- a check
  // that cannot fail, which this project has shipped before. So the walker is
  // first asked for a module that IS unmistakably wired into a real page.
  const control = chainsToTarget("records.js");
  assert.ok(control.length > 0, "the walker found no page importing records.js -- it is not working");
  assert.ok(control.some((c) => c.includes("quranrevival.html")), `unexpected control result: ${control[0]}`);
});
check("every page-reachable path to the writer passes THROUGH the wiring module", () => {
  const chains = GUARDED.flatMap((guarded) => chainsToTarget(guarded));
  assert.ok(chains.length > 0,
    "no page reaches the writer at all -- on this branch the Study wiring is live, so that means it is broken");
  const unaudited = chains.filter((chain) => !chain.includes(`-> ${WIRING} ->`));
  assert.deepEqual(unaudited, [],
    `a page reaches the writer WITHOUT going through ${WIRING}: ${unaudited.join(" | ")}`);
});
check("the importer set is exactly the wiring module plus the queued, unreachable one", () => {
  // The expected list is pinned, not merely permitted: a NEW importer appearing
  // here is a fact a later session must audit deliberately, even while it is
  // still unreachable. It is also the list of what is queued behind the Rules
  // deployment.
  const importers = directImportersOf();
  assert.deepEqual(importers, [WIRING, "study-note-service.js"].sort(),
    `the set of modules importing the writer has changed -- re-audit before updating this list: ${importers.join(", ")}`);
  for (const importer of importers) {
    if (importer === WIRING) continue;   // live on purpose; covered by the case above
    assert.deepEqual(chainsToTarget(importer), [], `${importer} is now loaded by a page`);
  }
});
check("no PAGE-REACHABLE source but the wiring module names a Study event writer", () => {
  const offenders = [];
  for (const { file, text } of appSources()) {
    const base = path.basename(file);
    if (GUARDED.includes(base)) continue;
    if (!/writeStudyActivityEvidence|studyEvidenceId|buildStudyEvidenceDocument/.test(text)) continue;
    if (base === WIRING) continue;                                          // the audited entry point
    if (file.endsWith(".js") && chainsToTarget(base).length === 0) continue; // queued, not wired
    offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});


// --- 2. evidence can never reach legacy entries[] -------------------------
check("activity.js is untouched: still the arrayUnion append path", () => {
  const text = codeOf("activity.js");
  assert.ok(text.includes("arrayUnion"), "activity.js no longer appends with arrayUnion");
  assert.ok(!text.includes("v1Events"), "activity.js carries the rejected keyed-map writer");
  assert.ok(!text.includes("study-activity-evidence"), "activity.js has been wired to the evidence writer");
  assert.ok(!text.includes("evidence"), "activity.js mentions evidence");
});
check("the writer never writes an entries[] array, nor arrayUnion", () => {
  // `entries` is matched with a negative lookbehind for `Object.`: the first
  // version of this check flagged `Object.entries(UNIT_KEY_SHAPES)`, a plain
  // JavaScript builtin, and the module was correct all along. The hazard is
  // the FIRESTORE array of that name, so that is what is matched.
  for (const name of GUARDED) {
    const text = codeOf(name);
    for (const forbidden of ["arrayUnion", "logActivity"]) {
      assert.ok(!text.includes(forbidden), `${name} references ${forbidden}`);
    }
    const firestoreEntries = text.match(/(?<!Object\.)\bentries\b/g) ?? [];
    assert.deepEqual(firestoreEntries, [], `${name} touches the legacy entries[] array`);
  }
});
check("the writer only ever addresses the evidence SUBcollection", () => {
  const text = codeOf("study-activity-evidence-store.js");
  assert.ok(/\/evidence`/.test(text) || text.includes("/evidence"), "no evidence subcollection path found");
  // TENANT.ACTIVITY may appear only as the prefix of that subcollection path.
  for (const line of text.split("\n").filter((l) => l.includes("TENANT.ACTIVITY"))) {
    assert.ok(line.includes("/evidence"), `TENANT.ACTIVITY used at document level: ${line.trim()}`);
  }
});
check("bulkConfirmWeek() still reads only entries[], so it cannot see evidence", () => {
  const records = fs.readFileSync(path.join(appJs, "records.js"), "utf8");
  const fn = records.slice(records.indexOf("export async function bulkConfirmWeek"));
  const body = fn.slice(0, fn.indexOf("\n}\n") + 3);
  assert.ok(body.includes("activitySnap.data().entries"), "bulkConfirmWeek no longer reads entries[] -- re-check this guard");
  assert.ok(!body.includes("evidence"), "bulkConfirmWeek now reads evidence -- the Mastery coupling is live");
  assert.ok(!body.includes("collection("), "bulkConfirmWeek now runs a query -- it may be reaching the subcollection");
});

// --- 3. Activity is not Mastery -------------------------------------------
check("the writer has no dependency on Records or the Mastery workflow", () => {
  for (const name of GUARDED) {
    const text = codeOf(name);
    for (const forbidden of ["./records.js", "records", "claimStatus", "confirmEntry", "returnEntry",
                             "achieved", "mastered", "confirmState", "claimedStatus", "confirmedStatus"]) {
      assert.ok(!text.includes(forbidden), `${name} references ${forbidden}`);
    }
  }
});
check("the writer can only ever express a practised, no-mastery action", () => {
  const text = codeOf("study-activity-evidence-id.js");
  assert.ok(/action:\s*"practised"/.test(text), "action is not pinned to practised");
  assert.ok(/masteryEffect:\s*"none"/.test(text), "masteryEffect is not pinned to none");
  assert.ok(!/action:\s*"claimed"/.test(text), "the writer can express a claimed action");
});
check("status.claimed and status.confirmed are not in the event table", () => {
  const text = codeOf("study-activity-evidence-id.js");
  assert.ok(!text.includes("status.claimed"), "status.claimed is expressible");
  assert.ok(!text.includes("status.confirmed"), "status.confirmed is expressible");
});

// --- 4. the accepted Approach mapping is bound to its source of truth ------
check("every Approach the writer can credit still IS that Approach", () => {
  // A hardcoded id silently comes to mean a different Approach after a
  // catalogue renumber, and nothing on any screen would show it.
  //
  // This check was ASYNC in its first version, and check() is synchronous --
  // so the assertion threw inside an uncaught promise, the case was counted as
  // a pass, and a deliberate renumber of approach_07 sailed straight through
  // it. A passing check carrying precisely the blind spot it was written to
  // close. APPROACH_TEMPLATES is imported statically now and the body is
  // synchronous, so there is no promise for a failure to hide in.
  const expected = {
    approach_01: "Reading (with Tajweed)", approach_03: "Reading (with Meaning)",
    approach_04: "Reading — Word-by-Word Meaning", approach_07: "Listening Attentively (Arabic only)",
    approach_08: "Listening Attentively (Arabic with meaning)", approach_10: "Journaling",
  };
  const byId = new Map(APPROACH_TEMPLATES.map((t) => [t.id, t]));
  const text = codeOf("study-activity-evidence-id.js");
  const referenced = [...new Set([...text.matchAll(/approach_\d\d/g)].map((m) => m[0]))].sort();
  assert.deepEqual(referenced, Object.keys(expected).sort(), "the writer references an unexpected Approach set");
  for (const [id, name] of Object.entries(expected)) {
    assert.ok(byId.has(id), `${id} is not in APPROACH_TEMPLATES`);
    assert.equal(byId.get(id).name.en, name, `${id} has been renumbered or renamed`);
  }
  assert.equal(APPROACH_TEMPLATES.length, 30);
});

// --- 5. no Rules, index or migration material -----------------------------
check("production firestore.rules carries no evidence material", () => {
  const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
  assert.ok(!rules.includes("/evidence/"), "firestore.rules has been amended for the evidence subcollection");
  assert.ok(!rules.includes("study-approach-contract"), "firestore.rules references the v1 contract");
  assert.ok(!fs.existsSync(path.join(root, "firestore.indexes.json")), "a tracked index file appeared");
});
check("the gated keyed-Activity material is still absent", () => {
  for (const rel of ["app/js/study-activity-week.js", "tests/firestore/activity-v1.proposed.rules"]) {
    assert.ok(!fs.existsSync(path.join(root, rel)), `${rel} leaked in`);
  }
});
check("the candidate Rules are a candidate, not the deployed file", () => {
  const candidate = path.join(root, "docs/governance/phase4-activity-evidence-rules-candidate-2026-09-14.rules");
  assert.ok(fs.existsSync(candidate), "the candidate Rules are missing");
  const text = fs.readFileSync(candidate, "utf8");
  assert.ok(text.includes("NOT DEPLOYED"), "the candidate does not declare itself undeployed");
  const blocks = [...new Set([...text.matchAll(/match \/(\w+)\//g)].map((m) => m[1]))].filter((n) => n !== "databases");
  assert.deepEqual(blocks, ["activity"], `the candidate must govern one collection, saw: ${blocks}`);
});

console.log(`\n==== Study Activity evidence boundary: ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
