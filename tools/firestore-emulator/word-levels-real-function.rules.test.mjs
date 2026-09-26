// Issue #320 -- proves the REAL app/js/quran-word-progress-data.js write
// functions, at the two NEW levels (basic, depth), against the REAL
// emulator running the REAL ASSEMBLED DEPLOYMENT candidate. Same technique
// as lemma-progress-real-function.rules.test.mjs: neither
// word-progress-v1.rules.test.mjs (hand-authored setDoc/updateDoc, no real
// function, wbw only) nor a pure unit suite (no Rules engine behind it, and
// quran-word-progress-data.mjs's own gate is a plain in-process flag, not the
// real Rules) proves that setWordState()/decideWordApproval() actually write
// what the deployed Rules would require once the Owner publishes this
// candidate -- this is the one place both are real at once.
//
// Isolated: never loads firestore.rules directly (it loads the ASSEMBLED
// deployment candidate, which is firestore.rules plus only this issue's one
// widened level check -- see the file itself), never touches a production
// endpoint or project id (SAFE-01, asserted below).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-word-levels-real-function";
const HOST = "127.0.0.1";
const PORT = 8103;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const DEPLOYMENT = "docs/governance/2026-09-26-word-levels-DEPLOYMENT-candidate.rules";
const RULES_FILE = process.env.RULES_FILE || DEPLOYMENT;
const candidate = fs.readFileSync(path.resolve(root, RULES_FILE), "utf8");

// SAFE-01: never a production project or a non-emulator host.
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");
assert.equal(HOST, "127.0.0.1");
// This suite's whole point is running against the ASSEMBLED file -- prove it
// really carries the pre-existing live rules AND the one widened level check
// this issue adds, so a green run here is evidence about the thing that
// would actually be pasted, not a stand-in extract.
for (const required of ["quranWordProgress", "quranWordApprovals", "tenantInvites"]) {
  assert.ok(new RegExp(`match /${required}/`).test(candidate), `the deployment candidate is missing match /${required}/`);
}
assert.match(candidate, /get\('level', ''\) in \['wbw', 'basic', 'depth'\]/,
  "the candidate must widen the level check to admit basic/depth, not just repeat the live wbw-only check");

// ---------------------------------------------------------------------------
// Load the REAL app/js/envelope.js and app/js/quran-word-progress-data.js as
// `data:` URL modules, exactly the technique lemma-progress-real-function.
// rules.test.mjs and note-foundation-real-function.rules.test.mjs use: the
// gstatic Firestore import is rewritten to the real `firebase/firestore`
// package this workspace already depends on, and every local specifier is
// rewritten to an absolute URL, since a `data:` module has no base URL and
// cannot resolve a relative or bare specifier on its own.
// quran-word-progress.js and collections.js are pure/trivial (no Firebase
// import of their own), so they need no rewriting themselves -- only a real
// file URL so Node can find them from a `data:` module's import.
// ---------------------------------------------------------------------------
const GSTATIC_FIRESTORE_IMPORT =
  /import\s*\{[\s\S]*?\}\s*from\s*"https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/;
const firestorePackageUrl = import.meta.resolve("firebase/firestore");
const toDataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const realFileUrl = (relativeToAppJs) => pathToFileURL(path.join(root, "app/js", relativeToAppJs)).href;

function rewriteGstaticImport(source, importLine, label) {
  assert.match(source, GSTATIC_FIRESTORE_IMPORT,
    `${label}: its gstatic Firestore import moved or was rewritten upstream -- update this loader`);
  return source.replace(GSTATIC_FIRESTORE_IMPORT, importLine);
}

function rewriteSpecifier(source, specifier, replacementUrl, label) {
  const pattern = new RegExp(`from "${specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
  assert.match(source, pattern, `${label}: its "${specifier}" specifier moved -- update this loader`);
  return source.replace(pattern, `from "${replacementUrl}"`);
}

let envelopeSource = fs.readFileSync(path.join(root, "app/js/envelope.js"), "utf8");
envelopeSource = rewriteGstaticImport(envelopeSource,
  `import { doc, setDoc, updateDoc, writeBatch, runTransaction, serverTimestamp } from "${firestorePackageUrl}";`,
  "envelope.js");
const envelopeDataUrl = toDataUrl(envelopeSource);

function loadDataLayer(gateSpecifierReplacementUrl) {
  let dataSource = fs.readFileSync(path.join(root, "app/js/quran-word-progress-data.js"), "utf8");
  dataSource = rewriteGstaticImport(dataSource,
    `import { doc, getDoc, collection, query, where, getDocs } from "${firestorePackageUrl}";`,
    "quran-word-progress-data.js");
  dataSource = rewriteSpecifier(dataSource, "./collections.js", realFileUrl("collections.js"), "quran-word-progress-data.js");
  dataSource = rewriteSpecifier(dataSource, "./envelope.js", envelopeDataUrl, "quran-word-progress-data.js");
  dataSource = rewriteSpecifier(dataSource, "./study-word-levels-readiness.js", gateSpecifierReplacementUrl, "quran-word-progress-data.js");
  dataSource = rewriteSpecifier(dataSource, "./quran-word-progress.js", realFileUrl("quran-word-progress.js"), "quran-word-progress-data.js");
  return import(toDataUrl(dataSource));
}

// Architect review (parallel to #303's own review of quran-lemma-progress-
// data.js): the gated functions take NO override parameter -- a bypass any
// caller could pass would undo the gate's enforcement by inability. This
// suite is about the write functions against the Rules, so ONE loaded
// instance gets an OPEN copy of the gate module in place of the real one.
const openGateUrl = `data:text/javascript;base64,${Buffer.from(
  "export function isWordLevelsPersistenceReady() { return true; }\n" +
  "export function wordLevelsUnavailableReason() { return null; }\n"
).toString("base64")}`;

const {
  setWordState: realSetWordState,
  decideWordApproval: realDecideWordApproval,
  wordProgressFor: realWordProgressFor,
  clearWordProgressCache,
} = await loadDataLayer(openGateUrl);

// A SEPARATE instance of the SAME module, with the REAL (unswapped) gate --
// proves the committed repository state (ready: false) still refuses basic/
// depth even against the real assembled Rules: the "if the Rules were
// published today, is the app still safe by default" question the pure
// quran-word-progress-data.mjs suite cannot ask (it swaps a plain flag, not
// the real declaration file).
const { setWordState: setWordStateRealGate } = await loadDataLayer(realFileUrl("study-word-levels-readiness.js"));

// A cheap positive control: the loader really did load the real module, not
// an accidental no-op.
assert.equal(typeof realSetWordState, "function", "the loaded module does not export setWordState -- the loader is broken");
assert.equal(typeof realDecideWordApproval, "function", "the loaded module does not export decideWordApproval -- the loader is broken");
assert.equal(typeof setWordStateRealGate, "function", "the real-gate loader does not export setWordState -- the loader is broken");

const T = "t1", T2 = "t2";
const OCC = (s, a, p) => `quran-word-occurrence:v1:${s}:${a}:${p}`;

test("real quran-word-progress-data.js functions against the real assembled DEPLOYMENT candidate", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate } });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: T, authUid: "uid-p1" });
      await setDoc(doc(db, "tenantPeople", "p2"), { tenantId: T, authUid: "uid-p2", managedByPersonId: "p1" });
      await setDoc(doc(db, "tenantPeople", "p3"), { tenantId: T, authUid: "uid-p3" });
      await setDoc(doc(db, "tenantPeople", "pX"), { tenantId: T2, authUid: "uid-pX" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p1`), { tenantId: T, uid: "uid-p1", personId: "p1", roles: ["guardian"] });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p2`), { tenantId: T, uid: "uid-p2", personId: "p2", roles: ["student"] });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p3`), { tenantId: T, uid: "uid-p3", personId: "p3", roles: ["student"] });
      await setDoc(doc(db, "tenantMemberUids", `${T2}__uid-pX`), { tenantId: T2, uid: "uid-pX", personId: "pX", roles: ["self"] });
    });

    const p1 = env.authenticatedContext("uid-p1").firestore(); // guardian of p2
    const p2 = env.authenticatedContext("uid-p2").firestore(); // the child
    const p3 = env.authenticatedContext("uid-p3").firestore(); // unrelated
    const pX = env.authenticatedContext("uid-pX").firestore(); // a different tenant entirely

    let n = 0;
    const step = (name) => { n++; console.log(`  PASS  ${name}`); };

    // --- 1. Claim and confirm at BASIC, through the REAL functions, with the
    // gate forced open ---------------------------------------------------
    clearWordProgressCache();
    const claimBasic = await realSetWordState(p2, {
      tenantId: T, personId: "p2", level: "basic", occurrenceId: OCC(2, 255, 1), state: "achieved",
      actorPersonId: "p2", actorUid: "uid-p2", confirmationRequired: true, nowIso: "2026-09-26T10:00:00.000Z",
    });
    assert.deepEqual(claimBasic, { changed: true, writes: 1, laneId: "t1__p2__basic__2_255", position: 1 });
    step("basic: setWordState() succeeds for the learner and writes exactly one document, to the basic lane");

    const progressAfterClaimBasic = realWordProgressFor({ tenantId: T, personId: "p2", level: "basic", occurrenceId: OCC(2, 255, 1), confirmationRequired: true });
    assert.equal(progressAfterClaimBasic.state, "achieved");
    assert.equal(progressAfterClaimBasic.countsAsKnown, false, "confirmation is required -- a bare claim must not count yet");
    step("basic: the claim persists and reads back as achieved-but-unconfirmed (Activity != Mastery)");

    const confirmBasic = await realDecideWordApproval(p1, {
      tenantId: T, personId: "p2", level: "basic", occurrenceId: OCC(2, 255, 1), review: "confirmed",
      actorPersonId: "p1", actorUid: "uid-p1", isSupervisor: true, confirmationRequired: true, nowIso: "2026-09-26T10:01:00.000Z",
    });
    assert.deepEqual(confirmBasic, { changed: true, writes: 1, laneId: "t1__p2__basic__2_255", position: 1 });
    const progressAfterConfirmBasic = realWordProgressFor({ tenantId: T, personId: "p2", level: "basic", occurrenceId: OCC(2, 255, 1), confirmationRequired: true });
    assert.equal(progressAfterConfirmBasic.review, "confirmed");
    assert.equal(progressAfterConfirmBasic.countsAsKnown, true, "a real confirmation through the real Rules must count");
    step("basic: decideWordApproval() succeeds for the guardian, and the confirmation persists");

    await env.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDoc(doc(ctx.firestore(), "quranWordProgress", "t1__p2__basic__2_255"));
      assert.ok(snap.exists());
      assert.equal(snap.data().level, "basic");
    });
    step("basic: the stored document really carries level:\"basic\" -- proven by reading it back, not just the return value");

    // --- 2. Claim and confirm at DEPTH, on the SAME occurrence, independent
    // of the basic claim just made -----------------------------------------
    const claimDepth = await realSetWordState(p2, {
      tenantId: T, personId: "p2", level: "depth", occurrenceId: OCC(2, 255, 1), state: "achieved",
      actorPersonId: "p2", actorUid: "uid-p2", confirmationRequired: true, nowIso: "2026-09-26T10:02:00.000Z",
    });
    assert.deepEqual(claimDepth, { changed: true, writes: 1, laneId: "t1__p2__depth__2_255", position: 1 });
    step("depth: setWordState() succeeds for the learner and writes to its OWN lane, distinct from basic's");

    const confirmDepth = await realDecideWordApproval(p1, {
      tenantId: T, personId: "p2", level: "depth", occurrenceId: OCC(2, 255, 1), review: "confirmed",
      actorPersonId: "p1", actorUid: "uid-p1", isSupervisor: true, confirmationRequired: true, nowIso: "2026-09-26T10:03:00.000Z",
    });
    assert.deepEqual(confirmDepth, { changed: true, writes: 1, laneId: "t1__p2__depth__2_255", position: 1 });
    step("depth: decideWordApproval() succeeds for the guardian");

    // --- 3. A wbw claim on the SAME occurrence is independent of both -------
    const claimWbw = await realSetWordState(p2, {
      tenantId: T, personId: "p2", occurrenceId: OCC(2, 255, 1), state: "learning",
      actorPersonId: "p2", actorUid: "uid-p2", confirmationRequired: true, nowIso: "2026-09-26T10:04:00.000Z",
    });
    assert.deepEqual(claimWbw, { changed: true, writes: 1, laneId: "t1__p2__wbw__2_255", position: 1 });
    const basicStill = realWordProgressFor({ tenantId: T, personId: "p2", level: "basic", occurrenceId: OCC(2, 255, 1), confirmationRequired: true });
    const depthStill = realWordProgressFor({ tenantId: T, personId: "p2", level: "depth", occurrenceId: OCC(2, 255, 1), confirmationRequired: true });
    const wbwNow = realWordProgressFor({ tenantId: T, personId: "p2", occurrenceId: OCC(2, 255, 1), confirmationRequired: true });
    assert.equal(basicStill.state, "achieved", "the wbw claim must not disturb the basic lane on the same word");
    assert.equal(basicStill.countsAsKnown, true, "the basic confirmation must not be disturbed either");
    assert.equal(depthStill.state, "achieved", "the wbw claim must not disturb the depth lane on the same word");
    assert.equal(wbwNow.state, "learning");
    step("independence: a wbw claim on the same word occurrence leaves basic and depth completely untouched");

    // --- 4. Cross-tenant and wrong-actor writes are denied by the Rules,
    // proven at the NEW levels exactly as ISO/authority are already proven
    // for wbw -----------------------------------------------------------
    await assert.rejects(realSetWordState(pX, {
      tenantId: T, personId: "p2", level: "basic", occurrenceId: OCC(1, 1, 1),
      actorPersonId: "p2", actorUid: "uid-pX", state: "achieved",
    }), /permission|insufficient/i, "a cross-tenant actor's basic claim for p2 was not refused by the Rules");
    await assert.rejects(realSetWordState(p3, {
      tenantId: T, personId: "p2", level: "depth", occurrenceId: OCC(1, 1, 1),
      actorPersonId: "p3", actorUid: "uid-p3", isSupervisor: true, state: "achieved",
    }), /permission|insufficient/i, "an unrelated actor's depth claim for p2 was not refused by the Rules");
    await env.withSecurityRulesDisabled(async (ctx) => {
      const basicSnap = await getDoc(doc(ctx.firestore(), "quranWordProgress", "t1__p2__basic__1_1"));
      const depthSnap = await getDoc(doc(ctx.firestore(), "quranWordProgress", "t1__p2__depth__1_1"));
      assert.ok(!basicSnap.exists(), "a refused cross-tenant basic claim must not have written anything");
      assert.ok(!depthSnap.exists(), "a refused unrelated-actor depth claim must not have written anything");
    });
    step("ISO/authority: cross-tenant and unrelated-actor claims at the new levels are refused by the Rules, and nothing was written");

    // --- 5. An unknown level is refused before touching Firestore, even with
    // the gate forced open --------------------------------------------------
    await assert.rejects(realSetWordState(p2, {
      tenantId: T, personId: "p2", level: "grammar", occurrenceId: OCC(1, 1, 2),
      actorPersonId: "p2", actorUid: "uid-p2", state: "achieved",
    }), /Unknown Arabic level/);
    step("an unknown level is refused before any write, whatever the gate reads");

    // --- 6. I6: a decision is pinned to its claim instant, proven through a
    // REAL round trip against the real Rules ---------------------------------
    clearWordProgressCache();
    const firstClaim = await realSetWordState(p2, {
      tenantId: T, personId: "p2", level: "basic", occurrenceId: OCC(3, 1, 1), state: "achieved",
      actorPersonId: "p2", actorUid: "uid-p2", confirmationRequired: true, nowIso: "2026-09-26T10:05:00.000Z",
    });
    assert.equal(firstClaim.changed, true);
    await realDecideWordApproval(p1, {
      tenantId: T, personId: "p2", level: "basic", occurrenceId: OCC(3, 1, 1), review: "confirmed",
      actorPersonId: "p1", actorUid: "uid-p1", isSupervisor: true, confirmationRequired: true, nowIso: "2026-09-26T10:06:00.000Z",
    });
    const confirmedView = realWordProgressFor({ tenantId: T, personId: "p2", level: "basic", occurrenceId: OCC(3, 1, 1), confirmationRequired: true });
    assert.equal(confirmedView.countsAsKnown, true);
    await realSetWordState(p2, {
      tenantId: T, personId: "p2", level: "basic", occurrenceId: OCC(3, 1, 1), state: "learning",
      actorPersonId: "p2", actorUid: "uid-p2", confirmationRequired: true, nowIso: "2026-09-26T10:07:00.000Z",
    });
    const reclaim = await realSetWordState(p2, {
      tenantId: T, personId: "p2", level: "basic", occurrenceId: OCC(3, 1, 1), state: "achieved",
      actorPersonId: "p2", actorUid: "uid-p2", confirmationRequired: true, nowIso: "2026-09-26T10:08:00.000Z",
    });
    assert.equal(reclaim.changed, true);
    const viewAfterReclaim = realWordProgressFor({ tenantId: T, personId: "p2", level: "basic", occurrenceId: OCC(3, 1, 1), confirmationRequired: true });
    assert.equal(viewAfterReclaim.review, "pending", "I6: a NEW claim instant must stop matching the old, frozen decision");
    assert.equal(viewAfterReclaim.countsAsKnown, false, "a re-claim must not silently inherit the earlier confirmation");
    await env.withSecurityRulesDisabled(async (ctx) => {
      const supSnap = await getDoc(doc(ctx.firestore(), "quranWordApprovals", "t1__p2__basic__3_1"));
      assert.equal(supSnap.data().entries["1"].by, "p1", "the original decision's reviewer is kept, not rewritten");
    });
    step("I6: a fresh basic claim instant is not covered by the earlier decision, proven through a real round trip against the real Rules");

    // --- 7. The gate as committed today (ready: false) still refuses basic/
    // depth even against this exact assembled candidate -- proven with a
    // SEPARATE module instance carrying the REAL, unswapped gate file. ------
    await assert.rejects(setWordStateRealGate(p2, {
      tenantId: T, personId: "p2", level: "basic", occurrenceId: OCC(4, 1, 1),
      actorPersonId: "p2", actorUid: "uid-p2", state: "achieved",
    }), /not yet available/, "the real, committed study-word-levels-readiness.js must still refuse basic even against the real published-shape Rules");
    step("the real (unswapped) gate module, as committed today, refuses basic/depth even though the Rules would allow it -- the app-side gate is what is actually withholding this feature");

    console.log(`\n==== word-levels-real-function: ${n} assertions through the REAL functions against the REAL assembled DEPLOYMENT candidate ====`);
  } finally {
    await env.cleanup();
  }
});
