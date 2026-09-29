// Issue #349 (ADR-008 Amendment 3, Owner decision 20) -- proves the REAL
// "Mark as read" write path for a Ruku' and a Page (recordStudyEvidence() in
// app/js/study-event-wiring.js, through the real evidence store and the real
// envelope) against the REAL emulator running the REAL ASSEMBLED DEPLOYMENT
// candidate -- and that the SAME write is refused by today's live
// firestore.rules. Written by the Architect at review: the round's own PR
// shipped the candidate without this proof, and a Rules paste the Owner is
// asked to make must be proven to do what it says before it is asked for.
//
// Same technique as word-levels-real-function.rules.test.mjs: the real modules
// are loaded as data: URLs with their gstatic Firestore import rewritten to the
// real `firebase/firestore` package. Isolated: demo- project, 127.0.0.1 only.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { initializeTestEnvironment, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-reading-units-real-function";
const HOST = "127.0.0.1";
const PORT = 8104;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const CANDIDATE = fs.readFileSync(path.resolve(root, "docs/governance/2026-09-28-reading-ruku-page-DEPLOYMENT-candidate.rules"), "utf8");
// UPDATED 29 Sep 2026: the Owner published the candidate, and firestore.rules
// is synced to it. The "refused before the publish" half therefore reads the
// rules as they stood BEFORE the sync, pinned to a fixed commit (a fact about
// the past does not move when the live file does -- the same principle as
// rules-deployment-candidate.mjs's PRE_DEPLOYMENT_REF). The live file is now
// asserted to BE the candidate.
const PRE_PUBLISH_REF = "27346eaa686d176d90c1a96afd6022926110f62b";
const LIVE = execSync(`git show ${PRE_PUBLISH_REF}:firestore.rules`, { cwd: root, encoding: "utf8" });
const CURRENT_LIVE = fs.readFileSync(path.resolve(root, "firestore.rules"), "utf8");

assert.match(PROJECT, /^demo-/);
assert.equal(HOST, "127.0.0.1");
assert.match(CANDIDATE, /d\(\)\.unitType == 'ruku'/, "the candidate must admit ruku");
assert.match(CANDIDATE, /d\(\)\.unitType == 'page'/, "the candidate must admit page");
assert.doesNotMatch(LIVE, /d\(\)\.unitType == 'ruku'/, "the pre-publish rules already admit ruku -- this suite's 'before' half would prove nothing");
assert.equal(CURRENT_LIVE, CANDIDATE, "firestore.rules is no longer the published Ruku'/Page file");

// --- load the real modules ---------------------------------------------------
const GSTATIC = /import\s*\{[\s\S]*?\}\s*from\s*"https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/;
const fsUrl = import.meta.resolve("firebase/firestore");
const toDataUrl = (src) => `data:text/javascript;base64,${Buffer.from(src).toString("base64")}`;
const realUrl = (f) => pathToFileURL(path.join(root, "app/js", f)).href;
const read = (f) => fs.readFileSync(path.join(root, "app/js", f), "utf8");
function swapGstatic(src, line, label) { assert.match(src, GSTATIC, `${label}: gstatic import moved`); return src.replace(GSTATIC, line); }
function swapSpec(src, spec, url, label) {
  const re = new RegExp(`from "${spec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
  assert.match(src, re, `${label}: "${spec}" moved`);
  return src.replace(re, `from "${url}"`);
}

const envelopeUrl = toDataUrl(swapGstatic(read("envelope.js"),
  `import { doc, setDoc, updateDoc, writeBatch, runTransaction, serverTimestamp } from "${fsUrl}";`, "envelope.js"));

let store = swapGstatic(read("study-activity-evidence-store.js"),
  `import { collection, doc, getDoc, getDocs, limit, query } from "${fsUrl}";`, "store");
store = swapSpec(store, "./collections.js", realUrl("collections.js"), "store");
store = swapSpec(store, "./envelope.js", envelopeUrl, "store");
store = swapSpec(store, "./study-activity-evidence-id.js", realUrl("study-activity-evidence-id.js"), "store");
const storeUrl = toDataUrl(store);

// weekKeyFor is lifted verbatim out of the real activity.js (whose own imports
// pull in the browser-only i18n layer); the function text itself is the app's.
const activitySrc = read("activity.js");
const weekFn = /export function weekKeyFor\([\s\S]*?\n\}/.exec(activitySrc);
assert.ok(weekFn, "weekKeyFor moved in activity.js -- update this loader");
const activityUrl = toDataUrl(weekFn[0] + "\n");

const OPEN_GATE = toDataUrl("export function isReadingUnitsPersistenceReady() { return true; }\nexport function readingUnitsUnavailableReason() { return null; }\n");

function loadWiring(gateUrl) {
  let w = read("study-event-wiring.js");
  w = swapSpec(w, "./activity.js", activityUrl, "wiring");
  w = swapSpec(w, "./study-activity-evidence-store.js", storeUrl, "wiring");
  w = swapSpec(w, "./study-activity-evidence-id.js", realUrl("study-activity-evidence-id.js"), "wiring");
  w = swapSpec(w, "./study-evidence-readiness.js", realUrl("study-evidence-readiness.js"), "wiring");
  w = swapSpec(w, "./study-reading-units-readiness.js", gateUrl, "wiring");
  return import(toDataUrl(w));
}
// A CLOSED stand-in gate: the committed one is open since 29 Sep 2026, so the
// "refused before writing" behaviour is proven against this instead.
const CLOSED_GATE = toDataUrl("export function isReadingUnitsPersistenceReady() { return false; }\nexport function readingUnitsUnavailableReason() { return 'reading-units-rules-not-deployed'; }\n");
const open = await loadWiring(OPEN_GATE);
const closed = await loadWiring(CLOSED_GATE);
const committed = await loadWiring(realUrl("study-reading-units-readiness.js"));
const { createDocument } = await import(envelopeUrl);
const { studyEvidenceId, buildStudyEvidenceDocument, evidenceParentKey } = await import(realUrl("study-activity-evidence-id.js"));
assert.equal(typeof open.recordStudyEvidence, "function", "loader broken: no recordStudyEvidence");

const T = "t1";
const AT = new Date("2026-09-28T09:00:00Z");
const args = (unitKey, unitType) => open.readingCompletionArgs({
  tenantId: T, personId: "p1", unitKey, unitType, translationLangs: [], at: AT, weekStartsOn: 6,
});

async function seed(env) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: T, authUid: "uid-p1" });
    await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p1`), { tenantId: T, uid: "uid-p1", personId: "p1", roles: ["self"] });
  });
}
const evPath = (a) => `activity/${evidenceParentKey(a.tenantId, a.personId, a.weekKey)}/evidence`;

test("Mark as read for a Ruku' and a Page: lands under the candidate, refused under the pre-publish rules", async () => {
  let n = 0;
  const step = (s) => { n++; console.log(`  PASS  ${s}`); };

  // ---- A. the DEPLOYMENT candidate ----------------------------------------
  let env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: CANDIDATE } });
  try {
    await seed(env);
    const db = env.authenticatedContext("uid-p1").firestore();

    const ruku = args("ruku:35:5", "ruku");
    assert.ok(ruku, "readingCompletionArgs refused a ruku");
    const r1 = await open.recordStudyEvidence(db, ruku, { uid: "uid-p1" });
    assert.equal(r1.written, true, JSON.stringify(r1));
    step("a Ruku' reading completion is written through the real chokepoint");

    const page = args("page:madani:439", "page");
    const r2 = await open.recordStudyEvidence(db, page, { uid: "uid-p1" });
    assert.equal(r2.written, true, JSON.stringify(r2));
    step("a Page reading completion is written through the real chokepoint");

    await env.withSecurityRulesDisabled(async (ctx) => {
      const s = await getDoc(doc(ctx.firestore(), evPath(ruku), r1.eventId));
      assert.ok(s.exists());
      assert.equal(s.data().unitType, "ruku");
      assert.equal(s.data().unitKey, "ruku:35:5");
      assert.equal(s.data().eventType, "reading.completed");
    });
    step("the stored Ruku' row reads back as reading.completed on ruku:35:5");

    const again = await open.recordStudyEvidence(db, ruku, { uid: "uid-p1" });
    assert.deepEqual({ w: again.written, id: again.eventId }, { w: false, id: r1.eventId });
    step("pressing again the same day is a no-op, not an error");

    // UPDATED 29 Sep 2026: the committed gate is OPEN (governed decision,
    // docs/reports/2026-09-29-reading-ruku-page-enabled.md), so the real
    // committed module now writes; the closed behaviour is proven with a
    // closed stand-in.
    const committedWrite = await committed.recordStudyEvidence(db, args("ruku:35:6", "ruku"), { uid: "uid-p1" });
    assert.equal(committedWrite.written, true, JSON.stringify(committedWrite));
    step("with the COMMITTED gate (ready: true since 29 Sep) a Ruku' completion is written");
    const gated = await closed.recordStudyEvidence(db, args("ruku:35:9", "ruku"), { uid: "uid-p1" });
    assert.equal(gated.blocked, true, JSON.stringify(gated));
    step("with a CLOSED gate the app refuses before writing");

    assert.equal(open.readingCompletionArgs({ tenantId: T, personId: "p1", unitKey: "juz:22", unitType: "juz", translationLangs: [], at: AT }), null);
    step("a Juz completion composes no write at all (Hizb/Juz are 'later')");

    // Raw writes, each differing from an allowed one in ONE fact.
    const good = buildStudyEvidenceDocument({ ...args("ruku:35:7", "ruku") });
    const goodId = studyEvidenceId({ ...args("ruku:35:7", "ruku") });
    await createDocument(db, evPath(good), goodId, good, "uid-p1");
    step("positive control: a well-formed raw Ruku' row is allowed");

    const juz = { ...good, unitType: "juz", unitKey: "juz:22" };
    await assertFails(createDocument(db, evPath(juz), goodId.replace("ruku:35:7", "juz:22"), juz, "uid-p1"));
    step("the same row as a Juz is denied by the candidate");

    const mixed = { ...good, unitType: "ruku", unitKey: "page:madani:440" };
    await assertFails(createDocument(db, evPath(mixed), goodId.replace("ruku:35:7", "page:madani:440"), mixed, "uid-p1"));
    step("a Ruku' unitType carrying a Page key is denied");

    const pageAsRuku = { ...good, unitType: "page", unitKey: "ruku:35:8" };
    await assertFails(createDocument(db, evPath(pageAsRuku), goodId.replace("ruku:35:7", "ruku:35:8"), pageAsRuku, "uid-p1"));
    step("a Page unitType carrying a Ruku' key is denied");
  } finally {
    await env.cleanup();
  }

  // ---- B. the rules as they stood before the Owner's publish (pinned) ------------------------------------
  env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: LIVE } });
  try {
    await env.clearFirestore();
    await seed(env);
    const db = env.authenticatedContext("uid-p1").firestore();
    await assert.rejects(open.recordStudyEvidence(db, args("ruku:35:5", "ruku"), { uid: "uid-p1" }), /permission|PERMISSION/i);
    step("PRE-PUBLISH rules: the same Ruku' write is refused (so the Owner's publish is what switches it on)");
    await assert.rejects(open.recordStudyEvidence(db, args("page:madani:439", "page"), { uid: "uid-p1" }), /permission|PERMISSION/i);
    step("PRE-PUBLISH rules: the same Page write is refused");
    const surah = await open.recordStudyEvidence(db, args("surah:35", "surah"), { uid: "uid-p1" });
    assert.equal(surah.written, true, JSON.stringify(surah));
    step("PRE-PUBLISH rules positive control: a Surah completion is still written");
  } finally {
    await env.cleanup();
  }
  console.log(`  ${n} steps passed`);
});
