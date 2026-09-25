// Issue #265 -- the WordPress-import Rules candidate
// (docs/governance/2026-09-25-wordpress-import-rules-candidate.rules),
// executed against the Firestore emulator. Isolated: a demo- project id,
// never a production endpoint.
//
// THIS SUITE TESTS THE ASSEMBLED RESULT, NOT THE EXTRACT, the same technique
// tools/firestore-emulator/d14-timezone.rules.test.mjs already uses: the
// candidate's `notes`/`noteFolders` blocks call helpers (canReadNoteOf,
// isNoteOwner, personInTenant, myUid, ...) that live in the shared block
// above both matches in production and not in the extract, so testing the
// extract alone would prove only that it parses. What is tested here is the
// ruleset ACTIVATION WOULD PRODUCE: `firestore.rules` with its `notes` and
// `noteFolders` blocks replaced by the candidate's. The substitution is
// asserted twice (once per block), so a silent failure to substitute cannot
// leave this suite quietly testing the deployed rules instead.
//
// Run by the Architect on 25 Sep 2026 against the emulator: 16 passed, 0
// failed. The original IMPORT-07 (a bare update adding originalCreatedAt)
// was a wrong assertion -- every Note update must commit a revision -- and
// was replaced by IMPORT-07a..d; IMPORT-12/13 were added for folders. The
// freeze was proven by removing it (07b, 07c, 07d then fail).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc, writeBatch } from "firebase/firestore";

const PROJECT = "demo-quranrevival-wordpress-import";
const HOST = "127.0.0.1";
const PORT = 8098;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");

const deployed = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const candidate = fs.readFileSync(
  path.join(root, "docs/governance/2026-09-25-wordpress-import-rules-candidate.rules"), "utf8");

/**
 * One `match /<name>/{docKey} { … }` block, braces balanced, from `text`.
 *
 * `match /notes/{noteKey} {` carries TWO `{`s on one line -- the path
 * parameter's own brace, then the block's real opening brace -- so the
 * block's start is the LAST `{` before the line's first newline, the same
 * technique tools/firestore-emulator/d14-timezone.rules.test.mjs already
 * uses for `match /tenantPeople/{personId} {`.
 */
function matchBlock(text, name) {
  const start = text.indexOf(`match /${name}/`);
  assert.notEqual(start, -1, `no ${name} block found`);
  const lineEnd = text.indexOf("\n", start);
  const open = text.lastIndexOf("{", lineEnd === -1 ? text.length : lineEnd);
  assert.ok(open >= start, `no block-opening brace found for ${name}`);
  let depth = 0, i = open;
  for (; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error(`unterminated ${name} block`);
}

const deployedNotes = matchBlock(deployed, "notes");
const candidateNotes = matchBlock(candidate, "notes");
const deployedFolders = matchBlock(deployed, "noteFolders");
const candidateFolders = matchBlock(candidate, "noteFolders");
assert.ok(deployedNotes.length > 400 && candidateNotes.length > 400, "a notes block parsed implausibly short");
assert.ok(deployedFolders.length > 400 && candidateFolders.length > 400, "a noteFolders block parsed implausibly short");
// Updated in place 25 Sep 2026 (Architect): the Owner PUBLISHED these rules
// and firestore.rules was synced to them, so "the deployed blocks do not yet
// mention the new helpers" became false for a correct reason. The suite's
// real concern -- that it tests the candidate and not something else -- now
// reads: either the live blocks predate the candidate (the old case), or they
// ARE the candidate, byte for byte.
const alreadyLive = deployedNotes.includes("importFieldsWellFormed") || deployedFolders.includes("folderImportFieldsWellFormed");
if (alreadyLive) {
  assert.equal(deployedNotes, candidateNotes, "the live notes block mentions the import helpers but is not the candidate's block");
  assert.equal(deployedFolders, candidateFolders, "the live noteFolders block mentions the import helper but is not the candidate's block");
}
assert.ok(candidateNotes.includes("importFieldsWellFormed"), "the candidate notes block does not mention importFieldsWellFormed");
assert.ok(candidateFolders.includes("folderImportFieldsWellFormed"), "the candidate noteFolders block does not mention folderImportFieldsWellFormed");

let assembled = deployed.replace(deployedNotes, candidateNotes);
if (!alreadyLive) assert.notEqual(assembled, deployed, "the notes substitution did nothing -- this suite would be testing the deployed rules");
assembled = assembled.replace(deployedFolders, candidateFolders);
assert.ok(assembled.includes("importFieldsWellFormed") && assembled.includes("folderImportFieldsWellFormed"),
  "the assembled ruleset lost one of the new helpers");
// The rest of the file must be untouched: activation changes exactly these two blocks.
assert.equal(
  assembled.replace(candidateNotes, "<<NOTES>>").replace(candidateFolders, "<<FOLDERS>>"),
  deployed.replace(deployedNotes, "<<NOTES>>").replace(deployedFolders, "<<FOLDERS>>"),
  "the assembled ruleset differs from the deployed one somewhere other than the notes/noteFolders blocks");

const T = "t1";
const env0 = { schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-self" };
const tenantPerson = (personId, o = {}) => ({
  tenantId: T, authUid: personId === "pSelf" ? "uid-self" : "uid-other",
  isMinor: false, name: "Person", roles: ["owner"], managedByPersonId: null, ...env0, ...o,
});

let passed = 0, failed = 0;
async function ok(label, p) {
  try { await p; passed++; console.log(`  PASS  ${label}`); }
  catch (e) { failed++; console.log(`  FAIL  ${label} — expected ALLOW, got: ${e.code || e.message}`); }
}
async function no(label, p) {
  try { await p; failed++; console.log(`  FAIL  ${label} — expected DENY, it was ALLOWED`); }
  catch (e) {
    if (!/permission|PERMISSION_DENIED/i.test(e.code || e.message)) {
      failed++; console.log(`  FAIL  ${label} — denied for the WRONG reason: ${e.code || e.message}`);
    } else { passed++; console.log(`  PASS  ${label}`); }
  }
}

test("WordPress import candidate: notes and noteFolders optional fields", async () => {
  const env = await initializeTestEnvironment({
    projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: assembled },
  });
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantPeople", "pSelf"), tenantPerson("pSelf"));
      await setDoc(doc(db, "tenantPeople", "pOther"), tenantPerson("pOther"));
    });

    const selfDb = env.authenticatedContext("uid-self").firestore();
    const otherDb = env.authenticatedContext("uid-other").firestore();

    const noteBase = (noteId, revisionId, extra = {}) => ({
      note: {
        noteId, tenantId: T, ownerPersonId: "pSelf", ownerUid: "uid-self", visibility: "private",
        title: "Imported title", bodyHtml: "<p>Body</p>", status: "active", currentRevisionId: revisionId,
        schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-self", ...extra,
      },
      revision: {
        revisionId, noteId, tenantId: T, ownerPersonId: "pSelf", ownerUid: "uid-self",
        previousRevisionId: null, title: "Imported title", bodyHtml: "<p>Body</p>",
        revisionReason: "created", actorUid: "uid-self",
        schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-self",
      },
    });

    async function createNoteAndRevision(clientDb, noteId, revisionId, extra) {
      const { note, revision } = noteBase(noteId, revisionId, extra);
      const batch = writeBatch(clientDb);
      batch.set(doc(clientDb, "notes", `${T}__${noteId}`), note);
      batch.set(doc(clientDb, "noteRevisions", `${T}__${revisionId}`), revision);
      return batch.commit();
    }

    await ok("IMPORT-01 create with no import fields -- baseline unaffected",
      createNoteAndRevision(selfDb, "note-baseline", "rev-baseline"));

    await ok("IMPORT-02 create with a real originalCreatedAt Timestamp and a real importSource map -- owner",
      createNoteAndRevision(selfDb, "note-imported", "rev-imported", {
        originalCreatedAt: new Date("2018-01-05T09:00:00Z"),
        originalModifiedAt: new Date("2018-01-06T10:00:00Z"),
        importSource: { system: "wordpress", site: "mappingmyjourney.com", postId: "101", status: "publish", link: "", imageUrls: [], hadithRef: null },
      }));

    await no("IMPORT-03 create with originalCreatedAt as a STRING is refused",
      createNoteAndRevision(selfDb, "note-bad-date", "rev-bad-date", { originalCreatedAt: "2018-01-05" }));

    await no("IMPORT-04 create with importSource as a STRING is refused",
      createNoteAndRevision(selfDb, "note-bad-source", "rev-bad-source", { importSource: "wordpress" }));

    await no("IMPORT-05 create with a field outside the accepted shape is still refused",
      createNoteAndRevision(selfDb, "note-bad-field", "rev-bad-field", { bogusField: "x" }));

    await no("IMPORT-06 a DIFFERENT person cannot create a Note claiming pSelf as owner (owner-only unaffected)",
      createNoteAndRevision(otherDb, "note-other", "rev-other", {}));

    // Architect review: IMPORT-07 originally asserted that a bare update
    // could ADD originalCreatedAt to an existing Note. The deployed rules
    // refuse every Note update that does not commit a new revision, and the
    // import fields are origin facts frozen after create -- so the correct
    // assertions are the three below.
    async function reviseNote(noteId, fromRev, toRev, noteChanges) {
      const batch = writeBatch(selfDb);
      batch.set(doc(selfDb, "noteRevisions", `${T}__${toRev}`), {
        revisionId: toRev, noteId, tenantId: T, ownerPersonId: "pSelf", ownerUid: "uid-self",
        previousRevisionId: fromRev, title: "Revised", bodyHtml: "<p>Revised</p>",
        revisionReason: "edited", actorUid: "uid-self",
        schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-self",
      });
      batch.update(doc(selfDb, "notes", `${T}__${noteId}`), {
        title: "Revised", bodyHtml: "<p>Revised</p>", currentRevisionId: toRev, updatedAt: new Date(), ...noteChanges,
      });
      return batch.commit();
    }

    await ok("IMPORT-07a an imported Note can be revised with its original date left as it is",
      reviseNote("note-imported", "rev-imported", "rev-imported-2", {}));

    await no("IMPORT-07b a revision may NOT change an imported Note's originalCreatedAt",
      reviseNote("note-imported", "rev-imported-2", "rev-imported-3", { originalCreatedAt: new Date("2020-01-01T00:00:00Z") }));

    await no("IMPORT-07c a revision may NOT add an original date to a Note this app wrote",
      reviseNote("note-baseline", "rev-baseline", "rev-baseline-2", { originalCreatedAt: new Date("2018-01-05T09:00:00Z") }));

    await no("IMPORT-07d a revision may NOT remove an imported Note's importSource",
      (async () => {
        // Its own Note, so the revision chain is valid whatever 07b did.
        await createNoteAndRevision(selfDb, "note-imported-d", "rev-imported-d", {
          originalCreatedAt: new Date("2018-01-05T09:00:00Z"), importSource: { system: "wordpress", postId: "102" } });
        const { deleteField } = await import("firebase/firestore");
        return reviseNote("note-imported-d", "rev-imported-d", "rev-imported-d2", { importSource: deleteField() }); })());

    const folderBase = (folderId, extra = {}) => ({
      folderId, tenantId: T, ownerPersonId: "pSelf", ownerUid: "uid-self", name: "Imported Folder",
      parentFolderId: null, semanticRole: "user", order: 0, status: "active",
      schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-self", ...extra,
    });

    await ok("IMPORT-08 folder create with no importSource -- baseline unaffected",
      setDoc(doc(selfDb, "noteFolders", `${T}__folder-baseline`), folderBase("folder-baseline")));

    await ok("IMPORT-09 folder create with a real importSource map -- owner",
      setDoc(doc(selfDb, "noteFolders", `${T}__folder-imported`), folderBase("folder-imported", {
        importSource: { system: "wordpress", termId: "10", niceName: "quran-study" },
      })));

    await no("IMPORT-10 folder create with importSource as a STRING is refused",
      setDoc(doc(selfDb, "noteFolders", `${T}__folder-bad-source`), folderBase("folder-bad-source", {
        importSource: "wordpress",
      })));

    await no("IMPORT-12 a folder update may NOT change its importSource",
      updateDoc(doc(selfDb, "noteFolders", `${T}__folder-imported`), { importSource: { system: "other" }, updatedAt: new Date() }));

    await ok("IMPORT-13 an imported folder can still be renamed",
      updateDoc(doc(selfDb, "noteFolders", `${T}__folder-imported`), { name: "Renamed", updatedAt: new Date() }));

    await no("IMPORT-11 a DIFFERENT person cannot create a folder claiming pSelf as owner (owner-only unaffected)",
      setDoc(doc(otherDb, "noteFolders", `${T}__folder-other`), folderBase("folder-other")));
  } finally {
    await env.cleanup();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
});
