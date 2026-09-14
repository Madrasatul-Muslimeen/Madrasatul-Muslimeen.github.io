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

// --- 1. the writer has exactly ONE entry point ----------------------------
//
// UPDATED at P4-D1, with the reason, rather than deleted. Through P4-C these
// two checks asserted that NOTHING imported the writer, because the tranche's
// whole safety case was that it was uninvoked. P4-D wires Study surfaces to it
// on purpose, so "uninvoked" is no longer the invariant -- but "reachable from
// exactly one audited place" is, and it is the stronger of the two. A second
// module quietly learning to write evidence is precisely what these now catch.
const WIRING = "study-event-wiring.js";

check("only the approved wiring module imports the evidence writer", () => {
  const importers = [];
  for (const { file, text } of appSources()) {
    if (GUARDED.includes(path.basename(file))) continue;
    for (const guarded of GUARDED) {
      const base = guarded.replace(/\.js$/, "");
      if (new RegExp(`["'\`][./]*(?:js/)?${base}\\.js["'\`]`).test(text)) importers.push(`${file} -> ${guarded}`);
    }
  }
  const unexpected = importers.filter((entry) => !entry.startsWith(`app/js/${WIRING} ->`));
  assert.deepEqual(unexpected, [], `only ${WIRING} may import the writer, saw: ${unexpected.join(", ")}`);
});

check("the wiring module is the only thing that calls the writer", () => {
  const offenders = [];
  for (const { file, text } of appSources()) {
    if (GUARDED.includes(path.basename(file)) || path.basename(file) === WIRING) continue;
    if (/writeStudyActivityEvidence|studyEvidenceId|buildStudyEvidenceDocument/.test(text)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `these call the writer directly instead of going through ${WIRING}: ${offenders.join(", ")}`);
});

check("the wiring module cannot reach Mastery either", () => {
  const text = codeOf(WIRING);
  for (const forbidden of ["./records.js", "claimStatus", "confirmEntry", "returnEntry",
                           "achieved", "mastered", "confirmState", "claimedStatus", "confirmedStatus"]) {
    assert.ok(!text.includes(forbidden), `${WIRING} references ${forbidden}`);
  }
});

check("the wiring module never writes the legacy entries[] array", () => {
  const text = codeOf(WIRING);
  for (const forbidden of ["arrayUnion", "logActivity"]) {
    assert.ok(!text.includes(forbidden), `${WIRING} references ${forbidden}`);
  }
  const firestoreEntries = text.match(/(?<!Object\.)\bentries\b/g) ?? [];
  assert.deepEqual(firestoreEntries, [], `${WIRING} touches the legacy entries[] array`);
});

check("Listening settles on the REAL end-of-playback signals", () => {
  const page = fs.readFileSync(path.join(root, "app", "quranrevival.html"), "utf8");
  if (!page.includes("settleListeningSession")) return; // P4-D2 not on this branch
  // audio-player.js invokes onPlaybackState() with NO arguments. A first
  // version of the D2 wiring branched on `state === "ended"` inside
  // setPlaybackStateHandler, which would have been false for ever -- Listening
  // evidence would never have been recorded, and every pure-session test would
  // still have passed. This asserts the wiring uses the signals that exist.
  // Take the call's ACTUAL argument list by balancing parentheses. The first
  // version of this guard sliced to the next `");"` -- which in JavaScript is
  // the two characters `)` and `;`, so it stopped at `renderReadTransport();`
  // and never saw the rest of the handler. It passed against the very defect it
  // was written to catch, until a mutation run proved otherwise.
  const callAt = page.indexOf("setPlaybackStateHandler(");
  assert.ok(callAt >= 0, "setPlaybackStateHandler is not called at all");
  let depth = 0, end = callAt;
  for (let i = page.indexOf("(", callAt); i < page.length; i++) {
    if (page[i] === "(") depth++;
    else if (page[i] === ")") { depth--; if (depth === 0) { end = i; break; } }
  }
  const handlerBody = page.slice(callAt, end + 1);
  assert.ok(!/settleListeningSession/.test(handlerBody),
    "Listening is settled from setPlaybackStateHandler, which is called with no arguments");
  assert.ok(/await settleListeningSession\("ended"\)/.test(page),
    "nothing settles the listen when playback finishes naturally");
  assert.ok(/settleListeningSession\("failed"\)/.test(page),
    "nothing fails the listen when playback fails");
  assert.ok(/settleListeningSession\("stopped"\)/.test(page),
    "nothing settles the listen when the reader presses Stop");
});

check("only a real Play press can start a listening session", () => {
  const page = fs.readFileSync(path.join(root, "app", "quranrevival.html"), "utf8");
  if (!page.includes("beginListeningSession")) return;
  const starts = [...page.matchAll(/beginListeningSession\(\)/g)].length;
  assert.equal(starts, 2, `beginListeningSession must be defined once and called once, saw ${starts} occurrences`);
  // It must not be reachable from a preload or warm path.
  assert.ok(!/warmSegmentedTimestamps\(\);\s*beginListeningSession/.test(page),
    "a preload path starts a listening session");
});

check("a Study surface reaches evidence only through the wiring module", () => {
  const page = fs.readFileSync(path.join(root, "app", "quranrevival.html"), "utf8");
  if (!page.includes("study-event-wiring.js")) return; // not yet wired on this branch
  assert.ok(!/study-activity-evidence-store\.js/.test(page),
    "the page imports the writer directly instead of the wiring module");
  assert.ok(!/logActivity\([^)]*reading\.completed/.test(page),
    "a Study event is being written into the legacy activity log");
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
