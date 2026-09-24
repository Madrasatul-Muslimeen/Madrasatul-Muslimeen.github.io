// MAP Phase 5 -- proves the REAL app/js/note-foundation.js write functions
// against the REAL emulator running the REAL candidate Rules, in one suite.
//
// Neither existing suite does this on its own:
//   - tools/i18n-verify/note-foundation-data-layer.mjs calls the real
//     functions, but rewrites their Firestore import to an in-memory fake
//     with no Rules evaluator behind it. It proves the write SHAPE, nothing
//     about authorisation.
//   - note-foundation-v1.rules.test.mjs runs the real emulator against the
//     real candidate Rules, but every case hand-authors the write with
//     setDoc/writeBatch -- none of it calls a function from
//     app/js/note-foundation.js or app/js/envelope.js.
//
// The comment directly above retirePermanentNote() in app/js/note-foundation.js
// records the risk that gap leaves open: a real mismatch between what that
// function wrote and what the Rules required was found and fixed once
// already, by reading both sides by eye. No suite caught it. This file is
// additive -- note-foundation-v1.rules.test.mjs is untouched, and this suite
// changes no application behaviour and needs no version number.
//
// Isolated: never loads firestore.rules, never touches a production endpoint
// or project id (SAFE-01, asserted below).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-note-foundation-real-function";
const HOST = "127.0.0.1";
const PORT = 8089;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const EXTRACT = "docs/governance/phase5-note-foundation-rules-candidate-2026-09-15.rules";
const RULES_FILE = process.env.RULES_FILE || EXTRACT;
const candidate = fs.readFileSync(path.resolve(root, RULES_FILE), "utf8");

// SAFE-01: never a production project or a non-emulator host.
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");
assert.equal(HOST, "127.0.0.1");

// ---------------------------------------------------------------------------
// Load the REAL app/js/envelope.js and app/js/note-foundation.js as `data:`
// URL modules, using the same read-source / regex-replace / data: technique
// note-foundation-data-layer.mjs already uses. The difference is where the
// rewritten Firestore import points: to the real `firebase/firestore` package
// this workspace already depends on, never to an in-memory fake. Everything
// else about each module -- same source, same functions, same behaviour --
// is untouched.
//
// A `data:` module has no base URL, so it cannot resolve ANY relative or bare
// specifier on its own (proven while building this suite: a bare
// "firebase/firestore" import from a data: URL throws "Invalid relative URL
// or base scheme is not hierarchical"). Every specifier a loaded module
// carries is rewritten to something absolute before it is imported:
//   - the gstatic Firestore import -> the real `firebase/firestore` package,
//     resolved from THIS file's own location (a real file, so ordinary
//     node_modules resolution applies) via import.meta.resolve(), then
//     handed in as an absolute URL string.
//   - "./envelope.js" (inside note-foundation.js) -> the data: URL built for
//     envelope.js below.
//   - "./collections.js" and "./journey-map-contract.js" -> resolved with
//     pathToFileURL() to the real files. Both are pure (no imports of their
//     own, confirmed by reading them), so neither needs rewriting itself --
//     the same treatment note-foundation-data-layer.mjs already gives
//     journey-map-contract.js.
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

let noteFoundationSource = fs.readFileSync(path.join(root, "app/js/note-foundation.js"), "utf8");
noteFoundationSource = rewriteGstaticImport(noteFoundationSource,
  `import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "${firestorePackageUrl}";`,
  "note-foundation.js");
noteFoundationSource = rewriteSpecifier(noteFoundationSource, "./collections.js", realFileUrl("collections.js"), "note-foundation.js");
noteFoundationSource = rewriteSpecifier(noteFoundationSource, "./journey-map-contract.js", realFileUrl("journey-map-contract.js"), "note-foundation.js");
noteFoundationSource = rewriteSpecifier(noteFoundationSource, "./envelope.js", envelopeDataUrl, "note-foundation.js");

const { createPermanentNote, updatePermanentNoteContent, retirePermanentNote, noteFoundationDocId } =
  await import(toDataUrl(noteFoundationSource));

// A cheap positive control: the loader really did load the real module, not
// an accidental no-op. noteFoundationDocId() is pure and needs no Firestore.
assert.equal(noteFoundationDocId("tenant", "note"), "tenant__note",
  "the loaded module does not behave like the real note-foundation.js -- the loader is broken");

const T = "t1", T2 = "t2";
const NOTE = "rfnote0000000000000000000000001";
const SRC = "rfsrc00000000000000000000000001";
const REV1 = "rfrev00000000000000000000000001";
const REV2 = "rfrev00000000000000000000000002";
const REV3_STALE_ATTEMPT = "rfrev00000000000000000000000003";
const nk = (tenantId, entityId) => `${tenantId}__${entityId}`;

test("real note-foundation.js functions against the real candidate Rules", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate } });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: T, authUid: "uid-p1" });
      await setDoc(doc(db, "tenantPeople", "pX"), { tenantId: T2, authUid: "uid-pX" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p1`), { roles: ["self"], personId: "p1" });
      await setDoc(doc(db, "tenantMemberUids", `${T2}__uid-pX`), { roles: ["self"], personId: "pX" });
    });

    const p1 = env.authenticatedContext("uid-p1").firestore();
    const pX = env.authenticatedContext("uid-pX").firestore();

    let n = 0;
    const seen = new Set(["SAFE-01"]);
    const ok = async (id, name, p) => { await assertSucceeds(p); n++; seen.add(id); console.log(`  PASS  ${id}  ${name}`); };
    const no = async (id, name, p) => {
      let err = null;
      try { await p; } catch (e) { err = e; }
      assert.ok(err, `${id} ${name}: expected a denial, but the call succeeded`);
      const msg = String(err.message ?? err);
      assert.ok(!/maximum of 1000 expressions/.test(msg),
        `${id} ${name}: denied by EXPRESSION BUDGET, not by the security logic`);
      const entries = msg.match(/evaluation error at L\d+:\d+|false for '\w+'/g) ?? [];
      assert.ok(entries.length === 0 || /^false for '\w+'/.test(entries.at(-1)),
        `${id} ${name}: the deciding evaluation was not a clean false -- ${entries.at(-1)}`);
      n++; seen.add(id); console.log(`  PASS  ${id}  ${name}`);
    };

    // --- 1. createPermanentNote() succeeds for the owner (mirrors SELF-02) -
    // Includes the `source` branch: a Note born already bound to a Study Unit.
    const createPromise = createPermanentNote(p1, {
      tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
      title: "Real function title", bodyHtml: "<p>Real function body</p>",
      noteId: NOTE, revisionId: REV1, actorUid: "uid-p1",
      source: { sourceLinkId: SRC, sourceKind: "quran-unit", sourceKey: "ayah:2:255", relationshipKind: "origin", provenanceKind: "study-note" },
    });
    await ok("SELF-02-REAL", "createPermanentNote() succeeds for the owner, source included", createPromise);
    const created = await createPromise;
    assert.deepEqual(created, { noteId: NOTE, revisionId: REV1, noteDocId: nk(T, NOTE), revisionDocId: nk(T, REV1) });

    // The resulting noteSources document really persists and reads back --
    // not merely "the write call did not throw".
    const sourceSnap = await getDoc(doc(p1, "noteSources", nk(T, SRC)));
    assert.ok(sourceSnap.exists(), "the noteSources document created alongside the Note did not persist");
    assert.equal(sourceSnap.data().sourceKey, "ayah:2:255");
    assert.equal(sourceSnap.data().noteId, NOTE);
    assert.equal(sourceSnap.data().status, "active");

    const noteSnapAfterCreate = await getDoc(doc(p1, "notes", nk(T, NOTE)));
    assert.ok(noteSnapAfterCreate.exists());
    assert.equal(noteSnapAfterCreate.data().currentRevisionId, REV1);
    assert.equal(noteSnapAfterCreate.data().status, "active");

    // --- 2a. updatePermanentNoteContent() succeeds for the owner on a fresh
    // revision -------------------------------------------------------------
    const updatePromise = updatePermanentNoteContent(p1, {
      tenantId: T, noteId: NOTE, expectedRevisionId: REV1, revisionId: REV2,
      title: "Revised title", bodyHtml: "<p>Revised body</p>", actorUid: "uid-p1",
    });
    await ok("SELF-03-REAL", "updatePermanentNoteContent() succeeds for the owner on a fresh revision", updatePromise);
    assert.equal(await updatePromise, REV2);

    const noteSnapAfterUpdate = await getDoc(doc(p1, "notes", nk(T, NOTE)));
    assert.equal(noteSnapAfterUpdate.data().currentRevisionId, REV2);
    assert.equal(noteSnapAfterUpdate.data().title, "Revised title");

    // --- 2b. updatePermanentNoteContent() is refused with a stale
    // expectedRevisionId (mirrors TXN-03) -----------------------------------
    // NOTE ON WHAT THIS ACTUALLY PROVES: unlike TXN-03's hand-authored write
    // (which bypasses the function entirely and so is refused by the Rules'
    // own committedRevisionMatches() check), updatePermanentNoteContent()
    // re-reads the Note's live currentRevisionId inside its own transaction
    // BEFORE attempting any write, and throws "Stale Note revision." itself
    // the moment that disagrees with the caller's expectedRevisionId -- the
    // exact same invariant the Rules also enforce, checked one layer
    // earlier. So this call is refused by the FUNCTION's own optimistic-
    // concurrency guard, never by a Firestore permission-denied -- there is
    // no way to reach the Rules' committedRevisionMatches() check through
    // this function with a genuinely stale pointer, because the function
    // never attempts the write. What this case proves is still real: a stale
    // caller is refused end-to-end, through the real function, with nothing
    // written -- asserted below by re-reading the Note and confirming it is
    // still exactly where the successful update above left it.
    await no("TXN-03-REAL", "updatePermanentNoteContent() is refused with a stale expectedRevisionId", updatePermanentNoteContent(p1, {
      tenantId: T, noteId: NOTE, expectedRevisionId: REV1, revisionId: REV3_STALE_ATTEMPT,
      title: "Should never land", bodyHtml: "Should never land", actorUid: "uid-p1",
    }));
    const noteSnapAfterStaleAttempt = await getDoc(doc(p1, "notes", nk(T, NOTE)));
    assert.equal(noteSnapAfterStaleAttempt.data().currentRevisionId, REV2,
      "a refused stale update must leave the Note exactly where it was");
    assert.equal(noteSnapAfterStaleAttempt.data().title, "Revised title");
    // Read with rules DISABLED: the deployed `allow get` evaluates
    // `resource.data.*`, so a client get of a revision that does not exist is
    // an evaluation error, not an empty snapshot -- the very defect v08.56
    // removed from the data layer. Asking as an admin is what can answer
    // "was nothing written?".
    let staleExists = null;
    await env.withSecurityRulesDisabled(async (ctx) => {
      staleExists = (await getDoc(doc(ctx.firestore(), "noteRevisions", nk(T, REV3_STALE_ATTEMPT)))).exists();
    });
    assert.equal(staleExists, false, "a refused stale update must not have written its revision either");

    // --- 3. retirePermanentNote() succeeds for the owner (mirrors IMM-03b) -
    // This is the exact case the comment above retirePermanentNote() in
    // app/js/note-foundation.js names: retiring must commit a REAL revision
    // that chains from the one being left behind, or the Rules'
    // committedRevisionMatches() refuses it. Proving that against the fake
    // Firestore in note-foundation-data-layer.mjs can only prove the SHAPE of
    // what was written; this is what proves the real Rules actually accept
    // it.
    const retirePromise = retirePermanentNote(p1, { tenantId: T, noteId: NOTE, expectedRevisionId: REV2, actorUid: "uid-p1" });
    await ok("IMM-03b-REAL", "retirePermanentNote() succeeds for the owner", retirePromise);
    const retiredRevisionId = await retirePromise;
    assert.notEqual(retiredRevisionId, REV2, "retiring must mint a fresh revision id, never reuse the one it retired from");

    const noteSnapAfterRetire = await getDoc(doc(p1, "notes", nk(T, NOTE)));
    assert.equal(noteSnapAfterRetire.data().status, "retired");
    assert.equal(noteSnapAfterRetire.data().currentRevisionId, retiredRevisionId);
    const retireRevisionSnap = await getDoc(doc(p1, "noteRevisions", nk(T, retiredRevisionId)));
    assert.ok(retireRevisionSnap.exists());
    assert.equal(retireRevisionSnap.data().previousRevisionId, REV2,
      "the retirement revision must chain from the revision being left behind, or committedRevisionMatches() would have refused it");
    assert.equal(retireRevisionSnap.data().revisionReason, "retired");

    // --- 4. A cross-tenant createPermanentNote() is refused (mirrors
    // ISO-04) ----------------------------------------------------------------
    // pX is seeded only in tenant T2 (above). Calling the real function as pX
    // but naming tenant T is refused by the Rules' own personInTenant() check
    // -- createPermanentNote()'s own JS-level validation (ownership()) checks
    // only that the ids are non-empty path-safe strings, never tenant
    // membership, so this denial can only come from the Rules layer.
    const crossTenantNoteId = "rfnote0000000000000000000000002";
    const crossTenantRevId = "rfrev00000000000000000000000009";
    await no("ISO-04-REAL", "a cross-tenant createPermanentNote() is refused", createPermanentNote(pX, {
      tenantId: T, ownerPersonId: "pX", ownerUid: "uid-pX",
      title: "Should be refused", bodyHtml: "Should be refused",
      noteId: crossTenantNoteId, revisionId: crossTenantRevId, actorUid: "uid-pX",
    }));
    // Read with rules disabled -- p1 has no read authority over a document
    // owned by pX, and that would-be denial must not be mistaken for "the
    // create was refused", which is the thing actually under test here.
    await env.withSecurityRulesDisabled(async (ctx) => {
      const crossTenantSnap = await getDoc(doc(ctx.firestore(), "notes", nk(T, crossTenantNoteId)));
      assert.ok(!crossTenantSnap.exists(), "a refused cross-tenant create must not have written the Note");
    });

    console.log(`\n==== note-foundation-real-function: ${n} assertions through the REAL functions against the REAL candidate Rules ====`);
  } finally {
    await env.cleanup();
  }
});
