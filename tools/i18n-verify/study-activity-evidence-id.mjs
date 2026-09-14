// MAP Phase 4 (P4-C) -- the pure identity and document shape of one ADR-008
// Study Activity evidence event. No Firebase, no emulator, no database.
import assert from "node:assert/strict";
import {
  NO_NOTE, STUDY_ACTIVITY_EVIDENCE_CONTRACT, buildStudyEvidenceDocument,
  evidenceApproachId, evidenceDedupeScope, evidenceParentKey, evidenceUnitType,
  isJournalEvent, studyEvidenceId,
} from "../../app/js/study-activity-evidence-id.js";

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS  ${name}`); }

const NOTE_A = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
const NOTE_B = "0f9e8d7c6b5a49382716f5e4d3c2b1a0";
const base = { tenantId: "t1", personId: "p1", weekKey: "2026-09-13", dateIso: "2026-09-14" };

// --- determinism, which is what makes a retry a database-level no-op -------
check("the same event always yields the same id", () => {
  const args = { eventType: "reading.completed", trackableId: "approach_01", unitKey: "ayah:2:255", dateIso: "2026-09-14" };
  assert.equal(studyEvidenceId(args), studyEvidenceId({ ...args }));
});
check("the id has five slots and reads as what it is", () => {
  assert.equal(
    studyEvidenceId({ eventType: "reading.completed", trackableId: "approach_01", unitKey: "ayah:2:255", dateIso: "2026-09-14" }),
    "reading.completed__approach_01__ayah:2:255__none__2026-09-14");
});
check("no id component can contain the '__' separator", () => {
  for (const args of [
    { eventType: "reading.completed", trackableId: "approach_03", unitKey: "range:2:254-256", dateIso: "2026-09-14" },
    { eventType: "wbw.engaged", trackableId: "approach_04", unitKey: "surah:2", dateIso: "2026-09-14" },
    { eventType: "journal.note-revised", trackableId: "approach_10", unitKey: "ayah:2:1", noteId: NOTE_A, dateIso: "2026-09-14" },
  ]) {
    for (const part of studyEvidenceId(args).split("__")) assert.ok(!part.includes("_") || /^approach_\d\d$/.test(part), part);
  }
});

// --- MASTER ARCHITECT REQUIRED CORRECTION 1: Note identity ----------------
check("MA-1 two different Notes on the SAME unit have different creation ids", () => {
  const a = studyEvidenceId({ eventType: "journal.note-created", trackableId: "approach_10", unitKey: "ayah:2:255", noteId: NOTE_A, dateIso: "2026-09-14" });
  const b = studyEvidenceId({ eventType: "journal.note-created", trackableId: "approach_10", unitKey: "ayah:2:255", noteId: NOTE_B, dateIso: "2026-09-14" });
  assert.notEqual(a, b);
});
check("MA-2 the same Note's creation id is stable, so a retry collides", () => {
  const args = { eventType: "journal.note-created", trackableId: "approach_10", unitKey: "ayah:2:255", noteId: NOTE_A, dateIso: "2026-09-14" };
  assert.equal(studyEvidenceId(args), studyEvidenceId({ ...args }));
});
check("MA-3 two different Notes revised on the same unit/day have different ids", () => {
  const a = studyEvidenceId({ eventType: "journal.note-revised", trackableId: "approach_10", unitKey: "ayah:2:255", noteId: NOTE_A, dateIso: "2026-09-14" });
  const b = studyEvidenceId({ eventType: "journal.note-revised", trackableId: "approach_10", unitKey: "ayah:2:255", noteId: NOTE_B, dateIso: "2026-09-14" });
  assert.notEqual(a, b);
});
check("MA-4 the same Note revised twice in a day yields one id", () => {
  const args = { eventType: "journal.note-revised", trackableId: "approach_10", unitKey: "ayah:2:255", noteId: NOTE_A, dateIso: "2026-09-14" };
  assert.equal(studyEvidenceId(args), studyEvidenceId({ ...args }));
});
check("note-created dedupes 'once', so the day never enters its id", () => {
  const a = studyEvidenceId({ eventType: "journal.note-created", trackableId: "approach_10", unitKey: "ayah:2:255", noteId: NOTE_A, dateIso: "2026-09-14" });
  const b = studyEvidenceId({ eventType: "journal.note-created", trackableId: "approach_10", unitKey: "ayah:2:255", noteId: NOTE_A, dateIso: "2026-09-21" });
  assert.equal(a, b);
  assert.ok(a.endsWith("__once"));
});
check("note-revised DOES carry the day", () => {
  const a = studyEvidenceId({ eventType: "journal.note-revised", trackableId: "approach_10", unitKey: "ayah:2:255", noteId: NOTE_A, dateIso: "2026-09-14" });
  const b = studyEvidenceId({ eventType: "journal.note-revised", trackableId: "approach_10", unitKey: "ayah:2:255", noteId: NOTE_A, dateIso: "2026-09-15" });
  assert.notEqual(a, b);
});
check("a Note event without a noteId fails closed", () => {
  assert.throws(() => studyEvidenceId({ eventType: "journal.note-created", trackableId: "approach_10", unitKey: "ayah:2:255", dateIso: "2026-09-14" }), /permanent id/);
});
check("a malformed noteId fails closed", () => {
  assert.throws(() => studyEvidenceId({ eventType: "journal.note-revised", trackableId: "approach_10", unitKey: "ayah:2:255", noteId: "not-a-uuid", dateIso: "2026-09-14" }), /permanent id/);
});
check("a non-Note event may not carry a noteId", () => {
  assert.throws(() => studyEvidenceId({ eventType: "reading.completed", trackableId: "approach_01", unitKey: "ayah:2:255", noteId: NOTE_A, dateIso: "2026-09-14" }), /must not carry/);
});
check("the empty Note slot is a literal that cannot be a real noteId", () => {
  assert.equal(NO_NOTE, "none");
  assert.ok(!/^[0-9a-f]{32}$/.test(NO_NOTE));
});

// --- MASTER ARCHITECT REQUIRED CORRECTION 2: WbW is ayah/day --------------
check("MA-W every word tapped in one ayah on one day yields ONE id", () => {
  const args = { eventType: "wbw.engaged", trackableId: "approach_04", unitKey: "ayah:2:255", dateIso: "2026-09-14" };
  assert.equal(studyEvidenceId(args), studyEvidenceId({ ...args }));
});
check("MA-W a different ayah, and a different day, are different evidence", () => {
  const one = studyEvidenceId({ eventType: "wbw.engaged", trackableId: "approach_04", unitKey: "ayah:2:255", dateIso: "2026-09-14" });
  assert.notEqual(one, studyEvidenceId({ eventType: "wbw.engaged", trackableId: "approach_04", unitKey: "ayah:2:256", dateIso: "2026-09-14" }));
  assert.notEqual(one, studyEvidenceId({ eventType: "wbw.engaged", trackableId: "approach_04", unitKey: "ayah:2:255", dateIso: "2026-09-15" }));
});
check("MA-W occurrenceId is not part of the identity and is not accepted", () => {
  const doc = buildStudyEvidenceDocument({ ...base, eventType: "wbw.engaged", unitKey: "ayah:2:255", trackableId: "approach_04" });
  assert.ok(!("occurrenceId" in doc), "occurrenceId must be absent -- the grain is ayah/day");
});

// --- ADR-008's mapping ----------------------------------------------------
check("each event may credit only its own Approach(es)", () => {
  assert.equal(evidenceApproachId("reading.completed", "approach_03"), "approach_03");
  assert.equal(evidenceApproachId("listening.completed", "approach_07"), "approach_07");
  assert.throws(() => evidenceApproachId("reading.completed", "approach_10"), /may not credit/);
  assert.throws(() => evidenceApproachId("wbw.engaged", "approach_01"), /may not credit/);
});
check("status.claimed and status.confirmed produce no evidence at all", () => {
  for (const eventType of ["status.claimed", "status.confirmed"]) {
    assert.throws(() => studyEvidenceId({ eventType, trackableId: "approach_01", unitKey: "ayah:2:255", dateIso: "2026-09-14" }), /Unknown Study event/);
    assert.throws(() => evidenceDedupeScope(eventType, "2026-09-14"), /Unknown Study event/);
  }
});
check("an unknown event produces no evidence", () => {
  assert.throws(() => studyEvidenceId({ eventType: "reading.opened", trackableId: "approach_01", unitKey: "ayah:2:255", dateIso: "2026-09-14" }), /Unknown Study event/);
});

// --- permanent unit identity (I5) -----------------------------------------
check("only ayah, range and surah keys are accepted", () => {
  assert.equal(evidenceUnitType("ayah:2:255"), "ayah");
  assert.equal(evidenceUnitType("range:2:254-256"), "range");
  assert.equal(evidenceUnitType("surah:2"), "surah");
  for (const k of ["juz:3", "ruku:2:1", "page:madani:5", "hizb:4", "topic:t42", "name:1", "hadith:bukhari:1", "", "ayah:2:x"]) {
    assert.equal(evidenceUnitType(k), null, k);
  }
});
check("a refused unit type cannot produce an id or a document", () => {
  assert.throws(() => studyEvidenceId({ eventType: "reading.completed", trackableId: "approach_01", unitKey: "juz:3", dateIso: "2026-09-14" }), /Study Unit key/);
  assert.throws(() => buildStudyEvidenceDocument({ ...base, eventType: "reading.completed", unitKey: "topic:t42", trackableId: "approach_01" }), /Study Unit key/);
});

// --- the document ---------------------------------------------------------
check("the document declares Activity, never Mastery", () => {
  const doc = buildStudyEvidenceDocument({ ...base, eventType: "reading.completed", unitKey: "ayah:2:255", trackableId: "approach_01" });
  assert.equal(doc.action, "practised");
  assert.equal(doc.masteryEffect, "none");
  assert.equal(doc.contractVersion, STUDY_ACTIVITY_EVIDENCE_CONTRACT);
  assert.equal(doc.subjectId, "quran");
});
check("no status-shaped field can appear on an evidence document", () => {
  const doc = buildStudyEvidenceDocument({ ...base, eventType: "reading.completed", unitKey: "ayah:2:255", trackableId: "approach_01" });
  for (const forbidden of ["claimedStatus", "confirmedStatus", "confirmState", "status", "statusId", "confirmedAt"]) {
    assert.ok(!(forbidden in doc), forbidden);
  }
});
check("the document's own fields re-derive its id exactly", () => {
  for (const args of [
    { eventType: "reading.completed", unitKey: "ayah:2:255", trackableId: "approach_01" },
    { eventType: "journal.note-created", unitKey: "ayah:2:255", trackableId: "approach_10", noteId: NOTE_A },
    { eventType: "journal.note-revised", unitKey: "surah:2", trackableId: "approach_10", noteId: NOTE_B },
    { eventType: "wbw.engaged", unitKey: "range:2:254-256", trackableId: "approach_04" },
  ]) {
    const doc = buildStudyEvidenceDocument({ ...base, ...args });
    const rederived = `${doc.eventType}__${doc.trackableId}__${doc.unitKey}__${doc.noteId ?? NO_NOTE}__${doc.dedupeScope}`;
    assert.equal(rederived, studyEvidenceId({ ...args, dateIso: base.dateIso }));
  }
});
check("unitType always agrees with the unitKey it describes", () => {
  for (const [unitKey, unitType] of [["ayah:2:255", "ayah"], ["range:2:254-256", "range"], ["surah:2", "surah"]]) {
    assert.equal(buildStudyEvidenceDocument({ ...base, eventType: "reading.completed", unitKey, trackableId: "approach_01" }).unitType, unitType);
  }
});
check("the document is frozen, so a caller cannot alter what it persists", () => {
  const doc = buildStudyEvidenceDocument({ ...base, eventType: "reading.completed", unitKey: "ayah:2:255", trackableId: "approach_01" });
  assert.throws(() => { doc.action = "claimed"; }, TypeError);
});
check("an impossible calendar date is refused", () => {
  assert.throws(() => buildStudyEvidenceDocument({ ...base, dateIso: "2026-02-30", eventType: "reading.completed", unitKey: "ayah:2:255", trackableId: "approach_01" }), /calendar date/);
});
check("the parent key is the EXISTING weekly activity id, unchanged", () => {
  assert.equal(evidenceParentKey("t1", "p1", "2026-09-13"), "t1__p1__2026-09-13");
});
check("isJournalEvent names exactly the two Note events", () => {
  assert.equal(isJournalEvent("journal.note-created"), true);
  assert.equal(isJournalEvent("journal.note-revised"), true);
  for (const e of ["reading.completed", "listening.completed", "wbw.engaged", "status.claimed"]) assert.equal(isJournalEvent(e), false);
});

console.log(`\n==== Study Activity evidence identity: ${passed} passed, 0 failed ====`);
