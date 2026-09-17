// MAP Phase 5 (P5-B) -- the Journaling identity bridge that resolves the
// deferred P4-D3 dependency. Pure: no database, no browser, no emulator.
//
// The point of this suite is the thing Phase 4 could not have: that TWO Notes
// on the SAME unit are independently representable, because the identity is
// the Note's own permanent id and not the unit it happens to be anchored to.
import assert from "node:assert/strict";
import {
  JOURNAL_APPROACH_ID, isPermanentNoteId, journalEvidenceArgs, journalUnitType,
} from "../../app/js/note-journal-evidence.js";

let passed = 0;
function check(name, fn) {
  const r = fn();
  if (r && typeof r.then === "function") throw new TypeError("check() is synchronous.");
  passed++; console.log(`  PASS  ${name}`);
}

// The app's own week helper, passed in rather than re-implemented.
const weekKeyFor = (date, weekStartsOn) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - weekStartsOn + 7) % 7));
  return d.toISOString().slice(0, 10);
};
const NOTE_A = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
const NOTE_B = "0f9e8d7c6b5a49382716f5e4d3c2b1a0";
const REV_1  = "11112222333344445555666677778888";
const REV_2  = "99990000aaaabbbbccccddddeeeeffff";
const base = { tenantId: "t1", personId: "p1", unitKey: "ayah:2:255",
               at: new Date("2026-09-15T09:00:00Z"), weekStartsOn: 0, weekKeyFor };
const created = (noteId = NOTE_A) => ({ noteId, revisionId: REV_1, previousRevisionId: null });
const revised = (noteId = NOTE_A) => ({ noteId, revisionId: REV_2, previousRevisionId: REV_1 });

// --- THE P4-D3 REQUIREMENT, which is why this module exists ---------------
check("MA-1 two DIFFERENT Notes on the SAME unit are independently representable", () => {
  const a = journalEvidenceArgs({ ...base, commit: created(NOTE_A) });
  const b = journalEvidenceArgs({ ...base, commit: created(NOTE_B) });
  assert.notEqual(a.noteId, b.noteId);
  assert.equal(a.unitKey, b.unitKey, "same unit -- and still two distinct events");
});
check("MA-3 two different Notes REVISED on the same unit/day stay distinct", () => {
  const a = journalEvidenceArgs({ ...base, commit: revised(NOTE_A) });
  const b = journalEvidenceArgs({ ...base, commit: revised(NOTE_B) });
  assert.notEqual(a.noteId, b.noteId);
  assert.equal(a.eventType, "journal.note-revised");
  assert.equal(b.eventType, "journal.note-revised");
});
check("MA-2 the same Note's creation evidence is stable, so a retry collides", () => {
  const a = journalEvidenceArgs({ ...base, commit: created() });
  const b = journalEvidenceArgs({ ...base, at: new Date("2026-09-22T09:00:00Z"), commit: created() });
  // A creation retried a WEEK later must resolve to the same Note identity --
  // dedupeScope 'once' is meaningless if the week moves under it.
  assert.equal(a.noteId, b.noteId);
  assert.equal(a.eventType, b.eventType);
});
check("MA-4 the same Note revised twice in a day is one identity", () => {
  const a = journalEvidenceArgs({ ...base, commit: revised() });
  const b = journalEvidenceArgs({ ...base, at: new Date("2026-09-15T23:00:00Z"), commit: revised() });
  assert.deepEqual(a, b);
});
check("a revision on a DIFFERENT day is different evidence", () => {
  const a = journalEvidenceArgs({ ...base, commit: revised() });
  const b = journalEvidenceArgs({ ...base, at: new Date("2026-09-16T09:00:00Z"), commit: revised() });
  assert.notEqual(a.dateIso, b.dateIso);
});

// --- created vs revised is read from the revision CHAIN -------------------
check("the first revision means created; a chained one means revised", () => {
  assert.equal(journalEvidenceArgs({ ...base, commit: created() }).eventType, "journal.note-created");
  assert.equal(journalEvidenceArgs({ ...base, commit: revised() }).eventType, "journal.note-revised");
});
check("a caller cannot claim a creation twice -- the chain decides", () => {
  // Same Note, second commit: previousRevisionId is set, so it is a revision
  // whatever the caller might believe.
  const second = journalEvidenceArgs({ ...base, commit: { noteId: NOTE_A, revisionId: REV_2, previousRevisionId: REV_1 } });
  assert.equal(second.eventType, "journal.note-revised");
});

// --- committed changes only ------------------------------------------------
check("a draft, an open editor and a cancelled edit record nothing", () => {
  for (const commit of [null, undefined, {}, { noteId: NOTE_A }, { revisionId: REV_1 }]) {
    assert.equal(journalEvidenceArgs({ ...base, commit }), null, JSON.stringify(commit));
  }
});
check("a failed autosave that produced no revision records nothing", () => {
  assert.equal(journalEvidenceArgs({ ...base, commit: { noteId: NOTE_A, revisionId: null, previousRevisionId: REV_1 } }), null);
});
check("retiring a Note is not journaling", () => {
  assert.equal(journalEvidenceArgs({ ...base, commit: { ...revised(), revisionReason: "retired" } }), null);
});

// --- identity hygiene ------------------------------------------------------
check("only a real permanent Note id is accepted", () => {
  assert.equal(isPermanentNoteId(NOTE_A), true);
  for (const bad of ["ayah:2:255", "note-1", "", null, undefined, "A1B2C3D4E5F60718293A4B5C6D7E8F90", NOTE_A + "0"]) {
    assert.equal(isPermanentNoteId(bad), false, String(bad));
  }
});
check("a unitKey can NEVER be mistaken for a Note id", () => {
  // This is the bodge P4-D3 was deferred rather than commit: a synthesised id.
  assert.equal(isPermanentNoteId("ayah:2:255"), false);
  assert.equal(journalEvidenceArgs({ ...base, commit: { noteId: "ayah:2:255", revisionId: REV_1, previousRevisionId: null } }), null);
});
check("a Note id containing the evidence separator is refused", () => {
  assert.equal(isPermanentNoteId("a1b2c3d4e5f6071829__4b5c6d7e8f90"), false);
});

// --- the contract's own limits ---------------------------------------------
check("Journaling always credits the Journaling Approach", () => {
  assert.equal(JOURNAL_APPROACH_ID, "approach_10");
  assert.equal(journalEvidenceArgs({ ...base, commit: created() }).trackableId, "approach_10");
});
check("only ayah, range and surah anchors record evidence", () => {
  assert.equal(journalUnitType("ayah:2:255"), "ayah");
  assert.equal(journalUnitType("range:2:254-256"), "range");
  assert.equal(journalUnitType("surah:2"), "surah");
  for (const k of ["juz:3", "ruku:2:1", "page:madani:5", "topic:t42", "", null]) {
    assert.equal(journalUnitType(k), null, String(k));
    assert.equal(journalEvidenceArgs({ ...base, unitKey: k, commit: created() }), null, String(k));
  }
});
check("evidence carries no status, claim or mastery field", () => {
  const a = journalEvidenceArgs({ ...base, commit: created() });
  for (const f of ["action", "masteryEffect", "claimedStatus", "confirmedStatus", "confirmState", "achieved", "mastered"]) {
    assert.ok(!(f in a), f);
  }
  assert.deepEqual(Object.keys(a).sort().join(","),
    "dateIso,eventType,noteId,personId,tenantId,trackableId,unitKey,weekKey");
});
check("the week comes from the app's own tenant-aware helper, never invented", () => {
  assert.throws(() => journalEvidenceArgs({ ...base, weekKeyFor: undefined, commit: created() }), /weekKeyFor is required/);
  assert.equal(journalEvidenceArgs({ ...base, commit: created() }).weekKey, "2026-09-13");
  assert.equal(journalEvidenceArgs({ ...base, weekStartsOn: 1, commit: created() }).weekKey, "2026-09-14");
});
check("a missing tenant or person records nothing", () => {
  assert.equal(journalEvidenceArgs({ ...base, tenantId: null, commit: created() }), null);
  assert.equal(journalEvidenceArgs({ ...base, personId: "", commit: created() }), null);
});

console.log(`\n==== Note Journaling evidence bridge (P5-B): ${passed} passed, 0 failed ====`);
