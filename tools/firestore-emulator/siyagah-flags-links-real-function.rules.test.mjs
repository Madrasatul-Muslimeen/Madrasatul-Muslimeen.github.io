// Siyagah round 14 (issue #566) -- the REAL flag and Note-link writers in
// app/js/note-foundation.js and app/js/journey-map-service.js, run against the
// REAL emulator on the round 14 Rules DEPLOYMENT CANDIDATE. Same loader as
// siyagah-tags-real-function.rules.test.mjs, unchanged. Notes are made and
// edited by the real createPermanentNote/updatePermanentNoteContent, so the
// flag path is proven against Notes with a real revision chain.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-siyagah-flags-links-real-function";
const HOST = "127.0.0.1";
const PORT = 8110;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const RULES_FILE = process.env.RULES_FILE || "docs/governance/2026-10-04-siyagah-round14-DEPLOYMENT-candidate.rules";
const candidate = fs.readFileSync(path.resolve(root, RULES_FILE), "utf8");
assert.match(PROJECT, /^demo-/);
assert.equal(HOST, "127.0.0.1");

const GSTATIC_FIRESTORE_IMPORT =
  /import\s*\{[\s\S]*?\}\s*from\s*"https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/;
const firestorePackageUrl = import.meta.resolve("firebase/firestore");
const toDataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const realFileUrl = (relativeToAppJs) => pathToFileURL(path.join(root, "app/js", relativeToAppJs)).href;

function rewriteGstaticImport(source, importLine, label) {
  assert.match(source, GSTATIC_FIRESTORE_IMPORT, `${label}: its gstatic Firestore import moved or was rewritten upstream -- update this loader`);
  return source.replace(GSTATIC_FIRESTORE_IMPORT, importLine);
}
function rewriteSpecifier(source, specifier, replacementUrl, label) {
  const pattern = new RegExp(`from "${specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g");
  assert.match(source, pattern, `${label}: its "${specifier}" specifier moved -- update this loader`);
  return source.replace(pattern, `from "${replacementUrl}"`);
}

let envelopeSource = fs.readFileSync(path.join(root, "app/js/envelope.js"), "utf8");
envelopeSource = rewriteGstaticImport(envelopeSource,
  `import { doc, setDoc, updateDoc, writeBatch, runTransaction, serverTimestamp } from "${firestorePackageUrl}";`, "envelope.js");
const envelopeDataUrl = toDataUrl(envelopeSource);

let noteFoundationSource = fs.readFileSync(path.join(root, "app/js/note-foundation.js"), "utf8");
noteFoundationSource = rewriteGstaticImport(noteFoundationSource,
  `import { collection, doc, documentId, getDoc, getDocs, limit, orderBy, query, startAfter, where } from "${firestorePackageUrl}";`, "note-foundation.js");
noteFoundationSource = rewriteSpecifier(noteFoundationSource, "./collections.js", realFileUrl("collections.js"), "note-foundation.js");
noteFoundationSource = rewriteSpecifier(noteFoundationSource, "./journey-map-contract.js", realFileUrl("journey-map-contract.js"), "note-foundation.js");
noteFoundationSource = rewriteSpecifier(noteFoundationSource, "./envelope.js", envelopeDataUrl, "note-foundation.js");
const noteFoundationDataUrl = toDataUrl(noteFoundationSource);

const nf = await import(noteFoundationDataUrl);
const { noteFoundationDocId, createPermanentNote, updatePermanentNoteContent, retirePermanentNote } = nf;
let journeyMapServiceSource = fs.readFileSync(path.join(root, "app/js/journey-map-service.js"), "utf8");
journeyMapServiceSource = rewriteSpecifier(journeyMapServiceSource, "./note-foundation.js", noteFoundationDataUrl, "journey-map-service.js");
journeyMapServiceSource = rewriteSpecifier(journeyMapServiceSource, "./journey-map-contract.js", realFileUrl("journey-map-contract.js"), "journey-map-service.js");
journeyMapServiceSource = rewriteSpecifier(journeyMapServiceSource, "./journey-map-shard.js", realFileUrl("journey-map-shard.js"), "journey-map-service.js");

const svc = await import(toDataUrl(journeyMapServiceSource));
const { setNoteFlags, linkNotes, unlinkNotes, relinkNotes, linksFromNote, linksToNote, loadAllOwnerNoteLinks } = svc;
assert.equal(noteFoundationDocId("tenant", "x"), "tenant__x", "the loader is broken");
for (const [name, fn] of Object.entries({ setNoteFlags, linkNotes, unlinkNotes, relinkNotes, linksFromNote, linksToNote, loadAllOwnerNoteLinks, createPermanentNote, updatePermanentNoteContent, retirePermanentNote })) {
  assert.equal(typeof fn, "function", `missing ${name} -- the loader is broken`);
}

const T = "t1";

test("real flag and Note-link writers against the round 14 candidate Rules", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate } });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: T, authUid: "uid-p1" });
      await setDoc(doc(db, "tenantPeople", "p2"), { tenantId: T, authUid: "uid-p2" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p1`), { roles: ["self"], personId: "p1" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p2`), { roles: ["self"], personId: "p2" });
    });
    const p1 = env.authenticatedContext("uid-p1").firestore();
    const p2 = env.authenticatedContext("uid-p2").firestore();
    const admin = async (c, id) => { let d; await env.withSecurityRulesDisabled(async (ctx) => { d = (await getDoc(doc(ctx.firestore(), c, `${T}__${id}`))).data(); }); return d; };
    const me = { tenantId: T, ownerPersonId: "p1", actorUid: "uid-p1" };
    let n = 0;
    const ok = async (id, name, p) => { await assertSucceeds(p); n++; console.log(`  PASS  ${id}  ${name}`); };
    const no = async (id, name, p, why) => { let err = null; try { await p; } catch (e) { err = e; } assert.ok(err, `${id} ${name}: expected a refusal`); if (why) assert.match(String(err.message), why, `${id} ${name}: refused for the wrong reason -- ${err.message}`); n++; console.log(`  PASS  ${id}  ${name}`); };
    const fact = (id, name, cond, detail = "") => { assert.ok(cond, `${id} ${name} ${detail}`); n++; console.log(`  PASS  ${id}  ${name}`); };

    const A = "notea000000000000000000000000001", B = "noteb000000000000000000000000001", C = "notec000000000000000000000000001";
    for (const id of [A, B, C]) await createPermanentNote(p1, { ...me, ownerUid: "uid-p1", noteId: id, title: id, bodyHtml: "<p>x</p>" });
    await updatePermanentNoteContent(p1, { tenantId: T, noteId: A, expectedRevisionId: (await admin("notes", A)).currentRevisionId, title: "A2", bodyHtml: "<p>y</p>", actorUid: "uid-p1" });
    const revA = (await admin("notes", A)).currentRevisionId;

    // --- flags -------------------------------------------------------------
    await ok("RF-01", "setNoteFlags pins a Note with a real revision chain", setNoteFlags(p1, { ...me, noteId: A, flags: { pinned: true } }));
    const a1 = await admin("notes", A);
    fact("RF-01b", "...pinned, and the revision pointer and title did not move", a1.pinned === true && a1.currentRevisionId === revA && a1.title === "A2");
    await ok("RF-02", "favourite and archive together", setNoteFlags(p1, { ...me, noteId: A, flags: { favourite: true, archived: true } }));
    await ok("RF-03", "clear them again", setNoteFlags(p1, { ...me, noteId: A, flags: { favourite: false, archived: false } }));
    await no("RF-04", "a non-boolean flag is refused before any write", setNoteFlags(p1, { ...me, noteId: A, flags: { pinned: "yes" } }), /true or false/);
    await no("RF-05", "an unknown flag is refused", setNoteFlags(p1, { ...me, noteId: A, flags: { starred: true } }), /Not a Note flag/);
    await no("RF-06", "another person cannot flag my Note (by the Rules: the client check is bypassed by claiming my ownerPersonId)",
      setNoteFlags(p2, { tenantId: T, ownerPersonId: "p1", actorUid: "uid-p2", noteId: A, flags: { pinned: false } }), /permission|PERMISSION|false for/);
    fact("RF-06b", "...still pinned", (await admin("notes", A)).pinned === true);

    await ok("RF-07", "finalise", setNoteFlags(p1, { ...me, noteId: B, flags: { finalised: true } }));
    const revB = (await admin("notes", B)).currentRevisionId;
    await no("RF-08", "a finalised Note's content edit is refused", updatePermanentNoteContent(p1, { tenantId: T, noteId: B, expectedRevisionId: revB, title: "edit", bodyHtml: "<p>e</p>", actorUid: "uid-p1" }), /finalised/);
    await no("RF-09", "...and it cannot go to Trash", retirePermanentNote(p1, { tenantId: T, noteId: B, expectedRevisionId: revB, actorUid: "uid-p1" }), /finalised/);
    await ok("RF-10", "un-finalise", setNoteFlags(p1, { ...me, noteId: B, flags: { finalised: false } }));
    await ok("RF-11", "...then the same edit is accepted by the Rules", updatePermanentNoteContent(p1, { tenantId: T, noteId: B, expectedRevisionId: revB, title: "edit", bodyHtml: "<p>e</p>", actorUid: "uid-p1" }));

    // --- links -------------------------------------------------------------
    let L;
    await ok("RL-01", "linkNotes A -> C", (async () => { L = await linkNotes(p1, { ...me, ownerUid: "uid-p1", fromNoteId: A, toNoteId: C }); })());
    const l1 = await admin("noteLinks", L);
    fact("RL-01b", "...active, from A to C", l1.status === "active" && l1.fromNoteId === A && l1.toNoteId === C);
    await ok("RL-02", "linking the same pair again is a no-op", linkNotes(p1, { ...me, ownerUid: "uid-p1", fromNoteId: A, toNoteId: C }));
    fact("RL-02b", "...still one link from A", (await linksFromNote(p1, { tenantId: T, ownerPersonId: "p1", fromNoteId: A })).length === 1);
    fact("RL-03", "C's backlinks name A", (await linksToNote(p1, { tenantId: T, ownerPersonId: "p1", toNoteId: C })).map((x) => x.fromNoteId).join() === A);
    await no("RL-04", "a Note cannot link to itself", linkNotes(p1, { ...me, ownerUid: "uid-p1", fromNoteId: A, toNoteId: A }), /itself/);
    await ok("RL-05", "unlinkNotes retires the link", unlinkNotes(p1, { ...me, linkId: L }));
    fact("RL-05b", "...retired, document kept", (await admin("noteLinks", L)).status === "retired");
    await ok("RL-06", "linking the pair again RESTORES the same link", linkNotes(p1, { ...me, ownerUid: "uid-p1", fromNoteId: A, toNoteId: C }));
    const rows = (await loadAllOwnerNoteLinks(p1, { tenantId: T, ownerPersonId: "p1", status: "active" })).rows;
    fact("RL-06b", "...same linkId, active, no second document", rows.length === 1 && rows[0].linkId === L, JSON.stringify(rows));
    await ok("RL-07", "unlink, then relinkNotes restores it", (async () => { await unlinkNotes(p1, { ...me, linkId: L }); await relinkNotes(p1, { ...me, linkId: L }); })());
    fact("RL-07b", "...active again", (await admin("noteLinks", L)).status === "active");

    await retirePermanentNote(p1, { tenantId: T, noteId: C, expectedRevisionId: (await admin("notes", C)).currentRevisionId, actorUid: "uid-p1" });
    await ok("RL-08", "a link whose end went to Trash can still be unlinked", unlinkNotes(p1, { ...me, linkId: L }));
    await no("RL-09", "...but not restored", relinkNotes(p1, { ...me, linkId: L }), /active/);
    await no("RL-10", "...and no new link to a Note in Trash", linkNotes(p1, { ...me, ownerUid: "uid-p1", fromNoteId: B, toNoteId: C }), /active/);
    await no("RL-11", "another person cannot link my Notes (by the Rules)",
      linkNotes(p2, { tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1", actorUid: "uid-p2", fromNoteId: A, toNoteId: B }), /permission|PERMISSION|false for/);
    await no("RL-12", "another person cannot retire my link (by the Rules)", unlinkNotes(p2, { tenantId: T, ownerPersonId: "p1", actorUid: "uid-p2", linkId: L }), /permission|PERMISSION|false for/);

    console.log(`\n==== Siyagah flags and links real-function: ${n} cases, all as expected ====`);
    assert.ok(n >= 25, `implausibly few cases: ${n}`);
  } finally { await env.cleanup(); }
});
