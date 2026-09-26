// Issue #301 -- proves the REAL app/js/quran-lemma-progress-data.js write
// functions against the REAL emulator running the REAL ASSEMBLED DEPLOYMENT
// candidate, in one suite. EXTENDED in issue #303 to also prove the
// bounded-cost counter (getLemmaOccurrenceCounts/bumpLemmaOccurrenceCounter)
// and the running whole-Qur'an total moving across several juz in one write
// (recordWordTotalDeltaAcrossJuz, quran-word-total-data.js) against the same
// regenerated candidate. Same technique as
// note-foundation-real-function.rules.test.mjs: neither
// lemma-progress-v1.rules.test.mjs (hand-authored setDoc/updateDoc, no real
// function) nor a pure unit suite (no Rules engine behind it) proves that
// claimLemmaWordState()/decideLemmaWordApproval() actually write what the
// deployed Rules require -- this is the one place both are real at once.
//
// Isolated: never loads firestore.rules directly (it loads the ASSEMBLED
// deployment candidate, which is firestore.rules plus only this issue's
// additions -- see the file itself), never touches a production endpoint or
// project id (SAFE-01, asserted below).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { unpackWordIndexRef } from "../../app/js/quran-word-index.js";
import { juzForSurahAyah } from "../../app/js/quran-word-total.js";

const PROJECT = "demo-quranrevival-lemma-progress-real-function";
const HOST = "127.0.0.1";
const PORT = 8102;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const DEPLOYMENT = "docs/governance/2026-09-26-lemma-progress-DEPLOYMENT-candidate.rules";
const RULES_FILE = process.env.RULES_FILE || DEPLOYMENT;
const candidate = fs.readFileSync(path.resolve(root, RULES_FILE), "utf8");

// SAFE-01: never a production project or a non-emulator host.
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");
assert.equal(HOST, "127.0.0.1");
// This suite's whole point is running against the ASSEMBLED file -- prove it
// really carries both the new collections AND the pre-existing live rules,
// so a green run here is evidence about the thing that would actually be
// pasted, not a stand-in extract.
for (const required of ["quranLemmaProgress", "quranLemmaApprovals", "quranLemmaOccurrenceCounters", "tenantInvites", "quranWordProgress", "quranWordTotals"]) {
  assert.ok(new RegExp(`match /${required}/`).test(candidate), `the deployment candidate is missing match /${required}/`);
}

// ---------------------------------------------------------------------------
// Load the REAL app/js/envelope.js and app/js/quran-lemma-progress-data.js as
// `data:` URL modules, exactly the technique note-foundation-real-function.
// rules.test.mjs uses: the gstatic Firestore import is rewritten to the real
// `firebase/firestore` package this workspace already depends on, and every
// local specifier is rewritten to an absolute URL, since a `data:` module has
// no base URL and cannot resolve a relative or bare specifier on its own.
// quran-word-progress.js, quran-word-index.js, quran-lemma-progress.js and
// collections.js are all pure (no Firebase import of their own, confirmed by
// reading them), so they need no rewriting themselves -- only a real file URL
// so Node can find them from a `data:` module's import.
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

let dataSource = fs.readFileSync(path.join(root, "app/js/quran-lemma-progress-data.js"), "utf8");
dataSource = rewriteGstaticImport(dataSource,
  `import { doc, getDoc } from "${firestorePackageUrl}";`,
  "quran-lemma-progress-data.js");
dataSource = rewriteSpecifier(dataSource, "./collections.js", realFileUrl("collections.js"), "quran-lemma-progress-data.js");
dataSource = rewriteSpecifier(dataSource, "./envelope.js", envelopeDataUrl, "quran-lemma-progress-data.js");
dataSource = rewriteSpecifier(dataSource, "./quran-word-progress.js", realFileUrl("quran-word-progress.js"), "quran-lemma-progress-data.js");
dataSource = rewriteSpecifier(dataSource, "./quran-word-index.js", realFileUrl("quran-word-index.js"), "quran-lemma-progress-data.js");
dataSource = rewriteSpecifier(dataSource, "./quran-lemma-progress.js", realFileUrl("quran-lemma-progress.js"), "quran-lemma-progress-data.js");
dataSource = rewriteSpecifier(dataSource, "./study-lemma-progress-readiness.js", realFileUrl("study-lemma-progress-readiness.js"), "quran-lemma-progress-data.js");
dataSource = rewriteSpecifier(dataSource, "./quran-word-total.js", realFileUrl("quran-word-total.js"), "quran-lemma-progress-data.js");

const {
  claimLemmaWordState: realClaimLemmaWordState,
  decideLemmaWordApproval: realDecideLemmaWordApproval,
  getLemmaProgress: realGetLemmaProgress,
  getLemmaOccurrenceCounts: realGetLemmaOccurrenceCounts,
  bumpLemmaOccurrenceCounter: realBumpLemmaOccurrenceCounter,
  clearLemmaProgressCache,
} = await import(toDataUrl(dataSource));

// Issue #303 -- these functions now consult app/js/study-lemma-progress-
// readiness.js FIRST, and that module's own real declaration is `ready:
// false` (not yet enabled). This suite is about the real WRITE FUNCTIONS
// against the real Rules, not about the readiness gate (which has its own
// pure-model coverage in quran-lemma-progress-numbers.mjs) -- so every call
// below forces the gate open through the explicit `readinessDeclaration`
// parameter every gated function accepts, exactly the override mechanism
// that parameter exists for. Wrapped once here rather than repeated at
// every call site.
const FORCE_OPEN = Object.freeze({
  ready: true,
  decision: Object.freeze({ by: "master-architect", on: "2026-09-26", reference: "test-forced-open" }),
});
const claimLemmaWordState = (db, args) => realClaimLemmaWordState(db, { ...args, readinessDeclaration: FORCE_OPEN });
const decideLemmaWordApproval = (db, args) => realDecideLemmaWordApproval(db, { ...args, readinessDeclaration: FORCE_OPEN });
const getLemmaProgress = (db, args) => realGetLemmaProgress(db, { ...args, readinessDeclaration: FORCE_OPEN });
const getLemmaOccurrenceCounts = (db, args) => realGetLemmaOccurrenceCounts(db, { ...args, readinessDeclaration: FORCE_OPEN });
const bumpLemmaOccurrenceCounter = (db, args) => realBumpLemmaOccurrenceCounter(db, { ...args, readinessDeclaration: FORCE_OPEN });

let totalDataSource = fs.readFileSync(path.join(root, "app/js/quran-word-total-data.js"), "utf8");
totalDataSource = rewriteGstaticImport(totalDataSource,
  `import { doc, getDoc, increment } from "${firestorePackageUrl}";`,
  "quran-word-total-data.js");
totalDataSource = rewriteSpecifier(totalDataSource, "./collections.js", realFileUrl("collections.js"), "quran-word-total-data.js");
totalDataSource = rewriteSpecifier(totalDataSource, "./envelope.js", envelopeDataUrl, "quran-word-total-data.js");
totalDataSource = rewriteSpecifier(totalDataSource, "./study-wbw-total-readiness.js", realFileUrl("study-wbw-total-readiness.js"), "quran-word-total-data.js");
totalDataSource = rewriteSpecifier(totalDataSource, "./quran-word-total.js", realFileUrl("quran-word-total.js"), "quran-word-total-data.js");
const { recordWordTotalDeltaAcrossJuz, getWordTotals } = await import(toDataUrl(totalDataSource));

// A cheap positive control: the loader really did load the real modules, not
// an accidental no-op.
assert.equal(typeof claimLemmaWordState, "function", "the loaded module does not export claimLemmaWordState -- the loader is broken");
assert.equal(typeof getLemmaOccurrenceCounts, "function", "the loaded module does not export getLemmaOccurrenceCounts -- the loader is broken");
assert.equal(typeof recordWordTotalDeltaAcrossJuz, "function", "the loaded module does not export recordWordTotalDeltaAcrossJuz -- the loader is broken");

const T = "t1", T2 = "t2";
const LEMMA_A = "لَمَّا";
// A minimal, synthetic juz index -- juzForSurahAyah() only needs
// (startSurah,startAyah)-(endSurah,endAyah) pairs in order, never the real
// packaged 30-row index, for a test scoped to two juz.
const FAKE_JUZ_INDEX = [
  { juz: 1, startSurah: 1, startAyah: 1, endSurah: 2, endAyah: 200 },
  { juz: 2, startSurah: 2, startAyah: 201, endSurah: 3, endAyah: 300 },
];
// LEMMA_B's three synthetic occurrences: two in juz 1 (surah 2), one in juz 2
// (surah 3) -- encoded surah*1e6 + ayah*1e3 + position, matching the real
// packaged index's own documented encoding.
const LEMMA_B = "قَرَأَ";
const LEMMA_B_REFS_RAW = [2_001_001, 2_002_001, 3_005_002];
const fakeFetchImpl = async () => ({
  ok: true,
  json: async () => ({
    identityContract: "quran-word-occurrence:v1",
    encoding: "surah*1000000+ayah*1000+position",
    values: { [LEMMA_B]: LEMMA_B_REFS_RAW },
  }),
});
const LEMMA_B_REFS = LEMMA_B_REFS_RAW.map(unpackWordIndexRef);
// Independently confirms this fixture really does span two juz, the same
// arithmetic recordWordTotalDeltaAcrossJuz()'s own multi-field write depends
// on -- a fixture that accidentally collapsed to one juz would prove nothing
// about the "several juz in one write" claim.
assert.deepEqual(
  [...LEMMA_B_REFS].map((r) => juzForSurahAyah(FAKE_JUZ_INDEX, r.surah, r.ayah)).sort(),
  [1, 1, 2],
  "the synthetic fixture must span exactly juz 1 (twice) and juz 2 (once)",
);

test("real quran-lemma-progress-data.js functions against the real assembled DEPLOYMENT candidate", async () => {
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

    // --- 1. Claim and confirm, through the REAL functions ------------------
    const claim = await claimLemmaWordState(p2, {
      tenantId: T, personId: "p2", lemmaId: LEMMA_A, state: "achieved",
      actorPersonId: "p2", actorUid: "uid-p2", confirmationRequired: true,
      nowIso: "2026-09-26T10:00:00.000Z",
    });
    assert.deepEqual(claim, { changed: true, writes: 1, docId: `${T}__p2__wbw__${LEMMA_A}` });
    step("claim: claimLemmaWordState() succeeds for the learner and writes exactly one document");

    const progressAfterClaim = await getLemmaProgress(p1, { tenantId: T, personId: "p2", lemmaId: LEMMA_A, confirmationRequired: true });
    assert.equal(progressAfterClaim.state, "achieved");
    assert.equal(progressAfterClaim.countsAsKnown, false, "confirmation is required -- a bare claim must not count yet");
    step("claim: the claim persists and reads back as achieved-but-unconfirmed (Activity != Mastery)");

    const confirm = await decideLemmaWordApproval(p1, {
      tenantId: T, personId: "p2", lemmaId: LEMMA_A, review: "confirmed",
      actorPersonId: "p1", actorUid: "uid-p1", isSupervisor: true, confirmationRequired: true,
      nowIso: "2026-09-26T10:01:00.000Z",
    });
    assert.deepEqual(confirm, { changed: true, writes: 1, docId: `${T}__p2__wbw__${LEMMA_A}` });
    step("confirm: decideLemmaWordApproval() succeeds for the guardian");

    const progressAfterConfirm = await getLemmaProgress(p2, { tenantId: T, personId: "p2", lemmaId: LEMMA_A, confirmationRequired: true });
    assert.equal(progressAfterConfirm.review, "confirmed");
    assert.equal(progressAfterConfirm.countsAsKnown, true, "a real confirmation through the real Rules must count");
    step("confirm: the confirmation persists and countsAsKnown flips true");

    // --- 2. The claim instant is pinned (I6), proven through a REAL round
    // trip -- not merely the pure resolveLemmaProgress() logic this also
    // covers elsewhere. -------------------------------------------------
    clearLemmaProgressCache();
    const reclaim = await claimLemmaWordState(p2, {
      tenantId: T, personId: "p2", lemmaId: LEMMA_A, state: "learning",
      actorPersonId: "p2", actorUid: "uid-p2", confirmationRequired: true,
      nowIso: "2026-09-26T10:02:00.000Z",
    });
    assert.equal(reclaim.changed, true);
    const backToAchieved = await claimLemmaWordState(p2, {
      tenantId: T, personId: "p2", lemmaId: LEMMA_A, state: "achieved",
      actorPersonId: "p2", actorUid: "uid-p2", confirmationRequired: true,
      nowIso: "2026-09-26T10:03:00.000Z",
    });
    assert.equal(backToAchieved.changed, true);
    const progressAfterReclaim = await getLemmaProgress(p1, { tenantId: T, personId: "p2", lemmaId: LEMMA_A, confirmationRequired: true });
    assert.equal(progressAfterReclaim.review, "pending",
      "a NEW claim instant must stop matching the old, frozen decision -- I6");
    assert.equal(progressAfterReclaim.countsAsKnown, false,
      "a re-claim must not silently inherit the earlier confirmation");
    step("I6: a fresh claim instant is not covered by the earlier decision, proven through a real read-after-write");

    // --- 3. Cross-tenant writes are denied ---------------------------------
    // pX exists only in tenant T2 and has no standing at all in tenant T:
    // no admin/teacher/guardian role there, and canRecordFor()'s own
    // isSelfPerson() check reads real p2's tenantPeople document, whose
    // authUid is "uid-p2" -- never "uid-pX", whatever the payload CLAIMS
    // actorPersonId is. Sending actorPersonId:"p2" while authenticated as
    // uid-pX passes claimLemmaWordState()'s own thin JS-level self-check
    // (it trusts the caller's own claimed actorPersonId, it does not verify
    // it), so this denial can only come from the Rules layer's
    // canRecordFor() -- the identical depth ISO-04 in note-foundation-
    // real-function.rules.test.mjs proves for the Note Foundation.
    await assert.rejects(claimLemmaWordState(pX, {
      tenantId: T, personId: "p2", lemmaId: "قَالَ",
      actorPersonId: "p2", actorUid: "uid-pX", state: "achieved",
    }), /permission|insufficient/i, "a cross-tenant actor's claim for p2 was not refused by the Rules");
    await env.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDoc(doc(ctx.firestore(), "quranLemmaProgress", `${T}__p2__wbw__قَالَ`));
      assert.ok(!snap.exists(), "a refused cross-tenant claim must not have written anything");
    });
    step("ISO: a cross-tenant actor's claim is refused by the Rules, and nothing was written");

    // --- 4. The wrong actor is denied --------------------------------------
    // p3 is unrelated to p2 in every way (no guardian/teacher link). Forcing
    // isSupervisor:true bypasses claimLemmaWordState()'s own thin JS gate
    // (which would otherwise refuse it before ever reaching Firestore), so
    // this denial, too, can only come from the Rules' canRecordFor().
    await assert.rejects(claimLemmaWordState(p3, {
      tenantId: T, personId: "p2", lemmaId: "كَتَبَ",
      actorPersonId: "p3", actorUid: "uid-p3", isSupervisor: true, state: "achieved",
    }), /permission|insufficient/i, "an unrelated actor's claim for p2 was not refused by the Rules");
    step("the wrong actor is refused by the Rules even when the JS-level gate is bypassed");

    // --- 5. A retry neither throws nor duplicates --------------------------
    clearLemmaProgressCache();
    const first = await claimLemmaWordState(p2, {
      tenantId: T, personId: "p2", lemmaId: "قَرَأَ", state: "achieved",
      actorPersonId: "p2", actorUid: "uid-p2", nowIso: "2026-09-26T10:04:00.000Z",
    });
    assert.deepEqual(first, { changed: true, writes: 1, docId: `${T}__p2__wbw__قَرَأَ` });
    const retry = await claimLemmaWordState(p2, {
      tenantId: T, personId: "p2", lemmaId: "قَرَأَ", state: "achieved",
      actorPersonId: "p2", actorUid: "uid-p2", nowIso: "2026-09-26T10:05:00.000Z",
    });
    assert.deepEqual(retry, { changed: false, writes: 0 },
      "an identical retry must be a no-op -- it must not throw and must not write again");
    let docCount = 0;
    await env.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDoc(doc(ctx.firestore(), "quranLemmaProgress", `${T}__p2__wbw__قَرَأَ`));
      assert.ok(snap.exists());
      assert.equal(snap.data().at, "2026-09-26T10:04:00.000Z", "a retry must not overwrite the original claim instant");
      docCount = 1;
    });
    assert.equal(docCount, 1);
    step("retry: an identical re-claim neither throws nor duplicates, and the original claim instant is untouched");

    // --- 6. The bounded counter (issue #303): seed once from the real full
    // walk, never re-walk, and maintain it cheaply from an ordinary tap. ---
    const counts = await getLemmaOccurrenceCounts(p2, {
      tenantId: T, personId: "p2", lemmaId: LEMMA_B, refs: LEMMA_B_REFS, juzIndex: FAKE_JUZ_INDEX,
      confirmationRequired: false, actorUid: "uid-p2", fetchImpl: fakeFetchImpl,
    });
    assert.equal(counts.seededJustNow, true, "the counter must be seeded the first time it is asked about");
    assert.deepEqual([...counts.occurrenceCountByJuz.entries()].sort(), [[1, 2], [2, 1]],
      "the lemma's 3 synthetic occurrences must be grouped 2-in-juz-1, 1-in-juz-2");
    assert.equal(counts.alreadyKnownByJuz.size, 0, "none of the 3 synthetic occurrences has any real occurrence-level state yet");
    step("counter: the first-ever ask seeds the bounded per-juz counter from the real full walk");

    await env.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDoc(doc(ctx.firestore(), "quranLemmaOccurrenceCounters", `${T}__p2__wbw__${LEMMA_B}`));
      assert.ok(snap.exists(), "the seeded counter document must actually be persisted");
      assert.deepEqual(snap.data().individuallyKnownByJuz, {}, "nothing was individually known, so the seeded map is empty");
    });
    step("counter: the seed is persisted, not merely returned");

    // A second ask must NOT re-walk the corpus -- proven by handing it a
    // fetchImpl that throws if it is ever called.
    const secondAsk = await getLemmaOccurrenceCounts(p2, {
      tenantId: T, personId: "p2", lemmaId: LEMMA_B, refs: LEMMA_B_REFS, juzIndex: FAKE_JUZ_INDEX,
      fetchImpl: async () => { throw new Error("must not re-walk a lemma once its counter is seeded"); },
    });
    assert.equal(secondAsk.seededJustNow, false);
    step("counter: a second ask reads the persisted counter and never re-walks the corpus");

    // Cheap maintenance from an ORDINARY occurrence-level tap: 1 read, 1
    // write, moves only its own juz's own bucket.
    const bump = await bumpLemmaOccurrenceCounter(p2, { tenantId: T, personId: "p2", lemmaId: LEMMA_B, juz: 1, delta: 1 });
    assert.deepEqual(bump, { attempted: true, changed: true });
    await env.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDoc(doc(ctx.firestore(), "quranLemmaOccurrenceCounters", `${T}__p2__wbw__${LEMMA_B}`));
      assert.equal(snap.data().individuallyKnownByJuz["1"], 1, "an ordinary tap must move only juz 1's own bucket");
      assert.equal(snap.data().individuallyKnownByJuz["2"] ?? 0, 0, "juz 2's bucket must be untouched by a juz-1 tap");
    });
    step("counter: an ordinary occurrence-level tap bumps only its own juz bucket by ±1");

    // A tap on a lemma whose counter was never seeded is a silent no-op --
    // proven with a lemma this suite never asks getLemmaOccurrenceCounts()
    // about.
    const noSeedBump = await bumpLemmaOccurrenceCounter(p2, { tenantId: T, personId: "p2", lemmaId: "لَيْسَ", juz: 1, delta: 1 });
    assert.deepEqual(noSeedBump, { attempted: true, changed: false, reason: "not-seeded" });
    step("counter: bumping an unseeded lemma's counter is a silent no-op, never a re-walk");

    // --- 7. The running total moves across every juz a lemma spans, in ONE
    // document write (recordWordTotalDeltaAcrossJuz(), quran-word-total-
    // data.js) -- proven by construction (its body issues exactly one
    // updateDocument()/createDocument() call) and by the resulting document
    // carrying BOTH juz's own correct figures afterwards. -------------------
    const FAKE_JUZ_WORD_TOTALS = Array.from({ length: 30 }, (_, i) => ({ juz: i + 1, totalWords: i === 29 ? 2609 : 2580 })); // sums to 77429
    const deltaByJuz = new Map([[1, 2], [2, 1]]); // this lemma's own occurrenceCountByJuz, moving from unknown to known
    const totalMove = await recordWordTotalDeltaAcrossJuz(p2, {
      tenantId: T, personId: "p2", deltaByJuz, actorUid: "uid-p2", juzWordTotals: FAKE_JUZ_WORD_TOTALS,
    });
    assert.deepEqual(totalMove, { attempted: true, changed: true });
    const totalsAfterFirstMove = await getWordTotals(p2, { tenantId: T, personId: "p2" });
    assert.equal(totalsAfterFirstMove.known, 3, "the whole-Qur'an known figure must move by the SUM of every juz's own delta");
    assert.equal(totalsAfterFirstMove.byJuz["1"].known, 2);
    assert.equal(totalsAfterFirstMove.byJuz["2"].known, 1);
    assert.equal(totalsAfterFirstMove.byJuz["3"].known, 0, "an unaffected juz must be untouched");
    step("total: a whole-lemma claim moves quranWordTotals.known AND every affected byJuz entry in one document write");

    // A second, independent move (an unlearn: juz 1 loses one) proves the
    // EXISTING-document branch's increment()s are correct too, not just the
    // first-ever seed.
    const secondMove = await recordWordTotalDeltaAcrossJuz(p2, {
      tenantId: T, personId: "p2", deltaByJuz: new Map([[1, -1]]), actorUid: "uid-p2", juzWordTotals: FAKE_JUZ_WORD_TOTALS,
    });
    assert.deepEqual(secondMove, { attempted: true, changed: true });
    const totalsAfterSecondMove = await getWordTotals(p2, { tenantId: T, personId: "p2" });
    assert.equal(totalsAfterSecondMove.known, 2);
    assert.equal(totalsAfterSecondMove.byJuz["1"].known, 1);
    assert.equal(totalsAfterSecondMove.byJuz["2"].known, 1, "juz 2 must be untouched by a juz-1-only move");
    step("total: a second, independent move correctly increments (not overwrites) the existing document");

    console.log(`\n==== lemma-progress-real-function: ${n} assertions through the REAL functions against the REAL assembled DEPLOYMENT candidate ====`);
  } finally {
    await env.cleanup();
  }
});
