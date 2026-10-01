// Siyagah round 7b (issue #461) -- the REAL tag writers in app/js/note-foundation.js
// and app/js/journey-map-service.js, run against the REAL emulator on the round 7
// Rules DEPLOYMENT CANDIDATE (noteTags, noteTagLinks). Sibling of
// siyagah-sections-real-function.rules.test.mjs, same loader, unchanged.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-siyagah-tags-real-function";
const HOST = "127.0.0.1";
const PORT = 8108;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const RULES_FILE = process.env.RULES_FILE || "docs/governance/2026-10-01-siyagah-round7-DEPLOYMENT-candidate.rules";
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

const { noteFoundationDocId } = await import(noteFoundationDataUrl);
let journeyMapServiceSource = fs.readFileSync(path.join(root, "app/js/journey-map-service.js"), "utf8");
journeyMapServiceSource = rewriteSpecifier(journeyMapServiceSource, "./note-foundation.js", noteFoundationDataUrl, "journey-map-service.js");
journeyMapServiceSource = rewriteSpecifier(journeyMapServiceSource, "./journey-map-contract.js", realFileUrl("journey-map-contract.js"), "journey-map-service.js");
journeyMapServiceSource = rewriteSpecifier(journeyMapServiceSource, "./journey-map-shard.js", realFileUrl("journey-map-shard.js"), "journey-map-service.js");

const svc = await import(toDataUrl(journeyMapServiceSource));
const { createTag, renameTag, setTagLook, trashTag, restoreTag, tagNote, untagNote, loadAllOwnerTags, loadAllOwnerTagLinks } = svc;
assert.equal(noteFoundationDocId("tenant", "x"), "tenant__x", "the loader is broken");
for (const [name, fn] of Object.entries({ createTag, renameTag, setTagLook, trashTag, restoreTag, tagNote, untagNote, loadAllOwnerTags, loadAllOwnerTagLinks })) {
  assert.equal(typeof fn, "function", `journey-map-service.js is missing ${name} -- the loader is broken`);
}

const T = "t1";
const nk = (t, id) => `${t}__${id}`;

test("real tag writers against the round 7 candidate Rules", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate } });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: T, authUid: "uid-p1" });
      await setDoc(doc(db, "tenantPeople", "p2"), { tenantId: T, authUid: "uid-p2" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p1`), { roles: ["self"], personId: "p1" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p2`), { roles: ["self"], personId: "p2" });
      await setDoc(doc(db, "notes", nk(T, "n1")), { noteId: "n1", tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1", status: "active" });
      await setDoc(doc(db, "notes", nk(T, "n2")), { noteId: "n2", tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1", status: "active" });
    });
    const p1 = env.authenticatedContext("uid-p1").firestore();
    const p2 = env.authenticatedContext("uid-p2").firestore();
    const admin = async (c, id) => { let d; await env.withSecurityRulesDisabled(async (ctx) => { d = (await getDoc(doc(ctx.firestore(), c, nk(T, id)))).data(); }); return d; };
    const me = { tenantId: T, ownerPersonId: "p1", actorUid: "uid-p1" };
    let n = 0;
    const ok = async (id, name, p) => { await assertSucceeds(p); n++; console.log(`  PASS  ${id}  ${name}`); };
    const no = async (id, name, p) => { let err = null; try { await p; } catch (e) { err = e; } assert.ok(err, `${id} ${name}: expected a refusal`); n++; console.log(`  PASS  ${id}  ${name}`); };
    const fact = (id, name, cond, detail = "") => { assert.ok(cond, `${id} ${name} ${detail}`); n++; console.log(`  PASS  ${id}  ${name}`); };

    let G;
    await ok("RT-01", "createTag writes a tag the Rules accept", (async () => { G = await createTag(p1, { ...me, ownerUid: "uid-p1", name: "Prayer" }); })());
    fact("RT-01b", "...stored active, with no colour", (await admin("noteTags", G)).status === "active" && !("color" in (await admin("noteTags", G))));
    await no("RT-02", "a duplicate name (any case) is refused client-side before any write", createTag(p1, { ...me, ownerUid: "uid-p1", name: " prayer " }));
    let H;
    await ok("RT-03", "createTag with a colour", (async () => { H = await createTag(p1, { ...me, ownerUid: "uid-p1", name: "Fasting", color: "#2E8B57" }); })());
    await ok("RT-04", "renameTag", renameTag(p1, { ...me, tagId: G, name: "Salah" }));
    await ok("RT-05", "setTagLook", setTagLook(p1, { ...me, tagId: G, color: "#C0392B" }));
    await ok("RT-05b", "setTagLook back to None", setTagLook(p1, { ...me, tagId: G, color: null }));

    let L;
    await ok("RT-06", "tagNote creates a link the Rules accept", (async () => { L = await tagNote(p1, { ...me, ownerUid: "uid-p1", noteId: "n1", tagId: G }); })());
    fact("RT-06b", "...active, pointing at the Note and the tag", (await admin("noteTagLinks", L)).status === "active" && (await admin("noteTagLinks", L)).noteId === "n1" && (await admin("noteTagLinks", L)).tagId === G);
    await ok("RT-07", "tagging the same Note+tag again is a no-op, not a second link", tagNote(p1, { ...me, ownerUid: "uid-p1", noteId: "n1", tagId: G }));
    fact("RT-07b", "...still exactly one link", (await loadAllOwnerTagLinks(p1, { tenantId: T, ownerPersonId: "p1", status: "active" })).rows.length === 1);
    await ok("RT-08", "untagNote retires the link", untagNote(p1, { ...me, noteId: "n1", tagId: G }));
    fact("RT-08b", "...retired, document kept", (await admin("noteTagLinks", L)).status === "retired");
    await ok("RT-09", "tagNote again RESTORES the same link", tagNote(p1, { ...me, ownerUid: "uid-p1", noteId: "n1", tagId: G }));
    const all = [...(await loadAllOwnerTagLinks(p1, { tenantId: T, ownerPersonId: "p1", status: "active" })).rows, ...(await loadAllOwnerTagLinks(p1, { tenantId: T, ownerPersonId: "p1", status: "retired" })).rows];
    fact("RT-09b", "...same linkId, active, and no second document", all.length === 1 && all[0].linkId === L && all[0].status === "active", JSON.stringify(all));
    fact("RT-09c", "...the Note document was never touched by tagging", JSON.stringify(await admin("notes", "n1")) === JSON.stringify({ noteId: "n1", tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1", status: "active" }));

    await ok("RT-10", "trashTag retires the tag", trashTag(p1, { ...me, tagId: G }));
    fact("RT-10b", "...its link is left exactly as it was (still active)", (await admin("noteTagLinks", L)).status === "active");
    await no("RT-11", "a Note cannot be newly tagged with a retired tag", tagNote(p1, { ...me, ownerUid: "uid-p1", noteId: "n2", tagId: G }));
    await ok("RT-12", "restoreTag", restoreTag(p1, { ...me, tagId: G }));
    const act = (await loadAllOwnerTags(p1, { tenantId: T, ownerPersonId: "p1", status: "active" })).rows;
    fact("RT-12b", "...both tags read back, active", act.length === 2, JSON.stringify(act.map((x) => x.name)));

    await no("RT-13", "another person cannot tag my Note", tagNote(p2, { tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p2", actorUid: "uid-p2", noteId: "n2", tagId: G }));
    await no("RT-14", "another person cannot rename my tag", renameTag(p2, { tenantId: T, ownerPersonId: "p1", actorUid: "uid-p2", tagId: G, name: "Mine now" }));
    await no("RT-15", "another person cannot create a tag as me", createTag(p2, { tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p2", actorUid: "uid-p2", name: "Sneaky" }));
    fact("RT-15b", "...nothing of theirs exists", (await admin("noteTags", G)).name === "Salah");

    console.log(`\n==== Siyagah tags real-function: ${n} cases, all as expected ====`);
    assert.ok(n >= 20, `implausibly few cases: ${n}`);
  } finally { await env.cleanup(); }
});
