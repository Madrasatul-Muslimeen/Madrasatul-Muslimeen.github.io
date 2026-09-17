// MAP Phase 5 (P5-C) -- the Study<->Note service, executed against in-memory
// stand-ins for the Note Foundation and the evidence writer. No network, no
// emulator, no browser.
//
// This tests the REAL app/js/study-note-service.js source with its database
// imports rewritten to injected globals -- the same technique
// study-activity-evidence-store.mjs uses -- so the file under test is the file
// that would ship, not a copy of it.
//
// The three things this suite exists to pin, because each is a way the module
// could look right and be wrong:
//   1. Saving a Note must NEVER write Activity evidence as a side effect.
//   2. A promotion must leave the quick note completely alone.
//   3. Which Journaling event is recorded must come from the revision chain,
//      not from anything a caller says.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || process.cwd());
const appUrl = (f) => pathToFileURL(path.join(root, "app/js", f)).href;

let source = fs.readFileSync(path.join(root, "app/js/study-note-service.js"), "utf8");
source = source
  .replace(/import \{ weekKeyFor \} from "\.\/activity\.js";/, "const { weekKeyFor } = globalThis.__snsActivity;")
  .replace(/import \{[\s\S]*?\} from "\.\/note-foundation\.js";/,
    "const { NOTE_STATUS, createPermanentNote, getNotesByIds, listNoteSourcesForUnit, retireNoteSource, retirePermanentNote, updatePermanentNoteContent } = globalThis.__snsNoteFoundation;")
  .replace(/import \{ writeStudyActivityEvidence \} from "\.\/study-activity-evidence-store\.js";/,
    "const { writeStudyActivityEvidence } = globalThis.__snsStore;")
  .replace(/from "\.\/note-journal-evidence\.js"/, `from "${appUrl("note-journal-evidence.js")}"`)
  .replace(/from "\.\/study-note-binding\.js"/, `from "${appUrl("study-note-binding.js")}"`);

for (const leftover of [/from "\.\//, /gstatic\.com/]) {
  assert.ok(!leftover.test(source), `an import was not rewritten: ${leftover}`);
}

// --- stand-ins that really record what was asked of them --------------------
const calls = { create: [], update: [], retire: [], evidence: [], sourceQuery: [], noteFetch: [], unbind: [] };
let sourceRows = [];
let noteRows = [];
let nextIds = [];
let failNext = null;

globalThis.__snsActivity = {
  weekKeyFor: (date, weekStartsOn) => {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - weekStartsOn + 7) % 7));
    return d.toISOString().slice(0, 10);
  },
};
globalThis.__snsNoteFoundation = {
  createPermanentNote: async (_db, args) => {
    calls.create.push(args);
    if (failNext === "create") { failNext = null; throw new Error("denied"); }
    const [noteId, revisionId] = nextIds.shift();
    return { noteId, revisionId, noteDocId: `${args.tenantId}__${noteId}`, revisionDocId: `${args.tenantId}__${revisionId}` };
  },
  updatePermanentNoteContent: async (_db, args) => {
    calls.update.push(args);
    if (failNext === "update") { failNext = null; throw new Error("stale"); }
    return nextIds.shift()[1];
  },
  retirePermanentNote: async (_db, args) => { calls.retire.push(args); },
  // P5-F -- the source-link retire. The sentinel is how a REJECTION is
  // exercised: the source rewrite destructures this object at module load, so
  // swapping a member afterwards would not reach the module under test.
  retireNoteSource: async (_db, args) => {
    calls.unbind.push(args);
    if (args.sourceLinkId === "refuse-me") throw new Error("Cross-owner or cross-tenant source link refused.");
  },
  NOTE_STATUS: Object.freeze({ ACTIVE: "active", RETIRED: "retired" }),
  listNoteSourcesForUnit: async (_db, args) => { calls.sourceQuery.push(args); return sourceRows.slice(0, args.maximum); },
  getNotesByIds: async (_db, tenantId, ids) => { calls.noteFetch.push({ tenantId, ids }); return noteRows.filter((n) => ids.includes(n.noteId)); },
};
globalThis.__snsStore = {
  writeStudyActivityEvidence: async (_db, args) => {
    calls.evidence.push(args);
    return { eventId: `${args.eventType}__${args.trackableId}__${args.unitKey}__${args.noteId}`, written: true };
  },
};
function reset(ids = []) {
  // Clears EVERY key rather than a hand-written list. The list silently forgot
  // `unbind` the moment P5-F added it, so calls accumulated across cases and a
  // count assertion failed for a reason that had nothing to do with the code
  // under test. `journey-map-service.mjs` already resets this way.
  for (const key of Object.keys(calls)) calls[key].length = 0;
  sourceRows = []; noteRows = [];
  nextIds = ids; failNext = null;
}

const mod = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const {
  PROVENANCE_PROMOTED_QUICK_NOTE, PROVENANCE_STUDY_NOTE,
  MAX_NOTES_PER_UNIT,
  createStudyNote, notesForStudyUnit, promoteQuickNoteToStudyNote, recordJournalEvidence,
  retireStudyNote, reviseStudyNote,
} = mod;

let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`  PASS  ${name}`); }

const NOTE_A = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
const NOTE_B = "0f9e8d7c6b5a49382716f5e4d3c2b1a0";
const REV_1  = "11112222333344445555666677778888";
const REV_2  = "99990000aaaabbbbccccddddeeeeffff";
const db = {};
const AT = new Date("2026-09-15T09:00:00Z");
const base = { tenantId: "t1", ownerPersonId: "p1", actorUid: "uid-p1", at: AT, weekStartsOn: 0 };

// --- 1. SAVING NEVER WRITES EVIDENCE ----------------------------------------
await check("S1 creating a Note writes NO Activity evidence by itself", async () => {
  reset([[NOTE_A, REV_1]]);
  const out = await createStudyNote(db, { ...base, unitKey: "ayah:2:255", bodyHtml: "<p>x</p>" });
  assert.equal(calls.evidence.length, 0, "a save must not record Activity as a side effect");
  assert.ok(out.evidence, "the arguments are RETURNED for the caller to decide");
});
await check("S2 revising a Note writes NO Activity evidence by itself", async () => {
  reset([[NOTE_A, REV_2]]);
  await reviseStudyNote(db, { tenantId: "t1", personId: "p1", noteId: NOTE_A, unitKey: "ayah:2:255",
    expectedRevisionId: REV_1, title: "t", bodyHtml: "<p>y</p>", actorUid: "uid-p1", at: AT });
  assert.equal(calls.evidence.length, 0);
});
await check("S3 recordJournalEvidence is the ONLY thing that writes, and null is a no-op", async () => {
  reset([[NOTE_A, REV_1]]);
  const { evidence } = await createStudyNote(db, { ...base, unitKey: "ayah:2:255" });
  const skipped = await recordJournalEvidence(db, null, "uid-p1");
  assert.deepEqual(skipped, { eventId: null, written: false, skipped: true });
  assert.equal(calls.evidence.length, 0);
  const written = await recordJournalEvidence(db, evidence, "uid-p1");
  assert.equal(calls.evidence.length, 1);
  assert.equal(written.written, true);
  assert.equal(calls.evidence[0].uid, "uid-p1", "the actor uid reaches the writer");
});

// --- 2. THE PROMOTION LEAVES THE QUICK NOTE ALONE ---------------------------
await check("S4 the module holds NO reference to the quick-note surface at all", async () => {
  const raw = fs.readFileSync(path.join(root, "app/js/study-note-service.js"), "utf8");
  // Strip BOTH comment forms before searching. A line filter alone is not
  // enough here: the module's own doc comments name `ayah-notes.js` in order
  // to say it is never reached, and a /** */ body does not start with //.
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, "")
                  .split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  for (const forbidden of ["ayah-notes", "ayahNotes", "AYAH_NOTES", "saveAyahNote", "ayahNoteHtml"]) {
    assert.ok(!code.includes(forbidden), `${forbidden} must not appear in the promotion path`);
  }
});
await check("S5 a promotion takes the HTML as an argument and refuses an empty one", async () => {
  reset([[NOTE_A, REV_1]]);
  await assert.rejects(() => promoteQuickNoteToStudyNote(db, { ...base, unitKey: "ayah:2:255", bodyHtml: "   " }),
    /own HTML must be supplied/);
  await assert.rejects(() => promoteQuickNoteToStudyNote(db, { ...base, unitKey: "ayah:2:255" }),
    /own HTML must be supplied/);
  assert.equal(calls.create.length, 0, "nothing was written for a refused promotion");
});
await check("S6 a promotion carries the promoted provenance and the quick note's own HTML", async () => {
  reset([[NOTE_A, REV_1]]);
  await promoteQuickNoteToStudyNote(db, { ...base, unitKey: "ayah:2:255", bodyHtml: "<p>my note</p>" });
  assert.equal(calls.create[0].bodyHtml, "<p>my note</p>");
  assert.equal(calls.create[0].source.provenanceKind, PROVENANCE_PROMOTED_QUICK_NOTE);
});
await check("S7 a promotion cannot be talked out of its provenance by a caller", async () => {
  reset([[NOTE_A, REV_1]]);
  await promoteQuickNoteToStudyNote(db, { ...base, unitKey: "ayah:2:255", bodyHtml: "<p>x</p>",
    provenanceKind: PROVENANCE_STUDY_NOTE });
  assert.equal(calls.create[0].source.provenanceKind, PROVENANCE_PROMOTED_QUICK_NOTE);
});
await check("S8 an ordinary Study Note carries the study provenance", async () => {
  reset([[NOTE_A, REV_1]]);
  await createStudyNote(db, { ...base, unitKey: "ayah:2:255" });
  assert.equal(calls.create[0].source.provenanceKind, PROVENANCE_STUDY_NOTE);
  assert.equal(calls.create[0].source.sourceKind, "quran-unit");
  assert.equal(calls.create[0].source.sourceKey, "ayah:2:255");
});

// --- 3. THE EVENT COMES FROM THE REVISION CHAIN -----------------------------
await check("S9 a creation records journal.note-created, keyed on the Note's own id", async () => {
  reset([[NOTE_A, REV_1]]);
  const { evidence, commit } = await createStudyNote(db, { ...base, unitKey: "ayah:2:255" });
  assert.equal(evidence.eventType, "journal.note-created");
  assert.equal(evidence.noteId, NOTE_A);
  assert.equal(evidence.trackableId, "approach_10");
  assert.equal(commit.previousRevisionId, null);
});
await check("S10 a revision records journal.note-revised and names the revision it chains from", async () => {
  reset([[NOTE_A, REV_2]]);
  const { evidence, commit } = await reviseStudyNote(db, { tenantId: "t1", personId: "p1", noteId: NOTE_A,
    unitKey: "ayah:2:255", expectedRevisionId: REV_1, title: "t", bodyHtml: "y", actorUid: "uid-p1", at: AT });
  assert.equal(evidence.eventType, "journal.note-revised");
  assert.equal(commit.previousRevisionId, REV_1);
  assert.equal(calls.update[0].expectedRevisionId, REV_1, "the optimistic-concurrency check is passed through");
});
await check("S11 TWO Notes on the SAME unit stay independently represented (the P4-D3 requirement)", async () => {
  reset([[NOTE_A, REV_1], [NOTE_B, REV_2]]);
  const a = await createStudyNote(db, { ...base, unitKey: "ayah:2:255" });
  const b = await createStudyNote(db, { ...base, unitKey: "ayah:2:255" });
  assert.notEqual(a.evidence.noteId, b.evidence.noteId);
  assert.equal(a.evidence.unitKey, b.evidence.unitKey);
});
await check("S12 retiring a Note records NOTHING, explicitly", async () => {
  reset();
  const out = await retireStudyNote(db, { tenantId: "t1", noteId: NOTE_A, expectedRevisionId: REV_2, actorUid: "uid-p1" });
  assert.deepEqual(out, { commit: null, evidence: null });
  assert.equal(calls.retire.length, 1);
  assert.equal(calls.evidence.length, 0);
});

// --- binding breadth vs evidence breadth (ADR-009 §6) -----------------------
await check("S13 a Note about a JUZ is created, and records no Journaling Activity", async () => {
  reset([[NOTE_A, REV_1]]);
  const { note, evidence } = await createStudyNote(db, { ...base, unitKey: "juz:30" });
  assert.equal(calls.create.length, 1, "the Note itself is still created");
  assert.equal(note.noteId, NOTE_A);
  assert.equal(evidence, null, "but there is no v1 evidence shape for a juz");
});
await check("S14 a Note about a TOPIC behaves the same way", async () => {
  reset([[NOTE_A, REV_1]]);
  const { evidence } = await createStudyNote(db, { ...base, unitKey: "topic:t42" });
  assert.equal(calls.create.length, 1);
  assert.equal(evidence, null);
});

// --- refusals happen BEFORE anything is written -----------------------------
await check("S15 a bad unit key is refused before the Note Foundation is touched", async () => {
  reset([[NOTE_A, REV_1]]);
  await assert.rejects(() => createStudyNote(db, { ...base, unitKey: "Surah 2 ayah 255" }),
    /not a permanent Study Unit key/);
  assert.equal(calls.create.length, 0, "nothing reached the database");
});
await check("S16 a failed Note write reaches the caller and records no evidence (I15)", async () => {
  reset([[NOTE_A, REV_1]]);
  failNext = "create";
  await assert.rejects(() => createStudyNote(db, { ...base, unitKey: "ayah:2:255" }), /denied/);
  assert.equal(calls.evidence.length, 0);
});
await check("S17 a stale revision reaches the caller and records no evidence (I6/I15)", async () => {
  reset([[NOTE_A, REV_2]]);
  failNext = "update";
  await assert.rejects(() => reviseStudyNote(db, { tenantId: "t1", personId: "p1", noteId: NOTE_A,
    unitKey: "ayah:2:255", expectedRevisionId: REV_1, title: "t", bodyHtml: "y", actorUid: "uid-p1" }), /stale/);
  assert.equal(calls.evidence.length, 0);
});

// --- the week the evidence lands in comes from the app's own helper ---------
await check("S18 weekKey is the app's own tenant-aware week, not a re-implementation", async () => {
  reset([[NOTE_A, REV_1]]);
  const { evidence } = await createStudyNote(db, { ...base, unitKey: "ayah:2:255",
    at: new Date("2026-09-15T09:00:00Z"), weekStartsOn: 1 });
  assert.equal(evidence.weekKey, "2026-09-14", "Monday-start week of Tue 15 Sep 2026");
  assert.equal(evidence.dateIso, "2026-09-15");
});

// --- ADR-003 -----------------------------------------------------------------
await check("S19 nothing the service produces can name a status", async () => {
  reset([[NOTE_A, REV_1]]);
  const { evidence, commit } = await createStudyNote(db, { ...base, unitKey: "ayah:2:255", approachId: "approach_10" });
  const blob = JSON.stringify({ evidence, commit, create: calls.create[0] });
  for (const forbidden of ["claimStatus", "achieved", "mastered", "confirmEntry", "chunkKey"]) {
    assert.ok(!blob.includes(forbidden), forbidden);
  }
});

// --- P5-E: the READ side of ADR-009 ----------------------------------------
const src = (noteId, over = {}) => ({ sourceLinkId: `s-${noteId}`, noteId, tenantId: "t1",
  ownerPersonId: "p1", sourceKey: "ayah:2:255", status: "active", ...over });
const note = (noteId, over = {}) => ({ noteId, tenantId: "t1", ownerPersonId: "p1",
  title: "t", status: "active", ...over });

await check("R1 the query is scoped to tenant + owner + the unit key, and bounded", async () => {
  reset(); sourceRows = [src(NOTE_A)]; noteRows = [note(NOTE_A)];
  await notesForStudyUnit(db, { tenantId: "t1", ownerPersonId: "p1", unitKey: "ayah:2:255" });
  const q = calls.sourceQuery[0];
  assert.equal(q.tenantId, "t1");
  assert.equal(q.ownerPersonId, "p1");
  assert.equal(q.sourceKey, "ayah:2:255", "the permanent unit key is the sourceKey, verbatim (I5)");
  assert.equal(q.maximum, MAX_NOTES_PER_UNIT + 1, "one over the cap, so truncation is read off the data");
});

await check("R2 TWO Notes on the SAME unit both come back (ADR-008's amendment, read side)", async () => {
  reset(); sourceRows = [src(NOTE_A), src(NOTE_B)]; noteRows = [note(NOTE_A), note(NOTE_B)];
  const { rows } = await notesForStudyUnit(db, { tenantId: "t1", ownerPersonId: "p1", unitKey: "ayah:2:255" });
  assert.deepEqual(rows.map((r) => r.note.noteId), [NOTE_A, NOTE_B]);
});

await check("R3 a RETIRED Note is excluded even though its source link is still active", async () => {
  // retirePermanentNote() updates the Note and never touches its links (I4), so
  // an active link pointing at a retired Note is the NORMAL post-retirement
  // state. Filtering on the link would show retired Notes for ever.
  reset(); sourceRows = [src(NOTE_A), src(NOTE_B)];
  noteRows = [note(NOTE_A, { status: "retired" }), note(NOTE_B)];
  const { rows } = await notesForStudyUnit(db, { tenantId: "t1", ownerPersonId: "p1", unitKey: "ayah:2:255" });
  assert.deepEqual(rows.map((r) => r.note.noteId), [NOTE_B]);
});

await check("R4 a source link naming a Note that no longer exists is DROPPED, not thrown", async () => {
  reset(); sourceRows = [src(NOTE_A), src(NOTE_B)]; noteRows = [note(NOTE_B)];
  const { rows } = await notesForStudyUnit(db, { tenantId: "t1", ownerPersonId: "p1", unitKey: "ayah:2:255" });
  assert.deepEqual(rows.map((r) => r.note.noteId), [NOTE_B], "one dangling link must not deny the other Notes");
});

await check("R5 truncation is REPORTED, never silent", async () => {
  reset();
  sourceRows = Array.from({ length: MAX_NOTES_PER_UNIT + 1 }, (_, i) => src(`n${i}`.padEnd(32, "0")));
  noteRows = sourceRows.map((s2) => note(s2.noteId));
  const { rows, truncated } = await notesForStudyUnit(db, { tenantId: "t1", ownerPersonId: "p1", unitKey: "ayah:2:255" });
  assert.equal(truncated, true);
  assert.equal(rows.length, MAX_NOTES_PER_UNIT, "the cap is honoured");
});
await check("R6 a result that exactly fills the cap is NOT reported as truncated", async () => {
  reset();
  sourceRows = Array.from({ length: MAX_NOTES_PER_UNIT }, (_, i) => src(`n${i}`.padEnd(32, "0")));
  noteRows = sourceRows.map((s2) => note(s2.noteId));
  const { truncated } = await notesForStudyUnit(db, { tenantId: "t1", ownerPersonId: "p1", unitKey: "ayah:2:255" });
  assert.equal(truncated, false, "one-over is what proves there is more -- a full page is not proof");
});

await check("R7 duplicate links to one Note cost ONE document read, not two", async () => {
  reset(); sourceRows = [src(NOTE_A), src(NOTE_A, { sourceLinkId: "s-dup" })]; noteRows = [note(NOTE_A)];
  await notesForStudyUnit(db, { tenantId: "t1", ownerPersonId: "p1", unitKey: "ayah:2:255" });
  assert.deepEqual(calls.noteFetch[0].ids, [NOTE_A]);
});

await check("R8 a bad unit key is refused BEFORE any read", async () => {
  reset();
  await assert.rejects(() => notesForStudyUnit(db, { tenantId: "t1", ownerPersonId: "p1", unitKey: "Surah 2 ayah 255" }),
    /not a permanent Study Unit key/);
  assert.equal(calls.sourceQuery.length, 0, "nothing reached the database");
  assert.equal(calls.noteFetch.length, 0);
});

await check("R9 a juz and a topic are readable -- binding breadth, not evidence breadth", async () => {
  for (const unitKey of ["juz:30", "topic:t42"]) {
    reset(); sourceRows = [src(NOTE_A, { sourceKey: unitKey })]; noteRows = [note(NOTE_A)];
    const { rows } = await notesForStudyUnit(db, { tenantId: "t1", ownerPersonId: "p1", unitKey });
    assert.equal(rows.length, 1, unitKey);
  }
});

await check("R10 reading a unit records no Activity and names no status", async () => {
  reset(); sourceRows = [src(NOTE_A)]; noteRows = [note(NOTE_A)];
  const out = await notesForStudyUnit(db, { tenantId: "t1", ownerPersonId: "p1", unitKey: "ayah:2:255" });
  assert.equal(calls.evidence.length, 0, "reading is not journaling");
  const blob = JSON.stringify(out);
  for (const forbidden of ["claimStatus", "achieved", "mastered", "chunkKey"]) assert.ok(!blob.includes(forbidden), forbidden);
});

// --- P5-F: un-anchoring a Note from its Study Unit -------------------------
await check("R11 a source link can be un-anchored, and ONLY its status moves", async () => {
  reset();
  const out = await mod.unbindStudyNoteSource(db, { tenantId: "t1", ownerPersonId: "p1",
    sourceLinkId: "src-1", actorUid: "u1" });
  assert.deepEqual(calls.unbind[0], { tenantId: "t1", ownerPersonId: "p1", sourceLinkId: "src-1", actorUid: "u1" });
  assert.deepEqual(out, { unbound: "src-1" });
  // Nothing about the Note, and nothing about what it was about, may travel
  // with the call -- a repoint is what ADR-009's vocabulary exists to prevent.
  const keys = Object.keys(calls.unbind[0]);
  for (const forbidden of ["sourceKey", "sourceKind", "relationshipKind", "provenanceKind", "noteId"]) {
    assert.ok(!keys.includes(forbidden), `un-anchoring carried ${forbidden}`);
  }
});

await check("R12 un-anchoring never retires the NOTE, and records no Activity", async () => {
  reset();
  await mod.unbindStudyNoteSource(db, { tenantId: "t1", ownerPersonId: "p1", sourceLinkId: "src-1", actorUid: "u1" });
  assert.equal(calls.retire.length, 0, "a Note is not defined by what it is about (ADR-004)");
  assert.equal(calls.create.length, 0);
  assert.equal(calls.update.length, 0);
  assert.equal(calls.evidence.length, 0, "un-anchoring is not study");
});

await check("R13 a refusal underneath reaches the caller -- I15, never swallowed", async () => {
  reset();
  await assert.rejects(() => mod.unbindStudyNoteSource(db, { tenantId: "t1", ownerPersonId: "p1",
    sourceLinkId: "refuse-me", actorUid: "u1" }), /Cross-owner or cross-tenant source link refused/);
  assert.equal(calls.unbind.length, 1, "the call really was made -- the rejection is not a short-circuit");
});

console.log(`\n${passed} passed`);
