// PROVE EACH LEDGER GUARD CAN ACTUALLY FAIL.
//
// This project's own standing lesson: "a guard that cannot fail is worse than
// no guard, because it is believed" -- and it has been earned more than once
// here, most recently by a check whose async body made every assertion inside
// it invisible. `programme-ledger.mjs` is a search for things that are wrong;
// on a healthy repository it prints nothing but PASS, which is exactly what a
// completely broken reader would also print.
//
// So each guard is fed a deliberately corrupted ledger, or a stubbed
// repository, and must name the fault. A mutation that does NOT produce the
// expected failure is reported as UNPROVEN -- the guard is not trusted until
// it has refused something.
//
// Run from the REPOSITORY ROOT:
//   node tools/i18n-verify/programme-ledger-mutations.mjs
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { measure, runGuards } from "./programme-ledger.mjs";

const root = path.resolve(process.argv[2] || process.cwd());
const { ledger: realLedger, facts: realFacts } = measure(root);

const clone = (o) => JSON.parse(JSON.stringify(o));
/** facts carry a function, so structuredClone/JSON alone will not do. */
const cloneFacts = (f) => ({ ...f, branches: clone(f.branches), ancestorOfMain: { ...f.ancestorOfMain } });

let passed = 0, failed = 0;

function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

/**
 * Apply a mutation, run the guards, and assert the named guard failed with a
 * message that really describes the fault. Matching on the guard letter alone
 * would let an unrelated failure stand in for the one being proven.
 */
function mutation(name, guard, mutate, expect) {
  check(`MUTATION [${guard}] ${name}`, () => {
    const l = clone(realLedger);
    const f = cloneFacts(realFacts);
    mutate(l, f);
    const found = runGuards(l, f).filter((x) => x.level === "FAIL" && x.guard === guard);
    assert.ok(found.length > 0,
      `guard ${guard} did NOT fail on "${name}" -- it is UNPROVEN and must not be trusted`);
    assert.ok(found.some((x) => expect.test(x.message)),
      `guard ${guard} failed, but on something else. Expected /${expect.source}/, got:\n        - ` +
      found.map((x) => x.message).join("\n        - "));
  });
}

// ---- THE BASELINE THE MUTATIONS ARE MEASURED AGAINST ----------------------
// Without this, a guard that fails on EVERYTHING would pass every mutation
// below and prove nothing at all.
check("POSITIVE CONTROL: the real ledger against the real repository has zero failures", () => {
  const f = runGuards(realLedger, realFacts).filter((x) => x.level === "FAIL");
  assert.deepEqual(f.map((x) => `[${x.guard}] ${x.message}`), [],
    "the unmutated ledger already fails; the mutations below would prove nothing");
});

check("POSITIVE CONTROL: the guards really ran and really read the repository", () => {
  const all = runGuards(realLedger, realFacts);
  assert.ok(all.length >= 10, `only ${all.length} findings; the guard set has stopped running`);
  assert.ok(all.some((x) => x.guard === "CONTROL" && x.level === "PASS"), "the internal positive controls did not report");
  for (const g of ["A", "B", "C", "D", "E", "F"]) {
    assert.ok(all.some((x) => x.guard === g), `guard ${g} produced no finding of any kind`);
  }
  assert.ok(realFacts.mainSha && realFacts.mainVersion, "the repository was not measured");
});

// ---- A: two streams claiming the same global version ----------------------
mutation("a second stream claims the LIVE version", "A", (l) => {
  l.versionAllocations.push({ version: l.main.version, owner: "hadith", status: "RESERVED" });
}, /claimed by 2 streams at once/);

mutation("the ledger and the branch disagree about what the branch is stamped", "A", (l) => {
  const s = l.streams.find((x) => x.id === "hadith");
  s.declaredVersion = "08.28";
}, /declares 08\.28 but .* is stamped/);

// ---- B: a branch inventing an unreserved version --------------------------
mutation("a branch is stamped a version reserved for nobody", "B", (l, f) => {
  const s = l.streams.find((x) => x.activeBranch && f.branches[x.activeBranch]);
  f.branches[s.activeBranch].version = "08.31";
  s.declaredVersion = "08.31";                       // keep guard A quiet; isolate B
  l.versionAllocations.push({ version: "08.31", owner: "someone-else", status: "RESERVED" });
}, /reserves for nobody under stream|an invented version/);

mutation("a branch stamps at or beyond the unallocated boundary", "B", (l, f) => {
  const s = l.streams.find((x) => x.activeBranch && f.branches[x.activeBranch]);
  f.branches[s.activeBranch].version = l.nextUnallocated;
  s.declaredVersion = l.nextUnallocated;
  l.versionAllocations.push({ version: l.nextUnallocated, owner: s.id, status: "RESERVED" });
}, /at or beyond the unallocated boundary/);

// ---- C: a held historical stamp read as a future allocation ---------------
mutation("the historical stamp stops declaring itself non-forward", "C", (l) => {
  l.versionAllocations.find((a) => a.historicalStamp).forwardAllocation = true;
}, /does not declare forwardAllocation:false/);

mutation("the historical stamp is given a claiming status", "C", (l) => {
  const a = l.versionAllocations.find((x) => x.historicalStamp);
  a.status = "RESERVED";
}, /historical stamp carrying claiming status RESERVED/);

mutation("the recorded historical stamp is not what the held branch carries", "C", (l) => {
  l.versionAllocations.find((a) => a.historicalStamp).version = "08.20";
}, /actually carries/);

// THE ONE THAT REALLY HAPPENED, reproduced exactly: the brief predicts a merge
// number for a held branch, bare, and another stream has taken it.
mutation("the brief predicts a merge number for the held branch", "C", (l, f) => {
  const s = l.streams.find((x) => x.integrationState === "HELD");
  f.briefText += `\n\nThe wiring at \`${s.branchTip.slice(0, 7)}\` conflicts at merge and resolves to the next free number -- 08.28 as of this line.\n`;
}, /names 08\.28, which is ahead of main .* claimed by stream "hadith"/);

mutation("...and it is caught even when the number belongs to nobody yet", "C", (l, f) => {
  const s = l.streams.find((x) => x.integrationState === "HELD");
  f.briefText += `\n\nAt merge \`${s.branchTip.slice(0, 7)}\` will take v08.44.\n`;
}, /08\.44, ahead of main .* that is a forward allocation/);

// ---- D: malformed / non-canonical version references ----------------------
mutation("a ledger version is written in prose form", "D", (l) => {
  l.main.version = `v${l.main.version}`;
}, /is not the canonical machine form NN\.NN/);

mutation("a ledger version is malformed", "D", (l) => {
  l.versionAllocations[0].version = "8.2";
}, /is not the canonical machine form NN\.NN/);

// THE DISCOVERED 08.28-versus-v08.28 PROBLEM, reproduced.
mutation("a version appears in the brief ONLY in bare form", "D", (l, f) => {
  const v = "08.29";
  assert.ok(l.versionAllocations.some((a) => a.version === v), "fixture drift: 08.29 is no longer allocated");
  f.briefText = f.briefText.replace(new RegExp(`\\bv${v.replace(".", "\\.")}\\b`, "g"), v);
  assert.ok(new RegExp(`(?<![v\\d.])${v.replace(".", "\\.")}(?![\\d.])`).test(f.briefText),
    "fixture drift: the brief does not mention 08.29 at all, so this mutation proves nothing");
}, /only in BARE form; every v-prefixed scanner/);

// THE TRAILING-FULL-STOP TRAP, pinned. The first version of these guards used
// `(?![\d.])`, which silently refuses a version that ends a sentence -- so a
// bare reference at a full stop was invisible to the guard written to find
// invisible references. This mutation is the one that caught it.
mutation("a bare version at the END OF A SENTENCE is still seen", "D", (l, f) => {
  const v = "08.29";
  f.briefText = f.briefText.replace(new RegExp(`\\bv${v.replace(".", "\\.")}\\b`, "g"), v);
  f.briefText += `\n\nThe Hadith Stage B branch is stamped ${v}.\n`;
}, /only in BARE form; every v-prefixed scanner/);

// ---- E: undeclared modification of a shared/platform file -----------------
mutation("a stream's shared-file touch loses its declaration", "E", (l) => {
  const s = l.streams.find((x) => (x.declaredSharedTouches || []).length);
  s.declaredSharedTouches = s.declaredSharedTouches.filter((t) => t.path !== "app/js/version.js");
}, /modifies shared\/platform file app\/js\/version\.js .* with no declaration/);

mutation("a stream newly touches a shared file nobody declared", "E", (l, f) => {
  const s = l.streams.find((x) => x.activeBranch && f.branches[x.activeBranch]);
  f.branches[s.activeBranch].changedPaths.push("app/js/unit-keys.js");
}, /modifies shared\/platform file app\/js\/unit-keys\.js/);

mutation("a stream touches the deployed Rules", "E", (l, f) => {
  const s = l.streams.find((x) => x.activeBranch && f.branches[x.activeBranch]);
  f.branches[s.activeBranch].changedPaths.push("firestore.rules");
}, /modifies shared\/platform file firestore\.rules/);

// ---- F: a stale integration baseline --------------------------------------
mutation("a moved baseline stops being acknowledged", "F", (l) => {
  l.streams.find((x) => x.id === "hadith").baselineStatus = "CURRENT";
}, /STALE BASELINE/);

mutation("a stream's baseline is not on main at all", "F", (l, f) => {
  const s = l.streams.find((x) => x.id === "hadith");
  s.baselineSha = "0".repeat(40);
  f.ancestorOfMain[s.baselineSha] = false;
}, /not an ancestor of origin\/main/);

mutation("main's own recorded baseline was rewritten out from under the ledger", "F", (l, f) => {
  f.ancestorOfMain[l.main.baselineSha] = false;
}, /NOT an ancestor of origin\/main/);

mutation("the ledger's record of main's version drifts from version.js", "F", (l) => {
  l.main.version = "08.11";
}, /the ledger records main at 08\.11/);

mutation("the acknowledgement points at a file that does not exist", "F", (l) => {
  l.streams.find((x) => x.id === "hadith").baselineAcknowledgement = "docs/reports/not-a-real-file.md";
}, /which does not exist/);

// ---- the internal positive controls must themselves be able to fail -------
mutation("the ledger reader returns nothing", "CONTROL", (l) => {
  l.versionAllocations = [];
}, /the reader has stopped working/);

mutation("the brief is not read", "CONTROL", (l, f) => {
  f.briefText = "";
}, /guards C and D would pass vacuously/);

console.log(`\n==== Programme ledger guard mutations: ${passed} passed, ${failed} failed ====`);
process.exit(failed === 0 ? 0 : 1);
