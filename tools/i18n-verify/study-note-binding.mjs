// MAP Phase 5 (P5-C) -- ADR-009 Study<->Note source binding. Pure: no database,
// no browser, no emulator.
//
// The point of this suite is the thing ADR-009 exists to stop: a second
// spelling of the same fact. So it does not merely check that a payload comes
// back -- it checks that a caller has no way to supply sourceKind at all, that
// both closed vocabularies really refuse the words that are NOT in them, and
// that every unit type buildUnitKey can produce is either bound or refused,
// with none silently missing.
import assert from "node:assert/strict";
import { buildUnitKey } from "../../app/js/unit-keys.js";
import {
  PROVENANCE_KINDS, RELATIONSHIP_KINDS, bindableUnitType, sourceKindForUnitKey, studyNoteSource,
} from "../../app/js/study-note-binding.js";

let passed = 0;
function check(name, fn) {
  const r = fn();
  if (r && typeof r.then === "function") throw new TypeError("check() is synchronous.");
  passed++; console.log(`  PASS  ${name}`);
}

// --- ADR-009 §2: sourceKind is DERIVED, and cannot be supplied --------------
check("A1 sourceKind cannot be supplied -- a passed one is ignored, not stored", () => {
  const s = studyNoteSource({ unitKey: "ayah:2:255", sourceKind: "quran-ayah" });
  assert.equal(s.sourceKind, "quran-unit", "the derived value wins over a supplied one");
});
check("A2 every Quran unit type derives the SAME sourceKind", () => {
  const keys = [
    buildUnitKey.ayah(2, 255), buildUnitKey.range(2, 255, 257), buildUnitKey.surah(2),
    buildUnitKey.ruku(2, 3), buildUnitKey.juz(1), buildUnitKey.hizb(2),
    buildUnitKey.rub(5), buildUnitKey.manzil(1), buildUnitKey.page("hafs", 255),
  ];
  for (const k of keys) assert.equal(sourceKindForUnitKey(k), "quran-unit", k);
});
check("A3 the three non-Quran unit types each derive their own namespace", () => {
  assert.equal(sourceKindForUnitKey(buildUnitKey.hadith("bukhari", 1)), "hadith-unit");
  assert.equal(sourceKindForUnitKey(buildUnitKey.topic("t42")), "topic-unit");
  assert.equal(sourceKindForUnitKey(buildUnitKey.name(99)), "name-unit");
});
check("A4 EVERY unit type buildUnitKey produces is bindable -- none silently missing", () => {
  const sample = {
    ayah: buildUnitKey.ayah(2, 255), range: buildUnitKey.range(2, 1, 5), surah: buildUnitKey.surah(114),
    page: buildUnitKey.page("hafs", 604), ruku: buildUnitKey.ruku(2, 1), juz: buildUnitKey.juz(30),
    hizb: buildUnitKey.hizb(60), rub: buildUnitKey.rub(240), manzil: buildUnitKey.manzil(7),
    hadith: buildUnitKey.hadith("muslim", 2564), topic: buildUnitKey.topic("t1"), name: buildUnitKey.name(1),
  };
  assert.deepEqual(Object.keys(sample).sort(), Object.keys(buildUnitKey).sort(),
    "this check must cover buildUnitKey's own set, not a stale copy of it");
  for (const [unitType, key] of Object.entries(sample)) {
    assert.equal(bindableUnitType(key), unitType, key);
    assert.ok(sourceKindForUnitKey(key), `${key} must derive a sourceKind`);
  }
});

// --- I5: the key is stored verbatim, and a non-key is refused ---------------
check("A5 sourceKey is the permanent unit key, byte for byte (I5)", () => {
  const key = buildUnitKey.range(2, 255, 257);
  assert.equal(studyNoteSource({ unitKey: key }).sourceKey, key);
});
check("A6 a string that is not a permanent unit key is REFUSED, not stored", () => {
  for (const bad of ["ayah:2", "ayah", "", "Surah 2, ayah 255", "ayah:2:255:1", "juz:", "topic:", null, undefined, 42]) {
    assert.throws(() => studyNoteSource({ unitKey: bad }), /not a permanent Study Unit key/, String(bad));
  }
});
check("A7 a unit type this app has never had is refused rather than guessed", () => {
  assert.equal(bindableUnitType("verse:2:255"), null);
  assert.equal(sourceKindForUnitKey("verse:2:255"), null);
});

// --- ADR-009 §3/§4: both vocabularies are CLOSED ----------------------------
check("A8 relationshipKind accepts exactly origin and reference", () => {
  assert.deepEqual([...RELATIONSHIP_KINDS], ["origin", "reference"]);
  for (const ok of RELATIONSHIP_KINDS) {
    assert.equal(studyNoteSource({ unitKey: "ayah:1:1", relationshipKind: ok }).relationshipKind, ok);
  }
  for (const bad of ["Origin", "source", "about", "", null]) {
    assert.throws(() => studyNoteSource({ unitKey: "ayah:1:1", relationshipKind: bad }), /relationshipKind/);
  }
});
check("A9 provenanceKind accepts exactly the two ADR-009 names", () => {
  assert.deepEqual([...PROVENANCE_KINDS], ["study-note", "promoted-ayah-note"]);
  for (const ok of PROVENANCE_KINDS) {
    assert.equal(studyNoteSource({ unitKey: "ayah:1:1", provenanceKind: ok }).provenanceKind, ok);
  }
});
check("A10 the repository's OWN two drifting fixture spellings are now refused", () => {
  // ADR-009 §Context: these are the four real values already checked in, in two
  // fixtures that disagree with each other. Each must now fail closed.
  for (const bad of ["created-in-study", "reader-created"]) {
    assert.throws(() => studyNoteSource({ unitKey: "ayah:2:255", provenanceKind: bad }), /provenanceKind/, bad);
  }
  for (const supplied of ["quran", "quran-ayah"]) {
    assert.equal(studyNoteSource({ unitKey: "ayah:2:255", sourceKind: supplied }).sourceKind, "quran-unit", supplied);
  }
});

// --- ADR-003: descriptive only ----------------------------------------------
check("A11 approachId is accepted as approach_NN or null, and nothing else", () => {
  assert.equal(studyNoteSource({ unitKey: "ayah:1:1", approachId: "approach_10" }).approachId, "approach_10");
  assert.equal(studyNoteSource({ unitKey: "ayah:1:1" }).approachId, null);
  for (const bad of ["approach_1", "approach_100", "Approach_10", "approach10", 10, ""]) {
    assert.throws(() => studyNoteSource({ unitKey: "ayah:1:1", approachId: bad }), /approachId/, String(bad));
  }
});
check("A12 the payload carries NO status field of any kind (ADR-003)", () => {
  const s = studyNoteSource({ unitKey: "ayah:1:1", approachId: "approach_10" });
  for (const forbidden of ["claimStatus", "status", "achieved", "mastered", "confirmed"]) {
    assert.ok(!(forbidden in s), `${forbidden} must not appear in a source binding`);
  }
  assert.deepEqual(Object.keys(s).sort(),
    ["approachId", "provenanceKind", "relationshipKind", "sourceKey", "sourceKind"]);
});

// --- shape -------------------------------------------------------------------
check("A13 the payload is frozen, so a caller cannot re-spell a field afterwards", () => {
  const s = studyNoteSource({ unitKey: "ayah:1:1" });
  assert.throws(() => { "use strict"; s.sourceKind = "quran"; }, TypeError);
});
check("A14 sourceLinkId is carried only when supplied", () => {
  assert.ok(!("sourceLinkId" in studyNoteSource({ unitKey: "ayah:1:1" })));
  assert.equal(studyNoteSource({ unitKey: "ayah:1:1", sourceLinkId: "abc" }).sourceLinkId, "abc");
});
check("A15 defaults are origin + study-note", () => {
  const s = studyNoteSource({ unitKey: "ayah:1:1" });
  assert.equal(s.relationshipKind, "origin");
  assert.equal(s.provenanceKind, "study-note");
});

// --- ADR-009 §6: binding breadth is WIDER than evidence breadth -------------
check("A16 a juz, a page and a topic are all bindable -- evidence breadth is a SEPARATE question", () => {
  for (const key of [buildUnitKey.juz(30), buildUnitKey.page("hafs", 1), buildUnitKey.topic("t7")]) {
    assert.ok(studyNoteSource({ unitKey: key }).sourceKey, key);
  }
});

console.log(`\n${passed} passed`);
