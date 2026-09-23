// Issue #107 follow-up to PR #104 — a REAL emulator-backed proof that the
// real `retirePermanentNote()` (app/js/note-foundation.js) behaves correctly
// against the real Phase 5 Note Foundation Rules CANDIDATE
// (docs/governance/phase5-note-foundation-rules-candidate-2026-09-15.rules),
// closing the equivalence gap PR #104's own report named in its §7: the
// pre-existing emulator suite (tools/firestore-emulator/note-foundation-v1.
// rules.test.mjs, protected, read-only) proves the Rules text is correct
// against a HAND-AUTHORED write (its own IMM-03b case); it never calls the
// real function. The pure-function suite (note-foundation-data-layer.mjs)
// proves the real function's write SHAPE is correct against a Firebase-free
// stub; it never touches the Rules. Neither, alone or together, proves the
// real function survives a real evaluation of the real Rules text. This file
// does, by loading the real app source (unmodified, read from disk) with
// only its Firestore import specifier rewritten to point at the real
// `firebase/firestore` SDK bound to a live Firestore emulator instance —
// the same "rewrite the import, run the real function" technique
// note-foundation-data-layer.mjs already uses, with the stub swapped for the
// real SDK instead of an in-memory fake.
//
// NOTHING under tools/firestore-emulator/ or tests/firestore/ is modified.
// This file lives in tools/i18n-verify/ and only READS those directories'
// existing, tracked files (the Rules candidate extract and, for context, the
// existing suite's own fixture shapes) plus app/js/note-foundation.js,
// app/js/envelope.js, app/js/collections.js and app/js/journey-map-contract.js
// (all read, none edited). No `tools/firestore-emulator/node_modules`
// package is required or installed by this file directly at import time —
// it is REQUIRED via Node's CJS resolver rooted at that directory
// (see `emulatorRequire` below), so this file has no direct npm dependency
// of its own and needs no package.json changes anywhere.
//
// HOW TO RUN (the Firestore emulator must be started by the SAME command,
// via the existing, unmodified `tools/firestore-emulator/note-foundation-v1.
// firebase.json` config — this file does not start the emulator itself):
//
//   cd tools/firestore-emulator && npm ci   # once, materialises node_modules
//   cd tools/firestore-emulator && npx firebase emulators:exec \
//     --only firestore \
//     --project demo-quranrevival-note-foundation-retire-proof \
//     --config note-foundation-v1.firebase.json \
//     "node --test ../i18n-verify/note-foundation-retire-emulator-proof.mjs"
//
// The Firestore emulator JAR is fetched over the network on first use
// (~cloud-firestore-emulator-*.jar from Google's Maven mirror). If that
// fetch is blocked, `firebase emulators:exec` itself fails before this file
// ever runs, with a clear network/download error — see the accompanying
// report for what that outcome would mean and the resulting equivalence-gap
// writeup, if this route were not available in a given environment. It WAS
// available when this file was authored (verified with a throwaway probe
// script, not committed).

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

// The pre-fix commit is PR #104's own recorded base (`2cb405e`, `main` at the
// time this bridge round started — confirmed against the PR's own metadata,
// not assumed). Reading the OLD, defective `retirePermanentNote()` straight
// out of that commit (rather than re-typing it by hand into this file) means
// this proof can never silently drift from what was actually fixed.
const PRE_FIX_COMMIT = "2cb405e388bb069c11c6e62a9f53854c91995e0b";

const HOST = "127.0.0.1";
const PORT = 8091; // matches tools/firestore-emulator/note-foundation-v1.firebase.json, read not written
const PROJECT = "demo-quranrevival-note-foundation-retire-proof";
assert.match(PROJECT, /^demo-/, "SAFE-01: never a production or non-demo project id");
assert.notEqual(PROJECT, "study-monitoring", "SAFE-01: never the production project id");

// CJS `require`, resolved as if this file lived inside
// tools/firestore-emulator/ — so it finds that directory's own
// node_modules (firebase, @firebase/rules-unit-testing) without this file,
// or any tracked file in tools/firestore-emulator/, needing to change.
const emulatorRequire = createRequire(path.join(root, "tools/firestore-emulator/package.json"));
let rulesUnitTesting, realFirestore;
try {
  rulesUnitTesting = emulatorRequire("@firebase/rules-unit-testing");
  realFirestore = emulatorRequire("firebase/firestore");
} catch (err) {
  console.error(
    "Cannot load the Firestore emulator test SDK from tools/firestore-emulator/node_modules.\n" +
    "Run `cd tools/firestore-emulator && npm ci` first (materialises the gitignored\n" +
    "node_modules/ only — no tracked file changes) — see this file's own header for the\n" +
    "full launch command. Original error:\n" + String(err && err.stack || err)
  );
  process.exit(1);
}
const { initializeTestEnvironment } = rulesUnitTesting;
globalThis.__realFirestoreFns = realFirestore;

const RULES_PATH = path.join(root, "docs/governance/phase5-note-foundation-rules-candidate-2026-09-15.rules");
const candidateRules = fs.readFileSync(RULES_PATH, "utf8");
// Sanity: this is the same isolated extract the protected emulator suite
// itself asserts governs exactly the Phase 5 domain (never touched here,
// only reproduced as a fact about the file).
const blocks = [...new Set([...candidateRules.matchAll(/match \/(\w+)\//g)].map((m) => m[1]))]
  .filter((n) => n !== "databases");
assert.deepEqual(blocks.sort(), ["noteRevisions", "noteSources", "notes"],
  `expected the Phase 5 extract to govern exactly notes/noteRevisions/noteSources, saw: ${blocks}`);

/** Loads a `.js` source string as a real ES module via a data: URL, after applying named rewrites. Throws loudly if any rewrite pattern fails to match — a silent no-op rewrite would mean the loaded module still imports the unreachable gstatic URL. */
async function loadRewritten(label, source, rewrites) {
  let out = source;
  for (const [pattern, replacement] of rewrites) {
    const before = out;
    out = out.replace(pattern, replacement);
    assert.notEqual(out, before, `${label}: rewrite did not match — ${pattern}`);
  }
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(out).toString("base64")}`;
  return import(moduleUrl);
}

const GSTATIC_IMPORT = /import\s*\{[\s\S]*?\}\s*from\s*"https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/;

/** envelope.js, unmodified since PR #104 touches only note-foundation.js — loaded ONCE, its two exports reused by both the fixed and the pre-fix note-foundation.js instances below (they share the identical envelope.js at both commits). */
const envelopeSource = fs.readFileSync(path.join(root, "app/js/envelope.js"), "utf8");
const envelopeReal = await loadRewritten("envelope.js", envelopeSource, [
  [GSTATIC_IMPORT, "const { doc, setDoc, updateDoc, writeBatch, runTransaction, serverTimestamp } = globalThis.__realFirestoreFns;"],
]);
globalThis.__nfEnvelopeReal = {
  createDocument: envelopeReal.createDocument,
  runEnvelopeTransaction: envelopeReal.runEnvelopeTransaction,
};

const collectionsUrl = pathToFileURL(path.join(root, "app/js/collections.js")).href;
const journeyMapUrl = pathToFileURL(path.join(root, "app/js/journey-map-contract.js")).href;

function rewriteNoteFoundationSource(source) {
  return source
    .replace(GSTATIC_IMPORT,
      "const { collection, doc, getDoc, getDocs, limit, orderBy, query, where } = globalThis.__realFirestoreFns;")
    .replace(/import \{ TENANT \} from "\.\/collections\.js";/,
      `import { TENANT } from "${collectionsUrl}";`)
    .replace(/import \{ folderTreeRefusal, journeyFolder \} from "\.\/journey-map-contract\.js";/,
      `import { folderTreeRefusal, journeyFolder } from "${journeyMapUrl}";`)
    .replace(/import \{ createDocument, runEnvelopeTransaction \} from "\.\/envelope\.js";/,
      "const { createDocument, runEnvelopeTransaction } = globalThis.__nfEnvelopeReal;");
}

// The FIXED module — read straight from the working tree, so this proof
// always exercises whatever is actually about to be committed/pushed, never
// a copy.
const fixedSource = fs.readFileSync(path.join(root, "app/js/note-foundation.js"), "utf8");
assert.match(fixedSource, /transaction\.create\(TENANT\.NOTE_REVISIONS,/,
  "expected the FIXED retirePermanentNote() to commit a new revision — has the fix been reverted?");
const fixedFoundation = await loadRewritten("note-foundation.js (fixed)", fixedSource, [
  [GSTATIC_IMPORT, "const { collection, doc, getDoc, getDocs, limit, orderBy, query, where } = globalThis.__realFirestoreFns;"],
  [/import \{ TENANT \} from "\.\/collections\.js";/, `import { TENANT } from "${collectionsUrl}";`],
  [/import \{ folderTreeRefusal, journeyFolder \} from "\.\/journey-map-contract\.js";/,
    `import { folderTreeRefusal, journeyFolder } from "${journeyMapUrl}";`],
  [/import \{ createDocument, runEnvelopeTransaction \} from "\.\/envelope\.js";/,
    "const { createDocument, runEnvelopeTransaction } = globalThis.__nfEnvelopeReal;"],
]);

// The PRE-FIX module — read from the exact commit PR #104 fixed, via `git
// show`, never re-typed by hand.
const preFixSourceRaw = execFileSync("git", ["show", `${PRE_FIX_COMMIT}:app/js/note-foundation.js`], {
  cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
});
assert.match(preFixSourceRaw,
  /transaction\.update\(TENANT\.NOTES, noteDocId, \{ status: NOTE_STATUS\.RETIRED \}\);/,
  `expected commit ${PRE_FIX_COMMIT} to carry the known pre-fix single-line update — has this proof's pinned commit gone stale?`);
const preFixFoundation = await loadRewritten(`note-foundation.js (pre-fix @ ${PRE_FIX_COMMIT})`, preFixSourceRaw, [
  [GSTATIC_IMPORT, "const { collection, doc, getDoc, getDocs, limit, orderBy, query, where } = globalThis.__realFirestoreFns;"],
  [/import \{ TENANT \} from "\.\/collections\.js";/, `import { TENANT } from "${collectionsUrl}";`],
  [/import \{ folderTreeRefusal, journeyFolder \} from "\.\/journey-map-contract\.js";/,
    `import { folderTreeRefusal, journeyFolder } from "${journeyMapUrl}";`],
  [/import \{ createDocument, runEnvelopeTransaction \} from "\.\/envelope\.js";/,
    "const { createDocument, runEnvelopeTransaction } = globalThis.__nfEnvelopeReal;"],
]);

const T = "t1";
const nk = (tenantId, id) => `${tenantId}__${id}`;
const { doc, getDoc, getDocs, collection, query, where, limit, setDoc } = realFirestore;

/** A properly SCOPED, bounded query — the shape the candidate's own accepted matrix requires (QUERY-01/02: an unscoped list, even one whose real documents would all individually satisfy the per-document rule, is refused outright; see the protected `note-foundation-v1.rules.test.mjs`, read here only as evidence of the required query shape). */
function scopedNoteRevisions(db, noteId) {
  return query(collection(db, "noteRevisions"),
    where("tenantId", "==", T), where("ownerPersonId", "==", "p1"), where("noteId", "==", noteId),
    limit(50));
}

function noteDoc({ noteId, currentRevisionId }) {
  return {
    noteId, tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1", visibility: "private",
    title: "T", bodyHtml: "<p>B</p>", status: "active", currentRevisionId,
    schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-p1",
  };
}
function revDoc({ revisionId, noteId, previousRevisionId = null, revisionReason = "created" }) {
  return {
    revisionId, noteId, tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
    previousRevisionId, title: "T", bodyHtml: "<p>B</p>", revisionReason, actorUid: "uid-p1",
    schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-p1",
  };
}

test("real retirePermanentNote() against the real Phase 5 Rules candidate, on a real Firestore emulator", async (t) => {
  const env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { host: HOST, port: PORT, rules: candidateRules },
  });

  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      // Just enough for isNoteOwner()/personInTenant()/isSelfPerson() to hold
      // for p1 — this proof is about the retire transaction's own shape, not
      // a re-run of the accepted authorisation matrix (already covered by
      // the protected emulator suite).
      await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: T, authUid: "uid-p1" });

      // NOTE1 — used by the SUCCESS and STALE-REVISION cases, via the FIXED module.
      await setDoc(doc(db, "notes", nk(T, "note1")), noteDoc({ noteId: "note1", currentRevisionId: "rev1" }));
      await setDoc(doc(db, "noteRevisions", nk(T, "rev1")), revDoc({ revisionId: "rev1", noteId: "note1" }));

      // NOTE2 — used by the PRE-FIX DENIAL case, via the OLD module.
      await setDoc(doc(db, "notes", nk(T, "note2")), noteDoc({ noteId: "note2", currentRevisionId: "revA" }));
      await setDoc(doc(db, "noteRevisions", nk(T, "revA")), revDoc({ revisionId: "revA", noteId: "note2" }));
    });

    const p1 = env.authenticatedContext("uid-p1").firestore();

    await t.test("SUCCESS: the real, fixed retirePermanentNote() is accepted by the real candidate Rules", async () => {
      const newRevisionId = await fixedFoundation.retirePermanentNote(p1, {
        tenantId: T, noteId: "note1", expectedRevisionId: "rev1", actorUid: "uid-p1",
      });
      assert.ok(typeof newRevisionId === "string" && newRevisionId.length > 0);
      assert.notEqual(newRevisionId, "rev1", "retiring must mint a NEW revision id, not reuse the old one");

      const noteSnap = await getDoc(doc(p1, "notes", nk(T, "note1")));
      assert.equal(noteSnap.exists(), true);
      assert.equal(noteSnap.data().status, "retired");
      assert.equal(noteSnap.data().currentRevisionId, newRevisionId,
        "the Note must now point at the freshly minted revision, never the old one");

      const revSnap = await getDoc(doc(p1, "noteRevisions", nk(T, newRevisionId)));
      assert.equal(revSnap.exists(), true, "the new revision document must actually exist and be readable");
      assert.equal(revSnap.data().previousRevisionId, "rev1", "the new revision must chain from the one being left behind");
      assert.equal(revSnap.data().revisionReason, "retired");

      // Mechanically prove exactly two revisions exist for note1 (rev1 + the
      // new one) — nothing extra was written, nothing was silently skipped.
      // MUST be a properly SCOPED, bounded query: an unscoped `list`, even
      // over documents that would each individually satisfy the per-document
      // rule, is refused outright by this candidate's own accepted matrix
      // (QUERY-01/QUERY-02) — discovered empirically here (the first attempt
      // at this proof used a bare `limit()` with no `where`, and the real
      // emulator refused it with "Property ownerPersonId is undefined on
      // object", which is Firestore's own real `list`-rule evaluation, not a
      // bug in this proof — see this file's own note at the top of
      // `scopedNoteRevisions()`).
      const allRevs = await getDocs(scopedNoteRevisions(p1, "note1"));
      const note1RevisionIds = allRevs.docs.map((d) => d.data()).map((d) => d.revisionId);
      assert.deepEqual(note1RevisionIds.sort(), ["rev1", newRevisionId].sort());
    });

    await t.test("STALE REVISION DENIAL: retiring again with the now-superseded expectedRevisionId is refused, and nothing new is written", async () => {
      const allRevsBefore = await getDocs(scopedNoteRevisions(p1, "note1"));
      const countBefore = allRevsBefore.docs.length;

      await assert.rejects(
        () => fixedFoundation.retirePermanentNote(p1, {
          tenantId: T, noteId: "note1", expectedRevisionId: "rev1", actorUid: "uid-p1",
        }),
        /Stale Note revision/,
        "a second retire naming the now-stale original revision must be refused before any write is attempted"
      );

      const allRevsAfter = await getDocs(scopedNoteRevisions(p1, "note1"));
      assert.equal(allRevsAfter.docs.length, countBefore,
        "the stale-revision refusal must be a pure client-side guard: no noteRevisions document may be created by the attempt");

      const noteSnap = await getDoc(doc(p1, "notes", nk(T, "note1")));
      assert.equal(noteSnap.data().status, "retired", "the Note's own state from the first, successful retire must be untouched");
    });

    await t.test("PRE-FIX DENIAL: the OLD (defective) retirePermanentNote(), loaded unmodified from its own commit, is refused by the identical real candidate Rules", async () => {
      await assert.rejects(
        () => preFixFoundation.retirePermanentNote(p1, {
          tenantId: T, noteId: "note2", expectedRevisionId: "revA", actorUid: "uid-p1",
        }),
        (err) => {
          assert.equal(err && err.code, "permission-denied",
            `expected a Firestore Rules permission-denied, got: ${err && err.code} — ${err && err.message}`);
          return true;
        },
        "the pre-fix status-only update must be denied by the real candidate Rules — this is the mechanical proof of the defect PR #104 fixes"
      );

      // The denial must be a clean Rules refusal, not a wrapper that also
      // silently mutated something — note2 must be completely untouched.
      // withSecurityRulesDisabled() awaits its callback but does not return
      // its value (checked against @firebase/rules-unit-testing's own
      // source), so the read result is captured via an outer variable.
      let noteSnap;
      await env.withSecurityRulesDisabled(async (ctx) => {
        noteSnap = await getDoc(doc(ctx.firestore(), "notes", nk(T, "note2")));
      });
      assert.equal(noteSnap.data().status, "active", "a denied write must leave the Note exactly as it was");
      assert.equal(noteSnap.data().currentRevisionId, "revA");
    });
  } finally {
    await env.cleanup();
  }
});
