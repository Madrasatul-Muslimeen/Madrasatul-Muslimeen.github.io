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
import { measure, runGuards, TOUCH_DECLARED, TOUCH_AUTHORIZED } from "./programme-ledger.mjs";

/** Mirrors the guard's own claiming set; the mutations derive targets from it. */
const CLAIMING_STATUSES = new Set(["LIVE", "RESERVED", "RELEASED"]);

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
// The second claimant has to be a stream that does NOT already own main's
// version, or there is no collision to find. Hard-coding "hadith" was correct
// while main belonged to Quran and became a no-op the moment Hadith's 08.29
// landed: the mutation pushed a second hadith-owned claim onto a hadith-owned
// version, one owner, no collision, UNPROVEN. Derive the rival from the ledger.
const rivalOf = (l, version) => {
  const holder = l.versionAllocations.find((a) => a.version === version && CLAIMING_STATUSES.has(a.status));
  const other = l.streams.map((s) => s.id).find((id) => id !== holder?.owner);
  assert.ok(other, "fixture drift: the ledger declares no second stream to collide with");
  return other;
};

mutation("a second stream claims the LIVE version", "A", (l) => {
  l.versionAllocations.push({ version: l.main.version, owner: rivalOf(l, l.main.version), status: "RESERVED" });
}, /claimed by 2 streams at once/);

mutation("a superseded milestone is left marked LIVE", "A", (l) => {
  const live = l.versionAllocations.find((a) => a.status === "LIVE");
  live.status = "RELEASED";
  const prior = l.versionAllocations.find((a) => a.status === "RELEASED" && a !== live);
  prior.status = "LIVE";                                  // the real 08.27 defect
}, /is marked LIVE, but main carries/);

mutation("two allocations are LIVE at once", "A", (l) => {
  const live = l.versionAllocations.find((a) => a.status === "LIVE");
  l.versionAllocations.find((a) => a.status === "RELEASED" && a !== live).status = "LIVE";
}, /allocations are LIVE; exactly one may be/);

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

// Guard C only looks at HELD streams, and v08.30 left none: the Phase 4 wiring
// moved to SUPERSEDED once its capability was re-derived on main. Both C
// mutations then crashed on `undefined` instead of proving anything -- the same
// fixture drift as the stale-baseline pair, one tranche later. A mutation
// BUILDS the state its guard is for rather than hoping a stream is in it, and
// this also keeps guard C exercised on a repository that currently holds
// nothing HELD.
const heldStream = (l) => {
  const existing = l.streams.find((x) => x.integrationState === "HELD" && x.branchTip);
  if (existing) return existing;
  const s = l.streams.find((x) => x.branchTip) || l.streams[0];
  assert.ok(s, "fixture drift: the ledger declares no stream at all");
  s.integrationState = "HELD";
  s.branchTip = s.branchTip || "7e2931f795af1cd97efc1167660cea93aa22b9ab";
  return s;
};

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
// The predicted number must genuinely be AHEAD of main AND owned by someone
// else, or guard C correctly reads it as history rather than a prediction.
// Hard-coding 08.28 was right when main was 08.27 and stopped being a
// prediction at all once main reached 08.29. Derive it: take a version another
// stream claims, and move main's recorded version BELOW it so the ledger models
// the situation the guard is for -- a held branch naming a number still ahead.
mutation("the brief predicts a merge number for the held branch", "C", (l, f) => {
  const held = heldStream(l);
  const rival = l.versionAllocations.find((a) => CLAIMING_STATUSES.has(a.status) && a.owner !== held.id);
  assert.ok(rival, "fixture drift: no other stream holds a claiming allocation");
  const [maj, min] = rival.version.split(".").map(Number);
  l.main.version = `${String(maj).padStart(2, "0")}.${String(min - 1).padStart(2, "0")}`;
  f.briefText += `\n\nThe wiring at \`${held.branchTip.slice(0, 7)}\` conflicts at merge and resolves to the next free number -- ${rival.version} as of this line.\n`;
}, /is ahead of main .* claimed by stream/);

mutation("...and it is caught even when the number belongs to nobody yet", "C", (l, f) => {
  const s = heldStream(l);
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
// The stream must have BOTH a declared touch AND a branch whose diff still
// shows that file being modified -- guard E's undeclared-touch arm reads the
// branch diff. Picking the first stream with touches silently stopped working
// when v08.30 gave the merged `quran` stream its own (branchless) touches.
mutation("a stream's shared-file touch loses its declaration", "E", (l, f) => {
  const s = l.streams.find((x) =>
    (x.declaredSharedTouches || []).some((t) => t.path === "app/js/version.js") &&
    x.activeBranch && (f.branches?.[x.activeBranch]?.changedPaths || []).includes("app/js/version.js"));
  assert.ok(s, "fixture drift: no stream both declares app/js/version.js and still shows it changed on a branch");
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

// ---- E: the AUTHORIZED vocabulary -----------------------------------------
// DECLARED and AUTHORIZED must be semantically distinct, and AUTHORIZED must be
// a checkable claim rather than a word that turns the guard off.

const anyAuthorized = (l) => {
  for (const s of l.streams) for (const t of s.declaredSharedTouches || []) {
    if (t.status === TOUCH_AUTHORIZED) return t;
  }
  return null;
};

check("POSITIVE CONTROL: the ledger really carries AUTHORIZED touches, and the guard reports them as such", () => {
  const t = anyAuthorized(realLedger);
  assert.ok(t, "no AUTHORIZED touch in the ledger; every negative case below would prove nothing");
  const notes = runGuards(realLedger, realFacts).filter((f) => f.guard === "E" && f.level === "NOTE");
  assert.ok(notes.some((n) => n.message.includes(TOUCH_AUTHORIZED) && n.message.includes("by master-architect")),
    `no AUTHORIZED touch was reported as authorized. Guard E reported:\n        - ` + notes.map((n) => n.message).join("\n        - "));
});

check("A DECLARED touch is never presented as authorized", () => {
  // The distinction is the whole point: a touch still awaiting a decision must
  // not read as one that has had it.
  const notes = runGuards(realLedger, realFacts).filter((f) => f.guard === "E" && f.level === "NOTE");
  const declaredNotes = notes.filter((n) => n.message.includes(TOUCH_DECLARED));
  assert.ok(declaredNotes.length, "no DECLARED touch reported; this assertion would be vacuous");
  for (const n of declaredNotes) {
    assert.ok(!n.message.includes(TOUCH_AUTHORIZED), `a DECLARED touch is described as authorized: ${n.message}`);
    assert.ok(/awaiting Master Architect decision/.test(n.message), `a DECLARED touch does not say it is awaiting a decision: ${n.message}`);
  }
});

// THE DEFECT THIS VOCABULARY EXISTS FOR: one letter, silently downgrading five
// real authorisations to "awaiting decision".
mutation("a touch is spelled AUTHORISED instead of AUTHORIZED", "E", (l) => {
  anyAuthorized(l).status = "AUTHORISED";
}, /carries status "AUTHORISED" -- not one of/);

mutation("a touch carries a status nobody defined", "E", (l) => {
  anyAuthorized(l).status = "APPROVED_PROBABLY";
}, /carries status "APPROVED_PROBABLY" -- not one of/);

mutation("a DECLARED touch is promoted to AUTHORIZED with no metadata", "E", (l) => {
  const t = l.streams.flatMap((x) => x.declaredSharedTouches || []).find((x) => x.status === TOUCH_DECLARED);
  assert.ok(t, "fixture drift: no DECLARED touch to promote");
  t.status = TOUCH_AUTHORIZED;
}, /claims AUTHORIZED with no authorization metadata/);

mutation("an AUTHORIZED touch loses its reference", "E", (l) => {
  delete anyAuthorized(l).authorization.reference;
}, /missing authorization reference/);

mutation("a module authorises itself", "E", (l) => {
  anyAuthorized(l).authorization.by = "hadith";
}, /not a recognised authority .* a module cannot authorise itself/);

mutation("an authorization date is not a date", "E", (l) => {
  anyAuthorized(l).authorization.on = "last Tuesday";
}, /is not YYYY-MM-DD/);

mutation("an authorization cites a record that does not exist", "E", (l) => {
  anyAuthorized(l).authorization.reference = "docs/reports/no-such-authorization.md";
}, /which does not exist -- an authorization must be traceable/);

mutation("every touch record disappears", "CONTROL", (l) => {
  for (const s of l.streams) delete s.declaredSharedTouches;
}, /no shared-file touch records were read/);

// ---- F: a stale integration baseline --------------------------------------
// These two need a stream whose baseline has ACTUALLY moved, and they must not
// depend on one happening to be in that state: guard F short-circuits on
// `baselineSha === mainSha`, so when the Hadith candidate merged main into
// itself both mutations silently stopped reaching the code they target and went
// UNPROVEN. A mutation builds its own precondition -- here, a main that has
// moved on past a baseline that is still a legitimate ancestor.
const moveMainPast = (l, f, streamId) => {
  const s = l.streams.find((x) => x.id === streamId);
  f.mainSha = "f".repeat(40);
  f.ancestorOfMain[s.baselineSha] = true;
  f.ancestorOfMain[l.main.baselineSha] = true;
  return s;
};

mutation("a moved baseline stops being acknowledged", "F", (l, f) => {
  moveMainPast(l, f, "hadith").baselineStatus = "CURRENT";
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

mutation("the acknowledgement points at a file that does not exist", "F", (l, f) => {
  moveMainPast(l, f, "hadith").baselineAcknowledgement = "docs/reports/not-a-real-file.md";
}, /which does not exist/);

// ---------------------------------------------------------------------------
// G  the four deployment states, and the v08.31 readiness declaration.
//
// The point of these eleven is that the readiness gate is a LITERAL in a source
// file, and a literal is one keystroke from being flipped. Guard G is what
// makes that keystroke insufficient -- so each way of making it sufficient is
// tried here and must be refused.
// ---------------------------------------------------------------------------

/** Rewrites the readiness source as guard G will read it. `ready` is the only thing that matters to the regex. */
const readinessSrc = (ready) =>
  `export const EVIDENCE_PERSISTENCE_DECLARATION = Object.freeze({\n  ready: ${ready},\n  decision: null,\n});\n`;

mutation("the four deployment states collapse back into one", "G", (l) => {
  delete l.deployment.githubPagesServing;
}, /deployment\.githubPagesServing is not recorded/);

mutation("a deployment state takes a word from outside its own vocabulary", "G", (l) => {
  l.deployment.firebaseRulesDeployed.state = "PRESUMED_FROM_MAIN";
}, /firebaseRulesDeployed\.state is "PRESUMED_FROM_MAIN"/);

mutation("a presumption is recorded without saying it is one", "G", (l) => {
  l.deployment.githubPagesServing.verified = true;
}, /must say it is one/);

mutation("serving is claimed as verified with nothing verified", "G", (l) => {
  l.deployment.githubPagesServing.state = "SERVING_VERIFIED";
  l.deployment.githubPagesServing.verified = false;
}, /claims SERVING_VERIFIED without verified:true/);

mutation("the feature is recorded operational while its Rules are not deployed", "G", (l) => {
  l.deployment.evidenceRecordingOperational.state = "YES";
}, /the evidence subcollection has no rule/);

mutation("the readiness gate is flipped in code and nowhere else", "G", (l, f) => {
  f.readinessSource = readinessSrc(true);
}, /the code and the governance record disagree/);

mutation("the gate is flipped in code AND in the ledger, but the Rules are still not deployed", "G", (l, f) => {
  f.readinessSource = readinessSrc(true);
  l.evidencePersistenceReadiness.ready = true;
}, /readiness may not run ahead of the deployment it depends on/);

mutation("everything is flipped, with no governed decision recorded", "G", (l, f) => {
  f.readinessSource = readinessSrc(true);
  l.evidencePersistenceReadiness.ready = true;
  l.deployment.firebaseRulesDeployed.state = "YES";
}, /enablement is a decision, not an edit/);

mutation("a module authorises its own enablement", "G", (l, f) => {
  f.readinessSource = readinessSrc(true);
  l.evidencePersistenceReadiness.ready = true;
  l.evidencePersistenceReadiness.decision = { by: "quran", on: "2026-09-19", reference: "CLAUDE.md" };
  l.deployment.firebaseRulesDeployed.state = "YES";
}, /not in the closed set/);

mutation("the enabling decision points at a record that does not exist", "G", (l, f) => {
  f.readinessSource = readinessSrc(true);
  l.evidencePersistenceReadiness.ready = true;
  l.evidencePersistenceReadiness.decision = { by: "master-architect", on: "2026-09-19", reference: "docs/reports/not-a-real-file.md" };
  l.deployment.firebaseRulesDeployed.state = "YES";
}, /which does not exist/);

mutation("the declaration stops being a literal guard G can read", "G", (l, f) => {
  f.readinessSource = "export const EVIDENCE_PERSISTENCE_DECLARATION = Object.freeze({ ready: computeReady() });";
}, /guard G cannot read it, so it cannot vouch for it/);

// POSITIVE CONTROL for the family above: with the Rules genuinely deployed and
// a well-formed decision naming a record that exists, guard G must ALLOW it.
// Without this, a guard G that simply failed on every enablement would pass
// all eleven mutations above and prove nothing about the case that matters.
check("POSITIVE CONTROL [G]: a fully governed enablement is ALLOWED", () => {
  const l = clone(realLedger);
  const f = cloneFacts(realFacts);
  f.readinessSource = readinessSrc(true);
  l.evidencePersistenceReadiness.ready = true;
  l.evidencePersistenceReadiness.decision = {
    by: "master-architect", on: "2026-09-19",
    reference: "docs/governance/programme-integration-ledger.json",
  };
  l.deployment.firebaseRulesDeployed.state = "YES";
  l.deployment.evidenceRecordingOperational.state = "YES";
  const found = runGuards(l, f).filter((x) => x.level === "FAIL" && x.guard === "G");
  assert.deepEqual(found.map((x) => x.message), [],
    "guard G refuses a properly governed enablement -- it is a blanket refusal, not a check");
});

// ---- the internal positive controls must themselves be able to fail -------
mutation("the ledger reader returns nothing", "CONTROL", (l) => {
  l.versionAllocations = [];
}, /the reader has stopped working/);

mutation("the brief is not read", "CONTROL", (l, f) => {
  f.briefText = "";
}, /guards C and D would pass vacuously/);

console.log(`\n==== Programme ledger guard mutations: ${passed} passed, ${failed} failed ====`);
process.exit(failed === 0 ? 0 : 1);
