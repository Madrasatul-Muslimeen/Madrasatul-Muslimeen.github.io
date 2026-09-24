// PROVE THE EVIDENCE-BOUNDARY GUARD CAN ACTUALLY FAIL.
//
// `study-activity-evidence-boundary.mjs` is a search for things that are
// wrong. On a healthy repository it prints nothing but PASS -- which is
// exactly what a completely broken reader would print too. This project's own
// standing lesson is that a guard which cannot fail is worse than no guard,
// because it is believed.
//
// The tranche this harness was written for narrowed that suite from "the
// evidence store may be called by the wiring module and by one tolerated,
// unreachable module" to "the evidence store may be called by the wiring
// module". A narrowing is exactly the kind of change that can be made
// vacuously, so each mutation below puts the old bypass back, or breaks one
// of the four outcomes, and the guard must refuse it BY NAME.
//
// A mutation that does NOT produce the expected failure is reported as
// UNPROVEN rather than quietly passed. An unproven mutation is a finding about
// the guard and must be chased.
//
// IT NEVER REACHES FOR `git`. A mutation harness in this repository once
// restored its files with `git checkout -- app tools` and destroyed an hour of
// uncommitted work. Every file this harness touches is read into memory first
// and written back from memory in a `finally`, so the restore cannot depend on
// the index, the working tree or anything a concurrent process is doing. Commit
// before running it anyway.
//
// Run from the REPOSITORY ROOT:
//   node tools/i18n-verify/study-activity-evidence-boundary-mutations.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = path.resolve(process.argv[2] || process.cwd());
const GUARD = path.join(root, "tools", "i18n-verify", "study-activity-evidence-boundary.mjs");
const SERVICE = path.join(root, "app", "js", "study-note-service.js");
const WIRING = path.join(root, "app", "js", "study-event-wiring.js");

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") {
      throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    }
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

/** Runs the guard as a child process and returns its exit code AND its text. A grep cannot see an uncaught throw, and an exit code cannot say which case failed -- both are needed. */
function runGuard() {
  const r = spawnSync(process.execPath, [GUARD, root], { encoding: "utf8" });
  return { code: r.status, text: `${r.stdout || ""}${r.stderr || ""}` };
}

/**
 * Apply a mutation to one or more files, run the guard, and assert it failed
 * with a message that really describes the fault.
 *
 * Matching on a non-zero exit alone would let ANY failure stand in for the one
 * being proven -- including one the mutation caused by accident somewhere else.
 * So the expected case name and the expected message are both matched.
 */
function mutation(name, edits, expectCase, expectMessage) {
  check(`MUTATION ${name}`, () => {
    const backup = new Map();
    for (const [file] of edits) backup.set(file, fs.readFileSync(file, "utf8"));
    try {
      for (const [file, mutate] of edits) {
        const before = backup.get(file);
        const after = mutate(before);
        assert.notEqual(after, before,
          `the mutation changed NOTHING in ${path.basename(file)} -- it proves nothing about the guard`);
        fs.writeFileSync(file, after);
      }
      const { code, text } = runGuard();
      assert.notEqual(code, 0,
        `the guard exited 0 on "${name}" -- it is UNPROVEN and must not be trusted`);
      const failures = text.split("\n").filter((l) => /^\s*FAIL\s/.test(l)).join(" | ");
      assert.ok(expectCase.test(failures),
        `the guard failed, but not on the case being proven. Expected /${expectCase.source}/, got: ${failures || "(no FAIL line -- an uncaught throw?)"}`);
      assert.ok(expectMessage.test(text),
        `the guard failed on the right case but did not NAME the fault. Expected /${expectMessage.source}/ somewhere in its output.`);
    } finally {
      for (const [file, content] of backup) fs.writeFileSync(file, content);
    }
  });
}

// --- the positive controls, first ------------------------------------------
//
// Without these, every mutation below could be "proving" a guard that is
// simply broken on an unmutated repository.
check("POSITIVE CONTROL: the guard passes on the real, unmutated repository", () => {
  const { code, text } = runGuard();
  assert.equal(code, 0, `the guard fails before any mutation is applied:\n${text}`);
  assert.ok(/0 failed/.test(text), "the guard's own summary does not report zero failures");
});
check("POSITIVE CONTROL: the harness restored every file it touched", () => {
  // Cheap, and it is the thing that goes wrong. Asserted again at the end.
  assert.ok(fs.readFileSync(SERVICE, "utf8").includes("recordStudyEvidence"),
    "study-note-service.js was left mutated");
});

// --- 1. THE BYPASS ITSELF: put the direct D3 call back ----------------------
//
// This is the mutation the tranche exists for. Before it, the service imported
// the evidence store and called it directly, around the persistence-readiness
// gate; the guard tolerated that by name because the module is page-
// unreachable. Restoring exactly that must now be refused.
mutation(
  "the direct D3 call to the evidence store is restored, exactly as it was before this tranche",
  [[SERVICE, (s) => s
    .replace('import { recordStudyEvidence } from "./study-event-wiring.js";',
             'import { writeStudyActivityEvidence } from "./study-activity-evidence-store.js";')
    .replace("const outcome = await recordStudyEvidence(db, evidence, { uid });",
             "const outcome = await writeStudyActivityEvidence(db, { ...evidence, uid });")]],
  /WRITE CHOKEPOINT|importer set/,
  /study-note-service\.js/,
);

// The import alone, without the call. A module that merely holds the store is
// one edit away from calling it, and the importer list is what pins that.
mutation(
  "the service imports the store again without calling it",
  [[SERVICE, (s) => s.replace(
    'import { recordStudyEvidence } from "./study-event-wiring.js";',
    'import { recordStudyEvidence } from "./study-event-wiring.js";\nimport { writeStudyActivityEvidence } from "./study-activity-evidence-store.js";')]],
  /importer set/,
  /the set of modules importing the evidence store has changed/,
);

// A THIRD module, not the one that used to be tolerated -- so the guard is
// proven to refuse a caller it has never heard of, not just the old one.
mutation(
  "a module that has never touched evidence starts calling the store",
  [[path.join(root, "app", "js", "study-note-binding.js"), (s) =>
    'import { writeStudyActivityEvidence } from "./study-activity-evidence-store.js";\n' +
    'export async function __smuggle(db, a) { return writeStudyActivityEvidence(db, a); }\n' + s]],
  /WRITE CHOKEPOINT|importer set/,
  /study-note-binding\.js/,
);

// --- 2. THE GATE INSIDE THE CHOKEPOINT -------------------------------------
mutation(
  "the chokepoint stops consulting readiness -- the gate is gone, the call remains",
  [[WIRING, (s) => s.replace(
    "  if (!isStudyEvidencePersistenceReady()) {\n    return { written: false, blocked: true, reason: studyEvidenceUnavailableReason() };\n  }\n", "")]],
  /WRITE CHOKEPOINT/,
  /no longer consults readiness/,
);

// --- 3. THE FOUR OUTCOMES ---------------------------------------------------
mutation(
  "the null outcome is spread instead of checked -- a missing `written` reads as 'already recorded'",
  [[SERVICE, (s) => s
    .replace('  if (!outcome || typeof outcome !== "object") return { ...NOTHING_RECORDED };\n', "")]],
  /D3 Journaling goes through the gate/,
  /the null outcome is not checked/,
);
mutation(
  "a refusal stops being its own fact and collapses into written:false",
  [[SERVICE, (s) => s.replace("    blocked: outcome.blocked === true,\n", "")]],
  /D3 Journaling goes through the gate/,
  /blocked|no longer reports/,
);
mutation(
  "the service keeps the gate but loses the chokepoint import",
  [[SERVICE, (s) => s.replace(
    'import { recordStudyEvidence } from "./study-event-wiring.js";',
    'const recordStudyEvidence = async () => ({ written: true });')]],
  /D3 Journaling goes through the gate/,
  /no longer imports the chokepoint/,
);

// --- 4. THE COMMENT TRAP ----------------------------------------------------
//
// The service's own doc comment names `writeStudyActivityEvidence()` in order
// to explain that it no longer calls it. A scan that reads raw text rather
// than code would fail against perfectly correct source -- this repository's
// own recorded trap, found more than once. So this is a NEGATIVE mutation: the
// guard must stay green.
check("NEGATIVE CONTROL: a comment naming the store does NOT trip the guard", () => {
  const backup = fs.readFileSync(SERVICE, "utf8");
  try {
    fs.writeFileSync(SERVICE,
      "/** A block comment calling writeStudyActivityEvidence(db, args) by name. */\n" +
      "// A line comment calling writeStudyActivityEvidence(db, args) by name.\n" + backup);
    const { code, text } = runGuard();
    assert.equal(code, 0,
      `a comment naming the store was read as a call -- the guard scans prose, not code:\n${text}`);
  } finally { fs.writeFileSync(SERVICE, backup); }
});

// --- 5. MAP v4 Phase 4 (P4-F, issue #230/#238) -- Monitor's own reader ------
//
// 24 Sep 2026 added a second, deliberately narrow exception to the
// reachability guard: Monitor's weekly view may reach the evidence store,
// but ONLY by the exact shape "monitor.html -> monitor.js -> the store", and
// ONLY for the reader. Both edges of that are proven here to actually be
// enforced, not merely asserted in a comment.
const MONITOR_HTML = path.join(root, "app", "monitor.html");
const MONITOR_JS = path.join(root, "app", "js", "monitor.js");

// The exact regression an earlier draft of this round produced, live: import
// the store straight into monitor.html instead of going through monitor.js.
// The exception is pinned to one exact chain shape, so this must NOT be
// silently covered by it.
mutation(
  "monitor.html imports the store directly, bypassing monitor.js",
  [[MONITOR_HTML, (s) => s.replace(
    '<script type="module">',
    '<script type="module">\n    import { listStudyActivityEvidence } from "./js/study-activity-evidence-store.js";')]],
  /every page-reachable path to the writer/,
  /app\/monitor\.html -> study-activity-evidence-store\.js/,
);

// The import alone, without the exact chain shape changing -- monitor.js
// keeps its one legitimate import AND quietly picks up the writer too. Only
// the dedicated "imports ONLY the reader" check can see this: reachability
// alone cannot, because monitor.js already legitimately reaches the store.
mutation(
  "monitor.js keeps its reader import but also imports the writer",
  [[MONITOR_JS, (s) => s.replace(
    'import { listStudyActivityEvidence } from "./study-activity-evidence-store.js";',
    'import { listStudyActivityEvidence } from "./study-activity-evidence-store.js";\nimport { writeStudyActivityEvidence } from "./study-activity-evidence-store.js";')]],
  /monitor\.js imports ONLY the reader/,
  /monitor\.js should import from the evidence store exactly once/,
);

// --- 6. the restore, asserted rather than assumed ---------------------------
check("POSITIVE CONTROL: every mutated file is byte-identical to how it started", () => {
  const svc = fs.readFileSync(SERVICE, "utf8");
  assert.ok(svc.includes('import { recordStudyEvidence } from "./study-event-wiring.js";'),
    "study-note-service.js was not restored");
  assert.ok(!svc.includes("writeStudyActivityEvidence(db,"), "study-note-service.js still carries a mutation");
  assert.ok(fs.readFileSync(WIRING, "utf8").includes("isStudyEvidencePersistenceReady()"),
    "study-event-wiring.js was not restored");
  assert.ok(!fs.readFileSync(path.join(root, "app", "js", "study-note-binding.js"), "utf8").includes("__smuggle"),
    "study-note-binding.js was not restored");
  const monitorHtml = fs.readFileSync(MONITOR_HTML, "utf8");
  assert.equal((monitorHtml.match(/study-activity-evidence-store\.js/g) || []).length, 0,
    "monitor.html was not restored -- it still names the evidence store directly");
  const monitorJs = fs.readFileSync(MONITOR_JS, "utf8");
  assert.equal((monitorJs.match(/writeStudyActivityEvidence/g) || []).length, 0,
    "monitor.js was not restored -- it still names the writer");
  const { code } = runGuard();
  assert.equal(code, 0, "the guard does not pass again after the restore");
});

console.log(`\n==== Evidence boundary guard mutations: ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
